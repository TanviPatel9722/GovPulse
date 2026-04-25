import type { PolicyAnalysis as ParsedPolicyAnalysis } from "@/lib/agents/policyParser";
import type { EvidenceCard } from "@/lib/evidence/evidenceCard";
import {
  penalizeSocialOnlyClaims,
  requireAssumptionLabelForUnsupportedNumbers,
  requireSourceBackedForExactNumbers
} from "@/lib/evidence/sourceRanker";
import { separatePrimaryAndSupportingSources } from "@/lib/evidence/sourceRouter";
import { sourceRegistryByName } from "@/lib/sources/sourceRegistry";
import type {
  EconomicExposure,
  FinanceInsuranceRisk,
  FraudRiskAssessment,
  ImpactChainSimulation,
  IndustryRippleEffects,
  NarrativeRisk,
  PolicyRedesign,
  RiskScore,
  SentimentForecast,
  SocialDynamicsRisk,
  SourceAuditResult,
  StakeholderIntelligence
} from "@/lib/types";

export type SourceAuditInput = {
  evidenceCards: EvidenceCard[];
  policyAnalysis: ParsedPolicyAnalysis;
  sentimentForecast: SentimentForecast;
  narrativeRisk: NarrativeRisk;
  stakeholderMap: StakeholderIntelligence;
  economicExposure: EconomicExposure;
  fraudRiskAssessment: FraudRiskAssessment;
  riskScore: RiskScore;
  policyRedesign: PolicyRedesign;
  impactChainSimulation: ImpactChainSimulation;
  industryRippleEffects: IndustryRippleEffects;
  socialDynamicsRisk: SocialDynamicsRisk;
  financeInsuranceRisk: FinanceInsuranceRisk;
  dataNeedsPlan?: {
    needs: Array<{
      source_name: string;
      status: string;
      missing_data?: string[];
    }>;
  };
};

export function auditPolicySources(input: SourceAuditInput): SourceAuditResult {
  const cardsById = new Map(input.evidenceCards.map((card) => [card.id, card]));
  const evidenceGroups = separatePrimaryAndSupportingSources(input.evidenceCards);
  const unsupportedClaims: string[] = [];
  const overpreciseMetrics: string[] = [];
  const socialOnlyClaims: string[] = [];
  const missingSources: string[] = [];
  const recommendedDowngrades: string[] = [];
  const finalConfidenceAdjustments: string[] = [];

  for (const group of input.sentimentForecast.public_groups) {
    const groupCards = getCards(cardsById, group.evidence_card_ids);
    if (groupCards.length === 0) {
      unsupportedClaims.push(`People sentiment group "${group.group_name}" has no attached evidence cards.`);
    }

    const socialCheck = penalizeSocialOnlyClaims(groupCards);
    if (socialCheck.warning) {
      socialOnlyClaims.push(`${group.group_name}: ${socialCheck.warning}`);
      finalConfidenceAdjustments.push(`Reduce confidence for "${group.group_name}" until representative survey, comment, or demographic evidence is attached.`);
    }
  }

  for (const chain of input.impactChainSimulation.impact_chains) {
    if (chain.evidence_card_ids.length === 0) {
      unsupportedClaims.push(`Impact chain "${chain.chain_id}" should be treated as an assumption until evidence cards are attached.`);
    }
  }

  for (const metric of input.industryRippleEffects.industries) {
    auditMetric({
      metricName: `Industry ripple: ${metric.industry_name}`,
      metricValue: metric.metric_value,
      metricSourceType: metric.metric_source_type,
      assumptions: metric.assumptions,
      evidenceCards: getCards(cardsById, metric.evidence_card_ids),
      limitations: metric.limitations
    });
  }

  for (const metric of input.socialDynamicsRisk.groups) {
    auditMetric({
      metricName: `Social dynamics: ${metric.group_name}`,
      metricValue: metric.metric_value,
      metricSourceType: metric.metric_source_type,
      assumptions: metric.assumptions,
      evidenceCards: getCards(cardsById, metric.evidence_card_ids),
      limitations: metric.limitations
    });
  }

  for (const metric of input.financeInsuranceRisk.risk_categories) {
    auditMetric({
      metricName: `Finance/insurance: ${metric.risk_name}`,
      metricValue: metric.metric_value,
      metricSourceType: metric.metric_source_type,
      assumptions: metric.assumptions,
      evidenceCards: getCards(cardsById, metric.evidence_card_ids),
      limitations: metric.limitations
    });
  }

  for (const card of input.evidenceCards) {
    const entry = sourceRegistryByName[card.source_name];
    if (entry?.sourceTrustTier === "think-tank") {
      recommendedDowngrades.push(
        `${card.source_name} should be treated as policy interpretation with perspective disclosed, not neutral statistical ground truth.`
      );
    }
    if (entry?.sourceTrustTier === "background-only") {
      recommendedDowngrades.push(`${card.source_name} is background-only and should not support final source-backed claims.`);
    }
  }

  for (const need of input.dataNeedsPlan?.needs ?? []) {
    if (need.status === "missing_api_key" || need.status === "source_unavailable") {
      missingSources.push(`${need.source_name}: ${(need.missing_data ?? []).join("; ") || need.status}`);
    }
  }

  if (evidenceGroups.primary.length === 0) {
    missingSources.push("No primary official-statistical, official-policy, or peer-reviewed evidence cards are attached.");
    finalConfidenceAdjustments.push("Keep final confidence capped until at least one primary evidence source is retrieved.");
  }

  if (input.financeInsuranceRisk.risk_categories.some((risk) => risk.metric_source_type !== "source-backed")) {
    finalConfidenceAdjustments.push("Finance / insurance risks should remain scenario-risk pathways unless Treasury, Fed, BEA, FRED, or comparable evidence is attached.");
  }

  return {
    unsupported_claims: unique(unsupportedClaims),
    overprecise_metrics: unique(overpreciseMetrics),
    social_only_claims: unique(socialOnlyClaims),
    missing_sources: unique(missingSources),
    recommended_downgrades: unique(recommendedDowngrades),
    final_confidence_adjustments: unique(finalConfidenceAdjustments)
  };

  function auditMetric(inputMetric: {
    metricName: string;
    metricValue: string;
    metricSourceType: "source-backed" | "model-estimated" | "scenario-assumption" | "placeholder-demo-estimate";
    evidenceCards: EvidenceCard[];
    assumptions: string[];
    limitations: string[];
  }) {
    const normalizedMetric = {
      ...inputMetric,
      assumptions: inputMetric.assumptions ?? [],
      limitations: inputMetric.limitations ?? []
    };
    const exactNumberCheck = requireSourceBackedForExactNumbers(normalizedMetric);
    if (!exactNumberCheck.ok && exactNumberCheck.warning) {
      overpreciseMetrics.push(exactNumberCheck.warning);
      if (exactNumberCheck.recommendedMetricSourceType) {
        recommendedDowngrades.push(
          `${inputMetric.metricName}: label as ${exactNumberCheck.recommendedMetricSourceType} or replace with a range.`
        );
      }
    }

    const assumptionCheck = requireAssumptionLabelForUnsupportedNumbers(normalizedMetric);
    if (!assumptionCheck.ok && assumptionCheck.warning) {
      unsupportedClaims.push(assumptionCheck.warning);
    }

    if (inputMetric.metricSourceType === "source-backed" && inputMetric.evidenceCards.length === 0) {
      recommendedDowngrades.push(`${inputMetric.metricName}: marked source-backed but has no retrievable evidence card IDs.`);
    }

    if (normalizedMetric.limitations.length === 0) {
      unsupportedClaims.push(`${inputMetric.metricName}: numeric metric is missing a limitation statement.`);
    }
  }
}

function getCards(cardsById: Map<string, EvidenceCard>, ids: string[]): EvidenceCard[] {
  return ids.flatMap((id) => {
    const card = cardsById.get(id);
    return card ? [card] : [];
  });
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items.filter(Boolean)));
}
