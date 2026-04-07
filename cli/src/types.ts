export interface TestCase {
  name: string;
  filePath: string;
  status: "pass" | "fail" | "skip";
  durationMs: number;
}

export interface RunResult {
  runIndex: number;
  testCases: TestCase[];
  exitCode: number;
}

export interface FlakeReport {
  testName: string;
  filePath: string;
  passRate: number;
  totalRuns: number;
  passCount: number;
  failCount: number;
}

export interface AnalysisResult {
  flakeScore: number;
  totalTests: number;
  stableTests: number;
  flakyTests: number;
  failingTests: number;
  details: FlakeReport[];
}

export interface CLIOptions {
  command: string;
  runs: number;
  push: boolean;
  token?: string;
  format: "junit" | "json" | "auto";
  failThreshold?: number;
  verbose: boolean;
}
