import type { EvidenceCard } from "@/lib/evidence/evidenceCard";
import {
  isPrimaryEvidenceTier,
  sourceRegistry,
  sourceRegistryByName,
  type SourceName,
  type SourceRegistryEntry,
  type SourceTrustTier
} from "@/lib/sources/sourceRegistry";

export type ClaimType =
  | "exact-metric"
  | "economic-indicator"
  | "fiscal-capacity"
  | "policy-text"
  | "legal-requirement"
  | "public-sentiment"
  | "online-sentiment"
  | "stakeholder-intelligence"
  | "policy-interpretation"
  | "equity-impact"
  | "finance-insurance-risk"
  | "consulting-methodology"
  | "fraud-abuse-risk"
  | string;

const agentSourceMap: Record<string, SourceTrustTier[]> = {
  policy_parser: ["official-policy", "public-comment", "background-only"],
  sentiment_forecast: ["public-comment", "news-media", "official-statistical", "think-tank", "consulting-methodology"],
  narrative_risk: ["news-media", "public-comment", "social-signal", "think-tank"],
  stakeholder_intelligence: ["research-institution", "official-statistical", "news-media"],
  economic_exposure: ["official-statistical", "peer-reviewed", "research-institution", "think-tank"],
  economic_equity: ["official-statistical", "think-tank", "research-institution", "peer-reviewed"],
  impact_chain: ["official-policy", "official-statistical", "research-institution", "public-comment", "news-media"],
  market_shock: ["official-statistical", "peer-reviewed", "research-institution", "consulting-methodology"],
  social_dynamics: ["public-comment", "news-media", "social-signal", "official-statistical", "think-tank"],
  finance_risk: ["official-statistical", "research-institution", "peer-reviewed"],
  fraud_abuse_risk: ["official-statistical", "official-policy", "public-comment"],
  implementation_risk: ["official-policy", "official-statistical", "public-comment", "news-media"],
  consulting_benchmark: ["consulting-methodology", "peer-reviewed"],
  policy_redesign: ["official-policy", "official-statistical", "think-tank", "consulting-methodology"],
  source_auditor: ["official-statistical", "official-policy", "peer-reviewed", "research-institution", "public-comment"],
  executive_memo: ["official-statistical", "official-policy", "peer-reviewed", "research-institution", "think-tank"]
};

export function getSourcesForPolicyDomain(policyDomain: string): SourceRegistryEntry[] {
  const normalizedDomain = policyDomain.toLowerCase();

  return rankEntries(
    sourceRegistry.filter((entry) => {
      const haystack = [
        entry.name,
        entry.source_type,
        entry.sourceTrustTier,
        ...entry.bestFor,
        ...entry.supportedAgents
      ]
        .join(" ")
        .toLowerCase();

      if (normalizedDomain.includes("labor") || normalizedDomain.includes("worker")) {
        return haystack.includes("labor") || haystack.includes("worker") || haystack.includes("wage");
      }
      if (normalizedDomain.includes("fiscal") || normalizedDomain.includes("finance") || normalizedDomain.includes("insurance")) {
        return haystack.includes("fiscal") || haystack.includes("finance") || haystack.includes("interest");
      }
      if (normalizedDomain.includes("environment") || normalizedDomain.includes("retail")) {
        return haystack.includes("industry") || haystack.includes("implementation") || haystack.includes("local") || haystack.includes("stakeholder");
      }
      if (normalizedDomain.includes("ai") || normalizedDomain.includes("hiring")) {
        return haystack.includes("employment") || haystack.includes("labor") || haystack.includes("rule") || haystack.includes("stakeholder");
      }

      return haystack.includes(normalizedDomain);
    })
  );
}

export function getSourcesForAgent(agentName: string): SourceRegistryEntry[] {
  const tiers = agentSourceMap[agentName] ?? ["official-statistical", "official-policy", "peer-reviewed", "research-institution"];
  return rankEntries(
    sourceRegistry.filter((entry) => tiers.includes(entry.sourceTrustTier) || entry.supportedAgents.includes(agentName))
  );
}

export function getSourcesForMetric(metricType: string): SourceRegistryEntry[] {
  const normalizedMetric = metricType.toLowerCase();
  if (normalizedMetric.includes("sentiment") || normalizedMetric.includes("online")) {
    return rankSourcesForClaim(normalizedMetric.includes("online") ? "online-sentiment" : "public-sentiment");
  }
  if (normalizedMetric.includes("finance") || normalizedMetric.includes("bond") || normalizedMetric.includes("insurance")) {
    return rankSourcesForClaim("finance-insurance-risk");
  }
  if (normalizedMetric.includes("cost") || normalizedMetric.includes("income") || normalizedMetric.includes("employment")) {
    return rankSourcesForClaim("economic-indicator");
  }
  return rankSourcesForClaim("exact-metric");
}

export function getSourceLimitations(sourceId: string): string[] {
  const entry = getEntry(sourceId);
  return entry?.knownLimitations ?? ["Source is not registered; treat claims as assumptions until reviewed."];
}

export function rankSourcesForClaim(claimType: ClaimType): SourceRegistryEntry[] {
  const normalizedClaim = claimType.toLowerCase();

  if (normalizedClaim.includes("policy") || normalizedClaim.includes("legal") || normalizedClaim.includes("requirement")) {
    return rankEntriesByTier(["official-policy", "public-comment", "official-statistical"]);
  }
  if (normalizedClaim.includes("sentiment") && normalizedClaim.includes("online")) {
    return rankEntriesByTier(["news-media", "social-signal", "public-comment", "consulting-methodology"]);
  }
  if (normalizedClaim.includes("sentiment") || normalizedClaim.includes("public")) {
    return rankEntriesByTier(["public-comment", "news-media", "official-statistical", "think-tank", "consulting-methodology"]);
  }
  if (normalizedClaim.includes("equity") || normalizedClaim.includes("worker") || normalizedClaim.includes("household")) {
    return rankEntriesByTier(["official-statistical", "think-tank", "research-institution", "peer-reviewed"]);
  }
  if (normalizedClaim.includes("finance") || normalizedClaim.includes("insurance") || normalizedClaim.includes("market")) {
    return rankEntriesByTier(["official-statistical", "research-institution", "peer-reviewed"]);
  }
  if (normalizedClaim.includes("method")) {
    return rankEntriesByTier(["consulting-methodology", "peer-reviewed", "research-institution"]);
  }
  if (normalizedClaim.includes("stakeholder") || normalizedClaim.includes("company")) {
    return rankEntriesByTier(["research-institution", "official-statistical", "news-media"]);
  }

  return rankEntriesByTier(["official-statistical", "official-policy", "peer-reviewed", "research-institution"]);
}

export function separatePrimaryAndSupportingSources(evidenceCards: EvidenceCard[]): {
  primary: EvidenceCard[];
  supporting: EvidenceCard[];
  backgroundOnly: EvidenceCard[];
} {
  const primary: EvidenceCard[] = [];
  const supporting: EvidenceCard[] = [];
  const backgroundOnly: EvidenceCard[] = [];

  for (const card of evidenceCards) {
    const entry = sourceRegistryByName[card.source_name];
    if (!entry || entry.sourceTrustTier === "background-only") {
      backgroundOnly.push(card);
    } else if (isPrimaryEvidenceTier(entry.sourceTrustTier)) {
      primary.push(card);
    } else {
      supporting.push(card);
    }
  }

  return {
    primary: primary.sort(compareCardsByTrust),
    supporting: supporting.sort(compareCardsByTrust),
    backgroundOnly: backgroundOnly.sort(compareCardsByTrust)
  };
}

function rankEntriesByTier(tiers: SourceTrustTier[]) {
  return rankEntries(sourceRegistry.filter((entry) => tiers.includes(entry.sourceTrustTier)));
}

function rankEntries(entries: SourceRegistryEntry[]) {
  return [...entries].sort((left, right) => sourceTierScore(right.sourceTrustTier) - sourceTierScore(left.sourceTrustTier));
}

function compareCardsByTrust(left: EvidenceCard, right: EvidenceCard): number {
  const leftEntry = sourceRegistryByName[left.source_name];
  const rightEntry = sourceRegistryByName[right.source_name];
  return (
    sourceTierScore(rightEntry?.sourceTrustTier ?? "background-only") +
    right.confidence -
    (sourceTierScore(leftEntry?.sourceTrustTier ?? "background-only") + left.confidence)
  );
}

function sourceTierScore(tier: SourceTrustTier): number {
  const scores: Record<SourceTrustTier, number> = {
    "official-statistical": 100,
    "official-policy": 96,
    "peer-reviewed": 92,
    "research-institution": 82,
    "think-tank": 70,
    "consulting-methodology": 58,
    "public-comment": 48,
    "news-media": 42,
    "social-signal": 25,
    "background-only": 5
  };
  return scores[tier];
}

function getEntry(sourceId: string): SourceRegistryEntry | undefined {
  return sourceRegistry.find((entry) => entry.id === sourceId || entry.name === (sourceId as SourceName));
}
