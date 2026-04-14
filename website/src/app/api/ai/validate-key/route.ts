import { NextRequest, NextResponse } from "next/server";
import { createAIProvider } from "@/lib/ai/factory";
import type { AIConfig } from "@/lib/ai/types";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = (await request.json()) as AIConfig;

    if (!config?.provider || !config?.apiKey) {
      return NextResponse.json(
        { valid: false, error: "Provider and API key are required" },
        { status: 400 }
      );
    }

    const provider = createAIProvider(config);

    // Simple test prompt to validate the key works
    const response = await provider.analyze(
      "Say 'OK' in one word.",
      "You are a test assistant. Respond with exactly one word."
    );

    return NextResponse.json({
      valid: true,
      provider: config.provider,
      model: config.model || provider.getDefaultModel(),
      response: response.trim().substring(0, 20),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({
      valid: false,
      error: message,
    });
  }
}
