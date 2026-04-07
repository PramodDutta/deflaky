import { NextRequest, NextResponse } from "next/server";
import { analyzeRootCause } from "@/lib/ai/analyze";
import type { AIConfig, AIAnalysisRequest } from "@/lib/ai/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { config, testData } = body as {
      config: AIConfig;
      testData: AIAnalysisRequest;
    };

    // Validate required fields
    if (!config?.provider || !config?.apiKey) {
      return NextResponse.json(
        { error: "AI provider and API key are required" },
        { status: 400 }
      );
    }

    if (!testData?.testName || !testData?.errorMessage) {
      return NextResponse.json(
        { error: "Test name and error message are required" },
        { status: 400 }
      );
    }

    const result = await analyzeRootCause(config, testData);

    return NextResponse.json({
      success: true,
      analysis: result,
      provider: config.provider,
      model: config.model || "default",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `AI analysis failed: ${message}` },
      { status: 500 }
    );
  }
}
