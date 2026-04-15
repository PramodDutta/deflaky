import { XMLParser } from "fast-xml-parser";
import type { TestCase } from "./types.js";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) => {
    return name === "testcase" || name === "testsuite";
  },
});

export function parseJUnitXML(xmlContent: string): TestCase[] {
  const testCases: TestCase[] = [];

  try {
    const parsed = xmlParser.parse(xmlContent);

    // Handle both <testsuites> and direct <testsuite> root
    let suites: unknown[] = [];

    if (parsed.testsuites) {
      const root = parsed.testsuites;
      suites = Array.isArray(root.testsuite)
        ? root.testsuite
        : root.testsuite
          ? [root.testsuite]
          : [];
    } else if (parsed.testsuite) {
      suites = Array.isArray(parsed.testsuite)
        ? parsed.testsuite
        : [parsed.testsuite];
    }

    for (const suite of suites) {
      const suiteObj = suite as Record<string, unknown>;
      const suiteName = (suiteObj["@_name"] as string) || "";
      const suiteFile = (suiteObj["@_file"] as string) || "";

      let cases = suiteObj.testcase;
      if (!cases) continue;
      if (!Array.isArray(cases)) cases = [cases];

      for (const tc of cases as Record<string, unknown>[]) {
        const name = (tc["@_name"] as string) || "unknown";
        const filePath =
          (tc["@_file"] as string) ||
          (tc["@_classname"] as string) ||
          suiteFile ||
          suiteName;
        const timeStr = (tc["@_time"] as string) || "0";
        const durationMs = parseFloat(timeStr) * 1000;

        let status: "pass" | "fail" | "skip" = "pass";

        if (tc.failure || tc.error) {
          status = "fail";
        } else if (tc.skipped !== undefined) {
          status = "skip";
        }

        testCases.push({ name, filePath, status, durationMs });
      }
    }
  } catch (err) {
    throw new Error(
      `Failed to parse JUnit XML: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return testCases;
}

interface JSONTestResult {
  name?: string;
  title?: string;
  fullName?: string;
  fullTitle?: string;
  filePath?: string;
  file?: string;
  ancestorTitles?: string[];
  status?: string;
  state?: string;
  duration?: number;
  time?: number;
  err?: unknown;
  failureMessages?: string[];
  // Playwright-style
  ok?: boolean;
  results?: Array<{ status?: string; duration?: number }>;
}

interface PlaywrightSpec {
  title?: string;
  file?: string;
  ok?: boolean;
  status?: string;
  duration?: number;
  tests?: Array<{
    projectName?: string;
    title?: string;
    status?: string;
    ok?: boolean;
    results?: Array<{ status?: string; duration?: number }>;
  }>;
}

interface PlaywrightSuite {
  title?: string;
  file?: string;
  tests?: JSONTestResult[];
  specs?: PlaywrightSpec[];
  suites?: PlaywrightSuite[];
}

interface JSONReport {
  testResults?: Array<{
    testFilePath?: string;
    testResults?: JSONTestResult[];
    assertionResults?: JSONTestResult[];
  }>;
  results?: JSONTestResult[];
  tests?: JSONTestResult[];
  suites?: PlaywrightSuite[];
}

export function parseJSONReport(jsonContent: string): TestCase[] {
  const testCases: TestCase[] = [];

  try {
    const parsed: JSONReport = JSON.parse(jsonContent);

    // Jest format
    if (parsed.testResults && Array.isArray(parsed.testResults)) {
      for (const suite of parsed.testResults) {
        const filePath = suite.testFilePath || "";
        const results = suite.testResults || suite.assertionResults || [];

        for (const tc of results) {
          testCases.push({
            name: tc.fullName || tc.title || tc.name || "unknown",
            filePath: tc.filePath || filePath,
            status: normalizeStatus(tc.status || "passed"),
            durationMs: tc.duration || tc.time || 0,
          });
        }
      }
      return testCases;
    }

    // Mocha JSON format
    if (parsed.tests && Array.isArray(parsed.tests)) {
      for (const tc of parsed.tests) {
        testCases.push({
          name: tc.fullTitle || tc.title || tc.name || "unknown",
          filePath: tc.file || tc.filePath || "",
          status: normalizeStatus(tc.state || tc.status || "passed"),
          durationMs: tc.duration || tc.time || 0,
        });
      }
      return testCases;
    }

    // Flat results array
    if (parsed.results && Array.isArray(parsed.results)) {
      for (const tc of parsed.results) {
        testCases.push({
          name: tc.fullTitle || tc.title || tc.name || "unknown",
          filePath: tc.file || tc.filePath || "",
          status: normalizeStatus(tc.state || tc.status || "passed"),
          durationMs: tc.duration || tc.time || 0,
        });
      }
      return testCases;
    }

    // Playwright JSON format (nested suites)
    if (parsed.suites && Array.isArray(parsed.suites)) {
      extractPlaywrightSuites(parsed.suites, testCases);
      return testCases;
    }
  } catch (err) {
    throw new Error(
      `Failed to parse JSON report: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return testCases;
}

function extractPlaywrightSuites(
  suites: PlaywrightSuite[],
  results: TestCase[]
): void {
  for (const suite of suites) {
    // Handle direct tests on suite (some Playwright versions)
    if (suite.tests) {
      for (const tc of suite.tests) {
        const lastResult = tc.results?.[tc.results.length - 1];
        results.push({
          name: tc.title || tc.name || "unknown",
          filePath: suite.file || tc.file || tc.filePath || "",
          status: tc.ok
            ? "pass"
            : normalizeStatus(lastResult?.status || "failed"),
          durationMs: lastResult?.duration || tc.duration || 0,
        });
      }
    }
    // Handle Playwright specs format: suites[] -> specs[] -> tests[] -> results[]
    if (suite.specs) {
      for (const spec of suite.specs) {
        if (spec.tests && Array.isArray(spec.tests)) {
          for (const tc of spec.tests) {
            const lastResult = tc.results?.[tc.results.length - 1];
            const projectName = tc.projectName ? `[${tc.projectName}] ` : "";
            results.push({
              name: projectName + (spec.title || tc.title || "unknown"),
              filePath: spec.file || suite.file || "",
              status: tc.status === "expected"
                ? "pass"
                : tc.status === "skipped"
                  ? "skip"
                  : normalizeStatus(lastResult?.status || "failed"),
              durationMs: lastResult?.duration || 0,
            });
          }
        } else {
          // spec without nested tests (flat format)
          results.push({
            name: spec.title || "unknown",
            filePath: spec.file || suite.file || "",
            status: spec.ok
              ? "pass"
              : normalizeStatus(spec.status || "failed"),
            durationMs: spec.duration || 0,
          });
        }
      }
    }
    if (suite.suites) {
      extractPlaywrightSuites(suite.suites, results);
    }
  }
}

function normalizeStatus(status: string): "pass" | "fail" | "skip" {
  const s = status.toLowerCase();
  if (s === "passed" || s === "pass" || s === "success" || s === "ok") {
    return "pass";
  }
  if (
    s === "failed" ||
    s === "fail" ||
    s === "error" ||
    s === "broken" ||
    s === "timedout"
  ) {
    return "fail";
  }
  if (
    s === "skipped" ||
    s === "skip" ||
    s === "pending" ||
    s === "disabled" ||
    s === "todo"
  ) {
    return "skip";
  }
  return "fail";
}
