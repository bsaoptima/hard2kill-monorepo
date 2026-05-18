"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MatchState } from "@/lib/match";

export type MatchStateResult =
  | { kind: "loading" }
  | { kind: "ok"; state: MatchState; opponentOnline: boolean }
  | { kind: "error"; error: string };

/**
 * Realtime-driven match state. Subscribes to:
 * - postgres_changes UPDATE on geostakes_matches → refetches /api/match/[id]
 * - presence sync → tracks whether the opponent is currently connected
 *
 * The actual match data is always read through the API (which goes through
 * getMatchState and respects the location-leak protection). Realtime is just
 * the bell that says "something changed, ask the server."
 */
export function useMatchState(matchId: string): MatchStateResult {
  const [result, setResult] = useState<MatchStateResult>({ kind: "loading" });
  const stateRef = useRef<MatchState | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let alive = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function fetchState(): Promise<MatchState | null> {
      try {
        const res = await fetch(`/api/match/${matchId}`, { cache: "no-store" });
        if (!alive) return null;
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setResult({
            kind: "error",
            error: body?.error ?? `HTTP ${res.status}`,
          });
          return null;
        }
        const state = (await res.json()) as MatchState;
        if (!alive) return null;
        stateRef.current = state;
        setResult((prev) => ({
          kind: "ok",
          state,
          opponentOnline:
            prev.kind === "ok" ? prev.opponentOnline : true,
        }));
        return state;
      } catch (err) {
        if (!alive) return null;
        setResult({
          kind: "error",
          error: err instanceof Error ? err.message : "Network error",
        });
        return null;
      }
    }

    function recomputePresence() {
      if (!alive || !stateRef.current || !channel) return;
      const ps = channel.presenceState();
      const all = Object.values(ps).flat() as Array<{ user_id?: string }>;
      const opponentOnline = all.some(
        (u) => u.user_id === stateRef.current!.opponentId,
      );
      setResult((prev) =>
        prev.kind === "ok" ? { ...prev, opponentOnline } : prev,
      );
    }

    (async () => {
      const initial = await fetchState();
      if (!initial || !alive) return;

      channel = supabase
        .channel(`match:${matchId}`, {
          config: { presence: { key: initial.yourId } },
        })
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "geostakes_matches",
            filter: `id=eq.${matchId}`,
          },
          () => {
            void fetchState();
          },
        )
        .on("presence", { event: "sync" }, recomputePresence)
        .on("presence", { event: "join" }, recomputePresence)
        .on("presence", { event: "leave" }, recomputePresence)
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED" && alive && channel) {
            await channel.track({
              user_id: initial.yourId,
              online_at: new Date().toISOString(),
            });
          }
        });
    })();

    return () => {
      alive = false;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [matchId]);

  return result;
}
