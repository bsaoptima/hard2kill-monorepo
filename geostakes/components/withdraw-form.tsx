"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type DestinationType = "pix" | "crypto_usdc_base" | "bank";

const MIN_WITHDRAWAL = 5;
const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

const TABS: { value: DestinationType; label: string; sublabel: string }[] = [
  { value: "bank", label: "Bank", sublabel: "International (IBAN)" },
  { value: "crypto_usdc_base", label: "USDC", sublabel: "Base network" },
  { value: "pix", label: "PIX", sublabel: "Brazilian instant" },
];

export function WithdrawForm({ balance }: { balance: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState<string>("");
  const [destinationType, setDestinationType] =
    useState<DestinationType>("bank");

  // type-specific fields
  const [pixKey, setPixKey] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [holderName, setHolderName] = useState("");
  const [iban, setIban] = useState("");
  const [bankName, setBankName] = useState("");
  const [swift, setSwift] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const numericAmount = Number(amount);
  const isValidAmount =
    Number.isFinite(numericAmount) &&
    numericAmount >= MIN_WITHDRAWAL &&
    numericAmount <= balance;

  function isDestinationValid(): boolean {
    if (destinationType === "pix") return pixKey.trim().length >= 4;
    if (destinationType === "crypto_usdc_base") {
      return EVM_ADDRESS_RE.test(walletAddress.trim());
    }
    if (destinationType === "bank") {
      const cleanIban = iban.trim().replace(/\s+/g, "");
      return (
        holderName.trim().length >= 2 &&
        bankName.trim().length >= 2 &&
        cleanIban.length >= 8 &&
        cleanIban.length <= 34
      );
    }
    return false;
  }

  const canSubmit = isValidAmount && isDestinationValid() && !submitting;

  function buildDestination() {
    if (destinationType === "pix") {
      return { type: "pix", key: pixKey.trim() };
    }
    if (destinationType === "crypto_usdc_base") {
      return { type: "crypto_usdc_base", address: walletAddress.trim() };
    }
    return {
      type: "bank",
      holderName: holderName.trim(),
      iban: iban.trim().replace(/\s+/g, ""),
      bankName: bankName.trim(),
      ...(swift.trim() ? { swift: swift.trim() } : {}),
    };
  }

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          amount: numericAmount,
          destination: buildDestination(),
        }),
        cache: "no-store",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body?.error ?? "Withdrawal failed");
        return;
      }
      toast.success("Withdrawal request submitted");
      setSubmitted(true);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <div
          className="text-[40px] uppercase italic leading-none mb-3 text-primary"
          style={{ fontFamily: "var(--font-anton), Anton, sans-serif" }}
        >
          On its way
        </div>
        <p className="text-sm text-muted-foreground mb-1">
          Your withdrawal request is being processed.
        </p>
        <p className="text-sm text-muted-foreground">
          You&apos;ll get an email when the funds are sent — typically within
          24 hours.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-5">
      {/* Amount */}
      <div>
        <label className="block text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-mono mb-2">
          Amount (USD)
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
            $
          </span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min={MIN_WITHDRAWAL}
            max={balance}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-background border border-border pl-9 pr-4 py-3 text-xl font-bold tabular-nums rounded-lg focus:border-primary outline-none"
          />
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-[11px] text-muted-foreground font-mono">
            Min ${MIN_WITHDRAWAL}
          </span>
          <button
            type="button"
            onClick={() => setAmount(String(balance.toFixed(2)))}
            className="text-[11px] text-primary font-mono hover:underline"
          >
            Withdraw all (${balance.toFixed(2)})
          </button>
        </div>
      </div>

      {/* Destination type tabs */}
      <div>
        <label className="block text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-mono mb-2">
          Destination
        </label>
        <div className="grid grid-cols-3 gap-2">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setDestinationType(t.value)}
              className={`py-2.5 px-2 rounded-lg text-sm border transition-colors text-left ${
                destinationType === t.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent text-foreground border-border hover:border-muted-foreground"
              }`}
            >
              <div className="font-bold uppercase text-xs tracking-wide">
                {t.label}
              </div>
              <div
                className={`text-[10px] mt-0.5 ${
                  destinationType === t.value
                    ? "opacity-80"
                    : "text-muted-foreground"
                }`}
              >
                {t.sublabel}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Destination-specific fields */}
      {destinationType === "pix" && (
        <div>
          <label className="block text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-mono mb-2">
            PIX key
          </label>
          <input
            type="text"
            value={pixKey}
            onChange={(e) => setPixKey(e.target.value)}
            placeholder="CPF / email / phone / random key"
            className="w-full bg-background border border-border px-4 py-3 text-sm rounded-lg focus:border-primary outline-none"
          />
          <p className="text-[10px] text-muted-foreground font-mono mt-2">
            Any valid PIX key registered to your bank account.
          </p>
        </div>
      )}

      {destinationType === "crypto_usdc_base" && (
        <div>
          <label className="block text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-mono mb-2">
            USDC wallet address (Base network)
          </label>
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="0x…"
            className="w-full bg-background border border-border px-4 py-3 text-xs font-mono rounded-lg focus:border-primary outline-none"
          />
          <p className="text-[10px] text-muted-foreground font-mono mt-2">
            We only support USDC on Base. Sending to the wrong network loses
            funds permanently — double-check your wallet address.
          </p>
        </div>
      )}

      {destinationType === "bank" && (
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-mono mb-2">
              Account holder name
            </label>
            <input
              type="text"
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              placeholder="Full name as on bank account"
              className="w-full bg-background border border-border px-4 py-3 text-sm rounded-lg focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-mono mb-2">
              IBAN / account number
            </label>
            <input
              type="text"
              value={iban}
              onChange={(e) => setIban(e.target.value.toUpperCase())}
              placeholder="DE89 3704 0044 0532 0130 00"
              className="w-full bg-background border border-border px-4 py-3 text-xs font-mono rounded-lg focus:border-primary outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-mono mb-2">
                Bank name
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. Caixa, BBVA, BNP"
                className="w-full bg-background border border-border px-4 py-3 text-sm rounded-lg focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-mono mb-2">
                SWIFT / BIC <span className="opacity-60">(optional)</span>
              </label>
              <input
                type="text"
                value={swift}
                onChange={(e) => setSwift(e.target.value.toUpperCase())}
                placeholder="BNPAFRPP"
                className="w-full bg-background border border-border px-4 py-3 text-xs font-mono rounded-lg focus:border-primary outline-none"
              />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono">
            International bank transfers take 1-3 business days. We process
            via Wise / SEPA depending on your bank.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl text-base font-bold uppercase tracking-[0.04em] disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-105 hover:-translate-y-px transition-all"
      >
        {submitting
          ? "Submitting…"
          : `Withdraw $${(numericAmount || 0).toFixed(2)}`}
      </button>

      <div className="text-[11px] text-muted-foreground font-mono leading-relaxed pt-2 border-t border-border">
        Withdrawals are reviewed and processed manually. Balance is held while
        the request is pending. Typical turnaround: under 24 hours for PIX and
        USDC; 1-3 business days for bank. Rejected requests are refunded
        automatically.
      </div>
    </div>
  );
}
