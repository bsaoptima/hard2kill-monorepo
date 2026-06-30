"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useAppKit, useAppKitAccount, useAppKitNetwork, useAppKitProvider, useDisconnect } from "@reown/appkit/react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useAppKitConnection } from "@reown/appkit-adapter-solana/react";
import type { Provider } from "@reown/appkit-utils/solana";
import { Wallet, ExternalLink, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  SUPPORTED_TOKENS_BASE,
  SUPPORTED_TOKENS_SOLANA,
  erc20Abi,
  parseStablecoin,
  formatStablecoin,
  getTokensForChain,
  type TokenConfig,
  type ChainType,
} from "@/lib/contracts/usdc";
import {
  PLATFORM_WALLET_ADDRESS,
  PLATFORM_WALLET_ADDRESS_SOLANA,
  BASE_CHAIN_ID,
  SOLANA_CHAIN_ID,
} from "@/lib/wagmi";
import { DepositMatchBanner } from "./deposit-match-banner";
import { Gift } from "lucide-react";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const QUICK_AMOUNTS = [5, 10, 20, 50, 100, 250];
const QUICK_AMOUNTS_SOL = [0.1, 0.25, 0.5, 1, 2, 5]; // SOL amounts
const MIN_DEPOSIT = 1;
const MAX_DEPOSIT = 5000;
const MAX_BONUS = 10;

function calculateBonus(depositAmount: number): number {
  if (depositAmount <= 0) return 0;
  const bonus = depositAmount * 1.0; // 100% match
  return Math.min(bonus, MAX_BONUS);
}

// Solana connection
const solanaConnection = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("mainnet-beta")
);

export function CryptoDepositForm() {
  const [amount, setAmount] = useState<string>("");
  const [selectedTokenKey, setSelectedTokenKey] = useState<string>("USDC");
  const [bonusEligible, setBonusEligible] = useState<boolean | null>(null);
  const [crediting, setCrediting] = useState(false);
  const [solanaBalance, setSolanaBalance] = useState<number | null>(null);
  const [solanaTxHash, setSolanaTxHash] = useState<string | null>(null);
  const [solanaTxStatus, setSolanaTxStatus] = useState<"idle" | "signing" | "confirming" | "confirmed" | "error">("idle");
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [allBalances, setAllBalances] = useState<Record<string, number>>({});

  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { chainId, caipNetworkId } = useAppKitNetwork();
  const { disconnect } = useDisconnect();

  // Solana provider
  const { walletProvider: solanaWalletProvider } = useAppKitProvider<Provider>("solana");

  // Determine if connected wallet is Solana or EVM
  const isSolana = useMemo(() => {
    // Check if caipNetworkId contains solana
    if (caipNetworkId?.includes("solana")) return true;
    // Or check if chainId matches Solana mainnet
    if (chainId === SOLANA_CHAIN_ID) return true;
    // Or if address looks like a Solana address (base58, 32-44 chars, no 0x prefix)
    if (address && !address.startsWith("0x") && address.length >= 32 && address.length <= 44) return true;
    return false;
  }, [chainId, caipNetworkId, address]);

  const chainType: ChainType = isSolana ? "solana" : "evm";
  const supportedTokens = getTokensForChain(chainType);
  const token: TokenConfig = supportedTokens[selectedTokenKey] || Object.values(supportedTokens)[0];

  // EVM: Read user's token balance
  const { data: evmTokenBalance, refetch: refetchEvmBalance } = useReadContract({
    address: token.address as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address && !isSolana },
  });

  // Fetch SOL price
  useEffect(() => {
    async function fetchSolPrice() {
      try {
        const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
        const data = await res.json();
        setSolPrice(data.solana.usd);
      } catch (error) {
        console.error("Failed to fetch SOL price:", error);
      }
    }
    fetchSolPrice();
    // Refresh price every 30 seconds
    const interval = setInterval(fetchSolPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  // Solana: Fetch token/SOL balance for selected token
  useEffect(() => {
    if (!isSolana || !address) {
      setSolanaBalance(null);
      return;
    }

    async function fetchSolanaBalance() {
      try {
        const walletPubkey = new PublicKey(address!);

        if (token.isNative) {
          // Fetch native SOL balance
          const balance = await solanaConnection.getBalance(walletPubkey);
          setSolanaBalance(balance / LAMPORTS_PER_SOL);
        } else {
          // Fetch SPL token balance
          const mintPubkey = new PublicKey(token.address);
          const ata = await getAssociatedTokenAddress(mintPubkey, walletPubkey);
          const balance = await solanaConnection.getTokenAccountBalance(ata);
          setSolanaBalance(Number(balance.value.uiAmount));
        }
      } catch {
        // Token account might not exist
        setSolanaBalance(0);
      }
    }

    fetchSolanaBalance();
  }, [isSolana, address, token.address, token.isNative]);

  // Fetch ALL token balances for the connected wallet
  useEffect(() => {
    if (!address || !isConnected) {
      setAllBalances({});
      return;
    }

    async function fetchAllBalances() {
      const balances: Record<string, number> = {};

      if (isSolana) {
        // Fetch all Solana balances
        try {
          const walletPubkey = new PublicKey(address!);

          // SOL balance
          const solBalance = await solanaConnection.getBalance(walletPubkey);
          balances["SOL"] = solBalance / LAMPORTS_PER_SOL;

          // USDC balance
          try {
            const usdcMint = new PublicKey(SUPPORTED_TOKENS_SOLANA.USDC.address);
            const usdcAta = await getAssociatedTokenAddress(usdcMint, walletPubkey);
            const usdcBalance = await solanaConnection.getTokenAccountBalance(usdcAta);
            balances["USDC"] = Number(usdcBalance.value.uiAmount) || 0;
          } catch {
            balances["USDC"] = 0;
          }
        } catch (error) {
          console.error("Failed to fetch Solana balances:", error);
        }
      } else {
        // Fetch all Base (EVM) balances
        // For EVM, we only support USDC currently, and the balance is fetched via useReadContract
        // We'll get it from evmTokenBalance when available
      }

      setAllBalances(balances);
    }

    fetchAllBalances();
  }, [address, isConnected, isSolana]);

  // EVM: Write contract for transfer
  const {
    data: evmTxHash,
    error: writeError,
    isPending: isWriting,
    writeContract,
    reset: resetWrite,
  } = useWriteContract();

  // EVM: Wait for transaction confirmation
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError,
  } = useWaitForTransactionReceipt({ hash: evmTxHash });

  // Check bonus eligibility on mount
  useEffect(() => {
    checkBonusEligibility();
  }, []);

  // Handle EVM transaction confirmation - credit balance
  useEffect(() => {
    if (isConfirmed && evmTxHash && !crediting) {
      creditBalance(evmTxHash, "base");
    }
  }, [isConfirmed, evmTxHash]);

  // Handle Solana transaction confirmation
  useEffect(() => {
    if (solanaTxStatus === "confirmed" && solanaTxHash && !crediting) {
      creditBalance(solanaTxHash, "solana");
    }
  }, [solanaTxStatus, solanaTxHash]);

  async function checkBonusEligibility() {
    try {
      const res = await fetch("/api/bonus/eligibility");
      if (res.ok) {
        const data = await res.json();
        setBonusEligible(data.eligible);
      }
    } catch (error) {
      console.error("Failed to check bonus eligibility:", error);
    }
  }

  async function creditBalance(hash: string, chain: "base" | "solana") {
    setCrediting(true);
    try {
      const res = await fetch("/api/crypto/deposit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          txHash: hash,
          expectedAmount: numericAmount,
          token: selectedTokenKey,
          chain,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to credit balance");
        return;
      }

      toast.success(`$${data.credited.toFixed(2)} added to your balance!`);
      setAmount("");
      if (isSolana) {
        setSolanaTxHash(null);
        setSolanaTxStatus("idle");
        // Refetch Solana balance
        if (address) {
          const walletPubkey = new PublicKey(address);
          if (token.isNative) {
            const balance = await solanaConnection.getBalance(walletPubkey);
            setSolanaBalance(balance / LAMPORTS_PER_SOL);
          } else {
            const mintPubkey = new PublicKey(token.address);
            const ata = await getAssociatedTokenAddress(mintPubkey, walletPubkey);
            const balance = await solanaConnection.getTokenAccountBalance(ata);
            setSolanaBalance(Number(balance.value.uiAmount));
          }
        }
      } else {
        resetWrite();
        refetchEvmBalance();
      }
    } catch (error) {
      toast.error("Failed to credit balance. Please contact support.");
      console.error("Credit error:", error);
    } finally {
      setCrediting(false);
    }
  }

  const numericAmount = Number(amount);
  const walletBalance = isSolana
    ? (solanaBalance ?? 0)
    : (evmTokenBalance ? formatStablecoin(evmTokenBalance, token.decimals) : 0);

  // For SOL, calculate USD value
  const isNativeToken = token.isNative;
  const usdValue = isNativeToken && solPrice ? numericAmount * solPrice : numericAmount;
  const minAmountInToken = isNativeToken && solPrice ? MIN_DEPOSIT / solPrice : MIN_DEPOSIT;
  const maxAmountInToken = isNativeToken && solPrice ? MAX_DEPOSIT / solPrice : MAX_DEPOSIT;

  const isValid =
    Number.isFinite(numericAmount) &&
    numericAmount > 0 &&
    usdValue >= MIN_DEPOSIT &&
    usdValue <= MAX_DEPOSIT &&
    numericAmount <= walletBalance;

  const isWrongNetwork = isConnected && !isSolana && chainId !== BASE_CHAIN_ID;
  const isBusy = isWriting || isConfirming || crediting || solanaTxStatus === "signing" || solanaTxStatus === "confirming";
  const canSubmit = isValid && isConnected && !isBusy && !isWrongNetwork && (!isNativeToken || solPrice !== null);

  const bonusAmount = bonusEligible ? calculateBonus(usdValue) : 0;
  const totalAmount = usdValue + bonusAmount;

  // Get active transaction hash for display
  const activeTxHash = isSolana ? solanaTxHash : evmTxHash;
  const activeIsConfirming = isSolana ? solanaTxStatus === "confirming" : isConfirming;
  const activeIsConfirmed = isSolana ? solanaTxStatus === "confirmed" : isConfirmed;
  const activeError = isSolana ? (solanaTxStatus === "error" ? new Error("Transaction failed") : null) : (writeError || confirmError);

  async function handleSolanaDeposit() {
    if (!solanaWalletProvider || !address) return;

    setSolanaTxStatus("signing");
    try {
      const senderPubkey = new PublicKey(address);
      const recipientPubkey = new PublicKey(PLATFORM_WALLET_ADDRESS_SOLANA);

      let tx: Transaction;

      if (token.isNative) {
        // Native SOL transfer
        const lamports = Math.round(numericAmount * LAMPORTS_PER_SOL);
        const transferIx = SystemProgram.transfer({
          fromPubkey: senderPubkey,
          toPubkey: recipientPubkey,
          lamports,
        });
        tx = new Transaction().add(transferIx);
      } else {
        // SPL token transfer
        const mintPubkey = new PublicKey(token.address);
        const senderAta = await getAssociatedTokenAddress(mintPubkey, senderPubkey);
        const recipientAta = await getAssociatedTokenAddress(mintPubkey, recipientPubkey);

        const transferIx = createTransferInstruction(
          senderAta,
          recipientAta,
          senderPubkey,
          BigInt(Math.round(numericAmount * 10 ** token.decimals)),
          [],
          TOKEN_PROGRAM_ID
        );
        tx = new Transaction().add(transferIx);
      }

      tx.feePayer = senderPubkey;
      const { blockhash } = await solanaConnection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;

      // Sign and send
      const signedTx = await solanaWalletProvider.signTransaction(tx);
      const signature = await solanaConnection.sendRawTransaction(signedTx.serialize());

      setSolanaTxHash(signature);
      setSolanaTxStatus("confirming");

      // Wait for confirmation
      const confirmation = await solanaConnection.confirmTransaction(signature, "confirmed");
      if (confirmation.value.err) {
        setSolanaTxStatus("error");
        toast.error("Transaction failed on-chain");
      } else {
        setSolanaTxStatus("confirmed");
      }
    } catch (error) {
      console.error("Solana deposit error:", error);
      setSolanaTxStatus("error");
      toast.error(error instanceof Error ? error.message : "Failed to send transaction");
    }
  }

  function handleDeposit() {
    if (!canSubmit || !address) return;

    if (isSolana) {
      handleSolanaDeposit();
    } else {
      writeContract({
        address: token.address as `0x${string}`,
        abi: erc20Abi,
        functionName: "transfer",
        args: [PLATFORM_WALLET_ADDRESS as `0x${string}`, parseStablecoin(numericAmount, token.decimals)],
      });
    }
  }

  // Show connect wallet state
  if (!isConnected) {
    return (
      <div className="space-y-4">
        {bonusEligible && <DepositMatchBanner />}

        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div className="text-center py-8">
            <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Connect your wallet to deposit crypto directly.
            </p>
            <button
              onClick={() => open()}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-xl text-base font-bold uppercase tracking-[0.04em] hover:brightness-105 hover:-translate-y-px transition-all"
            >
              Connect Wallet
            </button>
          </div>

          <div className="text-[11px] text-muted-foreground font-mono leading-relaxed pt-4 border-t border-border">
            Deposit USDC on Base, or SOL/USDC on Solana. Funds appear in your balance
            within seconds of blockchain confirmation.
          </div>
        </div>
      </div>
    );
  }

  // Wrong network warning (EVM only)
  if (isWrongNetwork) {
    return (
      <div className="space-y-4">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Wrong Network</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Please switch to Base or Solana to deposit.
            </p>
            <button
              onClick={() => open({ view: "Networks" })}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-xl text-base font-bold uppercase tracking-[0.04em] hover:brightness-105 hover:-translate-y-px transition-all"
            >
              Switch Network
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bonusEligible && <DepositMatchBanner />}

      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        {/* Connected Wallet Info */}
        <div className="p-3 bg-background rounded-lg border border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">
                  Connected on {isSolana ? "Solana" : "Base"}
                </div>
                <div className="font-mono text-sm">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </div>
              </div>
            </div>
            <button
              onClick={() => disconnect()}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border hover:border-muted-foreground transition-colors"
            >
              Disconnect
            </button>
          </div>

          {/* Wallet Balances */}
          <div className="pt-2 border-t border-border">
            <div className="text-xs text-muted-foreground mb-2">Wallet Balances</div>
            <div className="flex flex-wrap gap-3">
              {isSolana ? (
                <>
                  <div className="flex items-center gap-2 bg-card px-3 py-1.5 rounded-lg border border-border">
                    <span className="text-sm font-medium">SOL</span>
                    <span className="font-bold tabular-nums">
                      {(allBalances["SOL"] ?? 0).toFixed(4)}
                    </span>
                    {solPrice && (
                      <span className="text-xs text-muted-foreground">
                        (~${((allBalances["SOL"] ?? 0) * solPrice).toFixed(2)})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 bg-card px-3 py-1.5 rounded-lg border border-border">
                    <span className="text-sm font-medium">USDC</span>
                    <span className="font-bold tabular-nums">
                      ${(allBalances["USDC"] ?? 0).toFixed(2)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 bg-card px-3 py-1.5 rounded-lg border border-border">
                  <span className="text-sm font-medium">USDC</span>
                  <span className="font-bold tabular-nums">
                    ${walletBalance.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Token Selector */}
        <div>
          <label className="block text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-mono mb-2">
            Token ({isSolana ? "Solana" : "Base"})
          </label>
          <div className="flex gap-2">
            {Object.keys(supportedTokens).map((tokenKey) => (
              <button
                key={tokenKey}
                type="button"
                onClick={() => setSelectedTokenKey(tokenKey)}
                disabled={isBusy}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold border transition-colors disabled:opacity-50 ${
                  selectedTokenKey === tokenKey
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-foreground border-border hover:border-muted-foreground"
                }`}
              >
                {supportedTokens[tokenKey].symbol}
              </button>
            ))}
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-mono mb-2">
            Amount ({token.symbol})
            {isNativeToken && solPrice && (
              <span className="text-muted-foreground ml-2">@ ${solPrice.toFixed(2)}/SOL</span>
            )}
          </label>
          <div className="relative">
            {!isNativeToken && (
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                $
              </span>
            )}
            <input
              type="number"
              inputMode="decimal"
              step={isNativeToken ? "0.01" : "1"}
              min={isNativeToken ? minAmountInToken : MIN_DEPOSIT}
              max={Math.min(isNativeToken ? maxAmountInToken : MAX_DEPOSIT, walletBalance)}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              disabled={isBusy}
              className={`w-full bg-background border border-border ${isNativeToken ? "pl-4" : "pl-9"} pr-4 py-3 text-xl font-bold tabular-nums rounded-lg focus:border-primary outline-none disabled:opacity-50`}
            />
            {isNativeToken && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                SOL
              </span>
            )}
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-[11px] text-muted-foreground font-mono">
              {isNativeToken ? (
                <>Min ~{minAmountInToken.toFixed(3)} SOL, max ~{Math.min(maxAmountInToken, walletBalance).toFixed(3)} SOL</>
              ) : (
                <>Min ${MIN_DEPOSIT}, max ${Math.min(MAX_DEPOSIT, walletBalance).toLocaleString()}</>
              )}
            </span>
            {numericAmount > walletBalance && (
              <span className="text-[11px] text-red-500 font-mono">Insufficient balance</span>
            )}
          </div>
          {isNativeToken && numericAmount > 0 && solPrice && (
            <div className="text-sm text-muted-foreground mt-1">
              ≈ ${usdValue.toFixed(2)} USD
            </div>
          )}
        </div>

        {/* Quick Amounts */}
        <div>
          <label className="block text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-mono mb-2">
            Quick amounts
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(isNativeToken ? QUICK_AMOUNTS_SOL : QUICK_AMOUNTS).filter((a) => a <= walletBalance).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAmount(String(a))}
                disabled={isBusy}
                className={`py-2.5 rounded-lg text-base font-bold tabular-nums border transition-colors disabled:opacity-50 ${
                  numericAmount === a
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-foreground border-border hover:border-muted-foreground"
                }`}
              >
                {isNativeToken ? `${a} SOL` : `$${a}`}
              </button>
            ))}
          </div>
        </div>

        {/* Bonus Calculator */}
        {bonusEligible && numericAmount > 0 && usdValue >= MIN_DEPOSIT && (
          <div className="rounded-lg bg-green-500/5 border border-green-500/20 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-green-500 mb-3">
              <Gift className="w-4 h-4" />
              <span>First Deposit Bonus</span>
            </div>

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Your deposit:</span>
                <span className="font-bold tabular-nums">
                  {isNativeToken ? `${numericAmount} SOL (~$${usdValue.toFixed(2)})` : `$${usdValue.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-500 font-medium">100% match bonus:</span>
                <span className="font-bold tabular-nums text-green-500">
                  +${bonusAmount.toFixed(2)}
                </span>
              </div>
              <div className="h-px bg-border my-2"></div>
              <div className="flex justify-between text-base">
                <span className="font-semibold">Total to play with:</span>
                <span className="font-bold tabular-nums text-primary">
                  ${totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Status */}
        {activeTxHash && (
          <div className={`rounded-lg p-4 ${activeIsConfirmed ? "bg-green-500/10 border border-green-500/20" : "bg-blue-500/10 border border-blue-500/20"}`}>
            <div className="flex items-center gap-2 mb-2">
              {activeIsConfirming ? (
                <>
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium text-blue-500">Confirming transaction...</span>
                </>
              ) : activeIsConfirmed ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-green-500">
                    {crediting ? "Crediting balance..." : "Transaction confirmed!"}
                  </span>
                </>
              ) : null}
            </div>
            <a
              href={isSolana ? `https://solscan.io/tx/${activeTxHash}` : `https://basescan.org/tx/${activeTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-mono"
            >
              {activeTxHash.slice(0, 10)}...{activeTxHash.slice(-8)}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Error Display */}
        {activeError && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
            <div className="flex items-center gap-2 text-red-500 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{activeError.message || "Transaction failed"}</span>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleDeposit}
          disabled={!canSubmit}
          className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl text-base font-bold uppercase tracking-[0.04em] disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-105 hover:-translate-y-px transition-all"
        >
          {isWriting || solanaTxStatus === "signing"
            ? "Confirm in wallet..."
            : activeIsConfirming
            ? "Confirming..."
            : crediting
            ? "Crediting balance..."
            : bonusEligible && bonusAmount > 0
            ? `Deposit ${isNativeToken ? `${numericAmount} SOL` : `$${usdValue.toFixed(2)}`} → Get $${totalAmount.toFixed(2)}`
            : isNativeToken
            ? `Deposit ${numericAmount || 0} SOL (~$${usdValue.toFixed(2)})`
            : `Deposit $${(numericAmount || 0).toFixed(2)} ${token.symbol}`}
        </button>

        <div className="text-[11px] text-muted-foreground font-mono leading-relaxed pt-2 border-t border-border">
          Direct transfer on {isSolana ? "Solana" : "Base"}. Funds appear in your balance within
          seconds of blockchain confirmation. No fees beyond gas.
        </div>
      </div>
    </div>
  );
}
