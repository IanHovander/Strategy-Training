// Lesson 1, Part 1: Learn. Case studies that get you ready for the Test (and the Showdown). Each starts with an
// exact answer, then adds evidence and unknowns at every step: misleading first results, small samples, links
// between robots, opponents who adapt, scouting error. Later cases are mostly unknowns to spot and argue about.
// Fields are described in lessons.js; `prepares` lists the Test investigations a case gets you ready for.
//
// Step types:
//   number   estimate a value with a slider; points by how close you are (number.tiers: [[within, points], ...])
//   choice   pick one answer
//   multi    pick every option that matters; red herrings have negative points
// Learn's choice and multi steps also ask how sure you are (no points; see quiz.js).
import { betaRange, binomial, matchup, pct, times } from './prob.js';
import { cycles } from './lesson1-draft.js';
import { matchOdds, playMatch } from './alliance.js';

/** Points for exact calculations: dead on, close, in the neighborhood. */
const EXACT = [[1, 100], [5, 50], [10, 20]];
/** Points for estimates where reasonable rounding differs. */
const ESTIMATE = [[3, 100], [8, 60], [15, 25]];

// "The Strategy That Lost": a Showdown match between two made-up alliances, run through the real match model.
const robot = (id, typical, spread, broken, susceptibility, defense) => ({ id, name: id, cycles: cycles(typical, spread, broken), susceptibility, defense });
function showdownSides(crateDefense = 0.8, titanSusceptibility = 0.8, defend = true) {
  const ours = [robot('ace', 9, 1.2, 0.04, 0.4, 0.2), robot('bolt', 6, 1.2, 0.04, 0.5, 0.2), robot('crate', 3, 1, 0.03, 0.2, crateDefense)];
  const theirs = [robot('titan', 11, 1.3, 0.04, titanSusceptibility, 0.2), robot('duke', 5, 1, 0.04, 0.5, 0.2), robot('elm', 4, 1, 0.04, 0.5, 0.3)];
  const side = (teams, assign = {}) => ({ teams, assign: Object.fromEntries(teams.map((t) => [t.id, assign[t.id] ?? 'offense'])) });
  return [side(ours, defend ? { crate: { target: 'titan', ifDefending: 'stay' } } : {}), side(theirs)];
}
let allOffense = null; // worked out the first time an explorer asks: it doesn't depend on the sliders
function allOffenseRow() {
  if (!allOffense) {
    const sides = showdownSides(0.8, 0.8, false);
    const odds = matchOdds(sides, { runs: 4000 });
    allOffense = { win: odds.win[0], tie: odds.tie, play: () => playMatch(sides).scores };
  }
  return allOffense;
}

export const LEARN = [
  {
    title: 'The Sure Thing',
    prepares: [1, 2, 7],
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
    title: 'Same Average, Different Shape',
    prepares: [4, 7],
    setup: 'The opponent scores <b>8 or 14</b>, half the time each. You have two plans that both average <b>12</b>. <b>Smooth</b> scores exactly 12. <b>Spike</b> scores 0 (25% of matches: it jams), 12 (25%) or 18 (50%). A tie is not a win.',
    steps: [
      {
        type: 'number',
        title: 'Smooth',
        prompt: 'How often does Smooth win?',
        number: { value: 50, min: 0, max: 100, unit: '%', tiers: EXACT },
        takeaway: 'A steady score wins exactly the matches where the opponent lands below it.',
        explain: '12 beats 8 and loses to 14: 50%.',
        discuss: 'Smooth never has a bad match. Why is it only a coin flip?',
      },
      {
        type: 'number',
        title: 'Spike',
        prompt: 'How often does Spike win?',
        number: { value: 62.5, min: 0, max: 100, step: 0.5, unit: '%', tiers: EXACT },
        hint: 'Take Spike’s three scores one at a time. Which of the opponent’s scores does each one beat?',
        takeaway: 'Same average, but Spike puts more of its matches above the opponent.',
        explain: 'A 0 beats nothing. A 12 beats the 8: 25% × 50% = 12.5%. An 18 beats both: 50%. Total 62.5%, though Spike jams one match in four.',
        discuss: 'Would your drive team pick the plan that jams a quarter of the time? What would you say to convince them?',
        explore: {
          controls: [
            { id: 'low', label: 'Opponent’s low score', min: 0, max: 14, value: 8 },
            { id: 'high', label: 'Opponent’s high score', min: 6, max: 20, value: 14 },
          ],
          model: (v) => {
            const opp = [[v.low, 0.5], [v.high, 0.5]];
            return { strategies: [matchup('Smooth 12', [[12, 1]], opp), matchup('Spike 0 / 12 / 18', [[0, 0.25], [12, 0.25], [18, 0.5]], opp)] };
          },
        },
      },
      {
        type: 'choice',
        title: 'A Weaker Opponent',
        facts: ['Next match the opponent is weaker: <b>4 or 10</b>, half the time each.'],
        prompt: 'Which plan now?',
        choices: [
          { text: 'Smooth', points: 100, result: 'Wins 100%: 12 beats both' },
          { text: 'Spike', points: 0, result: 'Wins 75%: the jam still loses' },
          { text: 'Either: they average the same', points: 0, result: '100% vs 75%' },
        ],
        takeaway: 'When your steady score already wins, the only thing risk adds is a way to lose.',
        explain: 'Smooth beats 4 and 10 every time. Spike’s 18 wins by more, but a win only counts once, and its jam loses a quarter of the time.',
        discuss: 'What does Spike’s 18 buy you here? When would winning by more actually matter?',
      },
      {
        type: 'choice',
        title: 'The Rule of Thumb',
        prompt: 'Which rule picks the right plan against both opponents?',
        choices: [
          { text: 'Pick the higher average', points: 0, result: 'They had the same average both times' },
          { text: 'Favorite: cut risk. Underdog: add risk.', points: 100, result: 'Against 8/14 Smooth was a coin flip; against 4/10 it never lost' },
          { text: 'Pick the plan with the higher best case', points: 0, result: 'Spike’s 18 lost to the weaker opponent' },
          { text: 'Pick the plan that never scores 0', points: 25, result: 'Right once, wrong against 8/14' },
        ],
        takeaway: 'Ask where the opponent’s scores sit compared to yours, not what your plan averages.',
        explain: 'If your safe score already beats most of what they do, protect it. If it mostly loses or ties, you need the upside, and the risk that comes with it.',
        discuss: 'Your team is the favorite in most qualification matches. Which of your plans are Spikes? Should you still run them?',
      },
    ],
  },
  {
    title: 'Linked Fates',
    prepares: [3],
    setup: 'Your two partners each finish the endgame climb <b>half the time</b>. The alliance earns a ranking point (RP) if <b>at least one</b> of them climbs.',
    steps: [
      {
        type: 'number',
        title: 'Two Chances',
        prompt: 'If their climbs have nothing to do with each other, how often does the alliance get the RP?',
        number: { value: 75, min: 0, max: 100, unit: '%', tiers: EXACT },
        hint: 'It’s easier to count the one way to miss: both fail.',
        takeaway: 'Two independent chances cover for each other.',
        explain: 'You miss only when both fail: 50% × 50% = 25%. So the RP comes 75% of the time.',
      },
      {
        type: 'choice',
        title: 'One Rung',
        facts: ['Both partners climb on the <b>same rung</b>. Scouts say that when one slips, it usually knocks the other off: they succeed together or fail together.'],
        prompt: 'Now how often does the alliance get the RP?',
        choices: [
          { text: '75%: each is still 50%', points: 0, result: 'Only if they’re independent' },
          { text: '50%', points: 100, result: 'Together, they act like one robot' },
          { text: '25%', points: 0, result: 'That’s both climbing, independently' },
          { text: '100%', points: 0, result: 'That needs opposite outcomes' },
        ],
        takeaway: 'Same two 50% robots, but linked: the backup disappears.',
        explain: 'If they always succeed or fail together, “at least one” is the same as “the first one”: 50%. Neither robot’s rate changed. The link did.',
        discuss: 'Scouting sheets record each robot on its own. How would you ever notice a link like this?',
      },
      {
        type: 'choice',
        title: 'A Different Goal',
        facts: ['A second RP needs <b>both</b> partners to climb.'],
        prompt: 'For this RP, which link is best for you?',
        choices: [
          { text: 'Independent', points: 0, result: 'Both climb 25% of the time' },
          { text: 'Together (the shared rung)', points: 100, result: 'Both climb 50% of the time' },
          { text: 'Opposite: when one climbs, the other can’t', points: 0, result: 'Both climb 0% of the time' },
          { text: 'It makes no difference', points: 0, result: 'Anywhere from 0% to 50%' },
        ],
        takeaway: 'Links hurt “at least one” goals and help “all of them” goals.',
        explain: 'Together, both climb whenever the first does: 50%. Independent: 50% × 50% = 25%. Opposite: never both. The same shared rung that cost you the first RP helps with this one.',
        discuss: 'Which of your team’s goals are “at least one” goals, and which are “all of them”?',
        explore: {
          controls: [{ id: 'link', label: 'How the climbs are linked', options: ['Together', 'Independent', 'Opposite'], value: 0 }],
          model: (v) => ({
            stats: [
              { label: 'At least one climbs', value: ['50%', '75%', '100%'][v.link] },
              { label: 'Both climb', value: ['50%', '25%', '0%'][v.link], hi: true },
            ],
            note: 'Each robot climbs half the time in all three. Only the link changes.',
          }),
        },
      },
      {
        type: 'multi',
        title: 'Spot the Link',
        prompt: 'Pick every detail that could link two robots’ results in the same match.',
        choices: [
          { text: 'They share one rung or one scoring spot', points: 25, result: 'One’s trouble becomes the other’s' },
          { text: 'They feed from the same game-piece supply', points: 25, result: 'A slow feeder slows both' },
          { text: 'One opposing defender can get in both their ways', points: 25, result: 'Defense lands on the alliance' },
          { text: 'Both depend on a field element that sometimes jams', points: 25, result: 'A jam hits everyone at once' },
          { text: 'Each robot climbs 50% of the time', points: -25, result: 'Rates say nothing about links' },
          { text: 'Their team numbers are close together', points: -25, result: 'No effect on the field' },
        ],
        takeaway: 'When results share a cause, multiplying probabilities gives the wrong answer.',
        explain: 'Shared space, shared supply, shared defenders and shared field elements make results move together. Matching rates and team numbers don’t.',
        discuss: 'Where on a real field do two robots’ results move in opposite directions instead?',
      },
    ],
  },
  {
    title: 'The Better Robot Lost',
    prepares: [5],
    setup: 'Two shooters. <b>Ace</b> makes <b>70%</b> of its shots and <b>Blitz</b> makes <b>50%</b>, measured over hundreds of practice shots. In a match each takes <b>10 shots</b>, and each make is a point.',
    steps: [
      {
        type: 'choice',
        title: 'Match 1',
        exhibit: { title: 'Match 1', sides: ['Ace', 'Blitz'], matches: [[4, 6]] },
        prompt: 'Blitz won Match 1, 6 to 4. Your teammate says: “Blitz is the better shooter. We saw it.” What does Match 1 tell you?',
        choices: [
          { text: 'Blitz is better: the match proved it', points: 0, result: 'One match is 10 shots each' },
          { text: 'The practice numbers must be wrong', points: 0, result: 'Hundreds of shots outweigh 10' },
          { text: 'Very little: one match can go either way', points: 100, result: 'Blitz outscores Ace about 1 match in 8' },
          { text: 'Ace is due for a big match next time', points: 0, result: 'Shots don’t remember: still 70% each' },
        ],
        takeaway: 'One result is a sample, not a verdict.',
        explain: 'Even with Ace a true 70% shooter, Blitz outscores it in about 12% of 10-shot matches, so seeing it once says almost nothing. And Ace isn’t “due”: every shot is still 70%.',
        discuss: 'When has your team changed plans after one match? Was it the right call?',
      },
      {
        type: 'number',
        title: 'Ten More Matches',
        exhibit: { title: 'Ten matches (Match 1 is the first)', sides: ['Ace', 'Blitz'], matches: [[4, 6], [7, 5], [8, 4], [6, 6], [7, 3], [5, 6], [9, 5], [6, 4], [4, 5], [8, 3]] },
        prompt: 'Ace won 6 of these 10. What is Ace’s <b>true</b> chance of winning a match?',
        number: { value: 76, min: 0, max: 100, unit: '%', tiers: [[4, 100], [10, 60], [20, 25]] },
        hint: 'Ace makes 2 more shots per match on average. To lose, Ace needs an off match while Blitz has a good one. Is 6 of 10 more or less lopsided than you’d expect?',
        takeaway: 'Ten matches is still a small sample. It can miss the truth by 15 points or more.',
        explain: 'Exactly: Ace wins 76%, ties 12%, loses 12%. These ten matches showed 60%. That’s normal: from 6 wins in 10, the 90% range for the true rate runs from about 35% to 80%.',
        discuss: 'Your season might be 10 or 12 qualification matches per event. What does that mean for your own scouting data?',
      },
      {
        type: 'choice',
        title: 'Fewer Shots',
        exhibit: { title: '10,000 simulated matches, 10 shots each', stats: [['Ace wins', '76.0%'], ['Tie', '11.8%'], ['Blitz wins', '12.2%']] },
        prompt: 'A shorter game gives each robot only <b>3 shots</b>. What happens to Ace’s 76%?',
        choices: [
          { text: 'Stays 76%: same robots', points: 0, result: 'Fewer shots, more luck' },
          { text: 'Drops to about 54%', points: 100, result: 'Ace wins 54%, ties 28%' },
          { text: 'Rises: fewer shots, fewer misses', points: 0, result: 'Blitz misses fewer too' },
          { text: 'Drops to about 30%', points: 25, result: 'Right direction, too far' },
        ],
        takeaway: 'Fewer attempts let luck decide more. More attempts let the better robot show.',
        explain: 'With 3 shots each, Ace wins 54% and ties 28%. With 1 shot: 35%, and half the matches tie. With 20 shots: about 88%. The robots never changed, only the number of trials.',
        discuss: 'Which is a better test of a robot: one long match or three short ones? Why?',
        explore: {
          controls: [
            { id: 'n', label: 'Shots per robot', min: 1, max: 30, value: 3 },
            { id: 'a', label: 'Ace makes', min: 30, max: 95, step: 5, value: 70, unit: '%' },
            { id: 'b', label: 'Blitz makes', min: 30, max: 95, step: 5, value: 50, unit: '%' },
          ],
          model: (v) => ({ strategies: [matchup('Ace vs Blitz', binomial(v.n, v.a / 100), binomial(v.n, v.b / 100))] }),
        },
      },
      {
        type: 'multi',
        title: 'Real Evidence',
        prompt: 'Pick every observation that would be real evidence Ace is <b>not</b> a 70% shooter in your next match.',
        choices: [
          { text: 'Ace makes 41 of its next 100 shots', points: 30, result: 'A true 70% shooter almost never does that' },
          { text: 'Ace’s misses come from the far zone, and in the playoffs it must shoot from there', points: 30, result: 'Different conditions, different rate' },
          { text: 'Ace was rebuilt last night and hasn’t shot since', points: 30, result: 'The 70% describes the old robot' },
          { text: 'Ace lost Match 1', points: -20, result: 'Happens to a 70% shooter 1 match in 8' },
          { text: 'Blitz’s drive team is more confident', points: -20, result: 'Confidence isn’t accuracy' },
        ],
        takeaway: 'Lots of attempts, or a real change in conditions, is evidence. One loss isn’t.',
        explain: 'A real 70% shooter makes 41 or fewer of 100 about twice in a billion tries. A rebuilt robot or a new shooting spot means the old number may not apply. A single loss is exactly what a 70% shooter does sometimes.',
        discuss: 'Judge the decision, not the result: if you had picked Ace and lost Match 1, was picking Ace a mistake?',
      },
    ],
  },
  {
    title: 'Three Robots, One Alliance',
    prepares: [5, 6],
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
    title: 'What Are You Playing For?',
    prepares: [1, 7],
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
    title: 'Thirty Seconds Left',
    prepares: [8],
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
    prepares: [9],
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
        type: 'number',
        title: 'The Next Event',
        facts: ['Back to the real data: 7 of 10. At the next event, scouts see the same shot go in <b>15 of 30</b> times.'],
        prompt: 'Pooling both events (22 of 40) with the add-one rule, what’s your best guess now?',
        number: { value: 54.8, min: 0, max: 100, step: 0.1, unit: '%', tiers: [[2, 100], [5, 60], [10, 25]] },
        hint: '(22 + 1) / (40 + 2)',
        takeaway: 'New data moves the estimate in proportion to how much of it there is: 30 shots outweigh 10.',
        explain: '23 / 42 ≈ 55%, with a 90% range of about 42% to 67%. Pooling assumes it’s the same robot taking the same shot. If the team rebuilt its shooter between events, the newer 50% is the better guide.',
        discuss: 'Would you pool the two events, or trust only the newer one? What would you ask the scouts first?',
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
    title: 'Read Their Mind',
    prepares: [10],
    setup: 'Playoffs. You choose <b>Shoot</b> (your usual plan) or <b>Feed</b> (pass to your partner). The other alliance chooses to <b>Score</b>, or to <b>Defend</b> your shooter. Your scouting and practice give your chance to win in each pairing.',
    steps: [
      {
        type: 'choice',
        title: 'If They Never Change',
        exhibit: { title: 'Your chance to win', stats: [['Shoot vs Score', '65%'], ['Shoot vs Defend', '30%'], ['Feed vs Score', '45%'], ['Feed vs Defend', '55%']] },
        prompt: 'They’ve played Score in every match this event. If they keep doing that, which plan?',
        choices: [
          { text: 'Shoot', points: 100, result: '65% vs 45%' },
          { text: 'Feed', points: 0, result: '45%: only good against defense' },
          { text: 'Mix the two at random', points: 25, result: 'Every Feed gives up 20 points of win chance' },
        ],
        takeaway: 'Against an opponent who won’t change, take your best reply.',
        explain: 'If they always Score, Shoot wins 65% and Feed 45%. No reason to do anything else, as long as they really won’t change.',
      },
      {
        type: 'choice',
        title: 'They Scout You',
        facts: ['Their scouts have watched you <b>Shoot</b> in all 12 of your matches. Their strategist is sharp.'],
        prompt: 'If you Shoot again and they see it coming, what do they do, and what’s your chance?',
        choices: [
          { text: 'They Score: you win 65%', points: 0, result: 'Score is their worst reply to Shoot' },
          { text: 'They Defend: you win 30%', points: 100, result: 'Their best reply to Shoot' },
          { text: 'They flip a coin: you win about 48%', points: 0, result: 'Not if they know your plan' },
        ],
        takeaway: 'A plan the other side can predict gets its worst-case number.',
        explain: 'Your 65% assumed they wouldn’t react. Against a known Shoot they Defend: 30%. Against a known Feed they Score: 45%. Whatever you commit to openly, a smart opponent picks the answer to it.',
        discuss: 'What could tip them off about your plan before the match even starts?',
      },
      {
        type: 'number',
        title: 'Keep Them Guessing',
        prompt: 'You decide in secret, at random, and Shoot some share of the time, so that Score and Defend leave them equally well off. What share of the time should you Shoot?',
        number: { value: 22, min: 0, max: 100, unit: '%', tiers: [[3, 100], [8, 60], [15, 25]] },
        hint: 'Shoot a share p of the time. Against Score you win 65p + 45(1 − p); against Defend, 30p + 55(1 − p). Set them equal.',
        takeaway: 'Unpredictability is worth points when the other side adapts.',
        explain: '20p + 45 = 55 − 25p, so p = 10 / 45 ≈ 22%. Then you win about 49% whatever they do: better than always Shooting (30% once they Defend) or always Feeding (45% once they Score).',
        discuss: 'Shooting only 22% of the time feels wrong when Shoot has the best number. Why does it work?',
        explore: {
          controls: [{ id: 'mix', label: 'You Shoot (% of matches)', min: 0, max: 100, value: 22, unit: '%' }],
          model: (v) => {
            const p = v.mix / 100;
            const score = 0.65 * p + 0.45 * (1 - p);
            const defend = 0.3 * p + 0.55 * (1 - p);
            return {
              stats: [
                { label: 'If they Score', value: pct(score) },
                { label: 'If they Defend', value: pct(defend) },
                { label: 'You’re sure of', value: pct(Math.min(score, defend)), hi: true },
              ],
              note: `Their best reply: ${Math.abs(score - defend) < 0.005 ? 'either, it makes no difference' : score < defend ? 'Score' : 'Defend'}.`,
            };
          },
        },
      },
      {
        type: 'multi',
        title: 'Before You Mix',
        prompt: 'Pick every detail that should change whether, or how much, you mix.',
        choices: [
          { text: 'They’ve never once changed plans at this event', points: 25, result: 'If they won’t adapt, just Shoot' },
          { text: 'Your robot’s setup shows your plan before the match starts', points: 25, result: 'If they can see it, mixing does nothing' },
          { text: 'The four percentages came from 6 practice matches', points: 25, result: 'The 22% rests on shaky numbers' },
          { text: 'Feeding only works if your partner isn’t defended', points: 25, result: 'Feed’s numbers depend on their choice too' },
          { text: 'Shoot is your drive team’s favorite', points: -25, result: 'Not a win-chance input' },
        ],
        takeaway: 'Mixing helps only if they adapt and can’t see your choice. Check both before you flip a coin.',
        explain: 'An opponent that never adapts should just get your best reply. One that can see your plan can’t be fooled by a coin flip. And the exact mix is only as good as the four numbers behind it.',
        discuss: 'Has a team ever read your plan? What gave it away?',
      },
    ],
  },
  {
    title: 'Where’s the Line?',
    prepares: [11],
    setup: 'Endgame, and the opponent is done scoring. <b>Low climb</b>: 9 points, works <b>95%</b> of the time. <b>High climb</b>: 16 points if it works, 0 if it doesn’t, and its longer setup always costs about <b>1 point</b> of scoring.',
    steps: [
      {
        type: 'number',
        title: 'The Low Climb',
        prompt: 'How many points does the low climb average?',
        number: { value: 8.55, min: 0, max: 16, step: 0.05, unit: ' pts', tiers: [[0.1, 100], [0.5, 60], [1, 25]] },
        takeaway: 'One way to score: average = points × chance.',
        explain: '9 × 0.95 = 8.55.',
      },
      {
        type: 'number',
        title: 'The Break-Even',
        prompt: 'At what success rate does the high climb average exactly as much as the low climb?',
        number: { value: 59.7, min: 0, max: 100, step: 0.1, unit: '%', tiers: [[1, 100], [3, 60], [6, 25]] },
        hint: 'The high climb averages 16p − 1. Set that equal to 8.55.',
        takeaway: 'Find the line first. Then ask which side of it you’re on, and how sure you are.',
        explain: '16p − 1 = 8.55, so p = 9.55 / 16 ≈ 59.7%. Above that, the high climb averages more; below it, the low climb does.',
        explore: {
          controls: [{ id: 'p', label: 'High climb works', min: 0, max: 100, value: 60, unit: '%' }],
          model: (v) => {
            const high = (16 * v.p) / 100 - 1;
            return {
              stats: [
                { label: 'High averages', value: high.toFixed(2) },
                { label: 'Low averages', value: '8.55' },
                { label: 'More on average', value: high > 8.55 ? 'High' : 'Low', hi: true },
              ],
              note: 'Break-even: 16p − 1 = 8.55, so p ≈ 59.7%.',
            };
          },
        },
      },
      {
        type: 'choice',
        title: 'On the Line',
        facts: ['Scouting: the high climb worked <b>6 of 10</b> times in practice.'],
        prompt: 'High or low?',
        choices: [
          { text: 'High: 60% is above 59.7%', points: 25, result: 'The raw rate, barely over' },
          { text: 'Low: add-one gives 7 / 12 = 58%, below the line', points: 25, result: 'A better estimate, barely under' },
          { text: 'On average it’s a wash: decide on what this match needs', points: 100, result: '8.6 vs 8.55: the averages can’t separate them' },
          { text: 'Don’t decide until there’s more data', points: 0, result: 'The match is now' },
        ],
        takeaway: 'When your estimate sits on the line, averages can’t choose for you. The situation can.',
        explain: 'From 6 of 10, the true rate could be anywhere from about 35% to 80%: the line is deep inside that range, and the averages differ by a tenth of a point. Arguing 60% vs 58% is arguing about noise.',
        discuss: 'What’s the cheapest way to learn more about the high climb before your next match?',
      },
      {
        type: 'choice',
        title: 'What You Need',
        facts: ['You trail by <b>12</b> going into the climb.'],
        prompt: 'Now which climb?',
        choices: [
          { text: 'Low', points: 0, result: '9 can’t catch 12: wins 0%' },
          { text: 'High', points: 100, result: 'Wins whenever it works: about 6 in 10' },
          { text: 'Either: same average', points: 0, result: '0% vs about 60%' },
        ],
        takeaway: 'Same numbers, clear answer: only the high climb can win.',
        explain: 'Down 12, only the high climb gets there (16 − 1 = 15 > 12). The low climb’s 95% is 95% of a loss. Trailing by 8 instead, the low climb wins 95% of the time and is the clear call.',
        discuss: 'Before a match, how do you make sure the drive team knows the score they’ll need at the climb?',
      },
    ],
  },
  {
    title: 'Who Do You Defend?',
    prepares: [11, 'Showdown'],
    setup: 'Showdown rules: a defender takes away <b>its defense ability × the target’s susceptibility</b> of the target’s cycles. Your robot <b>Pest</b> scores <b>3 cycles</b> on offense and has <b>60%</b> defense. Their two best scorers: <b>Titan</b>, 10 cycles a match, <b>20%</b> susceptible, and <b>Feather</b>, 7 cycles, <b>90%</b> susceptible.',
    steps: [
      {
        type: 'number',
        title: 'Defend Titan',
        prompt: 'How many cycles a match would Pest take away from Titan?',
        number: { value: 1.2, min: 0, max: 10, step: 0.1, unit: ' cycles', tiers: [[0.1, 100], [0.4, 60], [1, 25]] },
        hint: '10 × 0.6 × 0.2',
        takeaway: 'The best robot isn’t always the one defense hurts most.',
        explain: '60% × 20% = 12% of Titan’s cycles: 1.2 of its 10. Titan barely notices.',
      },
      {
        type: 'number',
        title: 'Defend Feather',
        prompt: 'And from Feather?',
        number: { value: 3.8, min: 0, max: 10, step: 0.1, unit: ' cycles', tiers: [[0.1, 100], [0.4, 60], [1, 25]] },
        hint: '7 × 0.6 × 0.9',
        takeaway: 'A weaker robot that folds under defense can be the better target.',
        explain: '60% × 90% = 54% of Feather’s 7 cycles: about 3.8.',
      },
      {
        type: 'choice',
        title: 'Pest’s Job',
        prompt: 'Pest gives up its own 3 cycles to defend. Best plan?',
        choices: [
          { text: 'Defend Titan: stop their best robot', points: 0, result: 'They lose 1.2, you lose 3' },
          { text: 'Defend Feather', points: 100, result: 'They lose 3.8, you lose 3: about +0.8' },
          { text: 'Stay on offense', points: 40, result: 'Close: Feather is only 0.8 better' },
          { text: 'Defend whoever is scoring most during the match', points: 0, result: 'Showdown roles are set before the match' },
        ],
        takeaway: 'Defense pays when it takes away more than the defender would have scored.',
        explain: 'On Feather, the swing is 3.8 − 3 ≈ +0.8 cycles a match. On Titan it’s 1.2 − 3 = −1.8. Defenders also break down 5 points more often than they score 0, which trims Feather’s edge a little more.',
        discuss: 'Your team wants to defend the top robot because it “feels” right. How do you make the case with these numbers?',
      },
      {
        type: 'multi',
        title: 'How Sure Are You?',
        facts: ['Scouts’ defense numbers usually miss by about <b>15 points</b>, and sometimes by 35. Pest’s 60% could easily really be 45%, and Feather’s 90% could be 75%.'],
        prompt: 'Pick every detail that could flip the call to “stay on offense”.',
        choices: [
          { text: 'Pest’s real defense is 45% and Feather’s susceptibility 75%', points: 25, result: '7 × 0.45 × 0.75 = 2.4, less than 3' },
          { text: 'Pest really scores 4 cycles on offense, not 3', points: 25, result: 'Defending costs more' },
          { text: 'Feather has an off match and tries only 5 cycles', points: 25, result: 'Less to take away: 5 × 0.54 = 2.7' },
          { text: 'Defenders break down a bit more often', points: 25, result: 'A broken defender takes nothing after it breaks' },
          { text: 'Titan is the top-ranked robot at the event', points: -25, result: 'Rank doesn’t change who defense hurts' },
        ],
        takeaway: 'A 0.8-cycle edge sits inside the scouting error. Know which way each error would push it.',
        explain: 'If both estimates are a typical 15 points too high, Pest takes only 2.4 cycles from Feather and offense wins. With an edge this thin, ask which estimate you trust least, and whether you can check it.',
        discuss: 'In the Showdown, which robots would you defend? Which numbers would you want your scouts to pin down first?',
      },
    ],
  },
  {
    title: 'The Strategy That Lost',
    prepares: ['Showdown'],
    setup: 'A Showdown match. You put <b>Crate</b> (3 cycles, defense <b>80%</b>) on <b>Titan</b> (11 cycles, <b>80%</b> susceptible) all match, while <b>Ace</b> (9 cycles) and <b>Bolt</b> (6) score. They run all three on offense: Titan, <b>Duke</b> (5) and <b>Elm</b> (4).',
    steps: [
      {
        type: 'choice',
        title: 'It Lost',
        exhibit: { title: 'Match 1: Crate defends Titan', sides: ['You', 'Them'], matches: [[13, 17]], note: 'Titan still made 7 cycles with Crate on it all match.' },
        prompt: 'You lost 13 to 17. Your captain: “Defense doesn’t work. All offense next match.” Best response?',
        choices: [
          { text: 'Agree: it lost', points: 0, result: 'One match is one sample' },
          { text: 'Ask how often the plan wins, not whether it won', points: 100, result: 'The question that matters' },
          { text: 'Switch Crate to defending Duke', points: 0, result: 'Still reacting to one result' },
          { text: 'It must have been the drivers', points: 0, result: 'Nothing says they drove badly' },
        ],
        takeaway: 'Judge a plan by how often it wins, not by its last result.',
        explain: 'Crate leaves Titan 36% of its cycles (1 − 0.8 × 0.8): about 4 of 11. Titan making 7 or more happens only about 1 match in 10 (counting the times Crate breaks down). Match 1 was a rare one.',
        discuss: 'Why does a surprising loss feel like stronger evidence than a surprising win?',
      },
      {
        type: 'number',
        title: 'Ten Matches',
        exhibit: { title: 'The same plans, 10 matches (Match 1 is the first)', sides: ['You', 'Them'], matches: [[13, 17], [17, 11], [13, 11], [14, 17], [19, 14], [16, 10], [15, 22], [15, 14], [14, 13], [14, 12]] },
        prompt: 'You won 7 of 10. Using the add-one rule, what’s your best guess at this plan’s chance to win?',
        number: { value: 66.7, min: 0, max: 100, step: 0.1, unit: '%', tiers: [[2, 100], [5, 60], [10, 25]] },
        hint: '(7 + 1) / (10 + 2)',
        takeaway: 'Ten matches turn “it lost” into “it usually wins”, with a wide range.',
        explain: '8 / 12 ≈ 67%. The 90% range is still wide, about 44% to 87%, but it’s nowhere near “defense doesn’t work”.',
      },
      {
        type: 'choice',
        title: 'Run It 20,000 Times',
        exhibit: {
          title: '20,000 simulated matches each',
          stats: [['Defend Titan: win', '68%'], ['Defend Titan: tie', '9%'], ['All offense: win', '25%'], ['All offense: tie', '11%']],
          note: 'Average cycles. Defending: you 14.4, them 12.6. All offense: you 17.3, them 18.9.',
        },
        prompt: 'Was defending Titan in Match 1 a good decision?',
        choices: [
          { text: 'Yes: it wins 68% vs 25%. Match 1 was the 1-in-4 loss', points: 100, result: 'Good decision, bad result' },
          { text: 'No: it lost', points: 0, result: 'Judging by the result, not the odds' },
          { text: 'You can’t judge a plan until it wins', points: 0, result: 'Then you’d be judging luck too' },
          { text: 'Yes: defense always beats offense', points: 25, result: 'Right call, wrong reason: it depends on the numbers' },
        ],
        takeaway: 'Good decisions sometimes lose. Bad ones sometimes win. Judge the decision by its odds.',
        explain: 'Defending costs you Crate’s 3 cycles but takes about 6 from Titan. All offense scores more for you and even more for them. It still loses about 1 match in 4, and Match 1 was one of those.',
        discuss: 'After a loss in the Showdown, how will your group tell a bad plan from bad luck?',
      },
      {
        type: 'choice',
        title: 'How Wrong Can Scouting Be?',
        facts: ['Crate’s 80% defense is a scouting estimate. Scouts usually miss by about 15 points (so 65% to 95%), and sometimes by 35 (as low as 45%).'],
        prompt: 'Does the call to defend Titan still hold?',
        choices: [
          { text: 'Yes: defending stays better unless Crate’s defense is below about 35%', points: 100, result: 'Even at 45% it wins about 34%' },
          { text: 'No: a 35-point miss would flip it', points: 0, result: 'At 45%, defending still wins about 34% vs 25%' },
          { text: 'Only if Crate’s defense is really 80%', points: 0, result: 'The edge is much wider than that' },
          { text: 'Can’t tell without playing more matches', points: 25, result: 'The model can tell you now' },
        ],
        takeaway: 'A strong call survives its worst-case numbers. Check that before the match, not after a loss.',
        explain: 'Defending wins about 54% at 65% defense and 79% at 95%, against 25% for all offense. Even a rare 35-point miss (45%) still leaves it ahead, at 34%. It only stops paying near 35%.',
        discuss: 'Which of your Showdown decisions would flip within the scouting error? Those are the ones to argue about.',
        explore: {
          controls: [
            { id: 'def', label: 'Crate’s real defense', min: 20, max: 100, step: 5, value: 80, unit: '%' },
            { id: 'sus', label: 'Titan’s real susceptibility', min: 20, max: 100, step: 5, value: 80, unit: '%' },
          ],
          model: (v) => {
            const sides = showdownSides(v.def / 100, v.sus / 100);
            const odds = matchOdds(sides, { runs: 4000 });
            return {
              strategies: [
                { label: 'Crate defends Titan', win: odds.win[0], tie: odds.tie, play: () => playMatch(sides).scores },
                { label: 'All offense', ...allOffenseRow() },
              ],
              note: 'Exact chances come from 4,000 simulated matches, so they wobble by about a point.',
            };
          },
        },
      },
    ],
  },
  {
    title: 'Semifinal, Game 2',
    prepares: [8, 9, 11],
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
