import { db } from "@/lib/db";
import { projects, teamMembers } from "@/lib/db/schema";
import { eq, or, and, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import crypto from "crypto";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get team IDs where user is a member
    const userTeamMemberships = await db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId));

    const teamIds = userTeamMemberships.map((m) => m.teamId);

    // Get projects: user's own projects OR projects belonging to user's teams
    // Only select safe columns (exclude apiToken from list response)
    const selectCols = {
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
      apiToken: projects.apiToken,
      userId: projects.userId,
      teamId: projects.teamId,
      createdAt: projects.createdAt,
    };

    let allProjects;
    if (teamIds.length > 0) {
      allProjects = await db
        .select(selectCols)
        .from(projects)
        .where(
          or(
            eq(projects.userId, userId),
            inArray(projects.teamId, teamIds)
          )
        );
    } else {
      allProjects = await db
        .select(selectCols)
        .from(projects)
        .where(eq(projects.userId, userId));
    }

    // Only show apiToken for projects the user owns directly
    const safeProjects = allProjects.map((p) => ({
      ...p,
      apiToken: p.userId === userId ? p.apiToken : undefined,
    }));

    return Response.json({ projects: safeProjects });
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
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { name, slug, userId, teamId } = body as {
      name?: string;
      slug?: string;
      userId?: string;
      teamId?: string;
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

    // Always use authenticated user's ID
    const projectUserId = session.user.id;

    // If teamId is provided, verify user is owner or admin of that team
    if (teamId) {
      const membership = await db
        .select({ role: teamMembers.role })
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, teamId),
            eq(teamMembers.userId, session.user.id)
          )
        )
        .limit(1);

      if (
        membership.length === 0 ||
        !["owner", "admin"].includes(membership[0].role)
      ) {
        return Response.json(
          { error: "You must be an owner or admin of the team to create team projects" },
          { status: 403 }
        );
      }
    }

    const apiToken = `df_${crypto.randomUUID()}`;

    const [project] = await db
      .insert(projects)
      .values({
        name: name.trim(),
        slug: slug.trim(),
        apiToken,
        userId: projectUserId,
        ...(teamId ? { teamId } : {}),
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
