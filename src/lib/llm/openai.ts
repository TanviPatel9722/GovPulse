import { getJsonSchema, getRequiredFields } from "@/lib/llm/jsonSchemas";
import { isLLMConfigured, shouldUseDemoMode } from "@/lib/llm/modelRouter";
import type {
  CallOpenAIJsonOptions,
  CallOpenAITextOptions,
  OpenAIResponsesPayload
} from "@/lib/llm/llmTypes";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

export async function callOpenAIJson<T>(options: CallOpenAIJsonOptions<T>): Promise<T> {
  if (shouldUseDemoMode(options.mode)) {
    return safeFallbackResponse(options.fallback, "Demo mode or missing OPENAI_API_KEY; used deterministic fallback.");
  }

  return retryOnInvalidJson(options, 1);
}

export async function callOpenAIText(options: CallOpenAITextOptions): Promise<string> {
  if (shouldUseDemoMode(options.mode)) {
    return options.fallback;
  }

  try {
    const payload = await postOpenAI({
      model: options.model,
      input: buildInput(options.systemPrompt, options.userPrompt)
    });
    const text = extractOutputText(payload).trim();
    return text || options.fallback;
  } catch {
    return options.fallback;
  }
}

export function validateJsonResponse<T>(value: unknown, schemaName: string, requiredFields?: readonly string[]): T | null {
  if (!isRecord(value)) {
    return null;
  }

  const required = requiredFields ?? getRequiredFields(schemaName);
  const missing = required.filter((field) => !(field in value));

  if (missing.length > 0) {
    return null;
  }

  return value as T;
}

export async function retryOnInvalidJson<T>(
  options: CallOpenAIJsonOptions<T>,
  retriesRemaining = 1
): Promise<T> {
  try {
    const schema = getJsonSchema(options.schemaName);
    const payload = await postOpenAI({
      model: options.model,
      input: buildInput(options.systemPrompt, options.userPrompt),
      text: schema
        ? {
            format: {
              type: "json_schema",
              name: options.schemaName,
              strict: true,
              schema
            }
          }
        : {
            format: {
              type: "json_object"
            }
          }
    });
    const parsed = parseJsonObject(extractOutputText(payload));
    const validated = validateJsonResponse<T>(parsed, options.schemaName, options.requiredFields);

    if (validated) {
      return validated;
    }

    if (retriesRemaining > 0) {
      return retryOnInvalidJson(
        {
          ...options,
          userPrompt: `${options.userPrompt}\n\nReturn valid JSON that includes all required fields for ${options.schemaName}.`
        },
        retriesRemaining - 1
      );
    }
  } catch {
    // Fall through to sanitized fallback. Raw provider errors are intentionally not exposed to UI.
  }

  return safeFallbackResponse(options.fallback, "OpenAI response was unavailable or invalid; used deterministic fallback.");
}

export function safeFallbackResponse<T>(fallback: T, warning: string): T {
  if (isRecord(fallback)) {
    const existingWarnings = Array.isArray(fallback.warnings) ? fallback.warnings.map(String) : [];
    return {
      ...fallback,
      warnings: Array.from(new Set([...existingWarnings, warning]))
    } as T;
  }

  return fallback;
}

async function postOpenAI(body: Record<string, unknown>): Promise<OpenAIResponsesPayload> {
  if (!isLLMConfigured()) {
    throw new Error("OpenAI is not configured.");
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("OpenAI request failed.");
  }

  return (await response.json()) as OpenAIResponsesPayload;
}

function buildInput(systemPrompt: string, userPrompt: string) {
  return [
    {
      role: "system",
      content: [
        {
          type: "input_text",
          text: systemPrompt
        }
      ]
    },
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: userPrompt
        }
      ]
    }
  ];
}

function extractOutputText(payload: OpenAIResponsesPayload): string {
  if (typeof payload.output_text === "string") {
    return payload.output_text;
  }

  return (
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter((text): text is string => typeof text === "string")
      .join("\n") ?? ""
  );
}

function parseJsonObject(text: string): unknown {
  const trimmed = text.trim();

  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
