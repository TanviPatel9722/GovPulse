import { callOpenAIJson } from "@/lib/llm/openai";
import { MODEL_CONFIG } from "@/lib/llm/modelRouter";
import { IMPACT_CHAIN_AGENT_SYSTEM_PROMPT, buildImpactChainPrompt } from "@/lib/llm/prompts";
import type { LLMMode } from "@/lib/llm/llmTypes";
import type { PolicyAnalysis } from "@/lib/agents/policyParser";
import type { EvidenceCard } from "@/lib/evidence/evidenceCard";
import type {
  EconomicExposure,
  FraudRiskAssessment,
  ImpactChainSimulation,
  SentimentForecast,
  SimulationHorizon,
  StakeholderIntelligence
} from "@/lib/types";

export type GenerateImpactChainSimulationInput = {
  policyAnalysis: PolicyAnalysis;
  sentimentForecast: SentimentForecast;
  stakeholderMap: StakeholderIntelligence;
  economicExposure: EconomicExposure;
  fraudRiskAssessment: FraudRiskAssessment;
  evidenceCards: EvidenceCard[];
  simulationHorizon?: SimulationHorizon;
  mode?: LLMMode;
};

export async function generateImpactChainSimulation(
  input: GenerateImpactChainSimulationInput
): Promise<ImpactChainSimulation> {
  const fallback = buildDemoImpactChainSimulation(input);

  return callOpenAIJson<ImpactChainSimulation>({
    model: MODEL_CONFIG.impactChainAgent,
    systemPrompt: IMPACT_CHAIN_AGENT_SYSTEM_PROMPT,
    userPrompt: buildImpactChainPrompt({
      policyAnalysis: input.policyAnalysis,
      sentimentForecast: input.sentimentForecast,
      stakeholderMap: input.stakeholderMap,
      economicExposure: input.economicExposure,
      fraudRiskAssessment: input.fraudRiskAssessment,
      evidenceCards: input.evidenceCards,
      simulationHorizon: input.simulationHorizon ?? "90 days"
    }),
    schemaName: "ImpactChainSimulation",
    fallback,
    mode: input.mode
  });
}

function buildDemoImpactChainSimulation(input: GenerateImpactChainSimulationInput): ImpactChainSimulation {
  const evidenceIds = getEvidenceIds(input.evidenceCards);
  const horizon = input.simulationHorizon ?? "90 days";
  const policyTitle = input.mode === "demo" ? "National Ban on Single-Use Plastic Bags" : input.policyAnalysis.policy_title;

  return {
    policy_title: policyTitle,
    simulation_horizon: horizon,
    overall_chain_reaction_summary:
      "Scenario forecast: the highest-risk chain is not the environmental intent of the policy, but the transition shock across low-margin retailers, plastic-film manufacturers, low-income households, substitute bag suppliers, and local implementation systems. Effects are directional and evidence-aware; demo values use ranges and assumptions rather than fake precision.",
    impact_chains: [
      {
        chain_id: "chain-manufacturing-demand",
        policy_lever: "Ban lightweight single-use plastic checkout bags",
        first_order_effect: "Plastic film and bag producers lose a retail channel for checkout bags.",
        second_order_effect:
          "Some producers face 10-20% short-term demand contraction for single-use checkout bag lines while exploring retooling options.",
        third_order_effect:
          "Facility slowdowns, labor displacement risk, and pressure to shift toward recycled-content packaging or reusable products.",
        affected_groups: ["manufacturing workers", "regional plastic producers", "local economic development agencies"],
        affected_industries: ["plastic film manufacturing", "packaging", "recycling and reusable packaging"],
        sentiment_trigger: "Job-loss and local employer harm narratives can move faster than environmental benefit narratives.",
        economic_pressure: "Revenue contraction and retooling capital needs for specialized production lines.",
        stakeholder_amplification:
          "Manufacturers, trade associations, and affected local officials may amplify transition-cost concerns.",
        implementation_risk: "Policy backlash rises if transition assistance is announced after layoffs or facility slowdowns.",
        fraud_or_abuse_risk: "Transition grants could create eligibility gaming or inflated retooling invoices if controls are weak.",
        financial_or_insurance_exposure:
          "Business credit and trade-credit stress could increase for small suppliers with concentrated bag revenue.",
        mitigation_option:
          "Transition grants, procurement preference for recycled-content substitutes, technical assistance, and phased compliance windows.",
        confidence: 0.62,
        assumptions: [
          "10-20% is a placeholder-demo estimate for affected checkout-bag product lines, not total company revenue.",
          "Actual exposure requires producer revenue mix, facility geography, and customer concentration evidence."
        ],
        evidence_card_ids: evidenceIds
      },
      {
        chain_id: "chain-substitute-demand",
        policy_lever: "Allow reusable, paper, compostable, or thicker substitute bags",
        first_order_effect: "Substitute bag suppliers see demand spike from retailers seeking compliant alternatives.",
        second_order_effect:
          "Short-term supply constraints can raise unit costs and uneven availability, especially for smaller retailers.",
        third_order_effect:
          "Retailers may pass some costs to shoppers or reduce bag availability, feeding affordability complaints.",
        affected_groups: ["small retailers", "low-income households", "substitute bag suppliers"],
        affected_industries: ["paper packaging", "reusable bag supply", "retail operations", "logistics"],
        sentiment_trigger: "Perceived checkout inconvenience and new bag costs can turn a low-salience policy into a daily irritation.",
        economic_pressure: "Short-term substitute bag price pressure and procurement uncertainty.",
        stakeholder_amplification: "Retail associations and local store operators can amplify operational burden concerns.",
        implementation_risk: "Uneven substitute availability creates compliance confusion and enforcement discretion risk.",
        fraud_or_abuse_risk: "False reusable or compostable labeling can become a compliance loophole.",
        financial_or_insurance_exposure: "Procurement risk rises if public agencies or retailers rush substitute sourcing.",
        mitigation_option:
          "Bulk-purchasing cooperatives, verified product standards, small-retailer starter kits, and public stock monitoring.",
        confidence: 0.66,
        assumptions: [
          "Demand spike is a scenario assumption based on substitution logic, not a measured forecast.",
          "Magnitude depends on exemptions, phase-in timing, and consumer bag-reuse behavior."
        ],
        evidence_card_ids: evidenceIds
      },
      {
        chain_id: "chain-household-cost",
        policy_lever: "Shift shoppers from free single-use bags toward reusable or paid alternatives",
        first_order_effect: "Some households experience small but visible point-of-sale costs or convenience loss.",
        second_order_effect:
          "Low-income households and transit-dependent shoppers are more sensitive to forgotten bags, replacement costs, and carrying burden.",
        third_order_effect:
          "Opposition narratives can frame the policy as a regressive nuisance if mitigation is not visible.",
        affected_groups: ["low-income households", "transit riders", "seniors", "large families"],
        affected_industries: ["retail", "grocery", "public assistance programs"],
        sentiment_trigger: "Cost-of-living sensitivity and fairness concerns.",
        economic_pressure: "Repeated small costs can matter politically when households already feel price pressure.",
        stakeholder_amplification:
          "Community groups, local media, and small retailers may amplify stories about burden or inconsistent exemptions.",
        implementation_risk: "Backlash rises if free reusable distribution is not in place before enforcement.",
        fraud_or_abuse_risk: "Voucher or free-bag distribution can be gamed if identity and inventory controls are absent.",
        financial_or_insurance_exposure: "Public budget exposure is limited but real if mitigation requires reusable-bag procurement.",
        mitigation_option:
          "Free reusable bag distribution through SNAP/WIC partners, libraries, transit hubs, and community organizations.",
        confidence: 0.68,
        assumptions: [
          "Cost burden is modeled as sentiment sensitivity, not a precise household budget forecast.",
          "Representative listening is needed before treating this as measured public sentiment."
        ],
        evidence_card_ids: evidenceIds
      },
      {
        chain_id: "chain-narrative-contagion",
        policy_lever: "Visible consumer-facing ban with simple opposition narrative",
        first_order_effect: "Supporters frame the policy as waste reduction; opponents frame it as cost, inconvenience, and government overreach.",
        second_order_effect:
          "Online examples of bag shortages, fees, or enforcement disputes can travel faster than source-backed implementation facts.",
        third_order_effect:
          "Public backlash or protest risk rises if government materials do not distinguish exemptions, phase-in dates, and mitigation.",
        affected_groups: ["general shoppers", "small business owners", "environmental advocates", "local officials"],
        affected_industries: ["retail", "public affairs", "local government operations"],
        sentiment_trigger: "Everyday friction plus misinformation about costs, exemptions, and enforcement.",
        economic_pressure: "Low-dollar costs can create high-emotion narratives when tied to inflation or small business strain.",
        stakeholder_amplification: "Retail groups, environmental groups, and viral local stories can pull the narrative in opposite directions.",
        implementation_risk: "Inconsistent enforcement can become the symbol of policy competence.",
        fraud_or_abuse_risk: "Mislabeling noncompliant bags as reusable can undermine trust.",
        financial_or_insurance_exposure: "Weak direct market risk; stronger public affairs and litigation/compliance exposure.",
        mitigation_option:
          "Plain-language dashboard, enforcement grace period, verified bag labels, retailer training, and rapid rumor response.",
        confidence: 0.64,
        assumptions: [
          "Online sentiment is treated as amplification risk, not representative public opinion.",
          "Backlash risk depends on implementation quality and visible household mitigation."
        ],
        evidence_card_ids: evidenceIds
      }
    ],
    highest_risk_chain: "chain-household-cost",
    fastest_moving_chain: "chain-narrative-contagion",
    most_mitigatable_chain: "chain-substitute-demand",
    warnings: [
      "Demo chain simulation uses scenario assumptions and placeholder-demo estimates unless evidence cards are source-backed.",
      "Do not treat chain IDs as predictions; they are causal pathways for policy pre-mortem planning."
    ]
  };
}

function getEvidenceIds(evidenceCards: EvidenceCard[]) {
  return evidenceCards.length > 0 ? evidenceCards.slice(0, 8).map((card) => card.id) : ["assumption-labeled"];
}
