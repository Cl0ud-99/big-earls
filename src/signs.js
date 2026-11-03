import * as THREE from 'three';
import { mulberry32, clamp, rgba, blobCanvas } from './lib/noise.js';

const S = {};
let aniso = 8;
export function setSignAnisotropy(v) { aniso = v; }

function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c, { srgb = true, clamp = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  t.anisotropy = aniso;
  return t;
}
// Sample the alpha silhouette of the wordmark and return a ring of bulb
// positions just outside the letters. Coordinates are normalized [u, v] with
// v measured from the top of the canvas.
function wordBulbOutline(c, { threshold = 170, stepPx = 26, marginPx = 15 } = {}) {
  const W = c.width, H = c.height;
  const data = c.getContext('2d').getImageData(0, 0, W, H).data;
  const cols = [];
  for (let x = 0; x < W; x += 2) {
    let top = -1, bottom = -1;
    for (let y = 0; y < H; y += 2) {
      if (data[(y * W + x) * 4 + 3] > threshold) {
        if (top < 0) top = y;
        bottom = y;
      }
    }
    if (top >= 0) cols.push({ x, top, bottom });
  }
  if (cols.length < 20) return [];
  const topAt = (x) => {
    let best = null, bestD = 1e9;
    for (const c of cols) { const d = Math.abs(c.x - x); if (d < bestD) { bestD = d; best = c; } }
    return best ? best.top : H * 0.5;
  };
  const bottomAt = (x) => {
    let best = null, bestD = 1e9;
    for (const c of cols) { const d = Math.abs(c.x - x); if (d < bestD) { bestD = d; best = c; } }
    return best ? best.bottom : H * 0.5;
  };
  const minX = cols[0].x, maxX = cols[cols.length - 1].x;
  const pts = [];
  const push = (x, y) => pts.push([Math.min(1, Math.max(0, x / W)), Math.min(1, Math.max(0, y / H))]);
  for (let x = minX; x <= maxX; x += stepPx) push(x, topAt(x) - marginPx);
  for (let x = maxX; x >= minX; x -= stepPx) push(x, bottomAt(x) + marginPx);
  const edgeSteps = Math.max(1, Math.round((bottomAt(minX) - topAt(minX) + marginPx * 2) / stepPx));
  for (let i = 1; i < edgeSteps; i++) push(minX - marginPx, topAt(minX) - marginPx + i * stepPx);
  const edgeStepsR = Math.max(1, Math.round((bottomAt(maxX) - topAt(maxX) + marginPx * 2) / stepPx));
  for (let i = 1; i < edgeStepsR; i++) push(maxX + marginPx, topAt(maxX) - marginPx + i * stepPx);
  return pts;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function stars(ctx, x, y, rad, color, n = 5) {
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 - Math.PI / 2;
    const xx = x + Math.cos(a) * rad, yy = y + Math.sin(a) * rad;
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const aa = k * Math.PI / 4, rr = k % 2 ? 2.2 : 6;
      k ? ctx.lineTo(xx + Math.cos(aa) * rr, yy + Math.sin(aa) * rr) : ctx.moveTo(xx + Math.cos(aa) * rr, yy + Math.sin(aa) * rr);
    }
    ctx.closePath(); ctx.fill();
  }
}
function crown(ctx, x, y, w, h, fill = '#E8B44C', stroke = '#5A2A15') {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.92);
  ctx.lineTo(x + w * 0.03, y + h * 0.28);
  ctx.lineTo(x + w * 0.24, y + h * 0.55);
  ctx.lineTo(x + w * 0.5, y);
  ctx.lineTo(x + w * 0.76, y + h * 0.55);
  ctx.lineTo(x + w * 0.97, y + h * 0.28);
  ctx.lineTo(x + w, y + h * 0.92);
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = Math.max(3, w * 0.018); ctx.strokeStyle = stroke; ctx.stroke();
  // band
  ctx.fillStyle = stroke; ctx.globalAlpha = 0.85;
  ctx.fillRect(x + w * 0.08, y + h * 0.82, w * 0.84, h * 0.08);
  ctx.globalAlpha = 1;
  for (const [cx2, cy] of [[x + w * 0.11, y + h * 0.3], [x + w * 0.5, y + h * 0.13], [x + w * 0.89, y + h * 0.3]]) {
    ctx.fillStyle = '#F7E3AE';
    ctx.beginPath(); ctx.arc(cx2, cy, w * 0.028, 0, 7); ctx.fill();
  }
  ctx.restore();
}
function tracked(ctx, text, x, y, spacing, align = 'left') {
  const chars = [...text];
  let tw = 0;
  for (const ch of chars) tw += ctx.measureText(ch).width + spacing;
  tw -= spacing;
  let cx = align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x;
  for (const ch of chars) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
  return tw;
}
function fitFont(ctx, text, family, size, maxWidth, weight = '') {
  let s = size;
  for (let i = 0; i < 40; i++) {
    ctx.font = `${weight} ${s}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    s -= Math.max(2, s * 0.02);
  }
  return s;
}

function weather(ctx, w, h, seed = 1, { alphaErase = 0.002, dirt = 0.3, scratch = 0.5, edgeRust = true } = {}) {
  const r = mulberry32(seed);
  if (edgeRust) {
    const eg = ctx.createLinearGradient(0, 0, 0, h);
    eg.addColorStop(0, 'rgba(70,40,22,.18)');
    eg.addColorStop(0.08, 'rgba(70,40,22,0)');
    eg.addColorStop(0.88, 'rgba(60,34,18,0)');
    eg.addColorStop(1, 'rgba(60,34,18,.24)');
    ctx.fillStyle = eg; ctx.fillRect(0, 0, w, h);
  }
  // dust blobs
  ctx.save();
  for (let i = 0; i < 22 * dirt; i++) {
    const x = r() * w, y = r() * h, rad = 20 + r() * w * 0.12;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(60,38,22,${0.025 + r() * 0.05})`);
    g.addColorStop(1, 'rgba(60,38,22,0)');
    ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  ctx.restore();
  // scratches
  ctx.save();
  for (let i = 0; i < 60 * scratch; i++) {
    const x = r() * w, y = r() * h, len = 8 + r() * 90, a = r() * 6.28;
    ctx.strokeStyle = r() < 0.5 ? `rgba(255,246,225,${0.05 + r() * 0.12})` : `rgba(47,30,18,${0.05 + r() * 0.12})`;
    ctx.lineWidth = 0.6 + r() * 1.2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke();
  }
  ctx.restore();
  // chips
  const count = Math.round(alphaErase * 1000);
  for (let i = 0; i < count; i++) {
    const x = r() * w, y = r() * h, rad = 0.8 + Math.pow(r(), 2) * 5;
    ctx.fillStyle = r() < 0.5 ? 'rgba(86,60,38,.5)' : 'rgba(215,200,170,.35)';
    ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fill();
  }
  // rust drips at bottom edge
  for (let i = 0; i < 6; i++) {
    const x = r() * w, wd = 2 + r() * 7, len = 20 + r() * 80;
    const g = ctx.createLinearGradient(0, h - len, 0, h);
    g.addColorStop(0, 'rgba(110,55,25,0)');
    g.addColorStop(1, 'rgba(110,55,25,.28)');
    ctx.fillStyle = g; ctx.fillRect(x, h - len, wd, len);
  }
}

// ---------------------------------------------------------------- wordmark
function bigEarls() {
  const W = 2048, H = 760;
  const c = cv(W, H);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  const text = "Big Earl's";
  const maxW = W * 0.9;
  let size = fitFont(ctx, text, 'Pacifico', 420, maxW);
  ctx.save();
  ctx.translate(W / 2, H * 0.52);
  ctx.transform(1, 0, -0.075, 1, 0, 0);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${size}px Pacifico`;
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  // drop shadow
  ctx.save();
  ctx.filter = 'blur(10px)';
  ctx.fillStyle = 'rgba(40,16,8,.55)';
  ctx.fillText(text, 0, 28);
  ctx.restore();
  // dark extrusion
  for (let d = 22; d >= 2; d -= 4) {
    ctx.strokeStyle = d > 10 ? '#4a1d10' : '#6b2c16';
    ctx.lineWidth = 26;
    ctx.strokeText(text, 0, d);
  }
  // dark outline
  ctx.strokeStyle = '#542112';
  ctx.lineWidth = 30;
  ctx.strokeText(text, 0, 0);
  // gold face
  const g = ctx.createLinearGradient(0, -size * 0.5, 0, size * 0.5);
  g.addColorStop(0, '#FFF1C6');
  g.addColorStop(0.28, '#F8D68C');
  g.addColorStop(0.55, '#E9B252');
  g.addColorStop(0.8, '#C5852D');
  g.addColorStop(1, '#E8BE6B');
  ctx.fillStyle = g;
  ctx.fillText(text, 0, 0);
  // inner bevel
  ctx.strokeStyle = 'rgba(255,248,220,.65)';
  ctx.lineWidth = 4;
  ctx.strokeText(text, 0, -3);
  // warm reflection streak
  ctx.restore();
  // dirt / patina on letters only
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const r = mulberry32(5);
  for (let i = 0; i < 100; i++) {
    const x = r() * W, y = r() * H, rad = 2 + r() * 16;
    ctx.fillStyle = `rgba(70,38,18,${0.02 + r() * 0.07})`;
    ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fill();
  }
  for (let i = 0; i < 25; i++) {
    ctx.fillStyle = 'rgba(67,40,22,.55)';
    const x = r() * W, y = r() * H;
    ctx.beginPath(); ctx.arc(x, y, 0.8 + r() * 2, 0, 7); ctx.fill();
  }
  ctx.restore();
  S.bigEarlsBulbs = wordBulbOutline(c);
  return tex(c);
}

function bigEarlsWide() {
  // simplified horizontal logo used for the end card in texture form, not essential
  return bigEarls();
}

// ---------------------------------------------------------------- 24 hour service board
function serviceBoard() {
  const W = 1400, H = 760;
  const c = cv(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#EFE5CC'; ctx.fillRect(0, 0, W, H);
  // painted panel
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, 'rgba(255,251,235,.7)');
  bg.addColorStop(0.6, 'rgba(238,225,198,0)');
  bg.addColorStop(1, 'rgba(185,166,132,.28)');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  // borders
  ctx.strokeStyle = '#4D8B84'; ctx.lineWidth = 18; ctx.strokeRect(28, 28, W - 56, H - 56);
  ctx.strokeStyle = '#C4573B'; ctx.lineWidth = 6; ctx.strokeRect(54, 54, W - 108, H - 108);
  ctx.strokeStyle = 'rgba(90,62,34,.35)'; ctx.lineWidth = 2; ctx.strokeRect(76, 76, W - 152, H - 152);
  // crown top left + small brand
  crown(ctx, 92, 100, 130, 100, '#E8B44C', '#405D77');
  ctx.fillStyle = '#3E6F86';
  ctx.font = '38px "Bebas Neue", sans-serif';
  tracked(ctx, 'BIG EARL\'S', 250, 175, 5);
  ctx.fillStyle = 'rgba(62,111,134,.8)';
  ctx.font = '28px "Bebas Neue", sans-serif';
  tracked(ctx, 'GASOLINE · OIL · TIRES', 250, 215, 3);
  // headline: 24 HOUR (strong, legible at distance)
  ctx.fillStyle = '#B44432';
  ctx.textAlign = 'center';
  ctx.font = '220px "Bebas Neue", sans-serif';
  tracked(ctx, '24 HOUR', W / 2, 380, 10, 'center');
  // script SERVICE
  ctx.fillStyle = '#B44432';
  ctx.save();
  ctx.translate(W / 2, 585);
  ctx.transform(1, 0, -0.06, 1, 0, 0);
  ctx.font = '190px Pacifico';
  ctx.textAlign = 'center';
  ctx.fillText('Service', 0, 0);
  ctx.restore();
  // bottom rule + copy
  ctx.strokeStyle = 'rgba(77,139,132,.6)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(160, 640); ctx.lineTo(W - 160, 640); ctx.stroke();
  ctx.fillStyle = '#355E7A';
  ctx.font = '46px "Bebas Neue", sans-serif';
  tracked(ctx, 'NO REFUNDS', W - 170, 705, 7, 'right');
  ctx.fillStyle = 'rgba(53,94,122,.8)';
  ctx.font = '30px "Bebas Neue", sans-serif';
  tracked(ctx, 'OPEN ALL NIGHT', 170, 705, 4);
  // rivets
  for (const [x, y] of [[42, 42], [W - 42, 42], [42, H - 42], [W - 42, H - 42]]) {
    ctx.fillStyle = 'rgba(60,40,25,.5)'; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,245,220,.5)'; ctx.beginPath(); ctx.arc(x - 2, y - 2, 4, 0, 7); ctx.fill();
  }
  weather(ctx, W, H, 21, { alphaErase: 0.01, dirt: 0.35, scratch: 0.7 });
  return tex(c);
}

function medallionS() {
  const W = 768, H = 768;
  const c = cv(W, H);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2;
  ctx.beginPath(); ctx.arc(cx, cy, 340, 0, 7);
  ctx.fillStyle = '#EDE3C9'; ctx.fill();
  ctx.lineWidth = 26; ctx.strokeStyle = '#C4573B'; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, 300, 0, 7);
  ctx.lineWidth = 12; ctx.strokeStyle = '#4D8B84'; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, 240, 0, 7);
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(80,55,32,.35)'; ctx.stroke();
  ctx.fillStyle = '#B44432';
  ctx.font = '430px Pacifico';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.save(); ctx.translate(cx, cy + 18); ctx.transform(1, 0, -0.06, 1, 0, 0); ctx.fillText('S', 0, 0); ctx.restore();
  ctx.fillStyle = '#3E6F86';
  ctx.font = '44px "Bebas Neue", sans-serif';
  ctx.textAlign = 'center';
  ctx.save();
  ctx.translate(cx, cy + 268); ctx.rotate(-0.02);
  tracked(ctx, 'S E R V I C E', 0, 0, 2, 'center');
  ctx.restore();
  stars(ctx, cx, cy - 265, 70, '#C4573B', 2);
  weather(ctx, W, H, 31, { alphaErase: 0.008, dirt: 0.2, scratch: 0.6 });
  return tex(c);
}

// ---------------------------------------------------------------- pylon
function pylon() {
  const W = 900, H = 2048;
  const c = cv(W, H);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  // crown
  crown(ctx, 280, 30, 340, 200, '#E8B44C', '#5A2A15');
  // circle S medallion
  const cx = W / 2, cy = 480, R = 235;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7);
  ctx.fillStyle = '#EFE5CB'; ctx.fill();
  ctx.lineWidth = 22; ctx.strokeStyle = '#C4573B'; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, R - 40, 0, 7);
  ctx.lineWidth = 12; ctx.strokeStyle = '#4D8B84'; ctx.stroke();
  ctx.fillStyle = '#B44432';
  ctx.font = '360px Pacifico';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.save(); ctx.translate(cx, cy + 22); ctx.transform(1, 0, -0.05, 1, 0, 0); ctx.fillText('S', 0, 0); ctx.restore();
  ctx.fillStyle = '#3E6F86';
  ctx.font = '40px "Bebas Neue", sans-serif';
  ctx.fillText('GAS · REPAIRS · FOOD', cx, cy + 200);
  // board
  const bx = 170, by = 760, bw = 560, bh = 1120, br = 48;
  ctx.save();
  ctx.shadowColor = 'rgba(30,14,7,.55)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 16;
  roundRect(ctx, bx, by, bw, bh, br);
  ctx.fillStyle = '#EAE0C6'; ctx.fill();
  ctx.restore();
  ctx.lineWidth = 16; ctx.strokeStyle = '#C4573B'; roundRect(ctx, bx, by, bw, bh, br); ctx.stroke();
  ctx.lineWidth = 8; ctx.strokeStyle = '#4D8B84'; roundRect(ctx, bx + 34, by + 34, bw - 68, bh - 68, br * 0.7); ctx.stroke();
  // GAS letters
  const letters = ['G', 'A', 'S'];
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  letters.forEach((L, i) => {
    ctx.fillStyle = '#2F6664';
    ctx.font = '260px "Alfa Slab One", serif';
    ctx.save();
    ctx.translate(cx, by + 210 + i * 260);
    ctx.transform(1, 0, -0.02, 1, 0, 0);
    ctx.fillText(L, 0, 0);
    ctx.restore();
    // little stars either side
    stars(ctx, bx + 95, by + 210 + i * 260, 22, '#C4573B', 2);
    stars(ctx, bx + bw - 95, by + 210 + i * 260, 22, '#C4573B', 2);
  });
  // script + tagline
  ctx.fillStyle = '#B44432';
  ctx.font = '82px Pacifico';
  ctx.save(); ctx.translate(cx, by + 960); ctx.transform(1, 0, -0.06, 1, 0, 0); ctx.fillText("Big Earl's", 0, 0); ctx.restore();
  ctx.fillStyle = '#3E6F86';
  ctx.font = '36px "Bebas Neue", sans-serif';
  tracked(ctx, '24 HOUR SERVICE', cx, by + 1020, 4, 'center');
  // bottom arrow
  ctx.beginPath();
  ctx.moveTo(120, by + bh - 110);
  ctx.lineTo(bx + 40, by + bh - 110);
  ctx.lineTo(bx + 40, by + bh - 30);
  ctx.lineTo(cx + 140, by + bh - 30);
  ctx.lineTo(cx + 140, by + bh + 70);
  ctx.lineTo(cx + 250, by + bh - 6);
  ctx.lineTo(cx + 140, by + bh - 82);
  ctx.lineTo(cx + 140, by + bh - 110);
  ctx.closePath();
  ctx.fillStyle = '#C4573B'; ctx.fill();
  ctx.lineWidth = 6; ctx.strokeStyle = '#5A2A15'; ctx.stroke();
  // pole shadow not drawn
  weather(ctx, W, H, 41, { alphaErase: 0.012, dirt: 0.3, scratch: 0.8 });
  // bullet holes
  const r = mulberry32(88);
  for (let i = 0; i < 4; i++) {
    const x = bx + 60 + r() * (bw - 120), y = by + 80 + r() * (bh - 160), rad = 5 + r() * 5;
    ctx.fillStyle = 'rgba(40,26,17,.85)'; ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(230,220,195,.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, rad + 3, 0, 7); ctx.stroke();
  }
  return tex(c);
}

// ---------------------------------------------------------------- billboard
function billboard() {
  const W = 2048, H = 1024;
  const c = cv(W, H);
  const ctx = c.getContext('2d');
  // frame
  ctx.fillStyle = '#EFE4C9'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(90,55,32,.6)'; ctx.lineWidth = 10; ctx.strokeRect(5, 5, W - 10, H - 10);
  const px = 54, py = 48, pw = W - 108, ph = H - 96;
  const inner = cv(pw, ph);
  const ix = inner.getContext('2d');
  // sky
  const sky = ix.createLinearGradient(0, 0, 0, ph);
  sky.addColorStop(0, '#A7C9D5');
  sky.addColorStop(0.36, '#D9D9C9');
  sky.addColorStop(0.62, '#F2C79A');
  sky.addColorStop(1, '#E9986F');
  ix.fillStyle = sky; ix.fillRect(0, 0, pw, ph);
  // painted sun
  const sx = pw * 0.74, sy = ph * 0.3, sr = ph * 0.19;
  ix.save();
  ix.translate(sx, sy);
  for (let i = 0; i < 18; i++) {
    ix.rotate(Math.PI * 2 / 18);
    ix.beginPath(); ix.moveTo(0, 0); ix.arc(0, 0, sr * 2.4, -0.05, 0.05); ix.closePath();
    ix.fillStyle = i % 2 ? 'rgba(247,213,158,.22)' : 'rgba(231,140,92,.16)';
    ix.fill();
  }
  ix.restore();
  ix.beginPath(); ix.arc(sx, sy, sr, 0, 7); ix.fillStyle = '#F8E7BC'; ix.fill();
  ix.beginPath(); ix.arc(sx, sy, sr * 0.82, 0, 7); ix.fillStyle = '#F3D397'; ix.fill();
  // distant mesas
  const mesa = (yb, color, pts) => {
    ix.fillStyle = color;
    ix.beginPath(); ix.moveTo(0, yb);
    pts.forEach(([x, y]) => ix.lineTo(x, y));
    ix.lineTo(pw, yb); ix.lineTo(pw, ph); ix.lineTo(0, ph); ix.closePath(); ix.fill();
  };
  mesa(ph * 0.64, '#D9A27D', [[0, ph * 0.58], [pw * 0.08, ph * 0.52], [pw * 0.17, ph * 0.55], [pw * 0.22, ph * 0.48], [pw * 0.31, ph * 0.52], [pw * 0.38, ph * 0.59], [pw * 0.47, ph * 0.56], [pw * 0.6, ph * 0.6], [pw * 0.7, ph * 0.53], [pw * 0.8, ph * 0.56], [pw * 0.9, ph * 0.5], [pw, ph * 0.57]]);
  mesa(ph * 0.74, '#C9785B', [[0, ph * 0.68], [pw * 0.06, ph * 0.63], [pw * 0.15, ph * 0.69], [pw * 0.25, ph * 0.62], [pw * 0.34, ph * 0.66], [pw * 0.44, ph * 0.6], [pw * 0.52, ph * 0.68], [pw * 0.62, ph * 0.64], [pw * 0.72, ph * 0.69], [pw * 0.82, ph * 0.63], [pw * 0.92, ph * 0.67], [pw, ph * 0.62]]);
  // giant foreground mesa silhouette right
  mesa(ph * 0.9, '#A9533D', [[pw * 0.62, ph * 0.7], [pw * 0.66, ph * 0.52], [pw * 0.72, ph * 0.49], [pw * 0.75, ph * 0.56], [pw * 0.81, ph * 0.58], [pw * 0.84, ph * 0.66], [pw * 0.92, ph * 0.68], [pw * 0.98, ph * 0.62], [pw, ph * 0.8]]);
  // road
  ix.fillStyle = '#E4C8A4';
  ix.beginPath();
  ix.moveTo(pw * 0.42, ph);
  ix.bezierCurveTo(pw * 0.5, ph * 0.86, pw * 0.62, ph * 0.84, pw * 0.78, ph * 0.79);
  ix.lineTo(pw * 0.8, ph * 0.86);
  ix.bezierCurveTo(pw * 0.64, ph * 0.9, pw * 0.58, ph * 0.94, pw * 0.54, ph);
  ix.closePath(); ix.fill();
  ix.strokeStyle = 'rgba(255,247,224,.7)'; ix.lineWidth = 4;
  ix.beginPath(); ix.moveTo(pw * 0.48, ph); ix.bezierCurveTo(pw * 0.56, ph * 0.9, pw * 0.66, ph * 0.87, pw * 0.79, ph * 0.83); ix.stroke();
  // paint texture mottling
  const r = mulberry32(1001);
  for (let i = 0; i < 240; i++) {
    const x = r() * pw, y = r() * ph, rad = 10 + r() * 90;
    const g = ix.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, r() < 0.5 ? 'rgba(255,240,205,.05)' : 'rgba(120,60,40,.045)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ix.fillStyle = g; ix.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // lettering
  ix.save();
  ix.translate(120, 260);
  ix.rotate(-0.02);
  ix.fillStyle = 'rgba(90,35,24,.4)';
  ix.font = '108px Pacifico';
  ix.fillText('Welcome to', 7, 9);
  ix.fillStyle = '#FBF1D8';
  ix.fillText('Welcome to', 0, 0);
  ix.restore();

  const lines = [
    { t: 'Deadlock', x: 110, y: ph * 0.55, size: 300 },
    { t: 'Gorge', x: 720, y: ph * 0.8, size: 285 },
  ];
  for (const L of lines) {
    let size = L.size;
    ix.font = `${size}px Pacifico`;
    while (ix.measureText(L.t).width > pw * 0.9 && size > 80) { size -= 6; ix.font = `${size}px Pacifico`; }
    ix.save();
    ix.translate(L.x, L.y);
    ix.rotate(-0.025);
    ix.fillStyle = 'rgba(120,42,28,.55)';
    ix.fillText(L.t, 10, 12);
    ix.fillStyle = '#FFF3D8';
    ix.save();
    ix.shadowColor = 'rgba(120,50,30,.35)'; ix.shadowBlur = 12;
    ix.fillText(L.t, 0, 0);
    ix.restore();
    ix.strokeStyle = 'rgba(255,250,235,.5)'; ix.lineWidth = 2; ix.strokeText(L.t, 0, 0);
    ix.restore();
  }
  // small text
  ix.fillStyle = '#3D6F79';
  ix.font = '46px "Bebas Neue", sans-serif';
  tracked(ix, 'ROUTE 66  ·  ARIZONA', pw - 90, ph - 70, 5, 'right');
  ix.font = '30px "Bebas Neue", sans-serif';
  tracked(ix, 'GAS · REPAIRS · FOOD · EST. 1957', 110, ph - 60, 3);
  // painted border
  ix.strokeStyle = 'rgba(254,247,228,.75)'; ix.lineWidth = 14; ix.strokeRect(22, 22, pw - 44, ph - 44);
  ix.strokeStyle = 'rgba(90,50,30,.3)'; ix.lineWidth = 2; ix.strokeRect(36, 36, pw - 72, ph - 72);
  // weather
  weather(ix, pw, ph, 77, { alphaErase: 0.02, dirt: 0.7, scratch: 1.2 });
  // bullet holes / cracks
  for (let i = 0; i < 5; i++) {
    const x = r() * pw, y = r() * ph, rad = 4 + r() * 6;
    ix.fillStyle = 'rgba(35,22,14,.8)'; ix.beginPath(); ix.arc(x, y, rad, 0, 7); ix.fill();
    ix.strokeStyle = 'rgba(245,235,215,.25)'; ix.lineWidth = 2; ix.beginPath(); ix.arc(x, y, rad + 4, 0, 7); ix.stroke();
    for (let k = 0; k < 4; k++) {
      const a = r() * 6.28;
      ix.strokeStyle = 'rgba(35,22,14,.28)'; ix.lineWidth = 1;
      ix.beginPath(); ix.moveTo(x, y); ix.lineTo(x + Math.cos(a) * (rad + 6 + r() * 18), y + Math.sin(a) * (rad + 6 + r() * 18)); ix.stroke();
    }
  }
  // bird splat
  for (let i = 0; i < 3; i++) {
    const x = r() * pw, y = r() * ph * 0.6;
    ix.fillStyle = 'rgba(250,246,232,.5)'; ix.beginPath(); ix.ellipse(x, y, 5 + r() * 4, 3 + r() * 4, 0.4, 0, 7); ix.fill();
  }
  ctx.drawImage(inner, px, py);
  return tex(c);
}

// ---------------------------------------------------------------- route 66 shield
function route66() {
  const W = 512, H = 560;
  const c = cv(W, H);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  const shield = (x, y, w, h) => {
    ctx.beginPath();
    ctx.moveTo(x + w * 0.14, y);
    ctx.lineTo(x + w * 0.86, y);
    ctx.quadraticCurveTo(x + w * 0.96, y, x + w * 0.95, y + h * 0.12);
    ctx.quadraticCurveTo(x + w * 0.97, y + h * 0.52, x + w * 0.5, y + h);
    ctx.quadraticCurveTo(x + w * 0.03, y + h * 0.52, x + w * 0.05, y + h * 0.12);
    ctx.quadraticCurveTo(x + w * 0.04, y, x + w * 0.14, y);
    ctx.closePath();
  };
  shield(20, 20, W - 40, H - 40);
  ctx.fillStyle = '#1D1B18'; ctx.fill();
  ctx.lineWidth = 12; ctx.strokeStyle = '#EFE6CF'; ctx.stroke();
  shield(48, 48, W - 96, H - 96);
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(239,230,207,.6)'; ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#EFE6CF';
  ctx.font = '62px "Bebas Neue", sans-serif';
  tracked(ctx, 'ROUTE', W / 2, 190, 6, 'center');
  ctx.font = '230px "Alfa Slab One", serif';
  ctx.fillText('66', W / 2, 400);
  ctx.font = '38px "Bebas Neue", sans-serif';
  tracked(ctx, 'ARIZONA', W / 2, 470, 6, 'center');
  weather(ctx, W, H, 101, { alphaErase: 0.025, dirt: 0.6, scratch: 1.4 });
  return tex(c);
}

// ---------------------------------------------------------------- pump face
function pumpFace(variant = 0) {
  const W = 512, H = 1024;
  const c = cv(W, H);
  const ctx = c.getContext('2d');
  const red = variant ? '#B74532' : '#BF4A35';
  const cream = '#E9DFC6';
  ctx.fillStyle = cream; ctx.fillRect(0, 0, W, H);
  // top band
  ctx.fillStyle = red; ctx.fillRect(0, 0, W, 86);
  ctx.fillStyle = 'rgba(255,240,215,.5)'; ctx.fillRect(0, 86, W, 5);
  // brand script
  ctx.fillStyle = red; ctx.font = '74px Pacifico'; ctx.textAlign = 'center';
  ctx.save(); ctx.translate(W / 2, 158); ctx.transform(1, 0, -0.05, 1, 0, 0); ctx.fillText("Big Earl's", 0, 0); ctx.restore();
  ctx.fillStyle = '#3E6F86'; ctx.font = '30px "Bebas Neue", sans-serif';
  tracked(ctx, variant ? 'ETHYL PREMIUM' : 'REGULAR GASOLINE', W / 2, 200, 3, 'center');
  // price display
  ctx.fillStyle = '#191817'; roundRect(ctx, 42, 236, W - 84, 196, 10); ctx.fill();
  ctx.strokeStyle = '#7c7264'; ctx.lineWidth = 7; roundRect(ctx, 42, 236, W - 84, 196, 10); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,235,200,.12)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(56, 330); ctx.lineTo(W - 56, 330); ctx.stroke();
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,245,225,.55)'; ctx.font = '20px "Bebas Neue", sans-serif';
  tracked(ctx, 'GALLONS', 68, 270, 3);
  tracked(ctx, 'PRICE / GAL', 300, 270, 2);
  ctx.fillStyle = '#F0A347'; ctx.font = '68px "Alfa Slab One", serif';
  ctx.fillText('08.2', 64, 352);
  ctx.textAlign = 'right'; ctx.fillText('24.9', W - 64, 352);
  ctx.fillStyle = '#E9DFC6'; ctx.font = '34px "Bebas Neue", sans-serif'; ctx.textAlign = 'center';
  tracked(ctx, variant ? 'PREMIUM' : 'REGULAR', W / 2, 394, 6, 'center');
  // dial
  ctx.beginPath(); ctx.arc(W / 2, 540, 88, 0, 7);
  ctx.fillStyle = '#F4ECD8'; ctx.fill();
  ctx.lineWidth = 9; ctx.strokeStyle = '#8b8372'; ctx.stroke();
  ctx.fillStyle = '#2B2620'; ctx.font = '18px "Bebas Neue", sans-serif';
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI * 0.8 + (i / 8) * Math.PI * 1.4;
    const x = W / 2 + Math.cos(a) * 66, y = 540 + Math.sin(a) * 66;
    ctx.fillText(String(i * 5), x - 7, y + 6);
  }
  ctx.strokeStyle = '#B44432'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(W / 2, 540);
  const na = Math.PI * 1.55;
  ctx.lineTo(W / 2 + Math.cos(na) * 58, 540 + Math.sin(na) * 58); ctx.stroke();
  ctx.beginPath(); ctx.arc(W / 2, 540, 8, 0, 7); ctx.fillStyle = '#3E6F86'; ctx.fill();
  ctx.fillStyle = '#3E6F86'; ctx.font = '22px "Bebas Neue", sans-serif';
  tracked(ctx, 'SELF SERVICE', W / 2, 668, 6, 'center');
  // note
  ctx.fillStyle = 'rgba(60,45,30,.55)'; ctx.font = '18px "Bebas Neue", sans-serif';
  tracked(ctx, 'PLEASE PAY INSIDE · THANK YOU', W / 2, 700, 2, 'center');
  // lower band
  ctx.fillStyle = red; ctx.fillRect(0, 880, W, 144);
  ctx.fillStyle = 'rgba(255,240,215,.55)'; ctx.fillRect(0, 874, W, 4);
  ctx.fillStyle = '#F0E4C9'; ctx.font = '40px Pacifico';
  ctx.fillText('Big Earl\'s', W / 2, 955);
  ctx.font = '24px "Bebas Neue", sans-serif'; ctx.fillStyle = 'rgba(255,240,215,.8)';
  tracked(ctx, 'DEADLOCK GORGE · ARIZONA', W / 2, 995, 3, 'center');
  // chrome edge highlights
  const lg = ctx.createLinearGradient(0, 0, W, 0);
  lg.addColorStop(0, 'rgba(255,245,220,.35)');
  lg.addColorStop(0.12, 'rgba(255,245,220,0)');
  lg.addColorStop(0.88, 'rgba(40,30,20,.12)');
  lg.addColorStop(1, 'rgba(40,30,20,.3)');
  ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
  weather(ctx, W, H, 55 + variant, { alphaErase: 0.012, dirt: 0.4, scratch: 0.8 });
  return tex(c);
}

// ---------------------------------------------------------------- neon / signs
function neonOpen() {
  const W = 640, H = 300;
  const c = cv(W, H);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.font = '190px "Alfa Slab One", serif';
  ctx.save();
  ctx.translate(W / 2, H / 2 - 6);
  ctx.transform(1, 0, -0.04, 1, 0, 0);
  ctx.strokeStyle = 'rgba(255,58,38,.15)'; ctx.lineWidth = 46; ctx.strokeText('OPEN', 0, 0);
  ctx.strokeStyle = 'rgba(255,90,55,.35)'; ctx.lineWidth = 26; ctx.strokeText('OPEN', 0, 0);
  ctx.strokeStyle = 'rgba(255,140,90,.85)'; ctx.lineWidth = 12; ctx.strokeText('OPEN', 0, 0);
  ctx.strokeStyle = '#FFF1DC'; ctx.lineWidth = 4; ctx.strokeText('OPEN', 0, 0);
  ctx.fillStyle = 'rgba(255,190,130,.16)'; ctx.fillText('OPEN', 0, 0);
  ctx.restore();
  return tex(c);
}

function neonArrow() {
  const W = 1024, H = 384;
  const c = cv(W, H);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(90,235,220,.16)'; ctx.lineWidth = 40;
  ctx.beginPath(); ctx.moveTo(100, 190); ctx.lineTo(760, 190); ctx.stroke();
  ctx.strokeStyle = 'rgba(140,255,240,.9)'; ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(100, 190); ctx.lineTo(740, 190); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(690, 110); ctx.lineTo(790, 190); ctx.lineTo(690, 270); ctx.stroke();
  ctx.strokeStyle = '#EFFFFB'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(100, 190); ctx.lineTo(740, 190); ctx.stroke();
  return tex(c);
}

function atmSign() {
  const W = 384, H = 512;
  const c = cv(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1C5F91'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#DCEAF2'; ctx.lineWidth = 10; ctx.strokeRect(14, 14, W - 28, H - 28);
  ctx.fillStyle = '#F3F7F5'; ctx.textAlign = 'center';
  ctx.font = '150px "Alfa Slab One", serif'; ctx.fillText('ATM', W / 2, 250);
  ctx.font = '44px "Bebas Neue", sans-serif';
  tracked(ctx, '24 HOUR', W / 2, 330, 6, 'center');
  ctx.strokeStyle = 'rgba(230,245,250,.35)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(60, 360); ctx.lineTo(W - 60, 360); ctx.stroke();
  ctx.fillStyle = '#9FD3E8'; ctx.font = '26px "Bebas Neue", sans-serif';
  tracked(ctx, 'INSIDE · NO REFUNDS', W / 2, 400, 2, 'center');
  weather(ctx, W, H, 71, { alphaErase: 0.006, dirt: 0.2, scratch: 0.5 });
  return tex(c);
}

function colaMachine() {
  const W = 512, H = 1024;
  const c = cv(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#B43831'; ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(255,230,200,.22)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(40,10,8,.28)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // chrome frame
  ctx.strokeStyle = 'rgba(240,235,220,.55)'; ctx.lineWidth = 12; ctx.strokeRect(20, 20, W - 40, H - 40);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#F5EAD1'; ctx.font = '118px Pacifico';
  ctx.save(); ctx.translate(W / 2, 190); ctx.transform(1, 0, -0.05, 1, 0, 0); ctx.fillText('Ice Cold', 0, 0); ctx.restore();
  ctx.font = '54px "Bebas Neue", sans-serif'; ctx.fillStyle = '#F5EAD1';
  tracked(ctx, "BIG EARL'S COLA", W / 2, 260, 4, 'center');
  // bottle
  ctx.save(); ctx.translate(W / 2, 420);
  ctx.fillStyle = '#E9DCC0';
  ctx.beginPath(); ctx.moveTo(-30, -10); ctx.lineTo(-24, -120); ctx.lineTo(-12, -155); ctx.lineTo(-12, -190);
  ctx.lineTo(12, -190); ctx.lineTo(12, -155); ctx.lineTo(24, -120); ctx.lineTo(30, -10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#8B2A23'; ctx.fillRect(-13, -220, 26, 34);
  ctx.fillStyle = '#D8C7A5'; ctx.font = '18px "Bebas Neue", sans-serif';
  tracked(ctx, '5¢', 0, 105, 2, 'center');
  ctx.restore();
  // dispensing slot
  ctx.fillStyle = '#2B2420'; roundRect(ctx, 90, 650, W - 180, 150, 12); ctx.fill();
  ctx.strokeStyle = '#C9BFAD'; ctx.lineWidth = 6; roundRect(ctx, 90, 650, W - 180, 150, 12); ctx.stroke();
  ctx.fillStyle = 'rgba(255,240,215,.7)'; ctx.font = '26px "Bebas Neue", sans-serif';
  tracked(ctx, 'INSERT COIN', W / 2, 700, 4, 'center');
  ctx.fillStyle = '#3A3028'; ctx.fillRect(160, 730, 192, 16);
  ctx.fillStyle = 'rgba(255,230,196,.8)'; ctx.font = '22px "Bebas Neue", sans-serif';
  tracked(ctx, 'ICE · 5¢ · COLD', W / 2, 900, 3, 'center');
  ctx.fillStyle = 'rgba(255,240,215,.65)'; ctx.font = '20px "Bebas Neue", sans-serif';
  tracked(ctx, 'BIG EARL\'S REFRESHMENT CO.', W / 2, 960, 2, 'center');
  weather(ctx, W, H, 91, { alphaErase: 0.008, dirt: 0.25, scratch: 0.7 });
  return tex(c);
}

function poster(kind = 0) {
  const W = 512, H = 768;
  const c = cv(W, H);
  const ctx = c.getContext('2d');
  const cream = '#EFE4C8';
  ctx.fillStyle = cream; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#B44432'; ctx.lineWidth = 12; ctx.strokeRect(18, 18, W - 36, H - 36);
  if (kind === 0) {
    ctx.fillStyle = '#4D8B84'; ctx.fillRect(36, 36, W - 72, 300);
    ctx.fillStyle = '#F0D19A';
    ctx.beginPath(); ctx.arc(W / 2, 186, 92, 0, 7); ctx.fill();
    ctx.fillStyle = '#C4573B';
    ctx.beginPath(); ctx.moveTo(36, 300); ctx.lineTo(130, 190); ctx.lineTo(220, 300); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(180, 300); ctx.lineTo(300, 150); ctx.lineTo(430, 300); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#B44432'; ctx.textAlign = 'center'; ctx.font = '92px "Bebas Neue", sans-serif';
    tracked(ctx, 'ROUTE 66', W / 2, 420, 4, 'center');
    ctx.fillStyle = '#3E6F86'; ctx.font = '54px Pacifico';
    ctx.fillText('Deadlock Gorge', W / 2, 500);
    ctx.fillStyle = '#4D8B84'; ctx.font = '30px "Bebas Neue", sans-serif';
    tracked(ctx, 'GAS · FOOD · SERVICE', W / 2, 560, 3, 'center');
    ctx.fillStyle = '#B44432'; ctx.font = '44px "Bebas Neue", sans-serif';
    tracked(ctx, 'OPEN 24 HOURS', W / 2, 640, 4, 'center');
  } else {
    ctx.fillStyle = '#2F4B58'; ctx.fillRect(36, 36, W - 72, 300);
    ctx.fillStyle = '#E9DCC0'; ctx.font = '92px Pacifico'; ctx.textAlign = 'center';
    ctx.fillText('Ice Cold', W / 2, 160);
    ctx.fillStyle = '#F0B44E'; ctx.font = '46px "Bebas Neue", sans-serif';
    tracked(ctx, 'BIG EARL\'S COLA', W / 2, 250, 3, 'center');
    ctx.fillStyle = '#B44432'; ctx.font = '140px "Bebas Neue", sans-serif';
    tracked(ctx, '5¢', W / 2, 470, 2, 'center');
    ctx.fillStyle = '#3E6F86'; ctx.font = '30px "Bebas Neue", sans-serif';
    tracked(ctx, 'ICE COLD · SOLD HERE', W / 2, 540, 3, 'center');
    ctx.fillStyle = '#C4573B'; ctx.fillRect(80, 600, W - 160, 6);
    ctx.fillStyle = '#4D8B84'; ctx.font = '26px "Bebas Neue", sans-serif';
    tracked(ctx, 'DEADLOCK GORGE, AZ', W / 2, 660, 3, 'center');
  }
  weather(ctx, W, H, 111 + kind, { alphaErase: 0.018, dirt: 0.7, scratch: 1.1 });
  return tex(c);
}

function priceSign() {
  const W = 512, H = 640;
  const c = cv(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#E9DFC7'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#3E6F86'; ctx.lineWidth = 14; ctx.strokeRect(16, 16, W - 32, H - 32);
  ctx.fillStyle = '#B44432'; ctx.fillRect(32, 32, W - 64, 110);
  ctx.fillStyle = '#F7EDD6'; ctx.textAlign = 'center'; ctx.font = '70px Pacifico';
  ctx.fillText("Big Earl's", W / 2, 110);
  const rows = [['REGULAR', '24.9'], ['ETHYL', '26.9'], ['DIESEL', '28.9']];
  rows.forEach((row, i) => {
    const y = 220 + i * 130;
    ctx.fillStyle = '#2A2620'; ctx.fillRect(40, y - 60, W - 80, 92);
    ctx.fillStyle = '#F7EDD6'; ctx.font = '40px "Bebas Neue", sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(row[0], 60, y + 6);
    ctx.fillStyle = '#F0B44E'; ctx.font = '62px "Alfa Slab One", serif'; ctx.textAlign = 'right';
    ctx.fillText(row[1], W - 60, y + 10);
  });
  ctx.fillStyle = '#3E6F86'; ctx.font = '26px "Bebas Neue", sans-serif'; ctx.textAlign = 'center';
  tracked(ctx, 'CASH ONLY · NO REFUNDS', W / 2, H - 42, 2, 'center');
  weather(ctx, W, H, 121, { alphaErase: 0.01, dirt: 0.5, scratch: 0.8 });
  return tex(c);
}

function windowDecal() {
  const W = 1024, H = 256;
  const c = cv(W, H);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(245,235,215,.85)'; ctx.lineWidth = 5;
  ctx.strokeRect(16, 16, W - 32, H - 32);
  ctx.fillStyle = 'rgba(245,235,215,.92)'; ctx.textAlign = 'center';
  ctx.font = '96px "Bebas Neue", sans-serif';
  tracked(ctx, 'GAS · REPAIRS · FOOD', W / 2, 130, 6, 'center');
  ctx.font = '38px "Bebas Neue", sans-serif';
  tracked(ctx, '24 HOUR SERVICE · NO REFUNDS', W / 2, 195, 4, 'center');
  return tex(c);
}

function woodSign() {
  const W = 1024, H = 512;
  const c = cv(W, H);
  const ctx = c.getContext('2d');
  const r = mulberry32(131);
  ctx.fillStyle = '#6A4C33'; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 80; i++) {
    ctx.strokeStyle = r() < 0.5 ? 'rgba(40,26,15,.25)' : 'rgba(210,180,135,.12)';
    ctx.lineWidth = 1 + r() * 2;
    const y = r() * H;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 14) {
      const yy = y + Math.sin(x * 0.02 + i) * 3 + Math.sin(x * 0.006 + i * 2) * 6;
      x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(38,24,14,.55)'; ctx.lineWidth = 8;
  for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(i * W / 3, 0); ctx.lineTo(i * W / 3, H); ctx.stroke(); }
  ctx.fillStyle = '#EADCC2'; ctx.font = '120px "Bebas Neue", sans-serif'; ctx.textAlign = 'center';
  ctx.strokeStyle = '#C4573B'; ctx.lineWidth = 4;
  tracked(ctx, 'NO TRESPASSING', W / 2, 260, 8, 'center');
  ctx.font = '54px "Bebas Neue", sans-serif'; ctx.fillStyle = '#EADCC2';
  tracked(ctx, 'DEADLOCK GORGE PROPERTY', W / 2, 340, 4, 'center');
  weather(ctx, W, H, 141, { alphaErase: 0.015, dirt: 0.6, scratch: 1.2 });
  return tex(c);
}

function gasGlobeLabel() {
  const W = 512, H = 256;
  const c = cv(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#F2E9D5'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#B44432'; ctx.font = '110px Pacifico'; ctx.textAlign = 'center';
  ctx.save(); ctx.translate(W / 2, 150); ctx.transform(1, 0, -0.05, 1, 0, 0); ctx.fillText("Big Earl's", 0, 0); ctx.restore();
  ctx.fillStyle = '#3E6F86'; ctx.font = '32px "Bebas Neue", sans-serif';
  tracked(ctx, 'GASOLINE · ARIZONA', W / 2, 210, 4, 'center');
  weather(ctx, W, H, 151, { alphaErase: 0.004, dirt: 0.1, scratch: 0.2 });
  return tex(c);
}

export async function buildSignTextures(onProgress = () => {}) {
  const steps = [
    ['HANGING THE BIG SIGN', () => { S.bigEarls = bigEarls(); S.bigEarlsWide = bigEarlsWide(); }],
    ['PAINTING 24 HOURS', () => { S.serviceBoard = serviceBoard(); S.medallion = medallionS(); }],
    ['RAISING THE PYLON', () => { S.pylon = pylon(); S.route66 = route66(); S.priceSign = priceSign(); }],
    ['PAINTING THE BILLBOARD', () => { S.billboard = billboard(); }],
    ['FILLING THE PUMPS', () => { S.pumpFace = pumpFace(0); S.pumpFacePremium = pumpFace(1); S.globeLabel = gasGlobeLabel(); }],
    ['LIGHTING THE NEON', () => { S.neonOpen = neonOpen(); S.neonArrow = neonArrow(); S.atm = atmSign(); }],
    ['STOCKING THE COOLER', () => { S.cola = colaMachine(); S.posterA = poster(0); S.posterB = poster(1); S.windowDecal = windowDecal(); S.woodSign = woodSign(); }],
  ];
  for (let i = 0; i < steps.length; i++) {
    onProgress(steps[i][0], 0.9 + (i / steps.length) * 0.09);
    await new Promise(r => setTimeout(r, 8));
    steps[i][1]();
  }
  return S;
}

export { S as signTextures };
