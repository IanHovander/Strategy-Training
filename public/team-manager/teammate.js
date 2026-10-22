// A teammate at full height, drawn from a photo: thick black hair, tousled on top with a choppy fringe down to the
// brows, and a smile wide enough to show teeth, eyes narrowed by it. The team's red pullover hoodie, the hood bunched
// round the neck and a navy tee showing at the throat, with the panther-in-a-hexagon badge and 5026 across the chest;
// dark jeans and black sneakers. Standing square on, hands together in front.
//
// Like the hero (hero.js), this sprite is drawn pixel by pixel at the canvas's own resolution: draw it with the camera
// at scale 1. One letter per pixel, PALETTE says what each one is, and '.' is see-through.

import { layer, blit, fill } from './pixel.js';
import { HERO_LOOK, leftFacing } from './walker.js';

const PALETTE = {
  k: '#0b0d17', // outline
  S: '#f6d6b4', // skin, lit
  s: '#e8bb92', // skin
  d: '#cf9a70', // skin, shade
  D: '#a8714e', // skin, deep shade
  e: '#e9998a', // cheeks
  g: '#101014', // hair
  h: '#232129', // hair, strands
  H: '#4a4654', // hair, sheen
  E: '#1d1513', // eyes
  T: '#f6f1ea', // teeth
  M: '#6e2a2a', // mouth
  m: '#c4706a', // lip
  R: '#ff5a4a', // hoodie, lit
  r: '#d81f2c', // hoodie
  q: '#a3152a', // hoodie, shade
  Q: '#6b0f1b', // hoodie, seams and folds
  N: '#1f2a52', // tee under it
  W: '#f4f2f0', // badge, white
  L: '#16161b', // badge, black
  J: '#5a6a92', // jeans, lit
  j: '#3e4a70', // jeans
  n: '#2b3452', // jeans, shade
  O: '#3a3d48', // sneaker
  o: '#23252c', // sneaker, shade
  P: '#e3e7f0', // sole
  p: '#9aa3bd', // laces
};

// Standing on the bottom row; the middle of the body is between columns 19 and 20.
const BODY = [
  '...............kkkkkkkkkk...............',
  '.............kkggggggggggkk.............',
  '............kgghHHhhhhhhhgkk............',
  '...........kghHHhhHhhhghhhhgkk..........',
  '..........kghHhhhhhghhhghhghggk.........',
  '.........kggHhhghhhhghhhghhhggk.........',
  '.........kgghhhhghhhhhhhhghhgk..........',
  '..........kgghHghHggggghHhhggk..........',
  '..........kgghhhghhgssgghghggk..........',
  '..........kgghghgggssssgghgggk..........',
  '..........kgggshhhhsshhhhghggk..........',
  '...........kkshsssssssssshgkk...........',
  '...........kdsSEEEssssEEEdddk...........',
  '..........ksdsSsEssSsssEsdddsk..........',
  '..........ksDsSsdssSdssssddDsk..........',
  '..........ksdsSesssSdsssedddsk..........',
  '...........kdsSsssDddDsssdddk...........',
  '............ksSssssssssssddk............',
  '..........kkksSsMmmmmmmMsddk............',
  '.........kRqksssMTTTTTTMsddk............',
  '........kRrrkssssMmmmmMssddkkk..........',
  '.......kRrrrQkssssddddddddkrqqk.........',
  '.......kRrrqrQksssssssdddkrrrqqk........',
  '.......kRrrrqrqkssssssddkRrrrqqk........',
  '.......kRrrQrqrqksssssdkRrrrqqqk........',
  '.......kRrqrQrqqqkkkkkkRrrrqrqqk........',
  '.......kRrrqrrrrQddddddQrrqrrrqqk.......',
  '......kRrrrrrrrQQddddddQQrrrrqrqqk......',
  '.....kkRrrrrrrrrQQNNNNQQrrrrrrrqqkk.....',
  '....kRrQRrrrrrrrrrrrrrrrrrrrrrqqQqqk....',
  '...kRrrqkQRrrrqqqqqqqqqqqqrrqqQkrrqqk...',
  '..kRrrqqQrQQQQQQQQQQQQQQQQQQQQrQRrrqqk..',
  '..kRrrqqQrrrrrrrrrrrrrrrrrrrrrrQRrrqqk..',
  '..kRrrqqQrrrrrrrrrrrrrrrrrrrrrrQRrrqqk..',
  '..kRrrqqQrrrrrrrrrrrrrrrrrrrrrrQRrrqqk..',
  '..kRrrqqQrrWWrrrWWWrWWWrWWWrWWWkRrrqqk..',
  '..kRrrqqQrWLLWrrWrrrWrWrrrWrWrrQRrrqqk..',
  '..kRrrqqkWLWWLWrWWWrWrWrWWWrWWWkRrrqqk..',
  '..kRrrqqkWLWWWWrrrWrWrWrWrrrWrWkRrrqqk..',
  '..kRrrqqkWLLWLWrWWWrWWWrWWWrWWWkRrrqqk..',
  '..kRrrqqQrWLLWrrrrrrrrrrrrrrrrrQRrrqqk..',
  '..kRrrqqQrrWWrrrWrWWWWWWWWWWWWrQRrrqqk..',
  '..kRrrqqQrrrrrrrrrrrrrrrrrrrrrrQRrrqqk..',
  '..kRrrqqQrrrrrrrrrrrrrrrrrrrrrrQRrrqqk..',
  '..kRrrqqQrrrrrrrrrrrrrrrrrrrrrrQRrrqqk..',
  '..kRrrqqQrrrrrrrrrrrrrrrrrrrrrrQRrrqqk..',
  '..kRrrqqQrrrrrrrrrrrrrrrrrrrrrrQRrrqqk..',
  '...kRrrqqQQrrrrrrrrrrrrrrrrrrQQRrrqqk...',
  '....kkRrrqqQrrrrrrrrrrrrrrrrQRrrqqkk....',
  '......kRrrqqQQrrrrrrrrrrrrQQRrrqqk......',
  '......kQQRrrqqQQrrrrrrrrQQRrrqqQQk......',
  '......kRrQQRrrqqQrrrrrrQRrrqqQQqqk......',
  '......kRrrrQqqqqqkkrrkkqqqqqQrrqqk......',
  '......kRrrrrQQqqkkkkkkkkqqQQrrrqqk......',
  '......kRrrrrrrkkSsssssddkkrrrrrqqk......',
  '......kRrrrrrrkSsssddssddkrrrrrqqk......',
  '.......krqrqrqkSsssDDssddkrqrqrqk.......',
  '.......krqrqrqrkSsssssddkqrqrqrqk.......',
  '.......krqrqrqrqkkkkkkkkrqrqrqrqk.......',
  '........kkkkkkkkkkkkkkkkkkkkkkkk........',
  '...........kJjjjjjnkJjjjjjnnk...........',
  '...........kJjjjjjnkJjjjjjnnk...........',
  '...........kJjjjjjnkJjjjjjnnk...........',
  '...........kJjjjjjnkJjjjjjnnk...........',
  '...........kJjjjjjnkJjjjjjnnk...........',
  '...........kJjjjjjnkJjjjjjnnk...........',
  '...........kJjjjjjnkJjjjjjnnk...........',
  '...........kJjjjjjnkJjjjjjnnk...........',
  '...........kJjjjjjnkJjjjjjnnk...........',
  '...........kJjjjjjnkJjjjjjnnk...........',
  '...........kJjjjjjnkJjjjjjnnk...........',
  '...........kJjjjjjnkJjjjjjnnk...........',
  '...........kJjjjjjnkJjjjjjnnk...........',
  '...........kJjjjjjnkJjjjjjnnk...........',
  '...........kJjjjjjnkJjjjjjnnk...........',
  '...........kJjjjjjnkJjjjjjnnk...........',
  '...........kJjjjjjnkJjjjjjnnk...........',
  '...........kJjjjjjnkJjjjjjnnk...........',
  '...........kJjjjjjnkJjjjjjnnk...........',
  '...........kJjjjjjnkJjjjjjnnk...........',
  '...........kJjjjjjnkJjjjjjnnk...........',
  '............kJjjjjnkJjjjjnnk............',
  '............kJjjjjnkJjjjjnnk............',
  '............kJjjjjnkJjjjjnnk............',
  '............kJjjjjnkJjjjjnnk............',
  '............kJjjjjnkJjjjjnnk............',
  '............kkkkkkkkkkkkkkkk............',
  '...........kOOOOOOokOOOOOOook...........',
  '..........kOOpOpOpokOOpOpOpook..........',
  '.........kOOOOOOOOokOOOOOOOOook.........',
  '.........kOOOOOOOOokOOOOOOOOook.........',
  '.........kPPPPPPPPPPPPPPPPPPPPk.........',
  '..........kkkkkkkkkkkkkkkkkkkk..........',
];

export const TEAMMATE_W = 40, TEAMMATE_H = 93;
const FOOT_X = 20;

function stamp(grid, x0, y0, lines) {
  lines.forEach((line, dy) => {
    [...line].forEach((ch, dx) => {
      if (ch !== '.') grid[y0 + dy][x0 + dx] = ch;
    });
  });
}

function pixels(blink) {
  const grid = BODY.map((row) => [...row]);
  // Eyes shut: the lids come down to where the irises were.
  if (blink) stamp(grid, 15, 12, ['sss....sss', 'EEE....EEE']);
  return grid;
}

const cache = new Map();
/** The teammate as an offscreen layer, cached per pose. o: blink. */
export function teammateLayer(o = {}) {
  const blink = !!o.blink;
  if (!cache.has(blink)) {
    const grid = pixels(blink);
    cache.set(blink, layer(TEAMMATE_W, TEAMMATE_H, () => {
      grid.forEach((row, y) => {
        // One rectangle per run of the same colour.
        for (let x = 0; x < TEAMMATE_W; ) {
          let end = x + 1;
          while (end < TEAMMATE_W && row[end] === row[x]) end++;
          if (row[x] !== '.') fill(x, y, end - x, 1, PALETTE[row[x]]);
          x = end;
        }
      });
    }));
  }
  return cache.get(blink);
}

/** The idle loop at t seconds: a blink every 5.4 s, out of step with the hero's. */
export const teammateIdle = (t) => ({ blink: t % 5.4 > 5.26 });

/** Draw the teammate standing on (x, y): x is the middle of the body, y the floor. o as for teammateLayer. */
export function drawTeammate(x, y, o = {}) {
  blit(teammateLayer(o), x - FOOT_X, y - TEAMMATE_H);
}

// ---- Walking ----
// The same teammate on the walker's rig (walker.js): the hoodie with its long sleeves, hood and badge, and a head drawn
// by hand for each direction, from the portrait.
const HEADS = {
  s: [
    '....kkkkkkkkk...',
    '...kggggggggk...',
    '..kghHHhhhhhgk..',
    '.kghHhhhghhghgk.',
    'kghHhhhhhghhghgk',
    'kghhghhhgghhhhgk',
    'kghhhhggksgghhgk',
    'kghggggssssgghgk',
    'kggSssssssssdggk',
    'kksEEEsSssEEEdkk',
    'kdsSEssSsssEdddk',
    'kdsesMssdsMseddk',
    '.kkssMTTTTMsdkk.',
    '...kssdmmdddk...',
    '....kssssddk....',
    '.....kkkkkk.....',
  ],
  se: [
    '....kkkkkkkkk...',
    '...kggggggggk...',
    '..kghHHhhhhhgk..',
    '.kghHhhhghhghgk.',
    'kghHhhhhhghhghgk',
    'kghhhhhhhhgghhhk',
    'kgghhhghggssgghk',
    'kghghggggssssghk',
    'kghggSsssssssdgk',
    'kgkksEEEssSEEddk',
    'kgkksSEsssSsEddk',
    '.kggkesMsssdMddk',
    '..kkkssMTTTTMdk.',
    '.....kssdmmddk..',
    '......ksssddk...',
    '.......kkkkk....',
  ],
  e: [
    '....kkkkkkk.....',
    '..kkgggggggkk...',
    '.kggHHhhhhhggk..',
    'kghHhhhghhghhgk.',
    'ghHhhhhhghhghgk.',
    'ghhhhhhhhhhhhhk.',
    'ghhghhhhgghghhk.',
    'ghhhhhgkksgsggk.',
    'ghhhggkddssssSk.',
    'ghhhgkdddssEEssk',
    'ghhhgkDddsssEsdk',
    'kghhhgkddseMssk.',
    '.kghhgkkdssMTTk.',
    '..kkkk..kdddmk..',
    '.........kddk...',
    '..........kk....',
  ],
  ne: [
    '....kkkkkkkk....',
    '...kggggggggk...',
    '..kghHHhhhhhgk..',
    '.kghHhhghhghhgk.',
    'kghHhhhhghhghhgk',
    'kghhhhhhhhhhhhgk',
    'kghhhghhghhhhhgk',
    'kghhhhghhghhhhgk',
    'kghhhhhhhhhhhggk',
    'kghhghhhhgdkgkk.',
    'kghhhhghhgDdssk.',
    '.kghhhhhhgkdssk.',
    '..kggkkkkkdddk..',
    '...kkkddddddk...',
    '......kddddk....',
    '.......kkkk.....',
  ],
  n: [
    '....kkkkkkkkk...',
    '...kggggggggk...',
    '..kghHHhhhhhgk..',
    '.kghHhhghhghhgk.',
    'kghHhhhhghhghhgk',
    'kghhhhHhhHhhhhgk',
    'kghhghhghhghHhgk',
    'kghhhghhghhghhgk',
    'kghhhhhhhhhhhhgk',
    'kdghhhhghhhghgdk',
    'kdghhghhhghhhgdk',
    '.kkghhhhhhhhgkk.',
    '...kggkkkkggk...',
    '....kkddddkk....',
    '.....kddddk.....',
    '......kkkk......',
  ],
};
HEADS.sw = leftFacing(HEADS.se);
HEADS.w = leftFacing(HEADS.e);
HEADS.nw = leftFacing(HEADS.ne);

export const TEAMMATE_LOOK = {
  id: 'teammate', board: false, hoodie: true, sleeves: 'long',
  pal: {
    ...HERO_LOOK.pal,
    skin: ['#cf9a70', '#e8bb92', '#f6d6b4'],
    shirt: ['#a3152a', '#d81f2c', '#ff5a4a'],
    hem: ['#6b0f1b', '#a3152a', '#d81f2c'],
    jeans: ['#2b3452', '#3e4a70', '#5a6a92'],
    cuff: ['#2b3452', '#3e4a70', '#5a6a92'],
    sockL: ['#23252c', '#3a3d48', '#3a3d48'],
    sockR: ['#23252c', '#3a3d48', '#3a3d48'],
    shoe: ['#23252c', '#3a3d48', '#5a5e6c'],
    sole: ['#9aa3bd', '#e3e7f0', '#e3e7f0'],
    print: null,
  },
  heads: HEADS,
  headPal: {
    k: '#0b0d17', g: '#101014', h: '#232129', H: '#4a4654', s: '#e8bb92', S: '#f6d6b4', d: '#cf9a70', D: '#a8714e',
    e: '#e9998a', E: '#1d1513', M: '#6e2a2a', m: '#c4706a', T: '#f6f1ea',
  },
  // The panther's hexagon, and 5026 beside it with the stroke under.
  badge: [[-4, -1, 3, 3, '#f4f2f0'], [-3, 0, 1, 1, '#16161b'], [0, -1, 4, 2, '#f4f2f0'], [1, -1, 1, 1, '#d81f2c'], [0, 2, 4, 1, '#f4f2f0']],
};
