import { fixtures } from "@croatian-app/shared/fixtures";
import { expect, test } from "@playwright/test";
import { goTo, openApp } from "./helpers";

const dailyWords = Array.from({ length: 21 }, (_, i) => ({
  ...fixtures.daily_words.words[i % 3]!,
  croatian: `${fixtures.daily_words.words[i % 3]!.croatian}${i < 3 ? "" : i}`,
  stressed: i < 3 ? fixtures.daily_words.words[i % 3]!.stressed : `x${i}`,
}));

test("weekly analysis runs only on tap, then shows recommendations and words of the day", async ({ page }) => {
  const mock = await openApp(page, { analysisDone: false });
  mock.respond("daily_words", { words: dailyWords });
  await expect(page.getByRole("heading", { name: "Tjedna analiza je spremna" })).toBeVisible();
  expect(mock.calls).toEqual([]);

  await page.getByRole("button", { name: "Pokreni tjednu analizu" }).click();
  await expect(page.getByRole("heading", { name: "Preporuka ovog tjedna" })).toBeVisible();
  await expect(page.getByText(fixtures.weekly_analysis.summary.hr)).toBeVisible();
  expect(mock.calls).toEqual(["weekly_analysis", "daily_words"]);
  // Words of the day: one level above the user's level (B1 -> B2), 3 per day for a week.
  expect(mock.bodies[1]).toMatchObject({ level: "B2", count: 21 });

  // Today's 3 words, each with stress and a save button.
  const words = page.locator(".home .entry");
  await expect(words).toHaveCount(3);
  await expect(words.first().locator("mark.stress")).toBeVisible();
  await words.first().getByRole("button", { name: "Spremi" }).click();
  await expect(words.first().getByRole("button", { name: "Spremljeno" })).toBeVisible();

  // The card is gone until next week.
  await expect(page.getByRole("heading", { name: "Tjedna analiza je spremna" })).toHaveCount(0);

  await goTo(page, "#/napredak");
  await expect(page.getByText(fixtures.weekly_analysis.lessonTopics[0]!.hr)).toBeVisible();
  await expect(page.getByText(/Sljedeća analiza/)).toBeVisible();

  // Words of the day are available offline.
  await page.context().setOffline(true);
  await goTo(page, "#/rijeci-dana");
  await expect(page.locator(".entry")).toHaveCount(3);
});

test("monthly evaluation is offered 30 days after the last one and steers lessons via goals", async ({ page }) => {
  const old = new Date(Date.now() - 31 * 86400000).toISOString();
  const mock = await openApp(page, {
    placementDone: false,
    extra: {
      goalSets: [
        { id: "g1", createdAt: old, evaluationId: "ev-old", goals: fixtures.evaluation_assess.goals, accepted: true },
      ],
      evaluations: [
        {
          id: "ev-old",
          kind: "placement",
          createdAt: old,
          status: "done",
          test: fixtures.evaluation_generate,
          answers: {},
          writingText: "",
          assessment: fixtures.evaluation_assess,
          confirmedLevels: null,
        },
      ],
    },
  });
  await expect(page.getByRole("heading", { name: "Vrijeme je za mjesečnu provjeru" })).toBeVisible();
  await page.getByRole("button", { name: "Počni provjeru" }).click();
  await expect(page.getByRole("heading", { name: "Mjesečna provjera" })).toBeVisible();
  expect(mock.bodies[0]).toMatchObject({
    kind: "monthly",
    goals: expect.arrayContaining([{ subject: "grammar", goal: "Instrumental i glagolski vid." }]),
  });

  // Lessons get the monthly goals too.
  await goTo(page, "#/lekcije");
  await page.getByLabel("Tema").fill("padeži");
  await page.getByRole("button", { name: "Izradi lekciju" }).click();
  await expect(page.getByRole("heading", { name: "Instrumental", level: 1 })).toBeVisible();
  expect(mock.bodies[1]).toMatchObject({ goals: expect.arrayContaining(["Instrumental i glagolski vid."]) });

  // The unfinished evaluation can be resumed from home.
  await goTo(page, "#/");
  await page.getByRole("button", { name: "Nastavi provjeru" }).click();
  await expect(page.getByRole("heading", { name: "Mjesečna provjera" })).toBeVisible();
});
