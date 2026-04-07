import chalk from "chalk";
import Table from "cli-table3";
import type { AnalysisResult } from "./types.js";

export function printReport(result: AnalysisResult, verbose: boolean): void {
  console.log("");
  console.log(chalk.bold("━".repeat(60)));
  console.log(chalk.bold("  DeFlaky - Flaky Test Report"));
  console.log(chalk.bold("━".repeat(60)));
  console.log("");

  // Summary
  console.log(chalk.bold("  Summary"));
  console.log(`  Total tests:    ${chalk.white.bold(result.totalTests)}`);
  console.log(`  Stable tests:   ${chalk.green.bold(result.stableTests)}`);
  console.log(`  Flaky tests:    ${chalk.yellow.bold(result.flakyTests)}`);
  console.log(`  Failing tests:  ${chalk.red.bold(result.failingTests)}`);
  console.log("");

  // FlakeScore
  const score = result.flakeScore;
  const scoreColor =
    score > 90 ? chalk.green : score > 70 ? chalk.yellow : chalk.red;
  const scoreBar = buildScoreBar(score);

  console.log(
    `  FlakeScore:     ${scoreColor.bold(score.toFixed(1) + "%")}  ${scoreBar}`
  );
  console.log("");

  // Flaky tests table
  const flakyDetails = result.details.filter(
    (d) => d.passRate > 0 && d.passRate < 100
  );
  if (flakyDetails.length > 0) {
    console.log(chalk.bold.yellow("  Flaky Tests"));
    console.log("");

    const table = new Table({
      head: [
        chalk.white.bold("Test"),
        chalk.white.bold("File"),
        chalk.white.bold("Pass Rate"),
        chalk.white.bold("Pass"),
        chalk.white.bold("Fail"),
        chalk.white.bold("Runs"),
      ],
      colWidths: [30, 25, 12, 7, 7, 7],
      style: { head: [], border: ["gray"] },
      wordWrap: true,
    });

    for (const detail of flakyDetails) {
      const rateColor =
        detail.passRate > 80
          ? chalk.yellow
          : detail.passRate > 50
            ? chalk.hex("#FFA500")
            : chalk.red;

      table.push([
        truncate(detail.testName, 28),
        truncate(detail.filePath, 23),
        rateColor.bold(`${detail.passRate.toFixed(0)}%`),
        chalk.green(String(detail.passCount)),
        chalk.red(String(detail.failCount)),
        String(detail.totalRuns),
      ]);
    }

    console.log(table.toString());
    console.log("");
  }

  // Failing tests table
  const failingDetails = result.details.filter((d) => d.passRate === 0);
  if (failingDetails.length > 0 && verbose) {
    console.log(chalk.bold.red("  Consistently Failing Tests"));
    console.log("");

    const table = new Table({
      head: [
        chalk.white.bold("Test"),
        chalk.white.bold("File"),
        chalk.white.bold("Runs"),
      ],
      colWidths: [35, 30, 7],
      style: { head: [], border: ["gray"] },
      wordWrap: true,
    });

    for (const detail of failingDetails) {
      table.push([
        truncate(detail.testName, 33),
        truncate(detail.filePath, 28),
        String(detail.totalRuns),
      ]);
    }

    console.log(table.toString());
    console.log("");
  }

  // No flaky tests message
  if (flakyDetails.length === 0 && result.totalTests > 0) {
    console.log(
      chalk.green.bold("  No flaky tests detected! All tests are stable.")
    );
    console.log("");
  }

  if (result.totalTests === 0) {
    console.log(
      chalk.yellow(
        "  No test results found. Make sure your test command generates report files."
      )
    );
    console.log(
      chalk.yellow(
        "  Supported formats: JUnit XML, Jest JSON, Mocha JSON, Playwright JSON"
      )
    );
    console.log("");
  }

  console.log(chalk.bold("━".repeat(60)));
  console.log("");
}

function buildScoreBar(score: number): string {
  const total = 20;
  const filled = Math.round((score / 100) * total);
  const empty = total - filled;
  const color = score > 90 ? chalk.green : score > 70 ? chalk.yellow : chalk.red;
  return color("█".repeat(filled)) + chalk.gray("░".repeat(empty));
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "…";
}
