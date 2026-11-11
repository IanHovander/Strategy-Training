// The arena, all weekend: the place she comes back to between everything else. It's the arena scene itself
// (../arena/scene.js: the field with matches on it, the stands, the queue), with the event's clock running through
// it and three people who start things:
//
//   Dani, in the front row       pull up a seat and watch a match. She chooses which of the round's other three, and
//                                which robot to keep her eyes on (two, once her teammate sits with her from Friday
//                                lunch): that's the robot that goes in the notebook. It takes two pips of time.
//   Priya, at the queue          her own match. Whenever she's ready: the plan, the match, the call.
//   the way out on the left      to the pits.
//
// Everyone else is there to talk to, as they are in the arena, with something to say about the event as it stands:
// the mentor on where the team's ranked, the scorekeeper on the round's results, Juno from 7777 on how far behind
// she is. Norbert's corner (or B) is the notebook.
//
// In round 1 the guided start (guide.js) points the way round once: Dani's seat for the match of the robot she circled
// in the van (the picker opens on it), Norbert once it's in the notebook, Priya for her own match. A tap on the marker
// walks her over. After that, it's hers.
//
//   arenaHub(st, { from })   the place, for run.js walk(). It leaves with { to: 'pits' }, { to: 'watch', q, focus }
//                            or { to: 'match' }.

import { W, C, screen, fill, text } from '../pixel.js';
import { conversation } from '../talk.js';
import { HERO_NAME } from '../cast.js';
import { scene as arena, SETTINGS } from '../arena/scene.js';
import { approach, wayTo } from '../arena/approach.js';
import { FIELD } from '../field.js';
import { Menu, box, button, inRect } from './ui.js';
import { corner, CORNER, drawToasts, eventChip, pointer, edgePointer, cornerMark } from './hud.js';
import { Book } from './book.js';
import { OURS, ROUNDS, FRIDAY, TEAMS, sideOf } from './event.js';
import { ourMatch, playRound, worldOf, tableOf, summary, seenOf, save } from './state.js';
import { guide, chargeDue, CHARGE, DANI_FIRST, priyaPage } from './guide.js';

/** From this round on her teammate sits with her: two robots a match. (Friday lunch: after the fourth round.) */
export const TWO_FROM = 4;

/** A question with a couple of answers, where the dialog box would be: Priya's "ready?". */
class Choice {
  constructor(title, options) {
    Object.assign(this, { title, options, m: new Menu() });
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
  draw(g, now) {
    this.m.begin();
    screen();
    box(28, 92, 200, 46, { fillC: C.night1, edge: C.yel0 });
    this.title.forEach((l, i) => text(l, 128, 97 + i * 9, { font: i ? 3 : 5, align: 'center', color: i ? C.steel3 : C.white }));
    this.options.forEach((o, i) => {
      const w = Math.floor(184 / this.options.length), r = { x: 36 + i * (w + 4), y: 119, w: w - 4, h: 14 };
      button(r, o.label, this.m.item(`o${i}`, r, o.act), { t: now, font: o.label.length > 14 ? 3 : 5 });
    });
    this.m.end();
  }
}

/**
 * Which match, and which robot: the round's other matches as rows of numbers to press. pre: { q, num }, a robot for the
 * cursor to start on (the guided start's), and once it's picked, the cursor goes to WATCH.
 */
class Picker {
  constructor(st, done, pre = null) {
    Object.assign(this, { st, done, m: new Menu(), picked: [], q: null, pre });
    this.two = st.round >= TWO_FROM;
    if (pre) this.m.on = `r-${pre.q}-${pre.num}`;
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
    if (code === 'Escape' || code === 'KeyX') {
      this.done(null);
      return true;
    }
    return false;
  }
  toggle(q, num) {
    if (this.q !== q) [this.q, this.picked] = [q, []];
    const i = this.picked.indexOf(num);
    if (i >= 0) this.picked.splice(i, 1);
    else {
      this.picked.push(num);
      if (this.picked.length > (this.two ? 2 : 1)) this.picked.shift();
      if (this.pre?.num === num) this.m.on = 'go';
    }
  }
  draw(g, now) {
    const st = this.st, m = this.m, round = worldOf(st).rounds[st.round].filter((x) => !sideOf(x));
    m.begin();
    screen();
    box(8, 20, 240, 116, { fillC: C.night1, edge: C.yel0 });
    text('WHO DO YOU WATCH?', 128, 25, { align: 'center', color: C.white });
    text(this.two ? 'YOU AND YOUR TEAMMATE: A ROBOT EACH, IN ONE MATCH.' : 'ONE MATCH, ONE ROBOT: THE ONE YOU KEEP YOUR EYES ON.', 128, 35, { font: 3, align: 'center', color: C.blue3 });
    round.forEach((match, k) => {
      const y = 45 + k * 22;
      text(`Q${match.q}`, 14, y + 4, { color: C.yel2 });
      [...match.blue, ...match.red].forEach((num, i) => {
        const red = i >= 3, r = { x: 44 + i * 32 + (red ? 12 : 0), y, w: 30, h: 17 }, sum = summary(st, num);
        const on = this.q === match.q && this.picked.includes(num);
        const b = m.item(`r-${match.q}-${num}`, r, () => this.toggle(match.q, num));
        fill(r.x - 1, r.y - 1, r.w + 2, r.h + 2, b.on ? C.yel1 : C.ink);
        fill(r.x, r.y + (b.down ? 1 : 0), r.w, r.h, on ? C.white : red ? C.red0 : C.blue0);
        fill(r.x, r.y + (b.down ? 1 : 0), r.w, 2, red ? C.red1 : C.blue1);
        text(num, r.x + r.w / 2, r.y + 4, { font: 3, align: 'center', color: on ? C.ink : sum.star ? C.yel2 : C.white });
        // How many of its matches she's already seen: a dot each.
        for (let d = 0; d < Math.min(sum.n, 6); d++) fill(r.x + 3 + d * 4, r.y + 12, 2, 2, on ? C.steel1 : C.steel3);
      });
      text('V', 142, y + 5, { font: 3, color: C.steel2 });
    });
    text("A DOT: A MATCH OF ITS I'VE SEEN.  YELLOW: ON MY LIST.", 128, 113, { font: 3, align: 'center', color: C.steel2 });
    const go = { x: 132, y: 120, w: 108, h: 13 }, no = { x: 16, y: 120, w: 76, h: 13 }, ready = this.picked.length > 0;
    button(no, 'NEVER MIND', m.item('no', no, () => this.done(null)), { font: 3, t: now });
    button(go, ready ? `WATCH ${this.picked.join(' AND ')}` : 'PICK A ROBOT', m.item('go', go, () => ready && this.done({ q: this.q, focus: [...this.picked] }), { off: !ready }), { font: 3, t: now, off: !ready });
    m.end();
  }
}

/** What everyone has to say, as the event stands. Anyone not here says what they say in the arena. */
function linesFor(st, id) {
  const r = Math.min(st.round, ROUNDS - 1), m = ourMatch(st, r);
  const t = tableOf(st).find((x) => x.num === OURS), watched = TEAMS.filter((n) => n !== OURS && seenOf(st, n).length).length;
  switch (id) {
    case 'priya':
      return [priyaPage(m)];
    case 'dani':
      return st.flags.metDani ? [[`ROUND ${r + 1}. THREE OTHER MATCHES.`, 'BEST SEAT IN THE HOUSE. WHO IS IT?']] : DANI_FIRST;
    case 'juno':
      return [[`YOU'VE WATCHED ${watched} OF 23 ROBOTS.`, "I'VE GOT ALL OF THEM IN HERE. TWICE."], watched >= 15 ? ["...THAT'S MORE THAN I THOUGHT.", 'SEE YOU SATURDAY, 5026.'] : ['SEE YOU SATURDAY, 5026. IF YOU', 'GET THAT FAR.']];
    case 'adeyemi':
      return t?.played ? [[`RANKED ${t.rank} OF 24. ${t.rp} RANKING POINTS`, `FROM ${t.played} MATCHES.`], ['A WIN IS TWO. A WHOLE ROCKET IS ONE.', 'FIFTEEN ON THE HAB IS ONE. COUNT THEM.']]
        : [['RANKING POINTS SEED YOU. TWO A WIN,', 'ONE A ROCKET, ONE FOR 15 ON THE HAB.'], ['THE TOP EIGHT PICK ON SATURDAY.']];
    case 'gus': {
      // The last round's scores: this round's other matches are still being played, as far as she knows.
      const done = [...worldOf(st).played.values()].filter((p) => p.match.round === r - 1).sort((a, b) => a.match.q - b.match.q);
      if (!done.length) return [['NOTHING ON THE BOARD YET. FIRST MATCH', 'IS ANY MINUTE.']];
      const out = [];
      for (let i = 0; i < done.length; i += 2) out.push(done.slice(i, i + 2).map((p) => `Q${p.match.q}: BLUE ${p.result.score.blue}, RED ${p.result.score.red}.`));
      return out;
    }
    case 'sam':
      return [['BACK AGAIN?'], ['I MEAN: WELCOME. THE FIELD IS DRIVE', 'TEAMS ONLY. THE STANDS ARE THAT WAY.']];
    case 'robin':
      return [["HI! I'M ROBIN, THE EMCEE. I CALL", 'EVERY TEAM ONTO THE FIELD.'], ['WHEN I SAY YOUR NUMBER, YOU CHEER.', "THAT'S THE WHOLE JOB. I LOVE IT."]];
    case 'rosa':
      return [['YOU ARE ON 5026? MY KID BUILT THAT', 'ELEVATOR. TWO STAGES!'], ["I DON'T KNOW ALL THE RULES, BUT I", 'KNOW EXACTLY WHEN TO SCREAM.']];
    case 'milo':
      return [['I WANT TO SEE YOUR ROBOT GET A HATCH', 'ON LEVEL 3!'], ["WHEN I'M IN HIGH SCHOOL I'M JOINING", '5026. SAVE ME A SPOT.']];
    default:
      return null;
  }
}

export function arenaHub(st, { from = 'pits' } = {}) {
  SETTINGS.say = false;
  playRound(st, Math.min(st.round, ROUNDS - 1));
  const mine = Object.fromEntries(arena.people.map((p) => [p.id, Object.create(p, { lines: { get: () => linesFor(st, p.id) ?? p.lines, enumerable: true } })]));
  const daniX = FIELD.x0 + 228;
  const start = from === 'stands' ? { x: daniX - 14, y: 62, dir: 4 } : arena.start;
  const day = st.round < FRIDAY ? 'FRIDAY' : 'SATURDAY';
  const hub = {
    ...arena,
    name: 'THE ARENA', st, cutscene: undefined, exit: undefined,
    start, enter: from === 'pits' ? arena.enter : undefined,
    exits: [{ side: 'left', x: 13, y0: 56, y1: 134, label: 'TO THE PITS', sign: { y: 46 }, to: 'pits' }],
    people: Object.values(mine), over: null,
    reach: (s) => {
      const p = arena.reach(s);
      if (p) return mine[p.id];
      // While the guided start points at Priya, she's in reach from the end of the walkway above her too: walking left
      // along it, the next step past her is out to the pits.
      if (hub.mark?.to === 'priya' && Math.abs(s.me.x - mine.priya.x) < 16 && s.me.y > 54 && s.me.y < 92) return mine.priya;
      return null;
    },
    pointer(type, x, y, s) {
      if (type !== 'down') return false;
      if (s.mode === 'free' && !s.talk && !hub.over && hub.mark && inRect(hub.markAt, x, y)) {
        hub.follow(s, hub.mark);
        return true;
      }
      if (s.mode === 'free' && !s.talk && inRect(CORNER, x, y)) {
        hub.openBook();
        return true;
      }
      return approach(hub, s, x, y);
    },
    /** A tap on the guided start's marker: over to Dani or Priya (the way round anyone in the way), or the notebook. */
    follow(s, g) {
      if (g.to === 'book') return hub.openBook();
      // Already beside them, the stage talks to them straight away: a goal whose person is in reach (with a spot left
      // in it, so the stage's walk doesn't drop it before it looks who's in reach).
      const p = g.to === 'dani' ? mine.dani : mine.priya, way = s.near === p ? [[s.me.x, s.me.y], [s.me.x, s.me.y]] : wayTo(hub, s, p);
      const [first, ...rest] = way?.length ? way : [g.to === 'dani' ? [daniX - 14, 62] : [p.x + 14, p.y]];
      s.goal = { x: first[0], y: first[1], person: p, spots: rest, best: Infinity, since: performance.now() / 1000 };
      return null;
    },
    onTalked(s, p) {
      // A line she says to herself has nobody to have talked to.
      if (!p) return;
      if (p.id === 'dani') {
        st.flags.metDani = true;
        if (st.time < 2) {
          hub.over = new Choice(["THERE ISN'T TIME FOR A WHOLE MATCH.", "YOUR OWN'S NEARLY UP."], [{ label: 'OKAY', act: () => (hub.over = null) }]);
        } else {
          const g = guide(st, 'arena');
          hub.over = new Picker(st, (pick) => {
            hub.over = null;
            if (pick) hub.leave({ to: 'watch', ...pick });
          }, g?.to === 'dani' ? { q: g.q, num: g.num } : null);
        }
      } else if (p.id === 'priya') {
        const m = ourMatch(st, st.round);
        hub.over = new Choice([`Q${m.q}: THE PLAN, THEN THE MATCH.`, st.time > 0 ? 'THERE IS STILL TIME TO LOOK ROUND FIRST.' : 'NOTHING LEFT TO DO BUT PLAY IT.'], [
          { label: 'TO THE QUEUE', act: () => { hub.over = null; hub.leave({ to: 'match' }); } },
          { label: 'NOT YET', act: () => (hub.over = null) },
        ]);
      }
    },
    modal: () => hub.over,
    key(code) {
      if (hub.over?.key?.(code)) return true;
      if (code === 'KeyB' || code === 'Tab') {
        if (hub.over instanceof Book) hub.over = null;
        else if (!hub.over) hub.openBook();
        return true;
      }
      return false;
    },
    openBook() {
      const b = new Book(st);
      b.close = () => (hub.over = null);
      hub.over = b;
    },
    draw(g, view, t, s) {
      arena.draw(g, view, t, s);
      const m = ourMatch(st, st.round);
      // A sign on the rail under Dani's seat, and a word over Priya once there's nothing left to do but play.
      const sx = Math.round(daniX - view.x), px = Math.round(mine.priya.x - view.x);
      screen();
      if (sx > -30 && sx < W + 30) {
        fill(sx - 19, 49, 39, 9, C.ink);
        fill(sx - 18, 50, 37, 7, C.yel1);
        text('SCOUTING', sx - 15, 51, { font: 3, color: C.ink });
      }
      // The guided start's marker, while she's walking about: one at a time (it stands in for YOUR MATCH while it's up).
      const free = s.mode === 'free' && !s.talk && !hub.over, gd = free ? guide(st, 'arena') : null;
      if (!gd && st.time <= 0 && !s.talk && !hub.over && px > -20 && px < W + 20 && Math.floor(t * 2) % 2) {
        text('YOUR MATCH', px, Math.round(mine.priya.y - view.y) - 58, { font: 3, align: 'center', color: C.yel2, outline: C.ink });
      }
      eventChip(st, `${day} ${st.round + 1} OF ${ROUNDS}: WE PLAY Q${m.q}, ${sideOf(m).toUpperCase()}`);
      corner(st, { glow: drawToasts(t), hint: true, blink: gd?.to === 'book' });
      hub.mark = gd;
      hub.markAt = null;
      if (gd?.to === 'dani') {
        hub.markAt = sx >= 8 && sx <= W - 8 ? pointer(sx, 60, 'up', t, gd.label) : edgePointer(sx < 0 ? 'left' : 'right', 66, t, gd.label);
      } else if (gd?.to === 'priya') {
        const py = Math.round(mine.priya.y - view.y);
        // Off the picture, low on the left edge: well clear of the way out to the pits, which is that way too.
        hub.markAt = px >= 4 && px <= W - 40 ? pointer(px + 10, py - 40, 'left', t, gd.label) : edgePointer(px < 0 ? 'left' : 'right', 96, t, gd.label);
      } else if (gd?.to === 'book') hub.markAt = cornerMark(t);
      // The season's first field note: once it's in, she says what it means to her, a moment after she's free.
      if (free && chargeDue(st)) {
        hub.dueAt ??= t;
        if (t - hub.dueAt >= 1.2) {
          s.talk = conversation(HERO_NAME, [CHARGE], t, { tag: C.red1 });
          st.flags.charged = true;
          save(st);
        }
      } else hub.dueAt = null;
    },
  };
  return hub;
}
