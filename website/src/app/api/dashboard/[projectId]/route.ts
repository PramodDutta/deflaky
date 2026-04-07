import { db } from "@/lib/db";
import { projects, testRuns, testResults } from "@/lib/db/schema";
import { eq, desc, gte, and, sql, inArray } from "drizzle-orm";

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

    // --- Fetch project ---
    const matchedProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (matchedProjects.length === 0) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    const project = matchedProjects[0];

    // --- Recent test runs (last 20) ---
    const recentRuns = await db
      .select()
      .from(testRuns)
      .where(eq(testRuns.projectId, projectId))
      .orderBy(desc(testRuns.createdAt))
      .limit(20);

    // --- Stats from the latest run ---
    const latestRun = recentRuns[0] ?? null;
    const latestFlakeScore = latestRun ? Number(latestRun.flakeScore ?? 0) : 0;
    const latestTotalTests = latestRun ? latestRun.totalTests : 0;

    // --- Flaky tests: tests that have both pass and fail results in the last 7 days ---
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get test run IDs from the last 7 days
    const recentRunIds = await db
      .select({ id: testRuns.id })
      .from(testRuns)
      .where(
        and(
          eq(testRuns.projectId, projectId),
          gte(testRuns.createdAt, sevenDaysAgo)
        )
      );

    let flakyTests: Array<{
      testName: string;
      filePath: string | null;
      passCount: number;
      failCount: number;
      skipCount: number;
      totalRuns: number;
      passRate: number;
    }> = [];
    let flakyCount = 0;
    let stableCount = 0;

    if (recentRunIds.length > 0) {
      const runIdValues = recentRunIds.map((r) => r.id);

      // Aggregate test results per test name for runs in the last 7 days
      const testAggregation = await db
        .select({
          testName: testResults.testName,
          filePath: testResults.filePath,
          passCount: sql<number>`count(*) filter (where ${testResults.status} = 'pass')`.as(
            "pass_count"
          ),
          failCount: sql<number>`count(*) filter (where ${testResults.status} = 'fail')`.as(
            "fail_count"
          ),
          skipCount: sql<number>`count(*) filter (where ${testResults.status} = 'skip')`.as(
            "skip_count"
          ),
          totalRuns: sql<number>`count(*)`.as("total_runs"),
        })
        .from(testResults)
        .where(inArray(testResults.testRunId, runIdValues))
        .groupBy(testResults.testName, testResults.filePath);

      flakyTests = testAggregation
        .filter((t) => Number(t.passCount) > 0 && Number(t.failCount) > 0)
        .map((t) => ({
          testName: t.testName,
          filePath: t.filePath,
          passCount: Number(t.passCount),
          failCount: Number(t.failCount),
          skipCount: Number(t.skipCount),
          totalRuns: Number(t.totalRuns),
          passRate:
            Number(t.totalRuns) > 0
              ? Math.round(
                  (Number(t.passCount) / Number(t.totalRuns)) * 100 * 100
                ) / 100
              : 0,
        }))
        .sort((a, b) => a.passRate - b.passRate); // most flaky first

      flakyCount = flakyTests.length;

      // Count distinct stable tests (only pass or only fail, never mixed)
      const allTestNames = new Set(testAggregation.map((t) => t.testName));
      stableCount = allTestNames.size - flakyCount;
    }

    return Response.json({
      project: {
        id: project.id,
        name: project.name,
        slug: project.slug,
        createdAt: project.createdAt,
      },
      stats: {
        flakeScore: latestFlakeScore,
        totalTests: latestTotalTests,
        flakyCount,
        stableCount,
      },
      recentRuns: recentRuns.map((run) => ({
        id: run.id,
        command: run.command,
        iterations: run.iterations,
        totalTests: run.totalTests,
        flakeScore: Number(run.flakeScore ?? 0),
        createdAt: run.createdAt,
      })),
      flakyTests,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);

    // Handle invalid UUID format
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
