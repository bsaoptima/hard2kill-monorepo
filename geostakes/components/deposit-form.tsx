"use client";

import { useState } from "react";
import { toast } from "sonner";

const QUICK_AMOUNTS = [5, 10, 20, 50, 100, 250];
const MIN_DEPOSIT = 1;
const MAX_DEPOSIT = 5000;

export function DepositForm() {
  const [amount, setAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const numericAmount = Number(amount);
  const isValid =
    Number.isFinite(numericAmount) &&
    numericAmount >= MIN_DEPOSIT &&
    numericAmount <= MAX_DEPOSIT;
  const canSubmit = isValid && !submitting;

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

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl text-base font-bold uppercase tracking-[0.04em] disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-105 hover:-translate-y-px transition-all"
      >
        {submitting
          ? "Redirecting to Stripe…"
          : `Deposit $${(numericAmount || 0).toFixed(2)} via Stripe`}
      </button>

      <div className="text-[11px] text-muted-foreground font-mono leading-relaxed pt-2 border-t border-border">
        Payments handled by Stripe. Card details never touch Geostakes
        servers. Funds appear in your balance within seconds of payment
        confirmation.
      </div>
    </div>
  );
}
