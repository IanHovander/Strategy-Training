// The teams in this row of pits: number, name, shirt colours (dark, mid, lit, like cast.js's tones) and the print on
// their shirts. 5026 is ours. It's 2019, so every number is one a team had by then (1024's BIT SHIFT is a power of
// two). Where each pit is and what its robot is doing are in set.js.
import { C } from '../pixel.js';
import { tones } from '../cast.js';

/** One new ramp, for 4000: it sits beside the palette's green. */
export const TEAL = ['#0d4f4f', '#178080', '#45bdb5'];
export const TEAMS = {
  3000: { name: 'OVERCLOCK', tone: tones.shirtWhite, print: C.blue1 },
  1024: { name: 'BIT SHIFT', tone: tones.hoodie, print: '#4a90ff' },
  7777: { name: 'LUCKY SEVENS', tone: tones.black, print: C.yel1 },
  4000: { name: 'GEARHEADS', tone: TEAL, print: C.white },
  2468: { name: 'EVEN STEVENS', tone: tones.shirtBlue, print: C.white },
  6060: { name: 'ROBO RAVENS', tone: tones.shirtPurple, print: C.white },
  5026: { name: 'IRON PANTHERS', tone: tones.shirtRed, print: '#fff4ee' },
  1357: { name: 'ODD SQUAD', tone: tones.shirtOrange, print: C.ink },
};
/** The row, left to right. */
export const ROW = ['3000', '1024', '7777', '4000', '2468', '6060', '5026', '1357'];
