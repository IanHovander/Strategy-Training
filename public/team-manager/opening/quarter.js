// The quarterfinal: what follows the picks (docs/blue-banner-design.md, section 5, beat 2). Alliance 4 against
// alliance 5, best 2 of 3, played quickly up to one frozen moment: match 3, 20 seconds left, red up by 8, and 6834 has
// to climb. Level 2 is certain and wins every time; Level 3 is worth more and wins 7 times in 10. series.js has the
// matches (each one the match simulation's), match.js draws them, verdict.js has the bet log.
//
// What happens, phase by phase:
//   card      QUARTERFINAL, best 2 of 3: the two alliances side by side. A plays match 1.
//   match     a match on the field, fast (SPEED times real time), the camera on the action, the scoreboard counting
//             what goes in, a line about what's happening. A skips to its end. Match 3 slows as it nears 0:20, and
//             stops there (frozen).
//   over      its result: RED WINS or BLUE WINS, the series pips. A plays the next.
//   frozen    match 3 at 0:20: a flash, the field going dark, time stopped. Then Riley and 6834's driver in the dialog
//             box (the stage's own, s.talk): 6834 wants Level 3. A reads on.
//   call      the call: LEVEL 2 or LEVEL 3, two cards over the frozen field, with how often 6834 makes each, what blue's
//             climber will try, and the crowd chanting for Level 3. The stick chooses, A calls; or a tap on a card
//             (pressed in under the finger, acting when it lets go on it). There's no clock: time's stopped.
//   endgame   the last 20 seconds, nearly real time, as the call and the dice (rolled as she calls: series.js
//             rollEndgame, honest) play them out: the camera on 6834 to its climb, then across the field to 6417's.
//             A skips to the next climb's outcome.
//   buzzer    the final score, and the series won or lost. A: the bet log.
//   result    the bet log for the call (verdict.js drawResult3). Level 2: GOOD CALL, A carries on. Level 3: BAD CALL
//             whether it worked or not, Norbert's ear glows, and A rewinds.
//   rewind    the tape runs back to 0:20 and the call, not to the start: the picks were right, so they stay. Then
//             call again, and her thought: "...DIDN'T THIS JUST HAPPEN?"
//   end       the goal card with all three ticked, and TO BE CONTINUED: THE SEMIFINAL.
//
// scene.js hands over to this once the second pick is done (second.js secondOver()), or from the start with ?qf in the
// address (?qf=call: straight to the frozen moment, for testing; ?climb=made|missed and ?theirs=made|missed fix the
// dice).
//
//   resetQuarter()                    from the top next time it's needed
//   updateQuarter(dt, s)              every frame: the matches' clock, the camera, the stick, the dialog
//   pressQuarter(s)                   A, when no words are up
//   pointQuarter(type, x, y, s)       a finger on the screen
//   drawQuarter(g, now)               the whole screen
//   quarterLabel(), quarterStatus()   what A does and the phone's status line (the sound's cues key off the status)

import { C, clamp, seg, lerp } from '../pixel.js';
import { conversation } from '../talk.js';
import { HERO_NAME } from '../cast.js';
import { COCAPTAIN_LOOK, COCAPTAIN_NAME } from './cocaptain.js';
import { drawRewind, inRect } from './tablet.js';
import { drawResult3, drawEnd3 } from './verdict.js';
import {
  drawSeriesCard, drawMatch, drawMatchOver, drawFrozen, drawCall, callRect, drawEndgame, endgameTimes, drawBuzzer, cameraOn,
} from './match.js';
import {
  MATCHES, CALLS, RIGHT3, LEFT, LEAD, FREEZE, CLIMBER, THEIR_CLIMBER, matchOf, rollEndgame,
} from './series.js';

/** A match's length, in its own seconds. */
const LENGTH = 150;
/**
 * How fast the matches play: SPEED times real time (150 seconds in 10), match 3 slowing to real time over its last
 * SLOW seconds before the freeze; the last 20 seconds at ENDGAME times.
 */
const SPEED = 15, SLOW = 12, ENDGAME = 1.4;
/** How quickly the camera catches up with where it wants to be (a fraction of the gap, per second). */
const FOLLOW = 3;
/** Seconds: the freeze before the words; how long a climb's outcome holds the camera; after the buzzer. */
const HUSH = 0.9, OUTCOME = 1.6, TAIL = 0.8;
/** As at the picks: the stick's dead zone and repeat; the rewind; her thought; A ignored just after the call comes up. */
const DEAD = 0.35, REPEAT = 0.45, REWIND = 1.6, THOUGHT = 3.5, GUARD = 0.3;

const SAY = (lines) => ({ name: COCAPTAIN_NAME, lines, tag: C.red0 });
const DRIVER = (lines) => ({ name: `${CLIMBER}'S DRIVER`, lines, tag: C.red1 });
const HER = (lines) => ({ name: HERO_NAME, lines, tag: C.red1 });
/** The freeze: Riley on the headset, 6834's driver pushing for Level 3. Two lines of at most 38 a page. */
export const FREEZE_LINES = [
  SAY([`${LEFT} SECONDS. WE'RE UP ${LEAD}.`, `${CLIMBER} HAS TO CLIMB. YOUR CALL.`]),
  DRIVER(['LET US GO FOR LEVEL 3!', 'WE PRACTICED IT ALL WEEK!']),
  SAY([`AND ${THEIR_CLIMBER}'S GOING FOR LEVEL 3 TOO.`, 'LEVEL 2 OR LEVEL 3?']),
  HER(['TIME TO DO THE MATH.']),
];

const Q = {
  phase: null, t0: 0, i: 0, wins: { red: 0, blue: 0 }, choice: 0, pressed: -1, held: 0, heldAt: 0,
  talked: false, roll: null, rewoundAt: null,
  // The match being shown: how far into it (its own seconds), and where the camera is (world pixels).
  at: 0, camX: 0, freezeCam: 0,
};
const nowS = () => performance.now() / 1000;
function go(phase, now) {
  Q.phase = phase;
  Q.t0 = now;
  Q.pressed = -1;
}
const good = () => Q.roll?.key === RIGHT3;

/** From the top, the next time it's needed. */
export function resetQuarter() {
  Q.phase = null;
}
function start(now) {
  Object.assign(Q, { i: 0, wins: { red: 0, blue: 0 }, choice: 0, talked: false, roll: null, rewoundAt: null });
  if (new URLSearchParams(location.search).get('qf') === 'call') {
    Object.assign(Q, { i: 2, wins: { red: 1, blue: 1 }, talked: true, at: FREEZE });
    Q.camX = Q.freezeCam = cameraOn(matchOf(2), FREEZE);
    go('call', now);
  } else go('card', now);
}
/** The series before match i is played (each match's winner from series.js). */
const winsBefore = (i) => MATCHES.slice(0, i).reduce((w, m) => (m.red > m.blue ? { ...w, red: w.red + 1 } : { ...w, blue: w.blue + 1 }), { red: 0, blue: 0 });
const winsAfter = (i) => winsBefore(i + 1);
/** Where match i stops being shown: its end, or the freeze in match 3. */
const endOf = (i) => (i === 2 ? FREEZE : LENGTH);
/** How fast match i plays at `at` seconds into it. */
const speedAt = (i, at) => (i === 2 ? lerp(SPEED, 1, seg(at, FREEZE - SLOW, FREEZE)) : SPEED);
/** The camera, eased toward x. */
function follow(x, dt) {
  Q.camX += (x - Q.camX) * Math.min(1, dt * FOLLOW);
}
/** Who the camera's on in the last 20 seconds: 6834 until its climb's outcome has been seen, then 6417. */
const endgameFocus = (at) => (at < endgameTimes(Q.roll).ours + OUTCOME ? CLIMBER : THEIR_CLIMBER);

// ---- Every frame ----
export function updateQuarter(dt, s, now = nowS()) {
  if (!Q.phase) start(now);
  const t = now - Q.t0;
  switch (Q.phase) {
    case 'match':
      Q.at = Math.min(endOf(Q.i), Q.at + dt * speedAt(Q.i, Q.at));
      follow(cameraOn(matchOf(Q.i), Q.at), dt);
      if (Q.at >= endOf(Q.i)) toEnd(now);
      break;
    case 'frozen':
      // The words start once the field's gone dark; once they've been read, the call.
      if (!Q.talked && t >= HUSH) {
        Q.talked = true;
        s.talk = conversation(COCAPTAIN_NAME, FREEZE_LINES, now, { person: { name: COCAPTAIN_NAME, look: COCAPTAIN_LOOK }, tag: C.red0 });
      } else if (Q.talked && !s.talk) go('call', now);
      break;
    case 'endgame':
      Q.at = Math.min(LENGTH, Q.at + dt * ENDGAME);
      follow(cameraOn(Q.roll.match, Q.at, endgameFocus(Q.at)), dt);
      if (Q.at >= LENGTH && (Q.doneAt ??= now) && now - Q.doneAt >= TAIL) go('buzzer', now);
      break;
    case 'rewind':
      if (t >= REWIND) {
        Q.rewoundAt = now;
        Q.roll = null;
        Q.camX = Q.freezeCam;
        go('call', now);
      }
      break;
    default:
  }
  // The stick, at the call: one card a push; held, again every REPEAT seconds.
  const st = s.stick(), d = st.mag < DEAD ? 0 : Math.sign(Math.abs(st.x) >= Math.abs(st.y) ? st.x : st.y);
  if (d && (d !== Q.held || now - Q.heldAt > REPEAT)) {
    Q.heldAt = now;
    if (Q.phase === 'call') Q.choice = clamp(Q.choice + d, 0, CALLS.length - 1);
  }
  Q.held = d;
}
/** The match shown has reached where it stops: its result, or match 3's freeze. */
function toEnd(now) {
  Q.at = endOf(Q.i);
  if (Q.i === 2) {
    Q.freezeCam = Q.camX;
    go('frozen', now);
  } else go('over', now);
}

/** A, when nothing else (the dialog box) has it. */
export function pressQuarter(s, now = nowS()) {
  if (!Q.phase) start(now);
  const t = now - Q.t0;
  switch (Q.phase) {
    case 'card':
      if (t > 0.5) toMatch(0, now);
      break;
    case 'match':
      // Skip to the end of what's shown: match 3 to the freeze.
      if (t > 0.6) {
        Q.camX = cameraOn(matchOf(Q.i), endOf(Q.i));
        toEnd(now);
      }
      break;
    case 'over':
      if (t > 0.5) toMatch(Q.i + 1, now);
      break;
    case 'frozen':
      if (!Q.talked) Q.t0 = now - HUSH;
      break;
    case 'call':
      if (t < GUARD) break;
      call(now);
      break;
    case 'endgame': {
      // On to the next climb's outcome, then to the buzzer.
      const when = endgameTimes(Q.roll);
      Q.at = Q.at < when.ours ? when.ours : Q.at < when.theirs ? when.theirs : LENGTH;
      break;
    }
    case 'buzzer':
      if (t > 0.8) go('result', now);
      break;
    case 'result':
      if (t > 0.8) go(good() ? 'end' : 'rewind', now);
      break;
    default:
  }
}
function toMatch(i, now) {
  Object.assign(Q, { i, at: 0, wins: winsBefore(i) });
  Q.camX = cameraOn(matchOf(i), 0);
  go('match', now);
}
/** She calls it: the dice are rolled now, honestly, and match 3 plays out that way from the freeze. */
function call(now) {
  Q.roll = rollEndgame(CALLS[Q.choice].key);
  Q.at = FREEZE;
  Q.doneAt = null;
  go('endgame', now);
}

/** A finger: true from 'down' if this takes it; false leaves it to the stage (a tap is A). */
export function pointQuarter(type, x, y, s, now = nowS()) {
  if (!Q.phase) start(now);
  if (s.talk || Q.phase !== 'call') return false;
  const over = CALLS.findIndex((_, i) => inRect(callRect(i), x, y));
  if (type === 'down') {
    Q.pressed = over;
    if (over >= 0) Q.choice = over;
    return over >= 0;
  }
  if (type === 'move') {
    if (Q.pressed >= 0 || over >= 0) Q.pressed = over;
    if (over >= 0) Q.choice = over;
  } else if (type === 'up') {
    const was = Q.pressed;
    Q.pressed = -1;
    if (was >= 0 && over === was && now - Q.t0 >= GUARD) call(now);
  } else Q.pressed = -1;
  return true;
}

// ---- The phone ----
export function quarterLabel() {
  switch (Q.phase) {
    case 'card': return 'MATCH 1';
    case 'match': return 'SKIP';
    case 'over': return `MATCH ${Q.i + 2}`;
    case 'call': return `CALL ${CALLS[Q.choice].name}`;
    case 'endgame': return 'SKIP';
    case 'buzzer': return 'BET LOG';
    case 'result': return good() ? 'CONTINUE' : 'REWIND';
    case 'end': return undefined;
    default: return 'NEXT';
  }
}
export function quarterStatus() {
  const m = MATCHES[Q.i];
  switch (Q.phase) {
    case 'card': return 'QUARTERFINAL';
    case 'match': return m.late && Q.at >= m.lateAt ? `QF: ${CLIMBER} IS DEAD` : `QF MATCH ${Q.i + 1}`;
    case 'over': return m.red > m.blue ? 'QF: RED WINS' : 'QF: BLUE WINS';
    case 'frozen': return 'QF: 0:20 LEFT';
    case 'call': return 'QF: YOUR CALL';
    case 'endgame': {
      const when = endgameTimes(Q.roll);
      if (Q.at < when.ours) return `QF: ${CLIMBER} CLIMBS`;
      if (Q.at < when.ours + OUTCOME) return `QF: ${CLIMBER} ${Q.roll.made ? 'MADE IT' : 'MISSED'}`;
      if (Q.at < when.theirs) return `QF: ${THEIR_CLIMBER} CLIMBS`;
      return `QF: ${THEIR_CLIMBER} ${Q.roll.theirsMade ? 'MADE IT' : 'MISSED'}`;
    }
    case 'buzzer': return Q.roll.won ? 'QF: WE WIN THE SERIES' : 'QF: KNOCKED OUT';
    case 'result': return 'BET LOG';
    case 'rewind': return 'REWINDING';
    case 'end': return 'TO BE CONTINUED';
    default: return undefined;
  }
}

// ---- The screen ----
export function drawQuarter(g, now = nowS()) {
  if (!Q.phase) start(now);
  // The frame's time can be a moment before a phase that began during it.
  const t = Math.max(0, now - Q.t0);
  const since = Q.rewoundAt == null ? Infinity : now - Q.rewoundAt;
  const camX = Math.round(Q.camX);
  switch (Q.phase) {
    case 'card':
      drawSeriesCard(t);
      break;
    case 'match':
      drawMatch(g, Q.i, Q.at, t, { wins: Q.wins, camX });
      break;
    case 'over':
      drawMatchOver(g, Q.i, t, winsAfter(Q.i), camX);
      break;
    case 'frozen':
      drawFrozen(g, t, { talking: Q.talked, camX });
      break;
    case 'call':
      drawCall(g, {
        t, choice: Q.choice, pressed: Q.pressed, camX,
        thought: since < THOUGHT ? "...DIDN'T THIS JUST HAPPEN?" : null, glow: clamp(1 - since / 0.8, 0, 1),
      });
      break;
    case 'endgame':
      drawEndgame(g, Q.roll, Q.at, camX);
      break;
    case 'buzzer': {
      const wins = { red: 1 + (Q.roll.won ? 1 : 0), blue: 1 + (Q.roll.won ? 0 : 1) };
      drawBuzzer(g, t, { roll: Q.roll, wins, camX });
      break;
    }
    case 'result':
      drawResult3(Q.roll.key, Q.roll.won, t, { glow: !good() && t > 2.6 ? 0.35 + 0.35 * Math.sin(t * 5) : 0 });
      break;
    case 'rewind': {
      const k = clamp(t / REWIND, 0, 1);
      drawFrozen(g, 1, { talking: true, glow: Math.min(1, 0.4 + k), camX: Math.round(Q.freezeCam) });
      drawRewind(k, t);
      break;
    }
    case 'end':
      drawEnd3(t);
      break;
    default:
  }
}
