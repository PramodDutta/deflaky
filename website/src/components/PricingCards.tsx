"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { trackBeginCheckout, trackViewPricing } from "@/lib/analytics";

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "For individual developers exploring test reliability.",
    features: [
      "Unlimited local CLI runs",
      "Beautiful terminal reports",
      "JUnit XML & JSON parsing",
      "All frameworks supported",
      "Open source (MIT license)",
    ],
    cta: "Install Free",
    href: "/docs",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    description:
      "Push results to the cloud. Track trends, get AI insights, and collaborate with your team.",
    features: [
      "Everything in Free +",
      "Push results to dashboard",
      "Test history & trend tracking",
      "FlakeScore tracking",
      "AI Root Cause Analysis",
      "Team collaboration",
      "Server-side data retention",
      "Priority support",
    ],
    cta: "Start Free Trial",
    href: null,
    highlighted: true,
  },
];

export function PricingCards() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  // Track pricing page view on mount
  useEffect(() => {
    trackViewPricing();
  }, []);

  async function handleProCheckout() {
    if (!session) {
      window.location.href = "/login?callbackUrl=/pricing";
      return;
    }

    trackBeginCheckout();
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      alert("Failed to start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function getProCta() {
    if (!session) return { label: "Start Free Trial", action: "checkout" };

    const plan = session.user?.plan;
    const trialEndsAt = session.user?.trialEndsAt;
    const subscriptionId = session.user?.stripeSubscriptionId;

    // Active Pro subscriber
    if (plan === "pro" && subscriptionId) {
      return { label: "Current Plan", action: "none" };
    }

    // Active trial
    if (trialEndsAt && new Date(trialEndsAt) > new Date()) {
      const daysLeft = Math.ceil(
        (new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return {
        label: `On Trial (${daysLeft} day${daysLeft !== 1 ? "s" : ""} left)`,
        action: "dashboard",
      };
    }

    // Trial expired or no trial — needs to upgrade
    return { label: "Upgrade to Pro", action: "checkout" };
  }

  const proCta = getProCta();

  return (
    <div className="mx-auto max-w-3xl grid md:grid-cols-2 gap-6">
      {tiers.map((t) => (
        <div
          key={t.name}
          className={`rounded-xl border p-8 flex flex-col ${
            t.highlighted
              ? "border-accent bg-accent/5 glow-orange"
              : "border-card-border bg-card-bg"
          }`}
        >
          {t.highlighted && (
            <span className="text-xs font-semibold text-accent mb-3">
              15-DAY FREE TRIAL
            </span>
          )}
          <h2 className="text-xl font-bold">{t.name}</h2>
          <p className="text-sm text-muted mt-1 mb-4">{t.description}</p>
          <div className="mb-6">
            <span className="text-5xl font-bold">{t.price}</span>
            <span className="text-muted ml-1">{t.period}</span>
          </div>
          <ul className="space-y-3 flex-1">
            {t.features.map((f) => (
              <li
                key={f}
                className="flex items-start gap-2 text-sm text-muted"
              >
                <span className="text-accent mt-0.5">&#10003;</span>
                {f}
              </li>
            ))}
          </ul>
          {t.highlighted ? (
            proCta.action === "none" ? (
              <span className="mt-8 block text-center py-3 rounded-lg font-semibold bg-card-border text-muted">
                {proCta.label}
              </span>
            ) : proCta.action === "dashboard" ? (
              <Link
                href="/dashboard"
                className="mt-8 block text-center py-3 rounded-lg font-semibold bg-accent hover:bg-accent-hover text-black transition"
              >
                {proCta.label}
              </Link>
            ) : (
              <button
                onClick={handleProCheckout}
                disabled={loading}
                className={`mt-8 block text-center py-3 rounded-lg font-semibold transition cursor-pointer ${
                  loading
                    ? "bg-card-border text-muted cursor-not-allowed"
                    : "bg-accent hover:bg-accent-hover text-black"
                }`}
              >
                {loading ? "Redirecting..." : proCta.label}
              </button>
            )
          ) : (
            <Link
              href={t.href!}
              className="mt-8 block text-center py-3 rounded-lg font-semibold bg-card-border hover:bg-[#333] text-foreground transition"
            >
              {t.cta}
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
