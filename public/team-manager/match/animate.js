// A simulated match (sim.js) as a picture at any moment: where each robot is and what it's doing, what's in every
// rocket and bay, and the score, all from the timeline, so scrubbing back and forth is free and what's on the field is
// exactly what scored. Pure: no DOM, no drawing (draw.js turns a frame into pixels on field.js's field).
//
// Positions are the simulation's, in feet: x along the field from the blue wall, z in from the far wall (field.js puts
// x at FIELD.x0 + 8x pixels and z at floorY(z)). Heights for the robots' own drawing are in pixels: `up` is how far the
// body is raised (field.js's HAB steps: level 1 is 2, level 2 is 4, level 3 is 13).
//
//   makeShow(match)     index a match for drawing (do it once)
//   frameAt(show, t)    the match t seconds in (0 to 150):
//     t, left (seconds on the clock), phase ('sandstorm' | 'teleop' | 'endgame' | 'over')
//     score { blue, red }, events (the ones so far), recent (the last two seconds' worth, for "+3"s)
//     slots { blue, red }   every slot (sim.js slotKeys) and what's in it: 0, 1, 'null' or 'pre'
//     depots { blue: [far, near], red }   cargo left in each
//     loose [{ x, z, piece, age }]        pieces on the carpet, and how long they've been there
//     robots [pose]: id, num, alliance, sprite, x, z, face (+1 toward red), up, legs { front, rear } (stilt pixels
//       showing under it), hold (what it's carrying), aim ({ slot } or { inches }, and k: how far the mechanism has
//       gone from rest toward it), reach (0 to 1: the grabber pushed out), climbK (0 to 1 through a climb),
//       handoff ({ piece, from, to, k, ok, drop, inside }: a piece on its way between the robot and a port or a
//       station or depot; not ok, it ends on the floor at drop; inside, for cargo going in, 0 to 1 through the moment
//       after it reaches the port, rolling down a rocket's ramp to its side or dropping into a bay, null till then),
//       dead, deadFor, rsl (the light, on or off as it blinks), contact (who's touching it), pinned, shove (pixels),
//       defending (whom), spin (feet driven, for the wheels), doing (the step's kind) and step (the step itself)
//   focusAt(show, t)    where along the field the action is (feet), for a camera that follows it

import { MATCH, PLACES, HAB, HEIGHT_IN, at, slotInfo } from './sim.js';

/** Pixels each HAB level raises a robot (field.js draws level 1 two pixels high, level 2 four, level 3 thirteen). */
export const HAB_PX = [0, 2, 4, 13];
/** Seconds a piece takes between a robot and where it's going: the hand-off. */
const HANDOFF = 0.35;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ease = (k) => (1 - Math.cos(Math.PI * clamp(k, 0, 1))) / 2;

/**
 * Seconds cargo takes inside, once it's in at the port, before it's come to rest at the moment it scores: a rocket's
 * ramp rolls it to the bay on one side, and a cargo ship bay's ball drops past the lip. The hand-off starts that much
 * sooner, so the slot fills (sim.js's fill) just as the ball settles.
 */
const INSIDE = { rocket: 0.45, ship: 0.25 };
function insideOf(slot) {
  const i = slotInfo(slot);
  return i.piece !== 'cargo' ? 0 : i.struct === 'rocket' ? INSIDE.rocket : INSIDE.ship;
}
/** A placing step's hand-off at t, or null before it starts: the flight (k), then for cargo the time inside. */
function placeHandoff(s, t, drop) {
  const inside = s.hit ? insideOf(s.slot) : 0, dur = Math.min(HANDOFF + inside, Math.max(0.05, s.t1 - s.t0));
  const fly = (dur * HANDOFF) / (HANDOFF + inside), t0 = s.t1 - dur;
  if (t <= t0) return null;
  return {
    piece: s.piece, from: 'robot', to: s.slot, k: clamp((t - t0) / fly, 0, 1), ok: !!s.hit, drop,
    inside: inside && t > t0 + fly ? clamp((t - t0 - fly) / (dur - fly), 0, 1) : null,
  };
}

/** The HAB's surface under a point (x seen from the robot's own wall): how many pixels up it holds a wheel. */
export function surface(xo, z) {
  if (xo > 0 && xo < HAB.top.x1 && z > HAB.top.z0 && z < HAB.top.z1) return z > HAB.l3.z0 && z < HAB.l3.z1 ? HAB_PX[3] : HAB_PX[2];
  if (xo > 0 && xo < HAB.l1.x1 && z > HAB.l1.z0 && z < HAB.l1.z1) return HAB_PX[1];
  return 0;
}

/** Index a match for drawing: steps with their facings worked out, tracks with the distance driven, the score as it runs. */
export function makeShow(match) {
  const robots = match.robots.map((r) => {
    const side = r.alliance === 'blue' ? 1 : -1;
    let face = side;
    const steps = r.steps.map((s) => {
      const out = { ...s, t1: s.t1 ?? MATCH.length };
      if (s.kind === 'drive' && s.way?.length > 1) {
        out.face0 = face;
        for (let i = s.way.length - 1; i > 0; i--) {
          const dx = s.way[i][0] - s.way[i - 1][0];
          if (Math.abs(dx) > 0.2) { face = Math.sign(dx); break; }
        }
      } else if (s.kind === 'place') face = at(side, PLACES.spot[slotInfo(s.slot).spot]).face;
      else if (s.kind === 'pickup') face = -side;
      else if (s.kind === 'climb' || s.kind === 'park') face = -side;
      out.face = face;
      return out;
    });
    // The distance driven up to each track point, for the wheels.
    const tr = r.track, dist = new Float64Array(tr.length);
    for (let i = 1; i < tr.length; i++) dist[i] = dist[i - 1] + Math.hypot(tr[i][1] - tr[i - 1][1], tr[i][2] - tr[i - 1][2]);
    return { ...r, side, steps, dist };
  });
  const events = [...match.events].sort((a, b) => a.t - b.t);
  return { match, robots, events, fills: [...match.fills].sort((a, b) => a.t - b.t), byNum: Object.fromEntries(robots.map((r) => [r.num, r])) };
}

/** The last index in a sorted list whose key is at or before t. */
function before(list, t, key) {
  let lo = 0, hi = list.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (key(list[mid]) <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}
/** A robot's position at t from its track: [x, z, feet driven]. */
function placeOf(r, t) {
  const tr = r.track;
  if (!tr.length) return [0, 0, 0];
  const i = before(tr, t, (p) => p[0]);
  if (i < 0) return [tr[0][1], tr[0][2], 0];
  if (i >= tr.length - 1) return [tr.at(-1)[1], tr.at(-1)[2], r.dist[tr.length - 1]];
  const a = tr[i], b = tr[i + 1], k = (t - a[0]) / (b[0] - a[0] || 1);
  return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, r.dist[i] + (r.dist[i + 1] - r.dist[i]) * k];
}

/** Climbing, k of the way through: how high the body is, for a climb made or missed to `level`. */
function climbUp(level, made, k) {
  const top = HAB_PX[level] + 2;
  if (k < 0.15) return HAB_PX[1] * ease(k / 0.15);
  if (made) {
    if (k < 0.7) return HAB_PX[1] + (top - HAB_PX[1]) * ease((k - 0.15) / 0.55);
    if (k < 0.9) return top;
    return top - 2 * ease((k - 0.9) / 0.1);
  }
  // Missed: it gets most of the way up, wobbles, and drops back onto level 1.
  const most = HAB_PX[1] + (top - HAB_PX[1]) * 0.85;
  if (k < 0.6) return HAB_PX[1] + (most - HAB_PX[1]) * ease((k - 0.15) / 0.45);
  if (k < 0.8) return most + (Math.floor(k * 60) % 2);
  if (k < 0.9) return HAB_PX[1] + (most - HAB_PX[1]) * (1 - ease((k - 0.8) / 0.1));
  return HAB_PX[1] + (k < 0.94 ? 1 : 0);
}

/** How high a pickup reaches, in inches: the floor at a depot, a station's hatch slot or its cargo chute. */
const sourceIn = (s) => (s.from === 'depot' ? HEIGHT_IN.floor : s.piece === 'hatch' ? HEIGHT_IN.stationHatch : HEIGHT_IN.stationCargo);
/** Where the piece a robot dropped at time t1 lands, if it dropped one. */
const dropAt = (show, r, t1) => show.match.drops.find((d) => d.by === r.num && Math.abs(d.t - t1) < 0.01) ?? null;

function poseOf(show, r, t) {
  const [x, z, driven] = placeOf(r, t), side = r.side;
  const i = Math.max(0, before(r.steps, t, (s) => s.t0));
  const s = r.steps[i], k = clamp((t - s.t0) / Math.max(1e-6, s.t1 - s.t0), 0, 1);
  const prev = r.steps[i - 1];
  const p = {
    id: r.id, num: r.num, alliance: r.alliance, sprite: r.sprite, x, z, face: s.face, spin: driven, step: s, doing: s.kind,
    hold: s.hold ?? null, aim: null, reach: 0, climbK: 0, handoff: null, dead: false, rsl: true, contact: null, pinned: false,
    shove: 0, defending: null, up: surface(side > 0 ? x : 54 - x, z), legs: { front: 0, rear: 0 },
  };
  // Facing while driving: the way it's going (or the way it was facing, standing still).
  if (s.kind === 'drive' || s.kind === 'defend' || s.kind === 'wait') {
    const [xa] = placeOf(r, t - 0.12), [xb] = placeOf(r, t + 0.12);
    p.face = Math.abs(xb - xa) > 0.03 ? Math.sign(xb - xa) : s.kind === 'drive' ? (k < 0.5 ? s.face0 ?? s.face : s.face) : prev?.face ?? side;
  }
  if (s.kind === 'defend') {
    p.defending = s.target;
    const tgt = show.byNum[s.target];
    if (tgt) {
      const [tx] = placeOf(tgt, t);
      if (Math.abs(tx - x) < 7 && Math.abs(tx - x) > 0.4) p.face = Math.sign(tx - x);
    }
  }
  // The mechanism: up toward where the piece goes while placing, toward the source while picking up, down after.
  if (s.kind === 'place') {
    const rise = Math.min(1.2, (s.t1 - s.t0) * 0.45);
    p.aim = { slot: s.slot, k: ease((t - s.t0) / rise) };
    p.reach = ease((k - 0.55) / 0.3);
    p.handoff = placeHandoff(s, t, dropAt(show, r, s.t1));
  } else if (s.kind === 'pickup') {
    const inches = sourceIn(s);
    p.aim = { inches, k: ease((t - s.t0) / Math.min(0.8, (s.t1 - s.t0) * 0.4)) };
    if (t > s.t1 - HANDOFF) p.handoff = { piece: s.piece, from: s.from, which: s.which, to: 'robot', k: clamp((t - (s.t1 - HANDOFF)) / HANDOFF, 0, 1), ok: s.ok !== false, drop: dropAt(show, r, s.t1) };
  } else if (prev && (prev.kind === 'place' || prev.kind === 'pickup') && t - prev.t1 < 0.6) {
    // Coming back down after it.
    const down = 1 - ease((t - prev.t1) / 0.6);
    p.aim = prev.kind === 'place' ? { slot: prev.slot, k: down } : { inches: sourceIn(prev), k: down };
  }
  // Climbing: the body rises on its stilts (or its arm), moves onto the platform, settles; or drops back.
  if (s.kind === 'climb') {
    p.climbK = k;
    p.up = climbUp(s.level, s.made !== false, k);
    p.face = -side;
  }
  if (p.up > 0) {
    // What shows under it: the body's height over the HAB's surface at its front and back stilts.
    const xo = side > 0 ? x : 54 - x, f = p.face * side;
    p.legs = { front: Math.max(0, p.up - surface(xo + f * 0.3, z) - 1), rear: Math.max(0, p.up - surface(xo - f * 1.5, z) - 1) };
    if (s.kind !== 'climb') p.legs = { front: 0, rear: 0 };
  }
  if (s.kind === 'dead') {
    p.dead = true;
    p.deadFor = t - s.t0;
  }
  // The signal light blinks while it's enabled; solid once the match is over.
  p.rsl = !p.dead && (t >= MATCH.length || Math.floor(t * 2.5 + r.slot * 0.5) % 2 === 0);
  // Contact: someone defending it, or it on someone. A jolt now and then.
  const c = r.contacts.find((q) => t >= q.t0 && t < (q.t1 ?? MATCH.length));
  if (c) {
    p.contact = c.by;
    p.pinned = c.pinned.some(([a, b]) => t >= a && t < b);
  } else if (p.defending) {
    const tgt = show.byNum[p.defending];
    const on = tgt?.contacts.find((q) => t >= q.t0 && t < (q.t1 ?? MATCH.length) && q.by.includes(r.num));
    if (on) {
      p.contact = [p.defending];
      p.pinned = on.pinned.some(([a, b, who]) => who === r.num && t >= a && t < b);
    }
  }
  if (p.contact) p.shove = [0, 1, 0, -1][(Math.floor(t * 9) + r.slot) % 4];
  return p;
}

/** The match at t seconds. */
export function frameAt(show, t) {
  t = clamp(t, 0, MATCH.length);
  const m = show.match;
  const n = before(show.events, t, (e) => e.t) + 1;
  const events = show.events.slice(0, n);
  const score = { blue: 0, red: 0 };
  for (const e of events) score[e.alliance] += e.pts;
  const slots = { blue: {}, red: {} };
  for (const f of show.fills) {
    if (f.t > t) break;
    slots[f.alliance][f.slot] = f.value;
  }
  const depots = { blue: [12, 12], red: [12, 12] };
  for (const d of m.depots) if (d.t <= t) depots[d.alliance][d.which === 'far' ? 0 : 1] = d.left;
  const loose = m.drops.filter((d) => d.t <= t).map((d) => ({ x: d.x, z: d.z, piece: d.piece, age: t - d.t, why: d.why }));
  const left = MATCH.length - t;
  return {
    t, left, phase: t >= MATCH.length ? 'over' : t < MATCH.sandstorm ? 'sandstorm' : left <= MATCH.endgame ? 'endgame' : 'teleop',
    score, events, recent: events.filter((e) => t - e.t < 2), slots, depots, loose,
    robots: show.robots.map((r) => poseOf(show, r, t)),
  };
}

/**
 * Where along the field the action is, in feet: the stretch about a screen wide (30 feet) with the most going on in it.
 * A piece about to go in (or just in) counts most, then a robot placing, climbing or in a shoving match, then anyone
 * driving; a dead or parked robot hardly at all.
 */
export function focusAt(show, t) {
  const pts = show.robots.map((r) => {
    const s = r.steps[Math.max(0, before(r.steps, t, (q) => q.t0))];
    const [x] = placeOf(r, t);
    let w = s.kind === 'place' || s.kind === 'climb' ? 3 : s.kind === 'dead' || s.kind === 'park' ? 0.2 : 1;
    if (r.contacts.some((c) => t >= c.t0 && t < (c.t1 ?? MATCH.length))) w += 2;
    if (show.events.some((e) => e.by === r.num && e.kind !== 'leave' && e.t > t - 1 && e.t < t + 2.5)) w += 6;
    return { x, w };
  });
  let best = null;
  for (const c of pts) {
    const near = pts.filter((p) => Math.abs(p.x - c.x) <= 15);
    const w = near.reduce((n, p) => n + p.w, 0);
    if (!best || w > best.w) best = { w, x: near.reduce((n, p) => n + p.x * p.w, 0) / w };
  }
  return best?.x ?? 27;
}
