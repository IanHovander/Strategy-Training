// Alliance selection, on the scouting tablet. The whole thing is played out, pick by pick, the way FIRST runs it
// (event.js makeDraft): round one from alliance 1 down to 8, round two back up, MC Robin calling each pick over the PA.
// Every team that hasn't been picked is on her list, and when it's her turn she can invite any of them, a captain
// below her included (who may say no, and then nobody else can have them). Whoever she picks, the pick stands.
//
// When it's hers:
//   a captain          her alliance's picks are hers, both of them, on a 45-second clock each
//   picked first       by another captain: that captain turns to her for the alliance's second pick. She's the one with
//                      the notebook
//   picked second      she has no picks; she still calls the matches
// and if another captain invites her while she's a captain herself, Robin asks what Robin asks everyone: join them, or
// form your own alliance?
//
// The other captains pick by their own eyes (event.js eyeOf): most by the average, some by the last few matches, a
// couple for what their alliance hasn't got. While they pick she can look through her list; A hurries them along.
//
// The screen: the clock (on her turn) in the header and Robin's last call under it; the eight alliances on the left,
// filling in, hers in red, with whoever she'd meet in the quarterfinal under them; her list on the right as tiles, and
// under it a card for the team the cursor's on. What a tile and a card say is whatever she's got: the senior
// strategist's page in the opening (every match, and an average), her own notebook after that (only what she's seen).
//
//   new Draft({ st, draft, stats, info, lists, note, book })
//     draft     event.js makeDraft(...), already at the pick it starts from
//     stats     event.js fieldStats: what the other captains go by
//     info(num) what the tablet has on a team: { value (the number on its tile, or null), kind, row (ten matches, null
//               for one she hasn't got), note, lines: [..] (the card's small print), star }
//     lists     [{ name, by(num) }]: ways to order her list (the first is how it starts)
//     book      true once the notebook's hers: Norbert's corner opens it
//     react(num, n)   a word from whoever's beside her after her n-th pick, for the PA line (or nothing)
//     used      seconds already gone from her first clock as the screen opens (the opening's walk up to the field)
//   done({ alliances, ours (her alliance's place, 0 to 7), mine: [numbers she picked], gone })

import { W, H, C, screen, fill, text, measure, withAlpha, clamp, rnd } from '../pixel.js';
import { Screen } from './run.js';
import { ground, box, frame, dotted, button, strip, shade, arrow, clockText, inRect } from './ui.js';
import { corner, CORNER, drawToasts } from './hud.js';
import { OURS, QUARTERS, saysYes } from './event.js';
import { openBook } from './book.js';

export const PICK_CLOCK = 45;
/** Seconds: an AI pick's wait (and hurried), the accept's flash, a refusal's moment. */
const GAP = 1.9, HURRY = 0.3, ACCEPT = 1.5, REFUSED = 2.2, FALL = 0.6;
const TILE = { x: 106, y: 47, w: 28, h: 10, cols: 5 };
const tileRect = (j) => ({ x: TILE.x + (j % TILE.cols) * (TILE.w + 1), y: TILE.y + Math.floor(j / TILE.cols) * (TILE.h + 1), w: TILE.w, h: TILE.h });
const CARD = { x: 106, y: 103, w: 146, h: 30 };
const BOARD = { x: 4, y: 47, w: 96, row: 7 };

export class Draft extends Screen {
  constructor(o) {
    super('ALLIANCE SELECTION');
    this.o = o;
    this.label = 'Alliance selection on the scouting tablet: the eight alliances filling in on the left, the teams still to be picked on the right, and a card for the one the cursor is on';
    Object.assign(this, { phase: 'watch', at: 0, hurry: false, sel: null, list: 0, pa: null, fresh: {}, falling: [], mine: [], gone: null, clock0: 0, where: {} });
    this.started = false;
  }
  get d() {
    return this.o.draft;
  }
  /** A tap anywhere is A while the others pick (hurry) and on the cards that wait for it; on her turn it has to land. */
  anywhere() {
    return ['watch', 'accept', 'end'].includes(this.phase);
  }
  status() {
    const t = this.d.turn();
    return { turn: 'ON THE CLOCK', confirm: 'INVITING', accept: 'PICKED', asked: 'INVITED', refused: 'DECLINED', end: 'ALLIANCES SET' }[this.phase]
      ?? (t ? `ROUND ${t.round}: ALLIANCE ${t.alliance + 1} PICKS` : 'ALLIANCES SET');
  }
  actLabel() {
    return { turn: 'CHOOSE', confirm: 'INVITE', watch: 'HURRY', end: 'CONTINUE' }[this.phase] ?? 'NEXT';
  }
  clock() {
    return this.phase === 'turn' || this.phase === 'confirm' ? Math.max(0, PICK_CLOCK - (performance.now() / 1000 - this.clock0)) : null;
  }

  // ---- Whose pick, and what's on her list ----
  /** Her alliance's place (0 to 7), or -1 before she's on one. */
  ourIndex() {
    return this.d.alliances.findIndex((a) => a.teams.includes(OURS));
  }
  /** Whether this turn is hers: she's the captain, or the captain's first pick (who's handed the second pick). */
  isMine(t) {
    if (!t) return false;
    const a = this.d.alliances[t.alliance];
    return a.teams[0] === OURS || (t.round === 2 && a.teams[1] === OURS);
  }
  /** Her list, in the order she's chosen: who she could invite if it were her turn now. */
  teams() {
    const i = this.ourIndex(), captain = i >= 0 && this.d.alliances[i].teams[0] === OURS;
    const pool = this.isMine(this.d.turn()) ? this.d.pool() : this.d.pool(captain ? i : 8);
    const by = this.o.lists[this.list].by;
    return pool.filter((n) => n !== OURS).sort((a, b) => by(b) - by(a));
  }
  next(now) {
    const t = this.d.turn();
    this.at = now;
    if (!t) {
      this.phase = 'end';
      return;
    }
    if (this.isMine(t)) {
      this.phase = 'turn';
      // The clock starts as Robin calls her: the opening's has been running since the cut scene (o.used seconds).
      this.clock0 = now - (this.mine.length ? 0 : this.o.used ?? 0);
      this.hurry = false;
      const a = this.d.alliances[t.alliance];
      this.say(a.teams[0] === OURS ? `ROBIN: ALLIANCE ${t.alliance + 1}, ${OURS}, YOU'RE ON THE CLOCK!` : `${a.teams[0]}'S CAPTAIN: "${OURS}, YOU'VE GOT THE NOTEBOOK. WHO?"`, now);
      if (!this.teams().includes(this.sel)) this.sel = this.teams()[0];
      this.m.on = `t-${this.sel}`;
    } else this.phase = 'watch';
  }
  say(line, now) {
    this.pa = { text: line, at: now };
  }

  // ---- Every frame ----
  tick(dt, s, now) {
    if (!this.started) {
      this.started = true;
      this.next(now);
    }
    const t = now - this.at;
    if (this.phase === 'watch' && t >= (this.hurry ? HURRY : GAP)) this.theirPick(now);
    else if (this.phase === 'accept' && t >= ACCEPT) this.afterAccept(now);
    else if (this.phase === 'refused' && t >= REFUSED) {
      this.phase = 'turn';
      this.at = now;
    }
    this.falling = this.falling.filter((f) => now - f.at < FALL + 0.9);
    this.m.moved = false;
    const list = this.teams();
    if (!list.includes(this.sel)) this.sel = list[0] ?? null;
  }
  /** Her pick's been cheered: on with the picks, and a word from whoever's beside her, if they have one. */
  afterAccept(now) {
    this.next(now);
    if (this.reaction && this.phase !== 'turn') this.say(this.reaction, now);
    this.reaction = null;
  }
  /** Another captain picks: by their own eye. A captain they ask may say no; if it's her they ask, it's her answer. */
  theirPick(now) {
    const d = this.d, t = d.turn(), stats = this.o.stats;
    for (let tries = 0; tries < 8; tries++) {
      const want = d.wish();
      if (want === OURS && d.isCaptain(OURS)) {
        this.phase = 'asked';
        this.at = now;
        this.asking = t;
        this.m.on = 'join';
        this.say(`ROBIN: ${OURS}! ALLIANCE ${t.alliance + 1} INVITES YOU. JOIN, OR FORM YOUR OWN?`, now);
        return;
      }
      if (d.isCaptain(want) && !saysYes(want, t.captain, t.alliance + 1, stats)) {
        d.decline(want);
        continue;
      }
      return this.land(want, now);
    }
  }
  /** A pick's made and accepted: it goes on the board, its tile's stamped and falls, and Robin calls it. */
  land(num, now) {
    const d = this.d, t = d.turn(), hers = this.isMine(t), from = this.where[num];
    const made = d.pick(num);
    this.fresh[`${made.alliance}-${made.round}`] = now;
    if (from) this.falling.push({ num, alliance: made.alliance + 1, at: now, ...from });
    if (num === OURS) {
      this.phase = 'accept';
      this.at = now;
      this.picked = { num: OURS, by: t.captain, alliance: made.alliance + 1 };
      this.say(`ROBIN: ALLIANCE ${made.alliance + 1} PICKS ${OURS}! ${OURS} ACCEPTS!`, now);
      return;
    }
    if (hers) {
      this.mine.push(num);
      this.reaction = this.o.react?.(num, this.mine.length) ?? null;
      this.phase = 'accept';
      this.at = now;
      this.picked = { num, alliance: made.alliance + 1 };
      this.say(`ROBIN: ALLIANCE ${made.alliance + 1} PICKS ${num}!`, now);
      return;
    }
    // A robot on her list, gone before she's picked at all: worth knowing (state.js NOTES 'gone').
    if (!this.gone && !this.mine.length && this.o.st.book.stars.includes(num)) this.gone = { num, alliance: made.alliance + 1 };
    this.say(`ROBIN: ${made.round === 2 && t.alliance === 7 ? 'ROUND 2! ' : ''}ALLIANCE ${made.alliance + 1} PICKS ${num}!${made.promoted ? ` ${made.promoted} MOVES UP.` : ''}`, now);
    this.next(now);
  }
  /** She invites the team on the card. A captain may turn her down. */
  invite(now = performance.now() / 1000) {
    const d = this.d, t = d.turn(), num = this.sel;
    if (!num || !this.isMine(t)) return;
    if (d.isCaptain(num) && !saysYes(num, d.alliances[t.alliance].teams[0], t.alliance + 1, this.o.stats)) {
      d.decline(num);
      this.phase = 'refused';
      this.at = now;
      this.refusedBy = num;
      this.say(`${num}: "THANK YOU, BUT WE'LL FORM OUR OWN ALLIANCE."`, now);
      return;
    }
    this.land(num, now);
  }
  /** Robin's question, answered: join the alliance that asked, or keep her own. */
  answer(join, now = performance.now() / 1000) {
    if (join) return this.land(OURS, now);
    this.d.decline(OURS);
    this.say(`ROBIN: ${OURS} WILL FORM THEIR OWN ALLIANCE.`, now);
    this.phase = 'watch';
    this.at = now;
  }

  // ---- A ----
  onA() {
    const now = performance.now() / 1000;
    if (this.phase === 'watch') this.hurry = true;
    else if (this.phase === 'accept' && now - this.at > 0.4) this.afterAccept(now);
    else if (this.phase === 'end' && now - this.at > 0.6) this.finish();
    else return false;
    return true;
  }
  onKey(code) {
    if ((code === 'KeyB' || code === 'Tab') && this.o.book) {
      openBook(this, this.o.st, { num: this.sel });
      return true;
    }
    return false;
  }
  finish() {
    this.done({ alliances: this.d.alliances.map((a) => ({ seed: a.seed, teams: [...a.teams] })), ours: this.ourIndex(), mine: this.mine, gone: this.gone });
  }

  // ---- The screen ----
  paint(g, _t, s, now) {
    const o = this.o, d = this.d, t = now - this.at, turn = d.turn();
    const hers = this.phase === 'turn' || this.phase === 'confirm' || this.phase === 'refused';
    ground();
    // The header: her clock, or who's picking.
    fill(0, 0, W, 30, C.night1);
    fill(0, 30, W, 1, C.night3);
    if (hers) {
      const left = PICK_CLOCK - (now - this.clock0), out = left <= 0, hot = left <= 10 && !out && left % 1 > 0.7, slam = now - this.clock0 < 0.12;
      if (slam) fill(W / 2 - 30, 1, 60, 18, C.white);
      text(out && now % 0.8 < 0.4 ? 'TIME!' : clockText(left), W / 2, 3, { scale: 2, align: 'center', color: slam ? C.red1 : hot ? C.white : C.red2, outline: C.ink });
      text(out ? "TIME'S UP. ROBIN'S WAITING: PICK!" : `YOUR PICK: ALLIANCE ${turn.alliance + 1}, ROUND ${turn.round}`, W / 2, 21, { font: 3, align: 'center', color: out ? C.red3 : C.blue3 });
      const bar = Math.round((W - 8) * clamp(left, 0, PICK_CLOCK) / PICK_CLOCK);
      fill(4, 44, W - 8, 2, C.night1);
      fill(4, 44, bar, 2, left <= 10 ? C.red2 : C.red1);
    } else {
      text('ALLIANCE SELECTION', W / 2, 5, { align: 'center', color: C.steel3 });
      text(turn ? `ROUND ${turn.round}: ALLIANCE ${turn.alliance + 1} IS PICKING` : 'EIGHT ALLIANCES OF THREE', W / 2, 16, { font: 3, align: 'center', color: C.blue3 });
    }
    this.ticker(now);
    this.board(now, turn);
    this.tiles(now, hers);
    this.card(now, hers);
    // The hint line.
    if (this.phase === 'watch') text('NOT YOUR TURN.  A: HURRY THEM ALONG', 180, 136, { font: 3, align: 'center', color: C.steel2 });
    else if (hers) text('PICK A TEAM, THEN INVITE', 180, 136, { font: 3, align: 'center', color: C.yel2 });
    if (this.phase === 'accept') this.accepted(t);
    if (this.phase === 'asked') this.asked(now);
    if (this.phase === 'end') this.ended(t);
    if (o.book) this.m.item('norbert', CORNER, () => openBook(this, o.st, { num: this.sel }), { quiet: true });
    const ear = this.phase === 'turn' || this.phase === 'asked' ? 0.35 + 0.3 * Math.sin(now * 4) : 0;
    corner(o.st, { glow: Math.max(drawToasts(now), ear), hint: o.book });
  }
  /** The PA line: a speaker, and the last thing said over it, typed out; a flash of yellow as it starts. */
  ticker(now) {
    const y = 32, h = 11, pa = this.pa, since = pa ? now - pa.at : 99;
    fill(0, y, W, h, C.ink);
    const fresh = since < 0.15;
    if (fresh) fill(0, y, W, h, C.yel1);
    const c = fresh ? C.ink : since < 3 ? C.white : C.steel1;
    fill(5, y + 4, 2, 3, c);
    fill(7, y + 3, 1, 5, c);
    fill(8, y + 2, 1, 7, c);
    if (since < 3 && Math.floor(since * 4) % 2 === 0) {
      fill(10, y + 4, 1, 3, c);
      fill(12, y + 3, 1, 5, c);
    }
    if (pa) text(pa.text, 17, y + 3, { font: 3, color: fresh ? C.ink : since > 6 ? C.steel2 : C.white, upto: Math.floor(since * 60) });
  }
  /** The eight alliances, and under them whoever hers would meet in the quarterfinal. */
  board(now, turn) {
    const { x, y, w, row } = BOARD, d = this.d, ours = this.ourIndex();
    const foe = ours >= 0 ? QUARTERS.find((q) => q.includes(ours)).find((i) => i !== ours) : -1;
    d.alliances.forEach((a, i) => {
      const ry = y + i * row, us = i === ours, them = i === foe;
      fill(x, ry, w, row - 1, us ? C.red0 : them ? '#3a1806' : C.night1);
      if (us || them) fill(x, ry, 2, row - 1, us ? C.red1 : C.org1);
      text(String(i + 1), x + 3, ry + 1, { font: 3, color: us ? C.red3 : them ? C.org2 : C.steel2 });
      [0, 1, 2].forEach((k) => {
        const cx = x + 10 + k * 20, num = a.teams[k], picking = turn && turn.alliance === i && k === turn.round;
        const age = now - (this.fresh[`${i}-${k}`] ?? -99);
        if (picking && now % 0.6 < 0.4) frame(cx - 2, ry - 1, 19, row + 1, C.yel1);
        if (!num) {
          for (let dx = 0; dx < 14; dx += 3) fill(cx + dx, ry + 3, 2, 1, picking ? C.yel0 : C.steel1);
          return;
        }
        if (age < 0.12) fill(cx - 1, ry, 17, row - 1, C.yel2);
        text(num, cx, ry + 1, { font: 3, color: age < 1.6 ? C.yel2 : num === OURS ? C.white : us ? C.red3 : them ? C.org2 : C.steel3 });
      });
      if (us) text('US', x + w - 3, ry + 1, { font: 3, align: 'right', color: C.red3 });
      else if (them) text('QF', x + w - 3, ry + 1, { font: 3, align: 'right', color: C.org2 });
    });
    // Under the board: how the list is ordered (press to change), and a word on the quarterfinal.
    const by = { x, y: 105, w, h: 11 };
    if (this.o.lists.length > 1) {
      const st = this.m.item('order', by, () => (this.list = (this.list + 1) % this.o.lists.length));
      button(by, `LIST BY: ${this.o.lists[this.list].name}`, st, { font: 3, t: now });
    } else {
      fill(by.x, by.y, by.w, by.h, C.night1);
      text(this.o.lists[0].name, by.x + w / 2, by.y + 3, { font: 3, align: 'center', color: C.steel3 });
    }
    if (ours >= 0) {
      text(`QUARTERFINAL: ALLIANCE ${foe + 1}`, x + 1, 120, { font: 3, color: C.org2 });
      text(`THEM: ${d.alliances[foe].teams.join(' ')}`, x + 1, 127, { font: 3, color: C.steel2 });
    } else {
      text("WE'RE NOT ON AN ALLIANCE", x + 1, 120, { font: 3, color: C.steel3 });
      text('YET. EVERYONE GETS PICKED.', x + 1, 127, { font: 3, color: C.steel2 });
    }
  }
  /** Her list: a tile a team, and the ones just taken stamped and falling away. */
  tiles(now, hers) {
    const o = this.o, list = this.teams();
    this.where = {};
    list.forEach((num, j) => {
      const r = tileRect(j), info = o.info(num), on = num === this.sel;
      this.where[num] = { x: r.x, y: r.y };
      const st = this.m.item(`t-${num}`, r, () => {
        if (this.sel === num && this.phase === 'turn') return this.toConfirm();
        this.sel = num;
      }, { off: this.phase !== 'turn' && this.phase !== 'watch' });
      // The card follows the cursor as the stick moves it.
      if (st.on && this.m.moved) this.sel = num;
      this.tile(r.x, r.y + (st.down ? 1 : 0), num, info, on, st.on, now);
    });
    for (const f of this.falling) {
      const k = clamp((now - f.at - 0.5) / FALL, 0, 1), y = f.y + Math.round(k * k * 40), a = 1 - Math.round(k * 4) / 4;
      withAlpha(a, () => {
        this.tile(f.x, y, f.num, o.info(f.num), false, false, now);
        const bw = measure(`ALLIANCE ${f.alliance}`, { font: 3 }) + 8, bx = clamp(f.x + TILE.w / 2 - bw / 2, TILE.x, W - 4 - bw);
        if (now - f.at < 0.08) return fill(bx - 2, y - 4, bw + 4, 20, C.white);
        fill(bx - 1, y - 3, bw + 2, 17, C.ink);
        fill(bx, y - 2, bw, 15, C.red0);
        frame(bx, y - 2, bw, 15, C.red2);
        text('TAKEN BY', bx + bw / 2, y, { font: 3, align: 'center', color: C.red3 });
        text(`ALLIANCE ${f.alliance}`, bx + bw / 2, y + 6, { font: 3, align: 'center', color: C.white });
      });
    }
    void hers;
  }
  tile(x, y, num, info, sel, cursor, now) {
    const { w, h } = TILE, cap = this.d.isCaptain(num);
    fill(x, y, w, h, sel ? C.night3 : C.night1);
    frame(x, y, w, h, cursor ? (now % 0.9 < 0.6 ? C.yel1 : C.yel0) : sel ? C.white : C.steel1);
    if (cap) fill(x + 1, y + 1, w - 2, 1, C.yel1); // a captain below her: they can be asked
    text(num, x + 2, y + 3, { font: 3, color: info.star ? C.yel2 : C.white });
    text(info.value == null ? '-' : String(info.value), x + w - 2, y + 3, { font: 3, align: 'right', color: info.value == null ? C.steel1 : C.yel1 });
  }
  /** The card for the team the cursor's on, with INVITE on it when it's her turn. */
  card(now, hers) {
    const { x, y, w, h } = CARD, num = this.sel;
    if (!num) return;
    const info = this.o.info(num);
    box(x, y, w, h, { fillC: C.night1, edge: hers ? C.yel0 : C.steel1 });
    text(num, x + 4, y + 3, { color: C.white });
    if (info.kind) text(info.kind, x + 30, y + 4, { font: 3, color: C.blue3 });
    if (this.d.isCaptain(num)) text('A CAPTAIN', x + w - 4, y + 4, { font: 3, align: 'right', color: C.yel1 });
    else if (info.value != null) text(`AVG ${info.value}`, x + w - 4, y + 4, { font: 3, align: 'right', color: C.yel1 });
    strip(info.row, x + 4, y + 12, { w: 8, h: 8, gap: 1, split: 7, mark: info.mark ?? [] });
    (info.lines ?? []).slice(0, 1).forEach((l, i) => text(l.slice(0, 35), x + 4, y + 23 + i * 7, { font: 3, color: C.steel3 }));
    // INVITE, on the card's right.
    const r = { x: x + w - 43, y: y + 11, w: 40, h: 11 };
    if (this.phase === 'turn') button(r, 'INVITE', this.m.item('invite', r, () => this.toConfirm()), { font: 3, t: now });
    if (this.phase === 'confirm') this.confirm(now);
    if (this.phase === 'refused') {
      shade(0.6, 46);
      box(40, 62, 176, 30, { fillC: C.night1, edge: C.red2 });
      text(`${this.refusedBy} SAYS NO.`, W / 2, 68, { align: 'center', color: C.white });
      text("NOBODY ELSE CAN PICK THEM NOW. PICK AGAIN.", W / 2, 81, { font: 3, align: 'center', color: C.red3 });
    }
  }
  toConfirm() {
    if (this.phase !== 'turn' || !this.sel) return;
    this.phase = 'confirm';
    this.at = performance.now() / 1000;
    this.m.on = 'yes';
  }
  /** "5026 RESPECTFULLY INVITES TEAM 6834": INVITE or BACK. The clock runs on. */
  confirm(now) {
    const t = this.d.turn(), by = this.d.alliances[t.alliance].teams[0];
    shade(0.75, 46);
    box(24, 54, 208, 62, { fillC: C.night1, edge: C.yel1, thick: 2 });
    text(`${by} RESPECTFULLY INVITES`, W / 2, 61, { align: 'center', color: C.white });
    text(`TEAM ${this.sel}`, W / 2, 73, { scale: 2, align: 'center', color: C.yel2, outline: C.ink });
    const yes = { x: 54, y: 96, w: 70, h: 15 }, no = { x: 132, y: 96, w: 70, h: 15 };
    button(yes, 'INVITE', this.m.item('yes', yes, () => now - this.at > 0.25 && this.invite()), { t: now });
    button(no, 'BACK', this.m.item('no', no, () => {
      this.phase = 'turn';
    }), { t: now });
  }
  /** "6834 ACCEPTS!", with a burst of confetti. */
  accepted(t) {
    const p = this.picked, colors = [C.yel1, C.blue2, C.white, C.red2, C.yel2];
    shade(0.8, 46);
    for (let i = 0; i < 60; i++) {
      const x = Math.round(rnd(i) * W), y = Math.round(47 + ((rnd(i + 99) * 40 + t * (30 + rnd(i + 7) * 40)) % (H - 47)));
      fill(x, y, 2, 2, colors[i % colors.length]);
    }
    fill(36, 60, W - 72, 46, t < 0.1 ? C.white : C.night2);
    frame(36, 60, W - 72, 46, C.yel1, 2);
    if (p.num === OURS) {
      text(`ALLIANCE ${p.alliance} PICKS US!`, W / 2, 68, { align: 'center', color: C.white });
      text(`${OURS} ACCEPTS!`, W / 2, 84, { scale: 2, align: 'center', color: C.yel2, outline: C.ink });
    } else {
      text(p.num, W / 2, 68, { scale: 2, align: 'center', color: C.yel2, outline: C.ink });
      text('ACCEPTS!', W / 2, 87, { scale: 2, align: 'center', color: C.white, outline: C.ink });
    }
  }
  /** Robin's question to a captain who's been invited: join, or form your own? */
  asked(now) {
    const t = this.asking;
    shade(0.75, 46);
    box(20, 52, 216, 68, { fillC: C.night1, edge: C.yel1, thick: 2 });
    text(`ALLIANCE ${t.alliance + 1} INVITES ${OURS}`, W / 2, 59, { align: 'center', color: C.white });
    text(`THEIR CAPTAIN IS ${t.captain}. SAY YES AND WE'RE THEIR FIRST PICK.`, W / 2, 71, { font: 3, align: 'center', color: C.steel3 });
    text("SAY NO AND WE CAPTAIN OUR OWN. NOBODY ELSE CAN ASK US.", W / 2, 79, { font: 3, align: 'center', color: C.steel3 });
    const yes = { x: 30, y: 97, w: 94, h: 15 }, no = { x: 132, y: 97, w: 94, h: 15 };
    button(yes, 'JOIN THEM', this.m.item('join', yes, () => now - this.at > 0.4 && this.answer(true)), { t: now });
    button(no, 'FORM OUR OWN', this.m.item('own', no, () => now - this.at > 0.4 && this.answer(false)), { t: now });
  }
  ended(t) {
    if (t < 0.5) return;
    fill(106, 46, 146, 88, C.night0);
    box(110, 56, 138, 44, { fillC: C.night1, edge: C.yel0 });
    const a = this.d.alliances[this.ourIndex()];
    text(`ALLIANCE ${a.seed}`, 179, 62, { align: 'center', color: C.white });
    text(a.teams.join('  '), 179, 75, { align: 'center', color: C.yel2 });
    text("THAT'S US. PLAYOFFS NEXT.", 179, 88, { font: 3, align: 'center', color: C.steel3 });
    if (t > 1.2 && t % 1 < 0.7) text('A: CONTINUE', 179, 112, { align: 'center', color: C.yel2 });
    void dotted;
    void inRect;
    void arrow;
  }
}
