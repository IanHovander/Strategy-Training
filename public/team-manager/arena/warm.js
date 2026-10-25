// Drawing ahead. The first time anyone is drawn in a new pose (a look, a direction, a gait and a frame of it), the
// walker's rig works it out pixel by pixel, a few milliseconds' work, and keeps it (walker.js); and a changeover brings
// two dozen people on at once, in looks never drawn before, walking, pushing and carrying. Done as they appear, that's a
// stutter. So while a match is on, the changeover after it is worked out (flow.js's plan) and played through at 30
// frames a second, a little at a time, and every pose anyone takes in it is drawn ahead: in the browser's idle time
// between frames where it has any (requestIdleCallback), otherwise a sliver of each frame.
//
//   warm(T)   call once a frame with the arena's time: keeps the drawing ahead going

import { walkerFrame, FRAMES } from '../walker.js';
import { MATCH } from '../match/sim.js';
import { flowAt } from './flow.js';
import { clockAt, startOf, TURN } from './schedule.js';

/** The match whose changeover is being got ready, the moment of it looked at next, and the poses still to draw. */
let readying = null, at = 0, end = 0, waiting = false;
const poses = [], done = new Set();
const STEP = 1 / 30;
/** Without idle callbacks, how much of each frame goes on it, in milliseconds. */
const SLIVER = 1.5;

/** One more piece of the work: a pose drawn, or a moment of the changeover looked at for poses. False when it's done. */
function more() {
  if (poses.length) {
    const [look, dir, gait, frame] = poses.pop();
    walkerFrame(dir, gait, frame, look);
    return true;
  }
  if (at >= end) return false;
  for (const p of flowAt(at).people) {
    const frame = (p.frame ?? 0) % (FRAMES[p.gait] ?? 1), key = `${p.look.id} ${p.dir} ${p.gait} ${frame}`;
    if (done.has(key)) continue;
    done.add(key);
    poses.push([p.look, p.dir, p.gait, frame]);
  }
  at += STEP;
  return true;
}

const idle = typeof requestIdleCallback === 'function' ? requestIdleCallback : null;
function onIdle(deadline) {
  waiting = false;
  while (deadline.timeRemaining() > 6 && more());
  if (poses.length || at < end) schedule();
}
function schedule() {
  if (waiting || !idle) return;
  waiting = true;
  idle(onIdle, { timeout: 500 });
}

/** Keep the drawing ahead going for the changeover after the match on at T (or the one on now, if it's started). */
export function warm(T) {
  const { n } = clockAt(T);
  if (readying !== n) {
    readying = n;
    at = Math.max(startOf(n) + MATCH.length, T);
    end = startOf(n) + MATCH.length + TURN;
  }
  if (idle) return schedule();
  const t0 = performance.now();
  while (performance.now() - t0 < SLIVER && more());
}
