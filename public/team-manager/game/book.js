// Her scouting notebook, opened: the one thing that's hers, and the one thing that's always a tap away (Norbert's
// corner, or B). Three tabs on a page of ruled paper:
//
//   ROBOTS        every team at the event as a tile: its number and, once she's watched it, the average of what she's
//                 seen. A tile opens the team's page: where it ranks (the event's own numbers, which everyone has),
//                 then WHAT I'VE SEEN: its ten matches as a row of boxes, a number in each one she watched and a blank
//                 for each she didn't, with its climbs, the times it died, the matches it spent on defense, and the last
//                 line she wrote; and WHAT THEY SAY: whatever its team told her in the pits, kept apart, in pencil. A
//                 star marks a robot she wants on her list.
//   FIELD NOTES   things she's seen for herself, each with the numbers she saw (state.js NOTES). The ones she hasn't
//                 found are there as the questions she still has.
//   RANKINGS      the event's rankings so far: ranking points, wins and losses.
//
// Nothing in it is anything she hasn't seen or been told: a robot nobody's watched is a row of blank boxes.
//
//   openBook(parent, st, { tab, num })   over a screen (run.js Screen.open)
//   new Book(st, { tab, num })           by itself, for a place's panel (stage.js scene.modal); it calls close()

import { W, H, C, screen, fill, text, measure, withAlpha } from '../pixel.js';
import { Menu, frame, dotted, button, arrow, GOOD0 } from './ui.js';
import { PAPER } from './hud.js';
import { TEAMS, NAMES, KIND, OURS, ROUNDS, FRIDAY } from './event.js';
import { summary, seenOf, tableOf, star, NOTES, voltsText, notesFound } from './state.js';
import { recordLines } from './words.js';

const PAGE = { x: 5, y: 3, w: W - 10, h: H - 6 };
const TABS = [['robots', 'ROBOTS'], ['notes', 'FIELD NOTES'], ['ranks', 'RANKINGS']];
const RED = '#a1172a';
/** The teams in the notebook's order: by number, hers first. */
const ORDER = [OURS, ...TEAMS.filter((n) => n !== OURS).sort((a, b) => Number(a) - Number(b))];

export class Book {
  constructor(st, o = {}) {
    Object.assign(this, { st, tab: o.tab ?? 'robots', num: o.num ?? null, page: 0, m: new Menu(), close: () => {} });
  }
  update(dt, s) {
    this.m.stick(s.stick(), performance.now() / 1000);
  }
  press() {
    this.m.press();
  }
  point(type, x, y) {
    this.m.point(type, x, y);
    return true;
  }
  key(code) {
    if (['KeyB', 'Tab', 'Escape', 'KeyX'].includes(code)) {
      if (this.num && code !== 'KeyB' && code !== 'Tab') this.num = null;
      else this.close();
      return true;
    }
    return false;
  }

  draw(g, now) {
    const { x, y, w, h } = PAGE, st = this.st, m = this.m;
    m.begin();
    screen();
    withAlpha(0.7, () => fill(0, 0, W, H, C.ink));
    // The page, its spiral down the left edge, and the tabs along the top.
    fill(x - 1, y - 1, w + 2, h + 2, C.ink);
    fill(x, y, w, h, PAPER.page);
    for (let ry = y + 24; ry < y + h - 3; ry += 8) fill(x + 9, ry, w - 12, 1, PAPER.rule);
    fill(x + 8, y + 15, 1, h - 15, PAPER.margin);
    for (let sy = y + 6; sy < y + h - 4; sy += 9) {
      fill(x + 2, sy, 4, 4, C.ink);
      fill(x + 1, sy + 1, 3, 1, C.steel2);
    }
    let tx = x + 12;
    for (const [id, word] of TABS) {
      const r = { x: tx, y: y + 2, w: measure(word, { font: 3 }) + 10, h: 11 }, on = this.tab === id && !this.num;
      const s = m.item(`tab-${id}`, r, () => Object.assign(this, { tab: id, num: null, page: 0 }));
      fill(r.x, r.y, r.w, r.h, on ? RED : s.on ? C.yel1 : PAPER.rule);
      text(word, r.x + 5, r.y + 3, { font: 3, color: on ? C.white : PAPER.ink });
      tx += r.w + 3;
    }
    // CLOSE sits clear of the top right corner, where the game's own buttons are (SKIP, the sound).
    const cr = { x: tx + 6, y: y + 2, w: 33, h: 11 }, cs = m.item('close', cr, () => (this.num ? (this.num = null) : this.close()));
    fill(cr.x, cr.y, cr.w, cr.h, cs.on ? C.yel1 : PAPER.ink);
    text(this.num ? 'BACK' : 'CLOSE', cr.x + cr.w / 2, cr.y + 3, { font: 3, align: 'center', color: cs.on ? C.ink : C.white });
    fill(x + 9, y + 15, w - 10, 1, PAPER.ink);
    if (this.num) this.teamPage(now);
    else if (this.tab === 'robots') this.robots(now);
    else if (this.tab === 'notes') this.notes();
    else this.ranks();
    m.end();
  }

  // ---- ROBOTS: a tile a team ----
  robots(now) {
    const { x, y } = PAGE, st = this.st;
    const seenAny = TEAMS.filter((n) => n !== OURS && seenOf(st, n).length).length;
    text(`${seenAny} OF ${TEAMS.length - 1} ROBOTS WATCHED. A BLANK ONE I HAVEN'T SEEN PLAY.`, x + 12, y + 19, { font: 3, color: PAPER.pencil });
    ORDER.forEach((num, i) => {
      const r = { x: x + 12 + (i % 6) * 39, y: y + 28 + Math.floor(i / 6) * 22, w: 37, h: 20 }, sum = summary(st, num);
      const s = this.m.item(`t-${num}`, r, () => (this.num = num));
      fill(r.x, r.y + (s.down ? 1 : 0), r.w, r.h, s.on ? C.yel2 : sum.n ? '#e4dcc3' : PAPER.page);
      if (sum.n || num === OURS) frame(r.x, r.y + (s.down ? 1 : 0), r.w, r.h, s.on ? RED : PAPER.ink);
      else dotted(r.x, r.y + (s.down ? 1 : 0), r.w, r.h, s.on ? RED : PAPER.pencil);
      const dy = s.down ? 1 : 0;
      text(num, r.x + 3, r.y + 3 + dy, { font: 3, color: num === OURS ? RED : PAPER.ink });
      if (sum.star) text('*', r.x + 20, r.y + 2 + dy, { font: 3, color: RED });
      if (sum.n) text(String(Math.round(sum.avg)), r.x + r.w - 3, r.y + 3 + dy, { font: 3, align: 'right', color: PAPER.ink });
      // A dot for each match of its she's watched; a small flag if its team's told her something.
      for (let k = 0; k < Math.min(sum.n, 10); k++) fill(r.x + 3 + k * 3, r.y + 13 + dy, 2, 2, PAPER.ink);
      if (sum.heard.length) text('"', r.x + r.w - 6, r.y + 12 + dy, { font: 3, color: PAPER.pencil });
    });
    text("A TILE'S NUMBER IS THE AVERAGE OF WHAT I SAW IT SCORE.", PAGE.x + 12, y + 120, { font: 3, color: PAPER.pencil });
    text('* ON MY LIST.   " ITS TEAM TOLD ME SOMETHING.', PAGE.x + 12, y + 128, { font: 3, color: PAPER.pencil });
    void now;
  }

  // ---- A team's page ----
  teamPage() {
    const { x, y, w } = PAGE, st = this.st, num = this.num, sum = summary(st, num), rank = tableOf(st).find((t) => t.num === num);
    const i = ORDER.indexOf(num), flip = (d) => (this.num = ORDER[(i + d + ORDER.length) % ORDER.length]);
    text(num, x + 13, y + 19, { scale: 2, color: num === OURS ? RED : PAPER.ink });
    text(NAMES[num] ?? '', x + 64, y + 20, { color: PAPER.ink });
    text(sum.known || num === OURS ? KIND[num] : 'KIND OF ROBOT: NOT SEEN YET', x + 64, y + 30, { font: 3, color: PAPER.pencil });
    if (rank?.played) text(`RANKED ${rank.rank} OF ${TEAMS.length}: ${rank.w} WON, ${rank.l} LOST, ${rank.rp} RP`, x + 13, y + 38, { font: 3, color: PAPER.ink });
    else text('NO MATCHES PLAYED YET', x + 13, y + 38, { font: 3, color: PAPER.pencil });
    // The star, and the pages either side.
    const sr = { x: x + w - 62, y: y + 19, w: 58, h: 11 }, ss = this.m.item('star', sr, () => star(st, num));
    if (num !== OURS) {
      fill(sr.x, sr.y, sr.w, sr.h, ss.on ? C.yel1 : sum.star ? RED : PAPER.rule);
      text(sum.star ? '* ON MY LIST' : 'ADD TO LIST', sr.x + sr.w / 2, sr.y + 3, { font: 3, align: 'center', color: ss.on ? C.ink : sum.star ? C.white : PAPER.ink });
    }
    [['prev', -1, x + w - 62], ['next', 1, x + w - 31]].forEach(([id, d, bx]) => {
      const r = { x: bx, y: y + 32, w: 27, h: 10 }, s = this.m.item(id, r, () => flip(d));
      fill(r.x, r.y, r.w, r.h, s.on ? C.yel1 : PAPER.rule);
      arrow(r.x + 12, r.y + 3, d, PAPER.ink);
    });
    // What I've seen: its ten matches, a number where she watched.
    text("WHAT I'VE SEEN", x + 13, y + 48, { font: 3, color: RED });
    const bw = 15, bx = x + 13, by = y + 56;
    sum.row.forEach((v, k) => {
      const px = bx + k * (bw + 2) + (k >= FRIDAY ? 5 : 0), rec = seenOf(st, num).find((r) => r.round === k);
      if (v == null) {
        dotted(px, by, bw, 11, PAPER.pencil);
        return;
      }
      fill(px, by, bw, 11, rec?.dead ? '#e59a9a' : '#e4dcc3');
      frame(px, by, bw, 11, PAPER.ink);
      text(String(v), px + 8, by + 3, { font: 3, align: 'center', color: PAPER.ink });
    });
    text('FRIDAY', bx, by + 13, { font: 3, color: PAPER.pencil });
    text('SATURDAY', bx + FRIDAY * (bw + 2) + 5, by + 13, { font: 3, color: PAPER.pencil });
    let ly = y + 78;
    const line = (str, c = PAPER.ink) => {
      text(str, x + 13, ly, { font: 3, color: c });
      ly += 8;
    };
    if (!sum.n) line(num === OURS ? 'OUR OWN ROBOT. EVERY MATCH GOES IN HERE.' : "NOTHING YET. I HAVEN'T WATCHED IT PLAY.", PAPER.pencil);
    else {
      line(`AVERAGE ${Math.round(sum.avg)} OVER ${sum.n}.${sum.n >= 3 ? `  THE LAST THREE: ${Math.round(sum.recent)}.` : ''}`);
      const bits = [];
      if (sum.l3[1]) bits.push(`LEVEL 3: MADE ${sum.l3[0]} OF ${sum.l3[1]}`);
      if (sum.l2[1]) bits.push(`LEVEL 2: ${sum.l2[0]} OF ${sum.l2[1]}`);
      if (sum.died) bits.push(`DIED IN ${sum.died}`);
      if (sum.walls) bits.push(`ON DEFENSE IN ${sum.walls}`);
      if (bits.length) line(`${bits.join('.  ')}.`);
      const last = seenOf(st, num).at(-1);
      for (const l of recordLines(last).slice(0, 3)) line(l, l.startsWith('Q') ? GOOD0 : PAPER.ink);
    }
    // What they say: in pencil, apart.
    if (sum.heard.length) {
      ly = Math.max(ly + 1, y + 103);
      text('WHAT THEY SAY', x + 13, ly, { font: 3, color: PAPER.pencil });
      ly += 8;
      for (const hd of sum.heard.slice(-4)) {
        if (ly > y + PAGE.h - 8) break;
        line(`${hd.day}: ${hd.text}`.slice(0, 56), PAPER.pencil);
      }
    }
  }

  // ---- FIELD NOTES ----
  notes() {
    const { x, y, w } = PAGE, st = this.st;
    const found = NOTES.filter((n) => st.book.notes[n.id]), open = NOTES.filter((n) => !st.book.notes[n.id]);
    // Laid out down the page; whatever doesn't fit goes on the next.
    const rows = [...found.map((n) => ({ n, h: 9 + st.book.notes[n.id].text.length * 8 + 3 })), ...open.map((n) => ({ n, h: 9, ask: true }))];
    const pages = [[]];
    let used = 0;
    for (const r of rows) {
      if (used + r.h > 106) {
        pages.push([]);
        used = 0;
      }
      pages.at(-1).push(r);
      used += r.h;
    }
    this.page = Math.min(this.page, pages.length - 1);
    text(st.loop === 0 ? 'NOTHING YET.' : `${notesFound(st)} OF ${NOTES.length} FOUND. NORBERT: ${voltsText(st)}. EACH ONE CHARGES HIM.`, x + 12, y + 19, { font: 3, color: PAPER.pencil });
    let ly = y + 29;
    for (const r of pages[this.page]) {
      if (r.ask) {
        text('?', x + 13, ly, { font: 3, color: RED });
        text(r.n.ask, x + 21, ly, { font: 3, color: PAPER.pencil });
      } else {
        const note = st.book.notes[r.n.id];
        text(r.n.title, x + 13, ly, { font: 3, color: RED });
        text(note.day ?? '', x + w - 6, ly, { font: 3, align: 'right', color: PAPER.pencil });
        note.text.forEach((l, k) => text(l, x + 13, ly + 8 + k * 8, { font: 3, color: PAPER.ink }));
      }
      ly += r.h;
    }
    if (pages.length > 1) {
      [['prev', -1, x + w - 62], ['next', 1, x + w - 31]].forEach(([id, d, bx]) => {
        const r = { x: bx, y: y + PAGE.h - 13, w: 27, h: 10 }, s = this.m.item(id, r, () => (this.page = (this.page + d + pages.length) % pages.length));
        fill(r.x, r.y, r.w, r.h, s.on ? C.yel1 : PAPER.rule);
        arrow(r.x + 12, r.y + 3, d, PAPER.ink);
      });
      text(`PAGE ${this.page + 1} OF ${pages.length}`, x + w - 68, y + PAGE.h - 10, { font: 3, align: 'right', color: PAPER.pencil });
    }
  }

  // ---- RANKINGS ----
  ranks() {
    const { x, y } = PAGE, table = tableOf(this.st);
    if (!table.some((t) => t.played)) {
      text('NO MATCHES PLAYED YET. QUALIFICATION STARTS FRIDAY.', x + 12, y + 22, { font: 3, color: PAPER.pencil });
      return;
    }
    text('RANKING POINTS DECIDE IT: 2 A WIN, 1 A ROCKET, 1 FOR 15 ON THE HAB.', x + 12, y + 19, { font: 3, color: PAPER.pencil });
    table.forEach((t, i) => {
      const col = Math.floor(i / 12), lx = x + 13 + col * 118, ly = y + 29 + (i % 12) * 8, ours = t.num === OURS;
      if (ours) fill(lx - 2, ly - 1, 112, 8, '#f7c8c0');
      if (i === 7) fill(lx - 2, ly + 7, 112, 1, RED); // the top eight are the captains
      text(String(t.rank), lx + 8, ly, { font: 3, align: 'right', color: PAPER.pencil });
      text(t.num, lx + 13, ly, { font: 3, color: ours ? RED : PAPER.ink });
      text(`${t.rp} RP`, lx + 58, ly, { font: 3, align: 'right', color: PAPER.ink });
      text(`${t.w}-${t.l}${t.t ? `-${t.t}` : ''}`, lx + 64, ly, { font: 3, color: PAPER.pencil });
      if (this.st.book.stars.includes(t.num)) text('*', lx + 88, ly, { font: 3, color: RED });
    });
    text('THE TOP EIGHT PICK THEIR ALLIANCES ON SATURDAY.', x + 13, y + 128, { font: 3, color: PAPER.pencil });
    void ROUNDS;
  }
}

/** The notebook over a screen (run.js Screen): it takes the stick, A and taps till it's closed. */
export function openBook(parent, st, o = {}) {
  parent.open(new Book(st, o));
}
