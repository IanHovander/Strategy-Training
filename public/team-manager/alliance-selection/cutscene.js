// The cut scene of alliance selection: Saturday lunchtime in the arena, the qualification matches over, the field empty
// and the stands full, the house lights down. It opens close on the crowd in the dark, their phones out, cuts to the
// empty arc of numbered signs across the field and pans along it from 1 to 8 as a spotlight comes on over each in turn,
// then tilts down to the team reps waiting in the dark in front of the field, in knots, the strategist apart from them
// at the front corner by the gate with her whiteboard, 5026's rep, ranked eleventh. MC Robin skates in along the front
// of the crowd in her pink blazer under a follow spot, through the gate and up to the mic, and lands it with a spin as
// the mic's own spotlight comes on. She welcomes everyone, thanks the volunteers and sponsors, gets a cheer for every
// team, and explains the rules plainly, a page at a time, while she skates the order the picks go in along the empty
// arc: the top eight are the captains, round one picks one to eight (sign 1 to sign 8) and round two eight to one (back
// again), a captain can invite any team ranked below them (even another captain), and a team that turns an invitation
// down can't be picked by anyone else. Then she calls the eight captains out by seed, and each runs on through the gate
// and into the light at their sign as she does.
// Then two picks, the way FIRST runs them. Alliance One's captain walks to the mic under a follow spot ("you are on
// the clock", and a cut to the display past the red end, lit in the dark, as its clock starts counting down from 45)
// and invites 2468, a captain, the line dimming to half while the invitation's made; Robin skates over to 2468 with
// "would you prefer to join or form your own alliance?", 2468 accepts, and every captain below moves up a spot while
// 9152, ranked ninth, runs on as the new number eight. Alliance Two's captain invites 5026, and a spotlight slams on
// over her in the dark: Robin skates out through the gate, round in front of her to the open floor on her right and
// holds out the mic; she steps out to it, accepts, Robin congratulates her, and she runs onto the field to stand at her
// captain's left. A four-step fade skips to the end of round two: eight alliances of three in eight pools of light
// across the dark field, the display full with the backups; the house lights come up as the whole arena gets on its
// feet for every team, and a send-off; then she walks off the field through the gate (the captains stay for the head
// ref's briefing), ending on the first frame of walking about, with the house lights up as it has them.
//
// The look is the lights' (light.js): with the house down, only whoever stands in a spotlight keeps their colour, so
// each shot holds a few people in light with dark between them, not a crowd of every team's colours at once. The
// alliances stand in an arc across the whole field (layout.js), each a separate clump in its own pool, and the shots
// along it hold four or five of them at a time.
//
// It's built like the intro and every other scene's cut scene (stage.js): eased pans and hard cuts between shots at 1x,
// whole-number 2x close-ups for the people talking and the crowd on its feet, film bars throughout (in as it opens, out
// as it ends), fades in four hard steps, and the place card as the camera comes down to the reps (over the empty floor,
// clear of the crowd and the signs). The opening's shot of the arena starts 12 rows above the world, under the top film
// bar, so the front row of the stands shows its faces. Everyone is placed as a pure function of time: a beat starts from where
// the one before left everyone, moves whoever it moves (walking and running with stage.js along(), so feet step with
// the distance covered; Robin rolling at SKATE_SPEED, posing once she stops), and holds the end of it for as long as
// the words take to read. Paths keep clear of everyone standing: Robin and anyone running to the right of the mic pass
// in front of it (FRONT, 8 pixels nearer than the mic's foot), anyone walking past the captains does it a step in front
// of their arc (passY), and nobody walks through anybody. Sam, the volunteer at the gate, stands in front of the near
// wall with his head on the same rows as the legs of anyone on the field, so he keeps out from in front of where they
// go: he steps aside from the gate while Robin skates in through it, steps back into the lane between the waiting reps
// and her as Robin starts on the rules and stays there while the captains come out and the first picks are made, comes
// back to the gate's left while the camera is on the mic, and goes off to the left of everyone's way while she runs
// on. While a page of words is up, the dialog box
// covers the bottom of the screen, so every shot with words keeps the faces in the top 88 rows: the shots along the
// line sit at LINE_VIEW, low enough that the signs clear the top film bar, and the captains' run on opens lower, on the
// gate, while Robin calls them out.
//
//   makeCutscene({ drawWorld, lookOf, crowd })   the 26 beats, in stage.js's form ({ dur, draw(g, t, c), say })
// drawWorld(g, view, t, frame) is the scene's: the whole world at 1x into g, seen from view = { x, y } (whole pixels),
// t the cut scene's clock, and frame = { people: [{ x, y, dir, gait, dist, look, skater }], cheer: 0 to 1 or undefined,
// board: { rows: eight [captain, pick, pick] ('' for nobody yet), hot: 0-7 or null, clock: seconds or null, backups:
// [numbers] or null }, light: the lights (light.js's rig) }. Robin's entry has skater: true (her glide steps with dist,
// not like a walk). The cut scene lights each frame itself, over what drawWorld draws. lookOf(key) is a walker look for
// '5026', any team number, 'priya', 'sam', 'ref' or 'mc'. crowd (optional) is everyone standing once it's over, as
// { id, x, y, dir } (people.js CROWD), so the last frame stands everyone exactly as walking about does; without it
// they stand as layout.js says, facing you. The close-ups draw a 1x view into a 256x144 canvas of their own, lit, and
// copy a 128x72 window of it up to the screen at 2x, crisp.

import { W, H, C, useContext, screen, clamp, lerp, seg, easeInOut } from '../pixel.js';
import { placeCard, bars, cover, along } from '../stage.js';
import { beam } from '../lights.js';
import { HERO_NAME } from '../cast.js';
import { walkerFrame, HERO_LOOK, CELL_W, CELL_H, FOOT_X } from '../walker.js';
import { light, pools, micSpot, followSpot, house, AFTER, afterLights } from './light.js';
import {
  WORLD, SPOTS, lineY, capSpot, pickSpot, signY, MIC, AT_MIC, MC_HOME, GATE_OUT, GATE_IN, waitSlot, PRIYA_AT, SAM_AT,
  SAM_ASIDE, SAM_LANE, SAM_FAR, REF_AT, START, backupSpot, DECLINED_AT, SKATE_SPEED, MC_NAME, repTag, FIRST_CAPTAINS,
  ALLIANCES, DECLINED, BACKUPS, WAITING, SIGN_POST, walkView,
} from './layout.js';

// ---- The camera ----
/** As far as a 1x view can go and stay inside the world: x 0 to 528, y 0 to 64. */
const MAX = { x: WORLD.w - W, y: WORLD.h - H };
/**
 * How far above the world a 1x view may start: the top film bar's 12 rows, so with the bars in, the first row you see
 * is the world's top row. Seen from there, the front row of the stands has its faces whole under the bar, the way the
 * arena's walkabout frames them at its top edge (at y 0 the bar would cover them).
 */
const ABOVE = -12;
const view = (x, y, top = 0) => ({ x: Math.round(clamp(x, 0, MAX.x)), y: Math.round(clamp(y, top, MAX.y)) });
/** An eased pan from one view to another, k from 0 to 1 (from or to a view above the world, if either is). */
const pan = (a, b, k) => view(lerp(a.x, b.x, easeInOut(clamp(k, 0, 1))), lerp(a.y, b.y, easeInOut(clamp(k, 0, 1))), ABOVE);
/**
 * The shots along the line: the signs' panels clear of the top film bar (the middle ones' tops at row 17, the ends'
 * at 27), the first row under the bar below the shoes of the stands' front row (they reach row 49), the captains' feet
 * at rows 82 (the middle of the arc) to 92 (its ends), and the waiting reps along the bottom; with words up, every face
 * stays above the dialog box.
 */
const LINE_VIEW = 40;
/**
 * Along the line, three ways: the blue half (alliances One to Five whole, the mic and Robin's spot beside it), the
 * middle (Two to Six, the mic in the middle) and the red half (Four to Eight). The arc is 344 pixels end to end, more
 * than the screen's 256, so no 1x view holds all eight; each of these holds five, with dark floor between them.
 */
const BLUE_SIDE = view(195, LINE_VIEW), MIDDLE = view(MIC.x - W / 2, LINE_VIEW), RED_SIDE = view(333, LINE_VIEW);
/**
 * The arena with the line full: the stands on their feet over alliances Two to Six (hers in the left fifth, Robin by
 * the mic in the middle), every face along the line clear of the dialog box.
 */
const CROWD_SHOT = view(242, 2);
/**
 * Along the empty arc as it opens, the stands above it: from signs 1 to 5 whole (sign 1 at the left edge, the place
 * card nowhere near) to signs 4 to 8 whole (sign 8 at the right edge), each spotlight coming on as the camera gets to
 * it. Its pools are behind the bottom film bar; the shafts of haze come down to them, and the signs light up.
 */
const LINE_FROM = view(SPOTS[0] - 25, ABOVE, ABOVE), LINE_TO = view(SPOTS[7] + 25 - W, ABOVE, ABOVE);
/**
 * The crowd, close, at 2x: the front row of fans across the frame above the dialog box, as high as the world goes so
 * the film bar doesn't cut their hands off, past the blue end of the field, clear of the signs, the rocket and the
 * alliance wall's tall end pillar (x 173). As it opens, the camera drifts a little along them.
 */
const STANDS_BLUE = { focus: { x: 100, y: 36 }, zoom: 2 };
const standsDrift = (k) => ({ focus: { x: Math.round(lerp(84, 104, easeInOut(clamp(k, 0, 1)))), y: 36 }, zoom: 2 });
/**
 * The reps waiting in front of the field, as far down as the camera goes: every knot of them and her apart at the
 * front corner by the gate, her feet at row 98, Priya at the left edge (the TEAM REPS sign just out of shot, so its
 * words aren't cut in half).
 */
const REPS_SHOT = view(172, 64);
/**
 * Her, turning to you, close: twice the size, two thirds of the way across, Sam by the gate behind her, the knot by
 * the gate along the bottom left, dark heads in front of the light on her; and Robin (a skate's length right of her
 * spot by the mic, ASIDE) just out of shot to the right.
 */
const HER_SHOT = { focus: { x: waitSlot(0).x - 41, y: 130 }, zoom: 2 };
/**
 * The audience display past the red end, its header just under the film bar: as far right as the view goes without
 * cutting anyone at its left edge, Alliance Eight whole there. From the top of the world, so the front row of the
 * stands above it shows its faces under the bar. With the backups on it and the words up, a little lower
 * (BACKUPS_SHOT), so their last line ends 4 rows above the dialog box, not on its border.
 */
const BOARD_SHOT = view(540, 0), BACKUPS_SHOT = view(540, 4);
/** Walking about starts here: the walkabout's own camera on her where she stands (layout.js walkView). */
const WALK_VIEW = view(walkView(START.x, START.y).x, walkView(START.x, START.y).y);
/**
 * A camera operator following something along x: where it is on average over `span` seconds, from a little before t
 * to `ahead` seconds after (the cut scene knows where it's going), half a screen to its left. The pan eases in as the
 * thing sets off and out as it stops, and leaves a little room in front of it while it moves.
 */
function follow(xAt, t, span = 0.9, ahead = 0.55, n = 12) {
  let sum = 0;
  for (let i = 0; i < n; i++) sum += clamp(xAt(t + ahead - (span * i) / (n - 1)) - W / 2, 0, MAX.x);
  return sum / n;
}

// ---- The close-ups ----
let lens = null;
/** The close-up's own canvas: a 1x view is drawn into it and a quarter of it copied up to the screen at 2x. */
function lensCanvas() {
  if (!lens) lens = Object.assign(document.createElement('canvas'), { width: W, height: H });
  return lens;
}
/**
 * Draw a shot, lit: { view } at 1x, or { focus, zoom: 2 }, a 128x72 window centred on the world point focus, at 2x
 * (the 1x view round it clamped to the world, the window to that view), copied crisp at whole-pixel offsets.
 */
function shoot(g, shot, T, frame, drawWorld) {
  if (!shot.zoom) {
    drawWorld(g, shot.view, T, frame);
    light(g, shot.view, T, frame.light, frame.people);
    return;
  }
  const lc = lensCanvas(), lg = lc.getContext('2d', { willReadFrequently: true });
  const v = view(shot.focus.x - W / 2, shot.focus.y - H / 2);
  lg.imageSmoothingEnabled = false;
  lg.fillStyle = C.ink;
  lg.fillRect(0, 0, W, H);
  drawWorld(lg, v, T, frame);
  light(lg, v, T, frame.light, frame.people);
  const sx = clamp(Math.round(shot.focus.x - W / 4 - v.x), 0, W / 2), sy = clamp(Math.round(shot.focus.y - H / 4 - v.y), 0, H / 2);
  g.imageSmoothingEnabled = false;
  g.drawImage(lc, sx, sy, W / 2, H / 2, 0, 0, W, H);
}
const at1x = (v) => ({ view: v });
const closeUp = (x, y) => ({ focus: { x, y }, zoom: 2 });

// ---- The lights ----
// The spotlights are light.js's: pool(i) on alliance i, the mic's, and follow spots (on).
const on = followSpot;
/** Two lamps sweeping the stands, for a cheer: bold wedges like the intro's, swaying from the top corners. */
function sweep(g, T, a) {
  beam(g, 40, -10, 0.25 + Math.sin(T * 0.9) * 0.35, 0.08, 0.1 * a);
  beam(g, 216, -10, -0.25 - Math.sin(T * 0.9 + 2) * 0.35, 0.08, 0.1 * a);
}

// ---- Over her shoulder ----
/** The rim of light along her edges in the shot over her shoulder: the field's light, ahead of her and up. */
const RIM = '#7f93e8';
let backOf = null;
/**
 * Her from behind, standing, in deep shadow: her own colours under the dark's navy (her red tee and her hair still
 * there, just), with a rim of light along her top and right-hand edges, her shape in the rim's colour under the
 * shadowed her a pixel down and to the left. Made once, at 1x.
 */
function silhouette() {
  if (backOf) return backOf;
  const f = walkerFrame(4, 'stand', 0, HERO_LOOK);
  const make = (draw) => {
    const c = Object.assign(document.createElement('canvas'), { width: CELL_W, height: CELL_H }), cg = c.getContext('2d');
    cg.drawImage(f, 0, 0);
    cg.globalCompositeOperation = 'source-atop';
    draw(cg);
    return c;
  };
  const rim = make((cg) => {
    cg.fillStyle = RIM;
    cg.fillRect(0, 0, CELL_W, CELL_H);
  });
  const shade = make((cg) => {
    cg.globalAlpha = 0.78;
    cg.fillStyle = C.night0;
    cg.fillRect(0, 0, CELL_W, CELL_H);
  });
  backOf = Object.assign(document.createElement('canvas'), { width: CELL_W, height: CELL_H });
  const bg = backOf.getContext('2d');
  bg.drawImage(rim, 0, 0);
  bg.drawImage(shade, -1, 1);
  return backOf;
}
/**
 * Over her shoulder: the back of her head and her shoulders at three times the size in the bottom left corner, dark
 * against the light ahead of her, her middle at x on the screen and the top of her hair at row `top`.
 */
function overShoulder(g, x, top) {
  const k = 3;
  g.imageSmoothingEnabled = false;
  g.drawImage(silhouette(), Math.round(x - FOOT_X * k), Math.round(top - 4 * k), CELL_W * k, CELL_H * k);
}

// ---- Moving people ----
const pt = (o) => [o.x, o.y];
const still = (x, y, dir = 0, gait = 'stand') => ({ x, y, dir, gait, dist: 0 });
/** How long a path takes at a speed (along()'s own reckoning of distance: depth counts a little extra). */
const timeOf = (path, speed) => along(path, 1e9, 'walk', 1).dist / speed;
const SPEEDS = { walk: 34, run: 78, skate: SKATE_SPEED };
/** Seconds a turn takes, a direction at a time. */
const TURN = 0.07;
/** Turning on the spot from one direction to another the short way, a step every TURN seconds, s seconds into it. */
function turn(from, to, s) {
  const d = ((to - from + 12) % 8) - 4;
  const n = Math.min(Math.abs(d), Math.max(0, Math.floor(s / TURN)));
  return (((from + Math.sign(d) * n) % 8) + 8) % 8;
}
/**
 * A spin on the spot that lands facing `to`: clockwise `turns` times round and on to `to`, slowing into the last turn,
 * u from 0 to 1.
 */
function spin(from, to, u, turns = 2) {
  const k = 1 - (1 - clamp(u, 0, 1)) ** 2, steps = turns * 8 + ((to - from + 8) % 8);
  return (from + Math.floor(k * steps)) % 8;
}
/**
 * Someone walking or running along path, setting off t0 seconds into the beat; once there they turn to face `face`
 * (if given). Before setting off they stand at the first point facing `wait` (if given).
 */
function trip(path, t, t0, gait = 'walk', face = null, wait = null) {
  const s = t - t0, p = along(path, s, gait, SPEEDS[gait]);
  if (s <= 0) return wait == null ? p : { ...p, dir: wait };
  const done = timeOf(path, SPEEDS[gait]);
  return face == null || s < done ? p : { ...p, dir: turn(p.dir, face, s - done) };
}
/**
 * Robin rolling along path from t0: gliding while she moves, and `pose` ('emcee', 'offer', 'flair' or 'stand') at
 * either end, turning to face `face` once she's stopped. Before setting off she holds `before` facing `wait`.
 */
function glide(path, t, t0, pose, face = null, before = pose, wait = null) {
  const s = t - t0, p = along(path, s, 'skate', SKATE_SPEED);
  if (s <= 0) return { ...p, gait: before, dir: wait ?? p.dir, dist: 0 };
  const done = timeOf(path, SKATE_SPEED);
  if (s < done) return { ...p, gait: 'skate' };
  return { ...p, gait: pose, dir: face == null ? p.dir : turn(p.dir, face, s - done) };
}
/** When someone setting off at t0 along path gets to its k-th point. */
const reaches = (path, k, t0, gait) => t0 + timeOf(path.slice(0, k + 1), SPEEDS[gait]);

// ---- The places ----
/** Robin's spot beside the mic, where the walkabout's patrol (people.js mcPatrol) starts: clear of the mic stand. */
const HOME = [MC_HOME.x, MC_HOME.y];
/**
 * Which way she faces there, talking, once the captains are on the line: three-quarters to the left, toward the mic,
 * which puts her free hand on her hip rather than out across captain 5 beside her.
 */
const HOME_DIR = MC_HOME.dir;
/** Passing the mic on its near side: 8 pixels nearer than its foot, clear of whoever stands at it. */
const FRONT = MIC.y + 8;
/**
 * Walking along in front of the captains' arc at x: a step nearer than their feet, as near the near wall as anyone
 * goes at its ends (row 140).
 */
const passY = (x) => Math.min(140, Math.round(lineY(x)) + 8);
/** On the empty arc, at sign i: two rows in front of where its captain will stand. */
const onArc = (i) => [SPOTS[i], capSpot(i).y + 2];
/** Stepping out of the waiting crowd: the taped line, a step behind its knots' back rows. */
const TAPE = 158;
const slotOf = (num) => waitSlot(WAITING.indexOf(num));

/** Everyone as the scene opens: the reps in their knots, Priya, Sam and the head ref at work, Robin off past the right. */
function opening(entry) {
  const out = {};
  WAITING.forEach((num, n) => {
    const s = waitSlot(n);
    out[num] = still(s.x, s.y, s.dir);
  });
  out.priya = still(PRIYA_AT.x, PRIYA_AT.y, PRIYA_AT.dir);
  out.sam = still(SAM_AT.x, SAM_AT.y, SAM_AT.dir);
  out.ref = still(REF_AT.x, REF_AT.y, REF_AT.dir);
  out.mc = still(entry[0][0], entry[0][1], 6);
  return out;
}

/** Everyone once it's over (section 7 of the plan): the alliances on the field, the backups by Priya, 6038 alone. */
function finale(crowd) {
  const out = {};
  if (crowd) for (const p of crowd) out[p.id] = still(p.x, p.y, p.dir ?? 0);
  else {
    ALLIANCES.forEach(([cap, first, second], i) => {
      out[cap] = still(capSpot(i).x, capSpot(i).y);
      out[first] = still(pickSpot(i, 1).x, pickSpot(i, 1).y);
      out[second] = still(pickSpot(i, 2).x, pickSpot(i, 2).y);
    });
    BACKUPS.forEach((num, k) => (out[num] = still(backupSpot(k).x, backupSpot(k).y, backupSpot(k).dir)));
    DECLINED.forEach((num) => (out[num] = still(DECLINED_AT.x, DECLINED_AT.y, DECLINED_AT.dir)));
    out.priya = still(PRIYA_AT.x, PRIYA_AT.y, PRIYA_AT.dir);
    out.sam = still(SAM_AT.x, SAM_AT.y, SAM_AT.dir);
    out.ref = still(REF_AT.x, REF_AT.y, REF_AT.dir);
  }
  out['5026'] = still(pickSpot(1, 1).x, pickSpot(1, 1).y, 0);
  out.mc = still(HOME[0], HOME[1], HOME_DIR, 'emcee');
  return out;
}

// ---- The display ----
const blank = () => Array.from({ length: 8 }, () => ['', '', '']);
const chart = (rows, hot = null, clock = null, backups = null) => ({ rows, hot, clock, backups });
/** The chart with these captains in rows 0 to 7 ('' for nobody), and any picks so far ({ row: [pick, pick] }). */
const captains = (caps, picks = {}) => caps.map((cap, i) => [cap, ...(picks[i] ?? ['', ''])]);
const FULL = chart(ALLIANCES.map((a) => [...a]), null, null, [...BACKUPS]);
/** The pick clock: 45 seconds a pick in round one, from when the MC says "you are on the clock". */
const PICK_CLOCK = 45;

// ---- The words ----
// Two lines of at most 38 characters a page (talk.js). The MC's are built on what FIRST's selection script has the MC
// say ("you are on the clock", "would you prefer to join or form your own alliance?", "congratulations!", "pick an
// alliance to cheer on"); the captains' on the invitation teams use; the rules are the 2019 manual's.
const pages = (...p) => p;
/** A page's letters: a page is two lines, or { name, lines, ... } for a page someone else says (talk.js). */
const chars = (page) => (Array.isArray(page) ? page : page.lines).join('').length;
/** How long stage.js takes over a page when the pages turn by themselves: typing at 40 a second, then a pause. */
const pageTime = (page) => chars(page) / 40 + 1.2 + chars(page) * 0.035;
/** When page k of a beat's words comes up at that pace, the words starting `at` seconds into the beat. */
const pageAt = (lines, at, k) => at + lines.slice(0, k).reduce((n, p) => n + pageTime(p), 0);

/**
 * The beats (stage.js), 26 of them: open, mcEnters, welcome, thanks, herTurn, rules, roundOne, roundTwo, anyBelow,
 * turnDown, captains, clock1, invite1, joinOrForm, accept1, moveUp, clock2, invite2, mcToHer, accept2, sheRunsOn,
 * later, alliances, backups, applause, out.
 */
export function makeCutscene({ drawWorld, lookOf, crowd = null }) {
  const LOOKS = {};
  const lookFor = (id) => (LOOKS[id] ??= lookOf(id));
  const says = (who, lines, at = 0.2) => ({
    name: who === 'mc' ? MC_NAME : repTag(who),
    lines, at, auto: true, look: lookFor(who),
    ...(who === '5026' ? { tag: C.red1 } : {}),
    // The phone shows Robin with her mic up, as on the big screen and while walking about (scene.js).
    ...(who === 'mc' ? { faceGait: 'emcee' } : {}),
  });
  if (repTag('5026') !== HERO_NAME) throw new Error('cutscene.js: her name tag should be HERO_NAME');

  // Robin's way in: along the front of the waiting crowd from just out of shot on the right, up the gap between the
  // crowd and her (16 pixels clear of the nearest knot's right-hand edge, 20 of her), past Sam's feet to the gate,
  // through it, across the empty arc behind the mic (in front, she'd run into it) and round to her spot beside it.
  const ENTRY = [[530, 194], [470, 192], [380, 190], [372, 180], [372, 160], pt(GATE_OUT), pt(GATE_IN), [374, 124], [398, 123], HOME];
  const beats = [];
  let places = opening(ENTRY);
  /** Her place apart from the knots: the front corner by the gate. */
  const HER = slotOf('5026');
  /** The lights most of the way through: every alliance's pool, the mic's, and a follow spot on Robin. */
  const LIT = (t, all) => house([...pools(), micSpot(), on(all.mc)]);

  /**
   * One beat: from where the last left everyone, `moves(t)` says where whoever moves is t seconds in; shot(t) the
   * camera, board(t) the display, cheer(t) the stands, light(t, all) the lights (LIT if not given), over(t, c) the
   * cards and fades on top. The next beat starts from where this one ends (or from `end`, everyone's places, if
   * given). hold: seconds A can't cut it short for (stage.js), for a beat without words that has to play out.
   */
  function beat(o) {
    const from = places, moves = o.moves ?? (() => ({}));
    const who = (t) => ({ ...from, ...moves(t, from) });
    places = o.end ?? who(1e4);
    const b = {
      name: o.name,
      dur: o.dur,
      draw(g, t, c) {
        const all = who(t);
        const frame = {
          people: Object.entries(all).map(([id, p]) => ({ ...p, look: lookFor(id), skater: id === 'mc' })),
          cheer: o.cheer?.(t),
          board: o.board?.(t) ?? chart(blank()),
          light: (o.light ?? LIT)(t, all),
        };
        shoot(g, o.shot(t), c.T, frame, drawWorld);
        useContext(g);
        screen();
        g.globalAlpha = 1;
        if (o.over) o.over(t, c, g);
        else bars(1);
      },
    };
    if (o.say) b.say = o.say;
    if (o.hold) b.hold = o.hold;
    beats.push(b);
    return b;
  }
  /** When a beat with words is over at the automatic pace: its own length, or the words', whichever is longer. */
  const autoEnd = (b) => Math.max(b.dur, b.say ? (b.say.at ?? 0) + b.say.lines.reduce((n, p) => n + pageTime(p), 0) : 0);
  const mcPose = (gait, dir = 0) => () => ({ mc: still(HOME[0], HOME[1], dir, gait) });

  // 1. open: close on the crowd in the dark as it fades in, their phones out; a cut to the arena, the stands over the
  // empty arc of signs, held on signs 1 to 5 and panned along to 4 to 8, a spotlight coming on over each sign in turn
  // as the camera gets to it; then down to the reps waiting in the dark in front of the field, the place card sliding
  // in as the camera settles on them, over the field's near edge and the empty floor (not over the crowd or the
  // signs), and out at the top left as Robin comes in from the right. Along the line, the bottom film bar is at row
  // 120, so Sam and she stand a few steps nearer than their places till the camera tilts down (their heads behind the
  // bar, not poking up out of it onto the empty field), and walk up to them as it does.
  const LINE_AT = 1.4, TILT_AT = 3.6, CARD_AT = 4.6;
  /** When sign i's spotlight comes on: one after the other along the pan, sign 8's just before the camera stops. */
  const LAMP0 = LINE_AT + 0.4, LAMP_GAP = 0.22;
  const card = (T) => placeCard(T - CARD_AT, 'ALLIANCE SELECTION', 'SATURDAY 12:40 PM'); // font 3 has no comma
  beat({
    name: 'open', dur: 5.5,
    moves: (t) => ({
      sam: trip([[370, 168], pt(SAM_AT)], t, TILT_AT, 'walk', SAM_AT.dir, SAM_AT.dir),
      '5026': trip([[HER.x, HER.y + 4], [HER.x, HER.y]], t, TILT_AT + 0.3, 'walk', 4, 4),
    }),
    shot: (t) => (t < LINE_AT ? standsDrift(t / LINE_AT) : at1x(t < TILT_AT
      ? pan(LINE_FROM, LINE_TO, seg(t, LINE_AT + 0.3, TILT_AT - 0.1))
      : pan(LINE_TO, REPS_SHOT, seg(t, TILT_AT, 5.4)))),
    cheer: (t) => (t < LINE_AT ? 0.4 : 0.15),
    light: (t) => house(t < LINE_AT ? [] : pools((i) => (t >= LAMP0 + i * LAMP_GAP ? 1 : 0))),
    over: (t, c) => {
      cover(1 - seg(t, 0, 0.8));
      card(c.T);
      bars(seg(t, 0, 0.6));
    },
  });

  // 2. mcEnters: Robin skates into the shot of the reps from the right under a follow spot, the camera picking her up
  // as she turns up toward the gate and following her up through it to the mic, where she lands a spin as the mic's
  // own spotlight comes on. Sam sees her coming and steps aside from the gate (as he does whenever anyone goes
  // through it); he stays there, out of the close-up of Robin that follows, and walks back while the camera's on the
  // crowd.
  const IN0 = 0.2, AT_GATE = reaches(ENTRY, 5, IN0, 'skate'), HOME_AT = reaches(ENTRY, ENTRY.length - 1, IN0, 'skate');
  const samAside = [pt(SAM_AT), pt(SAM_ASIDE)], samBack = [pt(SAM_ASIDE), pt(SAM_AT)];
  /** He sets off as she comes into the shot, so he's past the gate's column long before she gets to it. */
  const SAM_OFF = 0.8;
  const SPIN = [HOME_AT + 0.1, HOME_AT + 1.0];
  const entering = (t) => glide(ENTRY, t, IN0, 'flair', null, 'stand', 6);
  const mcIn = (t) => {
    const p = entering(t);
    return t < SPIN[0] ? p : { ...p, gait: 'flair', dir: spin(p.dir, 0, seg(t, SPIN[0], SPIN[1])) };
  };
  /** Up from the reps to the mic: along and up together as she goes through the gate. */
  const UP = [AT_GATE - 0.7, HOME_AT + 0.3];
  beat({
    name: 'mcEnters', dur: SPIN[1] + 0.4,
    moves: (t) => ({
      mc: mcIn(t),
      sam: trip(samAside, t, SAM_OFF, 'walk', SAM_ASIDE.dir, SAM_AT.dir),
    }),
    shot: (t) => at1x(pan(REPS_SHOT, MIDDLE, seg(t, UP[0], UP[1]))),
    cheer: (t) => lerp(0.1, 0.9, seg(t, 2, SPIN[1])),
    light: (t, all) => house([...pools(), on(all.mc), micSpot(t >= SPIN[0] ? 1 : 0)]),
    // The place card from the opening, sliding out.
    over: (t, c) => {
      card(c.T);
      bars(1);
    },
  });

  // 3. welcome: close on Robin, mic up, the mic stand beside her, the two of them a little left of the middle, her head
  // high in the frame, in the mic's spotlight with the field dark behind her: the signs' panels are above it, under the
  // top film bar, and Sam (stepped aside from the gate, below left) is well out of it. The words start with the cut,
  // so the dialog box covers the top of the strategist's head below.
  const WELCOME = closeUp(HOME[0] + 6, 98);
  beat({
    name: 'welcome', dur: 2.5,
    moves: mcPose('emcee'),
    shot: () => WELCOME,
    cheer: () => 0.6,
    say: says('mc', pages(
      ['WELCOME TO ALLIANCE SELECTION!', 'HOW ARE WE FEELING, EVERYBODY?!'],
    ), 0),
  });

  // 4. thanks: close on the crowd on its feet, two lamps sweeping over them; Robin, off to the right, rolls a skate's
  // length toward them (ASIDE), her free arm up. There she's clear of the close-up of the strategist that follows; the
  // rules start from there. Sam walks back to the gate.
  const ASIDE = [HOME[0] + 17, HOME[1]];
  beat({
    name: 'thanks', dur: 2.5,
    moves: (t) => ({ mc: glide([HOME, ASIDE], t, 0.2, 'flair', 0, 'emcee', 0), sam: trip(samBack, t, 0.3, 'walk', SAM_AT.dir) }),
    shot: () => STANDS_BLUE,
    cheer: (t) => lerp(0.6, 1, seg(t, 0, 0.4)),
    over: (t, c, g) => {
      sweep(g, c.T, 1);
      bars(1);
    },
    say: says('mc', pages(
      ['THANK YOU, VOLUNTEERS AND SPONSORS!', 'NOW MAKE SOME NOISE FOR EVERY TEAM!'],
    )),
  });

  // 5. herTurn: back to the reps; she turns to you, board in hand, in half light: the spill off the field, and the
  // knot by the gate in the dark in front of her.
  beat({
    name: 'herTurn', dur: 2.0,
    moves: (t) => ({ '5026': still(HER.x, HER.y, turn(4, 0, t - 0.3)), mc: still(ASIDE[0], ASIDE[1], 0, 'stand') }),
    shot: () => HER_SHOT,
    cheer: (t) => lerp(1, 0.15, seg(t, 0, 0.6)),
    light: (t, all) => house([...pools(), micSpot(), on(all.mc), on(HER, 0.5)]),
    say: says('5026', pages(
      ['RANKED ELEVENTH. WE NEED A CAPTAIN', 'TO PICK US. DEEP BREATH.'],
    ), 0.3),
  });

  // 6 to 10. rules: Robin explains the rules a page at a time, skating the order the picks go in along the empty arc
  // under the page that says it, her follow spot going with her from pool to pool. Each page is a beat of its own, so
  // however fast the pages are read, each skate goes with its own words: out to sign 1 as she says who the captains are
  // (rules), sign 1 to sign 8 for round one (roundOne), back from 8 to 1 for round two (roundTwo), home beside the mic
  // as she says a captain can invite any team ranked below them (anyBelow), and the last rule from there (turnDown).
  // The camera follows her. After the first, each skate sets off as far into its beat as follow() looks ahead, so the
  // view runs on from one beat into the next without a jump, and each beat lasts till the view has settled after she
  // stops; their words come up straight away, so the box stays up. As she sets off, Sam steps back from the gate into
  // the lane between the waiting reps and her (SAM_LANE), out of the way of the captains about to come through it and
  // of everyone walking the front of the line from now on.
  /** How long follow() takes to come to rest once she stops, and how far ahead it looks. */
  const SETTLE = 0.5, LOOK = 0.7;
  const ARC = SPOTS.map((_, i) => onArc(i)), ARC_BACK = [...ARC].reverse();
  const RULES = [
    { name: 'rules', go: 0.6, at: 0.3, path: [ASIDE, [HOME[0] + 4, 124], ...ARC_BACK.slice(4)],
      page: ["HERE'S HOW IT WORKS: OUR TOP EIGHT", 'SEEDS ARE THE ALLIANCE CAPTAINS.'] },
    { name: 'roundOne', path: ARC, page: ['ROUND ONE PICKS IN ORDER,', 'ONE TO EIGHT.'] },
    { name: 'roundTwo', path: ARC_BACK, page: ['ROUND TWO GOES BACK,', 'EIGHT TO ONE.'] },
    { name: 'anyBelow', path: [...ARC.slice(0, 4), [HOME[0] - 6, 124], HOME], face: HOME_DIR,
      page: ['A CAPTAIN CAN INVITE ANY TEAM RANKED', 'BELOW THEM. EVEN ANOTHER CAPTAIN!'] },
    { name: 'turnDown', path: null, page: ['TURN AN INVITE DOWN AND NOBODY ELSE', 'CAN PICK YOU. AND WATCH THE CLOCK!'] },
  ];
  const samLane = [pt(SAM_AT), [SAM_LANE.x, 156], pt(SAM_LANE)];
  for (const r of RULES) {
    const go = r.go ?? LOOK;
    const mcAt = (t) => (r.path ? glide(r.path, t, go, 'emcee', r.face ?? 0, 'emcee', 0) : still(HOME[0], HOME[1], HOME_DIR, 'emcee'));
    beat({
      name: r.name,
      dur: r.path ? go + timeOf(r.path, SKATE_SPEED) + SETTLE : 1.0,
      // She looks back at the field while Robin explains.
      moves: (t) => ({
        mc: mcAt(t), '5026': still(HER.x, HER.y, 4),
        ...(r === RULES[0] ? { sam: trip(samLane, t, 0, 'walk', SAM_LANE.dir) } : {}),
      }),
      shot: (t) => at1x(view(follow((u) => mcAt(u).x, t, 1.2, LOOK), LINE_VIEW)),
      cheer: () => 0.1,
      say: says('mc', pages(r.page), r.at ?? 0),
    });
  }

  // 11. captains: Robin calls the top eight out one by one, by seed, and each runs on through the gate and into the
  // light at their sign as she calls them, in single file: setting off so as to get there as their number types, but
  // never sooner than CAP_GAP after the one before (the ones for the far side of the mic have the furthest to go, so
  // they come in a little after their names). Left of the gate they run along in front of the arc; right of it they
  // pass in front of the mic and of Robin. The shot opens low, on the gate above the dialog box, rises to the line as
  // the first two get to their signs and follows along it as the rest come in.
  const CALL = pages(
    ["LET'S BRING OUT OUR CAPTAINS! YOUR", 'NUMBER ONE SEED, 4000! TWO, 2468!'],
    ['THREE, 3000! FOUR, 1357! FIVE, 7777!', 'SIX, 6417! SEVEN, 8086!'],
    ['AND NUMBER EIGHT, 5940! GIVE IT UP', 'FOR YOUR ALLIANCE CAPTAINS!'],
  );
  const CALL_AT = 0.3;
  /** When a team's number has typed out in Robin's call, at the automatic pace. */
  const calledAt = (num) => {
    const k = CALL.findIndex((page) => page.join('').includes(num));
    if (k < 0) throw new Error(`cutscene.js: Robin never calls ${num} out`);
    return pageAt(CALL, CALL_AT, k) + (CALL[k].join('').indexOf(num) + num.length) / 40;
  };
  // Right of the mic they keep to FRONT till they're level with their sign, so they pass well in front of the captains
  // already standing there (their heads below those captains' faces), never across them; left of it, a step in front
  // of the arc.
  const capRun = FIRST_CAPTAINS.map((num, i) => {
    const s = slotOf(num), spot = capSpot(i);
    const around = spot.x > AT_MIC.x ? [[376, FRONT], [spot.x, FRONT]] : [[spot.x, passY(spot.x)]];
    return [[s.x, s.y], [s.x, TAPE], pt(GATE_OUT), pt(GATE_IN), ...around, [spot.x, spot.y]];
  });
  const CAP0 = 0.4, CAP_GAP = 0.45;
  const capGo = [];
  capRun.forEach((path, i) => capGo.push(Math.max(i ? capGo[i - 1] + CAP_GAP : CAP0, calledAt(FIRST_CAPTAINS[i]) - timeOf(path, SPEEDS.run))));
  /** Low enough that the gate (rows 134-152) and the runners' faces are above the dialog box. */
  const GATE_VIEW = 62;
  const capIn = capRun.map((path, i) => capGo[i] + timeOf(path, SPEEDS.run));
  const CAPS_IN = capIn[capIn.length - 1];
  beat({
    name: 'captains', dur: CAPS_IN + 0.5,
    moves: (t) => Object.fromEntries(FIRST_CAPTAINS.map((num, i) => [num, trip(capRun[i], t, capGo[i], 'run', 0)])),
    shot: (t) => at1x(view(lerp(BLUE_SIDE.x, RED_SIDE.x, easeInOut(seg(t, capIn[3], CAPS_IN))), lerp(GATE_VIEW, LINE_VIEW, easeInOut(seg(t, 1.0, capIn[1] + 0.6))))),
    cheer: (t) => lerp(0.1, 0.7, seg(t, 0.3, 1.5)),
    board: (t) => chart(captains(FIRST_CAPTAINS.map((num, i) => (t >= capIn[i] ? num : '')))),
    say: says('mc', CALL, CALL_AT),
  });

  // 12. clock1: Alliance One's captain walks to the mic under a follow spot, from the far end of the arc, and the clock
  // starts on "you are on the clock": a cut to the display as it starts counting, Alliance One's row lit, and back as
  // she gets to the mic. The beat lasts till she's there (AT_MIC1).
  const firstUp = [pt(capSpot(0)), [SPOTS[0] + 4, passY(SPOTS[0] + 4)], [AT_MIC.x - 8, passY(AT_MIC.x - 8)], pt(AT_MIC)];
  const ON_BOARD = [1.9, 3.5], AT_MIC1 = 0.2 + timeOf(firstUp, SPEEDS.walk);
  const clock1 = beat({
    name: 'clock1', dur: AT_MIC1 + 0.3,
    moves: (t) => ({ '4000': trip(firstUp, t, 0.2, 'walk', 0) }),
    shot: (t) => at1x(t >= ON_BOARD[0] && t < ON_BOARD[1] ? BOARD_SHOT : pan(BLUE_SIDE, MIDDLE, seg(t, 0.3, AT_MIC1))),
    cheer: () => 0.2,
    light: (t, all) => house([...pools(), micSpot(), on(all.mc), on(all['4000'])]),
    board: (t) => chart(captains(FIRST_CAPTAINS), 0, PICK_CLOCK - Math.max(0, t - clock1Starts)),
    say: says('mc', pages(
      ["ALLIANCE ONE, WHEN YOU'RE READY,", 'COME ON UP. YOU ARE ON THE CLOCK!'],
    )),
  });
  const clock1Starts = clock1.say.at + chars(clock1.say.lines[0]) / 40;
  const clock1Left = PICK_CLOCK - (autoEnd(clock1) - clock1Starts);

  // 13. invite1: close on the captain at the mic: Alliance One invites 2468, the clock stops, Robin turns to listen, and
  // the line's spotlights dim to a glimmer while the invitation's made, so the two of them are the only ones in the
  // light. The shot sits high enough that everyone waiting in front of the field (Sam by the gate, her at the front)
  // is behind the dialog box, so the words start with the cut; the captains of Four and Five stand either side, in
  // the dark.
  const AT_MIC_SHOT = closeUp(AT_MIC.x + 6, 84);
  const MIC_ONLY = (t, all) => house([...pools(0.25), micSpot(), on(all.mc)]);
  const invite1 = beat({
    name: 'invite1', dur: 2.5,
    moves: mcPose('stand', 7),
    shot: () => AT_MIC_SHOT,
    cheer: () => 0.1,
    light: MIC_ONLY,
    board: (t) => chart(captains(FIRST_CAPTAINS), 0, clock1Left - Math.min(t, invite1.say.at)),
    say: says('4000', pages(
      ['TEAM 4000 RESPECTFULLY INVITES', 'TEAM 2468 TO JOIN OUR ALLIANCE.'],
    ), 0),
  });
  const clockStopped1 = clock1Left - invite1.say.at;

  // 14. joinOrForm: 2468 is a captain, so Robin skates over (in front of the mic and the captain at it, and of 3000's)
  // and holds the mic out to them. She stops nearly level with them, so the mic she holds out comes up by their chin.
  const BY_THEO = [SPOTS[1] + 17, capSpot(1).y + 2];
  /** Past 3000's captain, a step in front of their feet, before she turns in to 2468. */
  const PAST_LENA = [SPOTS[2] - 10, passY(SPOTS[2] - 10)];
  const toTheo = [HOME, [HOME[0] - 2, FRONT], [376, FRONT], PAST_LENA, BY_THEO];
  const TO_THEO = 0.2;
  beat({
    name: 'joinOrForm', dur: 3.5,
    moves: (t) => ({ mc: glide(toTheo, t, TO_THEO, 'offer', 6, 'stand', 7) }),
    shot: (t) => at1x(pan(MIDDLE, BLUE_SIDE, seg(t, 0.3, 2.0))),
    cheer: () => 0.15,
    board: () => chart(captains(FIRST_CAPTAINS), 0, clockStopped1),
    say: says('mc', pages(
      ['2468, WOULD YOU PREFER TO JOIN', 'OR FORM YOUR OWN ALLIANCE?'],
    ), 1.0),
  });

  // 15. accept1: close on 2468's captain and Robin, in 2468's pool.
  beat({
    name: 'accept1', dur: 2.5,
    shot: () => closeUp(SPOTS[1] + 8, 97),
    cheer: (t) => (t < 0.6 ? 0.15 : 1),
    board: () => chart(captains(FIRST_CAPTAINS), 0, clockStopped1),
    say: says('2468', pages(
      ["TEAM 2468 ACCEPTS! LET'S GO, 4000!"],
    )),
  });

  // 16. moveUp: 2468 steps behind Alliance One's sign as its first pick; captains 3 to 8 each move up a spot along the
  // arc, out of one pool and into the next, and 9152, ranked ninth, runs on as the new number eight under a follow
  // spot, once the line has settled: up out of the knots, through the gate and along in front of the mic (Sam, in
  // the lane, is well out of his way). Robin skates home; Alliance One's captain walks back last, once 9152 is past
  // the mic, so nobody walks along in step in front of anyone and no two people on the move are ever in the same
  // column. The one captain whose step crosses the mic's gap (7777, spot 5 to 4) goes round behind Robin's spot, the
  // mic and the captain still at it, along the picks' empty row (in front of the cargo ship), his face over their
  // heads, and in to his new spot clear of sign 4's post; he sets off first, so he's past Robin's spot before she
  // skates home onto it. The view follows the line along as the captains settle.
  const theoBack = [pt(capSpot(1)), [pickSpot(0, 1).x + 2, capSpot(1).y], pt(pickSpot(0, 1))];
  const mcBack = [BY_THEO, PAST_LENA, [376, FRONT], [HOME[0] - 2, FRONT], HOME];
  const SHIFT0 = 1.0, SHIFT_GAP = 0.1, IKE0 = 1.7, CROSS0 = 0.6;
  const shifters = FIRST_CAPTAINS.slice(2); // 3000 to 5940, from spots 3-8 to 2-7
  const crosses = (k) => capSpot(k + 2).x > AT_MIC.x && capSpot(k + 1).x < AT_MIC.x;
  /** When each moves up on the display, one after the other; and when they set off (the one crossing first). */
  const shiftAt = (k) => SHIFT0 + k * SHIFT_GAP;
  const stepAt = (k) => (crosses(k) ? CROSS0 : shiftAt(k));
  const shiftPath = (k) => (crosses(k)
    ? [pt(capSpot(k + 2)), [SPOTS[k + 2] - 6, signY(k + 2)], [SPOTS[k + 1] + SIGN_POST + 5, signY(k + 1)], pt(capSpot(k + 1))]
    : [pt(capSpot(k + 2)), pt(capSpot(k + 1))]);
  const ikeSlot = slotOf('9152');
  const ikeRun = [[ikeSlot.x, ikeSlot.y], [ikeSlot.x, TAPE], pt(GATE_OUT), pt(GATE_IN), [376, FRONT],
    [SPOTS[7], FRONT], pt(capSpot(7))];
  const MAYA0 = reaches(ikeRun, 4, IKE0, 'run') + 0.4;
  const mayaBack = [pt(AT_MIC), [AT_MIC.x - 6, passY(AT_MIC.x - 6)], [SPOTS[0] + 6, passY(SPOTS[0] + 6)], pt(capSpot(0))];
  beat({
    name: 'moveUp', dur: 6.5,
    moves: (t) => ({
      '2468': trip(theoBack, t, 0.5, 'walk', 0),
      mc: glide(mcBack, t, 0.3, 'emcee', HOME_DIR, 'offer', 6),
      ...Object.fromEntries(shifters.map((num, k) => [num, trip(shiftPath(k), t, stepAt(k), 'walk', 0, 0)])),
      '9152': trip(ikeRun, t, IKE0, 'run', 0, 4),
      '4000': trip(mayaBack, t, MAYA0, 'walk', 0, 0),
    }),
    shot: (t) => at1x(pan(BLUE_SIDE, RED_SIDE, seg(t, 2.4, 6.3))),
    cheer: (t) => lerp(1, 0.5, seg(t, 0.5, 5)),
    light: (t, all) => house([...pools(), micSpot(), on(all.mc), ...(t >= IKE0 ? [on(all['9152'])] : [])]),
    board: (t) => {
      const caps = ['4000', ...shifters.map((num, k) => (t >= shiftAt(k) ? num : '')), t >= IKE0 ? '9152' : ''];
      return chart(captains(caps, { 0: ['2468', ''] }));
    },
    say: says('mc', pages(
      ['CONGRATULATIONS! EVERY CAPTAIN BELOW', 'MOVES UP, AND 9152 IS NOW NUMBER 8!'],
    ), 0.5),
  });
  const CAPS2 = ['4000', ...shifters, '9152'];
  const PICKS2 = { 0: ['2468', ''] };

  // 17. clock2: Alliance Two's captain walks to the mic under a follow spot.
  const secondUp = [pt(capSpot(1)), [SPOTS[1] + 4, passY(SPOTS[1] + 4)], [AT_MIC.x - 8, passY(AT_MIC.x - 8)], pt(AT_MIC)];
  const clock2 = beat({
    name: 'clock2', dur: 4.5,
    moves: (t) => ({ '3000': trip(secondUp, t, 0.3, 'walk', 0), mc: still(HOME[0], HOME[1], HOME_DIR, 'emcee') }),
    shot: (t) => at1x(pan(RED_SIDE, MIDDLE, seg(t, 0, 2.4))),
    cheer: () => 0.2,
    light: (t, all) => house([...pools(), micSpot(), on(all.mc), on(all['3000'])]),
    board: (t) => chart(captains(CAPS2, PICKS2), 1, PICK_CLOCK - Math.max(0, t - clock2Starts)),
    say: says('mc', pages(
      ['ALLIANCE TWO, COME ON UP TO THE MIC.', 'YOU ARE ON THE CLOCK!'],
    )),
  });
  const clock2Starts = clock2.say.at + chars(clock2.say.lines[0]) / 40;
  const clock2Left = PICK_CLOCK - (autoEnd(clock2) - clock2Starts);

  // 18. invite2: over her shoulder, waiting in the dark: the back of her head and her shoulders big in the bottom left
  // corner, and past them, close, Alliance Two's captain at the mic two thirds of the way across, in the light, the
  // line dimmed to a glimmer. A moment's quiet, then Alliance Two invites 5026. Meanwhile, behind the dialog box and out of the close-up, Sam comes out of the
  // lane to the gate's left, to make way for Robin going through it.
  const OVER_SHOULDER = closeUp(AT_MIC.x - 20, 84);
  const samBackAside = [pt(SAM_LANE), [SAM_LANE.x, 156], pt(SAM_ASIDE)];
  const invite2 = beat({
    name: 'invite2', dur: 2.5,
    moves: (t) => ({ ...mcPose('stand', 7)(), sam: trip(samBackAside, t, 0, 'walk', SAM_ASIDE.dir) }),
    shot: () => OVER_SHOULDER,
    cheer: () => 0.15,
    light: MIC_ONLY,
    over: (t, c, g) => {
      overShoulder(g, 30, 30);
      bars(1);
    },
    board: (t) => chart(captains(CAPS2, PICKS2), 1, clock2Left - Math.min(t, invite2.say.at)),
    say: says('3000', pages(
      ['TEAM 3000 RESPECTFULLY INVITES', 'TEAM 5026 TO JOIN OUR ALLIANCE!'],
    ), 0.6),
  });
  const clockStopped2 = clock2Left - invite2.say.at;

  // 19. mcToHer: a hard cut to her, close, in the dark at the front corner by the gate, her back to you, and a
  // spotlight slams on over her (FOUND), in one step; she turns round into it. Then wide (FOUND_SHOT): Robin skates
  // out under her follow spot, through the gate at the top of the shot, swings
  // round in front of her (18 pixels in front of her feet, so she passes rather than brushes by), on to the open floor
  // on her right, and holds out the mic; she turns as Robin passes and steps out of the crowd to it, her spotlight
  // going with her. They meet a few steps along to her right, far enough that the close-up of them leaves out the mic
  // stand and Alliance Two's captain at it, with each head between two of the near wall's posts (432, 464 and 496
  // here), and a couple of steps forward of her waiting place, so the film bar covers the captains' feet on the line
  // above their heads and the belt barrier in front of their own: she stands at MEET, Robin a skate's length to her
  // right. Sam waits on the gate's left (SAM_ASIDE).
  const MEET = [HER.x + 60, HER.y + 16], MC_BY_HER = [MEET[0] + 22, MEET[1] + 1];
  /**
   * Close on her as the light comes on, her head a quarter of the way down, the knot by the gate in the dark at the
   * left edge; then wide, on her and the way Robin comes: the gate at the top left, her a third of the way across,
   * room on her right.
   */
  const FOUND_CLOSE = closeUp(HER.x + 8, HER.y - 28), FOUND_SHOT = view(HER.x - 92, REPS_SHOT.y);
  /** The lane up the gap between the waiting crowd and her place, to and from the gate. */
  const LANE = [HER.x - 20, HER.y - 4];
  const toHer = [HOME, [HOME[0] - 2, FRONT], [376, FRONT], pt(GATE_IN), pt(GATE_OUT), LANE,
    [HER.x - 14, HER.y + 18], [HER.x + 22, HER.y + 18], MC_BY_HER];
  const TO_HER = 0.6, FOUND = 0.3, WIDE = 1.5;
  /**
   * She turns round into the light as it comes on, to Robin as Robin passes in front of her, and sets off after her
   * once she's by.
   */
  const HER_TURNS = reaches(toHer, 6, TO_HER, 'skate'), HER_STEPS = reaches(toHer, 7, TO_HER, 'skate') + 0.1;
  const herDir = (t) => (t < HER_TURNS ? turn(4, 0, t - FOUND - 0.25) : turn(0, 2, t - HER_TURNS));
  const herStep = [[HER.x, HER.y], MEET];
  const MET = HER_STEPS + timeOf(herStep, SPEEDS.walk);
  beat({
    name: 'mcToHer', dur: Math.max(4.5, MET + 0.5), hold: WIDE,
    moves: (t) => ({
      mc: glide(toHer, t, TO_HER, 'offer', 6, 'stand', 7),
      '5026': t < HER_STEPS ? still(HER.x, HER.y, herDir(t)) : trip(herStep, t, HER_STEPS, 'walk', 2),
    }),
    shot: (t) => (t < WIDE ? FOUND_CLOSE : at1x(FOUND_SHOT)),
    cheer: (t) => (t < FOUND ? 0.15 : 0.6),
    light: (t, all) => house([...pools(), micSpot(), on(all.mc), on(all['5026'], t >= FOUND ? 1 : 0, 12)]),
    board: () => chart(captains(CAPS2, PICKS2), 1, clockStopped2),
  });

  // 20. accept2: close on the two of them in their spotlights, the mic held out, the near wall behind their heads: she
  // accepts, and Robin congratulates her, as the MC does after every accepted invitation.
  const HERS = (t, all) => house([...pools(), micSpot(), on(all.mc), on(all['5026'], 1, 12)]);
  beat({
    name: 'accept2', dur: 2.5,
    // The window's top row is the one under the captains' shadows on the line, so the film bar covers them.
    shot: () => closeUp(MEET[0] + 11, MEET[1] - 25),
    cheer: (t) => lerp(0.3, 1, seg(t, 0.6, 1.0)),
    light: HERS,
    board: () => chart(captains(CAPS2, PICKS2), 1, clockStopped2),
    say: says('5026', pages(
      ['TEAM 5026 ACCEPTS! THANK YOU, 3000!'],
      { name: MC_NAME, lines: ['CONGRATULATIONS, 5026!', 'HEAD ON OUT TO ALLIANCE TWO!'], tag: C.blue1, look: lookFor('mc'), faceGait: 'emcee' },
    )),
  });

  // 21. sheRunsOn: she runs on through the gate and into her alliance's pool at her captain's left, her spotlight
  // going with her; Robin rolls after her and home; the captain walks back to the sign. Each of them crosses the
  // gate's column on their own: she comes up through it and runs off left along in front of the arc, and the captain
  // sets off from the mic once she's by, so she's well ahead (she runs, the captain walks) and never over her; Robin
  // follows through the gate once the captain is past it. Sam walks off to the left of everyone's way (SAM_FAR)
  // before she comes through.
  const herRun = [MEET, LANE, pt(GATE_OUT), pt(GATE_IN), [SPOTS[2] - 10, passY(SPOTS[2] - 10)], pt(pickSpot(1, 1))];
  const mcHome = [MC_BY_HER, LANE, pt(GATE_OUT), pt(GATE_IN), [376, FRONT], [HOME[0] - 2, FRONT], HOME];
  const lenaBack = [pt(AT_MIC), [AT_MIC.x - 6, passY(AT_MIC.x - 6)], [SPOTS[1] + 4, passY(SPOTS[1] + 4)], pt(capSpot(1))];
  const RUN0 = 0.3, LENA0 = 1.4, MC0 = 1.7;
  beat({
    name: 'sheRunsOn', dur: Math.max(4.0, LENA0 + timeOf(lenaBack, SPEEDS.walk) + 0.2, MC0 + timeOf(mcHome, SKATE_SPEED) + 0.2),
    moves: (t) => ({
      mc: glide(mcHome, t, MC0, 'emcee', HOME_DIR, 'offer', 6),
      '5026': trip(herRun, t, RUN0, 'run', 0, 2),
      '3000': trip(lenaBack, t, LENA0, 'walk', 0, 0),
      sam: trip([pt(SAM_ASIDE), pt(SAM_FAR)], t, 0, 'walk', SAM_FAR.dir),
    }),
    shot: (t) => at1x(pan(FOUND_SHOT, BLUE_SIDE, seg(t, 0.3, 3.6))),
    cheer: (t) => lerp(1, 0.5, seg(t, 0.5, 3.5)),
    light: (t, all) => house([...pools(), micSpot(), on(all.mc), on(all['5026'], 1, 12), on(all['3000'])]),
    board: () => chart(captains(CAPS2, { ...PICKS2, 1: ['5026', ''] })),
  });

  // 22. later: a four-step fade to black and back, and round two is over: everyone where it leaves them.
  const FINAL = finale(crowd);
  /** When the screen is black: everyone jumps to where it leaves them. */
  const BLACK = 0.8;
  beat({
    name: 'later', dur: 1.6,
    moves: (t) => (t < BLACK ? {} : FINAL),
    end: FINAL,
    shot: (t) => at1x(t < BLACK ? BLUE_SIDE : view(BLUE_SIDE.x + 20, LINE_VIEW)),
    cheer: (t) => (t < BLACK ? 0.5 : 0.3),
    board: (t) => (t < BLACK ? chart(captains(CAPS2, { ...PICKS2, 1: ['5026', ''] })) : FULL),
    over: (t) => {
      cover(t < BLACK ? seg(t, 0, 0.6) : 1 - seg(t, 0.9, 1.6));
      bars(1);
    },
  });

  // 23. alliances: a roll call. Close on each alliance in turn, One to Eight, a hard cut to each, its own spotlight
  // full and the rest of the line down to a glimmer, so each of them stands alone in the dark for a moment: the three
  // faces over the dialog box, its number just under the top film bar. The last holds while the words finish.
  const ROLL = 0.6;
  const rolled = (t) => Math.min(7, Math.floor(t / ROLL));
  beat({
    name: 'alliances', dur: 8 * ROLL,
    moves: mcPose('emcee', HOME_DIR),
    shot: (t) => closeUp(SPOTS[rolled(t)], capSpot(rolled(t)).y - 34),
    cheer: (t) => lerp(0.3, 0.7, seg(t, 0.3, 1.2)),
    light: (t, all) => house([...pools((i) => (i === rolled(t) ? 1 : 0)), micSpot(0), on(all.mc, 0)]),
    board: () => FULL,
    say: says('mc', pages(
      ["AND THAT'S ROUND TWO! PLEASE WELCOME", 'YOUR EIGHT PLAYOFF ALLIANCES!'],
    ), 0.3),
  });

  // 24. backups: the display, lit in the dark, the backups on its last line.
  beat({
    name: 'backups', dur: 2.5,
    moves: mcPose('emcee', HOME_DIR),
    shot: () => at1x(BACKUPS_SHOT),
    cheer: () => 0.3,
    board: () => FULL,
    say: says('mc', pages(
      ['THE BEST EIGHT TEAMS LEFT ARE BACKUPS,', 'CALLED IN BY RANK IF A ROBOT BREAKS.'],
    )),
  });

  // 25. applause: the whole arena, the stands on their feet over the line of alliances, and the house lights come
  // halfway up in two hard steps for the send-off (light.js AFTER): the stands and the floor out of the dark, the
  // alliances still in their pools, the way walking about has it.
  const UP0 = 0.3, UP1 = 1.3;
  beat({
    name: 'applause', dur: 3,
    moves: mcPose('flair'),
    shot: () => at1x(CROWD_SHOT),
    cheer: (t) => lerp(0.3, 1, seg(t, 0, 0.4)),
    light: (t, all) => house([...pools(), micSpot(), on(all.mc)], lerp(1, AFTER, seg(t, UP0, UP1))),
    board: () => FULL,
    over: (t, c, g) => {
      sweep(g, c.T, 1 - 0.5 * seg(t, UP0, UP1));
      bars(1);
    },
    say: says('mc', pages(
      ['A ROUND OF APPLAUSE FOR ALL OUR TEAMS!', "AND IF YOU WEREN'T SELECTED TODAY,"],
      ['PICK AN ALLIANCE TO CHEER ON, AND', 'BRING YOUR GRACIOUS PROFESSIONALISM!'],
    )),
  });

  // 26. out: from the same shot, down to walking's view, the film bars going, as she steps out of the line, clear of
  // her captain, walks along in front of the arc to the gate and out through it (the picks are free to go: the
  // captains stay for the head ref's briefing), and turns right on the floor in front, toward the way out, ready to
  // walk about, under the lights walking about has (light.js afterLights). The camera keeps her in frame all the way down: it sets off first, along to
  // the left and quickly (ALONG), so she's well inside the frame by the time she steps out, then down with her more
  // slowly. Its last frame is walking about's first, so A can't cut it short (hold): stage.js would put her on her
  // mark with a jump. SKIP still ends it at once.
  const stepOut = [pt(pickSpot(1, 1)), [SPOTS[1] - 18, pickSpot(1, 1).y + 1], [SPOTS[1] - 17, passY(SPOTS[1] - 17)],
    [SPOTS[2], passY(SPOTS[2])], pt(GATE_IN), pt(GATE_OUT), pt(START)];
  const OUT0 = 0.6, ALONG = 1.2, OFF = OUT0 + timeOf(stepOut, SPEEDS.walk), TURNED = OFF + 2 * TURN;
  const OUT = TURNED + 0.3;
  const outShot = (t) => view(lerp(CROWD_SHOT.x, WALK_VIEW.x, easeInOut(seg(t, 0, ALONG))),
    lerp(CROWD_SHOT.y, WALK_VIEW.y, easeInOut(seg(t, 0.2, OFF - 0.2))));
  beat({
    name: 'out', dur: OUT, hold: OUT,
    moves: (t) => ({ mc: still(HOME[0], HOME[1], HOME_DIR, 'emcee'), '5026': trip(stepOut, t, OUT0, 'walk', START.dir, 0) }),
    end: { ...FINAL, '5026': still(START.x, START.y, START.dir), mc: still(HOME[0], HOME[1], HOME_DIR, 'emcee') },
    shot: (t) => at1x(outShot(t)),
    // The stands settle back to cheering now and then on their own, as they do while she walks about.
    cheer: (t) => (t < 1.8 ? lerp(1, 0.1, seg(t, 0, 1.6)) : undefined),
    light: (t, all) => afterLights(all['5026'], all.mc),
    board: () => FULL,
    over: (t) => bars(1 - seg(t, 1.2, OFF - 0.6)),
  });

  // When each beat starts and how long it all takes at the automatic pace, for checking (from the console:
  // stage.scene.cutscene.map((b) => [b.name, b.at]) gives the ?at= times).
  let T = 0, A = 0;
  for (const b of beats) {
    b.at = T;
    b.autoAt = A;
    T += b.dur;
    A += autoEnd(b);
  }
  beats.total = T;
  beats.autoTotal = A;
  return beats;
}
