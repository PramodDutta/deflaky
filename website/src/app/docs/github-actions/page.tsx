import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "GitHub Actions Integration — DeFlaky Docs",
  description:
    "Set up DeFlaky in GitHub Actions to automatically detect flaky tests on every push and pull request. Complete guide with examples for Playwright, Cypress, Jest, Pytest, and Selenium.",
  alternates: { canonical: "/docs/github-actions" },
};

/* ── Reusable components (matching docs/page.tsx style) ── */

function CodeBlock({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
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

function YamlLine({
  indent = 0,
  keyName,
  value,
  comment,
}: {
  indent?: number;
  keyName?: string;
  value?: string;
  comment?: string;
}) {
  const spaces = "  ".repeat(indent);
  if (comment) {
    return (
      <p className="text-muted">
        {spaces}
        {"# "}
        {comment}
      </p>
    );
  }
  return (
    <p>
      {spaces}
      {keyName && (
        <span className="text-blue-400">{keyName}:</span>
      )}
      {value && <span> {value}</span>}
    </p>
  );
}

function SectionHeading({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <h2
      id={id}
      className="text-2xl font-bold mt-16 mb-4 scroll-mt-24 border-b border-card-border pb-3"
    >
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
    <h3
      id={id}
      className="text-lg font-semibold mt-10 mb-3 scroll-mt-24 text-foreground"
    >
      {children}
    </h3>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-muted leading-relaxed space-y-3">{children}</div>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-sm text-accent font-mono bg-card-border/30 px-1.5 py-0.5 rounded">
      {children}
    </code>
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

/* ── Sidebar navigation ── */
const NAV_SECTIONS = [
  {
    title: "Overview",
    links: [
      { label: "Quick Start", href: "#quick-start" },
      { label: "How It Works", href: "#how-it-works" },
    ],
  },
  {
    title: "Setup",
    links: [
      { label: "1. Get API Token", href: "#get-token" },
      { label: "2. Add GitHub Secret", href: "#add-secret" },
      { label: "3. Create Workflow", href: "#create-workflow" },
    ],
  },
  {
    title: "Configuration",
    links: [
      { label: "CLI Flags", href: "#cli-flags" },
      { label: "Fail Threshold", href: "#fail-threshold" },
      { label: "Scheduling", href: "#scheduling" },
    ],
  },
  {
    title: "Framework Examples",
    links: [
      { label: "Playwright", href: "#playwright" },
      { label: "Cypress", href: "#cypress" },
      { label: "Jest", href: "#jest" },
      { label: "Pytest", href: "#pytest" },
      { label: "Selenium", href: "#selenium" },
    ],
  },
  {
    title: "Advanced",
    links: [
      { label: "PR Comments", href: "#pr-comments" },
      { label: "Reusable Workflow", href: "#reusable-workflow" },
      { label: "Composite Action", href: "#composite-action" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Troubleshooting", href: "#troubleshooting" },
      { label: "Related Resources", href: "#resources" },
    ],
  },
];

/* ── MAIN PAGE ── */
export default function GitHubActionsDocsPage() {
  return (
    <div className="grid-bg min-h-screen">
      <div className="mx-auto max-w-[90rem] px-6 py-16 lg:py-20">
        {/* ── Breadcrumb ── */}
        <div className="mb-8 text-sm text-muted">
          <Link href="/docs" className="hover:text-accent transition">
            Docs
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">GitHub Actions</span>
        </div>

        {/* ── Page header ── */}
        <div className="mb-12 max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            GitHub Actions Integration
          </h1>
          <p className="text-muted text-lg leading-relaxed">
            Automatically detect flaky tests on every push, pull request, and on
            a schedule. Get FlakeScore results in your GitHub Actions summary and
            PR comments.
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
            {/* QUICK START                   */}
            {/* ============================= */}

            <SectionHeading id="quick-start">Quick Start</SectionHeading>
            <Prose>
              <p>
                Get DeFlaky running in GitHub Actions in under 5 minutes. Copy
                this workflow to{" "}
                <InlineCode>.github/workflows/deflaky.yml</InlineCode> in your
                repository:
              </p>
            </Prose>
            <CodeBlock title=".github/workflows/deflaky.yml">
              <YamlLine keyName="name" value="DeFlaky - Flaky Test Detection" />
              <br />
              <YamlLine keyName="on" />
              <YamlLine indent={1} keyName="push" />
              <YamlLine indent={2} keyName="branches" value="[main]" />
              <YamlLine indent={1} keyName="pull_request" />
              <YamlLine indent={2} keyName="branches" value="[main]" />
              <YamlLine indent={1} keyName="schedule" />
              <YamlLine
                indent={2}
                value="- cron: '0 2 * * 1'"
              />
              <br />
              <YamlLine keyName="jobs" />
              <YamlLine indent={1} keyName="deflaky" />
              <YamlLine indent={2} keyName="runs-on" value="ubuntu-latest" />
              <YamlLine indent={2} keyName="steps" />
              <p>
                {"      "}- <span className="text-blue-400">uses:</span>{" "}
                actions/checkout@v4
              </p>
              <br />
              <p>
                {"      "}- <span className="text-blue-400">uses:</span>{" "}
                actions/setup-node@v4
              </p>
              <p>
                {"        "}
                <span className="text-blue-400">with:</span>
              </p>
              <p>
                {"          "}
                <span className="text-blue-400">node-version:</span> &apos;20&apos;
              </p>
              <br />
              <p>
                {"      "}- <span className="text-blue-400">run:</span> npm ci
              </p>
              <br />
              <p>
                {"      "}- <span className="text-blue-400">run:</span> npm
                install -g deflaky-cli
              </p>
              <br />
              <p>
                {"      "}- <span className="text-blue-400">name:</span> Run
                DeFlaky
              </p>
              <p>
                {"        "}
                <span className="text-blue-400">run:</span> deflaky run -c
                &quot;npx playwright test&quot; -r 3 --push --token {"${{ secrets.DEFLAKY_TOKEN }}"}
              </p>
              <p>
                {"        "}
                <span className="text-blue-400">env:</span>
              </p>
              <p>
                {"          "}
                <span className="text-blue-400">DEFLAKY_TOKEN:</span>{" "}
                {"${{ secrets.DEFLAKY_TOKEN }}"}
              </p>
            </CodeBlock>

            <Prose>
              <p>
                Download the{" "}
                <a
                  href="/examples/github-actions-workflow.yml"
                  className="text-accent hover:underline"
                >
                  complete example workflow
                </a>{" "}
                with PR comments, step outputs, and multi-framework support.
              </p>
            </Prose>

            {/* ============================= */}
            {/* HOW IT WORKS                  */}
            {/* ============================= */}

            <SubHeading id="how-it-works">How It Works</SubHeading>
            <Prose>
              <p>
                DeFlaky wraps your existing test command and runs it multiple
                times. After all runs complete, it compares results across runs
                to identify tests that sometimes pass and sometimes fail --
                these are your flaky tests.
              </p>
              <ol className="list-decimal list-inside space-y-2 text-muted">
                <li>
                  The workflow checks out your code and installs dependencies.
                </li>
                <li>
                  DeFlaky runs your test command N times (configured with{" "}
                  <InlineCode>-r</InlineCode>).
                </li>
                <li>
                  Results are compared across runs. A test that passes in some
                  runs but fails in others is flagged as flaky.
                </li>
                <li>
                  A <strong className="text-foreground">FlakeScore</strong> is
                  calculated: (stable tests / total tests) x 100.
                </li>
                <li>
                  Results are pushed to the{" "}
                  <a
                    href="https://deflaky.com/dashboard"
                    className="text-accent hover:underline"
                  >
                    DeFlaky Dashboard
                  </a>{" "}
                  via <InlineCode>--push</InlineCode>.
                </li>
              </ol>
            </Prose>

            {/* ============================= */}
            {/* SETUP                         */}
            {/* ============================= */}

            <SectionHeading id="get-token">
              Step 1: Get Your API Token
            </SectionHeading>
            <Prose>
              <ol className="list-decimal list-inside space-y-2 text-muted">
                <li>
                  Go to the{" "}
                  <a
                    href="https://deflaky.com/dashboard"
                    className="text-accent hover:underline"
                  >
                    DeFlaky Dashboard
                  </a>{" "}
                  and sign in.
                </li>
                <li>
                  Click{" "}
                  <strong className="text-foreground">New Project</strong> and
                  enter a name for your repository.
                </li>
                <li>
                  Copy the generated API token. It uses the format{" "}
                  <InlineCode>df_&lt;uuid&gt;</InlineCode>.
                </li>
              </ol>
            </Prose>

            <SectionHeading id="add-secret">
              Step 2: Add GitHub Secret
            </SectionHeading>
            <Prose>
              <p>
                Add your DeFlaky token as an encrypted secret in your GitHub
                repository. Never commit tokens to source control.
              </p>
              <ol className="list-decimal list-inside space-y-2 text-muted">
                <li>
                  Open your repository on GitHub.
                </li>
                <li>
                  Navigate to{" "}
                  <strong className="text-foreground">
                    Settings &gt; Secrets and variables &gt; Actions
                  </strong>
                  .
                </li>
                <li>
                  Click{" "}
                  <strong className="text-foreground">
                    New repository secret
                  </strong>
                  .
                </li>
                <li>
                  Set the name to{" "}
                  <InlineCode>DEFLAKY_TOKEN</InlineCode> and paste your token.
                </li>
                <li>
                  Click{" "}
                  <strong className="text-foreground">Add secret</strong>.
                </li>
              </ol>
            </Prose>

            <SectionHeading id="create-workflow">
              Step 3: Create the Workflow
            </SectionHeading>
            <Prose>
              <p>
                Create{" "}
                <InlineCode>.github/workflows/deflaky.yml</InlineCode> in your
                repository. The workflow installs your dependencies, installs the
                DeFlaky CLI, and runs your test command multiple times.
              </p>
              <p>
                See the{" "}
                <a href="#quick-start" className="text-accent hover:underline">
                  Quick Start
                </a>{" "}
                section above for the full workflow, or scroll down for
                framework-specific examples.
              </p>
            </Prose>

            {/* ============================= */}
            {/* CONFIGURATION                 */}
            {/* ============================= */}

            <SectionHeading id="cli-flags">CLI Flags</SectionHeading>
            <Prose>
              <p>
                These flags control how DeFlaky runs in your GitHub Actions
                workflow:
              </p>
            </Prose>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm border border-card-border rounded-xl overflow-hidden">
                <thead className="bg-card-bg">
                  <tr className="border-b border-card-border">
                    <th className="text-left px-4 py-3 font-semibold">Flag</th>
                    <th className="text-left px-4 py-3 font-semibold">
                      Description
                    </th>
                    <th className="text-left px-4 py-3 font-semibold">
                      Default
                    </th>
                  </tr>
                </thead>
                <tbody className="text-muted">
                  {[
                    [
                      "-c, --command",
                      "Test command to run",
                      "required",
                    ],
                    ["-r, --runs", "Number of test iterations", "5"],
                    [
                      "--push",
                      "Push results to the DeFlaky dashboard",
                      "false",
                    ],
                    [
                      "--token",
                      "API token (or set DEFLAKY_TOKEN env var)",
                      "-",
                    ],
                    [
                      "--fail-threshold",
                      "Fail if FlakeScore is below this % (0-100)",
                      "disabled",
                    ],
                    ["--verbose", "Show detailed output per run", "false"],
                    [
                      "--format",
                      "Report format: json, junit, auto",
                      "auto",
                    ],
                  ].map(([flag, desc, def]) => (
                    <tr key={flag} className="border-b border-card-border">
                      <td className="px-4 py-3 font-mono text-accent whitespace-nowrap">
                        {flag}
                      </td>
                      <td className="px-4 py-3">{desc}</td>
                      <td className="px-4 py-3 font-mono">{def}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <SubHeading id="fail-threshold">
              Failing CI on Low FlakeScore
            </SubHeading>
            <Prose>
              <p>
                Use <InlineCode>--fail-threshold</InlineCode> to enforce a
                minimum FlakeScore. If the score drops below the threshold,
                DeFlaky exits with code 1 and the GitHub Actions check fails:
              </p>
            </Prose>
            <CodeBlock title="Terminal">
              <Cmd text='deflaky run -c "npx playwright test" -r 5 --push --token $DEFLAKY_TOKEN --fail-threshold 90' />
            </CodeBlock>
            <Prose>
              <p>
                This prevents PRs that introduce flaky tests from merging.
                Combine with branch protection rules for maximum enforcement.
              </p>
            </Prose>

            <SubHeading id="scheduling">Scheduling Runs</SubHeading>
            <Prose>
              <p>
                Use the GitHub Actions <InlineCode>schedule</InlineCode> trigger
                for automated weekly detection:
              </p>
            </Prose>
            <CodeBlock title="Cron Examples">
              <Comment text="# Every Monday at 2am UTC" />
              <p>
                <span className="text-blue-400">cron:</span> &apos;0 2 * *
                1&apos;
              </p>
              <br />
              <Comment text="# Every day at midnight UTC" />
              <p>
                <span className="text-blue-400">cron:</span> &apos;0 0 * *
                *&apos;
              </p>
              <br />
              <Comment text="# Monday and Thursday at 3am UTC" />
              <p>
                <span className="text-blue-400">cron:</span> &apos;0 3 * * 1,4&apos;
              </p>
            </CodeBlock>

            {/* ============================= */}
            {/* FRAMEWORK EXAMPLES            */}
            {/* ============================= */}

            <SectionHeading id="playwright">Playwright</SectionHeading>
            <Prose>
              <p>
                Playwright requires browser binaries to be installed. Add the
                install step before running DeFlaky:
              </p>
            </Prose>
            <CodeBlock title=".github/workflows/deflaky.yml">
              <YamlLine keyName="steps" />
              <p>
                {"  "}- <span className="text-blue-400">uses:</span>{" "}
                actions/checkout@v4
              </p>
              <p>
                {"  "}- <span className="text-blue-400">uses:</span>{" "}
                actions/setup-node@v4
              </p>
              <p>
                {"    "}
                <span className="text-blue-400">with:</span>
              </p>
              <p>
                {"      "}
                <span className="text-blue-400">node-version:</span> &apos;20&apos;
              </p>
              <p>
                {"  "}- <span className="text-blue-400">run:</span> npm ci
              </p>
              <p>
                {"  "}- <span className="text-blue-400">run:</span> npx
                playwright install --with-deps
              </p>
              <p>
                {"  "}- <span className="text-blue-400">run:</span> npm install
                -g deflaky-cli
              </p>
              <p>
                {"  "}- <span className="text-blue-400">name:</span> Run DeFlaky
              </p>
              <p>
                {"    "}
                <span className="text-blue-400">run:</span> deflaky run -c &quot;npx
                playwright test&quot; -r 3 --push --token{" "}
                {"${{ secrets.DEFLAKY_TOKEN }}"}
              </p>
            </CodeBlock>

            <SubHeading id="cypress">Cypress</SubHeading>
            <Prose>
              <p>
                Cypress runs in headless mode by default with{" "}
                <InlineCode>cypress run</InlineCode>. No additional browser
                installation step is needed:
              </p>
            </Prose>
            <CodeBlock title=".github/workflows/deflaky.yml">
              <YamlLine keyName="steps" />
              <p>
                {"  "}- <span className="text-blue-400">uses:</span>{" "}
                actions/checkout@v4
              </p>
              <p>
                {"  "}- <span className="text-blue-400">uses:</span>{" "}
                actions/setup-node@v4
              </p>
              <p>
                {"    "}
                <span className="text-blue-400">with:</span>
              </p>
              <p>
                {"      "}
                <span className="text-blue-400">node-version:</span> &apos;20&apos;
              </p>
              <p>
                {"  "}- <span className="text-blue-400">run:</span> npm ci
              </p>
              <p>
                {"  "}- <span className="text-blue-400">run:</span> npm install
                -g deflaky-cli
              </p>
              <p>
                {"  "}- <span className="text-blue-400">name:</span> Run DeFlaky
              </p>
              <p>
                {"    "}
                <span className="text-blue-400">run:</span> deflaky run -c &quot;npx
                cypress run&quot; -r 3 --push --token{" "}
                {"${{ secrets.DEFLAKY_TOKEN }}"}
              </p>
            </CodeBlock>

            <SubHeading id="jest">Jest</SubHeading>
            <Prose>
              <p>
                Jest works out of the box. Use <InlineCode>--ci</InlineCode> for
                CI-optimized behavior:
              </p>
            </Prose>
            <CodeBlock title=".github/workflows/deflaky.yml">
              <YamlLine keyName="steps" />
              <p>
                {"  "}- <span className="text-blue-400">uses:</span>{" "}
                actions/checkout@v4
              </p>
              <p>
                {"  "}- <span className="text-blue-400">uses:</span>{" "}
                actions/setup-node@v4
              </p>
              <p>
                {"    "}
                <span className="text-blue-400">with:</span>
              </p>
              <p>
                {"      "}
                <span className="text-blue-400">node-version:</span> &apos;20&apos;
              </p>
              <p>
                {"  "}- <span className="text-blue-400">run:</span> npm ci
              </p>
              <p>
                {"  "}- <span className="text-blue-400">run:</span> npm install
                -g deflaky-cli
              </p>
              <p>
                {"  "}- <span className="text-blue-400">name:</span> Run DeFlaky
              </p>
              <p>
                {"    "}
                <span className="text-blue-400">run:</span> deflaky run -c &quot;npx
                jest --ci&quot; -r 3 --push --token{" "}
                {"${{ secrets.DEFLAKY_TOKEN }}"}
              </p>
            </CodeBlock>

            <SubHeading id="pytest">Pytest</SubHeading>
            <Prose>
              <p>
                For Python projects, set up Python and install your dependencies
                first. DeFlaky still runs via Node.js:
              </p>
            </Prose>
            <CodeBlock title=".github/workflows/deflaky.yml">
              <YamlLine keyName="steps" />
              <p>
                {"  "}- <span className="text-blue-400">uses:</span>{" "}
                actions/checkout@v4
              </p>
              <p>
                {"  "}- <span className="text-blue-400">uses:</span>{" "}
                actions/setup-python@v5
              </p>
              <p>
                {"    "}
                <span className="text-blue-400">with:</span>
              </p>
              <p>
                {"      "}
                <span className="text-blue-400">python-version:</span>{" "}
                &apos;3.12&apos;
              </p>
              <p>
                {"  "}- <span className="text-blue-400">uses:</span>{" "}
                actions/setup-node@v4
              </p>
              <p>
                {"    "}
                <span className="text-blue-400">with:</span>
              </p>
              <p>
                {"      "}
                <span className="text-blue-400">node-version:</span> &apos;20&apos;
              </p>
              <p>
                {"  "}- <span className="text-blue-400">run:</span> pip install
                -r requirements.txt
              </p>
              <p>
                {"  "}- <span className="text-blue-400">run:</span> npm install
                -g deflaky-cli
              </p>
              <p>
                {"  "}- <span className="text-blue-400">name:</span> Run DeFlaky
              </p>
              <p>
                {"    "}
                <span className="text-blue-400">run:</span> deflaky run -c
                &quot;pytest&quot; -r 3 --push --token{" "}
                {"${{ secrets.DEFLAKY_TOKEN }}"}
              </p>
            </CodeBlock>

            <SubHeading id="selenium">Selenium (Java / Maven)</SubHeading>
            <Prose>
              <p>
                For Java-based Selenium projects, set up Java and Maven. DeFlaky
                parses Surefire XML reports automatically:
              </p>
            </Prose>
            <CodeBlock title=".github/workflows/deflaky.yml">
              <YamlLine keyName="steps" />
              <p>
                {"  "}- <span className="text-blue-400">uses:</span>{" "}
                actions/checkout@v4
              </p>
              <p>
                {"  "}- <span className="text-blue-400">uses:</span>{" "}
                actions/setup-java@v4
              </p>
              <p>
                {"    "}
                <span className="text-blue-400">with:</span>
              </p>
              <p>
                {"      "}
                <span className="text-blue-400">distribution:</span>{" "}
                &apos;temurin&apos;
              </p>
              <p>
                {"      "}
                <span className="text-blue-400">java-version:</span>{" "}
                &apos;17&apos;
              </p>
              <p>
                {"  "}- <span className="text-blue-400">uses:</span>{" "}
                actions/setup-node@v4
              </p>
              <p>
                {"    "}
                <span className="text-blue-400">with:</span>
              </p>
              <p>
                {"      "}
                <span className="text-blue-400">node-version:</span> &apos;20&apos;
              </p>
              <p>
                {"  "}- <span className="text-blue-400">run:</span> npm install
                -g deflaky-cli
              </p>
              <p>
                {"  "}- <span className="text-blue-400">name:</span> Run DeFlaky
              </p>
              <p>
                {"    "}
                <span className="text-blue-400">run:</span> deflaky run -c &quot;mvn
                test&quot; -r 3 --push --token{" "}
                {"${{ secrets.DEFLAKY_TOKEN }}"}
              </p>
            </CodeBlock>

            {/* ============================= */}
            {/* ADVANCED                      */}
            {/* ============================= */}

            <SectionHeading id="pr-comments">
              PR Comments with Results
            </SectionHeading>
            <Prose>
              <p>
                Post DeFlaky results as a comment on every pull request. This
                uses <InlineCode>actions/github-script</InlineCode> to read step
                outputs and create a formatted comment:
              </p>
            </Prose>
            <CodeBlock title=".github/workflows/deflaky.yml (PR comment step)">
              <p>
                {"  "}- <span className="text-blue-400">name:</span> Run DeFlaky
              </p>
              <p>
                {"    "}
                <span className="text-blue-400">id:</span> deflaky
              </p>
              <p>
                {"    "}
                <span className="text-blue-400">run:</span> |
              </p>
              <p>
                {"      "}deflaky run -c &quot;npx playwright test&quot; -r 3 --push
                --token {"${{ secrets.DEFLAKY_TOKEN }}"} | tee output.txt
              </p>
              <p>
                {"      "}echo &quot;flake-score=$(grep -oP
                &apos;FlakeScore:\s*\K[\d.]+&apos; output.txt || echo
                &apos;100&apos;)&quot; {">> $GITHUB_OUTPUT"}
              </p>
              <p>
                {"      "}echo &quot;flaky-count=$(grep -oP &apos;Flaky
                tests:\s*\K\d+&apos; output.txt || echo &apos;0&apos;)&quot;{" "}
                {">> $GITHUB_OUTPUT"}
              </p>
              <br />
              <p>
                {"  "}- <span className="text-blue-400">name:</span> Comment on
                PR
              </p>
              <p>
                {"    "}
                <span className="text-blue-400">if:</span>{" "}
                {"github.event_name == 'pull_request'"}
              </p>
              <p>
                {"    "}
                <span className="text-blue-400">uses:</span>{" "}
                actions/github-script@v7
              </p>
              <p>
                {"    "}
                <span className="text-blue-400">with:</span>
              </p>
              <p>
                {"      "}
                <span className="text-blue-400">script:</span> |
              </p>
              <p className="text-muted">
                {"        "}// See full example at
              </p>
              <p className="text-muted">
                {"        "}// deflaky.com/examples/github-actions-workflow.yml
              </p>
            </CodeBlock>
            <Prose>
              <p>
                Download the{" "}
                <a
                  href="/examples/github-actions-workflow.yml"
                  className="text-accent hover:underline"
                >
                  complete example workflow
                </a>{" "}
                for the full PR comment implementation.
              </p>
            </Prose>

            <SubHeading id="reusable-workflow">
              Reusable Workflow
            </SubHeading>
            <Prose>
              <p>
                DeFlaky provides a reusable workflow that you can reference from
                your own repository. This simplifies setup -- you only need to
                pass your test command and token:
              </p>
            </Prose>
            <CodeBlock title=".github/workflows/deflaky.yml (in your repo)">
              <YamlLine keyName="name" value="Flaky Test Detection" />
              <YamlLine keyName="on" value="[push, pull_request]" />
              <br />
              <YamlLine keyName="jobs" />
              <YamlLine indent={1} keyName="deflaky" />
              <p>
                {"    "}
                <span className="text-blue-400">uses:</span>{" "}
                PramodDutta/deflaky/.github/workflows/deflaky.yml@main
              </p>
              <p>
                {"    "}
                <span className="text-blue-400">with:</span>
              </p>
              <p>
                {"      "}
                <span className="text-blue-400">test-command:</span>{" "}
                &quot;npx playwright test&quot;
              </p>
              <p>
                {"      "}
                <span className="text-blue-400">runs:</span> 3
              </p>
              <p>
                {"      "}
                <span className="text-blue-400">fail-threshold:</span> 90
              </p>
              <p>
                {"    "}
                <span className="text-blue-400">secrets:</span>
              </p>
              <p>
                {"      "}
                <span className="text-blue-400">deflaky-token:</span>{" "}
                {"${{ secrets.DEFLAKY_TOKEN }}"}
              </p>
            </CodeBlock>

            <SubHeading id="composite-action">
              Composite Action
            </SubHeading>
            <Prose>
              <p>
                For more control, use the DeFlaky composite action as a step in
                your existing workflow:
              </p>
            </Prose>
            <CodeBlock title=".github/workflows/your-tests.yml">
              <YamlLine keyName="steps" />
              <p>
                {"  "}- <span className="text-blue-400">uses:</span>{" "}
                actions/checkout@v4
              </p>
              <p>
                {"  "}- <span className="text-blue-400">run:</span> npm ci
              </p>
              <br />
              <p>
                {"  "}- <span className="text-blue-400">name:</span> Detect
                Flaky Tests
              </p>
              <p>
                {"    "}
                <span className="text-blue-400">uses:</span>{" "}
                PramodDutta/deflaky/.github/actions/deflaky@main
              </p>
              <p>
                {"    "}
                <span className="text-blue-400">with:</span>
              </p>
              <p>
                {"      "}
                <span className="text-blue-400">command:</span> &quot;npx
                playwright test&quot;
              </p>
              <p>
                {"      "}
                <span className="text-blue-400">runs:</span> 3
              </p>
              <p>
                {"      "}
                <span className="text-blue-400">token:</span>{" "}
                {"${{ secrets.DEFLAKY_TOKEN }}"}
              </p>
              <p>
                {"      "}
                <span className="text-blue-400">fail-threshold:</span> 90
              </p>
            </CodeBlock>

            {/* ============================= */}
            {/* TROUBLESHOOTING               */}
            {/* ============================= */}

            <SectionHeading id="troubleshooting">
              Troubleshooting
            </SectionHeading>

            <div className="space-y-8 mt-6">
              {[
                {
                  q: '"deflaky: command not found"',
                  a: "Install the CLI before running it. Add `npm install -g deflaky-cli` as a step before the DeFlaky run step. Alternatively, use `npx deflaky-cli` instead of `deflaky`.",
                },
                {
                  q: "Token not working / push fails",
                  a: "Verify the GitHub secret name is exactly `DEFLAKY_TOKEN`. Make sure you copied the full token (format: `df_<uuid>`) from the dashboard. Note: secrets are not available in workflows triggered by forked repositories.",
                },
                {
                  q: "Tests timing out",
                  a: "DeFlaky runs your tests N times, so total runtime is roughly N x single-run duration. Set an explicit `timeout-minutes` on the job. For example, if tests take 10 minutes and you run 3 times, set `timeout-minutes: 45`.",
                },
                {
                  q: "Playwright browsers not found",
                  a: "Always run `npx playwright install --with-deps` before the DeFlaky step. The `--with-deps` flag installs required system libraries on Ubuntu runners.",
                },
                {
                  q: "Results not appearing on dashboard",
                  a: "Make sure you include both `--push` and `--token` flags. Check that the token has not expired. Verify network connectivity from the runner (the push endpoint is `https://deflaky.com/api/push`).",
                },
                {
                  q: "Workflow not triggering on schedule",
                  a: "GitHub Actions only runs scheduled workflows on the default branch (usually `main`). Make sure the workflow file exists on the default branch. Note that GitHub may delay or skip scheduled runs during periods of high load.",
                },
              ].map((item) => (
                <div
                  key={item.q}
                  className="rounded-xl border border-card-border bg-card-bg p-5"
                >
                  <h4 className="font-semibold text-foreground mb-2">
                    {item.q}
                  </h4>
                  <p className="text-sm text-muted">{item.a}</p>
                </div>
              ))}
            </div>

            {/* ============================= */}
            {/* RESOURCES                     */}
            {/* ============================= */}

            <SectionHeading id="resources">Related Resources</SectionHeading>
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              {[
                {
                  title: "Blog: GitHub Actions Setup Guide",
                  desc: "Step-by-step walkthrough with screenshots and tips.",
                  href: "/blog/github-actions-deflaky-setup",
                },
                {
                  title: "Blog: Flaky Tests in GitHub Actions",
                  desc: "Deep dive into GitHub Actions-specific flakiness patterns.",
                  href: "/blog/flaky-tests-github-actions",
                },
                {
                  title: "Full CLI Documentation",
                  desc: "All commands, flags, and configuration options.",
                  href: "/docs",
                },
                {
                  title: "Example Workflow File",
                  desc: "Ready-to-copy workflow with PR comments.",
                  href: "/examples/github-actions-workflow.yml",
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-xl border border-card-border bg-card-bg p-5 hover:border-accent transition group"
                >
                  <h4 className="font-semibold text-foreground group-hover:text-accent transition mb-1">
                    {item.title}
                  </h4>
                  <p className="text-sm text-muted">{item.desc}</p>
                </Link>
              ))}
            </div>

            {/* ── Footer spacing ── */}
            <div className="mt-20" />
          </main>
        </div>
      </div>
    </div>
  );
}
