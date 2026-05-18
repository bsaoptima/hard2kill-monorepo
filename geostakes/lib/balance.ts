import { createAdminClient } from "@/lib/supabase/admin";

export async function getCashBalance(userId: string): Promise<number> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("balances")
    .select("balance")
    .eq("id", userId)
    .maybeSingle();
  return Number(data?.balance ?? 0);
}

export async function creditCash(
  userId: string,
  amount: number,
): Promise<void> {
  const supabase = createAdminClient();

  const { data: row } = await supabase
    .from("balances")
    .select("balance")
    .eq("id", userId)
    .maybeSingle();

  const current = Number(row?.balance ?? 0);
  const next = current + amount;

  await supabase.from("balances").upsert({ id: userId, balance: next });
}

/**
 * Deduct cash from a user's balance. Returns false if insufficient funds
 * (no deduction performed) so the caller can refund the opposing player.
 */
export async function deductCash(
  userId: string,
  amount: number,
): Promise<boolean> {
  const supabase = createAdminClient();

  const { data: row } = await supabase
    .from("balances")
    .select("balance")
    .eq("id", userId)
    .maybeSingle();

  const current = Number(row?.balance ?? 0);
  if (current < amount) return false;

  const { error } = await supabase
    .from("balances")
    .update({ balance: current - amount })
    .eq("id", userId);

  return !error;
}

export async function recordTransaction(
  userId: string,
  amount: number,
  type: "deposit" | "withdraw" | "bet" | "win",
): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("transactions").insert({
    user_id: userId,
    amount,
    type,
  });
}
