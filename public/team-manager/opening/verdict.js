// The second pick's bet log, and the end of what's built, on the big screen (256x144). Pictures of one moment, like
// tablet.js's; second.js says what to draw.
//
// The bet log for PICK 2 is laid out like PICK 1's (tablet.js drawResult): BET LOG, the pick, the stamp (GOOD CALL or
// BAD CALL), one picture and one line to remember. The picture is the quarterfinal as the scouting app adds it up:
// two bars, her alliance (red: alliance 4 is the higher seed, so it's the red alliance) and alliance 5 (blue), each
// robot a block as long as its average, a point and a half a point, its number in it. The block for her pick lights up
// in yellow. With 4471 the blue bar's 7777 block shrinks from 46 to 22 as the picture comes in, and the bar with it,
// the 24 it loses left past the bar's end as a dotted outline: that's what a defender does. The totals stand at the end of each bar, then the line under it:
//
//   2202   105 TO 102: A COIN FLIP. NOBODY STOPS 7777.
//   5518   98 TO 102 IF THE CLIMB WORKS. NOBODY STOPS 7777.
//   4471   92 TO 78. 4471 TAKES 24 OFF THEIR TOP SCORER.
//
//   PICK FOR THE MATCHUP, NOT THE LIST.
//
// The end: her goal card, the second line's tick stamped on, TO BE CONTINUED, and what's next: the quarterfinal, best 2
// of 3 against alliance 5.
//
//   drawResult2(team, good, t, { glow })   the bet log, t seconds in
//   drawEnd(t, picked)                     the end, t seconds in
//   LESSON2                                the line to remember

import { W, H, C, screen, fill, text, measure, dither, clamp, easeOut, seg } from '../pixel.js';
import { drawHud } from './norbert-held.js';
import { stampCall, blinkPrompt } from './tablet.js';
import { drawGoalCard, tick, GOAL_W } from './goals.js';
import { matchup, RIGHT2, STAR, HELD, OPPONENT } from './teams2.js';

export const LESSON2 = 'PICK FOR THE MATCHUP, NOT THE LIST.';
const GOOD = '#3fd06a';
/** A point is this many pixels along a bar. */
const PX = 1.5;

/** Each block's colours, by side: lit edge, fill, and the pick's own. */
const SIDE = { us: [C.red2, C.red1], them: [C.blue2, C.blue1] };

/**
 * One bar: blocks of [num, pts, was] from x, at y, 11 rows tall, side by side. pick: the number to light up. k (0 to
 * 1): how far a defended block has shrunk from `was` (its average) to its points; the bar's lost length is left past
 * its end as a dotted outline, so the bar is seen to get shorter. Returns where the bar (and that outline) ends.
 */
function bar(blocks, x, y, side, pick, k) {
  let bx = x, lost = 0;
  const [lit, mid] = SIDE[side];
  for (const [num, pts, was = pts] of blocks) {
    const w = Math.round((was + (pts - was) * k) * PX), mine = num === pick;
    lost += Math.round(was * PX) - w;
    fill(bx, y, w, 11, C.ink);
    fill(bx + 1, y + 1, w - 2, 9, mine ? C.yel1 : mid);
    fill(bx + 1, y + 1, w - 2, 1, mine ? C.yel2 : lit);
    if (w >= 18) text(num, bx + Math.floor(w / 2), y + 3, { font: 3, align: 'center', color: mine ? C.ink : C.white });
    bx += w + 1;
  }
  if (lost > 1) {
    for (let i = 0; i < lost; i += 2) {
      fill(bx + i, y, 1, 1, C.steel2);
      fill(bx + i, y + 10, 1, 1, C.steel2);
    }
    for (let j = 0; j < 11; j += 2) fill(bx + lost - 1, y + j, 1, 1, C.steel2);
  }
  return bx + Math.max(0, lost);
}

/** The bet log after the second pick. */
export function drawResult2(team, good, t, { glow = 0 } = {}) {
  screen();
  fill(0, 0, W, H, C.night0);
  dither(0, 120, W, 4, C.night0, C.night1);
  fill(0, 124, W, H - 124, C.night1);
  text('BET LOG', W / 2, 4, { font: 3, align: 'center', color: C.steel2 });
  text(`PICK 2: ${team.num}`, W / 2, 11, { align: 'center', color: C.white });
  stampCall(good, t, 23);

  const m = matchup(team.num), x0 = 30;
  const k = team.num === RIGHT2 ? easeOut(seg(t, 0.9, 1.6)) : 1;
  if (t > 0.5) {
    text('US', x0 - 4, 57, { align: 'right', color: C.red3 });
    const ue = bar(m.us, x0, 55, 'us', team.num, 1);
    text(`A${OPPONENT}`, x0 - 4, 71, { align: 'right', color: C.blue3 });
    const te = bar(m.them, x0, 69, 'them', team.num, k);
    if (t > 1.6) {
      text(String(m.usSum), ue + 4, 57, { color: C.white });
      text(String(m.themSum), te + 4, 71, { color: C.white });
      if (team.num === RIGHT2) text(`${STAR} HELD TO ${HELD}`, x0, 82, { font: 3, color: C.yel2 });
    }
  }
  if (t > 1.6) {
    const say = team.num === RIGHT2 ? `${m.usSum} TO ${m.themSum}. ${team.num} TAKES ${m.them[0][2] - HELD} OFF THEIR TOP SCORER.`
      : m.usSum > m.themSum ? `${m.usSum} TO ${m.themSum}: A COIN FLIP. NOBODY STOPS ${STAR}.`
        : `${m.usSum} TO ${m.themSum} IF THE CLIMB WORKS. NOBODY STOPS ${STAR}.`;
    text(say, W / 2, 93, { font: 3, align: 'center', color: C.steel3 });
  }
  if (t > 2.0) text(LESSON2, W / 2, 104, { align: 'center', color: C.yel2, outline: C.ink });
  blinkPrompt(good ? 'A: CONTINUE' : 'A: REWIND', 130, t, 2.4);
  drawHud({ glow });
}

/** The end of what's built: the goal card with two ticks, TO BE CONTINUED, and what's next. */
export function drawEnd(t, picked) {
  screen();
  fill(0, 0, W, H, C.night0);
  dither(0, 112, W, 6, C.night0, C.night1);
  fill(0, 118, W, H - 118, C.night1);
  const slide = easeOut(clamp(t / 0.5, 0, 1));
  drawGoalCard(Math.round((W - GOAL_W) / 2), Math.round(-70 + 94 * slide), { done: 2, picked, tickAt: 0.7, t, next: false });
  if (t > 1.4) {
    text(`NEXT: THE QUARTERFINAL - BEST 2 OF 3 VS ALLIANCE ${OPPONENT}`, W / 2, 98, { font: 3, align: 'center', color: C.blue3 });
    const dots = '...'.slice(0, Math.min(3, Math.floor((t - 1.4) * 2)));
    const x = Math.round(W / 2 - measure('TO BE CONTINUED...', { scale: 2 }) / 2);
    text(`TO BE CONTINUED${dots}`, x, 106, { scale: 2, color: C.white, outline: C.ink });
  }
  if (t > 2) {
    const s = 'BET LOG: PICK 1', s2 = 'PICK 2', w1 = measure(s, { font: 3 }), w2 = measure(s2, { font: 3 });
    const total = w1 + 8 + w2 + 8, x = Math.round(W / 2 - total / 2);
    text(s, x, 132, { font: 3, color: C.steel2 });
    tick(x + w1 + 2, 132, 5, GOOD);
    text(s2, x + w1 + 10, 132, { font: 3, color: C.steel2 });
    tick(x + w1 + 12 + w2, 132, 5, GOOD);
  }
  drawHud();
}
