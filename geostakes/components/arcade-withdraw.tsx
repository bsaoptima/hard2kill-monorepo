"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useBalance } from "@/lib/balance-context"
import styles from './arcade-withdraw.module.css'

const QUICK_AMOUNTS = [25, 50, 100]
const DAILY_CRYPTO_LIMIT = 100

type RecentPayout = {
  name: string
  amount: string
  initials: string
  color: string
}

export function ArcadeWithdraw({ cash, bonus }: { cash: number; bonus: number }) {
  const balance = cash; // Only cash can be withdrawn
  const total = cash + bonus;
  const router = useRouter()
  const { refreshBalance } = useBalance()
  const [amount, setAmount] = useState<number>(0)
  const [customInput, setCustomInput] = useState<string>("")
  const [method, setMethod] = useState<'bank' | 'crypto'>('crypto')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [recentPayouts, setRecentPayouts] = useState<RecentPayout[]>([])

  // Bank fields
  const [holderName, setHolderName] = useState("")
  const [iban, setIban] = useState("")
  const [bankName, setBankName] = useState("")
  const [swift, setSwift] = useState("")

  // Crypto fields
  const [walletAddress, setWalletAddress] = useState("")

  useEffect(() => {
    // Fetch recent payouts for the ticker
    async function fetchRecentPayouts() {
      try {
        const res = await fetch('/api/recent-payouts', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setRecentPayouts(data.payouts || [])
        }
      } catch (err) {
        console.error('Failed to fetch recent payouts:', err)
      }
    }
    fetchRecentPayouts()
  }, [])

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '')
    setCustomInput(val)
    const num = parseInt(val) || 0
    setAmount(num)
  }

  const isValid = amount > 0 && amount <= balance
  const isOver = amount > balance

  function isDestinationValid(): boolean {
    if (method === 'bank') {
      const cleanIban = iban.trim().replace(/\s+/g, "")
      return (
        holderName.trim().length >= 2 &&
        bankName.trim().length >= 2 &&
        cleanIban.length >= 8 &&
        cleanIban.length <= 34
      )
    }
    // Solana address: base58, 32-44 chars
    const addr = walletAddress.trim()
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)
  }

  function isCryptoAmountValid(): boolean {
    return method !== 'crypto' || amount <= DAILY_CRYPTO_LIMIT
  }

  const canSubmit = isValid && isDestinationValid() && isCryptoAmountValid() && !submitting

  async function submit() {
    if (!canSubmit) return
    setSubmitting(true)

    if (method === 'bank') {
      try {
        const res = await fetch("/api/withdraw", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            amount,
            destination: {
              type: 'bank',
              holderName: holderName.trim(),
              iban: iban.trim().replace(/\s+/g, "").toUpperCase(),
              bankName: bankName.trim(),
              ...(swift.trim() ? { swift: swift.trim().toUpperCase() } : {}),
            },
          }),
          cache: "no-store",
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(body?.error ?? "Withdrawal failed")
          setSubmitting(false)
          return
        }
        toast.success("Withdrawal request submitted")
        setSubmitted(true)
        refreshBalance()
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Network error")
        setSubmitting(false)
      }
    } else {
      // Crypto withdrawal - instant on-chain (SOL only)
      try {
        const res = await fetch("/api/crypto/withdraw", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            amount,
            type: 'crypto_sol',
            address: walletAddress.trim(),
          }),
          cache: "no-store",
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(body?.error ?? "Withdrawal failed")
          setSubmitting(false)
          return
        }
        toast.success("Withdrawal sent!")
        setTxHash(body.txHash)
        setSubmitted(true)
        refreshBalance()
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Network error")
        setSubmitting(false)
      }
    }
  }

  const ctaLabel = submitting
    ? method === 'bank' ? "Submitting request…" : "Sending on-chain…"
    : amount <= 0
    ? "Enter an amount"
    : isOver
    ? "Amount exceeds balance"
    : method === 'crypto' && amount > DAILY_CRYPTO_LIMIT
    ? `Daily limit is $${DAILY_CRYPTO_LIMIT}`
    : !isDestinationValid()
    ? method === 'bank' ? "Complete bank details" : "Enter wallet address"
    : `Withdraw $${amount.toFixed(2)} →`

  const ctaSubText = method === 'bank'
    ? "Withdrawals are reviewed and processed manually. Typical turnaround: 1-3 business days for international bank transfers."
    : `Instant on-chain withdrawal. Daily limit: $${DAILY_CRYPTO_LIMIT}.`

  if (submitted) {
    const isCrypto = txHash !== null
    const explorerUrl = isCrypto ? `https://solscan.io/tx/${txHash}` : null

    return (
      <div className={styles.withdraw}>
        <div className={styles.panel} style={{ textAlign: 'center', padding: '60px 28px' }}>
          <div className={styles.h1} style={{ color: '#39ff6a', fontSize: '48px', marginBottom: '16px' }}>
            {isCrypto ? 'Sent!' : 'On its way'}
          </div>
          {isCrypto ? (
            <>
              <p style={{ fontSize: '14px', color: '#8b8c95', lineHeight: '1.8', marginBottom: '16px' }}>
                Your withdrawal has been sent on-chain.
              </p>
              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    fontFamily: 'var(--font-space-mono), monospace',
                    fontSize: '12px',
                    color: '#39ff6a',
                    background: 'rgba(57, 255, 106, 0.1)',
                    padding: '12px 20px',
                    textDecoration: 'none',
                    marginBottom: '8px',
                  }}
                >
                  View on Explorer →
                </a>
              )}
              <p style={{
                fontFamily: 'var(--font-space-mono), monospace',
                fontSize: '10px',
                color: '#6b6c75',
                lineHeight: '1.6',
                marginTop: '16px',
                wordBreak: 'break-all',
              }}>
                {txHash}
              </p>
            </>
          ) : (
            <>
              <p style={{ fontSize: '14px', color: '#8b8c95', lineHeight: '1.8', marginBottom: '8px' }}>
                Your withdrawal request is being processed.
              </p>
              <p style={{ fontSize: '14px', color: '#8b8c95', lineHeight: '1.8' }}>
                You'll get an email when the funds are sent — typically within 1-3 business days.
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.withdraw}>
      <h1 className={styles.h1}>Cash out</h1>

      <div className={styles.trust}>
        <span>⚡ <b>Instant</b> payout</span>
        <span>💸 <b>$0</b> withdrawal fees</span>
        <span>🔓 <b>No holds</b> on verified accounts</span>
      </div>

      {/* Latest payouts ticker */}
      {recentPayouts.length > 0 && (
        <div className={styles.ticker}>
          <span className={styles.pdot} />
          <span className={styles.tkLbl}>Latest payouts</span>
          <div className={styles.tkView}>
            <div className={styles.tkTrack}>
              {recentPayouts.concat(recentPayouts).map((p, i) => (
                <span key={i} className={styles.tkItem}>
                  <span className={styles.tkAv} style={{ background: p.color }}>
                    {p.initials}
                  </span>
                  <b>{p.name}</b>
                  <span className={styles.tkA}>{p.amount}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Available balance banner */}
      <div className={styles.avail}>
        <div>
          <div className={styles.lbl}>Available to withdraw</div>
          <div className={styles.availv}>${balance.toFixed(2)}</div>
        </div>
        {bonus > 0 && (
          <div className={styles.breakdown}>
            <div className={styles.breakdownRow}>
              <span>Total balance</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className={styles.breakdownRow}>
              <span>Bonus (play to unlock)</span>
              <span>−${bonus.toFixed(2)}</span>
            </div>
            <div className={`${styles.breakdownRow} ${styles.breakdownTotal}`}>
              <span>Withdrawable</span>
              <span>${cash.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Step 01: Amount */}
      <div className={styles.panel}>
        <div className={styles.stepLabel}>Step 01</div>
        <div className={styles.panelHead}>Amount</div>

        <div className={styles.customWrap}>
          <span className={styles.currency}>$</span>
          <input
            className={`${styles.customInput} ${isOver ? styles.over : ''}`}
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
          <button
            className={`${styles.amt} ${amount === Math.floor(balance) && !customInput ? styles.on : ''}`}
            onClick={() => {
              const max = Math.floor(balance * 100) / 100
              setAmount(max)
              setCustomInput("")
            }}
            type="button"
          >
            Max
          </button>
        </div>

        {isOver && (
          <div className={styles.overMsg}>
            You can withdraw up to ${balance.toFixed(2)}.
          </div>
        )}
      </div>

      {/* Step 02: Payment Method */}
      <div className={styles.panel}>
        <div className={styles.stepLabel}>Step 02</div>
        <div className={styles.panelHead}>Where should it go?</div>

        <div
          className={`${styles.opt} ${method === 'bank' ? styles.on : ''}`}
          onClick={() => setMethod('bank')}
        >
          <span className={styles.radio}>
            <i />
          </span>
          <span className={styles.icon}>🏦</span>
          <div className={styles.optBody}>
            <div className={styles.optTitle}>Bank</div>
            <div className={styles.optSub}>International (IBAN)</div>
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
            <div className={styles.optTitle}>
              Crypto
              <span className={styles.pop}>INSTANT</span>
            </div>
            <div className={styles.optSub}>SOL or USDC · sent to your wallet</div>
          </div>
        </div>

        <div className={styles.optx}>
          {method === 'bank' ? (
            <>
              <div className={styles.dest} style={{ marginBottom: '14px' }}>
                <label>Account holder name</label>
                <input
                  className={styles.inp}
                  placeholder="Full name as on bank account"
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                />
              </div>
              <div className={styles.dest} style={{ marginBottom: '14px' }}>
                <label>IBAN / account number</label>
                <input
                  className={styles.inp}
                  placeholder="DE89 3704 0044 0532 0130 00"
                  value={iban}
                  onChange={(e) => setIban(e.target.value.toUpperCase())}
                  style={{ fontFamily: 'var(--font-space-mono), monospace', fontSize: '13px' }}
                />
              </div>
              <div className={styles.bankGrid}>
                <div className={styles.dest}>
                  <label>Bank name</label>
                  <input
                    className={styles.inp}
                    placeholder="e.g. Caixa, BBVA, BNP"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                  />
                </div>
                <div className={styles.dest}>
                  <label>SWIFT / BIC <span style={{ opacity: 0.6 }}>(optional)</span></label>
                  <input
                    className={styles.inp}
                    placeholder="BNPAFRPP"
                    value={swift}
                    onChange={(e) => setSwift(e.target.value.toUpperCase())}
                    style={{ fontFamily: 'var(--font-space-mono), monospace', fontSize: '13px' }}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className={styles.dest}>
                <label>Solana wallet address</label>
                <input
                  className={styles.inp}
                  placeholder="Your Solana address"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  style={{ fontFamily: 'var(--font-space-mono), monospace', fontSize: '12px' }}
                />
              </div>
              <p style={{
                fontFamily: 'var(--font-space-mono), monospace',
                fontSize: '10px',
                color: '#6b6c75',
                margin: '12px 0 0',
                lineHeight: '1.6'
              }}>
                Daily limit: ${DAILY_CRYPTO_LIMIT}. Withdrawals are sent instantly on-chain.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Step 03: Confirm & Pay */}
      <div className={styles.panel}>
        <div className={styles.stepLabel}>Step 03</div>
        <div className={styles.panelHead}>Confirm payout</div>

        <div className={styles.sum}>
          <div className={styles.sumCell}>
            <div className={styles.label}>Withdrawing</div>
            <div className={styles.sumVal}>${amount.toFixed(2)}</div>
          </div>
          <div className={styles.sumCell}>
            <div className={styles.label}>Fees</div>
            <div className={styles.sumVal}>$0.00</div>
          </div>
          <div className={styles.sumCell}>
            <div className={styles.label}>You receive</div>
            <div className={`${styles.sumVal} ${styles.accent}`}>${amount.toFixed(2)}</div>
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
          {ctaSubText}
        </div>

        <div className={styles.trustList}>
          <div className={styles.trustItem}>
            <span className={styles.check}>✓</span>
            Payouts land instantly — most in under a minute
          </div>
          <div className={styles.trustItem}>
            <span className={styles.check}>✓</span>
            No holds, no minimums on verified accounts
          </div>
          <div className={styles.trustItem}>
            <span className={styles.check}>✓</span>
            Licensed & regulated · 18+, play responsibly
          </div>
        </div>
      </div>
    </div>
  )
}
