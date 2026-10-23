// Norbert in someone's arms, and Norbert in the corner of the screen once he's hers.
//
// In the arena he's carried, so he's drawn at the size of a plush in the arms of someone 48 pixels tall: 12x14, drawn
// down by hand from norbert.js's corner sprite (16x19, which on a person covers them from the chin to the knees). The
// same marks make him Norbert: the cat-ear headband, the pink bow on the left, the red "26" ear on the right, the
// yellow beak and feet. Held to the chest (the walker's 'clap' pose, hands together in front) he covers the hands, so
// whoever holds him reads as hugging him; held out (the 'drive' pose, both hands forward) he sits at the hands.
//
// Once he's been handed over he lives in the top left corner as her one inventory item (the design, section 5): him
// small (norbert.js drawNorbert) and his battery voltage beside him, the way the time travel lab shows him. On the
// opening's Saturday it reads 12.4 volts: enough to rewind a few minutes, not yet enough to reach Thursday (12.9).
//
//   drawHeldNorbert(x, y)        him, 12x14, top left at (x, y) on whatever camera is set (pixel.js camera())
//   heldAt(p)                    where his top left goes for someone p = { x, y, dir, gait } (world pixels) holding him
//   heldShows(dir)               whether he shows at all: not for someone turned away from you
//   drawHud({ glow, dy })        the corner: him and the voltage; dy slides it (from -24, out of sight, to 0)
//   VOLTS                        what the corner says

import { C, screen, rect, text } from '../pixel.js';
import { drawNorbert } from '../norbert.js';

export const VOLTS = '12.4V';

const ROWS = [
  '..kk.....kk.',
  '.khhk...kRRk',
  'kAakhkkkRhRk',
  'kaVkTwwwTkk.',
  '.kkTkwwkwTk.',
  '...kTwyywTk.',
  '..kwTwwwTwk.',
  '.kTwWWWWWWwk',
  'kTowWWWWWWwk',
  'kTpwwwWWWWwk',
  '.kpTwwwwwwTk',
  '..kkyykkyyk.',
  '..kyyZkkyyZk',
  '...kkk..kkk.',
];
/** norbert.js's colours: ink, the red ear, whites and greys, the headband's black, the bow's pinks, beak and feet. */
const PAL = {
  k: C.ink, R: '#ff4a4a', W: '#f7f6f3', w: '#e4e3e0', T: '#b9bdc7', o: '#a0a5b2', p: '#80869a', h: '#25222c',
  A: '#ffaed2', a: '#f57bb2', V: '#d0548f', y: '#f6d63e', Z: '#d6a923',
};
export const HELD_W = 12, HELD_H = 14;

export function drawHeldNorbert(x, y) {
  x = Math.round(x);
  y = Math.round(y);
  ROWS.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') rect(x + i, y + j, 1, 1, PAL[row[i]]);
  });
}

/**
 * Where he sits for someone holding him, as a top left in world pixels: to the chest in the 'clap' pose (hands
 * together in front), at the hands in the 'drive' pose (both held out the way they face: sideways, toward whoever's
 * beside them).
 */
export function heldAt(p) {
  if (p.gait === 'drive') {
    const side = [0, 1, 1, 1, 0, -1, -1, -1][p.dir ?? 0];
    return { x: p.x - 6 + side * 4, y: p.y - 30 };
  }
  return { x: p.x - 6, y: p.y - 30 };
}

/** Whether he shows for someone facing dir: turned away from you (ne, n, nw), he's hidden in front of them. */
export const heldShows = (dir = 0) => dir < 3 || dir > 5;

/** The corner: Norbert and his voltage, over the top film bar as in the time travel lab. */
export function drawHud({ glow = 0, dy = 0 } = {}) {
  screen();
  drawNorbert(3, 2 + dy, { glow });
  text(VOLTS, 21, 4 + dy, { font: 3, color: glow > 0 ? C.yel2 : C.steel2 });
}
