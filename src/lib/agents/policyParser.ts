import type { ParsedPolicy } from "@/lib/types";
import { DEMO_POLICY_TEXT } from "@/lib/types";
import { sourcePlaceholders } from "@/lib/sources/publicSignals";
import { callOpenAIJson } from "@/lib/llm/openai";
import { MODEL_CONFIG } from "@/lib/llm/modelRouter";
import { POLICY_PARSER_SYSTEM_PROMPT, buildPolicyParserPrompt } from "@/lib/llm/prompts";
import type { LLMMode } from "@/lib/llm/llmTypes";

export type RequiredDataSource =
  | "Census ACS"
  | "BLS"
  | "BEA"
  | "FRED"
  | "Regulations.gov"
  | "Federal Register"
  | "Congress.gov"
  | "USAspending"
  | "Socrata/Open Data"
  | "CrustData"
  | "GDELT/news"
  | "Generic web search/manual source";

export type DataSourcePriority = "high" | "medium" | "low";

export type RequiredDataSourceRequest = {
  source: RequiredDataSource;
  query_focus: string;
  priority: DataSourcePriority;
};

export type PolicyAnalysis = {
  policy_title: string;
  policy_domain: string;
  jurisdiction: string;
  affected_groups: string[];
  affected_industries: string[];
  affected_companies_query_terms: string[];
  obligations: string[];
  benefits: string[];
  costs: string[];
  enforcement_mechanism: string;
  funding_source: string;
  implementation_timeline: string;
  economic_pressure_points: string[];
  sentiment_triggers: string[];
  legal_ambiguities: string[];
  implementation_bottlenecks: string[];
  possible_fraud_or_abuse_vectors: string[];
  required_data_sources: RequiredDataSourceRequest[];
  confidence: number;
  assumptions: string[];
  warnings: string[];
};

type PolicyParserInput = {
  policyText: string;
  jurisdiction?: string;
  policyCategory?: string;
};

const requiredPolicyAnalysisFields = [
  "policy_title",
  "policy_domain",
  "jurisdiction",
  "affected_groups",
  "affected_industries",
  "affected_companies_query_terms",
  "obligations",
  "benefits",
  "costs",
  "enforcement_mechanism",
  "funding_source",
  "implementation_timeline",
  "economic_pressure_points",
  "sentiment_triggers",
  "legal_ambiguities",
  "implementation_bottlenecks",
  "possible_fraud_or_abuse_vectors",
  "required_data_sources",
  "confidence",
  "assumptions",
  "warnings"
] as const satisfies readonly (keyof PolicyAnalysis)[];

const stringArrayFields = [
  "affected_groups",
  "affected_industries",
  "affected_companies_query_terms",
  "obligations",
  "benefits",
  "costs",
  "economic_pressure_points",
  "sentiment_triggers",
  "legal_ambiguities",
  "implementation_bottlenecks",
  "possible_fraud_or_abuse_vectors",
  "assumptions",
  "warnings"
] as const satisfies readonly (keyof PolicyAnalysis)[];

const stringFields = [
  "policy_title",
  "policy_domain",
  "jurisdiction",
  "enforcement_mechanism",
  "funding_source",
  "implementation_timeline"
] as const satisfies readonly (keyof PolicyAnalysis)[];

export async function parsePolicy(
  policyText: string,
  jurisdiction?: string,
  policyCategory?: string,
  mode: LLMMode = "demo"
): Promise<PolicyAnalysis> {
  const fallback = validatePolicyAnalysis(await mockPolicyParserLLMCall({
    policyText,
    jurisdiction,
    policyCategory
  }));

  const rawAnalysis = await callOpenAIJson<PolicyAnalysis>({
    model: MODEL_CONFIG.policyParser,
    systemPrompt: POLICY_PARSER_SYSTEM_PROMPT,
    userPrompt: buildPolicyParserPrompt(policyText, jurisdiction, policyCategory),
    schemaName: "PolicyAnalysis",
    fallback,
    mode
  });

  return validatePolicyAnalysis(rawAnalysis);
}

export async function mockPolicyParserLLMCall(input: PolicyParserInput): Promise<unknown> {
  const normalizedPolicyText = input.policyText.trim() || DEMO_POLICY_TEXT;
  const inferredJurisdiction = input.jurisdiction?.trim() || inferJurisdiction(normalizedPolicyText);
  const policyDomain = input.policyCategory?.trim() || inferPolicyDomain(normalizedPolicyText);
  const monetaryAmounts = extractMonetaryAmounts(normalizedPolicyText);
  const deadlines = extractDeadlines(normalizedPolicyText);

  if (isPlasticBagPolicy(normalizedPolicyText)) {
    return {
      policy_title: "National Single-Use Plastic Bag Ban and Transition Policy",
      policy_domain: "environmental retail regulation, waste reduction, consumer protection, manufacturing transition",
      jurisdiction: inferredJurisdiction,
      affected_groups: [
        "low-income households",
        "general shoppers",
        "small retailers",
        "manufacturing workers",
        "environmental advocacy groups",
        "municipal implementation teams"
      ],
      affected_industries: [
        "plastic film manufacturing",
        "retail and grocery",
        "paper packaging",
        "reusable bag suppliers",
        "waste management and recycling",
        "logistics and wholesale distribution"
      ],
      affected_companies_query_terms: [
        "plastic bag manufacturers",
        "plastic film converters",
        "paper bag suppliers",
        "reusable bag suppliers",
        "grocery retailers",
        "retail trade associations",
        "waste management contractors"
      ],
      obligations: [
        "Retailers must stop distributing lightweight single-use plastic checkout bags after the compliance date.",
        "Retailers may offer compliant reusable, paper, or other approved alternatives if standards are defined.",
        "Agencies must define exemptions, labeling standards, enforcement approach, and public education materials.",
        "Transition assistance may support affected manufacturers and low-income households if funded."
      ],
      benefits: [
        "May reduce plastic litter and thin-film contamination in waste systems.",
        "Can shift consumer behavior toward reusable bags if implementation is convenient and equitable.",
        "Creates an opportunity to support recycled-content and reusable packaging markets."
      ],
      costs: [
        "Retailers face substitute bag procurement, signage, training, and customer education costs.",
        "Low-income households may feel visible checkout costs unless reusable bags are distributed up front.",
        "Plastic film manufacturers may face product-line demand contraction and retooling costs.",
        "Agencies may need public education, enforcement, procurement, and transition assistance budgets."
      ],
      enforcement_mechanism:
        "Likely administrative enforcement through retailer inspections, warnings, cure periods, product-label standards, and penalties for repeat noncompliance.",
      funding_source:
        "Not specified in submitted text; plausible sources include appropriations, retailer fees, environmental funds, or transition grants.",
      implementation_timeline:
        "Likely scenario: 90-180 day public education window, followed by phased retailer compliance and a first-year cure period.",
      economic_pressure_points: [
        "Plastic bag demand contraction for exposed product lines.",
        "Substitute bag demand spike and short-term price pressure.",
        "Small-retailer procurement and staff training burden.",
        "Low-income household cost sensitivity at checkout.",
        "Public procurement exposure if free reusable bags are distributed."
      ],
      sentiment_triggers: [
        "Visible point-of-sale costs.",
        "Perceived government overreach versus environmental benefit.",
        "Fairness concerns for low-income shoppers and small retailers.",
        "Job-loss narratives from affected manufacturers.",
        "Confusion over exemptions and compliant substitute bags."
      ],
      legal_ambiguities: [
        "Definition of single-use plastic bag.",
        "Treatment of thicker plastic, compostable, paper, reusable, and produce bags.",
        "Exemptions for SNAP/WIC purchases, restaurants, pharmacies, bulk goods, or small retailers.",
        "Labeling and verification standard for compliant substitutes.",
        "Enforcement owner, penalty schedule, and cure period."
      ],
      implementation_bottlenecks: [
        "Retailer education and point-of-sale staff training.",
        "Substitute bag supply constraints.",
        "Verification of reusable or compostable product claims.",
        "Low-income household mitigation distribution.",
        "Manufacturer transition assistance and retooling support."
      ],
      possible_fraud_or_abuse_vectors: [
        "False reusable or compostable bag labeling.",
        "Inflated invoices for transition grants or reusable bag procurement.",
        "Eligibility gaming for manufacturer transition assistance.",
        "Retailers charging improper fees or misclassifying exempt bags."
      ],
      required_data_sources: buildRequiredDataSources(inferredJurisdiction, "generic_policy"),
      confidence: 0.78,
      assumptions: [
        "The submitted policy does not specify exemptions, fee structure, funding, or enforcement schedule.",
        "Scenario impacts should be validated with manufacturer revenue mix, retailer cost data, household listening, and waste-system evidence.",
        "Demo chain-reaction metrics use ranges and labeled assumptions rather than fake precision."
      ],
      warnings: []
    } satisfies PolicyAnalysis;
  }

  if (isAiHiringTransparencyPolicy(normalizedPolicyText)) {
    return {
      policy_title: "AI Hiring Transparency and Applicant Rights Rule",
      policy_domain: "AI governance, labor, employment, civil rights",
      jurisdiction: inferredJurisdiction,
      affected_groups: [
        "job applicants",
        "DC residents seeking employment",
        "employers using automated hiring tools",
        "AI hiring vendors",
        "applicant tracking system providers",
        "civil-rights enforcement staff",
        "worker advocacy organizations"
      ],
      affected_industries: [
        "human resources technology",
        "staffing and recruiting",
        "professional services",
        "healthcare employers",
        "hospitality employers",
        "nonprofit employers",
        "public-sector contractors"
      ],
      affected_companies_query_terms: [
        "Workday",
        "HireVue",
        "Greenhouse",
        "iCIMS",
        "Paradox",
        "Eightfold AI",
        "applicant tracking system",
        "AI hiring software",
        "automated employment decision tool",
        "bias audit vendor",
        "DC employers hiring automation"
      ],
      obligations: [
        "Covered employers must disclose when automated hiring tools are used in screening, ranking, scoring, interviewing, or recommending applicants.",
        "Covered employers must conduct annual bias audits for automated hiring tools.",
        "Covered employers must provide appeal rights or human review to job applicants affected by automated hiring decisions.",
        "Employers and vendors likely need records sufficient to show audit completion, notice delivery, and appeal outcomes."
      ],
      benefits: [
        "Improves applicant notice and recourse when automated tools influence hiring outcomes.",
        "Creates pressure for employers and vendors to document bias testing and mitigation.",
        "Can increase public trust in hiring systems if audit summaries and appeal timelines are meaningful.",
        "Gives agencies a clearer compliance surface for AI-enabled employment practices."
      ],
      costs: [
        "Employer compliance costs for coverage mapping, annual audits, applicant notices, appeal workflows, and recordkeeping.",
        "Vendor costs for customer documentation, data access, audit support, and product workflow changes.",
        "Agency costs for guidance, complaint intake, technical review, and enforcement capacity.",
        ...formatExtractedAmounts(monetaryAmounts)
      ],
      enforcement_mechanism:
        "Likely administrative enforcement through rulemaking guidance, complaint intake, audit documentation review, civil penalties, cure periods, or referral to civil-rights enforcement.",
      funding_source:
        "Not specified in submitted text; likely agency operating funds, enforcement appropriations, filing fees, penalties, or a dedicated implementation budget.",
      implementation_timeline: buildTimeline(
        "Annual bias audits are explicitly required; likely scenario is guidance before enforcement and a phased first audit cycle.",
        deadlines
      ),
      economic_pressure_points: [
        "Small and mid-size employers may face fixed compliance costs that do not scale with hiring volume.",
        "High-volume employers face audit, workflow, and legal review costs across multiple hiring tools.",
        "Vendors may pass compliance support costs to employer customers.",
        "Ambiguous coverage could slow hiring operations or increase procurement friction.",
        "Public-sector contractors may need contract amendments or certifications."
      ],
      sentiment_triggers: [
        "Applicants may support notice, appeal rights, and human review.",
        "Employers may react negatively to unclear audit standards or first-year cost burden.",
        "Civil-rights advocates may object if audit summaries are not public or appeal rights lack deadlines.",
        "Vendors may resist broad liability or disclosure of proprietary model details.",
        "Media narratives may polarize around black-box hiring versus hidden hiring tax."
      ],
      legal_ambiguities: [
        "Definition of automated hiring tool or automated employment decision tool.",
        "Whether obligations attach to employers, vendors, ATS platforms, or all covered parties.",
        "Whether DC coverage depends on applicant residence, employer location, job location, or hiring into DC roles.",
        "Minimum acceptable bias audit methodology and auditor independence.",
        "Scope of appeal rights, response deadlines, and remedies after successful appeal.",
        "Treatment of trade secrets, privacy, and applicant data access."
      ],
      implementation_bottlenecks: [
        "Agency must publish coverage examples and audit standards before enforcement.",
        "Employers must inventory hiring tools and vendor integrations.",
        "Audit provider capacity may be limited during the first annual cycle.",
        "Applicant appeal workflows require human reviewers, records, and response deadlines.",
        "Small employers may need templates and technical assistance."
      ],
      possible_fraud_or_abuse_vectors: [
        "Audit shopping with low-rigor providers.",
        "Reclassifying automated recommendations as administrative support to avoid coverage.",
        "Providing generic notices that do not identify meaningful automated influence.",
        "Creating appeal forms without timely human review or decision authority.",
        "Vendor-employer blame shifting when audit evidence is incomplete."
      ],
      required_data_sources: buildRequiredDataSources(inferredJurisdiction, "ai_hiring_transparency"),
      confidence: 0.84,
      assumptions: [
        "The policy applies to employers using automated hiring tools, not only tool vendors.",
        "The submitted text does not specify penalties, agency owner, funding, covered employer threshold, or exact effective date.",
        "Annual bias audits imply at least one recurring documentation requirement per covered tool or employer.",
        "Appeal rights imply human review unless the final rule states otherwise.",
        "Jurisdiction was inferred from the policy text when not explicitly supplied."
      ],
      warnings: []
    } satisfies PolicyAnalysis;
  }

  return {
    policy_title: inferPolicyTitle(normalizedPolicyText),
    policy_domain: policyDomain,
    jurisdiction: inferredJurisdiction,
    affected_groups: inferAffectedGroups(normalizedPolicyText),
    affected_industries: inferAffectedIndustries(normalizedPolicyText),
    affected_companies_query_terms: inferCompanyQueryTerms(normalizedPolicyText, policyDomain, inferredJurisdiction),
    obligations: inferObligations(normalizedPolicyText),
    benefits: inferBenefits(normalizedPolicyText),
    costs: inferCosts(normalizedPolicyText, monetaryAmounts),
    enforcement_mechanism: inferEnforcementMechanism(normalizedPolicyText),
    funding_source: inferFundingSource(normalizedPolicyText),
    implementation_timeline: buildTimeline(inferTimelineBase(normalizedPolicyText), deadlines),
    economic_pressure_points: inferEconomicPressurePoints(normalizedPolicyText),
    sentiment_triggers: inferSentimentTriggers(normalizedPolicyText),
    legal_ambiguities: inferLegalAmbiguities(normalizedPolicyText),
    implementation_bottlenecks: inferImplementationBottlenecks(normalizedPolicyText),
    possible_fraud_or_abuse_vectors: inferFraudVectors(normalizedPolicyText),
    required_data_sources: buildRequiredDataSources(inferredJurisdiction, "generic_policy"),
    confidence: normalizedPolicyText.length > 240 ? 0.64 : 0.48,
    assumptions: [
      "The submitted policy text is incomplete, so the parser inferred likely affected parties and compliance mechanics.",
      "Exact enforcement owner, penalties, funding, and effective dates should be confirmed from bill text or rulemaking materials.",
      "Downstream agents should replace inferred values with live source data before decision support."
    ],
    warnings: []
  } satisfies PolicyAnalysis;
}

export function validatePolicyAnalysis(value: unknown): PolicyAnalysis {
  if (!isRecord(value)) {
    throw new Error("Policy parser output must be a JSON object.");
  }

  const missingFields = requiredPolicyAnalysisFields.filter((field) => !(field in value));
  if (missingFields.length > 0) {
    throw new Error(`Policy parser output is missing required fields: ${missingFields.join(", ")}`);
  }

  const extraFields = Object.keys(value).filter(
    (field) => !requiredPolicyAnalysisFields.includes(field as keyof PolicyAnalysis)
  );
  if (extraFields.length > 0) {
    throw new Error(`Policy parser output includes unsupported fields: ${extraFields.join(", ")}`);
  }

  for (const field of stringFields) {
    if (typeof value[field] !== "string") {
      throw new Error(`Policy parser field "${field}" must be a string.`);
    }
  }

  for (const field of stringArrayFields) {
    if (!isStringArray(value[field])) {
      throw new Error(`Policy parser field "${field}" must be an array of strings.`);
    }
  }

  if (!Array.isArray(value.required_data_sources)) {
    throw new Error('Policy parser field "required_data_sources" must be an array.');
  }

  for (const sourceRequest of value.required_data_sources) {
    validateRequiredDataSourceRequest(sourceRequest);
  }

  if (typeof value.confidence !== "number" || value.confidence < 0 || value.confidence > 1) {
    throw new Error('Policy parser field "confidence" must be a number between 0 and 1.');
  }

  return value as PolicyAnalysis;
}

export function parsePolicySummary(policyText: string, jurisdictionOverride?: string): ParsedPolicy {
  const normalized = policyText.trim() || DEMO_POLICY_TEXT;
  const isAiHiring = isAiHiringTransparencyPolicy(normalized);
  const isPlasticBag = isPlasticBagPolicy(normalized);
  const jurisdiction = jurisdictionOverride?.trim();

  if (isPlasticBag) {
    return {
      policyName: "National Single-Use Plastic Bag Ban and Transition Policy",
      jurisdiction: jurisdiction || "United States",
      likelySponsor: "Environmental, retail, or waste-reduction policymakers",
      policyText: normalized,
      objectives: [
        "Reduce single-use plastic bag waste and litter.",
        "Shift retailers and shoppers toward reusable or approved substitute bags.",
        "Support affected manufacturers, retailers, and low-income households during transition."
      ],
      mechanisms: [
        "Retail distribution ban on lightweight single-use plastic checkout bags.",
        "Standards for compliant reusable, paper, or substitute bags.",
        "Public education, phased compliance, and transition assistance."
      ],
      affectedParties: [
        "low-income households",
        "general shoppers",
        "small retailers",
        "plastic film manufacturers",
        "substitute bag suppliers",
        "waste and recycling operators"
      ],
      complianceTriggers: [
        "Retail checkout bag distribution after effective date.",
        "Use of claimed reusable, compostable, paper, or substitute bag categories.",
        "Eligibility for transition grants or mitigation programs."
      ],
      likelyTimeline: "Likely scenario: 90-180 day education period, then phased compliance and first-year cure period.",
      assumptions: [
        "Final exemptions, fee structure, funding, and enforcement schedule are not specified.",
        "Demo estimates are scenario assumptions unless a source-backed evidence card is attached."
      ],
      confidence: 0.78,
      sources: [sourcePlaceholders.policyText]
    };
  }

  if (!isAiHiring) {
    return {
      policyName: "Proposed public policy pre-mortem",
      jurisdiction: jurisdiction || "Unspecified jurisdiction",
      likelySponsor: "Policy team",
      policyText: normalized,
      objectives: ["Increase transparency", "Reduce implementation risk", "Improve public trust"],
      mechanisms: ["Disclosure requirement", "Compliance documentation", "Public-facing accountability"],
      affectedParties: ["Residents", "regulated entities", "implementing agencies"],
      complianceTriggers: ["Rule effective date", "covered action or transaction"],
      likelyTimeline: "Likely phased implementation with guidance before enforcement.",
      assumptions: [
        "The submitted policy summary is partial and would need statutory text for final analysis.",
        "Sentiment forecasts use mock fallback signals until public comment and stakeholder data are connected."
      ],
      confidence: 0.48,
      sources: [sourcePlaceholders.policyText]
    };
  }

  return {
    policyName: "DC AI Hiring Transparency and Applicant Rights Rule",
    jurisdiction: jurisdiction || "Washington, DC",
    likelySponsor: "DC workforce, civil-rights, or consumer-protection policymakers",
    policyText: normalized,
    objectives: [
      "Give job applicants notice when automated hiring tools influence screening or selection.",
      "Detect and reduce discriminatory impact through recurring bias audits.",
      "Create appeal rights so applicants can challenge automated decisions and request human review."
    ],
    mechanisms: [
      "Mandatory AI-use disclosure in covered hiring workflows.",
      "Annual bias audit requirement for employers using automated hiring tools.",
      "Applicant appeal rights with records sufficient for review and enforcement."
    ],
    affectedParties: [
      "Job applicants",
      "DC employers",
      "multi-state employers hiring into DC roles",
      "AI hiring vendors",
      "applicant tracking system providers",
      "civil-rights enforcement staff"
    ],
    complianceTriggers: [
      "Employer uses automated tools to screen, rank, score, interview, or recommend applicants.",
      "Employer hires for a DC-based role or collects applications from DC residents.",
      "Annual audit cycle begins after rule effective date."
    ],
    likelyTimeline: "Likely scenario: 6-12 months of rulemaking and guidance, followed by phased enforcement.",
    assumptions: [
      "The rule covers employers rather than only AI vendors.",
      "Bias audit standards will need agency guidance before employers can comply consistently.",
      "Appeal rights require a human-review workflow, not only automated reconsideration."
    ],
    confidence: 0.82,
    sources: [sourcePlaceholders.policyText, sourcePlaceholders.dcRegister]
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function validateRequiredDataSourceRequest(value: unknown): asserts value is RequiredDataSourceRequest {
  if (!isRecord(value)) {
    throw new Error("Each required_data_sources entry must be a JSON object.");
  }

  if (typeof value.source !== "string") {
    throw new Error('Each required_data_sources entry must include string field "source".');
  }

  if (typeof value.query_focus !== "string") {
    throw new Error('Each required_data_sources entry must include string field "query_focus".');
  }

  if (!["high", "medium", "low"].includes(String(value.priority))) {
    throw new Error('Each required_data_sources entry must include priority "high", "medium", or "low".');
  }
}

function inferJurisdiction(policyText: string) {
  if (/washington,?\s*d\.?c\.?|district of columbia|\bdc\b/i.test(policyText)) {
    return "Washington, DC";
  }

  if (/federal|congress|united states|national/i.test(policyText)) {
    return "United States";
  }

  const stateMatch = policyText.match(/\b(California|New York|Texas|Florida|Illinois|Maryland|Virginia|Massachusetts)\b/i);
  if (stateMatch) {
    return stateMatch[0];
  }

  return "Unspecified jurisdiction";
}

function inferPolicyDomain(policyText: string) {
  if (isAiHiringTransparencyPolicy(policyText)) {
    return "AI governance, labor, employment, civil rights";
  }

  if (/housing|rent|tenant|landlord/i.test(policyText)) {
    return "housing";
  }

  if (/tax|credit|deduction|revenue/i.test(policyText)) {
    return "tax and fiscal policy";
  }

  if (/health|medicaid|hospital|insurance/i.test(policyText)) {
    return "health policy";
  }

  if (/energy|climate|emissions|utility/i.test(policyText)) {
    return "energy and climate";
  }

  return "general public policy";
}

function isAiHiringTransparencyPolicy(policyText: string) {
  return /AI|automated|algorithm|machine learning|model/i.test(policyText) &&
    /hiring|employment|job applicant|job seeker|resume|résumé|recruit|candidate|interview|workforce|employee selection|applicant tracking|bias audit/i.test(policyText);
}

function isPlasticBagPolicy(policyText: string) {
  return /plastic|single-use|checkout bag|bag ban|reusable bag|paper bag/i.test(policyText);
}

function inferPolicyTitle(policyText: string) {
  const firstSentence = policyText.split(/[.!?]/)[0]?.trim();
  if (!firstSentence) {
    return "Untitled proposed policy";
  }

  return firstSentence.length > 96 ? `${firstSentence.slice(0, 93).trim()}...` : firstSentence;
}

function extractMonetaryAmounts(policyText: string) {
  return Array.from(
    new Set(
      policyText.match(
        /(?:\$|USD\s*)\d[\d,]*(?:\.\d+)?(?:\s*(?:million|billion|thousand|m|bn|k))?|\d[\d,]*(?:\.\d+)?\s*(?:dollars|million dollars|billion dollars)/gi
      ) ?? []
    )
  );
}

function extractDeadlines(policyText: string) {
  return Array.from(
    new Set(
      policyText.match(
        /\b(?:annual|annually|quarterly|monthly|by\s+[A-Z][a-z]+\s+\d{1,2},?\s+\d{4}|by\s+\d{1,2}\/\d{1,2}\/\d{2,4}|within\s+\d+\s+(?:days|months|years)|effective\s+(?:on|by|after)\s+[^.;,]+)/gi
      ) ?? []
    )
  );
}

function formatExtractedAmounts(amounts: string[]) {
  if (amounts.length === 0) {
    return [];
  }

  return [`Extracted monetary amount references from policy text: ${amounts.join(", ")}.`];
}

function buildTimeline(base: string, deadlines: string[]) {
  if (deadlines.length === 0) {
    return base;
  }

  return `${base} Extracted deadline signals: ${deadlines.join(", ")}.`;
}

function inferAffectedGroups(policyText: string) {
  const groups = new Set<string>(["residents", "regulated entities", "implementing agencies"]);

  if (/worker|employee|hiring|employment|job applicant|job seeker|recruit/i.test(policyText)) groups.add("workers and job applicants");
  else if (/applicant|application/i.test(policyText)) groups.add("applicants");
  if (/employer|business|company/i.test(policyText)) groups.add("employers and businesses");
  if (/student|school|education/i.test(policyText)) groups.add("students and education providers");
  if (/tenant|housing|rent/i.test(policyText)) groups.add("tenants and housing providers");
  if (/patient|health|medicaid/i.test(policyText)) groups.add("patients and healthcare providers");

  return Array.from(groups);
}

function inferAffectedIndustries(policyText: string) {
  const industries = new Set<string>(["public administration"]);

  if (/hiring|employment|worker|employer/i.test(policyText)) industries.add("labor and employment");
  if (/AI|automated|software|platform|data/i.test(policyText)) industries.add("technology and data services");
  if (/housing|rent|tenant/i.test(policyText)) industries.add("real estate and housing");
  if (/health|hospital|medicaid/i.test(policyText)) industries.add("healthcare");
  if (/energy|climate|utility/i.test(policyText)) industries.add("energy and utilities");
  if (/tax|revenue|credit/i.test(policyText)) industries.add("finance and tax administration");

  return Array.from(industries);
}

function inferCompanyQueryTerms(policyText: string, policyDomain: string, jurisdiction: string) {
  const terms = new Set<string>([
    `${jurisdiction} regulated companies`,
    `${policyDomain} vendors`,
    `${policyDomain} trade associations`
  ]);

  if (/AI|automated|software/i.test(policyText)) {
    terms.add("AI software vendors");
    terms.add("compliance technology vendors");
  }

  if (/hiring|employment|job applicant|job seeker|resume|résumé|recruit|candidate|interview|workforce|applicant tracking/i.test(policyText)) {
    terms.add("applicant tracking system");
    terms.add("staffing and recruiting firms");
  }

  if (/tenant|housing|rent|landlord|property manager|screening report|eviction|credit/i.test(policyText)) {
    terms.add("tenant screening software");
    terms.add("property management companies");
    terms.add("landlord associations");
    terms.add("rental application platforms");
  }

  return Array.from(terms);
}

function inferObligations(policyText: string) {
  const obligations = new Set<string>();

  if (/disclos/i.test(policyText)) obligations.add("Covered entities must provide disclosure or notice.");
  if (/audit/i.test(policyText)) obligations.add("Covered entities must conduct or produce audits.");
  if (/report/i.test(policyText)) obligations.add("Covered entities must submit or publish reports.");
  if (/appeal|review|recourse/i.test(policyText)) obligations.add("Covered entities must provide appeal, review, or recourse processes.");
  if (/permit|license|certif/i.test(policyText)) obligations.add("Covered entities may need permits, licenses, or certifications.");

  if (obligations.size === 0) {
    obligations.add("Compliance obligations are not explicit; infer notice, documentation, and reporting may be required.");
  }

  return Array.from(obligations);
}

function inferBenefits(policyText: string) {
  const benefits = new Set<string>(["Improves public accountability if implementation is clear and enforceable."]);

  if (/transparen|disclos|notice/i.test(policyText)) benefits.add("Increases transparency for affected residents and stakeholders.");
  if (/bias|equity|civil rights|fair/i.test(policyText)) benefits.add("May reduce disparate impact or unfair treatment.");
  if (/safety|risk|protect/i.test(policyText)) benefits.add("May reduce public risk or consumer harm.");
  if (/fund|grant|credit|benefit/i.test(policyText)) benefits.add("May direct resources toward intended beneficiaries.");

  return Array.from(benefits);
}

function inferCosts(policyText: string, monetaryAmounts: string[]) {
  const costs = new Set<string>([
    "Administrative costs for guidance, compliance monitoring, and implementation support."
  ]);

  if (/business|employer|company|vendor/i.test(policyText)) {
    costs.add("Private-sector compliance costs for legal review, operations, vendor changes, and recordkeeping.");
  }

  if (/audit|report|data/i.test(policyText)) {
    costs.add("Data collection, audit, reporting, and technical infrastructure costs.");
  }

  for (const amount of formatExtractedAmounts(monetaryAmounts)) {
    costs.add(amount);
  }

  return Array.from(costs);
}

function inferEnforcementMechanism(policyText: string) {
  if (/penalt|fine|violation/i.test(policyText)) {
    return "Civil penalties or fines are referenced; confirm enforcement owner and penalty schedule from source text.";
  }

  if (/audit|report|certif/i.test(policyText)) {
    return "Likely administrative enforcement through documentation, audits, certifications, reporting, and corrective action.";
  }

  return "Not specified; likely requires agency guidance, complaint intake, compliance review, and potential penalties.";
}

function inferFundingSource(policyText: string) {
  if (/appropriat|budget|fund|grant|fee|tax|penalt/i.test(policyText)) {
    return "Policy text references a possible funding signal; confirm amount, account, and eligible uses from source materials.";
  }

  return "Not specified; likely agency operating funds, appropriations, fees, penalties, or grants.";
}

function inferTimelineBase(policyText: string) {
  if (/annual|annually/i.test(policyText)) {
    return "Recurring annual implementation obligation detected.";
  }

  if (/effective|deadline|within|by\s+/i.test(policyText)) {
    return "Implementation timeline includes explicit deadline language that should be confirmed in source text.";
  }

  return "Not specified; likely requires rulemaking, guidance, phased compliance, and enforcement start dates.";
}

function inferEconomicPressurePoints(policyText: string) {
  const pressure = new Set<string>([
    "Compliance costs may vary by entity size and administrative capacity.",
    "Implementation uncertainty may delay investment or operational decisions."
  ]);

  if (/small business|employer|business/i.test(policyText)) pressure.add("Small businesses may face fixed compliance costs.");
  if (/vendor|software|technology|data/i.test(policyText)) pressure.add("Vendor contract and procurement changes may create friction.");
  if (/audit|report/i.test(policyText)) pressure.add("Audit and reporting requirements may create recurring cost pressure.");
  if (/penalt|fine/i.test(policyText)) pressure.add("Penalty exposure may change regulated-entity behavior.");

  return Array.from(pressure);
}

function inferSentimentTriggers(policyText: string) {
  const triggers = new Set<string>([
    "Trust may improve if benefits are visible and obligations are easy to understand.",
    "Opposition may rise if costs, eligibility, or enforcement rules are vague."
  ]);

  if (/transparen|disclos/i.test(policyText)) triggers.add("Transparency language may be popular with affected residents.");
  if (/audit|report/i.test(policyText)) triggers.add("Audit language may trigger concerns about paperwork burden.");
  if (/appeal|rights|recourse/i.test(policyText)) triggers.add("Appeal rights may increase perceived fairness.");
  if (/tax|fee|cost/i.test(policyText)) triggers.add("Tax, fee, or cost language may trigger affordability concerns.");

  return Array.from(triggers);
}

function inferLegalAmbiguities(policyText: string) {
  const ambiguities = new Set<string>([
    "Covered entities may need clearer definition.",
    "Agency owner and enforcement authority may need confirmation.",
    "Effective date, cure period, penalties, and appeal rights may need confirmation."
  ]);

  if (/AI|automated|algorithm/i.test(policyText)) ambiguities.add("Automated system definition and covered decision threshold may be ambiguous.");
  if (/audit/i.test(policyText)) ambiguities.add("Audit methodology, independence, and public disclosure scope may be ambiguous.");
  if (/jurisdiction|resident|location/i.test(policyText)) ambiguities.add("Jurisdictional trigger may be ambiguous.");

  return Array.from(ambiguities);
}

function inferImplementationBottlenecks(policyText: string) {
  const bottlenecks = new Set<string>([
    "Agency guidance and public-facing templates may be needed before compliance begins.",
    "Data availability and reporting formats may slow implementation."
  ]);

  if (/audit/i.test(policyText)) bottlenecks.add("Qualified audit provider capacity may be limited.");
  if (/appeal|review/i.test(policyText)) bottlenecks.add("Appeal workflows require staff, routing, and records.");
  if (/vendor|software|technology/i.test(policyText)) bottlenecks.add("Vendor cooperation and contract changes may be required.");
  if (/small business/i.test(policyText)) bottlenecks.add("Small entities may need technical assistance.");

  return Array.from(bottlenecks);
}

function inferFraudVectors(policyText: string) {
  const vectors = new Set<string>([
    "Paper compliance without meaningful behavioral change.",
    "Incomplete reporting or selective documentation."
  ]);

  if (/audit/i.test(policyText)) vectors.add("Audit shopping or low-rigor attestations.");
  if (/benefit|grant|credit|fund/i.test(policyText)) vectors.add("Eligibility gaming or misrepresentation to access funds.");
  if (/vendor|contract|procurement/i.test(policyText)) vectors.add("Vendor self-certification without independent verification.");
  if (/appeal|review/i.test(policyText)) vectors.add("Symbolic appeals without timely human review.");

  return Array.from(vectors);
}

function buildRequiredDataSources(jurisdiction: string, policyKind: "ai_hiring_transparency" | "generic_policy") {
  const base: RequiredDataSourceRequest[] = [
    {
      source: "Census ACS",
      query_focus: `Population, workforce, income, race, age, education, occupation, and geography exposure for ${jurisdiction}.`,
      priority: "high"
    },
    {
      source: "BLS",
      query_focus: "Labor market, employment, occupation, wage, unemployment, and industry exposure.",
      priority: "high"
    },
    {
      source: "BEA",
      query_focus: "Regional GDP, personal income, sector output, and local economic dependence.",
      priority: "medium"
    },
    {
      source: "FRED",
      query_focus: "Macro trend context, inflation, interest rates, unemployment, and regional indicators.",
      priority: "medium"
    },
    {
      source: "Regulations.gov",
      query_focus: "Related federal rulemakings, public comments, agency analysis, and stakeholder positions.",
      priority: policyKind === "generic_policy" ? "medium" : "low"
    },
    {
      source: "Federal Register",
      query_focus: "Comparable federal notices, definitions, implementation timelines, and compliance standards.",
      priority: "medium"
    },
    {
      source: "Congress.gov",
      query_focus: "Related bills, committee materials, statutory authority, and legislative analogues.",
      priority: "low"
    },
    {
      source: "USAspending",
      query_focus: "Agency grants, contracts, vendor recipients, and implementation funding exposure.",
      priority: "medium"
    },
    {
      source: "Socrata/Open Data",
      query_focus: `Jurisdiction open data for permits, employers, complaints, enforcement, procurement, and service delivery in ${jurisdiction}.`,
      priority: "high"
    },
    {
      source: "CrustData",
      query_focus: "Company graph, affected vendors, employer segments, hiring signals, growth, and stakeholder mapping.",
      priority: "high"
    },
    {
      source: "GDELT/news",
      query_focus: "Media narrative, stakeholder quotes, public sentiment signals, and geographic story spread.",
      priority: "high"
    }
  ];

  if (policyKind === "ai_hiring_transparency") {
    return base.map((source) => {
      if (source.source === "CrustData") {
        return {
          ...source,
          query_focus:
            "Hiring-tech vendors, ATS platforms, employer customers, workforce software categories, company growth, and DC exposure."
        };
      }

      if (source.source === "BLS") {
        return {
          ...source,
          query_focus: "DC hiring industries, occupations, job seeker exposure, wages, and employer labor demand."
        };
      }

      if (source.source === "Socrata/Open Data") {
        return {
          ...source,
          query_focus:
            "DC open data for business licenses, procurement, complaints, enforcement records, workforce programs, and employer geography."
        };
      }

      return source;
    });
  }

  return base;
}
