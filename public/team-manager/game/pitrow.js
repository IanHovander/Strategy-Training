// The pits: one long hall, a pit a team, all 24. She walks the aisle; at the front of each pit stands someone from
// the team, and behind them their robot on its cart, so before anyone's said a word she can see what kind of machine
// it is. A to talk: a hello, then three things she can ask (pit-words.js), and what they say goes in the notebook as
// what they say. Asking a team takes time (a pip of the round's), and when it's gone the pits are still open but
// nobody has a minute. A crew at work on its robot shows it: someone kneeling at the cart, the drill going, whatever
// the person at the front says about how it's running.
//
// It's the arena's hall and floor (the drape and concrete of ../pits/set.js, drawn simply): the row is as long as the
// event is big, and the way out to the field is at the right end, where the arena's light comes in.
//
//   pitHall(st, { from })   the place, for run.js walk(): from 'arena' she comes in at the right end, otherwise at the
//                           left. It leaves by its way out ({ to: 'arena' }).

import { W, H, C, camera, screen, rect, fill, text, measure, rnd } from '../pixel.js';
import { drawWithShadow } from '../stage.js';
import { conversation } from '../talk.js';
import { stranger } from '../cast.js';
import { goggles } from '../pits/people.js';
import { robotCart } from '../field.js';
import { drawBot } from '../match/bots.js';
import { TEAMS as ROBOTS } from '../match/robots.js';
import { COCAPTAIN_LOOK, COCAPTAIN_NAME } from '../opening/cocaptain.js';
import { Menu, box, button, inRect } from './ui.js';
import { corner, CORNER, drawToasts, eventChip, toast } from './hud.js';
import { Book } from './book.js';
import { OURS, TEAMS, NAMES, ROUNDS, FRIDAY, sideOf } from './event.js';
import { hear, visit, discover, save, ourMatch } from './state.js';
import { QUESTIONS, answer, greeting, busy, toneOf, printOf, rileyLines } from './pit-words.js';

const PIT_W = 56, LEFT = 44;
const ROW = [...TEAMS].sort((a, b) => Number(a) - Number(b));
export const HALL = { w: LEFT + ROW.length * PIT_W + 64, h: H };
const AISLE = { y0: 111, y1: 138 };
const pitX = (i) => LEFT + i * PIT_W;
const REP_Y = 109, CART_Y = 103;

// ---- The hall, drawn ----
const CONCRETE = '#353a4c';
function hall(view, t) {
  camera(view.x, 0);
  const x0 = Math.max(0, view.x - 4), x1 = Math.min(HALL.w, view.x + W + 4);
  // The wall up in the dark and its truss of lights, the drape, the pits' foam and the aisle's concrete.
  rect(x0, 0, x1 - x0, 30, '#0a0c1f');
  rect(x0, 14, x1 - x0, 2, C.steel0);
  for (let x = Math.floor(x0 / 48) * 48; x < x1; x += 48) {
    rect(x + 22, 16, 4, 3, C.steel1);
    rect(x + 23, 19, 2, 1, t % 3.1 < 3 || rnd(x) > 0.2 ? C.yel2 : C.steel0);
  }
  rect(x0, 30, x1 - x0, 50, C.stand1);
  for (let x = Math.floor(x0 / 6) * 6; x < x1; x += 6) rect(x, 30, 1, 50, x % 12 ? C.stand0 : C.stand2);
  rect(x0, 30, x1 - x0, 1, C.steel1);
  rect(x0, 80, x1 - x0, 28, '#2b2f3d');
  for (let x = Math.floor(x0 / 8) * 8; x < x1; x += 8) for (let y = 80; y < 108; y += 8) if (((x + y) / 8) % 2) rect(x, y, 8, 8, '#30354a');
  rect(x0, 108, x1 - x0, H - 108, CONCRETE);
  for (let x = Math.floor(x0 / 14) * 14; x < x1; x += 14) rect(x + 3, 125, 7, 1, C.yel0);
  for (let i = 0; i < 40; i++) {
    const sx = Math.floor(x0 / 256) * 256 + Math.floor(rnd(i * 3.1) * 512), sy = 110 + Math.floor(rnd(i * 7.7) * 32);
    rect(sx, sy, 1, 1, i % 2 ? '#3b4154' : '#30354a');
  }
  // The way out to the field, past the last pit: the arena's light on the floor, and a sign.
  const ex = pitX(ROW.length) + 6;
  rect(ex, 30, HALL.w - ex, 78, '#141a3a');
  rect(ex, 108, HALL.w - ex, H - 108, '#454c63');
  rect(ex + 20, 108, HALL.w - ex - 20, H - 108, '#59627c');
  rect(ex + 8, 64, 44, 13, C.ink);
  rect(ex + 9, 65, 42, 11, C.blue1);
  text('TO THE FIELD', ex + 12, 68, { font: 3, color: C.white });
}
/** One pit: its drape's banner, its table, the dividing drape, and its robot on the cart (someone at work on it, maybe). */
function pit(st, i, t) {
  const num = ROW[i], x = pitX(i), tone = toneOf(num), ours = num === OURS;
  rect(x - 1, 44, 3, 64, C.stand0);
  rect(x + PIT_W - 2, 44, 3, 64, C.stand0);
  rect(x + 2, 106, PIT_W - 4, 2, tone[1]);
  // The banner: the number in the team's colours, its name under it.
  const bw = PIT_W - 6;
  rect(x + 2, 31, bw + 2, 20, C.ink);
  rect(x + 3, 32, bw, 18, tone[1]);
  rect(x + 3, 32, bw, 1, tone[2]);
  text(num, x + 3 + Math.floor(bw / 2), 34, { align: 'center', color: printOf(num) });
  const name = NAMES[num], nw = measure(name, { font: 3 });
  text(nw <= bw - 1 ? name : name.split(' ')[0], x + 3 + Math.floor(bw / 2), 43, { font: 3, align: 'center', color: printOf(num) });
  // A work table against the drape, skirted in the team's colour, a laptop on it.
  rect(x + 4, 84, 18, 2, '#c9b88e');
  rect(x + 4, 86, 18, 9, tone[0]);
  rect(x + 8, 80, 7, 4, C.steel1);
  rect(x + 9, 81, 5, 2, ours ? C.red2 : C.blue3);
  // The robot on its cart.
  const cx = x + 36, kind = ROBOTS[num]?.sprite ?? ROBOTS[num]?.arch ?? 'ele', sprite = SPRITE[ROBOTS[num].arch] ?? kind;
  robotCart(cx, CART_Y, (bx, by) => drawBot(ROBOTS[num].sprite ?? sprite, bx, by, { team: ours ? 'red' : i % 2 ? 'red' : 'blue', num, dir: 1, rsl: false, t }));
  if (busy(st, num) && Math.floor(t * 9) % 3 === 0 && t % 2.4 < 1.5) {
    // The drill going: a few sparks at the cart.
    for (let k = 0; k < 3; k++) rect(cx + 12 + Math.floor(rnd(k + Math.floor(t * 9)) * 6), CART_Y - 14 - Math.floor(rnd(k * 3 + Math.floor(t * 9)) * 6), 1, 1, k % 2 ? C.yel2 : C.white);
  }
}
/** The archetypes' sprites (robots.js): what each kind of robot is drawn as. */
const SPRITE = { ele: 'ele', arm: 'arm', def: 'def', kitbot: 'kitbot', ship: 'ship', hatchlow: 'hatchlow', swerve: 'swerve', climber: 'climber', wedge: 'wedge' };

// ---- The people ----
const looks = new Map();
function lookOf(num, k = 0) {
  const key = `${num}-${k}`;
  // A face a team, from the crowd's rotation, in the team's shirt and (it's the pits) safety glasses.
  if (!looks.has(key)) looks.set(key, num === OURS && k === 0 ? goggles(COCAPTAIN_LOOK) : goggles(stranger((ROW.indexOf(num) * 5 + k * 3 + 2) % 14, toneOf(num))));
  return looks.get(key);
}

/** The three things to ask, and BYE: a panel where the dialog box would be, with the stick, A and taps its own. */
class Ask {
  constructor(hallScene) {
    this.hall = hallScene;
    this.m = new Menu();
  }
  update(dt, s) {
    this.m.stick(s.stick(), performance.now() / 1000);
  }
  press(s) {
    this.s = s;
    this.m.press();
  }
  point(type, x, y, s) {
    this.s = s;
    this.m.point(type, x, y);
    return true;
  }
  draw(g, now, s) {
    const hl = this.hall, p = hl.asking, st = hl.st, m = this.m;
    this.s = s;
    m.begin();
    screen();
    fill(4, 86, 248, 56, C.ink);
    fill(6, 88, 244, 52, '#f4f6fb');
    const nameW = p.name.length * 6 + 9;
    fill(8, 78, nameW, 12, C.ink);
    fill(9, 79, nameW - 2, 10, C.blue1);
    text(p.name, 13, 81, { color: C.white });
    const spent = hl.spent.has(p.num), free = spent || st.time > 0;
    const rows = [...QUESTIONS, ...(p.num === '6834' && st.flags.strapKnown && !st.flags.strap ? ['TELL THEM: ZIP TIE THAT BATTERY STRAP'] : []), 'THANKS. GOOD LUCK OUT THERE.'];
    rows.forEach((q, k) => {
      const r = { x: 10, y: 91 + k * 9.6, w: 236, h: 9 }, last = k === rows.length - 1, off = !last && !free;
      const b = m.item(`q${k}`, r, () => hl.ask(this.s, p, last ? -1 : k), { off });
      if (b.on) fill(r.x, Math.round(r.y), r.w, r.h, C.yel1);
      text(q, r.x + 10, Math.round(r.y) + 1, { color: off ? C.steel3 : b.on ? C.ink : last ? C.steel1 : C.ink });
      if (b.on) text('>', r.x + 2, Math.round(r.y) + 1, { color: C.ink });
      if (!last && hl.asked.has(`${p.num}-${k}`)) text('ASKED', r.x + r.w - 4, Math.round(r.y) + 2, { font: 3, align: 'right', color: b.on ? C.ink : C.steel2 });
    });
    if (!free) text('NO TIME LEFT THIS ROUND', 246, 81, { font: 3, align: 'right', color: C.red3, outline: C.ink });
    else if (!spent) text('ASKING TAKES ONE PIP OF TIME', 246, 81, { font: 3, align: 'right', color: C.yel2, outline: C.ink });
    m.end();
  }
}

export function pitHall(st, { from = 'left' } = {}) {
  const thursday = st.phase === 'thursday';
  const people = ROW.map((num, i) => {
    const ours = num === OURS;
    const p = { id: num, num, x: pitX(i) + 12, y: REP_Y, dir: 0, gait: 'stand', look: lookOf(num), reach: 22, reachY: 22, name: ours ? COCAPTAIN_NAME : `${num}, ${NAMES[num]}` };
    Object.defineProperty(p, 'lines', { get: () => (ours ? rileyLines(st) : greeting(num)), enumerable: true });
    return p;
  });
  const start = from === 'arena' ? { x: HALL.w - 40, y: 124, dir: 6 } : { x: 26, y: 124, dir: 2 };
  const scene = {
    name: 'THE PITS', st,
    label: 'The pits: a long hall with a pit for each of the 24 teams, their robots on carts, and someone from each team to talk to; the strategist walks the aisle in front',
    world: HALL, start, enter: [from === 'arena' ? [HALL.w + 16, 124] : [-16, 124]],
    speed: { walk: 40, run: 100 },
    exits: [{ x: HALL.w - 12, y0: AISLE.y0, y1: AISLE.y1 + 2, label: thursday ? 'TO THE FIELD: FRIDAY' : 'TO THE FIELD', sign: { y: 122 }, to: 'arena' }],
    people, asking: null, spent: new Set(), asked: new Set(), book: null,
    move: (x, y, dx, dy) => [Math.max(8, Math.min(HALL.w - 2, x + dx)), Math.max(AISLE.y0, Math.min(AISLE.y1, y + dy))],
    // After the hello, the questions; our own pit just talks.
    onTalked(s, p) {
      if (p.num === OURS || scene.asking) return;
      visit(st, p.num);
      scene.asking = p;
      scene.menu.m.on = 'q0';
    },
    /** She asks question k (or says goodbye: -1). The first thing asked of a team this visit takes a pip of time. */
    ask(s, p, k) {
      if (k < 0) {
        scene.asking = null;
        return;
      }
      if (!scene.spent.has(p.num)) {
        scene.spent.add(p.num);
        st.time = Math.max(0, st.time - 1);
      }
      if (k === QUESTIONS.length) {
        // The strap: she tells them, and they fix it. Nothing says whether she should.
        st.flags.strap = true;
        hear(st, p.num, 'strap', 'TOLD THEM ABOUT THE STRAP. THEY ZIP-TIED IT.');
        s.talk = conversation(p.name, [['THE STRAP? ...YOU THINK IT WOULD GO?'], ['OKAY. ZIP TIES. TWO OF THEM. THANKS,', `${OURS}. YOU DIDN'T HAVE TO SAY.`]], performance.now() / 1000, { person: p });
      } else {
        const a = answer(st, p.num, k);
        for (const h of a.heard) hear(st, h.num, h.id, h.text, h.extra);
        if (a.flag) st.flags[a.flag] = true;
        scene.asked.add(`${p.num}-${k}`);
        s.talk = conversation(p.name, a.pages, performance.now() / 1000, { person: p });
      }
      toast(discover(st));
      save(st);
    },
    modal: () => scene.book ?? (scene.asking ? scene.menu : null),
    key(code) {
      if (code === 'KeyB' || code === 'Tab') {
        if (scene.book) scene.book = null;
        else scene.openBook();
        return true;
      }
      return scene.book?.key(code) ?? false;
    },
    openBook() {
      scene.book = new Book(st, { num: scene.asking?.num ?? null });
      scene.book.close = () => (scene.book = null);
    },
    pointer(type, x, y, s) {
      if (type === 'down' && s.mode === 'free' && !s.talk && inRect(CORNER, x, y)) {
        scene.openBook();
        return true;
      }
      return false;
    },
    draw(g, view, t, s) {
      hall(view, t);
      const first = Math.max(0, Math.floor((view.x - LEFT) / PIT_W) - 1), last = Math.min(ROW.length - 1, first + 7);
      for (let i = first; i <= last; i++) pit(st, i, t);
      // Everyone standing, back to front: the crews at work, the people at the front of each pit, and her.
      const folk = [];
      for (let i = first; i <= last; i++) {
        const num = ROW[i], p = people[i], talking = s.talk?.person === p || scene.asking === p;
        if (busy(st, num)) folk.push({ y: CART_Y + 1, draw: () => drawWithShadow(g, view, { x: pitX(i) + 50, y: CART_Y + 1, dir: 6, gait: 'kneel', frame: Math.floor(t * 4) % 4, look: lookOf(num, 1) }) });
        // Whoever she's talking to turns to her.
        const dir = talking ? (s.me.x < p.x - 6 ? 7 : s.me.x > p.x + 6 ? 1 : 0) : 0;
        folk.push({ y: p.y, draw: () => drawWithShadow(g, view, { ...p, dir }) });
      }
      folk.push(s.player);
      folk.sort((a, b) => a.y - b.y).forEach((f) => f.draw());
      // What's over the picture: where she is in the event, Norbert, any new field note.
      const m = thursday ? null : ourMatch(st, Math.min(st.round, ROUNDS - 1));
      eventChip(st, thursday ? 'THURSDAY: MATCHES START TOMORROW' : `${st.round < FRIDAY ? 'FRIDAY' : 'SATURDAY'} ${st.round + 1} OF ${ROUNDS}: WE PLAY Q${m.q}, ${sideOf(m).toUpperCase()}`);
      corner(st, { glow: drawToasts(t), hint: true });
      void box;
      void button;
    },
  };
  scene.menu = new Ask(scene);
  return scene;
}
