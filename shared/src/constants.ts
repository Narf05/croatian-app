/** Plain constants (no zod), safe to import from the frontend bundle. */
export const SUBJECTS = ["vocabulary", "grammar", "reading", "writing"] as const;

export const SUBLEVELS = [
  "A1.1", "A1.2", "A2.1", "A2.2", "B1.1", "B1.2",
  "B2.1", "B2.2", "C1.1", "C1.2", "C2.1", "C2.2",
] as const;

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
