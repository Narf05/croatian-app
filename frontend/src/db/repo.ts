import type { WordEntry } from "@croatian-app/shared";
import { parseStressed } from "@croatian-app/shared/stress";
import { newId } from "../lib/id";
import { isDue, newSrs, review, type Grade } from "../lib/srs";
import type { Activity, ActivityType, Source, Word, WordList } from "../types";
import { db, type AppDB, type StoreName } from "./db";

type RowStore = Exclude<StoreName, "settings" | "activity" | "words" | "lists">;
type Row<S extends RowStore> = AppDB[S]["value"];

// ---------- generic rows (lessons, songs, texts, ...) ----------

export async function putRow<S extends RowStore>(store: S, row: Row<S>): Promise<void> {
  await (await db()).put(store, row as never);
}

export async function getRow<S extends RowStore>(store: S, id: string): Promise<Row<S> | undefined> {
  return (await (await db()).get(store, id)) as Row<S> | undefined;
}

/** All rows, newest first (by createdAt). */
export async function listRows<S extends RowStore>(store: S): Promise<Row<S>[]> {
  const rows = (await (await db()).getAll(store)) as Row<S>[];
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteRow(store: RowStore, id: string): Promise<void> {
  await (await db()).delete(store, id);
}

// ---------- activity ----------

export async function logActivity(type: ActivityType, now = new Date(), correct?: boolean): Promise<void> {
  const row: Activity = { at: now.toISOString(), type };
  if (correct !== undefined) row.correct = correct;
  await (await db()).add("activity", row);
}

export async function activitySince(since: Date): Promise<Activity[]> {
  const all = await (await db()).getAll("activity");
  const from = since.toISOString();
  return all.filter((a) => a.at >= from);
}

// ---------- words ----------

const key = (s: string) => s.trim().toLocaleLowerCase("hr");

export async function allWords(): Promise<Word[]> {
  const words = await (await db()).getAll("words");
  return words.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getWord(id: string): Promise<Word | undefined> {
  return (await db()).get("words", id);
}

export async function putWord(word: Word): Promise<void> {
  await (await db()).put("words", word);
}

export async function deleteWord(id: string): Promise<void> {
  await (await db()).delete("words", id);
}

export async function findWord(croatian: string): Promise<Word | undefined> {
  const k = key(croatian);
  return (await allWords()).find((w) => w.kind === "word" && key(w.croatian) === k);
}

/** Build a library word from an AI entry. */
export function wordFromEntry(entry: WordEntry, source: Source, now = new Date()): Word {
  const { word, stressIndex } = parseStressed(entry.stressed);
  // Trust the stress position only if the marked word matches the dictionary form.
  const validStress = key(word) === key(entry.croatian) ? stressIndex : null;
  return {
    id: newId(),
    kind: "word",
    croatian: entry.croatian.trim(),
    translation: entry.translation.trim(),
    stressIndex: validStress,
    partOfSpeech: entry.partOfSpeech || null,
    gender: entry.gender,
    aspect: entry.aspect,
    aspectPair: entry.aspectPair,
    caseNote: entry.caseNote,
    example: entry.example,
    serbianBosnian: entry.serbianBosnian,
    mistake: null,
    source,
    createdAt: now.toISOString(),
    listIds: [],
    srs: newSrs(now),
  };
}

export interface SaveResult {
  word: Word;
  /** False if the word was already in the library. */
  created: boolean;
}

/**
 * Save an entry to the library (one shared store for all sections).
 * If the word already exists it is not duplicated; it is only added to the list.
 */
export async function saveEntry(
  entry: WordEntry,
  source: Source,
  listId: string | null = null,
  now = new Date(),
): Promise<SaveResult> {
  const existing = await findWord(entry.croatian);
  if (existing) {
    if (listId && !existing.listIds.includes(listId)) {
      existing.listIds = [...existing.listIds, listId];
      await putWord(existing);
    }
    return { word: existing, created: false };
  }
  const word = wordFromEntry(entry, source, now);
  if (listId) word.listIds = [listId];
  await putWord(word);
  await logActivity("word_added", now);
  return { word, created: true };
}

/** Add a conversation mistake as a review card. */
export async function saveMistake(
  mistake: { wrong: string; correct: string; explanation: WordEntry["example"] },
  now = new Date(),
): Promise<Word> {
  const word: Word = {
    id: newId(),
    kind: "mistake",
    croatian: mistake.correct,
    translation: "",
    stressIndex: null,
    partOfSpeech: null,
    gender: null,
    aspect: null,
    aspectPair: null,
    caseNote: null,
    example: null,
    serbianBosnian: null,
    mistake: { wrong: mistake.wrong, explanation: mistake.explanation },
    source: "mistake",
    createdAt: now.toISOString(),
    listIds: [],
    srs: newSrs(now),
  };
  await putWord(word);
  return word;
}

/** Record a review result and log it. */
export async function reviewWord(id: string, grade: Grade, now = new Date()): Promise<Word | undefined> {
  const word = await getWord(id);
  if (!word) return undefined;
  word.srs = review(word.srs, grade, now);
  await putWord(word);
  await logActivity("review", now, grade !== "again");
  return word;
}

/** Words due for review, optionally only from one list. Most overdue first. */
export async function dueWords(now = new Date(), listId: string | null = null): Promise<Word[]> {
  return (await allWords())
    .filter((w) => isDue(w.srs, now) && (!listId || w.listIds.includes(listId)))
    .sort((a, b) => a.srs.due.localeCompare(b.srs.due));
}

// ---------- lists ----------

export async function allLists(): Promise<WordList[]> {
  const lists = await (await db()).getAll("lists");
  return lists.sort((a, b) => a.name.localeCompare(b.name, "hr"));
}

export async function createList(name: string, now = new Date()): Promise<WordList> {
  const list: WordList = { id: newId(), name: name.trim(), createdAt: now.toISOString() };
  await (await db()).put("lists", list);
  return list;
}

export async function renameList(id: string, name: string): Promise<void> {
  const database = await db();
  const list = await database.get("lists", id);
  if (list) await database.put("lists", { ...list, name: name.trim() });
}

/** Delete a list; its words stay in the library. */
export async function deleteList(id: string): Promise<void> {
  const database = await db();
  await database.delete("lists", id);
  for (const word of await allWords()) {
    if (word.listIds.includes(id)) {
      await putWord({ ...word, listIds: word.listIds.filter((l) => l !== id) });
    }
  }
}

export async function setWordLists(wordId: string, listIds: string[]): Promise<void> {
  const word = await getWord(wordId);
  if (word) await putWord({ ...word, listIds });
}
