import { DEFAULT_LEVELS, type Levels } from "../lib/levels";
import { db } from "./db";

export interface Settings {
  levels: Levels;
  /** Backend base URL, e.g. https://croatian-app-backend.example.workers.dev */
  backendUrl: string;
  /** Personal access token for the backend (a secret: never exported). */
  accessToken: string;
  /** True once the welcome/placement step is done or skipped. */
  onboarded: boolean;
  /** List selected the last time a word was saved (for one-tap saving). */
  lastListId: string | null;
  lastAnalysisAt: string | null;
}

export const SECRET_SETTINGS: (keyof Settings)[] = ["accessToken"];

/** Backend URL baked in at build time (can be overridden in Postavke). */
const BUILD_BACKEND_URL: string = import.meta.env?.VITE_BACKEND_URL ?? "";

export function defaultSettings(): Settings {
  return {
    levels: { ...DEFAULT_LEVELS },
    backendUrl: BUILD_BACKEND_URL,
    accessToken: "",
    onboarded: false,
    lastListId: null,
    lastAnalysisAt: null,
  };
}

export async function getSettings(): Promise<Settings> {
  const rows = await (await db()).getAll("settings");
  const settings = defaultSettings() as unknown as Record<string, unknown>;
  for (const row of rows) settings[row.key] = row.value;
  return settings as unknown as Settings;
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
  await (await db()).put("settings", { key, value });
}
