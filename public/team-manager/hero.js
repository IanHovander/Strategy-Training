// The main character at full height: a high-school drive coach in the team's red 5026 shirt, jeans and white
// sneakers, one hand in a pocket, carrying the drive team's whiteboard by its clip. The board has the 2019 field on
// it (the blue and red HABs at the ends, the cargo ship in the middle, the rockets on the walls) with the plan
// scribbled over it: a blue cycle and a red X where the defender waits. The marker hangs off it on a cord.
//
// The other sprites are built from rectangles at the camera's scale. This one is drawn pixel by pixel at the canvas's
// own resolution, so the face can have real features: draw it with the camera at scale 1. One letter per pixel,
// PALETTE says what each one is, and '.' is see-through.

import { layer, blit, fill } from './pixel.js';

const PALETTE = {
  k: '#0b0d17', // outline
  S: '#f8d9b8', // skin, lit
  s: '#eabf91', // skin
  d: '#d29a6c', // skin, shade
  D: '#a96d47', // skin, deep shade
  g: '#15171e', // hair
  h: '#262a38', // hair, mid
  H: '#333a50', // hair, highlight
  G: '#4b5574', // hair, shine
  L: '#7a4a36', // lash tips
  E: '#4a2a1a', // iris
  w: '#e4dbd2', // white of the eye
  M: '#8f4636', // mouth
  m: '#c97b68', // lip
  R: '#ff6a55', // shirt, lit
  r: '#d3212f', // shirt
  q: '#a1172a', // shirt, shade
  Q: '#6b0f1b', // shirt, fold
  W: '#fff4ee', // shirt print
  J: '#6b80b8', // jeans, lit
  j: '#4a5b92', // jeans
  n: '#34416e', // jeans, shade
  N: '#222b4d', // jeans, pocket
  O: '#f4f6fb', // sneaker
  o: '#b9c0d4', // sneaker, shade
  p: '#7882a3', // sole, marker cord
  P: '#4b5269', // sole edge
  B: '#f6f8fc', // whiteboard
  f: '#aab2c8', // board frame
  F: '#6b7391', // board frame, shade
  c: '#3f4761', // clip
  C: '#c4cbe0', // clip, shine
  i: '#b5bdd0', // printed field lines
  x: '#2b3040', // black marker
  u: '#1d55e8', // blue marker
  U: '#4a90ff', // blue, shine
  y: '#e0333f', // red marker
  K: '#eef1f8', // marker barrel
};

// Standing on the bottom row; column FOOT_X is the middle of the body.
const BODY = [
  '..............kkkkkkkk........................',
  '............kkhHhgghhgkk......................',
  '...........khHGhhgghHhggk.....................',
  '..........kgHhhHgghhhHgggk....................',
  '..........kghhHhgssghhHggk....................',
  '..........kgHhgsSsssghhHgk....................',
  '..........kgHgsSssssdghhgk....................',
  '..........kghgssssssddghgk....................',
  '..........kggshggssgghsggk....................',
  '..........kgsssssssssssdgk....................',
  '..........kgsLgEgssgEgLsgk....................',
  '..........kssswEwsswEwssdk....................',
  '..........kdSsssssdssssdsk....................',
  '..........ksssssdsDdssssdk....................',
  '...........ksssdsdssdssdk.....................',
  '............ksssMMMMssdk......................',
  '.............ksssmmssdk.......................',
  '..............kSssssdk........................',
  '..............kddddDDk........................',
  '..............ksssddDk........................',
  '..............ksssddDk........................',
  '..............ksssddDk........................',
  '..........kkkRqdsssddqqkkk....................',
  '........kkRRrrrqqqqqqrrqqqkk..................',
  '.......kRRrrrrrrrrrrrrrrrqqqk.................',
  '......kRRrrrrrrrrrrrrrrrrrqqqk................',
  '.....kRRrrrrrrrrrrrrrrrrrrrqqqk...............',
  '....kRRrrrWWWrWWWrWWWrWWWrrrqqqk..............',
  '....kRRrrrWrrrWrWrrrWrWrrrrrqqqk..............',
  '....kRRrrQWWWrWrWrWWWrWWWrQrqqqk..............',
  '....kRRrrQrrWrWrWrWrrrWrWrQrqqqk..............',
  '....kRRrrQWWWrWWWrWWWrWWWrQrqqqk..............',
  '....kkkkkqrrrrrrrrrrrrrrrrQkkkkk..............',
  '....kSssdkRRrrrrrrrrrrrrqqksssdk..............',
  '....kSssdkRRrrrrrrrrrrrrqqksssdk..............',
  '...kSssdkRRrrrrrrrrrrrrrqqksssdk..............',
  '...kSssdkRRrrrrrrrrrrrrrqqksssdk..............',
  '..kSssdkkRRrrrrrrrrrrrqrqqksssdk..............',
  '..kSssdkkRRrrrrrrrrrrqrrqqksssdk..............',
  '..kSssdkkRRrrrrrrrrrqrrrqqksssdk..............',
  '...kSssdkRRrrrrrrrrqrrrrqqkssdk...............',
  '...kSssdkRRrrrrrrrrrrrrrqqkssdk...............',
  '....kSssdkRRrrrrrrrrrrrrqqkssdk...............',
  '.....kSssdkRrrrrrqrrrrrrqqkssdk...............',
  '......kSssdkRrrrqrrrrrrrqqkssdk...............',
  '.......kSssdkRrqrrrrrrrrqqkssdk...............',
  '........kSssdkRrrrrrrrrrqqkssdk...............',
  '........kkSsdkqrqqrqqrqqrqkssdk...............',
  '.........kSssdkkkkkkkkkkkkkssdk...............',
  '........kJNNNNjjjnjjjjjnjnkssdk...............',
  '........kJjjjnjjjnnjjjjjnnksssdk..kkkk........',
  '........kJjjjjjjnnkjjjjjjkSssssdkkCCCck.......',
  '........kJjjjjjjnnkjjkkkkksdsdsdkkcccckkk.....',
  '........kJjjjjjjnnkjkffffksssssskkcccckffk....',
  '........kJjjjjjjnnkjkfBBBBkdddddk.kkkk.BFk....',
  '........kJjjjjjjnnkjkfBBBBBkkkkkkBBBBBBBFk....',
  '.........kJjjjjjnnkjkfBiiiiiiiiiiiiiiiiBFk....',
  '.........kJjjjjjnnkjkfBiBBBxBBuBBBxBBBiBFk....',
  '.........kJjjjjjnnkjkfBiuBuuuuuuBBBBByiBFk....',
  '.........kJjjjjjnnkjkfBiuuuBBxxxxBBBByiBFk....',
  '.........kJjjjjjnnkjkfBiuuBBBxBBxBBByyiBFk....',
  '..........kJjjjnnkkjkfBiuuBBBxxxxyByByiBFk....',
  '..........kJnjjnnkkjkfBiuBBBBBBBBByBByiBFk....',
  '..........kJjnnnnkkjkfBiBBBxBBBBByByBBiBFk....',
  '..........kJjjjnnkkjkfBiiiiiiiiiiiiiiiiBFk....',
  '..........kJjjjnnk.kkfBBBBBBBBBBBBBBBBBBFk....',
  '..........kJjjjnnk.kkfFFFFFFFFFFFFFFFFFFFk....',
  '..........kJjjjnnk.kjkkkkkkkkkkkkkkkkkkkk.....',
  '..........kJjjjnnk.kjjjjnnk...................',
  '..........kJjjjnnk.kjjjjnnk...................',
  '..........kJjjjnnk..knjjjnnk..................',
  '..........kJjjjnnk..kjnjjnnk..................',
  '..........kJjjjnnk..kjjjjnnk..................',
  '..........kJjjjnnk..kjjjjnnk..................',
  '..........kJjjjnnk..kjjjjnnk..................',
  '..........kJjjjnnk..kjjjjnnk..................',
  '..........kJjjjnnk...kjjjjnnk.................',
  '..........kJjjjnnk...kjjjjnnk.................',
  '..........kJjjjnnk...kjnjjnnk.................',
  '..........kJnjnnnk...kjjnjnnk.................',
  '..........kJjnjnnk...kjjjnnnk.................',
  '..........kJjjjnnk...kjjjjnnk.................',
  '..........kkkkkkkk...kkkkkkkk.................',
  '.........kOOoOoook...kOOoOookk................',
  '........kOOOOOOook...kOOOOOOook...............',
  '.......kOOOOOOOOook..kOOOOOOOook..............',
  '.......kPppppppppPk..kPpppppppPk..............',
  '........kkkkkkkkkk....kkkkkkkkk...............',
];

// Hair styles drawn over BODY: [mode, x, y, rows]. 'over' replaces pixels, 'under' only fills see-through ones (hair
// behind the head). '.' leaves a pixel alone.
const STYLES = {
  // Curtain bangs: the centre part, drawn into BODY.
  curtain: [],
  // Short at the sides, the fringe swept across the forehead from a side part.
  swept: [
    ['over', 8, 0, [
      '.......kkkkkkk......',
      '.....kkhHHhhhhkk....',
      '...kkhHGHHhhhhhgk...',
      '..kghHHhhhHhhhhggk..',
      '..kgghhhHhhhhHhggk..',
      '..kgsShhhhhHhhhggk..',
      '..kgssShghhhhHhggk..',
      '..kgsssssdghhhgggk..',
      '..kggshggssgghhggk..',
    ]],
  ],
  // Swept fringe, the rest tied back (as the pit safety rules want); the tail shows behind the head.
  ponytail: [
    ['over', 8, 0, [
      '.......kkkkkkk......',
      '.....kkhHHhhhhkk....',
      '...kkhHGHHhhhhhgk...',
      '..kghHHhhhHhhhhggk..',
      '..kgghhhHhhhhHhggk..',
      '..kgsShhhhhHhhhggk..',
      '..kgssShghhhhHhggk..',
      '..kgsssssdghhhgggk..',
      '..kggshggssgghhggk..',
    ]],
    ['over', 8, 0, [
      '......kkkkkkk.......',
      '....kkhHHhhhhkk.....',
      '...khHGHhhhhhhgk....',
    ]],
    ['under', 23, 1, [
      '..kkk..',
      '.kuuHk.',
      '.kUuhgk',
      '..khHgk',
      '..kgHgk',
      '..kghgk',
      '..kghgk',
      '..kgHgk',
      '..kghgk',
      '..kgggk',
      '..kgHgk',
      '..kghgk',
      '...kgk.',
      '...kgk.',
      '....k..',
    ]],
  ],
};

// The marker and its cord, swinging under the board's corner.
const MARKER = [
  '.kk.',
  'kUuk',
  'kuuk',
  'kkkk',
  'kKok',
  'kKok',
  'kKok',
  'kKok',
  '.kk.',
];

export const HAIRSTYLES = Object.keys(STYLES);
// One see-through row on top, so breathing in can lift the head and shoulders a pixel.
export const HERO_W = 46, HERO_H = 89;
const FOOT_X = 18;
// Breathing stretches the sprite at this row: the middle of the shirt, where every column runs straight down.
const BREATH_ROW = 33;

function stamp(grid, x0, y0, lines, under = false) {
  lines.forEach((line, dy) => {
    [...line].forEach((ch, dx) => {
      const row = grid[y0 + dy];
      if (ch === '.' || (under && row[x0 + dx] !== '.')) return;
      row[x0 + dx] = ch;
    });
  });
}

function pixels(hair, breath, blink, sway) {
  const grid = BODY.map((row) => [...row]);
  for (const [mode, x, y, lines] of STYLES[hair]) stamp(grid, x, y, lines, mode === 'under');
  if (blink) stamp(grid, 13, 10, ['sddd..ddds', 'Lggg..gggL']);
  grid[68][40] = 'p';
  grid[69][40 + sway] = 'p';
  stamp(grid, 39 + sway, 70, MARKER);
  const blank = Array(HERO_W).fill('.');
  return breath ? [...grid.slice(0, BREATH_ROW + 1), grid[BREATH_ROW], ...grid.slice(BREATH_ROW + 1)] : [blank, ...grid];
}

const cache = new Map();
/**
 * The hero as an offscreen layer, cached per look.
 * o: hair (one of HAIRSTYLES, default 'curtain'), breath (1: breathing in), blink, sway (-1, 0 or 1: the marker).
 */
export function heroLayer(o = {}) {
  const hair = STYLES[o.hair] ? o.hair : 'curtain', breath = o.breath ? 1 : 0, blink = !!o.blink;
  const sway = Math.max(-1, Math.min(1, Math.round(o.sway ?? 0)));
  const key = `${hair} ${breath} ${blink} ${sway}`;
  if (!cache.has(key)) {
    const grid = pixels(hair, breath, blink, sway);
    cache.set(key, layer(HERO_W, HERO_H, () => {
      grid.forEach((row, y) => {
        // One rectangle per run of the same colour.
        for (let x = 0; x < HERO_W; ) {
          let end = x + 1;
          while (end < HERO_W && row[end] === row[x]) end++;
          if (row[x] !== '.') fill(x, y, end - x, 1, PALETTE[row[x]]);
          x = end;
        }
      });
    }));
  }
  return cache.get(key);
}

/** The idle loop at t seconds: a breath every 3.6 s, a blink now and then, the marker swinging on its cord. */
export function heroIdle(t) {
  const swing = Math.sin(t * 2.1);
  return { breath: t % 3.6 < 1.5 ? 1 : 0, blink: t % 4.7 > 4.55 || t % 11.3 > 11.15, sway: swing > 0.55 ? 1 : swing < -0.55 ? -1 : 0 };
}

/** Draw the hero standing on (x, y): x is the middle of the body, y the floor. o as for heroLayer. */
export function drawHero(x, y, o = {}) {
  blit(heroLayer(o), x - FOOT_X, y - HERO_H);
}
