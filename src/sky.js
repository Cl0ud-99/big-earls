import * as THREE from 'three';
import { lerp } from './lib/noise.js';
import { surfaceTextures as T } from './textures.js';

const SKY_VERT = /* glsl */`
varying vec3 vDir;
void main(){
  vDir = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
}`;

const SKY_FRAG = /* glsl */`
precision highp float;
varying vec3 vDir;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uHaze;
uniform vec3 uGround;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
uniform float uTime;
uniform float uSunPower;
uniform float uDusk;
uniform float uClouds;

float hash21(vec2 p){
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 13.7; a *= 0.5; }
  return v;
}

void main(){
  vec3 d = normalize(vDir);
  float y = d.y;
  float g = pow(clamp(y, 0.0, 1.0), 0.46);
  vec3 col = mix(uHorizon, uZenith, g);
  col = mix(col, uHaze, exp(-max(y, 0.0) * 16.0) * 0.62);

  float sd = max(dot(d, uSunDir), 0.0);
  float disk = pow(sd, 3200.0) * 34.0;
  float halo = pow(sd, 180.0) * 0.5;
  float glow = pow(sd, 5.0) * 0.12;
  col += uSunColor * (disk + halo + glow) * uSunPower;

  // broad warm horizon glow on the sun side
  vec2 dh = normalize(d.xz + vec2(1e-5));
  vec2 sh = normalize(uSunDir.xz + vec2(1e-5));
  float az = pow(max(dot(dh, sh), 0.0), 3.0);
  col += uSunColor * az * exp(-max(y, 0.0) * 9.0) * 0.10;

  // high cirrus
  if (y > 0.0) {
    vec2 uv = d.xz / (y + 0.25) * 0.52;
    uv.x += uTime * 0.004;
    float n = fbm(uv * 1.1 + vec2(1.3, 0.0));
    float n2 = fbm(uv * 3.2 + vec2(4.2, 1.7) - uTime * 0.0028);
    float c = smoothstep(0.32, 0.58, n * 0.75 + n2 * 0.25);
    c *= smoothstep(0.008, 0.045, y);
    c *= smoothstep(0.9, 0.10, y);
    c *= uClouds;
    vec3 cloudShade = mix(uHaze * 0.90, uZenith * 0.96, 0.30);
    vec3 cloudLit = mix(vec3(1.0, 0.97, 0.92), uSunColor, 0.35);
    vec3 cc = mix(cloudShade, cloudLit, pow(sd, 2.1) * 0.75 + 0.2);
    col = mix(col, cc, c * 0.90);
    // thin wind-swept cloud streaks
    float streak = smoothstep(0.62, 0.9, fbm(uv * vec2(0.55, 3.4) + vec2(-uTime * 0.002, 2.0)));
    col = mix(col, cloudLit * 0.96, streak * smoothstep(0.03, 0.18, y) * smoothstep(0.5, 0.15, y) * 0.18);
  }

  // faint stars late in the evening
  float starHash = hash21(floor(d.xz * 620.0) + vec2(floor(y * 220.0)));
  float star = smoothstep(0.997, 1.0, starHash);
  col += vec3(0.85, 0.9, 1.0) * star * smoothstep(0.12, 0.45, y) * smoothstep(0.55, 0.95, uDusk) * 1.6;

  col = mix(uGround, col, smoothstep(-0.075, 0.008, y));
  gl_FragColor = vec4(col, 1.0);
}`;

function hexVec(hex) { return new THREE.Color(hex); }

const PALETTES = [
  // golden hour
  {
    zenith: hexVec('#245FAF'), horizon: hexVec('#C9D7DF'), haze: hexVec('#FFD9AE'), ground: hexVec('#B77A52'),
    sun: hexVec('#FFD5A2'), light: hexVec('#FFD7AC'), hemiSky: hexVec('#8CB4E6'), hemiGround: hexVec('#C0855A'),
    fog: hexVec('#DCC7B5'), lightIntensity: 6.0, hemi: 0.25, sunPower: 1.0, clouds: 1.25,
  },
  // sunset
  {
    zenith: hexVec('#22376B'), horizon: hexVec('#D9A38F'), haze: hexVec('#FFB47C'), ground: hexVec('#7A4A39'),
    sun: hexVec('#FFB070'), light: hexVec('#FFA97A'), hemiSky: hexVec('#6378AC'), hemiGround: hexVec('#8C5138'),
    fog: hexVec('#CE8C6C'), lightIntensity: 3.4, hemi: 0.26, sunPower: 0.95, clouds: 0.95,
  },
  // dusk / blue hour
  {
    zenith: hexVec('#0E1A3E'), horizon: hexVec('#C06C61'), haze: hexVec('#E78B68'), ground: hexVec('#2A1C22'),
    sun: hexVec('#FF8C52'), light: hexVec('#FF8A55'), hemiSky: hexVec('#3F4F7A'), hemiGround: hexVec('#3B2622'),
    fog: hexVec('#6E4C5E'), lightIntensity: 0.25, hemi: 0.22, sunPower: 0.5, clouds: 0.8,
  },
];

function lerpPalette(a, b, t) {
  const out = {};
  for (const k of Object.keys(a)) {
    if (a[k] instanceof THREE.Color) out[k] = a[k].clone().lerp(b[k], t);
    else out[k] = lerp(a[k], b[k], t);
  }
  return out;
}

export class SkySystem {
  constructor(renderer, scene) {
    this.renderer = renderer;
    this.scene = scene;
    this.time = 0;
    this.lastEnvTime = -99;
    this.envDirty = true;
    this.baseTime = 0;

    const geo = new THREE.SphereGeometry(600, 64, 40);
    this.uniforms = {
      uZenith: { value: new THREE.Color('#2F6DBC') },
      uHorizon: { value: new THREE.Color('#F3CFA4') },
      uHaze: { value: new THREE.Color('#FFDDB4') },
      uGround: { value: new THREE.Color('#BE8157') },
      uSunColor: { value: new THREE.Color('#FFD6A0') },
      uSunDir: { value: new THREE.Vector3(0.61, 0.41, 0.69).normalize() },
      uTime: { value: 0 },
      uSunPower: { value: 1 },
      uDusk: { value: 0 },
      uClouds: { value: 0.9 },
    };
    this.mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.renderOrder = -1000;
    this.mesh.frustumCulled = false;
    this.mesh.name = 'sky';
    scene.add(this.mesh);

    // drifting cloud cards above the canyon
    this.cloudMats = [];
    const cloudDefs = [
      { x: -58, y: 112, z: -226, sx: 118, sy: 36, op: 0.4, rot: 0.06 },
      { x: 64, y: 132, z: -246, sx: 104, sy: 32, op: 0.32, rot: -0.05 },
      { x: -6, y: 152, z: -266, sx: 140, sy: 40, op: 0.22, rot: 0.02 },
      { x: 126, y: 102, z: -210, sx: 78, sy: 24, op: 0.22, rot: 0.1 },
    ];
    for (const d of cloudDefs) {
      const mat = new THREE.SpriteMaterial({
        map: T.cloud, transparent: true, opacity: d.op, depthWrite: false,
        color: 0xffe9d6, fog: false, rotation: d.rot,
      });
      const sp = new THREE.Sprite(mat);
      sp.position.set(d.x, d.y, d.z);
      sp.scale.set(d.sx, d.sy, 1);
      sp.renderOrder = -900;
      sp.userData.baseOpacity = d.op;
      this.cloudMats.push({ mat, base: d.op });
      // sprite cards are kept disabled: the shader cloud layer handles the sky
      // scene.add(sp);
    }
    // a pale moon that only shows once the sun is down
    const moonMat = new THREE.SpriteMaterial({
      map: T.glow, transparent: true, opacity: 0, depthWrite: false,
      color: 0xdfe9ff, fog: false, blending: THREE.AdditiveBlending,
    });
    this.moon = new THREE.Sprite(moonMat);
    this.moon.position.set(-150, 178, -252);
    this.moon.scale.set(18, 18, 1);
    this.moon.renderOrder = -950;
    // the old glow sprite showed up as a dark square at dusk on some GPUs
    this.moon.visible = false;

    // environment scene (same shader, no fog)
    this.envScene = new THREE.Scene();
    this.envMesh = new THREE.Mesh(new THREE.SphereGeometry(500, 48, 32), this.mat);
    this.envMesh.frustumCulled = false;
    this.envScene.add(this.envMesh);
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.pmrem.compileEquirectangularShader();
    this.envRT = null;

    // sun
    this.sun = new THREE.DirectionalLight(0xffd0a2, 4.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    this.sun.shadow.camera.left = -52;
    this.sun.shadow.camera.right = 52;
    this.sun.shadow.camera.top = 48;
    this.sun.shadow.camera.bottom = -34;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 200;
    this.sun.shadow.bias = -0.00012;
    this.sun.shadow.normalBias = 0.03;
    this.sun.shadow.radius = 1.2;
    this.sun.target.position.set(0, 0, 0);
    scene.add(this.sun, this.sun.target);

    this.hemi = new THREE.HemisphereLight(0x8cb4e6, 0xa86844, 0.24);
    scene.add(this.hemi);

    // warm bounce off the forecourt into the shaded facade
    this.fill = new THREE.DirectionalLight(0xffc39a, 0.24);
    this.fill.position.set(18, 5, 34);
    this.fill.castShadow = false;
    scene.add(this.fill);

    // cool sky rim from behind the station
    this.rim = new THREE.DirectionalLight(0x9dbdf0, 0.24);
    this.rim.position.set(-12, 14, -40);
    this.rim.castShadow = false;
    scene.add(this.rim);

    this.sunDir = this.uniforms.uSunDir.value.clone();
    scene.fog = new THREE.FogExp2(0xdcc7b5, 0.0085);

    this.apply(0, true);
  }

  setTime(t) {
    t = THREE.MathUtils.clamp(t, 0, 1);
    if (Math.abs(t - this.time) < 0.0005) return;
    this.time = t;
    this.apply(t, false);
  }

  apply(t, force) {
    const a = PALETTES[0], b = PALETTES[1], c = PALETTES[2];
    let p;
    if (t < 0.55) p = lerpPalette(a, b, THREE.MathUtils.smoothstep(t, 0, 0.55));
    else p = lerpPalette(b, c, THREE.MathUtils.smoothstep(t, 0.55, 1));

    const u = this.uniforms;
    u.uZenith.value.copy(p.zenith);
    u.uHorizon.value.copy(p.horizon);
    u.uHaze.value.copy(p.haze);
    u.uGround.value.copy(p.ground);
    u.uSunColor.value.copy(p.sun);
    u.uSunPower.value = p.sunPower;
    u.uDusk.value = THREE.MathUtils.smoothstep(t, 0.5, 0.95);
    u.uClouds.value = p.clouds;

    const dir = new THREE.Vector3(
      lerp(0.61, 0.9, t),
      lerp(0.41, -0.03, Math.pow(t, 1.2)),
      lerp(0.69, 0.32, t)
    ).normalize();
    u.uSunDir.value.copy(dir);
    this.sunDir.copy(dir);

    this.sun.position.copy(dir).multiplyScalar(80);
    this.sun.color.copy(p.light);
    this.sun.intensity = p.lightIntensity;
    this.hemi.color.copy(p.hemiSky);
    this.hemi.groundColor.copy(p.hemiGround);
    this.hemi.intensity = p.hemi;
    this.fill.color.setHex(0xffc39a);
    this.fill.intensity = lerp(0.18, 0.05, t);
    this.rim.intensity = lerp(0.3, 0.12, t);

    this.scene.fog.color.copy(p.fog);
    const dusk = THREE.MathUtils.smoothstep(t, 0.5, 0.92);
    for (const c of this.cloudMats) {
      c.mat.opacity = c.base * (1 - dusk * 0.72);
      c.mat.color.setRGB(1.0, 0.91 - dusk * 0.25, 0.84 - dusk * 0.28);
    }
    this.moon.material.opacity = THREE.MathUtils.smoothstep(t, 0.55, 0.86) * 0.85;
    this.moon.material.color.setRGB(0.88, 0.92, 1.0);
    this.scene.fog.density = lerp(0.0085, 0.0100, t);

    if (force || Math.abs(t - this.lastEnvTime) > 0.035) {
      this.lastEnvTime = t;
      this.updateEnvironment();
    }
  }

  updateEnvironment() {
    if (this.envRT) this.envRT.dispose();
    this.envRT = this.pmrem.fromScene(this.envScene, 0.02, 0.1, 1000);
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = 0.34;
  }

  update(dt) {
    this.uniforms.uTime.value += dt;
  }

  followCamera(camera) {
    this.mesh.position.copy(camera.position);
  }

  setQuality(q) {
    this.sun.shadow.mapSize.set(q === 'ultra' ? 4096 : 2048, q === 'ultra' ? 4096 : 2048);
    if (this.sun.shadow.map) {
      this.sun.shadow.map.dispose();
      this.sun.shadow.map = null;
    }
  }
}
