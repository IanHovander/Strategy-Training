// Theme candidates for Blue Banner, and a small "band" synth to hear them as a rough TV-theme mockup.
// Each theme is written once (melody, chords, a few arrangement marks per bar) and plays two ways:
//   band: distorted power chords, bass, drums, reverb and a lead standing in for the singer (or brass for the march)
//   chip: the same notes through the Game Boy synth in chip.js, which is how the chosen one ends up in the game.
// All melodies here are original.

import { line, chord, harmony, renderBars, hz } from './chip.js';

// Bar fields: sec (section label, on its first bar), ch (chord per bar or per half bar), lead,
// gtr (rhythm guitar: chug | drive | open | open8 | hits4 | stopHit | ring), beat (drums), crash (beats),
// harm (a second voice on the melody), key (for that harmony), str / pad / tuba (march orchestra).
export const THEMES = [
  {
    id: 'anthem',
    name: 'Blue Banner!',
    style: 'Saturday-morning TV anthem',
    blurb: 'The Pokémon-show formula: crunchy guitar intro, palm-muted verse, a pre-chorus that climbs, and a chorus that shouts the title.',
    listen: 'The "BLUE BAN-NER!" call in the chorus, answered by a fast line underneath.',
    bpm: 148, key: 'A', lead: 'sing',
    bars: [
      { sec: 'Intro', ch: ['A'], lead: 'A5:1 C#6:1 E6:2', gtr: 'open8', beat: 'rock', crash: [0] },
      { ch: ['G', 'D'], lead: 'D6:1 B5:1 A5:2', gtr: 'open8', beat: 'fill' },
      { sec: 'Verse', ch: ['A'], lead: 'r:.5 E4:.5 A4:.5 A4:.5 A4:.5 B4:.25 C#5:.75 A4:.5', gtr: 'chug', beat: 'rock', crash: [0] },
      { ch: ['G'], lead: 'r:.5 D5:.5 D5:.5 D5:.5 B4:.5 G4:.5 A4:.5 B4:.5', gtr: 'chug', beat: 'rock' },
      { ch: ['D'], lead: 'r:.5 A4:.5 D5:.5 D5:.5 D5:.5 E5:.25 F#5:.75 D5:.5', gtr: 'chug', beat: 'rock' },
      { ch: ['A'], lead: 'E5:1.5 D5:.5 C#5:1 B4:1', gtr: 'chug', beat: 'fill' },
      { sec: 'Pre-chorus', ch: ['F#m'], lead: 'C#5:.5 C#5:.5 C#5:.5 B4:.5 A4:.5 B4:.5 C#5:1', gtr: 'drive', beat: 'drive' },
      { ch: ['D'], lead: 'D5:.5 D5:.5 D5:.5 C#5:.5 B4:.5 C#5:.5 D5:1', gtr: 'drive', beat: 'drive' },
      { ch: ['E'], lead: 'E5:.5 E5:.5 E5:.5 D5:.5 C#5:.5 D5:.5 E5:1', gtr: 'drive', beat: 'drive' },
      { ch: ['E'], lead: 'E5:1 F#5:1 G#5:1 B5:1', gtr: 'hits4', beat: 'build' },
      { sec: 'Chorus', ch: ['A'], lead: 'A5:1 C#6:1 E6:2', gtr: 'open8', beat: 'rock', crash: [0], harm: true },
      { ch: ['E'], lead: 'r:.5 E5:.5 G#5:.5 B5:.5 B5:.5 A5:.5 G#5:.5 E5:.5', gtr: 'open8', beat: 'rock' },
      { ch: ['F#m'], lead: 'F#5:1 A5:1 C#6:2', gtr: 'open8', beat: 'rock', crash: [0], harm: true },
      { ch: ['D'], lead: 'r:.5 D5:.5 F#5:.5 A5:.5 A5:.5 G#5:.5 F#5:.5 E5:.5', gtr: 'open8', beat: 'rock' },
      { ch: ['A'], lead: 'A5:1 C#6:1 E6:2', gtr: 'open8', beat: 'rock', crash: [0], harm: true },
      { ch: ['E'], lead: 'r:.5 E6:.5 E6:.5 E6:.5 F#6:.5 E6:.5 D6:.5 C#6:.5', gtr: 'open8', beat: 'rock', harm: true },
      { ch: ['D', 'E'], lead: 'D6:1 B5:1 G#5:.5 A5:.5 B5:1', gtr: 'open8', beat: 'fill', harm: true },
      { ch: ['A'], lead: 'A5:1 C#6:1 E6:2', gtr: 'ring', beat: 'end', crash: [0], harm: true },
    ],
  },
  {
    id: 'march',
    name: 'Kickoff March',
    style: 'Heroic brass march',
    blurb: 'An adventure-movie opening: triplet fanfare, a dotted march theme, then a key-lifting finale (A-flat, B-flat, C).',
    listen: 'The fanfare in the last four bars, each one a step higher.',
    bpm: 126, key: 'C', lead: 'brass', chipShift: 12,
    bars: [
      { sec: 'Fanfare', ch: ['C'], lead: 'G3:1/3 G3:1/3 G3:1/3 C4:1 G3:1 E4:1', beat: 'timp', crash: [0], harm: true },
      { ch: ['G'], lead: 'D4:1/3 D4:1/3 D4:1/3 G4:2 r:1', beat: 'timproll', harm: true },
      { sec: 'Theme', ch: ['C'], lead: 'C4:.75 G3:.25 C4:.75 E4:.25 G4:1.5 E4:.5', beat: 'march', crash: [0], str: true, tuba: true },
      { ch: ['F'], lead: 'F4:.75 E4:.25 D4:.5 C4:.5 A4:2', beat: 'march', str: true, tuba: true },
      { ch: ['Dm', 'G'], lead: 'D4:.75 E4:.25 F4:.5 A4:.5 G4:1 B3:1', beat: 'march', str: true, tuba: true },
      { ch: ['C'], lead: 'C4:2 r:.5 G3:.5 C4:.5 E4:.5', beat: 'march', str: true, tuba: true },
      { sec: 'Theme, higher', ch: ['Am'], lead: 'E4:.75 C4:.25 E4:.75 A4:.25 C5:1.5 B4:.5', beat: 'march', str: true, tuba: true, harm: true, crash: [0] },
      { ch: ['F'], lead: 'A4:.75 G4:.25 F4:.5 A4:.5 C5:2', beat: 'march', str: true, tuba: true, harm: true },
      { ch: ['D7'], lead: 'D5:.75 C5:.25 A4:.5 F#4:.5 A4:1 D5:1', beat: 'march', str: true, tuba: true, harm: true },
      { ch: ['G'], lead: 'B4:2 G4:1 r:1', beat: 'roll', pad: true, tuba: true },
      { sec: 'Finale', ch: ['G#'], lead: 'C5:1/3 C5:1/3 C5:1/3 D#5:2 C5:1', beat: 'fanfare', crash: [0], harm: true, pad: true, tuba: true },
      { ch: ['A#'], lead: 'D5:1/3 D5:1/3 D5:1/3 F5:2 D5:1', beat: 'fanfare', crash: [0], harm: true, pad: true, tuba: true },
      { ch: ['C'], lead: 'E5:1/3 E5:1/3 E5:1/3 G5:2 E5:1', beat: 'fanfare', crash: [0], harm: true, pad: true, tuba: true },
      { ch: ['C'], lead: 'C5:3 r:1', beat: 'timproll', crash: [0], harm: true, pad: true },
    ],
  },
  {
    id: 'rival',
    name: 'Rival Rush',
    style: 'Fast pop-punk opening',
    blurb: 'A minor-key guitar riff and an urgent verse that break into a bright major chorus. Think anime opening, rival-battle energy.',
    listen: 'The jump from the minor verse into the major chorus, and the riff in the first two bars.',
    bpm: 168, key: 'G', lead: 'guitar',
    bars: [
      { sec: 'Riff', ch: ['Em'], lead: 'E4:.5 E4:.25 G4:.25 E4:.5 A4:.5 E4:.5 B4:.5 A4:.5 G4:.5', gtr: 'chug', beat: 'punk', crash: [0] },
      { ch: ['C', 'D'], lead: 'C5:.5 B4:.5 G4:.5 E4:.5 D5:1 A4:.5 F#4:.5', gtr: 'chug', beat: 'fill' },
      { sec: 'Verse', ch: ['Em'], lead: 'r:.5 B4:.5 B4:.5 B4:.5 A4:.5 G4:.5 A4:.5 B4:.5', gtr: 'chug', beat: 'punk', crash: [0] },
      { ch: ['C'], lead: 'C5:1 B4:.5 A4:.5 G4:1 E4:1', gtr: 'chug', beat: 'punk' },
      { ch: ['G'], lead: 'r:.5 D5:.5 D5:.5 D5:.5 C5:.5 B4:.5 C5:.5 D5:.5', gtr: 'chug', beat: 'punk' },
      { ch: ['D'], lead: 'E5:1 D5:.5 C5:.5 B4:1 A4:1', gtr: 'chug', beat: 'punk' },
      { sec: 'Pre-chorus', ch: ['C'], lead: 'G4:.5 A4:.5 B4:.5 C5:.5 D5:.5 E5:.5 F#5:.5 G5:.5', gtr: 'drive', beat: 'build' },
      { ch: ['D'], lead: 'A5:2 r:1 D5:.5 D5:.5', gtr: 'stopHit', beat: 'stop' },
      { sec: 'Chorus', ch: ['G'], lead: 'G5:.5 G5:.5 A5:.5 B5:.5 D6:1.5 B5:.5', gtr: 'open8', beat: 'punk', crash: [0], harm: true },
      { ch: ['D'], lead: 'A5:1 G5:.5 A5:.5 F#5:2', gtr: 'open8', beat: 'punk', harm: true },
      { ch: ['Em'], lead: 'E5:.5 E5:.5 F#5:.5 G5:.5 B5:1.5 G5:.5', gtr: 'open8', beat: 'punk', harm: true },
      { ch: ['C'], lead: 'A5:1 G5:.5 E5:.5 D5:2', gtr: 'open8', beat: 'punk', harm: true },
      { ch: ['G'], lead: 'G5:.5 G5:.5 A5:.5 B5:.5 D6:1.5 B5:.5', gtr: 'open8', beat: 'punk', crash: [0], harm: true },
      { ch: ['D'], lead: 'D6:1 E6:.5 D6:.5 A5:2', gtr: 'open8', beat: 'punk', harm: true },
      { ch: ['C', 'D'], lead: 'C6:.5 B5:.5 G5:1 A5:.5 B5:.5 C6:.5 D6:.5', gtr: 'open8', beat: 'fill', harm: true },
      { ch: ['G'], lead: 'B5:1 A5:.5 B5:.5 G5:2', gtr: 'ring', beat: 'end', crash: [0], harm: true },
    ],
  },
];

/** Section start bars: [{ sec, bar }]. */
export const sections = (theme) => theme.bars.flatMap((bar, i) => (bar.sec ? [{ sec: bar.sec, bar: i }] : []));

// ---- Band synth ----

const driveCurve = (k) => {
  const n = 2048, c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  return c;
};

const LEADS = {
  // Stands in for the singer: two bright oscillators through a vowel-like resonant filter.
  sing: { waves: ['sawtooth', 'square'], detune: [-5, 5], filter: [2300, 4], v: 0.26, a: 0.02, d: 0.25, s: 0.85, r: 0.09, send: 0.28, vib: true },
  guitar: { waves: ['sawtooth', 'sawtooth'], detune: [-7, 7], drive: 'lead', pre: 0.5, filter: [3200, 1.2], v: 0.3, a: 0.004, d: 0.3, s: 0.8, r: 0.1, send: 0.25, vib: true },
  brass: { waves: ['sawtooth', 'sawtooth'], detune: [-6, 6], filter: [1700, 1.6], swell: [450, 2800], v: 0.3, a: 0.035, d: 0.25, s: 0.8, r: 0.1, send: 0.3, vib: true },
};

export class Band {
  constructor(chip) {
    this.chip = chip;
    this.ac = null;
    this.bus = null;
  }
  ensure() {
    if (this.ac) return;
    const ac = (this.ac = this.chip.ac);
    this.curves = { crunch: driveCurve(40), lead: driveCurve(14), warm: driveCurve(4) };
    // Reverb: a hall made from decaying noise.
    this.verb = ac.createConvolver();
    const len = Math.floor(ac.sampleRate * 2.2), ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    }
    this.verb.buffer = ir;
    const wet = ac.createGain();
    wet.gain.value = 0.22;
    this.verb.connect(wet).connect(this.chip.master);
  }
  /** A fresh output; whatever is still queued on the old one fades out. */
  newBus() {
    this.ensure();
    const ac = this.ac, old = this.bus;
    if (old) {
      old.out.gain.setTargetAtTime(0, ac.currentTime, 0.02);
      old.send.gain.setTargetAtTime(0, ac.currentTime, 0.02);
      setTimeout(() => {
        old.out.disconnect();
        old.send.disconnect();
      }, 500);
    }
    const out = ac.createGain(), send = ac.createGain();
    out.gain.value = 0.85; // headroom: the band is denser than the chip voices
    out.connect(this.chip.master);
    send.connect(this.verb);
    this.bus = { out, send };
  }
  /** One synth voice: oscillators per frequency -> optional drive -> filter -> envelope -> bus (+ reverb send). */
  voice(t, dur, freqs, o) {
    const ac = this.ac;
    const mix = ac.createGain();
    mix.gain.value = o.pre ?? 1 / Math.max(1, freqs.length);
    const stop = t + dur + (o.r ?? 0.05) + 0.05;
    for (const f of freqs) {
      o.waves.forEach((w, i) => {
        const osc = ac.createOscillator();
        osc.type = w;
        osc.frequency.setValueAtTime(f, t);
        if (o.drop) osc.frequency.exponentialRampToValueAtTime(f * o.drop, t + Math.min(dur, 0.3));
        osc.detune.value = o.detune?.[i] ?? 0;
        if (o.vib && dur > 0.3) {
          const lfo = ac.createOscillator(), depth = ac.createGain();
          lfo.frequency.value = 5.6;
          depth.gain.setValueAtTime(0, t);
          depth.gain.linearRampToValueAtTime(f * 0.007, t + 0.3);
          lfo.connect(depth).connect(osc.frequency);
          lfo.start(t);
          lfo.stop(stop);
        }
        osc.connect(mix);
        osc.start(t);
        osc.stop(stop);
      });
    }
    let node = mix;
    if (o.drive) {
      const sh = ac.createWaveShaper();
      sh.curve = this.curves[o.drive];
      sh.oversample = '2x';
      node.connect(sh);
      node = sh;
    }
    const filter = ac.createBiquadFilter();
    filter.type = o.ftype ?? 'lowpass';
    filter.Q.value = o.filter[1];
    if (o.swell) {
      filter.frequency.setValueAtTime(o.swell[0], t);
      filter.frequency.linearRampToValueAtTime(o.swell[1], t + 0.06);
      filter.frequency.linearRampToValueAtTime(o.filter[0], t + 0.35);
    } else filter.frequency.value = o.filter[0];
    node.connect(filter);
    const g = ac.createGain(), v = o.v, a = o.a ?? 0.005, d = Math.min(o.d ?? 0.1, Math.max(0.01, dur - a)), s = o.s ?? 0.7;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + a);
    g.gain.linearRampToValueAtTime(v * s, t + a + d);
    g.gain.setValueAtTime(v * s, Math.max(t + a + d, t + dur));
    g.gain.linearRampToValueAtTime(0, t + dur + (o.r ?? 0.05));
    filter.connect(g);
    g.connect(this.bus.out);
    if (o.send) {
      const sg = ac.createGain();
      sg.gain.value = o.send;
      g.connect(sg).connect(this.bus.send);
    }
  }
  noise(t, dur, o) {
    const ac = this.ac, src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = this.chip.noiseBuf;
    src.loop = true;
    f.type = o.type;
    f.frequency.value = o.hz;
    f.Q.value = o.q ?? 0.7;
    g.gain.setValueAtTime(o.v, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(f).connect(g).connect(this.bus.out);
    if (o.send) {
      const sg = ac.createGain();
      sg.gain.value = o.send;
      g.connect(sg).connect(this.bus.send);
    }
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  // Instruments.
  lead(kind, t, dur, m, level = 1) {
    const L = LEADS[kind];
    this.voice(t, dur, [hz(m)], { ...L, v: L.v * level });
    if (kind === 'brass') this.voice(t, dur, [hz(m - 12)], { ...L, v: L.v * level * 0.45, send: 0.15 });
  }
  power(t, dur, root, mute) {
    this.voice(t, dur, [hz(root), hz(root + 7), hz(root + 12)], {
      waves: ['sawtooth', 'sawtooth'], detune: [-9, 9], drive: 'crunch', pre: 0.22,
      filter: [mute ? 1000 : 3600, 0.8], v: mute ? 0.065 : 0.055, a: 0.003, d: 0.15, s: mute ? 0.35 : 0.8, r: mute ? 0.03 : 0.15, send: 0.06,
    });
  }
  bass(t, dur, m) {
    this.voice(t, dur, [hz(m)], { waves: ['sawtooth', 'square'], drive: 'warm', pre: 0.5, filter: [850, 1.2], v: 0.16, a: 0.004, d: 0.12, s: 0.7, r: 0.05 });
  }
  tuba(t, dur, m) {
    this.voice(t, dur, [hz(m)], { waves: ['square'], filter: [520, 1.4], v: 0.2, a: 0.02, d: 0.1, s: 0.75, r: 0.06 });
  }
  strings(t, dur, m) {
    this.voice(t, dur, [hz(m)], { waves: ['sawtooth'], filter: [2400, 0.7], v: 0.03, a: 0.004, d: 0.08, s: 0.3, r: 0.05, send: 0.2 });
  }
  pad(t, dur, notes) {
    this.voice(t, dur, notes.map(hz), { waves: ['sawtooth', 'sawtooth'], detune: [-10, 10], filter: [1700, 0.7], v: 0.04, a: 0.2, d: 0.3, s: 0.9, r: 0.4, send: 0.4 });
  }
  timpani(t, m, v = 0.4) {
    this.voice(t, 0.7, [hz(m)], { waves: ['sine', 'triangle'], drop: 0.96, filter: [900, 0.7], v, a: 0.003, d: 0.6, s: 0.05, r: 0.2, send: 0.3 });
    this.noise(t, 0.12, { type: 'lowpass', hz: 300, v: v * 0.5 });
  }
  kick(t, v = 0.6) {
    this.voice(t, 0.25, [140], { waves: ['sine'], drop: 0.3, filter: [2000, 0.7], v, a: 0.002, d: 0.22, s: 0.01, r: 0.03 });
    this.noise(t, 0.012, { type: 'highpass', hz: 2500, v: v * 0.25 });
  }
  snare(t, v = 0.38) {
    this.noise(t, 0.17, { type: 'bandpass', hz: 1900, q: 0.6, v, send: 0.18 });
    this.voice(t, 0.09, [195], { waves: ['triangle'], drop: 0.75, filter: [3000, 0.7], v: v * 0.6, a: 0.002, d: 0.08, s: 0.05, r: 0.02 });
  }
  hat(t, v = 0.12) {
    this.noise(t, 0.04, { type: 'highpass', hz: 7500, v });
  }
  crash(t, v = 0.2) {
    this.noise(t, 1.8, { type: 'highpass', hz: 4500, v, send: 0.3 });
  }
  tom(t, m, v = 0.45) {
    this.voice(t, 0.25, [hz(m)], { waves: ['sine'], drop: 0.7, filter: [2000, 0.7], v, a: 0.002, d: 0.22, s: 0.05, r: 0.03, send: 0.15 });
  }
}

// ---- Arrangements ----

// Drums, 16 steps a bar: k kick, s snare, h hat, t toms (falling); cresc ramps the snare up through the bar.
const KIT = {
  rock: { k: 'x.....x.x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
  drive: { k: 'x.x.x.x.x.x.x.x.', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
  punk: { k: 'x.....x.x.....x.', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
  fill: { k: 'x.....x.x.......', s: '....x...........', h: 'x.x.x.x.........', t: '........xx.x.xxx' },
  build: { k: 'x...x...x...x...', s: 'x.x.x.x.xxxxxxxx', h: '................', cresc: true },
  stop: { k: 'x...........x.x.', s: 'x...........x.x.', h: '................' },
  end: { k: 'x...............', s: '................', h: '................' },
  march: { k: 'x.......x.......', s: 'x.xxx.x.x.xxx.x.', h: '................', march: true },
  roll: { k: 'x...............', s: 'xxxxxxxxxxxxxxxx', h: '................', cresc: true },
  fanfare: { k: 'x.......x.......', s: 'x.xxx.x.x.xxx.x.', h: '................', march: true, timp: [[0, 0], [2, 7]] },
  timp: { timp: [[0, 0], [2, 7]] },
  timproll: { timproll: true },
};
const range = (n) => Array.from({ length: n }, (_, i) => i);
/** Rhythm-guitar strums in a chord segment: [beat, length, palm-muted]. */
function strums(p, len) {
  switch (p) {
    case 'chug': return range(len * 2).map((k) => [k / 2, 0.42, true]);
    case 'drive': return range(len * 2).map((k) => [k / 2, 0.46, false]);
    case 'open': return [[0, len, false]];
    case 'ring': return [[0, len + 2, false]];
    case 'open8': return len === 4 ? [[0, 1.5, false], [1.5, 0.5, false], [2, 2, false]] : [[0, 1.5, false], [1.5, 0.5, false]];
    case 'hits4': return range(len).map((k) => [k, 0.35, false]);
    case 'stopHit': return [[0, 1.2, false], [3, 0.45, false], [3.5, 0.45, false]];
    default: return [];
  }
}

/** Band events: [{ b, play(band, time, secondsPerBeat) }]. */
export function bandEvents(theme) {
  const ev = [];
  const at = (b, play) => ev.push({ b, play });
  theme.bars.forEach((bar, i) => {
    const b0 = i * 4;
    const segs = bar.ch.map((name, j) => ({ ...chord(name), from: (j * 4) / bar.ch.length, len: 4 / bar.ch.length }));
    const chordAt = (b) => segs.findLast((s) => b >= s.from) ?? segs[0];

    for (const n of line(bar.lead)) {
      at(b0 + n.b, (band, t, spb) => band.lead(theme.lead, t, n.d * spb * 0.95, n.m));
      if (!bar.harm || n.d < 0.5) continue;
      const h = harmony(n.m, chordAt(n.b).tones, bar.key ?? theme.key);
      if (h) at(b0 + n.b, (band, t, spb) => band.lead(theme.lead, t, n.d * spb * 0.95, h, 0.5));
    }

    for (const s of segs) {
      const pc = s.bass % 12;
      const gtr = 40 + ((pc - 4 + 12) % 12); // power chords from E2 to D#3
      const low = 28 + ((pc - 4 + 12) % 12); // bass from E1 to D#2
      for (const [hb, hd, mute] of strums(bar.gtr, s.len)) {
        at(b0 + s.from + hb, (band, t, spb) => band.power(t, hd * spb, gtr, mute));
      }
      // The bass follows the guitar, but drives eighths under open chorus chords.
      const bassHits = bar.gtr === 'open8' ? strums('drive', s.len) : bar.gtr ? strums(bar.gtr, s.len) : [];
      for (const [hb, hd] of bassHits) at(b0 + s.from + hb, (band, t, spb) => band.bass(t, hd * spb * 0.9, low + 12));
      if (bar.tuba) {
        for (let q = 0; q < s.len; q += 2) {
          const m = 36 + pc + (q % 4 === 2 ? 7 : 0) - (pc > 7 ? 12 : 0);
          at(b0 + s.from + q, (band, t, spb) => band.tuba(t, spb * 0.8, m));
        }
      }
      if (bar.str) {
        const tones = [...s.tones].sort((a, b) => a - b).map((x) => 60 + x);
        const cycle = [tones[0], tones[1], tones[2], tones[1]];
        for (let k = 0; k < s.len * 4; k++) at(b0 + s.from + k / 4, (band, t, spb) => band.strings(t, spb * 0.2, cycle[k % 4]));
      }
      if (bar.pad) at(b0 + s.from, (band, t, spb) => band.pad(t, spb * s.len * 0.98, s.tones.map((x) => 60 + x)));
    }

    const kit = KIT[bar.beat];
    if (kit) {
      const root = chord(bar.ch[0]).bass;
      for (let k = 0; k < 16; k++) {
        const b = b0 + k / 4;
        if (kit.k?.[k] === 'x') at(b, (band, t) => band.kick(t));
        if (kit.s?.[k] === 'x') {
          const v = kit.cresc ? 0.1 + (k / 16) * 0.3 : kit.march ? (k % 8 === 0 ? 0.34 : 0.13) : 0.38;
          at(b, (band, t) => band.snare(t, v));
        }
        if (kit.h?.[k] === 'x') at(b, (band, t) => band.hat(t, k % 4 === 0 ? 0.13 : 0.08));
        if (kit.t?.[k] === 'x') at(b, (band, t) => band.tom(t, 55 - Math.floor((k - 8) / 2) * 3));
      }
      for (const [b, iv] of kit.timp ?? []) at(b0 + b, (band, t) => band.timpani(t, root + iv - (root + iv > 47 ? 12 : 0)));
      if (kit.timproll) for (let k = 0; k < 16; k++) at(b0 + k / 4, (band, t) => band.timpani(t, root, 0.08 + (k / 16) * 0.22));
    }
    for (const b of bar.crash ?? []) at(b0 + b, (band, t) => band.crash(t));
  });
  return ev.sort((a, b) => a.b - b.b);
}

const CHIP_DRUMS = { rock: 'march', drive: 'march', punk: 'march', fill: 'turn', build: 'build', stop: 'end', end: 'end', march: 'march', roll: 'roll', fanfare: 'march', timp: 'pulse', timproll: 'build' };
const shiftOctave = (src, by) => src.replace(/([A-G]#?)(\d)/g, (_, n, o) => `${n}${Number(o) + by / 12}`);

/** Game Boy events through chip.js: [{ b, play(chip, time) }]. */
export function chipEvents(theme) {
  const bars = theme.bars.map((bar) => ({
    ch: bar.ch,
    lead: theme.chipShift ? shiftOctave(bar.lead, theme.chipShift) : bar.lead,
    drums: CHIP_DRUMS[bar.beat] ?? null,
    bass: bar.gtr === 'ring' || bar.beat === 'end' ? 'hold' : 'walk',
    crash: bar.crash,
    key: bar.key,
  }));
  return renderBars(bars, { beat: 60 / theme.bpm, key: theme.key, vol: 0.13 }).sort((a, b) => a.b - b.b);
}

/** Plays one theme at a time, queueing a little ahead on the audio clock. */
export class Deck {
  constructor(chip, band) {
    this.chip = chip;
    this.band = band;
    this.timer = null;
    this.now = null; // { theme, mode, t0, spb, beats }
  }
  play(theme, mode) {
    this.stop();
    const events = mode === 'band' ? bandEvents(theme) : chipEvents(theme);
    const spb = 60 / theme.bpm;
    const t0 = this.chip.now() + 0.12;
    const target = mode === 'band' ? this.band : this.chip;
    let i = 0;
    this.now = { theme, mode, t0, spb, beats: theme.bars.length * 4 };
    const pump = () => {
      const until = this.chip.now() + 0.35;
      while (i < events.length && t0 + events[i].b * spb < until) {
        const e = events[i++];
        e.play(target, t0 + e.b * spb, spb);
      }
      if (i >= events.length && this.chip.now() > t0 + this.now.beats * spb + 2.5) this.stop();
    };
    pump();
    this.timer = setInterval(pump, 50);
  }
  stop() {
    clearInterval(this.timer);
    this.timer = null;
    this.now = null;
    this.chip.newBus();
    this.band.newBus();
  }
  /** Beats into the playing theme, or null. */
  position() {
    return this.now ? (this.chip.now() - this.now.t0) / this.now.spb : null;
  }
}

/** Render a theme offline (for exporting a WAV). */
export async function renderOffline(Chip, theme, mode, sampleRate = 32000) {
  const seconds = (theme.bars.length * 4 * 60) / theme.bpm + 2.5;
  const ctx = new OfflineAudioContext(1, Math.ceil(sampleRate * seconds), sampleRate);
  const chip = new Chip();
  chip.start(ctx);
  chip.newBus();
  const band = new Band(chip);
  band.newBus();
  const spb = 60 / theme.bpm;
  for (const e of mode === 'band' ? bandEvents(theme) : chipEvents(theme)) e.play(mode === 'band' ? band : chip, 0.05 + e.b * spb, spb);
  return ctx.startRendering();
}

