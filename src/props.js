import * as THREE from 'three';
import { M } from './materials.js';
import { addBox, addCylinder, addMesh, addPlane, addContact, tube } from './lib/build.js';
import { makeCanvas, makeTexture } from './textures.js';
import { mulberry32 } from './lib/noise.js';

let stencilTex = null;
function stencil() {
  if (stencilTex) return stencilTex;
  const c = makeCanvas(256, 128);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 256, 128);
  ctx.fillStyle = 'rgba(45,34,24,.78)';
  ctx.font = '22px "Bebas Neue", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BIG EARL\'S', 128, 46);
  ctx.font = '17px "Bebas Neue", sans-serif';
  ctx.fillText('DEADLOCK GORGE · AZ', 128, 72);
  ctx.strokeStyle = 'rgba(45,34,24,.6)'; ctx.lineWidth = 2; ctx.strokeRect(52, 20, 152, 64);
  stencilTex = makeTexture(c, { repeat: [1, 1] });
  return stencilTex;
}

export function createTire(radius = 0.36) {
  const pts = [];
  const r = radius;
  const profile = [
    [0.66, -0.30], [0.86, -0.32], [1.0, -0.18], [1.0, 0.16], [0.9, 0.30], [0.72, 0.28], [0.62, 0.18], [0.62, -0.18], [0.66, -0.30],
  ];
  for (const [pr, py] of profile) pts.push(new THREE.Vector2(pr * r, py * r));
  const geo = new THREE.LatheGeometry(pts, 26);
  const g = new THREE.Group();
  addMesh(g, geo, M.rubber, { cast: true, receive: true });
  const rim = addCylinder(g, r * 0.58, r * 0.58, 0.16, M.darkMetal, 0, 0, 0, { seg: 22 });
  addCylinder(g, r * 0.18, r * 0.18, 0.2, M.chromeRough, 0, 0, 0, { seg: 16 });
  return g;
}

export function addTireStack(parent, x, z, count = 3, scale = 1) {
  const g = new THREE.Group();
  g.position.set(x, 0.045, z);
  for (let i = 0; i < count; i++) {
    const t = createTire(0.36 * scale);
    t.position.y = 0.11 * scale + i * 0.225 * scale;
    t.rotation.y = i * 0.7;
    g.add(t);
  }
  addContact(g, 0, 0, 1.15 * scale, 1.15 * scale, 0.42, 0, 0.002);
  parent.add(g);
  return g;
}

export function createBarrel(mat = M.plasticBlue, { lid = true } = {}) {
  const g = new THREE.Group();
  const body = addCylinder(g, 0.29, 0.29, 0.88, mat, 0, 0.44, 0, { seg: 26 });
  // ribs
  for (const y of [0.22, 0.62]) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.295, 0.018, 8, 26), M.darkMetal);
    rib.rotation.x = Math.PI / 2; rib.position.y = y; rib.castShadow = true;
    g.add(rib);
  }
  addCylinder(g, 0.30, 0.30, 0.025, M.darkMetal, 0, 0.88, 0, { seg: 26 });
  if (lid) addCylinder(g, 0.075, 0.075, 0.03, M.chromeRough, 0.12, 0.90, 0, { seg: 12 });
  addContact(g, 0, 0, 0.78, 0.78, 0.4, 0, 0.002);
  return g;
}

export function addBarrel(parent, x, z, mat, opts = {}) {
  const b = createBarrel(mat, opts);
  b.position.set(x, 0.02, z);
  b.rotation.y = opts.rot ?? 0;
  parent.add(b);
  return b;
}

export function createCrate(s = 0.7) {
  const g = new THREE.Group();
  addBox(g, s, s * 0.86, s * 0.86, M.wood, 0, s * 0.43, 0, { radius: 0.02 });
  const t = 0.035;
  // corner posts / slats
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    addBox(g, t * 1.6, s * 0.86, t * 1.6, M.woodDark, x * s * 0.48, s * 0.43, z * s * 0.42);
  }
  addBox(g, s * 1.01, t, s * 0.9, M.woodDark, 0, s * 0.08, 0);
  addBox(g, s * 1.01, t, s * 0.9, M.woodDark, 0, s * 0.8, 0);
  addBox(g, s * 1.01, t, s * 0.9, M.woodDark, 0, s * 0.46, 0);
  // stencil decal
  const sm = new THREE.MeshStandardMaterial({ map: stencil(), transparent: true, roughness: 0.9, metalness: 0, opacity: 0.8 });
  addPlane(g, s * 0.74, s * 0.37, sm, 0, s * 0.5, s * 0.44, { cast: false });
  return g;
}

export function addCrateStack(parent, x, z, rot = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0.03, z); g.rotation.y = rot;
  const a = createCrate(0.72); a.position.y = 0; g.add(a);
  const b = createCrate(0.6); b.position.set(0.06, 0.62, 0.03); b.rotation.y = 0.35; g.add(b);
  addContact(g, 0, 0, 1.2, 1.2, 0.4, 0, 0.002);
  parent.add(g);
  return g;
}

export function createCone() {
  const g = new THREE.Group();
  addBox(g, 0.5, 0.05, 0.5, M.rubber, 0, 0.025, 0);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.62, 20), M.paintRed);
  cone.position.y = 0.34; cone.castShadow = true;
  g.add(cone);
  for (const [y, r] of [[0.36, 0.135], [0.49, 0.085]]) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.02, 0.075, 20), M.paintCream);
    band.position.y = y; g.add(band);
  }
  addContact(g, 0, 0, 0.7, 0.7, 0.3, 0, 0.002);
  return g;
}

export function createPump(premium = false) {
  const g = new THREE.Group();
  const face = premium ? M.pumpFacePremium : M.pumpFace;
  // plinth
  addBox(g, 0.88, 0.16, 0.68, M.rubber, 0, 0.08, 0, { radius: 0.03 });
  addBox(g, 0.78, 0.12, 0.6, M.darkMetal, 0, 0.17, 0, { radius: 0.02 });
  // main body
  addBox(g, 0.66, 1.72, 0.5, M.paintCream, 0, 1.08, 0, { radius: 0.07, segs: 4 });
  addBox(g, 0.70, 0.24, 0.53, M.paintRed, 0, 1.9, 0, { radius: 0.06 });
  addBox(g, 0.70, 0.30, 0.53, M.paintRed, 0, 0.35, 0, { radius: 0.06 });
  // face decals
  addPlane(g, 0.56, 1.6, face, 0, 1.02, 0.252, { cast: false });
  addPlane(g, 0.56, 1.6, face, 0, 1.02, -0.252, { ry: Math.PI, cast: false });
  // chrome frame around face
  for (const z of [0.255, -0.255]) {
    for (const x of [-0.29, 0.29]) addBox(g, 0.022, 1.66, 0.012, M.chromeRough, x, 1.02, z, { cast: false });
    for (const y of [0.22, 1.82]) addBox(g, 0.6, 0.022, 0.012, M.chromeRough, 0, y, z, { cast: false });
  }
  // side chrome strip
  for (const x of [-0.335, 0.335]) addBox(g, 0.02, 1.62, 0.02, M.chromeRough, x, 1.05, 0, { cast: false });
  // top globe
  addCylinder(g, 0.1, 0.13, 0.16, M.chrome, 0, 2.04, 0, { seg: 18 });
  const globeMat = new THREE.MeshPhysicalMaterial({
    color: 0x8d1c12, metalness: 0.1, roughness: 0.08, transparent: true, opacity: 0.9,
    emissive: 0xff3b17, emissiveIntensity: 0.12, envMapIntensity: 1.6, clearcoat: 1, clearcoatRoughness: 0.05,
  });
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.23, 24, 18), globeMat);
  globe.scale.set(1, 1.12, 1); globe.position.y = 2.24; globe.castShadow = true;
  g.add(globe);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.225, 0.014, 8, 28), M.chrome);
  band.rotation.x = Math.PI / 2; band.position.y = 2.24; g.add(band);
  addCylinder(g, 0.075, 0.1, 0.06, M.chrome, 0, 2.5, 0, { seg: 14 });
  addCylinder(g, 0.02, 0.02, 0.12, M.chrome, 0, 2.57, 0, { seg: 8 });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), M.bulbGlow.clone());
  glow.material.opacity = 0;
  glow.position.y = 2.25;
  g.add(glow);
  // hose and nozzle
  const hoseMat = M.rubber.clone();
  hoseMat.color.setHex(0x121110);
  tube([[0.33, 1.4, 0.0], [0.46, 1.24, 0.05], [0.5, 0.95, 0.12], [0.42, 0.62, 0.18], [0.33, 0.55, 0.1]], 0.028, hoseMat, g, 26, 6);
  addBox(g, 0.1, 0.22, 0.14, M.chromeRough, 0.35, 0.58, 0.08, { radius: 0.02 });
  addCylinder(g, 0.028, 0.028, 0.16, M.darkMetal, 0.35, 0.44, 0.08, { seg: 8 });
  // nozzle boot
  addBox(g, 0.14, 0.1, 0.12, M.darkMetal, 0.33, 0.42, 0.06, { radius: 0.02 });
  // little top sign plate
  addBox(g, 0.32, 0.09, 0.04, M.chromeRough, 0, 1.99, 0.27);
  addContact(g, 0, 0, 1.3, 1.05, 0.5, 0, 0.004);
  g.userData.globeMat = globeMat;
  g.userData.glow = glow;
  return g;
}

export function addPump(parent, x, z, rot = 0, premium = false) {
  const p = createPump(premium);
  p.position.set(x, 0.02, z);
  p.rotation.y = rot;
  parent.add(p);
  return p;
}

export function createPumpIsland(x, z, premiumIndex = -1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  addBox(g, 3.3, 0.2, 1.7, M.concrete, 0, 0.12, 0, { radius: 0.04 });
  addBox(g, 3.36, 0.04, 1.76, M.paintYellow, 0, 0.225, 0, { radius: 0.01, cast: false });
  // bollards
  for (const bx of [-1.42, 1.42]) for (const bz of [-0.58, 0.58]) {
    addCylinder(g, 0.075, 0.085, 0.78, M.paintYellow, bx, 0.61, bz, { seg: 14 });
    addCylinder(g, 0.09, 0.09, 0.06, M.rubber, bx, 1.01, bz, { seg: 14 });
    addContact(g, bx, bz, 0.4, 0.4, 0.34, 0, 0.235);
  }
  const p = addPump(g, 0.0, 0.0, 0.03, false);
  p.scale.setScalar(1.06);
  p.position.y = 0.23;
  g.userData.pumps = [p];
  return g;
}

export function createCoke() {
  const g = new THREE.Group();
  addBox(g, 0.82, 1.76, 0.72, M.paintRed, 0, 0.9, 0, { radius: 0.05 });
  addBox(g, 0.86, 0.08, 0.76, M.darkMetal, 0, 0.06, 0);
  addBox(g, 0.86, 0.1, 0.76, M.chromeRough, 0, 1.78, 0);
  addPlane(g, 0.74, 1.58, M.cola, 0, 0.95, 0.364, { cast: false });
  addPlane(g, 0.74, 1.58, M.cola, 0, 0.95, -0.364, { ry: Math.PI, cast: false });
  addBox(g, 0.18, 0.32, 0.04, M.chrome, 0.2, 0.9, 0.37);
  addContact(g, 0, 0, 1.1, 1.05, 0.42, 0, 0.004);
  return g;
}

export function createCompressor() {
  const g = new THREE.Group();
  const tank = addCylinder(g, 0.27, 0.27, 1.0, M.paintBlue, -0.1, 0.52, 0, { seg: 22, rz: Math.PI / 2 });
  for (const x of [-0.6, 0.4]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.27, 18, 12), M.paintBlue);
    cap.position.set(x - 0.1, 0.52, 0); cap.castShadow = true; g.add(cap);
  }
  addBox(g, 0.44, 0.38, 0.42, M.darkMetal, 0.5, 0.55, 0);
  addCylinder(g, 0.16, 0.16, 0.24, M.blackMetal, 0.62, 0.55, 0.16, { seg: 14 });
  const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.08, 16);
  for (const x of [-0.48, 0.42]) {
    const w = new THREE.Mesh(wheelGeo, M.rubber);
    w.rotation.x = Math.PI / 2; w.position.set(x, 0.2, 0.24); w.castShadow = true; g.add(w);
  }
  addBox(g, 0.9, 0.06, 0.05, M.darkMetal, -0.1, 0.94, 0.18);
  tube([[-0.55, 0.65, 0.1], [0.1, 0.3, 0.3], [0.45, 0.62, 0.22]], 0.022, M.rubber, g, 20, 6);
  addContact(g, 0, 0, 1.5, 0.8, 0.4, 0, 0.004);
  return g;
}

export function createToolChest() {
  const g = new THREE.Group();
  addBox(g, 1.0, 0.88, 0.55, M.paintRed, 0, 0.48, 0, { radius: 0.03 });
  for (let i = 0; i < 5; i++) {
    addBox(g, 0.95, 0.13, 0.02, M.paintRed, 0, 0.16 + i * 0.16, 0.28, { radius: 0.01 });
    addBox(g, 0.24, 0.025, 0.03, M.chromeRough, 0, 0.2 + i * 0.16, 0.295);
  }
  addBox(g, 0.96, 0.05, 0.5, M.darkMetal, 0, 0.94, 0);
  for (const [x, z] of [[-0.38, -0.2], [0.38, -0.2], [-0.38, 0.2], [0.38, 0.2]]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.08, 10), M.blackMetal);
    c.rotation.z = Math.PI / 2; c.position.set(x, 0.06, z); g.add(c);
  }
  addContact(g, 0, 0, 1.3, 0.8, 0.42, 0, 0.004);
  return g;
}

export function createWorkbench() {
  const g = new THREE.Group();
  addBox(g, 2.1, 0.08, 0.7, M.wood, 0, 0.9, 0);
  addBox(g, 2.1, 0.08, 0.7, M.wood, 0, 0.3, 0);
  for (const x of [-0.98, 0.98]) for (const z of [-0.28, 0.28]) {
    addBox(g, 0.07, 0.9, 0.07, M.darkMetal, x, 0.45, z);
  }
  // vice
  addBox(g, 0.22, 0.16, 0.22, M.paintBlue, -0.75, 1.02, 0.1);
  addBox(g, 0.3, 0.05, 0.12, M.darkMetal, -0.75, 1.12, 0.1);
  // cans / tools
  for (let i = 0; i < 4; i++) {
    addCylinder(g, 0.05, 0.05, 0.18, i % 2 ? M.paintRed : M.plasticBlue, 0.2 + i * 0.18, 1.03, -0.12, { seg: 10 });
  }
  // pegboard
  addBox(g, 2.1, 0.85, 0.04, M.woodDark, 0, 1.65, -0.33);
  for (let i = 0; i < 12; i++) {
    addBox(g, 0.03 + (i % 3) * 0.04, 0.22 + (i % 4) * 0.1, 0.02, i % 2 ? M.darkMetal : M.paintRed, -0.85 + i * 0.15, 1.65, -0.3);
  }
  addContact(g, 0, 0, 2.5, 1.1, 0.35, 0, 0.004);
  return g;
}

export function createShelf(w = 1.6, h = 1.9) {
  const g = new THREE.Group();
  addBox(g, w, 0.05, 0.45, M.shelfMetal, 0, h, 0);
  for (const x of [-w / 2, w / 2]) for (const z of [-0.2, 0.2]) addBox(g, 0.05, h, 0.05, M.shelfMetal, x, h / 2, z);
  const rows = 4;
  for (let i = 1; i <= rows; i++) {
    addBox(g, w, 0.04, 0.42, M.shelfMetal, 0, (i / rows) * h, 0);
    for (let j = 0; j < 4; j++) {
      if ((i + j) % 3 === 0) continue;
      const mat = [M.cardboard, M.plasticBlue, M.plasticYellow, M.paintRed][(i + j) % 4];
      const bw = 0.14 + ((i * 7 + j * 3) % 5) * 0.04;
      addBox(g, bw, 0.2 + (j % 2) * 0.1, 0.24, mat, -w / 2 + 0.16 + j * (w - 0.3) / 3, (i / rows) * h + 0.13, 0);
    }
  }
  return g;
}

export function createBenchSeat() {
  const g = new THREE.Group();
  addBox(g, 1.4, 0.08, 0.42, M.wood, 0, 0.46, 0);
  addBox(g, 1.4, 0.5, 0.07, M.wood, 0, 0.7, -0.18);
  for (const x of [-0.6, 0.6]) {
    addBox(g, 0.07, 0.46, 0.4, M.darkMetal, x, 0.23, 0);
  }
  return g;
}

export function createJerryCan() {
  const g = new THREE.Group();
  addBox(g, 0.34, 0.44, 0.18, M.paintGreen, 0, 0.22, 0, { radius: 0.03 });
  addBox(g, 0.2, 0.06, 0.06, M.darkMetal, 0.06, 0.46, 0);
  addBox(g, 0.2, 0.04, 0.05, M.darkMetal, -0.06, 0.44, 0.08, { radius: 0.01 });
  addCylinder(g, 0.04, 0.04, 0.06, M.darkMetal, 0.12, 0.47, 0.04, { seg: 8 });
  addContact(g, 0, 0, 0.5, 0.4, 0.3, 0, 0.002);
  return g;
}

export function createBucket() {
  const g = new THREE.Group();
  addCylinder(g, 0.16, 0.13, 0.32, M.paintBlue, 0, 0.16, 0, { seg: 16 });
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.008, 6, 18, Math.PI), M.chromeRough);
  handle.position.y = 0.32; handle.rotation.z = 0.2; g.add(handle);
  addContact(g, 0, 0, 0.45, 0.45, 0.25, 0, 0.002);
  return g;
}

export function createTrashBin() {
  const g = new THREE.Group();
  addCylinder(g, 0.25, 0.23, 0.72, M.darkMetal, 0, 0.38, 0, { seg: 18 });
  addCylinder(g, 0.27, 0.27, 0.05, M.chromeRough, 0, 0.76, 0, { seg: 18 });
  addContact(g, 0, 0, 0.7, 0.7, 0.32, 0, 0.002);
  return g;
}

export function createSaguaro(height = 4.2, seed = 1) {
  const g = new THREE.Group();
  const r = mulberry32(seed);
  const trunkR = 0.22 + r() * 0.08;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(trunkR * 0.9, trunkR, height, 14, 24), M.cactus);
  trunk.position.y = height / 2; trunk.castShadow = true; trunk.receiveShadow = true;
  g.add(trunk);
  // rounded top
  const top = new THREE.Mesh(new THREE.SphereGeometry(trunkR * 0.9, 14, 10), M.cactus);
  top.position.y = height; top.scale.y = 1.2; top.castShadow = true; g.add(top);
  const arms = 1 + ((r() * 3) | 0);
  for (let i = 0; i < arms; i++) {
    const side = i % 2 ? 1 : -1;
    const ay = height * (0.42 + r() * 0.3);
    const len = 0.7 + r() * 0.8;
    const rad = trunkR * 0.55;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, len, 10), M.cactus);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(side * (trunkR + len / 2 - 0.03), ay, 0);
    arm.castShadow = true; g.add(arm);
    const elbow = new THREE.Mesh(new THREE.SphereGeometry(rad * 1.05, 10, 8), M.cactus);
    elbow.position.set(side * trunkR, ay, 0); g.add(elbow);
    const upLen = 0.9 + r() * 1.4;
    const up = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.92, rad, upLen, 10), M.cactus);
    up.position.set(side * (trunkR + len - 0.03), ay + upLen / 2, 0);
    up.castShadow = true; g.add(up);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(rad * 0.92, 10, 8), M.cactus);
    cap.position.set(side * (trunkR + len - 0.03), ay + upLen, 0); g.add(cap);
  }
  // ribs (thin vertical strips)
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, height * 0.96, 5), M.cactusDark);
    rib.position.set(Math.cos(a) * trunkR * 0.94, height / 2, Math.sin(a) * trunkR * 0.94);
    g.add(rib);
  }
  addContact(g, 0, 0, 1.3, 1.3, 0.4, 0, 0.002);
  return g;
}

export function createPricklyPear(scale = 1, seed = 3) {
  const g = new THREE.Group();
  const r = mulberry32(seed);
  const padGeo = new THREE.SphereGeometry(0.28, 12, 10);
  const pads = 8 + ((r() * 6) | 0);
  for (let i = 0; i < pads; i++) {
    const pad = new THREE.Mesh(padGeo, i % 3 ? M.cactus : M.cactusDark);
    const a = r() * 6.28, rad = r() * 0.55;
    pad.position.set(Math.cos(a) * rad, 0.28 + r() * 1.0, Math.sin(a) * rad);
    pad.scale.set(1, 1.35, 0.34);
    pad.rotation.set((r() - 0.5) * 0.5, r() * 3.14, (r() - 0.5) * 0.9);
    pad.castShadow = true; pad.receiveShadow = true;
    g.add(pad);
  }
  const flowerGeo = new THREE.SphereGeometry(0.05, 6, 5);
  for (let i = 0; i < 5; i++) {
    const f = new THREE.Mesh(flowerGeo, M.plasticYellow);
    f.position.set((r() - 0.5) * 1.2, 1.0 + r() * 0.7, (r() - 0.5) * 0.8);
    g.add(f);
  }
  g.scale.setScalar(scale);
  addContact(g, 0, 0, 1.5 * scale, 1.3 * scale, 0.35, 0, 0.002);
  return g;
}

export function createYucca(scale = 1) {
  const g = new THREE.Group();
  const planes = 3;
  for (let i = 0; i < planes; i++) {
    const p = addPlane(g, 1.9, 1.6, M.yucca, 0, 0.8, 0, { cast: false, receive: false });
    p.rotation.y = i * Math.PI / planes;
    p.material.side = THREE.DoubleSide;
  }
  g.scale.setScalar(scale);
  return g;
}

export function createGrassClump(scale = 1) {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const p = addPlane(g, 1.1, 0.75, M.grass, 0, 0.37, 0, { cast: false, receive: false });
    p.rotation.y = i * Math.PI / 3 + 0.2;
    p.material.side = THREE.DoubleSide;
  }
  g.scale.setScalar(scale);
  return g;
}

export function createTumbleweed(scale = 1) {
  const g = new THREE.Group();
  const r = mulberry32(51);
  const mat = new THREE.MeshStandardMaterial({ color: 0x8a6c42, roughness: 1, metalness: 0 });
  for (let i = 0; i < 46; i++) {
    const a = r() * 6.28, b = r() * 6.28;
    const rad = 0.3 + r() * 0.18;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(a) * rad, Math.sin(b) * rad * 0.8, Math.sin(a) * rad),
      new THREE.Vector3(Math.cos(a + 1) * rad * 0.7, Math.sin(b + 1) * rad, Math.sin(a + 1) * rad * 0.7),
      new THREE.Vector3(Math.cos(a + 2) * rad, Math.sin(b + 2) * rad * 0.7, Math.sin(a + 2) * rad),
    ]);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 5, 0.008, 3, false), mat);
    mesh.castShadow = true; g.add(mesh);
  }
  g.scale.setScalar(scale);
  return g;
}

// ---------------------------------------------------------------- vintage pickup
let plateTex = null;
function plateTexture() {
  if (plateTex) return plateTex;
  const c = makeCanvas(512, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#E9DDBF'; ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = '#3E6F86'; ctx.lineWidth = 14; ctx.strokeRect(14, 14, 484, 228);
  ctx.fillStyle = '#B44432'; ctx.textAlign = 'center';
  ctx.font = '78px "Bebas Neue", sans-serif';
  ctx.fillText('BIG EARL\'S', 256, 104);
  ctx.fillStyle = '#2A2722'; ctx.font = '92px "Alfa Slab One", serif';
  ctx.fillText('66', 256, 205);
  ctx.fillStyle = '#3E6F86'; ctx.font = '28px "Bebas Neue", sans-serif';
  ctx.fillText('ARIZONA', 256, 240);
  plateTex = makeTexture(c, { repeat: [1, 1] });
  return plateTex;
}

export function createPickup() {
  const g = new THREE.Group();
  g.name = 'pickup';

  const body = M.metalTeal.clone();
  body.color.setHex(0xb6d8ce);
  body.roughness = 0.4;
  body.clearcoat = 0.6;
  body.clearcoatRoughness = 0.25;
  body.envMapIntensity = 0.9;
  const bodyDark = body.clone();
  bodyDark.color.setHex(0x8fb9b0);
  const cream = M.paintCream.clone();
  cream.roughness = 0.42;
  cream.envMapIntensity = 0.6;
  const rust = M.rust.clone();
  rust.roughness = 0.9;
  const wood = M.wood;
  const glass = M.glass;

  // chassis + running boards
  addBox(g, 4.35, 0.2, 1.45, M.blackMetal, 0, 0.52, 0, { radius: 0.04 });
  addBox(g, 3.0, 0.12, 1.86, M.darkMetal, 0, 0.66, 0, { radius: 0.03 });
  for (const z of [-0.92, 0.92]) addBox(g, 1.6, 0.08, 0.28, M.chromeRough, 0.35, 0.72, z, { radius: 0.02 });
  // lower body
  addBox(g, 4.25, 0.5, 1.72, body, 0, 0.98, 0, { radius: 0.16, segs: 4 });
  // bed
  addBox(g, 1.95, 0.12, 1.72, wood, -1.42, 1.23, 0, { radius: 0.03 });
  for (const z of [-0.84, 0.84]) {
    addBox(g, 2.05, 0.5, 0.1, body, -1.42, 1.44, z, { radius: 0.03 });
    addBox(g, 2.05, 0.06, 0.1, M.chromeRough, -1.42, 1.7, z, { radius: 0.01 });
    for (let i = 0; i < 4; i++) addBox(g, 0.07, 0.03, 1.58, M.woodDark, -2.2 + i * 0.5, 1.31, 0, { cast: false });
  }
  addBox(g, 0.1, 0.52, 1.72, body, -2.4, 1.44, 0, { radius: 0.02 });
  const tail = new THREE.MeshStandardMaterial({ map: plateTexture(), roughness: 0.5, metalness: 0.05 });
  addPlane(g, 0.62, 0.3, tail, -2.455, 1.35, 0, { ry: -Math.PI / 2, cast: false });
  // cab
  addBox(g, 1.62, 0.92, 1.66, body, 0.5, 1.55, 0, { radius: 0.14, segs: 4 });
  addBox(g, 1.5, 0.09, 1.58, cream, 0.5, 2.01, 0, { radius: 0.05 });
  addBox(g, 1.6, 0.22, 1.7, cream, 0.5, 1.18, 0, { radius: 0.06, cast: false });
  addBox(g, 1.36, 0.52, 1.58, glass, 0.5, 1.66, 0, { radius: 0.05, segs: 3, cast: false });
  for (const z of [-0.84, 0.84]) {
    addBox(g, 0.08, 0.6, 0.08, bodyDark, -0.12, 1.66, z, { cast: false });
    addBox(g, 0.08, 0.6, 0.08, bodyDark, 1.12, 1.66, z, { cast: false });
  }
  addPlane(g, 1.45, 0.48, glass, 1.315, 1.68, 0, { ry: Math.PI / 2, rz: -0.16, cast: false });
  addPlane(g, 1.36, 0.42, glass, -0.315, 1.66, 0, { ry: -Math.PI / 2, rz: 0.1, cast: false });
  // hood + nose
  addBox(g, 1.55, 0.4, 1.66, body, 1.55, 1.26, 0, { radius: 0.12, segs: 4 });
  addBox(g, 0.25, 0.34, 1.5, bodyDark, 2.32, 1.08, 0, { radius: 0.06 });
  addBox(g, 0.09, 0.36, 1.1, M.chrome, 2.43, 1.05, 0, { radius: 0.02 });
  for (let i = 0; i < 5; i++) addBox(g, 0.03, 0.3, 0.04, M.darkMetal, 2.48, 1.05, -0.42 + i * 0.21, { cast: false });
  for (const z of [-0.62, 0.62]) {
    addCylinder(g, 0.13, 0.13, 0.08, M.chrome, 2.43, 1.18, z, { rx: Math.PI / 2, seg: 18 });
    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), new THREE.MeshStandardMaterial({
      color: 0xfff4dd, emissive: 0xffd9a1, emissiveIntensity: 0.35, roughness: 0.15, metalness: 0.1,
    }));
    lens.scale.set(0.5, 1, 1); lens.position.set(2.49, 1.18, z); g.add(lens);
  }
  // bumpers
  addBox(g, 0.12, 0.16, 1.98, M.chrome, 2.56, 0.82, 0, { radius: 0.04 });
  addBox(g, 0.12, 0.16, 1.98, M.chrome, -2.53, 0.82, 0, { radius: 0.04 });
  // wheel arches
  for (const x of [-1.35, 1.4]) for (const z of [-0.9, 0.9]) {
    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.15, 8, 16, Math.PI), body);
    arch.rotation.y = Math.PI / 2;
    arch.position.set(x, 0.86, z);
    arch.castShadow = true;
    g.add(arch);
  }
  // wheels
  for (const x of [-1.35, 1.4]) for (const z of [-0.88, 0.88]) {
    addCylinder(g, 0.38, 0.38, 0.26, M.rubber, x, 0.52, z, { rx: Math.PI / 2, seg: 22 });
    addCylinder(g, 0.24, 0.24, 0.28, M.chromeRough, x, 0.52, z, { rx: Math.PI / 2, seg: 18 });
    addCylinder(g, 0.1, 0.1, 0.3, M.chrome, x, 0.52, z, { rx: Math.PI / 2, seg: 12 });
    const white = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 6, 24), cream);
    white.position.set(x, 0.52, z + (z > 0 ? 0.14 : -0.14));
    g.add(white);
  }
  // mirrors, handles, door seams
  for (const z of [-0.87, 0.87]) {
    addBox(g, 0.03, 0.04, 0.22, M.chromeRough, 1.0, 1.45, z + (z > 0 ? 0.08 : -0.08), { cast: false });
    addBox(g, 0.14, 0.03, 0.04, M.chromeRough, 0.4, 1.36, z + (z > 0 ? 0.06 : -0.06), { cast: false });
    addBox(g, 0.02, 0.55, 0.01, M.darkMetal, 0.4, 1.42, z + (z > 0 ? 0.04 : -0.04), { cast: false });
  }
  // rust patches
  for (const z of [-0.87, 0.87]) {
    addBox(g, 1.8, 0.03, 0.02, rust, -0.5, 0.77, z + (z > 0 ? 0.02 : -0.02), { cast: false });
    addBox(g, 0.5, 0.02, 0.15, rust, -1.3, 0.76, z + (z > 0 ? 0.1 : -0.1), { cast: false });
  }
  // cargo
  const crate = createCrate(0.55);
  crate.position.set(-1.5, 1.3, 0.1); crate.rotation.y = 0.2; g.add(crate);
  const can = createJerryCan();
  can.position.set(-1.0, 1.3, -0.35); can.rotation.y = -0.3; g.add(can);
  addContact(g, 0, 0, 5.2, 2.3, 0.55, 0, 0.006);
  return g;
}
