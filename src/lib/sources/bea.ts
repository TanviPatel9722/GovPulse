import { createEvidenceCard, type EvidenceCard } from "@/lib/evidence/evidenceCard";

export type BeaRegionalProfile = {
  geography: string;
  regional_gdp: string;
  personal_income: string;
  industry_output: string;
  evidence_cards: EvidenceCard[];
};

export async function fetchBeaRegionalProfile(jurisdiction: string, affectedIndustries: string[]): Promise<BeaRegionalProfile> {
  if (!process.env.BEA_API_KEY) {
    return mockBeaRegionalProfile(jurisdiction, affectedIndustries);
  }

  try {
    // Real implementation hook: use BEA regional GDP, personal income, and industry output endpoints.
    return mockBeaRegionalProfile(jurisdiction, affectedIndustries);
  } catch {
    return mockBeaRegionalProfile(jurisdiction, affectedIndustries);
  }
}

function mockBeaRegionalProfile(jurisdiction: string, affectedIndustries: string[]): BeaRegionalProfile {
  const cards = [
    createEvidenceCard({
      source_name: "BEA",
      source_url: "https://apps.bea.gov/API/signup/",
      title: "BEA regional income and output context",
      excerpt: "Mock BEA profile for hackathon demo: regional GDP, personal income, and sector output exposure.",
      extracted_claim:
        "Regional exposure depends on the concentration of affected industries and local income dependence.",
      geography: jurisdiction,
      policy_domain: "economic exposure",
      confidence: 0.56,
      limitation: "Mock BEA values for demo; replace with BEA regional API data for production.",
      used_by_agents: ["economic_exposure"],
      supports: ["regional_economic_context", "industry_exposure"],
      contradicts: [],
      raw_metadata: {
        adapter: "fetchBeaRegionalProfile",
        affected_industries: affectedIndustries,
        mode: "mock-fallback"
      }
    })
  ];

  return {
    geography: jurisdiction,
    regional_gdp: "Mock regional GDP context: services, government, education, healthcare, and professional sectors dominate local output.",
    personal_income: "Mock personal income context: high aggregate income masks large household vulnerability differences.",
    industry_output: `Mock industry output exposure: ${affectedIndustries.slice(0, 4).join(", ") || "policy-relevant sectors"} may absorb direct compliance costs.`,
    evidence_cards: cards
  };
}
