/**
 * Schema.org structured data for the DeFlaky pricing page.
 *
 * Uses Product + Offer for each pricing tier (Free + Pro).
 */

export const pricingProductSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "DeFlaky",
  url: "https://deflaky.com/pricing",
  description:
    "Open-source CLI and Pro dashboard for detecting, tracking, and eliminating flaky tests in software test suites.",
  brand: {
    "@type": "Brand",
    name: "DeFlaky",
  },
  category: "Software",
  offers: [
    {
      "@type": "Offer",
      name: "Free",
      price: "0",
      priceCurrency: "USD",
      url: "https://deflaky.com/pricing",
      availability: "https://schema.org/InStock",
      priceValidUntil: "2027-12-31",
      description:
        "Free open-source CLI with unlimited local runs, terminal reports, JUnit XML and JSON support, and compatibility with all test frameworks. MIT licensed.",
    },
    {
      "@type": "Offer",
      name: "Pro",
      price: "19",
      priceCurrency: "USD",
      url: "https://deflaky.com/pricing",
      availability: "https://schema.org/InStock",
      priceValidUntil: "2027-12-31",
      description:
        "Pro dashboard with push results, test history and trends, FlakeScore tracking, AI Root Cause Analysis, team collaboration, server-side data retention, and priority support. 15-day free trial included.",
    },
  ],
};
