import { fixtures } from "@croatian-app/shared/fixtures";
import { expect, test } from "@playwright/test";
import { goTo, openApp } from "./helpers";

test("quick translation, 'Kako funkcionira' on demand, one-tap save", async ({ page }) => {
  const mock = await openApp(page);
  await page.getByRole("link", { name: "Prijevod" }).click();
  await page.getByPlaceholder("Upiši riječ ili rečenicu…").fill("tjedan");
  await page.getByRole("button", { name: "Prevedi" }).click();
  await expect(page.getByTestId("translation")).toHaveText("week");
  expect(mock.calls).toEqual(["translate"]);

  // The explanation is only requested when opened.
  await page.getByText("Kako funkcionira").click();
  await expect(page.getByText(fixtures.explain.explanation.hr)).toBeVisible();
  await expect(page.getByText(fixtures.explain.explanation.en)).toBeHidden();
  await page.locator(".how").getByRole("button", { name: "EN" }).click();
  await expect(page.getByText(fixtures.explain.explanation.en)).toBeVisible();
  expect(mock.calls).toEqual(["translate", "explain"]);

  // The entry shows the stressed letter and the Serbian/Bosnian variant.
  const card = page.locator('.entry[data-word="tjedan"]');
  await expect(card.locator("mark.stress")).toHaveText("e");
  await expect(card).toContainText("SR/BS: nedelja");
  await card.getByRole("button", { name: "Spremi" }).click();
  await expect(card.getByRole("button", { name: "Spremljeno" })).toBeDisabled();

  await goTo(page, "#/vokabular?tab=words");
  await page.locator('.word-row[data-word="tjedan"] .word-main').click();
  await expect(page.locator('.word-row[data-word="tjedan"]')).toContainText("Izvor: prijevod");
});

test("saving the same word twice does not duplicate it", async ({ page }) => {
  await openApp(page);
  for (let i = 0; i < 2; i++) {
    await goTo(page, "#/prijevod");
    await page.getByPlaceholder("Upiši riječ ili rečenicu…").fill("tjedan");
    await page.getByRole("button", { name: "Prevedi" }).click();
    await page.locator('.entry[data-word="tjedan"]').getByRole("button", { name: "Spremi" }).click();
  }
  await expect(page.getByRole("button", { name: "Već je u tvojim riječima" })).toBeVisible();
  await goTo(page, "#/vokabular?tab=words");
  await expect(page.locator(".word-row")).toHaveCount(1);
});

test("the bubble translates selected or typed text from any screen", async ({ page }) => {
  const mock = await openApp(page);
  await goTo(page, "#/napredak");
  await page.getByRole("button", { name: "Brzi prijevod" }).click();
  const dialog = page.getByRole("dialog", { name: "Brzi prijevod" });
  await dialog.getByRole("textbox").fill("tjedan");
  await dialog.getByRole("button", { name: "Prevedi" }).click();
  await expect(dialog.getByText("week").first()).toBeVisible();
  await dialog.getByRole("button", { name: "Spremi" }).click();
  await expect(dialog.getByRole("button", { name: "Spremljeno" })).toBeVisible();
  expect(mock.calls).toEqual(["translate"]);
  await dialog.getByRole("button", { name: "Zatvori" }).click();
  await expect(dialog).toBeHidden();
});
