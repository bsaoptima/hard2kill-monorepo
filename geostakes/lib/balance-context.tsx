"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

interface Balance {
  cash: number;
  bonus: number;
  total: number;
}

interface BalanceContextType {
  balance: Balance | null;
  isLoading: boolean;
  refreshBalance: () => Promise<void>;
}

const BalanceContext = createContext<BalanceContextType | null>(null);

export function BalanceProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/balance");
      if (res.ok) {
        const data = await res.json();
        setBalance(data);
      }
    } catch (error) {
      console.error("Failed to fetch balance:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  return (
    <BalanceContext.Provider value={{ balance, isLoading, refreshBalance }}>
      {children}
    </BalanceContext.Provider>
  );
}

export function useBalance() {
  const context = useContext(BalanceContext);
  if (!context) {
    throw new Error("useBalance must be used within a BalanceProvider");
  }
  return context;
}
