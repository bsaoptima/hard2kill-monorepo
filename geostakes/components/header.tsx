import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Brand } from "@/components/brand";
import { WalletBox } from "@/components/wallet-box";
import { ProfileButton } from "@/components/profile-button";
import { ArcadeButton } from "@/components/arcade-button";
import { GrayButton } from "@/components/gray-button";
import { MobileMenu } from "@/components/mobile-menu";
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
  let username = "Player";
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

    // Get username from user metadata or email
    username = user.user_metadata?.username ||
               user.user_metadata?.display_name ||
               user.email?.split('@')[0] ||
               'Player';

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
        <>
          {/* Desktop menu - hidden on mobile */}
          <div className="hidden lg:flex gap-2 sm:gap-3 items-center">
            <WalletBox label="Balance" amount={`$${totalBalance.toFixed(2)}`} />
            {/* <WalletBox label="Coins" amount={String(coins)} /> */}
            {/* Profile link hidden until wired to real data */}
            <div className="relative">
              <ArcadeButton href="/deposit">
                <span className="sm:text-[17px]">Deposit</span>
              </ArcadeButton>
              {bonusEligible && (
                <span className="absolute -top-1 -right-1 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-500 text-[9px] font-bold text-white shadow-lg">
                  <Gift className="w-2.5 h-2.5" />
                  +100%
                </span>
              )}
            </div>
            <GrayButton href="/withdraw">
              Withdraw
            </GrayButton>
            <ProfileButton username={username} balance={totalBalance} />
          </div>

          {/* Mobile hamburger menu */}
          <MobileMenu
            username={username}
            balance={totalBalance}
            bonusEligible={bonusEligible}
          />
        </>
      ) : (
        <ArcadeButton href="/auth/signin">
          <span className="text-[17px]">Login</span>
        </ArcadeButton>
      )}
    </header>
  );
}
