// The pick: where the opening hands the player the decision (docs/blue-banner-design.md, section 5, beat 1). Seed 4 is
// on the clock: 45 seconds, big and red at the top. Under it is the scouting tablet (tablet.js): her robot pinned for
// reference, and two teams to pick from (teams.js). 7461 shows the biggest average on the screen, 41, but its last
// three boxes are blank: it sat dead all Saturday morning, and the app's average skips blank boxes. 6834 shows 31,
// all ten boxes filled, never broken down. 6834 is the right pick.
//
// What happens, phase by phase:
//   browse    the clock runs. The stick (or the arrow keys) moves between the cards; A picks the one the cursor's on.
//             At 0:00 the clock says TIME! and Robin waits: the pick is still hers.
//   confirm   "5026 RESPECTFULLY INVITES TEAM 6834", INVITE or BACK (the stick chooses, A presses). The clock runs on.
//   accept    "6834 ACCEPTS!". On by itself after a moment, or on A.
//   result    the bet log's stamp, GOOD CALL or BAD CALL, and the reveal: 7461's blank boxes turn over to 0, 0, 0
//             (FRIDAY 41 · SATURDAY 0, 0, 0), and the one line to remember. A wrong pick: A rewinds. The right one: A
//             carries on.
//   rewind    the tape runs back to 0:45, Norbert's 26 ear glowing in the corner. Then browse again, and her thought:
//             "...DIDN'T THIS JUST HAPPEN?"
//   end       TO BE CONTINUED: the quarterfinals aren't built yet.
//
// scene.js wires it to the stage: startPick() when the cut scene ends, updatePick() every frame (the stick), pressPick()
// on A, drawPickScreen() to draw, pickLabel() and pickStatus() for the phone.
//
//   drawPick(t, left)   the tablet as the pick begins, for the cut scene's last beat: t seconds since it came up (for the
//                       clock's slam), left the seconds on the clock
//   PICK_CLOCK          45

import { clamp } from '../pixel.js';
import { TEAMS, RIGHT } from './teams.js';
import { PICK_CLOCK, drawTablet, drawConfirm, drawAccept, drawResult, drawRewind, drawContinued } from './tablet.js';

export { PICK_CLOCK };

/** Seconds: A ignored this long after the invite comes up (a double tap isn't a choice); accept's moment; the rewind. */
const GUARD = 0.25, ACCEPT = 1.8, REWIND = 1.6, THOUGHT = 3.5;
/** The stick: how far it has to go to count, and how soon holding it moves again. */
const DEAD = 0.35, REPEAT = 0.45;

const P = {
  phase: 'browse', t0: 0, clock0: null, left: PICK_CLOCK, on: 0, choice: 0, picked: null,
  rewinds: 0, rewoundAt: null, held: 0, heldAt: 0, slam: 1,
};
const nowS = () => performance.now() / 1000;
const leftAt = (now) => PICK_CLOCK - (now - P.clock0);
const good = () => P.picked?.num === RIGHT;
function go(phase, now) {
  P.phase = phase;
  P.t0 = now;
}

/**
 * From the top: the clock at 0:45 from now, the cursor on the first card. slam: the clock slams in (after a rewind); the
 * first time, the cut scene's last beat has already slammed it in.
 */
export function startPick(now = nowS(), { slam = false } = {}) {
  Object.assign(P, { clock0: now, on: 0, choice: 0, picked: null, held: 0, slam: slam ? 0 : 1 });
  go('browse', now);
}

/** Every frame: the stick moves the cursor (one card a push; held, again every REPEAT seconds); phases end. */
export function updatePick(dt, stick, now = nowS()) {
  if (P.clock0 == null) startPick(now);
  const st = stick();
  const ax = Math.abs(st.x) >= Math.abs(st.y) ? st.x : st.y;
  const d = st.mag < DEAD ? 0 : Math.sign(ax);
  if (d && (d !== P.held || now - P.heldAt > REPEAT)) {
    P.heldAt = now;
    if (P.phase === 'browse') P.on = clamp(P.on + d, 0, TEAMS.length - 1);
    else if (P.phase === 'confirm') P.choice = clamp(P.choice + d, 0, 1);
  }
  P.held = d;
  if (P.phase === 'accept' && now - P.t0 > ACCEPT) go('result', now);
  if (P.phase === 'rewind' && now - P.t0 > REWIND) {
    P.rewinds++;
    P.rewoundAt = now;
    startPick(now, { slam: true });
  }
}

/** A. */
export function pressPick(now = nowS()) {
  if (P.clock0 == null) startPick(now);
  const t = now - P.t0;
  switch (P.phase) {
    case 'browse':
      P.choice = 0;
      go('confirm', now);
      break;
    case 'confirm':
      if (t < GUARD) break;
      if (P.choice === 1) go('browse', now);
      else {
        P.picked = TEAMS[P.on];
        P.left = leftAt(now);
        go('accept', now);
      }
      break;
    case 'accept':
      if (t > 0.4) go('result', now);
      break;
    case 'result':
      if (t < 0.6) break;
      if (good()) go('end', now);
      else {
        go('rewind', now);
      }
      break;
    default:
  }
}

/** What A does now, for the phone's A button; nothing at the end. */
export function pickLabel() {
  switch (P.phase) {
    case 'browse': return `PICK ${TEAMS[P.on].num}`;
    case 'confirm': return P.choice ? 'BACK' : 'INVITE';
    case 'result': return good() ? 'CONTINUE' : 'REWIND';
    case 'end': return undefined;
    default: return 'NEXT';
  }
}
/** The phone's status line. */
export function pickStatus() {
  return { browse: 'ON THE CLOCK', confirm: 'INVITING', accept: 'PICKED', result: 'BET LOG', rewind: 'REWINDING', end: 'TO BE CONTINUED' }[P.phase];
}

/** The whole screen, for this moment. */
export function drawPickScreen(now = nowS()) {
  if (P.clock0 == null) startPick(now);
  const t = now - P.t0, sinceClock = now - P.clock0 + P.slam;
  // After a rewind, her thought takes the hint line for a moment, and Norbert's ear dims back down.
  const since = P.rewoundAt == null ? Infinity : now - P.rewoundAt;
  const thought = since < THOUGHT ? '...DIDN\'T THIS JUST HAPPEN?' : null;
  const afterglow = clamp(1 - since / 0.8, 0, 1);
  switch (P.phase) {
    case 'browse':
      drawTablet({ t: sinceClock, left: leftAt(now), on: P.on, thought, glow: afterglow });
      break;
    case 'confirm':
      drawTablet({ t: sinceClock, left: leftAt(now), on: P.on, hint: ['CHOOSE', P.choice ? 'BACK' : 'INVITE'] });
      drawConfirm(TEAMS[P.on], P.choice, t);
      break;
    case 'accept':
      drawTablet({ t: 1, left: P.left, on: P.on, hint: ['CHOOSE', 'NEXT'] });
      drawAccept(P.picked, t);
      break;
    case 'result':
      // A wrong pick: Norbert's ear starts to pulse while A: REWIND waits.
      drawResult(P.picked, good(), t, { glow: !good() && t > 2.4 ? 0.35 + 0.35 * Math.sin(t * 5) : 0 });
      break;
    case 'rewind': {
      const k = clamp(t / REWIND, 0, 1), left = P.left + (PICK_CLOCK - P.left) * k * k;
      drawTablet({ t: 1, left, on: 0, hint: ['CHOOSE', 'PICK'], glow: Math.min(1, 0.4 + k) });
      drawRewind(k, t);
      break;
    }
    case 'end':
      drawContinued(t);
      break;
    default:
  }
}

/** The tablet as the pick begins, for the cut scene's last beat. */
export function drawPick(t, left) {
  drawTablet({ t, left, on: 0 });
}
