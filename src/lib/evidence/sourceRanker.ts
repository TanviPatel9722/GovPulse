import type { EvidenceCard } from "@/lib/evidence/evidenceCard";
import { sourceRegistryByName, type SourceTrustTier } from "@/lib/sources/sourceRegistry";

export type SourceDisciplineCheck = {
  ok: boolean;
  warning?: string;
  recommendedMetricSourceType?: "source-backed" | "model-estimated" | "scenario-assumption" | "placeholder-demo-estimate";
};

export type NumericMetricEvidenceInput = {
  metricName: string;
  metricValue: string;
  metricSourceType: "source-backed" | "model-estimated" | "scenario-assumption" | "placeholder-demo-estimate";
  evidenceCards: EvidenceCard[];
  assumptions?: string[];
};

export function rankEvidenceCardsByTrust(cards: EvidenceCard[]): EvidenceCard[] {
  return [...cards].sort((left, right) => scoreEvidenceCard(right) - scoreEvidenceCard(left));
}

export function preferOfficialForMetrics(cards: EvidenceCard[]): EvidenceCard[] {
  return rankEvidenceCardsByTrust(cards).sort((left, right) => {
    const leftOfficial = isMetricGradeTier(getTier(left)) ? 1 : 0;
    const rightOfficial = isMetricGradeTier(getTier(right)) ? 1 : 0;
    return rightOfficial - leftOfficial;
  });
}

export function preferResearchForInterpretation(cards: EvidenceCard[]): EvidenceCard[] {
  return rankEvidenceCardsByTrust(cards).sort((left, right) => {
    const leftResearch = isInterpretationTier(getTier(left)) ? 1 : 0;
    const rightResearch = isInterpretationTier(getTier(right)) ? 1 : 0;
    return rightResearch - leftResearch;
  });
}

export function penalizeSocialOnlyClaims(cards: EvidenceCard[]): {
  evidenceCards: EvidenceCard[];
  penalty: number;
  warning?: string;
} {
  const rankedCards = rankEvidenceCardsByTrust(cards);
  const hasCards = rankedCards.length > 0;
  const onlySocial = hasCards && rankedCards.every((card) => getTier(card) === "social-signal" || getTier(card) === "news-media");

  return {
    evidenceCards: rankedCards,
    penalty: onlySocial ? 0.2 : 0,
    warning: onlySocial
      ? "Sentiment or narrative claim relies only on news/social signals; do not treat it as representative public sentiment."
      : undefined
  };
}

export function requireSourceBackedForExactNumbers(input: NumericMetricEvidenceInput): SourceDisciplineCheck {
  const looksExact = hasExactNumber(input.metricValue);
  if (!looksExact) return { ok: true };

  const hasMetricGradeEvidence = input.evidenceCards.some((card) => isMetricGradeTier(getTier(card)));
  if (input.metricSourceType === "source-backed" && hasMetricGradeEvidence) return { ok: true };

  return {
    ok: false,
    warning: `${input.metricName} uses an exact-looking number without official, peer-reviewed, or dataset-backed evidence.`,
    recommendedMetricSourceType: hasMetricGradeEvidence ? "model-estimated" : "scenario-assumption"
  };
}

export function requireAssumptionLabelForUnsupportedNumbers(input: NumericMetricEvidenceInput): SourceDisciplineCheck {
  const hasNumber = /\d/.test(input.metricValue);
  if (!hasNumber) return { ok: true };

  const hasAssumption = (input.assumptions ?? []).some((assumption) => assumption.trim().length > 0);
  const hasSourceBackedEvidence = input.metricSourceType === "source-backed" && input.evidenceCards.some((card) => isMetricGradeTier(getTier(card)));

  if (hasSourceBackedEvidence || hasAssumption) return { ok: true };

  return {
    ok: false,
    warning: `${input.metricName} includes a numeric metric without source-backed evidence or an explicit assumption label.`,
    recommendedMetricSourceType: "scenario-assumption"
  };
}

function scoreEvidenceCard(card: EvidenceCard): number {
  const tier = getTier(card);
  return tierScore(tier) + card.confidence * 20 + freshnessScore(card.retrieved_at);
}

function getTier(card: EvidenceCard): SourceTrustTier {
  return sourceRegistryByName[card.source_name]?.sourceTrustTier ?? "background-only";
}

function isMetricGradeTier(tier: SourceTrustTier): boolean {
  return tier === "official-statistical" || tier === "official-policy" || tier === "peer-reviewed";
}

function isInterpretationTier(tier: SourceTrustTier): boolean {
  return tier === "peer-reviewed" || tier === "research-institution" || tier === "think-tank";
}

function hasExactNumber(value: string): boolean {
  if (/\d+\s*[-–]\s*\d+/.test(value)) return false;
  if (/\b(range|directional|low|moderate|high|weak|speculative)\b/i.test(value)) return false;
  return /\b\d+(\.\d+)?(%|\/100|\s?percent|\s?bps|\s?basis points|\s?million|\s?billion|\s?dollars?)?\b/i.test(value);
}

function freshnessScore(retrievedAt: string): number {
  const ageDays = (Date.now() - new Date(retrievedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays <= 7) return 5;
  if (ageDays <= 30) return 3;
  if (ageDays <= 365) return 1;
  return 0;
}

function tierScore(tier: SourceTrustTier): number {
  const scores: Record<SourceTrustTier, number> = {
    "official-statistical": 100,
    "official-policy": 95,
    "peer-reviewed": 90,
    "research-institution": 80,
    "think-tank": 68,
    "consulting-methodology": 55,
    "public-comment": 48,
    "news-media": 40,
    "social-signal": 20,
    "background-only": 5
  };
  return scores[tier];
}
