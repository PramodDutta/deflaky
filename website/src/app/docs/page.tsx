import type { Metadata } from "next";
import { JsonLd } from "@/components/schema/JsonLd";
import { docsArticleSchema } from "@/components/schema/docs-schema";

export const metadata: Metadata = {
  title: "Getting Started — DeFlaky Documentation",
  description: "Install the DeFlaky CLI in under 2 minutes. Detect flaky tests in Playwright, Selenium, Cypress, Jest, and Pytest test suites with a single command.",
  alternates: { canonical: "/docs" },
};

export default function DocsPage() {
  return (
    <div className="grid-bg min-h-screen">
      {/* Structured Data: TechArticle */}
      <JsonLd data={docsArticleSchema} />

      <div className="mx-auto max-w-4xl px-6 py-20">
        <h1 className="text-4xl font-bold mb-4">Getting Started</h1>
        <p className="text-muted text-lg mb-12">
          Get up and running with DeFlaky in under 2 minutes.
        </p>

        {/* Step 1 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
            <span className="text-accent font-mono">01</span> Install
          </h2>
          <div className="rounded-xl border border-card-border bg-card-bg p-5 font-mono text-sm overflow-x-auto">
            <p><span className="text-green-400">$</span> npm install -g deflaky</p>
            <p className="text-muted mt-2"># or use npx without installing</p>
            <p><span className="text-green-400">$</span> npx deflaky --help</p>
          </div>
        </section>

        {/* Step 2 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
            <span className="text-accent font-mono">02</span> Detect Flaky Tests
          </h2>
          <p className="text-muted mb-4">
            Wrap your existing test command. DeFlaky runs it N times and
            compares results.
          </p>
          <div className="rounded-xl border border-card-border bg-card-bg p-5 font-mono text-sm space-y-2 overflow-x-auto">
            <p className="text-muted"># Basic usage — run 5 times</p>
            <p>
              <span className="text-green-400">$</span> deflaky --command &quot;npx
              playwright test&quot; --runs 5
            </p>
            <br />
            <p className="text-muted"># With custom report format</p>
            <p>
              <span className="text-green-400">$</span> deflaky --command &quot;pytest
              --junitxml=report.xml&quot; --runs 3 --format junit
            </p>
            <br />
            <p className="text-muted"># Only check specific test files</p>
            <p>
              <span className="text-green-400">$</span> deflaky --command &quot;npx jest
              login.test.ts&quot; --runs 10
            </p>
          </div>
        </section>

        {/* Step 3 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
            <span className="text-accent font-mono">03</span> Push to Dashboard
          </h2>
          <p className="text-muted mb-4">
            Optional: send results to the DeFlaky dashboard for trend tracking,
            alerts, and team visibility.
          </p>
          <div className="rounded-xl border border-card-border bg-card-bg p-5 font-mono text-sm space-y-2 overflow-x-auto">
            <p className="text-muted"># Get your token from the dashboard</p>
            <p>
              <span className="text-green-400">$</span> deflaky --command &quot;npx
              playwright test&quot; --runs 5 --push --token df_abc123
            </p>
            <br />
            <p className="text-muted"># Or set it as an env variable</p>
            <p>
              <span className="text-green-400">$</span> export
              DEFLAKY_TOKEN=df_abc123
            </p>
            <p>
              <span className="text-green-400">$</span> deflaky --command &quot;npx
              playwright test&quot; --runs 5 --push
            </p>
          </div>
        </section>

        {/* CI/CD */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
            <span className="text-accent font-mono">04</span> CI/CD Integration
          </h2>
          <p className="text-muted mb-4">
            Add DeFlaky to your pipeline to catch flaky tests before they merge.
          </p>
          <div className="rounded-xl border border-card-border bg-card-bg p-5 font-mono text-sm overflow-x-auto">
            <p className="text-muted"># .github/workflows/flaky-check.yml</p>
            <p className="text-blue-400">name:</p><p> Flaky Test Check</p>
            <p className="text-blue-400">on:</p><p> [pull_request]</p>
            <p className="text-blue-400">jobs:</p>
            <p>&nbsp;&nbsp;<span className="text-blue-400">flaky-check:</span></p>
            <p>&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-400">runs-on:</span> ubuntu-latest</p>
            <p>&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-400">steps:</span></p>
            <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- uses: actions/checkout@v4</p>
            <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- run: npm ci</p>
            <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- run: npx deflaky --command &quot;npx playwright test&quot; --runs 3 --push --fail-threshold 90</p>
          </div>
        </section>

        {/* CLI Reference */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">CLI Reference</h2>
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
                  ["--command, -c", "Test command to run", "(required)"],
                  ["--runs, -r", "Number of iterations", "5"],
                  ["--push", "Send results to dashboard", "false"],
                  ["--token, -t", "Dashboard API token", "$DEFLAKY_TOKEN"],
                  ["--format", "Report format (junit, json, auto)", "auto"],
                  ["--fail-threshold", "Fail if FlakeScore below N", "disabled"],
                  ["--output, -o", "Save report to file", "stdout"],
                  ["--verbose", "Show detailed output", "false"],
                ].map(([flag, desc, def]) => (
                  <tr key={flag} className="border-b border-card-border">
                    <td className="px-4 py-3 font-mono text-accent">{flag}</td>
                    <td className="px-4 py-3">{desc}</td>
                    <td className="px-4 py-3 font-mono">{def}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
