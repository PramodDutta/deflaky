import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("[stripe] STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  typescript: true,
  maxNetworkRetries: 3,
  timeout: 30000,
  httpClient: Stripe.createFetchHttpClient(),
});

/**
 * Stripe Price ID for the Pro plan ($19/month).
 */
export const STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID || "";

/**
 * URL users return to after Stripe Checkout (success or cancel).
 */
export const APP_URL = process.env.AUTH_URL || "https://deflaky.com";
