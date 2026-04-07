import type { AIProviderInterface } from "../types";

export class OpenAIProvider implements AIProviderInterface {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model || this.getDefaultModel();
  }

  getDefaultModel(): string {
    return "gpt-4o";
  }

  getAvailableModels(): string[] {
    return ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o3-mini"];
  }

  async analyze(prompt: string, systemPrompt: string): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
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
      throw new Error(`OpenAI API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
}
