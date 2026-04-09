import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog — DeFlaky",
  description: "Articles, guides, and best practices for detecting and eliminating flaky tests in your CI/CD pipeline.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="grid-bg min-h-screen">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">Blog</h1>
          <p className="text-muted max-w-xl mx-auto">
            Guides, strategies, and best practices for detecting and eliminating flaky tests.
          </p>
        </div>

        <div className="space-y-6">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block rounded-xl border border-card-border bg-card-bg p-6 hover:border-accent/50 hover:shadow-lg transition group"
            >
              <div className="flex items-center gap-3 text-xs text-muted mb-2">
                <time dateTime={post.date}>
                  {new Date(post.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
                <span>&middot;</span>
                <span>{post.author}</span>
              </div>
              <h2 className="text-xl font-semibold group-hover:text-accent transition mb-2">
                {post.title}
              </h2>
              <p className="text-sm text-muted line-clamp-2">{post.description}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {post.keywords.slice(0, 4).map((kw) => (
                  <span key={kw} className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                    {kw}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
