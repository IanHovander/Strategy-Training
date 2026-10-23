// The back lawn of the team's high school on a sunny afternoon, after the last bell: where 5026 holds its team meeting.
// The light comes from the upper left, as everywhere in this game, so everything facing you is lit on its top and left
// and the windows glint. The tree's shade lies on the grass right under its crown, hard-edged like everything else
// here, and everything else standing on the floor has a short dark patch right under it, like the people's shadows.
// Same scale and camera as the arena (field.js): 8 pixels to the foot across, 2.75 to the foot of depth, people 48
// pixels tall on the walker's rig. Along the top runs the school's single-storey wall of sand-coloured block with its
// flat roof, a row of classroom windows reflecting the sky, the robotics shop's roll-up door rolled open (the dark shop
// inside, in the arena's night navies, with 5026's elevator robot, the intro's eleBot, parked on the floor), a red
// IRON PANTHERS sign over the door and the team's banner beside it. Over the roof: the sky in four dithered bands, the
// way the intro builds its night sky, flat clouds drifting right and dark treetops beyond. At the wall's foot a concrete
// path with a bench, a big thank-you card for a sponsor on an easel, and bags dropped at the edge of the lawn; then the
// grass, a tree and the folding table with the outreach demo's sign-up sheet. At the right end the path runs on under a
// covered walkway, round the building to the cafeteria: the way out (its steel roof, its post, the CAFETERIA sign hung
// under it and its shade on the path and the wall).
//   drawBackdrop(g, view, t)   everything that never stands in front of anyone, seen from view = { x, y }
//   things(t, o)               everything standing on the floor, as { y: floor line, draw() }, to sort in with people
//   blocked(x, y)              where her feet can't go
// Everything is in world pixels (layout.js) and drawn with pixel.js: filled rectangles, an ink outline on every object,
// three tones per material and a one-pixel highlight on lit top edges.

import { C, useContext, camera, screen, rect, disk, text, measure, withAlpha, dither, fill, rnd, layer, blit } from '../pixel.js';
import { eleBot } from '../sprites.js';
import {
  WORLD, ROOF_Y, WALL_TOP, WALL_Y, SHOP_DOOR, WINDOWS, BANNER, PATH, LAWN_Y, TREES, shadeOf, BENCH, EASEL, TABLE, BAGS,
  WALKWAY,
} from './layout.js';

const W = WORLD.w, H = WORLD.h;

// ---- Colours ----
// Daylight ramps that sit beside pixel.js's palette: the same saturation and value steps, three tones each.
/** The sky, top to horizon: two new blues either side of the palette's own. */
const SKY = [[0, '#2f6fe4'], [14, C.blue2], [30, '#79b2ff'], [44, C.blue3]];
/** Cloud white, its pale rims, and its flat underside in the palette's light steel, greyer than any band of the sky
 *  behind it so the bottom edge stays hard. */
const CLOUD = ['#ffffff', '#d6e8ff', C.steel3];
/** The lawn, kept dark the way the arena keeps its carpet, so the team's red merch stands out on it (in greyscale too):
 *  a deep, saturated green, its tree shade a step under it, lit blades a step over. */
const GRASS = { deep: '#103a22', shade: '#154a2b', mid: '#1b5c33', stripe: '#19572f', lit: '#2b8541', blade: '#4fb35a' };
const LEAF = ['#174a2c', '#22703a', '#3b9a48', '#6cc95a'];
const LEAF_FAR = ['#123d2a', '#1b5634', '#2a7040'];
const BARK = ['#3d2519', '#5e3a26', '#7a4a24'];
/** Sand-coloured block (cast.js tones.khaki) and its mortar. */
const SAND = { shade: '#7a6a48', mid: '#a8946a', lit: '#c9b88e', mortar: '#93805a', deep: '#6b5d3f' };
const TAR = ['#141519', '#23252c', '#3a3d48'];
const CONCRETE = { joint: '#7d8292', dark: '#959bab', mid: '#a3a9b8', light: '#b0b6c4', lit: '#bcc2cf' };
/** Bench slats and the easel (cast.js chestnut), with a highlight for lit edges. */
const WOOD = ['#5a3418', '#7a4a24', '#9a6234', '#bf8048'];
/** The shop's floor inside is the arena's own concrete. */
const SHOP_FLOOR = ['#30354a', '#353a4c', '#3b4154'];
// The black bag is the arena's dark greys, a step up from ink so its outline still shows.
const BAG = { red: ['#a1172a', '#d3212f', '#ff6a55'], navy: ['#141a2e', '#232a44', '#3a4466'], black: [C.steel0, C.carpet1, C.carpet2] };
/** The people's shadow (stage.js drawWithShadow draws it at 45 percent). */
const SHADOW = '#05060d';

// ---- Helpers ----
/** A box seen from the front and a little above: its top face, then the face toward you, outlined (field.js box()). */
function box(x, w, yTop, yFront, yFloor, top, front, edge) {
  rect(x - 1, yTop - 1, w + 2, yFloor - yTop + 2, C.ink);
  rect(x, yTop, w, yFront - yTop, top);
  rect(x, yTop, w, 1, edge);
  rect(x, yFront, w, yFloor - yFront, front);
}

/** A flat ellipse of whole rows, hard-edged like pixel.js disk(): shade on the floor. */
function ellipse(cx, cy, rx, ry, c) {
  for (let dy = -ry; dy < ry; dy++) {
    const k = (dy + 0.5) / ry, hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - k * k)));
    rect(cx - hw, cy + dy, hw * 2, 1, c);
  }
}

/** Letters to pixels, one character a pixel; '.' is see-through and pal colours the rest. */
function sprite(x, y, rows, pal) {
  rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch !== '.') rect(x + i, y + j, 1, 1, pal[ch]);
  }));
}

/** A contact shadow on the floor right under something standing on it, from x0 to x1 about its floor line y: three
 *  rows, the outer two a pixel shorter at each end, like the soft blob under the people. */
function contact(x0, x1, y, c) {
  rect(x0 + 1, y - 2, x1 - x0 - 2, 1, c);
  rect(x0, y - 1, x1 - x0, 1, c);
  rect(x0 + 1, y, x1 - x0 - 2, 1, c);
}

/**
 * Leaves: overlapping clumps [x, y, r] (pixel.js disk() circles), outlined in ink as one shape. Each pixel is shaded by
 * the clump in front at that spot and by where it sits on the whole crown (centre cx, cy, radius R), light from the
 * upper left, in three tones; a few bright leaves on the lit side (tones[3]), most of the lit edge along the top and
 * left in them too (the highlight line on lit top edges, broken up like leaf tips), and dark ones in the mid. base: a box
 * { x0, x1, y, y1 } counted as leaves too, down to row y1, for a treeline whose foot is hidden behind something drawn
 * after it (the roof). pockets: little shapes [x, y, rows] of shade-tone leaves (rows as in sprite(), '#' a pixel),
 * deep places in the foliage, unoutlined.
 */
function crown(clumps, cx, cy, R, tones, seed, base, pockets = []) {
  const hit = (px, py) => {
    for (let i = clumps.length - 1; i >= 0; i--) {
      const [x, y, r] = clumps[i], dx = px + 0.5 - x, dy = py + 0.5 - y;
      if (dx * dx + dy * dy < r * r) return clumps[i];
    }
    return base && px >= base.x0 && px < base.x1 && py >= base.y ? [px + 0.5, py, 1e9] : null;
  };
  const x0 = Math.floor(Math.min(...clumps.map(([x, , r]) => x - r))) - 2, x1 = Math.ceil(Math.max(...clumps.map(([x, , r]) => x + r))) + 2;
  const y0 = Math.floor(Math.min(...clumps.map(([, y, r]) => y - r))) - 2;
  const y1 = base ? (base.y1 ?? base.y + 2) : Math.ceil(Math.max(...clumps.map(([, y, r]) => y + r))) + 2;
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      const c = hit(px, py);
      if (!c) {
        if (hit(px - 1, py) || hit(px + 1, py) || hit(px, py - 1) || hit(px, py + 1)) rect(px, py, 1, 1, C.ink);
        continue;
      }
      const [x, y, r] = c;
      const lx = (px + 0.5 - x) / r, ly = (py + 0.5 - y) / r, gx = (px + 0.5 - cx) / R, gy = (py + 0.5 - cy) / R;
      // Each clump and the whole crown lit like a ball, so the tones part along curves, a little ragged like leaves.
      const ball = (u, v) => -0.5 * u - 0.7 * v + 0.5 * Math.sqrt(Math.max(0, 1 - u * u - v * v));
      const n = rnd(seed + px * 7.13 + py * 3.71);
      const b = 0.9 * ball(lx, ly) + 0.6 * ball(gx, gy) + (rnd(seed + px * 1.7 + py * 9.3) - 0.5) * 0.08;
      const tone = b > 0.7 ? 2 : b > 0.18 ? 1 : 0;
      // Lit leaves at the crown's top or left edge catch the sun, most of them: a broken highlight line, leaf tips.
      const rim = tone === 2 && (!hit(px, py - 1) || !hit(px - 1, py)) && n < 0.7;
      if (tones[3] && tone === 2 && (rim || n < 0.045)) rect(px, py, 1, 1, tones[3]);
      else if (tone === 1 && n < 0.02) rect(px, py, 1, 1, tones[0]);
      else rect(px, py, 1, 1, tones[tone]);
    }
  }
  for (const [x, y, rows] of pockets) rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === '#' && hit(x + i, y + j)) rect(x + i, y + j, 1, 1, tones[0]);
  }));
}

// ---- The sky ----
function paintSky() {
  SKY.forEach(([y, c], i) => {
    fill(0, y, W, (SKY[i + 1]?.[0] ?? ROOF_Y + 2) - y, c);
    if (i > 0) dither(0, y - 1, W, 3, SKY[i - 1][1], c);
  });
}

// Flat clouds: puffs [x, y, r] over a flat base at y 0, each white with a pale rim on its lower right, so the bumps
// read (every rim first, then every white, so no rim lands inside the white); then a flat bottom, one straight line from
// end to end: a pale band and the shade under it. Then the one-pixel ink outline everything in the game has, traced
// round the whole cloud the way crown() traces the leaves.
const CLOUDS = [
  { x: 36, base: 24, puffs: [[6, -3, 5], [15, -7, 8], [28, -9, 10], [40, -5, 7], [49, -2, 4]] },
  { x: 188, base: 14, puffs: [[4, -2, 4], [11, -5, 6], [20, -3, 5], [26, -1, 3]] },
  { x: 300, base: 32, puffs: [[5, -3, 5], [14, -7, 8], [26, -10, 10], [38, -7, 8], [48, -3, 5]] },
  { x: 452, base: 18, puffs: [[4, -2, 4], [12, -6, 7], [22, -5, 6], [30, -2, 4]] },
];
function makeCloud(puffs) {
  const x0 = Math.min(...puffs.map(([x, , r]) => x - r)), x1 = Math.max(...puffs.map(([x, , r]) => x + r));
  const y0 = Math.min(...puffs.map(([, y, r]) => y - r)), w = x1 - x0, base = -y0;
  // A pixel of room all round for the outline: the cloud itself is drawn a pixel in from the layer's top left.
  const lw = w + 2, lh = base + 3;
  const l = layer(lw, lh, (lg) => {
    for (const [x, y, r] of puffs) disk(x - x0 + 1, y - y0 + 1, r, CLOUD[1]);
    for (const [x, y, r] of puffs) disk(x - x0, y - y0, r - 1, CLOUD[0]);
    // The flat bottom, from a pixel in from either end (the end puffs round off into it).
    fill(2, base - 2, w - 2, 2, CLOUD[1]);
    fill(2, base, w - 2, 2, CLOUD[2]);
    // Nothing under the flat bottom (the end puffs reach a row past it), so the outline runs straight along it.
    lg.clearRect(0, base + 2, lw, 1);
    // The outline: ink on every empty pixel next to the cloud, above, below or either side.
    const a = lg.getImageData(0, 0, lw, lh).data, on = (px, py) => px >= 0 && py >= 0 && px < lw && py < lh && a[(py * lw + px) * 4 + 3] > 0;
    for (let py = 0; py < lh; py++) for (let px = 0; px < lw; px++) {
      if (!on(px, py) && (on(px - 1, py) || on(px + 1, py) || on(px, py - 1) || on(px, py + 1))) rect(px, py, 1, 1, C.ink);
    }
  });
  return { ...l, dx: x0 - 1, dy: y0 - 1 };
}
const WRAP = W + 80;
/** Clouds drift right about 3 pixels a second, round and round. */
function clouds(t) {
  CLOUDS.forEach((c, i) => {
    const x = Math.floor((((c.x + t * (2.6 + i * 0.3)) % WRAP) + WRAP) % WRAP) - 80;
    blit(BAKED.clouds[i], x + BAKED.clouds[i].dx, c.base + BAKED.clouds[i].dy);
  });
}
/**
 * Three birds cross the sky now and then (the first time as the meeting opens), wings up, wings level: in the opening
 * shot through the open sky right of the place card, under the film bar and over the treetops, then up out of the
 * tilt. (Walking, the view never goes up this far.)
 */
function birds(t) {
  const u = t % 46;
  if (u > 12) return;
  [[0, 0], [-7, 3], [-12, -2]].forEach(([dx, dy], i) => {
    const x = Math.round(268 + u * 24 + dx), y = Math.round(24 + dy + Math.sin(u * 1.3 + i) * 1.5);
    const up = Math.floor(t * 7 + i * 1.7) % 2 === 0;
    if (up) {
      rect(x, y, 1, 1, C.steel0);
      rect(x + 1, y + 1, 1, 1, C.steel0);
      rect(x + 2, y, 1, 1, C.steel0);
    } else rect(x, y + 1, 3, 1, C.steel0);
  });
}

// ---- Treetops beyond the roof ----
// Dark rounded canopies in clumps with sky between, rising from the roofline: dimmer than the trees on the lawn. Each
// group's foot runs down behind the roof, which is drawn over it, so its ink line closes the treeline's bottom.
const FAR = [[0, 70], [150, 240], [330, 410], [460, 520]];
function paintFarTrees() {
  FAR.forEach(([a, b], k) => {
    const clumps = [];
    for (let x = a + 6, i = 0; x < b - 6; i++) {
      const r = 8 + Math.floor(rnd(k * 31 + i * 7.3) * 6);
      const top = 30 + Math.floor(rnd(k * 17 + i * 3.1 + 5) * 10);
      clumps.push([x, top + r, r]);
      x += r + 1 + Math.floor(rnd(k * 13 + i * 5.7 + 2) * 4);
    }
    const last = clumps[clumps.length - 1][0];
    crown(clumps, (a + b) / 2, 34, (b - a) / 2 + 10, LEAF_FAR, k * 1000, { x0: a + 4, x1: last + 4, y: 46, y1: ROOF_Y + 1 });
  });
}

// ---- The school ----
function paintRoof() {
  rect(0, ROOF_Y, W, 1, C.ink);
  rect(0, ROOF_Y + 1, W, 2, TAR[1]);
  for (let i = 0; i < 160; i++) rect(Math.floor(rnd(i + 40) * W), ROOF_Y + 1 + Math.floor(rnd(i + 90) * 2), 1, 1, rnd(i + 140) < 0.5 ? TAR[0] : TAR[2]);
  rect(0, ROOF_Y + 3, W, 1, TAR[2]);
  rect(0, ROOF_Y + 4, W, 1, C.steel3);
  rect(0, WALL_TOP - 1, W, 1, C.ink);
  // A rooftop air handler and a vent stack, standing on the tar.
  const y = ROOF_Y + 2;
  box(292, 22, y - 11, y - 8, y, C.steel2, C.steel1, C.steel3);
  for (let vy = y - 6; vy < y - 1; vy += 2) rect(295, vy, 16, 1, C.steel0);
  rect(292, y - 8, 1, 8, C.steel2);
  box(424, 4, y - 9, y - 8, y, C.steel3, C.steel2, C.white);
  rect(422, y - 11, 8, 3, C.ink);
  rect(423, y - 10, 6, 1, C.steel2);
}

function paintWall() {
  const base = WALL_Y - 16; // the base course: two feet of darker block
  rect(0, WALL_TOP, W, WALL_Y - WALL_TOP, SAND.mid);
  // Block courses every 6 rows, the joints staggered a half block, with gaps so it stays calm.
  for (let y = WALL_TOP + 7, k = 0; y < base - 2; y += 6, k++) {
    rect(0, y, W, 1, SAND.mortar);
    for (let x = (k % 2) * 6 + 3; x < W; x += 12) if (rnd(x * 0.37 + k * 11) < 0.55) rect(x, y + 1, 1, 5, SAND.mortar);
  }
  rect(0, WALL_TOP, W, 2, SAND.shade);
  // The base course, its lit top edge, a joint along it and the ink line where the wall meets the path.
  rect(0, base, W, WALL_Y - base, SAND.shade);
  rect(0, base, W, 1, SAND.lit);
  rect(0, base + 1, W, 1, SAND.mid);
  for (let y = base + 7, k = 0; y < WALL_Y - 2; y += 7, k++) {
    rect(0, y, W, 1, SAND.deep);
    for (let x = (k % 2) * 8 + 5; x < W; x += 16) rect(x, y + 1, 1, 6, SAND.deep);
  }
  rect(0, WALL_Y - 1, W, 1, C.ink);
}

/** A classroom window: steel frame lit top and left and shaded right and bottom (the mid tone where they meet at the
 *  corners, and on the mullion), glass reflecting the sky, a glint, the mullion, and an outlined sill. */
function paintWindow({ x0, x1, y0, y1 }) {
  const w = x1 - x0, h = y1 - y0;
  rect(x0 - 1, y0 - 1, w + 2, h + 2, C.ink);
  rect(x0, y0, w, h, C.steel2);
  rect(x0, y0, w, 2, C.steel3);
  rect(x0, y0, 2, h, C.steel3);
  rect(x1 - 2, y0 + 2, 2, h - 2, C.steel1);
  rect(x0 + 2, y1 - 2, w - 2, 2, C.steel1);
  rect(x1 - 2, y0, 2, 2, C.steel2);
  rect(x0, y1 - 2, 2, 2, C.steel2);
  rect(x0 + 2, y0 + 2, w - 4, h - 4, C.ink);
  const gx = x0 + 3, gy = y0 + 3, gw = w - 6, gh = h - 6, third = Math.round(gh / 3);
  rect(gx, gy, gw, gh, C.blue2);
  rect(gx, gy, gw, third, C.blue3);
  dither(gx, gy + third - 1, gw, 2, C.blue3, C.blue2);
  // The frame's shadow on the glass, top and left.
  rect(gx, gy, gw, 1, '#79b2ff');
  rect(gx, gy, 1, gh, '#2f6fe4');
  // The glint: two stepped diagonals across the left pane, a thin one across the right.
  for (let k = 0; k < 6; k++) rect(gx + 3 + 2 * k, gy + 23 - 2 * k, 2, 2, C.white);
  for (let k = 0; k < 4; k++) rect(gx + 8 + 2 * k, gy + 21 - 2 * k, 1, 2, C.white);
  for (let k = 0; k < 4; k++) rect(gx + 22 + 2 * k, gy + 17 - 2 * k, 1, 2, C.white);
  // The mullion.
  const mx = x0 + w / 2 - 2;
  rect(mx, gy, 4, gh, C.ink);
  rect(mx + 1, gy, 1, gh, C.steel3);
  rect(mx + 2, gy, 1, gh, C.steel2);
  // The sill: a ledge of block a little wider than the window, outlined, lit on top and shaded under.
  rect(x0 - 4, y1, w + 8, 4, C.ink);
  rect(x0 - 3, y1 + 1, w + 6, 1, SAND.lit);
  rect(x0 - 3, y1 + 2, w + 6, 1, SAND.shade);
}

/** The shop's roll-up door, rolled up: the dark shop inside, 5026's robot parked just inside. */
function paintShop(lg) {
  const { x0, x1, y0 } = SHOP_DOOR, y1 = WALL_Y, w = x1 - x0;
  // The frame: steel jambs either side, a header over the top, ink round it all.
  rect(x0 - 4, y0 - 2, w + 8, y1 - y0 + 2, C.ink);
  rect(x0 - 3, y0 - 2, 2, y1 - y0 + 1, C.steel3);
  rect(x0 - 2, y0 - 2, 1, y1 - y0 + 1, C.steel2);
  rect(x1 + 1, y0 - 2, 2, y1 - y0 + 1, C.steel1);
  rect(x1 + 1, y0 - 2, 1, y1 - y0 + 1, C.steel2);
  rect(x0 - 3, y0 - 2, w + 6, 1, C.steel3);
  rect(x0 - 3, y0 - 1, w + 6, 1, C.steel2);
  // Inside: the back wall, the floor, a shadow under the rolled-up door.
  const top = y0 + 1, floor = y1 - 4;
  rect(x0, top, w, floor - top, C.stand1);
  rect(x0, floor, w, 4, SHOP_FLOOR[1]);
  for (let i = 0; i < 40; i++) rect(x0 + Math.floor(rnd(i + 500) * w), floor + Math.floor(rnd(i + 540) * 4), 1, 1, rnd(i + 580) < 0.5 ? SHOP_FLOOR[0] : SHOP_FLOOR[2]);
  rect(x0, floor, w, 1, C.night0);
  // A fluorescent strip hanging from the ceiling.
  const lx = x0 + 8, ly = top + 16;
  rect(lx + 3, top + 12, 1, 4, C.ink);
  rect(lx + 22, top + 12, 1, 4, C.ink);
  rect(lx - 1, ly - 1, 28, 4, C.ink);
  rect(lx, ly, 26, 1, C.white);
  rect(lx, ly + 1, 26, 1, C.steel3);
  // The pegboard, a sparse dot grid with tools hung on it.
  const px = x0 + 4, py = top + 21, pw = 34, ph = 19;
  rect(px - 1, py - 1, pw + 2, ph + 2, C.ink);
  rect(px, py, pw, ph, C.night1);
  for (let y = py + 1; y < py + ph; y += 3) for (let x = px + 1 + ((y - py) % 2); x < px + pw; x += 3) rect(x, y, 1, 1, (x + y) % 4 ? C.night2 : C.night3);
  // A wrench, a hammer, pliers, a screwdriver.
  rect(px + 3, py + 3, 3, 2, C.steel2);
  rect(px + 4, py + 5, 1, 9, C.steel2);
  rect(px + 3, py + 14, 3, 2, C.steel2);
  rect(px + 9, py + 3, 6, 3, C.steel1);
  rect(px + 9, py + 3, 6, 1, C.steel2);
  rect(px + 11, py + 6, 2, 9, WOOD[1]);
  rect(px + 18, py + 3, 1, 6, C.steel2);
  rect(px + 21, py + 3, 1, 6, C.steel2);
  rect(px + 19, py + 9, 2, 2, C.steel1);
  rect(px + 18, py + 11, 1, 5, C.red0);
  rect(px + 21, py + 11, 1, 5, C.red0);
  rect(px + 27, py + 3, 3, 6, C.yel0);
  rect(px + 28, py + 9, 1, 7, C.steel2);
  // The workbench: a steel cabinet top and drawers, a red toolbox and a drill on it.
  const bx = x0 + 3, bw = 34, bTop = floor - 17;
  box(bx, bw, bTop, bTop + 3, floor - 1, C.steel1, C.steel0, C.steel2);
  for (const dy of [5, 9]) rect(bx + 1, bTop + dy, bw - 2, 1, C.ink);
  for (const dy of [7, 11]) for (const dx of [8, 25]) rect(bx + dx, bTop + dy, 3, 1, C.steel2);
  rect(bx + 3, bTop - 7, 13, 8, C.ink);
  rect(bx + 4, bTop - 6, 11, 6, C.red1);
  rect(bx + 4, bTop - 6, 11, 1, C.red2);
  rect(bx + 4, bTop - 2, 11, 2, C.red0);
  rect(bx + 8, bTop - 8, 5, 1, C.ink);
  rect(bx + 9, bTop - 4, 3, 1, C.steel3);
  rect(bx + 21, bTop - 6, 8, 4, C.ink);
  rect(bx + 22, bTop - 5, 6, 2, C.yel1);
  rect(bx + 22, bTop - 5, 6, 1, C.yel2);
  rect(bx + 23, bTop - 3, 3, 4, C.ink);
  rect(bx + 24, bTop - 3, 1, 3, C.steel0);
  // 5026's robot, parked facing in, its shadow on the floor. The shared sprite draws it, so it stays up to date.
  const rx = x0 + 46;
  rect(rx - 17, y1 - 4, 34, 2, C.night0);
  lg.save();
  lg.beginPath();
  lg.rect(x0, top, w, y1 - top);
  lg.clip();
  eleBot(rx, y1 - 3, { team: 'blue', num: '5026', dir: -1, rsl: false });
  lg.restore();
  // The door, rolled up: its bottom slats across the top of the opening, and the shadow under them.
  for (let k = 0; k < 3; k++) {
    rect(x0, y0 + 1 + k * 3, w, 1, C.steel3);
    rect(x0, y0 + 2 + k * 3, w, 1, C.steel2);
    rect(x0, y0 + 3 + k * 3, w, 1, C.steel1);
  }
  rect(x0, y0 + 10, w, 2, C.steel1);
  rect(x0, y0 + 10, w, 1, C.steel2);
  for (const hx of [x0 + 12, x1 - 14]) rect(hx, y0 + 11, 3, 1, C.steel3);
  rect(x0, y0 + 12, w, 1, C.ink);
  rect(x0, y0 + 13, w, 1, C.night0);
  rect(x0, y0, w, 1, C.ink);
}

/** The red IRON PANTHERS sign over the shop door, its shadow on the wall to the right. */
function paintSign() {
  const cx = (SHOP_DOOR.x0 + SHOP_DOOR.x1) / 2, w = 88, x = cx - w / 2, y = 64;
  rect(x + w, y + 1, 1, 11, SAND.shade);
  rect(x, y, w, 12, C.ink);
  rect(x + 1, y + 1, w - 2, 10, C.red1);
  rect(x + 1, y + 1, w - 2, 1, C.red2);
  rect(x + 1, y + 10, w - 2, 1, C.red0);
  for (const bx of [x + 2, x + w - 3]) rect(bx, y + 5, 1, 1, C.red3);
  text('IRON PANTHERS', cx, y + 3, { color: C.white, align: 'center', shadow: C.red0 });
}

// The panther in its hexagon, as the team's logo has it (public/img/panther.png) and the hoodies' badge: a white
// hexagon, and in it a red panther's head turned three-quarters to the left, its two ears breaking up into the
// hexagon's top, the near eye and the far one under angry brows in ink, a white muzzle off to the left with the nose and
// a snarl, a fang showing. Shaded like the banner's cloth: lit on its left edge, dark down its lower right.
const BADGE = [
  '....WWWW....',
  '..WRWWWWrW..',
  'WWRrRWWRrdWW',
  'WWRrrrrrrdWW',
  'WRrrkrrrkrdW',
  'WRkkrrrkkrdW',
  'WRrrrrrrrrdW',
  'WRWWkWWrrdWW',
  'WWWkkkWrrdWW',
  'WWWkWkrrdWWW',
  'WWWWRrrdWWWW',
  '..WWWWWWWW..',
  '....WWWW....',
];
/** The team's banner, hung from a steel bracket: red cloth lit on its left edge, the badge, 5026, a swallowtail. */
function paintBanner() {
  const { x0, x1, y0, y1 } = BANNER, w = x1 - x0, h = y1 - y0, mid = w / 2 - 0.5;
  const inside = (i, j) => i >= 0 && i < w && j >= 0 && j < h && !(j >= h - 6 && Math.abs(i - mid) < j - (h - 7));
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (!inside(i, j) && inside(i - 1, j - 1)) rect(x0 + i, y0 + j, 1, 1, SAND.shade);
  }
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (!inside(i, j)) continue;
    const edge = !inside(i - 1, j) || !inside(i + 1, j) || !inside(i, j + 1);
    rect(x0 + i, y0 + j, 1, 1, edge ? C.ink : i === 1 ? C.red2 : i === w - 2 ? C.red0 : C.red1);
  }
  sprite(x0 + 2, y0 + 4, BADGE, { W: '#fff4ee', R: C.red2, r: C.red1, d: C.red0, k: C.ink });
  text('50', x0 + w / 2, y0 + 20, { font: 3, color: '#fff4ee', align: 'center' });
  text('26', x0 + w / 2, y0 + 26, { font: 3, color: '#fff4ee', align: 'center' });
  rect(x0 + 2, y0 + 33, w - 4, 1, '#fff4ee');
  // The bracket: a steel rod on two wall plates.
  rect(x0 - 3, y0 - 3, w + 6, 4, C.ink);
  rect(x0 - 2, y0 - 2, w + 4, 1, C.steel3);
  rect(x0 - 2, y0 - 1, w + 4, 1, C.steel2);
  rect(x0 + w + 3, y0 - 2, 1, 3, SAND.shade);
}

/** A yellow safety sign left of the shop door: safety glasses, always. */
function paintSafety() {
  const x = 85, y = 81, w = 29, h = 19;
  rect(x + w, y + 1, 1, h, SAND.shade);
  rect(x, y + h, w, 1, SAND.shade);
  rect(x, y, w, h, C.ink);
  rect(x + 1, y + 1, w - 2, h - 2, C.yel1);
  rect(x + 1, y + 1, w - 2, 1, C.yel2);
  rect(x + 1, y + h - 2, w - 2, 1, C.yel0);
  text('SAFETY', x + w / 2, y + 3, { font: 3, color: C.ink, align: 'center' });
  const gx = x + 6, gy = y + 11;
  rect(gx, gy, 7, 5, C.ink);
  rect(gx + 10, gy, 7, 5, C.ink);
  rect(gx + 1, gy + 1, 5, 3, C.white);
  rect(gx + 11, gy + 1, 5, 3, C.white);
  rect(gx + 1, gy + 1, 2, 1, C.blue3);
  rect(gx + 11, gy + 1, 2, 1, C.blue3);
  rect(gx + 7, gy + 1, 3, 1, C.ink);
  rect(gx - 2, gy, 2, 1, C.ink);
  rect(gx + 17, gy, 2, 1, C.ink);
}

/** A downspout from the roof's edge to the path, strapped to the wall. */
function paintDownspout() {
  const x = 286;
  rect(x - 1, WALL_TOP - 1, 5, WALL_Y - WALL_TOP - 3, C.ink);
  rect(x, WALL_TOP - 1, 1, WALL_Y - WALL_TOP - 4, C.steel3);
  rect(x + 1, WALL_TOP - 1, 1, WALL_Y - WALL_TOP - 4, C.steel2);
  rect(x + 2, WALL_TOP - 1, 1, WALL_Y - WALL_TOP - 4, C.steel1);
  rect(x + 4, WALL_TOP, 1, WALL_Y - WALL_TOP - 4, SAND.shade);
  for (let y = WALL_TOP + 14; y < WALL_Y - 10; y += 24) {
    rect(x - 2, y - 1, 7, 3, C.ink);
    rect(x - 1, y, 5, 1, C.steel2);
  }
  // The shoe, turned out onto the path.
  rect(x - 2, WALL_Y - 6, 7, 6, C.ink);
  rect(x - 1, WALL_Y - 5, 5, 4, C.steel2);
  rect(x - 1, WALL_Y - 5, 5, 1, C.steel3);
  rect(x - 1, WALL_Y - 2, 5, 1, C.steel1);
}

// ---- The path and the lawn ----
function paintPath() {
  const { y0, y1 } = PATH;
  rect(0, y0, W, y1 - y0, CONCRETE.mid);
  for (let i = 0; i < 220; i++) {
    rect(Math.floor(rnd(i + 1200) * W), y0 + 1 + Math.floor(rnd(i + 1500) * (y1 - y0 - 3)), 1, 1, rnd(i + 1800) < 0.5 ? CONCRETE.dark : CONCRETE.light);
  }
  // Expansion joints across the path every 40 pixels (5 feet).
  for (let x = 20; x < W; x += 40) rect(x, y0, 1, y1 - y0 - 2, CONCRETE.joint);
  // The curb along the lawn: its lit top edge, its face, and the grass tufting over it.
  rect(0, y1 - 2, W, 1, CONCRETE.lit);
  rect(0, y1 - 1, W, 1, CONCRETE.joint);
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(rnd(i + 2100) * W);
    rect(x, y1 - 1, 1, 1, GRASS.lit);
    if (rnd(i + 2200) < 0.4) rect(x + 1, y1 - 2, 1, 2, rnd(i + 2300) < 0.5 ? GRASS.blade : GRASS.lit);
  }
}

function paintLawn() {
  rect(0, LAWN_Y, W, H - LAWN_Y, GRASS.mid);
  // Mowing stripes, four feet wide, barely there.
  for (let y = LAWN_Y + 11; y < H; y += 22) rect(0, y, W, 11, GRASS.stripe);
  for (let i = 0; i < 1700; i++) {
    const x = Math.floor(rnd(i + 3000) * W), y = LAWN_Y + Math.floor(rnd(i + 4000) * (H - LAWN_Y));
    rect(x, y, 1, 1, rnd(i + 5000) < 0.62 ? GRASS.shade : GRASS.lit);
  }
  // Blades catching the sun, and a few flowers.
  for (let i = 0; i < 60; i++) {
    const x = Math.floor(rnd(i + 6000) * W), y = LAWN_Y + 2 + Math.floor(rnd(i + 6100) * (H - LAWN_Y - 3));
    rect(x, y, 1, 2, GRASS.blade);
  }
  for (let i = 0; i < 20; i++) {
    const x = Math.floor(rnd(i + 7000) * W), y = LAWN_Y + 3 + Math.floor(rnd(i + 7100) * (H - LAWN_Y - 4));
    rect(x, y, 1, 1, rnd(i + 7200) < 0.5 ? C.white : C.yel1);
  }
}

/**
 * Shade under the tree, centred under its crown, and a short contact shadow right under everything else
 * standing on the floor: the same as the people's (stage.js drawWithShadow), ink at 45 percent, so the props and the
 * people beside them read as lit alike, the arena's way.
 */
function paintShadows() {
  for (const tr of TREES) {
    const s = shadeOf(tr);
    ellipse(s.x, s.y, s.rx, s.ry, GRASS.deep);
    for (let i = 0; i < 26; i++) {
      const a = rnd(tr.x + i) * Math.PI * 2, d = Math.sqrt(rnd(tr.y + i * 3));
      rect(Math.round(s.x + Math.cos(a) * d * (s.rx - 3)), Math.round(s.y + Math.sin(a) * d * (s.ry - 2)), 1, 1, GRASS.shade);
    }
  }
  withAlpha(0.45, () => {
    contact(BENCH.x0 - 2, BENCH.x1 + 2, BENCH.y, SHADOW);
    contact(EASEL.x - 12, EASEL.x + 13, EASEL.y, SHADOW);
    contact(TABLE.x0 - 1, TABLE.x1 + 2, TABLE.y, SHADOW);
    for (const b of BAGS) contact(b.x - 5, b.x + 5, b.y, SHADOW);
    contact(WALKWAY.post - 5, WALKWAY.post + 5, WALKWAY.y, SHADOW);
  });
}

// ---- The way out: the covered walkway ----
// The walkway's roof is 10 feet up, so seen 20 degrees down it's a box like field.js box(): its top face, from where it
// meets the wall (10 feet up the wall, just under the school's roof edge) to its front edge (10 feet over the floor
// line WALKWAY.y), then the fascia facing you. It's always over everyone's head (the tallest head on the path comes up
// to 98), so it's part of the backdrop; only its post stands on the floor and sorts in with the people (walkwayPost()).
// Steel, like the windows' frames: the deck lit from above with standing seams running back to the wall, the fascia lit
// along its top edge. The shade under it is hard-edged like the trees': the path under it a step darker, and the wall
// under the fascia, where the roof keeps the sun off it. Hung from the fascia, the school's sign for the way round.
const ROOF_UP = 80;
const deckFront = () => WALKWAY.y - ROOF_UP;
function paintWalkway() {
  const { x0 } = WALKWAY, w = W - x0, top = WALL_TOP, front = deckFront(), bottom = front + 7;
  // The shade: the path under the roof, joints and specks a step darker too, and the curb's lit edge dimmed.
  const { y0, y1 } = PATH;
  rect(x0, y0, w, y1 - y0 - 2, CONCRETE.dark);
  for (let i = 0; i < 40; i++) rect(x0 + Math.floor(rnd(i + 8100) * w), y0 + 1 + Math.floor(rnd(i + 8200) * (y1 - y0 - 4)), 1, 1, rnd(i + 8300) < 0.6 ? CONCRETE.joint : CONCRETE.mid);
  for (let x = 20; x < W; x += 40) if (x >= x0) rect(x, y0, 1, y1 - y0 - 2, '#6a6f80');
  rect(x0, y1 - 2, w, 1, CONCRETE.light);
  // The wall under the fascia, in the roof's shade down to where the sun gets under it: the block a tone darker, its
  // courses in the base course's deep mortar.
  const shadeTo = 104;
  rect(x0, bottom + 1, w, shadeTo - bottom - 1, SAND.shade);
  for (let y = WALL_TOP + 7, k = 0; y < shadeTo; y += 6, k++) {
    if (y <= bottom) continue;
    rect(x0, y, w, 1, SAND.deep);
    for (let x = (k % 2) * 6 + 3; x < W; x += 12) if (x >= x0 && rnd(x * 0.37 + k * 11) < 0.55) rect(x, y + 1, 1, Math.min(5, shadeTo - y - 1), SAND.deep);
  }
  // The roof: outlined, the deck (lit from above, a highlight where it meets the wall, standing seams every 6 pixels,
  // each a lit pixel and a shaded one), then the fascia.
  rect(x0 - 1, top - 1, w + 1, bottom - top + 2, C.ink);
  rect(x0, top, w, front - top, C.steel2);
  rect(x0, top, w, 1, C.steel3);
  for (let x = x0 + 3; x < W; x += 6) {
    rect(x, top + 1, 1, front - top - 1, C.steel3);
    rect(x + 1, top + 1, 1, front - top - 1, C.steel1);
  }
  rect(x0, front, w, bottom - front, C.steel1);
  rect(x0, front, w, 1, C.white);
  rect(x0, front + 1, w, 1, C.steel3);
  rect(x0, bottom - 1, w, 1, C.steel0);
  // The sign, hung from the fascia on two rods: the school's blue, an ink border, white letters.
  const label = 'CAFETERIA', sw = measure(label, { font: 3 }) + 8, sx = Math.round((WALKWAY.post + 4 + W) / 2 - sw / 2), sy = bottom + 3;
  for (const rx of [sx + 4, sx + sw - 5]) rect(rx, bottom, 1, 3, C.ink);
  rect(sx + sw, sy + 1, 1, 9, SAND.deep);
  rect(sx, sy, sw, 10, C.ink);
  rect(sx + 1, sy + 1, sw - 2, 8, C.blue1);
  rect(sx + 1, sy + 1, sw - 2, 1, C.blue2);
  rect(sx + 1, sy + 8, sw - 2, 1, C.blue0);
  text(label, sx + 4, sy + 2, { font: 3, color: C.white });
}

// ---- Baked once ----
let BAKED = null;
function bake() {
  return {
    sky: layer(W, H, paintSky),
    set: layer(W, H, (lg) => {
      paintFarTrees();
      paintRoof();
      paintWall();
      WINDOWS.forEach(paintWindow);
      paintShop(lg);
      paintSign();
      paintBanner();
      paintSafety();
      paintDownspout();
      paintPath();
      paintLawn();
      paintShadows();
      paintWalkway();
    }),
    clouds: CLOUDS.map((c) => makeCloud(c.puffs)),
    trees: TREES.map((_, i) => makeTree(i)),
  };
}

/**
 * Everything that never stands in front of anyone, seen from view = { x, y } at 1x: the sky, the clouds drifting
 * behind the treetops and the roof, the school, the path and the lawn with its shade. Leaves pixel.js drawing into g
 * with the camera at the screen.
 */
export function drawBackdrop(g, view, t) {
  BAKED ??= bake();
  useContext(g);
  camera(view.x, view.y, 1);
  if (view.y < ROOF_Y) {
    blit(BAKED.sky, 0, 0);
    clouds(t);
    birds(t);
  }
  blit(BAKED.set, 0, 0);
  screen();
}

// ---- Things standing on the floor ----
// The trees: a trunk eight pixels wide with roots flared at the foot and a bough, lit on the left; the crown from about
// 54 to 120 pixels up (so anyone under it shows whole), clumps of leaves outlined together and shaded like balls lit
// from the upper left (crown() above), a few bright leaves, and a ragged pocket of shade deep in the foliage. Each
// tree is drawn once into a layer, so its see-through version is one clean layer, like the arena's rocket.
const CROWNS = [
  [[0, 2, 21], [1, -16, 17], [-17, -3, 16], [17, -2, 16], [-9, 13, 16], [10, 14, 16], [-25, 6, 7], [26, 8, 6]],
  [[0, 0, 21], [-3, -17, 16], [15, -10, 15], [-18, 1, 15], [18, 8, 15], [-6, 14, 16], [9, 16, 14], [-24, -10, 7]],
];
/** A pocket of shade in each crown, where the foliage is deep: ragged, unoutlined, the leaves' own darkest tone. */
const POCKETS = [
  [[14, 12, ['.##..', '####.', '.####', '..##.']]],
  [[-22, 8, ['..##.', '.####', '####.', '.#...']]],
];
const TREE = { w: 80, h: 128, fx: 40, fy: 124, up: 86 };
function makeTree(n) {
  const { fx, fy } = TREE, cx = fx, cy = fy - TREE.up;
  const l = layer(TREE.w, TREE.h, () => {
    // The trunk, flaring into roots at the foot.
    const hw = (r) => (r >= -3 ? 4 + (r + 4) : 4);
    for (let r = -72; r < 0; r++) {
      const ink = Math.max(hw(r), hw(r + 1 < 0 ? r + 1 : r)) + 1;
      rect(fx - ink, fy + r, ink * 2, 1, C.ink);
    }
    rect(fx - hw(-1) - 1, fy, hw(-1) * 2 + 2, 1, C.ink);
    // A bough leaving the trunk for the crown, on the right of one tree and the left of the other.
    const [bx0, by0, bx1, by1] = n ? [fx - 3, fy - 38, fx - 13, fy - 58] : [fx + 3, fy - 40, fx + 12, fy - 58];
    const bough = (yy) => Math.round(bx0 + ((bx1 - bx0) * (yy - by0)) / (by1 - by0));
    for (let yy = by1; yy <= by0; yy++) rect(bough(yy) - 2, yy, 5, 1, C.ink);
    for (let r = -72; r < 0; r++) {
      const h = hw(r);
      rect(fx - h, fy + r, h * 2, 1, BARK[1]);
      rect(fx - h, fy + r, 2, 1, BARK[2]);
      rect(fx + h - 2, fy + r, 2, 1, BARK[0]);
    }
    for (let yy = by1; yy < by0; yy++) {
      const x = bough(yy);
      rect(x - 1, yy, 3, 1, BARK[1]);
      rect(x - 1, yy, 1, 1, BARK[2]);
      rect(x + 1, yy, 1, 1, BARK[0]);
    }
    for (const [dx, dy, len] of [[-1, -22, 3], [1, -37, 4], [0, -12, 2], [-1, -48, 3]]) rect(fx + dx, fy + dy, 1, len, BARK[0]);
    rect(fx - 2, fy - 30, 2, 2, BARK[0]);
    rect(fx - 2, fy - 31, 2, 1, BARK[2]);
    // The crown.
    const at = ([dx, dy, r]) => [cx + dx, cy + dy, r];
    crown(CROWNS[n].map(at), cx - 2, cy - 2, 36, LEAF, n * 500 + 77, null, POCKETS[n].map(at));
  });
  return l;
}
/** Each tree's own pixels (1 where it's drawn), read back once from its layer, for covers(). */
const MASKS = [];
function maskOf(i) {
  if (!MASKS[i]) {
    const { canvas, w, h } = BAKED.trees[i], a = canvas.getContext('2d').getImageData(0, 0, w, h).data;
    MASKS[i] = Uint8Array.from({ length: w * h }, (_, k) => (a[k * 4 + 3] ? 1 : 0));
  }
  return MASKS[i];
}
/** How many of tree i's pixels fall on a world box shrunk by 4 pixels a side (someone's body, not the air round it).
 *  The box is snapped to whole pixels first: walking, her feet are between pixels. */
function covers(tr, i, b) {
  const m = maskOf(i), x0 = tr.x - TREE.fx, y0 = tr.y - TREE.fy, r = Math.round;
  let n = 0;
  for (let y = Math.max(r(b.y0) + 4, y0); y < Math.min(r(b.y1) - 4, y0 + TREE.h); y++) {
    for (let x = Math.max(r(b.x0) + 4, x0); x < Math.min(r(b.x1) - 4, x0 + TREE.w); x++) n += m[(y - y0) * TREE.w + x - x0];
  }
  return n;
}
/** A tree, see-through (at 0.35, like the arena's rocket: field.js drawFieldLive) when it stands in front of someone
 *  and its leaves or trunk really cover them, two dozen pixels of their body or more, not when its box just grazes
 *  theirs. */
function drawTree(tr, i, who) {
  const l = BAKED.trees[i];
  const draw = () => blit(l, tr.x - TREE.fx, tr.y - TREE.fy);
  const hides = who.some((w) => tr.y > w.y1 && covers(tr, i, w) >= 24);
  if (hides) withAlpha(0.35, draw);
  else draw();
}

/** The walkway's post at the lawn's edge: square steel, lit on its left, a base plate bolted down and a knee brace up
 *  under the fascia. */
function walkwayPost() {
  const x = WALKWAY.post, y = WALKWAY.y, top = deckFront() + 7;
  rect(x - 3, top, 6, y - top, C.ink);
  rect(x - 2, top, 1, y - top - 1, C.steel3);
  rect(x - 1, top, 2, y - top - 1, C.steel2);
  rect(x + 1, top, 1, y - top - 1, C.steel1);
  // The knee brace, a stepped diagonal from the post up to the fascia on its right.
  for (let k = 0; k < 6; k++) {
    rect(x + 2 + k, top + 6 - k, 2, 2, C.ink);
    rect(x + 3 + k, top + 6 - k, 1, 1, C.steel2);
  }
  // The base plate.
  rect(x - 5, y - 3, 10, 4, C.ink);
  rect(x - 4, y - 2, 8, 1, C.steel3);
  rect(x - 4, y - 1, 8, 1, C.steel1);
}

/** A park bench facing the lawn: steel ends and armrests, a two-slat back, the seat at the bleachers' height. */
function bench() {
  const { x0, x1, y } = BENCH, w = x1 - x0, seat = y + 3 - 12, top = y - 26;
  // The back: posts, then two slats.
  for (const px of [x0 + 4, x1 - 6]) {
    rect(px - 1, top, 4, seat - top, C.ink);
    rect(px, top + 1, 2, seat - top - 1, C.steel1);
    rect(px, top + 1, 1, seat - top - 1, C.steel2);
  }
  for (const sy of [top, top + 7]) {
    rect(x0 + 1, sy, w - 2, 5, C.ink);
    rect(x0 + 2, sy + 1, w - 4, 3, WOOD[1]);
    rect(x0 + 2, sy + 1, w - 4, 1, WOOD[2]);
    rect(x0 + 2, sy + 3, w - 4, 1, WOOD[0]);
    rect(x0 + 2, sy + 1, 1, 3, WOOD[3]);
  }
  // The seat: its top face, the lit front edge, the face toward you.
  rect(x0, seat - 1, w, 7, C.ink);
  rect(x0 + 1, seat, w - 2, 3, WOOD[2]);
  rect(x0 + 1, seat + 1, w - 2, 1, WOOD[1]);
  rect(x0 + 1, seat + 3, w - 2, 1, WOOD[3]);
  rect(x0 + 1, seat + 4, w - 2, 1, WOOD[0]);
  // The ends: legs and armrests, edge-on.
  for (const ex of [x0 - 1, x1 - 2]) {
    rect(ex - 1, seat - 9, 5, y - seat + 10, C.ink);
    rect(ex, seat - 8, 3, y - seat + 8, C.steel1);
    rect(ex, seat - 8, 1, y - seat + 8, C.steel2);
    rect(ex - 2, seat - 10, 7, 3, C.ink);
    rect(ex - 1, seat - 9, 5, 1, C.steel3);
    rect(ex - 2, y - 1, 7, 2, C.ink);
  }
}

/** A wooden easel six feet tall, holding the big thank-you card for the sponsor, signed by the team. */
function easel() {
  const { x, y } = EASEL, top = y - 48, cardY = top + 13, cardX = x - 22;
  // Legs: one at the back, two splayed in front.
  const leg = (xa, ya, xb, yb, lit, shade) => {
    const at = (yy) => Math.round(xa + ((xb - xa) * (yy - ya)) / (yb - ya));
    for (let yy = ya - 1; yy <= yb; yy++) rect(at(yy) - 2, yy, 4, 1, C.ink);
    for (let yy = ya; yy < yb; yy++) {
      rect(at(yy) - 1, yy, 1, 1, lit);
      rect(at(yy), yy, 1, 1, shade);
    }
  };
  leg(x + 1, top + 2, x + 2, y - 4, WOOD[1], WOOD[0]);
  leg(x - 2, top, x - 9, y, WOOD[3], WOOD[1]);
  leg(x + 3, top, x + 10, y, WOOD[2], WOOD[1]);
  rect(x - 3, top - 2, 7, 3, C.ink);
  rect(x - 2, top - 1, 5, 1, WOOD[2]);
  // The card.
  rect(cardX, cardY, 44, 20, C.ink);
  rect(cardX + 1, cardY + 1, 42, 18, C.white);
  rect(cardX + 1, cardY + 17, 42, 1, C.steel3);
  rect(cardX + 42, cardY + 1, 1, 17, C.steel3);
  text('THANK YOU!', x, cardY + 2, { font: 3, color: C.red1, align: 'center' });
  text('RIVERSIDE', x, cardY + 8, { font: 3, color: C.ink, align: 'center' });
  // Signatures.
  for (const [sx, sy, c] of [[3, 15, C.blue1], [10, 16, C.red1], [17, 15, C.ink], [27, 16, C.blue1], [34, 15, C.red1]]) {
    rect(cardX + sx, cardY + sy, 1, 1, c);
    rect(cardX + sx + 1, cardY + sy - 1, 1, 1, c);
    rect(cardX + sx + 2, cardY + sy, 2, 1, c);
  }
  // The ledge it stands on.
  rect(x - 25, cardY + 18, 50, 4, C.ink);
  rect(x - 24, cardY + 19, 48, 1, WOOD[3]);
  rect(x - 24, cardY + 20, 48, 1, WOOD[1]);
}

/** The folding table for the outreach demo: white top, steel legs, a clipboard and a jar, the sign-up sheet taped on. */
function table() {
  const { x0, x1, y } = TABLE, w = x1 - x0, front = y - 20, back = front - 7;
  for (const lx of [x0 + 3, x1 - 5]) {
    rect(lx - 1, front + 2, 4, y - front - 2, C.ink);
    rect(lx, front + 2, 2, y - front - 3, C.steel2);
    rect(lx + 1, front + 2, 1, y - front - 3, C.steel1);
    rect(lx - 2, y - 1, 6, 2, C.ink);
  }
  // The top.
  rect(x0 - 1, back - 1, w + 2, front - back + 4, C.ink);
  rect(x0, back, w, front - back, '#e8ecf5');
  rect(x0, back, w, 1, C.white);
  rect(x0, front, w, 1, C.steel3);
  rect(x0, front + 1, w, 1, C.steel2);
  // A clipboard lying on it, and a jar for the volunteers' names.
  rect(x0 + 6, back + 1, 12, 5, C.ink);
  rect(x0 + 7, back + 2, 10, 3, WOOD[2]);
  rect(x0 + 8, back + 2, 8, 2, C.white);
  rect(x0 + 9, back + 3, 5, 1, C.steel2);
  rect(x0 + 10, back + 1, 4, 1, C.steel3);
  const jx = x1 - 12, jy = back + 4;
  rect(jx - 1, jy - 9, 8, 10, C.ink);
  rect(jx, jy - 8, 6, 8, C.blue3);
  rect(jx, jy - 4, 6, 4, C.yel1);
  rect(jx + 2, jy - 3, 1, 1, C.red1);
  rect(jx + 4, jy - 2, 1, 1, C.org1);
  rect(jx, jy - 8, 1, 7, C.white);
  rect(jx - 1, jy - 10, 8, 2, C.ink);
  rect(jx, jy - 10, 6, 1, C.steel3);
  // The sign-up sheet, taped to the front edge.
  const sx = x0 + 9, sy = front + 1;
  rect(sx, sy, 30, 10, C.ink);
  rect(sx + 1, sy + 1, 28, 8, C.white);
  rect(sx + 1, sy + 8, 28, 1, C.steel3);
  text('SIGN UP', sx + 15, sy + 2, { font: 3, color: C.ink, align: 'center' });
  rect(sx + 2, sy, 3, 2, SAND.lit);
  rect(sx + 25, sy, 3, 2, SAND.lit);
}

/** A backpack slumped on the grass: three tones of its colour, a lit strap, the zip pull. */
const PACK = [
  '..kkk...',
  '.kLMMkk.',
  'kLLMMMSk',
  'kLMMMMSk',
  'kLkkkkSk',
  'kLkMZkSk',
  'kLkMMkSk',
  'kSSSSSSk',
  'kkkkkkkk',
];
function bag(b) {
  const [S, M, L] = BAG[b.c];
  sprite(b.x - 4, b.y - 8, PACK, { k: C.ink, L, M, S, Z: C.steel3 });
}

/**
 * Everything standing on the floor, as { y: floor line, draw() }, to sort in with the people: draw() works in world
 * pixels through pixel.js's camera, which the caller sets (useContext(g), camera(view.x, view.y, 1)) before each.
 * o.who: world rectangles { x0, x1, y0, y1 } of anyone the trees mustn't hide; a tree in front of one goes see-through.
 */
export function things(t, o = {}) {
  BAKED ??= bake();
  const who = o.who ?? [];
  return [
    ...TREES.map((tr, i) => ({ y: tr.y, draw: () => drawTree(tr, i, who) })),
    { y: BENCH.y, draw: bench },
    { y: EASEL.y, draw: easel },
    { y: TABLE.y, draw: table },
    ...BAGS.map((b) => ({ y: b.y, draw: () => bag(b) })),
    { y: WALKWAY.y, draw: walkwayPost },
  ];
}

// ---- Where she can walk ----
/** True where her feet can't go: the wall, the world's edges, the tree's trunk, the bench, the easel, the table, the bags,
 *  the walkway's post. (The way out is past the right edge on the path: scene.js exit takes her there.) */
export function blocked(x, y) {
  if (y < WALL_Y + 4 || y > 258 || x < 8 || x > 504) return true;
  // A trunk: its own half width (four pixels, six at the roots) and hers, so she never stands over it.
  if (TREES.some((tr) => Math.abs(x - tr.x) < 11 && y >= tr.y - 4 && y <= tr.y + 2)) return true;
  // The bench, and her own half width past either end, so walking along the path into it she stops clear of its steel
  // ends and armrests.
  if (x >= BENCH.x0 - 12 && x <= BENCH.x1 + 12 && y >= BENCH.y - 6 && y <= BENCH.y + 2) return true;
  // The easel: the whole card's width and hers, from the wall's foot, so she can't stand behind it or over its card.
  if (Math.abs(x - EASEL.x) <= 28 && y <= EASEL.y + 4) return true;
  // The table, and a step in front of it: walking up to it she stops where she's across it from Nadia (people.js within()),
  // or, at either end, close enough beside her to talk.
  if (x >= TABLE.x0 - 2 && x <= TABLE.x1 + 2 && y >= TABLE.y - 8 && y <= TABLE.y + 6) return true;
  // The walkway's post: its own half width and hers, from its base plate's back edge to a step in front.
  if (Math.abs(x - WALKWAY.post) < 10 && y >= WALKWAY.y - 3 && y <= WALKWAY.y + 2) return true;
  return BAGS.some((b) => Math.abs(x - b.x) <= 5 && y >= b.y - 3 && y <= b.y + 2);
}
