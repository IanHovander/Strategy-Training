// A 2019 match (Deep Space), simulated: six robots, each with its abilities and its alliance's plan for it, driving the
// field for 150 seconds. What it gives back is a timeline for every robot (drive from here to there, pick up, try to
// place, get defended, brown out, climb) and every point as an event with its time, so the animation (animate.js) can
// show on the field exactly what scores, and the score is only ever the sum of the events. Pure: no DOM, runs in Node,
// and the same seed always gives the same match. Fast enough to play hundreds of matches for scouting numbers.
//
// The field is in feet: x along it from the blue alliance wall (0) to the red one (54), z in from the far wall (0) to the
// near one (27), as field.js draws it (8 pixels to the foot along, floorY(z) for the depth). Every place below is
// blue's; red's is blue's mirrored end for end.
//
// The game, and what's simplified:
//   Sandstorm, 0 to 15 s: robots start on their HAB, level 1 or 2, holding a hatch panel or cargo. Driving off it
//     (bumpers past the HAB line) is 3 points from level 1, 6 from level 2. Drivers see through cameras, so robots are a
//     little slower and less accurate until 15 s; a robot with no camera (sandstorm 0) drives off and waits.
//   Teleop, 15 to 150 s: cycles. A hatch panel is 2 points, cargo 3.
//   Where: each alliance's two rockets, one on the far wall and one on the near (three levels; on each level a hatch
//     port either side and cargo behind each), and its half of the cargo ship (8 bays: 2 on the front, 3 down each
//     side). Cargo only stays in behind a hatch panel, so it needs one first, except in a ship bay that started with a
//     null hatch panel. Before the match each side bay gets a null hatch panel or a cargo (the alliance's choice,
//     `preload`); preloaded cargo counts once a hatch closes it in, so a hatch there is worth 5. The camera sees the
//     near wall's rockets from behind, so field.js draws them see-through (live option), their pieces showing.
//   Pieces: hatch panels from the loading stations (two per alliance, in the corners by its wall); cargo from the
//     loading stations' chutes, or off the floor from the two depots beside the HAB (12 each) for robots with a floor
//     intake. SIMPLIFIED: the human players never run out; a dropped piece stays where it fell.
//   Endgame: robots head home for the HAB when the plan says (climbAt, seconds left). Level 1 is 3, level 2 is 6,
//     level 3 is 12. One robot fits on level 3 and one on each of the two level 2 platforms. A failed climb drops back
//     to level 1 (3). Climb points count the moment the robot settles; a robot still on its way at 0:00 gets nothing.
//   Defense (from games/frc-strategy/alliance.js): a defended robot keeps 1 - (defender's ability x its
//     susceptibility) of what it does. Here that's while they're in contact: it works keep^0.75 as fast and places
//     keep^0.25 as accurately, which multiply to keep. Defense starts at teleop (SIMPLIFIED: no crossing in the
//     sandstorm), and a robot in its own HAB zone in the last 30 s can't be touched. A defender that pushes harder than
//     its target can pin it, 5 s at most, then has to back off for 3 s. Contact can brown robots out.
//   Breakdowns: each robot has a chance of dying for the rest of the match (breakdown) and of browning out for a few
//     seconds; defenders break a little more often (as in alliance.js). Modifiers can force these, for a story.
//   SIMPLIFIED: no fouls; robots only touch when one is defending the other; the ranking points are 2 for a win (1 for
//     a tie), 1 for a complete rocket (either one) and 1 for 15 or more HAB climb points.
//
//   simulate({ seed, blue, red, preload, record })   one match (see below for what goes in and what comes out)
//   planAlliance(entries)                             default plans for an alliance: who climbs where, what each scores
//   defaultPlan(robot)                                one robot's plan on its own
//   withMods(robot, mods)                             a robot changed for one match: { 'cargo.grip': 0.6, speed: 10 }
//   averages(make, runs)                              many matches: each robot's average points, for scouting
//   routeBetween(a, b), BLOCKS, PLACES, slotKeys      the field's geometry, for the animation and the tests

export const MATCH = { length: 150, sandstorm: 15, endgame: 30 };
export const POINTS = { hatch: 2, cargo: 3, leave: [0, 3, 6], hab: [0, 3, 6, 12] };
export const DEPOT_CARGO = 12;
/** The simulation's tick, in seconds. Events land between ticks at their exact moment. */
const DT = 0.1;
const LEN = 54, MID = 27;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
/** Half a robot's length with its bumpers: 30 pixels at 8 to the foot. */
export const HALF = 1.875;
export const HAB_LINE = 7.5;

// ---- Luck ----
/** A small seeded random number generator (the Showdown's), so the same seed always plays the same match. */
export function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Mix numbers and strings into one seed: each robot gets its own luck, so changing one plan doesn't reshuffle the rest. */
const mix = (...xs) => xs.reduce((h, x) => {
  const v = typeof x === 'string' ? [...x].reduce((a, c) => Math.imul(a ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261) : Math.floor(x * 1000) >>> 0;
  return Math.imul(h ^ v, 2654435761) >>> 0;
}, 2166136261);
/** A normal-ish time: mean and spread in seconds, never under 40% of the mean nor over 2.5 times it. */
function timeOf([mean, sd], rand) {
  const g = Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
  return Math.min(mean * 2.5, Math.max(mean * 0.4, mean + sd * g));
}

// ---- The field, in feet ----
// Places are where a robot's middle stands to do something there, and which way it faces (+1 toward red's end). A robot
// scores a rocket from beside it, facing one of its two angled faces, as the arena's robots do; the cargo ship from in
// front of a bay, or at the front pair from the HAB side. The rockets: f on the far wall, n on the near one.
const BAY_X = [26, 24.125, 22.25]; // the ship's side bays, from the centre line out (field.js shipBays)
export const PLACES = {
  station: { far: { x: 3.3, z: 1.5, face: -1 }, near: { x: 3.3, z: 25.5, face: -1 } },
  depot: { far: { x: 5.6, z: 5.5, face: -1 }, near: { x: 5.6, z: 21.5, face: -1 } },
  spot: {
    fh: { x: 15.125, z: 2.6, face: 1 }, fa: { x: 22.875, z: 2.6, face: -1 },
    nh: { x: 15.125, z: 24.4, face: 1 }, na: { x: 22.875, z: 24.4, face: -1 },
    front0: { x: 17.1, z: 12.4, face: 1 }, front1: { x: 17.1, z: 14.6, face: 1 },
    ...Object.fromEntries(BAY_X.flatMap((x, i) => [[`near${i}`, { x: x - 2, z: 17.7, face: 1 }], [`far${i}`, { x: x - 2, z: 9.3, face: 1 }]])),
  },
  // Where robots start: on level 2 either side of level 3, or on level 1 in front of them.
  start: { 2: [{ x: 2, z: 9.5 }, { x: 2, z: 17.5 }], 1: [{ x: 5.75, z: 13.5 }, { x: 5.75, z: 9.5 }, { x: 5.75, z: 17.5 }] },
  // The HAB in the endgame: each platform's lane (z), where the robot lines up, and where it ends.
  hab: { lanes: { 3: [13.5], 2: [9.5, 17.5] }, from: 8.8, on: 2, park: 6 },
};
/** The HAB's footprint: level 1 across the front, levels 2 and 3 against the wall. */
export const HAB = { l1: { x0: 4, x1: 7.5, z0: 6.7, z1: 20.3 }, top: { x0: 0, x1: 4, z0: 7.5, z1: 19.5 }, l3: { z0: 11.5, z1: 15.5 } };

/** Where things a robot can't drive through are, as boxes its middle has to stay out of (blue's half, then the ship). */
const BLUE_BLOCKS = [
  { x0: 15.2, x1: 22.8, z0: 0, z1: 3.4, what: 'rocket' },
  { x0: 15.2, x1: 22.8, z0: 23.6, z1: 27, what: 'rocket' },
  { x0: 0, x1: 5.9, z0: 6.2, z1: 20.8, what: 'hab' },
  { x0: 0, x1: 5.4, z0: 3.2, z1: 7.8, what: 'depot' },
  { x0: 0, x1: 5.4, z0: 19.2, z1: 23.8, what: 'depot' },
];
export const BLOCKS = [
  ...BLUE_BLOCKS,
  ...BLUE_BLOCKS.map((b) => ({ ...b, x0: LEN - b.x1, x1: LEN - b.x0 })),
  { x0: 17.4, x1: 36.6, z0: 9.8, z1: 17.3, what: 'ship' },
];
/** How far a robot's middle can go: the walls, less half a robot. */
const BOUNDS = { x0: 2, x1: 52, z0: 1.4, z1: 25.6 };

/** A place for an alliance: blue's as it is, red's mirrored. side: +1 blue, -1 red. */
export const at = (side, p) => (side > 0 ? { ...p } : { ...p, x: LEN - p.x, face: -(p.face ?? 1) });
/** x as seen from an alliance's own wall. */
const own = (side, x) => (side > 0 ? x : LEN - x);

// ---- Finding a way round ----
// The shortest way between two points that keeps out of every box: straight if nothing's in the way, otherwise round
// the boxes' corners (a visibility graph, worked out once).
const inside = (b, x, z, e = 1e-6) => x > b.x0 + e && x < b.x1 - e && z > b.z0 + e && z < b.z1 - e;
const inBounds = (x, z) => x >= BOUNDS.x0 && x <= BOUNDS.x1 && z >= BOUNDS.z0 && z <= BOUNDS.z1;
/** Does the segment from (ax, az) to (bx, bz) cross into box b? (Liang-Barsky, so running along an edge is fine.) */
function hits(b, ax, az, bx, bz) {
  const e = 1e-6, dx = bx - ax, dz = bz - az;
  let t0 = 0, t1 = 1;
  const edge = (p, q) => {
    if (p === 0) return q >= 0;
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
    return true;
  };
  return edge(-dx, ax - (b.x0 + e)) && edge(dx, b.x1 - e - ax) && edge(-dz, az - (b.z0 + e)) && edge(dz, b.z1 - e - az) && t1 - t0 > 1e-9;
}
function clear(ax, az, bx, bz) {
  for (const b of BLOCKS) if (hits(b, ax, az, bx, bz)) return false;
  return true;
}
const CORNERS = BLOCKS.flatMap((b) => [[b.x0 - 0.3, b.z0 - 0.3], [b.x1 + 0.3, b.z0 - 0.3], [b.x0 - 0.3, b.z1 + 0.3], [b.x1 + 0.3, b.z1 + 0.3]])
  .filter(([x, z]) => inBounds(x, z) && BLOCKS.every((b) => !inside(b, x, z)));
const SEES = CORNERS.map(([ax, az], i) => CORNERS.map(([bx, bz], j) => i !== j && clear(ax, az, bx, bz)));
const routes = new Map();

const CX = CORNERS.map((c) => c[0]), CZ = CORNERS.map((c) => c[1]), NC = CORNERS.length;
const GAP = CORNERS.map(([ax, az], i) => CORNERS.map(([bx, bz], j) => (SEES[i][j] ? Math.hypot(bx - ax, bz - az) : Infinity)));
const dist = new Float64Array(NC + 1), prev = new Int32Array(NC + 1), done = new Uint8Array(NC + 1), toB = new Uint8Array(NC);

/** The way from a to b ({ x, z } each) as a list of points, a first and b last. keep: false for one-off ways (a chase). */
export function routeBetween(a, b, keep = true) {
  const key = keep ? `${a.x.toFixed(2)},${a.z.toFixed(2)}>${b.x.toFixed(2)},${b.z.toFixed(2)}` : null;
  if (keep && routes.has(key)) return routes.get(key);
  let way;
  if (clear(a.x, a.z, b.x, b.z)) way = [a, b];
  else {
    // Dijkstra over the corners, with a and b joined to every corner they can see.
    dist.fill(Infinity);
    prev.fill(-1);
    done.fill(0);
    for (let i = 0; i < NC; i++) {
      toB[i] = clear(CX[i], CZ[i], b.x, b.z) ? 1 : 0;
      if (clear(a.x, a.z, CX[i], CZ[i])) dist[i] = Math.hypot(CX[i] - a.x, CZ[i] - a.z);
    }
    for (;;) {
      let u = -1;
      for (let i = 0; i <= NC; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0 || u === NC) break;
      done[u] = 1;
      const row = GAP[u];
      for (let v = 0; v < NC; v++) {
        if (done[v] || row[v] === Infinity) continue;
        const d = dist[u] + row[v];
        if (d < dist[v]) { dist[v] = d; prev[v] = u; }
      }
      if (toB[u]) {
        const d = dist[u] + Math.hypot(b.x - CX[u], b.z - CZ[u]);
        if (d < dist[NC]) { dist[NC] = d; prev[NC] = u; }
      }
    }
    if (dist[NC] === Infinity) way = [a, b]; // boxed in: go straight (never happens on this field)
    else {
      way = [b];
      for (let i = prev[NC]; i >= 0; i = prev[i]) way.unshift({ x: CX[i], z: CZ[i] });
      way.unshift(a);
    }
  }
  if (keep) {
    if (routes.size > 20000) routes.clear();
    routes.set(key, way);
  }
  return way;
}
const lengthOf = (way) => way.reduce((s, p, i) => (i ? s + Math.hypot(p.x - way[i - 1].x, p.z - way[i - 1].z) : 0), 0);
/** The point d feet along a way. */
function along(way, d) {
  for (let i = 1; i < way.length; i++) {
    const a = way[i - 1], b = way[i], l = Math.hypot(b.x - a.x, b.z - a.z);
    if (d <= l || i === way.length - 1) {
      const k = l > 0 ? Math.min(1, Math.max(0, d / l)) : 1;
      return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, dx: b.x - a.x };
    }
    d -= l;
  }
  return { ...way[way.length - 1], dx: 0 };
}
/** Push a point out of any box it's in (to the nearest edge that isn't in another), and inside the walls. */
function outOfBlocks(p) {
  let x = Math.min(BOUNDS.x1, Math.max(BOUNDS.x0, p.x)), z = Math.min(BOUNDS.z1, Math.max(BOUNDS.z0, p.z));
  const free = (px, pz) => inBounds(px, pz) && BLOCKS.every((b) => !inside(b, px, pz));
  for (let pass = 0; pass < 4; pass++) {
    const b = BLOCKS.find((q) => inside(q, x, z));
    if (!b) break;
    const opts = [[b.x0 - 0.1, z], [b.x1 + 0.1, z], [x, b.z0 - 0.1], [x, b.z1 + 0.1], [b.x0 - 0.1, b.z0 - 0.1], [b.x1 + 0.1, b.z0 - 0.1],
      [b.x0 - 0.1, b.z1 + 0.1], [b.x1 + 0.1, b.z1 + 0.1]].sort((u, v) => Math.hypot(u[0] - x, u[1] - z) - Math.hypot(v[0] - x, v[1] - z));
    [x, z] = opts.find(([px, pz]) => free(px, pz)) ?? opts.find(([px, pz]) => inBounds(px, pz)) ?? [x, z];
  }
  return { x, z };
}

// ---- Robots and plans ----
// A robot (robots.js has the archetypes and the teams):
//   num, sprite                     its number and the sprite that draws it (bots.js)
//   speed                           ft/s between places, on average (top speeds are higher; this counts the turns)
//   hatch, cargo: { reach, ship, floor, pick: [mean, sd], place: [mean, sd], acc, grip }
//     reach: the highest rocket level it can place on (0: it can't handle that piece at all); ship: whether it can
//     score the cargo ship; floor: cargo off the floor (the depots); pick and place: seconds; acc: the chance a
//     placement stays in; grip: the chance a pickup works (an intake that fumbles shows up here)
//   lift                            seconds for its mechanism to go up a rocket level
//   climb: { 1: [odds, secs], 2: [...], 3: [...] }   the HAB levels it can climb
//   start                           the highest HAB level it can drive off at the start (1 or 2)
//   sandstorm                       0: no camera, it only drives off; 1: drives by camera; 2: a good camera or auto
//   defense, susceptibility, push   0 to 1: how much it takes off a robot it defends, how much defense takes off it,
//                                   how hard it pushes (a harder pusher can pin)
//   breakdown, brownout             the chances, per match, that it dies for good or browns out for a few seconds
//
// A plan for one robot (defaultPlan fills in what's missing):
//   role: 'score' | 'defend'        defend: `defend` is the opponent's number to stay on from teleop
//   piece: 'hatch' | 'cargo' | 'both', where: 'rocket' | 'ship' | 'any', top: the highest rocket level to use
//   preload: 'hatch' | 'cargo'      what it holds at the start
//   sandstorm: true                 score the preload in the sandstorm (if the robot can see to)
//   start: 1 | 2                    the HAB level it starts on
//   climb: 0 to 3, climbAt          the HAB level to end on, and the seconds left when it heads home
//   then: 'defend' | 'wait'         when there's nothing left it can score: defend their best scorer, or wait

/** A copy of a robot changed for one match: { 'cargo.grip': 0.6, speed: 10 }, and force (scripted events) kept as is. */
export function withMods(robot, mods = {}) {
  const r = JSON.parse(JSON.stringify(robot));
  for (const [path, v] of Object.entries(mods)) {
    if (path === 'force') { r.force = v; continue; }
    const keys = path.split('.');
    let o = r;
    for (const k of keys.slice(0, -1)) o = o[k] ??= {};
    o[keys.at(-1)] = v;
  }
  return r;
}

const can = (robot, piece) => (robot[piece]?.reach ?? 0) > 0 || (robot[piece]?.ship ?? false);
/** What a robot scores best, as a plan's piece: both if it can handle both. */
const bestPiece = (robot) => (can(robot, 'hatch') && can(robot, 'cargo') ? 'both' : can(robot, 'cargo') ? 'cargo' : can(robot, 'hatch') ? 'hatch' : null);
/** The points a robot expects from trying a climb: made, or back to level 1. */
const climbValue = (robot, level) => {
  const c = robot.climb?.[level];
  return c ? c[0] * POINTS.hab[level] + (1 - c[0]) * (level > 1 ? POINTS.hab[1] : 0) : 0;
};
/** Seconds to leave for the trip home and the climb: a long drive at its speed, the climb, a little spare. */
const homeTime = (robot, level) => Math.ceil(level ? 32 / robot.speed + (robot.climb?.[level]?.[1] ?? 3) + 4 : 0);

export function defaultPlan(robot) {
  const piece = bestPiece(robot);
  const climb = [3, 2, 1].find((l) => robot.climb?.[l] && climbValue(robot, l) >= climbValue(robot, l - 1 || 1) - 0.01) ?? 1;
  return {
    role: piece ? 'score' : 'defend', piece: piece ?? 'hatch', where: 'any', top: 3,
    preload: piece === 'cargo' ? 'cargo' : 'hatch', sandstorm: (robot.sandstorm ?? 1) > 0,
    start: Math.min(2, robot.start ?? 1), climb, climbAt: homeTime(robot, climb),
  };
}

/**
 * Plans for an alliance: entries [{ robot, plan }] with whatever plan each was given, the rest filled in. Only one
 * robot fits on level 3 and two on level 2: the HAB goes to whoever gains most from it, and the rest step down.
 * Returns the plans in the same order.
 */
export function planAlliance(entries) {
  const plans = entries.map(({ robot, plan }) => ({ ...defaultPlan(robot), ...plan }));
  const room = { 3: 1, 2: 2 };
  const order = plans.map((p, i) => i).sort((i, j) => climbValue(entries[j].robot, plans[j].climb) - climbValue(entries[i].robot, plans[i].climb));
  for (const i of order) {
    const r = entries[i].robot, p = plans[i];
    let level = p.climb;
    while (level > 1 && (!room[level] || !r.climb?.[level])) level--;
    if (room[level]) room[level]--;
    if (level !== p.climb) Object.assign(p, { climb: level, climbAt: entries[i].plan?.climbAt ?? homeTime(r, level) });
  }
  // Lanes on the HAB for the endgame: level 3's in the middle, level 2's either side, parking in whichever is left.
  const lanes = [13.5, 9.5, 17.5], taken = new Set();
  const lane = (want) => {
    const z = want.find((w) => !taken.has(w)) ?? lanes.find((w) => !taken.has(w)) ?? 13.5;
    taken.add(z);
    return z;
  };
  for (const p of plans) if (p.climb >= 2) p.lane = lane(PLACES.hab.lanes[p.climb]);
  for (const p of plans) if (p.climb === 1) p.lane = lane(lanes);
  // Two robots that start on level 2: there are only two platforms, so a third starts on level 1.
  let l2 = 2;
  for (const [i, p] of plans.entries()) {
    if (p.start >= 2 && (entries[i].robot.start ?? 1) >= 2 && l2 > 0) l2--;
    else p.start = 1;
  }
  return plans;
}

// ---- The scoring places ----
// Slots for an alliance, as keys: 'hatch:f2h' is the hatch port on the far rocket's level 2, on its home face (toward
// its own end), 'cargo:n2a' the cargo behind the near rocket's level 2 away face; 'hatch:near0' the hatch on the cargo
// ship's near side, the bay by the centre line, 'cargo:front1' the cargo in the front bay nearer you. A slot holds 0,
// 1, 'null' (a null hatch panel) or 'pre' (preloaded cargo, not yet held in by a hatch).
const SHIP_BAYS = ['front0', 'front1', 'near0', 'near1', 'near2', 'far0', 'far1', 'far2'];
export const ROCKETS = ['f', 'n'];
export const slotKeys = [
  ...ROCKETS.flatMap((r) => [1, 2, 3].flatMap((l) => ['h', 'a'].flatMap((s) => [`hatch:${r}${l}${s}`, `cargo:${r}${l}${s}`]))),
  ...SHIP_BAYS.flatMap((b) => [`hatch:${b}`, `cargo:${b}`]),
];
/** The side bays as the preload lists them: near side from the middle out, then the far side. */
export const PRELOAD_BAYS = ['near0', 'near1', 'near2', 'far0', 'far1', 'far2'];
/** What a slot key means: { piece, struct ('rocket' | 'ship'), rocket ('f' | 'n'), level, face ('h' | 'a'), bay, spot }. */
const infos = new Map();
export function slotInfo(key) {
  if (infos.has(key)) return infos.get(key);
  const [piece, where] = key.split(':');
  const info = where.length === 3
    ? { piece, struct: 'rocket', rocket: where[0], level: +where[1], face: where[2], spot: `${where[0]}${where[2]}` }
    : { piece, struct: 'ship', bay: where, level: 1, spot: where };
  infos.set(key, info);
  return info;
}
/** Inches up for each place a piece goes: rocket hatch ports and cargo, the ship's hatch port and over its lip. */
export const HEIGHT_IN = { hatch: [19, 47, 75], cargo: [27.5, 55.5, 83.5], shipHatch: 19, shipCargo: 36, stationHatch: 19, stationCargo: 34, floor: 3 };
const heightOf = (info) => (info.struct === 'ship' ? (info.piece === 'hatch' ? HEIGHT_IN.shipHatch : HEIGHT_IN.shipCargo) : HEIGHT_IN[info.piece][info.level - 1]);

function newSlots(preload) {
  const s = Object.fromEntries(slotKeys.map((k) => [k, 0]));
  PRELOAD_BAYS.forEach((bay, i) => {
    if ((preload?.[i] ?? 'null') === 'cargo') s[`cargo:${bay}`] = 'pre';
    else s[`hatch:${bay}`] = 'null';
  });
  return s;
}
/**
 * The alliance's default preload. Cargo in a side bay is 5 points for a hatch later, but that bay then takes no more
 * cargo; a null hatch makes a bay ready for cargo. So: cargo for hatch robots to close in, as many as there are more
 * robots (two bays each, one fewer for each cargo robot), and null hatches everywhere else.
 */
export function defaultPreload(entries, plans) {
  const scorers = entries.map((e, i) => ({ r: e.robot, p: plans[i] })).filter((x) => x.p.role === 'score');
  const hatchOnly = scorers.filter((x) => x.p.piece === 'hatch' || !can(x.r, 'cargo')).length;
  const cargoOnly = scorers.filter((x) => x.p.piece === 'cargo' || !can(x.r, 'hatch')).length;
  const both = scorers.length - hatchOnly - cargoOnly;
  const n = Math.max(0, Math.min(6, 2 * hatchOnly - cargoOnly + (both > 0 && cargoOnly === 0 ? 2 : 0)));
  // Near side first, so the hatches that hold the cargo in are the ones the camera sees.
  const order = ['near2', 'near1', 'near0', 'far2', 'far1', 'far0'];
  return PRELOAD_BAYS.map((b) => (order.indexOf(b) < n ? 'cargo' : 'null'));
}

// ---- The match ----
/**
 * Play a match.
 *   seed      any number: the match's luck
 *   blue, red three entries each: { robot, plan, mods } (plan and mods optional; mods as withMods)
 *   preload   { blue, red }: six 'null' or 'cargo' each, for the side bays in PRELOAD_BAYS order (defaultPreload if not)
 *   record    false to skip the robots' position tracks (for running hundreds of matches)
 * Returns:
 *   robots    six, blue's first: { id, num, alliance, slot, sprite, robot, plan, steps, track, contacts, points }
 *             steps: what it does, back to back from 0 to 150: { kind, t0, t1, ... }, kind one of
 *               'start'  on the HAB (level), 'drive' (to: what for, from, way), 'pickup' (piece, from: 'station' |
 *               'depot', which, ok), 'place' (slot, piece, hit), 'wait' (why), 'defend' (target), 'climb' (level,
 *               made, lane), 'park', 'dead' (why: 'breakdown' | 'brownout'). Every step has hold (what it carries).
 *             track: [t, x, z] points to draw it from (straight lines between them)
 *             contacts: when it was defended: { t0, t1, by, pinned }
 *   events    every point: { t, alliance, pts, kind ('leave' | 'hatch' | 'cargo' | 'secured' | 'hab'), by, slot, text }
 *   fills     every change to the scoring places, at its moment: { t, alliance, slot, value } (t = 0: the preloads)
 *   drops     pieces dropped on the floor: { t, piece, x, z, by, why ('miss' | 'fumble') }
 *   depots    { t, alliance, which, left } each time a depot gives up a cargo
 *   log       everything worth a line, in order: { t, by, kind, text }
 *   score     { blue, red }: the sum of the events, always
 *   rp        { blue: { win, rocket, hab, total }, red }
 *   winner    'blue' | 'red' | 'tie'
 */
export function simulate({ seed = 1, blue, red, preload = {}, record = true }) {
  const sides = { blue, red };
  const m = {
    t: 0, now: 0, seed, agents: [], events: [], fills: [], drops: [], depots: [], log: [], record,
    slots: {}, depot: {}, preload: {}, reserved: { blue: new Map(), red: new Map() },
  };
  for (const alliance of ['blue', 'red']) {
    const entries = sides[alliance].map((e) => ({ ...e, robot: e.mods ? withMods(e.robot, e.mods) : e.robot }));
    const plans = planAlliance(entries);
    const pre = preload[alliance] ?? defaultPreload(entries, plans);
    m.preload[alliance] = pre;
    m.slots[alliance] = newSlots(pre);
    m.depot[alliance] = { far: DEPOT_CARGO, near: DEPOT_CARGO };
    for (const [k, v] of Object.entries(m.slots[alliance])) if (v) m.fills.push({ t: 0, alliance, slot: k, value: v });
    const starts = startSpots(plans);
    entries.forEach((e, slot) => m.agents.push(makeAgent(m, alliance, slot, e.robot, plans[slot], starts[slot])));
  }
  for (const a of m.agents) a.foes = m.agents.filter((b) => b.alliance !== a.alliance);
  for (const a of m.agents) {
    if (a.plan.role !== 'defend') continue;
    a.target = a.foes.find((b) => b.num === String(a.plan.defend)) ?? bestFoe(a);
  }
  // Tick through the match. Robots move in a fixed order, so it's the same every time.
  const ticks = Math.round(MATCH.length / DT);
  for (let i = 0; i < ticks; i++) {
    m.t = i * DT;
    for (const a of m.agents) step(m, a, DT);
    contact(m);
    if (record) for (const a of m.agents) a.track.push([+(m.t + DT).toFixed(2), a.x, a.z]);
  }
  m.t = MATCH.length;
  finish(m);
  return result(m);
}

/** Start spots: the level 2 robots on the two level 2 platforms, the rest on level 1 in front. */
function startSpots(plans) {
  const l2 = [...PLACES.start[2]], l1 = [...PLACES.start[1]];
  return plans.map((p) => (p.start >= 2 && l2.length ? { ...l2.shift(), level: 2 } : { ...l1.shift(), level: 1 }));
}

function makeAgent(m, alliance, slot, robot, plan, start) {
  const side = alliance === 'blue' ? 1 : -1, s = at(side, start);
  const a = {
    id: `${alliance[0]}${slot}`, num: String(robot.num ?? `${alliance[0]}${slot}`), alliance, slot, side, robot, plan,
    rand: seeded(mix(m.seed, alliance, slot, String(robot.num ?? ''))),
    x: s.x, z: s.z, face: side, hold: plan.preload ?? null, startLevel: start.level, left: false,
    queue: [], task: null, steps: [], track: [[0, s.x, s.z]], contacts: [], points: 0,
    deadUntil: -1, pinnedUntil: -1, backoffUntil: -1, pinEnd: -1, by: [], goal: null, src: null, climbed: false, habLevel: start.level,
    foes: [], target: null, chase: null, slowed: 1, vx: 0, vz: 0,
  };
  if (!can(robot, a.hold)) a.hold = can(robot, 'hatch') ? 'hatch' : can(robot, 'cargo') ? 'cargo' : null;
  openStep(m, a, { kind: 'start', level: start.level });
  // Breakdowns and brownouts: rolled now, at random moments; or forced by the match's modifiers.
  a.troubles = [];
  const dRate = (robot.breakdown ?? 0.03) + (plan.role === 'defend' ? 0.05 : 0);
  if (a.rand() < dRate) a.troubles.push({ t: 5 + a.rand() * 140, why: 'breakdown', dur: Infinity });
  if (a.rand() < (robot.brownout ?? 0.03)) a.troubles.push({ t: 10 + a.rand() * 135, why: 'brownout', dur: 3 + a.rand() * 6 });
  for (const f of robot.force?.troubles ?? []) a.troubles.push({ dur: f.why === 'brownout' && !f.dead ? 5 : Infinity, ...f });
  a.troubles.sort((p, q) => p.t - q.t);
  return a;
}

/** How much a robot scores, roughly: what a defender with no orders goes after. */
const worthOf = (b) => (b.plan.role === 'score' ? b.robot.speed * Math.max(b.robot.cargo?.acc ?? 0, b.robot.hatch?.acc ?? 0) : 0);
const bestFoe = (a) => a.foes.reduce((best, b) => (!best || worthOf(b) > worthOf(best) ? b : best), null);

// ---- Steps and the log ----
function openStep(m, a, s) {
  const t = +m.now.toFixed(3);
  // Waiting (or defending) on and on for the same reason is one step, not a new one every few seconds.
  if ((s.kind === 'wait' || s.kind === 'defend') && a.step?.kind === s.kind && a.step.why === s.why && a.step.target === s.target && a.step.t1 === t) {
    a.step.t1 = null;
    return;
  }
  if (a.step && a.step.t1 == null) a.step.t1 = t;
  a.step = { ...s, t0: t, hold: a.hold };
  a.steps.push(a.step);
}
const closeStep = (m, a) => {
  if (a.step && a.step.t1 == null) a.step.t1 = +m.now.toFixed(3);
};
const say = (m, a, kind, text) => m.log.push({ t: +m.now.toFixed(2), by: a?.num ?? null, alliance: a?.alliance, kind, text });
function score(m, a, pts, kind, slot, text) {
  const e = { t: +m.now.toFixed(3), alliance: a.alliance, pts, kind, by: a.num, slot, text };
  m.events.push(e);
  a.points += pts;
  say(m, a, kind, `${text} +${pts}`);
}
const timeLeft = (m) => MATCH.length - m.now;
const words = (info) => (info.struct === 'rocket' ? `${info.rocket === 'f' ? 'FAR' : 'NEAR'} ROCKET L${info.level}` : `SHIP ${info.bay.replace(/\d/, '').toUpperCase()}`);

// ---- One robot, one tick ----
function step(m, a, dt) {
  let left = dt;
  m.now = m.t;
  for (let guard = 0; left > 1e-9 && guard < 8; guard++) {
    m.now = m.t + dt - left;
    // Always doing something (if only waiting), so its steps run back to back, troubles and all.
    if (!a.task && a.deadUntil <= m.now) next(m, a);
    // Trouble: a breakdown or a brownout starting now.
    const tr = a.troubles[0];
    if (tr && tr.t <= m.now + left && m.now < MATCH.length) {
      if (tr.t > m.now) { left -= work(m, a, tr.t - m.now); continue; }
      a.troubles.shift();
      if (dead(a)) continue;
      a.deadUntil = Math.max(a.deadUntil, tr.t + tr.dur);
      if (dead(a)) {
        // Dead for good: whatever it was going to do, it won't.
        release(m, a);
        a.task = null;
        a.queue = [];
        a.src = null;
      }
      openStep(m, a, { kind: 'dead', why: tr.why, until: Number.isFinite(a.deadUntil) ? +a.deadUntil.toFixed(2) : null });
      say(m, a, tr.why, tr.dur === Infinity ? (tr.why === 'brownout' ? 'BROWNS OUT. DEAD ON THE FIELD' : 'BREAKS DOWN. DEAD FOR THE MATCH') : 'BROWNS OUT');
    }
    if (a.deadUntil > m.now) {
      const until = Math.min(a.deadUntil, m.now + left);
      left -= until - m.now;
      m.now = until;
      if (a.deadUntil <= m.now + 1e-9) {
        // Back up: carry on with whatever it was doing.
        a.deadUntil = -1;
        say(m, a, 'reboot', 'BACK UP');
        if (a.task) openStep(m, a, { ...a.task.step, cont: true });
        else openStep(m, a, { kind: 'wait', why: 'reboot' });
      }
      continue;
    }
    if (!a.task) next(m, a);
    if (!a.task) { left = 0; break; }
    left -= work(m, a, left);
  }
}

/** How fast it's working now: 0 pinned, slowed by every defender on it, 1 otherwise. */
function rateOf(m, a) {
  if (a.pinnedUntil > m.now) return 0;
  return a.by.reduce((r, d) => r * keepOf(d, a) ** 0.75, 1);
}
/** What a robot keeps of what it does with this defender on it (alliance.js's rule), a defender itself slowed. */
const keepOf = (d, a) => 1 - Math.min(1, (d.robot.defense ?? 0.3) * d.slowed) * (a.robot.susceptibility ?? 0.5);

/** Work on the current task for up to `secs`. Returns the seconds used. */
function work(m, a, secs) {
  const task = a.task;
  if (!task) return secs;
  const rate = task.kind === 'defend' || task.kind === 'wait' ? 1 : rateOf(m, a);
  if (task.kind === 'wait') {
    const used = Math.max(0, Math.min(task.until, m.now + secs) - m.now);
    if (task.until <= m.now + secs + 1e-9) end(m, a, m.now + used);
    return used;
  }
  if (task.kind === 'defend') return defend(m, a, secs);
  if (rate <= 0) return secs;
  const need = (task.work - task.done) / rate;
  const used = Math.min(secs, need);
  task.done += used * rate;
  if (task.kind === 'drive' || task.kind === 'climb') moveOn(m, a, task, m.now + used);
  if (task.kind === 'place' && a.by.length) task.guarded += used;
  if (need <= secs + 1e-9) {
    task.done = task.work;
    if (task.kind === 'drive' || task.kind === 'climb') moveOn(m, a, task, m.now + used);
    end(m, a, m.now + used);
  }
  return used;
}

/** Where a drive (or a climb) has got to at time t: speeding up and slowing down at the ends of the way. */
function moveOn(m, a, task, t) {
  if (task.kind === 'climb') {
    const k = task.done / task.work, c = task.path;
    // Up onto level 1, up the mechanism, onto the platform (or, missed, back where it started), as animate.js shows.
    const x = k < 0.15 ? c.from + (c.l1 - c.from) * (k / 0.15) : k < 0.7 || !task.made ? c.l1 : c.l1 + (c.on - c.l1) * Math.min(1, (k - 0.7) / 0.2);
    a.x = x;
    return;
  }
  const { way, len } = task, T = task.work, ta = Math.min(0.45, T / 2), v = len / Math.max(1e-6, T - ta), tau = task.done;
  const d = tau < ta ? (v * tau * tau) / (2 * ta) : tau > T - ta ? len - (v * (T - tau) ** 2) / (2 * ta) : v * (tau - ta / 2);
  const p = along(way, Math.min(len, Math.max(0, d)));
  a.x = p.x;
  a.z = p.z;
  if (Math.abs(p.dx) > 0.05) a.face = Math.sign(p.dx);
  // The sandstorm bonus: bumpers all the way past the HAB line before 0:15 of the match.
  if (!a.crossed && own(a.side, a.x) > HAB_LINE + HALF) {
    a.crossed = true;
    if (t <= MATCH.sandstorm) {
      const was = m.now;
      m.now = t;
      score(m, a, POINTS.leave[a.startLevel], 'leave', null, `OFF HAB LEVEL ${a.startLevel}`);
      m.now = was;
    }
  }
}

// ---- Tasks ----
const driveTask = (a, to, why) => {
  const from = { x: a.x, z: a.z };
  // Off the HAB (or a depot's corner): straight out toward the field first.
  const pre = [];
  for (const b of BLOCKS) if (inside(b, from.x, from.z)) pre.push({ x: b.x0 < 1 ? b.x1 + 0.05 : b.x0 - 0.05, z: from.z });
  const way = pre.length ? [from, ...routeBetween(pre[0], to).map((p, i) => (i ? p : pre[0]))] : routeBetween(from, to);
  const len = lengthOf(way);
  const extra = a.steps.length === 1 && a.startLevel === 2 ? 0.8 : 0; // dropping off level 2 takes a moment
  return { kind: 'drive', way, len, work: len / a.robot.speed + 0.45 + extra, done: 0, to: { x: to.x, z: to.z, face: to.face }, step: { kind: 'drive', why } };
};
const pickTask = (m, a, piece, from, which) => {
  const p = a.robot[piece];
  const sand = sandOf(m, a);
  return {
    kind: 'pickup', piece, from, which, work: timeOf(p.pick, a.rand) * sand.time, done: 0,
    step: { kind: 'pickup', piece, from, which },
  };
};
const placeTask = (m, a, key) => {
  const info = slotInfo(key), p = a.robot[info.piece], sand = sandOf(m, a);
  const up = Math.max(0, heightOf(info) - 19) / 28;
  return {
    kind: 'place', key, info, work: (timeOf(p.place, a.rand) + up * (a.robot.lift ?? 0.6)) * sand.time, done: 0, guarded: 0,
    sand: sand.acc, step: { kind: 'place', slot: key, piece: info.piece },
  };
};
const waitTask = (m, a, secs, why) => ({ kind: 'wait', until: m.now + secs, step: { kind: 'wait', why } });
/** The sandstorm's camera: slower and a little less accurate. (With no camera a robot doesn't try.) */
function sandOf(m, a) {
  if (m.now >= MATCH.sandstorm) return { time: 1, acc: 1 };
  return (a.robot.sandstorm ?? 1) >= 2 ? { time: 1.1, acc: 0.95 } : { time: 1.25, acc: 0.88 };
}

function begin(m, a, task) {
  a.task = task;
  openStep(m, a, task.step);
  if (task.kind === 'drive') a.step.way = task.way.map((p) => [+p.x.toFixed(2), +p.z.toFixed(2)]);
}

/** A task's done at time t: its consequences, then the next. */
function end(m, a, t) {
  const task = a.task;
  m.now = t;
  a.task = null;
  if (task.kind === 'drive') {
    a.x = task.to.x;
    a.z = task.to.z;
    if (task.to.face) a.face = task.to.face;
    if (task.park) {
      a.parked = true;
      a.habLevel = 1;
      score(m, a, POINTS.hab[1], 'hab', null, 'PARKS ON LEVEL 1');
    }
  } else if (task.kind === 'pickup') endPickup(m, a, task);
  else if (task.kind === 'place') endPlace(m, a, task);
  else if (task.kind === 'climb') endClimb(m, a, task);
  closeStep(m, a);
  if (a.queue.length) begin(m, a, a.queue.shift());
}

function endPickup(m, a, task) {
  const p = a.robot[task.piece];
  a.src = null;
  if (task.from === 'depot') {
    if (m.depot[a.alliance][task.which] <= 0) {
      a.step.ok = false;
      a.queue = [];
      return;
    }
  }
  if (a.rand() < (p.grip ?? 0.95)) {
    a.hold = task.piece;
    a.step.ok = true;
    if (task.from === 'depot') {
      const left = --m.depot[a.alliance][task.which];
      m.depots.push({ t: +t3(m), alliance: a.alliance, which: task.which, left });
    }
  } else {
    // Fumbled: the piece gets away (it bounces off, or the human player has to feed it again). Try once more.
    a.step.ok = false;
    m.drops.push({ t: +t3(m), piece: task.piece, x: a.x + a.face * -1.2, z: a.z + (a.rand() - 0.5), by: a.num, why: 'fumble' });
    if (task.from === 'depot') m.depot[a.alliance][task.which]--, m.depots.push({ t: +t3(m), alliance: a.alliance, which: task.which, left: m.depot[a.alliance][task.which] });
    say(m, a, 'fumble', `FUMBLES THE ${task.piece === 'hatch' ? 'HATCH' : 'CARGO'}`);
    a.src = { from: task.from, which: task.which };
    a.queue.unshift({ ...pickTask(m, a, task.piece, task.from, task.which), work: timeOf(p.pick, a.rand) * 0.7 });
  }
}
const t3 = (m) => m.now.toFixed(3);

function endPlace(m, a, task) {
  const { key, info } = task, slots = m.slots[a.alliance];
  release(m, a);
  const p = a.robot[info.piece];
  // Defense takes some accuracy, for the share of the placement it was there for.
  const guard = task.work > 0 ? Math.min(1, task.guarded / Math.max(0.1, task.work)) : 0;
  const keep = a.lastKeep ?? 1;
  const levelHit = info.struct === 'rocket' ? (info.level - 1) * 0.03 : 0;
  const acc = (p.acc ?? 0.85) * task.sand * (1 - guard * (1 - keep ** 0.25)) - levelHit;
  const piece = info.piece;
  a.hold = null;
  if (!slotFree(slots, key) || a.rand() >= acc) {
    a.step.hit = false;
    m.drops.push({ t: +t3(m), piece, x: a.x + a.face * 1.6, z: a.z + 0.8 + a.rand() * 0.8, by: a.num, why: 'miss' });
    say(m, a, 'miss', `MISSES ${piece === 'hatch' ? 'A HATCH' : 'CARGO'}, ${words(info)}`);
    return;
  }
  a.step.hit = true;
  slots[key] = 1;
  if (m.room) m.room[a.alliance] = null;
  m.fills.push({ t: +t3(m), alliance: a.alliance, slot: key, value: 1 });
  score(m, a, POINTS[piece], piece, key, `${piece === 'hatch' ? 'HATCH' : 'CARGO'}, ${words(info)}`);
  // A hatch on a bay with preloaded cargo holds that cargo in: it counts now.
  const behind = `cargo:${key.split(':')[1]}`;
  if (piece === 'hatch' && slots[behind] === 'pre') {
    slots[behind] = 1;
    m.fills.push({ t: +t3(m), alliance: a.alliance, slot: behind, value: 1 });
    score(m, a, POINTS.cargo, 'secured', behind, `PRELOADED CARGO HELD IN, ${words(info)}`);
  }
}

function endClimb(m, a, task) {
  const { level, made } = task;
  a.climbed = true;
  if (made) {
    a.habLevel = level;
    a.x = task.path.on;
    score(m, a, POINTS.hab[level], 'hab', null, `CLIMBS TO LEVEL ${level}`);
  } else {
    a.habLevel = 1;
    a.x = task.path.l1;
    a.step.made = false;
    say(m, a, 'slip', `MISSES THE LEVEL ${level} CLIMB`);
    score(m, a, POINTS.hab[1], 'hab', null, 'BACK ON LEVEL 1');
  }
  a.queue = [];
  a.parked = true;
}

const slotFree = (slots, key) => {
  const info = slotInfo(key), v = slots[key];
  if (v) return false;
  if (info.piece === 'cargo') return !!slots[`hatch:${key.split(':')[1]}`];
  return true;
};
function release(m, a) {
  if (a.goal) m.reserved[a.alliance].delete(a.goal);
  a.goal = null;
}

// ---- Deciding what to do next ----
function next(m, a) {
  if (a.queue.length) return begin(m, a, a.queue.shift());
  const t = m.now, plan = a.plan;
  if (a.parked || t >= MATCH.length - 1e-6) return begin(m, a, { ...waitTask(m, a, MATCH.length - t + 1, 'done'), step: { kind: a.parked ? 'park' : 'wait', why: 'done', level: a.habLevel } });
  // Off the HAB first: straight out past the line.
  if (!a.left) {
    a.left = true;
    return begin(m, a, driveTask(a, at(a.side, { x: 10.8, z: a.z, face: 1 }), 'off the HAB'));
  }
  // Home for the endgame.
  if (plan.climb > 0 && !a.climbing && timeLeft(m) <= plan.climbAt) return goHome(m, a);
  // No camera: wait out the sandstorm.
  if (t < MATCH.sandstorm && ((a.robot.sandstorm ?? 1) === 0 || !plan.sandstorm)) return begin(m, a, waitTask(m, a, MATCH.sandstorm - t, 'sandstorm'));
  if (plan.role === 'defend' && t >= MATCH.sandstorm - 1e-6) {
    a.target = targetOf(a);
    if (a.target) return begin(m, a, { kind: 'defend', work: Infinity, done: 0, step: { kind: 'defend', target: a.target.num } });
  }
  if (plan.role === 'defend' && t < MATCH.sandstorm && !a.hold) return begin(m, a, waitTask(m, a, MATCH.sandstorm - t, 'sandstorm'));
  // Holding something: find it a place.
  if (a.hold) {
    const key = a.goal && slotFree(m.slots[a.alliance], a.goal) && slotInfo(a.goal).piece === a.hold ? a.goal : bestSlot(m, a, a.hold, { x: a.x, z: a.z });
    if (!key) return idle(m, a, a.crowded);
    reserve(m, a, key);
    const spot = at(a.side, PLACES.spot[slotInfo(key).spot]);
    a.queue = [placeTask(m, a, key)];
    return begin(m, a, driveTask(a, spot, `to ${words(slotInfo(key)).toLowerCase()}`));
  }
  if (plan.role !== 'score') return begin(m, a, waitTask(m, a, 1.5, 'nothing to do'));
  // Empty: choose a piece, where it'll go and where to get it.
  const c = bestCycle(m, a);
  if (!c) return idle(m, a, a.crowded);
  reserve(m, a, c.key);
  a.src = { from: c.from, which: c.which };
  a.queue = [pickTask(m, a, c.piece, c.from, c.which)];
  return begin(m, a, driveTask(a, c.spot, c.from === 'depot' ? 'to the depot' : 'to the loading station'));
}
const dead = (a) => a.deadUntil === Infinity;
/**
 * Nothing it can score: unless its plan says to wait (then: 'wait'), it does what drive teams do and goes to defend the
 * opponent who's scoring most, looking again every 5 seconds in case a partner's hatch has opened somewhere up. If a
 * partner's only in the way (`crowded`), it waits for it instead.
 */
function idle(m, a, crowded = 0) {
  if (crowded) return begin(m, a, waitTask(m, a, 1, 'a partner is there'));
  if (m.now >= MATCH.sandstorm && (a.plan.then ?? 'defend') === 'defend') {
    const target = targetOf(a);
    if (target) {
      if (a.target !== target || !a.helping) say(m, a, 'switch', `NOTHING TO SCORE. DEFENDS ${target.num}`);
      a.target = target;
      a.helping = true;
      return begin(m, a, { kind: 'defend', work: Infinity, done: 0, recheck: m.now + 5, step: { kind: 'defend', target: target.num, why: 'nothing to score' } });
    }
  }
  return begin(m, a, waitTask(m, a, 1.5, 'no room'));
}
/** Who a defender should be on: its target while that's worth it (alive, not up on its HAB), else the best foe left. */
function targetOf(d) {
  const ok = (b) => b && !dead(b) && !b.parked && b.plan.role === 'score';
  if (ok(d.target)) return d.target;
  const left = d.foes.filter(ok);
  return left.length ? left.reduce((best, b) => (worthOf(b) > worthOf(best) ? b : best)) : null;
}
function reserve(m, a, key) {
  release(m, a);
  a.goal = key;
  m.reserved[a.alliance].set(key, a.id);
}

/** The pieces this robot's plan and mechanisms allow. */
function pieces(a) {
  const ok = (p) => can(a.robot, p) && (a.plan.piece === 'both' || a.plan.piece === p);
  return ['hatch', 'cargo'].filter(ok);
}
/**
 * Slots this robot could place `piece` on right now: free, reachable, allowed by the plan, not a partner's. A slot right
 * beside where a partner's working is left out too (two robots don't fit), but counted in `blocked`: it'll be free soon.
 */
function openSlots(m, a, piece) {
  const slots = m.slots[a.alliance], res = m.reserved[a.alliance], p = a.robot[piece];
  const partners = m.agents.filter((b) => b.alliance === a.alliance && b !== a && b.goal);
  const ok = [];
  let blocked = 0;
  for (const key of slotKeys) {
    const info = slotInfo(key);
    if (info.piece !== piece || !slotFree(slots, key)) continue;
    if (res.has(key) && res.get(key) !== a.id) continue;
    if (info.struct === 'rocket' && (info.level > (p.reach ?? 0) || info.level > (a.plan.top ?? 3))) continue;
    if (info.struct === 'ship' && !p.ship) continue;
    const s = PLACES.spot[info.spot];
    const crowded = partners.some((b) => {
      const q = PLACES.spot[slotInfo(b.goal).spot];
      return Math.abs(q.x - s.x) <= 3.6 && Math.abs(q.z - s.z) <= 2.6;
    });
    if (crowded) blocked++;
    else ok.push(key);
  }
  ok.blocked = blocked;
  return ok;
}
/**
 * What a slot's worth to this robot: its points; for a hatch, the preloaded cargo it holds in, or the cargo spot it
 * opens for a partner who only does cargo (worth more the fewer such spots are open); and the plan's choice of where.
 */
function worth(m, a, key) {
  const info = slotInfo(key), slots = m.slots[a.alliance], bay = key.split(':')[1];
  let v = POINTS[info.piece];
  if (info.piece === 'hatch' && slots[`cargo:${bay}`] === 'pre') v += POINTS.cargo;
  else if (info.piece === 'hatch') {
    const level = info.struct === 'rocket' ? info.level : 1;
    const takers = m.agents.filter((b) => b.alliance === a.alliance && b !== a && b.plan.role === 'score' && b.plan.piece !== 'hatch'
      && can(b.robot, 'cargo') && (info.struct === 'ship' ? b.robot.cargo.ship : (b.robot.cargo.reach ?? 0) >= level));
    if (takers.length) v += cargoRoom(m, a.alliance) < 3 ? 2.5 : 1;
  }
  const where = a.plan.where ?? 'any';
  if (where !== 'any') v *= where === info.struct ? 3 : 0.5;
  return v;
}
/** How many cargo spots are open on a side (hatch robots favour opening more when it's few); counted again after a fill. */
function cargoRoom(m, al) {
  m.room ??= {};
  if (m.room[al] == null) m.room[al] = slotKeys.filter((k) => k[0] === 'c' && slotFree(m.slots[al], k)).length;
  return m.room[al];
}
const travel = (a, p, q) => (Math.hypot(q.x - p.x, q.z - p.z) * 1.2) / a.robot.speed + 0.45;
const meanOf = (d) => d?.[0] ?? 3;
function bestSlot(m, a, piece, from) {
  let best = null, bestV = -1;
  const open = openSlots(m, a, piece);
  a.crowded = open.blocked;
  for (const key of open) {
    const info = slotInfo(key), spot = at(a.side, PLACES.spot[info.spot]);
    const secs = travel(a, from, spot) + meanOf(a.robot[piece].place) + (Math.max(0, heightOf(info) - 19) / 28) * (a.robot.lift ?? 0.6);
    const v = worth(m, a, key) / secs;
    if (v > bestV) [best, bestV] = [key, v];
  }
  return best;
}
/** Where to get a piece: either loading station, or a depot for cargo with a floor intake (while it has any). */
function sources(m, a, piece) {
  const out = ['far', 'near'].map((w) => ({ from: 'station', which: w, spot: at(a.side, PLACES.station[w]) }));
  if (piece === 'cargo' && a.robot.cargo?.floor) {
    for (const w of ['far', 'near']) if (m.depot[a.alliance][w] > 0) out.push({ from: 'depot', which: w, spot: at(a.side, PLACES.depot[w]) });
  }
  // A partner already at a station, or on its way there: try the other one (two robots don't fit at one).
  const busy = (s) => m.agents.some((b) => b !== a && b.alliance === a.alliance && b.src && b.src.from === s.from && b.src.which === s.which);
  return out.filter((s) => !busy(s));
}
function bestCycle(m, a) {
  let best = null, bestV = -1;
  const here = { x: a.x, z: a.z };
  a.crowded = 0;
  for (const piece of pieces(a)) {
    const srcs = sources(m, a, piece), open = openSlots(m, a, piece);
    a.crowded += open.blocked + (open.length && !srcs.length ? 1 : 0);
    for (const key of open) {
      const info = slotInfo(key), spot = at(a.side, PLACES.spot[info.spot]);
      for (const s of srcs) {
        const secs = travel(a, here, s.spot) + meanOf(a.robot[piece].pick) * (s.from === 'depot' ? 0.8 : 1) + travel(a, s.spot, spot)
          + meanOf(a.robot[piece].place) + (Math.max(0, heightOf(info) - 19) / 28) * (a.robot.lift ?? 0.6);
        const v = worth(m, a, key) / secs;
        if (v > bestV) [best, bestV] = [{ piece, key, ...s }, v];
      }
    }
  }
  return best;
}

// ---- The endgame ----
function goHome(m, a) {
  a.climbing = true;
  a.src = null;
  release(m, a);
  a.queue = [];
  const level = a.plan.climb, lane = a.plan.lane ?? 13.5;
  const from = at(a.side, { x: PLACES.hab.from, z: lane, face: -1 });
  if (level <= 1) {
    a.queue = [parkTask(a, from, lane)];
    return begin(m, a, driveTask(a, from, 'home to park'));
  }
  const c = a.robot.climb[level], made = a.robot.force?.climb != null ? !!a.robot.force.climb : a.rand() < c[0];
  const secs = timeOf([c[1], c[1] * 0.15], a.rand);
  const path = { from: from.x, l1: at(a.side, { x: PLACES.hab.park }).x, on: at(a.side, { x: PLACES.hab.on }).x };
  a.queue = [{ kind: 'climb', level, made, path, work: made ? secs : secs * 0.75, done: 0, step: { kind: 'climb', level, made, lane, path } }];
  return begin(m, a, driveTask(a, from, `home for level ${level}`));
}
/** Parking: from where it lines up, a short drive up onto level 1. Three points when it gets there. */
function parkTask(a, from, lane) {
  const to = at(a.side, { x: PLACES.hab.park, z: lane, face: -1 }), way = [{ x: from.x, z: lane }, { x: to.x, z: lane }];
  const len = Math.abs(to.x - from.x);
  return { kind: 'drive', park: true, way, len, work: len / a.robot.speed + 0.6, done: 0, to, step: { kind: 'park', level: 1, lane } };
}

// ---- Defense ----
/** A defender's tick: get to its target, stay on it, pin it now and then, back off after a pin. */
function defend(m, a, secs) {
  const d = a, b = a.target;
  if (targetOf(d) !== b || (d.plan.climb > 0 && timeLeft(m) <= d.plan.climbAt) || (d.task.recheck && m.now >= d.task.recheck)) {
    // Its target's gone (dead, or up on its HAB), or it's time to go home: decide again.
    d.task = null;
    closeStep(m, d);
    return 0;
  }
  const rate = rateOf(m, d), speed = d.robot.speed * rate;
  let goal;
  if (d.backoffUntil > m.now && m.now >= d.pinEnd) {
    // Backing off after a pin: six feet away from it.
    const ux = d.x - b.x, uz = d.z - b.z, l = Math.hypot(ux, uz) || 1;
    goal = outOfBlocks({ x: b.x + (ux / l) * 6.5, z: b.z + (uz / l) * 6.5 });
  } else {
    const gap = Math.hypot(b.x - d.x, b.z - d.z);
    if (gap > 6) {
      // Head for where it's going to be.
      const lead = Math.min(1.5, gap / Math.max(1, d.robot.speed));
      goal = outOfBlocks({ x: b.x + b.vx * lead, z: b.z + b.vz * lead });
    } else {
      // Close: bumper to bumper beside it (on the side it's on, or the field's side of it), a little nearer you, so
      // both robots show.
      const sx = Math.abs(d.x - b.x) > 0.3 ? Math.sign(d.x - b.x) : b.x < MID ? 1 : -1;
      goal = outOfBlocks({ x: b.x + sx * 3.6, z: b.z + clamp(d.z - b.z, -0.9, 0.9) + 0.4 });
    }
  }
  // Follow a way there, worked out again every few tenths.
  const ch = d.chase;
  if (!ch || m.now - ch.at > 0.5 || Math.hypot(ch.goal.x - goal.x, ch.goal.z - goal.z) > 2.5) {
    const way = routeBetween({ x: d.x, z: d.z }, goal, false);
    d.chase = { at: m.now, goal, way, len: lengthOf(way), d: 0 };
  }
  const c = d.chase;
  c.d = Math.min(c.len, c.d + speed * secs);
  const p = along(c.way, c.d);
  if (Math.abs(p.x - d.x) > 0.01) d.face = Math.sign(p.x - d.x);
  d.x = p.x;
  d.z = p.z;
  if (Math.abs(b.x - d.x) > 0.5 && Math.hypot(b.x - d.x, b.z - d.z) < 6) d.face = Math.sign(b.x - d.x);
  return secs;
}

/** After every robot has moved: who's touching whom, the pins, and the brownouts that pushing brings. */
function contact(m) {
  const t = m.t + DT;
  for (const a of m.agents) a.on = [];
  for (const d of m.agents) {
    if (d.task?.kind !== 'defend' || !d.target || d.deadUntil > m.t || (d.backoffUntil > t && t >= d.pinEnd)) continue;
    const b = d.target;
    if (b.deadUntil === Infinity) continue;
    const near = Math.abs(b.x - d.x) < 4.3 && Math.abs(b.z - d.z) < 3.4;
    // A robot in its own HAB zone in the last 30 seconds can't be touched.
    const safe = MATCH.length - t <= MATCH.endgame && own(b.side, b.x) < 9.4;
    if (near && !safe && t > MATCH.sandstorm) b.on.push(d);
  }
  for (const a of m.agents) {
    const was = a.by, is = a.on;
    if (is.length && !was.length) a.contacts.push({ t0: +t.toFixed(2), t1: null, by: is.map((d) => d.num), pinned: [] });
    if (!is.length && was.length) a.contacts.at(-1).t1 = +t.toFixed(2);
    a.by = is;
    if (is.length) {
      a.lastKeep = is.reduce((r, d) => r * keepOf(d, a), 1);
      for (const d of is) {
        // A pin: only by a harder pusher, five seconds at most, then the defender backs off for three.
        const edge = (d.robot.push ?? 0.5) - (a.robot.push ?? 0.5);
        if (a.pinnedUntil < t && edge > 0 && d.rand() < (0.02 + 0.08 * edge) * DT) {
          const secs = 2 + d.rand() * 3;
          a.pinnedUntil = t + secs;
          d.pinEnd = t + secs;
          d.backoffUntil = t + secs + 3;
          a.contacts.at(-1).pinned.push([+t.toFixed(2), +(t + secs).toFixed(2), d.num]);
          say(m, d, 'pin', `PINS ${a.num}`);
        }
      }
      // Pushing draws current: now and then a brownout.
      if (a.deadUntil < t && a.rand() < (0.0015 * DT * (a.robot.brownout ?? 0.03)) / 0.03) a.troubles.unshift({ t: t + 0.01, why: 'brownout', dur: 2 + a.rand() * 4 });
    }
    a.vx = (a.x - (a.px ?? a.x)) / DT;
    a.vz = (a.z - (a.pz ?? a.z)) / DT;
    a.px = a.x;
    a.pz = a.z;
  }
  for (const a of m.agents) {
    a.slowed = 1;
    for (const d of a.by) a.slowed *= keepOf(d, a);
  }
}

// ---- The end ----
function finish(m) {
  for (const a of m.agents) {
    m.now = MATCH.length;
    // Still on its way up at 0:00: nothing, unless it's standing on level 1 (3 points), or it never left a platform.
    if (!a.climbed && !a.parked) {
      const x = own(a.side, a.x), onL1 = x >= HAB.l1.x0 - 0.2 && x <= HAB.l1.x1 + 1.2 && a.z > HAB.l1.z0 && a.z < HAB.l1.z1;
      const onTop = x < HAB.top.x1 && a.z > HAB.top.z0 && a.z < HAB.top.z1;
      const level = onTop ? (a.left ? (a.z > HAB.l3.z0 && a.z < HAB.l3.z1 ? 3 : 2) : a.startLevel) : onL1 ? 1 : 0;
      if (level) score(m, a, POINTS.hab[level], 'hab', null, level === 1 ? 'ON LEVEL 1 AT THE BUZZER' : `ON LEVEL ${level} AT THE BUZZER`);
    }
    if (a.task?.kind === 'climb') a.step.made = false;
    closeStep(m, a);
    if (a.contacts.length && a.contacts.at(-1).t1 == null) a.contacts.at(-1).t1 = MATCH.length;
  }
}

function result(m) {
  const score = { blue: 0, red: 0 }, hab = { blue: 0, red: 0 }, parts = {};
  for (const e of m.events) {
    score[e.alliance] += e.pts;
    if (e.kind === 'hab') hab[e.alliance] += e.pts;
    parts[e.alliance] ??= { leave: 0, hatch: 0, cargo: 0, hab: 0 };
    parts[e.alliance][e.kind === 'secured' ? 'cargo' : e.kind] += e.pts;
  }
  const winner = score.blue > score.red ? 'blue' : score.red > score.blue ? 'red' : 'tie';
  const rocketDone = (al) => ROCKETS.some((r) => [1, 2, 3].every((l) => ['h', 'a'].every((s) => m.slots[al][`hatch:${r}${l}${s}`] && m.slots[al][`cargo:${r}${l}${s}`])));
  const rp = {};
  for (const al of ['blue', 'red']) {
    const win = winner === 'tie' ? 1 : winner === al ? 2 : 0, rocket = rocketDone(al) ? 1 : 0, docked = hab[al] >= 15 ? 1 : 0;
    rp[al] = { win, rocket, hab: docked, total: win + rocket + docked };
  }
  const robots = m.agents.map((a) => ({
    id: a.id, num: a.num, alliance: a.alliance, slot: a.slot, sprite: a.robot.sprite ?? 'ele', robot: a.robot, plan: a.plan,
    steps: a.steps, track: m.record ? compress(a.track) : [], contacts: a.contacts, points: a.points,
    target: a.plan.role === 'defend' ? a.target?.num ?? null : null,
  }));
  return {
    seed: m.seed, length: MATCH.length, robots, events: m.events, fills: m.fills, drops: m.drops, depots: m.depots, log: m.log,
    preload: m.preload, score, parts, rp, winner,
  };
}

/** Drop the track points a straight line through their neighbours would put back anyway. */
function compress(track) {
  const out = [track[0]];
  for (let i = 1; i < track.length - 1; i++) {
    const a = out[out.length - 1], b = track[i], c = track[i + 1];
    const k = (b[0] - a[0]) / (c[0] - a[0] || 1);
    if (Math.abs(a[1] + (c[1] - a[1]) * k - b[1]) > 0.02 || Math.abs(a[2] + (c[2] - a[2]) * k - b[2]) > 0.02) out.push(b);
  }
  out.push(track[track.length - 1]);
  return out.map(([t, x, z]) => [t, +x.toFixed(3), +z.toFixed(3)]);
}

/**
 * Many matches, for scouting: make(i) gives match i's input (seed and all); returns each robot number's average points,
 * how many matches it played, and its average pieces.
 */
export function averages(make, runs = 200) {
  const sum = {};
  for (let i = 0; i < runs; i++) {
    const r = simulate({ ...make(i), record: false });
    for (const b of r.robots) {
      const s = (sum[b.num] ??= { n: 0, pts: 0, pieces: 0, climbs: 0 });
      s.n++;
      s.pts += b.points;
      s.pieces += r.events.filter((e) => e.by === b.num && (e.kind === 'hatch' || e.kind === 'cargo')).length;
    }
  }
  return Object.fromEntries(Object.entries(sum).map(([num, s]) => [num, { avg: s.pts / s.n, pieces: s.pieces / s.n, n: s.n }]));
}
