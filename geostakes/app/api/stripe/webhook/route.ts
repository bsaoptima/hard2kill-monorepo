import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { creditCash, recordTransaction } from "@/lib/balance";
import { creditFirstDepositBonus } from "@/lib/bonus";

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
    const paymentMethodId = session.payment_intent
      ? (typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent.id)
      : undefined;

    if (userId && amount > 0) {
      // Credit the deposit
      await creditCash(userId, amount);
      await recordTransaction(userId, amount, "deposit");
      console.log(`[Stripe] Credited $${amount.toFixed(2)} to user ${userId}`);

      // Try to credit first deposit bonus (wrapped in try-catch so deposit always succeeds)
      try {
        const bonusResult = await creditFirstDepositBonus(
          userId,
          amount,
          session.metadata?.deviceFingerprint,
          session.metadata?.ipAddress,
          paymentMethodId
        );

        if (bonusResult.success) {
          console.log(`[Stripe] Credited $${bonusResult.bonus_amount.toFixed(2)} deposit bonus to user ${userId}`);
          console.log(`[Stripe] Playthrough requirement: $${bonusResult.playthrough_required.toFixed(2)}`);
        } else {
          console.log(`[Stripe] Bonus not credited to user ${userId}: ${bonusResult.error}`);
        }
      } catch (bonusError) {
        console.error(`[Stripe] Bonus crediting failed (deposit still successful):`, bonusError);
      }
    }
  }

  return NextResponse.json({ received: true });
}
