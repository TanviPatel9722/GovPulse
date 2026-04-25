import { parsePolicy, type PolicyAnalysis as ParsedPolicyAnalysis } from "@/lib/agents/policyParser";
import { buildSentimentForecast as buildSentimentForecastAgent, toLegacySentimentGroups } from "@/lib/agents/sentimentAgent";
import { buildNarrativeRisk as buildNarrativeRiskAgent } from "@/lib/agents/narrativeRiskAgent";
import { buildStakeholderMap as buildStakeholderMapAgent } from "@/lib/agents/stakeholderAgent";
import { estimateEconomicExposure } from "@/lib/agents/economicAgent";
import { assessFraudRisk } from "@/lib/agents/fraudRiskAgent";
import { assessImplementationRisk } from "@/lib/agents/implementationAgent";
import { generatePolicyRedesignWithLLM } from "@/lib/agents/redesignAgent";
import { generateExecutiveMemoWithLLM } from "@/lib/agents/reportAgent";
import { assessNarrativeRisk } from "@/lib/agents/narrativeRiskAgent";
import { generateImpactChainSimulation } from "@/lib/agents/impactChainAgent";
import { generateIndustryRippleEffects } from "@/lib/agents/marketShockAgent";
import { generateSocialDynamicsRisk } from "@/lib/agents/socialContagionAgent";
import { generateFinanceInsuranceRisk } from "@/lib/agents/financeRiskAgent";
import { auditPolicySources } from "@/lib/agents/sourceAuditorAgent";
import { computeRiskScore, estimateMitigationReadiness } from "@/lib/scoring/riskScore";
import {
  buildFinanceInsuranceImpact,
  buildStakeholderEconomicImpact as buildMergedStakeholderEconomicImpact
} from "@/lib/agents/stakeholderEconomicImpactAgent";
import { buildPublicSentimentNarrativeImpact } from "@/lib/agents/publicSentimentNarrativeAgent";
import {
  auditRiskAbuseSources,
  buildRiskAbuseAssessment as buildMergedRiskAbuseAssessment
} from "@/lib/agents/riskAbuseAssessmentAgent";
import { buildPolicyRedesignMemo } from "@/lib/agents/policyRedesignMemoAgent";
import {
  createEvidenceCard,
  mergeEvidenceCards,
  rankEvidenceCards,
  type AgentName,
  type EvidenceCard
} from "@/lib/evidence/evidenceCard";
import { rankEvidenceCardsByTrust } from "@/lib/evidence/sourceRanker";
import { fetchCensusAcsProfile } from "@/lib/sources/census";
import { fetchBlsLaborProfile } from "@/lib/sources/bls";
import { fetchBeaRegionalProfile } from "@/lib/sources/bea";
import { fetchFredMacroProfile } from "@/lib/sources/fred";
import { fetchUsaSpendingFraudSignals } from "@/lib/sources/usaspending";
import { sourceRegistryByName, type SourceName } from "@/lib/sources/sourceRegistry";
import { sourcePlaceholders } from "@/lib/sources/publicSignals";
import { isLLMConfigured } from "@/lib/llm/modelRouter";
import {
  DEMO_POLICY_TEXT,
  type EconomicExposure,
  type ExecutiveMemo,
  type ExecutiveMemoSection,
  type FinanceInsuranceRisk,
  type FraudRiskAssessment,
  type ImpactChainSimulation,
  type IndustryRippleEffects,
  type ImplementationRisk,
  type NarrativeRisk,
  type ParsedPolicy,
  type PolicyAnalysis as UiPolicyAnalysis,
  type PolicyRedesign,
  type RiskScore,
  type SentimentForecast,
  type SocialDynamicsRisk,
  type SourceAuditResult,
  type StakeholderIntelligence
} from "@/lib/types";
import type { CrustDataStatus } from "@/lib/types/stakeholders";

export type AnalyzePolicyMode = "demo" | "live";

export type AnalyzePolicyRequest = {
  policyText: string;
  jurisdiction: string;
  policyCategory: string;
  mode: AnalyzePolicyMode;
};

export type AnalysisWarning = {
  step: PipelineStepName | "request";
  message: string;
  severity: "info" | "warning" | "error";
  missingData?: string[];
};

export type DataNeedStatus = "planned" | "mock_fallback" | "missing_api_key" | "source_unavailable";

export type DataNeed = {
  source_name: SourceName;
  query_focus: string;
  priority: "high" | "medium" | "low";
  required_for_agents: AgentName[];
  status: DataNeedStatus;
  missing_data: string[];
};

export type DataNeedsPlan = {
  plan_id: string;
  mode: AnalyzePolicyMode;
  jurisdiction: string;
  policy_domain: string;
  created_at: string;
  needs: DataNeed[];
  assumptions: string[];
};

export type AnalyzePolicyPipelineResponse = {
  analysisId: string;
  policyAnalysis: ParsedPolicyAnalysis;
  evidenceCards: EvidenceCard[];
  sentimentForecast: SentimentForecast;
  narrativeRisk: NarrativeRisk;
  stakeholderMap: StakeholderIntelligence;
  crustDataStatus: CrustDataStatus;
  economicExposure: EconomicExposure;
  fraudRiskAssessment: FraudRiskAssessment;
  riskScore: RiskScore;
  policyRedesign: PolicyRedesign;
  executiveMemo: ExecutiveMemo;
  impactChainSimulation: ImpactChainSimulation;
  industryRippleEffects: IndustryRippleEffects;
  socialDynamicsRisk: SocialDynamicsRisk;
  financeInsuranceRisk: FinanceInsuranceRisk;
  sourceAudit: SourceAuditResult;
  dataNeedsPlan: DataNeedsPlan;
  implementationRisk: ImplementationRisk;
  warnings: AnalysisWarning[];
  missingData: string[];
  mode: AnalyzePolicyMode;
  generatedAt: string;
  ok: true;
  notice: string;
  analysis: UiPolicyAnalysis;
};

type PipelineStepName =
  | "parsePolicy"
  | "buildInitialEvidenceCards"
  | "createDataNeedsPlan"
  | "retrieveEvidence"
  | "buildStakeholderEconomicImpact"
  | "buildPublicSentimentNarrativeImpact"
  | "buildRiskAbuseAssessment"
  | "buildFinanceInsuranceImpact"
  | "buildPolicyRedesignMemo"
  | "auditRiskAbuseSources"
  | "buildSentimentForecast"
  | "buildNarrativeRisk"
  | "buildStakeholderMap"
  | "buildEconomicExposure"
  | "buildFraudRiskAssessment"
  | "buildImplementationRisk"
  | "calculateRiskScore"
  | "generatePolicyRedesign"
  | "generateExecutiveMemo"
  | "generateImpactChainSimulation"
  | "generateIndustryRippleEffects"
  | "generateSocialDynamicsRisk"
  | "generateFinanceInsuranceRisk"
  | "auditSources"
  | "updateExecutiveMemoWithImpactChain"
  | "updateExecutiveMemoWithSourceAudit"
  | "buildLegacyAnalysis";

type PipelineContext = {
  analysisId: string;
  generatedAt: string;
  request: AnalyzePolicyRequest;
  warnings: AnalysisWarning[];
};

type EvidenceRetrievalResult = {
  evidenceCards: EvidenceCard[];
  warnings: AnalysisWarning[];
};

type InitialEvidenceResult = EvidenceRetrievalResult & {
  dataNeedsPlan: DataNeedsPlan;
};

const sourceApiKeyEnv: Partial<Record<SourceName, string>> = {
  CrustData: "CRUSTDATA_API_KEY",
  "Regulations.gov": "REGULATIONS_GOV_API_KEY",
  "Congress.gov": "CONGRESS_GOV_API_KEY",
  "Media Cloud": "MEDIA_CLOUD_API_KEY",
  "Social media": "SOCIAL_SIGNALS_API_KEY"
};

export function normalizeAnalyzePolicyRequest(input: unknown): {
  request: AnalyzePolicyRequest;
  warnings: AnalysisWarning[];
} {
  const body = isRecord(input) ? input : {};
  const warnings: AnalysisWarning[] = [];
  const rawPolicyText = typeof body.policyText === "string" ? body.policyText.trim() : "";
  const policyText = rawPolicyText || DEMO_POLICY_TEXT;

  if (!rawPolicyText) {
    warnings.push({
      step: "request",
      severity: "warning",
      message: "policyText was missing or empty; demo policy text was used as a clearly labeled fallback.",
      missingData: ["policyText"]
    });
  }

  const jurisdiction =
    typeof body.jurisdiction === "string" && body.jurisdiction.trim()
      ? body.jurisdiction.trim()
      : "Washington, DC";
  const policyCategory =
    getString(body.policyCategory) ?? getString(body.policyType) ?? "AI governance";
  const mode = body.mode === "live" ? "live" : "demo";

  if (body.mode && body.mode !== "demo" && body.mode !== "live") {
    warnings.push({
      step: "request",
      severity: "warning",
      message: `Unsupported mode "${String(body.mode)}"; demo mode was used.`,
      missingData: ["mode"]
    });
  }

  return {
    request: {
      policyText,
      jurisdiction,
      policyCategory,
      mode
    },
    warnings
  };
}

export async function runAnalyzePolicyPipeline(
  request: AnalyzePolicyRequest,
  initialWarnings: AnalysisWarning[] = []
): Promise<AnalyzePolicyPipelineResponse> {
  const context: PipelineContext = {
    analysisId: createAnalysisId(),
    generatedAt: new Date().toISOString(),
    request,
    warnings: [...initialWarnings]
  };

  if (request.mode === "live" && !isLLMConfigured()) {
    context.warnings.push({
      step: "request",
      severity: "warning",
      message: "OPENAI_API_KEY is not configured; LLM agents used deterministic fallback outputs.",
      missingData: ["OPENAI_API_KEY is not configured."]
    });
  }

  const policyAnalysis = await runStep(context, "parsePolicy", () =>
    parsePolicy(request.policyText, request.jurisdiction, request.policyCategory, request.mode)
  );
  const parsedPolicy = toParsedPolicy(policyAnalysis, request.policyText);
  const initialEvidence = await runStep(context, "buildInitialEvidenceCards", () =>
    buildInitialEvidenceCards(policyAnalysis, request.mode)
  );
  const dataNeedsPlan = initialEvidence.dataNeedsPlan;
  const evidenceCards = initialEvidence.evidenceCards;

  context.warnings.push(...initialEvidence.warnings);

  const stakeholderEconomicImpact = await runStep(context, "buildStakeholderEconomicImpact", () =>
    buildMergedStakeholderEconomicImpact({
      policyAnalysis,
      evidenceCards,
      mode: request.mode
    })
  );
  const { stakeholderMap, economicExposure, industryRippleEffects } = stakeholderEconomicImpact;

  const publicSentimentNarrativeImpact = await runStep(context, "buildPublicSentimentNarrativeImpact", () =>
    buildPublicSentimentNarrativeImpact({
      policyAnalysis,
      parsedPolicy,
      evidenceCards,
      stakeholderMap,
      economicExposure,
      mode: request.mode
    })
  );
  const { sentimentForecast, narrativeRisk, socialDynamicsRisk } = publicSentimentNarrativeImpact;

  const preRiskEvidenceCards = mergeEvidenceCards([
    ...evidenceCards,
    ...publicSentimentNarrativeImpact.publicSignalEvidenceCards,
    ...stakeholderMap.evidenceCards,
    ...stakeholderMap.stakeholders.flatMap((stakeholder) => stakeholder.evidence_cards)
  ]);
  const rankedPreRiskEvidenceCards = rankEvidenceCardsByTrust(
    rankEvidenceCards(preRiskEvidenceCards, {
      preferred_geography: policyAnalysis.jurisdiction,
      preferred_policy_domain: policyAnalysis.policy_domain
    })
  );

  const riskAbuseAssessment = await runStep(context, "buildRiskAbuseAssessment", () =>
    buildMergedRiskAbuseAssessment({
      policyAnalysis,
      parsedPolicy,
      stakeholderMap,
      economicExposure,
      sentimentForecast,
      evidenceCards: rankedPreRiskEvidenceCards,
      mode: request.mode
    })
  );
  const { fraudRiskAssessment, implementationRisk, riskScore } = riskAbuseAssessment;

  const financeInsuranceRisk = await runStep(context, "buildFinanceInsuranceImpact", () =>
    buildFinanceInsuranceImpact({
      policyAnalysis,
      economicExposure,
      sentimentForecast,
      fraudRiskAssessment,
      evidenceCards: rankedPreRiskEvidenceCards,
      mode: request.mode
    })
  );

  const policyRedesignMemo = await runStep(context, "buildPolicyRedesignMemo", () =>
    buildPolicyRedesignMemo({
      originalPolicyText: request.policyText,
      policyAnalysis,
      parsedPolicy,
      sentimentForecast,
      stakeholderMap,
      economicExposure,
      fraudRiskAssessment,
      implementationRisk,
      riskScore,
      evidenceCards: rankedPreRiskEvidenceCards,
      mode: request.mode
    })
  );
  const { impactChainSimulation, policyRedesign, executiveMemo } = policyRedesignMemo;

  const allEvidenceCards = mergeEvidenceCards([
    ...rankedPreRiskEvidenceCards,
    ...stakeholderMap.evidenceCards,
    ...stakeholderMap.stakeholders.flatMap((stakeholder) => stakeholder.evidence_cards)
  ]);
  const rankedEvidenceCards = rankEvidenceCardsByTrust(
    rankEvidenceCards(allEvidenceCards, {
      preferred_geography: policyAnalysis.jurisdiction,
      preferred_policy_domain: policyAnalysis.policy_domain
    })
  );

  const sourceAudit = await runStep(context, "auditRiskAbuseSources", () =>
    Promise.resolve(
      auditRiskAbuseSources({
        policyAnalysis,
        parsedPolicy,
        stakeholderMap,
        economicExposure,
        sentimentForecast,
        narrativeRisk,
        evidenceCards: rankedEvidenceCards,
        mode: request.mode,
        fraudRiskAssessment,
        riskScore,
        policyRedesign,
        impactChainSimulation,
        industryRippleEffects,
        socialDynamicsRisk,
        financeInsuranceRisk,
        dataNeedsPlan
      })
    )
  );
  const enrichedExecutiveMemo = await runStep(context, "updateExecutiveMemoWithImpactChain", () =>
    Promise.resolve(
      updateExecutiveMemoWithImpactChain({
        memo: executiveMemo,
        impactChainSimulation,
        industryRippleEffects,
        socialDynamicsRisk,
        financeInsuranceRisk,
        stakeholderMap,
        fraudRiskAssessment,
        policyRedesign
      })
    )
  );
  const auditedExecutiveMemo = await runStep(context, "updateExecutiveMemoWithSourceAudit", () =>
    Promise.resolve(
      updateExecutiveMemoWithSourceAudit({
        memo: enrichedExecutiveMemo,
        sourceAudit,
        evidenceCards: rankedEvidenceCards
      })
    )
  );
  const legacyAnalysis = await runStep(context, "buildLegacyAnalysis", () =>
    Promise.resolve(
      buildLegacyAnalysis({
        context,
        parsedPolicy,
        sentimentForecast,
        stakeholderMap,
        economicExposure,
        fraudRiskAssessment,
        implementationRisk,
        riskScore,
        policyRedesign,
        executiveMemo: auditedExecutiveMemo,
        impactChainSimulation,
        industryRippleEffects,
        socialDynamicsRisk,
        financeInsuranceRisk,
        sourceAudit,
        narrativeRisk
      })
    )
  );
  const missingData = collectMissingData(dataNeedsPlan, context.warnings);

  return {
    analysisId: context.analysisId,
    policyAnalysis,
    evidenceCards: rankedEvidenceCards,
    sentimentForecast,
    narrativeRisk,
    stakeholderMap,
    crustDataStatus: stakeholderMap.crustDataStatus ?? defaultCrustDataStatus(stakeholderMap),
    economicExposure,
    fraudRiskAssessment,
    riskScore,
    policyRedesign,
    executiveMemo: auditedExecutiveMemo,
    impactChainSimulation,
    industryRippleEffects,
    socialDynamicsRisk,
    financeInsuranceRisk,
    sourceAudit,
    dataNeedsPlan,
    implementationRisk,
    warnings: context.warnings,
    missingData,
    mode: request.mode,
    generatedAt: context.generatedAt,
    ok: true,
    notice: buildNotice(request.mode, context.warnings),
    analysis: legacyAnalysis
  };
}

export function createDataNeedsPlan(policyAnalysis: ParsedPolicyAnalysis, mode: AnalyzePolicyMode): DataNeedsPlan {
  const needs = policyAnalysis.required_data_sources.map((request) => {
    const sourceName = normalizeSourceName(request.source);
    const missingApiKey = mode === "live" ? getMissingApiKey(sourceName) : null;

    return {
      source_name: sourceName,
      query_focus: request.query_focus,
      priority: request.priority,
      required_for_agents: agentsForSource(sourceName),
      status: missingApiKey ? "missing_api_key" : mode === "demo" ? "mock_fallback" : "planned",
      missing_data: missingApiKey ? [`${missingApiKey} is not configured.`] : []
    } satisfies DataNeed;
  });

  if (!needs.some((need) => need.source_name === "Generic web search/manual source")) {
    needs.push({
      source_name: "Generic web search/manual source",
      query_focus: "Submitted policy text, manual review notes, local documents, and source limitations.",
      priority: "high",
      required_for_agents: ["policy_parser", "sentiment_forecast", "executive_memo"],
      status: mode === "demo" ? "mock_fallback" : "planned",
      missing_data: []
    });
  }

  return {
    plan_id: `plan-${createShortId()}`,
    mode,
    jurisdiction: policyAnalysis.jurisdiction,
    policy_domain: policyAnalysis.policy_domain,
    created_at: new Date().toISOString(),
    needs,
    assumptions: [
      "The data plan is generated from parsed policy obligations, affected groups, affected industries, and known source coverage.",
      "Missing sources are explicitly marked so downstream agents can label assumptions instead of presenting unsupported claims.",
      mode === "live"
        ? "Live mode will use configured source adapters where available and mock placeholders where a source adapter or API key is missing."
        : "Demo mode uses typed mock fallback evidence cards for local testing."
    ]
  };
}

export async function buildInitialEvidenceCards(
  policyAnalysis: ParsedPolicyAnalysis,
  mode: AnalyzePolicyMode
): Promise<InitialEvidenceResult> {
  const dataNeedsPlan = createDataNeedsPlan(policyAnalysis, mode);
  const evidenceResult = await retrieveEvidence(dataNeedsPlan, policyAnalysis, mode);

  return {
    dataNeedsPlan,
    evidenceCards: evidenceResult.evidenceCards,
    warnings: evidenceResult.warnings
  };
}

export async function retrieveEvidence(
  dataNeedsPlan: DataNeedsPlan,
  policyAnalysis: ParsedPolicyAnalysis,
  mode: AnalyzePolicyMode
): Promise<EvidenceRetrievalResult> {
  const retrievals = await Promise.all(
    dataNeedsPlan.needs.map(async (need) => retrieveEvidenceForNeed(need, policyAnalysis, mode))
  );
  const evidenceCards = mergeEvidenceCards(retrievals.flatMap((retrieval) => retrieval.evidenceCards));
  const warnings = retrievals.flatMap((retrieval) => retrieval.warnings);

  return {
    evidenceCards: rankEvidenceCards(evidenceCards, {
      preferred_geography: policyAnalysis.jurisdiction,
      preferred_policy_domain: policyAnalysis.policy_domain
    }),
    warnings
  };
}

export function buildSentimentForecast(
  policyAnalysis: ParsedPolicyAnalysis,
  evidenceCards: EvidenceCard[],
  mode: AnalyzePolicyMode = "demo"
): Promise<SentimentForecast> {
  return buildSentimentForecastAgent({
    policyAnalysis,
    evidenceCards,
    mode
  });
}

export function buildNarrativeRisk(
  policyAnalysis: ParsedPolicyAnalysis,
  parsedPolicy: ParsedPolicy,
  sentimentForecast: SentimentForecast,
  legacySentiment: ReturnType<typeof toLegacySentimentGroups>,
  evidenceCards: EvidenceCard[],
  mode: AnalyzePolicyMode = "demo"
): Promise<NarrativeRisk> {
  return buildNarrativeRiskAgent(policyAnalysis, parsedPolicy, sentimentForecast, legacySentiment, evidenceCards, mode);
}

export async function buildStakeholderMap(
  policyAnalysis: ParsedPolicyAnalysis,
  mode: AnalyzePolicyMode = "demo",
  evidenceCards: EvidenceCard[] = []
): Promise<StakeholderIntelligence> {
  return buildStakeholderMapAgent(policyAnalysis, mode, evidenceCards);
}

export async function buildEconomicExposure(
  policyAnalysis: ParsedPolicyAnalysis,
  mode: AnalyzePolicyMode = "demo"
): Promise<EconomicExposure> {
  return estimateEconomicExposure(
    policyAnalysis,
    policyAnalysis.jurisdiction,
    policyAnalysis.affected_groups,
    policyAnalysis.affected_industries,
    mode
  );
}

export async function buildFraudRiskAssessment(
  policyAnalysis: ParsedPolicyAnalysis,
  stakeholderMap: StakeholderIntelligence,
  economicExposure: EconomicExposure,
  evidenceCards: EvidenceCard[],
  mode: AnalyzePolicyMode = "demo"
): Promise<FraudRiskAssessment> {
  return assessFraudRisk({
    policyAnalysis,
    stakeholderMap,
    economicExposure,
    evidenceCards,
    mode
  });
}

export function calculateRiskScore(
  parsedPolicy: ParsedPolicy,
  sentimentForecast: SentimentForecast,
  stakeholderMap: StakeholderIntelligence,
  economicExposure: EconomicExposure,
  fraudRiskAssessment: FraudRiskAssessment,
  implementationRisk: ImplementationRisk
): RiskScore {
  const initialReadiness = estimateMitigationReadiness({
    implementationRisk,
    verificationControls: fraudRiskAssessment.verification_controls,
    redesignRecommendationCount: 0,
    validationQuestionCount: sentimentForecast.validation_questions.length
  });

  return computeRiskScore({
    policyAnalysis: {
      parsedPolicy,
      implementationRisk
    },
    sentimentForecast,
    stakeholderMap,
    economicExposure,
    fraudRiskAssessment,
    implementationRisk,
    mitigationReadiness: initialReadiness
  });
}

export function generatePolicyRedesign(
  originalPolicyText: string,
  policyAnalysis: ParsedPolicyAnalysis,
  riskScore: RiskScore,
  sentimentForecast: SentimentForecast,
  economicExposure: EconomicExposure,
  fraudRiskAssessment: FraudRiskAssessment,
  stakeholderMap: StakeholderIntelligence,
  mode: AnalyzePolicyMode = "demo"
): Promise<PolicyRedesign> {
  return generatePolicyRedesignWithLLM({
    originalPolicyText,
    policyAnalysis: {
      policy_title: policyAnalysis.policy_title,
      policy_domain: policyAnalysis.policy_domain,
      jurisdiction: policyAnalysis.jurisdiction,
      obligations: policyAnalysis.obligations,
      affected_groups: policyAnalysis.affected_groups,
      affected_industries: policyAnalysis.affected_industries
    },
    riskScore,
    sentimentForecast,
    economicExposure,
    fraudRiskAssessment,
    stakeholderMap,
    mode
  });
}

export function generateExecutiveMemo(
  parsedPolicy: ParsedPolicy,
  sentimentForecast: SentimentForecast,
  stakeholderMap: StakeholderIntelligence,
  economicExposure: EconomicExposure,
  fraudRiskAssessment: FraudRiskAssessment,
  implementationRisk: ImplementationRisk,
  policyRedesign: PolicyRedesign,
  riskScore: RiskScore,
  mode: AnalyzePolicyMode = "demo"
): Promise<ExecutiveMemo> {
  return generateExecutiveMemoWithLLM({
    parsedPolicy,
    sentimentForecast,
    stakeholderMap,
    economicExposure,
    fraudRiskAssessment,
    implementationRisk,
    redesign: policyRedesign,
    riskScore,
    mode
  });
}

export function updateExecutiveMemoWithImpactChain(input: {
  memo: ExecutiveMemo;
  impactChainSimulation: ImpactChainSimulation;
  industryRippleEffects: IndustryRippleEffects;
  socialDynamicsRisk: SocialDynamicsRisk;
  financeInsuranceRisk: FinanceInsuranceRisk;
  stakeholderMap: StakeholderIntelligence;
  fraudRiskAssessment: FraudRiskAssessment;
  policyRedesign: PolicyRedesign;
}): ExecutiveMemo {
  const mostSensitiveGroup = [...input.socialDynamicsRisk.groups].sort(
    (left, right) =>
      right.trust_sensitivity +
      right.cost_burden_sensitivity +
      right.protest_or_backlash_risk -
      (left.trust_sensitivity + left.cost_burden_sensitivity + left.protest_or_backlash_risk)
  )[0];
  const mostExposedIndustry = input.industryRippleEffects.industries.find(
    (industry) => industry.effect_type !== "neutral" && industry.effect_type !== "uncertain"
  );
  const importantStakeholder =
    input.stakeholderMap.stakeholders.find((stakeholder) => stakeholder.influence_level === "Very High") ??
    input.stakeholderMap.stakeholders[0];
  const fraudVector = input.fraudRiskAssessment.abuse_vectors[0];
  const financeRisk = input.financeInsuranceRisk.risk_categories[0];
  const confidence = average([
    ...input.impactChainSimulation.impact_chains.map((chain) => chain.confidence),
    ...(mostSensitiveGroup ? [mostSensitiveGroup.confidence] : []),
    ...(mostExposedIndustry ? [mostExposedIndustry.confidence] : []),
    ...(financeRisk ? [financeRisk.confidence] : [])
  ]);
  const evidenceCardIds = unique([
    ...input.memo.evidence_card_ids,
    ...input.impactChainSimulation.impact_chains.flatMap((chain) => chain.evidence_card_ids),
    ...(mostSensitiveGroup?.evidence_card_ids ?? []),
    ...(mostExposedIndustry?.evidence_card_ids ?? []),
    ...(financeRisk?.evidence_card_ids ?? [])
  ]);
  const section: ExecutiveMemoSection = {
    heading: "Predictive Chain-Reaction Summary",
    summary: input.impactChainSimulation.overall_chain_reaction_summary,
    bullets: [
      `Highest-risk chain: ${input.impactChainSimulation.highest_risk_chain}.`,
      `Fastest-moving chain: ${input.impactChainSimulation.fastest_moving_chain}.`,
      `Most sensitive public group: ${mostSensitiveGroup?.group_name ?? "not identified"}.`,
      `Most exposed industry: ${mostExposedIndustry?.industry_name ?? "not identified"}.`,
      `Most important stakeholder group: ${importantStakeholder?.company_or_org_name ?? "not identified"}.`,
      `Most plausible fraud/abuse vector: ${fraudVector?.name ?? "not identified"}.`,
      `Recommended redesign: ${input.policyRedesign.recommended_redesign}.`
    ],
    evidence_card_ids: evidenceCardIds.slice(0, 10),
    confidence,
    assumptions: [
      "Impact chain metrics are source-backed only when their metric_source_type says so.",
      "Model-estimated and scenario-assumption metrics are directional planning signals, not precise forecasts.",
      ...input.impactChainSimulation.warnings
    ]
  };
  const markdownSection = [
    "## Predictive Chain-Reaction Summary",
    section.summary,
    "",
    ...section.bullets.map((bullet) => `- ${bullet}`),
    "",
    `Evidence cards: ${section.evidence_card_ids.join(", ")}`,
    `Confidence: ${Math.round(section.confidence * 100)}%`,
    `Assumptions: ${section.assumptions.join(" | ")}`,
    ""
  ].join("\n");

  return {
    ...input.memo,
    confidence: average([input.memo.confidence, confidence]),
    structured_json: {
      ...input.memo.structured_json,
      predictive_chain_reaction_summary: section
    },
    markdown_memo: `${input.memo.markdown_memo}\n${markdownSection}`,
    export_text: `${input.memo.export_text}\n${markdownSection}`,
    evidence_card_ids: evidenceCardIds,
    assumptions: unique([...input.memo.assumptions, ...section.assumptions])
  };
}

function updateExecutiveMemoWithSourceAudit(input: {
  memo: ExecutiveMemo;
  sourceAudit: SourceAuditResult;
  evidenceCards: EvidenceCard[];
}): ExecutiveMemo {
  const strongestSources = input.evidenceCards
    .filter((card) => {
      const tier = sourceRegistryByName[card.source_name]?.sourceTrustTier;
      return tier === "official-statistical" || tier === "official-policy" || tier === "peer-reviewed";
    })
    .slice(0, 6);
  const weakAreas = unique([
    ...input.sourceAudit.unsupported_claims,
    ...input.sourceAudit.overprecise_metrics,
    ...input.sourceAudit.social_only_claims,
    ...input.sourceAudit.missing_sources
  ]).slice(0, 6);
  const evidenceCardIds = unique([...input.memo.evidence_card_ids, ...strongestSources.map((card) => card.id)]);
  const confidencePenalty = Math.min(0.18, weakAreas.length * 0.02 + input.sourceAudit.recommended_downgrades.length * 0.01);
  const section: ExecutiveMemoSection = {
    heading: "Evidence Quality & Limitations",
    summary:
      "The source audit separates source-backed evidence from model-estimated and scenario-assumption outputs before the memo is used for real policy decisions.",
    bullets: [
      `Strongest sources used: ${
        strongestSources.length > 0
          ? strongestSources.map((card) => `${card.source_name} (${card.id})`).join("; ")
          : "no primary official or peer-reviewed evidence cards attached"
      }.`,
      `Weak or missing evidence areas: ${weakAreas.length > 0 ? weakAreas.join(" | ") : "no major source-quality issues flagged by the auditor"}.`,
      "Numbers labeled source-backed should trace to official, peer-reviewed, or dataset-backed sources; model-estimated and scenario-assumption metrics are planning signals.",
      "Before real policy use, validate representative public sentiment, final legal text, local implementation capacity, fiscal exposure, and any exact cost or labor estimates."
    ],
    evidence_card_ids: evidenceCardIds.slice(0, 10),
    confidence: Math.max(0.2, Math.round((input.memo.confidence - confidencePenalty) * 100) / 100),
    assumptions: [
      "Source audit is conservative and flags uncertainty for review rather than suppressing scenario analysis.",
      ...input.sourceAudit.final_confidence_adjustments.slice(0, 4)
    ]
  };
  const markdownSection = [
    "## Evidence Quality & Limitations",
    section.summary,
    "",
    ...section.bullets.map((bullet) => `- ${bullet}`),
    "",
    `Evidence cards: ${section.evidence_card_ids.length > 0 ? section.evidence_card_ids.join(", ") : "assumption-labeled"}`,
    `Confidence: ${Math.round(section.confidence * 100)}%`,
    `Assumptions: ${section.assumptions.join(" | ")}`,
    ""
  ].join("\n");

  return {
    ...input.memo,
    confidence: section.confidence,
    structured_json: {
      ...input.memo.structured_json,
      evidence_quality_limitations: section
    },
    markdown_memo: `${input.memo.markdown_memo}\n${markdownSection}`,
    export_text: `${input.memo.export_text}\n${markdownSection}`,
    evidence_card_ids: evidenceCardIds,
    assumptions: unique([...input.memo.assumptions, ...section.assumptions])
  };
}

async function retrieveEvidenceForNeed(
  need: DataNeed,
  policyAnalysis: ParsedPolicyAnalysis,
  mode: AnalyzePolicyMode
): Promise<EvidenceRetrievalResult> {
  const missingApiKey = mode === "live" ? getMissingApiKey(need.source_name) : null;

  if (missingApiKey) {
    return {
      evidenceCards: [createMissingDataEvidenceCard(need, policyAnalysis, missingApiKey)],
      warnings: [
        {
          step: "retrieveEvidence",
          severity: "warning",
          message: `${need.source_name} evidence is marked missing because ${missingApiKey} is not configured.`,
          missingData: [`${missingApiKey} is not configured.`]
        }
      ]
    };
  }

  try {
    const evidenceCards = await fetchEvidenceCardsForNeed(need, policyAnalysis, mode);
    return {
      evidenceCards,
      warnings:
        mode === "demo"
          ? [
              {
                step: "retrieveEvidence",
                severity: "info",
                message: `${need.source_name} returned mock fallback evidence for demo mode.`
              }
            ]
          : []
    };
  } catch (error) {
    return {
      evidenceCards: [createSourceUnavailableEvidenceCard(need, policyAnalysis, error)],
      warnings: [
        {
          step: "retrieveEvidence",
          severity: "warning",
          message: `${need.source_name} retrieval failed; source-unavailable placeholder evidence was attached.`,
          missingData: [`${need.source_name}: ${errorToMessage(error)}`]
        }
      ]
    };
  }
}

async function fetchEvidenceCardsForNeed(
  need: DataNeed,
  policyAnalysis: ParsedPolicyAnalysis,
  mode: AnalyzePolicyMode
): Promise<EvidenceCard[]> {
  switch (need.source_name) {
    case "Census ACS":
      return (await fetchCensusAcsProfile(policyAnalysis.jurisdiction)).evidence_cards;
    case "BLS":
      return (await fetchBlsLaborProfile(policyAnalysis.jurisdiction, policyAnalysis.affected_industries)).evidence_cards;
    case "BEA":
      return (await fetchBeaRegionalProfile(policyAnalysis.jurisdiction, policyAnalysis.affected_industries)).evidence_cards;
    case "FRED":
      return (await fetchFredMacroProfile(policyAnalysis.jurisdiction)).evidence_cards;
    case "USAspending":
      return (await fetchUsaSpendingFraudSignals(policyAnalysis)).evidence_cards;
    default:
      return [createPlannedEvidenceCard(need, policyAnalysis, mode)];
  }
}

async function runStep<T>(
  context: PipelineContext,
  step: PipelineStepName,
  action: () => Promise<T>
): Promise<T> {
  const startedAt = Date.now();
  console.info(`[EconoSense] ${context.analysisId} ${step}: start`);

  try {
    const result = await action();
    console.info(`[EconoSense] ${context.analysisId} ${step}: ok (${Date.now() - startedAt}ms)`);
    return result;
  } catch (error) {
    const message = errorToMessage(error);
    console.error(`[EconoSense] ${context.analysisId} ${step}: failed`, error);
    context.warnings.push({
      step,
      severity: "error",
      message: `${step} failed; typed mock fallback was used. ${message}`,
      missingData: [message]
    });

    return (await fallbackForStep(step, context, error)) as T;
  }
}

async function fallbackForStep(step: PipelineStepName, context: PipelineContext, error: unknown): Promise<unknown> {
  const policyAnalysis = fallbackPolicyAnalysis(context.request, error);
  const parsedPolicy = toParsedPolicy(policyAnalysis, context.request.policyText);
  const evidenceCards = [fallbackManualEvidence(policyAnalysis, "source_adapter")];
  const stakeholderMap = fallbackStakeholderMap(policyAnalysis, evidenceCards);
  const economicExposure = fallbackEconomicExposure(policyAnalysis, evidenceCards[0]);
  const fraudRiskAssessment = fallbackFraudRiskAssessment(evidenceCards[0]);
  const implementationRisk = assessImplementationRisk(parsedPolicy);
  const sentimentForecast = await buildSentimentForecast(policyAnalysis, evidenceCards);
  const riskScore = calculateRiskScore(
    parsedPolicy,
    sentimentForecast,
    stakeholderMap,
    economicExposure,
    fraudRiskAssessment,
    implementationRisk
  );
  const policyRedesign = await generatePolicyRedesign(
    context.request.policyText,
    policyAnalysis,
    riskScore,
    sentimentForecast,
    economicExposure,
    fraudRiskAssessment,
    stakeholderMap,
    "demo"
  );
  const executiveMemo = await generateExecutiveMemo(
    parsedPolicy,
    sentimentForecast,
    stakeholderMap,
    economicExposure,
    fraudRiskAssessment,
    implementationRisk,
    policyRedesign,
    riskScore,
    "demo"
  );
  const narrativeRisk = assessNarrativeRisk(parsedPolicy, toLegacySentimentGroups(sentimentForecast));
  const impactChainSimulation = await generateImpactChainSimulation({
    policyAnalysis,
    sentimentForecast,
    stakeholderMap,
    economicExposure,
    fraudRiskAssessment,
    evidenceCards,
    simulationHorizon: "90 days",
    mode: "demo"
  });
  const industryRippleEffects = await generateIndustryRippleEffects({
    policyAnalysis,
    stakeholderMap,
    economicExposure,
    evidenceCards,
    mode: "demo"
  });
  const socialDynamicsRisk = await generateSocialDynamicsRisk({
    policyAnalysis,
    sentimentForecast,
    narrativeRisk,
    evidenceCards,
    mode: "demo"
  });
  const financeInsuranceRisk = await generateFinanceInsuranceRisk({
    policyAnalysis,
    economicExposure,
    sentimentForecast,
    fraudRiskAssessment,
    evidenceCards,
    mode: "demo"
  });
  const sourceAudit = auditPolicySources({
    evidenceCards,
    policyAnalysis,
    sentimentForecast,
    narrativeRisk,
    stakeholderMap,
    economicExposure,
    fraudRiskAssessment,
    riskScore,
    policyRedesign,
    impactChainSimulation,
    industryRippleEffects,
    socialDynamicsRisk,
    financeInsuranceRisk
  });
  const enrichedExecutiveMemo = updateExecutiveMemoWithImpactChain({
    memo: executiveMemo,
    impactChainSimulation,
    industryRippleEffects,
    socialDynamicsRisk,
    financeInsuranceRisk,
    stakeholderMap,
    fraudRiskAssessment,
    policyRedesign
  });
  const auditedExecutiveMemo = updateExecutiveMemoWithSourceAudit({
    memo: enrichedExecutiveMemo,
    sourceAudit,
    evidenceCards
  });

  switch (step) {
    case "parsePolicy":
      return policyAnalysis;
    case "buildInitialEvidenceCards":
      return {
        dataNeedsPlan: createDataNeedsPlan(policyAnalysis, context.request.mode),
        evidenceCards,
        warnings: []
      } satisfies InitialEvidenceResult;
    case "createDataNeedsPlan":
      return createDataNeedsPlan(policyAnalysis, context.request.mode);
    case "retrieveEvidence":
      return { evidenceCards, warnings: [] } satisfies EvidenceRetrievalResult;
    case "buildStakeholderEconomicImpact":
      return { stakeholderMap, economicExposure, industryRippleEffects };
    case "buildPublicSentimentNarrativeImpact":
      return {
        sentimentForecast,
        narrativeRisk,
        socialDynamicsRisk,
        legacySentiment: toLegacySentimentGroups(sentimentForecast),
        publicSignalEvidenceCards: [],
        evidenceCards
      };
    case "buildRiskAbuseAssessment":
      return { fraudRiskAssessment, implementationRisk, riskScore };
    case "buildFinanceInsuranceImpact":
      return financeInsuranceRisk;
    case "buildPolicyRedesignMemo":
      return { impactChainSimulation, policyRedesign, executiveMemo };
    case "auditRiskAbuseSources":
      return sourceAudit;
    case "buildSentimentForecast":
      return sentimentForecast;
    case "buildNarrativeRisk":
      return narrativeRisk;
    case "buildStakeholderMap":
      return stakeholderMap;
    case "buildEconomicExposure":
      return economicExposure;
    case "buildFraudRiskAssessment":
      return fraudRiskAssessment;
    case "buildImplementationRisk":
      return implementationRisk;
    case "calculateRiskScore":
      return riskScore;
    case "generatePolicyRedesign":
      return policyRedesign;
    case "generateExecutiveMemo":
      return auditedExecutiveMemo;
    case "generateImpactChainSimulation":
      return impactChainSimulation;
    case "generateIndustryRippleEffects":
      return industryRippleEffects;
    case "generateSocialDynamicsRisk":
      return socialDynamicsRisk;
    case "generateFinanceInsuranceRisk":
      return financeInsuranceRisk;
    case "auditSources":
      return sourceAudit;
    case "updateExecutiveMemoWithImpactChain":
      return enrichedExecutiveMemo;
    case "updateExecutiveMemoWithSourceAudit":
      return auditedExecutiveMemo;
    case "buildLegacyAnalysis":
      return buildLegacyAnalysis({
        context,
        parsedPolicy,
        sentimentForecast,
        stakeholderMap,
        economicExposure,
        fraudRiskAssessment,
        implementationRisk,
        riskScore,
        policyRedesign,
        executiveMemo: auditedExecutiveMemo,
        impactChainSimulation,
        industryRippleEffects,
        socialDynamicsRisk,
        financeInsuranceRisk,
        sourceAudit,
        narrativeRisk
      });
  }
}

function toParsedPolicy(policyAnalysis: ParsedPolicyAnalysis, policyText: string): ParsedPolicy {
  return {
    policyName: policyAnalysis.policy_title,
    jurisdiction: policyAnalysis.jurisdiction,
    likelySponsor: "Policy team",
    policyText,
    objectives: policyAnalysis.benefits,
    mechanisms: policyAnalysis.obligations,
    affectedParties: policyAnalysis.affected_groups,
    complianceTriggers: policyAnalysis.obligations,
    likelyTimeline: policyAnalysis.implementation_timeline,
    assumptions: policyAnalysis.assumptions,
    confidence: policyAnalysis.confidence,
    sources: [sourcePlaceholders.policyText]
  };
}

function buildLegacyAnalysis(input: {
  context: PipelineContext;
  parsedPolicy: ParsedPolicy;
  sentimentForecast: SentimentForecast;
  stakeholderMap: StakeholderIntelligence;
  economicExposure: EconomicExposure;
  fraudRiskAssessment: FraudRiskAssessment;
  implementationRisk: ImplementationRisk;
  riskScore: RiskScore;
  policyRedesign: PolicyRedesign;
  executiveMemo: ExecutiveMemo;
  impactChainSimulation: ImpactChainSimulation;
  industryRippleEffects: IndustryRippleEffects;
  socialDynamicsRisk: SocialDynamicsRisk;
  financeInsuranceRisk: FinanceInsuranceRisk;
  sourceAudit: SourceAuditResult;
  narrativeRisk: NarrativeRisk;
}): UiPolicyAnalysis {
  const legacySentiment = toLegacySentimentGroups(input.sentimentForecast);

  return {
    id: input.context.analysisId,
    generatedAt: input.context.generatedAt,
    analysisMode: input.context.request.mode === "live" ? "live-api" : "mock-fallback",
    policyText: input.context.request.policyText,
    parsedPolicy: input.parsedPolicy,
    peopleSentimentForecast: input.sentimentForecast,
    sentimentForecast: legacySentiment,
    narrativeRisk: input.narrativeRisk,
    stakeholderIntelligence: input.stakeholderMap,
    economicExposure: input.economicExposure,
    fraudAbuseRisk: input.fraudRiskAssessment,
    implementationRisk: input.implementationRisk,
    redesignBrief: input.policyRedesign,
    riskScore: input.riskScore,
    executiveMemo: input.executiveMemo,
    impactChainSimulation: input.impactChainSimulation,
    industryRippleEffects: input.industryRippleEffects,
    socialDynamicsRisk: input.socialDynamicsRisk,
    financeInsuranceRisk: input.financeInsuranceRisk,
    sourceAudit: input.sourceAudit
  };
}

function createPlannedEvidenceCard(
  need: DataNeed,
  policyAnalysis: ParsedPolicyAnalysis,
  mode: AnalyzePolicyMode
): EvidenceCard {
  return createEvidenceCard({
    source_name: need.source_name,
    source_url: sourceRegistryByName[need.source_name].requires_api_key
      ? `configured-source://${sourceRegistryByName[need.source_name].adapter_function_name}`
      : `source-placeholder://${sourceRegistryByName[need.source_name].adapter_function_name}`,
    title: `${need.source_name} ${mode === "demo" ? "mock" : "planned"} evidence`,
    excerpt:
      mode === "demo"
        ? `Mock fallback evidence for ${need.query_focus}`
        : `Planned evidence retrieval for ${need.query_focus}`,
    extracted_claim: `${need.source_name} should be queried for: ${need.query_focus}`,
    geography: policyAnalysis.jurisdiction,
    policy_domain: policyAnalysis.policy_domain,
    confidence: mode === "demo" ? 0.46 : 0.5,
    limitation:
      mode === "demo"
        ? `Demo placeholder: ${need.source_name} was not queried live.`
        : `Adapter placeholder: ${need.source_name} needs source-specific implementation before final claims.`,
    used_by_agents: need.required_for_agents,
    supports: [`data-need:${need.source_name}`],
    contradicts: [],
    raw_metadata: {
      mode,
      status: mode === "demo" ? "mock_fallback" : "planned",
      adapter_function_name: sourceRegistryByName[need.source_name].adapter_function_name,
      missing_data: need.missing_data
    }
  });
}

function createMissingDataEvidenceCard(
  need: DataNeed,
  policyAnalysis: ParsedPolicyAnalysis,
  missingApiKey: string
): EvidenceCard {
  return createEvidenceCard({
    source_name: need.source_name,
    source_url: `missing-api-key://${missingApiKey}`,
    title: `${need.source_name} evidence missing`,
    excerpt: `${need.source_name} was required but ${missingApiKey} is not configured.`,
    extracted_claim: `${need.source_name} data is missing and downstream claims must be labeled as assumptions until retrieved.`,
    geography: policyAnalysis.jurisdiction,
    policy_domain: policyAnalysis.policy_domain,
    confidence: 0.25,
    limitation: `Missing data clearly marked: configure ${missingApiKey} and rerun live mode.`,
    used_by_agents: need.required_for_agents,
    supports: [`missing-data:${need.source_name}`],
    contradicts: [],
    raw_metadata: {
      mode: "live",
      status: "missing_api_key",
      missing_api_key: missingApiKey
    }
  });
}

function createSourceUnavailableEvidenceCard(
  need: DataNeed,
  policyAnalysis: ParsedPolicyAnalysis,
  error: unknown
): EvidenceCard {
  return createEvidenceCard({
    source_name: need.source_name,
    source_url: `source-unavailable://${sourceRegistryByName[need.source_name].adapter_function_name}`,
    title: `${need.source_name} source unavailable`,
    excerpt: `${need.source_name} retrieval failed; analysis continued with a placeholder.`,
    extracted_claim: `${need.source_name} evidence is unavailable for this run and should be treated as missing data.`,
    geography: policyAnalysis.jurisdiction,
    policy_domain: policyAnalysis.policy_domain,
    confidence: 0.22,
    limitation: `Source unavailable: ${errorToMessage(error)}`,
    used_by_agents: need.required_for_agents,
    supports: [`source-unavailable:${need.source_name}`],
    contradicts: [],
    raw_metadata: {
      status: "source_unavailable",
      error: errorToMessage(error)
    }
  });
}

function fallbackPolicyAnalysis(request: AnalyzePolicyRequest, error: unknown): ParsedPolicyAnalysis {
  return {
    policy_title: "Fallback Policy Analysis",
    policy_domain: request.policyCategory || "general public policy",
    jurisdiction: request.jurisdiction || "Unspecified jurisdiction",
    affected_groups: ["affected residents", "regulated entities", "implementing agencies"],
    affected_industries: ["public administration", "regulated industries"],
    affected_companies_query_terms: ["regulated entities", "implementation vendors", request.policyCategory],
    obligations: ["Policy obligations could not be fully parsed; manual review is required."],
    benefits: ["Potential public accountability benefit requires validation."],
    costs: ["Costs are missing and should be validated with source evidence."],
    enforcement_mechanism: "Missing data: enforcement mechanism could not be verified.",
    funding_source: "Missing data: funding source could not be verified.",
    implementation_timeline: "Missing data: implementation timeline could not be verified.",
    economic_pressure_points: ["Missing economic exposure data should be retrieved before final claims."],
    sentiment_triggers: ["Trust, cost, fairness, and implementation uncertainty."],
    legal_ambiguities: ["Parser fallback used; statutory language needs manual review."],
    implementation_bottlenecks: ["Manual review required before implementation readiness claims."],
    possible_fraud_or_abuse_vectors: ["Self-certification abuse", "weak verification", "paper compliance"],
    required_data_sources: [
      {
        source: "Generic web search/manual source",
        query_focus: `Manual review needed because parser failed: ${errorToMessage(error)}`,
        priority: "high"
      },
      {
        source: "Census ACS",
        query_focus: "Population and household exposure fallback profile.",
        priority: "medium"
      },
      {
        source: "BLS",
        query_focus: "Labor-market fallback profile.",
        priority: "medium"
      }
    ],
    confidence: 0.25,
    assumptions: [
      "This is a typed fallback object generated after a pipeline step failed.",
      "Final claims should not be made until the failed step is resolved and evidence is attached."
    ],
    warnings: [`Fallback policy analysis used: ${errorToMessage(error)}`]
  };
}

function fallbackManualEvidence(policyAnalysis: ParsedPolicyAnalysis, agent: AgentName): EvidenceCard {
  return createEvidenceCard({
    source_name: "Generic web search/manual source",
    source_url: "manual://pipeline-fallback",
    title: "Pipeline fallback evidence",
    excerpt: "Fallback evidence card created so downstream claims are labeled with assumptions instead of failing silently.",
    extracted_claim: "The analysis is partial and missing live source evidence.",
    geography: policyAnalysis.jurisdiction,
    policy_domain: policyAnalysis.policy_domain,
    confidence: 0.25,
    limitation: "Fallback only; replace with source evidence before decision support.",
    used_by_agents: [agent],
    supports: ["partial-analysis"],
    contradicts: [],
    raw_metadata: {
      status: "fallback"
    }
  });
}

function fallbackStakeholderMap(
  policyAnalysis: ParsedPolicyAnalysis,
  evidenceCards: EvidenceCard[]
): StakeholderIntelligence {
  return {
    summary: "Stakeholder intelligence is partial because the stakeholder agent failed or source data was unavailable.",
    dataMode: "mock-fallback",
    stakeholders: [],
    stakeholderObjects: [],
    crustDataStatus: {
      enabled: Boolean(process.env.CRUSTDATA_API_KEY),
      usedLiveData: false,
      warnings: ["Stakeholder agent fallback used; CrustData stakeholder intelligence is incomplete."],
      companiesFound: 0,
      peopleFound: 0,
      postsFound: 0
    },
    entities: [],
    assumptions: [
      "No stakeholder claims should be treated as complete until CrustData or manual stakeholder evidence is retrieved."
    ],
    evidenceCards,
    confidence: 0.25,
    sources: [sourcePlaceholders.publicListening],
  };
}

function fallbackEconomicExposure(
  policyAnalysis: ParsedPolicyAnalysis,
  evidenceCard: EvidenceCard
): EconomicExposure {
  return {
    household_exposure: "Missing data: household exposure needs Census ACS and local administrative evidence.",
    business_exposure: "Missing data: business exposure needs employer, vendor, and compliance-cost evidence.",
    labor_market_exposure: "Missing data: labor-market exposure needs BLS or local workforce evidence.",
    industry_exposure: "Missing data: industry exposure needs BEA, BLS, or local business evidence.",
    regional_economic_context: "Missing data: regional economic context unavailable in fallback.",
    cost_of_living_sensitivity: "Missing data: cost-of-living sensitivity unavailable in fallback.",
    equity_sensitivity: "Missing data: equity sensitivity unavailable in fallback.",
    key_indicators: [
      {
        indicator_name: "Fallback missing economic data",
        value: "Missing source data",
        geography: policyAnalysis.jurisdiction,
        source: "Generic web search/manual source",
        evidence_card_id: evidenceCard.id
      }
    ],
    confidence: 0.25,
    limitations: ["Economic exposure is partial and should not be used for final claims without source evidence."],
    assumptions: ["Fallback economic exposure labels missing data explicitly."]
  };
}

function fallbackFraudRiskAssessment(evidenceCard: EvidenceCard): FraudRiskAssessment {
  return {
    overall_fraud_risk: "medium",
    abuse_vectors: [
      {
        name: "Fallback verification gap",
        description: "Fraud and abuse assessment is partial because the agent or source retrieval failed.",
        who_could_exploit: ["unknown actors"],
        warning_signals: ["missing data", "unverified controls"],
        policy_design_cause: "Verification controls have not been validated.",
        mitigation: "Run source retrieval and program-integrity review before launch.",
        confidence: 0.25
      }
    ],
    verification_controls: ["Require manual program-integrity review before relying on this partial assessment."],
    audit_recommendations: ["Audit data completeness after source retrieval is restored."],
    data_needed_for_detection: ["Program, vendor, applicant, and payment data are missing."],
    evidence_card_ids: [evidenceCard.id],
    limitations: ["This fallback is not an allegation and not a final fraud assessment."]
  };
}

function normalizeSourceName(source: string): SourceName {
  const normalized = source.trim().toLowerCase();
  const aliases: Record<string, SourceName> = {
    "gdelt/news": "GDELT",
    "gdelt news": "GDELT",
    treasury: "U.S. Treasury",
    "us treasury": "U.S. Treasury",
    "u.s. treasury": "U.S. Treasury",
    "federal reserve": "Federal Reserve / Cleveland Fed",
    "cleveland fed": "Federal Reserve / Cleveland Fed",
    "federal reserve sources": "Federal Reserve / Cleveland Fed",
    "federal reserve / cleveland fed": "Federal Reserve / Cleveland Fed",
    datagov: "Data.gov",
    "data.gov": "Data.gov",
    epi: "Economic Policy Institute",
    "economic policy institute": "Economic Policy Institute",
    cbpp: "Center on Budget and Policy Priorities",
    "center on budget and policy priorities": "Center on Budget and Policy Priorities",
    brookings: "Brookings Economic Studies",
    "brookings economic studies": "Brookings Economic Studies",
    nber: "NBER",
    imf: "IMF",
    "world bank": "World Bank Policy Research Reports",
    "world bank policy research reports": "World Bank Policy Research Reports",
    "media cloud": "Media Cloud",
    "local news": "Local news",
    "social media": "Social media"
  };

  if (aliases[normalized]) return aliases[normalized];

  if (source in sourceRegistryByName) {
    return source as SourceName;
  }

  return "Generic web search/manual source";
}

function agentsForSource(sourceName: SourceName): AgentName[] {
  if (sourceName === "CrustData") return ["stakeholder_intelligence"];
  if (["Census ACS", "BLS", "BEA", "FRED", "U.S. Treasury", "Federal Reserve / Cleveland Fed", "Data.gov"].includes(sourceName)) {
    return ["economic_exposure", "sentiment_forecast"];
  }
  if (sourceName === "USAspending") return ["fraud_abuse_risk"];
  if (["GDELT", "Media Cloud", "Local news", "Social media"].includes(sourceName)) return ["sentiment_forecast", "narrative_risk"];
  if (sourceName === "Generic web search/manual source") return ["policy_parser", "manual_review"];

  const tier = sourceRegistryByName[sourceName].sourceTrustTier;
  if (tier === "official-policy" || tier === "public-comment") return ["policy_parser", "implementation_risk", "executive_memo"];
  if (tier === "think-tank" || tier === "research-institution" || tier === "peer-reviewed") {
    return ["economic_exposure", "sentiment_forecast", "executive_memo"];
  }
  if (tier === "consulting-methodology") return ["policy_redesign", "executive_memo"];

  return ["sentiment_forecast", "implementation_risk", "executive_memo"];
}

function getMissingApiKey(sourceName: SourceName): string | null {
  const envName = sourceApiKeyEnv[sourceName];
  if (!envName) return null;
  return process.env[envName] ? null : envName;
}

function collectMissingData(plan: DataNeedsPlan, warnings: AnalysisWarning[]): string[] {
  return Array.from(
    new Set([
      ...plan.needs.flatMap((need) => need.missing_data),
      ...warnings.flatMap((warning) => warning.missingData ?? [])
    ])
  );
}

function buildNotice(mode: AnalyzePolicyMode, warnings: AnalysisWarning[]) {
  const warningCount = warnings.filter((warning) => warning.severity !== "info").length;

  if (warningCount > 0) {
    return `Partial ${mode} analysis completed with ${warningCount} warning${warningCount === 1 ? "" : "s"}. Missing data is clearly marked.`;
  }

  return mode === "live"
    ? "Live analysis completed with configured sources and typed fallbacks where adapters are not yet implemented."
    : "Demo analysis completed from typed mock fallback data.";
}

function defaultCrustDataStatus(stakeholderMap: StakeholderIntelligence): CrustDataStatus {
  return {
    enabled: Boolean(process.env.CRUSTDATA_API_KEY),
    usedLiveData: stakeholderMap.dataMode === "live-api",
    warnings:
      stakeholderMap.dataMode === "live-api"
        ? []
        : ["CrustData live data was not used; stakeholder intelligence is mock or fallback data."],
    companiesFound: stakeholderMap.stakeholders.length,
    peopleFound: stakeholderMap.stakeholders.reduce((sum, stakeholder) => sum + stakeholder.relevant_people.length, 0),
    postsFound:
      stakeholderMap.stakeholderObjects?.reduce((sum, stakeholder) => sum + (stakeholder.signals.socialPosts?.length ?? 0), 0) ??
      0
  };
}

function createAnalysisId() {
  return `analysis-${createShortId()}`;
}

function createShortId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function average(values: number[]) {
  if (values.length === 0) return 0.5;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function errorToMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
