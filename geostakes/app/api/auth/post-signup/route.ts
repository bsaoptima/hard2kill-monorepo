import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAdminNewUserAlert } from "@/lib/email";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { referralCode } = await request.json();

  // Send admin notification
  if (user.email) {
    void sendAdminNewUserAlert({
      userEmail: user.email,
      userId: user.id,
      referralCode: referralCode || undefined,
    });
  }

  // Record referral in database
  if (referralCode && typeof referralCode === "string") {
    const adminSupabase = createAdminClient();
    await adminSupabase.from("geostakes_referrals").insert({
      user_id: user.id,
      referral_code: referralCode,
    });
  }

  return NextResponse.json({ success: true });
}
