// Norbert, the team's plush penguin (scripts/art/norbert/), small enough to sit in a corner of the big screen: 16x19,
// drawn down by hand from the full sprite (assets/norbert.png). The cat-ear headband, the pink bow on his left ear and
// the red "26" ear on his right are what make him Norbert at this size. glow (0 to 1) lights the 26 ear up, as he
// does when time is about to move.

import { C, fill } from './pixel.js';

export const NORBERT_W = 16, NORBERT_H = 19;

const PAL = {
  k: C.ink, R: '#ff4a4a', W: '#f7f6f3', w: '#e4e3e0', T: '#b9bdc7', o: '#a0a5b2', p: '#80869a', h: '#25222c',
  A: '#ffaed2', a: '#f57bb2', V: '#d0548f', y: '#f6d63e', Z: '#d6a923',
};
const ROWS = [
  '...kk.......kkk.',
  '..khhk.....kRRRk',
  '.kAakhkkkkkRhRRk',
  'kAaaVkhhhhkRRhRk',
  'kAaVkTwwwwTkkkk.',
  '.kkkTwkwwkwTk...',
  '...kTwwyywwTk...',
  '...kTwyyZywTkk..',
  '..kkwTwwwwTwwwk.',
  '.kTwwWWWWWWWWwwk',
  'kTowwWWWWWWWWWwk',
  'kTpwwwWWWWWWWWwk',
  'kTpwwwwwWWWWWWwk',
  '.kTowwwwwwwwWwTk',
  '.kpTTwwwwwwwwTk.',
  '..kkkyykkkyykk..',
  '..kyyyyZkyyyyZk.',
  '..kZZZZk.kZZZZk.',
  '...kkkk...kkkk..',
];
/** The 26 ear as it glows: pale gold, then white at the brightest. */
const GLOW = [C.yel1, C.yel2, C.white];

/** Norbert with his top left at (x, y), on whatever camera is set (screen() for the corner of the screen). */
export function drawNorbert(x, y, { glow = 0 } = {}) {
  const lit = glow > 0 ? GLOW[Math.min(GLOW.length - 1, Math.floor(glow * GLOW.length))] : null;
  ROWS.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '.') continue;
      fill(x + i, y + j, 1, 1, lit && (ch === 'R' || (ch === 'h' && i > 10)) ? lit : PAL[ch]);
    }
  });
}
