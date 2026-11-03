import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadFonts } from './assets.js';
import { setAnisotropy, buildSurfaceTextures } from './textures.js';
import { setSignAnisotropy, buildSignTextures } from './signs.js';
import { buildMaterials, M } from './materials.js';
import { SkySystem } from './sky.js';
import { buildGround } from './ground.js';
import { buildCliffs } from './cliffs.js';
import { buildStation } from './station.js';
import { buildEnvironment } from './env.js';
import { PlanarReflection, buildWater } from './water.js';
import { buildPost } from './post.js';
import { mergeStatic } from './optimize.js';
import { buildAtmosphere } from './fx.js';
import { buildWear } from './decals.js';
import { createCinema } from './cinema.js';
import { createAmbience } from './audio.js';
import { createRoam } from './roam.js';
import { buildExtras } from './extras.js';
import { smoothstep } from './lib/noise.js';

const $ = s => document.querySelector(s);
const loaderFill = $('#loader-fill');
const loaderText = $('#loader-text');
const loaderPct = $('#loader-pct');

function progress(text, p) {
  if (loaderText) loaderText.textContent = text;
  if (loaderFill) loaderFill.style.width = (p * 100).toFixed(1) + '%';
  if (loaderPct) loaderPct.textContent = Math.round(p * 100) + '%';
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function boot() {
  progress('WAKING THE DESERT', 0.01);
  await sleep(40);
  await loadFonts();
  progress('LOADING SIGN PAINTER FONTS', 0.06);
  await sleep(30);

  const renderer = new THREE.WebGLRenderer({ canvas: $('#scene'), antialias: true, powerPreference: 'high-performance', stencil: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1.00;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;

  setAnisotropy(Math.min(8, renderer.capabilities.getMaxAnisotropy()));
  setSignAnisotropy(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(47, innerWidth / innerHeight, 0.1, 900);
  camera.position.set(8.0, 2.2, 18.5);
  camera.lookAt(-1.0, 4.2, 1.2);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(-1.0, 4.2, 1.2);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 3;
  controls.maxDistance = 70;
  controls.maxPolarAngle = Math.PI * 0.62;
  controls.minPolarAngle = 0.06;
  controls.enablePan = true;
  controls.update();

  progress('MIXING SANDSTONE & DUST', 0.1);
  await sleep(30);
  const surfaces = await buildSurfaceTextures((t, p) => progress(t, 0.1 + p * 0.55));
  const signs = await buildSignTextures((t, p) => progress(t, 0.66 + p * 0.06));
  progress('BUILDING MATERIALS', 0.73);
  await sleep(20);
  buildMaterials();

  const sky = new SkySystem(renderer, scene);
  progress('RAISING THE CANYON WALLS', 0.78);
  await sleep(20);
  const cliffs = buildCliffs(scene);
  const ground = buildGround(scene);
  progress('RAISING BIG EARL\'S', 0.86);
  await sleep(20);
  const station = buildStation(scene);
  const env = buildEnvironment(scene);
  const extras = location.search.includes('noextras')
    ? { root: new THREE.Group(), setNight() {} }
    : buildExtras(scene);
  const wear = buildWear(scene);
  const atmosphere = buildAtmosphere(scene);

  // Proportion audit used by tools/calibrate.mjs and the reference board.
  // Measured before mergeStatic() because merging flattens the station group.
  const measureObject = (o) => {
    if (!o) return null;
    scene.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(o);
    const s = b.getSize(new THREE.Vector3());
    const c = b.getCenter(new THREE.Vector3());
    const f = n => Math.round(n * 1000) / 1000;
    return {
      min: b.min.toArray().map(f),
      max: b.max.toArray().map(f),
      size: s.toArray().map(f),
      center: c.toArray().map(f),
    };
  };
  const measurement = {
    units: 'meters',
    generatedAt: new Date().toISOString(),
    station: measureObject(station.root),
    canopy: measureObject(scene.getObjectByName('canopy')),
    roofSign: measureObject(scene.getObjectByName('roofSign')),
    waterTower: measureObject(scene.getObjectByName('waterTower')),
    pumpIslands: [],
  };
  scene.traverse(o => { if (o.name === 'pumpIsland') measurement.pumpIslands.push(measureObject(o)); });

  const merged = mergeStatic(scene, [scene]);
  console.log('merged static meshes', merged);
  progress('FLOODING THE WASH', 0.92);
  await sleep(20);
  const reflection = new PlanarReflection(renderer, scene, 0.04);
  const water = buildWater(scene, reflection, ground.puddles);
  const post = buildPost(renderer, scene, camera);

  let shadowDirty = true;
  let shadowClock = 0;
  let reflectionFrame = 0;
  let lastShadowTime = -1;
  const setTime = (t) => {
    if (Math.abs(t - lastShadowTime) > 0.0004) {
      lastShadowTime = t;
      shadowDirty = true;
      if (reflection) reflection.invalidate();
    }
    sky.setTime(t);
    const n = smoothstep(0.45, 0.95, t);
    station.setNight(n);
    env.setNight(n);
    extras.setNight(n);
    atmosphere.setNight(n);
    water.setTime(t);
    post.setExposure(t < 0.55 ? 0.86 : 1.02);
  };
  setTime(0.06);
  const audio = createAmbience();
  const roam = createRoam({ camera, renderer, controls, audio });
  const cinema = createCinema({ camera, controls, setTime, post, audio, roam, onQuality: (q) => sky.setQuality(q) });

  progress('REFLECTING THE SKY', 0.96);
  await sleep(30);

  // initial shadow + reflection pass
  renderer.shadowMap.needsUpdate = true;
  water.update(1 / 60, 0, camera);
  reflection.setSize(innerWidth, innerHeight);
  reflection.update(camera, water.group, true);

  function resize() {
    const w = innerWidth, h = innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
    renderer.setSize(w, h);
    reflection.setSize(w, h);
    post.setSize(w, h);
  }
  addEventListener('resize', resize);

  const sunScreen = new THREE.Vector3();
  const camDir = new THREE.Vector3();
  const clock = new THREE.Clock();
  let frames = 0, fpsT = 0, fps = 0;
  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.elapsedTime;
    controls.update();
    cinema.update(dt);
    roam.update(dt);
    if (post.setFocus && cinema.state.exploring) post.setFocus(camera.position.distanceTo(controls.target));
    sky.followCamera(camera);
    sky.update(dt);
    atmosphere.update(dt, elapsed);
    // The reflection is a second full scene pass. The water is a small,
    // softly-perturbed surface, so half-rate updates are visually free and
    // halve its draw-call cost. The static camera case is skipped entirely.
    reflectionFrame++;
    if ((reflectionFrame & 1) === 0) reflection.update(camera, water.group);
    water.update(dt, elapsed, camera);
    // sun glare in the grade pass when the sun is in view
    camera.getWorldDirection(camDir);
    const facing = camDir.dot(sky.sunDir);
    if (facing > 0.05) {
      sunScreen.copy(camera.position).addScaledVector(sky.sunDir, 600).project(camera);
      const inFrame = Math.abs(sunScreen.x) < 1.25 && Math.abs(sunScreen.y) < 1.25;
      post.setSunScreen(sunScreen.x * 0.5 + 0.5, sunScreen.y * 0.5 + 0.5, inFrame ? Math.pow(facing, 4) * 0.9 : 0);
    } else {
      post.setSunScreen(0.5, 0.5, 0);
    }
    // Shadows only move when the time-of-day sun moves. Re-render the 4096
    // shadow map at 20 Hz at most instead of every frame (a static scene used
    // to pay a full extra scene pass on every frame).
    shadowClock += dt;
    if (shadowDirty && shadowClock >= 0.05) {
      renderer.shadowMap.needsUpdate = true;
      shadowDirty = false;
      shadowClock = 0;
    }
    post.render(dt, elapsed);
    frames++; fpsT += dt;
    if (fpsT > 1) { fps = frames / fpsT; frames = 0; fpsT = 0; window.__fps = fps; }
    requestAnimationFrame(tick);
  }

  window.__app = {
    renderer, scene, camera, controls, sky, station, env, water, reflection, setTime, M, post, atmosphere, wear, cinema, audio, roam, extras,
    measurement,
    get fps() { return fps; },
  };
  window.__measure = () => measurement;
  window.__cinema = cinema;
  window.__roam = roam;
  window.__setCam = (x, y, z, tx, ty, tz, fov = 40) => {
    if (roam.active) roam.stop();
    cinema.state.active = false;
    cinema.state.exploring = true;
    controls.enabled = true;
    camera.position.set(x, y, z);
    controls.target.set(tx, ty, tz);
    camera.fov = fov;
    camera.updateProjectionMatrix();
    controls.update();
  };
  window.__snapTime = (t) => setTime(t);
  window.__ready = true;

  tick();

  // reveal
  await sleep(120);
  progress('READY', 1);
  $('#loader').classList.add('done');
  cinema.startShot(0, { fade: false });
  window.setTimeout(() => $('#title-card').classList.add('show'), 500);
  window.setTimeout(() => $('#title-card').classList.remove('show'), 4600);
  console.log('Big Earl\'s ready', renderer.info.render);
}

boot().catch(err => {
  console.error(err && err.stack ? err.stack : err);
  progress('ERROR: ' + (err && err.message ? err.message : err), 0);
  if (loaderText) loaderText.style.color = '#ff8a6a';
});
