// Her phone, full screen: the second shot of the opening. Out of the black, her phone in her hand, close enough to fill
// the picture top to bottom, open on her texts with the senior strategist. Her last message is still waiting for an
// answer ("WHERE ARE YOU??"); then the typing dots, and the answer lands a bubble at a time, the phone buzzing in her
// hand as each arrives: "SICK. CAN'T COME." and "YOU'VE GOT THIS." The clock in the corner says 12:37, a minute before
// the card that follows.
//
// Drawn like everything else, in filled rectangles on whole pixels (pixel.js) and the shared palette: an ink phone with
// a steel edge lit from the upper left, a dark screen (the way a phone looks in a dark arena), her bubble in blue, theirs
// in steel, the words in the 5x7 letters. Her fingers wrap its left edge and her thumb rests on the right, in her skin
// tones (walker.js HERO_LOOK). Like every frame in the cut scene it's a pure function of time.
//
//   drawPhone(t)    the whole screen, t seconds into the shot (screen space; the film bars go on top)
//   PHONE_TIMES     when the dots start and each message lands, for the cut scene's timing

import { W, H, C, screen, fill, text, measure } from '../pixel.js';
import { HERO_LOOK } from '../walker.js';

/** Who's texting: the senior strategist, out sick (a placeholder name). */
export const SENDER = 'JULES';
/** When things happen, seconds into the shot: the dots, the first message, the dots again, the second. */
export const PHONE_TIMES = { dots: 0.2, first: 0.8, dots2: 0.95, second: 1.3 };

/** The phone: its outline's left, top and width; it runs on past the bottom of the picture. */
const PH = { x: 66, y: 3, w: 124 };
/** The screen inside the bezel. */
const SC = { x: PH.x + 5, y: PH.y + 8, w: PH.w - 10 };
const BG = '#070a18', THEIRS = C.steel1, MINE = C.blue1;
const [SKIN_D, SKIN, SKIN_L] = HERO_LOOK.pal.skin;

/** A bubble with rounded (notched) corners, its text in the 5x7 letters, on the screen whose left edge is at sx; mine:
 * hers, on the right. */
function bubble(sx, str, y, mine) {
  const w = measure(str) + 8, h = 11;
  const x = mine ? sx + SC.w - 4 - w : sx + 4;
  const c = mine ? MINE : THEIRS;
  fill(x + 1, y, w - 2, h, c);
  fill(x, y + 1, w, h - 2, c);
  // A tail at the bottom corner nearest its sender.
  fill(mine ? x + w - 1 : x, y + h - 2, 1, 2, c);
  text(str, x + 4, y + 2, { color: C.white });
}
/** The typing dots: three, lit one after another. */
function dots(sx, y, t) {
  const x = sx + 4;
  fill(x + 1, y, 22, 11, THEIRS);
  fill(x, y + 1, 24, 9, THEIRS);
  const lit = Math.floor(t * 7) % 3;
  for (let i = 0; i < 3; i++) fill(x + 5 + i * 6, y + 4, 3, 3, i === lit ? C.white : C.steel2);
}
/** The phone's own battery, nearly full (hers is fine: it's the other battery in this story that matters). */
function battery(x, y) {
  fill(x, y, 10, 5, C.steel2);
  fill(x + 1, y + 1, 8, 3, BG);
  fill(x + 2, y + 2, 6, 1, C.white);
  fill(x + 10, y + 1, 1, 3, C.steel2);
}
/**
 * Her hand: the palm behind the phone's left edge with four fingertips curled round onto its bezel, and her thumb up
 * its right side. Outlined in ink and lit from the upper left, each fingertip with its nail.
 */
function hand(dx) {
  const px = PH.x + dx;
  // The palm and the base of the fingers, coming in from below left.
  fill(px - 16, 96, 18, H, C.ink);
  fill(px - 15, 97, 16, H, SKIN);
  fill(px - 15, 97, 3, H, SKIN_L);
  fill(px - 2, 97, 2, H, SKIN_D);
  for (const fy of [97, 106, 115, 124]) {
    fill(px - 1, fy, 9, 9, C.ink);
    fill(px, fy + 1, 7, 7, SKIN);
    fill(px, fy + 1, 7, 1, SKIN_L);
    fill(px, fy + 7, 7, 1, SKIN_D);
    fill(px + 3, fy + 2, 3, 3, SKIN_L);
  }
  // The thumb up the right-hand side, its tip rounded, its nail toward you.
  const tx = PH.x + PH.w - 8 + dx, ty = 110;
  fill(tx, ty + 1, 14, H, C.ink);
  fill(tx + 1, ty, 12, 1, C.ink);
  fill(tx + 1, ty + 1, 12, H, SKIN);
  fill(tx + 1, ty + 1, 3, H, SKIN_L);
  fill(tx + 10, ty + 3, 3, H, SKIN_D);
  fill(tx + 3, ty + 2, 7, 6, SKIN_L);
  fill(tx + 3, ty + 8, 7, 1, SKIN_D);
  fill(tx + 4, ty + 3, 2, 1, C.white);
}

export function drawPhone(t) {
  screen();
  fill(0, 0, W, H, C.ink);
  // A buzz as each message lands: a pixel either way for a quarter of a second.
  const buzz = [PHONE_TIMES.first, PHONE_TIMES.second].some((at) => t >= at && t < at + 0.25);
  const dx = buzz ? (Math.floor(t * 40) % 2 ? 1 : -1) : 0;
  // A faint glow of the stands round the edges, out of focus behind the phone.
  for (let i = 0; i < 14; i++) {
    const x = (i * 53) % W, y = 18 + ((i * 37) % 100);
    if (x > PH.x - 12 && x < PH.x + PH.w + 4) continue;
    fill(x, y, 2, 2, i % 3 ? C.stand2 : C.night2);
  }

  // The body: ink outline, a steel edge lit on the left, the bezel, the screen.
  const x0 = PH.x + dx, y0 = PH.y;
  fill(x0, y0 + 2, PH.w, H, C.ink);
  fill(x0 + 2, y0, PH.w - 4, 4, C.ink);
  fill(x0 + 1, y0 + 2, PH.w - 2, H, C.steel1);
  fill(x0 + 1, y0 + 3, 1, H, C.steel2);
  fill(x0 + 3, y0 + 1, PH.w - 6, 1, C.steel2);
  fill(x0 + 3, y0 + 3, PH.w - 6, H, C.ink);
  const sx = SC.x + dx;
  fill(sx, SC.y, SC.w, H, BG);

  // The status bar and the conversation's header.
  text('12:37', sx + 4, SC.y + 3, { font: 3, color: C.white });
  battery(sx + SC.w - 15, SC.y + 3);
  for (let i = 0; i < 3; i++) fill(sx + SC.w - 28 + i * 3, SC.y + 6 - i * 2, 2, 2 + i * 2, C.white);
  const hy = SC.y + 12;
  // Back: a little chevron.
  for (let i = 0; i < 4; i++) fill(sx + 5 + Math.abs(i - 1.5) * 2 - 1, hy + 3 + i, 2, 1, C.blue2);
  fill(sx + 16, hy + 1, 9, 9, C.org1);
  fill(sx + 17, hy, 7, 11, C.org1);
  text('J', sx + 18, hy + 2, { color: C.white });
  text(SENDER, sx + 29, hy + 2, { color: C.white });
  fill(sx, hy + 14, SC.w, 1, C.night2);

  // The messages, moved along as the screen is: hers, then the dots or theirs as they come in.
  const T = PHONE_TIMES;
  bubble(sx, 'WHERE ARE YOU??', hy + 20, true);
  const y1 = hy + 41, y2 = hy + 55;
  if (t >= T.dots && t < T.first) dots(sx, y1, t);
  if (t >= T.first) bubble(sx, "SICK. CAN'T COME.", y1, false);
  if (t >= T.dots2 && t < T.second) dots(sx, y2, t);
  if (t >= T.second) bubble(sx, "YOU'VE GOT THIS.", y2, false);
  // Under her bubble, once theirs start: read.
  if (t >= T.dots) text('READ 12:37', sx + SC.w - 4, hy + 33, { font: 3, color: C.steel2, align: 'right' });

  // The box to type in, along the bottom.
  const by = 114;
  fill(sx + 4, by, SC.w - 8, 11, C.night1);
  fill(sx + 5, by + 1, SC.w - 10, 9, BG);
  text('MESSAGE', sx + 9, by + 3, { font: 3, color: C.steel1 });
  hand(dx);
}
