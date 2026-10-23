// The people at the World Championship: the crowd in every division's stands, the drive teams at their stations, the
// queue and the scoring table at each field's ends, people standing about in the aisles between the fields, and the ten
// she can stop and talk to. Everyone is the walker's rig (walker.js) in a cast.js look, like the arena's people, so a
// better head or a better rig shows up here too.
//
// Teams sit together at Championship, so each division's stands are cut into blocks between the aisle stairs: some
// blocks are a mix of strangers (the arena's own fourteen), some are one team all in its shirt, and Newton's first block
// is 5026's, in the red tee. The same seat holds someone else in each division. Drive teams wear their teams' shirts,
// six teams to a match. Volunteers keep the arena's colours, field volunteers in green with a yellow print and queuers
// in orange, and each wears a white card on a lanyard.
//
// Everyone comes from a small pool of looks, because the rig takes about 8 ms to draw a look's frame the first time.
// warm() draws them ahead, a few a frame, the division in view first, so the camera's scan never waits on a new face.
//   PEOPLE, MATE_PERSON          everyone she can talk to (stage.js people), and the teammate among them
//   lookOf(k)                    who sits in division k's seats: (p) => look, for bleachers.js drawStands
//   standingIn(g, view, k, t, o) everyone standing in division k near the view, to sort in with its field
//   BLOCKS                       where they stand, which stops her (the queue's drive teams too: nothing else does)
//   reach, prompt, faceTo, talkingSeat   talking to them (stage.js scene hooks)
//   warm(budgetMs, k)            draw queued frames for budgetMs, division k's first and its neighbours next

import { C } from '../pixel.js';
import { walkerFrame, leftFacing, HERO_LOOK, FRAMES } from '../walker.js';
import { look, stranger, student, tones, skinBody, SKIN, HAIR, TEAMMATE_NAME } from '../cast.js';
import { TEAMMATE_LOOK } from '../teammate.js';
import { drawPerson, drawWithShadow, dirToward } from '../stage.js';
import { drawBubble } from '../talk.js';
import { PEOPLE as SEATS, TIERS, STANDING as ARENA_STANDING } from '../bleachers.js';
import { DIVISIONS, HOME, ox, divisionAt, QUEUED, MATE, BUTTON_TABLE, INFO_DESK } from './layout.js';

// ---- Looks ----
// Team shirts that cast.js doesn't have, in its order: shade, mid, lit.
const TEAL = ['#0e5a5e', '#1c9a9a', '#5fd3c8'], PINK = ['#8e1f5c', '#d63a8a', '#ff86bd'];
const LIME = ['#4a7a10', '#7cc21e', '#b8ec5a'], MAROON = ['#5e1a2a', '#8e2a3e', '#c4566a'];
/** A mid grey from the palette's steels and field.js's: the scorekeepers' hoodies. */
const STEEL = [C.steel1, '#5d6580', C.steel2];
const SHIRT = { teal: TEAL, pink: PINK, lime: LIME, maroon: MAROON, yellow: tones.shirtYellow, purple: tones.shirtPurple };

/** A white card on a blue lanyard, on the chest: every volunteer wears one. walker.js badge rectangles. */
const LANYARD = [
  [-3, -4, 1, 2, C.blue1], [2, -4, 1, 2, C.blue1], [-2, -2, 1, 1, C.blue1], [1, -2, 1, 1, C.blue1],
  [-1, -1, 3, 4, C.white], [-1, -1, 3, 1, C.blue2],
];
/** Pins from a day of trading, a few on the chest: as sparse as a volunteer's lanyard card. */
const BUTTONS = [[-4, -2, 2, 2, C.yel1], [-1, -2, 2, 2, C.blue2], [2, -2, 2, 2, C.white], [-2, 1, 2, 2, C.org1]];
/** A scouting tablet held up at the chest: a dark slab in an ink outline, its screen lit, with a glint. */
const TABLET = [[-3, -1, 7, 5, C.ink], [-2, 0, 5, 3, C.steel0], [-1, 0, 3, 2, C.blue2], [-1, 0, 1, 1, C.white]];

// Two heads the crowd doesn't have, drawn like cast.js's (16 columns, the same letters): hair cropped short, and a
// headscarf. The scarf's cloth has letters of its own (v mid, V lit, u shade) for its colours in the head palette; the
// hair letters (g, h) are left only where every other face has them, the brows and the top of each eye, so with black
// hair in the palette those stay dark like everyone else's.
const CROP = {
  front: [
    '................',
    '....kkkkkkkk....',
    '...khHHhHhhhk...',
    '..khHhhhhhhhhk..',
    '..khhhhhhhhhgk..',
    '..kghsssssshgk..',
    '..ksshgsssghsk..',
    '..kssggsssggsk..',
    '.kdssEEsssEEdk..',
    '.kdessssdssedk..',
    '..ksssdMMMdsk...',
    '..ksssssmsssk...',
    '...kssssssdk....',
    '....kksssskk....',
    '......kkkk......',
  ],
  side: [
    '................',
    '....kkkkkkk.....',
    '...khHHhHhhkk...',
    '..khHhhhhhhhhk..',
    '.kghhhhhhhhhhhk.',
    '.kghhhhhhhhhsSk.',
    '.kghhhhhhhshgsk.',
    '.kghhhkssssggsk.',
    '.kghhkdssswEssk.',
    '.kghhksssssssdk.',
    '.kghhhksssssssk.',
    '..kghhkssssMMsk.',
    '..kgghksssssmk..',
    '...kkkkksssdk...',
    '.......kkkkk....',
  ],
  back: [
    '................',
    '....kkkkkkkk....',
    '...khHHhHhhhk...',
    '..khHhhhhhhhhk..',
    '..kghhhhhhhhgk..',
    '..kghhhhhhhhgk..',
    '..kghhhhhhhhgk..',
    '..kghhhhhhhhgk..',
    '..kghhhhhhhhgk..',
    '..kghhhhhhhhgk..',
    '..kgghhhhhhggk..',
    '...kdsssssdk....',
    '...kssssssdk....',
    '....kksssskk....',
    '......kkkk......',
  ],
};
const SCARF = {
  front: [
    '.....kkkkkk.....',
    '...kkvVVVvvkk...',
    '..kvVVvvvvvvvk..',
    '.kvVvvvvvvvvvvk.',
    '.kVvvvvvvvvvvuk.',
    '.kvvuuuuuuuuvuk.',
    '.kvusssssssssuk.',
    '.kvushgsssghsuk.',
    '.kvusggsssggsuk.',
    '.kvusEEsssEEsuk.',
    '.kvuesssdssseuk.',
    '.kvvusdMMMdsuvk.',
    '.kvvvusssmsuvvk.',
    '.kuvvvuuuuuvvuk.',
    '..kkkkkkkkkkkk..',
  ],
  side: [
    '.....kkkkkk.....',
    '...kkvVVVvvkk...',
    '..kvVvvvvvvvvk..',
    '.kvVvvvvvvvvvvk.',
    '.kvvvvvvvvvvvuk.',
    '.kvvvvvvvvvuuSk.',
    '.kvvvvvvvvusssk.',
    '.kvvvvvvvusggsk.',
    '.kvvvvvvvuswEsk.',
    '.kvvvvvvvussssdk',
    '.kvvvvvvvussMMk.',
    '.kvvvvvvvusssmk.',
    '.kuvvvvvvvuuuk..',
    '.kuvvvvvvvvvuk..',
    '..kkkkkkkkkkk...',
  ],
  back: [
    '.....kkkkkk.....',
    '...kkvVVVvvkk...',
    '..kvVVvvvvvvvk..',
    '.kvVvvvvvvvvvvk.',
    '.kVvvvvvvvvvvuk.',
    '.kvvvvvvvvvvvuk.',
    '.kvvvvvvvvvvvuk.',
    '.kvvvvvvvvvvvuk.',
    '.kvvvvvvvvvvvuk.',
    '.kvvvvvvvvvvvuk.',
    '.kvvvvvvvvvvvuk.',
    '.kvvvvvvvvvvvuk.',
    '.kuvvvvvvvvvvuk.',
    '.kuuvvvvvvvvuuk.',
    '..kkkkkkkkkkkk..',
  ],
};
/** A look on one of this scene's own heads: as cast.js look(), from the head's front, side and back templates. */
function lookWith(id, body, head, headPal) {
  const base = look(id, body, 'curls', headPal), { front, side, back } = head, left = leftFacing(side);
  return { ...base, heads: { s: front, se: front, e: side, ne: back, n: back, nw: back, w: left, sw: front } };
}

/** Someone with a face from the crowd's rotation (stranger(i)), dressed otherwise: body over the stranger's colours. */
function dressed(id, i, body, extra = {}) {
  const base = stranger(i, body.shirt);
  return { ...base, id, pal: { ...base.pal, ...body }, ...extra };
}
/** A volunteer: the shirt of the job, black trousers, the lanyard. */
const volunteer = (id, i, shirt, print) => dressed(id, i, { shirt, print, jeans: tones.black, cuff: tones.black }, { badge: LANYARD });

// The crowd: the arena's fourteen strangers for the mixed blocks, seven faces in each team's shirt for the team blocks.
const MIXED = Array.from({ length: 14 }, (_, i) => stranger(i));
const TEAM = Object.fromEntries(Object.entries(SHIRT).map(([name, shirt]) => [name, Array.from({ length: 7 }, (_, i) => stranger(i, shirt))]));
TEAM['5026'] = Array.from({ length: 7 }, (_, i) => student(i, 'tee'));
const QUEUERS = [1, 4, 6, 2].map((face, i) => volunteer(`w-queuer${i}`, face, tones.shirtOrange, C.ink));
// In Newton's front row right behind her as she talks to the teammate in the cut scene, people in mid-toned tops,
// neither red, white nor near-black, so her red tee and her dark hair both read against them (a white shirt there would
// read as part of her, a black one would swallow her hair).
const BEHIND_HER = [stranger(2, tones.khaki), stranger(9, tones.shirtBlue)];
const behindHer = (k, p) => k === HOME && p.tier === 0 && Math.abs(ox(HOME) + p.x - QUEUED.x) < 20;
// The scorekeepers in grey hoodies: she stands in front of one to talk to Lena or Noor, and her hair would be lost
// against a dark one.
const SCOREKEEPERS = [5, 0, 3, 4].map((face, i) => dressed(`w-score${i}`, face,
  { shirt: STEEL, jeans: tones.black, cuff: tones.black, print: null }));

// ---- Who sits where ----
// The blocks of seats between each division's aisle stairs (bleachers.js), in the division's own x, and who fills
// each: a team in its shirt, or a mix. Curie's second block is Mrs. Costa's family's team and Milstein's last is Diego's.
const BLOCK_X = [[116, 242], [252, 342], [352, 458], [468, 538], [548, 668]];
const SECTIONS = [
  ['mix', 'teal', 'mix', 'yellow', 'mix'], // Archimedes
  ['pink', 'teal', 'mix', 'mix', 'lime'], // Curie
  ['mix', 'purple', 'mix', 'teal', 'mix'], // Daly
  ['lime', 'mix', 'mix', 'pink', 'mix'], // Galileo
  ['mix', 'yellow', 'mix', 'mix', 'maroon'], // Hopper
  ['teal', 'mix', 'lime', 'mix', 'mix'], // Johnson
  ['mix', 'pink', 'mix', 'yellow', 'purple'], // Milstein
  ['5026', 'mix', 'maroon', 'mix', 'teal'], // Newton
];
/** The block a seat at the division's own x is in: the seats past the end stairs count with the end blocks. */
const blockAt = (x) => {
  const i = BLOCK_X.findIndex(([, b]) => x < b + 5);
  return i < 0 ? BLOCK_X.length - 1 : i;
};

// ---- The people to talk to ----
// Two to four pages each, two lines a page, 38 characters at most, in font 5's capitals.
const seatOf = (id) => SEATS.find((p) => p.id === id);
/** Someone in division k's front row, in the seat the arena gives bleachers.js's person `id`. */
function seated(k, id) {
  const seat = seatOf(id);
  return { x: ox(k) + seat.x, y: TIERS[0], seat, faceGait: 'sit' };
}

// The teammate waits by Newton's queue where the cut scene leaves them, at the far end of the hall from where the walking
// starts, in reach from where she stood beside them, a head's width away (QUEUED, layout.js).
export const MATE_PERSON = {
  name: TEAMMATE_NAME, x: MATE.x, y: MATE.y, dir: MATE.dir, look: TEAMMATE_LOOK,
  lines: [
    ["WE'RE QUEUED. ROBOT'S ON ITS CART,", 'BATTERY IN, BUMPERS ON. ALL SET.'],
    ['WATCH WHO CLIMBS TO LEVEL 3, AND HOW', 'FAST THEY CYCLE. THAT IS WHAT WINS.'],
    ['BRING BACK NOTES, NOT JUST BUTTONS.', 'OKAY. SOME BUTTONS.'],
  ],
};

const TALKERS = [
  MATE_PERSON,
  {
    // Newton's queuer, behind the queue sign like every division's (it hides her legs, as the button table hides
    // Noor's), so the floor above the queue stays open from the walkway's mouth, where the walking starts, straight
    // along into the aisle, between the hem's barrier and her.
    name: 'BEA, NEWTON QUEUER', x: ox(HOME) + 26, y: 100,
    look: look('w-bea', { ...skinBody('fair'), shirt: tones.shirtOrange, jeans: tones.black, cuff: tones.black, print: null }, 'bob',
      { ...SKIN.fair, ...HAIR.auburn, r: HAIR.auburn.h, R: HAIR.auburn.H }),
    badge: LANYARD,
    lines: [
      ['WELCOME TO NEWTON QUEUING! WE RUN TO', 'THE MINUTE HERE. NOT ROUGHLY.'],
      ['MISS YOUR QUEUE AND THE MATCH GOES ON', 'WITHOUT YOU. NOBODY WAITS. NOBODY.'],
      ['5026 IS ON THE SECOND CART, TWO', 'MATCHES OUT. NICE ELEVATOR!'],
    ],
  },
  {
    // Behind the button table, close enough to its back edge that it hides her legs; she's talked to across it.
    name: 'NOOR, BUTTON TRADER', x: BUTTON_TABLE.x0 + 10, y: BUTTON_TABLE.back - 3, across: true,
    look: lookWith('w-noor', { ...skinBody('tan'), shirt: PINK, print: null }, SCARF,
      { ...SKIN.tan, ...HAIR.black, u: '#4a1f55', v: '#6e3480', V: '#9a5aae' }),
    badge: BUTTONS,
    lines: [
      ['WANT TO TRADE? EVERY TEAM BRINGS', 'BUTTONS. ONE OF YOURS FOR ONE OF MINE.'],
      ['THIS ONE IS FROM A TEAM IN TAIPEI.', 'THAT ONE, QUEBEC. THAT ONE, TEL AVIV.'],
      ['TRADE WITH THE TEAMS IN YOUR OWN', 'DIVISION. THEY MIGHT PICK YOU LATER.'],
    ],
  },
  {
    name: 'MS. OKAFOR, INFO DESK', x: Math.round((INFO_DESK.x0 + INFO_DESK.x1) / 2), y: INFO_DESK.back - 3, across: true,
    look: look('w-okafor', { ...skinBody('deep'), shirt: tones.shirtGreen, jeans: tones.khaki, cuff: tones.khaki, print: '#ffc61a' }, 'curls',
      { ...SKIN.deep, ...HAIR.black }),
    badge: LANYARD,
    lines: [
      ['EINSTEIN? NOT IN THIS HALL, DEAR.', 'FOLLOW THE YELLOW SIGN AND THE NOISE.'],
      ['EACH DIVISION CROWNS ONE ALLIANCE.', 'THE EIGHT WINNERS MEET ON EINSTEIN.'],
      ['AND HERE AN ALLIANCE IS FOUR ROBOTS:', 'A CAPTAIN AND THREE PICKS. THREE PLAY.'],
    ],
  },
  {
    // In Milstein's front row with his team, in the seat nearest the walkway's mouth at the red end, his scouting
    // tablet up.
    name: 'DIEGO, SCOUT FROM MONTERREY', ...seated(6, 'juno'),
    look: look('w-diego', { ...skinBody('brown'), shirt: SHIRT.purple, jeans: tones.black, cuff: tones.black, print: null }, 'cap',
      { ...SKIN.brown, ...HAIR.black, c: '#5b3fa0', C: '#8a6ad0', D: '#2a1c4e' }),
    badge: TABLET,
    lines: [
      ['SEVENTY-FIVE TEAMS IN MILSTEIN. WE', 'SCOUT EVERY MATCH, IN SHIFTS.'],
      ['PIT SCOUTING TELLS YOU WHAT THEY SAY.', 'MATCH SCOUTING TELLS YOU WHAT IT DOES.'],
      ['7395 SAID THEY CLIMB TO LEVEL 2. THEN', 'THEY CLIMBED TO 3. I LOVE SURPRISES.'],
    ],
  },
  {
    // In the middle of the Galileo-Hopper aisle, turned to her teammate on her left; her right is clear as far as
    // Hopper's queuer, room to stand beside her and talk.
    name: 'AYLIN, TEAM FROM ISTANBUL', x: ox(4) - 20, y: 92, dir: 7,
    look: look('w-aylin', { ...skinBody('light'), shirt: MAROON, print: C.white }, 'bob',
      { ...SKIN.light, ...HAIR.black, r: HAIR.black.h, R: HAIR.black.H }),
    lines: [
      ['OUR ROBOT CROSSED THE OCEAN IN A', 'CRATE. THE BUMPERS GOT A SUITCASE.'],
      ['THAT IS OUR ROBOT ON HOPPER, THE BLUE', 'ONE WITH THE ARM. GO, LITTLE ROBOT!'],
      ['AFTER THE CRATE WE CHECKED EVERY', 'BOLT. TWICE. THEN ONCE MORE.'],
    ],
  },
  {
    // Like Aylin: his teammate on his left, room on his right.
    name: 'JACK, TEAM FROM SYDNEY', x: ox(3) - 20, y: 93, dir: 7,
    look: lookWith('w-jack', { ...skinBody('fair'), shirt: LIME, print: C.yel1 }, CROP, { ...SKIN.fair, ...HAIR.blonde }),
    lines: [
      ["G'DAY! IT'S THREE IN THE MORNING IN", 'SYDNEY, AND THE WHOLE SCHOOL IS UP.'],
      ['EVERY DIVISION IS STREAMED LIVE.', 'THEY ARE WATCHING IN THE GYM. WAVE!'],
      ['MY NAN IS WATCHING TOO. SHE KEEPS', 'SCORE BETTER THAN OUR SCOUTS.'],
    ],
  },
  {
    // In Curie's front row, in her family's team shirt.
    name: 'MRS. COSTA, PARENT FROM SAO PAULO', ...seated(1, 'adeyemi'),
    look: look('w-costa', { ...skinBody('tan'), shirt: TEAL, print: C.white }, 'glasses', { ...SKIN.tan, ...HAIR.brown, q: C.steel3 }),
    lines: [
      ['I LEARNED THE RULES ON THE FLIGHT.', 'TEN HOURS. NOW I AM AN EXPERT.'],
      ['A FINISHED ROCKET IS A RANKING POINT.', 'FIFTEEN HAB POINTS ARE ANOTHER.'],
      ['A WIN IS TWO MORE. SO MY SON IS', 'RIGHT TO SCREAM AT THE ROCKETS.'],
    ],
  },
  {
    // Like Aylin and Jack: his friend on his left, between him and Archimedes' scoring table, room on his right.
    name: 'WEI, ROOKIE FROM SHENZHEN', x: ox(1) - 20, y: 93, dir: 7,
    look: lookWith('w-wei', { ...skinBody('light'), shirt: SHIRT.yellow, print: C.red1 }, CROP, { ...SKIN.light, ...HAIR.black }),
    lines: [
      ['OUR FIRST SEASON, AND WE ARE AT', 'CHAMPIONSHIP. I KEEP PINCHING MYSELF.'],
      ['WE WON ROOKIE ALL-STAR AT OUR', 'REGIONAL. IT SENDS A ROOKIE TEAM HERE.'],
      ['ARCHIMEDES IS THE FARTHEST FIELD', 'FROM THE PITS. MY LEGS HAVE NOTICED.'],
    ],
  },
  {
    // Just past Hopper's reset cart, the hatches and cargo she puts back, below Hopper's scorekeeper and clear of it,
    // turned to someone further up the aisle, with room either side of her to stand and talk.
    name: 'LENA, FIELD RESET', x: ox(4) + 748, y: 112, dir: 2,
    look: look('w-lena', { ...skinBody('brown'), shirt: tones.shirtGreen, jeans: tones.khaki, cuff: tones.khaki, print: '#ffc61a' }, 'bun',
      { ...SKIN.brown, ...HAIR.chestnut }),
    badge: LANYARD,
    lines: [
      ['BETWEEN MATCHES EVERY HATCH AND', 'EVERY CARGO GOES BACK. FAST.'],
      ['THEN THE SANDSTORM: THE FIRST FIFTEEN', 'SECONDS, WITH THE DRIVERS BLACKED OUT.'],
      ['ROBOTS RUN ON CAMERAS OR CODE. I', 'JUST WATCH MY HATCHES GO.'],
    ],
  },
];
for (const p of TALKERS) {
  if (p.badge) p.look = { ...p.look, badge: p.badge };
  delete p.badge;
  p.k = divisionAt(p.x);
}
/** Everyone she can talk to, in stage.js's format: { name, x, y, lines, look }, k their division, dir their facing. */
export const PEOPLE = TALKERS;
const STANDING_TALKERS = PEOPLE.filter((p) => !p.seat && p !== MATE_PERSON);
const SEATED_IN = (k) => PEOPLE.filter((p) => p.seat && p.k === k);

// ---- The crowd ----
const lookers = new Map();
/**
 * Who sits in division k's seats: (p) => look for every seat bleachers.js draws (p: { id, x, tier }). Never the arena's
 * own named people: their seats get strangers too, except the two that people here sit in. Looked up once a seat.
 */
export function lookOf(k) {
  if (lookers.has(k)) return lookers.get(k);
  const seen = new Map(), mine = SEATED_IN(k);
  const fn = (p) => {
    let out = seen.get(p);
    if (out) return out;
    const talker = mine.find((q) => q.seat === p);
    if (talker) out = talker.look;
    else {
      // The seat's place in bleachers.js's list, so the same seat holds someone else in every division.
      const n = /^fan\d+$/.test(p.id) ? Number(p.id.slice(3)) : 300 + SEATS.indexOf(p) * 7;
      // 5026's front row is families in their own clothes: she stands right in front of it when the walking starts,
      // and a red shirt in front of a row of red shirts would be lost (the two seats right behind her: BEHIND_HER).
      const block = SECTIONS[k][blockAt(p.x)], section = block === '5026' && p.tier === 0 ? 'mix' : block;
      if (behindHer(k, p)) out = BEHIND_HER[n % BEHIND_HER.length];
      else out = section === 'mix' ? MIXED[(n * 5 + p.tier + k * 3) % MIXED.length] : TEAM[section][(n * 3 + p.tier * 2 + k) % 7];
    }
    seen.set(p, out);
    return out;
  };
  lookers.set(k, fn);
  return fn;
}

// ---- Standing ----
// Per division, in its own x: the drivers at their stations behind the alliance walls, turned to the field, one of each
// of the match's six teams; a drive team member behind each robot in the queue; the queuer by the queue sign and the
// scorekeeper at the scoring table. The drive teams and the queue crew stand where the arena's do and as they do
// (bleachers.js), moved along to the division, so if the arena moves or re-poses them all eight divisions follow; only
// their teams' shirts are this scene's.
const TEAM_ORDER = ['teal', 'pink', 'lime', 'maroon', 'yellow', 'purple'];
const ARENA_CREW = ARENA_STANDING.filter((p) => /^(driver|queue)/.test(p.id));
/** The shirt for the arena crew member `id` in division k: driver<alliance><station>, or queue<cart>. */
function crewLook(k, id) {
  if (id.startsWith('driver')) {
    const a = Number(id[6]), i = Number(id[7]);
    return TEAM[TEAM_ORDER[(k + a * 3 + i) % 6]][(k * 2 + a * 3 + i * 5) % 7];
  }
  return id === 'queue0' ? TEAM[TEAM_ORDER[(k + 2) % 6]][(k * 4 + 1) % 7] : TEAM[TEAM_ORDER[(k + 5) % 6]][(k * 4 + 4) % 7];
}
function crewOf(k) {
  const x0 = ox(k);
  // In Newton, the robot on the second cart is 5026's, and the one who waits with it is the teammate (the cut scene
  // has the teammate walk up from it to her), so nobody else stands there.
  const crew = ARENA_CREW.filter((p) => !(k === HOME && p.id === 'queue1'))
    .map((p) => ({ ...p, x: x0 + p.x, look: crewLook(k, p.id), driver: p.id.startsWith('driver') }));
  const ends = [
    // The queuer stands behind the queue sign, which hides her legs, leaving the floor between her and the hem's barrier
    // open: that's the way along the aisle from one division's walkway to the next.
    ...(k === HOME ? [] : [{ x: x0 + 28, y: 100, look: QUEUERS[k % QUEUERS.length] }]),
    // Behind the scoring table (field.js: x 664 to 728, its back on row 95), close enough that it hides their legs, the
    // way the button table hides Noor's, and right of its two monitors.
    { x: x0 + 716, y: 92, look: SCOREKEEPERS[k % SCOREKEEPERS.length], table: true },
  ];
  return [...crew, ...ends];
}

// People standing about in the aisles between the fields and on the floor past both ends, mostly in pairs turned to
// each other, some of them with the people she can talk to. Each aisle is the open floor where one division's red end
// meets the next one's blue end, around ox(j): clear of the scoring table and reset cart on the left and of the queue
// sign and its carts on the right. The pairs stand a head's width apart (22 pixels, so two faces in profile don't
// touch) and low enough in the aisle (row 92 or so) that their heads are below the division's big screen and sign,
// not on them; nobody stands straight behind or in front of anyone else, so heads never stack. [world x, floor line,
// dir, look]
const T = (name, face) => TEAM[name][face % 7], M = (i) => MIXED[i % MIXED.length];
const AISLES = [
  // Past Archimedes' blue end, by the left wall: a pair low on the floor, below the way in from the doorway (layout.js
  // START), so she walks in above them, the light from the doorway clear of their feet. The floor between the doorway
  // and the top of the queue stays open, the way on to Archimedes' walkway.
  [94, 124, 2, M(3)], [116, 125, 6, M(8)],
  // Archimedes and Curie: one of Wei's team with him. Nobody stands below them, where she stands to talk to him: one
  // above the other, her feet would be on their head.
  [ox(1) - 42, 92, 1, T('yellow', 5)],
  // Curie and Daly: a pair, and someone by Daly's queue, far enough up that the floor below them in front of the queue
  // stays open, as it does in every aisle.
  [ox(2) - 36, 93, 2, T('purple', 0)], [ox(2) - 14, 94, 6, T('purple', 3)], [ox(2) + 4, 110, 0, M(6)],
  // Daly and Galileo: one of Jack's team with him, and the same room beside him as Wei has.
  [ox(3) - 42, 94, 1, T('lime', 1)],
  // Galileo and Hopper: one of Aylin's team with her.
  [ox(4) - 42, 93, 1, T('maroon', 4)],
  // Hopper and Johnson: someone stopped to talk to Lena, a head's width up the aisle from her, so either side of her
  // is open to stand and talk. In a white tee: orange is the queuers' (nobody but a volunteer wears it standing about).
  [ox(5) + 4, 93, 7, M(11)],
  // Johnson and Milstein: Noor's teammate behind the button table with her, halfway between the end posts of the hem's
  // two barriers, her head over both, so neither stands up out of it, and her legs behind the table. The table, Johnson's scorekeeper and Milstein's queue fill the rest of this
  // aisle.
  [BUTTON_TABLE.x0 + 36, BUTTON_TABLE.back - 3, 7, T('pink', 1), true],
  // Milstein and Newton, a little lower than the others, clear of Milstein's scorekeeper, and far enough left of Bea
  // that there's room to stand between them and talk to her.
  [ox(7) - 48, 98, 1, T('pink', 5)], [ox(7) - 26, 97, 7, M(1)],
  // Past Newton's red end: two beyond its scoring table, low enough that their heads are under Newton's big screen, and
  // someone at the info desk (in a dark hoodie, not the orange of the volunteers).
  [ox(7) + 744, 100, 1, M(10)], [ox(7) + 766, 101, 7, T('lime', 3)], [INFO_DESK.x0 - 10, INFO_DESK.back + 4, 2, M(13)],
].map(([x, y, dir, lk, table]) => ({ x, y, dir, look: lk, table }));

/** Everyone standing, by division (divisionAt their x): crews, people about, and the people to talk to. */
const STANDING = DIVISIONS.map((_, k) => [
  ...crewOf(k),
  ...AISLES.filter((p) => divisionAt(p.x) === k),
  ...STANDING_TALKERS.filter((p) => p.k === k),
]);

/**
 * The floor everyone standing takes up, as world boxes: drivers are behind the alliance walls already. Fifteen pixels
 * either side of their feet and fourteen rows behind and in front, so with move()'s margins (5 across, 2 deep) she
 * stops 20 pixels beside someone, or 16 rows in front of or behind them: side by side, two faces in profile keep a
 * few pixels between them (the cut scene's two-shot keeps 22), and one behind the other, the two heads (16 pixels
 * each) are one above the other, never one over the other's face. The teammate too: standing at the foot of the
 * curtain, left of the walkway, the teammate leaves the walkway's mouth and the way down to the aisle open.
 * Whoever works a table (the scorekeepers, the button traders, the info desk) has the table in front of them already,
 * and behind them only ten rows: then the floor between the hem's barrier and them is as wide as the floor between the
 * barrier and every queue (scene.js QUEUES), the way along the aisle, and her head behind theirs is still above it.
 * Walking straight into someone she slides round them (fields.js move()) up to 14 rows, half their footprint's depth:
 * from where the walking starts, left into the teammate, that takes her down past the teammate's feet into the aisle.
 */
export const BLOCKS = [...STANDING.flat().filter((p) => !p.driver), MATE_PERSON]
  .map(({ x, y, table, across }) => ({ x0: x - 15, x1: x + 15, y0: y - (table || across ? 10 : 14), y1: y + 14, slide: 14 }));

/**
 * Everyone standing in division k near the view, each { x, y, draw() } to sort in with its field (drawFieldLive calls
 * draw() with no arguments; x is where they stand along the hall, for the scene to split an aisle between two fields).
 * The teammate stands at MATE, or wherever o.mate ({ x, y, dir, gait, dist }) says. o.talking: whoever she's talking
 * to, who turns to her (o.her: where she stands) for as long as they talk, and back the way they were facing after.
 */
export function standingIn(g, view, k, t, o = {}) {
  const near = (p) => Math.abs(p.x - view.x - 128) < 128 + 24;
  const turned = (p) => (p === o.talking && o.her ? { ...p, dir: dirToward(o.her.x - p.x, (o.her.y - p.y) / 0.8) } : p);
  // The drivers' feet are hidden behind the alliance wall and each other, so they get no shadow, like the arena's
  // (bleachers.js drawStanding): a shadow wider than a body in profile would stick out beside the next driver's waist.
  const out = STANDING[k].filter(near)
    .map((p) => ({ x: p.x, y: p.y, draw: () => (p.driver ? drawPerson : drawWithShadow)(g, view, turned(p)) }));
  const mate = o.mate ? { ...o.mate, look: TEAMMATE_LOOK } : turned(MATE_PERSON);
  if (divisionAt(mate.x) === k && near(mate)) out.push({ x: mate.x, y: mate.y, draw: () => drawWithShadow(g, view, mate) });
  return out;
}

// ---- Talking ----
/**
 * The closest person in reach: standing, 24 across and 10 deep from her feet, so shoulder to shoulder beside them,
 * where their footprint (BLOCKS) stops her, and never straight behind or in front of them, where one would hide the
 * other; seated, beside their seat while she's on the walkway, 12 to 23 across (best 17, a head's width), never right
 * in front of it, where her head would hide theirs. Someone working a table (across) is talked to across it: from in
 * front only, up to 18 rows, where the table stops her.
 */
export function reach(s) {
  let best = null, bestD = Infinity;
  for (const p of PEOPLE) {
    const dx = Math.abs(p.x - s.me.x), dy = p.across ? s.me.y - p.y : Math.abs(p.y - s.me.y);
    const deep = p.across ? 18 : 10;
    const d = p.seat ? (dx >= 12 && dx < 24 && s.me.y <= 64 ? Math.abs(dx - 17) : Infinity)
      : dx < 24 && dy >= 0 && dy < deep ? dx + dy : Infinity;
    if (d < bestD) [best, bestD] = [p, d];
  }
  return best;
}
/**
 * The speech bubble over someone in reach, standing or sitting: at the top corner of their head on the side away from
 * her, so standing beside them, as she does to talk to anyone, she never has it on her own head. herX: where she stands.
 */
export function prompt(g, view, p, t, herX = p.x) {
  const side = herX > p.x ? -1 : 1;
  drawBubble(g, p.x - view.x + side * 11, p.y - view.y - (p.seat ? 41 : 50), t);
}
/**
 * Where to turn to talk to someone: at their feet, or, for someone seated beside her, straight across at them (her: where
 * she stands), so she shows in profile and both faces read.
 */
export const faceTo = (p, her = p) => (p.seat ? { x: p.x, y: her.y } : p);
/** The bleachers seat whose person sits still while she talks to them (bleachers.js drawStands' talkingTo). */
export const talkingSeat = (s) => s.talk?.person?.seat ?? null;

// ---- Warming up ----
// Frames to draw ahead, division by division: the crowd sitting (most of what's on screen), everyone standing, the
// people to talk to as the phone shows them, the teammate's walk in the cut scene, the people to talk to turned every
// way (they turn to her as they talk), and the crowd cheering. Last of all her own walk and run in every direction, for
// the first steps after the cut scene.
let queue = null;
function frames(k) {
  const seated = [...new Set([...SECTIONS[k].flatMap((s) => (s === 'mix' ? MIXED : TEAM[s])), ...SEATED_IN(k).map((p) => p.look),
    ...(k === HOME ? BEHIND_HER : [])])];
  const list = [
    ...seated.map((lk) => [lk, 0, 'sit', 0]),
    ...STANDING[k].map((p) => [p.look, p.dir ?? 0, p.gait ?? 'stand', 0]),
    ...PEOPLE.filter((p) => p.k === k).map((p) => [p.look, 0, p.faceGait ?? 'stand', 0]),
    // The teammate waiting, turned to her, and walking or jogging up.
    ...(k === HOME ? [[TEAMMATE_LOOK, 0, 'stand', 0], [TEAMMATE_LOOK, MATE.dir, 'stand', 0],
      ...['walk', 'run'].flatMap((gait) => Array.from({ length: FRAMES[gait] }, (_, f) => [TEAMMATE_LOOK, 4, gait, f]))] : []),
    ...PEOPLE.filter((p) => p.k === k && !p.seat).flatMap((p) => Array.from({ length: 8 }, (_, d) => [p.look, d, 'stand', 0])),
    ...seated.map((lk) => [lk, 0, 'cheer', 0]),
  ];
  list.next = 0;
  return list;
}
/** Her walk and run, every direction and every frame. */
function hers() {
  const list = ['walk', 'run'].flatMap((gait) => Array.from({ length: 8 * FRAMES[gait] }, (_, i) => [HERO_LOOK, i % 8, gait, Math.floor(i / 8)]));
  list.next = 0;
  return list;
}
/**
 * Draw queued frames until budgetMs has gone by (warm(0) only builds the queue): division k's first, then the others
 * nearest k first, since the next one along is the next one she or the camera gets to, and her walk and run last (a
 * frame of hers costs one look, a division's crowd coming into view several at once). A frame already drawn costs next
 * to nothing, so the lists can share looks.
 */
export function warm(budgetMs, k = 0) {
  queue ??= [...DIVISIONS.map((_, j) => frames(j)), hers()];
  const t0 = performance.now();
  const others = DIVISIONS.map((_, j) => j).filter((j) => j !== k).sort((a, b) => Math.abs(a - k) - Math.abs(b - k));
  for (const list of [queue[k], ...others.map((j) => queue[j]), queue[DIVISIONS.length]]) {
    while (list.next < list.length) {
      if (performance.now() - t0 >= budgetMs) return;
      const [lk, dir, gait, frame] = list[list.next++];
      walkerFrame(dir, gait, frame, lk);
    }
  }
}
