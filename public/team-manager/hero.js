// The main character at full height: a high-school drive coach, an Asian girl laughing with her whole face (eyes
// shut, cheeks up, a wide open grin), long wavy side-parted hair, the team's red 5026 shirt tucked into high-waisted
// jeans, rolled cuffs over mismatched socks and canvas sneakers. She stands three-quarters on with her weight on one
// leg, a hand on that hip and the other shoulder up. The drive team's whiteboard hangs from her other hand, tilted
// away from her side and wiped clean, the marker swinging under it on a cord.
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
  g: '#241913', // hair
  h: '#3a271d', // hair, strands
  H: '#5e3f2b', // hair, lit strands
  G: '#8c6040', // hair, caramel
  A: '#b08055', // hair, caramel ends
  e: '#ee9f8c', // blush
  M: '#9a4040', // mouth
  m: '#d0807a', // tongue
  T: '#f6f1ea', // teeth
  Y: '#ffc61a', // sock
  Z: '#c48a0a', // sock, shade
  R: '#ff6a55', // shirt, lit
  r: '#d3212f', // shirt
  q: '#a1172a', // shirt, shade
  Q: '#6b0f1b', // shirt, fold
  W: '#fff4ee', // shirt print
  J: '#6b80b8', // jeans, lit
  j: '#4a5b92', // jeans
  n: '#34416e', // jeans, shade
  N: '#222b4d', // jeans, under the hem
  C: '#c4cbe0', // button, clip shine
  U: '#4a90ff', // other sock
  u: '#1d55e8', // other sock, stripe; marker cap
  O: '#f4f6fb', // sneaker
  o: '#b9c0d4', // sneaker, shade
  p: '#7882a3', // sole, marker cord
  P: '#4b5269', // sole edge
  B: '#e3e7f0', // whiteboard
  b: '#c9d0de', // whiteboard, shade
  f: '#9aa3bd', // board frame
  F: '#5d6580', // board frame, shade
  c: '#3f4761', // clip
  K: '#eef1f8', // marker barrel
};

// Standing on the bottom row; column FOOT_X is under the middle of her body.
const BODY = [
  '...........kkgghgggghgkk................',
  '..........kgHHggghgggghgk...............',
  '.........kgHHgggggghgggghk..............',
  '........kgHHgHgghgggghggggk.............',
  '.......kggHhkkkkgghgggghggk.............',
  '.......kgHhgkssskggghgggghgk............',
  '......kgHhggksssskgggghggggk............',
  '......kgHhggkshghskkkkHggHHk............',
  '......kgHHggkssssssssskHggHk............',
  '......kggHhgkssggssssgskhggHk...........',
  '.....kHhggHhksgssgsdgsgkggHHk...........',
  '.....kgHhggHkSSSsssdsSskggHhgk..........',
  '.....kgHhggHkeesssdDsedkgHhggk..........',
  '.....kHhggHhksdMMMMMMdkgHhggHk..........',
  '.....khggHhgksdMTTTTMskgHhggHhk.........',
  '....kHggHHggkssSMmmMskhggHhggHk.........',
  '....kHggHHggHksssSsskHHggHHggHk.........',
  '....kHggHHggHHksssddkgHHggHHggHk........',
  '....kHHggHHggkddddDkhggHhggHhggk........',
  '...kggHHggHHgksssdDkggHHggHHggHk........',
  '...kHggHHggHHksssdDkggHhggHhggHk........',
  '...kHggGHggGkqssssqqkkkkkkkkkkkgk.......',
  '...kggGHggGHkrqqqqrrrrrrqqkgHhggk.......',
  '..kggGHggGHkrrrrrrrrrrrrrqqkHhggk.......',
  '..kgGHggGHkWWrWWWrWWWrWWWrqqkHhggk......',
  '..kgGHggGkWrrrWrWrrrWrWrQrqqkHHggk......',
  '.kggGGggGkWWWrWrWrWWWrWWWrqqkgGGgk......',
  '.kHggGHggkrrWrWrWrWrrrWrWrqqkggGk.......',
  '.kAGggAGgkWWWrWWWrWWWrWWWrqqkgGGk.......',
  '..kAGggAGkrrrrrrrrrrrrrqqkkkkgGhgk......',
  '..kAGggAGgkrrrrrrrrrrrrqqksdkGhggk......',
  '.kAGggAGgkRrrrrrrrrrrrrqqksdkhggk.......',
  '.kGggAGggkRrrrrrrrrrrrrqqksdkhggk.......',
  '..kgAGggAkRRrrrrrrrrrrqqkssdkGhk........',
  '..kgAGggkkRRrrrrrrrrrrqqkssdkGGk........',
  '.kSkAAgk.kRRrrrrrrrrrqqkkssdkkk.........',
  '.kSskkk..kRRrrrrrrrrrqqkkssdk...........',
  '.kSsssdk.kRRrrrrrrrrrqqkkssdk...........',
  '..kSsssdkkRrrqrrqrqrrqqkkssdk...........',
  '...kSsssdkRrqQnnCnnQrqqkkssdk...........',
  '....kSsssdkrQJjjnjjjQrqkkssdk...........',
  '.....kSsssdkJjjjnjjjQqqkkssdk...........',
  '......kSssdkjjjjnjjjjNNnkssdk...........',
  '......kkkkkJjjnjnjjjjjnnkssdkkkkk.......',
  '......kJjjjjjjjjjjjjjjnnksssdkCck.......',
  '.......kJjjjjjjjjjjjjjnnkSsdskkkkkk.....',
  '.......kJjjjjjjjnnjjjjnnkkdkdkfffFk.....',
  '.......kJjjjjjjnnkjjjjnnk.kfBBBbbFk.....',
  '.......kJjjjjjjnnkjjjjnnk.kfBBBbbFk.....',
  '........kJjjjjjnnkjjjjnnk..kfBBBbbFk....',
  '........kJjjjjjnnkjjjjnnk..kfBBBbbFk....',
  '........kJjjjjjnnkjjjjnnk..kfBBBbbFk....',
  '.........kJjjjjnnkjjjjnnk..kfBBBbbFk....',
  '.........kJjjjjnnkjjjjnnk...kfBBBbbFk...',
  '.........kJjjjjnnkjjjjnnk...kfBBBbbFk...',
  '.........kJjjjjnnkjjjjnnk...kFFFFFFFk...',
  '..........kJjjjnnkjjjjnnk...kkkkkkkkk...',
  '..........kJjjjnnkjjjjnnk...............',
  '..........kJjjjnnkkjjjnnk...............',
  '..........kJjjjnnkkjjjnnk...............',
  '..........kJjjjnnkkjjjnnk...............',
  '...........kJjjnnkkjjjnnk...............',
  '...........kJjjnnk.kjjjnnk..............',
  '...........kJjjnnk.kjjjnnk..............',
  '...........kJjjnnk.kjjjnnk..............',
  '...........kJjjnnk.kjjjnnk..............',
  '...........kJjjnnk..kjjjnnk.............',
  '...........kJjjnnk..kjjjnnk.............',
  '...........kJjjnnk..kjjjnnk.............',
  '...........kJjjnnk..kjjjnnk.............',
  '...........kJjjnnk...kjjnnk.............',
  '...........kJjjnnk...kjjnnk.............',
  '...........kJjjnnk...kjjnnk.............',
  '...........kkkkkkk...kkkkkk.............',
  '..........kJJJJJJJk.kJJJJJJk............',
  '..........knnnnnnnk.knnnnnnk............',
  '............kYYYZk...kUUUUk.............',
  '............kYYYZk...kuuuuk.............',
  '...........kOoOoOOk.kOoOoOOk............',
  '...........kOOoOoOOkkOOoOoOOk...........',
  '..........koOOOOOOOokoOOOOOOOok.........',
  '..........kPpppppppPkPpppppppPk.........',
  '...........kkkkkkkkk.kkkkkkkkk..........',
];

// The marker and its cord, hanging from the board's bottom corner.
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

// One see-through row on top, so breathing in can lift her head and shoulders a pixel.
export const HERO_W = 40, HERO_H = 84;
const FOOT_X = 17;
// Breathing stretches the sprite at this row: the middle of the shirt, where every column runs straight down.
const BREATH_ROW = 31;

function stamp(grid, x0, y0, lines) {
  lines.forEach((line, dy) => {
    [...line].forEach((ch, dx) => {
      if (ch !== '.') grid[y0 + dy][x0 + dx] = ch;
    });
  });
}

function pixels(breath, sway) {
  const grid = BODY.map((row) => [...row]);
  grid[57][35] = 'p';
  grid[58][35 + sway] = 'p';
  stamp(grid, 34 + sway, 59, MARKER);
  const blank = Array(HERO_W).fill('.');
  return breath ? [...grid.slice(0, BREATH_ROW + 1), grid[BREATH_ROW], ...grid.slice(BREATH_ROW + 1)] : [blank, ...grid];
}

const cache = new Map();
/** The hero as an offscreen layer, cached per pose. o: breath (1: breathing in), sway (-1, 0 or 1: the marker). */
export function heroLayer(o = {}) {
  const breath = o.breath ? 1 : 0;
  const sway = Math.max(-1, Math.min(1, Math.round(o.sway ?? 0)));
  const key = `${breath} ${sway}`;
  if (!cache.has(key)) {
    const grid = pixels(breath, sway);
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

/** The idle loop at t seconds: a breath every 3.6 s and the marker swinging on its cord. */
export function heroIdle(t) {
  const swing = Math.sin(t * 2.1);
  return { breath: t % 3.6 < 1.5 ? 1 : 0, sway: swing > 0.55 ? 1 : swing < -0.55 ? -1 : 0 };
}

/** Draw the hero standing on (x, y): x is the middle of her body, y the floor. o as for heroLayer. */
export function drawHero(x, y, o = {}) {
  blit(heroLayer(o), x - FOOT_X, y - HERO_H);
}
