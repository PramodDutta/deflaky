import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-03-25.dahlia",
      typescript: true,
    });
  }
  return _stripe;
}

/** Convenience alias — lazily initialised Stripe client */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

/**
 * Stripe Price ID for the Pro plan ($19/month).
 * Set this after creating the product + price in the Stripe Dashboard.
 */
export function getStripePriceId(): string {
  return process.env.STRIPE_PRO_PRICE_ID || "";
}

export const STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID || "";

/**
 * URL users return to after Stripe Checkout (success or cancel).
 */
export const APP_URL = process.env.AUTH_URL || "https://deflaky.com";
