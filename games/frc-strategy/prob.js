// A small probability toolkit for the lessons and their explorers. A distribution is a list of [score, probability].

export const pct = (x) => `${(100 * x).toFixed(Math.abs(100 * x - Math.round(100 * x)) < 0.05 ? 0 : 1)}%`;
export const mean = (d) => d.reduce((s, [v, p]) => s + v * p, 0);
const sum = (a, b, test) => a.reduce((s, [v, p]) => s + p * b.reduce((t, [w, q]) => t + (test(v, w) ? q : 0), 0), 0);
export const winChance = (a, b) => sum(a, b, (v, w) => v > w);
export const tieChance = (a, b) => sum(a, b, (v, w) => v === w);

export function sample(d) {
  let r = Math.random();
  for (const [v, p] of d) {
    r -= p;
    if (r < 0) return v;
  }
  return d.at(-1)[0];
}

export function binomial(n, p) {
  const d = [];
  for (let k = 0; k <= n; k++) {
    let c = 1;
    for (let j = 1; j <= k; j++) c *= (n - j + 1) / j;
    d.push([k, c * p ** k * (1 - p) ** (n - k)]);
  }
  return d;
}

/** A strategy row for an explorer: robot A's scores against robot B's, assumed independent. */
export function matchup(label, a, b) {
  return { label, win: winChance(a, b), tie: tieChance(a, b), play: () => [sample(a), sample(b)] };
}

/** The 5% and 95% points of a Beta(a, b) distribution (a 90% range), by adding up its density. */
export function betaRange(a, b) {
  const steps = 2000;
  const density = (x) => x ** (a - 1) * (1 - x) ** (b - 1);
  const cells = Array.from({ length: steps }, (_, i) => density((i + 0.5) / steps));
  const total = cells.reduce((s, c) => s + c, 0);
  let run = 0;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < steps; i++) {
    const before = run;
    run += cells[i] / total;
    if (before < 0.05 && run >= 0.05) lo = (i + 1) / steps;
    if (before < 0.95 && run >= 0.95) hi = (i + 1) / steps;
  }
  return [lo, hi];
}

/** The distribution of a + b, for independent a and b. */
export function add(a, b) {
  const out = new Map();
  for (const [v, p] of a) for (const [w, q] of b) out.set(v + w, (out.get(v + w) ?? 0) + p * q);
  return [...out].sort((x, y) => x[0] - y[0]);
}

/** The distribution of the total of n independent copies of d. */
export function times(n, d) {
  let total = [[0, 1]];
  for (let i = 0; i < n; i++) total = add(total, d);
  return total;
}

/** P(total >= at). */
export const atLeast = (d, at) => d.reduce((s, [v, p]) => s + (v >= at ? p : 0), 0);
