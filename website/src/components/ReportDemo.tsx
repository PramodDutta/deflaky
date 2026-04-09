"use client";

import { useEffect, useState } from "react";

/* ── Animated counter ── */
function AnimatedNumber({ target, suffix = "", delay = 0 }: { target: number; suffix?: string; delay?: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      let start = 0;
      const duration = 1200;
      const step = 16;
      const increment = (target / duration) * step;
      const interval = setInterval(() => {
        start += increment;
        if (start >= target) {
          setValue(target);
          clearInterval(interval);
        } else {
          setValue(Math.round(start * 10) / 10);
        }
      }, step);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timer);
  }, [target, delay]);

  return <>{value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}{suffix}</>;
}

/* ── Progress bar with animation ── */
function AnimatedBar({ width, color, delay = 0 }: { width: number; color: string; delay?: number }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setW(width), delay);
    return () => clearTimeout(timer);
  }, [width, delay]);

  return (
    <div className="w-full h-2 rounded-full bg-card-border/50 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-1000 ease-out ${color}`}
        style={{ width: `${w}%` }}
      />
    </div>
  );
}

/* ── Status badge ── */
function StatusBadge({ status }: { status: "passed" | "failed" | "flaky" }) {
  const styles = {
    passed: "bg-green-500/20 text-green-400 border-green-500/30",
    failed: "bg-red-500/20 text-red-400 border-red-500/30",
    flaky: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  };
  return (
    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${styles[status]}`}>
      {status}
    </span>
  );
}

/* ── Main Report Demo Component ── */
export function ReportDemo() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    const el = document.getElementById("report-demo");
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div id="report-demo" className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
      {/* Report Container */}
      <div className="rounded-2xl border border-card-border bg-card-bg overflow-hidden shadow-2xl shadow-black/40">
        {/* Report Header */}
        <div className="px-6 py-4 border-b border-card-border bg-card-border/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-black font-bold text-[10px]">
              df
            </div>
            <div>
              <h3 className="text-sm font-bold">DeFlaky Test Report</h3>
              <p className="text-[10px] text-muted">Run ID: d7f42a &middot; Apr 8, 2026, 2:15 PM &middot; Playwright</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-green-400 font-medium">5 iterations complete</span>
          </div>
        </div>

        {/* Stat Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-card-border/30">
          {[
            { label: "FlakeScore", value: 87.5, suffix: "%", color: "text-accent" },
            { label: "Total Duration", value: 24.3, suffix: "s", color: "text-foreground" },
            { label: "Total Tests", value: 45, suffix: "", color: "text-foreground" },
            { label: "Stable", value: 42, suffix: "", color: "text-green-400" },
            { label: "Flaky", value: 3, suffix: "", color: "text-yellow-400" },
          ].map((s, i) => (
            <div key={s.label} className="bg-card-bg px-4 py-3">
              <p className="text-[10px] text-muted uppercase tracking-wider">{s.label}</p>
              <p className={`text-xl font-bold mt-0.5 ${s.color}`}>
                {visible ? <AnimatedNumber target={s.value} suffix={s.suffix} delay={i * 150} /> : `0${s.suffix}`}
              </p>
              {s.label === "FlakeScore" && (
                <AnimatedBar width={visible ? 87.5 : 0} color="bg-accent" delay={200} />
              )}
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="px-6 py-3 border-t border-b border-card-border flex items-center gap-1">
          {[
            { label: "All (45)", active: true },
            { label: "Stable (42)", active: false },
            { label: "Flaky (3)", active: false },
            { label: "Failed (0)", active: false },
          ].map((tab) => (
            <span
              key={tab.label}
              className={`text-[11px] px-3 py-1 rounded-full font-medium transition ${
                tab.active
                  ? "bg-accent text-black"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </span>
          ))}
        </div>

        {/* Test Results Table */}
        <div className="overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] text-muted uppercase tracking-wider border-b border-card-border">
                <th className="px-6 py-2 font-medium">Status</th>
                <th className="px-6 py-2 font-medium">Test Name</th>
                <th className="px-6 py-2 font-medium hidden md:table-cell">File</th>
                <th className="px-6 py-2 font-medium text-center">Results</th>
                <th className="px-6 py-2 font-medium text-right">Pass Rate</th>
              </tr>
            </thead>
            <tbody>
              {[
                { status: "flaky" as const, name: "should complete checkout flow", file: "checkout.spec.ts", results: "3✓ 2✗", rate: 60, delay: 400 },
                { status: "flaky" as const, name: "should handle OAuth redirect", file: "auth.spec.ts", results: "4✓ 1✗", rate: 80, delay: 600 },
                { status: "flaky" as const, name: "should load dashboard charts", file: "dashboard.spec.ts", results: "4✓ 1✗", rate: 80, delay: 800 },
                { status: "passed" as const, name: "should render login page", file: "auth.spec.ts", results: "5✓ 0✗", rate: 100, delay: 1000 },
                { status: "passed" as const, name: "should create new project", file: "projects.spec.ts", results: "5✓ 0✗", rate: 100, delay: 1200 },
              ].map((t, i) => (
                <tr
                  key={i}
                  className={`border-b border-card-border/30 transition-all duration-500 ${
                    visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                  } ${t.status === "flaky" ? "bg-yellow-500/5" : ""}`}
                  style={{ transitionDelay: `${t.delay}ms` }}
                >
                  <td className="px-6 py-2.5"><StatusBadge status={t.status} /></td>
                  <td className="px-6 py-2.5 font-mono text-foreground">{t.name}</td>
                  <td className="px-6 py-2.5 text-muted hidden md:table-cell">{t.file}</td>
                  <td className="px-6 py-2.5 text-center font-mono">
                    <span className="text-green-400">{t.results.split(" ")[0]}</span>
                    {" "}
                    <span className="text-red-400">{t.results.split(" ")[1]}</span>
                  </td>
                  <td className="px-6 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-card-border overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${
                            t.rate === 100 ? "bg-green-500" : t.rate >= 80 ? "bg-yellow-500" : "bg-red-500"
                          }`}
                          style={{ width: visible ? `${t.rate}%` : "0%", transitionDelay: `${t.delay}ms` }}
                        />
                      </div>
                      <span className="text-muted w-8 text-right">{t.rate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* AI Analysis Preview Row */}
        <div className={`px-6 py-4 border-t border-card-border bg-accent/5 transition-all duration-700 ${visible ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: "1400ms" }}>
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-accent">AI Root Cause Analysis</p>
              <p className="text-[11px] text-muted mt-0.5 leading-relaxed">
                Checkout flow flakiness caused by <span className="text-foreground font-medium">race condition</span> in
                payment confirmation — Stripe webhook response time varies 200ms-3s. Suggested fix: add explicit wait
                with 5s timeout.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
