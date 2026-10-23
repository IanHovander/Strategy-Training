// Who's on the scouting tablet at the opening's pick (docs/blue-banner-design.md, section 5, beat 1). Two teams and
// her own robot, and one thing to notice: the average hides which way a robot is going.
//
// The tablet is the team's scouting app. Each team has ten qualification matches: six on Friday, four on Saturday
// morning. 7461 was the best robot at the event on Friday (44 a match) and has been limping since: about two thirds of
// that on Saturday (29). 6834 was ordinary on Friday (29), put on a new intake Friday night and has scored 45 a match
// since, better than 7461 ever did. The averages still say 7461, 38 to 35; the last four boxes say 6834, 45 to 29.
// Both strips are on screen, the Saturday boxes set apart, so a careful player can see it, and seeds 1 to 3 passed on
// the bigger average for a reason.
//
// Notes are in the 3x5 letters, which have no comma: full stops instead.
//
// The team numbers are made up for the game, on purpose: no real team's robot is portrayed. Don't swap in famous teams.
//
//   OURS            her team's number (team-specific: TEAM-SPECIFIC.md)
//   YOU             her robot, pinned at the top of the tablet for reference
//   TEAMS           the cards she can pick, left to right
//   RIGHT           the number of the right pick
//   FRIDAY          how many of the ten matches were Friday's (the rest, Saturday morning's, are the last four)
//   avgOf(team)     the average the app shows, all ten matches (a blank, null, skipped as the app does)
//   fridayOf(team), saturdayOf(team)   the average of Friday's matches and of Saturday's: the trend, for the reveal

export const OURS = '5026';
export const FRIDAY = 6;

export const YOU = { num: OURS, scores: [28, 33, 18, 31, 35, 22, 34, 30, 36, 33] };

export const TEAMS = [
  // Friday: 264 in six, 44. Saturday: 116 in four, 29, two thirds of it. All ten: 38, the biggest average on the screen.
  { num: '7461', note: 'BIG. FAST. LOUD FANS.', scores: [45, 42, 47, 43, 41, 46, 31, 27, 30, 28] },
  // Friday: 174 in six, 29. Saturday: 180 in four, 45, more than 7461 ever scored. All ten: 35.
  { num: '6834', note: 'NEW INTAKE FRIDAY NIGHT.', scores: [27, 30, 28, 31, 29, 29, 43, 46, 44, 47] },
];

export const RIGHT = '6834';

/** The average of some matches: blank boxes (matches nobody scored) are skipped, not counted as zeros, as the app does. */
const mean = (scores) => {
  const played = scores.filter((v) => v != null);
  return Math.round(played.reduce((a, b) => a + b, 0) / played.length);
};
/** The app's average, all ten matches. */
export const avgOf = (team) => mean(team.scores);
/** Friday's average, and Saturday's: where it's been and where it's going. */
export const fridayOf = (team) => mean(team.scores.slice(0, FRIDAY));
export const saturdayOf = (team) => mean(team.scores.slice(FRIDAY));
