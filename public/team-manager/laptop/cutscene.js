// The laptop's cut scene: the evening's training, short, so the app is soon hers. It opens on her at a table in the
// dark, lit by the laptop in front of her (the lid's back to you, 5026's sticker on it), cuts to the screen as the app
// starts, and the app says what the training is while its title screen waits: a practice event, sixteen teams to scout,
// a picklist, alliance selection, a best of three, and the truth at the end. Then the app opens.
//
// It's built like every scene's cut scene (stage.js): film bars, the place card, fades in four hard steps, and a beat
// with words that waits for them to be read. The words keep above the dialog box's top (row 88), so the title screen
// behind them is drawn in the top 86 rows.

import { C, fill, text, dither, disk, withAlpha, rnd, seg, clamp } from '../pixel.js';
import { bars, cover, placeCard } from '../stage.js';
import { drawWalker, HERO_LOOK } from '../walker.js';
import { D, UI, bezel, box, side } from './kit.js';

export const CARD = ['THE LAPTOP', 'STRATEGY TRAINING'];
/** Who's speaking in the dialog box: the app itself. */
const APP = '5026 SCOUT';

// ---- The table in the dark ----
const WOOD = ['#3a2418', '#5a3a26', '#7a5236']; // the van's bark ramp, for the table
/** Where she sits: her feet under the table, her head over the lid. */
const HER = { x: 128, y: 90 };
const LID = { x: 98, y: 68, w: 60, h: 30 };

function room(t) {
  // The wall, dark: the team's whiteboard with the week on it, a pennant over her, and a window onto the night with the
  // parking lot's lights far off (the place card covers the wall's top left as the scene opens).
  fill(0, 0, 256, 144, C.stand0);
  dither(0, 40, 256, 4, C.stand0, C.stand1);
  fill(0, 44, 256, 52, C.stand1);
  fill(184, 14, 52, 46, C.ink);
  fill(186, 16, 48, 42, C.night0);
  for (let i = 0; i < 9; i++) {
    const x = 187 + Math.floor(rnd(i) * 46), y = 17 + Math.floor(rnd(i + 20) * 26);
    if (Math.floor(t * 1.3 + rnd(i + 40) * 8) % 7) fill(x, y, 1, 1, i % 3 ? C.starDim : C.star);
  }
  fill(186, 46, 48, 12, C.night1);
  for (let x = 190; x < 234; x += 13) fill(x, 44, 2, 2, C.yel2);
  fill(209, 16, 2, 42, C.ink);
  fill(186, 36, 48, 2, C.ink);
  fill(182, 58, 56, 3, C.steel1);
  fill(18, 46, 64, 38, C.ink);
  fill(19, 47, 62, 36, C.steel2);
  for (let k = 0; k < 5; k++) fill(23, 51 + k * 6, 20 + Math.floor(rnd(k + 7) * 30), 1, k === 2 ? C.red1 : C.blue1);
  text('SAT', 63, 51, { font: 3, color: C.red1 });
  fill(28, 83, 44, 2, C.steel1);
  fill(112, 12, 30, 12, C.red1);
  for (let k = 0; k < 12; k++) fill(142 + k, 13 + Math.floor(k / 2), 1, 10 - k, C.red1);
  text('5026', 114, 15, { font: 3, color: '#fff4ee' });
  fill(110, 10, 2, 16, C.steel2);
}
/** Her glow: the screen's light on her face and on the wall behind her. */
function glow(t) {
  const flicker = 0.02 * Math.sin(t * 7);
  withAlpha(0.1 + flicker, () => disk(HER.x, HER.y - 40, 34, C.blue3));
  withAlpha(0.08, () => disk(HER.x, HER.y - 40, 22, C.white));
}
function table() {
  fill(0, 96, 256, 48, WOOD[1]);
  fill(0, 96, 256, 2, WOOD[2]);
  fill(0, 98, 256, 1, WOOD[0]);
  for (let k = 0; k < 6; k++) fill(Math.floor(rnd(k + 3) * 220), 104 + k * 6, 30 + Math.floor(rnd(k) * 20), 1, WOOD[0]);
  // A mug, 5026 red.
  fill(184, 84, 12, 13, C.ink);
  fill(185, 85, 10, 11, C.red1);
  fill(185, 85, 10, 1, C.red2);
  fill(195, 88, 3, 5, C.ink);
  fill(196, 89, 1, 3, C.red1);
}
/** The laptop's lid from behind: silver, 5026's sticker and a couple of others, the screen's light round its edges. */
function lidBack() {
  const { x, y, w, h } = LID;
  withAlpha(0.35, () => fill(x - 2, y - 2, w + 4, h + 2, C.blue3));
  fill(x, y, w, h, C.ink);
  fill(x + 1, y + 1, w - 2, h - 1, C.steel2);
  fill(x + 1, y + 1, w - 2, 1, C.steel3);
  box(x + 20, y + 9, 20, 9, C.red1, C.red2);
  text('5026', x + 30, y + 11, { font: 3, color: '#fff4ee', align: 'center' });
  disk(x + 10, y + 8, 3, C.blue1);
  fill(x + 46, y + 18, 7, 6, C.yel1);
  fill(x - 4, y + h, w + 8, 3, C.steel1);
  fill(x - 4, y + h, w + 8, 1, C.steel3);
}

// ---- The screen as the app starts ----
function boot(t) {
  bezel(t, { on: t > 0.4 });
  fill(D.x, D.y, D.w, D.h, '#05060d');
  if (t < 0.4) return;
  const k = seg(t, 0.4, 0.9);
  withAlpha(k, () => {
    fill(D.x, D.y, D.w, D.h, UI.body);
    text('5026', 130, 34, { scale: 3, color: C.org0, align: 'center' });
    text('5026', 128, 32, { scale: 3, rowColors: [C.yel2, C.yel2, C.yel1, C.yel1, C.yel1, C.yel1, C.yel0], align: 'center' });
    text('SCOUT', 129, 60, { color: C.white, align: 'center', spacing: 3 });
  });
  if (t > 1.3) {
    const p = clamp((t - 1.3) / 1.3, 0, 1), w = 100;
    fill(128 - w / 2 - 1, 82, w + 2, 6, C.ink);
    fill(128 - w / 2, 83, Math.round(w * p), 4, C.blue2);
    text(p < 1 ? 'LOADING THE PRACTICE EVENT...' : 'SIXTEEN TEAMS SCOUTED', 128, 92, { font: 3, color: C.steel2, align: 'center' });
  }
}
/** The title screen behind the briefing (under the film bars): the training's name and two alliances of three. */
function title(t) {
  bezel(t);
  fill(D.x, D.y, D.w, D.h, UI.body);
  text('STRATEGY TRAINING', 128, 20, { font: 3, color: C.steel2, align: 'center' });
  text('THE SHOWDOWN', 128, 28, { scale: 2, color: C.white, outline: C.ink, align: 'center' });
  [0, 1].forEach((i) => {
    const x = i ? 136 : 28, c = side(i);
    text(`ALLIANCE ${i + 1}`, x + 46, 50, { font: 3, color: c.hi, align: 'center' });
    for (let k = 0; k < 3; k++) {
      const lit = Math.floor(t * 2 + k + i * 3) % 6 === 0;
      box(x + k * 31, 58, 29, 18, lit ? c.mid : c.lo, lit ? c.hi : null);
      text(k ? `PICK ${k}` : 'CAPTAIN', x + k * 31 + 15, 65, { font: 3, color: C.white, align: 'center' });
    }
  });
}

/** The words: what the training is, a page at a time. */
const BRIEF = [
  ['A PRACTICE EVENT: SIXTEEN TEAMS, TEN', 'QUALIFICATION MATCHES EACH, SCOUTED.'],
  ['STUDY THE DATA AND BUILD A PICKLIST:', 'THE TEAMS YOU WANT, BEST FIRST.'],
  ['THEN ALLIANCE SELECTION. THE TOP TWO', 'SEEDS CAPTAIN. PICKS GO 1, 2, 2, 1.'],
  ['ON THE CLOCK, INVITE A TEAM. RUN OUT', 'OF TIME AND YOU GET YOUR LIST\'S TOP.'],
  ['THEN A BEST OF THREE. BEFORE EACH', 'MATCH, SET EVERY ROBOT TO OFFENSE OR'],
  ['DEFENSE. THE SCOUTS ARE CLOSE, NOT', 'EXACT: THE TRUTH COMES OUT AT THE END.'],
  ['A PRACTICE BOT RUNS THE OTHER', 'ALLIANCE. GOOD LUCK, STRATEGIST.'],
];

export const cutscene = [
  {
    // At the table: the place card, her face in the screen's light.
    dur: 4.2,
    draw(g, t) {
      room(t);
      glow(t);
      drawWalker(g, HER.x, HER.y, 0, 'sit', 0, HERO_LOOK);
      table();
      lidBack();
      bars(1);
      placeCard(t - 0.4, ...CARD);
      cover(1 - t / 0.6);
    },
  },
  {
    // The screen, as the app starts.
    dur: 3,
    draw(g, t) {
      boot(t);
      bars(1);
    },
  },
  {
    // The title screen, and the briefing over it.
    dur: 1.2,
    say: { name: APP, lines: BRIEF, at: 0.4 },
    draw(g, t) {
      title(t);
      bars(1);
    },
  },
  {
    // The bars go and the app opens.
    dur: 0.5,
    draw(g, t, c) {
      title(t + 1.2);
      bars(1 - c.k);
      cover(seg(t, 0.25, 0.5));
    },
  },
];
