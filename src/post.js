import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: new THREE.Vector2(1600, 900) },
    uTime: { value: 0 },
    uExposure: { value: 1.0 },
    uVignette: { value: 0.42 },
    uGrain: { value: 0.028 },
    uCA: { value: 0.006 },
    uSat: { value: 1.12 },
    uContrast: { value: 1.06 },
    uLift: { value: new THREE.Vector3(0.006, 0.012, 0.02) },
    uWarm: { value: 0.5 },
    uSunUV: { value: new THREE.Vector2(0.5, 0.7) },
    uSunGlow: { value: 0.0 },
    uLetterbox: { value: 0.0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */`
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform float uExposure;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uCA;
    uniform float uSat;
    uniform float uContrast;
    uniform vec3 uLift;
    uniform float uWarm;
    uniform vec2 uSunUV;
    uniform float uSunGlow;
    uniform float uLetterbox;
    varying vec2 vUv;

    float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    vec3 aces(vec3 x){
      const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
      return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
    }

    void main(){
      vec2 uv = vUv;
      vec2 dir = uv - 0.5;
      float r2 = dot(dir, dir);
      vec3 hdr;
      hdr.r = texture2D(tDiffuse, uv + dir * r2 * uCA).r;
      hdr.g = texture2D(tDiffuse, uv).g;
      hdr.b = texture2D(tDiffuse, uv - dir * r2 * uCA).b;

      // atmospheric sun glow when the sun is near frame
      if (uSunGlow > 0.001) {
        vec2 d = uv - uSunUV;
        d.x *= uResolution.x / max(uResolution.y, 1.0);
        float dist = length(d);
        hdr += vec3(1.0, 0.56, 0.27) * exp(-dist * 7.0) * uSunGlow * 0.35;
        hdr += vec3(1.0, 0.72, 0.44) * exp(-dist * 2.3) * uSunGlow * 0.08;
      }

      hdr *= uExposure;
      vec3 col = aces(hdr);
      col = pow(col, vec3(1.0 / 2.2));

      // split tone / film grade in display space
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      vec3 shadowTint = vec3(0.92, 0.985, 1.075);
      vec3 highTint = vec3(1.055, 1.0, 0.925);
      col *= mix(vec3(1.0), mix(shadowTint, highTint, smoothstep(0.08, 0.9, l)), uWarm);
      col = mix(vec3(l), col, uSat);
      col = (col - 0.5) * uContrast + 0.5;
      col += uLift * (1.0 - smoothstep(0.0, 0.55, l));

      // vignette
      float vig = smoothstep(1.02, 0.32, length(dir) * 1.35);
      col *= mix(1.0, vig, uVignette);

      // very subtle halation ring + bloom spill handled by bloom pass
      col = clamp(col, 0.0, 1.0);

      // grain
      float g = hash21(uv * uResolution + fract(uTime) * 97.0) - 0.5;
      col += g * uGrain * (0.55 + 0.45 * (1.0 - l));

      // dither to kill sky banding
      col += (hash21(uv * uResolution + 13.7) - 0.5) / 255.0;

      // optional in-shader letterbox (kept off; CSS handles the frame)
      if (uLetterbox > 0.001) {
        float band = uLetterbox;
        if (uv.y < band || uv.y > 1.0 - band) col *= 0.0;
      }
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export function buildPost(renderer, scene, camera) {  renderer.toneMapping = THREE.NoToneMapping;
  const dpr = renderer.getPixelRatio();
  const w = Math.floor(innerWidth * dpr), h = Math.floor(innerHeight * dpr);
  const rt = new THREE.WebGLRenderTarget(w, h, {
    type: THREE.HalfFloatType,
    colorSpace: THREE.LinearSRGBColorSpace,
    samples: 4,
    depthBuffer: true,
  });
  rt.texture.generateMipmaps = false;

  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(innerWidth, innerHeight);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const gtao = new GTAOPass(scene, camera, Math.round(w * 0.5), Math.round(h * 0.5), {
    radius: 0.55, distanceExponent: 1.35, thickness: 1.0, scale: 1.0, samples: 16,
  });
  gtao.output = GTAOPass.OUTPUT.Default;
  gtao.blendIntensity = 0.86;
  composer.addPass(gtao);

  const bokeh = new BokehPass(scene, camera, { focus: 20, aperture: 0.00065, maxblur: 0.0075 });
  bokeh.enabled = true;
  composer.addPass(bokeh);

  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.3, 0.85, 1.0);
  bloom.threshold = 1.0;
  bloom.strength = 0.30;
  bloom.radius = 0.75;
  composer.addPass(bloom);

  const grade = new ShaderPass(GradeShader);
  grade.renderToScreen = true;
  composer.addPass(grade);

  function setSize(width, height) {
    const pr = renderer.getPixelRatio();
    const nw = Math.max(2, Math.floor(width * pr)), nh = Math.max(2, Math.floor(height * pr));
    composer.setSize(width, height);
    bloom.resolution.set(nw, nh);
    grade.uniforms.uResolution.value.set(nw, nh);
    gtao.setSize(Math.max(128, Math.round(nw * 0.5)), Math.max(72, Math.round(nh * 0.5)));
    bokeh.setSize(nw, nh);
  }
  setSize(innerWidth, innerHeight);

  return {
    composer, grade, bloom,
    render(dt, time) {
      grade.uniforms.uTime.value = time;
      composer.render(dt);
    },
    setSize,
    setExposure(v) { grade.uniforms.uExposure.value = v; },
    setFocus(d) { if (bokeh.uniforms) bokeh.uniforms.focus.value = d; },
    setDof(on) { bokeh.enabled = !!on; },
    setAperture(v) { if (bokeh.uniforms) bokeh.uniforms.aperture.value = v; },
    setSunScreen(x, y, glow) {
      grade.uniforms.uSunUV.value.set(x, y);
      grade.uniforms.uSunGlow.value = glow;
    },
    setQuality(q) {
      bloom.strength = q === 'ultra' ? 0.46 : 0.38;
      bloom.radius = q === 'ultra' ? 0.8 : 0.7;
    },
  };
}
