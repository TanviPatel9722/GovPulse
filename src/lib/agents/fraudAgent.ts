import type { EvidenceCard } from "@/lib/evidence/evidenceCard";
import type { PolicyAnalysis as ParserPolicyAnalysis } from "@/lib/agents/policyParser";
import { callOpenAIJson } from "@/lib/llm/openai";
import { MODEL_CONFIG } from "@/lib/llm/modelRouter";
import { FRAUD_AGENT_SYSTEM_PROMPT, buildFraudPrompt } from "@/lib/llm/prompts";
import type { LLMMode } from "@/lib/llm/llmTypes";
import { fetchUsaSpendingFraudSignals } from "@/lib/sources/usaspending";
import type {
  AbuseVector,
  EconomicExposure,
  FraudRiskAssessment,
  ParsedPolicy,
  StakeholderIntelligence
} from "@/lib/types";

type PolicyInput = ParserPolicyAnalysis | ParsedPolicy;

export type FraudAssessmentInput = {
  policyAnalysis: PolicyInput;
  stakeholderMap?: StakeholderIntelligence;
  economicExposure?: EconomicExposure;
  evidenceCards?: EvidenceCard[];
  mode?: LLMMode;
};

export async function assessFraudRisk(input: FraudAssessmentInput): Promise<FraudRiskAssessment> {
  const spendingSignals = await fetchUsaSpendingFraudSignals(input.policyAnalysis, input.stakeholderMap);
  const evidenceCards = [...(input.evidenceCards ?? []), ...spendingSignals.evidence_cards];
  const evidenceCardIds = Array.from(new Set(evidenceCards.map((card) => card.id)));
  const abuseVectors = buildAbuseVectors(input, spendingSignals.evidence_cards[0]?.id);
  const overallRisk = calculateOverallFraudRisk(abuseVectors, input.policyAnalysis);

  const fallback: FraudRiskAssessment = {
    overall_fraud_risk: overallRisk,
    abuse_vectors: abuseVectors,
    verification_controls: [
      "Require verified legal entity identity for applicants, vendors, auditors, and subrecipients.",
      "Cross-check applicants and vendors against tax IDs, business registrations, sanctions/debarment lists, and duplicate ownership signals.",
      "Separate self-certification from final approval when money, procurement preference, compliance status, or benefit access is at stake.",
      "Require machine-readable audit certificates with auditor identity, methodology, period covered, and conflict-of-interest disclosures.",
      "Create exception queues for duplicate addresses, shared bank accounts, rapid vendor formation, unusual invoice timing, and related-party links."
    ],
    audit_recommendations: [
      "Run a first-90-days integrity review focused on duplicate applications, new vendor formation, and incomplete documentation.",
      "Sample approved and denied cases to test whether eligibility and compliance evidence are being applied consistently.",
      "Publish aggregate program-integrity metrics without accusing named entities absent formal findings.",
      "Require audit trails for human overrides, appeal outcomes, invoice approvals, and subcontractor changes.",
      "Reassess controls after the first reporting cycle, especially if vendor concentration or low-quality certificates appear."
    ],
    data_needed_for_detection: [
      "Applicant, vendor, and subrecipient legal names, domains, tax IDs or UEIs where legally available.",
      "Ownership, officer, address, bank-account, and related-party linkage fields subject to privacy and legal constraints.",
      "Application timestamps, approval staff, submitted documents, appeal outcomes, and status changes.",
      "Invoice line items, payment timing, contract modifications, subcontractors, and deliverable acceptance records.",
      "Audit certificate metadata, auditor independence attestations, methodology, sample period, and exception findings.",
      "USAspending or local spending data for award concentration, repeat recipients, and procurement category drift."
    ],
    evidence_card_ids: evidenceCardIds,
    limitations: [
      "This is a policy design pre-mortem, not an allegation that any company, person, or organization has committed fraud.",
      "Risk signals identify incentives and control gaps before launch; they require investigation before any enforcement conclusion.",
      "Mock or public spending data may not cover local-only programs, future appropriations, subawards, or beneficiary-level records.",
      "Fraud controls must be balanced with access, privacy, due process, and administrative burden."
    ]
  };

  if (!("policy_title" in input.policyAnalysis) || !input.stakeholderMap || !input.economicExposure) {
    return fallback;
  }

  return callOpenAIJson<FraudRiskAssessment>({
    model: MODEL_CONFIG.fraudAgent,
    systemPrompt: FRAUD_AGENT_SYSTEM_PROMPT,
    userPrompt: buildFraudPrompt(input.policyAnalysis, input.stakeholderMap, input.economicExposure, evidenceCards),
    schemaName: "FraudRiskAssessment",
    fallback,
    mode: input.mode
  });
}

function buildAbuseVectors(input: FraudAssessmentInput, usaspendingEvidenceId?: string): AbuseVector[] {
  const text = getPolicyText(input.policyAnalysis);
  const isMoneyProgram = /grant|subsidy|procurement|tax credit|benefit|payment|fund|reimburse|invoice/i.test(text);
  const isComplianceProgram = /audit|certif|compliance|vendor|disclos|report|appeal|AI|automated/i.test(text);
  const vectorEvidence = usaspendingEvidenceId ? [`Evidence card: ${usaspendingEvidenceId}`] : [];

  const vectors: AbuseVector[] = [];

  if (isMoneyProgram) {
    vectors.push(
      {
        name: "Shell vendors",
        description:
          "Newly formed or thinly documented vendors could seek awards or implementation contracts without capacity to deliver.",
        who_could_exploit: ["bad-faith vendors", "pass-through entities", "related-party networks"],
        warning_signals: ["recent entity formation", "shared addresses", "limited operating history", ...vectorEvidence],
        policy_design_cause: "Vendor eligibility is based on paperwork rather than verified capacity, ownership, and past performance.",
        mitigation:
          "Require entity verification, beneficial ownership checks where lawful, past-performance review, and staged payments tied to deliverables.",
        confidence: 0.62
      },
      {
        name: "Duplicate applications",
        description:
          "Applicants or intermediaries could submit multiple applications across names, addresses, affiliates, or program portals.",
        who_could_exploit: ["duplicate applicants", "affiliated entities", "intermediaries"],
        warning_signals: ["shared bank accounts", "similar contact data", "rapid repeated submissions", "address clustering"],
        policy_design_cause: "Eligibility systems lack cross-program matching and durable identity resolution.",
        mitigation:
          "Use duplicate detection across tax IDs, addresses, bank accounts, device fingerprints where lawful, and manual exception review.",
        confidence: 0.64
      },
      {
        name: "Inflated invoices",
        description:
          "Vendors or beneficiaries could overstate costs, bill for unsupported services, or split invoices to avoid review thresholds.",
        who_could_exploit: ["vendors", "subcontractors", "program intermediaries"],
        warning_signals: ["round-dollar invoices", "threshold splitting", "price outliers", "late documentation"],
        policy_design_cause: "Payment rules reimburse claimed costs without benchmark pricing or deliverable validation.",
        mitigation:
          "Add price reasonableness checks, invoice sampling, deliverable acceptance records, and higher review for threshold-adjacent claims.",
        confidence: 0.6
      }
    );
  }

  if (isComplianceProgram) {
    vectors.push(
      {
        name: "Self-certification abuse",
        description:
          "Covered entities could attest compliance without producing adequate evidence, especially when enforcement capacity is limited.",
        who_could_exploit: ["covered entities", "vendors acting on behalf of employers", "low-rigor compliance intermediaries"],
        warning_signals: ["identical attestations", "missing methodology", "late certificates", "no supporting records"],
        policy_design_cause: "The policy accepts self-certification as sufficient proof without risk-based verification.",
        mitigation:
          "Require evidence-backed attestations, random audits, meaningful penalties for false statements, and public aggregate reporting.",
        confidence: 0.68
      },
      {
        name: "Fake compliance vendors",
        description:
          "Low-quality or opportunistic vendors could sell audit, certification, or compliance services that satisfy form but not substance.",
        who_could_exploit: ["fake compliance vendors", "audit shops", "lead-generation intermediaries"],
        warning_signals: ["new vendor surge", "template certificates", "no auditor qualifications", "unusually low pricing"],
        policy_design_cause: "The rule does not define minimum qualifications, methodology, independence, or evidence fields for certificates.",
        mitigation:
          "Publish minimum audit methodology, auditor independence rules, certificate schema, and agency rejection criteria.",
        confidence: 0.7
      },
      {
        name: "Low-quality audit certificates",
        description:
          "Annual audits could become checkbox documents that avoid meaningful testing of bias, eligibility, or compliance outcomes.",
        who_could_exploit: ["regulated entities", "audit vendors", "platform providers"],
        warning_signals: ["boilerplate findings", "no sample size", "no adverse-impact metrics", "no remediation plan"],
        policy_design_cause: "Audit standards are vague or confidential, making low-rigor certificates hard to challenge.",
        mitigation:
          "Require minimum audit fields, methodology disclosure, exception reporting, remediation tracking, and risk-based agency review.",
        confidence: 0.72
      },
      {
        name: "Subcontractor opacity",
        description:
          "Program duties may be pushed to subcontractors or integrated vendors whose role is not visible to applicants or auditors.",
        who_could_exploit: ["prime vendors", "subcontractors", "platform integrators"],
        warning_signals: ["undisclosed subcontractors", "data access gaps", "unclear responsibility", "frequent vendor changes"],
        policy_design_cause: "Prime vendors are accountable on paper but subcontractor data, controls, and conflicts are not visible.",
        mitigation:
          "Require subcontractor disclosure, flow-down compliance clauses, data-access rights, and responsibility matrices.",
        confidence: 0.61
      }
    );
  }

  if (vectors.length === 0) {
    vectors.push({
      name: "Fake eligibility",
      description:
        "Applicants or regulated parties could misstate eligibility, coverage status, or exemption status if definitions are vague.",
      who_could_exploit: ["bad-faith applicants", "regulated entities", "intermediaries"],
      warning_signals: ["incomplete documentation", "frequent exemption claims", "inconsistent submitted facts"],
      policy_design_cause: "Eligibility and exemption rules are not operationalized into verifiable fields.",
      mitigation: "Define eligibility data fields, require supporting documents, and sample approvals for quality control.",
      confidence: 0.52
    });
  }

  return vectors;
}

function calculateOverallFraudRisk(vectors: AbuseVector[], policyAnalysis: PolicyInput): FraudRiskAssessment["overall_fraud_risk"] {
  const text = getPolicyText(policyAnalysis);
  const averageConfidence = vectors.reduce((sum, vector) => sum + vector.confidence, 0) / Math.max(1, vectors.length);
  const highRiskTerms = /grant|subsidy|tax credit|benefit|procurement|invoice|payment|self-certification|audit|vendor/i.test(text);

  if (vectors.length >= 6 || (highRiskTerms && averageConfidence >= 0.68)) {
    return "high";
  }

  if (vectors.length >= 3 || highRiskTerms) {
    return "medium";
  }

  return "low";
}

function getPolicyText(policyAnalysis: PolicyInput) {
  if ("policyText" in policyAnalysis) {
    return [
      policyAnalysis.policyName,
      policyAnalysis.policyText,
      policyAnalysis.mechanisms.join(" "),
      policyAnalysis.complianceTriggers.join(" ")
    ].join(" ");
  }

  return [
    policyAnalysis.policy_title,
    policyAnalysis.policy_domain,
    policyAnalysis.obligations.join(" "),
    policyAnalysis.costs.join(" "),
    policyAnalysis.possible_fraud_or_abuse_vectors.join(" ")
  ].join(" ");
}
