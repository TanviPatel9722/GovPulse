import { createEvidenceCard, type EvidenceCard } from "@/lib/evidence/evidenceCard";

export type CensusAcsProfile = {
  geography: string;
  demographics: string;
  income: string;
  poverty: string;
  commute: string;
  housing_burden: string;
  evidence_cards: EvidenceCard[];
};

export async function fetchCensusAcsProfile(jurisdiction: string): Promise<CensusAcsProfile> {
  try {
    return await fetchLiveCensusAcsProfile(jurisdiction);
  } catch {
    return mockCensusAcsProfile(jurisdiction);
  }
}

async function fetchLiveCensusAcsProfile(jurisdiction: string): Promise<CensusAcsProfile> {
  const geography = censusGeography(jurisdiction);
  const variables = [
    "NAME",
    "DP02_0001E",
    "DP03_0005PE",
    "DP03_0062E",
    "DP03_0128PE",
    "DP04_0142PE"
  ];
  const url = new URL("https://api.census.gov/data/2023/acs/acs5/profile");
  url.searchParams.set("get", variables.join(","));
  url.searchParams.set("for", geography.forParam);

  if (geography.inParam) {
    url.searchParams.set("in", geography.inParam);
  }
  if (process.env.CENSUS_API_KEY) {
    url.searchParams.set("key", process.env.CENSUS_API_KEY);
  }

  const response = await fetchWithTimeout(url.toString());
  if (!response.ok) {
    throw new Error(`Census ACS request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as string[][];
  const [header, row] = payload;
  if (!header || !row) {
    throw new Error("Census ACS response was empty.");
  }

  const values = Object.fromEntries(header.map((key, index) => [key, row[index]]));
  const name = values.NAME || jurisdiction;
  const households = parseNumber(values.DP02_0001E);
  const laborParticipation = parseNumber(values.DP03_0005PE);
  const medianIncome = parseNumber(values.DP03_0062E);
  const povertyRate = parseNumber(values.DP03_0128PE);
  const highRentBurden = parseNumber(values.DP04_0142PE);
  const cards = [
    createEvidenceCard({
      source_name: "Census ACS",
      source_url: url.toString(),
      title: "ACS 2023 household income, poverty, labor, and housing context",
      excerpt: `${name}: median household income ${formatCurrency(medianIncome)}, poverty ${formatPercent(povertyRate)}, labor-force participation ${formatPercent(laborParticipation)}, high rent burden ${formatPercent(highRentBurden)}.`,
      extracted_claim:
        "Household reaction risk should be interpreted against income, poverty, labor-force participation, and housing-burden context.",
      geography: name,
      policy_domain: "economic exposure",
      confidence: 0.84,
      limitation:
        "ACS 5-year estimates are source-backed but lag current conditions and do not directly measure policy sentiment.",
      used_by_agents: ["economic_exposure"],
      supports: ["household_exposure", "equity_sensitivity", "public_sentiment_context"],
      contradicts: [],
      raw_metadata: {
        adapter: "fetchCensusAcsProfile",
        mode: "source-backed",
        year: 2023,
        variables: values
      }
    })
  ];

  return {
    geography: name,
    demographics: `${name} ACS baseline: ${formatNumber(households)} households; uneven access to legal, digital, and workforce resources should be validated locally.`,
    income: `ACS median household income: ${formatCurrency(medianIncome)}.`,
    poverty: `ACS poverty rate: ${formatPercent(povertyRate)}.`,
    commute: `ACS labor-force participation: ${formatPercent(laborParticipation)}; job-access policies are salient when hiring friction affects active workers and job seekers.`,
    housing_burden: `ACS renter households paying 35%+ of income toward rent: ${formatPercent(highRentBurden)}.`,
    evidence_cards: cards
  };
}

function mockCensusAcsProfile(jurisdiction: string): CensusAcsProfile {
  const cards = [
    createEvidenceCard({
      source_name: "Census ACS",
      source_url: "https://api.census.gov/data.html",
      title: "ACS household income and poverty profile",
      excerpt: "Mock ACS profile for hackathon demo: median household income and poverty context for local exposure.",
      extracted_claim:
        "Household sensitivity should be evaluated against income, poverty, housing burden, and commute patterns.",
      geography: jurisdiction,
      policy_domain: "economic exposure",
      confidence: 0.6,
      limitation: "Mock ACS values for demo; replace with ACS profile/detail table queries for production.",
      used_by_agents: ["economic_exposure"],
      supports: ["household_exposure", "equity_sensitivity"],
      contradicts: [],
      raw_metadata: {
        adapter: "fetchCensusAcsProfile",
        mode: "mock-fallback"
      }
    })
  ];

  return {
    geography: jurisdiction,
    demographics: "Mock: racially and economically diverse resident base with uneven access to legal and digital recourse.",
    income: "Mock median household income: $108,000; income distribution is highly unequal by neighborhood.",
    poverty: "Mock poverty rate: 13.5%, with higher vulnerability among residents facing employment barriers.",
    commute: "Mock commute signal: many workers rely on cross-jurisdiction employment flows and transit access.",
    housing_burden: "Mock housing burden: elevated rent pressure increases sensitivity to job-access disruptions.",
    evidence_cards: cards
  };
}

function censusGeography(jurisdiction: string): { forParam: string; inParam?: string } {
  const normalized = jurisdiction.toLowerCase();
  if (/washington|district of columbia|\bdc\b/.test(normalized)) {
    return { forParam: "state:11" };
  }
  if (/united states|national|usa|u\.s\./.test(normalized)) {
    return { forParam: "us:*" };
  }
  return { forParam: "us:*" };
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    return await fetch(url, { signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timeout);
  }
}

function parseNumber(value: string | undefined): number | null {
  if (!value || value === "-666666666" || value === "-888888888" || value === "-999999999") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrency(value: number | null): string {
  if (value === null) return "not available";
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function formatPercent(value: number | null): string {
  if (value === null) return "not available";
  return `${Math.round(value * 10) / 10}%`;
}

function formatNumber(value: number | null): string {
  if (value === null) return "not available";
  return Math.round(value).toLocaleString("en-US");
}
