"use client";

import Link from "next/link";

/* ── Mock Data ── */
const mockTests = [
  { name: 'login.spec.ts > "should redirect after login"', passRate: 60, runs: 25, trend: "worse", lastSeen: "2 hours ago" },
  { name: 'cart.spec.ts > "should update quantity"', passRate: 72, runs: 18, trend: "stable", lastSeen: "3 hours ago" },
  { name: 'search.spec.ts > "should show suggestions"', passRate: 40, runs: 30, trend: "worse", lastSeen: "1 hour ago" },
  { name: 'checkout.spec.ts > "should apply discount"', passRate: 88, runs: 12, trend: "better", lastSeen: "5 hours ago" },
  { name: 'profile.spec.ts > "should upload avatar"', passRate: 56, runs: 20, trend: "worse", lastSeen: "30 min ago" },
];

const mockHistory = [
  { date: "Apr 1", score: 91 },
  { date: "Apr 2", score: 88 },
  { date: "Apr 3", score: 85 },
  { date: "Apr 4", score: 82 },
  { date: "Apr 5", score: 79 },
  { date: "Apr 6", score: 83 },
  { date: "Apr 7", score: 81 },
];

/* ── Stat Card ── */
function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-xl border border-card-border bg-card-bg p-5">
      <p className="text-sm text-muted mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted mt-1">{sub}</p>
    </div>
  );
}

/* ── Simple Bar Chart ── */
function MiniChart() {
  const max = Math.max(...mockHistory.map((h) => h.score));
  return (
    <div className="rounded-xl border border-card-border bg-card-bg p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">FlakeScore Trend</h3>
        <span className="text-xs text-muted">Last 7 days</span>
      </div>
      <div className="flex items-end gap-2 h-32">
        {mockHistory.map((h) => (
          <div key={h.date} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs text-muted">{h.score}</span>
            <div
              className="w-full rounded-t-md bg-accent/70 hover:bg-accent transition"
              style={{ height: `${(h.score / max) * 100}%` }}
            />
            <span className="text-xs text-muted">{h.date.split(" ")[1]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Pass Rate Bar ── */
function PassRateBar({ rate }: { rate: number }) {
  let color = "bg-green-500";
  if (rate < 70) color = "bg-red-500";
  else if (rate < 85) color = "bg-yellow-500";

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${rate}%` }} />
      </div>
      <span className="text-xs font-mono text-muted">{rate}%</span>
    </div>
  );
}

/* ── Trend Badge ── */
function TrendBadge({ trend }: { trend: string }) {
  const styles: Record<string, string> = {
    worse: "text-red-400 bg-red-400/10",
    stable: "text-yellow-400 bg-yellow-400/10",
    better: "text-green-400 bg-green-400/10",
  };
  const icons: Record<string, string> = { worse: "\u2193", better: "\u2191", stable: "\u2194" };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${styles[trend]}`}>
      {icons[trend]} {trend}
    </span>
  );
}

export default function DashboardPage() {
  return (
    <div className="grid-bg min-h-screen">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              <span className="text-xs text-muted uppercase tracking-wider">Demo Mode</span>
            </div>
            <h1 className="text-2xl font-bold">E-Commerce Test Suite</h1>
            <p className="text-sm text-muted">Project ID: demo-ecommerce &middot; Last run: 30 minutes ago</p>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/settings" className="text-sm border border-card-border px-4 py-2 rounded-lg hover:bg-card-bg transition">
              Settings
            </Link>
            <button className="text-sm bg-accent hover:bg-accent-hover text-black font-semibold px-4 py-2 rounded-lg transition">
              Run Now
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="FlakeScore" value="81.2" sub="&#8595; 9.8 from last week" color="text-yellow-400" />
          <StatCard label="Total Tests" value="46" sub="Across 12 spec files" color="text-foreground" />
          <StatCard label="Flaky Tests" value="5" sub="&#8593; 2 new this week" color="text-red-400" />
          <StatCard label="Stable Tests" value="40" sub="100% pass rate" color="text-green-400" />
        </div>

        {/* Chart */}
        <div className="mb-8">
          <MiniChart />
        </div>

        {/* Flaky Tests Table */}
        <div className="rounded-xl border border-card-border bg-card-bg overflow-hidden">
          <div className="flex justify-between items-center px-5 py-4 border-b border-card-border">
            <h2 className="font-semibold">Flaky Tests</h2>
            <span className="text-xs text-muted">Sorted by pass rate (lowest first)</span>
          </div>

          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 text-xs text-muted uppercase tracking-wider border-b border-card-border bg-[#111]">
            <div className="col-span-5">Test Name</div>
            <div className="col-span-2">Pass Rate</div>
            <div className="col-span-1 text-center">Runs</div>
            <div className="col-span-2 text-center">Trend</div>
            <div className="col-span-2 text-right">Last Seen</div>
          </div>

          {/* Rows */}
          {mockTests.map((t) => (
            <div
              key={t.name}
              className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-5 py-4 border-b border-card-border hover:bg-[#111] transition items-center"
            >
              <div className="md:col-span-5 font-mono text-sm truncate">{t.name}</div>
              <div className="md:col-span-2">
                <PassRateBar rate={t.passRate} />
              </div>
              <div className="md:col-span-1 text-center text-sm text-muted">{t.runs}</div>
              <div className="md:col-span-2 text-center">
                <TrendBadge trend={t.trend} />
              </div>
              <div className="md:col-span-2 text-right text-sm text-muted">{t.lastSeen}</div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-10 text-center py-10 rounded-xl border border-dashed border-card-border">
          <p className="text-muted mb-3">This is a demo dashboard with mock data.</p>
          <p className="text-sm text-muted mb-6">
            Sign up to connect your real test suite and start tracking flakiness.
          </p>
          <button className="bg-accent hover:bg-accent-hover text-black font-semibold px-6 py-2.5 rounded-lg transition">
            Start Free Trial
          </button>
        </div>
      </div>
    </div>
  );
}
