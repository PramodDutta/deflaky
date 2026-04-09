import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

/**
 * Extract period end from a subscription object.
 * In Stripe API v2026+, `current_period_end` moved to subscription items.
 */
function getPeriodEnd(sub: Record<string, unknown>): Date {
  // Try item-level first (v2026+), then top-level (legacy)
  const items = sub.items as { data?: Array<{ current_period_end?: number }> };
  const itemEnd = items?.data?.[0]?.current_period_end;
  if (itemEnd) return new Date(itemEnd * 1000);

  const topEnd = (sub as { current_period_end?: number }).current_period_end;
  if (topEnd) return new Date(topEnd * 1000);

  return new Date();
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        const sub = subscription as unknown as Record<string, unknown>;

        await db
          .update(users)
          .set({
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0].price.id,
            stripeCurrentPeriodEnd: getPeriodEnd(sub),
            plan: "pro",
          })
          .where(eq(users.id, session.metadata!.userId!));

        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as unknown as Record<string, unknown>;
        const subscriptionId = invoice.subscription as string | undefined;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(
            subscriptionId
          );
          const sub = subscription as unknown as Record<string, unknown>;
          await db
            .update(users)
            .set({
              stripePriceId: subscription.items.data[0].price.id,
              stripeCurrentPeriodEnd: getPeriodEnd(sub),
            })
            .where(eq(users.stripeCustomerId, invoice.customer as string));
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await db
          .update(users)
          .set({
            plan: "free",
            stripeSubscriptionId: null,
            stripePriceId: null,
            stripeCurrentPeriodEnd: null,
          })
          .where(eq(users.stripeCustomerId, subscription.customer as string));
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const sub = subscription as unknown as Record<string, unknown>;
        const plan =
          subscription.status === "active" ? "pro" : ("free" as const);
        await db
          .update(users)
          .set({
            plan,
            stripePriceId: subscription.items.data[0].price.id,
            stripeCurrentPeriodEnd: getPeriodEnd(sub),
          })
          .where(eq(users.stripeCustomerId, subscription.customer as string));
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
