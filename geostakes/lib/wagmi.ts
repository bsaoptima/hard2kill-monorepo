import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { SolanaAdapter } from "@reown/appkit-adapter-solana/react";
import { base, solana } from "@reown/appkit/networks";
import type { AppKitNetwork } from "@reown/appkit/networks";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";

// Project ID from Reown dashboard
export const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  "6b658aba2ff0f806b39bd11fae1feef5";

// Networks to support
export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [base, solana];

// Wagmi adapter for EVM chains (Base)
export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true,
});

// Solana adapter with popular wallet adapters
export const solanaAdapter = new SolanaAdapter({
  wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
});

// App metadata for wallet display
export const metadata = {
  name: "Geostakes",
  description: "Skill-based GeoGuessr wagering",
  url: "https://www.geostakes.com",
  icons: ["https://www.geostakes.com/icon.png"],
};

// Platform wallet addresses for receiving deposits
export const PLATFORM_WALLET_ADDRESS =
  process.env.NEXT_PUBLIC_PLATFORM_WALLET ||
  "0x81c3dE450C097ecdD879dF7E3f6603C7b538938c";

export const PLATFORM_WALLET_ADDRESS_SOLANA =
  process.env.NEXT_PUBLIC_PLATFORM_WALLET_SOLANA ||
  "96s3cBjh6EKZ5kQnEBP4n38F9wG5SzDTevyEYayuyyp3";

// Chain IDs
export const BASE_CHAIN_ID = 8453;
export const SOLANA_CHAIN_ID = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"; // Solana mainnet

// Legacy exports for backward compatibility
export const USDC_CONTRACT_ADDRESS =
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const USDC_DECIMALS = 6;
