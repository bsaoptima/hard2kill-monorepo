"use client";

import { useRouter } from "next/navigation";

interface WelcomeCompleteModalProps {
  balance: { cash: number; bonus: number; total: number };
  onContinue?: () => void;
}

export function WelcomeCompleteModal({ balance, onContinue }: WelcomeCompleteModalProps) {
  const router = useRouter();

  const goToDeposit = () => {
    router.push("/deposit");
  };

  const goHome = () => {
    router.push("/");
  };

  const hasBalance = balance.total > 0;

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center px-4"
      style={{
        background: "rgba(5,6,8,0.92)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--line-2)] rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-8 pb-4 text-center">
          <h2
            className="text-2xl sm:text-3xl font-bold"
            style={{
              fontFamily: "var(--font-anton), Anton, sans-serif",
              fontStyle: "italic",
            }}
          >
            Free plays complete!
          </h2>
          <p className="mt-2 text-muted-foreground">
            You played all 5 free rounds
          </p>
        </div>

        {/* Balance display */}
        <div className="px-6 pb-4">
          <div className="bg-[var(--background)] rounded-xl p-4 text-center">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono mb-1">
              Your balance
            </div>
            <div
              className="text-4xl font-bold tabular-nums"
              style={{
                fontFamily: "var(--font-anton), Anton, sans-serif",
                fontStyle: "italic",
                color: hasBalance ? "var(--primary)" : "var(--foreground)",
              }}
            >
              ${balance.total.toFixed(2)}
            </div>
            {balance.cash > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                ${balance.cash.toFixed(2)} withdrawable
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="px-6 pb-4">
          <p className="text-sm text-muted-foreground text-center">
            {hasBalance
              ? "Deposit to keep playing and unlock all locations."
              : "Deposit to keep playing and unlock all locations."}
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex flex-col gap-2">
          <button
            onClick={goToDeposit}
            className="w-full bg-primary text-primary-foreground px-5 py-3.5 rounded-xl font-bold uppercase tracking-wide transition-all hover:brightness-105 cursor-pointer"
            style={{
              fontFamily: "var(--font-anton), Anton, sans-serif",
              fontStyle: "italic",
              fontSize: "16px",
              letterSpacing: "0.03em",
            }}
          >
            Deposit to Keep Playing
          </button>
          {hasBalance && onContinue && (
            <button
              onClick={onContinue}
              className="w-full bg-[var(--background)] text-foreground border border-[var(--line-2)] px-5 py-3.5 rounded-xl font-bold uppercase tracking-wide transition-all hover:bg-[var(--line-2)] cursor-pointer"
              style={{
                fontFamily: "var(--font-anton), Anton, sans-serif",
                fontStyle: "italic",
                fontSize: "14px",
                letterSpacing: "0.03em",
              }}
            >
              Keep Playing (${balance.total.toFixed(2)} left)
            </button>
          )}
          <button
            onClick={goHome}
            className="w-full text-muted-foreground hover:text-foreground py-2 text-sm transition-colors cursor-pointer"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
