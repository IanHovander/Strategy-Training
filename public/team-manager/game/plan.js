// The plan for a match: what each of her alliance's three robots is told to do. It's the one thing a strategist really
// decides before a match, and here it's all hers: any robot can score wherever's quickest, keep to the rockets (a whole
// rocket is a ranking point) or to the cargo ship, or spend the match on one of the other side's robots. A robot that
// handles both pieces can be kept to one. Each starts on what its own drive team does by habit, so A straight through
// is a plan too. Nobody says whether it's a good one: the match does.
//
// On the left, her alliance: each robot's number and kind (she can see a partner's robot in the queue), what her
// notebook has on it, and its job (press to change it). On the right, the other side: whatever the notebook has on
// each, which is nothing at all until she's watched them or been to their pit.
//
//   new Plan({ st, title, sub, ours, team, foes, round, rp, start })
//     team, foes     her alliance's three numbers and the other side's
//     start          { num: choice } to begin from (a plan she's already made, between playoff matches)
//   done({ choices, plans })   plans: { num: plan } for the simulation (event.js planFrom)

import { W, C, screen, fill, text } from '../pixel.js';
import { Screen } from './run.js';
import { ground, box, button } from './ui.js';
import { corner, CORNER, drawToasts } from './hud.js';
import { KIND, OURS, usualChoice, piecesOf, planFrom } from './event.js';
import { summary, robotAt } from './state.js';
import { knownLine, choiceLabel, PIECE } from './words.js';
import { openBook } from './book.js';

const ROW = { y: 36, h: 28 };

export class Plan extends Screen {
  constructor(o) {
    super('THE PLAN');
    this.o = o;
    this.label = "The plan for a match: her alliance's three robots on the left, each with a job to choose, and the other alliance on the right";
    this.robots = Object.fromEntries(o.team.map((n) => [n, robotAt(n, o.round)]));
    this.choices = Object.fromEntries(o.team.map((n) => [n, { ...(o.start?.[n] ?? usualChoice(n, this.robots[n])) }]));
    // A defender by habit has to be given someone: the first of the other side, until she says who. And only one
    // robot defends at a time: a second defender by habit starts out scoring.
    let walls = 0;
    for (const c of Object.values(this.choices)) {
      if (c.job !== 'defend') continue;
      if (walls++) Object.assign(c, { job: 'score', on: null, where: 'any' });
      else if (!o.foes.includes(c.on)) c.on = o.foes[0];
    }
    this.m.on = 'go';
  }
  status() {
    return 'THE PLAN';
  }
  actLabel() {
    return 'CHOOSE';
  }
  /**
   * A robot's job, on to the next: anywhere, rockets, cargo ship, then each of the other side to defend, and round.
   * Only one robot an alliance can play defense at a time (the 2019 manual's G9), so with a partner already on
   * someone, defending isn't on this robot's list.
   */
  cycle(num) {
    const c = this.choices[num], taken = Object.entries(this.choices).some(([n, x]) => n !== num && x.job === 'defend');
    const foes = taken ? [] : this.o.foes;
    const all = [{ job: 'score', where: 'any' }, { job: 'score', where: 'rocket' }, { job: 'score', where: 'ship' }, ...foes.map((on) => ({ job: 'defend', on }))];
    const i = all.findIndex((x) => x.job === c.job && (x.job === 'defend' ? x.on === c.on : x.where === (c.where ?? 'any')));
    Object.assign(c, { on: null }, all[(i + 1) % all.length]);
  }
  cyclePiece(num) {
    const c = this.choices[num], can = piecesOf(this.robots[num]);
    const all = can.length > 1 ? ['both', ...can] : can;
    c.piece = all[(all.indexOf(c.piece) + 1) % all.length];
  }
  go() {
    this.done({ choices: this.choices, plans: Object.fromEntries(Object.entries(this.choices).map(([n, c]) => [n, planFrom(c)])) });
  }
  onKey(code) {
    if (code === 'KeyB' || code === 'Tab') {
      openBook(this, this.o.st);
      return true;
    }
    return false;
  }

  paint(g, t, s, now) {
    const o = this.o, mine = o.ours === 'blue' ? [C.blue0, C.blue1, C.blue3] : [C.red0, C.red1, C.red3];
    const theirs = o.ours === 'blue' ? [C.red0, C.red1, C.red3] : [C.blue0, C.blue1, C.blue3];
    ground();
    fill(0, 0, W, 23, C.night1);
    fill(0, 23, W, 1, C.night3);
    text(`${o.title}: THE PLAN`, W / 2, 4, { align: 'center', color: C.white });
    text(o.sub ?? '', W / 2, 14, { font: 3, align: 'center', color: C.blue3 });
    text(`OUR ALLIANCE: ${o.ours.toUpperCase()}`, 6, 27, { font: 3, color: mine[2] });
    text('AGAINST', 160, 27, { font: 3, color: theirs[2] });
    o.team.forEach((num, i) => {
      const y = ROW.y + i * ROW.h, c = this.choices[num], sum = summary(o.st, num), both = piecesOf(this.robots[num]).length > 1;
      box(4, y, 148, ROW.h - 3, { fillC: C.night1 });
      fill(4, y, 2, ROW.h - 3, mine[1]);
      text(num, 9, y + 3, { color: num === OURS ? C.yel2 : C.white });
      text(num === OURS ? 'OUR ROBOT' : KIND[num], 9, y + 12, { font: 3, color: C.steel3 });
      text(num === OURS ? 'HATCHES, ANY LEVEL' : knownLine(sum), 9, y + 19, { font: 3, color: sum.n || num === OURS ? C.steel2 : C.org2 });
      const r = { x: 56, y: y + 2, w: 94, h: both ? 11 : 13 };
      button(r, choiceLabel(c), this.m.item(`job-${num}`, r, () => this.cycle(num)), { font: 3, t, fillC: c.job === 'defend' ? '#3a1806' : C.night2, color: c.job === 'defend' ? C.org2 : C.white });
      if (both && c.job === 'score') {
        const p = { x: 56, y: y + 14, w: 94, h: 9 };
        button(p, PIECE[c.piece ?? 'both'], this.m.item(`piece-${num}`, p, () => this.cyclePiece(num)), { font: 3, t });
      } else if (c.job === 'defend') text('ALL MATCH, FROM 0:15 ON', 58, y + (both ? 16 : 18), { font: 3, color: C.steel2 });
    });
    o.foes.forEach((num, i) => {
      const y = ROW.y + i * ROW.h, sum = summary(o.st, num), on = Object.values(this.choices).some((c) => c.job === 'defend' && c.on === num);
      box(158, y, 94, ROW.h - 3, { fillC: on ? '#3a1806' : C.night1 });
      fill(250, y, 2, ROW.h - 3, theirs[1]);
      text(num, 163, y + 3, { color: C.white });
      if (sum.star) text('*', 190, y + 3, { color: C.yel1 });
      text(sum.known ? KIND[num] : 'NOT IN THE NOTEBOOK', 163, y + 12, { font: 3, color: sum.known ? C.steel3 : C.steel2 });
      text(on ? 'DEFENDED' : knownLine(sum), 163, y + 19, { font: 3, color: on ? C.org2 : sum.n ? C.steel2 : C.org2 });
    });
    if (o.rp) text('WIN 2 RP. A WHOLE ROCKET 1. 15 ON THE HAB 1.', 6, 121, { font: 3, color: C.steel2 });
    else if (o.note) text(o.note, 6, 121, { font: 3, color: C.steel2 });
    const nb = { x: 4, y: 129, w: 62, h: 12 }, go = { x: 160, y: 127, w: 92, h: 15 };
    button(nb, 'NOTEBOOK', this.m.item('book', nb, () => openBook(this, o.st)), { font: 3, t });
    button(go, 'START MATCH', this.m.item('go', go, () => this.go()), { t });
    this.m.item('norbert', CORNER, () => openBook(this, o.st), { quiet: true });
    corner(o.st, { glow: drawToasts(now) });
  }
}
