"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

const tiers = [
  {
    name: "CLI",
    price: "$0",
    period: "forever",
    description: "For individual developers exploring test reliability.",
    features: [
      "Unlimited local runs",
      "Beautiful terminal reports",
      "JUnit XML & JSON parsing",
      "All frameworks supported",
      "Open source (MIT license)",
    ],
    cta: "Install Free",
    href: "/docs",
    highlighted: false,
    badge: null,
    stripe: false,
  },
  {
    name: "Dashboard",
    price: "$0",
    period: "free during launch",
    description:
      "Everything included. Free for early adopters during launch.",
    features: [
      "Everything in CLI +",
      "Unlimited projects",
      "90-day trend history",
      "FlakeScore tracking",
      "Email & Slack alerts",
      "Team members",
      "CI/CD gate rules",
      "API access",
    ],
    cta: "Get Free Access",
    href: "/dashboard",
    highlighted: true,
    badge: "LAUNCH OFFER",
    stripe: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    description:
      "AI-powered insights, unlimited history, and priority support.",
    features: [
      "Everything in Dashboard +",
      "AI Root Cause Analysis",
      "AI Failure Categorization",
      "Unlimited history retention",
      "Priority support",
      "Custom retention policies",
    ],
    cta: "Upgrade to Pro",
    href: "/dashboard",
    highlighted: false,
    badge: null,
    stripe: true,
  },
];

export function PricingCards() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  async function handleProCheckout() {
    if (!session) {
      window.location.href = "/login?callbackUrl=/pricing";
      return;
    }

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

  return (
    <div className="mx-auto max-w-5xl grid md:grid-cols-3 gap-6">
      {tiers.map((t) => (
        <div
          key={t.name}
          className={`rounded-xl border p-8 flex flex-col ${
            t.highlighted
              ? "border-accent bg-accent/5 glow-orange"
              : "border-card-border bg-card-bg"
          }`}
        >
          {t.badge && (
            <span className="text-xs font-semibold text-accent mb-3">
              {t.badge}
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
          {t.stripe ? (
            <button
              onClick={handleProCheckout}
              disabled={loading}
              className={`mt-8 block text-center py-3 rounded-lg font-semibold transition cursor-pointer ${
                loading
                  ? "bg-card-border text-muted cursor-not-allowed"
                  : "bg-card-border hover:bg-[#333] text-foreground"
              }`}
            >
              {loading ? "Redirecting..." : t.cta}
            </button>
          ) : (
            <Link
              href={t.href}
              className={`mt-8 block text-center py-3 rounded-lg font-semibold transition ${
                t.highlighted
                  ? "bg-accent hover:bg-accent-hover text-black"
                  : "bg-card-border hover:bg-[#333] text-foreground"
              }`}
            >
              {t.cta}
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
