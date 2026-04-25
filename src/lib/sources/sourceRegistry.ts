export type SourceTrustTier =
  | "official-statistical"
  | "official-policy"
  | "peer-reviewed"
  | "research-institution"
  | "think-tank"
  | "consulting-methodology"
  | "news-media"
  | "public-comment"
  | "social-signal"
  | "background-only";

export type SourceName =
  | "CrustData"
  | "Census ACS"
  | "BLS"
  | "BEA"
  | "FRED"
  | "Regulations.gov"
  | "Federal Register"
  | "Congress.gov"
  | "USAspending"
  | "Socrata/Open Data"
  | "GDELT"
  | "Generic web search/manual source"
  | "U.S. Treasury"
  | "Federal Reserve / Cleveland Fed"
  | "Data.gov"
  | "Economic Policy Institute"
  | "Center on Budget and Policy Priorities"
  | "Brookings Economic Studies"
  | "NBER"
  | "IMF"
  | "World Bank Policy Research Reports"
  | "Gates Foundation economic development policy"
  | "UN DESA Economic Analysis and Policy Division"
  | "Analysis Group public policy and economic impact analysis"
  | "IMPLAN-style economic impact methodology"
  | "Cost-benefit analysis methodology references"
  | "Survey and experimental study methodology references"
  | "Media Cloud"
  | "Local news"
  | "Social media"
  | "Investopedia/background explainers"
  | "Reddit/background"
  | "General blogs/background";

export type SourceType =
  | "company_graph"
  | "demographic_dataset"
  | "labor_market_dataset"
  | "economic_accounts"
  | "macro_time_series"
  | "rulemaking_docket"
  | "official_register"
  | "legislative_record"
  | "federal_spending"
  | "open_data_portal"
  | "news_and_media"
  | "manual_or_web"
  | "stakeholder-company-data"
  | "stakeholder-people-data"
  | "stakeholder-social-signal"
  | "treasury_fiscal"
  | "central_bank_research"
  | "government_data_catalog"
  | "policy_research"
  | "peer_reviewed_research"
  | "development_policy"
  | "consulting_methodology"
  | "economic_impact_methodology"
  | "survey_methodology"
  | "social_signal"
  | "background_explainer";

export type FreshnessLevel = "real_time" | "daily" | "weekly" | "monthly" | "quarterly" | "annual" | "variable";

export type SourceFreshnessRequirement = "real-time" | "monthly" | "annual" | "historical-ok";

export type TrustLevel = "official" | "high" | "medium" | "contextual";

export type SourceRegistryEntry = {
  id: string;
  name: SourceName;
  url?: string;
  sourceTrustTier: SourceTrustTier;
  bestFor: string[];
  avoidFor: string[];
  knownLimitations: string[];
  biasOrPerspective?: string;
  freshnessRequirement: SourceFreshnessRequirement;
  requiresApiKey: boolean;
  supportedAgents: string[];

  // Backward-compatible aliases used by existing source adapters and evidence cards.
  source_name: SourceName;
  source_type: SourceType;
  best_for: string[];
  limitations: string[];
  requires_api_key: boolean;
  freshness: FreshnessLevel;
  trust_level: TrustLevel;
  adapter_function_name: string;
};

type SourceRegistrySeed = {
  id: string;
  name: SourceName;
  url?: string;
  sourceTrustTier: SourceTrustTier;
  sourceType: SourceType;
  bestFor: string[];
  avoidFor: string[];
  knownLimitations: string[];
  biasOrPerspective?: string;
  freshnessRequirement: SourceFreshnessRequirement;
  freshness: FreshnessLevel;
  requiresApiKey: boolean;
  supportedAgents: string[];
  adapterFunctionName: string;
};

function source(seed: SourceRegistrySeed): SourceRegistryEntry {
  return {
    ...seed,
    source_name: seed.name,
    source_type: seed.sourceType,
    best_for: seed.bestFor,
    limitations: seed.knownLimitations,
    requires_api_key: seed.requiresApiKey,
    trust_level: trustLevelForTier(seed.sourceTrustTier),
    adapter_function_name: seed.adapterFunctionName
  };
}

export const sourceRegistry = [
  source({
    id: "crustdata",
    name: "CrustData",
    url: "https://crustdata.com",
    sourceTrustTier: "research-institution",
    sourceType: "company_graph",
    bestFor: ["company and stakeholder discovery", "vendor category mapping", "growth, hiring, and relationship signals"],
    avoidFor: ["official employment counts", "official revenue metrics", "representative public sentiment"],
    knownLimitations: [
      "commercial graph coverage varies by company size and sector",
      "signals should not be treated as official employment or revenue counts",
      "requires corroboration before making final stakeholder claims"
    ],
    freshnessRequirement: "monthly",
    freshness: "daily",
    requiresApiKey: true,
    supportedAgents: ["stakeholder_intelligence", "market_shock", "impact_chain"],
    adapterFunctionName: "fetchCrustDataEvidence"
  }),
  source({
    id: "census-acs",
    name: "Census ACS",
    url: "https://www.census.gov/programs-surveys/acs",
    sourceTrustTier: "official-statistical",
    sourceType: "demographic_dataset",
    bestFor: ["demographics", "income", "poverty", "commute", "housing burden", "equity baselines"],
    avoidFor: ["real-time sentiment", "individual employer claims"],
    knownLimitations: [
      "survey estimates include margins of error",
      "small geographies may have noisy estimates",
      "annual releases may lag current conditions"
    ],
    freshnessRequirement: "annual",
    freshness: "annual",
    requiresApiKey: false,
    supportedAgents: ["economic_exposure", "sentiment_forecast", "economic_equity", "source_auditor"],
    adapterFunctionName: "fetchCensusAcsEvidence"
  }),
  source({
    id: "bls",
    name: "BLS",
    url: "https://www.bls.gov",
    sourceTrustTier: "official-statistical",
    sourceType: "labor_market_dataset",
    bestFor: ["employment", "unemployment", "wages", "CPI", "industry labor data", "occupation exposure"],
    avoidFor: ["company-specific employment", "policy causality without a model"],
    knownLimitations: [
      "some series are revised after initial publication",
      "local granularity differs by program",
      "not designed to identify individual employers"
    ],
    freshnessRequirement: "monthly",
    freshness: "monthly",
    requiresApiKey: false,
    supportedAgents: ["economic_exposure", "market_shock", "economic_equity", "source_auditor"],
    adapterFunctionName: "fetchBlsEvidence"
  }),
  source({
    id: "bea",
    name: "BEA",
    url: "https://www.bea.gov",
    sourceTrustTier: "official-statistical",
    sourceType: "economic_accounts",
    bestFor: ["regional GDP", "personal income", "industry output", "economic dependency", "sector exposure"],
    avoidFor: ["real-time local shocks", "micro-level household burden"],
    knownLimitations: [
      "economic accounts can lag fast-moving local conditions",
      "regional detail may not align perfectly with policy boundaries",
      "estimates may be revised"
    ],
    freshnessRequirement: "annual",
    freshness: "quarterly",
    requiresApiKey: false,
    supportedAgents: ["economic_exposure", "finance_risk", "market_shock", "source_auditor"],
    adapterFunctionName: "fetchBeaEvidence"
  }),
  source({
    id: "fred",
    name: "FRED",
    url: "https://fred.stlouisfed.org",
    sourceTrustTier: "official-statistical",
    sourceType: "macro_time_series",
    bestFor: ["macro trends", "inflation", "interest rates", "unemployment trend", "housing indicators"],
    avoidFor: ["policy-specific effect size without a model", "representative sentiment"],
    knownLimitations: [
      "aggregates data from many publishers with different methodologies",
      "not usually sufficient for policy-specific exposure by itself",
      "series metadata must be checked carefully"
    ],
    freshnessRequirement: "monthly",
    freshness: "daily",
    requiresApiKey: false,
    supportedAgents: ["economic_exposure", "finance_risk", "market_shock", "source_auditor"],
    adapterFunctionName: "fetchFredEvidence"
  }),
  source({
    id: "treasury",
    name: "U.S. Treasury",
    url: "https://home.treasury.gov",
    sourceTrustTier: "official-statistical",
    sourceType: "treasury_fiscal",
    bestFor: ["fiscal capacity", "public borrowing context", "Treasury rates", "federal budget context"],
    avoidFor: ["local implementation claims without local data", "public sentiment"],
    knownLimitations: ["national fiscal series may not map to local policy exposure", "does not establish policy causality alone"],
    freshnessRequirement: "monthly",
    freshness: "daily",
    requiresApiKey: false,
    supportedAgents: ["finance_risk", "economic_exposure", "source_auditor"],
    adapterFunctionName: "fetchTreasuryEvidence"
  }),
  source({
    id: "federal-reserve-cleveland-fed",
    name: "Federal Reserve / Cleveland Fed",
    url: "https://www.clevelandfed.org",
    sourceTrustTier: "research-institution",
    sourceType: "central_bank_research",
    bestFor: ["inflation context", "interest-rate context", "regional economic research", "finance-risk framing"],
    avoidFor: ["policy-specific implementation claims", "stakeholder sentiment"],
    knownLimitations: ["research outputs have defined scopes and may not apply to every jurisdiction", "series methods differ"],
    freshnessRequirement: "monthly",
    freshness: "monthly",
    requiresApiKey: false,
    supportedAgents: ["finance_risk", "economic_exposure", "source_auditor"],
    adapterFunctionName: "fetchFederalReserveEvidence"
  }),
  source({
    id: "regulations-gov",
    name: "Regulations.gov",
    url: "https://www.regulations.gov",
    sourceTrustTier: "public-comment",
    sourceType: "rulemaking_docket",
    bestFor: ["public comments", "agency dockets", "stakeholder positions", "rulemaking evidence"],
    avoidFor: ["representative public opinion", "verified economic baselines"],
    knownLimitations: [
      "federal docket coverage does not capture state or local rulemaking by default",
      "comments can be duplicative or campaign-driven",
      "API availability and fields vary by docket"
    ],
    freshnessRequirement: "real-time",
    freshness: "daily",
    requiresApiKey: true,
    supportedAgents: ["policy_parser", "sentiment_forecast", "narrative_risk", "source_auditor"],
    adapterFunctionName: "fetchRegulationsGovEvidence"
  }),
  source({
    id: "federal-register",
    name: "Federal Register",
    url: "https://www.federalregister.gov",
    sourceTrustTier: "official-policy",
    sourceType: "official_register",
    bestFor: ["official notices", "rule text", "agency definitions", "effective dates", "comment periods"],
    avoidFor: ["implementation outcomes", "representative sentiment"],
    knownLimitations: ["federal only", "does not provide local implementation outcomes", "legal interpretation still requires review"],
    freshnessRequirement: "real-time",
    freshness: "daily",
    requiresApiKey: false,
    supportedAgents: ["policy_parser", "implementation_risk", "executive_memo", "source_auditor"],
    adapterFunctionName: "fetchFederalRegisterEvidence"
  }),
  source({
    id: "congress-gov",
    name: "Congress.gov",
    url: "https://www.congress.gov",
    sourceTrustTier: "official-policy",
    sourceType: "legislative_record",
    bestFor: ["bill text", "sponsor context", "committee context", "legislative status", "statutory analogues"],
    avoidFor: ["administrative implementation evidence", "public sentiment"],
    knownLimitations: ["federal scope", "bill text may change across versions", "does not capture final agency implementation"],
    freshnessRequirement: "real-time",
    freshness: "daily",
    requiresApiKey: true,
    supportedAgents: ["policy_parser", "implementation_risk", "executive_memo", "source_auditor"],
    adapterFunctionName: "fetchCongressGovEvidence"
  }),
  source({
    id: "usaspending",
    name: "USAspending",
    url: "https://www.usaspending.gov",
    sourceTrustTier: "official-statistical",
    sourceType: "federal_spending",
    bestFor: ["grants", "contracts", "agency spending", "recipient exposure", "vendor concentration"],
    avoidFor: ["proving policy outcomes without additional evidence", "state/local spending gaps"],
    knownLimitations: ["federal spending only", "award descriptions can be broad", "recipient identity can require cleanup"],
    freshnessRequirement: "monthly",
    freshness: "daily",
    requiresApiKey: false,
    supportedAgents: ["fraud_abuse_risk", "finance_risk", "source_auditor"],
    adapterFunctionName: "fetchUsaSpendingEvidence"
  }),
  source({
    id: "data-gov",
    name: "Data.gov",
    url: "https://data.gov",
    sourceTrustTier: "official-statistical",
    sourceType: "government_data_catalog",
    bestFor: ["government datasets", "agency data discovery", "source-backed indicators"],
    avoidFor: ["claims without checking the underlying publisher", "sentiment"],
    knownLimitations: ["catalog metadata can be stale", "quality depends on publishing agency"],
    freshnessRequirement: "monthly",
    freshness: "variable",
    requiresApiKey: false,
    supportedAgents: ["source_adapter", "economic_exposure", "implementation_risk"],
    adapterFunctionName: "fetchDataGovEvidence"
  }),
  source({
    id: "socrata-open-data",
    name: "Socrata/Open Data",
    url: "https://dev.socrata.com",
    sourceTrustTier: "official-statistical",
    sourceType: "open_data_portal",
    bestFor: ["city and state operations", "permits", "complaints", "inspections", "procurement", "service delivery"],
    avoidFor: ["cross-jurisdiction comparison without schema review", "whole-public sentiment"],
    knownLimitations: ["schemas differ across portals", "data quality depends on publishing agency", "freshness varies sharply"],
    freshnessRequirement: "monthly",
    freshness: "variable",
    requiresApiKey: false,
    supportedAgents: ["implementation_risk", "economic_exposure", "fraud_abuse_risk", "source_auditor"],
    adapterFunctionName: "fetchSocrataOpenDataEvidence"
  }),
  source({
    id: "gdelt",
    name: "GDELT",
    url: "https://www.gdeltproject.org",
    sourceTrustTier: "news-media",
    sourceType: "news_and_media",
    bestFor: ["news narrative tracking", "media framing", "attention signals", "geographic spread of coverage"],
    avoidFor: ["representative public opinion", "source-backed factual metrics without corroboration"],
    knownLimitations: ["media volume is not public opinion", "entity extraction and tone signals can be noisy", "claims need primary-source confirmation"],
    freshnessRequirement: "real-time",
    freshness: "real_time",
    requiresApiKey: false,
    supportedAgents: ["sentiment_forecast", "narrative_risk", "social_dynamics", "source_auditor"],
    adapterFunctionName: "fetchGdeltEvidence"
  }),
  source({
    id: "media-cloud",
    name: "Media Cloud",
    url: "https://mediacloud.org",
    sourceTrustTier: "news-media",
    sourceType: "news_and_media",
    bestFor: ["media framing", "issue salience", "narrative spread", "publisher mix"],
    avoidFor: ["representative public sentiment", "official economic indicators"],
    knownLimitations: ["coverage and collection methods shape observed narratives", "media attention does not equal public opinion"],
    freshnessRequirement: "real-time",
    freshness: "daily",
    requiresApiKey: true,
    supportedAgents: ["sentiment_forecast", "narrative_risk", "social_dynamics"],
    adapterFunctionName: "fetchMediaCloudEvidence"
  }),
  source({
    id: "local-news",
    name: "Local news",
    sourceTrustTier: "news-media",
    sourceType: "news_and_media",
    bestFor: ["local narratives", "stakeholder quotes", "implementation stories", "salience signals"],
    avoidFor: ["representative sentiment", "official metrics"],
    knownLimitations: ["publisher selection can skew issue salience", "claims need source corroboration"],
    biasOrPerspective: "varies by outlet and editorial context",
    freshnessRequirement: "real-time",
    freshness: "daily",
    requiresApiKey: false,
    supportedAgents: ["sentiment_forecast", "narrative_risk", "social_dynamics"],
    adapterFunctionName: "fetchLocalNewsEvidence"
  }),
  source({
    id: "social-media",
    name: "Social media",
    sourceTrustTier: "social-signal",
    sourceType: "social_signal",
    bestFor: ["online amplification", "confusion signals", "misinformation monitoring", "rapid narrative detection"],
    avoidFor: ["representative public opinion", "source-backed policy facts", "whole-population sentiment scores"],
    knownLimitations: ["not representative", "can be coordinated or astroturfed", "platform demographics and algorithms distort visibility"],
    freshnessRequirement: "real-time",
    freshness: "real_time",
    requiresApiKey: true,
    supportedAgents: ["sentiment_forecast", "narrative_risk", "social_dynamics", "source_auditor"],
    adapterFunctionName: "fetchSocialMediaSignals"
  }),
  source({
    id: "epi",
    name: "Economic Policy Institute",
    url: "https://www.epi.org",
    sourceTrustTier: "think-tank",
    sourceType: "policy_research",
    bestFor: ["worker impact", "wage policy", "low-income household burden", "equity framing"],
    avoidFor: ["neutral statistical baseline without corroboration", "official fiscal counts"],
    knownLimitations: ["methodological and worker-focused perspective should be disclosed", "findings require context before generalizing"],
    biasOrPerspective: "labor and worker-centered policy perspective",
    freshnessRequirement: "historical-ok",
    freshness: "variable",
    requiresApiKey: false,
    supportedAgents: ["sentiment_forecast", "economic_equity", "executive_memo"],
    adapterFunctionName: "fetchEpiEvidence"
  }),
  source({
    id: "cbpp",
    name: "Center on Budget and Policy Priorities",
    url: "https://www.cbpp.org",
    sourceTrustTier: "think-tank",
    sourceType: "policy_research",
    bestFor: ["low-income household impact", "budget distribution", "safety-net analysis", "fiscal equity"],
    avoidFor: ["neutral statistical ground truth without official data", "company-specific claims"],
    knownLimitations: ["policy perspective should be disclosed", "analysis may focus on distributional consequences"],
    biasOrPerspective: "anti-poverty and budget-equity policy perspective",
    freshnessRequirement: "historical-ok",
    freshness: "variable",
    requiresApiKey: false,
    supportedAgents: ["economic_equity", "sentiment_forecast", "executive_memo"],
    adapterFunctionName: "fetchCbppEvidence"
  }),
  source({
    id: "brookings-economic-studies",
    name: "Brookings Economic Studies",
    url: "https://www.brookings.edu/program/economic-studies",
    sourceTrustTier: "research-institution",
    sourceType: "policy_research",
    bestFor: ["policy interpretation", "macroeconomic framing", "historical comparison", "urban and regional economics"],
    avoidFor: ["official indicator replacement", "unqualified local estimates"],
    knownLimitations: ["research scope and author assumptions should be reviewed", "not an official data source"],
    freshnessRequirement: "historical-ok",
    freshness: "variable",
    requiresApiKey: false,
    supportedAgents: ["economic_exposure", "economic_equity", "executive_memo"],
    adapterFunctionName: "fetchBrookingsEvidence"
  }),
  source({
    id: "nber",
    name: "NBER",
    url: "https://www.nber.org",
    sourceTrustTier: "peer-reviewed",
    sourceType: "peer_reviewed_research",
    bestFor: ["economic research", "causal evidence", "historical policy effects", "labor and finance literature"],
    avoidFor: ["instant current conditions", "direct local estimates without adaptation"],
    knownLimitations: ["working papers may not be peer-reviewed yet", "external validity must be checked"],
    freshnessRequirement: "historical-ok",
    freshness: "variable",
    requiresApiKey: false,
    supportedAgents: ["economic_exposure", "finance_risk", "market_shock", "source_auditor"],
    adapterFunctionName: "fetchNberEvidence"
  }),
  source({
    id: "imf",
    name: "IMF",
    url: "https://www.imf.org",
    sourceTrustTier: "research-institution",
    sourceType: "development_policy",
    bestFor: ["macro/fiscal framing", "fiscal space", "public finance", "international comparison"],
    avoidFor: ["local household burden without local data", "partisan claims"],
    knownLimitations: ["global macro framing may be too broad for local policies", "country context matters"],
    freshnessRequirement: "historical-ok",
    freshness: "variable",
    requiresApiKey: false,
    supportedAgents: ["finance_risk", "economic_exposure", "executive_memo"],
    adapterFunctionName: "fetchImfEvidence"
  }),
  source({
    id: "world-bank-policy-research",
    name: "World Bank Policy Research Reports",
    url: "https://www.worldbank.org",
    sourceTrustTier: "research-institution",
    sourceType: "development_policy",
    bestFor: ["development policy", "global policy comparisons", "distributional analysis", "institutional capacity"],
    avoidFor: ["U.S.-local exact estimates without local data", "real-time sentiment"],
    knownLimitations: ["international context may not transfer cleanly", "methodology and jurisdiction must be checked"],
    freshnessRequirement: "historical-ok",
    freshness: "variable",
    requiresApiKey: false,
    supportedAgents: ["economic_equity", "economic_exposure", "executive_memo"],
    adapterFunctionName: "fetchWorldBankEvidence"
  }),
  source({
    id: "gates-development-policy",
    name: "Gates Foundation economic development policy",
    url: "https://www.gatesfoundation.org",
    sourceTrustTier: "research-institution",
    sourceType: "development_policy",
    bestFor: ["development policy context", "global poverty and health economics", "program design examples"],
    avoidFor: ["neutral official statistics", "U.S. local fiscal estimates"],
    knownLimitations: ["foundation strategy and funding priorities should be disclosed", "not an official statistical source"],
    biasOrPerspective: "foundation-funded development-policy perspective",
    freshnessRequirement: "historical-ok",
    freshness: "variable",
    requiresApiKey: false,
    supportedAgents: ["economic_equity", "executive_memo"],
    adapterFunctionName: "fetchGatesPolicyEvidence"
  }),
  source({
    id: "un-desa",
    name: "UN DESA Economic Analysis and Policy Division",
    url: "https://www.un.org/development/desa",
    sourceTrustTier: "research-institution",
    sourceType: "development_policy",
    bestFor: ["development macro policy", "international public finance", "global economic context"],
    avoidFor: ["U.S. local exact effects", "stakeholder sentiment"],
    knownLimitations: ["global analysis requires careful transfer to local jurisdictions", "not a substitute for local data"],
    freshnessRequirement: "historical-ok",
    freshness: "variable",
    requiresApiKey: false,
    supportedAgents: ["economic_exposure", "economic_equity"],
    adapterFunctionName: "fetchUnDesaEvidence"
  }),
  source({
    id: "analysis-group-methodology",
    name: "Analysis Group public policy and economic impact analysis",
    url: "https://www.analysisgroup.com",
    sourceTrustTier: "consulting-methodology",
    sourceType: "consulting_methodology",
    bestFor: ["consulting-grade memo structure", "economic-impact framing", "uncertainty and assumptions presentation"],
    avoidFor: ["copying claims", "source-backed facts about a new policy", "official estimates"],
    knownLimitations: ["use for methodology inspiration only", "do not copy claims or proprietary methods"],
    freshnessRequirement: "historical-ok",
    freshness: "variable",
    requiresApiKey: false,
    supportedAgents: ["consulting_benchmark", "executive_memo", "policy_redesign"],
    adapterFunctionName: "fetchAnalysisGroupMethodology"
  }),
  source({
    id: "implan-methodology",
    name: "IMPLAN-style economic impact methodology",
    sourceTrustTier: "consulting-methodology",
    sourceType: "economic_impact_methodology",
    bestFor: ["input-output impact logic", "indirect and induced effects framing", "economic-impact report structure"],
    avoidFor: ["automatic facts", "precise effects without model inputs"],
    knownLimitations: ["methodology inspiration only unless a licensed model and inputs are provided", "multipliers can be misused"],
    freshnessRequirement: "historical-ok",
    freshness: "variable",
    requiresApiKey: false,
    supportedAgents: ["consulting_benchmark", "market_shock", "executive_memo"],
    adapterFunctionName: "fetchImplanMethodology"
  }),
  source({
    id: "cost-benefit-methodology",
    name: "Cost-benefit analysis methodology references",
    sourceTrustTier: "consulting-methodology",
    sourceType: "consulting_methodology",
    bestFor: ["cost-benefit framing", "benefit categories", "uncertainty and sensitivity analysis"],
    avoidFor: ["policy-specific facts without data", "copying results"],
    knownLimitations: ["methodology only; inputs and assumptions must be disclosed"],
    freshnessRequirement: "historical-ok",
    freshness: "variable",
    requiresApiKey: false,
    supportedAgents: ["consulting_benchmark", "economic_exposure", "policy_redesign"],
    adapterFunctionName: "fetchCostBenefitMethodology"
  }),
  source({
    id: "survey-experimental-methodology",
    name: "Survey and experimental study methodology references",
    sourceTrustTier: "consulting-methodology",
    sourceType: "survey_methodology",
    bestFor: ["survey design", "field test design", "representative listening plan", "validation questions"],
    avoidFor: ["claiming measured public opinion without running a survey"],
    knownLimitations: ["methodology only; not evidence about current sentiment by itself"],
    freshnessRequirement: "historical-ok",
    freshness: "variable",
    requiresApiKey: false,
    supportedAgents: ["sentiment_forecast", "source_auditor", "executive_memo"],
    adapterFunctionName: "fetchSurveyMethodology"
  }),
  source({
    id: "generic-manual-source",
    name: "Generic web search/manual source",
    sourceTrustTier: "background-only",
    sourceType: "manual_or_web",
    bestFor: ["manual source entry", "local documents", "PDFs", "fallback evidence", "source discovery"],
    avoidFor: ["source-backed final claims without publisher review", "exact numbers"],
    knownLimitations: ["trust depends on publisher and retrieval method", "requires manual review for source quality", "should be clearly labeled"],
    freshnessRequirement: "historical-ok",
    freshness: "variable",
    requiresApiKey: false,
    supportedAgents: ["policy_parser", "manual_review", "source_adapter"],
    adapterFunctionName: "fetchManualOrWebEvidence"
  }),
  source({
    id: "investopedia-background",
    name: "Investopedia/background explainers",
    sourceTrustTier: "background-only",
    sourceType: "background_explainer",
    bestFor: ["terminology orientation", "internal search query generation"],
    avoidFor: ["primary policy evidence", "final cited analysis", "source-backed metrics"],
    knownLimitations: ["background explainer only", "not a policy or statistical authority"],
    freshnessRequirement: "historical-ok",
    freshness: "variable",
    requiresApiKey: false,
    supportedAgents: ["manual_review"],
    adapterFunctionName: "fetchBackgroundExplainer"
  }),
  source({
    id: "reddit-background",
    name: "Reddit/background",
    sourceTrustTier: "background-only",
    sourceType: "social_signal",
    bestFor: ["terminology discovery", "possible confusion signals during development"],
    avoidFor: ["final evidence", "representative public opinion", "source-backed claims"],
    knownLimitations: ["not representative", "anonymous and unverifiable", "do not cite as final evidence"],
    freshnessRequirement: "real-time",
    freshness: "real_time",
    requiresApiKey: false,
    supportedAgents: ["manual_review"],
    adapterFunctionName: "fetchRedditBackground"
  }),
  source({
    id: "general-blogs-background",
    name: "General blogs/background",
    sourceTrustTier: "background-only",
    sourceType: "background_explainer",
    bestFor: ["background orientation", "search query generation"],
    avoidFor: ["source-backed evidence", "exact numbers", "final claims"],
    knownLimitations: ["unknown editorial standards", "not primary evidence"],
    freshnessRequirement: "historical-ok",
    freshness: "variable",
    requiresApiKey: false,
    supportedAgents: ["manual_review"],
    adapterFunctionName: "fetchGeneralBlogBackground"
  })
] satisfies SourceRegistryEntry[];

export const sourceRegistryByName = sourceRegistry.reduce(
  (registry, entry) => {
    registry[entry.source_name] = entry;
    return registry;
  },
  {} as Record<SourceName, SourceRegistryEntry>
);

export const sourceRegistryById = sourceRegistry.reduce(
  (registry, entry) => {
    registry[entry.id] = entry;
    return registry;
  },
  {} as Record<string, SourceRegistryEntry>
);

export function getSourceRegistryEntry(sourceName: SourceName): SourceRegistryEntry {
  return sourceRegistryByName[sourceName];
}

export function getSourceRegistryEntryById(sourceId: string): SourceRegistryEntry | undefined {
  return sourceRegistryById[sourceId] ?? sourceRegistry.find((entry) => entry.source_name === sourceId);
}

export function isPrimaryEvidenceTier(tier: SourceTrustTier): boolean {
  return tier === "official-statistical" || tier === "official-policy" || tier === "peer-reviewed";
}

function trustLevelForTier(tier: SourceTrustTier): TrustLevel {
  if (tier === "official-statistical" || tier === "official-policy") return "official";
  if (tier === "peer-reviewed" || tier === "research-institution") return "high";
  if (tier === "think-tank" || tier === "consulting-methodology") return "medium";
  return "contextual";
}
