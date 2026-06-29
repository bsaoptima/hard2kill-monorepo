// Token Contract Configuration
// Base Mainnet:
//   USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (6 decimals)
// Solana Mainnet:
//   SOL: native (9 decimals)
//   USDC: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v (6 decimals)

// Base addresses
export const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;

// Solana addresses (SPL token mints)
export const USDC_ADDRESS_SOLANA = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" as const;

export const STABLECOIN_DECIMALS = 6;

export type ChainType = "evm" | "solana";

// Token configuration with chain info
export interface TokenConfig {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chain: ChainType;
  chainName: string;
  isNative?: boolean; // true for native tokens like SOL
}

// Supported stablecoins for deposits on Base (EVM)
// Note: Only USDC is officially supported on Base. USDT on Base is a bridged token not affiliated with Tether.
export const SUPPORTED_TOKENS_BASE: Record<string, TokenConfig> = {
  USDC: {
    address: USDC_ADDRESS,
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    chain: "evm",
    chainName: "Base",
  },
};

// Supported tokens for deposits on Solana
export const SUPPORTED_TOKENS_SOLANA: Record<string, TokenConfig> = {
  SOL: {
    address: "native", // Native SOL, not an SPL token
    symbol: "SOL",
    name: "Solana",
    decimals: 9,
    chain: "solana",
    chainName: "Solana",
    isNative: true,
  },
  USDC: {
    address: USDC_ADDRESS_SOLANA,
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    chain: "solana",
    chainName: "Solana",
  },
};

// Legacy: Base tokens only (for backward compatibility)
export const SUPPORTED_TOKENS = SUPPORTED_TOKENS_BASE;

export type TokenSymbol = "USDC" | "SOL";

// Legacy export for backward compatibility
export const USDC_DECIMALS = 6;

// Minimal ERC-20 ABI for transfer and balance operations
export const erc20Abi = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "Transfer",
    type: "event",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
] as const;

// Legacy alias
export const usdcAbi = erc20Abi;

// Helper to convert USD amount to token units (6 decimals for stablecoins)
export function parseStablecoin(amount: number, decimals: number = 6): bigint {
  return BigInt(Math.round(amount * 10 ** decimals));
}

// Helper to convert token units to USD amount
export function formatStablecoin(amount: bigint, decimals: number = 6): number {
  return Number(amount) / 10 ** decimals;
}

// Legacy helpers for backward compatibility
export function parseUsdc(amount: number): bigint {
  return parseStablecoin(amount, 6);
}

export function formatUsdc(amount: bigint): number {
  return formatStablecoin(amount, 6);
}

// Get token info by address (works for both EVM and Solana)
export function getTokenByAddress(address: string, chain?: ChainType): TokenConfig | null {
  // Check EVM tokens (case-insensitive)
  if (!chain || chain === "evm") {
    const normalizedEvm = address.toLowerCase();
    for (const token of Object.values(SUPPORTED_TOKENS_BASE)) {
      if (token.address.toLowerCase() === normalizedEvm) {
        return token;
      }
    }
  }

  // Check Solana tokens (case-sensitive - base58)
  if (!chain || chain === "solana") {
    for (const token of Object.values(SUPPORTED_TOKENS_SOLANA)) {
      if (token.address === address) {
        return token;
      }
    }
  }

  return null;
}

// Get tokens for a specific chain
export function getTokensForChain(chain: ChainType): Record<string, TokenConfig> {
  return chain === "solana" ? SUPPORTED_TOKENS_SOLANA : SUPPORTED_TOKENS_BASE;
}
