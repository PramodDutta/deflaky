import Link from "next/link";
import { JsonLd } from "@/components/schema/JsonLd";
import { softwareApplicationSchema } from "@/components/schema/homepage-schema";

/* ── Hero Terminal Block ── */
function TerminalDemo() {
  return (
    <div className="w-full max-w-2xl mx-auto rounded-xl border border-card-border bg-card-bg overflow-hidden glow-orange">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-card-border bg-card-border/30">
        <span className="w-3 h-3 rounded-full bg-red-500" />
        <span className="w-3 h-3 rounded-full bg-yellow-500" />
        <span className="w-3 h-3 rounded-full bg-green-500" />
        <span className="ml-3 text-xs text-muted font-mono">Terminal</span>
      </div>
      {/* Code */}
      <div className="p-5 font-mono text-sm leading-relaxed overflow-x-auto">
        <p className="text-muted">
          <span className="text-green-400">$</span> npx deflaky --command &quot;npx playwright
          test&quot; --runs 5
        </p>
        <br />
        <p className="text-muted">Running test suite... (5 iterations)</p>
        <br />
        <p className="text-green-400">
          &nbsp;&nbsp;42 tests stable (100% pass rate)
        </p>
        <p className="text-yellow-400">
          &nbsp;&nbsp;&nbsp;3 tests FLAKY
        </p>
        <p className="text-sm text-muted mt-1 ml-6">
          login.spec.ts &gt; &quot;should redirect&quot; &mdash; 3/5 passed
        </p>
        <p className="text-sm text-muted ml-6">
          cart.spec.ts &gt; &quot;update quantity&quot; &mdash; 4/5 passed
        </p>
        <p className="text-sm text-muted ml-6">
          search.spec.ts &gt; &quot;show suggestions&quot; &mdash; 2/5 passed
        </p>
        <p className="text-red-400 mt-2">
          &nbsp;&nbsp;&nbsp;1 test consistently failing
        </p>
        <br />
        <p className="text-accent">
          FlakeScore: 93.5 / 100
        </p>
        <p className="text-muted mt-1">
          <span className="text-green-400">$</span>{" "}
          <span className="cursor-blink">_</span>
        </p>
      </div>
    </div>
  );
}

/* ── Feature Card ── */
function Feature({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-card-border bg-card-bg p-6 hover:border-accent/40 transition group">
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2 group-hover:text-accent transition">
        {title}
      </h3>
      <p className="text-sm text-muted leading-relaxed">{description}</p>
    </div>
  );
}

/* ── Supported Framework Badge ── */
function Badge({ name }: { name: string }) {
  return (
    <span className="inline-block border border-card-border rounded-full px-4 py-1.5 text-sm text-muted hover:border-accent/50 hover:text-foreground transition">
      {name}
    </span>
  );
}

/* ── Pricing Card ── */
function PricingCard({
  tier,
  price,
  period,
  features,
  cta,
  highlighted,
}: {
  tier: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-6 flex flex-col ${
        highlighted
          ? "border-accent bg-accent/5 glow-orange"
          : "border-card-border bg-card-bg"
      }`}
    >
      <h3 className="text-lg font-semibold">{tier}</h3>
      <div className="mt-3 mb-5">
        <span className="text-4xl font-bold">{price}</span>
        <span className="text-muted text-sm ml-1">{period}</span>
      </div>
      <ul className="space-y-2 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-muted">
            <span className="text-accent mt-0.5">&#10003;</span>
            {f}
          </li>
        ))}
      </ul>
      <Link
        href="/dashboard"
        className={`mt-6 block text-center py-2.5 rounded-lg font-semibold text-sm transition ${
          highlighted
            ? "bg-accent hover:bg-accent-hover text-black"
            : "bg-card-border hover:bg-card-border/60 text-foreground"
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}

/* ── MAIN PAGE ── */
export default function Home() {
  return (
    <div className="grid-bg">
      {/* Structured Data: SoftwareApplication */}
      <JsonLd data={softwareApplicationSchema} />

      {/* ====== HERO ====== */}
      <section className="py-20 md:py-32 px-6">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 border border-card-border rounded-full px-4 py-1.5 text-xs text-muted mb-8">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Open Source CLI &mdash; Free Forever
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            Stop guessing.
            <br />
            <span className="gradient-text">DeFlaky your tests.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            Detect flaky tests in seconds with AI-powered root cause analysis.
            BYOK &mdash; bring your own AI key. Push results to the dashboard to
            track trends, get alerts, and fix reliability issues before they tank
            your pipeline.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/docs"
              className="bg-accent hover:bg-accent-hover text-black font-semibold px-8 py-3.5 rounded-lg text-base transition"
            >
              Get Started &mdash; It&apos;s Free
            </Link>
            <Link
              href="/dashboard"
              className="border border-card-border hover:border-accent/50 font-semibold px-8 py-3.5 rounded-lg text-base transition"
            >
              View Dashboard Demo
            </Link>
          </div>

          {/* Install one-liner */}
          <div className="inline-flex items-center gap-3 border border-card-border rounded-lg px-5 py-3 bg-card-bg font-mono text-sm mb-16">
            <span className="text-muted">$</span>
            <span>npm install -g deflaky</span>
            <button className="text-muted hover:text-accent transition ml-2" title="Copy">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            </button>
          </div>

          {/* Terminal */}
          <TerminalDemo />
        </div>
      </section>

      {/* ====== SOCIAL PROOF ====== */}
      <section className="py-12 border-y border-card-border">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-sm text-muted mb-6">Works with every test framework</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Badge name="Playwright" />
            <Badge name="Selenium" />
            <Badge name="Cypress" />
            <Badge name="Jest" />
            <Badge name="Pytest" />
            <Badge name="Mocha" />
            <Badge name="JUnit" />
            <Badge name="TestNG" />
            <Badge name="Vitest" />
          </div>
        </div>
      </section>

      {/* ====== FEATURES ====== */}
      <section id="features" className="py-20 md:py-28 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to kill flaky tests
            </h2>
            <p className="text-muted max-w-xl mx-auto">
              From detection to resolution, DeFlaky gives you full visibility into
              your test suite&apos;s reliability.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            <Feature
              icon="&#9889;"
              title="Instant Detection"
              description="Run your suite N times with a single command. DeFlaky identifies flaky tests by comparing results across runs — no config required."
            />
            <Feature
              icon="&#128202;"
              title="FlakeScore Dashboard"
              description="Track your test suite's reliability score over time. See which tests are getting worse and which are improving."
            />
            <Feature
              icon="&#128276;"
              title="Slack & Email Alerts"
              description="Get notified the moment a new flaky test appears. Stop finding out about flaky tests from angry developers."
            />
            <Feature
              icon="&#128736;"
              title="Framework Agnostic"
              description="Works with any test runner that outputs JUnit XML or JSON reports. Playwright, Selenium, Cypress, Jest, Pytest — all supported."
            />
            <Feature
              icon="&#128640;"
              title="CI/CD Ready"
              description="Add DeFlaky to your GitHub Actions, Jenkins, or GitLab CI pipeline. Fail builds when flakiness exceeds your threshold."
            />
            <Feature
              icon="&#128101;"
              title="Team Collaboration"
              description="Share flakiness reports with your team. Assign owners to flaky tests. Track who fixed what and when."
            />
            <Feature
              icon="&#129302;"
              title="AI Root Cause Analysis"
              description="AI analyzes your stack traces and tells you exactly why a test failed — infrastructure, app bug, test code, or flaky."
            />
            <Feature
              icon="&#128218;"
              title="AI Failure Categorization"
              description="Automatically classify every failure. No more manual triage. Works with any LLM provider you choose."
            />
          </div>
        </div>
      </section>

      {/* ====== AI-POWERED ANALYSIS ====== */}
      <section className="py-20 md:py-28 border-t border-card-border px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              AI-Powered Analysis
            </h2>
            <p className="text-muted max-w-xl mx-auto">
              DeFlaky uses AI to analyze your test failures, identify root causes,
              and suggest fixes — automatically.
            </p>
          </div>

          <div className="mx-auto max-w-2xl rounded-xl border border-card-border bg-card-bg overflow-hidden glow-orange">
            {/* Title bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-card-border bg-card-border/30">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-3 text-xs text-muted font-mono">
                AI Root Cause Analysis
              </span>
            </div>
            {/* Analysis content */}
            <div className="p-6 font-mono text-sm leading-relaxed space-y-4">
              <div>
                <span className="text-muted">Test: </span>
                <span className="text-foreground">flaky &mdash; random number check</span>
              </div>
              <div>
                <span className="text-muted">Category: </span>
                <span className="text-yellow-400 font-semibold">FLAKY</span>
                <span className="text-muted ml-2">(87% confidence)</span>
              </div>
              <div className="border-t border-card-border pt-4">
                <p className="text-accent font-semibold mb-1">Root Cause:</p>
                <p className="text-muted">
                  Test relies on Math.random() producing non-deterministic values.
                  Each run generates a different number, causing intermittent
                  assertion failures.
                </p>
              </div>
              <div className="border-t border-card-border pt-4">
                <p className="text-green-400 font-semibold mb-2">Suggested Fix:</p>
                <div className="bg-card-border/30 rounded-md px-4 py-3">
                  <p className="text-foreground">
                    jest.spyOn(Math, &apos;random&apos;)
                  </p>
                  <p className="text-foreground ml-4">
                    .mockReturnValue(0.75);
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== BRING YOUR OWN KEY ====== */}
      <section className="py-20 md:py-28 border-t border-card-border px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Bring Your Own Key
            </h2>
            <p className="text-muted max-w-xl mx-auto">
              Use any LLM provider you prefer. Your API key never leaves your
              browser. We never store or log it.
            </p>
          </div>

          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-5">
            {[
              {
                name: "Anthropic (Claude)",
                tagline: "Best for code analysis",
              },
              {
                name: "OpenAI (GPT-4o)",
                tagline: "Great all-around",
              },
              {
                name: "Groq",
                tagline: "Ultra-fast, free tier",
              },
              {
                name: "OpenRouter",
                tagline: "100+ models, one API",
              },
              {
                name: "Ollama",
                tagline: "Run locally, 100% private",
              },
            ].map((provider) => (
              <div
                key={provider.name}
                className="rounded-xl border border-card-border bg-card-bg p-6 text-center hover:border-accent/40 transition"
              >
                <h3 className="font-semibold text-foreground mb-2">
                  {provider.name}
                </h3>
                <p className="text-sm text-muted">{provider.tagline}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== HOW IT WORKS ====== */}
      <section className="py-20 border-t border-card-border px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-14">
            Three steps to reliable tests
          </h2>

          <div className="space-y-10">
            {[
              {
                step: "01",
                title: "Install the CLI",
                code: "npm install -g deflaky",
              },
              {
                step: "02",
                title: "Run detection",
                code: 'deflaky --command "npx playwright test" --runs 5',
              },
              {
                step: "03",
                title: "Push to dashboard",
                code: 'deflaky --command "npx playwright test" --runs 5 --push --token YOUR_TOKEN',
              },
            ].map((s) => (
              <div
                key={s.step}
                className="flex items-start gap-6 p-6 rounded-xl border border-card-border bg-card-bg"
              >
                <span className="text-accent font-bold text-2xl font-mono">
                  {s.step}
                </span>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                  <code className="text-sm text-muted font-mono bg-card-border/30 px-3 py-1.5 rounded-md inline-block">
                    $ {s.code}
                  </code>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== PRICING ====== */}
      <section id="pricing" className="py-20 border-t border-card-border px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-muted">
              100% free during launch. CLI is open source forever.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <PricingCard
              tier="CLI"
              price="$0"
              period="forever"
              features={[
                "Unlimited local runs",
                "Terminal reports",
                "JUnit XML & JSON support",
                "All frameworks supported",
                "Open source (MIT)",
              ]}
              cta="Install Free"
            />
            <PricingCard
              tier="Dashboard"
              price="$0"
              period="free during launch"
              features={[
                "Everything in CLI +",
                "Unlimited projects",
                "90-day history",
                "FlakeScore trends",
                "Email & Slack alerts",
              ]}
              cta="Get Free Access"
              highlighted
            />
            <PricingCard
              tier="Pro (Coming Soon)"
              price="$19"
              period="/mo after launch"
              features={[
                "Everything in Dashboard +",
                "AI Root Cause Analysis",
                "AI Failure Categorization",
                "Unlimited AI queries",
                "Priority support",
              ]}
              cta="Join Waitlist"
            />
          </div>
        </div>
      </section>

      {/* ====== FINAL CTA ====== */}
      <section className="py-20 border-t border-card-border px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Your tests aren&apos;t flaky.
            <br />
            <span className="gradient-text">They&apos;re unmonitored.</span>
          </h2>
          <p className="text-muted mb-8 text-lg">
            Join hundreds of QA engineers who ship with confidence.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/docs"
              className="bg-accent hover:bg-accent-hover text-black font-semibold px-8 py-3.5 rounded-lg text-base transition"
            >
              Get Started Free
            </Link>
            <a
              href="https://github.com/user/deflaky"
              className="border border-card-border hover:border-accent/50 font-semibold px-8 py-3.5 rounded-lg text-base transition"
            >
              Star on GitHub
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
