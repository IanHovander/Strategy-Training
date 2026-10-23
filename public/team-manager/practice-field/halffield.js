// The practice field: half a 2019 field (Deep Space), the blue alliance's, built by team 5026 on the floor of the school
// cafeteria the way teams build their practice fields. It is the arena's field (field.js) at the same scale and in the
// same places relative to its corner, 8 pixels to the foot along and 2.75 to the foot of depth, so the robot's hatch
// meets the rocket's ports here just as it does in the arena. Only the materials change. Where the arena has steel and
// paint, this has what a team can buy at a hardware store: three rolls of grey carpet laid in strips with duct tape over
// the seams and round the edges, white gaffer tape for the lines, plywood for the rocket, the half cargo ship, the HAB
// tops and the loading station, 2x4s for the frames and risers, blue paint and blue tape for the alliance colour, and a
// 2x4 frame for the driver station wall. The game pieces are the real ones: yellow hatch panels and orange cargo, drawn
// by sprites.js and field.js so they're as bright here as in the arena.
// Beside the field is the team's gear: the battery cart against the wall with its chargers blinking, a rack of hatch
// panels by the human player, a laundry basket of cargo, a red tool chest and a rolling whiteboard with the cycle times.
// The carpet, its tape and the depots go once into the room's floor canvas (drawFieldFloor); everything that stands up
// is a { y, draw } to sort back to front with the room and the people (fieldThings), as field.js does. Everything is in
// world pixels, drawn through pixel.js's camera.

import { C, cam, useContext, screen, rect, disk, text, measure, withAlpha, layer, rnd } from '../pixel.js';
import { cargo } from '../sprites.js';
import { hatchFaceOn, hatchOnFace } from '../field.js';
import { FT, DEEP, ROOM, PF, pfY, CARPET, STATION_WALL, LOADING, ROCKET, SHIP, GEAR } from './layout.js';

// ---- Materials ----
// Three tones each, shade to lit, beside pixel.js's palette. Grain and screw heads are a shade darker than their face.
const WOOD = ['#9a6a3a', '#c8955a', '#ebbd82']; // plywood
const LUMBER = ['#8c6a42', '#bf9a66', '#e3c48e']; // 2x4s
const DUCT = ['#5d6580', '#9aa3bd', '#c4cbe0']; // duct tape
const BLUE = [C.blue0, C.blue1, C.blue2, C.blue3]; // blue paint and blue tape
const DARKER = {
  [WOOD[0]]: '#7d5531', [WOOD[1]]: WOOD[0], [WOOD[2]]: WOOD[1],
  [LUMBER[0]]: '#6f5233', [LUMBER[1]]: LUMBER[0], [LUMBER[2]]: LUMBER[1],
};
const HOLE = '#11131c', VELCRO = C.steel0, FUZZ = C.steel1;
const PLASTIC = [C.steel2, C.steel3, C.white]; // the laundry basket
const LED = { red: [C.red0, C.red2], green: ['#1d5e3a', '#5cc38a'] };
/** The carpet's three rolls, each from its own dye lot, each with its own speckles (the first is the arena's carpet). */
const ROLLS = [
  { x0: CARPET.x0, x1: 248, c: '#2b2e3a', s: ['#30333f', '#272a35'] },
  { x0: 248, x1: 344, c: '#2e3140', s: ['#333645', '#2a2d3b'] },
  { x0: 344, x1: CARPET.x1, c: '#292c37', s: ['#2e313c', '#252832'] },
];
/** The carpet and its tape where the sun's patches fall on them (room.js drawSunPatches): one fixed ramp of pale straw
 *  for all three rolls, base to its base and each speckle to a speckle a step lighter or darker, clearly paler and
 *  yellower than any plywood (WOOD), so a patch reads as light lying on the carpet, not a board, and keeps its speckle.
 *  The tiles' patch (room.js) is the same straw a step lighter, so a window's patch is one hue across the carpet's edge.
 *  The white gaffer tape goes whiter still, and the duct tape a warm silver, so the lines still show in the light. */
export const CARPET_IN_SUN = new Map([
  ...ROLLS.flatMap((r) => [[r.c, '#e0cb8c'], [r.s[0], '#ecd99e'], [r.s[1], '#cbb277']]),
  [C.tape, '#fffaf0'], [DUCT[0], '#b9a676'], [DUCT[1], '#f4e7bf'], [DUCT[2], '#fff6dc'],
]);
/** The same in the lower half of a shaft of light (room.js), where it crosses the carpet's far edge: the straw darker. */
export const CARPET_IN_SHAFT = new Map([
  ...ROLLS.flatMap((r) => [[r.c, '#8a7c58'], [r.s[0], '#958662'], [r.s[1], '#7e714f']]),
  [C.tape, '#f6eedc'], [DUCT[0], '#7c7462'], [DUCT[1], '#c4b996'], [DUCT[2], '#e6dbb8'],
]);
/** Which rocket ports are filled, bottom level first; home is the face toward the alliance wall. */
const FILL = { home: [true, false, false], away: [false, false, false], cargo: [true, false, false] };

/** A box standing on the floor between floor lines y0 and y1: its top, then the face toward you, outlined. */
function boxY(x, w, y0, y1, h, top, front, edge) {
  const yTop = y0 - h, yFront = y1 - h, yFloor = y1;
  rect(x - 1, yTop - 1, w + 2, yFloor - yTop + 2, C.ink);
  rect(x, yTop, w, yFront - yTop, top);
  rect(x, yTop, w, 1, edge);
  rect(x, yFront, w, yFloor - yFront, front);
  return { yTop, yFront, yFloor };
}
/** The same on the field, from z0 to z1 feet in from its far edge, like field.js's box(). */
const box = (x, w, z0, z1, h, top, front, edge) => boxY(x, w, pfY(z0), pfY(z1), h, top, front, edge);

/** Sparse grain on a face: a few short runs a shade darker, the same every frame. */
function grain(x, y, w, h, base, seed, every = 30) {
  [x, y, w, h] = [Math.round(x), Math.round(y), Math.round(w), Math.round(h)];
  for (let i = 0, n = Math.floor((w * h) / every); i < n; i++) {
    const len = w > 2 && rnd(seed + i * 7 + 2) < 0.6 ? 2 : 1;
    rect(x + Math.floor(rnd(seed + i * 7) * (w - len + 1)), y + Math.floor(rnd(seed + i * 7 + 1) * h), len, 1, DARKER[base]);
  }
}
/** A column of screw heads down a seam, every `step` pixels. */
function screws(x, y0, y1, base, step = 6) {
  for (let y = Math.round(y0); y < y1; y += step) rect(x, y, 1, 1, DARKER[base]);
}

// ---- The floor, drawn once ----
/** A strip of duct tape: 2 pixels across, lit on its left, with a glint here and there and a nick where strips overlap. */
function ductDown(x, y0, y1, seed) {
  rect(x, y0, 2, y1 - y0, DUCT[0]);
  rect(x, y0, 1, y1 - y0, DUCT[1]);
  for (let y = y0 + 2 + Math.floor(rnd(seed) * 6), i = 0; y < y1 - 3; y += 9 + Math.floor(rnd(seed + i) * 9), i++) {
    rect(x, y, 1, 2 + (i % 2), DUCT[2]);
    if (i % 2) rect(x, y + 5, 2, 1, DUCT[0]);
  }
}
/** The same along: a pixel deep, lit runs and nicks. */
function ductAlong(x0, x1, y, seed) {
  rect(x0, y, x1 - x0, 1, DUCT[1]);
  for (let x = x0 + 3 + Math.floor(rnd(seed) * 8), i = 0; x < x1 - 4; x += 12 + Math.floor(rnd(seed + i) * 14), i++) {
    rect(x, y, 3 + (i % 3), 1, DUCT[2]);
    if (i % 2) rect(x + 8, y, 1, 1, DUCT[0]);
  }
}

/**
 * The carpet, its tape and the depots, into the room's floor canvas (ROOM.w x ROOM.h, world pixels), on top of the
 * tiles and before the sun patches.
 */
export function drawFieldFloor(ctx) {
  const prev = useContext(ctx), saved = { ...cam };
  screen();
  const { x0, x1, y0, y1 } = CARPET, top = Math.round(y0), bottom = Math.round(y1), h = bottom - top;
  // Three 12-foot rolls laid in strips across the field (the last one cut short), each its own dye lot, speckled like
  // the arena's carpet.
  ROLLS.forEach((r, k) => {
    rect(r.x0, top, r.x1 - r.x0, h, r.c);
    for (let i = 0, n = Math.round(((r.x1 - r.x0) * h) / 12); i < n; i++) {
      const s = 20000 + k * 7000 + i;
      rect(r.x0 + Math.floor(rnd(s) * (r.x1 - r.x0)), top + Math.floor(rnd(s + 2300) * h), 1, 1, r.s[rnd(s + 4600) < 0.5 ? 0 : 1]);
    }
  });

  // The blue half's lines in white gaffer tape, laid by hand: the HAB line along the front of level 1 (its last strip
  // started a pixel off), the centre line (in two strips, the top end torn), an alignment line out from the rocket (torn
  // at its end), and alignment lines off the cargo ship's three side bays and its two front bays (one jogs).
  const tape = (x, y, w, hh) => rect(x, y, w, hh, C.tape);
  const habX = PF.x0 + 7.5 * FT, jog = Math.round(pfY(23.2));
  tape(habX, top + 1, 1, jog - top - 1);
  tape(habX + 1, jog, 1, bottom - 1 - jog);
  tape(PF.x1, top + 2, 1, 49);
  tape(PF.x1, top + 52, 1, bottom - top - 53);
  rect(PF.x1 - 1, top + 2, 1, 1, C.tape);
  rect(PF.x1, top + 51, 1, 1, DUCT[2]);
  const rb = Math.round(pfY(ROCKET.z)), len = Math.round(3 * DEEP);
  tape(ROCKET.x, rb, 1, len);
  rect(ROCKET.x + 1, rb + len - 1, 1, 1, C.tape);
  const shipFloor = Math.round(pfY(SHIP.z1));
  SHIP_BAYS.forEach((bx, i) => tape(bx, shipFloor, 1, Math.round(1.5 * DEEP) + (i === 1 ? 1 : 0)));
  const fx = SHIP.x0 - 1.5 * FT;
  tape(fx, Math.round(pfY(12.4)), 1.5 * FT, 1);
  tape(fx + 4, Math.round(pfY(14.6)), 1.5 * FT - 4, 1);
  tape(fx, Math.round(pfY(14.6)) + 1, 4, 1);

  // Duct tape over the two seams and all round the edges, then the carpet's edge where it stands on the tiles.
  for (const [i, sx] of [248, 344].entries()) ductDown(sx - 1, top, bottom, 300 + i * 40);
  ductDown(x0 + 1, top, bottom, 400);
  ductDown(x1 - 2, top, bottom, 440);
  ductAlong(x0, x1, top, 480);
  ductAlong(x0, x1, bottom - 1, 520);
  rect(x0, bottom, x1 - x0 + 1, 1, C.ink);
  rect(x1, top, 1, bottom - top, C.ink);

  // The cargo depots beside the HAB: a low plywood bin of balls on each side of it, as in the arena.
  for (const z of [4.6, 20.6]) {
    const x = PF.x0, w = 3.5 * FT, t = Math.round(pfY(z)), b = Math.round(pfY(z + 1.8));
    rect(x - 1, t - 3, w + 2, b - t + 4, C.ink);
    rect(x, t - 2, w, b - t + 2, WOOD[0]);
    rect(x, t - 2, w, 1, WOOD[2]);
    rect(x, b - 2, w, 2, WOOD[1]);
    rect(x, b - 2, w, 1, WOOD[2]);
    for (let i = 0; i < 6; i++) {
      rect(x + 2 + i * 4, t - 4 + (i % 2), 3, 3, C.ink);
      rect(x + 2 + i * 4, t - 4 + (i % 2), 2, 2, C.org1);
    }
  }
  Object.assign(cam, saved);
  useContext(prev);
}

// ---- The driver station ----
// The wall is edge-on from here, as the arena's alliance wall is: its top is a long band and its near end is the face
// toward you. Homemade, it's a frame of 2x4 posts, one at each end and three between, plywood across the bottom three
// feet and clear polycarbonate above, so the drive team can see the field over it. The band along the top is the 2x4
// rail the posts hold up and the panels hang from, solid lumber outlined in ink like the arena's alliance wall, with a
// joint across it at each post; the near end is clear under the rail, drawn like the arena's clear field walls (light
// blue at 22%, lit on the side toward the light), down to the plywood, which has a strip of blue tape along its top and
// 5026 painted down it. On the drivers' side a plywood shelf at three feet carries the driver station laptop and the
// e-stop. The shelf is drawn a foot at a time, each foot sorted at its own floor line, so the drivers standing at it
// are in front of the part behind them and behind the part in front.
const SHELF = { x0: STATION_WALL.x0 - 7, w: 6, z0: 3.5, z1: 26.6, up: 3 * FT };
// The drive team stands along the shelf and hides most of it, so the laptop sits at its near end, below the
// operator's hands, and the e-stop by the coach at the far end, where they can be seen.
const LAPTOP_Z = 26.2, ESTOP_Z = 5.6;
let painted = null;
/** "5026" in the small font as pixel offsets, so it can be painted down the end of the wall. */
function teamNumber() {
  if (painted) return painted;
  const w = measure('5026', { font: 3 }), l = layer(w, 5, () => text('5026', 0, 0, { font: 3, color: C.white }));
  const d = l.canvas.getContext('2d').getImageData(0, 0, w, 5).data;
  painted = [];
  for (let y = 0; y < 5; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 128) painted.push([x, y]);
  return painted;
}

function stationWall() {
  const { x0, h } = STATION_WALL, w = STATION_WALL.x1 - x0;
  const yTop = Math.round(pfY(0) - h), yFront = Math.round(pfY(27) - h), yFloor = Math.round(pfY(27));
  const ply = Math.round(yFloor - 3 * FT);
  const clear = (y0, y1) => {
    rect(x0 - 1, y0, 1, y1 - y0, C.ink);
    rect(x0 + w, y0, 1, y1 - y0, C.ink);
    withAlpha(0.22, () => rect(x0, y0, w, y1 - y0, C.blue3));
    rect(x0, y0, 1, y1 - y0, C.steel3);
  };
  // The top, end to end: the 2x4 rail the clear panels hang from, lit along its top edge and its left side, shaded down
  // its right, with a joint across it where each post meets it. Its end is a row of end grain, an ink line under it.
  rect(x0 - 1, yTop - 1, w + 2, yFront - yTop + 3, C.ink);
  rect(x0, yTop, w, yFront - yTop, LUMBER[1]);
  rect(x0, yTop, w, 1, LUMBER[2]);
  rect(x0, yTop + 1, 1, yFront - yTop - 1, LUMBER[2]);
  rect(x0 + w - 1, yTop + 1, 1, yFront - yTop - 1, LUMBER[0]);
  for (let z = 6.75; z < 27; z += 6.75) rect(x0 + 1, Math.round(pfY(z) - h), w - 1, 1, LUMBER[0]);
  rect(x0, yFront, w, 1, LUMBER[0]);
  rect(x0, yFront, 1, 1, LUMBER[1]);
  // The near end: clear from under the rail down to the plywood, then the plywood with its tape and the number.
  clear(yFront + 2, ply);
  rect(x0 - 1, ply, w + 2, yFloor - ply + 1, C.ink);
  rect(x0, ply + 1, w, yFloor - ply - 1, WOOD[0]);
  rect(x0, ply + 1, w, 2, BLUE[1]);
  rect(x0, ply + 1, w, 1, BLUE[2]);
  rect(x0, ply + 3, 1, yFloor - ply - 4, WOOD[1]);
  // 5026, painted down the plywood in blue, read top to bottom.
  for (const [px, py] of teamNumber()) rect(x0 + 5 - py, ply + 5 + px, 1, 1, BLUE[1]);
}

/** One foot of the drivers' shelf, from z to z + 1, with whatever stands on it. */
function shelfFoot(z) {
  const { x0, w, z0, z1, up } = SHELF, a = Math.round(pfY(z) - up), b = Math.round(pfY(Math.min(z + 1, z1)) - up);
  rect(x0 - 1, a, 1, b - a, C.ink);
  rect(x0, a, w, b - a, WOOD[1]);
  grain(x0, a, w, b - a, WOOD[1], 1200 + z * 13, 14);
  if (z === z0) {
    rect(x0 - 1, a - 1, w + 1, 1, C.ink);
    rect(x0, a, w, 1, WOOD[2]);
  }
  if (z + 1 >= z1) {
    // The front edge, and the 2x4 leg under it.
    const f = Math.round(pfY(z1)) - up, floor = Math.round(pfY(z1));
    rect(x0 - 1, f, w + 1, 3, C.ink);
    rect(x0, f, w, 1, WOOD[0]);
    rect(x0, f + 2, 4, floor - f - 2, C.ink);
    rect(x0 + 1, f + 2, 2, floor - f - 3, LUMBER[1]);
    rect(x0 + 2, f + 2, 1, floor - f - 3, LUMBER[0]);
  }
  if (z <= LAPTOP_Z && LAPTOP_Z < z + 1) laptop(x0 + 1, Math.round(pfY(LAPTOP_Z) - up));
  if (z <= ESTOP_Z && ESTOP_Z < z + 1) eStop(x0 + 4, Math.round(pfY(ESTOP_Z) - up));
}

/** The driver station laptop, open and turned to the drivers, its screen lit. (x, y): its left end, on the shelf. */
function laptop(x, y) {
  rect(x - 1, y - 9, 7, 8, C.ink);
  rect(x, y - 8, 5, 6, BLUE[2]);
  rect(x, y - 8, 5, 1, BLUE[3]);
  rect(x + 1, y - 6, 3, 1, C.white);
  rect(x + 1, y - 4, 2, 1, BLUE[3]);
  rect(x - 1, y - 2, 7, 3, C.ink);
  rect(x, y - 1, 5, 1, C.steel2);
}

/** The e-stop: a red mushroom button on a yellow box. (x, y): the box's middle, on the shelf. */
function eStop(x, y) {
  rect(x - 2, y - 7, 5, 8, C.ink);
  rect(x - 1, y - 3, 3, 3, C.yel1);
  rect(x - 1, y - 3, 3, 1, C.yel2);
  rect(x - 1, y - 6, 3, 2, C.red1);
  rect(x - 1, y - 6, 1, 1, C.red2);
}

/** The loading station in the far corner: the cargo chute with a ball in it, and a hatch panel waiting in its slot. */
function loadingStation() {
  const { x0, w, z0, z1, h } = LOADING;
  const { yFront, yFloor } = box(x0, w, z0, z1, h, WOOD[1], WOOD[0], BLUE[2]);
  grain(x0, yFront, w, yFloor - yFront, WOOD[0], 1500, 20);
  screws(x0 + 1, yFront + 2, yFloor - 1, WOOD[0], 7);
  const cx = x0 + w / 2;
  // Blue tape across the face between the chute and the slot.
  rect(x0, yFront + 12, w, 2, BLUE[1]);
  rect(x0, yFront + 12, w, 1, BLUE[2]);
  rect(cx - 4, yFront + 3, 8, 7, C.ink);
  rect(cx - 3, yFront + 4, 6, 5, C.org1);
  rect(cx - 3, yFront + 4, 2, 2, C.org2);
  rect(cx - 4, yFloor - 14, 8, 10, C.ink);
  rect(cx - 3, yFloor - 13, 6, 8, C.yel1);
  rect(cx - 3, yFloor - 13, 6, 1, C.yel2);
  rect(cx - 1, yFloor - 10, 2, 2, C.yel0);
}

// ---- The HAB ----
// Plywood platforms screwed down to 2x4 frames, the risers' faces edged with blue tape: the arena's levels, sizes and
// places, the higher levels in lighter wood as the arena's are in lighter steel.
const HAB_TOP = { 1: [WOOD[0], WOOD[1]], 2: [WOOD[1], WOOD[2]], 3: [WOOD[2], C.white] };
function hab() {
  const step = (level, x, w, z0, z1, h) => {
    const [top, edge] = HAB_TOP[level], front = level === 3 ? WOOD[0] : LUMBER[0];
    const { yTop, yFront, yFloor } = box(x, w, z0, z1, h, top, front, edge);
    // Rows of screws where the plywood is fixed to the joists under it, and sparse grain.
    for (let y = Math.round(yTop) + 3, r = 0; y < yFront - 1; y += 4, r++) {
      for (let sx = x + 2 + (r % 2) * 3; sx < x + w - 1; sx += 6) rect(sx, y, 1, 1, DARKER[top]);
    }
    grain(x, yTop + 1, w, yFront - yTop - 1, top, 1700 + level * 50 + z0, 40);
    // The riser: blue tape along its top edge, then the 2x4 (or level 3's plywood), with a screw at each end.
    rect(x, yFront, w, 1, BLUE[1]);
    if (h > 3) {
      rect(x, yFront + 1, w, 1, level === 3 ? WOOD[1] : LUMBER[1]);
      grain(x, yFront + 2, w, yFloor - yFront - 2, front, 1800 + z0, 16);
      for (const sx of [x + 2, x + w - 3]) rect(sx, Math.round(yFront + (yFloor - yFront) / 2), 1, 1, DARKER[front]);
    }
  };
  // Level 1 (3 inches) across the front, level 2 (6) either side of level 3 (19) against the wall.
  step(1, PF.x0 + 4 * FT, 3.5 * FT, 6.7, 20.3, 2);
  step(2, PF.x0, 4 * FT, 7.5, 11.5, 4);
  step(3, PF.x0, 4 * FT, 11.5, 15.5, 13);
  step(2, PF.x0, 4 * FT, 15.5, 19.5, 4);
}

// ---- The cargo ship ----
// This alliance's half, from the centre line back toward the HAB, in plywood: three bays on the side toward you, each
// with a hatch port 19 inches up (a velcro patch round a hole) and the cargo opening above its lip, and from above you
// see into the near and far rows of bays and the front pair. Blue paint along the bottom and on the outer end; the
// centre-line end is the raw edge of the plywood, since the other half is the red alliance's and nobody built it.
const BAY_W = 15;
/** The middles of the three side bays, from the centre line out. */
const SHIP_BAYS = [0, 1, 2].map((i) => SHIP.x1 - 8 - i * BAY_W);
/** What's in the bays: the near side's [cargo, hatch] from the middle out, the far side's cargo, the front pair's. */
const SHIP_FILL = { near: [[1, 1], [0, 1], [0, 0]], far: [1, 1, 0], front: [1, 0] };

/** An empty hatch port on a flat face: a velcro patch round the hole. */
function velcroPort(cx, cy) {
  disk(cx, cy, 5, C.ink);
  disk(cx, cy, 4, VELCRO);
  for (const [dx, dy] of [[-3, -1], [-1, -3], [2, -2], [2, 1], [-2, 2], [0, 3]]) rect(cx + dx, cy + dy, 1, 1, FUZZ);
  disk(cx, cy, 2, HOLE);
}

function cargoShip() {
  const w = SHIP.x1 - SHIP.x0;
  const { yTop, yFront, yFloor } = box(SHIP.x0, w, SHIP.z0, SHIP.z1, SHIP.h, HOLE, WOOD[1], WOOD[2]);
  const deck = yFront - yTop, rowH = Math.floor((deck - 3) / 2);
  // From above: the plywood rims round the bays, a row of bays each side of the middle and the front pair at the end.
  rect(SHIP.x0, yTop, w, 1, WOOD[2]);
  rect(SHIP.x0, yTop + 1 + rowH, w, 1, WOOD[1]);
  rect(SHIP.x0, yFront - 1, w, 1, BLUE[2]);
  const edges = [1, 2, 3].map((i) => SHIP.x1 - 1 - i * BAY_W);
  for (const x of edges) rect(x, yTop, 1, deck, WOOD[1]);
  SHIP_BAYS.forEach((cx, i) => {
    if (SHIP_FILL.far[i]) rect(cx - 2, yTop + 2, 4, rowH - 1, C.org1);
    if (SHIP_FILL.near[i][0]) {
      rect(cx - 2, yTop + 2 + rowH, 4, rowH - 1, C.org1);
      rect(cx - 2, yTop + 2 + rowH, 2, 1, C.org2);
    }
  });
  SHIP_FILL.front.forEach((full, i) => {
    if (full) rect(SHIP.x0 + 5, yTop + 2 + i * (rowH + 1), 4, rowH - 1, C.org1);
  });
  // The side toward you: plywood with its grain and screws, blue paint along the bottom and on the outer end.
  grain(SHIP.x0, yFront, w, yFloor - yFront - 6, WOOD[1], 2100, 26);
  rect(SHIP.x0, yFloor - 6, w, 6, BLUE[0]);
  rect(SHIP.x0, yFloor - 6, w, 1, BLUE[1]);
  rect(SHIP.x0, yFront, 17, yFloor - yFront - 6, BLUE[1]);
  rect(SHIP.x0, yFront, 17, 1, BLUE[2]);
  for (let k = 0; k < 3; k++) rect(SHIP.x0 + 3 + k * 4, yFront + 6 + k * 5, 11 - k * 4, 2, BLUE[2]);
  for (const x of edges) {
    rect(x, yFront, 1, yFloor - yFront - 6, WOOD[0]);
    screws(x + 1, yFront + 3, yFloor - 7, WOOD[1], 7);
  }
  SHIP_BAYS.forEach((cx, i) => {
    const [hasCargo, hasHatch] = SHIP_FILL.near[i], port = yFloor - 12;
    // The cargo opening, above its lip at 31 inches; a ball shows over the lip if one's in.
    rect(cx - 5, yFloor - 31, 10, 10, C.ink);
    rect(cx - 4, yFloor - 30, 8, 8, HOLE);
    if (hasCargo) cargo(cx, yFloor - 24, 3);
    rect(cx - 5, yFloor - 21, 10, 1, WOOD[2]);
    if (hasHatch) hatchFaceOn(cx, port, hasCargo);
    else velcroPort(cx, port);
  });
  // The raw end at the centre line: the plywood's layers, light and dark.
  const end = SHIP.x1 - 2;
  rect(end, yTop, 2, deck, WOOD[2]);
  rect(end, yFront, 2, yFloor - yFront, WOOD[2]);
  for (let y = Math.round(yTop) + 1; y < yFloor - 1; y += 2) rect(end + 1, y, 1, 1, WOOD[0]);
}

// ---- The rocket ----
// The arena's rocket (field.js) built from plywood: the same hull, cone and skirt, so the robot's hatch meets the same
// ports. The hull's three faces are plywood panels screwed to a frame, the lit left face, the middle and the right face
// in shade; the alliance bands are blue paint, the cone is plywood with its tip painted blue, the skirt a 2x4 base.
// Hatch ports on the two angled faces at 19, 47 and 75 inches are velcro patches; round cargo ports up the middle at
// 27, 55 and 83 are holes cut in the plywood.
const HULL = 64, CONE = 9;
const coneW = (i) => Math.max(1, Math.round(14 * Math.sin(((i + 1) / CONE) * (Math.PI / 2)) ** 0.75));

function rocket(fill) {
  const cx = ROCKET.x, b = pfY(ROCKET.z), top = b - HULL, H = HULL - 5;
  // Outlines: the cone, the hull, the skirt.
  for (let i = 0; i < CONE; i++) rect(cx - coneW(i) - 1, top - CONE + i, coneW(i) * 2 + 2, 1, C.ink);
  rect(cx - coneW(0) - 1, top - CONE - 1, coneW(0) * 2 + 2, 1, C.ink);
  rect(cx - 15, top, 30, HULL - 4, C.ink);
  rect(cx - 17, b - 6, 34, 6, C.ink);
  // Nose cone: painted blue at the tip, plywood below, shaded on the right, a glint on the left.
  for (let i = 0; i < CONE; i++) {
    const hw = coneW(i), y = top - CONE + i, tip = i < 3;
    rect(cx - hw, y, hw * 2, 1, tip ? BLUE[1] : WOOD[2]);
    rect(cx + hw - Math.max(1, hw >> 1), y, Math.max(1, hw >> 1), 1, tip ? BLUE[0] : WOOD[1]);
    if (hw > 3) rect(cx - hw + 2, y, 1, 1, tip ? BLUE[2] : C.white);
  }
  // Hull: three plywood panels, the left one lit, the middle mid, the right in shade; the seams between them screwed.
  rect(cx - 14, top, 6, H, WOOD[2]);
  rect(cx - 8, top, 16, H, WOOD[1]);
  rect(cx - 7, top, 1, H, WOOD[2]);
  rect(cx + 8, top, 6, H, WOOD[0]);
  rect(cx + 12, top, 2, H, DARKER[WOOD[0]]);
  rect(cx - 8, top, 1, H, WOOD[0]);
  rect(cx + 8, top, 1, H, DARKER[WOOD[0]]);
  grain(cx - 13, top, 4, H, WOOD[2], 2500, 22);
  grain(cx - 6, top, 13, H, WOOD[1], 2600, 30);
  grain(cx + 9, top, 3, H, WOOD[0], 2700, 22);
  screws(cx - 6, top + 4, b - 6, WOOD[1], 7);
  screws(cx + 6, top + 7, b - 6, WOOD[1], 7);
  // Alliance bands between the levels and round the top, in blue paint (one drip).
  for (const up of [HULL, 45, 26]) {
    rect(cx - 14, b - up, 28, 3, BLUE[1]);
    rect(cx - 14, b - up, 28, 1, BLUE[2]);
    rect(cx + 8, b - up, 6, 3, BLUE[0]);
  }
  rect(cx + 3, b - 45 + 3, 1, 1, BLUE[1]);
  // The skirt: two 2x4s on edge, screwed at the ends.
  rect(cx - 16, b - 5, 32, 5, LUMBER[1]);
  rect(cx - 16, b - 5, 32, 1, LUMBER[2]);
  rect(cx - 16, b - 3, 32, 1, LUMBER[0]);
  rect(cx + 9, b - 4, 7, 4, LUMBER[0]);
  rect(cx + 9, b - 5, 7, 1, LUMBER[1]);
  for (const x of [cx - 14, cx - 2, cx + 13]) rect(x, b - 2, 1, 1, DARKER[LUMBER[1]]);
  // The ports. Home is the left face, toward the alliance wall.
  ROCKET.hatchUp.forEach((up, l) => {
    for (const [x, full] of [[cx - 11, fill.home[l]], [cx + 11, fill.away[l]]]) {
      if (full) hatchOnFace(x, b - up);
      else {
        rect(x - 2, b - up - 5, 4, 10, C.ink);
        rect(x - 1, b - up - 4, 2, 8, VELCRO);
        rect(x - 1, b - up - 3, 1, 1, FUZZ);
        rect(x, b - up, 1, 1, FUZZ);
        rect(x - 1, b - up + 2, 1, 1, FUZZ);
      }
    }
  });
  ROCKET.cargoUp.forEach((up, l) => {
    disk(cx, b - up, 6, C.ink);
    disk(cx, b - up, 5, WOOD[0]);
    rect(cx + 2, b - up + 3, 2, 1, WOOD[2]);
    disk(cx, b - up, 4, C.ink);
    if (fill.cargo[l]) cargo(cx, b - up, 3);
  });
}

// ---- The team's gear ----
/** A robot battery from the front: a black case with its number on white tape, red and black leads off the top. */
function battery(x, y) {
  rect(x - 1, y - 6, 7, 7, C.ink);
  rect(x, y - 5, 5, 5, C.steel0);
  rect(x, y - 5, 5, 1, C.steel1);
  rect(x + 1, y - 3, 2, 1, C.tape);
  rect(x, y - 8, 4, 2, C.ink);
  rect(x + 1, y - 8, 1, 2, C.red1);
  rect(x + 3, y - 7, 1, 1, C.ink);
}

/** The battery cart against the wall: two steel shelves, the charger bank and the tester on top, batteries below. */
function batteryCart(t) {
  const { x0, x1, y0, y1 } = GEAR.batteryCart, w = x1 - x0, HI = 22, LO = 5;
  const b0 = Math.round(y0), b1 = Math.round(y1);
  // The back posts, behind everything.
  for (const px of [x0, x1 - 2]) {
    rect(px - 1, b0 - HI - 1, 4, HI + 1, C.ink);
    rect(px, b0 - HI, 2, HI, C.steel1);
  }
  const shelf = (up) => {
    const s0 = b0 - up, s1 = b1 - up;
    rect(x0 - 1, s0 - 1, w + 2, s1 - s0 + 4, C.ink);
    rect(x0, s0, w, s1 - s0, C.steel1);
    rect(x0, s0, w, 1, C.steel2);
    rect(x0, s1, w, 2, C.steel2);
    rect(x0, s1, w, 1, C.steel3);
    return Math.round((s0 + s1) / 2) + 1;
  };
  // The bottom shelf: six batteries in two rows, the back row peeking over the front.
  const low = shelf(LO);
  for (const bx of [x0 + 5, x0 + 13, x0 + 21]) battery(bx, low - 2);
  for (const bx of [x0 + 2, x0 + 9, x0 + 16, x0 + 23]) battery(bx, low + 1);
  // Leads from the chargers down to the batteries.
  for (const [cx, c] of [[x0 + 4, C.red1], [x0 + 11, C.ink], [x0 + 18, C.red1]]) rect(cx, b1 - HI + 3, 1, HI - LO - 9, c);
  // The front posts and casters.
  for (const px of [x0, x1 - 2]) {
    rect(px - 1, b1 - HI, 4, HI - 1, C.ink);
    rect(px, b1 - HI, 2, HI - 2, C.steel2);
    rect(px, b1 - HI, 1, HI - 2, C.steel3);
    rect(px - 1, b1 - 2, 4, 2, C.ink);
    rect(px, b1 - 2, 2, 1, C.steel2);
  }
  // The top shelf: three chargers, each with its light (red while it charges, blinking; green when it's done), and the
  // battery tester.
  const hi = shelf(HI);
  for (let i = 0; i < 3; i++) {
    const cx = x0 + 2 + i * 7;
    rect(cx - 1, hi - 6, 7, 7, C.ink);
    rect(cx, hi - 5, 5, 5, C.steel1);
    rect(cx, hi - 5, 5, 1, C.steel2);
    rect(cx, hi - 1, 5, 1, C.steel0);
    const done = i === 1, on = done || Math.floor(t * 2 + i * 0.66) % 2 === 0;
    rect(cx + 1, hi - 3, 1, 1, (done ? LED.green : LED.red)[on ? 1 : 0]);
    rect(cx + 3, hi - 3, 1, 1, C.steel2);
  }
  rect(x0 + 23, hi - 5, 7, 6, C.ink);
  rect(x0 + 24, hi - 4, 5, 4, C.yel1);
  rect(x0 + 24, hi - 4, 5, 1, C.yel2);
  rect(x0 + 25, hi - 3, 3, 1, C.steel0);
  rect(x0 + 25, hi - 3, 1, 1, LED.green[1]);
}

/** The rack of hatch panels by the human player: a plywood trough with a 2x4 at each end, four panels on edge. */
function hatchRack() {
  const { x0, x1, y0, y1 } = GEAR.hatchRack, w = x1 - x0, b = Math.round(y1);
  // The back rail between the end posts.
  rect(x0, b - 13, w, 3, C.ink);
  rect(x0 + 1, b - 12, w - 2, 1, LUMBER[0]);
  const base = boxY(x0, w, y0, y1, 4, WOOD[1], WOOD[0], WOOD[2]);
  for (let i = 0; i < 4; i++) {
    rect(x0 + 2 + i * 3, b - 17, 3, 13, C.ink);
    rect(x0 + 3 + i * 3, b - 16, 2, 11, i % 2 ? C.yel1 : C.yel2);
  }
  rect(x0 + 14, b - 17, 1, 13, C.ink);
  // The end posts, then the trough's front over the panels' bottom edges.
  for (const px of [x0, x1 - 2]) {
    rect(px - 1, b - 15, 4, 12, C.ink);
    rect(px, b - 14, 2, 10, LUMBER[1]);
    rect(px, b - 14, 2, 1, LUMBER[2]);
  }
  rect(x0 - 1, base.yFront - 1, w + 2, 1, C.ink);
  rect(x0, base.yFront, w, b - base.yFront, WOOD[0]);
  rect(x0, base.yFront, w, 1, WOOD[1]);
  rect(x0 + 2, base.yFront + 2, 1, 1, DARKER[WOOD[0]]);
  rect(x1 - 3, base.yFront + 2, 1, 1, DARKER[WOOD[0]]);
}

/** A white plastic laundry basket heaped with five balls of cargo. */
function cargoBasket() {
  const { x0, x1, y0, y1 } = GEAR.cargoBasket, w = x1 - x0, H = 8, b = Math.round(y1), back = Math.round(y0);
  rect(x0 - 1, back - H - 1, w + 2, b - back + H + 2, C.ink);
  rect(x0, back - H, w, b - back, C.steel1);
  rect(x0, back - H, w, 1, PLASTIC[2]);
  for (const [bx, by] of [[4, -1], [12, -2], [8, -5], [3, 2], [12, 2]]) cargo(x0 + bx, back - H + by, 3);
  // The front: a rim with hand holds, slots in rows.
  rect(x0 - 1, b - H - 1, w + 2, H + 1, C.ink);
  rect(x0, b - H, w, H - 1, PLASTIC[1]);
  rect(x0, b - H, w, 1, PLASTIC[2]);
  rect(x0 + 1, b - H + 1, 3, 1, C.ink);
  rect(x1 - 4, b - H + 1, 3, 1, C.ink);
  for (let r = 0; r < 2; r++) {
    for (let sx = x0 + 2 + r; sx < x1 - 2; sx += 3) rect(sx, b - H + 3 + r * 2, 1, 1, PLASTIC[0]);
  }
  rect(x0, b - 2, w, 1, PLASTIC[0]);
}

/** The red rolling tool chest: drawers with steel handles, a push handle on its side, casters. */
function toolChest() {
  const { x0, x1, y0, y1 } = GEAR.toolChest, w = x1 - x0, H = 28, b = Math.round(y1);
  const { yFront } = boxY(x0, w, y0 - 2, y1 - 2, H, C.red2, C.red1, C.red3);
  const f = Math.round(yFront);
  // The lid, then five drawers, deeper toward the bottom, each with its handle.
  rect(x0, f, w, 1, C.red2);
  let y = f + 3;
  for (const dh of [3, 4, 4, 5, 6]) {
    rect(x0, y, w, 1, C.red0);
    rect(x0 + 4, y + 2, w - 8, 1, C.steel3);
    rect(x0 + 4, y + 3, w - 8, 1, C.red0);
    y += dh;
  }
  rect(x0 + 1, f + 1, 2, 1, C.red3);
  rect(x0, b - 4, w, 1, C.red0);
  // The push handle off its right side.
  rect(x1, f + 3, 3, 9, C.ink);
  rect(x1 + 1, f + 4, 1, 7, C.steel3);
  // Casters.
  for (const cx of [x0 + 1, x1 - 4]) {
    rect(cx - 1, b - 3, 5, 3, C.ink);
    rect(cx, b - 2, 3, 1, C.steel2);
  }
}

/** The rolling whiteboard: a steel frame on casters, the board facing you with the half field and the cycle times. */
function whiteboard() {
  const { x0, x1, y0, y1 } = GEAR.whiteboard, b = Math.round(y1), bt = b - 48, bb = b - 22;
  // The feet, front to back at each end, each on two casters.
  for (const fx of [x0 + 1, x1 - 2]) {
    rect(fx - 3, b - 5, 7, 4, C.ink);
    rect(fx - 2, b - 4, 5, 2, C.steel2);
    rect(fx - 2, b - 4, 5, 1, C.steel3);
    for (const cx of [fx - 3, fx + 2]) rect(cx, b - 1, 2, 1, C.ink);
  }
  // The uprights, and the board between them.
  for (const px of [x0 + 1, x1 - 2]) {
    rect(px - 1, bt - 3, 3, b - bt + 1, C.ink);
    rect(px, bt - 2, 1, b - bt - 1, C.steel3);
  }
  rect(x0 + 2, bt, x1 - x0 - 4, bb - bt, C.ink);
  rect(x0 + 3, bt + 1, x1 - x0 - 6, bb - bt - 2, C.steel2);
  rect(x0 + 3, bt + 1, x1 - x0 - 6, 1, C.steel3);
  const L = x0 + 4, T = bt + 2, R = x1 - 4, B = bb - 2;
  rect(L, T, R - L, B - T, C.white);
  rect(L, B - 1, R - L, 1, C.tape);
  // The marker tray, with a red and a blue marker.
  rect(x0 + 3, bb, x1 - x0 - 6, 2, C.ink);
  rect(x0 + 4, bb, x1 - x0 - 8, 1, C.steel2);
  rect(x0 + 7, bb - 1, 3, 1, C.red1);
  rect(x0 + 11, bb - 1, 3, 1, BLUE[1]);
  // The half field sketched in blue (the HAB, the rocket, the cargo ship), the robot's run in red.
  const sx = L + 1, sy = T + 2;
  rect(sx, sy, 9, 1, BLUE[1]);
  rect(sx, sy + 8, 9, 1, BLUE[1]);
  rect(sx, sy, 1, 9, BLUE[1]);
  rect(sx + 8, sy, 1, 9, BLUE[1]);
  rect(sx + 1, sy + 3, 2, 3, BLUE[1]);
  rect(sx + 6, sy + 1, 1, 2, BLUE[1]);
  rect(sx + 5, sy + 5, 3, 1, BLUE[1]);
  for (let i = 0; i < 2; i++) rect(sx + 2 + i * 2, sy + 2, 1, 1, C.red1);
  rect(sx + 6, sy + 3, 1, 1, C.red1);
  rect(sx + 1, sy + 12, 4, 1, C.red1);
  rect(sx + 5, sy + 13, 1, 1, C.red1);
  rect(sx + 1, sy + 15, 6, 1, BLUE[1]);
  // The cycle times in black marker, the best one underlined in red.
  ['9.2', '11.0', '10.4'].forEach((s, i) => text(s, R - 1, T + 1 + i * 7, { font: 3, color: C.ink, align: 'right' }));
  rect(R - 12, T + 6, 11, 1, C.red1);
}

// ---- Everything that stands up ----
/**
 * The field's pieces and the team's gear, to sort back to front with everything else: [{ y, draw }], y the floor line
 * each sorts by. The caller sets useContext(g) and camera(view.x, view.y, 1) before each draw(). o.fill: which rocket
 * ports are filled, { home, away, cargo }, three booleans each, bottom level first (home is the left face). o.who:
 * anyone walking behind the field, as world rectangles { x0, x1, y1 } (y1 their feet); the rocket goes see-through
 * when it hides one, as in the arena. o.hero counts too.
 */
export function fieldThings(g, view, t, o = {}) {
  const fill = o.fill ?? FILL;
  const who = [...(o.who ?? []), ...(o.hero ? [{ x0: o.hero.x - 5, x1: o.hero.x + 5, y1: o.hero.y }] : [])];
  const rb = pfY(ROCKET.z), rTop = rb - HULL - CONE;
  // The hull's outline runs from 15 left of the middle to 14 right; the skirt is wider, but below the feet of anyone
  // behind it, so the hull is what hides them.
  const hides = who.some((w) => w.y1 < rb && w.y1 > rTop && w.x1 >= ROCKET.x - 15 && w.x0 <= ROCKET.x + 14);
  const feet = [];
  for (let z = SHELF.z0; z < SHELF.z1; z++) feet.push({ y: pfY(Math.min(z + 1, SHELF.z1)), draw: () => shelfFoot(z) });
  return [
    { y: pfY(27), draw: stationWall },
    ...feet,
    { y: pfY(LOADING.z1), draw: loadingStation },
    { y: pfY(20.3), draw: hab },
    { y: rb, draw: () => (hides ? withAlpha(0.35, () => rocket(fill)) : rocket(fill)) },
    { y: pfY(SHIP.z1), draw: cargoShip },
    // Against the wall nothing can stand behind it, so it sorts at the wall: anyone beside it is in front of it.
    { y: ROOM.wallY, draw: () => batteryCart(t) },
    { y: GEAR.hatchRack.y1, draw: hatchRack },
    { y: GEAR.cargoBasket.y1, draw: cargoBasket },
    { y: GEAR.toolChest.y1, draw: toolChest },
    { y: GEAR.whiteboard.y1, draw: whiteboard },
  ];
}

/**
 * Where she can't walk: the carpet and the driver station wall as one block (the robot is always running), the
 * drivers' shelf, and every piece of gear's footprint. { x0, x1, y0, y1 } in world pixels, y the floor lines. The
 * whiteboard's runs back to the wall: behind it she'd vanish but for her legs, and there's nothing back there.
 */
export const FIELD_BLOCKS = [
  { x0: STATION_WALL.x0, x1: CARPET.x1, y0: CARPET.y0, y1: CARPET.y1 },
  { x0: SHELF.x0, x1: STATION_WALL.x0, y0: pfY(SHELF.z0), y1: pfY(SHELF.z1) },
  ...Object.entries(GEAR).map(([id, { x0, x1, y0, y1 }]) => ({ x0, x1, y0: id === 'whiteboard' ? ROOM.wallY : y0, y1 })),
];
