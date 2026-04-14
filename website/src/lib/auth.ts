import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
// import Google from "next-auth/providers/google"; // Coming soon
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [GitHub],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, profile }) {
      if (!user.email) return false;

      try {
        // Check if user exists, if not create them
        const existing = await db
          .select()
          .from(users)
          .where(eq(users.email, user.email))
          .limit(1);

        if (existing.length === 0) {
          const trialEndsAt = new Date();
          trialEndsAt.setDate(trialEndsAt.getDate() + 15);

          await db.insert(users).values({
            email: user.email,
            name: user.name || (profile?.login as string) || "User",
            avatarUrl: user.image || null,
            trialEndsAt,
          });
        } else {
          // Update avatar and name on each login
          await db
            .update(users)
            .set({
              name: user.name || existing[0].name,
              avatarUrl: user.image || existing[0].avatarUrl,
              updatedAt: new Date(),
            })
            .where(eq(users.email, user.email));
        }
      } catch (err) {
        console.error("[auth] signIn callback error:", err);
        // Still allow sign-in even if DB write fails
      }

      return true;
    },
    async session({ session }) {
      if (session.user?.email) {
        const dbUser = await db
          .select()
          .from(users)
          .where(eq(users.email, session.user.email))
          .limit(1);

        if (dbUser.length > 0) {
          session.user.id = dbUser[0].id;
          session.user.plan = dbUser[0].plan;
          session.user.trialEndsAt = dbUser[0].trialEndsAt?.toISOString() ?? null;
          session.user.stripeSubscriptionId = dbUser[0].stripeSubscriptionId ?? null;
          session.user.stripeCurrentPeriodEnd = dbUser[0].stripeCurrentPeriodEnd?.toISOString() ?? null;
        }
      }
      return session;
    },
  },
});
