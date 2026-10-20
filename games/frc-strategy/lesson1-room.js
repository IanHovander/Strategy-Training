// Lesson 1, Learn: the Strategy Room. Five match-day calls the room argues out, from a warm-up to a picklist meeting.
// No points and no answer key: everyone makes a call and says how sure they are, the votes go up, the room asks the
// moderator anything, new intel lands, and everyone calls it again.
//
// What every phone and the big screen may see. The moderator's private brief (the hidden numbers, existing records
// and investigations) is in lesson1-room-brief.js, which only the rules read.
//
// The intro and a case:
//   ROOM_INTRO      the big screen's welcome during moderator signup (three sentences at most)
//   title, short    the case's name, and a shorter one for the phone and the case chooser
//   tag             what kind of call it is
//   prompt          the question on the first call ("What's the call?"); later calls ask "Still the same call?"
//   setup           the case file
//   setupAfter      optional: the case file from the second call on
//   notes           optional: a short note above the case file for each call (the warm-up's)
//   options         the plans to pick from: [{ id, label, detail }]
//   optionsAfter    optional: the plans for each later call (null keeps the ones before)
//   intel           the new intel dropped after each call; the case ends after the call that follows the last one
//   nudges          one per call, under the votes, to keep the conversation going (the last one repeats)
//   blind           at the wrap-up: something the room might still want to know (not a gotcha)
//   lastAsk         optional: one more short written question on the last call; the answers show, without
//                   names, at the wrap-up
//   noQuestions     the calls (0-based) with no questions yet: the warm-up's first call

export const ROOM_INTRO = {
  title: 'Welcome to the Strategy Room.',
  lines: [
    'These are quick FRC strategy calls with imperfect information.',
    'Make a plan, ask questions, and change your mind when new evidence shows up.',
    'One student will moderate the discussion while everyone else works through each case.',
  ],
};

export const ROOM = [
  {
    title: 'Robot A vs. B',
    short: 'Robot A vs. B',
    tag: 'Start here · warm-up',
    prompt: 'What’s the call?',
    setup: 'One-on-one: the other robots didn’t show up, so it’s just our Robot A against Robot B. For the warm-up, B scores 9. More cycles wins; ties do not.',
    setupAfter: 'Same two plans for A, but now we’re looking at scouting instead of fixed practice numbers. B’s observed scores are in the intel. More cycles wins; a tie is not a win.',
    notes: [
      { title: 'Warm-up · made-up odds, on purpose', text: 'For this call, treat the numbers as the rules. We’ll bring in messy scouting data next. Spot something that feels off? Flag it.' },
      { title: 'Now we’re using scouting', text: 'The new numbers are observations from a small sample, not guaranteed probabilities. This is where questions start to matter.' },
    ],
    options: [
      { id: 'safe', label: 'Safe', detail: '8 cycles every time, in this warm-up.' },
      { id: 'aggressive', label: 'Aggressive', detail: '11 cycles (70%) or 4 cycles (30%).' },
    ],
    optionsAfter: [
      [
        { id: 'safe', label: 'Safe', detail: '8 in all three practice runs; a very small sample.' },
        { id: 'aggressive', label: 'Aggressive', detail: '11 in seven of ten practice runs; otherwise 4.' },
      ],
      [
        { id: 'safe', label: 'Safe', detail: '8 in three of three undefended practice runs.' },
        { id: 'aggressive', label: 'Aggressive', detail: '11 in seven of ten undefended practice runs; otherwise 4.' },
      ],
      null,
    ],
    intel: [
      'Our first real scouting notes arrive: in FIVE observed matches, B scored 7 cycles three times and 9 cycles twice. Those are observations, not promised future odds.',
      'The rest of B’s qualification record is checked: five other ALREADY-PLAYED matches, all scoring 7. Across ten past matches, B scored 7 eight times and 9 twice. No new matches were played.',
      'One more reality check: Aggressive’s 70% came from seven good runs out of ten. Safe’s “always 8” came from just three runs, all scoring 8. Neither has been tested against match defense.',
    ],
    nudges: [
      'Which possible score actually beats 9? No tricks yet.',
      'Would you trust five matches as much as fifty?',
      'What would you verify before treating a practice rate as a guarantee?',
    ],
    blind: 'Does our opening practice drill tell us what happens against real defense?',
    noQuestions: [0],
  },
  {
    title: 'Two-Shot Auto',
    short: 'Two-Shot Auto',
    tag: 'Linked luck',
    prompt: 'Which auto are we running?',
    setup: 'Our opponent puts up 15 points in auto. We’ve got two routines. Each shot below is worth 10 points.',
    options: [
      { id: 'two', label: 'Two-Shot', detail: 'Two 10-point shots. Each went in 7 of our last 10 practice autos.' },
      { id: 'reliable', label: 'Reliable', detail: '12 points in each of its six test runs.' },
    ],
    optionsAfter: [
      null,
      null,
      [
        { id: 'two', label: 'Linked', detail: 'Both shots hit or miss together. 70%.' },
        { id: 'independent', label: 'Independent', detail: 'Each shot has a separate 65% make rate.' },
        { id: 'reliable', label: 'Reliable', detail: '12 points in six of six practice runs.' },
      ],
    ],
    intel: [
      'The full two-shot practice log reveals a pattern: in seven runs both shots went in; in three runs both missed. There were no runs where only one shot made it. Both shots use the same camera alignment.',
      'New opponent. They score exactly 5 points in auto. All our routines still work the same way.',
      'Programming has an update: we can separate the shots again, but each one drops to 65% accuracy. It’s now Linked vs. Independent vs. Reliable.',
    ],
    nudges: [
      'Would the best option change against a stronger auto?',
      'How many *different* things have to go right?',
      'Is this a match-winning question or a points question?',
    ],
    blind: 'Is the camera failure a per-shot issue or a per-match issue?',
  },
  {
    title: 'Defensive Assignment',
    short: 'Who Plays Defense?',
    tag: 'Roles & tradeoffs',
    prompt: 'What’s B doing?',
    setup: 'For the opening model, our A contributes 10 cycles and B contributes 5. Their C contributes 12 cycles (60%) or 8 (40%), and D contributes 4. If B defends C, B gives up offense and has a 60% estimated stop rate on C’s usual route.',
    options: [
      { id: 'offense', label: 'Keep B on offense', detail: 'B contributes its 5 cycles.' },
      { id: 'defense', label: 'Send B to defend C', detail: 'B gives up scoring to disrupt C.' },
    ],
    intel: [
      'B’s been acting up. In eight defensive practice runs, it failed to complete its assignment four times. In those runs, it provided no useful defense.',
      'Pit crew found a loose connector and fixed it. They think that caused the failures. No match-condition test yet.',
      'More film: C has another scoring route when blocked. We don’t have reliable data on B defending that route. Match starts in five minutes.',
    ],
    nudges: ['Who is paying the opportunity cost?', 'Which robot’s behavior is most uncertain?', 'What single fact is worth checking before the match?'],
    blind: 'We haven’t established how C behaves once it realizes B is defending.',
    lastAsk: 'What would you most want to find out before the match?',
  },
  {
    title: 'The Third Robot',
    short: 'Playoff Pick',
    tag: 'Best of three',
    prompt: 'Who are we picking?',
    setup: 'We need one more robot for playoffs. Our scouts say we win 70% of individual matches with Steady, or 75% with Fragile. For now, treat match results as independent. The first alliance to win two matches takes the series.',
    options: [
      { id: 'steady', label: 'Steady', detail: '70% match win estimate.' },
      { id: 'fragile', label: 'Fragile', detail: '75% match win estimate.' },
    ],
    intel: [
      'Fragile has an intermittent mechanism. There’s a 75% chance it works for the WHOLE series, and we win every match. Otherwise it stays broken and we lose every match.',
      'Their pit crew can reset it between matches. Now functionality is a fresh, independent 75% chance each match.',
      'The 75% estimate comes from four qualification matches (three worked). Steady’s estimate uses 30 matches from several events.',
    ],
    nudges: ['Are we selecting for one match or for the series?', 'Would a failure in game one change game two?', 'Where did the 75% estimate come from?'],
    blind: 'How likely is a “fixed” mechanism to stay fixed through multiple matches?',
    lastAsk: 'Anything you’d want to check before alliance selection?',
  },
  {
    title: 'The Picklist Meeting',
    short: 'Picklist Meeting',
    tag: 'Showdown prep',
    prompt: 'Who’s higher on the list?',
    setup: 'Only one pick left. Delta has averaged 8.0 cycles over 10 matches and looks steady. Echo averaged 6.4 over 10 matches and looks all over the place.',
    options: [
      { id: 'delta', label: 'Delta', detail: '8.0 cycles average. Very steady.' },
      { id: 'echo', label: 'Echo', detail: '6.4 cycles average. Very variable.' },
    ],
    intel: [
      'Echo faced heavy defense in six of ten matches. Delta was rarely defended. Echo averaged 9.5 cycles in its four undefended matches.',
      'Our likely playoff opponent has a great defender. Scouts say Delta is hard to slow down. Echo loses a lot of output when defended.',
      'Our alliance already has two strong scorers but weak defense. Delta defends decently. Echo doesn’t. Their alliance has two strong scorers.',
    ],
    nudges: ['How similar were their match conditions?', 'Are we selecting a robot, or a role in our alliance?', 'What’s the biggest reason this plan could flop?'],
    blind: 'How well will the three robots share lanes and game pieces?',
    lastAsk: 'What’s the biggest thing we’re still unsure about?',
  },
];

/** What the moderator's phone says (not secret: the brief itself is in lesson1-room-brief.js). */
export const MODERATOR = {
  /** What the moderator reads first. */
  start: [
    'Read the brief while everyone thinks about the call. Nobody else can see it.',
    'When the calls are in, show the room. Let them argue, and answer their questions from the brief.',
    'Drop the next intel when the talk winds down. You decide when; there’s no timer.',
  ],
  /** The rule the moderator answers by. */
  rule: 'All qualification matches have ALREADY HAPPENED. Never invent extra match results. Existing scorecards, logs and defense tags are free to share when asked. Spend an effort credit only for a deeper review, a realistic pit check, or a test that can actually be run before the decision. The hidden percentages describe the fictional world; don’t present them as measured scout probabilities.',
  /** "What if the room gets stuck?", for each stage of a call. */
  hints: {
    call: 'Let people decide on their own. Don’t flash the room’s votes before they commit.',
    discuss: 'Invite students to disagree and question the assumptions. Questions are free. So are existing scorecards and scouting notes; deeper video analysis or checks can cost effort.',
    intel: 'New intel changes what the room knows, not necessarily the right call.',
    wrap: 'Celebrate good questions, not just correct guesses. No answer key.',
  },
};

/** How the moderator answered, as a label on the answer. */
export const ANSWER_LABELS = { answer: 'Moderator', spoken: 'Answered out loud', unknown: 'Not known', record: 'Existing record', investigation: 'New investigation' };

/** The longest text a player can type for each thing. */
export const LIMITS = { why: 140, doubt: 200, wonder: 140, question: 200, questionWhy: 140, reply: 400 };

/** The lowest confidence you can give: an even split between the plans, rounded up to a step of 5. */
export const minConfidence = (count) => Math.ceil(100 / count / 5) * 5;

/** The plans on call `round` (0-based) of a case: the latest `optionsAfter` entry that isn't null, or `options`. */
export function optionsAt(c, round) {
  for (let r = round - 1; r >= 0; r--) if (c.optionsAfter?.[r]) return c.optionsAfter[r];
  return c.options;
}

/** Can the room ask questions on this call? Not on the warm-up's first one. */
export const questionsOpen = (c, round) => !c.noQuestions?.includes(round);

/** The last call of a case comes after its last intel. */
export const lastRound = (c) => c.intel.length;

/** The button that moves things along at each stage (the moderator's, and the leader's and big screen's backup). */
export function nextLabel(c, v) {
  if (v.phase === 'moderator-pick') return 'Pick a Moderator & Start ▸';
  if (v.phase === 'call') return 'Show the Room ▸';
  if (v.phase === 'discuss') return !questionsOpen(c, v.round) ? 'Show the Scout Sheet ▸' : v.round >= lastRound(c) ? 'Wrap the Case ▸' : 'Drop the Next Intel ▸';
  if (v.phase === 'intel') return 'Make the Call Again ▸';
  return v.at === v.of ? 'Finish Learn ▸' : 'Next Case ▸';
}

/** The extra written question on this call, if any: only the last call of a case that has one. */
export const extraAsk = (c, round) => (round === lastRound(c) ? c.lastAsk ?? null : null);
