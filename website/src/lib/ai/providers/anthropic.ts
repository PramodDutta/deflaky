import type { AIProviderInterface } from "../types";

export class AnthropicProvider implements AIProviderInterface {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model || this.getDefaultModel();
  }

  getDefaultModel(): string {
    return "claude-sonnet-4-20250514";
  }

  getAvailableModels(): string[] {
    return ["claude-sonnet-4-20250514", "claude-haiku-4-20250414", "claude-opus-4-20250514"];
  }

  async analyze(prompt: string, systemPrompt: string): Promise<string> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }
}
