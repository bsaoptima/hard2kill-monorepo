"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { MatchState } from "@/lib/match";
import { useMatchState } from "@/lib/use-match-state";
import { StreetView } from "@/components/match/street-view";
import { GuessMap } from "@/components/match/guess-map";
import { GameStatus } from "@/components/match/game-status";
import { RoundResultLayout } from "@/components/match/round-result";
import { MatchResultLayout } from "@/components/match/match-result";

type Phase = "game" | "roundResult" | "finalResult";

const FORFEIT_GRACE_MS = 30_000;

export function MatchRoom({
  matchId,
  initialState,
}: {
  matchId: string;
  initialState: MatchState;
}) {
  const polled = useMatchState(matchId);
  const state: MatchState =
    polled.kind === "ok" ? polled.state : initialState;
  const opponentOnline = polled.kind === "ok" ? polled.opponentOnline : true;

  const [dismissedRound, setDismissedRound] = useState(0);
  const [forfeitCountdown, setForfeitCountdown] = useState<number | null>(null);
  const forfeitFiredRef = useRef(false);

  const justFinishedRound = useMemo(() => {
    if (state.status !== "active") return null;
    if (state.completedRounds.length === 0) return null;
    const last = state.completedRounds[state.completedRounds.length - 1];
    if (last.roundNumber <= dismissedRound) return null;
    if (last.roundNumber !== state.currentRound - 1) return null;
    return last;
  }, [state, dismissedRound]);

  const yourTotal = useMemo(
    () =>
      state.completedRounds.reduce(
        (s, r) => s + (r.yourGuess?.points ?? 0),
        0,
      ),
    [state.completedRounds],
  );
  const opponentTotal = useMemo(
    () =>
      state.completedRounds.reduce(
        (s, r) => s + (r.opponentGuess?.points ?? 0),
        0,
      ),
    [state.completedRounds],
  );

  const phase: Phase =
    state.status === "settled"
      ? "finalResult"
      : justFinishedRound
        ? "roundResult"
        : "game";

  // Auto-forfeit if opponent is offline. Server enforces a 90s gameplay
  // floor, so the worst case is the call gets rejected and we show a toast.
  useEffect(() => {
    if (state.status !== "active") {
      setForfeitCountdown(null);
      return;
    }
    if (opponentOnline) {
      setForfeitCountdown(null);
      forfeitFiredRef.current = false;
      return;
    }

    const start = Date.now();
    setForfeitCountdown(Math.ceil(FORFEIT_GRACE_MS / 1000));

    const tick = setInterval(() => {
      const remainingMs = FORFEIT_GRACE_MS - (Date.now() - start);
      if (remainingMs <= 0) {
        setForfeitCountdown(0);
        clearInterval(tick);
      } else {
        setForfeitCountdown(Math.ceil(remainingMs / 1000));
      }
    }, 250);

    const trigger = setTimeout(async () => {
      if (forfeitFiredRef.current) return;
      forfeitFiredRef.current = true;
      try {
        const res = await fetch(`/api/match/${matchId}/forfeit`, {
          method: "POST",
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(body?.error ?? "Couldn't forfeit");
          forfeitFiredRef.current = false;
        }
      } catch {
        forfeitFiredRef.current = false;
      }
    }, FORFEIT_GRACE_MS);

    return () => {
      clearInterval(tick);
      clearTimeout(trigger);
    };
  }, [opponentOnline, state.status, matchId]);

  async function submitGuess({ lat, lng }: { lat: number; lng: number }) {
    try {
      const res = await fetch(`/api/match/${matchId}/guess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body?.error ?? "Could not submit guess");
        return;
      }
      toast.success(`+${body.points} pts`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error");
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background">
      {phase === "game" ? (
        <>
          <StreetView panoId={state.currentLocationPanoId} />
          <GameStatus
            state={state}
            yourTotal={yourTotal}
            opponentTotal={opponentTotal}
          />
          <GuessMap
            disabled={state.currentRoundSubmissions.you}
            onSubmit={submitGuess}
          />
          {!opponentOnline && forfeitCountdown !== null ? (
            <div className="absolute top-5 left-1/2 -translate-x-1/2 z-30 bg-primary text-primary-foreground px-4 py-2 rounded-sm text-sm font-bold uppercase tracking-[0.06em] flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse" />
              Opponent disconnected — forfeit in {forfeitCountdown}s
            </div>
          ) : null}
        </>
      ) : null}

      {phase === "roundResult" && justFinishedRound ? (
        <RoundResultLayout
          result={justFinishedRound}
          isLastRound={justFinishedRound.roundNumber === 5}
          onContinue={() => setDismissedRound(justFinishedRound.roundNumber)}
        />
      ) : null}

      {phase === "finalResult" ? <MatchResultLayout state={state} /> : null}
    </div>
  );
}
