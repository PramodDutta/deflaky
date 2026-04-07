/**
 * Schema.org structured data for the DeFlaky pricing page.
 *
 * Uses Product + Offer for each pricing tier. This gives search engines
 * clear pricing signals for the product.
 *
 * NOTE: FAQPage schema is intentionally NOT included here.
 * Google restricted FAQ rich results to government and healthcare authority
 * sites in August 2023. Adding FAQPage to a SaaS site will not produce
 * rich results and may cause validation warnings.
 */

export const pricingProductSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "DeFlaky",
  url: "https://deflaky.com/pricing",
  description:
    "Open-source CLI and paid dashboard for detecting, tracking, and eliminating flaky tests in software test suites.",
  brand: {
    "@type": "Brand",
    name: "DeFlaky",
  },
  category: "Software",
  offers: [
    {
      "@type": "Offer",
      name: "CLI (Free)",
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
      name: "Solo",
      price: "19",
      priceCurrency: "USD",
      url: "https://deflaky.com/pricing",
      availability: "https://schema.org/InStock",
      priceValidUntil: "2027-12-31",
      description:
        "Dashboard for individual SDETs. Includes 1 project dashboard, 30-day trend history, FlakeScore tracking, email alerts, and API access. 14-day free trial.",
    },
    {
      "@type": "Offer",
      name: "Team",
      price: "49",
      priceCurrency: "USD",
      url: "https://deflaky.com/pricing",
      availability: "https://schema.org/InStock",
      priceValidUntil: "2027-12-31",
      description:
        "Team dashboard with 5 projects, unlimited team members, Slack integration, 90-day trend history, CI/CD gate rules, test ownership assignment, and priority support. 14-day free trial.",
    },
  ],
};
