"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TestPairForm() {
  const router = useRouter();
  const [opponentId, setOpponentId] = useState("");
  const [betAmount, setBetAmount] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/match/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opponentId: opponentId.trim(),
          betAmount: Number(betAmount),
          currency: "cash",
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error ?? `HTTP ${res.status}`);
        return;
      }
      router.push(`/match/${body.matchId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="opponentId">Opponent user ID</Label>
        <Input
          id="opponentId"
          value={opponentId}
          onChange={(e) => setOpponentId(e.target.value)}
          placeholder="UUID — pull from /api/admin/users"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="betAmount">Bet amount (USD)</Label>
        <Input
          id="betAmount"
          type="number"
          min="1"
          step="1"
          value={betAmount}
          onChange={(e) => setBetAmount(e.target.value)}
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading || !opponentId.trim()}
        className="bg-primary text-primary-foreground p-3 rounded-sm text-sm font-bold uppercase tracking-[0.1em] disabled:opacity-50"
      >
        {loading ? "Creating…" : "Create match → /match/[id]"}
      </button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
