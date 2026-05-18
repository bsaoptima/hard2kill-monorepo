"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function DepositToast() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deposit = searchParams.get("deposit");

  useEffect(() => {
    if (!deposit) return;
    if (deposit === "success") {
      toast.success("Deposit received. Balance updates within a few seconds.");
    } else if (deposit === "cancelled") {
      toast("Deposit cancelled.");
    }
    router.replace("/");
    router.refresh();
  }, [deposit, router]);

  return null;
}
