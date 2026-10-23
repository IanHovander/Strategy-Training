// The people in the pits: the crews at work, the volunteers, a judge, and everyone you can stop and talk to. They're
// all the walker's rig (walker.js) in cast.js looks, exactly like the arena's (bleachers.js): the same hand-drawn heads
// (curls, glasses, cap, bun and bob, from the front, in profile and from behind), skins and hair from cast.js's
// palettes, and their team's shirt colours with its print (teams.js). 5026 wears its merch (cast.js student()), and
// the strategist and the teammate keep their own heads.
//
// Safety glasses are required in the pits, so everyone here wears them: goggles() takes a look and paints a pair onto
// its hand-drawn heads, direction by direction, the way the arena's own glasses-wearer (cast.js's 'glasses' head) wears
// hers: frames in the same light grey round each eye, and a lens you see straight through. From the front (and
// three-quarters, where the template is the front one) each lens is framed like hers: the rim over the eye on the row
// above it, down its sides on the eye row (the bridge between the two), and under it on the row below; the dark top of
// each eye and the brows stay, and so do the eyes, their whites, the blush and the smile. In profile the rim runs from
// the ear to the front of the face, down both sides of the eye and under it. From behind there's nothing to see.
// Someone who already wears glasses (the 'glasses' head) keeps their own pair. Every head in every direction reads with
// that one rule: the five cast.js templates, the strategist's own heads (walker.js) and the teammate's (teammate.js).
//
// Who's where (feet in world pixels; set.js has the hall): the volunteer at the SPARE PARTS counter; 1024 (Bit Shift)
// with a student kneeling at the robot with a drill and a battery runner swapping batteries; 7777's pit minded by a
// student while its robot plays match 42; 4000 (Gearheads) with two kneeling at their elevator and one at the TV;
// 6060 (Robo Ravens) with their programmer at the laptop, a student leaning on the robot and a judge watching; 5026's
// mentor beside our tool chest and the teammate on pit duty by its battery cart, clear of the board on the robot's
// spot; 1357's pit minded by a student standing by his bowl of team buttons, on the far side of the board from 5026, so
// nobody waiting in front of 5026's pit stands in front of him; the pit admin sitting behind his desk (he's the pit
// announcer); the safety advisor walking the aisle up and down; and two people from other rows passing through. Everyone is a pure function of time: kneelers drill in bursts, leaners
// shift their weight, the runner loops between the battery cart and the robot every 12 seconds, the safety advisor
// patrols, and the passers-by walk the length of the hall and come round again.
//
//   goggles(look)        the same look in safety glasses, id + '-sg'
//   LOOKS                every look in the scene, all in glasses (the cut scene's 5026 crew too)
//   PEOPLE               who you can talk to: { id, name, x, y, dir, gait, look, reach?, reachY, faceGait?, solid, at?(t) }
//   CREW                 the rest of the crews, at work in the background
//   folk(t, o)           everyone at t as poses { id, x, y, dir, gait, frame, look, solid }
//   drawFolk(g, view, p) one of them and their shadow, at the view's scale

import { C, rnd } from '../pixel.js';
import { FRAMES, CELL_W, CELL_H, FOOT_X, FOOT_Y, HERO_LOOK, walkerFrame, drawWalker } from '../walker.js';
import { look, stranger, student, tones, SKIN, HAIR, skinBody, CAPS, MERCH, TEAMMATE_NAME, BACKS } from '../cast.js';
import { TEAMMATE_LOOK } from '../teammate.js';
import { along, frameOf, SPEED, STRIDE } from '../stage.js';
import { TEAMS, TEAL } from './teams.js';

// ---- Safety glasses ----
/** The frames: cast.js's glasses grey, the arena's glasses-wearer's own. */
const RIM = '#aab2c8';
// What the rim can go over: skin, its shade and lit tones, and blush. Eyes, their whites and dark hair (the top of an
// eye, a brow) never are, so every face keeps its eyes and brows behind the lenses.
const FACE = new Set([...'sSdeD']);
// What counts as the face when measuring it: skin and eyes.
const ON_FACE = /[sSdeEw]/;
const mirror = (rows) => rows.map((r) => [...r].reverse().join(''));
const cols = (row, re) => [...row].flatMap((ch, x) => (re.test(ch) ? [x] : []));
const range = (a, b) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);
const EYE = /[Ew]/;
/** The row the eyes start on (an iris in it), or -1. */
const eyeRow = (rows) => rows.findIndex((r) => r.includes('E'));
/** The eyes along a row, left to right, as [first, last] columns of iris and white. */
const eyesOn = (row) => cols(row, EYE).reduce((rs, x) => (rs.length && rs[rs.length - 1][1] === x - 1 ? (rs[rs.length - 1][1] = x, rs) : [...rs, [x, x]]), []);
/** The last row an eye spans, from row y down (some heads draw an eye two pixels tall). */
function eyeBottom(rows, y, [a, b]) {
  while (range(a, b).some((x) => EYE.test(rows[y + 1]?.[x] ?? ''))) y += 1;
  return y;
}
/** One lens's frame round the eye from column a to b, rows y to its bottom: over it, down both sides, and under it. */
function lens(rows, y, [a, b], under = [a, b]) {
  const y1 = eyeBottom(rows, y, [a, b]);
  return [...range(a - 1, b + 1).map((x) => [y - 1, x]), ...range(y, y1).flatMap((r) => [[r, a - 1], [r, b + 1]]), ...range(...under).map((x) => [y1 + 1, x])];
}

/** The rim (Q) at the pixels in `dots` ([row, column]), over FACE only. */
function paint(rows, dots) {
  const on = new Set(dots.map(([y, x]) => `${y},${x}`));
  return rows.map((r, y) => [...r].map((ch, x) => (on.has(`${y},${x}`) && FACE.has(ch) ? 'Q' : ch)).join(''));
}

/**
 * From the front (or three-quarters): a lens round each eye, the way cast.js's glasses head has them (its rows
 * 'kqqqqsqqqqsk', 'kdqEEqqqEEqdk', 'kdsqqsdsqqssk'), and the bridge between them on the eye row.
 */
function fromFront(rows) {
  const y = eyeRow(rows);
  if (y < 1) return rows;
  const eyes = eyesOn(rows[y]);
  const bridge = eyes.length > 1 ? range(eyes[0][1] + 1, eyes[1][0] - 1).map((x) => [y, x]) : [];
  return paint(rows, [...eyes.flatMap((e) => lens(rows, y, e)), ...bridge]);
}

/**
 * In profile, facing right: the arm from the ear along the row over the eye to the front of the face, and the lens
 * round the eye (cast.js's profile glasses: 'kqqqqqqqk', 'dsssqwEqsk', 'ssssqqqqdk').
 */
function fromSide(rows) {
  const y = eyeRow(rows);
  if (y < 1) return rows;
  const front = Math.max(...cols(rows[y], ON_FACE));
  const ear = cols(rows[y - 1], ON_FACE)[0] ?? front;
  const [a, b] = eyesOn(rows[y]).pop();
  return paint(rows, [...range(ear, front).map((x) => [y - 1, x]), ...lens(rows, y, [a, b], [a - 1, b + 1])]);
}

const painted = new Map();
/** One head in glasses, seen from direction d. Heads are shared between looks, so each is painted once. */
function inGlasses(rows, d) {
  const key = d === 'e' || d === 'w' ? d : 'f';
  if (!painted.has(rows)) painted.set(rows, {});
  const done = painted.get(rows);
  if (!done[key]) {
    // Someone in glasses already keeps their own pair. Facing left is facing right in the mirror: painted that way and
    // turned back, the light stays where it was.
    done[key] = rows.some((r) => r.includes('q')) ? rows
      : key === 'e' ? fromSide(rows) : key === 'w' ? mirror(fromSide(mirror(rows))) : fromFront(rows);
  }
  return done[key];
}

// From behind, cast.js's heads (its backOf()) keep the front template's brows: dark hair pixels in the middle of the
// back of the head that read as two eye slits on a faceless head. Here they're painted over in hair, wherever there's
// hair on both sides of them along the row, so a back reads as hair all over; the shade down the head's edges stays.
const HAIRS = new Set([...'hHrR']), SHARED_BACKS = new Set(Object.values(BACKS));
const brushed = new Map();
/** A back of the head with its brows brushed out (only cast.js's templates: the strategist's and the teammate's are their own). */
function hairBack(rows) {
  if (!SHARED_BACKS.has(rows)) return rows;
  if (!brushed.has(rows)) {
    brushed.set(rows, rows.map((r) => [...r].map((ch, x) => {
      if (ch !== 'g') return ch;
      let a = x - 1, b = x + 1;
      while (r[a] === 'g') a -= 1;
      while (r[b] === 'g') b += 1;
      return HAIRS.has(r[a]) && HAIRS.has(r[b]) ? 'h' : ch;
    }).join('')));
  }
  return brushed.get(rows);
}

const worn = new WeakMap();
/** The same look wearing safety glasses: its heads painted for each direction (from behind they don't show). */
export function goggles(l) {
  if (!worn.has(l)) {
    const heads = Object.fromEntries(Object.entries(l.heads).map(([d, rows]) => [d, ['ne', 'n', 'nw'].includes(d) ? hairBack(rows) : inGlasses(rows, d)]));
    worn.set(l, { ...l, id: `${l.id}-sg`, heads, headPal: { ...l.headPal, Q: RIM } });
  }
  return worn.get(l);
}

// ---- Looks ----
const KHAKI = { jeans: tones.khaki, cuff: tones.khaki };
const CLIPBOARD = ['#5a3a1e', '#8a5a2e', '#b07a42'];
const BLAZER = [C.steel1, C.steel2, C.steel3];
/** Hair colours for a head, the bob's streak in the same hair. */
const hairOf = (k) => ({ ...HAIR[k], r: HAIR[k].h, R: HAIR[k].H });
/** Someone with a head and colours chosen for them. body: more of the rig's colours (trousers, a hem...). */
const person = (id, shirt, print, head, skin, hair, body = {}, headPal = {}) =>
  look(`pits-${id}`, { ...skinBody(skin), shirt, print, ...body }, head, { ...SKIN[skin], ...hairOf(hair), q: '#aab2c8', ...headPal });
/** The i-th face from the crowd's rotation (cast.js stranger()), in a shirt with a print. */
function crowdFace(id, i, shirt, print, headPal = {}) {
  const l = stranger(i, shirt);
  return { ...l, id: `pits-${id}`, pal: { ...l.pal, print }, headPal: { ...l.headPal, ...headPal } };
}
/** A team's shirt and the print on it. */
const team = (num) => [TEAMS[num].tone, TEAMS[num].print];
const cap = ([c, Cc, D]) => ({ c, C: Cc, D });

const BARE = {
  // 5026: the strategist with her board, the teammate, the drive team in merch, and their mentor in the team tee.
  hero: HERO_LOOK,
  teammate: TEAMMATE_LOOK,
  eli: student(1, 'hoodie'),
  noor: student(3, 'tee'),
  kowalski: person('kowalski', MERCH.tee.shirt, MERCH.tee.print, 'bob', 'fair', 'grey', { jeans: tones.black, cuff: tones.black }),
  // The volunteers in green with khaki trousers, like the arena's Sam; the safety advisor in hi-vis yellow.
  bea: person('bea', tones.shirtGreen, '#ffc61a', 'bun', 'tan', 'black', KHAKI),
  tomas: person('tomas', tones.shirtGreen, '#ffc61a', 'glasses', 'brown', 'black', KHAKI),
  nadia: person('nadia', tones.shirtYellow, '#c4cbe0', 'cap', 'light', 'brown', KHAKI, cap(CAPS[1])),
  // The judge: a steel-grey blazer with long sleeves (black cuffs), khaki trousers, and a clipboard where the strategist
  // carries her whiteboard. The blazer is mid grey so she reads against the navy drape and the battery carts.
  okafor: { ...person('okafor', BLAZER, null, 'bun', 'deep', 'grey', { ...KHAKI, hem: tones.black, board: CLIPBOARD }), sleeves: 'long', board: true },
  // The other teams' students.
  ruth: person('ruth', ...team(1024), 'bob', 'light', 'auburn'),
  kai: person('kai', ...team(7777), 'cap', 'deep', 'black', {}, cap(['#ffc61a', '#ffe07a', '#a3650a'])),
  davi: person('davi', ...team(4000), 'curls', 'brown', 'brown'),
  lena: person('lena', ...team(6060), 'glasses', 'fair', 'chestnut'),
  oscar: person('oscar', ...team(1357), 'curls', 'tan', 'black'),
  // Their crews, faces from the crowd's rotation chosen so nobody's twin works next to them; 4000's cap in team teal.
  // 1024's battery runner wears the team's white tee (its print in the team's blue), so the black battery she carries
  // shows against it from every side, as it wouldn't against the navy hoodie.
  runner1024: crowdFace('runner1024', 0, tones.shirtWhite, TEAMS[1024].print),
  gear2: crowdFace('gear2', 2, ...team(4000), cap([TEAL[1], TEAL[2], TEAL[0]])),
  gear3: crowdFace('gear3', 3, ...team(4000)),
  raven2: crowdFace('raven2', 6, ...team(6060)),
  // Passing through from other rows of pits.
  pass1: crowdFace('pass1', 5, tones.shirtWhite, C.red1),
  pass2: crowdFace('pass2', 13, tones.shirtBlue, C.white),
};
/** Everyone in the scene, in safety glasses. */
export const LOOKS = Object.fromEntries(Object.entries(BARE).map(([k, l]) => [k, goggles(l)]));

// ---- Time ----
const mod = (a, n) => ((a % n) + n) % n;
/** A number of its own for each id, so people don't all move in step. */
const phaseOf = (id) => rnd([...id].reduce((n, ch) => n * 31 + ch.charCodeAt(0), 7) % 9973);
const walkFrame = (dist, stride = STRIDE.walk) => Math.floor(dist / stride) % 8;

/** Kneeling at a robot with a drill: bursts of drilling (the four-frame loop), then a rest. */
const kneeling = (id) => (t) => {
  const k = mod(t + phaseOf(id) * 3.6, 3.6);
  return { frame: k < 2.4 ? Math.floor(k * 5) % 4 : 0 };
};
/** Leaning on a robot or a laptop: the two frames in turn, slowly. */
const leaning = (id) => (t) => ({ frame: Math.floor(t * 1.5 + phaseOf(id) * 2) % 2 });

// 1024's battery runner, on a 12 second loop: at the battery cart swapping a battery (leaning in, facing the back), then
// out to the front of the pit with the fresh one in both hands, along in front of the robot's cart and back in at its
// right end (two seconds of carrying, out where the aisle sees it), leaning in to put it in the robot, and straight back
// to the cart to stand and watch.
const RUN_CART = [246, 82], RUN_BOT = [242, 91];
const RUN_OUT = [RUN_CART, [249, 97], [234, 97], RUN_BOT], RUN_BACK = [RUN_BOT, [246, 91], RUN_CART];
/**
 * The runner's corner of the pit, between the battery cart and the robot, as a rectangle round the feet: scene.js keeps
 * the strategist out of it, so the runner never has to squeeze past her, and she can't stand close enough in front of
 * the runner's way for the two of them to run into one figure.
 */
export const RUN_LANE = { x0: 222, x1: 252, y0: 80, y1: 99 };
const CARRY = 22; // pixels a second with a battery in both hands
function runner(t) {
  const out = along(RUN_OUT, 1e6, 'carry', CARRY).dist / CARRY, back = along(RUN_BACK, 1e6).dist / SPEED.walk;
  let k = mod(t, 12);
  const lean = (p, dir) => ({ x: p[0], y: p[1], dir, gait: 'lean', frame: Math.floor(k * 1.5) % 2 });
  if (k < 2) return lean(RUN_CART, 4);
  k -= 2;
  if (k < out) {
    const a = along(RUN_OUT, k, 'carry', CARRY);
    return { x: a.x, y: a.y, dir: a.dir, gait: 'carry', frame: walkFrame(a.dist) };
  }
  k -= out;
  if (k < 1.5) return lean(RUN_BOT, 6);
  k -= 1.5;
  if (k < back) {
    const a = along(RUN_BACK, k);
    return { x: a.x, y: a.y, dir: a.dir, gait: 'walk', frame: walkFrame(a.dist) };
  }
  // Back at the cart, watching the robot.
  return { x: RUN_CART[0], y: RUN_CART[1], dir: 6, gait: 'stand', frame: 0 };
}

// The safety advisor walks the aisle from end to end and back, and at each end stands and looks round. She keeps to its
// back edge, close to the pits, so her face clears the dialog box when she talks, and a good step behind the lanes the
// passers-by walk. She strolls, watching the pits, well below their pace (30), so one overtaking her is soon past.
const PATROL = [[104, 103], [430, 105], [720, 102]], PATROL_BACK = [...PATROL].reverse();
const PATROL_SPEED = 22, LOOK_ROUND = 2.5;
function patrol(t) {
  const one = along(PATROL, 1e6, 'walk', PATROL_SPEED).dist / PATROL_SPEED;
  let k = mod(t, 2 * (LOOK_ROUND + one));
  const looking = ([x, y]) => ({ x, y, dir: [0, 1, 7][Math.min(2, Math.floor((k / LOOK_ROUND) * 3))], gait: 'stand', frame: 0 });
  const walking = (path) => {
    const a = along(path, k, 'walk', PATROL_SPEED);
    return { x: a.x, y: a.y, dir: a.dir, gait: 'walk', frame: walkFrame(a.dist) };
  };
  if (k < LOOK_ROUND) return looking(PATROL[0]);
  k -= LOOK_ROUND;
  if (k < one) return walking(PATROL);
  k -= one;
  if (k < LOOK_ROUND) return looking(PATROL[2]);
  k -= LOOK_ROUND;
  return walking(PATROL_BACK);
}

/** Someone walking the length of the hall at y, to the right (dir 2) or the left (dir 6), coming round again. */
const passing = (y, dir, offset) => (t) => {
  const d = t * 30 + offset, k = mod(d, 872);
  return { x: dir === 2 ? k - 20 : 852 - k, y, dir, gait: 'walk', frame: walkFrame(d) };
};

// ---- Who's where ----
export const NADIA_ID = 'nadia';
/**
 * The people you can talk to. Their lines come from lines.js (the scene adds them). aside, side: where she stands to
 * talk to them if she's walked up in front of them (scene.js): this far to the side (16 if not given: a head's width,
 * so the two heads don't meet; 20 beside a kneeler, whose head is down level with hers, and beside the safety advisor,
 * out in the aisle at her own height), on this side first (-1 left, 1 right; the side they face if not given). Beside
 * an away board, the side away from it (out in the aisle if a divider's in the way); Ms. Kowalski has the divider on
 * one side and the board on the other, so she gets the board's corner. Behind the desk she stands at its plain end.
 * reachY: how far in depth she can talk from (12, or more for someone set back: Bea and Tomas behind the counter and
 * the desk, and Ms. Kowalski, so that anywhere she can stand in front of her offers the talk). reach: how far across
 * (scene.js: 17 for anyone standing still, whom she stops 14 short of, or 14). The teammate reaches a little further
 * both ways, to where the cut scene leaves the strategist, so the walking part starts with TALK TO TEAMMATE; and the
 * safety advisor 16 deep, more than the 13 she steps round the strategist by (scene.js ROUND.gap), so she can be
 * talked to as she goes by, not only while she stands at the ends of her patrol.
 */
export const PEOPLE = [
  { id: 'bea', name: 'BEA, SPARE PARTS', x: 48, y: 74, dir: 0, gait: 'stand', look: LOOKS.bea, reachY: 14, solid: true },
  { id: 'ruth', name: 'RUTH, 1024', x: 189, y: 90, dir: 2, gait: 'kneel', look: LOOKS.ruth, reachY: 12, aside: 20, solid: true, at: kneeling('ruth') },
  { id: 'kai', name: 'KAI, 7777', x: 314, y: 86, dir: 7, gait: 'stand', look: LOOKS.kai, reachY: 12, side: 1, solid: true },
  { id: 'davi', name: 'DAVI, 4000', x: 354, y: 97, dir: 2, gait: 'kneel', look: LOOKS.davi, reachY: 12, aside: 20, solid: true, at: kneeling('davi') },
  { id: 'lena', name: 'LENA, 6060 PROGRAMMER', x: 523, y: 82, dir: 2, gait: 'lean', look: LOOKS.lena, reachY: 12, solid: true, at: leaning('lena') },
  { id: 'okafor', name: 'MS. OKAFOR, JUDGE', x: 508, y: 97, dir: 2, gait: 'stand', look: LOOKS.okafor, reachY: 12, solid: true },
  { id: 'teammate', name: TEAMMATE_NAME, x: 588, y: 92, dir: 0, gait: 'stand', look: LOOKS.teammate, reach: 18, reachY: 17, side: -1, solid: true },
  { id: 'kowalski', name: 'MS. KOWALSKI, 5026 MENTOR', x: 648, y: 88, dir: 7, gait: 'stand', look: LOOKS.kowalski, reachY: 13, side: -1, solid: true },
  { id: 'oscar', name: 'OSCAR, 1357', x: 722, y: 92, dir: 7, gait: 'stand', look: LOOKS.oscar, reachY: 12, side: 1, solid: true },
  { id: 'tomas', name: 'TOMAS, PIT ADMIN', x: 776, y: 77, dir: 0, gait: 'sit', faceGait: 'sit', look: LOOKS.tomas, reachY: 14, aside: 16, side: -1, solid: true },
  { id: NADIA_ID, name: 'NADIA, SAFETY ADVISOR', x: 104, y: 108, dir: 0, gait: 'stand', look: LOOKS.nadia, reachY: 16, aside: 20, solid: false, at: patrol },
];
/** The rest of the crews, busy in the background. Nobody here talks. */
export const CREW = [
  { id: 'runner1024', x: RUN_CART[0], y: RUN_CART[1], dir: 4, gait: 'lean', look: LOOKS.runner1024, solid: false, at: runner },
  { id: 'gear2', x: 403, y: 90, dir: 6, gait: 'kneel', look: LOOKS.gear2, solid: true, at: kneeling('gear2') },
  // 4000's TV watcher stands against the side drape in front of the tool chest, side on, so her face and the TV beside it
  // show, a head's width from Davi's (he kneels at the robot's front corner, in front of and below her).
  { id: 'gear3', x: 341, y: 80, dir: 2, gait: 'stand', look: LOOKS.gear3, solid: true },
  // 6060's student leaning on their robot from its right end, her feet just past the cart's edge, so in the cut scene
  // her head, ten pixels further left, clears the strategist's at the front of 5026's pit.
  { id: 'raven2', x: 557, y: 90, dir: 6, gait: 'lean', look: LOOKS.raven2, solid: true, at: leaning('raven2') },
];
// Their lanes are a step in front of the safety advisor's patrol (y 102-105), and far enough back that when the dialog
// box is up it cuts them at the chest, the way the arena's box cuts the people behind it. Anyone in their way, they go
// round (scene.js).
const PASSING = [
  { id: 'pass1', look: LOOKS.pass1, solid: false, at: passing(118, 2, 190) },
  { id: 'pass2', look: LOOKS.pass2, solid: false, at: passing(114, 6, 122) },
];

/**
 * Everyone at t seconds, as poses { id, x, y, dir, gait, frame, look, solid } on whole pixels. o.except: ids to leave
 * out (the cut scene draws some of them itself); o.clocks: { id: seconds } for anyone on a clock of their own (the
 * aisle's walkers, held while they wait for her or talk to her); o.nadiaT: the safety advisor's, the same as
 * o.clocks.nadia. Everyone else is at t.
 */
export function folk(t, o = {}) {
  const except = new Set(o.except ?? []);
  const clock = (id) => o.clocks?.[id] ?? (id === NADIA_ID ? o.nadiaT : undefined) ?? t;
  return [...PEOPLE, ...CREW, ...PASSING].filter((p) => !except.has(p.id)).map((p) => {
    const now = p.at ? p.at(clock(p.id)) : {};
    const q = { x: p.x, y: p.y, dir: p.dir ?? 0, gait: p.gait ?? 'stand', frame: 0, ...now };
    return { id: p.id, x: Math.round(q.x), y: Math.round(q.y), dir: q.dir, gait: q.gait, frame: q.frame, look: p.look, solid: p.solid };
  });
}

/**
 * One person and their shadow, seen from view = { x, y, s = 1 }, with p = { x, y, dir, gait, frame or dist, look } in
 * world pixels. At s 1 it's stage.js's drawWithShadow exactly; at s 2 the same, twice the size. A gait walker.js
 * doesn't have stands instead, and anyone sitting has no shadow on the floor.
 */
export function drawFolk(g, view, p) {
  const s = view.s ?? 1, gait = FRAMES[p.gait] ? p.gait : 'stand';
  const x = Math.round((p.x - view.x) * s), y = Math.round((p.y - (view.y ?? 0)) * s);
  const frame = p.frame ?? frameOf(p), look = p.look ?? HERO_LOOK;
  if (gait !== 'sit') {
    g.fillStyle = 'rgba(5, 6, 13, 0.45)';
    g.fillRect(x - 6 * s, y - 1 * s, 12 * s, 3 * s);
    g.fillRect(x - 4 * s, y - 2 * s, 8 * s, 5 * s);
  }
  if (s === 1) drawWalker(g, x, y, p.dir ?? 0, gait, frame, look);
  else {
    g.imageSmoothingEnabled = false;
    g.drawImage(walkerFrame(p.dir ?? 0, gait, frame, look), x - FOOT_X * s, y - FOOT_Y * s, CELL_W * s, CELL_H * s);
  }
}
