import type { Metadata } from "next";
import { JsonLd } from "@/components/schema/JsonLd";
import { pricingProductSchema } from "@/components/schema/pricing-schema";
import { PricingCards } from "@/components/PricingCards";

export const metadata: Metadata = {
  title: "Pricing — DeFlaky",
  description: "Free CLI forever. Dashboard plans start at $19/mo with a 14-day free trial. Compare CLI, Solo, and Team plans for flaky test detection.",
  alternates: { canonical: "/pricing" },
};

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
        <PricingCards />
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
