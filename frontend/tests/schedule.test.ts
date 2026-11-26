import { fixtures } from "@croatian-app/shared/fixtures";
import { describe, expect, it } from "vitest";
import { analysisDue, batchFor, evaluationDue, todaysWords, unfinishedEvaluation } from "../src/lib/schedule";
import type { DailyBatch, Evaluation } from "../src/types";

const words = Array.from({ length: 21 }, (_, i) => ({ ...fixtures.daily_words.words[0]!, croatian: `r${i}` }));
const batch: DailyBatch = { id: "b1", startDate: "2026-11-23", createdAt: "2026-11-23T08:00:00Z", words };

describe("words of the day", () => {
  it("gives 3 words per day from the batch", () => {
    expect(todaysWords([batch], "2026-11-23").map((w) => w.croatian)).toEqual(["r0", "r1", "r2"]);
    expect(todaysWords([batch], "2026-11-26").map((w) => w.croatian)).toEqual(["r9", "r10", "r11"]);
    expect(todaysWords([batch], "2026-11-29").map((w) => w.croatian)).toEqual(["r18", "r19", "r20"]);
  });

  it("has no words outside the batch week", () => {
    expect(todaysWords([batch], "2026-11-30")).toEqual([]);
    expect(todaysWords([batch], "2026-11-22")).toEqual([]);
    expect(batchFor([batch], "2026-11-30")).toBeUndefined();
  });
});

describe("weekly analysis", () => {
  const now = new Date("2026-11-26T10:00:00Z");
  it("is due when never done or after 7 days", () => {
    expect(analysisDue(null, now)).toBe(true);
    expect(analysisDue("2026-11-20T10:00:00Z", now)).toBe(false);
    expect(analysisDue("2026-11-19T10:00:00Z", now)).toBe(true);
  });
});

describe("evaluations", () => {
  const now = new Date("2026-11-26T10:00:00Z");
  const ev = (createdAt: string, status: Evaluation["status"]): Evaluation => ({
    id: createdAt,
    kind: "monthly",
    createdAt,
    status,
    test: fixtures.evaluation_generate,
    answers: {},
    writingText: "",
    assessment: null,
    confirmedLevels: null,
  });

  it("requires the placement test first", () => {
    expect(evaluationDue([], now)).toBe("placement");
    expect(evaluationDue([ev("2026-11-25T10:00:00Z", "in_progress")], now)).toBe("placement");
  });

  it("asks for a monthly evaluation 30 days after the last finished one", () => {
    expect(evaluationDue([ev("2026-11-01T10:00:00Z", "done")], now)).toBeNull();
    expect(evaluationDue([ev("2026-10-26T10:00:00Z", "done")], now)).toBe("monthly");
  });

  it("finds an unfinished evaluation to resume", () => {
    const open = ev("2026-11-25T10:00:00Z", "assessed");
    expect(unfinishedEvaluation([ev("2026-11-01T10:00:00Z", "done"), open])).toBe(open);
  });
});
