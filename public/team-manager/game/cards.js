// Cards: a screen that's one picture and waits for A. The day turning over, the playoff bracket, a series about to
// start, the end of the event. Each is a paint(g, t, now) and nothing else; a tap anywhere is A.
//
//   new Card({ name, status, paint, hold, label })   done() on A, not before `hold` seconds (0.6 if not given)
//   dayCard(title, sub, lines)                       a place card on black: FRIDAY, 8:30 AM
//   bracketCard(st, bracket)                         the playoffs so far
//   seriesCard(st, o)                                two alliances about to play a best of three

import { W, H, C, screen, fill, text, dither, easeOut, seg, lerp } from '../pixel.js';
import { Screen } from './run.js';
import { box, blink, pips } from './ui.js';
import { corner, drawToasts } from './hud.js';
import { OURS, KIND } from './event.js';
import { summary } from './state.js';
import { knownLine } from './words.js';

export class Card extends Screen {
  constructor(o) {
    super(o.name ?? 'BLUE BANNER');
    this.o = o;
    this.label = o.label ?? o.name;
    this.tapA = true;
  }
  status() {
    return this.o.status ?? this.o.name;
  }
  actLabel() {
    return 'CONTINUE';
  }
  onA() {
    if (performance.now() / 1000 - (this.t0 ?? Infinity) > (this.o.hold ?? 0.6)) this.done(this.o.result);
    return true;
  }
  paint(g, t, s, now) {
    this.o.paint(g, t, now);
    // A card with a title of its own leaves any new field note for whatever comes next (toasts: false).
    if (this.o.st) corner(this.o.st, { glow: this.o.toasts === false ? 0 : drawToasts(now) });
    if (this.o.prompt !== false) blink(this.o.prompt ?? 'A: CONTINUE', this.o.promptY ?? 130, t, { from: (this.o.hold ?? 0.6) + 0.4 });
  }
}

/** The night sky the cards stand on: the title screen's. */
export function night() {
  screen();
  fill(0, 0, W, H, C.night0);
  dither(0, 96, W, 6, C.night0, C.night1);
  fill(0, 102, W, H - 102, C.night1);
}

/** A day turning over: its name big, the time under it, and a few lines of what's ahead. */
export function dayCard(st, title, sub, lines = [], o = {}) {
  return new Card({
    name: title, st, toasts: false, ...o,
    paint(g, t) {
      night();
      const k = easeOut(seg(t, 0, 0.35));
      text(title, W / 2, Math.round(lerp(10, 26, k)), { scale: 2, align: 'center', color: C.white, outline: C.ink });
      text(sub, W / 2, 46, { align: 'center', color: C.yel1 });
      lines.forEach((l, i) => {
        if (t > 0.5 + i * 0.25) text(l, W / 2, 64 + i * 10, { font: 3, align: 'center', color: C.blue3 });
      });
    },
  });
}

const ROUND_NAMES = ['QUARTERFINALS', 'SEMIFINALS', 'FINAL'];
/**
 * The playoffs so far. bracket: { alliances: [{ seed, teams }], rounds: [[{ hi, lo (alliance places), wins: [hi, lo]
 * or null, winner }], ...] }, a round's series listed once they're known.
 */
export function bracketCard(st, bracket, o = {}) {
  const ours = bracket.alliances.findIndex((a) => a.teams.includes(OURS));
  return new Card({
    name: 'THE PLAYOFFS', st, hold: 0.8, ...o,
    paint(g, t) {
      night();
      text(o.title ?? 'THE PLAYOFFS', W / 2, 6, { align: 'center', color: C.white, outline: C.ink });
      text('EVERY SERIES IS THE BEST 2 OF 3. LOSE ONE AND YOU ARE OUT.', W / 2, 17, { font: 3, align: 'center', color: C.blue3 });
      let y = 28;
      bracket.rounds.forEach((round, r) => {
        text(ROUND_NAMES[r], 8, y, { font: 3, color: C.yel1 });
        y += 8;
        for (const sr of round) {
          const row = (i, x, right) => {
            const a = bracket.alliances[i], us = i === ours, lost = sr.winner != null && sr.winner !== i;
            const c = us ? C.red3 : lost ? C.steel1 : C.steel3;
            const str = `${a.seed}  ${a.teams.join(' ')}`;
            text(str, x, y, { font: 3, color: c, align: right ? 'right' : 'left' });
          };
          if (sr.hi === ours || sr.lo === ours) fill(4, y - 1, W - 8, 7, C.red0);
          row(sr.hi, 8);
          row(sr.lo, W - 8, true);
          text(sr.wins ? `${sr.wins[0]} - ${sr.wins[1]}` : 'VS', W / 2, y, { font: 3, align: 'center', color: sr.wins ? C.yel2 : C.steel2 });
          y += 8;
        }
        y += 3;
      });
      if (o.line) text(o.line, W / 2, 118, { align: 'center', color: C.yel2, outline: C.ink });
    },
  });
}

/** Two alliances about to play a best of three: who's on each, what the notebook has on them, and the series so far. */
export function seriesCard(st, { name, us, them, usSeed, themSeed, wins, ours, n, line }) {
  return new Card({
    name, st, status: name, prompt: `A: MATCH ${n}`, promptY: 132,
    paint(g, t) {
      night();
      text(name, W / 2, 5, { scale: 2, align: 'center', color: C.white, outline: C.ink });
      text('BEST 2 OF 3', W / 2, 23, { align: 'center', color: C.yel2 });
      const panel = (x, side, title, nums, from) => {
        const k = easeOut(seg(t, from, from + 0.35)), y = Math.round(lerp(150, 34, k));
        const [c0, c1, c2] = side === 'red' ? [C.red0, C.red1, C.red2] : [C.blue0, C.blue1, C.blue2];
        box(x, y, 108, 74, { fillC: c0 });
        fill(x, y, 108, 11, c1);
        fill(x, y, 108, 1, c2);
        text(title, x + 54, y + 3, { font: 3, align: 'center', color: C.white });
        nums.forEach((num, i) => {
          const sum = summary(st, num), ly = y + 15 + i * 20;
          text(num, x + 5, ly, { color: num === OURS ? C.yel2 : C.white });
          text(num === OURS ? 'OUR ROBOT' : sum.known ? KIND[num] : 'NOT IN THE NOTEBOOK', x + 34, ly + 1, { font: 3, color: C.steel3 });
          text(num === OURS ? '' : knownLine(sum), x + 5, ly + 10, { font: 3, color: sum.n ? C.steel3 : C.org2 });
        });
      };
      const [left, right] = ours === 'blue' ? [[us, usSeed, true], [them, themSeed, false]] : [[them, themSeed, false], [us, usSeed, true]];
      panel(14, 'blue', `ALLIANCE ${left[1]}${left[2] ? ': US' : ''}`, left[0], 0.25);
      panel(134, 'red', `ALLIANCE ${right[1]}${right[2] ? ': US' : ''}`, right[0], 0.4);
      if (t > 0.8) {
        text('VS', W / 2, 62, { align: 'center', color: C.yel1 });
        const [b, r] = ours === 'blue' ? [wins.us, wins.them] : [wins.them, wins.us];
        pips(W / 2 - 16, 112, 2, b, C.blue2);
        pips(W / 2 + 4, 112, 2, r, C.red2);
        if (line) text(line, W / 2, 121, { font: 3, align: 'center', color: C.steel3 });
      }
    },
  });
}
