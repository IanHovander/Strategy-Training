// The cast and the set: robots, the 2019 rocket and HAB, the crowd, people and the blue banner.
// Robots are drawn from the floor up: (x, y) is the middle of the robot at the floor under its wheels.
// World units are game pixels at camera scale 1 (about 1.5 inches each).

import { C, cam, rect, disk, text, measure, snap, layer, blit, withAlpha, rnd, dither, fill } from './pixel.js';

// ---- Robot parts ----
// A drawing frame: d is the facing (+1 right, -1 left) times a squash used to fake a spin.
const frame = (x, y, d) => ({ x: snap(x), y: snap(y), d });
function part(f, dx, dy, w, h, c) {
  const a = f.x + f.d * dx, b = f.x + f.d * (dx + w);
  rect(Math.min(a, b), f.y + dy, Math.abs(b - a), h, c);
}
const TEAM = {
  blue: [C.blue0, C.blue1, C.blue2, C.blue3],
  red: [C.red0, C.red1, C.red2, C.red3],
};
const RING = [[-2, -2], [-1, -2], [0, -2], [1, -2], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-2, 1], [-2, 0], [-2, -1]];

/** A 6px wheel centered between pixels (cx, cy); spin moves the tread marks. */
function wheel(f, cx, cy, spin) {
  part(f, cx - 2, cy - 3, 4, 6, C.ink);
  part(f, cx - 3, cy - 2, 6, 4, C.ink);
  part(f, cx - 2, cy - 2, 4, 4, C.tire);
  part(f, cx - 1, cy - 1, 2, 2, C.steel2);
  const i = ((Math.floor(spin) % 12) + 12) % 12;
  for (const j of [i, (i + 6) % 12]) part(f, cx + RING[j][0], cy + RING[j][1], 1, 1, C.steel1);
}

/** Fabric bumpers with the team number, the way every FRC robot wears them. */
function bumper(f, x0, w, top, cols, num) {
  part(f, x0 - 1, top - 1, w + 2, 9, C.ink);
  part(f, x0, top, w, 7, cols[1]);
  part(f, x0, top, w, 1, cols[2]);
  part(f, x0, top + 6, w, 1, cols[0]);
  if (num && Math.abs(f.d) > 0.7) {
    const mid = f.x + f.d * (x0 + w / 2);
    text(num, Math.round(mid - measure(num, { font: 3 }) / 2), f.y + top + 1, { font: 3, color: C.white });
  }
}

/** A hatch panel (the yellow disc) seen almost edge-on, centered at height cy. */
function hatchPart(f, dx, cy) {
  part(f, dx, cy - 7, 4, 15, C.ink);
  part(f, dx - 1, cy - 5, 6, 11, C.ink);
  part(f, dx, cy - 6, 4, 13, C.yel1);
  part(f, dx, cy - 6, 1, 13, C.yel2);
  part(f, dx + 3, cy - 6, 1, 13, C.yel0);
  part(f, dx + 1, cy - 1, 2, 3, C.ink);
}
export const hatch = (x, cy) => hatchPart(frame(x, 0, 1), 0, cy);

/** A cargo ball. */
export function cargo(x, y, r = 4) {
  disk(x, y, r + 1, C.ink);
  disk(x, y, r, C.org1);
  rect(x - r + 1, y - r + 2, 2, 2, C.org2);
  rect(x + r - 2, y + 1, 1, r - 2, C.org0);
}

/**
 * The hero: a blue robot with a two-stage elevator.
 * o: dir, k (spin squash), e1/e2 (0..1 per stage), hatch, reach, spin (wheels), rsl (light on?),
 *    lift (body raised on stilts), front/rear (stilt length below the body), team, num.
 */
export function eleBot(x, y, o = {}) {
  const f = frame(x, y, (o.dir ?? 1) * (o.k ?? 1));
  const T = TEAM[o.team ?? 'blue'];
  const b = -Math.round(o.lift ?? 0);
  const off1 = Math.round((o.e1 ?? 0) * 28);
  const off2 = off1 + Math.round((o.e2 ?? 0) * 28);

  // Level-3 climber stilts, behind the bumpers.
  for (const [dx, len] of [[-12, o.rear ?? 0], [1, o.front ?? 0]]) {
    if (len <= 0) continue;
    const L = Math.round(len);
    part(f, dx - 1, b - 10, 4, L + 7, C.ink);
    part(f, dx, b - 10, 2, L + 6, C.steel3);
    part(f, dx + 1, b - 10, 1, L + 6, C.steel2);
    part(f, dx - 2, b + L - 4, 6, 4, C.ink);
    part(f, dx - 1, b + L - 3, 4, 2, C.steel1);
  }

  // The elevator: fixed stage, then stage 1 (anodized team color), then stage 2, nested inside each other.
  // All outlines go down first so each stage's tubes sit side by side with a dark edge around the bundle.
  const stages = [[5, 11, off2, C.steel3, C.white], [3, 13, off1, T[1], T[2]], [1, 15, 0, C.steel2, C.steel3]];
  for (const [x0, x1, lift] of stages) {
    const top = b - 48 - lift;
    part(f, x0 - 1, top - 1, 4, 35, C.ink);
    part(f, x1 - 3, top - 1, 4, 35, C.ink);
    part(f, x0 - 1, top - 1, x1 - x0 + 2, 4, C.ink);
  }
  for (const [x0, x1, lift, c, hi] of stages) {
    const top = b - 48 - lift;
    for (const tx of [x0, x1 - 2]) {
      part(f, tx, top, 2, 33, c);
      part(f, tx, top, 1, 33, hi);
    }
    part(f, x0, top, x1 - x0, 2, c);
    part(f, x0, top, x1 - x0, 1, hi);
    part(f, x0 + 2, top + 16, x1 - x0 - 4, 1, C.steel1);
  }

  for (const cx of [-8, 0, 8]) wheel(f, cx, b - 3, o.spin ?? 0);

  // Frame rail, battery and the orange robot signal light.
  part(f, -14, b - 17, 28, 5, C.ink);
  part(f, -13, b - 16, 26, 3, C.steel1);
  part(f, -13, b - 16, 26, 1, C.steel2);
  part(f, -13, b - 21, 7, 5, C.ink);
  part(f, -12, b - 20, 5, 3, C.steel0);
  part(f, -12, b - 20, 1, 1, C.red1);
  part(f, -10, b - 20, 1, 1, C.steel2);
  part(f, -4, b - 21, 4, 5, C.ink);
  part(f, -3, b - 20, 2, 2, o.rsl === false ? C.org0 : C.org1);
  if (o.rsl !== false) part(f, -3, b - 20, 1, 1, C.org2);

  bumper(f, -15, 30, b - 12, T, o.num ?? '5026');

  // Carriage with the hatch grabber; it rides the top stage.
  const cy = b - 22 - off2, reach = Math.round(o.reach ?? 0);
  part(f, 3, cy - 6, 12, 12, C.ink);
  part(f, 4, cy - 5, 10, 10, C.steel1);
  part(f, 4, cy - 5, 10, 1, C.steel2);
  part(f, 6, cy - 3, 6, 6, T[1]);
  part(f, 6, cy - 3, 6, 1, T[2]);
  part(f, 14, cy - 2, 4 + reach, 4, C.ink);
  part(f, 14, cy - 1, 3 + reach, 2, C.steel3);
  if (o.hatch) hatchPart(f, 18 + reach, cy);
}
/** Height above the floor of the hatch the hero holds, for elevator extension e1/e2. */
export const hatchHeight = (e1, e2) => -22 - Math.round(e1 * 28) - Math.round(e2 * 28);

/**
 * The defender: low, wide, all drivetrain, with hazard stripes and a red light bar for eyes.
 * o: dir (default faces left), k, spin, glint (0..1 sweeps a highlight across the light bar), num.
 */
export function defBot(x, y, o = {}) {
  const f = frame(x, y, (o.dir ?? -1) * (o.k ?? 1));
  for (const cx of [-13, -4, 5, 14]) wheel(f, cx, -3, o.spin ?? 0);
  // Body with a sloped nose at the front (+x).
  for (let r = -24; r <= -12; r++) part(f, -19, r, 19 + Math.min(19, 13 + (r + 24)), 1, C.ink);
  for (let r = -23; r <= -13; r++) {
    const x1 = Math.min(18, 13 + (r + 24)) - 1;
    part(f, -18, r, x1 + 18, 1, r <= -22 ? C.steel1 : C.steel0);
  }
  part(f, -18, -23, 30, 1, C.steel2);
  // Hazard stripes on the side armor.
  for (let j = 0; j < 5; j++) for (let i = 0; i < 20; i++) part(f, -15 + i, -20 + j, 1, 1, ((i + j) >> 1) % 2 ? C.yel1 : C.ink);
  // The light bar.
  part(f, 7, -21, 11, 4, C.ink);
  part(f, 8, -20, 9, 2, C.red2);
  part(f, 8, -20, 9, 1, C.red3);
  if (o.glint != null && o.glint >= 0 && o.glint <= 1) part(f, 8 + Math.round(o.glint * 7), -20, 2, 2, C.white);
  // Signal light and radio.
  part(f, -12, -27, 4, 4, C.ink);
  part(f, -11, -26, 2, 2, o.rsl === false ? C.org0 : C.org1);
  if (o.rsl !== false) part(f, -11, -26, 1, 1, C.org2);
  part(f, -5, -28, 1, 5, C.ink);
  bumper(f, -18, 36, -12, TEAM.red, o.num ?? '7777');
}

/**
 * A robot with a pivoting arm and a ball intake, for the title screen line-up.
 * o: dir, angle (radians, 0 = arm straight forward), team, num, spin, ball (false: the intake is empty).
 */
export function armBot(x, y, o = {}) {
  const f = frame(x, y, o.dir ?? 1);
  const T = TEAM[o.team ?? 'blue'];
  for (const cx of [-8, 0, 8]) wheel(f, cx, -3, o.spin ?? 0);
  // Tower.
  part(f, -7, -40, 6, 25, C.ink);
  part(f, -6, -39, 4, 24, C.steel2);
  part(f, -6, -39, 1, 24, C.steel3);
  part(f, -14, -17, 28, 5, C.ink);
  part(f, -13, -16, 26, 3, C.steel1);
  part(f, -13, -16, 26, 1, C.steel2);
  bumper(f, -15, 30, -12, T, o.num ?? '2019');
  // The arm, drawn as a thick line from the pivot.
  const a = o.angle ?? 0, len = 24;
  const ex = Math.round(Math.cos(a) * len) - 4, ey = -38 + Math.round(Math.sin(a) * len);
  const line = (w, c) => {
    for (let t = 0; t <= len; t++) {
      const px = -4 + Math.round(Math.cos(a) * t), py = -38 + Math.round(Math.sin(a) * t);
      part(f, px - (w >> 1), py - (w >> 1), w, w, c);
    }
  };
  line(5, C.ink);
  line(3, T[1]);
  part(f, -6, -40, 4, 4, C.ink);
  part(f, -5, -39, 2, 2, C.steel3);
  part(f, ex - 4, ey - 4, 9, 9, C.ink);
  part(f, ex - 3, ey - 3, 7, 7, C.steel1);
  const bx = f.x + f.d * (ex + 1);
  if (o.ball !== false) cargo(Math.round(bx), f.y + ey + 1, 4);
}

// ---- The 2019 field ----

/**
 * The rocket, seen from the side with its scoring face on the left at x = rx.
 * o: hatches / cargo / lights: three booleans each, bottom level first.
 */
export const ROCKET_LEVELS = [-22, -50, -78];
export function rocket(rx, o = {}) {
  const f = frame(rx, 0, 1);
  const cone = (i) => Math.max(1, Math.round(14 * Math.sin(((i + 1) / 22) * (Math.PI / 2)) ** 0.75));
  // Silhouette outline.
  for (let i = 0; i < 22; i++) part(f, 14 - cone(i) - 1, -113 + i, cone(i) * 2 + 2, 1, C.ink);
  part(f, 14 - cone(0) - 1, -114, cone(0) * 2 + 2, 1, C.ink);
  part(f, -1, -92, 30, 90, C.ink);
  part(f, -3, -6, 34, 6, C.ink);
  // Nose cone.
  for (let i = 0; i < 22; i++) {
    const hw = cone(i), y = -113 + i;
    part(f, 14 - hw, y, hw * 2, 1, i < 6 ? C.blue1 : C.steel3);
    part(f, 14 + hw - Math.max(1, hw >> 1), y, Math.max(1, hw >> 1), 1, i < 6 ? C.blue0 : C.steel2);
    if (hw > 3) part(f, 14 - hw + 2, y, 1, 1, i < 6 ? C.blue2 : C.white);
  }
  // Hull.
  part(f, 0, -91, 28, 86, C.steel3);
  part(f, 0, -91, 3, 86, C.steel2);
  part(f, 21, -91, 7, 86, C.steel2);
  part(f, 25, -91, 3, 86, C.steel1);
  part(f, 6, -91, 2, 86, C.white);
  for (const y of [-36, -64, -91]) {
    part(f, 0, y, 28, 3, C.blue1);
    part(f, 0, y, 28, 1, C.blue2);
    part(f, 21, y, 7, 3, C.blue0);
  }
  for (let y = -88; y < -6; y += 7) {
    part(f, 4, y, 1, 1, C.steel2);
    part(f, 19, y, 1, 1, C.steel2);
  }
  // Base skirt.
  part(f, -2, -5, 32, 5, C.steel1);
  part(f, -2, -5, 32, 1, C.steel2);
  for (let x = 0; x < 30; x += 5) part(f, x, -3, 2, 1, C.steel0);

  ROCKET_LEVELS.forEach((cy, l) => {
    // Hatch opening on the scoring face.
    part(f, -2, cy - 7, 4, 15, C.ink);
    part(f, -1, cy - 6, 2, 13, C.steel0);
    // Cargo port on the side, with its ring light.
    const px = rx + 14, py = cy - 2;
    disk(px, py, 6, C.ink);
    disk(px, py, 5, o.lights?.[l] ? C.blue2 : C.steel1);
    if (o.lights?.[l]) rect(px - 4, py - 4, 2, 1, C.blue3);
    disk(px, py, 4, C.ink);
    if (o.cargo?.[l]) cargo(px, py, 3);
    if (o.hatches?.[l]) hatchPart(f, -4, cy);
  });
}

// The alliance wall: 6 ft 6 in tall, aluminum diamond plate up to 3 ft and clear polycarbonate above. It has three
// player stations (squeezed a little, so one fits in the HAB shot), each with its team's number on top.
const WALL = { top: -52, plate: -24, station: 30 };
const STATIONS = ['5026', '3000', '2019'];

/**
 * A drive team member behind the alliance wall, facing the field: (x, y) is the middle of the shoulders, and only
 * what is above the wall's diamond plate will show. o: skin, hair (indexes), up (arms in the air, cheering).
 */
function driver(x, y, o) {
  const X = snap(x), Y = snap(y);
  const skin = C.skin[o.skin], hair = C.hair[o.hair];
  const p = (dx, dy, w, h, c) => rect(X + dx, Y + dy, w, h, c);
  if (o.up) {
    // Arms up beside the head, behind the body, hands open a little wider.
    for (const [ax, out] of [[-8, -1], [6, 1]]) {
      p(ax - 1, -11, 4, 13, C.ink);
      p(ax - 1 + out, -14, 4, 4, C.ink);
      p(ax, -10, 2, 8, skin);
      p(ax + out, -13, 2, 3, skin);
      p(ax, -2, 2, 3, C.blue1);
    }
  }
  // Team shirt, lit from the upper left, with round shoulders and a logo. It runs on down behind the diamond plate.
  p(-6, -1, 12, 1, C.ink);
  p(-7, 0, 14, 17, C.ink);
  p(-5, 0, 10, 1, C.blue2);
  p(-6, 1, 12, 16, C.blue1);
  p(-6, 1, 2, 16, C.blue2);
  p(4, 1, 2, 16, C.blue0);
  p(1, 2, 2, 2, C.white);
  if (!o.up) {
    // Hands on the controller, just above the shelf.
    p(-5, 5, 10, 4, C.ink);
    p(-3, 6, 6, 2, C.tire);
    p(-2, 6, 1, 1, C.steel2);
    p(1, 6, 1, 1, C.red1);
    p(-5, 5, 2, 3, skin);
    p(3, 5, 2, 3, skin);
  }
  // Head, hair and safety glasses.
  p(-5, -11, 10, 10, C.ink);
  p(-4, -10, 8, 8, skin);
  p(-1, -2, 2, 2, skin);
  p(-4, -10, 8, 3, hair);
  p(-4, -7, 1, 1, hair);
  p(3, -7, 1, 1, hair);
  p(-4, -6, 8, 2, C.ink);
  p(-3, -6, 2, 1, C.blue3);
  p(1, -6, 2, 1, C.blue3);
  if (o.up) {
    p(-2, -4, 4, 1, C.ink);
    p(-1, -3, 2, 1, C.red1);
  } else p(-1, -4, 2, 1, '#8a4a3a');
}

/**
 * The HAB at the alliance wall: level 1 runs along the floor, level 3 is the tall step at x = x3,
 * and the alliance wall stands at x3 + 40, seen from the field, with the drive teams behind it.
 * o: cheer (the drivers jump with their arms up), t (beats, for the jumps), glow (the alliance light strip lights up).
 */
export const HAB = { l1: -2, l3: -16, depth: 40 };
export function hab(x3, o = {}) {
  const x0 = cam.x - 4, x1 = cam.x + 260 / cam.s;
  // Level 1 plate.
  rect(x0, HAB.l1 - 1, x1 - x0, 3, C.ink);
  rect(x0, HAB.l1, x1 - x0, 2, C.steel1);
  for (let x = Math.floor(x0 / 4) * 4; x < x1; x += 4) rect(x + ((x / 4) & 1) * 2, HAB.l1, 1, 1, C.steel2);
  // The alliance wall behind level 3. Each station is a post, then its window; mid() is the middle of the window.
  const wx = x3 + HAB.depth, ww = STATIONS.length * WALL.station, { top, plate } = WALL;
  const left = (i) => wx + i * WALL.station, mid = (i) => left(i) + 1 + WALL.station / 2;
  // The drivers stand at their stations' shelves behind the glass, a little left of the middle.
  STATIONS.forEach((num, i) => {
    const bob = o.cheer ? Math.round(Math.abs(Math.sin((o.t ?? 0) * Math.PI + i)) * 4) : 0;
    driver(mid(i) - 4, -34 - bob, { skin: (i + 1) % 4, hair: i, up: o.cheer });
    // The shelf, with the emergency stop button at its left end.
    rect(left(i) + 2, plate - 1, WALL.station - 2, 1, C.steel2);
    rect(left(i) + 3, plate - 3, 2, 2, C.ink);
    rect(left(i) + 3, plate - 3, 2, 1, C.red1);
  });
  // Clear polycarbonate: a light tint, and glare streaks low on the right and high on the left of each window.
  withAlpha(0.16, () => rect(wx, top, ww, plate - top, C.blue3));
  withAlpha(0.45, () => {
    for (let i = 0; i < STATIONS.length; i++) {
      const gx = left(i) + 19;
      for (let k = 0; k < 12; k++) rect(gx + k, plate - 3 - k, 1, 1, C.white);
      for (let k = 0; k < 5; k++) rect(gx + 3 + k, plate - 3 - k, 1, 1, C.white);
      for (let k = 0; k < 4; k++) rect(left(i) + 3 + k, top + 5 - k, 1, 1, C.white);
    }
  });
  // The aluminum frame: a post at each end of a station and a rail along the top.
  for (let i = 0; i <= STATIONS.length; i++) {
    rect(left(i) - 1, top, 4, -top, C.ink);
    rect(left(i), top, 2, -top, C.steel2);
    rect(left(i), top, 1, -top, C.steel3);
  }
  rect(wx - 1, top - 1, ww + 4, 3, C.ink);
  rect(wx, top, ww + 2, 1, C.steel3);
  // Diamond plate up to 3 feet: rows of short treads, every other one leaning the other way, each lit on its upper
  // left with a shadow below it on the right. Kept dim so the robot and the drivers stand out.
  rect(wx - 1, plate - 1, ww + 4, 1 - plate, C.ink);
  rect(wx, plate, ww + 2, -plate, C.steel1);
  rect(wx, -2, ww + 2, 2, C.steel0);
  for (let r = 0, y = plate + 3; y < -3; r++, y += 3) {
    for (let j = 0, x = wx + 1 + (r & 1) * 2; x < wx + ww; j++, x += 4) {
      const lean = (j + r) & 1;
      rect(x, y + lean, 1, 1, C.steel2);
      if (lean) rect(x + 1, y, 1, 1, C.steel2);
      rect(x + 1, y + 1 + lean, 1, 1, C.steel0);
    }
  }
  for (let i = 1; i < STATIONS.length; i++) rect(left(i), plate, 1, -plate, C.steel0);
  // Alliance light strip along the top of the plate; lit, it washes the bottom of the glass.
  if (o.glow) withAlpha(0.25, () => rect(wx, plate - 2, ww + 2, 2, C.blue2));
  rect(wx, plate, ww + 2, 2, o.glow ? C.blue2 : C.blue0);
  rect(wx, plate, ww + 2, 1, o.glow ? C.blue3 : C.blue1);
  // On top of each station: the team number sign, and the stack light that shows the robot is connected.
  STATIONS.forEach((num, i) => {
    const cx = mid(i);
    rect(cx - 9, top - 9, 19, 9, C.ink);
    rect(cx - 8, top - 8, 17, 7, '#16204a');
    text(num, cx, top - 7, { font: 3, align: 'center', color: C.blue2 });
    rect(cx - 2, top - 14, 4, 6, C.ink);
    rect(cx - 1, top - 13, 2, 2, C.blue2);
    rect(cx - 1, top - 13, 1, 1, C.blue3);
    rect(cx - 1, top - 11, 2, 2, C.org0);
  });
  // Level 3 platform.
  rect(x3 - 1, HAB.l3 - 1, HAB.depth + 2, HAB.l1 - HAB.l3 + 1, C.ink);
  rect(x3, HAB.l3, HAB.depth, HAB.l1 - HAB.l3, C.blue1);
  rect(x3, HAB.l3, HAB.depth, 2, C.steel3);
  for (let x = 0; x < HAB.depth; x += 3) rect(x3 + x, HAB.l3, 1, 1, C.steel2);
  rect(x3, HAB.l3 + 2, HAB.depth, 1, C.blue2);
  rect(x3, HAB.l1 - 2, HAB.depth, 1, C.blue0);
  for (let x = 4; x < HAB.depth - 2; x += 8) rect(x3 + x, HAB.l3 + 5, 4, 6, C.blue0);
}

// ---- The arena ----

/** Night sky, 256 x 288, darkest at the top. Stars are baked in; twinkle() adds the live ones. */
export function makeSky() {
  return layer(256, 288, () => {
    const bands = [[0, C.night0], [110, C.night1], [180, C.night2], [236, C.night3], [272, C.glow]];
    bands.forEach(([y, c], i) => {
      const next = bands[i + 1]?.[0] ?? 288;
      fill(0, y, 256, next - y, c);
      if (i > 0) dither(0, y - 3, 256, 6, bands[i - 1][1], c);
    });
    // A faint band of the galaxy.
    for (let i = 0; i < 900; i++) {
      const t = rnd(i * 3.1), x = Math.floor(t * 256);
      const y = Math.floor(40 + t * 120 + (rnd(i * 5.7) - 0.5) * 34);
      fill(x, y, 1, 1, rnd(i) > 0.5 ? C.night2 : C.night3);
    }
    for (let i = 0; i < 140; i++) {
      const x = Math.floor(rnd(i + 0.5) * 256), y = Math.floor(rnd(i + 99.3) * 260);
      fill(x, y, 1, 1, rnd(i + 7) > 0.7 ? C.star : C.starDim);
    }
  });
}
const TWINKLES = Array.from({ length: 16 }, (_, i) => [Math.floor(rnd(i + 401) * 250) + 3, Math.floor(rnd(i + 777) * 240) + 3, rnd(i + 13) * 4]);
/** The sky plus twinkling stars. lift = how far the camera looks up (0..144). */
export function sky(skyLayer, lift, t) {
  const oy = Math.round(-144 + Math.min(144, Math.max(0, lift)));
  blitScreen(skyLayer, 0, oy);
  for (const [x, y, ph] of TWINKLES) {
    const sy = y + oy;
    if (sy < 2 || sy > 142) continue;
    const k = (t * 1.3 + ph) % 4;
    if (k < 1) sparkleScreen(x, sy, k < 0.5 ? 1 : 2, C.star);
    else fill(x, sy, 1, 1, C.starDim);
  }
}
/** Blit at a screen position, whatever the camera is doing. */
function blitScreen(l, x, y) {
  const saved = { ...cam };
  cam.x = 0; cam.y = 0; cam.s = 1; cam.dx = 0; cam.dy = 0;
  blit(l, x, y);
  Object.assign(cam, saved);
}
function sparkleScreen(x, y, r, c) {
  fill(x - r, y, r * 2 + 1, 1, c);
  fill(x, y - r, 1, r * 2 + 1, c);
}
/** A four-point twinkle in world space. */
export function sparkle(x, y, r, c = C.white) {
  if (r <= 0) return;
  rect(x - r, y, r * 2 + 1, 1, c);
  rect(x, y - r, 1, r * 2 + 1, c);
  if (r >= 3) {
    rect(x - 1, y - 1, 3, 3, c);
    rect(x - r, y, 1, 1, C.blue3);
    rect(x + r, y, 1, 1, C.blue3);
  }
}

/**
 * The stands: four tiers of fans, 512 wide so it can tile. Two frames so the crowd can bounce.
 * Also hangs last seasons' blue banners from the rafters.
 */
export function makeStands(frameNo) {
  return layer(512, 64, () => {
    fill(0, 0, 512, 64, C.stand0);
    for (let i = 0; i < 6; i++) {
      const bx = 30 + i * 86;
      fill(bx, 0, 12, 15, C.ink);
      fill(bx + 1, 0, 10, 14, C.blue0);
      fill(bx + 1, 0, 10, 1, C.blue1);
      fill(bx + 3, 3, 6, 1, C.blue2);
      fill(bx + 3, 6, 6, 1, C.blue2);
      fill(bx + 4, 9, 4, 1, C.blue2);
    }
    // Fans stay dim so the robots on the field carry the contrast.
    const shirts = ['#1f2c66', '#22388a', '#5c1f33', '#5e5226', '#4a5372', '#1f4f48', '#3c2c66', '#1f2c66'];
    const skins = ['#6e5446', '#54403a', '#80665a', '#43342e'];
    for (let tier = 0; tier < 4; tier++) {
      const y = 18 + tier * 11, dim = tier === 0 ? 0.45 : tier === 1 ? 0.6 : tier === 2 ? 0.75 : 0.9;
      fill(0, y + 8, 512, 3, tier % 2 ? C.stand2 : C.stand1);
      for (let x = 2; x < 508; x += 5) {
        const id = tier * 1000 + x;
        if (rnd(id) < 0.14) continue;
        const bounce = frameNo && rnd(id + 5) > 0.45 ? -1 : 0;
        const shirt = shirts[Math.floor(rnd(id + 1) * shirts.length)];
        withAlpha(dim, () => {
          fill(x, y + 3 + bounce, 4, 5, shirt);
          fill(x + 1, y + 1 + bounce, 2, 2, skins[Math.floor(rnd(id + 2) * skins.length)]);
          if (rnd(id + 3) > 0.95) fill(x - 1, y - 3 + bounce * 2, 6, 4, rnd(id + 4) > 0.5 ? '#8f98b8' : '#2f5fc0');
        });
      }
    }
    fill(0, 61, 512, 3, C.ink);
  });
}

/** Stands, field wall and carpet across the whole view. px = parallax factor for the stands. */
export function arena(stands, carpetTile, o = {}) {
  const view = 256 / cam.s;
  // Stands, tiled, moving slower than the field.
  const saved = { ...cam };
  cam.x = saved.x * (o.parallax ?? 0.5);
  const first = Math.floor(cam.x / 512) - 1;
  for (let i = first; i < first + 3 + Math.ceil(view / 512); i++) blit(stands, i * 512, -84);
  Object.assign(cam, saved);
  // Field wall: aluminum rail, posts, clear panels.
  const x0 = cam.x - 2, x1 = cam.x + view + 2;
  withAlpha(0.07, () => rect(x0, -20, x1 - x0, 18, C.blue3));
  rect(x0, -22, x1 - x0, 2, C.steel2);
  rect(x0, -22, x1 - x0, 1, C.steel3);
  for (let x = Math.floor(x0 / 48) * 48; x < x1; x += 48) {
    rect(x, -22, 2, 20, C.steel1);
    rect(x + 6, -18, 1, 6, C.blue3);
  }
  rect(x0, -3, x1 - x0, 3, C.steel0);
  // Carpet, tiled with the world.
  for (let x = Math.floor(x0 / 128) * 128; x < x1; x += 128) blit(carpetTile, x, 0);
}
export function makeCarpet() {
  return layer(128, 48, () => {
    fill(0, 0, 128, 48, C.carpet1);
    for (let i = 0; i < 700; i++) {
      const x = Math.floor(rnd(i + 0.25) * 128), y = Math.floor(rnd(i + 50.5) * 48);
      fill(x, y, 1, 1, rnd(i + 9) > 0.5 ? C.carpet0 : C.carpet2);
    }
    fill(0, 0, 128, 1, C.carpet2);
    fill(0, 9, 128, 1, C.tape);
    fill(0, 10, 128, 1, '#9aa0b4');
  });
}

// ---- People ----

/**
 * A drive team member, facing the camera, about 36px tall. (x, y) = feet.
 * o: skin, hair (index), style ('short' | 'long' | 'cap' | 'bun' | 'bangs'), shirt, arms ('down' | 'up' | 'hold'),
 *    smile, tablet, glasses ('up' = safety glasses pushed up on the head), straps (backpack).
 */
export function person(x, y, o = {}) {
  const X = snap(x), Y = snap(y);
  const skin = C.skin[o.skin ?? 0], hair = C.hair[o.hair ?? 0];
  const shirt = o.shirt ?? C.blue1, shirtHi = o.shirtHi ?? C.blue2, shirtLo = o.shirtLo ?? C.blue0;
  const p = (dx, dy, w, h, c) => rect(X + dx, Y + dy, w, h, c);
  // Arms behind the body when raised.
  const up = o.arms === 'up' || o.arms === 'hold';
  if (up) {
    const reach = o.arms === 'hold' ? -42 : -40;
    for (const ax of [-8, 6]) {
      p(ax - 1, reach - 1, 4, -22 - reach + 4, C.ink);
      p(ax, -24, 2, 4, shirt);
      p(ax, reach + 3, 2, -24 - reach - 3, skin);
      p(ax, reach, 2, 3, skin);
    }
  }
  // Legs and shoes.
  p(-5, -13, 10, 11, C.ink);
  p(-4, -12, 3, 10, '#2a2f45');
  p(1, -12, 3, 10, '#2a2f45');
  p(-6, -3, 5, 3, C.ink);
  p(1, -3, 5, 3, C.ink);
  p(-5, -2, 3, 1, C.steel2);
  p(2, -2, 3, 1, C.steel2);
  // Team shirt.
  p(-7, -25, 14, 13, C.ink);
  p(-6, -24, 12, 11, shirt);
  p(-6, -24, 2, 11, shirtHi);
  p(4, -24, 2, 11, shirtLo);
  p(-1, -20, 3, 3, C.white);
  p(-2, -24, 4, 1, skin);
  if (o.straps) {
    p(-4, -24, 1, 8, '#1d2236');
    p(3, -24, 1, 8, '#1d2236');
  }
  if (!up) {
    for (const ax of [-9, 7]) {
      p(ax, -25, 3, 12, C.ink);
      p(ax + (ax < 0 ? 1 : 0), -24, 2, 6, shirt);
      p(ax + (ax < 0 ? 1 : 0), -18, 2, 4, skin);
    }
  }
  if (o.tablet) {
    p(-4, -19, 9, 7, C.ink);
    p(-3, -18, 7, 5, C.blue3);
    p(-2, -17, 3, 1, C.white);
    p(-2, -15, 5, 1, C.blue1);
  }
  // Head.
  p(-5, -35, 10, 11, C.ink);
  p(-4, -34, 8, 9, skin);
  const style = o.style ?? 'short';
  if (style === 'cap') {
    p(-5, -36, 10, 4, C.ink);
    p(-4, -35, 8, 3, C.blue1);
    p(-4, -35, 8, 1, C.blue2);
    p(1, -33, 6, 2, C.blue0);
  } else if (style === 'bangs') {
    // A little volume on top, a straight fringe, locks over the ears, a shine.
    p(-4, -36, 8, 1, C.ink);
    p(-4, -35, 8, 5, hair);
    p(-4, -30, 1, 2, hair);
    p(3, -30, 1, 2, hair);
    p(-2, -34, 3, 1, '#2e3448');
  } else {
    p(-4, -34, 8, 3, hair);
    if (style === 'long') {
      p(-6, -33, 2, 10, C.ink);
      p(4, -33, 2, 10, C.ink);
      p(-5, -33, 1, 9, hair);
      p(4, -33, 1, 9, hair);
      p(-4, -31, 1, 3, hair);
      p(3, -31, 1, 3, hair);
    }
    if (style === 'bun') {
      p(-2, -38, 4, 4, C.ink);
      p(-1, -37, 2, 3, hair);
    }
  }
  // Safety glasses (on, or pushed up on the head with the eyes showing) and a grin.
  if (o.glasses === 'up') {
    p(-4, -33, 8, 1, C.ink);
    p(-3, -33, 2, 1, C.blue3);
    p(1, -33, 2, 1, C.blue3);
    p(-2, -29, 1, 1, C.ink);
    p(1, -29, 1, 1, C.ink);
    p(-3, -28, 1, 1, '#f0a58a');
    p(2, -28, 1, 1, '#f0a58a');
    if (o.smile) {
      p(-2, -27, 1, 1, '#5a2a22');
      p(1, -27, 1, 1, '#5a2a22');
      p(-1, -26, 2, 1, '#5a2a22');
    } else p(-1, -27, 2, 1, '#8a4a3a');
    return;
  }
  p(-4, -30, 8, 3, C.ink);
  p(-3, -29, 2, 1, C.blue3);
  p(1, -29, 2, 1, C.blue3);
  if (o.smile) {
    p(-2, -27, 4, 1, C.ink);
    p(-1, -26, 2, 1, C.red1);
  } else p(-1, -27, 2, 1, '#8a4a3a');
}

/** The gear emblem on the banner (11 x 11). */
const GEAR = [
  '....###....', '.##.###.##.', '.#########.', '..#######..', '####...####', '####...####',
  '####...####', '..#######..', '.#########.', '.##.###.##.', '....###....',
];

/**
 * The event winner banner, 44 x 56, top-left at (x, y).
 * o: sheen (0..1 position of a light sweep, or null), wave (cloth ripple phase).
 */
export function banner(x, y, o = {}) {
  const X = snap(x), Y = snap(y);
  const p = (dx, dy, w, h, c) => rect(X + dx, Y + dy, w, h, c);
  const wave = o.wave ?? 0;
  for (let col = 0; col < 44; col++) {
    const dy = Math.round(Math.sin(wave + col * 0.25) * 0.8);
    p(col - 1, -1 + dy, 1, 58, C.ink);
    p(col + 1, -1 + dy, 1, 58, C.ink);
  }
  for (let col = 0; col < 44; col++) {
    const dy = Math.round(Math.sin(wave + col * 0.25) * 0.8);
    const shade = col < 2 || col > 41 ? C.blue0 : C.blue1;
    p(col, dy, 1, 56, shade);
    if (col >= 4 && col <= 39) {
      p(col, dy + 3, 1, 1, C.white);
      p(col, dy + 52, 1, 1, C.white);
    }
    if (col === 4 || col === 39) p(col, dy + 3, 1, 50, C.white);
  }
  // Grommets.
  p(2, 1, 2, 2, C.steel3);
  p(40, 1, 2, 2, C.steel3);
  GEAR.forEach((row, r) => [...row].forEach((ch, c) => ch === '#' && p(16 + c, 7 + r, 1, 1, C.white)));
  text('2019', X + 22, Y + 21, { font: 3, color: C.white, align: 'center' });
  text('REGIONAL', X + 22, Y + 28, { font: 3, color: C.blue3, align: 'center' });
  text('WINNER', X + 22, Y + 36, { color: C.white, align: 'center', shadow: C.blue0, sx: 0, sy: 1 });
  p(14, 47, 16, 1, C.blue2);
  p(20, 49, 4, 1, C.blue2);
  if (o.sheen != null) {
    const sx = Math.round(-20 + o.sheen * 84);
    withAlpha(0.45, () => {
      for (let r = 0; r < 56; r++) {
        const a = Math.max(0, sx - r / 2), b = Math.min(44, sx - r / 2 + 7);
        if (b > a) p(Math.round(a), r, Math.round(b - a), 1, C.white);
      }
    });
  }
}
