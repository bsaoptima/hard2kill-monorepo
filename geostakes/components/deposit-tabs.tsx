"use client";

import { useState } from "react";
import { CreditCard, Wallet } from "lucide-react";
import { DepositForm } from "./deposit-form";
import { CryptoDepositForm } from "./crypto-deposit-form";

type DepositMethod = "card" | "crypto";

export function DepositTabs() {
  const [method, setMethod] = useState<DepositMethod>("crypto");

  return (
    <div className="space-y-6">
      {/* Method Toggle */}
      <div className="flex gap-2 p-1 bg-card border border-border rounded-xl">
        <button
          onClick={() => setMethod("crypto")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
            method === "crypto"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Wallet className="w-4 h-4" />
          Crypto
        </button>
        <button
          onClick={() => setMethod("card")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
            method === "card"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Card (Stripe)
        </button>
      </div>

      {/* Form Content */}
      {method === "crypto" ? <CryptoDepositForm /> : <DepositForm />}
    </div>
  );
}
