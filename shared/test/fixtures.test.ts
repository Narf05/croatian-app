import { describe, expect, it } from "vitest";
import { TASK_NAMES, tasks } from "../src/contract";
import { fixtures } from "../src/fixtures";
import { parseStressed } from "../src/stress";

describe("fixtures", () => {
  it.each(TASK_NAMES)("%s fixture satisfies its output schema", (name) => {
    const result = tasks[name].output.safeParse(fixtures[name]);
    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
  });

  it("all fixture stress markings are valid", () => {
    const entries = [
      ...fixtures.translate.entries,
      ...fixtures.daily_words.words,
      ...fixtures.lesson.vocabulary,
      fixtures.word_lookup.entry,
    ];
    for (const entry of entries) {
      const parsed = parseStressed(entry.stressed);
      expect(parsed.word, entry.stressed).toBe(entry.croatian);
      expect(parsed.stressIndex, entry.stressed).not.toBeNull();
    }
  });

  it("choice exercises have their answer among the options", () => {
    for (const part of fixtures.lesson.parts) {
      for (const ex of part.exercises) {
        if (ex.type === "choice") expect(ex.options).toContain(ex.answer);
      }
    }
  });
});
