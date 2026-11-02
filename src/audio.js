// Procedural desert ambience: wind, a low canyon drone, and a faint electric hum.
// No external audio assets; everything is synthesised on the first user gesture.
export function createAmbience() {
  let ctx = null;
  let master = null;
  let started = false;
  let stopTimer = 0;
  let active = [];
  let stepNoise = null;

  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    return ctx;
  }

  function noiseBuffer(seconds = 6) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.018 * white) / 1.018;
      d[i] = last * 3.2;
    }
    // fade loop seam
    const fade = Math.floor(ctx.sampleRate * 0.08);
    for (let i = 0; i < fade; i++) {
      const k = i / fade;
      d[i] *= k;
      d[len - 1 - i] *= k;
    }
    return buf;
  }

  async function start() {
    const c = ensureCtx();
    if (!c) return false;
    clearTimeout(stopTimer);
    await c.resume();
    if (started) { master.gain.setTargetAtTime(0.5, c.currentTime, 0.4); return true; }

    master = c.createGain();
    master.gain.value = 0;
    master.connect(c.destination);

    // short gravel footstep transient, reused by the first-person controller
    if (!stepNoise) {
      const n = Math.floor(c.sampleRate * 0.09);
      stepNoise = c.createBuffer(1, n, c.sampleRate);
      const d = stepNoise.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    }

    // wind bed
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(7);
    src.loop = true;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 340;
    lp.Q.value = 0.7;
    const windGain = c.createGain();
    windGain.gain.value = 0.055;
    src.connect(lp);
    lp.connect(windGain);
    windGain.connect(master);

    const lfo = c.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.063;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 210;
    lfo.connect(lfoGain);
    lfoGain.connect(lp.frequency);

    // canyon drone
    const droneGain = c.createGain();
    droneGain.gain.value = 0.014;
    droneGain.connect(master);
    const o1 = c.createOscillator();
    o1.type = 'sine'; o1.frequency.value = 48.5;
    const o2 = c.createOscillator();
    o2.type = 'sine'; o2.frequency.value = 73.2;
    const o3 = c.createOscillator();
    o3.type = 'triangle'; o3.frequency.value = 97.1;
    const g2 = c.createGain(); g2.gain.value = 0.55;
    const g3 = c.createGain(); g3.gain.value = 0.12;
    o1.connect(droneGain);
    o2.connect(g2); g2.connect(droneGain);
    o3.connect(g3); g3.connect(droneGain);

    // neon hum
    const hum = c.createOscillator();
    hum.type = 'sawtooth'; hum.frequency.value = 120;
    const humFilter = c.createBiquadFilter();
    humFilter.type = 'bandpass'; humFilter.frequency.value = 240; humFilter.Q.value = 3;
    const humGain = c.createGain(); humGain.gain.value = 0.0025;
    hum.connect(humFilter); humFilter.connect(humGain); humGain.connect(master);

    for (const n of [src, lfo, o1, o2, o3, hum]) { n.start(); active.push(n); }
    active.push(lp, windGain, droneGain, humFilter, humGain);
    master.gain.setTargetAtTime(0.5, c.currentTime, 1.6);
    started = true;
    return true;
  }

  function step(strength = 0.5) {
    if (!ctx || !master || !started) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(86, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.05 * strength, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.19);
    if (stepNoise) {
      const s = ctx.createBufferSource();
      s.buffer = stepNoise;
      const ng = ctx.createGain();
      ng.gain.value = 0.035 * strength;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 950; bp.Q.value = 1.1;
      s.connect(bp); bp.connect(ng); ng.connect(master);
      s.start(t);
    }
  }

  function stop() {
    if (!ctx || !master) return;
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.35);
    stopTimer = setTimeout(() => {
      try { ctx.suspend(); } catch (e) { /* noop */ }
      started = false;
    }, 700);
  }

  return { start, stop, step, get started() { return started; } };
}
