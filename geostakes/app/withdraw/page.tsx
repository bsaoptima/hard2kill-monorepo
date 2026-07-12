import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArcadeWithdraw } from "@/components/arcade-withdraw";

export const metadata = {
  title: "Withdraw — Geostakes",
};

export default async function WithdrawPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/signin?next=/withdraw");
  }

  const { data: balanceRow } = await supabase
    .from("balances")
    .select("balance, bonus")
    .eq("id", user.id)
    .maybeSingle();
  const cash = Number(balanceRow?.balance ?? 0);
  const bonus = Number(balanceRow?.bonus ?? 0);
  const balance = cash;  // Only cash can be withdrawn, not bonus

  return <ArcadeWithdraw balance={balance} />;
}
