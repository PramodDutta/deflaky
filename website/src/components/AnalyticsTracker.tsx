"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function track(event: string, params?: Record<string, string | number>) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", event, params);
  }
}

/**
 * Fires GA4 key events based on page navigation and session state.
 * Add this once in the root layout — it handles all page-level tracking.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const trackedSignUp = useRef(false);
  const prevPath = useRef("");

  useEffect(() => {
    // Avoid duplicate fires on same path
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;

    // Track key page views
    if (pathname === "/pricing") {
      track("view_pricing", { page: "/pricing" });
    }
    if (pathname === "/docs" || pathname.startsWith("/docs/")) {
      track("view_docs", { page: pathname });
    }
    if (pathname === "/blog" || pathname.startsWith("/blog/")) {
      track("view_blog", { page: pathname });
    }

    // Track signup: user lands on /dashboard for the first time with a session
    if (
      pathname === "/dashboard" &&
      status === "authenticated" &&
      session?.user &&
      !trackedSignUp.current
    ) {
      track("sign_up", { method: "github" });
      trackedSignUp.current = true;
    }

    // Track checkout success return
    if (pathname.includes("success") || pathname.includes("upgraded")) {
      track("purchase", {
        currency: "USD",
        value: 19,
        items: "DeFlaky Pro",
      });
    }
  }, [pathname, status, session]);

  return null;
}
