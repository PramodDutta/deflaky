import { db } from "@/lib/db";
import { teams, teamMembers, users } from "@/lib/db/schema";
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

    // Get team info
    const teamResults = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);

    if (teamResults.length === 0) {
      return Response.json({ error: "Team not found" }, { status: 404 });
    }

    const team = teamResults[0];

    // Get all members with user info
    const members = await db
      .select({
        id: teamMembers.id,
        userId: teamMembers.userId,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
        userName: users.name,
        userEmail: users.email,
        userAvatar: users.avatarUrl,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId));

    return Response.json({
      team: {
        ...team,
        members: members.map((m) => ({
          id: m.id,
          userId: m.userId,
          role: m.role,
          joinedAt: m.joinedAt,
          name: m.userName,
          email: m.userEmail,
          avatarUrl: m.userAvatar,
        })),
      },
    });
  } catch (error) {
    console.error("Team GET error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
