import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Brand } from "@/components/brand";
import { WalletBox } from "@/components/wallet-box";
import { LogoutButton } from "@/components/logout-button";
import { Gift } from "lucide-react";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let cash = 0;
  let bonus = 0;
  let totalBalance = 0;
  let bonusEligible = false;
  // Coins balance is fetched but not displayed for now. Re-enable by
  // un-commenting the <WalletBox label="Coins" .../> line below.
  let coins = 0;
  if (user) {
    const { data } = await supabase
      .from("balances")
      .select("balance, bonus, coins")
      .eq("id", user.id)
      .maybeSingle();
    cash = Number(data?.balance ?? 0);
    bonus = Number(data?.bonus ?? 0);
    totalBalance = cash + bonus;
    coins = Number(data?.coins ?? 0);

    // Check if eligible for first deposit bonus
    const adminSupabase = createAdminClient();
    const { data: bonusClaim } = await adminSupabase
      .from("geostakes_bonus_claims")
      .select("id")
      .eq("user_id", user.id)
      .eq("bonus_type", "first_deposit_match")
      .maybeSingle();
    bonusEligible = !bonusClaim; // Eligible if no claim exists
  }
  void coins;

  return (
    <header className="flex justify-between items-center px-4 sm:px-8 py-3 sm:py-5 border-b border-[#1a1a1a]">
      <Brand />
      {user ? (
        <div className="flex gap-2 sm:gap-3 items-center">
          <WalletBox label="Balance" amount={`$${totalBalance.toFixed(2)}`} />
          {/* <WalletBox label="Coins" amount={String(coins)} /> */}
          <Link
            href="/profile"
            className="hidden md:block bg-transparent text-foreground border border-[var(--line-2,#2a2f37)] px-5 py-2.5 uppercase tracking-[0.02em] hover:border-foreground hover:-translate-y-px transition-all"
            style={{
              fontFamily: "var(--font-anton), Anton, 'Space Grotesk', sans-serif",
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: "15px",
            }}
          >
            Profile
          </Link>
          <Link
            href="/deposit"
            className="relative bg-primary text-primary-foreground border-none px-3 sm:px-5 py-2 sm:py-2.5 uppercase tracking-[0.02em] hover:brightness-105 hover:-translate-y-px transition-all"
            style={{
              fontFamily: "var(--font-anton), Anton, 'Space Grotesk', sans-serif",
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: "13px",
            }}
          >
            {bonusEligible && (
              <span className="absolute -top-1 -right-1 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-500 text-[9px] font-bold text-white shadow-lg">
                <Gift className="w-2.5 h-2.5" />
                +100%
              </span>
            )}
            <span className="sm:text-[15px]">Deposit</span>
          </Link>
          <Link
            href="/withdraw"
            className="hidden lg:block bg-transparent text-foreground border border-[var(--line-2,#2a2f37)] px-5 py-2.5 uppercase tracking-[0.02em] hover:border-foreground hover:-translate-y-px transition-all"
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
          className="bg-primary text-primary-foreground border-none px-6 py-2.5 uppercase tracking-[0.02em] hover:brightness-105 hover:-translate-y-px transition-all"
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
