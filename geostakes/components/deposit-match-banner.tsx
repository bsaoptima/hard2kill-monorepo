"use client"

import { useEffect, useState } from 'react'
import { Gift } from 'lucide-react'

interface BonusEligibility {
  eligible: boolean
  already_claimed: boolean
}

export function DepositMatchBanner({ className = "" }: { className?: string }) {
  const [eligible, setEligible] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkEligibility()
  }, [])

  async function checkEligibility() {
    try {
      const res = await fetch('/api/bonus/eligibility')
      if (res.ok) {
        const data: BonusEligibility = await res.json()
        setEligible(data.eligible)
      }
    } catch (error) {
      console.error('Failed to check bonus eligibility:', error)
    } finally {
      setLoading(false)
    }
  }

  // Don't show while loading or if not eligible
  if (loading || eligible === false) {
    return null
  }

  return (
    <div className={`rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 p-4 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
          <Gift className="w-5 h-5 text-green-500" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-green-500 mb-1">
            🎉 First Deposit Bonus
          </h3>
          <p className="text-xs text-muted-foreground">
            Get <span className="font-bold text-green-500">100% match up to $10</span> on your first deposit
          </p>
        </div>
      </div>
    </div>
  )
}

export function DepositMatchBadge() {
  const [eligible, setEligible] = useState<boolean | null>(null)

  useEffect(() => {
    checkEligibility()
  }, [])

  async function checkEligibility() {
    try {
      const res = await fetch('/api/bonus/eligibility')
      if (res.ok) {
        const data: BonusEligibility = await res.json()
        setEligible(data.eligible)
      }
    } catch (error) {
      console.error('Failed to check bonus eligibility:', error)
    }
  }

  if (!eligible) {
    return null
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-xs font-medium text-green-500">
      <Gift className="w-3 h-3" />
      100% Match
    </span>
  )
}
