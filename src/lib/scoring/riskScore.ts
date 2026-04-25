import { estimateEconomicRiskScore } from "@/lib/agents/economicAgent";
import type {
  EconomicExposure,
  FraudRiskAssessment,
  ImplementationRisk,
  MitigationReadiness,
  ParsedPolicy,
  RiskBand,
  RiskScore,
  SentimentForecast,
  StakeholderIntelligence
} from "@/lib/types";

type RiskScoreInput = {
  policyAnalysis: {
    parsedPolicy: ParsedPolicy;
    implementationRisk: ImplementationRisk;
  };
  sentimentForecast: SentimentForecast;
  stakeholderMap: StakeholderIntelligence;
  economicExposure: EconomicExposure;
  fraudRiskAssessment: FraudRiskAssessment;
  implementationRisk: ImplementationRisk;
  mitigationReadiness: MitigationReadiness;
};

const weights = {
  publicReaction: 0.25,
  businessOpposition: 0.15,
  economicExposure: 0.15,
  implementationComplexity: 0.15,
  fraudAbuse: 0.15,
  legalAmbiguity: 0.1,
  misinformation: 0.05
};

const fraudRiskScore: Record<FraudRiskAssessment["overall_fraud_risk"], number> = {
  low: 28,
  medium: 58,
  high: 82
};

const implementationRiskScore: Record<ImplementationRisk["overallLevel"], number> = {
  Low: 25,
  Moderate: 48,
  Elevated: 68,
  High: 84
};

export function computeRiskScore(input: RiskScoreInput): RiskScore {
  const publicReactionRisk = scorePublicReaction(input.sentimentForecast);
  const businessOppositionRisk = scoreBusinessOpposition(input.sentimentForecast, input.stakeholderMap);
  const economicExposureRisk = scoreEconomicExposure(input.economicExposure);
  const implementationComplexityRisk = scoreImplementationComplexity(input.implementationRisk);
  const fraudAbuseRisk = scoreFraudAbuse(input.fraudRiskAssessment);
  const legalAmbiguityRisk = scoreLegalAmbiguity(input.policyAnalysis);
  const misinformationRisk = scoreMisinformation(input.sentimentForecast);
  const mitigationReadiness = readinessExplainable(
    clamp(input.mitigationReadiness.score),
    input.mitigationReadiness.drivers.length > 0
      ? input.mitigationReadiness.drivers
      : ["Mitigation readiness is inferred from redesign specificity and implementation controls."]
  );
  const adoptionReadinessScore = scoreAdoptionReadiness(input.sentimentForecast, input.stakeholderMap);

  const weightedRisk =
    publicReactionRisk.score * weights.publicReaction +
    businessOppositionRisk.score * weights.businessOpposition +
    economicExposureRisk.score * weights.economicExposure +
    implementationComplexityRisk.score * weights.implementationComplexity +
    fraudAbuseRisk.score * weights.fraudAbuse +
    legalAmbiguityRisk.score * weights.legalAmbiguity +
    misinformationRisk.score * weights.misinformation;
  const mitigationReduction = Math.round(input.mitigationReadiness.score * 0.12);
  const overallPolicyRisk = explainable(clamp(Math.round(weightedRisk - mitigationReduction)), [
    `Weighted average uses public reaction 25%, business opposition 15%, economic exposure 15%, implementation complexity 15%, fraud/abuse 15%, legal ambiguity 10%, and misinformation 5%.`,
    `Mitigation readiness reduced the weighted score by ${mitigationReduction} points.`,
    "Scores are directional scenario estimates, not deterministic predictions."
  ]);
  const topRiskDrivers = rankTopDrivers([
    ["Public reaction risk", publicReactionRisk],
    ["Business opposition risk", businessOppositionRisk],
    ["Economic exposure risk", economicExposureRisk],
    ["Implementation complexity risk", implementationComplexityRisk],
    ["Fraud/abuse risk", fraudAbuseRisk],
    ["Legal ambiguity risk", legalAmbiguityRisk],
    ["Misinformation risk", misinformationRisk]
  ]);

  return {
    public_reaction_risk: publicReactionRisk,
    business_opposition_risk: businessOppositionRisk,
    economic_exposure_risk: economicExposureRisk,
    implementation_complexity_risk: implementationComplexityRisk,
    fraud_abuse_risk: fraudAbuseRisk,
    legal_ambiguity_risk: legalAmbiguityRisk,
    misinformation_risk: misinformationRisk,
    mitigation_readiness: mitigationReadiness,
    overall_policy_risk: overallPolicyRisk,
    adoption_readiness: adoptionReadinessScore,
    explanation:
      "EconoSense risk scoring is an explainable weighted scenario model. Each dimension shows the observed drivers used to score it, then overall risk is reduced modestly when mitigation readiness is credible.",
    top_risk_drivers: topRiskDrivers,
    confidence: average([
      average(input.sentimentForecast.public_groups.map((group) => group.confidence)),
      input.stakeholderMap.confidence,
      input.economicExposure.confidence,
      average(input.fraudRiskAssessment.abuse_vectors.map((vector) => vector.confidence)),
      input.implementationRisk.confidence,
      input.mitigationReadiness.confidence
    ]),
    assumptions: [
      "Risk scores use available evidence cards and scenario outputs; missing representative evidence lowers confidence.",
      "Business opposition risk is separated from public reaction risk because organized stakeholders can amplify a policy fight even when general public salience is low.",
      "Mitigation readiness reduces risk only slightly because readiness plans still need execution, staffing, and public communication.",
      ...input.mitigationReadiness.assumptions
    ]
  };
}

export function estimateMitigationReadiness(input: {
  implementationRisk: ImplementationRisk;
  verificationControls: string[];
  redesignRecommendationCount: number;
  validationQuestionCount: number;
}): MitigationReadiness {
  const implementationPenalty = implementationRiskScore[input.implementationRisk.overallLevel] / 4;
  const controlBoost = Math.min(24, input.verificationControls.length * 4);
  const redesignBoost = Math.min(24, input.redesignRecommendationCount * 6);
  const validationBoost = Math.min(12, input.validationQuestionCount * 2);
  const score = clamp(Math.round(42 + controlBoost + redesignBoost + validationBoost - implementationPenalty));

  return {
    score,
    drivers: [
      `${input.verificationControls.length} verification controls are available for abuse-risk mitigation.`,
      `${input.redesignRecommendationCount} redesign recommendations reduce launch risk if adopted.`,
      `${input.validationQuestionCount} validation questions identify evidence gaps before final decision.`,
      `Implementation complexity remains ${input.implementationRisk.overallLevel.toLowerCase()}, limiting readiness.`
    ],
    confidence: 0.62,
    assumptions: [
      "Mitigation readiness is inferred from generated controls and redesign specificity, not confirmed agency capacity.",
      "Readiness should be updated after staffing, budget, procurement, and communications plans are verified."
    ]
  };
}

function scorePublicReaction(forecast: SentimentForecast) {
  const concernIntensity = average(forecast.public_groups.map((group) => Math.max(0, -group.sentiment_score)));
  const uncertaintyPenalty = forecast.public_groups.filter((group) => group.likely_sentiment === "uncertain").length * 6;
  const fairnessPenalty = forecast.public_groups.filter((group) => group.fairness_concerns.length > 0).length * 3;
  const score = clamp(Math.round(concernIntensity + uncertaintyPenalty + fairnessPenalty + 24));

  return readinessExplainable(score, [
    `Negative sentiment intensity averages ${Math.round(concernIntensity)} across public groups.`,
    `${forecast.public_groups.filter((group) => group.likely_sentiment === "uncertain").length} groups are uncertain, which increases launch risk.`,
    "Fairness and trust concerns appear across multiple groups, making public reaction sensitive to implementation details."
  ]);
}

function scoreBusinessOpposition(forecast: SentimentForecast, stakeholderMap: StakeholderIntelligence) {
  const employerGroups = forecast.public_groups.filter((group) => /business|employer/i.test(group.group_name));
  const employerNegative = employerGroups.length
    ? average(employerGroups.map((group) => Math.max(0, -group.sentiment_score)))
    : 35;
  const concernedStakeholders = stakeholderMap.stakeholders.filter((stakeholder) =>
    ["Concerned", "Opposed"].includes(stakeholder.likely_position)
  ).length;
  const score = clamp(Math.round(32 + employerNegative * 0.65 + concernedStakeholders * 6));

  return explainable(score, [
    `Employer/small-business negative sentiment contributes ${Math.round(employerNegative)} points of pressure.`,
    `${concernedStakeholders} stakeholder-map entities are likely concerned or opposed.`,
    "Business opposition risk reflects organized amplification potential, not just general public sentiment."
  ]);
}

function scoreEconomicExposure(exposure: EconomicExposure) {
  const score = estimateEconomicRiskScore(exposure);

  return explainable(score, [
    "Economic exposure includes household, business, labor-market, industry, cost-of-living, and equity pressure signals.",
    `${exposure.key_indicators.length} indicators are attached with evidence-card IDs.`,
    exposure.business_exposure
  ]);
}

function scoreImplementationComplexity(implementationRisk: ImplementationRisk) {
  const score = clamp(
    Math.round(
      implementationRiskScore[implementationRisk.overallLevel] +
        implementationRisk.bottlenecks.filter((bottleneck) => ["High", "Elevated"].includes(bottleneck.riskLevel)).length * 3
    )
  );

  return explainable(score, [
    `Overall implementation risk is ${implementationRisk.overallLevel}.`,
    `${implementationRisk.bottlenecks.length} bottlenecks are identified.`,
    "Coverage definitions, technical capacity, and operational workflows increase complexity when unresolved."
  ]);
}

function scoreFraudAbuse(fraudRisk: FraudRiskAssessment) {
  const score = clamp(fraudRiskScore[fraudRisk.overall_fraud_risk] + Math.max(0, fraudRisk.abuse_vectors.length - 3) * 4);

  return explainable(score, [
    `Overall fraud/abuse risk is ${fraudRisk.overall_fraud_risk}.`,
    `${fraudRisk.abuse_vectors.length} abuse vectors were identified in the pre-mortem.`,
    `${fraudRisk.verification_controls.length} verification controls are proposed, which should be adopted before launch.`
  ]);
}

function scoreLegalAmbiguity(policyAnalysis: RiskScoreInput["policyAnalysis"]) {
  const ambiguityCount = policyAnalysis.parsedPolicy.assumptions.length + policyAnalysis.implementationRisk.bottlenecks.length;
  const legalText = [
    policyAnalysis.parsedPolicy.assumptions.join(" "),
    policyAnalysis.implementationRisk.bottlenecks.map((bottleneck) => bottleneck.bottleneck).join(" ")
  ].join(" ");
  const keywordPenalty = /definition|coverage|authority|audit|appeal|jurisdiction|vendor|enforcement/i.test(legalText)
    ? 18
    : 8;
  const score = clamp(28 + ambiguityCount * 5 + keywordPenalty);

  return explainable(score, [
    `${policyAnalysis.parsedPolicy.assumptions.length} parser assumptions and ${policyAnalysis.implementationRisk.bottlenecks.length} implementation bottlenecks indicate legal or operational ambiguity.`,
    "Coverage definitions, enforcement authority, appeal rights, and vendor responsibility are common ambiguity drivers.",
    "Legal ambiguity score should be revisited after statutory text, rule guidance, and agency authority are verified."
  ]);
}

function scoreMisinformation(forecast: SentimentForecast) {
  const score = clamp(34 + forecast.misinformation_or_confusion_risks.length * 7 + forecast.media_framing_risks.length * 3);

  return explainable(score, [
    `${forecast.misinformation_or_confusion_risks.length} confusion risks are identified.`,
    `${forecast.media_framing_risks.length} media framing risks could amplify loud online sentiment.`,
    "The model separates representative public sentiment from loud online sentiment."
  ]);
}

function scoreAdoptionReadiness(forecast: SentimentForecast, stakeholderMap: StakeholderIntelligence) {
  const sentimentReadiness = average(forecast.public_groups.map((group) => (group.sentiment_score + 100) / 2));
  const stakeholderReadiness = average(
    stakeholderMap.entities.map((entity) => entity.adoptionReadiness)
  );
  const score = clamp(Math.round(sentimentReadiness * 0.55 + stakeholderReadiness * 0.45));

  return explainable(score, [
    `Public-group sentiment translates to ${Math.round(sentimentReadiness)}/100 readiness.`,
    `Stakeholder adoption readiness averages ${Math.round(stakeholderReadiness)}/100.`,
    "Adoption readiness is not the inverse of risk; a policy can be risky but still adoptable with strong mitigation."
  ]);
}

function explainable(score: number, why: string[]) {
  return {
    score: clamp(score),
    band: riskBand(score),
    why
  };
}

function readinessExplainable(score: number, why: string[]) {
  const clamped = clamp(score);
  const band: RiskBand = clamped <= 30 ? "Low" : clamped <= 60 ? "Medium" : "High";
  return {
    score: clamped,
    band,
    why
  };
}

function riskBand(score: number): RiskBand {
  if (score <= 30) return "Low";
  if (score <= 60) return "Medium";
  if (score <= 80) return "High";
  return "Critical";
}

function rankTopDrivers(items: Array<[string, ReturnType<typeof explainable>]>) {
  return items
    .sort((left, right) => right[1].score - left[1].score)
    .slice(0, 5)
    .map(([label, score]) => `${label}: ${score.score}/100 (${score.band}) because ${score.why[0]}`);
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}
