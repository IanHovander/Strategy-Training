// The bleachers along the field's far side: aluminium tiers, the crowd on them, and the people you can stop and talk to.
// Everyone is drawn with the walker's rig (walker.js) in their own look, seated, with a hand-drawn head. Below the stands
// runs the walkway, the closest a strategist gets to the field (field.js): a volunteer minds the gate.

import { C, useContext, screen, fill, text, rnd } from './pixel.js';
import { HERO_LOOK, drawWalker } from './walker.js';

// Where the tiers' footboards are, front row first; each row sits 14 pixels higher than the one in front of it.
const TIERS = [48, 34, 20];
const AISLES = [[96, 106], [170, 180]];
/** Where feet can go on the walkway between the stands and the field's far wall. */
export const WALKWAY = { x0: 8, x1: 248, y0: 56, y1: 64 };

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

// The people you can talk to: the front row, and the volunteer at the gate. Lines are pages of up to two lines, 38
// characters each.
export const PEOPLE = [
  {
    id: 'rosa', name: 'ROSA, 5026 PARENT', x: 16, tier: 0,
    look: look('rosa', { ...skinBody('brown'), shirt: tones.shirtRed }, HEADS.curls, { ...SKIN.brown, ...HAIR.brown }),
    lines: [
      ['YOU ARE ON 5026? MY KID BUILT', 'THAT ELEVATOR. TWO STAGES!'],
      ["I DON'T KNOW ALL THE RULES, BUT I", 'KNOW EXACTLY WHEN TO SCREAM.'],
    ],
  },
  {
    id: 'adeyemi', name: 'MR. ADEYEMI, MENTOR', x: 76, tier: 0,
    look: look('adeyemi', { ...skinBody('deep'), shirt: tones.shirtBlue, jeans: tones.khaki, cuff: tones.khaki, print: null }, HEADS.glasses,
      { ...SKIN.deep, ...HAIR.grey, q: '#aab2c8' }),
    lines: [
      ['DEFENSE WINS ELIMINATIONS. WATCH', 'WHO PLAYS IT IN QUALS.'],
      ['AND WRITE IT ON THAT BOARD BEFORE', 'YOU FORGET IT. IT IS BLANK!'],
    ],
  },
  {
    id: 'milo', name: 'MILO, AGE 9', x: 192, tier: 0,
    look: look('milo', { ...skinBody('light'), shirt: tones.shirtWhite, print: '#d3212f' }, HEADS.cap,
      { ...SKIN.light, ...HAIR.chestnut, c: '#1d55e8', C: '#4a90ff', D: '#0a237a' }),
    lines: [
      ['IS THAT YOUR ROBOT? IT CLIMBED SO', 'HIGH!'],
      ["WHEN I'M IN HIGH SCHOOL I'M JOINING", '5026. SAVE ME A SPOT.'],
    ],
  },
  {
    id: 'juno', name: 'JUNO, SCOUTING FOR 7777', x: 232, tier: 0,
    look: look('juno', { ...skinBody('tan'), shirt: tones.shirtYellow, jeans: tones.black, cuff: tones.black, print: C.ink }, HEADS.bun,
      { ...SKIN.tan, ...HAIR.black }),
    lines: [
      ['HATCH ON LEVEL 3 IN UNDER TEN', 'SECONDS. YES, I WROTE THAT DOWN.'],
      ['OUR DEFENDER WILL BE WAITING AT', 'YOUR ROCKET. NOTHING PERSONAL.'],
    ],
  },
  {
    id: 'dani', name: 'DANI, 5026 ALUM', x: 138, tier: 0,
    look: look('dani', { ...skinBody('fair'), shirt: tones.hoodie, print: '#d3212f' }, HEADS.bob,
      { ...SKIN.fair, ...HAIR.black, r: '#d3212f', R: '#ff6a55' }),
    lines: [
      ['WE NEVER MADE HAB 3 IN MY YEAR.', "YOU'RE LIVING THE DREAM."],
      ['SCOUT EVERYONE. THE BEST PICKS', 'ARE NEVER THE FLASHIEST ROBOTS.'],
    ],
  },
  {
    id: 'sam', name: 'SAM, FIELD VOLUNTEER', x: 44, y: 61, standing: true,
    look: look('sam', { ...skinBody('tan'), shirt: tones.shirtGreen, jeans: tones.khaki, cuff: tones.khaki, print: '#ffc61a' }, HEADS.cap,
      { ...SKIN.tan, ...HAIR.black, c: '#1d5e3a', C: '#2e8b57', D: '#0b2a1a' }),
    lines: [
      ['SORRY, THE FIELD IS DRIVE TEAMS', 'ONLY. NOT EVEN STRATEGISTS.'],
      ['THE STANDS ARE THE BEST SEAT FOR', 'SCOUTING ANYWAY. GO GET THEM.'],
    ],
  },
];

// The rest of the crowd, filling the rows around them. Nobody here needs to talk.
const SHIRTS = [tones.shirtGreen, tones.shirtPurple, tones.shirtOrange, tones.shirtBlue, tones.shirtWhite, tones.shirtRed, tones.hoodie];
const FAN_HEADS = [
  ['curls', 'black'], ['bob', 'auburn'], ['cap', 'blonde'], ['bun', 'brown'], ['glasses', 'chestnut'], ['curls', 'chestnut'], ['bob', 'brown'],
];
const SEATS = [
  [0, 36], [0, 56], [0, 118], [0, 158], [0, 212],
  [1, 24], [1, 44], [1, 64], [1, 84], [1, 118], [1, 140], [1, 160], [1, 192], [1, 214], [1, 236],
  [2, 14], [2, 34], [2, 54], [2, 74], [2, 116], [2, 136], [2, 156], [2, 190], [2, 210], [2, 230], [2, 250],
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
const SEATED = [...PEOPLE.filter((p) => !p.standing), ...FANS];
/** People standing on the walkway, to be drawn in depth order with her. */
export const STANDING = PEOPLE.filter((p) => p.standing);

// ---- Drawing ----
/** The walkway: concrete between the front row and the field's far wall, with a yellow edge line. */
export function drawWalkway(g) {
  g.fillStyle = '#353a4c';
  g.fillRect(0, TIERS[0] + 2, 256, 64 - TIERS[0]);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = rnd(i + 7) < 0.5 ? '#3b4154' : '#30354a';
    g.fillRect(Math.floor(rnd(i + 3000) * 256), TIERS[0] + 2 + Math.floor(rnd(i + 4000) * (64 - TIERS[0])), 1, 1);
  }
  g.fillStyle = '#ffc61a';
  g.fillRect(0, 65, 256, 1);
}

/** Sitting or, now and then, cheering. */
function gaitOf(p, t) {
  const every = 5 + rnd(p.x + p.tier * 7) * 6, phase = (t + rnd(p.x + 1) * 9) % every;
  return phase < 0.5 ? 'cheer' : 'sit';
}

export function drawStands(g, t, talkingTo) {
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
      g.fillStyle = '#7882a3'; g.fillRect(x0, y - 12, x1 - x0, 13);
      g.fillStyle = '#ffc61a'; g.fillRect(x0, y - 1, x1 - x0, 1);
      g.fillRect(x0, y - 12, x1 - x0, 1);
    }
    for (const p of SEATED) {
      if (p.tier === tier) drawWalker(g, p.x, y, 0, p === talkingTo ? 'sit' : gaitOf(p, t), 0, p.look);
    }
  }
}

/** Someone standing on the walkway. */
export const drawStanding = (g, p) => drawWalker(g, p.x, p.y, 0, 'stand', 0, p.look);

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
export function drawPrompt(g, p, t) {
  useContext(g);
  screen();
  const x = p.x + 11, y = Math.max(1, feetOf(p) - (p.standing ? 50 : 41)) + (Math.floor(t * 3) % 2);
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
