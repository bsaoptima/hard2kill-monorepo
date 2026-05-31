"use client"

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Gift } from 'lucide-react'

export function GlobalBonusBanner() {
  const pathname = usePathname()
  const [bonusEligible, setBonusEligible] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkBonusEligibility()
  }, [])

  async function checkBonusEligibility() {
    try {
      const res = await fetch('/api/bonus/eligibility')
      if (res.ok) {
        const data = await res.json()
        setBonusEligible(data.eligible)
      } else if (res.status === 401) {
        // User not logged in - show banner to encourage signup
        setBonusEligible(true)
      } else {
        // Other error - don't show banner
        setBonusEligible(false)
      }
    } catch (error) {
      // Network error - show banner anyway (better to show than hide)
      setBonusEligible(true)
    } finally {
      setLoading(false)
    }
  }

  // Don't show on game pages
  if (pathname?.startsWith('/play/')) {
    return null
  }

  // Don't show while loading
  if (loading) {
    return null
  }

  // Don't show if not eligible
  if (!bonusEligible) {
    return null
  }

  return (
    <div className="w-full bg-primary">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-center gap-2 text-primary-foreground">
          <Gift className="w-5 h-5" />
          <span className="font-semibold text-sm sm:text-base">
            Get 100% match on your first deposit up to $10!
          </span>
        </div>
      </div>
    </div>
  )
}
