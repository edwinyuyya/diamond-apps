// Ekspor PNG dari file SVG logo dan template HTML memakai Playwright (Chromium).
// Jalankan:  node export-png.mjs   (setelah build-logo.mjs)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const out = path.join(root, 'png');
fs.mkdirSync(out, { recursive: true });

// [file svg, lebar-lebar PNG]
const jobs = [
  ['diamond-logo-primary-emerald', [2000, 800]],
  ['diamond-logo-primary-ivory', [2000, 800]],
  ['diamond-logo-primary-black', [2000]],
  ['diamond-logo-primary-transparent', [2000]],
  ['diamond-logo-primary-reverse', [2000]],
  ['diamond-logo-gold-mono', [2000]],
  ['diamond-logo-white-mono', [2000]],
  ['diamond-logo-horizontal-emerald', [2400]],
  ['diamond-logo-horizontal-ivory', [2400]],
  ['diamond-logo-horizontal-reverse', [2400]],
  ['diamond-monogram-emerald', [1080, 180]],
  ['diamond-monogram-black', [1080]],
  ['diamond-symbol-gold', [600]],
  ['diamond-symbol-emerald', [600]],
  ['diamond-plate-brand', [2580]],
  ['diamond-plate-couple', [2580]],
];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const [name, widths] of jobs) {
  const svg = fs.readFileSync(path.join(root, 'logo', name + '.svg'), 'utf8');
  const [, vw, vh] = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).map(Number);
  for (const w of widths) {
    const h = Math.round((w * vh) / vw);
    await page.setViewportSize({ width: w, height: h });
    const sized = svg.replace(/width="[\d.]+" height="[\d.]+"/, `width="${w}" height="${h}"`);
    await page.setContent(`<html><body style="margin:0;background:transparent">${sized}</body></html>`);
    await page.screenshot({ path: path.join(out, `${name}-${w}.png`), omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
    console.log('✓', `${name}-${w}.png`);
  }
}

// Poster campaign Instagram
await page.setViewportSize({ width: 1080, height: 1350 });
await page.goto(pathToFileURL(path.join(root, 'templates', 'instagram-campaign.html')).href);
await page.evaluate(() => document.fonts.ready);
await page.locator('#post').screenshot({ path: path.join(out, 'instagram-campaign-1080x1350.png') });
console.log('✓ instagram-campaign-1080x1350.png');

await browser.close();
