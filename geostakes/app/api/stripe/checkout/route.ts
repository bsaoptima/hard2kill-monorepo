import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe, stripeEnabled } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!stripe || !stripeEnabled) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const amount = Number(body?.amount);
  if (!amount || amount < 1) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const origin =
    request.headers.get("origin") ?? "http://localhost:3000";

  // Capture device fingerprint and IP for bonus abuse detection
  const deviceFingerprint = body?.deviceFingerprint || '';
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || request.headers.get('x-real-ip')
    || '';

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `$${amount} Geostakes credit`,
            description: "Credits for Geostakes wagering",
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${origin}/?deposit=success`,
    cancel_url: `${origin}/?deposit=cancelled`,
    metadata: {
      userId: user.id,
      deviceFingerprint: deviceFingerprint,
      ipAddress: ipAddress,
    },
  });

  return NextResponse.json({ url: session.url });
}
