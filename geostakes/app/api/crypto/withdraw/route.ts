/**
 * POST /api/crypto/withdraw
 *
 * Instant SOL withdrawal - signs and broadcasts on-chain
 * Daily limit: $100 per user
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from "@solana/web3.js";
import bs58 from "bs58";
import { getCashBalance, deductCash, creditCash, recordTransaction } from "@/lib/balance";
import { canWithdraw } from "@/lib/bonus";
import {
  checkDailyLimit,
  DAILY_CRYPTO_WITHDRAWAL_LIMIT,
} from "@/lib/withdrawals";
import { PLATFORM_WALLET_ADDRESS_SOLANA } from "@/lib/wagmi";

export const runtime = "nodejs";

// Solana connection
const solanaConnection = new Connection(
  process.env.SOLANA_RPC_URL || clusterApiUrl("mainnet-beta")
);

// Fetch SOL price from CoinGecko
async function getSolPrice(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { next: { revalidate: 60 } }
    );
    const data = await res.json();
    return data.solana?.usd ?? null;
  } catch (error) {
    console.error("[SOL Price] Failed to fetch:", error);
    return null;
  }
}

// Validate Solana address
const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function POST(request: Request) {
  // Authenticate user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse request body
  let amount: number;
  let destinationAddress: string;

  try {
    const body = await request.json();
    amount = Number(body.amount);
    destinationAddress = String(body.address || "").trim();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Only SOL withdrawals for now
    if (body.type !== "crypto_sol") {
      return NextResponse.json({ error: "Only SOL withdrawals are supported" }, { status: 400 });
    }

    if (!SOLANA_ADDRESS_RE.test(destinationAddress)) {
      return NextResponse.json(
        { error: "Invalid Solana wallet address" },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Check playthrough requirement
  const withdrawalCheck = await canWithdraw(user.id);
  if (!withdrawalCheck.allowed) {
    const status = withdrawalCheck.playthrough_status;
    if (status) {
      return NextResponse.json({
        error: `Playthrough incomplete. Wager $${status.playthrough_remaining.toFixed(2)} more to unlock withdrawals.`
      }, { status: 400 });
    }
    return NextResponse.json({ error: "Withdrawal not allowed" }, { status: 400 });
  }

  // Check daily limit
  const limitCheck = await checkDailyLimit(user.id, amount);
  if (!limitCheck.allowed) {
    return NextResponse.json({
      error: `Daily crypto withdrawal limit is $${DAILY_CRYPTO_WITHDRAWAL_LIMIT}. You have $${limitCheck.remaining.toFixed(2)} remaining today.`
    }, { status: 400 });
  }

  // Check balance
  const balance = await getCashBalance(user.id);
  if (balance < amount) {
    return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
  }

  // Deduct balance first (we'll refund if tx fails)
  const debited = await deductCash(user.id, amount);
  if (!debited) {
    return NextResponse.json({ error: "Failed to debit balance" }, { status: 500 });
  }

  const adminSupabase = createAdminClient();

  try {
    const privateKeyBase58 = process.env.PLATFORM_PRIVATE_KEY_SOLANA;
    if (!privateKeyBase58) {
      throw new Error("Solana platform wallet not configured");
    }

    // Phantom exports keys as base58 strings
    const secretKey = bs58.decode(privateKeyBase58);
    const platformKeypair = Keypair.fromSecretKey(secretKey);

    // Verify we're using the correct wallet
    if (platformKeypair.publicKey.toBase58() !== PLATFORM_WALLET_ADDRESS_SOLANA) {
      console.error("[Crypto Withdraw] Solana private key mismatch! Expected:", PLATFORM_WALLET_ADDRESS_SOLANA, "Got:", platformKeypair.publicKey.toBase58());
      throw new Error("Platform wallet configuration error");
    }

    // Get SOL price to convert USD to SOL
    const solPrice = await getSolPrice();
    if (!solPrice) {
      throw new Error("Could not fetch SOL price");
    }

    const solAmount = amount / solPrice;
    const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);

    // Check platform has enough SOL (need extra for tx fee ~5000 lamports)
    const platformBalance = await solanaConnection.getBalance(platformKeypair.publicKey);
    if (platformBalance < lamports + 10000) {
      throw new Error("Insufficient platform SOL liquidity");
    }

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: platformKeypair.publicKey,
        toPubkey: new PublicKey(destinationAddress),
        lamports,
      })
    );

    const txHash = await sendAndConfirmTransaction(solanaConnection, tx, [platformKeypair]);
    console.log(`[Crypto Withdraw] SOL sent: ${txHash} ($${amount} = ${solAmount.toFixed(4)} SOL @ $${solPrice.toFixed(2)})`);

    // Record successful withdrawal
    const { data: withdrawal, error: insertError } = await adminSupabase
      .from("withdrawals")
      .insert({
        user_id: user.id,
        amount,
        destination_type: "crypto_sol",
        destination_value: destinationAddress,
        status: "completed",
        tx_hash: txHash,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[Crypto Withdraw] Failed to record withdrawal:", insertError);
    }

    // Record transaction
    await recordTransaction(user.id, -amount, "withdraw", {
      type: "crypto_sol",
      tx_hash: txHash,
      destination: destinationAddress,
      sol_amount: solAmount,
      sol_price: solPrice,
    });

    return NextResponse.json({
      success: true,
      txHash,
      amount,
      solAmount,
      solPrice,
      withdrawalId: withdrawal?.id,
    });

  } catch (error) {
    console.error("[Crypto Withdraw] Transaction failed:", error);

    // Refund the user
    await creditCash(user.id, amount);

    const message = error instanceof Error ? error.message : "Transaction failed";

    // Don't expose internal errors
    if (message.includes("liquidity")) {
      return NextResponse.json(
        { error: "Insufficient platform liquidity. Please try a smaller amount or contact support." },
        { status: 503 }
      );
    }
    if (message.includes("not configured")) {
      return NextResponse.json(
        { error: "Crypto withdrawals are temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Withdrawal failed. Your balance has been refunded." },
      { status: 500 }
    );
  }
}
