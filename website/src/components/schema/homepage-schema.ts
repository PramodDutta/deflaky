/**
 * Schema.org structured data for the DeFlaky homepage.
 *
 * Includes:
 * - Organization (The Testing Academy / DeFlaky brand)
 * - WebSite with SearchAction (sitelinks search box eligibility)
 * - SoftwareApplication (the DeFlaky product itself)
 */

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "DeFlaky",
  url: "https://deflaky.com",
  logo: "https://deflaky.com/logo.svg",
  description:
    "Open-source CLI and dashboard for detecting, tracking, and eliminating flaky tests in software test suites.",
  foundingDate: "2025",
  parentOrganization: {
    "@type": "Organization",
    name: "The Testing Academy",
    url: "https://thetestingacademy.com",
  },
  sameAs: ["https://github.com/PramodDutta/deflaky"],
};

export const webSiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "DeFlaky",
  url: "https://deflaky.com",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://deflaky.com/docs?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};

export const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "DeFlaky",
  url: "https://deflaky.com",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Windows, macOS, Linux",
  description:
    "Open-source CLI tool that detects flaky tests by running your test suite multiple times and comparing results. Works with Playwright, Selenium, Cypress, Jest, Pytest, and more.",
  offers: [
    {
      "@type": "Offer",
      name: "CLI (Free)",
      price: "0",
      priceCurrency: "USD",
      description:
        "Free open-source CLI with unlimited local runs, terminal reports, and support for all test frameworks.",
    },
    {
      "@type": "Offer",
      name: "Dashboard (Free during launch)",
      price: "0",
      priceCurrency: "USD",
      description:
        "Dashboard with unlimited projects, 90-day history, FlakeScore trends, and email & Slack alerts. Free during launch.",
    },
    {
      "@type": "Offer",
      name: "Pro",
      price: "19",
      priceCurrency: "USD",
      billingIncrement: "P1M",
      description:
        "Everything in Dashboard plus AI Root Cause Analysis, AI Failure Categorization, unlimited history, and priority support.",
    },
  ],
  featureList: [
    "Instant flaky test detection",
    "FlakeScore reliability metric",
    "Framework agnostic (Playwright, Selenium, Cypress, Jest, Pytest)",
    "CI/CD pipeline integration",
    "Slack and email alerts",
    "AI root cause analysis (BYOK)",
    "Team collaboration and test ownership",
  ],
  softwareVersion: "1.0.1",
  downloadUrl: "https://www.npmjs.com/package/deflaky-cli",
  installUrl: "https://www.npmjs.com/package/deflaky-cli",
  creator: {
    "@type": "Organization",
    name: "The Testing Academy",
    url: "https://thetestingacademy.com",
  },
};

export const homepageSchemaList = [
  organizationSchema,
  webSiteSchema,
  softwareApplicationSchema,
];
