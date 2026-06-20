import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAdminNewUserAlert, sendResendEvent } from "@/lib/email";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { referralCode } = await request.json();
  const adminSupabase = createAdminClient();

  // Create balance record with $0
  await adminSupabase.from("balances").upsert({
    id: user.id,
    balance: 0,
    bonus: 0,
  }, { onConflict: "id", ignoreDuplicates: true });

  // Send admin notification + trigger Resend automation
  if (user.email) {
    void sendAdminNewUserAlert({
      userEmail: user.email,
      userId: user.id,
      referralCode: referralCode || undefined,
    });

    // Trigger signup automation (drip campaign)
    void sendResendEvent({
      email: user.email,
      event: "user.signup",
      data: {
        referral: referralCode || "none",
      },
    });
  }

  // Record referral in database
  if (referralCode && typeof referralCode === "string") {
    await adminSupabase.from("geostakes_referrals").insert({
      user_id: user.id,
      referral_code: referralCode,
    });
  }

  return NextResponse.json({ success: true });
}
