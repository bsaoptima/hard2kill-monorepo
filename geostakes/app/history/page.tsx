"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import styles from "./history.module.css"

type RoundData = {
  id: string
  locationId: string
  locationLabel: string | null
  stake: number
  distanceKm: number
  multiplier: number
  payout: number
  createdAt: string
  isWin: boolean
}

type HistoryStats = {
  roundsPlayed: number
  winRate: number
  totalStaked: number
  net: number
}

export default function HistoryPage() {
  const [rounds, setRounds] = useState<RoundData[]>([])
  const [stats, setStats] = useState<HistoryStats>({
    roundsPlayed: 0,
    winRate: 0,
    totalStaked: 0,
    net: 0,
  })
  const [filter, setFilter] = useState<"all" | "wins" | "losses">("all")
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch("/api/history", { cache: "no-store" })
        if (res.status === 401) {
          router.push("/auth/signin?next=/history")
          return
        }
        if (res.ok) {
          const data = await res.json()
          setRounds(data.rounds || [])
          setStats(data.stats || {
            roundsPlayed: 0,
            winRate: 0,
            totalStaked: 0,
            net: 0,
          })
        }
      } catch (err) {
        console.error("Failed to fetch history:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [router])

  const filteredRounds = rounds.filter((r) => {
    if (filter === "wins") return r.isWin
    if (filter === "losses") return !r.isWin
    return true
  })

  function formatTimeAgo(timestamp: string): string {
    const now = Date.now()
    const past = new Date(timestamp).getTime()
    const diff = now - past

    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    const weeks = Math.floor(days / 7)
    const months = Math.floor(days / 30)
    const years = Math.floor(days / 365)

    if (years > 0) return `${years}y`
    if (months > 0) return `${months}mo`
    if (weeks > 0) return `${weeks}w`
    if (days > 0) return `${days}d`
    if (hours > 0) return `${hours}h`
    if (minutes > 0) return `${minutes}m`
    return `${seconds}s`
  }

  if (loading) {
    return (
      <div className={styles.app}>
        <div className={styles.wrap} style={{ paddingTop: "100px", textAlign: "center" }}>
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className={styles.app}>
      <div className={styles.wrap}>
        <div className={styles.top}>
          <h1 className={styles.h1}>Game history</h1>
          <p className={styles.sub}>
            Every round you've played, with the multiplier you earned and what it paid.
          </p>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.lbl}>Rounds played</div>
            <div className={styles.statv}>{stats.roundsPlayed}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.lbl}>Win rate</div>
            <div className={styles.statv}>{stats.winRate}%</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.lbl}>Total wagered</div>
            <div className={styles.statv}>${stats.totalStaked.toFixed(2)}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.lbl}>Net profit</div>
            <div className={`${styles.statv} ${stats.net >= 0 ? styles.g : styles.r}`}>
              {stats.net >= 0 ? "+" : "−"}${Math.abs(stats.net).toFixed(2)}
            </div>
          </div>
        </div>

        <div className={styles.bar}>
          <div className={styles.filters}>
            <button
              className={`${styles.fchip} ${filter === "all" ? styles.on : ""}`}
              onClick={() => setFilter("all")}
              type="button"
            >
              All
            </button>
            <button
              className={`${styles.fchip} ${filter === "wins" ? styles.on : ""}`}
              onClick={() => setFilter("wins")}
              type="button"
            >
              Wins
            </button>
            <button
              className={`${styles.fchip} ${filter === "losses" ? styles.on : ""}`}
              onClick={() => setFilter("losses")}
              type="button"
            >
              Misses
            </button>
          </div>
          <div className={styles.count}>
            {filteredRounds.length} round{filteredRounds.length === 1 ? "" : "s"}
          </div>
        </div>

        {filteredRounds.length === 0 ? (
          <div className={styles.tbl}>
            <div className={styles.empty}>
              <p>No rounds found.</p>
              <Link href="/" className={styles.emptyLink}>
                Play your first round →
              </Link>
            </div>
          </div>
        ) : (
          <div className={styles.tbl}>
            <div className={styles.hr}>
              <div className={styles.hc}>Location</div>
              <div className={`${styles.hc} ${styles.hStake}`}>Stake</div>
              <div className={`${styles.hc} ${styles.hDist}`}>Distance</div>
              <div className={styles.hc}>Multiplier</div>
              <div className={styles.hc}>Payout</div>
              <div className={styles.hc}>Result</div>
            </div>
            {filteredRounds.map((round) => (
              <div key={round.id} className={styles.rr}>
                <div className={styles.loc}>
                  <div className={styles.locn}>{round.locationLabel ?? "Unknown location"}</div>
                  <div className={styles.locc}>{formatTimeAgo(round.createdAt)} ago</div>
                </div>
                <div className={`${styles.cell} ${styles.cStake}`}>${round.stake.toFixed(2)}</div>
                <div className={`${styles.cell} ${styles.cDist}`}>{round.distanceKm} km</div>
                <div className={`${styles.mult} ${round.multiplier > 0 ? styles.g : styles.d}`}>
                  {round.multiplier > 0 ? `${round.multiplier.toFixed(1)}×` : "—"}
                </div>
                <div className={`${styles.pay} ${round.isWin ? styles.g : styles.r}`}>
                  {round.isWin ? "+" : ""}${round.payout.toFixed(2)}
                </div>
                <div className={`${styles.res} ${round.isWin ? styles.win : styles.loss}`}>
                  {round.isWin ? "Win" : "Miss"}
                </div>
              </div>
            ))}
          </div>
        )}

        <footer className={styles.foot}>
          Showing your {filteredRounds.length} round{filteredRounds.length === 1 ? "" : "s"} · locations never repeat, so every round above is one you'll never see again.
        </footer>
      </div>
    </div>
  )
}
