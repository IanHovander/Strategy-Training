// The game's sound kit: every sound Blue Banner's scenes make, played on the intro's chip (chip.js), so the game and the
// intro share one palette: the same pulse waves, triangle and filtered noise, nothing sampled. No side effects: sound.js
// makes one Kit for the page and wires it to the stage; a test can make another on an OfflineAudioContext.
//
//   const kit = new Kit(chip)    chip: a chip.js Chip, started (chip.start()) before anything plays
//   kit.play(name, t, o)         one sound from SFX (below), now or at audio time t; o: per-sound options (vol, n, dur)
//   kit.setBed(name, fade)       the place's room sound (BEDS), cross-faded from the one before; null for none
//   kit.bedLevel(k, secs)        the bed louder or quieter (1 = as written), over secs: a crowd rising, lights going down
//   kit.setMusic(name, fade)     a light loop (MUSIC) under the walking; null fades it out
//   kit.duck(k)                  the music's level under words (1 = full)
//   kit.pump()                   every frame: queues the music and the bed's sprinkles (a bird, a drill) just ahead
//
// The mix, through the chip's master gain and compressor: four buses (ui, sfx, amb, mus) so each family sits at its own
// level. Everything is quiet on purpose: a phone speaker, someone next to you on the couch.

import { renderBars, hz } from '../chip.js';

/** Bus levels. ui: blips, A, the bubble; sfx: footsteps and stings; amb: room sound; mus: the walking loop. */
export const MIX = { ui: 1.4, sfx: 1.5, amb: 2.7, mus: 0.4 };

const r = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

// ---- Sound effects ----
// Each is { bus, play(c, t, o, kit) } with c the chip (c.tone, c.noise, c.sfx all land on that bus). Kept to the
// chip's voices: p12/p25/p50 pulses for anything tuned, the triangle for low things, and filtered noise for air,
// feet, crowds and machines.
export const SFX = {
  // -- Dialog and the controller --
  /** One letter typing out: a pulse blip at the speaker's pitch (o.m, a MIDI note) and wave (o.wave). */
  blip: { bus: 'ui', play: (c, t, o) => c.tone(t, 0.032, hz(o.m ?? 72), { wave: o.wave ?? 'p50', vol: o.vol ?? 0.045, decay: true }) },
  /** A turns the page: a soft two-step down. */
  page: { bus: 'ui', play: (c, t) => [1568, 1175].forEach((f, i) => c.tone(t + i * 0.045, 0.05, f, { wave: 'p25', vol: 0.04, decay: true })) },
  /** A, when it only hurries something along. */
  a: { bus: 'ui', play: (c, t) => c.tone(t, 0.03, 1320, { wave: 'p50', vol: 0.032, decay: true }) },
  /** A conversation opens: up a fifth. */
  talk: { bus: 'ui', play: (c, t) => [880, 1319].forEach((f, i) => c.tone(t + i * 0.05, 0.07, f, { wave: 'p25', vol: 0.045, decay: true })) },
  /** And closes: back down. */
  talked: { bus: 'ui', play: (c, t) => [1319, 988].forEach((f, i) => c.tone(t + i * 0.05, 0.07, f, { wave: 'p25', vol: 0.038, decay: true })) },
  /** The A bubble pops up over someone in reach. */
  bubble: { bus: 'ui', play: (c, t) => c.tone(t, 0.06, 1760, { wave: 'p12', slide: 2637, vol: 0.03, decay: true }) },
  /** A tap on the floor: she's off to walk there. */
  tapWalk: { bus: 'ui', play: (c, t) => c.tone(t, 0.025, 1047, { wave: 'p12', vol: 0.025, decay: true }) },
  /** A cursor moving (the pick's cards, the van's seats): the chip's own, a touch quieter. */
  cursor: { bus: 'ui', play: (c, t) => c.tone(t, 0.04, 1760, { wave: 'p50', vol: 0.045 }) },
  select: { bus: 'ui', play: (c, t) => [1319, 1976].forEach((f, i) => c.tone(t + i * 0.06, 0.06, f, { wave: 'p50', vol: 0.05 })) },
  /** SKIP: a quick swipe down. */
  skip: { bus: 'ui', play: (c, t) => c.noise(t, 0.22, { vol: 0.07, type: 'bandpass', hz: 2400, sweep: 500, q: 1.4 }) },

  // -- Feet. o.surface: grass | floor | carpet | hard; o.gait: walk | run; o.alt flips the foot. --
  step: {
    bus: 'sfx',
    play: (c, t, o) => {
      const run = o.gait === 'run', alt = o.alt ? 1 : 0.86, v = (run ? 1.3 : 1) * 0.8 * (o.vol ?? 1);
      const S = {
        grass: () => c.noise(t, run ? 0.07 : 0.09, { vol: 0.05 * v, type: 'bandpass', hz: 1500 * alt, q: 0.5 }),
        carpet: () => c.noise(t, 0.04, { vol: 0.05 * v, type: 'lowpass', hz: 900 * alt, q: 0.6 }),
        floor: () => {
          c.noise(t, 0.03, { vol: 0.04 * v, type: 'bandpass', hz: 2200 * alt, q: 0.9 });
          c.tone(t, 0.035, 150 * alt, { wave: 'tri', slide: 90, vol: 0.05 * v, decay: true });
        },
        hard: () => {
          c.noise(t, 0.025, { vol: 0.045 * v, type: 'bandpass', hz: 3000 * alt, q: 1.1 });
          c.tone(t, 0.03, 190 * alt, { wave: 'tri', slide: 110, vol: 0.045 * v, decay: true });
        },
      };
      (S[o.surface] ?? S.floor)();
    },
  },
  /** Out of the picture: air past the ear as the screen goes dark. */
  leave: { bus: 'sfx', play: (c, t) => c.noise(t, 0.55, { vol: 0.06, type: 'bandpass', hz: 350, sweep: 2200, q: 1.1 }) },
  /** A scene fading up: a low breath rising, and a soft pair of notes. */
  arrive: {
    bus: 'sfx',
    play: (c, t) => {
      c.noise(t, 0.5, { vol: 0.035, type: 'lowpass', hz: 300, sweep: 1400, swell: true });
      c.tone(t + 0.1, 0.35, hz(81), { wave: 'p12', vol: 0.022, decay: true });
      c.tone(t + 0.2, 0.45, hz(88), { wave: 'p12', vol: 0.02, decay: true });
    },
  },

  // -- Cut scene stings --
  /** The place card slides in: a short swish and a two-note chime. o.soft for the worlds' division cards. */
  card: {
    bus: 'sfx',
    play: (c, t, o) => {
      const k = o.soft ? 0.6 : 1;
      c.noise(t, 0.3, { vol: 0.05 * k, type: 'bandpass', hz: 600, sweep: 3000, q: 1.3 });
      c.tone(t + 0.22, 0.25, hz(o.soft ? 84 : 81), { wave: 'p12', vol: 0.045 * k, decay: true });
      c.tone(t + 0.32, 0.5, hz(o.soft ? 91 : 88), { wave: 'p12', vol: 0.04 * k, decay: true });
    },
  },
  /** The public address chime before an announcement: three falling tones, like every venue's. */
  chime: {
    bus: 'sfx',
    play: (c, t) => [79, 76, 72].forEach((m, i) => {
      c.tone(t + i * 0.32, 0.9, hz(m), { wave: 'tri', vol: 0.09, decay: true });
      c.tone(t + i * 0.32, 0.5, hz(m + 12), { wave: 'p12', vol: 0.012, decay: true });
    }),
  },
  /** A crowd cheering: a swell of bright noise and a scatter of claps. o.size 0-1. */
  cheer: {
    bus: 'sfx',
    play: (c, t, o, kit) => {
      const k = o.size ?? 1, dur = 1.6 + k * 1.6;
      c.noise(t, 0.35, { vol: 0.07 * k, type: 'bandpass', hz: 900, q: 0.6, swell: true });
      c.noise(t + 0.35, dur, { vol: 0.07 * k, type: 'bandpass', hz: 1100, sweep: 700, q: 0.6 });
      c.noise(t + 0.2, dur * 0.8, { vol: 0.03 * k, type: 'bandpass', hz: 2600, sweep: 1600, q: 1.2 });
      kit.claps(c, t + 0.15, dur * 0.8, Math.round(10 + 22 * k), 0.035 * k);
      // A whoop or two, chip style: a pulse sliding up.
      if (k > 0.6) [0.25, 0.7].forEach((d) => c.tone(t + d + r(0, 0.2), 0.3, r(500, 650), { wave: 'p12', slide: r(1000, 1300), vol: 0.012 * k }));
    },
  },
  /** Applause: claps alone. o.dur, o.n, o.vol. */
  claps: { bus: 'sfx', play: (c, t, o, kit) => kit.claps(c, t, o.dur ?? 1.5, o.n ?? 22, o.vol ?? 0.04) },
  /** "AWWW": a falling murmur. */
  aww: {
    bus: 'sfx',
    play: (c, t) => {
      c.noise(t, 0.9, { vol: 0.05, type: 'bandpass', hz: 700, sweep: 380, q: 2 });
      c.tone(t, 0.8, 440, { wave: 'tri', slide: 300, vol: 0.03 });
    },
  },
  /** A big moment: a quick major run up and a held chord, the intro's lead over its triangle. o.key: MIDI root. */
  fanfare: {
    bus: 'sfx',
    play: (c, t, o) => {
      const root = o.key ?? 74, s = 0.075; // D5, the title theme's key
      [0, 4, 7, 12].forEach((d, i) => c.tone(t + i * s, s * 0.9, hz(root + d), { wave: 'p25', vol: 0.05 }));
      const at = t + 4 * s;
      c.tone(at, 0.9, hz(root + 16), { wave: 'p25', vol: 0.05, vib: true });
      c.tone(at, 0.9, hz(root + 12), { wave: 'p50', vol: 0.02 });
      c.tone(at, 0.9, hz(root - 12), { wave: 'tri', vol: 0.12 });
    },
  },
  /** Something going right, smaller: three notes up. */
  jingle: { bus: 'sfx', play: (c, t) => [79, 83, 86].forEach((m, i) => c.tone(t + i * 0.08, i === 2 ? 0.4 : 0.08, hz(m), { wave: 'p25', vol: 0.04, decay: i === 2 })) },
  /** Something going wrong: two notes down, low. */
  miss: { bus: 'sfx', play: (c, t) => [62, 57].forEach((m, i) => c.tone(t + i * 0.16, 0.22, hz(m), { wave: 'p50', vol: 0.04, decay: true })) },
  /** The bet log's stamp. */
  stamp: {
    bus: 'sfx',
    play: (c, t) => {
      c.tone(t, 0.1, 160, { wave: 'p50', slide: 70, vol: 0.09, decay: true });
      c.noise(t, 0.09, { vol: 0.08, type: 'lowpass', hz: 1100 });
    },
  },
  /** The tape running back. */
  rewind: {
    bus: 'sfx',
    play: (c, t) => {
      c.tone(t, 1.3, 1400, { wave: 'p12', slide: 300, vol: 0.025, vib: true });
      c.noise(t, 1.3, { vol: 0.04, type: 'bandpass', hz: 4000, sweep: 600, q: 2.5 });
    },
  },
  /** A cadence for the end of what's built: TO BE CONTINUED. */
  continued: {
    bus: 'sfx',
    play: (c, t) => [[74, 0], [78, 0.18], [81, 0.36], [86, 0.54]].forEach(([m, d], i) => c.tone(t + d, i === 3 ? 1 : 0.17, hz(m), { wave: 'p25', vol: 0.04, decay: i === 3 })),
  },
  /** A clock's second, and the last ten louder. o.hi for the last few. */
  tick: { bus: 'sfx', play: (c, t, o) => c.tone(t, 0.03, o.hi ? 2350 : 1980, { wave: 'p50', vol: o.hi ? 0.04 : 0.025 }) },
  /** The clock hits zero: the intro's alarm, softer. */
  timeUp: { bus: 'sfx', play: (c, t) => [0, 0.2].forEach((d) => c.tone(t + d, 0.16, d ? 988 : 1319, { wave: 'p50', vol: 0.045 })) },
  /** The clock slamming onto the screen. */
  slam: {
    bus: 'sfx',
    play: (c, t) => {
      c.tone(t, 0.16, 150, { wave: 'sine', slide: 40, vol: 0.32, decay: true });
      c.noise(t, 0.18, { vol: 0.12, type: 'lowpass', hz: 1500 });
    },
  },
  /** A phone buzzing in her hand. */
  buzz: {
    bus: 'sfx',
    play: (c, t) => [0, 0.13].forEach((d) => c.tone(t + d, 0.1, 82, { wave: 'p50', vol: 0.045 })),
  },
  /** A message bubble landing. */
  msg: { bus: 'sfx', play: (c, t) => c.tone(t, 0.08, 1568, { wave: 'p25', slide: 2093, vol: 0.03, decay: true }) },
  /** Norbert's ear glints. */
  glint: {
    bus: 'sfx',
    play: (c, t) => {
      c.tone(t, 0.25, 3136, { wave: 'p12', vol: 0.03, decay: true });
      c.tone(t + 0.06, 0.35, 4186, { wave: 'p12', vol: 0.025, decay: true });
    },
  },
  /** A spotlight coming on: a big switch's clunk, and the lamp's hum catching. */
  spot: {
    bus: 'sfx',
    play: (c, t, o) => {
      const k = o.vol ?? 1;
      c.tone(t, 0.08, 120, { wave: 'p50', slide: 60, vol: 0.05 * k, decay: true });
      c.noise(t, 0.06, { vol: 0.03 * k, type: 'lowpass', hz: 800 });
      c.noise(t + 0.02, 0.35, { vol: 0.012 * k, type: 'highpass', hz: 5000 });
    },
  },
  /** Roller skates on the arena floor, o.dur long. */
  skate: {
    bus: 'sfx',
    play: (c, t, o) => {
      const d = o.dur ?? 3;
      c.noise(t, 0.4, { vol: 0.03, type: 'bandpass', hz: 350, q: 1.5, swell: true });
      c.noise(t + 0.4, d, { vol: 0.03, type: 'bandpass', hz: 380, sweep: 300, q: 1.5 });
    },
  },
  /** A spin landing. */
  spin: { bus: 'sfx', play: (c, t) => c.tone(t, 0.35, 300, { wave: 'p25', slide: 1300, vol: 0.03 }) },
  /** A robot enabling: two beeps from the driver station. */
  enable: { bus: 'sfx', play: (c, t) => [0, 0.14].forEach((d) => c.tone(t + d, 0.09, 1760, { wave: 'p50', vol: 0.04 })) },
  /** A robot driving for o.dur seconds: motor whine up and settling, a little wobble as it turns. */
  robot: {
    bus: 'sfx',
    play: (c, t, o) => {
      const d = o.dur ?? 2, v = o.vol ?? 1;
      c.tone(t, 0.5, 140, { wave: 'saw', slide: 330, vol: 0.02 * v });
      c.tone(t + 0.5, Math.max(0.3, d - 0.5), 330, { wave: 'saw', slide: 260, vol: 0.016 * v, vib: true });
      c.noise(t, d, { vol: 0.015 * v, type: 'bandpass', hz: 1200, q: 2 });
    },
  },
  /** The elevator setting a hatch down. */
  clunk: {
    bus: 'sfx',
    play: (c, t) => {
      c.tone(t, 0.12, 140, { wave: 'p50', slide: 60, vol: 0.08, decay: true });
      c.noise(t, 0.12, { vol: 0.07, type: 'lowpass', hz: 900 });
    },
  },
  /** A stopwatch's click. */
  click: { bus: 'sfx', play: (c, t) => [0, 0.05].forEach((d) => c.noise(t + d, 0.012, { vol: 0.08, type: 'highpass', hz: 3500 })) },
  /** Double doors swinging. */
  door: {
    bus: 'sfx',
    play: (c, t) => {
      c.noise(t, 0.3, { vol: 0.04, type: 'lowpass', hz: 500, sweep: 250 });
      c.tone(t + 0.25, 0.08, 110, { wave: 'tri', vol: 0.06, decay: true });
    },
  },
  /** The van's turn signal: o.n tick-tocks. */
  signal: {
    bus: 'sfx',
    play: (c, t, o) => {
      for (let i = 0; i < (o.n ?? 6); i++) c.tone(t + i * 0.4, 0.02, i % 2 ? 900 : 1200, { wave: 'p50', vol: 0.022 });
    },
  },
  /** The robot rolling out on its cart, o.dur long: castors on concrete. */
  cart: {
    bus: 'sfx',
    play: (c, t, o) => {
      const d = o.dur ?? 6;
      c.noise(t, 0.6, { vol: 0.035, type: 'lowpass', hz: 260, swell: true });
      c.noise(t + 0.6, d, { vol: 0.035, type: 'lowpass', hz: 260, sweep: 120 });
      for (let k = 0.3; k < d; k += r(0.5, 0.9)) c.noise(t + k, 0.02, { vol: 0.03, type: 'bandpass', hz: 1800, q: 2 });
    },
  },

  // -- Sprinkles: the little sounds that come and go over a bed --
  bird: {
    bus: 'amb',
    play: (c, t) => {
      const f = r(2400, 3200), n = pick([2, 3, 3, 4]);
      for (let i = 0; i < n; i++) c.tone(t + i * r(0.08, 0.12), 0.06, f * r(0.95, 1.05), { wave: 'p12', slide: f * r(1.15, 1.35), vol: 0.012, decay: true });
    },
  },
  drill: {
    bus: 'amb',
    play: (c, t) => {
      const d = r(0.35, 0.9), f = r(260, 420);
      c.tone(t, d, f * 0.6, { wave: 'saw', slide: f, vol: 0.008 });
      c.noise(t, d, { vol: 0.01, type: 'bandpass', hz: f * 6, q: 3 });
    },
  },
  ratchet: { bus: 'amb', play: (c, t) => { for (let i = 0; i < 6; i++) c.noise(t + i * 0.07, 0.012, { vol: 0.02, type: 'highpass', hz: 3000 }); } },
  clatter: { bus: 'amb', play: (c, t) => [0, 0.09, 0.15].forEach((d) => c.tone(t + d, 0.05, r(700, 1100), { wave: 'p12', vol: 0.008, decay: true })) },
  /** A crowd's swell somewhere across the hall. */
  roar: {
    bus: 'amb',
    play: (c, t, o) => {
      const k = o.vol ?? 1, d = r(1.6, 2.6);
      c.noise(t, d * 0.4, { vol: 0.035 * k, type: 'bandpass', hz: 900, q: 0.7, swell: true });
      c.noise(t + d * 0.4, d * 0.6, { vol: 0.035 * k, type: 'bandpass', hz: 900, sweep: 600, q: 0.7 });
    },
  },
  /** A match ending on a far field: the buzzer, low and far away. */
  farBuzzer: { bus: 'amb', play: (c, t) => c.tone(t, 0.7, 92, { wave: 'p50', vol: 0.02 }) },
  /** Far robots: a whine crossing. */
  farRobot: { bus: 'amb', play: (c, t) => c.tone(t, r(0.6, 1.2), r(180, 260), { wave: 'saw', slide: r(280, 380), vol: 0.006 }) },
  /** A chair scraping, or a table: the cafeteria. */
  scrape: { bus: 'amb', play: (c, t) => c.noise(t, r(0.15, 0.3), { vol: 0.012, type: 'bandpass', hz: r(700, 1000), sweep: r(400, 600), q: 4 }) },
  /** A bump in the road. */
  bump: {
    bus: 'amb',
    play: (c, t) => {
      c.tone(t, 0.12, 70, { wave: 'tri', slide: 45, vol: 0.03, decay: true });
      c.tone(t + 0.14, 0.1, 65, { wave: 'tri', slide: 45, vol: 0.02, decay: true });
    },
  },
};

// ---- Beds: a place's room sound ----
// layers: { noise: true | wave: 'sine' | 'triangle', hz (a wave's pitch), type and f (the filter), q, vol, lfo: a slow
// wobble of the level { rate, depth } (0-1 of vol), sweep: a slow drift of the filter { rate, depth } (Hz) }.
// sprinkle: [{ sfx, every: [min, max] seconds, vol }]. Levels were set by measuring (see sound.js's notes), not by ear.
export const BEDS = {
  /** A big room full of people talking: two bands of murmur breathing out of step. */
  crowd: {
    layers: [
      { noise: true, type: 'bandpass', f: 480, q: 1.1, vol: 0.05, lfo: { rate: 0.13, depth: 0.35 }, sweep: { rate: 0.07, depth: 90 } },
      { noise: true, type: 'bandpass', f: 1150, q: 1.4, vol: 0.022, lfo: { rate: 0.31, depth: 0.5 }, sweep: { rate: 0.11, depth: 200 } },
      { noise: true, type: 'lowpass', f: 220, q: 0.5, vol: 0.03 },
    ],
    sprinkle: [{ sfx: 'roar', every: [9, 18], vol: 0.6 }],
  },
  /** The pits: a quieter crowd and work going on, drills and ratchets in the next rows. */
  pits: {
    layers: [
      { noise: true, type: 'bandpass', f: 520, q: 1.1, vol: 0.05, lfo: { rate: 0.17, depth: 0.35 }, sweep: { rate: 0.09, depth: 90 } },
      { noise: true, type: 'bandpass', f: 1300, q: 1.6, vol: 0.017, lfo: { rate: 0.27, depth: 0.5 } },
      { noise: true, type: 'lowpass', f: 200, q: 0.5, vol: 0.04 },
    ],
    sprinkle: [
      { sfx: 'drill', every: [3, 8] },
      { sfx: 'ratchet', every: [6, 14] },
      { sfx: 'clatter', every: [7, 15] },
      { sfx: 'roar', every: [20, 35], vol: 0.3 },
    ],
  },
  /** The arena in a match: the crowd, louder, and the robots and buzzers of the field. */
  arena: {
    layers: [
      { noise: true, type: 'bandpass', f: 500, q: 1, vol: 0.055, lfo: { rate: 0.11, depth: 0.3 }, sweep: { rate: 0.06, depth: 100 } },
      { noise: true, type: 'bandpass', f: 1250, q: 1.3, vol: 0.026, lfo: { rate: 0.23, depth: 0.5 }, sweep: { rate: 0.13, depth: 220 } },
      { noise: true, type: 'lowpass', f: 180, q: 0.5, vol: 0.035 },
    ],
    sprinkle: [
      { sfx: 'roar', every: [6, 12], vol: 0.9 },
      { sfx: 'farRobot', every: [3, 7] },
      { sfx: 'farBuzzer', every: [25, 45] },
    ],
  },
  /** Worlds: one enormous hall, eight fields at once. */
  worlds: {
    layers: [
      { noise: true, type: 'bandpass', f: 460, q: 0.9, vol: 0.06, lfo: { rate: 0.09, depth: 0.25 }, sweep: { rate: 0.05, depth: 80 } },
      { noise: true, type: 'bandpass', f: 1200, q: 1.2, vol: 0.026, lfo: { rate: 0.19, depth: 0.45 }, sweep: { rate: 0.12, depth: 250 } },
      { noise: true, type: 'lowpass', f: 160, q: 0.5, vol: 0.04 },
    ],
    sprinkle: [
      { sfx: 'roar', every: [4, 9], vol: 0.7 },
      { sfx: 'farRobot', every: [2.5, 6] },
      { sfx: 'farBuzzer', every: [14, 28] },
    ],
  },
  /** The back lawn: a breeze in the trees, birds. */
  outdoors: {
    layers: [
      { noise: true, type: 'highpass', f: 2600, q: 0.5, vol: 0.008, lfo: { rate: 0.08, depth: 0.7 } },
      { noise: true, type: 'bandpass', f: 600, q: 0.6, vol: 0.012, lfo: { rate: 0.05, depth: 0.6 }, sweep: { rate: 0.04, depth: 200 } },
    ],
    sprinkle: [{ sfx: 'bird', every: [2.5, 7] }],
  },
  /** The cafeteria after school: room tone, the lights' hum, now and then a chair. */
  cafeteria: {
    layers: [
      { noise: true, type: 'lowpass', f: 300, q: 0.5, vol: 0.03 },
      { wave: 'sine', hz: 120, vol: 0.006 },
      { wave: 'sine', hz: 240, vol: 0.002 },
    ],
    sprinkle: [{ sfx: 'scrape', every: [8, 18] }, { sfx: 'farRobot', every: [6, 12] }],
  },
  /** On the highway: the engine, the road under the tyres, the wind past the windows. */
  road: {
    layers: [
      { noise: true, type: 'lowpass', f: 150, q: 0.7, vol: 0.036, lfo: { rate: 0.21, depth: 0.15 } },
      { wave: 'triangle', hz: 47, vol: 0.014, lfo: { rate: 0.6, depth: 0.12 } },
      { noise: true, type: 'bandpass', f: 1000, q: 0.5, vol: 0.005, lfo: { rate: 0.07, depth: 0.4 } },
    ],
    sprinkle: [{ sfx: 'bump', every: [5, 12] }],
  },
};

// ---- Music: light loops under the walking, in the intro's style (chip.js renderBars) ----
// Short, hummable, and resting between passes so a long walk doesn't wear it thin.
export const MUSIC = {
  /** Days at school and on the road: easy, in F. */
  day: {
    bpm: 100, key: 'F', vol: 0.11, wave: 'p12', passes: 2, rest: 24,
    bars: [
      { ch: ['F'], lead: 'A4:1 C5:1 F5:1.5 E5:.5', bass: 'hold' },
      { ch: ['Dm'], lead: 'D5:1 F5:1 A5:2', bass: 'hold' },
      { ch: ['A#'], lead: 'G5:.5 F5:.5 D5:1 F5:1 D5:1' },
      { ch: ['C'], lead: 'C5:1.5 D5:.5 E5:2' },
      { ch: ['F'], lead: 'A4:1 C5:1 F5:1.5 G5:.5', bass: 'hold' },
      { ch: ['Dm'], lead: 'A5:1 G5:.5 F5:.5 D5:2', bass: 'hold' },
      { ch: ['A#', 'C'], lead: 'D5:1 F5:1 E5:1 G5:1' },
      { ch: ['F'], lead: 'F5:3 r:1', bass: 'hold' },
    ],
  },
  /** Event days: the title theme's opening, brighter and quicker, in D. */
  event: {
    bpm: 120, key: 'D', vol: 0.1, wave: 'p25', passes: 2, rest: 20,
    bars: [
      { ch: ['D'], lead: 'A4:.5 D5:.5 F#5:.5 A5:.5 D6:1 A5:1' },
      { ch: ['G'], lead: 'B5:1 A5:.5 G5:.5 D5:2' },
      { ch: ['Em', 'A'], lead: 'E5:.5 G5:.5 B5:1 A5:.5 G5:.5 E5:1' },
      { ch: ['D'], lead: 'F#5:2 r:1 A4:.5 C#5:.5', bass: 'hold' },
      { ch: ['D'], lead: 'D5:.5 F#5:.5 A5:.5 D6:.5 F#6:1 E6:1' },
      { ch: ['Bm'], lead: 'D6:1 B5:.5 A5:.5 F#5:2' },
      { ch: ['G', 'A'], lead: 'G5:.5 B5:.5 D6:1 C#6:.5 A5:.5 E5:1' },
      { ch: ['D'], lead: 'D5:2 r:2', bass: 'hold' },
    ],
  },
};

export class Kit {
  constructor(chip) {
    this.chip = chip;
    this.buses = null;
    this.bed = null; // { name, out, level, nodes, next: [next sprinkle time per sprinkle] }
    this.music = null; // { name, def, ev, beats, t0, cursor, out }
    this.ducked = 1;
    this.onPlay = null; // a test's hook: (name, o) for every sound played
  }
  /** The buses, made the first time the chip is running. False until the chip has an audio context. */
  ready() {
    const c = this.chip;
    if (!c.ac) return false;
    if (!this.buses) {
      this.buses = {};
      for (const [k, v] of Object.entries(MIX)) {
        const g = c.ac.createGain();
        g.gain.value = v;
        g.connect(c.master);
        this.buses[k] = g;
      }
      // A longer noise than the chip's one second, so a bed's loop never repeats audibly.
      const n = c.ac.sampleRate * 5;
      this.noise = c.ac.createBuffer(1, n, c.ac.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    return true;
  }
  /** Run f with the chip's notes landing on bus (chip.tone and chip.noise always play to chip.bus). */
  on(bus, f) {
    const c = this.chip, prev = c.bus;
    c.bus = typeof bus === 'string' ? this.buses[bus] : bus;
    try {
      f(c);
    } finally {
      c.bus = prev;
    }
  }
  play(name, t, o = {}) {
    if (!this.ready()) return;
    const s = SFX[name];
    if (!s) return;
    this.onPlay?.(name, o);
    this.on(s.bus, (c) => s.play(c, Math.max(t ?? c.now(), c.now()), o, this));
  }
  /** n claps, scattered over dur seconds from t. */
  claps(c, t, dur, n, vol) {
    for (let i = 0; i < n; i++) {
      const at = t + Math.random() ** 0.7 * dur, fade = 1 - (at - t) / (dur * 1.3);
      c.noise(at, 0.03, { vol: vol * r(0.5, 1) * fade, type: 'bandpass', hz: r(1200, 2400), q: 1.2 });
    }
  }

  // ---- The bed ----
  setBed(name, fade = 1.2) {
    if (!this.ready()) return;
    if (this.bed?.name === name) return;
    const c = this.chip, now = c.now(), old = this.bed;
    if (old) {
      old.out.gain.cancelScheduledValues(now);
      old.out.gain.setValueAtTime(old.out.gain.value, now);
      old.out.gain.linearRampToValueAtTime(0, now + fade);
      for (const n of old.nodes) n.stop(now + fade + 0.1);
    }
    this.bed = null;
    const def = BEDS[name];
    if (!def) return;
    const ac = c.ac, out = ac.createGain(), level = ac.createGain(), nodes = [];
    out.gain.setValueAtTime(0, now);
    out.gain.linearRampToValueAtTime(1, now + fade);
    level.gain.value = 1;
    out.connect(level).connect(this.buses.amb);
    for (const L of def.layers) {
      let src;
      if (L.noise) {
        src = ac.createBufferSource();
        src.buffer = this.noise;
        src.loop = true;
      } else {
        src = ac.createOscillator();
        src.type = L.wave ?? 'sine';
        src.frequency.value = L.hz;
      }
      const f = ac.createBiquadFilter(), g = ac.createGain();
      f.type = L.type ?? 'lowpass';
      f.frequency.value = L.f ?? 20000;
      f.Q.value = L.q ?? 0.7;
      g.gain.value = L.vol;
      src.connect(f).connect(g).connect(out);
      const lfo = (rate, depth, param) => {
        const o = ac.createOscillator(), d = ac.createGain();
        o.frequency.value = rate * r(0.85, 1.15);
        d.gain.value = depth;
        o.connect(d).connect(param);
        o.start(now);
        nodes.push(o);
      };
      if (L.lfo) lfo(L.lfo.rate, L.vol * L.lfo.depth, g.gain);
      if (L.sweep) lfo(L.sweep.rate, L.sweep.depth, f.frequency);
      if (L.noise) src.start(now, r(0, 4.5));
      else src.start(now);
      nodes.push(src);
    }
    this.bed = { name, def, out, level, nodes, next: (def.sprinkle ?? []).map((s) => now + r(...s.every) * 0.6) };
  }
  /** The bed at k times its written level, getting there over secs. */
  bedLevel(k, secs = 0.8) {
    if (!this.bed) return;
    const g = this.bed.level.gain, now = this.chip.now();
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(k, now + Math.max(0.02, secs));
  }

  // ---- Music ----
  setMusic(name, fade = 1.5) {
    if (!this.ready()) return;
    if ((this.music?.name ?? null) === (name ?? null)) return;
    const c = this.chip, now = c.now(), old = this.music;
    if (old) {
      old.out.gain.cancelScheduledValues(now);
      old.out.gain.setValueAtTime(old.out.gain.value, now);
      old.out.gain.linearRampToValueAtTime(0, now + fade);
      setTimeout(() => old.out.disconnect(), (fade + 1) * 1000);
    }
    this.music = null;
    const def = MUSIC[name];
    if (!def) return;
    const beat = 60 / def.bpm, out = c.ac.createGain();
    out.gain.setValueAtTime(0, now);
    out.gain.linearRampToValueAtTime(1, now + 0.4);
    out.connect(this.buses.mus);
    const bars = def.bars.map((b) => ({ wave: def.wave, ...b }));
    const ev = renderBars(bars, { beat, key: def.key, vol: def.vol, wrap: bars[0] });
    const beats = def.bars.length * 4;
    // A pass, then the rest, then again: the cycle in beats.
    const cycle = beats * def.passes + Math.round(def.rest / beat);
    this.music = { name, def, ev, beat, beats, cycle, t0: now + 0.15, cursor: 0, out };
  }
  duck(k) {
    if (!this.buses || this.ducked === k) return;
    this.ducked = k;
    const g = this.buses.mus.gain, now = this.chip.now();
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(MIX.mus * k, now + 0.25);
  }
  pump(ahead = 0.3) {
    if (!this.buses) return;
    const c = this.chip, now = c.now();
    // The bed's sprinkles.
    const bed = this.bed;
    if (bed) {
      (bed.def.sprinkle ?? []).forEach((s, i) => {
        if (now + ahead < bed.next[i]) return;
        const at = Math.max(bed.next[i], now);
        // Sprinkles go through the bed's own gain, so they fade and swell with it.
        this.onPlay?.(s.sfx, { sprinkle: true });
        this.on(bed.out, (ch) => SFX[s.sfx].play(ch, at, { vol: s.vol }, this));
        bed.next[i] = at + r(...s.every);
      });
    }
    // The music.
    const m = this.music;
    if (m) {
      const from = Math.max(m.cursor, (now - 0.03 - m.t0) / m.beat), until = (now + ahead - m.t0) / m.beat;
      if (until > from) {
        this.on(m.out, (ch) => {
          const k0 = Math.floor(from / m.cycle), k1 = Math.floor(until / m.cycle);
          for (let k = k0; k <= k1; k++) {
            for (let p = 0; p < m.def.passes; p++) {
              const base = k * m.cycle + p * m.beats;
              for (const e of m.ev) {
                const b = base + e.b;
                if (b >= from && b < until) e.play(ch, m.t0 + b * m.beat);
              }
            }
          }
        });
        m.cursor = until;
      }
    }
  }
}
