// What sits over every screen and place once Norbert is hers: him in the top left corner with his battery's voltage
// (tap him, or press B, for the notebook), and a slip of notebook paper that slides in when she's seen something worth
// writing down: a new field note, with its name and what she saw.
//
//   corner(st, { glow, dy, hint, volts, blink })
//                                    Norbert and his volts; glow lights his 26 ear (0 to 1). His reading goes up with
//                                    each field note as its slip comes in (+0.1V rising off it), not before.
//   CORNER                           where he is, for a tap
//   toast(notes), drawToasts(now)    field notes just found, queued and shown one after another; toasting() while any is up
//   paper(x, y, w, h)                a slip of the notebook's paper, for anything written in her hand
//   pointer(x, y, dir, now, label), edgePointer(side, y, now, label), cornerMark(now)
//                                    the guided start's marker (guide.js): a yellow arrow at something, or at the edge of
//                                    the picture on the side it's off, or a frame round Norbert; each returns where a tap
//                                    on it lands

import { W, C, screen, fill, text, measure, clamp, easeOut, seg } from '../pixel.js';
import { drawNorbert } from '../norbert.js';
import { voltsOf } from './state.js';

export const CORNER = { x: 0, y: 0, w: 46, h: 22 };
/** How long the reading's rise takes once a note's slip is in: +0.1V going up off it, and the reading lit. */
const RISE = 1.2;
/**
 * Norbert in his corner, and what's in his battery. volts: a reading to show instead of his own (the wind's, running
 * down); blink: NOTES lit and blinking (the guided start's marker is on him). The reading and NOTES have an ink outline,
 * so they read over the crowd.
 */
export function corner(st, { glow = 0, dy = 0, hint = false, volts = null, blink = false } = {}) {
  screen();
  drawNorbert(3, 2 + dy, { glow });
  // A field note charges him as its slip comes in, not before: the notes still waiting for theirs aren't in the reading.
  const now = performance.now() / 1000, k = showing ? now - showing.at : Infinity;
  const v = volts ?? voltsOf(st) - 0.1 * (queue.length + (k < SLIDE ? 1 : 0));
  const rising = volts == null && k >= SLIDE && k < SLIDE + RISE;
  text(`${v.toFixed(1)}V`, 21, 4 + dy, { font: 3, color: glow > 0 || rising ? C.yel2 : C.steel2, outline: C.ink });
  if (rising) {
    const u = seg(k, SLIDE, SLIDE + RISE);
    text('+0.1V', 21, Math.round(17 - 6 * easeOut(u)) + dy, { font: 3, color: C.yel2, outline: C.ink });
  } else if (blink && Math.floor(now * 2.5) % 2 === 0) text('NOTES', 21, 11 + dy, { font: 3, color: C.yel2, outline: C.ink });
  else if (hint || blink) text('NOTES', 21, 11 + dy, { font: 3, color: C.steel2, outline: C.ink });
}

/** The notebook's paper: cream, ruled, with a red margin line. */
export const PAPER = { page: '#f3ecd8', rule: '#cfd6e6', margin: '#e59a9a', ink: '#2a2f45', pencil: '#6a7088' };
export function paper(x, y, w, h) {
  fill(x - 1, y - 1, w + 2, h + 2, C.ink);
  fill(x, y, w, h, PAPER.page);
  for (let ry = y + 9; ry < y + h - 2; ry += 8) fill(x + 2, ry, w - 4, 1, PAPER.rule);
  fill(x + 8, y, 1, h, PAPER.margin);
}

/**
 * Where she is in the event, in one line along the top while she walks about: the day and the round, her own match,
 * and how much time she has left before it (a pip a conversation; watching a match takes two). It sits beside
 * Norbert's corner and stops short of the top right (SKIP and the sound button live there).
 */
export function eventChip(st, head) {
  const n = st.timeMax ?? 3, w = measure(head, { font: 3 }) + 8 + n * 6 + 24;
  const x = 50, y = 2;
  screen();
  fill(x - 1, y - 1, w + 2, 11, C.ink);
  fill(x, y, w, 9, C.night1);
  fill(x, y, w, 1, C.night3);
  text(head, x + 4, y + 2, { font: 3, color: C.white });
  const px = x + w - 4 - n * 6;
  text('TIME', px - 19, y + 2, { font: 3, color: C.steel2 });
  for (let i = 0; i < n; i++) {
    fill(px + i * 6, y + 2, 5, 5, C.ink);
    fill(px + i * 6 + 1, y + 3, 3, 3, i < st.time ? C.yel1 : C.night3);
  }
}

// ---- New field notes ----
const HOLD = 5.2, SLIDE = 0.35;
const queue = [];
let showing = null;
/** Field notes just found ([{ title, text }]): each gets its slip, one after another. */
export function toast(notes) {
  for (const n of notes ?? []) queue.push(n);
}
export const toasting = () => !!showing || queue.length > 0;
/** The slip, if one's up: in from the top right, held long enough to read, and out. */
export function drawToasts(now) {
  if (!showing && queue.length) showing = { ...queue.shift(), at: now };
  if (!showing) return 0;
  const t = now - showing.at;
  if (t > HOLD) {
    showing = null;
    return 0;
  }
  const lines = showing.text, w = clamp(Math.max(...lines.map((l) => measure(l, { font: 3 })), measure(showing.title) + 34) + 16, 120, 236);
  const h = 22 + lines.length * 7;
  const k = t < SLIDE ? easeOut(seg(t, 0, SLIDE)) : 1 - easeOut(seg(t, HOLD - SLIDE, HOLD));
  // Down from the top, to sit under the line of things along it (the event's clock, the corner's buttons).
  const x = W - w - 5, y = Math.round(-h - 2 + (h + 18) * k);
  screen();
  paper(x, y, w, h);
  text('FIELD NOTE', x + 12, y + 3, { font: 3, color: PAPER.pencil });
  text(showing.title, x + 12, y + 10, { color: '#a1172a' });
  lines.forEach((l, i) => text(l, x + 12, y + 20 + i * 7, { font: 3, color: PAPER.ink }));
  // Norbert's ear lights as it's written: every note charges him a little.
  return t < 2.5 ? 0.5 + 0.5 * Math.sin(t * 6) : 0;
}

// ---- The guided start's marker ----
// One at a time (guide.js says where): a yellow arrow with an ink outline, bobbing at the rate the ways out nudge, and a
// few words beside it at most (a number and a match), on an ink tag so they read over anything. Each returns the
// rectangle a tap on it lands in, a little bigger than it's drawn, for a finger.
const BOB = (now) => Math.floor(now * 2.5) % 2;
const hit = (x0, y0, x1, y1) => {
  const w = Math.max(16, x1 - x0), h = Math.max(16, y1 - y0);
  return { x: Math.round((x0 + x1) / 2 - w / 2), y: Math.round((y0 + y1) / 2 - h / 2), w, h };
};
/** A marker's words on their ink tag, top left at (x, y); returns its right edge. */
function tag(label, x, y) {
  const w = measure(label, { font: 3 });
  fill(x - 2, y - 2, w + 4, 9, C.ink);
  text(label, x, y, { font: 3, color: C.yel2 });
  return x + w + 2;
}
/**
 * An arrow with its tip at (x, y), pointing dir ('down', 'up', 'left' or 'right'): a 9-wide head on a 3-wide stem, 8
 * long. The label goes on the far side from the tip.
 */
export function pointer(x, y, dir, now, label = '') {
  screen();
  const b = BOB(now), d = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[dir];
  // Back from the tip along the arrow: the head (rows of 1, 3, 5, 7 and 9 across it), then the stem.
  const tx = x - d[0] * b, ty = y - d[1] * b;
  const cells = [];
  for (let i = 0; i < 5; i++) for (let j = -i; j <= i; j++) cells.push([i, j]);
  for (let i = 5; i < 8; i++) for (let j = -1; j <= 1; j++) cells.push([i, j]);
  const at = ([i, j]) => [tx - d[0] * i + (d[0] ? 0 : j), ty - d[1] * i + (d[1] ? 0 : j)];
  for (const c of cells) {
    const [px, py] = at(c);
    fill(px - 1, py - 1, 3, 3, C.ink);
  }
  for (const c of cells) {
    const [px, py] = at(c);
    fill(px, py, 1, 1, c[0] < 5 ? C.yel1 : C.yel2);
  }
  let x0 = Math.min(tx, tx - d[0] * 7) - 5, x1 = Math.max(tx, tx - d[0] * 7) + 6;
  let y0 = Math.min(ty, ty - d[1] * 7) - 5, y1 = Math.max(ty, ty - d[1] * 7) + 6;
  if (label) {
    const w = measure(label, { font: 3 });
    // Beyond the stem's end, centred on the arrow (or, for one pointing across, beside it); never off the picture.
    const lx = Math.max(3, Math.min(W - 3 - w, d[0] ? (d[0] < 0 ? tx + 11 : tx - 11 - w) : Math.round(tx - w / 2)));
    const ly = d[1] ? (d[1] > 0 ? ty - 17 : ty + 11) : ty - 2;
    const right = tag(label, lx, ly);
    [x0, x1, y0, y1] = [Math.min(x0, lx - 2), Math.max(x1, right), Math.min(y0, ly - 2), Math.max(y1, ly + 7)];
  }
  return hit(x0, y0, x1, y1);
}
/**
 * The marker for something off the picture: the ways out's arrow (11 by 9) in yellow, at the edge on the side it's
 * on, nudging outward, with its label on the inside.
 */
export function edgePointer(side, y, now, label = '') {
  screen();
  const right = side === 'right', b = BOB(now), x = right ? W - 4 + b : 3 - b;
  const arrow = (c, o) => {
    if (right) {
      fill(x - 9 - o, y - 1 - o, 6 + 2 * o, 3 + 2 * o, c);
      for (let i = 0; i < 5; i++) fill(x - 3 + i - o, y - 4 + i - o, 1 + 2 * o, 9 - 2 * i + 2 * o, c);
    } else {
      fill(x + 4 - o, y - 1 - o, 6 + 2 * o, 3 + 2 * o, c);
      for (let i = 0; i < 5; i++) fill(x + 3 - i - o, y - 4 + i - o, 1 + 2 * o, 9 - 2 * i + 2 * o, c);
    }
  };
  arrow(C.ink, 1);
  arrow(C.yel1, 0);
  let x0 = right ? x - 10 : x - 2, x1 = right ? x + 2 : x + 11;
  if (label) {
    const w = measure(label, { font: 3 }), lx = right ? x - 14 - w : x + 15;
    tag(label, lx, y - 2);
    [x0, x1] = right ? [lx - 2, x1] : [x0, lx + w + 2];
  }
  return hit(x0, y - 7, x1, y + 7);
}
/**
 * The marker on Norbert himself (the notebook): a yellow frame round his corner, blinking, over the picture's own top
 * left. It's where a tap opens the notebook anyway.
 */
export function cornerMark(now) {
  screen();
  // Just inside the event chip on the right (it starts at x 49) and under his feet (he's 19 high, from y 2).
  const c = BOB(now) ? C.yel1 : C.yel2, w = CORNER.w, h = CORNER.h + 1;
  fill(w - 1, 0, 4, h + 3, C.ink);
  fill(0, h - 1, w + 3, 4, C.ink);
  fill(w, 0, 2, h + 2, c);
  fill(0, h, w + 2, 2, c);
  return { x: 0, y: 0, w: w + 4, h: h + 4 };
}
