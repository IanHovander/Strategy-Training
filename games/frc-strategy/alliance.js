// The Showdown match model: each robot's true score distribution, breakdowns, and defense. Pure functions, shared
// by the rules (playing matches, simulating scouting data), the screens and the tests.
// A distribution is a list of [points, probability] (see prob.js).
import { add, mean, sample } from './prob.js';

/** A team's score when it works: whole points around its mean, normal-shaped, never below 0. */
export function workingDist(team) {
  const lo = Math.max(0, Math.floor(team.mean - 3 * team.spread));
  const hi = Math.ceil(team.mean + 3 * team.spread);
  const weights = [];
  for (let x = lo; x <= hi; x++) weights.push([x, Math.exp(-((x - team.mean) ** 2) / (2 * team.spread ** 2))]);
  const total = weights.reduce((s, [, w]) => s + w, 0);
  return weights.map(([x, w]) => [x, w / total]);
}

/** A team's full score distribution: it breaks (0 points) with probability `broken`. */
export function scoreDist(team, keep = 1) {
  const out = new Map([[0, team.broken]]);
  for (const [x, p] of workingDist(team)) {
    const v = Math.round(x * keep);
    out.set(v, (out.get(v) ?? 0) + p * (1 - team.broken));
  }
  return [...out].filter(([, p]) => p > 0).sort((a, b) => a[0] - b[0]);
}

/** The share of its points a robot keeps when these (working) defenders guard it. */
export const keepShare = (team, defenders) => defenders.reduce((k, d) => k * (1 - d.defense * (1 - team.resilience)), 1);

/**
 * An alliance's score distribution. `ours` and `theirs` are lists of teams; `assign` maps each of our team ids to
 * 'offense' or the id of the robot it defends; `theirAssign` is theirs. Their defenders only count when they work.
 */
export function allianceDist(ours, assign, theirs, theirAssign) {
  const defenders = theirs.filter((t) => theirAssign[t.id] && theirAssign[t.id] !== 'offense');
  // every combination of which of their defenders are working
  let total = [];
  for (let mask = 0; mask < 1 << defenders.length; mask++) {
    let weight = 1;
    const working = defenders.filter((d, k) => {
      const on = (mask >> k) & 1;
      weight *= on ? 1 - d.broken : d.broken;
      return on;
    });
    if (weight === 0) continue;
    let dist = [[0, 1]];
    for (const team of ours) {
      if (assign[team.id] !== 'offense') continue; // our defenders score nothing
      const guards = working.filter((d) => theirAssign[d.id] === team.id);
      dist = add(dist, scoreDist(team, keepShare(team, guards)));
    }
    total = total.concat(dist.map(([v, p]) => [v, p * weight]));
  }
  const merged = new Map();
  for (const [v, p] of total) merged.set(v, (merged.get(v) ?? 0) + p);
  return [...merged].sort((a, b) => a[0] - b[0]);
}

/** Each alliance's chance to win, tie chance and average: { a: { win, tie, mean }, b: {...} }. */
export function matchOdds(a, assignA, b, assignB) {
  const da = allianceDist(a, assignA, b, assignB);
  const db = allianceDist(b, assignB, a, assignA);
  let win = 0;
  let tie = 0;
  let below = 0; // P(b < current x), walking up da
  let j = 0;
  for (const [x, p] of da) {
    while (j < db.length && db[j][0] < x) below += db[j++][1];
    win += p * below;
    if (j < db.length && db[j][0] === x) tie += p * db[j][1];
  }
  return { a: { win, tie, mean: mean(da) }, b: { win: Math.max(0, 1 - win - tie), tie, mean: mean(db) } };
}

/**
 * Play one match from the robots' attributes: who breaks, then each robot's points.
 * Returns { scores: [a, b], broken: [ids], points: { id: points } }.
 */
export function playMatch(a, assignA, b, assignB, rand = Math.random) {
  const broken = new Set([...a, ...b].filter((t) => rand() < t.broken).map((t) => t.id));
  const points = {};
  const side = (ours, assign, theirs, theirAssign) => {
    let total = 0;
    for (const team of ours) {
      if (assign[team.id] !== 'offense' || broken.has(team.id)) {
        points[team.id] = 0;
        continue;
      }
      const guards = theirs.filter((d) => theirAssign[d.id] === team.id && !broken.has(d.id));
      points[team.id] = Math.round(sample(workingDist(team), rand) * keepShare(team, guards));
      total += points[team.id];
    }
    return total;
  };
  return { scores: [side(a, assignA, b, assignB), side(b, assignB, a, assignA)], broken: [...broken], points };
}

/** One normally distributed number (Box–Muller). */
function normal(rand) {
  return Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
}

/**
 * What the scouts saw: `matches` qualification scores drawn from the team's true distribution (undefended), and
 * 1–10 ratings of its resilience and defense with scouting error.
 */
export function scoutTeam(team, { qualMatches: matches, ratingError }, rand = Math.random) {
  const scores = Array.from({ length: matches }, () => (rand() < team.broken ? 0 : sample(workingDist(team), rand)));
  const rate = (v) => Math.min(10, Math.max(1, Math.round(10 * v + ratingError * normal(rand))));
  return { scores, resilience: rate(team.resilience), defense: rate(team.defense) };
}

/** Score ranges for the scouting histogram. */
export const BUCKETS = [
  { label: '0', test: (v) => v === 0 },
  { label: '1–9', test: (v) => v >= 1 && v <= 9 },
  { label: '10–19', test: (v) => v >= 10 && v <= 19 },
  { label: '20–29', test: (v) => v >= 20 && v <= 29 },
  { label: '30–39', test: (v) => v >= 30 && v <= 39 },
  { label: '40–49', test: (v) => v >= 40 && v <= 49 },
  { label: '50+', test: (v) => v >= 50 },
];
export const bucketCounts = (scores) => BUCKETS.map((b) => scores.filter(b.test).length);
