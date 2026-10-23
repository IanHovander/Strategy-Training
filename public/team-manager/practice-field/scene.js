// The practice field, put together: the school cafeteria after school, with half a 2019 field that team 5026 has built
// from plywood on taped-down carpet, the late sun streaming in through the tall windows, the robot running timed hatch
// cycles and the team at practice round it. The parts each have a module of their own in this folder, and this one ties
// them into one picture and one runScene():
//   layout.js     the room in numbers: the wall, the windows and the sun, the field, the robot's run, where everyone is
//   room.js       the back wall and its windows, the tiles, the sun's patches on the floor and its shafts in the air,
//                 the cafeteria's furniture: folded tables, the serving line, vending machines, the two tables in use,
//                 and the end wall on the right with the side doors out to the parking lot
//   halffield.js  the carpet and its tape, the plywood rocket, cargo ship, HAB and loading station, the homemade driver
//                 station, and the team's gear: the battery cart, the hatch rack, the cargo basket, the tool chest, the
//                 rolling whiteboard
//   robot.js      5026's elevator robot running its cycles, level 2 then level 3, as a pure function of its own clock
//   people.js     everyone, on the walker rig in cast.js looks, and the ten she can talk to
//   words.js      what they say, the place card, and the text for the page
//   cutscene.js   the sun, the light down onto the field, a timed cycle, the hooray, the custodian, and her coming in
//
// The room is drawn the way the arena is (walk.html, field.js): the floor once into a canvas, then everything that stands
// up sorted back to front by its floor line, people and the robot included, then the light in the air over the top. The
// floor canvas is the wall, the tiles, the carpet and then the sun's patches, which relight whatever is under them, tiles,
// carpet and tape alike. The cut scene and walking both draw through world.draw(), so the room is the same picture
// either way; the cut scene's close-ups draw it at 1:1 into a small canvas and blow that up (cutscene.js zoomShot).
//
// Walking: she has the floor round the field (the back strip behind it, the front strip before it, and both ends), but
// not the carpet, which the robot is always running on; the furniture, the gear and everyone else stop her too. A push
// along with someone standing just ahead, while she's a little in front of them, curves her on round in front of them,
// so holding right from her mark walks her down round Kai and on along the lane in front of the field by herself; a
// push up and right that the carpet holds up takes her round them too. Level with someone she stops beside them, to
// talk.
// The way in and out, as everywhere in the game, is left to right: the cut scene brings her in through the hallway
// doors at the left-hand end of the back wall and round to her mark (if it's skipped before it shows her, she walks in
// from the left along the same lane instead, stage.js enter), and she leaves through the side doors in the end wall on
// the right, out to the parking lot (stage.js exit: once her feet are in the doorway she walks on out and the screen
// fades; on this page she comes back in at her mark, the room carrying on as it was). Pushing right anywhere along the
// end wall, above the doors or below them, turns her into the doorway.
// The camera follows her as stage.js's does, but no lower than ROOM.shown, so the windows stay in sight, unless she walks
// out toward the front of the room, when it keeps a strip of floor under her feet so she never walks along the bottom
// edge; while she talks to someone at the front of the room it eases down over the tiles below that, so both faces
// clear the dialog box. On a 16:9 screen, where the stick's ring is over the picture's bottom right corner, it goes down
// a little as she comes to the end wall, where that lifts the side doors clear above the ring (ringLift).
// The robot and the room's clock carry on from the cut scene into walking without a jump: stage.js gives walking the
// page's own clock, so the scene keeps the difference between that and the cut scene's last frame and adds it.

import { W, H, useContext, camera, screen, clamp, lerp, seg, easeInOut } from '../pixel.js';
import { drawWithShadow, dirToward } from '../stage.js';
import { drawBubble, conversation } from '../talk.js';
import { HERO_LOOK } from '../walker.js';
import { ROOM, FLOOR, SPOTS, START, STATION_WALL, CARPET, END_WALL, SIDE_DOOR } from './layout.js';
import { drawWall, drawTiles, drawSunPatches, drawEndWall, roomThings, drawSunAir, ROOM_BLOCKS } from './room.js';
import { drawFieldFloor, fieldThings, FIELD_BLOCKS } from './halffield.js';
import { robotAt, robotThing } from './robot.js';
import { LOOKS, PEOPLE, peopleThings, peopleBlocks } from './people.js';
import { SCENE_TEXT, LINES, EXIT_LABEL } from './words.js';
import { makeCutscene, zoomShot, HANDOFF } from './cutscene.js';

// ---- The floor canvas, drawn once ----
// The sun's patches read the pixels back to relight them, so the canvas is made for reading. The end wall goes in
// last, out of the sun's way.
const BACKDROP = document.createElement('canvas');
BACKDROP.width = ROOM.w;
BACKDROP.height = ROOM.h;
{
  const ctx = BACKDROP.getContext('2d', { willReadFrequently: true });
  drawWall(ctx);
  drawTiles(ctx);
  drawFieldFloor(ctx);
  drawSunPatches(ctx);
  drawEndWall(ctx);
}

// ---- The room, from any view ----
/**
 * The cafeteria seen from view { x, y } (and w, h when it isn't the whole screen, as in a close-up's small canvas) at
 * world time t. o, all optional: robotU (the robot's clock; left out, it runs on t), enabled (false before GO) and blink
 * (the clock its signal light blinks on, when that isn't robotU), cast
 * (people moved, turned or re-posed: { id: { x, y, dir, gait, dist, lift } }), hero (the strategist in the cut scene:
 * { x, y, dir, gait, dist }), door (0-1, the hallway doors open), player (stage.js's s.player while walking) and who
 * (anyone walking behind the rocket, { x0, x1, y1 }, so it goes see-through).
 */
function draw(g, view, t, o = {}) {
  useContext(g);
  screen();
  g.globalAlpha = 1;
  g.drawImage(BACKDROP, -view.x, -view.y);
  const robot = o.robotU != null ? robotAt(o.robotU, o.enabled ?? true, o.blink) : robotAt(t);
  const vx0 = view.x - 24, vx1 = view.x + (view.w ?? 256) + 24;
  const things = [
    ...roomThings(g, view, t, o),
    ...fieldThings(g, view, t, { ...o, fill: robot.fill }),
    ...peopleThings(g, view, t, { ...o, robot }).filter((p) => p.x > vx0 && p.x < vx1),
    robotThing(robot),
  ];
  if (o.hero) things.push({ y: o.hero.y, draw: () => drawWithShadow(g, view, { ...o.hero, look: HERO_LOOK }) });
  if (o.player) things.push(o.player);
  things.sort((a, b) => a.y - b.y);
  for (const th of things) {
    useContext(g);
    camera(view.x, view.y, 1);
    th.draw();
  }
  drawSunAir(g, view, t);
  useContext(g);
  screen();
}

/** The world for the cut scene: the room at 1:1, a close-up of it, and everyone's look for the phone. */
const world = {
  looks: LOOKS,
  draw,
  shot: (g, x, y, zoom, t, o) => zoomShot(g, x, y, zoom, (bg, v) => draw(bg, v, t, o)),
};
const cutscene = makeCutscene(world);
/** The cut scene's clock at its last frame (stage.js counts each beat at its length). */
const CUT_END = cutscene.reduce((n, b) => n + b.dur, 0);

// ---- Walking ----
// The floor, short of the walls; then the furniture, the gear, the carpet and everyone standing, each footprint widened
// by 4 pixels along and 2 of depth so her shadow never touches them.
const THINGS = [...ROOM_BLOCKS, ...FIELD_BLOCKS], WHO = peopleBlocks(), STOPS = [...THINGS, ...WHO];
const hits = (x, y) => (b) => x > b.x0 - 4 && x < b.x1 + 4 && y > b.y0 - 2 && y < b.y1 + 2;
const blocked = (x, y) => STOPS.some(hits(x, y));
/** Going down the screen covers more ground than going across, as in stage.js: the floor recedes. */
const DEPTH = 0.8;
/** The side doors' floor band, where the floor runs on out through the wall: the rows the walk outside shows in, from
 *  the one under the wall behind the doors to the one over the wall in front (room.js drawEndWall: that wall's cut top
 *  starts END_WALL.h above its floor line), less 2 pixels each side, move()'s margins. So her feet are always on the
 *  walk as she goes out, and the wall in front never hides her shoes. */
const DOOR_Y = { y0: SIDE_DOOR.y0 + 2, y1: SIDE_DOOR.y1 - END_WALL.h - 2 };
const inDoorway = (y) => y >= DOOR_Y.y0 && y <= DOOR_Y.y1;
/** The way out (stage.js): her feet in the doorway's mouth, just short of the threshold. The arrow goes over her head
 *  (the walker's hair tops out 47 pixels above her feet, and her feet are never higher than DOOR_Y.y0 in the band), so
 *  it's never over her face as she comes to the doors, and it's up the screen, clear of the stick's ring in the bottom
 *  right on a screen with no room beside the picture; its label, over it, sits on the vending machines' fronts, clear
 *  of the custodian's cart and its mop. The doorway's own EXIT sign is just under the arrow, over the opening on its
 *  post (room.js). The label is only there while the arrow is: stage.js draws it right-aligned to the arrow, so with
 *  the arrow still off the right of the picture it would show cut off at the edge ('TO TH'). */
const EXIT = {
  x: END_WALL.x0 - 4, ...DOOR_Y, sign: { y: DOOR_Y.y0 - 54 },
  get label() {
    const view = window.stage?.view;
    return !view || EXIT.x - view.x <= W - 1 ? EXIT_LABEL : '';
  },
};
/** Going round someone: how far ahead along she starts to (LOOK), how far down the room she'll go to get round
 *  (ROUND), and, at the end wall, how far out from it she starts to turn for the doors (WALL_LOOK). */
const LOOK = 12, ROUND = 20, WALL_LOOK = 24;
/** Everyone on their feet (the drive team at their controls too), for roundFront. */
const STANDING = Object.values(SPOTS).filter((p) => p.gait !== 'sit');
/** How far she can go along row y from x, s the way (1 right, -1 left), before a footprint stops her (with move()'s
 *  margins), and which footprint: { room, b }, room Infinity and b null if nothing does. */
function ahead(x, y, s) {
  let room = Infinity, b = null;
  for (const o of STOPS) {
    if (!(y > o.y0 - 2 && y < o.y1 + 2)) continue;
    const edge = s > 0 ? o.x0 - 4 - x : x - o.x1 - 4;
    if (edge >= 0 && edge < room) [room, b] = [edge, o];
  }
  return { room, b };
}
/** A push along (s the way, v the step) with someone standing in the way, right there or within LOOK pixels: the way
 *  round in front of them (further down the room). She looks for the nearest row in front, at most ROUND down, that's
 *  clear until she's past them, with nothing in her way going straight down to it, and heads for the corner of their
 *  footprint on it: straight down while she's beside it, and then on a slant, so she curves round them rather than
 *  stopping and sliding down sideways. front: only if she's a little in front of their feet already, as for a straight
 *  push, so level with someone she still stops beside them, where she talks to them. { n: [x, y], face, far }: the step,
 *  the way she faces taking it (toward the corner), and the x where she's past them; null if there's no way round. */
function roundFront(x, y, s, v, front) {
  const { room, b } = ahead(x, y, s);
  if (room > LOOK || !WHO.includes(b)) return null;
  const ax = x + s * room;
  const p = STANDING.find((q) => Math.abs(ax - q.x) < 20 && Math.abs(y - q.y) < 20 && (!front || y > q.y + 3));
  if (!p) return null;
  const far = s > 0 ? Math.max(b.x1, p.x + 14) + 4 : Math.min(b.x0, p.x - 14) - 4;
  for (let d = 1; d <= ROUND; d++) {
    const ly = y + d;
    if (ly > FLOOR.y1 || blocked(x, ly)) return null;
    if (ahead(x, ly, s).room < Math.abs(far - x)) continue;
    // The corner: as far along as every row between lets her go.
    let gap = Infinity;
    for (let i = 0; i < d; i++) gap = Math.min(gap, ahead(x, y + i, s).room);
    const cx = x + s * Math.min(gap, Math.abs(far - x));
    const len = Math.hypot(cx - x, d / DEPTH), k = Math.min(1, v / len);
    let n = [x + (cx - x) * k, y + d * k];
    if (blocked(...n)) n = [x, y + Math.min(v * DEPTH, d)];
    if (blocked(...n)) return null;
    const faceX = s * Math.min(ahead(x, ly - 1, s).room, Math.abs(far - x));
    return { n, face: dirToward(faceX, d / DEPTH), far };
  }
  return null;
}
/** A straight push right along the end wall, above or below the side doors: she turns for the doorway as she comes
 *  within WALL_LOOK pixels of the wall (or as close to the wall as she is to the doorway's band, if that's nearer), on
 *  a slant to where the band meets the wall, and from there walks on out; already at the wall, she walks along it to
 *  the doors. So holding right anywhere at this end of the room always takes her out. Null if she's not near the wall,
 *  or something's in the way. */
function toDoors(x, y, v) {
  if (inDoorway(y)) return null;
  const to = y < DOOR_Y.y0 ? DOOR_Y.y0 : DOOR_Y.y1, d = to - y, gap = FLOOR.x1 - x;
  if (gap < 0 || gap > Math.min(WALL_LOOK, Math.abs(d) / DEPTH)) return null;
  for (let i = 1; i < Math.abs(d); i++) if (blocked(FLOOR.x1, y + Math.sign(d) * i)) return null;
  const len = Math.hypot(gap, d / DEPTH), k = Math.min(1, v / len), n = [x + gap * k, y + d * k];
  return blocked(...n) ? null : { n, face: dirToward(gap, d / DEPTH) };
}
/** She takes a step move() has steered, facing the way it goes (stage.js turns her back to the stick next step). */
function steer(r) {
  const me = window.stage?.me;
  if (me) me.dir = r.face;
  return r.n;
}
/** A diagonal push that someone standing turned into a walk round them ({ push, far, at }): until she's past them (far),
 *  she carries on as a straight push along, the push's up or down left out, so it doesn't lift her back into the corner
 *  she's going round. Only while that same push is held: it ends if the push turns or lets go (no step for a moment). */
let rounding = null;
const pushOf = (dx, dy) => `${Math.abs(dx) < 0.01 ? 0 : Math.sign(dx)},${Math.abs(dy) < 0.01 ? 0 : Math.sign(dy)}`;

/** A step along, then across, as field.js does: each half refused if it would end in something. On the right she stops
 *  short of the end wall, except in the doorway, where she can walk on into it, and not out of the band once she's
 *  past where she'd stop. Going round people and to the doors:
 *  - A straight push along (as the keyboard and the stick give) with someone standing just ahead, while she's in front
 *    of them, takes her round in front of them (roundFront): holding right from her mark walks her down round Kai and
 *    on along the lane in front of the field past Noor.
 *  - A straight push right near the end wall, above or below the doors, turns her into the doorway (toDoors).
 *  - A diagonal push held up across by the carpet or by someone, with someone standing just ahead along, takes her
 *    round in front of them too, and on past them (rounding): pushing up and right toward the doors from her mark, she
 *    goes round Kai and Noor rather than stopping against them.
 *  A step that goes nowhere because the carpet is in the way may bring Kai over (keepOff). */
function move(x, y, dx, dy) {
  const s = Math.abs(dx) < 0.01 ? 0 : Math.sign(dx), v = Math.hypot(dx, dy / DEPTH), push = [dx, dy];
  const now = performance.now() / 1000, key = pushOf(dx, dy);
  if (rounding && (key !== rounding.push || now - rounding.at > 0.2 || s * (x - rounding.far) >= 0)) rounding = null;
  if (rounding) {
    rounding.at = now;
    [dx, dy] = [s * v, 0];
  }
  const along = Math.abs(dy) < 0.01 && s !== 0;
  if (along) {
    const r = (s > 0 && toDoors(x, y, v)) || roundFront(x, y, s, v, !rounding);
    if (r) return steer(r);
  }
  let nx = clamp(x + dx, FLOOR.x0, inDoorway(y) ? ROOM.w + 40 : FLOOR.x1);
  if (blocked(nx, y)) nx = x;
  let ny = clamp(y + dy, FLOOR.y0, FLOOR.y1);
  if (blocked(nx, ny) || (nx > FLOOR.x1 && !inDoorway(ny))) ny = y;
  if (rounding) {
    // Nowhere to go along: let the push have its way again. Otherwise she faces the way she's going, along.
    if (nx === x && ny === y) {
      rounding = null;
      return move(x, y, ...push);
    }
    return steer({ n: [nx, ny], face: dirToward(s, 0) });
  }
  if (!along && s !== 0 && ny === y && (onCarpet(nx, y + dy) || WHO.some(hits(nx, y + dy)))) {
    const r = roundFront(x, y, s, v, false);
    if (r) {
      rounding = { push: key, far: r.far, at: now };
      return steer(r);
    }
  }
  keepOff(x, y, nx === x && ny === y && (onCarpet(x + dx, y) || onCarpet(x, y + dy)));
  return [nx, ny];
}

// ---- Kai keeps her off the carpet ----
// Walking about, the carpet stops her like a wall, as the robot is always running on it. So that a player pushing at it
// knows why, if she keeps pushing into it, stuck, for KEEP_OFF.after seconds within KEEP_OFF.near pixels of Kai, he
// tells her without being asked: his first page, in the usual box. Once a visit: not again until she's been further
// off than that (or if she's already talked to him).
const KEEP_OFF = { after: 0.4, near: 60 };
/** The carpet's footprint, the station wall's with it, as halffield.js's FIELD_BLOCKS has it, with move()'s margins. */
const onCarpet = (x, y) => x > STATION_WALL.x0 - 4 && x < CARPET.x1 + 4 && y > CARPET.y0 - 2 && y < CARPET.y1 + 2;
const pushing = { since: null, last: -1, told: false };
function keepOff(x, y, stuck) {
  const s = window.stage, now = performance.now() / 1000, kai = SPOTS.kai;
  const near = Math.hypot(x - kai.x, y - kai.y) <= KEEP_OFF.near;
  if (!near) pushing.told = false;
  if (!stuck) return void (pushing.since = null);
  if (pushing.since == null || now - pushing.last > 0.15) pushing.since = now;
  pushing.last = now;
  if (pushing.told || !near || s.talk || now - pushing.since < KEEP_OFF.after) return;
  pushing.told = true;
  const person = people.find((p) => p.id === 'kai'), at = faceTo(person);
  s.talk = conversation(person.name, person.lines.slice(0, 1), now, { person });
  s.near = null;
  s.me.dir = dirToward(at.x - x, (at.y - y) / 0.8);
}

/** The nearest point to (x, y) she can stand on, within 24 pixels (null if there's none). */
function standable(x, y) {
  let best = null, bestD = Infinity;
  for (let dy = -24; dy <= 24; dy++) {
    for (let dx = -24; dx <= 24; dx++) {
      const px = Math.round(x) + dx, py = Math.round(y) + dy, d = dx * dx + dy * dy;
      if (d >= bestD || px < FLOOR.x0 || px > FLOOR.x1 || py < FLOOR.y0 || py > FLOOR.y1 || blocked(px, py)) continue;
      [best, bestD] = [{ x: dx || dy ? px : x, y: dx || dy ? py : y }, d];
    }
  }
  return best;
}

const people = PEOPLE.map((p) => ({ ...p, lines: LINES[p.id] }));
// She turns to the person, not to where she stands to talk to them: along the table to Theo. Kai's face is a little
// up the room from her when she's beside him in front of the carpet, which rounds to turning her back on him, so she
// turns to a point level with her instead and faces him in profile.
const faceTo = (p) => (p.id === 'kai' ? { x: SPOTS.kai.x, y: SPOTS.kai.y + 4 } : SPOTS[p.id]);
/** Who's in reach: the closest she's near, from where she talks to them (Theo beside his table), the drive team from
 *  further off along the room, since she comes at them from the floor beside the station, Kai from a little further
 *  off across it, and the ones she can walk right past only from beside them (people.js PEOPLE: reach, reachY, apart).
 *  Ines only from the drive team's side of the station wall: from the back strip beyond it, with the robot parked at
 *  the loading station, the mast, the clear panels and the station itself would hide her. */
function reach(s) {
  let best = null, bestD = Infinity;
  for (const p of people) {
    if (p.id === 'ines' && s.me.x > STATION_WALL.x0) continue;
    const dx = Math.abs(p.x - s.me.x), dy = Math.abs(p.y - s.me.y);
    if (dx < (p.reach ?? 14) && dx >= (p.apart ?? 0) && dy < (p.reachY ?? 10) && dx + dy < bestD) [best, bestD] = [p, dx + dy];
  }
  return best;
}

// ---- The camera ----
/** stage.js's follow, kept above ROOM.shown, or 12 pixels below her feet if she's further forward than that, so there's
 *  always floor under her shadow. The cut scene's last beat (cutscene.js follow) frames her the same way. */
function followView(me) {
  const y = Math.round(clamp(me.y - 28 - H / 2, 0, Math.min(ROOM.h, Math.max(ROOM.shown, me.y + 12)) - H));
  const lift = ringLift(), k = lift > y ? easeInOut(seg(me.x, LIFT.x0, LIFT.x1)) : 0;
  return { x: Math.round(clamp(me.x - W / 2, 0, ROOM.w - W)), y: Math.round(lerp(y, Math.max(y, lift), k)) };
}
/** On a screen with no room beside the picture (16:9), stage.js's stick ring sits over the picture's bottom right corner,
 *  which, once she's at this end of the room, is the side doors and their mat. Where lowering the view (no further than
 *  the room goes) lifts the doors clear above the ring, followView goes down that far as she comes to the end wall,
 *  eased in with her x over the stretch where the doors come into view (LIFT), so the view is still a pure function of
 *  where she is. ringLift() is the view's y that does it, 0 where it isn't needed (the ring beside the picture, as on a
 *  long phone, or below the doors) or wouldn't help (a small 16:9 phone, where the ring is too big for the room there
 *  is): measured from the page, twice a second at most. The doors' foot is the frame along the wall in front of them. */
const LIFT = { x0: END_WALL.x0 - 128, x1: END_WALL.x0 - 68, foot: SIDE_DOOR.y1 - END_WALL.h + 2, left: END_WALL.x0 - 28 };
const ring = { at: -Infinity, lift: 0 };
function ringLift() {
  const now = performance.now();
  if (now - ring.at < 500) return ring.lift;
  Object.assign(ring, { at: now, lift: 0 });
  const c = document.querySelector('.full .screen')?.getBoundingClientRect();
  const r = document.querySelector('.full .stick .ring')?.getBoundingClientRect();
  if (!c?.width || !r?.width) return 0;
  const k = W / c.width, left = (r.left - c.left) * k, right = (r.right - c.left) * k, top = (r.top - c.top) * k;
  if (right <= LIFT.left - (ROOM.w - W) || left >= W) return 0;
  const y = Math.ceil(LIFT.foot + 1 - top);
  return (ring.lift = y <= ROOM.h - H ? y : 0);
}
/** Talking, low enough that her face and theirs (about 34 pixels above their feet) sit above the dialog box and its
 *  name tag; for someone sitting at a table, whose face is lower, as low as the room goes, so the name tag clears it. */
function talkY(s, y) {
  const p = s.talk.person, spot = SPOTS[p.id] ?? p, feet = Math.max(s.me.y, spot.y);
  return Math.round(clamp(feet - (spot.gait === 'sit' ? 108 : 112), y, ROOM.h - H));
}
/** An eased pan of half a second whenever a conversation starts or ends; otherwise straight from followView. When the
 *  cut scene hands over a few pixels above the walking view (settle), the camera stays where it ended until she first
 *  moves or talks, and only then eases on, so it never goes down by itself. While she walks in by herself (ENTER, after
 *  a SKIP), it waits at the view from her mark, so she walks into the picture from its left edge. */
const pan = { talking: false, from: 0, t0: -1, y: null, settle: false };
function viewFor(s) {
  if (s.mode === 'auto' && !s.auto.out) {
    const [x, y] = s.auto.path.at(-1);
    return followView({ x, y });
  }
  const now = performance.now() / 1000, view = followView(s.me);
  if (pan.settle) {
    if (s.me.gait === 'stand' && !s.talk) return { x: view.x, y: pan.y };
    Object.assign(pan, { settle: false, from: pan.y, t0: now });
  }
  const to = s.talk ? talkY(s, view.y) : view.y;
  if (!!s.talk !== pan.talking) Object.assign(pan, { talking: !!s.talk, from: pan.y ?? view.y, t0: now });
  pan.y = Math.round(lerp(pan.from, to, easeInOut(seg(now, pan.t0, pan.t0 + 0.5))));
  return { x: view.x, y: pan.y };
}

/** Whoever she's talking to turns to face her, if they're on their feet. */
function turned(s) {
  const p = s.talk?.person, spot = p && SPOTS[p.id];
  if (!spot || spot.gait === 'sit') return undefined;
  return { [p.id]: { dir: dirToward(s.me.x - spot.x, (s.me.y - spot.y) / 0.8) } };
}

let shift = 0; // walking's world time is the page's clock plus this
let robotFrom = null; // and the robot's clock is world time plus this, once the cut scene has handed over
let freeAt = null; // when it did, on the page's clock
let outAt = null; // when her last walk out through the side doors ends, on the page's clock (stage.js leave)

/** Her walk in after a SKIP that came before the cut scene showed her at her mark (or with ?play): along the lane her
 *  run in the cut scene ends on, from just off the left of the view from her mark, which the camera holds while she
 *  walks in (viewFor). stage.js adds START as the last point. */
const ENTER = [[START.x - 138, START.y]];

export const scene = {
  ...SCENE_TEXT,
  world: { w: ROOM.w, h: ROOM.h },
  start: START,
  cutscene,
  move,
  exit: EXIT,
  // Only when the cut scene's last beat never drew her (SKIP before it, or ?play): otherwise the cut scene has already
  // brought her in to her mark.
  get enter() {
    return HANDOFF.hero ? null : ENTER;
  },
  people,
  reach,
  faceTo,
  // Once she's talked to Kai, he doesn't come over to tell her again (keepOff).
  onTalk(s, p) {
    if (p.id === 'kai') pushing.told = true;
  },
  camera: viewFor,
  // The bubble beside their head, on the side away from her, so it's never over her own. Ms. Okafor's left is the
  // student who resets the field, behind her and off to that side, so hers sits over her head instead, a little to the
  // right: clear of his head, and of the strategist's when she talks to her from the right.
  prompt(g, view, p, t) {
    const spot = SPOTS[p.id], side = window.stage.me.x > spot.x ? -1 : 1, y = spot.y - view.y - (spot.gait === 'sit' ? 41 : 50);
    if (p.id === 'okafor') drawBubble(g, spot.x - view.x + 6, y - 11, t);
    else drawBubble(g, spot.x - view.x + side * 11, y, t);
  },
  onFree(s) {
    const now = performance.now() / 1000;
    // Back in at her mark after walking out through the side doors (on this page; in the game the next scene starts
    // instead): stage.js has put her there (or at the start of ENTER, to walk in). The room, the robot and Kai carry on
    // as they were, and the camera starts from the walking view.
    if (freeAt != null && outAt != null && Math.abs(now - outAt) < 0.25) {
      const y = followView(s.me).y;
      Object.assign(pan, { talking: false, from: y, t0: now, y, settle: false });
      return;
    }
    const end = CUT_END + HANDOFF.late; // the cut scene's clock in its last frame
    shift = end - now;
    robotFrom = HANDOFF.robotU - end;
    freeAt = now;
    // The cut scene never drew her at her mark (SKIP before its last beat, ?play, or ?x= in the address): there's no
    // camera to carry on from, so it starts from the walking view where she is (her mark, if she's walking in to it).
    if (!HANDOFF.hero) {
      const y = followView(s.me).y;
      Object.assign(pan, { talking: false, from: y, t0: now, y, settle: false });
      return;
    }
    // If A ended the last beat while she was still running to her mark, walking starts from where she was, not from her
    // mark (stage.js has just put her there), or from the nearest floor she can stand on, if that was in the doorway or
    // by someone she runs past.
    const at = HANDOFF.hero && standable(HANDOFF.hero.x, HANDOFF.hero.y);
    if (at) Object.assign(s.me, at, { dir: HANDOFF.hero.dir, gait: 'stand', dist: 0 });
    // The camera ends the cut scene a little above the walkable view, and stays there until she moves (viewFor); or
    // below it, if A ended the last beat before it was back up from her answer, and then walking eases it straight on
    // up, the way it was going.
    const y = HANDOFF.viewY;
    Object.assign(pan, { talking: false, from: y, t0: now, y, settle: y < followView(s.me).y });
  },
  draw(g, view, t, s) {
    const T = t + shift, a = s.auto;
    if (s.mode === 'auto' && a.out) outAt = a.t0 + a.dur + a.hold;
    draw(g, view, T, {
      player: s.player,
      who: [{ x0: s.me.x - 5, x1: s.me.x + 5, y1: s.me.y }], // her body's width, so the rocket is solid once she's clear
      // Kai finishes his step over to his place, if A ended the cut scene before he was there.
      cast: { ...(freeAt != null && { kai: HANDOFF.kai(t - freeAt) }), ...turned(s) },
      ...(robotFrom != null && { robotU: robotFrom + T, enabled: true }),
    });
  },
};
