import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { name, email, password } = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
    };

    // Validate inputs
    if (!email || !password) {
      return Response.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return Response.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (existing.length > 0) {
      // If user exists but has no password (OAuth user), let them set one
      if (!existing[0].passwordHash) {
        const passwordHash = await bcrypt.hash(password, 12);
        await db
          .update(users)
          .set({
            passwordHash,
            name: name || existing[0].name,
            updatedAt: new Date(),
          })
          .where(eq(users.email, email.toLowerCase().trim()));

        return Response.json({ success: true, message: "Password set. You can now sign in with email." });
      }

      return Response.json(
        { error: "An account with this email already exists. Try signing in." },
        { status: 409 }
      );
    }

    // Create new user with 15-day trial
    const passwordHash = await bcrypt.hash(password, 12);
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 15);

    await db.insert(users).values({
      email: email.toLowerCase().trim(),
      name: name || email.split("@")[0],
      passwordHash,
      trialEndsAt,
    });

    return Response.json({ success: true, message: "Account created. You can now sign in." });
  } catch (error) {
    console.error("[signup] error:", error);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
