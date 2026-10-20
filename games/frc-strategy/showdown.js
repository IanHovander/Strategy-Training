// The Showdown match model: alliances of three robots, each robot on one plan. Pure functions, shared by
// rules.js (scoring), the screens (showing the odds) and the tests.
//
// A round (lesson1-showdown.js) sets the numbers:
//   cycle   { n, p, value }   n tries at p, value points each: many small, reliable scores
//   power   { n, p, value }   few big, risky scores
//   climb   { cycles, p, value, capacity }   a few cycles, then a climb; only `capacity` robots per alliance fit
//   crowd   each extra teammate on the same scoring plan (cycle or power) lowers everyone's p on it by this much
//   defense { cycle, power }  how much a defender lowers the p of the robot it guards. Each defender guards the
//                             most dangerous opposing scorer not already guarded (a climber's cycles count as cycle)
//   bonus   { at, points }    optional: points for each player if their alliance reaches `at`
import { add, atLeast, binomial, mean, sample } from './prob.js';

export const PLANS = [
  { id: 'cycle', name: 'Cycle', icon: '⟳', blurb: 'Many small, reliable scores' },
  { id: 'power', name: 'Power Shot', icon: '✸', blurb: 'A few big, risky scores' },
  { id: 'defend', name: 'Defend', icon: '⛨', blurb: 'Score nothing, slow their scorers' },
  { id: 'climb', name: 'Climb', icon: '▲', blurb: 'A few cycles, then the endgame climb' },
];
export const PLAN_IDS = PLANS.map((p) => p.id);
export const planById = (id) => PLANS.find((p) => p.id === id) ?? null;

const scaled = (d, value) => d.map(([k, p]) => [k * value, p]);
const clampP = (p) => Math.min(1, Math.max(0.02, p));

/**
 * Each robot's success rates after crowding and the opponent's defense: [{ plan, p, climbP, guarded }].
 * `plans` is our three plans, `theirs` the opponent's. Each defender guards one of our scorers, the most
 * dangerous one not already guarded (highest average after crowding).
 */
export function effectiveRates(round, plans, theirs) {
  const count = (plan) => plans.filter((x) => x === plan).length;
  let climbers = 0;
  const rates = plans.map((plan) => {
    if (plan === 'defend') return { plan, p: 0, climbP: 0, guarded: false };
    if (plan === 'climb') {
      climbers++;
      // no room on the structure: no climb attempt
      return { plan, p: round.cycle.p, climbP: climbers <= round.climb.capacity ? round.climb.p : 0, guarded: false };
    }
    return { plan, p: clampP(round[plan].p - (round.crowd ?? 0) * (count(plan) - 1)), climbP: 0, guarded: false };
  });
  const defenders = theirs.filter((x) => x === 'defend').length;
  const targets = rates
    .map((rate, i) => ({ i, value: rate.plan === 'defend' ? -1 : mean(robotDist(round, rate)) }))
    .filter((t) => t.value >= 0)
    .sort((x, y) => y.value - x.value || x.i - y.i)
    .slice(0, defenders);
  for (const { i } of targets) {
    const rate = rates[i];
    const hit = rate.plan === 'climb' ? round.defense.cycle : round.defense[rate.plan];
    rates[i] = { ...rate, p: clampP(rate.p - hit), guarded: true };
  }
  return rates;
}

/** The distribution of one robot's score, given its effective rates. */
function robotDist(round, rate) {
  if (rate.plan === 'defend') return [[0, 1]];
  if (rate.plan === 'climb') {
    const cycles = scaled(binomial(round.climb.cycles, rate.p), round.cycle.value);
    return add(cycles, [[0, 1 - rate.climbP], [round.climb.value, rate.climbP]]);
  }
  const { n, value } = round[rate.plan];
  return scaled(binomial(n, rate.p), value);
}

/** The distribution of an alliance's total. */
export function allianceDist(round, plans, theirs) {
  return effectiveRates(round, plans, theirs).reduce((total, rate) => add(total, robotDist(round, rate)), [[0, 1]]);
}

/** Everything about one pairing: each side's chances, averages and bonus chance. */
export function matchOdds(round, plansA, plansB) {
  const a = allianceDist(round, plansA, plansB);
  const b = allianceDist(round, plansB, plansA);
  let win = 0;
  let tie = 0;
  for (const [x, p] of a) for (const [y, q] of b) {
    if (x > y) win += p * q;
    else if (x === y) tie += p * q;
  }
  const bonus = (d) => (round.bonus ? atLeast(d, round.bonus.at) : 0);
  return {
    a: { win, tie, mean: mean(a), bonus: bonus(a), dist: a },
    b: { win: Math.max(0, 1 - win - tie), tie, mean: mean(b), bonus: bonus(b), dist: b },
  };
}

/** Play the match once: a score for each side, drawn from their distributions. */
export const playMatch = (odds) => [sample(odds.a.dist), sample(odds.b.dist)];

/** The plan (or plans) an alliance uses most. */
export function mostUsed(plans) {
  const counts = Object.fromEntries(PLAN_IDS.map((id) => [id, plans.filter((x) => x === id).length]));
  const top = Math.max(...Object.values(counts));
  return PLAN_IDS.filter((id) => counts[id] === top);
}
