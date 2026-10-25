// The sounds of moving through time, made on the spot with Web Audio (no files): the tick as everything stops, the hum
// of stopped time, the rush of the vortex, a tape running fast, the clunk as it stops and a chime on arrival. dir is +1
// for forward and -1 for rewind: rising sounds go forward, falling ones go back.

let ac = null, master = null, muted = false;

function ready() {
  if (muted) return null;
  if (!ac) {
    ac = new AudioContext();
    master = ac.createGain();
    master.gain.value = 0.6;
    master.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
function noise(a, dur) {
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  return src;
}
/** A gain that rises to peak over `rise` seconds, holds, and falls away by the end of dur. */
function envelope(a, t0, dur, peak, rise = 0.05, fall = 0.2) {
  const gn = a.createGain();
  gn.gain.setValueAtTime(0.0001, t0);
  gn.gain.exponentialRampToValueAtTime(peak, t0 + rise);
  gn.gain.setValueAtTime(peak, Math.max(t0 + rise, t0 + dur - fall));
  gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  gn.connect(master);
  return gn;
}

export const sound = {
  get muted() { return muted; },
  set muted(v) {
    muted = v;
    if (master) master.gain.value = v ? 0 : 0.6;
  },
  /** Everything stops: one dry tick. */
  tick() {
    const a = ready(); if (!a) return;
    const t = a.currentTime, n = noise(a, 0.04), hp = a.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 2500;
    n.connect(hp).connect(envelope(a, t, 0.04, 0.5, 0.002, 0.03));
    n.start(t);
  },
  /** Stopped time: a low hum with a slow wobble. */
  hum(dur) {
    const a = ready(); if (!a) return;
    const t = a.currentTime, out = envelope(a, t, dur, 0.14, 0.3, 0.3);
    for (const f of [55, 82.5, 110.5]) {
      const o = a.createOscillator();
      o.type = 'sine'; o.frequency.value = f;
      o.connect(out); o.start(t); o.stop(t + dur);
    }
  },
  /** The vortex: wind through a sweeping filter, rising forward and falling back, and a glide under it. */
  rush(dur, dir) {
    const a = ready(); if (!a) return;
    const t = a.currentTime, n = noise(a, dur), bp = a.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 6;
    const [f0, f1] = dir > 0 ? [250, 3200] : [3200, 250];
    bp.frequency.setValueAtTime(f0, t);
    bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    n.connect(bp).connect(envelope(a, t, dur, 0.5, dur * 0.4, 0.3));
    n.start(t);
    const o = a.createOscillator(), lp = a.createBiquadFilter();
    o.type = 'sawtooth'; lp.type = 'lowpass'; lp.frequency.value = 900;
    o.frequency.setValueAtTime(dir > 0 ? 70 : 280, t);
    o.frequency.exponentialRampToValueAtTime(dir > 0 ? 280 : 70, t + dur);
    o.connect(lp).connect(envelope(a, t, dur, 0.07, dur * 0.5, 0.3));
    o.start(t); o.stop(t + dur);
  },
  /** Tape running fast: a squealing whirr with a flutter, climbing as it speeds up. */
  whirr(dur, dir) {
    const a = ready(); if (!a) return;
    const t = a.currentTime, o = a.createOscillator(), lfo = a.createOscillator(), depth = a.createGain(), lp = a.createBiquadFilter();
    o.type = 'square'; lp.type = 'lowpass'; lp.frequency.value = 1600;
    o.frequency.setValueAtTime(dir > 0 ? 180 : 240, t);
    o.frequency.exponentialRampToValueAtTime(dir > 0 ? 1300 : 900, t + dur);
    lfo.frequency.value = 13; depth.gain.value = 40;
    lfo.connect(depth).connect(o.frequency);
    o.connect(lp).connect(envelope(a, t, dur, 0.05, 0.15, 0.05));
    o.start(t); o.stop(t + dur); lfo.start(t); lfo.stop(t + dur);
  },
  /** The tape stops: a low thud and a click. */
  clunk() {
    const a = ready(); if (!a) return;
    const t = a.currentTime, o = a.createOscillator();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    o.connect(envelope(a, t, 0.18, 0.4, 0.005, 0.12));
    o.start(t); o.stop(t + 0.2);
    sound.tick();
  },
  /** One click of the wind-up key: a ratchet's tick and a little metal ping. */
  ratchet(dir) {
    const a = ready(); if (!a) return;
    sound.tick();
    const t = a.currentTime, o = a.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(dir > 0 ? 1500 : 1200, t);
    o.frequency.exponentialRampToValueAtTime(dir > 0 ? 1800 : 900, t + 0.03);
    o.connect(envelope(a, t, 0.04, 0.05, 0.002, 0.03));
    o.start(t); o.stop(t + 0.05);
  },
  /** A plush toy hopping: a quick rising boing. */
  hop() {
    const a = ready(); if (!a) return;
    const t = a.currentTime, o = a.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(260, t);
    o.frequency.exponentialRampToValueAtTime(720, t + 0.18);
    o.connect(envelope(a, t, 0.22, 0.18, 0.01, 0.1));
    o.start(t); o.stop(t + 0.24);
  },
  /** Landing: the squeak a squeezed plush makes. */
  squeak() {
    const a = ready(); if (!a) return;
    const t = a.currentTime, o = a.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(900, t);
    o.frequency.linearRampToValueAtTime(1500, t + 0.06);
    o.frequency.linearRampToValueAtTime(1150, t + 0.16);
    o.connect(envelope(a, t, 0.17, 0.12, 0.01, 0.08));
    o.start(t); o.stop(t + 0.18);
  },
  /** A page turning: a short brush of paper. */
  flip() {
    const a = ready(); if (!a) return;
    const t = a.currentTime, n = noise(a, 0.12), bp = a.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(2400, t);
    bp.frequency.exponentialRampToValueAtTime(900, t + 0.1);
    n.connect(bp).connect(envelope(a, t, 0.12, 0.35, 0.01, 0.09));
    n.start(t);
  },
  /** Arrival: four bell notes, up for forward, down for rewind. */
  chime(dir) {
    const a = ready(); if (!a) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    (dir > 0 ? notes : notes.slice().reverse()).forEach((f, i) => {
      const t = a.currentTime + i * 0.07, o = a.createOscillator();
      o.type = 'triangle'; o.frequency.value = f;
      o.connect(envelope(a, t, 0.5, 0.12, 0.005, 0.45));
      o.start(t); o.stop(t + 0.5);
    });
  },
};
