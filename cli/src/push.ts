import { URL } from "node:url";
import type { AnalysisResult, RunResult } from "./types.js";

const DEFAULT_API_URL = "https://deflaky.com/api/push";

interface ApiPayload {
  command: string;
  iterations: number;
  totalTests: number;
  flakeScore: number;
  testResults: Array<{
    testName: string;
    filePath: string;
    status: "pass" | "fail" | "skip";
    durationMs: number;
    runIndex: number;
  }>;
}

export async function pushResults(
  result: AnalysisResult,
  runs: RunResult[],
  command: string,
  token: string,
  verbose: boolean,
  apiUrl?: string
): Promise<void> {
  const url = new URL(apiUrl || DEFAULT_API_URL);

  // Build testResults from individual runs
  const testResults: ApiPayload["testResults"] = [];
  for (const run of runs) {
    for (const tc of run.testCases) {
      testResults.push({
        testName: tc.name,
        filePath: tc.filePath,
        status: tc.status,
        durationMs: tc.durationMs,
        runIndex: run.runIndex,
      });
    }
  }

  const payload: ApiPayload = {
    command,
    iterations: runs.length,
    totalTests: result.totalTests,
    flakeScore: result.flakeScore,
    testResults,
  };

  const body = JSON.stringify(payload);

  if (verbose) {
    console.log(`Pushing results to ${url.toString()}`);
    console.log(`Payload size: ${body.length} bytes`);
  }

  return new Promise<void>((resolve, reject) => {
    const protocol = url.protocol === "https:" ? require("node:https") : require("node:http");

    const req = protocol.request(
      url.toString(),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          Authorization: `Bearer ${token}`,
          "User-Agent": "deflaky-cli/1.0.0",
        },
      },
      (res: { statusCode?: number; on: (event: string, cb: (data?: Buffer) => void) => void }) => {
        let responseBody = "";
        res.on("data", (chunk?: Buffer) => {
          if (!chunk) return;
          responseBody += chunk.toString();
        });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            if (verbose) {
              console.log(`Push successful (${res.statusCode}): ${responseBody}`);
            }
            resolve();
          } else {
            reject(
              new Error(
                `Push failed with status ${res.statusCode}: ${responseBody}`
              )
            );
          }
        });
      }
    );

    req.on("error", (err: Error) => {
      reject(new Error(`Push failed: ${err.message}`));
    });

    req.write(body);
    req.end();
  });
}
