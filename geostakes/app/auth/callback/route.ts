import { type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { sendAdminNewUserAlert } from "@/lib/email";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  const supabase = await createClient();

  // Handle OAuth callback (Google, etc.)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Check if this is a new user and send notifications
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        // Send admin notification for OAuth signups
        void sendAdminNewUserAlert({
          userEmail: user.email,
          userId: user.id,
          referralCode: undefined,
        });
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Handle email OTP verification
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) {
      // Send admin notification for new signups
      if (type === "signup") {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          // Extract referral code from user metadata
          const referralCode = user.user_metadata?.referral_code;
          const refCodeStr = typeof referralCode === "string" ? referralCode : undefined;

          // Send admin alert with referral info
          void sendAdminNewUserAlert({
            userEmail: user.email,
            userId: user.id,
            referralCode: refCodeStr,
          });

          // Record referral in database
          if (refCodeStr) {
            const adminSupabase = createAdminClient();
            await adminSupabase.from("geostakes_referrals").insert({
              user_id: user.id,
              referral_code: refCodeStr,
            });
          }
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/signin?error=auth-failed`);
}
