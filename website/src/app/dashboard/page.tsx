"use client";

import { useState } from "react";
import Link from "next/link";

/* ── Types ── */
interface MockTest {
  name: string;
  passRate: number;
  runs: number;
  trend: string;
  lastSeen: string;
  errorMessage?: string;
  stackTrace?: string;
}

interface AnalysisResult {
  category: string;
  confidence: number;
  rootCause: string;
  suggestedFix: string;
}

/* ── Mock Data ── */
const mockTests: MockTest[] = [
  {
    name: 'login.spec.ts > "should redirect after login"',
    passRate: 60,
    runs: 25,
    trend: "worse",
    lastSeen: "2 hours ago",
    errorMessage:
      "TimeoutError: waiting for selector \"#dashboard\" failed: timeout 30000ms exceeded",
    stackTrace:
      "  at login.spec.ts:14:22\n  at waitForSelector (node_modules/playwright/lib/helper.js:112:15)\n  at Context.<anonymous> (login.spec.ts:14:22)",
  },
  {
    name: 'cart.spec.ts > "should update quantity"',
    passRate: 72,
    runs: 18,
    trend: "stable",
    lastSeen: "3 hours ago",
    errorMessage:
      "expect(received).toBe(expected)\n\nExpected: 3\nReceived: 2",
    stackTrace:
      "  at Object.<anonymous> (cart.spec.ts:28:31)\n  at runTest (node_modules/jest-runner/build/runTest.js:444:34)",
  },
  {
    name: 'search.spec.ts > "should show suggestions"',
    passRate: 40,
    runs: 30,
    trend: "worse",
    lastSeen: "1 hour ago",
    errorMessage:
      "expect(received).toBeGreaterThan(expected)\n\nExpected: > 0.5\nReceived: 0.23",
    stackTrace:
      "  at Object.<anonymous> (search.spec.ts:42:18)\n  at flaky.spec.ts:42:18\n  at processTicksAndRejections (node:internal/process/task_queues:95:5)",
  },
  {
    name: 'checkout.spec.ts > "should apply discount"',
    passRate: 88,
    runs: 12,
    trend: "better",
    lastSeen: "5 hours ago",
  },
  {
    name: 'profile.spec.ts > "should upload avatar"',
    passRate: 56,
    runs: 20,
    trend: "worse",
    lastSeen: "30 min ago",
    errorMessage:
      "Error: ECONNREFUSED 127.0.0.1:3001 - File upload service unavailable",
    stackTrace:
      "  at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1494:16)\n  at profile.spec.ts:35:9\n  at uploadAvatar (src/services/upload.ts:22:11)",
  },
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

/* ── Mock AI Analysis Results ── */
const mockAnalysisResults: Record<string, AnalysisResult> = {
  'login.spec.ts > "should redirect after login"': {
    category: "flaky",
    confidence: 82,
    rootCause:
      "The test waits for a #dashboard selector with a fixed 30s timeout, but the redirect after login involves an async token refresh that can take variable time depending on server load. The test passes when the server is fast and fails under load.",
    suggestedFix: `// Use a retry strategy instead of a fixed timeout
await expect(async () => {
  await page.waitForSelector('#dashboard', {
    timeout: 5000
  });
}).toPass({ timeout: 60000, intervals: [1000, 2000, 5000] });`,
  },
  'cart.spec.ts > "should update quantity"': {
    category: "application_bug",
    confidence: 91,
    rootCause:
      "The cart quantity update handler has a race condition. When updateQuantity() is called, it dispatches two state updates (quantity and total) non-atomically. The test reads the quantity before the second update completes, seeing a stale value of 2 instead of 3.",
    suggestedFix: `// Fix: Batch state updates in the cart reducer
function updateQuantity(itemId: number, qty: number) {
  // Use a single dispatch with both values
  dispatch({
    type: 'UPDATE_ITEM',
    payload: { itemId, quantity: qty, total: qty * price }
  });
}`,
  },
  'search.spec.ts > "should show suggestions"': {
    category: "flaky",
    confidence: 87,
    rootCause:
      "The test relies on Math.random() which produces non-deterministic values. The search suggestion ranking uses a randomized scoring algorithm, so the assertion toBeGreaterThan(0.5) fails roughly 50% of the time when the random seed produces values below 0.5.",
    suggestedFix: `// Mock Math.random for deterministic
// test results
jest.spyOn(Math, 'random')
  .mockReturnValue(0.75);

// Or use a seeded PRNG library:
// import { seedrandom } from 'seedrandom';
// const rng = seedrandom('test-seed');`,
  },
  'profile.spec.ts > "should upload avatar"': {
    category: "environment",
    confidence: 94,
    rootCause:
      "The test depends on a local file upload microservice running on port 3001. This service is not started by the test setup and is only available when the full docker-compose stack is running. In CI, the service is often not ready when tests begin.",
    suggestedFix: `// Add a health check before running upload tests
beforeAll(async () => {
  await waitForService('http://localhost:3001/health', {
    retries: 10,
    delay: 1000,
  });
});

// Or mock the upload service entirely:
jest.mock('../services/upload', () => ({
  uploadAvatar: jest.fn().mockResolvedValue({
    url: 'https://cdn.example.com/avatar.png'
  })
}));`,
  },
};

/* ── Category Config ── */
const categoryConfig: Record<
  string,
  { label: string; bg: string; text: string; emoji: string }
> = {
  infrastructure: {
    label: "Infrastructure",
    bg: "bg-gray-500/15",
    text: "text-gray-400",
    emoji: "\u2699\ufe0f",
  },
  application_bug: {
    label: "App Bug",
    bg: "bg-red-500/15",
    text: "text-red-400",
    emoji: "\ud83d\udc1b",
  },
  test_code: {
    label: "Test Code",
    bg: "bg-blue-500/15",
    text: "text-blue-400",
    emoji: "\ud83e\uddea",
  },
  environment: {
    label: "Environment",
    bg: "bg-purple-500/15",
    text: "text-purple-400",
    emoji: "\ud83c\udf10",
  },
  flaky: {
    label: "Flaky",
    bg: "bg-yellow-500/15",
    text: "text-yellow-400",
    emoji: "\ud83d\udfe1",
  },
  unknown: {
    label: "Unknown",
    bg: "bg-gray-500/15",
    text: "text-gray-400",
    emoji: "\u2753",
  },
};

/* ── Stat Card ── */
function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
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
          <div
            key={h.date}
            className="flex-1 flex flex-col items-center gap-1"
          >
            <span className="text-xs text-muted">{h.score}</span>
            <div
              className="w-full rounded-t-md bg-accent/70 hover:bg-accent transition"
              style={{ height: `${(h.score / max) * 100}%` }}
            />
            <span className="text-xs text-muted">
              {h.date.split(" ")[1]}
            </span>
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
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${rate}%` }}
        />
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
  const icons: Record<string, string> = {
    worse: "\u2193",
    better: "\u2191",
    stable: "\u2194",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${styles[trend]}`}>
      {icons[trend]} {trend}
    </span>
  );
}

/* ── Category Badge ── */
function CategoryBadge({ category }: { category: string }) {
  const config = categoryConfig[category] || categoryConfig.unknown;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full ${config.bg} ${config.text}`}
    >
      <span>{config.emoji}</span>
      {config.label}
    </span>
  );
}

/* ── Confidence Bar ── */
function ConfidenceBar({ confidence }: { confidence: number }) {
  let barColor = "bg-green-500";
  if (confidence < 60) barColor = "bg-red-500";
  else if (confidence < 80) barColor = "bg-yellow-500";

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted">Confidence:</span>
      <div className="flex-1 h-2.5 bg-[#1a1a1a] rounded-full overflow-hidden max-w-48">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-700 ease-out`}
          style={{ width: `${confidence}%` }}
        />
      </div>
      <span className="text-sm font-semibold font-mono">{confidence}%</span>
    </div>
  );
}

/* ── Loading Spinner ── */
function Spinner() {
  return (
    <div className="flex items-center justify-center gap-3 py-8">
      <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      <span className="text-sm text-muted">Analyzing test with AI...</span>
    </div>
  );
}

/* ── Main Page ── */
export default function DashboardPage() {
  const [selectedTest, setSelectedTest] = useState<MockTest | null>(null);
  const [analysisResult, setAnalysisResult] =
    useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [noConfig, setNoConfig] = useState(false);

  const handleTestClick = (test: MockTest) => {
    if (!test.errorMessage) return;
    setSelectedTest(test);
    setAnalysisResult(null);
    setNoConfig(false);
  };

  const handleAnalyze = async () => {
    if (!selectedTest) return;

    const config = localStorage.getItem("deflaky_ai_config");
    if (!config) {
      setNoConfig(true);
      return;
    }

    setNoConfig(false);
    setIsAnalyzing(true);

    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: JSON.parse(config),
          test: {
            name: selectedTest.name,
            passRate: selectedTest.passRate,
            runs: selectedTest.runs,
            errorMessage: selectedTest.errorMessage,
            stackTrace: selectedTest.stackTrace,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysisResult(data);
      } else {
        // Fallback to mock data on API error
        const mockResult = mockAnalysisResults[selectedTest.name];
        if (mockResult) {
          setAnalysisResult(mockResult);
        }
      }
    } catch {
      // Fallback to mock results when API is unavailable
      const mockResult = mockAnalysisResults[selectedTest.name];
      if (mockResult) {
        setAnalysisResult(mockResult);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="grid-bg min-h-screen">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              <span className="text-xs text-muted uppercase tracking-wider">
                Demo Mode
              </span>
            </div>
            <h1 className="text-2xl font-bold">E-Commerce Test Suite</h1>
            <p className="text-sm text-muted">
              Project ID: demo-ecommerce &middot; Last run: 30 minutes ago
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/dashboard/settings"
              className="text-sm border border-card-border px-4 py-2 rounded-lg hover:bg-card-bg transition"
            >
              Settings
            </Link>
            <button className="text-sm bg-accent hover:bg-accent-hover text-black font-semibold px-4 py-2 rounded-lg transition">
              Run Now
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="FlakeScore"
            value="81.2"
            sub="&#8595; 9.8 from last week"
            color="text-yellow-400"
          />
          <StatCard
            label="Total Tests"
            value="46"
            sub="Across 12 spec files"
            color="text-foreground"
          />
          <StatCard
            label="Flaky Tests"
            value="5"
            sub="&#8593; 2 new this week"
            color="text-red-400"
          />
          <StatCard
            label="Stable Tests"
            value="40"
            sub="100% pass rate"
            color="text-green-400"
          />
        </div>

        {/* Chart */}
        <div className="mb-8">
          <MiniChart />
        </div>

        {/* Flaky Tests Table */}
        <div className="rounded-xl border border-card-border bg-card-bg overflow-hidden">
          <div className="flex justify-between items-center px-5 py-4 border-b border-card-border">
            <h2 className="font-semibold">Flaky Tests</h2>
            <span className="text-xs text-muted">
              Sorted by pass rate (lowest first)
            </span>
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
          {mockTests.map((t) => {
            const isSelected = selectedTest?.name === t.name;
            const isClickable = !!t.errorMessage;

            return (
              <div
                key={t.name}
                onClick={() => handleTestClick(t)}
                className={`grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-5 py-4 border-b border-card-border transition items-center
                  ${isClickable ? "cursor-pointer" : "cursor-default"}
                  ${isSelected ? "bg-accent/10 border-l-2 border-l-accent" : "hover:bg-[#111]"}
                `}
              >
                <div className="md:col-span-5 font-mono text-sm truncate flex items-center gap-2">
                  {isClickable && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                  )}
                  {t.name}
                </div>
                <div className="md:col-span-2">
                  <PassRateBar rate={t.passRate} />
                </div>
                <div className="md:col-span-1 text-center text-sm text-muted">
                  {t.runs}
                </div>
                <div className="md:col-span-2 text-center">
                  <TrendBadge trend={t.trend} />
                </div>
                <div className="md:col-span-2 text-right text-sm text-muted">
                  {t.lastSeen}
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Root Cause Analysis Panel */}
        <div className="mt-8 rounded-xl border border-card-border bg-card-bg overflow-hidden">
          <div className="flex justify-between items-center px-5 py-4 border-b border-card-border">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                />
              </svg>
              <h2 className="font-semibold">AI Root Cause Analysis</h2>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={!selectedTest || isAnalyzing}
              className={`text-sm font-semibold px-4 py-2 rounded-lg transition
                ${
                  selectedTest && !isAnalyzing
                    ? "bg-accent hover:bg-accent-hover text-black cursor-pointer"
                    : "bg-card-border text-muted cursor-not-allowed"
                }
              `}
            >
              Analyze with AI
            </button>
          </div>

          <div className="px-5 py-5">
            {/* No test selected state */}
            {!selectedTest && !isAnalyzing && !analysisResult && (
              <div className="text-center py-10">
                <svg
                  className="w-10 h-10 mx-auto text-muted/50 mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59"
                  />
                </svg>
                <p className="text-muted text-sm">
                  Select a failing or flaky test from the table above to analyze
                </p>
                <p className="text-muted/60 text-xs mt-1">
                  Tests with error data are marked with a red dot
                </p>
              </div>
            )}

            {/* Test selected but not analyzed yet */}
            {selectedTest && !isAnalyzing && !analysisResult && !noConfig && (
              <div className="py-4">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-[#111] border border-card-border">
                  <span className="w-2 h-2 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-medium truncate">
                      {selectedTest.name}
                    </p>
                    {selectedTest.errorMessage && (
                      <pre className="mt-2 text-xs text-red-400 font-mono whitespace-pre-wrap bg-red-400/5 rounded p-3 border border-red-400/10">
                        {selectedTest.errorMessage}
                      </pre>
                    )}
                    <p className="text-xs text-muted mt-3">
                      Click &quot;Analyze with AI&quot; to identify the root
                      cause
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* No AI config warning */}
            {noConfig && (
              <div className="py-4">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                  <svg
                    className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm text-yellow-400 font-medium">
                      AI provider not configured
                    </p>
                    <p className="text-xs text-muted mt-1">
                      Configure your AI provider in{" "}
                      <Link
                        href="/dashboard/settings"
                        className="text-accent hover:text-accent-hover underline underline-offset-2"
                      >
                        Settings &rarr; AI Settings
                      </Link>{" "}
                      to enable root cause analysis.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Loading state */}
            {isAnalyzing && <Spinner />}

            {/* Analysis results */}
            {analysisResult && !isAnalyzing && (
              <div className="space-y-5">
                {/* Category & Confidence */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                  <div className="flex items-center gap-3">
                    <CategoryBadge category={analysisResult.category} />
                  </div>
                  <div className="sm:w-72">
                    <ConfidenceBar confidence={analysisResult.confidence} />
                  </div>
                </div>

                {/* Root Cause */}
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-muted mb-2">
                    Root Cause
                  </h4>
                  <div className="p-4 rounded-lg bg-[#111] border border-card-border">
                    <p className="text-sm leading-relaxed">
                      {analysisResult.rootCause}
                    </p>
                  </div>
                </div>

                {/* Suggested Fix */}
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-muted mb-2">
                    Suggested Fix
                  </h4>
                  <div className="relative rounded-lg overflow-hidden border border-card-border">
                    <div className="flex items-center justify-between px-4 py-2 bg-[#0d0d0d] border-b border-card-border">
                      <span className="text-xs text-muted font-mono">
                        fix.ts
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            analysisResult.suggestedFix
                          );
                        }}
                        className="text-xs text-muted hover:text-foreground transition cursor-pointer"
                      >
                        Copy
                      </button>
                    </div>
                    <pre className="p-4 bg-[#111] text-sm font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      <code>{analysisResult.suggestedFix}</code>
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-10 text-center py-10 rounded-xl border border-dashed border-card-border">
          <p className="text-muted mb-3">
            This is a demo dashboard with mock data.
          </p>
          <p className="text-sm text-muted mb-6">
            Sign up to connect your real test suite and start tracking
            flakiness.
          </p>
          <button className="bg-accent hover:bg-accent-hover text-black font-semibold px-6 py-2.5 rounded-lg transition">
            Start Free Trial
          </button>
        </div>
      </div>
    </div>
  );
}
