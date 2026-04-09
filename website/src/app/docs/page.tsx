import type { Metadata } from "next";
import { JsonLd } from "@/components/schema/JsonLd";
import { docsArticleSchema } from "@/components/schema/docs-schema";

export const metadata: Metadata = {
  title: "Documentation — DeFlaky",
  description:
    "Complete DeFlaky documentation. Install the CLI, detect flaky tests in Playwright, Cypress, Selenium, Jest, Pytest, and more. CI/CD integration, dashboard setup, and configuration reference.",
  alternates: { canonical: "/docs" },
};

/* ── Sidebar navigation sections ── */
const NAV_SECTIONS = [
  {
    title: "Getting Started",
    links: [
      { label: "Installation", href: "#installation" },
      { label: "Quick Start", href: "#quick-start" },
      { label: "Basic Usage", href: "#basic-usage" },
    ],
  },
  {
    title: "CLI Reference",
    links: [
      { label: "Commands", href: "#commands" },
      { label: "Flags & Options", href: "#flags" },
      { label: "Environment Variables", href: "#env-vars" },
    ],
  },
  {
    title: "Framework Guides",
    links: [
      { label: "Playwright", href: "#playwright" },
      { label: "Cypress", href: "#cypress" },
      { label: "Selenium (Java)", href: "#selenium" },
      { label: "Jest", href: "#jest" },
      { label: "Pytest", href: "#pytest" },
      { label: "Mocha", href: "#mocha" },
      { label: "TestNG", href: "#testng" },
    ],
  },
  {
    title: "CI/CD Integration",
    links: [
      { label: "GitHub Actions", href: "#github-actions" },
      { label: "GitLab CI", href: "#gitlab-ci" },
      { label: "Jenkins", href: "#jenkins" },
      { label: "Generic CI", href: "#generic-ci" },
    ],
  },
  {
    title: "Dashboard",
    links: [
      { label: "Connecting CLI", href: "#connecting-cli" },
      { label: "Projects & Tokens", href: "#projects-tokens" },
      { label: "FlakeScore", href: "#flakescore" },
      { label: "Flaky Test History", href: "#flaky-history" },
      { label: "AI Root Cause (Pro)", href: "#ai-root-cause" },
    ],
  },
  {
    title: "Configuration",
    links: [
      { label: "Config File", href: "#config-file" },
      { label: "Available Options", href: "#config-options" },
    ],
  },
];

/* ── Reusable components ── */

function CodeBlock({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="rounded-xl border border-card-border bg-card-bg overflow-hidden my-4">
      {title && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-card-border bg-card-border/30">
          <span className="text-xs text-muted font-mono">{title}</span>
        </div>
      )}
      <div className="p-5 font-mono text-sm leading-relaxed overflow-x-auto">
        {children}
      </div>
    </div>
  );
}

function Cmd({ text }: { text: string }) {
  return (
    <p>
      <span className="text-green-400">$</span> {text}
    </p>
  );
}

function Comment({ text }: { text: string }) {
  return <p className="text-muted">{text}</p>;
}

function SectionHeading({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <h2 id={id} className="text-2xl font-bold mt-16 mb-4 scroll-mt-24 border-b border-card-border pb-3">
      {children}
    </h2>
  );
}

function SubHeading({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <h3 id={id} className="text-lg font-semibold mt-10 mb-3 scroll-mt-24 text-foreground">
      {children}
    </h3>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return <div className="text-muted leading-relaxed space-y-3">{children}</div>;
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-sm text-accent font-mono bg-card-border/30 px-1.5 py-0.5 rounded">
      {children}
    </code>
  );
}

/* ── MAIN PAGE ── */
export default function DocsPage() {
  return (
    <div className="grid-bg min-h-screen">
      <JsonLd data={docsArticleSchema} />

      <div className="mx-auto max-w-[90rem] px-6 py-16 lg:py-20">
        {/* ── Page header ── */}
        <div className="mb-12 max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Documentation</h1>
          <p className="text-muted text-lg leading-relaxed">
            Everything you need to detect, track, and eliminate flaky tests. From
            installation to CI/CD integration and dashboard setup.
          </p>
        </div>

        <div className="flex gap-12">
          {/* ── Sidebar ── */}
          <nav className="hidden lg:block w-64 shrink-0 sticky top-24 self-start max-h-[calc(100vh-8rem)] overflow-y-auto pb-12">
            {NAV_SECTIONS.map((section) => (
              <div key={section.title} className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                  {section.title}
                </p>
                <ul className="space-y-1">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        className="block text-sm text-muted hover:text-accent transition py-1 pl-3 border-l border-card-border hover:border-accent"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          {/* ── Content ── */}
          <main className="min-w-0 flex-1 max-w-3xl">

            {/* ============================= */}
            {/* GETTING STARTED               */}
            {/* ============================= */}

            <SectionHeading id="installation">Installation</SectionHeading>
            <Prose>
              <p>
                Install the DeFlaky CLI globally with npm. Requires Node.js 18 or later.
              </p>
            </Prose>
            <CodeBlock title="Terminal">
              <Cmd text="npm install -g deflaky-cli" />
              <br />
              <Comment text="# Verify installation" />
              <Cmd text="deflaky-cli --version" />
            </CodeBlock>
            <Prose>
              <p>
                You can also use <InlineCode>npx</InlineCode> to run without
                installing globally:
              </p>
            </Prose>
            <CodeBlock>
              <Cmd text="npx deflaky-cli --help" />
            </CodeBlock>

            <SubHeading id="quick-start">Quick Start</SubHeading>
            <Prose>
              <p>
                Wrap your existing test command with <InlineCode>deflaky-cli run</InlineCode>.
                DeFlaky runs it multiple times and identifies flaky tests by comparing results.
              </p>
            </Prose>
            <CodeBlock title="Terminal">
              <Comment text="# Run Playwright tests 5 times (default)" />
              <Cmd text="deflaky-cli run -- npx playwright test" />
              <br />
              <Comment text="# Run 10 times with a custom threshold" />
              <Cmd text="deflaky-cli run --runs 10 --threshold 95 -- npx playwright test" />
            </CodeBlock>

            <SubHeading id="basic-usage">Basic Usage & Flags</SubHeading>
            <Prose>
              <p>The most common flags you will use day to day:</p>
            </Prose>
            <CodeBlock title="Terminal">
              <Comment text="# Specify number of runs" />
              <Cmd text="deflaky-cli run --runs 5 -- npx playwright test" />
              <br />
              <Comment text="# Set flakiness threshold (fail if FlakeScore is below)" />
              <Cmd text="deflaky-cli run --threshold 90 -- npx playwright test" />
              <br />
              <Comment text="# Output as JSON" />
              <Cmd text="deflaky-cli run --format json -- npx playwright test" />
              <br />
              <Comment text="# Output as JUnit XML" />
              <Cmd text="deflaky-cli run --format junit -- pytest" />
              <br />
              <Comment text="# Save report to a file" />
              <Cmd text="deflaky-cli run --format json --output report.json -- npx jest" />
            </CodeBlock>

            {/* ============================= */}
            {/* CLI REFERENCE                 */}
            {/* ============================= */}

            <SectionHeading id="commands">CLI Commands</SectionHeading>

            <div className="space-y-6">
              {[
                {
                  cmd: "deflaky-cli run",
                  desc: "Run your test command N times and detect flaky tests. This is the primary command you will use.",
                  example: "deflaky-cli run --runs 5 -- npx playwright test",
                },
                {
                  cmd: "deflaky-cli push",
                  desc: "Push a previously generated report to the DeFlaky dashboard. Useful when you want to separate detection from reporting.",
                  example: "deflaky-cli push --file report.json --token df_abc123",
                },
                {
                  cmd: "deflaky-cli config",
                  desc: "View or update your local DeFlaky configuration. Creates a .deflaky.config.json file in your project root.",
                  example: "deflaky-cli config set runs 10",
                },
              ].map((item) => (
                <div
                  key={item.cmd}
                  className="rounded-xl border border-card-border bg-card-bg p-5"
                >
                  <h4 className="font-mono text-accent font-semibold mb-1">
                    {item.cmd}
                  </h4>
                  <p className="text-sm text-muted mb-3">{item.desc}</p>
                  <code className="text-xs text-muted font-mono bg-card-border/30 px-3 py-1.5 rounded-md inline-block">
                    $ {item.example}
                  </code>
                </div>
              ))}
            </div>

            <SubHeading id="flags">Flags & Options</SubHeading>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-card-border rounded-xl overflow-hidden">
                <thead className="bg-card-bg">
                  <tr className="border-b border-card-border">
                    <th className="text-left px-4 py-3 font-semibold">Flag</th>
                    <th className="text-left px-4 py-3 font-semibold">Description</th>
                    <th className="text-left px-4 py-3 font-semibold">Default</th>
                  </tr>
                </thead>
                <tbody className="text-muted">
                  {[
                    ["--runs, -r", "Number of test iterations", "5"],
                    ["--threshold, -t", "Minimum FlakeScore to pass (0-100)", "disabled"],
                    ["--format, -f", "Report format: json, junit, auto", "auto"],
                    ["--output, -o", "Save report to file", "stdout"],
                    ["--push", "Push results to the dashboard after run", "false"],
                    ["--token", "Dashboard API token", "$DEFLAKY_API_TOKEN"],
                    ["--project", "Project slug for dashboard", "auto-detected"],
                    ["--verbose", "Show detailed output per run", "false"],
                    ["--parallel", "Max parallel test executions", "1"],
                    ["--fail-on-flaky", "Exit with code 1 if any flaky test found", "false"],
                    ["--help, -h", "Show help", "—"],
                    ["--version, -v", "Show CLI version", "—"],
                  ].map(([flag, desc, def]) => (
                    <tr key={flag} className="border-b border-card-border">
                      <td className="px-4 py-3 font-mono text-accent whitespace-nowrap">{flag}</td>
                      <td className="px-4 py-3">{desc}</td>
                      <td className="px-4 py-3 font-mono">{def}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <SubHeading id="env-vars">Environment Variables</SubHeading>
            <Prose>
              <p>
                Environment variables can be used instead of CLI flags. Flags always
                take precedence over environment variables.
              </p>
            </Prose>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm border border-card-border rounded-xl overflow-hidden">
                <thead className="bg-card-bg">
                  <tr className="border-b border-card-border">
                    <th className="text-left px-4 py-3 font-semibold">Variable</th>
                    <th className="text-left px-4 py-3 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody className="text-muted">
                  {[
                    ["DEFLAKY_API_TOKEN", "Dashboard API token for authentication"],
                    ["DEFLAKY_API_URL", "Custom API endpoint (self-hosted instances)"],
                    ["DEFLAKY_RUNS", "Default number of test iterations"],
                    ["DEFLAKY_THRESHOLD", "Default FlakeScore threshold"],
                    ["DEFLAKY_FORMAT", "Default report format"],
                  ].map(([name, desc]) => (
                    <tr key={name} className="border-b border-card-border">
                      <td className="px-4 py-3 font-mono text-accent whitespace-nowrap">{name}</td>
                      <td className="px-4 py-3">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ============================= */}
            {/* FRAMEWORK GUIDES              */}
            {/* ============================= */}

            <SectionHeading id="playwright">Playwright</SectionHeading>
            <Prose>
              <p>
                Playwright is a first-class citizen in DeFlaky. Results are parsed
                automatically from Playwright&apos;s built-in JSON reporter.
              </p>
            </Prose>
            <CodeBlock title="Terminal">
              <Comment text="# Basic detection" />
              <Cmd text="deflaky-cli run -- npx playwright test" />
              <br />
              <Comment text="# Run specific test file 10 times" />
              <Cmd text="deflaky-cli run --runs 10 -- npx playwright test tests/login.spec.ts" />
              <br />
              <Comment text="# With a specific project (e.g. chromium only)" />
              <Cmd text="deflaky-cli run -- npx playwright test --project=chromium" />
              <br />
              <Comment text="# Push results to dashboard" />
              <Cmd text="deflaky-cli run --push -- npx playwright test" />
            </CodeBlock>

            <SubHeading id="cypress">Cypress</SubHeading>
            <Prose>
              <p>
                DeFlaky works with Cypress in headless mode. Make sure you are using{" "}
                <InlineCode>cypress run</InlineCode> (not <InlineCode>cypress open</InlineCode>).
              </p>
            </Prose>
            <CodeBlock title="Terminal">
              <Comment text="# Detect flaky Cypress tests" />
              <Cmd text="deflaky-cli run -- npx cypress run" />
              <br />
              <Comment text="# Specific spec file" />
              <Cmd text="deflaky-cli run --runs 5 -- npx cypress run --spec cypress/e2e/checkout.cy.ts" />
              <br />
              <Comment text="# With a specific browser" />
              <Cmd text="deflaky-cli run -- npx cypress run --browser chrome" />
            </CodeBlock>

            <SubHeading id="selenium">Selenium (Java / Maven)</SubHeading>
            <Prose>
              <p>
                For Java-based Selenium projects using Maven and JUnit/TestNG, DeFlaky
                parses the Surefire XML reports automatically.
              </p>
            </Prose>
            <CodeBlock title="Terminal">
              <Comment text="# Run Maven tests" />
              <Cmd text="deflaky-cli run -- mvn test" />
              <br />
              <Comment text="# Specific test class" />
              <Cmd text='deflaky-cli run -- mvn test -Dtest="LoginTest"' />
              <br />
              <Comment text="# With Gradle" />
              <Cmd text="deflaky-cli run -- gradle test" />
            </CodeBlock>

            <SubHeading id="jest">Jest</SubHeading>
            <Prose>
              <p>
                DeFlaky supports Jest out of the box. Use the{" "}
                <InlineCode>--forceExit</InlineCode> flag if your Jest tests hang
                after completion.
              </p>
            </Prose>
            <CodeBlock title="Terminal">
              <Comment text="# Run all Jest tests" />
              <Cmd text="deflaky-cli run -- npx jest" />
              <br />
              <Comment text="# Specific test file" />
              <Cmd text="deflaky-cli run --runs 10 -- npx jest src/__tests__/api.test.ts" />
              <br />
              <Comment text="# With coverage disabled for speed" />
              <Cmd text="deflaky-cli run -- npx jest --no-coverage" />
            </CodeBlock>

            <SubHeading id="pytest">Pytest</SubHeading>
            <Prose>
              <p>
                For Python projects, DeFlaky wraps your pytest command and parses
                JUnit XML output.
              </p>
            </Prose>
            <CodeBlock title="Terminal">
              <Comment text="# Run all pytest tests" />
              <Cmd text="deflaky-cli run -- pytest" />
              <br />
              <Comment text="# Specific test module" />
              <Cmd text="deflaky-cli run --runs 5 -- pytest tests/test_auth.py" />
              <br />
              <Comment text="# With JUnit XML output for richer reports" />
              <Cmd text="deflaky-cli run -- pytest --junitxml=report.xml" />
              <br />
              <Comment text="# Run in verbose mode" />
              <Cmd text="deflaky-cli run -- pytest -v" />
            </CodeBlock>

            <SubHeading id="mocha">Mocha</SubHeading>
            <Prose>
              <p>
                Mocha tests work seamlessly with DeFlaky. Use the{" "}
                <InlineCode>--exit</InlineCode> flag to ensure Mocha exits cleanly.
              </p>
            </Prose>
            <CodeBlock title="Terminal">
              <Comment text="# Run all Mocha tests" />
              <Cmd text="deflaky-cli run -- npx mocha" />
              <br />
              <Comment text="# With specific test directory" />
              <Cmd text='deflaky-cli run -- npx mocha "test/**/*.spec.js" --exit' />
              <br />
              <Comment text="# With TypeScript" />
              <Cmd text="deflaky-cli run -- npx mocha --require ts-node/register 'test/**/*.spec.ts'" />
            </CodeBlock>

            <SubHeading id="testng">TestNG</SubHeading>
            <Prose>
              <p>
                For TestNG projects with Maven, point Surefire to your testng.xml
                suite file.
              </p>
            </Prose>
            <CodeBlock title="Terminal">
              <Comment text="# Run TestNG suite" />
              <Cmd text="deflaky-cli run -- mvn test -Dsurefire.suiteXmlFiles=testng.xml" />
              <br />
              <Comment text="# Specific test group" />
              <Cmd text='deflaky-cli run -- mvn test -Dgroups="smoke"' />
            </CodeBlock>

            {/* ============================= */}
            {/* CI/CD INTEGRATION             */}
            {/* ============================= */}

            <SectionHeading id="github-actions">GitHub Actions</SectionHeading>
            <Prose>
              <p>
                Add a flaky test check to every pull request. The workflow installs
                DeFlaky, runs your tests multiple times, and fails the check if the
                FlakeScore drops below your threshold.
              </p>
              <p>
                For the complete guide with PR comments, framework-specific examples,
                reusable workflows, and troubleshooting, see the{" "}
                <a href="/docs/github-actions" className="text-accent hover:underline font-semibold">
                  dedicated GitHub Actions documentation
                </a>.
              </p>
            </Prose>
            <CodeBlock title=".github/workflows/flaky-check.yml">
              <p><span className="text-blue-400">name:</span> Flaky Test Check</p>
              <p><span className="text-blue-400">on:</span> [pull_request]</p>
              <br />
              <p><span className="text-blue-400">jobs:</span></p>
              <p>{"  "}<span className="text-blue-400">flaky-check:</span></p>
              <p>{"    "}<span className="text-blue-400">runs-on:</span> ubuntu-latest</p>
              <p>{"    "}<span className="text-blue-400">steps:</span></p>
              <p>{"      "}- <span className="text-blue-400">uses:</span> actions/checkout@v4</p>
              <br />
              <p>{"      "}- <span className="text-blue-400">name:</span> Setup Node.js</p>
              <p>{"        "}<span className="text-blue-400">uses:</span> actions/setup-node@v4</p>
              <p>{"        "}<span className="text-blue-400">with:</span></p>
              <p>{"          "}<span className="text-blue-400">node-version:</span> 20</p>
              <br />
              <p>{"      "}- <span className="text-blue-400">name:</span> Install dependencies</p>
              <p>{"        "}<span className="text-blue-400">run:</span> npm ci</p>
              <br />
              <p>{"      "}- <span className="text-blue-400">name:</span> Install Playwright browsers</p>
              <p>{"        "}<span className="text-blue-400">run:</span> npx playwright install --with-deps</p>
              <br />
              <p>{"      "}- <span className="text-blue-400">name:</span> Run DeFlaky</p>
              <p>{"        "}<span className="text-blue-400">run:</span> npx deflaky-cli run --runs 3 --threshold 90 --push -- npx playwright test</p>
              <p>{"        "}<span className="text-blue-400">env:</span></p>
              <p>{"          "}<span className="text-blue-400">DEFLAKY_API_TOKEN:</span> {"${{ secrets.DEFLAKY_API_TOKEN }}"}</p>
            </CodeBlock>

            <SubHeading id="gitlab-ci">GitLab CI</SubHeading>
            <CodeBlock title=".gitlab-ci.yml">
              <p><span className="text-blue-400">flaky_check:</span></p>
              <p>{"  "}<span className="text-blue-400">stage:</span> test</p>
              <p>{"  "}<span className="text-blue-400">image:</span> mcr.microsoft.com/playwright:v1.44.0-jammy</p>
              <p>{"  "}<span className="text-blue-400">script:</span></p>
              <p>{"    "}- npm ci</p>
              <p>{"    "}- npx deflaky-cli run --runs 3 --threshold 90 --push -- npx playwright test</p>
              <p>{"  "}<span className="text-blue-400">variables:</span></p>
              <p>{"    "}<span className="text-blue-400">DEFLAKY_API_TOKEN:</span> $DEFLAKY_API_TOKEN</p>
              <p>{"  "}<span className="text-blue-400">only:</span></p>
              <p>{"    "}- merge_requests</p>
            </CodeBlock>

            <SubHeading id="jenkins">Jenkins Pipeline</SubHeading>
            <CodeBlock title="Jenkinsfile">
              <p><span className="text-blue-400">pipeline</span> {"{"}</p>
              <p>{"  "}<span className="text-blue-400">agent</span> {"{ docker { image 'node:20' } }"}</p>
              <br />
              <p>{"  "}<span className="text-blue-400">environment</span> {"{"}</p>
              <p>{"    "}DEFLAKY_API_TOKEN = credentials(&apos;deflaky-token&apos;)</p>
              <p>{"  "}{"}"}</p>
              <br />
              <p>{"  "}<span className="text-blue-400">stages</span> {"{"}</p>
              <p>{"    "}<span className="text-blue-400">stage</span>(&apos;Install&apos;) {"{"}</p>
              <p>{"      "}<span className="text-blue-400">steps</span> {"{"}</p>
              <p>{"        "}sh &apos;npm ci&apos;</p>
              <p>{"      "}{"}"}</p>
              <p>{"    "}{"}"}</p>
              <br />
              <p>{"    "}<span className="text-blue-400">stage</span>(&apos;Flaky Check&apos;) {"{"}</p>
              <p>{"      "}<span className="text-blue-400">steps</span> {"{"}</p>
              <p>{"        "}sh &apos;npx deflaky-cli run --runs 3 --threshold 90 --push -- npx playwright test&apos;</p>
              <p>{"      "}{"}"}</p>
              <p>{"    "}{"}"}</p>
              <p>{"  "}{"}"}</p>
              <p>{"}"}</p>
            </CodeBlock>

            <SubHeading id="generic-ci">Generic CI Setup</SubHeading>
            <Prose>
              <p>
                DeFlaky works in any CI environment that supports Node.js. The general
                pattern is:
              </p>
            </Prose>
            <CodeBlock title="Any CI">
              <Comment text="# 1. Install your project dependencies" />
              <Cmd text="npm ci" />
              <br />
              <Comment text="# 2. Run DeFlaky with your test command" />
              <Cmd text="npx deflaky-cli run --runs 3 --threshold 90 --push -- <your-test-command>" />
              <br />
              <Comment text="# Make sure DEFLAKY_API_TOKEN is set in your CI environment" />
              <Comment text="# DeFlaky exits with code 1 if FlakeScore is below --threshold" />
            </CodeBlock>

            {/* ============================= */}
            {/* DASHBOARD                     */}
            {/* ============================= */}

            <SectionHeading id="connecting-cli">Connecting CLI to Dashboard</SectionHeading>
            <Prose>
              <p>
                The DeFlaky dashboard gives you a visual overview of your test
                suite&apos;s reliability over time. To connect the CLI, you need an
                API token.
              </p>
            </Prose>
            <CodeBlock title="Terminal">
              <Comment text="# Option 1: Pass token as a flag" />
              <Cmd text="deflaky-cli run --push --token df_abc123 -- npx playwright test" />
              <br />
              <Comment text="# Option 2: Set as environment variable (recommended for CI)" />
              <Cmd text="export DEFLAKY_API_TOKEN=df_abc123" />
              <Cmd text="deflaky-cli run --push -- npx playwright test" />
              <br />
              <Comment text="# Option 3: Save in config file" />
              <Cmd text="deflaky-cli config set token df_abc123" />
              <Cmd text="deflaky-cli run --push -- npx playwright test" />
            </CodeBlock>

            <SubHeading id="projects-tokens">Creating Projects & API Tokens</SubHeading>
            <Prose>
              <p>
                Each project in the dashboard has its own API token. To create a new
                project:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-muted">
                <li>Go to the <a href="/dashboard" className="text-accent hover:underline">Dashboard</a> and sign in.</li>
                <li>Click <strong className="text-foreground">New Project</strong> and enter a name.</li>
                <li>Copy the generated API token. This is your <InlineCode>DEFLAKY_API_TOKEN</InlineCode>.</li>
                <li>Store the token securely in your CI secrets (never commit it to source control).</li>
              </ol>
            </Prose>

            <SubHeading id="flakescore">Understanding FlakeScore</SubHeading>
            <Prose>
              <p>
                FlakeScore is a 0-100 metric that represents the overall reliability
                of your test suite:
              </p>
            </Prose>
            <div className="grid sm:grid-cols-3 gap-4 mt-4 mb-6">
              {[
                { range: "95 - 100", label: "Excellent", color: "text-green-400", desc: "Minimal flakiness. Ship with confidence." },
                { range: "80 - 94", label: "Needs Attention", color: "text-yellow-400", desc: "Some flaky tests. Prioritize fixing them." },
                { range: "0 - 79", label: "Critical", color: "text-red-400", desc: "High flakiness. Tests are unreliable." },
              ].map((item) => (
                <div key={item.range} className="rounded-xl border border-card-border bg-card-bg p-4">
                  <p className={`font-mono font-bold ${item.color}`}>{item.range}</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{item.label}</p>
                  <p className="text-xs text-muted mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
            <Prose>
              <p>
                The score is calculated as:{" "}
                <InlineCode>(stable tests / total tests) * 100</InlineCode>, weighted
                by run count and recency.
              </p>
            </Prose>

            <SubHeading id="flaky-history">Viewing Flaky Test History</SubHeading>
            <Prose>
              <p>
                The dashboard tracks every test run and shows you trends over time.
                You can filter by date range, test name, or status. Each flaky test
                entry shows:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted">
                <li>Test name and file path</li>
                <li>Pass rate across runs (e.g., 3/5 passed)</li>
                <li>First seen and last seen dates</li>
                <li>FlakeScore trend (improving or degrading)</li>
                <li>Stack traces from failed runs</li>
              </ul>
            </Prose>

            <SubHeading id="ai-root-cause">AI Root Cause Analysis (Pro)</SubHeading>
            <Prose>
              <p>
                Available on the Pro plan, AI Root Cause Analysis automatically
                analyzes your flaky test failures and categorizes them into:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted">
                <li><strong className="text-foreground">Infrastructure</strong> — network timeouts, resource limits, environment drift</li>
                <li><strong className="text-foreground">Application bug</strong> — race conditions, state leaks, timing issues</li>
                <li><strong className="text-foreground">Test code</strong> — poor selectors, missing waits, shared state between tests</li>
                <li><strong className="text-foreground">Non-deterministic</strong> — random data, date/time dependencies, order-dependent tests</li>
              </ul>
              <p>
                The AI also suggests concrete fixes with code examples. Bring your own
                API key from Anthropic, OpenAI, Groq, OpenRouter, or Ollama.
              </p>
            </Prose>

            {/* ============================= */}
            {/* CONFIGURATION                 */}
            {/* ============================= */}

            <SectionHeading id="config-file">Configuration File</SectionHeading>
            <Prose>
              <p>
                Create a <InlineCode>.deflaky.config.json</InlineCode> file in your
                project root to set default options. The CLI automatically picks it up.
              </p>
            </Prose>
            <CodeBlock title=".deflaky.config.json">
              <p>{"{"}</p>
              <p>{"  "}<span className="text-blue-400">&quot;runs&quot;</span>: <span className="text-yellow-400">5</span>,</p>
              <p>{"  "}<span className="text-blue-400">&quot;threshold&quot;</span>: <span className="text-yellow-400">90</span>,</p>
              <p>{"  "}<span className="text-blue-400">&quot;format&quot;</span>: <span className="text-green-400">&quot;json&quot;</span>,</p>
              <p>{"  "}<span className="text-blue-400">&quot;push&quot;</span>: <span className="text-yellow-400">true</span>,</p>
              <p>{"  "}<span className="text-blue-400">&quot;token&quot;</span>: <span className="text-green-400">&quot;df_abc123&quot;</span>,</p>
              <p>{"  "}<span className="text-blue-400">&quot;project&quot;</span>: <span className="text-green-400">&quot;my-app&quot;</span>,</p>
              <p>{"  "}<span className="text-blue-400">&quot;apiUrl&quot;</span>: <span className="text-green-400">&quot;https://api.deflaky.com&quot;</span>,</p>
              <p>{"  "}<span className="text-blue-400">&quot;parallel&quot;</span>: <span className="text-yellow-400">1</span>,</p>
              <p>{"  "}<span className="text-blue-400">&quot;verbose&quot;</span>: <span className="text-yellow-400">false</span>,</p>
              <p>{"  "}<span className="text-blue-400">&quot;failOnFlaky&quot;</span>: <span className="text-yellow-400">false</span></p>
              <p>{"}"}</p>
            </CodeBlock>
            <Prose>
              <p>
                You can also generate this file interactively:
              </p>
            </Prose>
            <CodeBlock>
              <Cmd text="deflaky-cli config init" />
            </CodeBlock>

            <SubHeading id="config-options">Available Options</SubHeading>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm border border-card-border rounded-xl overflow-hidden">
                <thead className="bg-card-bg">
                  <tr className="border-b border-card-border">
                    <th className="text-left px-4 py-3 font-semibold">Key</th>
                    <th className="text-left px-4 py-3 font-semibold">Type</th>
                    <th className="text-left px-4 py-3 font-semibold">Description</th>
                    <th className="text-left px-4 py-3 font-semibold">Default</th>
                  </tr>
                </thead>
                <tbody className="text-muted">
                  {[
                    ["runs", "number", "Number of test iterations", "5"],
                    ["threshold", "number", "Minimum FlakeScore to pass (0-100)", "disabled"],
                    ["format", "string", "Report format: json, junit, auto", "auto"],
                    ["push", "boolean", "Push results to dashboard", "false"],
                    ["token", "string", "Dashboard API token", "—"],
                    ["project", "string", "Project slug for dashboard", "auto-detected"],
                    ["apiUrl", "string", "Custom API endpoint", "https://api.deflaky.com"],
                    ["parallel", "number", "Max parallel test executions", "1"],
                    ["verbose", "boolean", "Show detailed output", "false"],
                    ["failOnFlaky", "boolean", "Exit code 1 if any flaky test found", "false"],
                  ].map(([key, type, desc, def]) => (
                    <tr key={key} className="border-b border-card-border">
                      <td className="px-4 py-3 font-mono text-accent whitespace-nowrap">{key}</td>
                      <td className="px-4 py-3 font-mono text-yellow-400">{type}</td>
                      <td className="px-4 py-3">{desc}</td>
                      <td className="px-4 py-3 font-mono">{def}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Footer spacer ── */}
            <div className="mt-20 pt-10 border-t border-card-border text-center">
              <p className="text-muted text-sm">
                Need help? Open an issue on{" "}
                <a
                  href="https://github.com/PramodDutta/deflaky"
                  className="text-accent hover:underline"
                >
                  GitHub
                </a>{" "}
                or reach out on{" "}
                <a href="mailto:support@deflaky.com" className="text-accent hover:underline">
                  support@deflaky.com
                </a>
                .
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
