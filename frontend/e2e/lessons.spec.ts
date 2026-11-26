import { fixtures } from "@croatian-app/shared/fixtures";
import { expect, test } from "@playwright/test";
import { goTo, openApp } from "./helpers";

test("create a lesson, do the exercises offline, keep answers, save vocabulary", async ({ page, context }) => {
  const mock = await openApp(page);
  await page.getByRole("link", { name: "Lekcije" }).click();
  await page.getByLabel("Tema").fill("instrumental");
  await page.getByLabel("Detaljno (3–5 dijelova)").check();
  await page.getByRole("button", { name: "Izradi lekciju" }).click();

  await expect(page.getByRole("heading", { name: "Instrumental", level: 1 })).toBeVisible();
  expect(mock.calls).toEqual(["lesson"]);
  expect(mock.bodies[0]).toMatchObject({ topic: "instrumental", size: "detailed", level: "B1.1" });

  // Explanations are Croatian with an EN toggle.
  const explanation = fixtures.lesson.parts[0]!.explanation;
  await expect(page.getByText(explanation.hr)).toBeVisible();
  await expect(page.getByText(explanation.en)).toBeHidden();

  // Go offline: the lesson keeps working (all stored on the device).
  await context.setOffline(true);
  await goTo(page, "#/lekcije");
  await page.getByRole("link", { name: /Instrumental/ }).click();

  const [choice, gap] = [page.locator(".exercise").nth(0), page.locator(".exercise").nth(1)];
  await expect(choice.getByText("Choose the correct form.")).toBeVisible();
  await choice.getByRole("button", { name: "bratom" }).click();
  await expect(choice.getByText("Točno!")).toBeVisible();
  await gap.getByRole("textbox").fill("vlak");
  await gap.getByRole("button", { name: "Provjeri" }).click();
  await expect(gap.getByText("Netočno. Točan odgovor: vlakom")).toBeVisible();

  // Answers are remembered.
  await goTo(page, "#/lekcije");
  await page.getByRole("link", { name: /Instrumental/ }).click();
  await expect(page.locator(".exercise").nth(0).getByText("Točno!")).toBeVisible();
  await expect(page.locator(".exercise").nth(1).getByText("Netočno.", { exact: false })).toBeVisible();

  // Lesson vocabulary can be saved to the library.
  await page.locator('.entry[data-word="karta"]').getByRole("button", { name: "Spremi" }).click();
  await expect(page.locator('.entry[data-word="karta"]').getByRole("button", { name: "Spremljeno" })).toBeVisible();
  expect(mock.calls).toEqual(["lesson"]);
});

test("weekly recommended topics are offered on the lessons page", async ({ page }) => {
  await openApp(page, {
    extra: { analyses: [{ id: "a1", createdAt: new Date().toISOString(), result: fixtures.weekly_analysis }] },
  });
  await page.getByRole("link", { name: "Lekcije" }).click();
  await expect(page.getByRole("heading", { name: "Preporučene teme ovog tjedna" })).toBeVisible();
  await page.getByRole("button", { name: "Na kolodvoru" }).click();
  await expect(page.getByLabel("Tema")).toHaveValue("Na kolodvoru");
});

test("AI features show a clear message when offline", async ({ page, context }) => {
  const mock = await openApp(page);
  await context.setOffline(true);
  await page.getByRole("link", { name: "Lekcije" }).click();
  await page.getByLabel("Tema").fill("instrumental");
  await page.getByRole("button", { name: "Izradi lekciju" }).click();
  await expect(page.getByText("Nema internetske veze. Ova značajka treba internet.")).toBeVisible();
  await expect(page.getByText("No internet connection. This feature needs internet.")).toBeVisible();
  expect(mock.calls).toEqual([]);
});

test("backend errors are explained in Croatian with English", async ({ page }) => {
  const mock = await openApp(page);
  mock.fail("translate", "rate_limited", 429);
  await page.getByRole("link", { name: "Prijevod" }).click();
  await page.getByPlaceholder("Upiši riječ ili rečenicu…").fill("tjedan");
  await page.getByRole("button", { name: "Prevedi" }).click();
  await expect(page.getByText("Dosegnut je dnevni broj zahtjeva.", { exact: false })).toBeVisible();
  await expect(page.getByText("The daily request limit has been reached.", { exact: false })).toBeVisible();
});
