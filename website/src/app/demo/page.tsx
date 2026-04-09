import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dashboard Demo — DeFlaky",
  description:
    "See how DeFlaky's dashboard helps you track flaky tests, monitor FlakeScore trends, and identify unreliable tests across your test suite.",
  alternates: { canonical: "/demo" },
};

/* ── Sample Data ── */
const sampleRuns = [
  { id: "1", date: "Apr 8", flakeScore: 87.5, tests: 142, flaky: 18 },
  { id: "2", date: "Apr 7", flakeScore: 85.2, tests: 142, flaky: 21 },
  { id: "3", date: "Apr 6", flakeScore: 82.1, tests: 140, flaky: 25 },
  { id: "4", date: "Apr 5", flakeScore: 79.8, tests: 138, flaky: 28 },
  { id: "5", date: "Apr 4", flakeScore: 76.3, tests: 138, flaky: 33 },
  { id: "6", date: "Apr 3", flakeScore: 74.1, tests: 135, flaky: 35 },
  { id: "7", date: "Apr 2", flakeScore: 71.5, tests: 135, flaky: 39 },
];

const sampleFlakyTests = [
  { name: "checkout.spec.ts > should complete payment flow", file: "tests/e2e/checkout.spec.ts", pass: 14, fail: 6, skip: 0, rate: 70 },
  { name: "auth.spec.ts > should handle OAuth redirect", file: "tests/e2e/auth.spec.ts", pass: 16, fail: 4, skip: 0, rate: 80 },
  { name: "dashboard.spec.ts > should load chart data", file: "tests/e2e/dashboard.spec.ts", pass: 17, fail: 2, skip: 1, rate: 85 },
  { name: "api/users.test.ts > should paginate results", file: "tests/unit/api/users.test.ts", pass: 18, fail: 2, skip: 0, rate: 90 },
  { name: "search.spec.ts > should debounce input", file: "tests/e2e/search.spec.ts", pass: 15, fail: 3, skip: 2, rate: 75 },
  { name: "upload.spec.ts > should handle large files", file: "tests/e2e/upload.spec.ts", pass: 13, fail: 5, skip: 2, rate: 65 },
];

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-card-border bg-card-bg p-5">
      <p className="text-xs text-muted uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  );
}

function PassRateBar({ rate }: { rate: number }) {
  const color = rate >= 90 ? "bg-green-500" : rate >= 75 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 rounded-full bg-card-border overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${rate}%` }} />
      </div>
      <span className="text-xs text-muted">{rate}%</span>
    </div>
  );
}

function MiniChart() {
  const points = sampleRuns.map((r, i) => {
    const x = 10 + i * 40;
    const y = 100 - (r.flakeScore - 60) * 2.5;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox="0 0 290 110" className="w-full h-32">
      <defs>
        <linearGradient id="demo-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`10,100 ${points} 250,100`}
        fill="url(#demo-grad)"
      />
      <polyline
        points={points}
        fill="none"
        stroke="#4ade80"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {sampleRuns.map((r, i) => (
        <circle
          key={r.id}
          cx={10 + i * 40}
          cy={100 - (r.flakeScore - 60) * 2.5}
          r="4"
          fill="#4ade80"
        />
      ))}
    </svg>
  );
}

export default function DemoPage() {
  return (
    <div className="grid-bg min-h-screen">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Demo Banner */}
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-accent">Dashboard Demo</p>
            <p className="text-xs text-muted mt-0.5">
              This is a read-only preview with sample data. Sign up free to see your own test results.
            </p>
          </div>
          <Link
            href="/login"
            className="text-sm bg-accent hover:bg-accent-hover text-black font-semibold px-5 py-2 rounded-lg transition shrink-0"
          >
            Get Started Free
          </Link>
        </div>

        {/* Project Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">my-saas-app</h1>
            <p className="text-sm text-muted">Sample project with Playwright tests</p>
          </div>
          <span className="text-xs text-muted bg-card-bg border border-card-border px-3 py-1 rounded-full">
            Last run: 2 hours ago
          </span>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="FlakeScore" value="87.5%" sub="+2.3% from last run" />
          <StatCard label="Total Tests" value="142" sub="Across 12 test files" />
          <StatCard label="Flaky Tests" value="18" sub="Down from 39 last week" />
          <StatCard label="Stable Tests" value="124" sub="87.3% of suite" />
        </div>

        {/* Chart + Recent Runs */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Chart */}
          <div className="md:col-span-2 rounded-xl border border-card-border bg-card-bg p-6">
            <h2 className="text-sm font-semibold mb-4">FlakeScore Trend (7 days)</h2>
            <MiniChart />
            <div className="flex justify-between text-xs text-muted mt-2 px-2">
              {sampleRuns.map((r) => (
                <span key={r.id}>{r.date}</span>
              )).reverse()}
            </div>
          </div>

          {/* Recent Runs */}
          <div className="rounded-xl border border-card-border bg-card-bg p-6">
            <h2 className="text-sm font-semibold mb-4">Recent Runs</h2>
            <div className="space-y-3">
              {sampleRuns.slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-foreground font-medium">{r.flakeScore}%</p>
                    <p className="text-xs text-muted">{r.tests} tests</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted">{r.date}</p>
                    <p className="text-xs text-red-400">{r.flaky} flaky</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Flaky Tests Table */}
        <div className="rounded-xl border border-card-border bg-card-bg overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-card-border flex items-center justify-between">
            <h2 className="text-sm font-semibold">Flaky Tests</h2>
            <span className="text-xs text-muted">6 flaky tests detected</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted border-b border-card-border">
                  <th className="px-6 py-3 font-medium">Test Name</th>
                  <th className="px-6 py-3 font-medium">File</th>
                  <th className="px-6 py-3 font-medium text-center">Pass</th>
                  <th className="px-6 py-3 font-medium text-center">Fail</th>
                  <th className="px-6 py-3 font-medium text-center">Skip</th>
                  <th className="px-6 py-3 font-medium">Pass Rate</th>
                </tr>
              </thead>
              <tbody>
                {sampleFlakyTests.map((t) => (
                  <tr key={t.name} className="border-b border-card-border/50 hover:bg-card-border/10 transition">
                    <td className="px-6 py-3 font-mono text-xs max-w-xs truncate">{t.name}</td>
                    <td className="px-6 py-3 text-xs text-muted max-w-xs truncate">{t.file}</td>
                    <td className="px-6 py-3 text-center text-green-400">{t.pass}</td>
                    <td className="px-6 py-3 text-center text-red-400">{t.fail}</td>
                    <td className="px-6 py-3 text-center text-yellow-400">{t.skip}</td>
                    <td className="px-6 py-3"><PassRateBar rate={t.rate} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Analysis Preview (Pro) */}
        <div className="rounded-xl border border-card-border bg-card-bg p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold">AI Root Cause Analysis</h2>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded-full">
              Pro
            </span>
          </div>
          <div className="rounded-lg border border-card-border bg-background p-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">checkout.spec.ts &gt; should complete payment flow</p>
                <p className="text-xs text-muted leading-relaxed">
                  <strong className="text-foreground">Root Cause:</strong> Race condition in payment confirmation. The test clicks
                  &quot;Pay Now&quot; and immediately checks for the success message, but the Stripe webhook response time varies
                  (200ms-3s). Add an explicit wait for the success element with a 5s timeout.
                </p>
                <div className="flex gap-2 mt-3">
                  <span className="text-[10px] bg-red-400/10 text-red-400 px-2 py-0.5 rounded-full">Race Condition</span>
                  <span className="text-[10px] bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded-full">Timing</span>
                  <span className="text-[10px] bg-blue-400/10 text-blue-400 px-2 py-0.5 rounded-full">External Service</span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted mt-3 text-center">
            Upgrade to Pro for AI-powered root cause analysis on all your flaky tests.
          </p>
        </div>

        {/* CTA */}
        <div className="text-center py-10">
          <h2 className="text-2xl font-bold mb-3">Ready to fix your flaky tests?</h2>
          <p className="text-muted mb-6">Get started in 30 seconds. Free forever for CLI, free dashboard during launch.</p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/login"
              className="bg-accent hover:bg-accent-hover text-black font-semibold px-6 py-3 rounded-lg transition"
            >
              Get Started Free
            </Link>
            <Link
              href="/docs"
              className="border border-card-border hover:bg-card-border/30 px-6 py-3 rounded-lg transition text-sm"
            >
              Read the Docs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
