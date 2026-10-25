// The cast and the set: robots, the game pieces (cargo and hatch panels), the 2019 rocket and HAB, the crowd, people and
// the blue banner.
// Robots are drawn from the floor up: (x, y) is the middle of the robot at the floor under its wheels.
// World units are game pixels at camera scale 1 (about 1.5 inches each).

import { C, cam, rect, disk, text, measure, snap, layer, blit, withAlpha, rnd, dither, fill } from './pixel.js';
import { walkerFrame, CELL_W, CELL_H, FOOT_X, FOOT_Y } from './walker.js';
import { student, tones, HAIR, SKIN, hairPal, skinBody } from './cast.js';

// ---- Robot parts ----
// Shared with match/bots.js, which draws the match's other kinds of robot the same way.
// A drawing frame: d is the facing (+1 right, -1 left) times a squash used to fake a spin.
export const frame = (x, y, d) => ({ x: snap(x), y: snap(y), d });
export function part(f, dx, dy, w, h, c) {
  const a = f.x + f.d * dx, b = f.x + f.d * (dx + w);
  rect(Math.min(a, b), f.y + dy, Math.abs(b - a), h, c);
}
export const TEAM = {
  blue: [C.blue0, C.blue1, C.blue2, C.blue3],
  red: [C.red0, C.red1, C.red2, C.red3],
};
const RING = [[-2, -2], [-1, -2], [0, -2], [1, -2], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-2, 1], [-2, 0], [-2, -1]];

/** A 6px wheel centered between pixels (cx, cy); spin moves the tread marks. */
export function wheel(f, cx, cy, spin) {
  part(f, cx - 2, cy - 3, 4, 6, C.ink);
  part(f, cx - 3, cy - 2, 6, 4, C.ink);
  part(f, cx - 2, cy - 2, 4, 4, C.tire);
  part(f, cx - 1, cy - 1, 2, 2, C.steel2);
  const i = ((Math.floor(spin) % 12) + 12) % 12;
  for (const j of [i, (i + 6) % 12]) part(f, cx + RING[j][0], cy + RING[j][1], 1, 1, C.steel1);
}

/** Fabric bumpers with the team number, the way every FRC robot wears them. */
export function bumper(f, x0, w, top, cols, num) {
  part(f, x0 - 1, top - 1, w + 2, 9, C.ink);
  part(f, x0, top, w, 7, cols[1]);
  part(f, x0, top, w, 1, cols[2]);
  part(f, x0, top + 6, w, 1, cols[0]);
  if (num && Math.abs(f.d) > 0.7) {
    const mid = f.x + f.d * (x0 + w / 2);
    text(num, Math.round(mid - measure(num, { font: 3 }) / 2), f.y + top + 1, { font: 3, color: C.white });
  }
}

// ---- The game pieces ----
// Cargo is an orange playground ball, 13 inches across (about 9 pixels). A hatch panel is a ring of clear polycarbonate
// 19 inches across (about 13 pixels) with a 6-inch hole in the middle: white hook-and-loop tape round its edge, a
// yellow band printed inside that and a dark ring round the hole, and clear plastic between, so whatever is behind it
// shows through. A null hatch panel (fixed on a cargo ship bay before the match, worth nothing) is the same with two
// strips of white tape across it, either side of the hole. Each view is a small grid of letters, one per pixel:
//   k ink (the outline)   w white tape   s white tape in shade   y yellow band   d yellow in shade   l yellow in light
//   g the clear plastic (a faint sheen over what's behind)   h the dark ring round the hole   o the hole (nothing)
// and in capitals, where a null panel's white tape goes across (otherwise the same in small letters).
// The caller draws what's behind a panel first: the bay it closes, the cargo in it, or the robot holding it.
/** Each letter's colour and how solid it is. */
const PIECE = {
  k: [C.ink, 1], w: [C.white, 1], s: [C.steel3, 1], y: [C.yel1, 1], d: [C.yel0, 1], l: [C.yel2, 1],
  g: [C.blue3, 0.22], h: ['#2a3044', 0.4],
};
/** A grid as runs of one letter along each row, worked out once per grid: [an ordinary panel's, a null one's]. */
const RUNS = new Map();
function runsOf(rows, isNull) {
  if (!RUNS.has(rows)) {
    RUNS.set(rows, [false, true].map((nul) => {
      const runs = [];
      rows.forEach((row, j) => {
        const at = (i) => (row[i] >= 'A' && row[i] <= 'Z' ? (nul ? 'w' : row[i].toLowerCase()) : row[i]);
        for (let i = 0; i < row.length;) {
          const ch = at(i);
          let n = 1;
          while (i + n < row.length && at(i + n) === ch) n++;
          if (PIECE[ch]) runs.push({ i, j, n, ch });
          i += n;
        }
      });
      return runs;
    }));
  }
  return RUNS.get(rows)[isNull ? 1 : 0];
}
function piece(rows, x0, y0, o = {}) {
  const at = o.f ? (r, c) => part(o.f, x0 + r.i, y0 + r.j, r.n, 1, c) : (r, c) => rect(x0 + r.i, y0 + r.j, r.n, 1, c);
  const runs = runsOf(rows, !!o.null);
  for (const r of runs) if (PIECE[r.ch][1] === 1) at(r, PIECE[r.ch][0]);
  // The see-through letters after, each with its transparency set once.
  for (const ch of ['g', 'h']) withAlpha(PIECE[ch][1], () => { for (const r of runs) if (r.ch === ch) at(r, PIECE[ch][0]); });
}

/** Face on, 14 pixels across (the near side of the cargo ship), centred on the corner at (cx, cy) as disk() is. */
const HATCH_FACE = [
  '....kkkkkk....',
  '...kwwwwwwk...',
  '..kwlllllywk..',
  '.kwlllggyyywk.',
  'kwllgghhggyysk',
  'kwllghoohgydsk',
  'kwLGHooooHGDsk',
  'kwLGHooooHGDsk',
  'kwlyghoohgddsk',
  'kwyygghhggddsk',
  '.kwyyyggdddsk.',
  '..kwydddddsk..',
  '...kssssssk...',
  '....kkkkkk....',
];
export function hatchFace(cx, cy, o = {}) {
  piece(HATCH_FACE, cx - 7, cy - 7, o);
}

/**
 * On a rocket's angled face, turned most of the way from you: an upright ellipse 8 pixels wide and 14 tall, centred
 * on the corner at (cx, cy). The left face shows its lit edge on the left (dir -1, the default), the right one mirrored.
 */
const HATCH_SIDE = [
  '..kkkk..',
  '.kwwwwk.',
  'kwllllsk',
  'kwlggdsk',
  'kwlggdsk',
  'kwyhhdsk',
  'kwyoodsk',
  'kwyoodsk',
  'kwyhhdsk',
  'kwyggdsk',
  'kwyggdsk',
  'kwddddsk',
  '.kssssk.',
  '..kkkk..',
];
const HATCH_SIDE_R = HATCH_SIDE.map((r) => [...r].reverse().join(''));
export function hatchSide(cx, cy, o = {}) {
  piece(o.dir > 0 ? HATCH_SIDE_R : HATCH_SIDE, cx - 4, cy - 7, o);
}

/**
 * Held by a robot, its face across the robot's way, so you see it almost edge-on: the white edge, a sliver of the
 * yellow band and of the clear plastic, the robot showing through. dx is its near edge from the frame's middle, cy the
 * middle of its height.
 */
const HATCH_HELD = [
  '.kkkk.',
  'kwwwsk',
  'kwllsk',
  'kwygsk',
  'kwygsk',
  'kwyhsk',
  'kwyosk',
  'kwyosk',
  'kwyhsk',
  'kwygsk',
  'kwygsk',
  'kwdgsk',
  'kwddsk',
  'kwsssk',
  '.kkkk.',
];
export function hatchPart(f, dx, cy, o = {}) {
  piece(HATCH_HELD, dx - 1, cy - 7, { ...o, f });
}
export const hatch = (x, cy) => hatchPart(frame(x, 0, 1), 0, cy);

/** Lying flat on the carpet: from 20 degrees up, an ellipse 14 wide and 5 deep, its middle at (x, y). */
const HATCH_FLAT = [
  '...kkkkkkkk...',
  '.kkwllllllwkk.',
  'kwygghoohggdsk',
  '.kkssddddsskk.',
  '...kkkkkkkk...',
];
export function hatchFlat(x, y, o = {}) {
  piece(HATCH_FLAT, Math.round(x) - 7, Math.round(y) - 3, o);
}

/** In small, 10 pixels across, face on, for a sign or a status display; centred on the corner at (cx, cy). */
const HATCH_ICON = [
  '...kkkk...',
  '.kkwwwwkk.',
  '.kwlllywk.',
  'kwlggggysk',
  'kwLGooGDsk',
  'kwLGooGDsk',
  'kwyggggdsk',
  '.kwydddsk.',
  '.kksssskk.',
  '...kkkk...',
];
export function hatchIcon(cx, cy, o = {}) {
  piece(HATCH_ICON, cx - 5, cy - 5, o);
}

/** A cargo ball. o.bare: no outline, for a ball seen through an opening or a clear panel. */
export function cargo(x, y, r = 4, o = {}) {
  if (!o.bare) disk(x, y, r + 1, C.ink);
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
 * o: dir (default faces left), k, spin, glint (0..1 sweeps a highlight across the light bar), num, team (red if not given).
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
  bumper(f, -18, 36, -12, TEAM[o.team ?? 'red'], o.num ?? '7777');
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
 * The rocket, seen from the front as the field draws it (field.js): a hatch port on each of its two angled faces and its
 * round cargo ports up the middle, the hull 28 wide from x = rx, so its left face is where the intro's robot places a
 * hatch panel. The intro's rocket is taller than the field's, its levels where the robot's elevator reaches.
 * Each level holds two cargo, one behind each hatch: a ball shows through the clear panel on its side, and its top
 * shows low in the cargo port on that side (as field.js has it).
 * o: home / away: hatch panels on the left and the right face, three booleans each, bottom level first (hatches: the
 *    same as home); cargo: each level's [home, away] bays (true for both); lights: the cargo ports' ring lights.
 */
export const ROCKET_LEVELS = [-22, -50, -78];
/** The hatch faces' middles, out from the rocket's; where a ball in a bay sits as you see it in the port. */
const FACE_X = 11, PEEK = { dx: 5, dy: 4 };
const PORT_DARK = '#0e1019';
/** Each level's cargo port, above its hatch ports (at 27.5, 55.5 and 83.5 inches to their 19, 47 and 75). */
const PORT_UP = [5, 5, 4];

/** A ball of radius r at (x, y) in cargo's colours, drawn only where inside(x, y) says: seen through an opening. */
function ballIn(x, y, r, inside) {
  for (let j = -r; j < r; j++) {
    for (let i = -r; i < r; i++) {
      const px = x + i, py = y + j;
      if ((i + 0.5) ** 2 + (j + 0.5) ** 2 > r * r || !inside(px, py)) continue;
      rect(px, py, 1, 1, i + j < -r * 0.6 ? C.org2 : i + j > r * 0.5 ? C.org0 : C.org1);
    }
  }
}

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

  const cx = rx + 14, home = o.home ?? o.hatches ?? [];
  const bays = (l) => {
    const c = o.cargo?.[l];
    return Array.isArray(c) ? { home: !!c[0], away: !!c[1] } : { home: !!c, away: !!c };
  };
  ROCKET_LEVELS.forEach((cy, l) => {
    const ball = bays(l);
    // A hatch port on each face: the cutout dark, a ball behind it if that side's bay has one, the panel over it.
    for (const [face, s, full] of [['home', -1, home[l]], ['away', 1, o.away?.[l]]]) {
      const x = cx + s * FACE_X;
      rect(x - 3, cy - 6, 6, 12, C.ink);
      rect(x - 2, cy - 5, 4, 10, PORT_DARK);
      if (ball[face]) ballIn(x, cy + 1, 4, (px, py) => px >= x - 2 && px < x + 2 && py >= cy - 5 && py < cy + 5);
      if (full) hatchSide(x, cy, { dir: s });
    }
    // The cargo port, with its ring light, and low in it the top of a ball in each side's bay.
    const py = cy - PORT_UP[l], lit = o.lights?.[l];
    disk(cx, py, 6, C.ink);
    disk(cx, py, 5, lit ? C.blue2 : C.steel1);
    rect(cx - 4, py - 4, 2, 1, lit ? C.blue3 : C.steel2);
    disk(cx, py, 4, PORT_DARK);
    for (const [face, s] of [['home', -1], ['away', 1]]) {
      if (ball[face]) ballIn(cx + s * PEEK.dx, py + PEEK.dy, 4, (px, qy) => (px - cx + 0.5) ** 2 + (qy - py + 0.5) ** 2 <= 16);
    }
  });
}

// The alliance wall, seen end on from the side of the field: 6 ft 6 in tall, aluminum diamond plate up to 3 ft and clear
// polycarbonate above. The drivers' shelf sticks out behind it at 3 ft.
const WALL = { top: -52, plate: -24 };

// The 5026 drive team, in safety glasses: two drivers in team shirts, and the coach, a mentor in the team hoodie.
const restyle = (base, id, hair, body = {}) => ({ ...base, id, pal: { ...base.pal, ...body }, headPal: { ...base.headPal, ...hair } });
// The far driver stands a little deeper in the shot, so their tee, jeans and glasses are each a step down their ramp
// (the tee takes the hem's reds), and their hair is black and their skin darker against the near driver's.
const FAR_DRIVER = restyle(student(25), '5026-driver-2', { ...HAIR.black, q: C.steel2 }, {
  shirt: ['#6b0f1b', '#a1172a', '#d3212f'], jeans: ['#252e52', '#34416e', '#4a5b92'], cuff: ['#34416e', '#4a5b92', '#6b80b8'],
});
const DRIVERS = [student(4), FAR_DRIVER];
// The coach has a darker skin than the near driver and hair a lighter grey than the crowd's, so even at the edge of
// the shot they read as someone else, and older.
const COACH = restyle(student(11, 'hoodie'), '5026-coach', { ...SKIN.deep, ...hairPal('#6a6a72', '#9a9aa4', '#c8c8d0') },
  { ...skinBody('deep'), jeans: tones.khaki, cuff: tones.khaki });

/** Someone on the walker's rig, feet at (x, y), scaled with the camera. */
const rigPerson = (x, y, dir, gait, look, frame = 0) =>
  blit({ canvas: walkerFrame(dir, gait, frame, look), w: CELL_W, h: CELL_H }, Math.round(x) - FOOT_X, Math.round(y) - FOOT_Y);
/** A soft shadow on the floor under someone standing at (x, y). */
const shadow = (x, y) => withAlpha(0.45, () => {
  rect(x - 6, y - 1, 12, 2, '#05060d');
  rect(x - 4, y - 2, 8, 3, '#05060d');
});

/**
 * The HAB at the alliance wall: level 1 runs along the floor, level 3 is the tall step at x = x3,
 * and the alliance wall stands at x3 + 40, with the drive team behind it, facing the field.
 * o: cheer (the drive team jumps, pumping their fists), t (beats, for the jumps), glow (the alliance light strip lights up),
 * red (a red alliance's HAB and wall: blue otherwise).
 */
export const HAB = { l1: -2, l3: -16, depth: 40 };
export function hab(x3, o = {}) {
  const x0 = cam.x - 4, x1 = cam.x + 260 / cam.s;
  const wx = x3 + HAB.depth, { top, plate } = WALL;
  // The alliance's colours: blue unless o.red.
  const T = o.red ? [C.red0, C.red1, C.red2, C.red3] : [C.blue0, C.blue1, C.blue2, C.blue3];
  // Past the alliance wall the field's guardrail stops: behind the drive team there's only the dark of the arena,
  // and the carpet of their station going back from the wall.
  rect(wx + 3, -22, x1 - wx, 22, C.stand0);
  rect(wx + 3, -7, x1 - wx, 7, C.carpet1);
  rect(wx + 3, -7, x1 - wx, 1, C.carpet0);
  for (let x = wx + 3; x < x1; x += 3) rect(x, -6 + Math.floor(rnd(x) * 6), 1, 1, rnd(x + 0.5) > 0.5 ? C.carpet0 : C.carpet2);
  // Level 1 plate, up to the wall: past it the drive team stands on their station's carpet.
  const xw = Math.min(x1, wx);
  rect(x0, HAB.l1 - 1, xw - x0, 3, C.ink);
  rect(x0, HAB.l1, xw - x0, 2, C.steel1);
  for (let x = Math.floor(x0 / 4) * 4; x < xw - 2; x += 4) rect(x + ((x / 4) & 1) * 2, HAB.l1, 1, 1, C.steel2);
  // The drive team, facing the field, back to front: the coach a step behind, part out of the shot, and two drivers
  // side by side at the shelf, close to the glass. The far driver stands a little nearer the wall, so from here only
  // their hair, the front of their face and their hands show past the near driver; the rest of them is hidden behind.
  // At the buzzer they all turn three-quarters to us, still toward the field, and jump: arms thrown up in a V at the top
  // of each jump, pulled in as they land, each to their own beat. The frame's edge cuts off most of the coach.
  // On the shelf, against the wall and between the two drivers, the emergency stop (a red button on a yellow box), and
  // after the buzzer their controllers, put down on either side of it, lit along the top.
  const sx = wx + 6;
  const pad = (x, y) => {
    rect(x - 1, plate - 4 + y, 6, 4, C.ink);
    rect(x, plate - 3 + y, 4, 1, C.steel2);
    rect(x, plate - 2 + y, 4, 1, C.steel1);
    rect(x + 1, plate - 3 + y, 1, 1, C.red1);
  };
  const shelf = [
    () => o.cheer && pad(sx + 3, -1),
    () => {
      rect(sx + 1, plate - 4, 4, 4, C.ink);
      rect(sx + 2, plate - 3, 2, 2, C.yel1);
      rect(sx + 1, plate - 5, 4, 2, C.ink);
      rect(sx + 2, plate - 5, 2, 1, C.red1);
    },
    () => o.cheer && pad(sx + 5, 0),
  ];
  const team = [
    { x: wx + 31, y: -2, look: COACH, jump: 0.8, coach: true },
    { x: wx + 15, y: -1, look: DRIVERS[1], jump: Math.PI / 2, then: shelf.slice(0, 2) },
    { x: wx + 18, y: 0, look: DRIVERS[0], jump: 0, then: shelf.slice(2) },
  ];
  for (const p of team) shadow(p.x, p.y);
  for (const p of team) {
    const up = Math.abs(Math.sin((o.t ?? 0) * Math.PI + p.jump)), high = up > 0.5;
    // Landing, knees bent, they sink a unit lower.
    const bob = o.cheer ? Math.max(0, Math.round(up * 4) - (high ? 0 : 1)) : 0;
    rigPerson(p.x, p.y - bob, o.cheer ? 'sw' : 'w', o.cheer ? 'celebrate' : p.coach ? 'stand' : 'drive', p.look, high ? 0 : 1);
    for (const draw of p.then ?? []) draw();
  }
  // The near end of the shelf, a foot deep at 3 ft, on its bracket: in front of the drivers, like a console.
  rect(sx, plate - 1, 10, 4, C.ink);
  rect(sx + 1, plate, 8, 2, C.steel1);
  rect(sx + 1, plate, 8, 1, C.steel3);
  rect(sx, plate + 3, 5, 1, C.ink);
  rect(sx, plate + 4, 3, 1, C.ink);
  rect(sx, plate + 5, 1, 1, C.ink);
  rect(sx + 1, plate + 2, 3, 1, C.steel0);
  rect(sx + 1, plate + 3, 1, 1, C.steel0);
  // The wall itself, end on, the way the arena draws it: a box 9 inches deep in the alliance's blues, lit along its
  // top and its field side (down to level 3, which hides the rest), with a dark line 3 ft up where the diamond plate
  // stops and the glass starts. Above it, the pale edge of the clear polycarbonate on the drivers' side.
  rect(wx - 1, top - 1, 8, 1 - top, C.ink);
  rect(wx, top, 6, -top, T[1]);
  rect(wx, top, 1, HAB.l3 - 1 - top, T[2]);
  rect(wx, top, 6, 1, T[3]);
  withAlpha(0.5, () => rect(wx + 5, top + 1, 1, plate - top - 1, T[3]));
  // The 3 ft line is the end of the alliance light strip along the top of the plate: lit, it blinks.
  rect(wx, plate, 6, 1, o.glow ? T[3] : T[0]);
  if (o.glow) rect(wx, plate + 1, 6, 1, T[2]);
  // On top: the team number sign, a flat panel seen edge on (the number faces the field), and sitting on it the stack
  // light that shows the robot is connected.
  rect(wx + 1, top - 5, 4, 5, C.ink);
  rect(wx + 2, top - 4, 2, 3, '#16204a');
  rect(wx + 2, top - 4, 1, 3, T[2]);
  rect(wx + 1, top - 8, 4, 4, C.ink);
  rect(wx + 2, top - 7, 2, 1, T[2]);
  rect(wx + 2, top - 7, 1, 1, T[3]);
  rect(wx + 2, top - 6, 2, 1, C.org0);
  // Level 3 platform.
  rect(x3 - 1, HAB.l3 - 1, HAB.depth + 2, HAB.l1 - HAB.l3 + 1, C.ink);
  rect(x3, HAB.l3, HAB.depth, HAB.l1 - HAB.l3, T[1]);
  rect(x3, HAB.l3, HAB.depth, 2, C.steel3);
  for (let x = 0; x < HAB.depth; x += 3) rect(x3 + x, HAB.l3, 1, 1, C.steel2);
  rect(x3, HAB.l3 + 2, HAB.depth, 1, T[2]);
  rect(x3, HAB.l1 - 2, HAB.depth, 1, T[0]);
  for (let x = 4; x < HAB.depth - 2; x += 8) rect(x3 + x, HAB.l3 + 5, 4, 6, T[0]);
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
