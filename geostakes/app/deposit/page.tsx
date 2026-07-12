import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArcadeDeposit } from "@/components/arcade-deposit";

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

  return <ArcadeDeposit />;
}
