// The laptop, put together for the stage (stage.js runScene): the cut scene, then the scouting app to use. Strategy
// training, the way 5026 trains its real strategy team: the Showdown from Strategy Training (games/frc-strategy), a
// practice event of sixteen teams to scout, a picklist to build, alliance selection to run against the other alliance
// and a best of three to plan, then the truth about every robot. She runs one alliance; the practice bot (rival.js)
// runs the other, until the strategy team's own scene gives them the job.
//
// The parts: room.js runs the Showdown's rules on the laptop, rival.js is the other alliance, kit.js the laptop and the
// app's pieces, app.js the app's pages and cutscene.js the cut scene. This file joins them and does the input.
//
// Nobody walks at a laptop, so the stick moves the cursor instead (as the van's stick picks a seat): a flick moves it
// one hotspot that way, and held, it moves on again and again. A presses what it's on. With a team picked up on the
// picklist page, the stick moves the team instead. On a computer the mouse works too: the cursor follows it over the
// screen and a click presses (on a row of the table, a click only picks the team out, so looking isn't choosing). In
// play.html there's no stick on the screen, as for a card: tap what you want, or use the keyboard.
//
// The room starts as the cut scene ends (or is skipped), and keeps going if the cut scene is replayed. Its clocks are
// the Showdown's: fifteen minutes to study (START PICKS ends it sooner), 45 seconds a pick in round one and 90 in round
// two, three minutes to plan (both locking in plays it sooner).
//
// In play.html the way on is a key on the laptop's chin, SHUT LID, rather than the stage's NEXT SCENE button, which
// would sit over the app's gold button in the top right corner: it asks first, then the next scene starts.

import * as rules from '../../games/frc-strategy/draft-rules.js';
import { laptopRoom } from './room.js';
import { makeRival } from './rival.js';
import { C, fill, text } from '../pixel.js';
import { UI, bezel, cursor, hit, navigate, pressSpot, spot } from './kit.js';
import { drawApp, moveGrab, FIRST_TAB, nameOf, mayInvite } from './app.js';
import { cutscene } from './cutscene.js';

const room = laptopRoom(rules, { rival: makeRival() });

/** The app's own state: what's open, what's picked out, where the cursor is, and the news. */
const ui = {
  tab: { ...FIRST_TAB }, sort: 'seed', sel: null, focus: null, grab: null, sure: null, page: {}, scroll: 0,
  toast: null, tally: null, goto: null,
};
let spots = [];
let started = false;
// For poking at from the console, beside window.stage: the room, the app's state and this frame's hotspots.
window.laptop = { room, ui, get spots() { return spots; } };
/** What the room looked like last frame, to notice what's changed: a pick, a lock, a new phase. */
const seen = { phase: null, pick: 0, lock: false, turn: null };

/** The room starts the first time the app's needed: as the cut scene ends, or straight away with ?play. */
function begin() {
  if (started) return;
  started = true;
  room.start();
}
const toast = (str, secs = 4) => (ui.toast = { text: str, until: Date.now() + secs * 1000 });
function restart() {
  room.start();
  Object.assign(ui, { tab: { ...FIRST_TAB }, sort: 'seed', sel: null, focus: null, grab: null, sure: null, page: {}, scroll: 0 });
  seen.phase = null;
}

/** The news along the bottom as things happen, and a fresh page each time the phase moves on. */
function notice(v, t) {
  const them = 1 - v.group;
  // A pick first: the last one moves the phase on too, and the new phase's news is the one to show.
  if (v.pick !== seen.pick) {
    seen.pick = v.pick;
    const p = v.lastPick;
    if (p) {
      const who = p.alliance === v.group ? 'YOU' : `ALLIANCE ${p.alliance + 1}`;
      toast(p.auto ? `TIME RAN OUT: ${who} GOT ${nameOf(p.teamId)}, TOP OF THE LIST` : `${who} INVITED ${nameOf(p.teamId)}`);
    }
  }
  if (v.phase !== seen.phase) {
    const was = seen.phase;
    seen.phase = v.phase;
    Object.assign(ui, { focus: null, grab: null, sure: null, scroll: 0 });
    ui.tab[v.phase] = FIRST_TAB[v.phase];
    if (v.phase === 'prep' && !was) toast(`YOU RUN ALLIANCE ${v.group + 1}. STUDY THE TEAMS, THEN BUILD YOUR PICKLIST.`, 6);
    if (v.phase === 'select') toast(v.turn === v.group ? 'ALLIANCE SELECTION: YOU\'RE ON THE CLOCK!' : 'ALLIANCE SELECTION: ALLIANCE 1 IS ON THE CLOCK');
    if (v.phase === 'plan') toast(`MATCH ${v.match + 1}: OFFENSE OR DEFENSE FOR EACH ROBOT, THEN LOCK IN`);
    if (v.phase === 'result') ui.tally = t;
    if (v.phase === 'final') toast('THE SERIES IS OVER. HERE\'S THE TRUTH.');
  }
  const lock = v.phase === 'plan' && v.locked[them];
  if (lock && !seen.lock) toast(`ALLIANCE ${them + 1} HAS LOCKED IN`);
  seen.lock = lock;
  // Her pick: the scouting table, the cursor on the best team her picklist has left (or the best seed left).
  const turn = v.phase === 'select' && v.turn === v.group ? v.pick : null;
  if (turn != null && turn !== seen.turn) {
    const up = v.picklist.pick.find((id) => mayInvite(v, id)) ?? v.event.find((t) => mayInvite(v, t.id) && !v.picklist.dnp.includes(t.id))?.id;
    Object.assign(ui, { grab: null, sure: null, sel: up ?? ui.sel, goto: up ? `team:${up}` : null });
    ui.tab.select = 'teams';
  }
  seen.turn = turn;
}

/** The way on, in play.html: a key on the laptop's chin, below the display's left corner. */
function shutKey(f, s) {
  const asking = ui.sure === 'shut';
  const on = spot(f, {
    id: 'shut', x: 6, y: 133, w: 42, h: 6, act: () => s.leave(),
    a: asking ? 'YES, SHUT IT' : 'SHUT THE LAPTOP',
    info: asking ? 'THE TRAINING ENDS HERE. A AGAIN TO SHUT THE LAPTOP AND MOVE ON.' : 'SHUT THE LAPTOP: ON TO THE NEXT SCENE',
    sure: true,
  });
  fill(6, 133, 42, 6, asking ? UI.gold : on ? UI.blue : '#232838');
  text(asking ? 'SURE? A AGAIN' : 'SHUT LID >', 27, 134, { font: 3, color: asking ? C.ink : on ? C.white : C.steel2, align: 'center' });
}

/** One frame of the app: drawn, with every hotspot it has, and the cursor on one of them. */
function frame(t, s) {
  const v = room.view();
  notice(v, t);
  const make = () => ({ v, ui, spots: [], focus: ui.focus, t, now: Date.now(), send: room.send, next: room.next, restart, toast });
  const draw = (f) => {
    if (s.canLeave) shutKey(f, s);
    drawApp(f);
  };
  // The cursor goes where it was sent (A on a row, her turn to pick), or stays where it was if that's still there; else
  // it goes somewhere sensible on the page.
  if (ui.goto) [ui.focus, ui.goto] = [ui.goto, null];
  let f = make();
  draw(f);
  if (!f.spots.some((p) => p.id === ui.focus)) {
    const first = f.spots.find((p) => p.home) ?? f.spots.find((p) => !/^(tab|sort):|^(primary|shut)$/.test(p.id));
    ui.focus = (first ?? f.spots.find((p) => p.id === 'primary') ?? f.spots[0])?.id ?? null;
    f = make();
    draw(f);
  }
  spots = f.spots;
  // The arrow points at it, except on a tab or a column's heading, which light up themselves.
  const on = spots.find((p) => p.id === ui.focus);
  if (on && !/^(tab|sort):/.test(on.id)) cursor(on.x - 1, on.y + Math.floor(on.h / 2) - 2, t);
}

// ---- The stick ----
/** A flick (past 0.4 along its main axis) moves the cursor once; held, again after 0.3 s and then every 0.1 s. */
const FLICK = 0.4, FIRST = 0.3, REPEAT = 0.1;
const pad = { held: null, wait: 0 };
function flick(st) {
  if (st.mag < FLICK) return null;
  return Math.abs(st.x) > Math.abs(st.y) ? [Math.sign(st.x), 0] : [0, Math.sign(st.y)];
}
function steer(dx, dy) {
  ui.sure = null;
  if (ui.grab) moveGrab({ v: room.view(), ui, send: room.send }, dx, dy);
  else ui.focus = navigate(spots, ui.focus, dx, dy);
}

export const scene = {
  name: 'THE LAPTOP',
  label: 'A laptop screen running 5026\'s scouting app: the Showdown training, with the scouting for sixteen teams, a picklist, alliance selection and match plans',
  hint: 'Flick the stick to move the cursor, A to press',
  note: 'Flick the stick to move the cursor from button to button, and hold it to keep going; A presses what it\'s on. With a team picked up on the picklist, the stick moves the team. On a computer: the arrow keys or WASD and Space or Enter, or the mouse on the laptop\'s screen (click a row to look at a team, a button to press it). In the cut scene, A reads on and SKIP jumps to the end.',
  world: { w: 256, h: 144 },
  start: { x: -100, y: -100, dir: 1 },
  stick: false,
  next: false,
  cutscene,
  setup(s) {
    s.me.gait = 'sit';
  },
  onFree: begin,
  /** The phone's line under her name: what she's doing on the laptop. */
  status() {
    const v = started ? room.view() : null;
    if (!v?.phase) return 'AT THE LAPTOP';
    return {
      prep: 'STUDYING THE TEAMS', select: v.turn === v.group ? 'ON THE CLOCK!' : 'ALLIANCE SELECTION', plan: `PLANNING MATCH ${v.match + 1}`,
      result: `MATCH ${v.results.length}`, final: 'THE REVEAL',
    }[v.phase] ?? 'AT THE LAPTOP';
  },
  move: (x, y) => [x, y],
  camera: () => ({ x: 0, y: 0 }),
  update(dt, s) {
    // She sits at the laptop the whole time: the phone shows her seated, turned to it.
    s.me.gait = 'sit';
    s.me.dir = 1;
    begin();
    room.tick();
    const dir = flick(s.stick());
    const same = dir && pad.held && dir[0] === pad.held[0] && dir[1] === pad.held[1];
    if (dir && !same) {
      steer(...dir);
      pad.wait = FIRST;
    } else if (same && (pad.wait -= dt) <= 0) {
      steer(...dir);
      pad.wait = REPEAT;
    }
    pad.held = dir;
  },
  press() {
    pressSpot(ui, spots.find((p) => p.id === ui.focus));
    return true;
  },
  action: () => {
    const p = spots.find((q) => q.id === ui.focus);
    return p ? p.a ?? p.label ?? 'PRESS' : null;
  },
  click(x, y) {
    const p = hit(spots, x, y);
    if (!p) return true; // nothing there: a tap on the bezel or a gap does nothing
    if (p.id !== ui.focus) ui.sure = null;
    ui.focus = p.id;
    if (p.tap) p.tap();
    else pressSpot(ui, p);
    return true;
  },
  hover(x, y) {
    const p = hit(spots, x, y);
    if (p && p.id !== ui.focus) {
      ui.focus = p.id;
      ui.sure = null;
    }
  },
  draw(g, view, t, s) {
    begin();
    bezel(t);
    frame(t, s);
  },
};
