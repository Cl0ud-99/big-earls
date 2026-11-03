import * as THREE from 'three';

const easeInOutCubic = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

const SHOTS = [
  {
    id: 'arrival', num: '01', label: 'ARRIVAL', dur: 12.0, time: [0.10, 0.16], focus: 32, aperture: 0.00022,
    a: { pos: [-30.0, 2.2, 18.0], target: [0.0, 4.4, 3.0], fov: 38 },
    b: { pos: [-23.0, 2.3, 15.6], target: [0.0, 4.5, 2.6], fov: 40 },
  },
  {
    id: 'sign', num: '02', label: 'THE SIGN', dur: 8.5, time: [0.18, 0.24], focus: 18, aperture: 0.00055,
    a: { pos: [13.0, 1.6, 16.5], target: [0.0, 8.2, 3.6], fov: 36 },
    b: { pos: [11.4, 1.7, 15.2], target: [0.0, 8.0, 3.6], fov: 36 },
  },
  {
    id: 'marquee', num: '03', label: 'MARQUEE', dur: 8.0, time: [0.78, 0.84], focus: 9.5, aperture: 0.0008,
    a: { pos: [8.8, 8.4, 12.8], target: [0.0, 9.2, 3.8], fov: 40 },
    b: { pos: [6.0, 8.9, 11.0], target: [0.0, 9.1, 3.8], fov: 38 },
  },
  {
    id: 'gas', num: '04', label: 'GAS PYLON', dur: 7.5, time: [0.28, 0.34], focus: 10.5, aperture: 0.00065,
    a: { pos: [-9.8, 3.6, 20.6], target: [-17.0, 5.2, 10.0], fov: 42 },
    b: { pos: [-11.0, 3.3, 18.4], target: [-17.0, 5.3, 10.0], fov: 40 },
  },
  {
    id: 'service', num: '05', label: 'SERVICE', dur: 9.5, time: [0.28, 0.36], focus: 9.5, aperture: 0.00075,
    a: { pos: [7.4, 1.5, 11.0], target: [-0.5, 2.9, 3.6], fov: 40 },
    b: { pos: [4.2, 1.25, 9.2], target: [-1.5, 2.6, 3.2], fov: 41 },
  },
  {
    id: 'golden', num: '06', label: 'GOLDEN HOUR', dur: 10.5, time: [0.56, 0.68], focus: 20.5, aperture: 0.0003,
    a: { pos: [15.5, 3.0, 19.5], target: [-1.0, 4.4, 1.0], fov: 40 },
    b: { pos: [13.0, 2.7, 17.0], target: [-0.5, 4.3, 1.0], fov: 40 },
  },
  {
    id: 'neon', num: '07', label: 'NEON', dur: 9.5, time: [0.8, 0.86], focus: 9.0, aperture: 0.0008,
    a: { pos: [-8.0, 1.3, 10.8], target: [1.5, 3.0, 4.0], fov: 44 },
    b: { pos: [-2.0, 1.5, 9.2], target: [1.5, 3.2, 4.0], fov: 44 },
  },
  {
    id: 'gorge', num: '08', label: 'DEADLOCK GORGE', dur: 12.0, time: [0.9, 0.97], focus: 34, aperture: 0.0002,
    a: { pos: [12, 7.0, 30], target: [0, 4.2, 0], fov: 42 },
    b: { pos: [5.0, 9.8, 39], target: [0, 3.6, 0], fov: 44 },
  },
];

export function createCinema({ camera, controls, setTime, post, audio, roam, onQuality }) {
  const $ = s => document.querySelector(s);
  const el = {
    shotNum: $('#shot-num'), shotLabel: $('#shot-label'), shotBar: $('#shot-bar'),
    timecode: $('#timecode'), dots: $('#shot-dots'), slider: $('#time-slider'),
    btnPlay: $('#btn-play'), btnCinema: $('#btn-cinema'), btnExplore: $('#btn-explore'),
    btnFly: $('#btn-fly'), btnWalk: $('#btn-walk'),
    btnClean: $('#btn-clean'), btnSound: $('#btn-sound'), btnQuality: $('#btn-quality'),
    btnShots: $('#btn-shots'), picker: $('#shot-picker'), pickerInner: $('#picker-inner'),
    end: $('#end-card'), title: $('#title-card'), toast: $('#toast'), hint: $('#hint'),
    app: $('#app'), btnReplay: $('#btn-replay'), btnRoamEnd: $('#btn-roam-end'),
  };

  const state = {
    active: true, paused: false, ended: false, shot: 0, shotT: 0, time: 0.08,
    exploring: false, quality: 'high', sound: false,
    camPos: new THREE.Vector3(), camTarget: new THREE.Vector3(),
  };
  let toastTimer = 0;

  function toast(text, ms = 2200) {
    el.toast.textContent = text;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), ms);
  }

  function fmtTime(t) {
    const f = Math.floor((t % 1) * 24);
    const s = Math.floor(t) % 60;
    const m = Math.floor(t / 60);
    return `00:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
  }

  function setPaused(p) {
    state.paused = p;
    document.body.classList.toggle('paused', p);
  }

  function syncUI() {
    const s = SHOTS[state.shot];
    const isRoam = !!(roam && roam.active);
    const isFly = isRoam && roam.mode === 'fly';
    const isWalk = isRoam && roam.mode === 'walk';
    el.shotNum.textContent = s.num;
    el.shotLabel.textContent = s.label;
    el.shotBar.style.width = `${Math.min(100, (state.shotT / s.dur) * 100)}%`;
    el.timecode.textContent = fmtTime(state.shotT);
    [...el.dots.children].forEach((d, i) => d.classList.toggle('active', i === state.shot));
    el.slider.value = String(Math.round(state.time * 100));
    el.slider.style.setProperty('--fill', `${Math.round(state.time * 100)}%`);
    document.body.classList.toggle('paused', state.paused && !isRoam);
    el.btnCinema.classList.toggle('active', !state.exploring && !isRoam);
    el.btnExplore.classList.toggle('active', state.exploring && !isRoam);
    el.btnFly.classList.toggle('active', isFly);
    el.btnWalk.classList.toggle('active', isWalk);
    if (isFly) {
      el.hint.innerHTML = '<span><b>WASD</b> FLY</span><span><b>Q/E</b> ALTITUDE</span><span><b>SHIFT</b> BOOST</span><span><b>CLICK</b> LOOK</span><span><b>ESC</b> RELEASE</span>';
    } else if (isWalk) {
      el.hint.innerHTML = '<span><b>WASD</b> WALK</span><span><b>SHIFT</b> RUN</span><span><b>SPACE</b> JUMP</span><span><b>CLICK</b> LOOK</span><span><b>ESC</b> RELEASE</span>';
    } else if (state.exploring) {
      el.hint.innerHTML = '<span><b>DRAG</b> LOOK</span><span><b>SCROLL</b> ZOOM</span><span><b>H</b> CLEAN</span>';
    } else {
      el.hint.innerHTML = '<span><b>SPACE</b> PLAY/PAUSE</span><span><b>1–8</b> SHOTS</span><span><b>E</b> EXPLORE</span><span><b>H</b> CLEAN</span>';
    }
  }

  function applyShot(p, immediate = false) {
    const s = SHOTS[state.shot];
    const e = s.ease === 'out' ? easeOutCubic(p) : easeInOutCubic(p);
    const pos = new THREE.Vector3().fromArray(s.a.pos).lerp(new THREE.Vector3().fromArray(s.b.pos), e);
    const tgt = new THREE.Vector3().fromArray(s.a.target).lerp(new THREE.Vector3().fromArray(s.b.target), e);
    // a whisper of handheld drift so held frames breathe
    const drift = immediate ? 0 : 0.012;
    camera.position.copy(pos);
    camera.position.x += Math.sin(state.shotT * 0.37) * drift;
    camera.position.y += Math.cos(state.shotT * 0.29) * drift * 0.6;
    camera.fov = THREE.MathUtils.lerp(s.a.fov, s.b.fov, e);
    camera.lookAt(tgt);
    camera.updateProjectionMatrix();
    state.camPos.copy(camera.position);
    state.camTarget.copy(tgt);
    controls.target.copy(tgt);
    state.time = THREE.MathUtils.lerp(s.time[0], s.time[1], e);
    if (post) {
      if (post.setFocus) post.setFocus(s.focus ?? 20);
      if (post.setAperture) post.setAperture(s.aperture ?? 0.0005);
    }
    setTime(state.time);
    syncUI();
  }

  function startShot(i, { paused = false, fade = true } = {}) {
    if (roam && roam.active) roam.stop();
    state.shot = Math.max(0, Math.min(SHOTS.length - 1, i));
    state.shotT = 0;
    state.ended = false;
    state.exploring = false;
    state.active = true;
    if (post && post.setDof) post.setDof(true);
    if (fade) {
      el.app.classList.add('cut');
      setTimeout(() => el.app.classList.remove('cut'), 170);
    }
    document.body.classList.add('cinema');
    document.body.classList.remove('paused');
    controls.enabled = false;
    el.end.classList.remove('show');
    el.btnCinema.classList.add('active');
    el.btnExplore.classList.remove('active');
    if (el.btnFly) el.btnFly.classList.remove('active');
    if (el.btnWalk) el.btnWalk.classList.remove('active');
    applyShot(0, true);
    setPaused(paused);
  }

  function play() {
    if (roam && roam.active) { startShot(state.shot); return; }
    if (state.ended) { startShot(0); return; }
    if (state.exploring) { state.exploring = false; startShot(state.shot, { paused: false }); return; }
    state.active = true;
    document.body.classList.add('cinema');
    controls.enabled = false;
    setPaused(false);
    syncUI();
  }

  function pause() {
    setPaused(true);
    syncUI();
  }

  function togglePlay() {
    if (roam && roam.active) { startShot(state.shot); return; }
    if (state.exploring) { play(); return; }
    if (state.paused) play(); else pause();
  }

  function startFly() {
    if (!roam) return;
    state.active = false;
    state.exploring = false;
    state.ended = false;
    state.paused = false;
    document.body.classList.remove('cinema', 'paused');
    el.end.classList.remove('show');
    controls.enabled = false;
    if (post && post.setDof) post.setDof(false);
    roam.startFly();
    syncUI();
  }

  function startWalk() {
    if (!roam) return;
    state.active = false;
    state.exploring = false;
    state.ended = false;
    state.paused = false;
    document.body.classList.remove('cinema', 'paused');
    el.end.classList.remove('show');
    controls.enabled = false;
    if (post && post.setDof) post.setDof(false);
    roam.startWalk();
    syncUI();
  }

  function explore() {
    const wasRoam = !!(roam && roam.active);
    if (roam && roam.active) roam.stop();
    if (post && post.setDof) post.setDof(true);
    state.exploring = true;
    state.active = false;
    setPaused(false);
    document.body.classList.remove('cinema');
    document.body.classList.remove('paused');
    controls.enabled = true;
    camera.fov = 47;
    camera.updateProjectionMatrix();
    if (wasRoam) {
      const d = new THREE.Vector3();
      camera.getWorldDirection(d);
      controls.target.copy(camera.position).addScaledVector(d, 12);
    } else {
      controls.target.copy(state.camTarget);
    }
    controls.update();
    el.shotLabel.textContent = 'EXPLORE';
    el.shotBar.style.width = '0%';
    el.btnCinema.classList.remove('active');
    el.btnExplore.classList.add('active');
    el.end.classList.remove('show');
    syncUI();
  }

  function endFilm() {
    state.ended = true;
    setPaused(true);
    el.end.classList.add('show');
    document.body.classList.remove('cinema');
    controls.enabled = true;
    controls.target.copy(state.camTarget);
    controls.update();
    toast('END OF THE LINE', 2400);
  }

  function buildUI() {
    SHOTS.forEach((s, i) => {
      const b = document.createElement('button');
      b.className = 'shot-dot';
      b.title = `${s.num} · ${s.label}`;
      b.innerHTML = '<i></i>';
      b.addEventListener('click', () => startShot(i));
      el.dots.appendChild(b);

      const p = document.createElement('button');
      p.className = 'picker-item';
      p.innerHTML = `<b>${s.num}</b>${s.label}`;
      p.addEventListener('click', () => {
        el.picker.classList.remove('open');
        startShot(i);
      });
      el.pickerInner.appendChild(p);
    });
    el.btnPlay.addEventListener('click', togglePlay);
    el.btnCinema.addEventListener('click', () => startShot(state.shot, { paused: false }));
    el.btnExplore.addEventListener('click', explore);
    el.btnFly.addEventListener('click', startFly);
    el.btnWalk.addEventListener('click', startWalk);
    el.btnReplay.addEventListener('click', () => startShot(0));
    el.btnRoamEnd.addEventListener('click', startWalk);
    el.btnShots.addEventListener('click', () => el.picker.classList.toggle('open'));
    el.btnClean.addEventListener('click', () => {
      document.body.classList.toggle('clean');
      toast(document.body.classList.contains('clean') ? 'CLEAN VIEW · PRESS H TO RETURN' : 'INTERFACE ON');
    });
    el.btnQuality.addEventListener('click', () => {
      state.quality = state.quality === 'high' ? 'ultra' : 'high';
      el.btnQuality.textContent = `QUALITY: ${state.quality.toUpperCase()}`;
      if (post && post.setQuality) post.setQuality(state.quality);
      if (onQuality) onQuality(state.quality);
      toast(`RENDER QUALITY · ${state.quality.toUpperCase()}`);
    });
    el.btnSound.addEventListener('click', async () => {
      if (!audio) return;
      state.sound = !state.sound;
      if (state.sound) { await audio.start(); el.btnSound.textContent = 'SOUND ON'; el.btnSound.classList.add('on'); }
      else { audio.stop(); el.btnSound.textContent = 'SOUND OFF'; el.btnSound.classList.remove('on'); }
    });
    el.slider.addEventListener('input', () => {
      const t = Number(el.slider.value) / 100;
      if (roam && roam.active) {
        setTime(t);
        state.time = t;
        syncUI();
        return;
      }
      if (state.active && !state.paused) pause();
      if (!state.exploring) {
        state.active = false;
        state.exploring = true;
        state.paused = false;
        document.body.classList.remove('cinema');
        document.body.classList.remove('paused');
        controls.enabled = true;
      }
      setTime(t);
      state.time = t;
      syncUI();
    });
    addEventListener('keydown', (e) => {
      if (roam && roam.active) {
        if (e.key === 'h' || e.key === 'H') { document.body.classList.toggle('clean'); }
        return;
      }
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      else if (e.code === 'ArrowRight') { startShot(state.shot + 1); }
      else if (e.code === 'ArrowLeft') { startShot(state.shot - 1); }
      else if (e.key === 'e' || e.key === 'E') { if (state.exploring) play(); else explore(); }
      else if (e.key === 'f' || e.key === 'F') { startFly(); }
      else if (e.key === 'v' || e.key === 'V') { startWalk(); }
      else if (e.key === 'h' || e.key === 'H') { document.body.classList.toggle('clean'); }
      else if (e.key === 'r' || e.key === 'R') { startShot(0); }
      else if (e.key >= '1' && e.key <= '8') { startShot(Number(e.key) - 1); }
      else if (e.key === 's' || e.key === 'S') { el.btnSound.click(); }
    });
  }

  function update(dt) {
    if (!state.active || state.paused || state.exploring) return;
    const s = SHOTS[state.shot];
    state.shotT += dt;
    if (state.shotT >= s.dur) {
      if (state.shot < SHOTS.length - 1) startShot(state.shot + 1);
      else { state.shotT = s.dur; applyShot(1); endFilm(); }
      return;
    }
    applyShot(Math.min(1, state.shotT / s.dur));
  }

  buildUI();
  return {
    state, shots: SHOTS, startShot, play, pause, togglePlay, explore, startFly, startWalk,
    update,
    jump(i, p = 0) {
      if (roam && roam.active) roam.stop();
      if (post && post.setDof) post.setDof(true);
      state.shot = i; state.shotT = p * SHOTS[i].dur; state.active = true;
      state.exploring = false; document.body.classList.add('cinema'); controls.enabled = false;
      applyShot(p, true); setPaused(true);
    },
  };
}
