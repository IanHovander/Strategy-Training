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
// out past that across the front of the room, when it keeps a little floor under her feet; while she talks to someone
// at the front of the room it eases down over the tiles below that, so both faces clear the dialog box.
// The robot and the room's clock carry on from the cut scene into walking without a jump: stage.js gives walking the
// page's own clock, so the scene keeps the difference between that and the cut scene's last frame and adds it.

import { W, H, useContext, camera, screen, clamp, lerp, seg, easeInOut } from '../pixel.js';
import { runScene, drawWithShadow, dirToward } from '../stage.js';
import { drawBubble } from '../talk.js';
import { HERO_LOOK } from '../walker.js';
import { ROOM, FLOOR, SPOTS, START } from './layout.js';
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
/** A step along, then across, as field.js does: each half refused if it would end in something. */
function move(x, y, dx, dy) {
  let nx = clamp(x + dx, FLOOR.x0, FLOOR.x1);
  if (blocked(nx, y)) nx = x;
  let ny = clamp(y + dy, FLOOR.y0, FLOOR.y1);
  if (blocked(nx, ny)) ny = y;
  return [nx, ny];
}

const people = PEOPLE.map((p) => ({ ...p, lines: LINES[p.id] }));
/** Who's in reach: the closest she's near, from where she talks to them (Theo beside his table), the drive team from
 *  further off along the room, since she comes at them from the floor beside the station, Kai from a little further
 *  off across it, and the ones she can walk right past only from beside them (people.js PEOPLE: reach, reachY, apart). */
function reach(s) {
  let best = null, bestD = Infinity;
  for (const p of people) {
    const dx = Math.abs(p.x - s.me.x), dy = Math.abs(p.y - s.me.y);
    if (dx < (p.reach ?? 14) && dx >= (p.apart ?? 0) && dy < (p.reachY ?? 10) && dx + dy < bestD) [best, bestD] = [p, dx + dy];
  }
  return best;
}

// ---- The camera ----
/** stage.js's follow, kept above ROOM.shown, or 4 pixels below her feet if she's further forward than that. The cut
 *  scene's last beat (cutscene.js follow) frames her the same way. */
const followView = (me) => ({
  x: Math.round(clamp(me.x - W / 2, 0, ROOM.w - W)),
  y: Math.round(clamp(me.y - 28 - H / 2, 0, Math.max(ROOM.shown, me.y + 4) - H)),
});
/** Talking, low enough that her face and theirs (about 34 pixels above their feet) sit above the dialog box and its
 *  name tag. */
function talkY(s, y) {
  const p = s.talk.person, feet = Math.max(s.me.y, (SPOTS[p.id] ?? p).y);
  return Math.round(clamp(feet - 112, y, ROOM.h - H));
}
/** An eased pan of half a second whenever a conversation starts or ends; otherwise straight from followView. */
const pan = { talking: false, from: 0, t0: -1, y: null };
function viewFor(s) {
  const now = performance.now() / 1000, view = followView(s.me);
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

runScene({
  ...SCENE_TEXT,
  world: { w: ROOM.w, h: ROOM.h },
  start: START,
  cutscene,
  move,
  people,
  reach,
  // She turns to the person, not to where she stands to talk to them: along the table to Theo.
  faceTo: (p) => SPOTS[p.id],
  camera: viewFor,
  prompt(g, view, p, t) {
    const spot = SPOTS[p.id];
    drawBubble(g, spot.x - view.x + 11, spot.y - view.y - (spot.gait === 'sit' ? 41 : 50), t);
  },
  onFree() {
    const now = performance.now() / 1000, end = CUT_END + HANDOFF.late; // the cut scene's clock in its last frame
    shift = end - now;
    robotFrom = HANDOFF.robotU - end;
    // If A ended the last beat before the camera was back up from her answer, walking eases it the rest of the way.
    Object.assign(pan, { talking: false, from: HANDOFF.viewY, t0: now, y: HANDOFF.viewY });
  },
  draw(g, view, t, s) {
    const T = t + shift;
    draw(g, view, T, {
      player: s.player,
      who: [{ x0: s.me.x - 5, x1: s.me.x + 5, y1: s.me.y }], // her body's width, so the rocket is solid once she's clear
      cast: turned(s),
      ...(robotFrom != null && { robotU: robotFrom + T, enabled: true }),
    });
  },
});
