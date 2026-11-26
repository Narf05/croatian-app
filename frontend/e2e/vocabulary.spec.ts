import { expect, test } from "@playwright/test";
import { goTo, openApp, wordRow } from "./helpers";

const library = [
  wordRow("tjedan", "week", { stressIndex: 2, serbianBosnian: "nedelja", partOfSpeech: "imenica", gender: "m" }),
  wordRow("kuća", "house", { stressIndex: 1 }),
  wordRow("kruh", "bread", { stressIndex: 2 }),
  wordRow("vlak", "train"),
];

test("add a word by hand, choosing the stressed letter", async ({ page }) => {
  await openApp(page);
  await goTo(page, "#/vokabular?tab=add");
  await page.getByLabel("Hrvatski", { exact: true }).fill("kolodvor");
  // Consonants cannot carry the stress.
  await expect(page.locator(".stress-picker .letter").first()).toBeDisabled();
  await page.locator(".stress-picker .letter").nth(1).click();
  await page.getByLabel("Prijevod", { exact: true }).fill("railway station");
  await page.getByRole("button", { name: "Dodaj" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Spremljeno" })).toBeVisible();

  await page.getByRole("link", { name: "Moje riječi" }).click();
  const row = page.locator('.word-row[data-word="kolodvor"]');
  await expect(row).toContainText("railway station");
  await expect(row.locator("mark.stress")).toHaveText("o");
});

test("library shows stress, grammar and the Serbian/Bosnian flag; lists organise words", async ({ page }) => {
  await openApp(page, { extra: { words: library } });
  await goTo(page, "#/vokabular?tab=words");
  const tjedan = page.locator('.word-row[data-word="tjedan"]');
  await expect(tjedan.locator("mark.stress")).toHaveText("e");
  await expect(tjedan).toContainText("SR/BS: nedelja");
  await expect(tjedan).toContainText("imenica · m. r.");

  // Search
  await page.getByRole("searchbox", { name: "Traži…" }).fill("bread");
  await expect(page.locator(".word-row")).toHaveCount(1);
  await page.getByRole("searchbox", { name: "Traži…" }).fill("");

  // Create a list and put a word on it
  await page.getByRole("link", { name: "Popisi" }).click();
  await page.getByPlaceholder("Naziv popisa").fill("Putovanje");
  await page.getByRole("button", { name: "Napravi" }).click();
  await expect(page.locator(".list-row")).toContainText("Putovanje 0 riječi");
  await page.getByRole("link", { name: "Moje riječi" }).click();
  await page.locator('.word-row[data-word="vlak"] .word-main').click();
  await page.locator('.word-row[data-word="vlak"]').getByLabel("Putovanje").check();
  await page.getByRole("link", { name: "Popisi" }).click();
  await expect(page.locator(".list-row")).toContainText("Putovanje 1 riječi");
});

test("flashcards: grade with Opet/Teško/Dobro/Lako; wrong answers come back", async ({ page }) => {
  await openApp(page, { extra: { words: library.slice(0, 2) } });
  await expect(page.getByTestId("due-count")).toHaveText("2");
  await page.getByRole("link", { name: "Ponovi" }).click();
  await expect(page.getByText("Prisjeti se odgovora", { exact: false })).toBeVisible();
  await expect(page.getByText("Recall the answer, then rate how well you knew it.")).toBeVisible();

  // First card: "Opet" sends it to the back of the queue.
  const first = await page.locator(".flashcard .front").innerText();
  await page.getByRole("button", { name: "Prikaži odgovor" }).click();
  await page.getByRole("button", { name: "Opet" }).click();
  // Second card: "Dobro".
  await page.getByRole("button", { name: "Prikaži odgovor" }).click();
  await page.getByRole("button", { name: "Dobro" }).click();
  // The first card comes back in the same session.
  await expect(page.locator(".flashcard .front")).toHaveText(first);
  await page.getByRole("button", { name: "Prikaži odgovor" }).click();
  await page.getByRole("button", { name: "Lako" }).click();
  await expect(page.getByText("Gotovo! Sve riječi su ponovljene.")).toBeVisible();

  await page.getByRole("link", { name: "Početna" }).click();
  await expect(page.getByTestId("due-count")).toHaveText("0");
});

test("multiple choice is checked automatically", async ({ page }) => {
  await openApp(page, { extra: { words: library } });
  await goTo(page, "#/ucenje?mode=choice&scope=all&dir=hr-en");
  await expect(page.getByText("Choose the correct translation.")).toBeVisible();
  const word = (await page.locator(".front").innerText()).trim();
  const answer = library.find((w) => w.croatian === word)!.translation;
  await page.getByRole("button", { name: answer, exact: true }).click();
  await expect(page.getByText("Točno!")).toBeVisible();
  await page.getByRole("button", { name: "Dalje" }).click();
  await expect(page.locator(".counter")).toContainText("3");
});

test("typing: exact answers pass, missing diacritics are pointed out", async ({ page }) => {
  await openApp(page, { extra: { words: [library[1]!] } });
  await goTo(page, "#/ucenje?mode=typing&scope=all&dir=en-hr");
  await expect(page.locator(".front")).toHaveText("house");
  await expect(page.getByText("Type the word in Croatian.")).toBeVisible();
  await page.getByRole("textbox").fill("kuca");
  await page.getByRole("button", { name: "Provjeri" }).click();
  await expect(page.getByText("Gotovo! Pazi na dijakritičke znakove.")).toBeVisible();
  await expect(page.getByText("Almost! Watch the diacritics.")).toBeVisible();
});

test("matching game pairs words with translations", async ({ page }) => {
  await openApp(page, { extra: { words: library } });
  await goTo(page, "#/ucenje?mode=matching&scope=all");
  await expect(page.getByText("Match the words with their translations.")).toBeVisible();
  for (const w of library) {
    await page.locator(`[data-side=left]`, { hasText: w.croatian }).click();
    await page.locator(`[data-side=right]`, { hasText: w.translation }).click();
  }
  await expect(page.getByText("Gotovo! Sve riječi su ponovljene.")).toBeVisible();
});
