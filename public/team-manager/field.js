// The 2019 field (Deep Space) from above, long side to you: blue alliance on the left, red on the right. Both HABs
// (levels 1, 2 and 3) against the driver stations, the cargo ship in the middle with hatches and cargo in its bays,
// four rockets on the side walls, the loading stations and depots, the tape, and four robots out on it.
// The stands are across the far side (bleachers.js); the walkway between them and the far wall is as close as anyone
// off the drive teams gets.

import { rnd } from './pixel.js';

export const FIELD = { x0: 14, x1: 242, y0: 68, y1: 136, mid: 128 };
const INK = '#0b0d17';
const ALLIANCE = {
  blue: { dark: '#0a237a', base: '#1d55e8', light: '#4a90ff', pale: '#a8d2ff' },
  red: { dark: '#5e0d17', base: '#d3212f', light: '#ff5b4d', pale: '#ffb3a3' },
};
const HATCH = '#ffc61a', CARGO = '#ff7a1c';

const rect = (g, x, y, w, h, c) => {
  g.fillStyle = c;
  g.fillRect(x, y, w, h);
};
// Mirror x for the red end.
const side = (alliance, x, w = 1) => (alliance === 'blue' ? x : FIELD.x0 + FIELD.x1 - x - w);

function hab(g, alliance) {
  const c = ALLIANCE[alliance];
  const at = (x, y, w, h, col) => rect(g, side(alliance, x, w), y, w, h, col);
  // Level 1 in front, level 2 on either side of level 3 against the wall. Higher levels show taller front faces.
  at(30, 84, 16, 36, INK);
  at(31, 85, 14, 33, c.base);
  at(31, 85, 14, 1, c.light);
  at(31, 118, 14, 1, c.dark);
  for (const y of [86, 108]) {
    at(14, y, 17, 12, INK);
    at(14, y + 1, 16, 8, c.light);
    at(14, y + 1, 16, 1, c.pale);
    at(14, y + 9, 16, 2, c.dark);
  }
  at(14, 94, 18, 16, INK);
  at(14, 95, 17, 9, c.pale);
  at(14, 95, 17, 1, '#ffffff');
  at(14, 104, 17, 5, c.dark);
  // The HAB line.
  at(58, FIELD.y0, 1, FIELD.y1 - FIELD.y0, '#e8ecf5');
  // Cargo depots beside the HAB, three balls each.
  for (const y of [77, 122]) {
    at(16, y, 10, 6, INK);
    at(17, y + 1, 8, 4, '#3f4761');
    for (let i = 0; i < 3; i++) at(17 + i * 3, y + 1, 2, 2, CARGO);
  }
}

function driverStations(g, alliance) {
  const c = ALLIANCE[alliance];
  const x = alliance === 'blue' ? 2 : FIELD.x1 + 1;
  rect(g, x, FIELD.y0 - 4, 12, FIELD.y1 - FIELD.y0 + 8, INK);
  rect(g, x + 1, FIELD.y0 - 3, 10, FIELD.y1 - FIELD.y0 + 6, c.dark);
  // Three stations, each with its window onto the field and a drive team behind it.
  for (let i = 0; i < 3; i++) {
    const y = FIELD.y0 + 6 + i * 21;
    rect(g, x + 2, y, 8, 14, c.base);
    rect(g, x + 2, y, 8, 1, c.light);
    rect(g, x + 3, y + 3, 6, 4, '#0d1338');
    rect(g, x + 4, y + 9, 2, 3, '#eabf91');
    rect(g, x + 6, y + 9, 2, 3, '#d29a6c');
  }
  // Loading stations in the corners: a hatch slot and a cargo chute.
  for (const y of [FIELD.y0 + 1, FIELD.y1 - 7]) {
    const lx = alliance === 'blue' ? FIELD.x0 : FIELD.x1 - 4;
    rect(g, lx, y, 4, 6, INK);
    rect(g, lx + 1, y + 1, 2, 2, HATCH);
    rect(g, lx + 1, y + 3, 2, 2, CARGO);
  }
}

function cargoShip(g) {
  const x = 106, y = 94, w = 44;
  rect(g, x - 1, y - 1, w + 2, 18, INK);
  // Deck, then the front face with its bays.
  rect(g, x, y, w, 9, '#aab2c8');
  rect(g, x, y, w, 1, '#e3e7f0');
  rect(g, x, y + 1, w / 2, 1, ALLIANCE.blue.light);
  rect(g, x + w / 2, y + 1, w / 2, 1, ALLIANCE.red.light);
  rect(g, x, y + 9, w, 7, '#5d6580');
  // Bays: three along each side, one at each end. Some already have hatches, some cargo.
  const pieces = [HATCH, CARGO, null, HATCH, CARGO, HATCH];
  for (let i = 0; i < 6; i++) {
    const bx = x + 3 + i * 7 + (i >= 3 ? 1 : 0);
    rect(g, bx, y + 11, 4, 4, INK);
    if (pieces[i]) rect(g, bx + 1, y + 12, 2, 2, pieces[i]);
    rect(g, bx, y + 2, 4, 2, '#7882a3');
  }
  for (const ex of [x - 1, x + w - 1]) {
    rect(g, ex, y + 4, 2, 4, INK);
    rect(g, ex, y + 5, 2, 2, HATCH);
  }
}

function walls(g) {
  // The far wall, with the gate the drive teams use, chained off.
  const wall = (y) => {
    rect(g, FIELD.x0, y, FIELD.x1 - FIELD.x0, 2, 'rgba(168, 210, 255, 0.4)');
    rect(g, FIELD.x0, y, FIELD.x1 - FIELD.x0, 1, '#c4cbe0');
    for (let x = FIELD.x0; x <= FIELD.x1; x += 19) rect(g, x, y - 1, 2, 4, '#5d6580');
  };
  wall(FIELD.y0 - 2);
  wall(FIELD.y1);
  rect(g, GATE.x0, FIELD.y0 - 2, GATE.x1 - GATE.x0, 2, '#2b2e3a');
  for (let x = GATE.x0; x < GATE.x1; x += 2) rect(g, x, FIELD.y0 - 2, 1, 1, x % 4 ? HATCH : INK);
  rect(g, GATE.x0 - 1, FIELD.y0 - 4, 2, 5, INK);
  rect(g, GATE.x1 - 1, FIELD.y0 - 4, 2, 5, INK);
}
export const GATE = { x0: 36, x1: 52 };

/** Everything on the field that doesn't move, drawn once. */
export function makeField() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 144;
  const g = c.getContext('2d');
  // Arena floor around the field, then the carpet.
  rect(g, 0, FIELD.y0 - 4, 256, 144 - FIELD.y0 + 4, '#1c2030');
  rect(g, FIELD.x0, FIELD.y0, FIELD.x1 - FIELD.x0, FIELD.y1 - FIELD.y0, '#2b2e3a');
  for (let i = 0; i < 700; i++) {
    const x = FIELD.x0 + Math.floor(rnd(i) * (FIELD.x1 - FIELD.x0)), y = FIELD.y0 + Math.floor(rnd(i + 900) * (FIELD.y1 - FIELD.y0));
    rect(g, x, y, 1, 1, rnd(i + 1800) < 0.5 ? '#30333f' : '#272a35');
  }
  // Centre line, and the alliance tape along the side walls.
  rect(g, FIELD.mid, FIELD.y0, 1, FIELD.y1 - FIELD.y0, '#e8ecf5');
  rect(g, FIELD.x0, FIELD.y0 + 1, FIELD.mid - FIELD.x0, 1, ALLIANCE.blue.base);
  rect(g, FIELD.mid + 1, FIELD.y0 + 1, FIELD.x1 - FIELD.mid - 1, 1, ALLIANCE.red.base);
  rect(g, FIELD.x0, FIELD.y1 - 2, FIELD.mid - FIELD.x0, 1, ALLIANCE.blue.base);
  rect(g, FIELD.mid + 1, FIELD.y1 - 2, FIELD.x1 - FIELD.mid - 1, 1, ALLIANCE.red.base);
  hab(g, 'blue');
  hab(g, 'red');
  cargoShip(g);
  driverStations(g, 'blue');
  driverStations(g, 'red');
  walls(g);
  return c;
}

// ---- Things that stand up or move: drawn every frame, in depth order with whoever is on the walkway. ----
/** A rocket against a side wall: its nose cone in alliance colour, the three levels of ports facing the field. */
function rocket(g, x, base, alliance, facingYou) {
  const c = ALLIANCE[alliance];
  const top = base - 16;
  rect(g, x - 5, top + 2, 10, 15, INK);
  rect(g, x - 3, top, 6, 3, INK);
  rect(g, x - 2, top + 1, 4, 2, c.base);
  rect(g, x - 4, top + 3, 8, 13, '#c4cbe0');
  rect(g, x + 2, top + 3, 2, 13, '#9aa3bd');
  rect(g, x - 4, top + 5, 8, 1, c.base);
  if (facingYou) {
    [[top + 7, HATCH], [top + 10, CARGO], [top + 13, null]].forEach(([y, piece]) => {
      rect(g, x - 2, y, 4, 2, INK);
      if (piece) rect(g, x - 1, y, 2, 2, piece);
    });
  }
}
const ROCKETS = [
  { x: 84, base: FIELD.y0 + 3, alliance: 'blue', facingYou: true },
  { x: 172, base: FIELD.y0 + 3, alliance: 'red', facingYou: true },
  { x: 84, base: FIELD.y1 - 1, alliance: 'blue', facingYou: false },
  { x: 172, base: FIELD.y1 - 1, alliance: 'red', facingYou: false },
];

/** A robot from above: bumpers in alliance colour, its frame, a mast, and the signal light. */
function robot(g, x, y, alliance, mast, t) {
  const c = ALLIANCE[alliance];
  x = Math.round(x);
  y = Math.round(y);
  rect(g, x - 7, y - 4, 14, 9, INK);
  rect(g, x - 6, y - 3, 12, 7, c.base);
  rect(g, x - 6, y - 3, 12, 1, c.light);
  rect(g, x - 4, y - 2, 8, 4, '#3f4761');
  rect(g, x - 1 - mast, y - 2 - mast * 3, 3, mast * 3 + 2, INK);
  rect(g, x - mast, y - 1 - mast * 3, 1, mast * 3, '#c4cbe0');
  if (Math.floor(t * 2.5 + x) % 2) rect(g, x + 3, y - 2, 1, 1, '#ff7a1c');
}
const ease = (p) => (1 - Math.cos(Math.PI * p)) / 2;
const shuttle = (t, speed, phase) => ease((Math.sin(t * speed + phase) + 1) / 2);
function robots(t) {
  const a = shuttle(t, 0.5, 0), b = shuttle(t, 0.4, 1), d = shuttle(t, 0.45, 2);
  return [
    // 5026: loading station to its rocket and back.
    { x: 24 + a * 50, y: 77, alliance: 'blue', mast: 2 },
    // A blue partner bringing cargo from the depot to the cargo ship.
    { x: 34 + b * 66, y: 124 - b * 7, alliance: 'blue', mast: 1 },
    // 7777, the defender, patrolling in front of the blue rocket.
    { x: 98 + Math.sin(t * 0.7) * 14, y: 88 + Math.cos(t * 0.9) * 3, alliance: 'red', mast: 0 },
    // A red partner cycling from its loading station to the cargo ship.
    { x: 230 - d * 74, y: 77 + d * 22, alliance: 'red', mast: 1 },
  ];
}

/** Rockets and robots, back to front. Anything on the walkway is drawn before this, so the tall rockets stand in front. */
export function drawFieldLive(g, t) {
  const things = [
    ...ROCKETS.map((r) => ({ y: r.base, draw: () => rocket(g, r.x, r.base, r.alliance, r.facingYou) })),
    ...robots(t).map((r) => ({ y: r.y + 4, draw: () => robot(g, r.x, r.y, r.alliance, r.mast, t) })),
  ];
  things.sort((p, q) => p.y - q.y).forEach((p) => p.draw());
}
