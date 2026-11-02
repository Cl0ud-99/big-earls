// Free-fly camera + grounded first-person controller.
// The scene is a single static set, so the collision proxy is authored as a small
// list of boxes and cylinders around the station, pumps, props and set dressing.
import * as THREE from 'three';

const EYE = 1.68;
const RADIUS = 0.34;
const WALK_SPEED = 3.0;
const RUN_SPEED = 5.6;
const FLY_SPEED = 8.5;
const FLY_BOOST = 22.0;
const BOUNDS = { minX: -29, maxX: 23, minZ: -11.5, maxZ: 26.5 };

const BOXES = [
  // station building: front piers, side walls, rear wall
  { x0: -9.80, x1: -7.50, z0: -0.30, z1: 0.22 },
  { x0: -2.90, x1: 2.30, z0: -0.30, z1: 0.22 },
  { x0: 7.50, x1: 9.80, z0: -0.30, z1: 0.22 },
  { x0: -9.80, x1: -9.42, z0: -5.10, z1: 0.20 },
  { x0: 9.42, x1: 9.80, z0: -5.10, z1: 0.20 },
  { x0: -9.80, x1: 9.80, z0: -5.30, z1: -4.75 },
  // centre office block (closed)
  { x0: -2.90, x1: 2.30, z0: -5.20, z1: 0.25 },
  // bay returns
  { x0: -7.55, x1: -2.85, z0: -4.62, z1: -4.40 },
  { x0: 2.25, x1: 7.55, z0: -4.62, z1: -4.40 },
  // left bay: customer truck / bench / tyre stack / tool chest
  { x0: -5.95, x1: -4.42, z0: -3.50, z1: -0.62 },
  { x0: -5.75, x1: -4.45, z0: -4.20, z1: -3.55 },
  { x0: -7.15, x1: -6.35, z0: -1.65, z1: -0.70 },
  { x0: -4.15, x1: -3.00, z0: -3.20, z1: -2.20 },
  // right bay: shop shelving / cooler
  { x0: 3.10, x1: 7.35, z0: -4.55, z1: -3.35 },
  { x0: 7.55, x1: 9.30, z0: 0.60, z1: 3.05 },
  // pump islands
  { x0: -5.95, x1: -2.85, z0: 3.55, z1: 5.05 },
  { x0: 0.35, x1: 3.45, z0: 3.55, z1: 5.05 },
  // outside truck
  { x0: -13.55, x1: -9.25, z0: 5.30, z1: 9.30 },
  // gas pylon base
  { x0: -18.35, x1: -15.65, z0: 8.85, z1: 11.15 },
  // roadside price sign + route 66 shield
  { x0: -9.40, x1: -8.00, z0: 11.15, z1: 11.85 },
  // bench outside the office
  { x0: -9.35, x1: -7.55, z0: 3.15, z1: 4.10 },
  // crates / cooler by the right pier
  { x0: 7.60, x1: 9.20, z0: 0.80, z1: 2.95 },
  // rear lean-to
  { x0: 1.55, x1: 8.45, z0: -9.10, z1: -7.60 },
  // right work-yard fence (gate is the gap on the west side)
  { x0: 12.90, x1: 21.10, z0: -3.35, z1: -3.05 },
  { x0: 20.85, x1: 21.15, z0: -3.30, z1: 5.30 },
  { x0: 12.90, x1: 21.10, z0: 5.05, z1: 5.35 },
  { x0: 12.85, x1: 13.15, z0: -3.30, z1: 1.20 },
  { x0: 12.85, x1: 13.15, z0: 3.80, z1: 5.30 },
  // yard contents
  { x0: 18.15, x1: 20.85, z0: -2.30, z1: -0.80 }, // dumpster
  { x0: 13.55, x1: 15.05, z0: -2.45, z1: -1.15 }, // propane tank
  { x0: 17.50, x1: 21.00, z0: 2.65, z1: 4.95 }, // shed
  { x0: 14.25, x1: 15.55, z0: 3.25, z1: 4.55 }, // tyres
  { x0: 15.70, x1: 18.70, z0: 3.25, z1: 4.75 }, // scrap
  { x0: 20.10, x1: 20.50, z0: -2.40, z1: -2.00 }, // floodlight
  // wrecker parked under the billboard, outside the yard
  { x0: 11.85, x1: 14.55, z0: 5.60, z1: 8.40 },
  // west forecourt bench + tyres, east hydrant + drums
  { x0: -21.45, x1: -19.55, z0: 11.45, z1: 12.55 }, // bench
  { x0: -19.55, x1: -18.85, z0: 12.05, z1: 12.75 }, // bin
  { x0: -14.80, x1: -13.60, z0: 11.00, z1: 12.20 }, // tyres
  { x0: 10.60, x1: 11.20, z0: 12.10, z1: 12.70 }, // hydrant
  { x0: 9.15, x1: 10.35, z0: 11.75, z1: 13.10 }, // drums
  // station clutter
  { x0: -9.85, x1: -8.65, z0: 1.05, z1: 2.05 }, // vending
  { x0: 8.10, x1: 9.35, z0: 2.95, z1: 3.95 }, // ice
  { x0: 7.75, x1: 9.35, z0: 4.20, z1: 5.30 }, // propane cage
  { x0: 2.35, x1: 3.05, z0: 0.35, z1: 0.95 }, // news box
  { x0: -9.85, x1: -9.15, z0: 2.40, z1: 3.10 }, // air stand
  // picnic pull-out
  { x0: -23.55, x1: -20.85, z0: 19.15, z1: 21.25 }, // table
  { x0: -20.85, x1: -19.75, z0: 18.65, z1: 19.75 }, // grill
  { x0: -19.55, x1: -18.65, z0: 20.55, z1: 21.25 }, // cooler
  { x0: -24.15, x1: -23.45, z0: 18.25, z1: 18.95 }, // bin
  { x0: -28.60, x1: -24.00, z0: 22.30, z1: 24.80 }, // sedan
  // picnic hero saguaro
  { x0: -21.10, x1: -19.90, z0: 23.90, z1: 25.10 },
  // roadside guard rail, with the driveway gap at -8..8
  { x0: -30.00, x1: -8.00, z0: 16.52, z1: 16.88 },
  { x0: 8.00, x1: 23.00, z0: 16.52, z1: 16.88 },
];

const CYLINDERS = [
  { x: -9.15, z: 5.75, r: 0.48 }, // canopy column
  { x: 9.15, z: 5.75, r: 0.48 },
  { x: 12.90, z: 11.90, r: 0.16 }, // route 66 shield
  { x: 15.52, z: 6.78, r: 0.34 }, // billboard posts
  { x: 19.87, z: 8.82, r: 0.34 },
  { x: -17.00, z: 10.00, r: 1.05 }, // pylon mast
  { x: -11.90, z: 6.20, r: 0.55 }, // loose tyre
  { x: -16.57, z: -9.57, r: 0.32 }, // water tower legs
  { x: -11.43, z: -9.57, r: 0.32 },
  { x: -16.57, z: -4.43, r: 0.32 },
  { x: -11.43, z: -4.43, r: 0.32 },
];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function groundHeight(x, z) {
  // forecourt apron and interior floor are effectively flat in this set
  if (Math.abs(x) < 9.78 && z < 0.3 && z > -5.2) return 0.045;
  return 0.032;
}

function resolve(p, radius) {
  for (let pass = 0; pass < 2; pass++) {
    for (const b of BOXES) {
      const r = radius;
      if (p.x > b.x0 - r && p.x < b.x1 + r && p.z > b.z0 - r && p.z < b.z1 + r) {
        const dx1 = p.x - (b.x0 - r);
        const dx2 = (b.x1 + r) - p.x;
        const dz1 = p.z - (b.z0 - r);
        const dz2 = (b.z1 + r) - p.z;
        const m = Math.min(dx1, dx2, dz1, dz2);
        if (m === dx1) p.x = b.x0 - r;
        else if (m === dx2) p.x = b.x1 + r;
        else if (m === dz1) p.z = b.z0 - r;
        else p.z = b.z1 + r;
      }
    }
    for (const c of CYLINDERS) {
      const dx = p.x - c.x, dz = p.z - c.z;
      const d = Math.hypot(dx, dz);
      const min = radius + c.r;
      if (d < min && d > 1e-4) {
        p.x = c.x + (dx / d) * min;
        p.z = c.z + (dz / d) * min;
      }
    }
  }
  p.x = clamp(p.x, BOUNDS.minX + radius, BOUNDS.maxX - radius);
  p.z = clamp(p.z, BOUNDS.minZ + radius, BOUNDS.maxZ - radius);
}

export function createRoam({ camera, renderer, controls, audio }) {
  const canvas = renderer.domElement;
  const body = document.body;
  let active = false;
  let mode = 'walk';
  let locked = false;
  let yaw = 0, pitch = 0;
  let bobT = 0, lastStep = 0, jumpY = 0, vy = 0, jumpQueued = false;
  const keys = new Set();
  const feet = new THREE.Vector3(2.2, 0.032, 15.8);
  const velocity = new THREE.Vector3();
  const flyPos = new THREE.Vector3();
  const lookHint = document.getElementById('look-hint');
  const lhKicker = lookHint ? lookHint.querySelector('.lh-kicker') : null;
  const lhTitle = lookHint ? lookHint.querySelector('.lh-title') : null;
  const lhSub = lookHint ? lookHint.querySelector('.lh-sub') : null;

  camera.rotation.order = 'YXZ';

  function applyLook() {
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
  }

  function setHint(title, kicker, sub) {
    if (!lookHint) return;
    if (lhTitle) lhTitle.textContent = title;
    if (lhKicker) lhKicker.textContent = kicker;
    if (lhSub) lhSub.innerHTML = sub;
  }

  function setActive(on, m) {
    active = on;
    if (m) mode = m;
    body.classList.toggle('roam', active);
    if (active) {
      body.classList.remove('fly', 'walk');
      body.classList.add(mode);
    } else {
      body.classList.remove('fly', 'walk', 'locked');
      locked = false;
    }
  }

  function onPointerLockChange() {
    locked = document.pointerLockElement === canvas;
    body.classList.toggle('locked', active && locked);
  }

  function onMouseMove(e) {
    if (!active || !locked) return;
    yaw -= e.movementX * 0.0022;
    pitch = clamp(pitch - e.movementY * 0.0022, -1.38, 1.38);
    applyLook();
  }

  function onKeyDown(e) {
    if (!active) return;
    if (e.target && e.target.tagName === 'INPUT') return;
    const movement = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ShiftLeft', 'ShiftRight', 'Space'];
    if (movement.includes(e.code)) {
      keys.add(e.code);
      if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat && mode === 'walk') jumpQueued = true;
      }
    }
  }

  function onKeyUp(e) {
    keys.delete(e.code);
  }

  function onBlur() {
    keys.clear();
  }

  function onCanvasClick() {
    if (!active || locked) return;
    try {
      const p = canvas.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    } catch (err) { /* pointer lock can be blocked; the click prompt remains */ }
  }

  canvas.addEventListener('click', onCanvasClick);
  document.addEventListener('pointerlockchange', onPointerLockChange);
  document.addEventListener('mousemove', onMouseMove);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  function startFly() {
    stop();
    active = true;
    mode = 'fly';
    setActive(true, 'fly');
    controls.enabled = false;
    const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    yaw = e.y;
    pitch = e.x;
    flyPos.copy(camera.position);
    velocity.set(0, 0, 0);
    camera.fov = 58;
    camera.updateProjectionMatrix();
    applyLook();
    setHint('CLICK TO LOOK', 'FREE CAMERA', 'WASD MOVE · Q/E ALTITUDE · SHIFT BOOST · <b>CLICK</b> TO LOOK · <b>ESC</b> RELEASE');
    body.classList.remove('locked');
    locked = false;
  }

  function startWalk(spawn = null) {
    stop();
    active = true;
    mode = 'walk';
    setActive(true, 'walk');
    controls.enabled = false;
    const sp = spawn || { x: 2.2, z: 15.8 };
    feet.set(sp.x, groundHeight(sp.x, sp.z), sp.z);
    velocity.set(0, 0, 0);
    jumpY = 0; vy = 0; bobT = 0; lastStep = 0;
    yaw = sp.yaw !== undefined ? sp.yaw : 0.16;
    pitch = sp.pitch !== undefined ? sp.pitch : 0.05;
    camera.fov = 66;
    camera.updateProjectionMatrix();
    camera.position.set(feet.x, feet.y + EYE, feet.z);
    applyLook();
    setHint('CLICK TO LOOK', 'FIRST PERSON', 'WASD WALK · SHIFT RUN · SPACE JUMP · <b>CLICK</b> TO LOOK · <b>ESC</b> RELEASE');
    body.classList.remove('locked');
    locked = false;
  }

  function stop() {
    if (!active) return;
    active = false;
    keys.clear();
    jumpQueued = false;
    if (document.pointerLockElement === canvas) {
      try { document.exitPointerLock(); } catch (e) { /* noop */ }
    }
    locked = false;
    setActive(false);
    body.classList.remove('locked');
  }

  function teleport(x, y, z, newYaw, newPitch) {
    if (mode === 'fly') {
      flyPos.set(x, y, z);
      camera.position.copy(flyPos);
    } else {
      feet.set(x, groundHeight(x, z), z);
      camera.position.set(feet.x, feet.y + EYE, feet.z);
    }
    if (newYaw !== undefined) yaw = newYaw;
    if (newPitch !== undefined) pitch = newPitch;
    applyLook();
  }

  function update(dt) {
    if (!active) return;
    const f = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
    const r = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
    const sprint = keys.has('ShiftLeft') || keys.has('ShiftRight');

    if (mode === 'walk') {
      const speed = sprint ? RUN_SPEED : WALK_SPEED;
      let ix = f, iz = r;
      const inLen = Math.hypot(ix, iz);
      if (inLen > 1) { ix /= inLen; iz /= inLen; }
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
      const rx = Math.cos(yaw), rz = -Math.sin(yaw);
      const tx = (fx * ix + rx * iz) * speed;
      const tz = (fz * ix + rz * iz) * speed;
      const k = 1 - Math.exp(-11 * dt);
      velocity.x += (tx - velocity.x) * k;
      velocity.z += (tz - velocity.z) * k;
      feet.x += velocity.x * dt;
      feet.z += velocity.z * dt;
      resolve(feet, RADIUS);
      feet.y = groundHeight(feet.x, feet.z);

      if (jumpQueued && jumpY <= 0) { vy = 4.25; jumpQueued = false; }
      if (jumpY > 0 || vy !== 0) {
        jumpY += vy * dt;
        vy -= 13.5 * dt;
        if (jumpY <= 0) { jumpY = 0; vy = 0; }
      }

      const speedNow = Math.hypot(velocity.x, velocity.z);
      bobT += speedNow * dt * 2.15;
      const bob = speedNow > 0.25 ? Math.sin(bobT * 4.6) * 0.026 * Math.min(1, speedNow / 3.2) : 0;
      camera.position.set(feet.x, feet.y + EYE + jumpY + bob, feet.z);
      applyLook();

      const stepIndex = Math.floor(bobT / Math.PI);
      if (stepIndex !== lastStep && speedNow > 0.6 && jumpY <= 0) {
        lastStep = stepIndex;
        if (audio && audio.step) audio.step(sprint ? 0.7 : 0.45);
      }
    } else {
      const speed = sprint ? FLY_BOOST : FLY_SPEED;
      const cp = Math.cos(pitch);
      const fx = -Math.sin(yaw) * cp;
      const fy = Math.sin(pitch);
      const fz = -Math.cos(yaw) * cp;
      const rx = Math.cos(yaw);
      const rz = -Math.sin(yaw);
      const up = (keys.has('KeyE') ? 1 : 0) - (keys.has('KeyQ') ? 1 : 0);
      let tx = fx * f + rx * r;
      let ty = fy * f + up;
      let tz = fz * f + rz * r;
      const len = Math.hypot(tx, ty, tz);
      if (len > 1) { tx /= len; ty /= len; tz /= len; }
      const k = 1 - Math.exp(-7 * dt);
      velocity.x += (tx * speed - velocity.x) * k;
      velocity.y += (ty * speed - velocity.y) * k;
      velocity.z += (tz * speed - velocity.z) * k;
      flyPos.addScaledVector(velocity, dt);
      flyPos.x = clamp(flyPos.x, -90, 90);
      flyPos.y = clamp(flyPos.y, 0.25, 120);
      flyPos.z = clamp(flyPos.z, -90, 90);
      camera.position.copy(flyPos);
      applyLook();
    }
  }

  return {
    startFly, startWalk, stop, update, teleport,
    get active() { return active; },
    get mode() { return mode; },
    get locked() { return locked; },
    get position() { return camera.position.clone(); },
    requestLock() { onCanvasClick(); },
  };
}
