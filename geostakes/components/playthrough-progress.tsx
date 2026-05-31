"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface PlaythroughStatus {
  has_bonus: boolean
  can_withdraw: boolean
  bonus_balance: number
  playthrough_required: number
  playthrough_completed: number
  playthrough_remaining: number
  progress_percent: number
  is_complete: boolean
  is_expired: boolean
  expires_at?: string
}

export function PlaythroughProgress() {
  const [status, setStatus] = useState<PlaythroughStatus | null>(null)
  const [showForfeitDialog, setShowForfeitDialog] = useState(false)
  const [forfeiting, setForfeiting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStatus()
  }, [])

  async function fetchStatus() {
    try {
      const res = await fetch('/api/bonus/playthrough-status')
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch playthrough status:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleForfeit() {
    setForfeiting(true)
    try {
      const res = await fetch('/api/bonus/forfeit', {
        method: 'POST',
      })

      if (res.ok) {
        const data = await res.json()
        console.log('Bonus forfeited:', data)
        setShowForfeitDialog(false)
        // Refresh status
        await fetchStatus()
        // Optionally reload page to update balance everywhere
        window.location.reload()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to forfeit bonus')
      }
    } catch (error) {
      console.error('Failed to forfeit bonus:', error)
      alert('Failed to forfeit bonus')
    } finally {
      setForfeiting(false)
    }
  }

  if (loading) {
    return null
  }

  // Don't show if no bonus
  if (!status?.has_bonus || status.bonus_balance === 0) {
    return null
  }

  // Don't show if playthrough complete
  if (status.is_complete) {
    return null
  }

  return (
    <>
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Bonus Playthrough</p>
            <p className="text-xs text-muted-foreground">
              Wager ${status.playthrough_remaining.toFixed(2)} more to unlock withdrawals
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold">${status.bonus_balance.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Bonus</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${status.progress_percent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>${status.playthrough_completed.toFixed(2)} wagered</span>
            <span>${status.playthrough_required.toFixed(2)} required</span>
          </div>
        </div>

        {/* Forfeit Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setShowForfeitDialog(true)}
        >
          Forfeit Bonus & Withdraw Now
        </Button>
      </div>

      {/* Forfeit Confirmation Dialog */}
      <Dialog open={showForfeitDialog} onOpenChange={setShowForfeitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Forfeit Bonus?</DialogTitle>
            <DialogDescription>
              Are you sure you want to forfeit your bonus?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">You will lose:</span>
                <span className="font-medium text-destructive">
                  ${status.bonus_balance.toFixed(2)} bonus
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">You can withdraw:</span>
                <span className="font-medium text-green-600">
                  Your cash balance immediately
                </span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              This action cannot be undone. Your bonus will be permanently removed
              and you won't be able to claim it again.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowForfeitDialog(false)}
              disabled={forfeiting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleForfeit}
              disabled={forfeiting}
            >
              {forfeiting ? 'Forfeiting...' : 'Forfeit Bonus & Withdraw'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
