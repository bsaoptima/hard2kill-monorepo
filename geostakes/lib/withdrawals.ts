import { createAdminClient } from "@/lib/supabase/admin";
import { creditCash, deductCash, getCashBalance } from "@/lib/balance";
import { canWithdraw } from "@/lib/bonus";
import {
  sendWithdrawalRequestReceipt,
  sendWithdrawalAdminAlert,
} from "@/lib/email";

export const MIN_WITHDRAWAL = 5;
export const MAX_WITHDRAWAL = 5000;

export type DestinationType = "pix" | "crypto_usdc_base" | "bank";

export type PixDestination = {
  type: "pix";
  key: string; // CPF, email, phone, or random key
};

export type CryptoBaseDestination = {
  type: "crypto_usdc_base";
  address: string; // 0x... 42-char Ethereum-compatible address
};

export type BankDestination = {
  type: "bank";
  holderName: string;
  iban: string; // IBAN or account identifier
  bankName: string;
  swift?: string; // optional SWIFT/BIC
  country?: string; // optional ISO country code
};

export type Destination =
  | PixDestination
  | CryptoBaseDestination
  | BankDestination;

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const IBAN_LOOSE_RE = /^[A-Z]{2}[A-Z0-9]{13,32}$/; // light shape check

export type WithdrawalResult =
  | { ok: true; withdrawalId: string }
  | { error: string };

function validateDestination(d: Destination): string | null {
  if (d.type === "pix") {
    if (!d.key || d.key.trim().length < 4)
      return "PIX key looks too short";
    return null;
  }
  if (d.type === "crypto_usdc_base") {
    const addr = d.address?.trim() ?? "";
    if (!EVM_ADDRESS_RE.test(addr))
      return "USDC Base address must be a valid 0x… Ethereum-format wallet address (42 chars)";
    return null;
  }
  if (d.type === "bank") {
    const holder = d.holderName?.trim() ?? "";
    const iban = d.iban?.trim().replace(/\s+/g, "").toUpperCase() ?? "";
    const bank = d.bankName?.trim() ?? "";
    if (holder.length < 2) return "Account holder name required";
    if (bank.length < 2) return "Bank name required";
    if (iban.length < 8) return "IBAN / account number too short";
    if (iban.length > 34) return "IBAN / account number too long";
    if (/^[A-Z]{2}/.test(iban) && !IBAN_LOOSE_RE.test(iban)) {
      return "IBAN format looks malformed";
    }
    return null;
  }
  return "Invalid destination type";
}

/**
 * Build the canonical {destination_value, destination_details} pair for storage.
 * destination_value is the primary identifier (PIX key / wallet address / IBAN);
 * destination_details holds the full structured payload (used for bank).
 */
function packDestination(d: Destination): {
  value: string;
  details: Record<string, string> | null;
} {
  if (d.type === "pix") {
    return { value: d.key.trim(), details: null };
  }
  if (d.type === "crypto_usdc_base") {
    return { value: d.address.trim(), details: null };
  }
  // bank
  const iban = d.iban.trim().replace(/\s+/g, "").toUpperCase();
  return {
    value: iban,
    details: {
      holderName: d.holderName.trim(),
      iban,
      bankName: d.bankName.trim(),
      ...(d.swift ? { swift: d.swift.trim().toUpperCase() } : {}),
      ...(d.country ? { country: d.country.trim().toUpperCase() } : {}),
    },
  };
}

/**
 * Validate, debit, persist, and notify. Manual processing happens off-system.
 */
export async function requestWithdrawal(opts: {
  userId: string;
  userEmail: string;
  amount: number;
  destination: Destination;
}): Promise<WithdrawalResult> {
  const { userId, userEmail, amount, destination } = opts;

  if (!Number.isFinite(amount) || amount < MIN_WITHDRAWAL) {
    return { error: `Minimum withdrawal is $${MIN_WITHDRAWAL}` };
  }
  if (amount > MAX_WITHDRAWAL) {
    return { error: `Maximum per request is $${MAX_WITHDRAWAL}` };
  }

  const validationError = validateDestination(destination);
  if (validationError) return { error: validationError };

  // Check playthrough requirement
  const withdrawalCheck = await canWithdraw(userId);
  if (!withdrawalCheck.allowed) {
    const status = withdrawalCheck.playthrough_status;
    if (status) {
      return {
        error: `Playthrough incomplete. Wager $${status.playthrough_remaining.toFixed(2)} more to unlock withdrawals. (Or forfeit bonus to withdraw immediately)`
      };
    }
    return { error: 'Withdrawal not allowed' };
  }

  const currentBalance = await getCashBalance(userId);
  if (currentBalance < amount) return { error: "Insufficient balance" };

  const debited = await deductCash(userId, amount);
  if (!debited) return { error: "Failed to debit balance" };

  const { value, details } = packDestination(destination);
  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("withdrawals")
    .insert({
      user_id: userId,
      amount,
      destination_type: destination.type,
      destination_value: value,
      destination_details: details,
    })
    .select("id")
    .single();

  if (error || !row) {
    await creditCash(userId, amount);
    return { error: error?.message ?? "Failed to create withdrawal" };
  }

  void sendWithdrawalRequestReceipt({
    to: userEmail,
    amount,
    destination,
    withdrawalId: row.id,
  });

  void sendWithdrawalAdminAlert({
    userEmail,
    amount,
    destination,
    withdrawalId: row.id,
  });

  return { ok: true, withdrawalId: row.id };
}
