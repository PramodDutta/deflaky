import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import crypto from "crypto";

export async function GET() {
  try {
    const allProjects = await db.select().from(projects);
    return Response.json({ projects: allProjects });
  } catch (error) {
    console.error("Projects GET error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { name, slug, userId } = body as {
      name?: string;
      slug?: string;
      userId?: string;
    };

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return Response.json(
        { error: "name is required and must be a non-empty string" },
        { status: 400 }
      );
    }
    if (!slug || typeof slug !== "string" || slug.trim().length === 0) {
      return Response.json(
        { error: "slug is required and must be a non-empty string" },
        { status: 400 }
      );
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return Response.json(
        { error: "slug must contain only lowercase letters, numbers, and hyphens" },
        { status: 400 }
      );
    }
    if (!userId || typeof userId !== "string") {
      return Response.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const apiToken = `df_${crypto.randomUUID()}`;

    const [project] = await db
      .insert(projects)
      .values({
        name: name.trim(),
        slug: slug.trim(),
        apiToken,
        userId,
      })
      .returning();

    return Response.json({ project }, { status: 201 });
  } catch (error) {
    console.error("Projects POST error:", error);

    // Handle unique constraint violations
    const message = error instanceof Error ? error.message : "";
    if (message.includes("unique") || message.includes("duplicate")) {
      return Response.json(
        { error: "A project with that slug or token already exists" },
        { status: 409 }
      );
    }

    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
