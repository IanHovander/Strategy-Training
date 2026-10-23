// Alliance selection, put together for the stage (stage.js runScene): the cut scene, then the arena once it's over, to
// walk about. The parts are the scene folder's own: the set (set.js: the field dressed for selection, the floor in
// front of it, the signs, the mic, the gate, the audience display), the people (people.js: a rep from every team, the
// queuer and the field volunteer, and what ten of them have to say), MC Robin on her skates (mc.js) and the cut
// scene (cutscene.js); where everyone stands is layout.js. This file only ties them together.
//
// Once the cut scene is over she's 3000's first pick, and free to walk: on the floor in front of the field where the
// backups wait with the lead queuer, back up through the gate to the front of the line, and past both ends. Everyone
// standing stops her, as do the signs' posts, the mic, the display and the field's own walls and corner pieces (set.js
// moveIn).
//
// In the play-through every scene is walked from left to right. She starts on the left half of the floor in front,
// just out through the gate, where the cut scene leaves her: its last beat walks her from her place with her alliance
// along the front of the line and off the field through the gate, and turns her to the right; its last frame is
// walking about's first, and A can't cut it short. There's no walk in from the edge: she's been on the field since her
// captain picked her. She leaves on the right: straight along the floor in front (holding right is enough) and out
// through the gap in the belt barrier past the red end, below the audience display and under the EXIT sign hung over
// the chute, the way she left the arena that morning (scene.exit, layout.js EXIT, drawn by set.js; the arrow shows
// while the gap is in the picture: camera()). Nobody stands near it: the head referee waits well left of it and
// Robin's patrol keeps to the field.
//
// She can talk to her captain and partners, the captains who made the big decisions, the team that turned an
// invitation down (whose rep, standing with their back to you, turns round to talk), the top backup, Priya, Sam, the
// head referee and Robin.
//
// Robin keeps skating the strip in front of the line (people.js mcPatrol, a loop of about twenty seconds) on her own
// clock: it starts as walking starts, which is where the cut scene left her, mic up beside the mic stand. When the
// strategist stands where Robin is about to be (or right by her), or talks to her, Robin pulls up and turns to her, and
// the loop waits; then she carries on from where she stopped. Looking a tenth of a second ahead, she pulls up a skate's
// length short, never on top of her or right in front of her with her back turned, and while she waits like that she can
// be talked to from where she stopped. Pushing straight along the strip into her while she waits, the strategist slips
// past in front of her (move()). She turns to the strategist, but never her back to you (with the strategist
// behind her she turns side-on, to her side), and never her free arm out across a captain standing just to her right
// (she turns three-quarters left instead, free hand on her hip, as in the cut scene).

import { H } from '../pixel.js';
import { drawBubble } from '../talk.js';
import { drawWithShadow, dirToward } from '../stage.js';
import { makeSetLayers, drawSet, moveIn } from './set.js';
import { lookOf, CROWD, TALKERS, MC_LINES, mcPatrol } from './people.js';
import { MC_LOOK, drawSkater } from './mc.js';
import { makeCutscene } from './cutscene.js';
import {
  WORLD, START, EXIT, ALLIANCES, BACKUPS, MC_NAME, NEAR_TOP, NEAR_GATE, SKATE_SPEED, SIGN_TOP, capSpot, walkView,
} from './layout.js';

/** The display once it's over: every alliance, the backups, no clock. */
const BOARD_FULL = { rows: ALLIANCES, hot: null, clock: null, backups: BACKUPS };
/**
 * Talking reach: picks stand close behind their captains and she talks to them from in front of the line, so deeper
 * than stage.js's 10; and depth counts for half in who's closest, so stepping in front of a pick picks them. The picks
 * reach deeper still (PICK_Y), from beside their captain, while the captain straight in front of them is still closer.
 */
const REACH = { x: 14, y: 18 };
const PICK_Y = 22;
/** Captains, and first picks (who stand on their captain's left), for where the bubble goes; and both picks. */
const CAPTAINS = new Set(ALLIANCES.map(([cap]) => cap)), FIRST_PICKS = new Set(ALLIANCES.map(([, first]) => first));
const PICKS = new Set(ALLIANCES.flatMap(([, ...picks]) => picks));
/**
 * Robin stops for her when she's this close to where Robin is, or will be LOOK_AHEAD seconds on; once stopped, she
 * waits till the strategist is SLACK further off than that from both, so she doesn't flicker on and off at the edge.
 */
const PAUSE = { x: 14, y: 14 };
const LOOK_AHEAD = 0.1;
const SLACK = 4;
/** Stopped for her, Robin can be as far off as that: her reach while she waits, so she's never stopped out of reach. */
const WAITING_REACH = PAUSE.x + SLACK + LOOK_AHEAD * SKATE_SPEED + 1;
/** The captains' feet on the line (once it's over, every captain stands on their spot). */
const CAPTAIN_FEET = ALLIANCES.map((_, i) => capSpot(i));
/** stage.js's floor recession: going down the screen covers more ground than going across. */
const DEPTH = 0.8;

// ---- Robin, skating about ----
// She's one of the people to talk to, and the only one who moves: her place, pose and heading are set every frame.
const mc = { id: 'mc', name: MC_NAME, lines: MC_LINES, look: MC_LOOK, faceGait: 'emcee', ...mcPatrol(0) };
/** Her loop's clock: when walking started, how long she's stood still for the strategist, and the last frame's time. */
const clock = { t0: null, paused: 0, last: null };

// ---- The camera ----
/** The view's last row, so a jump in where it should be (layout.js walkView) becomes a pan. */
const cam = { y: null };
/**
 * The way out as stage.js sees it (scene.exit): layout.js EXIT, with the arrow and its words moved off the screen
 * (sign.y) whenever the gap they point at isn't in the picture. Past the red end above the floor in front, the view is
 * held up on the display (layout.js END_VIEW) with the gap below the screen's bottom edge, where the arrow would be
 * cut off and its words left on their own over it; the EXIT sign over the chute shows the way from there.
 */
const exit = { ...EXIT, sign: { ...EXIT.sign } };
/** Where the arrow goes when it's put away: a screen's height above the picture, its words further up still. */
const OFF_SCREEN = -H;
/**
 * The view, walking about: layout.js walkView(), but where that jumps (stepping between the floor past an end of the
 * field and the floor in front of it) the view pans there instead, a sixth of the way each frame and at least a pixel,
 * in whole pixels. It starts where walkView says, so walking about's first frame is the cut scene's last. stage.js
 * asks for the view before it draws the way out, so the arrow keeps up with it (exit, above).
 */
function camera(s) {
  const v = walkView(s.me.x, s.me.y);
  if (cam.y == null) cam.y = v.y;
  const d = v.y - cam.y;
  cam.y += Math.sign(d) * Math.ceil(Math.abs(d) / 6);
  exit.sign.y = EXIT.y0 - cam.y < H ? EXIT.sign.y : cam.y + OFF_SCREEN;
  return { x: v.x, y: cam.y };
}

/**
 * Which way Robin turns to face the strategist at (x, y): toward her, but side-on rather than with her back to you when
 * she's behind Robin (directions 3 to 5), and three-quarters left (7) rather than to the front (0 or 1) with a captain
 * just to her right, whom her free arm would reach across.
 */
function faceHer(x, y) {
  const dir = dirToward(x - mc.x, (y - mc.y) / DEPTH);
  if (dir >= 3 && dir <= 5) return x < mc.x ? 6 : 2;
  const captainRight = CAPTAIN_FEET.some((c) => c.x > mc.x && c.x - mc.x <= 22 && Math.abs(c.y - mc.y) <= 12);
  return captainRight && dir <= 1 ? 7 : dir;
}

/**
 * Where Robin is now: on her loop, unless the strategist is close by or talking to her, when she stops and turns. While
 * she waits, her loop's clock waits with her, every moment of it (a long frame doesn't nudge her on).
 */
function moveMc(t, s) {
  if (clock.t0 == null) Object.assign(clock, { t0: t, paused: 0, last: t });
  const dt = Math.max(0, t - clock.last);
  clock.last = t;
  const me = s.me, talking = s.talk?.person === mc, slack = mc.waiting ? SLACK : 0;
  const near = (p) => Math.abs(me.x - p.x) < PAUSE.x + slack && Math.abs(me.y - p.y) < PAUSE.y + slack;
  const close = near(mc) || near(mcPatrol(t - clock.t0 - clock.paused + LOOK_AHEAD));
  mc.waiting = talking || close;
  if (mc.waiting) {
    clock.paused += dt;
    mc.dir = faceHer(me.x, me.y);
    mc.gait = talking ? 'emcee' : 'stand';
    return;
  }
  Object.assign(mc, mcPatrol(t - clock.t0 - clock.paused));
}

/**
 * Where a step takes her: set.js moveIn, everyone standing and Robin in the way. Robin stops for her when she comes
 * close, and waits for as long as she stays close, so pushing straight along the strip into a waiting Robin, each would
 * wait for the other: a step along that only Robin stops slips her sideways instead, round the near side of Robin's box
 * (in front of her, on the strip, which keeps its last rows clear of it: set.js moving()), and she walks on past.
 */
function move(x, y, dx, dy) {
  const to = moveIn(x, y, dx, dy, CROWD, [mc]);
  if (!mc.waiting || !dx || to[0] !== x || to[1] !== y) return to;
  const free = moveIn(x, y, dx, dy, CROWD);
  if (free[0] === x && free[1] === y) return to;
  return moveIn(x, y, 0, (y >= mc.y ? 1 : -1) * Math.abs(dx) * DEPTH, CROWD, [mc]);
}

/**
 * Whoever she's talking to, turned to her if they stand with their back to you (6038's rep, facing the field they
 * turned down) and she's in front of them, so you talk to a face and not the back of a head; everyone else as they
 * stand. They turn back once the talk is over.
 */
function turnedTo(p, s) {
  if (s.talk?.person !== p || p.dir < 3 || p.dir > 5 || s.me.y <= p.y) return p;
  return { ...p, dir: dirToward(s.me.x - p.x, (s.me.y - p.y) / DEPTH) };
}

// ---- The cut scene ----
/** The world for a frame of the cut scene: the set, everyone in it (Robin on her skates), the stands and the display. */
function drawWorld(g, view, t, frame) {
  const people = frame.people.map((p) => ({ y: p.y, draw: () => (p.skater ? drawSkater(g, view, p) : drawWithShadow(g, view, p)) }));
  // The EXIT sign stays out of the cut scene's shots of the display: they're about the alliances.
  drawSet(g, view, t, { people, cheer: frame.cheer, board: frame.board, exitSign: false });
}
const cutscene = makeCutscene({ drawWorld, lookOf: (k) => (k === 'mc' ? MC_LOOK : lookOf(k)), crowd: CROWD });

// ---- The scene ----
export const scene = {
  name: 'ALLIANCE SELECTION',
  label: 'The arena at alliance selection: the empty field with eight numbered signs across it and a microphone in the middle, the alliances standing at their signs, the team reps and the backups on the floor in front, the stands full above; the view follows the strategist',
  note: 'Push the stick a little to walk, all the way to run; the view follows her. Around you on the floor in front are the backups, the team that said no, Priya, Sam and the head referee; back up through the gate are your captain and partners, the other captains along the line, and Robin skating in front of it. Press A by someone to talk. The way out is off to the right, past the red end under the display: through the gap in the barrier. On a keyboard: arrow keys or WASD, Shift to run, Space or Enter to talk.',
  world: WORLD,
  start: START,
  // Out through the gap in the barrier past the red end, below the display (layout.js, set.js): on to the next scene.
  exit,
  cutscene,
  people: [...TALKERS, mc],

  setup() {
    makeSetLayers();
  },
  /** Walking starts (the cut scene over or skipped): Robin's loop starts again from where the cut scene left her. */
  onFree() {
    clock.t0 = null;
    cam.y = null;
    Object.assign(mc, mcPatrol(0));
  },
  /**
   * Whoever's closest within reach: deeper than stage.js's, so she can talk to a pick from in front of the line, and
   * further for Robin while she's stopped for her. Not through the near wall, though: across it only in the gate.
   */
  reach(s) {
    let best = null, bestD = Infinity;
    const inGate = s.me.x >= NEAR_GATE.x0 && s.me.x <= NEAR_GATE.x1;
    for (const p of scene.people) {
      if (p.y > NEAR_TOP !== s.me.y > NEAR_TOP && !inGate) continue;
      const dx = Math.abs(p.x - s.me.x), dy = Math.abs(p.y - s.me.y);
      const rx = p === mc && mc.waiting ? WAITING_REACH : REACH.x, ry = PICKS.has(p.id) ? PICK_Y : REACH.y;
      if (dx < rx && dy < ry && dx + dy / 2 < bestD) [best, bestD] = [p, dx + dy / 2];
    }
    return best;
  },
  /**
   * The bubble by their heads, Robin's a few pixels higher on her skates. On the line it keeps off the faces round them:
   * on top of a captain's sign (the picks' heads fill the space between it and the captain's), and by a pick's outside
   * ear (a first pick's left). With the view down on the field there's no room above the sign under the screen's top,
   * so it sits on the sign's top right-hand corner, clear of the number, its point on the panel.
   */
  prompt(g, view, p, t) {
    const x = p.x - view.x, y = p.y - view.y, above = SIGN_TOP - 13 - view.y;
    if (CAPTAINS.has(p.id)) drawBubble(g, above >= 1 ? x : x + 9, Math.max(1, above), t);
    else drawBubble(g, x + (FIRST_PICKS.has(p.id) ? -11 : 11), y - (p === mc ? 53 : 50), t);
  },
  /**
   * The view follows her as stage.js does, but on the field it stays down far enough to keep the stands' legs out, and
   * past the ends it stays up far enough to keep the front row's faces in.
   */
  camera,
  move,

  draw(g, view, t, s) {
    moveMc(t, s);
    const people = [
      ...CROWD.map((p) => ({ y: p.y, draw: () => drawWithShadow(g, view, turnedTo(p, s)) })),
      { y: mc.y, draw: () => drawSkater(g, view, mc) },
      s.player,
    ];
    drawSet(g, view, t, { people, board: BOARD_FULL, talkingTo: s.talk?.person });
  },
};
