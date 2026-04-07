import { execSync } from "node:child_process";
import { existsSync, readdirSync, statSync, readFileSync } from "node:fs";
import { join, extname } from "node:path";
import type { RunResult, TestCase } from "./types.js";
import { parseJUnitXML, parseJSONReport } from "./parser.js";

const REPORT_SEARCH_DIRS = [
  "test-results",
  "reports",
  "build/reports",
  "build/test-results",
  "target/surefire-reports",
  "target/failsafe-reports",
  "junit-reports",
  "coverage",
  "results",
  "output",
  ".test-results",
];

function findReportFiles(baseDir: string): string[] {
  const found: string[] = [];

  for (const dir of REPORT_SEARCH_DIRS) {
    const fullPath = join(baseDir, dir);
    if (existsSync(fullPath)) {
      collectFiles(fullPath, found);
    }
  }

  // Also check for report files in the base directory itself
  try {
    const entries = readdirSync(baseDir);
    for (const entry of entries) {
      const fullPath = join(baseDir, entry);
      if (isReportFile(entry) && statSync(fullPath).isFile()) {
        found.push(fullPath);
      }
    }
  } catch {
    // ignore read errors
  }

  return found;
}

function collectFiles(dir: string, results: string[]): void {
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        collectFiles(fullPath, results);
      } else if (isReportFile(entry)) {
        results.push(fullPath);
      }
    }
  } catch {
    // ignore permission errors etc.
  }
}

function isReportFile(filename: string): boolean {
  const ext = extname(filename).toLowerCase();
  if (ext === ".xml") {
    // Match common JUnit XML naming patterns
    return (
      filename.includes("junit") ||
      filename.includes("test") ||
      filename.includes("TEST-") ||
      filename.includes("surefire") ||
      filename.includes("results")
    );
  }
  if (ext === ".json") {
    return (
      filename.includes("test") ||
      filename.includes("result") ||
      filename.includes("report")
    );
  }
  return false;
}

function parseReportFile(
  filePath: string,
  format: "junit" | "json" | "auto"
): TestCase[] {
  const content = readFileSync(filePath, "utf-8");
  const ext = extname(filePath).toLowerCase();

  if (format === "junit" || (format === "auto" && ext === ".xml")) {
    return parseJUnitXML(content);
  }

  if (format === "json" || (format === "auto" && ext === ".json")) {
    return parseJSONReport(content);
  }

  // Auto-detect: try XML first, then JSON
  if (format === "auto") {
    if (content.trimStart().startsWith("<")) {
      return parseJUnitXML(content);
    }
    try {
      return parseJSONReport(content);
    } catch {
      return parseJUnitXML(content);
    }
  }

  return [];
}

export function executeRuns(
  command: string,
  runs: number,
  format: "junit" | "json" | "auto",
  verbose: boolean
): RunResult[] {
  const results: RunResult[] = [];
  const cwd = process.cwd();

  for (let i = 0; i < runs; i++) {
    if (verbose) {
      console.log(`\n--- Run ${i + 1}/${runs} ---`);
      console.log(`Executing: ${command}`);
    }

    let exitCode = 0;
    try {
      execSync(command, {
        cwd,
        stdio: verbose ? "inherit" : "pipe",
        env: { ...process.env },
        timeout: 300_000, // 5 minute timeout per run
      });
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "status" in err &&
        typeof (err as { status: unknown }).status === "number"
      ) {
        exitCode = (err as { status: number }).status;
      } else {
        exitCode = 1;
      }
      if (verbose) {
        console.log(`Run ${i + 1} exited with code ${exitCode}`);
      }
    }

    // Find and parse report files
    const reportFiles = findReportFiles(cwd);
    const testCases: TestCase[] = [];

    if (verbose && reportFiles.length > 0) {
      console.log(`Found ${reportFiles.length} report file(s):`);
      for (const f of reportFiles) {
        console.log(`  - ${f}`);
      }
    }

    for (const reportFile of reportFiles) {
      try {
        const cases = parseReportFile(reportFile, format);
        testCases.push(...cases);
      } catch (err) {
        if (verbose) {
          console.error(`Failed to parse ${reportFile}:`, err);
        }
      }
    }

    if (testCases.length === 0 && verbose) {
      console.log(
        "No test report files found. Ensure your test framework generates JUnit XML or JSON reports."
      );
    }

    results.push({
      runIndex: i,
      testCases,
      exitCode,
    });
  }

  return results;
}
