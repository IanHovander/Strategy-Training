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
// The game is the 2019 game manual's (FIRST's Destination: Deep Space manual, its last version, V9 of April 2019). Its
// section and rule numbers are in brackets. What's simplified says so.
//   Before the match [5.1]: everything's empty but these.
//     The cargo ship: each alliance has its own half, 8 bays [4.4]. Its two front bays (facing the alliance's wall)
//       start with a cargo each [5.1.1 E]. Each of its six side bays starts with a cargo or a null hatch panel (bolted
//       on, worth nothing, but it keeps cargo in) [5.1.1 F]. Each team chooses for its own two bays, the pair across
//       the ship: station 1 the pair by the centre line, then 2, then 3 [figure 5-2]. A bay nobody chose gets a cargo.
//       Here the alliance chooses all six together (`preload`).
//     The rockets: empty.
//     Each depot: 6 cargo [5.1.1 B].
//     Each loading station: 1 hatch panel [5.1.1 A].
//     Each robot: may hold one hatch panel or one cargo [5.1.1 C], and stands on HAB level 1 or 2 [5.1.2].
//     The rest of the alliance's 24 hatch panels and 24 cargo: with its human players, to feed through the loading
//       stations [5.1.1 D, H7]. They can run out.
//   Sandstorm, 0 to 15 s [5.2]: driving off the HAB, bumpers all the way past the HAB line, is 3 points from level 1, 6
//     from level 2 [table 5-1]. Drivers see through cameras, so robots are a little slower and less accurate until
//     15 s. A robot with no camera (sandstorm 0) drives off and waits. Nobody crosses into the other half [G3], so no
//     defense. The human players stay between the starting lines [H9], so the loading stations have only their one
//     hatch panel each until 0:15.
//   Teleop, 15 to 150 s: cycles. A hatch panel is 2 points and a cargo 3 [table 5-1]. A null hatch panel scores
//     nothing.
//   The cargo ship [4.4]: a bay holds one counted cargo, and keeps it only behind a hatch panel or a null one. The
//     bays' floors hold cargo in during the sandstorm. At 0:15 they tilt, and any cargo with no hatch panel in front
//     of it rolls out onto the floor (drops, why 'rolled out'). So the cargo staged in the ship counts (+3,
//     `secured`) only if a hatch panel goes on in the sandstorm. A hatch panel there then is worth 5.
//   The rockets [4.3]: two an alliance, one on the far wall and one on the near.
//     Each has three levels. On each level there's a hatch on either angled side and a bay behind each hatch. The
//       two bays share one port in the rocket's front face, the face toward the cargo ship. Robots put hatch panels
//       on from beside the rocket and cargo in through the port from in front of it.
//     Cargo in the port rolls into one of the level's two bays: either one, at random, when both are empty, and the
//       empty one when the other's full. A ramp in each bay "directs CARGO out the HATCH" [4.3], so it stays only if
//       a hatch panel covers that side. Which bay it rolls to is the rocket's shape (the drawings in 4.3); the manual
//       doesn't write it down as a rule.
//     So cargo is safe in a level with both hatch panels on (or the empty side's, when the other bay is full), even
//       odds with one on, and never stays with none. Good teams put both hatch panels on first. Weaker ones
//       sometimes chance it (`cargo.risk`).
//     Cargo that rolls out scores nothing. It comes to rest on the floor beside the rocket (drops, why
//       'rolled out').
//   Pieces: hatch panels from the loading stations (two per alliance, in the corners by its wall). Cargo from the
//     loading stations' chutes, or, for robots with a floor intake, off the floor at the two depots beside the HAB.
//     A robot holds one piece at a time [G4]. SIMPLIFIED: a piece on the floor stays where it fell, and nobody picks
//     it up.
//   Endgame: robots head home for the HAB when the plan says (climbAt, seconds left). Level 1 is 3, level 2 is 6,
//     level 3 is 12 [table 5-1]. A robot that never got all the way past its HAB line gets none of it. One robot fits
//     on the level 3 deck and one on each of the two level 2 decks [4.5]. A failed climb drops back to level 1 (3).
//     Climb points count the moment the robot settles; a robot still on its way at 0:00 gets nothing.
//   Defense (from games/frc-strategy/alliance.js): a defended robot keeps 1 - (defender's ability x its
//     susceptibility) of what it does. Here that's while they're in contact: it works keep^0.75 as fast and places
//     keep^0.25 as accurately, which multiply to keep.
//     Defense starts at teleop [G3]. A robot with its bumpers all the way inside its own HAB zone (its loading
//       stations, its depots, its HAB) can't be touched [G13]. One robot an alliance defends at a time [G9].
//     A defender that pushes harder than its target can pin it, 5 s at most, then has to back off for 3 s [G18].
//       Contact can brown robots out.
//   Breakdowns: each robot has a chance of dying for the rest of the match (breakdown) and of browning out for a few
//     seconds; defenders break a little more often (as in alliance.js). Modifiers can force these, for a story.
//   Ranking points [table 5-1]: 2 for a win (1 for a tie), 1 for a complete rocket (either one: 6 hatch panels and 6
//     cargo), 1 for 15 or more HAB climb points.
//   SIMPLIFIED: no fouls; robots only touch when one is defending the other.
//
//   simulate({ seed, blue, red, preload, record })   one match (see below for what goes in and what comes out)
//   planAlliance(entries)                             default plans for an alliance: who climbs where, what each scores
//   defaultPlan(robot)                                one robot's plan on its own
//   withMods(robot, mods)                             a robot changed for one match: { 'cargo.grip': 0.6, speed: 10 }
//   averages(make, runs)                              many matches: each robot's average points, for scouting
//   startSlots(preload), stayOdds(slots, rocket, level), cargoSide(slots, rocket, level, rand)
//                                                     the field before the match, and the rocket's cargo rule
//   routeBetween(a, b), BLOCKS, PLACES, slotKeys      the field's geometry, for the animation and the tests

export const MATCH = { length: 150, sandstorm: 15, endgame: 30 };
export const POINTS = { hatch: 2, cargo: 3, leave: [0, 3, 6], hab: [0, 3, 6, 12] };
/** Cargo in each depot at the start [5.1.1 B]. */
export const DEPOT_CARGO = 6;
/**
 * Each alliance's own pieces [5.1.1]: 24 hatch panels and 24 cargo, of which 1 hatch panel waits in each loading
 * station, 6 cargo in each depot, and up to one piece in each robot; the human players have the rest. (The cargo staged
 * in the cargo ship and the null hatch panels are on top of these.)
 */
export const SUPPLY = { hatch: 24, cargo: 24, staged: 1 };
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
// puts a hatch panel on a rocket from beside it, facing one of its two angled faces, as the arena's robots do (fh, fa),
// and cargo in through its port from in front of it (fp, np). There it faces the rocket, across the field (faceZ: -1
// toward the far wall); a picture from the side can't show that, so its face is the way it drove in. The cargo ship
// from in front of a bay, or at the front pair from the HAB side. The rockets: f on the far wall, n on the near one.
const BAY_X = [26, 24.125, 22.25]; // the ship's side bays, from the centre line out (field.js shipBays)
export const PLACES = {
  station: { far: { x: 3.3, z: 1.5, face: -1 }, near: { x: 3.3, z: 25.5, face: -1 } },
  depot: { far: { x: 5.6, z: 5.5, face: -1 }, near: { x: 5.6, z: 21.5, face: -1 } },
  spot: {
    fh: { x: 15.125, z: 2.6, face: 1 }, fa: { x: 22.875, z: 2.6, face: -1 },
    nh: { x: 15.125, z: 24.4, face: 1 }, na: { x: 22.875, z: 24.4, face: -1 },
    fp: { x: 19, z: 4.4, face: 1, faceZ: -1 }, np: { x: 19, z: 22.6, face: 1, faceZ: 1 },
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
//   hatch, cargo: { reach, ship, floor, pick: [mean, sd], place: [mean, sd], acc, grip, risk }
//     reach: the highest rocket level it can place on (0: it can't handle that piece at all); ship: whether it can
//     score the cargo ship; floor: cargo off the floor (the depots); pick and place: seconds; acc: the chance a
//     placement goes in; grip: the chance a pickup works (an intake that fumbles shows up here); risk (cargo only, 0
//     to 1): how often, choosing where its next cargo goes, its drivers will put it in a rocket level with only one of
//     the two hatch panels on, where it rolls out half the time (0, the default: never)
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
// its own end), 'cargo:n2a' the cargo bay behind the near rocket's level 2 away face; 'hatch:near0' the hatch on the
// cargo ship's near side, the bay by the centre line, 'cargo:front1' the cargo in the front bay nearer you. A slot
// holds 0, 1, 'null' (a null hatch panel) or 'pre' (cargo staged in a ship bay before the match, not yet held in by a
// hatch panel: it counts once one goes on in the sandstorm, and rolls out at 0:15 if none has).
// A rocket level's two cargo slots share its port: a robot aims at the level (its step's slot is one of the two), and
// the bay the cargo rolls to (cargoSide) is the slot it ends up in.
const SHIP_BAYS = ['front0', 'front1', 'near0', 'near1', 'near2', 'far0', 'far1', 'far2'];
export const ROCKETS = ['f', 'n'];
export const slotKeys = [
  ...ROCKETS.flatMap((r) => [1, 2, 3].flatMap((l) => ['h', 'a'].flatMap((s) => [`hatch:${r}${l}${s}`, `cargo:${r}${l}${s}`]))),
  ...SHIP_BAYS.flatMap((b) => [`hatch:${b}`, `cargo:${b}`]),
];
/** The side bays as the preload lists them: near side from the middle out, then the far side. */
export const PRELOAD_BAYS = ['near0', 'near1', 'near2', 'far0', 'far1', 'far2'];
/**
 * What a slot key means: { piece, struct ('rocket' | 'ship'), rocket ('f' | 'n'), level, face ('h' | 'a'), bay, spot }.
 * spot: the PLACES.spot a robot works it from (a rocket's cargo: its port, 'fp' or 'np'). port: a rocket's cargo slot's
 * level, 'f2', which both its bays go in by.
 */
const infos = new Map();
export function slotInfo(key) {
  if (infos.has(key)) return infos.get(key);
  const [piece, where] = key.split(':');
  const info = where.length === 3
    ? { piece, struct: 'rocket', rocket: where[0], level: +where[1], face: where[2], spot: `${where[0]}${piece === 'cargo' ? 'p' : where[2]}` }
    : { piece, struct: 'ship', bay: where, level: 1, spot: where };
  if (info.struct === 'rocket' && piece === 'cargo') info.port = where.slice(0, 2);
  infos.set(key, info);
  return info;
}

// ---- What stays in ----
/**
 * The chance a cargo put in a rocket level's port stays in [4.3]: it rolls to one of the two bays (cargoSide), and a
 * bay keeps it only behind a hatch panel. 1, 0.5 or 0 (0 too when both bays are full).
 */
export function stayOdds(slots, rocket, level) {
  const full = (s) => !!slots[`cargo:${rocket}${level}${s}`], on = (s) => !!slots[`hatch:${rocket}${level}${s}`];
  if (full('h') && full('a')) return 0;
  if (full('h')) return on('a') ? 1 : 0;
  if (full('a')) return on('h') ? 1 : 0;
  return (on('h') + on('a')) / 2;
}
/** The bay a cargo put in a rocket level's port rolls to: the empty one if the other's full, either at random if both are empty. */
export function cargoSide(slots, rocket, level, rand) {
  if (slots[`cargo:${rocket}${level}h`]) return 'a';
  if (slots[`cargo:${rocket}${level}a`]) return 'h';
  return rand() < 0.5 ? 'h' : 'a';
}
/** Is there room for a piece here: an empty hatch (not a null one), an empty ship bay, a rocket level with a bay free. */
function roomFor(slots, key) {
  const info = slotInfo(key);
  if (info.struct === 'rocket' && info.piece === 'cargo') return !(slots[`cargo:${info.port}h`] && slots[`cargo:${info.port}a`]);
  return !slots[key];
}
/** The chance a piece put here now stays and counts: a hatch panel always; cargo only with a hatch panel in front of it. */
function oddsOf(slots, key) {
  const info = slotInfo(key);
  if (!roomFor(slots, key)) return 0;
  if (info.piece === 'hatch') return 1;
  if (info.struct === 'rocket') return stayOdds(slots, info.rocket, info.level);
  return slots[`hatch:${info.bay}`] ? 1 : 0;
}
/** Somewhere this robot would put its piece: sure to stay, or (its drivers chancing it this time) likely to. */
const usable = (a, slots, key) => {
  const o = oddsOf(slots, key);
  return o >= 1 || (o > 0 && a.daring);
};
/** The rocket cargo slot a robot aims at on a level: the empty bay, or while both are, the one behind a hatch panel. */
function aimOf(slots, key) {
  const info = slotInfo(key);
  if (info.struct !== 'rocket' || info.piece !== 'cargo') return key;
  const k = (s) => `cargo:${info.port}${s}`;
  if (slots[k('h')]) return k('a');
  if (slots[k('a')]) return k('h');
  return slots[`hatch:${info.port}h`] || !slots[`hatch:${info.port}a`] ? k('h') : k('a');
}
/** What a reservation goes by: a rocket level's port for its cargo (both bays go in by it), the slot itself otherwise. */
const resKey = (key) => {
  const info = slotInfo(key);
  return info.port ? `cargo:${info.port}` : key;
};
/** Inches up for each place a piece goes: rocket hatch ports and cargo, the ship's hatch port and over its lip. */
export const HEIGHT_IN = { hatch: [19, 47, 75], cargo: [27.5, 55.5, 83.5], shipHatch: 19, shipCargo: 36, stationHatch: 19, stationCargo: 34, floor: 3 };
const heightOf = (info) => (info.struct === 'ship' ? (info.piece === 'hatch' ? HEIGHT_IN.shipHatch : HEIGHT_IN.shipCargo) : HEIGHT_IN[info.piece][info.level - 1]);

/**
 * An alliance's scoring places before the match [5.1.1]: the rockets empty, a cargo in each of the ship's two front
 * bays (E), and in each side bay what its team chose (F): preload, six 'null' or 'cargo' in PRELOAD_BAYS order. A bay
 * nobody chose gets a cargo.
 */
export function startSlots(preload) {
  const s = Object.fromEntries(slotKeys.map((k) => [k, 0]));
  s['cargo:front0'] = s['cargo:front1'] = 'pre';
  PRELOAD_BAYS.forEach((bay, i) => {
    if ((preload?.[i] ?? 'cargo') === 'null') s[`hatch:${bay}`] = 'null';
    else s[`cargo:${bay}`] = 'pre';
  });
  return s;
}
/**
 * The alliance's default choice for the side bays [5.1.1 F]. A cargo there is 5 points if a hatch panel goes on it in
 * the sandstorm; if none does, it rolls out at 0:15 and leaves the bay empty, ready for a hatch panel (2) and then cargo
 * (3). A null hatch panel makes the bay ready for cargo from the start, but no hatch panel can score there. So: cargo
 * for the sandstorm's hatch panels once the front pair has theirs, or for the bays the hatch robots will want later
 * (two for each, one fewer for each cargo robot), whichever is more, and null hatch panels everywhere else.
 */
export function defaultPreload(entries, plans) {
  const scorers = entries.map((e, i) => ({ r: e.robot, p: plans[i] })).filter((x) => x.p.role === 'score');
  const hatchOnly = scorers.filter((x) => x.p.piece === 'hatch' || !can(x.r, 'cargo')).length;
  const cargoOnly = scorers.filter((x) => x.p.piece === 'cargo' || !can(x.r, 'hatch')).length;
  const both = scorers.length - hatchOnly - cargoOnly;
  const sandstorm = scorers.filter((x) => x.p.preload === 'hatch' && x.p.sandstorm && (x.r.sandstorm ?? 1) > 0 && x.r.hatch?.ship).length;
  const later = 2 * hatchOnly - cargoOnly + (both > 0 && cargoOnly === 0 ? 2 : 0);
  const n = Math.max(0, Math.min(6, Math.max(sandstorm - 2, later)));
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
 *               'depot', which, ok), 'place' (slot, piece, hit, rolled), 'wait' (why), 'defend' (target), 'climb'
 *               (level, made, lane), 'park', 'dead' (why: 'breakdown' | 'brownout'). Every step has hold (what it
 *               carries). A place step's hit: the piece went in; for a rocket's cargo, slot is the bay it rolled to,
 *               and rolled: true if it rolled straight back out (no hatch panel on that side; drops has where it went).
 *             track: [t, x, z] points to draw it from (straight lines between them)
 *             contacts: when it was defended: { t0, t1, by, pinned }
 *   events    every point: { t, alliance, pts, kind ('leave' | 'hatch' | 'cargo' | 'secured' | 'hab'), by, slot, text }
 *   fills     every change to the scoring places, at its moment: { t, alliance, slot, value } (t = 0: the field before
 *             the match, startSlots; value 0 at 0:15: staged cargo rolling out of a ship bay with no hatch panel)
 *   drops     pieces on the floor: { t, piece, x, z, by, why ('miss' | 'fumble' | 'rolled out') }, t the moment it's
 *             there. A cargo that rolled out of a bay has more, for drawing it on its way: tIn (it went in the rocket's
 *             port; for the ship, 0:15, the floors tilting), tOut (it drops out of the hatch), alliance, slot (the bay
 *             it rolled through), struct ('rocket' | 'ship'), rocket ('f' | 'n'), level and side ('h' | 'a'), or bay.
 *             by is the robot that put it in (null for the cargo staged in the ship).
 *   depots    { t, alliance, which, left } each time a depot gives up a cargo
 *   log       everything worth a line, in order: { t, by, kind, text }
 *   score     { blue, red }: the sum of the events, always
 *   rp        { blue: { win, rocket, hab, total }, red }
 *   winner    'blue' | 'red' | 'tie'
 *   supply    { blue: { hatch, cargo }, red }: what each alliance's human players had left at the buzzer
 */
export function simulate({ seed = 1, blue, red, preload = {}, record = true }) {
  const sides = { blue, red };
  const m = {
    t: 0, now: 0, seed, agents: [], events: [], fills: [], drops: [], depots: [], log: [], record,
    slots: {}, depot: {}, preload: {}, reserved: { blue: new Map(), red: new Map() }, stock: {}, staged: {},
    rand: seeded(mix(seed, 'field')),
  };
  for (const alliance of ['blue', 'red']) {
    const entries = sides[alliance].map((e) => ({ ...e, robot: e.mods ? withMods(e.robot, e.mods) : e.robot }));
    const plans = planAlliance(entries);
    const pre = preload[alliance] ?? defaultPreload(entries, plans);
    m.preload[alliance] = pre;
    m.slots[alliance] = startSlots(pre);
    m.depot[alliance] = { far: DEPOT_CARGO, near: DEPOT_CARGO };
    for (const [k, v] of Object.entries(m.slots[alliance])) if (v) m.fills.push({ t: 0, alliance, slot: k, value: v });
    const starts = startSpots(plans);
    entries.forEach((e, slot) => m.agents.push(makeAgent(m, alliance, slot, e.robot, plans[slot], starts[slot])));
    // The human players' pieces: the alliance's 24 of each, less what's in the stations, the depots and the robots.
    const held = (p) => m.agents.filter((a) => a.alliance === alliance && a.hold === p).length;
    m.staged[alliance] = { far: SUPPLY.staged, near: SUPPLY.staged };
    m.stock[alliance] = { hatch: SUPPLY.hatch - 2 * SUPPLY.staged - held('hatch'), cargo: SUPPLY.cargo - 2 * DEPOT_CARGO - held('cargo') };
  }
  for (const a of m.agents) a.foes = m.agents.filter((b) => b.alliance !== a.alliance);
  for (const a of m.agents) {
    if (a.plan.role !== 'defend') continue;
    a.target = a.foes.find((b) => b.num === String(a.plan.defend)) ?? bestFoe(a);
  }
  // Tick through the match. Robots move in a fixed order, so it's the same every time.
  const ticks = Math.round(MATCH.length / DT), tilt = Math.round(MATCH.sandstorm / DT);
  for (let i = 0; i < ticks; i++) {
    m.t = i * DT;
    if (i === tilt) tiltFloors(m);
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
  // At a loading station in the sandstorm with no hatch panel waiting in it: the human players can't come to it until
  // 0:15 [H9], so it waits there for them.
  if (task.kind === 'pickup' && task.from === 'station' && m.now < MATCH.sandstorm && !(task.piece === 'hatch' && m.staged[a.alliance][task.which] > 0)) {
    task.work = Math.max(task.work, MATCH.sandstorm - m.now + 1);
  }
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

/**
 * Is there a piece to take there: cargo left in the depot; at a loading station, the hatch panel waiting in it, or, once
 * the sandstorm's over and the human players can come to it [H9], one of theirs while they have any.
 */
function inStock(m, al, piece, from, which) {
  if (from === 'depot') return m.depot[al][which] > 0;
  if (piece === 'hatch' && m.staged[al][which] > 0) return true;
  return m.now >= MATCH.sandstorm - 1e-9 && m.stock[al][piece] > 0;
}
/** Take that piece (a pickup, or a fumble: then it's on the floor). */
function take(m, al, piece, from, which) {
  if (from === 'depot') {
    const left = --m.depot[al][which];
    m.depots.push({ t: +t3(m), alliance: al, which, left });
  } else if (piece === 'hatch' && m.staged[al][which] > 0) m.staged[al][which]--;
  else m.stock[al][piece]--;
}

function endPickup(m, a, task) {
  const p = a.robot[task.piece];
  a.src = null;
  if (!inStock(m, a.alliance, task.piece, task.from, task.which)) {
    a.step.ok = false;
    a.queue = [];
    return;
  }
  if (a.rand() < (p.grip ?? 0.95)) {
    a.hold = task.piece;
    a.step.ok = true;
    take(m, a.alliance, task.piece, task.from, task.which);
  } else {
    // Fumbled: the piece gets away (it bounces off, or the human player has to feed it again). Try once more.
    a.step.ok = false;
    m.drops.push({ t: +t3(m), piece: task.piece, x: a.x + a.face * -1.2, z: a.z + (a.rand() - 0.5), by: a.num, why: 'fumble' });
    take(m, a.alliance, task.piece, task.from, task.which);
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
  if (!roomFor(slots, key) || a.rand() >= acc) {
    a.step.hit = false;
    m.drops.push({ t: +t3(m), piece, x: a.x + a.face * 1.6, z: a.z + 0.8 + a.rand() * 0.8, by: a.num, why: 'miss' });
    say(m, a, 'miss', `MISSES ${piece === 'hatch' ? 'A HATCH' : 'CARGO'}, ${words(info)}`);
    return;
  }
  a.step.hit = true;
  let slot = key;
  if (info.port) {
    // In through the port, it rolls into one of the level's two bays [4.3], and out again unless a hatch panel covers it.
    const side = cargoSide(slots, info.rocket, info.level, a.rand);
    slot = `cargo:${info.port}${side}`;
    a.step.slot = slot;
    if (!slots[`hatch:${info.port}${side}`]) {
      a.step.rolled = true;
      rollOut(m, a.alliance, slot, m.now, a.rand, a.num);
      say(m, a, 'rolled', `CARGO ROLLS OUT, ${words(info)}`);
      return;
    }
  } else if (piece === 'cargo' && !slots[`hatch:${info.bay}`]) {
    // A ship bay with no hatch panel: its floor holds the cargo in until 0:15 [4.4], and after that it rolls out.
    if (m.now < MATCH.sandstorm) {
      slots[slot] = 'pre';
      m.fills.push({ t: +t3(m), alliance: a.alliance, slot, value: 'pre' });
    } else {
      a.step.rolled = true;
      rollOut(m, a.alliance, slot, m.now, a.rand, a.num);
      say(m, a, 'rolled', `CARGO ROLLS OUT, ${words(info)}`);
    }
    return;
  }
  slots[slot] = 1;
  if (m.room) m.room[a.alliance] = null;
  m.fills.push({ t: +t3(m), alliance: a.alliance, slot, value: 1 });
  score(m, a, POINTS[piece], piece, slot, `${piece === 'hatch' ? 'HATCH' : 'CARGO'}, ${words(info)}`);
  // A hatch panel on a ship bay with cargo staged in it (only in the sandstorm: at 0:15 it rolls out) holds that cargo
  // in: it counts now.
  const behind = `cargo:${key.split(':')[1]}`;
  if (piece === 'hatch' && slots[behind] === 'pre') {
    slots[behind] = 1;
    m.fills.push({ t: +t3(m), alliance: a.alliance, slot: behind, value: 1 });
    score(m, a, POINTS.cargo, 'secured', behind, `STAGED CARGO HELD IN, ${words(info)}`);
  }
}

/**
 * A cargo rolling out of a bay with no hatch panel in front of it [4.3, 4.4]: out through the hatch, down to the floor,
 * and a few feet on. Goes in drops with where it comes to rest and when (blue's places worked out, red's mirrored).
 */
function rollOut(m, alliance, slot, tIn, rand, by) {
  const info = slotInfo(slot), side = alliance === 'blue' ? 1 : -1;
  let x, z, d, tOut;
  if (info.struct === 'rocket') {
    // Out of the hatch on its angled face, which looks along the field (home or away) and a little into it; further
    // from higher up.
    d = 2 + 0.5 * info.level + 2 * rand();
    x = 19 + (info.face === 'h' ? -1 : 1) * (1.4 + 0.88 * d);
    z = 1.4 + 0.48 * d;
    if (info.rocket === 'n') z = 27 - z;
    tOut = tIn + 0.3 + 0.15 * info.level;
  } else {
    // Out of the ship's side, or out of its front toward the alliance wall.
    d = 1 + 2 * rand();
    if (info.bay.startsWith('front')) [x, z] = [19.1 - d, (info.bay === 'front0' ? 12.4 : 14.6) + rand() - 0.5];
    else [x, z] = [BAY_X[+info.bay.at(-1)] + rand() - 0.5, info.bay.startsWith('near') ? 15.8 + d : 11.2 - d];
    tOut = tIn + 0.4;
  }
  const p = at(side, { x, z });
  m.drops.push({
    t: +(tOut + 0.4 + 0.15 * d).toFixed(3), piece: 'cargo', x: +clamp(p.x, 0.6, 53.4).toFixed(2), z: +clamp(p.z, 0.6, 26.4).toFixed(2),
    by, why: 'rolled out', tIn: +tIn.toFixed(3), tOut: +tOut.toFixed(3), alliance, slot, struct: info.struct,
    ...(info.struct === 'rocket' ? { rocket: info.rocket, level: info.level, side: info.face } : { bay: info.bay }),
  });
}

/** 0:15: the cargo ship's bay floors tilt [4.4], and staged cargo with no hatch panel in front of it rolls out. */
function tiltFloors(m) {
  m.now = MATCH.sandstorm;
  for (const al of ['blue', 'red']) {
    const slots = m.slots[al];
    let n = 0;
    for (const bay of SHIP_BAYS) {
      if (slots[`cargo:${bay}`] !== 'pre') continue;
      slots[`cargo:${bay}`] = 0;
      m.fills.push({ t: MATCH.sandstorm, alliance: al, slot: `cargo:${bay}`, value: 0 });
      rollOut(m, al, `cargo:${bay}`, MATCH.sandstorm, m.rand, null);
      n++;
    }
    if (n) m.log.push({ t: MATCH.sandstorm, by: null, alliance: al, kind: 'rolled', text: `${n} CARGO ROLL${n > 1 ? '' : 'S'} OUT OF THE CARGO SHIP` });
    if (m.room) m.room[al] = null;
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

function release(m, a) {
  if (a.goal) m.reserved[a.alliance].delete(resKey(a.goal));
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
    const slots = m.slots[a.alliance], kept = a.goal && slotInfo(a.goal).piece === a.hold && usable(a, slots, a.goal);
    if (!kept && a.hold === 'cargo') dare(a);
    const key = kept ? aimOf(slots, a.goal) : bestSlot(m, a, a.hold, { x: a.x, z: a.z });
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
 * partner's only in the way (`crowded`), it waits for it instead. Only one robot an alliance defends at a time [G9],
 * so with a partner on defense it waits too.
 */
function idle(m, a, crowded = 0) {
  if (crowded) return begin(m, a, waitTask(m, a, 1, 'a partner is there'));
  const partnerOn = m.agents.some((b) => b.alliance === a.alliance && b !== a && !dead(b) && !b.climbing
    && (b.task?.kind === 'defend' || (b.plan.role === 'defend' && b.target)));
  if (m.now >= MATCH.sandstorm && (a.plan.then ?? 'defend') === 'defend' && !partnerOn) {
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
  m.reserved[a.alliance].set(resKey(key), a.id);
}
/** Whether its drivers chance their next cargo where it may roll out (cargo.risk), rolled each time they choose. */
function dare(a) {
  const risk = a.robot.cargo?.risk ?? 0;
  a.daring = risk > 0 && a.rand() < risk;
}

/** The pieces this robot's plan and mechanisms allow. */
function pieces(a) {
  const ok = (p) => can(a.robot, p) && (a.plan.piece === 'both' || a.plan.piece === p);
  return ['hatch', 'cargo'].filter(ok);
}
/**
 * Slots this robot could place `piece` on right now: free, where it'll stay (or, daring, may), reachable, allowed by the
 * plan, not a partner's. A rocket level's cargo is one place, its port (aimOf names it). A slot right beside where a
 * partner's working is left out too (two robots don't fit), but counted in `blocked`: it'll be free soon.
 */
function openSlots(m, a, piece) {
  const slots = m.slots[a.alliance], res = m.reserved[a.alliance], p = a.robot[piece];
  const partners = m.agents.filter((b) => b.alliance === a.alliance && b !== a && b.goal);
  const ok = [];
  let blocked = 0;
  for (const key of slotKeys) {
    const info = slotInfo(key);
    if (info.piece !== piece || !usable(a, slots, key) || (info.port && aimOf(slots, key) !== key)) continue;
    const rk = resKey(key);
    if (res.has(rk) && res.get(rk) !== a.id) continue;
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
 * What a slot's worth to this robot: its points; for a hatch, the staged cargo it holds in, or the cargo spot it opens
 * for a partner who only does cargo (worth more the fewer such spots are open; on a rocket, cargo's only sure behind
 * both of a level's hatch panels, so the first of the two opens little); and the plan's choice of where.
 */
function worth(m, a, key) {
  const info = slotInfo(key), slots = m.slots[a.alliance], bay = key.split(':')[1];
  let v = POINTS[info.piece];
  if (info.piece === 'hatch' && slots[`cargo:${bay}`] === 'pre') v += POINTS.cargo;
  else if (info.piece === 'hatch') {
    const level = info.struct === 'rocket' ? info.level : 1;
    const takers = m.agents.filter((b) => b.alliance === a.alliance && b !== a && b.plan.role === 'score' && b.plan.piece !== 'hatch'
      && can(b.robot, 'cargo') && (info.struct === 'ship' ? b.robot.cargo.ship : (b.robot.cargo.reach ?? 0) >= level));
    const pair = info.struct !== 'rocket' || !!slots[`hatch:${info.rocket}${info.level}${info.face === 'h' ? 'a' : 'h'}`];
    if (takers.length) v += (cargoRoom(m, a.alliance) < 3 ? 2.5 : 1) * (pair ? 1 : 0.6);
  }
  // The cargo ship's left to a partner that can't score that piece anywhere higher, by a robot that can.
  if (info.struct === 'ship' && (a.robot[info.piece].reach ?? 0) >= 2) {
    const low = m.agents.some((b) => b.alliance === a.alliance && b !== a && b.plan.role === 'score' && !dead(b) && pieces(b).includes(info.piece)
      && b.robot[info.piece].ship && (b.robot[info.piece].reach ?? 0) <= 1);
    if (low) v *= 0.75;
  }
  const where = a.plan.where ?? 'any';
  if (where !== 'any') v *= where === info.struct ? 3 : 0.5;
  return v;
}
/** How many empty cargo bays a cargo would surely stay in, on a side (hatch robots favour opening more when it's few). */
function cargoRoom(m, al) {
  m.room ??= {};
  const slots = m.slots[al];
  if (m.room[al] == null) m.room[al] = slotKeys.filter((k) => k[0] === 'c' && !slots[k] && oddsOf(slots, k) >= 1).length;
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
/**
 * Where to get a piece: either loading station while it has one or the human players do (in the sandstorm a robot
 * waits there for them), or a depot for cargo with a floor intake (while it has any). busy: one was left out only
 * because a partner's at it.
 */
function sources(m, a, piece) {
  const al = a.alliance, out = [];
  for (const w of ['far', 'near']) {
    if ((piece === 'hatch' && m.staged[al][w] > 0) || m.stock[al][piece] > 0) out.push({ from: 'station', which: w, spot: at(a.side, PLACES.station[w]) });
  }
  if (piece === 'cargo' && a.robot.cargo?.floor) {
    for (const w of ['far', 'near']) if (m.depot[al][w] > 0) out.push({ from: 'depot', which: w, spot: at(a.side, PLACES.depot[w]) });
  }
  // A partner already at a station, or on its way there: try the other one (two robots don't fit at one).
  const busy = (s) => m.agents.some((b) => b !== a && b.alliance === al && b.src && b.src.from === s.from && b.src.which === s.which);
  const free = out.filter((s) => !busy(s));
  free.busy = free.length < out.length;
  return free;
}
function bestCycle(m, a) {
  let best = null, bestV = -1;
  const here = { x: a.x, z: a.z };
  a.crowded = 0;
  if (pieces(a).includes('cargo')) dare(a);
  for (const piece of pieces(a)) {
    const srcs = sources(m, a, piece), open = openSlots(m, a, piece);
    a.crowded += open.blocked + (open.length && !srcs.length && srcs.busy ? 1 : 0);
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
    // A robot with its bumpers all the way inside its own HAB zone (at its loading stations, its depots, its HAB) can't
    // be touched [G13].
    const safe = own(b.side, b.x) <= HAB_LINE - HALF + 0.05;
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
    // Still on its way up at 0:00: nothing, unless it's standing on level 1 (3 points). A robot that never got all the
    // way past its HAB line gets nothing for being on it [table 5-1].
    if (!a.climbed && !a.parked && a.crossed) {
      const x = own(a.side, a.x), onL1 = x >= HAB.l1.x0 - 0.2 && x <= HAB.l1.x1 + 1.2 && a.z > HAB.l1.z0 && a.z < HAB.l1.z1;
      const onTop = x < HAB.top.x1 && a.z > HAB.top.z0 && a.z < HAB.top.z1;
      const level = onTop ? (a.z > HAB.l3.z0 && a.z < HAB.l3.z1 ? 3 : 2) : onL1 ? 1 : 0;
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
    preload: m.preload, score, parts, rp, winner, supply: m.stock,
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
