export type LLMMode = "demo" | "live";

export type LLMProvider = "openai" | "demo-fallback";

export type LLMWarning = {
  code: string;
  message: string;
};

export type EconoSenseAgentName =
  | "policyParser"
  | "sentimentAgent"
  | "narrativeAgent"
  | "stakeholderAgent"
  | "economicAgent"
  | "fraudAgent"
  | "redesignAgent"
  | "memoAgent"
  | "impactChainAgent"
  | "financeRiskAgent"
  | "marketShockAgent"
  | "socialContagionAgent"
  | "sourceAuditorAgent";

export type JsonSchema = {
  type: "object" | "array" | "string" | "number" | "integer" | "boolean";
  properties?: Record<string, JsonSchema | { [key: string]: unknown }>;
  items?: JsonSchema | { [key: string]: unknown };
  required?: string[];
  additionalProperties?: boolean | JsonSchema | { [key: string]: unknown };
  enum?: string[];
  description?: string;
  [key: string]: unknown;
};

export type CallOpenAIJsonOptions<T> = {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  schemaName: string;
  fallback: T;
  mode?: LLMMode;
  requiredFields?: readonly string[];
};

export type CallOpenAITextOptions = {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  fallback: string;
  mode?: LLMMode;
};

export type OpenAIResponsesPayload = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};
