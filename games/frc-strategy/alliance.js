// The Alliance Selection match model: two alliances of three robots, each robot with its own abilities, each on
// one plan. Pure functions, shared by rules.js (scoring), the screens and the tests.
//
// A robot (lesson1-draft.js) has its TRUE abilities, which the model uses (players only see the scouting report):
//   cycle   { n, p }          n tries a match at p, field.cycleValue points each: steady scoring
//   power   { n, p, value }   optional: a few big, risky shots
//   climb   { p, value }      optional: the endgame climb
//   defense { cycle, power }  how much it lowers the p of the robot it guards when it plays Defend
//   dead    chance it breaks down and scores nothing that match
// The field sets the rest: cycleValue, crowd (each extra teammate on the same scoring plan lowers everyone's p on
// it by this much), climbCapacity (robots per alliance that fit on the climb).
import { add, binomial, mean, sample } from './prob.js';

export const PLANS = [
  { id: 'cycle', name: 'Cycle', icon: '⟳' },
  { id: 'power', name: 'Power Shot', icon: '✸' },
  { id: 'defend', name: 'Defend', icon: '⛨' },
  { id: 'climb', name: 'Climb', icon: '▲' },
];
export const planById = (id) => PLANS.find((p) => p.id === id) ?? null;

/** The plans a robot can run: Cycle and Defend always, Power Shot and Climb only with the hardware. */
export const robotPlans = (robot) => PLANS.map((p) => p.id).filter((id) => (id === 'power' ? !!robot.power : id === 'climb' ? !!robot.climb : true));

const clampP = (p) => Math.min(1, Math.max(0.02, p));
const scaled = (d, value) => d.map(([k, p]) => [k * value, p]);

/** One robot's score when everything goes to plan (before breakdowns). */
function working(field, robot, rate) {
  if (rate.plan === 'defend') return [[0, 1]];
  if (rate.plan === 'power') return scaled(binomial(robot.power.n, rate.p), robot.power.value);
  const cycles = rate.plan === 'climb' ? Math.ceil(robot.cycle.n / 2) : robot.cycle.n; // climbers leave early
  const d = scaled(binomial(cycles, rate.p), field.cycleValue);
  return rate.plan === 'climb' ? add(d, [[0, 1 - rate.climbP], [robot.climb.value, rate.climbP]]) : d;
}

/** One robot's score distribution, including the chance it breaks down. */
export function robotDist(field, robot, rate) {
  const merged = new Map([[0, robot.dead]]);
  for (const [v, p] of working(field, robot, rate)) merged.set(v, (merged.get(v) ?? 0) + p * (1 - robot.dead));
  return [...merged].filter(([, p]) => p > 0).sort((x, y) => x[0] - y[0]);
}

/**
 * Each robot's success rates after crowding and the other alliance's defense: [{ plan, p, climbP, guardedBy }].
 * Defenders, strongest first, each guard the most dangerous scorer not already guarded.
 */
export function effectiveRates(field, ours, theirs) {
  const count = (plan) => ours.plans.filter((x) => x === plan).length;
  let climbers = 0;
  const rates = ours.robots.map((robot, i) => {
    const plan = ours.plans[i];
    if (plan === 'defend') return { plan, p: 0, climbP: 0, guardedBy: null };
    if (plan === 'climb') {
      climbers++;
      return { plan, p: robot.cycle.p, climbP: climbers <= field.climbCapacity ? robot.climb.p : 0, guardedBy: null };
    }
    const base = plan === 'power' ? robot.power.p : robot.cycle.p;
    return { plan, p: clampP(base - field.crowd * (count(plan) - 1)), climbP: 0, guardedBy: null };
  });
  const defenders = theirs.robots
    .map((robot, i) => ({ robot, i }))
    .filter(({ i }) => theirs.plans[i] === 'defend')
    .sort((a, b) => b.robot.defense.power - a.robot.defense.power);
  const targets = rates
    .map((rate, i) => ({ i, value: rate.plan === 'defend' ? -1 : mean(working(field, ours.robots[i], rate)) }))
    .filter((t) => t.value >= 0)
    .sort((a, b) => b.value - a.value || a.i - b.i);
  defenders.forEach(({ robot }, k) => {
    const target = targets[k];
    if (!target) return;
    const rate = rates[target.i];
    const hit = rate.plan === 'power' ? robot.defense.power : robot.defense.cycle;
    rates[target.i] = { ...rate, p: clampP(rate.p - hit), guardedBy: robot.id };
  });
  return rates;
}

/** The distribution of an alliance's total score. */
export function allianceDist(field, ours, theirs) {
  const rates = effectiveRates(field, ours, theirs);
  return ours.robots.reduce((total, robot, i) => add(total, robotDist(field, robot, rates[i])), [[0, 1]]);
}

/**
 * Both sides' chances: { a: { win, tie, mean, dist }, b: {...} }.
 * Each side is { robots, plans }, plans in the same order as robots.
 */
export function matchOdds(field, a, b) {
  const da = allianceDist(field, a, b);
  const db = allianceDist(field, b, a);
  let win = 0;
  let tie = 0;
  for (const [x, p] of da) for (const [y, q] of db) {
    if (x > y) win += p * q;
    else if (x === y) tie += p * q;
  }
  return {
    a: { win, tie, mean: mean(da), dist: da },
    b: { win: Math.max(0, 1 - win - tie), tie, mean: mean(db), dist: db },
  };
}

export const playMatch = (odds) => [sample(odds.a.dist), sample(odds.b.dist)];

/** The plan a robot runs if nobody chooses: its highest-average scoring plan on its own. */
export function bestPlan(field, robot) {
  const solo = (plan) => {
    const rate = effectiveRates(field, { robots: [robot], plans: [plan] }, { robots: [], plans: [] })[0];
    return mean(robotDist(field, robot, rate));
  };
  return robotPlans(robot)
    .filter((p) => p !== 'defend')
    .sort((x, y) => solo(y) - solo(x))[0];
}

/** A robot's average on each plan it can run, alone on the field: { cycle: 18.2, ... }. */
export function planAverages(field, robot) {
  return Object.fromEntries(
    robotPlans(robot)
      .filter((p) => p !== 'defend')
      .map((plan) => {
        const rate = effectiveRates(field, { robots: [robot], plans: [plan] }, { robots: [], plans: [] })[0];
        return [plan, mean(robotDist(field, robot, rate))];
      }),
  );
}
