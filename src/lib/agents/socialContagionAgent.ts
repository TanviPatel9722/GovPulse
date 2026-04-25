import { callOpenAIJson } from "@/lib/llm/openai";
import { MODEL_CONFIG } from "@/lib/llm/modelRouter";
import { SOCIAL_CONTAGION_AGENT_SYSTEM_PROMPT, buildSocialContagionPrompt } from "@/lib/llm/prompts";
import type { LLMMode } from "@/lib/llm/llmTypes";
import type { PolicyAnalysis } from "@/lib/agents/policyParser";
import type { EvidenceCard } from "@/lib/evidence/evidenceCard";
import type { NarrativeRisk, SentimentForecast, SocialDynamicsRisk } from "@/lib/types";

export type GenerateSocialDynamicsRiskInput = {
  policyAnalysis: PolicyAnalysis;
  sentimentForecast: SentimentForecast;
  narrativeRisk: NarrativeRisk;
  evidenceCards: EvidenceCard[];
  mode?: LLMMode;
};

export async function generateSocialDynamicsRisk(input: GenerateSocialDynamicsRiskInput): Promise<SocialDynamicsRisk> {
  const fallback = buildDemoSocialDynamicsRisk(input);

  return callOpenAIJson<SocialDynamicsRisk>({
    model: MODEL_CONFIG.socialContagionAgent,
    systemPrompt: SOCIAL_CONTAGION_AGENT_SYSTEM_PROMPT,
    userPrompt: buildSocialContagionPrompt(input),
    schemaName: "SocialDynamicsRisk",
    fallback,
    mode: input.mode
  });
}

function buildDemoSocialDynamicsRisk(input: GenerateSocialDynamicsRiskInput): SocialDynamicsRisk {
  const evidenceIds = getEvidenceIds(input.evidenceCards);
  const sourceIds = getSourceIds(input.evidenceCards);

  if (isAiHiringPolicy(input.policyAnalysis)) {
    return {
      groups: [
        {
          group_name: "Job seekers who were recently rejected",
          likely_sentiment: "positive",
          simulated_effect:
            "Likely to welcome disclosure and appeal rights, but trust depends on whether the human review feels real and fast.",
          metric_value: "high support / medium trust sensitivity",
          metric_source_type: "model-estimated",
          source_ids: sourceIds,
          main_concern: "Appeals could feel symbolic if employers do not explain what changed or who reviewed the case.",
          main_support_driver: "A clear right to know when automation affected a hiring decision.",
          contagion_or_ripple_impact:
            "Personal stories about being screened out by a machine can travel quickly through local social media and workforce networks.",
          misinformation_exposure_risk: 48,
          protest_or_backlash_risk: 32,
          trust_sensitivity: 76,
          cost_burden_sensitivity: 68,
          confidence: 0.64,
          assumptions: ["Resident reaction should be validated with job-seeker listening sessions, legal-aid intake data, and workforce program feedback."],
          limitations: ["This is not a representative survey result."],
          evidence_card_ids: evidenceIds
        },
        {
          group_name: "Workers from historically screened-out communities",
          likely_sentiment: "positive",
          simulated_effect:
            "Likely to see the policy as a fair-chance protection if notices are plain-language and appeal access does not require legal help.",
          metric_value: "high fairness sensitivity",
          metric_source_type: "model-estimated",
          source_ids: sourceIds,
          main_concern: "A technically legal notice may still be unusable for residents with limited time, language access, or digital access.",
          main_support_driver: "Fair chance, human review, and reduced black-box screening.",
          contagion_or_ripple_impact:
            "Community organizations can amplify support if they can explain the right simply and point residents to help.",
          misinformation_exposure_risk: 42,
          protest_or_backlash_risk: 24,
          trust_sensitivity: 80,
          cost_burden_sensitivity: 72,
          confidence: 0.62,
          assumptions: ["Equity sensitivity is inferred from policy design and ACS-style economic vulnerability context."],
          limitations: ["Needs representative resident validation before being treated as measured sentiment."],
          evidence_card_ids: evidenceIds
        },
        {
          group_name: "Students and early-career applicants",
          likely_sentiment: "mixed",
          simulated_effect:
            "Likely to like transparency but worry that using an appeal could make them look difficult to employers.",
          metric_value: "mixed support / high confusion risk",
          metric_source_type: "scenario-assumption",
          source_ids: sourceIds,
          main_concern: "Fear of retaliation or quietly losing opportunities after asking for review.",
          main_support_driver: "More clarity in internships and entry-level hiring.",
          contagion_or_ripple_impact:
            "Campus and early-career forums may spread practical questions faster than legal explanations.",
          misinformation_exposure_risk: 58,
          protest_or_backlash_risk: 28,
          trust_sensitivity: 70,
          cost_burden_sensitivity: 52,
          confidence: 0.55,
          assumptions: ["Student reaction is inferred from first-job and applicant-rights concerns."],
          limitations: ["Validate with campus career centers and youth employment programs."],
          evidence_card_ids: evidenceIds
        },
        {
          group_name: "Small employers as community members",
          likely_sentiment: "negative",
          simulated_effect:
            "Likely to support fairness in principle but resist if the rule feels designed for large firms with legal and HR teams.",
          metric_value: "elevated compliance-burden sensitivity",
          metric_source_type: "scenario-assumption",
          source_ids: sourceIds,
          main_concern: "Fixed audit, legal, and workflow costs that do not scale down for small employers.",
          main_support_driver: "Safe-harbor templates, delayed compliance, and vendor responsibility rules.",
          contagion_or_ripple_impact:
            "Chambers of commerce and neighborhood business groups can turn operational anxiety into a broader burden narrative.",
          misinformation_exposure_risk: 54,
          protest_or_backlash_risk: 60,
          trust_sensitivity: 66,
          cost_burden_sensitivity: 82,
          confidence: 0.6,
          assumptions: ["Business opposition is separate from resident sentiment but can shape the public narrative."],
          limitations: ["Needs employer survey, chamber listening, and vendor quote evidence."],
          evidence_card_ids: evidenceIds
        }
      ],
      warnings: ["Social dynamics scores are scenario signals. Use representative resident listening before claiming measured public opinion."]
    };
  }

  if (!isPlasticBagPolicy(input.policyAnalysis)) {
    return {
      groups: buildPolicySpecificSocialGroups(input, evidenceIds, sourceIds),
      warnings: [
        "Social dynamics groups are derived from the parsed policy and sentiment forecast.",
        "Scores are scenario signals, not representative public-opinion measurements."
      ]
    };
  }

  return {
    groups: [
      {
        group_name: "Low-income households",
        likely_sentiment: "mixed",
        simulated_effect: "Support environmental intent but react strongly to visible checkout costs or inconvenience.",
        metric_value: "70-80/100 modeled cost-burden sensitivity range",
        metric_source_type: "model-estimated",
        source_ids: sourceIds,
        main_concern: "Small recurring costs and carrying burden under cost-of-living pressure.",
        main_support_driver: "Reduced litter and neighborhood cleanliness when mitigation is visible.",
        contagion_or_ripple_impact: "Local stories about fees can spread quickly through community networks and local news.",
        misinformation_exposure_risk: 62,
        protest_or_backlash_risk: 58,
        trust_sensitivity: 72,
        cost_burden_sensitivity: 78,
        confidence: 0.64,
        assumptions: ["Representative household listening is needed before treating this as measured sentiment."],
        limitations: ["Score is model-estimated from burden logic and placeholder evidence, not a representative survey result."],
        evidence_card_ids: evidenceIds
      },
      {
        group_name: "Small business owners",
        likely_sentiment: "negative",
        simulated_effect: "Likely early opposition if compliance guidance and substitute sourcing are unclear.",
        metric_value: "65-75/100 modeled business-opposition range",
        metric_source_type: "model-estimated",
        source_ids: sourceIds,
        main_concern: "Procurement cost, customer conflict, unclear exemptions, and enforcement discretion.",
        main_support_driver: "Predictable phase-in and bulk purchasing can reduce resistance.",
        contagion_or_ripple_impact: "Trade associations can convert operational complaints into a broader anti-mandate narrative.",
        misinformation_exposure_risk: 55,
        protest_or_backlash_risk: 66,
        trust_sensitivity: 69,
        cost_burden_sensitivity: 74,
        confidence: 0.66,
        assumptions: ["Business opposition is separate from citizen opposition and may amplify faster."],
        limitations: ["Score should be validated with business association comments and retailer interviews."],
        evidence_card_ids: evidenceIds
      },
      {
        group_name: "Environmental advocates",
        likely_sentiment: "positive",
        simulated_effect: "Likely to amplify support if policy includes transparent implementation and measurable waste goals.",
        metric_value: "70-80/100 modeled support-amplification range",
        metric_source_type: "model-estimated",
        source_ids: sourceIds,
        main_concern: "Weak exemptions, delayed enforcement, or substitute materials that do not reduce waste.",
        main_support_driver: "Visible reduction in plastic litter and alignment with climate/waste goals.",
        contagion_or_ripple_impact: "Support narratives can legitimize the policy but may be outpaced by cost anecdotes.",
        misinformation_exposure_risk: 38,
        protest_or_backlash_risk: 18,
        trust_sensitivity: 54,
        cost_burden_sensitivity: 30,
        confidence: 0.61,
        assumptions: ["Support intensity depends on final exemptions and public reporting."],
        limitations: ["Advocacy support is not the same as whole-public sentiment."],
        evidence_card_ids: evidenceIds
      },
      {
        group_name: "General shoppers",
        likely_sentiment: "uncertain",
        simulated_effect: "Low-salience group until the rule changes checkout routines.",
        metric_value: "55-65/100 scenario annoyance-risk range",
        metric_source_type: "scenario-assumption",
        source_ids: sourceIds,
        main_concern: "Forgotten bags, substitute costs, and confusion at checkout.",
        main_support_driver: "Simple waste reduction story and convenient reusable alternatives.",
        contagion_or_ripple_impact: "Viral checkout-friction stories can shape online sentiment without representing the full public.",
        misinformation_exposure_risk: 68,
        protest_or_backlash_risk: 42,
        trust_sensitivity: 60,
        cost_burden_sensitivity: 57,
        confidence: 0.58,
        assumptions: ["Online sentiment is an amplification channel, not representative public opinion."],
        limitations: ["General-shopper reaction requires representative survey or field-test evidence before policy use."],
        evidence_card_ids: evidenceIds
      }
    ],
    warnings: ["Social dynamics scores are scenario model outputs, not exact predictions."]
  };
}

function isAiHiringPolicy(policyAnalysis: PolicyAnalysis): boolean {
  const text = [
    policyAnalysis.policy_title,
    policyAnalysis.policy_domain,
    policyAnalysis.obligations.join(" "),
    policyAnalysis.affected_groups.join(" "),
    policyAnalysis.sentiment_triggers.join(" ")
  ].join(" ");

  return /ai|algorithm|automated|machine learning|model/i.test(text) &&
    /hiring|employment|job applicant|job seeker|resume|résumé|recruit|candidate|interview|workforce|applicant tracking|ats|bias audit/i.test(text);
}

function isPlasticBagPolicy(policyAnalysis: PolicyAnalysis): boolean {
  return [
    policyAnalysis.policy_title,
    policyAnalysis.policy_domain,
    policyAnalysis.obligations.join(" "),
    policyAnalysis.affected_groups.join(" "),
    policyAnalysis.sentiment_triggers.join(" ")
  ].some((value) => /plastic|single-use|checkout bag|bag ban|reusable bag|paper bag|packaging/i.test(value));
}

function buildPolicySpecificSocialGroups(
  input: GenerateSocialDynamicsRiskInput,
  evidenceIds: string[],
  sourceIds: string[]
): SocialDynamicsRisk["groups"] {
  const policyText = getPolicyText(input.policyAnalysis);

  return input.sentimentForecast.public_groups.slice(0, 6).map((group) => {
    const backlashRisk = clampSocialScore(42 + Math.max(0, -group.sentiment_score) * 0.55 + riskKeywordBoost(policyText));
    const misinformationRisk = clampSocialScore(40 + (group.trust_concerns.length + group.opposition_drivers.length) * 6 + confusionKeywordBoost(policyText));
    const trustSensitivity = clampSocialScore(45 + group.trust_concerns.length * 8 + Math.abs(group.sentiment_score) * 0.25);
    const costSensitivity = clampSocialScore(38 + group.economic_triggers.length * 8 + (/cost|fee|tax|price|rent|fine|penalt/i.test(policyText) ? 12 : 0));

    return {
      group_name: group.group_name,
      likely_sentiment: group.likely_sentiment,
      simulated_effect: group.likely_quotes[0] ?? `Likely ${group.likely_sentiment} reaction that should be validated with local listening.`,
      metric_value: `${backlashRisk}-${Math.min(100, backlashRisk + 10)}/100 backlash watch range`,
      metric_source_type: "model-estimated",
      source_ids: sourceIds,
      main_concern: group.opposition_drivers[0] ?? group.trust_concerns[0] ?? "unclear cost, eligibility, or implementation details",
      main_support_driver: group.support_drivers[0] ?? "visible policy benefit",
      contagion_or_ripple_impact: contagionPathFor(group.group_name, policyText),
      misinformation_exposure_risk: misinformationRisk,
      protest_or_backlash_risk: backlashRisk,
      trust_sensitivity: trustSensitivity,
      cost_burden_sensitivity: costSensitivity,
      confidence: Math.min(0.72, Math.round((group.confidence + 0.02) * 100) / 100),
      assumptions: [
        "Derived from sentiment drivers and policy text, not a representative survey.",
        "Public sentiment is separated from online amplification."
      ],
      limitations: [
        "Validate with representative listening, public comments, local news, and administrative data before final use."
      ],
      evidence_card_ids: evidenceIds
    };
  });
}

function getPolicyText(policyAnalysis: PolicyAnalysis) {
  return [
    policyAnalysis.policy_title,
    policyAnalysis.policy_domain,
    policyAnalysis.obligations.join(" "),
    policyAnalysis.costs.join(" "),
    policyAnalysis.sentiment_triggers.join(" ")
  ].join(" ");
}

function riskKeywordBoost(policyText: string) {
  return /ban|penalt|fine|tax|fee|cost|mandate|eviction|denial|deadline|enforcement/i.test(policyText) ? 10 : 0;
}

function confusionKeywordBoost(policyText: string) {
  return /eligibility|appeal|audit|certif|screening|application|automated|data|privacy|report/i.test(policyText) ? 12 : 0;
}

function contagionPathFor(groupName: string, policyText: string) {
  if (/tenant|rent|landlord|housing/i.test(`${groupName} ${policyText}`)) {
    return "Stories can move through tenant networks, housing advocates, landlord associations, and local neighborhood media.";
  }
  if (/patient|health|hospital|medicaid/i.test(`${groupName} ${policyText}`)) {
    return "Stories can move through patient advocates, provider networks, local health reporters, and community organizations.";
  }
  if (/student|school|education/i.test(`${groupName} ${policyText}`)) {
    return "Stories can move through families, school communities, student networks, and local education media.";
  }
  if (/business|employer|company|retailer|provider/i.test(groupName)) {
    return "Operational concerns can move quickly through trade groups and then shape broader public narratives.";
  }
  return "Personal experience stories can spread faster than technical explanations, especially when costs or access are unclear.";
}

function clampSocialScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getEvidenceIds(evidenceCards: EvidenceCard[]) {
  return evidenceCards.length > 0 ? evidenceCards.slice(0, 8).map((card) => card.id) : ["assumption-labeled"];
}

function getSourceIds(evidenceCards: EvidenceCard[]) {
  return evidenceCards.length > 0 ? Array.from(new Set(evidenceCards.slice(0, 8).map((card) => card.source_name))) : ["assumption-labeled"];
}
