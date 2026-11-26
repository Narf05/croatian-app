import { expect, test } from "@playwright/test";
import { goTo, openApp } from "./helpers";

test("the whole interface is in Croatian and navigation works", async ({ page }) => {
  const mock = await openApp(page);
  const nav = page.getByRole("navigation", { name: "Glavni izbornik" });
  for (const label of ["Početna", "Vokabular", "Prijevod", "Lekcije", "Više"]) {
    await expect(nav.getByRole("link", { name: label })).toBeVisible();
  }

  await nav.getByRole("link", { name: "Više" }).click();
  for (const label of ["Pjesme", "Čitanje", "Razgovor", "Vježbe gramatike", "Riječi dana", "Napredak", "Postavke"]) {
    await expect(page.getByRole("link", { name: label })).toBeVisible();
  }
  await page.getByRole("link", { name: "Pjesme" }).click();
  await expect(page.getByRole("heading", { name: "Pjesme", level: 1 })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Više" })).toHaveAttribute("aria-current", "");

  // Browsing the app never calls the AI on its own.
  for (const hash of ["#/", "#/vokabular", "#/prijevod", "#/lekcije", "#/razgovor", "#/gramatika", "#/napredak", "#/rijeci-dana"]) {
    await goTo(page, hash);
    await expect(page.locator("main h1")).toBeVisible();
  }
  expect(mock.calls).toEqual([]);
});

test("the translation bubble is on every screen", async ({ page }) => {
  await openApp(page);
  for (const hash of ["#/", "#/vokabular", "#/lekcije", "#/pjesme", "#/postavke"]) {
    await goTo(page, hash);
    await expect(page.getByRole("button", { name: "Brzi prijevod" })).toBeVisible();
  }
});
