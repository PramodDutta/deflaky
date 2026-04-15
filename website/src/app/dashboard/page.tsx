"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

/* ── Types ── */
interface Project {
  id: string;
  name: string;
  slug: string;
  apiToken: string;
  teamId: string | null;
  createdAt: string;
}

interface Team {
  id: string;
  name: string;
  slug: string;
  role: string;
  memberCount: number;
}

interface FlakyTest {
  testName: string;
  filePath: string | null;
  passCount: number;
  failCount: number;
  skipCount: number;
  totalRuns: number;
  passRate: number;
}

interface DashboardStats {
  flakeScore: number;
  totalTests: number;
  flakyCount: number;
  stableCount: number;
}

interface RecentRun {
  id: string;
  command: string;
  iterations: number;
  totalTests: number;
  flakeScore: number;
  createdAt: string;
}

interface DashboardData {
  project: { id: string; name: string; slug: string; createdAt: string };
  stats: DashboardStats;
  recentRuns: RecentRun[];
  flakyTests: FlakyTest[];
}

interface AnalysisResult {
  category: string;
  confidence: number;
  rootCause: string;
  suggestedFix: string;
}

/* ── Category Config ── */
const categoryConfig: Record<string, { label: string; bg: string; text: string; border: string; emoji: string }> = {
  infrastructure: { label: "Infrastructure", bg: "bg-gray-500/15", text: "text-gray-400", border: "border-gray-500/30", emoji: "\u2699\ufe0f" },
  application_bug: { label: "App Bug", bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30", emoji: "\ud83d\udc1b" },
  test_code: { label: "Test Code", bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30", emoji: "\ud83e\uddea" },
  environment: { label: "Environment", bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/30", emoji: "\ud83c\udf10" },
  flaky: { label: "Flaky", bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-500/30", emoji: "\ud83d\udfe1" },
  unknown: { label: "Unknown", bg: "bg-gray-500/15", text: "text-gray-400", border: "border-gray-500/30", emoji: "\u2753" },
};

/* ── Sub-components ── */
function StatCard({ label, value, sub, color, icon }: { label: string; value: string; sub: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-card-border bg-card-bg p-5 hover:border-accent/30 transition group">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted uppercase tracking-wider font-medium">{label}</p>
        <div className="w-8 h-8 rounded-lg bg-card-border/50 flex items-center justify-center group-hover:bg-accent/10 transition">
          {icon}
        </div>
      </div>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted mt-1">{sub}</p>
    </div>
  );
}

function PassRateBar({ rate }: { rate: number }) {
  let color = "bg-green-500";
  if (rate < 70) color = "bg-red-500";
  else if (rate < 85) color = "bg-yellow-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-card-border/50 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${rate}%` }} />
      </div>
      <span className="text-xs font-mono text-muted">{rate}%</span>
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const config = categoryConfig[category] || categoryConfig.unknown;
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border ${config.bg} ${config.text} ${config.border}`}>
      <span>{config.emoji}</span>
      {config.label}
    </span>
  );
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  let barColor = "bg-green-500";
  let textColor = "text-green-400";
  if (confidence < 60) { barColor = "bg-red-500"; textColor = "text-red-400"; }
  else if (confidence < 80) { barColor = "bg-yellow-500"; textColor = "text-yellow-400"; }
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted uppercase tracking-wider">Confidence</span>
      <div className="flex-1 h-2 bg-card-border/50 rounded-full overflow-hidden max-w-32">
        <div className={`h-full rounded-full ${barColor} transition-all duration-700 ease-out`} style={{ width: `${confidence}%` }} />
      </div>
      <span className={`text-sm font-bold font-mono ${textColor}`}>{confidence}%</span>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="relative">
        <div className="w-12 h-12 border-2 border-accent/20 rounded-full" />
        <div className="absolute inset-0 w-12 h-12 border-2 border-transparent border-t-accent rounded-full animate-spin" />
        <div className="absolute inset-2 w-8 h-8 border-2 border-transparent border-b-accent/50 rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "0.8s" }} />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-accent">Analyzing with AI...</p>
        <p className="text-xs text-muted mt-1">Identifying root cause and generating fix</p>
      </div>
    </div>
  );
}

function MiniChart({ runs }: { runs: RecentRun[] }) {
  const data = runs.slice(0, 7).reverse();
  if (data.length === 0) return null;
  const max = Math.max(...data.map((r) => r.flakeScore), 1);
  return (
    <div className="rounded-xl border border-card-border bg-card-bg p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold">FlakeScore Trend</h3>
        <span className="text-xs text-muted">Last {data.length} runs</span>
      </div>
      <div className="flex items-end gap-2 h-32">
        {data.map((r, i) => (
          <div key={r.id || i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs text-muted">{r.flakeScore}</span>
            <div
              className="w-full rounded-t-md bg-accent/70 hover:bg-accent transition"
              style={{ height: `${(r.flakeScore / max) * 100}%` }}
            />
            <span className="text-[10px] text-muted">
              {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Create Project Modal ── */
function CreateProjectModal({ userId, onCreated, onClose }: { userId: string; onCreated: () => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [createdToken, setCreatedToken] = useState("");

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""));
  };

  const handleCreate = async () => {
    if (!name.trim() || !slug.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim(), userId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create project");
        return;
      }
      const data = await res.json();
      setCreatedToken(data.project.apiToken);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-xl border border-card-border bg-card-bg shadow-2xl">
        <div className="flex justify-between items-center px-6 py-4 border-b border-card-border">
          <h2 className="text-lg font-semibold">{createdToken ? "Project Created!" : "Create New Project"}</h2>
          <button onClick={createdToken ? () => { onCreated(); onClose(); } : onClose} className="text-muted hover:text-foreground cursor-pointer">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l8 8M6 14L14 6" /></svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {createdToken ? (
            <div className="space-y-4">
              <p className="text-sm text-muted">Your API token for pushing test results via the CLI:</p>
              <div className="relative">
                <code className="block w-full p-3 rounded-lg bg-background border border-card-border text-sm font-mono break-all">{createdToken}</code>
                <button onClick={() => navigator.clipboard.writeText(createdToken)} className="absolute top-2 right-2 text-xs text-muted hover:text-foreground bg-card-bg border border-card-border px-2 py-1 rounded cursor-pointer">Copy</button>
              </div>
              <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                <p className="text-xs text-yellow-400">Save this token now. You won&apos;t be able to see it again.</p>
              </div>
              <div className="p-3 rounded-lg bg-card-border/30 border border-card-border">
                <p className="text-xs text-muted mb-1">Usage:</p>
                <code className="text-xs font-mono text-accent">deflaky run -c &quot;npx playwright test&quot; -r 5 --push -t {createdToken}</code>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">Project Name</label>
                <input type="text" value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="My Test Suite" className="w-full border border-card-border rounded-lg bg-card-border/30 px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Slug</label>
                <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my-test-suite" className="w-full border border-card-border rounded-lg bg-card-border/30 px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-accent transition" />
                <p className="text-xs text-muted mt-1">Only lowercase letters, numbers, and hyphens</p>
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
            </>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-card-border">
          {createdToken ? (
            <button onClick={() => { onCreated(); onClose(); }} className="bg-accent hover:bg-accent-hover text-black font-semibold px-6 py-2 rounded-lg transition cursor-pointer">Go to Dashboard</button>
          ) : (
            <>
              <button onClick={onClose} className="text-sm text-muted hover:text-foreground px-4 py-2 cursor-pointer">Cancel</button>
              <button onClick={handleCreate} disabled={creating || !name.trim() || !slug.trim()} className="bg-accent hover:bg-accent-hover text-black font-semibold px-6 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">{creating ? "Creating..." : "Create Project"}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Sidebar Icons ── */
const icons = {
  dashboard: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" />
    </svg>
  ),
  runs: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  settings: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  collapse: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  ),
  plus: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
  ai: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  ),
};

/* ── Main Page ── */
export default function DashboardPage() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [selectedTest, setSelectedTest] = useState<FlakyTest | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [noConfig, setNoConfig] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisProvider, setAnalysisProvider] = useState<{ provider: string; model: string } | null>(null);
  const [projectSearch, setProjectSearch] = useState("");
  const [testHistory, setTestHistory] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  // Team state
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null); // null = personal
  const [teamSwitcherOpen, setTeamSwitcherOpen] = useState(false);

  // Fetch teams
  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch("/api/teams");
      if (res.ok) {
        const data = await res.json();
        setTeams(data.teams || []);
      }
    } catch {
      console.error("Failed to fetch teams");
    }
  }, []);

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
        if (data.projects?.length > 0 && !selectedProjectId) {
          setSelectedProjectId(data.projects[0].id);
        }
      }
    } catch {
      console.error("Failed to fetch projects");
    }
  }, [selectedProjectId]);

  // Fetch dashboard data for selected project
  const fetchDashboard = useCallback(async (projectId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch {
      console.error("Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTestHistory = useCallback(async (projectId: string, testName: string) => {
    setHistoryLoading(true);
    setTestHistory(null);
    setExpandedRunId(null);
    try {
      const res = await fetch(`/api/dashboard/${projectId}/test-history?testName=${encodeURIComponent(testName)}`);
      if (res.ok) {
        const data = await res.json();
        setTestHistory(data);
      }
    } catch {
      console.error("Failed to fetch test history");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useEffect(() => { fetchTeams(); }, [fetchTeams]);
  useEffect(() => {
    if (selectedProjectId) { fetchDashboard(selectedProjectId); }
    else { setLoading(false); }
  }, [selectedProjectId, fetchDashboard]);

  // Filter projects based on active team context
  const filteredProjects = projects.filter((p) => {
    if (activeTeamId === null) {
      // Personal: show projects with no teamId
      return !p.teamId;
    }
    return p.teamId === activeTeamId;
  });

  // When team context changes, select first project in that context
  useEffect(() => {
    const contextProjects = projects.filter((p) =>
      activeTeamId === null ? !p.teamId : p.teamId === activeTeamId
    );
    if (contextProjects.length > 0) {
      setSelectedProjectId(contextProjects[0].id);
    } else {
      setSelectedProjectId(null);
      setDashboardData(null);
    }
  }, [activeTeamId, projects]);

  const handleAnalyze = async () => {
    if (!selectedTest) return;
    const config = localStorage.getItem("deflaky_ai_config");
    if (!config) { setNoConfig(true); return; }
    setNoConfig(false);
    setAnalysisError(null);
    setAnalysisProvider(null);
    setIsAnalyzing(true);
    try {
      const parsedConfig = JSON.parse(config);
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: parsedConfig,
          testData: {
            testName: selectedTest.testName,
            filePath: selectedTest.filePath || undefined,
            errorMessage: `Test "${selectedTest.testName}" is flaky with ${selectedTest.passRate}% pass rate (${selectedTest.passCount} pass, ${selectedTest.failCount} fail, ${selectedTest.skipCount} skip across ${selectedTest.totalRuns} runs). The test intermittently fails without code changes.`,
            previousRuns: Array.from({ length: selectedTest.totalRuns }, (_, i) => ({
              status: i < selectedTest.passCount ? "pass" as const : "fail" as const,
              timestamp: new Date(Date.now() - i * 3600000).toISOString(),
            })),
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setAnalysisError(data.error || `Analysis failed (HTTP ${response.status})`);
        return;
      }
      // API returns { success, analysis: {...}, provider, model }
      if (data.analysis) {
        setAnalysisResult(data.analysis);
        setAnalysisProvider({ provider: data.provider, model: data.model });
      } else if (data.rootCause) {
        // Fallback: direct fields
        setAnalysisResult(data);
      } else {
        setAnalysisError("Unexpected response format from AI");
      }
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Failed to connect to AI provider");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const stats = dashboardData?.stats;
  const flakyTests = dashboardData?.flakyTests || [];
  const recentRuns = dashboardData?.recentRuns || [];

  // Empty state — no projects yet
  if (!loading && projects.length === 0) {
    return (
      <div className="grid-bg min-h-screen">
        <div className="mx-auto max-w-2xl px-6 py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-6">
            {icons.plus}
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome to DeFlaky</h1>
          <p className="text-muted mb-8 max-w-md mx-auto">Create your first project to start tracking flaky tests.</p>
          <button onClick={() => setShowCreateModal(true)} className="bg-accent hover:bg-accent-hover text-black font-semibold px-8 py-3 rounded-lg transition cursor-pointer">Create Your First Project</button>
          <div className="mt-12 p-6 rounded-xl border border-card-border bg-card-bg text-left max-w-md mx-auto">
            <h3 className="font-semibold mb-3">Quick Start</h3>
            <div className="space-y-3 text-sm">
              <div className="flex gap-3"><span className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold flex-shrink-0">1</span><span className="text-muted">Install: <code className="text-accent">npm i -g deflaky-cli</code></span></div>
              <div className="flex gap-3"><span className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold flex-shrink-0">2</span><span className="text-muted">Create a project and get your API token</span></div>
              <div className="flex gap-3"><span className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold flex-shrink-0">3</span><span className="text-muted">Run: <code className="text-accent">deflaky run -c &quot;npx playwright test&quot; -r 5 --push -t YOUR_TOKEN</code></span></div>
            </div>
          </div>
          {showCreateModal && session?.user?.id && (
            <CreateProjectModal userId={session.user.id} onCreated={fetchProjects} onClose={() => setShowCreateModal(false)} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid-bg min-h-screen flex">
      {/* ══════ Collapsible Left Sidebar ══════ */}
      <aside className={`${sidebarOpen ? "w-64" : "w-16"} shrink-0 border-r border-card-border bg-card-bg/50 backdrop-blur-sm transition-all duration-300 hidden md:flex flex-col sticky top-0 h-screen`}>
        {/* Sidebar Header */}
        <div className={`flex items-center ${sidebarOpen ? "justify-between" : "justify-center"} px-3 py-4 border-b border-card-border`}>
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-black font-bold text-[10px]">df</div>
              <span className="text-sm font-bold">Dashboard</span>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-8 h-8 rounded-lg hover:bg-card-border/50 flex items-center justify-center transition cursor-pointer text-muted hover:text-foreground" title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}>
            {sidebarOpen ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            )}
          </button>
        </div>

        {/* Team / Personal Switcher + Projects List */}
        <div className="flex-1 overflow-y-auto py-2">
          {/* Team Switcher */}
          {sidebarOpen ? (
            <div className="px-3 py-2 border-b border-card-border/50 mb-2">
              <p className="text-[10px] text-muted uppercase tracking-wider font-semibold mb-2">Workspace</p>
              <div className="relative">
                <button
                  onClick={() => setTeamSwitcherOpen(!teamSwitcherOpen)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-card-border bg-card-border/20 hover:bg-card-border/40 transition cursor-pointer"
                >
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    activeTeamId === null ? "bg-accent/20 text-accent" : "bg-purple-500/20 text-purple-400"
                  }`}>
                    {activeTeamId === null ? (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
                    )}
                  </div>
                  <span className="text-xs font-medium truncate flex-1 text-left">
                    {activeTeamId === null ? "Personal" : teams.find((t) => t.id === activeTeamId)?.name || "Team"}
                  </span>
                  <svg className={`w-3.5 h-3.5 text-muted transition-transform ${teamSwitcherOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                </button>

                {/* Dropdown */}
                {teamSwitcherOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-card-border bg-card-bg shadow-xl overflow-hidden">
                    <button
                      onClick={() => { setActiveTeamId(null); setTeamSwitcherOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition cursor-pointer ${
                        activeTeamId === null ? "bg-accent/10 text-foreground" : "hover:bg-card-border/30 text-muted"
                      }`}
                    >
                      <div className="w-5 h-5 rounded-md bg-accent/20 flex items-center justify-center">
                        <svg className="w-3 h-3 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                      </div>
                      <span className="text-xs font-medium">Personal</span>
                      {activeTeamId === null && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />}
                    </button>

                    {teams.length > 0 && (
                      <div className="border-t border-card-border/50">
                        <p className="text-[9px] text-muted uppercase tracking-wider px-3 py-1.5">Teams</p>
                        {teams.map((team) => (
                          <button
                            key={team.id}
                            onClick={() => { setActiveTeamId(team.id); setTeamSwitcherOpen(false); }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition cursor-pointer ${
                              activeTeamId === team.id ? "bg-accent/10 text-foreground" : "hover:bg-card-border/30 text-muted"
                            }`}
                          >
                            <div className="w-5 h-5 rounded-md bg-purple-500/20 flex items-center justify-center">
                              <span className="text-[9px] font-bold text-purple-400">{team.name.charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-medium truncate block">{team.name}</span>
                              <span className="text-[9px] text-muted">{team.memberCount} member{team.memberCount !== 1 ? "s" : ""} &middot; {team.role}</span>
                            </div>
                            {activeTeamId === team.id && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent shrink-0" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="px-0 py-2 flex justify-center border-b border-card-border/50 mb-2">
              <button
                onClick={() => { setSidebarOpen(true); setTeamSwitcherOpen(true); }}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer ${
                  activeTeamId === null ? "bg-accent/20 text-accent hover:bg-accent/30" : "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                }`}
                title={activeTeamId === null ? "Personal workspace" : teams.find((t) => t.id === activeTeamId)?.name || "Team"}
              >
                {activeTeamId === null ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
                )}
              </button>
            </div>
          )}

          {/* Projects List */}
          {sidebarOpen && (
            <div className="px-3 py-2">
              <p className="text-[10px] text-muted uppercase tracking-wider font-semibold mb-2">Projects</p>
              {filteredProjects.length > 5 && (
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  className="w-full text-xs border border-card-border rounded-md bg-card-border/20 px-2.5 py-1.5 focus:outline-none focus:border-accent transition placeholder:text-muted/50 mb-2"
                />
              )}
            </div>
          )}
          {filteredProjects.filter((p) => !projectSearch || p.name.toLowerCase().includes(projectSearch.toLowerCase()) || p.slug.toLowerCase().includes(projectSearch.toLowerCase())).map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProjectId(p.id)}
              className={`w-full flex items-center gap-2.5 ${sidebarOpen ? "px-3" : "px-0 justify-center"} py-2.5 transition cursor-pointer ${
                p.id === selectedProjectId ? "bg-accent/10 border-r-2 border-r-accent" : "hover:bg-card-border/30"
              }`}
              title={p.name}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                p.id === selectedProjectId ? "bg-accent text-black" : "bg-card-border/70 text-muted"
              }`}>
                {p.name.charAt(0).toUpperCase()}
              </div>
              {sidebarOpen && (
                <div className="min-w-0 text-left">
                  <p className={`text-sm font-medium truncate ${p.id === selectedProjectId ? "text-foreground" : "text-muted"}`}>{p.name}</p>
                  <p className="text-[10px] text-muted truncate">{p.slug}</p>
                </div>
              )}
            </button>
          ))}

          {/* Add Project Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className={`w-full flex items-center gap-2.5 ${sidebarOpen ? "px-3" : "px-0 justify-center"} py-2.5 transition cursor-pointer hover:bg-card-border/30 text-muted hover:text-accent mt-1 border-t border-card-border/50`}
          >
            <div className="w-8 h-8 rounded-lg border border-dashed border-card-border flex items-center justify-center shrink-0">
              {icons.plus}
            </div>
            {sidebarOpen && <span className="text-sm">New Project</span>}
          </button>
        </div>

        {/* Sidebar Nav */}
        <div className="border-t border-card-border py-2">
          {[
            { icon: icons.dashboard, label: "Overview", href: "/dashboard", active: true },
            { icon: icons.settings, label: "Settings", href: "/dashboard/settings", active: false },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-2.5 ${sidebarOpen ? "px-3" : "px-0 justify-center"} py-2.5 transition text-sm ${
                item.active ? "text-foreground font-medium" : "text-muted hover:text-foreground"
              }`}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0">{item.icon}</div>
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </div>

        {/* User */}
        {session?.user && (
          <div className={`border-t border-card-border px-3 py-3 flex items-center gap-2.5 ${sidebarOpen ? "" : "justify-center"}`}>
            {session.user.image ? (
              <img src={session.user.image} alt="" className="w-8 h-8 rounded-full shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-card-border flex items-center justify-center text-xs font-bold shrink-0">{session.user.name?.charAt(0) || "?"}</div>
            )}
            {sidebarOpen && (
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{session.user.name}</p>
                <p className="text-[10px] text-muted truncate">{session.user.email}</p>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* ══════ Main Content ══════ */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Compact top bar — logo + essential links + sign out */}
        <div className="border-b border-card-border bg-card-bg/50 backdrop-blur-sm px-6 py-2.5 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-6 h-6 rounded bg-accent flex items-center justify-center text-black font-bold text-[9px]">df</div>
              <span className="text-sm font-bold">De<span className="text-accent">Flaky</span></span>
            </Link>
            <div className="hidden sm:flex items-center gap-4 text-xs text-muted">
              <Link href="/docs" className="hover:text-foreground transition">Docs</Link>
              <Link href="/blog" className="hover:text-foreground transition">Blog</Link>
              <a href="https://github.com/PramodDutta/deflaky" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition">GitHub</a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {session?.user && (
              <>
                <span className="text-xs text-muted hidden sm:block">{session.user.email}</span>
                <button onClick={() => { import("next-auth/react").then(m => m.signOut({ callbackUrl: "/" })); }} className="text-xs text-muted hover:text-red-400 transition cursor-pointer">Sign out</button>
              </>
            )}
          </div>
        </div>

        {/* Trial / Upgrade Banner */}
        {session?.user && (() => {
          const plan = session.user.plan;
          const trialEndsAt = session.user.trialEndsAt;
          const subscriptionId = session.user.stripeSubscriptionId;

          // Active trial
          if (trialEndsAt && new Date(trialEndsAt) > new Date() && !(plan === "pro" && subscriptionId)) {
            const daysLeft = Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return (
              <div className="bg-accent/10 border-b border-accent/30 px-6 py-3 flex items-center justify-between">
                <p className="text-sm text-accent">
                  You&apos;re on a 15-day free trial. <strong>{daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining.</strong>
                </p>
                <a href="/pricing" className="text-xs font-semibold bg-accent hover:bg-accent-hover text-black px-4 py-1.5 rounded-lg transition">Upgrade to Pro</a>
              </div>
            );
          }

          // Trial expired, no active subscription
          if (trialEndsAt && new Date(trialEndsAt) <= new Date() && !(plan === "pro" && subscriptionId)) {
            return (
              <div className="bg-red-500/10 border-b border-red-500/30 px-6 py-4 flex items-center justify-between">
                <p className="text-sm text-red-400">
                  Your trial has ended. Upgrade to Pro to access your dashboard data.
                </p>
                <a href="/pricing" className="text-xs font-semibold bg-accent hover:bg-accent-hover text-black px-4 py-1.5 rounded-lg transition">Upgrade Now</a>
              </div>
            );
          }

          return null;
        })()}

        <div className="flex-1 max-w-6xl mx-auto px-6 py-8 w-full">
          {/* Mobile sidebar toggle */}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden mb-4 p-2 rounded-lg border border-card-border hover:bg-card-border/30 transition cursor-pointer">
            {icons.collapse}
          </button>

          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold">{selectedProject?.name || "Dashboard"}</h1>
              <p className="text-sm text-muted mt-0.5">
                {dashboardData?.project ? (
                  <>Slug: {dashboardData.project.slug} &middot; {recentRuns.length > 0 ? `Last run: ${new Date(recentRuns[0].createdAt).toLocaleString()}` : "No runs yet"}</>
                ) : "Loading..."}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => selectedProjectId && fetchDashboard(selectedProjectId)} className="text-sm border border-card-border px-3 py-2 rounded-lg hover:bg-card-border/30 transition cursor-pointer text-muted hover:text-foreground" title="Refresh">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>
              </button>
              <Link href="/dashboard/settings" className="text-sm border border-card-border px-3 py-2 rounded-lg hover:bg-card-border/30 transition text-muted hover:text-foreground">
                {icons.settings}
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          ) : recentRuns.length === 0 ? (
            <div className="text-center py-16 rounded-xl border border-dashed border-card-border">
              <svg className="w-12 h-12 mx-auto text-muted/40 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
              <h2 className="text-lg font-semibold mb-2">No test runs yet</h2>
              <p className="text-sm text-muted mb-6 max-w-md mx-auto">Push your first test results using the DeFlaky CLI.</p>
              <div className="inline-block p-4 rounded-lg bg-card-bg border border-card-border text-left">
                <code className="text-sm font-mono text-accent">deflaky run -c &quot;npx playwright test&quot; -r 5 --push -t YOUR_TOKEN</code>
              </div>
            </div>
          ) : (
            <>
              {/* Stats Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                  label="FlakeScore"
                  value={String(stats?.flakeScore ?? 0)}
                  sub={`From ${recentRuns.length} run${recentRuns.length !== 1 ? "s" : ""}`}
                  color={(stats?.flakeScore ?? 0) >= 90 ? "text-green-400" : (stats?.flakeScore ?? 0) >= 70 ? "text-yellow-400" : "text-red-400"}
                  icon={<svg className="w-4 h-4 text-muted group-hover:text-accent transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" /></svg>}
                />
                <StatCard
                  label="Total Tests"
                  value={String(stats?.totalTests ?? 0)}
                  sub="Latest run"
                  color="text-foreground"
                  icon={<svg className="w-4 h-4 text-muted group-hover:text-accent transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>}
                />
                <StatCard
                  label="Flaky Tests"
                  value={String(stats?.flakyCount ?? 0)}
                  sub="Last 7 days"
                  color="text-red-400"
                  icon={<svg className="w-4 h-4 text-muted group-hover:text-red-400 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>}
                />
                <StatCard
                  label="Stable Tests"
                  value={String(stats?.stableCount ?? 0)}
                  sub="Consistent results"
                  color="text-green-400"
                  icon={<svg className="w-4 h-4 text-muted group-hover:text-green-400 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
              </div>

              {/* Chart */}
              {recentRuns.length > 1 && (
                <div className="mb-8"><MiniChart runs={recentRuns} /></div>
              )}

              {/* Flaky Tests Table */}
              {flakyTests.length > 0 ? (
                <div className="rounded-xl border border-card-border bg-card-bg overflow-hidden mb-8">
                  <div className="flex justify-between items-center px-5 py-4 border-b border-card-border">
                    <h2 className="text-sm font-semibold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                      Flaky Tests
                    </h2>
                    <span className="text-xs text-muted">Sorted by pass rate (lowest first)</span>
                  </div>

                  <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-2.5 text-[10px] text-muted uppercase tracking-wider border-b border-card-border">
                    <div className="col-span-5">Test Name</div>
                    <div className="col-span-2">Pass Rate</div>
                    <div className="col-span-1 text-center">Pass</div>
                    <div className="col-span-1 text-center">Fail</div>
                    <div className="col-span-1 text-center">Skip</div>
                    <div className="col-span-2 text-right">Total Runs</div>
                  </div>

                  {flakyTests.map((t) => {
                    const isSelected = selectedTest?.testName === t.testName;
                    return (
                      <div
                        key={t.testName}
                        onClick={() => { setSelectedTest(t); setAnalysisResult(null); setNoConfig(false); if (selectedProjectId) { fetchTestHistory(selectedProjectId, t.testName); } }}
                        className={`grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-5 py-3.5 border-b border-card-border/50 transition items-center cursor-pointer
                          ${isSelected ? "bg-accent/5 border-l-3 border-l-accent" : "hover:bg-card-border/20"}
                        `}
                      >
                        <div className="md:col-span-5 font-mono text-sm truncate flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${t.passRate < 70 ? "bg-red-400" : "bg-yellow-400"}`} />
                          {t.testName}
                        </div>
                        <div className="md:col-span-2"><PassRateBar rate={t.passRate} /></div>
                        <div className="md:col-span-1 text-center text-sm text-green-400 font-mono">{t.passCount}</div>
                        <div className="md:col-span-1 text-center text-sm text-red-400 font-mono">{t.failCount}</div>
                        <div className="md:col-span-1 text-center text-sm text-muted font-mono">{t.skipCount}</div>
                        <div className="md:col-span-2 text-right text-sm text-muted font-mono">{t.totalRuns}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-card-border bg-card-bg p-8 text-center mb-8">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  </div>
                  <h3 className="font-semibold mb-1">No flaky tests detected!</h3>
                  <p className="text-sm text-muted">All tests are consistent across runs.</p>
                </div>
              )}

              {/* ══════ Test History — Multi-run trend view ══════ */}
              {selectedTest && (
                <div className="rounded-xl border border-card-border bg-card-bg overflow-hidden mb-8">
                  {/* Header */}
                  <div className="flex justify-between items-center px-5 py-4 border-b border-card-border">
                    <h2 className="text-sm font-semibold flex items-center gap-2">
                      <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Test History
                    </h2>
                    <span className="text-xs text-muted font-mono truncate max-w-60">{selectedTest.testName}</span>
                  </div>

                  <div className="px-5 py-5">
                    {historyLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                        <span className="ml-3 text-sm text-muted">Loading test history...</span>
                      </div>
                    ) : testHistory && testHistory.history.length > 0 ? (
                      <div className="space-y-5">
                        {/* Trend Summary Row */}
                        <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-card-border/20">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted uppercase tracking-wider">Trend</span>
                            {testHistory.trend.direction === "improving" ? (
                              <span className="flex items-center gap-1 text-green-400 text-sm font-semibold">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg>
                                Improving
                              </span>
                            ) : testHistory.trend.direction === "degrading" ? (
                              <span className="flex items-center gap-1 text-red-400 text-sm font-semibold">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" /></svg>
                                Degrading
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-muted text-sm font-semibold">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" /></svg>
                                Stable
                              </span>
                            )}
                          </div>
                          <div className="w-px h-6 bg-card-border hidden sm:block" />
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted">Avg Pass Rate</span>
                            <span className={`text-sm font-bold font-mono ${testHistory.trend.avgPassRate >= 80 ? "text-green-400" : testHistory.trend.avgPassRate >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                              {testHistory.trend.avgPassRate}%
                            </span>
                          </div>
                          <div className="w-px h-6 bg-card-border hidden sm:block" />
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted">Runs</span>
                            <span className="text-sm font-bold font-mono text-foreground">{testHistory.history.length}</span>
                          </div>
                          <div className="w-px h-6 bg-card-border hidden sm:block" />
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted">First</span>
                            <span className="text-xs font-mono text-muted">{testHistory.trend.firstPassRate}%</span>
                            <svg className="w-3 h-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                            <span className="text-xs text-muted">Latest</span>
                            <span className={`text-xs font-mono font-bold ${testHistory.trend.lastPassRate >= 80 ? "text-green-400" : testHistory.trend.lastPassRate >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                              {testHistory.trend.lastPassRate}%
                            </span>
                          </div>
                        </div>

                        {/* Timeline Chart */}
                        <div>
                          <p className="text-xs text-muted uppercase tracking-wider mb-3">Pass Rate Timeline</p>
                          <div className="flex items-end gap-1 h-24">
                            {[...testHistory.history].reverse().map((run: any) => {
                              const barColor = run.passRate === 100
                                ? "bg-green-500"
                                : run.passRate >= 80
                                  ? "bg-green-500/70"
                                  : run.passRate >= 50
                                    ? "bg-yellow-500"
                                    : "bg-red-500";
                              return (
                                <div
                                  key={run.runId}
                                  className="flex-1 flex flex-col items-center gap-1 group relative"
                                  title={`${new Date(run.runDate).toLocaleDateString()} - ${run.passRate}% pass`}
                                >
                                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-card-bg border border-card-border rounded px-2 py-1 text-[10px] text-foreground whitespace-nowrap z-10 shadow-lg pointer-events-none">
                                    {run.passRate}% &middot; {new Date(run.runDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                  </div>
                                  <div
                                    className={`w-full rounded-t-sm ${barColor} hover:opacity-80 transition min-h-[4px]`}
                                    style={{ height: `${Math.max(run.passRate, 4)}%` }}
                                  />
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex justify-between mt-1.5">
                            <span className="text-[10px] text-muted">
                              {new Date(testHistory.history[testHistory.history.length - 1].runDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                            <span className="text-[10px] text-muted">
                              {new Date(testHistory.history[0].runDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          </div>
                        </div>

                        {/* Per-run Breakdown */}
                        <div>
                          <p className="text-xs text-muted uppercase tracking-wider mb-3">Run Details</p>
                          <div className="space-y-1.5 max-h-80 overflow-y-auto">
                            {testHistory.history.map((run: any) => {
                              const isExpanded = expandedRunId === run.runId;
                              return (
                                <div key={run.runId} className="rounded-lg border border-card-border/50 overflow-hidden">
                                  <button
                                    onClick={() => setExpandedRunId(isExpanded ? null : run.runId)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-card-border/20 transition cursor-pointer"
                                  >
                                    <svg
                                      className={`w-3 h-3 text-muted transition-transform ${isExpanded ? "rotate-90" : ""}`}
                                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                    </svg>
                                    <span className="text-xs text-muted w-28 shrink-0">
                                      {new Date(run.runDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                      {" "}
                                      {new Date(run.runDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                    <div className="flex gap-0.5">
                                      {run.results.map((r: any, idx: number) => (
                                        <div
                                          key={idx}
                                          className={`w-3 h-3 rounded-sm ${r.status === "pass" ? "bg-green-500" : r.status === "fail" ? "bg-red-500" : "bg-gray-500"}`}
                                          title={`Run ${r.runIndex}: ${r.status}`}
                                        />
                                      ))}
                                    </div>
                                    <span className={`text-xs font-mono font-bold ml-auto ${run.passRate === 100 ? "text-green-400" : run.passRate >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                                      {run.passRate}%
                                    </span>
                                    <span className="text-[10px] text-muted">
                                      {run.passCount}P / {run.failCount}F
                                    </span>
                                  </button>
                                  {isExpanded && (
                                    <div className="px-4 py-3 border-t border-card-border/50 bg-card-border/10">
                                      <div className="flex items-center gap-2 mb-3">
                                        <span className="text-[10px] text-muted uppercase tracking-wider">Command:</span>
                                        <code className="text-xs font-mono text-accent">{run.command}</code>
                                        <span className="text-[10px] text-muted ml-auto">{run.iterations} iteration{run.iterations !== 1 ? "s" : ""}</span>
                                      </div>
                                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                                        {run.results.map((r: any, idx: number) => (
                                          <div
                                            key={idx}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
                                              r.status === "pass"
                                                ? "bg-green-500/5 border-green-500/20 text-green-400"
                                                : r.status === "fail"
                                                  ? "bg-red-500/5 border-red-500/20 text-red-400"
                                                  : "bg-gray-500/5 border-gray-500/20 text-gray-400"
                                            }`}
                                          >
                                            <span className={`w-2 h-2 rounded-full ${r.status === "pass" ? "bg-green-400" : r.status === "fail" ? "bg-red-400" : "bg-gray-400"}`} />
                                            <span className="font-mono">#{r.runIndex}</span>
                                            <span className="capitalize">{r.status}</span>
                                            {r.durationMs != null && (
                                              <span className="text-muted ml-auto">{r.durationMs}ms</span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : testHistory && testHistory.history.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-muted">No history found for this test across recent runs.</p>
                      </div>
                    ) : !historyLoading && (
                      <div className="text-center py-8">
                        <p className="text-sm text-muted">Select a flaky test to view its run history.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ══════ AI Root Cause Analysis — Redesigned ══════ */}
              <div className="rounded-xl border border-card-border bg-card-bg overflow-hidden">
                {/* Header with gradient accent */}
                <div className="relative px-5 py-5 border-b border-card-border bg-gradient-to-r from-accent/5 via-transparent to-purple-500/5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-purple-500/20 flex items-center justify-center">
                        {icons.ai}
                      </div>
                      <div>
                        <h2 className="font-semibold flex items-center gap-2">
                          AI Root Cause Analysis
                          <span className="text-[9px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-1.5 py-0.5 rounded">Beta</span>
                        </h2>
                        <p className="text-xs text-muted mt-0.5">Select a flaky test and let AI identify the root cause</p>
                      </div>
                    </div>
                    <button
                      onClick={handleAnalyze}
                      disabled={!selectedTest || isAnalyzing}
                      className={`flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg transition ${
                        selectedTest && !isAnalyzing
                          ? "bg-gradient-to-r from-accent to-green-400 hover:from-accent-hover hover:to-green-500 text-black cursor-pointer shadow-lg shadow-accent/20"
                          : "bg-card-border text-muted cursor-not-allowed"
                      }`}
                    >
                      {icons.ai}
                      {isAnalyzing ? "Analyzing..." : "Analyze with AI"}
                    </button>
                  </div>
                </div>

                <div className="px-5 py-5">
                  {/* Empty state — no test selected */}
                  {!selectedTest && !isAnalyzing && !analysisResult && (
                    <div className="text-center py-10">
                      <div className="w-16 h-16 rounded-2xl bg-card-border/30 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
                        </svg>
                      </div>
                      <p className="text-muted text-sm font-medium">No test selected</p>
                      <p className="text-muted/60 text-xs mt-1">Click on a flaky test above to select it for analysis</p>
                    </div>
                  )}

                  {/* Test selected but not yet analyzed */}
                  {selectedTest && !isAnalyzing && !analysisResult && !noConfig && (
                    <div className="py-3">
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-accent/5 border border-accent/20">
                        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                          <span className={`w-3 h-3 rounded-full ${selectedTest.passRate < 70 ? "bg-red-400" : "bg-yellow-400"}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-sm font-medium truncate">{selectedTest.testName}</p>
                          <div className="flex items-center gap-4 mt-1.5">
                            <span className="text-xs"><span className="text-green-400 font-bold">{selectedTest.passCount}</span> <span className="text-muted">pass</span></span>
                            <span className="text-xs"><span className="text-red-400 font-bold">{selectedTest.failCount}</span> <span className="text-muted">fail</span></span>
                            <span className="text-xs"><span className="text-muted font-bold">{selectedTest.skipCount}</span> <span className="text-muted">skip</span></span>
                            <span className="text-xs text-muted">&middot;</span>
                            <span className={`text-xs font-bold ${selectedTest.passRate < 70 ? "text-red-400" : "text-yellow-400"}`}>{selectedTest.passRate}% pass rate</span>
                          </div>
                        </div>
                        <button onClick={handleAnalyze} className="bg-accent hover:bg-accent-hover text-black text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer shrink-0">
                          Analyze
                        </button>
                      </div>
                    </div>
                  )}

                  {/* AI Provider not configured */}
                  {noConfig && (
                    <div className="py-3">
                      <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
                        <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                        </div>
                        <div>
                          <p className="text-sm text-yellow-400 font-semibold">AI provider not configured</p>
                          <p className="text-xs text-muted mt-1">
                            Configure your AI provider in{" "}
                            <Link href="/dashboard/settings" className="text-accent hover:text-accent-hover underline underline-offset-2">Settings</Link>
                            {" "}to enable root cause analysis.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Loading spinner */}
                  {isAnalyzing && <Spinner />}

                  {/* Error state */}
                  {analysisError && !isAnalyzing && (
                    <div className="py-3">
                      <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                        <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                        </div>
                        <div>
                          <p className="text-sm text-red-400 font-semibold">Analysis Failed</p>
                          <p className="text-xs text-muted mt-1">{analysisError}</p>
                          <button onClick={handleAnalyze} className="text-xs text-accent hover:underline mt-2 cursor-pointer">Try again</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Analysis Results — Rich Card Layout */}
                  {analysisResult && !isAnalyzing && (
                    <div className="space-y-5">
                      {/* Top bar: Category + Confidence */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between p-4 rounded-xl bg-card-border/20">
                        <div className="flex items-center gap-3">
                          <CategoryBadge category={analysisResult.category} />
                          <span className="text-xs text-muted">for</span>
                          <span className="text-xs font-mono text-foreground truncate max-w-60">{selectedTest?.testName}</span>
                        </div>
                        <div className="sm:w-60">
                          <ConfidenceBar confidence={analysisResult.confidence} />
                        </div>
                      </div>

                      {/* Root Cause Card */}
                      <div className="rounded-xl border border-card-border overflow-hidden">
                        <div className="px-4 py-3 bg-red-500/5 border-b border-card-border flex items-center gap-2">
                          <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                          <h4 className="text-xs uppercase tracking-wider text-red-400 font-semibold">Root Cause</h4>
                        </div>
                        <div className="p-4">
                          <p className="text-sm leading-relaxed">{analysisResult.rootCause}</p>
                        </div>
                      </div>

                      {/* Suggested Fix Card */}
                      <div className="rounded-xl border border-card-border overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 bg-green-500/5 border-b border-card-border">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.648-3.39a3 3 0 01-1.397-1.874l-.57-3.08a3 3 0 013.507-3.508l3.08.57a3 3 0 011.874 1.398l3.39 5.648m-6.236 6.236a3 3 0 01-.59-1.003l-.571-1.71a3 3 0 01.188-2.234l3.054-5.392" /></svg>
                            <h4 className="text-xs uppercase tracking-wider text-green-400 font-semibold">Suggested Fix</h4>
                          </div>
                          <button
                            onClick={() => navigator.clipboard.writeText(analysisResult.suggestedFix)}
                            className="text-xs text-muted hover:text-foreground transition cursor-pointer flex items-center gap-1 bg-card-border/30 px-2 py-1 rounded"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>
                            Copy
                          </button>
                        </div>
                        <pre className="p-4 text-sm font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed bg-background/50">
                          <code>{analysisResult.suggestedFix}</code>
                        </pre>
                      </div>

                      {/* Provider Info */}
                      {analysisProvider && (
                        <div className="flex items-center justify-between pt-3 border-t border-card-border/50">
                          <div className="flex items-center gap-2 text-[11px] text-muted">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                            Analyzed by <span className="font-medium text-foreground">{analysisProvider.provider}</span> using <span className="font-mono text-foreground">{analysisProvider.model}</span>
                          </div>
                          <button
                            onClick={() => { setAnalysisResult(null); setAnalysisProvider(null); handleAnalyze(); }}
                            className="text-[11px] text-accent hover:underline cursor-pointer"
                          >
                            Re-analyze
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {showCreateModal && session?.user?.id && (
            <CreateProjectModal userId={session.user.id} onCreated={fetchProjects} onClose={() => setShowCreateModal(false)} />
          )}
        </div>
      </main>
    </div>
  );
}
