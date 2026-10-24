// The second pick: what follows the first (docs/blue-banner-design.md, section 5, beat 1b). 6834 has said yes; alliance
// selection goes on, and the second robot is hers to pick when it comes back up the line. The goal is plain from the
// start and stays on screen: beat alliance 5 in the quarterfinal, best 2 of 3. Everything to get it right is on the
// dashboard (board.js): alliance 5 builds a cargo machine round the event's top scorer, 7777 (46), and when her turn
// comes, of the three teams left, the one with the smallest average, 4471 (14), is the one whose data says it held
// 7777 to 22 in Q23. 2202, the biggest average left (27), is the trap. teams2.js has the numbers and why.
//
// What happens, phase by phase:
//   brief     she looks at the data: the dashboard, alliances 1 to 4 with their first picks (6834 just in), and the goal
//             card sliding in big (goals.js). Riley sets the goal in the dialog box (the stage's own, s.talk): the
//             quarterfinal is alliance 4 against alliance 5, best 2 of 3, and alliance 5 has 7777. A reads on.
//   fold      the card slides away up into the header, where it stays as a pill: GOAL: SECOND PICK TO BEAT ALLIANCE 5.
//   wait      alliance selection goes on without her: round 1's last four picks (alliances 5 to 8), then round 2 back up
//             (8 to 5), one every GAP seconds, about 33 seconds in all. Each is Robin's call on the PA line, the pick
//             going into its alliance's row, and its tile on her list stamped TAKEN BY ALLIANCE n, dropping away and the
//             rest closing up. She can browse her list the whole time (the stick, or taps on the tiles), but A can't
//             invite anyone: it isn't her turn ("NOT YOUR TURN YET"). And it can't hurry the picks: this is the time
//             she has to study the board, the picks are other teams' (the event's pace, not hers), and they're the
//             clue: watching alliance 5 take a second cargo robot is the point. The wait only happens once; a rewind
//             comes back to her turn.
//   turn      Robin calls her: the 45-second clock slams in, as at the first pick. Three teams left. The stick moves
//             between them, A picks the one the cursor's on; at 0:00 the clock says TIME! and the pick's still hers.
//   confirm   tablet.js's INVITE or BACK, as at the first pick.
//   accept    "4471 ACCEPTS!" (tablet.js drawAccept). On by itself, or on A.
//   result    the bet log for PICK 2 (verdict.js): GOOD CALL or BAD CALL, the matchup as two bars, the line to remember.
//             A wrong pick: Norbert's ear glows, and A rewinds. The right one: A carries on.
//   rewind    the tape runs back to her turn at 0:45, not to the start: the picks before hers were never the problem.
//             Then turn again, and her thought: "...DIDN'T THIS JUST HAPPEN?"
//   end       the goal card, the second line ticked, and TO BE CONTINUED: THE QUARTERFINAL.
// The goal card can be opened again from the pill any time in wait and turn (a tap on it); A, or a tap anywhere,
// closes it. The clock doesn't stop for it.
//
// Taps (pointSecond, the scene's pointer()), as at the first pick everything that looks pressable is:
//   wait, turn   a tile: the cursor goes to it (on her turn, a tap on the tile the cursor's already on picks it); the
//                card, on her turn: picks it; the goal pill: opens the card; the hint line's ◀ ▶ and A: PICK.
//   confirm      INVITE and BACK, pressed in under the finger, acting when it lets go on them.
//   anything else (the brief's words, accept, the bet log, the end): a tap is A.
// Cards aren't dragged here as at the first pick: the tiles are small, and a tap does it.
//
// scene.js hands over to this once the first pick is done (pick.js pickOver()), or from the start with ?pick2 in the
// address (?pick2=turn: straight to her turn, for testing).
//
//   resetSecond()                     from the top next time it's needed (the cut scene's ended again)
//   updateSecond(dt, s)               every frame: the stick, the phases' clocks, the dialog
//   pressSecond(s)                    A, when no words are up
//   pointSecond(type, x, y, s)        a finger on the screen
//   drawSecond(now)                   the whole screen
//   secondLabel(), secondStatus()     what A does and the phone's status line (the sound's cues key off the status)
//   secondClock()                     the seconds left on her clock while it runs, for the ticks

import { W, H, C, clamp, lerp, seg, easeOut, easeIn, withAlpha, fill, screen } from '../pixel.js';
import { conversation } from '../talk.js';
import { HERO_NAME } from '../cast.js';
import { COCAPTAIN_LOOK, COCAPTAIN_NAME } from './cocaptain.js';
import { PICK_CLOCK, drawConfirm, drawAccept, drawRewind, buttonRect, inRect, blinkPrompt } from './tablet.js';
import { drawDashboard, tileRect, CARD2, GOAL_AT, hintRects2 } from './board.js';
import { drawGoalCard, goalLineRect, GOAL_W } from './goals.js';
import { drawResult2, drawEnd } from './verdict.js';
import { SEEDS, FIRST, POOL, ORDER, OTHERS, STAR, US, OPPONENT, RIGHT2, teamOf, statusOf } from './teams2.js';

/** Seconds: the first call after the wait begins, then one every GAP; when a call's pick goes on the board (and its
 * tile's stamped), when the tile starts to fall and how long it takes, how long the rest take to close up. */
const LEAD = 1.2, GAP = 4, LANDS = 1, FALLS = 2.2, FALL = 0.4, CLOSE = 0.3;
/** Her turn comes this long after the last call. */
const LAST = LEAD + (ORDER.length - 1) * GAP, TURN_AT = LAST + FALLS + FALL + 0.8;
/** As at the first pick: A ignored just after the invite comes up; accept's moment; the rewind; her thought. */
const GUARD = 0.25, ACCEPT = 1.8, REWIND = 1.6, THOUGHT = 3.5, TOAST = 1.6;
/** The stick: how far it has to go to count, and how soon holding it moves again. */
const DEAD = 0.35, REPEAT = 0.45;
/** The brief: when the card's in, when Riley starts; the fold's length. */
const TALK_AT = 0.9, FOLD = 0.45;
/** Where the card sits while it's up. */
const CARD_AT = { x: Math.round((W - GOAL_W) / 2), y: 22 };

const SAY = (lines) => ({ name: COCAPTAIN_NAME, lines, tag: C.red0 });
const HER = (lines) => ({ name: HERO_NAME, lines, tag: C.red1 });
/** Riley sets the goal: short, the way it's said on the floor. Two lines of at most 38 a page. */
export const BRIEF_LINES = [
  SAY(["6834'S IN. NICE CALL.", 'NOW WE NEED ONE MORE ROBOT.']),
  SAY([`QUARTERFINAL IS US VS ALLIANCE ${OPPONENT}.`, "BEST 2 OF 3. WIN TWO AND WE'RE THROUGH."]),
  SAY([`AND THEY'VE GOT ${STAR}. TOP SCORER HERE.`, "THEY'LL PICK BEFORE WE DO. WATCH THEM."]),
  HER([`THEN WE PICK TO BEAT ALLIANCE ${OPPONENT}.`, "NOT JUST THE BIGGEST NUMBER LEFT."]),
];

const S = {
  phase: null, t0: 0, wait0: 0, clock0: 0, left: PICK_CLOCK, on: POOL[0].num, onIdx: 0, choice: 0,
  picked: null, held: 0, heldAt: 0, open: false, openAt: -9, talked: false, rewoundAt: null, toastAt: -9, pressed: -1,
};
const nowS = () => performance.now() / 1000;
function go(phase, now) {
  S.phase = phase;
  S.t0 = now;
  S.pressed = -1;
}
const good = () => S.picked?.num === RIGHT2;

/** From the top, the next time it's needed. */
export function resetSecond() {
  S.phase = null;
}
function start(now) {
  const jump = new URLSearchParams(location.search).get('pick2');
  Object.assign(S, { on: POOL[0].num, onIdx: 0, picked: null, open: false, talked: false, rewoundAt: null, toastAt: -9 });
  if (jump === 'turn') {
    S.wait0 = now - TURN_AT;
    toTurn(now);
  } else go('brief', now);
}
/** Her turn: the clock slams in at 0:45, the cursor on the first team left if its own has gone. */
function toTurn(now) {
  S.clock0 = now;
  S.open = false;
  S.choice = 0;
  const left = listAt(Infinity);
  if (!left.some((t) => t.num === S.on)) S.on = left[0].num;
  go('turn', now);
}

// ---- The picks, as a function of the seconds since the wait began (tw) ----
const callAt = (k) => LEAD + k * GAP;
const goneAt = (k) => callAt(k) + FALLS + FALL;
const pickOf = (num) => ORDER.findIndex((p) => p.num === num);
/** Her list at tw: everyone not yet gone. */
const listAt = (tw) => POOL.filter((t) => {
  const k = pickOf(t.num);
  return k < 0 || tw < goneAt(k);
});
/** The seconds into the wait, for drawing: before it, nothing's happened; after it, everything has. */
function twNow(now) {
  if (S.phase === 'brief' || S.phase === 'fold') return -Infinity;
  if (S.phase === 'wait') return now - S.wait0;
  return Infinity;
}

/** The tiles at tw, each where it is as the list closes up after the latest drop. */
function tilesAt(tw) {
  const list = listAt(tw);
  const gones = ORDER.map((_, k) => goneAt(k)).filter((g) => g <= tw);
  const last = gones.length ? Math.max(...gones) : -Infinity;
  const before = Number.isFinite(last) ? listAt(last - 1e-6) : list;
  const k = Number.isFinite(last) ? easeOut(seg(tw, last, last + CLOSE)) : 1;
  return list.map((team, j) => {
    const a = tileRect(Math.max(0, before.indexOf(team))), b = tileRect(j);
    const p = pickOf(team.num), landed = p >= 0 ? tw - (callAt(p) + LANDS) : -1;
    return {
      team, x: Math.round(lerp(a.x, b.x, k)), y: Math.round(lerp(a.y, b.y, k)), on: team.num === S.on,
      taken: p >= 0 && landed >= 0 ? { alliance: ORDER[p].alliance, t: landed } : null,
      fall: p >= 0 ? seg(tw, callAt(p) + FALLS, goneAt(p)) : 0,
    };
  });
}

/** The board at tw: rows, who's picking, what's just gone in, alliance 5 as known. */
function boardAt(tw, now) {
  const rows = SEEDS.map((c, i) => [c, FIRST[i], '']);
  const fresh = {};
  ORDER.forEach((p, k) => {
    const t = tw - (callAt(k) + LANDS);
    if (t < 0) return;
    rows[p.alliance - 1][p.round] = p.num;
    fresh[`${p.alliance}-${p.round}`] = t;
  });
  if (S.phase === 'brief' || S.phase === 'fold') fresh[`${US}-1`] = S.phase === 'brief' ? now - S.t0 : 9;
  const next = ORDER.findIndex((_, k) => tw < callAt(k) + LANDS);
  let picking = next >= 0 ? { alliance: ORDER[next].alliance, slot: ORDER[next].round } : { alliance: US, slot: 2 };
  if (S.picked && ['accept', 'result'].includes(S.phase)) {
    rows[US - 1][2] = S.picked.num;
    fresh[`${US}-2`] = now - S.t0;
    picking = null;
  }
  const oppo = rows[OPPONENT - 1].map((num) => (num ? (num === STAR ? OTHERS[STAR] : teamOf(num)) : null));
  return { rows, fresh, picking, oppo, next };
}

/** Robin's last call on the PA line, and how long ago it started. */
function paAt(tw, now) {
  if (S.phase === 'accept' || S.phase === 'result') return { text: `ROBIN: ALLIANCE ${US} PICKS ${S.picked.num}!`, since: now - S.t0 };
  if (tw === Infinity) {
    const since = now - S.clock0;
    if (since > PICK_CLOCK) return { text: `ROBIN: TIME! ${SEEDS[US - 1]}, YOUR PICK PLEASE.`, since: since - PICK_CLOCK };
    return { text: `ROBIN: ALLIANCE ${US}, ${SEEDS[US - 1]}, YOU'RE UP!`, since };
  }
  let k = -1;
  ORDER.forEach((_, i) => {
    if (tw >= callAt(i)) k = i;
  });
  if (k < 0) return null;
  const p = ORDER[k];
  const turn = k > 0 && ORDER[k - 1].round !== p.round ? 'ROUND 2! ' : '';
  return { text: `ROBIN: ${turn}ALLIANCE ${p.alliance} PICKS ${p.num}!`, since: tw - callAt(k) };
}

// ---- Every frame ----
export function updateSecond(dt, s, now = nowS()) {
  if (!S.phase) start(now);
  const t = now - S.t0;
  // The brief's words: the stage's dialog box, started once the card's in; once they've been read, the card folds.
  if (S.phase === 'brief') {
    if (!S.talked && t >= TALK_AT) {
      S.talked = true;
      s.talk = conversation(COCAPTAIN_NAME, BRIEF_LINES, now, { person: { name: COCAPTAIN_NAME, look: COCAPTAIN_LOOK }, tag: C.red0 });
    } else if (S.talked && !s.talk) go('fold', now);
    return;
  }
  if (S.phase === 'fold' && t >= FOLD) {
    S.wait0 = now;
    go('wait', now);
  }
  if (S.phase === 'wait') {
    const tw = now - S.wait0, list = listAt(tw);
    // The cursor's team taken and gone: it moves to whoever's in its place now.
    const i = list.findIndex((tm) => tm.num === S.on);
    if (i < 0) S.on = list[Math.min(S.onIdx, list.length - 1)].num;
    else S.onIdx = i;
    if (tw >= TURN_AT) toTurn(now);
  }
  // The stick: one tile a push across, a row up or down; held, again every REPEAT seconds.
  const st = s.stick();
  const across = Math.abs(st.x) >= Math.abs(st.y), d = st.mag < DEAD ? 0 : Math.sign(across ? st.x : st.y) * (across ? 1 : 4);
  if (d && (d !== S.held || now - S.heldAt > REPEAT)) {
    S.heldAt = now;
    if ((S.phase === 'wait' || S.phase === 'turn') && !S.open) move(d, now);
    else if (S.phase === 'confirm') S.choice = clamp(S.choice + Math.sign(d), 0, 1);
  }
  S.held = d;
  if (S.phase === 'accept' && t > ACCEPT) go('result', now);
  if (S.phase === 'rewind' && t > REWIND) {
    S.rewoundAt = now;
    S.picked = null;
    toTurn(now);
  }
}
function move(d, now) {
  const list = listAt(twNow(now)), i = list.findIndex((tm) => tm.num === S.on);
  const j = clamp(i + d, 0, list.length - 1);
  // A push up or down off the grid's edge stays put rather than jumping to the end of a row.
  if (Math.abs(d) > 1 && (i + d < 0 || i + d >= list.length)) return;
  S.on = list[j].num;
  S.onIdx = j;
}

/** A, when nothing else (the dialog box) has it. */
export function pressSecond(s, now = nowS()) {
  if (!S.phase) start(now);
  const t = now - S.t0;
  if (S.open && (S.phase === 'wait' || S.phase === 'turn')) {
    S.open = false;
    return;
  }
  switch (S.phase) {
    case 'brief':
      // Before Riley's started: straight to the words.
      if (!S.talked) S.t0 = now - TALK_AT;
      break;
    case 'wait':
      S.toastAt = now;
      break;
    case 'turn':
      S.choice = 0;
      go('confirm', now);
      break;
    case 'confirm':
      if (t < GUARD) break;
      if (S.choice === 1) go('turn', now);
      else {
        S.picked = teamOf(S.on);
        S.left = PICK_CLOCK - (now - S.clock0);
        go('accept', now);
      }
      break;
    case 'accept':
      if (t > 0.4) go('result', now);
      break;
    case 'result':
      if (t < 0.6) break;
      go(good() ? 'end' : 'rewind', now);
      break;
    default:
  }
}

/** A finger: true from 'down' if this takes it; false leaves it to the stage (a tap is A). */
export function pointSecond(type, x, y, s, now = nowS()) {
  if (!S.phase) start(now);
  if (s.talk) return false;
  const onScreen = x >= 0 && x < W && y >= 0 && y < H;
  if (S.phase === 'confirm') {
    const over = [0, 1].find((i) => inRect(buttonRect(i), x, y)) ?? -1;
    if (type === 'down') {
      S.pressed = over;
      if (over >= 0) S.choice = over;
      return onScreen;
    }
    if (type === 'move') {
      if (S.pressed >= 0 || over >= 0) S.pressed = over;
      if (over >= 0) S.choice = over;
    } else if (type === 'up') {
      const was = S.pressed;
      S.pressed = -1;
      if (was >= 0 && over === was) pressSecond(s, now);
    } else S.pressed = -1;
    return true;
  }
  if (S.phase !== 'wait' && S.phase !== 'turn') return false;
  if (type !== 'down') return true;
  if (!onScreen) return false;
  if (S.open) {
    S.open = false;
    return true;
  }
  if (inRect(goalLineRect(GOAL_AT.cx, GOAL_AT.y), x, y)) {
    S.open = true;
    S.openAt = now;
    return true;
  }
  const turn = S.phase === 'turn';
  const hit = tilesAt(twNow(now)).find((tl) => tl.fall === 0 && inRect({ ...tileRect(0), x: tl.x, y: tl.y }, x, y));
  if (hit) {
    if (turn && hit.team.num === S.on) pressSecond(s, now);
    else {
      S.on = hit.team.num;
      S.onIdx = listAt(twNow(now)).indexOf(hit.team);
    }
    return true;
  }
  if (inRect(CARD2, x, y)) {
    if (turn) pressSecond(s, now);
    else S.toastAt = now;
    return true;
  }
  const h = hintRects2(turn);
  if (inRect(h.left, x, y)) move(-1, now);
  else if (inRect(h.right, x, y)) move(1, now);
  else if (h.act && inRect(h.act, x, y)) pressSecond(s, now);
  return true;
}

// ---- The phone ----
export function secondLabel() {
  if (S.open && (S.phase === 'wait' || S.phase === 'turn')) return 'CLOSE';
  switch (S.phase) {
    case 'wait': return `${S.on}: NOT YET`;
    case 'turn': return `PICK ${S.on}`;
    case 'confirm': return S.choice ? 'BACK' : 'INVITE';
    case 'result': return good() ? 'CONTINUE' : 'REWIND';
    case 'end': return undefined;
    default: return 'NEXT';
  }
}
export function secondStatus(now = nowS()) {
  switch (S.phase) {
    case 'brief': case 'fold': return 'THE PLAN';
    case 'wait': {
      const tw = now - S.wait0;
      let k = -1;
      ORDER.forEach((_, i) => {
        if (tw >= callAt(i)) k = i;
      });
      return k < 0 ? 'WATCHING THE PICKS' : statusOf(ORDER[k]);
    }
    case 'turn': return 'PICK 2: ON THE CLOCK';
    case 'confirm': return 'INVITING';
    case 'accept': return 'PICKED';
    case 'result': return 'BET LOG';
    case 'rewind': return 'REWINDING';
    case 'end': return 'TO BE CONTINUED';
    default: return undefined;
  }
}
export function secondClock(now = nowS()) {
  return S.phase === 'turn' || S.phase === 'confirm' ? Math.max(0, PICK_CLOCK - (now - S.clock0)) : null;
}

// ---- The screen ----
function dashboard(now, extra = {}) {
  const tw = twNow(now), b = boardAt(tw, now), turn = tw === Infinity;
  const tiles = tilesAt(tw);
  const cardTeam = teamOf(S.on);
  const p = pickOf(S.on), landed = p >= 0 ? tw - (callAt(p) + LANDS) : -1;
  const since = S.rewoundAt == null ? Infinity : now - S.rewoundAt;
  const next = b.next >= 0 ? ORDER[b.next] : null;
  drawDashboard({
    t: now,
    clock: turn ? { t: now - S.clock0, left: PICK_CLOCK - (now - S.clock0) } : null,
    sub: next ? `ROUND ${next.round} - ALLIANCE ${next.alliance} IS PICKING` : `ALLIANCE ${US} IS NEXT`,
    goal: S.phase === 'brief' ? null : { done: 1, t: now - S.t0, open: S.open },
    pa: paAt(tw, now),
    ...b,
    tiles,
    card: cardTeam,
    cardTaken: p >= 0 && landed >= 0 && Number.isFinite(tw) ? { alliance: ORDER[p].alliance, t: landed } : null,
    turn: turn && S.phase === 'turn',
    thought: since < THOUGHT ? "...DIDN'T THIS JUST HAPPEN?" : null,
    toast: now - S.toastAt < TOAST ? 'NOT YOUR TURN YET' : null,
    glow: clamp(1 - since / 0.8, 0, 1),
    ...extra,
  });
}

export function drawSecond(now = nowS()) {
  if (!S.phase) start(now);
  const t = now - S.t0;
  switch (S.phase) {
    case 'brief':
      dashboard(now);
      drawGoalCard(CARD_AT.x, lerp(-80, CARD_AT.y, easeOut(seg(t, 0.15, 0.6))), { done: 1 });
      break;
    case 'fold':
      dashboard(now);
      drawGoalCard(CARD_AT.x, lerp(CARD_AT.y, -80, easeIn(seg(t, 0, FOLD))), { done: 1 });
      break;
    case 'wait':
    case 'turn':
      dashboard(now);
      if (S.open) {
        screen();
        withAlpha(0.75, () => fill(0, 31, W, H - 31, C.ink));
        drawGoalCard(CARD_AT.x, lerp(CARD_AT.y - 12, CARD_AT.y + 10, easeOut(seg(now - S.openAt, 0, 0.2))), { done: 1 });
        blinkPrompt('A: CLOSE', 108, now - S.openAt, 0.3);
      }
      break;
    case 'confirm':
      dashboard(now);
      drawConfirm(teamOf(S.on), S.choice, t, S.pressed);
      break;
    case 'accept':
      dashboard(now, { clock: { t: 1, left: S.left } });
      drawAccept(S.picked, t);
      break;
    case 'result':
      drawResult2(S.picked, good(), t, { glow: !good() && t > 2.4 ? 0.35 + 0.35 * Math.sin(t * 5) : 0 });
      break;
    case 'rewind': {
      const k = clamp(t / REWIND, 0, 1), left = S.left + (PICK_CLOCK - S.left) * k * k;
      dashboard(now, { clock: { t: 1, left }, glow: Math.min(1, 0.4 + k), turn: true, toast: null });
      drawRewind(k, t);
      break;
    }
    case 'end':
      drawEnd(t, S.picked?.num ?? RIGHT2);
      break;
    default:
  }
}
