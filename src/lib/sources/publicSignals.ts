import type { EvidenceSource } from "@/lib/types";

export const sourcePlaceholders = {
  policyText: {
    id: "src-policy-text",
    label: "Submitted policy text",
    type: "policy-text",
    detail: "Directly parsed from the user's proposed rule summary.",
    confidence: 0.9
  },
  dcRegister: {
    id: "src-dc-register",
    label: "DC Register and agency rulemaking docket placeholder",
    type: "public-comment-placeholder",
    detail: "Placeholder for rule text, hearing notices, submitted comments, and agency statements.",
    confidence: 0.62
  },
  laborMarket: {
    id: "src-labor-market",
    label: "DC employer and hiring activity dataset placeholder",
    type: "administrative-data-placeholder",
    detail: "Placeholder for employer counts, job posting volumes, hiring sectors, and local labor force exposure.",
    confidence: 0.58
  },
  civilRights: {
    id: "src-civil-rights",
    label: "Civil-rights and employment enforcement guidance placeholder",
    type: "implementation-benchmark",
    detail: "Placeholder for bias audit, adverse impact, notice, and applicant rights benchmarks.",
    confidence: 0.65
  },
  nist: {
    id: "src-nist-ai-rmf",
    label: "NIST AI Risk Management Framework placeholder",
    type: "implementation-benchmark",
    detail: "Placeholder for AI governance, documentation, transparency, monitoring, and accountability practices.",
    confidence: 0.66
  },
  publicListening: {
    id: "src-public-listening",
    label: "Public listening and media narrative placeholder",
    type: "public-comment-placeholder",
    detail: "Placeholder for applicant forums, employer testimony, advocacy statements, and local media framing.",
    confidence: 0.54
  }
} satisfies Record<string, EvidenceSource>;

export function getCoreEvidence(): EvidenceSource[] {
  return [
    sourcePlaceholders.policyText,
    sourcePlaceholders.dcRegister,
    sourcePlaceholders.laborMarket,
    sourcePlaceholders.publicListening
  ];
}
