import * as THREE from 'three';
import {
  tileFBM, fieldToCanvas, normalFromCanvas, grayscaleFromCanvas, mulberry32,
  fbm2, clamp, lerp, rgba, blobCanvas, smoothstep
} from './lib/noise.js';

const T = {};
let _aniso = 8;
export function setAnisotropy(v) { _aniso = v; }

function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function texture(canvas, { srgb = true, repeat = [1, 1], wrap = THREE.RepeatWrapping } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = wrap;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = _aniso;
  t.needsUpdate = true;
  return t;
}

function grain(ctx, w, h, amount = 8, seed = 1) {
  const r = mulberry32(seed);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amount * 2;
    d[i] = clamp(d[i] + n, 0, 255);
    d[i + 1] = clamp(d[i + 1] + n, 0, 255);
    d[i + 2] = clamp(d[i + 2] + n, 0, 255);
  }
  ctx.putImageData(img, 0, 0);
}

function speckle(ctx, w, h, count, colors, seed = 1, size = 1.6) {
  const r = mulberry32(seed);
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[(r() * colors.length) | 0];
    const x = r() * w, y = r() * h;
    const s = 0.4 + r() * size;
    ctx.globalAlpha = 0.15 + r() * 0.5;
    ctx.fillRect(x, y, s, s);
  }
  ctx.globalAlpha = 1;
}

// Draw a callback at wrapped positions so textures tile seamlessly.
function wrapDraw(ctx, w, h, x, y, rad, fn) {
  const xs = [x];
  const ys = [y];
  if (x < rad) xs.push(x + w);
  if (x > w - rad) xs.push(x - w);
  if (y < rad) ys.push(y + h);
  if (y > h - rad) ys.push(y - h);
  for (const xx of xs) for (const yy of ys) fn(xx, yy);
}

function crack(ctx, w, h, x, y, len, ang, width, color, r, depth = 0) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  let px = x, py = y, a = ang;
  ctx.moveTo(px, py);
  const steps = Math.max(3, (len / 9) | 0);
  for (let i = 0; i < steps; i++) {
    a += (r() - 0.5) * 0.55;
    px += Math.cos(a) * (len / steps);
    py += Math.sin(a) * (len / steps);
    ctx.lineTo(px, py);
    if (depth < 2 && r() < 0.08) {
      crack(ctx, w, h, px, py, len * 0.4, a + (r() - 0.5) * 1.8, width * 0.6, color, r, depth + 1);
      ctx.beginPath(); ctx.moveTo(px, py);
    }
  }
  ctx.stroke();
}

function grungeStreaks(ctx, w, h, r, { count = 30, color = 'rgba(70,42,24,.25)', fromTop = 0.35 } = {}) {
  for (let i = 0; i < count; i++) {
    const x = r() * w, y = r() * h * fromTop;
    const len = 20 + r() * h * 0.5;
    const wd = 1 + r() * 6;
    const g = ctx.createLinearGradient(x, y, x + (r() - 0.5) * 10, y + len);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(70,42,24,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - wd / 2, y, wd, len);
  }
}

function chips(ctx, w, h, r, { count = 120, colors = ['#6a4a33', '#8f877a'] } = {}) {
  for (let i = 0; i < count; i++) {
    const x = r() * w, y = r() * h;
    const rad = 1.5 + Math.pow(r(), 2) * 14;
    wrapDraw(ctx, w, h, x, y, rad + 4, (xx, yy) => {
      ctx.fillStyle = colors[(r() * colors.length) | 0];
      ctx.beginPath();
      const n = 5 + ((r() * 4) | 0);
      for (let k = 0; k < n; k++) {
        const a = k / n * Math.PI * 2;
        const rr = rad * (0.5 + r() * 0.8);
        const px = xx + Math.cos(a) * rr, py = yy + Math.sin(a) * rr;
        k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath(); ctx.fill();
    });
  }
}

function panelSeams(ctx, w, h, cols, rows, r, { dark = 'rgba(60,40,28,.35)', light = 'rgba(255,245,220,.22)', rivets = true } = {}) {
  ctx.lineWidth = 2;
  for (let i = 0; i <= cols; i++) {
    const x = (i / cols) * w;
    ctx.strokeStyle = dark; ctx.beginPath(); ctx.moveTo(x + 1, 0); ctx.lineTo(x + 1, h); ctx.stroke();
    ctx.strokeStyle = light; ctx.beginPath(); ctx.moveTo(x - 1, 0); ctx.lineTo(x - 1, h); ctx.stroke();
    if (rivets) for (let y = 12; y < h; y += 26) {
      ctx.fillStyle = 'rgba(50,36,26,.45)'; ctx.beginPath(); ctx.arc(x + 8, y, 2.4, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,246,224,.4)'; ctx.beginPath(); ctx.arc(x + 7.2, y - 0.8, 1.4, 0, 7); ctx.fill();
    }
  }
  for (let j = 0; j <= rows; j++) {
    const y = (j / rows) * h;
    ctx.strokeStyle = dark; ctx.beginPath(); ctx.moveTo(0, y + 1); ctx.lineTo(w, y + 1); ctx.stroke();
    ctx.strokeStyle = light; ctx.beginPath(); ctx.moveTo(0, y - 1); ctx.lineTo(w, y - 1); ctx.stroke();
  }
}

// ---------------------------------------------------------------- sand
function sandTexture() {
  const W = 1024, H = 1024;
  const base = tileFBM(W, H, { freqX: 3, freqY: 3, octaves: 6, seed: 21 });
  const fine = tileFBM(W, H, { freqX: 22, freqY: 22, octaves: 3, seed: 67 });
  const field = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) field[i] = clamp(base[i] * 0.72 + fine[i] * 0.28, 0, 1);
  const c = fieldToCanvas(field, W, H, [
    [0, '#7c4f35'], [0.28, '#a97450'], [0.5, '#c89266'], [0.72, '#dcad80'], [0.88, '#e9c096'], [1, '#f1d2ad']
  ]);
  const ctx = c.getContext('2d');
  const r = mulberry32(9);

  // broad dune shading
  for (let i = 0; i < 18; i++) {
    const x = r() * W, y = r() * H, rad = 120 + r() * 360;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, r() < 0.5 ? 'rgba(80,46,28,.10)' : 'rgba(255,225,185,.10)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }

  // wind ripples
  for (let i = 0; i < 90; i++) {
    const y0 = r() * H, amp = 1 + r() * 4, wl = 25 + r() * 70, ph = r() * 9;
    const light = r() < 0.5;
    ctx.strokeStyle = light ? 'rgba(255,228,190,.13)' : 'rgba(96,58,36,.12)';
    ctx.lineWidth = 0.8 + r() * 1.8;
    for (let off = -1; off <= 1; off++) {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 8) {
        const y = y0 + off * H + Math.sin(x / wl + ph) * amp + Math.sin(x / (wl * 2.7) + ph * 2) * (amp * 0.6);
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
  }

  // pebbles + debris
  for (let i = 0; i < 1100; i++) {
    const x = r() * W, y = r() * H, rad = 0.7 + Math.pow(r(), 2) * 4.5;
    const col = ['#8a5b3c', '#a56f4b', '#c59a72', '#6f4933', '#b98a60'][(r() * 5) | 0];
    wrapDraw(ctx, W, H, x, y, rad + 3, (xx, yy) => {
      ctx.fillStyle = 'rgba(58,34,22,.35)';
      ctx.beginPath(); ctx.ellipse(xx + 1, yy + 1.5, rad, rad * 0.7, 0, 0, 7); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(xx, yy, rad, rad * 0.72, r() * 3, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,238,205,.35)';
      ctx.beginPath(); ctx.ellipse(xx - rad * 0.25, yy - rad * 0.3, rad * 0.4, rad * 0.24, 0, 0, 7); ctx.fill();
    });
  }
  // dry grass bits
  for (let i = 0; i < 220; i++) {
    const x = r() * W, y = r() * H, len = 4 + r() * 14, a = r() * Math.PI;
    ctx.strokeStyle = r() < 0.5 ? 'rgba(116,82,44,.4)' : 'rgba(190,150,96,.3)';
    ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke();
  }
  // dust patches
  for (let i = 0; i < 14; i++) {
    const x = r() * W, y = r() * H, rad = 60 + r() * 200;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, 'rgba(210,164,116,.14)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  grain(ctx, W, H, 6, 33);

  const nmap = normalFromCanvas(c, 1.15);
  const rough = grayscaleFromCanvas(c, { lo: 0.98, hi: 0.82 });
  return {
    map: texture(c, { repeat: [1, 1] }),
    normalMap: texture(nmap, { srgb: false, repeat: [1, 1] }),
    roughnessMap: texture(rough, { srgb: false, repeat: [1, 1] }),
  };
}

// ---------------------------------------------------------------- asphalt
function asphaltTexture() {
  const W = 1024, H = 1024;
  const base = tileFBM(W, H, { freqX: 4, freqY: 4, octaves: 5, seed: 41 });
  const c = fieldToCanvas(base, W, H, [[0, '#2f2c29'], [0.4, '#3d3935'], [0.7, '#4b443d'], [1, '#595047']]);
  const ctx = c.getContext('2d');
  const r = mulberry32(77);

  // aggregate grit
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < W * H; i++) {
    const rr = mulberry32(i * 7 + 3)() * 18 - 9;
    d[i * 4] = clamp(d[i * 4] + rr, 0, 255);
    d[i * 4 + 1] = clamp(d[i * 4 + 1] + rr, 0, 255);
    d[i * 4 + 2] = clamp(d[i * 4 + 2] + rr, 0, 255);
  }
  ctx.putImageData(img, 0, 0);
  speckle(ctx, W, H, 9000, ['#6b6257', '#81776a', '#242220', '#8b8175', '#554e45'], 5, 1.4);

  // repair patches
  for (let p = 0; p < 5; p++) {
    const x = r() * W, y = r() * H;
    const pts = [];
    const n = 9, rad = 60 + r() * 150;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      pts.push([x + Math.cos(a) * rad * (0.6 + r() * 0.7), y + Math.sin(a) * rad * (0.4 + r() * 0.5)]);
    }
    ctx.fillStyle = r() < 0.5 ? 'rgba(28,26,24,.32)' : 'rgba(90,82,72,.2)';
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(20,18,17,.45)'; ctx.lineWidth = 2; ctx.stroke();
  }

  // cracks
  for (let i = 0; i < 26; i++) {
    const x = r() * W, y = r() * H;
    crack(ctx, W, H, x, y, 40 + r() * 240, r() * Math.PI * 2, 0.8 + r() * 2.2, 'rgba(18,16,15,.65)', r);
  }
  // tar snakes
  for (let i = 0; i < 9; i++) {
    const y = r() * H;
    ctx.strokeStyle = 'rgba(24,21,19,.5)'; ctx.lineWidth = 2 + r() * 4;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 16) {
      const yy = y + Math.sin(x * 0.02 + i) * 30 + Math.sin(x * 0.007 + i * 3) * 70;
      x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
    }
    ctx.stroke();
  }
  // oil stains
  for (let i = 0; i < 9; i++) {
    const x = r() * W, y = r() * H, rad = 30 + r() * 110;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, 'rgba(14,13,13,.55)');
    g.addColorStop(0.5, 'rgba(24,22,20,.28)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // tyre polish bands
  for (let i = 0; i < 3; i++) {
    const y = r() * H;
    const g = ctx.createLinearGradient(0, y - 40, 0, y + 40);
    g.addColorStop(0, 'rgba(22,20,19,0)');
    g.addColorStop(0.5, 'rgba(22,20,19,.16)');
    g.addColorStop(1, 'rgba(22,20,19,0)');
    ctx.fillStyle = g; ctx.fillRect(0, y - 40, W, 80);
  }
  // sand drift / edge dust
  for (let i = 0; i < 18; i++) {
    const x = r() * W, y = r() * H, rad = 40 + r() * 160;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, 'rgba(190,146,104,.10)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  grain(ctx, W, H, 7, 12);

  const nmap = normalFromCanvas(c, 0.8);
  const rough = grayscaleFromCanvas(c, { lo: 0.58, hi: 0.97 });
  return {
    map: texture(c, { repeat: [1, 1] }),
    normalMap: texture(nmap, { srgb: false }),
    roughnessMap: texture(rough, { srgb: false }),
  };
}

// ---------------------------------------------------------------- concrete
function concreteTexture() {
  const W = 512, H = 512;
  const base = tileFBM(W, H, { freqX: 3, freqY: 3, octaves: 5, seed: 91 });
  const fine = tileFBM(W, H, { freqX: 28, freqY: 28, octaves: 3, seed: 5 });
  const c = fieldToCanvas(base, W, H, [[0, '#8c8476'], [0.5, '#aca194'], [1, '#c9beac']]);
  const ctx = c.getContext('2d');
  const r = mulberry32(311);
  for (let i = 0; i < 4; i++) {
    const x = r() * W, y = r() * H, rad = 50 + r() * 140;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, r() < 0.5 ? 'rgba(80,70,58,.15)' : 'rgba(255,240,215,.15)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  speckle(ctx, W, H, 2800, ['#6e665a', '#d8ccb8', '#8f8578'], 8, 1.2);
  for (let i = 0; i < 10; i++) crack(ctx, W, H, r() * W, r() * H, 30 + r() * 100, r() * 7, 0.7 + r(), 'rgba(55,48,40,.4)', r);
  grungeStreaks(ctx, W, H, r, { count: 14, color: 'rgba(58,48,36,.12)' });
  grain(ctx, W, H, 5, 44);
  const nmap = normalFromCanvas(c, 0.75);
  return {
    map: texture(c), normalMap: texture(nmap, { srgb: false }),
    roughnessMap: texture(grayscaleFromCanvas(c, { lo: 0.86, hi: 0.7 }), { srgb: false }),
  };
}

// ---------------------------------------------------------------- stucco wall
function stuccoTexture(tint = '#e4d8bd') {
  const W = 1024, H = 1024;
  const base = tileFBM(W, H, { freqX: 5, freqY: 5, octaves: 5, seed: 101 });
  const fine = tileFBM(W, H, { freqX: 30, freqY: 30, octaves: 3, seed: 7 });
  const mixed = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) mixed[i] = clamp(base[i] * 0.65 + fine[i] * 0.35, 0, 1);
  const c = fieldToCanvas(mixed, W, H, [
    [0, '#b8a98b'], [0.35, '#d2c4a7'], [0.6, tint], [0.85, '#efe5ce'], [1, '#f6eedb']
  ]);
  const ctx = c.getContext('2d');
  const r = mulberry32(55);
  // trowel arcs
  for (let i = 0; i < 70; i++) {
    const x = r() * W, y = r() * H, rad = 30 + r() * 200, a0 = r() * 6;
    ctx.strokeStyle = r() < 0.5 ? 'rgba(120,100,72,.05)' : 'rgba(255,250,232,.06)';
    ctx.lineWidth = 4 + r() * 20;
    ctx.beginPath(); ctx.arc(x, y, rad, a0, a0 + 1 + r() * 1.6); ctx.stroke();
  }
  // hairline cracks
  for (let i = 0; i < 9; i++) crack(ctx, W, H, r() * W, r() * H, 25 + r() * 110, r() * 7, 0.6 + r() * 1.1, 'rgba(92,76,56,.32)', r);
  // stains / streaks
  grungeStreaks(ctx, W, H, r, { count: 26, color: 'rgba(96,74,48,.09)' });
  for (let i = 0; i < 8; i++) {
    const x = r() * W, y = r() * H;
    const rad = 20 + r() * 90;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, 'rgba(100,82,56,.10)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // chips
  chips(ctx, W, H, r, { count: 40, colors: ['#a89c88', '#8b7d69'] });
  grain(ctx, W, H, 3.5, 87);
  const nmap = normalFromCanvas(c, 1.1);
  return {
    map: texture(c), normalMap: texture(nmap, { srgb: false }),
    roughnessMap: texture(grayscaleFromCanvas(c, { lo: 0.72, hi: 0.92 }), { srgb: false }),
  };
}

// ---------------------------------------------------------------- small paint details
function paintDetailTexture(baseHex, seed = 1) {
  const W = 512, H = 512;
  const c = cv(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = baseHex; ctx.fillRect(0, 0, W, H);
  const r = mulberry32(seed);
  // broad tonal patches
  for (let i = 0; i < 24; i++) {
    const x = r() * W, y = r() * H, rad = 20 + r() * 100;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, r() < 0.5 ? 'rgba(255,247,224,.08)' : 'rgba(60,40,24,.06)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // chipped paint and fine scratches
  chips(ctx, W, H, r, { count: 62, colors: ['#8d7f6d', '#6f4c33', '#b9aa91', '#7d6a55'] });
  for (let i = 0; i < 55; i++) {
    const x = r() * W, y = r() * H, len = 4 + r() * 34, a = r() * 6.28;
    ctx.strokeStyle = r() < 0.5 ? 'rgba(255,250,235,.15)' : 'rgba(56,43,32,.16)';
    ctx.lineWidth = 0.5 + r();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke();
  }
  // dirt settling along the bottom edge
  const g2 = ctx.createLinearGradient(0, H * 0.7, 0, H);
  g2.addColorStop(0, 'rgba(70,50,34,0)');
  g2.addColorStop(1, 'rgba(70,50,34,.16)');
  ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H, 2.5, seed + 4);
  return {
    map: texture(c),
    normalMap: texture(normalFromCanvas(c, 0.8), { srgb: false }),
    roughnessMap: texture(grayscaleFromCanvas(c, { lo: 0.9, hi: 0.58 }), { srgb: false }),
  };
}

// ---------------------------------------------------------------- painted metal
function paintedMetalTexture(baseHex, { rust = true, seed = 3 } = {}) {
  const W = 1024, H = 1024;
  const base = tileFBM(W, H, { freqX: 4, freqY: 4, octaves: 4, seed });
  const c = fieldToCanvas(base, W, H, [[0, 'rgba(0,0,0,0)']]);
  const ctx = c.getContext('2d');
  // base paint
  ctx.fillStyle = baseHex; ctx.fillRect(0, 0, W, H);
  // soft tonal variation
  const img = ctx.getImageData(0, 0, W, H);
  for (let i = 0; i < W * H; i++) {
    const t = (base[i] - 0.5) * 28;
    img.data[i * 4] = clamp(img.data[i * 4] + t + 4, 0, 255);
    img.data[i * 4 + 1] = clamp(img.data[i * 4 + 1] + t, 0, 255);
    img.data[i * 4 + 2] = clamp(img.data[i * 4 + 2] + t * 0.9, 0, 255);
  }
  ctx.putImageData(img, 0, 0);
  const r = mulberry32(seed * 37 + 5);
  // sun-bleach top, grime bottom
  let g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(255,250,232,.13)');
  g.addColorStop(0.5, 'rgba(255,255,255,0)');
  g.addColorStop(0.82, 'rgba(72,50,30,.04)');
  g.addColorStop(1, 'rgba(60,40,24,.16)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // seams + rivets
  panelSeams(ctx, W, H, 4, 2, r);

  // rust streaks from seams/rivets
  if (rust) {
    for (let i = 0; i < 48; i++) {
      const x = Math.floor(r() * 5) / 4 * W + 8;
      const y = Math.floor(r() * 3) / 2 * H;
      const len = 30 + r() * 260, wd = 1 + r() * 5;
      const gg = ctx.createLinearGradient(x, y, x + (r() - 0.5) * 8, y + len);
      gg.addColorStop(0, 'rgba(112,62,30,.55)');
      gg.addColorStop(0.55, 'rgba(138,74,34,.28)');
      gg.addColorStop(1, 'rgba(138,74,34,0)');
      ctx.fillStyle = gg;
      ctx.fillRect(x - wd / 2, y, wd, len);
    }
    // rust blooms
    for (let i = 0; i < 16; i++) {
      const x = r() * W, y = r() * H, rad = 6 + r() * 26;
      const gg = ctx.createRadialGradient(x, y, 0, x, y, rad);
      gg.addColorStop(0, 'rgba(120,58,26,.6)');
      gg.addColorStop(0.6, 'rgba(146,82,38,.35)');
      gg.addColorStop(1, 'rgba(146,82,38,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fill();
    }
  }

  // paint chips
  chips(ctx, W, H, r, { count: 170, colors: ['#8d7f6d', '#6f4c33', '#b9aa91', '#7d6a55'] });
  // scratches
  for (let i = 0; i < 90; i++) {
    const x = r() * W, y = r() * H, len = 4 + r() * 48, a = r() * 6.28;
    ctx.strokeStyle = r() < 0.5 ? 'rgba(255,250,235,.16)' : 'rgba(56,43,32,.16)';
    ctx.lineWidth = 0.6 + r();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke();
  }
  // dirt pooling near bottom
  const g2 = ctx.createLinearGradient(0, H * 0.72, 0, H);
  g2.addColorStop(0, 'rgba(70,50,34,0)');
  g2.addColorStop(1, 'rgba(70,50,34,.2)');
  ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H, 3, seed);

  const nmap = normalFromCanvas(c, 1.5);
  const roughCanvas = grayscaleFromCanvas(c, { lo: 0.9, hi: 0.34 });
  const rctx = roughCanvas.getContext('2d');
  rctx.fillStyle = 'rgba(0,0,0,.14)'; rctx.fillRect(0, 0, W, H);
  return {
    map: texture(c), normalMap: texture(nmap, { srgb: false }),
    roughnessMap: texture(roughCanvas, { srgb: false }),
  };
}

// ---------------------------------------------------------------- rust + corrugated metal
function rustTexture() {
  const W = 512, H = 512;
  const base = tileFBM(W, H, { freqX: 5, freqY: 5, octaves: 5, seed: 141 });
  const fine = tileFBM(W, H, { freqX: 24, freqY: 24, octaves: 3, seed: 17 });
  const c = fieldToCanvas(base, W, H, [[0, '#5a3423'], [0.35, '#84492c'], [0.6, '#a75c34'], [0.8, '#c07846'], [1, '#8d5a3c']]);
  const ctx = c.getContext('2d');
  const r = mulberry32(151);
  const img = ctx.getImageData(0, 0, W, H);
  for (let i = 0; i < W * H; i++) {
    const t = (fine[i] - 0.5) * 26;
    img.data[i * 4] = clamp(img.data[i * 4] + t, 0, 255);
    img.data[i * 4 + 1] = clamp(img.data[i * 4 + 1] + t, 0, 255);
    img.data[i * 4 + 2] = clamp(img.data[i * 4 + 2] + t, 0, 255);
  }
  ctx.putImageData(img, 0, 0);
  for (let i = 0; i < 30; i++) {
    const x = r() * W, y = r() * H, rad = 3 + r() * 18;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, 'rgba(40,22,14,.55)'); g.addColorStop(1, 'rgba(40,22,14,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fill();
  }
  grain(ctx, W, H, 8, 71);
  return {
    map: texture(c), normalMap: texture(normalFromCanvas(c, 1.3), { srgb: false }),
    roughnessMap: texture(grayscaleFromCanvas(c, { lo: 0.95, hi: 0.7 }), { srgb: false }),
  };
}

function corrugatedTexture() {
  const W = 512, H = 512;
  const src = rustTexture();
  const c = cv(W, H);
  const ctx = c.getContext('2d');
  ctx.drawImage(src.map.image, 0, 0);
  // vertical panel seams shading
  for (let x = 0; x < W; x += 64) {
    const g = ctx.createLinearGradient(x, 0, x + 64, 0);
    g.addColorStop(0, 'rgba(255,240,220,.28)');
    g.addColorStop(0.45, 'rgba(60,32,18,.08)');
    g.addColorStop(0.55, 'rgba(255,240,220,.18)');
    g.addColorStop(1, 'rgba(50,26,14,.32)');
    ctx.fillStyle = g; ctx.fillRect(x, 0, 64, H);
  }
  const height = cv(W, H);
  const hctx = height.getContext('2d');
  const hg = hctx.createLinearGradient(0, 0, 64, 0);
  for (let i = 0; i <= 10; i++) hg.addColorStop(i / 10, i % 2 ? '#222' : '#eee');
  hctx.fillStyle = hg; hctx.fillRect(0, 0, 64, H);
  for (let x = 64; x < W; x += 64) hctx.drawImage(height, 0, 0, 64, H, x, 0, 64, H);
  const nmap = normalFromCanvas(height, 3);
  return {
    map: texture(c), normalMap: texture(nmap, { srgb: false }),
    roughnessMap: texture(grayscaleFromCanvas(c, { lo: 0.88, hi: 0.62 }), { srgb: false }),
  };
}

// ---------------------------------------------------------------- wood
function woodTexture() {
  const W = 512, H = 512;
  const c = cv(W, H);
  const ctx = c.getContext('2d');
  const r = mulberry32(211);
  ctx.fillStyle = '#6b4d35'; ctx.fillRect(0, 0, W, H);
  const plankH = H / 4;
  for (let p = 0; p < 4; p++) {
    const y = p * plankH;
    ctx.fillStyle = ['#7a5a3d', '#6a4c33', '#816145', '#5f432d'][p];
    ctx.fillRect(0, y + 2, W, plankH - 4);
    // grain
    for (let i = 0; i < 30; i++) {
      const gy = y + r() * plankH;
      ctx.strokeStyle = r() < 0.5 ? 'rgba(50,33,20,.22)' : 'rgba(200,170,130,.10)';
      ctx.lineWidth = 0.6 + r() * 1.4;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 12) {
        const yy = gy + Math.sin(x * 0.02 + i * 1.3) * 2 + Math.sin(x * 0.09 + p) * 0.8;
        x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
      }
      ctx.stroke();
    }
    // knots
    for (let k = 0; k < 2; k++) {
      if (r() < 0.4) continue;
      const kx = r() * W, ky = y + plankH * (0.3 + r() * 0.4);
      for (let rr = 7; rr > 0; rr -= 2) {
        ctx.strokeStyle = `rgba(48,30,18,${0.08 + rr * 0.015})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(kx, ky, rr, rr * 0.55, 0.2, 0, 7); ctx.stroke();
      }
    }
    // nails
    for (const nx of [24, W - 24]) {
      ctx.fillStyle = 'rgba(35,28,22,.6)'; ctx.beginPath(); ctx.arc(nx, y + plankH / 2, 2.4, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(220,210,190,.3)'; ctx.beginPath(); ctx.arc(nx - 0.8, y + plankH / 2 - 1, 1.2, 0, 7); ctx.fill();
    }
    ctx.fillStyle = 'rgba(30,20,12,.4)'; ctx.fillRect(0, y, W, 2);
  }
  // weathering
  for (let i = 0; i < 60; i++) {
    ctx.strokeStyle = 'rgba(220,205,180,.05)'; ctx.lineWidth = 0.8;
    const x = r() * W, y = r() * H;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 20 + r() * 80, y + (r() - 0.5) * 4); ctx.stroke();
  }
  grain(ctx, W, H, 5, 41);
  return {
    map: texture(c), normalMap: texture(normalFromCanvas(c, 0.8), { srgb: false }),
    roughnessMap: texture(grayscaleFromCanvas(c, { lo: 0.9, hi: 0.7 }), { srgb: false }),
  };
}

// ---------------------------------------------------------------- rubber
function rubberTexture() {
  const W = 512, H = 512;
  const base = tileFBM(W, H, { freqX: 8, freqY: 8, octaves: 3, seed: 301 });
  const c = fieldToCanvas(base, W, H, [[0, '#121110'], [0.5, '#1c1917'], [1, '#2a2522']]);
  const ctx = c.getContext('2d');
  // tread ribs (horizontal bands; tyres UV-wrap)
  for (let y = 0; y < H; y += 34) {
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, y, W, 10);
    ctx.fillStyle = 'rgba(180,165,150,.05)'; ctx.fillRect(0, y + 10, W, 2);
  }
  grain(ctx, W, H, 4, 9);
  return {
    map: texture(c), normalMap: texture(normalFromCanvas(c, 1.4), { srgb: false }),
    roughnessMap: texture(grayscaleFromCanvas(c, { lo: 0.98, hi: 0.88 }), { srgb: false }),
  };
}

// ---------------------------------------------------------------- water normal
function waterNormalField(seed = 1, scale = 1) {
  const W = 512, H = 512;
  const height = cv(W, H);
  const hctx = height.getContext('2d');
  const img = hctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H;
      let h = 0.5;
      h += 0.22 * Math.sin((u * 14 + v * 5 + Math.sin(v * 9) * 0.6) * Math.PI * 2 + seed);
      h += 0.14 * Math.sin((u * -7 + v * 19 + Math.sin(u * 11) * 0.5) * Math.PI * 2 + seed * 2);
      h += 0.12 * (fbm2(u * 12 + seed, v * 12, 3, seed * 7) - 0.5);
      h += 0.08 * (fbm2(u * 28, v * 28, 3, seed * 13) - 0.5);
      const val = clamp(h, 0, 1) * 255;
      const i = (y * W + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = val; img.data[i + 3] = 255;
    }
  }
  hctx.putImageData(img, 0, 0);
  const n = normalFromCanvas(height, 2.2 * scale);
  return texture(n, { srgb: false });
}

// ---------------------------------------------------------------- vegetation alpha
function grassTexture() {
  const W = 512, H = 512;
  const c = cv(W, H);
  const ctx = c.getContext('2d');
  const r = mulberry32(401);
  ctx.clearRect(0, 0, W, H);
  const cols = ['#8f9a55', '#a7a968', '#c0b277', '#7d8848', '#b49b5e', '#6d7a40'];
  for (let i = 0; i < 80; i++) {
    const x0 = W * 0.5 + (r() - 0.5) * W * 0.5;
    const baseY = H * 0.98;
    const len = H * (0.25 + r() * 0.7);
    const lean = (r() - 0.5) * W * 0.5;
    const col = cols[(r() * cols.length) | 0];
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5 + r() * 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, baseY);
    ctx.quadraticCurveTo(x0 + lean * 0.4, baseY - len * 0.6, x0 + lean, baseY - len);
    ctx.stroke();
    if (r() < 0.3) {
      ctx.strokeStyle = '#d8c98e'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0 + lean, baseY - len); ctx.lineTo(x0 + lean + (r() - 0.5) * 14, baseY - len - 8 - r() * 18); ctx.stroke();
    }
  }
  return texture(c, { wrap: THREE.ClampToEdgeWrapping });
}

function shrubTexture() {
  const W = 512, H = 512;
  const c = cv(W, H);
  const ctx = c.getContext('2d');
  const r = mulberry32(501);
  ctx.clearRect(0, 0, W, H);
  for (let i = 0; i < 1100; i++) {
    const a = r() * Math.PI * 2, rad = Math.pow(r(), 0.6) * W * 0.42;
    const x = W / 2 + Math.cos(a) * rad * 1.1;
    const y = H * 0.62 + Math.sin(a) * rad * 0.8;
    const s = 2 + r() * 8;
    const col = ['#5f6c3f', '#7a854f', '#93975e', '#4d5a36', '#a8a06a'][(r() * 5) | 0];
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.5 + r() * 0.5;
    ctx.beginPath(); ctx.ellipse(x, y, s, s * (0.5 + r() * 0.4), r() * 3, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
  return texture(c, { wrap: THREE.ClampToEdgeWrapping });
}

function yuccaTexture() {
  const W = 512, H = 512;
  const c = cv(W, H);
  const ctx = c.getContext('2d');
  const r = mulberry32(601);
  for (let i = 0; i < 45; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * Math.PI * 1.5;
    const x0 = W / 2, y0 = H * 0.93;
    const len = H * (0.3 + r() * 0.55);
    const tipX = x0 + Math.cos(a) * len, tipY = y0 + Math.sin(a) * len;
    const wd = 2 + r() * 6;
    const grad = ctx.createLinearGradient(x0, y0, tipX, tipY);
    grad.addColorStop(0, '#4b6136'); grad.addColorStop(0.6, '#6d7c43'); grad.addColorStop(1, '#94a05a');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(x0 + Math.cos(a) * len * 0.5 + 10, y0 + Math.sin(a) * len * 0.5, tipX, tipY);
    ctx.quadraticCurveTo(x0 + Math.cos(a) * len * 0.5 - 10, y0 + Math.sin(a) * len * 0.5, x0, y0);
    ctx.fill();
  }
  return texture(c, { wrap: THREE.ClampToEdgeWrapping });
}

// ---------------------------------------------------------------- fx sprites
function glowTexture() {
  const W = 256;
  const c = cv(W, W);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,244,220,.9)');
  g.addColorStop(0.45, 'rgba(255,220,170,.25)');
  g.addColorStop(1, 'rgba(255,200,140,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, W);
  return texture(c, { wrap: THREE.ClampToEdgeWrapping });
}

function dustTexture() {
  const W = 256;
  const c = cv(W, W);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
  g.addColorStop(0, 'rgba(255,236,206,.75)');
  g.addColorStop(0.35, 'rgba(240,206,166,.3)');
  g.addColorStop(1, 'rgba(230,180,130,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, W);
  return texture(c, { wrap: THREE.ClampToEdgeWrapping });
}

function smokeTexture() {
  const W = 256;
  const c = cv(W, W);
  const ctx = c.getContext('2d');
  const r = mulberry32(701);
  for (let i = 0; i < 26; i++) {
    const x = W / 2 + (r() - 0.5) * 80, y = W / 2 + (r() - 0.5) * 80, rad = 20 + r() * 60;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, 'rgba(255,255,255,.11)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, W);
  }
  return texture(c, { wrap: THREE.ClampToEdgeWrapping });
}

function puddleAlphaTexture() {
  return texture(blobCanvas(512, 77, 0.85), { srgb: false, wrap: THREE.ClampToEdgeWrapping });
}

function contactTexture() {
  const W = 256;
  const c = cv(W, W);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(W / 2, W * 0.52, 0, W / 2, W * 0.52, W * 0.5);
  g.addColorStop(0, 'rgba(0,0,0,.72)');
  g.addColorStop(0.45, 'rgba(0,0,0,.4)');
  g.addColorStop(0.8, 'rgba(0,0,0,.1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, W);
  return texture(c, { wrap: THREE.ClampToEdgeWrapping });
}

function cloudTexture() {
  const W = 512, H = 256;
  const c = cv(W, H);
  const ctx = c.getContext('2d');
  const r = mulberry32(801);
  for (let i = 0; i < 40; i++) {
    const x = W * (0.18 + r() * 0.64), y = H * (0.32 + r() * 0.36), rad = 20 + r() * 70;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, 'rgba(255,255,255,.30)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  // feather the card edges so the sprite never reads as a rectangle
  const fade = ctx.createRadialGradient(W * 0.5, H * 0.5, W * 0.08, W * 0.5, H * 0.5, W * 0.5);
  fade.addColorStop(0, 'rgba(255,255,255,1)');
  fade.addColorStop(0.55, 'rgba(255,255,255,.92)');
  fade.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = fade; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  return texture(c, { wrap: THREE.ClampToEdgeWrapping });
}

// ---------------------------------------------------------------- build
export async function buildSurfaceTextures(onProgress = () => {}) {
  const steps = [
    ['CUTTING SANDSTONE', () => { T.sand = sandTexture(); }],
    ['POURING THE ASPHALT', () => { T.asphalt = asphaltTexture(); }],
    ['CASTING CONCRETE', () => { T.concrete = concreteTexture(); }],
    ['TROWELING STUCCO', () => { T.stucco = stuccoTexture(); }],
    ['PAINTING THE CANOPY', () => {
      T.metalCream = paintedMetalTexture('#ded5bd', { seed: 11 });
      T.metalMint = paintedMetalTexture('#9fc3bb', { seed: 12 });
      T.metalTeal = paintedMetalTexture('#3f8b8b', { seed: 13 });
      T.metalRust = paintedMetalTexture('#a05a3c', { seed: 14, rust: false });
      T.paintCream = paintDetailTexture('#ded1b3', 21);
      T.paintRed = paintDetailTexture('#a33d2f', 22);
      T.paintWhite = paintDetailTexture('#d8ceb8', 23);
    }],
    ['AGING THE STEEL', () => {
      T.rust = rustTexture();
      T.corrugated = corrugatedTexture();
      T.wood = woodTexture();
      T.rubber = rubberTexture();
    }],
    ['FLOODING THE WASH', () => {
      T.waterNormal = waterNormalField(3, 1);
      T.waterNormalFine = waterNormalField(7, 0.65);
    }],
    ['PLANTING THE DESERT', () => {
      T.grass = grassTexture();
      T.shrub = shrubTexture();
      T.yucca = yuccaTexture();
    }],
    ['MIXING THE LIGHT', () => {
      T.glow = glowTexture();
      T.dust = dustTexture();
      T.smoke = smokeTexture();
      T.puddleAlpha = puddleAlphaTexture();
      T.contact = contactTexture();
      T.cloud = cloudTexture();
    }],
  ];
  for (let i = 0; i < steps.length; i++) {
    onProgress(steps[i][0], (i / steps.length) * 0.85);
    await new Promise(r => setTimeout(r, 10));
    steps[i][1]();
    await new Promise(r => setTimeout(r, 5));
  }
  onProgress('SIGNS & NEON', 0.9);
  return T;
}

export { T as surfaceTextures, cv as makeCanvas, texture as makeTexture, grain, crack, wrapDraw, panelSeams, grungeStreaks, chips };
