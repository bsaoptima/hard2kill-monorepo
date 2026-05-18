"use client";

import { useEffect } from "react";
import { ResultMap } from "@/components/match/result-map";
import type { RoundResult as RoundResultType } from "@/lib/match";

const YOU_COLOR = "#ff2e2e";
const OPPONENT_COLOR = "#3aa0ff";

function fmtDistance(meters: number): string {
  const km = meters / 1000;
  if (km < 1) return `${Math.round(meters)} m`;
  if (km < 100) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString()} km`;
}

/**
 * Geohub-style split layout: ResultMap fills the screen, StandardResults
 * card pinned at the bottom (~250px). Replaces the modal pattern.
 */
export function RoundResultLayout({
  result,
  isLastRound,
  onContinue,
}: {
  result: RoundResultType;
  isLastRound: boolean;
  onContinue: () => void;
}) {
  // Space/Enter advances, mirroring geohub.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        onContinue();
      }
    };
    document.addEventListener("keydown", handler, { once: true });
    return () => document.removeEventListener("keydown", handler);
  }, [onContinue]);

  return (
    <div className="absolute inset-0 grid grid-rows-[1fr_250px]">
      <ResultMap
        yourGuess={
          result.yourGuess
            ? { lat: result.yourGuess.lat, lng: result.yourGuess.lng }
            : null
        }
        opponentGuess={
          result.opponentGuess
            ? { lat: result.opponentGuess.lat, lng: result.opponentGuess.lng }
            : null
        }
        truth={result.truth}
      />

      <div className="flex items-center justify-center p-6 bg-gradient-to-t from-black via-[#08080891] to-transparent border-t border-white/5">
        <div className="w-full max-w-3xl flex flex-col items-center gap-4">
          <div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            Round {result.roundNumber}
          </div>

          <div className="flex items-stretch gap-8 sm:gap-16">
            <PlayerScore
              label="You"
              color={YOU_COLOR}
              points={result.yourGuess?.points ?? 0}
              distanceMeters={result.yourGuess?.distanceMeters ?? null}
            />
            <PlayerScore
              label="Opponent"
              color={OPPONENT_COLOR}
              points={result.opponentGuess?.points ?? 0}
              distanceMeters={result.opponentGuess?.distanceMeters ?? null}
            />
          </div>

          <button
            type="button"
            onClick={onContinue}
            className="bg-primary text-primary-foreground border-none px-8 py-3 rounded-full text-sm font-bold uppercase tracking-[0.1em] hover:opacity-90"
          >
            {isLastRound ? "View final results" : "Next round"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlayerScore({
  label,
  color,
  points,
  distanceMeters,
}: {
  label: string;
  color: string;
  points: number;
  distanceMeters: number | null;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full"
          style={{ background: color }}
        />
        <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="text-3xl font-bold tabular-nums mt-1 text-foreground">
        {points.toLocaleString()}
      </div>
      <div className="text-xs text-muted-foreground tabular-nums">
        {distanceMeters !== null ? fmtDistance(distanceMeters) : "no guess"}
      </div>
    </div>
  );
}
