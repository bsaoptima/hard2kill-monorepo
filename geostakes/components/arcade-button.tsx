"use client"

import Link from "next/link"
import { MouseEvent } from "react"

export function ArcadeButton({
  href,
  children
}: {
  href: string
  children: React.ReactNode
}) {
  const handleMouseEnter = (e: MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.filter = "brightness(1.08)"
  }

  const handleMouseLeave = (e: MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.filter = "brightness(1)"
  }

  const handleMouseDown = (e: MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.transform = "translateY(3px)"
    e.currentTarget.style.boxShadow = "0 1px 0 #1c7a3a"
  }

  const handleMouseUp = (e: MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.transform = "translateY(0)"
    e.currentTarget.style.boxShadow = "0 4px 0 #1c7a3a"
  }

  return (
    <Link
      href={href}
      className="border-none h-[44px] px-3 sm:px-5 uppercase tracking-[0.01em] cursor-pointer inline-flex items-center justify-center"
      style={{
        fontFamily: "var(--font-saira-condensed), sans-serif",
        fontStyle: "italic",
        fontWeight: 900,
        fontSize: "15px",
        background: "#39ff6a",
        color: "#06180d",
        boxShadow: "0 4px 0 #1c7a3a",
        transition: "transform 0.08s, filter 0.12s",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {children}
    </Link>
  )
}
