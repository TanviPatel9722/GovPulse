import type { EvidenceCard } from "@/lib/evidence/evidenceCard";
import type { CrustDataStatus, Stakeholder } from "@/lib/types/stakeholders";

export const DEMO_POLICY_TEXT =
  "Washington, DC is considering an AI hiring transparency rule requiring employers using automated hiring tools to disclose AI use to job applicants, conduct annual third-party bias audits, retain audit records for three years, and provide applicants with a clear appeal pathway when an automated system materially affects a hiring decision. The rule applies to employers with 25 or more employees operating in DC, staffing agencies, and vendors that provide automated resume screening, interview scoring, candidate ranking, or background-check prioritization tools. Covered employers must publish a plain-language notice before applications are submitted, explain what data is used, and allow applicants to request human review within 15 business days after an adverse decision. The Office of Human Rights would enforce the rule through complaints, random compliance checks, corrective action plans, and civil penalties after a 12-month grace period.";

export type Confidence = number;

export type SourceType =
  | "policy-text"
  | "public-comment-placeholder"
  | "administrative-data-placeholder"
  | "crustdata-placeholder"
  | "market-intelligence-placeholder"
  | "expert-assumption"
  | "implementation-benchmark";

export type RiskLevel = "Low" | "Moderate" | "Elevated" | "High";

export type MetricSourceType =
  | "source-backed"
  | "model-estimated"
  | "scenario-assumption"
  | "placeholder-demo-estimate";

export type SimulationHorizon = "30 days" | "90 days" | "12 months" | "custom";

export interface EvidenceSource {
  id: string;
  label: string;
  type: SourceType;
  detail: string;
  confidence: Confidence;
  url?: string;
}

export interface ParsedPolicy {
  policyName: string;
  jurisdiction: string;
  likelySponsor: string;
  policyText: string;
  objectives: string[];
  mechanisms: string[];
  affectedParties: string[];
  complianceTriggers: string[];
  likelyTimeline: string;
  assumptions: string[];
  confidence: Confidence;
  sources: EvidenceSource[];
}

export interface SentimentGroupForecast {
  group: string;
  segment: "citizen" | "employer" | "worker" | "vendor" | "advocacy" | "agency";
  likelyScenario: string;
  supportScore: number;
  concernScore: number;
  adoptionReadiness: number;
  primaryDrivers: string[];
  riskSignals: string[];
  assumptions: string[];
  confidence: Confidence;
  sources: EvidenceSource[];
}

export type PublicSentimentLabel = "positive" | "mixed" | "negative" | "uncertain";

export interface PublicSentimentGroup {
  group_name: string;
  likely_sentiment: PublicSentimentLabel;
  sentiment_score: number;
  support_drivers: string[];
  opposition_drivers: string[];
  emotional_triggers: string[];
  economic_triggers: string[];
  fairness_concerns: string[];
  trust_concerns: string[];
  likely_quotes: string[];
  confidence: Confidence;
  assumptions: string[];
  evidence_card_ids: string[];
}

export interface SentimentForecast {
  overall_sentiment_summary: string;
  public_groups: PublicSentimentGroup[];
  support_narratives: string[];
  opposition_narratives: string[];
  misinformation_or_confusion_risks: string[];
  media_framing_risks: string[];
  validation_questions: string[];
}

export interface NarrativeFrame {
  frame: string;
  riskSignal: string;
  likelyAmplifiers: string[];
  mitigationMessage: string;
  confidence: Confidence;
  sources: EvidenceSource[];
}

export interface NarrativeRisk {
  overallLevel: RiskLevel;
  likelyScenario: string;
  frames: NarrativeFrame[];
  assumptions: string[];
  confidence: Confidence;
  sources: EvidenceSource[];
}

export interface StakeholderEntity {
  name: string;
  type: "company" | "agency" | "advocacy" | "trade-group" | "labor";
  sector: string;
  likelyRole: string;
  estimatedDcExposure: string;
  influenceScore: number;
  adoptionReadiness: number;
  likelyPosition: "Supportive" | "Conditional" | "Concerned" | "Opposed";
  riskSignal: string;
  nextBestAction: string;
  confidence: Confidence;
  sources: EvidenceSource[];
}

export type StakeholderType =
  | "hr_tech_vendor"
  | "recruiting_platform"
  | "enterprise_employer"
  | "compliance_consultant"
  | "chamber_of_commerce"
  | "civil_rights_organization"
  | "worker_advocacy_group"
  | "government_agency"
  | "trade_group"
  | "other";

export type StakeholderPosition = "Supportive" | "Conditional" | "Concerned" | "Opposed";

export type StakeholderInfluenceLevel = "Low" | "Medium" | "High" | "Very High";

export interface RelevantPerson {
  name: string;
  title: string;
  company: string;
  location?: string;
  public_profile_url?: string;
  relevance: string;
  confidence: Confidence;
}

export interface StakeholderProfile {
  company_or_org_name: string;
  stakeholder_type: StakeholderType;
  industry: string;
  location: string;
  size_signal: string;
  growth_signal: string;
  likely_position: StakeholderPosition;
  influence_level: StakeholderInfluenceLevel;
  reason_affected: string;
  relevant_people: RelevantPerson[];
  evidence_cards: EvidenceCard[];
  confidence: Confidence;
}

export interface StakeholderIntelligence {
  summary: string;
  dataMode: "mock-fallback" | "live-api";
  stakeholders: StakeholderProfile[];
  stakeholderObjects?: Stakeholder[];
  crustDataStatus?: CrustDataStatus;
  entities: StakeholderEntity[];
  assumptions: string[];
  evidenceCards: EvidenceCard[];
  confidence: Confidence;
  sources: EvidenceSource[];
}

export interface EconomicIndicator {
  indicator_name: string;
  value: string;
  geography: string;
  source: string;
  evidence_card_id: string;
}

export interface EconomicExposure {
  household_exposure: string;
  business_exposure: string;
  labor_market_exposure: string;
  industry_exposure: string;
  regional_economic_context: string;
  cost_of_living_sensitivity: string;
  equity_sensitivity: string;
  key_indicators: EconomicIndicator[];
  confidence: Confidence;
  limitations: string[];
  assumptions: string[];
}

export interface FraudVector {
  vector: string;
  riskLevel: RiskLevel;
  likelyScenario: string;
  controls: string[];
  confidence: Confidence;
  sources: EvidenceSource[];
}

export type FraudRiskLevel = "low" | "medium" | "high";

export interface AbuseVector {
  name: string;
  description: string;
  who_could_exploit: string[];
  warning_signals: string[];
  policy_design_cause: string;
  mitigation: string;
  confidence: Confidence;
}

export interface FraudRiskAssessment {
  overall_fraud_risk: FraudRiskLevel;
  abuse_vectors: AbuseVector[];
  verification_controls: string[];
  audit_recommendations: string[];
  data_needed_for_detection: string[];
  evidence_card_ids: string[];
  limitations: string[];
}

export interface ImplementationBottleneck {
  bottleneck: string;
  riskLevel: RiskLevel;
  owner: string;
  likelyScenario: string;
  mitigation: string;
  confidence: Confidence;
  sources: EvidenceSource[];
}

export interface ImplementationRisk {
  overallLevel: RiskLevel;
  bottlenecks: ImplementationBottleneck[];
  assumptions: string[];
  confidence: Confidence;
  sources: EvidenceSource[];
}

export interface PolicyRecommendation {
  title: string;
  redesign: string;
  expectedImpact: string;
  adoptionReadinessDelta: number;
  riskReductionDelta: number;
  confidence: Confidence;
  sources: EvidenceSource[];
}

export interface PolicyRedesignBrief {
  priorityRecommendation: string;
  recommendations: PolicyRecommendation[];
  assumptions: string[];
  confidence: Confidence;
  sources: EvidenceSource[];
}

export interface PolicyRedesignOption {
  option_title: string;
  policy_change: string;
  why_it_helps: string;
  tradeoffs: string[];
  expected_risk_change: string;
  affected_groups_helped: string[];
  new_risks_created: string[];
  implementation_steps: string[];
  confidence: Confidence;
}

export interface StakeholderConsultationPlanItem {
  stakeholder: string;
  reason_to_consult: string;
  suggested_question: string;
  expected_concern: string;
}

export interface BeforeAfterScores {
  before_overall_policy_risk: number;
  after_expected_policy_risk: number;
  before_adoption_readiness: number;
  after_expected_adoption_readiness: number;
}

export interface PolicyRedesign {
  original_policy_risk_summary: string;
  redesign_options: PolicyRedesignOption[];
  recommended_redesign: string;
  before_after_scores: BeforeAfterScores;
  communication_strategy: string[];
  stakeholder_consultation_plan: StakeholderConsultationPlanItem[];
  validation_questions: string[];
}

export type RiskBand = "Low" | "Medium" | "High" | "Critical";

export interface ExplainableRiskScore {
  score: number;
  band: RiskBand;
  why: string[];
}

export interface MitigationReadiness {
  score: number;
  drivers: string[];
  confidence: Confidence;
  assumptions: string[];
}

export interface RiskScore {
  public_reaction_risk: ExplainableRiskScore;
  business_opposition_risk: ExplainableRiskScore;
  economic_exposure_risk: ExplainableRiskScore;
  implementation_complexity_risk: ExplainableRiskScore;
  fraud_abuse_risk: ExplainableRiskScore;
  legal_ambiguity_risk: ExplainableRiskScore;
  misinformation_risk: ExplainableRiskScore;
  mitigation_readiness: ExplainableRiskScore;
  overall_policy_risk: ExplainableRiskScore;
  adoption_readiness: ExplainableRiskScore;
  explanation: string;
  top_risk_drivers: string[];
  confidence: Confidence;
  assumptions: string[];
}

export type ExecutiveRecommendation =
  | "Launch as-is"
  | "Launch with mitigation"
  | "Pilot first"
  | "Do not launch as written";

export interface ExecutiveMemoSection {
  heading: string;
  summary: string;
  bullets: string[];
  evidence_card_ids: string[];
  confidence: Confidence;
  assumptions: string[];
}

export interface ExecutiveMemo {
  title: string;
  recommendation: ExecutiveRecommendation;
  confidence: Confidence;
  structured_json: {
    policy_summary: ExecutiveMemoSection;
    people_sentiment_forecast: ExecutiveMemoSection;
    main_support_narratives: ExecutiveMemoSection;
    main_opposition_narratives: ExecutiveMemoSection;
    stakeholder_intelligence: ExecutiveMemoSection;
    economic_exposure: ExecutiveMemoSection;
    fraud_abuse_pre_mortem: ExecutiveMemoSection;
    implementation_bottlenecks: ExecutiveMemoSection;
    predictive_chain_reaction_summary?: ExecutiveMemoSection;
    evidence_quality_limitations?: ExecutiveMemoSection;
    recommended_redesign: ExecutiveMemoSection;
    next_3_actions: ExecutiveMemoSection;
    evidence_and_assumptions: ExecutiveMemoSection;
  };
  markdown_memo: string;
  export_text: string;
  evidence_card_ids: string[];
  assumptions: string[];
}

export interface ImpactChain {
  chain_id: string;
  policy_lever: string;
  first_order_effect: string;
  second_order_effect: string;
  third_order_effect: string;
  affected_groups: string[];
  affected_industries: string[];
  sentiment_trigger: string;
  economic_pressure: string;
  stakeholder_amplification: string;
  implementation_risk: string;
  fraud_or_abuse_risk: string;
  financial_or_insurance_exposure: string;
  mitigation_option: string;
  confidence: Confidence;
  assumptions: string[];
  evidence_card_ids: string[];
}

export interface ImpactChainSimulation {
  policy_title: string;
  simulation_horizon: SimulationHorizon;
  overall_chain_reaction_summary: string;
  impact_chains: ImpactChain[];
  highest_risk_chain: string;
  fastest_moving_chain: string;
  most_mitigatable_chain: string;
  warnings: string[];
}

export interface IndustryRippleEffect {
  industry_name: string;
  effect_type:
    | "revenue_contraction"
    | "demand_spike"
    | "compliance_cost"
    | "labor_displacement"
    | "supply_chain_shift"
    | "neutral"
    | "uncertain";
  simulated_effect: string;
  metric_value: string;
  metric_source_type: MetricSourceType;
  source_ids: string[];
  key_ripple_effect: string;
  affected_companies_or_segments: string[];
  labor_effect: string;
  supply_demand_effect: string;
  confidence: Confidence;
  assumptions: string[];
  limitations: string[];
  evidence_card_ids: string[];
}

export interface IndustryRippleEffects {
  industries: IndustryRippleEffect[];
  warnings?: string[];
}

export interface SocialDynamicsGroupRisk {
  group_name: string;
  likely_sentiment: PublicSentimentLabel;
  simulated_effect: string;
  metric_value: string;
  metric_source_type: MetricSourceType;
  source_ids: string[];
  main_concern: string;
  main_support_driver: string;
  contagion_or_ripple_impact: string;
  misinformation_exposure_risk: number;
  protest_or_backlash_risk: number;
  trust_sensitivity: number;
  cost_burden_sensitivity: number;
  confidence: Confidence;
  assumptions: string[];
  limitations: string[];
  evidence_card_ids: string[];
}

export interface SocialDynamicsRisk {
  groups: SocialDynamicsGroupRisk[];
  warnings?: string[];
}

export interface FinanceInsuranceRiskCategory {
  risk_name: string;
  category:
    | "municipal_bonds"
    | "insurance"
    | "trade_credit"
    | "commodities"
    | "procurement"
    | "public_budget"
    | "business_credit"
    | "other";
  simulated_effect: string;
  metric_value: string;
  metric_source_type: MetricSourceType;
  source_ids: string[];
  monetized_risk_explanation: string;
  why_policy_creates_this_risk: string;
  who_bears_the_risk: string;
  mitigation: string;
  confidence: Confidence;
  assumptions: string[];
  limitations: string[];
  evidence_card_ids: string[];
}

export interface FinanceInsuranceRisk {
  risk_categories: FinanceInsuranceRiskCategory[];
  warnings?: string[];
}

export interface SourceAuditResult {
  unsupported_claims: string[];
  overprecise_metrics: string[];
  social_only_claims: string[];
  missing_sources: string[];
  recommended_downgrades: string[];
  final_confidence_adjustments: string[];
}

export interface PolicyAnalysis {
  id: string;
  generatedAt: string;
  analysisMode: "mock-fallback" | "live-api";
  policyText: string;
  parsedPolicy: ParsedPolicy;
  peopleSentimentForecast: SentimentForecast;
  sentimentForecast: SentimentGroupForecast[];
  narrativeRisk: NarrativeRisk;
  stakeholderIntelligence: StakeholderIntelligence;
  economicExposure: EconomicExposure;
  fraudAbuseRisk: FraudRiskAssessment;
  implementationRisk: ImplementationRisk;
  redesignBrief: PolicyRedesign;
  riskScore: RiskScore;
  executiveMemo: ExecutiveMemo;
  impactChainSimulation?: ImpactChainSimulation;
  industryRippleEffects?: IndustryRippleEffects;
  socialDynamicsRisk?: SocialDynamicsRisk;
  financeInsuranceRisk?: FinanceInsuranceRisk;
  sourceAudit?: SourceAuditResult;
}
