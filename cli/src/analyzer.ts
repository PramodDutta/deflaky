import type { RunResult, FlakeReport, AnalysisResult } from "./types.js";

export function analyzeResults(runs: RunResult[]): AnalysisResult {
  // Group test cases by name across all runs
  const testMap = new Map<
    string,
    { filePath: string; results: Array<"pass" | "fail" | "skip"> }
  >();

  for (const run of runs) {
    for (const tc of run.testCases) {
      const key = tc.name;
      if (!testMap.has(key)) {
        testMap.set(key, { filePath: tc.filePath, results: [] });
      }
      testMap.get(key)!.results.push(tc.status);
    }
  }

  const details: FlakeReport[] = [];
  let stableTests = 0;
  let flakyTests = 0;
  let failingTests = 0;

  for (const [testName, data] of testMap) {
    // Exclude skipped-only tests from analysis
    const nonSkippedResults = data.results.filter((r) => r !== "skip");
    if (nonSkippedResults.length === 0) continue;

    const passCount = nonSkippedResults.filter((r) => r === "pass").length;
    const failCount = nonSkippedResults.filter((r) => r === "fail").length;
    const totalRuns = nonSkippedResults.length;
    const passRate = (passCount / totalRuns) * 100;

    const report: FlakeReport = {
      testName,
      filePath: data.filePath,
      passRate,
      totalRuns,
      passCount,
      failCount,
    };

    if (passRate === 100) {
      stableTests++;
    } else if (passRate === 0) {
      failingTests++;
    } else {
      flakyTests++;
    }

    details.push(report);
  }

  const totalTests = stableTests + flakyTests + failingTests;
  const flakeScore = totalTests > 0 ? (stableTests / totalTests) * 100 : 100;

  // Sort details: flaky first (sorted by pass rate ascending), then failing, then stable
  details.sort((a, b) => {
    const aCategory =
      a.passRate === 100 ? 2 : a.passRate === 0 ? 1 : 0;
    const bCategory =
      b.passRate === 100 ? 2 : b.passRate === 0 ? 1 : 0;
    if (aCategory !== bCategory) return aCategory - bCategory;
    return a.passRate - b.passRate;
  });

  return {
    flakeScore,
    totalTests,
    stableTests,
    flakyTests,
    failingTests,
    details,
  };
}
