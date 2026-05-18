"use client";

import { useEffect, useRef, useState } from "react";
import type { SeedPlayState } from "@/lib/seeds";

export type SeedPlayStateResult =
  | { kind: "loading" }
  | { kind: "ok"; state: SeedPlayState }
  | { kind: "error"; error: string };

/**
 * Polling hook for an async seed play. No realtime — async play means
 * only one user is acting at a time, so server-state changes are
 * predictable around our own actions. We poll on a relaxed cadence to
 * catch round-timer expiry, opponent join (creator's view), and
 * resolution. Callers can also imperatively refetch (e.g. after submit).
 *
 * Cadence:
 *   - Actively playing rounds → 3s
 *   - Waiting for opponent (creator finished, status='open') → 15s
 *   - Resolved → no further polling
 */
export function useSeedPlayState(
  playId: string,
  initialState: SeedPlayState,
): SeedPlayStateResult & { refetch: () => Promise<void> } {
  const [result, setResult] = useState<SeedPlayStateResult>({
    kind: "ok",
    state: initialState,
  });
  const aliveRef = useRef(true);

  const refetch = async () => {
    try {
      const res = await fetch(`/api/seeds/plays/${playId}`, {
        cache: "no-store",
      });
      if (!aliveRef.current) return;
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setResult({
          kind: "error",
          error: body?.error ?? `HTTP ${res.status}`,
        });
        return;
      }
      const state = (await res.json()) as SeedPlayState;
      if (!aliveRef.current) return;
      setResult({ kind: "ok", state });
    } catch (err) {
      if (!aliveRef.current) return;
      setResult({
        kind: "error",
        error: err instanceof Error ? err.message : "Network error",
      });
    }
  };

  useEffect(() => {
    aliveRef.current = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function schedule() {
      if (!aliveRef.current) return;
      const cur = result;
      if (cur.kind !== "ok") {
        timer = setTimeout(loop, 3000);
        return;
      }
      const s = cur.state;
      if (s.resolution) return; // done
      const delay = s.waitingForOpponent ? 15_000 : 3000;
      timer = setTimeout(loop, delay);
    }

    async function loop() {
      await refetch();
      schedule();
    }

    schedule();

    return () => {
      aliveRef.current = false;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playId, result.kind === "ok" ? result.state.status : "loading"]);

  return { ...result, refetch };
}
