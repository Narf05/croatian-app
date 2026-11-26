import Anthropic from "@anthropic-ai/sdk";
import type { Effort } from "./config";
import type { Prompt } from "./prompts";

export interface AiRequest extends Prompt {
  model: string;
  /** JSON schema the response must follow (structured outputs). */
  schema: Record<string, unknown>;
  maxTokens: number;
  effort: Effort;
  /** Use server-side refusal fallbacks (supported on the quality model). */
  fallback: boolean;
}

export type AiResult =
  | { ok: true; text: string }
  | { ok: false; reason: "refused" | "truncated" | "unavailable" };

export type AiCaller = (request: AiRequest) => Promise<AiResult>;

type Block = { type: string; text?: unknown };

function textOf(content: readonly Block[]): string {
  return content
    .flatMap((block) => (block.type === "text" && typeof block.text === "string" ? [block.text] : []))
    .join("");
}

/** The real caller, backed by the Anthropic SDK. */
export function createClaudeCaller(apiKey: string): AiCaller {
  const client = new Anthropic({ apiKey, maxRetries: 2 });

  return async (req) => {
    const base = {
      model: req.model,
      max_tokens: req.maxTokens,
      system: req.system,
      messages: req.messages,
      output_config: {
        effort: req.effort,
        format: { type: "json_schema" as const, schema: req.schema },
      },
    };
    try {
      const response = req.fallback
        ? await client.beta.messages.create({
            ...base,
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
          })
        : await client.messages.create(base);

      if (response.stop_reason === "refusal") return { ok: false, reason: "refused" };
      if (response.stop_reason === "max_tokens") return { ok: false, reason: "truncated" };
      return { ok: true, text: textOf(response.content) };
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        console.error(JSON.stringify({ event: "anthropic_error", status: error.status }));
        return { ok: false, reason: "unavailable" };
      }
      throw error;
    }
  };
}
