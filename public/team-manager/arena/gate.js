// The way out of the arena, past the red end. The floor past the scoring table is roped off from the rest of the hall
// by a belt barrier, the same posts and belts as across the backs of the driver stations (field.js), running front to
// back a little in from the right edge. In front of the scoring table there's a gap in it, and through the gap two more
// belts make a short chute out to the right, the way the crowd is let on and off an event's floor; an EXIT sign stands
// on the gap's far post. She leaves through the chute (scene.exit), and stage.js walks her on out of the picture.
//
// The posts are field.js's stanchions: an ink base, an ink post with a light steel core, the belt from its top (19
// pixels up) to the next post's. Seen from here a belt running front to back is a line straight down the screen from one
// post to the next; a belt running across is a strip, its lit top over its shaded underside, in yellow so the floor's
// edge reads against the concrete the way the queue lane's tape does at the other end. Everything stands on the floor
// and is sorted in with the field and the people (drawFieldLive's more), in world pixels.
//
//   FENCE_X, GAP     the barrier's line and the floor band of the gap in it
//   EXIT             scene.exit: walking out through the gap
//   gateParts(camX)  the barrier, the chute and the sign, as { y, draw } for drawFieldLive's more
//   moveOut          field.js's move, with the barrier in the way except at the gap

import { C, rect, text } from '../pixel.js';
import { WORLD_W, move } from '../field.js';

/** The barrier's line, front to back, and the gap in it: the band of floor she can walk out along. */
export const FENCE_X = 752;
export const GAP = { y0: 108, y1: 130 };
/** The chute's belts stand on these floor lines, just outside the gap: the far one behind her, the near one in front. */
const FAR = GAP.y0 - 4, NEAR = GAP.y1 + 4;
/** The barrier's posts, back to front: from the foot of the stands to the far side of the gap, then the near side on. */
const BACK = [53, 70, 87, FAR], FRONT = [NEAR, 151];
/** The chute's posts along the far and near belts, from the gap out to the right edge. */
const OUT = [FENCE_X, WORLD_W - 8];
/** How close she gets to the barrier's line: her feet stop this far short of it. */
const LIMIT = FENCE_X - 5;
const BELT = [C.yel1, C.yel0];

/** One post, its feet at (x, y). tall: the sign's post, which stands higher. */
function post(x, y, tall = 22) {
  rect(x - 3, y - 1, 7, 2, C.ink);
  rect(x - 1, y - tall, 3, tall, C.ink);
  rect(x, y - tall + 1, 1, tall - 1, C.steel3);
}
/** A belt running front to back, down the screen from the post at depth y0 to the post at y1. */
const beltDown = (x, y0, y1) => rect(x, y0 - 19, 1, y1 - y0, BELT[0]);
/** A belt running across from x0 to x1 at depth y: its lit top and its underside. */
function beltAcross(x0, x1, y) {
  rect(x0, y - 20, x1 - x0, 1, BELT[0]);
  rect(x0, y - 19, x1 - x0, 1, BELT[1]);
}

/** The EXIT sign on the far post of the gap: a red panel lit from the upper left, the word and an arrow in white. */
function exitSign(x, y) {
  const w = 27, h = 11, x0 = x - 13, y0 = y - 30 - h;
  rect(x0 - 1, y0 - 1, w + 2, h + 2, C.ink);
  rect(x0, y0, w, h, C.red1);
  rect(x0, y0, w, 1, C.red2);
  rect(x0, y0, 1, h, C.red2);
  rect(x0 + w - 1, y0 + 1, 1, h - 1, C.red0);
  rect(x0 + 1, y0 + h - 1, w - 1, 1, C.red0);
  text('EXIT', x0 + 3, y0 + 3, { font: 3, color: C.white });
  // The arrow, a three-pixel point on a two-pixel tail.
  const ax = x0 + 20, ay = y0 + 3;
  rect(ax, ay + 2, 2, 1, C.white);
  rect(ax + 2, ay, 1, 5, C.white);
  rect(ax + 3, ay + 1, 1, 3, C.white);
  rect(ax + 4, ay + 2, 1, 1, C.white);
}

/**
 * The barrier, the chute and the sign, each sorted in by its floor line: every post with the belt back to the post
 * behind it, the chute's belts with their far posts, and the sign on the gap's far post, which stands taller to carry it.
 * camX: the view, so nothing is handed over when the right end is off the screen.
 */
export function gateParts(camX) {
  if (camX + 256 < FENCE_X - 20) return [];
  const parts = [];
  BACK.forEach((y, i) => parts.push({ y, draw: () => {
    if (i) beltDown(FENCE_X, BACK[i - 1], y);
    if (y === FAR) {
      post(FENCE_X, y, 30);
      exitSign(FENCE_X, y);
    } else post(FENCE_X, y);
  } }));
  FRONT.forEach((y, i) => parts.push({ y, draw: () => {
    if (i) beltDown(FENCE_X, FRONT[i - 1], y);
    post(FENCE_X, y);
  } }));
  // The chute's belts go behind the gap's own posts, so they're drawn just before them on the same floor line.
  for (const y of [FAR, NEAR]) {
    parts.push({ y: y - 0.5, draw: () => {
      beltAcross(OUT[0] + 2, OUT[1] + 30, y);
      post(OUT[1], y);
    } });
  }
  return parts;
}

const inGap = (y) => y >= GAP.y0 && y <= GAP.y1;
/**
 * Step her at (x, y) by (dx, dy), as field.js's move does (along, then across), with the barrier in the way: she gets no
 * closer to its line than LIMIT except in the gap, and once she's in the gap past that, only along it.
 */
export function moveOut(x, y, dx, dy) {
  let [nx] = move(x, y, dx, 0);
  if (nx > LIMIT && !inGap(y)) nx = x > LIMIT ? Math.min(x, nx) : LIMIT;
  let [, ny] = move(nx, y, 0, dy);
  if (nx > LIMIT) ny = Math.max(GAP.y0, Math.min(GAP.y1, ny));
  return [nx, ny];
}

/**
 * The way out: once she's at the barrier's line in the gap, out she walks through the chute. The arrow sits just in front
 * of the gap, low enough that its label runs along the floor between the scoring table and the reset cart.
 */
export const EXIT = { x: LIMIT - 3, y0: GAP.y0, y1: GAP.y1, label: 'TO ALLIANCE SELECTION', sign: { y: 117 } };
