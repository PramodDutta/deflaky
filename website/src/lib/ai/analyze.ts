import type { AIConfig, AIAnalysisRequest, AIRootCauseResult, AIFailureCategoryResult } from "./types";
import { createAIProvider } from "./factory";
import { SYSTEM_PROMPT_ROOT_CAUSE, SYSTEM_PROMPT_CATEGORIZE, buildRootCausePrompt, buildCategorizationPrompt } from "./prompts";

function parseJSON<T>(text: string): T {
  // Try to extract JSON from markdown code blocks if present
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();
  return JSON.parse(jsonStr) as T;
}

export async function analyzeRootCause(
  config: AIConfig,
  request: AIAnalysisRequest
): Promise<AIRootCauseResult> {
  const provider = createAIProvider(config);
  const prompt = buildRootCausePrompt(request);

  const response = await provider.analyze(prompt, SYSTEM_PROMPT_ROOT_CAUSE);

  try {
    return parseJSON<AIRootCauseResult>(response);
  } catch {
    return {
      category: "unknown",
      confidence: 0,
      rootCause: "Failed to parse AI response",
      explanation: response,
    };
  }
}

export async function categorizeFailure(
  config: AIConfig,
  request: AIAnalysisRequest
): Promise<AIFailureCategoryResult> {
  const provider = createAIProvider(config);
  const prompt = buildCategorizationPrompt(request);

  const response = await provider.analyze(prompt, SYSTEM_PROMPT_CATEGORIZE);

  try {
    return parseJSON<AIFailureCategoryResult>(response);
  } catch {
    return {
      category: "unknown",
      confidence: 0,
      reasoning: response,
    };
  }
}
