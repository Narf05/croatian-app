import { fixtures } from "@croatian-app/shared/fixtures";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ai, AiError } from "../src/api/client";
import { setSetting } from "../src/db/settings";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

beforeEach(async () => {
  await setSetting("backendUrl", "https://backend.example/");
  await setSetting("accessToken", "token-123");
});

describe("ai client", () => {
  it("posts the task with the access token and returns the data", async () => {
    const fetchImpl = vi.fn(async () => json(200, { data: fixtures.translate }));
    const out = await ai("translate", { text: "tjedan", context: null }, { fetchImpl, isOnline: () => true });
    expect(out).toEqual(fixtures.translate);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://backend.example/ai/translate");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer token-123");
    expect(JSON.parse(String(init.body))).toEqual({ text: "tjedan", context: null });
  });

  it("fails fast when offline, without calling the backend", async () => {
    const fetchImpl = vi.fn();
    await expect(
      ai("translate", { text: "x", context: null }, { fetchImpl, isOnline: () => false }),
    ).rejects.toMatchObject({ code: "offline" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reports missing backend settings", async () => {
    await setSetting("accessToken", "");
    await expect(
      ai("translate", { text: "x", context: null }, { fetchImpl: vi.fn(), isOnline: () => true }),
    ).rejects.toMatchObject({ code: "not_configured" });
  });

  it("passes backend error codes through", async () => {
    const fetchImpl = vi.fn(async () => json(429, { error: "rate_limited" }));
    const err = await ai("translate", { text: "x", context: null }, { fetchImpl, isOnline: () => true }).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(AiError);
    expect((err as AiError).code).toBe("rate_limited");
  });

  it("reports network failures", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(
      ai("translate", { text: "x", context: null }, { fetchImpl, isOnline: () => true }),
    ).rejects.toMatchObject({ code: "network" });
  });

  it("reports unknown responses", async () => {
    const fetchImpl = vi.fn(async () => new Response("<html>", { status: 500 }));
    await expect(
      ai("translate", { text: "x", context: null }, { fetchImpl, isOnline: () => true }),
    ).rejects.toMatchObject({ code: "unknown" });
  });
});
