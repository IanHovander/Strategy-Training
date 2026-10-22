// The bleachers beside the practice field: aluminium tiers, the crowd on them, and the people you can stop and talk to.
// Everyone is drawn with the walker's rig (walker.js) in their own look, seated, with a hand-drawn head. The world is
// two screens wide: the field on the left (x 0-256) and the stands on the right (x 256-512).

import { C, useContext, screen, fill, text, rnd } from './pixel.js';
import { HERO_LOOK, drawWalker } from './walker.js';

// Where the tiers' footboards are, front row first; each row sits 14 pixels higher than the one in front of it.
const TIERS = [66, 52, 38, 24];
export const STANDS = { x0: 262, x1: 506, front: 68 };
const AISLE = { x0: 378, x1: 390 };

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
function look(id, body, head, headPal) {
  return { id, pal: { ...HERO_LOOK.pal, ...body }, heads: { s: head }, headPal: { ...BASE, ...headPal }, board: false };
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

// The people you can talk to sit in the front two rows. Lines are pages of up to two lines, 38 characters each.
export const PEOPLE = [
  {
    id: 'rosa', name: 'ROSA, 5026 PARENT', x: 292, tier: 0,
    look: look('rosa', { ...skinBody('brown'), shirt: tones.shirtRed }, HEADS.curls, { ...SKIN.brown, ...HAIR.brown }),
    lines: [
      ['YOU ARE ON 5026? MY KID BUILT', 'THAT ELEVATOR. TWO STAGES!'],
      ["I DON'T KNOW ALL THE RULES, BUT I", 'KNOW EXACTLY WHEN TO SCREAM.'],
    ],
  },
  {
    id: 'adeyemi', name: 'MR. ADEYEMI, MENTOR', x: 338, tier: 0,
    look: look('adeyemi', { ...skinBody('deep'), shirt: tones.shirtBlue, jeans: tones.khaki, cuff: tones.khaki, print: null }, HEADS.glasses,
      { ...SKIN.deep, ...HAIR.grey, q: '#aab2c8' }),
    lines: [
      ['DEFENSE WINS ELIMINATIONS. WATCH', 'WHO PLAYS IT IN QUALS.'],
      ['AND WRITE IT ON THAT BOARD BEFORE', 'YOU FORGET IT. IT IS BLANK!'],
    ],
  },
  {
    id: 'milo', name: 'MILO, AGE 9', x: 422, tier: 0,
    look: look('milo', { ...skinBody('light'), shirt: tones.shirtWhite, print: '#d3212f' }, HEADS.cap,
      { ...SKIN.light, ...HAIR.chestnut, c: '#1d55e8', C: '#4a90ff', D: '#0a237a' }),
    lines: [
      ['IS THAT YOUR ROBOT? IT CLIMBED SO', 'HIGH!'],
      ["WHEN I'M IN HIGH SCHOOL I'M JOINING", '5026. SAVE ME A SPOT.'],
    ],
  },
  {
    id: 'juno', name: 'JUNO, SCOUTING FOR 7777', x: 470, tier: 0,
    look: look('juno', { ...skinBody('tan'), shirt: tones.shirtYellow, jeans: tones.black, cuff: tones.black, print: C.ink }, HEADS.bun,
      { ...SKIN.tan, ...HAIR.black }),
    lines: [
      ['HATCH ON LEVEL 3 IN UNDER TEN', 'SECONDS. YES, I WROTE THAT DOWN.'],
      ['OUR DEFENDER WILL BE WAITING AT', 'YOUR ROCKET. NOTHING PERSONAL.'],
    ],
  },
  {
    id: 'dani', name: 'DANI, 5026 ALUM', x: 360, tier: 1,
    look: look('dani', { ...skinBody('fair'), shirt: tones.hoodie, print: '#d3212f' }, HEADS.bob,
      { ...SKIN.fair, ...HAIR.black, r: '#d3212f', R: '#ff6a55' }),
    lines: [
      ['WE NEVER MADE HAB 3 IN MY YEAR.', "YOU'RE LIVING THE DREAM."],
      ['SCOUT EVERYONE. THE BEST PICKS', 'ARE NEVER THE FLASHIEST ROBOTS.'],
    ],
  },
];

// The rest of the crowd, filling the rows around them. Nobody here needs to talk.
const SHIRTS = [tones.shirtGreen, tones.shirtPurple, tones.shirtOrange, tones.shirtBlue, tones.shirtWhite, tones.shirtRed, tones.hoodie];
const FAN_HEADS = [
  ['curls', 'black'], ['bob', 'auburn'], ['cap', 'blonde'], ['bun', 'brown'], ['glasses', 'chestnut'], ['curls', 'chestnut'], ['bob', 'brown'],
];
const SEATS = [
  [1, 286], [1, 318], [1, 412], [1, 446], [1, 490],
  [2, 276], [2, 306], [2, 342], [2, 404], [2, 436], [2, 468], [2, 498],
  [3, 290], [3, 326], [3, 360], [3, 418], [3, 452], [3, 484],
];
const SKINS = Object.keys(SKIN);
const FANS = SEATS.map(([tier, x], i) => {
  const [headName, hairName] = FAN_HEADS[i % FAN_HEADS.length];
  const skinName = SKINS[(i * 3 + 1) % SKINS.length];
  const capColors = [['#d3212f', '#ff6a55', '#6b0f1b'], ['#2e8b57', '#5cc38a', '#1d5e3a'], ['#1d55e8', '#4a90ff', '#0a237a']][i % 3];
  return {
    id: `fan${i}`, x, tier,
    look: look(`fan${i}`, { ...skinBody(skinName), shirt: SHIRTS[i % SHIRTS.length], print: null }, HEADS[headName], {
      ...SKIN[skinName], ...HAIR[hairName], q: '#aab2c8', r: HAIR[hairName].h, R: HAIR[hairName].H,
      c: capColors[0], C: capColors[1], D: capColors[2],
    }),
  };
});
const EVERYONE = [...PEOPLE, ...FANS];

// ---- Drawing ----
/** The arena floor and the field's side wall, which has a gate in it. */
export const GATE = { x: 254, y0: 98, y1: 126 };
export function drawFloor(g, camX) {
  const ox = 256 - camX;
  g.fillStyle = '#353a4c';
  g.fillRect(ox, 0, 256, 144);
  for (let i = 0; i < 700; i++) {
    g.fillStyle = rnd(i + 7) < 0.5 ? '#3b4154' : '#30354a';
    g.fillRect(ox + Math.floor(rnd(i + 3000) * 256), Math.floor(rnd(i + 4000) * 144), 1, 1);
  }
  // A walkway stripe in front of the stands.
  g.fillStyle = '#ffc61a';
  g.fillRect(ox + 6, 74, 250, 1);
  // The field wall: clear panels on posts, with the gate open between them.
  const wx = GATE.x - camX;
  for (const [y0, y1] of [[34, GATE.y0], [GATE.y1, 144]]) {
    g.fillStyle = 'rgba(168, 210, 255, 0.35)';
    g.fillRect(wx - 1, y0, 3, y1 - y0);
    g.fillStyle = '#c4cbe0';
    g.fillRect(wx - 1, y0, 3, 1);
    g.fillStyle = '#5d6580';
    for (let y = y0; y < y1; y += 16) g.fillRect(wx - 1, y, 3, 2);
  }
  g.fillStyle = '#0b0d17';
  g.fillRect(wx - 2, GATE.y0, 5, 2);
  g.fillRect(wx - 2, GATE.y1 - 2, 5, 2);
}

/** Sitting or, now and then, cheering. */
function gaitOf(p, t) {
  const every = 5 + rnd(p.x) * 6, phase = (t + rnd(p.x + 1) * 9) % every;
  return phase < 0.5 ? 'cheer' : 'sit';
}

export function drawStands(g, camX, t, talkingTo) {
  const ox = -camX;
  const x0 = STANDS.x0 + ox, w = STANDS.x1 - STANDS.x0;
  if (x0 > 256 || x0 + w < 0) return;
  g.fillStyle = '#10142c';
  g.fillRect(x0, 0, w, TIERS[0] + 2);
  for (let tier = TIERS.length - 1; tier >= 0; tier--) {
    const y = TIERS[tier];
    // Seat plank, the shadow under it, then the footboard.
    g.fillStyle = '#c4cbe0'; g.fillRect(x0, y - 12, w, 1);
    g.fillStyle = '#9aa3bd'; g.fillRect(x0, y - 11, w, 2);
    g.fillStyle = '#5d6580'; g.fillRect(x0, y - 9, w, 1);
    g.fillStyle = '#1a1f38'; g.fillRect(x0, y - 8, w, 7);
    g.fillStyle = '#aab2c8'; g.fillRect(x0, y - 1, w, 2);
    g.fillStyle = '#4b5269'; g.fillRect(x0, y + 1, w, 1);
    // The aisle's steps, with their yellow nosing.
    g.fillStyle = '#7882a3'; g.fillRect(AISLE.x0 + ox, y - 12, AISLE.x1 - AISLE.x0, 13);
    g.fillStyle = '#ffc61a'; g.fillRect(AISLE.x0 + ox, y - 1, AISLE.x1 - AISLE.x0, 1);
    g.fillStyle = '#ffc61a'; g.fillRect(AISLE.x0 + ox, y - 12, AISLE.x1 - AISLE.x0, 1);
    for (const p of EVERYONE) {
      if (p.tier !== tier || p.x + ox < -20 || p.x + ox > 276) continue;
      drawWalker(g, p.x + ox, y, 0, p === talkingTo ? 'sit' : gaitOf(p, t), 0, p.look);
    }
  }
  // Posts at the ends.
  g.fillStyle = '#0b0d17';
  g.fillRect(x0 - 3, 0, 3, STANDS.front);
  g.fillRect(x0 + w, 0, 3, STANDS.front);
}

/** The person in reach of someone standing at (x, y) on the walkway, if any. */
export function inReach(x, y) {
  if (y > STANDS.front + 20) return null;
  let best = null;
  for (const p of PEOPLE) {
    const d = Math.abs(p.x - x);
    if (d < 14 && (!best || d < Math.abs(best.x - x))) best = p;
  }
  return best;
}
/** Where they are, for turning to face them. */
export const seatOf = (p) => ({ x: p.x, y: TIERS[p.tier] - 10 });

/** A speech bubble with A in it over someone you can talk to. */
export function drawPrompt(g, p, camX, t) {
  useContext(g);
  screen();
  const x = p.x - camX, y = TIERS[p.tier] - 44 + (Math.floor(t * 3) % 2);
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
