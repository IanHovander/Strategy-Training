// The quarterfinal: what follows the picks (docs/blue-banner-design.md, section 5, beat 2). Alliance 4 against
// alliance 5, best 2 of 3, played quickly up to one frozen moment: match 3, 20 seconds left, red up by 7, and 6834 has
// to climb. Level 2 is certain and wins every time; Level 3 is worth more and wins 7 times in 10. series.js has the
// numbers, match.js draws it, verdict.js has the bet log.
//
// What happens, phase by phase:
//   card      QUARTERFINAL, best 2 of 3: the two alliances side by side. A plays match 1.
//   match     a match, quickly: the field, the camera running along it, the score climbing on the scoreboard, a line
//             about what's happening. MATCHES[i]'s length; A skips to the end of it. Match 3 stops at 0:20 (frozen).
//   over      its result: RED WINS 88-74 or BLUE WINS, the series pips. A plays the next.
//   frozen    match 3 at 0:20: a flash, the field going dark, time stopped. Then Riley and 6834's driver in the dialog
//             box (the stage's own, s.talk): 6834 wants Level 3. A reads on.
//   call      the call: LEVEL 2 or LEVEL 3, two cards over the frozen field, with how often 6834 makes each, what blue's
//             climber will try, and the crowd chanting for Level 3. The stick chooses, A calls; or a tap on a card
//             (pressed in under the finger, acting when it lets go on it). There's no clock: time's stopped.
//   ours      6834's climb, close up. The dice are rolled as she calls (series.js rollEndgame): honest.
//   theirs    6417's climb on blue's HAB, close up.
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
//   updateQuarter(dt, s)              every frame: the stick, the phases' clocks, the dialog
//   pressQuarter(s)                   A, when no words are up
//   pointQuarter(type, x, y, s)       a finger on the screen
//   drawQuarter(g, now)               the whole screen
//   quarterLabel(), quarterStatus()   what A does and the phone's status line (the sound's cues key off the status)

import { C, clamp } from '../pixel.js';
import { conversation } from '../talk.js';
import { HERO_NAME } from '../cast.js';
import { COCAPTAIN_LOOK, COCAPTAIN_NAME } from './cocaptain.js';
import { drawRewind, inRect } from './tablet.js';
import { drawResult3, drawEnd3 } from './verdict.js';
import {
  drawSeriesCard, drawMatch, drawMatchOver, drawFrozen, drawCall, callRect, drawClimb, climbTime, verdictAt, drawBuzzer,
} from './match.js';
import { MATCHES, CALLS, RIGHT3, LEFT, LEAD, CLIMBER, THEIR_CLIMBER, THEIRS, rollEndgame } from './series.js';

/** Seconds: each match as shown (match 3 up to the freeze); the freeze before the words; a climb's pause after. */
const MATCH = [5.5, 5.5, 4.5], FREEZE = 0.9, AFTER = 0.9;
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
    Object.assign(Q, { i: 2, wins: { red: 1, blue: 1 }, talked: true });
    go('call', now);
  } else go('card', now);
}
/** The series before match i is played (each match's winner from series.js). */
const winsBefore = (i) => MATCHES.slice(0, i).reduce((w, m) => (m.red > m.blue ? { ...w, red: w.red + 1 } : { ...w, blue: w.blue + 1 }), { red: 0, blue: 0 });
const winsAfter = (i) => winsBefore(i + 1);

// ---- Every frame ----
export function updateQuarter(dt, s, now = nowS()) {
  if (!Q.phase) start(now);
  const t = now - Q.t0;
  switch (Q.phase) {
    case 'match':
      if (t >= MATCH[Q.i]) go(Q.i === 2 ? 'frozen' : 'over', now);
      break;
    case 'frozen':
      // The words start once the field's gone dark; once they've been read, the call.
      if (!Q.talked && t >= FREEZE) {
        Q.talked = true;
        s.talk = conversation(COCAPTAIN_NAME, FREEZE_LINES, now, { person: { name: COCAPTAIN_NAME, look: COCAPTAIN_LOOK }, tag: C.red0 });
      } else if (Q.talked && !s.talk) go('call', now);
      break;
    case 'ours':
      if (t >= climbTime(Q.roll.made) + AFTER) go('theirs', now);
      break;
    case 'theirs':
      if (t >= climbTime(Q.roll.theirsMade) + AFTER) go('buzzer', now);
      break;
    case 'rewind':
      if (t >= REWIND) {
        Q.rewoundAt = now;
        Q.roll = null;
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
      if (t > 0.6) go(Q.i === 2 ? 'frozen' : 'over', now);
      break;
    case 'over':
      if (t > 0.5) toMatch(Q.i + 1, now);
      break;
    case 'frozen':
      if (!Q.talked) Q.t0 = now - FREEZE;
      break;
    case 'call':
      if (t < GUARD) break;
      call(now);
      break;
    case 'ours':
      // On past the climb, but not before it's shown whether it worked.
      if (t > verdictAt(Q.roll.made)) go('theirs', now);
      break;
    case 'theirs':
      if (t > verdictAt(Q.roll.theirsMade)) go('buzzer', now);
      break;
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
  Q.i = i;
  Q.wins = winsBefore(i);
  go('match', now);
}
/** She calls it: the dice are rolled now, honestly. */
function call(now) {
  Q.roll = rollEndgame(CALLS[Q.choice].key);
  go('ours', now);
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
    case 'buzzer': return 'BET LOG';
    case 'result': return good() ? 'CONTINUE' : 'REWIND';
    case 'end': return undefined;
    default: return 'NEXT';
  }
}
export function quarterStatus(now = nowS()) {
  const t = now - Q.t0, m = MATCHES[Q.i];
  switch (Q.phase) {
    case 'card': return 'QUARTERFINAL';
    case 'match': return `QF MATCH ${Q.i + 1}`;
    case 'over': return m.red > m.blue ? 'QF: RED WINS' : 'QF: BLUE WINS';
    case 'frozen': return 'QF: 0:20 LEFT';
    case 'call': return 'QF: YOUR CALL';
    case 'ours': return t < verdictAt(Q.roll.made) ? `QF: ${CLIMBER} CLIMBS` : `QF: ${CLIMBER} ${Q.roll.made ? 'MADE IT' : 'MISSED'}`;
    case 'theirs': return t < verdictAt(Q.roll.theirsMade) ? `QF: ${THEIR_CLIMBER} CLIMBS` : `QF: ${THEIR_CLIMBER} ${Q.roll.theirsMade ? 'MADE IT' : 'MISSED'}`;
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
  switch (Q.phase) {
    case 'card':
      drawSeriesCard(t);
      break;
    case 'match':
      drawMatch(g, Q.i, t / MATCH[Q.i], t, { wins: Q.wins });
      break;
    case 'over':
      drawMatchOver(g, Q.i, t, winsAfter(Q.i));
      break;
    case 'frozen':
      drawFrozen(g, t, { wins: Q.wins, talking: Q.talked });
      break;
    case 'call':
      drawCall(g, {
        t, choice: Q.choice, pressed: Q.pressed, wins: Q.wins,
        thought: since < THOUGHT ? "...DIDN'T THIS JUST HAPPEN?" : null, glow: clamp(1 - since / 0.8, 0, 1),
      });
      break;
    case 'ours': {
      const c = CALLS.find((k) => k.key === Q.roll.key), done = t >= verdictAt(Q.roll.made);
      const red = MATCHES[2].red + (done ? (Q.roll.made ? c.pts : c.fail) : 0);
      drawClimb(g, 'ours', Q.roll.key, Q.roll.made, t, { score: [MATCHES[2].blue, red], clock: LEFT - t * 2.2 });
      break;
    }
    case 'theirs': {
      const blue = MATCHES[2].blue + (t >= verdictAt(Q.roll.theirsMade) ? (Q.roll.theirsMade ? THEIRS.pts : THEIRS.fail) : 0);
      drawClimb(g, 'theirs', 'l3', Q.roll.theirsMade, t, { score: [blue, Q.roll.red], clock: Math.max(0, LEFT - 10 - t * 2.4) });
      break;
    }
    case 'buzzer': {
      const wins = { red: 1 + (Q.roll.won ? 1 : 0), blue: 1 + (Q.roll.won ? 0 : 1) };
      drawBuzzer(g, t, { red: Q.roll.red, blue: Q.roll.blue, won: Q.roll.won, wins });
      break;
    }
    case 'result':
      drawResult3(Q.roll.key, Q.roll.won, t, { glow: !good() && t > 2.6 ? 0.35 + 0.35 * Math.sin(t * 5) : 0 });
      break;
    case 'rewind': {
      const k = clamp(t / REWIND, 0, 1);
      drawFrozen(g, 1, { wins: Q.wins, talking: true, glow: Math.min(1, 0.4 + k) });
      drawRewind(k, t);
      break;
    }
    case 'end':
      drawEnd3(t);
      break;
    default:
  }
}

