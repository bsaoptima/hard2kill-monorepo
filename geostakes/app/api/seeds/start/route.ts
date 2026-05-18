import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { startPlay } from "@/lib/seeds";

export const runtime = "nodejs";

/**
 * Hybrid entry point. Body: { betAmount: 1 | 5 | 10 }.
 * Returns { playId, seedId, role }. The role tells the client whether
 * they're playing into someone else's pot (challenger) or opening
 * a new one (creator).
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
  const betAmount = Number(body?.betAmount);
  if (!betAmount) {
    return NextResponse.json({ error: "Missing betAmount" }, { status: 400 });
  }

  const result = await startPlay({ userId: user.id, betAmount });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
