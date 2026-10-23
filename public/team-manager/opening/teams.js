// Who's on the scouting tablet at the opening's pick (docs/blue-banner-design.md, section 5, beat 1). Two teams and
// her own robot, and one thing to notice: the average hides which way a robot is going.
//
// The tablet is the team's scouting app. Each team has ten qualification matches: seven on Friday, three on Saturday
// morning. 7461 was the best robot at the event for its first six (44 a match) and has been limping for its last four,
// Friday's last and Saturday's three: about two thirds of that (29). 6834 was ordinary for its first six (27), rebuilt
// its intake on Friday and has scored 48 a match in its last four: about a tenth better than 7461 at its best. The
// averages still say 7461, 38 to 35; the last four boxes say 6834, 48 to 29. Both strips are on screen, so a careful
// player can see it, and seeds 1 to 3 passed on the bigger average for a reason.
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
//   RECENT          how many of the last matches show the trend: four, Friday's last and Saturday's three
//   avgOf(team)     the average the app shows, all ten matches (a blank, null, skipped as the app does)
//   earlyOf(team), recentOf(team)   the average before the last RECENT matches, and of them: the trend, for the reveal

export const OURS = '5026';
export const FRIDAY = 7;
export const RECENT = 4;

export const YOU = { num: OURS, scores: [28, 33, 18, 31, 35, 22, 34, 30, 36, 33] };

export const TEAMS = [
  // The first six: 264, 44. The last four: 116, 29, two thirds of it. All ten: 38, the biggest average on the screen.
  { num: '7461', note: 'BIG. FAST. LOUD FANS.', scores: [45, 42, 47, 43, 41, 46, 31, 27, 30, 28] },
  // The first six: 162, 27. The last four: 192, 48, about 10% over 7461's best stretch, 44. All ten: 35.
  { num: '6834', note: 'REBUILT INTAKE FRIDAY.', scores: [26, 28, 27, 29, 26, 26, 47, 49, 48, 48] },
];

export const RIGHT = '6834';

/** The average of some matches: blank boxes (matches nobody scored) are skipped, not counted as zeros, as the app does. */
const mean = (scores) => {
  const played = scores.filter((v) => v != null);
  return Math.round(played.reduce((a, b) => a + b, 0) / played.length);
};
/** The app's average, all ten matches. */
export const avgOf = (team) => mean(team.scores);
/** The average before the last few matches, and of them: where it's been and where it's going. */
export const earlyOf = (team) => mean(team.scores.slice(0, -RECENT));
export const recentOf = (team) => mean(team.scores.slice(-RECENT));
