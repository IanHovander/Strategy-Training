// Who's who at the opening's second pick (docs/blue-banner-design.md, section 5, beat 1b). Alliance selection goes on
// after her first pick: round 1 finishes (alliances 5, 6, 7 and 8 pick), round 2 runs back up the line (8, 7, 6, 5),
// and then it's alliance 4's second pick, hers. The quarterfinal is alliance 4 against alliance 5, best 2 of 3, so the
// second robot is for beating alliance 5, and that's the one thing to notice.
//
// Alliance 5 is built to score cargo: its captain, 7777, is the top scorer at the event (46 a match), and it takes
// another cargo robot, 6417 (36), then a hatch robot, 7311 (20). When her turn comes, three teams are left on her list:
//   2202  the biggest average left, 27, all of it cargo. The tempting one: it adds 27 to her alliance, and alliance 5
//         scores what it always scores. 105 to 102: a coin flip, three times.
//   5518  a Level 3 climber that makes the climb two times in seven (20 a match). 98 to 102.
//   4471  the smallest average, 14, because it plays defense. In Q23 it played defense on 7777 and held it to 22, under
//         half its average; 7777's own strip shows that match. With 4471 on 7777: 92 to 78. The right pick.
// In 2019 the third robot on an alliance often played defense, so this is the real game's strategy, not a trick: one
// robot that takes 24 points off their star is worth more than one that adds 27 to a pile.
//
// The sums are the scouting app's: each robot's average points, added up. Her alliance counts 6834 at 48, its last four
// matches (pick 1's lesson: the trend, not the average); her own robot is 30.
//
// Alliances 1 to 3 and their first picks are the cut scene's (cutscene.js SEEDS and PICKS): keep them the same. The
// team numbers are made up for the game, so no real team's robot is portrayed; most are alliance selection's waiting
// reps (alliance-selection/layout.js RANKED), so the faces in the crowd and the numbers on the board agree.
//
//   SEEDS            the eight captains by seed (the cut scene's), hers (teams.js OURS) fourth
//   FIRST            each alliance's first pick as her turn in round 1 ends: 1 to 3 the cut scene's, 4 hers (6834)
//   ORDER            the picks that happen while she waits, in order: { alliance, round, num }
//   POOL             the teams on her list as the picks begin, best average first: { num, role, scores, note, key, mark }
//                    key: a line of data the card shows under the strip; mark: the match (0-9) it's about, outlined
//   OPPONENT         alliance 5, the quarterfinal's other side; STAR its captain, 7777, the top scorer
//   RIGHT2           the right second pick
//   BASE             what her alliance scores before the second pick: 5026 30, 6834 48 (its last four)
//   matchup(num)     the sums for the bet log: { us: [[num, pts], ...], them: [[num, pts, was], ...] }
//   avg(team)        a team's average over its ten matches
//   statusOf(pick)   the phone's status line while that pick's being made, for the sound (one cue per pick)

import { TEAMS as FIRST_TEAMS, YOU, OURS } from './teams.js';

export const SEEDS = ['4000', '2468', '3000', OURS, '7777', '8086', '5940', '9152'];
export const FIRST = ['1357', '8812', '7040', '6834', '', '', '', ''];
export const US = 4, OPPONENT = 5, STAR = '7777';
export const RIGHT2 = '4471';

/** What a robot does, as the card (word) and the opponent's box (short) say it, with a colour each (the tile's stripe,
 * the card's chip). */
export const ROLES = {
  cargo: { word: 'CARGO', short: 'CARGO', c: '#ff7a1c' },
  hatch: { word: 'HATCH', short: 'HATCH', c: '#ffc61a' },
  both: { word: 'HATCH + CARGO', short: 'BOTH', c: '#ffb46a' },
  def: { word: 'DEFENSE', short: 'DEFENSE', c: '#4a90ff' },
  l3: { word: 'L3 CLIMB', short: 'CLIMB', c: '#3fd06a' },
};

const fading = FIRST_TEAMS.find((t) => t.num === '7461');

/**
 * Her list as the picks begin: eleven teams, best average first, so the trap sits highest of the three that are left
 * when it's her turn. Notes are in the 3x5 letters (no comma, no question mark): full stops instead.
 */
export const POOL = [
  { num: '7461', role: 'cargo', scores: fading.scores, note: 'BIG. FAST. FADING SINCE FRIDAY.' },
  { num: '6417', role: 'cargo', scores: [34, 38, 35, 37, 33, 39, 36, 35, 38, 35], note: 'CARGO SHIP. STEADY.' },
  { num: '6038', role: 'both', scores: [30, 35, 33, 31, 36, 32, 34, 33, 31, 35], note: 'DOES A BIT OF EVERYTHING.' },
  { num: '6612', role: 'hatch', scores: [29, 33, 30, 32, 28, 31, 34, 30, 31, 32], note: 'ROCKET HATCHES. QUICK.' },
  { num: '8248', role: 'cargo', scores: [31, 28, 30, 33, 27, 30, 29, 32, 30, 30], note: 'GOOD SANDSTORM AUTO.' },
  { num: '9785', role: 'hatch', scores: [27, 30, 31, 26, 29, 30, 28, 31, 29, 29], note: 'HATCHES. LOW ROCKET ONLY.' },
  // The trap: the biggest average of the three left, all of it the way alliance 5 scores too: a pile of cargo.
  { num: '2202', role: 'cargo', scores: [24, 29, 26, 31, 25, 28, 27, 30, 26, 24], note: 'CARGO. 27 A MATCH. STEADY.' },
  { num: '6017', role: 'both', scores: [25, 28, 24, 27, 26, 29, 25, 26, 27, 23], note: 'SLOW BUT SURE.' },
  { num: '7311', role: 'hatch', scores: [18, 21, 20, 22, 19, 20, 21, 19, 20, 20], note: 'HATCHES ON THE CARGO SHIP.' },
  // Climbs to Level 3 (+12) two times in seven tries: the two big boxes.
  { num: '5518', role: 'l3', scores: [18, 30, 17, 19, 16, 29, 18, 17, 19, 17], note: 'GOES FOR LEVEL 3 EVERY MATCH.', key: 'MADE THE L3 CLIMB 2 TIMES IN 7.', mark: [1, 5] },
  // The right pick: its own points are few because it spends its matches on defense. Match 5 (Q23) was on 7777.
  { num: '4471', role: 'def', scores: [12, 15, 14, 13, 16, 14, 12, 15, 14, 15], note: 'DEFENSE. QUICK. HARD TO PUSH.', key: 'Q23: ON 7777. HELD IT TO 22.', mark: [4] },
];

/** The other robots on the board, for the opponent's box: alliance 5's captain, and the captains' roles. */
export const OTHERS = {
  7777: { num: '7777', role: 'cargo', scores: [48, 47, 50, 49, 22, 48, 49, 50, 48, 49], note: 'TOP SCORER AT THE EVENT.' },
};

/**
 * The picks while she waits: round 1 from alliance 5 down to 8, round 2 back up from 8 to 5. Alliance 5 takes
 * the cargo robot that's steady (6417), not the fading one; alliance 6 takes the biggest average left, 7461.
 */
export const ORDER = [
  { alliance: 5, round: 1, num: '6417' },
  { alliance: 6, round: 1, num: '7461' },
  { alliance: 7, round: 1, num: '6038' },
  { alliance: 8, round: 1, num: '6612' },
  { alliance: 8, round: 2, num: '8248' },
  { alliance: 7, round: 2, num: '9785' },
  { alliance: 6, round: 2, num: '6017' },
  { alliance: 5, round: 2, num: '7311' },
];

export const statusOf = (p) => `ROUND ${p.round}: ALLIANCE ${p.alliance} PICKS`;

export const avg = (team) => Math.round(team.scores.reduce((a, b) => a + b, 0) / team.scores.length);
export const teamOf = (num) => POOL.find((t) => t.num === num) ?? OTHERS[num];

/** Her alliance before the second pick: her robot's average, and 6834's last four (the trend). */
export const BASE = [[YOU.num, avg(YOU)], ['6834', 48]];
/** Alliance 5 as it stands at her turn: what each scores, on average. */
const THEM = [[STAR, avg(OTHERS[STAR])], ['6417', avg(teamOf('6417'))], ['7311', avg(teamOf('7311'))]];
/** 7777's points with 4471 on it, from Q23. */
export const HELD = 22;

/**
 * The sums with this second pick: her alliance's robots and points, and alliance 5's (with `was`, the average, where
 * defense takes some off).
 */
export function matchup(num) {
  const us = [...BASE, [num, avg(teamOf(num))]];
  const them = THEM.map(([n, pts]) => (num === RIGHT2 && n === STAR ? [n, HELD, pts] : [n, pts, pts]));
  return { us, them, usSum: us.reduce((a, [, p]) => a + p, 0), themSum: them.reduce((a, [, p]) => a + p, 0) };
}
