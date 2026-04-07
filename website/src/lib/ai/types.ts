export type AIProvider = "anthropic" | "openai" | "groq" | "openrouter" | "ollama";

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  baseUrl?: string; // For OpenRouter/Ollama custom endpoints
}

export interface AIAnalysisRequest {
  testName: string;
  filePath: string;
  errorMessage: string;
  stackTrace: string;
  testCode?: string;
  previousResults?: Array<{ runIndex: number; status: "pass" | "fail" | "skip" }>;
  framework?: string;
}

export interface AIRootCauseResult {
  category: "infrastructure" | "application_bug" | "test_code" | "environment" | "flaky" | "unknown";
  confidence: number; // 0-100
  rootCause: string;
  explanation: string;
  suggestedFix?: string;
  codeSnippet?: string;
}

export interface AIFailureCategoryResult {
  category: "infrastructure" | "application_bug" | "test_code" | "environment" | "flaky" | "unknown";
  confidence: number;
  reasoning: string;
  similarPatterns?: string[];
}

export interface AIProviderInterface {
  analyze(prompt: string, systemPrompt: string): Promise<string>;
  getDefaultModel(): string;
  getAvailableModels(): string[];
}

export const PROVIDER_MODELS: Record<AIProvider, string[]> = {
  anthropic: ["claude-sonnet-4-20250514", "claude-haiku-4-20250414", "claude-opus-4-20250514"],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o3-mini"],
  groq: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"],
  openrouter: ["anthropic/claude-sonnet-4-20250514", "openai/gpt-4o", "meta-llama/llama-3.3-70b-instruct"],
  ollama: ["llama3.2", "codellama", "mistral", "phi3"],
};
