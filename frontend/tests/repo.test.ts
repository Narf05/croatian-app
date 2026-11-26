import { entryKruh, entryTjedan } from "@croatian-app/shared/fixtures";
import { describe, expect, it } from "vitest";
import {
  activitySince,
  allLists,
  allWords,
  createList,
  deleteList,
  dueWords,
  getRow,
  listRows,
  putRow,
  reviewWord,
  saveEntry,
  saveMistake,
  wordFromEntry,
} from "../src/db/repo";
import { getSettings, setSetting } from "../src/db/settings";

const now = new Date("2026-11-26T10:00:00Z");

describe("word library", () => {
  it("builds a word with the stressed letter and all grammar info", () => {
    const w = wordFromEntry(entryTjedan, "translation", now);
    expect(w).toMatchObject({
      croatian: "tjedan",
      translation: "week",
      stressIndex: 2,
      partOfSpeech: "imenica",
      gender: "m",
      caseNote: "gen. jd. tjedna",
      serbianBosnian: "nedelja",
      source: "translation",
      createdAt: now.toISOString(),
      kind: "word",
    });
    expect(w.example).toEqual(entryTjedan.example);
    expect(w.srs.due).toBe(now.toISOString());
  });

  it("drops the stress if the marked word does not match the dictionary form", () => {
    expect(wordFromEntry({ ...entryTjedan, stressed: "tjedn[a]" }, "translation", now).stressIndex).toBeNull();
  });

  it("saves to one shared store and does not duplicate", async () => {
    const first = await saveEntry(entryTjedan, "translation", null, now);
    const again = await saveEntry({ ...entryTjedan, croatian: "Tjedan" }, "song", null, now);
    expect(first.created).toBe(true);
    expect(again.created).toBe(false);
    expect(again.word.id).toBe(first.word.id);
    expect(await allWords()).toHaveLength(1);
  });

  it("adds an existing word to a list instead of duplicating it", async () => {
    const list = await createList("Putovanje", now);
    await saveEntry(entryTjedan, "translation", null, now);
    const res = await saveEntry(entryTjedan, "lesson", list.id, now);
    expect(res.word.listIds).toEqual([list.id]);
  });

  it("logs new words as activity", async () => {
    await saveEntry(entryKruh, "reading", null, now);
    const acts = await activitySince(new Date("2026-11-01T00:00:00Z"));
    expect(acts.map((a) => a.type)).toEqual(["word_added"]);
  });

  it("stores mistakes as review cards", async () => {
    const card = await saveMistake(
      { wrong: "Želim jedna kruh.", correct: "Želim jedan kruh.", explanation: { hr: "a", en: "b" } },
      now,
    );
    expect(card.kind).toBe("mistake");
    expect(card.source).toBe("mistake");
    expect((await dueWords(now)).map((w) => w.id)).toContain(card.id);
  });
});

describe("reviews", () => {
  it("schedules the next review and logs it", async () => {
    const { word } = await saveEntry(entryTjedan, "translation", null, now);
    const reviewed = await reviewWord(word.id, "good", now);
    expect(reviewed?.srs.intervalDays).toBe(1);
    expect(await dueWords(now)).toHaveLength(0);
    expect(await dueWords(new Date("2026-11-27T10:00:01Z"))).toHaveLength(1);
    const acts = await activitySince(now);
    expect(acts.filter((a) => a.type === "review")).toEqual([
      expect.objectContaining({ type: "review", correct: true }),
    ]);
  });

  it("filters due words by list", async () => {
    const list = await createList("Hrana", now);
    await saveEntry(entryKruh, "translation", list.id, now);
    await saveEntry(entryTjedan, "translation", null, now);
    expect((await dueWords(now, list.id)).map((w) => w.croatian)).toEqual(["kruh"]);
    expect(await dueWords(now)).toHaveLength(2);
  });
});

describe("lists", () => {
  it("creates, sorts and deletes lists; words stay in the library", async () => {
    const b = await createList("Putovanje", now);
    await createList("Hrana", now);
    expect((await allLists()).map((l) => l.name)).toEqual(["Hrana", "Putovanje"]);
    await saveEntry(entryTjedan, "translation", b.id, now);
    await deleteList(b.id);
    expect((await allLists()).map((l) => l.name)).toEqual(["Hrana"]);
    const words = await allWords();
    expect(words).toHaveLength(1);
    expect(words[0]!.listIds).toEqual([]);
  });
});

describe("rows and settings", () => {
  it("stores and lists rows newest first", async () => {
    const song = (id: string, createdAt: string) => ({ id, title: id, lyrics: "", lines: [], createdAt });
    await putRow("songs", song("a", "2026-11-01T00:00:00Z"));
    await putRow("songs", song("b", "2026-11-02T00:00:00Z"));
    expect((await listRows("songs")).map((s) => s.id)).toEqual(["b", "a"]);
    expect((await getRow("songs", "a"))?.title).toBe("a");
  });

  it("returns defaults and saved settings", async () => {
    const defaults = await getSettings();
    expect(defaults.levels.grammar).toBe("B1.1");
    expect(defaults.onboarded).toBe(false);
    await setSetting("accessToken", "secret");
    expect((await getSettings()).accessToken).toBe("secret");
  });
});
