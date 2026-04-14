/**
 * Google Analytics event tracking for key conversion events.
 * These map to GA4 key events configured in the DeFlaky property.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function track(eventName: string, params?: Record<string, string | number>) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, params);
  }
}

/** User clicks "Sign in with GitHub" or completes OAuth */
export function trackSignUp(method: string = "github") {
  track("sign_up", { method });
}

/** User views the /pricing page */
export function trackViewPricing() {
  track("view_pricing", { page: "/pricing" });
}

/** User views the /docs page */
export function trackViewDocs() {
  track("view_docs", { page: "/docs" });
}

/** User clicks "Start Free Trial" or "Upgrade to Pro" (checkout initiation) */
export function trackBeginCheckout() {
  track("begin_checkout", {
    currency: "USD",
    value: 19,
    items: "DeFlaky Pro",
  });
}

/** Stripe checkout completed — user returns to success page */
export function trackPurchase(subscriptionId?: string) {
  track("purchase", {
    currency: "USD",
    value: 19,
    transaction_id: subscriptionId || "unknown",
    items: "DeFlaky Pro",
  });
}

/** User creates a new project in the dashboard */
export function trackCreateProject() {
  track("create_project");
}

/** User pushes test results via CLI */
export function trackPushResults() {
  track("push_results");
}
