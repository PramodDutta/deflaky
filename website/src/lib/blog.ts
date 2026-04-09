import fs from "fs";
import path from "path";

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  keywords: string[];
  author: string;
  content: string;
}

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

function parseFrontmatter(raw: string): { meta: Record<string, unknown>; content: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, content: raw };

  const meta: Record<string, unknown> = {};
  let currentKey = "";
  let inArray = false;
  const arrayValues: string[] = [];

  for (const line of match[1].split("\n")) {
    if (inArray) {
      if (line.startsWith("  - ")) {
        arrayValues.push(line.replace("  - ", "").replace(/^"|"$/g, ""));
        continue;
      } else {
        meta[currentKey] = [...arrayValues];
        arrayValues.length = 0;
        inArray = false;
      }
    }

    const kvMatch = line.match(/^(\w+):\s*(.*)$/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      const value = kvMatch[2].replace(/^"|"$/g, "");
      if (!value) {
        inArray = true;
      } else {
        meta[currentKey] = value;
      }
    }
  }

  if (inArray) {
    meta[currentKey] = [...arrayValues];
  }

  return { meta, content: match[2] };
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".md"));
  const posts: BlogPost[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), "utf-8");
    const { meta, content } = parseFrontmatter(raw);

    posts.push({
      slug: (meta.slug as string) || file.replace(".md", ""),
      title: (meta.title as string) || "",
      description: (meta.description as string) || "",
      date: (meta.date as string) || "",
      keywords: (meta.keywords as string[]) || [],
      author: (meta.author as string) || "DeFlaky Team",
      content,
    });
  }

  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(slug: string): BlogPost | null {
  const posts = getAllPosts();
  return posts.find((p) => p.slug === slug) || null;
}
