"use client";

import { createAppKit } from "@reown/appkit/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { projectId, networks, solanaAdapter, metadata } from "@/lib/wagmi";

// Create AppKit instance at module level (runs once)
createAppKit({
  adapters: [solanaAdapter],
  networks,
  projectId,
  metadata,
  features: {
    analytics: false,
    email: false,
    socials: [],
  },
  themeMode: "dark",
});

export function Web3Provider({
  children,
}: {
  children: ReactNode;
  cookies?: string | null;
}) {
  // Create QueryClient inside component to avoid SSR issues
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
