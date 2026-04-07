import type { AIProviderInterface } from "../types";

export class OllamaProvider implements AIProviderInterface {
  private baseUrl: string;
  private model: string;

  constructor(_apiKey: string, model?: string, baseUrl?: string) {
    this.baseUrl = baseUrl || "http://localhost:11434";
    this.model = model || this.getDefaultModel();
  }

  getDefaultModel(): string {
    return "llama3.2";
  }

  getAvailableModels(): string[] {
    return ["llama3.2", "codellama", "mistral", "phi3"];
  }

  async analyze(prompt: string, systemPrompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data.message.content;
  }
}
