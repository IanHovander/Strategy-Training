// The van, put together: the cut scene and the seat picking, for stage.js's runScene. Thursday, 6:40 in the morning,
// team 5026's passenger van on the highway to the regional with the red trailer behind. The cut scene opens outside at
// dawn, cuts in to the front bumper and scans the van front to back a row at a time while the pretzels go over the
// seats, holds on the strategist and the teammate in the back row for their talk, goes outside again for the exit and
// comes back in to the whole van, then to the front seats as Owen calls the turn. Then, instead of walking (nobody walks
// in a moving van), the stick picks a seat and A talks to whoever's in it.
//
// The parts: layout.js (where everything is), cabin.js (the van from in front and above with its roof cut away, and
// the road streaming up past it), outside.js (the side view at dawn), people.js (the eight on the walker's rig, their
// props and their business) and script.js (the words, the shot list and the seat picker). This file only joins them:
//   outside shots   drawOutside straight onto the screen, people.js's profiles in its windows
//   cabin shots     drawCabin at 1:1 into a buffer the size of the cabin's world, people.js's rows between its seats and
//                   the pretzels in the air with the row they're going along, or over everything while they're thrown
//                   back over a seat; then the part the shot's camera frames is copied to the screen at a whole-number
//                   zoom
//   both            the film bars, the place card and the fade in, as every scene's cut scene has them
//
// One clock runs the road. A shot's camera, poses and bag go by the shot's own t, but the road, the roadside, the
// bounce, the passing cars and everyone's idle business go by the van's clock: the time the cut scene has really been
// running, waits for the words included, so the road doesn't jump where one shot pans on from another, or between the
// pages of the talk. The seat picking carries the same clock on from the cut scene's last frame.
//
// The dialog box covers the bottom of the picture, so a shot can say which rows of people are under it (under): they're
// left out while it's up, rather than leaving the crowns of their heads poking out over its top edge.

import { W, H, useContext, screen, lerp, seg, easeInOut } from '../pixel.js';
import { bars, cover, placeCard } from '../stage.js';
import { drawBubble } from '../talk.js';
import { HERO_NAME } from '../cast.js';
import { CABIN, FRAME, SEATS_AT, bounce } from './layout.js';
import { drawCabin } from './cabin.js';
import { drawOutside } from './outside.js';
import { SEATS, LOOKS, SLUMP, drawRow, drawProfiles, drawBag, drawHands, bagAt, bagRow } from './people.js';
import { NAMES, LINES, CARD, HINT, NOTE, LABEL, PICK_START, pick, SHOTS } from './script.js';

// ---- The van's clock ----
// Seconds the cut scene has been running, waits for the words included: each new shot carries on from the last one's
// clock by the real time between their frames (wall), whatever its dur said, so the first frame of a shot moves the road
// on as far as any other frame does. A frozen frame (?at=) is c.T itself; a jump (?beat=, the replay) starts it afresh.
let stage = null;
const run = { i: -1, extra: 0, clock: 0, wall: 0 };
function vanClock(i, T) {
  const now = performance.now() / 1000;
  if (stage?.frozen != null) {
    run.i = -1;
    return T;
  }
  if (i !== run.i) {
    run.extra = i === run.i + 1 && run.i >= 0 ? run.clock + (now - run.wall) - T : 0;
    run.i = i;
  }
  run.wall = now;
  return (run.clock = T + run.extra);
}

// ---- The dialog box ----
/** Whether a shot's dialog box is up: in a frozen frame from say.at on; live once its words have started (however
 * early A brought them) until they've been read. */
function boxUp(shot, t) {
  if (!shot.say) return false;
  if (stage?.frozen != null) return t >= (shot.say.at ?? 0);
  const c = stage?.cut;
  return !!c?.conv && !c.read && performance.now() / 1000 >= c.conv.start;
}
/**
 * A shot's words may wait for something to happen first (wordsFrom: the pretzels landing in her lap before she says
 * yes): A pressed before then brings them at that moment instead of straight away. stage.js moves a beat's words up to
 * the press of A, so this holds its start back, live only.
 */
function holdWords(shot) {
  const c = stage?.cut;
  if (shot.wordsFrom == null || stage?.frozen != null || !c?.conv) return;
  if (c.conv.start < c.t0 + shot.wordsFrom) c.conv.start = c.t0 + shot.wordsFrom;
}

// ---- The cabin, framed ----
let buf = null;
/**
 * The cabin's world drawn at 1:1 with the pretzels on their way, and the camera's part of it on the screen. The bag
 * between two hands (or a lap and a lap) is along the way between them, lifted in an arc (a throw over a seat back, a
 * little hop from lap to lap, none from hands to a lap), riding the van. It can come across later than it comes up the
 * screen (kx), so a throw back over a seat goes up past a head before it hooks over to the hands. Between two people in
 * one row it's drawn with that row (people.js drawRow's opts.air), under the seats and heads in front as it is on a lap;
 * thrown back over a seat, it's drawn over everything.
 */
function cabinShot(g, shot, t, clock) {
  const flight = shot.bag?.(t);
  let air = null;
  if (flight) {
    const [x0, y0] = bagAt(flight.from), [x1, y1] = bagAt(flight.to), k = flight.k, arc = flight.arc ?? 6;
    const row = bagRow(flight.from) === bagRow(flight.to) ? bagRow(flight.from) : null;
    air = { x: Math.round(lerp(x0, x1, flight.kx ?? k)), y: Math.round(lerp(y0, y1, k)) - Math.round(arc * Math.sin(Math.PI * k)), row, held: flight.held };
  }
  const opts = { ...shot.rows?.(t), ...(shot.under && boxUp(shot, t) && { hide: shot.under }), ...(air?.row && { air }) };
  const bg = buf.getContext('2d');
  drawCabin(bg, 0, 0, clock, { ...shot.cabin?.(t), hands: drawHands, row: (g2, r, ox, oy) => drawRow(g2, r, ox, oy, clock, opts) });
  if (air && !air.row) drawBag(bg, air.x, air.y + bounce(clock));
  const cam = shot.cam(t);
  useContext(g);
  screen();
  g.imageSmoothingEnabled = false;
  g.drawImage(buf, cam.x, cam.y, W / cam.s, H / cam.s, 0, 0, W, H);
}

// ---- Who's talking, on the phone ----
// The phone shows whoever says the page in the dialog box, in their seat (stage.js's faceGait): a beat's plain pages are
// said by the beat's speaker (say.look), and a page with a name of its own (hers, or Mr. Adeyemi's as Owen calls the
// exit) carries that person's look. Owen and Bea are shown on their phones, everyone else sitting. (Facing you, the
// rig's seated pose reads as standing at the phone's size; turned in the seat it reads as sitting, as her own picture
// does. stage.js draws the speaker facing you for now; faceDir is the turn to use once it takes one.)
//
// In the cut scene the phone shows a beat's speaker only while their words are up. Before they start, the big screen
// is still the shot before anyone speaks (the whole van before Owen calls the exit, the pan down from the trailer, the
// bag sliding across to her), so the phone keeps her own picture, as it does through the beats without words; and once
// they've been read, it goes back to her. stage.js shows a beat's say.look from the beat's first frame, so a speaker's
// look here is a getter that's empty outside those words (stage.js then shows her). A frozen frame (?at=) always shows
// her: stage.js doesn't show a frozen beat's speaker.
const ID_OF = { [HERO_NAME]: 'hero', ...Object.fromEntries(Object.entries(NAMES).map(([id, name]) => [name, id])) };
const ON_PHONE = ['owen', 'bea'];
const seated = (id) => ({ look: LOOKS[id], faceGait: ON_PHONE.includes(id) ? 'phone' : 'sit', faceDy: 6, faceDir: 1 });
/** Whether beat i's words are in the dialog box now (live). */
const wordsUp = (i) => {
  const c = stage?.cut;
  return c?.i === i && !!c.conv && !c.read && performance.now() / 1000 >= c.conv.start;
};
/** obj (a beat's say, or one of its pages) with id's seated picture, its look there only while beat i's words are up. */
function speaker(obj, id, i) {
  const { look, ...face } = seated(id);
  return Object.defineProperty(Object.assign(obj, face), 'look', { get: () => (wordsUp(i) ? look : undefined), enumerable: true });
}
const withFaces = (pages, i) => pages.map((page) => (Array.isArray(page) ? page : speaker({ ...page }, ID_OF[page.name], i)));

// ---- The cut scene ----
const cutscene = SHOTS.map((shot, i) => ({
  dur: shot.dur,
  say: shot.say && speaker({
    name: shot.say.name, lines: withFaces(shot.say.lines, i), at: shot.say.at, auto: shot.say.auto, tag: shot.say.tag,
  }, shot.say.look, i),
  draw(g, t, c) {
    const clock = vanClock(i, c.T);
    holdWords(shot);
    if (shot.view === 'outside') {
      // The side view keeps its own time: its signs and the overtaking car are timed in the shot's seconds.
      drawOutside(g, t, { ...shot.outside(t), inside: (g2, vx, vy) => drawProfiles(g2, vx, vy, t) });
    } else cabinShot(g, shot, t, clock);
    useContext(g);
    screen();
    bars(shot.bars === 'out' ? 1 - c.k : 1);
    if (shot.card) placeCard(t, ...CARD);
    if (shot.fadeIn) cover(1 - t / shot.fadeIn);
    if (shot.fadeOut) cover((t - (shot.dur - shot.fadeOut)) / shot.fadeOut);
  },
}));

// ---- Picking a seat ----
// Everyone but her, to talk to. The phone shows them in their seats.
const PEOPLE = SEATS.filter((p) => p.id !== 'hero').map((p) => ({
  id: p.id, col: p.col, name: NAMES[p.id], x: p.x, y: p.y, lines: LINES[p.id], ...seated(p.id),
}));
const byId = Object.fromEntries(PEOPLE.map((p) => [p.id, p]));
const [HX, HY] = SEATS_AT.hero;

/**
 * Where the bubble goes across from the picked head (11 to the right if not here), and who turns to her when picked
 * (the way they face). Only the teammate, beside her: the middle row would have to turn right round to the back to face
 * her, and from behind Kai's headphones are gone and Rafi's knees swing out over the console, so the bubble marks them
 * alone, as it does everyone else.
 */
const BUBBLE_DX = { teammate: 7, rafi: 7, owen: -11, tess: -11 };
const BUBBLE_TURNS = { teammate: 7 };

/** The stick picks a seat: a flick (past 0.4 along its main axis) moves the pick once, and again every 0.35 s held. */
const FLICK = 0.4, REPEAT = 0.35;
const picker = { id: PICK_START, held: null, wait: 0, last: { x: 0, y: 0 } };
function stickDir(st) {
  const was = picker.last;
  picker.last = st;
  if (st.mag < FLICK) return null;
  const ax = Math.abs(st.x), ay = Math.abs(st.y);
  // Two arrow keys at once: the one just pressed wins, then the stick keeps to that axis.
  const across = ax !== ay ? ax > ay : st.x && !was.x ? true : st.y && !was.y ? false : !!picker.held && picker.held[0] !== 0;
  return across ? [Math.sign(st.x), 0] : [0, Math.sign(st.y)];
}

// The camera in the seat picking: the whole van, and while you talk to the front seats a little lower (FRAME.frontTalk),
// so the dialog box covers the bumper and the road instead of their hands, Owen's phone and the wheel. It eases down and
// back over CAM_EASE seconds, as a function of the time since the talk started or ended; going down, the dialog box
// waits for it (onTalk), so the box doesn't cover the hands and the phone while they're still sliding up into view.
const FRONT = ['owen', 'adeyemi'];
const CAM_EASE = 0.4;
const camMove = { from: FRAME.all.y, to: FRAME.all.y, at: 0 };
function pickCamera(s) {
  const now = performance.now() / 1000, to = FRONT.includes(s.talk?.person?.id) ? FRAME.frontTalk.y : FRAME.all.y;
  const y = () => Math.round(lerp(camMove.from, camMove.to, easeInOut(seg(now, camMove.at, camMove.at + CAM_EASE))));
  if (to !== camMove.to) Object.assign(camMove, { from: y(), to, at: now });
  return { x: 0, y: y() };
}

// The van's clock in the seat picking: on from the cut scene's last frame. The passing lane gets a car every 10 s here
// (the cut scene's shots have one every 16), so the right of the picture is seldom bare for long. A car that would
// already be halfway down the screen when the picking starts waits for the next one.
let freeFrom = null;
const CAR_EVERY = 10, CAR_PHASE = 9; // cabin.js's passing car in the picking: one every 10 s, its cycle offset 9 s
const carCycle = (clock) => Math.floor((clock + CAR_PHASE) / CAR_EVERY);

export const scene = {
  name: 'THE VAN',
  label: LABEL,
  hint: HINT,
  note: NOTE,
  look: LOOKS.hero,
  world: CABIN,
  start: { x: HX, y: HY, dir: 0 },
  cutscene,
  people: PEOPLE,
  setup(s) {
    stage = s;
    buf = Object.assign(document.createElement('canvas'), { width: CABIN.w, height: CABIN.h });
    // She's in her seat from the first frame, so the phone's picture of her during the cut scene is seated too, turned
    // to the teammate as the seat picking starts (facing you, the rig's seated pose reads as standing at that size).
    s.me.gait = 'sit';
    s.me.dir = 1;
  },
  onFree(s) {
    const now = performance.now() / 1000;
    freeFrom = { at: now, clock: run.i >= 0 ? run.clock + (now - run.wall) : now };
    picker.id = PICK_START;
    picker.wait = 0;
    s.me.gait = 'sit';
    // The cut scene hands over on the whole van: forget any ease toward the front-seat framing from before a replay.
    Object.assign(camMove, { from: FRAME.all.y, to: FRAME.all.y, at: 0 });
  },
  camera: pickCamera,
  // Talking to the front seats, the box and its typing start once the camera has eased down to them (talk.js draws
  // nothing before a conversation's start). A pressed while it waits shows the page in full straight away.
  onTalk(s, p) {
    if (FRONT.includes(p.id)) s.talk.start += CAM_EASE;
  },
  status: () => 'IN HER SEAT',
  move: (x, y) => [x, y],
  update(dt, s) {
    const dir = stickDir(s.stick());
    // She stays in her seat: the phone shows her sitting, turned in it (facing you, the rig's seated pose reads as
    // standing at the phone's size).
    s.me.gait = 'sit';
    s.me.dir = 1;
    if (s.talk) {
      // The stick does nothing while someone's talking, and has to come back to the middle before it picks again.
      picker.held = dir;
      picker.wait = Infinity;
      return;
    }
    const same = dir && picker.held && dir[0] === picker.held[0] && dir[1] === picker.held[1];
    if (dir && (!same || (picker.wait -= dt) <= 0)) {
      picker.id = pick(picker.id, dir[0], dir[1]);
      picker.wait = REPEAT;
    }
    picker.held = dir;
  },
  reach: () => byId[picker.id],
  // The bubble beside the picked head, as the arena's stands have it for someone seated (bleachers.js drawPrompt: 11 to
  // the right, 41 up). Heads here are 16 pixels across and only 21 apart, so that only works where nobody sits on that
  // side: the window seats on the right (Bea, Kai, Mr. Adeyemi) have it over their door top, and Owen and Tess by the
  // left-hand windows have it the other way, out toward the glass (Tess's from her head where she's slumped, asleep;
  // the picker never wakes her, but her Zs stop while it's hers). In the middle seats it comes in to 7, on the picked
  // one's own hair and short of the next head along. And the teammate, picked, turns to the strategist (BUBBLE_TURNS),
  // so the bubble and the turned head say together whose it is. (Bea stays on her game until you talk.)
  prompt(g, view, p, t) {
    const [x, y] = p.id === 'tess' ? [p.x + SLUMP.dx, p.y + SLUMP.dy] : [p.x, p.y];
    drawBubble(g, x + (BUBBLE_DX[p.id] ?? 11) - view.x, y - view.y - 41, t);
  },
  draw(g, view, t, s) {
    const clock = freeFrom ? freeFrom.clock + (t - freeFrom.at) : t;
    const cars = !freeFrom || carCycle(clock) > carCycle(freeFrom.clock);
    const opts = {
      look: picker.id, with: s.talk?.person?.id, page: s.talk?.page, bag: 'hero', board: 1,
      pose: BUBBLE_TURNS[picker.id] != null ? { [picker.id]: { dir: BUBBLE_TURNS[picker.id], gait: 'sit' } } : undefined,
      zs: picker.id !== 'tess',
    };
    drawCabin(g, view.x, view.y, clock, {
      cars, carEvery: CAR_EVERY, hands: drawHands, row: (g2, r, ox, oy) => drawRow(g2, r, ox, oy, clock, opts),
    });
  },
};
