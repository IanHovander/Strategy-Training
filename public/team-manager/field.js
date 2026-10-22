// The 2019 field (Deep Space) at the same scale as the people, 8 pixels to the foot, seen from its long side by the
// walker's camera (20 degrees down, so a foot of depth is under 3 pixels). The floor recedes and everything on it stands
// up, drawn in depth order. Blue alliance on the left, red on the right; the field is two screens long, so you only ever
// see part of it. Both HABs (levels 1-3) against the alliance walls, loading stations in the corners, depots, the cargo
// ship in the middle, a rocket on the far wall in each half, tape, and four robots running cycles. The stands are past
// the far wall (bleachers.js), with the walkway between, as close as anyone off the drive teams gets.

import { rnd, useContext, camera } from './pixel.js';
import { eleBot, defBot, armBot } from './sprites.js';

export const WORLD_W = 512;
const FT = 8, DEEP = 2.75; // pixels per foot along the field, and per foot of depth
export const FIELD = { x0: 40, x1: 472, y0: 68, mid: 256 };
/** The floor line this many feet in from the far wall. */
export const floorY = (ft) => FIELD.y0 + ft * DEEP;
FIELD.y1 = floorY(27);
const INK = '#0b0d17';
const ALLIANCE = {
  blue: { dark: '#0a237a', base: '#1d55e8', light: '#4a90ff', pale: '#a8d2ff' },
  red: { dark: '#5e0d17', base: '#d3212f', light: '#ff5b4d', pale: '#ffb3a3' },
};
const HATCH = '#ffc61a', HATCH_DARK = '#c48a0a', CARGO = '#ff7a1c', CARGO_LIGHT = '#ffb46a';
const TAPE = '#e8ecf5';
/** The opening in the far wall, chained off: a volunteer stands by it. */
export const GATE = { x0: 92, x1: 108 };
const WALL_H = 13; // the side walls are 20 inches of clear polycarbonate

const rect = (g, x, y, w, h, c) => {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};
// The red end is the blue end mirrored.
const mirrorX = (alliance, x, w = 0) => (alliance === 'blue' ? x : FIELD.x0 + FIELD.x1 - x - w);

/** A box standing on the floor: its top, then the face toward you, outlined. x, w along the field; z0-z1 feet deep. */
function box(g, ox, x, w, z0, z1, h, top, front, edge) {
  const yTop = floorY(z0) - h, yFront = floorY(z1) - h, yFloor = floorY(z1);
  rect(g, x - ox - 1, yTop - 1, w + 2, yFloor - yTop + 2, INK);
  rect(g, x - ox, yTop, w, yFront - yTop, top);
  rect(g, x - ox, yTop, w, 1, edge);
  rect(g, x - ox, yFront, w, yFloor - yFront, front);
  return { yTop, yFront, yFloor };
}

// ---- The floor, drawn once ----
export function makeFloor() {
  const c = document.createElement('canvas');
  c.width = WORLD_W;
  c.height = 144;
  const g = c.getContext('2d');
  rect(g, 0, FIELD.y0 - 2, WORLD_W, 146 - FIELD.y0, '#181b29');
  rect(g, FIELD.x0, FIELD.y0, FIELD.x1 - FIELD.x0, FIELD.y1 - FIELD.y0, '#2b2e3a');
  for (let i = 0; i < 2600; i++) {
    const x = FIELD.x0 + Math.floor(rnd(i) * (FIELD.x1 - FIELD.x0)), y = FIELD.y0 + Math.floor(rnd(i + 3000) * (FIELD.y1 - FIELD.y0));
    rect(g, x, y, 1, 1, rnd(i + 6000) < 0.5 ? '#30333f' : '#272a35');
  }
  // Diamond plate in the driver stations.
  for (let y = FIELD.y0; y < FIELD.y1; y += 3) {
    for (let x = (y / 3) % 2 ? 1 : 3; x < FIELD.x0 - 6; x += 4) {
      rect(g, x, y, 1, 1, '#262a3b');
      rect(g, WORLD_W - 1 - x, y, 1, 1, '#262a3b');
    }
  }
  for (const a of ['blue', 'red']) {
    // The HAB line along the front of level 1.
    rect(g, mirrorX(a, FIELD.x0 + 7.5 * FT), FIELD.y0, 1, FIELD.y1 - FIELD.y0, TAPE);
    // Alignment lines out from the rocket's ports and from the cargo ship's side bays.
    const rx = ROCKETS.find((r) => r.alliance === a).x;
    rect(g, rx, floorY(ROCKET_Z), 1, 3 * DEEP, TAPE);
    for (const bx of shipBays(a)) {
      rect(g, bx, floorY(SHIP.z1), 1, 1.5 * DEEP, TAPE);
      rect(g, bx, floorY(SHIP.z0 - 1.5), 1, 1.5 * DEEP, TAPE);
    }
    // Cargo depots beside the HAB: a low bin of balls on each side of it.
    for (const z of [4.6, 20.6]) {
      const x = mirrorX(a, FIELD.x0, 3.5 * FT);
      const top = floorY(z), bottom = floorY(z + 1.8);
      rect(g, x - 1, top - 3, 3.5 * FT + 2, bottom - top + 4, INK);
      rect(g, x, top - 2, 3.5 * FT, bottom - top + 2, '#3f4761');
      rect(g, x, top - 2, 3.5 * FT, 1, '#5d6580');
      for (let i = 0; i < 6; i++) {
        rect(g, x + 2 + i * 4, top - 4 + (i % 2), 3, 3, INK);
        rect(g, x + 2 + i * 4, top - 4 + (i % 2), 2, 2, CARGO);
      }
    }
  }
  return c;
}

// ---- The walls ----
/** A side wall of clear panels on posts, at depth z, the length of the field. */
function sideWall(g, ox, z, gate) {
  const y = floorY(z) - WALL_H, x0 = FIELD.x0 - ox, w = FIELD.x1 - FIELD.x0;
  const panels = gate ? [[FIELD.x0, gate.x0], [gate.x1, FIELD.x1]] : [[FIELD.x0, FIELD.x1]];
  for (const [a, b] of panels) {
    g.globalAlpha = 0.22;
    rect(g, a - ox, y, b - a, WALL_H, '#a8d2ff');
    g.globalAlpha = 1;
    rect(g, a - ox, y, b - a, 1, '#c4cbe0');
    rect(g, a - ox, floorY(z) - 2, b - a, 2, '#3f4761');
  }
  for (let x = FIELD.x0; x <= FIELD.x1; x += 4 * FT) {
    if (gate && x > gate.x0 - 2 && x < gate.x1 + 2) continue;
    rect(g, x - ox - 1, y - 1, 2, WALL_H + 1, '#7882a3');
  }
  if (!gate) return;
  // The gate: a gap in the panels, posts either side, and a yellow and black chain across.
  const gx = gate.x0 - ox, gw = gate.x1 - gate.x0;
  for (const px of [gx - 2, gx + gw]) {
    rect(g, px, y - 3, 3, WALL_H + 3, INK);
    rect(g, px + 1, y - 2, 1, WALL_H + 1, '#c4cbe0');
  }
  for (let i = 0; i < gw; i += 2) rect(g, gx + i, y + 4 + (i > 2 && i < gw - 4 ? 1 : 0), 2, 1, (i / 2) % 2 ? HATCH : INK);
}

/** An alliance wall, edge-on from here: its top rail, then its end. */
function allianceWall(g, ox, alliance) {
  const c = ALLIANCE[alliance];
  const x = mirrorX(alliance, FIELD.x0 - 6, 6);
  box(g, ox, x, 6, 0, 27, 6.5 * FT, c.light, c.base, c.pale);
  // The bottom three feet are diamond plate, the rest clear: a line marks where the glass starts.
  rect(g, x - ox, floorY(27) - 3 * FT, 6, 1, c.dark);
}

function loadingStation(g, ox, alliance, z) {
  const c = ALLIANCE[alliance];
  const w = 1.25 * FT, x = mirrorX(alliance, FIELD.x0, w);
  const { yFront, yFloor } = box(g, ox, x, w, z, z + 1.75, 4 * FT, c.base, c.dark, c.light);
  // The cargo chute at the top, and a hatch panel waiting in its slot.
  const cx = x - ox + w / 2;
  rect(g, cx - 4, yFront + 3, 8, 7, INK);
  rect(g, cx - 3, yFront + 4, 6, 5, CARGO);
  rect(g, cx - 3, yFront + 4, 2, 2, CARGO_LIGHT);
  rect(g, cx - 4, yFloor - 14, 8, 10, INK);
  rect(g, cx - 3, yFloor - 13, 6, 8, HATCH);
  rect(g, cx - 1, yFloor - 10, 2, 2, HATCH_DARK);
}

// ---- The HABs ----
// Steel diamond-plate platforms on alliance-coloured risers, the way the intro draws them.
const PLATE = { 1: ['#3f4761', '#5d6580'], 2: ['#5d6580', '#7882a3'], 3: ['#7882a3', '#aab2c8'] };
function hab(g, ox, alliance) {
  const c = ALLIANCE[alliance];
  const step = (level, x, w, z0, z1, h) => {
    const [plate, dot] = PLATE[level], bx = mirrorX(alliance, x, w);
    const { yTop, yFront } = box(g, ox, bx, w, z0, z1, h, plate, c.base, '#c4cbe0');
    for (let y = Math.ceil(yTop) + 2; y < yFront - 1; y += 2) {
      for (let x = bx + ((y >> 1) % 2 ? 1 : 3); x < bx + w - 1; x += 4) rect(g, x - ox, y, 1, 1, dot);
    }
    if (h > 3) rect(g, bx - ox, yFront, w, 1, c.light);
  };
  // Level 1 (3 inches) across the front, level 2 (6) either side of level 3 (19) against the wall.
  step(1, FIELD.x0 + 4 * FT, 3.5 * FT, 6.7, 20.3, 2);
  step(2, FIELD.x0, 4 * FT, 7.5, 11.5, 4);
  step(3, FIELD.x0, 4 * FT, 11.5, 15.5, 13);
  step(2, FIELD.x0, 4 * FT, 15.5, 19.5, 4);
}

// ---- The cargo ship ----
const SHIP = { x0: FIELD.mid - 4 * FT, x1: FIELD.mid + 4 * FT, z0: 11.2, z1: 15.8, h: 4 * FT };
/** Where the side bays are: three each side of the middle, along the face toward you. */
const shipBays = (alliance) => [0, 1, 2].map((i) => (alliance === 'blue' ? SHIP.x0 + 5 + i * 9 : SHIP.x1 - 6 - i * 9));
// What's in them so far, per bay, blue's three then red's: [cargo, hatch].
const SHIP_FILL = [[1, 1], [0, 1], [0, 0], [1, 1], [1, 1], [0, 0]];

function cargoShip(g, ox) {
  const { yTop, yFront, yFloor } = box(g, ox, SHIP.x0, SHIP.x1 - SHIP.x0, SHIP.z0, SHIP.z1, SHIP.h, '#aab2c8', '#5d6580', '#e3e7f0');
  const half = (SHIP.x1 - SHIP.x0) / 2;
  rect(g, SHIP.x0 - ox, yTop + 1, half, 1, ALLIANCE.blue.light);
  rect(g, SHIP.x0 - ox + half, yTop + 1, half, 1, ALLIANCE.red.light);
  rect(g, SHIP.x0 - ox, yFront, half, 2, ALLIANCE.blue.base);
  rect(g, SHIP.x0 - ox + half, yFront, half, 2, ALLIANCE.red.base);
  rect(g, SHIP.x0 - ox + half - 1, yFront, 2, yFloor - yFront, '#3f4761');
  // Each bay: the cargo opening at the top, the hatch port 19 inches up.
  [...shipBays('blue'), ...shipBays('red')].forEach((bx, i) => {
    const [cargo, hatch] = SHIP_FILL[i];
    const x = bx - ox - 3;
    rect(g, x, yFront + 4, 7, 6, INK);
    if (cargo) {
      rect(g, x + 1, yFront + 5, 5, 4, CARGO);
      rect(g, x + 1, yFront + 5, 2, 1, CARGO_LIGHT);
    }
    rect(g, x, yFloor - 17, 7, 8, INK);
    rect(g, x + 1, yFloor - 16, 5, 6, hatch ? HATCH : '#2b2e3a');
    if (hatch) rect(g, x + 3, yFloor - 14, 1, 2, HATCH_DARK);
  });
}

// ---- The rockets ----
// One on the far wall in each half (the near wall's two are behind you). Seen from the front: angled hatch faces either
// side, cargo ports up the middle, a nose cone on top.
const ROCKET_Z = 2.2, ROCKET_H = 8.2 * FT;
const ROCKETS = [{ x: FIELD.x0 + 19 * FT, alliance: 'blue' }, { x: FIELD.x1 - 19 * FT, alliance: 'red' }];

function rocket(g, ox, cx, alliance) {
  const c = ALLIANCE[alliance];
  const x = cx - ox, b = floorY(ROCKET_Z), top = b - ROCKET_H;
  rect(g, x - 14, top + 6, 28, ROCKET_H - 5, INK);
  rect(g, x - 8, top, 16, 8, INK);
  rect(g, x - 7, top + 1, 14, 6, c.base);
  rect(g, x - 7, top + 1, 14, 1, c.light);
  rect(g, x - 4, top - 2, 8, 3, INK);
  rect(g, x - 3, top - 1, 6, 2, c.light);
  rect(g, x - 13, top + 7, 26, ROCKET_H - 7, '#c4cbe0');
  rect(g, x - 13, top + 7, 6, ROCKET_H - 7, '#9aa3bd');
  rect(g, x + 7, top + 7, 6, ROCKET_H - 7, '#7882a3');
  rect(g, x - 13, top + 11, 26, 2, c.base);
  rect(g, x - 13, b - 5, 26, 2, c.base);
  // Hatch ports at 19, 47 and 75 inches on both angled faces; cargo ports at 27, 55 and 83 up the middle.
  [13, 31, 50].forEach((up, i) => {
    for (const fx of [x - 13, x + 8]) {
      rect(g, fx, b - up - 3, 5, 6, INK);
      if (i < 2) {
        rect(g, fx + 1, b - up - 2, 3, 4, HATCH);
        rect(g, fx + 2, b - up - 1, 1, 2, HATCH_DARK);
      }
    }
  });
  [18, 37, 56].forEach((up, i) => {
    rect(g, x - 4, b - up - 3, 8, 7, INK);
    if (i < 2) {
      rect(g, x - 3, b - up - 2, 6, 5, CARGO);
      rect(g, x - 3, b - up - 2, 2, 2, CARGO_LIGHT);
    }
  });
}

// ---- The robots ----
const ease = (p) => (1 - Math.cos(Math.PI * p)) / 2;
/** 0 to 1 and back, lingering at both ends: a robot loading up, then scoring. */
const shuttle = (t, speed, phase) => ease((Math.sin(t * speed + phase) + 1) / 2);
const heading = (t, speed, phase) => (Math.cos(t * speed + phase) >= 0 ? 1 : -1);
const arriving = (p) => Math.max(0, (p - 0.85) / 0.15);
function robots(t) {
  const a = shuttle(t, 0.42, 0), b = shuttle(t, 0.35, 1.3), d = shuttle(t, 0.38, 2.4);
  const toA = heading(t, 0.42, 0), toB = heading(t, 0.35, 1.3), toD = heading(t, 0.38, 2.4);
  const rsl = (k) => Math.floor(t * 2.5 + k) % 2 === 0;
  const blueRocket = ROCKETS[0].x, redRocket = ROCKETS[1].x;
  return [
    // 5026: a hatch from the far loading station up to its rocket, the elevator rising as it gets there.
    {
      x: FIELD.x0 + 26 + a * (blueRocket - 46 - FIELD.x0), y: floorY(4),
      draw: (x, y) => eleBot(x, y, { team: 'blue', num: '5026', dir: toA, spin: x * 0.64, rsl: rsl(0), hatch: toA > 0, e1: arriving(a) * 0.5 }),
    },
    // A blue partner with cargo, depot to the cargo ship's side bays.
    {
      x: FIELD.x0 + 9 * FT + b * (SHIP.x0 - FIELD.x0 - 11 * FT), y: floorY(17.4),
      draw: (x, y) => armBot(x, y, { team: 'blue', num: '3000', dir: toB, spin: x * 0.64, angle: -0.35 + arriving(b) * 0.25 }),
    },
    // 7777, playing defence in front of the blue rocket.
    {
      x: blueRocket + 20 + Math.sin(t * 0.6) * 22, y: floorY(7 + Math.cos(t * 0.8) * 1.2),
      draw: (x, y) => defBot(x, y, { dir: Math.cos(t * 0.6) >= 0 ? 1 : -1, spin: x * 0.64, glint: (t * 0.5) % 1, num: '7777', rsl: rsl(1) }),
    },
    // A red partner cycling from its loading station to its rocket.
    {
      x: FIELD.x1 - 26 - d * (FIELD.x1 - 46 - redRocket), y: floorY(4.4),
      draw: (x, y) => eleBot(x, y, { team: 'red', num: '4000', dir: -toD, spin: x * 0.64, rsl: rsl(1), hatch: toD > 0, e1: arriving(d) * 0.5 }),
    },
  ];
}

/** The far side wall, drawn over anyone on the walkway behind it. */
export const drawFarWall = (g, camX) => sideWall(g, camX, 0, GATE);

/**
 * Everything on the field that stands up, back to front, seen through a camera at camX. o.who: screen rectangles
 * { x0, x1, y1 } of anyone on the walkway, so a rocket in front of them goes see-through. o.more: more things standing
 * on the floor to sort in with the rest, as { y: floor line, draw() }.
 */
export function drawFieldLive(g, camX, t, o = {}) {
  const who = o.who ?? [];
  const things = [
    ...ROCKETS.map((r) => ({ y: floorY(ROCKET_Z), span: [r.x - 14, r.x + 14], top: floorY(ROCKET_Z) - ROCKET_H, draw: () => rocket(g, camX, r.x, r.alliance) })),
    ...['blue', 'red'].flatMap((a) => [
      { y: floorY(2.25), draw: () => loadingStation(g, camX, a, 0.5) },
      { y: floorY(27), draw: () => loadingStation(g, camX, a, 25.25) },
      { y: floorY(20.3), draw: () => hab(g, camX, a) },
      { y: floorY(27), draw: () => allianceWall(g, camX, a) },
    ]),
    { y: floorY(SHIP.z1), draw: () => cargoShip(g, camX) },
    ...robots(t).map((r) => ({ y: r.y, draw: () => { useContext(g); camera(camX, 0, 1); r.draw(r.x, r.y); } })),
    ...(o.more ?? []),
    { y: FIELD.y1 + 1, draw: () => sideWall(g, camX, 27) },
  ];
  for (const p of things.sort((p, q) => p.y - q.y)) {
    const hides = p.span && who.some((w) => w.x1 > p.span[0] - camX && w.x0 < p.span[1] - camX && w.y1 > p.top);
    if (hides) g.globalAlpha = 0.35;
    p.draw();
    g.globalAlpha = 1;
  }
}
