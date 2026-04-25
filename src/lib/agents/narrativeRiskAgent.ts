import type { NarrativeRisk, ParsedPolicy, SentimentGroupForecast } from "@/lib/types";
import { sourcePlaceholders } from "@/lib/sources/publicSignals";
import { callOpenAIJson } from "@/lib/llm/openai";
import { MODEL_CONFIG } from "@/lib/llm/modelRouter";
import { NARRATIVE_AGENT_SYSTEM_PROMPT, buildNarrativePrompt } from "@/lib/llm/prompts";
import type { PolicyAnalysis as ParserPolicyAnalysis } from "@/lib/agents/policyParser";
import type { EvidenceCard } from "@/lib/evidence/evidenceCard";
import type { LLMMode } from "@/lib/llm/llmTypes";
import type { SentimentForecast } from "@/lib/types";

export async function buildNarrativeRisk(
  policyAnalysis: ParserPolicyAnalysis,
  parsedPolicy: ParsedPolicy,
  sentimentForecast: SentimentForecast,
  legacySentiment: SentimentGroupForecast[],
  evidenceCards: EvidenceCard[],
  mode: LLMMode = "demo"
): Promise<NarrativeRisk> {
  const fallback = assessNarrativeRisk(parsedPolicy, legacySentiment);

  return callOpenAIJson<NarrativeRisk>({
    model: MODEL_CONFIG.narrativeAgent,
    systemPrompt: NARRATIVE_AGENT_SYSTEM_PROMPT,
    userPrompt: buildNarrativePrompt(policyAnalysis, sentimentForecast, evidenceCards),
    schemaName: "NarrativeRisk",
    fallback,
    mode
  });
}

export function assessNarrativeRisk(
  policy: ParsedPolicy,
  sentiment: SentimentGroupForecast[]
): NarrativeRisk {
  const policyText = [policy.policyName, policy.policyText, policy.mechanisms.join(" "), policy.affectedParties.join(" ")].join(" ");
  const topSupport = sentiment.slice().sort((left, right) => right.supportScore - left.supportScore)[0];
  const topConcern = sentiment.slice().sort((left, right) => right.concernScore - left.concernScore)[0];
  const isRightsPolicy = /right|appeal|protect|fair|safety|equity|civil rights|disclos|transparen/i.test(policyText);
  const isCostPolicy = /cost|fee|tax|penalt|fine|audit|report|mandate|require|compliance/i.test(policyText);
  const isAccessPolicy = /benefit|eligibility|application|tenant|patient|student|worker|applicant|household|service/i.test(policyText);

  return {
    overallLevel: topConcern?.concernScore && topConcern.concernScore > 70 ? "High" : "Elevated",
    likelyScenario: `The policy is likely to be framed through ${topSupport?.group ?? "affected beneficiaries"} support and ${topConcern?.group ?? "burdened stakeholders"} concern. The main narrative risk is whether residents see a clear public benefit before they hear cost, burden, or implementation doubts.`,
    frames: [
      {
        frame: isRightsPolicy ? "Public benefit versus implementation reality" : "Policy intent versus everyday friction",
        riskSignal: `${topSupport?.group ?? "Supporters"} may amplify the policy if the benefit is simple, visible, and backed by evidence.`,
        likelyAmplifiers: [topSupport?.group ?? "affected beneficiaries", "community organizations", "local media"],
        mitigationMessage:
          "Lead with the practical benefit, name the evidence quality, and explain what changes for affected people on day one.",
        confidence: 0.64,
        sources: [sourcePlaceholders.publicListening, sourcePlaceholders.civilRights]
      },
      {
        frame: isCostPolicy ? "Cost and compliance burden" : "Unclear rules and trust gap",
        riskSignal: `${topConcern?.group ?? "Concerned groups"} may consolidate opposition if deadlines, costs, coverage, or enforcement are unclear.`,
        likelyAmplifiers: [topConcern?.group ?? "concerned groups", "trade associations", "local opinion media"],
        mitigationMessage:
          "Pair the policy with phase-in rules, templates, service levels, and a direct answer to who pays and who is covered.",
        confidence: 0.62,
        sources: [sourcePlaceholders.laborMarket, sourcePlaceholders.dcRegister]
      },
      {
        frame: isAccessPolicy ? "Access promise versus usable process" : "Evidence gap and accountability",
        riskSignal: "Support can weaken if residents believe the policy is symbolic, underfunded, or hard to use.",
        likelyAmplifiers: ["advocacy organizations", "public comment participants", "implementation watchdogs"],
        mitigationMessage:
          "Publish source-backed assumptions, validation questions, implementation metrics, and a visible correction path.",
        confidence: 0.6,
        sources: [sourcePlaceholders.civilRights, sourcePlaceholders.publicListening]
      }
    ],
    assumptions: [
      "Narrative risk depends heavily on whether the government releases plain-language materials before enforcement.",
      "Public sentiment should be validated separately from stakeholder, media, and online amplification signals."
    ],
    confidence: 0.63,
    sources: [sourcePlaceholders.publicListening, sourcePlaceholders.dcRegister, sourcePlaceholders.laborMarket]
  };
}
