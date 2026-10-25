// The people at alliance selection: a student rep from every team at the event, the queuer and the field
// volunteer from the arena, what they say once the alliances are made, and where the MC skates while she walks about.
// Everyone is drawn on the walker's rig (walker.js) in a look built the cast's way (cast.js look()), exactly like the
// crowd in the arena's stands: one of the five hand-drawn heads (curls, glasses, cap, bun, bob), a skin and hair from
// the cast's palettes, and three-tone clothes outlined in ink. So a rep looks like a fan who came down from the stands,
// in their own team's shirt.
//
// Each team has its own colours: a shirt ramp and a logo on the chest (the rig's 4x2 print) in a second colour, some
// in pullover hoodies (long sleeves, the hood round the neck, a ribbed hem a shade darker than the hoodie), jeans in
// blue, khaki or black, and caps in the team's own colours. Three new shirt ramps sit beside the palette's, with its
// saturation and value steps: teal, lime and a heather grey. Nobody wears red, pink or magenta: red is 5026's (her tee)
// and magenta is the MC's blazer, so both read at a glance across the field. The colours follow the story: 4000 orange,
// 2468 green, 3000 blue (the arena's blue arm bot), 1357 purple, 7777 yellow with black jeans (like Juno, their scout
// in the arena's stands), 6417 white, 8086 teal, 5940 a navy hoodie, 9152 lime and 6038 khaki. Heads and shirts are
// spread so nobody stands next to their double: not in the waiting crowd as the scene opens (WAITING[n] in
// waitSlot(n)), not inside an alliance, not between neighbouring alliances, and not among the backups.
//
// From behind, a rep shows the back of their head: the template's face filled with hair, brows and all (cast.js
// backOf() keeps the brows' dark hair pixels in the face, which from behind read as two closed eyes on light hair). A
// cap's is drawn by hand: under the cap and its band, the hair lit on the upper left and dark on the right, tapering
// to the nape of the neck, with no ears sticking out (the face's outline filled with hair would be a blank face).
//
// Once selection is over, everyone stands where it left them (layout.js): each alliance's captain on its spot facing
// you, the two picks close behind on either side (a couple turned to their captain), the backups round the queuer
// (the front row turned three-quarters to you, the top backup a step out in front) with 6038's rep on their own, facing
// the field they turned down, Priya and Sam where they work, and the head referee by the near wall past the end of
// the line, waiting to brief the captains. Eleven of them have something to say, each a little lesson in picking: why
// a pick should do what your robot can't, why late picks are about reliability, what happens when a captain picks a
// captain, why you never turn an invitation down lightly, how the backups work and what comes next.
// MC Robin, meanwhile, skates the strip in front of the line: a loop of about twenty seconds, a stop by the mic with the
// mic up, a weave in front of the captains to past the red end, a spin and a pose, the whole line back to past the blue
// end, another spin, and home again.
//
//   lookOf(key)      a walker look: '5026' (her), any team number in RANKED, 'priya', 'sam' or 'ref' (the MC's is mc.js)
//   CROWD            everyone standing once it's over, except her and the MC: { id, x, y, dir, look }
//   TALKERS          the ones she can talk to, as stage.js `people`: the same objects as in CROWD, plus name and lines
//   MC_LINES         the MC's pages, for when she catches Robin
//   mcPatrol(t)      where the MC is t seconds into the walkabout: { x, y, dir, gait, dist }, a pure function of time

import { look, tones, skinBody, SKIN, HAIR, BASE, HEADS, backOf } from '../cast.js';
import { HERO_LOOK } from '../walker.js';
import { PEOPLE } from '../bleachers.js';
import { along } from '../stage.js';
import {
  RANKED, ALLIANCES, BACKUPS, DECLINED, SPOTS, lineY, capSpot, pickSpot, backupSpot, DECLINED_AT, PRIYA_AT, SAM_AT, REF_AT, MC_HOME,
  MIC, SKATE_SPEED,
} from './layout.js';

// ---- Colours ----
/** New shirt ramps (shade, mid, lit), beside cast.js's tones. */
export const TEAL = ['#0b4f5c', '#139aa6', '#5fd9d2'];
export const LIME = ['#3d6b12', '#6fb52a', '#b4e66a'];
export const HEATHER = ['#4f5366', '#8a8fa3', '#c3c7d4'];
const { shirtOrange: ORANGE, shirtGreen: GREEN, shirtBlue: BLUE, shirtPurple: PURPLE, shirtYellow: YELLOW, shirtWhite: WHITE } = tones;
const NAVY = tones.hoodie, BLACK = tones.black, KHAKI = tones.khaki;
// Logos are one colour: white, ink, or another ramp's mid or lit tone.
const W = '#ffffff', INK = BASE.k;

/**
 * A hoodie's ribbed hem and cuffs: the hoodie a shade darker, as on the teammate's (its shade, its mid, and a deeper
 * shade under them, the shade pulled 38% of the way to ink).
 */
function deeper([lo, mid]) {
  const ink = [0x0b, 0x0d, 0x17];
  const deep = [1, 3, 5].map((i, k) => Math.round(parseInt(lo.slice(i, i + 2), 16) * 0.62 + ink[k] * 0.38));
  return [`#${deep.map((v) => v.toString(16).padStart(2, '0')).join('')}`, lo, mid];
}

// ---- The reps ----
/**
 * One team's rep: their shirt ramp and logo colour, head template, skin and hair, and o: hoodie (a pullover), jeans
 * ('khaki' or 'black'; blue if not given), cap (a ramp for the cap's crown and brim; the shirt's if not given), streak
 * (a ramp for the bob's streak of colour).
 */
const rep = (shirt, print, head, skin, hair, o = {}) => ({ shirt, print, head, skin, hair, ...o });

// In rank order. Heads: curls, glasses, cap, bun, bob; skins: deep, brown, tan, light, fair.
const REPS = {
  '4000': rep(ORANGE, W, 'cap', 'tan', 'black', { cap: WHITE }), // MAYA, captain 1
  '2468': rep(GREEN, YELLOW[1], 'curls', 'deep', 'black'), // THEO, picked by 4000
  '3000': rep(BLUE, W, 'bun', 'light', 'auburn'), // LENA, captain 2
  '1357': rep(PURPLE, YELLOW[1], 'glasses', 'brown', 'black'), // RAFA
  '7777': rep(YELLOW, INK, 'cap', 'fair', 'blonde', { jeans: 'black', cap: BLACK }), // KIT
  '6417': rep(WHITE, BLUE[1], 'bob', 'deep', 'black', { streak: BLUE }), // NOOR
  '8086': rep(TEAL, W, 'curls', 'light', 'chestnut'), // BEN
  '5940': rep(NAVY, ORANGE[1], 'bun', 'tan', 'brown', { hoodie: true }), // ADA
  '9152': rep(LIME, INK, 'cap', 'brown', 'black', { cap: NAVY }), // IKE, the new captain 8
  '6038': rep(KHAKI, NAVY[1], 'glasses', 'fair', 'auburn'), // ZOE, who declined
  '8812': rep(HEATHER, ORANGE[1], 'curls', 'brown', 'black'), // OMAR
  '7040': rep(TEAL, YELLOW[1], 'glasses', 'light', 'black', { hoodie: true }), // JUN
  '6612': rep(PURPLE, YELLOW[1], 'cap', 'tan', 'chestnut', { hoodie: true, jeans: 'khaki', cap: YELLOW }), // BELLA
  '8248': rep(BLACK, ORANGE[1], 'bob', 'fair', 'brown'), // MILES
  '9785': rep(ORANGE, W, 'curls', 'tan', 'black'), // SOFIA
  '6017': rep(BLUE, W, 'glasses', 'deep', 'black', { hoodie: true }), // DEV
  '7311': rep(PURPLE, LIME[2], 'bun', 'light', 'black'), // HANA
  '2202': rep(GREEN, W, 'bob', 'light', 'blonde'), // LUCA
  '4471': rep(HEATHER, BLUE[1], 'glasses', 'brown', 'brown', { hoodie: true }), // AMIR
  '5518': rep(GREEN, W, 'bun', 'deep', 'black'), // CLEO
  '8590': rep(ORANGE, NAVY[1], 'bob', 'fair', 'brown', { jeans: 'khaki' }), // NICO
  '3141': rep(WHITE, TEAL[1], 'bun', 'fair', 'blonde', { jeans: 'black' }), // PIA
  '6060': rep(BLACK, YELLOW[1], 'cap', 'light', 'brown', { cap: YELLOW }), // REX, 3000's second pick
  '9001': rep(HEATHER, TEAL[1], 'bun', 'brown', 'black', { hoodie: true, jeans: 'black' }), // TESS
  '4321': rep(WHITE, NAVY[1], 'curls', 'light', 'brown', { hoodie: true }), // GABE, the top backup
  '2718': rep(GREEN, YELLOW[1], 'cap', 'tan', 'black', { hoodie: true, cap: YELLOW }), // IVY
  '1618': rep(TEAL, W, 'bob', 'deep', 'black'), // OSCAR
  '1492': rep(HEATHER, ORANGE[1], 'cap', 'light', 'black', { hoodie: true, cap: ORANGE }), // MEI
  '2048': rep(BLACK, LIME[2], 'glasses', 'fair', 'chestnut', { jeans: 'khaki' }), // FINN
  '3690': rep(ORANGE, NAVY[1], 'bun', 'brown', 'black'), // KAI
  '1776': rep(NAVY, W, 'curls', 'fair', 'auburn', { hoodie: true }), // ELLA
  '7007': rep(LIME, INK, 'glasses', 'deep', 'black'), // RUBY
};

/**
 * The back of a head with no brows left on it: in each row of the front template, the brows' dark hair (g) between two
 * bits of face becomes plain hair before backOf() fills the face in, so only the hair's own edges stay dark.
 */
const FACE_RE = /[sSdeEwMTmq]/;
const cleanBack = (rows) => backOf(rows.map((r) => r.replace(/g/g, (m, i) => (FACE_RE.test(r.slice(0, i)) && FACE_RE.test(r.slice(i + 1)) ? 'h' : m))));
const BACK = Object.fromEntries(Object.entries(HEADS).map(([k, rows]) => [k, cleanBack(rows)]));
BACK.cap = [
  ...BACK.cap.slice(0, 6),
  '..kHHhhhhhhhgk..',
  '..kHhhhhhhhhgk..',
  '..khhhhhhhhhgk..',
  '..kghhhhhhhhgk..',
  '..kghhhhhhhggk..',
  '..kgghhhhhhggk..',
  '...kgghhhhggk...',
  '....kkddddkk....',
  '......kkkk......',
];
if (BACK.cap.length !== HEADS.cap.length || BACK.cap.some((r) => r.length !== 16)) throw new Error('people.js: the cap from behind is the wrong size');

/** A rep's look, built like cast.js stranger(): the cast's head and palettes, in the team's colours. */
function repLook(num, r) {
  const hair = HAIR[r.hair], cap = r.cap ?? r.shirt;
  const legs = r.jeans ? { jeans: tones[r.jeans], cuff: tones[r.jeans] } : {};
  const body = { ...skinBody(r.skin), shirt: r.shirt, print: r.print, ...legs, ...(r.hoodie ? { hem: deeper(r.shirt) } : {}) };
  const out = look(`rep${num}`, body, r.head, {
    ...SKIN[r.skin], ...hair, q: '#aab2c8', r: r.streak ? r.streak[1] : hair.h, R: r.streak ? r.streak[2] : hair.H,
    c: cap[1], C: cap[2], D: cap[0],
  });
  const back = BACK[r.head];
  out.heads = { ...out.heads, ne: back, n: back, nw: back };
  return r.hoodie ? { ...out, hoodie: true, sleeves: 'long' } : out;
}

/**
 * The head referee: a volunteer in the black-and-white stripes, black slacks and black shoes, grey hair and glasses.
 * The stripes are painted down the shirt where it faces you (walker.js badge), one dark pixel in three.
 */
const STRIPE = tones.black[1];
const REF_LOOK = {
  ...look('ref', {
    ...skinBody('light'), shirt: tones.shirtWhite, print: null, jeans: tones.black, cuff: tones.black,
    sockL: tones.black, sockR: tones.black, shoe: tones.black,
  }, 'glasses', { ...SKIN.light, ...HAIR.grey, q: '#aab2c8' }),
  badge: [-9, -6, -3, 0, 3, 6, 9].map((dx) => [dx, -10, 1, 24, STRIPE]),
};
REF_LOOK.heads = { ...REF_LOOK.heads, ne: BACK.glasses, n: BACK.glasses, nw: BACK.glasses };
const LOOKS = Object.fromEntries(Object.entries(REPS).map(([num, r]) => [num, repLook(num, r)]));
// Priya and Sam are the arena's own (bleachers.js), so they look the same here as there.
for (const id of ['priya', 'sam']) LOOKS[id] = PEOPLE.find((p) => p.id === id).look;
LOOKS['5026'] = HERO_LOOK;
LOOKS.ref = REF_LOOK;
for (const { num } of RANKED) if (!LOOKS[num]) throw new Error(`people.js: no rep look for team ${num}`);

/** Who looks like what: '5026' is her, a team number its rep, 'priya' and 'sam' the arena's, 'ref' the head referee. */
export function lookOf(key) {
  const out = LOOKS[key];
  if (!out) throw new Error(`people.js: nobody called ${key}`);
  return out;
}
/** For checking: each rep's head template and shirt ramp. */
export const repStyle = (num) => REPS[num];

// ---- Where everyone stands once it's over ----
const at = (id, spot, dir = spot.dir ?? 0) => ({ id, x: spot.x, y: spot.y, dir, look: lookOf(id) });
// Two picks turned to their captain: a pick on the left looks down-right to them (se), one on the right down-left (sw).
const TURNED = { '8248': 1, '8590': 7 };
/** Everyone standing once selection is over, except her (3000's first pick) and the MC. */
export const CROWD = [
  ...ALLIANCES.flatMap(([cap, ...picks], i) => [
    at(cap, capSpot(i)),
    ...picks.map((num, k) => (num === '5026' ? null : at(num, pickSpot(i, k + 1), TURNED[num] ?? 0))).filter(Boolean),
  ]),
  ...BACKUPS.map((num, k) => at(num, backupSpot(k))),
  ...DECLINED.map((num) => at(num, DECLINED_AT)),
  at('priya', PRIYA_AT),
  at('sam', SAM_AT),
  at('ref', REF_AT),
];

// ---- What they say ----
// Two lines of at most 38 characters a page. Everything they say about the rules is the 2019 manual's (section 12.7,
// and the Championship's third round) or the way FIRST runs selection today (the pick clock). Robin owns up that she
// skated the mic out to the strategist: the invited team's rep usually comes up to the MC's mic on the field.
const WORDS = [
  ['3000', 'LENA, 3000 CAPTAIN', [
    ['YOU HUNG HATCHES WITH US IN QUALS.', 'WE SCORE CARGO. A PERFECT FIT.'],
    ['A GOOD PICK DOES WHAT YOUR ROBOT', "CAN'T. THAT'S THE WHOLE TRICK."],
    ["IN PLAYOFFS I'M IN STATION 2. FIRST", 'PICK IN 1, SECOND PICK IN 3.'],
  ]],
  ['6060', 'REX, 6060', [
    ['SECOND PICK! WE NEVER MISSED A', 'MATCH ALL WEEKEND. NOT ONE.'],
    ['ROUND TWO GOES EIGHT TO ONE, SO', 'ALLIANCE TWO PICKED NEXT TO LAST.'],
    ['LATE PICKS ARE ABOUT RELIABILITY.', 'A ROBOT THAT ALWAYS DRIVES IS GOLD.'],
  ]],
  ['4000', 'MAYA, 4000 CAPTAIN', [
    ['WE PICKED THE NUMBER TWO SEED, SO', 'EVERY CAPTAIN BELOW US MOVED UP.'],
    ['WE COULD ASK ANYONE RANKED BELOW US.', 'NOBODY COULD ASK US. WE WERE FIRST.'],
    ['IT MAKES ALLIANCE ONE STRONG. BUT', 'IT GIVES EVERYONE ELSE BETTER PICKS.'],
    ['WE PICK FIRST IN ROUND ONE AND LAST', 'IN ROUND TWO. THE SNAKE EVENS IT OUT.'],
  ]],
  ['2468', 'THEO, 2468', [
    ['WE COULD HAVE STAYED CAPTAIN TWO. WE', 'CHOSE TO JOIN THE BEST ROBOT HERE.'],
    ['SAYING NO WOULD HAVE KEPT US CAPTAIN,', "BUT THEN WE COULDN'T JOIN ANYONE."],
    ['MAYA ASKED US THIS MORNING. TALK TO', 'TEAMS EARLY. IT SAVES THE CLOCK.'],
  ]],
  ['7777', 'KIT, 7777 CAPTAIN', [
    ['OUR SCOUT JUNO HAS NOTES ON EVERY', "ROBOT. THAT'S HOW WE FOUND 7040."],
    ['6038 SAID NO, SO THE CLOCK RESET AND', 'WE ASKED THE NEXT TEAM ON OUR LIST.'],
    ['KEEP YOUR LIST IN ORDER, AND CROSS', 'TEAMS OFF AS THEY GET PICKED.'],
  ]],
  ['9152', 'IKE, 9152 CAPTAIN', [
    ['WE FINISHED QUALS NINTH. THEN 1', 'PICKED 2 AND WE MOVED UP TO 8!'],
    ['AS NUMBER EIGHT WE PICK LAST IN ROUND', 'ONE, THEN FIRST IN ROUND TWO.'],
    ['ALWAYS SEND A REP READY TO CAPTAIN.', 'YOU NEVER KNOW WHO MOVES UP.'],
  ]],
  ['6038', 'ZOE, 6038', [
    ['WE TURNED DOWN 7777, HOPING TO MOVE', 'UP TO CAPTAIN. IT NEVER HAPPENED.'],
    ['A TEAM THAT SAYS NO CAN STILL MOVE UP', 'TO CAPTAIN. WE WERE NEXT IN LINE.'],
    ["NOW NOBODY CAN PICK US, AND WE CAN'T", 'BE A BACKUP. LESSON LEARNED.'],
  ]],
  ['4321', 'GABE, 4321', [
    ["WE'RE THE TOP BACKUP. IF A ROBOT", 'BREAKS, AN ALLIANCE CAN CALL US IN.'],
    ['EACH ALLIANCE GETS ONE BACKUP, AND', 'WE COME IN BY RANK. 4321 IS FIRST.'],
    ['SO OUR BATTERY STAYS CHARGED AND', 'OUR BUMPERS STAY ON. JUST IN CASE.'],
  ]],
  // Her tag as in the arena's stands (bleachers.js), so she's the same person from scene to scene.
  ['priya', 'PRIYA, QUEUER', [
    ['BACKUP TEAMS CHECK IN WITH ME. UP', 'TO EIGHT OF THEM, BEST RANKED FIRST.'],
    ['A TEAM THAT TURNED AN INVITE DOWN', "CAN'T BE A BACKUP. SORRY, 6038."],
    ["CAPTAINS STAY FOR THE HEAD REF'S", "PLAYOFF BRIEFING. YOU'RE FREE TO GO."],
  ]],
  ['sam', 'SAM, FIELD VOLUNTEER', [
    ['REPS ONLY ON THE FIELD RIGHT NOW.', 'LOOKS LIKE THAT INCLUDES YOU!'],
    ['THIS MORNING I SENT YOU BACK TO THE', 'STANDS. NOW LOOK AT YOU: A FIRST PICK!'],
    ['ONCE THE CAPTAINS HEAD OUT, WE', 'RESET THE FIELD FOR PLAYOFFS.'],
  ]],
  ['ref', 'DALE, HEAD REF', [
    ["I'M HERE FOR THE CAPTAINS. THEY STAY", 'ON THE FIELD FOR MY PLAYOFF BRIEFING.'],
    ['EACH ALLIANCE GETS ONE TIMEOUT IN', 'PLAYOFFS. SPEND IT WISELY.'],
    ['IF A ROBOT BREAKS, ITS CAPTAIN CAN', 'CALL IN THE HIGHEST-RANKED BACKUP.'],
    ["AT CHAMPIONSHIP THERE'S A ROUND THREE,", 'ONE TO EIGHT AGAIN, FOR TEAMS OF FOUR.'],
  ]],
];
/** Who she can talk to: stage.js `people` entries, the very objects in CROWD (so nobody is drawn twice). */
export const TALKERS = WORDS.map(([id, name, lines]) => {
  const p = CROWD.find((c) => c.id === id);
  return Object.assign(p, { name, lines });
});

/** MC Robin's pages, when she catches the MC skating the line. */
export const MC_LINES = [
  ['NICE ANSWER, 5026! USUALLY THE REP', 'COMES TO MY MIC, BUT I LOVE TO SKATE!'],
  ["MY 'YOU ARE ON THE CLOCK' STARTS IT:", '45 SECONDS A PICK, 90 IN ROUND TWO.'],
  ['AND TWO MINUTES BETWEEN ROUNDS, SO', 'EVERY ALLIANCE CAN TALK IT OVER.'],
  ['THE PICKS ARE ALL YOU STUDENTS. I', 'JUST SKATE AROUND AND KEEP IT LOUD!'],
];

// ---- The MC's patrol ----
// A loop along the strip in front of the arc, never nearer the captains than 8 pixels (their feet are on the arc,
// layout.js lineY): Robin stops beside the mic, mic up, looks down the line and weaves off in front of the captains to
// the gap between the last two alliances on the red side, where she spins twice and lands in a pose with nobody under
// her flung-up arm; gives the far alliances a word, then weaves the whole line, in front of the mic stand, to the gap
// between the first two on the blue side, spins and poses again, and glides home. The weave swings out in front of
// each captain and back in at each gap, as near the near wall as she goes at the arc's ends. Directions come from
// along(); her pushes step with the distance rolled, which keeps adding up from one loop to the next.
const HOME = { x: MC_HOME.x, y: MC_HOME.y };
/** The weave's two depths at x: in at the gaps between alliances, out in front of a captain; never past row 140. */
const IN = (x) => Math.min(139, Math.round(lineY(x)) + 8), OUT = (x) => Math.min(140, Math.round(lineY(x)) + 11);
const gapX = (i) => (SPOTS[i] + SPOTS[i + 1]) / 2;
const RIGHT = [gapX(6), IN(gapX(6)) + 1], LEFT = [gapX(0), IN(gapX(0)) + 1];
/** The weave along the captains from x0 to x1: out in front of each captain, in at each gap (skipping the mic's). */
const weave = (x0, x1) => {
  const pts = [];
  SPOTS.forEach((x, i) => {
    pts.push([x, OUT(x)]);
    if (i < 7 && SPOTS[i + 1] - x < 60) pts.push([gapX(i), IN(gapX(i))]);
  });
  const out = pts.filter(([x]) => x > Math.min(x0, x1) && x < Math.max(x0, x1));
  return x0 < x1 ? out : out.reverse();
};
const TO_RIGHT = [[HOME.x, HOME.y], ...weave(HOME.x, RIGHT[0]), RIGHT];
// Back across the middle she passes in front of the mic stand (its foot is on row 129).
const TO_LEFT = [RIGHT, ...weave(RIGHT[0], MIC.x + 10), [MIC.x + 10, 136], [MIC.x - 10, 136], ...weave(MIC.x - 10, LEFT[0]), LEFT];
const TO_HOME = [LEFT, [SPOTS[1], IN(SPOTS[1]) + 1], [SPOTS[3], IN(SPOTS[3]) + 4], [MIC.x - 8, 136], [MIC.x + 8, 135], [HOME.x, HOME.y]];

/** Turning on the spot from one direction to another, the short way round, a step at a time. */
const turnDir = (from, to, u) => {
  const d = ((to - from + 12) % 8) - 4;
  return (((from + Math.round(d * Math.min(1, Math.max(0, u)))) % 8) + 8) % 8;
};
/** A spin: clockwise `turns` times round, slowing into the last turn, from facing `from` to facing `to`. */
const spinDir = (from, to, u, turns = 2) => {
  const k = 1 - (1 - Math.min(1, Math.max(0, u))) ** 2, steps = turns * 8 + ((to - from + 8) % 8);
  return (from + Math.floor(k * steps)) % 8;
};

// The loop, as steps: each lasts `dur` seconds and says where she is `s` seconds into it.
const STEPS = [];
let rolled = 0;
const hold = (dur, [x, y], gait, dir) => {
  const dist = rolled;
  STEPS.push({ dur, at: (s) => ({ x, y, gait, dir: typeof dir === 'function' ? dir(s / dur) : dir, dist }) });
};
const skate = (path) => {
  const dist = rolled, len = along(path, 1e6, 'skate', SKATE_SPEED).dist;
  STEPS.push({ dur: len / SKATE_SPEED, at: (s) => { const p = along(path, s, 'skate', SKATE_SPEED); return { ...p, gait: 'skate', dist: dist + p.dist }; } });
  rolled += len;
  return along(path, 1e6).dir;
};
const H = [HOME.x, HOME.y];
hold(3.4, H, 'emcee', MC_HOME.dir);
hold(0.9, H, 'stand', (u) => turnDir(MC_HOME.dir, 2, u * 1.5));
let came = skate(TO_RIGHT);
hold(1.1, RIGHT, 'flair', (u) => spinDir(came, 0, u));
hold(1.4, RIGHT, 'flair', 0);
hold(1.2, RIGHT, 'emcee', 0);
hold(0.3, RIGHT, 'stand', (u) => turnDir(0, 6, u));
came = skate(TO_LEFT);
hold(1.1, LEFT, 'flair', (u) => spinDir(came, 0, u));
hold(1.4, LEFT, 'flair', 0);
hold(1.2, LEFT, 'emcee', 0);
hold(0.3, LEFT, 'stand', (u) => turnDir(0, 2, u));
came = skate(TO_HOME);
hold(0.3, H, 'stand', (u) => turnDir(came, MC_HOME.dir, u));
let t0 = 0;
for (const st of STEPS) [st.t0, t0] = [t0, t0 + st.dur];
/** Seconds round the loop, and pixels rolled in one loop. */
export const PATROL_LOOP = t0;
const PATROL_DIST = rolled;

/** Where MC Robin is t seconds into the walkabout: { x, y, dir, gait ('skate', 'flair', 'emcee' or 'stand'), dist }. */
export function mcPatrol(t) {
  const loops = Math.floor(t / PATROL_LOOP), u = t - loops * PATROL_LOOP;
  let st = STEPS[0];
  for (const s of STEPS) if (u >= s.t0) st = s;
  const p = st.at(Math.min(st.dur, u - st.t0));
  return { x: p.x, y: p.y, dir: p.dir, gait: p.gait, dist: p.dist + loops * PATROL_DIST };
}
