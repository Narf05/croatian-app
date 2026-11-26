import { describe, expect, it } from "vitest";
import { markStressed, parseStressed, stressableIndexes } from "../src/stress";

describe("parseStressed", () => {
  it("finds the stressed vowel", () => {
    expect(parseStressed("tj[e]dan")).toEqual({ word: "tjedan", stressIndex: 2 });
  });

  it("accepts a syllabic r", () => {
    expect(parseStressed("v[r]t")).toEqual({ word: "vrt", stressIndex: 1 });
  });

  it("counts characters, not UTF-16 units, with Croatian letters", () => {
    expect(parseStressed("ž[e]na")).toEqual({ word: "žena", stressIndex: 1 });
    expect(parseStressed("dj[e]čak")).toEqual({ word: "dječak", stressIndex: 2 });
  });

  it("works on multi-word expressions", () => {
    expect(parseStressed("d[o]bar dan")).toEqual({ word: "dobar dan", stressIndex: 1 });
  });

  it("rejects more than one marked letter", () => {
    expect(parseStressed("d[o]bar d[a]n")).toEqual({ word: "dobar dan", stressIndex: null });
  });

  it("returns null stress for missing brackets", () => {
    expect(parseStressed("tjedan")).toEqual({ word: "tjedan", stressIndex: null });
  });

  it("returns null stress when a consonant is marked", () => {
    expect(parseStressed("[t]jedan")).toEqual({ word: "tjedan", stressIndex: null });
  });

  it("trims whitespace", () => {
    expect(parseStressed("  k[u]ća ")).toEqual({ word: "kuća", stressIndex: 1 });
  });
});

describe("markStressed", () => {
  it("round-trips with parseStressed", () => {
    const parsed = parseStressed("dj[e]čak");
    expect(markStressed(parsed.word, parsed.stressIndex)).toBe("dj[e]čak");
  });

  it("leaves the word alone without a valid index", () => {
    expect(markStressed("kuća", null)).toBe("kuća");
    expect(markStressed("kuća", 10)).toBe("kuća");
  });
});

describe("stressableIndexes", () => {
  it("lists vowels and r", () => {
    expect(stressableIndexes("vrt")).toEqual([1]);
    expect(stressableIndexes("kuća")).toEqual([1, 3]);
  });
});
