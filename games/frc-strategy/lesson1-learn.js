// Lesson 1, Part 1: Learn. Case studies that start with exact answers and add a detail at every step, until the
// last case is mostly unknowns to spot and argue about. Fields are described in lessons.js.
//
// Step types:
//   number   estimate a value with a slider; points by how close you are (number.tiers: [[within, points], ...])
//   choice   pick one answer
//   multi    pick every option that matters; red herrings have negative points
import { betaRange, matchup, pct, times } from './prob.js';

/** Points for exact calculations: dead on, close, in the neighborhood. */
const EXACT = [[1, 100], [5, 50], [10, 20]];
/** Points for estimates where reasonable rounding differs. */
const ESTIMATE = [[3, 100], [8, 60], [15, 25]];

export const LEARN = [
  {
    title: 'The Sure Thing',
    setup: 'Your robot <b>Anchor</b> scores exactly <b>10</b> every match. The opposing robot scores <b>8</b> in 60% of matches and <b>14</b> in the other 40%. Only these two scores count, and a tie is not a win.',
    steps: [
      {
        type: 'number',
        title: 'Count the Wins',
        prompt: 'How often does Anchor win?',
        number: { value: 60, min: 0, max: 100, unit: '%', tiers: EXACT },
        hint: 'List the opponent’s possible scores. Which ones does 10 beat?',
        takeaway: 'Win chance = the probability of every outcome you beat, added up.',
        explain: 'Anchor beats 8 (60% of matches) and loses to 14 (40%). No averages needed: just the outcomes you beat.',
        discuss: 'Did anyone answer 50%? What shortcut leads there, and why is it wrong?',
        explore: {
          controls: [{ id: 'low', label: 'Opponent scores 8 (% of matches)', min: 0, max: 100, step: 5, value: 60, unit: '%' }],
          model: (v) => ({ strategies: [matchup('Anchor 10', [[10, 1]], [[8, v.low / 100], [14, 1 - v.low / 100]])] }),
        },
      },
      {
        type: 'choice',
        title: 'A Second Plan',
        facts: ['Anchor can switch to <b>Boom-or-Bust</b>: 20 points half the time, 0 the other half.'],
        prompt: 'Which plan gives Anchor the better chance to win?',
        choices: [
          { text: 'Steady 10', points: 100, result: 'Wins 60%' },
          { text: 'Boom-or-Bust', points: 0, result: 'Wins 50%: 20 beats both, 0 beats neither' },
          { text: 'Either: both average 10', points: 0, result: 'Same average, different win chance' },
        ],
        takeaway: 'Two plans with the same average can win at different rates.',
        explain: 'Boom-or-Bust wins exactly when it booms: 50%. Steady wins whenever the opponent is low: 60%. The average (10 for both) never entered the calculation.',
        discuss: 'Change one number in the case so Boom-or-Bust becomes the better plan. Which numbers can do it?',
        explore: {
          controls: [
            { id: 'low', label: 'Opponent scores 8 (% of matches)', min: 0, max: 100, step: 5, value: 60, unit: '%' },
            { id: 'boom', label: 'Boom works', min: 0, max: 100, step: 5, value: 50, unit: '%' },
          ],
          model: (v) => {
            const opp = [[8, v.low / 100], [14, 1 - v.low / 100]];
            return { strategies: [matchup('Steady 10', [[10, 1]], opp), matchup('Boom-or-Bust', [[20, v.boom / 100], [0, 1 - v.boom / 100]], opp)] };
          },
        },
      },
      {
        type: 'multi',
        title: 'Which Details Matter?',
        prompt: 'Each detail below is a separate “what if”. Pick every one that, on its own, would make Boom-or-Bust the better plan.',
        choices: [
          { text: 'The opponent’s low score is 10 instead of 8', points: 40, result: 'Steady only ties it: Steady wins 0%, Boom 50%' },
          { text: 'Boom works 70% of the time instead of 50%', points: 40, result: 'Boom wins 70% vs 60%' },
          { text: 'The opponent scores 8 in only 45% of matches', points: 40, result: 'Steady wins 45% vs 50%' },
          { text: 'The opponent’s high score is 24 instead of 14', points: -20, result: 'Boom drops to 30%; Steady still 60%' },
          { text: 'Boom scores 30 instead of 20', points: -20, result: '20 already beat everything: still 50%' },
        ],
        takeaway: 'A detail matters only if it moves an outcome across the line between winning and losing.',
        explain: 'Check each detail against the line. A bigger jackpot changes nothing when the smaller one already wins. A tie that used to be a win changes everything.',
        discuss: 'Which red herring fooled the most people? What made it look important?',
      },
    ],
  },
  {
    title: 'What Are You Playing For?',
    setup: 'A qualification match: a win earns <b>2 ranking points</b> (RP), a tie <b>1</b>, a loss <b>0</b>. The opponent always scores <b>15</b>. Your <b>Steady</b> plan scores exactly 15. Your <b>Swing</b> plan scores 10 or 20, half the time each.',
    steps: [
      {
        type: 'number',
        title: 'Swing’s Wins',
        prompt: 'How often does Swing win?',
        number: { value: 50, min: 0, max: 100, unit: '%', tiers: EXACT },
        takeaway: 'Steady never wins and never loses: it ties every match.',
        explain: 'Swing wins when it scores 20 (50%) and loses when it scores 10. Steady ties 15–15 every time.',
        discuss: 'Is a plan that never wins a bad plan? What would you need to know first?',
      },
      {
        type: 'choice',
        title: 'Ranking Points',
        prompt: 'Which plan earns more ranking points on average?',
        choices: [
          { text: 'Steady: 1 RP every match', points: 0, result: 'Average 1 RP' },
          { text: 'Swing: 2 RP half the time', points: 0, result: 'Average 1 RP' },
          { text: 'Exactly the same', points: 100, result: 'Both average 1 RP per match' },
        ],
        takeaway: 'Same average reward, very different spread.',
        explain: 'Steady: 1 RP × 100%. Swing: 2 RP × 50% + 0 × 50% = 1 RP. On average they’re identical, so the choice depends on what you need.',
        discuss: 'When would a team prefer the guaranteed 1 RP? When would it prefer the coin flip for 2?',
      },
      {
        type: 'choice',
        title: 'Last Qualification Match',
        facts: ['It’s your last qualification match. You’re <b>1 RP behind</b> the 8th seed, who has finished. Passing them puts you in the playoffs. Tying them does not: they win the tiebreaker.'],
        prompt: 'Which plan now?',
        choices: [
          { text: 'Steady', points: 0, result: '1 RP only ties the 8th seed: 0% to make it' },
          { text: 'Swing', points: 100, result: '50% to make the playoffs' },
          { text: 'Either: same RP average', points: 0, result: 'The average doesn’t matter; the threshold does' },
        ],
        takeaway: 'When you need a result that the safe plan can’t reach, the safe plan is the risky one.',
        explain: 'You need 2 RP, which only a win gives. Steady can never win. Swing wins half the time.',
        discuss: 'What else in a real event could change what you need from one match?',
      },
      {
        type: 'choice',
        title: 'A Ruling Changes Everything',
        facts: ['Update: a penalty elsewhere changes the standings. Now <b>any 1 RP</b> from this match locks your playoff spot; 0 RP knocks you out.'],
        prompt: 'Which plan now?',
        choices: [
          { text: 'Steady', points: 100, result: '100%: a tie is enough' },
          { text: 'Swing', points: 0, result: '50%: it loses half the time' },
          { text: 'Either: same RP average', points: 0, result: 'Same average, but 100% vs 50%' },
        ],
        takeaway: 'Same robots, same plans, opposite answer. The objective decides how much risk to take.',
        explain: 'Needing 2 RP made Swing right. Needing 1 RP makes Steady right. Before choosing a plan, write down exactly what result you need.',
        discuss: 'Before a match, who on your drive team knows exactly what result you need? How do you make sure they do?',
      },
    ],
  },
  {
    title: 'Three Robots, One Alliance',
    setup: 'Two robot designs. <b>Metronome</b> scores exactly <b>20</b> per match. <b>Lottery</b> usually scores <b>5</b>, but its big play scores <b>45</b> when it works: <b>45%</b> of matches, independently of any other robot. Lottery averages 23 points, Metronome 20.',
    steps: [
      {
        type: 'number',
        title: 'One on One',
        prompt: 'One Lottery against one Metronome. How often does the Lottery win?',
        number: { value: 45, min: 0, max: 100, unit: '%', tiers: EXACT },
        takeaway: 'One robot, one trial: the Lottery wins only when its big play works.',
        explain: '45 beats 20; 5 doesn’t. So the Lottery wins 45%, even though it averages more.',
        discuss: 'The Lottery averages 3 more points but wins less than half the time. How is that possible?',
      },
      {
        type: 'number',
        title: 'Three on Three',
        facts: ['Now it’s an alliance of <b>three Lotteries</b> against <b>three Metronomes</b> (60 points). Alliance scores add up.'],
        prompt: 'How often does the Lottery alliance win?',
        number: { value: 42.5, min: 0, max: 100, unit: '%', tiers: ESTIMATE },
        hint: 'How many big plays does the Lottery alliance need to beat 60? One big play makes 5 + 5 + 45.',
        takeaway: 'Adding robots is like repeating the trial, but you have to count how many successes it takes.',
        explain: 'One big play gives 55, short of 60, so it needs at least two: 3 × 0.45² × 0.55 + 0.45³ = 42.5%. Three trials weren’t enough for the higher average to show.',
        discuss: 'Was the answer higher or lower than you expected? What did you have to count?',
        explore: {
          controls: [
            { id: 'n', label: 'Attempts per alliance', min: 1, max: 12, value: 3 },
            { id: 'q', label: 'Big play works', min: 5, max: 80, step: 5, value: 45, unit: '%' },
          ],
          model: (v) => ({
            stats: [{ label: 'Metronomes score', value: String(20 * v.n) }],
            strategies: [matchup('Lotteries vs Metronomes', times(v.n, [[5, 1 - v.q / 100], [45, v.q / 100]]), [[20 * v.n, 1]])],
          }),
        },
      },
      {
        type: 'choice',
        title: 'Longer Matches',
        facts: ['Rule change: every robot now makes <b>two</b> attempts per match, each just like before (Metronome 20 + 20; Lottery 5 or 45 each time). That’s six attempts per alliance.'],
        prompt: 'Who wins more often now?',
        choices: [
          { text: 'Metronomes, by even more', points: 0, result: 'More trials help the higher average' },
          { text: 'Lotteries, about 56%', points: 100, result: 'Needs 3 big plays out of 6: 55.8%' },
          { text: 'Still 42.5%: same robots', points: 0, result: 'Same robots, more trials' },
          { text: 'Lotteries, about 90%', points: 25, result: 'Right direction, too far' },
        ],
        takeaway: 'The more trials, the more the average decides. Consistency matters most when trials are few.',
        explain: 'Metronomes now score 120. Lotteries need 30 + 40 × (big plays) > 120, so at least 3 of 6: 55.8%. With 12 attempts a side it would be 70%.',
        discuss: 'In a real match, what counts as a “trial”? Cycles? Robots? Matches in a tournament?',
        explore: {
          controls: [
            { id: 'n', label: 'Attempts per alliance', min: 1, max: 12, value: 6 },
            { id: 'q', label: 'Big play works', min: 5, max: 80, step: 5, value: 45, unit: '%' },
          ],
          model: (v) => ({
            stats: [{ label: 'Metronomes score', value: String(20 * v.n) }],
            strategies: [matchup('Lotteries vs Metronomes', times(v.n, [[5, 1 - v.q / 100], [45, v.q / 100]]), [[20 * v.n, 1]])],
          }),
        },
      },
      {
        type: 'multi',
        title: 'Hidden Assumptions',
        prompt: 'Still six attempts per alliance. Pick every detail that would swing the advantage back toward the Metronomes.',
        choices: [
          { text: 'The big play needs the one amp: only one Lottery can try it at a time', points: 30, result: 'Fewer attempts: fewer chances to hit' },
          { text: 'When the field gets crowded, all the Lotteries miss together', points: 30, result: 'Linked outcomes act like one big trial' },
          { text: 'The opponent can defend the big play, cutting it to 30%', points: 30, result: 'Lotteries fall to about 26%' },
          { text: 'The big play scores 50 instead of 45', points: -20, result: 'Still needs 3 of 6: no help to the Metronomes' },
          { text: 'The Metronomes are the drive team’s favorite robots', points: -20, result: 'Preference isn’t probability' },
        ],
        takeaway: '“Independent trials” is an assumption. Shared resources, linked outcomes and defense break it.',
        explain: 'The math above assumed six separate, independent tries. If they can’t all happen, or they succeed and fail together, the alliance behaves more like a single Lottery.',
        discuss: 'On your real alliance, which robots are Metronomes and which are Lotteries? Are their big plays independent?',
      },
    ],
  },
  {
    title: 'Thirty Seconds Left',
    setup: 'Elimination match, 30 seconds left, and you trail by <b>6</b>. Your robot can run two reliable cycles (<b>+10, certain</b>) or one <b>15-point play</b> that works <b>60%</b> of the time. A tie goes to the opponent.',
    steps: [
      {
        type: 'choice',
        title: 'If They Stand Still',
        facts: ['For now, assume the opponent is parked and scores nothing more.'],
        prompt: 'Which play gives you the better chance to win?',
        choices: [
          { text: 'Reliable +10', points: 100, result: 'Wins 100%: 10 beats 6' },
          { text: 'The 15-point play', points: 0, result: 'Wins 60%' },
          { text: 'They’re equal', points: 0, result: '100% vs 60%' },
        ],
        takeaway: 'When the sure thing is enough, take it.',
        explain: '+10 beats a 6-point deficit every time. The 15-point play adds risk for points you don’t need.',
        discuss: 'This was the easy version. What did it assume that real matches don’t do?',
      },
      {
        type: 'number',
        title: 'They Keep Scoring',
        facts: ['Scouting: in the last 30 seconds, the opponent usually adds <b>0 (40%), 5 (40%) or 10 (20%)</b>.'],
        prompt: 'Now what is the reliable +10’s win chance?',
        number: { value: 40, min: 0, max: 100, unit: '%', tiers: EXACT },
        hint: 'You win if 10 is more than 6 plus whatever they add. Which of their outcomes allow that?',
        takeaway: 'Points you need = deficit + whatever they add in the same time.',
        explain: '10 beats 6 + 0 but not 6 + 5 or 6 + 10. So +10 wins only when they add nothing: 40%.',
        discuss: 'How confident are you in “0 (40%)”? Where would that number come from?',
      },
      {
        type: 'number',
        title: 'The Other Play',
        prompt: 'And the 15-point play’s win chance?',
        number: { value: 48, min: 0, max: 100, unit: '%', tiers: EXACT },
        hint: 'It has to work (60%) and they must add little enough. Multiply.',
        takeaway: 'The opponent’s scoring flipped the decision: risky now beats reliable, 48% to 40%.',
        explain: '15 beats 6 + 0 and 6 + 5, but not 6 + 10. So it wins when it works (60%) and they add 0 or 5 (80%): 60% × 80% = 48%.',
        discuss: 'At what deficit would you switch back to the reliable play? Try it in the explorer.',
        explore: {
          controls: [
            { id: 'need', label: 'You trail by', min: 1, max: 16, value: 6 },
            { id: 'p', label: '15-point play works', min: 20, max: 100, step: 5, value: 60, unit: '%' },
            { id: 'opp', label: 'Opponent in the last 30 s', options: ['Parked', '0 / 5 / 10', 'Strong'], value: 1 },
          ],
          model: (v) => {
            const opp = [[[0, 1]], [[0, 0.4], [5, 0.4], [10, 0.2]], [[5, 0.4], [10, 0.4], [15, 0.2]]][v.opp];
            const toBeat = opp.map(([w, q]) => [w + v.need, q]);
            return {
              strategies: [matchup('Reliable +10', [[10, 1]], toBeat), matchup('15-point play', [[15, v.p / 100], [0, 1 - v.p / 100]], toBeat)],
            };
          },
        },
      },
      {
        type: 'multi',
        title: 'Before You Commit',
        prompt: 'Your coach has ten seconds of time-out. Pick every unknown that could flip the decision (48% vs 40%).',
        choices: [
          { text: 'Your 15-point play’s success rate under playoff pressure (60% came from quals)', points: 30, result: 'Below 50% and +10 wins again' },
          { text: 'Whether your partners are still scoring', points: 30, result: 'Changes how much you need' },
          { text: 'How often the opponent really adds 10', points: 30, result: 'That’s the case that beats the 15-point play' },
          { text: 'Who wins a tie', points: -20, result: 'Neither play can end in a tie here' },
          { text: 'The opponent’s autonomous score', points: -20, result: 'Only a tiebreaker, and no tie is possible' },
        ],
        takeaway: 'Spend your attention on the unknowns that can move the decision, not the ones that sound important.',
        explain: 'Ties can’t happen: you’d need the opponent to add exactly 4 or 9. Anything that changes the 60%, the deficit or their 10-point chance can flip the call.',
        discuss: 'The two red herrings both sound like “rules knowledge”. How do you check quickly whether a rule matters this match?',
      },
    ],
  },
  {
    title: 'Scouting Says 70%',
    setup: 'Your scouts report that an opponent’s long-range shot went in <b>7 of 10</b> times in qualifications.',
    steps: [
      {
        type: 'number',
        title: 'Best Guess',
        prompt: 'Before seeing any data, every success rate from 0% to 100% seemed equally believable. What is your best guess at the true rate now?',
        number: { value: 66.7, min: 0, max: 100, unit: '%', tiers: [[2, 100], [5, 60], [10, 25]] },
        hint: 'A handy rule: add one make and one miss to what you saw, then divide.',
        takeaway: 'Small samples should be pulled toward the middle. Add one make and one miss: 8 / 12 = 67%.',
        explain: 'Ten shots can’t tell 60% from 75%. The add-one rule (a uniform prior) gives 8/12 = 67%, and a 90% range of about 44% to 86%.',
        discuss: 'Why should 7 of 10 make you less confident than 70 of 100?',
        explore: {
          controls: [
            { id: 'n', label: 'Shots scouted', min: 5, max: 100, step: 5, value: 10 },
            { id: 'rate', label: 'Observed makes', min: 0, max: 100, step: 5, value: 70, unit: '%' },
          ],
          model: (v) => {
            const s = Math.round((v.n * v.rate) / 100);
            const [lo, hi] = betaRange(s + 1, v.n - s + 1);
            return {
              stats: [
                { label: 'Makes', value: `${s} / ${v.n}` },
                { label: 'Best guess', value: pct((s + 1) / (v.n + 2)) },
                { label: '90% range', value: `${Math.round(100 * lo)}–${Math.round(100 * hi)}%`, hi: true },
              ],
            };
          },
        },
      },
      {
        type: 'number',
        title: 'More Data',
        prompt: 'Suppose instead it went in <b>70 of 100</b>. Best guess now?',
        number: { value: 69.6, min: 0, max: 100, unit: '%', tiers: [[2, 100], [5, 60], [10, 25]] },
        takeaway: 'More data, less pull toward the middle: 71 / 102 ≈ 70%.',
        explain: 'Same rate, ten times the data. The add-one rule barely moves it, and the 90% range shrinks to about 62% to 77%.',
        discuss: 'How many matches does it take to see 100 shots from one robot? Is that realistic at one event?',
      },
      {
        type: 'multi',
        title: 'Read the Fine Print',
        facts: [
          'The 10 shots came from 4 matches.',
          '6 of the 7 makes were in the first two matches. The robot was repaired after match 2.',
          'Every shot was unguarded. You plan to defend the shooter.',
          'The team won this event last year.',
        ],
        prompt: 'Pick every detail that should lower your trust in “7 of 10”.',
        choices: [
          { text: 'Most makes came before the repair', points: 30, result: 'The robot may not be the same robot' },
          { text: 'Every shot was unguarded, and you’ll defend', points: 30, result: 'Different conditions, different rate' },
          { text: 'Only 4 matches: shots in one match aren’t independent', points: 30, result: 'Fewer real trials than it looks' },
          { text: 'They won this event last year', points: -20, result: 'Says nothing about this shot' },
          { text: '7 of 10 rounds nicely to 70%', points: -20, result: 'Tidy numbers aren’t evidence' },
        ],
        takeaway: 'A rate is only as good as the conditions it was measured in.',
        explain: 'Only one make came after the repair, and nobody was guarding the shooter. Your estimate for a defended shot in this match should sit well below 67%, with a wide range.',
        discuss: 'What would you ask your scouts to record next time so these questions have answers?',
      },
    ],
  },
  {
    title: 'Semifinal, Game 2',
    setup: 'Best of three, and you won game 1, 64–58. Your robot <b>Comet</b> has two autos. <b>Safe</b> scores 6, every time. <b>Greedy</b> scores 15 if it works; if it fails it scores 0 and costs about 2 teleop points. Greedy worked <b>6 of 9</b> times in quals and <b>1 of 3</b> in the playoffs.',
    steps: [
      {
        type: 'multi',
        title: 'Scan the Case',
        facts: [
          'The opponent’s best robot browned out in game 1. Their pit says it’s fixed.',
          'Greedy and your partner’s auto both take the center-line game pieces.',
          'Your pit crew replaced Greedy’s intake camera after game 1.',
          'Your bumpers are blue this match.',
        ],
        prompt: 'Pick every detail that matters for choosing Safe or Greedy.',
        choices: [
          { text: 'Greedy went 1 of 3 in the playoffs, 6 of 9 in quals', points: 25, result: 'The rate may have changed' },
          { text: 'Greedy and your partner use the same pieces', points: 25, result: 'Linked outcomes: both can fail together' },
          { text: 'The intake camera was replaced', points: 25, result: 'Old data may not describe the new robot' },
          { text: 'The opponent’s best robot is back', points: 25, result: 'You may need more points than in game 1' },
          { text: 'Your bumpers are blue', points: -25, result: 'No effect' },
        ],
        takeaway: 'Real decisions bundle several factors. List them before calculating anything.',
        explain: 'Four of the five details change Greedy’s success rate, how its failure hurts, or how many points you need. Only the bumper color is noise.',
        discuss: 'Which of the four is the biggest unknown? Which could you check in the next five minutes?',
      },
      {
        type: 'number',
        title: 'Pool the Data',
        prompt: 'Pooling quals and playoffs (7 of 12), and using the add-one-make-one-miss rule, what is your best guess at Greedy’s success rate?',
        number: { value: 57.1, min: 0, max: 100, unit: '%', tiers: [[2, 100], [5, 60], [10, 25]] },
        hint: '(7 + 1) / (12 + 2)',
        takeaway: 'Best guess about 57%, but with a new camera, even this is shaky.',
        explain: '8 / 14 = 57%. Pooling assumes the robot didn’t change between quals and playoffs, which the camera swap calls into question.',
        discuss: 'Would you weight the playoff attempts more than the quals? Why?',
      },
      {
        type: 'number',
        title: 'Expected Auto Points',
        prompt: 'At 57%, what does Greedy average, counting the 2 teleop points a failure costs? (Safe averages 6.)',
        number: { value: 7.7, min: 0, max: 15, step: 0.1, unit: ' pts', tiers: [[0.3, 100], [1, 60], [2, 25]] },
        hint: '15 × 0.57, minus 2 × 0.43',
        takeaway: 'Greedy averages about 7.7, Safe 6: a small edge resting on an uncertain rate.',
        explain: '15 × 0.57 − 2 × 0.43 = 8.55 − 0.86 ≈ 7.7. Greedy breaks even with Safe at about a 47% success rate, close to what the playoff record suggests.',
        discuss: 'What success rate makes Greedy and Safe equal? How sure are you Greedy is above it?',
        explore: {
          controls: [{ id: 'p', label: 'Greedy works', min: 0, max: 100, value: 57, unit: '%' }],
          model: (v) => {
            const g = (15 * v.p) / 100 - (2 * (100 - v.p)) / 100;
            return {
              stats: [
                { label: 'Greedy averages', value: g.toFixed(1) },
                { label: 'Safe averages', value: '6.0' },
                { label: 'Better on average', value: g > 6 ? 'Greedy' : 'Safe', hi: true },
              ],
              note: 'Break-even: 15p − 2(1 − p) = 6, so p ≈ 47%.',
            };
          },
        },
      },
      {
        type: 'choice',
        title: 'Final Call',
        prompt: 'Which auto, and why?',
        choices: [
          { text: 'Greedy: it averages more (7.7 vs 6)', points: 50, result: 'Right number, but it ignores the link and the new camera' },
          { text: 'Safe: 1 of 3 proves Greedy is broken', points: 20, result: 'Three tries prove very little' },
          { text: 'Greedy only if your partner switches to an auto that avoids the center pieces; otherwise Safe', points: 100, result: 'Removes the link and keeps the higher average' },
          { text: 'It doesn’t matter: autos are only a few points', points: 0, result: 'Game 1 was decided by 6' },
        ],
        takeaway: 'Good strategy is a chain: list the details, estimate, compare, then fix the assumption that hurts you most.',
        explain: 'The edge for Greedy is small and rests on an uncertain rate. The linked failure with your partner is the one factor you can remove before the match, so remove it, then take the edge.',
        discuss: 'What single observation before game 2 would most change your call?',
      },
    ],
  },
];
