// Who's on the scouting tablet at the opening's pick (docs/blue-banner-design.md, section 5, beat 1). Two teams and
// her own robot, and one thing to notice: the average skips the matches a robot didn't play.
//
// The tablet is the team's scouting app. Each team has ten qualification matches: seven on Friday, three on Saturday
// morning. 7461 went dead for all three Saturday matches; the scouts left those boxes blank, and the app's average
// skips blanks, so it still shows Friday's 41. 6834 played all ten and never broke: 31. The empty boxes are on screen,
// so a careful player can see it, and seeds 1 to 3 passed on a "41" for a reason.
//
// Notes are in the 3x5 letters, which have no comma: full stops instead.
//
// The team numbers are made up for the game, on purpose: no real team's robot is portrayed. Don't swap in famous teams.
//
//   OURS            her team's number (team-specific: TEAM-SPECIFIC.md)
//   YOU             her robot, pinned at the top of the tablet for reference
//   TEAMS           the cards she can pick, left to right
//   RIGHT           the number of the right pick
//   FRIDAY          how many of the ten matches were Friday's (the rest are Saturday morning's)
//   avgOf(team)     the average the app shows: blanks (null) skipped, as the app does

export const OURS = '5026';
export const FRIDAY = 7;

export const YOU = { num: OURS, scores: [28, 33, 18, 31, 35, 22, 34, 30, 36, 33] };

export const TEAMS = [
  // Friday: 287 in seven matches, 41. Saturday: dead three times, left blank. Counting them, it's 29.
  { num: '7461', note: 'BIG. FAST. LOUD FANS.', scores: [44, 38, 47, 41, 36, 45, 36, null, null, null] },
  { num: '6834', note: 'NEVER BROKEN DOWN.', scores: [30, 31, 32, 30, 33, 31, 29, 32, 31, 31] },
];

export const RIGHT = '6834';

/** The app's average: blank boxes (matches nobody scored) are skipped, not counted as zeros. */
export function avgOf(team) {
  const played = team.scores.filter((v) => v != null);
  return Math.round(played.reduce((a, b) => a + b, 0) / played.length);
}
