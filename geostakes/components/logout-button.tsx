"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="bg-transparent text-muted-foreground border border-border px-4 py-2 rounded-sm cursor-pointer text-[13px] hover:text-foreground hover:border-muted-foreground transition-colors"
    >
      Logout
    </button>
  );
}
