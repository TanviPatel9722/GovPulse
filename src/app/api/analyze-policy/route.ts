import { NextResponse } from "next/server";
import {
  normalizeAnalyzePolicyRequest,
  runAnalyzePolicyPipeline,
  type AnalyzePolicyPipelineResponse,
  type AnalysisWarning
} from "@/lib/agents/policyAnalysisPipeline";
import { analyzePolicy } from "@/lib/agents/analyzePolicy";
import { DEMO_POLICY_TEXT } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { request: normalizedRequest, warnings } = normalizeAnalyzePolicyRequest(body);
    const response = await runAnalyzePolicyPipeline(normalizedRequest, warnings);

    return NextResponse.json<AnalyzePolicyPipelineResponse>(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to analyze policy.";
    const warning: AnalysisWarning = {
      step: "request",
      severity: "error",
      message: `Endpoint failed before the policy pipeline could return a partial analysis. ${message}`,
      missingData: [message]
    };

    console.error("[EconoSense] analyze-policy endpoint failed", error);

    return NextResponse.json(
      {
        ok: false,
        analysisId: `analysis-endpoint-error-${Date.now()}`,
        error: message,
        warnings: [warning]
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const analysis = await analyzePolicy(DEMO_POLICY_TEXT);

  return NextResponse.json({
    ok: true,
    analysis,
    notice: "Demo analysis generated from typed mock fallback data."
  });
}
