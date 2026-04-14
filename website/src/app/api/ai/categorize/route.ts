import { NextRequest, NextResponse } from "next/server";
import { categorizeFailure } from "@/lib/ai/analyze";
import type { AIConfig, AIAnalysisRequest } from "@/lib/ai/types";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const { config, testData } = body as {
      config: AIConfig;
      testData: AIAnalysisRequest;
    };

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

    const result = await categorizeFailure(config, testData);

    return NextResponse.json({
      success: true,
      categorization: result,
      provider: config.provider,
      model: config.model || "default",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `AI categorization failed: ${message}` },
      { status: 500 }
    );
  }
}
