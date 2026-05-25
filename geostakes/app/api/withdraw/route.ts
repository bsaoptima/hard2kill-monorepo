import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requestWithdrawal,
  type Destination,
  type DestinationType,
} from "@/lib/withdrawals";

export const runtime = "nodejs";

/**
 * POST /api/withdraw
 *
 * Body: {
 *   amount: number,
 *   destination: {
 *     type: 'pix' | 'crypto_usdc_base' | 'bank',
 *     // pix:               { key }
 *     // crypto_usdc_base:  { address }
 *     // bank:              { holderName, iban, bankName, swift?, country? }
 *   }
 * }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const amount = Number(body?.amount);
  const rawDestination = body?.destination;

  if (
    !rawDestination ||
    typeof rawDestination !== "object" ||
    typeof rawDestination.type !== "string"
  ) {
    return NextResponse.json(
      { error: "Missing destination" },
      { status: 400 },
    );
  }

  const dt = rawDestination.type as DestinationType;
  let destination: Destination;
  if (dt === "pix") {
    destination = { type: "pix", key: String(rawDestination.key ?? "") };
  } else if (dt === "crypto_usdc_base") {
    destination = {
      type: "crypto_usdc_base",
      address: String(rawDestination.address ?? ""),
    };
  } else if (dt === "bank") {
    destination = {
      type: "bank",
      holderName: String(rawDestination.holderName ?? ""),
      iban: String(rawDestination.iban ?? ""),
      bankName: String(rawDestination.bankName ?? ""),
      swift: rawDestination.swift
        ? String(rawDestination.swift)
        : undefined,
      country: rawDestination.country
        ? String(rawDestination.country)
        : undefined,
    };
  } else {
    return NextResponse.json(
      { error: "Invalid destination type" },
      { status: 400 },
    );
  }

  const result = await requestWithdrawal({
    userId: user.id,
    userEmail: user.email,
    amount,
    destination,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
