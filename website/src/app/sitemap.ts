import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";

export default function sitemap(): MetadataRoute.Sitemap {
  const blogPosts = getAllPosts();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: "https://deflaky.com",
      lastModified: new Date("2026-04-14"),
    },
    {
      url: "https://deflaky.com/pricing",
      lastModified: new Date("2026-04-14"),
    },
    {
      url: "https://deflaky.com/docs",
      lastModified: new Date("2026-04-14"),
    },
    {
      url: "https://deflaky.com/docs/github-actions",
      lastModified: new Date("2026-04-14"),
    },
    {
      url: "https://deflaky.com/blog",
      lastModified: new Date("2026-04-14"),
    },
    {
      url: "https://deflaky.com/demo",
      lastModified: new Date("2026-04-14"),
    },
    {
      url: "https://deflaky.com/changelog",
      lastModified: new Date("2026-04-14"),
    },
    {
      url: "https://deflaky.com/privacy",
      lastModified: new Date("2026-03-01"),
    },
    {
      url: "https://deflaky.com/terms",
      lastModified: new Date("2026-03-01"),
    },
  ];

  const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `https://deflaky.com/blog/${post.slug}`,
    lastModified: new Date(post.date),
  }));

  return [...staticPages, ...blogPages];
}
