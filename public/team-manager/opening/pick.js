// The pick: where the opening hands the player the decision. Seed 4 is on the clock, and the 45-second pick clock sits
// big and red at the top, draining a bar under it as it counts down, the last ten seconds flashing.
//
// The rest of the screen is a placeholder for the scouting dashboard (the design, section 5, "Building the opening",
// part 4), which is separate work: a card for her own robot pinned at the top and four empty cards for the teams she
// can pick, outlined in dashes, with a line saying so. It's built where the dashboard will go, a full-screen overlay on
// the big screen, so the dashboard can drop into the same frame: the header with THE PICK and the clock, Norbert in his
// corner, and the cards below.
//
//   drawPick(t, left)    the whole screen: t seconds since it came up (for the clock's slam and blinks), left the
//                        seconds left on the clock
//   PICK_CLOCK           45

import { W, H, C, screen, fill, text, measure } from '../pixel.js';
import { drawHud } from './norbert-held.js';

export const PICK_CLOCK = 45;
/** The clock's face: 0:45. */
const clockText = (s) => {
  const n = Math.max(0, Math.ceil(s - 1e-6));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
};

/** A dashed outline, the way a placeholder is drawn: dashes of 3, gaps of 2. */
function dashed(x, y, w, h, c) {
  for (let i = 0; i < w; i += 5) {
    fill(x + i, y, Math.min(3, w - i), 1, c);
    fill(x + i, y + h - 1, Math.min(3, w - i), 1, c);
  }
  for (let j = 0; j < h; j += 5) {
    fill(x, y + j, 1, Math.min(3, h - j), c);
    fill(x + w - 1, y + j, 1, Math.min(3, h - j), c);
  }
}

export function drawPick(t, left) {
  screen();
  fill(0, 0, W, H, C.night0);
  // A faint grid, like a tablet's app in a dark arena.
  for (let x = 4; x < W; x += 12) fill(x, 30, 1, H - 30, '#0d1133');

  // The header: the clock in the middle, whose pick it is under it, Norbert's corner on the left. The top right stays
  // clear: in the play-through, SKIP and NEXT SCENE sit there over the picture.
  fill(0, 0, W, 28, C.night1);
  fill(0, 28, W, 1, C.night3);
  const face = clockText(left);
  const hot = left <= 10 && left > 0 && (left % 1) > 0.7;
  const slam = t < 0.12;
  if (slam) fill(W / 2 - 30, 1, 60, 20, C.white);
  text(face, W / 2, 4, { scale: 2, align: 'center', color: slam ? C.red1 : hot ? C.white : C.red2, outline: C.ink });
  text('THE PICK - ALLIANCE 4 - ROUND 1', W / 2, 21, { font: 3, align: 'center', color: C.blue3 });
  // The clock's bar draining along under the header.
  const bar = Math.round((W - 8) * Math.max(0, left) / PICK_CLOCK);
  fill(4, 31, W - 8, 3, C.night1);
  fill(4, 31, bar, 3, left <= 10 ? C.red2 : C.red1);

  // The placeholder: her robot pinned on top, then one card per team she can pick.
  dashed(8, 38, W - 16, 16, C.steel1);
  text('YOUR ROBOT', 14, 43, { font: 3, color: C.steel2 });
  for (let i = 0; i < 4; i++) {
    const x = 8 + i * 61;
    dashed(x, 60, 57, 46, C.steel1);
    text('?', x + 28, 76, { scale: 2, align: 'center', color: C.night3 });
  }
  const note = 'THE SCOUTING DASHBOARD GOES HERE';
  text(note, (W - measure(note, { font: 3 })) / 2, 114, { font: 3, color: C.steel2 });

  if (left <= 0 && t % 0.8 < 0.55) {
    fill(78, 60, 100, 26, C.ink);
    fill(80, 62, 96, 22, C.red1);
    text('TIME!', 128, 66, { scale: 2, align: 'center', color: C.white });
  }
  drawHud();
}
