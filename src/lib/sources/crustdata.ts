import { createEvidenceCard, type EvidenceCard } from "@/lib/evidence/evidenceCard";
import type { PolicyAnalysis as ParserPolicyAnalysis } from "@/lib/agents/policyParser";
import type { ParsedPolicy } from "@/lib/types";
import type { CrustDataStatus } from "@/lib/types/stakeholders";
import type { SourceType } from "@/lib/sources/sourceRegistry";

export const CRUSTDATA_CONFIG = {
  baseUrl: process.env.CRUSTDATA_API_BASE_URL ?? "https://api.crustdata.com",
  authScheme: process.env.CRUSTDATA_AUTH_SCHEME || "Bearer",
  timeoutMs: 15000
};

export type CrustDataCompany = {
  id: string;
  name: string;
  domain?: string;
  linkedinUrl?: string;
  industry?: string;
  description?: string;
  headquarters?: string;
  employeeCount?: number | string;
  headcountGrowth?: string;
  fundingStage?: string;
  webTrafficSignal?: string;
  hiringSignal?: string;
  newsSignal?: string;
  socialSignal?: string;
  source: "crustdata" | "mock";
  raw?: unknown;
};

export type CrustDataPerson = {
  id: string;
  name: string;
  title?: string;
  companyName?: string;
  linkedinUrl?: string;
  location?: string;
  source: "crustdata" | "mock";
  raw?: unknown;
};

export type CrustDataPost = {
  id: string;
  text: string;
  postedAt?: string;
  url?: string;
  author?: string;
  companyName?: string;
  linkedinUrl?: string;
  engagementSignal?: string;
  source: "crustdata" | "mock";
  raw?: unknown;
};

export type CrustDataPublicSignal = {
  id: string;
  platform: "linkedin" | "twitter" | "reddit" | "web";
  signalType: "linkedin-post" | "web-search";
  title: string;
  excerpt: string;
  url?: string;
  author?: string;
  postedAt?: string;
  engagementSignal?: string;
  query: string;
  source: "crustdata" | "mock";
  confidence: number;
  raw?: unknown;
};

export type CrustDataSearchFilters = {
  terms: string[];
  industries: string[];
  geography?: string;
  limit?: number;
};

export type CrustDataCompanySignal = {
  type: "hiring" | "headcount" | "news" | "social" | "webTraffic" | "funding";
  label: string;
  value: string;
  confidence: number;
  source: "crustdata" | "mock";
};

export type CrustDataStakeholderResult = {
  company: CrustDataCompany;
  people: CrustDataPerson[];
  posts: CrustDataPost[];
  signals: CrustDataCompanySignal[];
  evidenceCards: EvidenceCard[];
  warnings: string[];
};

type PolicyInput = ParserPolicyAnalysis | ParsedPolicy;
type AuthScheme = "Bearer" | "Token";

let runtimeStatus: CrustDataStatus = createInitialStatus();
let linkedInRequestQueue: Promise<void> = Promise.resolve();
let lastLinkedInRequestAt = 0;

const LINKEDIN_MIN_INTERVAL_MS = 2_000;

export function isCrustDataConfigured(): boolean {
  return Boolean(process.env.CRUSTDATA_API_KEY);
}

export function resetCrustDataRuntimeStatus(): void {
  runtimeStatus = createInitialStatus();
}

export function getCrustDataRuntimeStatus(): CrustDataStatus {
  return {
    ...runtimeStatus,
    warnings: [...runtimeStatus.warnings]
  };
}

export async function crustDataFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const apiKey = process.env.CRUSTDATA_API_KEY;
  if (!apiKey) {
    throw new Error("CRUSTDATA_API_KEY is not configured.");
  }

  const primaryScheme = normalizeAuthScheme(CRUSTDATA_CONFIG.authScheme);
  const alternateScheme: AuthScheme = primaryScheme === "Bearer" ? "Token" : "Bearer";

  const primary = await fetchWithAuth(path, options, primaryScheme, apiKey);
  if (primary.ok) {
    return (await primary.json()) as T;
  }

  if (primary.status === 401 || primary.status === 403) {
    const alternate = await fetchWithAuth(path, options, alternateScheme, apiKey);
    if (alternate.ok) {
      addWarning(`CrustData auth succeeded with ${alternateScheme}; configured ${primaryScheme} was rejected.`);
      return (await alternate.json()) as T;
    }
    throw new Error(`CrustData request failed with status ${alternate.status}.`);
  }

  throw new Error(`CrustData request failed with status ${primary.status}.`);
}

export async function searchCompaniesByPolicy(policyAnalysis: PolicyInput): Promise<CrustDataCompany[]> {
  const filters = buildCrustDataSearchFilters(policyAnalysis);

  if (!isCrustDataConfigured()) {
    addWarning("CRUSTDATA_API_KEY is missing; stakeholder intelligence used source-adapter fallback data.");
    const mockResults = getMockCrustDataStakeholders(policyAnalysis);
    runtimeStatus.companiesFound = mockResults.length;
    return mockResults.map((result) => result.company);
  }

  try {
    const response = await crustDataFetch<unknown>("/screener/company/search", {
      method: "POST",
      body: JSON.stringify({
        filters: buildCompanySearchPayload(filters),
        limit: filters.limit ?? 20
      })
    });
    const companies = normalizeCompanySearchResponse(response, policyAnalysis);

    if (companies.length === 0) {
      addWarning("CrustData company search returned no normalized companies; source-adapter fallback stakeholders were used.");
      const mockResults = getMockCrustDataStakeholders(policyAnalysis);
      runtimeStatus.companiesFound = mockResults.length;
      return mockResults.map((result) => result.company);
    }

    runtimeStatus.usedLiveData = true;
    runtimeStatus.companiesFound = companies.length;
    return companies;
  } catch (error) {
    addWarning(`CrustData company search failed; source-adapter fallback stakeholders were used. ${sanitizeError(error)}`);
    const mockResults = getMockCrustDataStakeholders(policyAnalysis);
    runtimeStatus.companiesFound = mockResults.length;
    return mockResults.map((result) => result.company);
  }
}

export async function enrichCompanyByNameOrDomain(input: { name?: string; domain?: string }): Promise<CrustDataCompany | null> {
  const identifier = input.domain ?? input.name;
  if (!identifier) return null;

  if (!isCrustDataConfigured()) {
    return getMockCompanyByName(identifier);
  }

  try {
    const queryParam = input.domain ? "company_domain" : "company_name";
    const response = await crustDataFetch<unknown>(
      `/screener/company?${queryParam}=${encodeURIComponent(identifier)}`,
      { method: "GET" }
    );
    return normalizeEnrichedCompanyResponse(response, getMockCompanyByName(identifier));
  } catch (error) {
    addWarning(`CrustData company enrichment failed for ${identifier}; source-adapter enrichment was used. ${sanitizeError(error)}`);
    return getMockCompanyByName(identifier);
  }
}

export async function enrichCompany(companyNameOrDomain: string): Promise<CrustDataCompany> {
  return (await enrichCompanyByNameOrDomain({
    name: companyNameOrDomain.includes(".") ? undefined : companyNameOrDomain,
    domain: companyNameOrDomain.includes(".") ? companyNameOrDomain : undefined
  })) ?? getMockCompanyByName(companyNameOrDomain);
}

export async function searchPeopleByCompanyAndTitles(input: {
  companyName: string;
  titles: string[];
}): Promise<CrustDataPerson[]> {
  if (!isCrustDataConfigured()) {
    const people = getMockPeople(input.companyName, input.titles);
    runtimeStatus.peopleFound += people.length;
    return people;
  }

  try {
    const response = await crustDataPersonSearch(input);
    const people = normalizePeopleSearchResponse(response, input.companyName);
    runtimeStatus.peopleFound += people.length;
    return people.length > 0 ? people : getMockPeople(input.companyName, input.titles);
  } catch (error) {
    addWarning(`CrustData people search failed for ${input.companyName}; source-adapter decision-maker signals were used. ${sanitizeError(error)}`);
    return getMockPeople(input.companyName, input.titles);
  }
}

export async function getCompanySocialPosts(input: {
  companyName?: string;
  companyLinkedinUrl?: string;
  keyword?: string;
  page?: number;
}): Promise<CrustDataPost[]> {
  if (!isCrustDataConfigured()) {
    const posts = getMockCompanyPosts(input.companyName ?? "Stakeholder", input.keyword);
    runtimeStatus.postsFound += posts.length;
    return posts;
  }

  try {
    const response = await crustDataLinkedInFetch<unknown>("/screener/social_posts/search", {
      method: "POST",
      body: JSON.stringify({
        company_name: input.companyName,
        company_linkedin_url: input.companyLinkedinUrl,
        keyword: input.keyword,
        page: input.page ?? 1,
        limit: 5
      })
    });
    const posts = normalizePostsResponse(response, input.companyName);
    runtimeStatus.postsFound += posts.length;
    return posts;
  } catch (error) {
    addWarning(`CrustData company social posts were unavailable for ${input.companyName ?? "company"}; source-adapter signal was used. ${sanitizeError(error)}`);
    return getMockCompanyPosts(input.companyName ?? "Stakeholder", input.keyword);
  }
}

export async function getPersonSocialPosts(input: { linkedinUrl: string; page?: number }): Promise<CrustDataPost[]> {
  if (!isCrustDataConfigured()) {
    return [];
  }

  try {
    const response = await crustDataLinkedInFetch<unknown>("/screener/social_posts/search", {
      method: "POST",
      body: JSON.stringify({
        person_linkedin_url: input.linkedinUrl,
        page: input.page ?? 1,
        limit: 5
      })
    });
    const posts = normalizePostsResponse(response);
    runtimeStatus.postsFound += posts.length;
    return posts;
  } catch (error) {
    addWarning(`CrustData person social posts were unavailable; continuing without them. ${sanitizeError(error)}`);
    return [];
  }
}

export async function searchPublicSentimentSignalsByPolicy(
  policyAnalysis: PolicyInput,
  options: { limitPerSource?: number } = {}
): Promise<CrustDataPublicSignal[]> {
  const limitPerSource = options.limitPerSource ?? 4;

  if (!isCrustDataConfigured()) {
    addWarning("CRUSTDATA_API_KEY is missing; public sentiment social signals used source-adapter fallback data.");
    const mockSignals = getMockPublicSignals(policyAnalysis);
    runtimeStatus.postsFound += mockSignals.length;
    return mockSignals;
  }

  const [linkedInSignals, twitterSignals, redditSignals] = await Promise.all([
    searchLinkedInPolicySignals(policyAnalysis, limitPerSource),
    searchWebPublicSignals(policyAnalysis, "twitter", limitPerSource),
    searchWebPublicSignals(policyAnalysis, "reddit", limitPerSource)
  ]);
  const signals = uniqueById([...linkedInSignals, ...twitterSignals, ...redditSignals]);

  if (signals.some((signal) => signal.source === "crustdata")) {
    runtimeStatus.usedLiveData = true;
  }
  runtimeStatus.postsFound += signals.length;

  return signals.length > 0 ? signals : getMockPublicSignals(policyAnalysis);
}

export function buildCrustDataPublicSignalEvidenceCards(
  policyAnalysis: PolicyInput,
  signals: CrustDataPublicSignal[]
): EvidenceCard[] {
  const geography = getJurisdiction(policyAnalysis);
  const policyDomain = getPolicyDomain(policyAnalysis);

  return signals.map((signal) =>
    createEvidenceCard({
      source_name: "CrustData",
      source_type: "stakeholder-social-signal",
      source_url: signal.url ?? "https://crustdata.com/",
      title: signal.title,
      excerpt: signal.excerpt,
      extracted_claim:
        signal.source === "crustdata"
          ? `${signal.platform} public activity contains a policy-relevant signal for scenario planning; it is not representative public opinion.`
          : `${signal.platform} source-adapter signal is a placeholder for public-signal retrieval; validate with live CrustData before use.`,
      geography,
      policy_domain: policyDomain,
      confidence: signal.confidence,
      limitation:
        "CrustData LinkedIn and web-search signals are public activity indicators, not representative resident sentiment or official stakeholder positions.",
      used_by_agents: ["sentiment_forecast", "narrative_risk"],
      supports: [`public-signal:${signal.platform}`, `policy-domain:${policyDomain}`],
      contradicts: [],
      raw_metadata: {
        provider: "CrustData",
        mode: signal.source === "crustdata" ? "live-api" : "source-adapter-fallback",
        platform: signal.platform,
        signal_type: signal.signalType,
        query: signal.query,
        author: signal.author,
        posted_at: signal.postedAt,
        engagement_signal: signal.engagementSignal,
        raw: signal.raw
      }
    })
  );
}

export function getCompanySignals(company: CrustDataCompany): CrustDataCompanySignal[] {
  const signals: CrustDataCompanySignal[] = [
    {
      type: "headcount",
      label: "Headcount / size",
      value: stringifySignal(company.employeeCount, "Employee count not reported"),
      confidence: company.source === "crustdata" ? 0.68 : 0.48,
      source: company.source
    },
    {
      type: "hiring",
      label: "Hiring signal",
      value: company.hiringSignal ?? inferHiringSignal(company),
      confidence: company.source === "crustdata" ? 0.62 : 0.46,
      source: company.source
    },
    {
      type: "headcount",
      label: "Headcount growth",
      value: company.headcountGrowth ?? "Growth signal not reported",
      confidence: company.source === "crustdata" ? 0.62 : 0.46,
      source: company.source
    },
    {
      type: "news",
      label: "News / market signal",
      value: company.newsSignal ?? inferNewsSignal(company),
      confidence: company.source === "crustdata" ? 0.58 : 0.44,
      source: company.source
    },
    {
      type: "webTraffic",
      label: "Web traffic",
      value: company.webTrafficSignal ?? "Web traffic signal not reported",
      confidence: company.source === "crustdata" ? 0.54 : 0.4,
      source: company.source
    },
    {
      type: "funding",
      label: "Funding",
      value: company.fundingStage ?? "Funding stage not reported",
      confidence: company.source === "crustdata" ? 0.52 : 0.38,
      source: company.source
    }
  ];

  return signals.filter((signal) => signal.value && signal.value !== "not reported");
}

export function getMockCrustDataStakeholders(policyAnalysis: PolicyInput): CrustDataStakeholderResult[] {
  const companies = getMockCompanies(policyAnalysis);
  return companies.map((company) => {
    const people = getMockPeople(company.name, getRelevantTitlesForCompany(company));
    const posts = getMockCompanyPosts(company.name, getPolicyDomain(policyAnalysis));
    const signals = getCompanySignals(company);
    const evidenceCards = [
      createCrustDataEvidenceCard({
        companyName: company.name,
        sourceType: "stakeholder-company-data",
        title: `${company.name} stakeholder profile`,
        excerpt: company.description ?? `${company.name} matched stakeholder query terms.`,
        extractedClaim: `${company.name} is likely to be affected through ${company.industry ?? "policy-relevant"} exposure.`,
        geography: company.headquarters ?? getJurisdiction(policyAnalysis),
        policyDomain: getPolicyDomain(policyAnalysis),
        confidence: 0.52,
        sourceUrl: company.linkedinUrl ?? "source-adapter://crustdata/company-profile",
        rawMetadata: { mode: "source-adapter-fallback", company }
      })
    ];

    return {
      company,
      people,
      posts,
      signals,
      evidenceCards,
      warnings: ["CrustData stakeholder result used source-adapter fallback data; validate live CrustData before final policy use."]
    };
  });
}

export function createCrustDataEvidenceCard(input: {
  companyName: string;
  title: string;
  excerpt: string;
  extractedClaim: string;
  geography: string;
  policyDomain: string;
  confidence: number;
  sourceType?: SourceType;
  rawMetadata?: Record<string, unknown>;
  sourceUrl?: string;
}): EvidenceCard {
  return createEvidenceCard({
    source_name: "CrustData",
    source_type: input.sourceType ?? "stakeholder-company-data",
    source_url: input.sourceUrl ?? "https://crustdata.com/",
    title: input.title,
    excerpt: input.excerpt,
    extracted_claim: input.extractedClaim,
    geography: input.geography,
    policy_domain: input.policyDomain,
    confidence: clampConfidence(input.confidence),
    limitation: crustDataLimitation(input.sourceType ?? "stakeholder-company-data"),
    used_by_agents: ["stakeholder_intelligence"],
    supports: [`stakeholder:${input.companyName}`],
    contradicts: [],
    raw_metadata: {
      provider: "CrustData",
      mode: isCrustDataConfigured() ? "live-api" : "mock-fallback",
      company_name: input.companyName,
      ...input.rawMetadata
    }
  });
}

export function buildCrustDataSearchFilters(policyAnalysis: PolicyInput): CrustDataSearchFilters {
  const queryText = getQueryText(policyAnalysis).toLowerCase();
  const industries = getAffectedIndustries(policyAnalysis);
  const explicitTerms = "affected_companies_query_terms" in policyAnalysis ? policyAnalysis.affected_companies_query_terms : [];
  const domainTerms = getDomainTerms(queryText);

  return {
    terms: unique([...explicitTerms, ...domainTerms, ...industries, getPolicyDomain(policyAnalysis)]).slice(0, 16),
    industries: unique([...industries, ...domainTerms.slice(0, 6)]).slice(0, 10),
    geography: getJurisdiction(policyAnalysis),
    limit: 20
  };
}

function buildCompanySearchPayload(filters: CrustDataSearchFilters) {
  return [
    {
      column: "KEYWORD",
      values: filters.terms.map((term) => ({ text: term, selection_type: "INCLUDED" }))
    },
    {
      column: "INDUSTRY",
      values: filters.industries.map((industry) => ({ text: industry, selection_type: "INCLUDED" }))
    },
    {
      column: "REGION",
      values: [{ text: filters.geography ?? "United States", selection_type: "INCLUDED" }]
    }
  ];
}

async function fetchWithAuth(path: string, options: RequestInit, scheme: AuthScheme, apiKey: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CRUSTDATA_CONFIG.timeoutMs);
  const headers = new Headers(options.headers);

  headers.set("Accept", "application/json");
  headers.set("Authorization", `${scheme} ${apiKey}`);
  headers.set("x-api-version", "2025-11-01");
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    return await fetch(`${CRUSTDATA_CONFIG.baseUrl}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
      cache: "no-store"
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function crustDataLinkedInFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  await scheduleLinkedInRequest();
  return crustDataFetch<T>(path, options);
}

function scheduleLinkedInRequest(): Promise<void> {
  const scheduled = linkedInRequestQueue.then(async () => {
    const elapsed = Date.now() - lastLinkedInRequestAt;
    const delayMs = Math.max(0, LINKEDIN_MIN_INTERVAL_MS - elapsed);
    if (delayMs > 0) {
      await sleep(delayMs);
    }
    lastLinkedInRequestAt = Date.now();
  });

  linkedInRequestQueue = scheduled.catch(() => undefined);
  return scheduled;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function crustDataPersonSearch(input: { companyName: string; titles: string[] }): Promise<unknown> {
  try {
    return await crustDataLinkedInFetch<unknown>("/person/search", {
      method: "POST",
      body: JSON.stringify({
        filters: [
          { field: "experience.company.name", type: "in", value: [input.companyName] },
          { field: "title", type: "contains_any", value: input.titles }
        ],
        limit: 8
      })
    });
  } catch (error) {
    addWarning(`CrustData /person/search was unavailable; trying legacy screener people search. ${sanitizeError(error)}`);
    return crustDataLinkedInFetch<unknown>("/screener/person/search", {
      method: "POST",
      body: JSON.stringify({
        filters: [
          {
            column: "CURRENT_COMPANY",
            values: [{ text: input.companyName, selection_type: "INCLUDED" }]
          },
          {
            column: "TITLE",
            values: input.titles.map((title) => ({ text: title, selection_type: "INCLUDED" }))
          }
        ],
        limit: 8
      })
    });
  }
}

async function searchLinkedInPolicySignals(policyAnalysis: PolicyInput, limit: number): Promise<CrustDataPublicSignal[]> {
  const query = buildPublicSignalQuery(policyAnalysis);

  try {
    const response = await crustDataLinkedInFetch<unknown>("/screener/social_posts/search", {
      method: "POST",
      body: JSON.stringify({
        keyword: query,
        page: 1,
        limit
      })
    });
    const signals = normalizePublicSignalResponse(response, "linkedin", "linkedin-post", query);
    return signals.length > 0 ? signals : getMockPublicSignals(policyAnalysis).filter((signal) => signal.platform === "linkedin");
  } catch (error) {
    addWarning(`CrustData LinkedIn public-signal search failed; mock LinkedIn sentiment signals were used. ${sanitizeError(error)}`);
    return getMockPublicSignals(policyAnalysis).filter((signal) => signal.platform === "linkedin");
  }
}

async function searchWebPublicSignals(
  policyAnalysis: PolicyInput,
  platform: "twitter" | "reddit",
  limit: number
): Promise<CrustDataPublicSignal[]> {
  const domain = platform === "twitter" ? "twitter.com OR x.com" : "reddit.com";
  const query = `${buildPublicSignalQuery(policyAnalysis)} site:${domain}`;

  try {
    const response = await crustDataFetch<unknown>("/screener/web-search", {
      method: "POST",
      body: JSON.stringify({
        query,
        limit,
        page: 1
      })
    });
    const signals = normalizePublicSignalResponse(response, platform, "web-search", query);
    return signals.length > 0 ? signals : getMockPublicSignals(policyAnalysis).filter((signal) => signal.platform === platform);
  } catch (error) {
    addWarning(`CrustData web-search for ${platform} failed; mock ${platform} public signals were used. ${sanitizeError(error)}`);
    return getMockPublicSignals(policyAnalysis).filter((signal) => signal.platform === platform);
  }
}

function normalizeAuthScheme(value: string): AuthScheme {
  return value.toLowerCase() === "token" ? "Token" : "Bearer";
}

function normalizeCompanySearchResponse(response: unknown, policyAnalysis: PolicyInput): CrustDataCompany[] {
  return extractRows(response).map((row, index) => normalizeCompanyRow(row, policyAnalysis, index));
}

function normalizeEnrichedCompanyResponse(response: unknown, fallback: CrustDataCompany): CrustDataCompany {
  const row = extractRows(response)[0];
  if (!row) return fallback;

  return {
    ...fallback,
    ...normalizeCompanyRow(row, fallbackPolicyInput(fallback), 0),
    source: "crustdata"
  };
}

function normalizeCompanyRow(row: Record<string, unknown>, policyAnalysis: PolicyInput, index: number): CrustDataCompany {
  const name = getString(row, ["name", "company_name", "company", "org_name", "companyName"]) ?? `Unknown company ${index + 1}`;
  const industry = getString(row, ["industry", "sector", "category", "industries"]) ?? getPolicyDomain(policyAnalysis);
  const domain = getString(row, ["domain", "website", "company_domain"]);
  const linkedinUrl = getString(row, ["linkedin_url", "linkedinUrl", "company_linkedin_url", "url"]);

  return {
    id: getString(row, ["id", "company_id", "crustdata_id", "linkedin_id"]) ?? stableId("company", name, domain ?? industry),
    name,
    domain,
    linkedinUrl,
    industry,
    description: getString(row, ["description", "short_description", "company_description"]) ?? `${name} matched policy stakeholder query terms.`,
    headquarters: getString(row, ["headquarters", "hq_location", "location", "region"]) ?? getJurisdiction(policyAnalysis),
    employeeCount: getNumberOrString(row, ["employee_count", "employees", "headcount", "num_employees"]),
    headcountGrowth: getString(row, ["headcount_growth", "headcount_growth_6m", "growth_signal", "headcount_qoq_pct"]),
    fundingStage: getString(row, ["funding_stage", "latest_funding_stage", "stage"]),
    webTrafficSignal: getString(row, ["web_traffic_signal", "website_traffic", "traffic_signal"]),
    hiringSignal: getString(row, ["hiring_signal", "job_openings_signal", "open_roles"]),
    newsSignal: getString(row, ["news_signal", "latest_news", "press_signal"]),
    socialSignal: getString(row, ["social_signal", "linkedin_signal", "post_signal"]),
    source: "crustdata",
    raw: row
  };
}

function normalizePeopleSearchResponse(response: unknown, companyName: string): CrustDataPerson[] {
  return extractRows(response).map((row, index) => ({
    id: getString(row, ["id", "person_id", "linkedin_id"]) ?? stableId("person", companyName, String(index)),
    name: getString(row, ["name", "full_name", "person_name"]) ?? "Unknown person",
    title: getString(row, ["title", "current_title", "headline"]),
    companyName: getString(row, ["company", "current_company", "company_name"]) ?? companyName,
    linkedinUrl: getString(row, ["linkedin_url", "profile_url", "url"]),
    location: getString(row, ["location", "region"]),
    source: "crustdata",
    raw: row
  }));
}

function normalizePostsResponse(response: unknown, companyName?: string): CrustDataPost[] {
  return extractRows(response).map((row, index) => ({
    id: getString(row, ["id", "post_id", "urn"]) ?? stableId("post", companyName ?? "unknown", String(index)),
    text: getString(row, ["text", "content", "post_text", "body"]) ?? "Post text unavailable",
    postedAt: getString(row, ["posted_at", "date", "created_at"]),
    url: getString(row, ["url", "post_url", "linkedin_url"]),
    author: getString(row, ["author", "author_name", "poster_name"]),
    companyName,
    linkedinUrl: getString(row, ["linkedin_url", "company_linkedin_url"]),
    engagementSignal: getString(row, ["engagement", "reactions", "engagement_signal"]),
    source: "crustdata",
    raw: row
  }));
}

function normalizePublicSignalResponse(
  response: unknown,
  platform: CrustDataPublicSignal["platform"],
  signalType: CrustDataPublicSignal["signalType"],
  query: string
): CrustDataPublicSignal[] {
  return extractRows(response).map((row, index) => {
    const title =
      getString(row, ["title", "headline", "name", "author", "poster_name"]) ??
      `${platform === "linkedin" ? "LinkedIn" : platform} policy signal`;
    const excerpt =
      getString(row, ["snippet", "excerpt", "text", "content", "post_text", "body", "description"]) ??
      "Public activity matched the policy query, but excerpt text was unavailable.";
    const url = getString(row, ["url", "post_url", "link", "linkedin_url"]);

    return {
      id: getString(row, ["id", "post_id", "result_id", "urn"]) ?? stableId("public-signal", platform, query, String(index)),
      platform,
      signalType,
      title,
      excerpt,
      url,
      author: getString(row, ["author", "author_name", "poster_name", "creator"]),
      postedAt: getString(row, ["posted_at", "date", "created_at", "published_at"]),
      engagementSignal: getString(row, ["engagement", "reactions", "comments", "engagement_signal"]),
      query,
      source: "crustdata",
      confidence: platform === "linkedin" ? 0.58 : 0.48,
      raw: row
    };
  });
}

function getMockCompanies(policyAnalysis: PolicyInput): CrustDataCompany[] {
  const queryText = `${getPolicyDomain(policyAnalysis)} ${getQueryText(policyAnalysis)}`.toLowerCase();
  if (/plastic|bag|retail|waste|packaging|recycling/.test(queryText)) {
    return plasticBagMockCompanies();
  }
  if (/tenant|housing|rent|landlord|property manager|property management|screening report|eviction|rental application/.test(queryText)) {
    return housingMockCompanies();
  }
  if (/health|hospital|patient|medicaid|clinic|provider|discharge|follow-up|insurance/.test(queryText)) {
    return healthcareMockCompanies();
  }
  if (/clean energy|solar|wind|storage|ev charging|grid|subsidy/.test(queryText)) {
    return cleanEnergyMockCompanies();
  }
  if (isAiHiringQuery(queryText)) {
    return aiHiringMockCompanies();
  }
  return genericMockCompanies(getJurisdiction(policyAnalysis));
}

function aiHiringMockCompanies(): CrustDataCompany[] {
  return [
    mockCompany("Workday", "workday.com", "Enterprise HR software", "Pleasanton, CA", "Large enterprise software provider with HR and workforce products.", "Large enterprise software provider", "AI hiring compliance features may become customer requirements."),
    mockCompany("HireVue", "hirevue.com", "AI recruiting and interviewing", "South Jordan, UT", "Automated interviewing and assessment vendor likely to be highly exposed to transparency and bias-audit rules.", "Specialized hiring technology vendor", "High product relevance to automated hiring scrutiny."),
    mockCompany("Greenhouse", "greenhouse.com", "Applicant tracking systems", "New York, NY", "Recruiting platform likely to support notices, appeals, and recordkeeping workflows.", "Common ATS platform", "Compliance workflows may become ATS buying criteria."),
    mockCompany("iCIMS", "icims.com", "Talent acquisition software", "Holmdel, NJ", "Enterprise recruiting platform with exposure to employer recordkeeping and compliance integration.", "Enterprise talent platform", "Customer demand may increase for audit and notice support."),
    mockCompany("Deloitte", "deloitte.com", "Compliance consulting", "Washington, DC", "Professional services firm likely to advise employers on AI governance and audit readiness.", "Large advisory firm", "Policy may increase demand for compliance advisory services."),
    mockCompany("DC Chamber of Commerce", undefined, "Employer advocacy", "Washington, DC", "Local business organization likely to amplify small-business compliance concerns.", "Cross-sector employer network", "Influence rises if compliance burden is framed as costly or unclear."),
    mockCompany("ACLU of DC", undefined, "Civil rights advocacy", "Washington, DC", "Civil-rights organization likely to press for meaningful transparency and appeal rights.", "Recognized local advocacy organization", "Support signal depends on enforcement credibility."),
    mockCompany("National Employment Law Project", "nelp.org", "Worker advocacy", "United States", "Worker advocacy organization likely to frame the rule around applicant rights.", "National labor-policy organization", "Could amplify support for enforceable recourse.")
  ];
}

function plasticBagMockCompanies(): CrustDataCompany[] {
  return [
    mockCompany("Plastic Industry Association", undefined, "Plastic packaging trade association", "United States", "Trade association likely to amplify manufacturing transition and retooling concerns.", "National industry association", "Demand contraction could elevate transition-grant advocacy."),
    mockCompany("Independent Retailer Coalition", undefined, "Retail and grocery operations", "United States", "Retail advocacy group likely to focus on substitute sourcing, staff training, and customer conflict.", "Cross-sector small-retailer exposure", "Influence grows if bag costs or enforcement confusion rise."),
    mockCompany("Reusable Packaging Supplier Network", undefined, "Reusable and paper bag supply", "United States", "Supplier network may benefit from demand shift while facing quality and supply scrutiny.", "Fragmented supplier ecosystem", "Demand may spike during phase-in."),
    mockCompany("National Waste and Recycling Operators", undefined, "Waste management and recycling", "United States", "Operational stakeholders likely to assess contamination and substitute-material effects.", "Municipal and commercial waste exposure", "Influence rises if waste metrics define success."),
    mockCompany("Environmental Defense Coalition", undefined, "Environmental advocacy", "United States", "Advocacy coalition likely to amplify waste-reduction benefits and scrutinize exemptions.", "National and local advocacy network", "Support depends on visible waste-reduction goals.")
  ];
}

function cleanEnergyMockCompanies(): CrustDataCompany[] {
  return [
    mockCompany("Solar Developer Network", undefined, "Solar development", "United States", "Clean energy developers may benefit from subsidy eligibility and permitting support.", "Project-development ecosystem", "Grant and tax-credit rules can shift investment timing."),
    mockCompany("Grid Infrastructure Coalition", undefined, "Grid infrastructure", "United States", "Transmission and interconnection stakeholders may face implementation bottlenecks.", "Infrastructure stakeholder network", "Influence rises if grid delays threaten subsidy delivery."),
    mockCompany("EV Charging Operators Association", undefined, "EV charging", "United States", "Charging operators may benefit from eligible infrastructure funding.", "Charging network exposure", "Compliance and siting rules can affect adoption.")
  ];
}

function housingMockCompanies(): CrustDataCompany[] {
  return [
    mockCompany("TransUnion SmartMove", "mysmartmove.com", "Tenant screening and credit reports", "United States", "Tenant-screening provider likely affected by rules on portable reports, screening criteria, and denial notices.", "National screening provider", "Demand may shift toward compliant portable screening workflows."),
    mockCompany("AppFolio", "appfolio.com", "Property management software", "Santa Barbara, CA", "Property-management platform with exposure to rental application, fee, disclosure, and screening workflow requirements.", "Large property software platform", "Compliance workflows may become a product requirement."),
    mockCompany("Zillow Rentals", "zillow.com", "Rental marketplace and applications", "United States", "Rental platform may be affected by portable application and screening-report expectations.", "Large rental marketplace", "Platform rules may influence landlord adoption."),
    mockCompany("National Apartment Association", "naahq.org", "Landlord and multifamily trade association", "United States", "Trade association likely to amplify landlord burden, screening-liability, and fee-cap concerns.", "National housing trade group", "Influence rises if compliance is framed as housing-supply friction."),
    mockCompany("Legal Aid Housing Coalition", undefined, "Tenant advocacy", "New York", "Tenant advocacy groups likely to support fee caps, screening transparency, and appeal rights if enforcement is credible.", "Housing advocacy network", "Support depends on usability for renters.")
  ];
}

function healthcareMockCompanies(): CrustDataCompany[] {
  return [
    mockCompany("Maryland Hospital Association", "mhaonline.org", "Hospital and provider trade association", "Maryland", "Hospital association likely to amplify provider capacity, reporting burden, and care-transition workflow concerns.", "Statewide provider association", "Influence rises if follow-up requirements are framed as unfunded operating burden."),
    mockCompany("Epic", "epic.com", "Electronic health records", "Verona, WI", "EHR vendor potentially relevant to discharge instructions, follow-up scheduling, and reporting workflow implementation.", "Large healthcare software vendor", "Demand may rise for reporting and care-transition workflow configuration."),
    mockCompany("Care Coordination Provider Network", undefined, "Care coordination services", "Maryland", "Care coordination organizations may be affected by follow-up scheduling and missed-visit reporting expectations.", "Provider network", "Operational demand may increase around high-risk Medicaid discharge workflows."),
    mockCompany("Medicaid Patient Advocacy Coalition", undefined, "Patient advocacy", "Maryland", "Patient advocates likely to support safer discharge and plain-language instructions while scrutinizing access and follow-through.", "Advocacy network", "Support depends on usable follow-up access and language access.")
  ];
}

function genericMockCompanies(jurisdiction: string): CrustDataCompany[] {
  return [
    mockCompany("Local Chamber of Commerce", undefined, "Employer advocacy", jurisdiction, "Represents local employer concerns about compliance cost and administrative burden.", "Umbrella organization with cross-sector member exposure", "Influence depends on member mobilization and local media uptake.")
  ];
}

function mockCompany(
  name: string,
  domain: string | undefined,
  industry: string,
  headquarters: string,
  description: string,
  employeeCount: string,
  headcountGrowth: string
): CrustDataCompany {
  return {
    id: stableId("mock-company", name, domain ?? industry),
    name,
    domain,
    linkedinUrl: domain ? `https://www.linkedin.com/company/${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : undefined,
    industry,
    description,
    headquarters,
    employeeCount,
    headcountGrowth,
    webTrafficSignal: "Web traffic not available in demo mode",
    hiringSignal: "Hiring signal inferred from policy relevance in demo mode",
    newsSignal: "News signal placeholder; validate with live CrustData or media sources",
    socialSignal: "Social signal placeholder; not an official policy position",
    source: "mock"
  };
}

function getMockCompanyByName(companyNameOrDomain: string): CrustDataCompany {
  const normalized = companyNameOrDomain.toLowerCase();
  return (
    [
      ...aiHiringMockCompanies(),
      ...plasticBagMockCompanies(),
      ...housingMockCompanies(),
      ...healthcareMockCompanies(),
      ...cleanEnergyMockCompanies(),
      ...genericMockCompanies("United States")
    ].find(
      (company) => company.name.toLowerCase() === normalized || company.domain?.toLowerCase() === normalized
    ) ??
    mockCompany(
      companyNameOrDomain,
      companyNameOrDomain.includes(".") ? companyNameOrDomain : undefined,
      "Policy-relevant stakeholder",
      "Unknown",
      "Fallback company profile matched stakeholder query terms.",
      "Size signal unavailable",
      "Growth signal unavailable"
    )
  );
}

function getMockPeople(companyName: string, titles: string[]): CrustDataPerson[] {
  const primaryTitle = titles[0] ?? "Policy lead";
  return [
    {
      id: stableId("mock-person", companyName, primaryTitle),
      name: `${companyName} ${primaryTitle}`,
      title: primaryTitle,
      companyName,
      location: "Unknown",
      linkedinUrl: undefined,
      source: "mock"
    }
  ];
}

function getMockCompanyPosts(companyName: string, keyword?: string): CrustDataPost[] {
  return [
    {
      id: stableId("mock-post", companyName, keyword ?? "policy"),
      text: `${companyName} has no confirmed live policy post in demo mode; stakeholder position is inferred from policy exposure.`,
      companyName,
      engagementSignal: "Demo social signal; not representative public sentiment",
      source: "mock"
    }
  ];
}

function getMockPublicSignals(policyAnalysis: PolicyInput): CrustDataPublicSignal[] {
  const query = buildPublicSignalQuery(policyAnalysis);
  const policyDomain = getPolicyDomain(policyAnalysis);

  return [
    {
      id: stableId("mock-public-signal", "linkedin", query),
      platform: "linkedin",
      signalType: "linkedin-post",
      title: "LinkedIn policy discussion placeholder",
      excerpt: `Professionals may discuss ${policyDomain} through compliance burden, implementation clarity, and trust in public-sector rollout.`,
      query,
      source: "mock",
      confidence: 0.42
    },
    {
      id: stableId("mock-public-signal", "twitter", query),
      platform: "twitter",
      signalType: "web-search",
      title: "Twitter/X amplification placeholder",
      excerpt:
        "Fast-moving online reaction may amplify simple fairness, cost, or government-overreach frames; this is not representative sentiment.",
      query,
      source: "mock",
      confidence: 0.36
    },
    {
      id: stableId("mock-public-signal", "reddit", query),
      platform: "reddit",
      signalType: "web-search",
      title: "Reddit discussion placeholder",
      excerpt:
        "Long-form public discussion may surface confusion, lived-experience anecdotes, and implementation complaints that require validation.",
      query,
      source: "mock",
      confidence: 0.34
    }
  ];
}

function buildPublicSignalQuery(policyAnalysis: PolicyInput): string {
  const queryText = getQueryText(policyAnalysis).toLowerCase();
  const terms = unique([
    getPolicyDomain(policyAnalysis),
    ...getDomainTerms(queryText).slice(0, 4),
    getJurisdiction(policyAnalysis)
  ]);

  return terms.join(" ");
}

function getDomainTerms(queryText: string): string[] {
  if (/plastic|bag|retail|waste|packaging|recycling/.test(queryText)) {
    return ["plastic packaging", "plastic film", "grocery retail", "reusable bags", "sustainable packaging", "waste management", "recycling"];
  }
  if (/tenant|housing|rent|landlord|property manager|property management|screening report|eviction|rental application/.test(queryText)) {
    return ["tenant screening", "property management software", "rental application platforms", "landlord associations", "tenant advocacy", "housing compliance"];
  }
  if (/health|hospital|patient|medicaid|clinic|provider|discharge|follow-up|insurance/.test(queryText)) {
    return ["hospital operations", "EHR vendors", "care coordination", "Medicaid managed care", "patient advocacy", "healthcare compliance"];
  }
  if (/clean energy|solar|wind|storage|ev charging|grid|subsidy/.test(queryText)) {
    return ["solar", "wind", "energy storage", "clean energy developers", "grid infrastructure", "EV charging", "grant consultants"];
  }
  if (isAiHiringQuery(queryText)) {
    return ["HR tech", "recruiting software", "AI recruiting", "applicant tracking system", "workforce software", "background check software", "compliance software"];
  }
  return ["compliance software", "industry association", "public affairs", "policy compliance"];
}

function isAiHiringQuery(queryText: string): boolean {
  return /ai|algorithm|automated|machine learning|model/.test(queryText) &&
    /hiring|employment|job applicant|job seeker|resume|résumé|recruit|candidate|interview|workforce|applicant tracking|ats|bias audit/.test(queryText);
}

function getRelevantTitlesForCompany(company: CrustDataCompany): string[] {
  const text = `${company.name} ${company.industry ?? ""}`.toLowerCase();
  if (/hr|hiring|recruit|applicant|workforce|ats|talent/.test(text)) {
    return ["Founder", "CEO", "General Counsel", "Head of Policy", "VP People", "Head of Compliance"];
  }
  if (/plastic|packaging|retail|grocery|waste|recycling|sustain/.test(text)) {
    return ["CEO", "COO", "General Counsel", "Head of Public Affairs", "Government Affairs", "Sustainability Lead"];
  }
  return ["Founder", "CEO", "COO", "General Counsel", "Head of Policy", "Head of Public Affairs", "Government Affairs"];
}

function extractRows(response: unknown): Record<string, unknown>[] {
  if (Array.isArray(response)) return response.filter(isRecord);
  if (!isRecord(response)) return [];

  const candidates = [response.data, response.results, response.companies, response.people, response.rows, response.posts];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate.filter(isRecord);
  }

  return [response];
}

function getAffectedIndustries(policyAnalysis: PolicyInput): string[] {
  if ("affected_industries" in policyAnalysis) return policyAnalysis.affected_industries;
  return policyAnalysis.affectedParties;
}

function getPolicyDomain(policyAnalysis: PolicyInput): string {
  if ("policy_domain" in policyAnalysis) return policyAnalysis.policy_domain;
  return policyAnalysis.policyName;
}

function getJurisdiction(policyAnalysis: PolicyInput): string {
  return policyAnalysis.jurisdiction || "Unspecified jurisdiction";
}

function getQueryText(policyAnalysis: PolicyInput): string {
  if ("policyText" in policyAnalysis) return policyAnalysis.policyText;
  return [
    policyAnalysis.policy_title,
    policyAnalysis.policy_domain,
    policyAnalysis.obligations.join(" "),
    policyAnalysis.affected_companies_query_terms.join(" "),
    policyAnalysis.sentiment_triggers.join(" ")
  ].join(" ");
}

function fallbackPolicyInput(company: CrustDataCompany): ParsedPolicy {
  return {
    policyName: company.industry ?? "Policy stakeholder",
    jurisdiction: company.headquarters ?? "United States",
    likelySponsor: "Policy team",
    policyText: company.description ?? company.name,
    objectives: [],
    mechanisms: [],
    affectedParties: [company.industry ?? "stakeholder"],
    complianceTriggers: [],
    likelyTimeline: "Unknown",
    assumptions: [],
    confidence: 0.5,
    sources: []
  };
}

function crustDataLimitation(sourceType: SourceType): string {
  if (sourceType === "stakeholder-social-signal") {
    return "CrustData company social/news signals may not reflect official policy position and do not represent full public sentiment.";
  }
  if (sourceType === "stakeholder-people-data") {
    return "CrustData reflects company/person/public activity signals; decision-maker relevance is inferred unless directly confirmed.";
  }
  return "CrustData reflects company/person/public activity signals, not representative public sentiment.";
}

function inferHiringSignal(company: CrustDataCompany): string {
  const text = `${company.name} ${company.industry ?? ""}`.toLowerCase();
  if (/hr|hiring|recruit|applicant|workforce|ats|talent/.test(text)) {
    return "Direct hiring workflow exposure through employer customers and product integrations.";
  }
  if (/consult|audit|compliance/.test(text)) {
    return "Policy may increase demand for compliance and audit advisory capacity.";
  }
  return "Indirect exposure through policy compliance, advocacy, or implementation influence.";
}

function inferNewsSignal(company: CrustDataCompany): string {
  if (company.newsSignal) return company.newsSignal;
  return "Company news signal should be validated with live CrustData posts/news before treating position as confirmed.";
}

function stringifySignal(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return value.toLocaleString("en-US");
  return fallback;
}

function getNumberOrString(row: Record<string, unknown>, keys: string[]): number | string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" || (typeof value === "string" && value.trim())) return value;
  }
  return undefined;
}

function getString(row: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
    if (Array.isArray(value) && value.length > 0) return value.map(String).join(", ");
  }
  return undefined;
}

function addWarning(message: string): void {
  runtimeStatus.warnings = unique([...runtimeStatus.warnings, message]);
}

function createInitialStatus(): CrustDataStatus {
  return {
    enabled: isCrustDataConfigured(),
    usedLiveData: false,
    warnings: [],
    companiesFound: 0,
    peopleFound: 0,
    postsFound: 0
  };
}

function sanitizeError(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") return "Request timed out.";
  if (error instanceof Error) return error.message.replace(process.env.CRUSTDATA_API_KEY ?? "", "[redacted]");
  return "Unknown CrustData adapter error.";
}

function stableId(...parts: string[]): string {
  const seed = parts.join("|");
  let hash = 0;
  for (let index = 0; index < seed.length; index++) {
    hash = (hash << 5) - hash + seed.charCodeAt(index);
    hash |= 0;
  }
  return `crust-${Math.abs(hash).toString(36)}`;
}

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 100) / 100));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items.filter(Boolean)));
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}
