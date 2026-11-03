import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Merge static meshes by material to cut draw calls in every scene pass
// (shadow, planar reflection, main render and GTAO's normal/depth prepass).
//
// Opaque meshes are merged as before. Static transparent decals (contact
// shadows, rust streaks, road paint, oil stains, cracks...) are also merged
// when they share a material and render order: they are depth-write-off
// coplanar overlays, so collapsing them does not change what is drawn, it
// only removes per-object submission overhead.
const MERGEABLE_TRANSPARENT = (mat) =>
  mat.transparent === true &&
  mat.depthWrite === false &&
  mat.blending === THREE.NormalBlending &&
  !mat.isMeshPhysicalMaterial &&      // keep glass panes independently sorted
  !mat.isShaderMaterial;

export function mergeStatic(scene, roots) {
  scene.updateMatrixWorld(true);
  const groups = new Map();
  const meshes = [];

  for (const root of roots) {
    root.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh) return;
      let p = o;
      while (p) {
        if (p.userData && p.userData.noMerge) return;
        p = p.parent;
      }
      const mat = o.material;
      if (!mat || Array.isArray(mat)) return;
      if (mat.isShaderMaterial) return;
      if (mat.transparent && !MERGEABLE_TRANSPARENT(mat)) return;
      const g = o.geometry;
      if (!g || !g.attributes.position || !g.attributes.normal || !g.attributes.uv) return;
      if (!g.attributes.color && mat.vertexColors) return;
      meshes.push(o);
    });
  }

  for (const o of meshes) {
    const g = o.geometry;
    const attrs = Object.keys(g.attributes).sort().join(',');
    // renderOrder is part of the key: transparent layers must keep their pass order.
    const key = [
      o.material.uuid,
      o.castShadow ? 1 : 0,
      o.receiveShadow ? 1 : 0,
      attrs,
      g.index ? 1 : 0,
      o.renderOrder || 0,
    ].join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o);
  }

  let before = 0, after = 0;
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    before += list.length;
    const geos = [];
    for (const o of list) {
      const g = o.geometry.clone();
      g.applyMatrix4(o.matrixWorld);
      geos.push(g);
    }
    let merged;
    try { merged = mergeGeometries(geos, false); } catch (e) { merged = null; }
    if (!merged) continue;
    merged.computeBoundingSphere();
    merged.computeBoundingBox();
    const m = new THREE.Mesh(merged, list[0].material);
    m.castShadow = list[0].castShadow;
    m.receiveShadow = list[0].receiveShadow;
    m.renderOrder = list[0].renderOrder || 0;
    m.name = 'merged:' + (list[0].material.name || list[0].material.type);
    m.matrixAutoUpdate = false;
    m.updateMatrix();
    scene.add(m);
    for (const o of list) {
      if (o.parent) o.parent.remove(o);
    }
    after++;
  }
  return { before, after, batches: after, meshes: meshes.length };
}
