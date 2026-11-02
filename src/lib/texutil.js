import * as THREE from 'three';

// Clone a texture and give it an independent repeat. Keeps color space / wrap / filtering.
export function cloneRepeat(texture, rx, ry) {
  const t = texture.clone();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.needsUpdate = true;
  return t;
}
