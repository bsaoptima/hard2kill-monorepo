import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { creditCash, recordTransaction } from "@/lib/balance";

export const runtime = "nodejs";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST(request: Request) {
  if (!stripe || !stripeEnabled) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const sig = (await headers()).get("stripe-signature") || "";

  let event: Stripe.Event;
  try {
    if (WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET);
    } else {
      console.warn(
        "[Stripe webhook] STRIPE_WEBHOOK_SECRET not set — skipping signature verification (dev only)",
      );
      event = JSON.parse(rawBody) as Stripe.Event;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Stripe webhook] Verification failed:", message);
    return NextResponse.json(
      { error: `Webhook error: ${message}` },
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const amount = session.amount_total ? session.amount_total / 100 : 0;

    if (userId && amount > 0) {
      await creditCash(userId, amount);
      await recordTransaction(userId, amount, "deposit");
      console.log(`[Stripe] Credited $${amount.toFixed(2)} to user ${userId}`);
    }
  }

  return NextResponse.json({ received: true });
}
