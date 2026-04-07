import type { AIProviderInterface } from "../types";

export class OpenRouterProvider implements AIProviderInterface {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model || this.getDefaultModel();
  }

  getDefaultModel(): string {
    return "anthropic/claude-sonnet-4-20250514";
  }

  getAvailableModels(): string[] {
    return ["anthropic/claude-sonnet-4-20250514", "openai/gpt-4o", "meta-llama/llama-3.3-70b-instruct"];
  }

  async analyze(prompt: string, systemPrompt: string): Promise<string> {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "HTTP-Referer": "https://deflaky.com",
        "X-Title": "DeFlaky",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 2048,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
}
