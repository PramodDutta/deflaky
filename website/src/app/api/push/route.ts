import { db } from "@/lib/db";
import { projects, testRuns, testResults, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hasProAccess } from "@/lib/plan";

export async function POST(request: Request) {
  try {
    // --- Auth ---
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return Response.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const apiToken = authHeader.slice(7); // strip "Bearer "

    const matchedProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.apiToken, apiToken))
      .limit(1);

    if (matchedProjects.length === 0) {
      return Response.json({ error: "Invalid API token" }, { status: 401 });
    }

    const project = matchedProjects[0];

    // Check project owner has Pro access
    const [projectOwner] = await db
      .select()
      .from(users)
      .where(eq(users.id, project.userId))
      .limit(1);

    if (!projectOwner || !hasProAccess(projectOwner)) {
      return Response.json(
        { error: "Pro plan required. The project owner must upgrade to push results.", code: "PLAN_REQUIRED" },
        { status: 403 }
      );
    }

    // --- Parse & validate body ---
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { command, iterations, totalTests, flakeScore, testResults: results } =
      body as {
        command?: string;
        iterations?: number;
        totalTests?: number;
        flakeScore?: number;
        testResults?: Array<{
          testName?: string;
          filePath?: string;
          status?: string;
          durationMs?: number;
          runIndex?: number;
        }>;
      };

    if (!command || typeof command !== "string") {
      return Response.json(
        { error: "command is required and must be a string" },
        { status: 400 }
      );
    }
    if (!iterations || typeof iterations !== "number" || iterations < 1) {
      return Response.json(
        { error: "iterations is required and must be a positive number" },
        { status: 400 }
      );
    }
    if (!totalTests || typeof totalTests !== "number" || totalTests < 0) {
      return Response.json(
        { error: "totalTests is required and must be a non-negative number" },
        { status: 400 }
      );
    }
    if (!Array.isArray(results)) {
      return Response.json(
        { error: "testResults must be an array" },
        { status: 400 }
      );
    }
    if (results.length > 50000) {
      return Response.json(
        { error: "Too many test results (max 50,000 per push)" },
        { status: 400 }
      );
    }

    // Validate each test result
    const validStatuses = ["pass", "fail", "skip"];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (!r.testName || typeof r.testName !== "string") {
        return Response.json(
          { error: `testResults[${i}].testName is required` },
          { status: 400 }
        );
      }
      if (!r.status || !validStatuses.includes(r.status)) {
        return Response.json(
          { error: `testResults[${i}].status must be one of: ${validStatuses.join(", ")}` },
          { status: 400 }
        );
      }
      if (r.runIndex === undefined || typeof r.runIndex !== "number") {
        return Response.json(
          { error: `testResults[${i}].runIndex is required and must be a number` },
          { status: 400 }
        );
      }
    }

    // --- Insert test_run ---
    const [testRun] = await db
      .insert(testRuns)
      .values({
        projectId: project.id,
        command,
        iterations,
        totalTests,
        flakeScore: flakeScore !== undefined ? String(flakeScore) : null,
      })
      .returning({ id: testRuns.id });

    // --- Bulk insert test_results ---
    if (results.length > 0) {
      await db.insert(testResults).values(
        results.map((r) => ({
          testRunId: testRun.id,
          testName: r.testName!,
          filePath: r.filePath ?? null,
          status: r.status as "pass" | "fail" | "skip",
          durationMs: r.durationMs ?? null,
          runIndex: r.runIndex!,
        }))
      );
    }

    return Response.json({ success: true, testRunId: testRun.id });
  } catch (error) {
    console.error("Push API error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
