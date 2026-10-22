// 5026's robot at practice: the intro's elevator robot (sprites.js eleBot, blue practice bumpers) running timed hatch
// cycles on the homemade half field, the way field.js's hatchRun runs them in the arena. It waits at the loading station
// facing it while the human player holds out a hatch panel, takes it through the slot, spins round, runs along the far
// wall to the rocket's home face, lifts the elevator, reaches out with the grabber and leaves the hatch on the port,
// then lowers, spins and runs back. Cycles take turns: level 2, then level 3. Between reps, while the robot is parked at
// the station, the student who resets the field runs on from by the folded tables, pulls the hatch back off the
// rocket and runs back off the carpet before it moves again (RESET), so the rocket is ready for the next rep; level 1
// already has a hatch and a ball from earlier. Ms. Okafor times it from leaving the station to getting back: 9.2 seconds.
//
// Everything is a pure function of u, the robot's time in seconds, so a cut scene can hold it at any moment or let it
// run. Runs are eased in and out, the wheels turn with the distance covered (spin = x * 0.64, as in field.js), the
// spins are eleBot's squash, and the signal light blinks while it's enabled and holds solid while it's disabled, as on
// a real robot. Positions are whole world pixels; y is the floor line it drives along, which it sorts by.

import { easeInOut, easeOut, easeIn, seg } from '../pixel.js';
import { eleBot } from '../sprites.js';
import { ROBOT } from './layout.js';

/** One cycle, in seconds: the hatch goes in at grab, it leaves the station at leave and is back at back. */
export const CYCLE = { period: 12, grab: 0.5, leave: 0.8, back: 10.0, timed: '9.2' };
/** The field reset, in seconds from `from` (the phase it comes to rest on its last pixel at the station): the student
 *  runs on then, pulls the hatch off the rocket at `pull` and is back at his spot by the folded tables at `to`. He's off
 *  the carpet again at 2.9, before the robot spins round to leave at the next cycle's 0.8 (3.0 here). */
export const RESET = { from: 9.8, pull: 1.75, to: 3.55 };

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
 * the robot still and wants its light to show it's enabled.
 */
export function robotAt(u, enabled = true, blink = u) {
  const n = Math.floor(u / CYCLE.period), phase = u - n * CYCLE.period;
  const level = ((n % 2) + 2) % 2 === 0 ? 2 : 3, E = LIFT[level];
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
  } else if (phase < 7.0) {
    // At the rocket: up, reach out, let go, draw back, down.
    dir = 1;
    x = XR;
    if (phase < 5.2) e1 = E * easeOut(seg(phase, 4.0, 5.2));
    else if (phase < 6.0) {
      e1 = E;
      reach = REACH * (phase < 5.6 ? seg(phase, 5.2, 5.6) : 1 - seg(phase, 5.6, 6.0));
    } else e1 = E * (1 - easeIn(seg(phase, 6.0, 7.0)));
  } else if (phase < 7.4) {
    // Spinning back to face the station.
    dir = 1;
    x = XR;
    k = Math.cos(Math.PI * seg(phase, 7.0, 7.4));
  } else {
    x = XR + (XS - XR) * easeInOut(seg(phase, 7.4, CYCLE.back));
  }
  x = Math.round(x);

  const placed = phase >= 5.6 && phase < RESET.from + RESET.pull;
  const since = u >= RESET.from ? (u - RESET.from) % CYCLE.period : Infinity;
  return {
    x, y: ROBOT.y, dir, k, e1, reach,
    hatch: phase >= CYCLE.grab && phase < 5.6,
    spin: x * 0.64,
    rsl: enabled ? Math.floor(blink * 2.5) % 2 === 0 : true,
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
