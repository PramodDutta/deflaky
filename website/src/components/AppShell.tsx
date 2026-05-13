"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { TopBanner } from "@/components/TopBanner";

/** Hide Navbar + Footer on /dashboard routes — the dashboard has its own sidebar nav */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith("/dashboard");

  if (isDashboard) {
    return (
      <>
        <TopBanner />
        <main className="flex-1">{children}</main>
      </>
    );
  }

  return (
    <>
      <TopBanner />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
