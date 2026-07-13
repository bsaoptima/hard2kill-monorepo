"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "welcomeModalDismissed";

export function WelcomeModal() {
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const checkWelcomeEligibility = async () => {
      // Skip if already dismissed
      if (localStorage.getItem(STORAGE_KEY) === "true") {
        console.log("[WelcomeModal] Skipped: already dismissed in localStorage");
        return;
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.log("[WelcomeModal] Skipped: no user logged in");
        return;
      }

      // Check balance and welcome status
      const res = await fetch("/api/balance");
      if (!res.ok) {
        console.log("[WelcomeModal] Skipped: balance API failed", res.status);
        return;
      }

      const data = await res.json();
      console.log("[WelcomeModal] Balance data:", data);

      // Show modal if: logged in, haven't played welcome rounds, have bonus >= 5
      if (
        data.welcomeRoundsPlayed === 0 &&
        data.bonus >= 5
      ) {
        console.log("[WelcomeModal] Showing modal");
        setShow(true);
      } else {
        console.log("[WelcomeModal] Not showing:", {
          welcomeRoundsPlayed: data.welcomeRoundsPlayed,
          bonus: data.bonus,
        });
      }
    };

    checkWelcomeEligibility();
  }, []);

  const play = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    router.push("/play-solo?stake=1&welcome=true");
  };

  if (!show) return null;

  const tokens = [1, 2, 3, 4, 5];

  return (
    <>
      <style jsx>{`
        .overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(4, 5, 6, 0.8);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          animation: fadein 0.25s ease;
        }
        @keyframes fadein {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .modal {
          position: relative;
          width: 100%;
          max-width: 440px;
          background: #111114;
          border: 1px solid #26272e;
          box-shadow: 0 40px 120px -30px #000;
          animation: pop 0.28s cubic-bezier(0.2, 1.2, 0.4, 1);
        }
        @keyframes pop {
          from {
            transform: translateY(16px) scale(0.97);
            opacity: 0;
          }
          to {
            transform: none;
            opacity: 1;
          }
        }
        .mtop {
          position: relative;
          background: linear-gradient(150deg, #0e2a18, #0a1a10);
          border-bottom: 1px solid color-mix(in srgb, #39ff6a 30%, #26272e);
          padding: 34px 32px 28px;
          text-align: center;
          overflow: hidden;
        }
        .mtop::after {
          content: "";
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(57, 255, 106, 0.1) 1px, transparent 1px);
          background-size: 16px 16px;
          pointer-events: none;
        }
        .mcoin {
          position: relative;
          z-index: 1;
          width: 74px;
          height: 74px;
          margin: 0 auto 14px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Saira Condensed', sans-serif;
          font-style: italic;
          font-weight: 900;
          font-size: 34px;
          color: #3a2600;
          background: linear-gradient(140deg, #ffe08a, #ffc24d 45%, #d98a1a);
          box-shadow: 0 0 34px -4px #ffc24d, inset 0 2px 0 rgba(255, 255, 255, 0.55);
        }
        .mkick {
          position: relative;
          z-index: 1;
          font-family: 'Space Mono', ui-monospace, monospace;
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #39ff6a;
        }
        .mtitle {
          position: relative;
          z-index: 1;
          font-family: 'Saira Condensed', sans-serif;
          font-style: italic;
          font-weight: 900;
          font-size: 44px;
          line-height: 0.9;
          text-transform: uppercase;
          margin: 8px 0 0;
          color: #f4f5f2;
        }
        .mtitle b {
          color: #39ff6a;
          text-shadow: 0 0 30px color-mix(in srgb, #39ff6a 55%, transparent);
        }
        .mbody {
          padding: 26px 32px 30px;
        }
        .mlede {
          font-family: 'Space Grotesk', system-ui, sans-serif;
          font-size: 15px;
          line-height: 1.55;
          color: #c8c9cf;
          text-align: center;
          margin: 0 0 22px;
        }
        .mlede b {
          color: #f4f5f2;
        }
        .mrounds {
          display: flex;
          gap: 8px;
          justify-content: center;
          margin: 0 0 24px;
        }
        .token {
          flex: 1;
          max-width: 58px;
          aspect-ratio: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          background: #191a1f;
          border: 1px solid #26272e;
          font-family: 'Saira Condensed', sans-serif;
          font-style: italic;
          font-weight: 900;
          color: #39ff6a;
          font-size: 18px;
        }
        .token span {
          font-family: 'Space Mono', ui-monospace, monospace;
          font-size: 8px;
          letter-spacing: 0.1em;
          color: #8b8c95;
          font-style: normal;
          font-weight: 400;
          text-transform: uppercase;
        }
        .mcta {
          width: 100%;
          font-family: 'Saira Condensed', sans-serif;
          font-style: italic;
          font-weight: 900;
          font-size: 23px;
          text-transform: uppercase;
          padding: 19px;
          background: #39ff6a;
          color: #06180d;
          border: none;
          cursor: pointer;
          box-shadow: 0 6px 0 #1c7a3a;
          transition: transform 0.08s, filter 0.12s;
        }
        .mcta:hover {
          filter: brightness(1.08);
        }
        .mcta:active {
          transform: translateY(4px);
          box-shadow: 0 2px 0 #1c7a3a;
        }
        .mfine {
          font-family: 'Space Mono', ui-monospace, monospace;
          font-size: 10px;
          color: #8b8c95;
          text-align: center;
          margin-top: 14px;
          line-height: 1.6;
          letter-spacing: 0.03em;
        }
      `}</style>

      <div className="overlay">
        <div className="modal">
          <div className="mtop">
            <div className="mcoin">$</div>
            <div className="mkick">Welcome to Geostakes</div>
            <div className="mtitle">You've got <b>$5 free</b></div>
          </div>
          <div className="mbody">
            <p className="mlede">
              Your account's loaded with <b>$5</b> on the house — that's <b>5 rounds at $1 each</b> to test your skills. No deposit needed to start.
            </p>
            <div className="mrounds">
              {tokens.map((t) => (
                <div key={t} className="token">
                  $1
                  <span>Round {t}</span>
                </div>
              ))}
            </div>
            <button className="mcta" onClick={play}>
              Play my first round →
            </button>
            <div className="mfine">
              Free-play winnings are withdrawable after your first deposit · 18+ where legal
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
