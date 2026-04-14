/**
 * Schema.org structured data generators for the DeFlaky blog.
 *
 * - BlogPosting schema for individual blog post pages
 * - CollectionPage schema for the blog listing page
 */

export interface BlogPostSchemaInput {
  title: string;
  description: string;
  slug: string;
  date: string;
  author: string;
  keywords: string[];
}

/**
 * Generate BlogPosting JSON-LD for an individual blog post.
 */
export function generateBlogPostingSchema(post: BlogPostSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    url: `https://deflaky.com/blog/${post.slug}`,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Person",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "DeFlaky",
      url: "https://deflaky.com",
      logo: {
        "@type": "ImageObject",
        url: "https://deflaky.com/logo.svg",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://deflaky.com/blog/${post.slug}`,
    },
    keywords: post.keywords.join(", "),
    isPartOf: {
      "@type": "Blog",
      name: "DeFlaky Blog",
      url: "https://deflaky.com/blog",
    },
  };
}

/**
 * Generate BreadcrumbList JSON-LD for a blog post page.
 */
export function generateBlogBreadcrumbSchema(post: BlogPostSchemaInput) {
  return {
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
        name: "Blog",
        item: "https://deflaky.com/blog",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `https://deflaky.com/blog/${post.slug}`,
      },
    ],
  };
}

/**
 * CollectionPage schema for the blog listing page.
 */
export const blogCollectionPageSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "DeFlaky Blog",
  description:
    "Articles, guides, and best practices for detecting and eliminating flaky tests in your CI/CD pipeline.",
  url: "https://deflaky.com/blog",
  isPartOf: {
    "@type": "WebSite",
    name: "DeFlaky",
    url: "https://deflaky.com",
  },
};
