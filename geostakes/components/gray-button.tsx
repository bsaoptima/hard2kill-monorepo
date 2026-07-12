"use client"

import Link from "next/link"
import { MouseEvent } from "react"

export function GrayButton({ href, children }: { href: string; children: React.ReactNode }) {
  const handleMouseDown = (e: MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.boxShadow = "0 1px 0 #000"
  }

  const handleMouseUp = (e: MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.boxShadow = "0 4px 0 #000"
  }

  const handleMouseLeave = (e: MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.boxShadow = "0 4px 0 #000"
    e.currentTarget.style.transform = ""
  }

  return (
    <Link
      href={href}
      className="hidden lg:inline-flex items-center justify-center h-[44px] bg-[#191a1f] text-[#f4f5f2] border border-[#26272e] px-5 uppercase tracking-[0.02em] transition-all hover:border-[#8b8c95] active:translate-y-[3px]"
      style={{
        fontFamily: "var(--font-saira-condensed), sans-serif",
        fontStyle: "italic",
        fontWeight: 900,
        fontSize: "15px",
        boxShadow: "0 4px 0 #000",
      }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </Link>
  )
}
