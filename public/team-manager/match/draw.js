// A simulated match drawn on the arena's field (field.js), with the stands behind it (bleachers.js): the robots where
// the simulation puts them, every piece moving from a robot to its port (and cargo on inside, rolling to its side of a
// rocket or dropping into a bay) at the moment it scores, the scoreboard ticking as it does; cargo with no hatch panel
// to keep it in rolling back out onto the carpet; the sandstorm's shutters down over the driver stations until 0:15.
// animate.js says what's where at time t; this turns it into pixels, 256x144, in world pixels through pixel.js's camera
// like everything else on the field.
//
//   liveOf(frame, o)            what drawFieldLive's live option takes: { bots, fill, loose, rollouts, sandstorm }.
//                               o.mark: a robot's number to point out (the one the camera follows)
//   drawMatch(g, show, t, o)    the whole picture: floor, stands, field, robots, the scoreboard. o: camX (world
//                               pixels), mark, cheer (0 to 1), label (under the scoreboard), board (false: no
//                               scoreboard). Returns the frame it drew.
//   drawScoreboard(frame, o)    blue's score, the clock, red's, and the period under it
//   cameraFor(show, t)          where the camera would like to be (world pixels), following the action
//   wx(ft), toScreen(pose)      feet along the field to world pixels; a robot's floor point
//
// To switch a scene's match over (the opening's quarterfinal, say): simulate it once (sim.js), makeShow it, then each
// frame call drawFieldLive(g, camX, t, { live: liveOf(frameAt(show, t)), score }) where it now passes teams.

import { W, C, screen, fill, rect, text, measure, withAlpha, clamp } from '../pixel.js';
import { FIELD, WORLD_W, floorY, makeFloor, drawFieldLive, portAt } from '../field.js';
import { drawStands, drawWalkway, STANDING, drawStanding } from '../bleachers.js';
import { cargo, hatchPart, frame as spriteFrame } from '../sprites.js';
import { drawBot, holdAt, reachOf } from './bots.js';
import { slotInfo, MATCH, ROCKETS, PRELOAD_BAYS } from './sim.js';
import { frameAt, focusAt } from './animate.js';

/** Feet along the field to world pixels. */
export const wx = (ft) => FIELD.x0 + ft * 8;
/** A robot's floor point in world pixels. */
export const toScreen = (p) => ({ x: Math.round(wx(p.x)), y: Math.round(floorY(p.z)) });
/** The HAB's front edge: robots up on it are drawn after it (field.js sorts by floor line, and it's drawn as one). */
const HAB_FRONT = floorY(20.3) + 0.01;

// ---- Where pieces go ----
/** A slot key (sim.js) as field.js's portAt wants it. */
function portOf(alliance, key) {
  const i = slotInfo(key);
  return i.struct === 'rocket'
    ? portAt({ alliance, piece: i.piece, struct: 'rocket', rocket: i.rocket === 'f' ? 'far' : 'near', level: i.level, face: i.face === 'h' ? 'home' : 'away' })
    : portAt({ alliance, piece: i.piece, struct: 'ship', bay: i.bay });
}
/**
 * Everything in the rockets, the ship and the depots, as field.js draws it. inside: cargo that's in at its port and not
 * yet come to rest, [{ alliance, slot, k }]: rolling to its side of a rocket (roll), or dropping into a bay (drop).
 */
function fieldFill(slots, depots, inside = []) {
  const out = {};
  for (const a of ['blue', 'red']) {
    const s = slots[a], v = (k) => s[k] ?? 0;
    const mine = inside.filter((m) => m.alliance === a).map((m) => ({ ...m, info: slotInfo(m.slot) }));
    const rocket = (r) => ({
      home: [1, 2, 3].map((l) => !!v(`hatch:${r}${l}h`)),
      away: [1, 2, 3].map((l) => !!v(`hatch:${r}${l}a`)),
      cargo: [1, 2, 3].map((l) => [!!v(`cargo:${r}${l}h`), !!v(`cargo:${r}${l}a`)]),
      roll: mine.filter((m) => m.info.struct === 'rocket' && m.info.rocket === r)
        .map((m) => ({ level: m.info.level, face: m.info.face === 'h' ? 'home' : 'away', k: m.k })),
    });
    const bay = (b) => [v(`cargo:${b}`) ? 1 : 0, v(`hatch:${b}`)];
    out[a] = {
      far: rocket('f'), near: rocket('n'),
      ship: {
        near: [0, 1, 2].map((i) => bay(`near${i}`)), far: [0, 1, 2].map((i) => bay(`far${i}`)), front: [0, 1].map((i) => bay(`front${i}`)),
        drop: mine.filter((m) => m.info.struct === 'ship').map((m) => ({ bay: m.info.bay, k: m.k })),
      },
      depots: depots[a],
    };
  }
  return out;
}

// ---- The robots ----
/** A robot's drawing state: its mechanism aimed at the port it's placing on (or the source it's taking from). */
function stateOf(p, t) {
  const kind = p.sprite, rest = reachOf(kind)[0], { y } = toScreen(p);
  let lift = rest;
  if (p.aim) {
    const target = p.aim.slot ? y - p.up - portOf(p.alliance, p.aim.slot).y : (p.aim.inches * 8) / 12;
    lift = rest + (target - rest) * p.aim.k;
  }
  const handing = p.handoff && p.handoff.from === 'robot';
  return {
    team: p.alliance, num: p.num, dir: p.face, spin: p.spin * 8 * 0.64, rsl: p.rsl, dead: p.dead, deadFor: p.deadFor,
    hold: p.hold, hide: handing, lift, reach: p.reach, up: p.up, legs: p.legs, climbK: p.climbK, shove: p.shove, t,
  };
}
const lerp = (a, b, k) => a + (b - a) * k;
/**
 * A piece on its way: from the robot to its port (or, missed, to the floor), or from a station or depot to the robot.
 * Once cargo is in at its port, the rocket or the ship draws the rest (fieldFill's inside), behind what hides it.
 */
function drawHandoff(p, st) {
  const h = p.handoff, { x, y } = toScreen(p);
  if (h.inside != null) return;
  const hold = holdAt(p.sprite, { ...st, hold: h.piece }), at = { x: x + hold.dx, y: y + hold.dy };
  let from, to, k = h.k;
  if (h.from === 'robot') {
    [from, to] = [at, portOf(p.alliance, h.to)];
    if (!h.ok) {
      // A miss: it goes for the port, catches the edge and falls.
      const d = h.drop ?? { x: p.x + p.face * 1.6, z: p.z + 1 };
      const mid = { x: lerp(from.x, to.x, 0.6), y: lerp(from.y, to.y, 0.6) };
      if (k < 0.5) to = mid, k = k / 0.5;
      else [from, to, k] = [mid, { x: wx(d.x), y: floorY(d.z) - 3 }, (k - 0.5) / 0.5];
    }
  } else {
    const src = portAt({ alliance: p.alliance, piece: h.piece, struct: h.from, which: h.which });
    [from, to] = [src, at];
    // A fumble: it gets to the robot and bounces off.
    if (!h.ok && k > 0.7) [from, to, k] = [at, h.drop ? { x: wx(h.drop.x), y: floorY(h.drop.z) - 3 } : { x: at.x - p.face * 8, y: y - 3 }, (k - 0.7) / 0.3];
  }
  const e = k * k * (3 - 2 * k), px = Math.round(lerp(from.x, to.x, e)), py = Math.round(lerp(from.y, to.y, e) - Math.sin(Math.PI * k) * 4);
  if (h.piece === 'cargo') cargo(px, py, 4);
  else hatchPart(spriteFrame(px, 0, p.face), -2, py);
}
/** Sparks where two robots are shoving. */
function sparks(a, b, t, pinned) {
  const pa = toScreen(a), pb = toScreen(b), mx = (pa.x + pb.x) / 2, my = Math.min(pa.y, pb.y) - 8;
  const n = Math.floor(t * 14);
  for (let i = 0; i < 3; i++) {
    const k = ((n + i * 5) % 7) / 7;
    rect(Math.round(mx + Math.sin(n * 1.7 + i * 2.1) * 4), Math.round(my - k * 6 + i), 1, 1, i % 2 ? C.yel2 : C.white);
  }
  if (pinned) text('PIN', Math.round(mx), Math.round(my - 16), { font: 3, align: 'center', color: C.yel2, outline: C.ink });
}
/** A little arrow over the robot the camera follows. */
function marker(p, t) {
  const { x, y } = toScreen(p), top = y - p.up - (p.sprite === 'def' || p.sprite === 'wedge' || p.sprite === 'hatchlow' ? 34 : 56) - (Math.floor(t * 3) % 2);
  rect(x - 3, top - 1, 7, 3, C.ink);
  rect(x - 2, top + 2, 5, 2, C.ink);
  rect(x - 1, top + 4, 3, 1, C.ink);
  rect(x - 2, top, 5, 1, C.yel1);
  rect(x - 1, top + 1, 3, 2, C.yel1);
  rect(x, top + 3, 1, 1, C.yel1);
}

/** What drawFieldLive's live option takes, from a frame. */
export function liveOf(frame, o = {}) {
  const t = frame.t, byNum = Object.fromEntries(frame.robots.map((p) => [p.num, p]));
  const bots = frame.robots.map((p) => {
    const { x, y } = toScreen(p), st = stateOf(p, t);
    const onHab = p.up > 0 || (Math.abs((p.alliance === 'blue' ? p.x : 54 - p.x)) < 7.6 && p.z > 6.7 && p.z < 20.3);
    return {
      y: onHab ? HAB_FRONT + p.z * 0.001 : y,
      draw: () => {
        drawBot(p.sprite, x, y, st);
        if (p.handoff) drawHandoff(p, st);
        if (p.contact && p.defending == null) for (const n of p.contact) if (byNum[n]) sparks(p, byNum[n], t, p.pinned);
        if (o.mark === p.num) marker(p, t);
      },
    };
  });
  // Pieces on the floor: dropped ones land as their hand-off ends.
  const loose = frame.loose.map((d) => ({ x: Math.round(wx(d.x)), y: Math.round(floorY(d.z)), piece: d.piece }));
  const inside = frame.robots.filter((p) => p.handoff?.inside != null).map((p) => ({ alliance: p.alliance, slot: p.handoff.to, k: p.handoff.inside }));
  return { bots, fill: fieldFill(frame.slots, frame.depots, inside), loose, rollouts: rolloutsOf(frame), sandstorm: frame.blinds };
}

/**
 * Seconds a rocket's cargo takes to clear its open hatch once it's rolled down to its side: the ramp carries it straight
 * on out, without stopping (the simulation's tOut leaves it longer, but only says when it's out).
 */
const CLEAR = 0.12;
/**
 * Cargo rolling back out (frame.rolling) as field.js's live.rollouts: from the moment it gets to its bay (a rocket's
 * just after it's rolled in from the port, as a scored one does: the hand-off draws that), out through the hatch, to
 * where the simulation has it come to rest.
 */
function rolloutsOf(frame) {
  return frame.rolling.map((d) => ({
    alliance: d.alliance, struct: d.struct,
    ...(d.struct === 'rocket' ? { rocket: d.rocket === 'f' ? 'far' : 'near', level: d.level, face: d.side === 'h' ? 'home' : 'away' } : { bay: d.bay }),
    at: d.at, out: d.struct === 'rocket' ? CLEAR : d.tOut - d.tIn, end: d.t - d.tIn, to: { x: wx(d.x), y: floorY(d.z) },
  }));
}

// ---- The scoreboard ----
const clockText = (secs) => {
  const s = Math.max(0, Math.ceil(secs - 1e-6));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const PERIOD = { sandstorm: 'SANDSTORM', teleop: 'TELEOP', endgame: 'ENDGAME', over: 'FINAL' };
/** Blue's score on the left, the clock, red's on the right (as the opening's quarterfinal has it); the period under it. */
export function drawScoreboard(frame, o = {}) {
  screen();
  const x = 78, y = 3;
  fill(x - 1, y - 1, 102, 15, C.ink);
  fill(x, y, 34, 13, C.blue1);
  fill(x, y, 34, 1, C.blue2);
  fill(x + 66, y, 34, 13, C.red1);
  fill(x + 66, y, 34, 1, C.red2);
  text(String(frame.score.blue), x + 17, y + 3, { align: 'center' });
  text(String(frame.score.red), x + 83, y + 3, { align: 'center' });
  const late = frame.phase === 'endgame' || frame.phase === 'over';
  text(clockText(frame.left), x + 50, y + 3, { align: 'center', color: frame.phase === 'sandstorm' ? C.org2 : late ? C.red2 : C.yel2 });
  const label = o.label ?? PERIOD[frame.phase];
  const w = measure(label, { font: 3 }) + 6;
  fill(W / 2 - w / 2 - 1, y + 14, w + 2, 8, C.ink);
  text(label, W / 2, y + 16, { font: 3, align: 'center', color: frame.phase === 'sandstorm' ? C.org2 : C.steel3 });
}

/** "+3" rising off each piece as it goes in, in its alliance's colour; the HAB's points over the robot. */
function popups(frame, show, camX) {
  for (const e of frame.recent) {
    const age = frame.t - e.t;
    if (age > 1.4) continue;
    let at;
    if (e.slot) at = portOf(e.alliance, e.slot);
    else {
      const p = frame.robots.find((r) => r.num === e.by);
      if (!p) continue;
      const s = toScreen(p);
      at = { x: s.x, y: s.y - 44 };
    }
    const y = Math.round(at.y - 10 - age * 10);
    withAlpha(age > 1 ? (1.4 - age) / 0.4 : 1, () => {
      text(`+${e.pts}`, Math.round(at.x), y, { font: 3, align: 'center', color: e.alliance === 'blue' ? C.blue3 : C.red3, outline: C.ink });
    });
  }
}

// ---- The whole picture ----
let FLOOR = null;
const drivers = STANDING.filter((p) => p.id.startsWith('driver'));

/** Where the camera would like to be, in world pixels: the action in the middle of the picture, inside the world. */
export function cameraFor(show, t) {
  return clamp(Math.round(wx(focusAt(show, t)) - W / 2), 0, WORLD_W - W);
}

export function drawMatch(g, show, t, o = {}) {
  FLOOR ??= makeFloor();
  const frame = frameAt(show, t), camX = Math.round(o.camX ?? cameraFor(show, t));
  g.drawImage(FLOOR, -camX, 0);
  drawStands(g, camX, t, null, { cheer: o.cheer ?? 0 });
  drawWalkway(g, camX);
  const more = drivers.filter((p) => Math.abs(p.x - camX - 128) < 150).map((p) => ({ y: p.y, draw: () => drawStanding(g, camX, p) }));
  drawFieldLive(g, camX, t, { live: liveOf(frame, o), score: [frame.score.blue, frame.score.red], more });
  popups(frame, show, camX);
  if (o.board !== false) drawScoreboard(frame, o);
  return frame;
}

export { frameAt, MATCH, ROCKETS, PRELOAD_BAYS };
