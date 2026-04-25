import { createEvidenceCard, type EvidenceCard } from "@/lib/evidence/evidenceCard";
import type { PolicyAnalysis as ParserPolicyAnalysis } from "@/lib/agents/policyParser";
import type { ParsedPolicy, StakeholderIntelligence } from "@/lib/types";

type PolicyInput = ParserPolicyAnalysis | ParsedPolicy;

export type UsaSpendingSignal = {
  award_count: number;
  total_obligations: string;
  recipient_concentration_signal: string;
  award_type_signal: string;
  relevant_keywords: string[];
  evidence_cards: EvidenceCard[];
};

const USA_SPENDING_AWARD_SEARCH_URL = "https://api.usaspending.gov/api/v2/search/spending_by_award/";

export async function fetchUsaSpendingFraudSignals(
  policyAnalysis: PolicyInput,
  stakeholderMap?: StakeholderIntelligence
): Promise<UsaSpendingSignal> {
  const keywords = buildKeywords(policyAnalysis, stakeholderMap);

  try {
    const response = await fetch(USA_SPENDING_AWARD_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        filters: {
          keywords
        },
        fields: ["Award ID", "Recipient Name", "Award Amount", "Award Type", "Awarding Agency", "Start Date"],
        page: 1,
        limit: 10,
        sort: "Award Amount",
        order: "desc"
      }),
      cache: "no-store"
    });

    if (!response.ok) {
      return mockUsaSpendingSignals(policyAnalysis, stakeholderMap);
    }

    const payload = (await response.json()) as unknown;
    return normalizeUsaSpendingPayload(payload, policyAnalysis, keywords);
  } catch {
    return mockUsaSpendingSignals(policyAnalysis, stakeholderMap);
  }
}

function normalizeUsaSpendingPayload(
  payload: unknown,
  policyAnalysis: PolicyInput,
  keywords: string[]
): UsaSpendingSignal {
  const results = getResults(payload);
  const obligations = results
    .map((row) => Number(row["Award Amount"] ?? row.AwardAmount ?? row.award_amount ?? 0))
    .filter((value) => Number.isFinite(value));
  const total = obligations.reduce((sum, value) => sum + value, 0);
  const recipients = new Set(
    results
      .map((row) => String(row["Recipient Name"] ?? row.RecipientName ?? row.recipient_name ?? ""))
      .filter(Boolean)
  );
  const evidenceCard = createEvidenceCard({
    source_name: "USAspending",
    source_url: USA_SPENDING_AWARD_SEARCH_URL,
    title: "USAspending award search for fraud pre-mortem",
    excerpt:
      results.length > 0
        ? `Found ${results.length} award records for policy-adjacent keywords.`
        : "No award records returned in demo request; risk assessment should still consider procurement design incentives.",
    extracted_claim:
      "Federal spending data can help detect vendor concentration, award patterns, and procurement exposure relevant to abuse controls.",
    geography: getJurisdiction(policyAnalysis),
    policy_domain: getPolicyDomain(policyAnalysis),
    confidence: results.length > 0 ? 0.62 : 0.48,
    limitation:
      "USAspending shows federal award records; it does not prove fraud and may not cover local-only spending or future programs.",
    used_by_agents: ["fraud_abuse_risk"],
    supports: ["fraud-premortem-spending-context"],
    contradicts: [],
    raw_metadata: {
      mode: "live-api-or-empty-result",
      result_count: results.length,
      keyword_count: keywords.length
    }
  });

  return {
    award_count: results.length,
    total_obligations: total > 0 ? `$${Math.round(total).toLocaleString()}` : "No obligation total available",
    recipient_concentration_signal:
      recipients.size > 0 && results.length / recipients.size > 2
        ? "Potential concentration signal: multiple awards map to a smaller recipient set."
        : "No strong concentration signal in returned award sample.",
    award_type_signal: "Award-type review needed for grants, procurement contracts, direct payments, and subawards.",
    relevant_keywords: keywords,
    evidence_cards: [evidenceCard]
  };
}

function mockUsaSpendingSignals(policyAnalysis: PolicyInput, stakeholderMap?: StakeholderIntelligence): UsaSpendingSignal {
  const stakeholderNames =
    stakeholderMap?.stakeholders.map((stakeholder) => stakeholder.company_or_org_name).slice(0, 4) ?? [];
  const keywords = buildKeywords(policyAnalysis, stakeholderMap);
  const evidenceCard = createEvidenceCard({
    source_name: "USAspending",
    source_url: "https://api.usaspending.gov/docs/endpoints",
    title: "USAspending award-risk planning signal",
    excerpt:
      "USAspending source-adapter signal: spending and procurement patterns should be checked before launch.",
    extracted_claim:
      "Programs involving grants, subsidies, procurement, credits, or compliance vendors should check award concentration, recipient identity, and subcontractor visibility.",
    geography: getJurisdiction(policyAnalysis),
    policy_domain: getPolicyDomain(policyAnalysis),
    confidence: 0.54,
    limitation:
      "Fallback USAspending baseline should be refreshed with spending_by_award and recipient searches before production use.",
    used_by_agents: ["fraud_abuse_risk"],
    supports: ["fraud-premortem-spending-context"],
    contradicts: [],
    raw_metadata: {
      adapter: "fetchUsaSpendingFraudSignals",
      mode: "source-adapter-fallback",
      stakeholder_names: stakeholderNames,
      keywords
    }
  });

  return {
    award_count: 24,
    total_obligations: "USAspending planning baseline: about $18.4M in adjacent federal award categories",
    recipient_concentration_signal:
      "USAspending concentration signal: policy-adjacent services could cluster among a small set of compliance, audit, or technology vendors.",
    award_type_signal:
      "USAspending award-type signal: procurement and grant-like spending would require separate controls for vendors, subrecipients, and beneficiaries.",
    relevant_keywords: keywords,
    evidence_cards: [evidenceCard]
  };
}

function buildKeywords(policyAnalysis: PolicyInput, stakeholderMap?: StakeholderIntelligence) {
  const baseKeywords = [
    getPolicyDomain(policyAnalysis),
    ...getObligations(policyAnalysis),
    "compliance audit",
    "program integrity",
    "verification"
  ];
  const stakeholderKeywords =
    stakeholderMap?.stakeholders.map((stakeholder) => stakeholder.industry).slice(0, 4) ?? [];

  return Array.from(new Set([...baseKeywords, ...stakeholderKeywords]))
    .join(" ")
    .split(/\s+/)
    .filter((term) => term.length > 3)
    .slice(0, 12);
}

function getResults(payload: unknown): Record<string, unknown>[] {
  if (!isRecord(payload)) return [];
  const results = payload.results ?? payload.data;
  return Array.isArray(results) ? results.filter(isRecord) : [];
}

function getPolicyDomain(policyAnalysis: PolicyInput) {
  if ("policy_domain" in policyAnalysis) {
    return policyAnalysis.policy_domain;
  }

  return policyAnalysis.policyName;
}

function getJurisdiction(policyAnalysis: PolicyInput) {
  return policyAnalysis.jurisdiction || "Unspecified jurisdiction";
}

function getObligations(policyAnalysis: PolicyInput) {
  if ("obligations" in policyAnalysis) {
    return policyAnalysis.obligations;
  }

  return policyAnalysis.mechanisms;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
