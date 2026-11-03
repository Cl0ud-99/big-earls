import * as THREE from 'three';
import { M } from './materials.js';
import { mulberry32, fbm2, smoothstep, lerp } from './lib/noise.js';

const WATER_VERT = /* glsl */`
uniform mat4 uTextureMatrix;
varying vec4 vRefl;
varying vec3 vWorld;
varying vec2 vUv;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vUv = uv;
  vRefl = uTextureMatrix * wp;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const WATER_FRAG = /* glsl */`
precision highp float;
uniform sampler2D uReflection;
uniform sampler2D uNormal;
uniform sampler2D uAlpha;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
uniform vec3 uSkyTint;
uniform float uTime;
uniform float uOpacity;
uniform float uRipple;
uniform float uAlphaCut;
uniform float uFoam;
uniform float uUseAlpha;
varying vec4 vRefl;
varying vec3 vWorld;
varying vec2 vUv;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }

void main(){
  vec3 V = normalize(cameraPosition - vWorld);
  vec2 uv1 = vUv * vec2(2.8, 4.6);
  vec2 uv2 = vUv * vec2(7.5, 11.0);
  vec3 n1 = texture2D(uNormal, uv1 + vec2(uTime * 0.015, uTime * 0.028)).rgb * 2.0 - 1.0;
  vec3 n2 = texture2D(uNormal, uv2 - vec2(uTime * 0.022, uTime * 0.012)).rgb * 2.0 - 1.0;
  vec2 dist = (n1.xy * 0.65 + n2.xy * 0.35) * uRipple;

  vec2 ruv = vRefl.xy / max(vRefl.w, 0.0001) + dist;
  vec3 refl = texture2D(uReflection, clamp(ruv, vec2(0.001), vec2(0.999))).rgb;

  float f = pow(1.0 - clamp(V.y, 0.0, 1.0), 3.0);
  float fres = clamp(0.2 + f * 0.82, 0.0, 0.9);
  vec3 base = mix(uDeep, uShallow, clamp(0.35 + n1.y * 0.25, 0.0, 1.0));
  vec3 col = mix(base, refl * uSkyTint, fres);

  // cheap rough reflection: soften the mirror with a small 4-tap blur
  vec2 blur = vec2(0.0016, 0.0012) + abs(dist) * 0.35;
  vec3 r2 = texture2D(uReflection, clamp(ruv + blur, vec2(0.001), vec2(0.999))).rgb;
  vec3 r3 = texture2D(uReflection, clamp(ruv - blur, vec2(0.001), vec2(0.999))).rgb;
  vec3 r4 = texture2D(uReflection, clamp(ruv + vec2(-blur.x, blur.y), vec2(0.001), vec2(0.999))).rgb;
  refl = mix(refl, (refl + r2 + r3 + r4) * 0.25, 0.45);
  col = mix(base, refl * uSkyTint, fres);

  vec3 N = normalize(vec3(dist.x * 3.0, 1.0, dist.y * 3.0));
  vec3 L = normalize(uSunDir);
  vec3 H = normalize(V + L);
  float spec = pow(max(dot(N, H), 0.0), 220.0) * 5.0;
  float broad = pow(max(dot(N, H), 0.0), 18.0) * 0.18;
  col += uSunColor * (spec + broad) * 1.4;

  // small foam / debris lines near the creek banks
  float bank = smoothstep(0.0, 0.055, vUv.y) * smoothstep(1.0, 0.945, vUv.y);
  float foamNoise = noise(vUv * vec2(28.0, 9.0) + vec2(uTime * 0.12, 0.0)) * 0.6 + 0.4;
  float foam = (1.0 - bank) * foamNoise * uFoam;
  col = mix(col, vec3(0.76, 0.69, 0.58), foam * 0.55);
  col += vec3(0.18, 0.09, 0.04) * pow(foam, 2.0) * 0.2;

  float alpha = uOpacity;
  if (uUseAlpha > 0.5) {
    float a = texture2D(uAlpha, vUv).a;
    alpha *= smoothstep(uAlphaCut, uAlphaCut + 0.28, a);
  }
  gl_FragColor = vec4(col, alpha);
}`;

function makeMaterial({ alpha = false, foam = 0, deep = '#1a2223', shallow = '#3a4038', opacity = 0.84, ripple = 0.018 }) {
  const m = new THREE.ShaderMaterial({
    vertexShader: WATER_VERT,
    fragmentShader: WATER_FRAG,
    uniforms: {
      uReflection: { value: null },
      uNormal: { value: M.puddleAlpha ? null : null },
      uAlpha: { value: M.puddleAlpha },
      uDeep: { value: new THREE.Color(deep) },
      uShallow: { value: new THREE.Color(shallow) },
      uSunColor: { value: new THREE.Color('#ffd2a0') },
      uSunDir: { value: new THREE.Vector3(-0.4, 0.33, 0.84) },
      uSkyTint: { value: new THREE.Color('#ffffff') },
      uTime: { value: 0 },
      uOpacity: { value: opacity },
      uRipple: { value: ripple },
      uAlphaCut: { value: 0.02 },
      uFoam: { value: foam },
      uUseAlpha: { value: alpha ? 1 : 0 },
      uTextureMatrix: { value: new THREE.Matrix4() },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  return m;
}

export class PlanarReflection {
  constructor(renderer, scene, height = 0.04) {
    this.renderer = renderer;
    this.scene = scene;
    this.height = height;
    this.rt = new THREE.WebGLRenderTarget(1024, 576, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
    });
    this.rt.texture.colorSpace = THREE.LinearSRGBColorSpace;
    this.rt.texture.generateMipmaps = false;
    this.camera = new THREE.PerspectiveCamera();
    this.textureMatrix = new THREE.Matrix4();
    this.reflectorPlane = new THREE.Plane();
    this.normal = new THREE.Vector3(0, 1, 0);
    this.reflectorWorldPosition = new THREE.Vector3(0, height, 0);
    this.cameraWorldPosition = new THREE.Vector3();
    this.rotationMatrix = new THREE.Matrix4();
    this.lookAtPosition = new THREE.Vector3(0, 0, -1);
    this.clipPlane = new THREE.Vector4();
    this.view = new THREE.Vector3();
    this.target = new THREE.Vector3();
    this.q = new THREE.Vector4();
    this.hidden = [];
    this.width = 1024; this.heightPx = 576;
    this._lastView = new THREE.Matrix4();
    this._lastProj = new THREE.Matrix4();
    this._hasFrame = false;
  }

  setSize(w, h) {
    const rw = Math.max(256, Math.min(1280, Math.round(w * 0.45)));
    const rh = Math.max(144, Math.min(720, Math.round(h * 0.45)));
    if (rw === this.width && rh === this.heightPx) return;
    this.width = rw; this.heightPx = rh;
    this.rt.setSize(rw, rh);
    this._hasFrame = false;
  }

  invalidate() {
    this._hasFrame = false;
  }

  update(camera, waterGroup, force = false) {
    // A perfectly still camera sees a perfectly still reflection: skip the
    // whole mirrored scene render until either the view or projection moves.
    camera.updateMatrixWorld();
    if (!force && this._hasFrame &&
        this._lastView.equals(camera.matrixWorld) &&
        this._lastProj.equals(camera.projectionMatrix)) return;
    this._lastView.copy(camera.matrixWorld);
    this._lastProj.copy(camera.projectionMatrix);
    this._hasFrame = true;

    const renderer = this.renderer, scene = this.scene;
    const rp = this.reflectorWorldPosition;
    const camPos = camera.getWorldPosition(this.cameraWorldPosition);
    this.view.subVectors(rp, camPos);
    if (this.view.dot(this.normal) > 0) return;
    this.view.reflect(this.normal).negate().add(rp);

    this.rotationMatrix.extractRotation(camera.matrixWorld);
    this.lookAtPosition.set(0, 0, -1).applyMatrix4(this.rotationMatrix).add(camPos);
    this.target.subVectors(rp, this.lookAtPosition).reflect(this.normal).negate().add(rp);

    const vc = this.camera;
    vc.position.copy(this.view);
    vc.up.set(0, 1, 0).applyMatrix4(this.rotationMatrix).reflect(this.normal);
    vc.lookAt(this.target);
    vc.far = camera.far;
    vc.near = camera.near;
    vc.updateMatrixWorld();
    vc.projectionMatrix.copy(camera.projectionMatrix);

    // texture matrix (world space -> reflection screen space)
    this.textureMatrix.set(
      0.5, 0.0, 0.0, 0.5,
      0.0, 0.5, 0.0, 0.5,
      0.0, 0.0, 0.5, 0.5,
      0.0, 0.0, 0.0, 1.0
    );
    this.textureMatrix.multiply(vc.projectionMatrix);
    this.textureMatrix.multiply(vc.matrixWorldInverse);

    // oblique near plane clipping
    this.reflectorPlane.setFromNormalAndCoplanarPoint(this.normal, rp);
    this.reflectorPlane.applyMatrix4(vc.matrixWorldInverse);
    const clip = this.clipPlane;
    clip.set(this.reflectorPlane.normal.x, this.reflectorPlane.normal.y, this.reflectorPlane.normal.z, this.reflectorPlane.constant);
    const pm = vc.projectionMatrix;
    const q = this.q;
    q.x = (Math.sign(clip.x) + pm.elements[8]) / pm.elements[0];
    q.y = (Math.sign(clip.y) + pm.elements[9]) / pm.elements[5];
    q.z = -1.0;
    q.w = (1.0 + pm.elements[10]) / pm.elements[14];
    clip.multiplyScalar(2.0 / clip.dot(q));
    pm.elements[2] = clip.x;
    pm.elements[6] = clip.y;
    pm.elements[10] = clip.z + 1.0 - 0.003;
    pm.elements[14] = clip.w;

    const wasVisible = waterGroup.visible;
    waterGroup.visible = false;
    const oldTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(this.rt);
    renderer.clear();
    renderer.render(scene, vc);
    renderer.setRenderTarget(oldTarget);
    waterGroup.visible = wasVisible;
  }
}

export function buildWater(scene, reflection, anchors) {
  const group = new THREE.Group();
  group.name = 'water';
  scene.add(group);

  const ringMat = makeMaterial({ alpha: true, opacity: 0.4, ripple: 0.01, deep: '#201b17', shallow: '#2b2923' });
  ringMat.uniforms.uNormal.value = M.waterNormalFine || M.waterNormal;
  const puddleMat = makeMaterial({ alpha: true, opacity: 0.82, ripple: 0.022, deep: '#1b211f', shallow: '#34352d' });
  puddleMat.uniforms.uNormal.value = M.waterNormalFine;
  puddleMat.uniforms.uAlphaCut.value = 0.0;
  puddleMat.uniforms.uOpacity.value = 0.88;

  const puddleGeo = new THREE.PlaneGeometry(1, 1);
  // Puddles and their wet rims are identical quads at different transforms.
  // One InstancedMesh each removes 8 draw calls from every scene pass.
  const rimInst = new THREE.InstancedMesh(puddleGeo, ringMat, anchors.length);
  const puddleInst = new THREE.InstancedMesh(puddleGeo, puddleMat, anchors.length);
  rimInst.renderOrder = 1;
  puddleInst.renderOrder = 3;
  rimInst.frustumCulled = false;
  puddleInst.frustumCulled = false;
  const pdummy = new THREE.Object3D();
  anchors.forEach((a, i) => {
    pdummy.position.set(a.x, 0.035, a.z);
    pdummy.rotation.set(-Math.PI / 2, 0, a.rot);
    pdummy.scale.set(a.rx * 2.35, a.rz * 2.35, 1);
    pdummy.updateMatrix();
    rimInst.setMatrixAt(i, pdummy.matrix);
    pdummy.position.y = 0.042;
    pdummy.scale.set(a.rx * 2, a.rz * 2, 1);
    pdummy.updateMatrix();
    puddleInst.setMatrixAt(i, pdummy.matrix);
  });
  group.add(rimInst, puddleInst);

  // ---------------------------------------------------- creek in the wash
  const creekMat = makeMaterial({ alpha: false, foam: 0.8, opacity: 0.92, ripple: 0.03, deep: '#2b2018', shallow: '#4a4534' });
  creekMat.uniforms.uNormal.value = M.waterNormal;
  creekMat.uniforms.uSunDir.value.set(-0.43, 0.28, 0.86).normalize();
  const N = 120, x0 = -34, x1 = 34;
  const pos = [], uv = [], idx = [];
  const r = mulberry32(11);
  const bankL = [], bankR = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = x0 + (x1 - x0) * t;
    const z = -14 + Math.sin(x * 0.055) * 1.9;
    const w = 2.1 + Math.sin(x * 0.17 + 1.4) * 0.55 + (fbm2(x * 0.12, 0.4, 3, 8) - 0.5) * 0.7;
    const y = -0.19;
    pos.push(x, y, z - w, x, y, z + w);
    uv.push(t * 6.5, 0, t * 6.5, 1);
    bankL.push([x, z - w]); bankR.push([x, z + w]);
  }
  for (let i = 0; i < N; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    idx.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const creek = new THREE.Mesh(geo, creekMat);
  creek.renderOrder = 3;
  group.add(creek);

  // dark creek bed just beneath the surface
  const bedMat = M.sand.clone();
  bedMat.color.setHex(0x5a4632);
  bedMat.roughness = 0.55;
  const bedPos = [], bedUv = [], bedIdx = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, x = x0 + (x1 - x0) * t;
    const z = -14 + Math.sin(x * 0.055) * 1.9;
    const w = 2.1 + Math.sin(x * 0.17 + 1.4) * 0.55 + (fbm2(x * 0.12, 0.4, 3, 8) - 0.5) * 0.7;
    bedPos.push(x, -0.33, z - w * 1.14, x, -0.33, z + w * 1.14);
    bedUv.push(t * 10, 0, t * 10, 1);
  }
  for (let i = 0; i < N; i++) { const a = i * 2; bedIdx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const bedGeo = new THREE.BufferGeometry();
  bedGeo.setAttribute('position', new THREE.Float32BufferAttribute(bedPos, 3));
  bedGeo.setAttribute('uv', new THREE.Float32BufferAttribute(bedUv, 2));
  bedGeo.setIndex(bedIdx);
  bedGeo.computeVertexNormals();
  group.add(new THREE.Mesh(bedGeo, bedMat));

  // wet bank strips
  const wetMat = M.sand.clone();
  wetMat.color.setHex(0x7c5a3d);
  wetMat.roughness = 0.6;
  for (const side of [-1, 1]) {
    const bp = [], bu = [], bi = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, x = x0 + (x1 - x0) * t;
      const z = -14 + Math.sin(x * 0.055) * 1.9;
      const w = 2.1 + Math.sin(x * 0.17 + 1.4) * 0.55 + (fbm2(x * 0.12, 0.4, 3, 8) - 0.5) * 0.7;
      bp.push(x, -0.23, z + side * w * 1.02, x, 0.012, z + side * (w * 1.02 + 1.5));
      bu.push(t * 10, 0, t * 10, 1);
    }
    for (let i = 0; i < N; i++) { const a = i * 2; bi.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3));
    bg.setAttribute('uv', new THREE.Float32BufferAttribute(bu, 2));
    bg.setIndex(bi); bg.computeVertexNormals();
    const bm = new THREE.Mesh(bg, wetMat);
    bm.receiveShadow = true;
    group.add(bm);
  }

  // creek stones — one instanced mesh instead of 26 individual draws
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x8b6550, roughness: 0.92, metalness: 0, envMapIntensity: 0.25 });
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, 26);
  const rdummy = new THREE.Object3D();
  for (let i = 0; i < 26; i++) {
    const x = x0 + r() * (x1 - x0);
    const z = -14 + Math.sin(x * 0.055) * 1.9 + (r() - 0.5) * 4.2;
    const s = 0.1 + Math.pow(r(), 2) * 0.45;
    rdummy.position.set(x, -0.24 + s * 0.3, z);
    rdummy.scale.set(1.2 * s, 0.7 * s, s);
    rdummy.rotation.set(r() * 3, r() * 3, r() * 3);
    rdummy.updateMatrix();
    rockInst.setMatrixAt(i, rdummy.matrix);
  }
  rockInst.castShadow = true;
  rockInst.receiveShadow = true;
  rockInst.frustumCulled = false;
  group.add(rockInst);

  const allMats = [puddleMat, ringMat, creekMat];
  const waterMeshes = [];
  group.traverse(o => { if (o.isMesh) waterMeshes.push(o); });

  function setTime(t) {
    const n = smoothstep(0.3, 0.85, t);
    for (const m of allMats) {
      m.uniforms.uSkyTint.value.setRGB(lerp(0.62, 1.0, n), lerp(0.58, 1.0, n), lerp(0.52, 1.0, n));
      m.uniforms.uOpacity.value = m === creekMat ? 0.92 : (m === ringMat ? 0.4 : 0.82);
    }
  }

  function update(dt, elapsed, camera) {
    for (const m of allMats) {
      m.uniforms.uTime.value = elapsed;
      if (reflection) {
        m.uniforms.uReflection.value = reflection.rt.texture;
        m.uniforms.uTextureMatrix.value.copy(reflection.textureMatrix);
      }
    }
    // hide transparent sorting issues: puddles render on top of the asphalt
  }

  return { group, update, setTime, materials: allMats };
}
