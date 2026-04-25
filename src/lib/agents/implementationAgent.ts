import type { ImplementationRisk, ParsedPolicy } from "@/lib/types";
import { sourcePlaceholders } from "@/lib/sources/publicSignals";

export function assessImplementationRisk(_policy: ParsedPolicy): ImplementationRisk {
  void _policy;

  return {
    overallLevel: "Elevated",
    bottlenecks: [
      {
        bottleneck: "Coverage definitions",
        riskLevel: "High",
        owner: "Rulemaking agency and legal counsel",
        likelyScenario:
          "Ambiguity around what counts as an automated hiring tool creates delayed compliance and inconsistent employer behavior.",
        mitigation: "Publish coverage examples, exclusions, and decision trees before the first enforcement date.",
        confidence: 0.72,
        sources: [sourcePlaceholders.dcRegister, sourcePlaceholders.nist]
      },
      {
        bottleneck: "Bias audit capacity",
        riskLevel: "Elevated",
        owner: "Employers, vendors, and third-party auditors",
        likelyScenario:
          "Demand for audits may exceed the supply of credible providers, especially for small employers and custom systems.",
        mitigation: "Create a safe-harbor audit template, staged first-year review, and approved methodology checklist.",
        confidence: 0.65,
        sources: [sourcePlaceholders.civilRights, sourcePlaceholders.laborMarket]
      },
      {
        bottleneck: "Applicant appeal workflow",
        riskLevel: "Elevated",
        owner: "Employers and enforcement agency",
        likelyScenario:
          "Appeal rights become symbolic unless employers can identify the decision, route review, and document outcomes.",
        mitigation: "Require response timelines, human-review records, and plain-language appeal notices.",
        confidence: 0.69,
        sources: [sourcePlaceholders.publicListening, sourcePlaceholders.civilRights]
      },
      {
        bottleneck: "Agency technical review",
        riskLevel: "Moderate",
        owner: "Implementing agency",
        likelyScenario:
          "The agency may need technical procurement and staff training to validate audit claims and triage complaints.",
        mitigation: "Fund technical review capacity and publish annual enforcement metrics.",
        confidence: 0.61,
        sources: [sourcePlaceholders.nist, sourcePlaceholders.dcRegister]
      }
    ],
    assumptions: [
      "The policy will need implementation guidance separate from the statutory or rule text.",
      "Bottleneck severity falls if first-year enforcement emphasizes correction over penalties for good-faith actors."
    ],
    confidence: 0.67,
    sources: [sourcePlaceholders.dcRegister, sourcePlaceholders.nist, sourcePlaceholders.civilRights]
  };
}
