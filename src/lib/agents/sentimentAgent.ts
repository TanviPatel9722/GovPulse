import { createEvidenceCard, rankEvidenceCards, type EvidenceCard } from "@/lib/evidence/evidenceCard";
import type { PolicyAnalysis as ParserPolicyAnalysis } from "@/lib/agents/policyParser";
import { sourcePlaceholders } from "@/lib/sources/publicSignals";
import { callOpenAIJson } from "@/lib/llm/openai";
import { MODEL_CONFIG } from "@/lib/llm/modelRouter";
import { SENTIMENT_AGENT_SYSTEM_PROMPT, buildSentimentPrompt } from "@/lib/llm/prompts";
import type { LLMMode } from "@/lib/llm/llmTypes";
import type {
  EconomicExposure,
  ParsedPolicy,
  PublicSentimentGroup,
  SentimentForecast,
  SentimentGroupForecast,
  StakeholderIntelligence
} from "@/lib/types";

type PolicyInput = ParserPolicyAnalysis | ParsedPolicy;

export type SentimentForecastInput = {
  policyAnalysis: PolicyInput;
  evidenceCards: EvidenceCard[];
  economicExposure?: EconomicExposure;
  stakeholderMap?: StakeholderIntelligence;
  mode?: LLMMode;
};

export async function buildSentimentForecast(input: SentimentForecastInput): Promise<SentimentForecast> {
  const fallback = forecastPeopleSentiment(input);

  if (!("policy_title" in input.policyAnalysis)) {
    return fallback;
  }

  return callOpenAIJson<SentimentForecast>({
    model: MODEL_CONFIG.sentimentAgent,
    systemPrompt: SENTIMENT_AGENT_SYSTEM_PROMPT,
    userPrompt: buildSentimentPrompt(input.policyAnalysis, input.evidenceCards),
    schemaName: "SentimentForecast",
    fallback,
    mode: input.mode
  });
}

export function forecastPeopleSentiment(input: SentimentForecastInput): SentimentForecast {
  const evidenceCards = ensureSentimentEvidence(input.policyAnalysis, input.evidenceCards);
  const rankedEvidence = rankEvidenceCards(evidenceCards, {
    preferred_agents: ["sentiment_forecast", "stakeholder_intelligence"],
    preferred_geography: getJurisdiction(input.policyAnalysis),
    preferred_policy_domain: getPolicyDomain(input.policyAnalysis),
    minimum_confidence: 0.25
  });

  const publicGroups = buildPolicyDerivedSentimentGroups(input, rankedEvidence);

  return {
    overall_sentiment_summary: buildOverallSummary(publicGroups, rankedEvidence),
    public_groups: publicGroups,
    support_narratives: buildSupportNarratives(input.policyAnalysis, publicGroups),
    opposition_narratives: buildOppositionNarratives(input.policyAnalysis, publicGroups),
    misinformation_or_confusion_risks: buildMisinformationRisks(input.policyAnalysis, publicGroups),
    media_framing_risks: buildMediaFramingRisks(input.policyAnalysis, publicGroups),
    validation_questions: buildSentimentValidationQuestions(input.policyAnalysis, publicGroups)
  };
}

function buildPolicyDerivedSentimentGroups(input: SentimentForecastInput, evidenceCards: EvidenceCard[]): PublicSentimentGroup[] {
  const policyText = getPolicyText(input.policyAnalysis);
  const groups = unique([
    ...getAffectedGroups(input.policyAnalysis),
    ...inferAdditionalPeopleGroups(policyText)
  ])
    .filter((group) => group.trim().length > 0)
    .sort((left, right) => groupPolicyPriority(right, policyText) - groupPolicyPriority(left, policyText))
    .slice(0, 9);

  const fallbackGroups = groups.length > 0 ? groups : ["directly affected residents", "regulated entities", "implementing agency staff"];

  return fallbackGroups.map((groupName) => buildSentimentGroupForPolicy(groupName, input, evidenceCards));
}

function buildSentimentGroupForPolicy(
  groupName: string,
  input: SentimentForecastInput,
  evidenceCards: EvidenceCard[]
): PublicSentimentGroup {
  const evidenceIds = getEvidenceIds(evidenceCards);
  const policyText = getPolicyText(input.policyAnalysis);
  const domain = getPolicyDomain(input.policyAnalysis);
  const role = inferGroupRole(groupName);
  const score = scoreGroupSentiment(groupName, role, policyText);
  const likelySentiment = toLikelySentiment(score);
  const confidence = confidenceForGroup(groupName, evidenceCards);
  const supportDrivers = supportDriversFor(groupName, role, policyText, domain);
  const oppositionDrivers = oppositionDriversFor(groupName, role, policyText);
  const emotionalTriggers = emotionalTriggersFor(groupName, role, policyText);
  const economicTriggers = economicTriggersFor(groupName, role, policyText, input.economicExposure?.business_exposure);
  const fairnessConcerns = fairnessConcernsFor(groupName, role, policyText);
  const trustConcerns = trustConcernsFor(role, policyText);

  return {
    group_name: normalizeGroupName(groupName),
    likely_sentiment: likelySentiment,
    sentiment_score: score,
    support_drivers: supportDrivers,
    opposition_drivers: oppositionDrivers,
    emotional_triggers: emotionalTriggers,
    economic_triggers: economicTriggers,
    fairness_concerns: fairnessConcerns,
    trust_concerns: trustConcerns,
    likely_quotes: [quoteFor(groupName, role, supportDrivers[0], oppositionDrivers[0])],
    confidence,
    assumptions: [
      validationAssumptionFor(groupName, role),
      buildEvidenceStrengthAssumption(evidenceCards)
    ],
    evidence_card_ids: evidenceIds
  };
}

export function forecastSentiment(policy: ParsedPolicy): SentimentGroupForecast[] {
  return toLegacySentimentGroups(
    forecastPeopleSentiment({
      policyAnalysis: policy,
      evidenceCards: []
    })
  );
}

export function toLegacySentimentGroups(forecast: SentimentForecast): SentimentGroupForecast[] {
  return forecast.public_groups.map((group) => {
    const supportScore = group.sentiment_score > 0 ? 50 + Math.round(group.sentiment_score / 2) : 45;
    const concernScore = group.sentiment_score < 0 ? 50 + Math.abs(Math.round(group.sentiment_score / 2)) : 40;

    return {
      group: group.group_name,
      segment: inferLegacySegment(group.group_name),
      likelyScenario: `${group.likely_sentiment} likely scenario: ${group.likely_quotes[0] ?? "Sentiment needs validation."}`,
      supportScore: clampScore(supportScore),
      concernScore: clampScore(concernScore),
      adoptionReadiness: clampScore(50 + Math.round(group.sentiment_score / 3)),
      primaryDrivers: group.support_drivers,
      riskSignals: [...group.opposition_drivers, ...group.trust_concerns].slice(0, 3),
      assumptions: group.assumptions,
      confidence: group.confidence,
      sources: [sourcePlaceholders.publicListening]
    };
  });
}

// Kept only as a legacy reference while the active fallback now derives groups from the parsed policy.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildAiHiringSentimentGroups(input: SentimentForecastInput, evidenceCards: EvidenceCard[]): PublicSentimentGroup[] {
  const evidenceIds = getEvidenceIds(evidenceCards);
  const weakEvidenceAssumption = buildEvidenceStrengthAssumption(evidenceCards);
  const employerCostSignal = input.economicExposure?.business_exposure ?? "Business compliance burden not yet validated.";
  const stakeholderNames =
    input.stakeholderMap?.stakeholders.map((stakeholder) => stakeholder.company_or_org_name).slice(0, 4).join(", ") ??
    "stakeholder map unavailable";

  return [
    {
      group_name: "job seekers",
      likely_sentiment: "positive",
      sentiment_score: 62,
      support_drivers: ["clear notice when AI affects hiring", "appeal rights", "human review", "reduced black-box screening"],
      opposition_drivers: ["fear that appeals will be symbolic", "concern that employers will still hide behind vendors"],
      emotional_triggers: ["fair chance", "dignity", "being judged by a machine", "second chance"],
      economic_triggers: ["access to jobs", "lost wages from unfair screening", "cost of prolonged job search"],
      fairness_concerns: ["bias against protected groups", "lack of explanation after rejection", "unequal access to appeal processes"],
      trust_concerns: ["whether employers will disclose plainly", "whether human review has real authority"],
      likely_quotes: [
        "If an algorithm screens me out, I should at least know and have a real person review it.",
        "Transparency sounds good, but only if the appeal is more than a form."
      ],
      confidence: 0.68,
      assumptions: [
        "Job seekers respond more strongly to usable recourse than to audit methodology language.",
        weakEvidenceAssumption
      ],
      evidence_card_ids: evidenceIds
    },
    {
      group_name: "workers",
      likely_sentiment: "positive",
      sentiment_score: 48,
      support_drivers: ["anti-discrimination signal", "workplace fairness", "accountability for automated systems"],
      opposition_drivers: ["skepticism that annual audits will change employer behavior"],
      emotional_triggers: ["fairness", "security", "fear of opaque automation"],
      economic_triggers: ["career mobility", "screening barriers", "wage access"],
      fairness_concerns: ["disparate impact", "automation reinforcing historic inequities"],
      trust_concerns: ["audit independence", "agency enforcement capacity"],
      likely_quotes: [
        "This is a step toward fairer hiring, but the city needs to prove audits have consequences."
      ],
      confidence: 0.63,
      assumptions: [
        "Worker sentiment overlaps with applicant sentiment but may be less intense for workers not actively job searching.",
        weakEvidenceAssumption
      ],
      evidence_card_ids: evidenceIds
    },
    {
      group_name: "low-income households",
      likely_sentiment: "mixed",
      sentiment_score: 28,
      support_drivers: ["better access to fair hiring", "reduced arbitrary screening", "plain-language appeal rights"],
      opposition_drivers: ["limited awareness", "concern that hiring delays could reduce job openings"],
      emotional_triggers: ["opportunity", "exclusion", "bureaucracy"],
      economic_triggers: ["household income", "time to employment", "access to entry-level roles"],
      fairness_concerns: ["digital divide in appeal processes", "language access", "unequal ability to navigate rights"],
      trust_concerns: ["whether notices are understandable", "whether appeals work without legal help"],
      likely_quotes: [
        "A right to appeal matters only if regular people can actually use it."
      ],
      confidence: 0.54,
      assumptions: [
        "Direct evidence is likely weaker for this group unless ACS, workforce, legal-aid, or community listening evidence is added.",
        weakEvidenceAssumption
      ],
      evidence_card_ids: evidenceIds
    },
    {
      group_name: "students",
      likely_sentiment: "mixed",
      sentiment_score: 34,
      support_drivers: ["more clarity in internships and entry-level hiring", "protection from opaque résumé screening"],
      opposition_drivers: ["low awareness of rule details", "uncertainty about how to appeal without harming job prospects"],
      emotional_triggers: ["first job anxiety", "fair shot", "confusion"],
      economic_triggers: ["internship access", "entry-level job access", "student debt pressure"],
      fairness_concerns: ["screening based on school prestige", "unequal résumé data", "limited work history"],
      trust_concerns: ["fear of retaliation or being labeled difficult", "unclear appeal process"],
      likely_quotes: [
        "I want to know if AI is screening my application, but I need the process to be simple."
      ],
      confidence: 0.5,
      assumptions: [
        "Student sentiment is inferred from job-seeker concerns and should be validated with campus and workforce program listening.",
        weakEvidenceAssumption
      ],
      evidence_card_ids: evidenceIds
    },
    {
      group_name: "employers",
      likely_sentiment: "negative",
      sentiment_score: -46,
      support_drivers: ["clear standards can reduce legal uncertainty", "trustworthy hiring may improve applicant confidence"],
      opposition_drivers: ["annual audit cost", "vendor dependency", "unclear coverage", "appeal workflow burden"],
      emotional_triggers: ["regulatory fatigue", "fear of penalties", "uncertainty"],
      economic_triggers: [employerCostSignal, "time-to-hire impact", "legal and procurement costs"],
      fairness_concerns: ["concern that good-faith employers may be treated like bad actors"],
      trust_concerns: ["whether agency guidance will be timely", "whether vendors will provide audit data"],
      likely_quotes: [
        "We support fair hiring, but the city needs clear thresholds and templates before enforcement starts."
      ],
      confidence: 0.66,
      assumptions: [
        `Stakeholder map includes likely employer-facing amplifiers: ${stakeholderNames}.`,
        "Employer sentiment improves materially with phased thresholds, model notices, and a first-year cure period."
      ],
      evidence_card_ids: evidenceIds
    },
    {
      group_name: "small business owners",
      likely_sentiment: "negative",
      sentiment_score: -58,
      support_drivers: ["predictable rules may prevent surprise vendor risk"],
      opposition_drivers: ["fixed compliance costs", "limited HR staff", "fear of hiring delays", "unclear vendor obligations"],
      emotional_triggers: ["overwhelm", "unfair burden", "fear of fines"],
      economic_triggers: ["audit fees", "legal review", "administrative time", "software contract changes"],
      fairness_concerns: ["one-size-fits-all compliance", "larger firms better able to absorb costs"],
      trust_concerns: ["whether government understands small-employer operations", "whether technical assistance will exist"],
      likely_quotes: [
        "This might make sense for big companies, but small employers need a simpler path."
      ],
      confidence: 0.62,
      assumptions: [
        "Small-business concern is inferred from compliance burden patterns and should be validated with chamber and employer survey evidence.",
        weakEvidenceAssumption
      ],
      evidence_card_ids: evidenceIds
    },
    {
      group_name: "advocacy groups",
      likely_sentiment: "positive",
      sentiment_score: 72,
      support_drivers: ["civil-rights enforcement", "audit transparency", "appeal rights", "public accountability"],
      opposition_drivers: ["concern that audit summaries may be too vague", "concern enforcement will be underfunded"],
      emotional_triggers: ["justice", "accountability", "rights protection"],
      economic_triggers: ["job access for historically screened-out groups", "cost of discrimination"],
      fairness_concerns: ["audit independence", "meaningful remedies", "public access to results"],
      trust_concerns: ["agency capacity", "vendor opacity", "trade-secret overuse"],
      likely_quotes: [
        "The rule is promising, but rights without deadlines and enforcement will not be enough."
      ],
      confidence: 0.71,
      assumptions: [
        "Advocacy support depends on audit transparency and enforceable appeal procedures.",
        weakEvidenceAssumption
      ],
      evidence_card_ids: evidenceIds
    },
    {
      group_name: "taxpayers",
      likely_sentiment: "uncertain",
      sentiment_score: 6,
      support_drivers: ["public trust in fair hiring", "prevention of discriminatory outcomes"],
      opposition_drivers: ["questions about agency implementation cost", "unclear public benefit if enforcement is weak"],
      emotional_triggers: ["government competence", "fairness", "waste concerns"],
      economic_triggers: ["agency staffing costs", "procurement of technical expertise", "enforcement budget"],
      fairness_concerns: ["whether benefits reach affected applicants", "whether enforcement is consistent"],
      trust_concerns: ["implementation credibility", "public reporting"],
      likely_quotes: [
        "I support fair hiring, but I want to know what this costs and whether it actually works."
      ],
      confidence: 0.49,
      assumptions: [
        "Taxpayer sentiment is likely low-salience unless the policy becomes framed around budget, waste, or government tech competence.",
        weakEvidenceAssumption
      ],
      evidence_card_ids: evidenceIds
    }
  ];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildGenericSentimentGroups(input: SentimentForecastInput, evidenceCards: EvidenceCard[]): PublicSentimentGroup[] {
  const evidenceIds = getEvidenceIds(evidenceCards);
  const weakEvidenceAssumption = buildEvidenceStrengthAssumption(evidenceCards);
  const domain = getPolicyDomain(input.policyAnalysis);

  return [
    {
      group_name: "affected residents",
      likely_sentiment: "mixed",
      sentiment_score: 18,
      support_drivers: ["visible benefits", "fair implementation", "clear eligibility or rights"],
      opposition_drivers: ["unclear costs", "confusing rules", "fear of unequal treatment"],
      emotional_triggers: ["fairness", "security", "control"],
      economic_triggers: ["household cost exposure", "access to services", "local economic effects"],
      fairness_concerns: ["unequal access", "unclear appeals", "inconsistent enforcement"],
      trust_concerns: ["government follow-through", "data quality", "plain-language communication"],
      likely_quotes: [`This ${domain} policy could help, but I need to understand who benefits and who pays.`],
      confidence: evidenceCards.length > 1 ? 0.55 : 0.42,
      assumptions: ["Generic sentiment group inferred from limited policy details.", weakEvidenceAssumption],
      evidence_card_ids: evidenceIds
    },
    {
      group_name: "small business owners",
      likely_sentiment: "mixed",
      sentiment_score: -18,
      support_drivers: ["predictable standards", "possible market stability"],
      opposition_drivers: ["compliance cost", "administrative burden", "unclear enforcement"],
      emotional_triggers: ["uncertainty", "fatigue", "risk"],
      economic_triggers: ["fees", "staff time", "vendor costs", "penalty exposure"],
      fairness_concerns: ["large entities may comply more easily", "unclear exemptions"],
      trust_concerns: ["agency responsiveness", "timeline credibility"],
      likely_quotes: ["The goal may be reasonable, but the details decide whether this is workable."],
      confidence: evidenceCards.length > 1 ? 0.52 : 0.4,
      assumptions: ["Business sentiment is inferred until employer-specific evidence is attached.", weakEvidenceAssumption],
      evidence_card_ids: evidenceIds
    },
    {
      group_name: "advocacy groups",
      likely_sentiment: "positive",
      sentiment_score: 36,
      support_drivers: ["rights protections", "accountability", "equity signal"],
      opposition_drivers: ["weak enforcement", "limited transparency", "underfunded implementation"],
      emotional_triggers: ["justice", "harm prevention", "public accountability"],
      economic_triggers: ["distribution of benefits", "cost of harm avoided"],
      fairness_concerns: ["who is left out", "who can appeal", "whether remedies are meaningful"],
      trust_concerns: ["agency capacity", "public reporting"],
      likely_quotes: ["This is a useful step if the policy includes enforceable standards and public evidence."],
      confidence: evidenceCards.length > 1 ? 0.57 : 0.44,
      assumptions: ["Advocacy sentiment is inferred from policy rights/accountability language.", weakEvidenceAssumption],
      evidence_card_ids: evidenceIds
    }
  ];
}

type GroupRole =
  | "resident"
  | "worker"
  | "consumer"
  | "business"
  | "student"
  | "patient"
  | "tenant"
  | "vendor"
  | "advocacy"
  | "agency";

function getAffectedGroups(policyAnalysis: PolicyInput): string[] {
  if ("affected_groups" in policyAnalysis) return policyAnalysis.affected_groups;
  return policyAnalysis.affectedParties;
}

function inferAdditionalPeopleGroups(policyText: string): string[] {
  const groups: string[] = [];
  if (/job applicant|job seeker|job|hiring|employment|worker|employee|recruit|resume|résumé/i.test(policyText)) groups.push("job seekers", "workers");
  else if (/applicant|application/i.test(policyText)) groups.push("applicants");
  if (/tenant|rent|housing|landlord/i.test(policyText)) groups.push("renters", "landlords");
  if (/student|school|college|university|education/i.test(policyText)) groups.push("students", "families");
  if (/patient|health|hospital|medicaid|insurance/i.test(policyText)) groups.push("patients", "healthcare workers");
  if (/small business|employer|retailer|restaurant|vendor|company/i.test(policyText)) groups.push("small business owners");
  if (/low-income|poverty|benefit|rebate|subsidy|assistance/i.test(policyText)) groups.push("low-income households");
  if (/tax|fee|budget|spending|appropriation/i.test(policyText)) groups.push("taxpayers");
  return groups;
}

function inferGroupRole(groupName: string): GroupRole {
  if (/applicant|worker|employee|job seeker|labor|workforce/i.test(groupName)) return "worker";
  if (/business|employer|retailer|restaurant|company|landlord/i.test(groupName)) return "business";
  if (/student|school|education|family/i.test(groupName)) return "student";
  if (/patient|health|medicaid|hospital/i.test(groupName)) return "patient";
  if (/tenant|renter|housing/i.test(groupName)) return "tenant";
  if (/vendor|supplier|contractor|platform|software/i.test(groupName)) return "vendor";
  if (/advocacy|civil rights|community organization|nonprofit/i.test(groupName)) return "advocacy";
  if (/agency|enforcement|staff|administrator|public-sector/i.test(groupName)) return "agency";
  if (/shopper|consumer|customer|household/i.test(groupName)) return "consumer";
  return "resident";
}

function groupPolicyPriority(groupName: string, policyText: string) {
  const genericPenalty = /^(residents|regulated entities|implementing agencies)$/i.test(groupName.trim()) ? -25 : 0;
  const directMention = labelsOverlap(policyText, groupName) ? 24 : 0;
  const specificPeople = /applicant|worker|tenant|renter|landlord|patient|student|household|consumer|family|small business|employer|provider/i.test(groupName) ? 18 : 0;
  const role = inferGroupRole(groupName);
  const roleWeight = role === "agency" ? -10 : role === "vendor" ? -6 : 8;

  return genericPenalty + directMention + specificPeople + roleWeight;
}

function scoreGroupSentiment(groupName: string, role: GroupRole, policyText: string): number {
  let score = 8;

  if (/right|appeal|recourse|transparen|notice|protect|benefit|rebate|assistance|fair|safety|access/i.test(policyText)) {
    score += role === "business" || role === "vendor" ? 8 : 24;
  }
  if (/cost|fee|tax|penalt|audit|report|certif|compliance|mandate|ban|require/i.test(policyText)) {
    score -= role === "business" || role === "vendor" ? 36 : 10;
  }
  if (/low-income|poverty|vulnerable|equity|civil rights|discrimination/i.test(policyText)) {
    score += role === "consumer" || role === "worker" || role === "tenant" || role === "patient" ? 12 : 4;
  }
  if (/small business/i.test(policyText) || /small business/i.test(groupName)) {
    score -= role === "business" ? 14 : 2;
  }
  if (role === "agency") score -= 12;
  if (role === "advocacy") score += 22;
  if (role === "vendor" && /market|demand|procurement|software|audit|consult/i.test(policyText)) score += 6;

  return Math.max(-75, Math.min(75, score));
}

function toLikelySentiment(score: number): PublicSentimentGroup["likely_sentiment"] {
  if (score >= 28) return "positive";
  if (score <= -28) return "negative";
  if (score > -12 && score < 12) return "uncertain";
  return "mixed";
}

function confidenceForGroup(groupName: string, evidenceCards: EvidenceCard[]): number {
  const hasSpecificEvidence = evidenceCards.some((card) =>
    `${card.title} ${card.excerpt} ${card.extracted_claim}`.toLowerCase().includes(groupName.toLowerCase().split(" ")[0] ?? "")
  );
  const base = evidenceCards.length >= 4 ? 0.56 : 0.42;
  return Math.round(Math.min(0.74, base + (hasSpecificEvidence ? 0.08 : 0) + Math.min(0.08, evidenceCards.length * 0.005)) * 100) / 100;
}

function supportDriversFor(groupName: string, role: GroupRole, policyText: string, domain: string): string[] {
  const drivers = new Set<string>();
  if (/transparen|notice|disclos/i.test(policyText)) drivers.add("clearer notice and less surprise");
  if (/appeal|review|recourse|right/i.test(policyText)) drivers.add("a usable path to challenge decisions");
  if (/benefit|rebate|subsidy|assistance|grant/i.test(policyText)) drivers.add("direct financial or service benefit");
  if (/safety|health|protect/i.test(policyText)) drivers.add("reduced harm or risk");
  if (/fair|bias|equity|civil rights|discrimination/i.test(policyText)) drivers.add("fairness and equal treatment");
  if (role === "business" || role === "vendor") drivers.add("clear rules may reduce legal uncertainty");
  if (drivers.size === 0) drivers.add(`visible improvement in ${domain}`);
  return Array.from(drivers).slice(0, 4);
}

function oppositionDriversFor(groupName: string, role: GroupRole, policyText: string): string[] {
  const drivers = new Set<string>();
  if (/cost|fee|tax|price/i.test(policyText)) drivers.add("affordability or pass-through cost concerns");
  if (/audit|report|certif|record|data/i.test(policyText)) drivers.add("paperwork and documentation burden");
  if (/penalt|fine|enforcement/i.test(policyText)) drivers.add("fear of penalties or uneven enforcement");
  if (/deadline|within|annual|phase/i.test(policyText)) drivers.add("timeline pressure and implementation confusion");
  if (role === "business" || role === "vendor") drivers.add("fixed compliance cost and operational disruption");
  if (role === "agency") drivers.add("staff capacity and technical review burden");
  if (drivers.size === 0) drivers.add("unclear details and uncertainty about who pays");
  return Array.from(drivers).slice(0, 4);
}

function emotionalTriggersFor(groupName: string, role: GroupRole, policyText: string): string[] {
  const triggers = new Set<string>();
  if (/appeal|right|fair|bias|discrimination/i.test(policyText)) triggers.add("fair chance");
  if (/safety|health|protect/i.test(policyText)) triggers.add("safety");
  if (/cost|tax|fee|fine/i.test(policyText)) triggers.add("cost pressure");
  if (/surveillance|data|AI|automated|algorithm/i.test(policyText)) triggers.add("being judged by a system");
  if (role === "business") triggers.add("regulatory fatigue");
  if (role === "agency") triggers.add("delivery pressure");
  if (triggers.size === 0) triggers.add("trust");
  return Array.from(triggers).slice(0, 4);
}

function economicTriggersFor(groupName: string, role: GroupRole, policyText: string, businessExposure?: string): string[] {
  const triggers = new Set<string>();
  if (/job|hiring|employment|worker/i.test(policyText)) triggers.add("job access and hiring speed");
  if (/rent|housing|tenant/i.test(policyText)) triggers.add("rent and housing stability");
  if (/health|patient|insurance/i.test(policyText)) triggers.add("care access and out-of-pocket exposure");
  if (/tax|fee|cost|price|fine/i.test(policyText)) triggers.add("household or business cost burden");
  if (role === "business" || role === "vendor") triggers.add(businessExposure ?? "compliance staff time and vendor cost");
  if (triggers.size === 0) triggers.add("economic burden depends on implementation details");
  return Array.from(triggers).slice(0, 4);
}

function fairnessConcernsFor(groupName: string, role: GroupRole, policyText: string): string[] {
  const concerns = new Set<string>();
  if (/low-income|poverty|equity|civil rights|bias|discrimination/i.test(policyText)) concerns.add("uneven burden or unequal access");
  if (/appeal|review|recourse/i.test(policyText)) concerns.add("whether regular people can actually use the process");
  if (/small business|threshold|exempt/i.test(policyText)) concerns.add("who is included, exempted, or advantaged");
  if (role === "business") concerns.add("larger organizations may comply more easily");
  if (concerns.size === 0) concerns.add("fairness depends on clear eligibility and enforcement");
  return Array.from(concerns).slice(0, 4);
}

function trustConcernsFor(role: GroupRole, policyText: string): string[] {
  const concerns = new Set<string>();
  if (/audit|report|dashboard|public/i.test(policyText)) concerns.add("whether reporting proves real outcomes");
  if (/agency|enforcement|complaint|penalt/i.test(policyText)) concerns.add("whether the agency has capacity to enforce");
  if (/data|AI|automated|algorithm|vendor/i.test(policyText)) concerns.add("whether vendors and data systems are transparent enough");
  if (role === "agency") concerns.add("whether rollout resources match the promise");
  if (concerns.size === 0) concerns.add("whether the government can explain and implement the policy clearly");
  return Array.from(concerns).slice(0, 4);
}

function quoteFor(groupName: string, role: GroupRole, support: string, opposition: string): string {
  if (role === "business") return `I understand the goal, but I need to know what this costs and how hard it is to comply.`;
  if (role === "agency") return `The policy may be workable, but only if we have clear rules, staffing, and data before launch.`;
  if (role === "vendor") return `This could create demand, but the standard needs to be specific enough to build against.`;
  if (role === "advocacy") return `This is promising if it creates real accountability, not just paperwork.`;
  return `I could support this if it gives people ${support}, but I worry about ${opposition}.`;
}

function validationAssumptionFor(groupName: string, role: GroupRole): string {
  if (role === "business") return `Validate ${normalizeGroupName(groupName)} sentiment with chamber listening, employer surveys, and implementation-cost interviews.`;
  if (role === "agency") return `Validate ${normalizeGroupName(groupName)} readiness with agency staffing, technology, and enforcement-capacity data.`;
  if (role === "vendor") return `Validate ${normalizeGroupName(groupName)} position with live CrustData signals, vendor interviews, and procurement evidence.`;
  return `Validate ${normalizeGroupName(groupName)} reaction with representative listening, community partners, and administrative data.`;
}

function buildSupportNarratives(policyAnalysis: PolicyInput, groups: PublicSentimentGroup[]): string[] {
  const topSupport = [...groups].sort((left, right) => right.sentiment_score - left.sentiment_score)[0];
  return [
    `Likely support starts with ${topSupport?.group_name ?? "directly affected people"} because of ${topSupport?.support_drivers[0] ?? "visible benefits"}.`,
    `Adoption improves when policy teams explain the benefit in plain language and show what evidence supports the claim.`,
    "Representative resident listening should validate this before it becomes a final public-opinion claim."
  ];
}

function buildOppositionNarratives(policyAnalysis: PolicyInput, groups: PublicSentimentGroup[]): string[] {
  const topConcern = [...groups].sort((left, right) => left.sentiment_score - right.sentiment_score)[0];
  return [
    `Likely opposition or caution starts with ${topConcern?.group_name ?? "groups facing burden"} because of ${topConcern?.opposition_drivers[0] ?? "cost or implementation uncertainty"}.`,
    "Opposition can soften when timelines, eligibility, templates, enforcement standards, and support channels are clear.",
    "Loud online reaction is treated as an amplification signal, not representative public sentiment."
  ];
}

function buildMisinformationRisks(policyAnalysis: PolicyInput, groups: PublicSentimentGroup[]) {
  const policyText = getPolicyText(policyAnalysis);
  const burdenedGroup =
    [...groups].sort((left, right) => left.sentiment_score - right.sentiment_score)[0]?.group_name ?? "burdened groups";
  const risks = new Set<string>();

  if (/ban|prohibit|restriction|cap|limit/i.test(policyText)) {
    risks.add("People may overread the proposal as broader than the actual covered activity.");
  }
  if (/benefit|grant|rebate|credit|subsidy|eligibility/i.test(policyText)) {
    risks.add("Residents may confuse eligibility, payment timing, or application steps if plain-language guidance is late.");
  }
  if (/tax|fee|cost|price|fine|penalt/i.test(policyText)) {
    risks.add("Opponents may frame scenario costs as fixed taxes unless source-backed cost ranges are clearly labeled.");
  }
  if (/AI|algorithm|automated|data|privacy|surveillance/i.test(policyText)) {
    risks.add("Technology language may trigger privacy or black-box fears if the policy does not explain what data is used.");
  }
  if (/audit|report|certif|self.?certif/i.test(policyText)) {
    risks.add("Audit or certification language may be framed as paperwork theater unless enforcement and quality controls are visible.");
  }

  risks.add(`${burdenedGroup} may amplify confusion if coverage thresholds, deadlines, or enforcement steps are unclear.`);
  risks.add("Online sentiment should be treated as amplification evidence, not a representative public-opinion sample.");

  return Array.from(risks).slice(0, 5);
}

function buildMediaFramingRisks(policyAnalysis: PolicyInput, groups: PublicSentimentGroup[]) {
  const policyText = getPolicyText(policyAnalysis);
  const supporter = [...groups].sort((left, right) => right.sentiment_score - left.sentiment_score)[0]?.group_name ?? "supporters";
  const critic = [...groups].sort((left, right) => left.sentiment_score - right.sentiment_score)[0]?.group_name ?? "critics";
  const frames = new Set<string>();

  if (/fair|right|appeal|protect|safety|equity|civil rights/i.test(policyText)) {
    frames.add(`${supporter} may frame the law as fairness, protection, or accountability.`);
  }
  if (/cost|fee|tax|audit|report|mandate|require|penalt/i.test(policyText)) {
    frames.add(`${critic} may frame the law as cost, paperwork, or government overreach.`);
  }
  if (/job|worker|employment|wage|labor/i.test(policyText)) {
    frames.add("Coverage may shift toward jobs, wages, hiring speed, or worker protection.");
  }
  if (/housing|rent|tenant|landlord/i.test(policyText)) {
    frames.add("Coverage may shift toward rent pressure, landlord burden, and housing availability.");
  }
  if (/health|patient|hospital|insurance|medicaid/i.test(policyText)) {
    frames.add("Coverage may shift toward care access, patient safety, and provider capacity.");
  }

  frames.add("Weak evidence labels must be visible so scenario ranges are not mistaken for source-backed public opinion.");

  return Array.from(frames).slice(0, 5);
}

function buildSentimentValidationQuestions(policyAnalysis: PolicyInput, groups: PublicSentimentGroup[]) {
  const topGroups = groups.slice(0, 3).map((group) => group.group_name).join(", ") || "affected groups";
  const policyText = getPolicyText(policyAnalysis);
  const questions = [
    `Which of these top affected categories need representative listening first: ${topGroups}?`,
    "What part of the policy do people misunderstand after reading a one-page plain-language summary?",
    "Which cost or benefit claims are source-backed, and which are scenario assumptions?",
    "Which online narratives are reaching mainstream residents versus only policy insiders?",
    "What local economic or administrative data would most change the sentiment forecast?"
  ];

  if (/benefit|grant|rebate|credit|subsidy/i.test(policyText)) {
    questions[1] = "Do eligible residents understand who qualifies, when support arrives, and how to appeal a denial?";
  }

  if (/ban|restriction|permit|license|mandate|audit|report/i.test(policyText)) {
    questions[1] = "Do covered people and entities understand exactly what is required, by when, and what support exists?";
  }

  return questions;
}

function normalizeGroupName(groupName: string): string {
  return groupName.trim().replace(/\s+/g, " ").replace(/^dc\b/i, "DC");
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function labelsOverlap(left: string, right: string) {
  const leftTokens = meaningfulTokens(left);
  const rightTokens = meaningfulTokens(right);
  return rightTokens.some((token) => leftTokens.includes(token));
}

function meaningfulTokens(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 3 && !["policy", "public", "people", "groups", "with", "from", "that", "this", "rule"].includes(token));
}

function ensureSentimentEvidence(policyAnalysis: PolicyInput, evidenceCards: EvidenceCard[]) {
  if (evidenceCards.length > 0) {
    return evidenceCards;
  }

  return [
    createEvidenceCard({
      source_name: "Generic web search/manual source",
      source_url: "manual://submitted-policy-text",
      title: "Submitted policy text",
      excerpt: getPolicyText(policyAnalysis),
      extracted_claim: "The submitted policy text is the only evidence available for this sentiment scenario.",
      geography: getJurisdiction(policyAnalysis),
      policy_domain: getPolicyDomain(policyAnalysis),
      confidence: 0.42,
      limitation:
        "Weak evidence: this card reflects submitted policy text only, not representative public sentiment or validated stakeholder data.",
      used_by_agents: ["sentiment_forecast"],
      supports: ["sentiment-input-policy-text"],
      contradicts: [],
      raw_metadata: {
        evidence_strength: "weak",
        public_sentiment_is_not_social_media: true
      }
    })
  ];
}

function buildOverallSummary(publicGroups: PublicSentimentGroup[], evidenceCards: EvidenceCard[]) {
  const residentGroups = publicGroups.filter((group) => !/employer|business|chamber|vendor|company|consultant|advocacy|agency/i.test(group.group_name));
  const averageScore = Math.round(
    residentGroups.reduce((sum, group) => sum + group.sentiment_score, 0) / Math.max(1, residentGroups.length)
  );
  const topSupport = [...publicGroups].sort((left, right) => right.sentiment_score - left.sentiment_score)[0];
  const topConcern = [...publicGroups].sort((left, right) => left.sentiment_score - right.sentiment_score)[0];
  const evidenceStrength =
    evidenceCards.length >= 4 && evidenceCards.some((card) => card.source_name !== "Generic web search/manual source")
      ? "moderate"
      : "weak";
  const residentTone =
    averageScore >= 35
      ? "mostly supportive"
      : averageScore >= 10
        ? "cautiously supportive"
        : averageScore >= -10
          ? "uncertain"
          : "cautious";

  return `Likely scenario: affected people are ${residentTone}. Strongest support signal: ${topSupport?.group_name ?? "direct beneficiaries"} because of ${topSupport?.support_drivers[0] ?? "visible benefit"}. Strongest caution signal: ${topConcern?.group_name ?? "burdened groups"} because of ${topConcern?.opposition_drivers[0] ?? "cost or implementation uncertainty"}. Evidence strength is ${evidenceStrength}; loud online sentiment is treated as an amplification signal, not representative public opinion.`;
}

function buildEvidenceStrengthAssumption(evidenceCards: EvidenceCard[]) {
  const hasOnlyWeakEvidence =
    evidenceCards.length <= 1 || evidenceCards.every((card) => card.source_name === "Generic web search/manual source");

  return hasOnlyWeakEvidence
    ? "Evidence is weak: forecast relies on submitted policy text and scenario assumptions until representative listening, administrative data, or validated source evidence is attached."
    : "Evidence is directional: source cards support scenario framing but do not represent full public opinion.";
}

function getEvidenceIds(evidenceCards: EvidenceCard[]) {
  return evidenceCards.map((card) => card.id);
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

function getPolicyText(policyAnalysis: PolicyInput) {
  if ("policyText" in policyAnalysis) {
    return policyAnalysis.policyText;
  }

  return [
    policyAnalysis.policy_title,
    policyAnalysis.policy_domain,
    policyAnalysis.obligations.join(" "),
    policyAnalysis.sentiment_triggers.join(" ")
  ].join(" ");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function isAiHiringPolicy(policyAnalysis: PolicyInput) {
  return /AI|automated|algorithm|hiring|employment|applicant|bias audit/i.test(getPolicyText(policyAnalysis));
}

function inferLegacySegment(groupName: string): SentimentGroupForecast["segment"] {
  if (/business|employer/i.test(groupName)) return "employer";
  if (/worker|job seeker|student|household/i.test(groupName)) return "worker";
  if (/advocacy/i.test(groupName)) return "advocacy";
  return "citizen";
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}
