import { fixtures } from "@croatian-app/shared/fixtures";
import { expect, test } from "@playwright/test";
import { goTo, openApp, wordRow } from "./helpers";

test("conversation: new scenario, pure immersion, feedback at the end, mistakes become review cards", async ({ page }) => {
  const mock = await openApp(page);
  await goTo(page, "#/razgovor");
  await page.getByRole("button", { name: "Novi razgovor" }).click();

  await expect(page.getByText(fixtures.conversation_start.scenario.hr)).toBeVisible();
  // The scenario is a directive, so it has an English subtitle.
  await expect(page.getByText(fixtures.conversation_start.scenario.en)).toBeVisible();
  await expect(page.locator(".msg.ai")).toHaveText(fixtures.conversation_start.opening);
  // Pure immersion: no translation buttons on the AI's lines.
  await expect(page.locator(".msg.ai").getByRole("button", { name: "EN" })).toHaveCount(0);

  await page.getByPlaceholder("Napiši odgovor…").fill("Dobar dan, želim jedna kruh.");
  await page.getByRole("button", { name: "Pošalji" }).click();
  await expect(page.locator(".msg.ai").nth(1)).toHaveText(fixtures.conversation_reply.reply);
  expect(mock.bodies[1]).toMatchObject({
    messages: [
      { role: "ai", text: fixtures.conversation_start.opening },
      { role: "user", text: "Dobar dan, želim jedna kruh." },
    ],
  });

  // Tapping a word in the AI's line lets you save it.
  await page.locator(".msg.ai").nth(1).getByRole("button", { name: "kruh" }).click();
  await expect(page.getByRole("dialog", { name: "kruh" })).toBeVisible();
  await page.getByRole("button", { name: "Zatvori" }).click();

  await page.getByRole("button", { name: "Završi" }).click();
  await expect(page.getByRole("heading", { name: "Povratna informacija" })).toBeVisible();
  await expect(page.getByText("Želim jedan kruh.")).toBeVisible();
  await expect(page.getByText("Pogreške su dodane u ponavljanje.")).toBeVisible();
  await expect(page.getByPlaceholder("Napiši odgovor…")).toHaveCount(0);
  expect(mock.calls).toEqual(["conversation_start", "conversation_reply", "word_lookup", "conversation_feedback"]);

  // The mistake is now a review card.
  await goTo(page, "#/ucenje?mode=flash&scope=due");
  await expect(page.getByText("Ispravi rečenicu", { exact: true })).toBeVisible();
  await expect(page.locator(".flashcard .front")).toHaveText("Želim jedna kruh.");
  await page.getByRole("button", { name: "Prikaži odgovor" }).click();
  await expect(page.locator(".answer")).toContainText("Želim jedan kruh.");
});

test("grammar drills are built from my words and can be done offline", async ({ page, context }) => {
  const mock = await openApp(page, { extra: { words: [wordRow("knjiga", "book"), wordRow("pisati", "to write")] } });
  await goTo(page, "#/gramatika");
  await page.getByRole("button", { name: "Pripremi vježbe" }).click();
  await expect(page.locator(".drill")).toHaveCount(2);
  expect(mock.calls).toEqual(["drills"]);
  expect((mock.bodies[0] as { words: { croatian: string }[] }).words.map((w) => w.croatian).sort()).toEqual(["knjiga", "pisati"]);

  await context.setOffline(true);
  const caseDrill = page.locator('.drill[data-kind="case"]');
  await expect(caseDrill.getByText("Padeži")).toBeVisible();
  await expect(caseDrill).toContainText("Čitam ___. (knjiga)");
  await caseDrill.getByRole("button", { name: "knjigu" }).click();
  await expect(caseDrill.getByText("Točno!")).toBeVisible();

  const aspectDrill = page.locator('.drill[data-kind="aspect"]');
  await expect(aspectDrill).toContainText("pisati/napisati");
  await aspectDrill.getByRole("button", { name: "pisao", exact: true }).click();
  await expect(aspectDrill.getByText("Netočno. Točan odgovor: napisao")).toBeVisible();

  await goTo(page, "#/gramatika");
  await expect(page.getByRole("link", { name: /Rezultat: 1\/2/ })).toBeVisible();
});
