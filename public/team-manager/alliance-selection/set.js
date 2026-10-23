// The set for alliance selection: everything in the scene that isn't a person. It's the arena from the walkabout, the
// same shared art (field.js draws the field, its walls, the HABs, the cargo ship and the rockets; bleachers.js the
// stands, the crowd and the walkway), with the robots gone and the field dressed for the end of qualifications.
// The world is the arena's width and 208 rows deep: the top 144 rows are exactly the arena's, and below the field's
// near wall the arena's concrete carries on to the bottom of the world, where the team reps wait their turn.
//
// On the field: eight numbered signs on posts in a line across the front, 1 at the blue end to 8 at the red end, built
// like the QUEUE sign past the blue end (a flat yellow panel in ink on a plain post), each one's panel held up just
// behind the heads of the alliance standing in front of it; and the microphone on its stand in the middle, its short
// boom bringing the mic's dark head to the chin of whoever stands behind it. The near wall has a gate in it, left of
// the mic, its chain unhooked.
// In front of the field: a taped line on the concrete with the reps' TEAM REPS sign beside it, and a belt barrier
// along the bottom of the world on posts like the driver stations'. Past the red end: the audience display, a navy
// screen on two truss legs showing the alliances as they're picked, the pick clock and all eight backups.
// Everything is filled rectangles on whole pixels (pixel.js), outlined in ink, three tones lit from the upper left, in
// the arena's own colours. The flat things (the concrete, the tape) are drawn once into a canvas; everything that stands
// up is sorted in with the field and the people by its floor line, so it all draws back to front.
//
//   makeSetLayers()                       { floor, near }: the arena's floor (field.js) and the scene's own floor below it
//   drawSet(g, view, t, o)                the whole world at view = { x, y } into g at 1x (see below)
//   moveIn(x, y, dx, dy, blockers, movers)  where a step ends up: the open floor, the front of the field and the gate

import { C, useContext, camera, screen, rect, text, rnd } from '../pixel.js';
import { FIELD, STATION, floorY, makeFloor, drawFieldLive } from '../field.js';
import { drawStands, drawWalkway } from '../bleachers.js';
import { tones } from '../cast.js';
import {
  WORLD, NEAR_TOP, SPOTS, SIGN_Y, SIGN_POST, SIGN_HALF, SIGN_TOP, MIC, MC_HOME, BAND, LINE_AREA, NEAR_GATE, WAIT, REPS_SIGN, BOARD, BARRIER_Y,
  WALK_MAX_Y,
} from './layout.js';

// The arena's concrete and its speckle (field.js, bleachers.js), and field.js's steel.
const CONCRETE = '#353a4c', SPECKS = ['#3b4154', '#30354a'];
const FT = 8; // pixels per foot along the field, as in field.js
/** field.js's mirror: the red end is the blue end turned round. */
const mirrorX = (alliance, x, w = 0) => (alliance === 'blue' ? x : FIELD.x0 + FIELD.x1 - x - w);

// ---- The floor, drawn once ----
/** The scene's own floor, NEAR_TOP to the bottom of the world: the concrete past the field's ends, carried on in front. */
function makeNear() {
  const c = document.createElement('canvas');
  c.width = WORLD.w;
  c.height = WORLD.h - NEAR_TOP;
  const prev = useContext(c.getContext('2d'));
  camera(0, NEAR_TOP, 1);
  rect(0, NEAR_TOP, WORLD.w, c.height, CONCRETE);
  // As sparse as the arena's: about one pixel in forty.
  const n = Math.round((WORLD.w * c.height) / 43);
  for (let i = 0; i < n; i++) {
    rect(Math.floor(rnd(i + 20000) * WORLD.w), NEAR_TOP + Math.floor(rnd(i + 21000) * c.height), 1, 1, SPECKS[rnd(i + 22000) < 0.5 ? 0 : 1]);
  }
  // The yellow line along the near side of the field and the driver stations, like the walkway's on the far side.
  rect(FIELD.x0 - STATION, NEAR_TOP + 2, FIELD.x1 - FIELD.x0 + 2 * STATION, 1, C.yel1);
  // The reps' waiting line, taped in dashes like the queue lane past the blue end.
  for (let x = WAIT.x0; x < WAIT.x1; x += 4) rect(x, WAIT.tapeY, 3, 1, C.yel1);
  screen();
  useContext(prev);
  return c;
}

/**
 * field.js's floor has the queue lane past the blue end taped out on it (two dashed lines, x 42 to 128 at rows 96 and
 * 132). With the queue gone (ends: false) they'd be stray marks on empty concrete, so they're laid over with concrete
 * again, speckled as sparsely as the rest.
 */
const OLD_LANE = { x0: 42, x1: 130, rows: [96, 132] };
function clearQueueLane(floor) {
  const prev = useContext(floor.getContext('2d'));
  screen();
  OLD_LANE.rows.forEach((y, j) => {
    rect(OLD_LANE.x0, y, OLD_LANE.x1 - OLD_LANE.x0, 1, CONCRETE);
    for (let x = OLD_LANE.x0; x < OLD_LANE.x1; x++) {
      if (rnd(x * 3 + j * 997 + 23000) < 1 / 40) rect(x, y, 1, 1, SPECKS[rnd(x + j * 31 + 24000) < 0.5 ? 0 : 1]);
    }
  });
  useContext(prev);
  return floor;
}

let layers = null;
/** The arena's floor (field.js) and the scene's own floor in front of it, made once (drawSet makes them if need be). */
export function makeSetLayers() {
  layers = { floor: clearQueueLane(makeFloor()), near: makeNear() };
  return layers;
}

// ---- On the field ----
/**
 * A numbered sign on its post, built exactly like the arena's QUEUE sign (field.js queueSign): a flat yellow panel in
 * ink with the alliance's number on it, up above its captain's head, on a plain post with an ink foot, rising just
 * right of the captain's head and under the panel's right-hand end.
 */
function spotSign(i) {
  const x = SPOTS[i], px = x + SIGN_POST, y = SIGN_Y, top = SIGN_TOP;
  rect(px - 4, y - 1, 9, 2, C.ink);
  rect(px - 1, top + 12, 3, y - top - 12, C.ink);
  rect(px, top + 13, 1, y - top - 13, C.steel3);
  rect(x - SIGN_HALF, top, 2 * SIGN_HALF + 1, 13, C.ink);
  rect(x - SIGN_HALF + 1, top + 1, 2 * SIGN_HALF - 1, 11, C.yel1);
  text(String(i + 1), x, top + 3, { color: C.ink, align: 'center' });
}

/** A little picture drawn pixel by pixel from rows of letters, like cast.js's heads: '.' is see-through. */
function sprite(rows, x0, y0, pal) {
  rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch !== '.') rect(x0 + i, y0 + j, 1, 1, pal[ch]);
  }));
}

// The microphone on its stand, by hand: k ink, W white, L/M/D steel lit, mid and shade, and the mic's black body
// (cast.js tones.black, as on Robin's handheld): B its mid, b its shade, G its lit edge. Its column 6 is the pole. At
// the top, the mic itself, the same as the one in Robin's hand: a round steel grille, lit from the upper left with a
// white glint and its mesh in the mid tone, on a black body tipped up to the left out of the clip, so it points at the
// mouth of whoever stands at AT_MIC and comes out beside their chin (their face stays clear). The ball is the light
// shape that reads as a mic at 1x against the dark bays of the cargo ship behind it, with an ink ring that keeps it
// apart from the ship's light frame. Under the clip, the clutch; at the bottom, the round weighted base, its top lit.
const MIC_PAL = { k: C.ink, W: C.white, L: C.steel3, M: C.steel2, D: C.steel1, B: tones.black[1], b: tones.black[0], G: tones.black[2] };
const MIC_TOP = [
  '.kkkk......',
  'kWLLMk.....',
  'kLMLMk.....',
  'kLLMDk.....',
  'kMMDDk.....',
  '.kkkkGk....',
  '....kBGk...',
  '.....kBk...',
  '.....kkk...',
  '.....kLk...',
  '.....kkk...',
];
const MIC_BASE = [
  '...kkkkk...',
  '.kkLLMMMkk.',
  'kLLMMMMMMDk',
  '.kkDDDDDkk.',
  '...kkkkk...',
];
function micStand() {
  const { x, y } = MIC, top = y - 40;
  sprite(MIC_BASE, x - 5, y - MIC_BASE.length + 1, MIC_PAL);
  sprite(MIC_TOP, x - 6, top, MIC_PAL);
  // The pole, from the clutch down into the middle of the base's top.
  const pole0 = top + MIC_TOP.length, pole1 = y - 2;
  rect(x - 1, pole0, 3, pole1 - pole0, C.ink);
  rect(x, pole0, 1, pole1 - pole0, C.steel3);
}

// ---- In front of the field ----
/** The reps' sign, in the QUEUE sign's style (field.js), its two words stacked to keep it clear of the queuer. */
function repsSign() {
  const { x, y } = REPS_SIGN;
  rect(x - 4, y - 1, 9, 2, C.ink);
  rect(x - 1, y - 26, 3, 26, C.ink);
  rect(x, y - 25, 1, 25, C.steel3);
  rect(x - 11, y - 44, 23, 19, C.ink);
  rect(x - 10, y - 43, 21, 17, C.yel1);
  text('TEAM', x, y - 40, { font: 3, color: C.ink, align: 'center' });
  text('REPS', x, y - 33, { font: 3, color: C.ink, align: 'center' });
}

/** The belt barrier along the bottom of the world: posts every 48 pixels like the driver stations', a blue belt between. */
const POSTS = Array.from({ length: Math.floor((WORLD.w - 16) / 48) + 1 }, (_, i) => 8 + i * 48);
function barrier() {
  const y = BARRIER_Y, first = POSTS[0], last = POSTS[POSTS.length - 1];
  rect(first, y - 20, last - first, 1, C.ink);
  rect(first, y - 19, last - first, 1, C.blue2);
  rect(first, y - 18, last - first, 1, C.blue1);
  rect(first, y - 17, last - first, 1, C.ink);
  for (const x of POSTS) {
    rect(x - 3, y - 1, 7, 2, C.ink);
    rect(x - 2, y - 1, 5, 1, C.steel1);
    rect(x - 1, y - 22, 3, 21, C.ink);
    rect(x, y - 21, 1, 20, C.steel3);
  }
}

// ---- The audience display ----
// A navy screen in a steel frame on two truss legs, past the red end where the crowd can see it. BOARD is its middle
// and the floor line of its feet; the screen's face holds a header, eight rows and the eight backups (two by the
// label, then two rows of three in the picks' columns), in the 3x5 font.
const SCR = { w: 82, h: 88, legs: 14 };
const SCR_X0 = BOARD.x - SCR.w / 2, SCR_Y0 = BOARD.y - SCR.legs - SCR.h;
const LEGS = [BOARD.x - 29, BOARD.x + 28];
// Where things sit on the face: the alliance number, then the captain's and the two picks' columns; the rows' pitch.
const COLS = [6, 14, 33, 52];
const ROW0 = 10, PITCH = 6;
const DASH = '----';

const clockText = (s) => {
  const n = Math.max(0, Math.ceil(s));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
};

/** One truss leg: two rails, lit on the left, with the bracing zig-zagging between them, on a foot plate. */
function trussLeg(x, y0, y1) {
  rect(x - 3, y0, 2, y1 - y0, C.ink);
  rect(x + 2, y0, 2, y1 - y0, C.ink);
  rect(x - 2, y0, 1, y1 - y0, C.steel3);
  rect(x + 2, y0, 1, y1 - y0, C.steel2);
  for (let y = y0; y < y1 - 1; y++) {
    const k = (y - y0) % 4;
    rect(x - 1 + (k === 3 ? 1 : k), y, 1, 1, C.steel1);
  }
  rect(x - 5, y1 - 1, 11, 2, C.ink);
  rect(x - 4, y1 - 1, 9, 1, C.steel1);
  rect(x - 4, y1 - 1, 3, 1, C.steel2);
}

function board(b) {
  const x0 = SCR_X0, y0 = SCR_Y0, w = SCR.w, h = SCR.h, foot = BOARD.y;
  for (const lx of LEGS) trussLeg(lx, y0 + h - 1, foot + 1);
  // A cross brace between the legs, under the screen.
  rect(LEGS[0] + 3, y0 + h + 4, LEGS[1] - LEGS[0] - 5, 3, C.ink);
  rect(LEGS[0] + 3, y0 + h + 5, LEGS[1] - LEGS[0] - 5, 1, C.steel2);
  // The frame: ink, then steel lit on its top and left, then ink round the face.
  rect(x0, y0, w, h, C.ink);
  rect(x0 + 1, y0 + 1, w - 2, h - 2, C.steel2);
  rect(x0 + 1, y0 + 1, w - 2, 1, C.steel3);
  rect(x0 + 1, y0 + 1, 1, h - 2, C.steel3);
  rect(x0 + w - 2, y0 + 2, 1, h - 3, C.steel1);
  rect(x0 + 2, y0 + h - 2, w - 3, 1, C.steel1);
  rect(x0 + 3, y0 + 3, w - 6, h - 6, C.ink);
  const fx = x0 + 4, fy = y0 + 4, fw = w - 8, fh = h - 8;
  rect(fx, fy, fw, fh, C.night1);
  rect(fx, fy, fw, 1, C.night2);
  // The header and the clock.
  text('ALLIANCES', fx + COLS[0], fy + 2, { font: 3, color: C.yel1 });
  if (b && typeof b.clock === 'number') text(clockText(b.clock), fx + COLS[3] + 15, fy + 2, { font: 3, color: C.red2, align: 'right' });
  rect(fx + 2, fy + 8, fw - 4, 1, C.night3);
  // Eight rows: the alliance's number, then its captain and picks, dashes for anyone not picked yet.
  for (let r = 0; r < 8; r++) {
    const ry = fy + ROW0 + r * PITCH, hot = b && b.hot === r, row = b?.rows?.[r] ?? ['', '', ''];
    if (hot) {
      rect(fx + 2, ry - 1, fw - 4, PITCH + 1, C.blue1);
      rect(fx + 2, ry - 1, fw - 4, 1, C.blue2);
    }
    text(String(r + 1), fx + COLS[0], ry, { font: 3, color: hot ? C.blue3 : C.steel2 });
    row.forEach((num, k) => text(num || DASH, fx + COLS[k + 1], ry, { font: 3, color: num ? C.white : hot ? C.blue0 : C.night3 }));
  }
  // The backups in rank order: the first two after the label, the rest three to a row in the teams' columns.
  if (b?.backups?.length) {
    const by = fy + ROW0 + 8 * PITCH;
    rect(fx + 2, by + 1, fw - 4, 1, C.night3);
    text('BACKUP', fx + COLS[0], by + 3, { font: 3, color: C.steel2 });
    b.backups.slice(0, 8).forEach((num, k) => {
      const [col, row] = k < 2 ? [k + 2, 0] : [1 + ((k - 2) % 3), 1 + Math.floor((k - 2) / 3)];
      text(num, fx + COLS[col], by + 3 + row * PITCH, { font: 3, color: C.white });
    });
  }
}

// ---- Putting it together ----

/**
 * The whole world at view = { x, y } (whole pixels) into g at 1x, t seconds in. o.people: everyone standing, as
 * { y: floor line, draw() }, sorted in with the set; o.cheer: 0 to 1, the share of the crowd cheering together
 * (bleachers.js); o.board: what the audience display shows, { rows: eight [captain, pick, pick] ('' for nobody yet),
 * hot: the row being picked for or null, clock: seconds left or null, backups: [numbers] or null }, or nothing for an
 * empty chart; o.talkingTo: the one in the stands being talked to.
 */
export function drawSet(g, view, t, o = {}) {
  if (!layers) makeSetLayers();
  g.drawImage(layers.floor, -view.x, -view.y);
  g.drawImage(layers.near, -view.x, NEAR_TOP - view.y);
  g.save();
  g.translate(0, -view.y);
  drawStands(g, view.x, t, o.talkingTo, { cheer: o.cheer });
  drawWalkway(g, view.x);
  g.restore();
  const more = [
    // The signs sort in just behind the picks standing on the same floor line.
    ...SPOTS.map((_, i) => ({ y: SIGN_Y - 0.25, draw: () => spotSign(i) })),
    { y: MIC.y, draw: micStand },
    { y: REPS_SIGN.y, draw: repsSign },
    { y: BOARD.y, draw: () => board(o.board) },
    { y: BARRIER_Y, draw: barrier },
    ...(o.people ?? []),
  ];
  drawFieldLive(g, view.x, t, { camY: view.y, robots: false, ends: false, nearGate: NEAR_GATE, more });
}

// ---- Where she can walk ----
// The open floor in front of the field and past both ends (stopping 18 pixels short of the world's sides, clear of the
// belt barrier's end posts); on the field, the band in front of the line and the line itself; and the gate joining the
// band to the floor in front. Everything standing in them stops her: the field's
// corner depots and loading stations by the band, the HABs and the cargo ship behind it, the sign posts, the mic, the
// TEAM REPS sign, the display (its legs, and the floor behind its screen, so she's never lost behind it), and anyone
// standing: a box about as wide as a person's shoulders and deeper in front of them than behind, so nobody walks into
// or through anybody and she stops far enough in front of someone that their face clears the top of her head.
const SIDE = 18;
const REGIONS = [
  { x0: SIDE, x1: WORLD.w - SIDE, y0: 147, y1: WALK_MAX_Y },
  { x0: SIDE, x1: 128, y0: 70, y1: WALK_MAX_Y },
  { x0: WORLD.w - 128, x1: WORLD.w - SIDE, y0: 70, y1: WALK_MAX_Y },
  BAND,
  LINE_AREA,
  { x0: NEAR_GATE.x0 + 3, x1: NEAR_GATE.x1 - 3, y0: 138, y1: 149 },
];
const inside = (x, y, r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;

/** Something in the way: feet closer than hx across and hy deep to (x, y) are stopped. */
const stop = (x, y, hx, hy) => ({ x, y, hx, hy });
/** A footprint on the floor (field.js geometry, x0-x1 along, z0-z1 feet deep), with room round it for her feet. */
const footprint = (x0, x1, z0, z1, pad = 5) => {
  const y0 = floorY(z0), y1 = floorY(z1);
  return stop((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2 + pad, (y1 - y0) / 2 + 2);
};
const PROPS = [
  ...['blue', 'red'].flatMap((a) => [
    footprint(mirrorX(a, FIELD.x0, 3.5 * FT), mirrorX(a, FIELD.x0, 3.5 * FT) + 3.5 * FT, 20.6, 22.4), // the near depot
    footprint(mirrorX(a, FIELD.x0, 1.25 * FT), mirrorX(a, FIELD.x0, 1.25 * FT) + 1.25 * FT, 25.25, 27), // loading station
    footprint(mirrorX(a, FIELD.x0, 7.5 * FT), mirrorX(a, FIELD.x0, 7.5 * FT) + 7.5 * FT, 6.7, 20.3), // the HAB
  ]),
  footprint(FIELD.mid - 63, FIELD.mid + 63, 11.2, 15.8), // the cargo ship
  ...SPOTS.map((x) => stop(x + SIGN_POST, SIGN_Y - 1, 6, 2)),
  stop(MIC.x, MIC.y, 7, 2),
  // The end of the pocket in the line behind the mic: she can stand at the mic (4 pixels right of its pole at most),
  // but not in behind MC Robin's spot beside it, where Robin would stand in front of her, turned side-on, to talk.
  stop(MC_HOME.x - 7, LINE_AREA.y1 - 4, 8, 5),
  // The floor behind the backups and the queuer, between them and the near wall: anyone there would be hidden
  // behind them but for the top of her head.
  stop(222, 152, 48, 8),
  stop(REPS_SIGN.x, REPS_SIGN.y - 1, 9, 3),
  ...LEGS.map((x) => stop(x, BOARD.y - 1, 9, 3)),
  // The floor behind the display's screen, from the top of the floor past the end (row 70) to a step in front of its
  // legs, so she stands in front of the screen, never in among its legs.
  stop(BOARD.x, (69 + BOARD.y + 4) / 2, SCR.w / 2 + 6, (BOARD.y + 4 - 69) / 2),
];
/** How far inside something's box (x, y) is: under 1 is in the way. */
const depth = (b, x, y) => Math.max(Math.abs(x - b.x) / b.hx, Math.abs(y - b.y) / b.hy);
/** Whether b stops a step from (x, y) to (nx, ny). Stepping out of something you're already in is always allowed. */
const stops = (b, x, y, nx, ny) => depth(b, nx, ny) < 1 && depth(b, nx, ny) <= depth(b, x, y);

/**
 * Someone standing: 6 pixels behind their feet to 16 in front. She's about 48 pixels tall and their eyes are about 40
 * above their feet, so walking straight up to someone she halts with their face, down to the chin, clear over her
 * head, and whoever she talks to stays in view.
 */
const standing = (p) => stop(p.x, p.y + 5, 12, 11);
/**
 * Someone on the move (Robin, skating the 19-pixel strip in front of the line): a shallower box, 5 pixels behind and
 * 7 in front, so there's always a way past her in front. Stopped for her (p.waiting), Robin's reaches up to 10 in
 * front, so walking up to her she halts with Robin's face, mic and bow tie in view over her head; but never past the
 * strip's last two rows (BAND.y1), so there's still a way past her in front wherever she's stopped.
 */
const moving = (p) => {
  if (!p.waiting) return stop(p.x, p.y + 1, 12, 6);
  const front = Math.min(10, Math.max(7, BAND.y1 - 1 - p.y));
  return stop(p.x, p.y + (front - 6) / 2, 12, (front + 6) / 2);
};

/**
 * Step someone at (x, y) by (dx, dy): along, then across, each as far as allowed, like field.js move(). blockers: the
 * feet { x, y } of everyone else standing about; movers: anyone moving about (stopped by a shallower box). Someone who
 * isn't on any walkable floor yet (put somewhere by hand) walks freely until they are.
 */
export function moveIn(x, y, dx, dy, blockers = [], movers = []) {
  const people = [...blockers.map(standing), ...movers.map(moving)];
  const lost = !REGIONS.some((r) => inside(x, y, r));
  const ok = (fx, fy, nx, ny) => (lost
    ? nx >= SIDE && nx <= WORLD.w - SIDE && ny >= 0 && ny <= WALK_MAX_Y
    : REGIONS.some((r) => inside(nx, ny, r)))
    && !PROPS.some((b) => stops(b, fx, fy, nx, ny)) && !people.some((b) => stops(b, fx, fy, nx, ny));
  // As far as allowed: the whole step, or the furthest eighth of it that's clear.
  const reach = (fx, fy, tx, ty) => {
    for (let k = 8; k > 0; k--) {
      const nx = fx + ((tx - fx) * k) / 8, ny = fy + ((ty - fy) * k) / 8;
      if (ok(fx, fy, nx, ny)) return [nx, ny];
    }
    return [fx, fy];
  };
  const [nx] = reach(x, y, x + dx, y);
  const [, ny] = reach(nx, y, nx, y + dy);
  return [nx, ny];
}
