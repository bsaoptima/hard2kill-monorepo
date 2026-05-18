"use client";

import { useState } from "react";

type Currency = "cash" | "coins";
const BET_AMOUNTS_CASH = [1, 5, 10];
const BET_AMOUNTS_COINS = [10, 50, 100];

export function MatchPanel() {
  const [currency, setCurrency] = useState<Currency>("cash");
  const [bet, setBet] = useState<number>(5);

  const betOptions = currency === "cash" ? BET_AMOUNTS_CASH : BET_AMOUNTS_COINS;

  return (
    <div className="bg-card p-8 rounded-sm mb-6">
      <div className="text-[22px] font-extrabold mb-1">Geostakes 1v1</div>
      <div className="text-[13px] text-muted-foreground mb-6">
        5 rounds · 60 seconds each · winner takes the pot
      </div>

      <div className="flex mb-6 border-b border-border">
        {(["cash", "coins"] as Currency[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              setCurrency(c);
              setBet(c === "cash" ? 5 : 50);
            }}
            className={`bg-transparent border-none px-6 py-2.5 cursor-pointer text-[13px] font-semibold uppercase tracking-[0.04em] border-b-2 -mb-px ${
              currency === c
                ? "text-foreground border-primary"
                : "text-muted-foreground border-transparent"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        {betOptions.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => setBet(b)}
            className={`flex-1 px-3 py-3 rounded-sm cursor-pointer text-sm font-bold tabular-nums border transition-colors ${
              bet === b
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-foreground border-border hover:border-muted-foreground"
            }`}
          >
            {currency === "cash" ? `$${b}` : `${b} coins`}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled
        className="w-full bg-primary text-primary-foreground border-none p-4 rounded-sm text-sm font-extrabold uppercase tracking-[0.1em] mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Find Match
      </button>

      <div className="text-center mt-4 text-muted-foreground text-[13px]">
        Matchmaking ships in Sprint 3
      </div>
    </div>
  );
}
