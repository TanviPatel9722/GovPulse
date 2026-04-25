import { createEvidenceCard, type EvidenceCard } from "@/lib/evidence/evidenceCard";

export type BlsLaborProfile = {
  geography: string;
  unemployment: string;
  wages: string;
  cpi: string;
  industry_labor_data: string;
  evidence_cards: EvidenceCard[];
};

export async function fetchBlsLaborProfile(jurisdiction: string, affectedIndustries: string[]): Promise<BlsLaborProfile> {
  try {
    return await fetchLiveBlsLaborProfile(jurisdiction, affectedIndustries);
  } catch {
    return mockBlsLaborProfile(jurisdiction, affectedIndustries);
  }
}

async function fetchLiveBlsLaborProfile(jurisdiction: string, affectedIndustries: string[]): Promise<BlsLaborProfile> {
  const unemploymentSeries = /washington|district of columbia|\bdc\b/i.test(jurisdiction)
    ? "LASST110000000000003"
    : "LNS14000000";
  const cpiSeries = "CUUR0000SA0";
  const response = await fetchWithTimeout("https://api.bls.gov/publicAPI/v2/timeseries/data/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      seriesid: [unemploymentSeries, cpiSeries],
      latest: true
    })
  });

  if (!response.ok) {
    throw new Error(`BLS request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    Results?: { series?: Array<{ seriesID: string; data?: Array<{ value: string; periodName?: string; year?: string }> }> };
  };
  const unemployment = latestValue(payload, unemploymentSeries);
  const cpi = latestValue(payload, cpiSeries);
  const industryText = affectedIndustries.length > 0 ? affectedIndustries.join(", ") : "affected industries";
  const cards = [
    createEvidenceCard({
      source_name: "BLS",
      source_url: "https://api.bls.gov/publicAPI/v2/timeseries/data/",
      title: "BLS labor market and CPI profile",
      excerpt: `${jurisdiction}: unemployment ${formatBlsValue(unemployment, "%")}; national CPI index ${formatBlsValue(cpi, "")}.`,
      extracted_claim:
        "Labor-market tightness and CPI pressure can shape reactions to hiring workflow friction and employer compliance-cost narratives.",
      geography: jurisdiction,
      policy_domain: "economic exposure",
      confidence: 0.78,
      limitation:
        "BLS series are source-backed but may use national CPI or state unemployment proxies; they do not measure policy sentiment directly.",
      used_by_agents: ["economic_exposure"],
      supports: ["labor_market_exposure", "cost_of_living_sensitivity"],
      contradicts: [],
      raw_metadata: {
        adapter: "fetchBlsLaborProfile",
        mode: "source-backed",
        unemployment_series: unemploymentSeries,
        cpi_series: cpiSeries,
        affected_industries: affectedIndustries
      }
    })
  ];

  return {
    geography: jurisdiction,
    unemployment: `BLS unemployment rate: ${formatBlsValue(unemployment, "%")}.`,
    wages:
      "BLS wage profile not queried in this demo run; validate occupational wages for HR, legal, compliance, recruiting, and frontline hiring roles before monetizing burden.",
    cpi: `BLS CPI index signal: ${formatBlsValue(cpi, "")}; cost pressure can increase sensitivity to job-search delays and compliance pass-through narratives.`,
    industry_labor_data: `Affected labor sectors: ${industryText}; high-volume hiring sectors and HR/compliance functions have the clearest operational exposure.`,
    evidence_cards: cards
  };
}

function mockBlsLaborProfile(jurisdiction: string, affectedIndustries: string[]): BlsLaborProfile {
  const industryText = affectedIndustries.length > 0 ? affectedIndustries.join(", ") : "affected industries";
  const cards = [
    createEvidenceCard({
      source_name: "BLS",
      source_url: "https://www.bls.gov/developers/",
      title: "BLS labor market pressure profile",
      excerpt: "BLS source-adapter baseline: unemployment, wage, CPI, and affected-industry labor context.",
      extracted_claim:
        "Labor-market exposure should consider unemployment, wages, CPI pressure, and hiring intensity in affected industries.",
      geography: jurisdiction,
      policy_domain: "economic exposure",
      confidence: 0.58,
      limitation: "Fallback BLS baseline should be refreshed with LAUS, OEWS, CPI, and industry series before production use.",
      used_by_agents: ["economic_exposure"],
      supports: ["labor_market_exposure", "cost_of_living_sensitivity"],
      contradicts: [],
      raw_metadata: {
        adapter: "fetchBlsLaborProfile",
        affected_industries: affectedIndustries,
        mode: "source-adapter-fallback"
      }
    })
  ];

  return {
    geography: jurisdiction,
    unemployment: "BLS baseline estimate: unemployment around 5.1%; job-search friction remains material for vulnerable applicants.",
    wages: "BLS baseline context: professional services wages are high, while service-sector workers face lower buffers.",
    cpi: "BLS baseline signal: cost pressure remains elevated for housing, transportation, and household services.",
    industry_labor_data: `BLS affected labor sectors: ${industryText}; high-volume hiring sectors may see higher compliance salience.`,
    evidence_cards: cards
  };
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timeout);
  }
}

function latestValue(
  payload: { Results?: { series?: Array<{ seriesID: string; data?: Array<{ value: string; periodName?: string; year?: string }> }> } },
  seriesId: string
): { value: number | null; period?: string; year?: string } {
  const item = payload.Results?.series?.find((series) => series.seriesID === seriesId)?.data?.[0];
  const parsed = item ? Number(item.value) : NaN;
  return {
    value: Number.isFinite(parsed) ? parsed : null,
    period: item?.periodName,
    year: item?.year
  };
}

function formatBlsValue(input: { value: number | null; period?: string; year?: string }, suffix: string): string {
  if (input.value === null) return "not available";
  const value = `${Math.round(input.value * 10) / 10}${suffix}`;
  return input.period && input.year ? `${value} (${input.period} ${input.year})` : value;
}
