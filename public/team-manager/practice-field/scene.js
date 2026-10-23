// The practice field, put together: the school cafeteria after school, with half a 2019 field that team 5026 has built
// from plywood on taped-down carpet, the late sun streaming in through the tall windows, the robot running timed hatch
// cycles and the team at practice round it. The parts each have a module of their own in this folder, and this one ties
// them into one picture and one runScene():
//   layout.js     the room in numbers: the wall, the windows and the sun, the field, the robot's run, where everyone is
//   room.js       the back wall and its windows, the tiles, the sun's patches on the floor and its shafts in the air,
//                 and the cafeteria's furniture: folded tables, the serving line, vending machines, the two tables in use
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
// not the carpet, which the robot is always running on; the furniture, the gear and everyone else stop her too.
// The camera follows her as stage.js's does, but no lower than ROOM.shown, so the windows stay in sight, unless she walks
// out toward the front of the room, when it keeps a strip of floor under her feet so she never walks along the bottom
// edge; while she talks to someone at the front of the room it eases down over the tiles below that, so both faces
// clear the dialog box.
// The robot and the room's clock carry on from the cut scene into walking without a jump: stage.js gives walking the
// page's own clock, so the scene keeps the difference between that and the cut scene's last frame and adds it.

import { W, H, useContext, camera, screen, clamp, lerp, seg, easeInOut } from '../pixel.js';
import { runScene, drawWithShadow, dirToward } from '../stage.js';
import { drawBubble, conversation } from '../talk.js';
import { HERO_LOOK } from '../walker.js';
import { ROOM, FLOOR, SPOTS, START, STATION_WALL, CARPET } from './layout.js';
import { drawWall, drawTiles, drawSunPatches, roomThings, drawSunAir, ROOM_BLOCKS } from './room.js';
import { drawFieldFloor, fieldThings, FIELD_BLOCKS } from './halffield.js';
import { robotAt, robotThing } from './robot.js';
import { LOOKS, PEOPLE, peopleThings, peopleBlocks } from './people.js';
import { SCENE_TEXT, LINES } from './words.js';
import { makeCutscene, zoomShot, HANDOFF } from './cutscene.js';

// ---- The floor canvas, drawn once ----
// The sun's patches read the pixels back to relight them, so the canvas is made for reading.
const BACKDROP = document.createElement('canvas');
BACKDROP.width = ROOM.w;
BACKDROP.height = ROOM.h;
{
  const ctx = BACKDROP.getContext('2d', { willReadFrequently: true });
  drawWall(ctx);
  drawTiles(ctx);
  drawFieldFloor(ctx);
  drawSunPatches(ctx);
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
const STOPS = [...ROOM_BLOCKS, ...FIELD_BLOCKS, ...peopleBlocks()];
const blocked = (x, y) => STOPS.some((b) => x > b.x0 - 4 && x < b.x1 + 4 && y > b.y0 - 2 && y < b.y1 + 2);
/** A step along, then across, as field.js does: each half refused if it would end in something. A step that goes
 *  nowhere because the carpet is in the way may bring Kai over (keepOff). */
function move(x, y, dx, dy) {
  let nx = clamp(x + dx, FLOOR.x0, FLOOR.x1);
  if (blocked(nx, y)) nx = x;
  let ny = clamp(y + dy, FLOOR.y0, FLOOR.y1);
  if (blocked(nx, ny)) ny = y;
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
const followView = (me) => ({
  x: Math.round(clamp(me.x - W / 2, 0, ROOM.w - W)),
  y: Math.round(clamp(me.y - 28 - H / 2, 0, Math.min(ROOM.h, Math.max(ROOM.shown, me.y + 12)) - H)),
});
/** Talking, low enough that her face and theirs (about 34 pixels above their feet) sit above the dialog box and its
 *  name tag; for someone sitting at a table, whose face is lower, as low as the room goes, so the name tag clears it. */
function talkY(s, y) {
  const p = s.talk.person, spot = SPOTS[p.id] ?? p, feet = Math.max(s.me.y, spot.y);
  return Math.round(clamp(feet - (spot.gait === 'sit' ? 108 : 112), y, ROOM.h - H));
}
/** An eased pan of half a second whenever a conversation starts or ends; otherwise straight from followView. When the
 *  cut scene hands over a few pixels above the walking view (settle), the camera stays where it ended until she first
 *  moves or talks, and only then eases on, so it never goes down by itself. */
const pan = { talking: false, from: 0, t0: -1, y: null, settle: false };
function viewFor(s) {
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

runScene({
  ...SCENE_TEXT,
  world: { w: ROOM.w, h: ROOM.h },
  start: START,
  cutscene,
  move,
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
    const now = performance.now() / 1000, end = CUT_END + HANDOFF.late; // the cut scene's clock in its last frame
    shift = end - now;
    robotFrom = HANDOFF.robotU - end;
    freeAt = now;
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
    const T = t + shift;
    draw(g, view, T, {
      player: s.player,
      who: [{ x0: s.me.x - 5, x1: s.me.x + 5, y1: s.me.y }], // her body's width, so the rocket is solid once she's clear
      // Kai finishes his step over to his place, if A ended the cut scene before he was there.
      cast: { ...(freeAt != null && { kai: HANDOFF.kai(t - freeAt) }), ...turned(s) },
      ...(robotFrom != null && { robotU: robotFrom + T, enabled: true }),
    });
  },
});
