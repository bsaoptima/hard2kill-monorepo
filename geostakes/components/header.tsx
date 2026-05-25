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
  // Coins balance is fetched but not displayed for now. Re-enable by
  // un-commenting the <WalletBox label="Coins" .../> line below.
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
  void coins;

  return (
    <header className="flex justify-between items-center px-8 py-5 border-b border-[#1a1a1a]">
      <Brand />
      {user ? (
        <div className="flex gap-3 items-center">
          <WalletBox label="Cash" amount={`$${cash.toFixed(2)}`} />
          {/* <WalletBox label="Coins" amount={String(coins)} /> */}
          <Link
            href="/deposit"
            className="bg-primary text-primary-foreground border-none px-5 py-2.5 rounded-xl uppercase tracking-[0.02em] hover:brightness-105 hover:-translate-y-px transition-all"
            style={{
              fontFamily: "var(--font-anton), Anton, 'Space Grotesk', sans-serif",
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: "15px",
            }}
          >
            Deposit
          </Link>
          <Link
            href="/withdraw"
            className="bg-transparent text-foreground border border-[var(--line-2,#2a2f37)] px-5 py-2.5 rounded-xl uppercase tracking-[0.02em] hover:border-foreground hover:-translate-y-px transition-all"
            style={{
              fontFamily: "var(--font-anton), Anton, 'Space Grotesk', sans-serif",
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: "15px",
            }}
          >
            Withdraw
          </Link>
          <LogoutButton />
        </div>
      ) : (
        <Link
          href="/auth/signin"
          className="bg-primary text-primary-foreground border-none px-6 py-2.5 rounded-xl uppercase tracking-[0.02em] hover:brightness-105 hover:-translate-y-px transition-all"
          style={{
            fontFamily: "var(--font-anton), Anton, 'Space Grotesk', sans-serif",
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: "16px",
          }}
        >
          Login
        </Link>
      )}
    </header>
  );
}
