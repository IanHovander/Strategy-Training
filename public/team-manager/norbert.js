// Norbert, the team's plush penguin (scripts/art/norbert/), two ways:
//   drawNorbert(x, y, { glow })                    small enough to sit in a corner of the big screen: 16x19, drawn
//                                                  down by hand from the full sprite. The cat-ear headband, the pink
//                                                  bow and the red "26" ear are what make him Norbert at this size.
//   drawNorbertBig(x, y, { back, glow, scale })    the full 36x44 sprite (norbert.txt), or his back: the same sprite
//                                                  mirrored, without his face and with the 26 ear seen from behind.
//                                                  scale shrinks or grows him (nearest pixel), for hopping in.
// glow (0 to 1) lights the 26 ear up, as he does when time is about to move. (x, y) is his top left.

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

const FRONT = [
  '.........kkk........................',
  '........kkHhkkk.....................',
  '........khkkkOkk....................',
  '.........kkOhkkkk...................',
  '.........kkhhOhhkkkk......kkkk......',
  '.........kkhhhhkAaVk.....kRRRhkkkkk.',
  '........kkkhhhkAaaVkkkkkkhhhRhRRRhhk',
  '.......kAAakhkkaaaVkwwwokkRRRhRhhhhk',
  '.......kAaaVkkaaaVVkwwwTwpRhhhRRRhk.',
  '.......kAaaVkakaVVVkwTTwwkRRRhRhRk..',
  '.......kAaaVkkkkVVVkTTTTTTkohhRRRk..',
  '.......kAaVVkTokkkkToooTTTTohhhhk...',
  '.......kaVVkwwTooooooooooowwTpPk....',
  '........kkkTwwwwopopppooowWWTPk.....',
  '..........kwWTwwoPPPPPPpTWWWwk......',
  '..........kWkWwwoYYYYYZpwWWkWk......',
  '..........kWkWwTYyyyyyyZWwWkWk......',
  '..........kPTwwoZZZyyyyZWwwTk.......',
  '...........koTTToZZZZZZWwwwTk.......',
  '......kkkkkkPPpooopooooTTTTk........',
  '.....kTTTwWTkkkkkkkkkkkkkkkkkk......',
  '...kkoTpwwwWWWWWWWWWWWWWWWWWWTk.....',
  '..kTToowwwwWWWWWWWWWWWWWWWWWWWwkk...',
  '.kTTTowwwwwwWWWWWWWWWWWWWWWWWWWWTk..',
  '.kwwoowwwwwwWWWWWWWWWWWWWWWWWWWWwok.',
  'kwTToowwwwwwwwWWWWWWWWWWWWWWWWWWWTk.',
  'kwTopTwwwwwwwwwwWWWWWWWWWWWWWWWWWTk.',
  'kToppTwwwwwwwwwwwwWwWWWWWWWWWWWWWWok',
  'kppPPwwwwwwwwwwwwwwwWWWWWWWWWWWWWTk.',
  '.kkkkwwwwwwwwwwwwwwwwWWWWWWWWWWWWTk.',
  '....kwwwwwwwwwwwwwwwwwwWWWWWWWWWWTk.',
  '....kwTwwwwwwwwwwwwwwwwwwwwWWWWWwk..',
  '....koTTwwwwwwwwwwwwwwwwwwwwwWWWwk..',
  '.....kwTTTwwwwwwwwwwwwwwwwwwwwWWTk..',
  '.....kpTTTwwwwTTTTwwwwTTTTTTTwwTk...',
  '......kpoooTTTkkkooTTTkkkkkkkTTTk...',
  '.......kkkkkkkyYZkkkkkyYYYYYZkkk....',
  '.........kYYYYyyZk...kyyyyyyZk......',
  '........kyyyyyyyyZk..kYyyyyyyZk.....',
  '.......kyZZZyyyZyZk.kyyyyyyyyZk.....',
  '.......kZZZZZyyZZZk.kZZZZyyyZZk.....',
  '........kZkZZZZkkk...kkkZZykkk......',
  '.........kkZZZk........kZZZk........',
  '...........kkk..........kkk.........',
];
const BACK = [
  '........................kkk.........',
  '.....................kkkhHkk........',
  '....................kkOkkkhk........',
  '...................kkkkhOkk.........',
  '......kkkk......kkkkhhOhhkk.........',
  '.kkkkkEEEEk.....kVaAkhhhhkk.........',
  'kEEEEEEEEEEkkkkkkVaaAkhhhkkk........',
  'kEEEEEEEEEkkowwwkVaaakkhkaAAk.......',
  '.kEEEEEEEEpwTwwwkVVaaakkVaaAk.......',
  '..kEEEEEEEkwwTTwkVVVakakVaaAk.......',
  '..kEEEEEokTTTTTTkVVVkkkkVaaAk.......',
  '...kEEEETTTTTTTTTkkkkTTkVVaAk.......',
  '....kPpTwwTTTTTTTTTTTTwwkVVak.......',
  '.....kPTWWwTTTTTTTTTwwwwTkkk........',
  '......kwWWWTTTTTTTTTwwTWwk..........',
  '......kWwWWwTTwwwwwTwwWkWk..........',
  '......kWwWwWTwwwwwwwTwWkWk..........',
  '.......kTwwWTwwwwTTTTwwTPk..........',
  '.......kTwwwWTTTTTTTTTTok...........',
  '........kTTTTTTTTTTTTTTPkkkkkk......',
  '......kkkkkkkkkkkkkkkkkkTWwTTTk.....',
  '.....kTWWWWWWWWWWWWWWWWWWwwwpTokk...',
  '...kkwWWWWWWWWWWWWWWWWWWWwwwwooTTk..',
  '..kTWWWWWWWWWWWWWWWWWWWWwwwwwwoTTTk.',
  '.kowWWWWWWWWWWWWWWWWWWWWwwwwwwoowwk.',
  '.kTWWWWWWWWWWWWWWWWWWWwwwwwwwwooTTwk',
  '.kTWWWWWWWWWWWWWWWWWwwwwwwwwwwTpoTwk',
  'koWWWWWWWWWWWWWWwWwwwwwwwwwwwwTppoTk',
  '.kTWWWWWWWWWWWWWwwwwwwwwwwwwwwwPPppk',
  '.kTWWWWWWWWWWWWwwwwwwwwwwwwwwwwkkkk.',
  '.kTWWWWWWWWWWwwwwwwwwwwwwwwwwwwk....',
  '..kwWWWWWwwwwwwwwwwwwwwwwwwwwTwk....',
  '..kwWWWwwwwwwwwwwwwwwwwwwwwwTTok....',
  '..kTWWwwwwwwwwwwwwwwwwwwwwTTTwk.....',
  '...kTwwTTTTTTTwwwwTTTTwwwwTTTpk.....',
  '...kTTTkkkkkkkTTTookkkTTTooopk......',
  '....kkkZYYYYYykkkkkZYykkkkkkk.......',
  '......kZyyyyyyk...kZyyYYYYk.........',
  '.....kZyyyyyyYk..kZyyyyyyyyk........',
  '.....kZyyyyyyyyk.kZyZyyyZZZyk.......',
  '.....kZZyyyZZZZk.kZZZyyZZZZZk.......',
  '......kkkyZZkkk...kkkZZZZkZk........',
  '........kZZZk........kZZZkk.........',
  '.........kkk..........kkk...........',
];
/** The full sprite's colours (norbert.txt); E is the 26 ear seen from behind. */
const FULL_PAL = {
  k: C.ink, O: '#eef1f8', R: '#ff4a4a', W: '#f7f6f3', w: '#e4e3e0', T: '#b9bdc7', o: '#a0a5b2', p: '#80869a',
  P: '#5f6578', H: '#3d3a48', h: '#25222c', A: '#ffaed2', a: '#f57bb2', V: '#d0548f', Y: '#fff08a', y: '#f6d63e',
  Z: '#d6a923', E: '#25222c',
};
export const BIG_W = 36, BIG_H = 44;

export function drawNorbertBig(x, y, { back = false, glow = 0, scale = 1 } = {}) {
  const rows = back ? BACK : FRONT, lit = glow > 0 ? GLOW[Math.min(GLOW.length - 1, Math.floor(glow * GLOW.length))] : null;
  const w = Math.max(1, Math.round(BIG_W * scale)), h = Math.max(1, Math.round(BIG_H * scale));
  for (let j = 0; j < h; j++) {
    const row = rows[Math.min(BIG_H - 1, Math.floor(j / scale))];
    for (let i = 0; i < w; i++) {
      const ch = row[Math.min(BIG_W - 1, Math.floor(i / scale))];
      if (ch === '.') continue;
      fill(Math.round(x) + i, Math.round(y) + j, 1, 1, lit && (ch === 'R' || ch === 'E') ? lit : FULL_PAL[ch]);
    }
  }
}

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
