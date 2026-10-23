// The cast: how the people in Blue Banner are put together. Everyone but the strategist and the teammate is drawn on
// the walker's rig (walker.js) in a look made here: body colours, one of a few hand-drawn heads (from the front, in
// profile and from behind) and the head's skin and hair colours. Scenes make their people from these, so a better head
// or a new shirt shows up everywhere at once.
//   look(id, body, head, headPal)   anyone: see below
//   stranger(i, shirt)              someone from the crowd, the i-th of a rotation of faces, skins and hair
//   student(i, merch)               a 5026 student in team merch ('tee' or 'hoodie'), from the same rotation
// Head templates are 16 columns wide, one letter per pixel: k ink, g/h/H hair (dark, mid, lit), s/S/d skin (mid, lit,
// shade), e blush, E iris, w white of the eye, M/T/m mouth, teeth, lip, q glasses, c/C/D a cap (mid, lit, brim),
// r/R a streak of colour in the hair. '.' is see-through.

import { C } from './pixel.js';
import { HERO_LOOK, leftFacing } from './walker.js';
import { TEAMMATE_LOOK } from './teammate.js';

// The two people the story follows don't have names yet; the dialog box calls them this.
export const HERO_NAME = 'STRATEGIST';
export const TEAMMATE_NAME = 'TEAMMATE';

export const BASE = { k: C.ink, E: '#3a2218', w: '#e6ddd4', M: '#8f4636', T: '#f6f1ea', m: '#c97a70' };
export const skinPal = (lo, mid, hi, blush) => ({ d: lo, s: mid, S: hi, e: blush });
export const hairPal = (g, h, H) => ({ g, h, H });
export const tones = {
  shirtRed: ['#a1172a', '#d3212f', '#ff6a55'], shirtBlue: ['#0a237a', '#1d55e8', '#4a90ff'], shirtYellow: ['#c48a0a', '#ffc61a', '#ffe07a'],
  hoodie: ['#141a2e', '#232a44', '#3a4466'], shirtGreen: ['#1d5e3a', '#2e8b57', '#5cc38a'], shirtWhite: ['#b9c0d4', '#e8ecf5', '#ffffff'],
  shirtPurple: ['#3e2a6e', '#5b3fa0', '#8a6ad0'], shirtOrange: ['#a3460a', '#ff7a1c', '#ffb46a'],
  khaki: ['#7a6a48', '#a8946a', '#c9b88e'], black: ['#141519', '#23252c', '#3a3d48'],
};

export const HEADS = {
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
export const SIDE = {
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
export const SIDE_LEFT = Object.fromEntries(Object.entries(SIDE).map(([k, rows]) => [k, leftFacing(rows)]));

export const SKIN = {
  deep: skinPal('#5a3826', '#6e4630', '#8a5a3c', '#8a4a3a'),
  brown: skinPal('#9a6440', '#b9805a', '#d39b72', '#d9826c'),
  tan: skinPal('#c48a5e', '#deab80', '#f0c8a0', '#e0907a'),
  light: skinPal('#d4936a', '#eab48a', '#f6cfa8', '#e9907c'),
  fair: skinPal('#d29a6c', '#eabf91', '#f8d9b8', '#ee9f8c'),
};
export const HAIR = {
  black: hairPal('#131216', '#211d22', '#352d31'), brown: hairPal('#24150f', '#3d2519', '#5e3a26'),
  chestnut: hairPal('#5a3418', '#7a4a24', '#9a6234'), grey: hairPal('#1a1a1e', '#3a3a40', '#6a6a72'),
  blonde: hairPal('#8a6a2a', '#c49a46', '#e6c27a'), auburn: hairPal('#4a1a12', '#7a2e1c', '#a8482a'),
};
export const skinBody = (k) => ({ skin: [SKIN[k].d, SKIN[k].s, SKIN[k].S] });

// From behind (and three-quarters behind) you see hair where the face was: the template with its face painted over.
const FACE = new Set([...'sSdeEwMTmq']);
const HAIRY = new Set([...'hHrR']);
/**
 * A head template seen from behind: the face filled with hair, a cap's brim folded into its band, and the brows (dark
 * hair, g, with hair on both sides once the face is gone) filled too, so they don't read as eyes in the back of a head.
 */
export const backOf = (rows) => rows.map((r) => {
  const out = [...r].map((ch) => (FACE.has(ch) ? 'h' : ch === 'D' ? 'c' : ch));
  for (let x = 0; x < out.length; x++) {
    if (out[x] !== 'g') continue;
    let a = x, b = x;
    while (a > 0 && out[a - 1] === 'g') a--;
    while (b < out.length - 1 && out[b + 1] === 'g') b++;
    if (HAIRY.has(out[a - 1]) && HAIRY.has(out[b + 1])) for (let i = a; i <= b; i++) out[i] = 'h';
    x = b;
  }
  return out.join('');
});
export const BACKS = Object.fromEntries(Object.entries(HEADS).map(([k, rows]) => [k, backOf(rows)]));

/**
 * A look for the walker's rig (walker.js): body colours over hers (any of HERO_LOOK.pal's keys: skin, shirt, jeans,
 * cuff, sockL, sockR, shoe, sole, print, hem...), a head template (one of HEADS' names), and the head's colours.
 * Every direction gets a head: the front template from the front and three-quarters front, the profile from the side,
 * the back of the head from behind.
 */
export function look(id, body, head, headPal) {
  const front = HEADS[head], back = BACKS[head];
  return {
    id, pal: { ...HERO_LOOK.pal, ...body }, headPal: { ...BASE, ...headPal }, board: false,
    heads: { s: front, se: front, e: SIDE[head], ne: back, n: back, nw: back, w: SIDE_LEFT[head], sw: front },
  };
}

// ---- The crowd ----
// Seven shirts and seven heads go round, so a crowd of strangers needs only a handful of different looks.
export const SHIRTS = [tones.shirtGreen, tones.shirtPurple, tones.shirtOrange, tones.shirtBlue, tones.shirtWhite, tones.shirtRed, tones.hoodie];
const FAN_HEADS = [
  ['curls', 'black'], ['bob', 'auburn'], ['cap', 'blonde'], ['bun', 'brown'], ['glasses', 'chestnut'], ['curls', 'chestnut'], ['bob', 'brown'],
];
const SKINS = Object.keys(SKIN);
export const CAPS = [['#d3212f', '#ff6a55', '#6b0f1b'], ['#2e8b57', '#5cc38a', '#1d5e3a'], ['#1d55e8', '#4a90ff', '#0a237a']];
export function stranger(i, shirt = SHIRTS[i % SHIRTS.length]) {
  const [headName, hairName] = FAN_HEADS[i % FAN_HEADS.length];
  const skinName = SKINS[(i * 3 + 1) % SKINS.length];
  const [c, Cc, D] = CAPS[i % 3];
  return look(`fan${i}-${shirt[1]}`, { ...skinBody(skinName), shirt, print: null }, headName, {
    ...SKIN[skinName], ...HAIR[hairName], q: '#aab2c8', r: HAIR[hairName].h, R: HAIR[hairName].H, c, C: Cc, D,
  });
}

// ---- Team 5026 ----
// The team's merch: the strategist's red tee with its white print, and the teammate's red pullover hoodie with the
// panther-in-a-hexagon badge and 5026 across the chest.
export const MERCH = {
  tee: { shirt: HERO_LOOK.pal.shirt, print: HERO_LOOK.pal.print },
  hoodie: { shirt: TEAMMATE_LOOK.pal.shirt, hem: TEAMMATE_LOOK.pal.hem, print: null },
};
/** A 5026 student in team merch: the i-th face from the crowd's rotation, in the red tee or the red hoodie. */
export function student(i, merch = 'tee') {
  const base = stranger(i, MERCH[merch].shirt);
  const out = { ...base, id: `5026-${merch}-${i}`, pal: { ...base.pal, ...MERCH[merch] } };
  if (merch === 'hoodie') Object.assign(out, { hoodie: true, sleeves: 'long', badge: TEAMMATE_LOOK.badge });
  return out;
}
