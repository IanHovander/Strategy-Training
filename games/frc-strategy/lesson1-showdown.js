// Lesson 1, Part 3: Showdown. Alliances of three play each other over five rounds. Each player picks their
// robot's plan, predicts the opposing alliance's main plan, and answers the round's key question. The match
// model is in showdown.js; each round sets its numbers:
//   brief, details   the situation (details include red herrings, on purpose)
//   cycle, power, climb, crowd, defense, bonus   the model's numbers (see showdown.js)
//   autoPlan         what an empty seat on a short-handed alliance runs
//   house            the House alliance's plans, when the number of alliances is odd
//   key              { prompt, choices, answer, explain }: the round's question about what matters
//   lesson           shown after the match

export const SHOWDOWN = [
  {
    title: 'Know the Numbers',
    brief: 'A clean field and no tricks. Read the plan card, add up the averages, and think about consistency.',
    details: ['No crowding: robots on the same plan don’t slow each other down.', 'Defense barely works this round.', 'All three robots on an alliance can climb.'],
    cycle: { n: 8, p: 0.85, value: 3 },
    power: { n: 3, p: 0.55, value: 10 },
    climb: { cycles: 3, p: 0.9, value: 12, capacity: 3 },
    crowd: 0,
    defense: { cycle: 0.05, power: 0.1 },
    autoPlan: 'cycle',
    house: ['cycle', 'cycle', 'climb'],
    key: {
      prompt: 'Which plan has the highest average this round?',
      choices: ['Cycle', 'Power Shot', 'Climb', 'They’re about equal'],
      answer: 0,
      explain: 'Cycle averages 8 × 3 × 0.85 = 20.4. Power Shot averages 3 × 10 × 0.55 = 16.5. Climb averages 7.7 + 10.8 = 18.5.',
    },
    lesson: 'When one plan has both the higher average and the smaller spread, there’s no trade-off: take it. Most rounds won’t be this kind.',
  },
  {
    title: 'Crowded Feeder',
    brief: 'One feeder station for the whole alliance. Robots running the same scoring plan get in each other’s way.',
    details: [
      'Crowding: each extra teammate on the same plan (Cycle or Power Shot) cuts everyone’s success on it by 15 points.',
      'Climbers do their own short cycles and don’t crowd the feeder.',
      'Power Shots got an upgrade: 12 points each.',
      'The field was resurfaced overnight.',
    ],
    cycle: { n: 8, p: 0.85, value: 3 },
    power: { n: 3, p: 0.6, value: 12 },
    climb: { cycles: 3, p: 0.9, value: 12, capacity: 3 },
    crowd: 0.15,
    defense: { cycle: 0.05, power: 0.1 },
    autoPlan: 'cycle',
    house: ['cycle', 'cycle', 'power'],
    key: {
      prompt: 'If all three of your robots Cycle, what is each one’s success rate?',
      choices: ['85%', '70%', '55%', '40%'],
      answer: 2,
      explain: 'Two extra teammates on the same plan: 85% − 2 × 15% = 55%. Three Cyclers average 13.2 each instead of 20.4.',
    },
    lesson: 'Shared resources link robots’ outcomes. Spreading out (one Cycle, one Power Shot, one Climb) beats stacking the “best” plan.',
  },
  {
    title: 'Defense Is Live',
    brief: 'The refs are letting defense play. A defender shadows the opponent’s most dangerous scorer.',
    details: [
      'A defender cuts the robot it guards by 50 points of success on Power Shots, 15 on Cycles.',
      'Each defender picks the best-scoring robot nobody is guarding yet.',
      'Crowding: 8 points per extra teammate on the same plan.',
      'Power Shots are worth 14 each.',
      'The other alliance has scouted you too.',
    ],
    cycle: { n: 8, p: 0.85, value: 3 },
    power: { n: 3, p: 0.6, value: 14 },
    climb: { cycles: 3, p: 0.9, value: 12, capacity: 3 },
    crowd: 0.08,
    defense: { cycle: 0.15, power: 0.5 },
    autoPlan: 'cycle',
    house: ['power', 'power', 'climb'],
    key: {
      prompt: 'Against which kind of alliance does playing Defense pay off?',
      choices: ['One stacked with Power Shots', 'One stacked with Cyclers', 'Any alliance: defense always helps', 'None: never give up a scorer'],
      answer: 0,
      explain: 'Guarding a Power Shot robot drops it from 25 points to about 4: more than a defender gives up. Guarding a Cycler takes only 3 or 4 points.',
    },
    lesson: 'Now your best plan depends on theirs. If they stack Power Shots, a defender pays. If they Cycle, it’s a wasted robot. That’s why predicting them is worth points.',
  },
  {
    title: 'Endgame Squeeze',
    brief: 'The climb is worth a lot, but there’s room for only one robot. Every player on an alliance that scores 65 or more gets a 30-point bonus.',
    details: [
      'Climb: 24 points at 75%, but only one robot per alliance fits. A second climber gets nothing for it.',
      'Bonus: every player on an alliance that reaches 65 gets 30 points, win or lose.',
      'Defense is still live (50 on Power Shots, 15 on Cycles).',
      'The climb bar was repainted.',
    ],
    cycle: { n: 8, p: 0.85, value: 3 },
    power: { n: 3, p: 0.6, value: 14 },
    climb: { cycles: 3, p: 0.75, value: 24, capacity: 1 },
    crowd: 0.08,
    defense: { cycle: 0.15, power: 0.5 },
    bonus: { at: 65, points: 30 },
    autoPlan: 'cycle',
    house: ['cycle', 'power', 'climb'],
    key: {
      prompt: 'How many of your alliance should climb?',
      choices: ['None', 'Exactly one', 'Two, in case one fails', 'All three'],
      answer: 1,
      explain: 'Only one fits. A second climber only does its short cycles: it gives up most of a scorer’s points for nothing.',
    },
    lesson: 'Coordination is a strategy. Agree on one climber, then decide whether the bonus at 65 is worth extra risk.',
  },
  {
    title: 'Championship',
    brief: 'Everything at once: crowding, live defense, room for two climbers, a bonus at 60, and shaky scouting on the Power Shot.',
    details: [
      'Scouting: the Power Shot went 8 of 12 in quals but 2 of 6 in the playoffs. The model uses the pooled best guess.',
      'Crowding: 10 points per extra teammate on the same plan.',
      'Defense: 50 on Power Shots, 20 on Cycles.',
      'Climb: 15 points at 80%, room for two.',
      'Bonus: 30 points each for reaching 60.',
      'Both alliances are undefeated.',
    ],
    cycle: { n: 8, p: 0.8, value: 3 },
    power: { n: 3, p: 0.55, value: 15 },
    climb: { cycles: 3, p: 0.8, value: 15, capacity: 2 },
    crowd: 0.1,
    defense: { cycle: 0.2, power: 0.5 },
    bonus: { at: 60, points: 30 },
    autoPlan: 'cycle',
    house: ['power', 'climb', 'climb'],
    key: {
      prompt: 'Pooling 8 of 12 and 2 of 6 with the add-one-make-one-miss rule, what is the Power Shot’s best-guess rate?',
      choices: ['67%: the quals number', '55%', '33%: the playoff number', '50%: no idea, so a coin flip'],
      answer: 1,
      explain: '(10 + 1) / (18 + 2) = 55%. The quals number alone is too high; the playoff number alone is too few tries.',
    },
    lesson: 'Champions combine it all: honest estimates, no crowding, one plan that answers what the other alliance is likely to do, and a clear target.',
  },
];
