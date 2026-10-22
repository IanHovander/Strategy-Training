// The team at the meeting: everyone who sits in the circle on the back lawn, who stands at its head, who watches from
// the edge, and where they all go once it breaks up. Everyone is the walker's rig (walker.js) in a look made the way
// cast.js makes them: body colours over the strategist's, a hand-drawn head from the front, in profile and from behind,
// and skin and hair from cast.js's palettes. Nobody here is drawn any other way.
//
// Who's there. The two co-captains, Tessa (the shout-outs) and Owen (the updates, a clipboard in his hand), stand in the
// gap at the circle's head; the cut scene places them. Eighteen sit cross-legged on the grass: the strategist and the
// teammate, the build lead, the programmer, the scouting lead, the outreach lead, the drive coach and his two drivers,
// a freshman at his first meeting, and eight more of the team. Two adults watch from the edge: Ms. Okafor, the
// engineer who mentors the team, and Mr. Brandt, the teacher who signs the forms, standing on the lawn either side.
// Every student is in team merch: the red 5026 tee, the red pullover hoodie with the panther badge, the black
// alternate tee with the red print, and here and there the red team cap. The mentors wear it too, over grown-up
// trousers. Twenty-odd people need more faces than cast.js's five heads, so four more are drawn here the same way:
// a short crop, a ponytail (tied with a red scrunchie, and hanging down the back from behind), long hair parted in the
// middle, and a bald crown with a grey fringe and a moustache for Mr. Brandt.
//
// The circle. Seen 20 degrees down a circle on the ground is a flat ellipse, 72 pixels across each way from the middle
// and 25 deep (CIRCLE in layout.js: nine feet, at the arena's 8 and 2.75 pixels to the foot). The eighteen sit on it
// from 210 to 510 degrees round from the front, leaving the gap at the back, nearest the wall, for the co-captains. So
// the people at the back face you, the front row has its backs to you and the sides are in profile: every one of the
// rig's eight directions turns up. Spaced evenly by angle, the sides would be piles of heads (a step round the side
// moves a third as far on the screen as a step across the back), so the seats are spaced mostly by how far apart they
// look: a little wider apart down the sides, a little closer across the front and back. Turning to look at something
// uses the ground's own proportions, so someone across the circle faces a point the way they would on the floor, not
// on the screen.
//
// How they react, as a pure function of time (cue below). Chatting before it starts, now and then two neighbours turn a
// step toward each other for a second or so. Listening, everyone looks at whoever's speaking. Between shout-outs they
// clap, about five claps a second, each out of step with the rest, starting a little apart; whoever was praised gets
// up and throws both arms up in a V instead, again and again. On "IRON PANTHERS ON THREE!" every arm goes up, and pumps
// up and down with a clap between for a couple of seconds, each in their own time, before they all hold it. At the
// permission slips some of them, the freshman always, turn to the person next to them.
//
// After the meeting it breaks up into small groups (after()): the co-captains still talking at the head of the old
// circle, the teammate waiting for her, the build lead on the path looking in at the robot, the programmer under the
// left tree with a laptop (he doesn't look up from it, even to talk), the teacher and the scouting lead on the bench,
// the outreach lead behind the sign-up table, the drive team in a huddle near it, the mentor reading the thank-you card
// from beside it, the freshman by himself on the grass, and the rest in twos and threes.
//
//   CAST                     { [id]: { name, look } } for everyone (the silent ones have name null)
//   SEATS                    the eighteen places on the circle: { id, k, a (degrees round from the front), x, y }
//   circle(t, cue)           everyone at the meeting but Tessa and Owen, placed and reacting:
//                            [{ id, x, y, dir, gait, frame, look }], each drawable with stage.js drawWithShadow
//                            cue = { react: 'chat' | 'listen' | 'clap' | 'cheer' | 'groan', at: { x, y } (the speaker's
//                            feet), cheer: [ids], still: [ids], since: seconds since the reaction began, rise: whether
//                            the ids in cheer get up on their feet to cheer, toward: { [id]: { x, y } } anyone who
//                            listens to somewhere else than at }
//   after(t, o)              the walkable part's people (not her), the same shape, and extra(g, view) on anyone with
//                            something drawn just after them. o.me: her feet; o.talking: the id she's talking to.
//   TALKERS                  the eleven she can talk to, where they are after: { id, name, x, y, look, gait, bubble,
//                            faceGait }
//   occupied(x, y)           true when feet at (x, y) would stand in someone after the meeting, or right over them
//   within(p, x, y)          how close feet at (x, y) are to talk to p (one of TALKERS), Infinity if not close enough:
//                            anywhere occupied() stops her walking up to them counts

import { C, rnd } from '../pixel.js';
import { HERO_LOOK, leftFacing } from '../walker.js';
import { HERO_NAME, TEAMMATE_NAME, BASE, HEADS, SIDE, backOf, SKIN, HAIR, skinBody, tones, MERCH, CAPS } from '../cast.js';
import { TEAMMATE_LOOK } from '../teammate.js';
import { dirToward } from '../stage.js';
import { FT, DEEP, WALL_Y, CIRCLE, BENCH } from './layout.js';

// ---- Four more heads ----
// Drawn like cast.js's: 16 columns, one letter a pixel (k ink, g/h/H hair dark, mid and lit, s/S/d skin, e blush, E
// iris, w white of the eye, M/T/m mouth, teeth and lip, r a scrunchie), the light from the upper left. From the front,
// in profile facing right (facing left is leftFacing()), and from behind.
const FRONT = {
  ...HEADS,
  // Short hair, the fringe swept over to one side.
  crop: [
    '.....kkkkkk.....',
    '...kkhHHhhhkk...',
    '..khHHhhhhhhhk..',
    '..khHhhhhhhhhk..',
    '..kghhhhhhhhgk..',
    '..kghhsssssshk..',
    '..khshgssghshk..',
    '..kssggssggssk..',
    '.kdssEEssEEssdk.',
    '..ksessdssessk..',
    '..kssMTTTMsssk..',
    '..kssssmssssk...',
    '...kssssssdk....',
    '....kksssskk....',
    '......kkkk......',
  ],
  // Hair pulled back into a ponytail with a side fringe; from the front the tail swings out past one ear.
  pony: [
    '................',
    '.....kkkkkk.....',
    '...kkhHHhhhkk...',
    '..khHHhhhhhhhk..',
    '..khHhhhhhhhhk..',
    '..khhhhhssssgk..',
    '..khhhgsssghsk..',
    '..khsggsssggskk.',
    '..kgsEEsssEEskhk',
    '..kgessdsssesghk',
    '..kgsssMMMdsskhk',
    '...ksssmssssk.gk',
    '....kssssddk.kgk',
    '.....kkkkkk...k.',
    '................',
  ],
  // Long and straight, parted in the middle, down past the shoulders.
  long: [
    '......kkkk......',
    '....kkhHHhkk....',
    '...khHHhhhhhk...',
    '..khHhhhhhhhhk..',
    '.kghHhhhghhhhhk.',
    '.kghhhhsgshhhhgk',
    '.kghhssssssshhgk',
    '.kghshgsssghshgk',
    '.kghsggsssggshgk',
    '.kghsEEsssEEshgk',
    '.kghesssdsssehgk',
    '.kghsssMTMssshgk',
    '.kghksssmssskhgk',
    '.kgh.kssssdk.hgk',
    '.kgh..kkkkk..hgk',
    '.kghk.......khgk',
    '..kk.........kk.',
  ],
  // A bald crown, lit on the upper left, a fringe of hair round the sides, and a moustache.
  bald: [
    '................',
    '.....kkkkkk.....',
    '...kkSSsssskk...',
    '..kSSssssssssk..',
    '..kSssssssssdk..',
    '..khssssssssgk..',
    '..khshgssghshk..',
    '..kgsggssggsgk..',
    '.kdgsEEssEEsgdk.',
    '..ksessdssessk..',
    '..kssghhhgsssk..',
    '..ksssdMMdsssk..',
    '...kssssssdk....',
    '....kksssskk....',
    '......kkkk......',
  ],
};
const PROFILE = {
  ...SIDE,
  crop: [
    '................',
    '....kkkkkkk.....',
    '...khHHhhhhkk...',
    '..khHhhhhhhhhk..',
    '.kghHhhhhhhhhhk.',
    '.kghhhhhhhhhhSk.',
    '.kghhhhhhhhsggk.',
    '.kghhhkssssggsk.',
    '.kghhkdssswEssk.',
    '.kghhksssessssdk',
    '.kghhhksssssssk.',
    '..kghhkssssMMsk.',
    '..kgghksssssmk..',
    '...kkkkksssdk...',
    '.......kkkkk....',
  ],
  // The tail hangs down behind.
  pony: [
    '................',
    '......kkkkk.....',
    '....kkhHHhhkk...',
    '...khHhhhhhhhk..',
    '.kkhHhhhhhhhhhk.',
    'khHkhhhhhhhhhsSk',
    'khhkghhhhhhhsggk',
    'khhkghhkssssggsk',
    'kghkghkdssswEssk',
    'kghkghkssessssdk',
    '.kghkghksssMMMk.',
    '.kghkkhkssssmk..',
    '..kgk.kkssssk...',
    '...k....kkkk....',
    '................',
  ],
  long: [
    '......kkkk......',
    '...kkkhHHhkk....',
    '..khHHhhhhhhk...',
    '.khHhhhhhhhhhk..',
    'kghhhhhhhhhhhhk.',
    'kghhhhhhhhhhhSk.',
    'kghhhhhhhhhsssk.',
    'kghhhhhhhhsggsk.',
    'kghhhhhkssssggsk',
    'kghhhhkdssswEssk',
    'kghhhhksssesssdk',
    'kghhhhhksssssMk.',
    'kghhhhhhkssssmk.',
    'kghhhhhhhkkssk..',
    'kghhhhhhhk.kk...',
    '.kghhhhhk.......',
    '..kkkkkk........',
  ],
  bald: [
    '................',
    '....kkkkkkk.....',
    '...kSSsssssk....',
    '..kSSssssssssk..',
    '.kSsssssssssssk.',
    '.ksssssssssssSk.',
    '.kghhssssssggsk.',
    '.kghhhkssssggsk.',
    '.kghhkdssswEssk.',
    '.kghhksssessssdk',
    '.kghhhkssssghhk.',
    '..kghhksssssMsk.',
    '..kgghksssssmk..',
    '...kkkkksssdk...',
    '.......kkkkk....',
  ],
};
// From behind: cast.js's backOf() (the face painted over with hair), cleaned up, except where there's more to see.
// backOf() turns only the face's own letters into hair, so the eyebrows' dark runs and the jaw's ink stay behind as two
// marks at eye height: a row of backs would read as faces with their eyes shut. In the rows where the face was, any run
// of dark hair or ink with hair either side becomes hair too; the shading and the outline at the edges stay. The
// ponytail hangs down the middle from its scrunchie; long hair covers the back of the neck; the bald crown stays bare.
const FACE_ROW = /[sSdeEwMTmq]/;
const cleanBack = (rows) => backOf(rows).map((r, y) => (FACE_ROW.test(rows[y]) ? r.replace(/(?<=[hH])[gk]+(?=[hH])/g, (m) => 'h'.repeat(m.length)) : r));
const BACK = {
  ...Object.fromEntries(Object.keys(HEADS).map((k) => [k, cleanBack(HEADS[k])])),
  crop: cleanBack(FRONT.crop),
  pony: [
    '................',
    '.....kkkkkk.....',
    '...kkhHHhhhkk...',
    '..khHHhhhhhhhk..',
    '..khHhhhhhhhhk..',
    '..khhhhkkhhhgk..',
    '..khhhkrrkhhhk..',
    '..khhhkhHkhhhk..',
    '..kghhkhhkhhhk..',
    '..kghhkhhkhhhk..',
    '..kghhkhhkhhhk..',
    '...khhkghkhhk...',
    '....khkghkhk....',
    '.....kkghkk.....',
    '......kggk......',
    '......kkkk......',
  ],
  long: [
    '......kkkk......',
    '....kkhHHhkk....',
    '...khHHhhhhhk...',
    '..khHhhhhhhhhk..',
    '.kghHhhhhhhhhhk.',
    '.kghhhhhhhhhhhgk',
    '.kghhhhhhhhhhhgk',
    '.kghhhhhhhhhhhgk',
    '.kghhhhhhhhhhhgk',
    '.kghhghhhhhhhhgk',
    '.kghhghhhhhhhhgk',
    '.kghhghhhhhhhhgk',
    '.kghhhhhhhhghhgk',
    '.kghhhhhhhhghhgk',
    '.kghhhhhhhhghhgk',
    '..kghhhhhhhhhgk.',
    '...kkkkkkkkkkk..',
  ],
  // The fringe is a band round the back from ear to ear, with the back of the neck below it.
  bald: [
    '................',
    '.....kkkkkk.....',
    '...kkSSsssskk...',
    '..kSSssssssssk..',
    '..kSssssssssdk..',
    '..ksssssssssdk..',
    '..khhsssssshgk..',
    '..kghhhhhhhhgk..',
    '.kdghhhhhhhhgdk.',
    '..kghhhhhhhhgk..',
    '..ksshhhhhhsdk..',
    '..kssssssssddk..',
    '...kssssssdk....',
    '....kksssskk....',
    '......kkkk......',
  ],
};
/** Every direction's head, as cast.js look() gives them: the front from the front and three-quarters front, the
 *  profile from the side, the back from behind and three-quarters behind. */
const headsOf = (h) => ({
  s: FRONT[h], se: FRONT[h], e: PROFILE[h], ne: BACK[h], n: BACK[h], nw: BACK[h], w: leftFacing(PROFILE[h]), sw: FRONT[h],
});

// ---- Merch and clothes ----
const ALT = { shirt: tones.black, print: '#d3212f' };                     // the black alternate tee, red print
const RED_CAP = { c: CAPS[0][0], C: CAPS[0][1], D: CAPS[0][2] };           // the red team cap
const SCRUNCHIE = { r: '#d3212f', R: '#ff6a55' };
const JEANS = {
  blue: {},                                                               // hers
  dark: { jeans: TEAMMATE_LOOK.pal.jeans, cuff: TEAMMATE_LOOK.pal.cuff },  // the teammate's
  black: { jeans: tones.black, cuff: tones.black },
  khaki: { jeans: tones.khaki, cuff: tones.khaki },
};
// Plain socks for everyone else: the odd yellow and blue pair is hers alone.
const SOCKS = {
  white: { sockL: tones.shirtWhite, sockR: tones.shirtWhite },
  dark: { sockL: TEAMMATE_LOOK.pal.sockL, sockR: TEAMMATE_LOOK.pal.sockR },
};
const SHOES = {
  white: {},
  black: { shoe: TEAMMATE_LOOK.pal.shoe, sole: TEAMMATE_LOOK.pal.sole },
  brown: { shoe: [HAIR.brown.g, HAIR.brown.h, HAIR.brown.H], sole: tones.black },
};

/**
 * Someone at the meeting, made as cast.js look() makes anyone: merch ('tee', 'hoodie' or 'alt'), a head from FRONT,
 * a skin and a hair from cast.js's palettes, trousers, socks and shoes, and any other colours (more, faceMore).
 */
function member(id, { merch, head, skin, hair, legs = 'blue', socks = 'white', shoes = 'white', more = {}, faceMore = {} }) {
  const shirt = merch === 'alt' ? ALT : MERCH[merch];
  const out = {
    id: `tm-${id}`,
    pal: { ...HERO_LOOK.pal, ...skinBody(skin), ...shirt, ...JEANS[legs], ...SOCKS[socks], ...SHOES[shoes], ...more },
    headPal: { ...BASE, ...SKIN[skin], ...HAIR[hair], q: '#aab2c8', r: HAIR[hair].h, R: HAIR[hair].H, ...faceMore },
    board: false,
    heads: headsOf(head),
  };
  // The hoodie as cast.js student() makes it: a pullover with long sleeves, the ribbed hem and the badge.
  if (merch === 'hoodie') Object.assign(out, { hoodie: true, sleeves: 'long', badge: TEAMMATE_LOOK.badge });
  return out;
}

// ---- Who's who ----
// Faces are spread so no two alike sit side by side, and kept clear of the arena's people (Rosa's brown curls, Juno's
// and Priya's black buns, Dani's bob, the grey glasses of Mr. Adeyemi and Gus, Milo's and Sam's caps).
const LOOKS = {
  tessa: member('tessa', { merch: 'alt', head: 'pony', skin: 'tan', hair: 'auburn', faceMore: SCRUNCHIE }),
  owen: {
    ...member('owen', { merch: 'hoodie', head: 'crop', skin: 'deep', hair: 'black', shoes: 'black', socks: 'dark', more: { board: ['#5e3a26', '#7a4a24', '#9a6234'] } }),
    board: true,
  },
  bea: member('bea', { merch: 'tee', head: 'bun', skin: 'light', hair: 'chestnut', legs: 'dark', shoes: 'black', socks: 'dark' }),
  kenji: member('kenji', { merch: 'hoodie', head: 'glasses', skin: 'fair', hair: 'black', legs: 'black', shoes: 'black', socks: 'dark' }),
  luis: member('luis', { merch: 'tee', head: 'cap', skin: 'brown', hair: 'black', faceMore: RED_CAP }),
  nadia: member('nadia', { merch: 'alt', head: 'bob', skin: 'deep', hair: 'brown', faceMore: { r: HAIR.chestnut.h, R: HAIR.chestnut.H } }),
  jamal: member('jamal', { merch: 'hoodie', head: 'curls', skin: 'deep', hair: 'black', legs: 'dark' }),
  eli: member('eli', { merch: 'tee', head: 'crop', skin: 'fair', hair: 'blonde' }),
  okafor: member('okafor', { merch: 'hoodie', head: 'bun', skin: 'deep', hair: 'grey', legs: 'black', shoes: 'black', socks: 'dark' }),
  brandt: member('brandt', { merch: 'tee', head: 'bald', skin: 'light', hair: 'grey', legs: 'khaki', shoes: 'brown', socks: 'dark' }),
  drv1: member('drv1', { merch: 'hoodie', head: 'bob', skin: 'tan', hair: 'auburn', faceMore: { r: HAIR.auburn.h, R: HAIR.auburn.H } }),
  drv2: member('drv2', { merch: 'tee', head: 'bun', skin: 'fair', hair: 'blonde', legs: 'dark', shoes: 'black', socks: 'dark' }),
  s1: member('s1', { merch: 'hoodie', head: 'long', skin: 'light', hair: 'chestnut', legs: 'dark' }),
  s2: member('s2', { merch: 'alt', head: 'crop', skin: 'tan', hair: 'brown', shoes: 'black', socks: 'dark' }),
  s3: member('s3', { merch: 'tee', head: 'pony', skin: 'deep', hair: 'black', legs: 'dark', faceMore: SCRUNCHIE }),
  s4: member('s4', { merch: 'tee', head: 'cap', skin: 'light', hair: 'chestnut', faceMore: RED_CAP }),
  s5: member('s5', { merch: 'tee', head: 'pony', skin: 'light', hair: 'brown', shoes: 'black', socks: 'dark', faceMore: SCRUNCHIE }),
  s6: member('s6', { merch: 'hoodie', head: 'cap', skin: 'tan', hair: 'black', legs: 'black', faceMore: RED_CAP }),
  s7: member('s7', { merch: 'alt', head: 'curls', skin: 'brown', hair: 'black', legs: 'dark' }),
  s8: member('s8', { merch: 'hoodie', head: 'long', skin: 'fair', hair: 'blonde', shoes: 'black', socks: 'dark' }),
};

export const CAST = {
  tessa: { name: 'TESSA, CO-CAPTAIN', look: LOOKS.tessa },
  owen: { name: 'OWEN, CO-CAPTAIN', look: LOOKS.owen },
  hero: { name: HERO_NAME, look: HERO_LOOK },
  teammate: { name: TEAMMATE_NAME, look: TEAMMATE_LOOK },
  bea: { name: 'BEA, BUILD LEAD', look: LOOKS.bea },
  kenji: { name: 'KENJI, PROGRAMMER', look: LOOKS.kenji },
  luis: { name: 'LUIS, SCOUTING LEAD', look: LOOKS.luis },
  nadia: { name: 'NADIA, OUTREACH LEAD', look: LOOKS.nadia },
  jamal: { name: 'JAMAL, DRIVE COACH', look: LOOKS.jamal },
  eli: { name: 'ELI, FRESHMAN', look: LOOKS.eli },
  okafor: { name: 'MS. OKAFOR, MENTOR', look: LOOKS.okafor },
  brandt: { name: 'MR. BRANDT, TEACHER', look: LOOKS.brandt },
  ...Object.fromEntries(['drv1', 'drv2', 's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'].map((id) => [id, { name: null, look: LOOKS[id] }])),
};

// ---- The circle ----
// From beside the gap at the back, down the left side, across the front and up the right side, as a goes from 210 to
// 510 degrees (0 is the front, nearest you). The gap, between the first and the last, is where the co-captains stand.
// Everyone Tessa calls out sits in the back half, where you see their faces: the drive team on the left, the build
// lead and the scouting lead on the right next to the strategist, and the teammate on her other side, toward the gap,
// where nobody in front hides her face. The freshman sits in among the drive team, the second seat from the gap, turned
// three-quarters to you and high enough that his groan at the permission slips shows well over the dialog box in the
// wide shot. The front row, backs to you, is the rest of the team.
const ORDER = ['jamal', 'eli', 'drv2', 'drv1', 's3', 's2', 's4', 's1', 'nadia', 's8', 'kenji', 's5', 's7', 's6', 'bea', 'luis', 'hero', 'teammate'];
/** How far round the ellipse each degree goes on the screen, added up from 210 degrees a degree at a time. */
const AROUND = [0];
for (let d = 1; d <= 300; d++) {
  const r = ((209.5 + d) * Math.PI) / 180;
  AROUND.push(AROUND[d - 1] + Math.hypot(CIRCLE.rx * Math.cos(r), CIRCLE.ry * Math.sin(r)));
}
/** The angle a fraction u of the way round, by distance on the screen. */
const byLook = (u) => {
  const L = u * AROUND[300], d = Math.max(1, AROUND.findIndex((s) => s >= L));
  return 209 + d + (L - AROUND[d - 1]) / (AROUND[d] - AROUND[d - 1]);
};
/** Three parts by how far apart they look to one part by angle. */
const SPREAD = 0.75;
export const SEATS = ORDER.map((id, k) => {
  const u = k / 17, a = (1 - SPREAD) * (210 + 300 * u) + SPREAD * byLook(u), r = (a * Math.PI) / 180;
  return { id, k, a, x: Math.round(CIRCLE.x + CIRCLE.rx * Math.sin(r)), y: Math.round(CIRCLE.y + CIRCLE.ry * Math.cos(r)) };
});
/** The mentors during the meeting, standing on the lawn either side of the circle: Ms. Okafor off its left side (with
 *  the path behind her, not the dark shop door, so she reads), Mr. Brandt off its right, in front of the bench. (Sat on
 *  the bench, the close-up on the strategist would cut him off at the waist.) */
const OKAFOR = { x: 148, y: 184 }, BRANDT = { x: 364, y: 190 };

/** The way to face a point on the ground, in the ground's own proportions. */
const face = (p, q) => dirToward((q.x - p.x) / FT, (q.y - p.y) / DEEP);
/** One step round from dir toward goal (or dir, if it's already there). */
const stepToward = (dir, goal) => {
  const d = ((goal - dir + 12) % 8) - 4;
  return d === 0 ? dir : (dir + Math.sign(d) + 8) % 8;
};
/** Cheering side on, raised arms hide behind the head: turn a step toward you. */
const sideOn = (dir) => (dir === 2 ? 1 : dir === 6 ? 7 : dir);
/** Standing up to cheer, turn to the camera: from side on or three-quarters behind to three-quarters toward you. */
const toYou = (dir) => (dir === 2 || dir === 3 ? 1 : dir === 5 || dir === 6 ? 7 : dir);
/** Where someone sitting at seat s facing dir has their hips, so they stand up where they sat: seated on the grass the
 *  rig puts their feet (s) at the middle of the lap, five pixels in front of the hips (walker.js LAP), and a pixel of
 *  depth is 2.75 / 8 of one across. */
const hipsOf = (s, dir) => {
  const a = (dir * Math.PI) / 4;
  return { x: Math.round(s.x - 5 * Math.sin(a)), y: Math.round(s.y - 5 * Math.cos(a) * (DEEP / FT)) };
};

/**
 * Chatting: time runs in slots of 2.6 seconds, and in each slot about three neighbouring pairs in ten (every other
 * pair, alternating slot by slot, so nobody's in two at once) turn to each other for a second or so. The neighbour k is
 * talking to at t, or -1.
 */
function chatting(k, t) {
  const n = Math.floor(t / 2.6), u = t - n * 2.6;
  for (const j of [k - 1, k]) {
    if (j < 0 || j > 16 || (j + n) % 2) continue;
    if (rnd(j * 17 + n * 53 + 5) > 0.3) continue;
    const t0 = rnd(j * 7 + n * 11 + 1) * 0.8, t1 = t0 + 1 + rnd(j * 3 + n * 29 + 2) * 0.7;
    if (u >= t0 && u < t1) return j === k ? k + 1 : k - 1;
  }
  return -1;
}
/** The neighbour someone groaning turns to: one side or the other, or the only one at the ends. The freshman turns to
 *  the one round the circle toward you, so his face shows. */
const groanTo = (s) => (s.id === 'eli' ? s.k + 1 : s.k === 0 ? 1 : s.k === 17 ? 16 : rnd(s.k * 5 + 9) < 0.5 ? s.k - 1 : s.k + 1);
/** About a third of the circle groan to a neighbour; the freshman always does. */
const groans = (s) => s.id === 'eli' || rnd(s.k * 13 + 3) < 0.3;
/** A clap: two frames, about five claps a second, each person out of step with the rest. */
const clapFrame = (t, i) => Math.floor((t + rnd(i) * 0.2) * 10) % 2;
/** The cheer at the end, as [gait, frame]: for its first 2.5 seconds the arms pump, up for 0.3 seconds and down to a
 *  clap for 0.2 (the way the praised cheer between shout-outs), each person in their own time; then they stay up. */
export const pump = (t, since, i, up, down) =>
  since < 2.5 && (t + rnd(i * 3 + 1) * 0.5) % 0.5 >= 0.3 ? [down, clapFrame(t, i)] : [up, 0];

/**
 * Everyone at the meeting except the co-captains (the cut scene places those two), t seconds into the cut scene,
 * reacting to cue. Each is { id, x, y, dir, gait, frame, look }, to draw with stage.js drawWithShadow.
 */
export function circle(t, cue = {}) {
  const { react = 'chat', at = CIRCLE, cheer = [], still = [], since = t, rise = false, toward = {} } = cue;
  const out = SEATS.map((s) => {
    const mid = face(s, CIRCLE);
    let dir = mid, gait = 'floor', frame = 0, x = s.x, y = s.y;
    if (react === 'chat') {
      const nb = chatting(s.k, t);
      if (nb >= 0) dir = stepToward(mid, face(s, SEATS[nb]));
    } else if (react === 'listen') {
      dir = face(s, toward[s.id] ?? at);
    } else if (react === 'clap') {
      dir = face(s, at);
      // The praised throw their arms up, again and again (up for 0.3 seconds, down to clap for 0.2), each in their own
      // time, so the eye finds them. With rise (the wide shots) they're up on their feet from the cut, where they sat,
      // turned to the camera; otherwise they cheer sitting, turned a step toward you if they were side on. The rest
      // start clapping within 0.3 seconds of each other; anyone still just sits.
      const up = (t + rnd(s.k * 3 + 1) * 0.5) % 0.5 < 0.3;
      if (cheer.includes(s.id) && rise) {
        ({ x, y } = hipsOf(s, dir));
        dir = toYou(dir);
        [gait, frame] = up ? ['hooray', 0] : ['clap', clapFrame(t, s.k)];
      } else if (!still.includes(s.id) && since >= rnd(s.k * 31 + 7) * 0.3) {
        if (cheer.includes(s.id)) [gait, frame, dir] = up ? ['floorCheer', 0, sideOn(dir)] : ['floorClap', clapFrame(t, s.k), sideOn(dir)];
        else [gait, frame] = ['floorClap', clapFrame(t, s.k)];
      }
    } else if (react === 'cheer') {
      // Arms up within 0.2 seconds of each other, pumping (a clap between) for the first two and a half seconds, then
      // held up.
      dir = face(s, at);
      if (since >= rnd(s.k * 23 + 11) * 0.2) [gait, frame, dir] = [...pump(t, since, s.k, 'floorCheer', 'floorClap'), sideOn(dir)];
    } else if (react === 'groan') {
      dir = groans(s) ? face(s, SEATS[groanTo(s)]) : face(s, at);
    }
    return { id: s.id, x, y, dir, gait, frame, look: CAST[s.id].look };
  });
  // The mentors stand and watch, and clap and cheer with them, a moment after the students.
  const watching = react === 'chat' ? CIRCLE : at;
  const mentor = (id, spot, i) => {
    const p = { id, ...spot, dir: face(spot, watching), gait: 'stand', frame: 0, look: LOOKS[id] };
    if (react === 'clap' && since >= 0.15 + i * 0.08) [p.gait, p.frame] = ['clap', clapFrame(t, 18 + i)];
    if (react === 'cheer' && since >= 0.1 + i * 0.08) [p.gait, p.frame] = pump(t, since, 18 + i, 'hooray', 'clap');
    // Cheering, they turn a step toward you, to the whole circle, if they were side on (and stay turned between pumps).
    if (react === 'cheer' && p.gait !== 'stand') p.dir = sideOn(p.dir);
    return p;
  };
  return [...out, mentor('okafor', OKAFOR, 0), mentor('brandt', BRANDT, 1)];
}

// ---- After the meeting ----
// Where everyone goes when it breaks up, by their feet. gait: 'stand', 'sit' (on the bench) or 'floor' (on the grass).
const AFTER = [
  // The co-captains, still at the head of the old circle, talking it over (a step right of it, so Tessa's head is clear
  // of Ms. Okafor behind her).
  { id: 'tessa', x: 254, y: 176, dir: 2, gait: 'stand' },
  { id: 'owen', x: 274, y: 176, dir: 6, gait: 'stand' },
  // The teammate, up from her place, waiting for the strategist.
  { id: 'teammate', x: 322, y: 188, dir: 7, gait: 'stand' },
  // The build lead on the path, looking in at the robot through the shop door.
  { id: 'bea', x: 150, y: 150, dir: 4, gait: 'stand' },
  // The mentor on the path just right of the thank-you card, turned to it, clear of it so it reads whole (the card's
  // right edge is at x 227; she's 230 to 244), with her bag at her feet. Left of it she'd stand in front of the robot.
  { id: 'okafor', x: 238, y: 153, dir: 6, gait: 'stand' },
  // The programmer in the left tree's shade with a laptop on his lap.
  { id: 'kenji', x: 86, y: 199, dir: 0, gait: 'floor' },
  // The teacher and the scouting lead on the bench.
  { id: 'brandt', x: 342, y: BENCH.y + 3, dir: 0, gait: 'sit' },
  { id: 'luis', x: 366, y: BENCH.y + 3, dir: 0, gait: 'sit' },
  // The outreach lead behind the sign-up table, far enough back that her face shows over anyone across it from her.
  { id: 'nadia', x: 424, y: 212, dir: 0, gait: 'stand' },
  // The drive team in a huddle, short of the sign-up table so it shows, a step apart so their faces don't touch, and
  // far enough up the lawn that, with the view held at the bottom of the world, Jamal shows to the waist over the box.
  { id: 'jamal', x: 384, y: 230, dir: 6, gait: 'stand' },
  { id: 'drv1', x: 360, y: 230, dir: 2, gait: 'stand' },
  { id: 'drv2', x: 372, y: 238, dir: 4, gait: 'stand' },
  // The freshman, on his own on the grass (high enough that, with the view lifted while she talks to him, the dialog
  // box doesn't cover him even at the lowest view).
  { id: 'eli', x: 214, y: 210, dir: 0, gait: 'floor' },
  // The rest: three standing by the path near the shop (two facing each other, the third a step in front with her back
  // to you, her head below their chins), a pair sitting where the circle was, one by the bench, one on the grass, one
  // in the right tree's shade.
  { id: 's1', x: 112, y: 160, dir: 2, gait: 'stand' },
  { id: 's4', x: 128, y: 158, dir: 6, gait: 'stand' },
  { id: 's3', x: 120, y: 178, dir: 4, gait: 'stand' },
  { id: 's6', x: 270, y: 220, dir: 2, gait: 'floor' },
  { id: 's7', x: 287, y: 222, dir: 6, gait: 'floor' },
  { id: 's8', x: 404, y: 182, dir: 7, gait: 'stand' },
  { id: 's2', x: 150, y: 220, dir: 2, gait: 'floor' },
  { id: 's5', x: 486, y: 196, dir: 6, gait: 'floor' },
];
/** How far above the feet the A bubble's top goes: just over their head (its box and tail are 12 pixels; heads' tops
 *  are 45 pixels up standing, 38 on the bench and 31 on the grass), so in a group it's plain whose it is. */
const BUBBLE = { stand: 58, sit: 51, floor: 44 };
/** The silent ones in the groups who look about now and then; everyone else holds still. */
const GLANCERS = ['s1', 's4', 'drv2', 's6'];

/** Kenji's laptop, seen from behind its lid as he faces you: grey, outlined, lit along the top, one red sticker. */
function laptop(g, view, p) {
  const x = Math.round(p.x - view.x) - 4, y = Math.round(p.y - view.y) - 9;
  g.fillStyle = C.ink;
  g.fillRect(x, y, 9, 7);
  g.fillStyle = C.steel2;
  g.fillRect(x + 1, y + 1, 7, 5);
  g.fillStyle = C.steel3;
  g.fillRect(x + 1, y + 1, 7, 1);
  g.fillRect(x + 1, y + 2, 1, 4);
  g.fillStyle = C.red1;
  g.fillRect(x + 5, y + 3, 1, 1);
}

/**
 * The people on the lawn after the meeting (not her: she's stage.js's s.player), t seconds after the page opened, as
 * circle() gives them, plus extra(g, view) on anyone with something to draw just after them. o.me: her feet; o.talking:
 * the id of whoever she's talking to, who turns to face her (unless they're on the bench, or the programmer).
 */
export function after(t, o = {}) {
  return AFTER.map((a, i) => {
    const p = { id: a.id, x: a.x, y: a.y, dir: a.dir, gait: a.gait, frame: 0, look: CAST[a.id].look };
    // A little life: Tessa makes a point for a second every four or so. In the groups, one person now and then turns a
    // step one way or the other for a moment (in about one five-second spell in three, for its first second and a half).
    if (a.id === 'tessa' && (t + 1.3) % 4.2 < 1) p.gait = 'gesture';
    if (GLANCERS.includes(a.id)) {
      const u = t + rnd(i) * 5, n = Math.floor(u / 5);
      if (rnd(i * 7 + n * 13) < 0.35 && u % 5 < 1.4) p.dir = (a.dir + (rnd(i + n) < 0.5 ? 1 : 7)) % 8;
    }
    // Whoever she's talking to turns to her, except on the bench and the programmer, who stays on his laptop.
    if (o.talking === a.id && o.me && a.gait !== 'sit' && a.id !== 'kenji') p.dir = face(a, o.me);
    if (a.id === 'kenji') p.extra = (g, view) => laptop(g, view, p);
    return p;
  });
}

/** The eleven she can talk to. gait says how they're placed ('stand', 'sit' on the bench, 'floor' on the grass), and
 *  faceGait how the phone shows them talking: seated on the bench as the arena's front row is, otherwise standing
 *  (stage.js lifts only 'sit' into the phone's frame). */
export const TALKERS = ['tessa', 'owen', 'teammate', 'bea', 'kenji', 'luis', 'nadia', 'jamal', 'eli', 'okafor', 'brandt'].map((id) => {
  const a = AFTER.find((p) => p.id === id);
  return {
    id, name: CAST[id].name, x: a.x, y: a.y, look: CAST[id].look, gait: a.gait, bubble: BUBBLE[a.gait],
    faceGait: a.gait === 'sit' ? 'sit' : 'stand',
  };
});

/** How far either side of someone on the grass the space kept clear round them reaches, on the side (x - p.x) is on:
 *  16 (their crossed legs reach 10 from the lap, hers 6), and 4 more on the side their back is (the hips are 5 behind
 *  the lap, walker.js LAP). Facing right (1-3), their back is on the left; facing left (5-7), on the right. */
const lapWidth = (p, dx) => 16 + (Math.sign(dx) === (p.dir >= 1 && p.dir <= 3 ? -1 : p.dir >= 5 ? 1 : 0) ? 4 : 0);

/**
 * True when feet at (x, y) would stand in someone after the meeting, or so close that one of them would hide the
 * other's face. Standing: 18 pixels either side, so two faces in profile (each reaches 7 pixels in front of its middle)
 * keep a gap; 14 behind, so her eyes stay above their head when she's behind them (they're drawn after her); and 15 in
 * front, where her head comes up only to their chin. Sitting, their faces are lower, so she stops further off in front,
 * again where her head comes up to their chin: on the grass, lapWidth() either side, 4 behind and 29 in front; the
 * bench, its whole front out to 25 pixels (22 past the feet of the two on it) and 4 past its ends.
 */
export function occupied(x, y) {
  if (x >= BENCH.x0 - 4 && x <= BENCH.x1 + 4 && y > BENCH.y && y <= BENCH.y + 25) return true;
  return AFTER.some((p) => {
    if (p.gait === 'sit') return false;
    const dx = x - p.x, dy = y - p.y;
    if (p.gait === 'floor') return Math.abs(dx) <= lapWidth(p, dx) && dy >= -4 && dy <= 29;
    return Math.abs(dx) <= 18 && dy >= -14 && dy <= 15;
  });
}

/**
 * Whether feet at (x, y) are close enough to p (one of TALKERS) to talk, and how close (smaller is closer), or
 * Infinity. Close enough is within a step or so of the space occupied() keeps clear round them, wider than a running
 * step, so wherever walking up to them stops her, from any side, she can talk: 9 pixels past it either side, 7 behind
 * and 9 in front (across the sign-up table from Nadia, say). How close is how far she is from the edge of that space
 * (a pixel of depth counting as two across), and then how far she is off their middle, so it's whoever she's walked up
 * to that gets the A. On the bench the space is the bench's front, and its near end, for each of the two on it.
 */
export function within(p, x, y) {
  const dx = Math.abs(x - p.x), dy = y - p.y;
  // The space kept clear round them: w either side, back behind them and front in front.
  const [w, back, front] = p.gait === 'stand' ? [18, 14, 15]
    : p.gait === 'floor' ? [lapWidth(p, x - p.x), 4, 29]
      : [p.x < (BENCH.x0 + BENCH.x1) / 2 ? p.x - BENCH.x0 + 4 : BENCH.x1 + 4 - p.x, p.y - WALL_Y - 4, BENCH.y + 25 - p.y];
  if (dx > w + 9 || dy < -back - 7 || dy > front + 9) return Infinity;
  return Math.max(0, dx - w) + 2 * Math.max(0, -back - dy, dy - front) + dx / 20;
}
