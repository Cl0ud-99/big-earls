import * as THREE from 'three';
import { M } from './materials.js';
import { tileFBM, fieldToCanvas, normalFromCanvas, mulberry32, fbm2, clamp, lerp, smoothstep } from './lib/noise.js';
import { makeCanvas, makeTexture } from './textures.js';
import { cloneRepeat } from './lib/texutil.js';

let rockDetail = null;
function makeRockDetail() {
  if (rockDetail) return rockDetail;
  const W = 1024, H = 1024;
  const base = tileFBM(W, H, { freqX: 4, freqY: 10, octaves: 6, seed: 5 });
  const fine = tileFBM(W, H, { freqX: 26, freqY: 40, octaves: 3, seed: 19 });
  const field = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) field[i] = clamp(base[i] * 0.7 + fine[i] * 0.3, 0, 1);
  const c = fieldToCanvas(field, W, H, [
    [0, '#8d7b6f'], [0.35, '#a89688'], [0.55, '#bcae9e'], [0.75, '#d0c3b1'], [1, '#e2d6c2']
  ]);
  const ctx = c.getContext('2d');
  const r = mulberry32(11);
  // horizontal strata
  for (let i = 0; i < 40; i++) {
    const y = r() * H;
    ctx.fillStyle = r() < 0.5 ? `rgba(80,58,44,${0.03 + r() * 0.07})` : `rgba(255,244,224,${0.03 + r() * 0.06})`;
    ctx.fillRect(0, y, W, 1 + r() * 9);
  }
  // vertical cracks / runoff
  for (let i = 0; i < 70; i++) {
    const x = r() * W, y = r() * H, len = 20 + r() * 160;
    ctx.strokeStyle = r() < 0.6 ? `rgba(60,42,32,${0.05 + r() * 0.12})` : `rgba(240,225,200,${0.03 + r() * 0.06})`;
    ctx.lineWidth = 0.6 + r() * 2.2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 16, y + len); ctx.stroke();
  }
  // pocks
  for (let i = 0; i < 240; i++) {
    const x = r() * W, y = r() * H, rad = 0.8 + r() * 5;
    ctx.fillStyle = `rgba(70,50,36,${0.08 + r() * 0.14})`;
    ctx.beginPath(); ctx.ellipse(x, y, rad, rad * 0.65, r() * 3, 0, 7); ctx.fill();
  }
  const nmap = normalFromCanvas(c, 1.2);
  rockDetail = {
    map: makeTexture(c, { repeat: [1, 1] }),
    normalMap: makeTexture(nmap, { srgb: false, repeat: [1, 1] }),
    rough: makeTexture(normalFromCanvas(c, 1.2), { srgb: false }),
  };
  rockDetail.map.colorSpace = THREE.NoColorSpace; // detail multiplier, not albedo
  return rockDetail;
}

const CLIFF_COLORS = ['#8e3527', '#a94830', '#bd5a3b', '#c96a44', '#d68256', '#b04a33', '#d99a6b', '#7e2f25'];

function cliffGeometry({
  seed = 1, rx = 18, rz = 12, height = 30, segments = 200, rings = 110,
  taper = 0.08, rough = 0.36, capStart = 0.9,
}) {
  const positions = [];
  const colors = [];
  const uvs = [];
  const indices = [];
  const col = new THREE.Color();
  const palette = CLIFF_COLORS.map(h => new THREE.Color(h));

  const radiusAt = (t, a) => {
    const tn = clamp(t, 0, 1);
    // wide talus base, near-vertical wall, stepped retreats
    let profile = 1 + 0.30 * Math.pow(1 - tn, 7) - taper * Math.pow(tn, 1.15);
    const steps = 6;
    const st = tn * steps;
    const sf = st - Math.floor(st);
    profile += 0.022 * smoothstep(0.14, 0.0, sf);
    profile -= 0.028 * (Math.floor(st) / steps);
    // angular buttresses + strong vertical erosion channels
    const broad = 0.11 * Math.sin(a * 2.0 + seed) + 0.065 * Math.sin(a * 3.0 - seed * 2.1) + 0.035 * Math.sin(a * 7.0 + seed * 0.7);
    const detail = (fbm2(Math.cos(a) * 2.3 + seed * 3, Math.sin(a) * 2.3 + seed * 1.2, 4, seed * 5) - 0.5) * 0.18;
    const v = (fbm2(Math.cos(a) * 5 + tn * 1.3 + seed, Math.sin(a) * 5 + tn * 2.1, 4, seed * 9 + 3) - 0.5) * 0.22;
    const channel = Math.pow(0.5 + 0.5 * Math.sin(a * 15.0 + seed * 3.1 + Math.sin(tn * 3.0 + seed) * 0.4), 8);
    const ridge = Math.pow(0.5 + 0.5 * Math.cos(a * 5.0 - seed * 1.7), 3);
    let r = profile * (1 + broad + detail * 0.55 + v * rough * 0.5 - channel * 0.085 + ridge * 0.045);
    // recessed ledge shadows / overhang
    r *= 1 + 0.035 * Math.exp(-Math.pow((tn - 0.42) / 0.10, 2));
    // stepped shelves
    const shelf = Math.floor(tn * height / 2.6);
    r *= 1 + (fbm2(shelf * 0.7, seed * 0.3, 2, seed + 7) - 0.5) * 0.03;
    // flat cap with a rounded rim
    const cap = 1 - 0.18 * smoothstep(0.955, 1.0, tn);
    r *= cap;
    return Math.max(0.03, r);
  };

  const rows = rings;
  for (let j = 0; j <= rows; j++) {
    const t = j / rows;
    const y = height * t;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const rmod = radiusAt(t, a);
      const x = Math.cos(a) * rx * rmod;
      const z = Math.sin(a) * rz * rmod;
      positions.push(x, y, z);
      uvs.push((i / segments) * 4.2, y / 7.2);

      // strata banding
      const warp = (fbm2(Math.cos(a) * 2.4 + seed, Math.sin(a) * 2.4 + seed, 3, seed + 4) - 0.5) * 2.2;
      const warp2 = (fbm2(Math.cos(a) * 7 + 3, Math.sin(a) * 7, 3, seed + 9) - 0.5) * 0.5;
      const bandT = y * 0.4 + warp + warp2 + t * 1.5;
      const bi = bandT - Math.floor(bandT);
      const bandIdx = n => ((n % palette.length) + palette.length) % palette.length;
      const c1 = palette[bandIdx((Math.abs(Math.floor(bandT * 2.0)) + (seed % 5)))];
      const c2 = palette[bandIdx((Math.floor(bandT * 2.0 + 1) + (seed % 5)))];
      col.copy(c1).lerp(c2, smoothstep(0.15, 0.85, bi));
      // pale caprock bands every so often
      const pale = Math.pow(Math.max(0, Math.sin(y * 0.29 + warp * 1.8 + seed)), 8);
      col.lerp(new THREE.Color('#d9ad87'), pale * 0.28);
      // vertical desert varnish streaks
      const streak = fbm2(a * 5.5 + seed * 2, y * 0.025, 3, seed * 3 + 1);
      if (streak > 0.58) col.multiplyScalar(lerp(1, 0.62, smoothstep(0.58, 0.78, streak)));
      // recessed regions are darker
      const cavity = smoothstep(0.35, 0.75, 1 - (rmod / 0.95));
      col.multiplyScalar(lerp(1, 0.82, cavity * 0.5));
      // sand accumulation near the base
      col.lerp(new THREE.Color('#c99a70'), smoothstep(2.6, 0.0, y) * 0.35);
      // slight top lightening
      col.multiplyScalar(lerp(0.94, 1.06, smoothstep(0.55, 1.0, t)));
      colors.push(col.r, col.g, col.b);
    }
  }

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < segments; i++) {
      const a = j * (segments + 1) + i;
      const b = a + 1;
      const c = a + segments + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  // top cap
  const capIndex = positions.length / 3;
  const topY = height * (1.0 + 0.012 * Math.sin(seed * 3.1));
  positions.push(0, topY, 0);
  uvs.push(0.5, height / 7.2);
  colors.push(...palette[2].clone().lerp(new THREE.Color('#e0b58e'), 0.35).toArray());
  for (let i = 0; i < segments; i++) {
    const a = rows * (segments + 1) + i;
    indices.push(a, capIndex, a + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

function cliffMaterial(seed) {
  const detail = makeRockDetail();
  const m = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: cloneRepeat(detail.map, 1.3, 1),
    normalMap: cloneRepeat(detail.normalMap, 2.2, 1.2),
    roughness: 0.94,    metalness: 0,
    envMapIntensity: 0.32,
    color: 0xffffff,
  });
  m.map.colorSpace = THREE.NoColorSpace;
  m.normalScale.set(1.9, 1.9);
  // Slight weathering grain & dust accumulation in shader
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying float vH;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvH = position.y;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying float vH;\nfloat rHash(vec3 p){ p=fract(p*0.3183099+vec3(0.1,0.2,0.3)); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }\nfloat rNoise(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f); float n=mix(mix(mix(rHash(i),rHash(i+vec3(1,0,0)),f.x),mix(rHash(i+vec3(0,1,0)),rHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(rHash(i+vec3(0,0,1)),rHash(i+vec3(1,0,1)),f.x),mix(rHash(i+vec3(0,1,1)),rHash(i+vec3(1,1,1)),f.x),f.y),f.z); return n; }')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float grain = rNoise(vWPos * 2.6) * 0.6 + rNoise(vWPos * 9.0) * 0.4;
        diffuseColor.rgb *= 0.88 + grain * 0.22;
        float warpN = rNoise(vWPos * 0.22 + 3.1);
        float strata = smoothstep(0.40, 0.5, abs(fract(vWPos.y * 0.72 + warpN * 0.62) - 0.5));
        diffuseColor.rgb *= 0.93 + strata * 0.10;
        float seam = smoothstep(0.0, 0.035, abs(fract(vWPos.y * 0.72 + warpN * 0.62) - 0.5));
        diffuseColor.rgb *= 1.0 - seam * 0.08;
        // dark vertical desert varnish in crevices
        float varnish = smoothstep(0.55, 0.95, rNoise(vec3(vWPos.x * 0.9, vWPos.y * 0.09, vWPos.z * 0.9)));
        diffuseColor.rgb *= 1.0 - varnish * 0.12 * smoothstep(2.0, 8.0, vWPos.y);
        // dusty, sandy base
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.43, 0.29), smoothstep(2.2, 0.0, vH) * 0.24);
        diffuseColor.rgb *= 0.96 + 0.08 * smoothstep(0.55, 1.0, vH / ${'${"height"}'.length ? '40.0' : '40.0'});
      `);
  };
  return m;
}

function talusGeometry(rx, rz, seed, height = 2.8) {
  const seg = 64, rings = 6;
  const pos = [], uv = [], col = [], idx = [];
  const c1 = new THREE.Color('#b9815e'), c2 = new THREE.Color('#8d563e');
  for (let j = 0; j <= rings; j++) {
    const t = j / rings;
    const y = -0.4 + height * t;
    const rad = 1.36 - 0.36 * t;
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const n = fbm2(Math.cos(a) * 2.2 + seed, Math.sin(a) * 2.2 + seed * 0.7, 3, seed);
      const rr = rad + (n - 0.5) * 0.15 + 0.035 * Math.sin(a * 9 + seed);
      pos.push(Math.cos(a) * rx * rr, y + (n - 0.5) * 0.3 * t, Math.sin(a) * rz * rr);
      uv.push((i / seg) * 3, t * 2);
      const c = c1.clone().lerp(c2, clamp(n * 0.9, 0, 1));
      col.push(c.r, c.g, c.b);
    }
  }
  for (let j = 0; j < rings; j++) {
    for (let i = 0; i < seg; i++) {
      const a = j * (seg + 1) + i;
      const b = a + 1, c = a + seg + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function buildCliffs(scene) {
  const group = new THREE.Group();
  group.name = 'cliffs';
  scene.add(group);

  const nearMat = cliffMaterial(1);
  const farMat = cliffMaterial(2);
  farMat.color.setHex(0xc7b1a2);
  farMat.envMapIntensity = 0.15;
  farMat.roughness = 1.0;

  const talusMat = new THREE.MeshStandardMaterial({
    map: cloneRepeat(makeRockDetail().map, 3, 3),
    normalMap: cloneRepeat(makeRockDetail().normalMap, 3, 3),
    normalScale: new THREE.Vector2(1.2, 1.2),
    vertexColors: true, roughness: 0.96, metalness: 0.0,
    color: 0xd7c2ab, envMapIntensity: 0.2,
  });

  const specs = [
    // near canyon wall, broken into distinct mesas with a low saddle behind the sign
    { x: -34, z: -36, rx: 22, rz: 18, h: 21, seed: 3, rot: 0.2 },
    { x: -16, z: -44, rx: 17, rz: 16, h: 17, seed: 8, rot: -0.1 },
    { x: 1.5, z: -48, rx: 18, rz: 17, h: 14, seed: 13, rot: 0.15 },
    { x: 20, z: -42, rx: 20, rz: 17, h: 21, seed: 18, rot: 0.35 },
    { x: 39, z: -33, rx: 19, rz: 18, h: 26, seed: 23, rot: 0.6 },
    // side walls
    { x: -45, z: -6, rx: 16, rz: 25, h: 28, seed: 27, rot: -0.15 },
    { x: -40, z: 24, rx: 15, rz: 19, h: 16, seed: 31, rot: 0.25, taper: 0.3 },
    { x: 43, z: -2, rx: 16, rz: 26, h: 31, seed: 37, rot: 0.1 },
    { x: 36, z: 22, rx: 17, rz: 16, h: 15, seed: 41, rot: -0.35 },
    // near right fin behind the billboard
    { x: 30, z: 10, rx: 7, rz: 12, h: 15, seed: 45, rot: 0.5 },
    // mid-ground spires
    { x: -25, z: -18, rx: 4.2, rz: 5, h: 17, seed: 49, rot: 0.2, taper: 0.2 },
    { x: 15, z: -22, rx: 3.6, rz: 5, h: 14, seed: 51, rot: 0.7, taper: 0.18 },
    // distant silhouettes (kept off-centre so the sign can silhouette against sky)
    { x: -68, z: -95, rx: 36, rz: 24, h: 38, seed: 61, rot: 0.4, distant: true },
    { x: 58, z: -105, rx: 40, rz: 28, h: 42, seed: 67, rot: -0.3, distant: true },
    { x: -8, z: -155, rx: 46, rz: 30, h: 44, seed: 71, rot: 0.1, distant: true },
    { x: 112, z: -45, rx: 30, rz: 30, h: 34, seed: 73, rot: 0.8, distant: true },
    // low foreground outcrop for framing (out of the sun path)
    { x: -33, z: 17, rx: 8, rz: 6, h: 4.2, seed: 81, rot: 0.3, taper: 0.4 },
  ];

  for (const s of specs) {
    const geo = cliffGeometry({
      seed: s.seed, rx: s.rx, rz: s.rz, height: s.h,
      segments: s.distant ? 96 : 200,
      rings: s.distant ? 48 : 110,
      taper: s.taper ?? 0.08,
      rough: 0.36,
    });
    const mat = s.distant ? farMat : nearMat;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(s.x, -0.45, s.z);
    mesh.rotation.y = s.rot;
    mesh.castShadow = !s.distant;
    mesh.receiveShadow = true;
    mesh.name = 'cliff';
    group.add(mesh);

    if (!s.distant) {
      const talus = new THREE.Mesh(talusGeometry(s.rx, s.rz, s.seed, Math.min(3.2, s.h * 0.24)), talusMat);
      talus.position.set(s.x, -0.45, s.z);
      talus.rotation.y = s.rot;
      talus.receiveShadow = true;
      talus.castShadow = false;
      talus.name = 'talus';
      group.add(talus);
    }
  }

  // ---------------------------------------------------- rocks at the bases
  const rockMat = new THREE.MeshStandardMaterial({
    map: cloneRepeat(makeRockDetail().map, 2, 2),
    normalMap: cloneRepeat(makeRockDetail().normalMap, 2, 2),
    roughness: 0.95, metalness: 0, color: 0xb86b4b, envMapIntensity: 0.25,
  });
  const rockGeos = [];
  for (let v = 0; v < 4; v++) {
    const base = new THREE.IcosahedronGeometry(1, 2);
    const p = base.attributes.position;
    const seed = 100 + v * 17;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = 0.75 + fbm2(x * 1.7 + seed, z * 1.7 + y, 3, seed) * 0.5;
      p.setXYZ(i, x * n * (1 + y * 0.15), y * n * 0.72, z * n);
    }
    base.computeVertexNormals();
    rockGeos.push(base);
  }
  const r = mulberry32(707);
  const positions = [];
  // cliff bases
  for (const s of specs.slice(0, 11)) {
    for (let k = 0; k < 7; k++) {
      const a = r() * Math.PI * 2;
      const rad = 0.85 + r() * 0.35;
      positions.push({
        x: s.x + Math.cos(a) * s.rx * rad,
        z: s.z + Math.sin(a) * s.rz * rad,
        s: 0.35 + Math.pow(r(), 2) * 2.6,
        rot: r() * 6.28,
      });
    }
  }
  // roadside scattered rocks
  for (let k = 0; k < 34; k++) {
    const x = -60 + r() * 120;
    const z = r() < 0.5 ? 10.5 + r() * 1.0 : 22.5 + r() * 5;
    if (Math.abs(x) < 16 && z < 15) continue;
    positions.push({ x, z, s: 0.12 + Math.pow(r(), 2.3) * 0.7, rot: r() * 6.28 });
  }
  const inst = new THREE.InstancedMesh(rockGeos[0], rockMat, positions.length);
  const d = new THREE.Object3D();
  positions.forEach((p, i) => {
    d.position.set(p.x, p.s * 0.3 - 0.03, p.z);
    d.rotation.set(r() * 0.4, p.rot, r() * 0.3);
    d.scale.set(p.s * (0.8 + r() * 0.6), p.s * (0.6 + r() * 0.7), p.s);
    d.updateMatrix();
    inst.setMatrixAt(i, d.matrix);
  });
  inst.castShadow = true; inst.receiveShadow = true;
  inst.name = 'rocks';
  group.add(inst);

  return group;
}
