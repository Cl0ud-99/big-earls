import * as THREE from 'three';
import { M, matWithRepeat } from './materials.js';
import { fbm2, mulberry32, clamp, smoothstep } from './lib/noise.js';
import { makeCanvas, makeTexture } from './textures.js';

function paintCanvas() {
  const W = 512, H = 64;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  const r = mulberry32(9);
  ctx.fillStyle = 'rgba(238,228,206,1)';
  ctx.fillRect(0, 0, W, H);
  // chips / wear in alpha
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 190; i++) {
    ctx.globalAlpha = 0.15 + r() * 0.55;
    const x = r() * W, y = r() * H, rad = 1 + r() * 7;
    ctx.beginPath(); ctx.ellipse(x, y, rad, rad * (0.3 + r() * 0.7), r() * 3, 0, 7); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  // dirt
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(110,92,68,${0.04 + r() * 0.12})`;
    ctx.fillRect(r() * W, r() * H, 4 + r() * 30, 1 + r() * 5);
  }
  return makeTexture(c, { repeat: [1, 1] });
}

function makeTerrain() {
  const SIZE = 320, SEG = 220;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const r = mulberry32(88);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const dist = Math.hypot(x, z);
    const flatMask = smoothstep(24, 62, Math.max(Math.abs(x) - 2, Math.abs(z - 4) - 8));
    let h = -0.16;
    h += (fbm2(x * 0.035 + 10, z * 0.035 + 3, 5, 4) - 0.4) * 2.4 * flatMask;
    h += (fbm2(x * 0.13, z * 0.13, 3, 8) - 0.5) * 0.25 * flatMask;
    // shallow wash behind the station
    const washZ = -14 + Math.sin(x * 0.055) * 1.9;
    const wash = Math.exp(-Math.pow((z - washZ) / 3.3, 2));
    h -= wash * 0.55;
    // raise towards the cliffs far out
    h += smoothstep(45, 120, dist) * 2.0;
    pos.setY(i, h);
    // subtle colour variation
    const t = fbm2(x * 0.08, z * 0.08, 3, 21);
    const warm = 1 + (t - 0.5) * 0.16;
    colors[i * 3] = warm;
    colors[i * 3 + 1] = 1 + (t - 0.5) * 0.08;
    colors[i * 3 + 2] = 0.94 + (t - 0.5) * 0.06;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = M.sand.clone();
  mat.vertexColors = true;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.position.y = 0;
  mesh.name = 'terrain';
  return mesh;
}

export function buildGround(scene) {
  const g = new THREE.Group();
  g.name = 'ground';
  scene.add(g);

  g.add(makeTerrain());

  // ---------------------------------------------------- road
  const roadMat = matWithRepeat(M.asphalt, 34, 1.15);
  roadMat.color.setHex(0xc9c2b6);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(260, 9.4), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.005, 17.2);
  road.receiveShadow = true;
  g.add(road);

  // far shoulder / gravel strip
  const shoulderMat = matWithRepeat(M.concrete, 40, 1);
  shoulderMat.color.setHex(0x8f7f68);
  const shoulder = new THREE.Mesh(new THREE.PlaneGeometry(260, 2.0), shoulderMat);
  shoulder.rotation.x = -Math.PI / 2;
  shoulder.position.set(0, 0.004, 22.9);
  shoulder.receiveShadow = true;
  g.add(shoulder);
  const nearShoulder = shoulder.clone();
  nearShoulder.position.z = 11.75;
  nearShoulder.scale.set(1, 1, 0.55);
  g.add(nearShoulder);

  // ---------------------------------------------------- forecourt
  const foreMat = matWithRepeat(M.asphalt, 6.5, 2.4);
  foreMat.color.setHex(0xd8d0c2);
  foreMat.envMapIntensity = 0.7;
  const fore = new THREE.Mesh(new THREE.PlaneGeometry(37, 13.4), foreMat);
  fore.rotation.x = -Math.PI / 2;
  fore.position.set(0, 0.012, 5.2);
  fore.receiveShadow = true;
  g.add(fore);

  // concrete apron under the canopy
  const apronMat = matWithRepeat(M.concrete, 7, 2.6);
  apronMat.color.setHex(0xcbbda4);
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(23, 8.6), apronMat);
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(0, 0.022, 2.6);
  apron.receiveShadow = true;
  g.add(apron);
  // slight lip around the apron
  const lipMat = M.concrete;
  const lip = new THREE.Mesh(new THREE.BoxGeometry(23.2, 0.07, 8.8), lipMat);
  lip.position.set(0, 0.005, 2.6);
  lip.receiveShadow = true; lip.castShadow = true;
  g.add(lip);

  // driveway curb ramps
  for (const [x, z, w, d] of [[-12, 11.9, 12, 0.4], [11, 11.9, 12, 0.4]]) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), M.concrete);
    curb.position.set(x, 0.08, z);
    curb.castShadow = true; curb.receiveShadow = true;
    g.add(curb);
  }

  // ---------------------------------------------------- curbs
  const curbMat = matWithRepeat(M.concrete, 2, 1);
  curbMat.color.setHex(0xb6a68c);
  const curbGeo = new THREE.BoxGeometry(2.0, 0.19, 0.34);
  const curbXs = [];
  for (let x = -54; x <= 54; x += 2.05) {
    if (x > -7 && x < 7) continue;
    curbXs.push(x);
  }
  const curbInst = new THREE.InstancedMesh(curbGeo, curbMat, curbXs.length);
  const dummy = new THREE.Object3D();
  curbXs.forEach((x, i) => {
    dummy.position.set(x, 0.075, 12.45);
    dummy.rotation.y = (Math.random() - 0.5) * 0.006;
    dummy.updateMatrix();
    curbInst.setMatrixAt(i, dummy.matrix);
  });
  curbInst.castShadow = true; curbInst.receiveShadow = true;
  g.add(curbInst);

  // far sidewalk
  const walk = new THREE.Mesh(new THREE.BoxGeometry(120, 0.1, 2.3), matWithRepeat(M.concrete, 24, 1));
  walk.position.set(0, 0.05, 24.6);
  walk.receiveShadow = true; walk.castShadow = true;
  g.add(walk);

  // ---------------------------------------------------- road paint
  const paintTex = paintCanvas();
  const paintMat = new THREE.MeshStandardMaterial({
    map: paintTex, transparent: true, alphaTest: 0.14, roughness: 0.62, metalness: 0.02,
    envMapIntensity: 0.3, color: 0xe8dfc9, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  paintTex.wrapS = THREE.RepeatWrapping;

  const dashGeo = new THREE.PlaneGeometry(4.1, 0.155);
  for (let x = -125; x < 125; x += 9.4) {
    const dash = new THREE.Mesh(dashGeo, paintMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(x, 0.028, 17.2);
    dash.receiveShadow = true;
    g.add(dash);
  }
  // solid edge lines
  for (const z of [13.1, 21.3]) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(250, 0.13), paintMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, 0.027, z);
    g.add(line);
  }

  // faded forecourt parking lines
  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xcaa354, roughness: 0.7, metalness: 0.02, transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  for (const x of [-7.6, -2.8, 2.0, 6.8]) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 5.2), yellowMat);
    l.rotation.x = -Math.PI / 2;
    l.position.set(x, 0.029, 7.4);
    g.add(l);
  }
  // parking stop blocks
  for (const x of [-7.6, -2.8, 2.0, 6.8]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 0.24), M.concrete);
    b.position.set(x, 0.08, 10.0);
    b.castShadow = true; b.receiveShadow = true;
    g.add(b);
  }

  // ---------------------------------------------------- oil stains / patches
  const stainMat = new THREE.MeshBasicMaterial({
    map: M.puddleAlpha, transparent: true, opacity: 0.34, color: 0x131110,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
  });
  const stains = [
    [-4.6, 6.4, 2.6, 1.6, 0.3], [2.9, 5.6, 3.2, 1.3, -0.2], [1.4, 9.2, 1.8, 0.9, 0.8],
    [-9.2, 9.6, 2.2, 1.1, 0.1], [9.4, 3.4, 1.6, 1.0, 1.1], [-1.2, 3.0, 2.4, 1.2, -0.5],
  ];
  for (const [x, z, sx, sz, rot] of stains) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), stainMat);
    p.rotation.x = -Math.PI / 2;
    p.rotation.z = rot;
    p.position.set(x, 0.031, z);
    g.add(p);
  }

  // sand drift decals along the asphalt edges
  const driftMat = new THREE.MeshStandardMaterial({ map: M.puddleAlpha, transparent: true, opacity: 0.5, color: 0xc59667, roughness: 1, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
  const drifts = [[-16, 11.0, 9, 2, 0.1], [15.5, 10.6, 8, 1.8, -0.2], [-18, 2.5, 6, 3, 0.5], [17.5, 5.5, 6, 2.6, -0.4]];
  for (const [x, z, sx, sz, rot] of drifts) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), driftMat);
    p.rotation.x = -Math.PI / 2;
    p.rotation.z = rot;
    p.position.set(x, 0.026, z);
    g.add(p);
  }

  // tyre skid marks on the road
  const skidMat = new THREE.MeshBasicMaterial({ color: 0x171513, transparent: true, opacity: 0.32, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
  for (const [x, rot] of [[-22, 0.02], [-20.8, 0.02]]) {
    const sk = new THREE.Mesh(new THREE.PlaneGeometry(26, 0.22), skidMat);
    sk.rotation.x = -Math.PI / 2;
    sk.rotation.z = rot;
    sk.position.set(x, 0.03, 18.6);
    g.add(sk);
  }

  return {
    group: g,
    puddles: [
      { x: 6.3, z: 7.4, rx: 2.8, rz: 1.6, rot: 0.25, depth: 1.0 },
      { x: -6.0, z: 9.2, rx: 2.5, rz: 1.4, rot: -0.35, depth: 0.8 },
      { x: 0.6, z: 7.4, rx: 2.2, rz: 1.1, rot: 0.1, depth: 0.9 },
      { x: 11.6, z: 10.4, rx: 1.4, rz: 0.8, rot: 0.9, depth: 0.6 },
      { x: -13.2, z: 4.4, rx: 1.5, rz: 0.75, rot: -0.2, depth: 0.5 },
    ],
    wash: { z: -14, amp: 1.9 },
    road,
  };
}
