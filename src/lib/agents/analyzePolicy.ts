import { DEMO_POLICY_TEXT, type PolicyAnalysis } from "@/lib/types";
import { parsePolicySummary } from "@/lib/agents/policyParser";
import { forecastPeopleSentiment, toLegacySentimentGroups } from "@/lib/agents/sentimentAgent";
import { assessNarrativeRisk } from "@/lib/agents/narrativeRiskAgent";
import { buildStakeholderMap } from "@/lib/agents/stakeholderAgent";
import { estimateEconomicExposure } from "@/lib/agents/economicAgent";
import { assessFraudRisk } from "@/lib/agents/fraudRiskAgent";
import { assessImplementationRisk } from "@/lib/agents/implementationAgent";
import { redesignPolicy } from "@/lib/agents/redesignAgent";
import { generateExecutiveMemo } from "@/lib/agents/reportAgent";
import { computeRiskScore, estimateMitigationReadiness } from "@/lib/scoring/riskScore";

type AnalyzePolicyOptions = {
  jurisdiction?: string;
  policyType?: string;
};

export async function analyzePolicy(
  policyText = DEMO_POLICY_TEXT,
  options: AnalyzePolicyOptions = {}
): Promise<PolicyAnalysis> {
  const parsedPolicy = parsePolicySummary(policyText, options.jurisdiction);
  const stakeholderIntelligence = await buildStakeholderMap(parsedPolicy);
  const economicExposure = await estimateEconomicExposure(parsedPolicy);
  const peopleSentimentForecast = forecastPeopleSentiment({
    policyAnalysis: parsedPolicy,
    evidenceCards: stakeholderIntelligence.evidenceCards,
    economicExposure,
    stakeholderMap: stakeholderIntelligence
  });
  const sentimentForecast = toLegacySentimentGroups(peopleSentimentForecast);
  const narrativeRisk = assessNarrativeRisk(parsedPolicy, sentimentForecast);
  const fraudAbuseRisk = await assessFraudRisk({
    policyAnalysis: parsedPolicy,
    stakeholderMap: stakeholderIntelligence,
    economicExposure,
    evidenceCards: stakeholderIntelligence.evidenceCards
  });
  const implementationRisk = assessImplementationRisk(parsedPolicy);
  const initialMitigationReadiness = estimateMitigationReadiness({
    implementationRisk,
    verificationControls: fraudAbuseRisk.verification_controls,
    redesignRecommendationCount: 0,
    validationQuestionCount: peopleSentimentForecast.validation_questions.length
  });
  const initialRiskScore = computeRiskScore({
    policyAnalysis: {
      parsedPolicy,
      implementationRisk
    },
    sentimentForecast: peopleSentimentForecast,
    stakeholderMap: stakeholderIntelligence,
    economicExposure,
    fraudRiskAssessment: fraudAbuseRisk,
    implementationRisk,
    mitigationReadiness: initialMitigationReadiness
  });
  const redesignBrief = redesignPolicy({
    originalPolicyText: parsedPolicy.policyText,
    policyAnalysis: {
      policy_title: parsedPolicy.policyName,
      policy_domain: parsedPolicy.policyName,
      jurisdiction: parsedPolicy.jurisdiction,
      obligations: parsedPolicy.mechanisms,
      affected_groups: parsedPolicy.affectedParties,
      affected_industries: parsedPolicy.affectedParties
    },
    riskScore: initialRiskScore,
    sentimentForecast: peopleSentimentForecast,
    economicExposure,
    fraudRiskAssessment: fraudAbuseRisk,
    stakeholderMap: stakeholderIntelligence
  });
  const mitigationReadiness = estimateMitigationReadiness({
    implementationRisk,
    verificationControls: fraudAbuseRisk.verification_controls,
    redesignRecommendationCount: redesignBrief.redesign_options.length,
    validationQuestionCount: redesignBrief.validation_questions.length
  });
  const riskScore = computeRiskScore({
    policyAnalysis: {
      parsedPolicy,
      implementationRisk
    },
    sentimentForecast: peopleSentimentForecast,
    stakeholderMap: stakeholderIntelligence,
    economicExposure,
    fraudRiskAssessment: fraudAbuseRisk,
    implementationRisk,
    mitigationReadiness
  });
  const executiveMemo = generateExecutiveMemo({
    parsedPolicy,
    sentimentForecast: peopleSentimentForecast,
    stakeholderMap: stakeholderIntelligence,
    economicExposure,
    fraudRiskAssessment: fraudAbuseRisk,
    implementationRisk,
    redesign: redesignBrief,
    riskScore
  });

  return {
    id: `analysis-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    analysisMode: "mock-fallback",
    policyText: parsedPolicy.policyText,
    parsedPolicy,
    peopleSentimentForecast,
    sentimentForecast,
    narrativeRisk,
    stakeholderIntelligence,
    economicExposure,
    fraudAbuseRisk,
    implementationRisk,
    redesignBrief,
    riskScore,
    executiveMemo
  };
}
