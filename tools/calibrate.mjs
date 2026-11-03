// Capture consistent proportion-reference views of the current scene.
// Run: npm run calibrate (requires a local server at 5178, or pass a URL).
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const url = process.argv[2] || 'http://127.0.0.1:5178/index.html';
const outDir = path.resolve('reference/current');
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: 'new',
  args: [
    '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist',
    '--enable-gpu-rasterization', '--disable-gpu-driver-bug-workarounds',
    '--enable-webgl', '--hide-scrollbars', '--force-device-scale-factor=1',
  ],
  defaultViewport: { width: 1280, height: 800, deviceScaleFactor: 1 },
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
  window.__app.post.setDof(false);
  window.__app.setTime(0.38);
});

const views = [
  { id: 'front', label: 'Front elevation', pos: [0, 5.4, 42], target: [0, 4.8, 0], fov: 22 },
  { id: 'side', label: 'Left elevation', pos: [-42, 5.4, -0.5], target: [0, 4.8, -0.5], fov: 22 },
  { id: 'top', label: 'Top / roof', pos: [0.01, 42, 13], target: [0, 0, 1], fov: 30 },
  { id: 'hero', label: '3/4 hero', pos: [20, 24, 46], target: [0, 3.6, 1], fov: 32 },
];

for (const v of views) {
  await page.evaluate(({ pos, target, fov }) => {
    window.__setCam(pos[0], pos[1], pos[2], target[0], target[1], target[2], fov);
    window.__app.camera.updateProjectionMatrix();
  }, v);
  await new Promise(r => setTimeout(r, 1200));
  const file = path.join(outDir, v.id + '.jpg');
  await page.screenshot({ path: file, type: 'jpeg', quality: 88 });
  console.log('[view]', v.id, file);
}

const measurement = await page.evaluate(() => window.__measure ? window.__measure() : null);
fs.writeFileSync(path.resolve('reference/measurements.json'), JSON.stringify(measurement, null, 2));
console.log('[measurements] reference/measurements.json');
await browser.close();
