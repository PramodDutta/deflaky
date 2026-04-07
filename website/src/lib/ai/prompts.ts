export const SYSTEM_PROMPT_ROOT_CAUSE = `You are DeFlaky AI, an expert test failure analyst. You analyze test failures to determine their root cause and provide actionable fixes.

You MUST respond in valid JSON with this exact structure:
{
  "category": "infrastructure" | "application_bug" | "test_code" | "environment" | "flaky" | "unknown",
  "confidence": <number 0-100>,
  "rootCause": "<one-line summary>",
  "explanation": "<detailed explanation of what went wrong and why>",
  "suggestedFix": "<specific code or configuration change to fix this>",
  "codeSnippet": "<optional fixed code snippet>"
}

Category definitions:
- infrastructure: CI runner issues, Docker problems, resource limits, network failures in CI
- application_bug: Real bug in the application code that the test correctly caught
- test_code: Bug in the test itself — wrong assertion, bad selector, missing setup
- environment: Environment-specific issues — timezone, locale, OS differences, missing env vars
- flaky: Non-deterministic — timing races, random data, shared state, order-dependent
- unknown: Cannot determine with available information

Be specific and actionable. Reference exact lines and variables when possible.`;

export const SYSTEM_PROMPT_CATEGORIZE = `You are DeFlaky AI, an expert at classifying test failures. Given a test failure, classify it into one of these categories.

You MUST respond in valid JSON with this exact structure:
{
  "category": "infrastructure" | "application_bug" | "test_code" | "environment" | "flaky" | "unknown",
  "confidence": <number 0-100>,
  "reasoning": "<why you chose this category>",
  "similarPatterns": ["<pattern 1>", "<pattern 2>"]
}

Key signals:
- Timeout errors → often infrastructure or flaky
- Element not found → test_code (bad selector) or flaky (timing)
- Assertion mismatch with correct logic → application_bug
- Connection refused / ECONNRESET → infrastructure
- Works locally but fails in CI → environment
- Passes sometimes, fails sometimes → flaky
- Different results across runs → flaky`;

export function buildRootCausePrompt(request: {
  testName: string;
  filePath: string;
  errorMessage: string;
  stackTrace: string;
  testCode?: string;
  previousResults?: Array<{ runIndex: number; status: string }>;
  framework?: string;
}): string {
  let prompt = `Analyze this test failure:

**Test Name:** ${request.testName}
**File:** ${request.filePath}
**Framework:** ${request.framework || "Unknown"}

**Error Message:**
\`\`\`
${request.errorMessage}
\`\`\`

**Stack Trace:**
\`\`\`
${request.stackTrace}
\`\`\``;

  if (request.testCode) {
    prompt += `\n\n**Test Source Code:**\n\`\`\`\n${request.testCode}\n\`\`\``;
  }

  if (request.previousResults && request.previousResults.length > 0) {
    const passCount = request.previousResults.filter(r => r.status === "pass").length;
    const failCount = request.previousResults.filter(r => r.status === "fail").length;
    prompt += `\n\n**Historical Results:** ${passCount} passes, ${failCount} failures across ${request.previousResults.length} runs`;
    prompt += `\n(${((passCount / request.previousResults.length) * 100).toFixed(1)}% pass rate)`;
  }

  prompt += `\n\nProvide your root cause analysis as JSON.`;
  return prompt;
}

export function buildCategorizationPrompt(request: {
  testName: string;
  filePath: string;
  errorMessage: string;
  stackTrace: string;
  previousResults?: Array<{ runIndex: number; status: string }>;
}): string {
  let prompt = `Categorize this test failure:

**Test:** ${request.testName}
**File:** ${request.filePath}

**Error:**
\`\`\`
${request.errorMessage}
\`\`\`

**Stack Trace:**
\`\`\`
${request.stackTrace}
\`\`\``;

  if (request.previousResults && request.previousResults.length > 0) {
    const passCount = request.previousResults.filter(r => r.status === "pass").length;
    const failCount = request.previousResults.filter(r => r.status === "fail").length;
    prompt += `\n\n**Run History:** ${passCount}/${request.previousResults.length} passed (${((passCount / request.previousResults.length) * 100).toFixed(1)}% pass rate)`;
  }

  prompt += `\n\nClassify this failure as JSON.`;
  return prompt;
}
