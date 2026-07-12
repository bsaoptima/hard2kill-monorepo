"use client"

import { Brand } from "@/components/brand"
import { ArcadeAuthForm } from "@/components/arcade-auth-form"
import { ArcadeAuthValue } from "@/components/arcade-auth-value"

export function ArcadeAuthLayout() {
  return (
    <>
      <style jsx global>{`
        body {
          background: #08090a;
        }
        body::before {
          content: "";
          position: fixed;
          inset: 0;
          background-image: radial-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px);
          background-size: 22px 22px;
          pointer-events: none;
          z-index: 0;
        }
      `}</style>

      <div className="app">
        {/* Header */}
        <header className="flex items-center px-4 sm:px-8 py-3 sm:py-5 border-b border-[#1a1a1a] relative z-10">
          <Brand />
        </header>

        {/* Two-column stage */}
        <div className="stage">
          <ArcadeAuthForm />
          <ArcadeAuthValue />
        </div>
      </div>

      <style jsx>{`
        .app {
          position: relative;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .stage {
          flex: 1;
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          max-width: 1080px;
          width: 100%;
          margin: 0 auto;
        }
        @media (max-width: 820px) {
          .stage {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  )
}
