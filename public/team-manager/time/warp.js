// The looks of moving through time, as passes over a finished frame of the big screen (256x144 RGBA pixels, as
// getImageData gives them). Each reads one or two frames and writes another; lab.js puts them together.
//
//   still(src, dst, k, mask)      the world drained to the cold blue of stopped time, k from 0 (none) to 1 (all), in
//                                 four hard steps like the fades; pixels set in mask (her) keep their colour
//   maskOf(a, b, mask)            which pixels differ between two renders of one moment, with her and without her:
//                                 her. Returns her middle, { x, y }, or null if she's out of shot
//   swirl(src, dst, o)            the vortex: the picture twisted round (cx, cy), most at the middle. angle is the twist
//                                 there in radians (plus is clockwise on the screen: forward in time; minus, rewind),
//                                 pull draws the picture in towards the middle, core is the radius of the light at the
//                                 middle, t (seconds) turns the rings
//   tape(src, dst, o)             a tape running fast: bands of torn rows rolling down, the colours split, a jolt now
//                                 and then; amt from 0 to 1, t seconds
//   overlay(dst, top, mask, a)    top's pixels where mask is set, over dst (a of the way, 1 if not given): her,
//                                 kept out of the swirl
//   blend(dst, prev, a)           a of the frame before left behind, for trails

import { W, H, C, rnd } from '../pixel.js';

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
/** Stopped time: dark to light in the night colours, a little purple in the middle. */
const STILL = ['#05060d', C.night0, C.night1, C.night2, C.night3, '#4a5fc0', C.starDim, C.blue3, '#eef4ff'].map(rgb);
const CORE = rgb(C.white), RIM = rgb(C.yel2), EDGE = rgb(C.blue3);

export const stepped4 = (k) => Math.round(Math.min(1, Math.max(0, k)) * 4) / 4;

export function still(src, dst, k, mask = null) {
  const a = stepped4(k), n = STILL.length;
  for (let p = 0, q = 0; p < W * H; p++, q += 4) {
    const r = src[q], g = src[q + 1], b = src[q + 2];
    if (a === 0 || (mask && mask[p])) {
      dst[q] = r; dst[q + 1] = g; dst[q + 2] = b; dst[q + 3] = 255;
      continue;
    }
    const lum = (0.3 * r + 0.59 * g + 0.11 * b) / 256;
    const c = STILL[Math.min(n - 1, Math.floor(Math.min(0.999, lum * 1.15) * n))];
    dst[q] = r + (c[0] - r) * a; dst[q + 1] = g + (c[1] - g) * a; dst[q + 2] = b + (c[2] - b) * a; dst[q + 3] = 255;
  }
}

export function maskOf(a, b, mask) {
  let n = 0, sx = 0, sy = 0;
  for (let p = 0, q = 0; p < W * H; p++, q += 4) {
    const on = a[q] !== b[q] || a[q + 1] !== b[q + 1] || a[q + 2] !== b[q + 2];
    mask[p] = on ? 1 : 0;
    if (on) { n++; sx += p % W; sy += Math.floor(p / W); }
  }
  return n > 30 ? { x: sx / n, y: sy / n } : null;
}

export function swirl(src, dst, { cx = W / 2, cy = H / 2, angle = 0, pull = 0, core = 0, t = 0 } = {}) {
  const R = 190, dir = Math.sign(angle) || 1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const q = (y * W + x) * 4, dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
      if (r < core) {
        const c = r > core - 2 ? RIM : r > core - 5 ? EDGE : CORE;
        dst[q] = c[0]; dst[q + 1] = c[1]; dst[q + 2] = c[2]; dst[q + 3] = 255;
        continue;
      }
      const f = r < R ? 1 - r / R : 0, f2 = f * f;
      const th = Math.atan2(dy, dx) - angle * f2 * f;
      const rr = r * (1 + pull * f2);
      let sx = Math.round(cx + Math.cos(th) * rr), sy = Math.round(cy + Math.sin(th) * rr);
      // Off the edge, the picture folds back on itself, so the swirl never drags in black.
      sx = sx < 0 ? -sx : sx >= W ? 2 * W - 2 - sx : sx;
      sy = sy < 0 ? -sy : sy >= H ? 2 * H - 2 - sy : sy;
      sx = Math.min(W - 1, Math.max(0, sx)); sy = Math.min(H - 1, Math.max(0, sy));
      const s = (sy * W + sx) * 4;
      // Rings that run in towards the middle as it turns: every other one a step darker, the nearer the middle the more.
      const ring = Math.floor((r + dir * t * 40) / 6) & 1;
      const shade = ring ? 1 - 0.35 * Math.min(1, Math.abs(angle) / 8) * f : 1;
      // Near the light at the middle, everything burns white.
      const burn = core > 0 ? Math.max(0, 1 - (r - core) / 22) : 0;
      dst[q] = src[s] * shade + (255 - src[s] * shade) * burn;
      dst[q + 1] = src[s + 1] * shade + (255 - src[s + 1] * shade) * burn;
      dst[q + 2] = src[s + 2] * shade + (255 - src[s + 2] * shade) * burn;
      dst[q + 3] = 255;
    }
  }
}

export function tape(src, dst, { amt = 1, t = 0 } = {}) {
  const frame = Math.floor(t * 30);
  const jolt = rnd(frame * 3.1) > 0.8 ? 1 : 0;
  const shift = new Int8Array(H), torn = new Uint8Array(H);
  for (let b = 0; b < 3; b++) {
    const h = 3 + Math.floor(rnd(b * 7.7) * 7);
    const top = Math.floor(((t * (70 + b * 35) + b * 61) % (H + 30)) - 15);
    for (let y = Math.max(0, top); y < Math.min(H, top + h); y++) {
      torn[y] = 1;
      shift[y] = Math.round((rnd(y * 13.3 + frame) * 2 - 1) * 9 * amt);
    }
  }
  const split = amt > 0.25 ? 1 : 0;
  for (let y = 0; y < H; y++) {
    const sy = Math.max(0, y - jolt);
    for (let x = 0; x < W; x++) {
      const q = (y * W + x) * 4;
      const at = (dx) => (sy * W + Math.min(W - 1, Math.max(0, x - shift[y] + dx))) * 4;
      let r = src[at(split)], g = src[at(0) + 1], b = src[at(-split) + 2];
      if (torn[y]) {
        if (rnd(x * 1.7 + y * 31.9 + frame) < 0.1 * amt) r = g = b = 235;
        else { r += (255 - r) * 0.3 * amt; g += (255 - g) * 0.3 * amt; b += (255 - b) * 0.3 * amt; }
      }
      dst[q] = r; dst[q + 1] = g; dst[q + 2] = b; dst[q + 3] = 255;
    }
  }
}

export function overlay(dst, top, mask, a = 1) {
  if (a <= 0) return;
  for (let p = 0, q = 0; p < W * H; p++, q += 4) {
    if (!mask[p]) continue;
    dst[q] += (top[q] - dst[q]) * a; dst[q + 1] += (top[q + 1] - dst[q + 1]) * a; dst[q + 2] += (top[q + 2] - dst[q + 2]) * a;
  }
}

export function blend(dst, prev, a) {
  for (let q = 0; q < W * H * 4; q += 4) {
    dst[q] += (prev[q] - dst[q]) * a;
    dst[q + 1] += (prev[q + 1] - dst[q + 1]) * a;
    dst[q + 2] += (prev[q + 2] - dst[q + 2]) * a;
  }
}
