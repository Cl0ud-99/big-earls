// Set dressing pass: roadside work yard, water tower, picnic pull-out, station
// clutter, guardrail and perimeter vegetation.  Everything is built from the same
// procedural material vocabulary as the station so it merges into one art style.
import * as THREE from 'three';
import { M } from './materials.js';
import { addBox, addCylinder, addMesh, addPlane, addContact, tube } from './lib/build.js';
import { cloneRepeat } from './lib/texutil.js';
import { makeCanvas, makeTexture } from './textures.js';
import {
  createPickup, createTire, addTireStack, createBarrel, addBarrel, createCrate,
  createTrashBin, createSaguaro, createYucca, createPricklyPear,
} from './props.js';
import { mulberry32, lerp } from './lib/noise.js';

function signTexture(w, h, draw) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  return makeTexture(c, { repeat: [1, 1] });
}

function signMat(tex, emissive = 0, emissiveColor = 0x000000) {
  return new THREE.MeshStandardMaterial({
    map: tex, roughness: 0.68, metalness: 0.05, envMapIntensity: 0.35,
    emissive: emissiveColor, emissiveMap: tex, emissiveIntensity: emissive,
  });
}

function yardSignTexture() {
  return signTexture(768, 384, (ctx, w, h) => {
    ctx.fillStyle = '#E9DCC2'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#3E6F86'; ctx.lineWidth = 14; ctx.strokeRect(14, 14, w - 28, h - 28);
    ctx.fillStyle = '#3E6F86'; ctx.textAlign = 'center';
    ctx.font = '40px "Bebas Neue", sans-serif';
    ctx.fillText('BIG EARL\'S', w / 2, 84);
    ctx.fillStyle = '#B44432'; ctx.font = '94px "Alfa Slab One", serif';
    ctx.fillText('WRECKER', w / 2, 200);
    ctx.fillStyle = '#3E6F86'; ctx.font = '62px "Bebas Neue", sans-serif';
    ctx.fillText('SERVICE  ·  24 HOUR', w / 2, 290);
    ctx.fillStyle = 'rgba(60,45,30,.22)';
    for (let i = 0; i < 40; i++) ctx.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 20, 1);
  });
}

function waterTowerTexture() {
  return signTexture(1024, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#E7DCC0'); g.addColorStop(1, '#C9B995');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#4D8787'; ctx.fillRect(0, h - 90, w, 90);
    ctx.fillStyle = '#B44432'; ctx.fillRect(0, h - 104, w, 14);
    ctx.fillStyle = '#8B4A2E'; ctx.textAlign = 'center';
    ctx.font = '108px Pacifico';
    ctx.fillText('Big Earl\'s', w / 2, 220);
    ctx.fillStyle = '#3E6F86'; ctx.font = '46px "Bebas Neue", sans-serif';
    ctx.fillText('DEADLOCK GORGE  ·  ROUTE 66', w / 2, 300);
    ctx.fillStyle = 'rgba(70,55,35,.2)';
    for (let i = 0; i < 38; i++) ctx.fillRect(Math.random() * w, 330 + Math.random() * 120, 3 + Math.random() * 28, 1);
  });
}

function lastGasTexture() {
  return signTexture(512, 640, (ctx, w, h) => {
    ctx.fillStyle = '#D8C9A8'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#6B4A31'; ctx.lineWidth = 18; ctx.strokeRect(18, 18, w - 36, h - 36);
    ctx.fillStyle = '#8C3F2E'; ctx.textAlign = 'center';
    ctx.font = '82px "Bebas Neue", sans-serif';
    ctx.fillText('LAST GAS', w / 2, 190);
    ctx.fillStyle = '#3E6F86'; ctx.font = '190px "Bebas Neue", sans-serif';
    ctx.fillText('100', w / 2, 390);
    ctx.fillStyle = '#8C3F2E'; ctx.font = '54px "Bebas Neue", sans-serif';
    ctx.fillText('MILES', w / 2, 470);
    ctx.fillStyle = 'rgba(60,45,30,.2)';
    for (let i = 0; i < 40; i++) ctx.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 18, 1);
  });
}

function speedTexture() {
  return signTexture(512, 640, (ctx, w, h) => {
    ctx.fillStyle = '#EFE8D8'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#22201D'; ctx.lineWidth = 20; ctx.strokeRect(18, 18, w - 36, h - 36);
    ctx.fillStyle = '#22201D'; ctx.textAlign = 'center';
    ctx.font = '64px "Bebas Neue", sans-serif';
    ctx.fillText('SPEED', w / 2, 140);
    ctx.fillText('LIMIT', w / 2, 205);
    ctx.font = '300px "Bebas Neue", sans-serif';
    ctx.fillText('55', w / 2, 480);
    ctx.font = '30px "Bebas Neue", sans-serif';
    ctx.fillText('ARIZONA', w / 2, 570);
  });
}

function mileTexture() {
  return signTexture(256, 320, (ctx, w, h) => {
    ctx.fillStyle = '#2F5E47'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#EFE8D8'; ctx.lineWidth = 12; ctx.strokeRect(12, 12, w - 24, h - 24);
    ctx.fillStyle = '#EFE8D8'; ctx.textAlign = 'center';
    ctx.font = '150px "Bebas Neue", sans-serif';
    ctx.fillText('66', w / 2, 190);
    ctx.font = '36px "Bebas Neue", sans-serif';
    ctx.fillText('ARIZONA', w / 2, 250);
  });
}

function picnicTexture() {
  return signTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#8A5B39'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#D8C9A8'; ctx.lineWidth = 8; ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = '#EFE0C4'; ctx.textAlign = 'center';
    ctx.font = '76px "Bebas Neue", sans-serif';
    ctx.fillText('PICNIC AREA', w / 2, 118);
    ctx.font = '34px "Bebas Neue", sans-serif';
    ctx.fillText('NEXT 66 MILES  ·  NO REFUNDS', w / 2, 180);
  });
}

function iceTexture() {
  return signTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#EAF2F0'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2C6C86'; ctx.fillRect(0, 0, w, 150);
    ctx.fillStyle = '#F4F7F4'; ctx.textAlign = 'center';
    ctx.font = '130px "Bebas Neue", sans-serif';
    ctx.fillText('ICE', w / 2, 245);
    ctx.fillStyle = '#4D8787'; ctx.font = '34px "Bebas Neue", sans-serif';
    ctx.fillText('COLD  ·  BLOCK  ·  CRUSHED', w / 2, 360);
    ctx.fillStyle = '#2C6C86'; ctx.fillRect(80, 410, w - 160, 10);
  });
}

function vendingTexture() {
  return signTexture(512, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#9C3B2E'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#EFE0C4'; ctx.fillRect(22, 22, w - 44, 250);
    ctx.fillStyle = '#B44432'; ctx.textAlign = 'center';
    ctx.font = '86px "Pacifico"';
    ctx.fillText('Cold Drinks', w / 2, 150);
    ctx.fillStyle = '#2C6C86'; ctx.font = '40px "Bebas Neue", sans-serif';
    ctx.fillText('BIG EARL\'S  ·  ICE COLD', w / 2, 215);
    const cols = [0x4D8787, 0xB44432, 0xD9A52E, 0x3E6F86, 0x8A5B39];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
      ctx.fillStyle = '#3A3430';
      ctx.fillRect(34 + c * 92, 310 + r * 120, 74, 96);
      ctx.fillStyle = '#' + cols[(r + c) % cols.length].toString(16).padStart(6, '0');
      ctx.fillRect(40 + c * 92, 318 + r * 120, 62, 64);
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.fillRect(46 + c * 92, 324 + r * 120, 12, 52);
    }
    ctx.fillStyle = '#2A2420'; ctx.fillRect(50, 870, w - 100, 80);
    ctx.fillStyle = '#D8C9A8'; ctx.font = '36px "Bebas Neue", sans-serif';
    ctx.fillText('INSERT COIN', w / 2, 920);
    ctx.beginPath(); ctx.arc(w - 70, h - 40, 18, 0, 7); ctx.fillStyle = '#D8C9A8'; ctx.fill();
  });
}

function chainTexture() {
  const W = 256, H = 256;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(196,198,190,.9)';
  ctx.lineWidth = 2.2;
  for (let i = -H; i < W + H; i += 18) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i, H); ctx.lineTo(i + H, 0); ctx.stroke();
  }
  return makeTexture(c, { repeat: [1, 1] });
}

function waterTower() {
  const g = new THREE.Group();
  g.position.set(-14, 0, -7);
  const legs = [[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]];
  for (const [x, z] of legs) {
    addCylinder(g, 0.16, 0.22, 8.6, M.darkMetal, x * 1.35, 4.3, z * 1.35, { seg: 10 });
    addBox(g, 0.5, 0.14, 0.5, M.concrete, x * 1.35, 0.08, z * 1.35, { radius: 0.03 });
  }
  // cross bracing
  for (const y of [2.6, 5.2, 7.4]) {
    for (const side of [-1, 1]) {
      addBox(g, 4.6, 0.08, 0.08, M.darkMetal, 0, y, side * 2.56);
      addBox(g, 0.08, 0.08, 4.6, M.darkMetal, side * 2.56, y, 0);
    }
  }
  // diagonal braces
  for (const s of [-1, 1]) {
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 5.2), M.darkMetal);
    brace.position.set(s * 2.56, 4.0, 0);
    brace.rotation.x = 0.9;
    g.add(brace);
  }
  // tank
  const tankMat = M.paintCream.clone();
  tankMat.roughness = 0.62;
  tankMat.color.setHex(0xcdbf9f);
  addCylinder(g, 2.35, 2.15, 3.2, tankMat, 0, 9.5, 0, { seg: 28 });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.5, 0.9, 28), M.metalMint);
  roof.position.y = 11.55; roof.castShadow = true; g.add(roof);
  const bottom = new THREE.Mesh(new THREE.ConeGeometry(2.2, 0.75, 28), M.rust);
  bottom.rotation.x = Math.PI; bottom.position.y = 7.6; bottom.castShadow = true; g.add(bottom);
  for (const y of [8.2, 10.8]) addCylinder(g, 2.4, 2.4, 0.12, M.metalMint, 0, y, 0, { seg: 28 });
  // painted sign on the tank
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.7), signMat(waterTowerTexture(), 0.05, 0x1b120c));
  sign.position.set(0, 9.7, 2.38); g.add(sign);
  // ladder
  for (const x of [-0.42, 0.42]) addCylinder(g, 0.035, 0.035, 7.4, M.darkMetal, x, 4.2, 2.42, { seg: 6 });
  for (let i = 0; i < 18; i++) addBox(g, 0.84, 0.035, 0.035, M.darkMetal, 0, 1.0 + i * 0.4, 2.42);
  // beacon
  const beaconMat = new THREE.MeshStandardMaterial({ color: 0x8c2c22, emissive: 0xff3a22, emissiveIntensity: 0.1, roughness: 0.35 });
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), beaconMat);
  beacon.position.set(0, 12.1, 0); g.add(beacon);
  addContact(g, 0, 0, 5.6, 5.4, 0.5, 0, 0.02);
  g.userData.beaconMat = beaconMat;
  return g;
}

function sedan() {
  const g = new THREE.Group();
  const body = M.paintRed.clone();
  body.color.setHex(0x9d4a3a);
  body.roughness = 0.45;
  body.clearcoat = 0.5;
  body.clearcoatRoughness = 0.3;
  body.envMapIntensity = 0.8;
  const cream = M.paintCream.clone();
  cream.roughness = 0.45;
  const chrome = M.chrome;
  const glass = M.glass;
  addBox(g, 4.6, 0.2, 1.4, M.blackMetal, 0, 0.5, 0, { radius: 0.03 });
  addBox(g, 4.5, 0.48, 1.76, body, 0, 0.9, 0, { radius: 0.16, segs: 4 });
  addBox(g, 1.4, 0.32, 1.7, body, 1.65, 1.18, 0, { radius: 0.1 });
  addBox(g, 1.2, 0.32, 1.7, body, -1.75, 1.18, 0, { radius: 0.1 });
  addBox(g, 2.15, 0.82, 1.66, body, 0.0, 1.55, 0, { radius: 0.14, segs: 4 });
  addBox(g, 2.05, 0.09, 1.56, cream, 0, 2.01, 0, { radius: 0.05 });
  addBox(g, 2.05, 0.2, 1.7, cream, 0, 1.2, 0, { radius: 0.06, cast: false });
  addBox(g, 1.8, 0.5, 1.58, glass, 0, 1.66, 0, { radius: 0.05, cast: false });
  addPlane(g, 1.28, 0.46, glass, 1.04, 1.67, 0, { ry: Math.PI / 2, rz: -0.14, cast: false });
  addPlane(g, 1.2, 0.44, glass, -1.04, 1.67, 0, { ry: -Math.PI / 2, rz: 0.12, cast: false });
  for (const z of [-0.85, 0.85]) {
    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.13, 8, 16, Math.PI), body);
    arch.rotation.y = Math.PI / 2; arch.position.set(1.35, 0.84, z); g.add(arch);
    const arch2 = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.13, 8, 16, Math.PI), body);
    arch2.rotation.y = Math.PI / 2; arch2.position.set(-1.35, 0.84, z); g.add(arch2);
  }
  for (const x of [-1.35, 1.35]) for (const z of [-0.86, 0.86]) {
    addCylinder(g, 0.36, 0.36, 0.25, M.rubber, x, 0.5, z, { rx: Math.PI / 2, seg: 22 });
    addCylinder(g, 0.22, 0.22, 0.27, M.chromeRough, x, 0.5, z, { rx: Math.PI / 2, seg: 16 });
    const white = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.03, 6, 22), cream);
    white.position.set(x, 0.5, z + (z > 0 ? 0.135 : -0.135)); g.add(white);
  }
  addBox(g, 0.1, 0.16, 1.92, chrome, 2.32, 0.72, 0, { radius: 0.03 });
  addBox(g, 0.1, 0.16, 1.92, chrome, -2.32, 0.72, 0, { radius: 0.03 });
  addBox(g, 0.08, 0.3, 1.05, chrome, 2.29, 0.98, 0, { radius: 0.02 });
  for (let i = 0; i < 5; i++) addBox(g, 0.02, 0.25, 0.03, M.darkMetal, 2.34, 0.98, -0.4 + i * 0.2, { cast: false });
  for (const z of [-0.62, 0.62]) {
    addCylinder(g, 0.1, 0.1, 0.07, chrome, 2.3, 1.08, z, { rx: Math.PI / 2, seg: 14 });
    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), new THREE.MeshStandardMaterial({
      color: 0xfff1d0, emissive: 0xffd9a0, emissiveIntensity: 0.2, roughness: 0.15,
    }));
    lens.scale.set(0.5, 1, 1); lens.position.set(2.35, 1.08, z); g.add(lens);
  }
  addBox(g, 0.5, 0.03, 0.02, M.rust, -1.0, 0.72, 0.9, { cast: false });
  addBox(g, 1.8, 0.03, 0.02, M.rust, 0.2, 0.72, -0.9, { cast: false });
  addContact(g, 0, 0, 5.4, 2.3, 0.5, 0, 0.006);
  return g;
}

export function buildExtras(scene) {
  const root = new THREE.Group();
  root.name = 'extras';
  scene.add(root);
  const nightLights = [];
  const nightMats = [];
  const regLight = (l, day, dusk) => { l.userData.night = { day, dusk }; nightLights.push(l); return l; };
  const regMat = (m, day, dusk, prop = 'emissiveIntensity') => { m.userData.night = { day, dusk, prop }; nightMats.push(m); return m; };

  const rnd = mulberry32(991);

  // ---------------------------------------------------------------- right work yard
  const yardGravel = M.sand.clone();
  yardGravel.color.setHex(0x998a72);
  yardGravel.roughness = 0.98;
  yardGravel.map = cloneRepeat(M.sand.map, 3, 3);
  addPlane(root, 8.6, 8.6, yardGravel, 17.0, 0.028, 1.1, { rx: -Math.PI / 2, cast: false });
  addBox(root, 8.8, 0.08, 0.18, M.concrete, 17.0, 0.05, 5.35, { cast: false });

  // chain-link fence (leave a gate on the west side)
  const chainTex = chainTexture();
  const fenceMat = new THREE.MeshStandardMaterial({
    map: chainTex, transparent: true, alphaTest: 0.12, side: THREE.DoubleSide,
    roughness: 0.6, metalness: 0.45, color: 0xb9bbb2, depthWrite: false, envMapIntensity: 0.4,
  });
  const fenceRuns = [
    [13.0, -3.2, 21.0, -3.2],
    [21.0, -3.2, 21.0, 5.2],
    [13.0, 5.2, 21.0, 5.2],
    [13.0, -3.2, 13.0, 1.2],
    [13.0, 3.8, 13.0, 5.2],
  ];
  for (const [x0, z0, x1, z1] of fenceRuns) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const geo = new THREE.PlaneGeometry(len, 2.1);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * len / 1.8);
    const mat = fenceMat.clone();
    mat.map = chainTex.clone();
    mat.map.repeat.set(len / 1.8, 1.1);
    mat.map.needsUpdate = true;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set((x0 + x1) / 2, 1.06, (z0 + z1) / 2);
    mesh.rotation.y = Math.atan2(-(z1 - z0), x1 - x0);
    root.add(mesh);
    const posts = Math.max(2, Math.round(len / 2.4));
    for (let i = 0; i <= posts; i++) {
      const t = i / posts;
      addCylinder(root, 0.055, 0.065, 2.2, M.chromeRough, lerp(x0, x1, t), 1.1, lerp(z0, z1, t), { seg: 8, cast: false });
    }
    const rail = addBox(root, len, 0.06, 0.06, M.chromeRough, (x0 + x1) / 2, 2.1, (z0 + z1) / 2, { cast: false });
    rail.rotation.y = Math.atan2(-(z1 - z0), x1 - x0);
  }
  // open gate leaf
  const gate = new THREE.Group();
  gate.position.set(13.0, 0, 1.2);
  gate.rotation.y = -1.1;
  const gateGeo = new THREE.PlaneGeometry(2.4, 2.0);
  const gateMesh = new THREE.Mesh(gateGeo, fenceMat.clone());
  gateMesh.position.set(1.2, 1.05, 0);
  gate.add(gateMesh);
  addBox(gate, 2.5, 0.06, 0.06, M.chromeRough, 1.2, 2.05, 0);
  addBox(gate, 0.06, 2.1, 0.06, M.chromeRough, 0.02, 1.05, 0);
  addBox(gate, 0.06, 2.1, 0.06, M.chromeRough, 2.42, 1.05, 0);
  root.add(gate);

  // wrecker sign on the north fence
  const yardSign = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.5), signMat(yardSignTexture()));
  yardSign.position.set(17.0, 1.65, 5.28);
  yardSign.rotation.y = Math.PI;
  root.add(yardSign);

  // tow truck
  const tow = createPickup();
  tow.position.set(13.2, 0.04, 7.0);
  tow.rotation.y = -1.2;
  // boom and hook on the bed
  addBox(tow, 0.14, 0.14, 2.3, M.darkMetal, -1.5, 2.2, 0.0, { radius: 0.02 });
  addBox(tow, 0.14, 0.14, 2.4, M.darkMetal, -2.0, 2.35, 0.0, { radius: 0.02, rz: -0.22 });
  addCylinder(tow, 0.16, 0.16, 0.5, M.darkMetal, -2.45, 2.1, 0, { rz: Math.PI / 2, seg: 10 });
  addCylinder(tow, 0.025, 0.025, 2.0, M.darkMetal, -2.8, 1.55, 0, { seg: 5 });
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.035, 6, 10, Math.PI * 1.4), M.chrome);
  hook.position.set(-2.8, 0.55, 0); hook.rotation.z = 0.5; tow.add(hook);
  const towBeaconMat = new THREE.MeshStandardMaterial({ color: 0xd8862f, emissive: 0xff8a23, emissiveIntensity: 0.15, roughness: 0.25 });
  addCylinder(tow, 0.13, 0.13, 0.16, towBeaconMat, 0.9, 2.2, 0, { seg: 12 });
  regMat(towBeaconMat, 0.15, 2.6);
  addContact(root, 13.2, 7.0, 5.4, 2.4, 0.5, -1.2, 0.035);
  root.add(tow);

  // dumpster
  const dumpMat = M.paintGreen.clone();
  dumpMat.color.setHex(0x445247);
  dumpMat.roughness = 0.8;
  addBox(root, 2.5, 1.35, 1.35, dumpMat, 19.5, 0.72, -1.5, { radius: 0.05 });
  addBox(root, 2.55, 0.1, 1.4, M.darkMetal, 19.5, 1.43, -1.5, { rotation: -0.08 });
  for (const x of [18.5, 20.5]) for (const z of [-2.0, -1.0]) addCylinder(root, 0.14, 0.14, 0.16, M.rubber, x, 0.15, z, { rx: Math.PI / 2, seg: 10 });
  addBox(root, 0.7, 0.3, 0.02, M.rust, 18.8, 0.7, -0.82, { cast: false });

  // propane tank
  addCylinder(root, 0.62, 0.62, 2.5, M.paintCream, 14.3, 0.75, -1.8, { rz: Math.PI / 2, seg: 18 });
  for (const x of [13.35, 15.25]) addBox(root, 0.18, 0.7, 0.85, M.darkMetal, x, 0.36, -1.8);
  addCylinder(root, 0.1, 0.1, 0.35, M.darkMetal, 13.2, 0.95, -1.8, { seg: 8 });
  addBox(root, 0.7, 0.35, 0.03, M.paintCream, 14.3, 1.05, -1.17);
  addContact(root, 14.3, -1.8, 2.8, 1.3, 0.4, 0, 0.03);

  // corrugated shed
  addBox(root, 3.2, 2.35, 2.0, M.corrugated, 19.2, 1.2, 3.8, { radius: 0.03 });
  addBox(root, 3.0, 0.08, 2.1, M.rust, 19.2, 2.42, 3.8, { cast: false });
  addBox(root, 1.05, 2.0, 0.06, M.darkMetal, 19.2, 1.0, 2.76);
  addBox(root, 0.24, 0.04, 0.12, M.chromeRough, 20.05, 1.0, 2.7);
  addBox(root, 1.2, 0.7, 0.04, M.glassWarm, 20.25, 1.45, 2.74, { cast: false });
  addBox(root, 0.5, 0.35, 0.03, M.rust, 18.4, 1.2, 2.74, { cast: false });
  addContact(root, 19.2, 3.8, 3.6, 2.4, 0.5, 0, 0.03);

  // scrap pile + tyre pile
  addTireStack(root, 14.9, 3.9, 4, 1.05);
  addBox(root, 1.2, 0.12, 1.0, M.woodDark, 17.0, 0.1, 3.8, { radius: 0.02 });
  addBox(root, 0.9, 0.55, 0.65, M.darkMetal, 17.0, 0.48, 3.8, { radius: 0.08 });
  addCylinder(root, 0.24, 0.24, 0.8, M.rust, 16.3, 0.8, 3.55, { rx: Math.PI / 2, seg: 12 });
  addBarrel(root, 17.7, 4.35, M.metalRust);
  const scrapCrate = createCrate(0.55);
  scrapCrate.position.set(15.7, 0.31, 2.9);
  root.add(scrapCrate);
  addContact(root, 16.7, 3.8, 3.2, 2.2, 0.4, 0, 0.03);

  // floodlight
  addCylinder(root, 0.1, 0.13, 7.2, M.darkMetal, 20.3, 3.6, -2.2, { seg: 10 });
  addBox(root, 0.9, 0.14, 0.5, M.darkMetal, 20.3, 7.2, -2.2);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.32), M.bulb);
  lamp.position.set(20.3, 7.06, -2.0); root.add(lamp);
  const yardLight = new THREE.SpotLight(0xffc07a, 0, 26, Math.PI * 0.26, 0.72, 1.35);
  yardLight.position.set(20.3, 7.0, -2.0);
  yardLight.target.position.set(16.5, 0, 2.0);
  root.add(yardLight, yardLight.target);
  regLight(yardLight, 0, 22);
  addContact(root, 20.3, -2.2, 0.7, 0.7, 0.3, 0, 0.03);

  // ---------------------------------------------------------------- water tower
  const tower = waterTower();
  tower.name = 'waterTower';
  root.add(tower);
  const beaconLight = new THREE.PointLight(0xff2a18, 0, 16, 2);
  beaconLight.position.set(-14, 12.1, -7);
  root.add(beaconLight);
  regLight(beaconLight, 0, 5);

  // ---------------------------------------------------------------- south picnic pull-out
  const pull = M.sand.clone();
  pull.color.setHex(0x9f8f74);
  pull.roughness = 0.98;
  addPlane(root, 10.0, 8.0, pull, -22.5, 0.026, 20.3, { rx: -Math.PI / 2, cast: false });
  // picnic table
  const table = new THREE.Group();
  table.position.set(-22.2, 0, 20.2);
  addBox(table, 2.5, 0.12, 0.95, M.wood, 0, 0.82, 0, { radius: 0.03 });
  for (const z of [-0.78, 0.78]) addBox(table, 2.5, 0.1, 0.32, M.wood, 0, 0.48, z, { radius: 0.03 });
  for (const x of [-0.9, 0.9]) {
    addBox(table, 0.12, 0.85, 1.9, M.woodDark, x, 0.42, 0);
  }
  // umbrella
  addCylinder(table, 0.045, 0.045, 2.85, M.woodDark, 0, 1.42, 0, { seg: 8 });
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.9, 0.55, 12, 1, true), M.paintTeal);
  canopy.position.set(0, 2.7, 0);
  canopy.material = M.paintTeal.clone();
  canopy.material.side = THREE.DoubleSide;
  canopy.material.color.setHex(0x5f948c);
  table.add(canopy);
  addBox(table, 0.6, 0.3, 0.03, M.paintCream, 0, 2.9, 0, { cast: false });
  root.add(table);
  addContact(root, -22.2, 20.2, 3.0, 2.2, 0.5, 0, 0.03);

  // kettle grill + cooler + bin
  const grill = new THREE.Group();
  grill.position.set(-20.3, 0, 19.2);
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.paintBlack);
  bowl.rotation.x = Math.PI; bowl.position.y = 0.55; grill.add(bowl);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.6, 6), M.darkMetal);
    leg.position.set(Math.cos(a) * 0.26, 0.3, Math.sin(a) * 0.26);
    leg.rotation.z = Math.cos(a) * 0.35; leg.rotation.x = Math.sin(a) * 0.35; grill.add(leg);
  }
  root.add(grill);
  addBox(root, 0.62, 0.38, 0.38, M.paintCream, -19.1, 0.22, 20.9, { radius: 0.05 });
  addBox(root, 0.6, 0.05, 0.36, M.paintRed, -19.1, 0.42, 20.9, { radius: 0.02 });
  addBox(root, 0.4, 0.04, 0.18, M.chromeRough, -19.1, 0.25, 20.9, { cast: false });
  const bin = createTrashBin();
  bin.position.set(-23.8, 0, 18.6);
  root.add(bin);
  addContact(root, -21.5, 19.8, 5.0, 3.0, 0.4, 0, 0.03);

  // string lights between two posts
  const postA = new THREE.Vector3(-24.6, 0, 22.0);
  const postB = new THREE.Vector3(-19.8, 0, 22.0);
  for (const p of [postA, postB]) {
    addCylinder(root, 0.07, 0.09, 3.1, M.woodDark, p.x, 1.55, p.z, { seg: 8 });
    addContact(root, p.x, p.z, 0.4, 0.4, 0.3, 0, 0.03);
  }
  const wireCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(postA.x, 3.0, postA.z),
    new THREE.Vector3(-22.2, 2.35, postA.z),
    new THREE.Vector3(postB.x, 3.0, postB.z)
  );
  const wireMesh = new THREE.Mesh(new THREE.TubeGeometry(wireCurve, 24, 0.012, 4, false), M.darkMetal);
  root.add(wireMesh);
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffe3b0, emissive: 0xffc06a, emissiveIntensity: 0.35, roughness: 0.3 });
  regMat(bulbMat, 0.35, 2.4);
  for (let i = 1; i < 16; i++) {
    const t = i / 16;
    const p = wireCurve.getPoint(t);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), bulbMat);
    bulb.position.set(p.x, p.y - 0.06, p.z);
    root.add(bulb);
  }
  const picnicSign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), signMat(picnicTexture()));
  picnicSign.position.set(-27.6, 1.35, 20.8);
  picnicSign.rotation.y = Math.PI + 0.15;
  root.add(picnicSign);
  addBox(root, 0.12, 1.4, 0.12, M.woodDark, -27.6, 0.7, 21.2);

  // vintage sedan in the pull-out
  const car = sedan();
  car.position.set(-26.5, 0.03, 23.5);
  car.rotation.y = 1.05;
  root.add(car);
  addContact(root, -26.5, 23.5, 5.4, 2.4, 0.45, 1.05, 0.032);

  // ---------------------------------------------------------------- station facade clutter
  // vending machine (left pier)
  addBox(root, 1.02, 1.9, 0.82, M.paintRed, -9.25, 0.98, 1.55, { radius: 0.05 });
  const vendFace = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.72), signMat(vendingTexture(), 0.55, 0x2a0d08));
  vendFace.position.set(-9.25, 0.98, 1.975);
  root.add(vendFace);
  regMat(vendFace.material, 0.35, 0.9);
  addBox(root, 0.06, 1.9, 0.84, M.blackMetal, -9.72, 0.98, 1.55);

  // ice chest (right of shop)
  addBox(root, 1.05, 1.45, 0.82, M.paintWhite, 8.72, 0.76, 3.45, { radius: 0.04 });
  addBox(root, 1.0, 0.12, 0.78, M.paintBlue, 8.72, 1.53, 3.45, { radius: 0.02 });
  const ice = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), signMat(iceTexture(), 0.3, 0x0a2730));
  ice.position.set(8.72, 1.06, 3.88); root.add(ice);
  regMat(ice.material, 0.2, 0.6);
  addBox(root, 0.8, 0.08, 0.02, M.chromeRough, 8.72, 0.55, 3.88, { cast: false });

  // propane cage
  const cage = new THREE.Group();
  cage.position.set(8.55, 0, 4.75);
  for (const x of [-0.7, 0.7]) for (const z of [-0.45, 0.45]) addCylinder(cage, 0.035, 0.035, 1.35, M.chromeRough, x, 0.68, z, { seg: 6 });
  for (const y of [0.05, 1.3]) {
    addBox(cage, 1.42, 0.04, 0.04, M.chromeRough, 0, y, -0.45, { cast: false });
    addBox(cage, 1.42, 0.04, 0.04, M.chromeRough, 0, y, 0.45, { cast: false });
    addBox(cage, 0.04, 0.04, 0.9, M.chromeRough, -0.7, y, 0, { cast: false });
    addBox(cage, 0.04, 0.04, 0.9, M.chromeRough, 0.7, y, 0, { cast: false });
  }
  for (const x of [-0.35, 0.35]) {
    addCylinder(cage, 0.17, 0.17, 0.9, M.paintCream, x, 0.5, 0, { seg: 12 });
    addCylinder(cage, 0.08, 0.08, 0.12, M.darkMetal, x, 0.98, 0, { seg: 8 });
    addBox(cage, 0.2, 0.12, 0.02, M.paintBlue, x, 0.7, 0.17, { cast: false });
  }
  root.add(cage);
  addContact(root, 8.55, 4.75, 1.7, 1.2, 0.35, 0, 0.03);

  // news box
  addBox(root, 0.55, 1.1, 0.5, M.paintBlue, 2.7, 0.56, 0.65, { radius: 0.03 });
  addBox(root, 0.45, 0.35, 0.02, M.glass, 2.7, 0.95, 0.91, { cast: false });
  addBox(root, 0.32, 0.1, 0.02, M.paintCream, 2.7, 1.0, 0.92, { cast: false });
  addContact(root, 2.7, 0.65, 0.8, 0.7, 0.3, 0, 0.03);

  // air + water stand
  addCylinder(root, 0.08, 0.1, 1.35, M.darkMetal, -9.5, 0.68, 2.75, { seg: 8 });
  addBox(root, 0.44, 0.34, 0.22, M.paintTeal, -9.5, 1.2, 2.75, { radius: 0.04 });
  addCylinder(root, 0.2, 0.2, 0.12, M.chromeRough, -9.5, 1.2, 2.9, { rx: Math.PI / 2, seg: 14 });
  const gauge = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 16), M.paintWhite);
  gauge.rotation.x = Math.PI / 2; gauge.position.set(-9.5, 1.04, 2.9); root.add(gauge);
  addContact(root, -9.5, 2.75, 0.5, 0.5, 0.3, 0, 0.03);

  // bicycle leaning by the office
  const bike = new THREE.Group();
  bike.position.set(-9.3, 0, 4.75);
  bike.rotation.y = 0.15;
  for (const x of [-0.62, 0.62]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.025, 6, 24), M.rubber);
    wheel.position.set(x, 0.38, 0); wheel.rotation.y = Math.PI / 2; bike.add(wheel);
  }
  const frameMat = M.paintRed;
  tube([[-0.62, 0.38, 0], [-0.1, 0.78, 0], [0.28, 0.78, 0], [0.62, 0.38, 0]], 0.025, frameMat, bike, 20, 5);
  tube([[-0.1, 0.78, 0], [0.28, 0.38, 0], [0.62, 0.38, 0]], 0.025, frameMat, bike, 16, 5);
  addBox(bike, 0.28, 0.04, 0.12, M.paintBlack, -0.15, 0.85, 0);
  addBox(bike, 0.04, 0.04, 0.5, M.chromeRough, 0.38, 0.92, 0);
  addBox(bike, 0.24, 0.03, 0.05, M.rubber, 0.38, 0.95, 0.22, { cast: false });
  bike.rotation.z = -0.08;
  root.add(bike);

  // roof AC units + dish
  for (const [x, z] of [[-3.4, 1.9], [3.2, 2.9]]) {
    addBox(root, 1.2, 0.62, 0.85, M.chromeRough, x, 5.27, z, { radius: 0.03 });
    addBox(root, 1.0, 0.04, 0.7, M.darkMetal, x, 5.59, z, { cast: false });
    for (let i = 0; i < 5; i++) addBox(root, 0.82, 0.02, 0.02, M.darkMetal, x, 5.62, z - 0.28 + i * 0.14, { cast: false });
  }
  addCylinder(root, 0.18, 0.22, 0.28, M.darkMetal, 6.4, 5.16, 1.6, { seg: 10 });
  addBox(root, 0.4, 0.04, 0.4, M.darkMetal, 6.4, 5.31, 1.6, { cast: false });

  // tyre stack and simple bench on the west forecourt
  addTireStack(root, -14.2, 11.6, 3, 1.0);
  const bench = new THREE.Group();
  bench.position.set(-20.5, 0, 12.0);
  bench.rotation.y = -0.35;
  addBox(bench, 1.8, 0.1, 0.55, M.wood, 0, 0.48, 0, { radius: 0.02 });
  addBox(bench, 1.8, 0.5, 0.09, M.wood, 0, 0.78, -0.24, { radius: 0.02 });
  for (const x of [-0.7, 0.7]) {
    addBox(bench, 0.1, 0.48, 0.5, M.woodDark, x, 0.24, 0);
    addBox(bench, 0.1, 0.75, 0.08, M.woodDark, x, 0.38, -0.24);
  }
  root.add(bench);
  addContact(root, -20.5, 12.0, 2.2, 1.0, 0.35, -0.35, 0.03);
  const bin2 = createTrashBin();
  bin2.position.set(-19.2, 0, 12.4);
  root.add(bin2);

  // fire hydrant + drums near the east forecourt edge
  const hyd = new THREE.Group();
  hyd.position.set(10.9, 0, 12.4);
  addCylinder(hyd, 0.2, 0.24, 0.16, M.concrete, 0, 0.08, 0, { seg: 12 });
  addCylinder(hyd, 0.15, 0.18, 0.55, M.paintRed, 0, 0.42, 0, { seg: 14 });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.paintRed);
  dome.position.set(0, 0.7, 0); hyd.add(dome);
  addCylinder(hyd, 0.06, 0.06, 0.3, M.chromeRough, 0, 0.78, 0, { seg: 8 });
  for (const s of [-1, 1]) {
    addCylinder(hyd, 0.075, 0.075, 0.22, M.paintRed, s * 0.19, 0.5, 0, { rz: Math.PI / 2, seg: 10 });
    addCylinder(hyd, 0.09, 0.09, 0.05, M.chromeRough, s * 0.31, 0.5, 0, { rz: Math.PI / 2, seg: 10 });
  }
  root.add(hyd);
  addContact(root, 10.9, 12.4, 0.6, 0.6, 0.3, 0, 0.03);
  addBarrel(root, 9.9, 12.6, M.plasticRed);
  addBarrel(root, 9.55, 12.15, M.metalRust);
  const railMat = M.chromeRough.clone();
  railMat.color.setHex(0x8f918b);
  railMat.roughness = 0.55;
  function guardrail(x0, x1, z) {
    const len = x1 - x0, mid = (x0 + x1) / 2;
    addBox(root, len, 0.3, 0.12, railMat, mid, 0.73, z, { radius: 0.03 });
    addBox(root, len, 0.1, 0.1, railMat, mid, 0.5, z, { radius: 0.02 });
    const n = Math.max(2, Math.round(len / 2.5));
    for (let i = 0; i <= n; i++) {
      const x = x0 + (len * i) / n;
      addBox(root, 0.13, 0.78, 0.16, M.woodDark, x, 0.39, z);
      addBox(root, 0.12, 0.05, 0.02, M.paintWhite, x, 0.78, z + 0.08, { cast: false });
    }
  }
  guardrail(-30, -8, 16.7);
  guardrail(8, 23, 16.7);
  for (let x = -28; x <= 22; x += 8) {
    addCylinder(root, 0.035, 0.045, 0.9, M.paintWhite, x, 0.45, 17.5, { seg: 6 });
    addBox(root, 0.1, 0.12, 0.02, M.plasticRed, x, 0.72, 17.53, { cast: false });
  }
  // mile marker
  addCylinder(root, 0.05, 0.06, 1.3, M.darkMetal, -28.4, 0.65, 17.8, { seg: 8 });
  const mile = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.75), signMat(mileTexture()));
  mile.position.set(-28.4, 1.42, 17.83); mile.rotation.y = Math.PI; root.add(mile);
  // speed limit
  addCylinder(root, 0.05, 0.06, 1.7, M.darkMetal, 21.8, 0.85, 17.9, { seg: 8 });
  const speed = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.9), signMat(speedTexture()));
  speed.position.set(21.8, 1.95, 17.93); speed.rotation.y = Math.PI + 0.1; root.add(speed);
  // last gas sign
  addBox(root, 0.16, 2.0, 0.16, M.woodDark, 22.7, 1.0, 18.6);
  addBox(root, 0.14, 0.14, 0.9, M.woodDark, 22.7, 1.85, 18.2);
  const lastGas = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.5), signMat(lastGasTexture(), 0.06, 0x24170d));
  lastGas.position.set(22.7, 2.1, 18.72); lastGas.rotation.y = Math.PI + 0.08; root.add(lastGas);
  // mailbox
  addBox(root, 0.09, 1.1, 0.09, M.woodDark, -7.1, 0.55, 17.2);
  addBox(root, 0.5, 0.3, 0.9, M.paintBlue, -7.1, 1.15, 17.2, { radius: 0.06 });
  addBox(root, 0.03, 0.22, 0.03, M.plasticRed, -6.85, 1.35, 17.4, { cast: false });

  // ---------------------------------------------------------------- hero vegetation
  const plants = [
    [-20.5, 24.5, 4.8, 4], [17.5, 11.8, 3.9, 9], [24.0, 19.4, 5.0, 12],
  ];
  for (const [x, z, h, seed] of plants) {
    const s = createSaguaro(h, seed);
    s.position.set(x, 0.02, z);
    s.rotation.y = seed;
    root.add(s);
    addContact(root, x, z, 1.2, 1.2, 0.32, 0, 0.03);
  }
  for (const [x, z, sc] of [[-12.5, 17.3, 1.1], [13.2, 14.8, 0.9], [24.2, 9.0, 1.25], [-25.2, 8.0, 0.8]]) {
    const y = createYucca(sc);
    y.position.set(x, 0.02, z);
    root.add(y);
  }
  for (const [x, z, sc] of [[-15.4, 18.5, 0.9], [9.8, 18.0, 0.8], [22.0, 12.5, 1.0], [-18.5, 6.5, 0.75]]) {
    const p = createPricklyPear(sc, Math.floor(x * z));
    p.position.set(x, 0.02, z);
    root.add(p);
  }

  // ---------------------------------------------------------------- instanced rocks
  const dummy = new THREE.Object3D();
  const rockGeo = new THREE.IcosahedronGeometry(1, 1);
  const rp = rockGeo.attributes.position;
  for (let i = 0; i < rp.count; i++) {
    const x = rp.getX(i), y = rp.getY(i), z = rp.getZ(i);
    const n = 0.75 + rnd() * 0.5;
    rp.setXYZ(i, x * n, y * n * 0.6, z * n);
  }
  rockGeo.computeVertexNormals();
  const rockMat = new THREE.MeshStandardMaterial({ color: 0xa97455, roughness: 0.96, metalness: 0, envMapIntensity: 0.2 });
  const rockCount = 42;
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
  let ri = 0;
  while (ri < rockCount) {
    const x = -29 + rnd() * 58;
    const z = -10 + rnd() * 36;
    if (x > -14 && x < 14 && z > -6 && z < 12) continue;
    if (z > 12.2 && z < 17.2) continue;
    if (x > 12 && x < 22 && z > -6 && z < 6) continue;
    const s = 0.15 + Math.pow(rnd(), 2) * 0.8;
    dummy.position.set(x, s * 0.28, z);
    dummy.rotation.set(rnd() * 0.5, rnd() * 6.28, rnd() * 0.4);
    dummy.scale.set(s * (0.8 + rnd() * 0.6), s * (0.5 + rnd() * 0.5), s);
    dummy.updateMatrix();
    rocks.setMatrixAt(ri++, dummy.matrix);
  }
  rockMat.map = cloneRepeat(M.sand.map, 2, 2);
  root.add(rocks);

  // ---------------------------------------------------------------- ground paint
  const paintTex = signTexture(1024, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(232,222,198,.55)'; ctx.lineWidth = 10;
    for (let i = 0; i < 4; i++) {
      const x = 120 + i * 220;
      ctx.beginPath(); ctx.moveTo(x, 470); ctx.lineTo(x, 180); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(232,222,198,.5)';
    ctx.font = '84px "Bebas Neue", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PULL IN', w - 240, 160);
    ctx.beginPath(); ctx.moveTo(w - 150, 130); ctx.lineTo(w - 70, 150); ctx.lineTo(w - 150, 170); ctx.closePath(); ctx.fill();
  });
  const paintMat = new THREE.MeshBasicMaterial({ map: paintTex, transparent: true, depthWrite: false, opacity: 0.55, polygonOffset: true, polygonOffsetFactor: -2 });
  const paint = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.5), paintMat);
  paint.rotation.x = -Math.PI / 2; paint.rotation.z = 0.03;
  paint.position.set(0.5, 0.036, 10.2);
  paint.renderOrder = 2;
  root.add(paint);

  // a couple of painted stall lines on the west side
  for (let i = 0; i < 3; i++) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 3.2), paintMat);
    line.material = paintMat.clone();
    line.material.opacity = 0.3;
    line.rotation.x = -Math.PI / 2;
    line.position.set(-12.6 + i * 0.9, 0.035, 11.6);
    line.renderOrder = 2;
    root.add(line);
  }

  // ---------------------------------------------------------------- night
  const beaconMat = tower.userData.beaconMat;
  function setNight(n) {
    n = THREE.MathUtils.clamp(n, 0, 1);
    for (const l of nightLights) l.intensity = lerp(l.userData.night.day, l.userData.night.dusk, n);
    for (const m of nightMats) m[m.userData.night.prop] = lerp(m.userData.night.day, m.userData.night.dusk, n);
    beaconMat.emissiveIntensity = lerp(0.05, 2.4, n);
  }
  setNight(0);

  return { root, setNight };
}
