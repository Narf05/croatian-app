import { describe, expect, it } from "vitest";
import { cardFaces, checkTyped, choiceOptions, matchingRound, normalize, shuffle } from "../src/lib/study";
import { makeWord, seeded } from "./helpers";

const pool = [
  makeWord("tjedan", "week"),
  makeWord("kruh", "bread"),
  makeWord("karta", "ticket"),
  makeWord("kuća", "house"),
  makeWord("vlak", "train"),
  makeWord("dom", "house"), // same translation as kuća
];

describe("cardFaces", () => {
  it("shows Croatian first for hr-en and English first for en-hr", () => {
    expect(cardFaces(pool[0]!, "hr-en")).toEqual({ front: "tjedan", back: "week" });
    expect(cardFaces(pool[0]!, "en-hr")).toEqual({ front: "week", back: "tjedan" });
  });

  it("shows the wrong sentence first for mistake cards", () => {
    const m = makeWord("Želim jedan kruh.", "", {
      kind: "mistake",
      mistake: { wrong: "Želim jedna kruh.", explanation: { hr: "x", en: "y" } },
    });
    expect(cardFaces(m, "en-hr")).toEqual({ front: "Želim jedna kruh.", back: "Želim jedan kruh." });
  });
});

describe("choiceOptions", () => {
  it("contains the answer and distinct distractors", () => {
    const opts = choiceOptions(pool[3]!, pool, "hr-en", 4, seeded(3));
    expect(opts).toHaveLength(4);
    expect(opts).toContain("house");
    expect(new Set(opts).size).toBe(4);
    expect(opts.filter((o) => o === "house")).toHaveLength(1);
  });

  it("works with a small library", () => {
    const opts = choiceOptions(pool[0]!, pool.slice(0, 2), "en-hr", 4, seeded(1));
    expect(opts.sort()).toEqual(["kruh", "tjedan"]);
  });
});

describe("checkTyped", () => {
  it("accepts exact answers ignoring case, spaces and punctuation", () => {
    expect(checkTyped("  Tjedan ", "tjedan")).toBe("correct");
    expect(checkTyped("dobar dan!", "Dobar dan")).toBe("correct");
  });

  it("flags answers that only miss diacritics", () => {
    expect(checkTyped("kuca", "kuća")).toBe("diacritics");
    expect(checkTyped("djak", "đak")).toBe("diacritics");
  });

  it("accepts any of several answers", () => {
    expect(checkTyped("to write", "to write / write")).toBe("correct");
    expect(checkTyped("write", "to write / write")).toBe("correct");
  });

  it("rejects wrong or empty answers", () => {
    expect(checkTyped("kruh", "tjedan")).toBe("wrong");
    expect(checkTyped("   ", "tjedan")).toBe("wrong");
  });

  it("normalize lowercases Croatian letters", () => {
    expect(normalize("ŽENA, Čaša")).toBe("žena čaša");
  });
});

describe("matchingRound", () => {
  it("pairs each word with its translation, without duplicate translations", () => {
    const round = matchingRound(pool, 5, seeded(7));
    expect(round.left).toHaveLength(5);
    expect(round.right.map((r) => r.id).sort()).toEqual(round.left.map((l) => l.id).sort());
    expect(new Set(round.right.map((r) => r.text)).size).toBe(5);
  });
});

describe("shuffle", () => {
  it("keeps all items", () => {
    expect(shuffle([1, 2, 3, 4], seeded(2)).sort()).toEqual([1, 2, 3, 4]);
  });
});
