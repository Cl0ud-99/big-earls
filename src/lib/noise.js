// Deterministic noise + math helpers used by geometry and texture generators.
export function mulberry32(seed = 1) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const fract = x => x - Math.floor(x);
export const mix = (a, b, t) => a * (1 - t) + b * t;

function hashInt(x, y, seed) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 362437);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// 2D value noise in [0,1]. Not tileable by itself.
export function noise2(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hashInt(xi, yi, seed), b = hashInt(xi + 1, yi, seed);
  const c = hashInt(xi, yi + 1, seed), d = hashInt(xi + 1, yi + 1, seed);
  return mix(mix(a, b, u), mix(c, d, u), v);
}

// Tileable along both axes when ix/iy integers are used as the lattice period.
export function tileNoise(x, y, ix, iy, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const x0 = ((xi % ix) + ix) % ix, x1 = (x0 + 1) % ix;
  const y0 = ((yi % iy) + iy) % iy, y1 = (y0 + 1) % iy;
  const a = hashInt(x0, y0, seed), b = hashInt(x1, y0, seed);
  const c = hashInt(x0, y1, seed), d = hashInt(x1, y1, seed);
  return mix(mix(a, b, u), mix(c, d, u), v);
}

export function fbm2(x, y, octaves = 5, seed = 0, lac = 2, gain = 0.5) {
  let s = 0, amp = 1, norm = 0, f = 1;
  for (let i = 0; i < octaves; i++) {
    s += noise2(x * f, y * f, seed + i * 131) * amp;
    norm += amp; amp *= gain; f *= lac;
  }
  return s / norm;
}

export function fbm3(x, y, z, octaves = 4, seed = 0, lac = 2.03, gain = 0.5) {
  let s = 0, amp = 1, norm = 0, f = 1;
  for (let i = 0; i < octaves; i++) {
    // cheap 3d-ish noise: mix two 2d slices
    const zz = z * f * 0.35 + i * 3.7;
    const a = noise2(x * f + zz * 0.7, y * f - zz * 0.3, seed + i * 71);
    const b = noise2(x * f - zz * 0.2 + 5.2, y * f + zz * 0.55 + 9.1, seed + i * 71 + 17);
    const w = fract(zz * 0.25);
    s += (a * (1 - w) + b * w) * amp;
    norm += amp; amp *= gain; f *= lac;
  }
  return s / norm;
}

// Tileable fractal noise field rendered straight into Float32Array (0..1).
export function tileFBM(w, h, { freqX = 4, freqY = 4, octaves = 5, seed = 1, gain = 0.5, lac = 2, ridged = false } = {}) {
  const out = new Float32Array(w * h);
  const norm = (() => { let a = 1, s = 0; for (let i = 0; i < octaves; i++) { s += a; a *= gain; } return s; })();
  for (let y = 0; y < h; y++) {
    const v = y / h;
    for (let x = 0; x < w; x++) {
      const u = x / w;
      let s = 0, amp = 1, nrm = 0, fx = freqX, fy = freqY;
      for (let o = 0; o < octaves; o++) {
        let n = tileNoise(u * fx, v * fy, fx, fy, seed + o * 911);
        if (ridged) n = 1 - Math.abs(n * 2 - 1);
        s += n * amp; nrm += amp;
        amp *= gain; fx *= lac; fy *= lac;
      }
      out[y * w + x] = clamp(s / nrm, 0, 1);
    }
  }
  return out;
}

export function fieldToCanvas(field, w, h, ramp) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const lut = buildLUT(ramp);
  for (let i = 0; i < w * h; i++) {
    const t = field[i];
    const idx = clamp((t * 255) | 0, 0, 255) * 4;
    img.data[i * 4] = lut[idx]; img.data[i * 4 + 1] = lut[idx + 1];
    img.data[i * 4 + 2] = lut[idx + 2]; img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// ramp: [[t, '#hex'], ...]
export function buildLUT(ramp) {
  const lut = new Uint8ClampedArray(256 * 4);
  const stops = ramp.map(([t, c]) => [clamp(t, 0, 1), hex(c)]);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = stops[0], b = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) { a = stops[s]; b = stops[s + 1]; break; }
    }
    const d = Math.max(1e-6, b[0] - a[0]);
    const k = clamp((t - a[0]) / d, 0, 1);
    lut[i * 4] = lerp(a[1][0], b[1][0], k);
    lut[i * 4 + 1] = lerp(a[1][1], b[1][1], k);
    lut[i * 4 + 2] = lerp(a[1][2], b[1][2], k);
    lut[i * 4 + 3] = 255;
  }
  return lut;
}

export function hex(h) {
  if (Array.isArray(h)) return h;
  const s = h.replace('#', '');
  const n = s.length === 3 ? s.split('').map(c => c + c).join('') : s;
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

export const rgba = (h, a = 1) => { const c = hex(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };

export function shade(h, k) {
  const c = hex(h);
  return `rgb(${clamp(c[0] * k, 0, 255) | 0},${clamp(c[1] * k, 0, 255) | 0},${clamp(c[2] * k, 0, 255) | 0})`;
}

// Height (luminance) -> tangent-space normal map.
export function normalFromCanvas(src, strength = 2, repeat = true) {
  const w = src.width, h = src.height;
  const sctx = src.getContext('2d');
  const data = sctx.getImageData(0, 0, w, h).data;
  const height = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) height[i] = (data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114) / 255;
  const out = document.createElement('canvas'); out.width = w; out.height = h;
  const octx = out.getContext('2d');
  const img = octx.createImageData(w, h);
  const wrap = (v, n) => repeat ? (v + n) % n : clamp(v, 0, n - 1);
  for (let y = 0; y < h; y++) {
    const ym = wrap(y - 1, h), yp = wrap(y + 1, h);
    for (let x = 0; x < w; x++) {
      const xm = wrap(x - 1, w), xp = wrap(x + 1, w);
      const dx = (height[y * w + xp] - height[y * w + xm]) * strength;
      const dy = (height[yp * w + x] - height[ym * w + x]) * strength;
      let nx = -dx, ny = -dy, nz = 1;
      const len = Math.hypot(nx, ny, nz);
      const i = (y * w + x) * 4;
      img.data[i] = (nx / len * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny / len * 0.5 + 0.5) * 255;
      img.data[i + 2] = (nz / len * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  return out;
}

export function grayscaleFromCanvas(src, { lo = 0, hi = 1, gamma = 1 } = {}) {
  const w = src.width, h = src.height;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < w * h; i++) {
    let t = (img.data[i * 4] * 0.299 + img.data[i * 4 + 1] * 0.587 + img.data[i * 4 + 2] * 0.114) / 255;
    t = Math.pow(t, gamma);
    const v = clamp(lerp(lo, hi, t) * 255, 0, 255);
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// Soft irregular blob used for shadows / puddles / fog.
export function blobCanvas(size = 512, seed = 1, roughness = 0.55, feather = 0.5) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d');
  const r = mulberry32(seed);
  const pts = [];
  const n = 48;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    const rad = size * (0.36 + roughness * 0.1 * (fbm2(Math.cos(a) * 1.7 + 4, Math.sin(a) * 1.7, 4, seed) - 0.5) * 2);
    pts.push([size / 2 + Math.cos(a) * rad, size / 2 + Math.sin(a) * rad]);
  }
  const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.2, size / 2, size / 2, size * 0.5);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.72, 'rgba(255,255,255,.9)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const p = pts[i % n], q = pts[(i + 1) % n];
    if (i === 0) ctx.moveTo(p[0], p[1]);
    const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
    ctx.quadraticCurveTo(p[0], p[1], mx, my);
  }
  ctx.closePath(); ctx.fill();
  return c;
}
