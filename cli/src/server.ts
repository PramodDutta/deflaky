import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import chalk from "chalk";
import { generateDashboardHTML } from "./dashboard.js";
import type { SavedRunData } from "./types.js";

const DATA_DIR = ".deflaky";
const DATA_FILE = "last-run.json";

function loadLastRun(): SavedRunData | null {
  const filePath = join(process.cwd(), DATA_DIR, DATA_FILE);
  if (!existsSync(filePath)) {
    return null;
  }
  try {
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as SavedRunData;
  } catch {
    return null;
  }
}

async function fetchAIAnalysis(data: SavedRunData, token: string): Promise<string | undefined> {
  const flakyTests = data.result.details.filter(
    (d) => d.passRate > 0 && d.passRate < 100
  );

  if (flakyTests.length === 0) {
    return undefined;
  }

  const payload = JSON.stringify({
    command: data.command,
    flakeScore: data.result.flakeScore,
    flakyTests: flakyTests.map((t) => ({
      testName: t.testName,
      filePath: t.filePath,
      passRate: t.passRate,
      passCount: t.passCount,
      failCount: t.failCount,
      totalRuns: t.totalRuns,
    })),
  });

  return new Promise<string | undefined>((resolve) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const https = require("node:https");
      const url = new URL("https://deflaky.com/api/analyze");

      const req = https.request(
        url.toString(),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
            Authorization: `Bearer ${token}`,
            "User-Agent": "deflaky-cli/1.0.0",
          },
        },
        (res: { statusCode?: number; on: (event: string, cb: (data?: Buffer) => void) => void }) => {
          let body = "";
          res.on("data", (chunk?: Buffer) => {
            if (chunk) body += chunk.toString();
          });
          res.on("end", () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              try {
                const parsed = JSON.parse(body);
                resolve(parsed.analysis || parsed.message || body);
              } catch {
                resolve(body);
              }
            } else {
              resolve(undefined);
            }
          });
        }
      );

      req.on("error", () => {
        resolve(undefined);
      });

      req.write(payload);
      req.end();
    } catch {
      resolve(undefined);
    }
  });
}

export async function startServer(port: number, token?: string): Promise<void> {
  const data = loadLastRun();

  if (!data) {
    console.error(
      chalk.red(
        "  Error: No previous run data found. Run `deflaky run -c \"<your test command>\" -r <runs>` first."
      )
    );
    console.error(
      chalk.gray("  Expected data file at: " + join(process.cwd(), DATA_DIR, DATA_FILE))
    );
    process.exit(1);
  }

  // Attempt AI analysis if token is provided
  let aiAnalysis: string | undefined;
  if (token) {
    console.log(chalk.gray("  Fetching AI root cause analysis..."));
    aiAnalysis = await fetchAIAnalysis(data, token);
    if (aiAnalysis) {
      console.log(chalk.green("  AI analysis loaded."));
    } else {
      console.log(chalk.yellow("  Could not fetch AI analysis. Serving without it."));
    }
  }

  const html = generateDashboardHTML(data, aiAnalysis);

  const server = createServer((_req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
    });
    res.end(html);
  });

  server.listen(port, () => {
    console.log("");
    console.log(
      chalk.green.bold(`  \u{1F680} DeFlaky Dashboard running at http://localhost:${port}`)
    );
    console.log(chalk.gray("  Press Ctrl+C to stop"));
    console.log("");
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        chalk.red(`  Error: Port ${port} is already in use. Try a different port with --port.`)
      );
    } else {
      console.error(chalk.red(`  Server error: ${err.message}`));
    }
    process.exit(1);
  });
}
