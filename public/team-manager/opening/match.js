// The quarterfinal on the big screen (256x144): pictures of one moment each, as tablet.js's are for the pick.
// quarter.js says what to draw and when; series.js has the numbers.
//
//   drawSeriesCard(t)                      QUARTERFINAL, best 2 of 3: the two alliances side by side, the series so far
//   drawMatch(g, i, k, t, o)               match i on the field, k (0 to 1) of the way through what's shown of it
//   drawMatchOver(i, t, wins)              its result over the field: RED WINS 88-74, and the series
//   drawFrozen(g, t, o)                    match 3 stopped at 0:20, the field gone dark
//   drawCall(v)                            the call: LEVEL 2 or LEVEL 3, over the frozen field
//   callRect(i)                            where the call's two cards are, for taps
//   drawClimb(g, who, key, made, t)        a climber on its HAB, close up (the intro's shot): ours (red) or theirs
//   climbTime(who, key, made)              how long that climb takes to show
//   drawBuzzer(g, o)                       the end of match 3: the final score and the series won or lost
//
// The field is the arena's (field.js) with the stands behind it (bleachers.js), the robots running their cycles with
// this series' numbers on them. Blue's on the left, red's on the right, as on the scoreboard. The climb shot is the
// intro's: the HAB from the side at twice the size, the robot lifting itself on its stilts (sprites.js).

import { W, H, C, screen, camera, fill, rect, text, measure, withAlpha, dither, clamp, lerp, seg, easeOut, easeIn, easeInOut } from '../pixel.js';
import { FIELD, makeFloor, drawFieldLive } from '../field.js';
import { drawStands, drawWalkway } from '../bleachers.js';
import { eleBot, hab, HAB, arena, makeStands, makeCarpet, makeSky, sky } from '../sprites.js';
import { drawHud } from './norbert-held.js';
import { blinkPrompt } from './tablet.js';
import { drawGoalLine } from './goals.js';
import { US, OPPONENT } from './teams2.js';
import { RED, BLUE, MATCHES, LEFT, LEAD, CALLS, THEIRS, CLIMBER, THEIR_CLIMBER } from './series.js';

/** What each robot does on the field, for the series card. */
const ROLE = { [RED[0]]: 'HATCH', 6834: 'CARGO', 4471: 'DEFENSE', 7777: 'CARGO', 6417: 'CARGO', 7311: 'HATCH' };
/** The numbers on field.js's four robots: the blue elevator, the red elevator, the blue arm, the red defender. */
const FIELD_TEAMS = [THEIR_CLIMBER, CLIMBER, BLUE[0], RED[2]];
/** A climb made, in the call's boxes: the bet log's green. */
const MADE = '#3fd06a';
/** A match is 2:30. */
const MATCH_SECS = 150;

let FLOOR = null, SKY = null, STANDS = null, CARPET = null;
function art() {
  if (FLOOR) return;
  FLOOR = makeFloor();
  SKY = makeSky();
  STANDS = [makeStands(0), makeStands(1)];
  CARPET = makeCarpet();
}

// ---- Bits shared by the screens ----

/** The series as pips either side of the word SERIES centred on cx: a lit one for each match won, blue's left, red's right. */
function pips(cx, y, wins) {
  const half = Math.ceil(measure('SERIES', { font: 3 }) / 2) + 4;
  withAlpha(0.8, () => fill(cx - half - 16, y - 2, 2 * half + 32, 9, C.ink));
  [['blue', -1], ['red', 1]].forEach(([side, s]) => {
    for (let i = 0; i < 2; i++) {
      const x = s > 0 ? cx + half + i * 7 : cx - half - 5 - i * 7, on = i < wins[side];
      fill(x, y, 5, 5, C.ink);
      fill(x + 1, y + 1, 3, 3, on ? (side === 'red' ? C.red2 : C.blue2) : C.night2);
    }
  });
  text('SERIES', cx, y, { font: 3, align: 'center', color: C.steel2 });
}

/** The clock as a match runs: whole seconds, never below 0. */
const clockText = (secs) => {
  const s = Math.max(0, Math.ceil(secs - 1e-6));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** The scoreboard at the top: blue's score, the match clock, red's; the match under it, then the series. */
export function drawScoreboard(blue, red, secs, { label = '', wins = null, late = false } = {}) {
  screen();
  const x = 78, y = 3;
  fill(x - 1, y - 1, 102, 15, C.ink);
  fill(x, y, 34, 13, C.blue1);
  fill(x, y, 34, 1, C.blue2);
  fill(x + 66, y, 34, 13, C.red1);
  fill(x + 66, y, 34, 1, C.red2);
  text(String(blue), x + 17, y + 3, { align: 'center' });
  text(String(red), x + 83, y + 3, { align: 'center' });
  text(clockText(secs), x + 50, y + 3, { align: 'center', color: late ? C.red2 : C.yel2 });
  if (label) {
    const w = measure(label, { font: 3 }) + 6;
    fill(W / 2 - w / 2 - 1, y + 14, w + 2, 8, C.ink);
    text(label, W / 2, y + 16, { font: 3, align: 'center', color: C.steel3 });
  }
  if (wins) pips(W / 2, y + 25, wins);
}

/** A caption on a dark band along the bottom. */
function caption(words, color = C.white, y = 130) {
  screen();
  withAlpha(0.8, () => fill(0, y - 3, W, H - y + 3, C.ink));
  fill(0, y - 4, W, 1, C.night3);
  text(words, W / 2, y, { font: 3, align: 'center', color });
}

/** A big word slammed in at the middle, with a line under it: MATCH 1, RED WINS. */
function slam(word, sub, t, color, y = 50) {
  screen();
  const k = easeOut(seg(t, 0, 0.18)), scale = 2;
  const w = measure(word, { scale }), x = Math.round(W / 2 - w / 2);
  const band = Math.round(16 * k);
  fill(0, y + 7 - band, W, band * 2, C.ink);
  fill(0, y + 7 - band, W, 1, color);
  fill(0, y + 6 + band, W, 1, color);
  if (k >= 1) text(word, x, y, { scale, color: C.white, outline: C.ink });
  if (sub && t > 0.3) text(sub, W / 2, y + 26, { font: 3, align: 'center', color: C.yel2, outline: C.ink });
}

// ---- The series card ----
export function drawSeriesCard(t, wins = { red: 0, blue: 0 }) {
  screen();
  fill(0, 0, W, H, C.night0);
  dither(0, 112, W, 6, C.night0, C.night1);
  fill(0, 118, W, H - 118, C.night1);
  drawGoalLine(W / 2, 3, { done: 2, t });
  const k = easeOut(seg(t, 0, 0.4));
  text('QUARTERFINAL', W / 2, Math.round(lerp(-20, 18, k)), { scale: 2, align: 'center', color: C.white, outline: C.ink });
  text('BEST 2 OF 3', W / 2, 36, { align: 'center', color: C.yel2 });
  // The two alliances: blue on the left, red (hers) on the right.
  const panel = (x, side, title, nums, from) => {
    const s = easeOut(seg(t, from, from + 0.35)), y = Math.round(lerp(150, 50, s));
    const [c0, c1, c2] = side === 'red' ? [C.red0, C.red1, C.red2] : [C.blue0, C.blue1, C.blue2];
    fill(x - 1, y - 1, 92, 56, C.ink);
    fill(x, y, 90, 54, c0);
    fill(x, y, 90, 11, c1);
    fill(x, y, 90, 1, c2);
    text(title, x + 45, y + 3, { font: 3, align: 'center', color: C.white });
    nums.forEach((n, i) => {
      text(n, x + 8, y + 16 + i * 12, { color: C.white });
      text(ROLE[n] ?? '', x + 82, y + 18 + i * 12, { font: 3, align: 'right', color: C.steel3 });
    });
  };
  panel(22, 'blue', `ALLIANCE ${OPPONENT}`, BLUE, 0.3);
  panel(144, 'red', `ALLIANCE ${US}: US`, RED, 0.45);
  if (t > 0.8) text('VS', W / 2, 72, { align: 'center', color: C.yel1 });
  if (t > 0.9) pips(W / 2, 112, wins);
  blinkPrompt('A: MATCH 1', 130, t, 1.2);
  drawHud();
}

// ---- The field ----

/** The arena at camX, its robots t seconds into their cycles. score: [blue, red] on the scoring table. */
function field(g, camX, t, score, cheer = false) {
  art();
  g.drawImage(FLOOR, -camX, 0);
  drawStands(g, camX, t, null, { cheer });
  drawWalkway(g, camX);
  drawFieldLive(g, camX, t, { teams: FIELD_TEAMS, score });
}
/** Where the camera is, k of the way through a match's montage: along the field and back a little. */
const camAt = (k) => Math.round(lerp(FIELD.x0 - 36, FIELD.x1 + 36 - W, easeInOut(clamp(k, 0, 1))));

/** The score as it climbs, k of the way to `to` (in steps, as points come in fives and threes). */
const scoreAt = (to, k, seed) => Math.min(to, Math.floor(to * clamp(k, 0, 1) ** (0.9 + 0.2 * seed) / 3) * 3);

/** The seconds on the clock k of the way through what's shown of match i (match 3 stops at 0:20). */
export const clockAt = (i, k) => MATCH_SECS - (MATCH_SECS - (i === 2 ? LEFT : 0)) * clamp(k, 0, 1);

/**
 * Match i, k of the way through what's shown of it (t: seconds since it started, for the slam). o.wins: the series
 * before it. The score climbs to its final (match 3: the score at 0:20), the camera runs along the field.
 */
export function drawMatch(g, i, k, t, o = {}) {
  const m = MATCHES[i], at = t * 1.6 + i * 40;
  const blue = scoreAt(m.blue, k, 0), red = scoreAt(m.red, k, 1);
  field(g, camAt(k), at, [blue, red], false);
  drawScoreboard(blue, red, clockAt(i, k), { label: `QUARTERFINAL - MATCH ${i + 1}`, wins: o.wins });
  if (t > 1) caption(m.line, i === 1 && k > 0.45 ? C.red2 : C.white);
  if (t < 1) slam(`MATCH ${i + 1}`, i === 2 ? 'WINNER TAKES THE SERIES' : null, t, C.yel1);
  drawHud();
}

/** Match i's result over its last frame. wins: the series after it. */
export function drawMatchOver(g, i, t, wins) {
  const m = MATCHES[i], ours = m.red > m.blue;
  field(g, camAt(1), 1.6 * 4 + i * 40, [m.blue, m.red], ours);
  screen();
  withAlpha(0.35, () => fill(0, 0, W, H, C.night0));
  drawScoreboard(m.blue, m.red, 0, { label: `QUARTERFINAL - MATCH ${i + 1}`, wins, late: true });
  slam(ours ? 'RED WINS!' : 'BLUE WINS', `${Math.max(m.red, m.blue)}-${Math.min(m.red, m.blue)}`, t, ours ? C.red2 : C.blue2, 52);
  if (t > 0.6) caption(m.after, ours ? C.yel2 : C.steel3);
  blinkPrompt(i === 0 ? 'A: MATCH 2' : 'A: MATCH 3', 116, t, 1.2);
  drawHud();
}

/** Match 3 stopped at 0:20: a flash, then the field darkening. */
export function drawFrozen(g, t, o = {}) {
  const m = MATCHES[2];
  field(g, camAt(1), 1.6 * 4 + 80, [m.blue, m.red]);
  screen();
  withAlpha(clamp(t / 0.5, 0, 1) * 0.7, () => fill(0, 0, W, H, C.night0));
  if (t < 0.08) withAlpha(0.8, () => fill(0, 0, W, H, C.white));
  drawScoreboard(m.blue, m.red, LEFT, { label: 'QUARTERFINAL - MATCH 3', late: true });
  if (!o.talking && t > 0.3) {
    const w = 'TIME STOPS AT 0:20';
    text(w, W / 2, 56, { scale: 1, align: 'center', color: C.yel2, outline: C.ink });
  }
  drawHud({ glow: o.glow ?? 0 });
}

// ---- The call ----
const CARD = { w: 104, h: 52, y: 44, gap: 12 };
export function callRect(i) {
  const x0 = Math.round(W / 2 - CARD.w - CARD.gap / 2);
  return { x: x0 + i * (CARD.w + CARD.gap), y: CARD.y, w: CARD.w, h: CARD.h };
}

/**
 * The call over the frozen field. v: { t, choice (the card the cursor's on), pressed (the card under a finger, or -1),
 * thought (her thought after a rewind, in the hint line's place), glow (Norbert's ear), wins }.
 */
export function drawCall(g, v) {
  const m = MATCHES[2];
  field(g, camAt(1), 1.6 * 4 + 80, [m.blue, m.red]);
  screen();
  withAlpha(0.78, () => fill(0, 0, W, H, C.night0));
  drawScoreboard(m.blue, m.red, LEFT, { label: 'QUARTERFINAL - MATCH 3', late: true });
  text(`0:${LEFT} LEFT. WE'RE UP ${LEAD}.`, W / 2, 33, { align: 'center', color: C.yel2, outline: C.ink });
  CALLS.forEach((c, i) => {
    const r = callRect(i), on = v.choice === i, down = v.pressed === i, dy = down ? 1 : 0;
    fill(r.x - 1, r.y - 1 + dy, r.w + 2, r.h + 2, on ? C.yel1 : C.ink);
    fill(r.x, r.y + dy, r.w, r.h, on ? C.night3 : C.night2);
    fill(r.x, r.y + dy, r.w, 1, on ? C.yel2 : C.night3);
    text(c.name, r.x + 6, r.y + 5 + dy, { color: C.white });
    text(`+${c.pts}`, r.x + r.w - 6, r.y + 3 + dy, { scale: 2, align: 'right', color: on ? C.yel2 : C.steel3 });
    text(`${CLIMBER} ${c.record}`, r.x + 6, r.y + 22 + dy, { font: 3, color: C.steel3 });
    text(c.note, r.x + 6, r.y + 31 + dy, { font: 3, color: c.odds >= 1 ? C.yel2 : C.red2 });
    // How often it's made, as ten boxes.
    for (let k = 0; k < 10; k++) {
      const made = k < Math.round(c.odds * 10);
      fill(r.x + 6 + k * 9, r.y + 41 + dy, 7, 6, C.ink);
      fill(r.x + 7 + k * 9, r.y + 42 + dy, 5, 4, made ? MADE : C.night1);
    }
  });
  // Blue's climber, under the cards.
  text(`BLUE: ${THEIR_CLIMBER} GOES FOR ${THEIRS.name}, +${THEIRS.pts}. ${THEIRS.record}.`, W / 2, 102, { font: 3, align: 'center', color: C.blue3 });
  text(`MISS: LEVEL 1, +${THEIRS.fail}.`, W / 2, 110, { font: 3, align: 'center', color: C.blue3 });
  // What she can hear: the crowd and 6834's driver, pushing for Level 3.
  const chant = Math.floor(v.t / 1.6) % 2 === 0 ? 'CROWD: LEVEL THREE! LEVEL THREE!' : `${CLIMBER}'S DRIVER: WE PRACTICED IT!`;
  const beat = (v.t % 0.8) < 0.1 ? 1 : 0;
  text(chant, W / 2, 120 - beat, { font: 3, align: 'center', color: C.org1 });
  if (v.thought) text(v.thought, W / 2, 132, { align: 'center', color: C.yel2, outline: C.ink });
  else {
    const hint = `TAP A CARD, OR A: CALL ${CALLS[v.choice].name}`;
    text(hint, W / 2, 133, { font: 3, align: 'center', color: Math.floor(v.t * 2) % 2 ? C.white : C.steel3 });
  }
  drawHud({ glow: v.glow ?? 0 });
}

// ---- The climb, close up ----
/** Seconds per beat of the intro's climb, which is in beats. */
const SPB = 0.5;
/**
 * Where the robot is b beats into its climb: x along the floor, lift (its body above level 1), its front and rear
 * stilts. key: 'l2' or 'l3'; made: whether it gets there. A missed Level 3: up on the stilts, the front wheels
 * over the platform's edge, then the rear stilts give and it drops back to level 1.
 */
function climbAt(b, key, made) {
  const top = key === 'l2' ? 5 : 14, up = key === 'l2' ? 6 : 16;
  let x, lift, front, rear;
  if (b < 1) [x, lift] = [lerp(50, 131, easeOut(seg(b, 0, 1))), 0];
  else if (b < 3) [x, lift] = [131, up * easeInOut(seg(b, 1, 3))];
  else if (!made) {
    // It edges forward, catches, and drops.
    if (b < 3.75) [x, lift] = [lerp(131, 138, easeInOut(seg(b, 3, 3.75))), up];
    else if (b < 4.1) [x, lift] = [138, up];
    else [x, lift] = [lerp(138, 124, easeOut(seg(b, 4.1, 4.6))), up * (1 - easeIn(seg(b, 4.1, 4.4)))];
    return { x, lift, front: lift, rear: lift, dropped: b >= 4.4, working: b > 1 && b < 4.1 };
  } else if (b < 3.75) [x, lift] = [lerp(131, 145, easeInOut(seg(b, 3, 3.75))), up];
  else if (b < 4.5) [x, lift] = [145, lerp(up, top, seg(b, 3.75, 4.5))];
  else if (b < 6) [x, lift] = [lerp(145, 156, easeInOut(seg(b, 4.5, 6))), top];
  else if (b < 6.75) [x, lift] = [156, top];
  else [x, lift] = [lerp(156, 170, easeInOut(seg(b, 6.75, 7.5))), top];
  front = b < 3.75 ? lift : lerp(up, 0, seg(b, 3.75, 4.5));
  rear = b < 6 ? lift : lerp(top, 0, seg(b, 6, 6.75));
  return { x, lift, front, rear, working: (b > 1 && b < 3) || (b > 3.75 && b < 4.5) || (b > 6 && b < 6.75) };
}
/** Beats until the climb's settled: made (on its level), or missed (back on level 1). */
const CLIMB_BEATS = (made) => (made ? 7.6 : 4.8);
/** How long (seconds) the climb takes to show, and when it's clear whether it worked (from the start). */
export const climbTime = (made) => CLIMB_BEATS(made) * SPB;
export const verdictAt = (made) => (made ? 7.5 : 4.4) * SPB;

/** Level 2's step, in front of level 3 (the two level 2 platforms are either side of it). */
function levelTwo(x3, T) {
  const top = -7, x = x3 - 2, w = 44;
  rect(x - 1, top - 1, w + 2, -top - 1, C.ink);
  rect(x, top, w, -top - 2, T[1]);
  rect(x, top, w, 1, C.steel3);
  rect(x, top + 1, w, 1, T[2]);
}

/**
 * The climb, close up: who ('ours': 6834 on red's HAB; 'theirs': 6417 on blue's), key ('l2' or 'l3'), made, and t
 * seconds into it. o: score [blue, red] to show, and the clock.
 */
export function drawClimb(g, who, key, made, t, o = {}) {
  art();
  const b = t / SPB, red = who === 'ours', T = red ? [C.red0, C.red1, C.red2, C.red3] : [C.blue0, C.blue1, C.blue2, C.blue3];
  const p = climbAt(b, key, made);
  const jit = p.working && Math.floor(t * 16) % 2 ? 0.5 : 0;
  const settled = b >= CLIMB_BEATS(made) - 0.1;
  const shakeY = !made && b > 4.35 && b < 4.7 ? (Math.floor(t * 30) % 2 ? 1 : -1) : 0;
  const camX = lerp(30, 94, easeOut(seg(b, 0, 1.2)));
  const camY = lerp(-64, key === 'l2' ? -68 : -72, easeInOut(seg(b, 1, 3)));
  camera(camX, camY + shakeY * 0.5, 2);
  sky(SKY, 30, t * 2);
  arena(STANDS[Math.floor(Math.max(0, t) * 4) % 2], CARPET);
  hab(150, { red, cheer: settled && (red ? made : made), t: t * 2, glow: settled && made ? Math.floor(t * 4) % 2 === 0 : false });
  if (key === 'l2') levelTwo(150, T);
  eleBot(p.x, HAB.l1, {
    team: red ? 'red' : 'blue', num: red ? CLIMBER : THEIR_CLIMBER,
    lift: p.lift + jit, front: p.front ? p.front + jit : 0, rear: p.rear ? p.rear + jit : 0, spin: p.x * 0.64, rsl: Math.floor(t * 2.5) % 2 === 0,
  });
  const [blue, redScore] = o.score ?? [MATCHES[2].blue, MATCHES[2].red];
  drawScoreboard(blue, redScore, o.clock ?? LEFT, { label: 'QUARTERFINAL - MATCH 3', late: true });
  const c = red ? CALLS.find((k) => k.key === key) : THEIRS;
  const name = red ? CLIMBER : THEIR_CLIMBER;
  if (b < 3) caption(`${name} GOES FOR ${c.name}`, red ? C.red3 : C.blue3);
  else if (b >= verdictAt(made) / SPB) {
    caption(made ? `${name}: ${c.name}! +${c.pts}` : `${name} SLIPS. LEVEL 1, +${c.fail}`, made === red ? C.yel2 : C.steel3);
  }
  drawHud();
}

/** The buzzer: match 3's final score, and the series won or lost. */
export function drawBuzzer(g, t, { red, blue, won, wins }) {
  field(g, camAt(1), 1.6 * 4 + 80 + t, [blue, red], won);
  screen();
  withAlpha(0.35, () => fill(0, 0, W, H, C.night0));
  drawScoreboard(blue, red, 0, { label: 'QUARTERFINAL - MATCH 3', wins, late: true });
  slam(won ? 'RED WINS!' : 'BLUE WINS', `${Math.max(red, blue)}-${Math.min(red, blue)}`, t, won ? C.red2 : C.blue2, 52);
  if (t > 0.6) caption(won ? `ALLIANCE ${US} TAKES THE SERIES 2-1` : `ALLIANCE ${US} IS OUT, 1-2`, won ? C.yel2 : C.steel3);
  blinkPrompt('A: BET LOG', 116, t, 1.4);
  drawHud();
}

