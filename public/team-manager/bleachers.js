// The people: the bleachers along the field's far side, aluminium tiers and the crowd on them, and everyone you can
// stop and talk to. Everyone is drawn with the walker's rig (walker.js) in their own look, with hand-drawn heads from the
// front and the side. Below the stands runs the walkway, the closest a strategist gets to the field (field.js), where a
// volunteer minds the gate. The drive teams stand at their stations; past the ends of the field a queuer runs the queue
// and the scorekeeper sits at the scoring table. Everything is in world pixels, seen through a camera at camX.

import { C, useContext, screen, fill, text, rnd } from './pixel.js';
import { HERO_LOOK, drawWalker, leftFacing } from './walker.js';
import { WORLD_W, FIELD, STATION, GATE, floorY } from './field.js';

// Where the tiers' footboards are, front row first; each row sits 14 pixels higher than the one in front of it.
const TIERS = [48, 34, 20];
const AISLES = [-70, 66, 166, 282, 362, 492].map((dx) => [FIELD.x0 + dx, FIELD.x0 + dx + 10]);

// ---- Looks ----
const BASE = { k: C.ink, E: '#3a2218', w: '#e6ddd4', M: '#8f4636', T: '#f6f1ea', m: '#c97a70' };
const skinPal = (lo, mid, hi, blush) => ({ d: lo, s: mid, S: hi, e: blush });
const hairPal = (g, h, H) => ({ g, h, H });
const tones = {
  shirtRed: ['#a1172a', '#d3212f', '#ff6a55'], shirtBlue: ['#0a237a', '#1d55e8', '#4a90ff'], shirtYellow: ['#c48a0a', '#ffc61a', '#ffe07a'],
  hoodie: ['#141a2e', '#232a44', '#3a4466'], shirtGreen: ['#1d5e3a', '#2e8b57', '#5cc38a'], shirtWhite: ['#b9c0d4', '#e8ecf5', '#ffffff'],
  shirtPurple: ['#3e2a6e', '#5b3fa0', '#8a6ad0'], shirtOrange: ['#a3460a', '#ff7a1c', '#ffb46a'],
  khaki: ['#7a6a48', '#a8946a', '#c9b88e'], black: ['#141519', '#23252c', '#3a3d48'],
};
/** A look: body colours over hers, a head drawn three ways (the template's name), and its colours. */
function look(id, body, head, headPal) {
  return { id, pal: { ...HERO_LOOK.pal, ...body }, heads: { s: HEADS[head], e: SIDE[head], w: SIDE_LEFT[head] }, headPal: { ...BASE, ...headPal }, board: false };
}

const HEADS = {
  curls: [
    '...kk.kkkk.kk...',
    '..khhkhHHhkhhk..',
    '.khHhhhhhhhhhhk.',
    'khHhhhhhhhhhhhhk',
    'kghhhhhhhhhhhhgk',
    'kghhsssssssshhgk',
    'kghhshgssghshhgk',
    'kghhsggssggshhgk',
    'kghhsEEssEEshhgk',
    'kghhessdssesshgk',
    'kghhsMTTTMsshhgk',
    'kghhksssmsskhhgk',
    '.kgh.kssssk.hgk.',
    '.kgk..kkkk..kgk.',
    '..k..........k..',
  ],
  glasses: [
    '................',
    '....kkkkkkkk....',
    '...khHhhHhhhk...',
    '..khHhhhhhhhhk..',
    '..khhhhhhhhhhk..',
    '..kgsssssssssk..',
    '..ksshgsssghsk..',
    '..kqqqqsqqqqsk..',
    '.kdqEEqqqEEqdk..',
    '.kdsqqsdsqqssk..',
    '..ksssdMMdssk...',
    '..ksssssmsssk...',
    '...kssssssdk....',
    '....kksssskk....',
    '......kkkk......',
  ],
  cap: [
    '................',
    '.....kkkkkk.....',
    '...kkcCCCcckk...',
    '..kcCCccccccck..',
    '..kcccccccccDk..',
    '..kDDDDDDDDDDk..',
    '..khsssssssshk..',
    '..khshgssghshk..',
    '..ksssggsggssk..',
    '.kdssEEsEEsssdk.',
    '..ksedsdsdesk...',
    '..ksssMTTMsssk..',
    '...ksssmsssk....',
    '....kkssssk.....',
    '......kkkk......',
  ],
  bun: [
    '......kkkk......',
    '.....khHHhk.....',
    '....kkhhhhkk....',
    '...khHhhhhhhk...',
    '..khHhhhhhhhhk..',
    '..khssssssssgk..',
    '..khshgsssghsk..',
    '..khsggsssggsk..',
    '..kgsEwsssEwsk..',
    '..kgessdsssesk..',
    '..kgsssMMMdssk..',
    '...ksssmssssk...',
    '....kssssddk....',
    '.....kkkkkk.....',
    '................',
  ],
  bob: [
    '......kkkk......',
    '....kkhHHhkk....',
    '...khHHhhhhrk...',
    '..khHhhhhhhrRk..',
    '.kghhhhhhhhrRhk.',
    '.kghhhhhhhhrrhk.',
    '.kghsssssssssghk',
    '.kghshgsssghshgk',
    '.kghsggsssggshgk',
    '.kghsEEsssEEshgk',
    '.kghesssdsssehgk',
    '.kghssdMMMdsshgk',
    '.kghhksssmsskhgk',
    '.kgggk.kkkk.kggk',
    '..kkk.......kkk.',
  ],
};

// The same heads in profile, facing right (the drivers, turned to the field); facing left is the mirror.
const SIDE = {
  curls: [
    '..kk.kkkk.kk....',
    '.khhkhHHhkhhk...',
    'khHhhhhhhhhhhk..',
    'khhhhhhhhhhhhhk.',
    'kghhhhhhhhhhhhk.',
    'kghhhhhhhhhhsSk.',
    'kghhhhhhhhsggsk.',
    'kghhhhkssssggsk.',
    'kghhhkdssswEssk.',
    'kghhhkssessssdk.',
    'kghhhhksssMTTk..',
    'kghhhhhkssssmk..',
    '.kghhhhkkssssk..',
    '.kgk.kk..kkkk...',
    '..k.............',
  ],
  glasses: [
    '................',
    '....kkkkkkk.....',
    '...khHHhhhhkk...',
    '..khHhhhhhhhhk..',
    '.kghhhhhhhhhhhk.',
    '.kghhhhhhhhhsSk.',
    '.kghhhhhhhsssgk.',
    '.kghhhkqqqqqqqk.',
    '.kghhkdsssqwEqsk',
    '.kghhkssssqqqqdk',
    '.kghhhksssssssk.',
    '..kghhkssssMMsk.',
    '..kgghksssssmk..',
    '...kkkkksssdk...',
    '.......kkkkk....',
  ],
  cap: [
    '................',
    '....kkkkkk......',
    '...kcCCCccck....',
    '..kcCcccccccck..',
    '..kcccccccccck..',
    '..kDDDDDDDDDDDDk',
    '..khhhhhhssskkk.',
    '.kghhhksssssgsk.',
    '.kghhkdssswEssk.',
    '.kghhksssssssdk.',
    '.kghhkesssssssk.',
    '..kghhksssMTsk..',
    '...kghkssssmk...',
    '....kkksssdk....',
    '.......kkkk.....',
  ],
  bun: [
    '..kkk...........',
    '.khHhk.kkkkk....',
    '.khhhkkhHHhhkk..',
    '..kkkhHhhhhhhhk.',
    '...khhhhhhhhhhk.',
    '..kghhhhhhhhhsSk',
    '..kghhhhhhhsggsk',
    '..kghhhkssssggsk',
    '..kghhkdssswEssk',
    '..kghhkssessssdk',
    '..kghhhksssMMMk.',
    '...kghhkssssmk..',
    '....kkkkssssk...',
    '........kkkk....',
    '................',
  ],
  bob: [
    '......kkkk......',
    '...kkhHHhhkk....',
    '..khHhhhhhhrk...',
    '.khHhhhhhhhrRk..',
    'kghhhhhhhhhrRhk.',
    'kghhhhhhhhhrrsk.',
    'kghhhhhhhhhsggk.',
    'kghhhhhhkssssgk.',
    'kghhhhhhkdswEsk.',
    'kghhhhhhksssssdk',
    'kghhhhhhksssMMk.',
    'kghhhhhhkssssmk.',
    'kgggggggkkssk...',
    '.kkkkkkkk.kk....',
    '................',
  ],
};
const SIDE_LEFT = Object.fromEntries(Object.entries(SIDE).map(([k, rows]) => [k, leftFacing(rows)]));

const SKIN = {
  deep: skinPal('#5a3826', '#6e4630', '#8a5a3c', '#8a4a3a'),
  brown: skinPal('#9a6440', '#b9805a', '#d39b72', '#d9826c'),
  tan: skinPal('#c48a5e', '#deab80', '#f0c8a0', '#e0907a'),
  light: skinPal('#d4936a', '#eab48a', '#f6cfa8', '#e9907c'),
  fair: skinPal('#d29a6c', '#eabf91', '#f8d9b8', '#ee9f8c'),
};
const HAIR = {
  black: hairPal('#131216', '#211d22', '#352d31'), brown: hairPal('#24150f', '#3d2519', '#5e3a26'),
  chestnut: hairPal('#5a3418', '#7a4a24', '#9a6234'), grey: hairPal('#1a1a1e', '#3a3a40', '#6a6a72'),
  blonde: hairPal('#8a6a2a', '#c49a46', '#e6c27a'), auburn: hairPal('#4a1a12', '#7a2e1c', '#a8482a'),
};
const skinBody = (k) => ({ skin: [SKIN[k].d, SKIN[k].s, SKIN[k].S] });

// The people you can talk to: the front row, and the volunteer at the gate. Lines are pages of up to two lines, 38
// characters each.
export const PEOPLE = [
  {
    id: 'rosa', name: 'ROSA, 5026 PARENT', x: FIELD.x0 + 30, tier: 0,
    look: look('rosa', { ...skinBody('brown'), shirt: tones.shirtRed }, 'curls', { ...SKIN.brown, ...HAIR.brown }),
    lines: [
      ['YOU ARE ON 5026? MY KID BUILT', 'THAT ELEVATOR. TWO STAGES!'],
      ["I DON'T KNOW ALL THE RULES, BUT I", 'KNOW EXACTLY WHEN TO SCREAM.'],
    ],
  },
  {
    id: 'adeyemi', name: 'MR. ADEYEMI, MENTOR', x: FIELD.x0 + 110, tier: 0,
    look: look('adeyemi', { ...skinBody('deep'), shirt: tones.shirtBlue, jeans: tones.khaki, cuff: tones.khaki, print: null }, 'glasses',
      { ...SKIN.deep, ...HAIR.grey, q: '#aab2c8' }),
    lines: [
      ['DEFENSE WINS ELIMINATIONS. WATCH', 'WHO PLAYS IT IN QUALS.'],
      ['AND WRITE IT ON THAT BOARD BEFORE', 'YOU FORGET IT. IT IS BLANK!'],
    ],
  },
  {
    id: 'milo', name: 'MILO, AGE 9', x: FIELD.x0 + 332, tier: 0,
    look: look('milo', { ...skinBody('light'), shirt: tones.shirtWhite, print: '#d3212f' }, 'cap',
      { ...SKIN.light, ...HAIR.chestnut, c: '#1d55e8', C: '#4a90ff', D: '#0a237a' }),
    lines: [
      ['IS THAT YOUR ROBOT? IT CLIMBED SO', 'HIGH!'],
      ["WHEN I'M IN HIGH SCHOOL I'M JOINING", '5026. SAVE ME A SPOT.'],
    ],
  },
  {
    id: 'juno', name: 'JUNO, SCOUTING FOR 7777', x: FIELD.x0 + 394, tier: 0,
    look: look('juno', { ...skinBody('tan'), shirt: tones.shirtYellow, jeans: tones.black, cuff: tones.black, print: C.ink }, 'bun',
      { ...SKIN.tan, ...HAIR.black }),
    lines: [
      ['HATCH ON LEVEL 3 IN UNDER TEN', 'SECONDS. YES, I WROTE THAT DOWN.'],
      ['OUR DEFENDER WILL BE WAITING AT', 'YOUR ROCKET. NOTHING PERSONAL.'],
    ],
  },
  {
    id: 'dani', name: 'DANI, 5026 ALUM', x: FIELD.x0 + 228, tier: 0,
    look: look('dani', { ...skinBody('fair'), shirt: tones.hoodie, print: '#d3212f' }, 'bob',
      { ...SKIN.fair, ...HAIR.black, r: '#d3212f', R: '#ff6a55' }),
    lines: [
      ['WE NEVER MADE HAB 3 IN MY YEAR.', "YOU'RE LIVING THE DREAM."],
      ['SCOUT EVERYONE. THE BEST PICKS', 'ARE NEVER THE FLASHIEST ROBOTS.'],
    ],
  },
  {
    id: 'sam', name: 'SAM, FIELD VOLUNTEER', x: GATE.x1 + 4, y: 61, standing: true,
    look: look('sam', { ...skinBody('tan'), shirt: tones.shirtGreen, jeans: tones.khaki, cuff: tones.khaki, print: '#ffc61a' }, 'cap',
      { ...SKIN.tan, ...HAIR.black, c: '#1d5e3a', C: '#2e8b57', D: '#0b2a1a' }),
    lines: [
      ['SORRY, THE FIELD IS DRIVE TEAMS', 'ONLY. NOT EVEN STRATEGISTS.'],
      ['THE STANDS ARE THE BEST SEAT FOR', 'SCOUTING ANYWAY. GO GET THEM.'],
    ],
  },
  {
    id: 'priya', name: 'PRIYA, QUEUER', x: 28, y: 84, standing: true,
    look: look('priya', { ...skinBody('brown'), shirt: tones.shirtOrange, jeans: tones.black, cuff: tones.black, print: C.ink }, 'bun',
      { ...SKIN.brown, ...HAIR.black }),
    lines: [
      ['MATCH 43 IS QUEUING. THOSE TWO ARE', 'UP NEXT, THEN 5026 RIGHT AFTER.'],
      ['TELL YOUR DRIVE TEAM THE PLAN', 'BEFORE THEY GET HERE, NOT AFTER.'],
    ],
  },
  {
    id: 'gus', name: 'GUS, SCOREKEEPER', x: WORLD_W - 57, y: 96, standing: true,
    look: look('gus', { ...skinBody('fair'), shirt: tones.hoodie, jeans: tones.black, cuff: tones.black, print: null }, 'glasses',
      { ...SKIN.fair, ...HAIR.grey, q: '#aab2c8' }),
    lines: [
      ['BLUE 41, RED 38. THE CLIMBS AT THE', 'END SWING MORE MATCHES THAN YOU THINK.'],
      ['WANT THE BREAKDOWN? HATCHES, CARGO,', 'CLIMBS, FOULS. IT IS ALL ON MY SCREEN.'],
    ],
  },
];

// The rest of the crowd, filling the rows around them. Nobody here needs to talk. Fourteen looks go round, so the
// rig only has to draw fourteen strangers.
const SHIRTS = [tones.shirtGreen, tones.shirtPurple, tones.shirtOrange, tones.shirtBlue, tones.shirtWhite, tones.shirtRed, tones.hoodie];
const FAN_HEADS = [
  ['curls', 'black'], ['bob', 'auburn'], ['cap', 'blonde'], ['bun', 'brown'], ['glasses', 'chestnut'], ['curls', 'chestnut'], ['bob', 'brown'],
];
const SKINS = Object.keys(SKIN);
const CAPS = [['#d3212f', '#ff6a55', '#6b0f1b'], ['#2e8b57', '#5cc38a', '#1d5e3a'], ['#1d55e8', '#4a90ff', '#0a237a']];
function stranger(i, shirt = SHIRTS[i % SHIRTS.length]) {
  const [headName, hairName] = FAN_HEADS[i % FAN_HEADS.length];
  const skinName = SKINS[(i * 3 + 1) % SKINS.length];
  const [c, Cc, D] = CAPS[i % 3];
  return look(`fan${i}-${shirt[1]}`, { ...skinBody(skinName), shirt, print: null }, headName, {
    ...SKIN[skinName], ...HAIR[hairName], q: '#aab2c8', r: HAIR[hairName].h, R: HAIR[hairName].H, c, C: Cc, D,
  });
}
const FAN_LOOKS = Array.from({ length: 14 }, (_, i) => stranger(i));
// A seat every 20 pixels or so down each row, leaving the aisles clear and room around the people with something to say.
const FANS = [];
TIERS.forEach((_, tier) => {
  for (let x = 12 + tier * 7; x < WORLD_W - 8; x += 18 + Math.floor(rnd(x * 3 + tier) * 8)) {
    if (AISLES.some(([a, b]) => x > a - 8 && x < b + 8)) continue;
    if (tier === 0 && PEOPLE.some((p) => !p.standing && Math.abs(p.x - x) < 20)) continue;
    FANS.push({ id: `fan${FANS.length}`, x, tier, look: FAN_LOOKS[(FANS.length * 5 + tier) % FAN_LOOKS.length] });
  }
});
const SEATED = [...PEOPLE.filter((p) => !p.standing), ...FANS];
// The drivers at their stations, behind the alliance walls, in their teams' shirts and turned to the field, controllers
// up; and in the queue, a drive team member behind each robot.
const DRIVE_SHIRTS = { blue: [tones.shirtRed, tones.shirtBlue, tones.shirtWhite], red: [tones.shirtYellow, tones.shirtOrange, tones.shirtGreen] };
const CREW = [
  ...['blue', 'red'].flatMap((alliance, a) => [4.5, 13.5, 22.5].map((z, station) => ({
    id: `driver${a}${station}`, x: alliance === 'blue' ? FIELD.x0 - 18 : FIELD.x1 + 18, y: Math.round(floorY(z)),
    dir: alliance === 'blue' ? 2 : 6, gait: 'drive', look: stranger(a * 3 + station + 3, DRIVE_SHIRTS[alliance][station]),
  }))),
  { id: 'queue0', x: 70, y: 104, look: stranger(9, tones.shirtPurple) },
  { id: 'queue1', x: 100, y: 102, look: stranger(12, tones.shirtGreen) },
];
/** Everyone standing up, to be sorted in with the field by their feet. */
export const STANDING = [...PEOPLE.filter((p) => p.standing), ...CREW];

// ---- Drawing ----
/** The walkway: concrete between the front row and the field's far wall, with a yellow edge line. */
export function drawWalkway(g, camX) {
  g.fillStyle = '#353a4c';
  g.fillRect(0, TIERS[0] + 2, 256, 64 - TIERS[0]);
  for (let i = 0; i < 520; i++) {
    const x = Math.floor(rnd(i + 3000) * WORLD_W) - camX;
    if (x < 0 || x >= 256) continue;
    g.fillStyle = rnd(i + 7) < 0.5 ? '#3b4154' : '#30354a';
    g.fillRect(x, TIERS[0] + 2 + Math.floor(rnd(i + 4000) * (64 - TIERS[0])), 1, 1);
  }
  // The yellow line runs along the field and the driver stations; past them the floor opens out.
  g.fillStyle = '#ffc61a';
  g.fillRect(FIELD.x0 - STATION - camX, 65, FIELD.x1 - FIELD.x0 + 2 * STATION, 1);
}

/** Sitting or, now and then, cheering. */
function gaitOf(p, t) {
  const every = 5 + rnd(p.x + p.tier * 7) * 6, phase = (t + rnd(p.x + 1) * 9) % every;
  return phase < 0.5 ? 'cheer' : 'sit';
}

export function drawStands(g, camX, t, talkingTo) {
  g.fillStyle = '#10142c';
  g.fillRect(0, 0, 256, TIERS[0] + 2);
  for (let tier = TIERS.length - 1; tier >= 0; tier--) {
    const y = TIERS[tier];
    // Seat plank, the shadow under it, then the footboard.
    g.fillStyle = '#c4cbe0'; g.fillRect(0, y - 12, 256, 1);
    g.fillStyle = '#9aa3bd'; g.fillRect(0, y - 11, 256, 2);
    g.fillStyle = '#5d6580'; g.fillRect(0, y - 9, 256, 1);
    g.fillStyle = '#1a1f38'; g.fillRect(0, y - 8, 256, 7);
    g.fillStyle = '#aab2c8'; g.fillRect(0, y - 1, 256, 2);
    g.fillStyle = '#4b5269'; g.fillRect(0, y + 1, 256, 1);
    // The aisles' steps, with their yellow nosing.
    for (const [x0, x1] of AISLES) {
      g.fillStyle = '#7882a3'; g.fillRect(x0 - camX, y - 12, x1 - x0, 13);
      g.fillStyle = '#ffc61a'; g.fillRect(x0 - camX, y - 1, x1 - x0, 1);
      g.fillRect(x0 - camX, y - 12, x1 - x0, 1);
    }
    for (const p of SEATED) {
      if (p.tier === tier && p.x > camX - 20 && p.x < camX + 276) {
        drawWalker(g, p.x - camX, y, 0, p === talkingTo ? 'sit' : gaitOf(p, t), 0, p.look);
      }
    }
  }
}

/** Someone standing: facing you unless they're turned somewhere, and just standing unless they're driving. */
export const drawStanding = (g, camX, p) => drawWalker(g, p.x - camX, p.y, p.dir ?? 0, p.gait ?? 'stand', 0, p.look);

const feetOf = (p) => (p.standing ? p.y : TIERS[p.tier]);
/** The person in reach of someone standing at (x, y) on the walkway, if any. */
export function inReach(x, y) {
  let best = null, bestD = Infinity;
  for (const p of PEOPLE) {
    const d = Math.abs(p.x - x);
    const close = p.standing ? d < 14 && Math.abs(p.y - y) < 8 : d < 11;
    if (close && d < bestD) [best, bestD] = [p, d];
  }
  return best;
}
/** Where they are, for turning to face them. */
export const seatOf = (p) => ({ x: p.x, y: feetOf(p) - 10 });

/** A speech bubble with A in it over someone you can talk to. */
export function drawPrompt(g, camX, p, t) {
  useContext(g);
  screen();
  const x = p.x - camX + 11, y = Math.max(1, feetOf(p) - (p.standing ? 50 : 41)) + (Math.floor(t * 3) % 2);
  fill(x - 5, y, 11, 10, C.ink);
  fill(x - 4, y + 1, 9, 8, C.white);
  fill(x - 1, y + 10, 3, 1, C.ink);
  fill(x, y + 11, 1, 1, C.ink);
  text('A', x - 2, y + 2, { font: 3, color: C.blue1 });
}

/** The dialog box: who's talking, then the page typed out. */
export function drawDialog(g, d, t) {
  useContext(g);
  screen();
  const page = d.person.lines[d.page];
  const shown = typedOf(d, t);
  fill(4, 98, 248, 44, C.ink);
  fill(6, 100, 244, 40, '#f4f6fb');
  fill(7, 101, 242, 1, C.blue3);
  const nameW = d.person.name.length * 6 + 9;
  fill(8, 90, nameW, 12, C.ink);
  fill(9, 91, nameW - 2, 10, C.blue1);
  text(d.person.name, 13, 93, { color: C.white });
  let left = shown;
  page.forEach((line, i) => {
    text(line, 12, 107 + i * 13, { color: C.ink, upto: Math.max(0, left) });
    left -= line.length;
  });
  if (shown >= pageLength(page) && Math.floor(t * 2.5) % 2 === 0) {
    fill(240, 130, 5, 1, C.blue1);
    fill(241, 131, 3, 1, C.blue1);
    fill(242, 132, 1, 1, C.blue1);
  }
}
const pageLength = (page) => page.reduce((n, line) => n + line.length, 0);
const typedOf = (d, t) => (d.full ? Infinity : Math.floor((t - d.start) * 40));

/** Press A in a conversation: finish typing the page, or turn it, or say goodbye. Returns false when it's over. */
export function advance(d, t) {
  const page = d.person.lines[d.page];
  if (typedOf(d, t) < pageLength(page)) {
    d.full = true;
    return true;
  }
  d.page += 1;
  d.full = false;
  d.start = t;
  return d.page < d.person.lines.length;
}
/** The page being said, as plain text for the phone and screen readers. */
export const dialogText = (d) => d.person.lines[d.page].join(' ');
