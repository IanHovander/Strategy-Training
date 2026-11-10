// The game's screens are drawn in pixels like everything else (the scouting tablet, the plan for a match, the notebook),
// so this is their kit: boxes, buttons, ticks, a strip of match scores, and a Menu, which is how the stick, A and a
// finger all press the same things. Everything is in screen pixels, 256x144, through pixel.js.
//
// A Menu is rebuilt every frame as the screen is drawn: each thing that can be pressed calls item() with where it is and
// what pressing it does, and is told whether the cursor's on it or a finger's holding it down, so it can draw itself
// that way. The stick moves the cursor to the nearest thing in the direction pushed, A presses what the cursor's on, and
// a tap presses what it lands on when the finger lets go on it (slide off to change your mind). Nothing is laid out
// twice: where a thing is drawn is where it's pressed.
//
//   const m = new Menu();
//   m.begin();                                   as a frame's drawing starts
//   const { on, down } = m.item('go', rect, () => start());      for each pressable thing, as it's drawn
//   m.end();                                     once they're all in
//   m.stick(s.stick(), now), m.press(), m.point(type, x, y)      from the screen's update, A and pointer
//
//   box, frame, dotted, shade, button, chip      panels and what goes on them
//   tick, cross, arrow, pips                     small marks
//   strip(scores, x, y, o)                       a robot's matches as a row of boxes, blank ones dotted
//   wrap(str, n), clockText(secs), plural(n, w)  words

import { W, H, C, screen, fill, text, measure, withAlpha, clamp } from '../pixel.js';

/** Green, for something made or won: the palette has none of its own. */
export const GOOD = '#3fd06a', GOOD0 = '#1d6b35';
export const inRect = (r, x, y) => !!r && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

// ---- Panels ----
/** A one-pixel (or t-pixel) outline. */
export function frame(x, y, w, h, c, t = 1) {
  fill(x, y, w, t, c);
  fill(x, y + h - t, w, t, c);
  fill(x, y, t, h, c);
  fill(x + w - t, y, t, h, c);
}
/** A dotted outline: something that isn't there yet. */
export function dotted(x, y, w, h, c) {
  for (let i = 0; i < w; i += 2) {
    fill(x + i, y, 1, 1, c);
    fill(x + i, y + h - 1, 1, 1, c);
  }
  for (let j = 0; j < h; j += 2) {
    fill(x, y + j, 1, 1, c);
    fill(x + w - 1, y + j, 1, 1, c);
  }
}
/** A panel: an ink outline, a fill and a lit line along its top. o: fillC, edge (the outline inside the ink), top. */
export function box(x, y, w, h, o = {}) {
  fill(x - 1, y - 1, w + 2, h + 2, C.ink);
  fill(x, y, w, h, o.fillC ?? C.night1);
  if (o.edge) frame(x, y, w, h, o.edge, o.thick ?? 1);
  else fill(x, y, w, 1, o.top ?? C.night3);
}
/** The screen (from row y0 down) darkened, for something to stand in front of it. */
export function shade(a = 0.75, y0 = 0) {
  screen();
  withAlpha(a, () => fill(0, y0, W, H - y0, C.ink));
}
/** The dark blue ground the tablet's screens stand on, with its faint columns. */
export function ground(y0 = 0) {
  screen();
  fill(0, y0, W, H - y0, C.night0);
  for (let x = 4; x < W; x += 12) fill(x, y0, 1, H - y0, '#0d1133');
}
/**
 * A button: lit yellow with the cursor on it (blinking a little), pushed in a pixel under a finger, an outline
 * otherwise. st: what Menu.item() gave back. o: font (5 or 3), off (can't be pressed: greyed), t (seconds, for the blink).
 */
export function button(r, label, st = {}, o = {}) {
  const { x, w, h } = r, y = r.y + (st.down ? 1 : 0), font = o.font ?? 5, th = font === 3 ? 5 : 7;
  if (o.off) {
    frame(x, y, w, h, C.steel0);
    text(label, x + Math.floor(w / 2), y + Math.floor((h - th) / 2), { font, align: 'center', color: C.steel1 });
    return;
  }
  if (st.on) {
    fill(x - 1, y - 1, w + 2, h + 2, C.ink);
    fill(x, y, w, h, st.down ? C.yel0 : (o.t ?? 0) % 0.9 < 0.6 ? C.yel1 : C.yel2);
  } else {
    fill(x, y, w, h, o.fillC ?? C.night2);
    frame(x, y, w, h, o.edge ?? C.steel2);
  }
  text(label, x + Math.floor(w / 2), y + Math.floor((h - th) / 2), { font, align: 'center', color: st.on ? (st.down ? C.white : C.ink) : o.color ?? C.steel3 });
}
/** A small coloured tag with a word on it: a robot's kind, a role. Returns its width. */
export function chip(x, y, word, c, o = {}) {
  const w = measure(word, { font: 3 }) + 4;
  fill(x, y, w, 7, c);
  text(word, x + 2, y + 1, { font: 3, color: o.color ?? C.ink });
  return w;
}

// ---- Marks ----
/** A thick line of s x s squares from (x0, y0) to (x1, y1): the strokes of a tick or a cross. */
export function stroke(x0, y0, x1, y1, s, c) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let k = 0; k <= n; k++) fill(Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n), s, s, c);
}
/** A tick, 7 wide and 5 high, top left at (x, y). */
export function tick(x, y, c = GOOD) {
  stroke(x, y + 2, x + 2, y + 4, 1, c);
  stroke(x + 2, y + 4, x + 6, y, 1, c);
  stroke(x, y + 3, x + 2, y + 5, 1, c);
  stroke(x + 2, y + 5, x + 6, y + 1, 1, c);
}
/** A cross, 5 by 5. */
export function cross(x, y, c = C.red2) {
  stroke(x, y, x + 4, y + 4, 1, c);
  stroke(x + 4, y, x, y + 4, 1, c);
}
/** A little triangle pointing left (-1) or right (1), 3x5, or up (dy -1) or down (dy 1), 5x3. */
export function arrow(x, y, d, c, dy = 0) {
  if (dy) {
    for (let i = 0; i < 3; i++) fill(x + 2 - i, y + (dy < 0 ? i : 2 - i), 1 + 2 * i, 1, c);
    return;
  }
  for (let i = 0; i < 3; i++) fill(x + (d < 0 ? i : 2 - i), y + 2 - i, 1, 1 + 2 * i, c);
}
/** n small squares in a row, `lit` of them lit: a series' wins, a count of something. */
export function pips(x, y, n, lit, c = C.yel1, off = C.night2) {
  for (let i = 0; i < n; i++) {
    fill(x + i * 7, y, 5, 5, C.ink);
    fill(x + i * 7 + 1, y + 1, 3, 3, i < lit ? c : off);
  }
}

/**
 * A robot's matches as a row of boxes: a number in each one seen, a dotted box for each one not. o: w, h (a box), gap,
 * split (after which box the day changes: a wider gap), color(i, v) for a box's fill, mark (indexes outlined).
 * Returns the width.
 */
export function strip(scores, x, y, o = {}) {
  const { w = 9, h = 9, gap = 1, split = 7, mark = [] } = o;
  const at = (i) => x + i * (w + gap) + (i >= split ? 3 : 0);
  scores.forEach((v, i) => {
    const bx = at(i);
    if (v == null) {
      fill(bx, y, w, h, C.night0);
      dotted(bx, y, w, h, C.steel1);
      return;
    }
    fill(bx, y, w, h, o.color?.(i, v) ?? C.night3);
    fill(bx, y, w, 1, o.top?.(i, v) ?? C.blue2);
    text(String(v), bx + Math.ceil(w / 2), y + Math.ceil((h - 5) / 2), { font: 3, align: 'center', color: C.white });
    if (mark.includes(i)) {
      frame(bx - 1, y - 1, w + 2, h + 2, C.ink);
      frame(bx - 2, y - 2, w + 4, h + 4, C.yel1);
    }
  });
  return at(scores.length - 1) + w - x;
}

// ---- Words ----
/** A sentence broken into lines of at most n characters, at the spaces. */
export function wrap(str, n = 38) {
  const lines = [];
  let line = '';
  for (const word of String(str).split(' ')) {
    if (line && (line + ' ' + word).length > n) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}
/** Dialog pages (two lines of 38 each) from a long sentence, for talk.js. */
export function pages(str) {
  const lines = wrap(str, 38), out = [];
  for (let i = 0; i < lines.length; i += 2) out.push(lines.slice(i, i + 2));
  return out;
}
/** A clock's face: 0:45. */
export const clockText = (s) => {
  const n = Math.max(0, Math.ceil(s - 1e-6));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
};
export const plural = (n, word, many = `${word}S`) => `${n} ${n === 1 ? word : many}`;
/** A line of words that blinks once it's there: "A: CONTINUE". */
export function blink(str, y, t, o = {}) {
  if ((o.from ?? 0) > t || (t - (o.from ?? 0)) % 1 > 0.7) return;
  const w = measure(str, { font: o.font ?? 5 }) + 14, x = Math.round((o.x ?? W / 2) - w / 2);
  fill(x, y - 4, w, o.font === 3 ? 13 : 15, C.night2);
  frame(x, y - 4, w, o.font === 3 ? 13 : 15, C.yel1);
  text(str, x + 7, y, { font: o.font ?? 5, color: C.yel2 });
}

// ---- The menu ----
const DEAD = 0.35, REPEAT = 0.3;
export class Menu {
  constructor() {
    this.items = [];
    this.on = null;
    this.down = null;
    this.heldKey = '';
    this.heldAt = 0;
  }
  /** A frame's drawing starts: last frame's things are forgotten. */
  begin() {
    this.items = [];
  }
  /**
   * Something pressable, where it's drawn: r { x, y, w, h }, act() what pressing it does. o.off: it's there but can't be
   * pressed; o.pad: extra pixels round it a finger can land on; o.quiet: the stick skips it (a finger can still press
   * it). Returns { on, down }: the cursor's on it, a finger's holding it down.
   */
  item(id, r, act, o = {}) {
    this.items.push({ id, r, act, ...o });
    if (this.on == null && !o.off && !o.quiet) this.on = id;
    return { on: this.on === id, down: this.down === id };
  }
  /** The frame's things are all in: if the cursor was on something that's gone, it goes to the first. */
  end() {
    if (!this.items.some((i) => i.id === this.on && !i.off)) this.on = this.items.find((i) => !i.off && !i.quiet)?.id ?? null;
  }
  /** The stick: a push moves the cursor once, and again every REPEAT seconds held. */
  stick(st, now) {
    const across = Math.abs(st.x) >= Math.abs(st.y);
    const d = st.mag < DEAD ? null : across ? [Math.sign(st.x), 0] : [0, Math.sign(st.y)];
    const key = d ? d.join() : '';
    if (d && (key !== this.heldKey || now - this.heldAt > REPEAT)) {
      this.heldAt = now;
      this.move(d[0], d[1]);
    }
    this.heldKey = key;
  }
  /** The cursor to the nearest thing that way: mostly along the push, a little allowed across it. */
  move(dx, dy) {
    const cur = this.items.find((i) => i.id === this.on);
    if (!cur) {
      this.on = this.items.find((i) => !i.off && !i.quiet)?.id ?? null;
      return;
    }
    const cx = cur.r.x + cur.r.w / 2, cy = cur.r.y + cur.r.h / 2;
    let best = null, bestD = Infinity;
    for (const it of this.items) {
      if (it === cur || it.off || it.quiet) continue;
      const ix = it.r.x + it.r.w / 2 - cx, iy = it.r.y + it.r.h / 2 - cy;
      const along = ix * dx + iy * dy, off = Math.abs(ix * dy) + Math.abs(iy * dx);
      // Only what's really that way: within about sixty degrees of the push.
      if (along < 1 || off > along * 1.8) continue;
      const d = along + off * 3;
      if (d < bestD) [best, bestD] = [it, d];
    }
    if (best) {
      this.on = best.id;
      this.moved = true;
    }
  }
  /** A: press what the cursor's on. */
  press() {
    const it = this.items.find((i) => i.id === this.on);
    if (!it || it.off) return false;
    it.act?.();
    return true;
  }
  /** A finger: true from 'down' if it landed on something. It presses what it lets go on, if that's what it came down on. */
  point(type, x, y) {
    let hit = null;
    for (const it of this.items) {
      const p = it.pad ?? 1, r = { x: it.r.x - p, y: it.r.y - p, w: it.r.w + 2 * p, h: it.r.h + 2 * p };
      if (!it.off && inRect(r, x, y)) hit = it; // the last drawn is on top
    }
    if (type === 'down') {
      this.down = hit?.id ?? null;
      if (hit && !hit.quiet) this.on = hit.id;
      return !!hit;
    }
    if (type === 'up') {
      const was = this.down;
      this.down = null;
      if (hit && hit.id === was) hit.act?.();
    } else if (type === 'cancel') this.down = null;
    return true;
  }
}

/** Where the picture's edge is, for a screen to keep its words inside. */
export { W, H, clamp };
