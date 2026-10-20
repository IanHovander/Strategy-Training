// Lesson 1, Part 3: the Showdown. The room splits into two groups, each running one alliance. Both groups study
// the same event's teams, build picklists, run alliance selection like at an event (two alliances, serpentine),
// then play a best of three. The match model is in alliance.js; the rules in draft-rules.js.
//
// Each team's TRUE attributes (hidden until the series ends):
//   mean, spread   points it scores in a match when it works (normal-shaped: mean ± spread)
//   broken         chance it breaks and scores 0 in a match. Every team has one.
//   resilience     0–1: how much of its scoring it keeps when defended (1 = defense can't touch it)
//   defense        0–1: how well it defends. A robot guarded by a defender keeps
//                  1 − defense × (1 − resilience) of its points.
//   note           what the reveal says about it
// What players see is simulated each game from these: ten qualification matches drawn from the true
// distribution, and scouts' 1–10 estimates of resilience and defense (with scouting error).

export const DRAFT = {
  prepSeconds: 15 * 60, // discussion and picklists before selection
  // Alliance selection timers, as at an FRC event: 45 s for a first-round pick, 1:30 after that.
  pickSeconds: [45, 45, 90, 90],
  // Serpentine with two alliances: Alliance 1, Alliance 2, then Alliance 2, Alliance 1.
  order: [0, 1, 1, 0],
  planSeconds: 180, // a backstop: matches play as soon as both alliances lock in
  maxMatches: 5, // ties are replayed, up to this many matches
  qualMatches: 10,
  ratingError: 1.2, // scouts' error on the 1–10 resilience and defense ratings (standard deviation)
  rules: [
    'Each match, every robot either plays offense or defends one robot on the other alliance.',
    'A defender scores nothing. A defended robot keeps 1 − (defense × (1 − resilience)) of its points: strong defense hurts a fragile robot and barely touches a resilient one.',
    'Two defenders on one robot both apply.',
    'Any robot can break in any match and score 0, defenders included (a broken defender defends nobody).',
    'An alliance’s score is the total of its robots. Best of three; a tie is replayed.',
  ],
  teams: [
    { id: 'apex', name: 'Apex', mean: 38, spread: 6, broken: 0.04, resilience: 0.7, defense: 0.3, note: 'The real deal: high scoring, consistent, hard to defend.' },
    { id: 'metronome', name: 'Metronome', mean: 30, spread: 3, broken: 0.02, resilience: 0.6, defense: 0.2, note: 'Almost exactly 30 every time.' },
    { id: 'boom', name: 'Boom', mean: 34, spread: 14, broken: 0.08, resilience: 0.4, defense: 0.2, note: 'A high average with a huge spread: 50 one match, 15 the next.' },
    { id: 'glass', name: 'Glass Cannon', mean: 41, spread: 7, broken: 0.25, resilience: 0.3, defense: 0.1, note: 'The best scorer when it runs, but it breaks one match in four.' },
    { id: 'brick', name: 'Brick', mean: 14, spread: 5, broken: 0.03, resilience: 0.8, defense: 0.85, note: 'A low scorer and the best defender at the event.' },
    { id: 'wall', name: 'Wall', mean: 20, spread: 5, broken: 0.03, resilience: 0.7, defense: 0.6, note: 'A decent scorer and a solid defender.' },
    { id: 'tank', name: 'Tank', mean: 27, spread: 5, broken: 0.04, resilience: 0.95, defense: 0.4, note: 'Defense can’t touch it.' },
    { id: 'spark', name: 'Spark', mean: 22, spread: 10, broken: 0.1, resilience: 0.4, defense: 0.2, note: 'Streaky: its qualification numbers depend a lot on luck.' },
    { id: 'eddie', name: 'Steady Eddie', mean: 24, spread: 3, broken: 0.02, resilience: 0.5, defense: 0.3, note: 'Reliable middle of the pack.' },
    { id: 'gambler', name: 'Gambler', mean: 26, spread: 16, broken: 0.06, resilience: 0.5, defense: 0.2, note: 'Anything from 0 to 55.' },
    { id: 'turtle', name: 'Turtle', mean: 18, spread: 3, broken: 0.01, resilience: 0.9, defense: 0.3, note: 'Slow, but nothing stops it.' },
    { id: 'feather', name: 'Feather', mean: 33, spread: 5, broken: 0.05, resilience: 0.1, defense: 0.1, note: 'Scores a lot, folds under any defense.' },
    { id: 'pest', name: 'Pest', mean: 21, spread: 6, broken: 0.05, resilience: 0.6, defense: 0.55, note: 'Scores a little, defends well.' },
    { id: 'ghost', name: 'Ghost', mean: 31, spread: 6, broken: 0.3, resilience: 0.5, defense: 0.2, note: 'Good when it shows up. It breaks almost one match in three.' },
    { id: 'rookie', name: 'Rookie', mean: 12, spread: 6, broken: 0.1, resilience: 0.4, defense: 0.25, note: 'First-year team, still finding its feet.' },
    { id: 'middler', name: 'Middler', mean: 23, spread: 7, broken: 0.05, resilience: 0.5, defense: 0.35, note: 'Average at everything.' },
  ],
  lessons: [
    'Ten matches is a small sample: some teams’ qualification numbers were luckier (or unluckier) than the robot.',
    'Every robot can break. A one-in-four breakdown chance usually costs you a match in a best of three.',
    'Defense pays only against a robot that scores a lot and folds under pressure. Against a resilient robot you give away your own points.',
    'Consistency matters most in a short series: a steady 30 often beats a wild 34.',
  ],
};
