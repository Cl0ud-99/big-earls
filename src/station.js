import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { M, matWithRepeat } from './materials.js';
import { addBox, addCylinder, addMesh, addPlane, addContact, tube } from './lib/build.js';
import { makeCanvas, makeTexture } from './textures.js';
import { surfaceTextures as T } from './textures.js';
import { mulberry32, lerp } from './lib/noise.js';
import {
  createPumpIsland, createTire, addTireStack, createBarrel, addBarrel, createCrate, addCrateStack,
  createCone, createCoke, createCompressor, createToolChest, createWorkbench, createShelf,
  createBenchSeat, createJerryCan, createBucket, createTrashBin, createPickup
} from './props.js';

RectAreaLightUniformsLib.init();

// ---------------------------------------------------------------- small canvas signs
function smallSign({ title, sub = '', bg = '#EFE4CC', fg = '#B44432', border = '#3E6F86', w = 512, h = 256, prohib = false, font = 'Bebas Neue' }) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = border; ctx.lineWidth = 10; ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const size = Math.min(110, 660 / Math.max(1, title.length * 0.62));
  ctx.font = `${size}px "${font}", sans-serif`;
  ctx.fillText(title, w / 2, sub ? h * 0.4 : h / 2);
  if (sub) {
    ctx.fillStyle = border;
    ctx.font = '34px "Bebas Neue", sans-serif';
    ctx.fillText(sub, w / 2, h * 0.72);
  }
  if (prohib) {
    ctx.strokeStyle = '#B44432'; ctx.lineWidth = 18;
    ctx.beginPath(); ctx.arc(w / 2, h * 0.46, h * 0.3, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w / 2 - h * 0.22, h * 0.24); ctx.lineTo(w / 2 + h * 0.22, h * 0.68); ctx.stroke();
  }
  // weathering
  const r = mulberry32(31);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(80,60,38,${0.02 + r() * 0.05})`;
    ctx.beginPath(); ctx.arc(r() * w, r() * h, 1 + r() * 6, 0, 7); ctx.fill();
  }
  return makeTexture(c, { repeat: [1, 1] });
}

function makeLamp() {
  const g = new THREE.Group();
  // wall plate
  addBox(g, 0.16, 0.16, 0.05, M.darkMetal, 0, 0.0, 0);
  tube([[0, 0, 0], [0, 0.1, 0.3], [0, 0.28, 0.55], [0, 0.34, 0.62]], 0.022, M.darkMetal, g, 18, 6);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.22, 0.22, 18, 1, true), M.paintTeal);
  shade.position.set(0, 0.26, 0.62); shade.rotation.x = 0.12; shade.castShadow = true;
  shade.material.side = THREE.DoubleSide;
  g.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.062, 12, 8), M.bulb);
  bulb.position.set(0, 0.17, 0.62);
  g.add(bulb);
  return g;
}

// ---------------------------------------------------------------- station
export function buildStation(scene) {
  const root = new THREE.Group();
  root.name = 'station';
  scene.add(root);

  const dynamicLights = [];
  const dynamicEmissive = [];
  const dynamicOpacity = [];
  const bulbPositions = [];
  const globeMats = [];
  const pumpGlows = [];
  const registerLight = (l, day, dusk) => { l.userData.night = { day, dusk }; dynamicLights.push(l); return l; };
  const registerEmissive = (mat, day, dusk) => { dynamicEmissive.push({ mat, day, dusk }); return mat; };
  const registerOpacity = (mat, day, dusk) => { dynamicOpacity.push({ mat, day, dusk }); return mat; };

  const wallMat = matWithRepeat(M.stucco, 3.4, 1.6);
  wallMat.color.setHex(0xd9c6a6);
  const wallSideMat = matWithRepeat(M.stucco, 3.0, 1.6);
  wallSideMat.color.setHex(0xcdbb9c);
  const wainscot = matWithRepeat(M.metalTeal, 4, 1);
  wainscot.color.setHex(0x9fbcb5);
  const roofMat = matWithRepeat(M.concrete, 4, 2);
  roofMat.color.setHex(0x7c7064);
  const canopyFascia = matWithRepeat(M.metalCream, 6, 1);
  const canopyStripe = matWithRepeat(M.metalMint, 6, 1);
  const canopyUnder = matWithRepeat(M.metalCream, 7, 3);
  const canopyUnderMat = canopyUnder.clone();
  canopyUnderMat.color.setHex(0xd9cdb6);
  canopyUnderMat.roughness = 0.72;

  const canopyLightMat = new THREE.MeshStandardMaterial({ color: 0xfff3dc, emissive: 0xffd9a4, emissiveIntensity: 0.35, roughness: 0.4, metalness: 0.05 });
  registerEmissive(canopyLightMat, 0.3, 3.6);

  // ---------------------------------------------------- foundation + building shell
  addBox(root, 18.2, 0.22, 8.1, M.concrete, 0, 0.06, -3.4, { radius: 0.04 });
  const H = 4.15, T0 = 0.3, cz = -0.15;
  // left pier / bay / center / bay / right pier
  addBox(root, 1.0, H, T0, wallMat, -8.0, H / 2, cz);
  addBox(root, 4.6, H - 3.35, T0, wallMat, -5.2, 3.35 + (H - 3.35) / 2, cz); // left lintel
  addBox(root, 5.2, H - 3.35, T0, wallMat, 4.9, 3.35 + (H - 3.35) / 2, cz); // right lintel
  addBox(root, 1.0, H, T0, wallMat, 8.0, H / 2, cz);
  // center wall around door + window
  addBox(root, 0.35, H, T0, wallMat, -2.725, H / 2, cz);
  addBox(root, 0.8, H - 2.3, T0, wallMat, -2.15, 2.3 + (H - 2.3) / 2, cz);
  addBox(root, 0.4, H, T0, wallMat, -1.55, H / 2, cz);
  addBox(root, 2.5, 1.15, T0, wallMat, -0.1, 1.15 / 2, cz);
  addBox(root, 2.5, H - 2.85, T0, wallMat, -0.1, 2.85 + (H - 2.85) / 2, cz);
  addBox(root, 1.15, H, T0, wallMat, 1.725, H / 2, cz);
  // side walls + back
  addBox(root, T0, H, 7.2, wallSideMat, -8.5, H / 2, -3.6);
  addBox(root, T0, H, 7.2, wallSideMat, 8.5, H / 2, -3.6);
  addBox(root, 17.0, H, 0.3, wallSideMat, 0, H / 2, -7.2);
  // parapet
  addBox(root, 17.2, 0.5, 0.2, wallMat, 0, 4.35, -7.15);
  addBox(root, 0.2, 0.5, 7.3, wallMat, -8.45, 4.35, -3.6);
  addBox(root, 0.2, 0.5, 7.3, wallMat, 8.45, 4.35, -3.6);
  addBox(root, 17.2, 0.12, 0.32, M.paintCream, 0, 4.62, -7.15);
  // wainscot bands
  for (const [x, w] of [[-8.0, 1.0], [-2.725, 0.35], [-1.55, 0.4], [1.725, 1.15], [8.0, 1.0]]) {
    addBox(root, w + 0.02, 0.62, 0.03, wainscot, x, 0.31, 0.01, { cast: false });
  }
  addBox(root, 0.03, 0.62, 7.2, wainscot, -8.66, 0.31, -3.6, { cast: false });
  addBox(root, 0.03, 0.62, 7.2, wainscot, 8.66, 0.31, -3.6, { cast: false });

  // ---------------------------------------------------- bay interiors
  function buildBay(x0, x1, premium = false) {
    const cx = (x0 + x1) / 2, w = x1 - x0;
    const d = 4.5;
    // floor / ceiling / walls
    addBox(root, w, 0.04, d, M.interiorFloor, cx, 0.04, -d / 2, { cast: false });
    addBox(root, w, 0.1, d, M.interiorDark, cx, 3.3, -d / 2, { cast: false });
    addBox(root, 0.16, 3.3, d, M.interiorWall, x0 + 0.08, 1.65, -d / 2, { cast: false });
    addBox(root, 0.16, 3.3, d, M.interiorWall, x1 - 0.08, 1.65, -d / 2, { cast: false });
    addBox(root, w, 3.3, 0.16, M.interiorWall, cx, 1.65, -d, { cast: false });
    // back room doorway
    addBox(root, 1.0, 2.15, 0.04, M.paintBlack, cx + (premium ? 0.7 : -0.6), 1.08, -d + 0.09, { cast: false });
    addBox(root, 0.82, 0.06, 0.05, M.paintCream, cx + (premium ? 0.7 : -0.6), 2.18, -d + 0.1, { cast: false });
    // roll-up door drum + tracks
    addCylinder(root, 0.16, 0.16, w - 0.3, M.corrugated, cx, 3.22, -0.28, { seg: 18, rz: Math.PI / 2 });
    for (const x of [x0 + 0.1, x1 - 0.1]) {
      addBox(root, 0.07, 3.3, 0.07, M.darkMetal, x, 1.65, -0.18);
    }
    // partial door
    if (premium) {
      addBox(root, w - 0.4, 0.8, 0.07, M.corrugated, cx, 2.85, -0.3);
      addBox(root, w - 0.4, 0.06, 0.1, M.darkMetal, cx, 2.45, -0.29);
    }
    // hanging shop lamp
    const lampY = 2.72;
    addBox(root, 0.02, 0.5, 0.02, M.darkMetal, cx, lampY + 0.3, -2.1);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.38, 0.24, 20, 1, true), M.paintTeal);
    shade.position.set(cx, lampY + 0.12, -2.1); shade.material.side = THREE.DoubleSide; root.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), M.bulb);
    bulb.position.set(cx, lampY - 0.01, -2.1); root.add(bulb);
    const pl = new THREE.PointLight(0xffc58a, 3.6, 8.5, 2);
    pl.position.set(cx, lampY - 0.05, -2.1);
    root.add(pl);
    registerLight(pl, 1.4, 5.2);
    // fluorescent tube
    addBox(root, 1.5, 0.05, 0.12, M.paintWhite, cx, 3.2, -1.3, { cast: false });
    const tubeMat = new THREE.MeshStandardMaterial({ color: 0xe8fff1, emissive: 0xbcffe0, emissiveIntensity: 1.4, roughness: 0.3 });
    addBox(root, 1.3, 0.02, 0.08, tubeMat, cx, 3.17, -1.3, { cast: false });
    registerEmissive(tubeMat, 1.0, 2.4);
    const cl = new THREE.PointLight(0xbff0d8, 1.2, 6, 2);
    cl.position.set(cx, 3.0, -1.2); root.add(cl);
    registerLight(cl, 0.6, 1.8);
    return { cx, w, d };
  }
  const bayL = buildBay(-7.5, -2.9, false);
  const bayR = buildBay(2.3, 7.5, true);

  // a customer's truck waiting on the lift, lit by the bay lamp
  const bayCar = createPickup();
  bayCar.scale.setScalar(0.62);
  bayCar.position.set(-5.2, 0.06, -2.05);
  bayCar.rotation.y = -Math.PI / 2;
  bayCar.name = 'bayCar';
  root.add(bayCar);

  // props in left bay
  const bench = createWorkbench();
  bench.position.set(-5.1, 0.07, -3.85);
  root.add(bench);
  const shelfL = createShelf(1.6, 1.8);
  shelfL.position.set(-6.9, 0.08, -3.9); shelfL.rotation.y = 0.06;
  root.add(shelfL);
  const chest = createToolChest();
  chest.position.set(-3.55, 0.07, -2.7); chest.rotation.y = 0.2;
  root.add(chest);
  addTireStack(root, -6.75, -1.15, 3, 1.0);
  addBarrel(root, -3.55, -3.6, M.plasticBlue);
  const crateL = addCrateStack(root, -4.1, -1.2, 0.2);
  const lampProp = createJerryCan(); lampProp.position.set(-6.8, 0.07, -2.5); lampProp.rotation.y = 0.7; root.add(lampProp);
  // right bay props
  addTireStack(root, 6.55, -1.25, 4, 1.0);
  addTireStack(root, 6.2, -2.7, 2, 0.9);
  const comp = createCompressor(); comp.position.set(3.4, 0.07, -3.4); comp.rotation.y = 0.3; root.add(comp);
  const shelfR = createShelf(1.8, 1.9); shelfR.position.set(5.2, 0.08, -4.2); shelfR.rotation.y = -0.03; root.add(shelfR);
  addBarrel(root, 3.2, -1.4, M.paintRed);
  const crateR = createCrate(0.66); crateR.position.set(4.2, 0.07, -2.1); crateR.rotation.y = 0.5; root.add(crateR);
  const crateR2 = createCrate(0.52); crateR2.position.set(4.5, 0.6, -2.05); crateR2.rotation.y = 0.15; root.add(crateR2);
  const bucket = createBucket(); bucket.position.set(6.9, 0.07, -3.7); root.add(bucket);

  // ---------------------------------------------------- office behind the window
  addBox(root, 5.1, 0.04, 2.4, M.interiorFloor, -0.25, 0.05, -1.25, { cast: false });
  addBox(root, 5.1, 0.08, 2.4, M.interiorDark, -0.25, 3.15, -1.25, { cast: false });
  addBox(root, 5.1, 3.2, 0.15, M.interiorWall, -0.25, 1.6, -2.4, { cast: false });
  addBox(root, 0.15, 3.2, 2.4, M.interiorWall, -2.8, 1.6, -1.2, { cast: false });
  addBox(root, 0.15, 3.2, 2.4, M.interiorWall, 2.3, 1.6, -1.2, { cast: false });
  // counter
  addBox(root, 2.1, 0.92, 0.55, M.woodDark, -0.5, 0.5, -1.55);
  addBox(root, 2.18, 0.06, 0.62, M.wood, -0.5, 0.99, -1.55);
  // register / coffee / bits
  addBox(root, 0.38, 0.24, 0.3, M.paintRed, -1.1, 1.14, -1.55);
  addBox(root, 0.34, 0.07, 0.24, M.chromeRough, -1.1, 1.29, -1.55);
  addCylinder(root, 0.09, 0.11, 0.26, M.blackMetal, 0.15, 1.16, -1.55, { seg: 12 });
  addBox(root, 0.56, 0.5, 0.42, M.paintWhite, 1.55, 0.36, -2.05);
  addBox(root, 0.5, 0.06, 0.36, M.chromeRough, 1.55, 0.64, -2.05);
  // shelves + boxes on back wall
  addBox(root, 2.3, 0.05, 0.28, M.wood, 0.7, 1.85, -2.29);
  for (let i = 0; i < 5; i++) {
    addBox(root, 0.22, 0.22 + (i % 2) * 0.1, 0.2, [M.cardboard, M.plasticBlue, M.paintRed, M.plasticYellow, M.paintCream][i], 0.0 + i * 0.32, 1.98 + (i % 2) * 0.1, -2.27);
  }
  // clock
  const clock = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 20), M.paintWhite);
  clock.rotation.x = Math.PI / 2; clock.position.set(-1.9, 2.55, -2.31); root.add(clock);
  addCylinder(root, 0.012, 0.012, 0.12, M.paintBlack, -1.9, 2.6, -2.28, { rx: Math.PI / 2, seg: 6 });
  const officeLight = new THREE.PointLight(0xffb87d, 4.2, 8, 2);
  officeLight.position.set(-0.2, 2.5, -1.6);
  root.add(officeLight);
  registerLight(officeLight, 1.8, 7.0);
  const officeGlow = new THREE.PointLight(0xffd2a1, 1.4, 4, 2);
  officeGlow.position.set(0.6, 1.8, -0.2);
  root.add(officeGlow);
  registerLight(officeGlow, 0.6, 2.2);

  // window + door
  // glass
  addPlane(root, 2.5, 1.7, M.glassWarm, -0.1, 2.0, -0.09, { cast: false });
  // frame
  const frameMat = M.metalTeal;
  for (const x of [-1.35, 1.15]) addBox(root, 0.09, 1.78, 0.12, frameMat, x, 2.0, 0.0);
  for (const y of [1.15, 2.85]) addBox(root, 2.58, 0.09, 0.12, frameMat, -0.1, y, 0.0);
  addBox(root, 0.06, 1.7, 0.1, frameMat, -0.1, 2.0, 0.0);
  addBox(root, 2.7, 0.1, 0.24, M.paintCream, -0.1, 1.1, 0.06);
  // blinds (partially raised)
  for (let i = 0; i < 7; i++) {
    addBox(root, 2.32, 0.022, 0.015, M.paintCream, -0.1, 2.38 + i * 0.068, -0.16, { cast: false });
  }
  // door
  addPlane(root, 0.8, 2.3, M.glassWarm, -2.15, 1.15, -0.1, { cast: false });
  for (const x of [-2.55, -1.75]) addBox(root, 0.08, 2.38, 0.14, frameMat, x, 1.19, 0.0);
  addBox(root, 0.88, 0.08, 0.14, frameMat, -2.15, 2.34, 0.0);
  addBox(root, 0.06, 1.9, 0.03, M.darkMetal, -1.83, 1.1, 0.06);
  addCylinder(root, 0.018, 0.018, 0.16, M.chrome, -1.34, 1.05, 0.08, { rx: Math.PI / 2, seg: 8 });
  addBox(root, 1.4, 0.13, 0.6, M.concrete, -2.15, 0.08, 0.24, { cast: true });
  addContact(root, -2.15, 0.4, 1.7, 0.8, 0.35, 0, 0.03);
  // window decal
  addPlane(root, 1.05, 0.26, M.windowDecal, -0.3, 1.3, 0.03, { cast: false, transparent: true });
  // OPEN neon
  const open = addPlane(root, 0.66, 0.31, M.neonOpen, 0.45, 2.3, 0.04, { cast: false });
  open.renderOrder = 3;
  registerOpacity(M.neonOpen, 0.45, 1.0);
  const openLight = new THREE.PointLight(0xff5a3a, 1.8, 4, 2);
  openLight.position.set(0.45, 2.3, 0.3); root.add(openLight);
  registerLight(openLight, 0.5, 1.4);
  // office hanging sign
  addBox(root, 0.02, 0.32, 0.02, M.darkMetal, -2.15, 2.6, 0.1);
  const officeSignTex = smallSign({ title: 'OFFICE', bg: '#3E6F86', fg: '#F3E8D0', border: '#E8B44C', w: 384, h: 192 });
  addPlane(root, 0.6, 0.3, new THREE.MeshStandardMaterial({ map: officeSignTex, roughness: 0.6 }), -2.15, 2.42, 0.12, { cast: false });

  // no smoking + pay here + posters
  const nsTex = smallSign({ title: 'NO SMOKING', bg: '#F1E7D1', fg: '#2A2722', border: '#B44432', w: 384, h: 256, prohib: true });
  addPlane(root, 0.5, 0.34, new THREE.MeshStandardMaterial({ map: nsTex, roughness: 0.7 }), 1.75, 2.25, 0.03, { cast: false });
  const payTex = smallSign({ title: 'PAY HERE', sub: 'CASH ONLY', bg: '#EFE4CC', fg: '#B44432', border: '#4D8B84', w: 512, h: 256 });
  addPlane(root, 0.58, 0.29, new THREE.MeshStandardMaterial({ map: payTex, roughness: 0.7 }), -1.0, 2.72, 0.03, { cast: false });
  addPlane(root, 0.55, 0.82, M.posterA, -8.02, 2.15, 0.02, { cast: false });
  addBox(root, 0.62, 0.9, 0.03, M.woodDark, -8.03, 2.15, -0.01, { cast: false });
  addPlane(root, 0.5, 0.75, M.posterB, 8.03, 2.5, 0.02, { cast: false });
  // wall lamp goosenecks
  for (const x of [-5.3, 5.3]) {
    const lamp = makeLamp();
    lamp.position.set(x, 3.55, 0.15);
    root.add(lamp);
    const spot = new THREE.SpotLight(0xffcf9c, 0, 9, Math.PI * 0.42, 0.6, 1.4);
    spot.position.set(x, 3.55, 0.7);
    spot.target.position.set(x, 1.4, 2.1);
    root.add(spot, spot.target);
    registerLight(spot, 0, 7.5);
  }
  // conduit / meter box
  addCylinder(root, 0.035, 0.035, 3.9, M.darkMetal, -8.32, 1.98, 0.02, { seg: 8 });
  addBox(root, 0.32, 0.42, 0.12, M.darkMetal, -8.2, 1.35, 0.04);
  addBox(root, 0.26, 0.34, 0.13, M.paintCream, -8.2, 1.35, 0.05);
  // air hose reel on the right pier
  addCylinder(root, 0.18, 0.18, 0.16, M.paintRed, 7.95, 1.9, 0.12, { rx: Math.PI / 2, seg: 18 });
  for (let i = 0; i < 4; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16 - i * 0.015, 0.024, 6, 20), M.rubber);
    ring.rotation.x = Math.PI / 2; ring.position.set(7.95, 1.9, 0.2 + i * 0.035); root.add(ring);
  }
  // trash can + cone
  const bin = createTrashBin(); bin.position.set(-8.85, 0.03, 2.2); root.add(bin);
  const cone = createCone(); cone.position.set(9.6, 0.03, 4.4); cone.rotation.y = 0.5; root.add(cone);

  // side details
  addBox(root, 0.1, 2.2, 1.1, M.paintTeal, 8.67, 1.2, -4.0);
  addPlane(root, 0.9, 1.9, M.glassWarm, 8.62, 1.5, -4.0, { ry: Math.PI / 2, cast: false });
  for (const z of [-4.55, -3.45]) addBox(root, 0.08, 2.3, 0.09, M.metalTeal, 8.62, 1.35, z);
  // propane tanks
  for (const [x, z, s] of [[-9.4, -2.2, 1], [-9.4, -1.4, 0.9]]) {
    addCylinder(root, 0.24 * s, 0.26 * s, 0.9 * s, M.paintWhite, x, 0.46 * s, z, { seg: 18 });
    addCylinder(root, 0.1, 0.1, 0.12 * s, M.darkMetal, x, 0.95 * s, z, { seg: 10 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.19 * s, 0.025, 6, 18), M.darkMetal);
    ring.rotation.x = Math.PI / 2; ring.position.set(x, 0.93 * s, z); root.add(ring);
    addContact(root, x, z, 0.8 * s, 0.8 * s, 0.35, 0, 0.03);
  }
  // ice chest + coke machine outside
  const coke = createCoke(); coke.position.set(9.45, 0.03, 0.3); coke.rotation.y = -Math.PI / 2 + 0.1; root.add(coke);
  addBox(root, 0.8, 0.55, 0.55, M.paintWhite, 9.35, 0.31, 1.35, { radius: 0.04 });
  addBox(root, 0.84, 0.12, 0.58, M.plasticBlue, 9.35, 0.63, 1.35, { radius: 0.03 });
  addContact(root, 9.35, 1.35, 1.0, 0.8, 0.35, 0, 0.03);
  // bench
  const benchSeat = createBenchSeat(); benchSeat.position.set(-8.4, 0.02, 3.6); benchSeat.rotation.y = Math.PI / 2; root.add(benchSeat);
  addContact(root, -8.4, 3.6, 0.7, 1.6, 0.32, 0, 0.03);

  // ---------------------------------------------------- canopy
  const canopy = new THREE.Group();
  root.add(canopy);
  addBox(canopy, 19.5, 0.18, 7.5, canopyFascia, 0, 4.93, 3.0);
  addBox(canopy, 19.4, 0.12, 7.3, canopyUnderMat, 0, 4.04, 3.0, { cast: false });
  // front fascia
  addBox(canopy, 19.5, 0.92, 0.25, canopyFascia, 0, 4.48, 6.58);
  addBox(canopy, 19.5, 0.16, 0.27, canopyStripe, 0, 4.3, 6.58);
  addBox(canopy, 19.5, 0.055, 0.28, M.chrome, 0, 4.16, 6.58);
  addBox(canopy, 19.5, 0.055, 0.28, M.chromeRough, 0, 4.91, 6.58);
  // riveted panel seams and a red pinstripe
  for (let i = 0; i < 10; i++) {
    const x = -8.775 + i * 1.95;
    addBox(canopy, 0.018, 0.98, 0.016, M.darkMetal, x, 4.48, 6.712, { cast: false, receive: false });
  }
  for (const y of [4.19, 4.79]) {
    for (let i = 0; i < 20; i++) {
      addCylinder(canopy, 0.034, 0.034, 0.02, M.chromeRough, -9.03 + i * 0.95, y, 6.716, { rx: Math.PI / 2, seg: 8, cast: false, receive: false });
    }
  }
  addBox(canopy, 19.5, 0.035, 0.018, M.paintRed, 0, 4.6, 6.714, { cast: false, receive: false });
  // side fascia
  for (const s of [-1, 1]) {
    addBox(canopy, 0.25, 0.92, 7.5, canopyFascia, s * 9.62, 4.48, 3.0);
    addBox(canopy, 0.27, 0.16, 7.5, canopyStripe, s * 9.62, 4.3, 3.0);
    addBox(canopy, 0.28, 0.055, 7.5, M.chrome, s * 9.62, 4.16, 3.0);
  }
  // underside beams
  for (const x of [-7.6, -4.6, -1.6, 1.6, 4.6, 7.6]) {
    addBox(canopy, 0.16, 0.17, 7.1, canopyFascia, x, 3.96, 3.0, { cast: false });
  }
  // light fixtures
  const fixturePositions = [];
  for (const x of [-6.6, -3.3, 0, 3.3, 6.6]) for (const z of [1.7, 4.6]) fixturePositions.push([x, z]);
  for (const [x, z] of fixturePositions) {
    addBox(canopy, 1.55, 0.08, 0.5, M.darkMetal, x, 3.95, z, { cast: false });
    addBox(canopy, 1.44, 0.035, 0.4, canopyLightMat, x, 3.89, z, { cast: false });
    const gp = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.8), M.bulbGlow.clone());
    gp.material.opacity = 0.12;
    gp.rotation.x = Math.PI / 2;
    gp.position.set(x, 3.87, z);
    canopy.add(gp);
  }
  // neon strip under fascia
  const neonStripMat = new THREE.MeshBasicMaterial({ color: 0xffd9a6, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  registerOpacity(neonStripMat, 0, 0.95);
  addBox(canopy, 18.9, 0.025, 0.025, neonStripMat, 0, 4.07, 6.44, { cast: false });
  for (const s of [-1, 1]) addBox(canopy, 0.025, 0.025, 7.1, neonStripMat, s * 9.47, 4.07, 3.0, { cast: false });
  // columns
  for (const s of [-1, 1]) {
    addBox(canopy, 0.8, 0.08, 0.8, M.darkMetal, s * 9.15, 0.08, 5.75);
    addBox(canopy, 0.44, 4.0, 0.44, M.metalTeal, s * 9.15, 2.08, 5.75, { radius: 0.02 });
    addBox(canopy, 0.62, 0.14, 0.62, M.metalTeal, s * 9.15, 3.99, 5.75);
    addBox(canopy, 0.7, 0.1, 0.7, M.darkMetal, s * 9.15, 0.02, 5.75);
    addContact(canopy, s * 9.15, 5.75, 1.35, 1.35, 0.42, 0, 0.03);
    // rust dribbles on the column
    addBox(canopy, 0.04, 0.8, 0.01, M.rust, s * 9.15 - 0.18, 2.9, 5.97, { cast: false });
  }
  // canopy underglow lights
  const rectColor = 0xffdcae;
  for (const x of [-5.2, -1.2, 2.6, 6.4]) {
    const rl = new THREE.RectAreaLight(rectColor, 2.0, 3.4, 0.7);
    rl.position.set(x, 3.84, 3.0);
    rl.rotation.x = -Math.PI / 2;
    canopy.add(rl);
    registerLight(rl, 0.6, 3.6);
  }
  // ATM sign on the left column
  const atmMat = M.atm;
  addBox(canopy, 0.52, 0.72, 0.07, M.paintTeal, -9.15, 2.65, 6.02);
  addPlane(canopy, 0.44, 0.63, atmMat, -9.15, 2.65, 6.065, { cast: false });
  // hanging air hose with a nozzle at the end
  tube([[-8.4, 4.0, 5.3], [-8.35, 3.2, 5.3], [-8.1, 2.6, 5.55], [-7.98, 2.1, 5.5]], 0.024, M.rubber, canopy, 24, 6);
  addBox(canopy, 0.1, 0.22, 0.16, M.chromeRough, -7.98, 1.98, 5.5, { radius: 0.02 });
  addCylinder(canopy, 0.03, 0.03, 0.16, M.darkMetal, -7.98, 1.84, 5.5, { seg: 8 });
  // small security light
  addBox(canopy, 0.18, 0.12, 0.18, M.darkMetal, -9.15, 3.6, 6.15);

  // canopy fill lights: warm pools on the pumps and columns
  for (const fx of [-5.0, 2.6]) {
    const fill = new THREE.PointLight(0xffd2a4, 7.0, 9.0, 2);
    fill.position.set(fx, 3.4, 5.1);
    root.add(fill);
    registerLight(fill, 1.2, 6.0);
  }

  // ---------------------------------------------------- pumps
  const island1 = createPumpIsland(-4.4, 4.3, 0);
  island1.position.set(-4.4, 0.03, 4.3);
  root.add(island1);
  const island2 = createPumpIsland(1.9, 4.3, 0);
  island2.position.set(1.9, 0.03, 4.3);
  root.add(island2);
  for (const isl of [island1, island2]) {
    for (const p of isl.userData.pumps) {
      globeMats.push(p.userData.globeMat);
      pumpGlows.push(p.userData.glow);
    }
  }
  addContact(root, -4.4, 4.3, 3.9, 2.1, 0.4, 0, 0.032);
  addContact(root, 1.9, 4.3, 3.9, 2.1, 0.4, 0, 0.032);

  // small island price sign
  const psTex = smallSign({ title: '24.9', sub: 'REGULAR', bg: '#EFE4CC', fg: '#B44432', border: '#4D8B84', w: 384, h: 384 });
  addBox(root, 0.06, 1.2, 0.06, M.darkMetal, -6.3, 0.75, 4.2);
  addBox(root, 0.55, 0.55, 0.06, M.paintCream, -6.3, 1.4, 4.2);
  addPlane(root, 0.48, 0.48, new THREE.MeshStandardMaterial({ map: psTex, roughness: 0.6 }), -6.3, 1.4, 4.24, { cast: false });

  // ---------------------------------------------------- roof clutter
  const roofY = 4.42;
  // AC unit
  addBox(root, 1.45, 0.8, 0.95, M.paintWhite, -3.2, roofY + 0.4, -4.2);
  for (let i = 0; i < 6; i++) addBox(root, 1.28, 0.02, 0.03, M.darkMetal, -3.2, roofY + 0.12 + i * 0.1, -3.72, { cast: false });
  const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.08, 18), M.darkMetal);
  fan.position.set(-3.2, roofY + 0.84, -4.2); root.add(fan);
  addContact(root, -3.2, -4.2, 1.8, 1.3, 0.35, 0, roofY + 0.02);
  // swamp cooler
  addBox(root, 1.0, 1.15, 0.85, M.paintWhite, 1.1, roofY + 0.58, -5.9);
  for (let i = 0; i < 5; i++) addBox(root, 0.88, 0.03, 0.02, M.paintTeal, 1.1, roofY + 0.2 + i * 0.12, -5.47, { cast: false });
  addBox(root, 1.1, 0.08, 0.95, M.paintTeal, 1.1, roofY + 1.2, -5.9);
  addCylinder(root, 0.18, 0.2, 0.5, M.rust, 1.1, roofY + 1.5, -5.9, { seg: 16 });
  addContact(root, 1.1, -5.9, 1.35, 1.2, 0.35, 0, roofY + 0.02);
  // vents
  for (const [x, z, h] of [[4.6, -3.8, 0.9], [5.4, -4.6, 0.6], [-6.1, -3.1, 1.1]]) {
    addCylinder(root, 0.12, 0.14, h, M.rust, x, roofY + h / 2, z, { seg: 14 });
    addCylinder(root, 0.22, 0.1, 0.12, M.rust, x, roofY + h + 0.06, z, { seg: 14 });
  }
  // satellite dish
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.62, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.32), M.paintWhite);
  dish.position.set(6.1, roofY + 0.9, -6.0);
  dish.rotation.set(0.7, -0.4, 0.1);
  dish.material.side = THREE.DoubleSide;
  dish.castShadow = true;
  root.add(dish);
  tube([[6.0, roofY + 0.6, -6.0], [6.0, roofY + 1.4, -6.1], [6.6, roofY + 1.1, -5.5]], 0.025, M.darkMetal, root, 16, 6);
  // antenna
  addCylinder(root, 0.028, 0.04, 2.2, M.darkMetal, 5.0, roofY + 1.1, -6.6, { seg: 8 });
  for (const y of [1.0, 1.4, 1.8]) addBox(root, 0.9, 0.02, 0.02, M.darkMetal, 5.0, roofY + y, -6.6);
  // roof clutter
  addTireStack(root, -7.0, -5.6, 2, 0.85);
  addBarrel(root, -6.4, -6.2, M.rust, { rot: 0.2 });
  addBarrel(root, 3.8, -6.3, M.plasticBlue, { rot: 0.7 });
  addCrateStack(root, 7.2, -5.2, 0.4);
  // ladder lying on the roof
  for (const z of [-6.9, -6.55]) addBox(root, 2.3, 0.05, 0.06, M.paintTeal, 2.8, roofY + 0.06, z);
  for (let i = 0; i < 7; i++) addBox(root, 0.05, 0.03, 0.38, M.paintTeal, 1.8 + i * 0.33, roofY + 0.09, -6.72);
  // roof tar patches
  const tarMat = new THREE.MeshBasicMaterial({ map: M.puddleAlpha, transparent: true, opacity: 0.28, color: 0x0f0d0b, depthWrite: false });
  for (const [x, z, s] of [[-1.5, -5.0, 2.2], [4.2, -4.4, 1.8], [-5.2, -4.0, 1.4]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(s, s * 0.6), tarMat);
    p.rotation.x = -Math.PI / 2; p.position.set(x, roofY + 0.01, z); root.add(p);
  }
  // cables from sign tower to roof
  for (const [x0, z0, x1, z1] of [[-5.0, 3.2, -6.0, -2.0], [4.8, 3.2, 6.2, -2.2]]) {
    tube([[x0, 8.2, z0], [(x0 + x1) / 2, 6.2, (z0 + z1) / 2], [x1, 4.5, z1]], 0.018, M.blackMetal, root, 22, 4);
  }

  // ---------------------------------------------------- roof sign tower
  const signGroup = new THREE.Group();
  signGroup.position.z = 2.8;
  root.add(signGroup);
  const steel = M.darkMetal;
  // posts
  for (const x of [-5.35, 5.35]) {
    addBox(signGroup, 0.16, 5.6, 0.16, steel, x, 7.7, 0.42);
    addBox(signGroup, 0.08, 3.2, 0.08, steel, x, 8.1, 0.9);
  }
  for (const y of [5.1, 6.05, 7.3, 8.3, 9.4, 10.3]) {
    addBox(signGroup, 10.8, 0.09, 0.09, steel, 0, y, 0.42);
  }
  // diagonal braces
  tube([[-5.3, 4.95, 0.4], [-4.4, 5.8, 0.42], [-5.3, 6.7, 0.42]], 0.035, steel, signGroup, 12, 5);
  tube([[5.3, 4.95, 0.4], [4.4, 5.8, 0.42], [5.3, 6.7, 0.42]], 0.035, steel, signGroup, 12, 5);
  // service board
  addBox(signGroup, 6.0, 3.3, 0.12, M.darkMetal, 0, 6.4, 0.7);
  addPlane(signGroup, 5.82, 3.16, M.signService, 0, 6.4, 0.765, { cast: false });
  for (const [w, h, x, y] of [[5.98, 0.07, 0, 8.01], [5.98, 0.07, 0, 4.79], [0.07, 3.24, -2.96, 6.4], [0.07, 3.24, 2.96, 6.4]]) {
    addBox(signGroup, w, h, 0.16, M.chromeRough, x, y, 0.72, { cast: false });
  }
  // script
  const scriptGlow = new THREE.Mesh(new THREE.PlaneGeometry(11.4, 4.5), M.signBigGlow.clone());
  scriptGlow.material.opacity = 0;
  scriptGlow.position.set(0, 9.15, 0.8);
  signGroup.add(scriptGlow);
  addPlane(signGroup, 11.2, 4.16, M.signBig, 0, 9.15, 0.92, { cast: false });
  // sign bulbs
  for (let x = -5.0; x <= 5.0; x += 0.55) {
    bulbPositions.push([x, 6.7, 1.0]);
    bulbPositions.push([x, 10.55, 0.9]);
  }
  for (let x = -2.8; x <= 2.8; x += 0.55) {
    bulbPositions.push([x, 4.86, 0.86]);
    bulbPositions.push([x, 7.94, 0.86]);
  }
  for (let y = 4.95; y <= 7.85; y += 0.55) {
    bulbPositions.push([-2.86, y, 0.86]);
    bulbPositions.push([2.86, y, 0.86]);
  }
  for (let x = -5.0; x <= 5.0; x += 0.5) bulbPositions.push([x, 10.55, 0.55]);
  // bulbs mesh
  const bulbGeo = new THREE.SphereGeometry(0.045, 8, 6);
  const bulbInst = new THREE.InstancedMesh(bulbGeo, M.bulb, bulbPositions.length);
  const dummy = new THREE.Object3D();
  bulbPositions.forEach(([x, y, z], i) => {
    dummy.position.set(x, y, z);
    dummy.updateMatrix();
    bulbInst.setMatrixAt(i, dummy.matrix);
  });
  bulbInst.castShadow = false;
  signGroup.add(bulbInst);
  // glow points
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.Float32BufferAttribute(bulbPositions.flat(), 3));
  const pMat = new THREE.PointsMaterial({
    map: T.glow, size: 0.52, color: 0xffc27a, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, toneMapped: false,
  });
  const points = new THREE.Points(pGeo, pMat);
  points.renderOrder = 4;
  signGroup.add(points);
  registerOpacity(pMat, 0, 0.85);
  registerOpacity(scriptGlow.material, 0, 0.32);
  // sign spot from canopy
  const signSpot = new THREE.SpotLight(0xffd09a, 0, 22, Math.PI * 0.3, 0.7, 1.3);
  signSpot.position.set(0, 5.15, 8.4);
  signSpot.target.position.set(0, 8.3, 5.1);
  root.add(signSpot, signSpot.target);
  registerLight(signSpot, 0, 30);
  // bird on the board
  const bird = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), M.paintBlack);
  body.scale.set(1.4, 1, 0.8); bird.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), M.paintBlack);
  head.position.set(0.19, 0.12, 0); bird.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 6), M.goldPaint);
  beak.rotation.z = -Math.PI / 2; beak.position.set(0.29, 0.11, 0); bird.add(beak);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.14), M.paintBlack);
  tail.position.set(-0.22, 0.02, 0); tail.rotation.z = 0.15; bird.add(tail);
  bird.position.set(4.7, 7.72, 0.84);
  bird.rotation.y = -0.4;
  bird.traverse(o => { if (o.isMesh) o.castShadow = true; });
  signGroup.add(bird);

  // ---------------------------------------------------- rear lean-to
  const shed = new THREE.Group();
  root.add(shed);
  addBox(shed, 6.4, 2.7, 0.22, M.stucco, 5.0, 1.35, -7.4);
  addBox(shed, 0.22, 2.7, 2.8, M.stucco, 1.85, 1.35, -8.8);
  addBox(shed, 0.22, 2.7, 2.8, M.stucco, 8.15, 1.35, -8.8);
  const shedRoof = addBox(shed, 6.6, 0.1, 3.0, M.corrugated, 5.0, 2.8, -8.8);
  shedRoof.rotation.x = -0.12;
  for (const [x, z] of [[2.1, -9.9], [7.9, -9.9]]) addBox(shed, 0.12, 2.5, 0.12, M.woodDark, x, 1.25, z);
  addTireStack(shed, 3.1, -8.6, 3, 0.9);
  addBarrel(shed, 7.2, -8.9, M.rust, { rot: 0.3 });
  addBarrel(shed, 6.6, -9.3, M.plasticBlue, { rot: 0.9 });
  addCrateStack(shed, 3.1, -9.2, 0.2);
  const shedBulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), M.bulb);
  shedBulb.position.set(5.0, 2.3, -8.7); shed.add(shedBulb);
  const shedLight = new THREE.PointLight(0xffbf86, 1.2, 5, 2);
  shedLight.position.set(5.0, 2.2, -8.7); shed.add(shedLight);
  registerLight(shedLight, 0.8, 2.4);

  // ---------------------------------------------------- night controller
  function setNight(n) {
    n = THREE.MathUtils.clamp(n, 0, 1);
    for (const l of dynamicLights) {
      const nd = l.userData.night;
      if (nd) l.intensity = lerp(nd.day, nd.dusk, n);
    }
    for (const e of dynamicEmissive) e.mat.emissiveIntensity = lerp(e.day, e.dusk, n);
    for (const o of dynamicOpacity) o.mat.opacity = lerp(o.day, o.dusk, n);
    for (const m of globeMats) m.emissiveIntensity = lerp(0.25, 2.6, n);
    for (const g of pumpGlows) g.material.opacity = lerp(0, 0.55, n);
    bulbInst.scale.setScalar(1);
    pMat.opacity = n * 0.85;
  }
  setNight(0);

  // small ambience: dust in the service bay lights? particles handled later
  return { root, setNight, bulbPositions, lights: dynamicLights };
}
