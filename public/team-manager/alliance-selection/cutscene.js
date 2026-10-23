// The cut scene of alliance selection: Saturday lunchtime in the arena, the qualification matches over, the field empty
// and the stands full. It opens close on the crowd, cuts to the empty line of numbered signs and pans along it from 1
// to 8, then tilts down to the team reps waiting their turn in front of the field, the strategist at the front corner by the gate with her whiteboard, 5026's
// rep, ranked eleventh. MC Robin skates in along the front of the crowd in her pink blazer, through the gate and up to
// the mic, and lands it with a spin. She welcomes everyone, thanks the volunteers and sponsors, gets a cheer for every
// team, and explains the rules plainly while she skates the order the picks go in: the top eight are the captains,
// round one picks one to eight (sign 1 to sign 8) and round two eight to one (back again), a captain can invite any
// team ranked below them (even another captain), and a team that turns an invitation down can't be picked by anyone
// else. Then she calls the eight captains out by seed, and each runs on through the gate to their sign as she does.
// Then two picks, the way FIRST runs them. Alliance One's captain walks to the mic ("you are on the clock", and a cut to
// the display past the red end as its clock starts counting down from 45) and invites 2468, a captain; Robin skates over to 2468 with "would you prefer to
// join or form your own alliance?", 2468 accepts, and every captain below moves up a spot while 9152, ranked ninth,
// runs on as the new number eight. Alliance Two's captain invites 5026: Robin skates out through the gate, round in
// front of her to the open floor on her right and holds out the mic; she steps out to it, accepts, and runs onto the
// field to stand at her captain's left. A four-step fade skips to the
// end of round two: eight alliances of three across the field, the display full with the backups, the whole arena on
// its feet for every team, and a send-off that ends on the first frame of walking about.
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
// of their line (PASS), and nobody walks through anybody: Sam steps aside from the gate while 9152's rep runs through
// it, and again while Robin and the strategist go through it. While a page of words is up, the dialog box covers the
// bottom of the screen, so every shot with words keeps the faces in the top 88 rows: the shots along the line sit at
// LINE_VIEW, low enough that the signs clear the top film bar, and the captains' run on opens lower, on the gate, while
// Robin calls them out.
//
//   makeCutscene({ drawWorld, lookOf, crowd })   the 22 beats, in stage.js's form ({ dur, draw(g, t, c), say })
// drawWorld(g, view, t, frame) is the scene's: the whole world at 1x into g, seen from view = { x, y } (whole pixels),
// t the cut scene's clock, and frame = { people: [{ x, y, dir, gait, dist, look, skater }], cheer: 0 to 1 or undefined,
// board: { rows: eight [captain, pick, pick] ('' for nobody yet), hot: 0-7 or null, clock: seconds or null, backups:
// [numbers] or null } }. Robin's entry has skater: true (her glide steps with dist, not like a walk). lookOf(key) is a
// walker look for '5026', any team number, 'priya', 'sam', 'ref' or 'mc'. crowd (optional) is everyone standing once it's over,
// as { id, x, y, dir } (people.js CROWD), so the last frame stands everyone exactly as walking about does; without it
// they stand as layout.js says, facing you. The close-ups draw a 1x view into a 256x144 canvas of their own and copy a
// 128x72 window of it up to the screen at 2x, crisp.

import { W, H, C, useContext, screen, clamp, lerp, seg, easeInOut } from '../pixel.js';
import { placeCard, bars, cover, along } from '../stage.js';
import { HERO_NAME } from '../cast.js';
import {
  WORLD, SPOTS, LINE_Y, capSpot, pickSpot, AT_MIC, MC_HOME, GATE_OUT, GATE_IN, waitSlot, PRIYA_AT, SAM_AT, SAM_ASIDE,
  REF_AT, START, backupSpot, DECLINED_AT, SKATE_SPEED, MC_NAME, repTag, FIRST_CAPTAINS, ALLIANCES, DECLINED, BACKUPS, WAITING,
  SIGN_POST, walkView,
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
 * The shots along the line: the signs' panels well clear of the top film bar, the captains' feet at row 85 and Robin's
 * at 92, the waiting reps' heads along the bottom; with words up, every face stays above the dialog box.
 */
const LINE_VIEW = 35;
/**
 * The arena with the line full: the stands on their feet over all eight alliances, the faces along the line just
 * clear of the dialog box (seen from 12 rows higher, the box would cover them).
 */
const CROWD_SHOT = view(264, 0);
/**
 * Along the empty line as it opens, the stands above it: from signs 1 to 6 whole (sign 1 at the left edge, the place
 * card nowhere near) to signs 3 to 8 whole (sign 8 at the right edge), so every sign is seen whole. The eight of them
 * are 294 pixels end to end, more than the screen's 256, so no 1x view holds them all at once.
 */
const LINE_FROM = view(SPOTS[0] - 15, ABOVE, ABOVE), LINE_TO = view(SPOTS[7] + 15 - W, ABOVE, ABOVE);
/**
 * The crowd, close, at 2x: the front row of fans across the frame above the dialog box, as high as the world goes so
 * the film bar doesn't cut their hands off, past the blue end of the field, clear of the signs, the rocket and the
 * alliance wall's tall end pillar (x 173). As it opens, the camera drifts a little along them.
 */
const STANDS_BLUE = { focus: { x: 100, y: 36 }, zoom: 2 };
const standsDrift = (k) => ({ focus: { x: Math.round(lerp(84, 104, easeInOut(clamp(k, 0, 1)))), y: 36 }, zoom: 2 });
/** The reps waiting in front of the field, as far down as the camera goes, her feet at row 98. */
const REPS_SHOT = view(230, 64);
/**
 * Her, turning to you, close: twice the size, two thirds of the way across, Sam by the gate behind her, and Robin (a
 * skate's length right of her spot by the mic, ASIDE) just out of shot to the right.
 */
const HER_SHOT = { focus: { x: waitSlot(0).x - 41, y: 130 }, zoom: 2 };
/**
 * The audience display past the red end, its header just under the film bar: as far right as the view goes without
 * cutting anyone at its left edge, Alliance Eight whole there (Alliance Seven's right pick ends at x 513). From the top
 * of the world, so the front row of the stands above it shows its faces under the bar, and the backups' last line still
 * ends above the dialog box.
 */
const BOARD_SHOT = view(514, 0);
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
 * Draw a shot: { view } at 1x, or { focus, zoom: 2 }, a 128x72 window centred on the world point focus, at 2x (the 1x
 * view round it clamped to the world, the window to that view), copied crisp at whole-pixel offsets.
 */
function shoot(g, shot, T, frame, drawWorld) {
  if (!shot.zoom) {
    drawWorld(g, shot.view, T, frame);
    return;
  }
  const lc = lensCanvas(), lg = lc.getContext('2d');
  const v = view(shot.focus.x - W / 2, shot.focus.y - H / 2);
  lg.imageSmoothingEnabled = false;
  lg.fillStyle = C.ink;
  lg.fillRect(0, 0, W, H);
  drawWorld(lg, v, T, frame);
  const sx = clamp(Math.round(shot.focus.x - W / 4 - v.x), 0, W / 2), sy = clamp(Math.round(shot.focus.y - H / 4 - v.y), 0, H / 2);
  g.imageSmoothingEnabled = false;
  g.drawImage(lc, sx, sy, W / 2, H / 2, 0, 0, W, H);
}
const at1x = (v) => ({ view: v });
const closeUp = (x, y) => ({ focus: { x, y }, zoom: 2 });

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
/** Passing the mic on its near side: 8 pixels nearer than its foot (MIC.y 128), clear of whoever stands at it. */
const FRONT = 136;
/** Walking along in front of the captains' line: a step nearer than their feet (LINE_Y 120). */
const PASS = LINE_Y + 8;
/** Stepping out of the waiting crowd: the taped line, a step in front of its front row. */
const TAPE = 158;
const slotOf = (num) => waitSlot(WAITING.indexOf(num));
/** The waiting reps face the field, but a few have turned to chat (WAITING index: direction). */
const CHAT = { 12: 6, 13: 2, 17: 3, 24: 6, 25: 2, 30: 5 };

/** Everyone as the scene opens: the reps in their waiting places, Priya, Sam and the head ref at work, Robin off past the right. */
function opening(entry) {
  const out = {};
  WAITING.forEach((num, n) => {
    const s = waitSlot(n);
    out[num] = still(s.x, s.y, CHAT[n] ?? 4);
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
const chars = (page) => page.join('').length;
/** How long stage.js takes over a page when the pages turn by themselves: typing at 40 a second, then a pause. */
const pageTime = (page) => chars(page) / 40 + 1.2 + chars(page) * 0.035;
/** When page k of a beat's words comes up at that pace, the words starting `at` seconds into the beat. */
const pageAt = (lines, at, k) => at + lines.slice(0, k).reduce((n, p) => n + pageTime(p), 0);

/**
 * The beats (stage.js), 22 of them: open, mcEnters, welcome, thanks, herTurn, rules, captains, clock1, invite1,
 * joinOrForm, accept1, moveUp, clock2, invite2, mcToHer, accept2, sheRunsOn, later, alliances, backups, applause, out.
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
  // crowd and her (16 pixels clear of the crowd's right-hand column, 20 of her), past Sam's feet to the gate, through
  // it, behind the mic (in front, she'd run into it) and round to her spot beside it.
  const ENTRY = [[530, 194], [470, 192], [380, 190], [372, 180], [372, 160], pt(GATE_OUT), pt(GATE_IN), [372, 122], [400, 121], HOME];
  const beats = [];
  let places = opening(ENTRY);

  /**
   * One beat: from where the last left everyone, `moves(t)` says where whoever moves is t seconds in; shot(t) the
   * camera, board(t) the display, cheer(t) the stands, over(t, c) the cards and fades on top. The next beat starts
   * from where this one ends (or from `end`, everyone's places, if given).
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
        };
        shoot(g, o.shot(t), c.T, frame, drawWorld);
        useContext(g);
        screen();
        g.globalAlpha = 1;
        if (o.over) o.over(t, c);
        else bars(1);
      },
    };
    if (o.say) b.say = o.say;
    beats.push(b);
    return b;
  }
  /** When a beat with words is over at the automatic pace: its own length, or the words', whichever is longer. */
  const autoEnd = (b) => Math.max(b.dur, b.say ? (b.say.at ?? 0) + b.say.lines.reduce((n, p) => n + pageTime(p), 0) : 0);
  const mcPose = (gait, dir = 0) => () => ({ mc: still(HOME[0], HOME[1], dir, gait) });

  // 1. open: close on the crowd as it fades in; a cut to the arena, the stands over the empty line of signs, held on
  // signs 1 to 6 and panned along to 3 to 8; then down to the reps waiting in front of the field, the place card
  // sliding in as the camera settles on them, over the cargo ship and the empty floor (not over the crowd or the
  // signs), and out at the top left as Robin comes in from the right.
  const LINE_AT = 1.4, TILT_AT = 3.6, CARD_AT = 4.6;
  const card = (T) => placeCard(T - CARD_AT, 'ALLIANCE SELECTION', 'SATURDAY 12:40 PM'); // font 3 has no comma
  beat({
    name: 'open', dur: 5.5,
    shot: (t) => (t < LINE_AT ? standsDrift(t / LINE_AT) : at1x(t < TILT_AT
      ? pan(LINE_FROM, LINE_TO, seg(t, LINE_AT + 0.3, TILT_AT - 0.1))
      : pan(LINE_TO, REPS_SHOT, seg(t, TILT_AT, 5.4)))),
    cheer: (t) => (t < LINE_AT ? 0.4 : 0.15),
    over: (t, c) => {
      cover(1 - seg(t, 0, 0.8));
      card(c.T);
      bars(seg(t, 0, 0.6));
    },
  });

  // 2. mcEnters: Robin skates into the shot of the reps from the right, the camera picking her up and following her up
  // through the gate to the mic, and lands a spin. Sam sees her coming and steps aside from the gate (as he does
  // whenever anyone goes through it); he stays there, out of the close-up of Robin that follows, and walks back while
  // the camera's on the crowd.
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
  beat({
    name: 'mcEnters', dur: SPIN[1] + 0.4,
    moves: (t) => ({
      mc: mcIn(t),
      sam: trip(samAside, t, SAM_OFF, 'walk', SAM_ASIDE.dir, SAM_AT.dir),
    }),
    shot: (t) => at1x(view(Math.min(REPS_SHOT.x, follow((s) => mcIn(s).x, t)), lerp(REPS_SHOT.y, LINE_VIEW, easeInOut(seg(t, AT_GATE - 0.7, HOME_AT + 0.3))))),
    cheer: (t) => lerp(0.1, 0.9, seg(t, 2, SPIN[1])),
    // The place card from the opening, sliding out.
    over: (t, c) => {
      card(c.T);
      bars(1);
    },
  });

  // 3. welcome: close on Robin, mic up, the mic stand beside her, the two of them a little left of the middle, her head
  // high in the frame: the signs' panels are above it, under the top film bar (their posts go up out of the shot), and
  // Sam (stepped aside from the gate, below left) is well out of it. The words start with the cut, so the dialog box
  // covers the top of the strategist's head below.
  const WELCOME = closeUp(HOME[0] + 12, 99);
  beat({
    name: 'welcome', dur: 2.5,
    moves: mcPose('emcee'),
    shot: () => WELCOME,
    cheer: () => 0.6,
    say: says('mc', pages(
      ['WELCOME TO ALLIANCE SELECTION!', 'HOW ARE WE FEELING, EVERYBODY?!'],
    ), 0),
  });

  // 4. thanks: close on the crowd on its feet; Robin, off to the right, rolls a skate's length toward them (ASIDE), her
  // free arm up. There she's clear of the close-up of the strategist that follows; the rules start from there. Sam
  // walks back to the gate.
  const ASIDE = [HOME[0] + 17, HOME[1]];
  beat({
    name: 'thanks', dur: 2.5,
    moves: (t) => ({ mc: glide([HOME, ASIDE], t, 0.2, 'flair', 0, 'emcee', 0), sam: trip(samBack, t, 0.3, 'walk', SAM_AT.dir) }),
    shot: () => STANDS_BLUE,
    cheer: (t) => lerp(0.6, 1, seg(t, 0, 0.4)),
    say: says('mc', pages(
      ['THANK YOU, VOLUNTEERS AND SPONSORS!', 'NOW MAKE SOME NOISE FOR EVERY TEAM!'],
    )),
  });

  // 5. herTurn: back to the reps; she turns to you, board in hand.
  const HER = slotOf('5026');
  beat({
    name: 'herTurn', dur: 2.5,
    moves: (t) => ({ '5026': still(HER.x, HER.y, turn(4, 0, t - 0.3)), mc: still(ASIDE[0], ASIDE[1], 0, 'stand') }),
    shot: () => HER_SHOT,
    cheer: (t) => lerp(1, 0.15, seg(t, 0, 0.6)),
    say: says('5026', pages(
      ['RANKED ELEVENTH. WE NEED A CAPTAIN', 'TO PICK US. DEEP BREATH.'],
    ), 0.3),
  });

  // 6. rules: Robin skates out to sign 1 as she says who the captains are, then skates the order the picks go in, timed
  // to the pages as they turn by themselves: sign 1 to sign 8 as "round one, they pick one to eight" comes up, and once
  // she's there back from 8 to 1 for "round two goes back, eight to one"; then home beside the mic, before the last
  // page. The camera follows her.
  const RULES = pages(
    ["HERE'S HOW IT WORKS: OUR TOP EIGHT", 'SEEDS ARE THE ALLIANCE CAPTAINS.'],
    ['ROUND ONE, THEY PICK ONE TO EIGHT.', 'ROUND TWO GOES BACK, EIGHT TO ONE.'],
    ['A CAPTAIN CAN INVITE ANY TEAM RANKED', 'BELOW THEM. EVEN ANOTHER CAPTAIN!'],
    ['TURN AN INVITE DOWN AND NOBODY ELSE', 'CAN PICK YOU. AND WATCH THE CLOCK!'],
  );
  const RULES_AT = 0.3;
  const SIGN1 = [SPOTS[0], 122], SIGN8 = [SPOTS[7], 122];
  const R1 = [ASIDE, [HOME[0] + 4, 121], SIGN1], R2 = [SIGN1, SIGN8], R3 = [SIGN8, SIGN1], R4 = [SIGN1, [HOME[0] + 4, 121], HOME];
  /** When she sets off on each: R2 as the round order's page starts typing, R3 and R4 a moment after she pulls up. */
  const RT = [0.6, pageAt(RULES, RULES_AT, 1)];
  RT.push(RT[1] + timeOf(R2, SKATE_SPEED) + 0.4);
  RT.push(RT[2] + timeOf(R3, SKATE_SPEED) + 0.3);
  const RULES_HOME = RT[3] + timeOf(R4, SKATE_SPEED);
  if (RULES_HOME > pageAt(RULES, RULES_AT, 3)) throw new Error('cutscene.js: Robin should be home before the last rule');
  const rulesMc = (t) => {
    if (t < RT[1]) return glide(R1, t, RT[0], 'emcee', 0, 'emcee', 0);
    if (t < RT[2]) return glide(R2, t, RT[1], 'emcee', 0, 'emcee', 0);
    if (t < RT[3]) return glide(R3, t, RT[2], 'emcee', 0, 'emcee', 0);
    return glide(R4, t, RT[3], 'emcee', HOME_DIR, 'emcee', 0);
  };
  beat({
    // As long as her skate (so ?at= shows all of it and A can't cut it short); the last page holds on her at home.
    name: 'rules', dur: RULES_HOME + 0.6,
    // She looks back at the field while Robin explains.
    moves: (t) => ({ mc: rulesMc(t), '5026': still(HER.x, HER.y, 4) }),
    shot: (t) => at1x(view(follow((s) => rulesMc(s).x, t, 1.2, 0.7), LINE_VIEW)),
    cheer: () => 0.1,
    say: says('mc', RULES, RULES_AT),
  });

  // 7. captains: Robin calls the top eight out one by one, by seed, and each runs on through the gate to their sign as
  // she calls them, in single file: setting off so as to get there as their number types, but never sooner than
  // CAP_GAP after the one before (the ones for the far side of the mic have the furthest to go, so they come in a
  // little after their names). Right of the mic, they pass in front of it and of Robin. The shot opens low, on the
  // gate above the dialog box, rises to the line as the first two get to their signs and follows along it as the
  // rest come in.
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
  // already standing there (their heads below those captains' faces), never across them.
  const capRun = FIRST_CAPTAINS.map((num, i) => {
    const s = slotOf(num), spot = capSpot(i);
    const around = spot.x > AT_MIC.x ? [[376, FRONT], [spot.x, FRONT]] : [];
    return [[s.x, s.y], [s.x, TAPE], pt(GATE_OUT), pt(GATE_IN), ...around, [spot.x, 124], [spot.x, spot.y]];
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
    shot: (t) => at1x(view(lerp(200, 296, easeInOut(seg(t, capIn[3], CAPS_IN))), lerp(GATE_VIEW, LINE_VIEW, easeInOut(seg(t, 1.0, capIn[1] + 0.6))))),
    cheer: (t) => lerp(0.1, 0.7, seg(t, 0.3, 1.5)),
    board: (t) => chart(captains(FIRST_CAPTAINS.map((num, i) => (t >= capIn[i] ? num : '')))),
    say: says('mc', CALL, CALL_AT),
  });

  // 8. clock1: Alliance One's captain walks to the mic, and the clock starts on "you are on the clock": a cut to the
  // display as it starts counting, Alliance One's row lit, and back as she gets to the mic.
  const firstUp = [pt(capSpot(0)), [SPOTS[0] + 4, PASS], [AT_MIC.x - 8, PASS], pt(AT_MIC)];
  const ON_BOARD = [1.9, 3.5];
  const clock1 = beat({
    name: 'clock1', dur: 4.5,
    moves: (t) => ({ '4000': trip(firstUp, t, 0.2, 'walk', 0) }),
    shot: (t) => at1x(t >= ON_BOARD[0] && t < ON_BOARD[1] ? BOARD_SHOT : pan(view(296, LINE_VIEW), view(262, LINE_VIEW), seg(t, 0.3, 3.4))),
    cheer: () => 0.2,
    board: (t) => chart(captains(FIRST_CAPTAINS), 0, PICK_CLOCK - Math.max(0, t - clock1Starts)),
    say: says('mc', pages(
      ["ALLIANCE ONE, WHEN YOU'RE READY,", 'COME ON UP. YOU ARE ON THE CLOCK!'],
    )),
  });
  const clock1Starts = clock1.say.at + chars(clock1.say.lines[0]) / 40;
  const clock1Left = PICK_CLOCK - (autoEnd(clock1) - clock1Starts);

  // 9. invite1: close on the captain at the mic: Alliance One invites 2468, the clock stops, Robin turns to listen. The
  // shot sits high enough that everyone waiting in front of the field (Sam by the gate, her at the front) is behind the
  // dialog box, so the words start with the cut; signs 4 and 5 stand whole just under the top film bar.
  const AT_MIC_SHOT = closeUp(AT_MIC.x - 2, 85);
  const invite1 = beat({
    name: 'invite1', dur: 2.5,
    moves: mcPose('stand', 7),
    shot: () => AT_MIC_SHOT,
    cheer: () => 0.1,
    board: (t) => chart(captains(FIRST_CAPTAINS), 0, clock1Left - Math.min(t, invite1.say.at)),
    say: says('4000', pages(
      ['TEAM 4000 RESPECTFULLY INVITES', 'TEAM 2468 TO JOIN OUR ALLIANCE.'],
    ), 0),
  });
  const clockStopped1 = clock1Left - invite1.say.at;

  // 10. joinOrForm: 2468 is a captain, so Robin skates over (in front of the mic and the captain at it, and of 3000's)
  // and holds the mic out to them. She stops nearly level with them, so the mic she holds out comes up by their chin.
  const BY_THEO = [SPOTS[1] + 17, LINE_Y + 2];
  /** Past 3000's captain, a step in front of their feet, before she turns in to 2468. */
  const PAST_LENA = [SPOTS[2] - 10, 128];
  const toTheo = [HOME, [HOME[0] - 2, FRONT], [376, FRONT], PAST_LENA, BY_THEO];
  const TO_THEO = 0.2;
  beat({
    name: 'joinOrForm', dur: 3.5,
    moves: (t) => ({ mc: glide(toTheo, t, TO_THEO, 'offer', 6, 'stand', 7) }),
    shot: (t) => at1x(view(lerp(262, 200, easeInOut(seg(t, 0.3, 2.0))), LINE_VIEW)),
    cheer: () => 0.15,
    board: () => chart(captains(FIRST_CAPTAINS), 0, clockStopped1),
    say: says('mc', pages(
      ['2468, WOULD YOU PREFER TO JOIN', 'OR FORM YOUR OWN ALLIANCE?'],
    ), 1.0),
  });

  // 11. accept1: close on 2468's captain and Robin, Sam (by the gate) just out of shot to the right.
  beat({
    name: 'accept1', dur: 2.5,
    shot: () => closeUp(SPOTS[1] + 4, 97),
    cheer: (t) => (t < 0.6 ? 0.15 : 1),
    board: () => chart(captains(FIRST_CAPTAINS), 0, clockStopped1),
    say: says('2468', pages(
      ["TEAM 2468 ACCEPTS! LET'S GO, 4000!"],
    )),
  });

  // 12. moveUp: 2468 steps behind Alliance One's sign as its first pick; captains 3 to 8 each move up a spot, and 9152,
  // ranked ninth, runs on as the new number eight, once the line has settled: along the empty front row of the waiting
  // area, through the gate and along in front of the mic, Sam stepping aside from the gate till he's through. Robin
  // skates home; Alliance One's captain walks back last, once 9152 is past the mic, so nobody walks along in step in
  // front of anyone and no two people on the move are ever in the same column. The one captain whose step crosses the
  // mic's gap (7777, spot 5 to 4) goes round behind Robin's spot, the mic and the captain still at it, along the picks'
  // empty row (in front of the cargo ship), his face over their heads, and in to his new spot clear of sign 4's post;
  // he sets off first, so he's past Robin's spot before she skates home onto it. The view follows the line along as
  // the captains settle.
  const theoBack = [pt(capSpot(1)), [pickSpot(0, 1).x + 2, LINE_Y + 1], pt(pickSpot(0, 1))];
  const mcBack = [BY_THEO, PAST_LENA, [376, FRONT], [HOME[0] - 2, FRONT], HOME];
  const SHIFT0 = 1.0, SHIFT_GAP = 0.1, IKE0 = 1.7, CROSS0 = 0.6;
  const shifters = FIRST_CAPTAINS.slice(2); // 3000 to 5940, from spots 3-8 to 2-7
  const crosses = (k) => capSpot(k + 2).x > AT_MIC.x && capSpot(k + 1).x < AT_MIC.x;
  /** When each moves up on the display, one after the other; and when they set off (the one crossing first). */
  const shiftAt = (k) => SHIFT0 + k * SHIFT_GAP;
  const stepAt = (k) => (crosses(k) ? CROSS0 : shiftAt(k));
  const shiftPath = (k) => (crosses(k)
    ? [pt(capSpot(k + 2)), [SPOTS[k + 2] - 6, LINE_Y - 8], [SPOTS[k + 1] + SIGN_POST + 5, LINE_Y - 8], pt(capSpot(k + 1))]
    : [pt(capSpot(k + 2)), pt(capSpot(k + 1))]);
  const ikeSlot = slotOf('9152');
  const ikeRun = [[ikeSlot.x, ikeSlot.y], [GATE_OUT.x - 14, ikeSlot.y], pt(GATE_OUT), pt(GATE_IN), [376, FRONT],
    [SPOTS[7], FRONT], [SPOTS[7], 124], pt(capSpot(7))];
  const MAYA0 = reaches(ikeRun, 4, IKE0, 'run') + 0.4;
  const SAM_BACK = reaches(ikeRun, 3, IKE0, 'run') + 0.1;
  const mayaBack = [pt(AT_MIC), [AT_MIC.x - 6, PASS], [SPOTS[0] + 6, PASS], pt(capSpot(0))];
  beat({
    name: 'moveUp', dur: 6.5,
    moves: (t) => ({
      '2468': trip(theoBack, t, 0.5, 'walk', 0),
      mc: glide(mcBack, t, 0.3, 'emcee', HOME_DIR, 'offer', 6),
      ...Object.fromEntries(shifters.map((num, k) => [num, trip(shiftPath(k), t, stepAt(k), 'walk', 0, 0)])),
      '9152': trip(ikeRun, t, IKE0, 'run', 0, 4),
      '4000': trip(mayaBack, t, MAYA0, 'walk', 0, 0),
      sam: t < SAM_BACK ? trip(samAside, t, 0.9, 'walk', SAM_ASIDE.dir, SAM_AT.dir) : trip(samBack, t, SAM_BACK, 'walk', SAM_AT.dir),
    }),
    shot: (t) => at1x(pan(view(200, LINE_VIEW), view(300, LINE_VIEW), seg(t, 2.4, 6.3))),
    cheer: (t) => lerp(1, 0.5, seg(t, 0.5, 5)),
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

  // 13. clock2: Alliance Two's captain walks to the mic.
  const secondUp = [pt(capSpot(1)), [SPOTS[1] + 4, PASS], [AT_MIC.x - 8, PASS], pt(AT_MIC)];
  const clock2 = beat({
    name: 'clock2', dur: 4.5,
    moves: (t) => ({ '3000': trip(secondUp, t, 0.3, 'walk', 0), mc: still(HOME[0], HOME[1], HOME_DIR, 'emcee') }),
    shot: (t) => at1x(pan(view(300, LINE_VIEW), view(262, LINE_VIEW), seg(t, 0, 2.4))),
    cheer: () => 0.2,
    board: (t) => chart(captains(CAPS2, PICKS2), 1, PICK_CLOCK - Math.max(0, t - clock2Starts)),
    say: says('mc', pages(
      ['ALLIANCE TWO, COME ON UP TO THE MIC.', 'YOU ARE ON THE CLOCK!'],
    )),
  });
  const clock2Starts = clock2.say.at + chars(clock2.say.lines[0]) / 40;
  const clock2Left = PICK_CLOCK - (autoEnd(clock2) - clock2Starts);

  // 14. invite2: close on the mic: Alliance Two invites 5026.
  const invite2 = beat({
    name: 'invite2', dur: 2.5,
    moves: mcPose('stand', 7),
    shot: () => AT_MIC_SHOT,
    cheer: () => 0.15,
    board: (t) => chart(captains(CAPS2, PICKS2), 1, clock2Left - Math.min(t, invite2.say.at)),
    say: says('3000', pages(
      ['TEAM 3000 RESPECTFULLY INVITES', 'TEAM 5026 TO JOIN OUR ALLIANCE!'],
    ), 0),
  });
  const clockStopped2 = clock2Left - invite2.say.at;

  // 15. mcToHer: Robin skates out through the gate, swings round in front of her (18 pixels in front of her feet, so
  // she passes rather than brushes by), on to the open floor on her right, and holds out the mic; she turns as Robin
  // passes and steps out of the crowd to it. They meet where the mic stand (on the field behind them) is well clear of
  // both heads and of the mic between them, the near wall's posts stand clear of her and behind Robin, and a step
  // forward of her waiting place, so in the close-up their heads are below the captains' feet on the line: she stands
  // at MEET, Robin a skate's length to her right.
  const MEET = [HER.x + 34, HER.y + 10], MC_BY_HER = [MEET[0] + 22, MEET[1] + 1];
  /** The lane up the gap between the waiting crowd and her place, to and from the gate. */
  const LANE = [HER.x - 20, HER.y - 4];
  const toHer = [HOME, [HOME[0] - 2, FRONT], [376, FRONT], pt(GATE_IN), pt(GATE_OUT), LANE,
    [HER.x - 14, HER.y + 18], [HER.x + 22, HER.y + 18], MC_BY_HER];
  const TO_HER = 0.6;
  /** She turns to Robin as Robin passes in front of her, and sets off after her once she's by. */
  const HER_TURNS = reaches(toHer, 6, TO_HER, 'skate'), HER_STEPS = reaches(toHer, 7, TO_HER, 'skate') + 0.1;
  const herStep = [[HER.x, HER.y], MEET];
  const MET = HER_STEPS + timeOf(herStep, SPEEDS.walk);
  beat({
    name: 'mcToHer', dur: Math.max(4.5, MET + 0.5),
    moves: (t) => ({
      // Sam steps aside from the gate first, to make way, and stays there while she runs on, till the fade.
      sam: trip(samAside, t, 0.3, 'walk', SAM_ASIDE.dir, SAM_AT.dir),
      mc: glide(toHer, t, TO_HER, 'offer', 6, 'stand', 7),
      '5026': t < HER_STEPS ? still(HER.x, HER.y, turn(4, 2, t - HER_TURNS)) : trip(herStep, t, HER_STEPS, 'walk', 2),
    }),
    shot: (t) => at1x(pan(view(262, LINE_VIEW), REPS_SHOT, seg(t, 0.6, 3.6))),
    cheer: () => 0.3,
    board: () => chart(captains(CAPS2, PICKS2), 1, clockStopped2),
  });

  // 16. accept2: close on the two of them, the mic held out, the near wall behind their heads.
  beat({
    name: 'accept2', dur: 2.5,
    shot: () => closeUp(MEET[0] + 11, MEET[1] - 26),
    cheer: (t) => lerp(0.3, 1, seg(t, 0.6, 1.0)),
    board: () => chart(captains(CAPS2, PICKS2), 1, clockStopped2),
    say: says('5026', pages(
      ['TEAM 5026 ACCEPTS! THANK YOU, 3000!'],
    )),
  });

  // 17. sheRunsOn: she runs on through the gate to her captain's left, Robin rolling after her and home; the captain
  // walks back to the sign. Each of them crosses the gate's column on their own: she comes up through it and runs off
  // left, and the captain sets off from the mic once she's by, so she's well ahead (she runs, the captain walks) and
  // never over her; Robin follows through the gate once the captain is past it.
  const herRun = [MEET, LANE, pt(GATE_OUT), pt(GATE_IN), [pickSpot(1, 1).x, 124], pt(pickSpot(1, 1))];
  const mcHome = [MC_BY_HER, LANE, pt(GATE_OUT), pt(GATE_IN), [376, FRONT], [HOME[0] - 2, FRONT], HOME];
  const lenaBack = [pt(AT_MIC), [AT_MIC.x - 6, PASS], [SPOTS[1] + 4, PASS], pt(capSpot(1))];
  const RUN0 = 0.3, LENA0 = 1.4, MC0 = 1.7;
  beat({
    name: 'sheRunsOn', dur: Math.max(4.0, LENA0 + timeOf(lenaBack, SPEEDS.walk) + 0.2, MC0 + timeOf(mcHome, SKATE_SPEED) + 0.2),
    moves: (t) => ({
      mc: glide(mcHome, t, MC0, 'emcee', HOME_DIR, 'offer', 6),
      '5026': trip(herRun, t, RUN0, 'run', 0, 2),
      '3000': trip(lenaBack, t, LENA0, 'walk', 0, 0),
    }),
    shot: (t) => at1x(pan(REPS_SHOT, view(176, LINE_VIEW), seg(t, 0.3, 3.6))),
    cheer: (t) => lerp(1, 0.5, seg(t, 0.5, 3.5)),
    board: () => chart(captains(CAPS2, { ...PICKS2, 1: ['5026', ''] })),
  });

  // 18. later: a four-step fade to black and back, and round two is over: everyone where it leaves them.
  const FINAL = finale(crowd);
  const AFTER = 1.1;
  beat({
    name: 'later', dur: 2.2,
    moves: (t) => (t < AFTER ? {} : FINAL),
    end: FINAL,
    shot: (t) => at1x(t < AFTER ? view(176, LINE_VIEW) : view(222, LINE_VIEW)),
    cheer: (t) => (t < AFTER ? 0.5 : 0.3),
    board: (t) => (t < AFTER ? chart(captains(CAPS2, { ...PICKS2, 1: ['5026', ''] })) : FULL),
    over: (t) => {
      cover(t < AFTER ? seg(t, 0, 0.8) : 1 - seg(t, 1.3, 2.2));
      bars(1);
    },
  });

  // 19. alliances: along the line, all eight alliances of three.
  beat({
    name: 'alliances', dur: 5.6,
    moves: mcPose('emcee', HOME_DIR),
    shot: (t) => at1x(pan(view(222, LINE_VIEW), view(302, LINE_VIEW), seg(t, 0.3, 5.3))),
    cheer: (t) => lerp(0.3, 0.7, seg(t, 0.3, 1.2)),
    board: () => FULL,
    say: says('mc', pages(
      ["AND THAT'S ROUND TWO! PLEASE WELCOME", 'YOUR EIGHT PLAYOFF ALLIANCES!'],
    ), 0.3),
  });

  // 20. backups: the display, the backups on its last line.
  beat({
    name: 'backups', dur: 2.5,
    moves: mcPose('emcee', HOME_DIR),
    shot: () => at1x(BOARD_SHOT),
    cheer: () => 0.3,
    board: () => FULL,
    say: says('mc', pages(
      ['THE BEST EIGHT TEAMS LEFT ARE BACKUPS,', 'CALLED IN BY RANK IF A ROBOT BREAKS.'],
    )),
  });

  // 21. applause: the whole arena, the stands on their feet over the full line of alliances, and the send-off.
  beat({
    name: 'applause', dur: 3,
    moves: mcPose('flair'),
    shot: () => at1x(CROWD_SHOT),
    cheer: (t) => lerp(0.3, 1, seg(t, 0, 0.4)),
    board: () => FULL,
    say: says('mc', pages(
      ['A ROUND OF APPLAUSE FOR ALL OUR TEAMS!', "AND IF YOU WEREN'T SELECTED TODAY,"],
      ['PICK AN ALLIANCE TO CHEER ON, AND', 'BRING YOUR GRACIOUS PROFESSIONALISM!'],
    )),
  });

  // 22. out: from the same shot, down to walking's view, the film bars going, as she steps out in front of the line,
  // clear of her captain, ready to walk about. Its last frame is walking about's first.
  const stepOut = [pt(pickSpot(1, 1)), [START.x + 2, LINE_Y - 4], pt(START)];
  beat({
    name: 'out', dur: 2.2,
    moves: (t) => ({ mc: still(HOME[0], HOME[1], HOME_DIR, 'emcee'), '5026': trip(stepOut, t, 0.3, 'walk', START.dir, 0) }),
    end: { ...FINAL, '5026': still(START.x, START.y, START.dir), mc: still(HOME[0], HOME[1], HOME_DIR, 'emcee') },
    shot: (t) => at1x(pan(CROWD_SHOT, WALK_VIEW, seg(t, 0, 2.0))),
    // The stands settle back to cheering now and then on their own, as they do while she walks about.
    cheer: (t) => (t < 1.8 ? lerp(1, 0.1, seg(t, 0, 1.6)) : undefined),
    board: () => FULL,
    over: (t) => bars(1 - seg(t, 0.8, 2.2)),
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
