/**
 * Schema.org structured data for the DeFlaky docs page.
 *
 * Uses TechArticle — the correct type for technical documentation.
 *
 * NOTE: HowTo schema is intentionally NOT used here.
 * Google removed HowTo rich results in September 2023, making the
 * schema type ineffective for search visibility.
 */

export const docsArticleSchema = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "DeFlaky Getting Started Guide",
  description:
    "Learn how to install the DeFlaky CLI, detect flaky tests, push results to the dashboard, and integrate with CI/CD pipelines in under 2 minutes.",
  url: "https://deflaky.com/docs",
  datePublished: "2025-01-01",
  dateModified: "2026-04-07",
  author: {
    "@type": "Organization",
    name: "The Testing Academy",
    url: "https://thetestingacademy.com",
  },
  publisher: {
    "@type": "Organization",
    name: "DeFlaky",
    url: "https://deflaky.com",
    logo: {
      "@type": "ImageObject",
      url: "https://deflaky.com/logo.png",
    },
  },
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": "https://deflaky.com/docs",
  },
  articleSection: "Documentation",
  proficiencyLevel: "Beginner",
  dependencies: "Node.js, npm",
  about: {
    "@type": "SoftwareApplication",
    name: "DeFlaky",
    url: "https://deflaky.com",
  },
};
