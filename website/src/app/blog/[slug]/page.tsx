import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug } from "@/lib/blog";

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Not Found — DeFlaky" };

  return {
    title: `${post.title} — DeFlaky Blog`,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
    },
  };
}

/* Simple markdown to HTML (headings, paragraphs, code blocks, bold, italic, links, lists) */
function markdownToHtml(md: string): string {
  let html = md
    // Code blocks
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-gray-50 border border-card-border rounded-lg p-4 overflow-x-auto my-4"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-accent">$1</code>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-xl font-semibold mt-8 mb-3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold mt-10 mb-4">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold mt-8 mb-4">$1</h1>')
    // Bold and italic
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-accent hover:underline">$1</a>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="border-card-border my-8" />')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-muted">$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-muted">$1</li>')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-accent pl-4 italic text-muted my-4">$1</blockquote>')
    // Paragraphs (lines that aren't tags)
    .replace(/^(?!<[a-z/])((?!^$).+)$/gm, '<p class="text-muted leading-relaxed mb-4">$1</p>');

  // Wrap adjacent li elements in ul
  html = html.replace(
    /(<li class="ml-4 list-disc[^"]*">[^<]*<\/li>\n?)+/g,
    (match) => `<ul class="space-y-1 my-4">${match}</ul>`
  );
  html = html.replace(
    /(<li class="ml-4 list-decimal[^"]*">[^<]*<\/li>\n?)+/g,
    (match) => `<ol class="space-y-1 my-4">${match}</ol>`
  );

  return html;
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const htmlContent = markdownToHtml(post.content);

  return (
    <div className="grid-bg min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted mb-8">
          <Link href="/blog" className="hover:text-accent transition">Blog</Link>
          <span>/</span>
          <span className="truncate">{post.title}</span>
        </nav>

        {/* Article Header */}
        <header className="mb-10">
          <div className="flex items-center gap-3 text-sm text-muted mb-3">
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
          <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4">{post.title}</h1>
          <p className="text-lg text-muted">{post.description}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {post.keywords.map((kw) => (
              <span key={kw} className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                {kw}
              </span>
            ))}
          </div>
        </header>

        {/* Article Body */}
        <article
          className="prose-custom"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />

        {/* CTA */}
        <div className="mt-16 p-8 rounded-xl border border-card-border bg-card-bg text-center">
          <h3 className="text-xl font-bold mb-2">Stop guessing. DeFlaky your tests.</h3>
          <p className="text-sm text-muted mb-6">Detect flaky tests in minutes with a single CLI command.</p>
          <div className="flex justify-center gap-3">
            <Link href="/docs" className="text-sm border border-card-border px-4 py-2 rounded-lg hover:bg-card-bg transition">
              Read the Docs
            </Link>
            <Link href="/dashboard" className="text-sm bg-accent hover:bg-accent-hover text-black font-semibold px-4 py-2 rounded-lg transition">
              Try Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
