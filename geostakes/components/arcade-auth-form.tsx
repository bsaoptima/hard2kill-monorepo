"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export function ArcadeAuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<'signup' | 'login'>('signup')
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)

  const urlRefCode = searchParams.get("ref")
  const [referralCode] = useState(urlRefCode || "")

  const isSignup = mode === 'signup'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        toast.error(error.message)
      } else {
        router.push("/")
        router.refresh()
      }
    } else {
      const trimmedRef = referralCode.trim()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username.trim() || undefined,
            ...(trimmedRef ? { referral_code: trimmedRef } : {}),
          },
        },
      })
      if (error) {
        toast.error(error.message)
      } else if (data.user) {
        // Record referral
        await fetch("/api/auth/post-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ referralCode: trimmedRef || null }),
        })

        // Track signup in Umami
        if (typeof window !== "undefined" && window.umami) {
          window.umami.track("signup", {
            user_id: data.user.id,
            email: data.user.email || "",
            referral: trimmedRef || "none",
          })
        }

        router.push("/")
        router.refresh()
      }
    }

    setLoading(false)
  }

  return (
    <>
      <div className="formside">
        <div className="card">
          <h1 className="h1">{isSignup ? 'Create account' : 'Welcome back'}</h1>
          <p className="hsub">
            {isSignup
              ? <>Your first deposit is matched <b>100%</b>. Set up in under a minute.</>
              : 'Log in to keep playing and cash out your winnings.'}
          </p>

          {/* OAuth buttons */}
          <div className="oauth">
            <button className="obtn wallet" disabled>
              <svg className="solmark" viewBox="0 0 24 20">
                <path fill="#06180d" d="M4 0h20l-4 5H0zM0 7.5h20l4 5H4zM4 15h20l-4 5H0z" />
              </svg>
              Continue with wallet
              <span className="soon">Soon</span>
            </button>
            <button
              className="obtn"
              onClick={async () => {
                const supabase = createClient()
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                  },
                })
                if (error) {
                  toast.error(error.message)
                }
              }}
              disabled={loading}
            >
              <span className="gG" style={{ color: "#4285F4" }}>G</span>
              Continue with Google
            </button>
          </div>

          {/* Divider */}
          <div className="ordiv">
            <em />
            <span>or with email</span>
            <em />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {isSignup && (
              <div className="field">
                <label>Username</label>
                <div className="inpwrap">
                  <input
                    className="inp"
                    placeholder="Pick a handle"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            <div className="field">
              <label>Email</label>
              <div className="inpwrap">
                <input
                  className="inp"
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="field">
              <label>Password</label>
              <div className="inpwrap">
                <input
                  className="inp"
                  type={showPw ? 'text' : 'password'}
                  placeholder={isSignup ? 'At least 8 characters' : 'Your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={loading}
                />
                <span className="peek" onClick={() => setShowPw(!showPw)}>
                  {showPw ? 'HIDE' : 'SHOW'}
                </span>
              </div>
            </div>

            <div className="rowmeta">
              <span className="remember" onClick={() => setRemember(!remember)}>
                <span className={`box ${remember ? 'on' : ''}`}>
                  {remember ? '✓' : ''}
                </span>
                {isSignup ? 'Email me bonus alerts' : 'Remember me'}
              </span>
              {!isSignup && (
                <a className="forgot" onClick={() => toast.info("Password reset coming soon")}>
                  Forgot?
                </a>
              )}
            </div>

            <button className="submit" type="submit" disabled={loading}>
              {loading ? 'Loading...' : isSignup ? 'Create account →' : 'Log in →'}
            </button>
          </form>

          <div className="toggle">
            {isSignup ? 'Already have an account?' : 'New to Geostakes?'}{' '}
            <a onClick={() => setMode(isSignup ? 'login' : 'signup')}>
              {isSignup ? 'Log in' : 'Create one — free'}
            </a>
          </div>

          <div className="tc">
            <span className="age">🔞 18+ · Play responsibly</span>
          </div>

          <div className="legal">
            {isSignup
              ? 'By creating an account you agree to our Terms & Privacy Policy. Gambling can be addictive.'
              : 'Protected by 256-bit SSL encryption.'}
          </div>
        </div>
      </div>

      <style jsx>{`
        .formside {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 52px 40px;
        }
        .card {
          width: 100%;
          max-width: 400px;
        }
        .h1 {
          font-family: var(--font-saira-condensed), sans-serif;
          font-style: italic;
          font-weight: 900;
          font-size: clamp(38px, 4.6vw, 52px);
          line-height: 0.92;
          letter-spacing: -0.015em;
          text-transform: uppercase;
          margin: 0;
        }
        .hsub {
          font-size: 15px;
          color: #8b8c95;
          margin: 10px 0 26px;
          line-height: 1.5;
        }
        .hsub b {
          color: #39ff6a;
        }
        .oauth {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .obtn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 11px;
          height: 52px;
          font-family: var(--font-space-grotesk), sans-serif;
          font-weight: 700;
          font-size: 15px;
          border: 1px solid #26272e;
          background: #191a1f;
          color: #f4f5f2;
          cursor: pointer;
          box-shadow: 0 4px 0 #000;
          transition: transform 0.08s, border-color 0.12s;
        }
        .obtn:hover:not(:disabled) {
          border-color: #8b8c95;
        }
        .obtn:active:not(:disabled) {
          transform: translateY(3px);
          box-shadow: 0 1px 0 #000;
        }
        .obtn.wallet {
          background: #39ff6a;
          color: #06180d;
          border-color: #39ff6a;
          box-shadow: 0 4px 0 #1c7a3a;
          position: relative;
          opacity: 0.6;
          cursor: not-allowed;
        }
        .obtn.wallet:active {
          box-shadow: 0 1px 0 #1c7a3a;
        }
        .soon {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-family: var(--font-space-mono), monospace;
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #06180d;
          background: rgba(6, 24, 13, 0.16);
          border: 1px solid rgba(6, 24, 13, 0.3);
          padding: 3px 7px;
        }
        .gG {
          font-weight: 800;
          font-size: 17px;
        }
        .solmark {
          width: 19px;
          height: 16px;
        }
        .ordiv {
          display: flex;
          align-items: center;
          gap: 14px;
          margin: 20px 0;
        }
        .ordiv em {
          height: 1px;
          flex: 1;
          background: #26272e;
          font-style: normal;
        }
        .ordiv span {
          font-family: var(--font-space-mono), monospace;
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #8b8c95;
        }
        .field {
          margin-bottom: 14px;
        }
        .field label {
          display: block;
          font-family: var(--font-space-mono), monospace;
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #8b8c95;
          margin-bottom: 7px;
        }
        .inpwrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .inp {
          width: 100%;
          background: #191a1f;
          border: 1px solid #26272e;
          color: #f4f5f2;
          font-family: var(--font-space-grotesk), sans-serif;
          font-size: 15px;
          padding: 14px 16px;
        }
        .inp:focus {
          outline: none;
          border-color: #39ff6a;
        }
        .inp::placeholder {
          color: #8b8c95;
        }
        .peek {
          position: absolute;
          right: 14px;
          font-family: var(--font-space-mono), monospace;
          font-size: 11px;
          color: #8b8c95;
          cursor: pointer;
          letter-spacing: 0.06em;
        }
        .peek:hover {
          color: #f4f5f2;
        }
        .rowmeta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 2px 0 20px;
        }
        .remember {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #8b8c95;
          cursor: pointer;
          user-select: none;
        }
        .box {
          width: 17px;
          height: 17px;
          border: 1px solid #26272e;
          background: #191a1f;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          color: #06180d;
        }
        .box.on {
          background: #39ff6a;
          border-color: #39ff6a;
        }
        .forgot {
          font-size: 13px;
          font-weight: 600;
          color: #39ff6a;
          cursor: pointer;
        }
        .forgot:hover {
          color: #f4f5f2;
        }
        .submit {
          width: 100%;
          font-family: var(--font-saira-condensed), sans-serif;
          font-style: italic;
          font-weight: 900;
          font-size: 22px;
          text-transform: uppercase;
          padding: 18px;
          background: #39ff6a;
          color: #06180d;
          border: none;
          cursor: pointer;
          box-shadow: 0 6px 0 #1c7a3a;
          transition: transform 0.08s, filter 0.12s;
        }
        .submit:hover:not(:disabled) {
          filter: brightness(1.08);
        }
        .submit:active:not(:disabled) {
          transform: translateY(4px);
          box-shadow: 0 2px 0 #1c7a3a;
        }
        .submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .toggle {
          text-align: center;
          font-size: 14px;
          color: #8b8c95;
          margin-top: 22px;
        }
        .toggle a {
          font-weight: 700;
          cursor: pointer;
          color: #39ff6a;
        }
        .toggle a:hover {
          color: #f4f5f2;
        }
        .legal {
          font-family: var(--font-space-mono), monospace;
          font-size: 10px;
          color: #8b8c95;
          text-align: center;
          margin-top: 18px;
          line-height: 1.7;
          letter-spacing: 0.02em;
        }
        .age {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-space-mono), monospace;
          font-size: 10px;
          letter-spacing: 0.08em;
          color: #8b8c95;
          border: 1px solid #26272e;
          padding: 6px 11px;
          margin-top: 16px;
        }
        .tc {
          text-align: center;
        }
        @media (max-width: 820px) {
          .formside {
            padding: 40px 28px 60px;
          }
        }
      `}</style>
    </>
  )
}
