import { db, STORES, type StoreName } from "./db";
import { SECRET_SETTINGS } from "./settings";

export const BACKUP_APP = "croatian-app";
export const BACKUP_VERSION = 1;

export interface Backup {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  data: Partial<Record<StoreName, unknown[]>>;
}

/** Export all data (except secrets such as the access token). */
export async function exportAll(now = new Date()): Promise<Backup> {
  const database = await db();
  const data: Backup["data"] = {};
  for (const store of STORES) {
    let rows: unknown[] = await database.getAll(store);
    if (store === "settings") {
      rows = rows.filter((r) => !SECRET_SETTINGS.includes((r as { key: string }).key as never));
    }
    data[store] = rows;
  }
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), data };
}

export class BackupError extends Error {}

function validate(input: unknown): Backup {
  if (typeof input !== "object" || input === null) throw new BackupError("not_an_object");
  const b = input as Partial<Backup>;
  if (b.app !== BACKUP_APP) throw new BackupError("wrong_app");
  if (typeof b.version !== "number" || b.version > BACKUP_VERSION) throw new BackupError("wrong_version");
  if (typeof b.data !== "object" || b.data === null) throw new BackupError("no_data");
  for (const [store, rows] of Object.entries(b.data)) {
    if (!STORES.includes(store as StoreName)) throw new BackupError(`unknown_store:${store}`);
    if (!Array.isArray(rows)) throw new BackupError(`bad_rows:${store}`);
  }
  return b as Backup;
}

/**
 * Replace all data with the backup. Secrets currently on the device are kept.
 * Everything happens in one transaction: on error nothing changes.
 */
export async function importAll(input: unknown): Promise<void> {
  const backup = validate(input);
  const database = await db();
  const kept = (await database.getAll("settings")).filter((r) =>
    SECRET_SETTINGS.includes(r.key as never),
  );
  const tx = database.transaction(STORES, "readwrite");
  for (const store of STORES) {
    const os = tx.objectStore(store);
    await os.clear();
    for (const row of backup.data[store] ?? []) await os.put(row as never);
  }
  for (const row of kept) await tx.objectStore("settings").put(row);
  await tx.done;
}

export function backupFileName(now = new Date()): string {
  return `hrvatski-backup-${now.toISOString().slice(0, 10)}.json`;
}
