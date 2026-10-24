// The robots of a real match, drawn: the arena's three (sprites.js: the elevator, the cargo arm, the defender) and six
// more kinds, so a field of six reads as six different machines. Each one is drawn from the floor up, (x, y) the middle
// of the robot at the floor under its wheels, facing dir (+1 right), in its alliance's bumpers with its number, the way
// sprites.js draws the others: ink outlines, lit top edges, a shaded side, the orange signal light.
//
//   kitbot     a rookie's kit chassis with a plywood box: a hatch on velcro at its front, a ball in a bucket on top,
//              and a little flag on a whip
//   ship       the low cargo-ship robot: a roller intake in front and a conveyor tower the ball rides up to the lip
//   hatchlow   low and quick: two white air tanks and a pneumatic beak at hatch height
//   swerve     the fast cycler: swerve modules, a slim black cascade elevator and an end effector for both pieces,
//              its alliance's light glowing under it
//   climber    the Level 3 specialist: a tall climbing arm that swings down to lever it up, a lift at the back
//   wedge      the pusher: a heavy wedge on eight wheels, diamond plate up its slope, a small hopper behind
//
//   drawBot(kind, x, y, s)   any of them (and 'ele', 'arm', 'def') in state s:
//                            team, num, dir, spin (wheels), rsl (light on), dead (light out, a wisp of smoke),
//                            hold ('hatch' | 'cargo' | null), hide (the caller draws the piece, mid hand-off),
//                            lift (height of the held piece above the floor, in pixels: the mechanism goes there),
//                            reach (0 to 1: a grabber or beak pushed out to place),
//                            up (the body raised: on a HAB platform, or climbing), legs ({ front, rear }: stilts or
//                            lift showing under it), climbK (0 to 1 through a climb, for the mechanisms that swing),
//                            shove (pixels to jolt sideways, in contact)
//   holdAt(kind, s)          where the held piece is, from (x, y): { dx, dy }
//   reachOf(kind)            the lowest and highest the piece can go: [min, max] pixels
//   KINDS                    every kind's key, for the sprite sheet

import { C, rect, withAlpha } from '../pixel.js';
import { frame, part, wheel, bumper, hatchPart, cargo, eleBot, armBot, defBot, TEAM } from '../sprites.js';

const WOOD = ['#6e4a2c', '#9c6b42', '#c99a64', '#e3bd86'];
const BLACK = ['#121520', '#1f2433', '#343b52'];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** The orange robot signal light: on, blinking off, or out (dead). */
function rsl(f, dx, dy, s) {
  part(f, dx - 1, dy - 1, 4, 4, C.ink);
  const on = !s.dead && s.rsl !== false;
  part(f, dx, dy, 2, 2, on ? C.org1 : C.org0);
  if (on) part(f, dx, dy, 1, 1, C.org2);
}
/** Stilts or a lift showing under a raised robot: a steel post with a foot, len pixels below the body at dx. */
function stilt(f, dx, len, b) {
  if (len <= 0) return;
  const L = Math.round(len);
  part(f, dx - 1, b - 4, 4, L + 5, C.ink);
  part(f, dx, b - 4, 2, L + 4, C.steel3);
  part(f, dx + 1, b - 4, 1, L + 4, C.steel2);
  part(f, dx - 2, b + L - 2, 6, 3, C.ink);
  part(f, dx - 1, b + L - 1, 4, 1, C.steel1);
}
/** Smoke from a dead robot: a few grey puffs drifting up, t seconds since it died. */
function smoke(x, y, t) {
  withAlpha(0.6, () => {
    for (let i = 0; i < 3; i++) {
      const k = ((t * 0.6 + i / 3) % 1), r = 1 + Math.round(k * 2);
      rect(Math.round(x + Math.sin(t * 2 + i * 2) * 2) - r, Math.round(y - k * 14) - r, r * 2, r * 2, k < 0.5 ? C.steel2 : C.steel1);
    }
  });
}

// ---- The rookie's kitbot ----
const KIT_HATCH = 16;
function kitbot(x, y, s) {
  const f = frame(x, y, s.dir ?? 1), T = TEAM[s.team ?? 'blue'], b = -Math.round(s.up ?? 0);
  // The flag on its whip at the back: a rookie's pride.
  part(f, -13, b - 47, 3, 32, C.ink);
  part(f, -12, b - 46, 1, 31, C.steel3);
  for (let r = 0; r < 6; r++) {
    part(f, -11, b - 47 + r, 8 - Math.abs(r - 2.5) * 2 + 1, 1, C.ink);
    if (r > 0 && r < 5) part(f, -11, b - 47 + r, 7 - Math.abs(r - 2.5) * 2, 1, r < 3 ? T[2] : T[1]);
  }
  for (const cx of [-10, 0, 10]) wheel(f, cx, b - 3, s.spin ?? 0);
  // The kit chassis: a long aluminium rail.
  part(f, -15, b - 17, 30, 5, C.ink);
  part(f, -14, b - 16, 28, 3, C.steel2);
  part(f, -14, b - 16, 28, 1, C.steel3);
  // The plywood box, screwed together, a sticker on its side, its top open as a bucket.
  part(f, -12, b - 33, 21, 17, C.ink);
  part(f, -11, b - 32, 19, 15, WOOD[1]);
  part(f, -11, b - 32, 19, 1, WOOD[3]);
  part(f, -11, b - 31, 19, 1, WOOD[2]);
  part(f, 5, b - 30, 3, 13, WOOD[0]);
  for (const [dx, dy] of [[-10, -29], [3, -29], [-10, -19], [3, -19]]) part(f, dx, b + dy, 1, 1, WOOD[0]);
  part(f, -7, b - 27, 6, 5, C.ink);
  part(f, -6, b - 26, 4, 3, T[1]);
  part(f, -6, b - 26, 4, 1, T[3]);
  part(f, -9, b - 33, 15, 1, C.steel0);
  // The velcro plate the hatch hangs on, at the front.
  part(f, 8, b - KIT_HATCH - 6, 4, 13, C.ink);
  part(f, 9, b - KIT_HATCH - 5, 2, 11, C.steel1);
  part(f, 9, b - KIT_HATCH - 5, 2, 1, C.steel2);
  rsl(f, -10, b - 37, s);
  bumper(f, -15, 30, b - 12, T, s.num);
  if (s.hold === 'hatch' && !s.hide) hatchPart(f, 12, b - KIT_HATCH);
  if (s.hold === 'cargo' && !s.hide) cargo(Math.round(f.x + f.d * -1), f.y + b - 36, 4);
}

// ---- The cargo-ship robot ----
const SHIP_MIN = 15, SHIP_MAX = 34;
function shipBot(x, y, s) {
  const f = frame(x, y, s.dir ?? 1), T = TEAM[s.team ?? 'blue'], b = -Math.round(s.up ?? 0);
  const ball = clamp(s.lift ?? SHIP_MIN, SHIP_MIN, SHIP_MAX), moving = s.hold === 'cargo' && ball > SHIP_MIN + 1;
  stilt(f, -11, s.legs?.rear ?? 0, b);
  stilt(f, 7, s.legs?.front ?? 0, b);
  for (const cx of [-9, 0, 9]) wheel(f, cx, b - 3, s.spin ?? 0);
  part(f, -15, b - 17, 30, 5, C.ink);
  part(f, -14, b - 16, 28, 3, C.steel1);
  part(f, -14, b - 16, 28, 1, C.steel2);
  // The conveyor tower: two rails with clear polycarbonate between, belts running up it, and a hood at the top that
  // turns the ball forward into the bay.
  part(f, -10, b - 40, 16, 25, C.ink);
  withAlpha(0.45, () => part(f, -8, b - 39, 12, 23, C.blue3));
  for (let j = 0; j < 6; j++) {
    const dy = -38 + ((j * 4 + (moving ? Math.floor((s.spin ?? 0) * 2) : 0)) % 22);
    part(f, -6, b + dy, 1, 2, C.steel1);
    part(f, 1, b + dy, 1, 2, C.steel1);
  }
  for (const dx of [-9, 4]) {
    part(f, dx, b - 39, 1, 23, C.steel3);
    part(f, dx + 1, b - 39, 1, 23, C.steel2);
  }
  part(f, -11, b - 44, 18, 4, C.ink);
  part(f, -10, b - 43, 16, 2, T[1]);
  part(f, -10, b - 43, 16, 1, T[2]);
  part(f, 5, b - 41, 3, 6, C.ink);
  part(f, 5, b - 41, 2, 5, T[1]);
  // The roller intake out front, low.
  part(f, 5, b - 18, 9, 3, C.ink);
  part(f, 6, b - 17, 8, 1, C.steel2);
  part(f, 11, b - 20, 7, 7, C.ink);
  part(f, 12, b - 19, 5, 5, T[1]);
  part(f, 12, b - 19, 5, 1, T[2]);
  part(f, 14, b - 17, 1, 1, C.steel3);
  rsl(f, -14, b - 22, s);
  bumper(f, -15, 30, b - 12, T, s.num);
  if (s.hold === 'cargo' && !s.hide) cargo(Math.round(f.x + f.d * -2), f.y + b - ball, 4);
}

// ---- The low hatch robot ----
const LOW_HATCH = 16;
function hatchLow(x, y, s) {
  const f = frame(x, y, s.dir ?? 1), T = TEAM[s.team ?? 'blue'], b = -Math.round(s.up ?? 0);
  const out = Math.round(clamp(s.reach ?? 0, 0, 1) * 3);
  for (const cx of [-10, 0, 10]) wheel(f, cx, b - 3, s.spin ?? 0);
  // A low black body with an alliance stripe, two white air tanks on top.
  part(f, -16, b - 21, 32, 10, C.ink);
  part(f, -15, b - 20, 30, 8, BLACK[1]);
  part(f, -15, b - 20, 30, 1, BLACK[2]);
  part(f, -15, b - 16, 24, 2, T[1]);
  part(f, -15, b - 16, 24, 1, T[2]);
  for (const dy of [-26, -23]) {
    part(f, -14, b + dy - 1, 14, 4, C.ink);
    part(f, -13, b + dy, 12, 2, C.white);
    part(f, -13, b + dy + 1, 12, 1, C.steel3);
    part(f, -13, b + dy, 1, 2, C.steel2);
  }
  // The mast and the beak: a silver piston pushing two fingers out at hatch height.
  part(f, 8, b - 26, 5, 16, C.ink);
  part(f, 9, b - 25, 3, 14, C.steel2);
  part(f, 9, b - 25, 1, 14, C.steel3);
  part(f, 12, b - LOW_HATCH - 3, 4 + out, 5, C.ink);
  part(f, 12, b - LOW_HATCH - 2, 3 + out, 3, C.steel3);
  part(f, 15 + out, b - LOW_HATCH - 5, 3, 9, C.ink);
  part(f, 16 + out, b - LOW_HATCH - 4, 1, 7, C.steel2);
  rsl(f, 3, b - 25, s);
  stilt(f, -11, s.legs?.rear ?? 0, b);
  stilt(f, 7, s.legs?.front ?? 0, b);
  bumper(f, -16, 32, b - 12, T, s.num);
  if (s.hold === 'hatch' && !s.hide) hatchPart(f, 17 + out, b - LOW_HATCH);
}

// ---- The swerve cycler ----
const SW_REST = 20, SW_STAGE = 27;
function swerve(x, y, s) {
  const f = frame(x, y, s.dir ?? 1), T = TEAM[s.team ?? 'blue'], b = -Math.round(s.up ?? 0);
  const lift = clamp((s.lift ?? SW_REST) - SW_REST, 0, SW_STAGE * 2);
  const off1 = Math.round(Math.min(lift, SW_STAGE)), off2 = off1 + Math.round(Math.max(0, lift - SW_STAGE));
  stilt(f, -12, s.legs?.rear ?? 0, b);
  stilt(f, 8, s.legs?.front ?? 0, b);
  // The cascade: three slim black stages, nested.
  const stages = [[-1, 7, off2, BLACK[2], C.steel2], [0, 6, off1, BLACK[1], C.steel1], [1, 5, 0, BLACK[2], C.steel2]];
  for (const [x0, x1, l] of stages) part(f, x0 - 1, b - 46 - l, x1 - x0 + 2, 33, C.ink);
  for (const [x0, x1, l, c, hi] of stages) {
    part(f, x0, b - 45 - l, 1, 31, hi);
    part(f, x1 - 1, b - 45 - l, 1, 31, c);
    part(f, x0, b - 45 - l, x1 - x0, 2, c);
    part(f, x0, b - 45 - l, x1 - x0, 1, hi);
  }
  // The light under it, then the swerve modules: each wheel under a housing with its steering gear in the alliance's colour.
  if (!s.dead) withAlpha(0.7, () => part(f, -13, b - 1, 26, 1, T[2]));
  for (const cx of [-11, 11]) {
    wheel(f, cx, b - 3, s.spin ?? 0);
    part(f, cx - 4, b - 15, 8, 6, C.ink);
    part(f, cx - 3, b - 14, 6, 4, BLACK[1]);
    part(f, cx - 2, b - 14, 4, 2, T[2]);
    part(f, cx - 1, b - 14, 2, 1, T[3]);
  }
  part(f, -15, b - 18, 30, 4, C.ink);
  part(f, -14, b - 17, 28, 2, BLACK[2]);
  part(f, -14, b - 17, 28, 1, C.steel1);
  rsl(f, -12, b - 22, s);
  bumper(f, -15, 30, b - 12, T, s.num);
  // The end effector on the top stage: a box with green compliant wheels for cargo, fingers for a hatch.
  const cy = b - SW_REST - off2;
  part(f, 2, cy - 5, 12, 10, C.ink);
  part(f, 3, cy - 4, 10, 8, C.steel1);
  part(f, 3, cy - 4, 10, 1, C.steel2);
  part(f, 10, cy - 4, 3, 3, '#2f9e5a');
  part(f, 10, cy + 1, 3, 3, '#2f9e5a');
  part(f, 13, cy - 2, 3, 4, C.ink);
  part(f, 13, cy - 1, 2, 2, C.steel3);
  if (s.hold === 'cargo' && !s.hide) cargo(Math.round(f.x + f.d * 9), f.y + cy, 4);
  if (s.hold === 'hatch' && !s.hide) hatchPart(f, 15, cy);
}

// ---- The Level 3 climber ----
const CL_HOLD = 16;
function climber(x, y, s) {
  const f = frame(x, y, s.dir ?? 1), T = TEAM[s.team ?? 'blue'], b = -Math.round(s.up ?? 0);
  // The climbing arm: folded up at the back, it swings forward and down over the platform to lever the robot up.
  const k = clamp(s.climbK ?? 0, 0, 1), swing = k < 0.15 ? 0 : k < 0.5 ? (k - 0.15) / 0.35 : k < 0.9 ? 1 : 1 - (k - 0.9) / 0.1;
  const a = -1.75 + swing * 2.3, len = 30, px = -7, py = b - 31;
  const ex = px + Math.cos(a) * len, ey = py + Math.sin(a) * len;
  stilt(f, -11, s.legs?.rear ?? 0, b);
  const line = (w, c) => {
    for (let t = 0; t <= len; t += 1) {
      const lx = Math.round(px + Math.cos(a) * t), ly = Math.round(py + Math.sin(a) * t);
      part(f, lx - (w >> 1), ly - (w >> 1), w, w, c);
    }
  };
  line(5, C.ink);
  line(3, C.steel2);
  line(1, C.steel3);
  part(f, Math.round(ex) - 3, Math.round(ey) - 3, 7, 7, C.ink);
  part(f, Math.round(ex) - 2, Math.round(ey) - 2, 5, 5, C.tire);
  part(f, Math.round(ex) - 1, Math.round(ey) - 1, 2, 2, C.steel2);
  for (const cx of [-9, 0, 9]) wheel(f, cx, b - 3, s.spin ?? 0);
  // A sturdy tower for the arm's pivot, the gearbox on it in the alliance's colour.
  part(f, -11, b - 34, 9, 22, C.ink);
  part(f, -10, b - 33, 7, 20, C.steel1);
  part(f, -10, b - 33, 2, 20, C.steel2);
  part(f, -10, b - 33, 7, 1, C.steel3);
  part(f, -9, b - 30, 5, 5, T[1]);
  part(f, -9, b - 30, 5, 1, T[2]);
  part(f, px - 1, py - 1, 3, 3, C.ink);
  part(f, px, py, 1, 1, C.steel3);
  part(f, -15, b - 17, 30, 5, C.ink);
  part(f, -14, b - 16, 28, 3, C.steel1);
  part(f, -14, b - 16, 28, 1, C.steel2);
  // Low at the front: a roller for cargo and a beak for hatches, both at the cargo ship's height.
  part(f, 6, b - CL_HOLD - 6, 6, 12, C.ink);
  part(f, 7, b - CL_HOLD - 5, 4, 10, C.steel2);
  part(f, 11, b - CL_HOLD - 2, 4, 4, C.ink);
  part(f, 12, b - CL_HOLD - 1, 2, 2, T[2]);
  rsl(f, -1, b - 22, s);
  bumper(f, -15, 30, b - 12, T, s.num);
  if (s.hold === 'cargo' && !s.hide) cargo(Math.round(f.x + f.d * 15), f.y + b - CL_HOLD - 2, 4);
  if (s.hold === 'hatch' && !s.hide) hatchPart(f, 14, b - CL_HOLD);
}

// ---- The pusher ----
function wedge(x, y, s) {
  const f = frame(x, y, s.dir ?? 1), T = TEAM[s.team ?? 'blue'], b = -Math.round(s.up ?? 0);
  for (const cx of [-12, -4, 4, 12]) wheel(f, cx, b - 3, s.spin ?? 0);
  // The wedge: from the front bumper up to the back, steel edged, diamond plate in the alliance's colour.
  const rise = (dx) => Math.round(12 + ((15 - dx) * 15) / 30);
  for (let dx = -16; dx <= 16; dx++) {
    const h = rise(clamp(dx, -15, 15));
    part(f, dx, b - h - 1, 1, h - 10, C.ink);
  }
  for (let dx = -15; dx <= 15; dx++) {
    const h = rise(dx);
    part(f, dx, b - h, 1, h - 12, T[1]);
    part(f, dx, b - h, 1, 1, C.steel3);
    if ((dx + 16) % 4 === 0) part(f, dx, b - h + 3, 1, 1, T[2]);
    if ((dx + 18) % 4 === 0 && h > 18) part(f, dx, b - h + 6, 1, 1, T[0]);
  }
  // A small hopper behind the slope, for one ball.
  part(f, -16, b - 33, 9, 7, C.ink);
  part(f, -15, b - 32, 7, 5, C.steel1);
  part(f, -15, b - 32, 7, 1, C.steel2);
  rsl(f, -5, b - 26, s);
  bumper(f, -17, 34, b - 12, T, s.num);
  if (s.hold === 'cargo' && !s.hide) cargo(Math.round(f.x + f.d * -11), f.y + b - 35, 4);
}

// ---- The arena's three, with what a match needs of them ----
// The elevator (the intro's hero): its carriage holds a ball as well as a hatch; its stilts are its own.
const ELE_REST = 22;
function ele(x, y, s) {
  const lift = clamp((s.lift ?? ELE_REST) - ELE_REST, 0, 56);
  const e1 = Math.min(lift, 28) / 28, e2 = Math.max(0, lift - 28) / 28, b = Math.round(s.up ?? 0);
  eleBot(x, y, {
    team: s.team, num: s.num, dir: s.dir, spin: s.spin, rsl: !s.dead && s.rsl !== false, hatch: s.hold === 'hatch' && !s.hide,
    e1, e2, lift: b, front: s.legs?.front ?? 0, rear: s.legs?.rear ?? 0, reach: Math.round(clamp(s.reach ?? 0, 0, 1) * 2),
  });
  if (s.hold === 'cargo' && !s.hide) {
    const p = holdAt('ele', s);
    cargo(Math.round(x + p.dx), Math.round(y + p.dy), 4);
  }
}
// The cargo arm: the arm's angle puts the ball where it's going; a hatch rides on the end of the arm too.
const ARM = { px: -4, py: -38, len: 24 };
const armAngle = (lift) => Math.asin(clamp((-(lift ?? 26) - ARM.py) / ARM.len, -0.98, 0.98));
function arm(x, y, s) {
  const b = Math.round(s.up ?? 0);
  stilt(frame(x, y, s.dir ?? 1), -11, s.legs?.rear ?? 0, -b);
  stilt(frame(x, y, s.dir ?? 1), 6, s.legs?.front ?? 0, -b);
  armBot(x, y - b, { team: s.team, num: s.num, dir: s.dir, spin: s.spin, angle: armAngle(s.lift), ball: s.hold === 'cargo' && !s.hide });
  rsl(frame(x, y - b, s.dir ?? 1), 3, -21, s);
  if (s.hold === 'hatch' && !s.hide) {
    const p = holdAt('arm', s);
    hatchPart(frame(x + p.dx - 2 * (s.dir ?? 1), 0, s.dir ?? 1), 0, Math.round(y + p.dy));
  }
}
// The defender: a hatch on velcro on its nose, for the sandstorm.
function def(x, y, s) {
  const b = Math.round(s.up ?? 0);
  stilt(frame(x, y, s.dir ?? 1), -12, s.legs?.rear ?? 0, -b);
  stilt(frame(x, y, s.dir ?? 1), 9, s.legs?.front ?? 0, -b);
  defBot(x, y - b, { team: s.team, num: s.num, dir: s.dir, spin: s.spin, glint: s.dead ? null : ((s.t ?? 0) * 0.5) % 1, rsl: !s.dead && s.rsl !== false });
  if (s.hold === 'hatch' && !s.hide) hatchPart(frame(x, y - b, s.dir ?? 1), 19, -16);
}

const DRAW = { ele, arm, def, kitbot, ship: shipBot, hatchlow: hatchLow, swerve, climber, wedge };
export const KINDS = Object.keys(DRAW);

/** Where the held piece is, from the robot's floor point, for each kind (the hand-off draws the piece from here). */
export function holdAt(kind, s) {
  const d = s.dir ?? 1, b = -Math.round(s.up ?? 0);
  switch (kind) {
    case 'ele': {
      const lift = clamp((s.lift ?? ELE_REST) - ELE_REST, 0, 56);
      const cy = b - ELE_REST - Math.round(Math.min(lift, 28)) - Math.round(Math.max(0, lift - 28));
      return s.hold === 'cargo' ? { dx: d * 11, dy: cy - 1 } : { dx: d * 20, dy: cy };
    }
    case 'arm': {
      const a = armAngle(s.lift);
      return { dx: d * (ARM.px + Math.round(Math.cos(a) * ARM.len) - 3), dy: b + ARM.py + Math.round(Math.sin(a) * ARM.len) + 1 };
    }
    case 'def': return { dx: d * 21, dy: b - 16 };
    case 'kitbot': return s.hold === 'cargo' ? { dx: -d, dy: b - 36 } : { dx: d * 14, dy: b - KIT_HATCH };
    case 'ship': return { dx: d * -2, dy: b - clamp(s.lift ?? SHIP_MIN, SHIP_MIN, SHIP_MAX) };
    case 'hatchlow': return { dx: d * (19 + Math.round(clamp(s.reach ?? 0, 0, 1) * 3)), dy: b - LOW_HATCH };
    case 'swerve': {
      const lift = clamp((s.lift ?? SW_REST) - SW_REST, 0, SW_STAGE * 2);
      const cy = b - SW_REST - Math.round(Math.min(lift, SW_STAGE)) - Math.round(Math.max(0, lift - SW_STAGE));
      return s.hold === 'cargo' ? { dx: d * 9, dy: cy } : { dx: d * 17, dy: cy };
    }
    case 'climber': return s.hold === 'cargo' ? { dx: d * 15, dy: b - CL_HOLD - 2 } : { dx: d * 16, dy: b - CL_HOLD };
    case 'wedge': return { dx: d * -11, dy: b - 35 };
    default: return { dx: 0, dy: b - 20 };
  }
}
/** How low and how high each kind can hold a piece (pixels above the floor). */
export function reachOf(kind) {
  return {
    ele: [ELE_REST, ELE_REST + 56], swerve: [SW_REST, SW_REST + 2 * SW_STAGE], arm: [15, 60], ship: [SHIP_MIN, SHIP_MAX],
    kitbot: [KIT_HATCH, 36], hatchlow: [LOW_HATCH, LOW_HATCH], climber: [CL_HOLD, CL_HOLD + 2], def: [16, 16], wedge: [35, 35],
  }[kind] ?? [20, 20];
}

/** A robot of any kind, in state s (see the top of this file). */
export function drawBot(kind, x, y, s = {}) {
  const jolt = Math.round(s.shove ?? 0);
  (DRAW[kind] ?? ele)(x + jolt, y, s);
  if (s.dead && s.deadFor != null) smoke(x + jolt, y - 30 - Math.round(s.up ?? 0), s.deadFor);
}
