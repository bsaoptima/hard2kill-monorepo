import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { startNextRound } from "@/lib/seeds";

export const runtime = "nodejs";

/** POST /api/seeds/plays/[id]/next-round — user-paced round advancement. */
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

  const result = await startNextRound({ playId: id, userId: user.id });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
