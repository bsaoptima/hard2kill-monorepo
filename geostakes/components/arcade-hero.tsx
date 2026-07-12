"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function ArcadeHero() {
  const router = useRouter()
  const [stake, setStake] = useState<number>(0.5)
  const [customStake, setCustomStake] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)
  const [totalRounds, setTotalRounds] = useState<number>(0)
  const [timer, setTimer] = useState(15)
  const [imageIndex, setImageIndex] = useState(0)
  const [stage, setStage] = useState(0)

  const STAKES = [0.5, 1]

  const demos = [
    { image: "01.jpg", location: "Shibuya Crossing, Tokyo", distance: 12, multiplier: 2.0, stake: 25 },
    { image: "02.jpg", location: "Times Square, New York", distance: 3, multiplier: 3.0, stake: 50 },
    { image: "03.jpg", location: "Dam Square, Amsterdam", distance: 89, multiplier: 1.2, stake: 10 },
    { image: "04.jpg", location: "Brandenburg Gate, Berlin", distance: 145, multiplier: 0.75, stake: 25 },
    { image: "05.jpg", location: "Champ de Mars, Paris", distance: 24, multiplier: 2.0, stake: 50 },
    { image: "06.jpg", location: "Circular Quay, Sydney", distance: 67, multiplier: 1.2, stake: 25 },
    { image: "07.jpg", location: "Copacabana, Rio de Janeiro", distance: 5, multiplier: 2.0, stake: 100 },
    { image: "08.jpg", location: "Marina Bay, Singapore", distance: 210, multiplier: 0.75, stake: 50 },
  ]

  const current = demos[imageIndex]

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats/total-rounds')
        if (res.ok) {
          const data = await res.json()
          setTotalRounds(data.totalRounds || 0)
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      }
    }
    fetchStats()
  }, [])

  // Animation stages
  useEffect(() => {
    const TIMELINE = [2000, 1500, 2000]
    if (stage >= TIMELINE.length) {
      const t = setTimeout(() => {
        setImageIndex((prev) => (prev + 1) % demos.length)
        setStage(0)
        setTimer(15)
      }, 1000)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setStage(stage + 1), TIMELINE[stage])
    return () => clearTimeout(t)
  }, [stage, imageIndex])

  // Timer countdown
  useEffect(() => {
    if (stage === 0) {
      const interval = setInterval(() => {
        setTimer((prev) => Math.max(0, prev - 1))
      }, 133)
      return () => clearInterval(interval)
    }
  }, [stage])

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9.]/g, '')
    setCustomStake(val)
    const num = parseFloat(val)
    if (!isNaN(num) && num >= 0.25 && num <= 25) {
      setStake(num)
    }
  }

  const activeStake = customStake && parseFloat(customStake) > 0
    ? parseFloat(customStake)
    : STAKES[STAKES.indexOf(stake)] !== undefined
    ? stake
    : STAKES[0]

  async function play() {
    setSubmitting(true)
    try {
      router.push(`/play-solo?stake=${activeStake}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="arcade-hero">
      <div className="arcade-hero-inner">
        {/* Left column */}
        <div className="arcade-hero-left">
          <div className="arcade-badge">
            <span className="arcade-pulse-dot" />
            <span>{totalRounds.toLocaleString()} rounds played on Geostakes</span>
          </div>

          <h1 className="arcade-h1">
            Guess where you are.<br />
            <span className="arcade-h1-accent">Win money.</span>
          </h1>

          <p className="arcade-sub">
            Real-money skill betting on GeoGuessr. Drop your pin, and the closer you land, the bigger your payout.
          </p>

          <div className="arcade-chips">
            {STAKES.map((s) => (
              <button
                key={s}
                className={`arcade-chip ${!customStake && stake === s ? 'on' : ''}`}
                onClick={() => {
                  setStake(s)
                  setCustomStake('')
                }}
                type="button"
              >
                ${s.toFixed(2)}
              </button>
            ))}
            <div className="arcade-chip-custom">
              <span className="arcade-chip-cur">$</span>
              <input
                className={`arcade-chip-in ${customStake && parseFloat(customStake) > 0 ? 'on' : ''}`}
                type="text"
                inputMode="decimal"
                placeholder="Custom"
                value={customStake}
                onChange={handleCustomChange}
              />
            </div>
          </div>

          <button
            className="arcade-play-btn"
            onClick={play}
            disabled={submitting}
            type="button"
          >
            {submitting ? 'Starting...' : `Play · $${activeStake.toFixed(2)} per round →`}
          </button>

          <div className="arcade-trust">
            <span>⚡ <b>Instant</b> payouts</span>
            <span>🔒 <b>18+</b> where legal</span>
            <span>🎯 <b>No repeats</b>, ever</span>
          </div>
        </div>

        {/* Right column - Arcade console */}
        <div className="arcade-console">
          <div className="arcade-console-hud">
            <span className="arcade-console-label">Solo mode · {timer}S left</span>
            <span className="arcade-console-live">
              <span className="arcade-pulse-dot" />
              LIVE
            </span>
          </div>

          <div className="arcade-console-screen">
            <img
              src={`/street-view/${current.image}`}
              alt="Street view"
              className="arcade-console-image"
            />
            <div className="arcade-console-scanlines" />

            {/* Targeting reticle */}
            <div className="arcade-reticle-tl" />
            <div className="arcade-reticle-tr" />
            <div className="arcade-reticle-bl" />
            <div className="arcade-reticle-br" />
            <div className="arcade-reticle-cross" />

            {/* Time pill */}
            <div className="arcade-time-pill">{timer}S</div>

            {/* Pin drop overlay - stage 1 */}
            {stage >= 1 && (
              <div className="arcade-overlay">
                <div className="arcade-pin">
                  <div className="arcade-pin-location">{current.location}</div>
                  <div className="arcade-pin-marker" />
                </div>
              </div>
            )}

            {/* Result overlay - stage 2 */}
            {stage >= 2 && (
              <div className="arcade-result-overlay">
                <div className="arcade-result-box">
                  <div className="arcade-result-stat">
                    <div className="arcade-result-label">DISTANCE</div>
                    <div className="arcade-result-value">{current.distance}km</div>
                  </div>
                  <div className="arcade-result-stat">
                    <div className="arcade-result-label">MULTIPLIER</div>
                    <div className="arcade-result-value arcade-result-accent">{current.multiplier}x</div>
                  </div>
                  <div className="arcade-result-stat">
                    <div className="arcade-result-label">PAYOUT</div>
                    <div className="arcade-result-value arcade-result-accent">${(current.stake * current.multiplier).toFixed(2)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Accuracy meter */}
          <div className="arcade-meter">
            <div className="arcade-meter-fill" />
          </div>

          <div className="arcade-console-foot">
            <div className="arcade-console-stat">
              <span className="arcade-console-stat-label">Stake</span>
              <span className="arcade-console-stat-value">${current.stake.toFixed(2)}</span>
            </div>
            <div className="arcade-console-stat" style={{ textAlign: 'right' }}>
              <span className="arcade-console-stat-label">Potential</span>
              <span className="arcade-console-stat-multi">{current.multiplier}×</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .arcade-hero {
          position: relative;
          z-index: 1;
        }

        .arcade-hero-inner {
          display: grid;
          grid-template-columns: 1.05fr 1fr;
          gap: 56px;
          align-items: center;
          padding: 64px 32px 80px;
          max-width: 1320px;
          margin: 0 auto;
        }

        /* Left column */
        .arcade-badge {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          font-family: var(--font-space-mono), monospace;
          font-size: 12px;
          letter-spacing: 0.06em;
          color: #e0e1e6;
          border: 1px solid #26272e;
          border-radius: 999px;
          padding: 7px 15px;
          background: #111114;
        }

        .arcade-pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #39ff6a;
          box-shadow: 0 0 10px #39ff6a;
          animation: pulse 1.6s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }

        .arcade-h1 {
          font-family: var(--font-saira-condensed), sans-serif;
          font-style: italic;
          font-weight: 900;
          font-size: clamp(42px, 5vw, 76px);
          line-height: 0.86;
          letter-spacing: -0.015em;
          text-transform: uppercase;
          margin: 22px 0 0;
        }

        .arcade-h1-accent {
          color: #39ff6a;
          text-shadow: 0 0 34px rgba(57, 255, 106, 0.55);
        }

        .arcade-sub {
          font-size: 17px;
          line-height: 1.5;
          color: #c8c9cf;
          max-width: 440px;
          margin: 22px 0 30px;
        }

        .arcade-chips {
          display: grid;
          grid-template-columns: 1fr 1fr 2fr;
          gap: 12px;
          margin-bottom: 16px;
          max-width: 440px;
        }

        .arcade-chip {
          font-family: var(--font-saira-condensed), sans-serif;
          font-style: italic;
          font-weight: 800;
          font-size: 22px;
          padding: 14px 26px;
          background: #111114;
          color: #f4f5f2;
          border: 1px solid #26272e;
          cursor: pointer;
          box-shadow: 0 4px 0 #000;
          transition: transform 0.08s, border-color 0.14s;
        }

        .arcade-chip:hover {
          border-color: #8b8c95;
        }

        .arcade-chip:active {
          transform: translateY(3px);
          box-shadow: 0 1px 0 #000;
        }

        .arcade-chip.on {
          background: #39ff6a;
          color: #06180d;
          border-color: #39ff6a;
          box-shadow: 0 4px 0 #1c7a3a;
        }

        .arcade-chip.on:active {
          box-shadow: 0 1px 0 #1c7a3a;
        }

        .arcade-chip-custom {
          position: relative;
          display: flex;
          align-items: center;
        }

        .arcade-chip-cur {
          position: absolute;
          left: 16px;
          font-family: var(--font-saira-condensed), sans-serif;
          font-style: italic;
          font-weight: 800;
          font-size: 22px;
          color: #8b8c95;
          pointer-events: none;
        }

        .arcade-chip-in {
          width: 100%;
          font-family: var(--font-saira-condensed), sans-serif;
          font-style: italic;
          font-weight: 800;
          font-size: 22px;
          padding: 14px 16px 14px 30px;
          background: #111114;
          color: #f4f5f2;
          border: 1px solid #26272e;
          box-shadow: 0 4px 0 #000;
        }

        .arcade-chip-in:focus {
          outline: none;
          border-color: #39ff6a;
        }

        .arcade-chip-in.on {
          border-color: #39ff6a;
          box-shadow: 0 4px 0 #1c7a3a;
        }

        .arcade-chip-in::placeholder {
          color: #8b8c95;
        }

        .arcade-play-btn {
          width: 100%;
          max-width: 440px;
          font-family: var(--font-saira-condensed), sans-serif;
          font-style: italic;
          font-weight: 900;
          font-size: 27px;
          letter-spacing: 0.01em;
          text-transform: uppercase;
          padding: 22px;
          background: #39ff6a;
          color: #06180d;
          border: none;
          cursor: pointer;
          box-shadow: 0 7px 0 #1c7a3a;
          transition: transform 0.08s, filter 0.12s;
        }

        .arcade-play-btn:hover {
          filter: brightness(1.08);
        }

        .arcade-play-btn:active {
          transform: translateY(5px);
          box-shadow: 0 2px 0 #1c7a3a;
        }

        .arcade-play-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .arcade-trust {
          display: flex;
          gap: 20px;
          margin-top: 18px;
          font-family: var(--font-space-mono), monospace;
          font-size: 11px;
          letter-spacing: 0.05em;
          color: #8b8c95;
          text-transform: uppercase;
        }

        .arcade-trust b {
          color: #f4f5f2;
        }

        /* Right column - Console */
        .arcade-console {
          position: relative;
          background: #111114;
          border: 1px solid #26272e;
          padding: 14px;
          box-shadow: 0 40px 90px -40px #000, inset 0 0 0 1px rgba(255, 255, 255, 0.02);
        }

        .arcade-console-hud {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 6px 12px;
        }

        .arcade-console-label {
          font-family: var(--font-space-mono), monospace;
          font-size: 12px;
          letter-spacing: 0.16em;
          color: #8b8c95;
          text-transform: uppercase;
        }

        .arcade-console-live {
          display: flex;
          align-items: center;
          gap: 7px;
          font-family: var(--font-space-mono), monospace;
          font-size: 12px;
          letter-spacing: 0.16em;
          color: #39ff6a;
          text-transform: uppercase;
        }

        .arcade-console-screen {
          position: relative;
          aspect-ratio: 16/11;
          overflow: hidden;
          background: #000;
        }

        .arcade-console-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .arcade-console-scanlines {
          content: "";
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.18) 0 1px, transparent 1px 3px);
          pointer-events: none;
        }

        .arcade-reticle-tl, .arcade-reticle-tr, .arcade-reticle-bl, .arcade-reticle-br {
          position: absolute;
          width: 26px;
          height: 26px;
          border: 2px solid #39ff6a;
          pointer-events: none;
          filter: drop-shadow(0 0 6px #39ff6a);
        }

        .arcade-reticle-tl {
          top: 14px;
          left: 14px;
          border-right: 0;
          border-bottom: 0;
        }

        .arcade-reticle-tr {
          top: 14px;
          right: 14px;
          border-left: 0;
          border-bottom: 0;
        }

        .arcade-reticle-bl {
          bottom: 14px;
          left: 14px;
          border-right: 0;
          border-top: 0;
        }

        .arcade-reticle-br {
          bottom: 14px;
          right: 14px;
          border-left: 0;
          border-top: 0;
        }

        .arcade-reticle-cross {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 36px;
          height: 36px;
          pointer-events: none;
        }

        .arcade-reticle-cross::before,
        .arcade-reticle-cross::after {
          content: "";
          position: absolute;
          background: rgba(57, 255, 106, 0.9);
          box-shadow: 0 0 6px #39ff6a;
        }

        .arcade-reticle-cross::before {
          left: 50%;
          top: 0;
          width: 2px;
          height: 100%;
          transform: translateX(-50%);
        }

        .arcade-reticle-cross::after {
          top: 50%;
          left: 0;
          height: 2px;
          width: 100%;
          transform: translateY(-50%);
        }

        .arcade-time-pill {
          position: absolute;
          top: 14px;
          left: 50%;
          transform: translateX(-50%);
          font-family: var(--font-space-mono), monospace;
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 0.14em;
          color: #06180d;
          background: #39ff6a;
          padding: 5px 14px;
          border-radius: 999px;
          z-index: 3;
        }

        .arcade-meter {
          height: 6px;
          background: #191a1f;
          border-radius: 3px;
          overflow: hidden;
          margin: 12px 6px 0;
        }

        .arcade-meter-fill {
          height: 100%;
          width: 78%;
          background: linear-gradient(90deg, #ffc24d, #39ff6a);
          box-shadow: 0 0 12px #39ff6a;
        }

        .arcade-console-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 6px 4px;
        }

        .arcade-console-stat {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .arcade-console-stat-label {
          font-family: var(--font-space-mono), monospace;
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #8b8c95;
        }

        .arcade-console-stat-value {
          font-family: var(--font-saira-condensed), sans-serif;
          font-style: italic;
          font-weight: 900;
          font-size: 30px;
          line-height: 1;
        }

        .arcade-console-stat-multi {
          font-family: var(--font-saira-condensed), sans-serif;
          font-style: italic;
          font-weight: 900;
          font-size: 30px;
          color: #39ff6a;
          text-shadow: 0 0 24px rgba(57, 255, 106, 0.6);
        }

        /* Overlays */
        .arcade-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(2px);
        }

        .arcade-pin {
          animation: pinDrop 0.4s cubic-bezier(0.2, 1.4, 0.4, 1) both;
          text-align: center;
        }

        .arcade-pin-location {
          background: #111114;
          border: 1px solid #26272e;
          color: #f4f5f2;
          padding: 8px 16px;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 600;
        }

        .arcade-pin-marker {
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-top: 12px solid #39ff6a;
          margin: 0 auto;
          filter: drop-shadow(0 0 8px #39ff6a);
        }

        .arcade-result-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
        }

        .arcade-result-box {
          display: flex;
          gap: 24px;
          background: #111114;
          border: 1px solid #26272e;
          padding: 24px 32px;
          animation: slideUp 0.5s cubic-bezier(0.2, 1, 0.3, 1) both;
        }

        .arcade-result-stat {
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: center;
        }

        .arcade-result-label {
          font-family: var(--font-space-mono), monospace;
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #8b8c95;
        }

        .arcade-result-value {
          font-family: var(--font-saira-condensed), sans-serif;
          font-style: italic;
          font-weight: 900;
          font-size: 24px;
          color: #f4f5f2;
        }

        .arcade-result-accent {
          color: #39ff6a;
        }

        @keyframes pinDrop {
          from {
            transform: translateY(-30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @media (max-width: 900px) {
          .arcade-hero-inner {
            grid-template-columns: 1fr;
            gap: 40px;
            padding: 32px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .arcade-pulse-dot {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}
