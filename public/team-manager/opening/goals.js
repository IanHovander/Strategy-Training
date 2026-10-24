// The goal card: her whiteboard of what the team is trying to do (docs/blue-banner-design.md, section 4, "Goal card"),
// so the goal is never in doubt. In the opening it's a short checklist, ticked off as the calls are made:
//
//   ✓ FIRST PICK: 6834
//   ▶ SECOND PICK: ?        TO BEAT ALLIANCE 5
//   ○ WIN THE QUARTERFINAL  BEST 2 OF 3
//
// It's drawn as a small whiteboard: a white face in an aluminium frame (lit top and left, shaded right and bottom), an
// ink outline, a marker tray under it with a red and a blue marker, the words in marker (ink, the title in red). The
// font has no tick, arrow or circle, so they're drawn here, pixel by pixel: a tick done, an arrow for the one being
// worked on, an empty ring for the ones still to come.
//
// It comes up big as the second pick begins (second.js slides it in while Riley sets the goal), then folds away into a
// pill in the dashboard's header (drawGoalLine) for the rest of the pick: the same three marks, small, and the line
// being worked on. A tap on the pill (or on nothing else) opens the card again.
//
//   drawGoalCard(x, y, { done, picked, tickAt, t, next })
//                        the card, top left at (x, y): done how many lines are ticked (1 or 2), picked the second
//                        pick's number once made, tickAt the second it's ticked (t: seconds), for the tick's stamp;
//                        next: false leaves the next line its ring, not the arrow (the end: nothing's being worked on)
//   GOAL_W, GOAL_H       its size, tray included
//   drawGoalLine(cx, y, { done, t, open })
//                        the pill in the header, centred on cx, its top at y; open: the card is up (it's lit)
//   goalLineRect(cx, y)  where the pill is, for a finger
//   tick, pointer, ring  the three marks, at whatever size, for whoever needs them (the bet log's end)

import { C, fill, text, measure } from '../pixel.js';
import { US, OPPONENT } from './teams2.js';

export const GOAL_W = 216, GOAL_H = 66;
const BOARD = '#f4f6fb', BOARD_SHADE = '#d9deea';
const GREEN = '#3fd06a', GREEN0 = '#1d6b35';

/** A thick line of s x s squares from (x0, y0) to (x1, y1). */
function stroke(x0, y0, x1, y1, s, c) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let k = 0; k <= n; k++) fill(Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n), s, s, c);
}
function frame(x, y, w, h, c) {
  fill(x, y, w, 1, c);
  fill(x, y + h - 1, w, 1, c);
  fill(x, y, 1, h, c);
  fill(x + w - 1, y, 1, h, c);
}

/** A tick in a box of n x n pixels (n 5 or 9), top left at (x, y). */
export function tick(x, y, n, c) {
  if (n <= 5) {
    // 5x5: the short stroke down, the long one up.
    [[0, 2], [1, 3], [2, 4], [3, 3], [3, 2], [4, 1], [4, 0]].forEach(([dx, dy]) => fill(x + dx, y + dy, 1, 1, c));
    return;
  }
  stroke(x, y + 4, x + 3, y + 7, 2, c);
  stroke(x + 3, y + 7, x + 8, y, 2, c);
}
/** An arrow pointing right, filled, n pixels tall (5 or 9). */
export function pointer(x, y, n, c) {
  const half = Math.floor(n / 2);
  for (let i = 0; i <= half; i++) fill(x + i, y + i, 1, n - 2 * i, c);
}
/** An empty ring n pixels across (5 or 9). */
export function ring(x, y, n, c) {
  if (n <= 5) {
    fill(x + 1, y, 3, 1, c);
    fill(x + 1, y + 4, 3, 1, c);
    fill(x, y + 1, 1, 3, c);
    fill(x + 4, y + 1, 1, 3, c);
    return;
  }
  fill(x + 3, y, 3, 1, c);
  fill(x + 3, y + 8, 3, 1, c);
  fill(x, y + 3, 1, 3, c);
  fill(x + 8, y + 3, 1, 3, c);
  [[1, 1], [2, 1], [1, 2], [6, 1], [7, 1], [7, 2], [1, 6], [1, 7], [2, 7], [7, 6], [7, 7], [6, 7]].forEach(([dx, dy]) => fill(x + dx, y + dy, 1, 1, c));
}

/** The lines on the card: [big words, small words after them]. */
const lines = (picked) => [
  ['FIRST PICK: 6834', ''],
  [`SECOND PICK: ${picked ?? '?'}`, `TO BEAT ALLIANCE ${OPPONENT}`],
  ['WIN THE QUARTERFINAL', 'BEST 2 OF 3'],
];

/**
 * The whiteboard, top left at (x, y). done: lines ticked (1, then 2); the next one has the arrow. tickAt: when the
 * latest tick goes on (it's stamped on: a flash of its box, then the tick), t the seconds now, on the same clock.
 */
export function drawGoalCard(x, y, { done = 1, picked = null, tickAt = -Infinity, t = 0, next = true } = {}) {
  x = Math.round(x);
  y = Math.round(y);
  const w = GOAL_W, h = GOAL_H - 6;
  // The frame: ink, then aluminium, lit top and left, shaded right and bottom.
  fill(x, y, w, h, C.ink);
  fill(x + 1, y + 1, w - 2, h - 2, C.steel2);
  fill(x + 1, y + 1, w - 2, 1, C.steel3);
  fill(x + 1, y + 1, 1, h - 2, C.steel3);
  fill(x + w - 2, y + 2, 1, h - 3, C.steel1);
  fill(x + 2, y + h - 2, w - 3, 1, C.steel1);
  // The face, with a band of shade along its top edge under the frame's lip.
  fill(x + 3, y + 3, w - 6, h - 6, BOARD);
  fill(x + 3, y + 3, w - 6, 1, BOARD_SHADE);
  // The tray under it, with a red marker and a blue one lying in it.
  const ty = y + h;
  fill(x + 12, ty, w - 24, 5, C.ink);
  fill(x + 13, ty, w - 26, 3, C.steel2);
  fill(x + 13, ty, w - 26, 1, C.steel3);
  fill(x + 30, ty - 1, 14, 3, C.ink);
  fill(x + 31, ty, 9, 1, C.red1);
  fill(x + 40, ty, 3, 1, C.steel3);
  fill(x + 50, ty - 1, 14, 3, C.ink);
  fill(x + 51, ty, 9, 1, C.blue1);
  fill(x + 60, ty, 3, 1, C.steel3);

  text('GOALS', x + 10, y + 7, { color: C.red1 });
  text(`ALLIANCE ${US} VS ${OPPONENT}`, x + w - 10, y + 9, { font: 3, align: 'right', color: C.blue1 });
  fill(x + 10, y + 15, measure('GOALS'), 1, C.red1); // underlined in the same marker

  lines(picked).forEach(([big, small], i) => {
    const ly = y + 20 + i * 12, ix = x + 10;
    const stamped = i === done - 1 && t >= tickAt && t < tickAt + 0.12;
    if (i < done) {
      if (stamped) fill(ix - 2, ly - 2, 13, 13, C.yel2);
      else if (!(i === done - 1 && t < tickAt)) tick(ix, ly - 1, 9, GREEN0);
      else ring(ix, ly - 1, 9, C.steel2);
    } else if (i === done && next) pointer(ix + 2, ly - 1, 9, C.red1);
    else ring(ix, ly - 1, 9, C.steel2);
    const color = i < done && t >= tickAt ? C.steel1 : C.ink;
    text(big, ix + 14, ly, { color });
    if (small) text(small, ix + 14 + measure(big) + 6, ly + 2, { font: 3, color: i === done ? C.red1 : C.blue1 });
  });
}

/** The pill's words and size. */
const LINE_WORDS = (done) => (done >= 2 ? 'NEXT: WIN THE QUARTERFINAL' : `GOAL: SECOND PICK TO BEAT ALLIANCE ${OPPONENT}`);
const lineSize = (done) => ({ w: 3 * 7 + 4 + measure(LINE_WORDS(done), { font: 3 }) + 8, h: 9 });
export function goalLineRect(cx, y, done = 1) {
  const { w, h } = lineSize(done);
  // A little bigger than it's drawn, for a finger.
  return { x: Math.round(cx - w / 2) - 3, y: y - 3, w: w + 6, h: h + 6 };
}

/** The pill in the header: the three marks small, and the line being worked on. open: the card is up. */
export function drawGoalLine(cx, y, { done = 1, t = 0, open = false } = {}) {
  const { w, h } = lineSize(done), x = Math.round(cx - w / 2);
  fill(x - 1, y - 1, w + 2, h + 2, C.ink);
  fill(x, y, w, h, open ? C.night3 : C.night2);
  frame(x, y, w, h, open || t % 2.4 < 0.15 ? C.yel1 : C.steel1);
  for (let i = 0; i < 3; i++) {
    const ix = x + 4 + i * 7, iy = y + 2;
    if (i < done) tick(ix, iy, 5, GREEN);
    else if (i === done) pointer(ix + 1, iy, 5, C.red2);
    else ring(ix, iy, 5, C.steel2);
  }
  text(LINE_WORDS(done), x + 4 + 3 * 7 + 2, y + 2, { font: 3, color: C.yel2 });
}
