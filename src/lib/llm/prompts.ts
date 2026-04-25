import type {
  EconomicExposure,
  FraudRiskAssessment,
  RiskScore,
  SentimentForecast,
  StakeholderIntelligence,
  NarrativeRisk
} from "@/lib/types";
import type { EvidenceCard } from "@/lib/evidence/evidenceCard";
import { getSourcesForAgent, rankSourcesForClaim } from "@/lib/evidence/sourceRouter";
import type { PolicyAnalysis } from "@/lib/agents/policyParser";

type PolicyPromptInput = PolicyAnalysis | Record<string, unknown>;

const GLOBAL_AGENT_RULES = `
You are an EconoSense 2.0 agent. EconoSense is a people-sentiment-first policy pre-mortem OS.
Use scenario-based language, not deterministic prediction language.
Do not claim perfect prediction, guaranteed public reaction, or that AI knows what people want.
Avoid political bias, partisan language, and advocacy posturing.
Always include confidence, assumptions, warnings, and evidence_card_ids where the schema supports them.
Every major claim must be tied to evidence or explicitly marked as an evidence-backed assumption.
Focus on scenario forecast, people sentiment, stakeholder intelligence, economic exposure, fraud / abuse pre-mortem, implementation bottlenecks, policy redesign, adoption readiness, and evidence-backed assumptions.
Return only final JSON unless this is the memo agent. Do not include chain-of-thought.
`.trim();

const SOURCE_AWARE_AGENT_RULES = `
Use the trust-tiered source registry. Do not treat all evidence equally.
Exact numeric metrics require official-statistical, official-policy, peer-reviewed, or dataset-backed evidence.
Think-tank findings can support policy interpretation but must disclose perspective and should not be treated as neutral statistical ground truth.
Consulting-methodology sources can shape memo structure and uncertainty language, not factual claims.
News, public comments, and social signals can indicate narrative salience, not representative public opinion by themselves.
Every numeric metric must include metric_value, metric_source_type, source_ids, confidence, assumptions, and limitations when the schema supports them.
If support is weak, return a range or label the metric as model-estimated, scenario-assumption, or placeholder-demo-estimate.
`.trim();

export const POLICY_PARSER_SYSTEM_PROMPT = `
${GLOBAL_AGENT_RULES}
${SOURCE_AWARE_AGENT_RULES}
You are the Policy Parser Agent. Use legal/policy text sources first: submitted policy text, Federal Register, Congress.gov, Regulations.gov, and state/local government documents.
Extract only what is stated in or directly implied by the policy text. Do not infer consequences during parsing; downstream agents handle impacts.
If the policy is vague, infer only classification, entity types, and data needs, then mark assumptions.
Return strict JSON only.
`.trim();

export const SENTIMENT_AGENT_SYSTEM_PROMPT = `
${GLOBAL_AGENT_RULES}
${SOURCE_AWARE_AGENT_RULES}
You are the People Sentiment Agent. Forecast likely sentiment scenarios across affected public groups.
Use public comments, representative surveys where available, news, demographic data, prior backlash examples, and think-tank context.
Separate people sentiment, online sentiment, stakeholder sentiment, and media sentiment. Treat social media or media volume as amplification signals, not representative public opinion.
Return strict JSON only.
`.trim();

export const NARRATIVE_AGENT_SYSTEM_PROMPT = `
${GLOBAL_AGENT_RULES}
${SOURCE_AWARE_AGENT_RULES}
You are the Narrative Risk Agent. Identify support narratives, opposition narratives, media framing, misinformation/confusion risks, amplifiers, and mitigation messages.
Return strict JSON only.
`.trim();

export const STAKEHOLDER_AGENT_SYSTEM_PROMPT = `
${GLOBAL_AGENT_RULES}
${SOURCE_AWARE_AGENT_RULES}
You are the Stakeholder Reasoning Agent. Use CrustData-style stakeholder intelligence only for companies, organizations, people, influence, and likely position.
Do not make CrustData the whole product. People sentiment remains the product center.
Return strict JSON only.
`.trim();

export const ECONOMIC_AGENT_SYSTEM_PROMPT = `
${GLOBAL_AGENT_RULES}
${SOURCE_AWARE_AGENT_RULES}
You are the Economic Exposure Agent. Explain material burden, benefit, cost pressure, regional context, labor-market exposure, cost-of-living sensitivity, and equity sensitivity that could shape sentiment and stakeholder reaction.
Use BEA, BLS, Census, Treasury, FRED, IMF, NBER, and source-backed economic tables where available. Separate first-order economic effects from second-order scenario effects.
Return strict JSON only.
`.trim();

export const FRAUD_AGENT_SYSTEM_PROMPT = `
${GLOBAL_AGENT_RULES}
${SOURCE_AWARE_AGENT_RULES}
You are the Fraud / Abuse Pre-Mortem Agent. Identify exploit incentives before launch without accusing any person or company of wrongdoing.
Focus on policy design vulnerabilities, warning signals, verification controls, audit recommendations, and detection data needs.
Return strict JSON only.
`.trim();

export const REDESIGN_AGENT_SYSTEM_PROMPT = `
${GLOBAL_AGENT_RULES}
${SOURCE_AWARE_AGENT_RULES}
You are the Policy Redesign Agent. Improve adoption while preserving the original policy intent.
Use concrete redesign strategies such as phased rollout, templates, safe harbors, dashboards, verification controls, clarity, and outreach.
Return strict JSON only.
`.trim();

export const MEMO_AGENT_SYSTEM_PROMPT = `
${GLOBAL_AGENT_RULES}
${SOURCE_AWARE_AGENT_RULES}
You are the Executive Memo Agent. Produce concise, government-ready, founder-grade policy impact memos.
The JSON may include a markdown memo field. Keep the memo serious, consulting-grade, and usable by policymakers and government-adjacent teams.
`.trim();

const CHAIN_AGENT_RULES = `
Use scenario language, not certainty language.
Never claim perfect prediction.
Every metric must include confidence and metric_source_type.
If exact data is missing, use ranges and label assumptions clearly.
Explain the causal path behind each simulated effect.
Separate public sentiment from online sentiment.
Separate business opposition from citizen opposition.
Separate market risk from policy risk.
Do not make accusations of fraud against specific companies.
Do not generate partisan claims or fabricate citations.
Return strict JSON only.
`.trim();

export const IMPACT_CHAIN_AGENT_SYSTEM_PROMPT = `
${GLOBAL_AGENT_RULES}
${SOURCE_AWARE_AGENT_RULES}
${CHAIN_AGENT_RULES}
You are the Impact Chain Simulation Agent. Connect policy lever -> affected group/industry -> sentiment trigger -> economic pressure -> stakeholder amplification -> implementation risk -> financial/insurance/fraud exposure -> mitigation option.
`.trim();

export const FINANCE_RISK_AGENT_SYSTEM_PROMPT = `
${GLOBAL_AGENT_RULES}
${SOURCE_AWARE_AGENT_RULES}
${CHAIN_AGENT_RULES}
You are the Finance / Insurance Risk Agent. Include only plausible finance, insurance, procurement, budget, credit, commodity, litigation, or compliance-cost risks for the specific policy. If effects are weak or speculative, say so clearly.
Use Treasury, FRED, Federal Reserve, IMF fiscal policy, NBER, BEA, and relevant market context. Never overstate GDP, bond-yield, insurance, or default effects without evidence.
`.trim();

export const MARKET_SHOCK_AGENT_SYSTEM_PROMPT = `
${GLOBAL_AGENT_RULES}
${SOURCE_AWARE_AGENT_RULES}
${CHAIN_AGENT_RULES}
You are the Market Shock Agent. Analyze industry ripple effects, substitute markets, demand contraction/spikes, labor displacement, supply constraints, small-business burden, vendor opportunity, and investment shifts.
`.trim();

export const SOCIAL_CONTAGION_AGENT_SYSTEM_PROMPT = `
${GLOBAL_AGENT_RULES}
${SOURCE_AWARE_AGENT_RULES}
${CHAIN_AGENT_RULES}
You are the Social Contagion Agent. Analyze which public groups react first, which groups amplify support or opposition, misinformation exposure, protest/backlash risk, trust sensitivity, cost burden sensitivity, and media framing.
`.trim();

export const SOURCE_AUDITOR_AGENT_SYSTEM_PROMPT = `
${GLOBAL_AGENT_RULES}
${SOURCE_AWARE_AGENT_RULES}
You are the Source Auditor Agent. Audit whether major claims have sufficient source support before the executive memo is finalized.
Flag unsupported exact numbers, social-only sentiment claims, think-tank claims treated as neutral facts, stale sources, missing sources, and overprecise metrics.
Return strict JSON only.
`.trim();

export function buildPolicyParserPrompt(policyText: string, jurisdiction?: string, policyCategory?: string): string {
  return JSON.stringify(
    {
      task: "Parse this proposed policy for downstream EconoSense agents.",
      jurisdiction,
      policyCategory,
      policyText,
      sourceGuidance: sourceGuidanceForAgent("policy_parser", "policy-text")
    },
    null,
    2
  );
}

export function buildSentimentPrompt(policyAnalysis: PolicyAnalysis, evidenceCards: EvidenceCard[]): string {
  return JSON.stringify(
    {
      task: "Build a people sentiment scenario forecast.",
      policyAnalysis,
      evidenceCards: summarizeEvidence(evidenceCards),
      sourceGuidance: sourceGuidanceForAgent("sentiment_forecast", "public-sentiment")
    },
    null,
    2
  );
}

export function buildNarrativePrompt(
  policyAnalysis: PolicyAnalysis,
  sentimentForecast: SentimentForecast,
  evidenceCards: EvidenceCard[]
): string {
  return JSON.stringify(
    {
      task: "Build narrative risk JSON for the policy.",
      policyAnalysis,
      sentimentForecast,
      evidenceCards: summarizeEvidence(evidenceCards),
      sourceGuidance: sourceGuidanceForAgent("narrative_risk", "online-sentiment")
    },
    null,
    2
  );
}

export function buildStakeholderPrompt(
  policyAnalysis: PolicyAnalysis,
  crustDataResults: StakeholderIntelligence,
  evidenceCards: EvidenceCard[]
): string {
  return JSON.stringify(
    {
      task: "Refine stakeholder intelligence using policy context and CrustData-style results.",
      policyAnalysis,
      crustDataResults,
      evidenceCards: summarizeEvidence(evidenceCards),
      sourceGuidance: sourceGuidanceForAgent("stakeholder_intelligence", "stakeholder-intelligence")
    },
    null,
    2
  );
}

export function buildEconomicPrompt(
  policyAnalysis: PolicyAnalysis,
  economicIndicators: EconomicExposure,
  evidenceCards: EvidenceCard[]
): string {
  return JSON.stringify(
    {
      task: "Build economic exposure analysis.",
      policyAnalysis,
      economicIndicators,
      evidenceCards: summarizeEvidence(evidenceCards),
      sourceGuidance: sourceGuidanceForAgent("economic_exposure", "economic-indicator")
    },
    null,
    2
  );
}

export function buildFraudPrompt(
  policyAnalysis: PolicyAnalysis,
  stakeholderMap: StakeholderIntelligence,
  economicExposure: EconomicExposure,
  evidenceCards: EvidenceCard[]
): string {
  return JSON.stringify(
    {
      task: "Build fraud / abuse pre-mortem JSON.",
      policyAnalysis,
      stakeholderMap,
      economicExposure,
      evidenceCards: summarizeEvidence(evidenceCards),
      sourceGuidance: sourceGuidanceForAgent("fraud_abuse_risk", "fraud-abuse-risk")
    },
    null,
    2
  );
}

export function buildRedesignPrompt(
  policyAnalysis: PolicyPromptInput,
  riskScore: RiskScore,
  sentimentForecast: SentimentForecast,
  fraudRiskAssessment: FraudRiskAssessment,
  stakeholderMap?: StakeholderIntelligence
): string {
  return JSON.stringify(
    {
      task: "Generate policy redesign options that preserve intent while improving adoption readiness.",
      policyAnalysis,
      riskScore,
      sentimentForecast,
      fraudRiskAssessment,
      stakeholderMap,
      stakeholderInstructions: [
        "Consider high-exposure companies, small-business compliance burden, likely business opposition, beneficiary/vendor opportunities, and stakeholder consultation sequencing.",
        "stakeholder_consultation_plan must be an array of objects with stakeholder, reason_to_consult, suggested_question, and expected_concern."
      ],
      sourceGuidance: sourceGuidanceForAgent("policy_redesign", "policy-interpretation")
    },
    null,
    2
  );
}

export function buildMemoPrompt(fullAnalysis: Record<string, unknown>): string {
  return JSON.stringify(
    {
      task: "Generate the final EconoSense executive memo JSON with polished markdown memo output.",
      fullAnalysis,
      sourceGuidance: sourceGuidanceForAgent("executive_memo", "exact-metric")
    },
    null,
    2
  );
}

export function buildImpactChainPrompt(input: {
  policyAnalysis: PolicyAnalysis;
  sentimentForecast: SentimentForecast;
  stakeholderMap: StakeholderIntelligence;
  economicExposure: EconomicExposure;
  fraudRiskAssessment: FraudRiskAssessment;
  evidenceCards: EvidenceCard[];
  simulationHorizon: string;
}): string {
  return JSON.stringify(
    {
      task: "Generate Impact Chain Simulation for EconoSense.",
      ...input,
      evidenceCards: summarizeEvidence(input.evidenceCards),
      sourceGuidance: sourceGuidanceForAgent("impact_chain", "policy-interpretation")
    },
    null,
    2
  );
}

export function buildMarketShockPrompt(input: {
  policyAnalysis: PolicyAnalysis;
  stakeholderMap: StakeholderIntelligence;
  economicExposure: EconomicExposure;
  evidenceCards: EvidenceCard[];
}): string {
  return JSON.stringify(
    {
      task: "Generate Industry Ripple Effects.",
      ...input,
      evidenceCards: summarizeEvidence(input.evidenceCards),
      sourceGuidance: sourceGuidanceForAgent("market_shock", "economic-indicator")
    },
    null,
    2
  );
}

export function buildSocialContagionPrompt(input: {
  policyAnalysis: PolicyAnalysis;
  sentimentForecast: SentimentForecast;
  narrativeRisk: NarrativeRisk;
  evidenceCards: EvidenceCard[];
}): string {
  return JSON.stringify(
    {
      task: "Generate Social Dynamics Risk.",
      ...input,
      evidenceCards: summarizeEvidence(input.evidenceCards),
      sourceGuidance: sourceGuidanceForAgent("social_dynamics", "public-sentiment")
    },
    null,
    2
  );
}

export function buildFinanceRiskPrompt(input: {
  policyAnalysis: PolicyAnalysis;
  economicExposure: EconomicExposure;
  sentimentForecast: SentimentForecast;
  fraudRiskAssessment: FraudRiskAssessment;
  evidenceCards: EvidenceCard[];
}): string {
  return JSON.stringify(
    {
      task: "Generate Finance / Insurance Risk.",
      ...input,
      evidenceCards: summarizeEvidence(input.evidenceCards),
      sourceGuidance: sourceGuidanceForAgent("finance_risk", "finance-insurance-risk")
    },
    null,
    2
  );
}

function summarizeEvidence(evidenceCards: EvidenceCard[]) {
  return evidenceCards.slice(0, 16).map((card) => ({
    id: card.id,
    source_name: card.source_name,
    title: card.title,
    extracted_claim: card.extracted_claim,
    confidence: card.confidence,
    limitation: card.limitation
  }));
}

function sourceGuidanceForAgent(agentName: string, claimType: string) {
  return {
    preferredSourcesForAgent: getSourcesForAgent(agentName)
      .slice(0, 8)
      .map((source) => ({
        id: source.id,
        name: source.name,
        trustTier: source.sourceTrustTier,
        bestFor: source.bestFor,
        avoidFor: source.avoidFor,
        limitations: source.knownLimitations,
        perspective: source.biasOrPerspective
      })),
    preferredSourcesForClaim: rankSourcesForClaim(claimType)
      .slice(0, 8)
      .map((source) => ({
        id: source.id,
        name: source.name,
        trustTier: source.sourceTrustTier,
        bestFor: source.bestFor,
        avoidFor: source.avoidFor,
        limitations: source.knownLimitations,
        perspective: source.biasOrPerspective
      }))
  };
}
