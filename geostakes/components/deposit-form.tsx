"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { DepositMatchBanner } from "./deposit-match-banner";
import { Gift } from "lucide-react";

const QUICK_AMOUNTS = [5, 10, 20, 50, 100, 250];
const MIN_DEPOSIT = 1;
const MAX_DEPOSIT = 5000;
const MAX_BONUS = 10;

function calculateBonus(depositAmount: number): number {
  if (depositAmount <= 0) return 0;
  const bonus = depositAmount * 1.0; // 100% match
  return Math.min(bonus, MAX_BONUS);
}

export function DepositForm() {
  const [amount, setAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [bonusEligible, setBonusEligible] = useState<boolean | null>(null);

  useEffect(() => {
    checkBonusEligibility();
  }, []);

  async function checkBonusEligibility() {
    try {
      const res = await fetch('/api/bonus/eligibility');
      if (res.ok) {
        const data = await res.json();
        setBonusEligible(data.eligible);
      }
    } catch (error) {
      console.error('Failed to check bonus eligibility:', error);
    }
  }

  const numericAmount = Number(amount);
  const isValid =
    Number.isFinite(numericAmount) &&
    numericAmount >= MIN_DEPOSIT &&
    numericAmount <= MAX_DEPOSIT;
  const canSubmit = isValid && !submitting;

  const bonusAmount = bonusEligible ? calculateBonus(numericAmount) : 0;
  const totalAmount = numericAmount + bonusAmount;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount: numericAmount }),
        cache: "no-store",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.url) {
        toast.error(body?.error ?? "Could not start checkout");
        setSubmitting(false);
        return;
      }
      // Redirect to Stripe Checkout
      window.location.href = body.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Bonus Banner */}
      {bonusEligible && <DepositMatchBanner />}

      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        {/* Amount */}
        <div>
        <label className="block text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-mono mb-2">
          Amount (USD)
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
            max={MAX_DEPOSIT}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full bg-background border border-border pl-9 pr-4 py-3 text-xl font-bold tabular-nums rounded-lg focus:border-primary outline-none"
          />
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-[11px] text-muted-foreground font-mono">
            Min ${MIN_DEPOSIT}, max ${MAX_DEPOSIT.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Quick amounts */}
      <div>
        <label className="block text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-mono mb-2">
          Quick amounts
        </label>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAmount(String(a))}
              className={`py-2.5 rounded-lg text-base font-bold tabular-nums border transition-colors ${
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

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl text-base font-bold uppercase tracking-[0.04em] disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-105 hover:-translate-y-px transition-all"
      >
        {submitting
          ? "Redirecting to Stripe…"
          : bonusEligible && bonusAmount > 0
          ? `Deposit $${numericAmount.toFixed(2)} → Get $${totalAmount.toFixed(2)}`
          : `Deposit $${(numericAmount || 0).toFixed(2)} via Stripe`}
      </button>

      <div className="text-[11px] text-muted-foreground font-mono leading-relaxed pt-2 border-t border-border">
        Payments handled by Stripe. Card details never touch Geostakes
        servers. Funds appear in your balance within seconds of payment
        confirmation.
      </div>
      </div>
    </div>
  );
}
