"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DepositSuccessToast } from "@/components/deposit-success-toast";


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
  const [stake, setStake] = useState<number>(5);
  const [submitting, setSubmitting] = useState(false);
  const STAKES = [1, 5, 10];

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
    <div className="glass-card">
      <span className="hero-eyebrow">
        <span className="pulse-dot" />
        <span>Play Geoguessr for prizes</span>
      </span>
      <h1 className="hero-h1">
        Guess Where You Are.
        <br />
        Win Money.
      </h1>
      <div className="stake-picker">
        {STAKES.map((s) => (
          <button
            key={s}
            className="stake-btn"
            aria-pressed={stake === s}
            onClick={() => setStake(s)}
            type="button"
          >
            <span className="lbl">Stake</span>${s}
          </button>
        ))}
      </div>
      <button
        className="play-btn"
        onClick={play}
        disabled={submitting}
        type="button"
      >
        {submitting ? "Starting..." : `Play Now · $${stake}`}
      </button>
    </div>
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
  // Static starting values for now; bump these as real data accumulates.
  const stakes = 180;
  const totalPlayers = 14;

  return (
    <section className="hero hero-grid" id="hero">
      <HeroLiveGrid />
      <div className="hero-content">
        <StakePickerCard />
      </div>
      <div className="hero-footstats">
        <div className="hero-footstats-inner">
          <div className="hero-stat">
            <div className="label">Paid out, all time</div>
            <div className="value mono">
              <Counter value={stakes} prefix="$" />
            </div>
          </div>
          <div className="hero-stat">
            <div className="label">Total players</div>
            <div className="value mono">
              <Counter value={totalPlayers} />
            </div>
          </div>
          <div className="hero-stat hero-stat-pitch">
            <div className="label">How it works</div>
            <div className="pitch">
              Skill-based 1v1 wagering.{" "}
              <span className="accent">Closest pin takes the pot.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Recent games table — randomly samples 10 entries on each page load
// ─────────────────────────────────────────────────────────────────────────────

type RecentGame = {
  id: string;
  a: string;
  b: string;
  stake: number;
  pot: number;
  time: string;
  winner: string;
};

// Big pool — randomly sampled on mount so each visitor sees a different
// "recent" board. All stakes are $1/$5/$10 to match the actual product.
const RECENT_POOL: RecentGame[] = [
  { id: "G-9821", a: "joao_sp", b: "vitor.rio", stake: 5, pot: 9, time: "44s ago", winner: "joao_sp" },
  { id: "G-9820", a: "atlas", b: "noctiluca", stake: 10, pot: 18, time: "1m ago", winner: "noctiluca" },
  { id: "G-9819", a: "MERIDIAN", b: "kp.delta", stake: 10, pot: 18, time: "2m ago", winner: "MERIDIAN" },
  { id: "G-9818", a: "lucas_bsb", b: "marina.06", stake: 1, pot: 1.8, time: "3m ago", winner: "marina.06" },
  { id: "G-9817", a: "tomato.png", b: "vrai", stake: 5, pot: 9, time: "4m ago", winner: "tomato.png" },
  { id: "G-9816", a: "PARALLEL", b: "ord1nal", stake: 10, pot: 18, time: "5m ago", winner: "ord1nal" },
  { id: "G-9815", a: "longitude", b: "zenith", stake: 10, pot: 18, time: "7m ago", winner: "longitude" },
  { id: "G-9814", a: "ana_curitiba", b: "rafa.poa", stake: 5, pot: 9, time: "8m ago", winner: "ana_curitiba" },
  { id: "G-9813", a: "vex.04", b: "RAY.iv", stake: 5, pot: 9, time: "9m ago", winner: "RAY.iv" },
  { id: "G-9812", a: "kestrel", b: "phantom", stake: 1, pot: 1.8, time: "11m ago", winner: "kestrel" },
  { id: "G-9811", a: "matheus_be", b: "carol.ssa", stake: 10, pot: 18, time: "13m ago", winner: "carol.ssa" },
  { id: "G-9810", a: "qbit", b: "vapor.tx", stake: 1, pot: 1.8, time: "14m ago", winner: "qbit" },
  { id: "G-9809", a: "neon.cy", b: "atlas", stake: 5, pot: 9, time: "15m ago", winner: "atlas" },
  { id: "G-9808", a: "pedro_floripa", b: "bruno.df", stake: 10, pot: 18, time: "17m ago", winner: "pedro_floripa" },
  { id: "G-9807", a: "SKYHWK", b: "hexa", stake: 10, pot: 18, time: "18m ago", winner: "SKYHWK" },
  { id: "G-9806", a: "isadora.cwb", b: "thiago_rj", stake: 5, pot: 9, time: "20m ago", winner: "thiago_rj" },
  { id: "G-9805", a: "RIVR.42", b: "SKYHWK", stake: 5, pot: 9, time: "21m ago", winner: "RIVR.42" },
  { id: "G-9804", a: "obsidian", b: "lumen", stake: 1, pot: 1.8, time: "22m ago", winner: "lumen" },
  { id: "G-9803", a: "felipe.gru", b: "naty_ms", stake: 10, pot: 18, time: "24m ago", winner: "felipe.gru" },
  { id: "G-9802", a: "QUOR", b: "atlas", stake: 5, pot: 9, time: "25m ago", winner: "atlas" },
  { id: "G-9801", a: "gabriel.bh", b: "leticia_rio", stake: 5, pot: 9, time: "27m ago", winner: "gabriel.bh" },
  { id: "G-9800", a: "kp.delta", b: "MERIDIAN", stake: 1, pot: 1.8, time: "29m ago", winner: "kp.delta" },
  { id: "G-9799", a: "diogo.mg", b: "camila_ce", stake: 10, pot: 18, time: "30m ago", winner: "camila_ce" },
  { id: "G-9798", a: "noctiluca", b: "PARALLEL", stake: 10, pot: 18, time: "32m ago", winner: "PARALLEL" },
  { id: "G-9797", a: "henrique.sjc", b: "fer_pe", stake: 5, pot: 9, time: "34m ago", winner: "henrique.sjc" },
  { id: "G-9796", a: "ord1nal", b: "vrai", stake: 1, pot: 1.8, time: "36m ago", winner: "ord1nal" },
  { id: "G-9795", a: "raul_natal", b: "patricia.go", stake: 10, pot: 18, time: "38m ago", winner: "patricia.go" },
  { id: "G-9794", a: "zenith", b: "longitude", stake: 5, pot: 9, time: "41m ago", winner: "zenith" },
  { id: "G-9793", a: "yago_palmas", b: "renata_rj", stake: 10, pot: 18, time: "44m ago", winner: "yago_palmas" },
  { id: "G-9792", a: "hexa", b: "obsidian", stake: 5, pot: 9, time: "47m ago", winner: "hexa" },
  { id: "G-9791", a: "caio.ssp", b: "amanda_pr", stake: 1, pot: 1.8, time: "50m ago", winner: "amanda_pr" },
  { id: "G-9790", a: "vapor.tx", b: "qbit", stake: 10, pot: 18, time: "53m ago", winner: "vapor.tx" },
  { id: "G-9789", a: "samuel.poa", b: "julia_ba", stake: 5, pot: 9, time: "57m ago", winner: "samuel.poa" },
  { id: "G-9788", a: "phantom", b: "kestrel", stake: 10, pot: 18, time: "1h ago", winner: "phantom" },
  { id: "G-9787", a: "RAY.iv", b: "vex.04", stake: 1, pot: 1.8, time: "1h ago", winner: "vex.04" },
  { id: "G-9786", a: "rodrigo_rec", b: "stefan.sp", stake: 10, pot: 18, time: "1h ago", winner: "rodrigo_rec" },
  { id: "G-9785", a: "lumen", b: "neon.cy", stake: 5, pot: 9, time: "1h ago", winner: "neon.cy" },
  { id: "G-9784", a: "vinicius.rj", b: "tatiana_mg", stake: 10, pot: 18, time: "1h ago", winner: "tatiana_mg" },
  { id: "G-9783", a: "noctiluca", b: "atlas", stake: 5, pot: 9, time: "2h ago", winner: "noctiluca" },
  { id: "G-9782", a: "andre.sjp", b: "luiza_es", stake: 1, pot: 1.8, time: "2h ago", winner: "andre.sjp" },
];

function initials(name: string) {
  return name.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase() || "??";
}

function LiveGames() {
  // Stable initial render for SSR/hydration consistency (first 10 of pool).
  // Re-shuffles on the client after mount so each visit shows a different set.
  const [rows, setRows] = useState<RecentGame[]>(() =>
    RECENT_POOL.slice(0, 10),
  );
  useEffect(() => {
    const shuffled = [...RECENT_POOL].sort(() => Math.random() - 0.5);
    setRows(shuffled.slice(0, 10));
  }, []);

  return (
    <section className="section" id="live">
      <div className="container">
        <div className="section-head">
          <div>
            <div className="section-eyebrow">02 · The floor</div>
            <h2 className="section-title">Latest wins</h2>
          </div>
          <p className="section-sub">
            Every match below paid out real cash. Winner takes the pot, minus
            10% rake.
          </p>
        </div>

        <div className="live-card">
          <table className="live-table tnum">
            <thead>
              <tr>
                <th style={{ width: "40%" }}>Players</th>
                <th>Stake</th>
                <th>Pot</th>
                <th style={{ textAlign: "right" }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => (
                <tr key={g.id}>
                  <td>
                    <div className="players-cell">
                      <span className="avatar">{initials(g.a)}</span>
                      <span
                        style={{
                          color:
                            g.winner === g.a ? "var(--accent)" : "var(--ink)",
                        }}
                      >
                        {g.a}
                      </span>
                      <span className="vs">vs</span>
                      <span className="avatar">{initials(g.b)}</span>
                      <span
                        style={{
                          color:
                            g.winner === g.b ? "var(--accent)" : "var(--ink)",
                        }}
                      >
                        {g.b}
                      </span>
                    </div>
                    <div className="winner-mobile">{g.winner}</div>
                  </td>
                  <td>${g.stake}</td>
                  <td style={{ color: "var(--accent)", fontWeight: 600 }}>
                    ${g.pot}
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
    q: "How does staking work?",
    a: "Pick a stake from $1 to $10. Get matched with a compatible opponent — they play the same 5 locations you played. Both stakes go into escrow. Winner takes the pot, minus 10% rake.",
  },
  {
    q: "How do payouts work?",
    a: "Winnings hit your balance instantly. Withdraw to bank, debit, or stablecoin in under a minute. Pull as much as you want, as often as you want — no holds on verified accounts.",
  },
  {
    q: "What stops people from cheating?",
    a: "Same player can never play a seed twice. 25-second per-round timer prevents Google lookup. Score-band matching keeps superhuman scores quarantined to other cheaters. Three locks, layered.",
  },
  {
    q: "How does matchmaking work?",
    a: "Async. Play your 5 rounds whenever. The next player at your stake whose skill matches yours plays the same locations. You don't have to be online at the same time.",
  },
  {
    q: "What does it cost?",
    a: "Nothing to sign up. On staked matches, the house takes 10% of the pot. No deposit fees. No withdrawal fees on your first $1k weekly.",
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
    </>
  );
}
