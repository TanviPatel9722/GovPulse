import { buildStakeholderMap as buildStakeholderMapAgent } from "@/lib/agents/stakeholderAgent";
import { estimateEconomicExposure } from "@/lib/agents/economicAgent";
import { generateFinanceInsuranceRisk } from "@/lib/agents/financeRiskAgent";
import { generateIndustryRippleEffects } from "@/lib/agents/marketShockAgent";
import type { PolicyAnalysis } from "@/lib/agents/policyParser";
import type { EvidenceCard } from "@/lib/evidence/evidenceCard";
import type { LLMMode } from "@/lib/llm/llmTypes";
import type {
  EconomicExposure,
  FinanceInsuranceRisk,
  FraudRiskAssessment,
  IndustryRippleEffects,
  SentimentForecast,
  StakeholderIntelligence
} from "@/lib/types";

export type StakeholderEconomicImpact = {
  stakeholderMap: StakeholderIntelligence;
  economicExposure: EconomicExposure;
  industryRippleEffects: IndustryRippleEffects;
};

export type StakeholderEconomicImpactInput = {
  policyAnalysis: PolicyAnalysis;
  evidenceCards: EvidenceCard[];
  mode?: LLMMode;
};

export type FinanceInsuranceImpactInput = StakeholderEconomicImpactInput & {
  economicExposure: EconomicExposure;
  sentimentForecast: SentimentForecast;
  fraudRiskAssessment: FraudRiskAssessment;
};

export async function buildStakeholderEconomicImpact(
  input: StakeholderEconomicImpactInput
): Promise<StakeholderEconomicImpact> {
  const stakeholderMap = await buildStakeholderMapAgent(input.policyAnalysis, input.mode, input.evidenceCards);
  const economicExposure = await estimateEconomicExposure(
    input.policyAnalysis,
    input.policyAnalysis.jurisdiction,
    input.policyAnalysis.affected_groups,
    input.policyAnalysis.affected_industries,
    input.mode
  );
  const industryRippleEffects = await generateIndustryRippleEffects({
    policyAnalysis: input.policyAnalysis,
    stakeholderMap,
    economicExposure,
    evidenceCards: input.evidenceCards,
    mode: input.mode
  });

  return {
    stakeholderMap,
    economicExposure,
    industryRippleEffects
  };
}

export async function buildFinanceInsuranceImpact(
  input: FinanceInsuranceImpactInput
): Promise<FinanceInsuranceRisk> {
  return generateFinanceInsuranceRisk({
    policyAnalysis: input.policyAnalysis,
    economicExposure: input.economicExposure,
    sentimentForecast: input.sentimentForecast,
    fraudRiskAssessment: input.fraudRiskAssessment,
    evidenceCards: input.evidenceCards,
    mode: input.mode
  });
}
