// Lightweight scene benchmark: frames, draw calls and triangle counts.
// Usage: npm run perf -- [url]
import puppeteer from 'puppeteer-core';

const url = process.argv[2] || 'http://127.0.0.1:5178/index.html';
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: 'new',
  args: [
    '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist',
    '--enable-gpu-rasterization', '--disable-gpu-driver-bug-workarounds',
    '--enable-webgl', '--window-size=1600,900', '--hide-scrollbars',
    '--force-device-scale-factor=1', '--disable-frame-rate-limit',
  ],
  defaultViewport: { width: 1600, height: 900, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction('window.__ready === true', { timeout: 120000 });

// Play the golden-hour shot so the camera and sun are both moving.
await page.evaluate('window.__cinema.jump(3, 0.2); window.__cinema.play();');
await new Promise(r => setTimeout(r, 3000));

const result = await page.evaluate(async () => {
  const app = window.__app;
  const renderer = app.renderer;
  const info = renderer.info;
  let meshes = 0, transparent = 0;
  app.scene.traverse(o => {
    if (!o.isMesh) return;
    meshes++;
    if (o.material && o.material.transparent) transparent++;
  });

  info.autoReset = false;
  info.reset();
  const times = [];
  let last = performance.now();
  const start = last;
  await new Promise(resolve => {
    const loop = () => {
      const now = performance.now();
      times.push(now - last);
      last = now;
      if (now - start < 6000) requestAnimationFrame(loop); else resolve();
    };
    requestAnimationFrame(loop);
  });
  const calls = info.render.calls;
  const tris = info.render.triangles;
  info.autoReset = true;

  times.sort((a, b) => a - b);
  const q = p => +times[Math.floor((times.length - 1) * p)].toFixed(2);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  return {
    fps: +(1000 / avg).toFixed(1),
    frameMs: +avg.toFixed(2),
    p95FrameMs: q(0.95),
    drawCallsPerFrame: Math.round(calls / times.length),
    trianglesPerFrame: Math.round(tris / times.length),
    meshes,
    transparentMeshes: transparent,
  };
});

console.log(JSON.stringify(result, null, 2));
await browser.close();
