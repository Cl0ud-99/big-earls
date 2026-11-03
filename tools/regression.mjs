// Capture the six cinema shots for visual regression.
// Usage: node tools/regression.mjs <url> [prefix]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const url = process.argv[2] || 'http://127.0.0.1:5178/index.html';
const prefix = process.argv[3] || 'current';
const outDir = path.resolve('shots/regression');
fs.mkdirSync(outDir, { recursive: true });
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: 'new',
  args: [
    '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist',
    '--enable-gpu-rasterization', '--disable-gpu-driver-bug-workarounds',
    '--enable-webgl', '--window-size=1600,900', '--hide-scrollbars',
    '--force-device-scale-factor=1',
  ],
  defaultViewport: { width: 1600, height: 900, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction('window.__ready === true', { timeout: 120000 });
await page.evaluate(() => {
  for (const s of ['#hud-top', '#shot-hud', '#controls', '#hint', '#title-card', '#end-card', '#letterbox', '#look-hint', '#crosshair', '#shot-picker', '#toast']) {
    const el = document.querySelector(s);
    if (el) el.style.display = 'none';
  }
  document.body.classList.add('clean');
});
for (let i = 0; i < 6; i++) {
  await page.evaluate(i => window.__cinema.jump(i, 0.5), i);
  await new Promise(r => setTimeout(r, 1800));
  const file = path.join(outDir, prefix + '-' + String(i + 1).padStart(2, '0') + '.png');
  await page.screenshot({ path: file });
  console.log('[shot]', i + 1, file);
}
await browser.close();
