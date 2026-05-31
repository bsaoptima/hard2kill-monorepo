"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { SeedPlayState } from "@/lib/seeds";
import { useSeedPlayState } from "@/lib/use-seed-play-state";
import { StreetView } from "@/components/match/street-view";
import { GuessMap } from "@/components/match/guess-map";
import { ResultMap } from "@/components/match/result-map";

const ROUND_DURATION_SEC = 25;

type Phase = "playing" | "roundResult" | "waiting" | "resolved";

export function SeedPlayRoom({
  playId,
  initialState,
}: {
  playId: string;
  initialState: SeedPlayState;
}) {
  const { state, refetch, ...rest } =
    useSeedPlayState(playId, initialState) as unknown as {
      kind: "ok";
      state: SeedPlayState;
      refetch: () => Promise<void>;
    };

  const result = rest as unknown as { kind: "loading" | "ok" | "error" };
  const s: SeedPlayState = result.kind === "ok" ? state : initialState;

  const lastCompleted = s.completedRounds[s.completedRounds.length - 1];
  // Show the per-round result screen when the user has just submitted (or
  // had the round auto-zeroed) but hasn't yet clicked Continue. The
  // server keeps current_round fixed until next-round is called, so the
  // round under review is current_round itself — we stay on this screen
  // until that flips, which avoids briefly remounting PlayingScreen with
  // stale round-1 props (wrong panoId / disabled map closure).
  const justFinishedRound =
    lastCompleted &&
    (s.yourPlayComplete
      ? lastCompleted.roundNumber === 5 && !s.resolution && !s.waitingForOpponent
      : s.yourSubmittedThisRound &&
        lastCompleted.roundNumber === s.currentRound)
      ? lastCompleted
      : null;

  const phase: Phase = s.resolution
    ? "resolved"
    : s.waitingForOpponent
      ? "waiting"
      : justFinishedRound
        ? "roundResult"
        : "playing";

  const yourRunningScore = useMemo(
    () =>
      s.completedRounds.reduce(
        (sum, r) => sum + (r.yourGuess?.points ?? 0),
        0,
      ),
    [s.completedRounds],
  );

  if (phase === "resolved" && s.resolution) {
    return (
      <ResolutionScreen
        state={s}
        yourScore={s.resolution.yourScore}
        opponentScore={s.resolution.opponentScore}
        youWon={s.resolution.youWon}
        payout={s.resolution.payout}
      />
    );
  }

  if (phase === "waiting") {
    return (
      <WaitingScreen
        betAmount={s.betAmount}
        yourScore={s.yourTotalScore ?? 0}
      />
    );
  }

  if (phase === "roundResult" && justFinishedRound) {
    return (
      <RoundResultScreen
        round={justFinishedRound}
        roundNumber={justFinishedRound.roundNumber}
        isLastRound={justFinishedRound.roundNumber === 5}
        playId={playId}
        onContinue={async () => {
          await refetch();
        }}
      />
    );
  }

  // phase === "playing"
  return (
    <PlayingScreen
      state={s}
      yourRunningScore={yourRunningScore}
      onGuessSubmitted={() => {
        void refetch();
      }}
    />
  );
}

// =========================================================================
// PlayingScreen — street view + guess map + HUD
// =========================================================================
function PlayingScreen({
  state,
  yourRunningScore,
  onGuessSubmitted,
}: {
  state: SeedPlayState;
  yourRunningScore: number;
  onGuessSubmitted: () => void;
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

  async function submitGuess(g: { lat: number; lng: number }) {
    const res = await fetch(`/api/seeds/plays/${state.playId}/guess`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ guessLat: g.lat, guessLng: g.lng }),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body?.error ?? "Submit failed");
      return;
    }
    onGuessSubmitted();
  }

  return (
    <div className="absolute inset-0">
      <StreetView panoId={state.currentLocationPanoId} />

      {/* HUD top-right — matches pot card height & value size */}
      <div className="absolute top-4 right-4 z-10 bg-black/70 text-white rounded-sm px-5 py-4 backdrop-blur ring-1 ring-white/10">
        <div className="flex gap-7 items-center">
          <HudSection
            label="Round"
            value={`${state.currentRound}/5`}
          />
          <HudSection
            label="Time"
            value={`0:${timeLeft.toString().padStart(2, "0")}`}
            danger={danger}
          />
          <HudSection label="Score" value={yourRunningScore.toLocaleString()} />
        </div>
      </div>

      {/* Pot value — big green prize on the left HUD */}
      <div className="absolute top-4 left-4 z-10 bg-black/70 text-white rounded-sm px-5 py-4 backdrop-blur ring-1 ring-[#39ff14]/30">
        <div className="text-[11px] uppercase tracking-[0.14em] text-white/60">
          {state.role === "challenger" ? "Pot you're chasing" : "Pot in play"}
        </div>
        <div className="text-4xl font-extrabold tabular-nums text-[#39ff14] leading-none mt-1.5">
          ${state.betAmount * 2}
        </div>
        <div className="text-[12px] text-white/70 mt-2">
          {state.role === "challenger"
            ? "Beat their score to win"
            : "Set the target for the next player"}
        </div>
      </div>

      <GuessMap disabled={state.yourSubmittedThisRound} onSubmit={submitGuess} />
    </div>
  );
}

function HudSection({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/60">
        {label}
      </div>
      <div
        className={`text-4xl font-extrabold tabular-nums leading-none mt-1.5 ${
          danger ? "text-red-400" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

// =========================================================================
// RoundResultScreen — between-round interstitial
// =========================================================================
function RoundResultScreen({
  round,
  roundNumber,
  isLastRound,
  playId,
  onContinue,
}: {
  round: SeedPlayState["completedRounds"][number];
  roundNumber: number;
  isLastRound: boolean;
  playId: string;
  onContinue: () => Promise<void> | void;
}) {
  const [advancing, setAdvancing] = useState(false);

  const advance = async () => {
    if (advancing) return;
    setAdvancing(true);
    try {
      const res = await fetch(`/api/seeds/plays/${playId}/next-round`, {
        method: "POST",
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body?.error ?? "Failed to continue");
        return;
      }
      // Wait for the refetch to land so PlayingScreen mounts with the
      // fresh round-N+1 state (correct panoId, disabled=false).
      await onContinue();
    } finally {
      setAdvancing(false);
    }
  };

  const fmtDistance = (m: number) => {
    if (m < 1000) return `${Math.round(m)} m`;
    const km = m / 1000;
    if (km < 100) return `${km.toFixed(1)} km`;
    return `${Math.round(km).toLocaleString()} km`;
  };

  return (
    <div className="absolute inset-0">
      <ResultMap
        yourGuess={
          round.yourGuess
            ? { lat: round.yourGuess.lat, lng: round.yourGuess.lng }
            : null
        }
        opponentGuess={null}
        truth={round.truth}
      />

      {/* Floating glass card with the round result */}
      <div className="absolute inset-x-0 bottom-8 z-10 flex justify-center px-4 pointer-events-none">
        <div
          className="pointer-events-auto relative w-full max-w-[520px] rounded-3xl border border-white/10 backdrop-blur-xl backdrop-saturate-150 px-8 py-7 flex flex-col items-center gap-4 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.75)]"
          style={{
            background:
              "linear-gradient(180deg, rgba(20,20,28,0.55) 0%, rgba(10,10,14,0.7) 100%)",
          }}
        >
          {/* Subtle accent glow at the top, matches the hero glass card */}
          <div
            className="pointer-events-none absolute inset-0 rounded-3xl"
            style={{
              background:
                "radial-gradient(80% 60% at 50% 0%, rgba(57,255,20,0.12), transparent 70%)",
            }}
          />

          <div className="relative text-[12px] uppercase tracking-[0.14em] text-white/60">
            Round {roundNumber} result
          </div>
          <div className="relative text-6xl font-extrabold tabular-nums text-white leading-none">
            {round.yourGuess?.points.toLocaleString() ?? 0}
          </div>
          <div className="relative text-sm text-white/70 text-center">
            {round.yourGuess
              ? `You were ${fmtDistance(round.yourGuess.distanceMeters)} from the target`
              : "No guess submitted"}
          </div>
          <button
            type="button"
            onClick={() => void advance()}
            disabled={advancing}
            className="relative mt-1 bg-primary text-primary-foreground border-none px-8 py-3 rounded-sm text-sm font-bold uppercase tracking-[0.1em] disabled:opacity-60"
          >
            {advancing ? "…" : `${isLastRound ? "See result" : "Continue"} →`}
          </button>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// WaitingScreen — creator finished, no challenger yet
// =========================================================================
function WaitingScreen({
  betAmount,
  yourScore,
}: {
  betAmount: number;
  yourScore: number;
}) {
  return (
    <div className="max-w-[520px] w-full mx-auto px-8 py-16 text-center">
      <div className="text-[12px] uppercase tracking-wider text-muted-foreground mb-3">
        Pot open
      </div>
      <div className="text-5xl font-extrabold mb-2">${betAmount * 2 * 0.9}</div>
      <div className="text-sm text-muted-foreground mb-8">
        Winner takes (your ${betAmount} stake matched, minus 10% rake)
      </div>

      <div className="bg-card rounded-sm p-6 mb-6">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
          Your score
        </div>
        <div className="text-3xl font-bold tabular-nums mb-4">
          {yourScore.toLocaleString()}
        </div>
        <div className="text-[13px] text-muted-foreground">
          Your seed is now in the pool. The next player at $
          {betAmount} whose skill matches yours will play these same 5
          locations. You&apos;ll be notified once it&apos;s resolved.
        </div>
      </div>

      <div className="text-[12px] text-muted-foreground mb-6">
        If no one plays within 48 hours, your ${betAmount} is refunded
        automatically.
      </div>

      <Link
        href="/"
        className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-sm text-sm font-bold uppercase tracking-[0.1em]"
      >
        Back to lobby
      </Link>
    </div>
  );
}

// =========================================================================
// ResolutionScreen — final result
// =========================================================================
function ResolutionScreen({
  state,
  yourScore,
  opponentScore,
  youWon,
  payout,
}: {
  state: SeedPlayState;
  yourScore: number;
  opponentScore: number;
  youWon: boolean | null;
  payout: number;
}) {
  const router = useRouter();
  // Refresh the server-rendered Header balance once the seed has resolved.
  // The win was credited server-side; this pulls the new number into the UI
  // without forcing the user to navigate.
  useEffect(() => {
    router.refresh();
  }, [router]);

  let banner: string;
  let bannerClass: string;
  if (youWon === null) {
    banner = "Tie — bet refunded";
    bannerClass = "text-muted-foreground";
  } else if (youWon) {
    banner = `You won $${payout.toFixed(2)}`;
    bannerClass = "text-[#39ff14]";
  } else {
    banner = `Opponent won $${(state.betAmount * 2 * 0.9).toFixed(2)}`;
    bannerClass = "text-primary";
  }

  const allRounds = state.completedRounds.map((r) => ({
    truth: r.truth,
    yourGuess: r.yourGuess
      ? { lat: r.yourGuess.lat, lng: r.yourGuess.lng }
      : null,
    opponentGuess: null,
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
      <div className="bg-card p-8 flex flex-col items-center justify-center gap-3">
        <div className={`text-3xl font-extrabold ${bannerClass}`}>{banner}</div>
        <div className="flex gap-12 mt-2">
          <div className="text-center">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              You
            </div>
            <div className="text-3xl font-bold tabular-nums">
              {yourScore.toLocaleString()}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Opponent
            </div>
            <div className="text-3xl font-bold tabular-nums">
              {opponentScore.toLocaleString()}
            </div>
          </div>
        </div>
        <Link
          href="/"
          className="mt-3 bg-primary text-primary-foreground px-6 py-3 rounded-sm text-sm font-bold uppercase tracking-[0.1em]"
        >
          Play again
        </Link>
      </div>
    </div>
  );
}
