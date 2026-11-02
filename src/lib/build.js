import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { M } from '../materials.js';

export function addMesh(parent, geo, mat, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, cast = true, receive = true, name = '' } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = cast;
  m.receiveShadow = receive;
  if (name) m.name = name;
  parent.add(m);
  return m;
}

export function addBox(parent, w, h, d, mat, x, y, z, opts = {}) {
  const geo = opts.radius ? new RoundedBoxGeometry(w, h, d, opts.segs ?? 3, opts.radius) : new THREE.BoxGeometry(w, h, d);
  return addMesh(parent, geo, mat, { ...opts, x, y, z });
}

export function addCylinder(parent, rt, rb, h, mat, x, y, z, opts = {}) {
  const geo = new THREE.CylinderGeometry(rt, rb, h, opts.seg ?? 20, opts.hseg ?? 1, opts.open ?? false);
  return addMesh(parent, geo, mat, { ...opts, x, y, z });
}

export function addPlane(parent, w, h, mat, x, y, z, opts = {}) {
  const geo = new THREE.PlaneGeometry(w, h, opts.wseg ?? 1, opts.hseg ?? 1);
  return addMesh(parent, geo, mat, { ...opts, x, y, z, cast: opts.cast ?? false });
}

export function addContact(parent, x, z, w, d, opacity = 0.45, rot = 0, y = 0.034) {
  const mat = M.contact.clone();
  mat.opacity = Math.min(0.85, opacity * 1.35);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.12, d * 1.12), mat);
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = rot;
  m.position.set(x, y, z);
  m.renderOrder = 2;
  parent.add(m);
  return m;
}

export function tube(points, radius, mat, parent, seg = 40, radial = 6) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const geo = new THREE.TubeGeometry(curve, seg, radius, radial, false);
  return addMesh(parent, geo, mat, {});
}

export function cylinderBetween(parent, a, b, radius, mat, seg = 10) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const dir = vb.clone().sub(va);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(radius, radius, len, seg);
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(va).add(vb).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function textPlane(parent, map, w, h, x, y, z, opts = {}) {
  const mat = opts.material ?? new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.05 });
  return addPlane(parent, w, h, mat, x, y, z, opts);
}

export function collectLights(group, out) {
  group.traverse(o => { if (o.isLight) out.push(o); });
}
