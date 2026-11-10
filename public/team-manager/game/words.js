// The game's words that aren't anyone's lines: how a scout's line on a robot reads in the notebook, and the small
// phrases the screens share. Everything is in the pixel fonts' capitals (pixel.js): letters, digits and a little
// punctuation, at most about 40 of the small letters to a line.
//
//   recordLines(r)        a robot's match as a scout would write it down (event.js recordOf), a few short lines
//   knownLine(sum)        what the notebook has on a robot, in a line: SEEN 3: AVG 31
//   matchClock(t)         the clock's face t seconds into a match: 1:12
//   CHOICE, choiceLabel   what a robot can be told to do in a match, in words

import { plural } from './ui.js';

export const matchClock = (t) => {
  const left = Math.max(0, Math.round(150 - t));
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
};

/** A robot's match, written down: its points, its pieces, its climb, and anything that happened to it. */
export function recordLines(r) {
  const out = [`${r.q ? `Q${r.q}  ` : ''}${r.num}: ${r.pts} POINTS`];
  const pieces = [];
  if (r.hatch) pieces.push(plural(r.hatch, 'HATCH', 'HATCHES'));
  if (r.cargo) pieces.push(`${r.cargo} CARGO`);
  if (r.secured) pieces.push(`${r.secured} STAGED CARGO HELD IN`);
  let line = pieces.length ? pieces.join(', ') : 'NO PIECES';
  if (r.top >= 2) line += `, UP TO LEVEL ${r.top}`;
  else if (r.ship && !r.rocket) line += ', ALL ON THE SHIP';
  if (r.missed) line += `. DROPPED ${r.missed}`;
  out.push(`${line}.`);
  if (r.climb) out.push(r.climb.park ? 'PARKED ON LEVEL 1.' : `LEVEL ${r.climb.level} CLIMB: ${r.climb.made ? 'MADE IT.' : 'MISSED.'}`);
  else if (!r.dead) out.push('NO CLIMB.');
  if (r.dead) out.push(`DIED ON THE FIELD WITH ${matchClock(r.dead.at)} LEFT.`);
  if (r.defended && r.defended.secs >= 30) out.push(`ON ${r.defended.on} FOR ${r.defended.secs}S. ${r.defended.on} SCORED ${r.defended.pts}.`);
  if (r.held >= 30) out.push(`${r.by[0]} DEFENDED IT FOR ${r.held}S.`);
  if (r.stuck >= 25) out.push(`SAT STILL ${r.stuck}S: NOWHERE TO SCORE.`);
  return out;
}

/** What the notebook has on a robot, in a line. */
export function knownLine(sum) {
  if (!sum.n) return sum.heard.length ? 'ONLY WHAT THEY SAY' : 'NEVER SEEN';
  return `SEEN ${sum.n}: AVG ${Math.round(sum.avg)}`;
}

/** What a robot can be told to do, in the plan screen's words. */
export const WHERE = { any: 'SCORE: ANYWHERE', rocket: 'SCORE: ROCKETS ONLY', ship: 'SCORE: CARGO SHIP ONLY' };
export const PIECE = { both: 'HATCHES AND CARGO', hatch: 'HATCHES ONLY', cargo: 'CARGO ONLY' };
export const choiceLabel = (c) => (c.job === 'defend' ? `DEFEND ${c.on}` : WHERE[c.where ?? 'any']);
