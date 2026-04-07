import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Settings — DeFlaky Dashboard",
  description: "Configure your AI provider for intelligent test failure analysis",
  robots: { index: false, follow: false },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
