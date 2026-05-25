import { createClient } from "@/lib/supabase/server";

/**
 * Resolve the authenticated user and verify their email matches
 * ADMIN_NOTIFY_EMAIL. Returns the user on success, or null on auth fail.
 *
 * Used by /api/admin/* server endpoints and /admin/* pages.
 */
export async function getAdminUser(): Promise<{
  id: string;
  email: string;
} | null> {
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
  if (!adminEmail) {
    console.warn("[admin-auth] ADMIN_NOTIFY_EMAIL not set, blocking admin access");
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) return null;
  if (user.email.toLowerCase() !== adminEmail.toLowerCase()) return null;

  return { id: user.id, email: user.email };
}
