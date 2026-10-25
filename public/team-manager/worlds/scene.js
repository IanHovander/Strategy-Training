// The World Championship, put together: the hall in Houston with its eight division fields side by side, the cut scene
// that scans along them, and the walk along the walkways and through the aisles between them. The parts each have a
// module of their own in this folder and this one ties them into one picture and one runScene():
//   layout.js    the hall in numbers: where each division starts, its teams, its match clock
//   fields.js    the eight fields, floors and stands, the arena's own (field.js, bleachers.js) laid down at each division
//   hall.js      the truss and lamps, the curtains with the divisions' signs and big screens, the barriers along their
//                hems, the end walls and their doorways, two tables
//   people.js    the crowd, the crews, the people in the aisles, and the sixteen she can talk to
//   cutscene.js  the lights, the tilt, the scan, and the two of them at Newton
//
// The way in and out, as every scene in the game has them (entered on the left, left on the right): the cut scene ends
// at Newton with her setting off along the walkway to scout and a fade to black, and the hall fades back in at its
// other end, where she comes in from the concourse through the doorway in the left wall (stage.js enter) with all eight
// divisions ahead of her and a greeter to say hello. The exploring is the walk back along the hall, past every
// division's field and the people in its aisles, to Newton's queue, where the teammate waits; the way out is on past
// Newton's red end and the info desk, through the doorway in the right wall under its EXIT sign, toward Einstein
// (stage.js exit, TO EINSTEIN), and fields.js move() lets her through the wall's face only there (the left doorway, under
// its IN sign, is the way in, not out: she stops at the wall's face). Seated scouts, parents, a coach, a pit crew member
// and a mentor in the front rows along the way put someone to talk to in reach every ten seconds or so at a run.
//
// drawWorld() is the whole hall from a view, back to front: the dark up under the roof, the floors, the stands, the
// curtains between them, then each field in view with everyone standing on it and past its ends sorted in by their feet,
// her included, and last, when the cut scene wants them, the dark over the hall while its lamps come on and the lamps'
// cones. The cut scene and walking both draw through it, so the hall is the same picture either way.
//
// Each field sorts only what it's given, and the second field in view is drawn after the first, so two people either
// side of the line between two divisions would never be sorted against each other: whoever is in the second division
// would be drawn over the other, in front or not. In every aisle there's a stretch with none of either field's own things
// in it (the scoring table and reset cart end 55 pixels short of the line, the next queue sign starts 10 past it), so
// the people and tables standing in the aisle are split at a point in that stretch that nobody stands across. Each side
// goes to one field, and nothing in one can overlap anything in the other. The hems' barriers run along the back of the
// aisle, behind everyone in it, from one division into the next: a run that crosses the point is cut there, and each
// field draws the part on its side, sorted in behind the people standing in front of it.
//
// The matches carry on from the cut scene into walking: stage.js gives walking the page's own clock, so the scene keeps
// the difference between that and the cut scene's last frame and adds it (the cut scene's own clock runs on the page's
// time too, waits for reading and A's hurrying included). Skipped (SKIP, or ?play, which never runs it), walking starts
// no earlier in the day than the cut scene would have ended. stage.js doesn't fade a scene in after its cut scene, so
// the scene does that itself over FADE seconds, while she walks in.

import { W, H, C, useContext, screen, fill, seg, withAlpha } from '../pixel.js';
import { drawWithShadow, drawPerson, cover } from '../stage.js';
import { FIELD, WALK_Y } from '../field.js';
import { HERO_LOOK } from '../walker.js';
import { WORLD, START, ENTER, EXIT, DIVISIONS, HOME, INFO_DESK, PITCH, ox, divisionAt } from './layout.js';
import { setupFields, visibleDivisions, drawFloors, drawStandsAll, drawField, move } from './fields.js';
import { drawHall, drawGateways, drawUnlit, drawBeams, PROPS, PROP_BLOCKS } from './hall.js';
import { PEOPLE, BLOCKS, lookOf, standingIn, reach, prompt, faceTo, talkingSeat, warm } from './people.js';
import { makeCutscene } from './cutscene.js';
import { approach } from '../arena/approach.js';

/**
 * Everything that stops her besides the fields' own things: everyone standing about, the two tables, the hems'
 * barriers, and each queue as one block, from the queuer's side of the arm robot on the first cart to the driver
 * stations and from the carts back to where her head is above the robots. Without it there's a dead end between the
 * second cart's drive team member and the driver stations, where she'd be all but hidden behind the robot on the cart,
 * a spot behind the first one's where the arm robot's gripper sits on her face, and a slot between the queuer and the
 * arm robot where she'd stand inside the robot.
 */
const QUEUES = DIVISIONS.map((_, k) => ({ x0: ox(k) + 46, x1: ox(k) + 130, y0: 82, y1: 112 }));
/**
 * Past Newton's red end everyone stands low on the floor, the two beyond its scoring table and the two at the info desk,
 * so on the way out she passes behind them, along the top of the aisle under the hem's barrier. There her feet keep to
 * row 77 or above (with move()'s margins: 5 across, 2 deep), two rows over the highest of their heads (the desk's
 * volunteer's, 46 rows over her feet), from a stride short of the first one's head to the desk's right end, so her
 * running legs never cross a head: walking along lower down, she slides up to that row as she comes to them, and past
 * the desk's end the way to the doorway bears down again. Below the lane down to their own footprints (BLOCKS), the
 * floor is behind them.
 */
const LOW_HEADS = { x0: ox(HOME) + 742 - 21, x1: INFO_DESK.x1 - 5, y0: 79, y1: 114, slide: 16 };
const STOPS = [...BLOCKS, ...PROP_BLOCKS, ...QUEUES, LOW_HEADS];

/**
 * At each end of a field the walkway runs on behind the alliance wall, the loading station and the drive team, all
 * standing in front of it and as tall as she is or taller, so walking by there (the last stretch before the way out, at
 * Newton's red end) she'd be all but hidden for a second. There she shows through them, as anyone on the walkway shows
 * through a rocket (field.js): drawn again over the field at 65%, the same as what's in front of her at 35%. Where
 * nothing is in front of her that changes nothing. Local x, from the corner of the field where its robots fetch from the loading station to the end of
 * the walkway past the driver station, and the blue end mirrored.
 */
const BEHIND = { x0: FIELD.x1 - 48, x1: PITCH - FIELD.x0 + 40 + 16 };
const SHOW_THROUGH = 0.65;
function behindEnd(x, y) {
  if (y > WALK_Y[1]) return false;
  const lx = x - ox(divisionAt(x));
  return (lx > BEHIND.x0 && lx < BEHIND.x1) || (lx > PITCH - BEHIND.x1 && lx < PITCH - BEHIND.x0);
}

/** How far either side of their feet someone standing is drawn (walker.js frames, and the shadow under them). */
const HALF = 9;
/**
 * Where to split the things standing in the aisle that ends at division k's field (things: { x0, x1 }, how far across
 * each is drawn): the point nearest the line between the divisions, in the stretch with neither field's own things in
 * it, that nobody stands across. If everywhere is stood across, the point fewest stand across.
 */
function splitAt(things, k) {
  const line = ox(k), lo = line - 48, hi = line + 8;
  let best = line, fewest = Infinity;
  for (let d = 0; d <= line - lo; d++) {
    for (const s of [line - d, line + d]) {
      if (s < lo || s > hi) continue;
      const across = things.reduce((n, p) => n + (p.x0 < s && s < p.x1 ? 1 : 0), 0);
      if (!across) return s;
      if (across < fewest) [best, fewest] = [s, across];
    }
  }
  return best;
}

/**
 * The hall from view { x, y } at world time t. o: lights and beams (the cut scene's lamps, 0 to 1), the talking seat
 * (bleachers.js keeps that person sitting still) and whoever she's talking to (talking, who turns to her), the
 * teammate's { x, y, dir, gait, dist } if not at MATE, and her: the stage's s.player, her x and s.me while walking, or hero
 * { x, y, dir, gait, dist } in the cut scene.
 */
function drawWorld(g, view, t, o = {}) {
  warm(3, divisionAt(view.x + W / 2));
  useContext(g);
  screen();
  fill(0, 0, W, H, C.ink);
  drawHall(g, view, t, { lights: o.lights ?? 1 });
  drawFloors(g, view);
  drawStandsAll(g, view, t, { lookOf, talkingTo: o.talkingSeat ?? null });
  drawGateways(g, view, t);
  const at = o.player ? { x: o.playerX, y: o.player.y } : o.hero;
  const her = o.player ?? (o.hero ? { y: o.hero.y, draw: () => drawWithShadow(g, view, { ...o.hero, look: HERO_LOOK }) } : null);
  // Everyone and everything standing in view, with how far across each is drawn: the people, the tables, her.
  const ks = visibleDivisions(view);
  const things = ks.flatMap((k) => standingIn(g, view, k, t, { mate: o.mate, talking: o.talking, her: at }))
    .map((p) => ({ x0: p.x - HALF, x1: p.x + HALF, y: p.y, draw: p.draw }));
  for (const p of PROPS) {
    if (p.x1 > view.x && p.x0 < view.x + W) {
      things.push({ x0: p.x0, x1: p.x1, y: p.y, cut: p.cut, draw: (lo, hi) => p.draw(g, view, t, lo, hi) });
    }
  }
  if (her) things.push({ x0: at.x - HALF, x1: at.x + HALF, y: her.y, draw: her.draw });
  // With two fields in view, the first takes what's left of the split and the second the rest, each its own part of a
  // barrier that runs across it.
  const split = ks.length > 1 ? splitAt(things.filter((p) => !p.cut), ks[1]) : Infinity;
  ks.forEach((k, i) => {
    const [lo, hi] = i === 0 ? [-Infinity, split] : [split, Infinity];
    const more = things.filter((p) => (p.cut ? p.x0 < hi && p.x1 > lo : (p.x0 + p.x1) / 2 < split === (i === 0)))
      .map((p) => (p.cut ? { y: p.y, draw: () => p.draw(lo, hi) } : p));
    drawField(g, view, t, k, { more, hero: at });
  });
  if (o.me && behindEnd(o.me.x, o.me.y)) withAlpha(SHOW_THROUGH, () => drawPerson(g, view, { ...o.me, look: HERO_LOOK }));
  if ((o.lights ?? 1) < 1) drawUnlit(g, view);
  if (o.beams) drawBeams(g, view, t, o.beams);
}

const cutscene = makeCutscene(drawWorld);
const END = cutscene.reduce((t, b) => t + b.dur, 0); // the hall's time on the cut scene's last frame, read straight through
let shift = END - performance.now() / 1000; // walking's world time is the page's clock plus this
let where = { x: START.x, y: START.y }; // where she is: for the bubble over whoever's in reach and turning to them
/** Seconds the hall takes to fade in from the cut scene's black, and when it started (page clock), if it's fading. */
const FADE = 0.6;
let fadeFrom = null;

export const scene = {
  // The card under the big screen and the phone's title: short enough for one line at phone width (the page's title
  // says the rest).
  name: 'WORLDS',
  label: "The World Championship hall: eight division fields side by side, each with its stands, its curtain, sign and big screen, matches playing on all of them, a doorway through the wall at either end, and the strategist you're steering along the walkways in front of the stands; the view follows her",
  note: 'Push the stick a little to walk, all the way to run; the view follows her along the hall. The walkways run in front of the stands and the aisles between the divisions are open floor. Stand by someone (a student, a scout, a volunteer, someone in the front row) and press A. The teammate waits by Newton\'s queue at the far end; the doorway past it leads on to Einstein. In the cut scene, A reads on and SKIP jumps to the end. On a keyboard: arrow keys or WASD, Shift to run, Space or Enter for A, Esc to skip.',
  world: WORLD,
  start: START,
  enter: ENTER,
  exit: EXIT,
  move: (x, y, dx, dy) => move(x, y, dx, dy, STOPS),
  people: PEOPLE,
  // A tap on someone: she finds her way over to them, round whoever and whatever's in the way (arena/approach.js).
  pointer: (type, x, y, s) => type === 'down' && approach(scene, s, x, y),
  reach,
  prompt: (g, view, p, t) => prompt(g, view, p, t, where.x),
  faceTo: (p) => faceTo(p, where),
  setup() {
    setupFields();
    warm(0);
  },
  onFree(s) {
    // Played through to its last beat, the hall carries straight on; skipped, it starts no earlier than the cut scene
    // would have ended.
    const now = performance.now() / 1000;
    shift = (cutscene.played() ? cutscene.clock() : Math.max(cutscene.clock(), END)) - now;
    // Fade in, unless stage.js is fading the page in already (it opened, or she has just come back in on this page).
    fadeFrom = s.fadeIn != null && now - s.fadeIn < 0.5 ? null : now;
  },
  draw(g, view, t, s) {
    where = s.me;
    drawWorld(g, view, t + shift, { player: s.player, playerX: s.me.x, me: s.me, talkingSeat: talkingSeat(s), talking: s.talk?.person });
    if (fadeFrom != null) cover(1 - seg(t, fadeFrom, fadeFrom + FADE));
  },
  cutscene,
};
