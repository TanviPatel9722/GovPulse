import { EconoSenseApp } from "@/components/EconoSenseApp";
import { runAnalyzePolicyPipeline } from "@/lib/agents/policyAnalysisPipeline";
import { DEMO_POLICY_TEXT } from "@/lib/types";

export default async function Home() {
  const initialResult = await runAnalyzePolicyPipeline({
    policyText: DEMO_POLICY_TEXT,
    jurisdiction: "Washington, DC",
    policyCategory: "AI governance",
    mode: "live"
  });

  return (
    <EconoSenseApp
      initialAnalysis={initialResult.analysis}
      initialNotice={initialResult.notice}
    />
  );
}
