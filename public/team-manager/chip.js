// A tiny Game Boy-style synth (two pulse voices, a triangle bass, noise drums) and the intro's score.
// Everything is scheduled ahead on the audio clock, and the picture reads the same clock, so cuts land on the beat.

export const BPM = 150;
export const BEAT = 60 / BPM;

// ---- Synth ----
export class Chip {
  constructor() {
    this.ac = null;
    this.muted = false;
  }
  /**
   * Call from a tap or key press: browsers only allow sound after the viewer interacts.
   * Pass an OfflineAudioContext to render the music to a buffer instead.
   */
  start(context) {
    if (!this.ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!context && !AC) return false;
      const ac = (this.ac = context ?? new AC());
      this.master = ac.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      this.master.connect(comp).connect(ac.destination);
      this.noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.waves = { p12: this.pulse(0.125), p25: this.pulse(0.25), p50: this.pulse(0.5) };
      this.bus = null;
    }
    this.ac.resume?.()?.catch?.(() => {});
    return true;
  }
  get ready() {
    return !!this.ac;
  }
  now() {
    return this.ac ? this.ac.currentTime : performance.now() / 1000;
  }
  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ac.currentTime, 0.02);
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
      chime: () => [0, 1, 2, 3].forEach((i) => this.tone(t + i * 0.05, 0.12, [1568, 2093, 2637, 3136][i], { wave: 'p12', vol: 0.05, decay: true })),
      whoosh: () => this.noise(t, 0.45, { vol: 0.22, type: 'bandpass', hz: 400, sweep: 3500, q: 1.2 }),
      whip: () => this.noise(t, 0.7, { vol: 0.25, type: 'bandpass', hz: 300, sweep: 4000, q: 1.5 }),
      skid: () => this.noise(t, 0.3, { vol: 0.16, type: 'bandpass', hz: 1500, sweep: 700, q: 3 }),
      pop: () => this.tone(t, 0.08, 520, { wave: 'p50', slide: 1300, vol: 0.12 }),
      pop2: () => this.tone(t, 0.08, 700, { wave: 'p50', slide: 1800, vol: 0.12 }),
      clunk: () => {
        this.tone(t, 0.12, 140, { wave: 'p50', slide: 60, vol: 0.25, decay: true });
        this.noise(t, 0.12, { vol: 0.3, type: 'lowpass', hz: 900 });
      },
      blip: () => this.tone(t, 0.05, 1320, { wave: 'p25', vol: 0.08 }),
      light: () => this.tone(t, 0.09, 1760, { wave: 'p12', vol: 0.06, decay: true }),
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
      type: () => this.tone(t, 0.02, 880, { wave: 'p50', vol: 0.03 }),
    };
    S[name]?.();
  }
}

// ---- Score ----
// Notes are "name:beats", r = rest. Bars are 4 beats; | is only for reading.
const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const midi = (n) => {
  const m = /^([A-G]#?)(\d)$/.exec(n);
  return NOTE[m[1]] + (Number(m[2]) + 1) * 12;
};
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
function line(src) {
  const out = [];
  let b = 0;
  for (const tok of src.split(/\s+/).filter((s) => s && s !== '|')) {
    const [n, d] = tok.split(':');
    if (n !== 'r') out.push({ b, d: Number(d), m: midi(n) });
    b += Number(d);
  }
  return out;
}
const CHORDS = {
  Em: ['E', 'G', 'B'], C: ['C', 'E', 'G'], D: ['D', 'F#', 'A'], B: ['B', 'D#', 'F#'], Am: ['A', 'C', 'E'],
  E: ['E', 'G#', 'B'], 'C#m': ['C#', 'E', 'G#'], A: ['A', 'C#', 'E'],
};
const pc = (n) => NOTE[n];

// Drum patterns, 16 steps per bar.
const DRUMS = {
  main: { k: 'x.......x.x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
  half: { k: 'x.........x.....', s: '........x.......', h: 'xxxxxxxxxxxxxxxx' },
  pulse: { k: 'x...x...x...x...', s: '................', h: '................' },
  roll: { k: 'x...x...x...x...', s: '..x...x...x.xxxx', h: '..x...x...x.....' },
  fill: { k: 'x...............', s: '............xxxx', h: '................' },
};

// The intro, one section per shot. Section lengths in beats must match the shots in intro.js.
const SECTIONS = [
  { name: 'logo', chords: ['Em', 'Em'], arp: 'slow', drums: null },
  { name: 'rocket', chords: ['Em', 'C'], drums: 'main', lead: 'E5:1 B4:.5 E5:.5 G5:1 F#5:.5 E5:.5 | G5:1.5 A5:.5 G5:1 E5:1' },
  { name: 'lift', chords: ['D', 'B'], drums: 'main', lead: 'F#5:1 D5:.5 F#5:.5 A5:1 G5:.5 F#5:.5 | B5:1.5 A5:.5 G5:.5 F#5:.5 D#5:1' },
  { name: 'pan', chords: ['Am', 'Em'], drums: 'half', bass: 'stab', lead: 'A4:.5 A4:.5 C5:.5 A4:.5 E5:1 D#5:1 | E5:.5 E5:.5 G5:.5 E5:.5 B5:1 A#5:.5 B5:.5' },
  { name: 'clash', chords: ['C', 'D'], drums: 'main', lead: 'G5:.5 G5:.5 r:1 E5:.5 G5:.5 C6:1 | B5:.5 A5:.5 B5:.5 A5:.5 F#5:.5 A5:.5 D6:1' },
  { name: 'hab', chords: ['B', 'B', 'E'], drums: ['pulse', 'roll', 'fill'], bass: 'pedal', arp: 'none', lead: 'B4:2 C5:2 | C#5:2 D#5:2 | E5:1 r:1.5 B4:.5 C#5:.5 D#5:.5' },
  { name: 'win', chords: ['A', 'B', 'E'], drums: 'main', lead: 'E5:.5 A5:.5 C#6:1 B5:.5 A5:.5 B5:.5 C#6:.5 | F#5:.5 B5:.5 D#6:1 C#6:.5 B5:.5 C#6:.5 D#6:.5 | E6:4' },
];
const TITLE = {
  chords: ['E', 'C#m', 'A', 'B', 'E', 'C#m', 'A', 'E'],
  split: { 6: ['A', 'B'] },
  lead:
    'B4:.5 E5:.5 G#5:1 F#5:.5 E5:.5 F#5:1 | G#5:1.5 E5:.5 C#5:1 E5:1 | A5:1 G#5:.5 F#5:.5 E5:1 C#5:.5 E5:.5 | F#5:2 D#5:1 B4:1 | ' +
    'B4:.5 E5:.5 G#5:1 B5:.5 G#5:.5 B5:1 | C#6:1.5 B5:.5 G#5:1 E5:1 | A5:1 C#6:1 B5:1 D#6:1 | E6:2 B5:1 G#5:1',
};
export const INTRO_BEATS = SECTIONS.reduce((n, s) => n + s.chords.length * 4, 0);
export const TITLE_LOOP = TITLE.chords.length * 4;

// Sound effects in each shot, in beats from the start of that shot (kept here so they line up with the music).
const SFX = {
  logo: [[0.5, 'star'], [1.6, 'chime'], [3, 'chime']],
  rocket: [[3.4, 'whoosh'], [5, 'skid']],
  lift: [[0.25, 'pop'], [2, 'pop2'], [4, 'clunk'], [4.5, 'light'], [4.75, 'light'], [5, 'light']],
  pan: [[0.4, 'whip'], [2.6, 'rev'], [4.5, 'glint'], [6.2, 'rev'], [7.3, 'glint']],
  clash: [[0.2, 'rev'], [2, 'impact'], [3, 'spin'], [5, 'whoosh'], [6.5, 'alarm']],
  hab: [[0.8, 'skid'], [1, 'whine'], [3.8, 'clunk'], [6.5, 'whine'], ...[1, 2, 3, 4, 5, 6, 7].map((b) => [b, 'tick']), [8, 'buzzer'], [8.5, 'slam']],
  win: [[0, 'slam'], [0.25, 'slam'], [2, 'pop3'], [4, 'whoosh'], [8, 'chime']],
};

/** Events for one section: [{ b (beats from section start), play(chip, time) }]. */
function sectionEvents(sec) {
  const ev = [];
  const at = (b, play) => ev.push({ b, play });
  const bars = sec.chords;
  bars.forEach((name, bar) => {
    const ch = CHORDS[name], root = pc(ch[0]), b0 = bar * 4;
    const rootM = 36 + root; // C2..B2
    // Bass.
    for (let i = 0; i < 8; i++) {
      const b = b0 + i / 2;
      if (sec.bass === 'pedal') at(b, (c, t) => c.tone(t, BEAT * 0.4, hz(i % 2 ? 47 : 35), { wave: 'tri', vol: 0.4 }));
      else if (sec.bass === 'stab') {
        if (i % 2 === 0 || i === 7) at(b, (c, t) => c.tone(t, BEAT * 0.3, hz(rootM - (i === 7 ? 1 : 0)), { wave: 'tri', vol: 0.42 }));
      } else if (sec.name !== 'logo' && !(sec.name === 'hab' && bar === 2 && i > 0)) {
        const m = rootM + (i % 2 ? 12 : 0);
        at(b, (c, t) => c.tone(t, BEAT * 0.42, hz(m), { wave: 'tri', vol: 0.4 }));
      }
    }
    // Arpeggios: 16ths, chord tones up and down.
    const tones = [ch[0], ch[1], ch[2]].map((n) => 60 + pc(n));
    tones.sort((a, b) => a - b);
    const arp = [tones[0], tones[1], tones[2], tones[0] + 12, tones[2], tones[1]];
    if (sec.arp === 'slow') {
      for (let i = 0; i < 8; i++) {
        const m = arp[i % 6];
        at(b0 + i / 2, (c, t) => {
          c.tone(t, BEAT * 0.45, hz(m), { wave: 'p12', vol: 0.07, decay: true });
          c.tone(t + BEAT * 0.75, BEAT * 0.45, hz(m), { wave: 'p12', vol: 0.025, decay: true });
        });
      }
    } else if (sec.arp !== 'none' && !(sec.name === 'hab')) {
      for (let i = 0; i < 16; i++) at(b0 + i / 4, (c, t) => c.tone(t, BEAT * 0.22, hz(arp[i % 6]), { wave: 'p12', vol: 0.035 }));
    }
    // Drums.
    const pat = DRUMS[Array.isArray(sec.drums) ? sec.drums[bar] : sec.drums];
    if (pat) {
      for (let i = 0; i < 16; i++) {
        const b = b0 + i / 4;
        if (pat.k[i] === 'x') at(b, (c, t) => c.kick(t));
        if (pat.s[i] === 'x') at(b, (c, t) => c.snare(t, sec.name === 'hab' && bar === 1 ? 0.12 + i * 0.015 : 0.32));
        if (pat.h[i] === 'x') at(b, (c, t) => c.hat(t, pat === DRUMS.half ? 0.04 : 0.07));
      }
    }
  });
  // Long pad and a reverse cymbal into the drums.
  if (sec.name === 'logo') {
    at(0, (c, t) => c.tone(t, BEAT * 8, hz(52), { wave: 'tri', vol: 0.18, vib: true }));
    at(6, (c, t) => c.noise(t, BEAT * 2, { vol: 0.22, hz: 2500, swell: true }));
  }
  // Lead, doubled by a quieter detuned voice.
  for (const n of line(sec.lead ?? '')) {
    at(n.b, (c, t) => {
      const long = n.d >= 1;
      c.tone(t, BEAT * n.d * 0.92, hz(n.m), { wave: 'p25', vol: 0.13, vib: long });
      c.tone(t, BEAT * n.d * 0.92, hz(n.m), { wave: 'p12', vol: 0.045, detune: 9 });
    });
  }
  // Crashes on the big moments.
  const crashes = { rocket: [0], lift: [4], pan: [0], clash: [2], hab: [8], win: [0, 8] }[sec.name] ?? [];
  for (const b of crashes) at(b, (c, t) => c.crash(t));
  for (const [b, name] of SFX[sec.name] ?? []) at(b, (c, t) => c.sfx(name, t));
  return ev;
}

/** All intro events with absolute beats, sorted. */
export function introScore() {
  const ev = [];
  let b0 = 0;
  for (const sec of SECTIONS) {
    for (const e of sectionEvents(sec)) ev.push({ b: b0 + e.b, play: e.play });
    b0 += sec.chords.length * 4;
  }
  return ev.sort((a, b) => a.b - b.b);
}

/** One pass of the title loop, beats from its start. */
export function titleScore(first) {
  const ev = [];
  const at = (b, play) => ev.push({ b, play });
  TITLE.chords.forEach((name, bar) => {
    const halves = TITLE.split[bar] ?? [name, name];
    halves.forEach((hn, half) => {
      const ch = CHORDS[hn], root = pc(ch[0]), rootM = 36 + root;
      const tones = ch.map((n) => 60 + pc(n)).sort((a, b) => a - b);
      const arp = [tones[0], tones[1], tones[2], tones[0] + 12, tones[2], tones[1]];
      for (let i = 0; i < 4; i++) {
        const b = bar * 4 + half * 2 + i / 2;
        const m = rootM + (i % 2 ? 12 : 0);
        at(b, (c, t) => c.tone(t, BEAT * 0.42, hz(m), { wave: 'tri', vol: 0.4 }));
      }
      for (let i = 0; i < 8; i++) at(bar * 4 + half * 2 + i / 4, (c, t) => c.tone(t, BEAT * 0.22, hz(arp[i % 6]), { wave: 'p12', vol: 0.03 }));
    });
    const pat = DRUMS.main;
    for (let i = 0; i < 16; i++) {
      const b = bar * 4 + i / 4;
      if (pat.k[i] === 'x') at(b, (c, t) => c.kick(t, 0.45));
      if (pat.s[i] === 'x') at(b, (c, t) => c.snare(t, 0.26));
      if (pat.h[i] === 'x') at(b, (c, t) => c.hat(t, 0.05));
    }
  });
  for (const n of line(TITLE.lead)) {
    at(n.b, (c, t) => {
      c.tone(t, BEAT * n.d * 0.92, hz(n.m), { wave: 'p25', vol: 0.12, vib: n.d >= 1 });
      c.tone(t, BEAT * n.d * 0.92, hz(n.m), { wave: 'p12', vol: 0.04, detune: 9 });
    });
  }
  if (first) {
    at(0.5, (c, t) => c.sfx('slam', t));
    at(0.5, (c, t) => c.crash(t, 0.25));
  }
  at(0, (c, t) => c.crash(t, 0.12));
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
