import { db } from "@/lib/db";
import { teams, teamMembers, users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { hasProAccess } from "@/lib/plan";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get all teams where the user is a member, with their role and member count
    const userTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
        slug: teams.slug,
        role: teamMembers.role,
        createdAt: teams.createdAt,
        memberCount: sql<number>`(
          SELECT COUNT(*)::int FROM team_members
          WHERE team_members.team_id = ${teams.id}
        )`,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(eq(teamMembers.userId, userId));

    return Response.json({ teams: userTeams });
  } catch (error) {
    console.error("Teams GET error:", error);
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

    const userId = session.user.id;

    // Pro plan required for team creation
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!dbUser || !hasProAccess(dbUser)) {
      return Response.json(
        { error: "Pro plan required", code: "PLAN_REQUIRED" },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { name, slug } = body as { name?: string; slug?: string };

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

    // Create the team
    const [team] = await db
      .insert(teams)
      .values({
        name: name.trim(),
        slug: slug.trim(),
        ownerId: userId,
      })
      .returning();

    // Add creator as owner in teamMembers
    await db.insert(teamMembers).values({
      teamId: team.id,
      userId: userId,
      role: "owner",
    });

    return Response.json({ team }, { status: 201 });
  } catch (error) {
    console.error("Teams POST error:", error);

    const message = error instanceof Error ? error.message : "";
    if (message.includes("unique") || message.includes("duplicate")) {
      return Response.json(
        { error: "A team with that slug already exists" },
        { status: 409 }
      );
    }

    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
