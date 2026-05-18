import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { forfeitMatch, ROUND_DURATION_SEC } from "@/lib/match";

export const runtime = "nodejs";

const FORFEIT_GRACE_SEC = 30;

/**
 * Forfeit the OPPONENT (not the caller) on disconnect.
 *
 * Server-side guard so a losing player can't just call this to grab the
 * pot mid-round: opponent must (a) not have submitted the current round
 * AND (b) at least 60s + 30s = 90s have elapsed since the round started.
 * That ties the forfeit to gameplay state, not just client-detected
 * presence (which the server has no way to verify).
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: match } = await admin
    .from("geostakes_matches")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }
  if (match.status !== "active") {
    return NextResponse.json({ error: "Match not active" }, { status: 400 });
  }
  if (match.player1_id !== user.id && match.player2_id !== user.id) {
    return NextResponse.json({ error: "Not in this match" }, { status: 403 });
  }

  const opponentId =
    match.player1_id === user.id ? match.player2_id : match.player1_id;

  const elapsedSec =
    (Date.now() - new Date(match.round_started_at).getTime()) / 1000;
  if (elapsedSec < ROUND_DURATION_SEC + FORFEIT_GRACE_SEC) {
    return NextResponse.json(
      {
        error: "Grace period not elapsed",
        secondsRemaining:
          ROUND_DURATION_SEC + FORFEIT_GRACE_SEC - elapsedSec,
      },
      { status: 400 },
    );
  }

  const { data: opponentGuess } = await admin
    .from("geostakes_round_guesses")
    .select("player_id, guess_lat")
    .eq("match_id", id)
    .eq("round_number", match.current_round)
    .eq("player_id", opponentId)
    .maybeSingle();

  // Real submission (non-null lat) means they're playing — refuse forfeit.
  if (opponentGuess && opponentGuess.guess_lat !== null) {
    return NextResponse.json(
      { error: "Opponent submitted this round" },
      { status: 400 },
    );
  }

  await forfeitMatch(id, opponentId, "disconnect");
  return NextResponse.json({ ok: true });
}
