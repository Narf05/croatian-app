import type { TaskName, TaskOutput } from "@croatian-app/shared";
import { fixtures } from "@croatian-app/shared/fixtures";
import { expect, type Page, type Route } from "@playwright/test";

export const BACKEND = "https://backend.test";
export const TOKEN = "e2e-token-0123456789-0123456789-abcdef";

export interface MockBackend {
  /** Task names in the order they were called. */
  calls: TaskName[];
  /** Request bodies per call. */
  bodies: unknown[];
  /** Override the response for a task. */
  respond<T extends TaskName>(task: T, output: TaskOutput<T> | ((input: unknown) => TaskOutput<T>)): void;
  /** Make a task fail with an API error code and status. */
  fail(task: TaskName, error: string, status: number): void;
}

/** Intercept every backend call and answer with the shared fixtures. */
export async function mockBackend(page: Page): Promise<MockBackend> {
  const overrides = new Map<string, (input: unknown) => unknown>();
  const failures = new Map<string, { error: string; status: number }>();
  const mock: MockBackend = {
    calls: [],
    bodies: [],
    respond: (task, output) =>
      overrides.set(task, typeof output === "function" ? (output as (i: unknown) => unknown) : () => output),
    fail: (task, error, status) => failures.set(task, { error, status }),
  };
  await page.route(`${BACKEND}/**`, async (route: Route) => {
    const url = new URL(route.request().url());
    const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    if (url.pathname === "/health") return route.fulfill({ json: { ok: true }, headers: cors });
    const task = url.pathname.replace("/ai/", "") as TaskName;
    expect(route.request().headers()["authorization"]).toBe(`Bearer ${TOKEN}`);
    const body = route.request().postDataJSON();
    mock.calls.push(task);
    mock.bodies.push(body);
    const failure = failures.get(task);
    if (failure) return route.fulfill({ status: failure.status, json: { error: failure.error }, headers: cors });
    const data = overrides.get(task)?.(body) ?? fixtures[task];
    return route.fulfill({ json: { data }, headers: cors });
  });
  return mock;
}

type Rows = Partial<Record<string, unknown[]>>;

/** Write rows straight into the app's IndexedDB, then reload. */
export async function seed(page: Page, rows: Rows): Promise<void> {
  await page.evaluate(async (data) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("croatian-app");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const stores = Object.keys(data);
    const tx = db.transaction(stores, "readwrite");
    for (const store of stores) for (const row of data[store] ?? []) tx.objectStore(store).put(row);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, rows);
  await page.reload();
}

const setting = (key: string, value: unknown) => ({ key, value });

/**
 * Open the app as an onboarded user (backend configured, placement test done today).
 * Pass `analysisDone: false` to see the weekly-analysis card, and `placementDone: false`
 * to provide your own evaluations in `extra`.
 */
export async function openApp(
  page: Page,
  { analysisDone = true, placementDone = true, extra = {} as Rows } = {},
): Promise<MockBackend> {
  const mock = await mockBackend(page);
  page.on("dialog", (d) => void d.accept());
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dobro došli!" })).toBeVisible();
  const done = {
    id: "ev-done",
    kind: "placement",
    createdAt: new Date().toISOString(),
    status: "done",
    test: fixtures.evaluation_generate,
    answers: {},
    writingText: "",
    assessment: fixtures.evaluation_assess,
    confirmedLevels: null,
  };
  await seed(page, {
    ...extra,
    settings: [
      setting("backendUrl", BACKEND),
      setting("accessToken", TOKEN),
      setting("onboarded", true),
      setting("lastAnalysisAt", analysisDone ? new Date().toISOString() : null),
      ...((extra.settings as unknown[]) ?? []),
    ],
    evaluations: [...(placementDone ? [done] : []), ...((extra.evaluations as unknown[]) ?? [])],
  });
  await expect(page.getByRole("heading", { name: "Hrvatski" })).toBeVisible();
  return mock;
}

/** A library word row as stored in IndexedDB. */
export function wordRow(croatian: string, translation: string, extra: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  return {
    id: `w-${croatian}`,
    kind: "word",
    croatian,
    translation,
    stressIndex: null,
    partOfSpeech: null,
    gender: null,
    aspect: null,
    aspectPair: null,
    caseNote: null,
    example: null,
    serbianBosnian: null,
    mistake: null,
    source: "manual",
    createdAt: now,
    listIds: [],
    srs: { ease: 2.5, intervalDays: 0, reps: 0, lapses: 0, due: now, lastReviewed: null, correct: 0, wrong: 0 },
    ...extra,
  };
}

export async function goTo(page: Page, hash: string): Promise<void> {
  await page.evaluate((h) => (location.hash = h), hash);
}
