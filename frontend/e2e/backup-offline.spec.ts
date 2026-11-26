import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { goTo, openApp, TOKEN, wordRow } from "./helpers";

test.describe("backup", () => {
  // Don't keep the downloaded file: on Windows, Playwright hangs closing a context that holds one.
  // The download event (with its file name) still fires; the content is captured in the page.
  test.use({ acceptDownloads: false });

  test("export and import all data as a backup file (without the access token)", async ({ page }, info) => {
    await page.addInitScript(() => {
      const original = URL.createObjectURL.bind(URL);
      URL.createObjectURL = (blob: Blob | MediaSource) => {
        if (blob instanceof Blob) void blob.text().then((t) => ((window as unknown as { __export: string }).__export = t));
        return original(blob);
      };
    });
    await openApp(page, { extra: { words: [wordRow("tjedan", "week"), wordRow("kruh", "bread")] } });
    await goTo(page, "#/postavke");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Izvezi sve podatke" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^hrvatski-backup-\d{4}-\d{2}-\d{2}\.json$/);
    await page.waitForFunction(() => typeof (window as unknown as { __export?: string }).__export === "string");
    const text = await page.evaluate(() => (window as unknown as { __export: string }).__export);
    const file = info.outputPath("backup.json");
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, text);
    expect(text).not.toContain(TOKEN);
    const backup = JSON.parse(text);
    expect(backup.app).toBe("croatian-app");
    expect(backup.data.words).toHaveLength(2);
    await expect(page.getByText("Sigurnosna kopija je preuzeta.")).toBeVisible();

    // Change data, then restore the backup.
    await goTo(page, "#/vokabular?tab=words");
    await page.locator('.word-row[data-word="kruh"] .word-main').click();
    await page.locator('.word-row[data-word="kruh"]').getByRole("button", { name: "Obriši" }).click();
    await expect(page.locator(".word-row")).toHaveCount(1);

    await goTo(page, "#/postavke");
    await page.getByTestId("import-file").setInputFiles(file);
    await expect(page.getByText("Podaci su uvezeni.")).toBeVisible();
    await goTo(page, "#/vokabular?tab=words");
    await expect(page.locator(".word-row")).toHaveCount(2);

    // The access token on this device was kept, so AI still works.
    await page.getByRole("link", { name: "Prijevod" }).click();
    await page.getByPlaceholder("Upiši riječ ili rečenicu…").fill("tjedan");
    await page.getByRole("button", { name: "Prevedi" }).click();
    await expect(page.getByTestId("translation")).toHaveText("week");
  });
});

test("a file that is not a backup is rejected", async ({ page }, info) => {
  await openApp(page, { extra: { words: [wordRow("tjedan", "week")] } });
  await goTo(page, "#/postavke");
  const file = info.outputPath("bad.json");
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify({ hello: 1 }));
  await page.getByTestId("import-file").setInputFiles(file);
  await expect(page.getByText("Datoteka nije ispravna sigurnosna kopija.")).toBeVisible();
  await expect(page.getByText("The file is not a valid backup.")).toBeVisible();
  await goTo(page, "#/vokabular?tab=words");
  await expect(page.locator(".word-row")).toHaveCount(1);
});

test.describe("installable PWA", () => {
  test.use({ serviceWorkers: "allow" });

  test("has a manifest and works offline after the first visit", async ({ page, context }) => {
    await openApp(page, { extra: { words: [wordRow("tjedan", "week")] } });
    const manifest = await (await page.request.get("/manifest.webmanifest")).json();
    expect(manifest).toMatchObject({ lang: "hr", short_name: "Hrvatski", display: "standalone" });
    expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(
      expect.arrayContaining(["192x192", "512x512"]),
    );

    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    // Reload once so the service worker controls the page, then go offline.
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Hrvatski" })).toBeVisible();
    await goTo(page, "#/vokabular?tab=words");
    await expect(page.locator('.word-row[data-word="tjedan"]')).toBeVisible();
  });
});
