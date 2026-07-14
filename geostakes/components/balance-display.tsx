"use client"

import { useBalance } from '@/lib/balance-context'
import { WalletBox } from './wallet-box'

export function BalanceDisplay() {
  const { balance } = useBalance()

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
