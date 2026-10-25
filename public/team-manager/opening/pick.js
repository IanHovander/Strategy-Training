// The pick: where the opening hands the player the decision (docs/blue-banner-design.md, section 5, beat 1). Seed 4 is
// on the clock: 45 seconds, big and red at the top, running since Robin called her up in the cut scene (callUp).
// After a rewind it starts again from 0:45. Under it is the scouting tablet (tablet.js): her robot pinned for
// reference, and two teams to pick from (teams.js). 7461 shows the biggest average on the screen, 38, but it's
// fading: 44 a match for its first six, 29 for its last four (Friday's last and Saturday's three). 6834 shows 35, but
// it's rising: 27 for its first six, a rebuilt intake, 48 for its last four, about a tenth better than 7461 at its
// best. 6834 is the right pick.
//
// What happens, phase by phase:
//   browse    the clock runs. The stick (or the arrow keys) moves between the cards; A picks the one the cursor's on.
//             At 0:00 the clock says TIME! and Robin waits: the pick is still hers.
//   confirm   "5026 RESPECTFULLY INVITES TEAM 6834", INVITE or BACK (the stick chooses, A presses). The clock runs on.
//   accept    "6834 ACCEPTS!". On by itself after a moment, or on A.
//   result    the bet log's stamp, GOOD CALL or BAD CALL, and the reveal: the last four boxes light up, red for
//             7461 (FIRST 6 44 · LAST 4 29), green for 6834, and the one line to remember. A wrong pick: A rewinds.
//             The right one: A carries on.
//   rewind    the tape runs back to 0:45, Norbert's 26 ear glowing in the corner. Then browse again, and her thought:
//             "...DIDN'T THIS JUST HAPPEN?"
//   end       TO BE CONTINUED: the quarterfinals aren't built yet.
//
// Taps and drags on the screen (pointPick, the scene's pointer()): everything on the tablet that looks pressable is.
//   browse    a tap on a card picks it: the cursor goes to it and the invite comes up, as A on it would. One tap, not a
//             tap to choose and another to pick: the invite is already the step that asks "are you sure?" (and backs
//             out with BACK), so a second tap would only be a second confirmation of the same thing. Or pick a card up
//             and drag it: it lifts off the tablet and follows the finger, leaving a dotted gap; held over her robot's
//             row, the row lights up, and let go there, that team's invite comes up. Let go anywhere else and it
//             settles back into its gap (the cursor stays on it). The hint line's ◀ and ▶ move the cursor; its
//             "A: PICK" picks.
//   confirm   INVITE and BACK are buttons: pressed in under the finger, they act when it lets go on them (slide off to
//             change your mind; slide onto the other to choose it). A tap anywhere else does nothing: the choice is
//             on the buttons.
//   accept, result, rewind, end
//             a tap is A (stage.js does that for a tap the scene doesn't take).
// Off the picture (the bars beside it) a tap is A, as stage.js has it everywhere.
//
// scene.js wires it to the stage: callUp() as Robin calls her, startPick() when the cut scene ends, updatePick() every
// frame (the stick), pressPick() on A, pointPick() for taps and drags, drawPickScreen() to draw, pickLabel() and
// pickStatus() for the phone, pickClock() for the sound's ticks.
//
//   drawPick(t, left)   the tablet as the pick begins, for the cut scene's last beat: t seconds since it came up (for the
//                       clock's slam), left the seconds on the clock
//   callClock(since)    the seconds on the clock in the cut scene, since the call (since: the cut scene's own count of
//                       the seconds since it, used when the call wasn't heard, as with ?at=)
//   PICK_CLOCK          45

import { clamp } from '../pixel.js';
import { TEAMS, RIGHT } from './teams.js';
import { W, H } from '../pixel.js';
import {
  PICK_CLOCK, drawTablet, drawConfirm, drawAccept, drawResult, drawRewind, drawContinued,
  cardRect, PINNED, buttonRect, hintRects, inRect,
} from './tablet.js';

export { PICK_CLOCK };

/** Seconds: A ignored this long after the invite comes up (a double tap isn't a choice); accept's moment; the rewind. */
const GUARD = 0.25, ACCEPT = 1.8, REWIND = 1.6, THOUGHT = 3.5;
/** The stick: how far it has to go to count, and how soon holding it moves again. */
const DEAD = 0.35, REPEAT = 0.45;
/** A finger: how far (pixels) it moves before a press on a card is a drag, and seconds a dropped card takes to settle. */
const SLOP = 3, SETTLE = 0.18;

const P = {
  phase: 'browse', t0: 0, clock0: null, left: PICK_CLOCK, on: 0, choice: 0, picked: null,
  rewinds: 0, rewoundAt: null, held: 0, heldAt: 0, slam: 1,
  // A finger on the screen: a card picked up (drag), a card settling back after a drop elsewhere (settle), the
  // invite's button held down (pressed: 0 INVITE, 1 BACK, -1 none).
  drag: null, settle: null, pressed: -1,
};
const nowS = () => performance.now() / 1000;
const leftAt = (now) => PICK_CLOCK - (now - P.clock0);
/** When Robin called her up (performance.now() seconds), which starts the clock; null before the call. */
let calledAt = null;

/** Robin calls her up: the clock starts. null: the cut scene is back before the call (Replay, or a new run). */
export function callUp(now = nowS()) {
  calledAt = now;
}
/** The seconds on the clock in the cut scene: from the call, or `since` seconds since it if it wasn't heard (?at=). */
export function callClock(since, now = nowS()) {
  return PICK_CLOCK - (calledAt != null ? now - calledAt : since);
}
/** The seconds left while the clock runs (from the call to the pick, 0 once time's up), or null when it isn't running. */
export function pickClock(cut, now = nowS()) {
  if (cut) return calledAt == null ? null : callClock(0, now);
  return P.clock0 != null && (P.phase === 'browse' || P.phase === 'confirm') ? Math.max(0, leftAt(now)) : null;
}
const good = () => P.picked?.num === RIGHT;
/** Whether the first pick's done and carried on from (the right pick, past its bet log): the second pick's turn. */
export const pickOver = () => P.phase === 'end';
function go(phase, now) {
  P.phase = phase;
  P.t0 = now;
  // A finger still down from before lets go of whatever it held.
  Object.assign(P, { drag: null, settle: null, pressed: -1 });
}

/**
 * From the top: the clock running from the call (0:45 from now if it hasn't been made), the cursor on the first card.
 * slam: the clock slams in at 0:45 (after a rewind); the first time, the cut scene's last beat has already slammed it in.
 */
export function startPick(now = nowS(), { slam = false } = {}) {
  const clock0 = slam ? now : calledAt ?? now;
  Object.assign(P, { clock0, on: 0, choice: 0, picked: null, held: 0, slam: slam ? 0 : 1, drag: null, settle: null, pressed: -1 });
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
    if (P.phase === 'browse' && !P.drag) P.on = clamp(P.on + d, 0, TEAMS.length - 1);
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

/**
 * A finger on the screen (stage.js's pointer: 'down', then 'move', 'up' or 'cancel'), at (x, y) in screen pixels. True
 * from 'down' if the pick takes it; false leaves it to stage.js, which makes a tap A.
 */
export function pointPick(type, x, y, now = nowS()) {
  if (P.clock0 == null) startPick(now);
  const onScreen = x >= 0 && x < W && y >= 0 && y < H;
  if (type === 'down') {
    P.drag = null;
    P.pressed = -1;
    if (!onScreen) return false;
    if (P.phase === 'browse') return downBrowse(x, y, now);
    if (P.phase === 'confirm') {
      P.pressed = [0, 1].find((i) => inRect(buttonRect(i), x, y)) ?? -1;
      if (P.pressed >= 0) P.choice = P.pressed;
      return true;
    }
    return false;
  }
  if (P.phase === 'confirm' && type !== 'cancel') {
    // Held on a button: sliding onto the other one chooses it, off both lets go of it; letting go on one presses it.
    const over = [0, 1].find((i) => inRect(buttonRect(i), x, y)) ?? -1;
    if (type === 'move') {
      if (P.pressed >= 0 || over >= 0) P.pressed = over;
      if (over >= 0) P.choice = over;
    } else if (type === 'up') {
      const was = P.pressed;
      P.pressed = -1;
      if (was >= 0 && over === was) pressPick(now);
    }
    return true;
  }
  const d = P.drag;
  if (!d) {
    P.pressed = -1;
    return true;
  }
  if (type === 'move') {
    if (!d.moved && Math.hypot(x - d.sx, y - d.sy) > SLOP) d.moved = true;
    if (d.moved) {
      // The card goes where the finger takes it, held where it was picked up, and never wholly off the screen.
      d.x = clamp(x - d.gx, 8 - CARD_W(), W - 8);
      d.y = clamp(y - d.gy, 2 - CARD_H(), H - 8);
      d.over = inRect(PINNED, x, y) || d.y <= PINNED.y + 10;
    }
    return true;
  }
  P.drag = null;
  if (P.phase !== 'browse') return true; // A picked while the finger was down
  if (type === 'up' && (!d.moved || d.over)) {
    // A tap on a card, or a card let go on her robot: that team's invite.
    P.on = d.i;
    pressPick(now);
  } else if (d.moved) P.settle = { i: d.i, x: d.x, y: d.y, t0: now };
  return true;
}
const CARD_W = () => cardRect(0).w, CARD_H = () => cardRect(0).h;
/** A finger down on the tablet: on a card (to pick it, or pick it up), on the hint line's ◀ ▶ or A: PICK, or nothing. */
function downBrowse(x, y, now) {
  P.settle = null;
  const i = TEAMS.findIndex((_, k) => inRect(cardRect(k, k === P.on), x, y));
  if (i >= 0) {
    const r = cardRect(i);
    P.on = i;
    P.drag = { i, sx: x, sy: y, gx: x - r.x, gy: y - r.y, x: r.x, y: r.y, moved: false, over: false };
    return true;
  }
  // The hint line, while it's showing (not while her thought has its place after a rewind).
  if (!thoughtNow(now)) {
    const h = hintRects(['CHOOSE', 'PICK']);
    if (inRect(h.left, x, y)) P.on = clamp(P.on - 1, 0, TEAMS.length - 1);
    else if (inRect(h.right, x, y)) P.on = clamp(P.on + 1, 0, TEAMS.length - 1);
    else if (inRect(h.act, x, y)) pressPick(now);
  }
  return true;
}
/** Her thought after a rewind, while it has the hint line's place. */
function thoughtNow(now) {
  const since = P.rewoundAt == null ? Infinity : now - P.rewoundAt;
  return since < THOUGHT ? '...DIDN\'T THIS JUST HAPPEN?' : null;
}
/** What's being dragged, or settling back, for drawTablet. */
function dragNow(now) {
  if (P.drag?.moved) return { i: P.drag.i, x: P.drag.x, y: P.drag.y, over: P.drag.over, k: 1 };
  const st = P.settle;
  if (!st) return null;
  const k = 1 - clamp((now - st.t0) / SETTLE, 0, 1);
  if (k <= 0) {
    P.settle = null;
    return null;
  }
  return { i: st.i, x: st.x, y: st.y, over: false, k: k * k };
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
  const thought = thoughtNow(now);
  const afterglow = clamp(1 - since / 0.8, 0, 1);
  switch (P.phase) {
    case 'browse':
      drawTablet({ t: sinceClock, left: leftAt(now), on: P.on, thought, glow: afterglow, drag: dragNow(now) });
      break;
    case 'confirm':
      drawTablet({ t: sinceClock, left: leftAt(now), on: P.on, hint: ['CHOOSE', P.choice ? 'BACK' : 'INVITE'] });
      drawConfirm(TEAMS[P.on], P.choice, t, P.pressed);
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
