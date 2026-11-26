import type { TaskName } from "@croatian-app/shared";

/** The only place model IDs are defined. */
export const MODELS = {
  /** Fast and cheap: quick translation, bubble, explanations, words of the day, drills. */
  fast: "claude-haiku-5-5",
  /** Higher quality: lessons, conversation, songs, weekly analysis, evaluations. */
  quality: "claude-sonnet-5-5",
} as const;

export type ModelTier = keyof typeof MODELS;
export type Effort = "low" | "medium" | "high";

export interface TaskConfig {
  tier: ModelTier;
  maxTokens: number;
  effort: Effort;
}

export const TASK_CONFIG: Record<TaskName, TaskConfig> = {
  translate: { tier: "fast", maxTokens: 4000, effort: "low" },
  explain: { tier: "fast", maxTokens: 4000, effort: "low" },
  word_lookup: { tier: "fast", maxTokens: 3000, effort: "low" },
  daily_words: { tier: "fast", maxTokens: 12000, effort: "medium" },
  drills: { tier: "fast", maxTokens: 12000, effort: "medium" },
  lesson: { tier: "quality", maxTokens: 16000, effort: "medium" },
  song_translate: { tier: "quality", maxTokens: 12000, effort: "medium" },
  conversation_start: { tier: "quality", maxTokens: 3000, effort: "low" },
  conversation_reply: { tier: "quality", maxTokens: 2000, effort: "low" },
  conversation_feedback: { tier: "quality", maxTokens: 8000, effort: "medium" },
  weekly_analysis: { tier: "quality", maxTokens: 6000, effort: "medium" },
  evaluation_generate: { tier: "quality", maxTokens: 16000, effort: "medium" },
  evaluation_assess: { tier: "quality", maxTokens: 8000, effort: "medium" },
};

/** Default number of AI requests allowed per UTC day (override with DAILY_LIMIT). */
export const DEFAULT_DAILY_LIMIT = 300;

/** Max request body size in bytes. */
export const MAX_BODY_BYTES = 100_000;

/** Access tokens shorter than this are treated as a misconfiguration. */
export const MIN_TOKEN_LENGTH = 32;
