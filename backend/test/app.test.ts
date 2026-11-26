import { TASK_NAMES, type TaskName } from "@croatian-app/shared";
import { fixtures } from "@croatian-app/shared/fixtures";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, safeEqual, type Bindings, type CounterStore } from "../src/app";
import type { AiCaller } from "../src/claude";
import { MODELS, TASK_CONFIG } from "../src/config";

const TOKEN = "t".repeat(40);
const ORIGIN = "https://narf05.github.io";

class MemoryStore implements CounterStore {
  data = new Map<string, string>();
  async get(key: string) {
    return this.data.get(key) ?? null;
  }
  async put(key: string, value: string) {
    this.data.set(key, value);
  }
}

/** Minimal valid inputs for every task. */
const inputs: Record<TaskName, unknown> = {
  translate: { text: "tjedan", context: null },
  explain: { text: "tjedan", context: null },
  word_lookup: { word: "kruh", context: "Kupio sam kruh." },
  daily_words: { level: "B2", count: 21, exclude: [] },
  lesson: { topic: "instrumental", level: "B1.1", size: "short", goals: [] },
  song_translate: { title: "Pjesma", lyrics: "Moj dragi tjedan prolazi" },
  conversation_start: { level: "B1.1", recentScenarios: [] },
  conversation_reply: {
    level: "B1.1",
    scenario: "U pekari",
    aiRole: "prodavačica",
    messages: [{ role: "ai", text: "Dobar dan!" }, { role: "user", text: "Dobar dan, želim kruh." }],
  },
  conversation_feedback: {
    level: "B1.1",
    scenario: "U pekari",
    messages: [{ role: "user", text: "Želim jedna kruh." }],
  },
  drills: { level: "B1.1", words: [{ croatian: "knjiga", translation: "book" }], focus: null, count: 10 },
  weekly_analysis: {
    levels: [{ subject: "grammar", level: "B1.1" }],
    goals: [],
    stats: {
      wordsTotal: 10, wordsAddedThisWeek: 2, reviewsThisWeek: 30, correctRate: 0.8,
      lessonsThisWeek: 1, conversationsThisWeek: 1, drillsThisWeek: 1, drillCorrectRate: 0.7,
    },
    weakWords: [], recentMistakes: [], recentLessonTopics: [],
  },
  evaluation_generate: { kind: "placement", levels: [], goals: [] },
  evaluation_assess: {
    kind: "placement",
    levels: [],
    goals: [],
    scores: [{ subject: "vocabulary", correct: 8, total: 10, goalCorrect: 0, goalTotal: 0 }],
    writingPrompt: "Napiši poruku.",
    writingText: "Bok! Vikend je bio super.",
  },
};

function setup(caller: AiCaller, env: Partial<Bindings> = {}) {
  const store = new MemoryStore();
  const bindings: Bindings = {
    ANTHROPIC_API_KEY: "sk-test",
    ACCESS_TOKEN: TOKEN,
    ALLOWED_ORIGINS: `${ORIGIN},http://localhost:5173`,
    USAGE: store,
    ...env,
  };
  const app = createApp({ makeCaller: () => caller, now: () => new Date("2026-11-26T10:00:00Z") });
  const request = (task: string, body: unknown, headers: Record<string, string> = {}) =>
    app.request(
      `/ai/${task}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}`, ...headers },
        body: typeof body === "string" ? body : JSON.stringify(body),
      },
      bindings,
    );
  return { app, request, bindings, store };
}

/** A caller that answers with the fixture of the task it is told about. */
function fixtureCaller(task: TaskName) {
  return vi.fn<AiCaller>(async () => ({ ok: true, text: JSON.stringify(fixtures[task]) }));
}

describe("auth", () => {
  it("rejects a missing token", async () => {
    const { request } = setup(fixtureCaller("translate"));
    const res = await request("translate", inputs.translate, { Authorization: "" });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("rejects a wrong token", async () => {
    const caller = fixtureCaller("translate");
    const { request } = setup(caller);
    const res = await request("translate", inputs.translate, { Authorization: `Bearer ${"x".repeat(40)}` });
    expect(res.status).toBe(401);
    expect(caller).not.toHaveBeenCalled();
  });

  it("rejects everything when the server token is missing or too short", async () => {
    const { request } = setup(fixtureCaller("translate"), { ACCESS_TOKEN: "short" });
    const res = await request("translate", inputs.translate, { Authorization: "Bearer short" });
    expect(res.status).toBe(401);
  });

  it("allows health checks without a token", async () => {
    const { app, bindings } = setup(fixtureCaller("translate"));
    const res = await app.request("/health", {}, bindings);
    expect(res.status).toBe(200);
  });
});

describe("safeEqual", () => {
  it("compares strings", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});

describe("CORS", () => {
  it("allows the configured origin", async () => {
    const { app, bindings } = setup(fixtureCaller("translate"));
    const res = await app.request(
      "/ai/translate",
      { method: "OPTIONS", headers: { Origin: ORIGIN, "Access-Control-Request-Method": "POST" } },
      bindings,
    );
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN);
  });

  it("does not allow other origins", async () => {
    const { app, bindings } = setup(fixtureCaller("translate"));
    const res = await app.request(
      "/ai/translate",
      { method: "OPTIONS", headers: { Origin: "https://evil.example", "Access-Control-Request-Method": "POST" } },
      bindings,
    );
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});

describe("POST /ai/:task", () => {
  it.each(TASK_NAMES)("%s: returns validated data and uses the configured model", async (task) => {
    const caller = fixtureCaller(task);
    const { request } = setup(caller);
    const res = await request(task, inputs[task]);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: fixtures[task] });

    const req = caller.mock.calls[0]![0];
    expect(req.model).toBe(MODELS[TASK_CONFIG[task].tier]);
    expect(req.maxTokens).toBe(TASK_CONFIG[task].maxTokens);
    expect(req.fallback).toBe(TASK_CONFIG[task].tier === "quality");
    expect(req.schema).toMatchObject({ type: "object", additionalProperties: false });
    expect(req.schema).not.toHaveProperty("$schema");
    expect(req.system).toContain("standard Croatian");
  });

  it("uses Haiku for quick tasks and Sonnet for quality tasks", () => {
    expect(MODELS[TASK_CONFIG.translate.tier]).toBe("claude-haiku-5-5");
    expect(MODELS[TASK_CONFIG.explain.tier]).toBe("claude-haiku-5-5");
    expect(MODELS[TASK_CONFIG.daily_words.tier]).toBe("claude-haiku-5-5");
    expect(MODELS[TASK_CONFIG.lesson.tier]).toBe("claude-sonnet-5-5");
    expect(MODELS[TASK_CONFIG.conversation_reply.tier]).toBe("claude-sonnet-5-5");
    expect(MODELS[TASK_CONFIG.song_translate.tier]).toBe("claude-sonnet-5-5");
    expect(MODELS[TASK_CONFIG.weekly_analysis.tier]).toBe("claude-sonnet-5-5");
  });

  it("maps conversation history to user/assistant turns", async () => {
    const caller = fixtureCaller("conversation_reply");
    const { request } = setup(caller);
    await request("conversation_reply", inputs.conversation_reply);
    expect(caller.mock.calls[0]![0].messages).toEqual([
      { role: "assistant", content: "Dobar dan!" },
      { role: "user", content: "Dobar dan, želim kruh." },
    ]);
  });

  it("returns 404 for an unknown task", async () => {
    const { request } = setup(fixtureCaller("translate"));
    const res = await request("toString", {});
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "unknown_task" });
  });

  it("returns 400 for invalid JSON", async () => {
    const { request } = setup(fixtureCaller("translate"));
    const res = await request("translate", "{not json");
    expect(res.status).toBe(400);
  });

  it("returns 400 for input that does not match the schema", async () => {
    const caller = fixtureCaller("translate");
    const { request } = setup(caller);
    const res = await request("translate", { text: 5 });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_input" });
    expect(caller).not.toHaveBeenCalled();
  });

  it("returns 400 for a body that is too large", async () => {
    const { request } = setup(fixtureCaller("translate"));
    const res = await request("translate", { text: "a".repeat(200_000), context: null });
    expect(res.status).toBe(400);
  });

  it("returns 502 when the AI output does not match the schema", async () => {
    const caller = vi.fn<AiCaller>(async () => ({ ok: true, text: JSON.stringify({ translation: 1 }) }));
    const { request } = setup(caller);
    const res = await request("translate", inputs.translate);
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "ai_invalid_output" });
  });

  it("returns 502 when the AI output is not JSON", async () => {
    const caller = vi.fn<AiCaller>(async () => ({ ok: true, text: "Sorry" }));
    const { request } = setup(caller);
    expect((await request("translate", inputs.translate)).status).toBe(502);
  });

  it("returns 422 when the AI refuses", async () => {
    const caller = vi.fn<AiCaller>(async () => ({ ok: false, reason: "refused" }));
    const { request } = setup(caller);
    const res = await request("translate", inputs.translate);
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "ai_refused" });
  });

  it("returns 503 when the AI is unavailable", async () => {
    const caller = vi.fn<AiCaller>(async () => ({ ok: false, reason: "unavailable" }));
    const { request } = setup(caller);
    expect((await request("translate", inputs.translate)).status).toBe(503);
  });

  it("never includes the API key in a response", async () => {
    const caller = vi.fn<AiCaller>(async () => {
      throw new Error("boom sk-test");
    });
    const { request } = setup(caller);
    const res = await request("translate", inputs.translate);
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("sk-test");
  });
});

describe("daily limit", () => {
  let caller: ReturnType<typeof fixtureCaller>;
  beforeEach(() => {
    caller = fixtureCaller("translate");
  });

  it("counts requests per day and rejects above the limit", async () => {
    const { request, store } = setup(caller, { DAILY_LIMIT: "2" });
    expect((await request("translate", inputs.translate)).status).toBe(200);
    expect((await request("translate", inputs.translate)).status).toBe(200);
    const res = await request("translate", inputs.translate);
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "rate_limited" });
    expect(store.data.get("day:2026-11-26")).toBe("2");
    expect(caller).toHaveBeenCalledTimes(2);
  });

  it("does not count rejected (invalid) requests", async () => {
    const { request, store } = setup(caller, { DAILY_LIMIT: "1" });
    await request("translate", { text: 1 });
    expect(store.data.size).toBe(0);
  });
});

