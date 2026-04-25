export type StakeholderSource = "crustdata" | "mock" | "manual";

export type StakeholderKind =
  | "company"
  | "person"
  | "trade_group"
  | "advocacy_group"
  | "agency"
  | "public_group"
  | "other";

export type StakeholderLikelyPosition = "support" | "oppose" | "mixed" | "unknown";

export type StakeholderLevel = "low" | "medium" | "high";

export type StakeholderSignalSet = {
  hiring?: string;
  headcount?: string;
  news?: string;
  socialPosts?: string[];
  webTraffic?: string;
  funding?: string;
};

export type StakeholderDecisionMaker = {
  name: string;
  title?: string;
  linkedinUrl?: string;
  reasonRelevant: string;
};

export type Stakeholder = {
  id: string;
  name: string;
  type: StakeholderKind;
  category: string;
  industry?: string;
  location?: string;
  likelyPosition: StakeholderLikelyPosition;
  influenceLevel: StakeholderLevel;
  exposureLevel: StakeholderLevel;
  reasonAffected: string;
  signals: StakeholderSignalSet;
  relevantPeople?: StakeholderDecisionMaker[];
  evidenceCardIds: string[];
  source: StakeholderSource;
  confidence: number;
};

export type CrustDataStatus = {
  enabled: boolean;
  usedLiveData: boolean;
  warnings: string[];
  companiesFound: number;
  peopleFound: number;
  postsFound: number;
};
