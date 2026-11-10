// What sits over every screen and place once Norbert is hers: him in the top left corner with his battery's voltage
// (tap him, or press B, for the notebook), and a slip of notebook paper that slides in when she's seen something worth
// writing down: a new field note, with its name and what she saw.
//
//   corner(st, { glow, dy, hint })   Norbert and his volts; glow lights his 26 ear (0 to 1)
//   CORNER                           where he is, for a tap
//   toast(notes), drawToasts(now)    field notes just found, queued and shown one after another; toasting() while any is up
//   paper(x, y, w, h)                a slip of the notebook's paper, for anything written in her hand

import { W, C, screen, fill, text, measure, clamp, easeOut, seg } from '../pixel.js';
import { drawNorbert } from '../norbert.js';
import { voltsText } from './state.js';

export const CORNER = { x: 0, y: 0, w: 46, h: 22 };
/** Norbert in his corner, and what's in his battery. */
export function corner(st, { glow = 0, dy = 0, hint = false } = {}) {
  screen();
  drawNorbert(3, 2 + dy, { glow });
  text(voltsText(st), 21, 4 + dy, { font: 3, color: glow > 0 ? C.yel2 : C.steel2 });
  if (hint) text('NOTES', 21, 11 + dy, { font: 3, color: C.steel1 });
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
