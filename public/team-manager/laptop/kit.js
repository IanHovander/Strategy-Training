// The laptop and the pieces its scouting app is made of, in the game's own pixels (pixel.js): the bezel round the
// screen, the app's colours, its title bar, tabs, buttons, table rows, histograms and wrapped text, and the cursor.
// Everything is drawn straight onto the 256x144 screen (the camera at the screen), the laptop's display filling it
// inside a thin bezel, so the app has 248x128 pixels to work in.
//
// The cursor moves between hotspots. Each frame the app draws its page and, as it goes, says where every button and
// row is: spot(f, { id, x, y, w, h, act, a, info, nav, tap, sure }). id stays the same from frame to frame so the
// cursor stays put; act() is what A does there; a is the phone's word for A ('INVITE APEX'); info is the line along the
// bottom of the screen while the cursor's on it; nav names the spot to go to for left, right, up or down where the
// nearest one that way isn't it; tap, if given, is what a click does instead of act (a click on a row only picks it
// out); sure, for what can't be taken back, makes A ask first: { label, a, info } while it waits for A again; and home
// marks where the cursor starts on a page. The scene moves the cursor with the stick (navigate) and the mouse (hit),
// and presses A (pressSpot).
//
// Text: the fonts are capitals, digits and a little punctuation, so plain() turns the Showdown's typography (curly
// quotes, dashes, the times sign) into what they have, and wrap() breaks it into lines that fit.

import { C, fill, text, measure } from '../pixel.js';

/** The display inside the bezel. */
export const D = { x: 4, y: 4, w: 248, h: 128 };

/** The app's colours, from the game's palette: a dark scouting app, the alliances in red and blue, gold to act. */
export const UI = {
  body: C.night0, stripe: '#0d1135', panel: C.night1, edge: C.night2, rule: C.night2,
  dim: C.steel1, label: C.steel2, text: C.steel3, bright: C.white,
  gold: C.yel1, goldLo: C.yel0, goldHi: C.yel2,
  red: C.red1, redHi: C.red2, blue: C.blue1, blueHi: C.blue2, blueLo: C.blue0,
  bar: C.blue1, barHi: C.blue2, info: C.ink,
};
/** Alliance i's colours: Alliance 1 is red, Alliance 2 blue, as the Showdown has them. */
export const side = (i) => (i === 0 ? { lo: C.red0, mid: C.red1, hi: C.red2 } : { lo: C.blue0, mid: C.blue1, hi: C.blue2 });

// ---- Text ----
const SWAP = { '’': "'", '‘': "'", '“': '"', '”': '"', '–': '-', '—': '-', '−': '-', '×': 'X', '±': '+-', '…': '...', '✓': 'OK', '·': '-', '▸': '>' };
/** The Showdown's words in the fonts' letters: capitals, and plain punctuation for the typographic kind. */
export const plain = (str) => String(str).replace(/[’‘“”–—−×±…✓·▸]/g, (ch) => SWAP[ch]).toUpperCase();
/** str cut to fit w pixels, with a dot where it was cut. */
export function fit(str, w, o = { font: 3 }) {
  if (measure(str, o) <= w) return str;
  let s = str;
  while (s.length > 1 && measure(`${s}.`, o) > w) s = s.slice(0, -1);
  return `${s.trimEnd()}.`;
}
/** str broken into lines no wider than w pixels, at spaces. */
export function wrap(str, w, o = { font: 3 }) {
  const lines = [];
  let line = '';
  for (const word of plain(str).split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next, o) > w) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}
/** "0:41" from milliseconds. */
export const mmss = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
export const pct = (x) => `${Math.round(100 * x)}%`;

// ---- Hotspots and the cursor ----
/** Say where a hotspot is this frame, and whether the cursor's on it. */
export function spot(f, s) {
  f.spots.push(s);
  return f.focus === s.id;
}
/** A on a hotspot: what it does, or, if it asks to be sure first, the asking (ui.sure holds what's being asked). */
export function pressSpot(ui, s) {
  if (!s) return;
  if (s.sure && ui.sure !== s.id) {
    ui.sure = s.id;
    return;
  }
  ui.sure = null;
  s.act?.();
}
/** The hotspot at (x, y), if any. */
export const hit = (spots, x, y) => spots.find((s) => x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h) ?? null;
/**
 * Where the cursor goes from the hotspot `id` for a push of the stick along (dx, dy) (one of them 0): the spot nav
 * names that way, if it does; otherwise the nearest spot that way, preferring those level with it (a row's neighbours
 * in its column, a button's along its row) over ones off at an angle.
 */
export function navigate(spots, id, dx, dy) {
  const from = spots.find((s) => s.id === id);
  if (!from) return spots[0]?.id ?? null;
  const way = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
  const named = from.nav?.[way];
  if (named && spots.some((s) => s.id === named)) return named;
  const mid = (s) => [s.x + s.w / 2, s.y + s.h / 2];
  const [fx, fy] = mid(from);
  let best = null, bestScore = Infinity;
  for (const s of spots) {
    if (s === from) continue;
    const [sx, sy] = mid(s);
    const along = dx ? (sx - fx) * dx : (sy - fy) * dy;
    if (along <= 0) continue;
    // How far off to the side: 0 when the two overlap across the way you're going.
    const gap = dx ? Math.max(0, s.y - (from.y + from.h), from.y - (s.y + s.h)) : Math.max(0, s.x - (from.x + from.w), from.x - (s.x + s.w));
    const score = along + gap * 6 + (gap > 0 ? 40 : 0);
    if (score < bestScore) [best, bestScore] = [s, score];
  }
  return best?.id ?? id;
}
/**
 * The cursor: a white arrow on an ink outline, like the arena's way-out arrow, pointing right at the hotspot from just
 * left of it and nudging in and out.
 */
export function cursor(x, y, t) {
  const cx = Math.round(x) - 1 + (Math.floor(t * 3) % 2), cy = Math.round(y);
  for (let i = 0; i < 4; i++) fill(cx - 4 + i - 1, cy - 3 + i - 1 + 1, 3, 7 - 2 * i, C.ink);
  for (let i = 0; i < 3; i++) fill(cx - 4 + i, cy - 2 + i + 1, 1, 5 - 2 * i, C.white);
}

// ---- The laptop ----
/** The bezel round the display: dark plastic, a webcam over the middle, and the hinge and keyboard deck below. */
export function bezel(t, { on = true } = {}) {
  fill(0, 0, 256, 144, C.ink);
  fill(1, 0, 254, D.y + D.h + 7, '#161925');
  fill(2, 1, 252, 1, '#232838');
  fill(D.x - 1, D.y - 1, D.w + 2, D.h + 2, '#05060d');
  // The webcam, and its light while the app is open.
  fill(126, 1, 4, 2, '#05060d');
  fill(127, 1, 2, 1, '#2a3a8a');
  if (on) fill(131, 1, 1, 1, Math.floor(t * 0.7) % 4 ? '#1f8a50' : '#13693b');
  // The chin: the maker's name worn off, and 5026's sticker in the corner.
  text('5026', 128, D.y + D.h + 2, { font: 3, color: '#3f4761', align: 'center' });
  fill(232, D.y + D.h + 2, 14, 5, C.red1);
  fill(232, D.y + D.h + 2, 14, 1, C.red2);
  text('IP', 239, D.y + D.h + 2, { font: 3, color: '#fff4ee', align: 'center' });
  // The hinge, then the keyboard deck catching the light from the screen.
  fill(0, 139, 256, 1, '#05060d');
  fill(0, 140, 256, 4, C.steel1);
  fill(0, 140, 256, 1, C.steel2);
  for (let x = 20; x < 236; x += 9) fill(x, 142, 7, 2, '#2a2f45');
}

// ---- The app's pieces ----
/** A box with an ink edge: fill, a lighter top line if given. */
export function box(x, y, w, h, c, top = null, edge = C.ink) {
  fill(x, y, w, h, edge);
  fill(x + 1, y + 1, w - 2, h - 2, c);
  if (top) fill(x + 1, y + 1, w - 2, 1, top);
}

/**
 * A button: tone 'plain' (dark), 'on' (the choice that's set, in blue), 'gold' (do it), 'red' or 'blue' (an
 * alliance's), or 'off' (not now). One line of words, or two (sub). The cursor on it lights its edge gold.
 */
export function button(f, b) {
  const asking = b.sure && f.ui.sure === b.id;
  const { x, y, w, h = 9, sub = null, color = null } = b;
  const label = asking ? b.sure.label : b.label, tone = asking ? 'gold' : b.tone ?? 'plain';
  const on = spot(f, { ...b, h, ...(asking && { a: b.sure.a, info: b.sure.info }) });
  const look = {
    plain: [UI.edge, C.night3, UI.text], on: [UI.blue, UI.blueHi, UI.bright], gold: [UI.gold, UI.goldHi, C.ink],
    red: [C.red1, C.red2, UI.bright], blue: [UI.blue, UI.blueHi, UI.bright], off: [UI.panel, UI.panel, UI.dim],
  }[tone];
  box(x, y, w, h, look[0], look[1], on ? UI.goldHi : C.ink);
  if (asking && Math.floor(f.t * 3) % 2) fill(x + 1, y + 1, w - 2, h - 2, UI.goldHi);
  if (on) fill(x - 1, y + 1, 1, h - 2, UI.goldHi);
  const words = color ?? look[2];
  if (sub == null) text(fit(label, w - 4), x + Math.floor(w / 2), y + Math.floor((h - 5) / 2), { font: 3, color: words, align: 'center' });
  else {
    text(fit(label, w - 4), x + Math.floor(w / 2), y + 2, { font: 3, color: words, align: 'center' });
    text(fit(sub, w - 4), x + Math.floor(w / 2), y + 8, { font: 3, color: tone === 'gold' ? C.ink : tone === 'plain' ? UI.label : C.blue3, align: 'center' });
  }
  return on;
}

/** A tab along the title bar: the open one joins the page below it. */
export function tab(f, t) {
  const { x, y, w, label, open } = t;
  const on = spot(f, { ...t, h: 9 });
  fill(x, y, w, 9, C.ink);
  fill(x + 1, y + 1, w - 2, 8, open ? UI.body : UI.blueLo);
  if (open) fill(x + 1, y + 1, w - 2, 1, UI.barHi);
  text(label, x + Math.floor(w / 2), y + 3, { font: 3, color: on ? UI.goldHi : open ? UI.bright : C.blue3, align: 'center' });
  if (on) fill(x + 2, y + 8, w - 4, 1, UI.goldHi);
}

/**
 * A row of a list: a hotspot the width of the list, striped every other row, lit in blue under the cursor and in a
 * quieter blue when it's the one picked out (shown in the panel beside it). Returns whether the cursor's on it.
 */
export function row(f, r, i, { picked = false, grabbed = false } = {}) {
  const on = spot(f, r);
  const c = grabbed ? UI.gold : on ? UI.blue : picked ? UI.edge : i % 2 ? UI.stripe : UI.body;
  fill(r.x, r.y, r.w, r.h, c);
  if (grabbed) {
    fill(r.x, r.y, 1, r.h, UI.goldHi);
    fill(r.x + r.w - 1, r.y, 1, r.h, UI.goldHi);
  }
  return on;
}

/** The colour for a row's words: ink on gold, white under the cursor, else as given. */
export const ink = (on, grabbed, c) => (grabbed ? C.ink : on ? UI.bright : c);

/**
 * Bars for cycle counts 0 to 12, in the box (x, y, w, h), with the count over each bar that has any and the cycle
 * numbers under. shares are fractions; counts (if given) are what to write over them. The zero bar (a breakdown) is
 * red; the rest are `color`.
 */
export function histogram(x, y, w, h, shares, { counts = null, color = UI.blueHi, zero = UI.redHi, labels = true, ghost = null } = {}) {
  const n = shares.length, gap = w >= n * 8 ? 2 : 1, bw = Math.floor((w - gap * (n - 1)) / n);
  const top = Math.max(0.1, ...shares, ...(ghost ?? []));
  const room = h - (counts ? 7 : 0) - (labels ? 7 : 0), base = y + h - (labels ? 7 : 0);
  fill(x, base, n * (bw + gap) - gap, 1, UI.dim);
  shares.forEach((share, k) => {
    const bx = x + k * (bw + gap);
    if (ghost) {
      const gh = Math.round((ghost[k] / top) * room);
      if (gh > 0) fill(bx, base - gh, bw, gh, UI.edge);
    }
    const bh = Math.round((share / top) * room);
    if (bh > 0) {
      fill(bx, base - bh, bw, bh, k === 0 ? zero : color);
      fill(bx, base - bh, bw, 1, k === 0 ? C.red3 : C.blue3);
    }
    if (counts && counts[k]) text(String(counts[k]), bx + Math.floor(bw / 2) + 1, base - bh - 6, { font: 3, color: UI.text, align: 'center' });
    // Every cycle count under its bar where there's room for two digits, else every other one.
    if (labels && (k % 2 === 0 || bw + gap >= 10)) text(String(k), bx + Math.floor(bw / 2) + 1, base + 2, { font: 3, color: UI.label, align: 'center' });
  });
}

/** A small tile: a label over a value. */
export function tile(x, y, w, label, value, color = UI.bright) {
  box(x, y, w, 17, UI.panel, null, UI.edge);
  text(label, x + 3, y + 2, { font: 3, color: UI.label });
  text(value, x + 3, y + 9, { color });
}
