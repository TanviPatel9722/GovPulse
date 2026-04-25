import type {
  EconomicExposure,
  ExecutiveMemo,
  ExecutiveMemoSection,
  ExecutiveRecommendation,
  FraudRiskAssessment,
  ImplementationRisk,
  ParsedPolicy,
  PolicyRedesign,
  RiskScore,
  SentimentForecast,
  StakeholderIntelligence
} from "@/lib/types";
import { callOpenAIJson } from "@/lib/llm/openai";
import { MODEL_CONFIG } from "@/lib/llm/modelRouter";
import { MEMO_AGENT_SYSTEM_PROMPT, buildMemoPrompt } from "@/lib/llm/prompts";
import type { LLMMode } from "@/lib/llm/llmTypes";

export type ExecutiveMemoInput = {
  parsedPolicy: ParsedPolicy;
  sentimentForecast: SentimentForecast;
  stakeholderMap: StakeholderIntelligence;
  economicExposure: EconomicExposure;
  fraudRiskAssessment: FraudRiskAssessment;
  implementationRisk: ImplementationRisk;
  redesign: PolicyRedesign;
  riskScore: RiskScore;
  mode?: LLMMode;
};

export async function generateExecutiveMemoWithLLM(input: ExecutiveMemoInput): Promise<ExecutiveMemo> {
  const fallback = generateExecutiveMemo(input);

  return callOpenAIJson<ExecutiveMemo>({
    model: MODEL_CONFIG.memoAgent,
    systemPrompt: MEMO_AGENT_SYSTEM_PROMPT,
    userPrompt: buildMemoPrompt(input as unknown as Record<string, unknown>),
    schemaName: "ExecutiveMemo",
    fallback,
    mode: input.mode
  });
}

export function generateExecutiveMemo(input: ExecutiveMemoInput): ExecutiveMemo {
  const evidenceCardIds = collectEvidenceIds(input);
  const recommendation = chooseRecommendation(input.riskScore);
  const confidence = average([
    input.riskScore.confidence,
    input.sentimentForecast.public_groups.reduce((sum, group) => sum + group.confidence, 0) /
      Math.max(1, input.sentimentForecast.public_groups.length),
    input.stakeholderMap.confidence,
    input.economicExposure.confidence,
    input.fraudRiskAssessment.abuse_vectors.reduce((sum, vector) => sum + vector.confidence, 0) /
      Math.max(1, input.fraudRiskAssessment.abuse_vectors.length),
    input.implementationRisk.confidence
  ]);

  const sections = {
    policy_summary: section({
      heading: "1. Policy Summary",
      summary: `${input.parsedPolicy.policyName} in ${input.parsedPolicy.jurisdiction}. The policy intent is to ${input.parsedPolicy.objectives.join("; ")}.`,
      bullets: [
        `Core mechanisms: ${input.parsedPolicy.mechanisms.join("; ")}.`,
        `Affected parties: ${input.parsedPolicy.affectedParties.join("; ")}.`,
        `Likely implementation timeline: ${input.parsedPolicy.likelyTimeline}.`
      ],
      evidence_card_ids: evidenceCardIds.slice(0, 4),
      confidence: input.parsedPolicy.confidence,
      assumptions: input.parsedPolicy.assumptions
    }),
    people_sentiment_forecast: section({
      heading: "2. People Sentiment Forecast",
      summary: input.sentimentForecast.overall_sentiment_summary,
      bullets: input.sentimentForecast.public_groups.slice(0, 4).map((group) => {
        return `${group.group_name}: ${group.likely_sentiment}, score ${group.sentiment_score}/100. Main drivers: ${group.support_drivers
          .slice(0, 2)
          .join(", ")}.`;
      }),
      evidence_card_ids: unique(input.sentimentForecast.public_groups.flatMap((group) => group.evidence_card_ids)).slice(0, 8),
      confidence: average(input.sentimentForecast.public_groups.map((group) => group.confidence)),
      assumptions: [
        "Forecast uses scenario language and does not claim perfect prediction.",
        "Public sentiment is separated from loud online sentiment."
      ]
    }),
    main_support_narratives: section({
      heading: "3. Main Support Narratives",
      summary: "Support is likely to center on fairness, transparency, usable recourse, and government accountability.",
      bullets: input.sentimentForecast.support_narratives,
      evidence_card_ids: evidenceCardIds.slice(0, 6),
      confidence: 0.66,
      assumptions: ["Support narratives should be validated through representative listening, not only stakeholder statements."]
    }),
    main_opposition_narratives: section({
      heading: "4. Main Opposition Narratives",
      summary: "Opposition is likely to center on compliance burden, unclear coverage, weak agency readiness, and hidden cost narratives.",
      bullets: input.sentimentForecast.opposition_narratives,
      evidence_card_ids: evidenceCardIds.slice(0, 6),
      confidence: 0.64,
      assumptions: ["Opposition intensity depends on final thresholds, guidance, templates, and enforcement timeline."]
    }),
    stakeholder_intelligence: section({
      heading: "5. CrustData Stakeholder Intelligence",
      summary:
        "CrustData-powered stakeholder intelligence identifies likely business, organization, and decision-maker signals; it does not represent full public sentiment.",
      bullets: [
        ...input.stakeholderMap.stakeholders.slice(0, 4).map((stakeholder) => {
          const people = stakeholder.relevant_people
            .slice(0, 2)
            .map((person) => person.title)
            .filter(Boolean)
            .join(", ");
          return `${stakeholder.company_or_org_name}: ${stakeholder.likely_position}, ${stakeholder.influence_level} influence. Decision-maker categories: ${people || "not identified"}. ${stakeholder.reason_affected}`;
        }),
        `Business signal mode: ${input.stakeholderMap.crustDataStatus?.usedLiveData ? "CrustData live" : "mock/fallback"}; companies ${input.stakeholderMap.crustDataStatus?.companiesFound ?? input.stakeholderMap.stakeholders.length}, people ${input.stakeholderMap.crustDataStatus?.peopleFound ?? 0}, posts ${input.stakeholderMap.crustDataStatus?.postsFound ?? 0}.`,
        "Limitations: CrustData reflects company/person/public activity signals; stakeholder positions are inferred unless directly supported by posts or news."
      ],
      evidence_card_ids: input.stakeholderMap.evidenceCards.map((card) => card.id).slice(0, 8),
      confidence: input.stakeholderMap.confidence,
      assumptions: input.stakeholderMap.assumptions
    }),
    economic_exposure: section({
      heading: "6. Economic Exposure",
      summary:
        "Material reaction risk is concentrated in employer compliance costs, household job-access sensitivity, and local cost-of-living pressure.",
      bullets: [
        input.economicExposure.household_exposure,
        input.economicExposure.business_exposure,
        input.economicExposure.cost_of_living_sensitivity
      ],
      evidence_card_ids: input.economicExposure.key_indicators.map((indicator) => indicator.evidence_card_id),
      confidence: input.economicExposure.confidence,
      assumptions: input.economicExposure.assumptions
    }),
    fraud_abuse_pre_mortem: section({
      heading: "7. Fraud/Abuse Pre-Mortem",
      summary:
        "This is not an allegation against any person or company. It identifies abuse incentives that should be designed out before launch.",
      bullets: input.fraudRiskAssessment.abuse_vectors.slice(0, 5).map((vector) => {
        return `${vector.name}: ${vector.description} Mitigation: ${vector.mitigation}`;
      }),
      evidence_card_ids: input.fraudRiskAssessment.evidence_card_ids,
      confidence: average(input.fraudRiskAssessment.abuse_vectors.map((vector) => vector.confidence)),
      assumptions: input.fraudRiskAssessment.limitations
    }),
    implementation_bottlenecks: section({
      heading: "8. Implementation Bottlenecks",
      summary: `Implementation risk is ${input.implementationRisk.overallLevel}. The main risk is weak operational readiness before public expectations form.`,
      bullets: input.implementationRisk.bottlenecks.map((bottleneck) => {
        return `${bottleneck.bottleneck}: ${bottleneck.likelyScenario} Mitigation: ${bottleneck.mitigation}`;
      }),
      evidence_card_ids: evidenceCardIds.slice(0, 6),
      confidence: input.implementationRisk.confidence,
      assumptions: input.implementationRisk.assumptions
    }),
    recommended_redesign: section({
      heading: "9. Recommended Redesign",
      summary: input.redesign.recommended_redesign,
      bullets: [
        `Before/after risk: ${input.redesign.before_after_scores.before_overall_policy_risk} -> ${input.redesign.before_after_scores.after_expected_policy_risk}.`,
        `Before/after adoption readiness: ${input.redesign.before_after_scores.before_adoption_readiness} -> ${input.redesign.before_after_scores.after_expected_adoption_readiness}.`,
        ...input.redesign.redesign_options.slice(0, 3).map((option) => `${option.option_title}: ${option.why_it_helps}`)
      ],
      evidence_card_ids: evidenceCardIds.slice(0, 8),
      confidence: average(input.redesign.redesign_options.map((option) => option.confidence)),
      assumptions: ["Redesign improves adoption while preserving the original policy intent; it should not be treated as a rollback."]
    }),
    next_3_actions: section({
      heading: "10. Next 3 Actions",
      summary: "Move from pre-mortem to launch readiness with evidence, consultation, and implementation controls.",
      bullets: [
        "Run a two-week validation sprint with applicants, small employers, civil-rights advocates, and HR technology vendors.",
        "Publish draft safe-harbor notices, audit certificate schema, appeal response standards, and a phased implementation calendar.",
        "Build the public dashboard and data pipeline for audit completion, appeals, controls, and source limitations before enforcement."
      ],
      evidence_card_ids: evidenceCardIds.slice(0, 6),
      confidence: 0.7,
      assumptions: ["Next actions assume policymakers want to preserve intent while lowering avoidable launch risk."]
    }),
    evidence_and_assumptions: section({
      heading: "11. Evidence and Assumptions",
      summary:
        "This memo uses citations where available and labels assumptions where live data, representative listening, or final rule text is missing.",
      bullets: [
        `${evidenceCardIds.length} citation IDs are attached across stakeholder, economic, fraud, and sentiment sections.`,
        `Overall risk score: ${input.riskScore.overall_policy_risk.score}/100 (${input.riskScore.overall_policy_risk.band}).`,
        `Recommendation: ${recommendation}.`,
        ...input.riskScore.assumptions.slice(0, 3)
      ],
      evidence_card_ids: evidenceCardIds,
      confidence: input.riskScore.confidence,
      assumptions: [
        "Source-adapter fallback data should be refreshed with live source connectors before final launch decisions.",
        "The memo forecasts likely scenarios, not certain outcomes."
      ]
    })
  };

  const title = `Executive Memo: ${input.parsedPolicy.policyName}`;
  const markdownMemo = renderMarkdownMemo(title, recommendation, confidence, sections);

  return {
    title,
    recommendation,
    confidence,
    structured_json: sections,
    markdown_memo: markdownMemo,
    export_text: markdownMemo,
    evidence_card_ids: evidenceCardIds,
    assumptions: [
      "GovPulse does not claim perfect prediction.",
      "Citations are required for final claims unless a claim is explicitly labeled as an assumption.",
      "Source-adapter fallback data is suitable for planning only until live connectors validate it."
    ]
  };
}

export const writeExecutiveMemo = generateExecutiveMemo;

function chooseRecommendation(riskScore: RiskScore): ExecutiveRecommendation {
  const risk = riskScore.overall_policy_risk.score;
  const readiness = riskScore.mitigation_readiness.score;

  if (risk <= 35 && readiness >= 65) return "Launch as-is";
  if (risk <= 70 && readiness >= 55) return "Launch with mitigation";
  if (risk <= 85) return "Pilot first";
  return "Do not launch as written";
}

function section(input: ExecutiveMemoSection): ExecutiveMemoSection {
  return input;
}

function renderMarkdownMemo(
  title: string,
  recommendation: ExecutiveRecommendation,
  confidence: number,
  sections: ExecutiveMemo["structured_json"]
) {
  const lines = [
    `# ${title}`,
    "",
    `**Recommendation:** ${recommendation}`,
    `**Confidence:** ${Math.round(confidence * 100)}%`,
    "",
    "This memo is scenario analysis, not a claim of perfect prediction.",
    ""
  ];

  for (const sectionValue of Object.values(sections)) {
    lines.push(`## ${sectionValue.heading}`);
    lines.push(sectionValue.summary);
    lines.push("");
    for (const bullet of sectionValue.bullets) {
      lines.push(`- ${bullet}`);
    }
    lines.push("");
    lines.push(`Citations: ${sectionValue.evidence_card_ids.length > 0 ? sectionValue.evidence_card_ids.join(", ") : "assumption-labeled"}`);
    lines.push(`Confidence: ${Math.round(sectionValue.confidence * 100)}%`);
    if (sectionValue.assumptions.length > 0) {
      lines.push(`Assumptions: ${sectionValue.assumptions.join(" | ")}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function collectEvidenceIds(input: ExecutiveMemoInput) {
  return unique([
    ...input.sentimentForecast.public_groups.flatMap((group) => group.evidence_card_ids),
    ...input.stakeholderMap.evidenceCards.map((card) => card.id),
    ...input.economicExposure.key_indicators.map((indicator) => indicator.evidence_card_id),
    ...input.fraudRiskAssessment.evidence_card_ids
  ]);
}

function average(values: number[]) {
  if (values.length === 0) return 0.5;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}
