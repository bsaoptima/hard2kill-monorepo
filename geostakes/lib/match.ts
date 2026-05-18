import { createAdminClient } from "@/lib/supabase/admin";
import { calculateDistanceKm, calculateRoundScore } from "@/lib/scoring";
import { creditCash, deductCash } from "@/lib/balance";
import { resolvePanoId } from "@/lib/maps";

export const ROUND_COUNT = 5;
export const ROUND_DURATION_SEC = 60;
export const HOUSE_RAKE = 0.1;

export type Currency = "cash" | "coins";

export type RoundResult = {
  roundNumber: number;
  yourGuess:
    | { lat: number; lng: number; distanceMeters: number; points: number }
    | null;
  opponentGuess:
    | { lat: number; lng: number; distanceMeters: number; points: number }
    | null;
  truth: { lat: number; lng: number };
};

export type MatchState = {
  matchId: string;
  status: "active" | "settled" | "refunded";
  currentRound: number;
  roundStartedAt: string;
  timeRemainingSec: number;
  betAmount: number;
  currency: Currency;
  yourId: string;
  opponentId: string;
  currentLocationId: string | null;
  currentLocationPanoId: string | null;
  currentRoundSubmissions: { you: boolean; opponent: boolean };
  completedRounds: RoundResult[];
  finalResult: {
    winnerId: string | null;
    yourTotalPoints: number;
    opponentTotalPoints: number;
    payout: number;
  } | null;
};

// =========================================================================
// createMatch
// =========================================================================
export async function createMatch(opts: {
  player1Id: string;
  player2Id: string;
  betAmount: number;
  currency: Currency;
}): Promise<{ matchId: string } | { error: string }> {
  const { player1Id, player2Id, betAmount, currency } = opts;

  if (player1Id === player2Id) return { error: "Cannot match against self" };
  if (betAmount < 1) return { error: "Invalid bet amount" };
  if (currency !== "cash" && currency !== "coins") {
    return { error: "Invalid currency" };
  }
  if (currency === "coins") {
    return { error: "Coins matches not yet implemented" };
  }

  const supabase = createAdminClient();

  // Pick 5 random active locations. Pool is small (~30 rows) so a JS shuffle
  // after fetch is fine. Swap for an RPC sample once the pool grows.
  const { data: pool, error: poolErr } = await supabase
    .from("geostakes_locations")
    .select("id")
    .eq("active", true);

  if (poolErr) return { error: poolErr.message };
  if (!pool || pool.length < ROUND_COUNT) {
    return { error: "Insufficient location pool" };
  }

  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, ROUND_COUNT);

  // Atomic-ish deduct from both. Refund p1 on p2 failure (same pattern as
  // hard2kill/server/src/cs16/matchEvents.ts:42-48).
  const p1ok = await deductCash(player1Id, betAmount);
  if (!p1ok) return { error: "Insufficient balance for player 1" };

  const p2ok = await deductCash(player2Id, betAmount);
  if (!p2ok) {
    await creditCash(player1Id, betAmount);
    return { error: "Insufficient balance for player 2" };
  }

  const { data: match, error: matchErr } = await supabase
    .from("geostakes_matches")
    .insert({
      bet_amount: betAmount,
      currency,
      player1_id: player1Id,
      player2_id: player2Id,
    })
    .select("id")
    .single();

  if (matchErr || !match) {
    await creditCash(player1Id, betAmount);
    await creditCash(player2Id, betAmount);
    return { error: matchErr?.message ?? "Failed to create match" };
  }

  const { error: mlErr } = await supabase
    .from("geostakes_match_locations")
    .insert(
      shuffled.map((loc, i) => ({
        match_id: match.id,
        round_number: i + 1,
        location_id: loc.id,
      })),
    );

  if (mlErr) {
    await supabase.from("geostakes_matches").delete().eq("id", match.id);
    await creditCash(player1Id, betAmount);
    await creditCash(player2Id, betAmount);
    return { error: mlErr.message };
  }

  return { matchId: match.id };
}

// =========================================================================
// submitGuess
// =========================================================================
export async function submitGuess(opts: {
  matchId: string;
  userId: string;
  guessLat: number;
  guessLng: number;
}): Promise<{ ok: true; points: number } | { error: string }> {
  const { matchId, userId, guessLat, guessLng } = opts;
  const supabase = createAdminClient();

  const { data: match } = await supabase
    .from("geostakes_matches")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();

  if (!match) return { error: "Match not found" };
  if (match.status !== "active") return { error: "Match not active" };
  if (match.player1_id !== userId && match.player2_id !== userId) {
    return { error: "Not in this match" };
  }
  if (match.current_round > ROUND_COUNT) {
    return { error: "Match already ended" };
  }

  // Server-authoritative timer.
  const startedAtMs = new Date(match.round_started_at).getTime();
  const elapsedSec = (Date.now() - startedAtMs) / 1000;
  if (elapsedSec > ROUND_DURATION_SEC) {
    await advanceRound(matchId);
    return { error: "Round timer expired" };
  }

  // Reject double-submission.
  const { data: existing } = await supabase
    .from("geostakes_round_guesses")
    .select("player_id")
    .eq("match_id", matchId)
    .eq("round_number", match.current_round)
    .eq("player_id", userId)
    .maybeSingle();

  if (existing) return { error: "Already guessed this round" };

  // Resolve truth (server-private).
  const { data: matchLoc } = await supabase
    .from("geostakes_match_locations")
    .select("location_id")
    .eq("match_id", matchId)
    .eq("round_number", match.current_round)
    .single();

  if (!matchLoc) return { error: "Round location missing" };

  const { data: location } = await supabase
    .from("geostakes_locations")
    .select("lat, lng")
    .eq("id", matchLoc.location_id)
    .single();

  if (!location) return { error: "Location data missing" };

  const distanceKm = calculateDistanceKm(
    { lat: guessLat, lng: guessLng },
    { lat: location.lat, lng: location.lng },
  );
  const points = calculateRoundScore(distanceKm);

  await supabase.from("geostakes_round_guesses").insert({
    match_id: matchId,
    round_number: match.current_round,
    player_id: userId,
    guess_lat: guessLat,
    guess_lng: guessLng,
    distance_meters: distanceKm * 1000,
    points,
  });

  // If both players have submitted, advance.
  const { data: allGuesses } = await supabase
    .from("geostakes_round_guesses")
    .select("player_id")
    .eq("match_id", matchId)
    .eq("round_number", match.current_round);

  if (allGuesses && allGuesses.length >= 2) {
    await advanceRound(matchId);
  }

  return { ok: true, points };
}

// =========================================================================
// advanceRound
// =========================================================================
export async function advanceRound(matchId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: match } = await supabase
    .from("geostakes_matches")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();

  if (!match || match.status !== "active") return;

  // Auto-zero any missing guesses (player ran out of time).
  const { data: existingGuesses } = await supabase
    .from("geostakes_round_guesses")
    .select("player_id")
    .eq("match_id", matchId)
    .eq("round_number", match.current_round);

  const submitted = new Set((existingGuesses ?? []).map((g) => g.player_id));
  const missing = [match.player1_id, match.player2_id].filter(
    (p) => !submitted.has(p),
  );

  if (missing.length > 0) {
    await supabase.from("geostakes_round_guesses").insert(
      missing.map((playerId) => ({
        match_id: matchId,
        round_number: match.current_round,
        player_id: playerId,
        guess_lat: null,
        guess_lng: null,
        distance_meters: null,
        points: 0,
      })),
    );
  }

  if (match.current_round < ROUND_COUNT) {
    await supabase
      .from("geostakes_matches")
      .update({
        current_round: match.current_round + 1,
        round_started_at: new Date().toISOString(),
      })
      .eq("id", matchId);
  } else {
    await settleMatch(matchId);
  }
}

// =========================================================================
// settleMatch — sums points, declares winner, pays out.
// =========================================================================
export async function settleMatch(matchId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: match } = await supabase
    .from("geostakes_matches")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();

  if (!match || match.status !== "active") return;

  const { data: guesses } = await supabase
    .from("geostakes_round_guesses")
    .select("player_id, points")
    .eq("match_id", matchId);

  if (!guesses) return;

  const totals: Record<string, number> = {};
  for (const g of guesses) {
    totals[g.player_id] = (totals[g.player_id] ?? 0) + (g.points ?? 0);
  }

  const p1Total = totals[match.player1_id] ?? 0;
  const p2Total = totals[match.player2_id] ?? 0;

  let winnerId: string | null = null;
  if (p1Total > p2Total) winnerId = match.player1_id;
  else if (p2Total > p1Total) winnerId = match.player2_id;

  const pot = match.bet_amount * 2;

  if (winnerId) {
    const payout = pot * (1 - HOUSE_RAKE);
    if (match.currency === "cash") {
      await creditCash(winnerId, payout);
    }
    const loserId =
      winnerId === match.player1_id ? match.player2_id : match.player1_id;
    await supabase.from("game_history").insert({
      winner_id: winnerId,
      loser_id: loserId,
      amount: payout,
      currency: match.currency,
      game: "geostakes",
      started_at: match.created_at,
      ended_at: new Date().toISOString(),
    });
  } else {
    // Tie: refund both (no rake).
    if (match.currency === "cash") {
      await creditCash(match.player1_id, match.bet_amount);
      await creditCash(match.player2_id, match.bet_amount);
    }
  }

  await supabase
    .from("geostakes_matches")
    .update({
      status: "settled",
      current_round: ROUND_COUNT + 1,
      winner_id: winnerId,
      ended_at: new Date().toISOString(),
    })
    .eq("id", matchId);
}

// =========================================================================
// forfeitMatch — non-forfeiter takes the full pot (no rake on forfeits).
// =========================================================================
export async function forfeitMatch(
  matchId: string,
  forfeitingUserId: string,
  reason: string,
): Promise<void> {
  const supabase = createAdminClient();

  const { data: match } = await supabase
    .from("geostakes_matches")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();

  if (!match || match.status !== "active") return;
  if (
    match.player1_id !== forfeitingUserId &&
    match.player2_id !== forfeitingUserId
  ) {
    return;
  }

  const winnerId =
    match.player1_id === forfeitingUserId
      ? match.player2_id
      : match.player1_id;
  const pot = match.bet_amount * 2;

  if (match.currency === "cash") {
    await creditCash(winnerId, pot);
  }

  await supabase.from("game_history").insert({
    winner_id: winnerId,
    loser_id: forfeitingUserId,
    amount: pot,
    currency: match.currency,
    game: "geostakes",
    started_at: match.created_at,
    ended_at: new Date().toISOString(),
  });

  await supabase
    .from("geostakes_matches")
    .update({
      status: "settled",
      current_round: ROUND_COUNT + 1,
      winner_id: winnerId,
      forfeit_reason: reason,
      ended_at: new Date().toISOString(),
    })
    .eq("id", matchId);
}

// =========================================================================
// getMatchState — returns everything the client needs to render.
// Crucially, does NOT expose lat/lng for the active round (only locationId
// + cached panoId). Truth is revealed only for completed rounds.
// =========================================================================
export async function getMatchState(
  matchId: string,
  userId: string,
): Promise<MatchState | { error: string }> {
  const supabase = createAdminClient();

  // Self-correct: if the client looks at an active match whose round timer
  // has already expired and nobody triggered an advance, advance it now.
  // This handles the case where neither player submitted within 60s.
  let { data: match } = await supabase
    .from("geostakes_matches")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();

  if (!match) return { error: "Match not found" };
  if (match.player1_id !== userId && match.player2_id !== userId) {
    return { error: "Not in this match" };
  }

  if (
    match.status === "active" &&
    match.current_round <= ROUND_COUNT &&
    (Date.now() - new Date(match.round_started_at).getTime()) / 1000 >
      ROUND_DURATION_SEC
  ) {
    await advanceRound(matchId);
    const refreshed = await supabase
      .from("geostakes_matches")
      .select("*")
      .eq("id", matchId)
      .maybeSingle();
    if (refreshed.data) {
      match = refreshed.data;
    }
  }

  const opponentId =
    match.player1_id === userId ? match.player2_id : match.player1_id;

  const startedAtMs = new Date(match.round_started_at).getTime();
  const elapsedSec = (Date.now() - startedAtMs) / 1000;
  const timeRemainingSec = Math.max(0, ROUND_DURATION_SEC - elapsedSec);

  // Active round location: ID + cached panoId only (NOT lat/lng).
  // If pano_id isn't cached yet, resolve via Google's Street View Metadata
  // API server-side and cache it back. Adds ~200ms on first round-state
  // fetch per location, never again.
  let currentLocationId: string | null = null;
  let currentLocationPanoId: string | null = null;
  if (match.status === "active" && match.current_round <= ROUND_COUNT) {
    const { data: matchLoc } = await supabase
      .from("geostakes_match_locations")
      .select("location_id, geostakes_locations(pano_id, lat, lng)")
      .eq("match_id", matchId)
      .eq("round_number", match.current_round)
      .single<{
        location_id: string;
        geostakes_locations: {
          pano_id: string | null;
          lat: number;
          lng: number;
        } | null;
      }>();

    if (matchLoc) {
      currentLocationId = matchLoc.location_id;
      currentLocationPanoId = matchLoc.geostakes_locations?.pano_id ?? null;

      if (!currentLocationPanoId && matchLoc.geostakes_locations) {
        const resolved = await resolvePanoId(
          matchLoc.geostakes_locations.lat,
          matchLoc.geostakes_locations.lng,
        );
        if (resolved) {
          currentLocationPanoId = resolved;
          await supabase
            .from("geostakes_locations")
            .update({ pano_id: resolved })
            .eq("id", matchLoc.location_id);
        }
      }
    }
  }

  // Submission status for current round (boolean only, never values).
  let yourSubmitted = false;
  let opponentSubmitted = false;
  if (match.status === "active") {
    const { data: cur } = await supabase
      .from("geostakes_round_guesses")
      .select("player_id")
      .eq("match_id", matchId)
      .eq("round_number", match.current_round);

    if (cur) {
      yourSubmitted = cur.some((g) => g.player_id === userId);
      opponentSubmitted = cur.some((g) => g.player_id === opponentId);
    }
  }

  // Completed rounds: full truth + both players' guesses.
  const completedMax =
    match.status === "active" ? match.current_round - 1 : ROUND_COUNT;
  const completedRounds: RoundResult[] = [];

  if (completedMax > 0) {
    const { data: completedGuesses } = await supabase
      .from("geostakes_round_guesses")
      .select(
        "round_number, player_id, guess_lat, guess_lng, distance_meters, points",
      )
      .eq("match_id", matchId)
      .lte("round_number", completedMax);

    const { data: completedLocs } = await supabase
      .from("geostakes_match_locations")
      .select("round_number, geostakes_locations(lat, lng)")
      .eq("match_id", matchId)
      .lte("round_number", completedMax)
      .returns<
        Array<{
          round_number: number;
          geostakes_locations: { lat: number; lng: number } | null;
        }>
      >();

    if (completedGuesses && completedLocs) {
      for (let r = 1; r <= completedMax; r++) {
        const yourG = completedGuesses.find(
          (g) => g.round_number === r && g.player_id === userId,
        );
        const oppG = completedGuesses.find(
          (g) => g.round_number === r && g.player_id === opponentId,
        );
        const loc = completedLocs.find((l) => l.round_number === r);
        const truth = loc?.geostakes_locations ?? { lat: 0, lng: 0 };

        completedRounds.push({
          roundNumber: r,
          yourGuess:
            yourG && yourG.guess_lat !== null && yourG.guess_lng !== null
              ? {
                  lat: yourG.guess_lat,
                  lng: yourG.guess_lng,
                  distanceMeters: yourG.distance_meters ?? 0,
                  points: yourG.points ?? 0,
                }
              : null,
          opponentGuess:
            oppG && oppG.guess_lat !== null && oppG.guess_lng !== null
              ? {
                  lat: oppG.guess_lat,
                  lng: oppG.guess_lng,
                  distanceMeters: oppG.distance_meters ?? 0,
                  points: oppG.points ?? 0,
                }
              : null,
          truth,
        });
      }
    }
  }

  let finalResult: MatchState["finalResult"] = null;
  if (match.status === "settled") {
    const yourTotal = completedRounds.reduce(
      (s, r) => s + (r.yourGuess?.points ?? 0),
      0,
    );
    const opponentTotal = completedRounds.reduce(
      (s, r) => s + (r.opponentGuess?.points ?? 0),
      0,
    );
    const payout = match.winner_id
      ? match.bet_amount * 2 * (1 - HOUSE_RAKE)
      : match.bet_amount;
    finalResult = {
      winnerId: match.winner_id,
      yourTotalPoints: yourTotal,
      opponentTotalPoints: opponentTotal,
      payout,
    };
  }

  return {
    matchId: match.id,
    status: match.status,
    currentRound: match.current_round,
    roundStartedAt: match.round_started_at,
    timeRemainingSec,
    betAmount: Number(match.bet_amount),
    currency: match.currency,
    yourId: userId,
    opponentId,
    currentLocationId,
    currentLocationPanoId,
    currentRoundSubmissions: { you: yourSubmitted, opponent: opponentSubmitted },
    completedRounds,
    finalResult,
  };
}
