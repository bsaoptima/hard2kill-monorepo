"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const BET_AMOUNTS_CASH = [1, 5, 10];

export function MatchPanel() {
  const router = useRouter();
  const [bet, setBet] = useState<number>(5);
  const [submitting, setSubmitting] = useState(false);

  async function play() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/seeds/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ betAmount: bet }),
        cache: "no-store",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body?.error ?? "Could not start play");
        return;
      }
      if (body?.role === "challenger") {
        toast.success(`Joining an open pot of $${bet * 2}`);
      } else {
        toast.success("Opening a new pot — set the target");
      }
      router.push(`/play/${body.playId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-card p-8 rounded-sm mb-6">
      <div className="text-[22px] font-extrabold mb-1">Geostakes</div>
      <div className="text-[13px] text-muted-foreground mb-6">
        5 rounds · 60 seconds each · winner takes the pot
      </div>

      <div className="flex gap-2 mb-4">
        {BET_AMOUNTS_CASH.map((b) => (
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
            ${b}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={play}
        disabled={submitting}
        className="w-full bg-primary text-primary-foreground border-none p-4 rounded-sm text-sm font-extrabold uppercase tracking-[0.1em] mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Starting..." : `Play for $${bet}`}
      </button>

      <div className="text-center mt-4 text-muted-foreground text-[13px]">
        You play 5 rounds solo. The next player at this tier whose skill
        matches yours plays the same locations — winner takes the pot
        (minus 10% rake).
      </div>
    </div>
  );
}
