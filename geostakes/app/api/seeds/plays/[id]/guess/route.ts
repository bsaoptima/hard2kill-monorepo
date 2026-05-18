import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { submitSeedGuess } from "@/lib/seeds";

export const runtime = "nodejs";

/** POST /api/seeds/plays/[id]/guess — body: { guessLat, guessLng }. */
export async function POST(
  request: Request,
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

  const body = await request.json().catch(() => null);
  const guessLat = Number(body?.guessLat);
  const guessLng = Number(body?.guessLng);
  if (
    !Number.isFinite(guessLat) ||
    !Number.isFinite(guessLng) ||
    guessLat < -90 ||
    guessLat > 90 ||
    guessLng < -180 ||
    guessLng > 180
  ) {
    return NextResponse.json(
      { error: "Invalid coordinates" },
      { status: 400 },
    );
  }

  const result = await submitSeedGuess({
    playId: id,
    userId: user.id,
    guessLat,
    guessLng,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
