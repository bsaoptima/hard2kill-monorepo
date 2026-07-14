"use client"

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { useAppKit, useAppKitAccount, useAppKitNetwork, useAppKitProvider } from "@reown/appkit/react"
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, clusterApiUrl } from "@solana/web3.js"
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID } from "@solana/spl-token"
import type { Provider } from "@reown/appkit-utils/solana"
import { SUPPORTED_TOKENS_SOLANA } from "@/lib/contracts/usdc"
import { SOLANA_CHAIN_ID, PLATFORM_WALLET_ADDRESS_SOLANA } from "@/lib/wagmi"
import { useBalance } from "@/lib/balance-context"
import styles from './arcade-deposit.module.css'

const QUICK_AMOUNTS = [5, 10, 25, 50]
const MIN_DEPOSIT = 1
const MAX_DEPOSIT = 5000

// Solana connection
const solanaConnection = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("mainnet-beta")
)

function calculateBonus(depositAmount: number): number {
  if (depositAmount < MIN_DEPOSIT) return 0
  return depositAmount * 1.0 // 100% match, no cap
}

export function ArcadeDeposit() {
  const [amount, setAmount] = useState<number>(5)
  const [customInput, setCustomInput] = useState<string>("")
  const [method, setMethod] = useState<'card' | 'crypto'>('card')
  const [submitting, setSubmitting] = useState(false)
  const [bonusEligible, setBonusEligible] = useState<boolean | null>(null)
  const [solanaBalance, setSolanaBalance] = useState<number | null>(null)
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null)
  const [solanaTxHash, setSolanaTxHash] = useState<string | null>(null)
  const [solanaTxStatus, setSolanaTxStatus] = useState<"idle" | "signing" | "confirming" | "confirmed" | "error">("idle")
  const [solPrice, setSolPrice] = useState<number | null>(null)
  const [crediting, setCrediting] = useState(false)

  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()
  const { chainId, caipNetworkId } = useAppKitNetwork()
  const { walletProvider: solanaWalletProvider } = useAppKitProvider<Provider>("solana")
  const { refreshBalance } = useBalance()

  // Determine if connected wallet is Solana
  const isSolana = useMemo(() => {
    if (caipNetworkId?.includes("solana")) return true
    if (chainId === SOLANA_CHAIN_ID) return true
    if (address && !address.startsWith("0x") && address.length >= 32 && address.length <= 44) return true
    return false
  }, [chainId, caipNetworkId, address])

  useEffect(() => {
    checkBonusEligibility()
  }, [])

  // Fetch SOL price
  useEffect(() => {
    async function fetchSolPrice() {
      try {
        const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd")
        const data = await res.json()
        setSolPrice(data.solana.usd)
      } catch (error) {
        console.error("Failed to fetch SOL price:", error)
      }
    }
    fetchSolPrice()
    const interval = setInterval(fetchSolPrice, 30000)
    return () => clearInterval(interval)
  }, [])

  // Fetch Solana balances when wallet is connected
  useEffect(() => {
    if (!isSolana || !address) {
      setSolanaBalance(null)
      setUsdcBalance(null)
      return
    }

    async function fetchBalances() {
      try {
        const walletPubkey = new PublicKey(address!)

        // Fetch SOL balance
        const solBalance = await solanaConnection.getBalance(walletPubkey)
        setSolanaBalance(solBalance / LAMPORTS_PER_SOL)

        // Fetch USDC balance
        try {
          const usdcMint = new PublicKey(SUPPORTED_TOKENS_SOLANA.USDC.address)
          const usdcAta = await getAssociatedTokenAddress(usdcMint, walletPubkey)
          const usdcBalanceData = await solanaConnection.getTokenAccountBalance(usdcAta)
          setUsdcBalance(Number(usdcBalanceData.value.uiAmount) || 0)
        } catch {
          setUsdcBalance(0)
        }
      } catch (error) {
        console.error("Failed to fetch Solana balances:", error)
      }
    }

    fetchBalances()
  }, [isSolana, address])

  // Handle Solana transaction confirmation
  useEffect(() => {
    if (solanaTxStatus === "confirmed" && solanaTxHash && !crediting) {
      creditBalance(solanaTxHash)
    }
  }, [solanaTxStatus, solanaTxHash])

  async function checkBonusEligibility() {
    try {
      const res = await fetch('/api/bonus/eligibility')
      if (res.ok) {
        const data = await res.json()
        setBonusEligible(data.eligible)
      }
    } catch (error) {
      console.error('Failed to check bonus eligibility:', error)
    }
  }

  async function creditBalance(hash: string) {
    setCrediting(true)
    try {
      const res = await fetch("/api/crypto/deposit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          txHash: hash,
          expectedAmount: amount,
          token: "SOL",
          chain: "solana",
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Failed to credit balance")
        return
      }

      toast.success(`$${data.credited.toFixed(2)} added to your balance!`)
      setAmount(5)
      setCustomInput("")
      setSolanaTxHash(null)
      setSolanaTxStatus("idle")

      // Refresh navbar balance
      refreshBalance()

      // Refetch wallet balances
      if (address) {
        const walletPubkey = new PublicKey(address)
        const solBalance = await solanaConnection.getBalance(walletPubkey)
        setSolanaBalance(solBalance / LAMPORTS_PER_SOL)
      }
    } catch (error) {
      toast.error("Failed to credit balance. Please contact support.")
      console.error("Credit error:", error)
    } finally {
      setCrediting(false)
    }
  }

  async function handleSolanaDeposit() {
    if (!solanaWalletProvider || !address || !solPrice) return

    setSolanaTxStatus("signing")
    try {
      const senderPubkey = new PublicKey(address)
      const recipientPubkey = new PublicKey(PLATFORM_WALLET_ADDRESS_SOLANA)

      // Convert USD amount to SOL
      const solAmount = amount / solPrice
      const lamports = Math.round(solAmount * LAMPORTS_PER_SOL)
      const transferIx = SystemProgram.transfer({
        fromPubkey: senderPubkey,
        toPubkey: recipientPubkey,
        lamports,
      })
      const tx = new Transaction().add(transferIx)

      tx.feePayer = senderPubkey
      const { blockhash } = await solanaConnection.getLatestBlockhash()
      tx.recentBlockhash = blockhash

      // Sign and send
      const signedTx = await solanaWalletProvider.signTransaction(tx)
      const signature = await solanaConnection.sendRawTransaction(signedTx.serialize())

      setSolanaTxHash(signature)
      setSolanaTxStatus("confirming")

      // Wait for confirmation
      const confirmation = await solanaConnection.confirmTransaction(signature, "confirmed")
      if (confirmation.value.err) {
        setSolanaTxStatus("error")
        toast.error("Transaction failed on-chain")
      } else {
        setSolanaTxStatus("confirmed")
      }
    } catch (error) {
      console.error("Solana deposit error:", error)
      setSolanaTxStatus("error")
      toast.error(error instanceof Error ? error.message : "Failed to send transaction")
    }
  }

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '')
    setCustomInput(val)
    const num = parseInt(val) || 0
    setAmount(num)
  }

  const bonusAmount = bonusEligible ? calculateBonus(amount) : 0
  const totalAmount = amount + bonusAmount
  const isValid = amount >= MIN_DEPOSIT && amount <= MAX_DEPOSIT
  const isBusy = submitting || solanaTxStatus === "signing" || solanaTxStatus === "confirming" || crediting
  const canSubmit = isValid && !isBusy

  async function submit() {
    if (!canSubmit) return

    if (method === 'crypto') {
      if (!isConnected) {
        open()
        return
      }
      handleSolanaDeposit()
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount }),
        cache: "no-store",
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body?.url) {
        toast.error(body?.error ?? "Could not start checkout")
        setSubmitting(false)
        return
      }
      // Redirect to Stripe Checkout
      window.location.href = body.url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error")
      setSubmitting(false)
    }
  }

  const bonusMessage = `We match your first deposit 100%.`

  const ctaLabel = method === 'crypto'
    ? solanaTxStatus === "signing"
      ? "Confirm in wallet..."
      : solanaTxStatus === "confirming"
      ? "Confirming transaction..."
      : crediting
      ? "Crediting balance..."
      : !isConnected
      ? "Connect wallet"
      : !isValid
      ? "Enter an amount"
      : solPrice
      ? `Deposit $${amount.toFixed(2)} (${(amount / solPrice).toFixed(3)} SOL) →`
      : `Deposit $${amount.toFixed(2)} →`
    : submitting
    ? "Opening Stripe Checkout…"
    : !isValid
    ? "Enter an amount"
    : `Pay $${amount.toFixed(2)} with Stripe →`

  const ctaSubText = method === 'card'
    ? "Secure checkout by"
    : "Connect your wallet via WalletConnect"

  return (
    <div className={styles.deposit}>
      <h1 className={styles.h1}>Add funds</h1>

      <div className={styles.trust}>
        <span>⚡ <b>Instant</b> credit</span>
        <span>💸 <b>$0</b> deposit fees</span>
        <span>🔓 <b>No holds</b> on withdrawals</span>
      </div>

      {/* Step 01: Amount */}
      <div className={styles.panel}>
        <div className={styles.stepLabel}>Step 01</div>
        <div className={styles.panelHead}>Amount</div>

        <div className={styles.customWrap}>
          <span className={styles.currency}>$</span>
          <input
            className={styles.customInput}
            type="text"
            inputMode="numeric"
            placeholder="Enter amount"
            value={customInput}
            onChange={handleCustomChange}
          />
        </div>

        <div className={styles.label}>Quick amounts</div>
        <div className={styles.amounts}>
          {QUICK_AMOUNTS.map((a) => (
            <button
              key={a}
              className={`${styles.amt} ${amount === a && !customInput ? styles.on : ''}`}
              onClick={() => {
                setAmount(a)
                setCustomInput("")
              }}
              type="button"
            >
              ${a}
            </button>
          ))}
        </div>

        {/* Bonus Display */}
        {bonusEligible && (
          <div className={styles.bonus}>
            <div className={styles.bonusTop}>
              <span className={styles.bonusTag}>🎁 100% first-deposit match</span>
              <span className={styles.bonusVal}>+${bonusAmount.toFixed(2)}</span>
            </div>
            <div className={styles.bonusMsg}>{bonusMessage}</div>
          </div>
        )}
      </div>

      {/* Step 02: Payment Method */}
      <div className={styles.panel}>
        <div className={styles.stepLabel}>Step 02</div>
        <div className={styles.panelHead}>How do you want to pay?</div>

        <div
          className={`${styles.opt} ${method === 'card' ? styles.on : ''}`}
          onClick={() => setMethod('card')}
        >
          <span className={styles.radio}>
            <i />
          </span>
          <span className={styles.icon}>💳</span>
          <div className={styles.optBody}>
            <div className={styles.optTitle}>
              Card
              <span className={styles.pop}>Most popular</span>
            </div>
            <div className={styles.optSub}>Instant · secure checkout by Stripe</div>
          </div>
        </div>

        <div
          className={`${styles.opt} ${method === 'crypto' ? styles.on : ''}`}
          onClick={() => setMethod('crypto')}
        >
          <span className={styles.radio}>
            <i />
          </span>
          <span className={styles.icon}>
            <svg width="22" height="18" viewBox="0 0 24 20">
              <linearGradient id="sg" x1="0" y1="20" x2="24" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#9945FF" />
                <stop offset="1" stopColor="#14F195" />
              </linearGradient>
              <path fill="url(#sg)" d="M4 0h20l-4 5H0zM0 7.5h20l4 5H4zM4 15h20l-4 5H0z" />
            </svg>
          </span>
          <div className={styles.optBody}>
            <div className={styles.optTitle}>Crypto · SOL</div>
            <div className={styles.optSub}>Instant · connect your wallet via WalletConnect</div>
          </div>
        </div>
      </div>

      {/* Step 03: Confirm & Pay */}
      <div className={styles.panel}>
        <div className={styles.stepLabel}>Step 03</div>
        <div className={styles.panelHead}>Confirm & pay</div>

        <div className={styles.sum}>
          <div className={styles.sumCell}>
            <div className={styles.label}>Deposit</div>
            <div className={styles.sumVal}>${amount.toFixed(2)}</div>
          </div>
          <div className={styles.sumCell}>
            <div className={styles.label}>Bonus</div>
            <div className={`${styles.sumVal} ${styles.accent}`}>+${bonusAmount.toFixed(2)}</div>
          </div>
          <div className={styles.sumCell}>
            <div className={styles.label}>You receive</div>
            <div className={`${styles.sumVal} ${styles.accent}`}>${totalAmount.toFixed(2)}</div>
          </div>
        </div>

        <button
          className={`${styles.cta} ${submitting ? styles.busy : ''}`}
          onClick={submit}
          disabled={!canSubmit}
          type="button"
        >
          {ctaLabel}
        </button>

        <div className={styles.ctaSub}>
          {ctaSubText}{method === 'card' && <span className={styles.stripe}> Stripe</span>}
        </div>

        <div className={styles.trustList}>
          <div className={styles.trustItem}>
            <span className={styles.check}>✓</span>
            Withdraw anytime — no holds on verified accounts
          </div>
          <div className={styles.trustItem}>
            <span className={styles.check}>✓</span>
            Licensed & regulated · 18+, play responsibly
          </div>
          <div className={styles.trustItem}>
            <span className={styles.check}>✓</span>
            256-bit SSL · we never see your card or keys
          </div>
        </div>
      </div>
    </div>
  )
}
