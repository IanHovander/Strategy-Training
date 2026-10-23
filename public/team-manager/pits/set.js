// The pits: one row of eight team pits along the back of the event hall on Saturday morning, seen from the main aisle in
// front of them by the walker's camera. It's the arena's projection exactly (field.js): 8 pixels to the foot across,
// 2.75 pixels to the foot of depth (the camera looks down at 20 degrees) and 8 pixels to the foot of height, so the
// people, the robots and their carts are the same size here as on the field. The hall is 832 pixels long, three and a
// bit screens, and the view slides along it.
//
// From the back: the hall wall up in the dark with a lighting truss, then 8-foot pipe and drape in the stands' dim navy
// (pixel.js stand0-2) the length of the row. Each pit is 10 feet square on interlocking foam tiles with a binding in the
// team's colour along its front edge. On the drape hangs the team's banner: number and name in its own colours (cast.js
// tones, the colours of its shirts). 3-foot side drapes, seen end-on, divide the pits. In each pit, against the back: a
// battery cart with batteries charging, a plywood work table skirted in team colours with laptops, parts bins and tools
// on it, and a rolling tool chest; mirrored pits swap the cart and the chest. In the middle stands the robot on its cart,
// the intro's own sprites (sprites.js) on the queue's own dolly (field.js robotCart). Where the robot's away, a whiteboard
// on an easel stands on its taped-out spot: IN QUEUE or ON FIELD and the match (5026's waits folded against its table
// till the robot rolls out). The left end of the hall is the SPARE PARTS counter with a pegboard behind it; the right
// end is the PIT ADMIN desk (the pit announcer), the safety glasses station and the way out to the field, with the
// arena's QUEUE sign pointing to it. The aisle in front is the arena's concrete, marked like the arena's floor with
// dashed yellow lines (a lane down the middle, the edge near you), with a couple of floor boxes the pits' power comes
// from.
//
// The way in and out. The row is closed off at each end by an end drape, the back drape's full height, seen end-on like
// the side drapes, from the back as far as the aisle; the aisle runs on past both, out of the hall. You come in along
// it from the left, from the rest of the hall, and leave along it at the right, to the field: there the arena's light
// comes in through the opening and lies on the concrete in two hard-edged steps, fanning out from it (the dashed lines
// pale where it falls on them), and the QUEUE sign stands at the aisle's near edge pointing on. EXIT is the walking
// part's way out (stage.js scene.exit).
//
// It's drawn like the arena: the floor once into a layer, the hall wall, drapes and banners once into another, then
// everything that stands up back to front by its floor line, with the people sorted in. Boxes are field.js boxes (the
// top face lighter, the face toward you darker, an ink outline round it all and a lit line along the top edge); the
// light comes from the upper left. The hall and the drapes are kept dim so the team colours, the robots and the light
// steel carry the contrast. Everything is in world pixels, drawn through pixel.js's camera, so it works zoomed in too.

import { C, useContext, camera, rect, disk, text, layer, blit, rnd } from '../pixel.js';
import { tones } from '../cast.js';
import { eleBot, armBot, defBot } from '../sprites.js';
import { robotCart } from '../field.js';
import { TEAMS, ROW } from './teams.js';

export const WORLD = { w: 832, h: 144 };
/** Pixels a foot across, a foot of depth, and the back drape's floor line. */
export const FT = 8, DEEP = 2.75, BACK = 72;
/** The floor line this many feet out from the back drape. */
export const floorY = (z) => BACK + z * DEEP;

/** The end drapes' lines across, left and right: the row of pits is between them. */
const END_X = [2, 830];
const CONCRETE = '#353a4c', SPECKS = ['#3b4154', '#30354a']; // the arena's floor (field.js, bleachers.js)
/**
 * The arena's light on the aisle at the way out, like the sun through the practice field's side doors: two flat steps
 * of lit concrete (a ramp beside CONCRETE, toward the arena's steel), the bright one by the opening, a two-pixel checker
 * between them and at the far edge. It lies on the floor of the opening, from the right end drape's front post (y0) to
 * the near edge of the picture: `reach` pixels in from the right edge, the bright step `step`, and a pixel further for
 * every 1 / fan rows nearer you, so it fans out from the opening. Each step has its specks (lighter, darker), as sparse
 * as the concrete's and as small a step off it (`speck`: the share of its pixels that are one or the other), and the
 * dashed lines it falls on are lit with it: pale yellow in the bright step, checkered with the lines' own yellow
 * between the steps.
 */
const LIGHT = {
  y0: 101, reach: 46, step: 18, fan: 0.5, speck: 0.025,
  hi: ['#59627c', '#5f6883', '#545c76'], lo: ['#454c63', '#4b5269', '#40475d'],
};
/**
 * The way out, for the walking part (stage.js scene.exit): once her feet are past x, anywhere across the aisle, from its
 * back edge (just in front of the right end drape's post, the way she passes every side drape's along the row) to its
 * near edge, she walks on out along it to the field. Behind the aisle the floor stops short of x (open()), so past x
 * she's always in it. The arrow sits low in the aisle's back half, clear of the desk, the glasses stand and the QUEUE
 * sign.
 */
export const EXIT = { x: 818, y0: 100, y1: 138, label: 'TO THE FIELD', sign: { y: 106 } };
/** The aisle's dashed lines (the lane, the near edge), and its floor boxes: [x, y, the x their cable runs up to a pit at]. */
const LANE_Y = 121, EDGE_Y = 140, FLOOR_BOXES = [[278, 112, 300], [692, 113, 676]];
const INSIDE = '#181b29'; // the dark inside of a bin
const PLY = tones.khaki; // plywood: shade, face, lit
const WHITEBOARD = '#f4f6fb', LENS = '#cfe6ff', LED_FULL = '#5cc38a';
// Materials as [shade, mid, lit, highlight].
const STEEL = [C.steel0, C.steel1, C.steel2, C.steel3];
const BLACK = [...tones.black, '#5a5e6c'];
const RED = ['#5e0d17', '#a1172a', '#d3212f', C.red2];
const BINS = [[C.org0, C.org1, C.org2], [C.blue0, C.blue1, C.blue2], [C.steel1, C.steel2, C.steel3], [C.yel0, C.yel1, C.yel2]];

// ---- The pits ----
// Left to right. state: 'busy' (the robot's here, being worked on), 'queue' or 'field' (it's away: the board says where).
// match: the match it's away for; 5026's is the match it's about to be called for. bot: what stands on the cart.
// mirrored: the battery cart on the right and the tool chest on the left.
const STATE = {
  3000: { state: 'field', match: 42, bot: null, mirrored: false },
  1024: { state: 'busy', match: null, bot: { bot: 'arm', team: 'red', rsl: false }, mirrored: true }, // off: Ruth's hands are in it
  7777: { state: 'field', match: 42, bot: null, mirrored: false },
  4000: { state: 'busy', match: null, bot: { bot: 'ele', team: 'red', rsl: false }, mirrored: true },
  2468: { state: 'queue', match: 43, bot: null, mirrored: false },
  6060: { state: 'busy', match: null, bot: { bot: 'def', team: 'red', rsl: true }, mirrored: false },
  5026: { state: 'busy', match: 44, bot: { bot: 'ele', team: 'blue', rsl: false }, mirrored: false },
  1357: { state: 'queue', match: 43, bot: null, mirrored: true },
};
export const PITS = ROW.map((num, i) => {
  const x0 = 96 + 80 * i;
  return { i, num, name: TEAMS[num].name, tone: TEAMS[num].tone, x0, x1: x0 + 80, mid: x0 + 40, cart: { x: x0 + 40, y: 90 }, ...STATE[num] };
});

// What's in each pit besides the robot: the tool chest's finish and what's on the table, as [thing, x from the table's
// left end, how far back on the table top (0 back .. 6 front)].
const DRESS = {
  3000: { chest: 'steel', table: [['bins', 3, 2], ['shut', 13, 4], ['tape', 30, 3]] },
  1024: { chest: 'black', table: [['laptop', 4, 3], ['drill', 18, 5], ['bins', 30, 2]] },
  7777: { chest: 'red', table: [['shut', 4, 4], ['bins', 20, 2], ['tape', 31, 4]] },
  4000: { chest: 'steel', table: [['tv', 5, 2], ['laptop', 23, 4], ['drill', 33, 5]] },
  2468: { chest: 'red', table: [['shut', 14, 4], ['bins', 30, 2]] },
  6060: { chest: 'black', table: [['bins', 3, 2], ['laptop', 15, 3, 'code'], ['tape', 31, 4]] },
  5026: { chest: 'black', table: [['laptop', 5, 3, 'cursor'], ['bins', 20, 2], ['drill', 31, 5]] },
  1357: { chest: 'steel', table: [['bins', 3, 2], ['shut', 13, 3], ['buttons', 30, 5]] },
};
// Where the furniture stands in a pit (x from its left edge), standard and mirrored.
const LAYOUT = { table: [22, 20], chest: [64, 3], battery: [3, 62] };
const at = (p, what) => p.x0 + LAYOUT[what][p.mirrored ? 1 : 0];

/** A box standing on the floor: its top, then the face toward you, outlined. x, w across; z0-z1 feet out from the drape. */
function box(x, w, z0, z1, h, top, front, edge) {
  const yTop = Math.round(floorY(z0) - h), yFront = Math.round(floorY(z1) - h), yFloor = Math.round(floorY(z1));
  rect(x - 1, yTop - 1, w + 2, yFloor - yTop + 2, C.ink);
  rect(x, yTop, w, yFront - yTop, top);
  rect(x, yTop, w, 1, edge);
  rect(x, yFront, w, yFloor - yFront, front);
  return { yTop, yFront, yFloor };
}

// ---- The floor, drawn once ----
function drawFloor() {
  // The arena's concrete everywhere, speckled the same way.
  rect(0, BACK, WORLD.w, WORLD.h - BACK, CONCRETE);
  for (let i = 0; i < 1500; i++) {
    rect(Math.floor(rnd(i + 9000) * WORLD.w), BACK + Math.floor(rnd(i + 9500) * (WORLD.h - BACK)), 1, 1, rnd(i + 9900) < 0.5 ? SPECKS[0] : SPECKS[1]);
  }
  for (const p of PITS) {
    // Interlocking foam tiles, two feet square: dotted seams, a lighter dot where four tiles meet.
    rect(p.x0, BACK, 80, 28, C.carpet0);
    for (let x = p.x0 + 8; x < p.x1; x += 16) for (let y = BACK + 1; y < 99; y += 2) rect(x, y, 1, 1, C.carpet1);
    for (const z of [2, 4, 6, 8]) {
      const y = Math.round(floorY(z));
      for (let x = p.x0 + 2; x < p.x1 - 1; x += 3) rect(x, y, 1, 1, C.carpet1);
      for (let x = p.x0 + 8; x < p.x1; x += 16) rect(x, y, 1, 1, C.carpet2);
    }
    for (let i = 0; i < 40; i++) rect(p.x0 + Math.floor(rnd(p.i * 97 + i) * 80), BACK + Math.floor(rnd(p.i * 97 + i + 50) * 27), 1, 1, C.carpet1);
    // The drape's shadow along the back, and the binding along the front edge in the team's colour.
    rect(p.x0, BACK, 80, 1, C.ink);
    rect(p.x0, 99, 80, 1, p.tone[1]);
    // The cart's spot, taped out.
    const x0 = p.x0 + 20, y0 = 83;
    rect(x0, y0, 41, 1, C.steel2);
    rect(x0, 90, 41, 1, C.steel2);
    rect(x0, y0, 1, 8, C.steel2);
    rect(x0 + 40, y0, 1, 8, C.steel2);
  }
  // The arena's light through the way out, a pixel at a time: which step (u pixels in from the edge, less the fan), and
  // now and then one of its specks.
  const { y0, reach, step, fan, speck, hi, lo } = LIGHT;
  /** Which step of the light (x, y) is in: hi, lo or null (none). */
  const lit = (x, y) => {
    if (y < y0) return null;
    const u = WORLD.w - 1 - x - Math.floor(fan * (y - y0)), even = (x + y) % 2 === 0;
    return u < step ? hi : u < step + 2 ? (even ? lo : hi) : u < reach - 2 ? lo : u < reach && !even ? lo : null;
  };
  for (let y = y0; y < WORLD.h; y++) {
    for (let x = WORLD.w - reach - Math.ceil(fan * (WORLD.h - y0)); x < WORLD.w; x++) {
      const tone = lit(x, y);
      if (!tone) continue;
      const k = rnd(x * 7 + y * 131 + 5000);
      rect(x, y, 1, 1, k < speck / 2 ? tone[1] : k < speck ? tone[2] : tone[0]);
    }
  }
  // Dashed yellow lines on the concrete, the arena's queue lines exactly (3 pixels on, 1 off): a lane down the middle of
  // the aisle and its near edge, running on off both ends of the picture with the aisle (the rhythm starts off the left
  // edge, so the first gap there is a pixel like every other), pale where the bright step of the light falls on them. Then the floor boxes the pits'
  // power comes from: a steel plate flush with the floor, lit along its top edge, its lid's screws, and the black cable
  // from it taped down across to the pit it feeds.
  for (const y of [LANE_Y, EDGE_Y]) {
    for (let x = -2; x < WORLD.w; x += 4) {
      for (let i = 0; i < 3 && x + i < WORLD.w; i++) rect(x + i, y, 1, 1, lit(x + i, y) === hi ? C.yel2 : C.yel1);
    }
  }
  for (const [x, y, to] of FLOOR_BOXES) {
    rect(to - 1, 100, 3, y - 100, C.ink);
    rect(to, 100, 1, y - 100, C.steel0);
    rect(Math.min(x, to) + 1, y - 1, Math.abs(to - x), 3, C.ink);
    rect(Math.min(x, to) + 1, y, Math.abs(to - x), 1, C.steel0);
    rect(x - 1, y - 2, 14, 6, C.ink);
    rect(x, y - 1, 12, 4, C.steel1);
    rect(x, y - 1, 12, 1, C.steel2);
    for (const sx of [x + 1, x + 10]) rect(sx, y + 1, 1, 1, C.steel3);
  }
}

// ---- The hall wall, the drapes and everything hanging on them, drawn once ----
// The 5026 badge: the panther in a hexagon, white with the panther's face in ink (yellow eyes), like the teammate's hoodie badge.
const BADGE = [
  '....kkk....',
  '..kkWWWkk..',
  'kkWWWWWWWkk',
  'kWkkWWWkkWk',
  'kWkkkkkkkWk',
  'kWkykkkykWk',
  'kWkkkkkkkWk',
  'kWWkkWkkWWk',
  'kWWWkkkWWWk',
  'kWWWWkWWWWk',
  'kkWWWWWWWkk',
  '..kkWWWkk..',
  '....kkk....',
];

function banner(p) {
  // It hangs a little under the pipe, so its top edge shows under a cut scene's film bars (12 pixels), and its name is
  // clear of the tallest robot on its cart (the elevator's mast top is at y 34). The far wall is kept dim so the action
  // on the floor reads, so the banner's cloth is the team's darkest tone, lit along its top edge in the middle one, and
  // only its number and name carry. A white team's banner is in steel with its number in white and its name in ink, so
  // it isn't the brightest thing on the drape either.
  const x = p.x0 + 8, y = 12, w = 64, h = 24, steel = p.num === '3000';
  const [cloth, lit] = steel ? [C.steel2, C.steel3] : [p.tone[0], p.tone[1]];
  // Zip-tied to the pipe at the grommets.
  for (const tx of [x + 3, x + w - 4]) rect(tx, 9, 1, y - 9, C.steel1);
  rect(x, y, w, h, C.ink);
  rect(x + 1, y + 1, w - 2, h - 2, cloth);
  rect(x + 1, y + 1, w - 2, 1, lit);
  if (steel) rect(x + 1, y + h - 2, w - 2, 1, C.steel1);
  for (const gx of [x + 3, x + w - 4]) rect(gx, y + 2, 1, 1, C.steel3);
  // The number flat in the colour their shirts print it in, like the bumpers' numbers and the QUEUE sign's (1357 prints
  // in ink, which would be lost on dark orange, so theirs is in the orange's lit tone); the name under it.
  const num = steel ? C.white : p.num === '1357' ? tones.shirtOrange[2] : TEAMS[p.num].print;
  if (p.num === '5026') {
    BADGE.forEach((row, r) => [...row].forEach((ch, c) => {
      if (ch !== '.') rect(x + 2 + c, y + 2 + r, 1, 1, { W: C.white, y: C.yel1 }[ch] ?? C.ink);
    }));
    text(p.num, x + 15, y + 2, { scale: 2, color: num });
  } else text(p.num, x + w / 2, y + 2, { scale: 2, color: num, align: 'center' });
  text(p.name, x + w / 2, y + 17, { font: 3, color: steel ? C.ink : C.white, align: 'center' });
}

/** The pegboard behind the spare parts counter, with spares hanging on it. */
function pegboard() {
  const x0 = 14, x1 = 84, y0 = 16, y1 = 52;
  rect(x0 - 1, y0 - 1, x1 - x0 + 2, y1 - y0 + 2, C.ink);
  rect(x0, y0, x1 - x0, y1 - y0, C.steel1);
  rect(x0, y0, x1 - x0, 1, C.steel2);
  for (let y = y0 + 2; y < y1 - 1; y += 3) for (let x = x0 + 2; x < x1 - 1; x += 3) rect(x, y, 1, 1, C.steel0);
  // Wrenches, a coil of wire, hex shaft, a sprocket, chain and zip ties, each on its hook (the chain clear of the head of
  // the volunteer standing in front).
  for (const [x, len] of [[19, 9], [22, 11], [25, 13]]) {
    rect(x - 1, 20, 3, len + 1, C.ink);
    rect(x, 21, 1, len - 1, C.steel3);
    rect(x - 1, 19, 3, 3, C.ink);
    rect(x - 1, 20, 1, 1, C.steel3);
    rect(x + 1, 20, 1, 1, C.steel3);
  }
  // Two spools of wire, round: the coil in its colour, lit on its upper left, and the spool's hub.
  for (const [x, y, c, lit, shade] of [[36, 25, C.red1, C.red2, C.red0], [36, 38, C.blue1, C.blue2, C.blue0]]) {
    disk(x, y, 5, C.ink);
    disk(x, y, 4, c);
    rect(x + 1, y + 2, 2, 1, shade);
    rect(x + 2, y, 1, 2, shade);
    rect(x - 3, y - 2, 1, 2, lit);
    rect(x - 2, y - 3, 2, 1, lit);
    rect(x - 1, y - 1, 2, 2, C.ink);
  }
  for (let i = 0; i < 4; i++) {
    rect(64 + i * 3, 19, 3, 10, C.ink);
    rect(65 + i * 3, 20, 1, 8, i % 2 ? C.steel2 : C.steel3);
  }
  // The sprocket, under the hex shaft and clear of the bins on the counter: a steel disk with a tooth every 45 degrees
  // round its rim, lit on its upper left, shaded on its lower right, and its bore.
  const [sx, sy, r] = [71, 37, 5];
  const teeth = Array.from({ length: 8 }, (_, k) => [Math.round(sx - 0.5 + Math.cos((k * Math.PI) / 4) * (r + 0.5)), Math.round(sy - 0.5 + Math.sin((k * Math.PI) / 4) * (r + 0.5))]);
  for (const [tx, ty] of teeth) rect(tx - 1, ty - 1, 3, 3, C.ink);
  disk(sx, sy, r, C.ink);
  for (const [tx, ty] of teeth) rect(tx, ty, 1, 1, C.steel2);
  disk(sx, sy, r - 1, C.steel2);
  rect(sx - 4, sy - 2, 1, 2, C.steel3);
  rect(sx - 3, sy - 3, 1, 1, C.steel3);
  rect(sx - 2, sy - 4, 2, 1, C.steel3);
  rect(sx + 1, sy + 2, 2, 1, C.steel1);
  rect(sx + 2, sy + 1, 1, 1, C.steel1);
  rect(sx - 2, sy - 2, 3, 3, C.ink);
  // The chain: links zigzagging down from its hook, each outlined in ink (all the outlines first, so no link's outline
  // cuts into the one above it), and every other link lit on its upper left, like everything on the board.
  for (let y = 22; y < 48; y += 2) rect(58 + ((y >> 1) % 2), y - 1, 4, 4, C.ink);
  for (let y = 22; y < 48; y += 2) {
    rect(59 + ((y >> 1) % 2), y, 2, 2, C.steel2);
    if ((y >> 1) % 2 === 0) rect(59, y, 1, 1, C.steel3);
  }
  rect(54, 20, 4, 14, C.ink);
  rect(55, 21, 2, 12, C.white);
  rect(55, 21, 1, 12, C.steel3);
}

// Sponsor boards, hung on the drape under some teams' banners over their battery carts: a foam board with each
// sponsor's mark and name (made-up firms). Small, and light steel rather than white, so the banners above and the
// whiteboards on the floor still lead. [pit, marks]; a mark is [shape, colour, name], shape 'hex' or 'square'.
const SPONSORS = {
  4000: [['hex', C.org1, 'HEX']], // short, so its mark clears the elevator's mast
  2468: [['square', tones.shirtGreen[1], 'CNC'], ['hex', C.blue1, 'MAX']],
  6060: [['square', C.red1, 'PIE']],
};
const HEX = ['.###.', '#####', '#####', '#####', '.###.'];

/** One pit's sponsor board, its marks side by side, against the side drape over the battery cart. */
function sponsorBoard(p) {
  const marks = SPONSORS[p.num], gap = 3;
  const w = marks.reduce((n, [, , name]) => n + 6 + name.length * 4, 0) + (marks.length - 1) * gap + 3;
  const x = p.mirrored ? p.x1 - 3 - w : p.x0 + 3, y = 38;
  rect(x - 1, y - 1, w + 2, 9, C.ink);
  rect(x, y, w, 7, C.steel3);
  rect(x, y + 6, w, 1, C.steel2);
  let mx = x + 2;
  for (const [shape, colour, name] of marks) {
    if (shape === 'square') rect(mx, y + 1, 5, 5, colour);
    else HEX.forEach((row, r) => [...row].forEach((ch, c) => ch === '#' && rect(mx + c, y + 1 + r, 1, 1, colour)));
    text(name, mx + 6, y + 1, { font: 3, color: C.ink });
    mx += 6 + name.length * 4 + gap;
  }
}

/** The match monitor hanging over the pit admin desk: what's on the field and what's next. */
function monitor(t) {
  const x = 754, y = 13;
  for (const tx of [x + 4, x + 28]) rect(tx, 9, 1, 4, C.steel1);
  rect(x, y, 34, 17, C.ink);
  rect(x + 1, y + 1, 32, 15, C.blue0);
  rect(x + 1, y + 1, 32, 1, '#2a3a8a');
  text('NOW 42', x + 3, y + 3, { font: 3, color: C.white });
  text('NEXT 43', x + 3, y + 10, { font: 3, color: C.yel1 });
  if (Math.floor(t * 1.5) % 2 === 0) rect(x + 29, y + 4, 2, 2, C.red1);
}

function drawBack() {
  // The hall wall up in the dark: a lighting truss with a lamp every so often.
  rect(0, 0, WORLD.w, 9, C.stand0);
  rect(0, 1, WORLD.w, 1, C.steel1);
  rect(0, 4, WORLD.w, 1, C.steel0);
  for (let x = 0; x < WORLD.w; x += 4) rect(x + ((x >> 2) % 2 ? 2 : 0), (x >> 2) % 2 ? 2 : 3, 1, 1, C.steel0);
  for (let x = 30; x < WORLD.w; x += 64) {
    rect(x - 1, 5, 3, 1, C.ink);
    rect(x, 5, 1, 1, C.yel2);
  }
  // The back drape: dim navy hanging in folds from its pipe, the hem in shade on the floor, from end drape to end drape.
  rect(0, 9, WORLD.w, 63, C.stand1);
  for (let x = 3; x < WORLD.w - 2; x += 5 + Math.floor(rnd(x + 40) * 3)) {
    rect(x, 9, 1, 62, C.stand2);
    rect(x + 2, 9, 1, 62, C.stand0);
  }
  rect(0, 71, WORLD.w, 1, C.stand0);
  rect(0, 7, WORLD.w, 1, C.steel2);
  rect(0, 8, WORLD.w, 1, C.ink);
  // An upright at every pit's back corner, above its side drape, outlined like the side drape's own post under it.
  for (let k = 0; k <= 8; k++) {
    const x = 96 + 80 * k;
    rect(x - 1, 9, 3, 39, C.ink);
    rect(x, 9, 1, 39, C.steel2);
  }
  for (const p of PITS) {
    banner(p);
    if (SPONSORS[p.num]) sponsorBoard(p);
  }
  pegboard();
}

let FLOOR = null, BACKDROP = null;

// ---- Pit furniture ----
/** A laptop, open toward you: the screen glowing, on its base. o: 'code' shows lines of code, 'cursor' a cursor. */
function laptop(x, y, t, o) {
  rect(x - 1, y - 9, 11, 8, C.ink);
  rect(x, y - 8, 9, 6, C.blue2);
  rect(x, y - 8, 9, 1, C.blue3);
  if (o === 'code') {
    rect(x + 1, y - 6, 5, 1, C.blue0);
    rect(x + 2, y - 4, 4, 1, C.blue0);
  }
  if (o && Math.floor(t * 2) % 2 === 0) rect(x + (o === 'code' ? 7 : 2), y - (o === 'code' ? 4 : 5), 1, 1, C.white);
  rect(x - 2, y - 2, 13, 3, C.ink);
  rect(x - 1, y - 1, 11, 1, C.steel2);
  rect(x - 1, y - 1, 3, 1, C.steel3);
}
function shutLaptop(x, y) {
  rect(x - 1, y - 3, 12, 4, C.ink);
  rect(x, y - 2, 10, 1, C.steel3);
  rect(x, y - 1, 10, 1, C.steel1);
}
/** A little parts bin, open at the top. */
function bin(x, y, [shade, mid, lit]) {
  rect(x - 1, y - 4, 7, 5, C.ink);
  rect(x, y - 3, 5, 3, mid);
  rect(x, y - 3, 5, 1, lit);
  rect(x + 1, y - 1, 3, 1, shade);
}
function bins(x, y, k) {
  bin(x, y, BINS[k % 4]);
  bin(x + 6, y, BINS[(k + 1) % 4]);
  bin(x + 3, y - 4, BINS[(k + 2) % 4]);
}
/** A cordless drill standing on its battery. */
function drill(x, y) {
  rect(x - 1, y - 7, 8, 4, C.ink);
  rect(x, y - 6, 5, 2, C.yel1);
  rect(x, y - 6, 5, 1, C.yel2);
  rect(x + 5, y - 6, 1, 1, C.steel2);
  rect(x, y - 4, 3, 3, C.ink);
  rect(x + 1, y - 4, 1, 2, C.yel0);
  rect(x - 1, y - 2, 5, 3, C.ink);
  rect(x, y - 1, 3, 1, BLACK[2]);
}
function tape(x, y) {
  rect(x - 1, y - 4, 6, 5, C.ink);
  rect(x, y - 3, 4, 3, C.steel2);
  rect(x, y - 3, 4, 1, C.steel3);
  rect(x + 1, y - 2, 2, 1, C.ink);
}
/** 4000's TV, showing the match stream: the score along the top, the field, an alliance at each end, two robots. */
function tv(x, y, t) {
  rect(x + 6, y - 4, 4, 5, C.ink);
  rect(x + 3, y - 1, 10, 2, C.ink);
  rect(x + 4, y - 1, 8, 1, C.steel1);
  rect(x - 1, y - 15, 18, 12, C.ink);
  rect(x, y - 14, 16, 10, C.carpet2);
  rect(x, y - 14, 8, 2, C.blue1);
  rect(x + 8, y - 14, 8, 2, C.red1);
  rect(x + 7, y - 14, 2, 2, C.ink);
  rect(x, y - 12, 16, 1, C.steel3);
  rect(x, y - 11, 2, 7, C.blue2);
  rect(x + 14, y - 11, 2, 7, C.red2);
  rect(x + 3 + Math.round((1 + Math.sin(t * 1.1)) * 4), y - 9, 2, 2, C.blue0);
  rect(x + 11 - Math.round((1 + Math.sin(t * 0.8 + 2)) * 4), y - 7, 2, 2, C.red0);
}
/** 1357's bowl of team buttons, free to take. */
function buttons(x, y) {
  rect(x - 1, y - 6, 9, 3, C.ink);
  [[0, C.org1], [2, C.white], [4, C.org1], [6, C.ink]].forEach(([dx, c], i) => rect(x + dx, y - 5 - (i % 2), 2, 2, c === C.ink ? C.steel0 : c));
  rect(x - 1, y - 3, 9, 4, C.ink);
  rect(x, y - 3, 7, 2, C.steel3);
  rect(x, y - 3, 7, 1, C.white);
}

// Table skirts darker than the plywood top, as every box's face toward you is: the light teams' in a shade (3000's
// white in steel, 1357's orange in its shade), everyone else's in their shirts' colour. [folds and hem, face]
const SKIRT = { 3000: [C.steel1, C.steel2], 1357: [C.org0, TEAMS[1357].tone[0]] };

function workTable(p, t) {
  const x = at(p, 'table'), w = 40, [dark, mid] = SKIRT[p.num] ?? p.tone;
  const { yTop, yFront, yFloor } = box(x, w, 0.4, 2.9, 20, PLY[1], mid, PLY[2]);
  // The plywood's thickness under the top, the skirt's folds and hem.
  rect(x, yFront, w, 2, PLY[0]);
  for (let fx = x + 6; fx < x + w - 3; fx += 9) rect(fx, yFront + 3, 1, yFloor - yFront - 4, dark);
  rect(x, yFloor - 1, w, 1, dark);
  for (const [what, dx, dz, o] of DRESS[p.num].table) {
    const ix = x + dx, iy = yTop + 1 + dz;
    if (what === 'laptop') laptop(ix, iy, t, o);
    else if (what === 'shut') shutLaptop(ix, iy);
    else if (what === 'bins') bins(ix, iy, p.i);
    else if (what === 'drill') drill(ix, iy);
    else if (what === 'tape') tape(ix, iy);
    else if (what === 'tv') tv(ix, iy, t);
    else if (what === 'buttons') buttons(ix, iy);
  }
}

/** A rolling tool chest: drawers with their handles, on casters. */
function toolChest(p) {
  const x = at(p, 'chest'), w = 14, [shade, mid, lit, hi] = { red: RED, steel: STEEL, black: BLACK }[DRESS[p.num].chest];
  const { yFront, yFloor } = box(x, w, 0.4, 1.9, 28, lit, mid, hi);
  rect(x + w - 1, yFront, 1, yFloor - yFront, shade);
  rect(x, yFront, w, 1, lit);
  for (let y = yFront + 5, i = 0; y < yFloor - 5; y += i < 2 ? 4 : 5, i++) {
    rect(x, y, w, 1, shade);
    rect(x + 5, y + 2, 4, 1, C.steel3);
  }
  rect(x, yFloor - 2, w, 2, C.ink);
  for (const cx of [x + 1, x + w - 3]) rect(cx, yFloor - 1, 2, 1, C.steel2);
}

/**
 * The battery cart: an open steel rack, its back panel showing between two shelves of batteries (black cases, the red
 * lead, the white label with the battery's number), and the charger on top with its leads down to them. Each light
 * blinks red while its battery charges and shows green when it's full.
 */
function batteryCart(p, t) {
  const x = at(p, 'battery'), w = 16;
  const { yTop, yFront, yFloor } = box(x, w, 0.4, 2.0, 22, C.steel2, C.steel1, C.steel3);
  rect(x, yFront, w, 1, C.steel2);
  for (const sy of [yFront + 8, yFront + 16]) {
    for (let i = 0; i < 3; i++) {
      const bx = x + 1 + i * 5, by = sy - 6;
      rect(bx - 1, by - 1, 6, 7, C.ink);
      rect(bx, by, 4, 5, BLACK[1]);
      rect(bx, by, 4, 1, BLACK[2]);
      rect(bx, by, 1, 2, C.red1);
      rect(bx + 3, by, 1, 1, C.ink);
      rect(bx + 1, by + 2, 2, 1, C.steel3);
    }
    rect(x, sy, w, 2, C.ink);
    rect(x, sy, w, 1, C.steel2);
  }
  // The uprights at the front corners, and the casters.
  rect(x, yFront, 1, yFloor - yFront - 2, C.steel3);
  rect(x + w - 1, yFront, 1, yFloor - yFront - 2, C.steel2);
  rect(x, yFloor - 2, w, 2, C.ink);
  for (const cx of [x + 1, x + w - 3]) rect(cx, yFloor - 1, 2, 1, C.steel2);
  // The charger and its leads.
  const cy = yTop + 3;
  rect(x + 1, cy - 6, 14, 7, C.ink);
  rect(x + 2, cy - 5, 12, 5, C.steel0);
  rect(x + 2, cy - 5, 12, 1, C.steel1);
  for (let j = 0; j < 3; j++) {
    const full = rnd(p.i * 7 + j) < 0.45, on = Math.floor(t * 2 + j * 0.5) % 2 === 0;
    rect(x + 4 + j * 3, cy - 3, 2, 1, full ? LED_FULL : on ? C.red1 : C.red0);
  }
  rect(x + w, cy - 2, 1, yFront + 2 - cy, C.ink);
}

/**
 * The robot's spot when it's away: a whiteboard on a little easel saying where it went. open: false draws its legs
 * still folded together, as it's being set down.
 */
function awayBoard(x, y, where, match, open = true) {
  const top = y - 25;
  rect(x - 1, top - 3, 3, 4, C.ink);
  rect(x, top - 2, 1, 2, C.steel2);
  // The legs, splayed (or folded straight down), and the tray the markers sit on.
  for (const s of [-1, 1]) {
    if (!open) {
      rect(x + s * 11 - 1, top + 15, 3, 10, C.ink);
      rect(x + s * 11, top + 16, 1, 8, C.steel2);
      continue;
    }
    rect(x + s * 11 - 1, top + 15, 3, 6, C.ink);
    rect(x + s * 12 - 1, top + 20, 3, 5, C.ink);
    rect(x + s * 11, top + 16, 1, 5, C.steel2);
    rect(x + s * 12, top + 21, 1, 4, C.steel2);
  }
  rect(x - 17, top, 35, 16, C.ink);
  rect(x - 16, top + 1, 33, 14, WHITEBOARD);
  rect(x - 16, top + 14, 33, 1, C.steel3);
  text(where, x + 1, top + 2, { font: 3, color: where === 'IN QUEUE' ? C.blue1 : C.red1, align: 'center' });
  text(`MATCH ${match}`, x + 1, top + 8, { font: 3, color: C.ink, align: 'center' });
  rect(x - 17, top + 15, 35, 2, C.ink);
  rect(x - 16, top + 15, 33, 1, C.steel2);
}

/**
 * 5026's board while its robot is home: folded flat and leaning on the front of the work table behind where the cart
 * stands, its back to you, its feet (x, y) on the floor (the robot on its cart, in front, hides all but its edges).
 * It's the same board as awayBoard's, the same size: the white of its face showing round the edge of the grey back, and
 * the easel's two legs folded flat against the back, down past the panel to the floor. Turned round and stood up on the
 * spot, it's the white IN QUEUE board on its legs.
 */
function stowedBoard(x, y) {
  const top = y - 25;
  rect(x - 1, top - 3, 3, 4, C.ink);
  rect(x, top - 2, 1, 2, C.steel2);
  rect(x - 17, top, 35, 17, C.ink);
  rect(x - 16, top + 1, 33, 15, WHITEBOARD);
  rect(x - 16, top + 15, 33, 1, C.steel3);
  rect(x - 15, top + 2, 31, 12, C.steel1);
  rect(x - 15, top + 2, 31, 1, C.steel2);
  // The legs, folded against the back and down to the floor, a hinge at the top of each.
  for (const s of [-1, 1]) {
    rect(x + s * 11 - 1, top + 1, 3, 25, C.ink);
    rect(x + s * 11, top + 2, 1, 23, C.steel3);
    rect(x + s * 11, top + 2, 1, 1, C.white);
  }
}

/** Where 5026's board is, across, while the teammate lifts it: at her hands (cutscene.js MATE_SET, 630, less 10). */
const LIFT_X = 620;

// The arm robot's arm, raised a little: any higher and it hides its own team's banner from the aisle.
const ARM_ANGLE = -0.15;

/** A push handle on one end of a robot cart (side -1 left, +1 right): a steel tube up from the deck, a grip on top. */
function pushHandle(x, y, side) {
  const hx = x + side * 17;
  rect(hx - 1, y - 26, 3, 15, C.ink);
  rect(hx, y - 25, 1, 13, C.steel3);
  rect(hx + side * 2 - 3, y - 27, 7, 3, C.ink);
  rect(hx + side * 2 - 2, y - 26, 5, 1, C.steel2);
}

/**
 * A robot on its cart with the cart's floor line at (x, y), through pixel.js's current camera: the queue's dolly
 * (field.js robotCart) with the intro's robot on its deck, wheels still. spec: { bot: 'ele' | 'arm' | 'def', num, team,
 * rsl = false, dir = 1, handle = 0, roll } (handle: -1 a push handle at the left end, +1 at the right, 0 none; roll: how
 * far it has rolled, in pixels, for a cart on the move: its casters turn, the glint on each moving round it every two
 * pixels). The defender's bumpers are always red, and the arm robot has no signal light.
 */
export function drawCartBot(x, y, spec) {
  const { bot, num, team = 'blue', rsl = false, dir = 1, handle = 0 } = spec;
  x = Math.round(x);
  y = Math.round(y);
  if (handle) pushHandle(x, y, handle);
  robotCart(x, y, (rx, ry) => {
    if (bot === 'arm') armBot(rx, ry, { team, num, dir, spin: 0, angle: ARM_ANGLE, ball: false });
    else if (bot === 'def') defBot(rx, ry, { num, dir, spin: 0, rsl });
    else eleBot(rx, ry, { team, num, dir, spin: 0, rsl });
  });
  // The casters robotCart draws, turning: the lit pixel of each goes from one side of it to the other.
  if (spec.roll != null) {
    const k = Math.floor(spec.roll / 2) % 2;
    for (const cx of [x - 15, x + 13]) {
      rect(cx, y - 2, 2, 1, C.steel1);
      rect(cx + k, y - 2, 1, 1, C.steel3);
    }
  }
}

/**
 * One side drape between pits, end-on: its top rail running back to the drape, the upright at its front corner. h: how
 * tall (3 feet; an end drape is the back drape's 8).
 */
function divider(x, h = 24) {
  const { yTop, yFront, yFloor } = box(x - 1, 3, 0, 10, h, C.stand2, C.stand1, C.stand2);
  rect(x, yTop, 1, yFront - yTop, C.steel2);
  rect(x, yFront - 1, 1, yFloor - yFront + 1, C.steel3);
  rect(x + 1, yFront, 1, yFloor - yFront, C.steel1);
  rect(x - 3, yFloor - 1, 7, 2, C.ink);
  rect(x - 2, yFloor - 1, 5, 1, C.steel2);
}

// 7777's team flag, hanging like cloth: yellow all over, in its own three yellows, lit along the top and shaded along the
// bottom, two folds running its full height (lit, then shade, like the drape's), the fly end drooping a pixel lower than
// the hoist, an ink outline all round (it parts the flag from the navy drape) and a black 7. '.' is the drape showing
// through.
const FLAG = [
  'kkkkkkkkkkkkkkkkkk',
  'kYYYYYYYYYYYYYYYYk',
  'kyYoykkkkkyYoyyyyk',
  'kyYoyyyyykyYoyyyyk',
  'kyYoyyyykyyYoyyyyk',
  'kyYoyyykyyyYoyyyyk',
  'kyYoyyykyyyYoyyyyk',
  'kyYoyyykyyyYoyyyyk',
  'koYooooooooYoyyyyk',
  'kkkkkkkkkkkkkooook',
  '.............kkkkk',
];
/**
 * 7777's team flag on a pole in the back corner of its pit, the pole's foot behind the battery cart (x, y: the foot),
 * flying under the banner and over the charger, behind anyone in the pit.
 */
function flag(x, y) {
  const top = 33, fly = 37;
  rect(x - 1, top - 1, 3, y - top + 2, C.ink);
  rect(x, top, 1, y - top, C.steel2);
  rect(x, top, 1, 1, C.steel3);
  FLAG.forEach((row, r) => [...row].forEach((ch, c) => {
    if (ch !== '.') rect(x + 1 + c, fly + r, 1, 1, { k: C.ink, Y: C.yel2, y: C.yel1, o: C.yel0 }[ch]);
  }));
}

// ---- The ends of the hall ----
/** The spare parts counter: racks of little bins on it, its sign on the front. */
function sparePartsCounter() {
  const { yTop, yFront, yFloor } = box(10, 78, 1.2, 3.5, 20, PLY[1], C.steel1, PLY[2]);
  rect(10, yFront, 78, 2, PLY[0]);
  rect(10, yFloor - 1, 78, 1, C.steel0);
  for (let fx = 16; fx < 86; fx += 12) rect(fx, yFront + 3, 1, yFloor - yFront - 4, C.steel0);
  rect(24, yFront + 5, 51, 11, C.ink);
  rect(25, yFront + 6, 49, 9, C.blue1);
  rect(25, yFront + 6, 49, 1, C.blue2);
  text('SPARE PARTS', 50, yFront + 8, { font: 3, color: C.white, align: 'center' });
  // Two racks of bins either side of where the volunteer stands, a box of bolts in front of her.
  for (const rx of [14, 62]) {
    const by = yTop + 4;
    rect(rx - 1, by - 14, 24, 15, C.ink);
    rect(rx, by - 13, 22, 13, C.steel0);
    rect(rx, by - 13, 22, 1, C.steel1);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      const [shade, mid, lit] = BINS[Math.floor(rnd(rx + r * 4 + c) * 4)];
      const bx = rx + 1 + c * 5, bY = by - 12 + r * 4;
      rect(bx, bY, 5, 3, C.ink);
      rect(bx, bY, 4, 3, mid);
      rect(bx, bY, 4, 1, lit);
      rect(bx + 1, bY + 2, 2, 1, shade);
    }
  }
  rect(41, yTop + 2, 9, 4, C.ink);
  rect(42, yTop + 3, 7, 2, PLY[0]);
  for (let i = 0; i < 3; i++) rect(43 + i * 2, yTop + 3, 1, 1, C.steel3);
}

/** The pit admin desk: the announcer's laptop, mic and schedules, its skirt saying what it is. */
function adminDesk() {
  const { yTop, yFront, yFloor } = box(748, 60, 2.2, 4.6, 20, C.blue2, C.blue1, C.blue3);
  rect(748, yFront, 60, 1, C.blue0);
  for (let fx = 753; fx < 806; fx += 10) rect(fx, yFront + 3, 1, yFloor - yFront - 4, C.blue0);
  rect(748, yFloor - 1, 60, 1, C.blue0);
  // Its sign, a panel on the skirt like SPARE PARTS's, the skirt's folds behind it: on the skirt's left, under the mic.
  rect(751, yFront + 5, 39, 11, C.ink);
  rect(752, yFront + 6, 37, 9, C.blue0);
  rect(752, yFront + 6, 37, 1, C.blue1);
  text('PIT ADMIN', 770, yFront + 8, { font: 3, color: C.white, align: 'center' });
  // Schedules, a stack of them.
  rect(751, yTop + 1, 10, 6, C.ink);
  rect(752, yTop + 2, 8, 3, C.white);
  rect(752, yTop + 5, 8, 1, C.steel3);
  rect(753, yTop + 3, 5, 1, C.steel3);
  // The mic on its little stand, in front of the announcer.
  rect(766, yTop + 4, 5, 2, C.ink);
  rect(768, yTop - 3, 1, 7, C.ink);
  rect(767, yTop - 6, 4, 4, C.ink);
  rect(768, yTop - 5, 2, 2, C.steel2);
  rect(768, yTop - 5, 1, 1, C.steel3);
  // The laptop, its lid toward you.
  rect(786, yTop - 6, 14, 11, C.ink);
  rect(787, yTop - 5, 12, 8, C.steel2);
  rect(787, yTop - 5, 12, 1, C.steel3);
  rect(792, yTop - 2, 2, 2, C.steel3);
  rect(786, yTop + 3, 14, 2, C.ink);
}

/** Safety glasses for anyone who needs a pair, under their sign, in the corner against the right end drape. */
function glassesStand() {
  // The sign, yellow all round its words like the QUEUE sign (two pixels each side of the longest), clear of the end
  // drape's top rail, and hung high enough that its words show over the head of anyone standing at the desk's end below it.
  const sx = 789, sy = 26, w = 37;
  rect(sx, sy, w, 21, C.ink);
  rect(sx + 1, sy + 1, w - 2, 19, C.yel1);
  rect(sx + 1, sy + 1, w - 2, 1, C.yel2);
  ['SAFETY', 'GLASSES', 'REQUIRED'].forEach((s, i) => text(s, sx + 18, sy + 2 + i * 6, { font: 3, color: C.ink, align: 'center' }));
  // The stand, and the bin of glasses on top.
  const { yTop } = box(814, 14, 4, 5.5, 16, C.steel2, C.steel1, C.steel3);
  rect(813, yTop - 4, 16, 6, C.ink);
  rect(814, yTop - 3, 14, 4, INSIDE);
  for (let i = 0; i < 4; i++) {
    const gx = 815 + i * 3 + (i % 2), gy = yTop - 3 + (i % 2);
    rect(gx, gy, 2, 1, LENS);
    rect(gx, gy + 1, 2, 1, C.steel2);
  }
  rect(814, yTop + 1, 14, 1, C.steel3);
}

/**
 * The arena's QUEUE sign (field.js), pointing the way out to the field: at the aisle's near edge where the row ends,
 * between 1357's pit and the desk, so the floor at the way out is clear (and the arrow stage.js puts there). QUEUE: its
 * post across and its floor line (y), and its panel's span across (x0 to x1) and top row: it hides anyone standing behind
 * it with their feet between that row and the sign's foot (scene.js keeps the strategist and the safety advisor out from
 * behind it when they stop to have a word).
 */
const QUEUE_X = 744;
export const QUEUE = { x: QUEUE_X, y: 134, x0: QUEUE_X - 14, x1: QUEUE_X + 16, top: 134 - 38 };
function queueSign() {
  const x = QUEUE_X, y = 134;
  rect(x - 4, y - 1, 9, 2, C.ink);
  rect(x - 1, y - 26, 3, 26, C.ink);
  rect(x, y - 25, 1, 25, C.steel3);
  rect(x - 14, y - 38, 30, 13, C.ink);
  rect(x - 13, y - 37, 28, 11, C.yel1);
  text('QUEUE', x - 12, y - 34, { font: 3, color: C.ink });
  // An arrow: font 3 has no '>'.
  const ax = x + 9, ay = y - 34;
  rect(ax, ay + 2, 4, 1, C.ink);
  rect(ax + 2, ay, 1, 5, C.ink);
  rect(ax + 3, ay + 1, 1, 3, C.ink);
}

/** Everything standing on the floor, with where it is across (for leaving out what's off screen) and its floor line. */
function standing(t, pit5026) {
  const list = [];
  for (const p of PITS) {
    const span = { x0: p.x0, x1: p.x1 };
    list.push({ ...span, y: floorY(1.9), draw: () => toolChest(p) });
    list.push({ ...span, y: floorY(2.0), draw: () => batteryCart(p, t) });
    list.push({ ...span, y: floorY(2.9), draw: () => workTable(p, t) });
    const away = p.state !== 'busy' ? p.state : p.num === '5026' && pit5026 === 'sign' ? 'queue' : null;
    if (away) list.push({ ...span, y: 90, draw: () => awayBoard(p.mid, 90, away === 'queue' ? 'IN QUEUE' : 'ON FIELD', p.match) });
    else if (p.num !== '5026' || pit5026 === 'robot') {
      list.push({ ...span, y: 90, draw: () => drawCartBot(p.mid, 90, { ...p.bot, num: p.num, handle: p.num === '5026' ? -1 : 0 }) });
    }
    // 5026's board on its way from the table to the spot: folded against the table, then lifted in the teammate's hands
    // (she bends over it from MATE_SET, cutscene.js, her hands ten pixels to her left and 18 up, so it's drawn just
    // behind her with her hands on it), turned round with its legs still folded, then standing (above).
    // While the robot's home its middle hides the board, and the board's edges show either side of its mast, so nothing
    // pops in as it rolls away.
    if (p.num === '5026' && (pit5026 === 'empty' || pit5026 === 'robot')) list.push({ ...span, y: floorY(3.2), draw: () => stowedBoard(p.mid, Math.round(floorY(3.2))) });
    if (p.num === '5026' && pit5026 === 'lift') list.push({ ...span, y: 91, draw: () => stowedBoard(LIFT_X, 88) });
    if (p.num === '5026' && pit5026 === 'turn') list.push({ ...span, y: 89, draw: () => awayBoard(p.mid, 87, 'IN QUEUE', p.match, false) });
    if (p.num === '7777') list.push({ x0: p.x0, x1: p.x0 + 24, y: floorY(0.5), draw: () => flag(p.x0 + 4, 74) });
  }
  for (let k = 0; k <= 8; k++) list.push({ x0: 96 + 80 * k - 3, x1: 96 + 80 * k + 3, y: floorY(10), draw: () => divider(96 + 80 * k) });
  for (const x of END_X) list.push({ x0: x - 4, x1: x + 4, y: floorY(10), draw: () => divider(x, 64) });
  list.push({ x0: 0, x1: 96, y: floorY(3.5), draw: sparePartsCounter });
  list.push({ x0: 748, x1: 808, y: BACK, draw: () => monitor(t) });
  list.push({ x0: 748, x1: 808, y: floorY(4.6), draw: adminDesk });
  list.push({ x0: 789, x1: 832, y: floorY(5.5), draw: glassesStand });
  list.push({ x0: QUEUE_X - 14, x1: QUEUE_X + 16, y: 134, draw: queueSign });
  return list;
}

/**
 * The whole hall seen from view = { x, y = 0, s = 1, w } at t seconds (w: how wide the screen is in its own pixels,
 * the canvas's width if not given; things further off than that aren't drawn). The floor and back layers are made on first use.
 * o.more: people and anything else standing, as { y: floor line, draw() }, sorted in with the furniture; each draw()
 * runs with the camera set to the view, so it can draw in world pixels. o.pit5026: 'robot' (5026's robot on its cart;
 * its IN QUEUE / MATCH 44 board is folded against the table behind it, its edges showing), 'empty' (the robot's spot empty,
 * the folded board showing behind it, back out: the cut scene draws the cart), 'lift' and 'turn' (the board being
 * picked up, then turned round over the spot with its legs still folded: the moment the teammate sets it up) or 'sign'
 * (the board standing on the spot; the default).
 */
export function drawWorld(g, view, t, o = {}) {
  const vx = view.x, vy = view.y ?? 0, s = view.s ?? 1;
  useContext(g);
  if (!FLOOR) {
    FLOOR = layer(WORLD.w, WORLD.h, drawFloor);
    BACKDROP = layer(WORLD.w, BACK, drawBack);
  }
  camera(vx, vy, s);
  blit(FLOOR, 0, 0);
  blit(BACKDROP, 0, 0);
  const lo = vx - 40, hi = vx + (view.w ?? g.canvas?.width ?? 256) / s + 40;
  const things = standing(t, o.pit5026 ?? 'sign').filter((p) => p.x1 > lo && p.x0 < hi);
  for (const p of [...things, ...(o.more ?? [])].sort((a, b) => a.y - b.y)) {
    camera(vx, vy, s);
    p.draw();
  }
}

// ---- Where people can walk ----
// The aisle, and into each pit's open front as far as its robot or its board (as wide as the cart or the board's panel,
// so nobody slips behind one); in front of the counter and the desk at the ends. The side drapes stop anyone crossing
// from pit to pit. 5026's spot is as it is while you walk: the board. The aisle stops short of each end of the picture:
// the way out at the right is EXIT's, which stage.js walks her out of by herself. In front of the desk and the glasses
// stand the floor stops a step short of EXIT's line (and of the end drape's post), so she never stands past it out of
// the aisle, where she wouldn't leave, with the post across her face. Out in the aisle the QUEUE sign's post stands in
// the way of the rows near its foot, her starting row among them; move() takes her round its front.
const AISLE = { x0: 10, x1: 822, y0: 100, y1: 138 };
function open(x, y) {
  if (x < AISLE.x0 || x > AISLE.x1 || y > AISLE.y1) return false;
  if (y >= AISLE.y0) return true;
  if (x < 96) return y >= 84 && x <= 90;
  if (x >= 736) return y >= 88 && x >= 742 && x <= EXIT.x - 4;
  const p = PITS[Math.floor((x - 96) / 80)];
  return y >= 82 && x >= p.x0 + 6 && x <= p.x1 - 6;
}
/** The QUEUE sign's post, standing in the aisle's near half, and how far short of it she starts going round it. */
const POST = { x0: QUEUE_X - 4, x1: QUEUE_X + 4, y0: 131, y1: 134 }, VEER = 28;
const BLOCKS = [
  ...PITS.filter((p) => p.state === 'busy' && p.num !== '5026').map((p) => ({ x0: p.mid - 19, x1: p.mid + 19, y0: 84, y1: 90 })),
  ...PITS.filter((p) => p.state !== 'busy' || p.num === '5026').map((p) => ({ x0: p.mid - 17, x1: p.mid + 17, y0: 84, y1: 90 })),
  { x0: 792, x1: 828, y0: 83, y1: 90 }, // the safety glasses stand, and under its sign at the desk's end
  POST,
];
const hits = (bs, x, y) => bs.some((b) => x > b.x0 - 4 && x < b.x1 + 4 && y > b.y0 - 2 && y < b.y1 + 2);

/**
 * Where a step from (x, y) by (dx, dy) ends up, as [x, y]: along, then across, each as far as the floor allows (like
 * field.js move). extra: more rectangles { x0, x1, y0, y1 } that block, such as people standing still.
 */
export function move(x, y, dx, dy, extra = []) {
  // Somewhere she shouldn't be (someone stepped into her): let her walk out.
  const free = !open(x, y) || hits(BLOCKS, x, y) || hits(extra, x, y);
  const ok = (px, py) => open(px, py) && (free || (!hits(BLOCKS, px, py) && !hits(extra, px, py)));
  const reach = (fx, fy, ddx, ddy) => {
    for (const k of [1, 0.75, 0.5, 0.25]) if (ok(fx + ddx * k, fy + ddy * k)) return [fx + ddx * k, fy + ddy * k];
    return [fx, fy];
  };
  const [nx] = reach(x, y, dx, 0);
  // Walking on to the right in front of the glasses stand, where the floor stops short of the end drape (open()), she
  // goes on down round its post into the aisle, toward the way out, rather than treading on the spot in the corner.
  const corner = dx > 0 && dy > -0.01 && nx < x + dx && y < AISLE.y0 && x + dx > EXIT.x - 4;
  // Walking straight along the aisle toward the QUEUE sign's post on a row it stands across (her starting row is one),
  // she bears down round its front, from VEER pixels short of it, and walks on: she passes in front of the sign, never
  // behind its panel with her face hidden, or treading on the spot against the post. If she's against it already, she
  // steps straight down. Not while she's stepping up: then she goes round behind it, as she's steering, so it never pulls
  // her the wrong way.
  const ahead = dx > 0 ? POST.x0 - 4 - x : x - (POST.x1 + 4);
  const veer = dx !== 0 && Math.abs(dy) < 0.01 && ahead > -1 && ahead < VEER && hits([POST], POST.x0, y);
  const post = dx !== 0 && dy > -0.01 && Math.abs(nx - x) < Math.abs(dx) && hits([POST], x + dx, y);
  const [, ny] = reach(nx, y, 0, corner ? Math.max(dy, dx * 0.8) : post ? Math.max(dy, Math.abs(dx) * 0.8) : veer ? Math.abs(dx) * 0.5 : dy);
  return [nx, ny];
}
