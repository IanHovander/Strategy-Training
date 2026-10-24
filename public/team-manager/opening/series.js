// The quarterfinal's matches (docs/blue-banner-design.md, section 5, beat 2): alliance 4 against alliance 5, best 2 of
// 3. Alliance 4 is the higher seed, so it's red; alliance 5 is blue. quarter.js plays it, match.js draws it.
//
// Each match is a real one, played by the match simulation (../match/sim.js) with the event's robots (../match/
// robots.js, in their Saturday form: 6834 rebuilt) and each alliance's plan. What's on the field is what scores. The
// story picks the plans and the seeds, so the matches go the way it needs, and test/match-sim.mjs checks they still do:
//
//   Match 1   4471 defends 7777 all match, and red wins: the second pick paying off.
//   Match 2   the same plans, but 6834's battery browns out at 1:12 and it's dead on the field: blue wins. Nothing she
//             could have seen; the van can warn the pit crew about it on a later run (section 9).
//   Match 3   decides the series. Everyone but the two climbers heads home early, so at 0:20 every point left in the
//             match is 6834's climb and 6417's, and time stops there with red up 8, for the endgame call:
//
//   6834 can climb to LEVEL 2, +6, which it has made every time, or try LEVEL 3, +12, which it has made 5 times in 10
//   (when it fails it ends on Level 1, +3). Blue's climber, 6417, goes for Level 3: +12, made 6 times in 10, or
//   Level 1, +3.
//
//   LEVEL 2   up 14 against at most 12: wins every time.
//   LEVEL 3   loses only when 6834 fails and 6417 makes it: 0.5 x 0.6 = 0.3. Wins 7 times in 10.
//
// Everything pushes toward Level 3 (the crowd, 6834's driver, and 12 being the bigger number). That's the trap. The
// line to remember: WHEN THE SURE THING IS ENOUGH, TAKE IT.
//
// Match 3 is played once for each way the endgame can go (the call, and whether each climb is made): the same seed
// and the same plans up to 0:20, so the field she freezes on is the same whichever she calls.

import { OURS } from './teams.js';
import { simulate, MATCH } from '../match/sim.js';
import { robotOf, planOf } from '../match/robots.js';

export const RED = [OURS, '6834', '4471'];
export const BLUE = ['7777', '6417', '7311'];
/** Who climbs at the end of match 3, on each side. */
export const CLIMBER = '6834', THEIR_CLIMBER = '6417';
/** The freeze: seconds left. */
export const LEFT = 20;
export const FREEZE = MATCH.length - LEFT;

/** The call: 6834's two climbs. odds: how often it's made; fail: the points if it isn't. */
export const CALLS = [
  { key: 'l2', name: 'LEVEL 2', pts: 6, odds: 1, fail: 6, record: 'MADE IT 10 OF 10', note: 'NEVER MISSED' },
  { key: 'l3', name: 'LEVEL 3', pts: 12, odds: 0.5, fail: 3, record: 'MADE IT 5 OF 10', note: 'MISS: LEVEL 1, +3' },
];
export const THEIRS = { name: 'LEVEL 3', pts: 12, odds: 0.6, fail: 3, record: 'MADE IT 6 OF 10' };
export const RIGHT3 = 'l2';
export const LESSON3 = 'WHEN THE SURE THING IS ENOUGH, TAKE IT.';

// ---- The matches ----
/** Each match's seed: chosen so it goes the story's way (test/match-sim.mjs checks it still does). */
const SEEDS = [1, 8, 159];
/** 6834's battery in match 2: dead at 1:12. */
const BROWNOUT = MATCH.length - 72;
/** Saturday's robots: qualification match 9's form (6834 rebuilt, 7461 fading). */
const SATURDAY = 9;

const entry = (num, plan = {}, force = null) => {
  const robot = { num, ...robotOf(num, { match: SATURDAY }) };
  if (force) robot.force = force;
  return { robot, plan: { ...planOf(num), ...plan } };
};
const ON_7777 = { role: 'defend', defend: '7777' };

/**
 * What the simulation plays for match i (0 to 2). Match 3's endgame: call 'l2' or 'l3', and whether 6834's climb and
 * 6417's are made. In match 3 the others head home with 40 seconds left, so they're settled before the freeze.
 */
export function matchInput(i, { call = 'l2', made = true, theirsMade = true } = {}) {
  const seed = SEEDS[i];
  if (i < 2) {
    return {
      seed,
      blue: [entry('7777', { climb: 2 }), entry('6417', { climb: 3 }), entry('7311')],
      red: [
        entry(OURS, { climb: 2 }),
        entry('6834', { climb: 3 }, i === 1 ? { troubles: [{ t: BROWNOUT, why: 'brownout', dead: true }] } : null),
        entry('4471', ON_7777),
      ],
    };
  }
  return {
    seed,
    blue: [entry('7777', { climb: 2, climbAt: 40 }), entry('6417', { climb: 3, climbAt: LEFT }, { climb: theirsMade }), entry('7311', { climb: 1, climbAt: 40 })],
    red: [
      entry(OURS, { climb: 2, climbAt: 40 }),
      entry('6834', { climb: call === 'l2' ? 2 : 3, climbAt: LEFT }, { climb: made }),
      entry('4471', { ...ON_7777, climb: 1, climbAt: 40 }),
    ],
  };
}

const played = new Map();
/** Match i played (once, then kept). Match 3 with o: one way its endgame goes. */
export function matchOf(i, o = {}) {
  const key = JSON.stringify([i, o]);
  if (!played.has(key)) played.set(key, simulate(matchInput(i, o)));
  return played.get(key);
}

/** The score at t seconds: the sum of the events so far. */
export function scoreAt(match, t) {
  const s = { blue: 0, red: 0 };
  for (const e of match.events) if (e.t <= t) s[e.alliance] += e.pts;
  return s;
}
const pointsOf = (match, num) => match.robots.find((r) => r.num === num).points;

/** The three matches as the screens tell them: the final score (match 3's at the freeze), and the lines under each. */
export const MATCHES = [
  (() => {
    const m = matchOf(0);
    return { ...m.score, line: '4471 STAYS ON 7777 ALL MATCH.', after: `7777 SCORED ${pointsOf(m, '7777')}. 1-0 US.` };
  })(),
  { ...matchOf(1).score, line: 'MATCH 2. WIN IT AND WE\'RE THROUGH.', late: '6834 BROWNS OUT AT 1:12. DEAD ON THE FIELD.', lateAt: BROWNOUT, after: 'A LOOSE BATTERY. 1-1.' },
  { ...scoreAt(matchOf(2), FREEZE), line: 'MATCH 3. WINNER TAKES THE SERIES.' },
];
/** Red's lead at the freeze. */
export const LEAD = MATCHES[2].red - MATCHES[2].blue;

/** How often each call wins, out of 10 (for the bet log's picture). */
export function winsOutOf10(key) {
  const c = CALLS.find((k) => k.key === key);
  let p = 0;
  for (const [ours, po] of [[c.pts, c.odds], [c.fail, 1 - c.odds]]) {
    for (const [theirs, pt] of [[THEIRS.pts, THEIRS.odds], [THEIRS.fail, 1 - THEIRS.odds]]) {
      if (LEAD + ours > theirs) p += po * pt;
    }
  }
  return Math.round(p * 10);
}

/**
 * Roll the endgame: whether 6834's climb and 6417's are made. Honest dice; ?climb=made|missed and ?theirs=made|missed
 * in the address fix them, for testing. Then match 3 is played out that way: match is the whole match, red and blue its
 * final score.
 */
export function rollEndgame(key, q = new URLSearchParams(location.search)) {
  const c = CALLS.find((k) => k.key === key);
  const fixed = (name, odds) => (q.get(name) === 'made' ? true : q.get(name) === 'missed' ? false : Math.random() < odds);
  const made = c.odds >= 1 || fixed('climb', c.odds), theirsMade = fixed('theirs', THEIRS.odds);
  const match = matchOf(2, { call: key, made, theirsMade });
  return { key, made, theirsMade, match, red: match.score.red, blue: match.score.blue, won: match.score.red > match.score.blue };
}
