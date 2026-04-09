import { db } from "@/lib/db";
import { teamMembers, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

async function getCallerRole(teamId: string, userId: string) {
  const membership = await db
    .select({ role: teamMembers.role })
    .from(teamMembers)
    .where(
      and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId))
    )
    .limit(1);

  return membership.length > 0 ? membership[0].role : null;
}

export async function POST(
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

    // Check caller is owner or admin
    const callerRole = await getCallerRole(teamId, session.user.id);
    if (!callerRole || !["owner", "admin"].includes(callerRole)) {
      return Response.json(
        { error: "Only owners and admins can invite members" },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { email, role } = body as { email?: string; role?: string };

    if (!email || typeof email !== "string") {
      return Response.json({ error: "email is required" }, { status: 400 });
    }

    const validRoles = ["admin", "member", "viewer"];
    const memberRole = role && validRoles.includes(role) ? role : "member";

    // Look up user by email
    const targetUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (targetUser.length === 0) {
      return Response.json(
        { error: "No user found with that email" },
        { status: 404 }
      );
    }

    const targetUserId = targetUser[0].id;

    // Check if already a member
    const existing = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, targetUserId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return Response.json(
        { error: "User is already a member of this team" },
        { status: 409 }
      );
    }

    // Add member
    const [member] = await db
      .insert(teamMembers)
      .values({
        teamId,
        userId: targetUserId,
        role: memberRole as "admin" | "member" | "viewer",
        invitedBy: session.user.id,
      })
      .returning();

    return Response.json(
      {
        member: {
          ...member,
          name: targetUser[0].name,
          email: targetUser[0].email,
          avatarUrl: targetUser[0].avatarUrl,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Team members POST error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Check caller is owner or admin
    const callerRole = await getCallerRole(teamId, session.user.id);
    if (!callerRole || !["owner", "admin"].includes(callerRole)) {
      return Response.json(
        { error: "Only owners and admins can remove members" },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { userId } = body as { userId?: string };

    if (!userId || typeof userId !== "string") {
      return Response.json({ error: "userId is required" }, { status: 400 });
    }

    // Cannot remove the owner
    const targetMembership = await db
      .select({ role: teamMembers.role })
      .from(teamMembers)
      .where(
        and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId))
      )
      .limit(1);

    if (targetMembership.length === 0) {
      return Response.json(
        { error: "User is not a member of this team" },
        { status: 404 }
      );
    }

    if (targetMembership[0].role === "owner") {
      return Response.json(
        { error: "Cannot remove the team owner" },
        { status: 403 }
      );
    }

    // Remove the member
    await db
      .delete(teamMembers)
      .where(
        and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId))
      );

    return Response.json({ success: true });
  } catch (error) {
    console.error("Team members DELETE error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
