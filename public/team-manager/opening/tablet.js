// The scouting tablet at the opening's pick, drawn on the big screen (256x144). Everything here is a picture of one
// moment: pick.js keeps the state (which card, which phase, the clock) and says what to draw.
//
// The screen, top to bottom: the header (Norbert's corner on the left, the 45-second clock in the middle, the top
// right left clear for SKIP and NEXT SCENE), the clock's draining bar, her robot pinned in a row for reference, then
// one card per team she can pick, side by side, and a hint line at the bottom. A card has the team number, its
// average (the biggest number on the screen: the tempting one), one short note, and its ten qualification matches as
// a strip of boxes, Friday's seven then Saturday morning's three, set a little apart. A blank box is a match nobody scored.
//
//   drawTablet({ t, left, on, hint, thought, glow, drag })
//                                                      the tablet: t seconds since the clock slammed in, left the
//                                                      seconds on the clock, on the card the cursor's on (-1: none);
//                                                      drag: a card picked up off the tablet (below)
//   drawConfirm(team, choice, k, pressed)              "5026 RESPECTFULLY INVITES TEAM ..." over it, INVITE or BACK
//                                                      (pressed: the one held down under a finger)
//   drawAccept(team, t)                                "6834 ACCEPTS!", t seconds in
//   drawResult(team, good, t, { glow })                the bet log's stamp, the reveal and the one line to remember
//   drawRewind(k)                                      the tape running back over the tablet, k from 0 to 1
//   drawContinued(t)                                   the end of what's built: TO BE CONTINUED
//   clockText(seconds)                                 0:45
//
// Where things are, for taps (pick.js): every rectangle here is the one it's drawn in, so a tap lands on what it shows.
//   cardRect(i, on)     team i's card ({ x, y, w, h }; on: lifted the two pixels the cursor lifts it)
//   PINNED              her robot's row: drop a card on it to invite that team
//   CONFIRM, buttonRect(i)   the invite's box, and its INVITE (0) and BACK (1) buttons
//   hintRects(hint)     the hint line's ◀ and ▶ and its A: ... ({ left, right, act }), a little bigger than drawn
//   inRect(r, x, y)     whether (x, y) is in r
// A card being dragged (drag: { i, x, y, over, k }) is drawn lifted where the finger has it, top left at (x, y), with a
// shadow under it and a dotted gap where it came from; over: it's over her robot's row, which lights up to take it. k,
// from 0 to 1, is how far it's lifted (it settles back into its gap with k going down, after a drop anywhere else).

import { W, H, C, screen, fill, text, measure, withAlpha, dither, clamp, rnd } from '../pixel.js';
import { drawHud } from './norbert-held.js';
import { OURS, YOU, TEAMS, FRIDAY, RECENT, avgOf, earlyOf, recentOf } from './teams.js';

export const PICK_CLOCK = 45;
/** Good and bad, for the bet log's stamps: the palette has no green, so it's here. */
const GOOD = '#3fd06a', GOOD0 = '#1d6b35';
/** The lesson, in one line. */
export const LESSON = 'LOOK AT THE TREND, NOT THE AVERAGE.';
const [FADING, RISING] = TEAMS;
const WHY = `${FADING.num} IS FADING. ${RISING.num} IS ON THE RISE.`;

/** The clock's face: 0:45. */
export const clockText = (s) => {
  const n = Math.max(0, Math.ceil(s - 1e-6));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
};

// ---- Small pieces ----
/** A one-pixel outline. */
function frame(x, y, w, h, c, t = 1) {
  fill(x, y, w, t, c);
  fill(x, y + h - t, w, t, c);
  fill(x, y, t, h, c);
  fill(x + w - t, y, t, h, c);
}
/** A dotted outline, for a box with nothing in it. */
function dotted(x, y, w, h, c) {
  for (let i = 0; i < w; i += 2) {
    fill(x + i, y, 1, 1, c);
    fill(x + i, y + h - 1, 1, 1, c);
  }
  for (let j = 0; j < h; j += 2) {
    fill(x, y + j, 1, 1, c);
    fill(x + w - 1, y + j, 1, 1, c);
  }
}
/** A little triangle pointing left (-1) or right (1), 3x5, top left at (x, y). */
function arrow(x, y, d, c) {
  for (let i = 0; i < 3; i++) {
    const col = d < 0 ? i : 2 - i;
    fill(x + col, y + 2 - i, 1, 1 + 2 * i, c);
  }
}
/** A thick line of s x s squares from (x0, y0) to (x1, y1): the strokes of a tick or a cross. */
function stroke(x0, y0, x1, y1, s, c) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let k = 0; k <= n; k++) fill(Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n), s, s, c);
}
/** A line of words with pieces in different colours: [[str, color], ...], centred on x. */
function line(parts, x, y, o = {}) {
  const gap = o.font === 3 ? 4 : 6;
  const wOf = (str) => (str === '·' ? 2 : measure(str, o));
  const width = parts.reduce((n, [str]) => n + wOf(str), 0) + gap * (parts.length - 1);
  let px = x - Math.floor(width / 2);
  for (const [str, color] of parts) {
    if (str === '·') fill(px, y + (o.font === 3 ? 2 : 3), 2, 2, color);
    else text(str, px, y, { ...o, color });
    px += wOf(str) + gap;
  }
}

/**
 * Ten matches as a strip of boxes, Friday's then (a little apart) Saturday's. A score is a filled box with the number
 * in it; a blank is an empty dotted box. o: w, h (a box), gap, split (the extra gap before Saturday), font (3 or 5),
 * fillC (a scored box's colour), last: [colour, lit colour] to light up the last RECENT boxes (the reveal), lastK from
 * 0 to 1 how many of them are lit so far, one after another.
 */
function drawStrip(scores, x, y, o) {
  const { w, h, gap = 1, split = 3, font = 3, fillC = C.night3, last = null, lastK = 1 } = o;
  const th = font === 3 ? 5 : 7, from = scores.length - RECENT;
  const boxX = (i) => x + i * (w + gap) + (i >= FRIDAY ? split : 0);
  scores.forEach((v, i) => {
    const bx = boxX(i);
    if (v == null) {
      fill(bx, y, w, h, C.night0);
      dotted(bx, y, w, h, C.steel2);
      return;
    }
    const lit = last && i >= from && (i - from + 1) / RECENT <= lastK + 1e-6;
    fill(bx, y, w, h, lit ? last[0] : fillC);
    fill(bx, y, w, 1, lit ? last[1] : C.blue2);
    text(String(v), bx + Math.ceil(w / 2), y + Math.ceil((h - th) / 2), { font, align: 'center', color: C.white });
  });
  // The last four, once they're all lit, get a frame round them, across the night between Friday and Saturday.
  if (last && lastK >= 1) {
    const sx = boxX(from) - 2;
    frame(sx, y - 2, boxX(scores.length - 1) + w + 2 - sx, h + 4, last[1]);
  }
  return 10 * w + 9 * gap + split;
}
/** FRI and SAT under a strip drawn at (x, y) with these boxes. */
function dayLabels(x, y, { w, gap = 1, split = 3 }) {
  const fri = FRIDAY * (w + gap) - gap, sat = (10 - FRIDAY) * (w + gap) - gap;
  text('FRI', x + Math.floor(fri / 2), y, { font: 3, align: 'center', color: C.steel2 });
  text('SAT', x + fri + gap + split + Math.floor(sat / 2), y, { font: 3, align: 'center', color: C.steel2 });
}

// ---- Where things are ----
export const CARD = { y: 60, w: 116, h: 66 };
const cardX = (i) => 8 + i * (CARD.w + 8);
export const cardRect = (i, on = false) => ({ x: cardX(i), y: CARD.y - (on ? 2 : 0), w: CARD.w, h: CARD.h });
export const PINNED = { x: 8, y: 37, w: W - 16, h: 20 };
export const CONFIRM = { x: 24, y: 42, w: 208, h: 74 };
export const buttonRect = (i) => ({ x: W / 2 - 74 + i * 78, y: CONFIRM.y + 47, w: 70, h: 15 });
export const inRect = (r, x, y) => !!r && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
/** The hint line's baseline, and where its parts go: ◀ ▶ at x, the words after them, A: ... at ax. */
const HINT_Y = 134;
function hintLayout([move, act]) {
  const a = `A: ${act}`, wm = measure(move, { font: 3 }) + 12, wa = measure(a, { font: 3 }), total = wm + 16 + wa;
  const x = Math.round(W / 2 - total / 2);
  return { x, move, a, ax: x + wm + 16, wa };
}
/** The hint line's ◀, ▶ and A: ..., for a finger: the arrows a box each either side of the gap between them. */
export function hintRects(hint) {
  const { x, ax, wa } = hintLayout(hint), y = HINT_Y - 4, h = 13;
  return { left: { x: x - 6, y, w: 10, h }, right: { x: x + 4, y, w: 10, h }, act: { x: ax - 4, y, w: wa + 8, h } };
}

// ---- The tablet ----
const STRIP = { w: 9, h: 9, gap: 1, split: 3 };

function header(t, left) {
  fill(0, 0, W, 28, C.night1);
  fill(0, 28, W, 1, C.night3);
  const out = left <= 0;
  const hot = left <= 10 && !out && left % 1 > 0.7;
  const slam = t < 0.12;
  if (slam) fill(W / 2 - 30, 1, 60, 20, C.white);
  const face = out && t % 0.8 < 0.4 ? 'TIME!' : clockText(left);
  text(face, W / 2, 4, { scale: 2, align: 'center', color: slam ? C.red1 : hot ? C.white : C.red2, outline: C.ink });
  if (out) text("TIME'S UP. ROBIN'S WAITING: PICK!", W / 2, 21, { font: 3, align: 'center', color: C.red3 });
  else text('THE PICK - ALLIANCE 4 - ROUND 1', W / 2, 21, { font: 3, align: 'center', color: C.blue3 });
  // The clock's bar, draining along under the header.
  const bar = Math.round((W - 8) * clamp(left, 0, PICK_CLOCK) / PICK_CLOCK);
  fill(4, 31, W - 8, 3, C.night1);
  fill(4, 31, bar, 3, left <= 10 ? C.red2 : C.red1);
}

/** Her robot, pinned in a row at the top for reference: what an average of 30 looks like when every match is played. */
function pinned() {
  const y = 37;
  fill(8, y, W - 16, 20, C.night1);
  fill(8, y, 2, 20, C.red1);
  text('YOUR ROBOT', 15, y + 4, { font: 3, color: C.red3 });
  text(OURS, 15, y + 11, { color: C.white });
  text('AVG', 78, y + 11, { font: 3, color: C.steel2 });
  text(String(avgOf(YOU)), 92, y + 4, { scale: 2, color: C.steel3 });
  const sx = 134;
  drawStrip(YOU.scores, sx, y + 3, { ...STRIP, fillC: C.steel1 });
  dayLabels(sx, y + 14, STRIP);
}

/** One team's card: number, the big average, the note, the ten matches. on: the cursor's on it. (x, y): its top left. */
function card(team, on, t, x, y) {
  const { w, h } = CARD;
  fill(x, y, w, h, on ? C.night2 : C.night1);
  if (on) {
    frame(x - 1, y - 1, w + 2, h + 2, C.ink);
    frame(x, y, w, h, t % 0.9 < 0.6 ? C.yel1 : C.yel0, 2);
  } else frame(x, y, w, h, C.steel1);
  text(team.num, x + 7, y + 6, { scale: 2, color: C.white });
  const avg = String(avgOf(team)), aw = measure(avg, { scale: 3 });
  text(avg, x + w - 7, y + 5, { scale: 3, align: 'right', color: on ? C.yel2 : C.yel1, outline: C.ink });
  text('AVG', x + w - 7 - aw - 4, y + 21, { font: 3, align: 'right', color: C.steel2 });
  text(team.note, x + 7, y + 30, { font: 3, color: C.steel3 });
  text('MATCHES', x + 7, y + 40, { font: 3, color: C.steel2 });
  drawStrip(team.scores, x + 7, y + 47, STRIP);
  dayLabels(x + 7, y + 58, STRIP);
}

/** The hint line at the bottom: ◀ ▶ CHOOSE   A PICK, or her thought, in its place, after a rewind (color: its own). */
function hintLine(hint, thought, color = C.blue3) {
  const y = HINT_Y;
  if (thought) {
    text(thought, W / 2, y - 1, { align: 'center', color });
    return;
  }
  const { x, move, a, ax } = hintLayout(hint);
  arrow(x, y, -1, C.steel3);
  arrow(x + 5, y, 1, C.steel3);
  text(move, x + 12, y, { font: 3, color: C.steel3 });
  text(a, ax, y, { font: 3, color: C.yel2 });
}

/** Her robot's row lit up to take a card dropped on it: a yellow frame, blinking, and INVITE on a tag at its right. */
function pinnedTakes(t) {
  const { x, y, w, h } = PINNED;
  frame(x - 1, y - 1, w + 2, h + 2, C.ink);
  frame(x, y, w, h, t % 0.5 < 0.3 ? C.yel1 : C.yel2, 2);
}

/** A card lifted off the tablet where the finger has it: its gap left dotted, a shadow under it, it on top. */
function lifted(team, i, d, t) {
  const home = cardRect(i), k = clamp(d.k ?? 1, 0, 1);
  const x = Math.round(home.x + (d.x - home.x) * k), y = Math.round(home.y + (d.y - home.y) * k);
  const up = Math.round(3 * k); // how far over its shadow it rides
  withAlpha(0.55, () => fill(x + up, y + up + 1, CARD.w, CARD.h, C.ink));
  card(team, true, t, x, y);
  return { x, y };
}

export function drawTablet({ t = 1, left = PICK_CLOCK, on = 0, hint = ['CHOOSE', 'PICK'], thought = null, glow = 0, drag = null } = {}) {
  screen();
  fill(0, 0, W, H, C.night0);
  for (let x = 4; x < W; x += 12) fill(x, 30, 1, H - 30, '#0d1133');
  header(t, left);
  pinned();
  TEAMS.forEach((team, i) => {
    if (drag?.i !== i) return card(team, i === on, t, cardX(i), CARD.y - (i === on ? 2 : 0));
    // Picked up: a dotted gap where it was.
    const { x, y, w, h } = cardRect(i);
    dotted(x, y, w, h, C.steel1);
  });
  if (drag) {
    const team = TEAMS[drag.i];
    if (drag.over) pinnedTakes(t);
    // While it's up, the hint line says what to do with it.
    if ((drag.k ?? 1) >= 1) {
      hintLine(null, drag.over ? `LET GO TO INVITE ${team.num}` : 'DRAG IT UP TO YOUR ROBOT TO INVITE', drag.over ? C.yel2 : C.blue3);
    } else hintLine(hint, thought);
    lifted(team, drag.i, drag, t);
  } else hintLine(hint, thought);
  drawHud({ glow });
}

/** "5026 RESPECTFULLY INVITES TEAM 6834..." over the tablet, with INVITE and BACK. choice: 0 INVITE, 1 BACK. */
export function drawConfirm(team, choice, k, pressed = -1) {
  screen();
  withAlpha(0.75, () => fill(0, 35, W, H - 35, C.ink));
  const { x, y, w, h } = CONFIRM;
  fill(x, y, w, h, C.night1);
  frame(x - 1, y - 1, w + 2, h + 2, C.ink);
  frame(x, y, w, h, C.yel1, 2);
  text(`${OURS} RESPECTFULLY INVITES`, W / 2, y + 9, { align: 'center', color: C.white });
  text(`TEAM ${team.num}`, W / 2, y + 21, { scale: 2, align: 'center', color: C.yel2, outline: C.ink });
  ['INVITE', 'BACK'].forEach((label, i) => {
    const { x: bx, y: by0, w: bw, h: bh } = buttonRect(i), on = i === choice;
    // Held down under a finger, it's pushed in: a pixel lower, in its darker yellow, no blink.
    const down = i === pressed, by = by0 + (down ? 1 : 0);
    if (on) {
      fill(bx, by, bw, bh, down ? C.yel0 : k % 0.9 < 0.6 ? C.yel1 : C.yel2);
      frame(bx - 1, by - 1, bw + 2, bh + 2, C.ink);
    } else frame(bx, by, bw, bh, C.steel2);
    text(label, bx + bw / 2, by + 4, { align: 'center', color: on ? (down ? C.white : C.ink) : C.steel3 });
  });
}

/** "6834 ACCEPTS!": the card she picked, a burst of confetti. */
export function drawAccept(team, t) {
  screen();
  withAlpha(0.8, () => fill(0, 35, W, H - 35, C.ink));
  const colors = [C.yel1, C.blue2, C.white, C.red2, C.yel2];
  for (let i = 0; i < 60; i++) {
    const x = Math.round(rnd(i) * W), y = Math.round(36 + ((rnd(i + 99) * 40 + t * (30 + rnd(i + 7) * 40)) % (H - 36)));
    fill(x, y, 2, 2, colors[i % colors.length]);
  }
  const pop = t < 0.1;
  fill(36, 54, W - 72, 46, pop ? C.white : C.night2);
  frame(36, 54, W - 72, 46, C.yel1, 2);
  text(team.num, W / 2, 62, { scale: 2, align: 'center', color: C.yel2, outline: C.ink });
  text('ACCEPTS!', W / 2, 81, { scale: 2, align: 'center', color: C.white, outline: C.ink });
}

/** The stamp: a box with a tick or a cross, and the word beside it, slammed in at t = 0. */
function stamp(good, t, y) {
  const word = good ? 'GOOD CALL' : 'BAD CALL', c = good ? GOOD : C.red2, c0 = good ? GOOD0 : C.red0;
  const box = 26, ww = measure(word, { scale: 2 }), total = box + 8 + ww;
  const shake = t > 0.1 && t < 0.3 ? (Math.floor(t * 40) % 2 ? 1 : -1) : 0;
  const x = Math.round(W / 2 - total / 2) + shake;
  if (t < 0.1) {
    fill(x - 6, y - 6, box + 12, box + 12, C.white);
    return;
  }
  fill(x, y, box, box, c0);
  frame(x, y, box, box, c, 2);
  if (good) {
    stroke(x + 5, y + 13, x + 10, y + 18, 3, C.white);
    stroke(x + 10, y + 18, x + 19, y + 6, 3, C.white);
  } else {
    stroke(x + 6, y + 6, x + 17, y + 17, 3, C.white);
    stroke(x + 17, y + 6, x + 6, y + 17, 3, C.white);
  }
  text(word, x + box + 8, y + 6, { scale: 2, color: c, outline: C.ink });
}

/** The last four boxes lighting up one after another from `from` seconds in: 0 to 1. */
const lighting = (t, from) => clamp((t - from) / 0.9, 0, 1);
const FADE = [C.red1, C.red2], RISE = [GOOD0, GOOD];
/** A blink for "A: ..." lines once they're there. */
const prompt = (str, y, t, at) => {
  if (t < at || (t - at) % 1 > 0.7) return;
  const w = measure(str) + 14;
  fill(W / 2 - w / 2, y - 4, w, 15, C.night2);
  frame(W / 2 - w / 2, y - 4, w, 15, C.yel1);
  text(str, W / 2, y, { align: 'center', color: C.yel2 });
};

/**
 * The bet log after the pick: PICK 1, the stamp, and the reveal: the last four boxes lighting up. A wrong pick (7461):
 * its ten matches, the last four in red, and FIRST 6 44 · LAST 4 29. The right one (6834): its ten matches, the last
 * four in green, over 7461's in red, and LAST 4 48 · 29. Then the one line to remember, and A to rewind or carry on.
 */
export function drawResult(team, good, t, { glow = 0 } = {}) {
  screen();
  fill(0, 0, W, H, C.night0);
  dither(0, 120, W, 4, C.night0, C.night1);
  fill(0, 124, W, H - 124, C.night1);
  text('BET LOG', W / 2, 4, { font: 3, align: 'center', color: C.steel2 });
  text(`PICK 1: ${team.num}`, W / 2, 11, { align: 'center', color: C.white });
  stamp(good, t, 23);
  const lastK = lighting(t, 0.6);
  if (!good) {
    const o = { w: 15, h: 15, gap: 2, split: 6, font: 5 };
    const sw = 10 * o.w + 9 * o.gap + o.split, sx = Math.round(W / 2 - sw / 2);
    drawStrip(FADING.scores, sx, 58, { ...o, last: FADE, lastK });
    if (t > 1.6) {
      line([['FIRST 6', C.blue3], [String(earlyOf(FADING)), C.yel1], ['·', C.steel2], [`LAST ${RECENT}`, C.red3], [String(recentOf(FADING)), C.red2]], W / 2, 79);
    }
  } else {
    const o = { w: 12, h: 11, gap: 1, split: 4, font: 3 };
    const sw = 10 * o.w + 9 * o.gap + o.split, lw = measure('0000') + 6, sx = Math.round(W / 2 - (sw + lw) / 2) + lw;
    text(RISING.num, sx - lw, 60, { color: GOOD });
    drawStrip(RISING.scores, sx, 58, { ...o, last: RISE, lastK });
    text(FADING.num, sx - lw, 74, { color: C.steel2 });
    drawStrip(FADING.scores, sx, 72, { ...o, last: FADE, lastK });
    if (t > 1.6) {
      line([[`LAST ${RECENT}`, C.steel3], [RISING.num, GOOD], [String(recentOf(RISING)), GOOD], ['·', C.steel2], [FADING.num, C.red3], [String(recentOf(FADING)), C.red2]], W / 2, 88, { font: 3 });
    }
  }
  if (t > 1.6) text(WHY, W / 2, 95, { font: 3, align: 'center', color: C.steel3 });
  if (t > 2.0) text(LESSON, W / 2, 104, { align: 'center', color: C.yel2, outline: C.ink });
  prompt(good ? 'A: CONTINUE' : 'A: REWIND', 130, t, 2.4);
  drawHud({ glow });
}

/** The tape running back: dark blue over the tablet, tracking lines rolling up, ◀◀ REWIND. k: 0 to 1. */
export function drawRewind(k, t) {
  screen();
  withAlpha(0.45, () => fill(0, 35, W, H - 35, C.night1));
  for (let i = 0; i < 3; i++) {
    const y = Math.round(H - ((t * 160 + i * 53) % (H - 32)));
    withAlpha(0.5, () => fill(0, y, W, 1, C.blue3));
    withAlpha(0.3, () => fill(0, y + 1, W, 3, C.blue1));
  }
  if (k % 0.5 < 0.35) {
    const label = 'REWIND', lw = measure(label, { scale: 2 }), x = W / 2 - (lw + 20) / 2;
    fill(x - 6, 74, lw + 32, 22, C.ink);
    for (let a = 0; a < 2; a++) for (let i = 0; i < 6; i++) fill(x + a * 7 + i, 85 - i, 1, 1 + 2 * i, C.white);
    text(label, x + 20, 78, { scale: 2, color: C.white });
  }
}

/** The end of the built part: the right pick's reward is the quarterfinals, which aren't built yet. */
export function drawContinued(t) {
  screen();
  fill(0, 0, W, H, C.night0);
  dither(0, 96, W, 6, C.night0, C.night1);
  fill(0, 102, W, H - 102, C.night1);
  text('NEXT: THE QUARTERFINALS', W / 2, 44, { font: 3, align: 'center', color: C.blue3 });
  const dots = '...'.slice(0, Math.min(3, Math.floor(t * 2)));
  const x = Math.round(W / 2 - measure('TO BE CONTINUED...', { scale: 2 }) / 2);
  text(`TO BE CONTINUED${dots}`, x, 56, { scale: 2, color: C.white, outline: C.ink });
  text(`BET LOG: PICK 1`, W / 2 - 8, 116, { font: 3, align: 'center', color: C.steel2 });
  stroke(W / 2 + 26, 116, W / 2 + 28, 118, 2, GOOD);
  stroke(W / 2 + 28, 118, W / 2 + 33, 112, 2, GOOD);
  drawHud();
}
