import { db } from "@/lib/db";
import { projects, testRuns, testResults } from "@/lib/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    if (!projectId || typeof projectId !== "string") {
      return Response.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    // Parse testName from query params
    const url = new URL(request.url);
    const testName = url.searchParams.get("testName");

    if (!testName) {
      return Response.json(
        { error: "testName query parameter is required" },
        { status: 400 }
      );
    }

    // Verify project exists
    const matchedProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (matchedProjects.length === 0) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    // Get last 30 test runs for this project, newest first
    const runs = await db
      .select({
        id: testRuns.id,
        command: testRuns.command,
        iterations: testRuns.iterations,
        createdAt: testRuns.createdAt,
      })
      .from(testRuns)
      .where(eq(testRuns.projectId, projectId))
      .orderBy(desc(testRuns.createdAt))
      .limit(30);

    if (runs.length === 0) {
      return Response.json({
        testName,
        history: [],
        trend: {
          direction: "stable" as const,
          avgPassRate: 0,
          firstPassRate: 0,
          lastPassRate: 0,
        },
      });
    }

    const runIds = runs.map((r) => r.id);

    // Get all test results for the matching test name across these runs
    const results = await db
      .select({
        id: testResults.id,
        testRunId: testResults.testRunId,
        status: testResults.status,
        durationMs: testResults.durationMs,
        runIndex: testResults.runIndex,
      })
      .from(testResults)
      .where(
        and(
          inArray(testResults.testRunId, runIds),
          eq(testResults.testName, testName)
        )
      );

    // Group results by testRunId
    const resultsByRun = new Map<
      string,
      Array<{ runIndex: number; status: string; durationMs: number | null }>
    >();
    for (const r of results) {
      if (!resultsByRun.has(r.testRunId)) {
        resultsByRun.set(r.testRunId, []);
      }
      resultsByRun.get(r.testRunId)!.push({
        runIndex: r.runIndex,
        status: r.status,
        durationMs: r.durationMs,
      });
    }

    // Build history entries (only for runs that have results for this test)
    const history = runs
      .filter((run) => resultsByRun.has(run.id))
      .map((run) => {
        const runResults = resultsByRun.get(run.id)!;
        runResults.sort((a, b) => a.runIndex - b.runIndex);

        const passCount = runResults.filter((r) => r.status === "pass").length;
        const failCount = runResults.filter((r) => r.status === "fail").length;
        const total = runResults.length;
        const passRate = total > 0 ? Math.round((passCount / total) * 100) : 0;

        return {
          runId: run.id,
          runDate: run.createdAt,
          command: run.command,
          iterations: run.iterations,
          results: runResults.map((r) => ({
            runIndex: r.runIndex,
            status: r.status,
            durationMs: r.durationMs,
          })),
          passRate,
          passCount,
          failCount,
        };
      });

    // Compute trend
    let direction: "improving" | "degrading" | "stable" = "stable";
    let avgPassRate = 0;
    let firstPassRate = 0;
    let lastPassRate = 0;

    if (history.length > 0) {
      const passRates = history.map((h) => h.passRate);
      avgPassRate =
        Math.round(
          (passRates.reduce((sum, r) => sum + r, 0) / passRates.length) * 10
        ) / 10;

      // history is newest-first, so last element is chronologically first
      lastPassRate = passRates[0]; // newest
      firstPassRate = passRates[passRates.length - 1]; // oldest

      const diff = lastPassRate - firstPassRate;
      if (diff >= 10) {
        direction = "improving";
      } else if (diff <= -10) {
        direction = "degrading";
      } else {
        direction = "stable";
      }
    }

    return Response.json({
      testName,
      history,
      trend: {
        direction,
        avgPassRate,
        firstPassRate,
        lastPassRate,
      },
    });
  } catch (error) {
    console.error("Test history API error:", error);

    const message = error instanceof Error ? error.message : "";
    if (message.includes("invalid input syntax")) {
      return Response.json(
        { error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
