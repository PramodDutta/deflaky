import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — DeFlaky",
  description: "Track your test suite's flakiness score, identify flaky tests, and monitor trends over time.",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
