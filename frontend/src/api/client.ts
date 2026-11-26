import type { ApiErrorCode, TaskInput, TaskName, TaskOutput } from "@croatian-app/shared";
import { getSettings } from "../db/settings";

export type AiErrorCode = ApiErrorCode | "offline" | "not_configured" | "network" | "unknown";

export class AiError extends Error {
  constructor(public readonly code: AiErrorCode) {
    super(code);
    this.name = "AiError";
  }
}

export interface AiOptions {
  fetchImpl?: typeof fetch;
  isOnline?: () => boolean;
}

/**
 * Call one AI task on the backend. Only ever called from a user action inside a feature
 * (or the weekly analysis / evaluations), never in the background.
 */
export async function ai<T extends TaskName>(
  task: T,
  input: TaskInput<T>,
  { fetchImpl = fetch, isOnline = () => navigator.onLine }: AiOptions = {},
): Promise<TaskOutput<T>> {
  if (!isOnline()) throw new AiError("offline");
  const { backendUrl, accessToken } = await getSettings();
  if (!backendUrl || !accessToken) throw new AiError("not_configured");

  let response: Response;
  try {
    response = await fetchImpl(`${backendUrl.replace(/\/+$/, "")}/ai/${task}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(input),
    });
  } catch {
    throw new AiError(isOnline() ? "network" : "offline");
  }

  let body: { data?: TaskOutput<T>; error?: ApiErrorCode } = {};
  try {
    body = await response.json();
  } catch {
    // fall through to the generic error below
  }
  if (response.ok && body.data !== undefined) return body.data;
  throw new AiError(body.error ?? "unknown");
}
