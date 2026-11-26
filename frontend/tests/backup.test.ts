import { entryKruh, entryTjedan } from "@croatian-app/shared/fixtures";
import { describe, expect, it } from "vitest";
import { BackupError, backupFileName, exportAll, importAll } from "../src/db/backup";
import { allWords, createList, saveEntry } from "../src/db/repo";
import { getSettings, setSetting } from "../src/db/settings";

const now = new Date("2026-11-26T10:00:00Z");

describe("backup", () => {
  it("exports all data without the access token", async () => {
    await saveEntry(entryTjedan, "translation", null, now);
    await setSetting("accessToken", "super-secret-token");
    await setSetting("backendUrl", "https://backend.example");
    const backup = await exportAll(now);
    expect(backup.app).toBe("croatian-app");
    expect(backup.data.words).toHaveLength(1);
    expect(JSON.stringify(backup)).not.toContain("super-secret-token");
    expect(JSON.stringify(backup)).toContain("https://backend.example");
  });

  it("restores a backup and keeps the token on this device", async () => {
    await saveEntry(entryTjedan, "translation", null, now);
    await createList("Putovanje", now);
    const backup = JSON.parse(JSON.stringify(await exportAll(now)));

    // The device now has different data and a token.
    await saveEntry(entryKruh, "reading", null, now);
    await setSetting("accessToken", "device-token");

    await importAll(backup);
    expect((await allWords()).map((w) => w.croatian)).toEqual(["tjedan"]);
    expect((await getSettings()).accessToken).toBe("device-token");
  });

  it("rejects files that are not a backup of this app, without changing anything", async () => {
    await saveEntry(entryTjedan, "translation", null, now);
    await expect(importAll({ app: "other", version: 1, data: {} })).rejects.toBeInstanceOf(BackupError);
    await expect(importAll("nope")).rejects.toBeInstanceOf(BackupError);
    await expect(
      importAll({ app: "croatian-app", version: 1, exportedAt: "", data: { hacks: [] } }),
    ).rejects.toBeInstanceOf(BackupError);
    expect(await allWords()).toHaveLength(1);
  });

  it("names the file with the date", () => {
    expect(backupFileName(now)).toBe("hrvatski-backup-2026-11-26.json");
  });
});
