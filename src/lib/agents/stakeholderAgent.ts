import { mergeEvidenceCards, rankEvidenceCards, type EvidenceCard } from "@/lib/evidence/evidenceCard";
import type { PolicyAnalysis as ParserPolicyAnalysis } from "@/lib/agents/policyParser";
import { callOpenAIJson } from "@/lib/llm/openai";
import { MODEL_CONFIG } from "@/lib/llm/modelRouter";
import { STAKEHOLDER_AGENT_SYSTEM_PROMPT, buildStakeholderPrompt } from "@/lib/llm/prompts";
import type { LLMMode } from "@/lib/llm/llmTypes";
import {
  createCrustDataEvidenceCard,
  enrichCompanyByNameOrDomain,
  getCompanySocialPosts,
  getCompanySignals,
  getCrustDataRuntimeStatus,
  resetCrustDataRuntimeStatus,
  searchCompaniesByPolicy,
  searchPeopleByCompanyAndTitles,
  type CrustDataCompany,
  type CrustDataCompanySignal,
  type CrustDataPerson,
  type CrustDataPost
} from "@/lib/sources/crustdata";
import { sourcePlaceholders } from "@/lib/sources/publicSignals";
import type {
  EvidenceSource,
  ParsedPolicy,
  RelevantPerson,
  StakeholderEntity,
  StakeholderInfluenceLevel,
  StakeholderIntelligence,
  StakeholderPosition,
  StakeholderProfile,
  StakeholderType
} from "@/lib/types";
import type {
  Stakeholder,
  StakeholderKind,
  StakeholderLevel,
  StakeholderLikelyPosition
} from "@/lib/types/stakeholders";

type PolicyInput = ParserPolicyAnalysis | ParsedPolicy;

const stakeholderSource: EvidenceSource = {
  id: "src-crustdata-stakeholder-agent",
  label: "CrustData stakeholder intelligence layer",
  type: "crustdata-placeholder",
  detail:
    "CrustData powers company, people, hiring, growth, and organization signals for stakeholder intelligence only.",
  confidence: 0.68
};

export async function buildStakeholderMap(
  policyAnalysis: PolicyInput,
  mode: LLMMode = "demo",
  upstreamEvidenceCards: EvidenceCard[] = []
): Promise<StakeholderIntelligence> {
  resetCrustDataRuntimeStatus();
  const companies = await searchCompaniesByPolicy(policyAnalysis);
  const stakeholders = await Promise.all(companies.map((company) => buildStakeholderProfile(company, policyAnalysis)));
  const stakeholderObjects = stakeholders.map((stakeholder) => stakeholderToStakeholderObject(stakeholder));
  const evidenceCards = rankEvidenceCards(
    mergeEvidenceCards(stakeholders.flatMap((stakeholder) => stakeholder.evidence_cards)),
    {
      preferred_agents: ["stakeholder_intelligence"],
      preferred_geography: getJurisdiction(policyAnalysis),
      preferred_policy_domain: getPolicyDomain(policyAnalysis),
      minimum_confidence: 0.35
    }
  );
  const entities = stakeholders.map(stakeholderToLegacyEntity);
  const confidence = roundConfidence(
    stakeholders.reduce((sum, stakeholder) => sum + stakeholder.confidence, 0) / Math.max(1, stakeholders.length)
  );

  const fallback: StakeholderIntelligence = {
    summary:
      "CrustData-powered stakeholder intelligence identifies organizations likely to influence, amplify, or operationalize public reaction. It informs the people-sentiment strategy but does not replace sentiment forecasting.",
    dataMode: getCrustDataRuntimeStatus().usedLiveData ? "live-api" : "mock-fallback",
    stakeholders,
    stakeholderObjects,
    crustDataStatus: getCrustDataRuntimeStatus(),
    entities,
    assumptions: buildAssumptions(policyAnalysis),
    evidenceCards,
    confidence,
    sources: [stakeholderSource, sourcePlaceholders.publicListening, sourcePlaceholders.laborMarket]
  };

  if (!("policy_title" in policyAnalysis)) {
    return fallback;
  }

  const refined = await callOpenAIJson<StakeholderIntelligence>({
    model: MODEL_CONFIG.stakeholderAgent,
    systemPrompt: STAKEHOLDER_AGENT_SYSTEM_PROMPT,
    userPrompt: buildStakeholderPrompt(policyAnalysis, fallback, [...upstreamEvidenceCards, ...evidenceCards]),
    schemaName: "StakeholderMap",
    fallback,
    mode
  });

  return {
    ...refined,
    stakeholderObjects,
    crustDataStatus: fallback.crustDataStatus,
    evidenceCards: refined.evidenceCards?.length ? refined.evidenceCards : evidenceCards,
    dataMode: fallback.dataMode
  };
}

async function buildStakeholderProfile(
  company: CrustDataCompany,
  policyAnalysis: PolicyInput
): Promise<StakeholderProfile> {
  const enrichedCompany = await enrichCompanyByNameOrDomain({ name: company.name, domain: company.domain });
  const companyForProfile = mergeCompanySignals(company, enrichedCompany);
  const stakeholderType = inferStakeholderType(companyForProfile, policyAnalysis);
  const relevantPeople = await searchPeopleByCompanyAndTitles({
    companyName: companyForProfile.name,
    titles: getRelevantTitles(stakeholderType)
  });
  const posts = await getCompanySocialPosts({
    companyName: companyForProfile.name,
    companyLinkedinUrl: companyForProfile.linkedinUrl,
    keyword: getPolicyDomain(policyAnalysis)
  });
  const signals = getCompanySignals(companyForProfile);
  const evidenceCards = buildStakeholderEvidenceCards(
    companyForProfile,
    relevantPeople,
    posts,
    signals,
    policyAnalysis,
    stakeholderType
  );
  const influenceLevel = scoreInfluenceLevel(companyForProfile, relevantPeople, posts, policyAnalysis);
  const likelyPosition = inferLegacyPosition(companyForProfile, signals, posts, policyAnalysis);

  return {
    company_or_org_name: companyForProfile.name,
    stakeholder_type: stakeholderType,
    industry: companyForProfile.industry ?? getPolicyDomain(policyAnalysis),
    location: companyForProfile.headquarters ?? getJurisdiction(policyAnalysis),
    size_signal: formatSizeSignal(companyForProfile),
    growth_signal: formatGrowthSignal(companyForProfile, signals, posts),
    likely_position: likelyPosition,
    influence_level: influenceLevel,
    reason_affected: reasonAffected(companyForProfile, policyAnalysis, likelyPosition),
    relevant_people: relevantPeople.map((person) => toRelevantPerson(person, companyForProfile.name)),
    evidence_cards: evidenceCards,
    confidence: roundConfidence(average([companyConfidence(companyForProfile), averagePeopleConfidence(relevantPeople), posts.length ? 0.58 : 0.48]))
  };
}

function buildStakeholderEvidenceCards(
  company: CrustDataCompany,
  relevantPeople: CrustDataPerson[],
  posts: CrustDataPost[],
  signals: CrustDataCompanySignal[],
  policyAnalysis: PolicyInput,
  stakeholderType: StakeholderType
) {
  const policyDomain = getPolicyDomain(policyAnalysis);
  const geography = company.headquarters ?? getJurisdiction(policyAnalysis);
  const companyCard = createCrustDataEvidenceCard({
    companyName: company.name,
    sourceType: "stakeholder-company-data",
    title: `${company.name} company stakeholder profile`,
    excerpt: `${company.name} matched policy stakeholder terms in ${company.industry ?? policyDomain}. ${company.description ?? ""}`.trim(),
    extractedClaim: `${company.name} is likely to be affected by ${policyDomain}; public position is not confirmed unless supported by a post/news source.`,
    geography,
    policyDomain,
    confidence: companyConfidence(company),
    sourceUrl: company.linkedinUrl ?? company.domain ?? "https://crustdata.com/",
    rawMetadata: {
      stakeholder_type: stakeholderType,
      company,
      signals
    }
  });
  const peopleCard =
    relevantPeople.length > 0
      ? createCrustDataEvidenceCard({
          companyName: company.name,
          sourceType: "stakeholder-people-data",
          title: `${company.name} relevant decision-makers`,
          excerpt: relevantPeople
            .slice(0, 3)
            .map((person) => `${person.name}${person.title ? `, ${person.title}` : ""}`)
            .join("; "),
          extractedClaim: `${company.name} has policy-relevant leadership titles to consult; relevance is inferred from title and company role.`,
          geography,
          policyDomain,
          confidence: averagePeopleConfidence(relevantPeople),
          sourceUrl: relevantPeople[0]?.linkedinUrl ?? company.linkedinUrl ?? "https://crustdata.com/",
          rawMetadata: { people: relevantPeople }
        })
      : null;
  const postCard =
    posts.length > 0
      ? createCrustDataEvidenceCard({
          companyName: company.name,
          sourceType: "stakeholder-social-signal",
          title: `${company.name} public activity signal`,
          excerpt: posts
            .slice(0, 2)
            .map((post) => post.text)
            .join(" "),
          extractedClaim: `${company.name} has public activity signals relevant to stakeholder monitoring; this does not confirm an official policy position.`,
          geography,
          policyDomain,
          confidence: posts.some((post) => post.source === "crustdata") ? 0.58 : 0.42,
          sourceUrl: posts.find((post) => post.url)?.url ?? company.linkedinUrl ?? "https://crustdata.com/",
          rawMetadata: { posts }
        })
      : null;
  const signalCards = signals.slice(0, 3).map((signal) =>
    createCrustDataEvidenceCard({
      companyName: company.name,
      sourceType: "stakeholder-company-data",
      title: `${company.name} ${signal.label}`,
      excerpt: signal.value,
      extractedClaim: `${signal.label}: ${signal.value}`,
      geography,
      policyDomain,
      confidence: signal.confidence,
      sourceUrl: company.linkedinUrl ?? company.domain ?? "https://crustdata.com/",
      rawMetadata: { signal }
    })
  );
  const enrichedEvidence = [companyCard, peopleCard, postCard, ...signalCards].filter(Boolean) as EvidenceCard[];

  return rankEvidenceCards(enrichedEvidence, {
    preferred_agents: ["stakeholder_intelligence"],
    preferred_geography: getJurisdiction(policyAnalysis),
    preferred_policy_domain: getPolicyDomain(policyAnalysis)
  });
}

function stakeholderToLegacyEntity(stakeholder: StakeholderProfile): StakeholderEntity {
  return {
    name: stakeholder.company_or_org_name,
    type: stakeholderTypeToLegacyType(stakeholder.stakeholder_type),
    sector: stakeholder.industry,
    likelyRole: stakeholder.reason_affected,
    estimatedDcExposure: `${stakeholder.location}; ${stakeholder.size_signal}`,
    influenceScore: influenceLevelToScore(stakeholder.influence_level),
    adoptionReadiness: positionToAdoptionReadiness(stakeholder.likely_position),
    likelyPosition: stakeholder.likely_position,
    riskSignal: stakeholder.growth_signal,
    nextBestAction: nextBestAction(stakeholder),
    confidence: stakeholder.confidence,
    sources: [stakeholderSource]
  };
}

function stakeholderTypeToLegacyType(type: StakeholderType): StakeholderEntity["type"] {
  if (type === "civil_rights_organization") return "advocacy";
  if (type === "worker_advocacy_group") return "labor";
  if (type === "chamber_of_commerce" || type === "trade_group") return "trade-group";
  if (type === "government_agency") return "agency";
  return "company";
}

function influenceLevelToScore(level: StakeholderInfluenceLevel) {
  const scores: Record<StakeholderInfluenceLevel, number> = {
    Low: 35,
    Medium: 58,
    High: 76,
    "Very High": 88
  };

  return scores[level];
}

function positionToAdoptionReadiness(position: StakeholderPosition) {
  const scores: Record<StakeholderPosition, number> = {
    Supportive: 82,
    Conditional: 64,
    Concerned: 46,
    Opposed: 28
  };

  return scores[position];
}

function nextBestAction(stakeholder: StakeholderProfile) {
  if (stakeholder.stakeholder_type === "hr_tech_vendor" || stakeholder.stakeholder_type === "recruiting_platform") {
    return "Request technical feedback on disclosure workflow, audit evidence, applicant notice, and appeal records.";
  }

  if (stakeholder.stakeholder_type === "chamber_of_commerce") {
    return "Pre-brief on phased compliance, small-employer templates, and first-year cure-period design.";
  }

  if (
    stakeholder.stakeholder_type === "civil_rights_organization" ||
    stakeholder.stakeholder_type === "worker_advocacy_group"
  ) {
    return "Co-design minimum audit summary, appeal deadlines, and public accountability language.";
  }

  if (stakeholder.stakeholder_type === "compliance_consultant") {
    return "Validate audit methodology, safe-harbor templates, and implementation support capacity.";
  }

  return "Track stakeholder position and collect evidence before final policy claims.";
}

function getRelevantTitles(type: StakeholderType) {
  const titles: Record<StakeholderType, string[]> = {
    hr_tech_vendor: ["Chief Legal Officer", "Responsible AI", "Public Policy", "Product Compliance"],
    recruiting_platform: ["General Counsel", "VP Product", "Compliance", "Public Policy"],
    enterprise_employer: ["Chief Human Resources Officer", "Talent Acquisition", "Employment Counsel"],
    compliance_consultant: ["AI Governance", "Risk Advisory", "Regulatory Compliance"],
    chamber_of_commerce: ["Policy Director", "Government Affairs", "President"],
    civil_rights_organization: ["Policy Director", "Legal Director", "Advocacy Director"],
    worker_advocacy_group: ["Policy Director", "Research Director", "Advocacy Lead"],
    government_agency: ["Director", "Chief Data Officer", "Enforcement"],
    trade_group: ["Government Affairs", "Policy Director", "President"],
    other: ["Public Policy", "Government Affairs", "Compliance"]
  };

  return titles[type];
}

function mergeCompanySignals(base: CrustDataCompany, enriched: CrustDataCompany | null): CrustDataCompany {
  if (!enriched) return base;

  return {
    ...base,
    ...enriched,
    description: enriched.description ?? base.description,
    industry: enriched.industry ?? base.industry,
    headquarters: enriched.headquarters ?? base.headquarters,
    employeeCount: enriched.employeeCount ?? base.employeeCount,
    headcountGrowth: enriched.headcountGrowth ?? base.headcountGrowth,
    source: enriched.source === "crustdata" || base.source === "crustdata" ? "crustdata" : "mock"
  };
}

function averagePeopleConfidence(people: CrustDataPerson[]) {
  if (people.length === 0) {
    return 0.45;
  }

  return people.some((person) => person.source === "crustdata") ? 0.62 : 0.46;
}

function stakeholderToStakeholderObject(stakeholder: StakeholderProfile): Stakeholder {
  return {
    id: slugId(stakeholder.company_or_org_name),
    name: stakeholder.company_or_org_name,
    type: toStakeholderKind(stakeholder.stakeholder_type),
    category: stakeholder.stakeholder_type.replaceAll("_", " "),
    industry: stakeholder.industry,
    location: stakeholder.location,
    likelyPosition: toModernPosition(stakeholder.likely_position),
    influenceLevel: toModernLevel(stakeholder.influence_level),
    exposureLevel: exposureLevel(stakeholder),
    reasonAffected: stakeholder.reason_affected,
    signals: {
      hiring: extractSignal(stakeholder, "Hiring signal"),
      headcount: stakeholder.size_signal,
      news: extractSignal(stakeholder, "News / market signal"),
      socialPosts: stakeholder.evidence_cards
        .filter((card) => card.source_type === "stakeholder-social-signal")
        .map((card) => card.excerpt)
        .slice(0, 3),
      webTraffic: extractSignal(stakeholder, "Web traffic"),
      funding: extractSignal(stakeholder, "Funding")
    },
    relevantPeople: stakeholder.relevant_people.map((person) => ({
      name: person.name,
      title: person.title,
      linkedinUrl: person.public_profile_url,
      reasonRelevant: person.relevance
    })),
    evidenceCardIds: stakeholder.evidence_cards.map((card) => card.id),
    source: stakeholder.evidence_cards.some((card) => card.raw_metadata.mode === "live-api") ? "crustdata" : "mock",
    confidence: stakeholder.confidence
  };
}

function inferStakeholderType(company: CrustDataCompany, policyAnalysis: PolicyInput): StakeholderType {
  void policyAnalysis;
  const text = `${company.name} ${company.industry ?? ""} ${company.description ?? ""}`.toLowerCase();
  if (/chamber/.test(text)) return "chamber_of_commerce";
  if (/trade association|association|coalition/.test(text) && /industry|plastic|retail|business/.test(text)) return "trade_group";
  if (/aclu|civil rights|rights|equity/.test(text)) return "civil_rights_organization";
  if (/worker|labor|employment law|job seeker/.test(text)) return "worker_advocacy_group";
  if (/consult|audit|deloitte|pwc|kpmg|ey|compliance/.test(text)) return "compliance_consultant";
  if (/ats|applicant tracking|recruiting|talent acquisition|greenhouse|icims/.test(text)) return "recruiting_platform";
  if (/hr|hiring|assessment|workday|hirevue|workforce/.test(text)) return "hr_tech_vendor";
  if (/agency|department|office of/.test(text)) return "government_agency";
  if (/employer|enterprise/.test(text)) return "enterprise_employer";
  return "other";
}

function scoreInfluenceLevel(
  company: CrustDataCompany,
  people: CrustDataPerson[],
  posts: CrustDataPost[],
  policyAnalysis: PolicyInput
): StakeholderInfluenceLevel {
  let score = 0;
  const text = `${company.name} ${company.industry ?? ""} ${company.description ?? ""}`.toLowerCase();
  if (/workday|deloitte|chamber|association|coalition|national|aclu/.test(text)) score += 32;
  if (/large|enterprise|national|cross-sector|broad/.test(String(company.employeeCount).toLowerCase())) score += 20;
  if (typeof company.employeeCount === "number") score += company.employeeCount > 5000 ? 24 : company.employeeCount > 500 ? 14 : 6;
  if (company.source === "crustdata") score += 12;
  if (people.length > 0) score += 10;
  if (posts.some((post) => post.source === "crustdata")) score += 8;
  if (isGeographicallyRelevant(company, policyAnalysis)) score += 8;
  if (score >= 78) return "Very High";
  if (score >= 58) return "High";
  if (score >= 36) return "Medium";
  return "Low";
}

function inferLegacyPosition(
  company: CrustDataCompany,
  signals: CrustDataCompanySignal[],
  posts: CrustDataPost[],
  policyAnalysis: PolicyInput
): StakeholderPosition {
  const text = `${company.name} ${company.industry ?? ""} ${company.description ?? ""} ${signals
    .map((signal) => signal.value)
    .join(" ")} ${posts.map((post) => post.text).join(" ")}`.toLowerCase();
  const policyText = getQueryText(policyAnalysis).toLowerCase();

  if (/chamber|retail|employer|plastic|manufacturer|trade association/.test(text)) {
    return "Concerned";
  }
  if (/civil rights|worker|environmental|advocacy|reusable|sustainable|compliance consulting|audit advisory/.test(text)) {
    return "Supportive";
  }
  if (/vendor|supplier|consult|audit|software|platform/.test(text) && /compliance|transparency|subsidy|standard/.test(policyText)) {
    return "Conditional";
  }
  return "Conditional";
}

function formatSizeSignal(company: CrustDataCompany): string {
  if (typeof company.employeeCount === "number") return `${company.employeeCount.toLocaleString("en-US")} employees reported by stakeholder source.`;
  return company.employeeCount ? String(company.employeeCount) : "Company size signal not reported.";
}

function formatGrowthSignal(company: CrustDataCompany, signals: CrustDataCompanySignal[], posts: CrustDataPost[]): string {
  const growth = company.headcountGrowth ?? signals.find((signal) => signal.type === "headcount")?.value;
  const social = posts[0]?.text;
  return [growth, company.hiringSignal, company.newsSignal, social ? `Public activity: ${social}` : undefined]
    .filter(Boolean)
    .join(" ");
}

function reasonAffected(company: CrustDataCompany, policyAnalysis: PolicyInput, likelyPosition: StakeholderPosition): string {
  const policyDomain = getPolicyDomain(policyAnalysis);
  const positionLanguage: Record<StakeholderPosition, string> = {
    Supportive: "may support or benefit if implementation preserves the policy goal",
    Conditional: "may engage conditionally depending on implementation details",
    Concerned: "may oppose or seek changes due to compliance burden or market disruption",
    Opposed: "may oppose due to direct burden"
  };

  return `${company.name} ${positionLanguage[likelyPosition]} in ${policyDomain}. Public position is not confirmed unless direct posts or news evidence say so.`;
}

function toRelevantPerson(person: CrustDataPerson, companyName: string): RelevantPerson {
  return {
    name: person.name,
    title: person.title ?? "Relevant leader",
    company: person.companyName ?? companyName,
    location: person.location,
    public_profile_url: person.linkedinUrl,
    relevance: "Matched CrustData people search for policy-relevant leadership, legal, compliance, policy, or public affairs titles.",
    confidence: person.source === "crustdata" ? 0.62 : 0.44
  };
}

function companyConfidence(company: CrustDataCompany): number {
  return company.source === "crustdata" ? 0.68 : 0.52;
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function isGeographicallyRelevant(company: CrustDataCompany, policyAnalysis: PolicyInput): boolean {
  return `${company.headquarters ?? ""} ${getJurisdiction(policyAnalysis)}`.toLowerCase().includes("dc");
}

function toStakeholderKind(type: StakeholderType): StakeholderKind {
  if (type === "chamber_of_commerce" || type === "trade_group") return "trade_group";
  if (type === "civil_rights_organization" || type === "worker_advocacy_group") return "advocacy_group";
  if (type === "government_agency") return "agency";
  if (type === "other") return "other";
  return "company";
}

function toModernPosition(position: StakeholderPosition): StakeholderLikelyPosition {
  if (position === "Supportive") return "support";
  if (position === "Concerned" || position === "Opposed") return "oppose";
  if (position === "Conditional") return "mixed";
  return "unknown";
}

function toModernLevel(level: StakeholderInfluenceLevel): StakeholderLevel {
  if (level === "Very High" || level === "High") return "high";
  if (level === "Medium") return "medium";
  return "low";
}

function exposureLevel(stakeholder: StakeholderProfile): StakeholderLevel {
  if (/direct|customer|compliance|demand|audit|regulated|burden/i.test(stakeholder.reason_affected)) return "high";
  if (/indirect|advocacy|consult|monitor/i.test(stakeholder.reason_affected)) return "medium";
  return "low";
}

function extractSignal(stakeholder: StakeholderProfile, label: string): string | undefined {
  return stakeholder.evidence_cards.find((card) => card.title.includes(label))?.excerpt;
}

function slugId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function buildAssumptions(policyAnalysis: PolicyInput) {
  return [
    "CrustData is used only for stakeholder intelligence: company, people, growth, hiring, and organizational influence signals.",
    "People sentiment remains the primary EconoSense product layer; stakeholder intelligence explains likely amplifiers and implementers.",
    process.env.CRUSTDATA_API_KEY
      ? "Live CrustData mode is enabled; source evidence still needs source-specific review before final claims."
      : "CRUSTDATA_API_KEY is missing, so realistic mock stakeholder data is returned for the demo.",
    `Stakeholder relevance is scoped to ${getJurisdiction(policyAnalysis)} and ${getPolicyDomain(policyAnalysis)}.`
  ];
}

function getPolicyDomain(policyAnalysis: PolicyInput) {
  if ("policy_domain" in policyAnalysis) {
    return policyAnalysis.policy_domain;
  }

  return policyAnalysis.policyName;
}

function getQueryText(policyAnalysis: PolicyInput) {
  if ("policyText" in policyAnalysis) {
    return policyAnalysis.policyText;
  }

  return [
    policyAnalysis.policy_title,
    policyAnalysis.policy_domain,
    policyAnalysis.obligations.join(" "),
    policyAnalysis.affected_companies_query_terms.join(" "),
    policyAnalysis.sentiment_triggers.join(" ")
  ].join(" ");
}

function getJurisdiction(policyAnalysis: PolicyInput) {
  return policyAnalysis.jurisdiction || "Unspecified jurisdiction";
}

function roundConfidence(value: number) {
  return Math.round(value * 100) / 100;
}
