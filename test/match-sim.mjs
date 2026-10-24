// Checks for the team manager's match simulation (public/team-manager/match/): that it's deterministic, that the
// score is only ever the sum of its events, that no robot places a piece it can't or where it can't, that defense
// takes points off its target, that the animation's frames agree with the timeline, and that each team at the
// opening's event scores about what its story says over many matches. That it follows the 2019 manual where sim.js's
// header says it does: the field before the match, the cargo ship's floors tilting at 0:15, the rocket's cargo rolling
// to one of a level's two bays and out again with no hatch panel there, the pieces each alliance has, and the defense
// rules. Also that the opening's quarterfinal, played by the simulation (opening/series.js), still goes the way its
// story needs.
//   node test/match-sim.mjs
import {
  simulate, slotInfo, BLOCKS, MATCH, POINTS, routeBetween, planAlliance, averages, startSlots, stayOdds, cargoSide, seeded,
  slotKeys, PRELOAD_BAYS, DEPOT_CARGO, SUPPLY, HAB_LINE, HALF,
} from '../public/team-manager/match/sim.js';
import { TEAMS, EVENT, robotOf, planOf, qualMatch, targetOf, ARCHETYPES } from '../public/team-manager/match/robots.js';
import { makeShow, frameAt } from '../public/team-manager/match/animate.js';
import { OURS } from '../public/team-manager/opening/teams.js';
import { matchOf, scoreAt, MATCHES, LEAD, FREEZE, CALLS, THEIRS, CLIMBER, THEIR_CLIMBER } from '../public/team-manager/opening/series.js';

let failures = 0;
const check = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failures++;
};
const entry = (num, k = 0, plan = {}) => ({ robot: { num, ...robotOf(num, { match: k }) }, plan: { ...planOf(num), ...plan } });
const qf = (seed, defend = true) => ({
  seed,
  blue: [entry('7777', 9), entry('6417', 9), entry('7311', 9)],
  red: [entry(OURS, 9), entry('6834', 9), entry('4471', 9, defend ? { role: 'defend', defend: '7777' } : { role: 'score' })],
});

// ---- Deterministic ----
{
  const a = simulate(qualMatch(31, 3)), b = simulate(qualMatch(31, 3)), c = simulate(qualMatch(32, 3));
  check(JSON.stringify(a) === JSON.stringify(b), 'the same seed plays the same match, step for step');
  check(JSON.stringify(a.events) !== JSON.stringify(c.events), 'another seed plays another match');
  const d = simulate({ ...qualMatch(31, 3), record: false });
  check(JSON.stringify(d.events) === JSON.stringify(a.events), 'leaving out the tracks (for speed) changes nothing that happens');
}

// ---- The 2019 manual's rules (sim.js's header has the sections) ----
// The rocket's cargo rule, on its own.
{
  const s0 = startSlots(), on = { ...s0, 'hatch:f1h': 1 }, both = { ...on, 'hatch:f1a': 1 }, oneIn = { ...both, 'cargo:f1h': 1 };
  check(stayOdds(s0, 'f', 1) === 0 && stayOdds(on, 'f', 1) === 0.5 && stayOdds(both, 'f', 1) === 1,
    "a rocket level's cargo stays: never with no hatch panel, half the time with one, always with both");
  check(stayOdds(oneIn, 'f', 1) === 1 && stayOdds({ ...on, 'cargo:f1h': 1 }, 'f', 1) === 0 && stayOdds({ ...oneIn, 'cargo:f1a': 1 }, 'f', 1) === 0,
    'with one bay full, the next cargo stays only if the empty side has its hatch panel, and a full level takes no more');
  const rand = seeded(7), sides = Array.from({ length: 2000 }, () => cargoSide(s0, 'f', 1, rand));
  const h = sides.filter((x) => x === 'h').length;
  check(Array.from({ length: 50 }, () => cargoSide(oneIn, 'f', 1, rand)).every((x) => x === 'a') && cargoSide({ ...s0, 'cargo:n3a': 1 }, 'n', 3, rand) === 'h',
    'a second cargo in a level rolls to the empty side');
  check(h > 900 && h < 1100, `a first cargo rolls to either side at random (${h} of 2000 to the home side)`);
  const blank = startSlots();
  check(PRELOAD_BAYS.every((b) => blank[`cargo:${b}`] === 'pre' && !blank[`hatch:${b}`]), 'a side bay nobody chose for starts with a cargo');
  check(DEPOT_CARGO === 6 && SUPPLY.hatch === 24 && SUPPLY.cargo === 24, '6 cargo a depot, 24 hatch panels and 24 cargo an alliance');
}

// Checked in every one of the many matches below; reportRules() says how they went.
const R = {
  start: true, tilt: true, side: true, roll: true, where: true, stock: true, g13: true, g9: true,
  second: 0, first: 0, firstH: 0, rolled: 0, staged: 0, why: [],
};
const bad = (key, msg) => {
  R[key] = false;
  if (R.why.length < 12) R.why.push(msg);
};
/** The scoring places of one alliance from its fills before t (or at t too, with `incl`). */
function stateAt(m, a, t, incl = false) {
  const s = {};
  for (const f of m.fills) if (f.alliance === a && (f.t < t || (incl && f.t === t))) s[f.slot] = f.value;
  return s;
}
function rules(m) {
  for (const a of ['blue', 'red']) {
    // The field before the match: rockets empty, a cargo in each front bay, a cargo or a null hatch panel in each side
    // bay as the alliance chose, nothing else.
    const at0 = stateAt(m, a, 0, true), want = startSlots(m.preload[a]);
    for (const k of slotKeys) if ((at0[k] ?? 0) !== want[k]) bad('start', `${a} ${k} starts as ${at0[k]}`);
    for (const k of slotKeys) {
      const info = slotInfo(k), v = at0[k] ?? 0;
      if (info.struct === 'rocket' && v) bad('start', `${a} rocket ${k} not empty at the start`);
      if (info.bay?.startsWith('front') && v !== (info.piece === 'cargo' ? 'pre' : 0)) bad('start', `${a} ${k} starts as ${v}`);
    }
    for (const b of PRELOAD_BAYS) {
      const h = at0[`hatch:${b}`] ?? 0, c = at0[`cargo:${b}`] ?? 0;
      if (!((h === 'null' && !c) || (c === 'pre' && !h))) bad('start', `${a} ${b} starts with ${h} / ${c}`);
    }
    for (const w of ['far', 'near']) {
      const lefts = m.depots.filter((d) => d.alliance === a && d.which === w).map((d) => d.left);
      if (lefts.some((n, i) => n !== DEPOT_CARGO - 1 - i || n < 0)) bad('start', `${a} ${w} depot gave ${lefts.length}`);
    }
    // At 0:15 the floors tilt: every staged cargo without a hatch panel rolls out (and lands on the floor), the rest
    // were held in during the sandstorm.
    const after = stateAt(m, a, MATCH.sandstorm, true);
    if (Object.values(after).includes('pre')) bad('tilt', `${a} staged cargo still in the ship after 0:15`);
    for (const f of m.fills.filter((q) => q.alliance === a && q.value === 0)) {
      R.staged++;
      if (!m.drops.some((d) => d.why === 'rolled out' && d.alliance === a && d.slot === f.slot && d.tIn === MATCH.sandstorm && d.by === null && d.t > d.tOut && d.tOut > d.tIn)) bad('tilt', `${a} ${f.slot} rolled out unseen`);
    }
    for (const e of m.events.filter((q) => q.alliance === a && q.kind === 'secured')) if (e.t > MATCH.sandstorm) bad('tilt', `${a} staged cargo held in at ${e.t}`);
    // The rocket's cargo: in by the port, to the empty bay if the other's full, out again with no hatch panel there.
    const outcomes = [
      ...m.fills.filter((f) => f.alliance === a && f.value === 1 && slotInfo(f.slot).port).map((f) => ({ t: f.t, slot: f.slot, stayed: true })),
      ...m.drops.filter((d) => d.alliance === a && d.why === 'rolled out' && d.struct === 'rocket').map((d) => ({ t: d.tIn, slot: d.slot, stayed: false, d })),
    ];
    for (const o of outcomes) {
      const s = stateAt(m, a, o.t), info = slotInfo(o.slot), other = `cargo:${info.port}${info.face === 'h' ? 'a' : 'h'}`;
      if (s[o.slot]) bad('side', `${a} cargo rolled into the full bay ${o.slot}`);
      if (s[other]) R.second++;
      else R.first++, R.firstH += info.face === 'h';
      // (Robots take turns within each tenth of a second, so a partner's hatch panel can land a moment either side.)
      const hatch = `hatch:${info.port}${info.face}`;
      if (o.stayed ? !stateAt(m, a, o.t + 0.1)[hatch] : stateAt(m, a, o.t - 0.1)[hatch]) bad('roll', `${a} ${o.slot} ${o.stayed ? 'stayed with no hatch panel' : 'rolled out past a hatch panel'}`);
      if (!o.stayed) {
        R.rolled++;
        const r = m.robots.find((q) => q.num === o.d.by), step = r?.steps.find((q) => q.kind === 'place' && q.rolled && Math.abs(q.t1 - o.t) < 1e-6);
        if (!step || step.slot !== o.slot) bad('roll', `${a} ${o.slot} rolled out with no place step`);
        if (!((r?.robot.cargo?.risk ?? 0) > 0)) bad('roll', `${o.d.by}, which never chances it, rolled one out`);
        if (m.events.some((e) => e.slot === o.slot && Math.abs(e.t - o.t) < 1e-6)) bad('roll', `${a} ${o.slot} scored as it rolled out`);
        const d = o.d;
        if (!(d.x > 0 && d.x < 54 && d.z > 0 && d.z < 27 && d.t > d.tOut && d.tOut > d.tIn && d.rocket === info.rocket && d.level === info.level && d.side === info.face)) bad('roll', `${a} ${o.slot} rolled out oddly`);
      }
    }
    // Nothing scores where it can't: a hatch panel on an empty hatch, cargo behind a hatch panel (on its side, in a
    // rocket), staged cargo only with a hatch panel going on in the sandstorm, the sandstorm bonus in the sandstorm.
    for (const e of m.events.filter((q) => q.alliance === a)) {
      const s = stateAt(m, a, e.t), soon = stateAt(m, a, e.t + 0.1);
      if (e.kind === 'leave' && e.t > MATCH.sandstorm + 1e-9) bad('where', `${e.by} left the HAB for points at ${e.t}`);
      if (e.kind === 'hatch' && (!e.slot?.startsWith('hatch:') || s[e.slot])) bad('where', `${a} hatch on ${e.slot} (${s[e.slot]})`);
      if (e.kind === 'cargo' && (!e.slot?.startsWith('cargo:') || s[e.slot] || !soon[`hatch:${e.slot.slice(6)}`])) bad('where', `${a} cargo in ${e.slot} at ${e.t}`);
      if (e.kind === 'secured' && (s[e.slot] !== 'pre' || !m.events.some((h) => h.kind === 'hatch' && h.t === e.t && h.slot === `hatch:${e.slot.slice(6)}`))) bad('where', `${a} ${e.slot} held in by nothing`);
      if (e.kind === 'hab') {
        const r = m.robots.find((q) => q.num === e.by);
        if (!r.track.some(([, x]) => (a === 'blue' ? x : 54 - x) > HAB_LINE + HALF - 1e-6)) bad('where', `${e.by} climbed without ever leaving its HAB zone`);
      }
    }
    // The pieces: never more than the alliance has, and in the sandstorm only the hatch panel in each loading station.
    if (m.supply[a].hatch < 0 || m.supply[a].cargo < 0) bad('stock', `${a} used pieces it didn't have`);
    const early = m.robots.filter((r) => r.alliance === a).flatMap((r) => r.steps.filter((q) => q.kind === 'pickup' && q.from === 'station' && q.t1 < MATCH.sandstorm && q.ok != null));
    if (early.some((q) => q.piece !== 'hatch') || ['far', 'near'].some((w) => early.filter((q) => q.which === w).length > 1)) bad('stock', `${a} fed from a loading station in the sandstorm`);
    // Defense: never touching a robot all the way inside its own HAB zone [G13]; one defender at a time [G9].
    for (const r of m.robots.filter((q) => q.alliance === a)) {
      for (const c of r.contacts) {
        for (const [t, x] of r.track) if (t > c.t0 + 1e-6 && t < c.t1 - 1e-6 && (a === 'blue' ? x : 54 - x) <= HAB_LINE - HALF) bad('g13', `${r.num} touched in its HAB zone at ${t}`);
      }
    }
    const def = m.robots.filter((r) => r.alliance === a).flatMap((r) => r.steps.filter((q) => q.kind === 'defend').map((q) => ({ ...q, num: r.num })));
    for (const p of def) for (const q of def) if (p.num < q.num && Math.min(p.t1, q.t1) - Math.max(p.t0, q.t0) > 0.15) bad('g9', `${a} ${p.num} and ${q.num} both defending at ${Math.max(p.t0, q.t0)}`);
  }
}
function reportRules() {
  check(R.start, `every match starts with the rockets empty, a cargo in each front bay, a cargo or a null hatch panel in each side bay, ${DEPOT_CARGO} cargo a depot`);
  check(R.tilt && R.staged > 0, `at 0:15 staged cargo with no hatch panel rolls out of the cargo ship onto the floor (${R.staged} times), and only sandstorm hatch panels hold it in`);
  check(R.side && R.second > 0, `a second cargo in a rocket level goes to the empty side (${R.second} times), never into the full one`);
  check(R.first > 100 && Math.abs(R.firstH / R.first - 0.5) < 0.1, `a first cargo in a rocket level rolls to either side (${R.firstH} of ${R.first} to the home side)`);
  check(R.roll && R.rolled > 0, `rocket cargo with no hatch panel on its side rolls out and scores nothing (${R.rolled} times), and only robots that chance it lose one`);
  check(R.where, 'nothing scores where it can\'t: hatch panels on empty hatches, cargo behind hatch panels, staged cargo held in only in the sandstorm');
  check(R.stock, 'no alliance uses more than its 24 of each, and in the sandstorm a loading station has only its one hatch panel');
  check(R.g13, 'no robot is touched with its bumpers all the way inside its own HAB zone');
  check(R.g9, 'one robot an alliance defends at a time');
  if (R.why.length) console.log(R.why.join('\n'));
}

// ---- Many matches: the rules hold in every one ----
const N = 300;
let sumOk = true, stepsOk = true, placeOk = true, cargoOk = true, twiceOk = true, habOk = true, rpOk = true, wallsOk = true, piecesMax = 0;
const why = [];
const t0 = performance.now();
const totals = {};
for (let i = 0; i < N; i++) {
  const k = i % 10, m = simulate(qualMatch(500 + i, k));
  // The score is exactly the sum of its events, and every event is worth what the game says.
  const sum = { blue: 0, red: 0 };
  for (const e of m.events) sum[e.alliance] += e.pts;
  if (sum.blue !== m.score.blue || sum.red !== m.score.red) sumOk = false;
  for (const e of m.events) {
    const worth = { hatch: [POINTS.hatch], cargo: [POINTS.cargo], secured: [POINTS.cargo], leave: POINTS.leave.slice(1), hab: POINTS.hab.slice(1) }[e.kind];
    if (!worth?.includes(e.pts)) sumOk = false, why.push(`event worth ${e.pts}: ${e.kind}`);
  }
  // Ranking points as 2019 had them.
  for (const a of ['blue', 'red']) {
    const habPts = m.events.filter((e) => e.alliance === a && e.kind === 'hab').reduce((s, e) => s + e.pts, 0);
    const other = a === 'blue' ? 'red' : 'blue', win = m.score[a] > m.score[other] ? 2 : m.score[a] === m.score[other] ? 1 : 0;
    if (m.rp[a].win !== win || m.rp[a].hab !== (habPts >= 15 ? 1 : 0)) rpOk = false;
  }
  // Every robot's steps run back to back from the start to the buzzer.
  for (const r of m.robots) {
    for (let j = 1; j < r.steps.length; j++) if (Math.abs(r.steps[j].t0 - r.steps[j - 1].t1) > 1e-6) stepsOk = false, why.push(`${r.num} gap at ${r.steps[j].t0}`);
    if (r.steps[0].t0 !== 0 || Math.abs(r.steps.at(-1).t1 - MATCH.length) > 1e-6) stepsOk = false;
    // Never through a rocket, the cargo ship or the HAB's upper levels: its middle stays out of them, except on the
    // HAB itself at the start and the end.
    for (const [t, x, z] of r.track) {
      const own = r.alliance === 'blue' ? x : 54 - x;
      const inside = BLOCKS.find((b) => x > b.x0 + 0.05 && x < b.x1 - 0.05 && z > b.z0 + 0.05 && z < b.z1 - 0.05);
      if (inside && !(inside.what === 'hab' && own < 7) && !(inside.what === 'depot' && own < 7)) wallsOk = false, why.push(`${r.num} in the ${inside.what} at ${t}`);
      if (x < 1.9 || x > 52.1 || z < 1.3 || z > 25.7) wallsOk = false, why.push(`${r.num} through a wall at ${t}`);
    }
    // Every placement is one the robot can make: the piece, the level, the cargo ship.
    let pieces = 0;
    for (const s of r.steps.filter((q) => q.kind === 'place' && !q.cont)) {
      const info = slotInfo(s.slot), p = r.robot[info.piece];
      if (info.struct === 'rocket' && info.level > (p.reach ?? 0)) placeOk = false, why.push(`${r.num} (${r.robot.arch}) ${info.piece} on rocket level ${info.level}`);
      if (info.struct === 'ship' && !p.ship) placeOk = false, why.push(`${r.num} (${r.robot.arch}) ${info.piece} on the ship`);
      if (!(p.reach > 0 || p.ship)) placeOk = false, why.push(`${r.num} (${r.robot.arch}) handled ${info.piece}`);
      if (s.hit && !s.rolled) pieces++;
    }
    piecesMax = Math.max(piecesMax, pieces);
    if (r.steps.filter((q) => q.kind === 'climb').some((q) => !r.robot.climb[q.level])) habOk = false, why.push(`${r.num} climbed a level it can't`);
    (totals[r.num] ??= []).push(r.points);
  }
  // Cargo only goes in behind a hatch (or a null hatch), and nothing goes in twice. The one thing that leaves a bay is
  // staged cargo with no hatch panel in front of it, rolling out of the ship at 0:15.
  for (const a of ['blue', 'red']) {
    const now = {};
    for (const f of m.fills.filter((q) => q.alliance === a)) {
      if (f.value === 0) {
        if (!(now[f.slot] === 'pre' && f.t === MATCH.sandstorm && !now[`hatch:${f.slot.slice(6)}`])) twiceOk = false, why.push(`${a} ${f.slot} emptied at ${f.t}`);
      } else if (now[f.slot] && !(now[f.slot] === 'pre' && f.value === 1)) twiceOk = false, why.push(`${a} ${f.slot} filled twice`);
      if (f.slot.startsWith('cargo:') && f.value === 1 && !now[`hatch:${f.slot.slice(6)}`]) cargoOk = false, why.push(`${a} cargo in ${f.slot} with no hatch`);
      now[f.slot] = f.value;
    }
  }
  // Only one robot an alliance on level 3, and two on level 2.
  for (const a of ['blue', 'red']) {
    const up = m.events.filter((e) => e.alliance === a && e.kind === 'hab');
    if (up.filter((e) => e.pts === 12).length > 1 || up.filter((e) => e.pts === 6).length > 2) habOk = false, why.push(`${a} crowded the HAB`);
  }
  rules(m);
}
const ms = (performance.now() - t0) / N;
check(sumOk, `the score is exactly the sum of the score events, each worth what the game says (${N} matches)`);
check(rpOk, 'ranking points: 2 for a win, 1 for a tie, 1 for 15 or more HAB points');
check(stepsOk, 'every robot does one thing at a time, from 0:00 of the match to the buzzer');
check(wallsOk, 'no robot drives through a rocket, the cargo ship, the HAB or a wall');
check(placeOk, 'no impossible placements: no hatch from a cargo-only robot, no level it cannot reach, no ship for a robot that cannot');
check(cargoOk && twiceOk, 'cargo only goes in behind a hatch or a null hatch, no port takes two pieces, and only staged cargo leaves (at 0:15)');
check(habOk, 'climbs only to levels the robot can reach, one robot on level 3 and two on level 2 an alliance');
check(piecesMax <= 18, `a top robot places a 2019 number of pieces (at most ${piecesMax} in ${N} matches)`);
check(ms < 40, `fast enough for hundreds of matches (${ms.toFixed(1)} ms a match)`);
reportRules();
if (why.length) console.log(why.slice(0, 10).join('\n'));

// ---- Plans ----
{
  const blue = [entry('6834', 9, { climb: 3 }), entry('5518', 0, { climb: 3 }), entry('6038', 0, { climb: 3 })];
  const plans = planAlliance(blue);
  check(plans.filter((p) => p.climb === 3).length === 1 && plans.filter((p) => p.climb === 2).length <= 2, 'three robots asking for level 3: one gets it, the rest step down');
  check(new Set(plans.map((p) => p.lane)).size === 3, 'each robot gets its own lane on the HAB');
  const way = routeBetween({ x: 10, z: 12 }, { x: 44, z: 14 });
  check(way.length > 2, 'the way from one end of the cargo ship to the other goes round it');
  const avg = averages((i) => qualMatch(70 + i, i % 10), 20);
  check(Object.keys(avg).length >= 20 && Object.values(avg).every((v) => v.n > 0 && Number.isFinite(v.avg)), 'averages() gives each team its points a match, for scouting');
}

// ---- Defense ----
{
  let on = 0, off = 0, pins = 0, contacts = 0;
  const runs = 60;
  for (let s = 0; s < runs; s++) {
    const a = simulate({ ...qf(900 + s, true), record: false }), b = simulate({ ...qf(900 + s, false), record: false });
    const star = a.robots.find((r) => r.num === '7777');
    on += star.points;
    off += b.robots.find((r) => r.num === '7777').points;
    contacts += star.contacts.reduce((t, c) => t + c.t1 - c.t0, 0);
    pins += star.contacts.reduce((n, c) => n + c.pinned.length, 0);
  }
  on /= runs;
  off /= runs;
  check(on < off * 0.8, `4471 on 7777 takes its points down: ${on.toFixed(1)} a match against ${off.toFixed(1)} left alone`);
  check(contacts / runs > 40, `4471 stays on it: ${(contacts / runs).toFixed(0)} seconds of contact a match`);
  check(pins > 0 && pins / runs < 6, `it pins it now and then, never for long (${(pins / runs).toFixed(1)} pins a match)`);
  const forced = simulate({ ...qf(5), red: qf(5).red.map((e) => (e.robot.num === '6834' ? { ...e, robot: { ...e.robot, force: { troubles: [{ t: 78, why: 'brownout', dead: true }] } } } : e)) });
  const dead = forced.robots.find((r) => r.num === '6834').steps.find((s) => s.kind === 'dead');
  check(dead && Math.abs(dead.t0 - 78) < 0.11 && dead.t1 === MATCH.length, 'a forced brownout (6834 at 1:12) kills it there for the rest of the match');
}

// ---- The animation agrees with the timeline ----
{
  const m = simulate(qf(7)), show = makeShow(m);
  const end = frameAt(show, MATCH.length);
  check(end.score.blue === m.score.blue && end.score.red === m.score.red, 'the last frame shows the final score');
  let ticks = true, fills = true;
  for (const e of m.events) {
    const same = m.events.filter((q) => q.t === e.t && q.alliance === e.alliance).reduce((s, q) => s + q.pts, 0);
    if (frameAt(show, e.t).score[e.alliance] - frameAt(show, e.t - 1e-4).score[e.alliance] !== same) ticks = false;
    if (e.slot && frameAt(show, e.t - 1e-4).slots[e.alliance][e.slot] === 1) fills = false;
    if (e.slot && frameAt(show, e.t).slots[e.alliance][e.slot] !== 1) fills = false;
  }
  check(ticks, 'the scoreboard ticks at the moment each piece goes in, not before');
  check(fills, 'each piece shows on the field from the moment it scores, and not before');
  let handoffs = true;
  for (const r of m.robots) {
    for (const s of r.steps.filter((q) => q.kind === 'place' && q.hit)) {
      const p = frameAt(show, s.t1 - 0.05).robots.find((q) => q.num === r.num);
      if (!p.handoff || p.handoff.to !== s.slot || p.hold !== s.piece) handoffs = false;
    }
  }
  check(handoffs, 'just before a piece scores, the robot is handing that piece to that port');
  const start = frameAt(show, 0);
  check(start.robots.every((p) => p.up > 0), 'at the start every robot is up on its HAB');
  const t = 60, f = frameAt(show, t);
  check(f.robots.every((p) => Number.isFinite(p.x) && Number.isFinite(p.z) && (p.face === 1 || p.face === -1)), 'every robot has a place and a facing in every frame');
}

// ---- Calibration: each team's average near its story's ----
{
  const runs = 600, pts = {};
  for (let i = 0; i < runs; i++) {
    const k = i % 10, m = simulate({ ...qualMatch(2000 + i, k), record: false });
    for (const r of m.robots) {
      const target = targetOf(r.num, k);
      if (target == null) continue;
      const key = `${r.num}${TEAMS[r.num].targetLate != null ? (k >= TEAMS[r.num].form[0].from ? ' late' : ' early') : ''}`;
      (pts[key] ??= { target, sum: 0, n: 0 }).sum += r.points;
      pts[key].n++;
    }
  }
  const rows = Object.entries(pts).map(([k, v]) => [k, v.sum / v.n, v.target]);
  const off = rows.filter(([, avg, target]) => Math.abs(avg - target) > Math.max(4, target * 0.12));
  console.log(rows.map(([k, avg, target]) => `      ${k.padEnd(11)} ${avg.toFixed(1).padStart(5)}  (story: ${target})`).join('\n'));
  check(off.length === 0, `every team with a story lands near its average over ${runs} random qualification matches${off.length ? `: off: ${off.map(([k]) => k).join(', ')}` : ''}`);
  const fade = pts['7461 late'].sum / pts['7461 late'].n < pts['7461 early'].sum / pts['7461 early'].n - 8;
  const rise = pts['6834 late'].sum / pts['6834 late'].n > pts['6834 early'].sum / pts['6834 early'].n + 12;
  check(fade && rise, "7461 fades after Friday's breakage and 6834 rises after its rebuild, as their forms say");
  check(EVENT.every((n) => ARCHETYPES[TEAMS[n].arch]), 'every team at the event is one of the archetypes');
}

// ---- The opening's quarterfinal ----
// Its seeds and plans were chosen so the matches tell the story; a change to the robots or the simulation can undo
// that, so check it.
{
  check(matchOf(0).winner === 'red', `quarterfinal match 1: 4471 on 7777, and red wins (${MATCHES[0].red}-${MATCHES[0].blue})`);
  check(matchOf(1).winner === 'blue', `quarterfinal match 2: 6834 browns out, and blue wins (${MATCHES[1].red}-${MATCHES[1].blue})`);
  // The lead that makes the call: Level 2 always wins (lead + 6 beats their 12), a missed Level 3 can lose (lead + 3 doesn't).
  check(LEAD + CALLS[0].pts > THEIRS.pts && LEAD + CALLS[1].fail < THEIRS.pts, `match 3 freezes at 0:20 with red up ${LEAD}, so Level 2 is enough and a missed Level 3 isn't`);
  const ways = [['l2', true, true], ['l2', true, false], ['l3', true, true], ['l3', true, false], ['l3', false, true], ['l3', false, false]]
    .map(([call, made, theirsMade]) => ({ call, made, theirsMade, m: matchOf(2, { call, made, theirsMade }) }));
  const before = (m) => JSON.stringify([m.events.filter((e) => e.t <= FREEZE), m.robots.map((r) => r.track.filter((p) => p[0] <= FREEZE))]);
  check(ways.every((w) => before(w.m) === before(ways[0].m)), 'match 3 is the same up to the freeze, whichever way she calls and the climbs go');
  check(ways.every((w) => w.m.events.every((e) => e.t <= FREEZE || (e.kind === 'hab' && [CLIMBER, THEIR_CLIMBER].includes(e.by)))), 'after the freeze, the only points are the two climbers\' climbs');
  const right = ways.every(({ call, made, theirsMade, m }) => {
    const c = CALLS.find((k) => k.key === call), f = scoreAt(m, FREEZE);
    const red = f.red + (made ? c.pts : c.fail), blue = f.blue + (theirsMade ? THEIRS.pts : THEIRS.fail);
    return m.score.red === red && m.score.blue === blue && (m.winner === 'red') === (red > blue);
  });
  check(right, 'each way the endgame goes adds up as the call screen says, every climb settling before the buzzer');
  check(ways.filter((w) => w.call === 'l2').every((w) => w.m.winner === 'red'), 'Level 2 wins match 3 either way 6417\'s climb goes');
}

console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
process.exit(failures ? 1 : 0);
