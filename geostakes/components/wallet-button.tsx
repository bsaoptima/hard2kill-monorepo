"use client";

import { useAppKitAccount } from "@reown/appkit/react";

export function WalletButton() {
  return (
    <div className="flex items-center">
      {/* AppKit's built-in button handles connect/disconnect UI */}
      <appkit-button size="sm" balance="hide" />
    </div>
  );
}

// Hook to get wallet connection state for use in other components
export function useWalletConnection() {
  const { address, isConnected, status } = useAppKitAccount();
  return { address, isConnected, status };
}
