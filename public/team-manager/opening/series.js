// The quarterfinal's numbers (docs/blue-banner-design.md, section 5, beat 2): alliance 4 against alliance 5, best 2 of
// 3. Alliance 4 is the higher seed, so it's red; alliance 5 is blue. quarter.js plays it, match.js draws it.
//
// Match 1 is the second pick paying off: 4471 stays on 7777 all match, and red wins. Match 2 is lost to something
// that wasn't hers to see: 6834's battery browns out (the van can warn the pit crew about it on a later run, section
// 7). Match 3 decides the series, and freezes with 20 seconds left and red up by 7, for the endgame call:
//
//   6834 can climb to LEVEL 2, +6, which it has made every time, or try LEVEL 3, +12, which it has made 5 times in 10
//   (when it fails it ends on Level 1, +3). Blue's climber, 6417, goes for Level 3: +12, made 6 times in 10, or
//   Level 1, +3.
//
//   LEVEL 2   up 13 against at most 12: wins every time.
//   LEVEL 3   loses only when 6834 fails and 6417 makes it: 0.5 x 0.6 = 0.3. Wins 7 times in 10.
//
// Everything pushes toward Level 3 (the crowd, 6834's driver, and 12 being the bigger number). That's the trap. The
// line to remember: WHEN THE SURE THING IS ENOUGH, TAKE IT.

import { OURS } from './teams.js';

export const RED = [OURS, '6834', '4471'];
export const BLUE = ['7777', '6417', '7311'];
/** Who climbs at the end of match 3, on each side. */
export const CLIMBER = '6834', THEIR_CLIMBER = '6417';

/** The three matches: final scores (match 3's at the freeze), and the line under each. */
export const MATCHES = [
  { red: 88, blue: 74, line: '4471 STAYS ON 7777 ALL MATCH.', after: '7777 SCORED 22. 1-0 US.' },
  { red: 61, blue: 80, line: '6834 BROWNS OUT AT 1:12. DEAD ON THE FIELD.', after: 'A LOOSE BATTERY. 1-1.' },
  { red: 71, blue: 64, line: 'MATCH 3. WINNER TAKES THE SERIES.' },
];
/** The freeze: seconds left, and red's lead. */
export const LEFT = 20;
export const LEAD = MATCHES[2].red - MATCHES[2].blue;

/** The call: 6834's two climbs. odds: how often it's made; fail: the points if it isn't. */
export const CALLS = [
  { key: 'l2', name: 'LEVEL 2', pts: 6, odds: 1, fail: 6, record: 'MADE IT 10 OF 10', note: 'NEVER MISSED' },
  { key: 'l3', name: 'LEVEL 3', pts: 12, odds: 0.5, fail: 3, record: 'MADE IT 5 OF 10', note: 'MISS: LEVEL 1, +3' },
];
export const THEIRS = { name: 'LEVEL 3', pts: 12, odds: 0.6, fail: 3, record: 'MADE IT 6 OF 10' };
export const RIGHT3 = 'l2';
export const LESSON3 = 'WHEN THE SURE THING IS ENOUGH, TAKE IT.';

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
 * in the address fix them, for testing.
 */
export function rollEndgame(key, q = new URLSearchParams(location.search)) {
  const c = CALLS.find((k) => k.key === key);
  const fixed = (name, odds) => (q.get(name) === 'made' ? true : q.get(name) === 'missed' ? false : Math.random() < odds);
  const made = c.odds >= 1 || fixed('climb', c.odds), theirsMade = fixed('theirs', THEIRS.odds);
  const red = MATCHES[2].red + (made ? c.pts : c.fail), blue = MATCHES[2].blue + (theirsMade ? THEIRS.pts : THEIRS.fail);
  return { key, made, theirsMade, red, blue, won: red > blue };
}
