import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { M } from './materials.js';
import { addBox, addCylinder, addMesh, addPlane, addContact, tube } from './lib/build.js';
import { createPricklyPear, createSaguaro, createYucca, createGrassClump, createTumbleweed, createTire, createBarrel, createPickup } from './props.js';
import { makeCanvas, makeTexture } from './textures.js';
import { mulberry32, lerp } from './lib/noise.js';

export function buildEnvironment(scene) {
  const root = new THREE.Group();
  root.name = 'environment';
  scene.add(root);  const nightLights = [];
  const nightMaterials = [];
  const registerLight = (l, day, dusk) => { l.userData.night = { day, dusk }; nightLights.push(l); return l; };
  const registerMat = (m, day, dusk, prop = 'emissiveIntensity') => { m.userData.night = { day, dusk, prop }; nightMaterials.push(m); return m; };

  // ---------------------------------------------------- tall gas pylon
  const pylon = new THREE.Group();
  pylon.position.set(-17.0, 0, 10.0);
  pylon.rotation.y = 0.28;
  pylon.scale.setScalar(0.82);
  root.add(pylon);
  addBox(pylon, 1.9, 0.32, 1.0, M.concrete, 0, 0.16, 0, { radius: 0.04 });
  addContact(pylon, 0, 0.2, 2.4, 1.4, 0.45, 0, 0.02);
  for (const x of [-0.62, 0.62]) {
    addCylinder(pylon, 0.085, 0.1, 6.0, M.darkMetal, x, 3.0, -0.12, { seg: 12 });
  }
  for (const y of [1.5, 3.2, 4.9]) addBox(pylon, 1.3, 0.08, 0.08, M.darkMetal, 0, y, -0.12);
  // dark backing gives the flat sign some thickness
  const back = new THREE.MeshStandardMaterial({ map: M.signPylon.map, alphaTest: 0.4, color: 0x33231a, roughness: 0.7, metalness: 0.2, side: THREE.DoubleSide });
  addPlane(pylon, 3.1, 7.05, back, 0, 5.4, -0.10, { cast: false });
  addPlane(pylon, 3.1, 7.05, M.signPylon, 0, 5.4, -0.03, { cast: false });
  // warm practical at the base
  const pylonLight = new THREE.PointLight(0xffb875, 0, 12, 2);
  pylonLight.position.set(0, 3.0, 1.2);
  pylon.add(pylonLight);
  registerLight(pylonLight, 0, 2.6);
  addBox(pylon, 0.35, 0.16, 0.22, M.darkMetal, 0.8, 0.14, 0.55);
  addBox(pylon, 0.12, 0.12, 0.1, M.bulb, 0.8, 0.24, 0.6, { cast: false });

  // ---------------------------------------------------- billboard
  const bb = new THREE.Group();
  bb.position.set(17.6, 0, 8.0);
  bb.rotation.y = -0.44;
  root.add(bb);
  // posts
  for (const x of [-2.4, 2.4]) {
    addBox(bb, 0.28, 4.6, 0.3, M.woodDark, x, 2.3, -0.22);
    addBox(bb, 0.55, 0.4, 0.55, M.concrete, x, 0.2, -0.22);
    addContact(bb, x, -0.15, 1.1, 1.0, 0.42, 0, 0.03);
  }
  // frame + board
  addBox(bb, 7.85, 4.05, 0.18, M.woodDark, 0, 4.35, -0.06);
  addPlane(bb, 7.6, 3.8, M.signBillboard, 0, 4.35, 0.045, { cast: false });
  // catwalk + rails
  addBox(bb, 8.1, 0.09, 0.6, M.darkMetal, 0, 2.15, 0.28);
  for (const x of [-3.8, 3.8]) addBox(bb, 0.07, 1.0, 0.07, M.darkMetal, x, 2.7, 0.52);
  addBox(bb, 7.7, 0.05, 0.05, M.darkMetal, 0, 3.15, 0.52);
  // lamps
  const lampTargets = [];
  for (const x of [-2.5, 2.5]) {
    addBox(bb, 0.12, 0.3, 0.12, M.darkMetal, x, 6.55, 0.1);
    tube([[x, 6.45, 0.1], [x, 6.9, 0.5], [x - Math.sign(x) * 0.25, 6.95, 1.0]], 0.025, M.darkMetal, bb, 12, 5);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.24, 0.2, 16, 1, true), M.darkMetal);
    shade.position.set(x - Math.sign(x) * 0.25, 6.82, 1.02); shade.rotation.x = 0.5;
    shade.material.side = THREE.DoubleSide; bb.add(shade);
    addMesh(bb, new THREE.SphereGeometry(0.075, 10, 7), M.bulb, { x: x - Math.sign(x) * 0.25, y: 6.7, z: 1.02, cast: false });
    const target = new THREE.Object3D();
    target.position.set(x * 0.2, 4.3, 0.1);
    bb.add(target);
    const sp = new THREE.SpotLight(0xffdcae, 0, 14, Math.PI * 0.37, 0.75, 1.4);
    sp.position.set(x - Math.sign(x) * 0.25, 6.75, 1.0);
    sp.target = target;
    bb.add(sp);
    registerLight(sp, 0, 55);
    lampTargets.push(sp);
  }
  // ladder
  for (const x of [3.05, 3.45]) addBox(bb, 0.05, 4.4, 0.05, M.darkMetal, x, 2.2, 0.45);
  for (let i = 0; i < 11; i++) addBox(bb, 0.44, 0.04, 0.04, M.darkMetal, 3.25, 0.55 + i * 0.38, 0.45);
  // small walkway light
  addBox(bb, 0.22, 0.1, 0.16, M.darkMetal, -3.4, 2.3, 0.7);
  addBox(bb, 0.1, 0.05, 0.1, M.bulb, -3.4, 2.25, 0.78, { cast: false });

  // pylon + billboard have no neon tubes; small distant sign light at dusk

  // ---------------------------------------------------- roadside route 66 shield
  const shield = new THREE.Group();
  shield.position.set(12.9, 0, 11.9);
  shield.rotation.y = -0.18;
  root.add(shield);
  addCylinder(shield, 0.045, 0.055, 2.45, M.darkMetal, 0, 1.22, 0, { seg: 10 });
  addPlane(shield, 0.78, 0.86, M.signRoute66, 0, 2.7, 0.02, { cast: false });
  addContact(shield, 0, 0, 0.4, 0.4, 0.3, 0, 0.02);
  addCylinder(shield, 0.03, 0.03, 1.0, M.paintCream, 0, 0.5, 0, { seg: 8 });

  // price sign
  const price = new THREE.Group();
  price.position.set(-8.7, 0, 11.5);
  price.rotation.y = 0.12;
  root.add(price);
  for (const x of [-0.46, 0.46]) addBox(price, 0.07, 1.7, 0.07, M.darkMetal, x, 0.85, 0);
  addBox(price, 1.18, 1.45, 0.08, M.paintCream, 0, 1.75, 0);
  addPlane(price, 1.1, 1.35, M.signPrice, 0, 1.75, 0.05, { cast: false });
  addContact(price, 0, 0, 1.2, 0.5, 0.3, 0, 0.02);

  // ---------------------------------------------------- power poles + wires
  const poleSpecs = [
    { x: -50, z: 26.8, h: 9.6, trans: false },
    { x: -22, z: 26.4, h: 9.2, trans: false },
    { x: 38, z: 26.8, h: 9.8, trans: true },
    { x: 62, z: 27.5, h: 9.3, trans: false },
  ];
  const poleTops = [];
  const poleMat = M.woodDark.clone();
  poleMat.transparent = true;
  poleMat.opacity = 1;
  poleMat.depthWrite = false;
  registerMat(poleMat, 1, 0, 'opacity');
  for (const p of poleSpecs) {
    addCylinder(root, 0.15, 0.21, p.h, poleMat, p.x, p.h / 2, p.z, { seg: 12 });
    addBox(root, 2.0, 0.12, 0.14, poleMat, p.x, p.h - 0.8, p.z);
    addBox(root, 1.1, 0.12, 0.14, poleMat, p.x, p.h - 1.55, p.z);
    for (const sx of [-0.75, 0, 0.75]) {
      addCylinder(root, 0.06, 0.07, 0.12, M.paintCream, p.x + sx, p.h - 0.68, p.z, { seg: 8 });
    }
    if (p.trans) {
      addCylinder(root, 0.32, 0.32, 0.9, M.darkMetal, p.x + 0.45, p.h - 2.05, p.z + 0.15, { seg: 16 });
      addCylinder(root, 0.1, 0.12, 0.1, M.paintWhite, p.x + 0.45, p.h - 1.55, p.z + 0.15, { seg: 8 });
    }
    addContact(root, p.x, p.z, 1.0, 1.0, 0.35, 0, 0.03);
    poleTops.push({ x: p.x, z: p.z, y: p.h - 0.68 });
  }
  // Overhead wires read as black bars when the camera looks into the night
  // sky, so they fade out with the light instead of cutting across meteors.
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x0a0806, fog: false, transparent: true, opacity: 1, depthWrite: false });
  registerMat(wireMat, 1, 0, 'opacity');
  for (let i = 0; i < poleTops.length - 1; i++) {
    const a = poleTops[i], b = poleTops[i + 1];
    for (const off of [-0.75, 0, 0.75]) {
      const mid = new THREE.Vector3((a.x + b.x) / 2, Math.min(a.y, b.y) - 0.9, (a.z + b.z) / 2);
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(a.x + off, a.y + 0.1, a.z),
        mid.clone().add(new THREE.Vector3(off, 0, 0)),
        new THREE.Vector3(b.x + off, b.y + 0.1, b.z)
      );
      const geo = new THREE.TubeGeometry(curve, 26, 0.018, 4, false);
      const m = new THREE.Mesh(geo, wireMat);
      root.add(m);
    }
  }
  // service drop to the station roof (removed; the long span crossed the camera path)

  // ---------------------------------------------------- vehicles
  const truck = createPickup();
  truck.position.set(-11.4, 0.03, 7.3);
  truck.rotation.y = 1.12;
  root.add(truck);

  // wind-blown tumbleweeds
  for (const [x, z, s, rot] of [[9.8, 12.6, 0.85, 0.3], [-14.6, 13.6, 0.55, 1.2]]) {
    const tw = createTumbleweed(s);
    tw.position.set(x, 0.3 * s, z);
    tw.rotation.y = rot;
    tw.rotation.z = 0.1;
    root.add(tw);
    addContact(root, x, z, 1.1 * s, 1.1 * s, 0.32, 0, 0.036);
  }

  // ---------------------------------------------------- vegetation
  const r = mulberry32(2024);
  function makeCrossGeo(w, h, count = 3) {
    const parts = [];
    for (let i = 0; i < count; i++) {
      const p = new THREE.PlaneGeometry(w, h);
      p.translate(0, h / 2, 0);
      p.rotateY(i * Math.PI / count + 0.15);
      parts.push(p);
    }
    return mergeGeometries(parts);
  }
  const grassGeo = makeCrossGeo(1.1, 0.8, 3);
  const grassMat = M.grass;
  const grassPositions = [];
  const avoid = (x, z) => {
    if (Math.abs(x) < 17 && z > -8 && z < 11.5) return false;
    if (Math.abs(z - 17.2) < 9) return false;
    if (x > 12 && x < 24 && z > 4 && z < 12) return false;
    if (x < -12 && x > -20 && z > 5 && z < 11) return false;
    return true;
  };
  for (let i = 0; i < 90; i++) {
    let x, z, tries = 0;
    do { x = (r() - 0.5) * 76; z = -22 + r() * 54; tries++; } while (!avoid(x, z) && tries < 30);
    if (!avoid(x, z)) continue;
    grassPositions.push({ x, z, s: 0.55 + r() * 1.1, rot: r() * 6.28, tint: 0.8 + r() * 0.3 });
  }
  // along the wash
  for (let x = -26; x <= 26; x += 1.6) {
    const z = -14 + Math.sin(x * 0.055) * 1.9 + (r() - 0.5) * 4;
    grassPositions.push({ x: x + (r() - 0.5) * 1.4, z, s: 0.5 + r() * 0.8, rot: r() * 6.28, tint: 0.75 + r() * 0.25 });
  }
  const grassInst = new THREE.InstancedMesh(grassGeo, grassMat, grassPositions.length);
  const d = new THREE.Object3D();
  grassPositions.forEach((p, i) => {
    d.position.set(p.x, -0.02, p.z);
    d.rotation.y = p.rot;
    d.scale.set(p.s, p.s * (0.85 + r() * 0.3), p.s);
    d.updateMatrix();
    grassInst.setMatrixAt(i, d.matrix);
    grassInst.setColorAt(i, new THREE.Color(0.82 + (p.tint - 0.8) * 0.4, 0.8 + p.tint * 0.1, 0.62 + p.tint * 0.1));
  });
  grassInst.castShadow = false; grassInst.receiveShadow = false;
  root.add(grassInst);

  // shrubs
  const shrubGeo = makeCrossGeo(1.5, 1.25, 3);
  const shrubs = [];
  for (let i = 0; i < 26; i++) {
    let x, z, tries = 0;
    do { x = (r() - 0.5) * 70; z = -20 + r() * 48; tries++; } while (!avoid(x, z) && tries < 30);
    if (!avoid(x, z)) continue;
    shrubs.push({ x, z, s: 0.5 + r() * 1.15, rot: r() * 6.28 });
  }
  const shrubInst = new THREE.InstancedMesh(shrubGeo, M.shrub, shrubs.length);
  shrubs.forEach((p, i) => {
    d.position.set(p.x, -0.01, p.z);
    d.rotation.y = p.rot;
    d.scale.setScalar(p.s);
    d.updateMatrix();
    shrubInst.setMatrixAt(i, d.matrix);
    shrubInst.setColorAt(i, new THREE.Color(0.86 + r() * 0.2, 0.9 + r() * 0.1, 0.82 + r() * 0.16));
  });
  shrubInst.castShadow = false; shrubInst.receiveShadow = false;
  root.add(shrubInst);

  // saguaros
  const s1 = createSaguaro(4.9, 13); s1.position.set(-26, -0.01, -5.2); s1.rotation.y = 0.7; root.add(s1);
  const s2 = createSaguaro(3.6, 27); s2.position.set(28.5, -0.01, -6.5); s2.rotation.y = -0.5; root.add(s2);
  const s3 = createSaguaro(2.9, 33); s3.position.set(-31, -0.01, 16.5); s3.rotation.y = 1.4; root.add(s3);

  // prickly pear
  const pp1 = createPricklyPear(1.35, 7); pp1.position.set(20.3, 0.0, 1.7); pp1.rotation.y = 0.3; root.add(pp1);
  const pp2 = createPricklyPear(0.8, 11); pp2.position.set(-18.9, 0.0, 5.1); root.add(pp2);
  const pp3 = createPricklyPear(0.65, 19); pp3.position.set(-23.4, 0.0, -7.6); root.add(pp3);

  // yucca near the buildings
  for (const [x, z, s, rot] of [[9.7, 7.4, 0.9, 0.4], [-10.7, 6.3, 0.75, 1.2], [13.5, 10.7, 0.6, 0.2]]) {
    const y = createYucca(s); y.position.set(x, 0, z); y.rotation.y = rot; root.add(y);
  }

  // tumbleweeds
  const tw = createTumbleweed(0.75); tw.position.set(13.4, 0.3, 13.3); tw.rotation.y = 0.4; root.add(tw);
  const tw2 = createTumbleweed(0.5); tw2.position.set(-9.4, 0.24, -9.4); root.add(tw2);

  // roadside debris
  const tire = createTire(0.37); tire.rotation.x = Math.PI / 2; tire.rotation.z = 0.4; tire.position.set(-11.9, 0.36, 6.2); root.add(tire);
  addContact(root, -11.9, 6.2, 0.9, 0.9, 0.32, 0, 0.02);
  addBox(root, 0.9, 0.12, 0.55, M.woodDark, 14.8, 0.09, 2.8, { rotation: 0.2 });

  // ---------------------------------------------------- birds
  const birds = new THREE.Group();
  birds.userData.noMerge = true;
  birds.visible = false;
  // keep the flock out of the scene and out of the static merge entirely
  birds.removeFromParent();
  const birdMat = new THREE.MeshBasicMaterial({ color: 0x14100e, side: THREE.DoubleSide, fog: false });
  const birdList = [];
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0, 0.8, 0.06, 0.12, 0.35, 0, -0.12,
  ], 3));
  wingGeo.computeVertexNormals();
  for (let i = 0; i < 6; i++) {
    const b = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), birdMat);
    body.scale.set(1.6, 0.55, 0.6); b.add(body);
    const wl = new THREE.Mesh(wingGeo, birdMat); wl.position.x = 0.05; wl.scale.x = -1; b.add(wl);
    const wr = new THREE.Mesh(wingGeo, birdMat); wr.position.x = 0.05; b.add(wr);
    b.userData = { wingL: wl, wingR: wr, phase: i * 1.37, radius: 24 + i * 4.2, speed: 0.012 + i * 0.002, height: 24 + i * 3.2, cx: -6 + i * 2, cz: -12 };
    b.scale.setScalar(0.82 + i * 0.08);
    birds.add(b);
    birdList.push(b);
  }

  // ---------------------------------------------------- night
  function setNight(n) {
    n = THREE.MathUtils.clamp(n, 0, 1);
    for (const l of nightLights) l.intensity = lerp(l.userData.night.day, l.userData.night.dusk, n);
    for (const m of nightMaterials) m[ m.userData.night.prop ] = lerp(m.userData.night.day, m.userData.night.dusk, n);
  }
  setNight(0);

  function update(dt, elapsed) {
    for (const b of birdList) {
      const u = b.userData;
      const a = u.phase + elapsed * u.speed;
      b.position.set(u.cx + Math.cos(a) * u.radius, u.height + Math.sin(a * 2.1) * 1.2, u.cz + Math.sin(a) * u.radius * 0.6);
      b.rotation.y = -a + Math.PI / 2;
      const flap = Math.sin(elapsed * 5.2 + u.phase) * 0.55;
      u.wingL.rotation.z = -0.12 + flap;
      u.wingR.rotation.z = 0.12 - flap;
    }
  }

  return { root, setNight, update };
}
