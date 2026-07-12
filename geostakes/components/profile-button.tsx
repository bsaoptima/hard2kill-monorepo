"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export function ProfileButton({
  username,
  balance
}: {
  username: string
  balance: number
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [menuOpen])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setMenuOpen(false)
    router.refresh()
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        className="h-[44px] px-[18px] gap-[9px] bg-[#191a1f] border border-[#26272e] text-[#f4f5f2] uppercase tracking-[0.02em] flex items-center justify-center transition-all hover:border-[#8b8c95] active:translate-y-[3px]"
        style={{
          fontFamily: "var(--font-saira-condensed), sans-serif",
          fontStyle: "italic",
          fontWeight: 900,
          fontSize: "15px",
          boxShadow: "0 4px 0 #000",
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.boxShadow = "0 1px 0 #000"
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.boxShadow = "0 4px 0 #000"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "0 4px 0 #000"
          e.currentTarget.style.transform = ""
        }}
      >
        <span className="w-[7px] h-[7px] rounded-full bg-[#39ff6a] shadow-[0_0_8px_#39ff6a]" />
        Profile
      </button>

      {menuOpen && (
        <div className="absolute top-[52px] right-0 bg-[#111114] border border-[#26272e] min-w-[210px] p-2 shadow-[0_24px_60px_-24px_#000] z-50">
          <div className="px-3 py-2 pb-3 border-b border-[#26272e] mb-1.5">
            <div className="font-bold text-sm">{username}</div>
            <div className="font-mono text-[11px] text-[#8b8c95] tracking-wider mt-0.5">
              ${balance.toFixed(2)} available
            </div>
          </div>

          <Link
            href="/history"
            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-foreground hover:bg-[#191a1f] no-underline"
            onClick={() => setMenuOpen(false)}
          >
            🎯 Game history
          </Link>

          <div className="h-px bg-[#26272e] my-1.5" />

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-[#ff6b6b] hover:bg-[#191a1f] w-full text-left"
          >
            ↩ Log out
          </button>
        </div>
      )}
    </div>
  )
}
