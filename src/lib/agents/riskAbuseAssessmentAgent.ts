import { assessFraudRisk } from "@/lib/agents/fraudRiskAgent";
import { assessImplementationRisk } from "@/lib/agents/implementationAgent";
import type { PolicyAnalysis } from "@/lib/agents/policyParser";
import { auditPolicySources } from "@/lib/agents/sourceAuditorAgent";
import type { DataNeedsPlan } from "@/lib/agents/policyAnalysisPipeline";
import type { EvidenceCard } from "@/lib/evidence/evidenceCard";
import type { LLMMode } from "@/lib/llm/llmTypes";
import { computeRiskScore, estimateMitigationReadiness } from "@/lib/scoring/riskScore";
import type {
  EconomicExposure,
  FinanceInsuranceRisk,
  FraudRiskAssessment,
  ImpactChainSimulation,
  ImplementationRisk,
  IndustryRippleEffects,
  NarrativeRisk,
  ParsedPolicy,
  PolicyRedesign,
  RiskScore,
  SentimentForecast,
  SocialDynamicsRisk,
  SourceAuditResult,
  StakeholderIntelligence
} from "@/lib/types";

export type RiskAbuseAssessment = {
  fraudRiskAssessment: FraudRiskAssessment;
  implementationRisk: ImplementationRisk;
  riskScore: RiskScore;
};

export type RiskAbuseAssessmentInput = {
  policyAnalysis: PolicyAnalysis;
  parsedPolicy: ParsedPolicy;
  stakeholderMap: StakeholderIntelligence;
  economicExposure: EconomicExposure;
  sentimentForecast: SentimentForecast;
  evidenceCards: EvidenceCard[];
  mode?: LLMMode;
};

export type SourceAuditInput = RiskAbuseAssessmentInput & {
  narrativeRisk: NarrativeRisk;
  fraudRiskAssessment: FraudRiskAssessment;
  riskScore: RiskScore;
  policyRedesign: PolicyRedesign;
  impactChainSimulation: ImpactChainSimulation;
  industryRippleEffects: IndustryRippleEffects;
  socialDynamicsRisk: SocialDynamicsRisk;
  financeInsuranceRisk: FinanceInsuranceRisk;
  dataNeedsPlan: DataNeedsPlan;
};

export async function buildRiskAbuseAssessment(input: RiskAbuseAssessmentInput): Promise<RiskAbuseAssessment> {
  const fraudRiskAssessment = await assessFraudRisk({
    policyAnalysis: input.policyAnalysis,
    stakeholderMap: input.stakeholderMap,
    economicExposure: input.economicExposure,
    evidenceCards: input.evidenceCards,
    mode: input.mode
  });
  const implementationRisk = assessImplementationRisk(input.parsedPolicy);
  const initialReadiness = estimateMitigationReadiness({
    implementationRisk,
    verificationControls: fraudRiskAssessment.verification_controls,
    redesignRecommendationCount: 0,
    validationQuestionCount: input.sentimentForecast.validation_questions.length
  });
  const riskScore = computeRiskScore({
    policyAnalysis: {
      parsedPolicy: input.parsedPolicy,
      implementationRisk
    },
    sentimentForecast: input.sentimentForecast,
    stakeholderMap: input.stakeholderMap,
    economicExposure: input.economicExposure,
    fraudRiskAssessment,
    implementationRisk,
    mitigationReadiness: initialReadiness
  });

  return {
    fraudRiskAssessment,
    implementationRisk,
    riskScore
  };
}

export function auditRiskAbuseSources(input: SourceAuditInput): SourceAuditResult {
  return auditPolicySources({
    evidenceCards: input.evidenceCards,
    policyAnalysis: input.policyAnalysis,
    sentimentForecast: input.sentimentForecast,
    narrativeRisk: input.narrativeRisk,
    stakeholderMap: input.stakeholderMap,
    economicExposure: input.economicExposure,
    fraudRiskAssessment: input.fraudRiskAssessment,
    riskScore: input.riskScore,
    policyRedesign: input.policyRedesign,
    impactChainSimulation: input.impactChainSimulation,
    industryRippleEffects: input.industryRippleEffects,
    socialDynamicsRisk: input.socialDynamicsRisk,
    financeInsuranceRisk: input.financeInsuranceRisk,
    dataNeedsPlan: input.dataNeedsPlan
  });
}
