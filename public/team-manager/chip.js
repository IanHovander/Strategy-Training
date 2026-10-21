// A tiny Game Boy-style synth (two pulse voices, a triangle bass, noise drums) and the intro's score.
// Everything is scheduled ahead on the audio clock, and the picture reads the same clock, so cuts land on the beat.

export const BPM = 150;
export const BEAT = 60 / BPM;

// iPhones mute web audio when the ring/silent switch is on silent (videos and music apps ignore the switch).
// Two ways around it: ask for the "playback" audio session (iOS 17+, top-level pages), and keep a silent <audio>
// element looping, which puts the whole page in playback mode, including inside a frame like the artifact viewer.
const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Mac/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
function playThroughSilentSwitch() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
  } catch {
    // Not supported here: nothing to do.
  }
}
/** A tenth of a second of 8-bit silence as a WAV data URL, at the audio context's own rate so iOS doesn't resample. */
function silentWav(rate) {
  const n = Math.round(rate / 10), bytes = new Uint8Array(44 + n), v = new DataView(bytes.buffer);
  const tag = (at, str) => [...str].forEach((c, i) => (bytes[at + i] = c.charCodeAt(0)));
  tag(0, 'RIFF');
  v.setUint32(4, 36 + n, true);
  tag(8, 'WAVEfmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate, true);
  v.setUint16(32, 1, true);
  v.setUint16(34, 8, true);
  tag(36, 'data');
  v.setUint32(40, n, true);
  bytes.fill(128, 44);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return `data:audio/wav;base64,${btoa(bin)}`;
}

// ---- Synth ----
export class Chip {
  constructor() {
    this.ac = null;
    this.muted = false;
    this.notes = 0;
    this.silent = null; // the looping silent <audio> on iPhones
    this.silentState = IOS ? 'not started' : 'not needed';
  }
  /**
   * Call from a tap or key press: browsers only allow sound after the viewer interacts.
   * Pass an OfflineAudioContext to render the music to a buffer instead.
   */
  start(context) {
    if (!this.ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!context && !AC) return false;
      this.offline = !!context;
      if (!context) playThroughSilentSwitch();
      const ac = (this.ac = context ?? new AC());
      this.master = ac.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      this.master.connect(comp).connect(ac.destination);
      // Recorded music skips the compressor: it's already mastered.
      this.direct = ac.createGain();
      this.direct.gain.value = this.muted ? 0 : 1;
      this.direct.connect(ac.destination);
      this.noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.waves = { p12: this.pulse(0.125), p25: this.pulse(0.25), p50: this.pulse(0.5) };
      this.bus = null;
    }
    this.unlock();
    return true;
  }
  /**
   * Wake the audio up. Must run inside a tap or key press; safe to call on every one until it works.
   * iPhones only count the end of a tap (not its start), and older ones also need a sound to play right then.
   */
  unlock() {
    if (!this.ac || this.offline) return;
    this.keepPlaybackMode();
    if (this.running) return;
    playThroughSilentSwitch();
    this.ac.resume?.()?.catch?.(() => {});
    const blip = this.ac.createBufferSource();
    blip.buffer = this.ac.createBuffer(1, 1, this.ac.sampleRate);
    blip.connect(this.ac.destination);
    blip.start();
  }
  /** Start the silent <audio> loop (iPhones only, inside a tap). */
  keepPlaybackMode() {
    if (!IOS || typeof Audio !== 'function') return;
    if (!this.silent) {
      const a = (this.silent = new Audio());
      a.setAttribute('x-webkit-airplay', 'deny');
      a.loop = true;
      a.preload = 'auto';
      a.src = silentWav(this.ac.sampleRate);
      // Pause it with the page so it never shows up as "now playing" on the lock screen.
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) a.pause();
        else if (this.silentState === 'playing') a.play().catch(() => {});
      });
    }
    if (!this.silent.paused) return;
    this.silentState = 'starting';
    this.silent.play().then(
      () => (this.silentState = 'playing'),
      (e) => (this.silentState = `blocked (${e?.name ?? e})`),
    );
  }
  /** What the audio is doing, for the #debug readout. */
  describe() {
    const ac = this.ac;
    return [
      `audio: ${ac ? `${ac.state}, ${ac.sampleRate} Hz, clock ${ac.currentTime.toFixed(1)} s` : 'not started'}`,
      `notes played: ${this.notes}`,
      `muted: ${this.muted}`,
      `audio session: ${navigator.audioSession?.type ?? 'not supported'}`,
      `silent loop: ${this.silentState}`,
    ].join('\n');
  }
  get ready() {
    return !!this.ac;
  }
  get running() {
    return this.ac?.state === 'running';
  }
  now() {
    return this.ac ? this.ac.currentTime : performance.now() / 1000;
  }
  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ac.currentTime, 0.02);
    if (this.direct) this.direct.gain.setTargetAtTime(m ? 0 : 1, this.ac.currentTime, 0.02);
  }
  /** A fresh output for a new run of the music; the old one fades out with everything still queued on it. */
  newBus() {
    if (!this.ac) return;
    const old = this.bus;
    if (old) {
      old.gain.setTargetAtTime(0, this.ac.currentTime, 0.015);
      setTimeout(() => old.disconnect(), 400);
    }
    this.bus = this.ac.createGain();
    this.bus.connect(this.master);
  }
  pulse(duty) {
    const n = 48, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    return this.ac.createPeriodicWave(re, im);
  }
  /** One note. o: wave ('p12' | 'p25' | 'p50' | 'tri' | 'saw' | 'sine'), vol, slide (end Hz), vib, decay. */
  tone(t, dur, hz, o = {}) {
    this.notes++;
    const ac = this.ac, osc = ac.createOscillator(), g = ac.createGain();
    const w = o.wave ?? 'p25';
    if (this.waves[w]) osc.setPeriodicWave(this.waves[w]);
    else osc.type = w === 'tri' ? 'triangle' : w === 'saw' ? 'sawtooth' : w === 'sine' ? 'sine' : 'square';
    osc.frequency.setValueAtTime(hz, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
    if (o.detune) osc.detune.value = o.detune;
    if (o.vib && dur > 0.3) {
      const lfo = ac.createOscillator(), depth = ac.createGain();
      lfo.frequency.value = 5.5;
      depth.gain.setValueAtTime(0, t);
      depth.gain.linearRampToValueAtTime(hz * 0.012, t + 0.25);
      lfo.connect(depth).connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
    }
    const v = o.vol ?? 0.15, end = t + Math.max(0.03, dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.004);
    if (o.decay) g.gain.exponentialRampToValueAtTime(0.0008, end);
    else {
      g.gain.linearRampToValueAtTime(v * 0.7, t + Math.min(0.09, dur * 0.5));
      g.gain.setValueAtTime(v * 0.7, Math.max(t + 0.01, end - 0.025));
      g.gain.linearRampToValueAtTime(0, end);
    }
    osc.connect(g).connect(this.bus);
    osc.start(t);
    osc.stop(end + 0.02);
  }
  /** A burst of filtered noise. o: vol, type (biquad type), hz, q, sweep (end Hz), rate, swell. */
  noise(t, dur, o = {}) {
    const ac = this.ac, src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = this.noiseBuf;
    src.loop = true;
    src.playbackRate.value = o.rate ?? 1;
    f.type = o.type ?? 'highpass';
    f.frequency.setValueAtTime(o.hz ?? 1000, t);
    if (o.sweep) f.frequency.exponentialRampToValueAtTime(o.sweep, t + dur);
    f.Q.value = o.q ?? 0.8;
    const v = o.vol ?? 0.2;
    if (o.swell) {
      g.gain.setValueAtTime(0.0008, t);
      g.gain.exponentialRampToValueAtTime(v, t + dur);
      g.gain.linearRampToValueAtTime(0, t + dur + 0.02);
    } else {
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    }
    src.connect(f).connect(g).connect(this.bus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }
  kick(t, v = 0.55) {
    this.tone(t, 0.16, 150, { wave: 'sine', slide: 38, vol: v, decay: true });
    this.noise(t, 0.02, { vol: v * 0.3, type: 'lowpass', hz: 1200 });
  }
  snare(t, v = 0.32) {
    this.noise(t, 0.13, { vol: v, type: 'bandpass', hz: 2200, q: 0.6 });
    this.tone(t, 0.06, 190, { wave: 'tri', slide: 120, vol: v * 0.9, decay: true });
  }
  hat(t, v = 0.07) {
    this.noise(t, 0.035, { vol: v, type: 'highpass', hz: 7500 });
  }
  crash(t, v = 0.2) {
    this.noise(t, 1.3, { vol: v, type: 'highpass', hz: 3800 });
  }
  /** Sound effects, timed by the score or played right away. */
  sfx(name, t = this.now()) {
    if (!this.ac || !this.bus) return;
    const S = {
      star: () => {
        this.tone(t, 0.6, 2400, { wave: 'p12', slide: 600, vol: 0.08 });
        this.noise(t, 0.6, { vol: 0.06, hz: 5000, sweep: 1500 });
      },
      whoosh: () => this.noise(t, 0.45, { vol: 0.22, type: 'bandpass', hz: 400, sweep: 3500, q: 1.2 }),
      whip: () => this.noise(t, 0.7, { vol: 0.25, type: 'bandpass', hz: 300, sweep: 4000, q: 1.5 }),
      skid: () => this.noise(t, 0.3, { vol: 0.16, type: 'bandpass', hz: 1500, sweep: 700, q: 3 }),
      clunk: () => {
        this.tone(t, 0.12, 140, { wave: 'p50', slide: 60, vol: 0.25, decay: true });
        this.noise(t, 0.12, { vol: 0.3, type: 'lowpass', hz: 900 });
      },
      rev: () => {
        this.tone(t, 0.7, 48, { wave: 'saw', slide: 75, vol: 0.12 });
        this.noise(t, 0.6, { vol: 0.08, type: 'lowpass', hz: 300 });
      },
      glint: () => {
        this.tone(t, 0.25, 3136, { wave: 'p12', vol: 0.06, decay: true });
        this.tone(t + 0.06, 0.3, 4186, { wave: 'p12', vol: 0.05, decay: true });
      },
      impact: () => {
        this.kick(t, 0.8);
        this.noise(t, 0.5, { vol: 0.45, type: 'lowpass', hz: 2500, sweep: 200 });
        this.crash(t, 0.25);
      },
      spin: () => this.tone(t, 0.35, 300, { wave: 'p25', slide: 1500, vol: 0.1 }),
      alarm: () => [0, 0.2].forEach((d) => this.tone(t + d, 0.16, d ? 988 : 1319, { wave: 'p50', vol: 0.08 })),
      whine: () => this.tone(t, 0.8, 180, { wave: 'saw', slide: 420, vol: 0.05 }),
      tick: () => this.tone(t, 0.04, 2000, { wave: 'p50', vol: 0.06 }),
      buzzer: () => {
        this.tone(t, 0.9, 92, { wave: 'saw', vol: 0.22 });
        this.tone(t, 0.9, 93.5, { wave: 'p50', vol: 0.14 });
      },
      slam: () => {
        this.kick(t, 0.6);
        this.noise(t, 0.2, { vol: 0.3, type: 'lowpass', hz: 1600 });
      },
      pop3: () => this.noise(t, 0.25, { vol: 0.25, type: 'highpass', hz: 2000 }),
      cursor: () => this.tone(t, 0.04, 1760, { wave: 'p50', vol: 0.07 }),
      select: () => [0, 0.06].forEach((d, i) => this.tone(t + d, 0.06, [1319, 1976][i], { wave: 'p50', vol: 0.07 })),
    };
    S[name]?.();
  }
}

// ---- Score ----
// Written like an old handheld RPG score: a melody you can hum on top, a second voice harmonizing under it,
// a walking bass, and simple march drums. It follows the picture bar by bar:
//   bars 1-2   the logo: a twinkle up with the shooting star, then a swell into the drums
//   bars 3-4   the theme, in C, as the camera tilts down to the rocket
//   bars 5-6   the melody climbs with each elevator stage and lands on the hatch
//   bars 7-8   minor and low for the defender; a sting for each close-up
//   bars 9-10  a run up into the hit, the spin, the sprint
//   bars 11-13 the climb: one step higher every two beats over a held bass note, a snare roll, the buzzer
//   bars 14-16 up a key to D for the win; the top note lands with the banner
// The title screen then loops the full theme in D (16 bars, with a middle section that climbs back to it).

const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
export const midi = (n) => {
  const m = /^([A-G]#?)(\d)$/.exec(n);
  return NOTE[m[1]] + (Number(m[2]) + 1) * 12;
};
export const hz = (m) => 440 * 2 ** ((m - 69) / 12);
/** "E5:1 r:.5 G5:1/3" -> [{ b, d, m }], beats from the start of the bar. */
export function line(src) {
  const out = [];
  let b = 0;
  for (const tok of src.split(/\s+/).filter(Boolean)) {
    const [n, ds] = tok.split(':');
    const [num, den = 1] = ds.split('/').map(Number);
    const d = num / den;
    if (n !== 'r') out.push({ b, d, m: midi(n) });
    b += d;
  }
  return out;
}
// Chords: 'C', 'Am', 'G7', 'F#m', 'C/G' (after the slash: the bass note).
const QUALITY = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10] };
export function chord(name) {
  const [top, slash] = name.split('/');
  const [, root, q] = /^([A-G]#?)(.*)$/.exec(top);
  return { tones: QUALITY[q].map((i) => (NOTE[root] + i) % 12), bass: 36 + NOTE[slash ?? root] };
}

const SCALE = [0, 2, 4, 5, 7, 9, 11];
/**
 * The second voice's note under melody note m: a chord tone a third to a sixth below when the melody sits on
 * the chord, otherwise the note a third below in the key, so passing notes move in parallel thirds.
 */
export function harmony(m, tones, key) {
  const k = NOTE[key], deg = SCALE.indexOf((m - k + 120) % 12);
  if (!tones.includes(m % 12) && deg >= 0) {
    const below = SCALE[(deg + 5) % 7];
    return m - ((((m - k) % 12) - below + 12) % 12 || 12);
  }
  for (let h = m - 3; h >= m - 9; h--) if (tones.includes(h % 12)) return h;
  return null;
}

// Drums, 16 steps a bar. In 'roll' and 'build' the snare gets louder as the bar goes on.
const DRUMS = {
  march: { k: 'x.......x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
  turn: { k: 'x.......x.......', s: '....x.......x.xx', h: 'x.x.x.x.x.x.x...' },
  half: { k: 'x.........x.....', s: '........x.......', h: 'x...x...x...x...' },
  pulse: { k: 'x...x...x...x...', s: '................', h: '................' },
  roll: { k: 'x...x...x...x...', s: '..x...x.x.x.xxxx', h: '................', cresc: true },
  build: { k: '................', s: '........x.x.xxxx', h: '................', cresc: true },
  fill: { k: 'x.......x.......', s: '........x...xxxx', h: 'x.x.x.x.........' },
  end: { k: 'x...............', s: '............xxxx', h: '................', cresc: true },
};

// The intro, bar by bar (16 bars = 64 beats, matching the shots in intro.js).
//   ch: chord per bar or per half bar; bass: walk | hold | pedal | riff | stab; vol: lead volume.
const INTRO = [
  { ch: ['C'], lead: 'r:.5 C5:.25 E5:.25 G5:.25 C6:.25 E6:1.5 D6:.5 C6:.5', bass: 'hold', vol: 0.09, wave: 'p12', echo: true, harm: false },
  { ch: ['F', 'G'], lead: 'A5:2 G5:2', bass: 'hold', drums: 'build', vol: 0.11 },
  { ch: ['C'], lead: 'G4:.5 C5:.5 E5:.5 G5:.5 C6:1.5 B5:.5', drums: 'march', crash: [0] },
  { ch: ['Am', 'G'], lead: 'A5:.75 G5:.25 E5:.5 C5:.5 D5:1.5 r:.5', drums: 'turn' },
  { ch: ['F', 'G'], lead: 'C5:.25 D5:.25 E5:.25 F5:.25 A5:1 E5:.25 F5:.25 G5:.25 A5:.25 B5:1', drums: 'march' },
  { ch: ['C', 'E7'], lead: 'C6:2 B5:.5 G#5:.5 E5:.5 D5:.5', drums: 'turn', crash: [0], sparkle: [[0.5, 'E6'], [0.75, 'G6'], [1, 'C7']] },
  { ch: ['Am'], lead: 'E4:.25 E4:.25 r:.5 E4:.25 E4:.25 r:.5 F4:.5 E4:.5 D#4:.5 E4:.5', bass: 'riff', drums: 'half', wave: 'p50', harm: false, crash: [0] },
  { ch: ['F', 'E'], lead: 'F5:.75 E5:.25 D#5:1 E5:.5 G#5:.5 B5:1', bass: 'stab', drums: 'half', stabs: [[0, ['F4', 'A4', 'C5']], [2, ['E4', 'G#4', 'B4']]] },
  { ch: ['Am'], lead: 'A4:.25 B4:.25 C5:.25 D5:.25 E5:.25 F5:.25 G#5:.25 A5:.25 A5:.5 r:.5 E5:.25 A5:.25 C6:.25 E6:.25', drums: 'march', crash: [2] },
  { ch: ['C', 'G'], lead: 'G5:.5 C6:.5 B5:.25 C6:.25 D6:.5 E6:1 D6:.5 B5:.5', drums: 'turn' },
  { ch: ['C/G', 'Dm/G'], lead: 'C5:.5 D5:.5 E5:1 D5:.5 E5:.5 F5:1', bass: 'pedal', drums: 'pulse', vol: 0.1 },
  { ch: ['Em/G', 'G7'], lead: 'E5:.5 F5:.5 G5:1 F5:.5 G5:.5 A5:.5 B5:.5', bass: 'pedal', drums: 'roll', vol: 0.12 },
  { ch: ['C', 'A7'], lead: 'C6:2 A4:.25 C#5:.25 E5:.25 G5:.25 A5:.25 C#6:.25 E6:.5', drums: 'fill', crash: [0], vol: 0.14 },
  { ch: ['D'], lead: 'A4:.5 D5:.5 F#5:.5 A5:.5 D6:1.5 C#6:.5', drums: 'march', crash: [0], vol: 0.14, key: 'D' },
  { ch: ['G', 'A'], lead: 'G5:.5 B5:.5 D6:1 A5:.5 C#6:.5 E6:1', drums: 'turn', vol: 0.14, key: 'D' },
  { ch: ['D'], lead: 'F#6:3 r:1', bass: 'hold', drums: 'end', crash: [0], vol: 0.14, key: 'D' },
];
// The title theme, in D. Bars 1-8 state it; bars 9-16 climb E, F#, G, A and fall back into it.
const TITLE = [
  { ch: ['D'], lead: 'A4:.5 D5:.5 F#5:.5 A5:.5 D6:1.5 C#6:.5', crash: [0] },
  { ch: ['Bm'], lead: 'B5:.75 A5:.25 F#5:.5 D5:.5 F#5:2' },
  { ch: ['G'], lead: 'G5:.75 F#5:.25 G5:.5 B5:.5 D6:1 B5:.5 G5:.5' },
  { ch: ['A'], lead: 'A5:2.5 r:.5 E4:.25 F#4:.25 G4:.25 G#4:.25', drums: 'turn' },
  { ch: ['D'], lead: 'A4:.5 D5:.5 F#5:.5 A5:.5 D6:1.5 E6:.5' },
  { ch: ['Bm'], lead: 'F#6:1.5 E6:.5 D6:.5 B5:.5 D6:1' },
  { ch: ['G', 'A'], lead: 'G5:.5 B5:.5 D6:1 E6:.5 F#6:.5 E6:.5 C#6:.5' },
  { ch: ['D', 'B7'], lead: 'D6:2 B5:.5 A5:.5 F#5:.5 D#5:.5', drums: 'turn' },
  { ch: ['Em'], lead: 'E5:.5 G5:.5 B5:1.5 A5:.5 G5:1' },
  { ch: ['F#m'], lead: 'F#5:.5 A5:.5 C#6:1.5 B5:.5 A5:1' },
  { ch: ['G'], lead: 'G5:.5 B5:.5 D6:1.5 C#6:.5 B5:1' },
  { ch: ['A7'], lead: 'A5:.5 C#6:.5 E6:.5 G6:.5 E6:.5 C#6:.5 A5:.5 E5:.5', drums: 'roll' },
  { ch: ['Bm'], lead: 'F#6:2 E6:1 D6:1', crash: [0] },
  { ch: ['G'], lead: 'D6:1.5 B5:.5 G5:1 D6:1' },
  { ch: ['Em'], lead: 'E6:1.5 D6:.5 B5:1 G5:1' },
  { ch: ['A'], lead: 'A5:2.5 r:.5 E4:.25 F#4:.25 G4:.25 G#4:.25', drums: 'fill' },
];
export const INTRO_BEATS = INTRO.length * 4;
export const TITLE_LOOP = TITLE.length * 4;

// Sound effects in each shot, in beats from the start of that shot (kept here so they line up with the music).
const SFX = {
  logo: [[0.5, 'star']],
  rocket: [[3.4, 'whoosh'], [5, 'skid']],
  lift: [[0.2, 'whine'], [4, 'clunk']],
  pan: [[0.4, 'whip'], [2.6, 'rev'], [4.5, 'glint'], [7.3, 'glint']],
  clash: [[0.2, 'rev'], [2, 'impact'], [3, 'spin'], [5, 'whoosh'], [6.5, 'alarm']],
  hab: [[0.8, 'skid'], [1, 'whine'], [3.8, 'clunk'], [6.5, 'whine'], ...[1, 2, 3, 4, 5, 6, 7].map((b) => [b, 'tick']), [8, 'buzzer'], [8.5, 'slam']],
  win: [[0, 'slam'], [0.25, 'slam'], [2, 'pop3'], [4, 'whoosh']],
};
const SHOT_STARTS = { logo: 0, rocket: 8, lift: 16, pan: 24, clash: 32, hab: 40, win: 52 };

/** Turn bars into events [{ b (beats), play(chip, time) }]. o.beat: seconds per beat, for other tempos. */
export function renderBars(bars, o = {}) {
  const beatSec = o.beat ?? BEAT;
  const ev = [];
  const at = (b, play) => ev.push({ b, play });
  bars.forEach((bar, i) => {
    const b0 = i * 4;
    const segs = bar.ch.map((name, j) => ({ ...chord(name), from: (j * 4) / bar.ch.length, len: 4 / bar.ch.length }));
    const chordAt = (b) => segs.findLast((s) => b >= s.from) ?? segs[0];
    const next = bars[i + 1] ?? o.wrap;
    const nextBass = next ? chord(next.ch[0]).bass : segs[0].bass;
    const vol = bar.vol ?? o.vol ?? 0.13;

    // Lead, with a delayed vibrato on long notes, and a second voice under it.
    for (const n of line(bar.lead)) {
      at(b0 + n.b, (c, t) => c.tone(t, beatSec * n.d * 0.92, hz(n.m), { wave: bar.wave ?? 'p25', vol, vib: n.d >= 1 }));
      if (bar.echo) at(b0 + n.b + 0.75, (c, t) => c.tone(t, beatSec * n.d * 0.8, hz(n.m), { wave: 'p12', vol: vol * 0.35, decay: true }));
      if (bar.harm === false || n.d < 0.5) continue;
      const h = harmony(n.m, chordAt(n.b).tones, bar.key ?? o.key);
      if (h) at(b0 + n.b, (c, t) => c.tone(t, beatSec * n.d * 0.92, hz(h), { wave: 'p50', vol: vol * 0.38 }));
    }

    // Bass.
    segs.forEach((s, j) => {
      const r = s.bass, f = r + 7;
      const after = segs[j + 1]?.bass ?? nextBass;
      const approach = after % 12 === r % 12 ? r + 12 : after - 1;
      const style = bar.bass ?? 'walk';
      const eighth = (k, m, len = 0.42, v = 0.4) => at(b0 + s.from + k / 2, (c, t) => c.tone(t, beatSec * len, hz(m), { wave: 'tri', vol: v }));
      if (style === 'hold') at(b0 + s.from, (c, t) => c.tone(t, beatSec * s.len * 0.95, hz(r), { wave: 'tri', vol: 0.28 }));
      else if (style === 'stab') for (let k = 0; k < s.len * 2; k += 2) eighth(k, r, 0.3, 0.45);
      else {
        const pattern = {
          walk: s.len === 4 ? [r, r + 12, f, r + 12, r, r + 12, f, approach] : [r, r + 12, f, approach],
          pedal: [r, r + 12, r, r + 12, r, r + 12, r, r + 12],
          riff: [r, r, r + 12, r, r, r + 12, r + 1, r],
        }[style];
        pattern.slice(0, s.len * 2).forEach((m, k) => eighth(k, m));
      }
    });

    // Drums.
    const pat = DRUMS[bar.drums ?? o.drums];
    if (pat) {
      for (let k = 0; k < 16; k++) {
        const b = b0 + k / 4, rise = pat.cresc ? 0.1 + (k / 16) * 0.3 : 0.3;
        if (pat.k[k] === 'x') at(b, (c, t) => c.kick(t, 0.5));
        if (pat.s[k] === 'x') at(b, (c, t) => c.snare(t, rise));
        if (pat.h[k] === 'x') at(b, (c, t) => c.hat(t, 0.05));
      }
    }
    for (const b of bar.crash ?? []) at(b0 + b, (c, t) => c.crash(t, 0.18));
    // Extras: twinkles and chord stings.
    for (const [b, n] of bar.sparkle ?? []) at(b0 + b, (c, t) => c.tone(t, beatSec * 0.6, hz(midi(n)), { wave: 'p12', vol: 0.07, decay: true }));
    for (const [b, notes] of bar.stabs ?? []) {
      for (const n of notes) at(b0 + b, (c, t) => c.tone(t, beatSec * 0.7, hz(midi(n)), { wave: 'p50', vol: 0.06, decay: true }));
    }
  });
  return ev;
}

/** All intro events with absolute beats, sorted. */
export function introScore() {
  const ev = renderBars(INTRO, { drums: null, key: 'C', wrap: TITLE[0] });
  for (const [shot, list] of Object.entries(SFX)) for (const [b, name] of list) ev.push({ b: SHOT_STARTS[shot] + b, play: (c, t) => c.sfx(name, t) });
  // A rising noise swell under bar 2, into the drums.
  ev.push({ b: 5, play: (c, t) => c.noise(t, BEAT * 3, { vol: 0.2, hz: 2500, swell: true }) });
  return ev.sort((a, b) => a.b - b.b);
}

/** One pass of the title loop, beats from its start. The first pass also thumps when the logo lands. */
export function titleScore(first) {
  const ev = renderBars(TITLE, { drums: 'march', vol: 0.13, key: 'D', wrap: TITLE[0] });
  if (first) {
    ev.push({ b: 0.5, play: (c, t) => c.sfx('slam', t) });
    ev.push({ b: 0.5, play: (c, t) => c.crash(t, 0.22) });
  }
  return ev.sort((a, b) => a.b - b.b);
}

/**
 * Plays the score from a given beat. Call pump() every frame: it queues what is due in the next moment.
 * Beat 0..INTRO_BEATS is the intro, then the title theme loops forever.
 */
export class Player {
  constructor(chip) {
    this.chip = chip;
    this.intro = introScore();
    this.title = [titleScore(true), titleScore(false)];
  }
  /** Start (or jump) so that `beat` plays at audio time `when`. */
  play(beat, when = this.chip.now() + 0.06) {
    this.t0 = when - beat * BEAT;
    this.cursor = beat;
    this.chip.newBus();
  }
  beatAt(time) {
    return (time - this.t0) / BEAT;
  }
  pump(ahead = 0.25) {
    if (!this.chip.ready || this.t0 == null) return;
    const now = this.chip.now(), until = this.beatAt(now + ahead), floor = this.beatAt(now - 0.03);
    const from = Math.max(this.cursor, floor);
    if (until <= from) return;
    const run = (b, play) => {
      if (b >= from && b < until) play(this.chip, this.t0 + b * BEAT);
    };
    if (from < INTRO_BEATS) for (const e of this.intro) run(e.b, e.play);
    if (until > INTRO_BEATS) {
      const k0 = Math.max(0, Math.floor((from - INTRO_BEATS) / TITLE_LOOP));
      const k1 = Math.floor((until - INTRO_BEATS) / TITLE_LOOP);
      for (let k = k0; k <= k1; k++) {
        const base = INTRO_BEATS + k * TITLE_LOOP;
        for (const e of this.title[k === 0 ? 0 : 1]) run(base + e.b, e.play);
      }
    }
    this.cursor = until;
  }
}
