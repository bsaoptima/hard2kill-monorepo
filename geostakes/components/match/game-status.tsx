"use client";

import { useEffect, useState } from "react";
import type { MatchState } from "@/lib/match";

const ROUND_DURATION_SEC = 60;

function formatTimer(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Top-right HUD. Mirrors geohub/components/GameStatus styling
 * (translucent black box, separated sections with small label + bigger value).
 * Adapted for 1v1: Round / Time / You / Opponent.
 */
export function GameStatus({
  state,
  yourTotal,
  opponentTotal,
}: {
  state: MatchState;
  yourTotal: number;
  opponentTotal: number;
}) {
  const [timeLeft, setTimeLeft] = useState(() =>
    Math.max(
      0,
      Math.ceil(
        ROUND_DURATION_SEC -
          (Date.now() - new Date(state.roundStartedAt).getTime()) / 1000,
      ),
    ),
  );

  useEffect(() => {
    const tick = () => {
      const elapsed =
        (Date.now() - new Date(state.roundStartedAt).getTime()) / 1000;
      setTimeLeft(Math.max(0, Math.ceil(ROUND_DURATION_SEC - elapsed)));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [state.roundStartedAt]);

  const danger = timeLeft <= 10;

  return (
    <div className="absolute top-5 right-5 z-30 flex items-stretch bg-black/80 rounded-sm border border-[#0e0e0e] text-base font-normal">
      <Section label="Round" value={`${state.currentRound} / 5`} />
      <Section
        label="Time"
        value={
          <span
            className={`font-mono text-lg tabular-nums ${
              danger ? "text-primary" : ""
            }`}
          >
            {formatTimer(timeLeft)}
          </span>
        }
      />
      <Section
        label="You"
        value={
          <span className="text-[#39ff14] tabular-nums">{yourTotal}</span>
        }
      />
      <Section
        label="Opponent"
        value={
          <SubmitMarker
            score={opponentTotal}
            submitted={state.currentRoundSubmissions.opponent}
          />
        }
      />
    </div>
  );
}

function Section({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="px-6 py-2.5">
      <div className="text-[11px] text-muted-foreground mb-1.5 uppercase tracking-[0.04em]">
        {label}
      </div>
      <div>{value}</div>
    </div>
  );
}

function SubmitMarker({
  score,
  submitted,
}: {
  score: number;
  submitted: boolean;
}) {
  return (
    <div className="flex items-center gap-2 tabular-nums">
      <span
        className={`inline-block w-2 h-2 rounded-full ${
          submitted ? "bg-[#3aa0ff]" : "bg-muted-foreground"
        }`}
        title={submitted ? "Submitted this round" : "Still guessing"}
      />
      <span>{score}</span>
    </div>
  );
}
