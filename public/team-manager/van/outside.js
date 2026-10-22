// The van from the outside: team 5026's white passenger van and red trailer on the highway at dawn, seen from the side
// and a little above (Blue Banner's 20 degrees, so roofs and the hood show their top faces), driving right. The camera rides
// along, so the van holds still on the screen and the world streams left past it: the sky stays put, the far hills drift
// at 3 pixels a second, the tree-covered ridge at 10, and everything on the ground (the far roadside's trees, the median
// guardrail, the lanes, the shoulder and the near verge) at the road's own 90.
//
// One screen, 256 x 144 at scale 1, top to bottom: a dawn sky in dithered bands (the intro's night colours at the top,
// warming to gold at the horizon, the last stars, the sun low on the left behind the van so the light stays upper left),
// the hills, the ridge, the far roadside's trees, the guardrail, the passing lane, the dashes, the van's lane, the white
// edge line, the shoulder's rumble strip and the near verge with its reflector posts.
//
// Highway signs face the camera, like the arena's QUEUE sign: the city sign stands on the far roadside, so its post
// passes behind the van; the exit sign stands on the near shoulder, so its two posts cross in front of it while the
// panel rides over its roof. A car overtakes in the passing lane, behind the van, its roof showing over the van's.
//
// The van's near side is its right side (the passenger side). Its windows show the people inside: the dark cabin goes
// down first, then opts.inside draws whoever sits by those windows (people.js drawProfiles), then the body around the
// openings, then the glass over them. Wheels turn with the distance driven; the body bounces a pixel now and then on
// its springs (layout.js bounce) and the trailer a moment later.
//
// Everything is filled rectangles on whole pixels with ink outlines and three tones lit from the upper left. The
// backdrops, the ground strip, the van, the trailer, the car and the signs are drawn once into canvases on first use
// and blitted after; each frame only places them and draws what moves on them (wheels, lamps).

import { C, useContext, screen, cam, rect, fill, disk, dither, text, withAlpha, layer, blit, rnd } from '../pixel.js';
import { SIDE, ROAD, bounce, trailerBounce, blinkOn, RAMP } from './layout.js';

const SHADOW = 'rgba(5, 6, 13, 0.45)';
// The dawn: new sky tones under the palette's night blues, and the ridge's dark teal-greens.
const DAWN = { mauve: '#7a3f8f', coral: '#d9605a', gold: '#ffc98a' };
const RIDGE = ['#10262e', '#173840', '#21504f'];
const WELL = '#101219'; // inside the wheel arches
const BADGE_INK = '#16161b'; // the panther badge's black, as on the team's merch
/** How fast each layer streams left, in pixels a second. The car overtakes this much faster than the van drives. */
const SPEED = { hills: 3, ridge: 10, car: 45 };
const STRIP = { y: 40, w: 768, h: 104 }; // the ground: three screens long so the roadside trees don't repeat too soon
const VAN_MID = SIDE.vx + SIDE.len / 2; // 170, where the car's middle passes the van's

// ---- Pixel buffers ----
// A shape painted pixel by pixel in local coordinates, then given its ink outline (every empty pixel touching a painted
// one) and turned into a canvas. Used for the van, the trailer and the car, so outlines always close round every part.
function buffer(x0, y0, w, h) {
  const px = new Array(w * h).fill(null);
  const at = (x, y) => (x >= x0 && x < x0 + w && y >= y0 && y < y0 + h ? (y - y0) * w + (x - x0) : -1);
  const b = {
    x0, y0, w, h,
    put(x, y, c) { const i = at(x, y); if (i >= 0) px[i] = c; },
    get(x, y) { const i = at(x, y); return i >= 0 ? px[i] : null; },
    box(x, y, bw, bh, c) { for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) b.put(x + i, y + j, c); },
    row(y, xa, xb, c) { for (let x = xa; x < xb; x++) b.put(x, y, c); },
    outline(c = C.ink) {
      const add = [];
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
        if (b.get(x, y)) continue;
        if (b.get(x - 1, y) || b.get(x + 1, y) || b.get(x, y - 1) || b.get(x, y + 1)) add.push([x, y]);
      }
      for (const [x, y] of add) b.put(x, y, c);
    },
    /** Paste a letter grid: each letter a colour from pal, '.' left alone. */
    grid(x, y, rows, pal) { rows.forEach((r, j) => [...r].forEach((ch, i) => ch !== '.' && b.put(x + i, y + j, pal[ch]))); },
    /** pixel.js's bitmap text, painted into the buffer. */
    text(str, x, y, o) { textInto(b, str, x, y, o); },
    layer() {
      // Runs of one colour along each row, one rectangle each.
      return layer(w, h, () => {
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w;) {
            const c = px[y * w + x];
            let n = 1;
            while (x + n < w && px[y * w + x + n] === c) n++;
            if (c) fill(x, y, n, 1, c);
            x += n;
          }
        }
      });
    },
  };
  return b;
}
// pixel.js's text() draws through the canvas; a buffer wants the pixels, so text is drawn with a tiny fake context.
function textInto(b, str, x, y, o) {
  const prev = useContext({
    set fillStyle(c) { this.c = c; },
    fillRect(X, Y, w, h) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) b.put(X + i, Y + j, this.c); },
  });
  const saved = { ...cam };
  screen();
  text(str, x, y, o);
  Object.assign(cam, saved);
  useContext(prev);
}
/** The rows of a pixel disk like pixel.js's disk(): [y, x0, x1) for a circle of diameter 2r round the corner (cx, cy). */
function diskRows(cx, cy, r) {
  const out = [];
  for (let dy = -r; dy < r; dy++) {
    const hw = Math.round(Math.sqrt(r * r - (dy + 0.5) * (dy + 0.5)));
    out.push([cy + dy, cx - hw, cx + hw]);
  }
  return out;
}

// ---- The sky, drawn once ----
// Bands from the intro's night down to a gold horizon, a checkerboard dither between each pair. The stars are only in
// the top two bands, where it's still night. The sun is a hard disk low on the left, so the light stays upper left.
const SKY_H = 64;
const SKY_BANDS = [[0, C.night1], [8, C.night2], [14, C.night3], [19, C.glow], [24, DAWN.mauve], [28, DAWN.coral], [32, C.org1], [36, DAWN.gold]];
const SUN = { x: 44, y: 34, r: 7 };
let skyLayer = null;
function makeSky() {
  return layer(256, SKY_H, () => {
    SKY_BANDS.forEach(([y, c], i) => {
      const next = SKY_BANDS[i + 1]?.[0] ?? SKY_H;
      fill(0, y, 256, next - y, c);
    });
    // Wide seams up in the night, narrow ones in the thin warm bands near the horizon.
    SKY_BANDS.forEach(([y, c], i) => {
      if (i === 0) return;
      const seam = i < 3 ? 6 : 2;
      dither(0, y - seam / 2, 256, seam, SKY_BANDS[i - 1][1], c);
    });
    // The intro's faint speckle of night blues, then the last stars.
    for (let i = 0; i < 160; i++) {
      const x = Math.floor(rnd(i + 210.3) * 256), y = Math.floor(rnd(i + 211.9) * 16);
      fill(x, y, 1, 1, y < 8 ? C.night2 : C.night3);
    }
    for (let i = 0; i < 26; i++) {
      const x = Math.floor(rnd(i + 0.5) * 256), y = 1 + Math.floor(rnd(i + 31.7) * 12);
      fill(x, y, 1, 1, rnd(i + 7) > 0.75 ? C.star : C.starDim);
    }
    // The sun: pale gold rim, yellow disk, a white core set up and left.
    disk(SUN.x, SUN.y, SUN.r + 1, DAWN.gold);
    disk(SUN.x, SUN.y, SUN.r, C.yel2);
    disk(SUN.x - 1, SUN.y - 1, SUN.r - 3, C.white);
  });
}
const TWINKLES = [[37, 4, 0.3], [151, 9, 2.1], [219, 3, 3.4], [96, 11, 1.2]];
function twinkles(t) {
  for (const [x, y, ph] of TWINKLES) {
    const k = (((t * 1.1 + ph) % 4) + 4) % 4;
    if (k < 0.6) {
      fill(x - 1, y, 3, 1, C.star);
      fill(x, y - 1, 1, 3, C.star);
    } else fill(x, y, 1, 1, C.starDim);
  }
}

// ---- The far hills and the ridge, tileable strips ----
const BACK_W = 512;
// Sums of sines whose periods divide the strip, so it wraps without a seam.
const wave = (x, terms) => terms.reduce((s, [a, k, ph]) => s + a * Math.sin((2 * Math.PI * k * x) / BACK_W + ph), 0);
/** A silhouette range: crest(x) is its top row; fill below it, a lit rim where the slope faces the light. */
function range(crest, bottom, body, rim) {
  for (let x = 0; x < BACK_W; x++) {
    const y = crest(x), left = crest((x + BACK_W - 1) % BACK_W), right = crest((x + 1) % BACK_W);
    fill(x, y, 1, bottom - y, body);
    // Rising to the right means this column's top faces up and left: lit. So does a step up from the column before.
    if (right <= y) fill(x, y, 1, 1, rim);
    if (left > y) fill(x, y, 1, Math.min(left - y, 3), rim);
  }
}
let hillLayer = null;
function makeHills() {
  return layer(BACK_W, 40, () => {
    // Two ranges: the far one lighter (in the haze), the near one darker.
    const far = (x) => Math.round(9 + wave(x, [[2.6, 2, 0.4], [3, 5, 2.1], [1.4, 11, 0.7]]));
    const near = (x) => Math.round(15 + wave(x, [[2.4, 3, 1.9], [2.6, 7, 0.2], [1, 17, 2.6]]));
    range(far, 40, C.stand2, C.night3);
    range(near, 40, C.stand1, C.stand2);
  });
}
let ridgeLayer = null;
function makeRidge() {
  return layer(BACK_W, 30, () => {
    // A wooded ridge: a low crest with tree crowns bumping up along it, lit on their upper left.
    const crest = (x) => Math.round(10 + wave(x, [[2.2, 2, 1.1], [1.2, 6, 0.3]]));
    for (let x = 0; x < BACK_W; x++) fill(x, crest(x), 1, 30 - crest(x), RIDGE[1]);
    for (let i = 0, x = 0; x < BACK_W + 8; i++) {
      const r = 3 + Math.floor(rnd(i + 70.3) * 3), cx = x % BACK_W, cy = crest(cx) + 1;
      for (const [y, a, b] of diskRows(cx, cy, r)) {
        if (y >= cy) continue;
        for (let px = a; px < b; px++) fill((px + BACK_W) % BACK_W, y, 1, 1, RIDGE[1]);
        fill((a + BACK_W) % BACK_W, y, 1, 1, RIDGE[2]);
        if (y === cy - r) for (let px = a; px < b - 1; px++) fill((px + BACK_W) % BACK_W, y, 1, 1, RIDGE[2]);
        fill((b - 1 + BACK_W) % BACK_W, y, 1, 1, RIDGE[0]);
      }
      x += r + 2 + Math.floor(rnd(i + 3.3) * 4);
    }
    // Shade gathering toward the foot, and a few lighter crowns.
    fill(0, 24, BACK_W, 6, RIDGE[0]);
    dither(0, 21, BACK_W, 3, RIDGE[1], RIDGE[0]);
    for (let i = 0; i < 90; i++) {
      const x = Math.floor(rnd(i + 900.1) * BACK_W), y = crest(x) + 2 + Math.floor(rnd(i + 901.7) * 10);
      fill(x, y, 1, 1, rnd(i + 5) > 0.5 ? RIDGE[2] : RIDGE[0]);
    }
  });
}

// ---- The ground, drawn once ----
// Screen rows (the strip starts at STRIP.y): the far roadside's bank and trees, the median under its guardrail, the
// paved left shoulder with its yellow line, the passing lane, the dashes, the van's lane, the white edge line, the
// shoulder and its rumble strip, the near verge and its reflector posts.
const GROUND = { bank: 58, rail: 63, median: 64, yellow: 70, passing: 72, dashes: 96, lane: 98, edge: 128, shoulder: 130, verge: 137 };

/** A roadside tree like the cabin's: a stepped round crown on a short trunk, ink outline, lit upper left. */
function tree(x, ground, r, kind, seed) {
  const L = RAMP.leaf, B = RAMP.bark;
  const crown = new Set(), key = (a, b) => `${a},${b}`;
  const cy = ground - 6 - r;
  const blobs = kind === 'tall'
    ? [[x, cy - r + 1, r - 1], [x, cy + 1, r], [x - 1, cy - 2 * r + 4, r - 2]]
    : [[x, cy, r], [x - r + 2, cy + 2, r - 2], [x + r - 2, cy + 2, r - 2]];
  for (const [bx, by, br] of blobs) for (const [y, a, b] of diskRows(bx, by, br)) for (let px = a; px < b; px++) crown.add(key(px, y));
  const has = (a, b) => crown.has(key(a, b));
  // The trunk, behind the crown's bottom edge.
  fill(x - 2, cy + r - 2, 4, ground - (cy + r - 2), C.ink);
  fill(x - 1, cy + r - 2, 2, ground - (cy + r - 2) - 1, B[1]);
  fill(x - 1, cy + r - 2, 1, ground - (cy + r - 2) - 1, B[2]);
  for (const k of crown) {
    const [px, py] = k.split(',').map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!has(px + dx, py + dy)) fill(px + dx, py + dy, 1, 1, C.ink);
  }
  for (const k of crown) {
    const [px, py] = k.split(',').map(Number);
    let c = L[1];
    if (!has(px - 1, py) || !has(px, py - 1) || !has(px - 1, py - 1)) c = L[2];
    else if (!has(px + 1, py) || !has(px, py + 1) || !has(px + 1, py + 1)) c = L[0];
    fill(px, py, 1, 1, c);
  }
  // A few leaf dots: lit ones up and left, dark ones down and right.
  for (let i = 0; i < r + 2; i++) {
    const dx = Math.round((rnd(seed * 7 + i) - 0.5) * r * 1.4), dy = Math.round((rnd(seed * 3 + i + 0.5) - 0.5) * r * 1.4);
    if (!has(x + dx - 1, cy + dy) || !has(x + dx + 1, cy + dy) || !has(x + dx, cy + dy + 1)) continue;
    fill(x + dx, cy + dy, 1, 1, dx + dy < 0 ? L[2] : L[0]);
  }
}

let groundLayer = null;
function makeGround() {
  const W = STRIP.w, G = GROUND, Y = (y) => y - STRIP.y;
  const A = RAMP.asphalt, grass = RAMP.grass;
  return layer(W, STRIP.h, () => {
    // Three times, a strip to either side as well, so anything hanging over an end wraps round to the other.
    const wrap = (draw) => { for (const o of [-W, 0, W]) draw(o); };
    // The far bank.
    fill(0, Y(G.bank), W, G.median - G.bank, grass[0]);
    for (let i = 0; i < 260; i++) fill(Math.floor(rnd(i + 40.1) * W), Y(G.bank + Math.floor(rnd(i + 41.3) * 6)), 1, 1, rnd(i + 2) > 0.5 ? grass[1] : RAMP.leaf[0]);
    fill(0, Y(G.bank), W, 1, grass[1]);
    // Trees along it, back ones first. Positions fixed by rnd so the strip is the same every time.
    const trees = [];
    for (let i = 0, x = 6; x < W; i++) {
      trees.push({ x, ground: G.bank + 4 + Math.floor(rnd(i + 12.2) * 2), r: 5 + Math.floor(rnd(i + 13.9) * 4), kind: rnd(i + 17.7) > 0.7 ? 'tall' : 'round' });
      x += 12 + Math.floor(rnd(i + 19.1) * 26);
    }
    trees.sort((a, b) => a.ground - b.ground);
    wrap((o) => trees.forEach((tr) => tree(tr.x + o, Y(tr.ground), tr.r, tr.kind, tr.x)));
    // The median: dark grass under the guardrail, a paved strip, the yellow left edge line.
    fill(0, Y(G.median), W, G.yellow - G.median, grass[0]);
    fill(0, Y(G.median + 3), W, 1, RAMP.leaf[0]);
    fill(0, Y(G.yellow - 2), W, 2, A[2]);
    fill(0, Y(G.yellow), W, 2, C.yel1);
    fill(0, Y(G.yellow + 1), W, 1, C.yel0);
    // The guardrail: steel posts every 24 pixels, a W-beam rail with a highlight along its top.
    for (let x = 4; x < W; x += 24) {
      fill(x - 1, Y(G.rail), 4, G.yellow - 1 - G.rail, C.ink);
      fill(x, Y(G.rail + 1), 2, G.yellow - 3 - G.rail, C.steel1);
      fill(x, Y(G.rail + 1), 1, G.yellow - 3 - G.rail, C.steel2);
    }
    fill(0, Y(G.rail - 2), W, 5, C.ink);
    fill(0, Y(G.rail - 1), W, 1, C.white);
    fill(0, Y(G.rail), W, 1, C.steel3);
    fill(0, Y(G.rail + 1), W, 1, C.steel2);
    for (let x = 4; x < W; x += 24) fill(x, Y(G.rail), 2, 1, C.steel1); // bolts
    // The road: asphalt with a sparse speckle, the odd tar seam and patch so the motion reads.
    fill(0, Y(G.passing), W, G.shoulder - G.passing, A[1]);
    for (let i = 0; i < 1500; i++) {
      const x = Math.floor(rnd(i + 300.3) * W), y = G.passing + Math.floor(rnd(i + 301.9) * (G.edge - G.passing));
      fill(x, Y(y), 1, 1, rnd(i + 302.5) > 0.5 ? A[0] : A[2]);
    }
    for (let i = 0; i < 7; i++) {
      // A tar seam across a lane: a dark crack wandering down it.
      const x0 = Math.floor(rnd(i + 500.5) * W), lane = i % 2 ? [G.passing + 2, G.dashes - 2] : [G.lane + 2, G.edge - 2];
      let x = x0;
      for (let y = lane[0]; y < lane[1]; y++) {
        fill(((x % W) + W) % W, Y(y), 1, 1, A[0]);
        if (rnd(i * 31 + y) > 0.6) x += rnd(i * 17 + y) > 0.5 ? 1 : -1;
      }
    }
    for (let i = 0; i < 3; i++) {
      const x = Math.floor(rnd(i + 600.1) * (W - 40)), y = G.lane + 6 + Math.floor(rnd(i + 601.3) * 12);
      fill(x, Y(y), 26, 6, A[2]);
      fill(x, Y(y), 26, 1, C.carpet2);
      fill(x, Y(y + 5), 26, 1, A[0]);
    }
    // Lane dashes: 40 long every 128 (five feet every sixteen, as in the cabin view).
    for (let x = 20; x < W; x += 128) {
      fill(x, Y(G.dashes), 40, 1, C.tape);
      fill(x, Y(G.dashes + 1), 40, 1, '#9aa0b4');
    }
    // The solid white edge line, the shoulder and its rumble strip.
    fill(0, Y(G.edge), W, 1, C.tape);
    fill(0, Y(G.edge + 1), W, 1, '#9aa0b4');
    fill(0, Y(G.shoulder), W, G.verge - G.shoulder, A[2]);
    for (let i = 0; i < 300; i++) fill(Math.floor(rnd(i + 700.7) * W), Y(G.shoulder + Math.floor(rnd(i + 701.1) * 7)), 1, 1, rnd(i + 3) > 0.5 ? A[1] : C.carpet2);
    for (let x = 1; x < W; x += 4) {
      fill(x, Y(G.shoulder + 2), 2, 1, A[0]);
      fill(x + 1, Y(G.shoulder + 3), 2, 1, C.carpet2);
    }
    // The near verge: a gravel lip, then grass with sparse blades.
    fill(0, Y(G.verge - 1), W, 1, A[0]);
    fill(0, Y(G.verge), W, 144 - G.verge, grass[1]);
    fill(0, Y(G.verge), W, 1, grass[2]);
    for (let i = 0; i < 420; i++) {
      const x = Math.floor(rnd(i + 800.9) * W), y = G.verge + 1 + Math.floor(rnd(i + 801.3) * 6);
      fill(x, Y(y), 1, rnd(i + 4) > 0.6 ? 2 : 1, rnd(i + 802.1) > 0.45 ? grass[2] : grass[0]);
    }
    // Reflector posts on the verge: white, shaded right, an amber reflector, ink outline.
    for (let x = 60; x < W; x += 128) {
      fill(x - 1, Y(133), 5, 10, C.ink);
      fill(x, Y(134), 3, 8, C.white);
      fill(x + 2, Y(134), 1, 8, C.steel3);
      fill(x, Y(135), 2, 2, C.org1);
      fill(x, Y(135), 1, 1, C.org2);
    }
  });
}

/** Blit a strip so it repeats across the screen, scrolled left by off pixels. */
function tile(l, off, y) {
  const x0 = -(((off % l.w) + l.w) % l.w);
  for (let x = x0; x < 256; x += l.w) blit(l, x, y);
}
/** More of the near verge's grass from screen row y down for h rows, its blades streaming with the road (opts.lift). */
function verge(off, y, h) {
  const grass = RAMP.grass, W = STRIP.w, x0 = -(((off % W) + W) % W);
  fill(0, y, 256, h, grass[1]);
  for (let i = 0; i < 70 * h; i++) {
    const x = x0 + Math.floor(rnd(i + 830.9) * W), by = Math.floor(rnd(i + 831.3) * h);
    for (const px of [x, x + W]) if (px >= 0 && px < 256) fill(px, y + by, 1, rnd(i + 4) > 0.6 ? 2 : 1, rnd(i + 832.1) > 0.45 ? grass[2] : grass[0]);
  }
}

// ---- Signs ----
// Green highway panels facing the camera: ink outline, the green, a white line inset one pixel, white letters.
function panel(x, y, w, h) {
  rect(x - 1, y - 1, w + 2, h + 2, C.ink);
  rect(x, y, w, h, RAMP.sign[1]);
  rect(x, y, w, 1, RAMP.sign[2]);
  rect(x, y + h - 1, w, 1, RAMP.sign[0]);
  rect(x + 1, y + 1, w - 2, 1, C.white);
  rect(x + 1, y + h - 2, w - 2, 1, C.white);
  rect(x + 1, y + 1, 1, h - 2, C.white);
  rect(x + w - 2, y + 1, 1, h - 2, C.white);
}
/** A square steel post from y0 down to the ground at y1, with its ink edges. */
function post(x, y0, y1) {
  rect(x - 1, y0, 4, y1 - y0, C.ink);
  rect(x, y0, 2, y1 - y0 - 1, C.steel2);
  rect(x, y0, 1, y1 - y0 - 1, C.steel3);
  rect(x - 2, y1 - 1, 6, 2, C.ink);
}
// Each sign is drawn once into a canvas, its post's foot at (ox, oy) in the canvas.
const SIGNS = {
  city: {
    ox: 40, oy: 34,
    draw(ox, oy) {
      const w = 71, h = 15, x = ox - 35, y = oy - 32;
      post(ox - 1, y + h, oy);
      panel(x, y, w, h);
      text('RIVERTON 12', ox, y + 4, { color: C.white, align: 'center' });
    },
  },
  exit: {
    ox: 46, oy: 124,
    draw(ox, oy) {
      // EVENT CENTER on the main panel, 1/2 MILE under it, the EXIT 42 tab on top at the right. Tall posts: the panel
      // clears the van's roof, and the tab's top clears the film bar.
      const w = 83, h = 24, x = ox - 41, y = oy - 109;
      post(x + 15, y + h, oy);
      post(x + w - 17, y + h, oy);
      panel(x + w - 47, y - 11, 45, 12);
      text('EXIT 42', x + w - 25, y - 8, { color: C.white, align: 'center' });
      panel(x, y, w, h);
      text('EVENT CENTER', ox, y + 4, { color: C.white, align: 'center' });
      text('1/2 MILE', ox, y + 15, { font: 3, color: C.white, align: 'center' });
    },
  },
};
const signLayers = {};
function sign(kind, x, ground) {
  const s = SIGNS[kind];
  signLayers[kind] ??= layer(s.ox * 2, s.oy + 2, () => s.draw(s.ox, s.oy));
  blit(signLayers[kind], x - s.ox, ground - s.oy);
}

// ---- Wheels ----
/** An r-pixel wheel round the pixel corner (cx, cy): ink rim, tyre, a hubcap whose five slots turn with angle a. */
function wheel(cx, cy, r, a) {
  disk(cx, cy, r, C.ink);
  disk(cx, cy, r - 1, C.tire);
  // The tyre's sidewall catches a little light on its upper left.
  rect(cx - r + 3, cy - r + 2, 2, 1, C.steel1);
  rect(cx - r + 2, cy - r + 3, 1, 2, C.steel1);
  const h = r - 4;
  disk(cx, cy, h + 1, C.steel0);
  disk(cx, cy, h, C.steel2);
  rect(cx - h + 1, cy - h + 1, 2, 1, C.steel3);
  rect(cx - h, cy - h + 2, 1, 2, C.steel3);
  for (let k = 0; k < 5; k++) {
    const b = a + (k * 2 * Math.PI) / 5;
    for (let d = 2; d < h; d++) rect(cx + Math.floor(Math.cos(b) * d), cy + Math.floor(Math.sin(b) * d), 1, 1, C.steel1);
  }
  rect(cx - 1, cy - 1, 2, 2, C.steel3);
  rect(cx - 1, cy - 1, 1, 1, C.white);
}

// ---- The van ----
// Local coordinates: x from the van's back end (vx), y from the road under its near wheels (vy), up is negative.
// The side face runs from the roof edge (-52) down to the rocker (-7); the roof's top face is the 18 pixels above it.
const ROOF = -52, TOP = ROOF - 18, WIN = -SIDE.winTop, SILL = -SIDE.sill;
const AXLES = [26, 110], WR = 9; // wheel centres (from vx) and radius
/** The near A-pillar's x on row y (the windshield's near edge, roof at x 104 down to the hood at x 120). */
const aNear = (y) => 104 + Math.round(((y - ROOF) * 16) / 22);
/** The far A-pillar, 18 rows higher: the windshield's top-right edge against the sky. */
const aFar = (y) => 104 + Math.round(((y - TOP) * 16) / 22);
/** The hood's near edge, falling toward the nose. */
const hoodY = (x) => SILL + Math.round(((x - 120) * 5) / 15);
const NOSE = 136; // the side face ends here; the bumper sticks out one more
/** The three window openings on row y: [x0, x1) each. The front one follows the A-pillar. */
function openings(y) {
  if (y < WIN || y >= SILL) return [];
  const [rear, slide, front] = SIDE.windows;
  return [rear, slide, [front[0], aNear(y) - 3]];
}

const B3 = RAMP.body; // [shade, mid, lit]
let vanLayers = null;
const VBOX = { x: -6, y: TOP - 2, w: 146, h: -TOP + 4 };
function makeVan() {
  const b = buffer(VBOX.x, VBOX.y, VBOX.w, VBOX.h);
  const T = RAMP.trim;
  // The roof's top face, white in the morning light, its back corner rounded.
  for (let y = TOP; y < ROOF; y++) b.row(y, y === TOP ? 6 : y === TOP + 1 ? 4 : 3, 104, B3[2]);
  // The windshield, seen from the side and above: the dark cabin behind the glass (the glass goes on later), the
  // dash showing in its lower half.
  for (let y = TOP; y < SILL; y++) {
    const x0 = y < ROOF ? 104 : aNear(y) + 1, x1 = y < -48 ? aFar(y) : 120;
    b.row(y, x0, x1, RAMP.seat[0]);
    if (y >= -38) b.row(y, x0, x1, T[0]);
    if (y === -38) b.row(y, x0, x1, T[1]);
    if (y < -48 && x1 > x0) b.put(x1 - 1, y, B3[1]); // the far A-pillar
  }
  // The hood's top face, its far front corner rounded off; the cowl where it meets the glass.
  for (let x = 120; x < NOSE; x++) {
    const round = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 4, 7][x - 120];
    for (let y = hoodY(x) - 18 + round; y < hoodY(x); y++) b.put(x, y, B3[2]);
    b.put(x, hoodY(x) - 1, B3[1]); // the hood's front lip turning down
  }
  for (let y = -48; y < SILL; y++) b.put(120, y, T[0]);
  for (let x = 121; x < NOSE - 3; x++) b.put(x, hoodY(x) - 10, B3[1]); // the hood's crease
  // The side face: the back edge rounded at the top, the front following the A-pillar, then the hood and the nose.
  for (let y = ROOF; y <= -7; y++) {
    const x0 = y === ROOF ? 3 : y === ROOF + 1 ? 2 : y === ROOF + 2 ? 1 : 0;
    let x1 = y < SILL ? aNear(y) : NOSE;
    if (y >= SILL) for (let x = 120; x < NOSE; x++) if (hoodY(x) > y) { x1 = x; break; }
    if (y >= -9) x1 = NOSE - 1;
    b.row(y, x0, x1, B3[1]);
  }
  // The near A-pillar, two pixels of lit paint with ink between it and the glass.
  for (let y = ROOF; y < SILL; y++) {
    b.put(aNear(y) - 2, y, B3[2]);
    b.put(aNear(y) - 1, y, B3[1]);
    b.put(aNear(y), y, C.ink);
  }
  // The lower body in shade under a crease, the beltline's highlight just under the windows.
  for (let y = -15; y <= -7; y++) for (let x = 0; x < 136; x++) if (b.get(x, y)) b.put(x, y, B3[0]);
  for (let x = 1; x < 133; x++) if (b.get(x, -16)) b.put(x, -16, C.white);
  for (let x = 1; x < 131; x++) if (b.get(x, SILL)) b.put(x, SILL, C.white);
  // Blacked-out pillars between the windows, then the openings themselves left empty for the cabin to show through.
  const [rear, slide, front] = SIDE.windows;
  for (let y = WIN - 1; y <= SILL; y++) {
    b.row(y, rear[1], slide[0], T[0]);
    b.row(y, slide[1], front[0], T[0]);
  }
  for (let y = WIN; y < SILL; y++) for (const [a, c] of openings(y)) b.row(y, a, c, null);
  // The sliding door: its seams, the track along the rear quarter, the handles.
  for (let y = SILL + 1; y <= -8; y++) {
    b.put(slide[0] - 1, y, C.steel1);
    b.put(front[0] - 1, y, C.steel1);
  }
  for (let y = SILL + 1; y <= -17; y++) b.put(121, y, C.steel1); // the front door's front edge
  b.row(SILL + 2, rear[0] - 2, slide[0] - 1, C.steel1);
  b.row(SILL + 3, rear[0] - 2, slide[0] - 1, C.white);
  for (const hx of [slide[1] - 5, front[0] + 3]) {
    b.row(SILL + 2, hx, hx + 4, T[0]);
    b.row(SILL + 3, hx, hx + 4, C.white);
  }
  // The 5026 door magnet: red with notched corners, a small hexagon over white 5026.
  const mx = slide[0] + 1, my = SILL + 4, mw = 27, mh = 17;
  for (let y = my; y < my + mh; y++) {
    const notch = y === my || y === my + mh - 1 ? 1 : 0;
    b.row(y, mx + notch, mx + mw - notch, C.ink);
  }
  for (let y = my + 1; y < my + mh - 1; y++) {
    const notch = y === my + 1 || y === my + mh - 2 ? 1 : 0;
    b.row(y, mx + 1 + notch, mx + mw - 1 - notch, RAMP.trailer[1]);
  }
  b.row(my + 1, mx + 2, mx + mw - 2, RAMP.trailer[2]);
  b.row(my + mh - 2, mx + 2, mx + mw - 2, RAMP.trailer[0]);
  b.grid(mx + 11, my + 2, ['..w..', '.wkw.', 'wkWkw', 'wkkkw', '.wkw.', '..w..'], { w: C.white, W: C.white, k: BADGE_INK });
  b.text('5026', mx + 2, my + 8, { color: C.white });
  // The fuel door on the rear quarter.
  b.row(-25, 7, 12, B3[0]);
  b.row(-21, 7, 12, B3[0]);
  for (let y = -24; y < -21; y++) { b.put(6, y, B3[0]); b.put(12, y, B3[0]); }
  b.row(-24, 7, 12, C.white);
  // The rocker panel between the arches, and the bumpers, in trim greys.
  for (const [x0, x1] of [[2, 15], [38, 98], [122, 127]]) {
    b.row(-9, x0, x1, T[2]);
    for (let y = -8; y <= -7; y++) b.row(y, x0, x1, T[1]);
  }
  b.box(-2, -16, 7, 9, T[1]);
  b.row(-16, -2, 5, T[2]);
  b.row(-8, -2, 5, T[0]);
  b.box(125, -15, 12, 8, T[1]);
  b.row(-15, 125, 137, T[2]);
  b.row(-8, 125, 137, T[0]);
  b.row(-12, 126, 137, T[0]); // the bumper's lower intake
  // Tail light up the back corner; the rear amber lamp goes under it (lit or not is drawn each frame).
  for (let y = -47; y <= -31; y++) {
    b.put(0, y, RAMP.tail[1]);
    b.put(1, y, y < -45 ? RAMP.tail[2] : RAMP.tail[1]);
    b.put(2, y, RAMP.tail[0]);
  }
  // The headlight, a wedge under the hood's edge wrapping the front corner, ink round it.
  for (let x = 124; x < NOSE; x++) {
    const y0 = hoodY(x), h = x < 127 ? 2 + (x - 124) : 5;
    for (let y = y0; y < y0 + h; y++) b.put(x, y, RAMP.lamp[1]);
    b.put(x, y0, RAMP.lamp[2]);
    b.put(x, y0 + h - 1, RAMP.lamp[0]);
    b.put(x, y0 + h, C.ink);
  }
  for (let y = hoodY(124); y < hoodY(124) + 2; y++) b.put(123, y, C.ink);
  b.put(127, hoodY(127) + 1, C.white);
  b.put(128, hoodY(128) + 1, C.white);
  // The amber corner lamp's housing under it (lit or not is drawn each frame).
  b.box(129, -19, 7, 4, C.ink);
  // Wheel arches: the body cut round each wheel, a dark well inside, a shaded lip.
  for (const ax of AXLES) {
    for (const [y, a, c] of diskRows(ax, -WR, WR + 4)) if (y < -6) b.row(y, a, c, B3[0]);
    for (const [y, a, c] of diskRows(ax, -WR, WR + 3)) if (y < -6) b.row(y, a, c, C.ink);
    for (const [y, a, c] of diskRows(ax, -WR, WR + 2)) if (y < -6) b.row(y, a, c, WELL);
  }
  // The roof rails: two bars along the top face on little feet.
  for (const ry of [ROOF - 4, TOP + 3]) {
    b.row(ry, 16, 92, T[2]);
    b.row(ry + 1, 16, 92, C.ink);
    b.row(ry + 2, 17, 93, B3[1]); // its shadow on the roof
    for (const fx of [15, 91]) b.box(fx, ry, 2, 3, T[1]);
  }
  // The ink outline closes round the whole van and, inside each window opening, round its edge: the window frames.
  b.outline(C.ink);

  // The cabin behind the side windows: dark, with each near seat's back and headrest behind its passenger.
  const cabin = layer(VBOX.w, VBOX.h, () => {
    const at = (x, y) => [x - VBOX.x, y - VBOX.y];
    for (let y = WIN; y < SILL; y++) for (const [a, c] of openings(y)) fill(...at(a, y), c - a, 1, RAMP.seat[0]);
    for (const r of [3, 2, 1]) {
      const hx = SIDE.rows[r] - 13;
      fill(...at(hx, -46), 5, 16, RAMP.seat[1]);
      fill(...at(hx, -46), 1, 16, RAMP.seat[2]);
      fill(...at(hx + 1, -49), 4, 4, RAMP.seat[1]);
      fill(...at(hx + 1, -49), 3, 1, RAMP.seat[2]);
    }
    // The far side's door panels: a lighter trim line at armrest height.
    for (const [a, c] of openings(-34)) fill(...at(a, -34), c - a, 1, RAMP.seat[1]);
  });
  // The glass: a light blue film over each opening, a stepped white glint, and the side mirror over the front window.
  const glass = layer(VBOX.w, VBOX.h, () => {
    const at = (x, y) => [x - VBOX.x, y - VBOX.y];
    withAlpha(0.22, () => {
      for (let y = WIN + 1; y < SILL - 1; y++) for (const [a, c] of openings(y)) fill(...at(a + 1, y), c - a - 2, 1, RAMP.glass[2]);
    });
    withAlpha(0.3, () => {
      for (let y = TOP; y < SILL; y++) {
        const x0 = y < ROOF ? 104 : aNear(y) + 1, x1 = y < -48 ? aFar(y) - 1 : 120;
        if (x1 > x0) fill(...at(x0, y), x1 - x0, 1, RAMP.glass[2]);
      }
    });
    // Glints: solid stepped streaks of the glass's light blue, a pixel wide, rising to the right two pixels for each one
    // across, where nobody's face is: over the back seat's headrest in the rear window, low in the sliding door's
    // window ahead of Tess (under her Zs), and up the windshield. The film above is the glass's only see-through layer.
    for (const [x, len] of [[rear[0] + 3, 3], [rear[0] + 5, 2], [slide[1] - 7, 3], [slide[1] - 5, 2]]) {
      for (let k = 0; k < len; k++) fill(...at(x + k, SILL - 3 - k * 2), 1, 2, RAMP.glass[2]);
    }
    for (let k = 0; k < 5; k++) fill(...at(108 + k, -60 + k * 2), 1, 2, RAMP.glass[2]);
    // The mirror, sticking out at the front window's foot: its housing, lit on top, the repeater lamp under it.
    fill(...at(106, -39), 9, 9, C.ink);
    fill(...at(107, -38), 7, 6, B3[1]);
    fill(...at(107, -38), 7, 1, C.white);
    fill(...at(107, -38), 1, 6, B3[2]);
    fill(...at(113, -37), 1, 5, B3[0]);
    fill(...at(110, -30), 3, 2, C.ink);
  });
  return { body: b.layer(), cabin, glass };
}
/** The van's amber lamps: the rear one under the tail light, the mirror's repeater, the front corner. */
function vanLamps(vx, vy, on) {
  const A = RAMP.amber, lit = on ? A[2] : A[0], mid = on ? A[1] : A[0];
  // Off, they're dull amber; on, bright with a white-hot corner.
  rect(vx, vy - 30, 3, 5, mid);
  rect(vx, vy - 30, 1, 5, lit);
  rect(vx + 107, vy - 32, 7, 2, mid);
  rect(vx + 107, vy - 32, 3, 1, lit);
  rect(vx + 130, vy - 18, 6, 2, mid);
  rect(vx + 130, vy - 18, 6, 1, lit);
  if (on) {
    rect(vx + 130, vy - 18, 2, 1, C.white);
    rect(vx + 107, vy - 32, 1, 1, C.white);
    rect(vx, vy - 30, 1, 1, C.white);
  }
}

// ---- The trailer ----
// An enclosed cargo trailer in 5026 red: a box with its roof's top face, a V-nose toward the van, one axle under a
// fender, the team's name, number and panther badge on the side, marker lights, the rear door's hinges.
const TR = { len: SIDE.trailer.len, box: 56, top: -58, bottom: -14, axle: 30, wr: 8 };
let trailerLayer = null;
const TBOX = { x: -2, y: TR.top - 20, w: TR.len + 4, h: -TR.top + 22 };
// The panther in its hexagon, like the badge on the team's merch and the trailer's nose in the cabin view: a white rim,
// the badge's near-black inside, the panther's head in white, facing left with its mouth open.
const HEX = [
  '.....www.....',
  '...wwkkkww...',
  '.wwkkkkkkkww.',
  'wkkkkkkkWkkkw',
  'wkkkkkWWWkkkw',
  'wkkkWWWWWWkkw',
  'wkkWWkWWWWWkw',
  'wkWWWWWWWWWkw',
  'wkWkkWWWWWWkw',
  'wkkWkWWWWWkkw',
  'wkkkWWWWWkkkw',
  '.wwkkWWWkkww.',
  '...wwkkkww...',
  '.....www.....',
];
function makeTrailer() {
  const b = buffer(TBOX.x, TBOX.y, TBOX.w, TBOX.h);
  const R = RAMP.trailer, T = RAMP.trim;
  const D = 18, nose = TR.len - TR.box; // depth of the top face, length of the V-nose
  // The roof's top face, then the V-nose's top narrowing to its point.
  for (let y = TR.top - D; y < TR.top; y++) b.row(y, 0, TR.box, R[2]);
  b.row(TR.top - D, 0, TR.box, C.red3);
  for (let x = TR.box; x < TR.len; x++) {
    const k = (x - TR.box + 1) / nose;
    for (let y = Math.round(TR.top - D + (D / 2) * k); y < Math.round(TR.top - (D / 2) * k); y++) b.put(x, y, R[2]);
  }
  // The side, toward you.
  b.box(0, TR.top, TR.box, TR.bottom - TR.top, R[1]);
  b.row(TR.top, 0, TR.box, R[2]);
  // The V-nose's near face, angled away from the light, climbing as it goes back toward the middle.
  for (let x = TR.box; x < TR.len; x++) {
    const k = Math.round(((x - TR.box + 1) * (D / 2)) / nose);
    for (let y = TR.top - k; y < TR.bottom - k; y++) b.put(x, y, R[0]);
    b.put(x, TR.top - k, R[1]);
    // A stone guard of diamond plate along its foot.
    for (let y = TR.bottom - k - 7; y < TR.bottom - k; y++) b.put(x, y, (x + y) % 3 ? C.steel2 : C.steel3);
  }
  // Aluminium corners, the bottom trim, the frame rail under it all.
  for (let y = TR.top; y < TR.bottom; y++) {
    b.put(0, y, C.steel3);
    b.put(1, y, C.steel2);
    b.put(TR.box - 1, y, C.steel3);
  }
  b.row(TR.bottom - 2, 0, TR.box, C.steel3);
  b.row(TR.bottom - 1, 0, TR.box, C.steel2);
  b.row(TR.bottom, 2, TR.len - 4, T[0]);
  b.row(TR.bottom + 1, 2, TR.len - 4, T[0]);
  // Rivets along the top and the foot of the side, every four pixels.
  for (let x = 7; x < TR.box - 3; x += 4) {
    b.put(x, TR.top + 1, R[0]);
    b.put(x, TR.bottom - 4, R[0]);
  }
  // The rear door's hinge line and its three hinges.
  for (let y = TR.top + 2; y < TR.bottom - 2; y++) b.put(4, y, R[0]);
  for (const hy of [TR.top + 5, -36, TR.bottom - 8]) b.box(2, hy, 3, 3, T[2]);
  // The badge, the number, the name.
  b.grid(22, TR.top + 1, HEX, { w: C.white, W: C.white, k: BADGE_INK });
  // The number plain white at twice the size, as the intro's title has it: a shadow offset by less than one of its
  // two-pixel strokes would chip them.
  b.text('5026', 6, TR.top + 15, { scale: 2, color: C.white });
  b.text('IRON PANTHERS', 3, TR.top + 31, { font: 3, color: C.white });
  // The wheel well cut into the box's foot, and the diamond-plate fender over it, outlined.
  const ax = TR.axle;
  for (const [y, a, c] of diskRows(ax, -TR.wr, TR.wr + 3)) if (y < TR.bottom + 2) b.row(y, a, c, WELL);
  b.box(ax - 13, -21, 26, 5, C.ink);
  b.row(-20, ax - 12, ax + 12, C.white);
  b.row(-19, ax - 12, ax + 12, C.steel2);
  b.row(-18, ax - 12, ax + 12, C.steel1);
  for (let x = ax - 11; x < ax + 11; x += 3) b.put(x, -19, C.steel3);
  // Marker lights: amber at the front, red at the back, one amber low on the side.
  b.box(TR.box - 5, TR.top + 2, 2, 2, RAMP.amber[1]);
  b.put(TR.box - 5, TR.top + 2, RAMP.amber[2]);
  b.box(6, TR.top + 2, 2, 2, RAMP.tail[1]);
  b.put(6, TR.top + 2, RAMP.tail[2]);
  b.box(TR.box - 8, TR.bottom - 5, 2, 2, RAMP.amber[1]);
  b.outline(C.ink);
  return b.layer();
}
/** The tongue from the trailer's nose to the van's hitch: an A-frame bar, the jack, the coupler on the ball, chains. */
function hitch(tx, ty, vx, vy) {
  const T = RAMP.trim, nose = tx + TR.len;
  // The receiver, out of the van's back under the bumper, and the ball on it.
  rect(vx - 7, vy - 22, 8, 5, C.ink);
  rect(vx - 6, vy - 21, 7, 3, T[1]);
  rect(vx - 6, vy - 21, 7, 1, T[2]);
  // The tongue: low at the trailer's frame, rising to the coupler on the van's centreline.
  for (let x = nose - 6; x < vx - 6; x++) {
    const y = ty - 14 - Math.round(((x - nose + 6) * 9) / (vx - nose));
    rect(x, y - 1, 1, 5, C.ink);
    rect(x, y, 1, 3, T[1]);
    rect(x, y, 1, 1, T[2]);
  }
  rect(vx - 12, vy - 27, 9, 6, C.ink);
  rect(vx - 11, vy - 26, 7, 4, T[1]);
  rect(vx - 11, vy - 26, 7, 1, T[2]);
  // The jack, cranked up, just ahead of the nose.
  rect(nose + 2, ty - 30, 4, 18, C.ink);
  rect(nose + 3, ty - 29, 2, 16, C.steel2);
  rect(nose + 3, ty - 29, 1, 16, C.steel3);
  rect(nose + 1, ty - 32, 6, 3, C.ink);
  rect(nose + 2, ty - 31, 4, 1, C.steel1);
  // Safety chains sagging from the coupler.
  for (const [dx, dy] of [[-10, -19], [-9, -18], [-7, -17], [-5, -17], [-3, -18]]) rect(vx + dx, vy + dy, 1, 1, C.ink);
}

// ---- The overtaking car ----
// A blue sedan in the passing lane, seen like the van from the side and a little above: the top faces of its trunk,
// roof and hood, the raked rear window and windshield between them, the side windows, its wheels on the lane's near
// edge. A sedan stands a good deal lower than a high-roof van: its roof's top face stays under the top face of the
// van's while it passes behind (their far edges meet on the same row), so it reads as a car going by behind, not a roof
// box on the van, and then shows whole as it pulls ahead. Its top faces are shaded like any box's: the far rows a step
// darker, the near rows in the paint's light tone, a highlight along the near edge where the roof turns down.
const CAR = { len: 110, wr: 8, axles: [22, 90] };
let carLayer = null;
const CBOX = { x: -2, y: -56, w: CAR.len + 4, h: 58 };
function makeCar() {
  const b = buffer(CBOX.x, CBOX.y, CBOX.w, CBOX.h);
  const K = [C.blue0, C.blue1, C.blue2], D = 10, T = RAMP.trim, GL = C.night1;
  const roof = -28, belt = -21, deck = -22;
  // The near outline of the top, back to front: the trunk lid, the rear window, the roof, the windshield, the hood.
  const top = (x) => (x < 22 ? deck
    : x < 38 ? deck - Math.round(((x - 22) * (deck - roof)) / 16)
    : x < 70 ? roof
    : x < 90 ? roof + Math.round(((x - 70) * (belt - roof)) / 20)
    : belt + Math.round(((x - 90) * 4) / 19));
  // Top faces (the near top edge, D rows deep): body paint on the trunk, roof and hood, dark glass on the windows. The
  // paint: the far rows in the mid tone, a blue0 seam, the near six rows lit, the near edge's highlight.
  for (let x = 0; x < 109; x++) {
    const glass = (x >= 22 && x < 38) || (x >= 70 && x < 90);
    for (let y = top(x) - D; y < top(x); y++) {
      const near = top(x) - y;
      b.put(x, y, glass ? GL : near === 1 ? C.blue3 : near <= 6 ? K[2] : near === 7 ? K[0] : K[1]);
    }
  }
  // The glass gets a glint: a stepped streak down the windshield, a shorter one up the rear window.
  for (let k = 0; k < 5; k++) b.box(76 + k * 2, top(76) - D + 1 + k * 2, 2, 1, C.blue3);
  for (let k = 0; k < 4; k++) b.box(26 + k * 2, top(26) - 3 - k * 2, 2, 1, C.blue3);
  // The side: the greenhouse between the pillars, then the body below the beltline.
  for (let x = 0; x < 109; x++) for (let y = top(x); y <= -6; y++) b.put(x, y, K[1]);
  for (let y = roof + 2; y < belt - 1; y++) {
    const x0 = 22 + Math.round(((deck - y) * 16) / (deck - roof)) + 3, x1 = 70 + Math.round(((y - roof) * 20) / (belt - roof)) - 2;
    b.row(y, x0, x1, GL);
    b.put(54, y, K[1]);
    b.put(55, y, K[0]);
  }
  for (let k = 0; k < 2; k++) b.box(44 + k, belt - 3 - k * 2, 1, 2, C.blue3);
  for (let x = 1; x < 108; x++) b.put(x, belt, K[2]);
  for (let x = 1; x < 108; x++) b.put(x, belt + 1, C.blue3);
  for (let y = -13; y <= -6; y++) b.row(y, 0, 109, K[0]);
  b.row(-14, 0, 109, K[1]);
  // Door seams and handles.
  for (let y = belt + 2; y < -8; y++) { b.put(38, y, K[0]); b.put(71, y, K[0]); }
  b.row(belt + 4, 42, 46, T[0]);
  b.row(belt + 4, 75, 79, T[0]);
  // Bumpers in trim, tail light at the back, headlight at the front.
  b.box(-1, -15, 5, 8, T[1]);
  b.row(-15, -1, 4, T[2]);
  b.box(105, -14, 6, 7, T[1]);
  b.row(-14, 105, 111, T[2]);
  b.box(0, deck + 2, 3, 4, RAMP.tail[1]);
  b.put(0, deck + 2, RAMP.tail[2]);
  b.box(103, top(103), 6, 3, RAMP.lamp[1]);
  b.row(top(103), 103, 109, C.white);
  // Wheel arches, tucked in close round the wheels under the low beltline.
  for (const ax of CAR.axles) {
    for (const [y, a, c] of diskRows(ax, -CAR.wr, CAR.wr + 2)) if (y < -5) b.row(y, a, c, C.ink);
    for (const [y, a, c] of diskRows(ax, -CAR.wr, CAR.wr + 1)) if (y < -5) b.row(y, a, c, WELL);
  }
  b.outline(C.ink);
  return b.layer();
}

// ---- The whole screen ----
/**
 * One full screen of the side view at time t (seconds).
 * opts.signs  [{ kind: 'city' | 'exit', at }]: at is when the sign's post passes the screen's middle (x 128); the exit
 *             sign has two, and it's the point halfway between them
 * opts.car    when the overtaking car's middle passes the van's middle (x 170), or null for no car
 * opts.lane   pixels the van and trailer have drifted toward you, 0-4
 * opts.blink  'right' blinks the van's near-side amber lamps
 * opts.inside (g, vx, vy): draws the people in the near windows; vx, vy are the van's back end and the road under its
 *             near wheels on screen, with the drift and the bounce
 * opts.lift   pixels the camera has dropped, for a shot that has the dialog box over the bottom of the screen: the
 *             ground and everything on it (the van, the trailer, the people, the signs, the car) come up this many
 *             pixels, the ridge half as many and the hills a quarter, and the sky stays put, as the far things would
 *             with a lower camera; the near verge's grass carries on below the ground strip
 */
export function drawOutside(g, t, opts = {}) {
  const prev = useContext(g);
  const saved = { ...cam };
  screen();
  skyLayer ??= makeSky();
  hillLayer ??= makeHills();
  ridgeLayer ??= makeRidge();
  groundLayer ??= makeGround();
  vanLayers ??= makeVan();
  trailerLayer ??= makeTrailer();
  carLayer ??= makeCar();

  const road = Math.floor(t * ROAD.speed), lift = Math.round(opts.lift ?? 0);
  blit(skyLayer, 0, 0);
  twinkles(t);
  tile(hillLayer, Math.floor(t * SPEED.hills), 22 - Math.round(lift / 4));
  tile(ridgeLayer, Math.floor(t * SPEED.ridge), 34 - Math.round(lift / 2));
  tile(groundLayer, road, STRIP.y - lift);
  if (lift) verge(road, 144 - lift, lift);

  // Signs move with the ground, so their posts step with the road's pixels.
  const signs = (opts.signs ?? []).map((s) => ({ ...s, x: 128 - (road - Math.floor(s.at * ROAD.speed)) })).filter((s) => s.x > -60 && s.x < 316);
  for (const s of signs) if (s.kind === 'city') sign('city', s.x, GROUND.bank + 4 - lift);

  // The overtaking car, in the passing lane behind the van.
  if (opts.car != null) {
    const mid = VAN_MID + Math.round((t - opts.car) * SPEED.car), x = mid - CAR.len / 2, y = GROUND.dashes - 2 - lift;
    if (x < 260 && x + CAR.len > -4) {
      fill(x + 2, y - 6, CAR.len - 2, 7, SHADOW);
      blit(carLayer, x + CBOX.x, y + CBOX.y);
      const spin = (t * (ROAD.speed + SPEED.car)) / CAR.wr;
      for (const ax of CAR.axles) wheel(x + ax, y - CAR.wr, CAR.wr, spin);
    }
  }

  // The van and the trailer: the drift toward you moves everything; the springs move the bodies, not the wheels.
  const d = Math.round(opts.lane ?? 0);
  const vx = SIDE.vx, road0 = SIDE.vy + d - lift, vy = road0 + bounce(t);
  const tx = SIDE.trailer.x, ty = road0 + trailerBounce(t);
  const spin = (t * ROAD.speed) / WR;
  // Shadows on the road under both.
  fill(tx + 2, road0 - 6, TR.len - 4, 7, SHADOW);
  fill(vx + 2, road0 - 6, SIDE.len - 2, 7, SHADOW);
  fill(vx + SIDE.len, road0 - 2, 6, 3, SHADOW);
  // The trailer, its tongue, its wheel.
  blit(trailerLayer, tx + TBOX.x, ty + TBOX.y);
  hitch(tx, ty, vx, vy);
  wheel(tx + TR.axle, road0 - TR.wr, TR.wr, (t * ROAD.speed) / TR.wr);
  // The van: cabin, people, body, glass, lamps, wheels.
  blit(vanLayers.cabin, vx + VBOX.x, vy + VBOX.y);
  if (opts.inside) {
    g.save();
    g.beginPath();
    for (let y = WIN; y < SILL; y++) for (const [a, c] of openings(y)) g.rect(vx + a, vy + y, c - a, 1);
    g.clip();
    opts.inside(g, vx, vy);
    g.restore();
  }
  blit(vanLayers.body, vx + VBOX.x, vy + VBOX.y);
  blit(vanLayers.glass, vx + VBOX.x, vy + VBOX.y);
  vanLamps(vx, vy, opts.blink === 'right' && blinkOn(t));
  for (const ax of AXLES) wheel(vx + ax, road0 - WR, WR, spin);

  // The exit sign stands on the near shoulder: its posts pass in front of the van.
  for (const s of signs) if (s.kind === 'exit') sign('exit', s.x, GROUND.verge - 1 - lift);

  Object.assign(cam, saved);
  useContext(prev);
}
