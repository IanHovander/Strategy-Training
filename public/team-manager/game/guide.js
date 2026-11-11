// The guided start. From the van to her first match the game walks her once round the loop it's about: a robot she
// chooses herself, its pit on Thursday, the stands on Friday, the notebook, her own match. Then it lets go. One yellow
// marker at a time points at the next thing (hud.js pointer), and each one ends when she's done that thing, or walked
// past it: nothing's forced, nobody remarks on it, nothing grades her.
//
// Which marker shows is worked out from the save every frame, so a reload can't leave one stuck: the robot she circled
// in the van (st.book.circled), the pits she's been to, what's in her notebook, the round and its time. The only flags
// are for the two things that happen once: the notebook's first ink-in, and her line at the first field note.
//
//   firstOf(st)            the robot she circled in the van (before she has: her first pick in the opening)
//   suggest(st)            the tiles the van's notebook marks for her, from her own Saturday: [{ num, word }]
//   firstMatch(st, r)      that robot's match in round r and hers: { q, ourQ, with: 'with' | 'against' | null }
//   guide(st, where)       the marker now, in the pits or the arena: { to, num, q, label } or null
//   inkDue(st)             the notebook's first ink-in is still to come (book.js)
//   chargeDue(st)          her line at the first field note is still to come (the places)
//   fridayLines(st)        the FRIDAY 8:30 AM card's lines
//   the words              every page of the stretch, here so the test can count them; who says each is up to where
//                          it's said
//
// It's pure (no DOM): main.js, the places and test/blue-banner-game.mjs all use it.

import { OURS, TEAMS, oursIn, sideOf } from './event.js';
import { worldOf, seenOf, notesFound } from './state.js';
import { SEEDS } from './cold-data.js';

/** The robot she's following: the one she circled in the van, or before then her first pick in the opening. */
export const firstOf = (st) => st.book?.circled ?? st.cold?.picks?.[0] ?? null;

/** What the senior strategist's page said about three robots, in its own words: the suggestions' third tile. */
const HINTS = [['6834', 'REBUILT'], ['4471', 'DEFENSE'], ['5518', 'LEVEL 3']];
/** Every word a suggestion can carry (3x5, in pencil under a tile's number). */
export const WORDS = ['MY PICK', 'BEAT US', 'TOP SEED', 'REBUILT', 'DEFENSE', 'LEVEL 3'];

/**
 * The tiles the van's notebook marks: her unfinished business from Saturday. The robot she picked first; the captain of
 * the alliance that put her out (or, if nobody did, the top seed she didn't have); and a robot the page said something
 * about. Two or three, all different, never her own. They're only suggestions: any tile will do.
 */
export function suggest(st) {
  const c = st.cold ?? {}, out = [], has = (n) => n === OURS || out.some((x) => x.num === n);
  const pick = c.picks?.[0];
  if (pick && !has(pick)) out.push({ num: pick, word: 'MY PICK' });
  if (c.out?.length) {
    if (!has(c.out[0])) out.push({ num: c.out[0], word: 'BEAT US' });
  } else {
    const top = SEEDS.find((n) => !has(n) && !(c.alliance ?? []).includes(n));
    if (top) out.push({ num: top, word: 'TOP SEED' });
  }
  const hint = HINTS.find(([n]) => !has(n) && !(c.picks ?? []).includes(n));
  if (hint) out.push({ num: hint[0], word: hint[1] });
  return out;
}

/** Robot T's match in round r, her own match that round, and whether T's in hers (beside her or against her). */
export function firstMatch(st, r = 0, T = firstOf(st)) {
  const round = worldOf(st).rounds[r], m = round?.find((x) => [...x.blue, ...x.red].includes(T)), ours = round && oursIn(round);
  if (!m || !ours) return null;
  return { q: m.q, ourQ: ours.q, with: m === ours ? (sideOf(ours, T) === sideOf(ours) ? 'with' : 'against') : null };
}

const anySeen = (st) => TEAMS.some((n) => n !== OURS && seenOf(st, n).length > 0);
/** The notebook's first ink-in (book.js): the first time it opens on Friday morning with a robot she's watched in it. */
export const inkDue = (st) => !st.flags?.inked && st.loop >= 1 && st.phase === 'quals' && st.round <= 1 && anySeen(st);
/** Her line at the season's first field note: once, wherever she's next free after it. */
export const chargeDue = (st) => !st.flags?.charged && st.loop >= 1 && notesFound(st) > 0;

/**
 * Where the marker goes now. where: 'pits' or 'arena'. One target or none, in this order:
 *   Thursday, in the pits   pit: the circled robot's, until she's had its hello (while she has time to ask it anything);
 *                           then exit: the way out to Friday, for whenever she's done (her time's hers to spend)
 *   Friday's first rounds   book: Norbert, once there's a robot she's seen in the notebook that it hasn't shown her yet
 *   round 1, in the arena   dani: the stands, for the circled robot's match, if it's in another match, she hasn't seen
 *                           it and she has the time; otherwise priya: her own match
 * Nothing after her first match, but the notebook's if she hasn't opened it; nothing at all after her second.
 */
export function guide(st, where) {
  const T = firstOf(st);
  if (!T || st.loop < 1 || st.flags?.noGuide) return null;
  if (st.phase === 'thursday') {
    if (where !== 'pits') return null;
    if (st.time > 0 && !st.book.pit[T]) return { to: 'pit', num: T, label: T };
    return { to: 'exit', label: 'TO THE FIELD: FRIDAY' };
  }
  if (st.phase !== 'quals' || st.round > 1) return null;
  if (inkDue(st)) return { to: 'book', label: '' };
  if (st.round > 0 || where !== 'arena') return null;
  const m = firstMatch(st, 0, T), seen = seenOf(st, T).length > 0;
  if (!m) return null;
  if (!m.with && !seen && st.time >= 2) return { to: 'dani', q: m.q, num: T, label: `Q${m.q}: ${T}` };
  return { to: 'priya', label: m.with && !seen ? `Q${m.ourQ}: ${T} AND US` : `Q${m.ourQ}: OUR MATCH` };
}

/** The FRIDAY 8:30 AM card: the circled robot's match and hers, and the one thing every round is short of. */
export function fridayLines(st) {
  const T = firstOf(st), m = T ? firstMatch(st, 0, T) : null;
  const first = !m ? 'QUALIFICATION MATCHES: TEN ROUNDS, ONE MATCH A ROUND.'
    : m.with ? `${T} PLAYS ${m.with === 'with' ? 'WITH' : 'AGAINST'} US IN Q${m.ourQ}.` : `${T} PLAYS IN Q${m.q}. WE PLAY IN Q${m.ourQ}.`;
  return [first, "THERE ISN'T TIME FOR EVERYTHING."];
}

// ---- The words ----
// A page is up to two lines of up to 38 characters in the dialog's capitals (talk.js).

/** After the playoffs, Riley: how far they got, in one page, and the credit. By how it ended (st.cold.reached). */
export const ENDED = {
  qf: ['OUT IN THE QUARTERFINAL. BUT WE PICKED', 'OUR OWN ALLIANCE. YOU DID THAT.'],
  sf: ['THE SEMIFINAL. WE HAD NEVER WON A', 'PLAYOFF SERIES BEFORE. YOU DID THAT.'],
  f: ["A FINAL. AN ACTUAL FINAL. WE'VE NEVER", 'STOOD NEXT TO ONE. YOU DID THAT.'],
  won: ["WE WON. THE WHOLE EVENT. I DON'T KNOW", "HOW. I DON'T THINK YOU DO EITHER."],
};
/** Her: what she had, and what she did with it, with her own first pick in it. */
export const afterPage = (p1) => (p1 ? [`ONE PAGE. 45 SECONDS. I PICKED ${p1}`, 'WITHOUT EVER SEEING IT PLAY.'] : ['I NEVER SAW ONE OF THOSE ROBOTS PLAY.', 'NOT ONE.']);
/** Riley. */
export const LAST = ["IT'S MY LAST SEASON. YOU'VE GOT THREE", "MORE. YOU'LL WORK IT OUT."];
/** Her, then (after his ear lights) her again. */
export const WISH = ['IF I HAD THE WHOLE WEEKEND AGAIN...'];
export const CALL = ['...NORBERT?'];

/** The van: her, back on Thursday and knowing what's coming; the teammate, handing her the notebook. */
export const vanCut = (sender) => [
  ["...THE VAN? IT'S THURSDAY AGAIN.", `${sender}'S OUT SICK ALL WEEKEND. RIGHT?`],
  ['THE TEXT JUST CAME. HOW DID YOU...', "FINE. YES. SO THE NOTEBOOK'S YOURS."],
];
/** Her notebook, open in her hands in the van: the question in her pencil, the count, and what A does. */
export const CHOOSE = {
  question: 'WHO DO I WATCH FIRST?',
  count: (n) => `${n} OF 23 ROBOTS WATCHED.`,
  prompt: 'A: CIRCLE',
};
/** Her resolve, once she's circled one; the teammate's answer, which is where and when. */
export const resolve = (num) => [`${num} FIRST. BY SATURDAY AT 12:38,`, "I'LL HAVE SEEN THEM PLAY."];
export const MATE = ['ITS PIT IS IN THE HALL. ASK THEM', 'ABOUT IT TODAY. IT PLAYS TOMORROW.'];

/** Dani, the first time she sits down in the front row (two pages; after that, the round's one). */
export const DANI_FIRST = [
  ['IS THAT NORBERT? HE PICKED YOU, THEN.', "DON'T LOOK AT ME LIKE THAT. SIT."],
  ['THREE OTHER MATCHES THIS ROUND. BEST', 'SEAT IN THE HOUSE. WHO IS IT?'],
];
/** Priya, at the queue, every round: her match, and who's waiting. m: her match (event.js). */
export function priyaPage(m) {
  const side = sideOf(m), mates = m[side].filter((n) => n !== OURS);
  return [`${OURS}: Q${m.q}, ${side.toUpperCase()}, WITH ${mates[0]} AND ${mates[1]}.`, "YOUR DRIVE TEAM'S WAITING ON YOU."];
}

/** Her, at the season's first field note, as his ear lights and his reading goes up. */
export const CHARGE = ['FIND OUT ENOUGH, AND MAYBE HE CAN', 'TAKE ME BACK AGAIN.'];
