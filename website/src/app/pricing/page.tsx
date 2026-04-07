import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/schema/JsonLd";
import { pricingProductSchema } from "@/components/schema/pricing-schema";

export const metadata: Metadata = {
  title: "Pricing — DeFlaky",
  description: "Free CLI forever. Dashboard plans start at $19/mo with a 14-day free trial. Compare CLI, Solo, and Team plans for flaky test detection.",
  alternates: { canonical: "/pricing" },
};

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
    highlighted: false,
    badge: null,
  },
  {
    name: "Dashboard",
    price: "$0",
    period: "free during launch",
    description: "Everything included. Free for the first month for all early adopters.",
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
    highlighted: true,
    badge: "LAUNCH OFFER",
  },
  {
    name: "Pro (Coming Soon)",
    price: "$19",
    period: "/month after launch",
    description: "After the free launch period, paid plans will start here.",
    features: [
      "Everything in Dashboard +",
      "Unlimited history",
      "SSO & audit logs",
      "Custom retention policies",
      "Priority support",
      "Stripe billing (coming soon)",
    ],
    cta: "Join Waitlist",
    highlighted: false,
    badge: null,
  },
];

const faqs = [
  {
    q: "Can I use the CLI without creating an account?",
    a: "Absolutely. The CLI is fully functional without any account. It detects flaky tests locally and prints beautiful reports in your terminal. No sign-up, no token, no strings attached.",
  },
  {
    q: "What test frameworks are supported?",
    a: "Any framework that outputs JUnit XML or JSON reports — Playwright, Selenium, Cypress, Jest, Pytest, Mocha, JUnit, TestNG, Vitest, and more.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel anytime from your dashboard. No contracts, no questions asked. Your CLI keeps working forever.",
  },
  {
    q: "Do you offer annual billing?",
    a: "Coming soon! Annual billing will offer 2 months free (pay for 10, get 12).",
  },
  {
    q: "Is there a Pro/Enterprise plan?",
    a: "Coming soon — unlimited projects, SSO, audit logs, custom retention, and dedicated support. Contact us for early access.",
  },
];

export default function PricingPage() {
  return (
    <div className="grid-bg">
      {/* Structured Data: Product with Offers */}
      <JsonLd data={pricingProductSchema} />

      {/* Header */}
      <section className="py-20 px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Simple pricing. <span className="gradient-text">No surprises.</span>
        </h1>
        <p className="text-muted text-lg max-w-xl mx-auto">
          Free CLI forever. Dashboard plans start at $19/mo with a 14-day free
          trial. Cancel anytime.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="px-6 pb-20">
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
              {t.highlighted && (
                <span className="text-xs font-semibold text-accent mb-3">
                  MOST POPULAR
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
                  <li key={f} className="flex items-start gap-2 text-sm text-muted">
                    <span className="text-accent mt-0.5">&#10003;</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/dashboard"
                className={`mt-8 block text-center py-3 rounded-lg font-semibold transition ${
                  t.highlighted
                    ? "bg-accent hover:bg-accent-hover text-black"
                    : "bg-card-border hover:bg-[#333] text-foreground"
                }`}
              >
                {t.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 border-t border-card-border px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            Frequently asked questions
          </h2>
          <div className="space-y-6">
            {faqs.map((f) => (
              <div
                key={f.q}
                className="border border-card-border rounded-xl p-6 bg-card-bg"
              >
                <h3 className="font-semibold mb-2">{f.q}</h3>
                <p className="text-sm text-muted leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
