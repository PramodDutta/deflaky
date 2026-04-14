/**
 * Schema.org structured data for the DeFlaky changelog page.
 *
 * Uses WebPage + BreadcrumbList to provide search engines with
 * page context and navigation structure.
 */

export const changelogPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "DeFlaky Changelog",
  description:
    "Release notes, new features, and improvements for every DeFlaky version.",
  url: "https://deflaky.com/changelog",
  isPartOf: {
    "@type": "WebSite",
    name: "DeFlaky",
    url: "https://deflaky.com",
  },
};

export const changelogBreadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://deflaky.com",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Changelog",
      item: "https://deflaky.com/changelog",
    },
  ],
};
