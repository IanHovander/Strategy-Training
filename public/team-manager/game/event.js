// The regional, as a world: 24 teams, ten rounds of qualification matches, rankings, alliance selection and the
// playoffs, all of it played by the match simulation (../match/sim.js) with the event's robots (../match/robots.js).
// Nothing here is scripted to teach anything. The robots are what they are (7461's intake breaks in its seventh match,
// 6834 rebuilds its own, 5518 goes for Level 3 every match and makes it two times in seven), the schedule and the dice
// are rolled from a seed, and whatever happens on the field is what the rankings, the notebook and the other captains
// go by. The lessons are just things that are true here, for whoever goes and looks. Pure: no DOM, runs in Node.
//
// A round is one match for every team: four matches, six robots each. Seven rounds on Friday, three on Saturday
// morning. A team's k-th match (0 to 9) is round k, so robots.js's forms (a robot changed from its match `from` on)
// fall on the same round for everyone: round 7 is Friday's last.
//
//   TEAMS, NAMES, KIND            the 24 numbers, their names, and each robot's kind in words
//   ROUNDS, FRIDAY                10, and how many of them are Friday's
//   makeSchedule(seed)            the qualification schedule: rounds of four { q, round, blue: [3], red: [3] }
//   entryOf(num, k, plan)         a robot and its whole plan for its match k, as simulate() takes them
//   CHOICES, choicesFor(robot, foes), planFrom(choice)
//                                 what a robot can be told to do in a match, as the plan screen offers it
//   playMatch(seed, match, o)     one match played: o.plans { num: plan } on top of each team's habits, o.k the round
//   recordOf(result, num)         what one robot did in a match, as a scout would write it down
//   standings(played)             the rankings from the matches played so far: ranking points, then points scored
//   habPoints(result, alliance)   an alliance's climb points in a match
//   climbsFor(robot)              the HAB levels a robot can try, with its true odds
//   makeDraft(ranking, o)         alliance selection as a thing to step through (below)
//   eyeOf(num), valueFor(eye, stats, num), saysYes(invited, by, seed, stats)
//                                 how a captain sizes up the field, and whether a captain who's asked says yes
//   bracket(alliances)            the playoffs' quarterfinal pairings, and where winners go
//   coachPlans(alliance, foes)    an alliance's playoff plan, as its own drive coach would call it
//   playSeries(seed, red, blue, o)  a best of three played out with nobody watching

import { simulate, seeded, defaultPlan, MATCH, POINTS, slotInfo } from '../match/sim.js';
import { EVENT, TEAMS as ROBOTS, ARCHETYPES, robotOf, planOf } from '../match/robots.js';
import { OURS } from '../opening/teams.js';

export { OURS };
export const ROUNDS = 10, FRIDAY = 7;
/** The event's teams: robots.js's, less one rookie so that every round is exactly four matches. */
export const TEAMS = EVENT.filter((n) => n !== '9240');

/** Team names. The numbers and names are made up for the game: no real team's robot is portrayed. */
export const NAMES = {
  [OURS]: 'IRON PANTHERS', 7461: 'STORM SURGE', 6834: 'PHOENIX WORKS', 7777: 'LUCKY SEVENS', 6417: 'DEEP SIX',
  6038: 'HIGH WIRE', 6612: 'QUICKSILVER', 8248: 'ARMADA', 9785: 'NIGHT SHIFT', 2202: 'STEADY STATE', 6017: 'SLOW BURN',
  7311: 'HATCHLINGS', 5518: 'MOONSHOT', 4471: 'BRICK HOUSE', 4000: 'GEARHEADS', 2468: 'EVEN STEVENS', 3000: 'OVERCLOCK',
  8086: 'CHIPSET', 5940: 'TIN FOIL', 9152: 'COPPER TOP', 1357: 'ODD SQUAD', 8812: 'LIFT KIT', 7040: 'BULLDOZERS',
  9201: 'FIRST TIMERS',
};
/** What a robot looks like it's for, from across the pits: its kind, in the notebook's words. */
export const KIND = Object.fromEntries(TEAMS.map((n) => [n, ARCHETYPES[ROBOTS[n].arch].name]));

// ---- The schedule ----
function shuffled(list, rand) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
/**
 * Ten rounds of four matches, every team once a round, drawn afresh for each seed: who she plays with and against is
 * the schedule's luck, as at a real event. Match numbers run on through the rounds, Q1 to Q40.
 */
export function makeSchedule(seed) {
  const rand = seeded(seed * 7919 + 13), rounds = [];
  for (let r = 0; r < ROUNDS; r++) {
    const order = shuffled(TEAMS, rand);
    rounds.push([0, 1, 2, 3].map((i) => ({
      q: r * 4 + i + 1, round: r, blue: order.slice(i * 6, i * 6 + 3), red: order.slice(i * 6 + 3, i * 6 + 6),
    })));
  }
  return rounds;
}
/** Her match in a round, and which side she's on. */
export const oursIn = (round) => round.find((m) => m.blue.includes(OURS) || m.red.includes(OURS));
export const sideOf = (match, num = OURS) => (match.blue.includes(num) ? 'blue' : match.red.includes(num) ? 'red' : null);

// ---- Robots and plans ----
/**
 * Seconds before the buzzer a robot heads home for a climb: the drive back (the long way round, at its speed), the
 * climb itself at its slowest, and a few seconds to finish what it's doing. Generous, so a climb fails because the robot
 * slipped (its own odds), and only now and then because a defender held it up on the way home. Never more than 29: the
 * endgame call comes at 0:30, and nobody has set off before it.
 */
const homeTime = (robot, level) => Math.min(29, Math.ceil(level ? 40 / robot.speed + (robot.climb?.[level]?.[1] ?? 3) * 1.15 + 6 : 0));
/** The HAB levels a robot can try, highest first, with the chance it makes each: [{ level, odds }]. */
export const climbsFor = (robot) => [3, 2, 1].filter((l) => robot.climb?.[l]).map((l) => ({ level: l, odds: robot.climb[l][0] }));

/**
 * A team's robot for its match k and its plan in full: its habits, then `plan` on top, with the climb it can really do
 * and the moment it has to head home for it (the simulation doesn't work that out for a climb it's told to try).
 */
export function entryOf(num, k = 0, plan = {}, mods = null) {
  const robot = { num: String(num), ...robotOf(num, { match: k }) };
  if (mods?.force) robot.force = mods.force;
  const p = { ...defaultPlan(robot), ...planOf(num), ...plan };
  if (p.role !== 'defend') delete p.defend;
  // climb 0: it stays out and keeps scoring to the buzzer.
  while (p.climb > 1 && !robot.climb?.[p.climb]) p.climb--;
  p.climbAt = plan.climbAt ?? homeTime(robot, p.climb);
  return { robot, plan: p };
}

/**
 * What she can tell a robot to do, as the plan screen has it. A choice is a job and, for a robot that scores, where and
 * with what: { job: 'score' | 'defend', on (who to defend), where: 'any' | 'rocket' | 'ship', piece: 'both' | 'hatch' |
 * 'cargo' }. `usual` is the team's own habit: what its drive team does if nobody says otherwise.
 */
export function usualChoice(num, robot = robotOf(num)) {
  const h = planOf(num), d = defaultPlan(robot);
  return { job: (h.role ?? d.role) === 'defend' ? 'defend' : 'score', on: null, where: h.where ?? 'any', piece: h.piece ?? d.piece };
}
/** The pieces a robot can handle at all: 'hatch', 'cargo', or both. */
export function piecesOf(robot) {
  const can = (p) => (robot[p]?.reach ?? 0) > 0 || !!robot[p]?.ship;
  return ['hatch', 'cargo'].filter(can);
}
/** A choice as a plan for the simulation. */
export function planFrom(choice) {
  if (choice.job === 'defend') return { role: 'defend', defend: choice.on ?? undefined };
  return { role: 'score', where: choice.where ?? 'any', piece: choice.piece ?? 'both' };
}

// ---- A match ----
/**
 * A match played. match: { blue, red } numbers; o.k: which of each team's matches it is (the round, 0 to 9; 9 for the
 * playoffs: Saturday's robots); o.plans: { num: plan } for the robots someone's planned for (habits for the rest);
 * o.mods: { num: { force } } for the story's few forced moments; o.record: false for a match nobody watches.
 */
export function playMatch(seed, match, o = {}) {
  const k = o.k ?? match.round ?? 0;
  const side = (nums) => nums.map((n) => entryOf(n, k, o.plans?.[n] ?? {}, o.mods?.[n] ?? null));
  return simulate({ seed, blue: side(match.blue), red: side(match.red), record: o.record ?? true });
}
/** An alliance's climb points in a match (15 or more is a ranking point). */
export const habPoints = (result, alliance) => result.events.filter((e) => e.alliance === alliance && e.kind === 'hab').reduce((s, e) => s + e.pts, 0);

const secsOf = (steps) => steps.reduce((s, x) => s + ((x.t1 ?? MATCH.length) - x.t0), 0);
/**
 * What one robot did in a match, the way a scout watching only it would write it down: its points, the pieces it
 * placed and where, what it dropped, its climb, who it defended and who defended it, and whether it died.
 */
export function recordOf(result, num) {
  num = String(num);
  const b = result.robots.find((r) => r.num === num);
  if (!b) return null;
  const mine = result.events.filter((e) => e.by === num), foe = b.alliance === 'blue' ? 'red' : 'blue';
  const placed = mine.filter((e) => e.kind === 'hatch' || e.kind === 'cargo');
  const places = placed.map((e) => slotInfo(e.slot));
  const log = (kind) => result.log.filter((l) => l.by === num && l.kind === kind).length;
  const tried = b.steps.find((s) => s.kind === 'climb');
  const hab = mine.filter((e) => e.kind === 'hab').reduce((s, e) => s + e.pts, 0);
  const died = b.steps.find((s) => s.kind === 'dead' && s.until == null);
  const guarding = b.steps.filter((s) => s.kind === 'defend');
  const held = b.contacts.reduce((s, c) => s + ((c.t1 ?? MATCH.length) - c.t0), 0);
  const stuck = b.steps.filter((s) => s.kind === 'wait' && ['no room', 'a partner is there', 'nothing to do'].includes(s.why));
  return {
    num, alliance: b.alliance, pts: b.points,
    hatch: mine.filter((e) => e.kind === 'hatch').length,
    cargo: mine.filter((e) => e.kind === 'cargo').length,
    // Cargo staged in the cargo ship that one of its sandstorm hatch panels held in: its points, though it never touched it.
    secured: mine.filter((e) => e.kind === 'secured').length,
    leave: mine.filter((e) => e.kind === 'leave').reduce((s, e) => s + e.pts, 0),
    top: places.reduce((m, i) => Math.max(m, i.struct === 'rocket' ? i.level : 0), 0),
    ship: places.filter((i) => i.struct === 'ship').length,
    rocket: places.filter((i) => i.struct === 'rocket').length,
    missed: log('miss') + log('fumble'), rolled: log('rolled'),
    // A climb tried (made or not), or a robot that just drove up onto Level 1 and parked.
    climb: tried ? { level: tried.level, made: tried.made === true } : hab ? { level: 1, made: true, park: true } : null,
    hab,
    dead: died ? { why: died.why, at: Math.round(died.t0) } : null,
    brownouts: b.steps.filter((s) => s.kind === 'dead' && s.until != null).length,
    // Who it defended, for how long, whether that was the plan, and what its target scored with it there.
    defended: guarding.length ? {
      on: guarding.at(-1).target, secs: Math.round(secsOf(guarding)), planned: b.plan.role === 'defend',
      pts: result.robots.find((r) => r.num === guarding.at(-1).target)?.points ?? 0,
    } : null,
    held: Math.round(held), by: [...new Set(b.contacts.flatMap((c) => c.by))],
    stuck: Math.round(secsOf(stuck)),
    score: result.score[b.alliance], against: result.score[foe],
    won: result.winner === b.alliance, tied: result.winner === 'tie',
  };
}

// ---- Rankings ----
/**
 * The rankings from the matches played so far: [{ num, rank, rp, played, w, l, t, pts }], best first. Ranking points
 * decide it (2 for a win, 1 for a tie, 1 for a complete rocket, 1 for 15 points of climbing), then the points the
 * team's alliances scored. played: [{ match: { blue, red }, result }].
 */
export function standings(played) {
  const row = Object.fromEntries(TEAMS.map((n) => [n, { num: n, rp: 0, played: 0, w: 0, l: 0, t: 0, pts: 0 }]));
  for (const { match, result } of played) {
    for (const al of ['blue', 'red']) {
      for (const n of match[al]) {
        const t = row[n];
        if (!t) continue;
        t.played++;
        t.rp += result.rp[al].total;
        t.pts += result.score[al];
        if (result.winner === al) t.w++;
        else if (result.winner === 'tie') t.t++;
        else t.l++;
      }
    }
  }
  const table = Object.values(row).sort((a, b) => b.rp - a.rp || b.pts - a.pts || Number(a.num) - Number(b.num));
  table.forEach((t, i) => (t.rank = i + 1));
  return table;
}

// ---- How a captain sizes up the field ----
/**
 * A captain's eye: what they go by when they pick. Most go by the average: every match a robot's played, added up.
 * Some go by the last few matches (the robot as it is now), and some pick for what their alliance hasn't got. 4000's
 * strategist always takes the biggest average; 7777's scout, Juno, misses nothing.
 */
const EYES = { 7777: 'sharp', 4000: 'average', 3000: 'fit', 2468: 'recent' };
export function eyeOf(num) {
  if (EYES[num]) return EYES[num];
  return ['average', 'average', 'recent', 'fit'][Number(num) % 4];
}
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
/**
 * What each team's done all weekend, as the other teams' scouts have it: stats[num] = { avg, recent, defends, taken,
 * l3: [made, tried], died }. records: { num: [recordOf, ...] } in match order. taken: what its defense took off the
 * robots it was on, a match (0 for a robot that doesn't defend).
 */
export function fieldStats(records) {
  const base = Object.fromEntries(Object.entries(records).map(([n, rs]) => [n, mean(rs.map((r) => r.pts))]));
  const stats = {};
  for (const [n, rs] of Object.entries(records)) {
    const guarded = rs.filter((r) => r.defended?.planned);
    stats[n] = {
      avg: mean(rs.map((r) => r.pts)), recent: mean(rs.slice(-4).map((r) => r.pts)),
      defends: guarded.length / Math.max(1, rs.length),
      // What a defender is worth: about what its target lost. Its targets' usual scores, against what they got.
      taken: mean(guarded.map((r) => Math.max(0, (base[r.defended.on] ?? r.defended.pts) - r.defended.pts))),
      l3: [rs.filter((r) => r.climb?.level === 3 && r.climb.made).length, rs.filter((r) => r.climb?.level === 3).length],
      died: rs.filter((r) => r.dead).length,
    };
  }
  return stats;
}
/**
 * What a team is worth to a captain with this eye, picking for an alliance that already has `have` (numbers): points a
 * match, more or less. A defender is worth what it takes off the other side, to a captain who has no defender yet and
 * knows to look; to the rest it's just a small number.
 */
export function valueFor(eye, stats, num, have = []) {
  const s = stats[num];
  if (!s) return 0;
  const scoring = eye === 'average' ? s.avg : eye === 'recent' ? s.recent : 0.3 * s.avg + 0.7 * s.recent;
  if (eye === 'average' || eye === 'recent') return scoring;
  const haveDefender = have.some((n) => (stats[n]?.defends ?? 0) > 0.5);
  const asDefender = s.defends > 0.5 && !haveDefender && have.length >= 2 ? s.taken * 1.15 + s.avg * 0.3 : 0;
  // A robot that dies a lot is worth less to anyone looking closely.
  return Math.max(scoring, asDefender) * (1 - 0.06 * s.died);
}

// ---- Alliance selection ----
/**
 * Alliance selection, to step through. The top eight are captains. Round one picks from alliance 1 down to 8, round two
 * from 8 back up to 1. A captain can invite any team ranked below them, another captain included: if a captain says
 * yes, everyone below moves up a place and the best team left becomes a captain. With 24 teams, everyone ends up on an
 * alliance.
 *
 *   const d = makeDraft(ranking, { stats })       ranking: numbers, best first
 *   d.alliances      [{ seed, teams: [captain, first pick, second pick] }], as it stands
 *   d.pool()         who can still be invited by whoever's picking, best ranked first
 *   d.turn()         { round, alliance (its place, 0 to 7), captain } whose pick it is, or null when it's over
 *   d.wish(o)        who that captain would invite, by their own eye
 *   d.pick(num)      they invite num, and num says yes: { alliance, round, num, wasCaptain, promoted }
 *   d.decline(num)   num (a captain) says no: they keep their own alliance and can't be invited again
 *   d.of(num)        the alliance num is on, or null
 */
export function makeDraft(ranking, { stats = {} } = {}) {
  const order = ranking.map(String);
  const alliances = order.slice(0, 8).map((c, i) => ({ seed: i + 1, teams: [c] }));
  const waiting = order.slice(8);
  const said = new Set(); // captains who've turned an invitation down
  let round = 1, at = 0;
  const done = () => round > 2;
  const of = (num) => alliances.find((a) => a.teams.includes(String(num))) ?? null;
  function turn() {
    return done() ? null : { round, alliance: at, captain: alliances[at].teams[0] };
  }
  /** Who alliance i's captain could invite now (whoever's picking, if not given). */
  function pool(i = at) {
    if (done()) return [];
    // Round one: the captains below whoever's picking can be asked too, unless they've already said no.
    const below = round === 1 ? alliances.slice(i + 1).filter((a) => a.teams.length === 1).map((a) => a.teams[0]).filter((c) => !said.has(c)) : [];
    return [...below, ...waiting];
  }
  const isCaptain = (num) => alliances.some((a) => a.teams[0] === String(num));
  function step() {
    if (round === 1) {
      at++;
      if (at > 7) [round, at] = [2, 7];
    } else {
      at--;
      if (at < 0) round = 3;
    }
  }
  function pick(num) {
    num = String(num);
    const t = turn(), a = alliances[t.alliance];
    const their = alliances.findIndex((x) => x !== a && x.teams[0] === num);
    let promoted = null;
    if (their >= 0) {
      // A captain's said yes: their alliance is gone, everyone below moves up, and the best team left captains the 8th.
      alliances.splice(their, 1);
      promoted = waiting.shift() ?? null;
      if (promoted) alliances.push({ seed: 8, teams: [promoted] });
      alliances.forEach((x, i) => (x.seed = i + 1));
    } else waiting.splice(waiting.indexOf(num), 1);
    a.teams.push(num);
    const made = { alliance: alliances.indexOf(a), round: t.round, num, wasCaptain: their >= 0, promoted };
    step();
    return made;
  }
  /** Who the captain picking would take: the best there is by their own eye; never a captain who'd make them worse off. */
  function wish({ avoid = [] } = {}) {
    const t = turn(), a = alliances[t.alliance], eye = eyeOf(t.captain);
    let best = null, bestV = -Infinity;
    for (const n of pool()) {
      if (avoid.includes(n)) continue;
      const v = valueFor(eye, stats, n, a.teams);
      if (v > bestV) [best, bestV] = [n, v];
    }
    return best;
  }
  return { alliances, pool, turn, pick, wish, of, isCaptain, decline: (num) => said.add(String(num)), get over() { return done(); } };
}

/**
 * Whether a captain who's been invited says yes. Asked by one of the top two seeds, always; otherwise only by a team
 * that's about as good as they are (a robot ten points a match weaker than yours isn't an offer, it's a favour).
 */
export function saysYes(invited, by, bySeed, stats) {
  if (bySeed <= 2) return true;
  return (stats[by]?.avg ?? 0) + 4 >= (stats[invited]?.avg ?? 0);
}

// ---- The playoffs ----
/** The quarterfinals: 1 plays 8, 4 plays 5, 2 plays 7, 3 plays 6; the first two winners meet, and the last two. */
export const QUARTERS = [[0, 7], [3, 4], [1, 6], [2, 5]];
/**
 * An alliance's plan for a playoff match as its own drive coach would call it, against `foes` (numbers): everyone at
 * what they do best, the one robot that can going for Level 3; and if there's a real defender on the alliance, it goes
 * on the other side's most dangerous robot: the one that scores the most and gives way the easiest. stats: fieldStats.
 */
export function coachPlans(nums, foes, stats = {}) {
  const plans = {};
  const robots = Object.fromEntries([...nums, ...foes].map((n) => [n, robotOf(n, { match: 9 })]));
  const danger = (n) => (stats[n]?.recent ?? 20) * (robots[n].susceptibility ?? 0.5);
  const target = [...foes].sort((a, b) => danger(b) - danger(a))[0];
  // One defender at a time (G9): the alliance's best wall, if it has one.
  const wall = nums.filter((n) => planOf(n).role === 'defend' || (robots[n].defense ?? 0) >= 0.7)
    .sort((a, b) => (robots[b].defense ?? 0) - (robots[a].defense ?? 0))[0];
  for (const n of nums) plans[n] = n === wall && target ? { role: 'defend', defend: target } : { role: 'score' };
  return plans;
}
/**
 * A best of three played out with nobody watching: red is the higher seed. Returns { wins: { red, blue }, winner,
 * scores: [[red, blue], ...] }. A tie is played again. o.mods(i): the story's forced moments for match i.
 */
export function playSeries(seed, red, blue, o = {}) {
  const wins = { red: 0, blue: 0 }, scores = [];
  for (let i = 0; i < 5 && wins.red < 2 && wins.blue < 2; i++) {
    const plans = { ...coachPlans(red, blue, o.stats), ...coachPlans(blue, red, o.stats), ...(o.plans ?? {}) };
    const r = playMatch(seed * 31 + i * 7 + 1, { red, blue }, { k: 9, plans, mods: o.mods?.(i, scores.length) ?? null, record: false });
    scores.push([r.score.red, r.score.blue]);
    if (r.winner !== 'tie') wins[r.winner]++;
  }
  return { wins, winner: wins.red >= 2 ? 'red' : 'blue', scores };
}
