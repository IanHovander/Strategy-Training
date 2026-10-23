// The handoff insert: Norbert passed from the co-captain's hands to hers, close, at twice the size. It's the cut scene's
// one shot that isn't the arena: a cutaway to the hands, the crowd behind them out of focus, as a film cuts in on the
// thing that matters. Norbert is the full sprite (norbert.js drawNorbertBig, 36x44) in the co-captain's hands on the
// left; the co-captain's red sleeves bring him across, her bare arms come in from the right to take him, the co-captain
// lets go and draws back, and once he's settled in her hands his 26 ear glints, once: a flash up to white and back,
// with a four-point twinkle beside it. That glint is the first time the player sees him do anything.
//
// Like the cut scene's close-ups, it's drawn at 1x into a 128x72 canvas of its own (the arms and hands by hand, in
// filled rectangles outlined in ink and lit from the upper left, in each of their palettes) and copied up to the screen
// at exactly 2x, crisp. Everything is a pure function of time.
//
//   drawHandoff(g, t)    the insert, t seconds in, over the whole screen (the film bars go on top)
//   HANDOFF              when the pass ends and the glint peaks, for the cut scene's timing

import { W, H, C, useContext, screen, rect, lerp, seg, easeInOut, rnd } from '../pixel.js';
import { drawNorbertBig, BIG_W } from '../norbert.js';
import { HERO_LOOK } from '../walker.js';
import { COCAPTAIN_LOOK } from './cocaptain.js';

/** Seconds into the insert: he sets off, he's in her hands, the co-captain's are gone, the glint. */
export const HANDOFF = { go: 0.3, there: 1.05, gone: 1.55, glint: [1.3, 1.75] };

const LW = W / 2, LH = H / 2;
let lens = null;
const lensCanvas = () => (lens ??= Object.assign(document.createElement('canvas'), { width: LW, height: LH }));

/** Where he is, his top left at 1x in the insert's own 128x72: left in the co-captain's hands, right in hers. */
const FROM = 14, TO = 66, TOP = 15;
function norbertAt(t) {
  const k = easeInOut(seg(t, HANDOFF.go, HANDOFF.there));
  // A small lift on the way across, and a settle once he's there.
  const lift = Math.round(Math.sin(Math.PI * k) * 3), settle = t > HANDOFF.there && t < HANDOFF.there + 0.12 ? 1 : 0;
  return { x: Math.round(lerp(FROM, TO, k)), y: TOP - lift + settle };
}

/**
 * An arm coming in from the left (side 1) or the right (side -1), its fingertips at x on row y: a sleeve (or a bare
 * forearm) from the edge of the picture, the back of the hand, three fingers curled round onto him and the thumb over
 * the top, all outlined in ink and lit from above. sleeve: a ramp (dark, mid, lit) or null for a bare arm; skin: the
 * hand's ramp. Drawn for the left and mirrored for the right.
 */
function arm(side, x, y, skin, sleeve) {
  const [sd, sm, sl] = skin;
  /** A rectangle dx along from the fingertips (toward the arm is negative), mirrored for the right. */
  const r = (dx, dy, w, h, c) => rect(side > 0 ? x + dx : x - dx - w, y + dy, w, h, c);
  // The arm, from past the edge of the picture to the wrist.
  const len = (side > 0 ? x : LW - x) + 4;
  const [ad, am, al] = sleeve ?? skin;
  r(-len, -1, len - 11, 11, C.ink);
  r(-len, 0, len - 12, 9, am);
  r(-len, 0, len - 12, 2, al);
  r(-len, 7, len - 12, 2, ad);
  if (sleeve) {
    // The cuff, ribbed and a shade darker, where the sleeve ends at the wrist.
    r(-16, -1, 4, 11, C.ink);
    r(-15, 0, 2, 9, ad);
  }
  // The back of the hand.
  r(-13, -2, 12, 14, C.ink);
  r(-12, -1, 10, 12, sm);
  r(-12, -1, 10, 2, sl);
  r(-12, 9, 10, 2, sd);
  // Three fingers curled round onto him, ink between them, their tips rounded.
  r(-3, -1, 4, 12, C.ink);
  for (let i = 0; i < 3; i++) {
    r(-3, i * 4, 3, 3, sm);
    r(-3, i * 4, 3, 1, sl);
    r(0, i * 4 + 1, 1, 1, sm);
  }
  // The thumb over the top, toward him.
  r(-9, -5, 8, 4, C.ink);
  r(-8, -4, 6, 2, sl);
  r(-2, -3, 1, 1, C.ink);
}

/** The arena behind, out of focus: the stands' dark with soft blobs of the crowd's shirts, the floor below. */
function backdrop(t) {
  rect(0, 0, LW, LH, C.stand0);
  rect(0, 40, LW, LH - 40, C.night0);
  const shirts = [C.blue1, C.red1, C.yel0, C.org0, C.steel1, '#2e8b57', '#5b3fa0'];
  for (let i = 0; i < 44; i++) {
    const x = Math.floor(rnd(i * 3.1 + 7) * LW), y = 6 + Math.floor(rnd(i * 5.3 + 2) * 34);
    const c = shirts[i % shirts.length];
    // Each blob breathes a little, as a cheering crowd does out of focus.
    const s = 3 + Math.round(rnd(i + 99) * 2 + Math.sin(t * 3 + i) * 0.6);
    rect(x, y, s, s - 1, C.stand1);
    rect(x + 1, y, s - 2, s - 1, c);
  }
  // A light rail of the far wall, soft.
  rect(0, 40, LW, 1, C.stand2);
}

/** A four-point twinkle, n pixels each way, at (x, y). */
function twinkle(x, y, n, c) {
  rect(x - n, y, 2 * n + 1, 1, c);
  rect(x, y - n, 1, 2 * n + 1, c);
}

export function drawHandoff(g, t) {
  const lc = lensCanvas(), lg = lc.getContext('2d');
  lg.imageSmoothingEnabled = false;
  const prev = useContext(lg);
  screen();
  backdrop(t);

  const n = norbertAt(t);
  const [g0, g1] = HANDOFF.glint;
  const u = seg(t, g0, g1), glow = u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0;
  drawNorbertBig(n.x, n.y, { glow: glow > 0.15 ? glow : 0 });

  // The co-captain's red sleeves and hands, on his left side and under him; they let go and draw back.
  const coSkin = COCAPTAIN_LOOK.pal.skin, coSleeve = COCAPTAIN_LOOK.pal.shirt;
  const back = Math.round(easeInOut(seg(t, HANDOFF.there, HANDOFF.gone)) * 60);
  arm(1, n.x + 6 - back, n.y + 22, coSkin, coSleeve);
  arm(1, n.x + 8 - back, n.y + 34, coSkin, coSleeve);
  // Her bare arms come in from the right and take him by his right side.
  const herSkin = HERO_LOOK.pal.skin;
  const reach = Math.round((1 - easeInOut(seg(t, 0.2, HANDOFF.there - 0.05))) * 70);
  arm(-1, n.x + BIG_W - 6 + reach, n.y + 23, herSkin, null);
  arm(-1, n.x + BIG_W - 8 + reach, n.y + 35, herSkin, null);

  // The glint: a twinkle off the tip of the 26 ear (its top right) at the brightest.
  if (glow > 0.5) twinkle(n.x + 33, n.y + 4, glow > 0.85 ? 3 : 2, C.white);
  if (glow > 0.85) twinkle(n.x + 33, n.y + 4, 1, C.yel2);

  useContext(prev);
  g.imageSmoothingEnabled = false;
  g.drawImage(lc, 0, 0, LW, LH, 0, 0, W, H);
}
