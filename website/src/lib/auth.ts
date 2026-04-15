import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
// import Google from "next-auth/providers/google"; // Coming soon
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub,
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, profile, account }) {
      if (!user.email) return false;

      // Skip DB upsert for credentials — already handled
      if (account?.provider === "credentials") return true;

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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
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
