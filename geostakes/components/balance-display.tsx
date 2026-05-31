"use client"

import { useEffect, useState } from 'react'
import { WalletBox } from './wallet-box'

interface Balance {
  cash: number
  bonus: number
  total: number
}

export function BalanceDisplay() {
  const [balance, setBalance] = useState<Balance | null>(null)

  useEffect(() => {
    fetchBalance()
  }, [])

  async function fetchBalance() {
    try {
      const res = await fetch('/api/balance')
      if (res.ok) {
        const data = await res.json()
        setBalance(data)
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error)
    }
  }

  if (!balance) {
    return <WalletBox label="Balance" amount="$0.00" />
  }

  // If no bonus, show single balance
  if (balance.bonus === 0) {
    return <WalletBox label="Balance" amount={`$${balance.cash.toFixed(2)}`} />
  }

  // Show cash and bonus separately
  return (
    <div className="flex gap-2">
      <WalletBox label="Cash" amount={`$${balance.cash.toFixed(2)}`} />
      <WalletBox label="Bonus" amount={`$${balance.bonus.toFixed(2)}`} />
    </div>
  )
}
