import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSeedPlayState } from "@/lib/seeds";

export const runtime = "nodejs";

/** GET /api/seeds/plays/[id] — full state for the authenticated user's play. */
export async function GET(
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

  const result = await getSeedPlayState({ playId: id, userId: user.id });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json(result);
}
