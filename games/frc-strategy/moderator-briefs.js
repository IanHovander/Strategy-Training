// Moderator-only coaching notes for Learn. These are not answer keys.
// Match results exist only where the case explicitly supplies them; never manufacture more qualification matches.
// In the GitHub Pages version, privacy is by UI (not secure against inspecting the public JavaScript bundle).
export const MODERATOR_BRIEFS = [
  {
    focus: 'A first, low-pressure call about possible scores. Keep it simple and let students find the tradeoff.',
    evidence: ['Anchor scoring 10 and the opponent scoring 8/14 are the stated rules of this simplified drill, not claims of a perfectly reliable physical robot.', 'The second plan and all later changes appear as new intel in the case file. Do not reveal them early unless a student asks a question that genuinely reaches them.'],
    discussion: ['Ask which score outcomes each plan beats.', 'If someone challenges a guarantee: “Good catch. For this warm-up, that’s the rule; in a real event we’d need reliability data.”'],
  },
  {
    focus: 'Same average is not the same as the same chance of winning.',
    evidence: ['Smooth, Spike and the opponent have only the score outcomes in the case file.', 'Spike’s jam is a per-match event, not an independent failure on each point.'],
    discussion: ['Ask what a big score buys if 12 would already be enough.', 'Ask whether the opponent’s score distribution changes the call.'],
  },
  {
    focus: 'Look for outcomes linked by a shared cause.',
    evidence: ['Each climber completes half its attempts in the simplified scenario.', 'The rung creates linked outcomes only after that fact has been disclosed.'],
    discussion: ['Ask whether both climbers can fail for the same reason.', 'Ask whether the alliance needs one success or both successes.'],
  },
  {
    focus: 'A real-looking outlier is still only one observation.',
    evidence: ['Practice shooting rates are based on hundreds of attempts.', 'The match scorecards shown as exhibits are the fixed record: no additional qualification matches can be generated.'],
    discussion: ['Ask whether a single result overrules a larger body of data.', 'If students ask for more match results, offer a review of existing shots or context, not imaginary extra matches.'],
  },
  {
    focus: 'Small numbers of variable robot performances can beat or lose to a steadier alliance.',
    evidence: ['Use the model probabilities printed in the case and treat independence as an explicit assumption.', 'Robots can share routes, game pieces and failures in real matches; no specific correlations are proven by the case.'],
    discussion: ['Ask how many successes are required for the alliance to win.', 'Ask whether one robot’s success affects another’s opportunity.'],
  },
  {
    focus: 'The objective can change even when the scoring probabilities do not.',
    evidence: ['Use the stated ranking-point rules for this fictional event.', 'The standings and tiebreaker changes arrive as new information at their scheduled step.'],
    discussion: ['Ask whether the goal is to win, get an RP, or pass another team.', 'Ask what result the team needs, not which plan scores more on average.'],
  },
  {
    focus: 'An opponent keeps acting while we make our own late-match plan.',
    evidence: ['The opponent’s additional scoring distribution is a scouting estimate introduced in the case.', 'Do not claim to know precisely which of those outcomes will occur in the next match.'],
    discussion: ['Ask what the opponent is likely to score in the same time window.', 'Ask what score deficit changes the value of the gamble.'],
  },
  {
    focus: 'The strength of a scouting claim depends on where and how it was measured.',
    evidence: ['Only the stated successes, misses and match conditions were observed.', 'The case does not contain any extra played matches; historical video or existing notes may clarify conditions.'],
    discussion: ['Ask how many attempts were recorded and against what defense.', 'Distinguish an observed percentage from a guarantee about the true rate.'],
  },
  {
    focus: 'An opponent can respond to our strategy.',
    evidence: ['The case gives specific payoffs for fixed responses; those are scenario assumptions.', 'Do not pretend you know which action the opposing team will choose.'],
    discussion: ['Ask what their most likely counter is.', 'Ask whether showing our intentions changes their response.'],
  },
  {
    focus: 'Find the assumption that could actually change the decision.',
    evidence: ['The relevant probabilities and possible parameter ranges are in the case.', 'More simulation runs do not make poorly justified model inputs accurate.'],
    discussion: ['Ask for a specific switch point, not just “more data.”', 'Ask which evidence could be checked from existing film or scouting notes.'],
  },
  {
    focus: 'Defense costs offense and depends on the target, the defender and the response.',
    evidence: ['Use only the robots’ stated abilities and the mechanics disclosed so far.', 'No unplayed matches can be scouted; existing clips and notes can be re-examined.'],
    discussion: ['Ask which offensive cycles we give up.', 'Ask whether the opponent can change lanes or roles.'],
  },
  {
    focus: 'One simulated outcome does not tell us which strategy has the higher win probability.',
    evidence: ['The first simulated match is a sample, not an answer.', 'The supplied scoring model may make a strategy look bad in a single game while improving its long-run odds.'],
    discussion: ['Ask what students predicted before they saw that match.', 'Ask whether their confidence changed because of evidence or because the loss felt vivid.'],
  },
  {
    focus: 'Pick a playoff plan with uncertain reliability and possibly changed conditions.',
    evidence: ['The recorded qualification and playoff attempts in the case are fixed.', 'A repair may change the future failure process, but there is no evidence of certainty until tested.'],
    discussion: ['Ask what failed, what was fixed and which attempts were comparable.', 'Ask what one realistic check before the next match would change the call.'],
  },
];
export function moderatorBrief(caseIndex) {
  return MODERATOR_BRIEFS[caseIndex] ?? {
    focus: 'Let the group make a call, then ask what could change it.',
    evidence: ['Answer only from facts already in the case; say when something is unknown.'],
    discussion: ['Which assumption is doing the most work?'],
  };
}
