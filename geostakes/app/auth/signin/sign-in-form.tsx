"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Referral code - pre-filled from URL (?ref=CODE) or manually entered
  const urlRefCode = searchParams.get("ref");
  const [referralCode, setReferralCode] = useState(urlRefCode || "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    const supabase = createClient();

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        router.push("/");
        router.refresh();
      }
    } else {
      const trimmedRef = referralCode.trim();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: trimmedRef ? { referral_code: trimmedRef } : undefined,
        },
      });
      if (error) {
        setError(error.message);
      } else {
        setInfo("Check your email to confirm your account.");
      }
    }

    setLoading(false);
  }

  return (
    <>
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-[22px] font-extrabold">{isLogin ? "Login" : "Sign up"}</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          disabled={loading}
        />
      </div>

      {!isLogin && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="referral" className="text-muted-foreground">
            Referral Code <span className="text-xs">(optional)</span>
          </Label>
          <Input
            id="referral"
            type="text"
            placeholder="e.g. NINJA"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            disabled={loading}
          />
        </div>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {info ? (
        <p className="text-sm text-muted-foreground">{info}</p>
      ) : null}

      <Button type="submit" disabled={loading || !email || !password}>
        {loading ? "Loading..." : isLogin ? "Login" : "Sign up"}
      </Button>

      <button
        type="button"
        onClick={() => {
          setIsLogin(!isLogin);
          setError(null);
          setInfo(null);
        }}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {isLogin
          ? "Don't have an account? Sign up"
          : "Already have an account? Login"}
      </button>
      </form>
    </>
  );
}
