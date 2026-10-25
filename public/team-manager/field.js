// The 2019 field (Deep Space) at the same scale as the people, 8 pixels to the foot, seen from its long side by the
// walker's camera (20 degrees down, so a foot of depth is under 3 pixels). The floor recedes and everything on it stands
// up, drawn back to front. Blue alliance on the left, red on the right; the field is two screens long and the arena
// floor carries on past both ends, so you only ever see part of it.
// On the field: both HABs, loading stations in the corners, depots, the cargo ship, a rocket on the far wall in each
// half (drawn like the intro's, with its wings), tape, and four robots running cycles. The pieces in them are drawn as
// the 2019 Game Manual has them (sprites.js): clear hatch panels with white tape round the edge and a yellow band, null
// hatch panels with white strips across, orange cargo showing through. The drive teams stand in their stations. Past the
// blue end is the queue for the next match; past the red end, the scoring table. The stands are beyond the far wall
// (bleachers.js), with the walkway between. Everything is in world pixels, drawn through pixel.js's camera.
// For a real match (match/), drawFieldLive's live option takes the robots and every piece from outside, and adds the
// near wall's rockets too, see-through, since the camera sees them from behind; portAt() says where each piece goes.
// Between matches (arena/flow.js): the four gates in the side walls (GATES), shut or open, the queue left to the scene
// (queue: false), the carts robots ride on (robotCart) and the rockets' nosecone lights (noseLights).
// Cargo with no hatch panel to keep it in rolls back out onto the carpet, and the sandstorm's shutters over the driver
// stations come down for the first 15 seconds.

import { C, useContext, camera, screen, cam, rect, disk, text, withAlpha, rnd } from './pixel.js';
import { eleBot, defBot, armBot, cargo, hatch, hatchFace, hatchSide, hatchFlat, hatchIcon } from './sprites.js';

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
const STEEL = '#5d6580', PANEL = '#aab2c8', CARPET = '#2b2e3a', CONCRETE = '#353a4c', DARK = '#181b29';
/**
 * The gates in the side walls, where robots are carried on and off (the 2019 manual, section 4, Figure 4-2): four, one
 * in each wall at each end, their middles about 9 feet in from the alliance wall, just past the HAB, and 3 feet 2
 * inches wide open. The far wall's and the near wall's are at the same places along the field.
 */
export const GATES = { blue: { x0: FIELD.x0 + 60, x1: FIELD.x0 + 85 }, red: { x0: FIELD.x1 - 85, x1: FIELD.x1 - 60 } };
/** The far wall's gate at the blue end, chained off: a volunteer stands by it. */
export const GATE = GATES.blue;
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
    for (const z of FRONT_Z) rect(mirrorX(a, SHIP.x0 - 1.5 * FT, 1.5 * FT), floorY(z), 1.5 * FT, 1, C.tape);
    // Cargo depots beside the HAB: a low bin of balls on each side of it.
    for (const z of DEPOT_Z) depot(a, z, DEPOT_FULL);
  }
  // The queue lane past the blue end, taped out on the concrete.
  for (const y of [QUEUE_LANE.y0, QUEUE_LANE.y1]) {
    for (let x = QUEUE_LANE.x0; x < QUEUE_LANE.x1; x += 4) rect(x, y, 3, 1, C.yel1);
  }
  useContext(prev);
  return c;
}

/**
 * A cargo depot: the low bin at depth z, with `balls` of its six showing (full, it holds six cargo: the 2019 manual, 5.1.1).
 * cover: drawn again over the floor's full one (a live match), so the carpet goes back where a ball's gone.
 */
const DEPOT_Z = [4.6, 20.6];
/** Cargo in a full depot (match/sim.js's DEPOT_CARGO). */
const DEPOT_FULL = 6;
function depot(alliance, z, balls, cover = false) {
  const x = mirrorX(alliance, FIELD.x0, 3.5 * FT);
  const top = floorY(z), bottom = floorY(z + 1.8);
  if (cover) rect(x, top - 4, 3.5 * FT, 1, CARPET);
  rect(x - 1, top - 3, 3.5 * FT + 2, bottom - top + 4, C.ink);
  rect(x, top - 2, 3.5 * FT, bottom - top + 2, '#3f4761');
  rect(x, top - 2, 3.5 * FT, 1, STEEL);
  for (let i = 0; i < balls; i++) {
    rect(x + 2 + i * 4, top - 4 + (i % 2), 3, 3, C.ink);
    rect(x + 2 + i * 4, top - 4 + (i % 2), 2, 2, C.org1);
  }
}

// ---- Walls and barriers ----
/** A side wall of clear panels on posts, at depth z, the length of the field, with a gate (or a list of them) in it. */
function sideWall(z, gate) {
  const y = floorY(z) - WALL_H;
  const gates = (Array.isArray(gate) ? gate : [gate]).filter(Boolean).sort((a, b) => a.x0 - b.x0);
  const cuts = [FIELD.x0, ...gates.flatMap((q) => [q.x0, q.x1]), FIELD.x1];
  for (let i = 0; i < cuts.length; i += 2) {
    const [a, b] = [cuts[i], cuts[i + 1]];
    withAlpha(0.22, () => rect(a, y, b - a, WALL_H, C.blue3));
    rect(a, y, b - a, 1, C.steel3);
    rect(a, floorY(z) - 2, b - a, 2, '#3f4761');
  }
  for (let x = FIELD.x0; x <= FIELD.x1; x += 4 * FT) {
    if (gates.some((q) => x > q.x0 - 2 && x < q.x1 + 2)) continue;
    rect(x - 1, y - 1, 2, WALL_H + 1, C.steel2);
  }
  for (const q of gates) gateIn(q, y, floorY(z));
}
/**
 * A gate in a side wall whose panels' tops are at y and floor line at fy: a gap in the panels, posts either side, and a
 * yellow and black chain across. Open (gate.open), the chain is unhooked and hangs down the right-hand post, the rest of
 * it lying in a heap at its foot.
 */
function gateIn(gate, y, fy) {
  const gw = gate.x1 - gate.x0;
  for (const px of [gate.x0 - 2, gate.x1]) {
    rect(px, y - 3, 3, WALL_H + 3, C.ink);
    rect(px + 1, y - 2, 1, WALL_H + 1, C.steel3);
  }
  if (gate.open) {
    for (let j = 4; j < fy - y - 1; j += 2) rect(gate.x1 - 1, y + j, 1, 2, (j / 2) % 2 ? C.ink : C.yel1);
    rect(gate.x1 - 2, fy - 1, 2, 1, C.yel1);
    rect(gate.x1 - 4, fy - 1, 2, 1, C.ink);
    return;
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

// ---- The sandstorm ----
// Over each alliance wall, a black box holding three roller shutters, one over each player station, each 4 ft 6 in of
// black-out cloth 5 ft 8 in wide. Just before a match they come down on the field side of the stations' clear panels,
// so for the first 15 seconds the drivers can't see the field (their robots run on their own, or drive by camera); at
// 0:15 they roll back up into the box over about 2 seconds, and stay up (the 2019 manual, 4.7). From here the wall is
// edge on, and so are they: the box is a dark rail along the wall's top, and the cloth a black strip down its field
// side, the weighted hem along its bottom edge catching the light, rising into the box as it rolls up.
/** Feet in from the far wall: the three player stations, 5 ft 9 in shelves in the middle of the wall's 27 feet. */
const STATIONS_Z = [4.875, 22.125];
/** Pixels up: the wall's top (6 ft 6 in), the box on it, and how far down the cloth comes (to the 3 ft diamond plate). */
const BLINDS = { top: 52, box: 4, down: 24 };
const CLOTH = '#07080d', HEM = '#4b5266', BOX = '#151821';

/** The cloth, `down` of the way down (0 rolled up, 1 all the way down): drawn after the HAB, which it's in front of. */
function sandstormCloth(alliance, down) {
  if (down <= 0) return;
  const [z0, z1] = STATIONS_Z, hem = Math.round(BLINDS.top - (BLINDS.top - BLINDS.down) * down);
  // Just past the wall's field side and its outline (the wall is 6 wide, its outline on FIELD.x0 for blue).
  const x = mirrorX(alliance, FIELD.x0 + 1, 2), out = mirrorX(alliance, FIELD.x0 + 3, 1);
  const far = Math.round(floorY(z0)), top = far - BLINDS.top, bottom = Math.round(floorY(z1)) - hem;
  rect(x, top, 2, bottom - top, CLOTH);
  // The hem's bar along the bottom edge, edge on, standing a pixel proud of the cloth, and its near end.
  rect(out, far - hem, 1, bottom - far + hem + 1, HEM);
  rect(x, bottom, 2, 1, HEM);
}

/** The box the shutters roll up into, on the wall's top rail and over the cloth (drawn after the wall). */
function sandstormBox(alliance) {
  const [z0, z1] = STATIONS_Z, x = mirrorX(alliance, FIELD.x0 - 2, 5);
  const top = Math.round(floorY(z0)) - BLINDS.top - BLINDS.box, front = Math.round(floorY(z1)) - BLINDS.top - BLINDS.box;
  rect(x - 1, top - 1, 7, front - top + BLINDS.box + 2, C.ink);
  // Its top, lit along the far end, and its near end facing you.
  rect(x, top, 5, front - top, BOX);
  rect(x, top, 5, 1, C.steel1);
  rect(x, front, 5, BLINDS.box, C.steel0);
}

/** Both walls' shutters, `down` of the way down, as things for drawFieldLive to sort in. */
const sandstormParts = (down) => ['blue', 'red'].flatMap((a) => [
  { y: floorY(20.3) + 0.005, draw: () => sandstormCloth(a, down) },
  { y: floorY(27) + 0.001, draw: () => sandstormBox(a) },
]);

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
  // The cargo chute at the top, and a hatch panel waiting in its slot, edge on from here, its middle 19 inches up.
  const cx = x + w / 2;
  rect(cx - 4, yFront + 3, 8, 7, C.ink);
  rect(cx - 3, yFront + 4, 6, 5, C.org1);
  rect(cx - 3, yFront + 4, 2, 2, C.org2);
  rect(cx - 4, yFloor - 20, 8, 15, C.ink);
  rect(cx - 3, yFloor - 19, 6, 13, T[0]);
  hatch(Math.round(cx) - 2, Math.round(yFloor) - 13);
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

// ---- Drawing inside things ----
// The context drawFieldLive is drawing into, so a piece inside the cargo ship or a rocket can be clipped to the opening
// you see it through (pixel.js draws whole rectangles and has no clipping of its own).
let G = null;
/** Draw only inside these world rectangles ([x, y, w, h], whole pixels), wherever the camera puts them. */
function clipped(rects, draw) {
  if (!G) return draw();
  const sx = (x) => Math.round((x - cam.x) * cam.s) + cam.dx, sy = (y) => Math.round((y - cam.y) * cam.s) + cam.dy;
  G.save();
  G.beginPath();
  for (const [x, y, w, h] of rects) G.rect(sx(x), sy(y), sx(x + w) - sx(x), sy(y + h) - sy(y));
  G.clip();
  draw();
  G.restore();
}
/** A disk's rows (as pixel.js's disk() fills them), as rectangles to clip to. */
const diskRows = (cx, cy, r) => Array.from({ length: 2 * r }, (_, j) => {
  const dy = j - r, hw = Math.round(Math.sqrt(r * r - (dy + 0.5) * (dy + 0.5)));
  return [cx - hw, cy + dy, 2 * hw, 1];
});
const easeIn = (k) => k * k;

// ---- The cargo ship ----
// Each alliance's half is a bit under 8 feet long and 4 feet high; the two are back to back at the centre line, the gap
// between them sealed with clear plastic, and each one's tail fin rises there. Three bays down each side, two on the
// front. From here you see the near side: a recess along the bottom for bumpers, the alliance's plate up to the bays'
// lip at 31 inches with a round hatch for each bay (its middle 19 inches up), and above the lip each bay open, sloping in
// to the roof, the net across its back showing through. Cargo sits low in a bay, behind its hatch, so you see it through
// the hatch, or the clear panel on it, never over the lip.
// The far side's bays face away. You'd only glimpse them through the two nets, low in the near side's openings, which
// is where they're drawn, dim: the far hatch panels and the balls in front of them.
// The front pair face the HAB and are hidden behind the nose, so a small plaque over the nose (frontBays) shows them as
// the drive team would see them.
const SHIP = { x0: FIELD.mid - 63, x1: FIELD.mid + 63, z0: 11.2, z1: 15.8, h: 4 * FT };
const BAY_W = 15, NOSE = 17;
/** Pixels up from the floor: the bays' lip (31 1/2 inches), the middles of their hatches (19), the recess's top (8). */
const LIP = 21, PORT_UP = 13, RECESS = 5;
/** The front pair's depths (their alignment tape). */
const FRONT_Z = [12.4, 14.6];
/** The middles of each half's three side bays, from the centre line out. */
const shipBays = (alliance) => [0, 1, 2].map((i) => mirrorX(alliance, FIELD.mid - 8 - i * BAY_W));
/** The rows the ship is drawn on, in whole pixels. */
const SHIP_Y = (() => {
  const floor = Math.round(floorY(SHIP.z1)), far = Math.round(floorY(SHIP.z0));
  return {
    floor, lip: floor - LIP, port: floor - PORT_UP, recess: floor - RECESS,
    // The roof's far and near edges: the open sides slope in about a foot between the lip and the roof.
    roofFar: Math.round(floorY(SHIP.z0 + 1) - SHIP.h), roofNear: Math.round(floorY(SHIP.z1 - 1) - SHIP.h),
    // The far side's hatches and lip, seen through the nets.
    farPort: far - PORT_UP, farLip: far - LIP,
  };
})();
// What's in each half's bays in the arena's matches, as [cargo, hatch] (hatch 'null' for a null hatch panel): the near
// side from the middle out, the far side, the front pair.
const SHIP_FILL = {
  blue: { near: [[1, 1], [1, 'null'], [0, 1]], far: [[1, 'null'], [1, 1], [0, 'null']], front: [[1, 1], [0, 1]] },
  red: { near: [[1, 'null'], [1, 1], [0, 'null']], far: [[1, 1], [0, 'null'], [1, 1]], front: [[1, 1], [1, 0]] },
};
/** A bay's [cargo, hatch], from a fill that may give the cargo alone. */
const bayOf = (v) => (Array.isArray(v) ? v : [v, 0]);
const BAY_DARK = '#10131d', NET_BACK = '#2a3049', NET = '#161a28', RECESS_DARK = '#191c28';

/** A hatch panel face-on, with cargo behind it showing through if `full` (the practice field's ship uses it too). */
export function hatchFaceOn(cx, cy, full, isNull = false) {
  if (full) cargo(cx, cy + 1, 4, { bare: true });
  hatchFace(cx, cy, { null: isNull });
}

/** A ball in a cargo ship bay: low behind the hatch, on the bay's floor. */
const bayBall = (cx, port) => cargo(cx, port + 1, 4, { bare: true });
/** The middle of a ball dropping into a bay, k of the way from just over its lip to resting behind its hatch. */
const dropY = (lip, port, k) => Math.round(lip - 4 + (port + 5 - lip) * easeIn(k));

/**
 * The cargo ship, both halves. fills: { blue, red }, each { near, far, front } as [cargo, hatch] a bay (SHIP_FILL), and
 * for a live match `drop`: balls going in, [{ bay ('near1', 'far0'...), k: 0 at the lip to 1 come to rest }].
 */
function cargoShip(fills = SHIP_FILL) {
  const Y = SHIP_Y;
  rect(SHIP.x0 - 1, Y.roofFar - 1, SHIP.x1 - SHIP.x0 + 2, Y.floor - Y.roofFar + 1, C.ink);
  for (const a of ['blue', 'red']) shipHalf(a, fills[a]);
  // The join at the centre line: the two sterns, and the clear plastic between them.
  rect(FIELD.mid - 2, Y.roofFar, 4, Y.floor - Y.roofFar, C.steel2);
  rect(FIELD.mid - 1, Y.roofFar, 2, Y.recess - Y.roofFar, C.steel3);
  withAlpha(0.5, () => rect(FIELD.mid - 1, Y.roofFar, 2, Y.lip - Y.roofFar, C.blue3));
  for (const a of ['blue', 'red']) shipFin(a);
}

function shipHalf(a, fill) {
  const T = TEAM[a], Y = SHIP_Y, half = mirrorX(a, SHIP.x0, 63);
  const bays = mirrorX(a, SHIP.x0 + NOSE, 63 - NOSE), bw = 63 - NOSE, openH = Y.lip - Y.roofNear;
  const drops = fill.drop ?? [];
  const dropping = (side) => drops.filter((d) => d.bay.startsWith(side)).map((d) => ({ ...d, i: +d.bay.at(-1) }));
  // The roof, seen from above: the alliance's colour, lit along its far edge.
  rect(half, Y.roofFar, 63, Y.roofNear - Y.roofFar, T[1]);
  rect(half, Y.roofFar, 63, 1, T[2]);
  rect(half, Y.roofNear - 1, 63, 1, T[0]);
  // The bays' open tops: through them the net across the back, and through that, dimly, the far side's bays.
  rect(bays, Y.roofNear, bw, openH, NET_BACK);
  clipped([[bays, Y.roofNear, bw, openH]], () => {
    withAlpha(0.45, () => {
      shipBays(a).forEach((cx, i) => {
        const [c, h] = bayOf(fill.far[i]);
        if (h) hatchFace(cx, Y.farPort, { null: h === 'null' });
        if (c) bayBall(cx, Y.farPort);
      });
      for (const d of dropping('far')) cargo(shipBays(a)[d.i], dropY(Y.farLip, Y.farPort, d.k), 4, { bare: true });
      for (const r of fill.out ?? []) if (r.bay.startsWith('far')) farRollOut(shipBays(a)[+r.bay.at(-1)], r);
    });
    for (let y = Y.roofNear + 1; y < Y.lip; y += 3) rect(bays, y, bw, 1, NET);
    for (let x = bays + 1; x < bays + bw; x += 3) rect(x, Y.roofNear, 1, openH, NET);
    // A ball going into a near bay: down past the lip, in front of the net.
    for (const d of dropping('near')) cargo(shipBays(a)[d.i], dropY(Y.lip, Y.port, d.k), 4);
  });
  // The frames between the bays, rising from the lip to the roof.
  for (let k = 0; k <= 3; k++) {
    const x = mirrorX(a, FIELD.mid - k * BAY_W - 1, 2);
    rect(x, Y.roofNear, 2, openH, C.steel2);
    rect(x, Y.roofNear, 1, openH, C.steel3);
  }
  // The plate, lit along the lip; the recess under it in shadow.
  rect(half, Y.lip, 63, Y.recess - Y.lip, T[1]);
  rect(half, Y.lip, 63, 1, T[2]);
  rect(half, Y.recess, 63, Y.floor - Y.recess, RECESS_DARK);
  rect(half, Y.recess, 63, 1, T[0]);
  // Each near bay: the hatch, the cargo inside it, the panel on it. A pair of white vision targets marks each one's top.
  shipBays(a).forEach((cx, i) => {
    const [c, h] = bayOf(fill.near[i]);
    for (const s of [-1, 1]) {
      rect(cx + s * 4 - (s < 0 ? 1 : 0), Y.lip + 1, 1, 2, C.white);
      rect(cx + s * 5 - (s < 0 ? 1 : 0), Y.lip + 3, 1, 1, C.white);
    }
    disk(cx, Y.port, 6, C.ink);
    disk(cx, Y.port, 5, BAY_DARK);
    rect(cx - 3, Y.port + 3, 6, 1, '#1c2131');
    const coming = dropping('near').filter((d) => d.i === i);
    if (coming.length) clipped(diskRows(cx, Y.port, 5), () => coming.forEach((d) => cargo(cx, dropY(Y.lip, Y.port, d.k), 4, { bare: true })));
    if (c) bayBall(cx, Y.port);
    if (h) hatchFace(cx, Y.port, { null: h === 'null' });
  });
  shipNose(a);
}

/**
 * A far side bay's ball rolling out at 0:15 (rollOutParts), as you glimpse it through the nets: away from you toward its
 * hatch, then dropping out through it, out of sight.
 */
function farRollOut(cx, r) {
  const port = SHIP_Y.farPort;
  if (r.at < r.out) {
    const k = r.at / r.out;
    return bayBall(cx, port - Math.round(2 * k * k));
  }
  const s = r.at - r.out;
  if (s < 0.3) clipped(diskRows(cx, port, 5), () => cargo(cx, Math.round(port - 1 + (GRAVITY * s * s) / 2), 4, { bare: true }));
}

/** The nose: closed in the alliance's colour (its top is under the front bays' plaque), the "19" painted on it and
 *  stripes sweeping back from the front. */
function shipNose(a) {
  const T = TEAM[a], Y = SHIP_Y, x = mirrorX(a, SHIP.x0, NOSE);
  const at = (dx, w) => mirrorX(a, SHIP.x0 + dx, w); // dx back from the front
  rect(x, Y.roofFar, NOSE, Y.recess - Y.roofFar, T[1]);
  rect(x, Y.roofFar, NOSE, 1, T[2]);
  for (let k = 0; k < 3; k++) rect(at(2 + k * 3, 14 - k * 5), Y.lip + 7 + k * 3, 14 - k * 5, 1, k === 1 ? C.white : T[2]);
  text('19', at(3, 7), Y.lip - 7, { font: 3, color: C.white });
  rect(x, Y.recess, NOSE, Y.floor - Y.recess, RECESS_DARK);
  rect(x, Y.recess, NOSE, 1, T[0]);
}

/**
 * The two front bays, on a small dark plaque over the nose. They face the HAB, edge on from here and hidden behind the
 * nose (and, in a live match, the near wall's rocket stands in front of it), so this shows them as the drive team
 * sees them, side by side, the far bay at the front end: each one's hatch in small, empty (a ring with the dark bay
 * behind) or with its panel (white tape and yellow band, a null one with its two white strips), and the cargo in it
 * orange in the middle. front: [[cargo, hatch], [cargo, hatch]]. out: balls rolling out at 0:15 (rollOutParts), toward
 * the drive team and out of the bottom of the hatch.
 */
function frontBays(a, front, out = []) {
  const T = TEAM[a], Y = SHIP_Y, px = mirrorX(a, SHIP.x0 - 3, 23), py = Y.roofFar - 2;
  rect(px - 1, py - 1, 25, 14, C.ink);
  rect(px, py, 23, 12, '#141a2c');
  rect(px, py, 23, 1, T[2]);
  front.map(bayOf).forEach(([c, h], i) => {
    const cx = mirrorX(a, SHIP.x0 + 3 + i * 11), cy = py + 6;
    if (!h) {
      disk(cx, cy, 5, C.ink);
      disk(cx, cy, 4, C.steel2);
      disk(cx, cy, 3, BAY_DARK);
    }
    if (c) {
      disk(cx, cy, h ? 2 : 3, C.org1);
      rect(cx - 2, cy - (h ? 1 : 2), 1, 1, C.org2);
    }
    if (h) hatchIcon(cx, cy, { null: h === 'null' });
    const r = out.find((q) => q.bay === `front${i}`);
    if (!r) return;
    const e = Math.min(1, r.at / r.out) ** 2, s = Math.max(0, r.at - r.out);
    clipped([[px, py + 1, 23, 11]], () => {
      if (!s) cargo(cx, cy + Math.round(e), e > 0.5 ? 4 : 3, { bare: true });
      else cargo(cx, Math.round(cy + 1 + (GRAVITY * s * s) / 2), 4);
    });
  });
}

/** The tail fin, rising off the roof to the stern at the centre line, the alliance's colour with a white stripe. */
function shipFin(a) {
  const T = TEAM[a], base = Math.round(floorY((SHIP.z0 + SHIP.z1) / 2) - SHIP.h);
  for (let i = 0; i < 26; i++) {
    const h = Math.round(7 * (1 - i / 25) ** 1.6), x = mirrorX(a, FIELD.mid - 2 - i, 1);
    if (h < 1) continue;
    rect(x, base - h - 1, 1, h + 1, C.ink);
    rect(x, base - h, 1, h, T[1]);
    rect(x, base - h, 1, 1, T[2]);
    if (h > 3) rect(x, base - Math.round(h * 0.5), 1, 1, C.white);
  }
}

// ---- The rockets ----
// One on the far wall in each half (the near wall's two are behind you), seen from the front: the intro's rocket turned
// to face you, a swept wing either side of it against the wall. Silver hull, alliance bands, the nose cone, the skirt.
// Hatch ports on the two angled faces at 19, 47 and 75 inches; round cargo ports up the middle at 27, 55 and 83. Each
// level holds two cargo, one behind each hatch: a ball goes in at the cargo port and a ramp inside rolls it to one
// side, where it shows through the clear hatch panel, and its top shows low in the port on that side.
const ROCKET_Z = 2.2;
const ROCKETS = [{ x: FIELD.x0 + 19 * FT, alliance: 'blue' }, { x: FIELD.x1 - 19 * FT, alliance: 'red' }];
const HATCH_UP = [13, 31, 50], CARGO_UP = [18, 37, 56], HULL = 64, CONE = 9;
const coneW = (i) => Math.max(1, Math.round(14 * Math.sin(((i + 1) / CONE) * (Math.PI / 2)) ** 0.75));
/** The hatch faces' middles, out from the rocket's; where a ball in a bay sits as you see it in the port. */
const FACE_X = 11, PEEK = { dx: 5, dy: 4 };
const PORT_DARK = '#0e1019';
/** The wings: how far each reaches out from the hull (pixels), how high it stands against it (6 feet 2 inches), and
 *  how far out from the wall it comes (feet). */
const WING = { out: 19, up: 49, deep: 0.6 };

/** A hatch panel on a rocket's angled face (the practice field's rocket uses it too). */
export function hatchOnFace(cx, cy, dir = -1) {
  hatchSide(cx, cy, { dir });
}

/** A rocket fill's three levels: { home, away } hatches and { home, away } cargo, from booleans or [home, away]. */
function levelsOf(fill) {
  return [0, 1, 2].map((l) => {
    const c = fill.cargo?.[l], both = c === true || c === 1;
    return {
      home: !!fill.home?.[l], away: !!fill.away?.[l],
      cargo: { home: both || (Array.isArray(c) && !!c[0]), away: both || (Array.isArray(c) && !!c[1]) },
    };
  });
}

/**
 * A rocket at cx, its face toward you on the floor line `base`. fill: { home, away, cargo, roll }, three a level:
 * hatches on the home face (toward its own end) and the away face; cargo, [home, away] for the bays behind them (true
 * for both); roll, for a live match, the balls on their way in: [{ level (1-3), face ('home' | 'away'), k: 0 in the
 * port to 1 come to rest }]. ghost: a near wall rocket, seen from behind: 'hull' draws it see-through, 'pieces' the
 * pieces in it, solid (drawFieldLive sorts the two apart: see liveParts); from behind, a ball is in front of its panel.
 */
function rocket(cx, alliance, fill, base = floorY(ROCKET_Z), ghost = null) {
  const T = TEAM[alliance], b = Math.round(base), top = b - HULL, levels = levelsOf(fill), roll = fill.roll ?? [];
  const homeS = alliance === 'blue' ? -1 : 1;
  const sideOf = (face) => (face === 'home' ? homeS : -homeS);
  const hull = () => {
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
  };
  // A level's cargo port: the ring, the dark inside, and low in it on each side the top of a ball in that side's bay;
  // a ball rolling in starts filling it and slides down to its side.
  const port = (l, lv, rolls) => {
    const py = b - CARGO_UP[l];
    disk(cx, py, 6, C.ink);
    disk(cx, py, 5, C.steel1);
    rect(cx - 4, py - 4, 2, 1, C.steel2);
    disk(cx, py, 4, PORT_DARK);
    if (!lv.cargo.home && !lv.cargo.away && !rolls.length) return;
    clipped(diskRows(cx, py, 4), () => {
      for (const face of ['home', 'away']) if (lv.cargo[face]) cargo(cx + sideOf(face) * PEEK.dx, py + PEEK.dy, 4, { bare: true });
      for (const r of rolls) {
        const k = easeIn(r.k), s = sideOf(r.face);
        cargo(Math.round(cx + s * PEEK.dx * k), Math.round(py + PEEK.dy * k), 4, { bare: true });
      }
    });
  };
  // A level's hatch ports: the cutout dark, a ball behind it if that side's bay has one (or one rolling in, the last of
  // the way), the panel over it.
  const hatchPort = (l, lv, face, rolls) => {
    const s = sideOf(face), x = cx + s * FACE_X, y = b - HATCH_UP[l], full = lv[face], ball = lv.cargo[face];
    rect(x - 3, y - 6, 6, 12, C.ink);
    rect(x - 2, y - 5, 4, 10, PORT_DARK);
    const arriving = rolls.filter((r) => r.face === face && r.k >= 0.5);
    if (ball || arriving.length) {
      clipped([[x - 2, y - 5, 4, 10]], () => {
        if (ball) cargo(x, y + 1, 4, { bare: true });
        for (const r of arriving) cargo(Math.round(x - s * 6 * (1 - (r.k - 0.5) / 0.5)), y + 1, 4, { bare: true });
      });
    }
    if (full) hatchSide(x, y, { dir: s });
  };
  // Seen from behind (a near wall rocket): a level's panels, and a ball in front of each one, toward the middle; balls
  // rolling in come from the port, on the far side of the rocket from here.
  const fromBehind = (l, lv, rolls) => {
    const py = b - CARGO_UP[l], hy = b - HATCH_UP[l] + 1;
    for (const face of ['home', 'away']) {
      const s = sideOf(face), x = cx + s * FACE_X;
      if (lv[face]) hatchSide(x, hy - 1, { dir: s });
      if (lv.cargo[face]) cargo(x - s * 4, hy, 4);
    }
    for (const r of rolls) {
      const s = sideOf(r.face), k = easeIn(r.k);
      cargo(Math.round(cx + s * (FACE_X - 4) * k), Math.round(py + (hy - py) * k), 4);
    }
  };
  const rollsAt = (l) => roll.filter((r) => r.level === l + 1);
  if (!ghost) {
    hull();
    levels.forEach((lv, l) => {
      for (const face of ['home', 'away']) hatchPort(l, lv, face, rollsAt(l));
      port(l, lv, rollsAt(l));
    });
    return;
  }
  // Seen through: the rocket and its wings faint (it stands in front of the cargo ship's end), every piece in it solid.
  if (ghost === 'hull') {
    withAlpha(0.2, () => {
      rocketWings(cx, alliance, floorY(27 - WING.deep));
      hull();
      levels.forEach((lv, l) => {
        for (const face of ['home', 'away']) hatchPort(l, { home: false, away: false, cargo: {} }, face, []);
        port(l, { cargo: {} }, []);
      });
    });
    return;
  }
  levels.forEach((lv, l) => fromBehind(l, lv, rollsAt(l)));
}
/** The near wall's rockets stand at the same place along the field as the far wall's, their face this far in. */
const NEAR_ROCKET_Z = 24.8;

/**
 * A rocket's two wings, against the wall either side of it on the floor line `base`: bent sheets 6 feet 2 inches tall
 * at the hull, swept down to the floor, in the alliance's darkest colour so they stay behind the hull, lit along the top.
 */
function rocketWings(cx, alliance, base) {
  const T = TEAM[alliance], wb = Math.round(base);
  for (const s of [-1, 1]) {
    for (let u = 0; u < WING.out; u++) {
      const h = Math.round(WING.up * (1 - u / WING.out) ** 1.7), x = cx + s * (15 + u) - (s < 0 ? 1 : 0);
      if (h < 1) continue;
      rect(x, wb - h - 1, 1, h + 2, C.ink);
      rect(x, wb - h, 1, h, T[0]);
      rect(x, wb - h, 1, 1, s < 0 ? T[2] : T[1]);
      if (h > 6) rect(x, wb - Math.round(h * 0.4), 1, 2, T[1]);
    }
  }
}

// ---- Cargo rolling back out ----
// A ball with no hatch panel in front of it doesn't stay in. In a rocket, the ramp it rolls down to its side carries it
// straight on out through the open hatch [4.3]. In the cargo ship, at 0:15 the bay floors tilt and staged cargo rolls out
// of its bay [4.4]: out of a near side bay toward you; out of a far side one away from you, glimpsed through the nets
// before it drops out of sight behind the ship; out of a front one past the nose, toward the alliance wall. Then it drops
// to the carpet, bounces and rolls on to where it comes to rest, and from then on it's one of the loose pieces.
// drawFieldLive's live.rollouts has them (match/draw.js makes them from the simulation's drops), each
// { alliance, struct ('rocket' | 'ship'), rocket ('far' | 'near'), level, face ('home' | 'away'), bay, at, out, end, to }:
// at, seconds since it got to its bay (or the floor tilted under it); out, the moment it drops from the hatch; end, the
// moment it comes to rest at `to` (its floor point, world pixels).

/** Gravity in pixels a second squared: 32 feet, 8 pixels to the foot. */
const GRAVITY = 32.2 * FT;
/** How much of its speed a ball keeps, bouncing off the carpet: each bounce a quarter as high as the last. */
const BOUNCE = 0.5;

/**
 * A ball dropped with its bottom h0 pixels up over the floor point `from`, t seconds after it dropped, coming to rest at
 * `to` dur seconds after: it falls at the real speed (unless that would leave too little time to bounce and roll),
 * bounces while there's time and the bounces are a pixel or more, and slows steadily along the floor to a stop. Returns
 * its floor point (x, y), how high its bottom is (h), and whether it's touched down yet.
 */
function dropAndRoll(from, to, h0, t, dur) {
  const u = 1 - (1 - Math.max(0, Math.min(1, t / dur))) ** 1.6;
  const x = from.x + (to.x - from.x) * u, y = from.y + (to.y - from.y) * u;
  const fall = Math.min(Math.sqrt((2 * h0) / GRAVITY), dur * 0.45), g = (2 * h0) / (fall * fall || 1);
  if (t < fall) return { x, y, h: h0 - (g * t * t) / 2, landed: false };
  let since = fall, v = BOUNCE * g * fall;
  while ((v * v) / (2 * g) >= 1 && since + (2 * v) / g <= dur * 0.85) {
    const air = (2 * v) / g, s = t - since;
    if (s < air) return { x, y, h: v * s - (g * s * s) / 2, landed: true };
    since += air;
    v *= BOUNCE;
  }
  return { x, y, h: 0, landed: true };
}

/** A ball on its way down and along: in the air at its full size, on the carpet the loose pieces' smaller one. */
function fallingBall(p) {
  const r = p.landed ? 3 : 4;
  cargo(Math.round(p.x), Math.round(p.y - r - Math.max(0, p.h)), r);
}

/**
 * How a ball rolling out goes, as things for drawFieldLive to sort in: inside (before `out`), along to the hatch and
 * through it, in front of or behind whatever hides it; then dropping and rolling, sorted by its floor point (never
 * before `after`, the thing it's come out of).
 */
function rollOutParts(r) {
  const k = Math.min(1, r.at / Math.max(0.01, r.out)), dropped = r.at >= r.out;
  const fall = (from, h0, after = 0) => {
    const p = dropAndRoll(from, r.to, h0, r.at - r.out, r.end - r.out);
    return [{ y: Math.max(p.y, after), draw: () => fallingBall(p) }];
  };
  if (r.struct === 'rocket') {
    const cx = ROCKETS.find((q) => q.alliance === r.alliance).x, homeS = r.alliance === 'blue' ? -1 : 1;
    const s = r.face === 'home' ? homeS : -homeS, up = HATCH_UP[r.level - 1];
    if (r.rocket === 'far') {
      // From its bay behind the hatch out through the hole and toward you, past the edge of the hull.
      const b = Math.round(floorY(ROCKET_Z)), after = floorY(ROCKET_Z) + 0.005, x = cx + s * FACE_X, y = b - up + 1;
      if (dropped) return fall({ x: x + s * 6, y: b + 1 }, up - 4, after);
      const bx = Math.round(x + s * 6 * k);
      return [{
        y: after,
        draw: () => (k < 0.4 ? clipped([[x - 2, y - 6, 4, 10]], () => cargo(bx, y, 4, { bare: true })) : cargo(bx, y, 4)),
      }];
    }
    // The near wall's, from behind: from in front of where its panel would be, out through the hole and away from you.
    const b = Math.round(floorY(NEAR_ROCKET_Z)), y = b - up + 1;
    if (dropped) return fall({ x: cx + s * (FACE_X + 6), y: b - 1 }, up - 6);
    return [{ y: floorY(27) + 0.5, draw: () => cargo(Math.round(cx + s * (FACE_X - 4 + 10 * k)), y, 4) }];
  }
  const a = r.alliance, i = +r.bay.at(-1), e = k * k; // the floor tilting, the ball gathering speed
  if (r.bay.startsWith('far')) return []; // seen only through the nets: shipHalf draws it
  if (r.bay.startsWith('front')) {
    // Out of the nose toward the alliance wall: hidden by the nose until it's past it, then dropping.
    const f = Math.round(floorY(FRONT_Z[i])), w = a === 'blue' ? -1 : 1, x0 = mirrorX(a, SHIP.x0 + 5), y = f - PORT_UP + 1;
    if (dropped) return fall({ x: x0 + w * 10, y: f }, PORT_UP - 5);
    return [{ y: f, draw: () => cargo(Math.round(x0 + w * 10 * e), y, 4) }];
  }
  // A near side bay: toward you through its hatch, over the hole's bottom edge and down past the recess.
  const Y = SHIP_Y, cx = shipBays(a)[i], after = floorY(SHIP.z1) + 0.005;
  if (dropped) return fall({ x: cx, y: Y.floor + 1 }, 6, after);
  const by = Math.round(Y.port + 1 + 3 * e);
  return [{ y: after, draw: () => (e < 0.6 ? clipped(diskRows(cx, Y.port, 5), () => cargo(cx, by, 4, { bare: true })) : cargo(cx, by, 4)) }];
}

/**
 * Where a piece goes, in world pixels, for a live match to move it there: p = { alliance, piece ('hatch' | 'cargo'),
 * struct: 'rocket' (rocket: 'far' | 'near', level 1-3, face: 'home' | 'away') or 'ship' (bay: 'front0', 'near1',
 * 'far2'...) }. For cargo in a rocket, the middle of the port it goes in by (the rocket rolls it to its side); in the
 * ship, just over the bay's lip (the far side's from behind, the front pair's from the HAB end). Also where pieces come
 * from: struct 'station' (which: 'far' | 'near': its hatch slot or its cargo chute) and 'depot' (which: 'far' | 'near').
 */
export function portAt(p) {
  const a = p.alliance;
  if (p.struct === 'station') {
    // A loading station (far or near): its hatch slot low, its cargo chute high.
    const z = p.which === 'far' ? 0.5 : 25.25, x = mirrorX(a, FIELD.x0, 1.25 * FT) + 0.625 * FT;
    return p.piece === 'cargo' ? { x, y: floorY(z + 1.75) - 4 * FT + 6 } : { x, y: Math.round(floorY(z + 1.75)) - 13 };
  }
  if (p.struct === 'depot') return { x: mirrorX(a, FIELD.x0 + 3 * FT), y: floorY(DEPOT_Z[p.which === 'far' ? 0 : 1]) - 3 };
  if (p.struct === 'rocket') {
    const cx = ROCKETS.find((r) => r.alliance === a).x, b = Math.round(floorY(p.rocket === 'near' ? NEAR_ROCKET_Z : ROCKET_Z));
    if (p.piece === 'cargo') return { x: cx, y: b - CARGO_UP[p.level - 1] };
    const homeS = a === 'blue' ? -1 : 1;
    return { x: cx + (p.face === 'home' ? homeS : -homeS) * FACE_X, y: b - HATCH_UP[p.level - 1] };
  }
  const Y = SHIP_Y, i = +p.bay.at(-1);
  if (p.bay.startsWith('front')) {
    const f = Math.round(floorY(FRONT_Z[i]));
    return p.piece === 'cargo' ? { x: mirrorX(a, SHIP.x0 + 2), y: f - LIP - 3 } : { x: mirrorX(a, SHIP.x0 - 2), y: f - PORT_UP };
  }
  const cx = shipBays(a)[i];
  if (p.bay.startsWith('far')) return p.piece === 'cargo' ? { x: cx, y: Y.farLip - 4 } : { x: cx, y: Y.farPort };
  return p.piece === 'cargo' ? { x: cx, y: Y.lip - 4 } : { x: cx, y: Y.port };
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
    fill: { home: [true, level === 1 || !c.out, level === 1 && !c.out], away: [true, true, false], cargo: [[1, 1], [0, 1], [0, 0]] },
    bot: {
      x: from + c.a * (to - from), y: floorY(2.6),
      draw: (x, y) => eleBot(x, y, { team: alliance, num, dir: c.out ? s : -s, spin: x * 0.64, rsl: rsl(t, 0), hatch: c.out, e1: lift }),
    },
  };
}

/** teams: the numbers on the blue elevator, the red elevator, the blue arm and the red defender. */
function robots(t, teams = ['5026', '4000', '3000', '7777']) {
  const blue = hatchRun(t, 'blue', teams[0], 1 / 14, 0), red = hatchRun(t, 'red', teams[1], 1 / 16, 0.4);
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
        draw: (x, y) => armBot(x, y, { team: 'blue', num: teams[2], dir: p.out ? 1 : -1, spin: x * 0.64, angle: 0.9 - 1.15 * p.a, ball: p.out }),
      },
      // 7777, playing defence in front of the blue rocket's scoring side.
      {
        x: blueRocket - 38 + Math.sin(t * 0.6) * 20, y: floorY(6.5 + Math.cos(t * 0.8) * 1.2),
        draw: (x, y) => defBot(x, y, { dir: Math.cos(t * 0.6) >= 0 ? 1 : -1, spin: x * 0.64, glint: (t * 0.5) % 1, num: teams[3], rsl: rsl(t, 1) }),
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

export function robotCart(x, y, draw) {
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

/** score: [blue, red], up on the two monitors. */
function scoringTable(score = [41, 38]) {
  const { x0, x1, y } = TABLE, top = y - 20, back = top - 7;
  rect(x0 - 1, back - 1, x1 - x0 + 2, y - back + 2, C.ink);
  rect(x0, back, x1 - x0, 7, '#3a3d48');
  rect(x0, back, x1 - x0, 1, '#5a5e6c');
  rect(x0, top, x1 - x0, 20, '#141519');
  rect(x0, top, x1 - x0, 1, '#3a3d48');
  text('SCORING', (x0 + x1) / 2, top + 8, { font: 3, color: C.steel2, align: 'center' });
  // The score on two monitors facing the crowd, and a laptop.
  [[String(score[0]), C.blue1, x0 + 14], [String(score[1]), C.red1, x0 + 34]].forEach(([n, c, mx]) => {
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
  // A rack of hatch panels, edge-on (the white tape round each one's edge, a glint of its yellow band), and a bin of
  // cargo.
  for (let i = 0; i < 6; i++) {
    rect(x - 15 + i * 3, y - 21, 3, 13, C.ink);
    rect(x - 14 + i * 3, y - 20, 2, 11, i % 2 ? C.steel3 : C.white);
    rect(x - 13 + i * 3, y - 18, 1, 7, C.yel1);
  }
  rect(x + 3, y - 15, 13, 7, C.ink);
  rect(x + 4, y - 14, 11, 5, '#3f4761');
  for (const [dx, dy] of [[6, -15], [10, -16], [13, -14]]) {
    rect(x + dx - 1, y + dy - 1, 4, 4, C.ink);
    rect(x + dx, y + dy, 2, 2, C.org1);
  }
}

// ---- Where people can stand ----
export const WALK_Y = [56, 64]; // the walkway, behind the far wall
export const OPEN_Y = [56, 134]; // the floor past the ends
export const EDGE = FIELD.x0 - STATION - 8; // as close to the driver stations as anyone else gets
const inEnd = (x) => x <= EDGE || x >= WORLD_W - EDGE;
const BLOCKS = [
  ...QUEUE.map((q) => ({ x0: q.x - 19, x1: q.x + 19, y0: q.y - 9, y1: q.y })),
  { x0: SIGN.x - 4, x1: SIGN.x + 4, y0: SIGN.y - 3, y1: SIGN.y },
  { x0: TABLE.x0, x1: TABLE.x1, y0: TABLE.y - 7, y1: TABLE.y },
  { x0: RESET.x - 17, x1: RESET.x + 17, y0: RESET.y - 8, y1: RESET.y },
];
export const blocked = (x, y) => BLOCKS.some((b) => x > b.x0 - 5 && x < b.x1 + 5 && y > b.y0 - 2 && y < b.y1 + 2);
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
 * Everything that stands up, back to front, seen through a camera at camX (and camY, if the view isn't level with the
 * field's own 144 rows). o.who: screen rectangles { x0, x1, y1 } of anyone on the walkway, so a rocket in front of them
 * goes see-through. o.more: people and anything else standing on the floor, to sort in with the rest, as
 * { y: floor line, draw() }. o.robots: false for an empty field (the hatches and cargo already scored stay);
 * o.ends: false to leave out the queue, the scoring table and the reset cart past the ends. For another field than the
 * arena's: o.teams, the numbers on the blue elevator, the red elevator, the blue arm and the red defender; o.queue, on
 * the arm and the elevator waiting on their carts (false: no carts in the queue, for a scene that brings its own; the
 * sign stays); o.score, [blue, red] on the scoring table's monitors. The gates (GATES) are in both walls, chained shut:
 * o.farGates and o.nearGates, lists of { x0, x1, open } (open: its chain unhooked and hanging), say otherwise, and
 * o.nearGate puts just that one in the near wall instead (alliance selection's, by the MC's mark).
 * o.sandstorm: how far down the sandstorm's shutters are over the driver stations, 0 (rolled up, the default) to 1.
 * o.live: a real match instead of the four robots running their loops (match/draw.js makes it, from match/sim.js):
 *   bots      the robots, as { y: floor line, draw() }, sorted in with everything else
 *   fill      every piece: { blue, red }, each { far, near: rockets as rocket() takes them (with roll, the balls
 *             rolling in), ship: { near, far, front } as [cargo, hatch] a bay (hatch 'null' for a null hatch panel),
 *             and drop, the balls dropping in (cargoShip), depots: [far, near] cargo left in each }
 *   loose     pieces dropped on the carpet: { x, y, piece }
 *   rollouts  cargo rolling back out of a bay with no hatch panel, on its way to where it ends up loose (rollOutParts)
 *   sandstorm the shutters, as o.sandstorm, if that isn't given
 * With it, the near wall's rockets are drawn too, see-through.
 */
export function drawFieldLive(g, camX, t, o = {}) {
  const who = o.who ?? [], camY = o.camY ?? 0, live = o.live;
  const { fill, bots } = live ? { fill: null, bots: [] } : robots(o.robots === false ? 0 : t, o.teams);
  const rocketFill = (a) => (live ? live.fill[a].far : fill[a]);
  const shut = [GATES.blue, GATES.red];
  const shipFill = (a) => (live
    ? { ...live.fill[a].ship, out: (live.rollouts ?? []).filter((r) => r.alliance === a && r.struct === 'ship') }
    : SHIP_FILL[a]);
  const things = [
    { y: FIELD.y0, draw: () => sideWall(0, o.farGates ?? shut) },
    ...ROCKETS.flatMap((r) => [
      { y: floorY(WING.deep), span: [r.x - 34, r.x + 34], top: floorY(WING.deep) - WING.up, draw: () => rocketWings(r.x, r.alliance, floorY(WING.deep)) },
      {
        y: floorY(ROCKET_Z), span: [r.x - 17, r.x + 17], top: floorY(ROCKET_Z) - HULL - CONE,
        draw: () => rocket(r.x, r.alliance, rocketFill(r.alliance)),
      },
    ]),
    ...['blue', 'red'].flatMap((a) => [
      { y: floorY(2.25), draw: () => loadingStation(a, 0.5) },
      { y: floorY(27), draw: () => loadingStation(a, 25.25) },
      { y: floorY(20.3), draw: () => hab(a) },
      { y: floorY(27), draw: () => allianceWall(a) },
      ...[0, 9, 18, 27].map((z, i, zs) => ({ y: floorY(z), draw: () => stanchion(a, z, zs[i - 1]) })),
    ]),
    ...sandstormParts(o.sandstorm ?? live?.sandstorm ?? 0),
    { y: floorY(SHIP.z1), draw: () => cargoShip({ blue: shipFill('blue'), red: shipFill('red') }) },
    // The front bays' plaque goes over the near wall's rockets, which stand in front of the nose.
    ...['blue', 'red'].map((a) => ({ y: floorY(SHIP.z1) + 0.02, draw: () => frontBays(a, shipFill(a).front, shipFill(a).out) })),
    ...(o.robots === false ? [] : bots).map((r) => ({ y: r.y, draw: () => r.draw(r.x, r.y) })),
    ...(live ? liveParts(live) : []),
    ...(o.ends === false ? [] : ends(o.queue, o.score)),
    ...(o.more ?? []),
    { y: FIELD.y1 + 1, draw: () => sideWall(27, o.nearGates ?? o.nearGate ?? shut) },
  ];
  useContext(g);
  G = g;
  for (const p of things.sort((p, q) => p.y - q.y)) {
    camera(camX, camY, 1);
    const hides = p.span && who.some((w) => w.x1 > p.span[0] - camX && w.x0 < p.span[1] - camX && w.y1 > p.top - camY);
    if (hides) withAlpha(0.35, p.draw);
    else p.draw();
  }
  G = null;
}

/**
 * A live match's own things: its robots, the depots as they empty, dropped pieces, cargo rolling back out, and the near
 * wall's rockets.
 */
function liveParts(live) {
  return [
    ...live.bots,
    ...['blue', 'red'].flatMap((a) => DEPOT_Z.map((z, i) => ({
      y: floorY(z), draw: () => depot(a, z, live.fill[a].depots?.[i] ?? DEPOT_FULL, true),
    }))),
    ...(live.loose ?? []).map((p) => ({ y: p.y, draw: () => loosePiece(p) })),
    ...(live.rollouts ?? []).flatMap(rollOutParts),
    // The near wall's rockets: faint, in front of the cargo ship but behind the robots working along its near side, so
    // they don't hide them; what's in them on top of everything.
    ...ROCKETS.flatMap((r) => [
      { y: floorY(SHIP.z1) + 0.01, draw: () => rocket(r.x, r.alliance, live.fill[r.alliance].near, floorY(NEAR_ROCKET_Z), 'hull') },
      { y: floorY(27) + 0.5, draw: () => rocket(r.x, r.alliance, live.fill[r.alliance].near, floorY(NEAR_ROCKET_Z), 'pieces') },
    ]),
  ];
}
/** A piece lying on the carpet: a hatch panel flat (an ellipse from here), or a ball. */
function loosePiece({ x, y, piece }) {
  if (piece === 'cargo') return cargo(Math.round(x), Math.round(y) - 3, 3);
  hatchFlat(x, y - 1);
}

/** The queue, its sign, the scoring table and the reset cart, past the ends of the field. */
function ends(queue = QUEUE.map((q) => q.num), score) {
  return [
    ...(queue === false ? [] : QUEUE).map((q, i) => ({
      y: q.y,
      draw: () => robotCart(q.x, q.y, (x, y) => (q.bot === 'arm'
        ? armBot(x, y, { team: 'blue', num: queue[i], angle: -1.25, ball: false })
        : eleBot(x, y, { team: 'blue', num: queue[i], rsl: false }))),
    })),
    { y: SIGN.y, draw: queueSign },
    { y: TABLE.y, draw: () => scoringTable(score) },
    { y: RESET.y, draw: resetCart },
  ];
}

// ---- The rockets' lights ----
// Each rocket's nosecone has lights in it (the 2019 manual, section 4, field lighting): in a match they come on in the
// rocket's alliance colour once it's full, six hatch panels and six cargo; once the match is over and the head referee
// says the field is safe, every one turns green, and drive teams may go on; they go off when the field is ready for the
// next match. Drawn over the cone's tip, the near wall's as faint as the rest of those rockets but brighter, lights
// being lights.
const LIT = { green: ['#1d8a3f', '#3fd06a', '#b8ffcf'], blue: [C.blue1, C.blue2, C.blue3], red: [C.red1, C.red2, C.red3] };
/**
 * The nosecone lights that are on, as { y, draw } (with span and top, so they go see-through with the rocket in front of
 * someone on the walkway) for drawFieldLive's more. lights: [{ alliance, rocket: 'far' | 'near', color: 'green' |
 * 'blue' | 'red' }].
 */
export function noseLights(lights) {
  return lights.map(({ alliance, rocket, color }) => {
    const cx = ROCKETS.find((r) => r.alliance === alliance).x, near = rocket === 'near';
    const base = floorY(near ? NEAR_ROCKET_Z : ROCKET_Z), top = base - HULL, [lo, mid, hi] = LIT[color];
    const draw = () => {
      // A glow round the tip, then the tip's three rows lit, shaded on the right, a glint on the left.
      withAlpha(0.35, () => {
        rect(cx - coneW(0) - 1, top - CONE - 2, coneW(0) * 2 + 2, 2, mid);
        for (let i = 0; i < 4; i++) rect(cx - coneW(i) - 2, top - CONE + i, coneW(i) * 2 + 4, 1, mid);
      });
      for (let i = 0; i < 3; i++) {
        const hw = coneW(i), y = top - CONE + i;
        rect(cx - hw, y, hw * 2, 1, mid);
        rect(cx + hw - Math.max(1, hw >> 1), y, Math.max(1, hw >> 1), 1, lo);
        if (hw > 3) rect(cx - hw + 2, y, 1, 1, hi);
      }
    };
    return near
      ? { y: floorY(27) + 0.6, draw: () => withAlpha(0.6, draw) }
      : { y: base + 0.001, span: [cx - 17, cx + 17], top: top - CONE, draw };
  });
}
