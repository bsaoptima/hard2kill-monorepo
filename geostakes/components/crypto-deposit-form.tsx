"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAppKit, useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Wallet, ExternalLink, AlertCircle, CheckCircle2 } from "lucide-react";
import { USDC_ADDRESS, usdcAbi, parseUsdc, formatUsdc } from "@/lib/contracts/usdc";
import { PLATFORM_WALLET_ADDRESS } from "@/lib/wagmi";
import { DepositMatchBanner } from "./deposit-match-banner";
import { Gift } from "lucide-react";

const QUICK_AMOUNTS = [5, 10, 20, 50, 100, 250];
const MIN_DEPOSIT = 1;
const MAX_DEPOSIT = 5000;
const MAX_BONUS = 10;
const BASE_CHAIN_ID = 8453;

function calculateBonus(depositAmount: number): number {
  if (depositAmount <= 0) return 0;
  const bonus = depositAmount * 1.0; // 100% match
  return Math.min(bonus, MAX_BONUS);
}

export function CryptoDepositForm() {
  const [amount, setAmount] = useState<string>("");
  const [bonusEligible, setBonusEligible] = useState<boolean | null>(null);
  const [crediting, setCrediting] = useState(false);

  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();

  // Read user's USDC balance
  const { data: usdcBalance, refetch: refetchBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: usdcAbi,
    functionName: "balanceOf",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address },
  });

  // Write contract for transfer
  const {
    data: txHash,
    error: writeError,
    isPending: isWriting,
    writeContract,
    reset: resetWrite,
  } = useWriteContract();

  // Wait for transaction confirmation
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError,
  } = useWaitForTransactionReceipt({ hash: txHash });

  // Check bonus eligibility on mount
  useEffect(() => {
    checkBonusEligibility();
  }, []);

  // Handle transaction confirmation - credit balance
  useEffect(() => {
    if (isConfirmed && txHash && !crediting) {
      creditBalance(txHash);
    }
  }, [isConfirmed, txHash]);

  async function checkBonusEligibility() {
    try {
      const res = await fetch("/api/bonus/eligibility");
      if (res.ok) {
        const data = await res.json();
        setBonusEligible(data.eligible);
      }
    } catch (error) {
      console.error("Failed to check bonus eligibility:", error);
    }
  }

  async function creditBalance(hash: string) {
    setCrediting(true);
    try {
      const res = await fetch("/api/crypto/deposit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ txHash: hash, expectedAmount: numericAmount }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to credit balance");
        return;
      }

      toast.success(`$${data.credited.toFixed(2)} added to your balance!`);
      setAmount("");
      resetWrite();
      refetchBalance();
    } catch (error) {
      toast.error("Failed to credit balance. Please contact support.");
      console.error("Credit error:", error);
    } finally {
      setCrediting(false);
    }
  }

  const numericAmount = Number(amount);
  const walletBalance = usdcBalance ? formatUsdc(usdcBalance) : 0;
  const isValid =
    Number.isFinite(numericAmount) &&
    numericAmount >= MIN_DEPOSIT &&
    numericAmount <= MAX_DEPOSIT &&
    numericAmount <= walletBalance;
  const isWrongNetwork = isConnected && chainId !== BASE_CHAIN_ID;
  const canSubmit = isValid && isConnected && !isWriting && !isConfirming && !crediting && !isWrongNetwork;

  const bonusAmount = bonusEligible ? calculateBonus(numericAmount) : 0;
  const totalAmount = numericAmount + bonusAmount;

  function handleDeposit() {
    if (!canSubmit || !address) return;

    writeContract({
      address: USDC_ADDRESS,
      abi: usdcAbi,
      functionName: "transfer",
      args: [PLATFORM_WALLET_ADDRESS as `0x${string}`, parseUsdc(numericAmount)],
    });
  }

  // Show connect wallet state
  if (!isConnected) {
    return (
      <div className="space-y-4">
        {bonusEligible && <DepositMatchBanner />}

        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div className="text-center py-8">
            <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Connect your wallet to deposit USDC directly from your crypto wallet.
            </p>
            <button
              onClick={() => open()}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-xl text-base font-bold uppercase tracking-[0.04em] hover:brightness-105 hover:-translate-y-px transition-all"
            >
              Connect Wallet
            </button>
          </div>

          <div className="text-[11px] text-muted-foreground font-mono leading-relaxed pt-4 border-t border-border">
            Deposit USDC on Base network. Funds appear in your balance within seconds
            of blockchain confirmation. No intermediaries.
          </div>
        </div>
      </div>
    );
  }

  // Wrong network warning
  if (isWrongNetwork) {
    return (
      <div className="space-y-4">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Wrong Network</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Please switch to Base network to deposit USDC.
            </p>
            <button
              onClick={() => open({ view: "Networks" })}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-xl text-base font-bold uppercase tracking-[0.04em] hover:brightness-105 hover:-translate-y-px transition-all"
            >
              Switch to Base
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bonusEligible && <DepositMatchBanner />}

      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        {/* Connected Wallet Info */}
        <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Connected</div>
              <div className="font-mono text-sm">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">USDC Balance</div>
            <div className="font-bold tabular-nums">${walletBalance.toFixed(2)}</div>
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-mono mb-2">
            Amount (USDC)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
              $
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="1"
              min={MIN_DEPOSIT}
              max={Math.min(MAX_DEPOSIT, walletBalance)}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              disabled={isWriting || isConfirming || crediting}
              className="w-full bg-background border border-border pl-9 pr-4 py-3 text-xl font-bold tabular-nums rounded-lg focus:border-primary outline-none disabled:opacity-50"
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-[11px] text-muted-foreground font-mono">
              Min ${MIN_DEPOSIT}, max ${Math.min(MAX_DEPOSIT, walletBalance).toLocaleString()}
            </span>
            {numericAmount > walletBalance && (
              <span className="text-[11px] text-red-500 font-mono">Insufficient balance</span>
            )}
          </div>
        </div>

        {/* Quick Amounts */}
        <div>
          <label className="block text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-mono mb-2">
            Quick amounts
          </label>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_AMOUNTS.filter((a) => a <= walletBalance).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAmount(String(a))}
                disabled={isWriting || isConfirming || crediting}
                className={`py-2.5 rounded-lg text-base font-bold tabular-nums border transition-colors disabled:opacity-50 ${
                  numericAmount === a
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-foreground border-border hover:border-muted-foreground"
                }`}
              >
                ${a}
              </button>
            ))}
          </div>
        </div>

        {/* Bonus Calculator */}
        {bonusEligible && numericAmount > 0 && (
          <div className="rounded-lg bg-green-500/5 border border-green-500/20 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-green-500 mb-3">
              <Gift className="w-4 h-4" />
              <span>First Deposit Bonus</span>
            </div>

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Your deposit:</span>
                <span className="font-bold tabular-nums">${numericAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-500 font-medium">100% match bonus:</span>
                <span className="font-bold tabular-nums text-green-500">
                  +${bonusAmount.toFixed(2)}
                </span>
              </div>
              <div className="h-px bg-border my-2"></div>
              <div className="flex justify-between text-base">
                <span className="font-semibold">Total to play with:</span>
                <span className="font-bold tabular-nums text-primary">
                  ${totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Status */}
        {txHash && (
          <div className={`rounded-lg p-4 ${isConfirmed ? "bg-green-500/10 border border-green-500/20" : "bg-blue-500/10 border border-blue-500/20"}`}>
            <div className="flex items-center gap-2 mb-2">
              {isConfirming ? (
                <>
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium text-blue-500">Confirming transaction...</span>
                </>
              ) : isConfirmed ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-green-500">
                    {crediting ? "Crediting balance..." : "Transaction confirmed!"}
                  </span>
                </>
              ) : null}
            </div>
            <a
              href={`https://basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-mono"
            >
              {txHash.slice(0, 10)}...{txHash.slice(-8)}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Error Display */}
        {(writeError || confirmError) && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
            <div className="flex items-center gap-2 text-red-500 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{writeError?.message || confirmError?.message || "Transaction failed"}</span>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleDeposit}
          disabled={!canSubmit}
          className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl text-base font-bold uppercase tracking-[0.04em] disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-105 hover:-translate-y-px transition-all"
        >
          {isWriting
            ? "Confirm in wallet..."
            : isConfirming
            ? "Confirming..."
            : crediting
            ? "Crediting balance..."
            : bonusEligible && bonusAmount > 0
            ? `Deposit $${numericAmount.toFixed(2)} → Get $${totalAmount.toFixed(2)}`
            : `Deposit $${(numericAmount || 0).toFixed(2)} USDC`}
        </button>

        <div className="text-[11px] text-muted-foreground font-mono leading-relaxed pt-2 border-t border-border">
          Direct USDC transfer on Base network. Funds appear in your balance within
          seconds of blockchain confirmation. No intermediaries, no fees beyond gas.
        </div>
      </div>
    </div>
  );
}
