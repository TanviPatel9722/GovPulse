import type { PolicyAnalysis as ParserPolicyAnalysis } from "@/lib/agents/policyParser";
import { callOpenAIJson } from "@/lib/llm/openai";
import { MODEL_CONFIG } from "@/lib/llm/modelRouter";
import { ECONOMIC_AGENT_SYSTEM_PROMPT, buildEconomicPrompt } from "@/lib/llm/prompts";
import type { LLMMode } from "@/lib/llm/llmTypes";
import { fetchBeaRegionalProfile } from "@/lib/sources/bea";
import { fetchBlsLaborProfile } from "@/lib/sources/bls";
import { fetchCensusAcsProfile } from "@/lib/sources/census";
import { fetchFredMacroProfile } from "@/lib/sources/fred";
import type { EconomicExposure, EconomicIndicator, ParsedPolicy } from "@/lib/types";

type PolicyInput = ParserPolicyAnalysis | ParsedPolicy;

export async function estimateEconomicExposure(
  policyAnalysis: PolicyInput,
  jurisdiction = getJurisdiction(policyAnalysis),
  affectedGroups = getAffectedGroups(policyAnalysis),
  affectedIndustries = getAffectedIndustries(policyAnalysis),
  mode: LLMMode = "demo"
): Promise<EconomicExposure> {
  const [census, bls, bea, fred] = await Promise.all([
    fetchCensusAcsProfile(jurisdiction),
    fetchBlsLaborProfile(jurisdiction, affectedIndustries),
    fetchBeaRegionalProfile(jurisdiction, affectedIndustries),
    fetchFredMacroProfile(jurisdiction)
  ]);

  const allEvidenceCards = [
    ...census.evidence_cards,
    ...bls.evidence_cards,
    ...bea.evidence_cards,
    ...fred.evidence_cards
  ];

  const baseIndicators: EconomicIndicator[] = [
    {
      indicator_name: "ACS income sensitivity",
      value: census.income,
      geography: census.geography,
      source: "Census ACS",
      evidence_card_id: census.evidence_cards[0].id
    },
    {
      indicator_name: "ACS poverty exposure",
      value: census.poverty,
      geography: census.geography,
      source: "Census ACS",
      evidence_card_id: census.evidence_cards[0].id
    },
    {
      indicator_name: "ACS housing burden",
      value: census.housing_burden,
      geography: census.geography,
      source: "Census ACS",
      evidence_card_id: census.evidence_cards[0].id
    },
    {
      indicator_name: "BLS unemployment",
      value: bls.unemployment,
      geography: bls.geography,
      source: "BLS",
      evidence_card_id: bls.evidence_cards[0].id
    },
    {
      indicator_name: "BLS CPI pressure",
      value: bls.cpi,
      geography: bls.geography,
      source: "BLS",
      evidence_card_id: bls.evidence_cards[0].id
    },
    {
      indicator_name: "BEA regional output",
      value: bea.regional_gdp,
      geography: bea.geography,
      source: "BEA",
      evidence_card_id: bea.evidence_cards[0].id
    },
    {
      indicator_name: "FRED macro pressure",
      value: fred.inflation,
      geography: fred.geography,
      source: "FRED",
      evidence_card_id: fred.evidence_cards[0].id
    }
  ];
  const keyIndicators = isAiHiringPolicy(policyAnalysis)
    ? [
        ...baseIndicators,
        {
          indicator_name: "Modeled employer compliance cost",
          value: "$15k-$75k first-year cost for a mid-size covered employer; $75k-$250k+ for enterprise employers with multiple tools.",
          geography: jurisdiction,
          source: "Scenario assumption",
          evidence_card_id: allEvidenceCards[0]?.id ?? "assumption-labeled"
        },
        {
          indicator_name: "Modeled audit market exposure",
          value: "$8k-$60k per automated hiring tool per year depending on tool complexity, audit depth, and documentation quality.",
          geography: jurisdiction,
          source: "Scenario assumption",
          evidence_card_id: allEvidenceCards[0]?.id ?? "assumption-labeled"
        },
        {
          indicator_name: "Modeled appeal workload",
          value: "1-3 hours of staff/legal review per contested adverse decision if templates and service levels are in place; higher without automation logs.",
          geography: jurisdiction,
          source: "Model-estimated",
          evidence_card_id: allEvidenceCards[0]?.id ?? "assumption-labeled"
        }
      ]
    : baseIndicators;

  const fallback: EconomicExposure = {
    household_exposure: isAiHiringPolicy(policyAnalysis)
      ? `Likely reaction driver: residents who are actively looking for work will read the rule through job access and fairness. ${census.poverty} ${census.housing_burden} That makes appeal speed and plain-language notice economically important, because delayed hiring decisions can matter more for households with weak cash buffers.`
      : "Likely scenario: household exposure is indirect but meaningful. Affected residents may support visible benefits but react negatively if implementation creates recurring costs, delays, or confusing access barriers.",
    business_exposure: isAiHiringPolicy(policyAnalysis)
      ? "Modeled exposure: covered employers using automated hiring tools face roughly $15k-$75k in first-year compliance work for a mid-size employer and $75k-$250k+ for enterprise employers with multiple tools. Main cost centers are tool inventory, audit procurement, applicant notices, appeal operations, vendor contract updates, and legal review. These are scenario assumptions until validated by employer survey and vendor quote evidence."
      : "Likely scenario: regulated businesses or covered organizations may face compliance burden from staff training, documentation, procurement, legal review, data reporting, customer/resident communication, or workflow changes. Small entities are most sensitive to fixed compliance costs.",
    labor_market_exposure:
      `Likely scenario: labor-market exposure centers on ${affectedGroups.join(", ") || "affected workers and applicants"}. The rule may improve trust in screening but could create short-term hiring workflow friction.`,
    industry_exposure: isAiHiringPolicy(policyAnalysis)
      ? "Modeled industry effect: HR tech vendors and applicant-tracking platforms face product compliance work but may gain audit, notice, and appeal-workflow demand. Compliance consultants and audit providers may see a 10-25% short-term demand lift in AI hiring governance work. Staffing agencies and large employers face direct workflow burden."
      : `Likely scenario: direct industry exposure is highest for ${affectedIndustries.join(", ") || "regulated businesses and compliance vendors"}. Vendors and consultants may see product and service demand changes.`,
    regional_economic_context:
      `${bea.regional_gdp} ${bea.personal_income} ${fred.macroeconomic_indicators}`,
    cost_of_living_sensitivity:
      `${census.housing_burden} ${bls.cpi} ${fred.inflation} Cost-of-living pressure can intensify reactions to job-access disruption or employer cost narratives.`,
    equity_sensitivity:
      `${census.demographics} ${census.poverty} Equity sensitivity is elevated when affected groups have less savings, less legal support, or less ability to navigate appeal processes.`,
    key_indicators: keyIndicators,
    confidence: average(allEvidenceCards.map((card) => card.confidence)),
    limitations: [
      "Hackathon demo uses mock adapter values when API keys or jurisdiction-specific series mappings are unavailable.",
      "Economic indicators explain likely pressure points; they do not by themselves predict public sentiment.",
      "ACS, BLS, BEA, and FRED have different geographies, release schedules, and revision practices.",
      "Compliance cost estimates should be validated with employer surveys, vendor quotes, and agency budget data."
    ],
    assumptions: [
      "Affected groups and industries are derived from the parsed policy when available.",
      "Economic pressure can drive sentiment through household vulnerability, business compliance cost, labor-market friction, and regional cost-of-living sensitivity.",
      "Numbers labeled scenario assumption or model-estimated should be replaced or calibrated with employer surveys, vendor quotes, agency complaint volumes, and live CrustData/public-source evidence before final decision support.",
      "Every key indicator includes an evidence_card_id that downstream agents can use to attach evidence."
    ]
  };

  if (!("policy_title" in policyAnalysis)) {
    return fallback;
  }

  return callOpenAIJson<EconomicExposure>({
    model: MODEL_CONFIG.economicAgent,
    systemPrompt: ECONOMIC_AGENT_SYSTEM_PROMPT,
    userPrompt: buildEconomicPrompt(policyAnalysis, fallback, allEvidenceCards),
    schemaName: "EconomicExposure",
    fallback,
    mode
  });
}

function isAiHiringPolicy(policyAnalysis: PolicyInput): boolean {
  const text = "policy_title" in policyAnalysis
    ? [
        policyAnalysis.policy_title,
        policyAnalysis.policy_domain,
        policyAnalysis.obligations.join(" "),
        policyAnalysis.affected_industries.join(" ")
      ].join(" ")
    : [policyAnalysis.policyName, policyAnalysis.policyText, policyAnalysis.mechanisms.join(" ")].join(" ");

  return /ai|algorithm|automated|machine learning|model/i.test(text) &&
    /hiring|employment|job applicant|job seeker|resume|résumé|recruit|candidate|interview|workforce|applicant tracking|ats|bias audit/i.test(text);
}

export function estimateEconomicRiskScore(exposure: EconomicExposure): number {
  const pressureText = [
    exposure.household_exposure,
    exposure.business_exposure,
    exposure.labor_market_exposure,
    exposure.industry_exposure,
    exposure.cost_of_living_sensitivity,
    exposure.equity_sensitivity
  ].join(" ");
  let score = 45;

  if (/small employers?|fixed compliance|cost-of-living|housing burden|poverty/i.test(pressureText)) score += 18;
  if (/audit|legal review|vendor contract|workflow friction/i.test(pressureText)) score += 14;
  if (/equity|vulnerable|low-income|less savings/i.test(pressureText)) score += 10;
  if (exposure.confidence < 0.55) score += 6;

  return Math.max(0, Math.min(100, score));
}

function getJurisdiction(policyAnalysis: PolicyInput) {
  return policyAnalysis.jurisdiction || "Unspecified jurisdiction";
}

function getAffectedGroups(policyAnalysis: PolicyInput) {
  if ("affected_groups" in policyAnalysis) {
    return policyAnalysis.affected_groups;
  }

  return policyAnalysis.affectedParties;
}

function getAffectedIndustries(policyAnalysis: PolicyInput) {
  if ("affected_industries" in policyAnalysis) {
    return policyAnalysis.affected_industries;
  }

  return policyAnalysis.affectedParties;
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0.5;
  }

  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}
