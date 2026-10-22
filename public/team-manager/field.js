// The 2019 field (Deep Space) at the same scale as the people, 8 pixels to the foot, seen from its long side by the
// walker's camera (20 degrees down, so a foot of depth is under 3 pixels). The floor recedes and everything on it stands
// up, drawn back to front. Blue alliance on the left, red on the right; the field is two screens long and the arena
// floor carries on past both ends, so you only ever see part of it.
// On the field: both HABs, loading stations in the corners, depots, the cargo ship, a rocket on the far wall in each
// half (drawn like the intro's), tape, and four robots running cycles. The drive teams stand in their stations. Past the
// blue end is the queue for the next match; past the red end, the scoring table. The stands are beyond the far wall
// (bleachers.js), with the walkway between. Everything is in world pixels, drawn through pixel.js's camera.

import { C, useContext, camera, screen, rect, disk, text, withAlpha, rnd } from './pixel.js';
import { eleBot, defBot, armBot, cargo } from './sprites.js';

/** Open floor past each end of the field. */
export const END = 136;
export const WORLD_W = 512 + 2 * END;
const FT = 8, DEEP = 2.75; // pixels per foot along the field, and per foot of depth
export const FIELD = { x0: END + 40, x1: END + 472, y0: 68, mid: END + 256 };
/** The floor line this many feet in from the far wall. */
export const floorY = (ft) => FIELD.y0 + ft * DEEP;
FIELD.y1 = floorY(27);
/** How deep the driver stations are, behind the alliance walls. */
export const STATION = 40;

const TEAM = { blue: [C.blue0, C.blue1, C.blue2, C.blue3], red: [C.red0, C.red1, C.red2, C.red3] };
const STEEL = '#5d6580', PANEL = '#aab2c8', CARPET = '#2b2e3a', CONCRETE = '#353a4c', DARK = '#181b29', HOLE = '#11131c';
/** The opening in the far wall, chained off: a volunteer stands by it. */
export const GATE = { x0: FIELD.x0 + 52, x1: FIELD.x0 + 68 };
const WALL_H = 13; // the side walls are 20 inches of clear polycarbonate

// The red end is the blue end mirrored.
const mirrorX = (alliance, x, w = 0) => (alliance === 'blue' ? x : FIELD.x0 + FIELD.x1 - x - w);
const ease = (p) => (1 - Math.cos(Math.PI * Math.max(0, Math.min(1, p)))) / 2;

/** A box standing on the floor: its top, then the face toward you, outlined. x, w along the field; z0-z1 feet deep. */
function box(x, w, z0, z1, h, top, front, edge) {
  const yTop = floorY(z0) - h, yFront = floorY(z1) - h, yFloor = floorY(z1);
  rect(x - 1, yTop - 1, w + 2, yFloor - yTop + 2, C.ink);
  rect(x, yTop, w, yFront - yTop, top);
  rect(x, yTop, w, 1, edge);
  rect(x, yFront, w, yFloor - yFront, front);
  return { yTop, yFront, yFloor };
}

// ---- The floor, drawn once ----
export function makeFloor() {
  const c = document.createElement('canvas');
  c.width = WORLD_W;
  c.height = 144;
  const prev = useContext(c.getContext('2d'));
  screen();
  // Concrete past the ends, then the driver stations' diamond plate, then the field's carpet.
  rect(0, FIELD.y0 - 2, WORLD_W, 146 - FIELD.y0, CONCRETE);
  for (let i = 0; i < 1400; i++) {
    rect(Math.floor(rnd(i + 9000) * WORLD_W), FIELD.y0 - 2 + Math.floor(rnd(i + 9500) * 78), 1, 1, rnd(i + 9900) < 0.5 ? '#3b4154' : '#30354a');
  }
  rect(FIELD.x0 - STATION, FIELD.y0 - 2, FIELD.x1 - FIELD.x0 + 2 * STATION, 146 - FIELD.y0, DARK);
  for (let y = FIELD.y0; y < FIELD.y1; y += 3) {
    for (let x = (y / 3) % 2 ? 1 : 3; x < STATION - 6; x += 4) {
      rect(FIELD.x0 - STATION + x, y, 1, 1, '#262a3b');
      rect(FIELD.x1 + STATION - 1 - x, y, 1, 1, '#262a3b');
    }
  }
  rect(FIELD.x0, FIELD.y0, FIELD.x1 - FIELD.x0, FIELD.y1 - FIELD.y0, CARPET);
  for (let i = 0; i < 2600; i++) {
    const x = FIELD.x0 + Math.floor(rnd(i) * (FIELD.x1 - FIELD.x0)), y = FIELD.y0 + Math.floor(rnd(i + 3000) * (FIELD.y1 - FIELD.y0));
    rect(x, y, 1, 1, rnd(i + 6000) < 0.5 ? '#30333f' : '#272a35');
  }
  for (const a of ['blue', 'red']) {
    // The HAB line along the front of level 1.
    rect(mirrorX(a, FIELD.x0 + 7.5 * FT), FIELD.y0, 1, FIELD.y1 - FIELD.y0, C.tape);
    // Alignment lines: out from the rocket, from the cargo ship's side bays, and from its two front bays.
    rect(ROCKETS.find((r) => r.alliance === a).x, floorY(ROCKET_Z), 1, 3 * DEEP, C.tape);
    for (const bx of shipBays(a)) rect(bx, floorY(SHIP.z1), 1, 1.5 * DEEP, C.tape);
    for (const z of [12.4, 14.6]) rect(mirrorX(a, SHIP.x0 - 1.5 * FT, 1.5 * FT), floorY(z), 1.5 * FT, 1, C.tape);
    // Cargo depots beside the HAB: a low bin of balls on each side of it.
    for (const z of [4.6, 20.6]) {
      const x = mirrorX(a, FIELD.x0, 3.5 * FT);
      const top = floorY(z), bottom = floorY(z + 1.8);
      rect(x - 1, top - 3, 3.5 * FT + 2, bottom - top + 4, C.ink);
      rect(x, top - 2, 3.5 * FT, bottom - top + 2, '#3f4761');
      rect(x, top - 2, 3.5 * FT, 1, STEEL);
      for (let i = 0; i < 6; i++) {
        rect(x + 2 + i * 4, top - 4 + (i % 2), 3, 3, C.ink);
        rect(x + 2 + i * 4, top - 4 + (i % 2), 2, 2, C.org1);
      }
    }
  }
  // The queue lane past the blue end, taped out on the concrete.
  for (const y of [QUEUE_LANE.y0, QUEUE_LANE.y1]) {
    for (let x = QUEUE_LANE.x0; x < QUEUE_LANE.x1; x += 4) rect(x, y, 3, 1, C.yel1);
  }
  useContext(prev);
  return c;
}

// ---- Walls and barriers ----
/** A side wall of clear panels on posts, at depth z, the length of the field. */
function sideWall(z, gate) {
  const y = floorY(z) - WALL_H;
  const panels = gate ? [[FIELD.x0, gate.x0], [gate.x1, FIELD.x1]] : [[FIELD.x0, FIELD.x1]];
  for (const [a, b] of panels) {
    withAlpha(0.22, () => rect(a, y, b - a, WALL_H, C.blue3));
    rect(a, y, b - a, 1, C.steel3);
    rect(a, floorY(z) - 2, b - a, 2, '#3f4761');
  }
  for (let x = FIELD.x0; x <= FIELD.x1; x += 4 * FT) {
    if (gate && x > gate.x0 - 2 && x < gate.x1 + 2) continue;
    rect(x - 1, y - 1, 2, WALL_H + 1, C.steel2);
  }
  if (!gate) return;
  // The gate: a gap in the panels, posts either side, and a yellow and black chain across.
  const gw = gate.x1 - gate.x0;
  for (const px of [gate.x0 - 2, gate.x1]) {
    rect(px, y - 3, 3, WALL_H + 3, C.ink);
    rect(px + 1, y - 2, 1, WALL_H + 1, C.steel3);
  }
  for (let i = 0; i < gw; i += 2) rect(gate.x0 + i, y + 4 + (i > 2 && i < gw - 4 ? 1 : 0), 2, 1, (i / 2) % 2 ? C.yel1 : C.ink);
}

/** An alliance wall, edge-on from here: its top rail, then its end. */
function allianceWall(alliance) {
  const T = TEAM[alliance];
  const x = mirrorX(alliance, FIELD.x0 - 6, 6);
  box(x, 6, 0, 27, 6.5 * FT, T[2], T[1], T[3]);
  // The bottom three feet are diamond plate, the rest clear: a line marks where the glass starts.
  rect(x, floorY(27) - 3 * FT, 6, 1, T[0]);
}

/** One post of the belt barrier across the back of a driver station, with the belt back to the post behind it. */
function stanchion(alliance, z, behind) {
  const x = mirrorX(alliance, FIELD.x0 - STATION + 1), y = floorY(z);
  if (behind != null) rect(x, floorY(behind) - 19, 1, floorY(z) - floorY(behind), TEAM[alliance][1]);
  rect(x - 3, y - 1, 7, 2, C.ink);
  rect(x - 1, y - 22, 3, 22, C.ink);
  rect(x, y - 21, 1, 21, C.steel3);
}

function loadingStation(alliance, z) {
  const T = TEAM[alliance];
  const w = 1.25 * FT, x = mirrorX(alliance, FIELD.x0, w);
  const { yFront, yFloor } = box(x, w, z, z + 1.75, 4 * FT, T[1], T[0], T[2]);
  // The cargo chute at the top, and a hatch panel waiting in its slot.
  const cx = x + w / 2;
  rect(cx - 4, yFront + 3, 8, 7, C.ink);
  rect(cx - 3, yFront + 4, 6, 5, C.org1);
  rect(cx - 3, yFront + 4, 2, 2, C.org2);
  rect(cx - 4, yFloor - 14, 8, 10, C.ink);
  rect(cx - 3, yFloor - 13, 6, 8, C.yel1);
  rect(cx - 1, yFloor - 10, 2, 2, C.yel0);
}

// ---- The HABs ----
// Steel diamond-plate platforms on alliance-coloured risers, the way the intro draws them.
const PLATE = { 1: ['#3f4761', STEEL], 2: [STEEL, C.steel2], 3: [C.steel2, PANEL] };
function hab(alliance) {
  const T = TEAM[alliance];
  const step = (level, x, w, z0, z1, h) => {
    const [plate, dot] = PLATE[level], bx = mirrorX(alliance, x, w);
    const { yTop, yFront } = box(bx, w, z0, z1, h, plate, T[1], C.steel3);
    for (let y = Math.ceil(yTop) + 2; y < yFront - 1; y += 2) {
      for (let x = bx + ((y >> 1) % 2 ? 1 : 3); x < bx + w - 1; x += 4) rect(x, y, 1, 1, dot);
    }
    if (h > 3) rect(bx, yFront, w, 1, T[2]);
  };
  // Level 1 (3 inches) across the front, level 2 (6) either side of level 3 (19) against the wall.
  step(1, FIELD.x0 + 4 * FT, 3.5 * FT, 6.7, 20.3, 2);
  step(2, FIELD.x0, 4 * FT, 7.5, 11.5, 4);
  step(3, FIELD.x0, 4 * FT, 11.5, 15.5, 13);
  step(2, FIELD.x0, 4 * FT, 15.5, 19.5, 4);
}

// ---- The cargo ship ----
// Each alliance's half is a bit under 8 feet long, joined at the centre line. On the side toward you each half has three
// bays: a hatch port 19 inches up and the cargo opening above its lip. The two front bays face the HAB, edge-on from
// here; from above you see into every bay.
const SHIP = { x0: FIELD.mid - 63, x1: FIELD.mid + 63, z0: 11.2, z1: 15.8, h: 4 * FT };
const BAY_W = 15;
/** The middles of each half's three side bays, from the centre line out. */
const shipBays = (alliance) => [0, 1, 2].map((i) => mirrorX(alliance, FIELD.mid - 8 - i * BAY_W));
// What's in each half's bays so far: the near side's [cargo, hatch] from the middle out, the far side's cargo, the front pair's.
const SHIP_FILL = {
  blue: { near: [[1, 1], [0, 1], [0, 0]], far: [1, 1, 0], front: [1, 0] },
  red: { near: [[1, 1], [1, 1], [0, 0]], far: [1, 0, 0], front: [1, 1] },
};

/** A hatch panel face-on: the yellow disc with its six-inch hole, which shows the cargo if there's any behind it. */
function hatchFaceOn(cx, cy, full) {
  disk(cx, cy, 7, C.ink);
  disk(cx, cy, 6, C.yel1);
  rect(cx - 4, cy - 4, 3, 2, C.yel2);
  rect(cx - 5, cy - 2, 1, 3, C.yel2);
  rect(cx + 3, cy + 2, 2, 2, C.yel0);
  disk(cx, cy, 2, C.ink);
  if (full) rect(cx - 1, cy - 1, 2, 2, C.org1);
}

function cargoShip() {
  const { yTop, yFront, yFloor } = box(SHIP.x0, SHIP.x1 - SHIP.x0, SHIP.z0, SHIP.z1, SHIP.h, HOLE, PANEL, C.steel3);
  const deck = yFront - yTop, rowH = Math.floor((deck - 3) / 2);
  for (const a of ['blue', 'red']) {
    const T = TEAM[a], fill = SHIP_FILL[a];
    const half = mirrorX(a, SHIP.x0, 63);
    // From above: the near row and far row of bays, the front pair at the end, the rim round it all.
    rect(half, yTop, 63, 1, C.steel3);
    rect(half, yTop + 1 + rowH, 63, 1, C.steel2);
    rect(half, yFront - 1, 63, 1, T[2]);
    const edges = [1, 2, 3].map((i) => mirrorX(a, FIELD.mid - 1 - i * BAY_W, 1));
    for (const x of edges) rect(x, yTop, 1, deck, C.steel2);
    shipBays(a).forEach((cx, i) => {
      if (fill.far[i]) rect(cx - 2, yTop + 2, 4, rowH - 1, C.org1);
      if (fill.near[i][0]) {
        rect(cx - 2, yTop + 2 + rowH, 4, rowH - 1, C.org1);
        rect(cx - 2, yTop + 2 + rowH, 2, 1, C.org2);
      }
    });
    fill.front.forEach((full, i) => {
      if (full) rect(mirrorX(a, SHIP.x0 + 7) - 2, yTop + 2 + i * (rowH + 1), 4, rowH - 1, C.org1);
    });
    // The side toward you: the alliance's colour along the bottom, its outer end painted, then the bays.
    rect(half, yFloor - 5, 63, 5, C.steel0);
    rect(half, yFloor - 6, 63, 1, T[1]);
    const nose = mirrorX(a, SHIP.x0, 17);
    rect(nose, yFront, 17, yFloor - yFront - 6, T[1]);
    rect(nose, yFront, 17, 1, T[2]);
    for (let k = 0; k < 3; k++) rect(mirrorX(a, SHIP.x0 + 3 + k * 4, 11 - k * 4), yFront + 6 + k * 5, 11 - k * 4, 2, T[2]);
    for (const x of edges) rect(x, yFront, 1, yFloor - yFront - 5, C.steel2);
    shipBays(a).forEach((cx, i) => {
      const [hasCargo, hasHatch] = fill.near[i], port = yFloor - 12;
      // The cargo opening, above its lip at 31 inches; a ball shows over the lip if one's in.
      rect(cx - 5, yFloor - 31, 10, 10, C.ink);
      rect(cx - 4, yFloor - 30, 8, 8, HOLE);
      if (hasCargo) cargo(cx, yFloor - 24, 3);
      rect(cx - 5, yFloor - 21, 10, 1, C.steel3);
      if (hasHatch) hatchFaceOn(cx, port, hasCargo);
      else {
        disk(cx, port, 5, C.steel2);
        disk(cx, port, 4, C.ink);
        disk(cx, port, 3, HOLE);
      }
    });
  }
  rect(FIELD.mid - 1, yTop, 2, deck, C.steel2);
  rect(FIELD.mid - 1, yFront, 2, yFloor - yFront, C.steel1);
}

// ---- The rockets ----
// One on the far wall in each half (the near wall's two are behind you), seen from the front: the intro's rocket turned
// to face you. Silver hull, alliance bands, the nose cone, the skirt. Hatch ports on the two angled faces at 19, 47 and
// 75 inches; round cargo ports up the middle at 27, 55 and 83.
const ROCKET_Z = 2.2;
const ROCKETS = [{ x: FIELD.x0 + 19 * FT, alliance: 'blue' }, { x: FIELD.x1 - 19 * FT, alliance: 'red' }];
const HATCH_UP = [13, 31, 50], CARGO_UP = [18, 37, 56], HULL = 64, CONE = 9;
const coneW = (i) => Math.max(1, Math.round(14 * Math.sin(((i + 1) / CONE) * (Math.PI / 2)) ** 0.75));

/** A hatch panel on an angled face: an upright yellow ellipse with its hole, like the intro draws it edge-on. */
function hatchOnFace(cx, cy) {
  rect(cx - 2, cy - 7, 5, 14, C.ink);
  rect(cx - 3, cy - 5, 7, 10, C.ink);
  rect(cx - 2, cy - 6, 5, 12, C.yel1);
  rect(cx - 2, cy - 5, 1, 10, C.yel2);
  rect(cx + 2, cy - 5, 1, 10, C.yel0);
  rect(cx - 1, cy - 1, 2, 3, C.ink);
}

function rocket(cx, alliance, fill) {
  const T = TEAM[alliance], b = floorY(ROCKET_Z), top = b - HULL;
  // Outlines: the cone, the hull, the skirt.
  for (let i = 0; i < CONE; i++) rect(cx - coneW(i) - 1, top - CONE + i, coneW(i) * 2 + 2, 1, C.ink);
  rect(cx - coneW(0) - 1, top - CONE - 1, coneW(0) * 2 + 2, 1, C.ink);
  rect(cx - 15, top, 30, HULL - 4, C.ink);
  rect(cx - 17, b - 6, 34, 6, C.ink);
  // Nose cone: the alliance colour at the tip, silver below, shaded on the right, a glint on the left.
  for (let i = 0; i < CONE; i++) {
    const hw = coneW(i), y = top - CONE + i, tip = i < 3;
    rect(cx - hw, y, hw * 2, 1, tip ? T[1] : C.steel3);
    rect(cx + hw - Math.max(1, hw >> 1), y, Math.max(1, hw >> 1), 1, tip ? T[0] : C.steel2);
    if (hw > 3) rect(cx - hw + 2, y, 1, 1, tip ? T[2] : C.white);
  }
  // Hull: the left face catches the light, the middle is silver with a highlight, the right face is in shade.
  rect(cx - 14, top, 6, HULL - 5, C.steel3);
  rect(cx - 12, top, 2, HULL - 5, C.white);
  rect(cx - 8, top, 16, HULL - 5, PANEL);
  rect(cx - 7, top, 1, HULL - 5, C.steel3);
  rect(cx + 8, top, 6, HULL - 5, C.steel2);
  rect(cx + 12, top, 2, HULL - 5, C.steel1);
  for (const x of [cx - 8, cx + 8]) rect(x, top, 1, HULL - 5, C.steel2);
  // Alliance bands between the levels and round the top.
  for (const up of [HULL, 45, 26]) {
    rect(cx - 14, b - up, 28, 3, T[1]);
    rect(cx - 14, b - up, 28, 1, T[2]);
    rect(cx + 8, b - up, 6, 3, T[0]);
  }
  // Skirt with its vents.
  rect(cx - 16, b - 5, 32, 5, C.steel1);
  rect(cx - 16, b - 5, 32, 1, C.steel2);
  for (let x = cx - 14; x < cx + 15; x += 5) rect(x, b - 3, 2, 1, C.steel0);
  // The ports. Home is the face toward the alliance's own end.
  const [homeX, awayX] = alliance === 'blue' ? [cx - 11, cx + 11] : [cx + 11, cx - 11];
  HATCH_UP.forEach((up, l) => {
    for (const [x, full] of [[homeX, fill.home[l]], [awayX, fill.away[l]]]) {
      if (full) hatchOnFace(x, b - up);
      else {
        rect(x - 2, b - up - 5, 4, 10, C.ink);
        rect(x - 1, b - up - 4, 2, 8, C.steel0);
      }
    }
  });
  CARGO_UP.forEach((up, l) => {
    disk(cx, b - up, 6, C.ink);
    disk(cx, b - up, 5, C.steel1);
    rect(cx - 4, b - up - 4, 2, 1, C.steel2);
    disk(cx, b - up, 4, C.ink);
    if (fill.cargo[l]) cargo(cx, b - up, 3);
  });
}

// ---- The robots ----
/** A trip out and back: a = 0 at the start, 1 at the far end, lingering at both; n counts the trips. */
function cycle(t, perSecond, offset) {
  const u = t * perSecond + offset, n = Math.floor(u), f = u - n;
  return { n, out: f < 0.5, a: ease((1 - Math.cos(2 * Math.PI * u)) / 2) };
}
const arriving = (a) => Math.max(0, (a - 0.85) / 0.15);
const rsl = (t, k) => Math.floor(t * 2.5 + k) % 2 === 0;

/**
 * Hatch runs to the alliance's rocket: from the far loading station along the wall to its home face, where the
 * elevator lifts the hatch to level 2, then level 3 the next time. Level 1 went on in the sandstorm.
 */
function hatchRun(t, alliance, num, perSecond, offset) {
  const c = cycle(t, perSecond, offset), level = c.n % 2, s = alliance === 'blue' ? 1 : -1;
  const rx = ROCKETS.find((r) => r.alliance === alliance).x;
  const from = mirrorX(alliance, FIELD.x0 + 18), to = rx - s * 31;
  const lift = arriving(c.a) * (level ? 1 : 0.36);
  return {
    fill: { home: [true, level === 1 || !c.out, level === 1 && !c.out], away: [true, true, false], cargo: [true, true, false] },
    bot: {
      x: from + c.a * (to - from), y: floorY(2.6),
      draw: (x, y) => eleBot(x, y, { team: alliance, num, dir: c.out ? s : -s, spin: x * 0.64, rsl: rsl(t, 0), hatch: c.out, e1: lift }),
    },
  };
}

function robots(t) {
  const blue = hatchRun(t, 'blue', '5026', 1 / 14, 0), red = hatchRun(t, 'red', '4000', 1 / 16, 0.4);
  const p = cycle(t, 1 / 17, 0.3);
  const depot = [FIELD.x0 + 50, 22], ship = [SHIP.x0 - 26, 13.5];
  const blueRocket = ROCKETS[0].x;
  return {
    fill: { blue: blue.fill, red: red.fill },
    bots: [
      blue.bot,
      red.bot,
      // A blue partner with cargo: from the near depot to the cargo ship's front bays, arm down to pick up, up to score.
      {
        x: depot[0] + p.a * (ship[0] - depot[0]), y: floorY(depot[1] + p.a * (ship[1] - depot[1])),
        draw: (x, y) => armBot(x, y, { team: 'blue', num: '3000', dir: p.out ? 1 : -1, spin: x * 0.64, angle: 0.9 - 1.15 * p.a, ball: p.out }),
      },
      // 7777, playing defence in front of the blue rocket's scoring side.
      {
        x: blueRocket - 38 + Math.sin(t * 0.6) * 20, y: floorY(6.5 + Math.cos(t * 0.8) * 1.2),
        draw: (x, y) => defBot(x, y, { dir: Math.cos(t * 0.6) >= 0 ? 1 : -1, spin: x * 0.64, glint: (t * 0.5) % 1, num: '7777', rsl: rsl(t, 1) }),
      },
    ],
  };
}

// ---- Past the ends ----
// Blue end: the queue for the next match, robots on their carts. Red end: the scoring table and a field reset cart.
const QUEUE_LANE = { x0: 42, x1: 128, y0: 96, y1: 132 };
const QUEUE = [{ x: 63, y: 120, num: '2468', bot: 'arm' }, { x: 106, y: 120, num: '1357', bot: 'ele' }];
const SIGN = { x: 24, y: 130 };
const TABLE = { x0: WORLD_W - 120, x1: WORLD_W - 56, y: 102 };
const RESET = { x: WORLD_W - 92, y: 132 };

function robotCart(x, y, draw) {
  // A low dolly on casters, the robot riding on its deck.
  rect(x - 19, y - 12, 38, 10, C.ink);
  rect(x - 18, y - 11, 36, 6, '#4b3a2a');
  rect(x - 18, y - 11, 36, 1, '#7a5e42');
  rect(x - 18, y - 5, 36, 3, '#2a2018');
  for (const cx of [x - 15, x + 13]) {
    rect(cx - 1, y - 2, 4, 2, C.ink);
    rect(cx, y - 2, 2, 1, C.steel2);
  }
  draw(x, y - 7);
}

function queueSign() {
  const { x, y } = SIGN;
  rect(x - 4, y - 1, 9, 2, C.ink);
  rect(x - 1, y - 26, 3, 26, C.ink);
  rect(x, y - 25, 1, 25, C.steel3);
  rect(x - 14, y - 38, 30, 13, C.ink);
  rect(x - 13, y - 37, 28, 11, C.yel1);
  text('QUEUE', x + 1, y - 34, { font: 3, color: C.ink, align: 'center' });
}

function scoringTable() {
  const { x0, x1, y } = TABLE, top = y - 20, back = top - 7;
  rect(x0 - 1, back - 1, x1 - x0 + 2, y - back + 2, C.ink);
  rect(x0, back, x1 - x0, 7, '#3a3d48');
  rect(x0, back, x1 - x0, 1, '#5a5e6c');
  rect(x0, top, x1 - x0, 20, '#141519');
  rect(x0, top, x1 - x0, 1, '#3a3d48');
  text('SCORING', (x0 + x1) / 2, top + 8, { font: 3, color: C.steel2, align: 'center' });
  // The score on two monitors facing the crowd, and a laptop.
  [['41', C.blue1, x0 + 14], ['38', C.red1, x0 + 34]].forEach(([n, c, mx]) => {
    rect(mx - 1, back - 2, 2, 4, C.ink);
    rect(mx - 9, back - 15, 18, 13, C.ink);
    rect(mx - 8, back - 14, 16, 11, c);
    text(n, mx, back - 12, { color: C.white, align: 'center' });
  });
  rect(x1 - 18, back - 4, 12, 5, C.ink);
  rect(x1 - 17, back - 3, 10, 3, C.steel1);
}

function resetCart() {
  const { x, y } = RESET;
  rect(x - 17, y - 9, 34, 9, C.ink);
  rect(x - 16, y - 8, 32, 5, C.steel1);
  rect(x - 16, y - 8, 32, 1, C.steel2);
  for (const cx of [x - 13, x + 11]) rect(cx, y - 2, 3, 2, C.ink);
  // A rack of hatch panels, edge-on, and a bin of cargo.
  for (let i = 0; i < 6; i++) {
    rect(x - 15 + i * 3, y - 21, 3, 13, C.ink);
    rect(x - 14 + i * 3, y - 20, 2, 11, i % 2 ? C.yel1 : C.yel2);
  }
  rect(x + 3, y - 15, 13, 7, C.ink);
  rect(x + 4, y - 14, 11, 5, '#3f4761');
  for (const [dx, dy] of [[6, -15], [10, -16], [13, -14]]) {
    rect(x + dx - 1, y + dy - 1, 4, 4, C.ink);
    rect(x + dx, y + dy, 2, 2, C.org1);
  }
}

// ---- Where people can stand ----
const WALK_Y = [56, 64]; // the walkway, behind the far wall
const OPEN_Y = [56, 134]; // the floor past the ends
const EDGE = FIELD.x0 - STATION - 8; // as close to the driver stations as anyone else gets
const inEnd = (x) => x <= EDGE || x >= WORLD_W - EDGE;
const BLOCKS = [
  ...QUEUE.map((q) => ({ x0: q.x - 19, x1: q.x + 19, y0: q.y - 9, y1: q.y })),
  { x0: SIGN.x - 4, x1: SIGN.x + 4, y0: SIGN.y - 3, y1: SIGN.y },
  { x0: TABLE.x0, x1: TABLE.x1, y0: TABLE.y - 7, y1: TABLE.y },
  { x0: RESET.x - 17, x1: RESET.x + 17, y0: RESET.y - 8, y1: RESET.y },
];
const blocked = (x, y) => BLOCKS.some((b) => x > b.x0 - 5 && x < b.x1 + 5 && y > b.y0 - 2 && y < b.y1 + 2);
/** Step someone at (x, y) by (dx, dy): along, then across, each as far as the walkway or the open floor allows. */
export function move(x, y, dx, dy) {
  let nx = Math.max(10, Math.min(WORLD_W - 10, x + dx));
  if (y > WALK_Y[1] && !inEnd(nx)) nx = x < FIELD.mid ? EDGE : WORLD_W - EDGE;
  if (blocked(nx, y)) nx = x;
  const [lo, hi] = inEnd(nx) ? OPEN_Y : WALK_Y;
  let ny = Math.max(lo, Math.min(hi, y + dy));
  if (blocked(nx, ny)) ny = y;
  return [nx, ny];
}

/**
 * Everything that stands up, back to front, seen through a camera at camX. o.who: screen rectangles { x0, x1, y1 }
 * of anyone on the walkway, so a rocket in front of them goes see-through. o.more: people and anything else standing on
 * the floor, to sort in with the rest, as { y: floor line, draw() }.
 */
export function drawFieldLive(g, camX, t, o = {}) {
  const who = o.who ?? [];
  const { fill, bots } = robots(t);
  const things = [
    { y: FIELD.y0, draw: () => sideWall(0, GATE) },
    ...ROCKETS.map((r) => ({
      y: floorY(ROCKET_Z), span: [r.x - 17, r.x + 17], top: floorY(ROCKET_Z) - HULL - CONE,
      draw: () => rocket(r.x, r.alliance, fill[r.alliance]),
    })),
    ...['blue', 'red'].flatMap((a) => [
      { y: floorY(2.25), draw: () => loadingStation(a, 0.5) },
      { y: floorY(27), draw: () => loadingStation(a, 25.25) },
      { y: floorY(20.3), draw: () => hab(a) },
      { y: floorY(27), draw: () => allianceWall(a) },
      ...[0, 9, 18, 27].map((z, i, zs) => ({ y: floorY(z), draw: () => stanchion(a, z, zs[i - 1]) })),
    ]),
    { y: floorY(SHIP.z1), draw: cargoShip },
    ...bots.map((r) => ({ y: r.y, draw: () => r.draw(r.x, r.y) })),
    ...QUEUE.map((q) => ({
      y: q.y,
      draw: () => robotCart(q.x, q.y, (x, y) => (q.bot === 'arm'
        ? armBot(x, y, { team: 'blue', num: q.num, angle: -1.25, ball: false })
        : eleBot(x, y, { team: 'blue', num: q.num, rsl: false }))),
    })),
    { y: SIGN.y, draw: queueSign },
    { y: TABLE.y, draw: scoringTable },
    { y: RESET.y, draw: resetCart },
    ...(o.more ?? []),
    { y: FIELD.y1 + 1, draw: () => sideWall(27) },
  ];
  useContext(g);
  for (const p of things.sort((p, q) => p.y - q.y)) {
    camera(camX, 0, 1);
    const hides = p.span && who.some((w) => w.x1 > p.span[0] - camX && w.x0 < p.span[1] - camX && w.y1 > p.top);
    if (hides) withAlpha(0.35, p.draw);
    else p.draw();
  }
}
