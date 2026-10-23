// The eight division fields of the World Championship's hall, side by side. Each is the arena's own field, robots,
// bleachers and walkway (field.js, bleachers.js), imported and not copied, so when the arena's field or robots get
// better all eight fields do too. A division is the arena's whole world moved along the hall to ox(k) (layout.js): its
// floor is the one makeFloor() canvas, laid down again for each; its stands are bleachers.js's, clipped to the division's
// own span so the curtains between divisions (hall.js) can hang in the gaps; its match runs on its own clock, out of step
// with the others, with its own team numbers on the robots and its own score up on the scoring table. Only the divisions
// in view are drawn, never more than two at once.
// Past Archimedes and past Newton the floor carries on: pieces of the arena's own plain concrete, cut from the same
// floor canvas and walkway, so they change whenever the arena's floor does.
// Walking keeps field.js's rules in each division's own frame: the walkway along the field, the open floor past its ends.
// The ends of two neighbouring divisions meet, so between their curtains they make one aisle, 256 pixels wide.

import { W, clamp } from '../pixel.js';
import { FIELD, STATION, makeFloor, drawFieldLive, WALK_Y, OPEN_Y, EDGE, blocked } from '../field.js';
import { TIERS, drawStands, drawWalkway } from '../bleachers.js';
import { PITCH, PAD_L, PAD_R, WALL, DIVISIONS, WORLD, ox, divisionAt, STANDS, matchState, PLAY, PASSAGE, EXIT, EXIT_SIGN } from './layout.js';

const LAST = DIVISIONS.length - 1;
/** Things standing near a division's edges (the queue sign, a cart, someone in the aisle) still get drawn this far out. */
const MARGIN = 40;
// The walkway starts under the front row's footboard; above row 56 between blocks of stands is the curtains' (hall.js).
// Below the walkway, from FLOOR_TOP down, is the floor canvas's concrete.
const WALKWAY = TIERS[0] + 2, HEM = WALK_Y[0], FLOOR_TOP = FIELD.y0 - 2;

let FLOOR = null;

/** Once, before the first frame: the arena's floor. */
export function setupFields() {
  FLOOR ??= makeFloor();
}

// The pads past Archimedes and past Newton are pieces of the floor past a field's red driver station, from PLAIN to the
// end of its world: plain concrete, no tape and no yellow line, cut from the same floor canvas and walkway as every
// division's. On the left the piece meets Archimedes' blue end exactly as one division's red end meets the next one's.
// On the right the hall goes on further, and the same piece laid straight down would repeat Newton's own red end right
// beside it, so it goes down upside down (its walkway from the plain stretch at the blue end instead), and the few
// pixels left before the wall come from the start of a blue end.
// [world x, width, the floor canvas's x, the walkway's x, upside down]
const PLAIN = FIELD.x1 + STATION;
const PADS = [
  [0, PAD_L, PLAIN, PLAIN, false],
  [ox(LAST) + PITCH, PITCH - PLAIN, PLAIN, 0, true],
  [ox(LAST) + 2 * PITCH - PLAIN, PAD_R - (PITCH - PLAIN) - WALL, 0, PLAIN, false],
];

/** One piece of a pad (PADS), seen from the view (vx, vy): the walkway's rows, then the concrete. */
function drawPad(g, vx, vy, [x, w, floorX, walkX, flip]) {
  const sx = x - vx, h = 144 - FLOOR_TOP;
  if (sx >= W || sx + w <= 0) return;
  clipped(g, [[sx, HEM - vy, w, FLOOR_TOP - HEM]], () => {
    g.translate(0, -vy);
    drawWalkway(g, vx - x + walkX);
  });
  if (!flip) {
    g.drawImage(FLOOR, floorX, FLOOR_TOP, w, h, sx, FLOOR_TOP - vy, w, h);
    return;
  }
  g.save();
  g.translate(0, 144 - vy);
  g.scale(1, -1);
  g.drawImage(FLOOR, floorX, FLOOR_TOP, w, h, sx, 0, w, h);
  g.restore();
}

/** The divisions in view (the pads count as the first and the last), left to right: the only ones ever drawn. */
export function visibleDivisions(view) {
  const ks = [];
  DIVISIONS.forEach((_, k) => {
    const x0 = k === 0 ? 0 : ox(k), x1 = k === LAST ? WORLD.w : ox(k) + PITCH;
    if (x1 + MARGIN > view.x && x0 - MARGIN < view.x + W) ks.push(k);
  });
  return ks;
}

/** Clip g to these screen rectangles ([x, y, w, h]) while draw() runs. */
function clipped(g, rects, draw) {
  g.save();
  g.beginPath();
  for (const [x, y, w, h] of rects) g.rect(x, y, w, h);
  g.clip();
  draw();
  g.restore();
}

/**
 * The floor, world rows 50 to 143: each division's field, driver stations and concrete, its walkway along the front of
 * the stands, and the pads past the ends. Between the blocks of stands the walkway starts at the curtains' hem.
 */
export function drawFloors(g, view) {
  const vx = Math.round(view.x), vy = Math.round(view.y);
  for (const k of visibleDivisions(view)) {
    const x = ox(k) - vx;
    g.drawImage(FLOOR, x, -vy);
    clipped(g, [[x, HEM - vy, PITCH, FLOOR_TOP - HEM], [x + STANDS.x0, WALKWAY - vy, STANDS.x1 - STANDS.x0, HEM - WALKWAY]], () => {
      g.translate(0, -vy);
      drawWalkway(g, vx - ox(k));
    });
  }
  for (const p of PADS) drawPad(g, vx, vy, p);
}

/**
 * Each division's bleachers, clipped to its own span (the first and last aisle stairs become the ends of the stands),
 * cheering on its own clock. o.lookOf(k): who sits in division k's seats, (p) => look; o.talkingTo: the seat whose person
 * sits still while you talk to them.
 */
export function drawStandsAll(g, view, t, o = {}) {
  const vx = Math.round(view.x), vy = Math.round(view.y);
  for (const k of visibleDivisions(view)) {
    const x0 = Math.max(0, ox(k) + STANDS.x0 - vx), x1 = Math.min(W, ox(k) + STANDS.x1 - vx);
    if (x1 <= x0) continue;
    // Down to the footboard: the walkway is in front of it.
    clipped(g, [[x0, 0, x1 - x0, WALKWAY - vy]], () => {
      g.translate(0, -vy);
      drawStands(g, vx - ox(k), t + DIVISIONS[k].offset, o.talkingTo ?? null, { lookOf: o.lookOf?.(k) });
    });
  }
}

/**
 * Division k's field and everything standing on it and past its ends, back to front, with its own robots, queue and
 * score. o.more: people and things to sort in, { y: floor line, draw() }; o.hero: her feet in world pixels, so a rocket in
 * front of her goes see-through. Between two matches, while the big screen says FINAL and the scoring table holds the
 * final score, the robots stand where the final buzzer left them, disabled, as they do on a real field: the field's
 * clock stops at the end of the match and starts again with the next.
 */
export function drawField(g, view, t, k, o = {}) {
  const vx = Math.round(view.x), vy = Math.round(view.y), d = DIVISIONS[k], m = matchState(k, t);
  const who = [];
  if (o.hero) {
    const x = Math.round(o.hero.x) - vx;
    who.push({ x0: x - 8, x1: x + 8, y1: Math.round(o.hero.y) - vy });
  }
  const ft = t + d.offset - (m.playing ? 0 : m.into - PLAY);
  drawFieldLive(g, vx - ox(k), ft, { camY: vy, teams: d.teams, queue: d.queue, score: [m.blue, m.red], more: o.more ?? [], who });
}

// ---- Where she can walk ----
const local = (x) => x - ox(divisionAt(x));
/** Past a field's driver stations: the open floor, which joins the next division's into one aisle (and the pads). */
const inEnd = (x) => local(x) <= EDGE || local(x) >= PITCH - EDGE;
/** Whether her feet at (x, y) are on box b, with field.js's margins round it (5 across, 2 deep). */
const on = (x, y, b) => x > b.x0 - 5 && x < b.x1 + 5 && y > b.y0 - 2 && y < b.y1 + 2;
const hits = (x, y, blocks) => blocked(local(x), y) || blocks.some((b) => on(x, y, b));

/** The rows she can stand on at x: the open floor past a field's ends, the walkway beside it. */
const band = (x) => (inEnd(x) ? OPEN_Y : WALK_Y);
/**
 * How far up or down she slides round the corner of something in her way, instead of stopping dead against it: SLIDE
 * rows, or further where a box she's walked into says so (its slide: someone standing, a barrier's end post), the
 * furthest of any she's against.
 */
const SLIDE = 8;
const slideOf = (x, y, blocks) => blocks.reduce((n, b) => (b.slide > n && on(x, y, b) ? b.slide : n), SLIDE);
/** How far below a walkway she steps up onto it round a driver station's corner (move()). */
const CORNER = 16;
/**
 * The way out through the right wall's doorway (move()). Walking straight right from STEER on (past the info desk), no
 * more than DOOR_SLIDE rows above or below the doorway's passage, she bears toward its middle row, MID, a row for each
 * pixel along, so she heads diagonally for the doorway and walks out through the middle of it, not along a jamb. From
 * UNDER_SIGN on, her head (8 pixels either side of her feet) would be across the EXIT sign hanging over the doorway
 * (layout.js EXIT_SIGN) if she stood above the passage, so there her feet keep to its rows or below them.
 */
const STEER = WORLD.w - WALL - 70, DOOR_SLIDE = 16, MID = Math.round((PASSAGE.y0 + PASSAGE.y1) / 2);
const UNDER_SIGN = EXIT_SIGN.x0 - 11; // her hair two pixels clear of its edge
/** The doorways' walls, which she gets past only in the passage's rows: past the right one's face on the way out, and
 *  into the left one's threshold, as far as its door frame, where she came in. */
const FACE_R = WORLD.w - WALL - 17, FACE_L = WALL + 17, FRAME_L = WALL + 9;
/** The rows from y up to the walkway's front row. */
const rowsUp = (y) => Array.from({ length: Math.ceil(y - WALK_Y[1]) + 1 }, (_, i) => Math.max(WALK_Y[1], y - i));
/**
 * Going along from x to nx at row y and stopped there: the nearest row, up or down (up first if both are as near), no
 * further than the slide of whatever stopped her, where the same step is clear and that she can get to from where she
 * is: as a signed distance, or 0 if there's none.
 */
function slideRow(x, nx, y, blocks) {
  const [lo, hi] = band(x), [nlo, nhi] = band(nx), top = Math.max(lo, nlo), bottom = Math.min(hi, nhi);
  const open = [true, true]; // whether every row between y and y -/+ d is clear at x
  for (let d = 1, most = slideOf(nx, y, blocks); d <= most; d++) {
    for (const [i, yy] of [[0, y - d], [1, y + d]]) {
      open[i] &&= yy >= top && yy <= bottom && !hits(x, yy, blocks);
      if (open[i] && !hits(nx, yy, blocks)) return yy - y;
    }
  }
  return 0;
}

/**
 * Step her from (x, y) by (dx, dy), along and then across, as field.js does in the arena: the walkway beside each field,
 * the open floor in the aisles and on the pads. Each division's queue, sign, scoring table and reset cart stop her, and
 * so does every world box in blocks ({ x0, x1, y0, y1, slide }: tables, people, barriers). Walking straight along into
 * the corner of one (a queue's top corner, someone's shoulder, a barrier's end post), she slides round it, up or down at
 * her own pace, rather than stopping dead.
 */
export function move(x, y, dx, dy, blocks = []) {
  // Her run reaches sixteen pixels ahead of her feet (the leading leg in its longest stride): far enough from either end
  // wall that it never crosses the wall's edge. Only in the doorways does she go further, in the passage's rows: on the
  // left as far as the door frame she came in by, on the right on past the wall's face as far as the way out (layout.js
  // EXIT), and past either wall's face she keeps to those rows. Walking straight right toward the right doorway (from
  // STEER, no more than DOOR_SLIDE rows from its passage), she bears toward its middle row at her own pace, as she slides
  // round anything else in her way: so holding right from the start walks her the length of the hall and out through
  // the middle of the doorway.
  if (dx > 0 && Math.abs(dy) < 0.01 && x + dx > STEER && Math.abs(MID - y) > 0.01
    && Math.abs(clamp(y, PASSAGE.y0, PASSAGE.y1) - y) <= DOOR_SLIDE) {
    const ny = y + Math.sign(MID - y) * Math.min(Math.abs(MID - y), dx);
    if (!hits(Math.min(x + dx, FACE_R), ny, blocks)) y = ny;
  }
  const inDoor = y >= PASSAGE.y0 && y <= PASSAGE.y1;
  let nx = clamp(x + dx, inDoor ? FRAME_L : FACE_L, inDoor ? EXIT.x : FACE_R);
  // Above the right doorway, no further than where her head would come under the EXIT sign.
  if (y < PASSAGE.y0) nx = Math.min(nx, Math.max(x, UNDER_SIGN));
  // Off the open floor into a field's driver stations: back to the edge she came from. Walking straight along the
  // aisle just below a walkway (no more than CORNER rows below it), she steps up round the station's corner onto the
  // walkway instead, at her own pace, as she slides round anything else, if nothing's in the way.
  if (y > WALK_Y[1] && !inEnd(nx)) {
    const k = divisionAt(nx), edge = ox(k) + (x - ox(k) < FIELD.mid ? EDGE : PITCH - EDGE);
    if (Math.abs(dy) < 0.01 && y - WALK_Y[1] <= CORNER && !rowsUp(y).some((yy) => hits(edge, yy, blocks))) {
      y = Math.max(WALK_Y[1], y - Math.abs(nx - x));
    }
    if (y > WALK_Y[1]) nx = edge;
  }
  if (hits(nx, y, blocks)) {
    const side = Math.abs(dy) < 0.01 && nx !== x ? slideRow(x, nx, y, blocks) : 0;
    if (side) {
      y += Math.sign(side) * Math.min(Math.abs(side), Math.abs(nx - x));
      if (hits(nx, y, blocks)) nx = x;
    } else nx = x;
  }
  const [lo, hi] = nx > FACE_R || nx < FACE_L ? [PASSAGE.y0, PASSAGE.y1] : band(nx);
  let ny = clamp(y + dy, nx > UNDER_SIGN ? Math.max(lo, PASSAGE.y0) : lo, hi);
  if (hits(nx, ny, blocks)) ny = y;
  return [nx, ny];
}
