// The divisions' qualification matches at the World Championship, played by the match simulation (../match/sim.js), so
// each field's robots, every piece on it and the score on its big screen and scoring table are a real match's, the way
// the arena's are (arena/schedule.js). Each match is played once, the first time it's wanted, and kept a while.
//
// The changeover between two is the arena's (arena/flow.js), lighter: the hall has eight fields and she sees each one
// in passing, and its drive teams and crews are people.js's, standing where they stand. In layout.js's RESET seconds the
// robots stand disabled where the buzzer left them; the field is called safe, the nosecone lights turn green and the
// gates are unchained; one by one the robots are carried off, every piece comes out, the depots are filled and the next
// match's null hatch panels and cargo go into the cargo ship; one by one the next match's robots are set on the HAB;
// then the gates are chained and the lights go out, and the next match starts.
//
// Each division's teams are its own made-up numbers: the four layout.js gives it (on the field as the hall opens: the
// blue elevator, the red elevator, the blue arm and the red defender, who plays defense), and twenty more drawn for it
// from its name, kept clear of every other division's. Their robots are the event's kinds (robots.js archetypes), the
// first four as layout.js says and the rest picked by number, no rookie kitbots at a championship.
//
//   divisionMatch(k, n)          division k's match n (0: the one on as the hall opens), played: { lineup, result, show }
//   divisionFrame(k, n, into)    what's on its field `into` seconds after match n started (past PLAY, the reset):
//                                { frame (for match/draw.js liveOf), score: [blue, red], lights, gates }

import { simulate, MATCH } from '../match/sim.js';
import { makeShow, frameAt } from '../match/animate.js';
import { archetype } from '../match/robots.js';
import { GATES } from '../field.js';
import { DIVISIONS } from './layout.js';

/** The kinds of the four on the field as the hall opens, and the ones a championship team's robot is drawn from. */
const FIRST_KINDS = ['ele', 'ele', 'arm', 'def'];
const KINDS = ['swerve', 'ele', 'climber', 'arm', 'ship', 'hatchlow', 'swerve', 'ele'];
/** How many teams each division has, besides the four, for its matches. */
const MORE = 20;

/** A seeded random number generator: the same division and match always draw the same. */
function seededRand(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0;
    return s / 4294967296;
  };
}
const hashOf = (str) => [...str].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);

// ---- The teams ----
let pools = null;
/**
 * Division k's teams: its four, then MORE drawn from its name, none the same as any division's own numbers (its four or
 * its queue's) or another's drawn ones. All eight are drawn together, in order, so each is the same every time.
 */
function poolOf(k) {
  if (!pools) {
    const taken = new Set(DIVISIONS.flatMap((d) => [...d.teams, ...d.queue]));
    pools = DIVISIONS.map((d) => {
      const rand = seededRand(hashOf(d.name)), pool = [...d.teams];
      while (pool.length < d.teams.length + MORE) {
        const num = String(1000 + Math.floor(rand() * 9000));
        if (taken.has(num)) continue;
        taken.add(num);
        pool.push(num);
      }
      return pool;
    });
  }
  return pools[k];
}
const kindOf = (d, num) => {
  const i = d.teams.indexOf(num);
  return i >= 0 ? FIRST_KINDS[i] : KINDS[hashOf(num) % KINDS.length];
};

const lineups = new Map();
/** Match n's numbers, blue then red: the four and two more for the first; six who didn't just play for the rest. */
function lineupOf(k, n) {
  const key = `${k}/${n}`, d = DIVISIONS[k];
  if (lineups.has(key)) return lineups.get(key);
  const pool = poolOf(k), rand = seededRand(hashOf(`${d.name}/${n}`));
  let out;
  if (n <= 0) out = { blue: [d.teams[0], d.teams[2], pool[4]], red: [d.teams[1], d.teams[3], pool[5]] };
  else {
    const rested = new Set([...lineupOf(k, n - 1).blue, ...lineupOf(k, n - 1).red]);
    const order = pool.filter((num) => !rested.has(num)).map((num) => [rand(), num]).sort((a, b) => a[0] - b[0]).map(([, num]) => num);
    out = { blue: order.slice(0, 3), red: order.slice(3, 6) };
  }
  lineups.set(key, out);
  return out;
}

// ---- Playing them ----
const played = new Map();
export function divisionMatch(k, n) {
  const key = `${k}/${n}`, d = DIVISIONS[k];
  if (played.has(key)) return played.get(key);
  const lineup = lineupOf(k, n);
  // The red defender as the hall opens plays defense on the blue elevator, as the arena's did.
  const entry = (num) => ({
    robot: archetype(kindOf(d, num), { num }),
    plan: n <= 0 && num === d.teams[3] ? { role: 'defend', defend: d.teams[0] } : {},
  });
  const result = simulate({ seed: hashOf(key) % 100000, blue: lineup.blue.map(entry), red: lineup.red.map(entry) });
  const m = { lineup, result, show: makeShow(result) };
  played.set(key, m);
  if (played.size > 24) played.delete(played.keys().next().value);
  return m;
}

// ---- What's on the field ----
/** The reset, seconds after the buzzer: lights green and gates open, robots off, pieces, robots on, shut. */
const RESET_AT = { safe: 3, open: 3.5, off: 6, offEvery: 2.2, pieces: [8, 19], depots: 12, loose: 10, preload: 17, on: 17, onEvery: 1.5, shut: 27 };
const full = (slots, a, r) => [1, 2, 3].every((l) => ['h', 'a'].every((s) => slots[a][`hatch:${r}${l}${s}`] && slots[a][`cargo:${r}${l}${s}`]));
const lit = (slots) => ['blue', 'red'].flatMap((a) => [['f', 'far'], ['n', 'near']].filter(([r]) => full(slots, a, r)).map(([, rocket]) => ({ alliance: a, rocket, color: a })));

const last = new Map();
export function divisionFrame(k, n, into) {
  const key = `${k}/${n}/${into}`, kept = last.get(k);
  if (kept?.key === key) return kept.value;
  const m = divisionMatch(k, n);
  // The next one played a moment from now, in the background, so it's ready by the reset.
  if (!played.has(`${k}/${n + 1}`) && typeof setTimeout !== 'undefined') setTimeout(() => divisionMatch(k, n + 1), 40 + k * 30);
  let value;
  if (into < MATCH.length) {
    const frame = frameAt(m.show, into);
    value = { frame, score: [frame.score.blue, frame.score.red], lights: lit(frame.slots), gates: null };
  } else value = reset(k, n, m, into - MATCH.length);
  last.set(k, { key, value });
  return value;
}

/** The light changeover, s seconds after match n's buzzer (see the header). */
function reset(k, n, m, s) {
  const end = frameAt(m.show, MATCH.length), next = frameAt(divisionMatch(k, n + 1).show, 0), A = RESET_AT;
  const score = [m.result.score.blue, m.result.score.red];
  // Every piece out, a structure at a time, over the stretch the crew takes; then the next match's preloads in.
  const keys = ['blue', 'red'].flatMap((a) => Object.entries(end.slots[a]).filter(([, v]) => v).map(([slot]) => [a, slot]));
  const slots = { blue: { ...end.slots.blue }, red: { ...end.slots.red } };
  keys.sort((p, q) => p[1].localeCompare(q[1])).forEach(([a, slot], i) => {
    if (s >= A.pieces[0] + ((A.pieces[1] - A.pieces[0]) * i) / Math.max(1, keys.length)) slots[a][slot] = 0;
  });
  if (s >= A.preload) for (const a of ['blue', 'red']) Object.assign(slots[a], next.slots[a]);
  const depots = s >= A.depots ? next.depots : end.depots;
  const robots = [
    ...end.robots.filter((_, i) => s < A.off + i * A.offEvery),
    ...next.robots.filter((_, i) => s >= A.on + i * A.onEvery).map((r) => ({ ...r, rsl: true })),
  ];
  const frame = { t: 0, robots, slots, depots, loose: s >= A.loose ? [] : end.loose, score: m.result.score };
  const open = s >= A.open && s < A.shut;
  const gates = [{ ...GATES.blue, open }, { ...GATES.red, open }];
  const lights = s < A.safe ? lit(end.slots) : s < A.shut ? ['blue', 'red'].flatMap((a) => ['far', 'near'].map((rocket) => ({ alliance: a, rocket, color: 'green' }))) : [];
  return { frame, score, lights, gates };
}
