import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DepositForm } from "@/components/deposit-form";
import { PlaythroughProgress } from "@/components/playthrough-progress";

export const metadata = {
  title: "Deposit — Geostakes",
};

export default async function DepositPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/signin?next=/deposit");
  }

  const { data: balanceRow } = await supabase
    .from("balances")
    .select("balance, bonus")
    .eq("id", user.id)
    .maybeSingle();
  const cash = Number(balanceRow?.balance ?? 0);
  const bonus = Number(balanceRow?.bonus ?? 0);
  const balance = cash + bonus;

  return (
    <div className="max-w-[520px] w-full mx-auto px-6 py-16">
      <div className="mb-8">
        <div className="text-[11px] text-muted-foreground uppercase tracking-[0.14em] font-mono mb-2">
          Add cash
        </div>
        <div className="flex items-end justify-between gap-4">
          <h1
            className="text-[42px] uppercase leading-none"
            style={{
              fontFamily: "var(--font-anton), Anton, 'Space Grotesk', sans-serif",
              fontStyle: "italic",
              fontWeight: 400,
            }}
          >
            Deposit
          </h1>
          <div className="text-right shrink-0">
            <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-mono mb-0.5">
              Current balance
            </div>
            <div className="text-[22px] font-bold tabular-nums text-primary leading-none">
              ${balance.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <PlaythroughProgress />
      </div>

      <DepositForm />
    </div>
  );
}
