// Lesson 1, Part 3: the Showdown. The room splits into two groups, each running one alliance. Both groups study
// the same event's teams, build picklists, run alliance selection like at an event (two alliances, serpentine),
// then play a best of three. The match model is in alliance.js; the rules in draft-rules.js.
//
// A robot does two things: it scores cycles, and it can defend. Each team's TRUE attributes (hidden until the
// series ends):
//   cycles          the probability of completing 0, 1, 2, … 12 cycles in a match (always some chance of 0: any
//                   robot can break). Built from a typical count, a spread, and a breakdown chance.
//   susceptibility  0–1: how much defense slows it down
//   defense         0–1: how good it is at defending
//   note            what the reveal says about it
// What players see is simulated each game: ten qualification matches drawn from the cycle distribution, and
// scouts' estimates of susceptibility and defense, each within ±20% of the true value.

export const MAX_CYCLES = 12;

/** A cycle distribution: [P(0 cycles), P(1), …, P(12)] from a typical count, a spread and a breakdown chance. */
function cycles(typical, spread, broken) {
  const weights = Array.from({ length: MAX_CYCLES + 1 }, (_, n) => (n === 0 ? 0 : Math.exp(-((n - typical) ** 2) / (2 * spread ** 2))));
  const total = weights.reduce((a, b) => a + b, 0);
  return weights.map((w, n) => (n === 0 ? broken : ((1 - broken) * w) / total));
}

export const DRAFT = {
  prepSeconds: 15 * 60, // discussion and picklists before selection
  // Alliance selection timers, as at an FRC event: 45 s for a first-round pick, 1:30 after that.
  pickSeconds: [45, 45, 90, 90],
  // Serpentine with two alliances: Alliance 1, Alliance 2, then Alliance 2, Alliance 1.
  order: [0, 1, 1, 0],
  planSeconds: 180, // a backstop: matches play as soon as both alliances lock in
  maxMatches: 5, // ties are replayed, up to this many matches
  qualMatches: 10,
  scoutError: 0.2, // scouts' estimates land within ±20% of the true value
  defenderBreakExtra: 0.05, // a defender breaks with its usual chance of 0 cycles, plus this
  rules: [
    'Each robot plays offense (scoring cycles) or defense, the whole match. Robots don’t change roles mid-match.',
    'A defender scores nothing and guards one robot of your choice for the whole match.',
    'Robots break. A defender breaks down 5 points more often than it scores 0 cycles (a 3% robot breaks 8% of the time), at a random moment in the match: it defends the cycles before that and none after. A robot’s cycles are spread evenly through the match.',
    'Defense takes away (defender’s ability × target’s susceptibility). A 60% defender on a 50%-susceptible robot costs it 30% of its cycles: each cycle succeeds 70% of the time.',
    'If the robot you chose is defending too, you decide beforehand: stay on it, which weakens its defense by the same rule, or switch to another robot.',
    'Two defenders on one robot both apply. An alliance’s score is its total cycles. Best of three; a tie is replayed.',
  ],
  teams: [
    { id: 'apex', name: 'Apex', cycles: cycles(9, 1.2, 0.04), susceptibility: 0.3, defense: 0.3, note: 'The real deal: lots of cycles, consistent, hard to slow down.' },
    { id: 'metronome', name: 'Metronome', cycles: cycles(7, 0.6, 0.02), susceptibility: 0.4, defense: 0.2, note: 'Seven cycles, almost every match.' },
    { id: 'boom', name: 'Boom', cycles: cycles(7.5, 3, 0.08), susceptibility: 0.6, defense: 0.2, note: 'A high average with a huge spread: 11 one match, 4 the next.' },
    { id: 'glass', name: 'Glass Cannon', cycles: cycles(9.5, 1.5, 0.25), susceptibility: 0.7, defense: 0.1, note: 'The most cycles when it runs, but it breaks one match in four.' },
    { id: 'brick', name: 'Brick', cycles: cycles(3, 1, 0.03), susceptibility: 0.2, defense: 0.85, note: 'Few cycles, and the best defender at the event.' },
    { id: 'wall', name: 'Wall', cycles: cycles(4.5, 1, 0.03), susceptibility: 0.3, defense: 0.6, note: 'A few cycles and a solid defender.' },
    { id: 'tank', name: 'Tank', cycles: cycles(6, 1, 0.04), susceptibility: 0.05, defense: 0.4, note: 'Defense barely touches it.' },
    { id: 'spark', name: 'Spark', cycles: cycles(5, 2.2, 0.1), susceptibility: 0.6, defense: 0.2, note: 'Streaky: its qualification numbers depend a lot on luck.' },
    { id: 'eddie', name: 'Steady Eddie', cycles: cycles(5.5, 0.7, 0.02), susceptibility: 0.5, defense: 0.3, note: 'Reliable middle of the pack.' },
    { id: 'gambler', name: 'Gambler', cycles: cycles(6, 3.5, 0.06), susceptibility: 0.5, defense: 0.2, note: 'Anything from 0 to 12 cycles.' },
    { id: 'turtle', name: 'Turtle', cycles: cycles(4, 0.7, 0.01), susceptibility: 0.1, defense: 0.3, note: 'Slow, but nothing stops it.' },
    { id: 'feather', name: 'Feather', cycles: cycles(7.5, 1, 0.05), susceptibility: 0.9, defense: 0.1, note: 'Lots of cycles, but it folds under any defense.' },
    { id: 'pest', name: 'Pest', cycles: cycles(4.5, 1.3, 0.05), susceptibility: 0.4, defense: 0.55, note: 'A few cycles and a good defender.' },
    { id: 'ghost', name: 'Ghost', cycles: cycles(7, 1.3, 0.3), susceptibility: 0.5, defense: 0.2, note: 'Good when it shows up. It breaks almost one match in three.' },
    { id: 'rookie', name: 'Rookie', cycles: cycles(2.5, 1.3, 0.1), susceptibility: 0.6, defense: 0.25, note: 'First-year team, still finding its feet.' },
    { id: 'middler', name: 'Middler', cycles: cycles(5, 1.5, 0.05), susceptibility: 0.5, defense: 0.35, note: 'Average at everything.' },
  ],
  lessons: [
    'Ten matches is a small sample: some teams’ qualification numbers were luckier (or unluckier) than the robot.',
    'Every robot can break. A one-in-four chance of a 0 usually costs you a match in a best of three.',
    'Defense pays when (your defender’s ability × their robot’s susceptibility × that robot’s cycles) beats the cycles your defender gives up.',
    'Consistency matters most in a short series: a steady 7 often beats a wild 7.5.',
  ],
};
