import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      plan: string;
      trialEndsAt: string | null;
      stripeSubscriptionId: string | null;
      stripeCurrentPeriodEnd: string | null;
    };
  }
}
