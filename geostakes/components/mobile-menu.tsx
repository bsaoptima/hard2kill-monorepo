"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Gift } from "lucide-react"

export function MobileMenu({
  username,
  balance,
  bonusEligible,
}: {
  username: string
  balance: number
  bonusEligible: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setMenuOpen(false)
    router.refresh()
  }

  return (
    <>
      {/* Hamburger button - only visible on mobile */}
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        className="lg:hidden flex flex-col gap-1.5 w-10 h-10 items-center justify-center bg-[#191a1f] border border-[#26272e] hover:border-[#8b8c95] transition-colors"
        style={{ boxShadow: "0 4px 0 #000" }}
        aria-label="Menu"
      >
        <span className="w-5 h-0.5 bg-[#f4f5f2]" />
        <span className="w-5 h-0.5 bg-[#f4f5f2]" />
        <span className="w-5 h-0.5 bg-[#f4f5f2]" />
      </button>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 bg-black/60 z-40"
            onClick={() => setMenuOpen(false)}
          />

          {/* Menu panel */}
          <div className="lg:hidden fixed top-0 right-0 bottom-0 w-[280px] bg-[#08090a] border-l border-[#26272e] z-50 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#26272e]">
              <div>
                <div className="font-bold text-sm">{username}</div>
                <div className="font-mono text-[11px] text-[#8b8c95] tracking-wider mt-0.5">
                  ${balance.toFixed(2)} available
                </div>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-[#8b8c95] hover:text-[#f4f5f2]"
              >
                ✕
              </button>
            </div>

            {/* Menu items */}
            <div className="p-4 space-y-3">
              {/* Balance display */}
              <div className="bg-[#111114] border border-[#26272e] px-4 py-3 flex items-center gap-3">
                <span className="w-[7px] h-[7px] rounded-full bg-[#39ff6a] shadow-[0_0_8px_#39ff6a]" />
                <div>
                  <div
                    className="text-[9px] uppercase tracking-[0.14em] mb-1"
                    style={{
                      fontFamily: "var(--font-space-mono), monospace",
                      color: "#8b8c95",
                    }}
                  >
                    Balance
                  </div>
                  <div
                    className="text-[21px] tabular-nums"
                    style={{
                      fontFamily: "var(--font-saira-condensed), sans-serif",
                      fontStyle: "italic",
                      fontWeight: 900,
                      color: "#f4f5f2",
                    }}
                  >
                    ${balance.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Deposit button */}
              <div className="relative">
                <Link
                  href="/deposit"
                  onClick={() => setMenuOpen(false)}
                  className="w-full h-[48px] flex items-center justify-center border-none uppercase tracking-[0.01em]"
                  style={{
                    fontFamily: "var(--font-saira-condensed), sans-serif",
                    fontStyle: "italic",
                    fontWeight: 900,
                    fontSize: "17px",
                    background: "#39ff6a",
                    color: "#06180d",
                    boxShadow: "0 4px 0 #1c7a3a",
                  }}
                >
                  Deposit
                </Link>
                {bonusEligible && (
                  <span className="absolute -top-1 -right-1 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-500 text-[9px] font-bold text-white shadow-lg">
                    <Gift className="w-2.5 h-2.5" />
                    +100%
                  </span>
                )}
              </div>

              {/* Withdraw button */}
              <Link
                href="/withdraw"
                onClick={() => setMenuOpen(false)}
                className="w-full h-[48px] flex items-center justify-center bg-[#191a1f] border border-[#26272e] uppercase tracking-[0.02em]"
                style={{
                  fontFamily: "var(--font-saira-condensed), sans-serif",
                  fontStyle: "italic",
                  fontWeight: 900,
                  fontSize: "17px",
                  color: "#f4f5f2",
                  boxShadow: "0 4px 0 #000",
                }}
              >
                Withdraw
              </Link>

              <div className="h-px bg-[#26272e] my-2" />

              {/* Game history */}
              <Link
                href="/history"
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-[#191a1f] no-underline"
                onClick={() => setMenuOpen(false)}
              >
                🎯 Game history
              </Link>

              {/* Logout */}
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-[#ff6b6b] hover:bg-[#191a1f] w-full text-left"
              >
                ↩ Log out
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
