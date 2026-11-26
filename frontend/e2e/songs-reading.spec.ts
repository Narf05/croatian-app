import { fixtures } from "@croatian-app/shared/fixtures";
import { expect, test } from "@playwright/test";
import { goTo, openApp } from "./helpers";

test("songs: line-by-line translation, tap a word to save it, explain a line, works offline", async ({ page, context }) => {
  const mock = await openApp(page);
  await goTo(page, "#/pjesme");
  await page.getByLabel("Naslov pjesme").fill("Moja pjesma");
  await page.getByLabel("Zalijepi tekst pjesme").fill("Moj dragi tjedan prolazi\na ja te čekam na kolodvoru");
  await page.getByRole("button", { name: "Prevedi pjesmu" }).click();

  await expect(page.getByRole("heading", { name: "Moja pjesma" })).toBeVisible();
  for (const line of fixtures.song_translate.lines) await expect(page.getByText(line.en)).toBeVisible();
  expect(mock.calls).toEqual(["song_translate"]);

  // Tap a word: explanation + save.
  await page.locator(".line").first().getByRole("button", { name: "tjedan", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "tjedan" });
  await expect(sheet.getByText(fixtures.word_lookup.explanation.hr)).toBeVisible();
  await sheet.getByRole("button", { name: "Spremi" }).click();
  await expect(sheet.getByRole("button", { name: "Spremljeno" })).toBeVisible();
  expect(mock.bodies[1]).toEqual({ word: "tjedan", context: "Moj dragi tjedan prolazi" });
  await sheet.getByRole("button", { name: "Zatvori" }).click();

  // Explain a whole line.
  await page.getByRole("button", { name: "Objasni: a ja te čekam na kolodvoru" }).click();
  await expect(page.getByRole("dialog", { name: "Kako funkcionira" }).getByText(fixtures.explain.explanation.hr)).toBeVisible();
  await page.getByRole("button", { name: "Zatvori" }).click();

  // Hide/show translations.
  await page.getByRole("button", { name: "Sakrij prijevod" }).click();
  await expect(page.getByText(fixtures.song_translate.lines[0]!.en)).toBeHidden();

  // Saved for offline review.
  await context.setOffline(true);
  await goTo(page, "#/pjesme");
  await page.getByRole("link", { name: "Moja pjesma" }).click();
  await expect(page.getByText(fixtures.song_translate.lines[1]!.hr)).toBeVisible();
});

test("reading: paste a text, tap words, translate sentences; text is saved", async ({ page }) => {
  const mock = await openApp(page);
  await goTo(page, "#/citanje");
  await page.getByLabel("Naslov").fill("Na tržnici");
  await page.getByLabel("Zalijepi tekst").fill("Kupio sam kruh. Bio je svjež!\n\nSutra idem opet.");
  await page.getByRole("button", { name: "Spremi tekst" }).click();
  await expect(page.getByRole("heading", { name: "Na tržnici" })).toBeVisible();
  expect(mock.calls).toEqual([]);

  await page.getByRole("button", { name: "kruh", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "kruh" });
  await expect(sheet.locator('.entry[data-word="kruh"]')).toContainText("SR/BS: hleb");
  await sheet.getByRole("button", { name: "Spremi" }).click();
  await sheet.getByRole("button", { name: "Zatvori" }).click();

  mock.respond("translate", { translation: "I bought bread.", entries: [] });
  await page.getByRole("button", { name: "Prevedi rečenicu" }).first().click();
  await expect(page.getByText("I bought bread.")).toBeVisible();
  expect(mock.bodies.at(-1)).toEqual({ text: "Kupio sam kruh.", context: "Na tržnici" });

  // The sentence translation is stored with the text.
  await page.reload();
  await expect(page.getByText("I bought bread.")).toBeVisible();
  await goTo(page, "#/vokabular?tab=words");
  await expect(page.locator('.word-row[data-word="kruh"]')).toBeVisible();
});
