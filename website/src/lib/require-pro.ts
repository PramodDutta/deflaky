import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hasProAccess } from "@/lib/plan";

type RequireProSuccess = {
  authorized: true;
  user: typeof users.$inferSelect;
};

type RequireProFailure = {
  authorized: false;
  response: Response;
};

export async function requirePro(): Promise<RequireProSuccess | RequireProFailure> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      authorized: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) {
    return {
      authorized: false,
      response: Response.json({ error: "User not found" }, { status: 404 }),
    };
  }

  if (!hasProAccess(user)) {
    return {
      authorized: false,
      response: Response.json(
        { error: "Pro plan required", code: "PLAN_REQUIRED" },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, user };
}
