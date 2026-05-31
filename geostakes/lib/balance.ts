import { createAdminClient } from "@/lib/supabase/admin";

// ============================================================================
// TYPES
// ============================================================================

export interface Balance {
  cash: number;
  bonus: number;
  total: number;
}

export interface DeductResult {
  success: boolean;
  cash_deducted: number;
  bonus_deducted: number;
}

// ============================================================================
// BALANCE QUERIES
// ============================================================================

/**
 * Get full balance (cash + bonus) for a user
 */
export async function getBalance(userId: string): Promise<Balance> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("balances")
    .select("balance, bonus")
    .eq("id", userId)
    .maybeSingle();

  const cash = Number(data?.balance ?? 0);
  const bonus = Number(data?.bonus ?? 0);

  return {
    cash,
    bonus,
    total: cash + bonus
  };
}

/**
 * Get cash balance only (backward compatibility)
 */
export async function getCashBalance(userId: string): Promise<number> {
  const balance = await getBalance(userId);
  return balance.cash;
}

// ============================================================================
// CREDITING FUNCTIONS
// ============================================================================

/**
 * Credit cash to user balance
 */
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
 * Credit bonus to user balance
 */
export async function creditBonus(
  userId: string,
  amount: number,
): Promise<void> {
  const supabase = createAdminClient();

  const { data: row } = await supabase
    .from("balances")
    .select("bonus")
    .eq("id", userId)
    .maybeSingle();

  const current = Number(row?.bonus ?? 0);
  const next = current + amount;

  await supabase.from("balances").upsert({
    id: userId,
    bonus: next,
    balance: row?.balance ?? 0 // preserve existing cash balance
  });
}

// ============================================================================
// DEDUCTING FUNCTIONS (Cash First, Bonus Second)
// ============================================================================

/**
 * Deduct from user balance (cash first, then bonus if needed)
 * Returns false if insufficient total funds
 *
 * CRITICAL: This deducts CASH FIRST, then bonus
 * This ensures users risk their real money during playthrough
 */
export async function deductBalance(
  userId: string,
  amount: number,
): Promise<DeductResult> {
  const supabase = createAdminClient();

  const balance = await getBalance(userId);

  // Check if user has enough total balance
  if (balance.total < amount) {
    return {
      success: false,
      cash_deducted: 0,
      bonus_deducted: 0
    };
  }

  let cashDeducted = 0;
  let bonusDeducted = 0;

  // Deduct from cash first
  if (balance.cash >= amount) {
    // Sufficient cash, deduct entirely from cash
    cashDeducted = amount;
    bonusDeducted = 0;

    await supabase
      .from("balances")
      .update({ balance: balance.cash - amount })
      .eq("id", userId);

  } else {
    // Insufficient cash, deduct all cash + remaining from bonus
    cashDeducted = balance.cash;
    bonusDeducted = amount - balance.cash;

    await supabase
      .from("balances")
      .update({
        balance: 0,
        bonus: balance.bonus - bonusDeducted
      })
      .eq("id", userId);
  }

  return {
    success: true,
    cash_deducted: cashDeducted,
    bonus_deducted: bonusDeducted
  };
}

/**
 * Deduct cash only (backward compatibility)
 * Returns false if insufficient funds
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

// ============================================================================
// TRANSACTION RECORDING
// ============================================================================

export async function recordTransaction(
  userId: string,
  amount: number,
  type: "deposit" | "withdraw" | "bet" | "win" | "refund" | "deposit_bonus_credit" | "bonus_forfeited",
  metadata?: Record<string, any>
): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("transactions").insert({
    user_id: userId,
    amount,
    type,
    metadata: metadata || null
  });
}
