// The team meeting, put together on the shared stage (stage.js): the back lawn of the team's high school (place.js),
// the team in its merch (people.js), the meeting itself as a cut scene (cutscene.js) and what everyone has to say once
// it breaks up (lines.js). It opens on the sky over the school's roof, tilts down to the whole team sitting in a circle
// on the grass, plays the co-captains' shout-outs and updates, ends on "IRON PANTHERS!", and fades back in on the lawn
// with the meeting broken up into small groups for her to walk about and talk to.
//
// Everything stands on the floor the arena's way (field.js): the lawn, the wall, the path and the floor's shade are
// one backdrop drawn first, then everything that stands up (the trees, the bench, the easel, the table, the bags and
// every person) is sorted back to front by its floor line and drawn through pixel.js's camera, a prop before a person
// when they share a line. Whoever sits on the bench has their feet three pixels in front of it, so they draw after it.
// The cut scene and the walkable part share that one composition: the cut scene places the meeting with its cue, the
// walkable part has the after-meeting groups and her.
//
// Three things stage.js doesn't do, done here: the walkable part fades in from black over 0.6 seconds when the cut scene
// ends (not with ?play, which skips straight to walking), the A bubble waiting until it has; while she talks to someone
// sitting on the grass, the view eases up a little so they show over the dialog box; and while the cut scene runs the
// walker frames the meeting is about to need are made a few at a time, so the first round of applause doesn't stutter
// (each frame takes a few milliseconds to ray-cast the first time, and the meeting needs a couple of hundred).

import { W, H, useContext, camera, screen, seg, clamp, lerp, easeInOut } from '../pixel.js';
import { walkerFrame } from '../walker.js';
import { runScene, drawWithShadow, cover, frameOf } from '../stage.js';
import { drawBubble } from '../talk.js';
import { WORLD, START } from './layout.js';
import { drawBackdrop, things, blocked } from './place.js';
import { CAST, circle, after, TALKERS, occupied, within } from './people.js';
import { makeCutscene } from './cutscene.js';
import { LINES } from './lines.js';

/**
 * Everything that stands on the lawn, back to front: props (place.js things) and people (drawn with their shadow, and
 * anything they carry after them), plus more already in { y, draw } form (her, s.player). Each draws through the
 * camera at view, and pixel.js is left on g at the screen.
 */
function standing(g, view, props, people, more = []) {
  const all = [
    ...props.map((p) => ({ y: p.y, prop: true, draw: p.draw })),
    ...people.map((p) => ({ y: p.y, draw: () => { drawWithShadow(g, view, p); p.extra?.(g, view); } })),
    ...more,
  ].sort((a, b) => a.y - b.y || (b.prop ? 1 : 0) - (a.prop ? 1 : 0));
  for (const it of all) {
    useContext(g);
    camera(view.x, view.y, 1);
    it.draw();
  }
  useContext(g);
  screen();
}

/** The world for the cut scene, at 1x from view, t seconds in, with the meeting placed by cue (cutscene.js). */
function paint(g, view, t, cue) {
  drawBackdrop(g, view, t);
  const people = [...circle(t, cue.circle), { ...cue.tessa, look: CAST.tessa.look }, { ...cue.owen, look: CAST.owen.look }];
  standing(g, view, things(t), people);
  warm();
}

const cutscene = makeCutscene({ paint, cast: CAST });

// ---- Frames made ahead ----
// Who the cut scene will draw in which pose: every beat's cue, looked at every 50 milliseconds (a beat with words is
// looked at for a few seconds past its end, where it waits to be read), then the after-meeting groups. In the order
// they're first needed, without repeats, each with the cut scene time it's first needed at. The first second's frames
// are made before the cut scene starts (setup), so its fade in from black isn't held up; the rest a few at a time from
// then on, whichever beat is showing; and when a beat starts (A hurries the beats along, and ?beat= skips to one) the
// frames its first second needs, at once, if they aren't made yet.
/** Everyone the cut scene draws in beat b, t seconds into it and T into the cut scene. */
const drawn = (b, t, T) => {
  const cue = b.cue(t, T);
  return [...circle(T, cue.circle), { ...cue.tessa, look: CAST.tessa.look }, { ...cue.owen, look: CAST.owen.look }];
};
const START_OF = cutscene.map((_, i) => cutscene.slice(0, i).reduce((n, b) => n + b.dur, 0));
const AHEAD = [];
{
  const seen = new Set();
  const need = (T) => (p) => {
    const frame = frameOf(p), key = `${p.look.id}|${p.dir}|${p.gait}|${frame}`;
    if (!seen.has(key)) {
      seen.add(key);
      AHEAD.push({ T, args: [p.dir, p.gait, frame, p.look] });
    }
  };
  cutscene.forEach((b, i) => {
    for (let t = 0; t < b.dur + (b.say ? 3 : 0); t += 0.05) drawn(b, t, START_OF[i] + t).forEach(need(START_OF[i] + t));
  });
  for (let t = 0; t < 30; t += 0.1) after(t).forEach(need(Infinity));
}
let ahead = 0;
/** Make the frames needed by cut scene time T, all at once. */
function makeUpTo(T) {
  while (ahead < AHEAD.length && AHEAD[ahead].T <= T) walkerFrame(...AHEAD[ahead++].args);
}
/** The beat whose first second has been made. */
let begun = -1;
/** While the cut scene runs: when a beat starts, its first second's frames (walkerFrame keeps the ones already made);
 *  then the next frames on the list, for at most 5 milliseconds a frame. */
function warm() {
  const s = window.stage;
  if (s?.mode !== 'cut' || !s.cut) return;
  if (s.cut.i !== begun) {
    begun = s.cut.i;
    const b = cutscene[begun];
    for (let t = 0; t <= 1; t += 0.05) drawn(b, t, START_OF[begun] + t).forEach((p) => walkerFrame(p.dir, p.gait, frameOf(p), p.look));
  }
  const until = performance.now() + 5;
  while (ahead < AHEAD.length && performance.now() < until) walkerFrame(...AHEAD[ahead++].args);
}

// ---- The walkable part ----
/** Whether feet at (x, y) are somewhere she can't stand: blocked by the place, or in someone's way. */
const hit = (x, y) => blocked(x, y) || occupied(x, y);
/** The nearest spot straight down or up from (x, y) that isn't hit(), a pixel at a time, down first. */
function unstuck(x, y) {
  for (let d = 0; d < WORLD.h; d++) {
    if (!hit(x, y + d)) return [x, y + d];
    if (!hit(x, y - d)) return [x, y - d];
  }
  return [x, y];
}
/** Seconds the walkable part takes to fade in from black once the cut scene ends (onFree notes when, as s.freeAt). */
const FADE = 0.6;

/**
 * The view follows her as stage.js's does, but while she talks to someone sitting on the grass it eases 18 pixels
 * further down the world (as far as the world allows) over 0.3 seconds, and back after: seated, they're short, and at
 * the usual height the dialog box and its name tag would cut them off at the chin.
 */
const LIFT = 18;
let lift = { on: false, at: 0, from: 0 };
const liftAt = (t) => lerp(lift.from, lift.on ? LIFT : 0, easeInOut(seg(t, lift.at, lift.at + 0.3)));
function follow(s) {
  const now = performance.now() / 1000, on = s.talk?.person?.gait === 'floor';
  if (on !== lift.on) lift = { on, at: now, from: liftAt(now) };
  return {
    x: Math.round(clamp(s.me.x - W / 2, 0, WORLD.w - W)),
    y: Math.round(clamp(s.me.y - 28 - H / 2 + liftAt(now), 0, WORLD.h - H)),
  };
}

// ---- The A bubble ----
// It goes just over the head of whoever she's in reach of (people.js TALKERS bubble), nudged a little away from her. But
// beside someone, a little behind them (people.js within() gives the A up to 6 pixels back), her face may be right where
// that would be, and in a group the next head may be close by. So the bubble
// takes the nearest spot, a pixel at a time either side, that covers no face (hers or anyone else's), keeps 4 pixels
// clear of anyone else's head beside it, and has nobody else's head under or beside it nearer its tail than theirs (a
// pixel of drop counting as two across), where it would read as that someone's; failing that, the same, level with
// their head, beside it, as the arena has it; failing that, clear of her face at least.
/** How far above someone's feet the top of their head is (a head is 16 rows): on the bench, on the grass, and on their
 *  feet (standing, or making a point). */
const HEAD_TOP = { sit: 38, floor: 31 };
const headOf = (q) => {
  const x = Math.round(q.x), y = Math.round(q.y) - (HEAD_TOP[q.gait] ?? 46);
  return { x, x0: x - 8, x1: x + 8, y0: y, y1: y + 16 };
};
/** The bubble's box about x with its top at y, the tail and its bob included (talk.js drawBubble). */
const boxAt = (x, y) => ({ x0: x - 5, x1: x + 6, y0: y, y1: y + 13 });
const overlap = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
/** Where the A over p goes, in world pixels (its middle and its top), with her feet at me, t seconds in. */
function bubbleAt(p, me, t) {
  const her = headOf({ x: me.x, y: me.y }), others = after(t).filter((q) => q.id !== p.id).map(headOf);
  const mine = headOf(p), away = me.x > p.x ? -1 : 1, top = p.y - p.bubble;
  /** How near a head is to the tail of a bubble at x with box b. */
  const near = (h, x, b) => Math.abs(x - h.x) + 2 * Math.max(0, h.y0 - b.y1);
  const clear = (x, y) => {
    const b = boxAt(x, y), own = near(mine, x, b);
    // Beside their head (the lower spot), not over their face either. (Beside hers is fine: it's never her own A.)
    if (overlap(b, her) || (y !== top && overlap(b, mine))) return false;
    // Nobody else's head within 4 pixels either side of it either: a bubble right beside a head, level with it, reads
    // as that head's.
    const wide = { ...b, x0: b.x0 - 4, x1: b.x1 + 4 };
    return others.every((h) => !overlap(wide, h) && (h.y0 < y - 8 || h.y0 > b.y1 + 24 || near(h, x, b) > own));
  };
  for (const y of [top, top + 8]) {
    for (let d = 3; d <= 18; d++) for (const side of [away, -away]) if (clear(p.x + side * d, y)) return [p.x + side * d, y];
  }
  return [away > 0 ? Math.max(p.x + 3, her.x1 + 5) : Math.min(p.x - 3, her.x0 - 6), top];
}

// Who she can talk to. The phone shows the face of whoever's talking, and stage.js takes it from the person's look; a
// page with someone else's name on it (Owen chiming in on Tessa's) shows that someone's face instead.
const LOOK_OF = Object.fromEntries(Object.values(CAST).filter((c) => c.name).map((c) => [c.name, c.look]));
const PEOPLE = TALKERS.map((p) => ({
  ...p,
  lines: LINES[p.id],
  get look() {
    const d = window.stage?.talk, page = d?.person === this && d.pages[d.page];
    return (page && !Array.isArray(page) && LOOK_OF[page.name]) || p.look;
  },
}));

runScene({
  name: 'TEAM MEETING',
  label: "The back lawn of the school on a sunny afternoon: the wall with the robotics shop's door open, the path and the grass, the team standing and sitting about in red merch after their meeting, and the strategist you're steering among them; the view follows her",
  hint: 'Drag the stick, tap A by someone to talk',
  note: 'Push the stick a little to walk, all the way to run; the view follows her across the lawn. Stand by anyone with an A over them and press A to talk: eleven of the team have something to say. In the cut scene, A reads on and SKIP jumps to the end. On a keyboard: arrow keys or WASD, Shift to run, Space or Enter for A, Esc to skip.',
  world: WORLD,
  start: START,
  cutscene,
  people: PEOPLE,

  setup(s) {
    // The backdrop's layers are baked the first time it's drawn, and everyone's frames are made the first time they're
    // drawn: bake now, and make the cut scene's first second of people, rather than hold up its first frame.
    // (s.ahead() in the console says how far making frames ahead has got.)
    const c = Object.assign(document.createElement('canvas'), { width: 1, height: 1 });
    drawBackdrop(c.getContext('2d'), { x: 0, y: 0 }, 0);
    if (!new URLSearchParams(location.search).has('play')) makeUpTo(1);
    s.ahead = () => `${ahead} of ${AHEAD.length} frames made ahead`;
    [s.me.x, s.me.y] = unstuck(s.me.x, s.me.y);
  },
  onFree(s) {
    s.freeAt = performance.now() / 1000;
    [s.me.x, s.me.y] = unstuck(s.me.x, s.me.y);
  },

  // Like the arena's: a step across, then a step down, each refused if it lands somewhere blocked (the wall, the trunks,
  // the bench, the easel, the table, the bags, the world's edge) or in someone. Should she be somewhere blocked (the
  // address bar can start her anywhere), her first step puts her on the nearest free spot straight down or up instead.
  move(x, y, dx, dy) {
    if (hit(x, y)) return unstuck(x, y);
    const nx = hit(x + dx, y) ? x : x + dx;
    return [nx, hit(nx, y + dy) ? y : y + dy];
  },
  // Who's in reach: the closest by people.js within(), which counts wherever walking up to someone stops her, from any
  // side (stage.js's own rule, 14 across and 10 deep, doesn't fit where occupied() stops her, further off in front of
  // anyone sitting, so as not to hide their face).
  reach(s) {
    let best = null, bestD = Infinity;
    for (const p of PEOPLE) {
      const d = within(p, s.me.x, s.me.y);
      if (d < bestD) [best, bestD] = [p, d];
    }
    return best;
  },
  // Turn to the middle of someone seated: on the bench, their body is behind their feet; on the grass, their lap.
  faceTo: (p) => (p.gait === 'sit' ? { x: p.x, y: p.y - 10 } : p.gait === 'floor' ? { x: p.x, y: p.y - 2 } : p),
  camera: follow,
  // The A goes over their own head (bubbleAt()); not while the lawn is still fading in (stage.js draws it after draw(),
  // over the fade).
  prompt(g, view, p, t) {
    const s = window.stage;
    if (s.freeAt != null && t < s.freeAt + FADE) return;
    const [x, y] = bubbleAt(p, s.me, t);
    drawBubble(g, x - view.x, y - view.y, t);
  },

  draw(g, view, t, s) {
    drawBackdrop(g, view, t);
    const me = s.me, her = [{ x0: me.x - 8, x1: me.x + 8, y0: me.y - 48, y1: me.y }];
    standing(g, view, things(t, { who: her }), after(t, { me, talking: s.talk?.person?.id }), [s.player]);
    if (s.freeAt != null) cover(1 - seg(t, s.freeAt, s.freeAt + FADE));
  },
});
