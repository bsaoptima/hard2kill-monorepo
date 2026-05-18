import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";

export const stripeEnabled = Boolean(STRIPE_SECRET_KEY);

export const stripe: Stripe | null = stripeEnabled
  ? new Stripe(STRIPE_SECRET_KEY)
  : null;
