import { db } from "@/lib/db";
import { projects, teamMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { teamId } = await params;

    if (!teamId || typeof teamId !== "string") {
      return Response.json({ error: "teamId is required" }, { status: 400 });
    }

    // Verify user is a member of this team
    const membership = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, session.user.id)
        )
      )
      .limit(1);

    if (membership.length === 0) {
      return Response.json({ error: "Team not found" }, { status: 404 });
    }

    // Get all projects for this team
    const teamProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.teamId, teamId));

    return Response.json({ projects: teamProjects });
  } catch (error) {
    console.error("Team projects GET error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
