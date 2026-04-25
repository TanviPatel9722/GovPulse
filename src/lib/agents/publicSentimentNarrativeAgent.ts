import { buildNarrativeRisk as buildNarrativeRiskAgent } from "@/lib/agents/narrativeRiskAgent";
import { buildSentimentForecast as buildSentimentForecastAgent, toLegacySentimentGroups } from "@/lib/agents/sentimentAgent";
import { generateSocialDynamicsRisk } from "@/lib/agents/socialContagionAgent";
import type { PolicyAnalysis } from "@/lib/agents/policyParser";
import { mergeEvidenceCards, rankEvidenceCards, type EvidenceCard } from "@/lib/evidence/evidenceCard";
import type { LLMMode } from "@/lib/llm/llmTypes";
import {
  buildCrustDataPublicSignalEvidenceCards,
  searchPublicSentimentSignalsByPolicy
} from "@/lib/sources/crustdata";
import type {
  EconomicExposure,
  NarrativeRisk,
  ParsedPolicy,
  SentimentForecast,
  SentimentGroupForecast,
  SocialDynamicsRisk,
  StakeholderIntelligence
} from "@/lib/types";

export type PublicSentimentNarrativeImpact = {
  sentimentForecast: SentimentForecast;
  narrativeRisk: NarrativeRisk;
  socialDynamicsRisk: SocialDynamicsRisk;
  legacySentiment: SentimentGroupForecast[];
  publicSignalEvidenceCards: EvidenceCard[];
  evidenceCards: EvidenceCard[];
};

export type PublicSentimentNarrativeInput = {
  policyAnalysis: PolicyAnalysis;
  parsedPolicy: ParsedPolicy;
  evidenceCards: EvidenceCard[];
  stakeholderMap?: StakeholderIntelligence;
  economicExposure?: EconomicExposure;
  mode?: LLMMode;
};

export async function buildPublicSentimentNarrativeImpact(
  input: PublicSentimentNarrativeInput
): Promise<PublicSentimentNarrativeImpact> {
  const publicSignals = await searchPublicSentimentSignalsByPolicy(input.policyAnalysis);
  const publicSignalEvidenceCards = buildCrustDataPublicSignalEvidenceCards(input.policyAnalysis, publicSignals);
  const evidenceCards = rankEvidenceCards(
    mergeEvidenceCards([...input.evidenceCards, ...publicSignalEvidenceCards]),
    {
      preferred_agents: ["sentiment_forecast", "narrative_risk"],
      preferred_geography: input.policyAnalysis.jurisdiction,
      preferred_policy_domain: input.policyAnalysis.policy_domain,
      minimum_confidence: 0.25
    }
  );
  const sentimentForecast = await buildSentimentForecastAgent({
    policyAnalysis: input.policyAnalysis,
    evidenceCards,
    economicExposure: input.economicExposure,
    stakeholderMap: input.stakeholderMap,
    mode: input.mode
  });
  const legacySentiment = toLegacySentimentGroups(sentimentForecast);
  const narrativeRisk = await buildNarrativeRiskAgent(
    input.policyAnalysis,
    input.parsedPolicy,
    sentimentForecast,
    legacySentiment,
    evidenceCards,
    input.mode
  );
  const socialDynamicsRisk = await generateSocialDynamicsRisk({
    policyAnalysis: input.policyAnalysis,
    sentimentForecast,
    narrativeRisk,
    evidenceCards,
    mode: input.mode
  });

  return {
    sentimentForecast,
    narrativeRisk,
    socialDynamicsRisk,
    legacySentiment,
    publicSignalEvidenceCards,
    evidenceCards
  };
}
