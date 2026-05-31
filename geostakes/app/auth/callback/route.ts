import { type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { sendAdminNewUserAlert } from "@/lib/email";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) {
      // Send admin notification for new signups
      if (type === "signup") {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          void sendAdminNewUserAlert({
            userEmail: user.email,
            userId: user.id
          });
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/signin?error=auth-failed`);
}
