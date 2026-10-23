// 5026's robot at practice: the intro's elevator robot (sprites.js eleBot, blue practice bumpers) running timed hatch
// cycles on the homemade half field, the way field.js's hatchRun runs them in the arena. It waits at the loading station
// facing it while the human player holds out a hatch panel, takes it through the slot, spins round, runs along the far
// wall to the rocket's home face, lifts the elevator, reaches out with the grabber and leaves the hatch on the port,
// then lowers, spins and runs back. Cycles take turns: level 2, then level 3. Between reps the field is reset the way
// a real team does it (RESET): as the robot comes to rest at the station the operator disables it, and its signal
// light stops blinking and holds solid; only then does the student who resets the field step on from the carpet's
// edge, pull the hatch back off the rocket and run back off. Once he's off, the operator calls ENABLING! and enables
// it again (the light blinks), the human player hands it the next hatch, and it goes. Level 1 already has a hatch and a
// ball from earlier. Ms. Okafor times each rep from leaving the station to getting back: 9.2 seconds at level 2, and
// 10.4 at level 3, where the elevator has further to go up and back down (SLOW), as she tells the strategist (words.js).
//
// Everything is a pure function of u, the robot's time in seconds, so a cut scene can hold it at any moment or let it
// run. Runs are eased in and out, the wheels turn with the distance covered (spin = x * 0.64, as in field.js), the
// spins are eleBot's squash, and the signal light blinks while it's enabled and holds solid while it's disabled, as on
// a real robot. Positions are whole world pixels; y is the floor line it drives along, which it sorts by.

import { easeInOut, easeOut, easeIn, seg } from '../pixel.js';
import { eleBot } from '../sprites.js';
import { ROBOT } from './layout.js';

/** One cycle at level 2, in seconds: the hatch goes in at grab, it leaves the station at leave and is back at back. */
export const CYCLE = { period: 12, grab: 0.5, leave: 0.8, back: 10.0, timed: '9.2' };
/** How much longer the elevator takes to go up (up) and come back down (down) at each level. Level 3 is 50 pixels up
 *  to level 2's 31, so its cycle is longer by both (13.2 seconds), and it's timed at 10.4. */
const SLOW = { 2: { up: 0, down: 0 }, 3: { up: 0.7, down: 0.5 } };
const extra = (level) => SLOW[level].up + SLOW[level].down;
const PERIOD = { 2: CYCLE.period, 3: CYCLE.period + extra(3) }, PAIR = PERIOD[2] + PERIOD[3];
/** The phase of each level's cycle at which the hatch goes on the port. */
export const PLACE = { 2: 5.6 + SLOW[2].up, 3: 5.6 + SLOW[3].up };
/** The field reset, in seconds from `from`, the phase a level 2 cycle comes to rest on its last pixel at the station
 *  (a level 3 cycle's is later by its extra), when the operator disables it. The student sets off from his spot at the carpet's edge at `on`, a moment after the light has
 *  gone solid, runs to the rocket (1.1 seconds at a run, people.js RESET_PATH), pulls the hatch off it at `pull` and is
 *  back off the carpet just before `to`. The operator enables it again at `enable`, before the human player hands it
 *  the next hatch at the next cycle's 0.5 (2.7 here) and it spins round to leave at 0.8 (3.0). */
export const RESET = { from: 9.8, on: 0.15, pull: 1.35, to: 2.6, enable: 2.65 };

const XS = ROBOT.station, XR = ROBOT.rocket;
/** eleBot's first stage, raised this far, holds the hatch at the port: level 2 (31 up) and level 3 (50 up). */
const LIFT = { 2: 0.36, 3: 1 };
/** The grabber's reach, in pixels, when it puts the hatch on the port. */
const REACH = 3;

/**
 * Where the robot is u seconds in, and what it's doing: { x, y, dir, k, e1, reach, hatch, spin, rsl } for eleBot, plus
 * level (2 or 3), phase (seconds into this cycle), fill (the rocket's ports, for halffield.js: { home, away, cargo },
 * bottom level first), hp (the human player has a hatch ready to hand over) and reset (seconds into the field reset
 * while it's on, otherwise null). The signal light blinks on `blink`, the robot's own clock unless a cut scene holds
 * the robot still and wants its light to show it's enabled; it holds solid while enabled is false, and between
 * RESET.from and RESET.enable of every reset, while the robot is disabled for it.
 */
export function robotAt(u, enabled = true, blink = u) {
  // Cycles take turns, level 2 (12 seconds) then level 3 (13.2).
  const n = Math.floor(u / PAIR), r = u - n * PAIR, level = r < PERIOD[2] ? 2 : 3;
  const start = n * PAIR + (level === 3 ? PERIOD[2] : 0), phase = u - start, E = LIFT[level];
  const U = SLOW[level].up, X = extra(level);
  let x = XS, dir = -1, k = 1, e1 = 0, reach = 0;

  if (phase < 0.8) {
    // At the station, nosed into it. She pushes the hatch through the slot at grab.
  } else if (phase < 1.2) {
    // Spinning round to face the rocket: the squash goes through zero as it turns side on.
    dir = 1;
    k = -Math.cos(Math.PI * seg(phase, 0.8, 1.2));
  } else if (phase < 4.0) {
    dir = 1;
    x = XS + (XR - XS) * easeInOut(seg(phase, 1.2, 4.0));
  } else if (phase < 7.0 + X) {
    // At the rocket: up, reach out, let go, draw back, down (longer up and down at level 3).
    dir = 1;
    x = XR;
    if (phase < 5.2 + U) e1 = E * easeOut(seg(phase, 4.0, 5.2 + U));
    else if (phase < 6.0 + U) {
      e1 = E;
      reach = REACH * (phase < 5.6 + U ? seg(phase, 5.2 + U, 5.6 + U) : 1 - seg(phase, 5.6 + U, 6.0 + U));
    } else e1 = E * (1 - easeIn(seg(phase, 6.0 + U, 7.0 + X)));
  } else if (phase < 7.4 + X) {
    // Spinning back to face the station.
    dir = 1;
    x = XR;
    k = Math.cos(Math.PI * seg(phase, 7.0 + X, 7.4 + X));
  } else {
    x = XR + (XS - XR) * easeInOut(seg(phase, 7.4 + X, CYCLE.back + X));
  }
  x = Math.round(x);

  // The reset after this cycle starts at rest; until then, the one after the cycle before (none before the first).
  const rest = start + RESET.from + X, before = start - (level === 3 ? PERIOD[2] : PERIOD[3]) + RESET.from + extra(5 - level);
  const since = u >= rest ? u - rest : u >= RESET.from ? u - before : Infinity;
  const placed = phase >= PLACE[level] && phase < RESET.from + X + RESET.pull;
  const live = enabled && !(since < RESET.enable);
  return {
    x, y: ROBOT.y, dir, k, e1, reach,
    hatch: phase >= CYCLE.grab && phase < PLACE[level],
    spin: x * 0.64,
    rsl: live ? Math.floor(blink * 2.5) % 2 === 0 : true,
    level, phase,
    fill: { home: [true, placed && level === 2, placed && level === 3], away: [false, false, false], cargo: [true, false, false] },
    hp: phase < CYCLE.grab || phase >= 3.0,
    reset: since < RESET.to ? since : null,
  };
}

/** The robot as a thing to sort in with everything else on the floor. The caller has set the camera. */
export function robotThing(r) {
  return {
    y: r.y,
    draw: () => eleBot(r.x, r.y, { team: 'blue', num: '5026', dir: r.dir, k: r.k, e1: r.e1, reach: r.reach, hatch: r.hatch, spin: r.spin, rsl: r.rsl }),
  };
}
