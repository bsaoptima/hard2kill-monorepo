"use client";

import { useState } from "react";
import { toast } from "sonner";

const DEPOSIT_AMOUNTS = [5, 10, 20, 50];

export function DepositCard() {
  const [open, setOpen] = useState(false);
  const [loadingAmount, setLoadingAmount] = useState<number | null>(null);

  async function handleDeposit(amount: number) {
    setLoadingAmount(amount);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Could not start checkout");
        setLoadingAmount(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error");
      setLoadingAmount(null);
    }
  }

  return (
    <>
      <div className="bg-card p-5 rounded-sm">
        <div className="text-sm font-bold mb-1">Deposit</div>
        <div className="text-xs text-muted-foreground mb-3">
          Add real money to play cash matches
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full bg-transparent text-foreground border border-border px-3 py-2.5 rounded-sm text-[13px] cursor-pointer hover:border-muted-foreground transition-colors"
        >
          Deposit via Stripe
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-card p-8 rounded-sm min-w-[320px] max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-2">Deposit</h2>
            <p className="text-[13px] text-muted-foreground mb-5">
              Choose an amount. Stripe handles the payment.
            </p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {DEPOSIT_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleDeposit(amt)}
                  disabled={loadingAmount !== null}
                  className="bg-primary text-primary-foreground border-none p-4 rounded-sm cursor-pointer text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingAmount === amt ? "…" : `$${amt}`}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={loadingAmount !== null}
              className="w-full bg-transparent text-muted-foreground border border-border p-2.5 rounded-sm cursor-pointer text-[13px] disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
