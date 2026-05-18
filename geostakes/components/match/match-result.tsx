"use client";

import Link from "next/link";
import { ResultMap } from "@/components/match/result-map";
import type { MatchState } from "@/lib/match";

const YOU_COLOR = "#ff2e2e";
const OPPONENT_COLOR = "#3aa0ff";

export function MatchResultLayout({ state }: { state: MatchState }) {
  if (!state.finalResult) return null;

  const { winnerId, yourTotalPoints, opponentTotalPoints, payout } =
    state.finalResult;
  const youWon = winnerId === state.yourId;
  const tie = winnerId === null;

  let bannerText: string;
  let bannerClass: string;
  if (tie) {
    bannerText = `Tie — bet refunded`;
    bannerClass = "text-muted-foreground";
  } else if (youWon) {
    bannerText = `You won $${payout.toFixed(2)}`;
    bannerClass = "text-[#39ff14]";
  } else {
    bannerText = `Opponent won $${payout.toFixed(2)}`;
    bannerClass = "text-primary";
  }

  const allRounds = state.completedRounds.map((r) => ({
    truth: r.truth,
    yourGuess: r.yourGuess
      ? { lat: r.yourGuess.lat, lng: r.yourGuess.lng }
      : null,
    opponentGuess: r.opponentGuess
      ? { lat: r.opponentGuess.lat, lng: r.opponentGuess.lng }
      : null,
  }));

  return (
    <div className="absolute inset-0 grid grid-rows-[1fr_280px]">
      <ResultMap
        yourGuess={null}
        opponentGuess={null}
        truth={{ lat: 0, lng: 0 }}
        showAllRounds
        allRounds={allRounds}
      />

      <div className="flex items-center justify-center p-6 bg-gradient-to-t from-black via-[#08080891] to-transparent border-t border-white/5">
        <div className="w-full max-w-3xl flex flex-col items-center gap-4">
          <div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            Match complete
          </div>

          <div className={`text-3xl font-extrabold ${bannerClass}`}>
            {bannerText}
          </div>

          <div className="flex items-stretch gap-12 sm:gap-20">
            <PlayerTotal
              label="You"
              color={YOU_COLOR}
              points={yourTotalPoints}
            />
            <PlayerTotal
              label="Opponent"
              color={OPPONENT_COLOR}
              points={opponentTotalPoints}
            />
          </div>

          <Link
            href="/"
            className="bg-primary text-primary-foreground px-8 py-3 rounded-full text-sm font-bold uppercase tracking-[0.1em] hover:opacity-90"
          >
            Back to lobby
          </Link>
        </div>
      </div>
    </div>
  );
}

function PlayerTotal({
  label,
  color,
  points,
}: {
  label: string;
  color: string;
  points: number;
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
      <div className="text-4xl font-bold tabular-nums mt-1 text-foreground">
        {points.toLocaleString()}
      </div>
    </div>
  );
}
