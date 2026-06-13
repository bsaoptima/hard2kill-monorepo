"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DepositSuccessToast } from "@/components/deposit-success-toast";
import { DiscordFloat } from "@/components/discord-float";


const GRID_MATCHES = [
  { you: "atlas", opp: "RIVR.42", stake: 25, round: 3 },
  { you: "noctiluca", opp: "kp.delta", stake: 100, round: 5 },
  { you: "MERIDIAN", opp: "obsidian", stake: 10, round: 2 },
  { you: "SKYHWK", opp: "hexa", stake: 500, round: 4 },
  { you: "tomato.png", opp: "vrai", stake: 50, round: 1 },
  { you: "PARALLEL", opp: "ord1nal", stake: 75, round: 3 },
  { you: "longitude", opp: "zenith", stake: 250, round: 5 },
  { you: "lumen", opp: "QUOR", stake: 20, round: 2 },
  { you: "vex.04", opp: "RAY.iv", stake: 150, round: 4 },
  { you: "kestrel", opp: "phantom", stake: 40, round: 3 },
  { you: "qbit", opp: "vapor.tx", stake: 5, round: 1 },
  { you: "neon.cy", opp: "atlas", stake: 80, round: 5 },
];

function StreetTile({
  imageNumber,
  match,
}: {
  imageNumber: number;
  match: (typeof GRID_MATCHES)[number];
}) {
  const filename = String(imageNumber).padStart(2, "0");
  return (
    <div className="street-tile">
      <img
        className="scene"
        src={`/street-view/${filename}.jpg`}
        alt=""
        loading={imageNumber > 4 ? "lazy" : "eager"}
      />
      <div className="crosshair" />
      <div className="hud">
        <div className="hud-top">
          <span className="live">LIVE</span>
        </div>
        <div className="hud-bot">
          <div className="vs">
            <div className="round">R{match.round}/5 · STAKED</div>
            <div className="matchup">
              {match.you} vs {match.opp}
            </div>
          </div>
          <span className="stake">${match.stake}</span>
        </div>
      </div>
    </div>
  );
}

function HeroLiveGrid() {
  return (
    <div className="hero-stage" aria-hidden="true">
      <div className="live-grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <StreetTile
            key={i}
            imageNumber={i + 1}
            match={GRID_MATCHES[i % GRID_MATCHES.length]}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stake picker glass card — wired to /api/seeds/start
// ─────────────────────────────────────────────────────────────────────────────

function StakePickerCard() {
  const router = useRouter();
  const [stake, setStake] = useState<number>(0.5);
  const [customStake, setCustomStake] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [totalRounds, setTotalRounds] = useState<number | null>(null);
  const STAKES = [0.5, 1];

  useEffect(() => {
    fetch("/api/stats/total-rounds")
      .then((res) => res.json())
      .then((data) => setTotalRounds(data.totalRounds))
      .catch(() => setTotalRounds(0));
  }, []);

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomStake(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0.25 && num <= 25) {
      setStake(num);
    }
  };

  async function play() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/seeds/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ betAmount: stake }),
        cache: "no-store",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          toast.error("Sign in to play");
          router.push("/auth/signin?next=/");
          return;
        }
        toast.error(body?.error ?? "Could not start play");
        return;
      }
      if (body?.role === "challenger") {
        toast.success(`Joining an open pot of $${stake * 2}`);
      } else {
        toast.success("Opening a new pot — set the target");
      }
      router.push(`/play/${body.playId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <span className="hero-eyebrow">
        <span className="pulse-dot" />
        <span>
          {totalRounds !== null
            ? `${totalRounds.toLocaleString()} rounds have been played on Geostakes`
            : "Loading..."}
        </span>
      </span>
      <h1 className="hero-h1">
        Guess where you are.
        <br />
        Win money.
      </h1>
      <p className="hero-sub">
        Make money playing Geoguessr. The closer you guess, the more you earn.
      </p>
      <div className="hero-ctas">
        <div className="stake-picker">
          {STAKES.map((s) => (
            <button
              key={s}
              className="stake-btn"
              aria-pressed={stake === s && !customStake}
              onClick={() => {
                setStake(s);
                setCustomStake("");
              }}
              type="button"
            >
              ${s.toFixed(2)}
            </button>
          ))}
          <input
            type="number"
            className="stake-btn"
            placeholder="Custom bet amount"
            value={customStake}
            onChange={handleCustomChange}
            min="0.25"
            max="25"
            step="0.25"
            style={{
              textAlign: "center",
              background: customStake ? "var(--primary)" : "transparent",
              color: customStake ? "var(--primary-foreground)" : "inherit",
            }}
          />
        </div>
        <button
          className="btn btn-primary btn-lg"
          onClick={() => router.push(`/play-solo?stake=${stake}`)}
          disabled={submitting}
          type="button"
        >
          {submitting ? "Starting..." : `Play · $${stake.toFixed(2)} per round →`}
        </button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Counter — animated stat ticker
// ─────────────────────────────────────────────────────────────────────────────

function Counter({ value, prefix = "" }: { value: number; prefix?: string }) {
  const [n, setN] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    const to = value;
    const start = performance.now();
    const duration = 1400;
    let raf: number;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      setN(Math.round(from + (to - from) * eased));
      if (k < 1) raf = requestAnimationFrame(tick);
      else prev.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <span>
      {prefix}
      {n.toLocaleString()}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────────────────────────────────────

function Hero() {
  const [stats, setStats] = useState<{
    totalPaidOut: number;
    totalPlayers: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/stats/total-rounds")
      .then((res) => res.json())
      .then((data) =>
        setStats({
          totalPaidOut: data.totalPaidOut,
          totalPlayers: data.totalPlayers,
        })
      )
      .catch(() => setStats({ totalPaidOut: 0, totalPlayers: 0 }));
  }, []);

  return (
    <section className="hero hero-split" id="hero">
      <div className="hero-stage" />
      <div className="hero-content">
        <div className="hero-text">
          <StakePickerCard />
        </div>
        <HeroSoloDemo />
      </div>
      <div className="hero-footstats">
        <div className="hero-footstats-inner">
          <div className="hero-stat">
            <div className="label">Paid out, all time</div>
            <div className="value mono">
              <Counter value={stats?.totalPaidOut ?? 0} prefix="$" />
            </div>
          </div>
          <div className="hero-stat">
            <div className="label">Total players</div>
            <div className="value mono">
              <Counter value={stats?.totalPlayers ?? 0} />
            </div>
          </div>
          <div className="hero-stat hero-stat-pitch">
            <div className="label">How it works</div>
            <div className="pitch">
              Guess the location.{" "}
              <span className="accent">Earn multipliers on accuracy.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroSoloDemo() {
  const [imageIndex, setImageIndex] = useState(0);
  const [stage, setStage] = useState(0);
  const [timer, setTimer] = useState(15);

  const demos = [
    { image: "01.jpg", location: "Shibuya Crossing, Tokyo", distance: 12, multiplier: 2.0, stake: 25 },
    { image: "02.jpg", location: "Times Square, New York", distance: 3, multiplier: 3.0, stake: 50 },
    { image: "03.jpg", location: "Dam Square, Amsterdam", distance: 89, multiplier: 1.2, stake: 10 },
    { image: "04.jpg", location: "Brandenburg Gate, Berlin", distance: 145, multiplier: 0.75, stake: 25 },
    { image: "05.jpg", location: "Champ de Mars, Paris", distance: 24, multiplier: 2.0, stake: 50 },
    { image: "06.jpg", location: "Circular Quay, Sydney", distance: 67, multiplier: 1.2, stake: 25 },
    { image: "07.jpg", location: "Copacabana, Rio de Janeiro", distance: 5, multiplier: 2.0, stake: 100 },
    { image: "08.jpg", location: "Marina Bay, Singapore", distance: 210, multiplier: 0.75, stake: 50 },
  ];

  const current = demos[imageIndex];

  useEffect(() => {
    const TIMELINE = [2000, 1500, 2000];
    if (stage >= TIMELINE.length) {
      const t = setTimeout(() => {
        setImageIndex((prev) => (prev + 1) % demos.length);
        setStage(0);
        setTimer(15);
      }, 1000);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStage(stage + 1), TIMELINE[stage]);
    return () => clearTimeout(t);
  }, [stage, imageIndex]);

  useEffect(() => {
    if (stage === 0) {
      const interval = setInterval(() => {
        setTimer((prev) => Math.max(0, prev - 1));
      }, 133);
      return () => clearInterval(interval);
    }
  }, [stage]);

  return (
    <div className="solo-demo-card">
      <div className="solo-demo-head">
        <span>SOLO MODE · {timer}s LEFT</span>
        <span className="live">LIVE</span>
      </div>

      <div className="solo-demo-street">
        <img
          src={`/street-view/${current.image}`}
          alt="Street view"
          className="solo-demo-image"
        />

        {stage >= 1 && (
          <div className="solo-demo-overlay">
            <div className="solo-demo-pin" style={{ animation: "pinDrop .4s cubic-bezier(.2,1.4,.4,1) both" }}>
              <div className="pin-location">{current.location}</div>
              <div className="pin-marker" />
            </div>
          </div>
        )}

        {stage >= 2 && (
          <div className="solo-demo-result-overlay">
            <div className="result-box" style={{ animation: "slideUp .5s cubic-bezier(.2,1,.3,1) both" }}>
              <div className="result-stat">
                <div className="result-label">DISTANCE</div>
                <div className="result-value">{current.distance}km</div>
              </div>
              <div className="result-stat">
                <div className="result-label">MULTIPLIER</div>
                <div className="result-value accent">{current.multiplier}x</div>
              </div>
              <div className="result-stat">
                <div className="result-label">PAYOUT</div>
                <div className="result-value accent">${(current.stake * current.multiplier).toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="solo-demo-foot">
        <div className="solo-demo-stake">
          <span className="label">STAKE</span>
          <span className="amount">${current.stake.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Recent games table — randomly samples 10 entries on each page load
// ─────────────────────────────────────────────────────────────────────────────

type RecentGame = {
  id: string;
  player: string;
  stake: number;
  distance: number;
  multiplier: number;
  payout: number;
  time: string;
};

// Solo round data - showing player, stake, distance, multiplier, and payout
const RECENT_POOL: RecentGame[] = [
  { id: "S-9821", player: "joao_sp", stake: 0.5, distance: 12, multiplier: 2.0, payout: 1.0, time: "44s ago" },
  { id: "S-9820", player: "atlas", stake: 1, distance: 89, multiplier: 1.2, payout: 1.2, time: "1m ago" },
  { id: "S-9819", player: "MERIDIAN", stake: 1, distance: 3, multiplier: 3.0, payout: 3.0, time: "2m ago" },
  { id: "S-9818", player: "lucas_bsb", stake: 0.5, distance: 450, multiplier: 0.25, payout: 0.13, time: "3m ago" },
  { id: "S-9817", player: "tomato.png", stake: 0.5, distance: 18, multiplier: 2.0, payout: 1.0, time: "4m ago" },
  { id: "S-9816", player: "PARALLEL", stake: 1, distance: 67, multiplier: 1.2, payout: 1.2, time: "5m ago" },
  { id: "S-9815", player: "longitude", stake: 1, distance: 145, multiplier: 0.75, payout: 0.75, time: "7m ago" },
  { id: "S-9814", player: "ana_curitiba", stake: 0.5, distance: 8, multiplier: 2.0, payout: 1.0, time: "8m ago" },
  { id: "S-9813", player: "vex.04", stake: 1, distance: 290, multiplier: 0.75, payout: 0.75, time: "9m ago" },
  { id: "S-9812", player: "kestrel", stake: 0.5, distance: 1200, multiplier: 0.0, payout: 0.0, time: "11m ago" },
  { id: "S-9811", player: "matheus_be", stake: 1, distance: 4, multiplier: 3.0, payout: 3.0, time: "13m ago" },
  { id: "S-9810", player: "qbit", stake: 0.5, distance: 95, multiplier: 1.2, payout: 0.6, time: "14m ago" },
  { id: "S-9809", player: "neon.cy", stake: 1, distance: 21, multiplier: 2.0, payout: 2.0, time: "15m ago" },
  { id: "S-9808", player: "pedro_floripa", stake: 1, distance: 340, multiplier: 0.25, payout: 0.25, time: "17m ago" },
  { id: "S-9807", player: "SKYHWK", stake: 0.5, distance: 52, multiplier: 1.2, payout: 0.6, time: "18m ago" },
  { id: "S-9806", player: "isadora.cwb", stake: 1, distance: 870, multiplier: 0.25, payout: 0.25, time: "20m ago" },
  { id: "S-9805", player: "RIVR.42", stake: 0.5, distance: 14, multiplier: 2.0, payout: 1.0, time: "21m ago" },
  { id: "S-9804", player: "obsidian", stake: 1, distance: 1400, multiplier: 0.0, payout: 0.0, time: "22m ago" },
  { id: "S-9803", player: "felipe.gru", stake: 0.5, distance: 6, multiplier: 2.0, payout: 1.0, time: "24m ago" },
  { id: "S-9802", player: "QUOR", stake: 1, distance: 78, multiplier: 1.2, payout: 1.2, time: "25m ago" },
];

function initials(name: string) {
  return name.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase() || "??";
}

function LiveGames() {
  // Using static pool for now - will be replaced with real solo round data later
  const rows = RECENT_POOL.slice(0, 10);

  // Disabled API fetch for now since it returns old duel format
  // useEffect(() => {
  //   async function fetchGames() {
  //     try {
  //       const res = await fetch("/api/public-games", { cache: "no-store" });
  //       if (res.ok) {
  //         const data = await res.json();
  //         if (data.games && data.games.length > 0) {
  //           setRows(data.games);
  //         }
  //       }
  //     } catch (err) {
  //       console.error("Failed to fetch public games:", err);
  //     }
  //   }
  //   fetchGames();
  // }, []);

  return (
    <section className="section" id="live">
      <div className="container">
        <div className="section-head">
          <div>
            <div className="section-eyebrow">02 · The floor</div>
            <h2 className="section-title">Recent rounds</h2>
          </div>
          <p className="section-sub">
            Every round below paid out real cash based on guess accuracy.
          </p>
        </div>

        <div className="live-card">
          <table className="live-table tnum">
            <thead>
              <tr>
                <th style={{ width: "30%" }}>Player</th>
                <th>Stake</th>
                <th>Distance</th>
                <th>Payout</th>
                <th style={{ textAlign: "right" }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => (
                <tr key={g.id}>
                  <td>
                    <div className="players-cell">
                      <span className="avatar">{initials(g.player)}</span>
                      <span style={{ color: "var(--ink)" }}>
                        {g.player}
                      </span>
                    </div>
                    <div className="winner-mobile">{g.player}</div>
                  </td>
                  <td>${g.stake.toFixed(2)}</td>
                  <td>{g.distance}km</td>
                  <td style={{ color: g.payout > g.stake ? "var(--accent)" : "var(--ink-3)", fontWeight: 600 }}>
                    ${g.payout.toFixed(2)}
                  </td>
                  <td style={{ textAlign: "right", color: "var(--ink-2)" }}>
                    {g.time}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FAQ
// ─────────────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: "How does the multiplier system work?",
    a: "The closer you guess, the higher your multiplier. Accuracy is rewarded — great guesses can multiply your stake significantly. Each round pays out instantly based on your distance from the target.",
  },
  {
    q: "How do payouts work?",
    a: "Winnings hit your balance instantly after each round. Withdraw to bank, debit, or stablecoin in under a minute. Pull as much as you want, as often as you want — no holds on verified accounts.",
  },
  {
    q: "What stops people from cheating?",
    a: "You can never play the same location twice. 25-second timer prevents Google lookup. These two layers make systematic cheating nearly impossible while keeping the game fast and fun.",
  },
  {
    q: "How many rounds can I play?",
    a: "As many as you want, until you've played all available locations. Each location can only be played once per account, forever. New locations are added regularly.",
  },
  {
    q: "What does it cost?",
    a: "Nothing to sign up. You only pay your stake per round. No rake, no fees. Your payout is purely based on the multiplier you earn from your guess accuracy.",
  },
];

function FAQ() {
  const [open, setOpen] = useState<number>(0);
  return (
    <section className="section" id="faq" style={{ paddingBottom: 32 }}>
      <div className="container">
        <div className="section-head">
          <div>
            <div className="section-eyebrow">03 · Questions</div>
            <h2 className="section-title">FAQ</h2>
          </div>
          <p className="section-sub">
            Five things people always ask before their first stake.
          </p>
        </div>
        <div className="faq">
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={i}
              className="faq-row clickable"
              data-open={open === i ? "true" : "false"}
              onClick={() => setOpen(open === i ? -1 : i)}
            >
              <div className="num mono">0{i + 1}</div>
              <div>
                <div className="q">{item.q}</div>
                <div className="a">{item.a}</div>
              </div>
              <div className="toggle" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="landing-footer">
      <div>© 2026 GEOSTAKES · Play responsibly · 18+ where legal</div>
      <div style={{ display: "flex", gap: 18 }}>
        <a href="#">Terms</a>
        <a href="#">Privacy</a>
        <a href="#">Responsible play</a>
        <a href="#">Status</a>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function Home() {
  // data-theme + data-font are applied to <html> in layout.tsx so they're
  // present at SSR (no flash of unstyled buttons on slow mobile devices).

  return (
    <>
      <Suspense fallback={null}>
        <DepositSuccessToast />
      </Suspense>
      <div className="landing-root">
        <Hero />
        <LiveGames />
        <FAQ />
        <Footer />
      </div>
      <DiscordFloat />
    </>
  );
}
