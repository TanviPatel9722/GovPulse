import { callOpenAIJson } from "@/lib/llm/openai";
import { MODEL_CONFIG } from "@/lib/llm/modelRouter";
import { MARKET_SHOCK_AGENT_SYSTEM_PROMPT, buildMarketShockPrompt } from "@/lib/llm/prompts";
import type { LLMMode } from "@/lib/llm/llmTypes";
import type { PolicyAnalysis } from "@/lib/agents/policyParser";
import type { EvidenceCard } from "@/lib/evidence/evidenceCard";
import type { EconomicExposure, IndustryRippleEffect, IndustryRippleEffects, StakeholderIntelligence } from "@/lib/types";

export type GenerateIndustryRippleEffectsInput = {
  policyAnalysis: PolicyAnalysis;
  stakeholderMap: StakeholderIntelligence;
  economicExposure: EconomicExposure;
  evidenceCards: EvidenceCard[];
  mode?: LLMMode;
};

export async function generateIndustryRippleEffects(
  input: GenerateIndustryRippleEffectsInput
): Promise<IndustryRippleEffects> {
  const fallback = buildDemoIndustryRippleEffects(input);

  return callOpenAIJson<IndustryRippleEffects>({
    model: MODEL_CONFIG.marketShockAgent,
    systemPrompt: MARKET_SHOCK_AGENT_SYSTEM_PROMPT,
    userPrompt: buildMarketShockPrompt(input),
    schemaName: "IndustryRippleEffects",
    fallback,
    mode: input.mode
  });
}

function buildDemoIndustryRippleEffects(input: GenerateIndustryRippleEffectsInput): IndustryRippleEffects {
  const evidenceIds = getEvidenceIds(input.evidenceCards);
  const sourceIds = getSourceIds(input.evidenceCards);

  if (isAiHiringPolicy(input.policyAnalysis)) {
    return {
      industries: [
        {
          industry_name: "HR tech and applicant tracking platforms",
          effect_type: "demand_spike",
          simulated_effect:
            "8-18% near-term demand lift for disclosure, audit-log, explainability, and appeal-workflow modules among covered employers.",
          metric_value: "8-18% compliance-feature demand lift",
          metric_source_type: "model-estimated",
          source_ids: sourceIds,
          key_ripple_effect:
            "Vendors that can package compliance workflows may gain market share; vendors without audit evidence may face churn or contract friction.",
          affected_companies_or_segments: ["ATS providers", "AI recruiting tools", "interview-scoring vendors", "background-check platforms"],
          labor_effect: "Product, legal, customer-success, and compliance teams absorb new implementation work.",
          supply_demand_effect: "Demand shifts from generic screening automation toward auditable, explainable, appeal-ready hiring systems.",
          confidence: 0.64,
          assumptions: [
            "Demand lift is a modeled range based on expected compliance procurement behavior, not a source-backed market forecast."
          ],
          limitations: ["Validate with CrustData hiring/product signals, vendor pricing, and employer procurement interviews."],
          evidence_card_ids: evidenceIds
        },
        {
          industry_name: "Large employers using automated hiring tools",
          effect_type: "compliance_cost",
          simulated_effect:
            "First-year compliance burden of roughly $75k-$250k+ for enterprise employers with multiple automated tools and high hiring volume.",
          metric_value: "$75k-$250k+ first-year enterprise compliance burden",
          metric_source_type: "scenario-assumption",
          source_ids: sourceIds,
          key_ripple_effect:
            "Business opposition likely rises if audit standards, vendor responsibilities, and appeal service levels remain unclear.",
          affected_companies_or_segments: ["large retailers", "hospital systems", "universities", "hospitality groups", "staffing-heavy employers"],
          labor_effect: "HR operations, legal, recruiting, and vendor-management teams absorb recurring compliance work.",
          supply_demand_effect: "Employer demand shifts toward standardized audit certificates, disclosure templates, and lower-risk vendors.",
          confidence: 0.6,
          assumptions: ["Cost range depends on number of tools, hiring volume, audit standard, and internal legal capacity."],
          limitations: ["Requires employer survey and vendor quote evidence before being treated as source-backed."],
          evidence_card_ids: evidenceIds
        },
        {
          industry_name: "Compliance consultants and AI audit providers",
          effect_type: "demand_spike",
          simulated_effect:
            "10-25% short-term demand lift for AI hiring audits, governance readiness, vendor reviews, and policy documentation.",
          metric_value: "10-25% audit/readiness demand lift",
          metric_source_type: "model-estimated",
          source_ids: sourceIds,
          key_ripple_effect:
            "A fast-growing compliance vendor market can create uneven audit quality unless the rule defines standards and accepted evidence.",
          affected_companies_or_segments: ["AI auditors", "employment-law advisors", "HR compliance consultants", "model governance firms"],
          labor_effect: "Higher demand for auditors, employment lawyers, data scientists, and HR compliance specialists.",
          supply_demand_effect: "Demand may exceed supply during the grace period, raising audit prices and wait times.",
          confidence: 0.62,
          assumptions: ["Demand lift assumes a 12-month grace period and enforceable annual audit requirement."],
          limitations: ["Live CrustData hiring and funding signals should be used to validate vendor-market growth."],
          evidence_card_ids: evidenceIds
        },
        {
          industry_name: "Staffing agencies and recruiting operations",
          effect_type: "compliance_cost",
          simulated_effect:
            "1-3 week implementation delay risk during rollout if notices, adverse-action workflows, and human-review routing are not templated.",
          metric_value: "1-3 week rollout friction risk",
          metric_source_type: "scenario-assumption",
          source_ids: sourceIds,
          key_ripple_effect:
            "Applicants may support appeal rights but grow frustrated if appeals slow hiring or are hard to navigate.",
          affected_companies_or_segments: ["staffing agencies", "RPO providers", "high-volume recruiting teams", "campus recruiting teams"],
          labor_effect: "Recruiters and HR coordinators handle manual review, applicant questions, and recordkeeping.",
          supply_demand_effect: "Demand increases for workflow integrations and standardized applicant communications.",
          confidence: 0.58,
          assumptions: ["Delay risk drops if the city provides templates, safe harbors, and service-level expectations."],
          limitations: ["Operational duration should be validated with pilot data and employer implementation plans."],
          evidence_card_ids: evidenceIds
        }
      ],
      warnings: [
        "AI hiring industry metrics are model-estimated or scenario assumptions unless explicitly supported by attached evidence cards."
      ]
    };
  }

  if (isPlasticBagPolicy(input.policyAnalysis)) {
    return {
      industries: [
      {
        industry_name: "Plastic film manufacturers",
        effect_type: "revenue_contraction",
        simulated_effect: "10-20% short-term demand contraction for single-use checkout bag product lines.",
        metric_value: "10-20% affected product-line demand contraction",
        metric_source_type: "placeholder-demo-estimate",
        source_ids: sourceIds,
        key_ripple_effect:
          "Potential facility slowdowns, labor displacement, and pressure to retool toward recyclable or reusable packaging.",
        affected_companies_or_segments: ["small regional bag producers", "plastic film converters", "packaging distributors"],
        labor_effect: "Model-estimated displacement pressure for line workers tied to checkout bag production.",
        supply_demand_effect: "Demand falls for banned bags while transition demand may rise for compliant packaging.",
        confidence: 0.62,
        assumptions: ["Estimate applies to exposed product lines, not total manufacturer revenue."],
        limitations: ["Demo estimate is not source-backed and should be replaced with industry shipment or firm revenue data."],
        evidence_card_ids: evidenceIds
      },
      {
        industry_name: "Reusable and paper bag suppliers",
        effect_type: "demand_spike",
        simulated_effect: "Near-term demand spike as retailers shift to compliant alternatives.",
        metric_value: "moderate-to-high short-term demand spike",
        metric_source_type: "scenario-assumption",
        source_ids: sourceIds,
        key_ripple_effect: "Supplier shortages or price increases can convert environmental support into affordability concern.",
        affected_companies_or_segments: ["paper bag suppliers", "reusable bag importers", "wholesale distributors"],
        labor_effect: "Potential hiring or overtime in distribution and substitute packaging segments.",
        supply_demand_effect: "Demand shifts toward substitutes before supply contracts stabilize.",
        confidence: 0.66,
        assumptions: ["Magnitude depends on phase-in timing, exemptions, and retailer inventory planning."],
        limitations: ["No source-backed substitute-market capacity estimate is attached in demo mode."],
        evidence_card_ids: evidenceIds
      },
      {
        industry_name: "Small retail and grocery operations",
        effect_type: "compliance_cost",
        simulated_effect: "Operational friction from signage, staff training, substitute sourcing, and customer conflict handling.",
        metric_value: "$0.00 precise cost not estimated; cost burden is directional",
        metric_source_type: "scenario-assumption",
        source_ids: sourceIds,
        key_ripple_effect: "Small retailers may amplify opposition if they lack procurement support or clear enforcement guidance.",
        affected_companies_or_segments: ["corner stores", "independent grocers", "rural retailers", "pharmacies"],
        labor_effect: "Frontline workers absorb customer education and conflict management burden.",
        supply_demand_effect: "Higher demand for compliant bag inventory and point-of-sale policy materials.",
        confidence: 0.64,
        assumptions: ["No source-backed compliance-cost model is attached in demo mode."],
        limitations: ["Compliance cost should be validated with retailer surveys, procurement quotes, and enforcement guidance."],
        evidence_card_ids: evidenceIds
      },
      {
        industry_name: "Waste management and recycling",
        effect_type: "supply_chain_shift",
        simulated_effect: "Potential reduction in plastic bag contamination with new pressure from paper/reusable alternatives.",
        metric_value: "directional operational shift",
        metric_source_type: "scenario-assumption",
        source_ids: sourceIds,
        key_ripple_effect: "Municipal waste systems may see operational benefits only if substitute materials are managed well.",
        affected_companies_or_segments: ["municipal waste programs", "recyclers", "haulers"],
        labor_effect: "Limited direct displacement; possible routing, sorting, and education workflow changes.",
        supply_demand_effect: "Less thin-film contamination but more substitute packaging volume.",
        confidence: 0.57,
        assumptions: ["Waste effects vary sharply by local collection systems and consumer behavior."],
        limitations: ["Operational effect is not source-backed without local waste composition and contamination data."],
        evidence_card_ids: evidenceIds
      }
    ],
    warnings: ["Industry ripple metrics are directional demo estimates unless labeled source-backed."]
  };
  }

  const industries = buildPolicySpecificIndustryEffects(input, evidenceIds, sourceIds);

  return {
    industries,
    warnings: [
      "Industry ripple effects are generated from the parsed policy, affected industries, obligations, and stakeholder signals.",
      "Numeric ranges are scenario assumptions unless source-backed evidence cards are attached."
    ]
  };
}

function isAiHiringPolicy(policyAnalysis: PolicyAnalysis): boolean {
  const text = [
    policyAnalysis.policy_title,
    policyAnalysis.policy_domain,
    policyAnalysis.obligations.join(" "),
    policyAnalysis.affected_industries.join(" "),
    policyAnalysis.affected_companies_query_terms.join(" ")
  ].join(" ");

  return /ai|algorithm|automated|machine learning|model/i.test(text) &&
    /hiring|employment|job applicant|job seeker|resume|résumé|recruit|candidate|interview|workforce|applicant tracking|ATS|bias audit/i.test(text);
}

function isPlasticBagPolicy(policyAnalysis: PolicyAnalysis): boolean {
  return [
    policyAnalysis.policy_title,
    policyAnalysis.policy_domain,
    policyAnalysis.obligations.join(" "),
    policyAnalysis.affected_industries.join(" "),
    policyAnalysis.affected_companies_query_terms.join(" ")
  ].some((value) => /plastic|single-use|checkout bag|bag ban|reusable bag|paper bag|packaging/i.test(value));
}

function buildPolicySpecificIndustryEffects(
  input: GenerateIndustryRippleEffectsInput,
  evidenceIds: string[],
  sourceIds: string[]
): IndustryRippleEffect[] {
  const policyText = getPolicyText(input.policyAnalysis);
  const industries = unique([
    ...input.policyAnalysis.affected_industries,
    ...inferIndustriesFromStakeholders(input.stakeholderMap)
  ])
    .filter((industry) => industry.trim().length > 0)
    .sort((left, right) => industryPolicyPriority(right, policyText) - industryPolicyPriority(left, policyText))
    .slice(0, 6);
  const fallbackIndustries = industries.length > 0 ? industries : ["regulated entities", "public administration"];

  return fallbackIndustries.map((industry, index) =>
    buildPolicyIndustryEffect({
      industry,
      index,
      policyText,
      input,
      evidenceIds,
      sourceIds
    })
  );
}

function buildPolicyIndustryEffect({
  industry,
  index,
  policyText,
  input,
  evidenceIds,
  sourceIds
}: {
  industry: string;
  index: number;
  policyText: string;
  input: GenerateIndustryRippleEffectsInput;
  evidenceIds: string[];
  sourceIds: string[];
}): IndustryRippleEffect {
  const effectType = inferIndustryEffectType(industry, policyText, index);
  const normalizedIndustry = normalizeLabel(industry);
  const segmentMatches = input.stakeholderMap.stakeholders
    .filter((stakeholder) => stakeholder.industry.toLowerCase().includes(industry.toLowerCase().split(" ")[0] ?? ""))
    .map((stakeholder) => stakeholder.company_or_org_name)
    .slice(0, 4);
  const affectedSegments =
    segmentMatches.length > 0
      ? segmentMatches
      : input.policyAnalysis.affected_companies_query_terms.slice(0, 4).length > 0
        ? input.policyAnalysis.affected_companies_query_terms.slice(0, 4)
        : [`${normalizedIndustry} operators`, `${normalizedIndustry} suppliers`, `${normalizedIndustry} compliance teams`];

  return {
    industry_name: normalizedIndustry,
    effect_type: effectType,
    simulated_effect: industryEffectNarrative(effectType, normalizedIndustry, policyText),
    metric_value: industryMetricValue(effectType, policyText),
    metric_source_type: effectType === "neutral" || effectType === "uncertain" ? "scenario-assumption" : "model-estimated",
    source_ids: sourceIds,
    key_ripple_effect: industryRippleNarrative(effectType, normalizedIndustry, input.policyAnalysis),
    affected_companies_or_segments: affectedSegments,
    labor_effect: industryLaborEffect(effectType, normalizedIndustry, policyText),
    supply_demand_effect: industrySupplyDemandEffect(effectType, normalizedIndustry, policyText),
    confidence: confidenceForIndustry(effectType, input.evidenceCards.length),
    assumptions: [
      `Effect is inferred from policy obligations and the parsed affected industry "${normalizedIndustry}".`,
      "Range must be replaced with source-backed sector data, firm interviews, or official economic tables before final policy use."
    ],
    limitations: [
      "This is a directional pre-mortem estimate, not a firm-level revenue forecast.",
      "Stakeholder positions are inferred unless supported by live company or public-source evidence."
    ],
    evidence_card_ids: evidenceIds
  };
}

function inferIndustryEffectType(
  industry: string,
  policyText: string,
  index: number
): IndustryRippleEffect["effect_type"] {
  const combined = `${industry} ${policyText}`;

  if (/ban|prohibit|cap|limit|phase.?out|restriction|moratorium/i.test(combined)) {
    return /supplier|substitute|consult|compliance|software|audit|alternative/i.test(industry)
      ? "demand_spike"
      : "revenue_contraction";
  }

  if (/subsidy|grant|rebate|credit|procurement|incentive|fund/i.test(combined)) {
    return /consult|vendor|supplier|installer|developer|provider|software/i.test(industry) ? "demand_spike" : "supply_chain_shift";
  }

  if (/audit|report|certif|permit|license|disclos|notice|record|appeal|verification|inspection|mandate|require/i.test(combined)) {
    return /consult|software|technology|legal|professional services|audit/i.test(industry) ? "demand_spike" : "compliance_cost";
  }

  if (/automation|outsourcing|closure|retool|layoff|displacement/i.test(combined)) {
    return "labor_displacement";
  }

  if (/supply|inventory|distribution|logistics|procurement/i.test(combined)) {
    return "supply_chain_shift";
  }

  return index === 0 ? "compliance_cost" : "uncertain";
}

function industryPolicyPriority(industry: string, policyText: string) {
  const genericPenalty = /public administration|technology and data services|policy-relevant stakeholder/i.test(industry) ? -18 : 0;
  const directMention = labelsOverlap(policyText, industry) ? 22 : 0;
  const sectorSpecificity = /housing|health|hospital|tenant|property|screening|energy|retail|manufactur|packaging|labor|employment|finance|tax|education|transport|utility|care coordination|electronic health|provider/i.test(industry)
    ? 18
    : 4;

  return genericPenalty + directMention + sectorSpecificity;
}

function industryMetricValue(effectType: IndustryRippleEffect["effect_type"], policyText: string): string {
  if (/small business/i.test(policyText) && effectType === "compliance_cost") {
    return "$2k-$25k small-entity setup burden; scenario range";
  }

  const valueByType: Record<IndustryRippleEffect["effect_type"], string> = {
    revenue_contraction: "5-15% exposed-line revenue pressure; scenario range",
    demand_spike: "5-18% near-term demand lift for compliance or substitute services",
    compliance_cost: "$5k-$50k typical setup burden; $50k-$200k+ for complex entities",
    labor_displacement: "1-4 week retraining or workflow-displacement pressure",
    supply_chain_shift: "5-12% short-term procurement or demand-mix shift",
    neutral: "directional exposure only; no numeric estimate",
    uncertain: "range unavailable; needs source-backed sector data"
  };

  return valueByType[effectType];
}

function industryEffectNarrative(
  effectType: IndustryRippleEffect["effect_type"],
  industry: string,
  policyText: string
) {
  const obligationSignal = /audit|report|certif|disclos|permit|appeal|notice/i.test(policyText)
    ? "documentation and workflow obligations"
    : "policy compliance requirements";

  const valueByType: Record<IndustryRippleEffect["effect_type"], string> = {
    revenue_contraction: `${industry} may see demand or revenue pressure where the policy limits an existing product, service, or operating model.`,
    demand_spike: `${industry} may see demand lift as regulated entities look for vendors, substitutes, compliance support, or implementation capacity.`,
    compliance_cost: `${industry} is likely to absorb new ${obligationSignal}, creating setup and recurring operating cost.`,
    labor_displacement: `${industry} may need workflow redesign, retraining, or role reassignment during rollout.`,
    supply_chain_shift: `${industry} may face procurement, inventory, vendor, or distribution changes as compliance rules take effect.`,
    neutral: `${industry} has limited direct exposure based on the submitted text.`,
    uncertain: `${industry} exposure is plausible but underspecified in the current policy text.`
  };

  return valueByType[effectType];
}

function industryRippleNarrative(
  effectType: IndustryRippleEffect["effect_type"],
  industry: string,
  policyAnalysis: PolicyAnalysis
) {
  const topGroup = policyAnalysis.affected_groups[0] ?? "affected residents";
  const valueByType: Record<IndustryRippleEffect["effect_type"], string> = {
    revenue_contraction: `Opposition can amplify if ${industry} frames the policy as job loss, stranded investment, or local business disruption.`,
    demand_spike: `${industry} may become a visible beneficiary, which can help implementation but also trigger fairness questions about vendor capture.`,
    compliance_cost: `${industry} may amplify concern if obligations feel unclear, expensive, or uneven across entity size.`,
    labor_displacement: `Worker anxiety can rise if ${topGroup} see the policy as changing roles faster than training or support arrives.`,
    supply_chain_shift: `Availability, price, or vendor bottlenecks can turn a technical rollout issue into a public sentiment problem.`,
    neutral: `${industry} should be monitored but is not currently a top chain-reaction driver.`,
    uncertain: `${industry} needs targeted evidence before the system should elevate it as a major risk.`
  };

  return valueByType[effectType];
}

function industryLaborEffect(effectType: IndustryRippleEffect["effect_type"], industry: string, policyText: string) {
  if (/worker|employee|labor|hiring/i.test(policyText)) {
    return `Labor effect is direct: ${industry} may need staffing, training, human review, or altered hiring workflows.`;
  }

  const valueByType: Record<IndustryRippleEffect["effect_type"], string> = {
    revenue_contraction: "Potential hiring slowdown or retooling pressure in exposed product or service lines.",
    demand_spike: "Potential short-term hiring, overtime, or specialized consulting demand.",
    compliance_cost: "Administrative, legal, operations, and frontline staff time likely increases during rollout.",
    labor_displacement: "Role changes, retraining needs, or displacement pressure should be monitored.",
    supply_chain_shift: "Procurement and operations teams absorb vendor switching and inventory planning.",
    neutral: "No clear labor effect from submitted text.",
    uncertain: "Labor effect cannot be estimated without industry or workforce data."
  };

  return valueByType[effectType];
}

function industrySupplyDemandEffect(effectType: IndustryRippleEffect["effect_type"], industry: string, policyText: string) {
  if (/subsidy|grant|rebate|credit/i.test(policyText)) {
    return `${industry} demand may rise if funding is accessible, but bottlenecks appear if eligibility, payment timing, or vendor capacity is unclear.`;
  }

  const valueByType: Record<IndustryRippleEffect["effect_type"], string> = {
    revenue_contraction: "Demand shifts away from restricted activity before affected firms can fully transition.",
    demand_spike: "Demand shifts toward compliant substitutes, advisors, software, and implementation services.",
    compliance_cost: "Supply-demand effect is mainly internal capacity: legal, data, compliance, and customer-service workload.",
    labor_displacement: "Operational demand shifts from old workflows to retraining, review, and support functions.",
    supply_chain_shift: "Procurement mix, vendor contracts, and inventory timing become the main pressure points.",
    neutral: "No material supply-demand shock identified.",
    uncertain: "Needs source-backed market data before a directional supply-demand claim is appropriate."
  };

  return valueByType[effectType];
}

function confidenceForIndustry(effectType: IndustryRippleEffect["effect_type"], evidenceCount: number) {
  const base = effectType === "uncertain" ? 0.42 : effectType === "neutral" ? 0.46 : 0.54;
  return Math.round(Math.min(0.72, base + Math.min(0.12, evidenceCount * 0.01)) * 100) / 100;
}

function inferIndustriesFromStakeholders(stakeholderMap: StakeholderIntelligence) {
  return stakeholderMap.stakeholders.map((stakeholder) => stakeholder.industry).filter(Boolean);
}

function getPolicyText(policyAnalysis: PolicyAnalysis) {
  return [
    policyAnalysis.policy_title,
    policyAnalysis.policy_domain,
    policyAnalysis.obligations.join(" "),
    policyAnalysis.costs.join(" "),
    policyAnalysis.economic_pressure_points.join(" ")
  ].join(" ");
}

function normalizeLabel(value: string) {
  return value.trim().replace(/\s+/g, " ").replace(/^./, (match) => match.toUpperCase());
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

function getEvidenceIds(evidenceCards: EvidenceCard[]) {
  return evidenceCards.length > 0 ? evidenceCards.slice(0, 8).map((card) => card.id) : ["assumption-labeled"];
}

function getSourceIds(evidenceCards: EvidenceCard[]) {
  return evidenceCards.length > 0 ? Array.from(new Set(evidenceCards.slice(0, 8).map((card) => card.source_name))) : ["assumption-labeled"];
}
