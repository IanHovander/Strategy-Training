// What's on and around the arena's field at any moment of the arena's time: the match being played (schedule.js), and
// between two matches the whole changeover a 2019 event runs, in the order the game manual has it (sections 4 and 5;
// rules S2, S3, C7, G1, G2, H2). Every frame is a pure function of the arena's time, worked out from each match's
// simulation, so the field always holds exactly what the last match left on it or what the next will start from.
//
// During match n: its robots where the simulation puts them, the score on the monitors, its drive teams at their
// stations at the controls, the next match's six robots waiting in the queue on their carts (each with its technician at
// the cart's handle and a driver), and a rocket's nosecone lights on in its alliance's colour once it's full. The
// match's own technicians wait with their empty carts at the near side of the field, out of the picture (H2).
//
// Then, from the final buzzer (AT gives each step's second; TURN in all, schedule.js):
//   buzzer      the robots stop where they are, disabled, signal lights solid; the drivers put the controls down
//   safe        the head referee calls the field safe and every nosecone light turns green (S2: nobody goes on
//               before), and the gates' chains are unhooked, all four (S3: in and out through the gates only)
//   score       the announcer reads the final score
//   off         match n's drivers leave their stations by the near end; each team's technician comes in through its
//               alliance's near gate with the empty cart, the driver leading, and the two lift the robot off the HAB (or
//               wherever it stopped) onto the cart and wheel it back out the way they came (G2: by hand)
//   reset       a field volunteer on each half goes round it: the depots filled again, every hatch panel and cargo taken
//               out of the rockets and the cargo ship, anything dropped picked up, and the next match's null hatch
//               panels and preloaded cargo set in the cargo ship's side bays, the way its simulation starts them
//   on          the queuer sends the next match out of the queue, the long walk first (red's): the technician pushes the
//               cart along the walkway, a driver leading, through the alliance's far gate, and the two lift the robot
//               onto its start on the HAB, level 1 or 2, holding its preload (G1); the driver goes on round to the
//               station and the technician takes the empty cart out through the near gate. Each alliance waits for its
//               HAB to be clear of the last match's robots and their carts
//   queue       the match after next comes into the queue from the pits, robots on carts
//   ready       the gates are chained shut and the lights go out: the field's ready (C7: everyone's off it by then)
//   intro       the emcee introduces the teams, ON THE BLUE ALLIANCE..., AND ON THE RED ALLIANCE..., each drive team's
//               arms going up as it's called, and the crowd with them
//   count       the countdown, and the next match starts
//
// Some of it is simplified. A 2019 drive team is up to five people: here a driver at each station stands in for those in
// it, and a technician for the rest. Robots wait in the queue with their preloads not yet in. The cargo ship's front bays
// and the depots start the way the simulation starts them. Which end of an alliance wall is station 1 the manual doesn't
// say: here it's the drivers' left. Where the queue and the pits are and which gates the robots use (on through the far
// gates from the queue, along the walkway; off through the near gates toward the pits' side of the hall) is this
// arena's own: the manual leaves those to the venue.
//
//   AT                the changeover's steps, in seconds after the buzzer
//   QUEUE             the queue's six cart spots, back row first
//   planOf(n)         the changeover after match n, worked out: when each team, cart and volunteer goes where
//   flowAt(T)         everything at the arena's time T:
//     n, phase, t       match n, t seconds in ('match'); or t seconds after its buzzer ('turn')
//     frame             what animate.js's frameAt gives, for the robots and every piece on the field (draw.js liveOf)
//     score             [blue, red] on the scoring table's monitors
//     farGates, nearGates, lights        the gates as drawFieldLive takes them, and the nosecone lights that are on
//     people            everyone in a drive team or the field crew: { x, y, dir, gait, frame, look }
//     carts             { x, y, handle, roll, bot }: bot, the robot riding it ({ kind, state } for drawBot), or null
//     carried           { x, y, kind, state }: robots being lifted by hand, state.up how high
//     queued            the carts and people standing still in the queue, which she walks round
//     say               what's said over the speakers: { name, line, since }, or null
//     moment            what's happening, for the sound: a key like 'BUZZER#42', changing when something new happens
//     cheer             0 to 1, how much of the crowd is up
//     queuer            which way the queuer is turned, when she's calling a team out of the queue

import { FIELD, floorY, GATES } from '../field.js';
import { MATCH, BLOCKS, routeBetween } from '../match/sim.js';
import { frameAt } from '../match/animate.js';
import { reachOf } from '../match/bots.js';
import { dirToward } from '../stage.js';
import { MC_NAME } from '../alliance-selection/layout.js';
import { matchOf, lineupOf, spriteOf, clockAt, prefetch, TURN } from './schedule.js';
import { teamLook, crewLook } from './crew.js';

/** The changeover's steps, seconds after the buzzer (see the header). TURN, the next match's start, is schedule.js's. */
export const AT = { safe: 5, open: 5.8, score: 7, off: 6.5, ready: 47, blue: 49, red: 54.5, count: 60 };
/** Pixels a second: walking, and pushing a cart. Seconds to lift a robot on or off, and to step into place for it. */
const WALK = 34, PUSH = 30, LIFT = 1.8, STEP = 0.4;
/** How long the field crew stops at each place it resets. */
const DWELL = 1.6;

// ---- Places, in world pixels ----
const wx = (ft) => FIELD.x0 + ft * 8;
/** Feet from an alliance's own wall, as feet from the blue wall. */
const own = (a, ft) => (a === 'blue' ? ft : 54 - ft);
/** +1 for blue, whose field is to the right of its wall; -1 for red. */
const out = (a) => (a === 'blue' ? 1 : -1);
/** Each gate's middle along the field: the far wall's and the near wall's are at the same place. */
const gateX = (a) => Math.round((GATES[a].x0 + GATES[a].x1) / 2);
/** The floor line along the walkway that carts and people take, just behind the far wall. */
const WALKWAY = 62;
/** Off the bottom of the picture, past the near wall: where the near gates lead, the pits' side of the hall. */
const BELOW = 200, GONE = 190;
/** Just outside the near wall, and just inside the far one. */
const NEAR = floorY(27) + 6, FAR_IN = floorY(1.2);
/** Where the drivers stand in their stations, facing the field. */
const STATION_X = { blue: FIELD.x0 - 18, red: FIELD.x1 + 18 };
const STATION_Z = [4.5, 13.5, 22.5];
const stationY = (a, k) => Math.round(floorY(a === 'blue' ? STATION_Z[k] : STATION_Z[2 - k]));
const facing = (a) => (a === 'blue' ? 2 : 6);
/** How far behind the drivers' line people walk to and from a station, so they pass behind the others. */
const BEHIND = 11;
/** Where a cart stands to load or unload a robot on the HAB: just off its front edge, 10 feet from the wall. */
const HAB_CART = 10;
/**
 * The queue's six cart spots, back row first, two across in its taped lane (field.js), filled in ORDER, each technician
 * at the handle; the drivers wait in a line along the back of the lane, each over their own robot's column, so the
 * robots' numbers show.
 */
export const QUEUE = [{ x: 108, y: 108 }, { x: 60, y: 108 }, { x: 108, y: 120 }, { x: 60, y: 120 }, { x: 108, y: 132 }, { x: 60, y: 132 }];
const LINE = [118, 79, 105, 66, 92, 53].map((x) => ({ x, y: 93 }));
/** The order teams leave the queue in, the long walk first: red's stations, then blue's. */
const ORDER = [['red', 0], ['red', 1], ['red', 2], ['blue', 0], ['blue', 1], ['blue', 2]];
/** Where a team waits in the queue: the technician at the cart's handle, the driver in the line behind. */
const waiting = (Q, q) => [{ x: Q.x - 24, y: Q.y + 1, dir: 2, gait: 'push', frame: 0 }, { ...LINE[q], dir: 0, gait: 'stand', frame: 0 }];

// ---- Paths ----
// A path is a list of [x, y] stops in world pixels; distances along it count depth the way stage.js does (the floor
// recedes, so a pixel down the screen is more ground than a pixel across).
const DEPTH = 0.8;
function pathOf(stops) {
  let d = 0;
  const legs = [];
  for (let i = 1; i < stops.length; i++) {
    const [x0, y0] = stops[i - 1], [x1, y1] = stops[i], len = Math.hypot(x1 - x0, (y1 - y0) / DEPTH);
    if (len > 0) legs.push({ x0, y0, dx: x1 - x0, dy: y1 - y0, len, d0: d });
    d += len;
  }
  return { stops, legs, len: d };
}
/**
 * Where you are d pixels along a path: past either end you carry on along the end leg, so someone behind a cart or
 * leading it has somewhere to be from the first moment to the last. face: which way along the field the path last went
 * (+1 toward red, 0 not yet), for a robot riding a cart.
 */
function pointAt(p, d) {
  const { legs } = p;
  if (!legs.length) return { x: p.stops[0][0], y: p.stops[0][1], dir: 0, face: 0 };
  let l = legs.find((q) => d < q.d0 + q.len) ?? legs.at(-1);
  if (d < 0) l = legs[0];
  const k = (d - l.d0) / l.len;
  let face = 0;
  for (const q of legs) if (q.d0 <= d && Math.abs(q.dx) > 0.5) face = Math.sign(q.dx);
  return { x: l.x0 + l.dx * k, y: l.y0 + l.dy * k, dir: dirToward(l.dx, l.dy / DEPTH), face };
}
/** Someone walking a path from t0: where they are at t, stood still at its end facing `still` (or not yet set off). */
function walker(p, t, t0, look, still) {
  const d = Math.min(p.len, Math.max(0, (t - t0) * WALK)), at = pointAt(p, d), moving = t > t0 && d < p.len;
  return { x: at.x, y: at.y, dir: moving || still == null ? at.dir : still, gait: moving ? 'walk' : 'stand', frame: moving ? Math.floor(d / 3.2) : 0, look };
}
/**
 * A cart pushed along a path from t0: the cart, its technician at the handle LAG behind it and a driver LEAD ahead (each
 * a person's pose), and how far it's rolled. Round a corner they go after it.
 */
const LAG = 24, LEAD = 30;
function pushed(p, t, t0) {
  const d = Math.min(p.len, Math.max(0, (t - t0) * PUSH)), moving = t > t0 && d < p.len;
  const cart = pointAt(p, d), back = pointAt(p, d - LAG), front = pointAt(p, d + LEAD);
  const step = moving ? Math.floor(d / 3.2) : 0;
  return {
    d, moving, cart,
    tech: { x: back.x, y: back.y + 1, dir: back.dir, gait: 'push', frame: step },
    lead: { x: front.x, y: front.y + 1, dir: moving ? front.dir : back.dir, gait: moving ? 'walk' : 'stand', frame: step },
  };
}
/** Someone stepping from one pose to another, k of the way (0 to 1): a few steps' walk between the two. */
function stepTo(a, b, k) {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k, far = Math.hypot(b.x - a.x, (b.y - a.y) / DEPTH);
  if (far < 1) return b;
  return { ...b, x, y, dir: dirToward(b.x - a.x, (b.y - a.y) / DEPTH), gait: 'walk', frame: Math.floor((far * k) / 3.2) };
}

// ---- The field, in feet (sim.js's), for ways round it ----
const inBlock = (x, z) => BLOCKS.some((b) => x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1);
/** A way across the field between two points in feet (round the rockets, the HAB, the depots and the ship), in pixels. */
const fieldWay = (a, b) => routeBetween(a, b).map((p) => [wx(p.x), floorY(p.z)]);

/** A robot's drawing state (bots.js) on a cart or in people's hands: disabled, mechanism down, nothing held. */
const botState = (r, face, up = 0) => ({ team: r.alliance, num: r.num, dir: face, rsl: false, hold: null, lift: reachOf(r.sprite)[0], up, spin: 0 });
const waitingBot = (num, a) => {
  const kind = spriteOf(num);
  return { kind, state: { team: a, num, dir: 1, rsl: false, hold: null, lift: reachOf(kind)[0], spin: 0 } };
};

// ---- One changeover, worked out once ----
/** Where the two people lifting a robot stand, at its field side, one behind it and one in front. */
const lifters = (robot, side) => [{ x: robot.x + side * 15, y: robot.y - 3 }, { x: robot.x + side * 15, y: robot.y + 3 }];

const plans = new Map();
/** The changeover after match n: who goes where when, and what happens to every piece (see the header). */
export function planOf(n) {
  if (plans.has(n)) return plans.get(n);
  const last = matchOf(n), next = matchOf(n + 1), after = lineupOf(n + 2);
  const end = frameAt(last.show, MATCH.length), start = frameAt(next.show, 0);
  const plan = { n, end, start, off: [], on: [], into: [], crew: [], changes: [] };

  // Off: each of match n's robots, by its alliance's near gate, a beat apart.
  end.robots.forEach((r, i) => {
    const a = r.alliance, k = +r.id[1], gx = gateX(a), side = out(a);
    // Where the cart stands: just off the HAB's front if that's where the robot is, otherwise beside it, toward home.
    let spot;
    if (own(a, r.x) < 8.2) spot = { x: own(a, HAB_CART), z: Math.min(25, Math.max(2, r.z)) };
    else {
      const tries = [-side * 4.4, side * 4.4].map((dx) => ({ x: r.x + dx, z: r.z })).concat([{ x: r.x, z: r.z + 3 }, { x: r.x, z: r.z - 3 }]);
      spot = tries.find((p) => p.x > 2.5 && p.x < 51.5 && p.z > 1.6 && p.z < 25.4 && !inBlock(p.x, p.z)) ?? { x: r.x, z: Math.min(25, r.z + 3) };
    }
    const stops = [[gx, BELOW], [gx, NEAR], ...fieldWay({ x: own(a, 9), z: 25.4 }, spot)];
    const way = pathOf(stops), back = pathOf([...stops].reverse());
    // The driver leaves the station by its near end and goes round to the gate (out of the picture) to meet the cart.
    const leaves = AT.off + 0.4 * k + (a === 'red' ? 0.2 : 0);
    const sx = STATION_X[a], bx = sx - side * BEHIND, sy = stationY(a, k);
    const exit = pathOf([[sx, sy], [bx, sy + 3], [bx, NEAR - 2], [bx, BELOW]]);
    const t0 = Math.max(AT.off + 1.2 + i * 0.7, leaves + exit.len / WALK + Math.abs(gx - STATION_X[a]) / WALK - 2);
    const at = t0 + way.len / PUSH;
    const cart = { x: wx(spot.x), y: floorY(spot.z) }, robot = { x: wx(r.x), y: floorY(r.z), up: r.up, face: r.face };
    // Lifting it, they stand at its side toward the cart (off the HAB, that's the field side), and lead it over.
    const s = cart.x >= robot.x ? 1 : -1, lift = lifters(robot, s), loaded = lifters(cart, s);
    plan.off.push({
      r, a, k, way, back, exit, leaves, t0, at, lift, loadedAt: loaded, cart, robot,
      lifted: at + STEP, loaded: at + STEP + LIFT, rolls: at + STEP + LIFT + STEP,
      tech: teamLook(r.num, 0), driver: teamLook(r.num, 1),
    });
  });
  // Each alliance's HAB is clear for the next robots once the last of its own is off and its cart is past the gate.
  const clear = { blue: AT.off + 8, red: AT.off + 8 };
  for (const o of plan.off) {
    const gone = o.rolls + (Math.abs(o.cart.y - NEAR) / DEPTH + Math.abs(o.cart.x - gateX(o.a))) / PUSH;
    if (Math.abs(o.robot.x - wx(own(o.a, 4))) < 60) clear[o.a] = Math.max(clear[o.a], gone + 0.6);
  }

  // On: the next match's robots, out of the queue, along the walkway and through the far gate onto the HAB.
  const free = { blue: clear.blue, red: clear.red };
  ORDER.forEach(([a, k], q) => {
    const r = start.robots.find((p) => p.alliance === a && +p.id[1] === k), gx = gateX(a), Q = QUEUE[q], side = out(a);
    const cy = floorY(r.z), cx = wx(own(a, HAB_CART));
    const way = pathOf([[Q.x, Q.y], [Q.x + 10, WALKWAY + 4], [Q.x + 22, WALKWAY], [gx, WALKWAY], [gx, FAR_IN], [cx, FAR_IN + 1], [cx, cy]]);
    const at = Math.max(free[a], AT.off + 3 + q * 1.2 + way.len / PUSH);
    free[a] = at + STEP + LIFT + 1.4;
    const t0 = at - way.len / PUSH, placed = at + STEP + LIFT;
    // They lift it from the field side and follow it over onto the HAB, staying on the field (not up on the platforms).
    const robot = { x: wx(r.x), y: cy, up: r.up, face: r.face }, from = { x: cx, y: cy, up: 7 };
    const lift = lifters(from, side), set = lifters(robot, side);
    const sx = STATION_X[a], bx = sx - side * BEHIND, sy = stationY(a, k);
    const toStation = pathOf([[set[1].x, set[1].y], [gx, FAR_IN], [gx, WALKWAY], [bx, WALKWAY], [bx, sy - 3], [sx, sy]]);
    const empty = pathOf([[cx, cy], [cx, NEAR], [cx, BELOW]]);
    plan.on.push({
      r, a, k, q, Q, way, t0, at, placed, toStation, empty, lift, set, from, robot,
      tech: teamLook(r.num, 0), driver: teamLook(r.num, 1), cart: { x: cx, y: cy }, side,
    });
  });
  const lanesClear = Math.max(...plan.on.map((o) => o.t0)) + 2;

  // Into the queue: the match after next, from the pits off the left edge, along the front of the lane and up into it.
  ORDER.forEach(([a, k], q) => {
    const num = after[a][k], Q = QUEUE[q];
    const way = pathOf([[-60, 141], [Q.x, 141], [Q.x, Q.y]]);
    plan.into.push({ a, num, Q, q, way, t0: Math.max(lanesClear, AT.off + 18) + q * 2.2, bot: waitingBot(num, a), tech: teamLook(num, 0), driver: teamLook(num, 1) });
  });

  // The field crew: a volunteer for each half.
  for (const a of ['blue', 'red']) plan.crew.push(crewRound(plan, a, end, start));
  plan.changes.sort((p, q) => p.t - q.t);
  plans.set(n, plan);
  if (plans.size > 3) plans.delete(Math.min(...plans.keys()));
  return plan;
}

/**
 * One volunteer's round of alliance a's half: in by its near gate, to the near depot, the near rocket, the cargo ship's
 * near side, its front, its far side, the far rocket and the far depot, and back out, stopping DWELL at each. Every piece
 * at a stop comes out during it, one after another; at the ship's sides the next match's preloads go in; at a depot it's
 * filled again. Adds those changes to the plan's.
 */
function crewRound(plan, a, end, start) {
  const f = (x, z) => ({ x: own(a, x), z });
  const stops = [
    { at: f(6.4, 21.5), face: 'home', depot: 1 },
    { at: f(19, 22.6), face: 0, slots: /:n\d/ },
    { at: f(24.4, 18.3), face: 4, slots: /:near\d/, preload: /:near\d/ },
    { at: f(16.3, 13.5), face: 'away', slots: /:front\d/ },
    { at: f(24.4, 9.0), face: 0, slots: /:far\d/, preload: /:far\d/ },
    { at: f(19, 4.3), face: 4, slots: /:f\d/ },
    { at: f(6.4, 5.6), face: 'home', depot: 0 },
  ];
  const gate = f(9, 25.4), gx = gateX(a);
  let t = AT.off + 2.5 + (a === 'red' ? 0.6 : 0), here = gate, way = [[gx, BELOW], [gx, NEAR]];
  const legs = [];
  for (const s of stops) {
    const p = pathOf([...way, ...fieldWay(here, s.at).slice(1)]);
    const arrive = t + p.len / WALK;
    legs.push({ p, t0: t, arrive, leave: arrive + DWELL, stop: s });
    const keys = Object.entries(end.slots[a]).filter(([k, v]) => v && s.slots?.test(k)).map(([k]) => k);
    keys.forEach((k, i) => plan.changes.push({ t: arrive + 0.2 + ((DWELL - 0.5) * i) / keys.length, a, slot: k, value: 0 }));
    if (s.preload) {
      Object.entries(start.slots[a]).filter(([k, v]) => v && s.preload.test(k))
        .forEach(([k, v], i) => plan.changes.push({ t: arrive + DWELL - 0.4 + i * 0.05, a, slot: k, value: v }));
    }
    if (s.depot != null) plan.changes.push({ t: arrive + 0.6, a, depot: s.depot, value: start.depots[a][s.depot] });
    t = arrive + DWELL;
    here = s.at;
    way = [p.stops.at(-1)];
  }
  const home = pathOf([...way, ...fieldWay(here, gate).slice(1), [gx, NEAR], [gx, BELOW]]);
  legs.push({ p: home, t0: t, arrive: Infinity, leave: Infinity, stop: null });
  // Pieces dropped on the carpet in this half: picked up at the stop nearest each.
  const stopsAt = legs.filter((l) => l.stop);
  for (const d of end.loose) {
    if ((d.x < 27) !== (a === 'blue')) continue;
    const by = (l) => Math.hypot(l.stop.at.x - d.x, l.stop.at.z - d.z);
    const near = stopsAt.reduce((p, q) => (by(q) < by(p) ? q : p));
    plan.changes.push({ t: near.arrive + DWELL / 2, a, loose: d });
  }
  return { a, legs, look: crewLook(a === 'blue' ? 0 : 1) };
}

/** A crew volunteer at t: walking their round, or at a stop bent to the pieces, a hand at a time. */
function crewPose(c, t) {
  if (t < c.legs[0].t0) return null;
  const leg = c.legs.find((l) => t < l.leave);
  if (t < leg.arrive) {
    const w = walker(leg.p, t, leg.t0, c.look);
    return w.y > GONE ? null : w;
  }
  const f = leg.stop.face, side = out(c.a), [x, y] = leg.p.stops.at(-1);
  const dir = f === 'home' ? (side > 0 ? 6 : 2) : f === 'away' ? (side > 0 ? 2 : 6) : f;
  return { x, y, dir, gait: 'lean', frame: Math.floor(t * 3) % 2, look: c.look };
}

// ---- The match's own ----
/** Whether one of an alliance's rockets is full, six hatch panels and six cargo (its nosecone lights up). */
const full = (slots, a, r) => [1, 2, 3].every((l) => ['h', 'a'].every((s) => slots[a][`hatch:${r}${l}${s}`] && slots[a][`cargo:${r}${l}${s}`]));
const rocketLights = (slots) => ['blue', 'red'].flatMap((a) => [['f', 'far'], ['n', 'near']]
  .filter(([r]) => full(slots, a, r)).map(([, rocket]) => ({ alliance: a, rocket, color: a })));
const allLights = (color) => ['blue', 'red'].flatMap((a) => ['far', 'near'].map((rocket) => ({ alliance: a, rocket, color })));

/** The queue at rest: match m's six robots on their carts, each with its technician and driver. */
function queued(m, res) {
  const lineup = lineupOf(m);
  ORDER.forEach(([a, k], q) => {
    const num = lineup[a][k], Q = QUEUE[q], [tech, driver] = waiting(Q, q);
    rest(res, { x: Q.x, y: Q.y, handle: -1, bot: waitingBot(num, a) }, [{ ...tech, look: teamLook(num, 0) }, { ...driver, look: teamLook(num, 1) }]);
  });
}
/** A cart and its people standing still in the queue: drawn, and in her way. */
function rest(res, cart, people) {
  res.carts.push(cart);
  res.people.push(...people);
  res.queued.push(cart, ...people);
}

/** The drive teams at their stations for match m, in gait (at the controls, or just standing), but for skip's. */
function atStations(m, gait, res, skip = () => false) {
  for (const r of matchOf(m).result.robots) {
    if (skip(r)) continue;
    res.people.push({ x: STATION_X[r.alliance], y: stationY(r.alliance, r.slot), dir: facing(r.alliance), gait, frame: 0, look: teamLook(r.num, 1) });
  }
}

// ---- Everything at T ----
export function flowAt(T) {
  const { n, phase, t } = clockAt(T);
  const res = { n, phase, t, people: [], carts: [], carried: [], queued: [], lights: [], say: null, moment: null, cheer: 0, queuer: null };
  const m = matchOf(n);
  if (phase === 'match') {
    prefetch(n + 1);
    const frame = frameAt(m.show, t);
    Object.assign(res, { frame, score: [frame.score.blue, frame.score.red], lights: rocketLights(frame.slots) });
    queued(n + 1, res);
    atStations(n, 'drive', res);
    matchMoments(res, m, frame, t);
  } else {
    prefetch(n + 2);
    turn(res, planOf(n), t);
  }
  return res;
}

/** The match's sounds and words: its start, the sandstorm's end, the endgame, and the big moments as they happen. */
function matchMoments(res, m, frame, t) {
  const n = m.n;
  if (t < 1.6) {
    res.moment = `START#${n}`;
    res.say = { name: MC_NAME, line: 'GO!', since: t };
  } else if (t >= 15 && t < 16) res.moment = `TELEOP#${n}`;
  else if (t >= MATCH.length - 30 && t < MATCH.length - 29) res.moment = `ENDGAME#${n}`;
  else if (t >= MATCH.length - 20 && t < MATCH.length - 19) res.moment = `WHISTLE#${n}`;
  // A climb to level 3, or a rocket filled: the announcer has it, and the crowd's up.
  const SAY = 3.5;
  for (const e of frame.events.slice(-8)) {
    const age = t - e.t;
    if (e.kind !== 'hab' || e.pts !== 12 || age > SAY) continue;
    res.say = { name: 'ANNOUNCER', line: `${e.by} CLIMBS TO LEVEL 3! TWELVE POINTS!`, since: age };
    res.moment = `CLIMB#${n}-${e.by}`;
    res.cheer = Math.max(res.cheer, 0.7 * (1 - age / SAY));
  }
  const was = frameAt(m.show, Math.max(0, t - SAY)).slots;
  for (const a of ['blue', 'red']) {
    for (const r of ['f', 'n']) {
      if (!full(frame.slots, a, r) || full(was, a, r)) continue;
      const inIt = new RegExp(`:${r}\\d`), done = frame.events.filter((e) => e.alliance === a && inIt.test(e.slot ?? '')).at(-1);
      const age = done ? t - done.t : 0;
      res.say = { name: 'ANNOUNCER', line: `THE ${a.toUpperCase()} ROCKET IS FULL! THAT'S A RANKING POINT!`, since: age };
      res.moment = `ROCKET#${n}-${a}${r}`;
      res.cheer = Math.max(res.cheer, 0.6 * (1 - age / SAY));
    }
  }
}

/** The changeover after match n, t seconds after its buzzer (see the header). */
function turn(res, plan, t) {
  const { n, end } = plan, last = matchOf(n), s = last.result.score;
  res.score = [s.blue, s.red];

  // The pieces: the last match's as it ended, with the crew's changes so far.
  const slots = { blue: { ...end.slots.blue }, red: { ...end.slots.red } };
  const depots = { blue: [...end.depots.blue], red: [...end.depots.red] };
  let loose = end.loose;
  for (const c of plan.changes) {
    if (c.t > t) break;
    if (c.slot) slots[c.a][c.slot] = c.value;
    else if (c.depot != null) depots[c.a][c.depot] = c.value;
    else if (c.loose) loose = loose.filter((d) => d !== c.loose);
  }
  // The robots on the field: the last match's until they're lifted, the next's once they're set down, lights solid.
  const robots = [
    ...plan.off.filter((o) => t < o.lifted).map((o) => o.r),
    ...plan.on.filter((o) => t >= o.placed).map((o) => ({ ...o.r, rsl: true })),
  ];
  res.frame = { t: 0, robots, slots, depots, loose, score: s };

  // Lights and gates.
  if (t < AT.safe) res.lights = rocketLights(end.slots);
  else if (t < AT.ready) res.lights = allLights('green');
  const open = t >= AT.open && t < AT.ready;
  res.farGates = [{ ...GATES.blue, open }, { ...GATES.red, open }];
  res.nearGates = res.farGates;

  // Off, on, into the queue, the crew.
  atStations(n, 'stand', res, (r) => plan.off.find((o) => o.r.num === r.num).leaves <= t);
  for (const o of plan.off) offTeam(res, o, t);
  for (const o of plan.on) onTeam(res, o, t);
  for (const o of plan.into) intoQueue(res, o, t);
  for (const c of plan.crew) {
    const p = crewPose(c, t);
    if (p) res.people.push(p);
  }
  // The queuer turns to the queue as she sends each team out.
  if (plan.on.some((o) => t >= o.t0 - 1 && t < o.t0 + 0.6)) res.queuer = 1;
  turnWords(res, plan, t);
}

/** A team taking its robot off: the driver out of the station; then in by the near gate with the empty cart, the lift, out. */
function offTeam(res, o, t) {
  if (t >= o.leaves && t < o.t0) {
    const w = walker(o.exit, t, o.leaves, o.driver);
    if (w.y < GONE) res.people.push(w);
  }
  if (t < o.t0) return;
  const kind = o.r.sprite;
  if (t < o.at) {
    const c = pushed(o.way, t, o.t0);
    if (c.cart.y > GONE + 30) return;
    res.carts.push({ x: c.cart.x, y: c.cart.y, handle: -(c.cart.face || 1), roll: c.d, bot: null });
    res.people.push({ ...c.tech, look: o.tech }, { ...c.lead, look: o.driver });
    return;
  }
  const handle = o.cart.x > o.robot.x ? 1 : -1;
  if (t < o.loaded) {
    // Into place either side of it, then the lift: up off the HAB or the carpet, across, and down onto the cart.
    res.carts.push({ x: o.cart.x, y: o.cart.y, handle, bot: null });
    const c = pushed(o.way, o.at, o.t0);
    const k = (t - o.lifted) / LIFT, step = (t - o.at) / STEP;
    if (k < 0) {
      res.people.push({ ...stepTo(c.tech, o.lift[0], step), look: o.tech }, { ...stepTo(c.lead, o.lift[1], step), look: o.driver });
      return;
    }
    carry(res, kind, botState(o.r, o.robot.face), o.robot, { x: o.cart.x, y: o.cart.y, up: 7 }, k, [o.tech, o.driver], o.lift, o.loadedAt);
    return;
  }
  // Out the way they came, the robot aboard.
  const c = pushed(o.back, t, o.rolls);
  if (c.cart.y > GONE + 30) return;
  res.carts.push({ x: c.cart.x, y: c.cart.y, handle: -(c.cart.face || -handle), roll: c.d, bot: { kind, state: botState(o.r, c.cart.face || o.robot.face) } });
  const k = (t - o.loaded) / STEP;
  res.people.push({ ...stepTo(o.loadedAt[0], c.tech, k), look: o.tech }, { ...stepTo(o.loadedAt[1], c.lead, k), look: o.driver });
}

/** A team bringing its robot on: out of the queue, along the walkway, the lift onto the HAB, then off to the station. */
function onTeam(res, o, t) {
  if (t < o.t0) {
    // Still in the queue.
    const [tech, driver] = waiting(o.Q, o.q);
    rest(res, { x: o.Q.x, y: o.Q.y, handle: -1, bot: { kind: o.r.sprite, state: botState(o.r, 1) } }, [{ ...tech, look: o.tech }, { ...driver, look: o.driver }]);
    return;
  }
  const kind = o.r.sprite;
  if (t < o.at) {
    // Off they go, the driver stepping out of the line to lead the way.
    const c = pushed(o.way, t, o.t0), [tech, driver] = waiting(o.Q, o.q), k = (t - o.t0) / (2 * STEP);
    res.carts.push({ x: c.cart.x, y: c.cart.y, handle: -1, roll: c.d, bot: { kind, state: botState(o.r, c.cart.face || o.side) } });
    res.people.push({ ...stepTo(tech, c.tech, k), look: o.tech }, { ...stepTo(driver, c.lead, k), look: o.driver });
    return;
  }
  if (t < o.placed) {
    res.carts.push({ x: o.cart.x, y: o.cart.y, handle: -1, bot: t < o.at + STEP ? { kind, state: botState(o.r, o.side) } : null });
    const c = pushed(o.way, o.at, o.t0), step = (t - o.at) / STEP;
    if (step < 1) {
      res.people.push({ ...stepTo(c.tech, o.lift[0], step), look: o.tech }, { ...stepTo(c.lead, o.lift[1], step), look: o.driver });
      return;
    }
    const k = (t - o.at - STEP) / LIFT;
    carry(res, kind, { ...botState(o.r, o.side), hold: k > 0.95 ? o.r.hold : null }, o.from, o.robot, k, [o.tech, o.driver], o.lift, o.set);
    return;
  }
  // The driver round to the station, and at it: arms up as the alliance is called, at the controls for the countdown.
  const d = walker(o.toStation, t, o.placed, o.driver, facing(o.a));
  if (d.gait === 'stand') {
    const called = o.a === 'blue' ? AT.blue : AT.red;
    if (t >= called + 0.8 && t < called + 3.6) Object.assign(d, { gait: 'armsUp', dir: 0 });
    else if (t >= AT.count) d.gait = 'drive';
  }
  res.people.push(d);
  // The technician, out through the near gate with the empty cart.
  const c = pushed(o.empty, t, o.placed + STEP);
  if (c.cart.y < GONE + 30) {
    res.carts.push({ x: c.cart.x, y: c.cart.y, handle: o.side, roll: c.d, bot: null });
    res.people.push({ ...stepTo(o.set[0], c.tech, (t - o.placed) / STEP), look: o.tech });
  }
}

/** Into the queue from the pits: a cart pushed in from off the left edge to its spot, and there they wait. */
function intoQueue(res, o, t) {
  if (t < o.t0) return;
  const arrive = o.t0 + o.way.len / PUSH, [tech, driver] = waiting(o.Q, o.q);
  if (t >= arrive + 2 * STEP) {
    rest(res, { x: o.Q.x, y: o.Q.y, handle: -1, bot: o.bot }, [{ ...tech, look: o.tech }, { ...driver, look: o.driver }]);
    return;
  }
  // Rolling in, then each to their place: the technician round to the handle, the driver into the line.
  const c = pushed(o.way, t, o.t0), k = (t - arrive) / (2 * STEP);
  res.carts.push({ x: c.cart.x, y: c.cart.y, handle: -1, roll: c.d, bot: o.bot });
  res.people.push({ ...stepTo(c.tech, tech, k), look: o.tech }, { ...stepTo(c.lead, driver, k), look: o.driver });
}

/**
 * A robot lifted from one place to another by two people, k of the way (0 to 1): up off the first, across, and down on
 * the second, the two of them (looks) stepping along with it from where they stand to lift it (P0, a spot each) to where
 * they stand as they set it down (P1), one behind it and one in front.
 */
function carry(res, kind, state, from, to, k, looks, P0, P1) {
  const e = Math.min(1, Math.max(0, k)), s = e * e * (3 - 2 * e);
  const x = from.x + (to.x - from.x) * s, y = from.y + (to.y - from.y) * s;
  const up = from.up + (to.up - from.up) * s + Math.sin(Math.PI * e) * 6;
  res.carried.push({ x: Math.round(x), y: Math.round(y), kind, state: { ...state, up: Math.round(up) } });
  const dir = to.x > from.x ? 2 : 6, frame = e > 0 && e < 1 ? Math.floor((Math.abs(to.x - from.x) * s) / 3.2) : 0;
  looks.forEach((look, i) => res.people.push({
    x: P0[i].x + (P1[i].x - P0[i].x) * s, y: P0[i].y + (P1[i].y - P0[i].y) * s, dir, gait: 'carry', frame: frame + i * 4, look,
  }));
}

/** What's said and heard through the changeover, and the crowd. */
function turnWords(res, plan, t) {
  const n = plan.n, last = matchOf(n), next = matchOf(n + 1), s = last.result.score;
  const list = (a) => `${next.lineup[a][0]}, ${next.lineup[a][1]} AND ${next.lineup[a][2]}`;
  if (t < 1.2) res.moment = `BUZZER#${n}`;
  res.cheer = Math.max(0, 0.8 - t / 3);
  const say = (name, line, from) => (res.say = { name, line, since: t - from });
  if (t >= AT.score && t < AT.score + 4.5) {
    const win = last.result.winner;
    say('ANNOUNCER', `FINAL, MATCH ${n}: BLUE ${s.blue}, RED ${s.red}. ${win === 'tie' ? "IT'S A TIE!" : `${win.toUpperCase()} WINS!`}`, AT.score);
    if (t < AT.score + 1) res.moment = `FINAL#${n}`;
  }
  if (t >= AT.blue && t < AT.red) {
    say(MC_NAME, `ON THE BLUE ALLIANCE: ${list('blue')}!`, AT.blue);
    if (t < AT.blue + 1) res.moment = `BLUE#${n + 1}`;
    res.cheer = 0.55 * Math.max(0, 1 - Math.abs(t - AT.blue - 3) / 2.5);
  } else if (t >= AT.red && t < AT.count) {
    say(MC_NAME, `AND ON THE RED ALLIANCE: ${list('red')}!`, AT.red);
    if (t < AT.red + 1) res.moment = `RED#${n + 1}`;
    res.cheer = 0.55 * Math.max(0, 1 - Math.abs(t - AT.red - 3) / 2.5);
  } else if (t >= AT.count) {
    const left = TURN - t, word = left > 2.1 ? 'DRIVE TEAMS, BEHIND THE LINES!' : left > 1.4 ? 'THREE...' : left > 0.7 ? 'TWO...' : 'ONE...';
    const from = left > 2.1 ? AT.count : TURN - (left > 1.4 ? 2.1 : left > 0.7 ? 1.4 : 0.7);
    say(MC_NAME, word, from);
    if (t < AT.count + 1) res.moment = `COUNT#${n + 1}`;
  }
}
