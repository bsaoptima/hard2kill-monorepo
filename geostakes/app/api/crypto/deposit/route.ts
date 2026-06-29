import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient, http, parseAbiItem, decodeEventLog } from "viem";
import { base } from "viem/chains";
import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { creditCash, recordTransaction } from "@/lib/balance";
import { creditFirstDepositBonus } from "@/lib/bonus";
import {
  formatStablecoin,
  getTokenByAddress,
  USDC_ADDRESS_SOLANA,
} from "@/lib/contracts/usdc";
import { PLATFORM_WALLET_ADDRESS, PLATFORM_WALLET_ADDRESS_SOLANA } from "@/lib/wagmi";

export const runtime = "nodejs";

// Fetch SOL price from CoinGecko
async function getSolPrice(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { next: { revalidate: 60 } } // Cache for 60 seconds
    );
    const data = await res.json();
    return data.solana?.usd ?? null;
  } catch (error) {
    console.error("[SOL Price] Failed to fetch:", error);
    return null;
  }
}

// Create viem client for Base (EVM)
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

// Solana connection
const solanaConnection = new Connection(
  process.env.SOLANA_RPC_URL || clusterApiUrl("mainnet-beta")
);

// ERC-20 Transfer event signature
const transferEventAbi = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);

// Verify Base (EVM) transaction
async function verifyBaseTransaction(txHash: string): Promise<{
  amount: number;
  fromAddress: string;
  tokenSymbol: string;
} | null> {
  const receipt = await publicClient.getTransactionReceipt({
    hash: txHash as `0x${string}`,
  });

  if (!receipt || receipt.status !== "success") {
    return null;
  }

  for (const log of receipt.logs) {
    const token = getTokenByAddress(log.address, "evm");
    if (!token) continue;

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

        if (to.toLowerCase() === PLATFORM_WALLET_ADDRESS.toLowerCase()) {
          return {
            amount: formatStablecoin(value, token.decimals),
            fromAddress: from,
            tokenSymbol: token.symbol,
          };
        }
      }
    } catch {
      continue;
    }
  }

  return null;
}

// Verify Solana transaction (SPL tokens and native SOL)
async function verifySolanaTransaction(signature: string): Promise<{
  amount: number; // USD amount
  fromAddress: string;
  tokenSymbol: string;
  solAmount?: number; // Original SOL amount if native
  solPrice?: number; // SOL price used for conversion
} | null> {
  try {
    const tx = await solanaConnection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx || tx.meta?.err) {
      return null;
    }

    const platformWallet = PLATFORM_WALLET_ADDRESS_SOLANA;
    const usdcMint = USDC_ADDRESS_SOLANA;

    for (const instruction of tx.transaction.message.instructions) {
      // Check for native SOL transfer (system program)
      if ("parsed" in instruction && instruction.program === "system") {
        const parsed = instruction.parsed;

        if (parsed.type === "transfer") {
          const info = parsed.info;
          const destination = info.destination;
          const lamports = info.lamports;
          const source = info.source;

          // Check if transfer is to platform wallet
          if (destination === platformWallet) {
            const solAmount = lamports / LAMPORTS_PER_SOL;

            // Fetch SOL price to convert to USD
            const solPrice = await getSolPrice();
            if (!solPrice) {
              console.error("[Solana Verify] Could not fetch SOL price");
              return null;
            }

            const usdAmount = solAmount * solPrice;

            return {
              amount: usdAmount,
              fromAddress: source,
              tokenSymbol: "SOL",
              solAmount,
              solPrice,
            };
          }
        }
      }

      // Check for SPL token transfer
      if ("parsed" in instruction && instruction.program === "spl-token") {
        const parsed = instruction.parsed;

        if (parsed.type === "transfer" || parsed.type === "transferChecked") {
          const info = parsed.info;

          // Get the destination account owner
          const destAccount = info.destination;
          const destInfo = await solanaConnection.getParsedAccountInfo(
            new PublicKey(destAccount)
          );

          if (destInfo.value?.data && "parsed" in destInfo.value.data) {
            const destOwner = destInfo.value.data.parsed.info.owner;
            const mint = destInfo.value.data.parsed.info.mint;

            if (destOwner === platformWallet && mint === usdcMint) {
              // Get amount
              let uiAmount: number;
              if (parsed.type === "transferChecked") {
                uiAmount = info.tokenAmount.uiAmount;
              } else {
                uiAmount = Number(info.amount) / 1e6; // USDC has 6 decimals
              }

              // Get source wallet
              const sourceAccount = info.source;
              const sourceInfo = await solanaConnection.getParsedAccountInfo(
                new PublicKey(sourceAccount)
              );

              let fromAddress = sourceAccount;
              if (sourceInfo.value?.data && "parsed" in sourceInfo.value.data) {
                fromAddress = sourceInfo.value.data.parsed.info.owner;
              }

              return {
                amount: uiAmount,
                fromAddress,
                tokenSymbol: "USDC",
              };
            }
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error("[Solana Verify] Error:", error);
    return null;
  }
}

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
  let chain: "base" | "solana" = "base";

  try {
    const body = await request.json();
    txHash = body.txHash;
    expectedAmount = body.expectedAmount;
    chain = body.chain || "base";

    if (!txHash || typeof txHash !== "string") {
      return NextResponse.json(
        { error: "txHash is required" },
        { status: 400 }
      );
    }

    // Validate tx hash format based on chain
    if (chain === "base") {
      if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
        return NextResponse.json(
          { error: "Invalid transaction hash format" },
          { status: 400 }
        );
      }
    } else if (chain === "solana") {
      // Solana signatures are base58, typically 87-88 characters
      if (!/^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(txHash)) {
        return NextResponse.json(
          { error: "Invalid Solana signature format" },
          { status: 400 }
        );
      }
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
    // Verify transaction based on chain
    let verifyResult: {
      amount: number;
      fromAddress: string;
      tokenSymbol: string;
      solAmount?: number;
      solPrice?: number;
    } | null;

    if (chain === "solana") {
      verifyResult = await verifySolanaTransaction(txHash);
    } else {
      verifyResult = await verifyBaseTransaction(txHash);
    }

    if (!verifyResult) {
      return NextResponse.json(
        { error: "No supported transfer to platform wallet found in transaction" },
        { status: 400 }
      );
    }

    const { amount: usdAmount, fromAddress, tokenSymbol, solAmount, solPrice } = verifyResult;

    // Validate amount is reasonable (within 1% of expected)
    if (expectedAmount) {
      const tolerance = expectedAmount * 0.01;
      if (Math.abs(usdAmount - expectedAmount) > tolerance) {
        console.warn(
          `[Crypto Deposit] Amount mismatch: expected ${expectedAmount}, got ${usdAmount}`
        );
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
      `[Crypto Deposit] Processing: $${usdAmount.toFixed(2)} ${tokenSymbol}${solAmount ? ` (${solAmount.toFixed(4)} SOL @ $${solPrice?.toFixed(2)})` : ""} on ${chain} from ${fromAddress} for user ${user.id}`
    );

    // Credit the user's balance
    await creditCash(user.id, usdAmount);
    console.log(`[Crypto Deposit] creditCash succeeded`);

    // Record the transaction with tx hash for idempotency
    await recordTransaction(user.id, usdAmount, "deposit", {
      type: "crypto",
      tx_hash: txHash,
      from_address: fromAddress,
      chain,
      token: tokenSymbol,
      ...(solAmount && { sol_amount: solAmount }),
      ...(solPrice && { sol_price: solPrice }),
    });
    console.log(`[Crypto Deposit] recordTransaction succeeded`);

    // Try to credit first deposit bonus
    try {
      const bonusResult = await creditFirstDepositBonus(
        user.id,
        usdAmount,
        undefined,
        undefined,
        `crypto:${txHash}`
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
