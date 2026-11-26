// Renders public/icon.svg to the PNG sizes needed for installing the PWA.
// Run with: node scripts/make-icons.mjs
import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(here, "..", "public");
const svg = await readFile(path.join(publicDir, "icon.svg"), "utf8");
const browser = await chromium.launch();
for (const [name, size] of [["icon-192.png", 192], ["icon-512.png", 512], ["apple-touch-icon.png", 180]]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<style>html,body{margin:0}</style>${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}`);
  await page.screenshot({ path: path.join(publicDir, name), omitBackground: true });
  await page.close();
}
await browser.close();
console.log("icons written");
