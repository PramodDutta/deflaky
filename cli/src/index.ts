import { Command } from "commander";
import chalk from "chalk";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { executeRuns } from "./runner.js";
import { analyzeResults } from "./analyzer.js";
import { printReport } from "./reporter.js";
import { pushResults } from "./push.js";
import { startServer } from "./server.js";
import type { CLIOptions, SavedRunData } from "./types.js";

const DATA_DIR = ".deflaky";
const DATA_FILE = "last-run.json";

function saveRunData(data: SavedRunData): void {
  const dirPath = join(process.cwd(), DATA_DIR);
  mkdirSync(dirPath, { recursive: true });
  const filePath = join(dirPath, DATA_FILE);
  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

const program = new Command();

program
  .name("deflaky")
  .description("Detect flaky tests by running your test suite multiple times")
  .version("1.0.0");

// Main command (default action)
program
  .command("run", { isDefault: true })
  .description("Run tests multiple times and detect flaky tests")
  .requiredOption("-c, --command <cmd>", "Test command to run")
  .option("-r, --runs <number>", "Number of iterations", "5")
  .option("--push", "Send results to DeFlaky dashboard", false)
  .option(
    "-t, --token <token>",
    "API token (or set DEFLAKY_TOKEN env variable)"
  )
  .option(
    "--format <format>",
    "Report format: junit, json, or auto",
    "auto"
  )
  .option(
    "--fail-threshold <number>",
    "Fail if FlakeScore is below this value"
  )
  .option("--verbose", "Show detailed output", false)
  .action(async (opts) => {
    const options: CLIOptions = {
      command: opts.command,
      runs: parseInt(opts.runs, 10),
      push: opts.push,
      token: opts.token || process.env.DEFLAKY_TOKEN,
      format: opts.format as "junit" | "json" | "auto",
      failThreshold: opts.failThreshold
        ? parseFloat(opts.failThreshold)
        : undefined,
      verbose: opts.verbose,
    };

    // Validate
    if (isNaN(options.runs) || options.runs < 1) {
      console.error(chalk.red("Error: --runs must be a positive integer"));
      process.exit(1);
    }

    if (!["junit", "json", "auto"].includes(options.format)) {
      console.error(
        chalk.red("Error: --format must be one of: junit, json, auto")
      );
      process.exit(1);
    }

    if (options.push && !options.token) {
      console.error(
        chalk.red(
          "Error: --token or DEFLAKY_TOKEN env variable is required when using --push"
        )
      );
      process.exit(1);
    }

    // Header
    console.log("");
    console.log(
      chalk.bold.cyan("  DeFlaky") +
        chalk.gray(" - Flaky Test Detector v1.0.0")
    );
    console.log(
      chalk.gray(`  Running "${options.command}" x${options.runs} times`)
    );
    console.log("");

    // Execute runs
    const startTime = Date.now();
    const runs = executeRuns(
      options.command,
      options.runs,
      options.format,
      options.verbose
    );
    const totalDurationMs = Date.now() - startTime;

    // Analyze
    const result = analyzeResults(runs);

    // Report
    printReport(result, options.verbose);

    // Save results to .deflaky/last-run.json
    try {
      const savedData: SavedRunData = {
        command: options.command,
        date: new Date().toISOString(),
        runs: options.runs,
        totalDurationMs,
        result,
      };
      saveRunData(savedData);
      console.log(
        chalk.gray(`  Results saved to ${join(DATA_DIR, DATA_FILE)}`)
      );
      console.log(
        chalk.gray("  Run `deflaky serve` to view the dashboard")
      );
      console.log("");
    } catch (err) {
      if (options.verbose) {
        console.error(
          chalk.yellow(
            `  Warning: Could not save results: ${err instanceof Error ? err.message : String(err)}`
          )
        );
      }
    }

    // Push to dashboard
    if (options.push && options.token) {
      try {
        console.log(chalk.gray("  Pushing results to DeFlaky dashboard..."));
        await pushResults(result, runs, options.command, options.token, options.verbose);
        console.log(
          chalk.green.bold("  Results pushed successfully!")
        );
        console.log("");
      } catch (err) {
        console.error(
          chalk.red(
            `  Failed to push results: ${err instanceof Error ? err.message : String(err)}`
          )
        );
        console.log("");
      }
    }

    // Threshold check
    if (
      options.failThreshold !== undefined &&
      result.flakeScore < options.failThreshold
    ) {
      console.error(
        chalk.red.bold(
          `  FlakeScore ${result.flakeScore.toFixed(1)}% is below threshold ${options.failThreshold}%`
        )
      );
      console.log("");
      process.exit(1);
    }
  });

// Serve command
program
  .command("serve")
  .description("Start a local dashboard to view the last run results")
  .option("-p, --port <number>", "Port to serve on", "3333")
  .option(
    "-t, --token <token>",
    "API token for AI analysis (or set DEFLAKY_TOKEN env variable)"
  )
  .action(async (opts) => {
    const port = parseInt(opts.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      console.error(chalk.red("Error: --port must be a valid port number (1-65535)"));
      process.exit(1);
    }

    const token = opts.token || process.env.DEFLAKY_TOKEN;
    await startServer(port, token);
  });

program.parse();
