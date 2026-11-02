import * as THREE from 'three';
import { makeCanvas, makeTexture, surfaceTextures as T } from './textures.js';
import { mulberry32 } from './lib/noise.js';
import { addPlane } from './lib/build.js';

function rustStreakTexture() {
  const W = 256, H = 512;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  const r = mulberry32(919);
  ctx.clearRect(0, 0, W, H);
  for (let i = 0; i < 18; i++) {
    const x = r() * W;
    const y = r() * H * 0.2;
    const w = 2 + r() * 14;
    const len = 60 + r() * 380;
    const g = ctx.createLinearGradient(x, y, x + (r() - 0.5) * 10, y + len);
    g.addColorStop(0, `rgba(122,63,28,${0.45 + r() * 0.35})`);
    g.addColorStop(0.4, `rgba(148,80,38,${0.25 + r() * 0.25})`);
    g.addColorStop(1, 'rgba(148,80,38,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.quadraticCurveTo(x - w * 0.7, y + len * 0.6, x - w * 0.2, y + len);
    ctx.lineTo(x + w * 0.2, y + len);
    ctx.quadraticCurveTo(x + w * 0.7, y + len * 0.6, x + w / 2, y);
    ctx.closePath();
    ctx.fill();
  }
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = `rgba(90,48,24,${0.06 + r() * 0.18})`;
    ctx.beginPath(); ctx.arc(r() * W, r() * H, 1 + r() * 4, 0, 7); ctx.fill();
  }
  return makeTexture(c, { repeat: [1, 1] });
}

function crackTexture() {
  const W = 512, H = 512;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  const r = mulberry32(313);
  ctx.clearRect(0, 0, W, H);
  ctx.lineCap = 'round';
  function branch(x, y, ang, len, width, depth) {
    let px = x, py = y, a = ang;
    ctx.strokeStyle = `rgba(12,11,10,${0.6 - depth * 0.12})`;
    ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(px, py);
    for (let i = 0; i < 10; i++) {
      a += (r() - 0.5) * 0.5;
      px += Math.cos(a) * len / 10;
      py += Math.sin(a) * len / 10;
      ctx.lineTo(px, py);
      if (depth < 3 && r() < 0.12) branch(px, py, a + (r() - 0.5) * 1.6, len * 0.5, width * 0.6, depth + 1);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 6; i++) branch(r() * W, r() * H, r() * 6.28, 60 + r() * 120, 1.2 + r() * 1.6, 0);
  return makeTexture(c, { repeat: [1, 1] });
}

function tireTexture() {
  const W = 512, H = 512;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  const r = mulberry32(515);
  ctx.clearRect(0, 0, W, H);
  for (const off of [0, 70]) {
    for (let k = 0; k < 2; k++) {
      const g = ctx.createLinearGradient(0, 120 + off, 0, 160 + off);
      g.addColorStop(0, 'rgba(8,8,8,0)');
      g.addColorStop(0.4, 'rgba(8,8,8,.5)');
      g.addColorStop(0.6, 'rgba(8,8,8,.5)');
      g.addColorStop(1, 'rgba(8,8,8,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-20, 120 + off + k * 14);
      ctx.bezierCurveTo(140, 90 + off + k * 12, 360, 180 + off + k * 14, 540, 130 + off + k * 10);
      ctx.lineTo(540, 165 + off + k * 10);
      ctx.bezierCurveTo(360, 215 + off + k * 14, 140, 125 + off + k * 12, -20, 155 + off + k * 14);
      ctx.closePath(); ctx.fill();
    }
  }
  return makeTexture(c, { repeat: [1, 1] });
}

function dirtGradient() {
  const W = 64, H = 256;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(50,38,25,0)');
  g.addColorStop(0.55, 'rgba(50,38,25,.16)');
  g.addColorStop(1, 'rgba(38,28,18,.55)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // mottling
  const r = mulberry32(7);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(30,22,14,${0.02 + r() * 0.05})`;
    ctx.beginPath(); ctx.arc(r() * W, H * 0.4 + r() * H * 0.6, 2 + r() * 12, 0, 7); ctx.fill();
  }
  return makeTexture(c, { repeat: [1, 1] });
}

export function buildWear(scene) {
  const g = new THREE.Group();
  g.name = 'wear';
  scene.add(g);

  const rustTex = rustStreakTexture();
  const crackTex = crackTexture();
  const tireTex = tireTexture();
  const dirtTex = dirtGradient();

  const rustMat = new THREE.MeshStandardMaterial({ map: rustTex, transparent: true, depthWrite: false, roughness: 0.9, metalness: 0.1, color: 0xc98658, side: THREE.DoubleSide, alphaTest: 0.02 });
  const crackMat = new THREE.MeshBasicMaterial({ map: crackTex, transparent: true, depthWrite: false, color: 0x141210, opacity: 0.55, alphaTest: 0.02, polygonOffset: true, polygonOffsetFactor: -2 });
  const tireMat = new THREE.MeshBasicMaterial({ map: tireTex, transparent: true, depthWrite: false, color: 0x0c0b0a, opacity: 0.35, alphaTest: 0.02, polygonOffset: true, polygonOffsetFactor: -2 });
  const oilMat = new THREE.MeshBasicMaterial({ map: T.puddleAlpha, transparent: true, depthWrite: false, color: 0x0b0a09, opacity: 0.48, alphaTest: 0.02, polygonOffset: true, polygonOffsetFactor: -2 });
  const dirtMat = new THREE.MeshBasicMaterial({ map: dirtTex, transparent: true, depthWrite: false, opacity: 0.7, color: 0x9a856b });

  // rust streaks on the canopy fascia
  const r = mulberry32(202);
  for (let i = 0; i < 26; i++) {
    const x = -9.1 + r() * 18.2;
    const w = 0.08 + r() * 0.28;
    const h = 0.35 + r() * 0.85;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), rustMat);
    p.position.set(x, 4.22 + h / 2, 6.72);
    p.renderOrder = 2;
    g.add(p);
  }
  // side fascia streaks
  for (const s of [-1, 1]) {
    for (let i = 0; i < 8; i++) {
      const z = 0.0 + r() * 6.1;
      const w = 0.08 + r() * 0.22;
      const h = 0.35 + r() * 0.7;
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), rustMat);
      p.position.set(s * 9.76, 4.22 + h / 2, z);
      p.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2;
      p.renderOrder = 2;
      g.add(p);
    }
  }
  // rust running down the columns
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const w = 0.06 + r() * 0.16;
      const h = 0.6 + r() * 1.6;
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), rustMat);
      p.position.set(s * 9.15 + (r() - 0.5) * 0.25, 2.6 + r() * 1.1, 5.98);
      p.renderOrder = 2;
      g.add(p);
    }
  }
  // wall base dirt
  for (const [x, z, w, rot] of [[-8.0, 0.02, 1.0, 0], [-2.7, 0.02, 0.45, 0], [-1.55, 0.02, 0.5, 0], [1.72, 0.02, 1.2, 0], [8.0, 0.02, 1.0, 0], [-8.67, -3.6, 7.0, Math.PI / 2], [8.67, -3.6, 7.0, -Math.PI / 2]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.65), dirtMat);
    p.position.set(x, 0.42, z);
    p.rotation.y = rot;
    p.renderOrder = 2;
    g.add(p);
  }
  // oil stains on the forecourt
  const oilSpots = [
    [-4.4, 4.2, 3.4, 1.8, 0.3], [1.9, 4.0, 3.2, 1.7, -0.2], [5.0, 8.2, 2.4, 1.2, 0.6],
    [-8.2, 9.4, 2.0, 1.0, 0.1], [-2.4, 7.4, 1.6, 0.8, 1.1], [9.6, 4.6, 1.8, 1.0, -0.7],
  ];
  for (const [x, z, w, h, rot] of oilSpots) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), oilMat);
    p.rotation.x = -Math.PI / 2; p.rotation.z = rot;
    p.position.set(x, 0.033, z);
    p.renderOrder = 2;
    g.add(p);
  }
  // tyre marks
  const marks = [[3.5, 9.0, 8.0, 4.0, 0.2], [-6.0, 10.2, 7.0, 3.6, -0.25], [8.0, 8.2, 5.0, 3.0, 0.8]];
  for (const [x, z, w, h, rot] of marks) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), tireMat);
    p.rotation.x = -Math.PI / 2; p.rotation.z = rot;
    p.position.set(x, 0.035, z);
    p.renderOrder = 2;
    g.add(p);
  }
  // concrete cracks
  for (let i = 0; i < 14; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(2.0 + r() * 2.8, 2.0 + r() * 2.8), crackMat);
    p.rotation.x = -Math.PI / 2; p.rotation.z = r() * 6.28;
    p.position.set(-13 + r() * 26, 0.034, -1 + r() * 12);
    p.renderOrder = 2;
    g.add(p);
  }
  // cracks on the road
  for (let i = 0; i < 8; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 3.5), crackMat);
    p.rotation.x = -Math.PI / 2; p.rotation.z = r() * 6.28;
    p.position.set(-30 + r() * 60, 0.031, 13 + r() * 8);
    p.renderOrder = 2;
    g.add(p);
  }
  return g;
}
