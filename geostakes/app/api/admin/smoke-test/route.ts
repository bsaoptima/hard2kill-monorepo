import { NextResponse } from "next/server";
import { createMatch, submitGuess, getMatchState } from "@/lib/match";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getCashBalance,
  creditCash,
} from "@/lib/balance";

export const runtime = "nodejs";

const TOPUP_TARGET = 10;

/**
 * Drives a complete 5-round match between two arbitrary user IDs using
 * the admin client. Tops up either player's cash to $10 if needed so the
 * bet doesn't fail. Returns a transcript of every round + start/end balances
 * + final settlement so we can verify the loop without a UI.
 *
 * Body: { player1Id: string, player2Id: string, betAmount?: number }
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "disabled in prod" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const player1Id: string | undefined = body?.player1Id;
  const player2Id: string | undefined = body?.player2Id;
  const betAmount = Number(body?.betAmount ?? 1);

  if (!player1Id || !player2Id) {
    return NextResponse.json(
      { error: "Body must include player1Id and player2Id" },
      { status: 400 },
    );
  }
  if (player1Id === player2Id) {
    return NextResponse.json(
      { error: "player1Id and player2Id must differ" },
      { status: 400 },
    );
  }

  // Confirm both users exist in auth.users.
  const supabase = createAdminClient();
  const {
    data: { users },
  } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const userIds = new Set(users.map((u) => u.id));
  if (!userIds.has(player1Id) || !userIds.has(player2Id)) {
    return NextResponse.json(
      { error: "One or both player IDs not found in auth.users" },
      { status: 404 },
    );
  }

  // Top up to ensure both have enough to bet.
  for (const id of [player1Id, player2Id]) {
    const bal = await getCashBalance(id);
    if (bal < betAmount) {
      await creditCash(id, TOPUP_TARGET - bal);
    }
  }

  const startP1 = await getCashBalance(player1Id);
  const startP2 = await getCashBalance(player2Id);

  // Create match.
  const created = await createMatch({
    player1Id,
    player2Id,
    betAmount,
    currency: "cash",
  });
  if ("error" in created) {
    return NextResponse.json({ stage: "create", ...created }, { status: 400 });
  }
  const matchId = created.matchId;

  // Drive 5 rounds with random guesses (lat/lng anywhere on Earth).
  const transcript: Array<{
    round: number;
    p1: unknown;
    p2: unknown;
  }> = [];

  for (let round = 1; round <= 5; round++) {
    const p1 = await submitGuess({
      matchId,
      userId: player1Id,
      guessLat: Math.random() * 180 - 90,
      guessLng: Math.random() * 360 - 180,
    });
    const p2 = await submitGuess({
      matchId,
      userId: player2Id,
      guessLat: Math.random() * 180 - 90,
      guessLng: Math.random() * 360 - 180,
    });
    transcript.push({ round, p1, p2 });
  }

  const final = await getMatchState(matchId, player1Id);
  const endP1 = await getCashBalance(player1Id);
  const endP2 = await getCashBalance(player2Id);

  return NextResponse.json({
    matchId,
    transcript,
    final,
    balances: {
      player1: { start: startP1, end: endP1, delta: endP1 - startP1 },
      player2: { start: startP2, end: endP2, delta: endP2 - startP2 },
    },
  });
}
