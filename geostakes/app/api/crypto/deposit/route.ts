import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient, http, parseAbiItem, decodeEventLog } from "viem";
import { base } from "viem/chains";
import { creditCash, recordTransaction } from "@/lib/balance";
import { creditFirstDepositBonus } from "@/lib/bonus";
import {
  USDC_ADDRESS,
  USDC_DECIMALS,
  usdcAbi,
  formatUsdc,
} from "@/lib/contracts/usdc";
import { PLATFORM_WALLET_ADDRESS } from "@/lib/wagmi";

export const runtime = "nodejs";

// Create viem client for Base
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

// ERC-20 Transfer event signature
const transferEventAbi = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);

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
  let txHash: string;
  let expectedAmount: number;

  try {
    const body = await request.json();
    txHash = body.txHash;
    expectedAmount = body.expectedAmount;

    if (!txHash || typeof txHash !== "string") {
      return NextResponse.json(
        { error: "txHash is required" },
        { status: 400 }
      );
    }

    // Validate tx hash format
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return NextResponse.json(
        { error: "Invalid transaction hash format" },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Check if this transaction has already been processed (idempotency)
  const adminSupabase = createAdminClient();
  const { data: existingTx } = await adminSupabase
    .from("transactions")
    .select("id")
    .eq("metadata->>tx_hash", txHash)
    .maybeSingle();

  if (existingTx) {
    return NextResponse.json(
      { error: "Transaction already processed" },
      { status: 409 }
    );
  }

  try {
    // Fetch transaction receipt from blockchain
    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });

    if (!receipt) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Check transaction was successful
    if (receipt.status !== "success") {
      return NextResponse.json(
        { error: "Transaction failed on-chain" },
        { status: 400 }
      );
    }

    // Find USDC Transfer event to platform wallet
    let transferAmount: bigint | null = null;
    let fromAddress: string | null = null;

    for (const log of receipt.logs) {
      // Check if this log is from USDC contract
      if (log.address.toLowerCase() !== USDC_ADDRESS.toLowerCase()) {
        continue;
      }

      try {
        const decoded = decodeEventLog({
          abi: [transferEventAbi],
          data: log.data,
          topics: log.topics,
        });

        if (decoded.eventName === "Transfer") {
          const to = (decoded.args as { to: string }).to;
          const value = (decoded.args as { value: bigint }).value;
          const from = (decoded.args as { from: string }).from;

          // Check if transfer is to platform wallet
          if (to.toLowerCase() === PLATFORM_WALLET_ADDRESS.toLowerCase()) {
            transferAmount = value;
            fromAddress = from;
            break;
          }
        }
      } catch {
        // Not a Transfer event, skip
        continue;
      }
    }

    if (!transferAmount || !fromAddress) {
      return NextResponse.json(
        { error: "No USDC transfer to platform wallet found in transaction" },
        { status: 400 }
      );
    }

    // Convert to USD amount
    const usdAmount = formatUsdc(transferAmount);

    // Validate amount is reasonable (within 1% of expected, or if no expected amount provided)
    if (expectedAmount) {
      const tolerance = expectedAmount * 0.01; // 1% tolerance
      if (Math.abs(usdAmount - expectedAmount) > tolerance) {
        console.warn(
          `[Crypto Deposit] Amount mismatch: expected ${expectedAmount}, got ${usdAmount}`
        );
        // Still process but log the discrepancy
      }
    }

    // Minimum deposit check
    if (usdAmount < 1) {
      return NextResponse.json(
        { error: "Minimum deposit is $1" },
        { status: 400 }
      );
    }

    console.log(
      `[Crypto Deposit] Processing: $${usdAmount.toFixed(2)} from ${fromAddress} for user ${user.id}`
    );

    // Credit the user's balance
    await creditCash(user.id, usdAmount);
    console.log(`[Crypto Deposit] creditCash succeeded`);

    // Record the transaction with tx hash for idempotency
    await recordTransaction(user.id, usdAmount, "deposit", {
      type: "crypto",
      tx_hash: txHash,
      from_address: fromAddress,
      chain: "base",
      token: "USDC",
    });
    console.log(`[Crypto Deposit] recordTransaction succeeded`);

    // Try to credit first deposit bonus
    try {
      const bonusResult = await creditFirstDepositBonus(
        user.id,
        usdAmount,
        undefined, // device fingerprint (not available for crypto)
        undefined, // IP address
        `crypto:${txHash}` // Use tx hash as payment method ID for uniqueness
      );

      if (bonusResult.success) {
        console.log(
          `[Crypto Deposit] Credited $${bonusResult.bonus_amount.toFixed(2)} deposit bonus`
        );
        return NextResponse.json({
          success: true,
          credited: usdAmount,
          bonus: bonusResult.bonus_amount,
          playthrough_required: bonusResult.playthrough_required,
          txHash,
        });
      } else {
        console.log(`[Crypto Deposit] Bonus not credited: ${bonusResult.error}`);
      }
    } catch (bonusError) {
      console.error(
        `[Crypto Deposit] Bonus crediting failed (deposit still successful):`,
        bonusError
      );
    }

    return NextResponse.json({
      success: true,
      credited: usdAmount,
      txHash,
    });
  } catch (error) {
    console.error("[Crypto Deposit] Error:", error);

    // Handle specific viem errors
    if (error instanceof Error) {
      if (error.message.includes("could not be found")) {
        return NextResponse.json(
          { error: "Transaction not found. It may still be pending." },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to verify transaction" },
      { status: 500 }
    );
  }
}
