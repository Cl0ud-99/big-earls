import * as THREE from 'three';
import { surfaceTextures as T } from './textures.js';
import { mulberry32 } from './lib/noise.js';

export function buildAtmosphere(scene) {
  const COUNT = 460;
  const positions = new Float32Array(COUNT * 3);
  const base = new Float32Array(COUNT * 3);
  const phase = new Float32Array(COUNT);
  const amp = new Float32Array(COUNT);
  const r = mulberry32(4242);
  for (let i = 0; i < COUNT; i++) {
    const x = -30 + r() * 62;
    const y = 0.15 + Math.pow(r(), 1.6) * 9;
    const z = -14 + r() * 36;
    base[i * 3] = x; base[i * 3 + 1] = y; base[i * 3 + 2] = z;
    positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z;
    phase[i] = r() * 6.28;
    amp[i] = 0.1 + r() * 0.5;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    map: T.dust, color: 0xffd9ae, size: 0.16, sizeAttenuation: true,
    transparent: true, opacity: 0.38, depthWrite: false,
    blending: THREE.AdditiveBlending, alphaTest: 0.01, fog: true,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 5;
  scene.add(points);

  // a second, softer layer of larger motes for depth
  const COUNT2 = 90;
  const positions2 = new Float32Array(COUNT2 * 3);
  const base2 = new Float32Array(COUNT2 * 3);
  const phase2 = new Float32Array(COUNT2);
  for (let i = 0; i < COUNT2; i++) {
    const x = -26 + r() * 54;
    const y = 0.3 + Math.pow(r(), 2) * 5;
    const z = -8 + r() * 30;
    base2[i * 3] = x; base2[i * 3 + 1] = y; base2[i * 3 + 2] = z;
    positions2[i * 3] = x; positions2[i * 3 + 1] = y; positions2[i * 3 + 2] = z;
    phase2[i] = r() * 6.28;
  }
  const geo2 = new THREE.BufferGeometry();
  geo2.setAttribute('position', new THREE.BufferAttribute(positions2, 3));
  const mat2 = new THREE.PointsMaterial({
    map: T.dust, color: 0xffcf9c, size: 0.55, sizeAttenuation: true,
    transparent: true, opacity: 0.07, depthWrite: false,
    blending: THREE.AdditiveBlending, alphaTest: 0.01, fog: true,
  });
  const points2 = new THREE.Points(geo2, mat2);
  points2.frustumCulled = false;
  points2.renderOrder = 5;
  scene.add(points2);

  function update(dt, time) {
    const p = geo.attributes.position.array;
    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      const ph = phase[i];
      p[i3] = base[i3] + Math.sin(time * 0.14 + ph) * amp[i] * 2.2;
      p[i3 + 1] = base[i3 + 1] + Math.sin(time * 0.22 + ph * 1.7) * 0.45;
      p[i3 + 2] = base[i3 + 2] + Math.cos(time * 0.11 + ph) * amp[i] * 1.5;
    }
    geo.attributes.position.needsUpdate = true;
    const p2 = geo2.attributes.position.array;
    for (let i = 0; i < COUNT2; i++) {
      const i3 = i * 3;
      const ph = phase2[i];
      p2[i3] = base2[i3] + Math.sin(time * 0.06 + ph) * 1.6;
      p2[i3 + 1] = base2[i3 + 1] + Math.sin(time * 0.09 + ph) * 0.5;
      p2[i3 + 2] = base2[i3 + 2] + Math.cos(time * 0.05 + ph) * 1.2;
    }
    geo2.attributes.position.needsUpdate = true;
  }

  function setNight(n) {
    mat.opacity = 0.38 * (1 - n * 0.65);
    mat2.opacity = 0.07 * (1 - n * 0.6);
  }

  return { points, points2, update, setNight };
}
