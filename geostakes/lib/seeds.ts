import { createAdminClient } from "@/lib/supabase/admin";
import { calculateDistanceKm, calculateRoundScore } from "@/lib/scoring";
import { creditCash, deductCash } from "@/lib/balance";
import { resolvePanoId } from "@/lib/maps";

export const ROUND_COUNT = 5;
export const ROUND_DURATION_SEC = 60;
export const HOUSE_RAKE = 0.1;
export const ALLOWED_BET_AMOUNTS = [1, 5, 10] as const;

export type SeedRole = "creator" | "challenger";
export type SeedStatus = "open" | "matched" | "resolved" | "refunded";

export type CompletedRound = {
  roundNumber: number;
  yourGuess: { lat: number; lng: number; distanceMeters: number; points: number } | null;
  truth: { lat: number; lng: number };
};

export type SeedPlayState = {
  playId: string;
  seedId: string;
  role: SeedRole;
  status: SeedStatus;
  betAmount: number;
  currentRound: number;
  roundStartedAt: string;
  timeRemainingSec: number;
  currentLocationId: string | null;
  currentLocationPanoId: string | null;
  yourSubmittedThisRound: boolean;
  completedRounds: CompletedRound[];
  yourTotalScore: number | null;
  yourPlayComplete: boolean;
  resolution: {
    yourScore: number;
    opponentScore: number;
    youWon: boolean | null; // null = tie
    payout: number;
  } | null;
  waitingForOpponent: boolean;
};

// =========================================================================
// startPlay — entry point. Hybrid flow: try to match into an open seed
// first; if none, open a new seed and have the user play as creator.
// =========================================================================
export async function startPlay(opts: {
  userId: string;
  betAmount: number;
}): Promise<
  { playId: string; seedId: string; role: SeedRole } | { error: string }
> {
  const { userId, betAmount } = opts;

  if (!ALLOWED_BET_AMOUNTS.includes(betAmount as 1 | 5 | 10)) {
    return { error: "Invalid bet amount" };
  }

  const supabase = createAdminClient();

  // Try to match into an existing open seed (score-band, FOR UPDATE SKIP LOCKED).
  const { data: matchedSeedId, error: rpcErr } = await supabase.rpc(
    "find_geostakes_match",
    { p_user_id: userId, p_bet_amount: betAmount },
  );
  if (rpcErr) return { error: rpcErr.message };

  if (matchedSeedId) {
    // Path A: join existing seed as challenger.
    const ok = await deductCash(userId, betAmount);
    if (!ok) return { error: "Insufficient balance" };

    const { error: updErr } = await supabase
      .from("geostakes_seeds")
      .update({
        status: "matched",
        matched_user_id: userId,
        matched_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      })
      .eq("id", matchedSeedId)
      .eq("status", "open");

    if (updErr) {
      await creditCash(userId, betAmount);
      return { error: updErr.message };
    }

    const { data: play, error: playErr } = await supabase
      .from("geostakes_seed_plays")
      .insert({
        seed_id: matchedSeedId,
        user_id: userId,
        role: "challenger",
      })
      .select("id")
      .single();

    if (playErr || !play) {
      // Rollback: re-open the seed, refund.
      await supabase
        .from("geostakes_seeds")
        .update({ status: "open", matched_user_id: null, matched_at: null })
        .eq("id", matchedSeedId);
      await creditCash(userId, betAmount);
      return { error: playErr?.message ?? "Failed to create play" };
    }

    return { playId: play.id, seedId: matchedSeedId, role: "challenger" };
  }

  // Path B: open a new seed (user is creator).
  const { data: pool, error: poolErr } = await supabase
    .from("geostakes_locations")
    .select("id")
    .eq("active", true);

  if (poolErr) return { error: poolErr.message };
  if (!pool || pool.length < ROUND_COUNT) {
    return { error: "Insufficient location pool" };
  }

  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, ROUND_COUNT);
  const locationIds = shuffled.map((l) => l.id);

  const ok = await deductCash(userId, betAmount);
  if (!ok) return { error: "Insufficient balance" };

  const { data: seed, error: seedErr } = await supabase
    .from("geostakes_seeds")
    .insert({
      creator_user_id: userId,
      bet_amount: betAmount,
      currency: "cash",
      location_ids: locationIds,
    })
    .select("id")
    .single();

  if (seedErr || !seed) {
    await creditCash(userId, betAmount);
    return { error: seedErr?.message ?? "Failed to open seed" };
  }

  const { data: play, error: playErr } = await supabase
    .from("geostakes_seed_plays")
    .insert({
      seed_id: seed.id,
      user_id: userId,
      role: "creator",
    })
    .select("id")
    .single();

  if (playErr || !play) {
    await supabase.from("geostakes_seeds").delete().eq("id", seed.id);
    await creditCash(userId, betAmount);
    return { error: playErr?.message ?? "Failed to create play" };
  }

  return { playId: play.id, seedId: seed.id, role: "creator" };
}

// =========================================================================
// submitSeedGuess — server-authoritative guess submission for one round.
// =========================================================================
export async function submitSeedGuess(opts: {
  playId: string;
  userId: string;
  guessLat: number;
  guessLng: number;
}): Promise<{ ok: true; points: number } | { error: string }> {
  const { playId, userId, guessLat, guessLng } = opts;
  const supabase = createAdminClient();

  const { data: play } = await supabase
    .from("geostakes_seed_plays")
    .select("*, geostakes_seeds!inner(location_ids, status)")
    .eq("id", playId)
    .maybeSingle<{
      id: string;
      user_id: string;
      role: SeedRole;
      current_round: number;
      round_started_at: string;
      completed_at: string | null;
      seed_id: string;
      geostakes_seeds: { location_ids: string[]; status: SeedStatus };
    }>();

  if (!play) return { error: "Play not found" };
  if (play.user_id !== userId) return { error: "Not your play" };
  if (play.completed_at) return { error: "Play already complete" };
  if (play.current_round > ROUND_COUNT) return { error: "Play already ended" };

  // Server-authoritative timer.
  const elapsedSec =
    (Date.now() - new Date(play.round_started_at).getTime()) / 1000;
  if (elapsedSec > ROUND_DURATION_SEC) {
    await advancePlayRound(playId);
    return { error: "Round timer expired" };
  }

  // Reject double-submission.
  const { data: existing } = await supabase
    .from("geostakes_seed_play_guesses")
    .select("play_id")
    .eq("play_id", playId)
    .eq("round_number", play.current_round)
    .maybeSingle();
  if (existing) return { error: "Already guessed this round" };

  // Resolve truth.
  const locationId = play.geostakes_seeds.location_ids[play.current_round - 1];
  const { data: location } = await supabase
    .from("geostakes_locations")
    .select("lat, lng")
    .eq("id", locationId)
    .single();
  if (!location) return { error: "Location data missing" };

  const distanceKm = calculateDistanceKm(
    { lat: guessLat, lng: guessLng },
    { lat: location.lat, lng: location.lng },
  );
  const points = calculateRoundScore(distanceKm);

  await supabase.from("geostakes_seed_play_guesses").insert({
    play_id: playId,
    round_number: play.current_round,
    guess_lat: guessLat,
    guess_lng: guessLng,
    distance_meters: distanceKm * 1000,
    points,
  });

  await advancePlayRound(playId);

  return { ok: true, points };
}

// =========================================================================
// advancePlayRound — move to next round or complete play.
// Auto-zero missing guess if the timer expired without submission.
// =========================================================================
export async function advancePlayRound(playId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: play } = await supabase
    .from("geostakes_seed_plays")
    .select("*")
    .eq("id", playId)
    .maybeSingle();

  if (!play || play.completed_at) return;

  // Backfill a zero-points guess if the round expired without one.
  const { data: existing } = await supabase
    .from("geostakes_seed_play_guesses")
    .select("play_id")
    .eq("play_id", playId)
    .eq("round_number", play.current_round)
    .maybeSingle();

  if (!existing) {
    await supabase.from("geostakes_seed_play_guesses").insert({
      play_id: playId,
      round_number: play.current_round,
      guess_lat: null,
      guess_lng: null,
      distance_meters: null,
      points: 0,
    });
  }

  if (play.current_round < ROUND_COUNT) {
    await supabase
      .from("geostakes_seed_plays")
      .update({
        current_round: play.current_round + 1,
        round_started_at: new Date().toISOString(),
      })
      .eq("id", playId);
  } else {
    await completePlay(playId);
  }
}

// =========================================================================
// completePlay — finalize a player's run. Triggers seed resolution if
// this was the challenger's play.
// =========================================================================
export async function completePlay(playId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: play } = await supabase
    .from("geostakes_seed_plays")
    .select("*")
    .eq("id", playId)
    .maybeSingle();
  if (!play || play.completed_at) return;

  const { data: guesses } = await supabase
    .from("geostakes_seed_play_guesses")
    .select("points")
    .eq("play_id", playId);

  const totalScore = (guesses ?? []).reduce(
    (s, g) => s + (g.points ?? 0),
    0,
  );

  await supabase
    .from("geostakes_seed_plays")
    .update({
      total_score: totalScore,
      completed_at: new Date().toISOString(),
      current_round: ROUND_COUNT + 1,
    })
    .eq("id", playId);

  if (play.role === "creator") {
    // Creator finished: stamp seed.creator_score, bump expires_at to 48h
    // so it's eligible for matching for the next two days.
    await supabase
      .from("geostakes_seeds")
      .update({
        creator_score: totalScore,
        creator_completed_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", play.seed_id)
      .eq("status", "open");
  } else {
    // Challenger finished: resolve the seed.
    await resolveSeed(play.seed_id);
  }
}

// =========================================================================
// resolveSeed — compare creator + challenger scores, pay out winner.
// =========================================================================
export async function resolveSeed(seedId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: seed } = await supabase
    .from("geostakes_seeds")
    .select("*")
    .eq("id", seedId)
    .maybeSingle();

  if (!seed || seed.status !== "matched") return;

  const { data: plays } = await supabase
    .from("geostakes_seed_plays")
    .select("user_id, total_score, role")
    .eq("seed_id", seedId);

  const creatorPlay = plays?.find((p) => p.role === "creator");
  const challengerPlay = plays?.find((p) => p.role === "challenger");
  if (!creatorPlay || !challengerPlay) return;
  if (creatorPlay.total_score == null || challengerPlay.total_score == null) {
    return;
  }

  const creatorScore = creatorPlay.total_score;
  const challengerScore = challengerPlay.total_score;
  const pot = Number(seed.bet_amount) * 2;

  let winnerId: string | null = null;
  if (creatorScore > challengerScore) winnerId = creatorPlay.user_id;
  else if (challengerScore > creatorScore) winnerId = challengerPlay.user_id;

  if (winnerId) {
    const payout = pot * (1 - HOUSE_RAKE);
    await creditCash(winnerId, payout);
    const loserId =
      winnerId === creatorPlay.user_id
        ? challengerPlay.user_id
        : creatorPlay.user_id;
    await supabase.from("game_history").insert({
      winner_id: winnerId,
      loser_id: loserId,
      amount: payout,
      currency: seed.currency,
      game: "geostakes",
      started_at: seed.created_at,
      ended_at: new Date().toISOString(),
    });
  } else {
    // Tie: full refund both, no rake.
    await creditCash(creatorPlay.user_id, Number(seed.bet_amount));
    await creditCash(challengerPlay.user_id, Number(seed.bet_amount));
  }

  await supabase
    .from("geostakes_seeds")
    .update({
      status: "resolved",
      winner_user_id: winnerId,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", seedId);
}

// =========================================================================
// getSeedPlayState — everything the client needs to render. Server-private
// truth (lat/lng of active round) is never returned; only pano_id is.
// =========================================================================
export async function getSeedPlayState(opts: {
  playId: string;
  userId: string;
}): Promise<SeedPlayState | { error: string }> {
  const { playId, userId } = opts;
  const supabase = createAdminClient();

  // Auto-advance an expired round before reading state.
  const { data: pRaw } = await supabase
    .from("geostakes_seed_plays")
    .select("*")
    .eq("id", playId)
    .maybeSingle();

  if (!pRaw) return { error: "Play not found" };
  if (pRaw.user_id !== userId) return { error: "Not your play" };

  if (
    !pRaw.completed_at &&
    pRaw.current_round <= ROUND_COUNT &&
    (Date.now() - new Date(pRaw.round_started_at).getTime()) / 1000 >
      ROUND_DURATION_SEC
  ) {
    await advancePlayRound(playId);
  }

  const { data: play } = await supabase
    .from("geostakes_seed_plays")
    .select("*, geostakes_seeds!inner(*)")
    .eq("id", playId)
    .single<{
      id: string;
      seed_id: string;
      user_id: string;
      role: SeedRole;
      current_round: number;
      round_started_at: string;
      total_score: number | null;
      completed_at: string | null;
      geostakes_seeds: {
        id: string;
        bet_amount: number;
        status: SeedStatus;
        location_ids: string[];
        creator_user_id: string;
        matched_user_id: string | null;
        winner_user_id: string | null;
        creator_score: number | null;
        currency: string;
      };
    }>();

  if (!play) return { error: "Play not found" };

  const seed = play.geostakes_seeds;

  const startedAtMs = new Date(play.round_started_at).getTime();
  const elapsedSec = (Date.now() - startedAtMs) / 1000;
  const timeRemainingSec = Math.max(0, ROUND_DURATION_SEC - elapsedSec);

  // Active round location — id + pano_id only, NOT lat/lng.
  let currentLocationId: string | null = null;
  let currentLocationPanoId: string | null = null;
  if (!play.completed_at && play.current_round <= ROUND_COUNT) {
    currentLocationId = seed.location_ids[play.current_round - 1];
    if (currentLocationId) {
      const { data: loc } = await supabase
        .from("geostakes_locations")
        .select("pano_id, lat, lng")
        .eq("id", currentLocationId)
        .single<{ pano_id: string | null; lat: number; lng: number }>();
      if (loc) {
        currentLocationPanoId = loc.pano_id;
        if (!currentLocationPanoId) {
          const resolved = await resolvePanoId(loc.lat, loc.lng);
          if (resolved) {
            currentLocationPanoId = resolved;
            await supabase
              .from("geostakes_locations")
              .update({ pano_id: resolved })
              .eq("id", currentLocationId);
          }
        }
      }
    }
  }

  // Current round submission status.
  let yourSubmittedThisRound = false;
  if (!play.completed_at) {
    const { data: g } = await supabase
      .from("geostakes_seed_play_guesses")
      .select("play_id")
      .eq("play_id", playId)
      .eq("round_number", play.current_round)
      .maybeSingle();
    yourSubmittedThisRound = Boolean(g);
  }

  // Completed rounds (full truth + the player's own guess).
  const completedMax = play.completed_at
    ? ROUND_COUNT
    : play.current_round - 1;
  const completedRounds: CompletedRound[] = [];

  if (completedMax > 0) {
    const { data: pastGuesses } = await supabase
      .from("geostakes_seed_play_guesses")
      .select("round_number, guess_lat, guess_lng, distance_meters, points")
      .eq("play_id", playId)
      .lte("round_number", completedMax);

    const truthIds = seed.location_ids.slice(0, completedMax);
    const { data: truths } = await supabase
      .from("geostakes_locations")
      .select("id, lat, lng")
      .in("id", truthIds);

    for (let r = 1; r <= completedMax; r++) {
      const g = pastGuesses?.find((x) => x.round_number === r);
      const truthLocId = seed.location_ids[r - 1];
      const truthLoc = truths?.find((t) => t.id === truthLocId);
      completedRounds.push({
        roundNumber: r,
        yourGuess:
          g && g.guess_lat !== null && g.guess_lng !== null
            ? {
                lat: g.guess_lat,
                lng: g.guess_lng,
                distanceMeters: g.distance_meters ?? 0,
                points: g.points ?? 0,
              }
            : null,
        truth: truthLoc
          ? { lat: truthLoc.lat, lng: truthLoc.lng }
          : { lat: 0, lng: 0 },
      });
    }
  }

  // Resolution data — only present when seed is resolved.
  let resolution: SeedPlayState["resolution"] = null;
  let waitingForOpponent = false;

  if (seed.status === "resolved") {
    const { data: bothPlays } = await supabase
      .from("geostakes_seed_plays")
      .select("user_id, total_score")
      .eq("seed_id", seed.id);
    const yourPlay = bothPlays?.find((p) => p.user_id === userId);
    const oppPlay = bothPlays?.find((p) => p.user_id !== userId);
    const yourScore = yourPlay?.total_score ?? 0;
    const oppScore = oppPlay?.total_score ?? 0;
    const youWon =
      seed.winner_user_id == null
        ? null
        : seed.winner_user_id === userId;
    const payout =
      youWon === true
        ? Number(seed.bet_amount) * 2 * (1 - HOUSE_RAKE)
        : youWon === null
          ? Number(seed.bet_amount)
          : 0;
    resolution = { yourScore, opponentScore: oppScore, youWon, payout };
  } else if (
    play.role === "creator" &&
    play.completed_at &&
    seed.status === "open"
  ) {
    // Creator finished, waiting for a P2.
    waitingForOpponent = true;
  }

  return {
    playId: play.id,
    seedId: seed.id,
    role: play.role,
    status: seed.status,
    betAmount: Number(seed.bet_amount),
    currentRound: play.current_round,
    roundStartedAt: play.round_started_at,
    timeRemainingSec,
    currentLocationId,
    currentLocationPanoId,
    yourSubmittedThisRound,
    completedRounds,
    yourTotalScore: play.total_score,
    yourPlayComplete: Boolean(play.completed_at),
    resolution,
    waitingForOpponent,
  };
}

// =========================================================================
// timeoutSweep — refund expired seeds. Call from a cron (Vercel cron or
// pg_cron). Idempotent; safe to run every minute.
// =========================================================================
export async function timeoutSweep(): Promise<{
  refundedOpen: number;
  refundedMatched: number;
}> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Open seeds whose expiry passed. Two sub-cases:
  //   - creator_score IS NULL → creator never finished play; refund creator
  //   - creator_score IS NOT NULL → no P2 in 48h; refund creator
  // Same refund either way.
  const { data: openExpired } = await supabase
    .from("geostakes_seeds")
    .select("id, creator_user_id, bet_amount")
    .eq("status", "open")
    .lt("expires_at", now);

  let refundedOpen = 0;
  for (const s of openExpired ?? []) {
    await creditCash(s.creator_user_id, Number(s.bet_amount));
    await supabase
      .from("geostakes_seeds")
      .update({
        status: "refunded",
        resolved_at: now,
      })
      .eq("id", s.id)
      .eq("status", "open");
    refundedOpen++;
  }

  // Matched seeds where challenger abandoned mid-play: refund challenger,
  // roll seed back to 'open' (with creator_score intact, ready for a new P2).
  const { data: matchedExpired } = await supabase
    .from("geostakes_seeds")
    .select("id, matched_user_id, bet_amount")
    .eq("status", "matched")
    .lt("expires_at", now);

  let refundedMatched = 0;
  for (const s of matchedExpired ?? []) {
    if (!s.matched_user_id) continue;
    await creditCash(s.matched_user_id, Number(s.bet_amount));
    await supabase
      .from("geostakes_seeds")
      .update({
        status: "open",
        matched_user_id: null,
        matched_at: null,
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", s.id)
      .eq("status", "matched");
    refundedMatched++;
  }

  return { refundedOpen, refundedMatched };
}
