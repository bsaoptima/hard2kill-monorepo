import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { MatchPanel } from "@/components/match-panel";
import { DepositCard } from "@/components/deposit-card";
import { DepositToast } from "@/components/deposit-toast";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="max-w-[880px] w-full mx-auto px-8 py-8">
      <Suspense fallback={null}>
        <DepositToast />
      </Suspense>

      <h2 className="text-[13px] text-muted-foreground text-center uppercase tracking-[0.04em] mb-10">
        GeoGuessr. Real money. No middleman.
      </h2>

      <MatchPanel />

      {user ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-card p-5 rounded-sm">
            <div className="text-sm font-bold mb-1">Free Coins</div>
            <div className="text-xs text-muted-foreground mb-3">
              10 coins per hour, no deposit needed
            </div>
            <button
              type="button"
              disabled
              className="w-full bg-transparent text-foreground border border-border px-3 py-2.5 rounded-sm text-[13px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Claim 10 coins
            </button>
          </div>
          <DepositCard />
        </div>
      ) : null}
    </div>
  );
}
