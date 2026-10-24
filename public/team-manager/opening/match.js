// The quarterfinal on the big screen (256x144): pictures of one moment each, as tablet.js's are for the pick.
// quarter.js says what to draw and when; series.js has the matches.
//
//   drawSeriesCard(t)                      QUARTERFINAL, best 2 of 3: the two alliances side by side, the series so far
//   drawMatch(g, i, at, t, o)              match i on the field, `at` seconds into it (t: since it started showing)
//   drawMatchOver(g, i, t, wins, camX)     its result over its last moment: RED WINS 100-86, and the series
//   drawFrozen(g, t, o)                    match 3 stopped at 0:20, the field gone dark
//   drawCall(g, v)                         the call: LEVEL 2 or LEVEL 3, over the frozen field
//   callRect(i)                            where the call's two cards are, for taps
//   drawEndgame(g, roll, at, camX)         match 3's last 20 seconds, played out the way the call and the dice went
//   endgameTimes(roll)                     when each climber settles
//   drawBuzzer(g, t, o)                    the end of match 3: the final score and the series won or lost
//   cameraOn(match, at, num)               where the camera wants to be: on robot num, or on the action
//
// Every match is the simulation's (../match/sim.js), drawn by the match lab's draw.js: the arena's field with the stands
// behind it, the robots where the simulation puts them, each piece going into its port as the scoreboard ticks. Blue's
// on the left, red's on the right, as on the scoreboard.

import { W, H, C, screen, fill, text, measure, withAlpha, dither, clamp, lerp, seg, easeOut } from '../pixel.js';
import { WORLD_W } from '../field.js';
import { makeShow } from '../match/animate.js';
import { drawMatch as drawField, cameraFor, frameAt, wx } from '../match/draw.js';
import { drawHud } from './norbert-held.js';
import { blinkPrompt } from './tablet.js';
import { drawGoalLine } from './goals.js';
import { US, OPPONENT } from './teams2.js';
import {
  RED, BLUE, MATCHES, LEFT, LEAD, FREEZE, CALLS, THEIRS, CLIMBER, THEIR_CLIMBER, matchOf,
} from './series.js';

/** What each robot does on the field, for the series card. */
const ROLE = { [RED[0]]: 'HATCH', 6834: 'CARGO', 4471: 'DEFENSE', 7777: 'CARGO', 6417: 'CARGO', 7311: 'HATCH' };
/** A climb made, in the call's boxes: the bet log's green. */
const MADE = '#3fd06a';
/** A match is 2:30. */
const MATCH_SECS = 150;

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

/** Each match made into something to draw (animate.js), once. */
const shows = new WeakMap();
const showOf = (match) => {
  if (!shows.has(match)) shows.set(match, makeShow(match));
  return shows.get(match);
};
/** The field at `at` seconds into a match, the camera at camX; no scoreboard (each screen draws its own). */
const field = (g, match, at, camX, o = {}) => drawField(g, showOf(match), at, { camX, board: false, ...o });

/** Where the camera wants to be at `at` seconds into a match: on robot num if given, otherwise on the action. */
export function cameraOn(match, at, num = null) {
  if (!num) return cameraFor(showOf(match), at);
  const p = frameAt(showOf(match), at).robots.find((r) => r.num === num);
  return clamp(Math.round(wx(p.x) - W / 2), 0, WORLD_W - W);
}

/**
 * Match i, `at` seconds into it (t: seconds since it started showing, for the slam). o: camX, wins (the series before
 * it). Match 2's line turns red the moment 6834 dies.
 */
export function drawMatch(g, i, at, t, o = {}) {
  const m = MATCHES[i], f = field(g, matchOf(i), at, o.camX);
  drawScoreboard(f.score.blue, f.score.red, MATCH_SECS - at, { label: `QUARTERFINAL - MATCH ${i + 1}`, wins: o.wins, late: MATCH_SECS - at <= 30 });
  if (t > 1) caption(m.late && at >= m.lateAt ? m.late : m.line, m.late && at >= m.lateAt ? C.red2 : C.white);
  if (t < 1) slam(`MATCH ${i + 1}`, i === 2 ? 'WINNER TAKES THE SERIES' : null, t, C.yel1);
  drawHud();
}

/** Match i's result over its last moment. wins: the series after it. */
export function drawMatchOver(g, i, t, wins, camX) {
  const m = MATCHES[i], ours = m.red > m.blue;
  field(g, matchOf(i), MATCH_SECS, camX, { cheer: ours ? 1 : 0 });
  screen();
  withAlpha(0.35, () => fill(0, 0, W, H, C.night0));
  drawScoreboard(m.blue, m.red, 0, { label: `QUARTERFINAL - MATCH ${i + 1}`, wins, late: true });
  slam(ours ? 'RED WINS!' : 'BLUE WINS', `${Math.max(m.red, m.blue)}-${Math.min(m.red, m.blue)}`, t, ours ? C.red2 : C.blue2, 52);
  if (t > 0.6) caption(m.after, ours ? C.yel2 : C.steel3);
  blinkPrompt(i === 0 ? 'A: MATCH 2' : 'A: MATCH 3', 116, t, 1.2);
  drawHud();
}

/** Match 3 stopped at 0:20: a flash, then the field darkening. o: camX, talking, glow. */
export function drawFrozen(g, t, o = {}) {
  const m = MATCHES[2];
  field(g, matchOf(2), FREEZE, o.camX);
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
 * thought (her thought after a rewind, in the hint line's place), glow (Norbert's ear), camX }.
 */
export function drawCall(g, v) {
  const m = MATCHES[2];
  field(g, matchOf(2), FREEZE, v.camX);
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

// ---- The last 20 seconds ----
/** When each climber settles in a played-out match 3 (its climb's points go on the board then). */
export function endgameTimes(roll) {
  const when = (num) => roll.match.events.find((e) => e.by === num && e.kind === 'hab' && e.t > FREEZE)?.t ?? MATCH_SECS;
  return { ours: when(CLIMBER), theirs: when(THEIR_CLIMBER) };
}

/**
 * Match 3's last 20 seconds as the call and the dice played them out, `at` seconds into the match, the camera at camX
 * (quarter.js follows 6834 to its climb, then pans over to 6417's). Under it, what each climber is doing and how it went.
 */
export function drawEndgame(g, roll, at, camX) {
  const f = field(g, roll.match, at, camX), when = endgameTimes(roll);
  drawScoreboard(f.score.blue, f.score.red, MATCH_SECS - at, { label: 'QUARTERFINAL - MATCH 3', late: true });
  const ours = CALLS.find((c) => c.key === roll.key);
  if (at < when.ours) caption(`${CLIMBER} GOES FOR ${ours.name}`, C.red3);
  else if (at < when.ours + 1.6) {
    caption(roll.made ? `${CLIMBER}: ${ours.name}! +${ours.pts}` : `${CLIMBER} SLIPS. LEVEL 1, +${ours.fail}`, roll.made ? C.yel2 : C.steel3);
  } else if (at < when.theirs) caption(`${THEIR_CLIMBER} GOES FOR ${THEIRS.name}`, C.blue3);
  else caption(roll.theirsMade ? `${THEIR_CLIMBER}: ${THEIRS.name}! +${THEIRS.pts}` : `${THEIR_CLIMBER} SLIPS. LEVEL 1, +${THEIRS.fail}`, roll.theirsMade ? C.steel3 : C.yel2);
  drawHud();
}

/** The buzzer: match 3's final score, and the series won or lost. */
export function drawBuzzer(g, t, { roll, wins, camX }) {
  const { red, blue, won } = roll;
  field(g, roll.match, MATCH_SECS, camX, { cheer: won ? 1 : 0 });
  screen();
  withAlpha(0.35, () => fill(0, 0, W, H, C.night0));
  drawScoreboard(blue, red, 0, { label: 'QUARTERFINAL - MATCH 3', wins, late: true });
  slam(won ? 'RED WINS!' : 'BLUE WINS', `${Math.max(red, blue)}-${Math.min(red, blue)}`, t, won ? C.red2 : C.blue2, 52);
  if (t > 0.6) caption(won ? `ALLIANCE ${US} TAKES THE SERIES 2-1` : `ALLIANCE ${US} IS OUT, 1-2`, won ? C.yel2 : C.steel3);
  blinkPrompt('A: BET LOG', 116, t, 1.4);
  drawHud();
}
