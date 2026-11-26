import { describe, expect, it } from "vitest";
import { AGAIN_DELAY_MS, autoGrade, isDue, newSrs, review } from "../src/lib/srs";

const now = new Date("2026-11-26T10:00:00Z");
const day = 24 * 3600 * 1000;
const dueIn = (iso: string) => (new Date(iso).getTime() - now.getTime()) / day;

describe("srs", () => {
  it("new cards are due immediately", () => {
    expect(isDue(newSrs(now), now)).toBe(true);
  });

  it("good: 1 day, then 3 days, then interval × ease", () => {
    let s = review(newSrs(now), "good", now);
    expect(s.intervalDays).toBe(1);
    expect(dueIn(s.due)).toBe(1);
    s = review(s, "good", now);
    expect(s.intervalDays).toBe(3);
    s = review(s, "good", now);
    expect(s.intervalDays).toBe(Math.round(3 * 2.5));
    expect(s.correct).toBe(3);
  });

  it("again: wrong answers come back sooner (in 10 minutes) and reset progress", () => {
    let s = review(newSrs(now), "good", now);
    s = review(s, "good", now);
    const after = review(s, "again", now);
    expect(after.intervalDays).toBe(0);
    expect(after.reps).toBe(0);
    expect(after.lapses).toBe(1);
    expect(after.wrong).toBe(1);
    expect(new Date(after.due).getTime() - now.getTime()).toBe(AGAIN_DELAY_MS);
    expect(after.ease).toBeCloseTo(2.3);
  });

  it("hard grows slowly and lowers ease; easy grows fast and raises ease", () => {
    const base = review(review(newSrs(now), "good", now), "good", now); // 3 days
    const hard = review(base, "hard", now);
    const easy = review(base, "easy", now);
    expect(hard.intervalDays).toBe(4);
    expect(hard.ease).toBeCloseTo(2.35);
    expect(easy.intervalDays).toBeGreaterThan(review(base, "good", now).intervalDays);
    expect(easy.ease).toBeCloseTo(2.65);
  });

  it("ease never drops below 1.3", () => {
    let s = newSrs(now);
    for (let i = 0; i < 20; i++) s = review(s, "again", now);
    expect(s.ease).toBe(1.3);
  });

  it("does not mutate the previous state", () => {
    const s = newSrs(now);
    review(s, "good", now);
    expect(s.reps).toBe(0);
  });

  it("autoGrade maps correct to good and wrong to again", () => {
    expect(autoGrade(true)).toBe("good");
    expect(autoGrade(false)).toBe("again");
  });
});
