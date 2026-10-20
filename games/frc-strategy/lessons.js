// The lessons for Strategy Training, plus the small probability toolkit their "explore" panels use.
// rules.js reads the points from here; host.js and player.js read the text and the explorers.
//
// Text may contain <b>…</b>: it's written here, never typed by players, so the screens insert it as HTML.
// Each question:
//   title, section       shown above the prompt
//   prompt               the scenario and the question
//   choices              [{ text, points, result }]: result is what the model says about that choice (shown at the reveal)
//   takeaway, explain    the lesson, shown at the reveal
//   explore              optional: sliders/toggles and a model(values) that phones can play with after the reveal

// ---------- toolkit: a distribution is a list of [score, probability] ----------

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

// ---------- the lessons ----------

const GUARANTEED_11 = [[11, 1]];
const GAMBLE_20 = [[0, 0.6], [20, 0.4]];

export const LESSONS = [
  {
    id: 'risk',
    number: 1,
    title: 'Risk & Consistency',
    tagline: "Winning isn't the same as scoring more.",
    summary: 'Ten investigations into when to play it safe, when to gamble, and the hidden assumptions behind both.',
    questions: [
      {
        title: 'Fixed Opponent',
        section: 'Probability foundations',
        prompt: 'Robot B always scores <b>12</b>. Robot A can score <b>11 for certain</b>, or gamble on <b>20 points</b> that comes off 40% of the time (0 otherwise). Which choice gives A the best chance to win?',
        choices: [
          { text: '11 points, guaranteed', points: 0, result: 'Wins 0% (11 never beats 12)' },
          { text: 'Gamble: 20 (40%) or 0', points: 100, result: 'Wins 40%' },
          { text: "Doesn't matter: same average", points: 0, result: 'Averages differ: 11 vs 8' },
        ],
        takeaway: 'A lower expected score can still have a higher win probability.',
        explain: 'The safe 11 averages more, but it can never beat 12. Only the gamble gives A a chance. Slide B’s score below 11 and the decision reverses.',
        explore: {
          controls: [{ id: 'target', label: 'B’s fixed score', min: 8, max: 18, value: 12 }],
          model: (v) => ({
            strategies: [matchup('11 guaranteed', GUARANTEED_11, [[v.target, 1]]), matchup('Gamble on 20 (40%)', GAMBLE_20, [[v.target, 1]])],
          }),
        },
      },
      {
        title: 'Uncertain Opponent',
        section: 'Probability foundations',
        prompt: 'Now B scores <b>8 or 16</b>, each half the time. A still chooses between <b>11 guaranteed</b> and <b>20 (40%) / 0 (60%)</b>. Which wins more often?',
        choices: [
          { text: '11 points, guaranteed', points: 100, result: 'Wins 50% (whenever B scores 8)' },
          { text: 'Gamble: 20 (40%) or 0', points: 0, result: 'Wins 40% (only when the gamble hits)' },
          { text: 'They win equally often', points: 0, result: '50% vs 40%' },
        ],
        takeaway: 'The best amount of risk depends on what the opponent is likely to score.',
        explain: 'The guaranteed 11 beats B’s low score every time, so it wins 50%. The gamble wins only when it hits: 40%. We multiplied independent probabilities. What if A and B are linked?',
        explore: {
          controls: [{ id: 'low', label: 'B scores 8 (% of matches)', min: 0, max: 100, step: 5, value: 50, unit: '%' }],
          model: (v) => {
            const b = [[8, v.low / 100], [16, 1 - v.low / 100]];
            return { strategies: [matchup('11 guaranteed', GUARANTEED_11, b), matchup('Gamble on 20 (40%)', GAMBLE_20, b)] };
          },
        },
      },
      {
        title: 'Dependent Outcomes',
        section: 'Probability foundations',
        prompt: 'A scores <b>5 or 15</b>. B scores <b>8 or 18</b>. Each is high exactly half the time. How often does A win?',
        choices: [
          { text: '25% of matches', points: 40, result: 'Only if the robots are independent' },
          { text: '0%: B always scores 3 more', points: 20, result: 'Only if they’re high together' },
          { text: '50% of matches', points: 20, result: 'Only if they’re high at opposite times' },
          { text: 'Can’t tell: anywhere from 0% to 50%', points: 100, result: 'It depends on how they’re linked' },
        ],
        takeaway: 'Knowing each robot’s distribution is not enough. How their outcomes are linked matters.',
        explain: 'If both are high together, B always wins. If they’re high at opposite times, A wins half the time. Independence (25%) is just one assumption. Field congestion, game-piece supply and defense all create shared randomness.',
        explore: {
          controls: [{ id: 'link', label: 'How the robots are linked', options: ['High together', 'Independent', 'Opposite'], value: 1 }],
          model: (v) => {
            const coin = () => Math.random() < 0.5;
            const play = [
              () => (coin() ? [15, 18] : [5, 8]),
              () => [coin() ? 15 : 5, coin() ? 18 : 8],
              () => (coin() ? [15, 8] : [5, 18]),
            ][v.link];
            return { strategies: [{ label: 'A vs B', win: [0, 0.25, 0.5][v.link], tie: 0, play }] };
          },
        },
      },
      {
        title: 'Three-Outcome Scores',
        section: 'Probability foundations',
        prompt: 'Two A strategies both average <b>11</b>. B scores 0 (10%), 10 (50%) or 20 (40%). Which A strategy wins more often?',
        choices: [
          { text: 'Spread: 0 (20%), 10 (50%), 20 (30%)', points: 0, result: 'Wins 23%, ties 39%' },
          { text: 'Two-level: 5 (50%), 17 (50%)', points: 100, result: 'Wins 35%, never ties' },
          { text: 'Same: they both average 11', points: 0, result: '23% vs 35%' },
        ],
        takeaway: 'Same average, different chance of beating the opponent.',
        explain: 'What matters is how often A lands above B. Scoring 17 beats B’s 0 and 10, which happen 60% of the time. The spread strategy wastes a lot of probability on ties.',
        explore: {
          model: () => {
            const b = [[0, 0.1], [10, 0.5], [20, 0.4]];
            return {
              strategies: [
                matchup('Spread 0 / 10 / 20', [[0, 0.2], [10, 0.5], [20, 0.3]], b),
                matchup('Two-level 5 / 17', [[5, 0.5], [17, 0.5]], b),
              ],
            };
          },
        },
      },
      {
        title: 'Repeated Attempts',
        section: 'Probability foundations',
        prompt: 'A makes <b>70%</b> of its shots, B makes <b>50%</b>. With one shot each, A wins outright only 35% of the time (half the matches tie). With <b>20 shots each</b>, about how often does A win?',
        choices: [
          { text: 'About 35%: same edge every shot', points: 0, result: 'More shots make the edge show' },
          { text: 'About 55%', points: 25, result: 'Too low' },
          { text: 'About 70%: A’s shooting rate', points: 25, result: 'Too low' },
          { text: 'About 88%', points: 100, result: 'Wins 87.5%' },
        ],
        takeaway: 'More attempts let a consistent accuracy advantage show through the noise.',
        explain: 'Over many shots, luck evens out and A’s better accuracy decides the match. With one shot, it’s mostly luck. Try 1, 5 and 30 shots.',
        explore: {
          controls: [{ id: 'n', label: 'Shots per robot', min: 1, max: 30, value: 20 }],
          model: (v) => ({
            stats: [
              { label: 'A average', value: (v.n * 0.7).toFixed(1) },
              { label: 'B average', value: (v.n * 0.5).toFixed(1) },
            ],
            strategies: [matchup('A (70%) vs B (50%)', binomial(v.n, 0.7), binomial(v.n, 0.5))],
          }),
        },
      },
      {
        title: 'Tail Risks',
        section: 'Applications',
        prompt: 'B always scores <b>9</b>. A can score <b>10 guaranteed</b>, or use a strategy that scores 0 (10%), 10 (80%) or 20 (10%). Both average 10. Which wins more often?',
        choices: [
          { text: '10 points, guaranteed', points: 100, result: 'Wins 100%' },
          { text: '0 / 10 / 20 at 10 / 80 / 10%', points: 0, result: 'Wins 90%' },
          { text: 'Same: they both average 10', points: 0, result: '100% vs 90%' },
        ],
        takeaway: 'Averages hide the tails. A rare disaster can cost matches a rare jackpot doesn’t win.',
        explain: 'Scoring 20 instead of 10 adds nothing: 10 already beats 9. Scoring 0 loses. When you’re already ahead, the upside is worthless and the downside is real.',
        explore: {
          controls: [{ id: 'opp', label: 'B’s fixed score', min: 0, max: 20, value: 9 }],
          model: (v) => ({
            strategies: [
              matchup('10 guaranteed', [[10, 1]], [[v.opp, 1]]),
              matchup('0 / 10 / 20', [[0, 0.1], [10, 0.8], [20, 0.1]], [[v.opp, 1]]),
            ],
          }),
        },
      },
      {
        title: 'Endgame Choices',
        section: 'Applications',
        prompt: 'Thirty seconds left. A must score <b>more than the deficit</b> to win. It can run two reliable 5-point cycles (<b>+10, certain</b>) or try one 15-point play that works <b>55%</b> of the time. When should A switch to the risky play?',
        choices: [
          { text: 'When behind by 10 or more', points: 100, result: 'Then +10 can’t win, and 55% beats 0%' },
          { text: 'When behind by 5 or more', points: 0, result: 'At 5–9 behind, +10 wins for sure' },
          { text: 'Only when behind by 15 or more', points: 0, result: 'Then neither play can win' },
          { text: 'Never: take the sure points', points: 0, result: 'Sure points lose when they’re not enough' },
        ],
        takeaway: 'The right amount of risk changes with the score.',
        explain: 'Behind by 9 or less, the sure +10 wins every time. Behind by 10 to 14, +10 can’t win, so a 55% shot is the only way. The model assumes B scores nothing more.',
        explore: {
          controls: [{ id: 'need', label: 'Deficit A must beat', min: 3, max: 17, value: 12 }],
          model: (v) => ({
            strategies: [
              matchup('Reliable +10', [[10, 1]], [[v.need, 1]]),
              matchup('Risky +15 (55%)', [[15, 0.55], [0, 0.45]], [[v.need, 1]]),
            ],
          }),
        },
      },
      {
        title: 'Scouting Uncertainty',
        section: 'Applications',
        prompt: 'Scouting says a robot’s maneuver worked <b>7 times in 10 attempts</b>. What should you believe about its true success rate?',
        choices: [
          { text: 'It’s 70%: that’s what the data says', points: 0, result: 'Ten tries is a small sample' },
          { text: 'Somewhere between 65% and 75%', points: 25, result: 'Far too confident' },
          { text: 'Anything from about 45% to 85% is plausible', points: 100, result: '90% range: 44% to 86%' },
          { text: 'Ten tries tells us nothing', points: 0, result: 'It does: below 30% is very unlikely' },
        ],
        takeaway: 'A small sample gives a range, not a number.',
        explain: 'Starting from a uniform prior, 7 of 10 gives a best guess of about 67% and a 90% range of roughly 44% to 86%. Seventy of 100 would narrow it a lot. Were the attempts against weak defense?',
        explore: {
          controls: [
            { id: 'n', label: 'Attempts scouted', min: 5, max: 100, step: 5, value: 10 },
            { id: 'rate', label: 'Observed success', min: 0, max: 100, step: 5, value: 70, unit: '%' },
          ],
          model: (v) => {
            const s = Math.round((v.n * v.rate) / 100);
            const [lo, hi] = betaRange(s + 1, v.n - s + 1);
            return {
              stats: [
                { label: 'Successes', value: `${s} / ${v.n}` },
                { label: 'Best guess', value: pct((s + 1) / (v.n + 2)) },
                { label: '90% range', value: `${Math.round(100 * lo)}–${Math.round(100 * hi)}%` },
              ],
              note: 'Uses a uniform Beta(1, 1) prior: one explicit assumption, not an objective correction.',
            };
          },
        },
      },
      {
        title: 'Opponent Adaptation',
        section: 'Applications',
        prompt: 'B scouts A and adapts. A’s win chances: <b>safe plan</b> 40% if B plays offense, 55% if B defends. <b>Risky plan</b> 70% against offense, 35% against defense. What should A do?',
        choices: [
          { text: 'Always risky: 70% is the best number', points: 0, result: 'B defends: 35%' },
          { text: 'Always safe', points: 40, result: 'B plays offense: 40%' },
          { text: 'Flip a coin each match', points: 70, result: 'B defends: 45%' },
          { text: 'Go risky about 30% of the time, at random', points: 100, result: '49% whatever B does' },
        ],
        takeaway: 'Against an opponent who adapts, being unpredictable is worth points.',
        explain: 'If B knows A’s plan, B picks the answer to it. Mixing so B can’t tell, about 30% risky, guarantees 49%, better than any fixed plan. Slide the mix and watch B’s best reply.',
        explore: {
          controls: [{ id: 'mix', label: 'A goes risky (% of matches)', min: 0, max: 100, step: 5, value: 30, unit: '%' }],
          model: (v) => {
            const p = v.mix / 100;
            const offense = 0.4 * (1 - p) + 0.7 * p;
            const defense = 0.55 * (1 - p) + 0.35 * p;
            return {
              stats: [
                { label: 'If B plays offense', value: pct(offense) },
                { label: 'If B defends', value: pct(defense) },
                { label: 'A is sure of', value: pct(Math.min(offense, defense)), hi: true },
              ],
              note: `B’s best reply: ${offense < defense ? 'offense' : offense > defense ? 'defend' : 'either, it makes no difference'}.`,
            };
          },
        },
      },
      {
        title: 'Mastery Challenge',
        section: 'Advanced · double points',
        prompt: 'An offensive plan wins <b>52%</b>. A defensive plan wins <b>30% + 0.7 × defense effectiveness</b>. Scouting puts effectiveness at 40% (so defense wins 58%), but it’s uncertain. Below what effectiveness should you switch to offense?',
        choices: [
          { text: 'About 15%', points: 0, result: 'At 15%, defense wins only 40.5%' },
          { text: 'About 31%', points: 200, result: '30% + 0.7 × 31.4% = 52%' },
          { text: 'About 40%', points: 50, result: 'That’s the estimate, not the break-even' },
          { text: 'About 52%', points: 0, result: 'At 52%, defense wins 66%' },
        ],
        takeaway: 'Know which assumption flips your decision, and how sure you are of it.',
        explain: 'Defense wins more as long as effectiveness is above about 31%. The estimate (40%) is close to that line, so scouting that pins it down could be worth more than anything else.',
        explore: {
          controls: [{ id: 'eff', label: 'Defense effectiveness', min: 0, max: 70, step: 5, value: 40, unit: '%' }],
          model: (v) => {
            const defense = 0.3 + 0.007 * v.eff;
            return {
              stats: [
                { label: 'Offense wins', value: '52%' },
                { label: 'Defense wins', value: pct(defense) },
                { label: 'Better plan', value: defense > 0.52 ? 'Defense' : 'Offense', hi: true },
              ],
              note: 'Write down your plan, your confidence, the most important assumption, and the cheapest observation that could change your mind.',
            };
          },
        },
      },
    ],
  },
];

/** The badge on each answer, so the room can talk about "answer 2". */
export const SHAPES = ['1', '2', '3', '4'];

export const lessonById = (id) => LESSONS.find((l) => l.id === id) ?? null;

/** The most points any answer to this question is worth. */
export const bestPoints = (question) => Math.max(...question.choices.map((c) => c.points));
