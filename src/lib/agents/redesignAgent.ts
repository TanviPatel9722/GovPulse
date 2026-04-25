import type {
  EconomicExposure,
  FraudRiskAssessment,
  PolicyRedesign,
  PolicyRedesignOption,
  RiskScore,
  SentimentForecast,
  StakeholderIntelligence
} from "@/lib/types";
import { callOpenAIJson } from "@/lib/llm/openai";
import { MODEL_CONFIG } from "@/lib/llm/modelRouter";
import { REDESIGN_AGENT_SYSTEM_PROMPT, buildRedesignPrompt } from "@/lib/llm/prompts";
import type { LLMMode } from "@/lib/llm/llmTypes";

export type RedesignPolicyInput = {
  originalPolicyText: string;
  policyAnalysis: {
    policy_title: string;
    policy_domain: string;
    jurisdiction: string;
    obligations: string[];
    affected_groups: string[];
    affected_industries: string[];
  };
  riskScore: RiskScore;
  sentimentForecast: SentimentForecast;
  economicExposure: EconomicExposure;
  fraudRiskAssessment: FraudRiskAssessment;
  stakeholderMap: StakeholderIntelligence;
  mode?: LLMMode;
};

export async function generatePolicyRedesignWithLLM(input: RedesignPolicyInput): Promise<PolicyRedesign> {
  const fallback = redesignPolicy(input);

  return callOpenAIJson<PolicyRedesign>({
    model: MODEL_CONFIG.redesignAgent,
    systemPrompt: REDESIGN_AGENT_SYSTEM_PROMPT,
    userPrompt: buildRedesignPrompt(
      input.policyAnalysis,
      input.riskScore,
      input.sentimentForecast,
      input.fraudRiskAssessment,
      input.stakeholderMap
    ),
    schemaName: "PolicyRedesign",
    fallback,
    mode: input.mode
  });
}

export function redesignPolicy(input: RedesignPolicyInput): PolicyRedesign {
  const options = buildRedesignOptions(input);
  const riskReduction = estimateRiskReduction(options, input.riskScore);
  const adoptionGain = estimateAdoptionGain(options, input.riskScore);
  const beforeRisk = input.riskScore.overall_policy_risk.score;
  const beforeAdoption = input.riskScore.adoption_readiness.score;
  const afterRisk = Math.max(0, beforeRisk - riskReduction);
  const afterAdoption = Math.min(100, beforeAdoption + adoptionGain);

  return {
    original_policy_risk_summary:
      `Original policy risk is ${beforeRisk}/100 (${input.riskScore.overall_policy_risk.band}). Top drivers are ${input.riskScore.top_risk_drivers
        .slice(0, 3)
        .join("; ")}. Redesign should preserve the policy intent while reducing adoption friction, legal ambiguity, implementation burden, and abuse incentives.`,
    redesign_options: options,
    recommended_redesign: buildRecommendedRedesign(input, options),
    before_after_scores: {
      before_overall_policy_risk: beforeRisk,
      after_expected_policy_risk: afterRisk,
      before_adoption_readiness: beforeAdoption,
      after_expected_adoption_readiness: afterAdoption
    },
    communication_strategy: buildCommunicationStrategy(input),
    stakeholder_consultation_plan: buildStakeholderPlan(input.stakeholderMap),
    validation_questions: buildValidationQuestions(input)
  };
}

function buildRedesignOptions(input: RedesignPolicyInput): PolicyRedesignOption[] {
  const policyText = getPolicyText(input);
  const primaryBurdenedGroup = findBurdenedGroup(input);
  const primaryBeneficiary = findBeneficiaryGroup(input);
  const primaryIndustry = input.policyAnalysis.affected_industries[0] ?? "regulated sector";
  const options: PolicyRedesignOption[] = [];

  if (needsPhasing(policyText, input)) {
    options.push({
      option_title: `Phased rollout for ${primaryBurdenedGroup}`,
      policy_change:
        `Sequence the rule by exposure, entity size, transaction volume, or operational readiness for ${primaryBurdenedGroup}, while requiring a lightweight first-step compliance filing from all covered parties.`,
      why_it_helps:
        "Preserves the policy goal while reducing first-wave implementation overload, business opposition, and avoidable confusion.",
      tradeoffs: [
        "Some affected people may wait longer for full protections or benefits.",
        "Thresholds must be clear enough to prevent gaming."
      ],
      expected_risk_change: "Expected to reduce implementation complexity and business opposition by 7-14 points.",
      affected_groups_helped: unique([primaryBurdenedGroup, "implementing agency staff", primaryBeneficiary]),
      new_risks_created: ["threshold gaming", "deadline confusion", "uneven early coverage"],
      implementation_steps: [
        "Define phase thresholds and coverage examples.",
        "Publish a short implementation calendar.",
        "Require early registration or self-assessment.",
        "Review phase-one evidence before expanding enforcement."
      ],
      confidence: confidenceFromRisk(input, 0.69)
    });
  }

  if (needsTemplates(policyText, input)) {
    options.push({
      option_title: "Safe-harbor templates and plain-language guidance",
      policy_change:
        `Publish model notices, checklists, documentation templates, and examples tailored to ${primaryIndustry} and ${primaryBurdenedGroup}.`,
      why_it_helps:
        "Converts a vague mandate into predictable operating steps without weakening the underlying obligation.",
      tradeoffs: [
        "Templates can become checkbox compliance if not updated.",
        "Overly narrow templates may miss edge cases."
      ],
      expected_risk_change: "Expected to reduce legal ambiguity and compliance friction by 8-16 points.",
      affected_groups_helped: unique([primaryBeneficiary, primaryBurdenedGroup, primaryIndustry]),
      new_risks_created: ["template overreliance", "boilerplate compliance"],
      implementation_steps: [
        "Draft model forms in plain language.",
        "Publish compliant and noncompliant examples.",
        "Create a help desk or office-hours channel.",
        "Update templates after the first evidence review."
      ],
      confidence: confidenceFromRisk(input, 0.73)
    });
  }

  if (needsAppealOrServiceLevels(policyText, input)) {
    options.push({
      option_title: `Usable rights and service levels for ${primaryBeneficiary}`,
      policy_change:
        "Define who can request review, response deadlines, escalation paths, outcome categories, language access, and aggregate reporting.",
      why_it_helps:
        "Makes the policy feel real to affected people and reduces the risk that rights are perceived as symbolic.",
      tradeoffs: [
        "Service-level commitments require staff and data capacity.",
        "Complex cases may need limited extensions."
      ],
      expected_risk_change: "Expected to reduce public reaction, trust, and misinformation risk by 7-15 points.",
      affected_groups_helped: unique([primaryBeneficiary, "advocacy groups", "implementing agency staff"]),
      new_risks_created: ["case backlog", "inconsistent reviewer quality"],
      implementation_steps: [
        "Set default response and escalation timelines.",
        "Create plain-language instructions.",
        "Track outcomes and unresolved cases.",
        "Publish aggregate service-level metrics."
      ],
      confidence: confidenceFromRisk(input, 0.7)
    });
  }

  if (needsFraudControls(policyText, input)) {
    options.push({
      option_title: "Verification controls before money, certificates, or exemptions move",
      policy_change:
        "Add eligibility checks, conflict disclosures, documentation standards, random review, and anomaly monitoring for high-risk claims.",
      why_it_helps:
        "Reduces abuse incentives while preserving the policy intent and protecting credible participants.",
      tradeoffs: [
        "Verification adds friction for legitimate participants.",
        "The agency needs data-sharing and audit capacity."
      ],
      expected_risk_change: "Expected to reduce fraud/abuse and implementation risk by 8-15 points.",
      affected_groups_helped: unique([primaryBeneficiary, "taxpayers", "credible vendors", "implementing agency staff"]),
      new_risks_created: ["verification delays", "privacy review burden"],
      implementation_steps: [
        "Define accepted evidence and data checks.",
        "Set random review rate for high-risk submissions.",
        "Require conflict and related-party disclosures.",
        "Create an escalation path for suspicious patterns."
      ],
      confidence: confidenceFromRisk(input, 0.68)
    });
  }

  options.push({
    option_title: "Public evidence dashboard and targeted outreach",
    policy_change:
      `Publish rollout milestones, evidence limits, top FAQs, and aggregate results for ${input.policyAnalysis.jurisdiction}, paired with outreach to the most affected groups.`,
    why_it_helps:
      "Improves trust by showing what is known, what is assumed, and what will be validated before enforcement or expansion.",
    tradeoffs: [
      "Dashboard metrics can be misread without context.",
      "Public reporting requires privacy and data-quality controls."
    ],
    expected_risk_change: "Expected to reduce misinformation risk and improve adoption readiness by 5-12 points.",
    affected_groups_helped: unique([primaryBeneficiary, primaryBurdenedGroup, "taxpayers"]),
    new_risks_created: ["metric gaming", "privacy leakage", "overinterpretation of weak evidence"],
    implementation_steps: [
      "Name the source-backed and assumption-based metrics.",
      "Publish a short validation plan.",
      "Run outreach with affected groups before enforcement.",
      "Update dashboard after the first implementation checkpoint."
    ],
    confidence: confidenceFromRisk(input, 0.66)
  });

  return options.slice(0, 5);
}

function estimateRiskReduction(options: PolicyRedesignOption[], riskScore: RiskScore) {
  const optionEffect = Math.round(options.reduce((sum, option) => sum + option.confidence, 0) * 4);
  const readinessEffect = riskScore.mitigation_readiness.score > 60 ? 5 : 2;
  return Math.min(24, optionEffect + readinessEffect);
}

function buildRecommendedRedesign(input: RedesignPolicyInput, options: PolicyRedesignOption[]) {
  const topOptions = options.slice(0, 3).map((option) => option.option_title.toLowerCase());
  const policyGoal = input.policyAnalysis.policy_title || input.policyAnalysis.policy_domain;

  return `Recommended redesign: preserve the intent of "${policyGoal}", but launch with ${topOptions.join(", ")}. This should lower risk while keeping the policy goal intact and making evidence gaps explicit.`;
}

function buildCommunicationStrategy(input: RedesignPolicyInput) {
  const topBeneficiary = findBeneficiaryGroup(input);
  const topBurdenedGroup = findBurdenedGroup(input);

  return [
    `Lead with who the policy is meant to help: ${topBeneficiary}.`,
    `Acknowledge the main burden on ${topBurdenedGroup} and show the mitigation path before enforcement.`,
    "Use scenario language and separate source-backed evidence from assumptions.",
    "Explain what will be validated through listening, economic data, and stakeholder consultation.",
    "Keep public materials short: what changes, when it starts, who is covered, where to get help."
  ];
}

function buildValidationQuestions(input: RedesignPolicyInput) {
  const beneficiary = findBeneficiaryGroup(input);
  const burdenedGroup = findBurdenedGroup(input);
  const topRisk = input.riskScore.top_risk_drivers[0] ?? "main risk driver";

  return [
    `Do ${beneficiary} understand what the policy changes and how to use the benefit, right, or protection?`,
    `What exact cost, workflow, or timing burden does ${burdenedGroup} face in the first implementation cycle?`,
    `Which source-backed metric is needed to validate the current "${topRisk}" risk signal?`,
    "What data does the implementing agency need before enforcement starts?",
    "Which redesign option would reduce opposition without weakening the policy goal?"
  ];
}

function getPolicyText(input: RedesignPolicyInput) {
  return [
    input.originalPolicyText,
    input.policyAnalysis.policy_title,
    input.policyAnalysis.policy_domain,
    input.policyAnalysis.obligations.join(" ")
  ].join(" ");
}

function needsPhasing(policyText: string, input: RedesignPolicyInput) {
  return /deadline|effective|annual|within|phase|large|small|business|employer|company|provider|landlord|retailer|permit|license|audit|report|compliance|mandate|require/i.test(policyText) ||
    input.riskScore.implementation_complexity_risk.score >= 50 ||
    input.riskScore.business_opposition_risk.score >= 50;
}

function needsTemplates(policyText: string, input: RedesignPolicyInput) {
  return /notice|disclos|audit|report|certif|record|eligibility|application|permit|license|appeal|documentation|form|standard/i.test(policyText) ||
    input.riskScore.legal_ambiguity_risk.score >= 45;
}

function needsAppealOrServiceLevels(policyText: string, input: RedesignPolicyInput) {
  return /appeal|review|complaint|rights|recourse|benefit|service|eligibility|application|permit|denial/i.test(policyText) ||
    input.riskScore.public_reaction_risk.score >= 55;
}

function needsFraudControls(policyText: string, input: RedesignPolicyInput) {
  return /grant|subsidy|rebate|credit|benefit|procurement|vendor|audit|certif|self.?certif|eligibility|invoice|payment|fund/i.test(policyText) ||
    input.fraudRiskAssessment.overall_fraud_risk !== "low" ||
    input.riskScore.fraud_abuse_risk.score >= 45;
}

function findBeneficiaryGroup(input: RedesignPolicyInput) {
  return (
    input.policyAnalysis.affected_groups.find((group) =>
      /resident|applicant|worker|tenant|student|patient|consumer|household|low-income|beneficiar|family|public/i.test(group)
    ) ??
    input.sentimentForecast.public_groups
      .slice()
      .sort((left, right) => right.sentiment_score - left.sentiment_score)[0]?.group_name ??
    "affected people"
  );
}

function findBurdenedGroup(input: RedesignPolicyInput) {
  return (
    input.policyAnalysis.affected_groups.find((group) =>
      /business|employer|company|vendor|retailer|landlord|provider|contractor|agency|staff|administrator|regulated/i.test(group)
    ) ??
    input.stakeholderMap.stakeholders[0]?.company_or_org_name ??
    "covered entities"
  );
}

function confidenceFromRisk(input: RedesignPolicyInput, base: number) {
  const evidencePenalty = input.riskScore.confidence < 0.55 ? -0.04 : 0;
  return Math.round(Math.max(0.45, Math.min(0.78, base + evidencePenalty)) * 100) / 100;
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function estimateAdoptionGain(options: PolicyRedesignOption[], riskScore: RiskScore) {
  const baseGain = options.filter((option) =>
    /small-business|template|outreach|dashboard|appeal/i.test(
      `${option.option_title} ${option.policy_change} ${option.why_it_helps}`
    )
  ).length;

  return Math.min(22, baseGain * 4 + (riskScore.business_opposition_risk.score > 60 ? 3 : 1));
}

function buildStakeholderPlan(stakeholderMap: StakeholderIntelligence) {
  return stakeholderMap.stakeholders.slice(0, 6).map((stakeholder) => ({
    stakeholder: stakeholder.company_or_org_name,
    reason_to_consult: stakeholder.reason_affected,
    suggested_question: suggestedStakeholderQuestion(stakeholder),
    expected_concern: expectedStakeholderConcern(stakeholder)
  }));
}

function suggestedStakeholderQuestion(stakeholder: StakeholderIntelligence["stakeholders"][number]) {
  if (stakeholder.stakeholder_type === "chamber_of_commerce" || stakeholder.stakeholder_type === "trade_group") {
    return "Which compliance deadline, template, or threshold would most reduce avoidable burden without weakening the policy goal?";
  }
  if (stakeholder.stakeholder_type === "hr_tech_vendor" || stakeholder.stakeholder_type === "recruiting_platform") {
    return "Which disclosure, audit evidence, and appeal workflow fields can be supported reliably in the first implementation year?";
  }
  if (stakeholder.stakeholder_type === "compliance_consultant") {
    return "Which audit standard and certificate controls would reduce low-quality compliance theater?";
  }
  if (stakeholder.stakeholder_type === "civil_rights_organization" || stakeholder.stakeholder_type === "worker_advocacy_group") {
    return "What minimum notice, appeal, and public accountability features are necessary for affected people to trust the policy?";
  }
  return "What policy design detail most affects your operational burden, public position, or implementation readiness?";
}

function expectedStakeholderConcern(stakeholder: StakeholderIntelligence["stakeholders"][number]) {
  if (stakeholder.likely_position === "Supportive") return "Concern that mitigation or exemptions could weaken the original policy intent.";
  if (stakeholder.likely_position === "Concerned" || stakeholder.likely_position === "Opposed") {
    return "Concern about compliance burden, cost, uncertainty, or market disruption.";
  }
  return "Conditional support likely depends on implementation clarity, timing, and evidence standards.";
}
