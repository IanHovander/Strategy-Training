// The senior strategist's page, as it stands on Saturday at 12:38: every team's ten qualification matches and an
// average, with a few words on each. It's the only thing she has in the opening, and all of it is true. What it
// doesn't do is say what any of it means: 7461's average is the biggest left on the page because of Friday morning,
// 6834's is ordinary because of Friday morning, and 4471's is the smallest because it spends its matches on someone
// else's robot. 7461's and 6834's strips are opening/teams.js's; the rest of the event is here.
//
//   SEEDS, TAKEN     the eight captains by seed (hers fourth), and alliances 1 to 3's first picks, made before her turn
//   PAGE             { num: { scores: [10], note, kind } }
//   pageInfo(num)    a team as the tablet shows it (draft.js info)
//   pageStats()      the same page as the other captains' scouts have it (event.js fieldStats' shape)
//   RANKING          every team in the order the opening's selection goes by

import { TEAMS as FIRST, YOU, OURS } from '../opening/teams.js';
import { TEAMS, KIND } from './event.js';

/** The captains by seed (the cut scene's: its audience display shows them), hers fourth. */
export const SEEDS = ['4000', '2468', '3000', OURS, '7777', '8086', '5940', '9152'];
export const TAKEN = ['1357', '8812', '7040'];

// The teams the page has most on. key: a line of the senior strategist's own under a team's strip; mark: the matches
// it's about, outlined. Notes are in the small letters: no question marks.
const POOL = [
  { num: '6417', scores: [34, 38, 35, 37, 33, 39, 36, 35, 38, 35], note: 'CARGO SHIP. STEADY.' },
  { num: '6038', scores: [30, 35, 33, 31, 36, 32, 34, 33, 31, 35], note: 'DOES A BIT OF EVERYTHING.' },
  { num: '6612', scores: [29, 33, 30, 32, 28, 31, 34, 30, 31, 32], note: 'ROCKET HATCHES. QUICK.' },
  { num: '8248', scores: [31, 28, 30, 33, 27, 30, 29, 32, 30, 30], note: 'GOOD SANDSTORM AUTO.' },
  { num: '9785', scores: [27, 30, 31, 26, 29, 30, 28, 31, 29, 29], note: 'HATCHES. LOW ROCKET ONLY.' },
  // The trap: the biggest average of the three left, all of it the way alliance 5 scores too: a pile of cargo.
  { num: '2202', scores: [24, 29, 26, 31, 25, 28, 27, 30, 26, 24], note: 'CARGO. 27 A MATCH. STEADY.' },
  { num: '6017', scores: [25, 28, 24, 27, 26, 29, 25, 26, 27, 23], note: 'SLOW BUT SURE.' },
  { num: '7311', scores: [18, 21, 20, 22, 19, 20, 21, 19, 20, 20], note: 'HATCHES ON THE CARGO SHIP.' },
  // Climbs to Level 3 (+12) two times in seven tries: the two big boxes.
  { num: '5518', scores: [18, 30, 17, 19, 16, 29, 18, 17, 19, 17], note: 'GOES FOR LEVEL 3 EVERY MATCH.', key: 'MADE THE L3 CLIMB 2 TIMES IN 7.', mark: [1, 5] },
  // The right pick: its own points are few because it spends its matches on defense. Match 5 (Q23) was on 7777.
  { num: '4471', scores: [12, 15, 14, 13, 16, 14, 12, 15, 14, 15], note: 'DEFENSE. QUICK. HARD TO PUSH.', key: 'Q23: ON 7777. HELD IT TO 22.', mark: [4] },
];

const more = {
  4000: { scores: [44, 41, 46, 43, 45, 40, 44, 42, 45, 43], note: 'FAST. CARGO AND HATCHES. SEED 1.' },
  2468: { scores: [36, 39, 35, 38, 40, 37, 36, 39, 38, 37], note: 'ELEVATOR. HATCHES TO LEVEL 3.' },
  3000: { scores: [30, 33, 31, 36, 38, 37, 39, 36, 38, 37], note: 'CLIMBS LEVEL 3 MOST MATCHES.' },
  8086: { scores: [31, 28, 30, 29, 33, 30, 28, 31, 30, 29], note: 'CARGO ARM. STEADY.' },
  5940: { scores: [22, 24, 21, 23, 20, 22, 25, 21, 22, 23], note: 'LOW HATCHES.' },
  9152: { scores: [27, 25, 28, 26, 29, 27, 24, 28, 27, 26], note: 'CARGO SHIP.' },
  1357: { scores: [33, 27, 35, 29, 34, 28, 36, 30, 33, 31], note: 'CARGO TO LEVEL 3. UP AND DOWN.' },
  8812: { scores: [34, 31, 6, 35, 33, 32, 36, 9, 34, 33], note: 'ELEVATOR. DIED TWICE.' },
  7040: { scores: [20, 22, 19, 21, 23, 20, 22, 21, 20, 22], note: 'PUSHES. A LITTLE CARGO.' },
  9201: { scores: [14, 17, 12, 16, 15, 18, 13, 16, 15, 17], note: 'ROOKIES. KIT CHASSIS.' },
};
export const PAGE = {
  [OURS]: { scores: YOU.scores, note: 'US. HATCHES, EVERY LEVEL.' },
  ...Object.fromEntries(POOL.map((t) => [t.num, { scores: t.scores, note: t.note, key: t.key, mark: t.mark }])),
  6834: { scores: FIRST.find((t) => t.num === '6834').scores, note: FIRST.find((t) => t.num === '6834').note },
  7461: { scores: FIRST.find((t) => t.num === '7461').scores, note: FIRST.find((t) => t.num === '7461').note },
  7777: { scores: [48, 47, 50, 49, 22, 48, 49, 50, 48, 49], note: 'TOP SCORER AT THE EVENT.' },
  ...more,
};
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
export const avgOf = (num) => Math.round(mean(PAGE[num].scores));

/** A team as the opening's tablet shows it: its average, its ten matches, and the page's few words. */
export function pageInfo(num) {
  const p = PAGE[num];
  return { value: avgOf(num), kind: KIND[num], row: p.scores, lines: [p.key ?? p.note], mark: p.mark ?? [], star: false };
}
/** The page as the other captains read it: an average, the last four, and who plays defense (4471, all weekend). */
export function pageStats() {
  return Object.fromEntries(TEAMS.map((n) => {
    const s = PAGE[n].scores;
    return [n, { avg: mean(s), recent: mean(s.slice(-4)), defends: n === '4471' ? 1 : 0, taken: n === '4471' ? 24 : 0, l3: [0, 0], died: s.filter((v) => v < 10).length }];
  }));
}
/** The opening's order: the eight captains as the cut scene has them, then everyone else, biggest average first. */
export const RANKING = [...SEEDS, ...TEAMS.filter((n) => !SEEDS.includes(n)).sort((a, b) => avgOf(b) - avgOf(a))];
