// The Showdown match model: cycles and defense. Pure functions, shared by the rules (playing matches, simulating
// scouting), the screens and the tests. A distribution is a list of [value, probability] (see prob.js).
//
// The one rule: a robot being defended loses (defender's ability × its own susceptibility) of what it does.
//   - On offense: each of its cycles succeeds with probability 1 − ability × susceptibility.
//   - On defense: its defense ability is multiplied by 1 − ability × susceptibility.
// Roles are static: a robot plays offense or defends for the whole match.
//
// An assignment for one robot is 'offense' or { target, ifDefending }: defend robot `target`; if that robot is
// itself defending, 'stay' on it (weakening its defense) or switch to the robot id in `ifDefending`.
import { add, binomial, mean, sample } from './prob.js';

/** A team's true cycle distribution as [[cycles, probability]]. */
export const cycleDist = (team) => team.cycles.map((p, n) => [n, p]).filter(([, p]) => p > 0);

/** How much of what a robot does survives a defender: 1 − ability × susceptibility. */
export const keepShare = (ability, susceptibility) => 1 - ability * susceptibility;

/**
 * Work out what every robot actually does, given both alliances' assignments.
 * `sides` = [{ teams, assign }, { teams, assign }]. Returns per robot id:
 *   { role: 'offense', p, defenders: [ids] }   p: the chance each cycle succeeds
 *   { role: 'defend', target, ability, shadowedBy: [ids], switched }   ability after being shadowed
 *     (`target` is the robot it actually guards; `shadowing` is true when that robot is a defender)
 */
export function resolve(sides) {
  const all = sides.flatMap((s, i) => s.teams.map((t) => ({ team: t, side: i, a: s.assign[t.id] ?? 'offense' })));
  const byId = Object.fromEntries(all.map((r) => [r.team.id, r]));
  const out = {};
  // 1. Where each defender ends up.
  for (const r of all) {
    if (r.a === 'offense') continue;
    let target = r.a.target;
    let switched = false;
    if (byId[target]?.a !== 'offense' && r.a.ifDefending && r.a.ifDefending !== 'stay') {
      target = r.a.ifDefending;
      switched = true;
    }
    out[r.team.id] = { role: 'defend', target, switched, shadowing: byId[target]?.a !== 'offense', shadowedBy: [], ability: r.team.defense };
  }
  // 2. Defenders shadowing defenders weaken them (using the shadow's own ability).
  for (const [id, d] of Object.entries(out)) {
    if (!d.shadowing) continue;
    const victim = out[d.target];
    victim.shadowedBy.push(id);
    victim.ability *= keepShare(byId[id].team.defense, byId[d.target].team.susceptibility);
  }
  // 3. Offense robots: each defender on them cuts their cycle success.
  for (const r of all) {
    if (r.a !== 'offense') continue;
    const defenders = Object.entries(out).filter(([, d]) => !d.shadowing && d.target === r.team.id);
    const p = defenders.reduce((k, [, d]) => k * keepShare(d.ability, r.team.susceptibility), 1);
    out[r.team.id] = { role: 'offense', p, defenders: defenders.map(([id]) => id) };
  }
  return out;
}

/** An offense robot's completed cycles: its attempts, each succeeding with probability p. */
export function completedDist(team, p) {
  const out = new Map();
  for (const [n, q] of cycleDist(team)) for (const [k, r] of binomial(n, p)) out.set(k, (out.get(k) ?? 0) + q * r);
  return [...out].filter(([, x]) => x > 0).sort((a, b) => a[0] - b[0]);
}

/** Each alliance's chance to win, tie chance and average cycles, plus what every robot did. */
export function matchOdds(sides) {
  const roles = resolve(sides);
  const dists = sides.map((s) => s.teams.reduce((d, t) => (roles[t.id].role === 'offense' ? add(d, completedDist(t, roles[t.id].p)) : d), [[0, 1]]));
  const [da, db] = dists;
  let win = 0;
  let tie = 0;
  let below = 0;
  let j = 0;
  for (const [x, p] of da) {
    while (j < db.length && db[j][0] < x) below += db[j++][1];
    win += p * below;
    if (j < db.length && db[j][0] === x) tie += p * db[j][1];
  }
  return { win: [win, Math.max(0, 1 - win - tie)], tie, mean: [mean(da), mean(db)], roles };
}

/** Play one match: each offense robot's attempts, then which of them succeed. */
export function playMatch(sides, rand = Math.random) {
  const roles = resolve(sides);
  const cyclesById = {};
  const scores = sides.map((s) =>
    s.teams.reduce((total, t) => {
      if (roles[t.id].role !== 'offense') return total;
      const attempts = sample(cycleDist(t), rand);
      let made = 0;
      for (let k = 0; k < attempts; k++) if (rand() < roles[t.id].p) made++;
      cyclesById[t.id] = made;
      return total + made;
    }, 0),
  );
  return { scores, cycles: cyclesById, roles };
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
