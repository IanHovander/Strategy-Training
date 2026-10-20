// The Showdown match model: cycles and defense. Pure functions, shared by the rules (playing matches, simulating
// scouting), the screens and the tests. A distribution is a list of [value, probability] (see prob.js).
//
// The one rule: a robot being defended loses (defender's ability × its own susceptibility) of what it does.
//   - On offense: each of its cycles succeeds with probability 1 − ability × susceptibility.
//   - On defense: its defense ability is multiplied by 1 − ability × susceptibility.
// Roles are static: a robot plays offense or defends for the whole match.
//
// Time: a match runs from 0 (start) to 1 (end). An offense robot's attempts are spread evenly through it (with n
// attempts, attempt k happens at (k − ½) / n). Robots break: on offense, a breakdown is its chance of 0 cycles. A
// defender breaks with that chance plus `defenderExtra` (5 points by default), at a random moment; it defends
// until then and does nothing after, so it may defend some of a robot's cycles and not others.
//
// An assignment for one robot is 'offense' or { target, ifDefending }: defend robot `target`; if that robot is
// itself defending, 'stay' on it (weakening its defense) or switch to the robot id in `ifDefending`.
import { sample } from './prob.js';

export const MATCH_SECONDS = 150; // for showing breakdown times as m:ss
const SIMULATIONS = 20000;

const dists = new WeakMap();
/** A team's true cycle distribution as [[cycles, probability]] (worked out once per team). */
export function cycleDist(team) {
  if (!dists.has(team)) dists.set(team, team.cycles.map((p, n) => [n, p]).filter(([, p]) => p > 0));
  return dists.get(team);
}

/** How much of what a robot does survives a defender: 1 − ability × susceptibility. */
export const keepShare = (ability, susceptibility) => 1 - ability * susceptibility;

/** A defender's chance of breaking down during the match: its usual chance of 0 cycles, plus `extra`. */
export const defenderBreak = (team, extra = 0.05) => Math.min(1, team.cycles[0] + extra);

/** The moment in the match attempt k (0-based) of n happens. */
export const attemptTime = (k, n) => (k + 0.5) / n;

/**
 * Who does what, from the assignments (breakdowns don't change plans). `sides` = [{ teams, assign }, …].
 * Returns per robot id:
 *   { role: 'offense', defenders: [ids] }
 *   { role: 'defend', target, shadowing, shadowedBy: [ids], switched }
 *     `target` is the robot it guards; `shadowing` is true when that robot is defending too.
 * A defender switches to its fallback when its first choice is assigned to defend.
 */
export function resolve(sides) {
  const all = sides.flatMap((s) => s.teams.map((t) => ({ team: t, a: s.assign[t.id] ?? 'offense' })));
  const byId = Object.fromEntries(all.map((r) => [r.team.id, r]));
  const out = {};
  for (const r of all) {
    if (r.a === 'offense') continue;
    let target = r.a.target;
    let switched = false;
    if (byId[target]?.a !== 'offense' && r.a.ifDefending && r.a.ifDefending !== 'stay') {
      target = r.a.ifDefending;
      switched = true;
    }
    out[r.team.id] = { role: 'defend', target, switched, shadowing: byId[target]?.a !== 'offense', shadowedBy: [] };
  }
  for (const [id, d] of Object.entries(out)) if (d.shadowing) out[d.target].shadowedBy.push(id);
  for (const r of all) {
    if (r.a !== 'offense') continue;
    out[r.team.id] = { role: 'offense', defenders: Object.keys(out).filter((id) => !out[id].shadowing && out[id].target === r.team.id) };
  }
  return out;
}

/**
 * A defender's ability at moment u: 0 once it has broken down; otherwise its defense, cut by each shadow still
 * running. `brokeAt[id]` is when a robot broke (absent = it didn't).
 */
export function abilityAt(teams, roles, id, u, brokeAt) {
  if ((brokeAt[id] ?? 2) <= u) return 0;
  return roles[id].shadowedBy.reduce((a, s) => ((brokeAt[s] ?? 2) <= u ? a : a * keepShare(teams[s].defense, teams[id].susceptibility)), teams[id].defense);
}

/** The chance an offense robot's cycle at moment u succeeds, given every defender still running then. */
export function successAt(teams, roles, id, u, brokeAt) {
  return roles[id].defenders.reduce((p, d) => p * keepShare(abilityAt(teams, roles, d, u, brokeAt), teams[id].susceptibility), 1);
}

/**
 * Play one match. Defenders that break get a moment; offense robots attempt their cycles through the match.
 * Returns { scores, cycles: { id: made }, attempts: { id }, defended: { id: attempts made while defended },
 *           brokeAt: { defender id: moment 0–1 }, roles }.
 */
export function playMatch(sides, rand = Math.random, { defenderExtra = 0.05 } = {}) {
  const teams = Object.fromEntries(sides.flatMap((s) => s.teams).map((t) => [t.id, t]));
  const roles = resolve(sides);
  const brokeAt = {};
  for (const [id, r] of Object.entries(roles)) if (r.role === 'defend' && rand() < defenderBreak(teams[id], defenderExtra)) brokeAt[id] = rand();
  const cycles = {};
  const attempts = {};
  const defended = {};
  const scores = sides.map((s) =>
    s.teams.reduce((total, t) => {
      if (roles[t.id].role !== 'offense') return total;
      const n = sample(cycleDist(t), rand);
      let made = 0;
      let guarded = 0;
      for (let k = 0; k < n; k++) {
        const p = successAt(teams, roles, t.id, attemptTime(k, n), brokeAt);
        if (p < 1) guarded++;
        if (rand() < p) made++;
      }
      cycles[t.id] = made;
      attempts[t.id] = n;
      defended[t.id] = guarded;
      return total + made;
    }, 0),
  );
  return { scores, cycles, attempts, defended, brokeAt, roles };
}

/** A small seeded random number generator, so the same plans always give the same estimate. */
function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Each alliance's chance to win, the tie chance and average cycles, from simulating the match many times
 * (breakdown timing makes an exact formula unwieldy). Within about 1% of the true chance.
 */
export function matchOdds(sides, { defenderExtra = 0.05, runs = SIMULATIONS, seed = 5026 } = {}) {
  const rand = seeded(seed);
  let wins = 0;
  let ties = 0;
  const totals = [0, 0];
  for (let k = 0; k < runs; k++) {
    const { scores } = playMatch(sides, rand, { defenderExtra });
    if (scores[0] > scores[1]) wins++;
    else if (scores[0] === scores[1]) ties++;
    totals[0] += scores[0];
    totals[1] += scores[1];
  }
  return { win: [wins / runs, (runs - wins - ties) / runs], tie: ties / runs, mean: totals.map((x) => x / runs), runs };
}

/** "1:21" from a moment 0–1 in the match. */
export function clock(u) {
  const s = Math.round(u * MATCH_SECONDS);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * What the scouts saw: `qualMatches` cycle counts drawn from the true distribution (undefended), and estimates of
 * susceptibility and defense within ±scoutError of the true value (a share of it, up or down at random).
 */
export function scoutTeam(team, { qualMatches, scoutError }, rand = Math.random) {
  const scores = Array.from({ length: qualMatches }, () => sample(cycleDist(team), rand));
  const estimate = (v) => Math.min(1, Math.max(0, v * (1 + scoutError * (2 * rand() - 1))));
  return { scores, susceptibility: estimate(team.susceptibility), defense: estimate(team.defense) };
}

/** How many of the scouted matches had each cycle count, 0..max. */
export const cycleCounts = (scores, max) => Array.from({ length: max + 1 }, (_, n) => scores.filter((x) => x === n).length);
