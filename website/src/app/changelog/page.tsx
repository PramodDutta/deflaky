import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/schema/JsonLd";
import {
  changelogPageSchema,
  changelogBreadcrumbSchema,
} from "@/components/schema/changelog-schema";

export const metadata: Metadata = {
  title: "Changelog — DeFlaky",
  description: "What's new in DeFlaky. Release notes, new features, and improvements.",
  alternates: { canonical: "/changelog" },
};

interface Release {
  version: string;
  date: string;
  tag: "launch" | "feature" | "fix" | "improvement";
  title: string;
  changes: string[];
}

const releases: Release[] = [
  {
    version: "1.0.1",
    date: "2026-04-08",
    tag: "fix",
    title: "CLI Push URL Fix & Auth Launch",
    changes: [
      "Fixed CLI --push URL to use deflaky.com instead of staging",
      "Added GitHub & Google OAuth authentication to the dashboard",
      "Protected dashboard routes require sign-in",
      "Added project creation flow with API token generation",
      "Dashboard now loads real test data from the database",
      "Added blog with 15 SEO-optimized articles",
      "Added Privacy Policy and Terms of Service pages",
      "Connected deflaky.com custom domain with SSL",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-04-07",
    tag: "launch",
    title: "DeFlaky Public Launch",
    changes: [
      "DeFlaky CLI published to npm as deflaky-cli",
      "JUnit XML and JSON report parsing",
      "FlakeScore calculation (stable tests / total tests)",
      "Beautiful terminal output with colored tables",
      "Push results to dashboard via --push flag",
      "Support for Playwright, Selenium, Cypress, Jest, Pytest, and more",
      "AI root cause analysis with BYOK (5 providers supported)",
      "Dashboard with flaky test tracking and trend charts",
      "CI/CD integration support with --fail-threshold",
    ],
  },
];

const tagStyles: Record<string, { bg: string; text: string; label: string }> = {
  launch: { bg: "bg-green-500/15", text: "text-green-400", label: "Launch" },
  feature: { bg: "bg-blue-500/15", text: "text-blue-400", label: "Feature" },
  fix: { bg: "bg-yellow-500/15", text: "text-yellow-400", label: "Fix" },
  improvement: { bg: "bg-purple-500/15", text: "text-purple-400", label: "Improvement" },
};

export default function ChangelogPage() {
  return (
    <div className="grid-bg min-h-screen">
      {/* Structured Data: WebPage + BreadcrumbList */}
      <JsonLd data={changelogPageSchema} />
      <JsonLd data={changelogBreadcrumbSchema} />

      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">Changelog</h1>
          <p className="text-muted max-w-xl mx-auto">
            New features, improvements, and fixes in every release.
          </p>
        </div>

        <div className="space-y-8">
          {releases.map((release) => {
            const style = tagStyles[release.tag];
            return (
              <div
                key={release.version}
                className="rounded-xl border border-card-border bg-card-bg p-6"
              >
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className="text-lg font-bold font-mono">v{release.version}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                    {style.label}
                  </span>
                  <time className="text-xs text-muted ml-auto" dateTime={release.date}>
                    {new Date(release.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                </div>
                <h2 className="text-xl font-semibold mb-4">{release.title}</h2>
                <ul className="space-y-2">
                  {release.changes.map((change, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Subscribe CTA */}
        <div className="mt-12 text-center p-8 rounded-xl border border-dashed border-card-border">
          <p className="text-muted mb-3">Want to stay updated?</p>
          <Link
            href="https://github.com/PramodDutta/deflaky"
            target="_blank"
            className="text-sm bg-accent hover:bg-accent-hover text-black font-semibold px-6 py-2.5 rounded-lg transition inline-block"
          >
            Star on GitHub
          </Link>
        </div>
      </div>
    </div>
  );
}
