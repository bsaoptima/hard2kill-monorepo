"use client"

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

export function DepositSuccessToast() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const depositStatus = searchParams.get('deposit')

    if (depositStatus === 'success') {
      // Wait a moment for the page to load
      setTimeout(() => {
        toast.success(
          <div className="flex flex-col gap-1">
            <div className="font-bold">Deposit successful! 🎉</div>
            <div className="text-sm text-muted-foreground">
              Your balance has been updated. Check for your bonus!
            </div>
          </div>,
          {
            duration: 5000,
          }
        )

        // Clean up URL
        const url = new URL(window.location.href)
        url.searchParams.delete('deposit')
        window.history.replaceState({}, '', url.toString())
      }, 500)
    } else if (depositStatus === 'cancelled') {
      setTimeout(() => {
        toast.error('Deposit cancelled')

        // Clean up URL
        const url = new URL(window.location.href)
        url.searchParams.delete('deposit')
        window.history.replaceState({}, '', url.toString())
      }, 500)
    }
  }, [searchParams])

  return null
}
