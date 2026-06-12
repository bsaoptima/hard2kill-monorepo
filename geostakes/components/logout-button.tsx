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
      className="bg-transparent text-foreground border border-[var(--line-2,#2a2f37)] px-6 py-2.5 cursor-pointer uppercase tracking-[0.02em] hover:border-foreground hover:-translate-y-px transition-all"
      style={{
        fontFamily: "var(--font-anton), Anton, 'Space Grotesk', sans-serif",
        fontStyle: "italic",
        fontWeight: 400,
        fontSize: "16px",
      }}
    >
      Logout
    </button>
  );
}
