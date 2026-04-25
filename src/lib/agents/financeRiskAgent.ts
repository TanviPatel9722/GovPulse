import { callOpenAIJson } from "@/lib/llm/openai";
import { MODEL_CONFIG } from "@/lib/llm/modelRouter";
import { FINANCE_RISK_AGENT_SYSTEM_PROMPT, buildFinanceRiskPrompt } from "@/lib/llm/prompts";
import type { LLMMode } from "@/lib/llm/llmTypes";
import type { PolicyAnalysis } from "@/lib/agents/policyParser";
import type { EvidenceCard } from "@/lib/evidence/evidenceCard";
import type {
  EconomicExposure,
  FinanceInsuranceRiskCategory,
  FinanceInsuranceRisk,
  FraudRiskAssessment,
  SentimentForecast
} from "@/lib/types";

export type GenerateFinanceInsuranceRiskInput = {
  policyAnalysis: PolicyAnalysis;
  economicExposure: EconomicExposure;
  sentimentForecast: SentimentForecast;
  fraudRiskAssessment: FraudRiskAssessment;
  evidenceCards: EvidenceCard[];
  mode?: LLMMode;
};

export async function generateFinanceInsuranceRisk(
  input: GenerateFinanceInsuranceRiskInput
): Promise<FinanceInsuranceRisk> {
  const fallback = buildDemoFinanceInsuranceRisk(input);

  return callOpenAIJson<FinanceInsuranceRisk>({
    model: MODEL_CONFIG.financeRiskAgent,
    systemPrompt: FINANCE_RISK_AGENT_SYSTEM_PROMPT,
    userPrompt: buildFinanceRiskPrompt(input),
    schemaName: "FinanceInsuranceRisk",
    fallback,
    mode: input.mode
  });
}

function buildDemoFinanceInsuranceRisk(input: GenerateFinanceInsuranceRiskInput): FinanceInsuranceRisk {
  const evidenceIds = getEvidenceIds(input.evidenceCards);
  const sourceIds = getSourceIds(input.evidenceCards);

  if (isAiHiringPolicy(input.policyAnalysis)) {
    return {
      risk_categories: [
        {
          risk_name: "Employer compliance spend",
          category: "business_credit",
          simulated_effect:
            "Covered employers may face new legal, audit, HR operations, and vendor-management spending before the rule takes effect.",
          metric_value: "$15k-$75k mid-size employer; $75k-$250k+ enterprise first-year burden",
          metric_source_type: "scenario-assumption",
          source_ids: sourceIds,
          monetized_risk_explanation:
            "Range reflects modeled first-year implementation work: tool inventory, legal review, vendor amendments, applicant notices, audit procurement, and appeal workflow setup.",
          why_policy_creates_this_risk:
            "The rule converts opaque hiring automation into documented, auditable, and appealable workflows.",
          who_bears_the_risk: "Covered employers, HR operations teams, legal departments, and indirectly some vendors/customers.",
          mitigation: "Safe-harbor templates, phased rollout by employer size, model audit summary format, and vendor evidence checklist.",
          confidence: 0.58,
          assumptions: ["Cost range is not source-backed; validate with employer surveys and vendor quotes."],
          limitations: ["Do not present as a budget score without local employer count and tool-use prevalence evidence."],
          evidence_card_ids: evidenceIds
        },
        {
          risk_name: "AI audit and certification market",
          category: "procurement",
          simulated_effect:
            "Annual audit demand may create short-term price pressure and inconsistent certificate quality unless standards are defined.",
          metric_value: "$8k-$60k per tool/year audit-price exposure",
          metric_source_type: "scenario-assumption",
          source_ids: sourceIds,
          monetized_risk_explanation:
            "Audit exposure depends on model complexity, data access, disparate-impact testing, documentation quality, and whether vendors provide reusable evidence.",
          why_policy_creates_this_risk:
            "Employers need acceptable annual bias audits and may rely on a limited pool of qualified reviewers.",
          who_bears_the_risk: "Employers, HR tech vendors, audit firms, procurement teams, and enforcement agencies reviewing certificates.",
          mitigation: "Approved audit standard, random quality review, conflict-of-interest rules, and public sample audit summary.",
          confidence: 0.56,
          assumptions: ["Audit pricing is a planning range, not a CrustData-confirmed quote."],
          limitations: ["Needs live vendor quote, market capacity, and agency acceptance criteria evidence."],
          evidence_card_ids: evidenceIds
        },
        {
          risk_name: "Agency enforcement budget",
          category: "public_budget",
          simulated_effect:
            "The enforcing office may need complaint triage, technical review, outreach, and random-check capacity.",
          metric_value: "2-6 FTE equivalent enforcement capacity need",
          metric_source_type: "model-estimated",
          source_ids: sourceIds,
          monetized_risk_explanation:
            "Public cost is more likely staffing and technical review capacity than direct subsidies. Exact budget requires expected complaint volume and employer coverage count.",
          why_policy_creates_this_risk:
            "Appeal rights and annual audits create recurring review, education, and enforcement workload.",
          who_bears_the_risk: "Office of Human Rights, budget office, taxpayers, and applicants if enforcement capacity is underfunded.",
          mitigation: "Complaint intake triage, technical assistance desk, risk-based audit sampling, and public dashboard of aggregate outcomes.",
          confidence: 0.54,
          assumptions: ["FTE estimate assumes citywide coverage and a 12-month education/grace period."],
          limitations: ["Needs local employer count, tool-use prevalence, and complaint-volume benchmarks."],
          evidence_card_ids: evidenceIds
        },
        {
          risk_name: "Employment practices liability and litigation",
          category: "insurance",
          simulated_effect:
            "EPLI and legal-review exposure may rise if disclosures create new evidence trails but standards remain ambiguous.",
          metric_value: "moderate claim-handling and legal-review exposure",
          metric_source_type: "model-estimated",
          source_ids: sourceIds,
          monetized_risk_explanation:
            "Risk is likely to appear as legal review, claim defense, and settlement pressure rather than a direct market shock.",
          why_policy_creates_this_risk:
            "Audit records, appeal logs, and adverse-action notices become discoverable evidence of hiring practices.",
          who_bears_the_risk: "Employers, insurers, employment counsel, HR tech vendors, and applicants pursuing appeals.",
          mitigation: "Clear legal safe harbor for good-faith compliance, recordkeeping standard, and cure period for non-material errors.",
          confidence: 0.52,
          assumptions: ["This is a pre-mortem exposure category, not a prediction of lawsuits."],
          limitations: ["Insurance premium or claim-frequency effects should not be claimed without carrier or claims-history evidence."],
          evidence_card_ids: evidenceIds
        }
      ],
      warnings: [
        "AI hiring finance metrics are planning ranges. They must be validated with employer counts, vendor quotes, audit-market evidence, and agency workload estimates."
      ]
    };
  }

  if (isPlasticBagPolicy(input.policyAnalysis)) {
    return {
    risk_categories: [
      {
        risk_name: "Retail mitigation procurement",
        category: "procurement",
        simulated_effect: "Public agencies may need rapid reusable-bag purchasing for low-income mitigation programs.",
        metric_value: "low-to-moderate budget exposure",
        metric_source_type: "scenario-assumption",
        source_ids: sourceIds,
        monetized_risk_explanation:
          "Budget exposure is plausible if government funds reusable bag distribution, but exact cost needs recipient counts and unit-price evidence.",
        why_policy_creates_this_risk: "The policy shifts household behavior and may require visible mitigation to maintain adoption readiness.",
        who_bears_the_risk: "Public budget offices, procurement teams, community distribution partners.",
        mitigation: "Pre-approved vendor pool, price ceilings, inventory controls, and community distribution reporting.",
        confidence: 0.58,
        assumptions: ["No source-backed procurement volume is attached in demo mode."],
        limitations: ["Budget exposure is not monetized without official recipient counts and procurement price data."],
        evidence_card_ids: evidenceIds
      },
      {
        risk_name: "Small supplier business credit stress",
        category: "business_credit",
        simulated_effect:
          "Plastic bag suppliers with concentrated checkout-bag revenue may face weaker receivables or credit pressure during transition.",
        metric_value: "speculative localized credit stress",
        metric_source_type: "scenario-assumption",
        source_ids: sourceIds,
        monetized_risk_explanation:
          "The risk is plausible for concentrated suppliers but should be treated as weak until revenue mix and lender exposure are sourced.",
        why_policy_creates_this_risk: "Demand contraction can reduce revenue before firms retool or find substitute markets.",
        who_bears_the_risk: "Small manufacturers, lenders, trade creditors, employees.",
        mitigation: "Transition finance, technical assistance, and procurement preference for retooled recycled-content products.",
        confidence: 0.52,
        assumptions: ["Market risk is separate from policy risk and is not a claim about any specific firm."],
        limitations: ["Firm-level credit stress cannot be source-backed from placeholder stakeholder data."],
        evidence_card_ids: evidenceIds
      },
      {
        risk_name: "False compliance and product-label exposure",
        category: "insurance",
        simulated_effect:
          "Retailers and substitute suppliers may face compliance disputes if bags are marketed as reusable or compostable without meeting standards.",
        metric_value: "moderate compliance/litigation exposure",
        metric_source_type: "model-estimated",
        source_ids: sourceIds,
        monetized_risk_explanation:
          "Risk is more likely to show up as compliance cost, legal review, and claim handling than large direct insured losses.",
        why_policy_creates_this_risk: "The policy creates a new product-standard boundary that can be gamed or misunderstood.",
        who_bears_the_risk: "Retailers, product suppliers, commercial insurers, enforcement agencies.",
        mitigation: "Verified product standards, supplier attestations, random testing, and cure periods for good-faith errors.",
        confidence: 0.6,
        assumptions: ["This is a pre-mortem exposure category, not an accusation of fraud."],
        limitations: ["Insurance effect is directional; claim frequency and litigation history are not attached in demo mode."],
        evidence_card_ids: evidenceIds
      },
      {
        risk_name: "Municipal bond impact",
        category: "municipal_bonds",
        simulated_effect: "Weak or speculative direct impact unless implementation costs become part of broader budget stress.",
        metric_value: "weak direct effect",
        metric_source_type: "scenario-assumption",
        source_ids: sourceIds,
        monetized_risk_explanation:
          "A bag ban is unlikely by itself to move borrowing costs; budget effects are probably small unless mitigation is unfunded or litigation expands.",
        why_policy_creates_this_risk: "Implementation, procurement, and enforcement costs can affect local budgets at the margin.",
        who_bears_the_risk: "Municipal budget offices and taxpayers.",
        mitigation: "Budget note, phased procurement, and public reporting of implementation cost.",
        confidence: 0.49,
        assumptions: ["Finance effect is intentionally labeled weak to avoid overstating market impact."],
        limitations: ["No bond-yield or credit-rating effect should be claimed without Treasury, Fed, rating, or municipal finance evidence."],
        evidence_card_ids: evidenceIds
      }
    ],
      warnings: ["Finance and insurance risks are included only where plausible; weak effects are labeled as weak or speculative."]
    };
  }

  return {
    risk_categories: buildPolicySpecificFinanceRisks(input, evidenceIds, sourceIds),
    warnings: [
      "Finance and insurance exposure is policy-specific and uses planning ranges unless evidence cards provide source-backed numbers.",
      "Market risk is separated from policy risk; speculative pathways are labeled as assumptions."
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
    policyAnalysis.costs.join(" "),
    policyAnalysis.economic_pressure_points.join(" ")
  ].some((value) => /plastic|single-use|checkout bag|bag ban|reusable bag|paper bag|packaging/i.test(value));
}

function buildPolicySpecificFinanceRisks(
  input: GenerateFinanceInsuranceRiskInput,
  evidenceIds: string[],
  sourceIds: string[]
): FinanceInsuranceRiskCategory[] {
  const policyText = getPolicyText(input.policyAnalysis);
  const risks: FinanceInsuranceRiskCategory[] = [];

  if (hasBusinessComplianceBurden(policyText, input.policyAnalysis)) {
    risks.push(buildComplianceSpendRisk(input, evidenceIds, sourceIds));
  }

  if (hasPublicBudgetBurden(policyText, input.policyAnalysis)) {
    risks.push(buildPublicBudgetRisk(input, evidenceIds, sourceIds));
  }

  if (hasHouseholdExposure(policyText, input.policyAnalysis)) {
    risks.push(buildHouseholdBurdenRisk(input, evidenceIds, sourceIds));
  }

  if (hasProcurementOrVendorExposure(policyText, input.policyAnalysis)) {
    risks.push(buildProcurementRisk(input, evidenceIds, sourceIds));
  }

  if (hasInsuranceOrLegalExposure(policyText, input.policyAnalysis)) {
    risks.push(buildInsuranceLegalRisk(input, evidenceIds, sourceIds));
  }

  if (risks.length === 0) {
    risks.push(buildGeneralFiscalReadinessRisk(input, evidenceIds, sourceIds));
  }

  return risks.slice(0, 5);
}

function buildComplianceSpendRisk(
  input: GenerateFinanceInsuranceRiskInput,
  evidenceIds: string[],
  sourceIds: string[]
): FinanceInsuranceRiskCategory {
  const regulatedGroup = findRegulatedGroup(input.policyAnalysis);
  const obligation = firstSignal(input.policyAnalysis.obligations, "new compliance obligations");

  return {
    risk_name: `${capitalizeLabel(regulatedGroup)} compliance spend`,
    category: "business_credit",
    simulated_effect: `${capitalizeLabel(regulatedGroup)} may face setup and recurring costs tied to ${obligation}.`,
    metric_value: "$5k-$50k small-entity setup burden; $50k-$200k+ complex-entity burden",
    metric_source_type: "scenario-assumption",
    source_ids: sourceIds,
    monetized_risk_explanation:
      "Range is a planning placeholder for legal review, process changes, staff time, software/vendor changes, documentation, and training.",
    why_policy_creates_this_risk: firstSignal(input.policyAnalysis.costs, "The policy creates obligations that require documentation, staffing, or operational change."),
    who_bears_the_risk: `${capitalizeLabel(regulatedGroup)}, vendors supporting compliance, and customers if costs are passed through.`,
    mitigation: "Phase by entity size, publish templates, create a cure period, and offer technical assistance for smaller or lower-capacity entities.",
    confidence: financeConfidence(input.evidenceCards.length, 0.55),
    assumptions: ["Exact cost depends on entity count, current systems, legal complexity, and compliance standard."],
    limitations: ["Requires source-backed employer/business counts, vendor quotes, and implementation-cost interviews."],
    evidence_card_ids: evidenceIds
  };
}

function buildPublicBudgetRisk(
  input: GenerateFinanceInsuranceRiskInput,
  evidenceIds: string[],
  sourceIds: string[]
): FinanceInsuranceRiskCategory {
  return {
    risk_name: "Agency implementation budget",
    category: "public_budget",
    simulated_effect:
      "The implementing agency may need staff, guidance, complaint intake, data review, reporting, procurement, or outreach capacity.",
    metric_value: "1-6 FTE-equivalent or equivalent vendor support; model-estimated range",
    metric_source_type: "model-estimated",
    source_ids: sourceIds,
    monetized_risk_explanation:
      "Public budget risk is mainly operating capacity unless the policy creates grants, rebates, procurement, or inspection programs.",
    why_policy_creates_this_risk: input.policyAnalysis.enforcement_mechanism,
    who_bears_the_risk: "Implementing agency, budget office, taxpayers, and affected people if service levels are underfunded.",
    mitigation: "Budget note, service-level targets, risk-based enforcement, public dashboard, and early technical assistance.",
    confidence: financeConfidence(input.evidenceCards.length, 0.52),
    assumptions: ["FTE range is inferred from policy complexity and should be replaced by agency workload modeling."],
    limitations: ["Do not treat as an official fiscal score without agency staffing and complaint-volume evidence."],
    evidence_card_ids: evidenceIds
  };
}

function buildHouseholdBurdenRisk(
  input: GenerateFinanceInsuranceRiskInput,
  evidenceIds: string[],
  sourceIds: string[]
): FinanceInsuranceRiskCategory {
  const affectedGroup = findHouseholdGroup(input.policyAnalysis);

  return {
    risk_name: `${capitalizeLabel(affectedGroup)} affordability exposure`,
    category: "other",
    simulated_effect:
      "Household-facing burden is likely to appear through fees, prices, access delays, eligibility friction, or compliance pass-through.",
    metric_value: "low-to-moderate household exposure; validate with ACS/BLS/local administrative data",
    metric_source_type: "scenario-assumption",
    source_ids: sourceIds,
    monetized_risk_explanation:
      "Exposure is directional because household impact depends on pass-through behavior, eligibility, take-up, and local cost-of-living pressure.",
    why_policy_creates_this_risk: firstSignal(input.policyAnalysis.economic_pressure_points, input.economicExposure.household_exposure),
    who_bears_the_risk: `${capitalizeLabel(affectedGroup)}, service users, consumers, or applicants depending on final rule design.`,
    mitigation: "Targeted exemption, rebate, plain-language eligibility, community outreach, and fast appeal or help-desk routing.",
    confidence: financeConfidence(input.evidenceCards.length, 0.49),
    assumptions: ["Household burden should be validated with ACS income, poverty, housing-burden, commute, or service-use data."],
    limitations: ["No exact household dollar value should be claimed without source-backed baseline and pass-through model."],
    evidence_card_ids: evidenceIds
  };
}

function buildProcurementRisk(
  input: GenerateFinanceInsuranceRiskInput,
  evidenceIds: string[],
  sourceIds: string[]
): FinanceInsuranceRiskCategory {
  const vendorTerm = input.policyAnalysis.affected_companies_query_terms[0] ?? "implementation vendors";

  return {
    risk_name: "Vendor and procurement exposure",
    category: "procurement",
    simulated_effect:
      "Demand for vendor services, certifications, software changes, substitutes, audits, or implementation support may rise quickly.",
    metric_value: "5-15% near-term demand pressure for affected vendor categories",
    metric_source_type: "model-estimated",
    source_ids: sourceIds,
    monetized_risk_explanation:
      "Procurement pressure may show up as higher quotes, vendor bottlenecks, low-quality providers, or delayed implementation.",
    why_policy_creates_this_risk: `Parsed stakeholder query term: ${vendorTerm}.`,
    who_bears_the_risk: "Regulated entities, public procurement teams, vendors, and affected residents if rollout depends on vendor capacity.",
    mitigation: "Pre-qualify vendors, publish standards, require transparent pricing, and monitor concentration or conflicts.",
    confidence: financeConfidence(input.evidenceCards.length, 0.53),
    assumptions: ["Demand range is inferred and should be validated with CrustData, procurement data, and vendor quotes."],
    limitations: ["CrustData company signals do not by themselves prove official policy positions or representative sentiment."],
    evidence_card_ids: evidenceIds
  };
}

function buildInsuranceLegalRisk(
  input: GenerateFinanceInsuranceRiskInput,
  evidenceIds: string[],
  sourceIds: string[]
): FinanceInsuranceRiskCategory {
  return {
    risk_name: "Legal and insurance exposure",
    category: "insurance",
    simulated_effect:
      "Legal-review, claim-handling, or compliance-liability exposure may rise if standards are ambiguous or enforcement records create new evidence trails.",
    metric_value: "moderate legal-review exposure; insurance impact not source-backed",
    metric_source_type: "scenario-assumption",
    source_ids: sourceIds,
    monetized_risk_explanation:
      "The most plausible monetized effect is legal review, defense, compliance remediation, or claim handling rather than a broad market shock.",
    why_policy_creates_this_risk: firstSignal(input.policyAnalysis.legal_ambiguities, "Ambiguous standards can increase dispute and compliance-review costs."),
    who_bears_the_risk: "Regulated entities, insurers, legal counsel, agencies, and affected people seeking remedies.",
    mitigation: "Clear safe harbor, cure period, recordkeeping standard, dispute-resolution pathway, and public examples.",
    confidence: financeConfidence(input.evidenceCards.length, 0.48),
    assumptions: ["This is a pre-mortem exposure path, not a prediction that lawsuits or claims will occur."],
    limitations: ["Do not cite premium, yield, or claim-rate impacts without carrier data or source-backed claims history."],
    evidence_card_ids: evidenceIds
  };
}

function buildGeneralFiscalReadinessRisk(
  input: GenerateFinanceInsuranceRiskInput,
  evidenceIds: string[],
  sourceIds: string[]
): FinanceInsuranceRiskCategory {
  return {
    risk_name: "General fiscal readiness",
    category: "public_budget",
    simulated_effect:
      "Direct financial exposure is not clearly specified, but implementation still needs capacity, guidance, and evidence validation.",
    metric_value: "weak direct finance effect; source-backed fiscal note needed",
    metric_source_type: "scenario-assumption",
    source_ids: sourceIds,
    monetized_risk_explanation:
      "The submitted policy text does not support a precise cost, revenue, insurance, or market estimate.",
    why_policy_creates_this_risk: "Any policy launch can create administrative cost and public-trust risk if budget, staffing, or guidance is unclear.",
    who_bears_the_risk: "Policy team, implementing agency, and affected residents if rollout is under-resourced.",
    mitigation: "Produce a fiscal note, implementation calendar, and evidence-quality checklist before launch.",
    confidence: financeConfidence(input.evidenceCards.length, 0.44),
    assumptions: ["The system intentionally avoids inventing precise fiscal exposure for underspecified policies."],
    limitations: ["Needs source-backed official budget, Census/BLS/BEA/FRED context, or administrative workload data."],
    evidence_card_ids: evidenceIds
  };
}

function hasBusinessComplianceBurden(policyText: string, policyAnalysis: PolicyAnalysis) {
  return /business|employer|company|vendor|retailer|landlord|provider|contractor|regulated/i.test(policyText) ||
    policyAnalysis.affected_groups.some((group) => /business|employer|company|vendor|retailer|landlord|provider|contractor/i.test(group));
}

function hasPublicBudgetBurden(policyText: string, policyAnalysis: PolicyAnalysis) {
  return /agency|enforce|complaint|audit|inspection|grant|rebate|subsidy|procurement|appropriat|budget|public/i.test(policyText) ||
    policyAnalysis.implementation_bottlenecks.some((bottleneck) => /agency|staff|enforce|budget|procurement/i.test(bottleneck));
}

function hasHouseholdExposure(policyText: string, policyAnalysis: PolicyAnalysis) {
  return /household|resident|consumer|tenant|patient|student|worker|applicant|low-income|fee|tax|cost|price|rent|benefit/i.test(policyText) ||
    policyAnalysis.affected_groups.some((group) => /resident|household|consumer|tenant|patient|student|worker|applicant|low-income/i.test(group));
}

function hasProcurementOrVendorExposure(policyText: string, policyAnalysis: PolicyAnalysis) {
  return /vendor|procurement|contract|software|supplier|consultant|audit|certif|substitute|grant|rebate/i.test(policyText) ||
    policyAnalysis.affected_companies_query_terms.length > 0;
}

function hasInsuranceOrLegalExposure(policyText: string, policyAnalysis: PolicyAnalysis) {
  return /liability|insurance|appeal|complaint|penalt|fine|civil rights|audit|record|legal|lawsuit|violation/i.test(policyText) ||
    policyAnalysis.legal_ambiguities.length > 0;
}

function findRegulatedGroup(policyAnalysis: PolicyAnalysis) {
  return (
    policyAnalysis.affected_groups.find((group) =>
      /business|employer|company|vendor|retailer|landlord|provider|contractor|agency|regulated/i.test(group)
    ) ?? "regulated entities"
  );
}

function findHouseholdGroup(policyAnalysis: PolicyAnalysis) {
  return (
    policyAnalysis.affected_groups.find((group) =>
      /resident|household|consumer|tenant|patient|student|worker|applicant|low-income/i.test(group)
    ) ?? "affected households"
  );
}

function firstSignal(values: string[], fallback: string) {
  return values.find((value) => value.trim().length > 0) ?? fallback;
}

function getPolicyText(policyAnalysis: PolicyAnalysis) {
  return [
    policyAnalysis.policy_title,
    policyAnalysis.policy_domain,
    policyAnalysis.obligations.join(" "),
    policyAnalysis.costs.join(" "),
    policyAnalysis.enforcement_mechanism,
    policyAnalysis.economic_pressure_points.join(" "),
    policyAnalysis.legal_ambiguities.join(" ")
  ].join(" ");
}

function financeConfidence(evidenceCount: number, base: number) {
  return Math.round(Math.min(0.72, base + Math.min(0.12, evidenceCount * 0.01)) * 100) / 100;
}

function capitalizeLabel(value: string) {
  return value.trim().replace(/\s+/g, " ").replace(/^./, (match) => match.toUpperCase());
}

function getEvidenceIds(evidenceCards: EvidenceCard[]) {
  return evidenceCards.length > 0 ? evidenceCards.slice(0, 8).map((card) => card.id) : ["assumption-labeled"];
}

function getSourceIds(evidenceCards: EvidenceCard[]) {
  return evidenceCards.length > 0 ? Array.from(new Set(evidenceCards.slice(0, 8).map((card) => card.source_name))) : ["assumption-labeled"];
}
