import type { JsonSchema } from "@/lib/llm/llmTypes";

const stringArray = {
  type: "array",
  items: { type: "string" }
} as const;

const numberZeroOneHundred = {
  type: "number",
  minimum: 0,
  maximum: 100
} as const;

const confidence = {
  type: "number",
  minimum: 0,
  maximum: 1
} as const;

export const JSON_SCHEMAS = {
  PolicyAnalysis: {
    type: "object",
    additionalProperties: false,
    required: [
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
    ],
    properties: {
      policy_title: { type: "string" },
      policy_domain: { type: "string" },
      jurisdiction: { type: "string" },
      affected_groups: stringArray,
      affected_industries: stringArray,
      affected_companies_query_terms: stringArray,
      obligations: stringArray,
      benefits: stringArray,
      costs: stringArray,
      enforcement_mechanism: { type: "string" },
      funding_source: { type: "string" },
      implementation_timeline: { type: "string" },
      economic_pressure_points: stringArray,
      sentiment_triggers: stringArray,
      legal_ambiguities: stringArray,
      implementation_bottlenecks: stringArray,
      possible_fraud_or_abuse_vectors: stringArray,
      required_data_sources: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["source", "query_focus", "priority"],
          properties: {
            source: { type: "string" },
            query_focus: { type: "string" },
            priority: { type: "string", enum: ["high", "medium", "low"] }
          }
        }
      },
      confidence,
      assumptions: stringArray,
      warnings: stringArray
    }
  },
  SentimentForecast: objectSchema([
    "overall_sentiment_summary",
    "public_groups",
    "support_narratives",
    "opposition_narratives",
    "misinformation_or_confusion_risks",
    "media_framing_risks",
    "validation_questions",
    "confidence",
    "assumptions",
    "warnings"
  ]),
  NarrativeRisk: objectSchema(["overallLevel", "likelyScenario", "frames", "assumptions", "confidence", "warnings"]),
  StakeholderMap: objectSchema([
    "summary",
    "dataMode",
    "stakeholders",
    "assumptions",
    "evidence_card_ids",
    "confidence",
    "warnings"
  ]),
  EconomicExposure: objectSchema([
    "household_exposure",
    "business_exposure",
    "labor_market_exposure",
    "industry_exposure",
    "regional_economic_context",
    "cost_of_living_sensitivity",
    "equity_sensitivity",
    "key_indicators",
    "confidence",
    "limitations",
    "assumptions",
    "warnings"
  ]),
  FraudRiskAssessment: objectSchema([
    "overall_fraud_risk",
    "abuse_vectors",
    "verification_controls",
    "audit_recommendations",
    "data_needed_for_detection",
    "evidence_card_ids",
    "limitations",
    "confidence",
    "assumptions",
    "warnings"
  ]),
  RiskScore: objectSchema([
    "public_reaction_risk",
    "business_opposition_risk",
    "economic_exposure_risk",
    "implementation_complexity_risk",
    "fraud_abuse_risk",
    "legal_ambiguity_risk",
    "misinformation_risk",
    "mitigation_readiness",
    "overall_policy_risk",
    "adoption_readiness",
    "explanation",
    "top_risk_drivers",
    "confidence",
    "assumptions",
    "warnings"
  ]),
  PolicyRedesign: objectSchema([
    "original_policy_risk_summary",
    "redesign_options",
    "recommended_redesign",
    "before_after_scores",
    "communication_strategy",
    "stakeholder_consultation_plan",
    "validation_questions",
    "confidence",
    "assumptions",
    "warnings"
  ]),
  ExecutiveMemo: objectSchema([
    "title",
    "recommendation",
    "confidence",
    "structured_json",
    "markdown_memo",
    "export_text",
    "evidence_card_ids",
    "assumptions",
    "warnings"
  ]),
  ImpactChainSimulation: objectSchema([
    "policy_title",
    "simulation_horizon",
    "overall_chain_reaction_summary",
    "impact_chains",
    "highest_risk_chain",
    "fastest_moving_chain",
    "most_mitigatable_chain",
    "warnings"
  ]),
  IndustryRippleEffects: objectSchema(["industries", "warnings"]),
  SocialDynamicsRisk: objectSchema(["groups", "warnings"]),
  FinanceInsuranceRisk: objectSchema(["risk_categories", "warnings"]),
  SourceAuditResult: objectSchema([
    "unsupported_claims",
    "overprecise_metrics",
    "social_only_claims",
    "missing_sources",
    "recommended_downgrades",
    "final_confidence_adjustments"
  ])
} as const satisfies Record<string, JsonSchema>;

export function getJsonSchema(schemaName: string): JsonSchema | undefined {
  return JSON_SCHEMAS[schemaName as keyof typeof JSON_SCHEMAS];
}

export function getRequiredFields(schemaName: string): readonly string[] {
  return getJsonSchema(schemaName)?.required ?? [];
}

function objectSchema(required: string[]): JsonSchema {
  return {
    type: "object",
    additionalProperties: false,
    required,
    properties: Object.fromEntries(
      required.map((field) => {
        if (field === "confidence") return [field, confidence];
        if (field === "warnings" || field === "assumptions" || field === "evidence_card_ids") {
          return [field, stringArray];
        }
        if (field.endsWith("_risk") || field.endsWith("_readiness")) {
          return [field, riskObjectSchema()];
        }
        if (field.includes("score")) return [field, numberZeroOneHundred];
        return [field, {}];
      })
    )
  };
}

function riskObjectSchema(): JsonSchema {
  return {
    type: "object",
    additionalProperties: false,
    required: ["score", "band", "why"],
    properties: {
      score: numberZeroOneHundred,
      band: { type: "string" },
      why: stringArray
    }
  };
}
