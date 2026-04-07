import type { AIConfig, AIProviderInterface } from "./types";
import { AnthropicProvider } from "./providers/anthropic";
import { OpenAIProvider } from "./providers/openai";
import { GroqProvider } from "./providers/groq";
import { OpenRouterProvider } from "./providers/openrouter";
import { OllamaProvider } from "./providers/ollama";

export function createAIProvider(config: AIConfig): AIProviderInterface {
  switch (config.provider) {
    case "anthropic":
      return new AnthropicProvider(config.apiKey, config.model);
    case "openai":
      return new OpenAIProvider(config.apiKey, config.model);
    case "groq":
      return new GroqProvider(config.apiKey, config.model);
    case "openrouter":
      return new OpenRouterProvider(config.apiKey, config.model);
    case "ollama":
      return new OllamaProvider(config.apiKey, config.model, config.baseUrl);
    default:
      throw new Error(`Unsupported AI provider: ${config.provider}`);
  }
}
