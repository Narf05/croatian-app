import { fixtures } from "@croatian-app/shared/fixtures";
import { expect, test, type Page } from "@playwright/test";
import { BACKEND, mockBackend, TOKEN } from "./helpers";

async function connect(page: Page) {
  await page.getByLabel("Adresa poslužitelja").fill(BACKEND);
  await page.getByLabel("Pristupni kôd").fill(TOKEN);
  await page.getByRole("button", { name: "Spremi vezu" }).click();
}

async function answerTest(page: Page) {
  const test = fixtures.evaluation_generate;
  const all = [...test.vocabulary, ...test.grammar, ...test.reading.questions];
  const blocks = page.locator(".question-block");
  await expect(blocks).toHaveCount(all.length);
  for (let i = 0; i < all.length; i++) {
    await blocks.nth(i).getByLabel(all[i]!.answer, { exact: true }).check();
  }
  await page.getByLabel("Pisanje").fill("Bok! Vikend je bio odličan. Išli smo na more.");
}

test("first launch: connect, take the placement test, confirm levels and goals", async ({ page }) => {
  const mock = await mockBackend(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dobro došli!" })).toBeVisible();
  await connect(page);
  await page.getByRole("button", { name: "Provjeri vezu" }).click();
  await expect(page.getByText("Veza radi.")).toBeVisible();

  await page.getByRole("button", { name: "Počni početnu provjeru" }).click();
  await expect(page.getByRole("heading", { name: "Početna provjera" })).toBeVisible();
  expect(mock.calls).toEqual(["evaluation_generate"]);
  expect(mock.bodies[0]).toMatchObject({ kind: "placement" });

  // Sections: vocabulary, grammar, reading (with the text), writing.
  for (const name of ["Vokabular", "Gramatika", "Čitanje", "Pisanje"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }
  await expect(page.getByText(fixtures.evaluation_generate.reading.text)).toBeVisible();
  // Instructions carry an English subtitle.
  await expect(page.getByText("Choose the correct answer.").first()).toBeVisible();

  // Submitting with missing answers is blocked.
  await page.getByRole("button", { name: "Predaj provjeru" }).click();
  await expect(page.getByText("Odgovori na sva pitanja prije predaje.")).toBeVisible();

  // The test can be paused: answers survive a reload.
  await page.locator(".question-block").first().getByLabel("week", { exact: true }).check();
  // Wait until the answer is stored on the device, then reload.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<unknown>((resolve) => {
            const req = indexedDB.open("croatian-app");
            req.onsuccess = () => {
              const all = req.result.transaction("evaluations").objectStore("evaluations").getAll();
              all.onsuccess = () => {
                req.result.close();
                resolve(all.result.map((e: { answers: Record<string, string> }) => e.answers["vocabulary.0"]));
              };
            };
          }),
      ),
    )
    .toEqual(["week"]);
  await page.reload();
  await expect(page.locator(".question-block").first().getByLabel("week", { exact: true })).toBeChecked();

  await answerTest(page);
  await page.getByRole("button", { name: "Predaj provjeru" }).click();
  await expect(page.getByRole("heading", { name: "Predložene razine" })).toBeVisible();
  const assess = mock.bodies[mock.calls.indexOf("evaluation_assess")] as {
    scores: { subject: string; correct: number; total: number }[];
    writingText: string;
  };
  expect(assess.scores).toEqual([
    expect.objectContaining({ subject: "vocabulary", correct: 2, total: 2 }),
    expect.objectContaining({ subject: "grammar", correct: 2, total: 2 }),
    expect.objectContaining({ subject: "reading", correct: 1, total: 1 }),
  ]);
  expect(assess.writingText).toContain("Vikend");

  // Keep the old grammar level, accept the rest.
  await page.locator(".suggested[data-subject=grammar]").getByRole("checkbox").uncheck();
  await page.getByRole("button", { name: "Potvrdi razine" }).click();

  await expect(page.getByRole("heading", { name: "Predloženi ciljevi za sljedeći mjesec" })).toBeVisible();
  await page.getByLabel("Čitanje").fill("Pročitati 6 kratkih članaka.");
  await page.getByRole("button", { name: "Prihvati ciljeve" }).click();
  await expect(page.getByText("Provjera je završena.")).toBeVisible();

  await page.getByRole("link", { name: "Početna" }).click();
  await expect(page.getByRole("heading", { name: "Ciljevi ovog mjeseca" })).toBeVisible();
  await expect(page.getByText("Pročitati 6 kratkih članaka.")).toBeVisible();
  await expect(page.getByText("Instrumental i glagolski vid.")).toBeVisible();

  await page.getByRole("link", { name: "Više" }).click();
  await page.getByRole("link", { name: "Napredak" }).click();
  const row = (s: string) => page.locator(`.level-row[data-subject="${s}"] .level-value`);
  await expect(row("Vokabular")).toHaveText("B1.2");
  await expect(row("Gramatika")).toHaveText("B1.1");
  await expect(row("Čitanje")).toHaveText("B1.2");
  await expect(page.getByTestId("overall-level")).toHaveText("B1.2");
});

test("first launch: the placement test can be skipped", async ({ page }) => {
  const mock = await mockBackend(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Preskoči/ }).click();
  await expect(page.getByRole("heading", { name: "Hrvatski" })).toBeVisible();
  // Home then offers the placement test that is still missing.
  await expect(page.getByRole("heading", { name: "Početna provjera još nije napravljena" })).toBeVisible();
  expect(mock.calls).toEqual([]);
});

test("the placement test needs the server to be set up", async ({ page }) => {
  await mockBackend(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Počni početnu provjeru" }).click();
  await expect(page.getByText("Poslužitelj nije postavljen.", { exact: false })).toBeVisible();
  await expect(page.getByText("The server is not set up.", { exact: false })).toBeVisible();
});
