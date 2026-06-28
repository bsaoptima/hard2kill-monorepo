import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { base } from "@reown/appkit/networks";
import type { AppKitNetwork } from "@reown/appkit/networks";

// Project ID from Reown dashboard
export const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  "6b658aba2ff0f806b39bd11fae1feef5";

// Networks to support (Base only for now)
export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [base];

// Wagmi adapter with SSR support for Next.js
export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true,
});

// App metadata for wallet display
export const metadata = {
  name: "Geostakes",
  description: "Skill-based GeoGuessr wagering",
  url: "https://geostakes.gg",
  icons: ["https://geostakes.gg/icon.png"],
};

// Platform wallet address for receiving deposits
export const PLATFORM_WALLET_ADDRESS =
  process.env.NEXT_PUBLIC_PLATFORM_WALLET ||
  "0x81c3dE450C097ecdD879dF7E3f6603C7b538938c";

// USDC contract address on Base mainnet
export const USDC_CONTRACT_ADDRESS =
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// USDC has 6 decimals
export const USDC_DECIMALS = 6;
