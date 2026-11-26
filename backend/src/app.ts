import { isTaskName, tasks, type ApiErrorCode, type TaskName } from "@croatian-app/shared";
import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { z } from "zod";
import type { AiCaller } from "./claude";
import {
  DEFAULT_DAILY_LIMIT,
  MAX_BODY_BYTES,
  MIN_TOKEN_LENGTH,
  MODELS,
  TASK_CONFIG,
} from "./config";
import { buildPrompt } from "./prompts";

/** Minimal KV interface (Cloudflare KV namespace) used for the daily request counter. */
export interface CounterStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface Bindings {
  ANTHROPIC_API_KEY: string;
  ACCESS_TOKEN: string;
  /** Comma-separated list of allowed browser origins. */
  ALLOWED_ORIGINS?: string;
  DAILY_LIMIT?: string;
  USAGE?: CounterStore;
}

export interface AppDeps {
  makeCaller: (env: Bindings) => AiCaller;
  now?: () => Date;
}

type Env = { Bindings: Bindings };

const STATUS: Record<ApiErrorCode, 400 | 401 | 404 | 422 | 429 | 502 | 503> = {
  unauthorized: 401,
  unknown_task: 404,
  invalid_input: 400,
  rate_limited: 429,
  ai_refused: 422,
  ai_invalid_output: 502,
  ai_unavailable: 503,
};

function fail(c: Context<Env>, code: ApiErrorCode) {
  return c.json({ error: code }, STATUS[code]);
}

/** Compare two strings in time independent of where they differ. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function allowedOrigins(env: Bindings): string[] {
  return (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

/** Count one request for today; returns false if the daily limit is reached. */
async function countRequest(env: Bindings, now: Date): Promise<boolean> {
  if (!env.USAGE) return true;
  const limit = Number.parseInt(env.DAILY_LIMIT ?? "", 10) || DEFAULT_DAILY_LIMIT;
  const key = `day:${now.toISOString().slice(0, 10)}`;
  const used = Number.parseInt((await env.USAGE.get(key)) ?? "0", 10) || 0;
  if (used >= limit) return false;
  await env.USAGE.put(key, String(used + 1), { expirationTtl: 2 * 24 * 3600 });
  return true;
}

// Output JSON schemas are static; build them once.
const outputSchemas = new Map<TaskName, Record<string, unknown>>();
function outputSchema(task: TaskName): Record<string, unknown> {
  let schema = outputSchemas.get(task);
  if (!schema) {
    const { $schema: _ignored, ...rest } = z.toJSONSchema(tasks[task].output) as Record<string, unknown>;
    schema = rest;
    outputSchemas.set(task, schema);
  }
  return schema;
}

export function createApp({ makeCaller, now = () => new Date() }: AppDeps) {
  const app = new Hono<Env>();

  app.use("*", (c, next) =>
    cors({
      origin: (origin) => (allowedOrigins(c.env).includes(origin) ? origin : null),
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Authorization", "Content-Type"],
      maxAge: 86400,
    })(c, next),
  );

  app.get("/health", (c) => c.json({ ok: true }));

  app.use("/ai/*", async (c, next) => {
    const expected = c.env.ACCESS_TOKEN ?? "";
    if (expected.length < MIN_TOKEN_LENGTH) {
      console.error(JSON.stringify({ event: "misconfigured", reason: "ACCESS_TOKEN missing or too short" }));
      return fail(c, "unauthorized");
    }
    const header = c.req.header("Authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!safeEqual(token, expected)) return fail(c, "unauthorized");
    await next();
  });

  app.post(
    "/ai/:task",
    bodyLimit({ maxSize: MAX_BODY_BYTES, onError: (c) => c.json({ error: "invalid_input" }, 400) }),
    async (c) => {
      const task = c.req.param("task");
      if (!isTaskName(task)) return fail(c, "unknown_task");

      let body: unknown;
      try {
        body = await c.req.json();
      } catch {
        return fail(c, "invalid_input");
      }
      const parsed = tasks[task].input.safeParse(body);
      if (!parsed.success) return fail(c, "invalid_input");

      if (!(await countRequest(c.env, now()))) return fail(c, "rate_limited");

      const config = TASK_CONFIG[task];
      const started = Date.now();
      const result = await makeCaller(c.env)({
        ...buildPrompt(task, parsed.data as never),
        model: MODELS[config.tier],
        schema: outputSchema(task),
        maxTokens: config.maxTokens,
        effort: config.effort,
        fallback: config.tier === "quality",
      });
      const log = { event: "ai_call", task, tier: config.tier, ms: Date.now() - started };

      if (!result.ok) {
        console.log(JSON.stringify({ ...log, outcome: result.reason }));
        if (result.reason === "refused") return fail(c, "ai_refused");
        if (result.reason === "truncated") return fail(c, "ai_invalid_output");
        return fail(c, "ai_unavailable");
      }

      let data: unknown;
      try {
        data = JSON.parse(result.text);
      } catch {
        console.log(JSON.stringify({ ...log, outcome: "invalid_json" }));
        return fail(c, "ai_invalid_output");
      }
      const output = tasks[task].output.safeParse(data);
      if (!output.success) {
        console.log(JSON.stringify({ ...log, outcome: "schema_mismatch" }));
        return fail(c, "ai_invalid_output");
      }
      console.log(JSON.stringify({ ...log, outcome: "ok" }));
      return c.json({ data: output.data });
    },
  );

  app.notFound((c) => c.json({ error: "not_found" }, 404));
  app.onError((error, c) => {
    console.error(JSON.stringify({ event: "unhandled", message: error.message }));
    return c.json({ error: "ai_unavailable" }, 500);
  });

  return app;
}
