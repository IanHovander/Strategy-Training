// The wind-up key in Norbert's back: a brass butterfly key, drawn pixel by pixel at any angle so it can turn in the
// plane of the screen (counterclockwise winds time back, clockwise winds it on). One wing carries a red dot, so a
// quarter turn reads one way and not the other.
//
//   drawKey(cx, cy, angle, size, px)   its middle at (cx, cy) on the screen, turned by angle (radians, plus is
//                                      clockwise), size from 0 (gone) to 1 (full: 30 of its pixels across), each of
//                                      its pixels px screen pixels square (2 beside Norbert drawn at twice the size)

import { C, fill } from '../pixel.js';

const WING = 8, WING_RX = 5.5, WING_RY = 4.5, HOLE_RX = 1.8, HOLE_RY = 1.4, HUB = 2.6;

/** What's at (u, v) in the key's own frame, wings along u: 0 nothing, 1 brass, 2 the hub, 3 the red dot. */
function part(u, v) {
  if (u * u + v * v <= HUB * HUB) return 2;
  if (Math.abs(u) <= WING && Math.abs(v) <= 1.2) return 1;
  for (const s of [-1, 1]) {
    const a = (u - s * WING) / WING_RX, b = v / WING_RY;
    if (a * a + b * b > 1) continue;
    const h = (u - s * (WING + 1)) / HOLE_RX, k = v / HOLE_RY;
    if (h * h + k * k <= 1) return s > 0 ? 3 : 0;
    return 1;
  }
  return 0;
}

export function drawKey(cx, cy, angle, size = 1, px = 1) {
  if (size <= 0.05) return;
  const c = Math.cos(angle), s = Math.sin(angle);
  const at = (dx, dy) => part((dx * c + dy * s) / size, (-dx * s + dy * c) / size);
  const R = Math.ceil((WING + WING_RX + 2) * size);
  // Where the shaft goes into his back.
  fill(cx - px, cy - px, 3 * px, 3 * px, C.ink);
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      const p = at(dx, dy);
      if (p) {
        // Lit from the top left, whichever way it's turned.
        const col = p === 3 ? C.red2 : p === 2 ? (dx + dy < 0 ? C.yel2 : C.yel0)
          : !at(dx - 1, dy - 1) ? C.yel2 : !at(dx + 1, dy + 1) ? C.yel0 : C.yel1;
        fill(cx + dx * px, cy + dy * px, px, px, col);
      } else if (at(dx + 1, dy) || at(dx - 1, dy) || at(dx, dy + 1) || at(dx, dy - 1)) {
        fill(cx + dx * px, cy + dy * px, px, px, C.ink);
      }
    }
  }
}
