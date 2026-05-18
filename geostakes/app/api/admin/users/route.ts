import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCashBalance } from "@/lib/balance";

export const runtime = "nodejs";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "disabled in prod" }, { status: 403 });
  }

  const supabase = createAdminClient();
  const {
    data: { users },
  } = await supabase.auth.admin.listUsers({ perPage: 50 });

  const enriched = await Promise.all(
    users.map(async (u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      balance: await getCashBalance(u.id),
    })),
  );

  return NextResponse.json({ count: enriched.length, users: enriched });
}
