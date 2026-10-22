// The van from in front and above, its roof cut away: team 5026's white passenger van on the highway at dawn with the
// red trailer behind it, at Blue Banner's usual 20 degrees. The trailer is at the top, the front bumper at the bottom, and
// between them three rows of seats with everyone facing you (people.js sits them in the rows; this file draws the van
// round them). The van drives down the screen, toward you, so the road streams up past it: asphalt, the shoulder's
// rumble strip, the lane lines, the grass verge with its trees, a farm fence and the backs of road signs (they face the
// drivers coming the other way to you, so you only see their bracing), and on the far side of the passing lane the
// median's yellow line and guardrail. Now and then a car in the passing lane overtakes, down the screen. The van rides
// a pixel up now and then, the trailer a moment later.
//
// Everything is in world pixels (layout.js has the coordinates, 256 x 184): world (x, y) is screen (x - ox, y - oy).
// The road is drawn once into a strip that tiles every 120 pixels and is scrolled, like field.js's floor; the trailer,
// the van's tub, each row's seats, the steering wheel and the van's front are drawn once each into layers and blitted;
// only the roadside, the passing cars, the tyres' tread and the turn signals are drawn live. Boxes are field.js's
// box(): a lighter top face, a darker face toward you, an ink outline and a highlight line on the lit edge.

import { C, useContext, screen, camera, rect, disk, text, measure, layer, rnd } from '../pixel.js';
import { CABIN, VX, BODY, CABIN_IN, ROWS, SEATS_AT, WHEEL, Y, ROAD, bounce, trailerBounce, blinkOn, RAMP } from './layout.js';

const TILE = 120; // the road strip repeats every 120 pixels down
const PANEL = '#aab2c8', STEEL = '#5d6580'; // field.js's: the cargo ship's light panels and the HAB's steel
const SHADOW = 'rgba(5, 6, 13, 0.45)'; // stage.js drawWithShadow's
const EDGE = STEEL; // the highlight line along the seats' lit top edges
const LAMP_H = 4; // the headlights', grille's and corner lamps' height on the nose, a band of the nose under them

/** A stepped line two pixels thick from (x0, y0) to (x1, y1), one row at a time: rails, tongues, wiper arms. */
function bar(x0, y0, x1, y1, c, w = 2) {
  for (let y = y0; y <= y1; y++) rect(Math.round(x0 + ((x1 - x0) * (y - y0)) / Math.max(1, y1 - y0)), y, w, 1, c);
}

// ---- The road, drawn once ----
// Asphalt in the field's carpet greys, the shoulder a step lighter with rumble grooves, the white edge line and lane
// dashes, a couple of sealed cracks across the lanes and two patches in the passing lane, so you can see the road move
// even where it's mostly hidden under the van. The verge is grass with sparse blades. Past the passing lane, the median
// the outside view has: the yellow edge line, a paved strip, the guardrail (a steel W-beam seen from above, lit on its
// left, the posts' tops peeking out behind it every 12 pixels) and a strip of its dark grass.
function makeRoad() {
  return layer(CABIN.w, TILE, () => {
    const [, v1] = ROAD.verge, [s0, s1] = ROAD.shoulder, [p0, p1] = ROAD.passing;
    const wrap = (x, y, w, h, c) => { for (const dy of [0, -TILE, TILE]) rect(x, y + dy, w, h, c); };
    rect(0, 0, CABIN.w, TILE, RAMP.asphalt[1]);
    rect(s0, 0, s1 - s0, TILE, RAMP.asphalt[2]);
    // Speckle: the field carpet's on the lanes, a lighter pair on the shoulder.
    for (let i = 0; i < 1500; i++) {
      const x = s0 + Math.floor(rnd(i + 100) * (CABIN.w - s0)), y = Math.floor(rnd(i + 2100) * TILE), lit = rnd(i + 4100) < 0.5;
      rect(x, y, 1, 1, x < s1 ? (lit ? '#3d4050' : '#2f323e') : lit ? '#30333f' : '#272a35');
    }
    // Two patches in the passing lane, out where only the whole-van view sees them: darker asphalt with a sealed edge.
    for (const [x, y, w, h] of [[204, 18, 30, 15], [194, 80, 12, 18]]) {
      rect(x - 1, y - 1, w + 2, h + 2, '#1e2029');
      rect(x, y, w, h, '#272a35');
      for (let i = 0; i < (w * h) / 14; i++) rect(x + Math.floor(rnd(i + x) * w), y + Math.floor(rnd(i + y + 50) * h), 1, 1, RAMP.asphalt[1]);
    }
    // Sealed cracks across the road, wandering a pixel up and down.
    for (const [y0, xa, xb, seed] of [[46, s0, p1, 1], [101, p0 + 6, p1, 2], [7, s0, ROAD.lane[1], 3]]) {
      let y = y0;
      for (let x = xa; x < xb; x++) {
        if (rnd(x * 1.7 + seed * 31) < 0.12) y += rnd(x + seed) < 0.5 ? -1 : 1;
        wrap(x, y, 1, 1, '#1e2029');
      }
    }
    // The rumble strip: short grooves cut across the shoulder, each with its lit lip below.
    for (let y = 0; y < TILE; y += 4) {
      rect(68, y, 6, 1, RAMP.asphalt[0]);
      rect(68, y + 1, 6, 1, '#3d4050');
    }
    // The solid edge line and the lane dashes, a little worn.
    rect(ROAD.edgeLine, 0, 2, TILE, C.tape);
    for (let y = 0; y < TILE; y += 40) rect(ROAD.dashes, y + 12, 2, 14, C.tape);
    for (let i = 0; i < 26; i++) {
      const y = Math.floor(rnd(i + 700) * TILE);
      rect(ROAD.edgeLine + (i % 2), y, 1, 1, C.steel3);
    }
    // The median: the yellow line (worn like the white one), the paved strip, the guardrail on its posts, the grass.
    const { yellow, rail, median } = ROAD;
    rect(yellow, 0, 2, TILE, C.yel1);
    rect(yellow + 1, 0, 1, TILE, C.yel0);
    for (let i = 0; i < 18; i++) rect(yellow + (i % 2), Math.floor(rnd(i + 760) * TILE), 1, 1, RAMP.asphalt[1]);
    rect(yellow + 2, 0, rail - yellow - 2, TILE, RAMP.asphalt[2]);
    rect(median, 0, CABIN.w - median, TILE, RAMP.grass[0]);
    for (let i = 0; i < 40; i++) rect(median + 1 + Math.floor(rnd(i + 780) * (CABIN.w - median - 1)), Math.floor(rnd(i + 790) * TILE), 1, 1, RAMP.leaf[0]);
    for (let y = 0; y < TILE; y += 12) {
      // A post's top behind the beam, lit on the left, and its shadow on the grass to the lower right.
      rect(rail + 5, y + 4, 3, 2, SHADOW);
      rect(rail + 4, y, 4, 4, C.ink);
      rect(rail + 5, y + 1, 2, 2, C.steel1);
      rect(rail + 5, y + 1, 1, 1, C.steel2);
    }
    rect(rail, 0, 5, TILE, C.ink);
    rect(rail + 1, 0, 1, TILE, C.steel3);
    rect(rail + 2, 0, 1, TILE, C.steel2);
    rect(rail + 3, 0, 1, TILE, C.steel1);
    for (let y = 1; y < TILE; y += 12) rect(rail + 2, y, 1, 1, C.steel0); // the bolts into the posts
    // The verge: grass, a ragged edge against the shoulder, sparse blades lit on the left.
    rect(0, 0, v1, TILE, RAMP.grass[1]);
    for (let y = 0; y < TILE; y++) {
      const r = rnd(y * 3.3 + 5);
      rect(v1 - 1, y, r < 0.35 ? 2 : 1, 1, r < 0.7 ? RAMP.grass[0] : RAMP.grass[1]);
      if (r > 0.8) rect(v1, y, 1, 1, RAMP.grass[0]);
    }
    for (let i = 0; i < 230; i++) {
      const x = Math.floor(rnd(i + 5000) * (v1 - 2)), y = Math.floor(rnd(i + 5500) * TILE);
      if (rnd(i + 6000) < 0.55) {
        wrap(x, y, 1, 2, RAMP.grass[2]);
        wrap(x + 1, y + 1, 1, 1, RAMP.grass[0]);
      } else wrap(x, y, 1, 1, RAMP.grass[0]);
    }
  });
}

// ---- The roadside, live ----
// Trees, fence posts and sign backs stand on the verge at fixed places along the road and stream up with it. Each is
// placed from rnd() of its slot along the road, so nothing repeats and every frame is a pure function of time.
const FENCE_X = 30, POST_EVERY = 16, SLOT = 26;

/** A roadside tree, its trunk's foot at (x, y): a stepped blob of leaves lit from the upper left, size pixels across. */
function tree(x, y, size, seed) {
  const r = size >> 1, trunk = 5 + (seed % 3), cy = y - trunk - r + 3;
  const lobes = [[0, 0, r], [-Math.round(r * 0.55), Math.round(r * 0.35), Math.round(r * 0.6)], [Math.round(r * 0.55), Math.round(r * 0.3), Math.round(r * 0.62)]];
  // Its shadow on the grass, falling to the lower right like everyone's.
  rect(x - r + 4, y - 2, r * 2 - 1, 4, SHADOW);
  rect(x - r + 6, y - 3, r * 2 - 5, 1, SHADOW);
  rect(x - r + 6, y + 2, r * 2 - 5, 1, SHADOW);
  rect(x - 2, y - trunk - 2, 5, trunk + 3, C.ink);
  rect(x - 1, y - trunk - 1, 3, trunk + 1, RAMP.bark[1]);
  rect(x - 1, y - trunk - 1, 1, trunk + 1, RAMP.bark[2]);
  rect(x + 1, y - trunk - 1, 1, trunk + 1, RAMP.bark[0]);
  for (const [dx, dy, lr] of lobes) disk(x + dx, cy + dy, lr + 1, C.ink);
  for (const [dx, dy, lr] of lobes) disk(x + dx, cy + dy, lr, RAMP.leaf[0]);
  for (const [dx, dy, lr] of lobes) disk(x + dx - 1, cy + dy - 1, lr - 1, RAMP.leaf[1]);
  for (const [dx, dy, lr] of lobes) if (lr > 3) disk(x + dx - 2, cy + dy - 2, lr - 3, RAMP.leaf[2]);
  // Leaf clusters: a few dark ticks in the light and light ones in the middle tone.
  for (let i = 0; i < r + 2; i++) {
    const a = rnd(seed * 13 + i) * Math.PI * 2, d = rnd(seed * 7 + i + 0.5) * (r - 2);
    const lx = x + Math.round(Math.cos(a) * d), ly = cy + Math.round(Math.sin(a) * d * 0.9);
    rect(lx, ly, 2, 1, i % 2 ? RAMP.leaf[0] : RAMP.leaf[2]);
  }
}

/** A wooden fence post on the verge, and the wire from its top to the next post's, further down the road. */
function post(x, y) {
  rect(x - 1, y - 9, 4, 10, C.ink);
  rect(x, y - 8, 2, 8, RAMP.bark[1]);
  rect(x, y - 8, 1, 8, RAMP.bark[2]);
  rect(x, y - 8, 2, 1, RAMP.bark[2]);
}
const wire = (x, y) => rect(x + 1, y - POST_EVERY - 7, 1, POST_EVERY, C.steel2);

/** The back of a road sign on two posts, facing the oncoming drivers: bare aluminium with its bracing. */
function signBack(x, y) {
  const w = 24, h = 12, up = 11, x0 = x - w / 2, top = y - up - h;
  for (const px of [x - 7, x + 6]) {
    rect(px - 1, y - up - 1, 3, up + 2, C.ink);
    rect(px, y - up, 1, up, C.steel2);
  }
  rect(x0 - 1, top - 1, w + 2, h + 2, C.ink);
  rect(x0, top, w, h, C.steel2);
  rect(x0, top, w, 1, C.steel3);
  rect(x0, top, 1, h, C.steel3);
  for (const by of [top + 3, top + 8]) {
    rect(x0 + 1, by, w - 1, 2, C.steel1);
    rect(x0 + 1, by, w - 1, 1, PANEL);
  }
  for (const px of [x - 7, x + 6]) for (const by of [top + 3, top + 8]) rect(px, by, 1, 1, C.steel0);
}

/** Everything standing on the verge whose floor line is near the view, as { y, draw } sorted back to front. */
function roadside(s) {
  const things = [];
  const k0 = Math.floor((s - 8) / SLOT) - 1, k1 = Math.ceil((s + CABIN.h + 40) / SLOT);
  for (let k = k0; k <= k1; k++) {
    const y = k * SLOT + Math.floor(rnd(k * 3.7 + 0.5) * 10) - s;
    // A sign every so often, near the shoulder; trees behind the fence, sometimes two together.
    if (((k % 11) + 11) % 11 === 3) things.push({ y: y + 4, draw: () => signBack(40, y + 4) });
    if (rnd(k * 1.31 + 7) < 0.8) {
      const x = 2 + Math.floor(rnd(k * 2.9 + 3) * 20), size = 14 + Math.floor(rnd(k * 5.1 + 1) * 7);
      things.push({ y, draw: () => tree(x, y, size, ((k % 97) + 97) % 97) });
    }
    if (rnd(k * 4.3 + 2) < 0.3) {
      const x = 14 + Math.floor(rnd(k * 6.1) * 10), y2 = y + 11;
      things.push({ y: y2, draw: () => tree(x, y2, 14, ((k * 3 + 5) % 97 + 97) % 97) });
    }
  }
  const j0 = Math.floor((s - 8) / POST_EVERY) - 1, j1 = Math.ceil((s + CABIN.h + 24) / POST_EVERY);
  for (let j = j0; j <= j1; j++) {
    const y = j * POST_EVERY - s;
    things.push({ y: y - 0.5, draw: () => wire(FENCE_X, y) }, { y, draw: () => post(FENCE_X, y) });
  }
  for (const p of things.sort((a, b) => a.y - b.y)) p.draw();
}

// ---- Passing cars ----
// Seen like the van, from in front and above, but with their roofs on: the trunk, the rear glass, the roof, the
// windshield with its streak of sky, the hood, the nose with its headlights, the bumper and the tyres under it.
const CAR = { w: 64, h: 58, x: 180, every: 16, speed: 35, phase: 9 };
const CAR_COLOURS = [[C.blue0, C.blue1, C.blue2], [C.steel1, STEEL, C.steel2], RAMP.sign];

function makeCar([c0, c1, c2]) {
  return layer(CAR.w, CAR.h, () => {
    const [g0, g1, g2] = RAMP.glass;
    // Tyres peeking out under the bumper, then the body's silhouette with its rounded corners and the mirrors.
    for (const tx of [6, 49]) {
      rect(tx - 1, 50, 11, 7, C.ink);
      rect(tx, 51, 9, 5, C.tire);
      rect(tx + 2, 52 + (tx & 1), 5, 1, C.ink);
    }
    rect(5, 0, 54, 1, C.ink);
    rect(3, 1, 58, 52, C.ink);
    rect(4, 53, 56, 1, C.ink);
    rect(0, 25, 64, 5, C.ink);
    // Trunk lid, tail lights at its corners.
    rect(4, 1, 56, 7, c1);
    rect(5, 1, 54, 1, c2);
    rect(4, 2, 1, 6, c2);
    for (const lx of [4, 54]) {
      rect(lx, 2, 6, 2, RAMP.tail[1]);
      rect(lx, 2, 2, 1, RAMP.tail[2]);
    }
    // The glass round the roof: the rear window, the side windows leaning in, the windshield widening toward you.
    rect(10, 8, 44, 3, g0);
    rect(11, 8, 42, 1, g1);
    rect(4, 8, 4, 22, c1);
    rect(56, 8, 4, 22, c0);
    rect(4, 8, 1, 22, c2);
    rect(8, 9, 3, 20, g1);
    rect(53, 9, 3, 20, g0);
    rect(9, 12, 1, 4, g2);
    rect(54, 12, 1, 3, g1);
    for (let i = 0; i < 6; i++) rect(10 - (i >> 1), 23 + i, 44 + 2 * (i >> 1), 1, g0);
    // The roof, rounded at its corners, lit along its far and left edges.
    rect(11, 10, 42, 13, C.ink);
    rect(12, 11, 40, 11, c1);
    rect(12, 11, 40, 1, c2);
    rect(12, 11, 1, 11, c2);
    rect(51, 12, 1, 10, c0);
    for (const [x, y] of [[11, 10], [52, 10], [11, 22], [52, 22]]) rect(x, y, 1, 1, g0);
    // The sky in the windshield: a stepped streak and a fainter one.
    for (let i = 0; i < 5; i++) rect(15 + i * 3, 27 - i, 3, 1, g2);
    for (let i = 0; i < 3; i++) rect(33 + i * 3, 27 - i, 2, 1, g1);
    // Mirrors.
    rect(1, 26, 3, 3, c1);
    rect(1, 26, 3, 1, c2);
    rect(60, 26, 3, 3, c0);
    // The hood, its far edge lit, a crease down each side.
    rect(4, 29, 56, 12, c1);
    rect(4, 29, 56, 1, c2);
    rect(4, 29, 1, 12, c2);
    rect(17, 30, 1, 11, c2);
    rect(46, 30, 1, 11, c0);
    // The nose: headlights at the corners with a lit corner each, the grille between, then the bumper.
    rect(4, 41, 56, 9, c0);
    rect(4, 41, 56, 1, c1);
    for (const hx of [5, 47]) {
      rect(hx - 1, 41, 14, 5, C.ink);
      rect(hx, 42, 12, 3, RAMP.lamp[1]);
      rect(hx, 42, 4, 1, RAMP.lamp[2]);
      rect(hx + 8, 44, 4, 1, RAMP.lamp[0]);
    }
    rect(21, 42, 22, 6, C.ink);
    rect(22, 43, 20, 4, C.steel0);
    for (const gy of [43, 45]) rect(22, gy, 20, 1, C.steel1);
    rect(4, 50, 56, 3, C.steel1);
    rect(4, 50, 56, 1, STEEL);
  });
}

/** The car overtaking now, if any: one every 16 seconds (or every `every`), gaining 35 pixels a second on the van. */
function passingCar(g, t, ox, oy, cars, every = CAR.every) {
  const u = t + CAR.phase, n = Math.floor(u / every);
  const y = Math.floor((u - n * every) * CAR.speed) - CAR.h - 8;
  if (y > CABIN.h) return;
  const x = CAR.x + Math.floor(rnd(n * 2.3) * 2); // never over the yellow line
  g.fillStyle = SHADOW;
  g.fillRect(x + 6 - ox, y + 4 - oy, CAR.w - 6, CAR.h - 4);
  g.drawImage(cars[((n % 3) + 3) % 3].canvas, x - ox, y - oy);
}

// ---- The trailer, drawn once ----
// The team's enclosed trailer in the strategist's tee red, nose first behind the van: the roof, the V-nose (its left
// facet catching the light, the right in shade), the panther's hexagon and 5026, amber marker lights, the aluminium
// stone guard, then the tongue's A-frame with the jack and the safety chains, down to the hitch.
const TRAILER = { x0: 86, x1: 170 };
/** How far the V-nose's middle comes toward you, at x. */
const vee = (x) => Math.round(4 * (1 - Math.abs(x + 0.5 - VX) / ((TRAILER.x1 - TRAILER.x0) / 2)));
const HEX = [
  '....w....',
  '..wwkww..',
  'wwkkkkkww',
  'wkkWkWkkw',
  'wkkWWWWkw',
  'wkkWkWWkw',
  'wkkkWWkkw',
  'wwkkkkkww',
  '..wwkww..',
  '....w....',
];
/** The panther in its hexagon, top-left at (x, y). */
function hexBadge(x, y) {
  const pal = { w: C.white, k: '#16161b', W: C.white };
  HEX.forEach((row, j) => [...row].forEach((ch, i) => { if (pal[ch]) rect(x + i, y + j, 1, 1, pal[ch]); }));
}

function makeTrailer() {
  return layer(CABIN.w, Y.rearBumper, () => {
    const { x0, x1 } = TRAILER, [t0, t1, t2] = RAMP.trailer, [k0, k1, k2] = RAMP.trim;
    // The tongue: an A-frame from the trailer's front corners to the coupler, the jack on its left rail.
    const top = Y.tongue + 1;
    bar(107, top - 1, 125, Y.hitch, C.ink, 4);
    bar(146, top - 1, 128, Y.hitch, C.ink, 4);
    bar(108, top, 126, Y.hitch - 1, k2);
    bar(146, top, 128, Y.hitch - 1, k1);
    bar(108, top, 126, Y.hitch - 1, C.steel2, 1);
    bar(146, top, 128, Y.hitch - 1, k2, 1);
    // Safety chains, sagging in loops from the frame to the hitch.
    for (const [cx, dir] of [[119, 1], [137, -1]]) {
      for (let i = 0; i < 7; i++) rect(cx + dir * i, Y.tongue + 3 + Math.round(Math.sin((i / 6) * Math.PI) * 3), 1, 1, i % 2 ? C.steel3 : C.steel1);
    }
    // The coupler on the hitch ball.
    rect(123, Y.hitch - 5, 10, 6, C.ink);
    rect(124, Y.hitch - 4, 8, 4, k1);
    rect(124, Y.hitch - 4, 8, 1, k2);
    rect(127, Y.hitch - 3, 2, 1, C.steel3);
    // The jack: a tube standing on the left rail, its crank on top and its little wheel tucked up under.
    rect(112, 19, 5, 15, C.ink);
    rect(113, 20, 3, 13, C.steel2);
    rect(113, 20, 1, 13, C.steel3);
    rect(110, 18, 5, 3, C.ink);
    rect(111, 19, 3, 1, C.steel3);
    rect(111, 33, 7, 5, C.ink);
    rect(112, 34, 5, 3, C.tire);
    rect(114, 34, 1, 3, C.steel2);
    // The body: the roof back to the edge of the world, its V-shaped front edge, the face toward you below it.
    for (let x = x0; x < x1; x++) rect(x, 0, 1, Y.tongue + vee(Math.min(Math.max(x, x0 + 1), x1 - 2)) + 1, C.ink);
    for (let x = x0 + 1; x < x1 - 1; x++) {
      const v = vee(x), roofEnd = Y.trailerFace + v, faceEnd = Y.tongue + v;
      rect(x, 0, 1, roofEnd, t2);
      rect(x, roofEnd - 1, 1, 1, C.steel3); // the aluminium cap along the roof's edge
      rect(x, roofEnd, 1, faceEnd - roofEnd, x < VX ? t1 : t0);
      // The stone guard: diamond plate over the bottom of the nose, lit on the left facet.
      rect(x, faceEnd - 6, 1, 6, x < VX ? C.steel2 : C.steel1);
      rect(x, faceEnd - 6, 1, 1, x < VX ? C.steel3 : C.steel2);
      for (let y = faceEnd - 4; y < faceEnd; y += 2) if ((x + (y >> 1)) % 4 === 0) rect(x, y, 1, 1, x < VX ? PANEL : C.steel2);
    }
    // Roof ribs across it, and the lit apex where the two facets meet.
    for (let y = 2; y < Y.trailerFace; y += 3) rect(x0 + 1, y, x1 - x0 - 2, 1, t1);
    rect(VX - 1, Y.trailerFace + 4, 1, Y.tongue - Y.trailerFace - 6, t2);
    // The panther and 5026, across the nose.
    hexBadge(VX - 18, 16);
    text('5026', VX - 6, 17, { color: C.white, shadow: t0, sx: 1, sy: 1 });
    // Amber marker lights at the nose's top corners.
    for (const mx of [x0 + 2, x1 - 5]) {
      rect(mx - 1, Y.trailerFace, 5, 4, C.ink);
      rect(mx, Y.trailerFace + 1, 3, 2, RAMP.amber[1]);
      rect(mx, Y.trailerFace + 1, 1, 1, RAMP.amber[2]);
    }
  });
}

// ---- The van: the tub, drawn once ----
// The two door tops and the tailgate, cut at the window line (white, lit, outlined, a dark seal on the inside edge),
// the rear bumper and hitch behind the tailgate, the floor, and the cargo well behind the back row.
const STRIP = 5; // the door tops' width, ink included

function doorTop(x, y0, y1, left) {
  // Outer ink, a lit edge, the top face, then the rubber seal on the inside.
  const [b0, b1, b2] = RAMP.body;
  if (left) {
    rect(x, y0, 1, y1 - y0, C.ink);
    rect(x + 1, y0, 1, y1 - y0, b2);
    rect(x + 2, y0, 2, y1 - y0, b1);
    rect(x + 4, y0, 1, y1 - y0, RAMP.trim[0]);
  } else {
    rect(x, y0, 1, y1 - y0, RAMP.trim[0]);
    rect(x + 1, y0, 1, y1 - y0, b2);
    rect(x + 2, y0, 2, y1 - y0, b1);
    rect(x + 3, y0, 1, y1 - y0, b0);
    rect(x + 4, y0, 1, y1 - y0, C.ink);
  }
}

/** A spare bumper standing on its edge, the way sprites.js draws a robot's: fabric over the wood, 5026 in white. */
function spareBumper(x0, w, top, cols) {
  rect(x0 - 1, top - 2, w + 2, 10, C.ink);
  rect(x0, top - 1, w, 1, cols[2]); // its top edge, seen from above
  rect(x0, top, w, 7, cols[1]);
  rect(x0, top, w, 1, cols[2]);
  rect(x0, top + 6, w, 1, cols[0]);
  text('5026', Math.round(x0 + w / 2 - measure('5026', { font: 3 }) / 2), top + 1, { font: 3, color: C.white });
}

/** A box on the floor: its top, then the face toward you, outlined, the top's far edge lit. Returns the face's top. */
function crate(x, w, y, deep, tall, top, face, edge) {
  rect(x - 1, y - tall - deep - 1, w + 2, tall + deep + 2, C.ink);
  rect(x, y - tall - deep, w, deep, top);
  rect(x, y - tall - deep, w, 1, edge);
  rect(x, y - tall, w, tall, face);
  return y - tall;
}

function makeTub() {
  return layer(CABIN.w, CABIN.h, () => {
    const { x0, x1 } = BODY, [k0, k1, k2] = RAMP.trim, [m0, m1, m2] = RAMP.mat, [b0, b1, b2] = RAMP.body;
    // The hitch receiver under the rear bumper, then the bumper's top behind the tailgate, with its step pad.
    rect(124, Y.hitch - 1, 8, 3, C.ink);
    rect(125, Y.hitch, 6, 1, k0);
    rect(x0 + 2, Y.rearBumper - 1, x1 - x0 - 4, 5, C.ink);
    rect(x0 + 3, Y.rearBumper, x1 - x0 - 6, 3, k1);
    rect(x0 + 3, Y.rearBumper, x1 - x0 - 6, 1, k2);
    for (let x = 112; x < 144; x += 2) rect(x, Y.rearBumper + 2, 1, 1, k0);
    // The floor of the cabin, a rubber mat with a sparse dot grid.
    rect(CABIN_IN.x0, Y.tailgate, CABIN_IN.x1 - CABIN_IN.x0, Y.dash - Y.tailgate, m1);
    for (let y = Y.cargo + 5; y < Y.dash; y += 3) for (let x = CABIN_IN.x0 + 2 + ((y / 3) % 2) * 2; x < CABIN_IN.x1 - 1; x += 4) rect(x, y, 1, 1, m2);
    // The tailgate, cut at the window line: its top face, then its inside panel facing you.
    rect(x0, Y.tailgate - 1, x1 - x0, 5, C.ink);
    rect(x0 + 1, Y.tailgate, x1 - x0 - 2, 1, b2);
    rect(x0 + 1, Y.tailgate + 1, x1 - x0 - 2, 2, b1);
    rect(x0 + 1, Y.tailgate + 3, x1 - x0 - 2, 1, k0);
    rect(CABIN_IN.x0, Y.cargo, CABIN_IN.x1 - CABIN_IN.x0, 4, k1);
    rect(CABIN_IN.x0, Y.cargo, CABIN_IN.x1 - CABIN_IN.x0, 1, k2);
    rect(CABIN_IN.x0, Y.cargo + 4, CABIN_IN.x1 - CABIN_IN.x0, 1, m0);
    for (let x = CABIN_IN.x0 + 6; x < CABIN_IN.x1 - 6; x += 6) rect(x, Y.cargo + 2, 3, 1, k0);
    // The door tops, tailgate to dash; seams at the sliding door's back edge and the front doors.
    doorTop(x0, Y.tailgate, Y.hood, true);
    doorTop(x1 - STRIP, Y.tailgate, Y.hood, false);
    for (const y of [ROWS[3] - 6, ROWS[2] - 6]) rect(x0 + 1, y, 3, 1, b0);
    rect(x1 - 4, ROWS[2] - 6, 3, 1, b0);
    rect(x0 + 1, ROWS[2] + 2, 3, 1, b0); // the sliding door's track
    // Tail lights wrapping the tailgate's corners: red, lit on top and on the left, the turn signal below (smoked grey
    // until it blinks).
    for (const side of [1, -1]) {
      const sx = side > 0 ? x0 + 1 : x1 - 4, tx = side > 0 ? x0 + 1 : x1 - 7, [r0, r1, r2] = RAMP.tail;
      rect(side > 0 ? tx + 6 : tx - 1, Y.tailgate, 1, 3, C.ink);
      rect(tx, Y.tailgate, 6, 3, r1);
      rect(sx, Y.tailgate, 3, 8, r1);
      rect(tx, Y.tailgate, 6, 1, r2);
      rect(sx, Y.tailgate, 1, 8, side > 0 ? r2 : r1);
      rect(sx + 2, Y.tailgate + 1, 1, 7, side > 0 ? r1 : r0);
      rect(tx, Y.tailgate + 2, 6, 1, r0);
      rect(sx, Y.tailgate + 8, 3, 1, C.ink);
      rect(sx, Y.tailgate + 9, 3, 3, RAMP.trim[1]); // the turn signal, off
      rect(sx, Y.tailgate + 12, 3, 1, C.ink);
    }
    cargo();
  });
}

/** The cargo well: spare bumpers against the tailgate, a toolbox, the duffels and the cooler. */
function cargo() {
  const floor = Y.cargo + 18;
  // Both colours of bumper, stood on edge against the tailgate: a match can put 5026 on either alliance. They stand
  // high enough that the back row's headrests leave their numbers whole.
  spareBumper(129, 31, Y.cargo + 2, [C.blue0, C.blue1, C.blue2]);
  spareBumper(97, 31, Y.cargo + 2, [C.red0, C.red1, C.red2]);
  // The duffels, slumped in front of them: rounded, lit on top, a strap across.
  const duffel = (x, w, y, h, [d0, d1, d2]) => {
    rect(x + 1, y - h - 1, w - 2, h + 2, C.ink);
    rect(x, y - h, w, h, C.ink);
    rect(x + 1, y - h, w - 2, h - 1, d1);
    rect(x + 2, y - h, w - 4, 2, d2);
    rect(x + 1, y - 2, w - 2, 1, d0);
    rect(x + 3, y - h + 1, 1, 1, d2);
    rect(x + Math.round(w / 2) - 1, y - h, 2, h, C.steel0);
  };
  duffel(126, 17, floor - 1, 8, RAMP.sign);
  duffel(111, 16, floor + 1, 8, [C.steel0, C.steel1, STEEL]);
  // The toolbox: grey, its yellow handle folded over the lid, the latches.
  const lid = crate(96, 15, floor + 2, 3, 6, C.steel2, C.steel1, C.steel3);
  rect(99, lid - 4, 9, 2, C.ink);
  rect(100, lid - 4, 7, 1, C.yel1);
  rect(100, lid - 4, 2, 1, C.yel2);
  for (const lx of [98, 108]) rect(lx, lid + 1, 2, 2, C.yel1);
  // The cooler: blue, its white lid lit, the handle on the end.
  const cl = crate(144, 15, floor + 2, 3, 7, C.steel3, C.blue1, C.white);
  rect(144, cl, 15, 1, C.blue0);
  rect(144, cl + 1, 1, 6, C.blue2);
  rect(147, cl + 3, 9, 1, C.blue0);
  rect(157, cl + 2, 2, 3, C.ink);
}

// ---- The seats, drawn once per row ----
// Rows 3 and 2 are benches across the cabin, row 1 two bucket seats with the console between them. Each seat is a
// backrest box (its top lit, a highlight line on the far edge), a headrest behind each person's head on two posts, and
// the cushion they sit on. Everything is upholstery in RAMP.seat.
function backrest(x0, x1, y, shaped) {
  const [s0, s1, s2] = RAMP.seat;
  rect(x0 - 1, y - 30, x1 - x0 + 2, 19, C.ink);
  rect(x0, y - 31, x1 - x0, 1, C.ink);
  rect(x0, y - 30, x1 - x0, 3, s2);
  rect(x0, y - 30, x1 - x0, 1, EDGE);
  rect(x0, y - 27, x1 - x0, 15, s1);
  rect(x0, y - 27, 1, 15, s2);
  rect(x1 - 1, y - 27, 1, 15, s0);
  if (shaped) {
    // A bucket's bolsters: raised sides, lit on the left, and its rounded shoulders.
    rect(x0 + 3, y - 27, 1, 15, s0);
    rect(x1 - 4, y - 27, 1, 15, s0);
    rect(x0 + 1, y - 27, 2, 15, s2);
    rect(x0, y - 30, 1, 1, C.ink);
    rect(x1 - 1, y - 30, 1, 1, C.ink);
  }
  // The cushion's top, where they sit, and its front edge.
  rect(x0 - 1, y - 12, x1 - x0 + 2, 9, C.ink);
  rect(x0, y - 12, x1 - x0, 1, s0);
  rect(x0, y - 11, x1 - x0, 3, s2);
  rect(x0, y - 8, x1 - x0, 4, s1);
  rect(x0, y - 5, x1 - x0, 1, s0);
}

function headrest(x, y) {
  const [s0, s1, s2] = RAMP.seat;
  rect(x - 3, y - 32, 1, 1, C.steel2);
  rect(x + 3, y - 32, 1, 1, C.steel2);
  rect(x - 6, y - 40, 13, 8, C.ink);
  rect(x - 5, y - 39, 11, 2, s2);
  rect(x - 5, y - 39, 11, 1, EDGE);
  rect(x - 5, y - 37, 11, 4, s1);
  rect(x + 5, y - 37, 1, 4, s0);
}

function makeSeats(r) {
  return layer(CABIN.w, CABIN.h, () => {
    const y = ROWS[r], [s0] = RAMP.seat, [k0, k1, k2] = RAMP.trim;
    const who = Object.values(SEATS_AT).filter(([, sy]) => sy === y);
    if (r === 1) {
      // Two buckets, then the console between them: an armrest bin as tall as the seat backs, its padded lid lit along
      // the far edge like theirs, so it fills the gap between them the way they fill the rest of the row (and hides the
      // middle row's legs, as the seat backs do everyone else's); and in front of it a low tray with two cup holders.
      backrest(97, 121, y, true);
      backrest(135, 159, y, true);
      const [, s1, s2] = RAMP.seat;
      rect(121, y - 31, 14, 13, C.ink);
      rect(122, y - 30, 12, 3, s2);
      rect(122, y - 30, 12, 1, EDGE);
      rect(122, y - 28, 12, 1, s1);
      rect(122, y - 27, 12, 8, k1);
      rect(122, y - 27, 1, 8, k2);
      rect(133, y - 27, 1, 8, k0);
      rect(122, y - 20, 12, 1, k0);
      rect(127, y - 26, 2, 2, C.ink); // the lid's latch
      rect(127, y - 26, 1, 1, C.steel2);
      const top = y - 18;
      rect(121, top - 1, 14, y - top - 4, C.ink);
      rect(122, top, 12, 4, k1);
      rect(122, top, 12, 1, k2);
      rect(122, top + 4, 12, y - top - 9, k0);
      for (const cx of [124, 129]) {
        rect(cx, top + 1, 3, 2, C.ink);
        rect(cx, top + 2, 3, 1, s0);
      }
    } else {
      backrest(CABIN_IN.x0 + 1, CABIN_IN.x1 - 1, y, false);
      // The seams between the three places, and the seat-belt buckles at the back of the cushion.
      for (const sx of [117, 138]) {
        rect(sx, y - 27, 1, 15, s0);
        rect(sx - 1, y - 12, 3, 2, C.steel1);
        rect(sx - 1, y - 12, 1, 1, C.steel3);
      }
    }
    for (const [x] of who) headrest(x, y);
  });
}

// ---- The steering wheel and the van's front, drawn once ----
/**
 * The wheel, seen from in front: an oval ring 15 across and 10 down round WHEEL, white along its lit top arc, mid steel
 * down its sides and shade along its bottom, ink round the outside, a small hub on a spoke down to the column. It's
 * open inside, so his shirt shows through it and it reads as a ring at 1:1, not as stripes across his lap. His hands go
 * over the rim at ten and two (drawCabin's opts.hands, people.js drawHands), where his forearms reach it.
 */
const RIM = [
  '.....kkkkk.....',
  '...kkWWWWWkk...',
  '..kWL.....Lmk..',
  '.kLl.......mdk.',
  'kLl.........mdk',
  'kl....kHk....dk',
  '.km....s....dk.',
  '..kmd..s..ddk..',
  '...kkdddddkk...',
  '.....kkkkk.....',
];
function makeWheel() {
  return layer(CABIN.w, CABIN.h, () => {
    const { x: cx, y: cy } = WHEEL, [, k1, k2] = RAMP.trim;
    const pal = { k: C.ink, W: C.white, L: C.steel3, l: C.steel2, m: STEEL, d: C.steel1, s: C.steel2, H: C.steel3 };
    // The column, down into the dash.
    rect(cx - 2, cy + 3, 5, Y.dash - cy - 3, C.ink);
    rect(cx - 1, cy + 4, 3, Y.dash - cy - 5, k1);
    rect(cx - 1, cy + 4, 1, Y.dash - cy - 5, k2);
    RIM.forEach((row, j) => [...row].forEach((ch, i) => {
      if (pal[ch]) rect(cx - 7 + i, cy - 5 + j, 1, 1, pal[ch]);
    }));
  });
}

function makeFront() {
  return layer(CABIN.w, CABIN.h, () => {
    const { x0, x1 } = BODY, [k0, k1, k2] = RAMP.trim, [b0, b1, b2] = RAMP.body, [g0, g1, g2] = RAMP.glass;
    // The dash: its top face from door to door, the lit edge toward the people, the vents near the glass.
    rect(CABIN_IN.x0, Y.dash - 1, CABIN_IN.x1 - CABIN_IN.x0, Y.windshield - Y.dash + 1, C.ink);
    rect(CABIN_IN.x0, Y.dash, CABIN_IN.x1 - CABIN_IN.x0, Y.windshield - Y.dash, k1);
    rect(CABIN_IN.x0, Y.dash, CABIN_IN.x1 - CABIN_IN.x0, 1, k2);
    rect(CABIN_IN.x0, Y.windshield - 2, CABIN_IN.x1 - CABIN_IN.x0, 1, k0);
    for (let x = CABIN_IN.x0 + 4; x < CABIN_IN.x1 - 4; x += 3) rect(x, Y.windshield - 1, 2, 1, k0);
    // The gauges' hood in front of the driver, and the phone mount on the passenger's side, empty: Owen has it.
    rect(137, Y.dash - 3, 21, 5, C.ink);
    rect(138, Y.dash - 2, 19, 3, k1);
    rect(138, Y.dash - 2, 19, 1, k2);
    rect(117, Y.dash - 4, 7, 6, C.ink);
    rect(118, Y.dash - 3, 1, 4, C.steel2);
    rect(122, Y.dash - 3, 1, 4, C.steel1);
    rect(118, Y.dash, 5, 1, C.steel1);
    // The windshield, cut at the window line: its edge catching the light, the glass, the wipers at its foot.
    rect(x0 + 3, Y.windshield, x1 - x0 - 6, 1, g2);
    rect(x0 + 3, Y.windshield + 1, x1 - x0 - 6, 1, g1);
    for (const wx of [100, 132]) {
      rect(wx, Y.windshield + 1, 24, 1, C.ink);
      rect(wx, Y.windshield + 1, 2, 1, C.steel2);
    }
    // The pillars where the door tops meet the hood.
    doorTop(x0, Y.dash - 1, Y.hood, true);
    doorTop(x1 - STRIP, Y.dash - 1, Y.hood, false);
    // Side mirrors on short arms out from the front doors: a housing in the body's white, its glass facing the driver.
    for (const side of [1, -1]) {
      const hx = side > 0 ? 84 : 167, ax = side > 0 ? 89 : 165;
      rect(hx - 1, Y.dash - 2, 7, 8, C.ink);
      rect(ax - (side > 0 ? 1 : 0), Y.dash + 1, 3, 4, C.ink);
      rect(hx, Y.dash - 1, 5, 2, b2);
      rect(hx, Y.dash + 1, 5, 4, side > 0 ? b1 : b0);
      rect(hx, Y.dash + 1, 1, 4, side > 0 ? b2 : b1);
      rect(ax, Y.dash + 2, 2, 2, side > 0 ? b1 : b0);
      rect(ax, Y.dash + 2, 2, 1, b2);
      if (side > 0) rect(hx + 1, Y.dash + 4, 4, 1, RAMP.trim[1]); // the turn signal's repeater, off
    }
    // The hood: a top face, its far edge lit white, a crease down the middle.
    rect(x0, Y.hood, x1 - x0, Y.nose - Y.hood, C.ink);
    rect(x0 + 1, Y.hood, x1 - x0 - 2, Y.nose - Y.hood, b1);
    rect(x0 + 1, Y.hood, x1 - x0 - 2, 1, b2);
    rect(x0 + 1, Y.hood, 1, Y.nose - Y.hood, b2);
    rect(VX - 1, Y.hood + 1, 1, Y.nose - Y.hood - 1, b2);
    rect(VX, Y.hood + 1, 1, Y.nose - Y.hood - 1, PANEL);
    rect(x1 - 2, Y.hood + 1, 1, Y.nose - Y.hood - 1, PANEL);
    // The nose, the face toward you, a full step darker than the hood above it (field.js box()'s fold from a lit top
    // face to the face toward you): its top edge catching the light under the hood's front edge, lit at its left
    // corner, shaded at its right, and a band of it showing under the lamps.
    const noseEnd = Y.bumper;
    rect(x0, Y.nose, x1 - x0, noseEnd - Y.nose + 1, C.ink);
    rect(x0 + 1, Y.nose, x1 - x0 - 2, noseEnd - Y.nose, b0);
    rect(x0 + 1, Y.nose, 2, noseEnd - Y.nose, PANEL);
    rect(x1 - 3, Y.nose, 2, noseEnd - Y.nose, C.steel1);
    rect(x0 + 1, Y.nose, x1 - x0 - 2, 1, PANEL);
    // Amber corner lamps (off, a smoked grey lens: drawCabin lights them), then the headlights with their lit corners.
    for (const ax of [x0 + 1, x1 - 4]) rect(ax, Y.nose + 1, 3, LAMP_H, RAMP.trim[1]);
    for (const hx of [x0 + 5, x1 - 18]) {
      rect(hx - 1, Y.nose, 15, LAMP_H + 2, C.ink);
      rect(hx, Y.nose + 1, 13, LAMP_H, RAMP.lamp[1]);
      rect(hx, Y.nose + 1, 13, 1, RAMP.lamp[2]);
      rect(hx, Y.nose + 1, 3, 2, RAMP.lamp[2]);
      rect(hx, Y.nose + LAMP_H, 13, 1, RAMP.lamp[0]);
      rect(hx + 9, Y.nose + 2, 3, 1, C.white);
      rect(hx + 8, Y.nose + 3, 5, 1, RAMP.lamp[0]);
    }
    // The grille between them: slats, and a small badge in the middle.
    rect(x0 + 21, Y.nose + 1, x1 - x0 - 42, LAMP_H + 2, C.ink);
    rect(x0 + 22, Y.nose + 2, x1 - x0 - 44, LAMP_H, k0);
    for (const gy of [Y.nose + 2, Y.nose + 4]) rect(x0 + 22, gy, x1 - x0 - 44, 1, k1);
    rect(x0 + 22, Y.nose + 2, x1 - x0 - 44, 1, k2);
    rect(VX - 3, Y.nose + 2, 6, 4, C.ink);
    rect(VX - 2, Y.nose + 3, 4, 2, C.steel3);
    rect(VX - 2, Y.nose + 3, 1, 1, C.white);
    // The bumper: a long box across the front, a little wider than the body, an air dam slot in its face.
    rect(x0 - 1, Y.bumper - 1, x1 - x0 + 2, 8, C.ink);
    rect(x0, Y.bumper, x1 - x0, 2, k2);
    rect(x0, Y.bumper, x1 - x0, 1, PANEL);
    rect(x0, Y.bumper + 2, x1 - x0, 4, k1);
    rect(x0, Y.bumper + 5, x1 - x0, 1, k0);
    rect(x0 + 12, Y.bumper + 3, 14, 1, C.ink);
    rect(x1 - 26, Y.bumper + 3, 14, 1, C.ink);
    // The plate, IRNPNTR: ink on white, an ink border. The 3x5 font's N is three wide and reads as a Pi, so the plate's
    // two Ns are drawn four wide here, with their diagonal.
    const PLATE = 'IRNPNTR', N4 = ['k..k', 'kk.k', 'k.kk', 'k..k', 'k..k'];
    const wOf = (ch) => (ch === 'N' ? N4[0].length : measure(ch, { font: 3 }));
    const pw = [...PLATE].reduce((n, ch) => n + wOf(ch) + 1, -1) + 4, px = VX - Math.ceil(pw / 2);
    rect(px - 1, Y.bumper - 4, pw + 2, 10, C.ink);
    rect(px, Y.bumper - 3, pw, 8, C.white);
    rect(px, Y.bumper + 4, pw, 1, C.steel3);
    let lx = px + 2;
    for (const ch of PLATE) {
      if (ch === 'N') N4.forEach((row, j) => [...row].forEach((c, i) => c === 'k' && rect(lx + i, Y.bumper - 2 + j, 1, 1, C.ink)));
      else text(ch, lx, Y.bumper - 2, { font: 3, color: C.ink });
      lx += wOf(ch) + 1;
    }
  });
}

// ---- Drawing it ----
let L = null;
const layers = () => (L ??= {
  road: makeRoad(), trailer: makeTrailer(), tub: makeTub(), seats: { 3: makeSeats(3), 2: makeSeats(2), 1: makeSeats(1) },
  wheel: makeWheel(), front: makeFront(), cars: CAR_COLOURS.map(makeCar),
});

/** The front tyres, under the bumper's corners: they hold the road, so they don't bounce; their tread rolls. */
function tyres(t) {
  const roll = Math.floor(t * 24) % 3;
  for (const x of [BODY.x0 + 3, BODY.x1 - 14]) {
    rect(x - 1, Y.bumper + 3, 13, Y.tyres - Y.bumper - 2, C.ink);
    rect(x, Y.bumper + 3, 11, Y.tyres - Y.bumper - 3, C.tire);
    rect(x, Y.bumper + 3, 1, Y.tyres - Y.bumper - 3, C.steel1);
    for (let y = Y.bumper + 4 + roll; y < Y.tyres - 1; y += 3) rect(x + 2, y, 7, 1, C.ink);
  }
}

/** The van's shadow on the road, to the lower right, and the trailer's. */
function shadows(g, ox, oy) {
  g.fillStyle = SHADOW;
  g.fillRect(BODY.x0 + 4 - ox, Y.tailgate + 2 - oy, BODY.x1 - BODY.x0 + 1, Y.tyres + 2 - Y.tailgate - 2);
  g.fillRect(BODY.x1 + 2 - ox, Y.dash + 1 - oy, 9, 7);
  g.fillRect(TRAILER.x0 + 4 - ox, 0 - oy, TRAILER.x1 - TRAILER.x0, Y.tongue + 3);
  g.fillRect(VX - 16 - ox, Y.tongue + 3 - oy, 36, Y.hitch - Y.tongue);
}

/**
 * The turn signals that are on: 'right' is the van's right, the screen's left here. Off, the lenses are smoked grey,
 * so on and off are a plain change even in the whole-van view: the nose's corner lamp, the mirror's repeater (the whole
 * face of its housing under the white cap lights up, so the blink reads in the whole-van view, well clear of the film
 * bar) and the tail light's.
 */
function signals(side) {
  const lit = (x, y, w, h) => {
    rect(x, y, w, h, RAMP.amber[1]);
    rect(x, y, Math.min(2, w), 1, RAMP.amber[2]);
  };
  if (side === 'right') {
    lit(BODY.x0 + 1, Y.nose + 1, 3, LAMP_H);
    lit(84, Y.dash + 2, 5, 3);
    lit(BODY.x0 + 1, Y.tailgate + 9, 3, 3);
  } else {
    lit(BODY.x1 - 4, Y.nose + 1, 3, LAMP_H);
    lit(BODY.x1 - 4, Y.tailgate + 9, 3, 3);
  }
}

/**
 * The whole front view at 1:1, world (x, y) at screen (x - ox, y - oy), t seconds in. opts.row(g, r, ox, oy) draws
 * row r's people (3 at the back, 1 at the front) after that row's seats and before the row in front, with oy carrying
 * the van's bounce. opts.hands(g, ox, oy) draws over the steering wheel's rim (the driver's hands on it, people.js
 * drawHands), oy again with the bounce. opts.blink: 'right' | 'left' | null, that side's amber lamps blinking (the
 * van's right is the screen's left). opts.cars: false for no passing cars; opts.carEvery: seconds between them (16 if
 * not given).
 */
export function drawCabin(g, ox, oy, t, opts = {}) {
  const prev = useContext(g);
  screen();
  const l = layers(), s = Math.floor(t * ROAD.speed), b = bounce(t), tb = trailerBounce(t);
  ox = Math.round(ox);
  oy = Math.round(oy);
  // The road, streaming up; the roadside with it; anyone overtaking.
  for (let y = -(s % TILE); y < CABIN.h; y += TILE) g.drawImage(l.road.canvas, -ox, y - oy);
  camera(ox, oy, 1);
  roadside(s);
  if (opts.cars !== false) passingCar(g, t, ox, oy, l.cars, opts.carEvery);
  // The shadows and the front tyres on the road, the trailer riding a moment behind the van's bounce.
  shadows(g, ox, oy);
  g.drawImage(l.trailer.canvas, -ox, tb - oy);
  tyres(t);
  // The van, riding its bounce: the tub, then each row's seats and people from the back, then the front.
  const vy = oy - b;
  g.drawImage(l.tub.canvas, -ox, -vy);
  for (const r of [3, 2, 1]) {
    g.drawImage(l.seats[r].canvas, -ox, -vy);
    opts.row?.(g, r, ox, vy);
    useContext(g);
  }
  g.drawImage(l.wheel.canvas, -ox, -vy);
  opts.hands?.(g, ox, vy);
  useContext(g);
  g.drawImage(l.front.canvas, -ox, -vy);
  camera(ox, vy, 1);
  if (opts.blink && blinkOn(t)) signals(opts.blink);
  screen();
  useContext(prev);
}
