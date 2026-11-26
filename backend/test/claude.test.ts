import { afterEach, describe, expect, it, vi } from "vitest";
import { createClaudeCaller, type AiRequest } from "../src/claude";

const request: AiRequest = {
  model: "claude-haiku-5-5",
  system: "sys",
  messages: [{ role: "user", content: "tjedan" }],
  schema: { type: "object", properties: {}, additionalProperties: false },
  maxTokens: 1000,
  effort: "low",
  fallback: false,
};

/** Fake the HTTP layer so the real SDK runs without touching the network. */
function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const message = (stop_reason: string, text = '{"a":1}') => ({
  id: "msg_1",
  type: "message",
  role: "assistant",
  model: "claude-haiku-5-5",
  content: [{ type: "text", text }],
  stop_reason,
  stop_sequence: null,
  usage: { input_tokens: 1, output_tokens: 1 },
});

afterEach(() => vi.unstubAllGlobals());

describe("createClaudeCaller", () => {
  it("sends model, schema and effort, and returns the text", async () => {
    const fetchMock = mockFetch(200, message("end_turn"));
    const result = await createClaudeCaller("sk-test")(request);
    expect(result).toEqual({ ok: true, text: '{"a":1}' });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("/v1/messages");
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe("claude-haiku-5-5");
    expect(body.output_config).toEqual({ effort: "low", format: { type: "json_schema", schema: request.schema } });
    expect(body).not.toHaveProperty("fallbacks");
  });

  it("enables server-side fallbacks when asked", async () => {
    const fetchMock = mockFetch(200, message("end_turn"));
    await createClaudeCaller("sk-test")({ ...request, model: "claude-sonnet-5-5", fallback: true });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(String(init?.body)).fallbacks).toBe("default");
    expect(new Headers(init?.headers).get("anthropic-beta")).toContain("server-side-fallback-2026-07-01");
  });

  it("reports refusals", async () => {
    mockFetch(200, message("refusal", ""));
    expect(await createClaudeCaller("sk-test")(request)).toEqual({ ok: false, reason: "refused" });
  });

  it("reports truncated output", async () => {
    mockFetch(200, message("max_tokens"));
    expect(await createClaudeCaller("sk-test")(request)).toEqual({ ok: false, reason: "truncated" });
  });

  it("maps API errors to unavailable", async () => {
    mockFetch(400, { type: "error", error: { type: "invalid_request_error", message: "bad" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await createClaudeCaller("sk-test")(request)).toEqual({ ok: false, reason: "unavailable" });
  });
});
