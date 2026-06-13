"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { StreetViewCoords } from "@/components/match/street-view-coords";
import { GuessMap } from "@/components/match/guess-map";
import { ResultMap } from "@/components/match/result-map";

const ROUND_DURATION_SEC = 25;
const INTRO_DURATION_MS = 2500;

type Location = {
  locationId: string;
  lat: number;
  lng: number;
  label: string;
};

type RoundResult = {
  distanceKm: number;
  multiplier: number;
  payout: number;
  profitLoss: number;
  actualLocation: { lat: number; lng: number };
  balance: { cash: number; bonus: number; total: number };
};

type Phase = "intro" | "playing" | "result";

export function SoloPlayRoom() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stakeFromUrl = Number(searchParams.get("stake")) || 5;

  const [phase, setPhase] = useState<Phase>("intro");
  const [stake] = useState<number>(stakeFromUrl);
  const [location, setLocation] = useState<Location | null>(null);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION_SEC);
  const [roundStartedAt, setRoundStartedAt] = useState<Date | null>(null);
  const [lastGuess, setLastGuess] = useState<{ lat: number; lng: number } | null>(null);
  const [balance, setBalance] = useState<{
    cash: number;
    bonus: number;
    total: number;
  } | null>(null);
  const [sessionPL, setSessionPL] = useState(0);
  const [isFirstRound, setIsFirstRound] = useState(true);

  // Fetch balance on mount
  useEffect(() => {
    fetchBalance();
  }, []);

  // Auto-start after intro animation AND balance is loaded (first round only)
  useEffect(() => {
    if (phase === "intro" && balance !== null) {
      const timer = setTimeout(() => {
        startRound();
      }, INTRO_DURATION_MS);
      return () => clearTimeout(timer);
    }
  }, [phase, balance]);

  async function fetchBalance() {
    const res = await fetch("/api/balance");
    if (res.ok) {
      const data = await res.json();
      setBalance(data);
    }
  }

  async function startRound() {
    if (balance === null || balance.total < stake) {
      toast.error("Insufficient balance");
      router.push("/deposit");
      return;
    }

    const res = await fetch("/api/solo/start-round", {
      method: "POST",
    });

    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed to start round");
      router.push("/");
      return;
    }

    const loc: Location = await res.json();
    console.log('[startRound] Received location:', loc);
    setLocation(loc);
    setPhase("playing");
    setRoundStartedAt(new Date());
    setTimeLeft(ROUND_DURATION_SEC);
  }

  async function submitGuess(guess: { lat: number; lng: number }) {
    if (!location) {
      console.error('[submitGuess] No location set');
      return;
    }

    // Store the guess for result display
    setLastGuess(guess);

    const payload = {
      locationId: location.locationId,
      guessLat: guess.lat,
      guessLng: guess.lng,
      stake,
    };

    console.log('[submitGuess] Sending:', payload);

    const res = await fetch("/api/solo/submit-guess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed to submit guess");
      return;
    }

    const roundResult: RoundResult = await res.json();
    setResult(roundResult);
    setBalance(roundResult.balance);
    setSessionPL((prev) => prev + roundResult.profitLoss);
    setPhase("result");
  }

  // Timer countdown
  useEffect(() => {
    if (phase !== "playing" || !roundStartedAt) return;

    const tick = () => {
      const elapsed = (Date.now() - roundStartedAt.getTime()) / 1000;
      const remaining = Math.max(0, Math.ceil(ROUND_DURATION_SEC - elapsed));
      setTimeLeft(remaining);

      // Auto-submit with 0,0 guess if time runs out
      if (remaining === 0 && location) {
        submitGuess({ lat: 0, lng: 0 });
      }
    };

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [phase, roundStartedAt, location]);

  async function resetForNextRound() {
    setIsFirstRound(false);
    setLocation(null);
    setResult(null);
    setRoundStartedAt(null);
    setTimeLeft(ROUND_DURATION_SEC);
    setLastGuess(null);

    // Immediately start next round without intro
    await startRound();
  }

  if (phase === "intro" && isFirstRound) {
    return <IntroScreen stake={stake} />;
  }

  if (phase === "playing" && location) {
    return (
      <PlayingScreen
        location={location}
        timeLeft={timeLeft}
        onSubmitGuess={submitGuess}
        balance={balance}
        stake={stake}
      />
    );
  }

  if (phase === "result" && result && location && lastGuess) {
    return (
      <div className="h-screen w-full relative">
        {/* Background street view (blurred) */}
        <div className="absolute inset-0 blur-sm">
          <StreetViewCoords lat={location.lat} lng={location.lng} />
        </div>

        {/* Result overlay */}
        <ResultScreen
          result={result}
          location={location}
          stake={stake}
          onPlayAgain={resetForNextRound}
          sessionPL={sessionPL}
          guess={lastGuess}
        />
      </div>
    );
  }

  return <div>Loading...</div>;
}

// =========================================================================
// IntroScreen - Minimalist animated explainer
// =========================================================================
function IntroScreen({ stake }: { stake: number }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 1, 100));
    }, INTRO_DURATION_MS / 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[var(--background)] text-foreground p-8">
      <div className="max-w-md w-full space-y-12 text-center">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold">Solo Mode</h1>
          <p className="text-xl text-muted-foreground">
            The closer you guess, the more you earn
          </p>
        </div>

        {/* Loading progress */}
        <div className="space-y-3">
          <div className="h-1 bg-[var(--line-2)] rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-75"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-muted-foreground">
            Starting round · ${stake} stake
          </p>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// PlayingScreen
// =========================================================================
function PlayingScreen({
  location,
  timeLeft,
  onSubmitGuess,
  balance,
  stake,
}: {
  location: Location;
  timeLeft: number;
  onSubmitGuess: (guess: { lat: number; lng: number }) => void;
  balance: { cash: number; bonus: number; total: number } | null;
  stake: number;
}) {
  const danger = timeLeft <= 10;

  return (
    <div className="h-screen w-full flex flex-col bg-[var(--background)] relative">
      {/* HUD */}
      <div className="flex justify-between items-center px-3 sm:px-6 py-3 sm:py-4 bg-[var(--bg-card)] border-b border-[var(--line-2)] z-10">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-1 h-10 sm:h-12 bg-primary" />
          <div>
            <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider font-mono mb-0.5">Stake</div>
            <div className="font-bold text-lg sm:text-2xl tabular-nums text-primary">${stake}</div>
          </div>
        </div>
        <div className="text-center">
          <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider font-mono mb-0.5">Time</div>
          <div
            className={`font-bold text-3xl sm:text-4xl tabular-nums ${danger ? "text-red-500 animate-pulse" : ""}`}
          >
            {timeLeft}s
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div>
            <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider font-mono mb-0.5 text-right">Balance</div>
            <div className="font-bold text-lg sm:text-2xl tabular-nums text-right">${balance?.total.toFixed(2) ?? "0.00"}</div>
          </div>
          <div className="w-1 h-10 sm:h-12 bg-[var(--line-2)]" />
        </div>
      </div>

      {/* Street View with overlay guess map */}
      <div className="flex-1 relative">
        <StreetViewCoords lat={location.lat} lng={location.lng} />
        <GuessMap
          disabled={timeLeft === 0}
          onSubmit={onSubmitGuess}
        />
      </div>
    </div>
  );
}

// =========================================================================
// ResultScreen
// =========================================================================
function ResultScreen({
  result,
  location,
  stake,
  onPlayAgain,
  sessionPL,
  guess,
}: {
  result: RoundResult;
  location: Location;
  stake: number;
  onPlayAgain: () => void;
  sessionPL: number;
  guess: { lat: number; lng: number };
}) {
  const won = result.profitLoss > 0;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center px-3 sm:px-0" style={{ background: "rgba(5,6,8,0.78)", backdropFilter: "blur(8px)" }}>
      {/* Result card */}
      <div className="w-full max-w-[720px] mx-auto bg-[var(--bg-card)] border border-[var(--line-2)] rounded-[20px] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)]">
        {/* Result map */}
        <div className="relative w-full" style={{ aspectRatio: "2/1" }}>
          <ResultMap
            yourGuess={guess}
            opponentGuess={null}
            truth={result.actualLocation}
          />
        </div>

        {/* Result body */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-5 px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex-1">
            <div className="font-mono text-[9px] sm:text-[10px] tracking-widest uppercase" style={{ color: "var(--ink-3)" }}>
              You were
            </div>
            <div className="mt-1 tabular-nums" style={{ fontFamily: "var(--font-anton), Anton, sans-serif", fontStyle: "italic", fontSize: "32px", lineHeight: "1" }} className="sm:text-[40px]">
              {result.distanceKm.toFixed(1)} km
            </div>
            <div className="mt-2 font-mono text-xs" style={{ color: "var(--ink-2)" }}>
              {location.label} · {result.multiplier}x multiplier
            </div>
          </div>

          <div className="text-left sm:text-right self-start sm:self-auto">
            <div className="font-mono text-[9px] sm:text-[10px] tracking-widest uppercase" style={{ color: "var(--ink-3)" }}>
              {won ? "Round won" : "Round lost"}
            </div>
            <div
              className="mt-1 tabular-nums"
              style={{
                fontFamily: "var(--font-anton), Anton, sans-serif",
                fontStyle: "italic",
                fontSize: "36px",
                lineHeight: "1",
                color: won ? "var(--primary)" : "var(--destructive)",
              }}
            >
              <span className="sm:text-[44px]">
                {won ? `+$${result.payout.toFixed(2)}` : `−$${stake.toFixed(2)}`}
              </span>
            </div>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex gap-2.5 px-4 sm:px-6 pb-4 sm:pb-6">
          <button
            onClick={onPlayAgain}
            className="flex-1 bg-primary text-primary-foreground border-0 px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl font-bold uppercase tracking-wide transition-all hover:brightness-105 cursor-pointer"
            style={{ fontFamily: "var(--font-anton), Anton, sans-serif", fontStyle: "italic", fontSize: "14px", letterSpacing: "0.03em" }}
          >
            <span className="sm:text-[16px]">Play Again · ${stake} →</span>
          </button>
        </div>
      </div>
    </div>
  );
}
