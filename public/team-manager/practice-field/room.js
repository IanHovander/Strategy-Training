// The school cafeteria after school, where 5026 builds its practice field: the room itself and the late sun pouring in.
// It's seen the way the arena is (field.js): the long back wall faces you and the floor recedes from it toward you, 8
// pixels to the foot along the room and 2.75 to the foot of depth, heights going up at 8 pixels a foot. Every coordinate
// comes from layout.js.
// The back wall, left to right: the double doors to the hallway under their EXIT sign; six tall windows, with a clock and
// school posters on the piers between them; the team's banner over the lunch tables folded against the wall; the serving
// line with its shutter down; two vending machines under the lunch menu. At the right-hand end, the outside wall, with
// the side doors out to the parking lot standing open in it (the way out). The wall is painted block over a glazed tile
// wainscot, dim and low in contrast because the sun is behind it (like the arena's stands), so the people in front of it
// read, and the sky in the glass is the brightest thing on it. Outside: a late-afternoon sky in flat dithered bands, the
// sun low in the first window, and the trees and the school's other wing as silhouettes against it.
// The floor is two-foot vinyl tiles in a quiet checker. The team's carpet goes down on it (halffield.js), then the sun:
// each window throws its own shape onto the floor, its six panes sheared to the right and squashed, with the frame's bars
// as shadow lines between them. A patch is a fixed ramp of pale straw, the same hue on the carpet and the tiles, clearly
// paler and yellower than the plywood standing in it, so it reads as light, with the carpet's speckle and tape still
// showing. Every patch is hard-edged all round, with a one-pixel rim of brighter, paler light down its lit left side.
// The shafts in the air above them run from under the sill down to the patch in two flat steps, the upper one brighter,
// with two rows of checkerboard between, each surface under them a fixed clean colour a step or two up its own ramp and
// warmer, and a brighter rim down each band's lit edge. They're painted into the floor canvas too, so they never tint
// what stands in them; dust drifts through them every frame. Ink outlines stay ink in the light. No glows and no
// smooth gradients.
// Out on the floor: a table where the programmer works, another where a scout eats pizza, two backpacks, the custodian's
// cart, and the bins by the vending machines. Everything standing up is a box like field.js's: its top lighter, the face
// toward you darker, an ink outline round it, lit from the upper left. The background furniture stays dim, like the
// arena's, so the people in front of it carry the colour.
//
//   drawWall(ctx), drawTiles(ctx), drawSunPatches(ctx)   once each, in that order (the carpet goes in before the patches),
//                                                        into a ROOM.w x ROOM.h canvas at world coordinates: the patches
//                                                        and the shafts
//   drawEndWall(ctx)                                     once, last, into the same canvas: the end wall on the right as
//                                                        far as the side doors, the doors' opening, the mat inside
//                                                        and the daylight through the doors on the floor
//   roomThings(g, view, t, o)                            the furniture, [{ y, draw }] to sort in by floor line; o.door 0-1
//   drawSunAir(g, view, t)                               the dust in the shafts, last of all, every frame
//   ROOM_BLOCKS                                          the furniture's footprints and the end wall's, for move()
// A view is { x, y } (and w, h if it isn't the 256 x 144 screen).

import { W, C, useContext, camera, screen, rect, disk, text, rnd } from '../pixel.js';
import { tones } from '../cast.js';
import { ROOM, roomY, DOORS, WINDOWS, WIN, FOLDED, SERVING, VENDING, SUN, sunShift, FURNITURE, SPOTS, END_WALL, SIDE_DOOR } from './layout.js';
import { CARPET_IN_SUN, CARPET_IN_SHAFT } from './halffield.js';

// ---- Colours ----
// New ramps sit beside pixel.js's palette, shade / mid / lit.
const WALL = ['#262c40', '#2f364d', '#3a425c']; // painted block in the shadow of the sun behind it
const GLAZE = ['#173f3a', '#1f5650', '#2b6d65']; // the glazed tile wainscot
const TILE = { grout: '#3c4054', a: '#4a4e62', b: '#535872', fleck: ['#5d637d', '#41465a'] };
const SKY = ['#4a90ff', '#7fb0ff', '#a8d2ff', '#ffe6b0', '#ffc978', '#ff9a4a']; // through the glass, top to bottom
const SUN_CORE = '#fff8e0', SUN_RINGS = ['#fff1a8', '#ffd890'], LIGHT = '#fff1c4', REVEAL = '#ffc978';
const DUSK = ['#141c2c', '#1c2a3e', '#26384f']; // what's outside, against the sun
const VINYL = ['#a3152a', '#d81f2c', '#ff5a4a']; // the team's banner, in the hoodie's reds
const STEEL = [C.steel0, C.steel1, C.steel2, C.steel3];
const LAM = tones.khaki, SEAT = tones.shirtGreen; // table laminate, bench seats and stools
const BLUE = [C.blue0, C.blue1, C.blue2, C.blue3], RED = [C.red0, C.red1, C.red2, C.red3];
const YEL = [C.yel0, C.yel1, C.yel2];

/** A box standing on the floor between floor lines y0 (its back) and y1 (its front): its top, then the face toward you. */
function box(x, w, y0, y1, h, top, front, edge) {
  y0 = Math.round(y0);
  y1 = Math.round(y1);
  const yTop = y0 - h, yFront = y1 - h;
  rect(x - 1, yTop - 1, w + 2, y1 - yTop + 2, C.ink);
  rect(x, yTop, w, yFront - yTop, top);
  rect(x, yTop, w, 1, edge);
  rect(x, yFront, w, y1 - yFront, front);
  return { yTop, yFront, yFloor: y1 };
}
/** A flat panel on the wall: an ink border round a fill. */
function panel(x, y, w, h, c) {
  rect(x, y, w, h, C.ink);
  rect(x + 1, y + 1, w - 2, h - 2, c);
}
/** Pixel art from rows of letters: each letter is a colour in pal, '.' is nothing. */
function sprite(x, y, rows, pal) {
  rows.forEach((row, j) => [...row].forEach((ch, i) => pal[ch] && rect(x + i, y + j, 1, 1, pal[ch])));
}

// ---- The windows ----
// Each window is 40 x 60 from (x0, WIN.top). Across, from the left: the opening's ink edge, the left reveal in shadow,
// the frame's ink edge, its two-pixel bar, the glass with a two-pixel mullion up the middle, the frame again, the right
// reveal in the sun, the opening's edge. Down: the opening's edge, the head in shadow, the frame, three rows of panes
// split by two transoms, the frame; the sill is below. The sun patches and the shafts are worked out from the same
// numbers, so they always match the window. Measured from the window's top-left corner:
const GLASS = { x0: 6, x1: 34, y0: 6, y1: 57 };
const PANES_X = [[6, 19], [21, 34]], PANES_Y = [[6, 22], [24, 39], [41, 57]];
const inPane = (cx, cy) => PANES_X.some(([a, b]) => cx >= a && cx < b) && PANES_Y.some(([a, b]) => cy >= a && cy < b);

// The sky in flat bands (the row each starts on), with two rows of checkerboard where one meets the next: the last row
// of a band and the first of the next, the lower colour where x + y is even, the upper where it's odd, the same pattern
// as pixel.js dither() and the intro's night sky.
const SKY_BANDS = [0, 23, 31, 38, 44, 50];
function skyAt(x, y) {
  const i = SKY_BANDS.findLastIndex((b) => y >= b);
  if (y === SKY_BANDS[i + 1] - 1 && (x + y) % 2 === 0) return SKY[i + 1];
  if (i > 0 && y === SKY_BANDS[i] && (x + y) % 2 === 1) return SKY[i - 1];
  return SKY[i];
}
/** The sun, low in the first window, behind its mullion and just clear of the trees. */
const THE_SUN = { x: 88, y: 56 };

// Outside, back to front: a far tree line, the school's other wing, nearer trees. Each gives the top of its shape (a y
// on the wall) at each x along the room, or Infinity where it isn't.
const bump = (x, k) => (rnd(Math.floor(x / 2) + k) < 0.35 ? 1 : 0);
const farTrees = (x) => 59 + Math.round(Math.sin(x * 0.19) * 1.4 + Math.sin(x * 0.47 + 1)) + bump(x, 40);
const WING = [{ x0: 186, x1: 298, top: 54 }, { x0: 262, x1: 296, top: 50 }];
const wing = (x) => Math.min(...WING.map((b) => (x >= b.x0 && x < b.x1 ? b.top : Infinity)));
// (None just right of [146]: the robot's elevator stands in front of that part of the second window in the opening shot,
// and a dark crown sitting on the top of its mast read as a lid.)
const TREES = [[146, 53, 8], [208, 57, 6], [326, 46, 10], [343, 49, 8], [388, 53, 8], [403, 56, 6]];
function nearTrees(x) {
  let top = Infinity;
  for (const [cx, t, r] of TREES) {
    const d = Math.abs(x - cx);
    if (d <= r) top = Math.min(top, t + Math.round(r - Math.sqrt(r * r - d * d) * 0.9) + bump(x, cx));
  }
  return top;
}
const LAYERS = [
  { top: farTrees, fill: DUSK[2], fleck: DUSK[1], rim: 0.22 },
  { top: wing, fill: DUSK[1], rim: 0.3 },
  { top: nearTrees, fill: DUSK[0], fleck: DUSK[1], rim: 0.5 },
];
// A few diagonal glints: [window, cx, cy] of each glint's lower-left pixel.
const GLINTS = [[1, 22, 14], [2, 8, 17], [3, 24, 33], [4, 9, 13], [5, 23, 16]];

function drawWindow(i) {
  const { x0 } = WINDOWS[i], y0 = WIN.top;
  const at = (cx, cy, w, h, c) => rect(x0 + cx, y0 + cy, w, h, c);
  // The opening: its ink edge, the head and the left reveal in shadow, the right reveal in the sun.
  at(0, 0, 40, 60, C.ink);
  at(1, 1, 38, 2, WALL[0]);
  at(1, 3, 2, 56, WALL[0]);
  at(37, 3, 2, 56, REVEAL);
  // The sky, row by row.
  for (let cy = GLASS.y0; cy < GLASS.y1; cy++) {
    for (let cx = GLASS.x0; cx < GLASS.x1; cx++) at(cx, cy, 1, 1, skyAt(x0 + cx, y0 + cy));
  }
  if (i === 0) {
    disk(THE_SUN.x, THE_SUN.y, 8, SUN_RINGS[1]);
    disk(THE_SUN.x, THE_SUN.y, 6, SUN_RINGS[0]);
    disk(THE_SUN.x, THE_SUN.y, 4, SUN_CORE);
  }
  // Outside, each layer with an ink edge along its top and down its sides, and the sun catching it here and there.
  const bottom = y0 + GLASS.y1;
  LAYERS.forEach((l, k) => {
    for (let cx = GLASS.x0; cx < GLASS.x1; cx++) {
      const x = x0 + cx, top = l.top(x);
      if (top >= bottom) continue;
      const inkTo = Math.min(bottom, Math.max(top + 1, l.top(x - 1), l.top(x + 1)));
      rect(x, top, 1, inkTo - top, C.ink);
      rect(x, inkTo, 1, bottom - inkTo, l.fill);
      if (inkTo < bottom && rnd(x * 1.7 + k * 31) < l.rim) rect(x, inkTo, 1, 1, rnd(x + k) < 0.5 ? REVEAL : SKY[5]);
      if (l.fleck) for (let y = inkTo + 2; y < bottom; y += 2) if (rnd(x * 3.1 + y * 7.3 + k) < 0.18) rect(x, y, 1, 1, l.fleck);
    }
  });
  // The wing's windows, dark rows of them.
  for (const b of WING) {
    for (let x = b.x0 + 3; x < b.x1 - 2; x += 5) {
      if (x >= x0 + GLASS.x0 && x + 2 <= x0 + GLASS.x1) rect(x, b.top + 3, 2, 2, DUSK[0]);
    }
  }
  for (const [w, cx, cy] of GLINTS) {
    if (w !== i) continue;
    for (let k = 0; k < 4; k++) at(cx + k, cy - k, 1, 1, C.white);
    for (let k = 0; k < 2; k++) at(cx + 3 + k, cy - k, 1, 1, C.white);
  }
  // The frame: two-pixel bars lit on the left and top, the mullion and the two transoms.
  const gw = GLASS.x1 - GLASS.x0, gh = GLASS.y1 - GLASS.y0;
  at(4, 4, 32, 2, STEEL[1]);
  at(4, GLASS.y1, 32, 2, STEEL[1]);
  at(4, 4, 2, 55, STEEL[1]);
  at(GLASS.x1, 4, 2, 55, STEEL[1]);
  at(4, 4, 32, 1, STEEL[2]);
  at(4, 4, 1, 55, STEEL[2]);
  at(GLASS.x1 + 1, 5, 1, 54, STEEL[0]);
  at(5, GLASS.y1 + 1, 31, 1, STEEL[0]);
  const [[, m0], [m1]] = PANES_X;
  at(m0, GLASS.y0, m1 - m0, gh, STEEL[1]);
  at(m0, GLASS.y0, 1, gh, STEEL[2]);
  for (const [a] of PANES_Y.slice(1)) {
    at(GLASS.x0, a - 2, gw, 2, STEEL[1]);
    at(GLASS.x0, a - 2, gw, 1, STEEL[2]);
  }
  // The bottom panes are hoppers, tipped open a little: their top rails catch the light.
  for (const [a, b] of PANES_X) at(a, PANES_Y[2][0], b - a, 1, STEEL[3]);
  // The sill: a concrete box, lighter on top.
  rect(x0 - 3, y0 + 59, 46, 6, C.ink);
  rect(x0 - 2, y0 + 60, 44, 2, STEEL[2]);
  rect(x0 - 2, y0 + 60, 44, 1, STEEL[3]);
  rect(x0 - 2, y0 + 62, 44, 2, STEEL[1]);
}

// ---- On the wall ----
/** A round shape of odd width, 2r + 1 pixels, centred on the pixel (cx, cy). */
function roundel(cx, cy, r, c) {
  for (let dy = -r; dy <= r; dy++) {
    const hw = Math.floor(Math.sqrt((r + 0.5) ** 2 - dy * dy));
    rect(cx - hw, cy + dy, hw * 2 + 1, 1, c);
  }
}
/** A clock on the second pier, reading 4:40: a steel rim lit at the upper left and shaded at the lower right, a flat
 *  white face with one tick at the 12, and two straight one-pixel ink hands from the ink centre, a clean V: the long
 *  minute hand down to the left, toward the 8, the short hour hand down to the right, toward the 5. Small round things
 *  stay clean flat tones, like the rocket's ports. */
function clock(cx, cy) {
  roundel(cx, cy, 6, C.ink);
  roundel(cx, cy, 5, STEEL[2]);
  for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) {
    if (dx * dx + dy * dy > 30) continue;
    if (dx + dy <= -5) rect(cx + dx, cy + dy, 1, 1, STEEL[3]);
    else if (dx + dy >= 5) rect(cx + dx, cy + dy, 1, 1, STEEL[1]);
  }
  roundel(cx, cy, 4, C.white);
  rect(cx, cy - 4, 1, 1, STEEL[1]);
  rect(cx, cy, 1, 1, C.ink);
  for (const [dx, dy] of [[-1, 1], [-2, 2], [-3, 3]]) rect(cx + dx, cy + dy, 1, 1, C.ink); // the minute hand
  for (const [dx, dy] of [[1, 1], [2, 2]]) rect(cx + dx, cy + dy, 1, 1, C.ink); // the hour hand
}

/** READ, in four colours under an open book: two white pages whose tops dip to the spine, lines of print on them, the
 *  gutter shaded on the right-hand page, and the blue cover showing under the pages. */
const BOOK = [
  'kkkk....kkkk',
  'kwwwk..kwwwk',
  'kwwwwkkswwwk',
  'kwllwkksllwk',
  'kwwwwkkswwwk',
  'kwllwkksllwk',
  'kbbbbbbbbbbk',
  '.kkkkkkkkkk.',
];
function posterRead(x, y) {
  panel(x, y, 16, 21, C.steel3);
  sprite(x + 2, y + 3, BOOK, { k: C.ink, w: C.white, s: STEEL[3], l: STEEL[2], b: BLUE[1] });
  [...'READ'].forEach((ch, i) => text(ch, x + 2 + i * 3, y + 13, { font: 3, color: [RED[1], C.org1, SEAT[1], BLUE[1]][i] }));
}

/** A felt pennant, pinned flat. */
function pennant(x, y) {
  const len = (r) => Math.max(1, Math.round(17 * (1 - Math.abs(r - 5) / 5.6)));
  for (let r = 0; r < 11; r++) rect(x - 1, y + r - 1, len(r) + 2, 3, C.ink);
  for (let r = 0; r < 11; r++) {
    rect(x, y + r, len(r), 1, BLUE[1]);
    if (r < 5) rect(x + len(r) - 1, y + r, 1, 1, BLUE[2]);
    if (r > 5) rect(x + len(r) - 1, y + r, 1, 1, BLUE[0]);
  }
  rect(x, y, 2, 11, C.white);
  text('GO', x + 4, y + 3, { font: 3, color: YEL[1] });
}

// The robotics team's recruiting flyer: the winner banner's gear (sprites.js), in red, and tear-off tabs.
const GEAR = [
  '....###....', '.##.###.##.', '.#########.', '..#######..', '####...####', '####...####',
  '####...####', '..#######..', '.#########.', '.##.###.##.', '....###....',
];
function flyer(x, y) {
  panel(x, y, 16, 24, C.steel3);
  sprite(x + 2, y + 2, GEAR, { '#': RED[1] });
  text('FRC', x + 8, y + 14, { font: 3, color: C.ink, align: 'center' });
  for (let i = 0; i < 6; i++) rect(x + 2 + i * 2, y + 20, 1, 3, STEEL[2]);
}

/** The double doors to the hallway, closed, and the EXIT sign over them. */
function doors() {
  const { x0, x1, top } = DOORS, y1 = ROOM.wallY;
  rect(x0, top, x1 - x0, y1 - top, C.ink);
  rect(x0 + 1, top + 1, x1 - x0 - 2, y1 - top - 1, STEEL[1]);
  rect(x0 + 1, top + 1, x1 - x0 - 2, 1, STEEL[2]);
  rect(x0 + 1, top + 1, 1, y1 - top - 1, STEEL[2]);
  rect(x1 - 2, top + 2, 1, y1 - top - 2, STEEL[0]);
  rect(x0 + 3, top + 3, x1 - x0 - 6, y1 - top - 3, C.ink);
  const mid = (x0 + x1) / 2;
  for (const [lx, side] of [[x0 + 4, -1], [mid + 1, 1]]) {
    const w = mid - 1 - (x0 + 4), ly = top + 4, lh = y1 - ly;
    rect(lx, ly, w, lh, STEEL[1]);
    rect(lx, ly, w, 1, STEEL[2]);
    rect(lx, ly, 1, lh, STEEL[2]);
    rect(lx + w - 1, ly + 1, 1, lh - 1, STEEL[0]);
    // A narrow wire-glass window by the meeting edge, the dim hallway behind it.
    const gx = side < 0 ? lx + w - 7 : lx + 3;
    rect(gx - 1, ly + 4, 6, 17, C.ink);
    rect(gx, ly + 5, 4, 15, DUSK[2]);
    for (let j = 0; j < 15; j++) for (let i = 0; i < 4; i++) if ((i + j) % 3 === 0 && (i - j + 30) % 3 === 0) rect(gx + i, ly + 5 + j, 1, 1, WALL[2]);
    rect(gx, ly + 5, 1, 3, STEEL[2]);
    // The push bar, at three and a half feet.
    rect(lx + 1, y1 - 30, w - 2, 4, C.ink);
    rect(lx + 2, y1 - 29, w - 4, 1, STEEL[3]);
    rect(lx + 2, y1 - 28, w - 4, 1, STEEL[2]);
    // The kick plate.
    rect(lx + 1, y1 - 7, w - 2, 1, C.ink);
    rect(lx + 1, y1 - 6, w - 2, 6, STEEL[2]);
    rect(lx + 1, y1 - 6, w - 2, 1, STEEL[3]);
  }
  // EXIT, white on red.
  panel(mid - 9, top - 11, 19, 9, RED[1]);
  rect(mid - 8, top - 10, 17, 1, RED[2]);
  text('EXIT', mid + 1, top - 9, { font: 3, color: C.white, align: 'center' });
}

/** The team's banner over the folded tables: 5026, the name, grommets and the panther's hexagon. */
const HEX = [
  '....kkk....', '..kkwwwkk..', 'kkwwwwwwwkk', 'kwwkwwwkwwk', 'kwwkkkkkwwk', 'kwwkykykwwk',
  'kwwkkkkkwwk', 'kwwwkkkwwwk', 'kwwwwkwwwwk', 'kkwwwwwwwkk', '..kkwwwkk..', '....kkk....',
];
function teamBanner() {
  const x0 = FOLDED[0].x0, x1 = FOLDED[1].x1, y0 = 14, y1 = 32;
  panel(x0, y0, x1 - x0, y1 - y0, VINYL[1]);
  rect(x0 + 1, y0 + 1, x1 - x0 - 2, 1, VINYL[2]);
  rect(x0 + 1, y1 - 2, x1 - x0 - 2, 1, VINYL[0]);
  rect(x1 - 2, y0 + 2, 1, y1 - y0 - 4, VINYL[0]);
  for (const [gx, gy] of [[x0 + 2, y0 + 2], [x1 - 4, y0 + 2], [x0 + 2, y1 - 4], [x1 - 4, y1 - 4]]) {
    rect(gx, gy, 2, 2, STEEL[2]);
    rect(gx, gy, 1, 1, STEEL[3]);
  }
  sprite(x0 + 5, y0 + 3, HEX, { k: C.ink, w: C.white, y: YEL[1] });
  const cx = Math.round((x0 + 18 + x1 - 4) / 2);
  text('5026', cx, y0 + 3, { color: C.white, align: 'center', shadow: VINYL[0], sx: 0, sy: 1 });
  text('IRON PANTHERS', cx, y0 + 12, { font: 3, color: C.white, align: 'center' });
}

// The serving line. layout.js puts the bins over its last 8 pixels, so the counter, its shutter and the sign over it
// stop short of them.
const SERVE = { x0: SERVING.x0, x1: FURNITURE.bins.x0 - 2 };
function servingLine() {
  const { x0, x1 } = SERVE, top = 22, shutterTop = 32, shutterBottom = ROOM.wallY - 24;
  // The sign over it.
  panel(x0, top, x1 - x0, 10, STEEL[1]);
  rect(x0 + 1, top + 1, x1 - x0 - 2, 1, STEEL[2]);
  text('SERVING LINE', (x0 + x1) / 2, top + 3, { font: 3, color: STEEL[3], align: 'center' });
  // The roll-down shutter in its guides, slats lit along their tops.
  rect(x0 + 1, shutterTop - 1, x1 - x0 - 2, shutterBottom - shutterTop + 1, C.ink);
  for (let y = shutterTop; y < shutterBottom - 1; y += 3) {
    rect(x0 + 4, y, x1 - x0 - 8, 2, STEEL[1]);
    rect(x0 + 4, y, x1 - x0 - 8, 1, STEEL[2]);
  }
  rect(x0 + 4, shutterBottom - 3, x1 - x0 - 8, 3, STEEL[2]);
  rect(x0 + 4, shutterBottom - 3, x1 - x0 - 8, 1, STEEL[3]);
  for (const hx of [x0 + 20, x1 - 22]) rect(hx, shutterBottom - 2, 3, 1, C.ink);
  for (const gx of [x0 + 2, x1 - 4]) {
    rect(gx, shutterTop, 2, shutterBottom - shutterTop, STEEL[1]);
    rect(gx, shutterTop, 1, shutterBottom - shutterTop, STEEL[2]);
  }
}

/** Today's lunch, over the vending machines. */
function menuBoard() {
  const x0 = VENDING[0].x0 + 1, x1 = VENDING[1].x1 - 1, y0 = 11, y1 = 33;
  panel(x0, y0, x1 - x0, y1 - y0, STEEL[1]);
  rect(x0 + 1, y0 + 1, x1 - x0 - 2, 1, STEEL[2]);
  rect(x0 + 2, y0 + 2, x1 - x0 - 4, y1 - y0 - 4, DUSK[0]);
  const cx = (x0 + x1) / 2;
  text('LUNCH', cx, y0 + 4, { font: 3, color: YEL[1], align: 'center' });
  text('PIZZA 3.00', cx, y0 + 10, { font: 3, color: C.white, align: 'center' });
  text('TACOS 2.50', cx, y0 + 16, { font: 3, color: C.white, align: 'center' });
}

/** Small things on the wall: a fire alarm by each way out, an extinguisher cabinet, a hand sanitiser by the bins. */
function wallBits() {
  for (const x of [60, VENDING[1].x1 + 4]) { // by the hallway doors, and by the side doors past the snack machine
    panel(x, 38, 6, 8, RED[1]);
    rect(x + 1, 39, 4, 1, RED[2]);
    rect(x + 1, 42, 4, 1, C.white);
  }
  const ex = FOLDED[1].x1 + 2;
  panel(ex, 30, 10, 18, STEEL[2]);
  rect(ex + 1, 31, 8, 1, STEEL[3]);
  rect(ex + 2, 33, 6, 13, DUSK[0]);
  rect(ex + 4, 35, 3, 10, C.ink);
  rect(ex + 4, 36, 2, 8, RED[1]);
  rect(ex + 4, 36, 1, 8, RED[2]);
  panel(SERVE.x1 + 6, 44, 6, 8, C.steel3);
  rect(SERVE.x1 + 8, 50, 2, 1, STEEL[1]);
}

export function drawWall(ctx) {
  const prev = useContext(ctx);
  screen();
  const capY = ROOM.wallY - 4 * 8; // the wainscot's top, 4 feet up
  // Painted block: mortar courses every 5 pixels and joints every 16, staggered, one shade down and not everywhere.
  rect(0, 0, ROOM.w, capY, WALL[1]);
  for (let y = capY - 5, k = 0; y > 0; y -= 5, k++) {
    for (let x = (k % 2) * 8 - 8; x < ROOM.w; x += 16) {
      if (rnd(x * 0.31 + y * 1.7) < 0.82) rect(x, y, 16, 1, WALL[0]);
      if (rnd(x * 0.53 + y * 2.9 + 5) < 0.6) rect(x, y + 1, 1, 4, WALL[0]);
      if (rnd(x * 0.71 + y * 0.9 + 9) < 0.12) rect(x + 3 + Math.floor(rnd(x + y) * 10), y + 2, 1, 1, WALL[2]);
    }
  }
  rect(0, 0, ROOM.w, 1, C.ink);
  rect(0, 1, ROOM.w, 1, WALL[0]);
  // The glazed tile wainscot: a lit cap, sparse grout ticks, a glint on a tile here and there, the dark cove base.
  rect(0, capY, ROOM.w, ROOM.wallY - capY, GLAZE[1]);
  rect(0, capY, ROOM.w, 1, GLAZE[2]);
  rect(0, capY + 2, ROOM.w, 1, GLAZE[0]);
  for (let y = capY + 6; y < ROOM.wallY - 3; y += 4) {
    for (let x = ((y - capY) / 4) % 2 ? 2 : 0; x < ROOM.w; x += 4) {
      const r = rnd(x * 1.13 + y * 3.7);
      if (r < 0.16) rect(x, y, 1, 1, GLAZE[0]);
      else if (r > 0.95) rect(x + 1, y + 1, 1, 1, GLAZE[2]);
    }
  }
  rect(0, ROOM.wallY - 3, ROOM.w, 1, C.ink);
  rect(0, ROOM.wallY - 2, ROOM.w, 1, DUSK[1]);
  rect(0, ROOM.wallY - 1, ROOM.w, 1, DUSK[0]);
  // The windows, and what's on the piers between them.
  WINDOWS.forEach((_, i) => drawWindow(i));
  const pier = (i) => WINDOWS[i].x1; // where the pier after window i starts; 20 pixels wide
  // The first pier is left bare: the place card sits over it in the opening shot. The clock is on the next one, right
  // of the card and wholly below the film bar there, so it shows 4:40 as the card says, and wholly below it in the wide
  // shot of the cycle too.
  clock(pier(1) + 10, 39);
  posterRead(pier(2) + 2, 18);
  pennant(pier(3) + 2, 12); // high, clear of the rocket's nose in front of it
  flyer(pier(4) + 2, 16);
  doors();
  teamBanner();
  servingLine();
  menuBoard();
  wallBits();
  useContext(prev);
}

// ---- The floor ----
export function drawTiles(ctx) {
  const prev = useContext(ctx);
  screen();
  // Two-foot tiles, 16 pixels along and 5 or 6 deep by turns, in a checker of two close greys.
  for (let y = ROOM.wallY, row = 0; y < ROOM.h; y += row % 2 ? 6 : 5, row++) {
    const h = row % 2 ? 6 : 5;
    for (let col = 0; col * 16 < ROOM.w; col++) rect(col * 16, y, 16, h, (col + row) % 2 ? TILE.b : TILE.a);
  }
  rect(0, ROOM.wallY, ROOM.w, 1, TILE.grout);
  // Flecks in the vinyl.
  const n = Math.round(ROOM.w * (ROOM.h - ROOM.wallY) * 0.022);
  for (let i = 0; i < n; i++) {
    const x = Math.floor(rnd(i + 12000) * ROOM.w), y = ROOM.wallY + 1 + Math.floor(rnd(i + 15000) * (ROOM.h - ROOM.wallY - 1));
    rect(x, y, 1, 1, TILE.fleck[rnd(i + 18000) < 0.5 ? 0 : 1]);
  }
  // A few scuffed tiles: heel marks and a worn patch.
  for (const [x, y] of [[36, 106], [112, 178], [424, 182], [560, 150], [640, 110]]) {
    for (let k = 0; k < 4; k++) rect(x + Math.floor(rnd(x + k) * 10), y + Math.floor(rnd(y + k) * 3), 2 + Math.floor(rnd(x * y + k) * 3), 1, TILE.grout);
  }
  useContext(prev);
}

// ---- The sun on the floor ----
// Each floor pixel (x, y) in the rows the sun reaches is lit if the point of the window it maps back to is a pane: its
// column x - sunShift(y), its row squeezed from the sill (on the near row) up to the window's top (on the far row).
// The frame, the mullion and the transoms leave shadow bars. Lit pixels take a fixed sunlit colour for whatever they
// were, the same every time: on the tiles and the carpet a pale straw, clearly paler and yellower than any plywood, so a
// patch reads as light, not as a board lying on the floor; the tiles' straw a step lighter than the carpet's
// (halffield.js CARPET_IN_SUN), so a window's patch is one hue across the carpet's edge. Anything else (a depot's
// plywood, its cargo) is lifted 58% of the way to the outer ring of the sun's gold (SUN_RINGS[1]), so each keeps
// something of its own colour. Ink stays ink, so every outline the light crosses still shows. Each pane's patch is
// hard-edged all round, with a one-pixel rim of paler, brighter light down its left side, toward the sun.
// Above the patches, each window's shaft: from under the sill down to the patch's near row, each row the panes'
// columns shifted right by sunShift(y), so it pours into the patch, the frame's bars still shadow lines through it.
// It's stepped like the sky in the glass: from the sill halfway down a step brighter than below, two rows of
// checkerboard between (skyAt). Each surface under it has a fixed lit colour for each step, clean colours a step or two
// up its own ramp and warmer: the wainscot a lighter teal, its cove a step up; on the floor, tiles and carpet's edge
// alike, the patches' straw at a lower value, so a shaft and the patch it pours into read as one light. Down its lit
// left edge each band has a one-pixel rim a step brighter again, like the patches, so each shaft reads as light joining
// its window to its patch.
const SUNLIT = [0xff, 0xd8, 0x90], LIT_K = 0.58, RIM = [0xff, 0xf1, 0xc4];
const SHAFT_TOP = WIN.top + 65; // the first row under the sill
/** The shaft's lower step starts here; the row before it and this one are the checkerboard between the two. */
const SHAFT_STEP = Math.round((SHAFT_TOP + SUN.near) / 2) + 2;
const toward = (to, k) => {
  const cache = new Map();
  return (r, g, b) => {
    const key = (r << 16) | (g << 8) | b;
    let c = cache.get(key);
    if (!c) cache.set(key, (c = [r, g, b].map((v, i) => Math.round(v + (to[i] - v) * k))));
    return c;
  };
};
const rgb = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const keyOf = (r, g, b) => (r << 16) | (g << 8) | b;
const INK = keyOf(...rgb(C.ink));
/** A fixed relighting: each colour in pairs ([from, to] as hex) to its own, anything else by fallback. */
function fixedLight(pairs, fallback) {
  const m = new Map([...pairs].map(([from, to]) => [keyOf(...rgb(from)), rgb(to)]));
  return (r, g, b) => m.get(keyOf(r, g, b)) ?? fallback(r, g, b);
}
/** The patches. */
const sunlit = fixedLight([
  [TILE.a, '#e6d39a'], [TILE.b, '#ecdaa2'], [TILE.fleck[0], '#f2e3b0'], [TILE.fleck[1], '#d6c28a'], [TILE.grout, '#cdb87e'],
  ...CARPET_IN_SUN,
], toward(SUNLIT, LIT_K));
/** The shafts: the lower step, the upper step, and the rim down each band's lit edge. */
const SHAFT_LO = fixedLight([
  [GLAZE[0], '#245e55'], [GLAZE[1], '#2c7468'], [GLAZE[2], '#3a8a7c'], [DUSK[0], DUSK[1]], [DUSK[1], DUSK[2]],
  [TILE.a, '#76705c'], [TILE.b, '#7e7862'], [TILE.fleck[0], '#88826a'], [TILE.fleck[1], '#6a6552'], [TILE.grout, '#625d4c'],
  ...CARPET_IN_SHAFT,
], toward(SUNLIT, 0.2));
const SHAFT_HI = fixedLight([
  [GLAZE[0], '#2c7468'], [GLAZE[1], '#3a8a7c'], [GLAZE[2], '#4aa08e'], [DUSK[0], DUSK[2]], [DUSK[1], '#33475f'],
  [TILE.a, '#948a6c'], [TILE.b, '#9c9274'], [TILE.fleck[0], '#a69c7c'], [TILE.fleck[1], '#857c60'], [TILE.grout, '#7c7458'],
  ...CARPET_IN_SHAFT,
], toward(SUNLIT, 0.3));
const SHAFT_RIM = fixedLight([
  [GLAZE[0], '#4aa08e'], [GLAZE[1], '#5cb49e'], [GLAZE[2], '#6cc4ac'], [DUSK[0], '#33475f'], [DUSK[1], '#3d5470'],
  [TILE.a, '#c4b48a'], [TILE.b, '#ccbc90'], [TILE.fleck[0], '#d6c69a'], [TILE.fleck[1], '#b4a57c'], [TILE.grout, '#aa9b74'],
  ...CARPET_IN_SUN,
], toward(SUNLIT, 0.45));
/** Which step of the shaft (x, y) is in: the upper above SHAFT_STEP, the lower from it down, checkered in between. */
function shaftStep(x, y) {
  if (y === SHAFT_STEP - 1) return (x + y) % 2 === 0 ? SHAFT_LO : SHAFT_HI;
  if (y === SHAFT_STEP) return (x + y) % 2 === 1 ? SHAFT_HI : SHAFT_LO;
  return y < SHAFT_STEP ? SHAFT_HI : SHAFT_LO;
}
/** Which point of a window, measured from its corner, the floor pixel (x, y) maps back to. */
function backToWindow(x0, x, y) {
  const wy = WIN.sill - ((y + 0.5 - SUN.near) * (WIN.sill - WIN.top)) / (SUN.far - SUN.near);
  return [x - Math.round(sunShift(y)) - x0, Math.floor(wy) - WIN.top];
}

export function drawSunPatches(ctx) {
  const y0 = SHAFT_TOP, h = SUN.far - y0 + 1;
  const img = ctx.getImageData(0, y0, ROOM.w, h), px = img.data;
  /** Relight (x, y) with f, or set it to a colour; ink is left alone. */
  const relight = (x, y, f) => {
    const k = ((y - y0) * ROOM.w + x) * 4;
    if (keyOf(px[k], px[k + 1], px[k + 2]) === INK) return;
    const c = typeof f === 'function' ? f(px[k], px[k + 1], px[k + 2]) : f;
    [px[k], px[k + 1], px[k + 2]] = c;
  };
  const lit = (x0, x, y) => y >= SUN.near && y <= SUN.far && inPane(...backToWindow(x0, x, y));
  for (const { x0 } of WINDOWS) {
    // The shaft, down to the patch: each pane's band, its left column the rim.
    for (let y = SHAFT_TOP; y < SUN.near; y++) {
      const s = x0 + Math.round(sunShift(y));
      for (const [a, b] of PANES_X) {
        for (let x = s + a; x < s + b && x < ROOM.w; x++) relight(x, y, x === s + a ? SHAFT_RIM : shaftStep(x, y));
      }
    }
    // The patch.
    for (let y = SUN.near; y <= SUN.far; y++) {
      const s = Math.round(sunShift(y));
      for (let x = x0 + s; x < x0 + s + 40 && x < ROOM.w; x++) {
        if (!lit(x0, x, y)) continue;
        relight(x, y, lit(x0, x - 1, y) ? sunlit : RIM);
      }
    }
  }
  ctx.putImageData(img, 0, y0);
}

// ---- The light in the air ----
// Dust drifts down through each window's shaft (drawn into the floor canvas, above), a pixel at a time, blinking out
// now and then. It's drawn over everything, last, as it's in the air in front of whatever stands in the light.
export function drawSunAir(g, view, t) {
  const prev = useContext(g);
  camera(view.x, view.y, 1);
  const vx0 = view.x, vx1 = view.x + (view.w ?? W);
  WINDOWS.forEach(({ x0 }, i) => {
    if (x0 + sunShift(WIN.sill) > vx1 || x0 + sunShift(SUN.far) + 40 < vx0) return;
    for (let k = 0; k < 5; k++) {
      const seed = i * 13.7 + k * 3.1;
      const p = (rnd(seed) + t * (0.02 + rnd(seed + 1) * 0.015)) % 1;
      if (p < 0.04 || p > 0.96 || (t * 0.35 + rnd(seed + 2)) % 1 < 0.15) continue;
      const y = Math.round(WIN.sill + 3 + p * (SUN.far - WIN.sill - 6));
      const x = Math.round(x0 + sunShift(y) + 7 + rnd(seed + 3) * 26 + Math.sin(t * 0.6 + seed) * 1.5);
      rect(x, y, 1, 1, LIGHT);
    }
  });
  useContext(prev);
}

// ---- Furniture on the floor ----
/**
 * A lunch table folded up and rolled to the wall: the two halves of its top stand up side by side on the hinge between
 * them, laminate in a steel frame, with the benches folded in under them and the chassis on casters.
 */
function foldedTable(x0, x1) {
  const w = x1 - x0;
  const { yTop, yFront, yFloor } = box(x0, w, ROOM.wallY, roomY(2), 44, STEEL[0], STEEL[1], STEEL[0]);
  // From above, the two halves' edges with the gap between.
  rect(x0, yTop, w, 2, LAM[1]);
  rect(x0, yTop, w, 1, LAM[2]);
  rect(x0, yFront - 2, w, 2, LAM[1]);
  rect(x0, yFront - 2, w, 1, LAM[2]);
  // The frame, lit on the left and top.
  rect(x0, yFront, w, 1, STEEL[2]);
  rect(x0, yFront, 1, yFloor - yFront, STEEL[2]);
  rect(x1 - 1, yFront + 1, 1, yFloor - yFront - 1, STEEL[0]);
  // The two halves, each with its edge band, a gloss glint and the hinge between them.
  const ly = yFront + 2, lh = 27, hw = (w - 6) >> 1;
  for (const hx of [x0 + 2, x1 - 2 - hw]) {
    rect(hx, ly - 1, hw, lh + 2, C.ink);
    rect(hx + 1, ly, hw - 2, lh, LAM[1]);
    rect(hx + 1, ly, hw - 2, 1, LAM[2]);
    rect(hx + 1, ly, 1, lh, LAM[2]);
    rect(hx + hw - 2, ly + 1, 1, lh - 1, LAM[0]);
    rect(hx + 2, ly + lh - 1, hw - 3, 1, LAM[0]);
    for (let k = 0; k < 4; k++) rect(hx + 4 + k, ly + 8 - k, 1, 1, LAM[2]);
    for (const c of [[hx, ly - 1], [hx + hw - 1, ly - 1], [hx, ly + lh], [hx + hw - 1, ly + lh]]) rect(c[0], c[1], 1, 1, STEEL[1]);
  }
  for (const hy of [ly + 5, ly + lh - 7]) {
    rect(x0 + 2 + hw - 1, hy - 1, w - 4 - 2 * hw + 2, 4, C.ink);
    rect(x0 + 2 + hw, hy, w - 4 - 2 * hw, 2, STEEL[3]);
  }
  // The benches, folded in along the bottom, and the chassis.
  for (const by of [ly + lh + 2, ly + lh + 6]) {
    rect(x0 + 2, by - 1, w - 4, 4, C.ink);
    rect(x0 + 3, by, w - 6, 2, SEAT[1]);
    rect(x0 + 3, by, w - 6, 1, SEAT[2]);
    rect(x0 + 3, by, 2, 2, STEEL[2]);
    rect(x1 - 5, by, 2, 2, STEEL[1]);
  }
  for (const cx of [x0 + 3, x1 - 7]) {
    rect(cx, yFloor - 3, 4, 3, C.ink);
    rect(cx + 1, yFloor - 2, 2, 1, STEEL[2]);
  }
}

/** The serving counter in front of the shutter: stainless in the shade of the wall, with the tray rail along it. */
function servingCounter() {
  const { x0, x1 } = SERVE, w = x1 - x0;
  const { yFront, yFloor } = box(x0, w, ROOM.wallY, roomY(2.5), 24, STEEL[2], STEEL[1], STEEL[3]);
  rect(x0, yFront, 1, yFloor - yFront, STEEL[2]);
  for (let x = x0 + 22; x < x1 - 4; x += 23) rect(x, yFront, 1, yFloor - yFront - 3, STEEL[1]);
  for (let i = 0; i < 14; i++) rect(x0 + 2 + Math.floor(rnd(i + 70) * (w - 4)), yFront + 9 + Math.floor(rnd(i + 90) * 10), 2, 1, STEEL[2]);
  rect(x0, yFloor - 3, w, 3, STEEL[1]);
  rect(x0, yFloor - 3, w, 1, STEEL[0]);
  // The tray rail: three tubes on brackets.
  rect(x0 - 1, yFront + 1, w + 2, 7, C.ink);
  for (const dy of [2, 4, 6]) rect(x0, yFront + dy, w, 1, dy === 2 ? STEEL[3] : STEEL[2]);
  for (let x = x0 + 4; x < x1; x += 23) rect(x, yFront + 8, 2, 3, STEEL[1]);
}

/** The drinks machine: red, a lit panel, its column of buttons, DRINKS across the top. */
function drinksMachine(x0, x1) {
  const w = x1 - x0;
  const { yFront, yFloor } = box(x0, w, ROOM.wallY, roomY(2.5), 48, RED[2], RED[1], RED[3]);
  rect(x0, yFront, 1, yFloor - yFront, RED[2]);
  rect(x1 - 1, yFront, 1, yFloor - yFront, RED[0]);
  rect(x0, yFront + 8, w, 1, RED[0]);
  text('DRINKS', x0 + 1, yFront + 2, { font: 3, color: C.white });
  // The lit panel with bottles on it.
  rect(x0 + 2, yFront + 10, 14, 24, C.ink);
  rect(x0 + 3, yFront + 11, 12, 22, RED[3]);
  for (let i = 0; i < 3; i++) {
    const bx = x0 + 4 + i * 4;
    rect(bx, yFront + 16, 3, 13, C.ink);
    rect(bx + 1, yFront + 14, 1, 2, C.ink);
    rect(bx + 1, yFront + 17, 1, 11, [C.white, RED[2], C.white][i]);
  }
  // The buttons, lit.
  rect(x0 + 17, yFront + 10, 5, 24, C.ink);
  for (let j = 0; j < 6; j++) rect(x0 + 18, yFront + 11 + j * 4, 3, 2, j % 2 ? YEL[2] : C.white);
  rect(x0 + 18, yFront + 36, 3, 2, C.ink);
  // Where the can drops out.
  rect(x0 + 3, yFloor - 10, 14, 6, C.ink);
  rect(x0 + 4, yFloor - 9, 12, 4, STEEL[0]);
  rect(x0 + 4, yFloor - 9, 12, 1, STEEL[1]);
}

/** The snack machine: dark, its glass front lit, rows of snacks on their spirals. */
function snackMachine(x0, x1) {
  const w = x1 - x0;
  const { yFront, yFloor } = box(x0, w, ROOM.wallY, roomY(2.5), 48, STEEL[1], STEEL[0], STEEL[2]);
  rect(x0, yFront, 1, yFloor - yFront, STEEL[1]);
  rect(x0 + 2, yFront + 2, 15, 33, C.ink);
  rect(x0 + 3, yFront + 3, 13, 31, C.steel3);
  const SNACKS = [RED[1], YEL[1], C.org1, BLUE[1], SEAT[1], tones.shirtPurple[1]];
  for (let r = 0; r < 5; r++) {
    const sy = yFront + 4 + r * 6;
    for (let c = 0; c < 4; c++) {
      const col = SNACKS[Math.floor(rnd(r * 7 + c + x0) * SNACKS.length)];
      rect(x0 + 4 + c * 3, sy, 2, 3, col);
      rect(x0 + 4 + c * 3, sy, 1, 1, C.white);
    }
    rect(x0 + 3, sy + 4, 13, 1, STEEL[2]);
  }
  for (let k = 0; k < 5; k++) rect(x0 + 12 - k, yFront + 6 + k, 1, 1, C.white);
  // The keypad and coin slot.
  rect(x0 + 18, yFront + 4, 4, 9, C.ink);
  rect(x0 + 19, yFront + 5, 2, 1, BLUE[2]);
  for (let j = 0; j < 3; j++) rect(x0 + 19, yFront + 7 + j * 2, 2, 1, STEEL[2]);
  rect(x0 + 19, yFront + 16, 2, 3, STEEL[1]);
  // The pick-up flap.
  rect(x0 + 3, yFloor - 10, 14, 6, C.ink);
  rect(x0 + 4, yFloor - 9, 12, 4, STEEL[1]);
  rect(x0 + 4, yFloor - 9, 12, 1, STEEL[2]);
}

/** A grey trash can and a blue recycling bin. */
function bins() {
  const { x0, y0, y1 } = FURNITURE.bins;
  const can = (x, w, tone, lid) => {
    const { yTop, yFront, yFloor } = box(x, w, y0, y1, 20, lid, tone[1], tone[2]);
    rect(x + 1, yTop + 1, w - 2, yFront - yTop - 2, C.ink);
    rect(x, yFront, 1, yFloor - yFront, tone[2]);
    rect(x + w - 1, yFront, 1, yFloor - yFront, tone[0]);
    rect(x, yFront, w, 1, tone[2]);
    return yFront;
  };
  can(x0, 7, [STEEL[0], STEEL[1], STEEL[2]], STEEL[2]);
  const yf = can(x0 + 9, 7, [BLUE[0], BLUE[1], BLUE[2]], BLUE[2]);
  sprite(x0 + 10, yf + 6, ['.w.', 'w.w', 'www'], { w: C.white });
}

/** An unfolded lunch table: laminate top, the frame and the stools in shadow under it. Seated people go behind it. */
function table(x0, x1, y0, y1) {
  const w = x1 - x0;
  y0 = Math.round(y0);
  y1 = Math.round(y1);
  const top = y0 - 20, front = y1 - 20;
  // In the shade under the top: the frame and its legs.
  rect(x0 + 1, front + 1, w - 2, y1 - front - 1, C.ink);
  rect(x0 + 2, front + 2, w - 4, y1 - front - 5, STEEL[0]);
  rect(x0 + w / 2 - 2, front + 2, 4, y1 - front - 4, STEEL[1]);
  rect(x0 + w / 2 - 2, front + 2, 1, y1 - front - 4, STEEL[2]);
  for (const lx of [x0 + 2, x1 - 5]) {
    rect(lx - 1, front + 1, 5, y1 - front, C.ink);
    rect(lx, front + 2, 3, y1 - front - 2, STEEL[2]);
    rect(lx, front + 2, 1, y1 - front - 2, STEEL[3]);
    rect(lx + 2, front + 2, 1, y1 - front - 2, STEEL[1]);
  }
  // The top: laminate with its lit edge, the steel band round it.
  rect(x0 - 1, top - 1, w + 2, front - top + 4, C.ink);
  rect(x0, top, w, front - top, LAM[1]);
  rect(x0, top, w, 1, LAM[2]);
  for (let i = 0; i < 8; i++) rect(x0 + 2 + Math.floor(rnd(x0 + i * 7) * (w - 4)), top + 1 + Math.floor(rnd(x0 + i * 11) * (front - top - 1)), 1, 1, LAM[0]);
  rect(x0, front, w, 2, STEEL[2]);
  rect(x0, front, w, 1, STEEL[3]);
  // Two stools on the near side.
  for (const sx of [x0 + Math.round(w * 0.25) - 3, x0 + Math.round(w * 0.75) - 3]) {
    const sy = y1 - 9;
    rect(sx + 2, sy, 3, y1 - sy, C.ink);
    rect(sx + 3, sy, 1, y1 - sy - 1, STEEL[2]);
    rect(sx - 1, sy - 3, 9, 4, C.ink);
    rect(sx, sy - 2, 7, 2, SEAT[1]);
    rect(sx, sy - 2, 7, 1, SEAT[2]);
    rect(sx + 1, y1 - 1, 5, 1, C.ink);
  }
  return { top, front };
}

/** The programmer's table: the laptop with its lid to you, tipped well back so his face shows over it, a mug and a
 *  notebook. */
function programmerTable() {
  const { x0, x1, y0, y1 } = FURNITURE.programmerTable;
  const { top } = table(x0, x1, y0, y1);
  const lx = Math.round((x0 + x1) / 2) - 6, ly = top + 3;
  // The screen's glow on the table behind the lid, then the lid with its sticker.
  rect(lx - 3, ly - 1, 19, 2, BLUE[3]);
  rect(lx - 2, ly - 1, 17, 1, C.white);
  rect(lx - 1, ly - 6, 14, 8, C.ink);
  rect(lx, ly - 5, 12, 6, STEEL[1]);
  rect(lx, ly - 5, 12, 1, STEEL[2]);
  rect(lx, ly - 5, 1, 6, STEEL[2]);
  sprite(lx + 4, ly - 4, ['.rr.', 'rRrr', '.rr.'], { r: RED[1], R: RED[2] });
  rect(lx - 1, ly + 1, 14, 1, STEEL[2]);
  // A mug and a notebook.
  rect(x1 - 15, top + 1, 5, 6, C.ink);
  rect(x1 - 14, top + 2, 3, 4, C.white);
  rect(x1 - 14, top + 2, 3, 1, STEEL[2]);
  rect(x1 - 11, top + 3, 2, 2, C.ink);
  rect(x0 + 6, top + 3, 11, 4, C.ink);
  rect(x0 + 7, top + 4, 9, 2, BLUE[1]);
  rect(x0 + 7, top + 4, 9, 1, BLUE[2]);
  rect(x0 + 7, top + 5, 1, 1, C.white);
}

/** The scouts' table: the scout's tablet in front of her, lying screen up in Noor's tablet's tones, a stack of pizza
 *  boxes and a water bottle. */
const TABLET = ['.kkkkkkk.', 'kmBBBBBmk', 'kmBdBdBmk', 'kmmmmmmmk', '.kkkkkkk.'];
function scoutTable() {
  const { x0, x1, y0, y1 } = FURNITURE.scoutTable;
  const { top } = table(x0, x1, y0, y1);
  sprite(SPOTS.scout.x - 4, top + 1, TABLET, { k: C.ink, m: '#3f4761', B: '#a8d2ff', d: '#232838' });
  const px = x1 - 26, py = top + 3;
  rect(px - 1, py - 9, 16, 11, C.ink);
  for (let i = 0; i < 3; i++) {
    rect(px, py - 2 - i * 3, 14, 2, C.steel3);
    rect(px, py - 2 - i * 3, 1, 2, C.white);
  }
  rect(px, py - 8, 14, 1, C.white);
  rect(px + 5, py - 8, 3, 1, RED[1]);
  const bx = x1 - 8;
  rect(bx - 1, top - 5, 4, 10, C.ink);
  rect(bx, top - 4, 2, 8, BLUE[3]);
  rect(bx + 1, top - 3, 1, 7, BLUE[2]);
  rect(bx, top - 5, 2, 1, C.white);
}

// Two backpacks dropped by the scouts' table, each on its own floor line.
const BACKPACKS = [
  { x: FURNITURE.scoutTable.x0 - 7, y: FURNITURE.scoutTable.y1 - 1, tone: VINYL },
  { x: FURNITURE.scoutTable.x1 + 6, y: FURNITURE.scoutTable.y1 - 2, tone: [BLUE[0], BLUE[1], BLUE[2]] },
];
function backpack({ x, y, tone }) {
  x = Math.round(x);
  y = Math.round(y);
  rect(x - 4, y - 10, 9, 10, C.ink);
  rect(x - 3, y - 11, 7, 1, C.ink);
  rect(x - 1, y - 13, 3, 2, C.ink);
  rect(x, y - 12, 1, 1, STEEL[2]);
  rect(x - 3, y - 10, 7, 9, tone[1]);
  rect(x - 3, y - 10, 7, 1, tone[2]);
  rect(x - 3, y - 10, 1, 9, tone[2]);
  rect(x + 3, y - 9, 1, 8, tone[0]);
  rect(x - 2, y - 6, 5, 4, C.ink);
  rect(x - 1, y - 5, 3, 2, tone[0]);
  rect(x - 1, y - 5, 3, 1, STEEL[3]);
}

/** The custodian's cart: a grey frame with shelves, the bag on its hoop, and the mop bucket with the mop handle up. */
function janitorCart() {
  const { x0, x1, y0, y1 } = FURNITURE.janitorCart;
  const fy = Math.round(y1);
  // The cart: a grey frame with an open shelf, things on its top tray, a folded wet-floor sign leaning on it.
  const fx = x0 + 12, fw = 11;
  const { yTop, yFront, yFloor } = box(fx, fw, y0, y1, 24, STEEL[2], STEEL[1], STEEL[3]);
  rect(fx, yFront, 1, yFloor - yFront, STEEL[2]);
  rect(fx + 2, yFront + 3, fw - 4, 8, C.ink);
  rect(fx + 2, yFront + 4, fw - 4, 7, STEEL[0]);
  rect(fx + 3, yFront + 7, 3, 4, C.white);
  rect(fx + 3, yFront + 7, 3, 1, STEEL[3]);
  rect(fx + 7, yFront + 6, 1, 5, BLUE[2]);
  rect(fx + 2, yFront + 11, fw - 4, 1, STEEL[3]);
  rect(fx + 2, yFront + 14, fw - 4, 6, STEEL[0]);
  rect(fx + 2, yFront + 20, fw - 4, 1, STEEL[2]);
  rect(fx + 2, yTop - 6, 4, 8, C.ink);
  rect(fx + 3, yTop - 5, 2, 6, BLUE[2]);
  rect(fx + 3, yTop - 7, 3, 2, C.ink);
  rect(fx + 3, yTop - 6, 1, 1, C.white);
  rect(fx + 7, yTop - 3, 3, 4, C.ink);
  rect(fx + 8, yTop - 2, 1, 2, YEL[1]);
  // The bag on its hoop at the far end, hanging clear of the floor.
  const bx = fx + fw + 1, bw = x1 - bx;
  rect(bx - 1, yTop - 1, bw + 1, fy - yTop - 1, C.ink);
  rect(bx, yTop + 2, bw - 1, fy - yTop - 5, STEEL[2]);
  rect(bx, yTop + 2, 1, fy - yTop - 5, STEEL[3]);
  rect(bx + bw - 2, yTop + 3, 1, fy - yTop - 7, STEEL[1]);
  for (let k = 0; k < 2; k++) rect(bx + 3 + k * 3, yTop + 6 + k * 5, 1, 7, STEEL[1]);
  rect(bx - 1, yTop, bw + 1, 2, STEEL[3]);
  rect(bx - 1, yTop + 1, bw + 1, 1, STEEL[1]);
  // Wheels.
  for (const wx of [fx + 1, x1 - 4]) {
    rect(wx, fy - 2, 3, 3, C.ink);
    rect(wx + 1, fy - 1, 1, 1, STEEL[2]);
  }
  // The yellow bucket at the near end, its wringer, and the mop standing in it.
  const kx = x0 + 1, ky = fy - 1;
  rect(kx + 6, ky - 42, 3, 30, C.ink);
  rect(kx + 7, ky - 41, 1, 29, LAM[2]);
  rect(kx - 1, ky - 12, 13, 13, C.ink);
  rect(kx, ky - 10, 11, 9, YEL[1]);
  rect(kx, ky - 10, 11, 1, YEL[2]);
  rect(kx, ky - 10, 1, 9, YEL[2]);
  rect(kx + 10, ky - 9, 1, 8, YEL[0]);
  rect(kx, ky - 6, 11, 1, YEL[0]);
  rect(kx + 2, ky - 16, 8, 5, C.ink);
  rect(kx + 3, ky - 15, 6, 3, STEEL[1]);
  rect(kx + 3, ky - 15, 6, 1, STEEL[2]);
  for (const sx of [kx + 4, kx + 6, kx + 8]) rect(sx, ky - 13, 1, 2, C.tape);
  for (const wx of [kx + 1, kx + 8]) rect(wx, ky, 2, 1, C.ink);
}

/** The hallway doors open, or (half) on their way, in two steps like the four-step fades: the dim corridor through
 *  them, and the leaves swung in against the jambs, or half way round. */
function doorway(half) {
  const { x0, x1, top } = DOORS, L = x0 + 4, R = x1 - 4, T = top + 4, B = ROOM.wallY;
  rect(L, T, R - L, B - T, DUSK[0]);
  rect(L + 6, T + 2, R - L - 12, 1, STEEL[2]);
  for (let x = L; x < R; x += 5) {
    rect(x, T + 12, 4, B - T - 22, DUSK[1]);
    rect(x, T + 12, 4, 1, DUSK[2]);
    rect(x, T + 12, 1, B - T - 22, DUSK[2]);
    for (let j = 0; j < 3; j++) rect(x + 1, T + 15 + j * 2, 2, 1, DUSK[0]);
  }
  rect(L, B - 10, R - L, 10, WALL[0]);
  rect(L, B - 10, R - L, 1, WALL[2]);
  if (half) {
    // Half way round, each leaf shows half its width, its face turned toward the room and foreshortened, its free edge
    // a few pixels out from the wall, so its top and bottom step down toward it: the wire-glass window by that edge,
    // the push bar across, and the kick plate.
    for (const [hx, s] of [[L, 1], [R - 1, -1]]) {
      const w = 9;
      for (let i = 0; i < w; i++) {
        const x = hx + s * i, dy = Math.floor((i * 4) / w);
        rect(x, T - 1 + dy, 1, B - T + 2, C.ink);
        if (i === w - 1) continue;
        rect(x, T + dy, 1, B - T, i === 0 ? STEEL[2] : STEEL[1]);
        rect(x, T + dy, 1, 1, STEEL[2]);
        if (i >= 4 && i <= 6) {
          rect(x, T + 4 + dy, 1, 17, C.ink);
          if (i === 5) rect(x, T + 5 + dy, 1, 15, DUSK[2]);
        }
        rect(x, B - 30 + dy, 1, 3, C.ink);
        rect(x, B - 29 + dy, 1, 1, STEEL[3]);
        rect(x, B - 7 + dy, 1, 1, C.ink);
        rect(x, B - 6 + dy, 1, 6, STEEL[2]);
      }
    }
    return;
  }
  // Each leaf is swung right round against its jamb, so it shows as a sliver: its edge, a glimpse of its face and the
  // end of its push bar.
  for (const [lx, s] of [[x0 + 1, 1], [x1 - 6, -1]]) {
    rect(lx, T - 1, 5, B - T + 9, C.ink);
    rect(lx + 1, T, 3, B - T + 7, STEEL[1]);
    rect(lx + (s > 0 ? 1 : 3), T, 1, B - T + 7, STEEL[2]);
    rect(lx + 1, T, 3, 1, STEEL[3]);
    rect(s > 0 ? lx + 4 : lx - 1, B - 30, 2, 3, C.ink);
    rect(s > 0 ? lx + 4 : lx, B - 29, 1, 1, STEEL[3]);
  }
}

// ---- The way out ----
// The right-hand end of the room is the cafeteria's outside wall, drawn the way the worlds hall's end walls are: above
// the floor line at the back, its face, the back wall's painted block and glazed tile a step lighter, as it faces the
// light; from there down, its thickness cut away 5 pixels up, a box like field.js's running down the right edge of the
// room, the top of the block lit along its edge toward the room. Out in the front half of the room it breaks for the
// side doors to the parking lot, standing open (they swing outward, so only their frame and threshold show): the cut
// end of the wall behind the opening shows its face, with the doors' aluminium frame at its inner edge; across the
// opening the threshold, and beyond it the walk outside in the late sun, the same straw as the sun's patches on the
// tiles, so the way out is the brightest thing at this end of the room, and its daylight lies on the floor inside
// (drawDoorLight). A rubber mat lies on the tiles inside, and a red EXIT sign, the same as the one over the hallway
// doors she came in by at the other end, hangs over the opening on a post up out of the door frame (exitSign).
// The face and the wall behind the opening go into the floor canvas (drawEndWall); the wall in front of the opening
// stands on the floor (roomThings), so it hides her feet as she walks out between the two.
const CAP = [WALL[2], '#4a5372', '#5c6688']; // the block's cut top, lit from above: shade, mid, lit, past the wall's own
const DAY = ['#cdb87e', '#e6d39a', '#f2e3b0']; // the walk outside in the sun: the tiles' straw in the sun's patches

/** The wall's thickness from floor line y0 to y1, cut away END_WALL.h up: its top speckled, the face toward you below. */
function endWallRun(y0, y1) {
  const { x0, x1, h } = END_WALL, w = x1 - x0;
  const { yTop, yFront } = box(x0, w, y0, y1, h, CAP[1], WALL[0], CAP[2]);
  rect(x0, yTop, 1, yFront - yTop, CAP[2]);
  for (let y = yTop + 3; y < yFront - 1; y += 2) {
    if (rnd(y * 1.7 + 3) < 0.45) rect(x0 + 2 + Math.floor(rnd(y * 2.3 + 1) * (w - 3)), y, 1, 1, CAP[0]);
  }
}

/** The end wall into the floor canvas, last: its face, the wall as far as the side doors, the opening, the mat and the
 *  daylight on the floor. */
export function drawEndWall(ctx) {
  const prev = useContext(ctx);
  screen();
  const { x0, x1, h } = END_WALL, w = x1 - x0, { y0, y1 } = SIDE_DOOR, capY = ROOM.wallY - 4 * 8;
  // The face: block coursed every 5 pixels with staggered joints, then the wainscot, lit, down to where the cut top
  // starts; ink down the corner it makes with the back wall.
  rect(x0, 0, w, capY, WALL[2]);
  for (let y = capY - 5, k = 0; y > 1; y -= 5, k++) {
    rect(x0, y, w, 1, WALL[1]);
    rect(x0 + (k % 2 ? 3 : 9), y + 1, 1, 4, WALL[1]);
  }
  rect(x0, 0, w, 1, C.ink);
  rect(x0, capY, w, ROOM.wallY - capY, GLAZE[2]);
  rect(x0, capY + 2, w, 1, GLAZE[1]);
  for (let y = capY + 6; y < ROOM.wallY - 6; y += 4) rect(x0 + 2 + ((y / 4) % 2) * 5, y, 1, 1, GLAZE[1]);
  rect(x0 - 1, 0, 1, ROOM.wallY, C.ink);
  // The wall from the back corner to the opening, and the door frame along its cut end, lit on top and on the left.
  endWallRun(ROOM.wallY, y0);
  rect(x0, y0 - h - 1, 3, h + 1, STEEL[1]);
  rect(x0, y0 - h - 1, 3, 1, STEEL[3]);
  rect(x0, y0 - h, 1, h, STEEL[2]);
  // The opening, between the wall behind it and the wall in front (whose top starts h above its floor line): the
  // threshold, lit along the room side, then the walk outside in the sun, the wall behind the opening shading its far
  // edge, a few flecks in it.
  const gy = y0 + 1, gh = y1 - h - 1 - gy;
  rect(x0, gy, 4, gh, STEEL[2]);
  rect(x0, gy, 1, gh, STEEL[3]);
  rect(x0 + 3, gy, 1, gh, STEEL[1]);
  rect(x0 + 4, gy, w - 4, gh, DAY[1]);
  rect(x0 + 4, gy, w - 4, 2, DAY[0]);
  for (let i = 0; i < 14; i++) {
    rect(x0 + 5 + Math.floor(rnd(i + 800) * (w - 6)), gy + 3 + Math.floor(rnd(i + 820) * (gh - 4)), 1, 1, DAY[i % 3 ? 2 : 0]);
  }
  // The frame on the wall in front of the opening, seen from above at its cut top.
  rect(x0, y1 - h, 3, 2, STEEL[2]);
  rect(x0, y1 - h, 3, 1, STEEL[3]);
  // The mat inside the doors: flat black rubber in the carpet's darkest grey, a border round it a step up, flecked.
  const mx = x0 - 27, mw = 23, my = gy + 3, mh = gh - 6;
  rect(mx - 1, my - 1, mw + 2, mh + 2, C.ink);
  rect(mx, my, mw, mh, C.carpet0);
  rect(mx + 1, my + 1, mw - 2, mh - 2, C.carpet1);
  rect(mx + 2, my + 2, mw - 4, mh - 4, C.carpet0);
  for (let i = 0; i < 12; i++) rect(mx + 3 + Math.floor(rnd(i + 860) * (mw - 6)), my + 3 + Math.floor(rnd(i + 880) * (mh - 6)), 1, 1, C.carpet1);
  useContext(prev);
  drawDoorLight(ctx);
}

// The daylight in through the open doors, lying on the tiles and the mat inside: the opening's floor band carried on
// into the room as far as DOOR_LIGHT.reach, in two flat steps like the shafts, the brighter one by the threshold and
// reaching just past the mat, two columns of checkerboard between them and again where it gives out. The steps' far
// edges slant the way the window patches' sides do. It relights what's under it to fixed colours as the shafts do: the
// tiles the colours of a shaft's rim in the bright step and of its upper step in the dim one, the mat a few steps down
// from the tiles so it still reads as a mat, ink left alone; all of it dimmer than the walk outside, which is in the
// sun. So the way out shows from across the room, and on a phone it lies clear of the stick in the corner.
const DOOR_LIGHT = { reach: 56, step: 38 };
const DOOR_HI = fixedLight([[C.carpet0, '#6c6552'], [C.carpet1, '#857c60']], SHAFT_RIM);
const DOOR_LO = fixedLight([[C.carpet0, '#544e3e'], [C.carpet1, '#6c6552']], SHAFT_HI);
/** How (x, y) is lit, u pixels in from the threshold along the band: the bright step, the dim one, or not at all. */
function doorStep(x, y, u) {
  const { reach, step } = DOOR_LIGHT, even = (x + y) % 2 === 0;
  if (u < step) return DOOR_HI;
  if (u < step + 2) return even ? DOOR_LO : DOOR_HI;
  if (u < reach - 2) return DOOR_LO;
  if (u < reach) return even ? null : DOOR_LO;
  return null;
}
function drawDoorLight(ctx) {
  const x1 = END_WALL.x0, x0 = x1 - DOOR_LIGHT.reach, y0 = SIDE_DOOR.y0 + 1, y1 = SIDE_DOOR.y1 - END_WALL.h - 1;
  const w = x1 - x0, img = ctx.getImageData(x0, y0, w, y1 - y0), px = img.data;
  for (let y = y0; y < y1; y++) {
    const shear = Math.round(SUN.slope * (y - y0));
    for (let x = x0; x < x1; x++) {
      const f = doorStep(x, y, x1 - 1 - x + shear), k = ((y - y0) * w + x - x0) * 4;
      if (!f || keyOf(px[k], px[k + 1], px[k + 2]) === INK) continue;
      [px[k], px[k + 1], px[k + 2]] = f(px[k], px[k + 1], px[k + 2]);
    }
  }
  ctx.putImageData(img, x0, y0);
}

/** The EXIT sign over the side doors: white on red, as over the hallway doors, on a steel bracket whose post comes up
 *  out of the door frame's jamb where the wall behind the opening is cut away, so the sign and the bright gap under it
 *  read as one thing. It hangs at the height of the top of the doors, about five feet over the jamb's cut top, out over
 *  the floor inside them: up there it reads as the sign over a doorway, not a little sign on the floor, it's in the
 *  frame over the dialog box as the cut scene pans past the doors (cutscene.js beat 9), and it's 3 pixels under the
 *  way-out arrow (scene.js EXIT), which points on through the same doors. It sorts (roomThings) at the floor line
 *  `sort`, where the face of someone walking down the strip to the doors (34 pixels over their feet) comes level with
 *  its top: further back than that, it hangs in front of them and hides their legs, as it should; from there on they're
 *  drawn in front of it, so it never covers a face, and in the doorway her head covers it. */
const EXIT_SIGN = { x: END_WALL.x0 - 21, y: SIDE_DOOR.y0 - END_WALL.h - 39 };
EXIT_SIGN.sort = EXIT_SIGN.y + 32;
function exitSign() {
  const { x, y } = EXIT_SIGN, jx = END_WALL.x0, jy = SIDE_DOOR.y0 - END_WALL.h - 1;
  // The bracket: an arm out of the sign's right edge at its middle, and the post it hangs from, down into the jamb.
  rect(x + 18, y + 3, jx - x - 15, 3, C.ink);
  rect(jx, y + 3, 3, jy - y - 2, C.ink);
  rect(x + 19, y + 4, jx - x - 18, 1, STEEL[2]);
  rect(jx + 1, y + 4, 1, jy - y - 4, STEEL[2]);
  rect(jx + 1, y + 4, 1, 1, STEEL[3]);
  panel(x, y, 19, 9, RED[1]);
  rect(x + 1, y + 1, 17, 1, RED[2]);
  rect(x + 1, y + 7, 17, 1, RED[0]);
  text('EXIT', x + 10, y + 2, { font: 3, color: C.white, align: 'center' });
}

/**
 * Everything of the room's that stands on the floor, as [{ y, draw }] to sort in with the field and the people: the
 * furniture against the wall, the tables (each one thing at its front floor line, so whoever sits behind it is drawn
 * first and its front hides their legs), the backpacks, the cart, the doorway as o.door opens it (half open past a
 * quarter, open past three quarters), and the end wall in front of the side doors with the EXIT sign over them.
 * The caller sets the camera to view before each draw().
 */
export function roomThings(g, view, t, o = {}) {
  const vx0 = view.x - 20, vx1 = view.x + (view.w ?? W) + 20;
  // What stands against the wall sorts at the wall: nothing can be behind it, so anyone beside it is in front of it.
  const wall = ROOM.wallY;
  const things = [
    ...FOLDED.map((f) => ({ x0: f.x0, x1: f.x1, y: wall, draw: () => foldedTable(f.x0, f.x1) })),
    { ...SERVE, y: wall, draw: servingCounter },
    { ...VENDING[0], y: wall, draw: () => drinksMachine(VENDING[0].x0, VENDING[0].x1) },
    { ...VENDING[1], y: wall, draw: () => snackMachine(VENDING[1].x0, VENDING[1].x1) },
    { ...FURNITURE.bins, y: wall, draw: bins },
    { ...FURNITURE.programmerTable, y: FURNITURE.programmerTable.y1, draw: programmerTable },
    { ...FURNITURE.scoutTable, y: FURNITURE.scoutTable.y1, draw: scoutTable },
    ...BACKPACKS.map((b) => ({ x0: b.x - 5, x1: b.x + 5, y: b.y, draw: () => backpack(b) })),
    { ...FURNITURE.janitorCart, y: FURNITURE.janitorCart.y1, draw: janitorCart },
  ];
  const door = o.door ?? 0;
  if (door > 0.25) things.push({ x0: DOORS.x0, x1: DOORS.x1, y: ROOM.wallY, draw: () => doorway(door < 0.75) });
  // The end wall in front of the side doors, sorted at the opening's near edge; the sign over the opening (EXIT_SIGN).
  const near = SIDE_DOOR.y1;
  things.push({ x0: END_WALL.x0, x1: END_WALL.x1, y: near, draw: () => endWallRun(near, ROOM.h + END_WALL.h + 1) });
  things.push({ x0: EXIT_SIGN.x, x1: END_WALL.x0 + 3, y: EXIT_SIGN.sort, draw: exitSign });
  return things.filter((p) => p.x1 > vx0 && p.x0 < vx1).map((p) => ({ y: p.y, draw: p.draw }));
}

/** Where the furniture stands, { x0, x1, y0, y1 } with y0-y1 its back and front floor lines: nobody walks through it. The
 *  gap between the second folded table and the counter is too narrow to stand in, so it's blocked too, and so is the
 *  end wall either side of the side doors, out past the edge of the world, so the doors are the only way out. */
export const ROOM_BLOCKS = [
  ...FOLDED.map((f) => ({ x0: f.x0, x1: f.x1, y0: ROOM.wallY, y1: roomY(2) })),
  { x0: FOLDED[1].x1, x1: SERVE.x0, y0: ROOM.wallY, y1: roomY(2.5) },
  { x0: SERVE.x0, x1: SERVE.x1, y0: ROOM.wallY, y1: roomY(2.5) },
  ...VENDING.map((v) => ({ x0: v.x0, x1: v.x1, y0: ROOM.wallY, y1: roomY(2.5) })),
  ...['bins', 'programmerTable', 'scoutTable', 'janitorCart'].map((k) => ({ ...FURNITURE[k] })),
  ...BACKPACKS.map((b) => ({ x0: b.x - 4, x1: b.x + 5, y0: b.y - 3, y1: b.y })),
  { x0: END_WALL.x0, x1: ROOM.w + 64, y0: ROOM.wallY, y1: SIDE_DOOR.y0 },
  { x0: END_WALL.x0, x1: ROOM.w + 64, y0: SIDE_DOOR.y1, y1: ROOM.h + 64 },
];
