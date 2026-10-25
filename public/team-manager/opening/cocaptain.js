// Riley, 5026's co-captain: a senior, the team's rep at alliance selection, and the one who hands the strategist the
// pick list (and Norbert) in the opening. A new character on the walker's rig (walker.js), built the cast's way
// (cast.js look()): the team's red pullover hoodie with the panther badge (cast.js MERCH, as every 5026 student wears),
// black jeans, and a head drawn here so Riley reads apart from the strategist, the teammate and every rep at a glance,
// even at 1x across the field: a tall curly top over short sides, held back by a white sweatband.
//
// The head is in the cast's letters (cast.js): k ink, g/h/H hair (dark, mid, lit), s/S/d skin (mid, lit, shade), e
// blush, E iris, M/T/m mouth, teeth and lip, and c/C/D (a cap's letters) for the sweatband: mid, lit and shade. From the
// front it's the cast's face (the cap head's, whose features sit lowest), with the curls standing up off the band; in
// profile, the curls run back over the crown; from behind, the curls and the band all round.
//
//   COCAPTAIN_LOOK    the look, for drawWalker or drawPerson
//   COCAPTAIN_NAME    the dialog box's name tag

import { HERO_LOOK, leftFacing } from '../walker.js';
import { BASE, SKIN, HAIR, MERCH, tones, skinBody } from '../cast.js';
import { TEAMMATE_LOOK } from '../teammate.js';

export const COCAPTAIN_NAME = 'RILEY, CO-CAPTAIN';

const FRONT = [
  '..kk.kkkk.kk....',
  '.khHkhHHhkhHk...',
  'khHhhHhhhHhhhk..',
  'khhhhhhhhhhhhgk.',
  '.kCCCCcccccccDk.',
  '.kDDDDDDDDDDDDk.',
  '..khsssssssshk..',
  '..khsssssssshk..',
  '..kssEsssEssdk..',
  '.kdssEsssEsssdk.',
  '..kssssdsssdk...',
  '..kssssmmsssdk..',
  '...ksssssssk....',
  '....kkssssk.....',
  '......kkkk......',
];
const SIDE = [
  '..kk.kkkk.k.....',
  '.khHkhHHhkhk....',
  'khHhhhHhhhhhk...',
  'khhhhhhhhhhhhk..',
  '.kCCCCCCcccccDk.',
  '.kDDDDDDDDDDDDk.',
  '.kghhhhhssssssk.',
  '.kghhhkssssEssk.',
  '.kghhkdssssEssk.',
  '.kghhksssssssdk.',
  '..kghkssssssssk.',
  '...kghkssssmsk..',
  '....kkksssssk...',
  '......ksssdk....',
  '.......kkkk.....',
];
const BACK = [
  '..kk.kkkk.kk....',
  '.khHkhHHhkhHk...',
  'khHhhHhhhHhhhk..',
  'khhhhhhhhhhhhgk.',
  '.kCCCCcccccccDk.',
  '.kDDDDDDDDDDDDk.',
  '..kghhhhhhhhgk..',
  '..kghhhhhhhhgk..',
  '..kgghhhhhhggk..',
  '...kgghhhhggk...',
  '...kddddddddk...',
  '...kssssssssk...',
  '....ksssssdk....',
  '.....kkkkkk.....',
  '................',
];
for (const rows of [FRONT, SIDE, BACK]) {
  if (rows.length !== 15 || rows.some((r) => r.length !== 16)) throw new Error('cocaptain.js: a head is the wrong size');
}

/** The sweatband: white, shaded steel-blue like the arena's whites. */
const BAND = { c: '#e8ecf5', C: '#ffffff', D: '#9aa3bd' };

export const COCAPTAIN_LOOK = {
  id: 'cocaptain', board: false, hoodie: true, sleeves: 'long',
  pal: {
    ...HERO_LOOK.pal, ...skinBody('deep'), ...MERCH.hoodie,
    jeans: tones.black, cuff: tones.black,
    sockL: tones.shirtWhite, sockR: tones.shirtWhite,
  },
  heads: { s: FRONT, se: FRONT, sw: leftFacing(FRONT), e: SIDE, w: leftFacing(SIDE), ne: BACK, n: BACK, nw: leftFacing(BACK) },
  headPal: { ...BASE, ...SKIN.deep, ...HAIR.black, ...BAND },
  // The panther badge and 5026 on the chest, as on every 5026 hoodie (teammate.js).
  badge: TEAMMATE_LOOK.badge,
};
