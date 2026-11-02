// Screenshot harness: drive local Chrome via CDP, capture at high res.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const url = process.argv[2] || 'http://127.0.0.1:5178/index.html';
const out = process.argv[3] || 'shots/shot.png';
const waitMs = Number(process.argv[4] || 9000);
const width = Number(process.env.W || 1600);
const height = Number(process.env.H || 900);
const evalJs = process.env.EVAL || '';

const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: 'new',
  args: [
    ...(process.env.SWIFT
      ? ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader']
      : [
          '--use-angle=d3d11',
          '--enable-gpu',
          '--ignore-gpu-blocklist',
          '--enable-gpu-rasterization',
          '--disable-gpu-driver-bug-workarounds',
        ]),
    '--enable-webgl',
    '--window-size=' + width + ',' + height,
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--autoplay-policy=no-user-gesture-required',
  ],
  defaultViewport: { width, height, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
page.on('console', m => {
  const t = m.text();
  if (!t.includes('Download the React DevTools')) console.log('[console]', t);
});
page.on('pageerror', e => console.log('[pageerror]', e.message, '\n', e.stack));
await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 }).catch(e => console.log('goto:', e.message));
await new Promise(r => setTimeout(r, waitMs));
if (evalJs) {
  const r = await page.evaluate(evalJs).catch(e => 'EVAL ERR ' + e.message);
  console.log('[eval]', JSON.stringify(r));
  await new Promise(r => setTimeout(r, 1200));
}
fs.mkdirSync(path.dirname(out), { recursive: true });
await page.screenshot({ path: out, type: 'png' });
const info = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  let renderer = 'no canvas';
  if (c) {
    const gl = c.getContext('webgl2');
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'webgl2';
    }
  }
  return { renderer, dpr: devicePixelRatio, size: c ? [c.width, c.height] : null, title: document.title };
});
console.log('[info]', JSON.stringify(info));
await browser.close();
console.log('[ok]', out);
