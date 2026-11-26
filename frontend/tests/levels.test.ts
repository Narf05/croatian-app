import { describe, expect, it } from "vitest";
import { daysBetween, formatDate, localDate } from "../src/lib/dates";
import { cefrOf, DEFAULT_LEVELS, levelAbove, overallLevel, scaleProgress } from "../src/lib/levels";

describe("levels", () => {
  it("defaults every subject to B1.1", () => {
    expect(Object.values(DEFAULT_LEVELS)).toEqual(["B1.1", "B1.1", "B1.1", "B1.1"]);
  });

  it("overall level is the rounded average", () => {
    expect(overallLevel(DEFAULT_LEVELS)).toBe("B1.1");
    expect(overallLevel({ vocabulary: "B2.1", grammar: "B1.1", reading: "B1.2", writing: "B1.2" })).toBe("B1.2");
    expect(overallLevel({ vocabulary: "C1.1", grammar: "B2.1", reading: "B2.1", writing: "B2.1" })).toBe("B2.2");
  });

  it("finds the CEFR level and the level above (for words of the day)", () => {
    expect(cefrOf("B1.2")).toBe("B1");
    expect(levelAbove("B1.1")).toBe("B2");
    expect(levelAbove("B1.2", 2)).toBe("C1");
    expect(levelAbove("C2.1")).toBe("C2");
  });

  it("scale progress goes from 1/12 to 1", () => {
    expect(scaleProgress("A1.1")).toBeCloseTo(1 / 12);
    expect(scaleProgress("C2.2")).toBe(1);
  });
});

describe("dates", () => {
  it("formats local dates", () => {
    expect(localDate(new Date(2026, 10, 6))).toBe("2026-11-06");
    expect(formatDate(new Date(2026, 10, 26).toISOString())).toBe("26. 11. 2026.");
  });

  it("counts days across months", () => {
    expect(daysBetween("2026-11-28", "2026-12-02")).toBe(4);
    expect(daysBetween("2026-11-26", "2026-11-26")).toBe(0);
  });
});
