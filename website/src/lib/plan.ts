export interface PlanStatus {
  plan: "free" | "pro";
  isTrialing: boolean;
  trialDaysLeft: number;
  trialExpired: boolean;
  hasProAccess: boolean;
}

interface PlanUser {
  plan: string;
  trialEndsAt: Date | null;
  stripeSubscriptionId: string | null;
  stripeCurrentPeriodEnd: Date | null;
}

export function getPlanStatus(user: PlanUser): PlanStatus {
  const now = new Date();

  // Paid plans: pro, solo, team all get access
  const paidPlans = ["pro", "solo", "team"];

  // Active paid subscription
  if (
    paidPlans.includes(user.plan) &&
    user.stripeSubscriptionId &&
    user.stripeCurrentPeriodEnd &&
    user.stripeCurrentPeriodEnd > now
  ) {
    return {
      plan: "pro",
      isTrialing: false,
      trialDaysLeft: -1,
      trialExpired: false,
      hasProAccess: true,
    };
  }

  // Paid plan set (e.g. via webhook) but no period check needed
  if (paidPlans.includes(user.plan) && user.stripeSubscriptionId) {
    return {
      plan: "pro",
      isTrialing: false,
      trialDaysLeft: -1,
      trialExpired: false,
      hasProAccess: true,
    };
  }

  // Active trial
  if (user.trialEndsAt && user.trialEndsAt > now) {
    const msLeft = user.trialEndsAt.getTime() - now.getTime();
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
    return {
      plan: "free",
      isTrialing: true,
      trialDaysLeft: daysLeft,
      trialExpired: false,
      hasProAccess: true,
    };
  }

  // Trial expired, no subscription
  if (user.trialEndsAt && user.trialEndsAt <= now && user.plan !== "pro") {
    return {
      plan: "free",
      isTrialing: false,
      trialDaysLeft: 0,
      trialExpired: true,
      hasProAccess: false,
    };
  }

  // No trial, free plan (CLI-only user or pre-trial user)
  return {
    plan: "free",
    isTrialing: false,
    trialDaysLeft: -1,
    trialExpired: false,
    hasProAccess: false,
  };
}

export function hasProAccess(user: PlanUser): boolean {
  return getPlanStatus(user).hasProAccess;
}
