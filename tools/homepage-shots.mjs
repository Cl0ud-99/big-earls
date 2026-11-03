// Capture the release homepage stills from the current build.
// Writes 1600x900 PNGs to shots/homepage/; resize them to docs/shots/ with PIL.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const url = process.argv[2] || 'http://127.0.0.1:5178/index.html';
const outDir = path.resolve('shots/homepage');
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
  const style = document.createElement('style');
  style.textContent = '#hud-top,#shot-hud,#controls,#hint,#title-card,#end-card,#letterbox,#look-hint,#crosshair,#shot-picker,#toast{display:none!important}';
  document.head.appendChild(style);
  document.body.classList.add('clean');
  window.__app.post.setDof(true);
});
const views = [
  { id: 'hero', setup: 'window.__cinema.jump(5, 0.35)' },
  { id: 'sign', setup: 'window.__cinema.jump(1, 0.5)' },
  { id: 'service', setup: 'window.__cinema.jump(4, 0.5)' },
  { id: 'pump', setup: 'window.__setCam(-2.5, 1.55, 7.8, -4.4, 1.5, 4.3, 40); window.__app.post.setDof(false); window.__app.setTime(0.35)' },
  { id: 'dusk', setup: 'window.__cinema.jump(7, 0.45)' },
  { id: 'aerial', setup: 'window.__setCam(20, 24, 46, 0, 3.6, 1, 32); window.__app.setTime(0.5)' },
];
for (const v of views) {
  await page.evaluate(v.setup);
  await new Promise(r => setTimeout(r, 1800));
  const file = path.join(outDir, v.id + '.png');
  await page.screenshot({ path: file });
  console.log('[shot]', v.id, file);
}
await browser.close();
