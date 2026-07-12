"use client"

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export function ArcadeMarqueeBanner() {
  const pathname = usePathname()
  const [stats, setStats] = useState({
    rounds: 0,
    paidOut: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch total rounds played
        const roundsRes = await fetch('/api/stats/total-rounds')
        if (roundsRes.ok) {
          const data = await roundsRes.json()
          setStats(prev => ({
            rounds: data.totalRounds || 0,
            paidOut: data.totalPaidOut || 0,
          }))
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  // Don't show on game pages to avoid distraction
  if (pathname?.startsWith('/play/') || pathname?.startsWith('/match/')) {
    return null
  }

  const formatMoney = (n: number) => '$' + n.toLocaleString('en-US')
  const formatNumber = (n: number) => n.toLocaleString('en-US')

  const messages = [
    '🎁 100% match on your first deposit',
    `${formatNumber(stats.rounds)} rounds played`,
    `${formatMoney(stats.paidOut)} paid out`,
    'instant cash-out',
    'no rake · no fees',
  ]

  return (
    <div className="arcade-marquee">
      <div className="arcade-marquee-track">
        {/* Duplicate content twice for seamless loop */}
        {messages.map((msg, i) => (
          <span key={`a-${i}`} className="arcade-marquee-item">
            {msg} <b>//</b>
          </span>
        ))}
        {messages.map((msg, i) => (
          <span key={`b-${i}`} className="arcade-marquee-item">
            {msg} <b>//</b>
          </span>
        ))}
      </div>

      <style jsx>{`
        .arcade-marquee {
          background: #39ff6a;
          color: #06180d;
          overflow: hidden;
          border-bottom: 2px solid #06180d;
        }

        .arcade-marquee-track {
          display: flex;
          white-space: nowrap;
          width: max-content;
          animation: marquee-scroll 26s linear infinite;
          font-family: var(--font-space-mono), ui-monospace, monospace;
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 0.05em;
          padding: 9px 0;
        }

        .arcade-marquee-item {
          padding: 0 26px;
          text-transform: uppercase;
        }

        .arcade-marquee-item b {
          color: #06180d;
          opacity: 0.55;
          font-weight: 700;
        }

        @keyframes marquee-scroll {
          to {
            transform: translateX(-50%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .arcade-marquee-track {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}
