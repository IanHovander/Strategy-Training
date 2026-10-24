// The scouting tablet's dashboard for the second pick, drawn on the big screen (256x144). Like tablet.js, everything
// here is a picture of one moment: second.js keeps the state (the picks so far, the cursor, the phase, the clock) and
// hands drawDashboard a description of what's on screen.
//
// The screen, top to bottom and left to right:
//   the header      Norbert's corner on the left, the top right left clear for SKIP and NEXT SCENE. In the middle,
//                   while she waits: ALLIANCE SELECTION and which alliance is picking; on her turn: the 45-second clock,
//                   as at the first pick. Under it, the goal: a pill with the goal card's three marks (goals.js) and the
//                   line being worked on, GOAL: SECOND PICK TO BEAT ALLIANCE 5. A tap on it opens the card.
//   the PA line     a slim strip with a speaker in it: MC Robin's last call, typed out as she says it, with a flash of
//                   yellow as it starts ("ROBIN: ALLIANCE 6 PICKS 7461!"). Not a dialog box: nothing waits on it.
//   the alliances   on the left, eight rows: the seed, then captain, first pick, second pick, filling in as the picks
//                   land (each one flashes as it goes in; the empty cell being picked for blinks). Alliance 4's row is
//                   hers, in red, tagged US; alliance 5's is the quarterfinal's other side, tagged VS US.
//   the opponent    under them, alliance 5 as the scouting app knows it: each robot, what it scores with, its average.
//                   7777's 46 is marked BEST: the top scorer at the event. That's the clue.
//   her list        on the right, the teams still available as tiles, four to a row: number, average, and a stripe in
//                   its role's colour along the bottom. A team that's picked gets stamped TAKEN BY ALLIANCE n, then
//                   drops away, and the rest close up.
//   the card        under the tiles, the team the cursor's on: number, role, average, a note, its ten matches as a
//                   strip of boxes (Friday's seven, then Saturday's three, a little apart), and under it a line of data,
//                   with the matches it's about outlined in the strip (4471's Q23 on 7777; 5518's two Level 3 climbs).
//   the hint line   ◀ ▶ BROWSE and, on her turn, A: PICK; while she waits, WAIT FOR YOUR TURN.
//
//   drawDashboard(v)          the whole screen; v is second.js's description (look there for its fields)
//   tileRect(j)               the j-th tile's place on the list ({ x, y, w, h })
//   CARD2                     the card's place
//   GOAL_AT                   the goal pill's middle and top ({ cx, y })
//   hintRects2(turn)          the hint line's ◀ and ▶ and its A: PICK, for a finger
//   drawTaken(x, y, alliance, t)   the TAKEN stamp, centred on (x, y), t seconds since it came down

import { W, H, C, screen, fill, text, measure, withAlpha, stepped, clamp } from '../pixel.js';
import { drawHud } from './norbert-held.js';
import { clockText, PICK_CLOCK } from './tablet.js';
import { drawGoalLine } from './goals.js';
import { US, OPPONENT, ROLES, STAR, avg } from './teams2.js';
import { FRIDAY, OURS } from './teams.js';

// ---- Where things are ----
export const GOAL_AT = { cx: W / 2, y: 20 };
const TICKER = { y: 32, h: 11 };
const BAR_Y = 44;
const BOARD = { x: 4, y: 47, w: 96, row: 7 };
const OPPO = { x: 4, y: 105, w: 96, h: 27 };
const LIST_X = 106;
export const tileRect = (j) => ({ x: LIST_X + (j % 4) * 37, y: 47 + Math.floor(j / 4) * 12, w: 35, h: 11 });
export const CARD2 = { x: 106, y: 85, w: 146, h: 46 };
const HINT_Y = 136;

/** A one-pixel (or t-pixel) outline. */
function frame(x, y, w, h, c, t = 1) {
  fill(x, y, w, t, c);
  fill(x, y + h - t, w, t, c);
  fill(x, y, t, h, c);
  fill(x + w - t, y, t, h, c);
}
/** A little triangle pointing left (-1) or right (1), 3x5. */
function arrow(x, y, d, c) {
  for (let i = 0; i < 3; i++) fill(x + (d < 0 ? i : 2 - i), y + 2 - i, 1, 1 + 2 * i, c);
}
/** A dashed line where nothing's been picked yet. */
function blank(x, y, w, c) {
  for (let i = 0; i < w; i += 3) fill(x + i, y, 2, 1, c);
}

// ---- The header ----
function header(v) {
  fill(0, 0, W, 30, C.night1);
  fill(0, 30, W, 1, C.night3);
  const ck = v.clock;
  if (ck) {
    const out = ck.left <= 0, hot = ck.left <= 10 && !out && ck.left % 1 > 0.7, slam = ck.t < 0.12;
    if (slam) fill(W / 2 - 30, 1, 60, 18, C.white);
    const face = out && ck.t % 0.8 < 0.4 ? 'TIME!' : clockText(ck.left);
    text(face, W / 2, 3, { scale: 2, align: 'center', color: slam ? C.red1 : hot ? C.white : C.red2, outline: C.ink });
  } else {
    text('ALLIANCE SELECTION', W / 2, 3, { align: 'center', color: C.steel3 });
    if (v.sub) text(v.sub, W / 2, 12, { font: 3, align: 'center', color: C.blue3 });
  }
  if (v.goal) drawGoalLine(GOAL_AT.cx, GOAL_AT.y, v.goal);
}

/** The PA line: a speaker, and Robin's call typed out; a flash of yellow as a new one starts. */
function ticker(v) {
  const { y, h } = TICKER, pa = v.pa;
  fill(0, y, W, h, C.ink);
  const fresh = pa && pa.since < 0.15;
  if (fresh) fill(0, y, W, h, C.yel1);
  // The speaker: a box and a flared horn, and (while the call's new) sound coming out of it.
  const sx = 5, sy = y + 2, on = pa && pa.since < 3;
  const sc = fresh ? C.ink : on ? C.white : C.steel1;
  fill(sx, sy + 2, 2, 3, sc);
  fill(sx + 2, sy + 1, 1, 5, sc);
  fill(sx + 3, sy, 1, 7, sc);
  if (on && Math.floor(pa.since * 4) % 2 === 0) {
    fill(sx + 5, sy + 2, 1, 3, sc);
    fill(sx + 7, sy + 1, 1, 5, sc);
  }
  if (!pa) return;
  const chars = Math.floor(pa.since * 40), old = pa.since > 6;
  const [who, ...rest] = pa.text.split(': ');
  const said = rest.join(': ');
  text(`${who}:`, 16, y + 2, { color: fresh ? C.ink : old ? C.steel2 : C.yel1, upto: chars });
  text(said, 16 + measure(`${who}: `), y + 2, { color: fresh ? C.ink : old ? C.steel2 : C.white, upto: Math.max(0, chars - who.length - 2) });
}

// ---- The alliances ----
const CELL_X = [8, 27, 46], CELL_W = 16;
function board(v) {
  const { x, y, w, row } = BOARD;
  v.rows.forEach((cells, i) => {
    const ry = y + i * row, a = i + 1, ours = a === US, them = a === OPPONENT;
    fill(x, ry, w, row - 1, ours ? C.red0 : them ? '#3a1806' : C.night1);
    if (ours || them) fill(x, ry, 2, row - 1, ours ? C.red1 : C.org1);
    text(String(a), x + 3, ry + 1, { font: 3, color: ours ? C.red3 : them ? C.org2 : C.steel2 });
    cells.forEach((num, k) => {
      const cx = x + CELL_X[k] + 2, picking = v.picking && v.picking.alliance === a && v.picking.slot === k;
      const fresh = v.fresh?.[`${a}-${k}`];
      if (picking && v.t % 0.6 < 0.4) frame(cx - 2, ry - 1, CELL_W + 2, row + 1, C.yel1);
      if (!num) return blank(cx, ry + 3, CELL_W - 2, picking ? C.yel0 : C.steel1);
      if (fresh != null && fresh < 0.12) fill(cx - 1, ry, CELL_W, row - 1, C.yel2);
      const c = fresh != null && fresh < 1.6 ? C.yel2 : num === OURS ? C.white : ours ? C.red3 : them ? C.org2 : C.steel3;
      text(num, cx, ry + 1, { font: 3, color: c });
    });
    if (ours) text('US', x + w - 3, ry + 1, { font: 3, align: 'right', color: C.red3 });
    if (them) text('VS US', x + w - 3, ry + 1, { font: 3, align: 'right', color: C.org2 });
  });
}

/** Alliance 5 as the app knows it: each robot, what it scores with, its average; the top scorer's marked BEST. */
function opponent(v) {
  const { x, y, w, h } = OPPO;
  fill(x, y, w, h, C.night1);
  frame(x, y, w, h, C.org0);
  fill(x + 1, y + 1, w - 2, 1, C.org1);
  text(`QF: ALLIANCE ${OPPONENT}`, x + 3, y + 3, { font: 3, color: C.org2 });
  text('AVG', x + w - 3, y + 3, { font: 3, align: 'right', color: C.steel2 });
  v.oppo.forEach((team, i) => {
    const ly = y + 9 + i * 6;
    if (!team) {
      blank(x + 3, ly + 2, 15, C.steel1);
      return;
    }
    const role = ROLES[team.role];
    text(team.num, x + 3, ly, { font: 3, color: team.num === STAR ? C.white : C.steel3 });
    text(role.short, x + 22, ly, { font: 3, color: role.c });
    const fresh = v.fresh?.[`5-${i}`];
    text(String(avg(team)), x + w - 3, ly, { font: 3, align: 'right', color: fresh != null && fresh < 1.6 ? C.yel2 : C.yel1 });
    if (team.num === STAR) text('BEST', x + w - 14, ly, { font: 3, align: 'right', color: C.yel2 });
  });
}

// ---- Her list ----
/** The TAKEN stamp, centred on (x, y): slammed down (a white flash), then sitting there, red. */
export function drawTaken(x, y, alliance, t) {
  const words = `BY ALLIANCE ${alliance}`, w = measure(words, { font: 3 }) + 10, h = 16;
  // Kept over her list: a stamp on a tile at the list's left edge doesn't spill onto the alliances.
  x = clamp(x, LIST_X + Math.ceil(w / 2), W - 4 - Math.ceil(w / 2));
  const bx = Math.round(x - w / 2), by = Math.round(y - h / 2);
  if (t < 0.08) {
    fill(bx - 2, by - 2, w + 4, h + 4, C.white);
    return;
  }
  fill(bx - 1, by - 1, w + 2, h + 2, C.ink);
  fill(bx, by, w, h, C.red0);
  frame(bx, by, w, h, C.red2, 1);
  text('TAKEN', x, by + 3, { font: 3, align: 'center', color: C.red3 });
  text(words, x, by + 9, { font: 3, align: 'center', color: C.white });
}

function tile(tl, v) {
  const { team, x, y, on } = tl, { w, h } = tileRect(0);
  fill(x, y, w, h, on ? C.night2 : C.night1);
  if (on) {
    frame(x - 1, y - 1, w + 2, h + 2, C.ink);
    frame(x, y, w, h, v.t % 0.9 < 0.6 ? C.yel1 : C.yel0, 1);
  } else frame(x, y, w, h, C.steel1);
  fill(x + 2, y + h - 3, w - 4, 1, ROLES[team.role].c);
  text(team.num, x + 3, y + 2, { font: 3, color: C.white });
  text(String(avg(team)), x + w - 3, y + 2, { font: 3, align: 'right', color: on ? C.yel2 : C.yel1 });
}

/** Ten matches as boxes, Friday's then Saturday's; marked matches outlined in yellow. */
function strip(scores, x, y, marks = []) {
  const bw = 9, gap = 1, split = 3;
  scores.forEach((s, i) => {
    const bx = x + i * (bw + gap) + (i >= FRIDAY ? split : 0);
    fill(bx, y, bw, bw, C.night3);
    fill(bx, y, bw, 1, C.blue2);
    text(String(s), bx + 5, y + 2, { font: 3, align: 'center', color: C.white });
    if (marks.includes(i)) {
      frame(bx - 1, y - 1, bw + 2, bw + 2, C.ink);
      frame(bx - 2, y - 2, bw + 4, bw + 4, C.yel1);
    }
  });
}

/** The card for the team the cursor's on. */
function card(v) {
  const team = v.card, { x, y, w, h } = CARD2;
  if (!team) return;
  const role = ROLES[team.role];
  fill(x, y, w, h, C.night1);
  frame(x, y, w, h, v.turn ? C.yel0 : C.steel1);
  text(team.num, x + 5, y + 4, { scale: 2, color: C.white });
  const rw = measure(role.word, { font: 3 }) + 4;
  fill(x + 55, y + 6, rw, 7, role.c);
  text(role.word, x + 57, y + 7, { font: 3, color: C.ink });
  const a = String(avg(team)), aw = measure(a, { scale: 2 });
  text(a, x + w - 5, y + 4, { scale: 2, align: 'right', color: C.yel1, outline: C.ink });
  text('AVG', x + w - 8 - aw, y + 11, { font: 3, align: 'right', color: C.steel2 });
  text(team.note, x + 5, y + 20, { font: 3, color: C.steel3 });
  strip(team.scores, x + 5, y + 27, team.mark);
  // Under the strip: its line of data, if it has one (the match it's about is outlined above); else FRI and SAT.
  if (team.key) text(team.key, x + 5, y + 39, { font: 3, color: C.yel2 });
  else {
    text('FRI', x + 39, y + 39, { font: 3, align: 'center', color: C.steel2 });
    text('SAT', x + 95, y + 39, { font: 3, align: 'center', color: C.steel2 });
  }
  if (v.cardTaken) drawTaken(x + w / 2, y + h / 2, v.cardTaken.alliance, v.cardTaken.t);
}

// ---- The hint line ----
function hintLayout(turn) {
  const move = 'BROWSE', a = turn ? 'A: PICK' : 'WAIT FOR YOUR TURN';
  const wm = measure(move, { font: 3 }) + 12, wa = measure(a, { font: 3 }), total = wm + 16 + wa;
  const x = Math.round(W / 2 + 52 - total / 2);
  return { x, move, a, ax: x + wm + 16, wa };
}
export function hintRects2(turn) {
  const { x, ax, wa } = hintLayout(turn), y = HINT_Y - 4, h = 12;
  return { left: { x: x - 6, y, w: 10, h }, right: { x: x + 4, y, w: 10, h }, act: turn ? { x: ax - 4, y, w: wa + 8, h } : null };
}
function hint(v) {
  if (v.thought) {
    text(v.thought, W / 2, HINT_Y - 1, { align: 'center', color: C.blue3 });
    return;
  }
  if (v.toast) {
    text(v.toast, W / 2 + 52, HINT_Y, { font: 3, align: 'center', color: C.red3 });
    return;
  }
  const { x, move, a, ax } = hintLayout(v.turn);
  arrow(x, HINT_Y, -1, C.steel3);
  arrow(x + 5, HINT_Y, 1, C.steel3);
  text(move, x + 12, HINT_Y, { font: 3, color: C.steel3 });
  text(a, ax, HINT_Y, { font: 3, color: v.turn ? C.yel2 : C.steel2 });
}

/**
 * The whole dashboard. v: { t (seconds, for blinks), clock: { t, left } on her turn, sub (while she waits), goal (for
 * the pill: { done, t, open }), pa: { text, since }, rows (8 x [captain, pick 1, pick 2]), picking: { alliance, slot },
 * fresh: { 'alliance-slot': seconds since it went in }, oppo (alliance 5's teams so far, null for a blank),
 * tiles: [{ team, x, y, on, taken: { alliance, t }, fall }], card (the team the cursor's on), cardTaken, turn (it's
 * hers), thought, toast, glow }.
 */
export function drawDashboard(v) {
  screen();
  fill(0, 0, W, H, C.night0);
  for (let x = 4; x < W; x += 12) fill(x, 31, 1, H - 31, '#0d1133');
  header(v);
  ticker(v);
  if (v.clock) {
    const bar = Math.round((W - 8) * clamp(v.clock.left, 0, PICK_CLOCK) / PICK_CLOCK);
    fill(4, BAR_Y, W - 8, 2, C.night1);
    fill(4, BAR_Y, bar, 2, v.clock.left <= 10 ? C.red2 : C.red1);
  }
  board(v);
  opponent(v);
  card(v);
  // The tiles over the card's top edge, so a falling one passes in front of it; the stamps over them all.
  for (const tl of v.tiles) {
    if (tl.fall > 0) {
      const k = tl.fall;
      withAlpha(1 - stepped(k), () => tile({ ...tl, y: tl.y + Math.round(k * k * 40) }, v));
    } else tile(tl, v);
  }
  for (const tl of v.tiles) {
    if (!tl.taken) continue;
    const r = tileRect(0), k = tl.fall ?? 0;
    withAlpha(1 - stepped(k), () => drawTaken(tl.x + r.w / 2, tl.y + r.h / 2 + Math.round(k * k * 40), tl.taken.alliance, tl.taken.t));
  }
  hint(v);
  drawHud({ glow: v.glow ?? 0 });
}

