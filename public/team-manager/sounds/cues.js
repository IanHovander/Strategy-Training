// What each scene sounds like: its bed (kit.js BEDS), what she walks on, the loop under the walking (MUSIC), how loud
// the bed sits in the cut scene and once she's free, and the cut scene's cues, beat by beat.
//
// Keyed by the scene's name (scene.name). beats: keyed by the beat's index in the cut scene or by its name (b.name,
// where the scene gives its beats names: the opening, alliance selection), a list of [seconds into the beat, sound, o].
// A sound is one of kit.js's SFX, with o its options, or one of these:
//   ['bed', { to, secs }]   the bed's level (1 = as written) going to `to` over secs: a crowd rising, the house going down
//   ['music', name|null]    start or stop a loop mid cut scene
// A cue fires once its moment in the beat has come, so a beat A moves on early never plays the rest of its cues.
// The times were measured against the pictures (the place card's slide, the lamps, the phone's buzz), so if a cut scene
// is re-timed, these move with it.
//
// status (for a scene with no walking, whose phone status line says what's going on: the opening's pick): sounds for
// when the status line changes to that text. clock: { last } ticks the scene's clock (scene.clock(s), the seconds left
// while it runs): softly every second, louder for the last `last`, and the time running out (sound.js clockCues).
// moments (for a scene where things happen around her as she walks: the arena's matches): sounds for when
// scene.moment(s) changes to a key, found by the part before its # ('BUZZER#42' plays BUZZER's), so the same thing
// happening again plays again (sound.js momentCues).

import { PHONE_TIMES } from '../opening/phone.js';
import { HANDOFF } from '../opening/handoff.js';
import { ORDER, OPPONENT, statusOf } from '../opening/teams2.js';

const card = (t, o) => [t, 'card', o];
const bed = (t, to, secs = 0.8) => [t, 'bed', { to, secs }];
/** Seconds into a quarterfinal match its clock reaches 0:15: it plays at 15 times real time (opening/quarter.js SPEED). */
const QF_BELLS = 15 / 15;

export const SCENES = {
  'THE OPENING': {
    bed: 'crowd', surface: 'hard', music: null, cut: 1, free: 0.45,
    beats: {
      black: [bed(0, 0.08, 0.02), bed(0.05, 1.1, 0.65)], // in the dark, the crowd's noise rising from a murmur to a roar
      // Her phone: the crowd drops away, and each text lands with its ping and the buzz in her hand.
      phone: [bed(0, 0.35, 0.15), ...[PHONE_TIMES.first, PHONE_TIMES.second].flatMap((t) => [[t, 'msg'], [t, 'buzz', { dur: PHONE_TIMES.buzz }]])],
      card: [bed(0, 1, 0.2), [0, 'card'], [0.5, 'cheer', { size: 0.5 }]],
      cocaptain: [bed(0, 0.3, 1), [0, 'music', 'moment']], // the arena goes dark close on them; a soft swell
      handoff: [[HANDOFF.glint[0] + 0.1, 'glint']],
      call: [[0, 'music', null], bed(0, 1, 0.4), [0.3, 'cheer', { size: 0.8 }]],
      pick: [[0, 'slam'], bed(0, 0.45, 0.3)],
    },
    status: {
      'PICKED': [[0, 'fanfare'], [0.1, 'cheer', { size: 0.7 }]],
      'BET LOG': [[0, 'stamp']],
      'REWINDING': [[0, 'rewind']],
      'TO BE CONTINUED': [[0.1, 'continued']],
      // The second pick (opening/second.js). The goal card slides in as Riley sets the goal.
      'THE PLAN': [[0.15, 'card']],
      // Each pick while she waits: the PA chime as Robin calls it, and the TAKEN stamp coming down on its tile a second
      // later; alliance 5's picks, the quarterfinal's other side, get a cheer from their end of the stands.
      ...Object.fromEntries(ORDER.map((p) => [statusOf(p), [
        [0, 'chime'], [1, 'click'], ...(p.alliance === OPPONENT ? [[1, 'cheer', { size: 0.45 }]] : []),
      ]])),
      // Her turn: the clock slams in, as at the first pick.
      'PICK 2: ON THE CLOCK': [[0, 'slam']],
      // Both picks done, on to the quarterfinal: the second line's tick stamped on.
      'PICKS DONE': [[0.7, 'stamp'], [0.9, 'jingle']],
      // The quarterfinal (opening/quarter.js): the matches loud, the freeze quiet, each climb's outcome heard. Each
      // match starts with the horn, and at 0:15 (a second in, as fast as they play) the field's bells ring as the
      // sandstorm's shutters roll up.
      QUARTERFINAL: [[0, 'card'], bed(0, 0.6, 0.6)],
      'QF MATCH 1': [bed(0, 1.1, 0.4), [0.05, 'horn'], [0.2, 'cheer', { size: 0.7 }], [QF_BELLS, 'bells']],
      'QF MATCH 2': [bed(0, 1.1, 0.4), [0.05, 'horn'], [0.2, 'cheer', { size: 0.7 }], [QF_BELLS, 'bells']],
      'QF MATCH 3': [bed(0, 1.2, 0.4), [0.05, 'horn'], [0.2, 'cheer', { size: 0.9 }], [QF_BELLS, 'bells']],
      'QF: 6834 IS DEAD': [[0, 'clunk'], [0.15, 'aww']],
      'QF: RED WINS': [[0, 'horn', { dur: 1.1 }], [0.1, 'cheer', { size: 0.9 }], [0.3, 'jingle'], bed(1.4, 0.7, 1)],
      'QF: BLUE WINS': [[0, 'horn', { dur: 1.1 }], [0.2, 'aww'], [0.3, 'miss'], bed(1.4, 0.7, 1)],
      'QF: 0:20 LEFT': [[0, 'slam'], bed(0, 0.25, 0.3)],
      'QF: YOUR CALL': [bed(0, 0.5, 1.5)],
      'QF: 6834 CLIMBS': [bed(0, 1, 0.4), [0.5, 'robot', { dur: 1.2 }], [2.6, 'robot', { dur: 0.6, vol: 0.8 }]],
      'QF: 6834 MADE IT': [[0, 'clunk'], [0.05, 'cheer', { size: 1 }]],
      'QF: 6834 MISSED': [[0, 'clunk'], [0.15, 'aww']],
      'QF: 6417 CLIMBS': [[0.5, 'robot', { dur: 1.2, vol: 0.7 }], [2.6, 'robot', { dur: 0.6, vol: 0.6 }]],
      'QF: 6417 MADE IT': [[0, 'clunk'], [0.1, 'aww']],
      'QF: 6417 MISSED': [[0, 'clunk'], [0.1, 'cheer', { size: 0.8 }]],
      'QF: WE WIN THE SERIES': [[0, 'horn', { dur: 1.2 }], [0.1, 'cheer', { size: 1 }], [0.3, 'fanfare'], bed(1.5, 0.7, 1.5)],
      'QF: KNOCKED OUT': [[0, 'horn', { dur: 1.2 }], [0.2, 'aww'], [0.4, 'miss'], bed(1.5, 0.5, 1.5)],
    },
    // The bet log's verdict, from what A says on it: CONTINUE for the right pick, REWIND for the wrong one. CLOSE: the
    // goal card opened from its pill in the second pick's header.
    label: { CONTINUE: [[0.25, 'jingle']], REWIND: [[0.25, 'miss']], CLOSE: [[0, 'card', { soft: true }]] },
    clock: { last: 10 },
  },

  'TEAM MEETING': {
    bed: 'outdoors', surface: 'grass', music: 'day', cut: 1, free: 1,
    beats: {
      0: [card(0.5)],
      4: [[0, 'claps', { dur: 1.3, n: 24 }]],
      6: [[0, 'claps', { dur: 1.3, n: 24 }]],
      8: [[0, 'claps', { dur: 1.3, n: 26 }], [0.2, 'cheer', { size: 0.3 }]],
      10: [[0, 'claps', { dur: 1.2, n: 20 }]],
      16: [[0, 'aww']],
      19: [[0.05, 'cheer', { size: 0.9 }], [0.05, 'fanfare', { key: 72 }]],
    },
  },

  'PRACTICE FIELD': {
    bed: 'cafeteria', surface: 'carpet', music: 'day', cut: 1, free: 1,
    beats: {
      0: [card(0.65)],
      4: [[0.4, 'enable']],
      5: [[0.1, 'robot', { dur: 2.2 }], [2.6, 'robot', { dur: 1.6, vol: 0.8 }], [4.4, 'clunk'], [4.9, 'robot', { dur: 2.2 }]],
      6: [[0, 'robot', { dur: 1.6, vol: 0.8 }]],
      7: [[0, 'click']],
      8: [[0, 'cheer', { size: 0.35 }], [0.05, 'jingle']],
      10: [[0.1, 'door']],
    },
  },

  'THE VAN': {
    bed: 'road', surface: null, music: 'day', cut: 1, free: 0.9,
    beats: {
      0: [card(0.2)],
      12: [[0.3, 'signal', { n: 10 }]],
      13: [[0, 'signal', { n: 4 }]],
    },
  },

  'THE PITS': {
    bed: 'pits', surface: 'hard', music: 'event', cut: 1, free: 1,
    beats: {
      0: [card(0.35)],
      2: [[0, 'chime']],
      9: [[0.1, 'cart', { dur: 7.5 }]],
    },
  },

  'THE ARENA': {
    bed: 'arena', surface: 'hard', music: 'event', cut: 1, free: 0.9,
    beats: {
      0: [card(0.35)],
      2: [[0, 'clunk'], [0.05, 'cheer', { size: 1 }], bed(0.05, 1.3, 0.4), bed(2.4, 1, 1.5)],
      4: [[0, 'chime']],
    },
    // The matches going on around her (arena/flow.js), with the field's own cues as a 2019 field played them: the
    // cavalry charge at the start, three bells as the sandstorm ends, the alert at 30 seconds left and the train whistle
    // at 20, the buzzer at the end; and the crowd for the big moments, the final score and each alliance as the emcee
    // introduces it.
    moments: {
      START: [[0, 'charge'], [0.4, 'cheer', { size: 0.6 }], bed(0.4, 1.15, 0.4), bed(2.5, 0.9, 2)],
      TELEOP: [[0, 'bells']],
      ENDGAME: [[0, 'alert']],
      WHISTLE: [[0, 'whistle']],
      BUZZER: [[0, 'buzzer'], [0.2, 'cheer', { size: 0.8 }], bed(0.2, 1.2, 0.3), bed(3, 0.9, 2)],
      FINAL: [[0.3, 'cheer', { size: 0.45 }]],
      CLIMB: [[0, 'clunk'], [0.05, 'cheer', { size: 0.7 }]],
      ROCKET: [[0.05, 'cheer', { size: 0.6 }]],
      BLUE: [[0.7, 'cheer', { size: 0.55 }], [0.9, 'claps', { dur: 2, n: 26 }]],
      RED: [[0.7, 'cheer', { size: 0.55 }], [0.9, 'claps', { dur: 2, n: 26 }]],
    },
  },

  'ALLIANCE SELECTION': {
    bed: 'crowd', surface: 'hard', music: 'event', cut: 1, free: 1,
    beats: {
      // Close on the crowd, then the arc of signs with a spotlight coming on over each in turn, then the card.
      open: [bed(0, 1.2, 0.6), bed(1.4, 0.75, 0.4), ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => [1.8 + i * 0.22, 'spot', { vol: 0.6 }]), card(4.75)],
      mcEnters: [[0.4, 'skate', { dur: 4.2 }], [4.7, 'spin'], [5.2, 'spot']],
      welcome: [bed(0, 1, 0.4), [0.5, 'cheer', { size: 0.7 }]],
      thanks: [[1.4, 'cheer', { size: 0.9 }]],
      captains: [1, 2.3, 3.6, 4.9, 6.2, 7.5, 8.8, 10.1].map((t) => [t, 'cheer', { size: 0.35 }]),
      clock1: [[0.3, 'spot', { vol: 0.7 }]],
      accept1: [[0.3, 'cheer', { size: 0.8 }], [0.3, 'jingle']],
      moveUp: [[3, 'cheer', { size: 0.4 }]],
      clock2: [[0.3, 'spot', { vol: 0.7 }]],
      mcToHer: [[0.3, 'spot', { vol: 1.3 }], bed(0.3, 1.1, 0.3), [1.5, 'skate', { dur: 2.5 }]],
      accept2: [[0.2, 'fanfare'], [0.25, 'cheer', { size: 1 }]],
      later: [[0, 'leave']],
      alliances: [[0.3, 'cheer', { size: 0.8 }]],
      applause: [bed(0, 1.3, 1), [0.2, 'cheer', { size: 1 }], [0.6, 'claps', { dur: 2.6, n: 40, vol: 0.04 }]],
      out: [bed(0, 1, 2)],
    },
  },

  WORLDS: {
    bed: 'worlds', surface: 'hard', music: 'event', cut: 1, free: 1,
    beats: {
      // In the dark, the lamps coming on left to right (T 0.7 to 2.3), then the card.
      0: [bed(0, 0.3, 0.02), bed(0.7, 1, 1.8), ...[0.7, 1.02, 1.34, 1.66, 1.98, 2.3].map((t) => [t, 'spot', { vol: 0.8 }]), card(1.35)],
      // One beat per division; its card slides in as the beat starts.
      ...Object.fromEntries([2, 3, 4, 5, 6, 7, 8, 9].map((i) => [i, [card(0, { soft: true })]])),
    },
  },

  'THE SEASON SO FAR': {
    bed: null, surface: null, music: null, cut: 1, free: 1,
    enter: [[0.3, 'continued']],
  },
};

/** A scene not listed: a quiet room. */
export const DEFAULT = { bed: null, surface: 'floor', music: null, cut: 1, free: 1, beats: {} };

// ---- Voices: the pitch and wave each speaker's letters blip at ----
// Matched by name, first match wins; anyone else gets a voice from their name, so they always sound the same.
// m is a MIDI note (72 = C5); every: blip one letter in this many.
export const VOICES = [
  [/ANNOUNCER/, { m: 60, wave: 'tri', every: 3 }], // over the speakers
  [/^MC /, { m: 77, wave: 'p12' }],
  [/EVERYONE/, { m: 67, wave: 'p50', every: 2, chord: true }],
  [/^(MS|MR|MRS)\. /, { m: 64, wave: 'p50' }], // the grown-ups
  [/CUSTODIAN/, { m: 57, wave: 'p50' }],
];
/** Her voice, whatever her name is. */
export const HERO_VOICE = { m: 76, wave: 'p25' };
export const MATE_VOICE = { m: 72, wave: 'p25' };
const POOL = [
  { m: 67, wave: 'p25' }, { m: 69, wave: 'p50' }, { m: 71, wave: 'p25' }, { m: 72, wave: 'p50' },
  { m: 74, wave: 'p25' }, { m: 65, wave: 'p50' }, { m: 70, wave: 'p25' }, { m: 62, wave: 'p50' },
];
export function voiceFor(name, heroName, mateName) {
  if (!name) return POOL[0];
  if (name === heroName || name === 'STRATEGIST') return HERO_VOICE;
  if (name === mateName) return MATE_VOICE;
  for (const [re, v] of VOICES) if (re.test(name)) return v;
  let h = 0;
  for (const ch of name.split(',')[0]) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return POOL[h % POOL.length];
}
