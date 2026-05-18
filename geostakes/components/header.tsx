import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Brand } from "@/components/brand";
import { WalletBox } from "@/components/wallet-box";
import { LogoutButton } from "@/components/logout-button";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let cash = 0;
  let coins = 0;
  if (user) {
    const { data } = await supabase
      .from("balances")
      .select("balance, coins")
      .eq("id", user.id)
      .maybeSingle();
    cash = Number(data?.balance ?? 0);
    coins = Number(data?.coins ?? 0);
  }

  return (
    <header className="flex justify-between items-center px-8 py-5 border-b border-[#1a1a1a]">
      <Brand />
      {user ? (
        <div className="flex gap-3 items-center">
          <WalletBox label="Cash" amount={`$${cash.toFixed(2)}`} />
          <WalletBox label="Coins" amount={String(coins)} />
          <LogoutButton />
        </div>
      ) : (
        <Link
          href="/auth/signin"
          className="bg-primary text-primary-foreground border-none px-6 py-2.5 rounded-sm text-sm font-bold uppercase tracking-[0.05em] hover:opacity-90 transition-opacity"
        >
          Login
        </Link>
      )}
    </header>
  );
}
