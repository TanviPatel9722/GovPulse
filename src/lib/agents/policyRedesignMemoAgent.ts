import { generateImpactChainSimulation } from "@/lib/agents/impactChainAgent";
import type { PolicyAnalysis } from "@/lib/agents/policyParser";
import { generateExecutiveMemoWithLLM } from "@/lib/agents/reportAgent";
import { generatePolicyRedesignWithLLM } from "@/lib/agents/redesignAgent";
import type { EvidenceCard } from "@/lib/evidence/evidenceCard";
import type { LLMMode } from "@/lib/llm/llmTypes";
import type {
  EconomicExposure,
  ExecutiveMemo,
  FraudRiskAssessment,
  ImpactChainSimulation,
  ImplementationRisk,
  ParsedPolicy,
  PolicyRedesign,
  RiskScore,
  SentimentForecast,
  StakeholderIntelligence
} from "@/lib/types";

export type PolicyRedesignMemoOutput = {
  impactChainSimulation: ImpactChainSimulation;
  policyRedesign: PolicyRedesign;
  executiveMemo: ExecutiveMemo;
};

export type PolicyRedesignMemoInput = {
  originalPolicyText: string;
  policyAnalysis: PolicyAnalysis;
  parsedPolicy: ParsedPolicy;
  sentimentForecast: SentimentForecast;
  stakeholderMap: StakeholderIntelligence;
  economicExposure: EconomicExposure;
  fraudRiskAssessment: FraudRiskAssessment;
  implementationRisk: ImplementationRisk;
  riskScore: RiskScore;
  evidenceCards: EvidenceCard[];
  mode?: LLMMode;
};

export async function buildPolicyRedesignMemo(input: PolicyRedesignMemoInput): Promise<PolicyRedesignMemoOutput> {
  const impactChainSimulation = await generateImpactChainSimulation({
    policyAnalysis: input.policyAnalysis,
    sentimentForecast: input.sentimentForecast,
    stakeholderMap: input.stakeholderMap,
    economicExposure: input.economicExposure,
    fraudRiskAssessment: input.fraudRiskAssessment,
    evidenceCards: input.evidenceCards,
    simulationHorizon: "90 days",
    mode: input.mode
  });
  const policyRedesign = await generatePolicyRedesignWithLLM({
    originalPolicyText: input.originalPolicyText,
    policyAnalysis: {
      policy_title: input.policyAnalysis.policy_title,
      policy_domain: input.policyAnalysis.policy_domain,
      jurisdiction: input.policyAnalysis.jurisdiction,
      obligations: input.policyAnalysis.obligations,
      affected_groups: input.policyAnalysis.affected_groups,
      affected_industries: input.policyAnalysis.affected_industries
    },
    riskScore: input.riskScore,
    sentimentForecast: input.sentimentForecast,
    economicExposure: input.economicExposure,
    fraudRiskAssessment: input.fraudRiskAssessment,
    stakeholderMap: input.stakeholderMap,
    mode: input.mode
  });
  const executiveMemo = await generateExecutiveMemoWithLLM({
    parsedPolicy: input.parsedPolicy,
    sentimentForecast: input.sentimentForecast,
    stakeholderMap: input.stakeholderMap,
    economicExposure: input.economicExposure,
    fraudRiskAssessment: input.fraudRiskAssessment,
    implementationRisk: input.implementationRisk,
    redesign: policyRedesign,
    riskScore: input.riskScore,
    mode: input.mode
  });

  return {
    impactChainSimulation,
    policyRedesign,
    executiveMemo
  };
}
