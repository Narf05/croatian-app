import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  Activity,
  Analysis,
  Conversation,
  DailyBatch,
  DrillSet,
  Evaluation,
  GoalSet,
  Lesson,
  ReadingText,
  Song,
  Word,
  WordList,
} from "../types";

export interface SettingRow {
  key: string;
  value: unknown;
}

export interface AppDB extends DBSchema {
  words: { key: string; value: Word };
  lists: { key: string; value: WordList };
  lessons: { key: string; value: Lesson };
  songs: { key: string; value: Song };
  texts: { key: string; value: ReadingText };
  conversations: { key: string; value: Conversation };
  drillSets: { key: string; value: DrillSet };
  dailyBatches: { key: string; value: DailyBatch };
  evaluations: { key: string; value: Evaluation };
  goalSets: { key: string; value: GoalSet };
  analyses: { key: string; value: Analysis };
  activity: { key: number; value: Activity };
  settings: { key: string; value: SettingRow };
}

export type StoreName =
  | "words"
  | "lists"
  | "lessons"
  | "songs"
  | "texts"
  | "conversations"
  | "drillSets"
  | "dailyBatches"
  | "evaluations"
  | "goalSets"
  | "analyses"
  | "activity"
  | "settings";

export const STORES: StoreName[] = [
  "words",
  "lists",
  "lessons",
  "songs",
  "texts",
  "conversations",
  "drillSets",
  "dailyBatches",
  "evaluations",
  "goalSets",
  "analyses",
  "activity",
  "settings",
];

const DB_NAME = "croatian-app";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<AppDB>> | null = null;

export function db(): Promise<IDBPDatabase<AppDB>> {
  dbPromise ??= openDB<AppDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      for (const name of STORES) {
        if (name === "activity") continue;
        database.createObjectStore(name, { keyPath: name === "settings" ? "key" : "id" });
      }
      database.createObjectStore("activity", { keyPath: "id", autoIncrement: true });
    },
  });
  return dbPromise;
}

/** Close and forget the connection (used by tests and after import). */
export async function closeDb(): Promise<void> {
  if (dbPromise) (await dbPromise).close();
  dbPromise = null;
}
