// The qualification matches on the arena's field, one after another all Saturday morning: match 42 as the strategist
// walks in, 43 waiting in the queue, 44 with her own team in it (the pits called it), and on from there for as long as
// she stays. Each one is played by the match simulation (../match/sim.js) with the event's robots (../match/robots.js),
// once, the first time it's wanted, so what's on the field is what scores and the scoring table shows it. Pure: no DOM.
//
// The arena keeps its own clock (cutscene.js starts it, scene.js carries it on into walking): the arena's time, T, in
// seconds. Match n starts at startOf(n); its 150 seconds are the simulation's own, played at their own pace so a
// robot's cycle reads true; then come TURN seconds from its final buzzer to the next match's start (turnover.js), with
// the field cleared and set again for the next.
//
// The time between matches, and why it's what it is: an event's schedule runs a qualification match every 7 minutes
// (the 2019 manual's sample schedule: 2:30, 2:37, 2:44), so four and a half minutes go between one match's buzzer and the
// next one's start. In that time the referees confirm the field is safe, six drive teams carry their robots off, the
// field crew resets every piece, six more carry theirs on, set up at their stations and connect, and the emcee
// introduces them. Here it all happens in TURN, 63 seconds: everyone walks at a person's pace and every step of it is
// there, in order, but the waiting is cut (for the referees, for a robot's radio to link, for a slow team), about four
// times over. Long enough to watch a robot go off and another come on from wherever she's standing, short enough that
// there's a match on most of the time: whenever she walks up to the field, it's in a match (150 seconds of every 213),
// or plainly between two.
//
// The first three are the story's. Match 42 is the cut scene's: 3000 on blue and 7777 on red, as the pits' boards say
// (ON FIELD, MATCH 42), 7777 playing defense the way its scout Juno talks of it, and two blue robots that go for the
// rockets with hatch panels, the elevator 8812 and 6612. The cut scene holds on the blue rocket as a hatch panel goes on
// its level 3 (the announcer calls it), so match 42 is played with seeds in turn until one has a blue level 3 hatch on
// the far rocket (the one the camera sees) at a good moment, and its clock is set so that hatch goes on at SEEN_AT, as
// the cut scene holds on it. If none does in SEARCH tries (the simulation's rules can change), the best blue hatch on
// that rocket stands in, and the announcer says its level. Match 43 is the queue's: 2468 and 1357, as the pits have it,
// with four more. Match 44 is the pits' call, word for word: red 1100, 3141 and 6174; blue OURS, 2020 and 7009, with the
// plan the strategist hands the drive team in the pits (hatches, Level 3 at 0:20) and 6174 guarding. From 45 on,
// matches are drawn from the event's teams (robots.js EVENT), nobody playing in two matches running. Teams the event's
// list doesn't have get a kind of robot from EXTRA, or one picked by their number.
//
//   FIRST, TURN, CYCLE      the first match, the seconds between matches, and match plus turn
//   SEEN_AT                 the arena's time as the cut scene's level 3 hatch goes on
//   lineupOf(n)             match n's numbers: { blue: [3], red: [3] }, in station order
//   spriteOf(num)           the sprite a team's robot is drawn with (bots.js)
//   matchOf(n)              match n, played: { n, lineup, result (sim.js), show (animate.js) }
//   highlight()             match 42's hatch for the cut scene: { t, level, by }
//   startOf(n)              the arena's time as match n starts
//   clockAt(T)              what's on at T: { n, phase: 'match' | 'turn', t } (t: seconds into the match, or since its
//                           final buzzer)
//   prefetch(n)             play match n soon, in the background, so it's ready before it's wanted

import { simulate, MATCH } from '../match/sim.js';
import { makeShow } from '../match/animate.js';
import { robotOf, planOf, archetype, TEAMS, EVENT } from '../match/robots.js';
import { OURS } from '../opening/teams.js';

export const FIRST = 42;
export const TURN = 63;
export const CYCLE = MATCH.length + TURN;
/** The arena's time as the cut scene's hatch goes on: half a second into its hold on the blue rocket (cutscene.js). */
export const SEEN_AT = 21;
/** Saturday morning: every team's robot in its form for its last qualification matches (robots.js). */
const SATURDAY = 9;
/**
 * Seeds tried for match 42, and when in it the hatch had best go on: late enough that the cut scene opens on a match well
 * under way, early enough that it's still on once she's walking, endgame and all (WINDOW); at a pinch, any time after
 * the sandstorm that leaves the cut scene inside the match (LATE).
 */
const SEARCH = 40, WINDOW = [55, 105], LATE = [30, 136];

// ---- Who plays ----
/** Kinds of robot for the numbers the pits and the queue name that robots.js doesn't know. */
const EXTRA = { 2020: 'arm', 7009: 'ship', 1100: 'swerve', 3141: 'climber', 6174: 'def' };
const KINDS = ['ele', 'arm', 'ship', 'hatchlow', 'swerve', 'climber', 'wedge'];
/** The story's matches: [number, plan] in station order, blue then red. */
const STORY = {
  42: {
    blue: [['8812', { piece: 'hatch', where: 'rocket' }], ['3000'], ['6612', { piece: 'hatch', where: 'rocket' }]],
    red: [['6038'], ['7777', { role: 'defend', defend: '8812' }], ['2202']],
  },
  43: { blue: [['2468'], ['1357'], ['9785']], red: [['4000'], ['5940'], ['7040']] },
  44: {
    blue: [[OURS, { piece: 'hatch', where: 'rocket', climb: 3, climbAt: 20 }], ['2020'], ['7009']],
    red: [['1100'], ['3141'], ['6174', { role: 'defend', defend: OURS }]],
  },
};

/** A team's robot as the simulation takes it, in its Saturday form. */
function robotFor(num) {
  if (TEAMS[num]) return { num, ...robotOf(num, { match: SATURDAY }) };
  const kind = EXTRA[num] ?? KINDS[[...num].reduce((h, c) => h * 31 + c.charCodeAt(0), 7) % KINDS.length];
  return archetype(kind, { num });
}
/** The sprite a team's robot is drawn with (bots.js), for a robot waiting in the queue before its match is played. */
const sprites = new Map();
export function spriteOf(num) {
  if (!sprites.has(num)) sprites.set(num, robotFor(num).sprite ?? 'ele');
  return sprites.get(num);
}

/** A seeded shuffle (robots.js's), so the same match always draws the same teams. */
function shuffle(list, seed) {
  let s = seed >>> 0 || 1;
  const rand = () => {
    s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0;
    return s / 4294967296;
  };
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const lineups = new Map();
/** Match n's numbers in station order: the story's, or six of the event's teams who didn't play in the two before. */
export function lineupOf(n) {
  if (lineups.has(n)) return lineups.get(n);
  let out;
  if (STORY[n]) out = { blue: STORY[n].blue.map(([num]) => num), red: STORY[n].red.map(([num]) => num) };
  else {
    const rested = n > FIRST ? [n - 1, n - 2].filter((k) => k >= FIRST).flatMap((k) => [...lineupOf(k).blue, ...lineupOf(k).red]) : [];
    const six = shuffle(EVENT, n * 7919 + 3).filter((num) => !rested.includes(num)).slice(0, 6);
    out = { blue: six.slice(0, 3), red: six.slice(3) };
  }
  lineups.set(n, out);
  return out;
}

/** What the simulation plays for match n with this seed. */
function inputOf(n, seed) {
  const plans = STORY[n] ?? null, lineup = lineupOf(n);
  const side = (a) => lineup[a].map((num, i) => ({ robot: robotFor(num), plan: { ...planOf(num), ...(plans?.[a][i][1] ?? {}) } }));
  return { seed, blue: side('blue'), red: side('red') };
}

// ---- Match 42's hatch ----
let found = null;
/** The blue level 3 hatch on the far rocket (or the best blue hatch there) in match 42, and the seed that plays it. */
export function highlight() {
  if (found) return found;
  const onFar = (e) => e.alliance === 'blue' && /^hatch:f\d[ha]$/.test(e.slot ?? '');
  let best = null;
  for (let seed = 1; seed <= SEARCH; seed++) {
    const m = simulate({ ...inputOf(FIRST, seed), record: false });
    for (const e of m.events.filter(onFar)) {
      const level = +e.slot[7], within = ([a, b]) => e.t >= a && e.t <= b;
      const score = within(LATE) ? level * 10 + (within(WINDOW) ? 5 : 0) : 0;
      if (score && (!best || score > best.score)) best = { seed, t: e.t, level, by: e.by, score };
    }
    if (best?.score >= 35) break;
  }
  found = best ?? { seed: 1, t: 60, level: 0, by: null };
  return found;
}

// ---- Playing them ----
const played = new Map();
/** Match n, played once and kept (the last few). */
export function matchOf(n) {
  if (played.has(n)) return played.get(n);
  const seed = n === FIRST ? highlight().seed : n;
  const result = simulate(inputOf(n, seed));
  const m = { n, lineup: lineupOf(n), result, show: makeShow(result) };
  played.set(n, m);
  if (played.size > 6) played.delete([...played.keys()].sort((a, b) => Math.abs(a - n) - Math.abs(b - n)).at(-1));
  return m;
}
/** Play match n a moment from now, if it isn't already, so the frame that first needs it doesn't wait. */
export function prefetch(n) {
  if (played.has(n) || typeof setTimeout === 'undefined') return;
  setTimeout(() => matchOf(n), 50);
}

// ---- The clock ----
/** The arena's time as match n starts. */
export const startOf = (n) => SEEN_AT - highlight().t + (n - FIRST) * CYCLE;
/** What's on at the arena's time T: match n, t seconds in, or the turn after it, t seconds after its buzzer. */
export function clockAt(T) {
  const k = Math.floor((T - startOf(FIRST)) / CYCLE), n = FIRST + k, u = T - startOf(n);
  return u < MATCH.length ? { n, phase: 'match', t: u } : { n, phase: 'turn', t: u - MATCH.length };
}
