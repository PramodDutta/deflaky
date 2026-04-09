"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

/* ── Provider / Model Definitions ── */
const PROVIDERS = [
  { id: "anthropic", name: "Anthropic" },
  { id: "openai", name: "OpenAI" },
  { id: "groq", name: "Groq" },
  { id: "openrouter", name: "OpenRouter" },
  { id: "ollama", name: "Ollama" },
] as const;

type ProviderId = (typeof PROVIDERS)[number]["id"];

const MODEL_OPTIONS: Record<ProviderId, string[]> = {
  anthropic: ["claude-sonnet-4-20250514", "claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  groq: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
  openrouter: ["anthropic/claude-sonnet-4-20250514", "openai/gpt-4o", "google/gemini-pro-1.5", "meta-llama/llama-3.3-70b"],
  ollama: ["llama3.2", "codellama", "mistral", "phi3"],
};

const PROVIDER_CARDS: {
  id: ProviderId;
  label: string;
  description: string;
  url: string;
}[] = [
  { id: "anthropic", label: "Anthropic", description: "Claude models \u2014 Best for code analysis", url: "https://console.anthropic.com" },
  { id: "openai", label: "OpenAI", description: "GPT-4o models \u2014 Great all-around", url: "https://platform.openai.com" },
  { id: "groq", label: "Groq", description: "Ultra-fast inference \u2014 Free tier available", url: "https://console.groq.com" },
  { id: "openrouter", label: "OpenRouter", description: "Access 100+ models \u2014 Single API", url: "https://openrouter.ai" },
  { id: "ollama", label: "Ollama", description: "Run locally \u2014 100% private", url: "https://ollama.ai" },
];

const STORAGE_KEY = "deflaky_ai_config";

interface AiConfig {
  provider: ProviderId;
  apiKey: string;
  model: string;
  baseUrl: string;
}

const DEFAULT_CONFIG: AiConfig = {
  provider: "anthropic",
  apiKey: "",
  model: "claude-sonnet-4-20250514",
  baseUrl: "http://localhost:11434",
};

/* ── Helpers ── */
function loadConfig(): AiConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

/* ── Components ── */

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline ml-1 opacity-60">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

/* ── Main Page ── */
export default function SettingsPage() {
  const { data: session } = useSession();
  const [config, setConfig] = useState<AiConfig>(DEFAULT_CONFIG);
  const [showKey, setShowKey] = useState(false);
  const [validationStatus, setValidationStatus] = useState<"idle" | "loading" | "valid" | "invalid">("idle");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");
  const [mounted, setMounted] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  // Check for upgrade success query param
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("upgrade") === "success") {
        setUpgradeSuccess(true);
        // Clean URL
        window.history.replaceState({}, "", "/dashboard/settings");
      }
    }
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    setConfig(loadConfig());
    setMounted(true);
  }, []);

  // Reset model when provider changes
  const setProvider = useCallback((provider: ProviderId) => {
    setConfig((prev) => ({
      ...prev,
      provider,
      model: MODEL_OPTIONS[provider][0],
    }));
    setValidationStatus("idle");
  }, []);

  const updateField = useCallback(<K extends keyof AiConfig>(key: K, value: AiConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    if (key === "apiKey") setValidationStatus("idle");
  }, []);

  const handleValidate = useCallback(async () => {
    setValidationStatus("loading");
    try {
      const res = await fetch("/api/ai/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: config.provider,
          apiKey: config.apiKey,
          model: config.model,
          baseUrl: config.provider === "ollama" ? config.baseUrl : undefined,
        }),
      });
      const data = await res.json();
      setValidationStatus(data.valid ? "valid" : "invalid");
    } catch {
      setValidationStatus("invalid");
    }
  }, [config]);

  const handleSave = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  }, [config]);

  if (!mounted) {
    return (
      <div className="grid-bg min-h-screen">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 rounded bg-card-border" />
            <div className="h-64 rounded-xl bg-card-bg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid-bg min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition mb-6"
        >
          <ArrowLeftIcon />
          Back to Dashboard
        </Link>

        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted text-sm mt-1">
            Manage your subscription and AI configuration.
          </p>
        </div>

        {/* ── Upgrade Success Banner ── */}
        {upgradeSuccess && (
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 mb-6 flex items-center gap-3">
            <CheckIcon />
            <div>
              <p className="text-sm font-semibold text-green-400">Upgrade successful!</p>
              <p className="text-xs text-muted">Your Pro plan is now active. Enjoy AI-powered insights!</p>
            </div>
          </div>
        )}

        {/* ── Billing & Subscription ── */}
        <div className="rounded-xl border border-card-border bg-card-bg p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Subscription</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">
                Current plan: <span className="font-semibold text-accent">Free (Launch)</span>
              </p>
              <p className="text-xs text-muted mt-1">
                You&apos;re on the free launch plan with full dashboard access.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  setBillingLoading(true);
                  try {
                    const res = await fetch("/api/stripe/portal", { method: "POST" });
                    const data = await res.json();
                    if (data.url) {
                      window.location.href = data.url;
                    }
                  } catch {
                    // No billing account yet
                  } finally {
                    setBillingLoading(false);
                  }
                }}
                className="text-sm border border-card-border px-4 py-2 rounded-lg hover:bg-background transition"
              >
                Manage Billing
              </button>
              <Link
                href="/pricing"
                className="text-sm bg-accent hover:bg-accent-hover text-black font-semibold px-4 py-2 rounded-lg transition"
              >
                {billingLoading ? "Loading..." : "Upgrade to Pro"}
              </Link>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="rounded-xl border border-card-border bg-card-bg p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Account</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Name</span>
              <span className="text-sm text-foreground">{session?.user?.name || "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Email</span>
              <span className="text-sm text-foreground">{session?.user?.email || "—"}</span>
            </div>
          </div>
        </div>

        {/* AI Settings heading */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">AI Configuration</h2>
          <p className="text-muted text-xs mt-1">
            Configure the AI provider used for intelligent test failure analysis.
          </p>
        </div>

        {/* ── AI Provider Configuration ── */}
        <div className="rounded-xl border border-card-border bg-card-bg p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-5">Provider Configuration</h2>

          <div className="space-y-5">
            {/* Provider select */}
            <div>
              <label htmlFor="provider" className="block text-sm font-medium text-foreground mb-1.5">
                AI Provider
              </label>
              <select
                id="provider"
                value={config.provider}
                onChange={(e) => setProvider(e.target.value as ProviderId)}
                className="w-full border border-card-border bg-background text-foreground rounded-lg px-4 py-2 focus:ring-2 focus:ring-accent focus:outline-none transition"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* API Key */}
            {config.provider !== "ollama" && (
              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-foreground mb-1.5">
                  API Key
                </label>
                <div className="relative">
                  <input
                    id="apiKey"
                    type={showKey ? "text" : "password"}
                    value={config.apiKey}
                    onChange={(e) => updateField("apiKey", e.target.value)}
                    placeholder="sk-..."
                    className="w-full border border-card-border bg-background text-foreground rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-accent focus:outline-none transition font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition"
                    aria-label={showKey ? "Hide API key" : "Show API key"}
                  >
                    <EyeIcon open={showKey} />
                  </button>
                </div>
              </div>
            )}

            {/* Ollama Base URL */}
            {config.provider === "ollama" && (
              <div>
                <label htmlFor="baseUrl" className="block text-sm font-medium text-foreground mb-1.5">
                  Base URL
                </label>
                <input
                  id="baseUrl"
                  type="text"
                  value={config.baseUrl}
                  onChange={(e) => updateField("baseUrl", e.target.value)}
                  placeholder="http://localhost:11434"
                  className="w-full border border-card-border bg-background text-foreground rounded-lg px-4 py-2 focus:ring-2 focus:ring-accent focus:outline-none transition font-mono text-sm"
                />
              </div>
            )}

            {/* Model select */}
            <div>
              <label htmlFor="model" className="block text-sm font-medium text-foreground mb-1.5">
                Model
              </label>
              <select
                id="model"
                value={config.model}
                onChange={(e) => updateField("model", e.target.value)}
                className="w-full border border-card-border bg-background text-foreground rounded-lg px-4 py-2 focus:ring-2 focus:ring-accent focus:outline-none transition"
              >
                {MODEL_OPTIONS[config.provider].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
              <button
                onClick={handleValidate}
                disabled={validationStatus === "loading" || (config.provider !== "ollama" && !config.apiKey)}
                className="text-sm border border-card-border px-4 py-2 rounded-lg hover:bg-background transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {validationStatus === "loading" ? (
                  <>
                    <span className="w-4 h-4 border-2 border-muted border-t-accent rounded-full animate-spin" />
                    Validating...
                  </>
                ) : (
                  "Validate Key"
                )}
              </button>

              {validationStatus === "valid" && (
                <span className="flex items-center gap-1.5 text-sm text-green-400">
                  <CheckIcon /> Valid
                </span>
              )}
              {validationStatus === "invalid" && (
                <span className="flex items-center gap-1.5 text-sm text-red-400">
                  <XIcon /> Invalid
                </span>
              )}

              <div className="sm:ml-auto">
                <button
                  onClick={handleSave}
                  className="text-sm bg-accent hover:bg-accent-hover text-black font-semibold px-5 py-2 rounded-lg transition"
                >
                  {saveStatus === "saved" ? "Saved!" : "Save Settings"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Provider Info Cards ── */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Available Providers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PROVIDER_CARDS.map((card) => (
              <a
                key={card.id}
                href={card.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${
                  config.provider === card.id
                    ? "border-accent bg-accent/5"
                    : "border-card-border bg-card-bg hover:border-muted"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground text-sm">{card.label}</h3>
                  {config.provider === card.id && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  {card.description}
                  <ExternalLinkIcon />
                </p>
              </a>
            ))}
          </div>
        </div>

        {/* ── How It Works ── */}
        <div className="rounded-xl border border-card-border bg-card-bg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">How It Works</h2>
          <p className="text-sm text-muted leading-relaxed">
            Your API key is stored only in your browser&apos;s localStorage. It&apos;s sent directly to your chosen AI
            provider &mdash; DeFlaky never stores or logs your key on our servers.
          </p>
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-card-border bg-background p-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent shrink-0 mt-0.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <p className="text-xs text-muted leading-relaxed">
              All communication happens client-side. Your key is never sent to DeFlaky&apos;s servers &mdash; it goes
              directly from your browser to the AI provider&apos;s API endpoint.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
