import type { EconoSenseAgentName, LLMMode } from "@/lib/llm/llmTypes";

export const MODEL_CONFIG = {
  policyParser: "gpt-4.1-mini",
  sentimentAgent: "gpt-4.1-mini",
  narrativeAgent: "gpt-4.1-mini",
  stakeholderAgent: "gpt-4.1-mini",
  economicAgent: "gpt-4.1-mini",
  fraudAgent: "gpt-4.1-mini",
  redesignAgent: "gpt-4.1-mini",
  memoAgent: "gpt-4o-mini",
  impactChainAgent: "gpt-4.1-mini",
  financeRiskAgent: "gpt-4.1-mini",
  marketShockAgent: "gpt-4.1-mini",
  socialContagionAgent: "gpt-4.1-mini",
  sourceAuditorAgent: "gpt-4.1-mini"
} as const satisfies Record<EconoSenseAgentName, string>;

export function getModelForAgent(agentName: EconoSenseAgentName): string {
  return MODEL_CONFIG[agentName];
}

export function isLLMConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function shouldUseDemoMode(mode: LLMMode = "demo"): boolean {
  return mode === "demo" || !isLLMConfigured();
}
