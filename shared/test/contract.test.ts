import { describe, expect, it } from "vitest";
import { z } from "zod";
import { isTaskName, TASK_NAMES, tasks, WordEntry } from "../src/contract";

const sampleEntry = {
  croatian: "tjedan",
  translation: "week",
  stressed: "tj[e]dan",
  partOfSpeech: "imenica",
  gender: "m",
  aspect: null,
  aspectPair: null,
  caseNote: "gen. jd. tjedna",
  example: { hr: "Vidimo se idući tjedan.", en: "See you next week." },
  serbianBosnian: "nedelja",
};

describe("contract", () => {
  it("accepts a valid word entry", () => {
    expect(WordEntry.parse(sampleEntry)).toEqual(sampleEntry);
  });

  it("rejects extra fields (strict objects)", () => {
    expect(() => WordEntry.parse({ ...sampleEntry, extra: 1 })).toThrow();
  });

  it("knows task names", () => {
    expect(isTaskName("translate")).toBe(true);
    expect(isTaskName("toString")).toBe(false);
    expect(isTaskName("nope")).toBe(false);
  });

  it("every output schema converts to a JSON schema without unsupported number/string limits", () => {
    for (const name of TASK_NAMES) {
      const schema = JSON.stringify(z.toJSONSchema(tasks[name].output));
      expect(schema, name).not.toMatch(/"(minLength|maxLength|minimum|maximum|minItems|maxItems)"/);
      expect(schema, name).toContain('"additionalProperties":false');
    }
  });

  it("rejects oversized input", () => {
    const res = tasks.translate.input.safeParse({ text: "a".repeat(6000), context: null });
    expect(res.success).toBe(false);
  });
});
