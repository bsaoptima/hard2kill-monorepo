import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createMatch } from "@/lib/match";

export const runtime = "nodejs";

/**
 * Admin/test pairing endpoint — pairs the authenticated user with the
 * opponentId from the body and creates a match. The real matchmaking
 * queue lands in stage 5; this exists so we can dogfood the game loop
 * without writing a queue first.
 *
 * Body: { opponentId: string, betAmount: number, currency: 'cash' }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const opponentId: string | undefined = body?.opponentId;
  const betAmount = Number(body?.betAmount);
  const currency = body?.currency === "coins" ? "coins" : "cash";

  if (!opponentId || typeof opponentId !== "string") {
    return NextResponse.json(
      { error: "Missing opponentId" },
      { status: 400 },
    );
  }
  if (!betAmount || betAmount < 1) {
    return NextResponse.json({ error: "Invalid betAmount" }, { status: 400 });
  }

  const result = await createMatch({
    player1Id: user.id,
    player2Id: opponentId,
    betAmount,
    currency,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ matchId: result.matchId });
}
