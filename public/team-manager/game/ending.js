// How the event ends. Two things:
//
//   Verdict      her alliance is out, and Norbert's ear is glowing. If there's enough in his battery (state.js: every
//                field note charged it a little), she can wind back to alliance selection and play the boss fight
//                again with the same notebook and new dice, or let the result stand. It's her choice, and nothing says
//                which is right. With nothing in the battery there's no choice to make.
//   trainerCard  the event on one card, the way a trainer card sums up a journey: her qualification record and seed,
//                her alliance and how far it went (and how far it went the first time, with one page and 45 seconds),
//                the robots she watched, the field notes she found. If she won it, the banner's on it.

import { W, H, C, screen, fill, text, rnd } from '../pixel.js';
import { HERO_NAME } from '../cast.js';
import { drawHero, heroIdle } from '../hero.js';
import { Screen } from './run.js';
import { Card, night } from './cards.js';
import { box, button } from './ui.js';
import { corner } from './hud.js';
import { OURS, TEAMS } from './event.js';
import { tableOf, seenOf, notesFound, NOTES, voltsText } from './state.js';

export const REACHED = { qf: 'OUT IN THE QUARTERFINAL', sf: 'OUT IN THE SEMIFINAL', f: 'FINALIST', won: 'REGIONAL WINNER' };

export class Verdict extends Screen {
  constructor(o) {
    super('AFTER THE PLAYOFFS');
    this.o = o;
    this.label = 'Her alliance is out of the playoffs. Norbert can wind time back to alliance selection, or the result can stand.';
    this.m.on = 'stand';
  }
  status() {
    return 'NORBERT IS GLOWING';
  }
  paint(g, t, s, now) {
    const { st, res } = this.o;
    night();
    text(REACHED[res.reached], W / 2, 14, { scale: 2, align: 'center', color: C.white, outline: C.ink });
    text(`ALLIANCE ${res.out.seed} WENT THROUGH: ${res.out.teams.join(' ')}`, W / 2, 34, { font: 3, align: 'center', color: C.blue3 });
    if (t > 0.6) {
      text("NORBERT'S EAR IS GLOWING.", W / 2, 52, { align: 'center', color: C.yel2 });
      text(`${voltsText(st)}: ENOUGH TO WIND BACK TO ALLIANCE SELECTION.`, W / 2, 66, { font: 3, align: 'center', color: C.steel3 });
      text("THE NOTEBOOK COMES WITH YOU. THE DICE DON'T. IT COSTS HIM 0.3V.", W / 2, 74, { font: 3, align: 'center', color: C.steel3 });
      const wind = { x: 30, y: 92, w: 94, h: 17 }, stand = { x: 132, y: 92, w: 94, h: 17 };
      button(wind, 'WIND IT BACK', this.m.item('wind', wind, () => t > 1 && this.done('wind')), { t });
      button(stand, 'LET IT STAND', this.m.item('stand', stand, () => t > 1 && this.done('stand')), { t });
      text('EITHER WAY, THE SEASON GOES ON.', W / 2, 120, { font: 3, align: 'center', color: C.steel2 });
    }
    corner(st, { glow: 0.5 + 0.5 * Math.sin(now * 5) });
  }
}

/** The event, on a card. res: the boss fight's result ({ reached, alliances, seed, mine }). */
export function trainerCard(st, res) {
  const t0 = tableOf(st).find((x) => x.num === OURS), ours = res.alliances.find((a) => a.teams.includes(OURS));
  const watched = TEAMS.filter((n) => n !== OURS && seenOf(st, n).length).length, won = res.reached === 'won';
  const rows = [
    ['QUALIFICATION', `${t0.w} WON, ${t0.l} LOST. ${t0.rp} RANKING POINTS.`],
    ['SEEDED', `${t0.rank} OF ${TEAMS.length}`],
    [`ALLIANCE ${ours.seed}`, ours.teams.join('  ')],
    ['THE PLAYOFFS', REACHED[res.reached]],
    ['ON ONE PAGE', st.cold ? REACHED[st.cold.reached] : '-'],
    ['ROBOTS WATCHED', `${watched} OF ${TEAMS.length - 1}`],
    ['FIELD NOTES', `${notesFound(st)} OF ${NOTES.length}`],
    ['NORBERT', `${voltsText(st)}${st.winds ? `, WOUND BACK ${st.winds} TIME${st.winds > 1 ? 'S' : ''}` : ''}`],
  ];
  return new Card({
    name: 'THE REGIONAL', status: won ? 'BLUE BANNER' : 'THE REGIONAL', hold: 1.5, prompt: 'A: BACK TO THE TITLE', promptY: 132,
    label: "The event on one card: her record, her alliance, how far it went, the robots she watched and the field notes she found",
    paint(g, t, now) {
      night();
      fill(0, 0, W, 21, C.blue1);
      fill(0, 0, W, 1, C.blue2);
      fill(0, 21, W, 1, C.ink);
      text(won ? 'A BLUE BANNER' : 'THE REGIONAL', 8, 7, { color: C.white });
      text(REACHED[res.reached], W - 46, 7, { align: 'right', color: C.yel2 });
      // Her, and her name tag.
      box(8, 28, 50, 96, { fillC: C.night2 });
      drawHero(33, 113, heroIdle(now));
      fill(8, 113, 50, 11, C.red1);
      text(HERO_NAME, 33, 116, { font: 3, align: 'center', color: C.white });
      rows.forEach(([k, v], i) => {
        if (t < 0.4 + i * 0.12) return;
        const y = 29 + i * 11;
        text(k, 66, y, { font: 3, color: C.steel2 });
        text(v, 66 + 62, y, { font: 3, color: i === 3 ? C.yel2 : C.white });
        fill(66, y + 7, 182, 1, C.night2);
      });
      if (t > 1.6) text(won ? 'THE FIRST BANNER ON THE SHOP WALL.' : 'TO BE CONTINUED: THE SECOND REGIONAL.', 157, 119, { font: 3, align: 'center', color: C.blue3 });
      if (won) {
        const colors = [C.yel1, C.blue2, C.white, C.red2, C.yel2];
        for (let i = 0; i < 70; i++) fill(Math.round(rnd(i) * W), Math.round(((rnd(i + 9) * H + t * (25 + rnd(i + 3) * 40)) % H)), 2, 2, colors[i % 5]);
      }
      void screen;
    },
  });
}
