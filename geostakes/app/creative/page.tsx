"use client";

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

function CreativeCard() {
  return (
    <div className="glass-card" style={{ padding: '3rem', gap: '2rem' }}>
      <span className="hero-eyebrow">
        <span className="pulse-dot" />
        <span>SKILL BASED COMPETITIVE GAMING</span>
      </span>
      <h1 className="hero-h1">
        Play Geoguessr duels for Prizes
        <br />
        <br />
        only on geo<span style={{ color: '#39ff14' }}>stakes</span>
      </h1>
      <button
        className="play-btn"
        type="button"
      >
        GET YOUR 10$ INITIAL BONUS
      </button>
    </div>
  );
}

function Hero() {
  return (
    <section className="hero hero-grid" id="hero" style={{ minHeight: '100vh' }}>
      <HeroLiveGrid />
      <div className="hero-content">
        <CreativeCard />
      </div>
    </section>
  );
}

export default function Creative() {
  return (
    <div className="landing-root" style={{ minHeight: '100vh' }}>
      <Hero />
    </div>
  );
}
