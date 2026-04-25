import {
  sourceRegistryByName,
  type SourceName,
  type SourceType,
  type TrustLevel
} from "@/lib/sources/sourceRegistry";

export type AgentName =
  | "policy_parser"
  | "sentiment_forecast"
  | "narrative_risk"
  | "stakeholder_intelligence"
  | "economic_exposure"
  | "fraud_abuse_risk"
  | "implementation_risk"
  | "policy_redesign"
  | "executive_memo"
  | "source_adapter"
  | "manual_review";

export type EvidenceCard = {
  id: string;
  source_name: SourceName;
  source_type: SourceType;
  source_url: string;
  retrieved_at: string;
  title: string;
  excerpt: string;
  extracted_claim: string;
  geography: string;
  policy_domain: string;
  confidence: number;
  limitation: string;
  used_by_agents: AgentName[];
  supports: string[];
  contradicts: string[];
  raw_metadata: Record<string, unknown>;
};

export type EvidenceCardInput = Omit<
  EvidenceCard,
  "id" | "retrieved_at" | "source_type" | "used_by_agents" | "supports" | "contradicts" | "raw_metadata"
> &
  Partial<
    Pick<
      EvidenceCard,
      "id" | "retrieved_at" | "source_type" | "used_by_agents" | "supports" | "contradicts" | "raw_metadata"
    >
  >;

export type RankEvidenceCardsOptions = {
  preferred_agents?: AgentName[];
  preferred_geography?: string;
  preferred_policy_domain?: string;
  minimum_confidence?: number;
};

export type EvidenceBackedClaim =
  | {
      claim: string;
      evidence_cards: EvidenceCard[];
      assumption?: never;
    }
  | {
      claim: string;
      evidence_cards?: never;
      assumption: string;
    };

const trustLevelScores: Record<TrustLevel, number> = {
  official: 1,
  high: 0.86,
  medium: 0.68,
  contextual: 0.48
};

export function createEvidenceCard(input: EvidenceCardInput): EvidenceCard {
  const registryEntry = sourceRegistryByName[input.source_name];
  const sourceType = input.source_type ?? registryEntry.source_type;
  const retrievedAt = input.retrieved_at ?? new Date().toISOString();

  const card: EvidenceCard = {
    id: input.id ?? createStableEvidenceId(input),
    source_name: input.source_name,
    source_type: sourceType,
    source_url: input.source_url,
    retrieved_at: retrievedAt,
    title: input.title,
    excerpt: input.excerpt,
    extracted_claim: input.extracted_claim,
    geography: input.geography,
    policy_domain: input.policy_domain,
    confidence: clampConfidence(input.confidence),
    limitation: input.limitation || registryEntry.limitations[0],
    used_by_agents: unique(input.used_by_agents ?? []),
    supports: unique(input.supports ?? []),
    contradicts: unique(input.contradicts ?? []),
    raw_metadata: input.raw_metadata ?? {}
  };

  validateEvidenceCard(card);
  return card;
}

export function mergeEvidenceCards(cards: EvidenceCard[]): EvidenceCard[] {
  const merged = new Map<string, EvidenceCard>();

  for (const card of cards) {
    validateEvidenceCard(card);
    const existingKey = findMergeKey(merged, card);

    if (!existingKey) {
      merged.set(card.id, { ...card });
      continue;
    }

    const existing = merged.get(existingKey);
    if (!existing) continue;

    const higherConfidenceCard = card.confidence > existing.confidence ? card : existing;
    merged.set(existingKey, {
      ...existing,
      confidence: roundConfidence((existing.confidence + card.confidence) / 2),
      excerpt: higherConfidenceCard.excerpt,
      extracted_claim: higherConfidenceCard.extracted_claim,
      limitation: mergeLimitations(existing.limitation, card.limitation),
      used_by_agents: unique([...existing.used_by_agents, ...card.used_by_agents]),
      supports: unique([...existing.supports, ...card.supports]),
      contradicts: unique([...existing.contradicts, ...card.contradicts]),
      raw_metadata: {
        ...existing.raw_metadata,
        ...card.raw_metadata,
        merged_from: unique([
          ...(Array.isArray(existing.raw_metadata.merged_from) ? existing.raw_metadata.merged_from.map(String) : []),
          card.id
        ])
      }
    });
  }

  return Array.from(merged.values());
}

export function rankEvidenceCards(cards: EvidenceCard[], options: RankEvidenceCardsOptions = {}): EvidenceCard[] {
  const minimumConfidence = options.minimum_confidence ?? 0;

  return cards
    .filter((card) => card.confidence >= minimumConfidence)
    .map((card) => ({ card, score: scoreEvidenceCard(card, options) }))
    .sort((left, right) => right.score - left.score)
    .map(({ card }) => card);
}

export function filterEvidenceByAgent(cards: EvidenceCard[], agentName: AgentName): EvidenceCard[] {
  return cards.filter((card) => card.used_by_agents.includes(agentName));
}

export function summarizeEvidenceLimitations(cards: EvidenceCard[]): string[] {
  const limitations = cards.flatMap((card) => {
    const registryLimitations = sourceRegistryByName[card.source_name].limitations;
    return [card.limitation, ...registryLimitations];
  });

  return unique(limitations.filter(Boolean));
}

export function assertEvidenceOrAssumption(claim: EvidenceBackedClaim): void {
  const hasEvidence = "evidence_cards" in claim && Boolean(claim.evidence_cards?.length);
  const hasAssumption = "assumption" in claim && typeof claim.assumption === "string" && claim.assumption.trim().length > 0;

  if (!hasEvidence && !hasAssumption) {
    throw new Error(
      "Final claims must attach at least one EvidenceCard or explicitly label the claim as an assumption."
    );
  }
}

function validateEvidenceCard(card: EvidenceCard): void {
  const missingFields = Object.entries(card)
    .filter(([, value]) => value === undefined || value === null || value === "")
    .map(([key]) => key);

  if (missingFields.length > 0) {
    throw new Error(`EvidenceCard is missing required fields: ${missingFields.join(", ")}`);
  }

  if (!sourceRegistryByName[card.source_name]) {
    throw new Error(`EvidenceCard source_name is not registered: ${card.source_name}`);
  }

  if (card.source_type !== sourceRegistryByName[card.source_name].source_type && !isAllowedSourceTypeAlias(card)) {
    throw new Error(
      `EvidenceCard source_type "${card.source_type}" does not match registered source "${card.source_name}".`
    );
  }

  if (card.confidence < 0 || card.confidence > 1) {
    throw new Error("EvidenceCard confidence must be between 0 and 1.");
  }

  if (Number.isNaN(Date.parse(card.retrieved_at))) {
    throw new Error("EvidenceCard retrieved_at must be an ISO-compatible date string.");
  }
}

function isAllowedSourceTypeAlias(card: EvidenceCard): boolean {
  return (
    card.source_name === "CrustData" &&
    ["stakeholder-company-data", "stakeholder-people-data", "stakeholder-social-signal"].includes(card.source_type)
  );
}

function scoreEvidenceCard(card: EvidenceCard, options: RankEvidenceCardsOptions): number {
  const registryEntry = sourceRegistryByName[card.source_name];
  const trustScore = trustLevelScores[registryEntry.trust_level] * 30;
  const confidenceScore = card.confidence * 45;
  const supportScore = Math.min(card.supports.length, 4) * 4;
  const contradictionPenalty = Math.min(card.contradicts.length, 3) * 3;
  const agentBoost = options.preferred_agents?.some((agent) => card.used_by_agents.includes(agent)) ? 8 : 0;
  const geographyBoost =
    options.preferred_geography && card.geography.toLowerCase().includes(options.preferred_geography.toLowerCase())
      ? 6
      : 0;
  const domainBoost =
    options.preferred_policy_domain &&
    card.policy_domain.toLowerCase().includes(options.preferred_policy_domain.toLowerCase())
      ? 6
      : 0;
  const freshnessScore = scoreFreshness(card.retrieved_at);

  return trustScore + confidenceScore + supportScore - contradictionPenalty + agentBoost + geographyBoost + domainBoost + freshnessScore;
}

function scoreFreshness(retrievedAt: string): number {
  const ageMs = Date.now() - new Date(retrievedAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  if (ageDays <= 7) return 5;
  if (ageDays <= 30) return 3;
  if (ageDays <= 180) return 1;
  return 0;
}

function findMergeKey(merged: Map<string, EvidenceCard>, card: EvidenceCard): string | null {
  if (merged.has(card.id)) {
    return card.id;
  }

  for (const [key, existing] of merged.entries()) {
    const sameUrl = existing.source_url === card.source_url;
    const sameClaim = normalizeText(existing.extracted_claim) === normalizeText(card.extracted_claim);
    const sameSource = existing.source_name === card.source_name;

    if (sameSource && sameUrl && sameClaim) {
      return key;
    }
  }

  return null;
}

function createStableEvidenceId(input: EvidenceCardInput): string {
  const seed = [
    input.source_name,
    input.source_url,
    input.title,
    input.extracted_claim,
    input.geography,
    input.policy_domain
  ].join("|");

  let hash = 0;
  for (let index = 0; index < seed.length; index++) {
    hash = (hash << 5) - hash + seed.charCodeAt(index);
    hash |= 0;
  }

  return `ev-${Math.abs(hash).toString(36)}`;
}

function clampConfidence(value: number): number {
  return roundConfidence(Math.max(0, Math.min(1, value)));
}

function roundConfidence(value: number): number {
  return Math.round(value * 100) / 100;
}

function mergeLimitations(left: string, right: string): string {
  return unique([left, right]).join(" ");
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}
