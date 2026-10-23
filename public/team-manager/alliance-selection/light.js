// The arena's lights for alliance selection: the house lights down and spotlights on the people that matter, the way
// the cut scene is lit. With the house down the whole picture sinks into the palette's navy, so the stands, the field's
// elements and everyone waiting in front of it fall back into the dark and only whoever stands in a spotlight keeps
// their colour: an alliance at its sign, Robin under her follow spot, the captain at the mic. That's what keeps the
// picture from being a crowd of a dozen team colours at once: each shot shows a few people in light with dark between.
//
// A spotlight is a lamp high in the roof aimed at a point on the floor. It lights a pool on the floor round that point
// (an oval, the floor receding), with an edge one step of half light wide, never a smooth fade (the hall dims the same
// way, worlds/hall.js, in hard steps); everyone whose feet are in the pool, in full; and above them a faint shaft of
// haze up to the top of the picture, narrowing toward the lamp. It lights only them, not the cargo ship or the stands
// behind: the people in the light are drawn again on their own, and wherever that matches the picture pixel for pixel
// (wherever they're not hidden behind something) they're put back in full colour over the dark. A numbered sign whose
// pool is lit is lit with it.
// In the stands, with the house down, phones come out: single pixels of white and pale yellow that come and go.
//
//   light(g, view, t, rig, people)   over a 1x view of the world already drawn into g (screen space, W x H)
//   rig: { dark, spots, phones, glows }
//     dark    0 (house lights up, as walking about: nothing is drawn) to 1 (house lights down), in four hard steps
//     spots   [{ x, y, r, a, haze }]: the floor point (world) a lamp is aimed at, the pool's half-width there, how
//             strong it is, 0 (off) to 1 (full), in four hard steps; haze: false for no shaft above it
//     phones  0 to 1: how many phones are up in the stands (all of them if not given), as the dark allows
//     glows   [{ x0, y0, x1, y1 }]: things that give off their own light (world), never covered by the dark: the
//             audience display's face
//   people  everyone in the picture as the cut scene draws them: { x, y, dir, gait, dist, look, skater }, or anything
//           else that's lit with whoever stands where it is, as { x, y, draw(g, view) } (what they hold, say)
//
// The rig's spotlights, for the cut scene and walking about alike:
//   pool(i, a), pools(a)   alliance i's spotlight (all eight; a can be a function of i)
//   micSpot(a)             the mic's: whoever is at it, and Robin at her spot beside it
//   followSpot(p, a, r)    a follow spot on someone, a small pool on their feet
//   house(spots, dark)     a rig: the house lights down (dark 1 unless given), these spotlights on, the display lit
//   AFTER                  how far down the house lights stay once selection is over (half), and afterLights(her, mc),
//                          the rig walking about has: every alliance in its pool, the mic's, and follow spots on Robin
//                          and her

import { W, H, C, rnd, stepped } from '../pixel.js';
import { drawWithShadow } from '../stage.js';
import { drawSkater } from './mc.js';
import { drawSign, BOARD_FACE } from './set.js';
import { WORLD, SPOTS, capSpot, signY, MIC } from './layout.js';

/** How dark the house gets: the share of navy laid over everything out of the light. */
const DEPTH = 0.74;
/** The dark's colour: the palette's deepest navy, so the arena reads as night, not as a grey veil. */
const DARK = C.night0;
/** The rows of a pool's oval for each pixel of its half-width: the floor recedes (20 degrees down). */
const FLAT = 0.32;
/** How far in front of or behind a pool's middle someone's feet can be and still be in it, past its oval. */
const IN_DEEP = 6;
/** The shaft of haze: its colour, how strong, its half-width at the top of the picture as a share of the pool's. */
const HAZE = '#cfe0ff', HAZE_A = 0.07, SHAFT_TOP = 0.3;

const canvases = {};
/** A W x H canvas of our own, made once: the dark, and the people in the light drawn on their own. */
function canvasFor(k) {
  if (!canvases[k]) {
    canvases[k] = Object.assign(document.createElement('canvas'), { width: W, height: H });
    canvases[k].getContext('2d', { willReadFrequently: true }).imageSmoothingEnabled = false;
  }
  return canvases[k];
}

/** Fill rows y0 to y1 (screen, whole pixels) at half-width hw(y) round x, with the current fill and alpha. */
function rows(g, x, y0, y1, hw) {
  const a = Math.max(0, Math.floor(y0)), b = Math.min(H, Math.ceil(y1));
  for (let y = a; y < b; y++) {
    const w = Math.round(hw(y));
    if (w > 0) g.fillRect(Math.round(x) - w, y, w * 2, 1);
  }
}
/** A pool's oval on the floor round (x, y) on the screen, half-width r. */
const oval = (g, x, y, r) => {
  const ry = r * FLAT;
  rows(g, x, y - ry, y + ry + 1, (sy) => r * Math.sqrt(Math.max(0, 1 - ((sy - y) / ry) ** 2)));
};
/** The shaft above a pool: from the top of the picture down to the pool, widening from SHAFT_TOP of r to all of it. */
const shaft = (g, x, y, r) => rows(g, x, 0, y, (sy) => r * (SHAFT_TOP + (1 - SHAFT_TOP) * (sy / Math.max(1, y))));

/** How strongly someone with their feet at (x, y) is lit: the strongest pool they stand in. */
function litBy(spots, x, y) {
  let a = 0;
  for (const s of spots) {
    if (Math.abs(x - s.x) <= s.r + 2 && Math.abs(y - s.y) <= s.r * FLAT + IN_DEEP) a = Math.max(a, stepped(s.a ?? 1));
  }
  return a;
}

// ---- The rig ----
/**
 * Each alliance's spotlight: a pool round its captain's feet, wide enough for the three of them and its sign, its
 * middle a little behind the captain, between them and the picks.
 */
const POOL_R = 17;
export const pool = (i, a = 1) => ({ x: SPOTS[i], y: capSpot(i).y - 3, r: POOL_R, a });
export const pools = (a = 1) => SPOTS.map((_, i) => pool(i, typeof a === 'function' ? a(i) : a));
/** The mic's spotlight: whoever is at the mic and Robin at her spot beside it. */
export const micSpot = (a = 1) => ({ x: MIC.x + 4, y: MIC.y - 1, r: 19, a });
/** A follow spot on someone: a small pool on their feet. */
export const followSpot = (p, a = 1, r = 10) => ({ x: p.x, y: p.y, r, a });
/** The house lights down (dark), with these spotlights on; the display lit, as it always is. */
export const house = (spots, dark = 1) => ({ dark, spots, glows: [BOARD_FACE] });
/**
 * Once selection is over the house lights come halfway up, no further: the stands and the floor are there to walk
 * about in, and the alliances still stand in their pools, the eight of them apart in the half dark.
 */
export const AFTER = 0.5;
export const afterLights = (her, mc) => house([...pools(), micSpot(), followSpot(mc), followSpot(her, 1, 12)], AFTER);

/** The stands' phones: single pixels in the seats' rows that come and go, the same ones every time. */
const PHONES = Array.from({ length: 72 }, (_, i) => ({
  x: Math.floor(rnd(i + 31000) * WORLD.w),
  y: 4 + Math.floor(rnd(i + 31100) * 46),
  c: rnd(i + 31200) < 0.7 ? C.white : C.yel2,
  on: rnd(i + 31300),
  rate: 0.4 + rnd(i + 31400) * 0.9,
}));

/** The arena's lights over a 1x view of it already in g: see the top of the file. */
export function light(g, view, t, rig, people = []) {
  const dark = stepped(rig?.dark ?? 0);
  if (dark <= 0) return;
  const spots = (rig.spots ?? []).filter((s) => stepped(s.a ?? 1) > 0);

  // Who's in the light, drawn on their own, back to front: people and the signs their pools are on.
  const lit = [];
  for (const p of people) {
    const a = litBy(spots, p.x, p.y);
    if (a > 0) lit.push({ y: p.y, a, draw: (lg) => (p.draw ? p.draw(lg, view) : p.skater ? drawSkater(lg, view, p) : drawWithShadow(lg, view, p)) });
  }
  SPOTS.forEach((x, i) => {
    const a = litBy(spots, x, capSpot(i).y - 3);
    if (a > 0) lit.push({ y: signY(i) - 0.25, a, draw: (lg) => drawSign(lg, view, i) });
  });
  let before = null, only = null, alpha = null;
  if (lit.length) {
    before = g.getImageData(0, 0, W, H);
    const og = canvasFor('lit').getContext('2d', { willReadFrequently: true });
    lit.sort((u, v) => u.y - v.y);
    // How strongly each pixel is lit, when the pools aren't all at one strength (one coming up, say): each strength's
    // people drawn on their own, the stronger over the weaker where they overlap.
    const levels = [...new Set(lit.map((p) => p.a))].sort((u, v) => u - v);
    alpha = new Float32Array(W * H).fill(levels[0]);
    for (const a of levels.slice(1)) {
      og.clearRect(0, 0, W, H);
      for (const p of lit) if (p.a === a) p.draw(og);
      const d = og.getImageData(0, 0, W, H).data;
      for (let i = 0; i < W * H; i++) if (d[i * 4 + 3] === 255) alpha[i] = a;
    }
    // Everyone in the light together, so where two of them overlap it's whoever is in front.
    og.clearRect(0, 0, W, H);
    for (const p of lit) p.draw(og);
    only = og.getImageData(0, 0, W, H).data;
  }

  // The dark, with the pools cut out of it: the oval half lit a step wider, then lit in full.
  const sc = canvasFor('dark'), sg = sc.getContext('2d');
  sg.globalCompositeOperation = 'source-over';
  sg.globalAlpha = 1;
  sg.fillStyle = DARK;
  sg.fillRect(0, 0, W, H);
  sg.globalCompositeOperation = 'destination-out';
  sg.fillStyle = '#000';
  for (const s of spots) {
    const a = stepped(s.a ?? 1), x = s.x - view.x, y = s.y - view.y;
    sg.globalAlpha = a * 0.5;
    oval(sg, x, y, s.r + 8);
    sg.globalAlpha = a;
    oval(sg, x, y, s.r + 4);
  }
  sg.globalAlpha = 1;
  for (const r of rig.glows ?? []) sg.fillRect(r.x0 - view.x, r.y0 - view.y, r.x1 - r.x0, r.y1 - r.y0);
  sg.globalCompositeOperation = 'source-over';
  const prev = g.globalAlpha;
  g.globalAlpha = dark * DEPTH;
  g.drawImage(sc, 0, 0);
  g.globalAlpha = prev;

  // Whoever is in the light, back in their own colours wherever nothing stands in front of them.
  if (lit.length) {
    const after = g.getImageData(0, 0, W, H), out = after.data, src = before.data;
    for (let i = 0; i < W * H; i++) {
      const a = alpha[i];
      if (!a) continue;
      const k = i * 4;
      if (only[k + 3] !== 255 || only[k] !== src[k] || only[k + 1] !== src[k + 1] || only[k + 2] !== src[k + 2]) continue;
      const m = a * dark >= dark ? 1 : a;
      out[k] += (src[k] - out[k]) * m;
      out[k + 1] += (src[k + 1] - out[k + 1]) * m;
      out[k + 2] += (src[k + 2] - out[k + 2]) * m;
    }
    g.putImageData(after, 0, 0);
  }

  // The shafts of haze, over everything: the air in the beam.
  g.fillStyle = HAZE;
  for (const s of spots) {
    if (s.haze === false) continue;
    const a = stepped(s.a ?? 1), x = s.x - view.x, y = s.y - view.y;
    g.globalAlpha = prev * HAZE_A * a * dark * 0.5;
    shaft(g, x, y, s.r + 3);
    g.globalAlpha = prev * HAZE_A * a * dark;
    shaft(g, x, y, s.r);
  }
  g.globalAlpha = prev;

  // The phones in the stands, over the dark: more of them the darker it is.
  const phones = (rig.phones ?? 1) * dark;
  for (const p of PHONES) {
    if (p.on > phones || Math.sin(t * p.rate + p.on * 40) < -0.2) continue;
    const x = p.x - view.x, y = p.y - view.y;
    if (x < 0 || x >= W || y < 0 || y >= H) continue;
    g.fillStyle = p.c;
    g.fillRect(x, y, 1, 1);
  }
}
