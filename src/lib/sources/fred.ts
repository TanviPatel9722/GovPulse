import { createEvidenceCard, type EvidenceCard } from "@/lib/evidence/evidenceCard";

export type FredMacroProfile = {
  geography: string;
  macroeconomic_indicators: string;
  inflation: string;
  interest_rates: string;
  unemployment_trend: string;
  evidence_cards: EvidenceCard[];
};

export async function fetchFredMacroProfile(jurisdiction: string): Promise<FredMacroProfile> {
  if (!process.env.FRED_API_KEY) {
    return mockFredMacroProfile(jurisdiction);
  }

  try {
    // Real implementation hook: query FRED inflation, rates, unemployment, and regional time-series indicators.
    return mockFredMacroProfile(jurisdiction);
  } catch {
    return mockFredMacroProfile(jurisdiction);
  }
}

function mockFredMacroProfile(jurisdiction: string): FredMacroProfile {
  const cards = [
    createEvidenceCard({
      source_name: "FRED",
      source_url: "https://fred.stlouisfed.org/docs/api/fred/",
      title: "FRED macro sensitivity context",
      excerpt: "FRED source-adapter baseline: inflation, interest rate, and unemployment trend context.",
      extracted_claim:
        "Macroeconomic conditions can raise sensitivity to new compliance costs, job-search delays, and household burden.",
      geography: jurisdiction,
      policy_domain: "economic exposure",
      confidence: 0.55,
      limitation: "Fallback FRED baseline should be refreshed with live FRED series observations before production use.",
      used_by_agents: ["economic_exposure"],
      supports: ["regional_economic_context", "cost_of_living_sensitivity"],
      contradicts: [],
      raw_metadata: {
        adapter: "fetchFredMacroProfile",
        mode: "source-adapter-fallback"
      }
    })
  ];

  return {
    geography: jurisdiction,
    macroeconomic_indicators: "FRED baseline context: households and employers remain sensitive to inflation and borrowing costs.",
    inflation: "FRED baseline signal: elevated cost-of-living pressure increases reaction to job-access or compliance-cost narratives.",
    interest_rates: "FRED baseline signal: higher financing costs may make small employers more resistant to new compliance spending.",
    unemployment_trend: "FRED baseline signal: stable-to-soft labor market makes hiring fairness salient but cost narratives potent.",
    evidence_cards: cards
  };
}
