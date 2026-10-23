// The pits, put together: the hall (set.js), the people in it (people.js), what they say (lines.js) and the cut scene
// (cutscene.js), on the shared stage (stage.js). The cut scene ends with the strategist in front of 5026's pit; then
// she's yours to walk the row, stop by the pits and talk to people.
//
// Walking: the aisle the length of the hall, into each pit's open front as far as its robot or its board, and in front
// of the counter and the desk at the ends (set.js move()); anyone standing, kneeling at work or walking about is in the
// way too, as wide as they're drawn and a step deep, so she stops a step short of them and goes round. Eleven people
// talk: the volunteer at SPARE PARTS, a student on each of four other teams, the judge, the teammate on pit duty,
// 5026's mentor, the pit admin at his desk, and the safety advisor, who walks the aisle up and down and stops while
// you talk to her. Whoever she talks to turns to face her (kneelers stay down and put the drill down for a moment;
// someone bent over a laptop straightens up), and if she's walked up right in front of them she first takes a few
// steps back and to their side, so the big screen shows them both, the way the arena does, instead of the back of her
// head in front of their face. The words come once she's there.
//
// Nobody walks through anybody. The aisle's walkers (the safety advisor and two people from other rows) see her ahead
// and step round her, in front or behind, wherever there's room in the aisle, then back to their way; the passers-by go
// round the safety advisor too, a step deeper or shallower than her. Only if she's right in front of them before
// they've stepped aside do they stop for a moment. And nobody walks across a conversation: while she talks to someone,
// a passer-by heading their way, or the safety advisor on her patrol, stops well short of the two of them (TALK_GAP)
// and waits till they're done, so the faces over the dialog box stay clear. 8192's battery runner has a corner of the pit she can't walk into
// (people.js's RUN_LANE), and would wait for her if she ever got in the way.
//
// No running in the pits. It's a real rule at every event (batteries, tools and robots on carts in a crowded aisle), so
// it's this scene's: run for half a second and the safety advisor calls out straight away, from wherever she is (off
// the screen, if she's off it), and comes over while the words type, her patrol stopped. She comes briskly, from the
// side she's on (from the edge of the screen if she's off it), and stops a step to the strategist's side, that side if
// there's room, clear of anyone standing there. If the strategist has run into the front half of the aisle, she walks
// back to meet her, so the two of them stand near the pits and both faces show over the dialog box. Afterwards the
// safety advisor walks back to where she left her patrol and carries on. Then she leaves you be for 20 seconds.
// stage.js has no hook for running, so draw() keeps the count: a stage.js onRun(s, seconds) would be the cleaner place.
// Nor has it one for moving her by herself (the steps aside to talk, the walk to meet the safety advisor), so camera()
// does it, before the view's worked out and she's drawn: a stage.js `walkTo(path)` would be cleaner.
//
// Clocks. The cut scene runs the crews and the hall's blinking lights on its own clock, and leaves the aisle empty from
// the pit announcer's call on. So that nothing jumps when it hands over, the walking part carries on from the cut
// scene's last moment for the crews and the hall (crewT), and starts the aisle's walkers on clocks of their own from
// where they're all off the screen: she at the far end of her patrol by the SPARE PARTS counter, one passer-by behind
// the view and one just past its right edge. Each walker's clock (and the battery runner's) runs behind by the time
// they've spent waiting.

import { runScene, dirToward, along, SPEED } from '../stage.js';
import { conversation, drawBubble } from '../talk.js';
import { clamp } from '../pixel.js';
import { WORLD, drawWorld, drawCartBot, move } from './set.js';
import { LOOKS, PEOPLE, folk, drawFolk, NADIA_ID, RUN_LANE } from './people.js';
import { LINES, RUN_WARNING } from './lines.js';
import { makeCutscene, END } from './cutscene.js';

// Everyone you can talk to gets their lines.
for (const p of PEOPLE) p.lines = LINES[p.id];
const nadia = PEOPLE.find((p) => p.id === NADIA_ID);
/** The aisle's walkers: on their own clocks while you walk. */
const AISLE = [NADIA_ID, 'pass1', 'pass2'];
const RUNNER = 'runner8192';
/** Everyone on a clock of their own that stops while they wait for her. */
const MOVERS = [...AISLE, RUNNER];
/** How far a step goes down the screen for a step across: the floor recedes (stage.js). */
const DEPTH = 0.8;
/**
 * How close someone walking comes before stopping to wait for her: pixels across, pixels deep (any closer and they'd
 * overlap). The passers-by stop a little further off, so one waiting for the safety advisor never stands touching her.
 */
const WAIT = { x: 16, y: 10 }, WAIT_PASSER = { x: 22, y: 10 };
/**
 * While she talks to someone, how far off a passer-by heading their way waits: from TALK_GAP[0] to TALK_GAP[1] pixels
 * across short of the nearer of the two (closer than that, they're already passing and carry on round), if they're up to
 * TALK_GAP[2] pixels behind either of the two, or up to TALK_GAP[3] in front: enough to take in both of the passers'
 * lanes (y 114 and 118) from a talk set back in a pit (Bea at y 74 is the deepest; the strategist stands a step in front).
 * The safety advisor on her patrol waits a head's width further off across (TALK_GAP_PATROL), so that she and a
 * passer-by waiting too stand side by side, not one head over the other.
 */
const TALK_GAP = [20, 40, 24, 46], TALK_GAP_PATROL = [36, 56];
/**
 * How the aisle's walkers get round someone: they start stepping aside this far ahead of them (pixels across), pass
 * this far in front or behind (pixels deep), and step aside this fast (pixels deep a second), keeping to the aisle.
 * Someone going their way, about their pace, they pass further off (same), since the two of them stay side by side
 * for a while: a clear step apart in depth, not one figure walking with two heads. And while she overtakes a passer-by
 * (her walk is only a little quicker than theirs), they ease to this much of their pace (slow), so it's soon done.
 */
const ROUND = { ahead: 40, gap: 13, same: 20, rate: 24, slow: 0.5 }, LANE = [101, 137];
/**
 * How much of the floor someone takes up for her: as wide as they're drawn (HALF either side of their feet), from a
 * little behind their feet to a step in front, so she stops a step short of them rather than on top of them. Anyone
 * standing still (at work, minding a pit, behind a desk) takes up a little more, HALF_STILL across and BEHIND_STILL
 * behind, so walking up from the side or from behind she stops with a gap between the two of them, not tucked in
 * against them as one figure; the people walking about keep the smaller box, so they never get stuck on her.
 */
const HALF = 8, BEHIND = 3, FRONT_OF = 4, HALF_STILL = 10, BEHIND_STILL = 7;
/** Someone bent over a robot or a laptop has their head and hands this far ahead of their feet, across. */
const LEAN = 10;
/**
 * Where the safety advisor stops to have a word: this far to the strategist's side (the side she came from, if there's
 * room there at all), at the back of the aisle (WORD_Y, depth), and clear of anyone standing near: CLEAR pixels across,
 * if they're within CLEAR of depth, or NEAR_CLEAR rather than going round to the far side. Further down the aisle than
 * WORD_Y the strategist walks back to meet her, so both faces clear the dialog box's name tag.
 */
const WORD = [24, 32], WORD_Y = [104, 110], CLEAR = 14, NEAR_CLEAR = 10;
/** The safety advisor's pace coming over to have a word (brisk), and going back to her patrol (people.js's). */
const BRISK = 44, STROLL = 22;

const cutscene = makeCutscene({ drawWorld, drawCartBot, drawFolk, folk, LOOKS });
/** Seconds into the cut scene when it hands over: the crews carry on from there. */
const CUT_END = cutscene.reduce((n, b) => n + b.dur, 0);

// ---- The walking part's clocks ----
// walkT0: the page time walking started (again, after a replay); held: seconds each mover has stood still (waiting for
// her, talking to her, or off on an errand); lastT: the last frame's page time.
let walkT0 = null, held = {}, lastT = null;
// No running: seconds she's been running, and when the safety advisor last called out.
let running = 0, warnedAt = -Infinity;
/**
 * The safety advisor's errand when she has a word with the strategist: { phase, path, to, t0, wait }. phase 'come'
 * (walking over along `path` to `to`, a step to her side), 'talk' (saying it), 'back' (walking back to her patrol, which
 * waits where she left it). wait: seconds she's stood still on the way back.
 */
let errand = null;
/**
 * The strategist walking somewhere by herself: { path, t0, end, dist0, face(), talk?, keep() }. She walks `path` from
 * page time t0 to `end`, then turns to face() (where she turns before she sets off, too); for a talk, only while that
 * talk is on, and for the safety advisor's word, as long as keep() says.
 */
let herWalk = null;
/** Each aisle walker stepping round people: { off (pixels deep off their own way), dist, x, y, gait }. */
let aside = {};
/** The safety advisor as of the last frame: { x, y, still } (still: standing, or off her way, so others go round her). */
let lastNadia = null;
/** Who's in the way: the people at work and standing about, as rectangles round their feet. */
let solids = [];
/** Her, as of the last frame drawn: the bubble goes on the side of whoever's in reach away from her. */
let her = null;

const toward = (from, to) => dirToward(to.x - from.x, (to.y - from.y) / DEPTH);
/** One of along()'s results as a pose for folk's list, on whole pixels (feet stepping with the distance, as people.js's). */
const pose = (a) => ({ x: Math.round(a.x), y: Math.round(a.y), dir: a.dir, gait: a.gait, frame: a.gait === 'walk' ? Math.floor(a.dist / 3.2) % 8 : 0 });
/** Whether a pose is at a spot, to the pixel. */
const at = (a, [x, y]) => Math.round(a.x) === x && Math.round(a.y) === y;
const byId = (list) => Object.fromEntries(list.map((p) => [p.id, p]));
/** Whether someone heading `dir` has `o` ahead of them or level with them, not behind. */
const ahead = (p, o) => (o.x - p.x) * Math.sin((p.dir * Math.PI) / 4) + ((o.y - p.y) / DEPTH) * Math.cos((p.dir * Math.PI) / 4) > -4;
/** Whether someone walking at p would walk into o next: o's right in front of them (within `wait`, WAIT if not given). */
const blocks = (p, o, wait = WAIT) => Math.abs(p.x - o.x) < wait.x && Math.abs(p.y - o.y) < wait.y && ahead(p, o);
/** Which way across someone heading `dir` goes: -1 left, 1 right, 0 neither. */
const across = (dir) => Math.sign(Math.round(Math.sin((dir * Math.PI) / 4) * 4));
/** Whether she (me) is overtaking someone walking at p: going their way, from ROUND.ahead behind them to a step past. */
const overtaking = (p, me) => {
  const go = across(p.dir), rel = (p.x - me.x) * go;
  return go !== 0 && ['walk', 'run'].includes(me.gait) && across(me.dir) === go && rel > -16 && rel < ROUND.ahead;
};
/**
 * Whether someone at p, walking, is coming up on a conversation's speaker at o and should wait: [near, far] pixels
 * across short of them (TALK_GAP's, unless given), and within TALK_GAP's depth.
 */
const nearTalk = (p, o, [near, far] = TALK_GAP) => {
  const go = across(p.dir), d = (o.x - p.x) * go;
  const dy = p.y - o.y;
  return go !== 0 && d >= near && d < far && dy > -TALK_GAP[2] && dy < TALK_GAP[3];
};

/** The closest person in reach of her feet (nobody while she's walking somewhere by herself). */
function reach(s) {
  if (errand?.phase === 'come' || herWalk) return null;
  let best = null, bestD = Infinity;
  for (const p of PEOPLE) {
    const dx = Math.abs(p.x - s.me.x), dy = Math.abs(p.y - s.me.y);
    if (dx < (p.reach ?? 14) && dy < (p.reachY ?? 12) && dx + dy < bestD) [best, bestD] = [p, dx + dy];
  }
  return best;
}

/** How far in front of someone she stands to talk, at least, so the two heads aren't side by side at one height. */
const FRONT = 5;
/** The aisle's back edge: out here she can walk round the front of a side drape. */
const AISLE_Y = 100;

/**
 * Where she gets to from (x, y) heading for (tx, ty), a pixel at a time, down or up first and then across, so nothing
 * gets in the way (move() stops her at furniture, robots and people).
 */
function slide(x, y, tx, ty) {
  for (const [ax, ay] of [[0, 1], [1, 0]]) {
    for (;;) {
      const d = ax ? tx - x : ty - y;
      if (Math.abs(d) <= 0.01) break;
      const [nx, ny] = move(x, y, ax * clamp(d, -1, 1), ay * clamp(d, -1, 1), solids);
      if (nx === x && ny === y) break;
      [x, y] = [nx, ny];
    }
  }
  return [x, y];
}

/**
 * Starting to talk to p: if she's standing in front of them (anywhere in reach across), she'd hide them, so she walks
 * back a little and to their side (p.side, or the side they face, first), down or up first and then across, and the words wait till she's there.
 * If a side drape's in the way she goes round its front, out in the aisle. p.aside: how far to the side, 16 pixels
 * unless given (a head's width, so the heads don't meet).
 */
function stepAside(s, p) {
  const me = s.me;
  if (Math.abs(me.x - p.x) >= (p.reach ?? 14) || me.y <= p.y) return;
  const aside = p.aside ?? 16;
  const faces = p.side ?? ([1, 2, 3].includes(p.dir) ? 1 : [5, 6, 7].includes(p.dir) ? -1 : Math.sign(me.x - p.x) || 1);
  const near = Math.max(me.y, p.y + FRONT);
  for (const side of [faces, -faces]) {
    for (const ty of [near, Math.max(near, AISLE_Y)]) {
      const to = p.x + side * aside, [x, y] = slide(me.x, me.y, to, ty);
      if (Math.abs(to - x) <= 0.01 && Math.abs(ty - y) <= 0.01) {
        const path = [[me.x, me.y], [me.x, ty], [to, ty]], t0 = s.talk.start;
        herWalk = { path, t0, end: t0 + along(path, 1e6).dist / SPEED.walk, dist0: me.dist, face: () => p, talk: s.talk };
        s.talk.start = herWalk.end;
        return;
      }
    }
  }
  me.dir = toward(me, p);
}

/**
 * Where the safety advisor stops to have a word with her at (hx, hy) (see WORD), coming from `side` (-1 left, 1 right):
 * her own side first, a little closer to the people standing there if need be, and only then the far side.
 */
function wordSpot([hx, hy], side, crowd) {
  const y = clamp(Math.round(hy), WORD_Y[0], WORD_Y[1]);
  const spots = (s) => WORD.map((d) => clamp(Math.round(hx + s * d), 10, 822));
  const clear = (gap) => (x) => Math.abs(x - hx) >= 20 && crowd.every((p) => Math.abs(p.y - y) >= gap || Math.abs(p.x - x) >= gap);
  const x = spots(side).find(clear(CLEAR)) ?? spots(side).find(clear(NEAR_CLEAR)) ?? spots(-side).find(clear(CLEAR))
    ?? spots(-side).find(clear(NEAR_CLEAR)) ?? spots(side)[0];
  return [x, y];
}

/**
 * Someone walking the aisle (p: where their own way has them now), stepped round whoever's near ahead of them (`obs`,
 * as { x, y }): they ease off their way toward the nearest place in the aisle that clears everyone near by ROUND.gap,
 * and back once they're past. `waiting`: their clock is stopped (they'd walk into her), so they only step aside. Their
 * feet step with the ground they cover.
 */
function goRound(p, obs, dt, waiting) {
  const st = (aside[p.id] ??= { off: 0, dist: 0, x: p.x, y: p.y, gait: p.gait });
  const go = p.gait === 'walk' ? Math.sign(Math.round(Math.sin((p.dir * Math.PI) / 4) * 4)) : 0;
  let want = 0;
  if (go) {
    want = st.off;
    const now = p.y + st.off;
    // Someone going their way is stepped round from as far behind as ahead: they're coming up to overtake.
    const gap = (o) => (['walk', 'run'].includes(o.gait) && across(o.dir) === go ? ROUND.same : ROUND.gap);
    const near = obs.filter((o) => (o.x - p.x) * go > (gap(o) === ROUND.same ? -ROUND.ahead : -16) && (o.x - p.x) * go < ROUND.ahead);
    const ok = (y) => y >= LANE[0] && y <= LANE[1] && near.every((o) => Math.abs(o.y - y) >= gap(o));
    const ys = [p.y, ...near.flatMap((o) => [o.y - gap(o), o.y + gap(o)])].filter(ok);
    if (ys.length) want = ys.reduce((a, b) => (Math.abs(b - now) < Math.abs(a - now) ? b : a)) - p.y;
  }
  const step = clamp(want - st.off, -ROUND.rate * dt, ROUND.rate * dt);
  st.off += step;
  const y = p.y + st.off, sidestep = Math.abs(step) > 1e-3;
  const gait = waiting && !sidestep ? 'stand' : sidestep ? 'walk' : p.gait;
  const dir = sidestep ? dirToward((go || 0) * (waiting ? 10 : 30), step / dt / DEPTH) : p.dir;
  st.dist += Math.hypot(p.x - st.x, (y - st.y) / DEPTH);
  Object.assign(st, { x: p.x, y, gait });
  return { ...p, y: Math.round(y), dir, gait, frame: gait === 'walk' ? Math.floor(st.dist / 3.2) % 8 : 0 };
}

/** How tall someone is over their feet, for the bubble: kneeling and sitting people are shorter. */
const HEIGHT = { kneel: 41, sit: 44, lean: 46 };

runScene({
  name: 'THE PITS',
  label: 'A row of eight team pits along the back of the event hall, the strategist in the aisle in front of them; the view follows her along the row',
  note: 'Push the stick a little to walk; the view follows her along the row. Stop by someone in the pits, at the SPARE PARTS counter or the PIT ADMIN desk and press A to talk. And walk, don\'t run: the safety advisor is watching. On a keyboard: arrow keys or WASD, Space or Enter to talk and read on, Esc to skip the cut scene. Shift runs, if you want to meet the safety advisor.',
  world: WORLD,
  start: END.hero,
  look: LOOKS.hero,
  cutscene,
  people: PEOPLE,
  onFree() {
    walkT0 = null;
    herWalk = null;
  },
  // She stays put while the safety advisor comes over (she walks to meet her by herself, below).
  move: (x, y, dx, dy) => (errand?.phase === 'come' ? [x, y] : move(x, y, dx, dy, solids)),
  reach,
  onTalk: stepAside,
  // The view follows her, as stage.js's does. First, if she's walking somewhere by herself, she takes this frame's step
  // (on stage.js's clock), so the view and her feet move together.
  camera(s) {
    const w = herWalk, me = s.me;
    if (w && w.talk && s.talk !== w.talk) herWalk = null; // the talk was over before she got there: she stays where she is
    else if (w) {
      const now = performance.now() / 1000, a = along(w.path, now - w.t0, 'walk');
      Object.assign(me, { x: a.x, y: a.y, gait: a.gait, dist: w.dist0 + a.dist, dir: a.gait === 'walk' ? a.dir : toward(a, w.face()) });
      if (now >= w.end && !w.keep?.()) herWalk = null;
    }
    return { x: Math.round(clamp(me.x - 128, 0, WORLD.w - 256)), y: 0 };
  },
  // The A bubble over whoever's in reach, on their side away from her, so it never sits on her own head. If she's
  // walked straight up in front of them, so that she hides them, it goes beside her head on the side she'd step aside
  // to (theirs, or the way they face), and up clear of her hair.
  prompt(g, view, p, t) {
    const top = p.y - (HEIGHT[p.gait] ?? 50);
    if (her && Math.abs(her.x - p.x) <= 8 && her.y > p.y) {
      const side = p.side ?? ([1, 2, 3].includes(p.dir) ? 1 : [5, 6, 7].includes(p.dir) ? -1 : 1);
      drawBubble(g, Math.round(her.x) - view.x + side * 16, Math.min(top, her.y - 58) - view.y, t);
      return;
    }
    const side = her && her.x - p.x > 4 ? -1 : 1;
    drawBubble(g, p.x - view.x + side * 11, top - view.y, t);
  },
  draw(g, view, t, s) {
    const me = (her = s.me);
    // The clocks: the crews carry on from the cut scene, the aisle's walkers start from the far end.
    if (walkT0 == null) {
      walkT0 = t;
      held = Object.fromEntries(MOVERS.map((id) => [id, 0]));
      aside = {};
      lastNadia = null;
      running = 0;
      errand = null;
      lastT = t;
    }
    const dt = Math.max(0, Math.min(0.1, t - lastT));
    lastT = t;
    const crewT = CUT_END + (t - walkT0), aisleT = t - walkT0;
    const clocks = () => Object.fromEntries(MOVERS.map((id) => [id, (id === RUNNER ? crewT : aisleT) - held[id]]));
    const talkingTo = (id) => s.talk?.person?.id === id;
    const offOf = (id) => aside[id]?.off ?? 0;

    // Who has to wait: each mover's clock stops while their next step would take them into her (the runner's into her,
    // a passer-by's into the safety advisor standing still too) or an aisle walker's across her conversation, and the
    // safety advisor's while she talks to her or is off her patrol on an errand. A passer-by she's overtaking slows.
    const at0 = byId(folk(crewT, { clocks: clocks() }));
    const passer = (id) => AISLE.includes(id) && id !== NADIA_ID;
    const hard = (id) => (passer(id) && lastNadia?.still ? [me, lastNadia] : [me]);
    // The two in a conversation, if one's going on: her and whoever she's talking to (the safety advisor where she is).
    const talkers = s.talk ? [me, ...(s.talk.person ? [talkingTo(NADIA_ID) && lastNadia ? lastNadia : s.talk.person] : [])] : [];
    const waiting = new Set();
    for (const id of MOVERS) {
      const p = at0[id], q = { ...p, y: p.y + offOf(id) };
      if (id === NADIA_ID && (errand || talkingTo(NADIA_ID))) held[id] += dt;
      else if (['walk', 'carry'].includes(p.gait)
        && (hard(id).some((o) => blocks(q, o, passer(id) ? WAIT_PASSER : WAIT)) || (AISLE.includes(id) && talkers.some((o) => nearTalk(q, o, id === NADIA_ID ? TALK_GAP_PATROL : TALK_GAP))))) {
        held[id] += dt;
        waiting.add(id);
      } else if (passer(id) && p.gait === 'walk' && overtaking(q, me)) held[id] += dt * (1 - ROUND.slow);
    }
    const everyone = folk(crewT, { clocks: clocks() });
    const now = byId(everyone);
    const crew = everyone.filter((p) => !AISLE.includes(p.id));
    const runner = now[RUNNER];
    if (waiting.has(RUNNER)) Object.assign(runner, runner.gait === 'carry' ? { frame: 0 } : { gait: 'stand', frame: 0 });

    // The safety advisor on her patrol, going round her if she's in the way.
    const pn = now[NADIA_ID], patrolAt = [pn.x, pn.y];
    if (!errand && !talkingTo(NADIA_ID)) Object.assign(pn, goRound(pn, [me], dt, waiting.has(NADIA_ID)));

    // No running in the pits.
    if (s.mode === 'free' && !s.talk && !errand && !herWalk && me.gait === 'run') {
      running += dt;
      if (running > 0.5 && t - warnedAt > 20) {
        warnedAt = t;
        running = 0;
        // She comes over from where she is, or from the edge of the screen on her side if she's off it, along the back
        // of the aisle, and stops a step to the strategist's side; if that's the far side, she goes round in front of
        // her. The strategist walks back to meet her if she's out in the aisle's front half, setting off so that the
        // two of them get there together.
        const mid = view.x + 128, off = Math.abs(pn.x - mid) > 120;
        const side = Math.sign(pn.x - (off ? mid : me.x)) || 1;
        const [hx, hy] = me.y > WORD_Y[1] ? slide(me.x, me.y, me.x, WORD_Y[1]) : [me.x, me.y];
        const passers = AISLE.filter((id) => id !== NADIA_ID && aside[id]).map((id) => aside[id]);
        const to = wordSpot([hx, hy], side, [...crew, ...passers]);
        const from = off ? [side < 0 ? view.x - 10 : view.x + 266, to[1]] : [pn.x, pn.y];
        const round = Math.sign(to[0] - hx) !== side ? [[Math.round(hx), Math.min(LANE[1], Math.round(hy) + 14)]] : [];
        const path = [from, ...round, to], mine = [[me.x, me.y], [hx, hy]];
        const tN = along(path, 1e6, 'walk', BRISK).dist / BRISK, tS = along(mine, 1e6).dist / SPEED.walk;
        errand = { phase: 'come', t0: t, wait: 0, path, to };
        herWalk = { path: mine, t0: t + Math.max(0, tN - tS), end: t + Math.max(tN, tS), dist0: me.dist, face: () => nadia, keep: () => errand?.phase === 'come' };
        // She calls out as soon as she sees it, and the words type while she comes over.
        me.gait = 'stand';
        s.talk = conversation(nadia.name, RUN_WARNING, t, { person: nadia });
      }
    } else running = 0;

    // Her errand, if she's on one: over to the strategist while the warning types, the rest of it once they're both
    // there, and back to where she left her patrol (which waits for her there: her clock is stopped).
    if (errand?.phase === 'come') {
      const a = along(errand.path, t - errand.t0, 'walk', BRISK);
      Object.assign(pn, pose(a));
      if (at(a, errand.to)) {
        pn.dir = toward(pn, me);
        if (!herWalk || t >= herWalk.end) {
          errand.phase = 'talk';
          herWalk = null;
          Object.assign(me, { gait: 'stand', dir: toward(me, pn) });
        }
      }
    } else if (errand?.phase === 'talk') {
      Object.assign(pn, { x: errand.to[0], y: errand.to[1], gait: 'stand', frame: 0 });
      if (!s.talk) {
        // Back to her patrol, round in front of the strategist again if it's on her far side.
        const round = Math.sign(patrolAt[0] - me.x) !== Math.sign(errand.to[0] - me.x) ? [[Math.round(me.x), Math.min(LANE[1], Math.round(me.y) + 14)]] : [];
        Object.assign(errand, { phase: 'back', t0: t, wait: 0, path: [errand.to, ...round, patrolAt] });
      }
    }
    if (errand?.phase === 'back') {
      const way = (k) => along(errand.path, k, 'walk', STROLL);
      let a = way(t - errand.t0 - errand.wait);
      const wait = talkingTo(NADIA_ID) || (a.gait === 'walk' && blocks({ ...a, y: a.y + offOf(NADIA_ID) }, me));
      if (wait) {
        errand.wait += dt;
        a = way(t - errand.t0 - errand.wait);
      }
      if (at(a, errand.path.at(-1)) && !talkingTo(NADIA_ID) && Math.abs(offOf(NADIA_ID)) < 0.5) errand = null;
      else Object.assign(pn, goRound({ id: NADIA_ID, ...pose(a) }, [me], dt, wait));
    }
    Object.assign(nadia, { x: pn.x, y: pn.y, dir: pn.dir });
    lastNadia = { x: pn.x, y: pn.y, still: !!errand || talkingTo(NADIA_ID) || pn.gait === 'stand' || Math.abs(offOf(NADIA_ID)) > 2 };

    // The passers-by, going round her and the safety advisor (a step deeper or shallower than her as they pass or
    // overtake her, so the two of them don't walk on top of each other), and round each other: the second gives way to
    // the first where they meet.
    const passed = [];
    for (const id of AISLE.filter((id) => id !== NADIA_ID)) {
      Object.assign(now[id], goRound(now[id], [me, pn, ...passed], dt, waiting.has(id)));
      passed.push(now[id]);
    }

    // Everyone: the crews on the cut scene's clock, the aisle on its own.
    const people = everyone;

    // Whoever she's talking to stops and looks at her: anyone kneeling stays down with the drill still, anyone bent
    // over a laptop or a robot straightens up.
    const other = s.talk && !(errand?.phase === 'come') && people.find((p) => p.id === s.talk.person?.id);
    if (other && ['stand', 'walk', 'lean'].includes(other.gait)) Object.assign(other, { gait: 'stand', frame: 0, dir: toward(other, me) });
    else if (other?.gait === 'kneel') Object.assign(other, { frame: 0, dir: toward(other, me) });
    // Who's in her way: everyone at work or standing about, the aisle's walkers and the battery runner (who all wait or
    // go round before they'd touch her; if one ever ends up on top of her, move() lets her step out), and the corner of
    // 8192's pit the runner works in.
    // Anyone leaning in takes up the floor under their head too, so she can't walk up head to head with them.
    solids = [...people.filter((p) => p.solid || MOVERS.includes(p.id)).map((p) => {
      const lean = p.gait === 'lean' ? Math.round(Math.sin((p.dir * Math.PI) / 4) * LEAN) : 0;
      const [half, behind] = MOVERS.includes(p.id) ? [HALF, BEHIND] : [HALF_STILL, BEHIND_STILL];
      return { x0: p.x - half + Math.min(0, lean), x1: p.x + half + Math.max(0, lean), y0: p.y - behind, y1: p.y + FRONT_OF };
    }), RUN_LANE];

    drawWorld(g, view, crewT, {
      pit5026: 'sign',
      more: [...people.map((p) => ({ y: p.y, draw: () => drawFolk(g, view, p) })), s.player],
    });
  },
});
