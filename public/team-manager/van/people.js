// The eight in the van, on the walker's rig (walker.js) in cast.js looks, seated the way the bleachers seat their crowd.
// Up front Mr. Adeyemi, the mentor from the arena's stands, drives with both hands on the wheel and his eyes on the road;
// Owen rides beside him navigating on his phone, turning to the driver every few seconds to argue with the map app. In
// the middle row Tess is asleep against her window, Rafi has the snacks (trail mix on his lap, and the pretzels until he
// passes them back) and Kai bobs along to his headphones. In the back row the strategist sits by the window with the
// drive team's whiteboard on her lap, the teammate is next to her, and Bea is on a phone game, now and then throwing her
// arms up when she wins a level.
//
// Everyone is a cast.js look. The scene's own variants are made here the cast.js way and get ids of their own, so
// walker.js's frame cache keeps them apart: Tess with her eyes shut (and an awake copy for when you talk to her), Kai in
// white over-ear headphones, Bea's phone in a purple case, and the strategist without the board hanging from her hand
// (hers lies on her lap instead). Two gaits were added to walker.js for the van: `steer` (arms forward to the wheel's rim,
// with his hands drawn over its top at ten and two by drawHands once cabin.js has drawn the wheel) and `phone` (a phone
// held in both hands in front of the chest).
//
// Their props are tiny sprites in the house style, a letter a pixel like the heads, ink outline and three tones lit from
// the upper left: the bag of pretzels (blue, a yellow label, a crimped top), Rafi's trail mix (yellow with a red band),
// her whiteboard (white in a steel frame, blue and red writing appearing as the conversation goes on), the Zs rising
// beside Tess's head and the map on Owen's phone, lit when he turns to show the driver. Everything is a pure function of
// t.
//
//   SEATS                              [{ id, row, col, x, y, look }] the eight, back row first; x, y their feet (layout.js)
//   LOOKS                              { [id]: look } for the phone's face when they speak
//   drawRow(g, r, ox, oy, t, opts)     row r's people in the cabin view (cabin.js calls it between the seats)
//   drawProfiles(g, vx, vy, t, opts)   the three by the near windows in the outside view (outside.js's opts.inside)
//   drawHands(g, ox, oy)               the driver's hands over the steering wheel's rim (cabin.js's opts.hands)
//   drawBag(g, x, y, kind)             the pretzels or the trail mix, bottom middle at screen (x, y)
//   bagAt(state), bagRow(state)        where the pretzel bag sits in each state, in cabin world pixels, and whose row

import { C, cam, useContext, screen, rect, text } from '../pixel.js';
import { drawWalker, HERO_LOOK, leftFacing } from '../walker.js';
import { student, tones, HEADS, SIDE as PROFILE } from '../cast.js';
import { TEAMMATE_LOOK } from '../teammate.js';
import { PEOPLE } from '../bleachers.js';
import { SEATS_AT, ROWS, SIDE, WHEEL } from './layout.js';

// ---- Heads ----
// Tess asleep: her brows relax into skin and her eyes shut to a two-pixel lash line, from the front and in profile (the
// bun template's rows 6-8, cast.js).
const SHUT = HEADS.bun.map((row, y) => ({
  6: '..khsssssssssk..',
  7: '..khsssssssssk..',
  8: '..kgsggsssggsk..',
}[y] ?? row));
const SHUT_SIDE = PROFILE.bun.map((row, y) => ({
  6: '..kghhhhhhhssssk',
  7: '..kghhhksssssssk',
  8: '..kghhkdsssggssk',
}[y] ?? row));
// Kai's white over-ear headphones over his curls: the band across the top of his head and down each side, a cup over
// each ear, ink round the cups. P, p and o are the plastic, lit, mid and shade: the left cup catches the light.
const PHONES = HEADS.curls.map((row, y) => ({
  2: '.khPPPPPPpppphk.',
  3: 'khPhhhhhhhhhhphk',
  4: 'kgPhhhhhhhhhhpgk',
  5: 'kkkksssssssdkkkk',
  6: 'kPpksssssssdkpok',
  7: 'kPpkssEssEsdkpok',
  8: 'kPpkssEssEsdkpok',
  9: 'kppkssssdssdkook',
  10: 'kkkkssmMMmsdkkkk',
}[y] ?? row));
const PLASTIC = { P: tones.shirtWhite[2], p: tones.shirtWhite[1], o: tones.shirtWhite[0] };

// ---- Looks ----
/** A copy of a look under a new id, with some heads and head colours swapped in. */
const variant = (base, id, heads = {}, headPal = {}) => ({
  ...base, id, heads: { ...base.heads, ...heads }, headPal: { ...base.headPal, ...headPal },
});
const front = (rows) => ({ s: rows, se: rows, sw: rows });

const ADEYEMI = PEOPLE.find((p) => p.id === 'adeyemi').look; // the same man as in the arena's stands
const OWEN = student(4, 'hoodie');
const TESS = variant(student(3, 'hoodie'), 'van-tess-awake');
const TESS_ASLEEP = variant(TESS, 'van-tess', { ...front(SHUT), e: SHUT_SIDE, w: leftFacing(SHUT_SIDE) });
const RAFI = student(2, 'tee');
const KAI = variant(student(0, 'tee'), 'van-kai', front(PHONES), PLASTIC);
const BEA = (() => {
  const base = student(1, 'tee');
  // Her phone's case: purple, a colour none of the van's props use, so it reads as a phone and not a snack.
  return { ...base, id: 'van-bea', pal: { ...base.pal, pad: tones.shirtPurple } };
})();
const HERO = { ...HERO_LOOK, id: 'van-hero', board: false }; // her board is on her lap, not in her hand

/** Who sits where: the back row first, each row left to right on the screen. */
const ROW_OF = { hero: 3, teammate: 3, bea: 3, tess: 2, rafi: 2, kai: 2, owen: 1, adeyemi: 1 };
const COL_OF = { hero: 'L', teammate: 'M', bea: 'R', tess: 'L', rafi: 'M', kai: 'R', owen: 'L', adeyemi: 'R' };
export const LOOKS = { hero: HERO, teammate: TEAMMATE_LOOK, bea: BEA, tess: TESS, rafi: RAFI, kai: KAI, owen: OWEN, adeyemi: ADEYEMI };
export const SEATS = Object.keys(ROW_OF).map((id) => ({
  id, row: ROW_OF[id], col: COL_OF[id], x: SEATS_AT[id][0], y: SEATS_AT[id][1], look: LOOKS[id],
}));

// ---- Props ----
// A letter a pixel, '.' see-through, drawn with its bottom middle at (x, y).
function sprite(rows, pal, x, y) {
  const x0 = x - Math.floor(rows[0].length / 2), y0 = y - rows.length;
  rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (pal[ch]) rect(x0 + i, y0 + j, 1, 1, pal[ch]);
  }));
}
// The pretzels: a blue bag with its top crimped shut and a yellow label with two pretzels on it.
const PRETZELS = [
  'kkkkkkk',
  'kBnBnBk',
  'kkkkkkk',
  'kBbbbbk',
  'kYyyyak',
  'kYoyoak',
  'kyyyaak',
  'kBbbbnk',
  'kbbbnnk',
  '.kkkkk.',
];
// The trail mix: a yellow pouch with a red band and its zip along the top.
const TRAIL = [
  '.kkkk.',
  'kYYyak',
  'kkkkkk',
  'kYyyak',
  'kRrrdk',
  'kYyyak',
  'kyyaak',
  '.kkkk.',
];
const BAG_PAL = {
  k: C.ink, B: C.blue2, b: C.blue1, n: C.blue0, Y: C.yel2, y: C.yel1, a: C.yel0, o: '#a3460a',
  R: C.red2, r: C.red1, d: C.red0,
};
/** The bag of pretzels (or Rafi's trail mix), bottom middle at screen (x, y). */
export function drawBag(g, x, y, kind = 'pretzels') {
  const prev = useContext(g), saved = { ...cam };
  screen();
  sprite(kind === 'trail' ? TRAIL : PRETZELS, BAG_PAL, Math.round(x), Math.round(y));
  Object.assign(cam, saved);
  useContext(prev);
}

// Her whiteboard lying on her lap: the white face in a steel frame, lit along the top and left, the frame's near edge
// in shade. What's written on it, in blue and red, appears mark by mark as `board` goes from 0 to 1.
const BOARD = [
  'kkkkkkkkkkkk',
  'kLLLLLLLLLLk',
  'kLWWWWWWWWFk',
  'kLWWWWWWWWFk',
  'kLWWWWWWWWFk',
  'kLwwwwwwwwFk',
  'kFFFFFFFFFFk',
  'kkkkkkkkkkkk',
];
const BOARD_PAL = { k: C.ink, L: C.steel3, F: C.steel2, W: C.white, w: '#e8ecf5' };
// The writing over the white (rows 2-5, columns 2-9): two lines of notes in blue, a red X beside them and a red line
// under the lot.
const WRITING = [
  'bbb..r.r',
  '......r.',
  'bb.b.r.r',
  'rrrr....',
];
// When each mark appears, in sixths of the way from a blank board to a full one.
const ORDER = [
  '112..3.3',
  '......3.',
  '44.5.3.3',
  '6666....',
];
function drawBoard(x, y, k) {
  sprite(BOARD, BOARD_PAL, x, y);
  const x0 = x - 6 + 2, y0 = y - BOARD.length + 2;
  WRITING.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch !== '.' && k * 6 >= Number(ORDER[j][i]) - 0.01) rect(x0 + i, y0 + j, 1, 1, ch === 'b' ? C.blue1 : C.red1);
  }));
}

// Owen's map app, the phone's face tipped toward the driver when he turns to show him the exit: the walker's phone gait
// holds a dark slab (pal.pad) in both hands, seen from behind, so turned to the screen's right (dir 1) its two columns
// over his hands (3 and 4 right of his feet, 22 to 20 up, ink round them already) light up pale blue with the route
// climbing it in yellow. Facing his lap (dir 0) the screen is toward him, and only the slab shows.
const MAP = [
  'by',
  'yb',
  'yb',
];
const MAP_PAL = { b: C.blue3, y: C.yel1 };
function drawMap(x, y) {
  MAP.forEach((row, j) => [...row].forEach((ch, i) => rect(x + 3 + i, y - 22 + j, 1, 1, MAP_PAL[ch])));
}

// Zs rising beside someone asleep: two on staggered phases, each climbing away from her face (drift: pixels sideways
// on the way up) and simply ending at the top. Every Z's ink outline goes down first and every white letter over the
// lot, so where one Z passes another the two still read as Zs instead of merging into one ink blot.
function zs(x, y, t, rise, drift) {
  const at = [0, 1].map((i) => {
    const k = ((t / 2.7 + i / 2) % 1 + 1) % 1;
    return [x + Math.round(k * drift), y - Math.round(k * rise)];
  });
  for (const [zx, zy] of at) text('Z', zx, zy, { font: 3, color: C.ink, outline: C.ink });
  for (const [zx, zy] of at) text('Z', zx, zy, { font: 3, color: C.white });
}

// ---- Who's doing what ----
/** Asleep, Tess slumps this far over toward her window (the scene's seat picker puts her bubble by her head there). */
export const SLUMP = { dx: -4, dy: 1 };
/**
 * Where the pretzel bag's bottom middle is in each state, in cabin world pixels: on a lap; held up in Rafi's raised
 * right hand (the cheer gait's hands come up beside his head, its bottom edge on his fist), out to the side, in the gap
 * between the teammate and Bea behind him: straight over his head it would sit on the teammate's chest and read as
 * theirs already; or caught in the teammate's two hands held up over their head, 40 over the feet, clear of the top of
 * their hair (the cheer gait's raised arms are hidden behind it, so drawRow draws the forearms coming up out of it to a
 * fist on each side of the bag), so the throw goes a good way up the screen, which is back in the van.
 */
const BAG_AT = {
  rafi: [SEATS_AT.rafi[0] + 5, SEATS_AT.rafi[1] - 10],
  'rafi-up': [SEATS_AT.rafi[0] + 9, SEATS_AT.rafi[1] - 34],
  'teammate-up': [SEATS_AT.teammate[0], SEATS_AT.teammate[1] - 40],
  teammate: [SEATS_AT.teammate[0], SEATS_AT.teammate[1] - 10],
  hero: [SEATS_AT.hero[0] + 10, SEATS_AT.hero[1] - 10],
};
/** World [x, y] of the bag's bottom middle in that state ('none': it's in the air, so null). */
export const bagAt = (state) => BAG_AT[state] ?? null;
/** The row of whoever has the bag in that state: a bag going from one of them to another in the same row (a lap to a
 * lap, or brought down from over a head) is drawn with that row, so the seats and heads in front cover it as they do on
 * a lap; one thrown back over a seat flies over everything. */
export const bagRow = (state) => ROW_OF[state.replace('-up', '')];

/**
 * What someone is doing t seconds in: { dir, gait, dx, dy, awake }. Their idle business, unless the strategist is talking
 * to them (o.with), with o.pose's overrides on top.
 */
function stateOf(id, t, o) {
  const talking = o.with === id, bag = o.bag ?? 'hero', lookAt = o.look ?? o.with;
  let s;
  switch (id) {
    case 'adeyemi': s = { dir: 0, gait: 'steer' }; break; // eyes on the road, always
    case 'owen': s = { dir: !talking && t % 5 > 3.8 ? 1 : 0, gait: 'phone' }; break; // a look at the driver every 5 s
    // Asleep she faces forward (her legs behind Owen's seat back, like everyone's) slumped over against her window.
    case 'tess': s = talking ? { dir: 0, gait: 'sit', awake: true } : { dir: 0, gait: 'sit', ...SLUMP, awake: false }; break;
    case 'rafi': s = { dir: 0, gait: bag === 'rafi-up' ? 'cheer' : 'sit' }; break;
    case 'kai': s = { dir: 0, gait: 'sit', dy: !talking && (t * 2.2) % 1 < 0.5 ? 1 : 0 }; break; // on the beat
    case 'hero': s = { dir: lookAt === 'teammate' || lookAt === 'bea' ? 1 : 0, gait: 'sit' }; break;
    case 'teammate': s = { dir: talking ? 7 : 0, gait: bag === 'teammate-up' ? 'cheer' : 'sit' }; break; // caught over their head
    // A level won every 11 s. Talked to, she finishes the level first (the first page), then turns to you.
    case 'bea':
      s = talking && o.page > 0 ? { dir: 7, gait: 'sit' } : { dir: 0, gait: !talking && (t + 4) % 11 < 0.5 ? 'cheer' : 'phone' };
      break;
    default: s = { dir: 0, gait: 'sit' };
  }
  for (const [k, v] of Object.entries(o.pose?.[id] ?? {})) if (v !== undefined) s[k] = v;
  return { dx: 0, dy: 0, awake: true, ...s };
}
const lookOf = (id, s) => (id === 'tess' && !s.awake ? TESS_ASLEEP : LOOKS[id]);
// Turned toward someone beside them, a lap moves a couple of pixels that way.
const lapShift = (dir) => (dir === 1 || dir === 2 ? 2 : dir === 7 || dir === 6 ? -2 : 0);

/**
 * The pretzels held up over the teammate's head, their bottom middle at screen (bx, by): a fist grips each side of the
 * bag near its foot, in their skin with ink round it, and their forearms, in the hoodie's red, come up to the fists out
 * of the top corners of their hair (x, y: their feet on screen), where the cheer gait's raised hands would just poke out.
 * As the bag is brought down the forearms shorten, and once the fists are down to the hair there are none.
 */
function heldUp(bx, by, x, y, look) {
  const [d, s, S] = look.pal.skin, [, h1, h2] = look.pal.shirt, top = by - 3, bottom = y - 35;
  for (const [fx, side] of [[bx - 5, -1], [bx + 4, 1]]) {
    // Each row of the forearm leans out a little toward the bottom, two pixels in all: ink first, then the sleeve.
    const at = (row) => fx + side * Math.round((2 * (row - top)) / Math.max(1, bottom - top));
    for (let row = top; row <= bottom; row++) rect(at(row) - 1, row, 4, 1, C.ink);
    for (let row = top; row <= bottom; row++) {
      rect(at(row), row, 2, 1, h1);
      rect(at(row), row, 1, 1, h2);
    }
  }
  sprite(PRETZELS, BAG_PAL, bx, by);
  for (const fx of [bx - 5, bx + 4]) {
    rect(fx - 1, by - 5, 4, 4, C.ink);
    rect(fx, by - 4, 2, 2, s);
    rect(fx, by - 4, 1, 1, S);
    rect(fx + 1, by - 3, 1, 1, d);
  }
}

/**
 * Row r's people (3 the back bench, 2 the middle, 1 the front seats) in the cabin view, feet at (x - ox, y - oy), with
 * their props over them. No floor shadows: they're in their seats. opts:
 *   pose   { [id]: { dir, gait, dx, awake } } this frame's overrides (the cut scene's direction); they win over the rest
 *   look   who the strategist looks at: she turns to the teammate or Bea (dir 1), anyone else she faces you
 *   with   who she's talking with: the back row turn to her (dir 7), Tess wakes, Kai stops bobbing, Bea puts her phone
 *          down (after the first page: page, the page on screen); the front row keep their eyes on the road
 *   bag    where the pretzels are: 'rafi' | 'rafi-up' | 'teammate-up' | 'teammate' | 'hero' (default) | 'none' (in the
 *          air: the scene draws it). Rafi holds them up over his head (cheer), the teammate in both fists over theirs.
 *   air    { x, y, held } the bag in the air between two of this row (world x, y of its bottom middle, as bagAt): drawn
 *          over the row's people, so the seats and heads in front cover it as they do on a lap; held: the teammate's
 *          fists and forearms are still on it, bringing it down from over their head
 *   board  how much is written on her board, 0 to 1 (default 1)
 *   zs     false: no Zs over Tess (the seat picker's bubble is hers, so they'd crowd it)
 *   hide   rows to leave out altogether: the scene's talk shots have row 2 under the dialog box while it's up, and only
 *          the crowns of its heads (and Tess's Zs) would show, poking out over the box's top edge
 */
export function drawRow(g, r, ox, oy, t, opts = {}) {
  if (opts.hide?.includes(r)) return;
  const prev = useContext(g), saved = { ...cam };
  screen();
  const bag = opts.bag ?? 'hero';
  const row = SEATS.filter((p) => p.row === r).map((p) => ({ ...p, s: stateOf(p.id, t, opts) }));
  // The back row's knees stay behind the middle row's seat back. Rows are stacked 26 pixels apart here where a van's are
  // 8, so in the gaps between the middle row's headrests you'd see the back row's laps, and anyone turned in their seat
  // pokes a knee out there beside her board, a stray scrap of jeans. So the back row is drawn down to the top of the
  // middle row's headrests only (their props, the board and the bags, go over the top as before): in the front seats'
  // shot the film bar comes down to just there, and anything lower showed in the gaps as slivers of skin and red.
  const tuck = r === 3;
  if (tuck) {
    g.save();
    g.beginPath();
    g.rect(0, 0, g.canvas.width, ROWS[3] - 14 - oy);
    g.clip();
  }
  for (const p of row) {
    drawWalker(g, p.x - ox + p.s.dx, p.y - oy + p.s.dy, p.s.dir, p.s.gait, 0, lookOf(p.id, p.s));
  }
  if (tuck) g.restore();
  for (const p of row) {
    const x = p.x - ox + p.s.dx, y = p.y - oy + p.s.dy, lap = lapShift(p.s.dir);
    if (p.id === 'hero') drawBoard(x + lap, y - 12, opts.board ?? 1);
    if (p.id === 'rafi') sprite(TRAIL, BAG_PAL, x - 4 + lap, y - 10);
    if (p.id === 'owen' && p.s.gait === 'phone' && p.s.dir === 1) drawMap(x, y);
    // Her Zs start by her ear and rise over her window and the door top, staying beside her head and inside the van:
    // clear of the back row's faces.
    if (p.id === 'tess' && !p.s.awake && opts.zs !== false) zs(x - 9, y - 29, t, 10, -2);
    // The pretzels, wherever they've got to in this row: exactly at bagAt, so a throw starts and lands where they sit.
    // Held up over the teammate's head, their fists and forearms hold it there.
    const at = bagAt(bag), holder = bag.replace('-up', '');
    if (at && holder === p.id) {
      const bx = at[0] - ox + p.s.dx, by = at[1] - oy + p.s.dy;
      if (bag === 'teammate-up') heldUp(bx, by, x, y, lookOf(p.id, p.s));
      else sprite(PRETZELS, BAG_PAL, bx, by);
    }
  }
  // The bag on its way between two of this row, over their laps and under the row in front.
  const air = opts.air;
  if (air && air.row === r) {
    const bx = Math.round(air.x - ox), by = Math.round(air.y - oy), mate = row.find((p) => p.id === 'teammate');
    if (air.held && mate) heldUp(bx, by, mate.x - ox + mate.s.dx, mate.y - oy + mate.s.dy, lookOf(mate.id, mate.s));
    else sprite(PRETZELS, BAG_PAL, bx, by);
  }
  Object.assign(cam, saved);
  useContext(prev);
}

/**
 * Mr. Adeyemi's hands on the steering wheel, at ten and two on its top arc. cabin.js draws the wheel's rim over his
 * arms and then these (drawCabin's opts.hands), so he holds the rim instead of reaching behind it: a 2x2 fist in his
 * skin over each upper corner of the rim, lit on its upper left, ink all round it, so it stands apart from the rim and
 * from his shirt. The rim's sides stay clear below the fists, so the wheel reads as a closed ring with both hands on
 * top. The steer gait's forearms end at nine and three, under the rim, except one pixel of his right fist that pokes
 * out past the rim's left edge: it's inked over, so the arm reads as going behind the rim.
 */
const HANDS = [[WHEEL.x - 6, WHEEL.y - 4], [WHEEL.x + 5, WHEEL.y - 4]]; // their top left pixels, on the rim's top corners
export function drawHands(g, ox, oy) {
  const prev = useContext(g), saved = { ...cam };
  screen();
  const [d, s, S] = ADEYEMI.pal.skin;
  for (const [hx, hy] of HANDS) {
    const x = hx - ox, y = hy - oy;
    rect(x - 1, y - 1, 4, 4, C.ink);
    rect(x, y, 2, 2, s);
    rect(x, y, 1, 1, S);
    rect(x + 1, y + 1, 1, 1, d);
  }
  rect(WHEEL.x - 8 - ox, WHEEL.y - oy, 1, 1, C.ink); // the steer gait's fist tip at nine o'clock
  Object.assign(cam, saved);
  useContext(prev);
}

/**
 * The outside view's near-side passengers, facing right (dir 2) through the windows: Owen on his phone in the front,
 * Tess asleep in the middle row with her Zs, the strategist at the back. vx, vy: the van's back end and the road under
 * its near wheels on screen (outside.js's opts.inside); feet on the van's floor. opts.pose as for drawRow.
 */
export function drawProfiles(g, vx, vy, t, opts = {}) {
  const prev = useContext(g), saved = { ...cam };
  screen();
  const y = vy - SIDE.floor;
  const tess = { awake: false, ...opts.pose?.tess };
  const who = [
    ['hero', 3, 'sit', HERO],
    ['tess', 2, 'sit', tess.awake ? TESS : TESS_ASLEEP],
    ['owen', 1, 'phone', OWEN],
  ];
  for (const [id, r, gait, look] of who) {
    const p = { dir: 2, gait, dx: 0, ...opts.pose?.[id] };
    drawWalker(g, vx + SIDE.rows[r] + p.dx, y, p.dir, p.gait, 0, look);
  }
  if (!tess.awake) zs(vx + SIDE.rows[2] + 8, y - 27, t, 10, 6);
  Object.assign(cam, saved);
  useContext(prev);
}
