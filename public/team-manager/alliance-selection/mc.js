// MC Robin, who runs alliance selection: the arena's emcee, on inline skates. Robin is drawn like everyone else in
// Blue Banner, on the walker's rig (walker.js) with a hand-drawn head, so she belongs to the same cast as the
// strategist and the crowd; what sets her apart reads from across the field at 48 pixels tall:
//   - a hot-pink blazer, the only magenta in the arena (no team wears it), long sleeves with white shirt cuffs, open
//     over a black tee, with a gold bow tie at the collar;
//   - dark shades with a glint, short black curls and a grin (the cast's size: a few teeth and a lip under them);
//   - white inline skates on steel frames with yellow wheels, so she stands a few pixels taller than anyone on foot;
//   - a handheld mic in her right hand, black with a steel head.
// Her heads are drawn for five directions (from the front, three-quarters, the side, three-quarters behind and
// behind) and mirrored for the other three, in the cast's letters: k ink, g/h/H hair (dark, mid, lit), s/S/d skin
// (mid, lit, shade), e blush, M/T/m mouth, teeth and lip, and two of her own: o the shades' lenses and O their glint.
//
// Skating she glides: one skate pushes out to the side and back while the other glides under her on a bent knee, then
// they swap, her arms swinging wide (walker.js's 'skate' gait). Stopped she strikes a pose: 'flair' (a skate out to the
// side, the free arm flung up), 'emcee' (mic to her mouth, the free arm out) or 'offer' (the mic held out to someone).
//   MC_LOOK                    her look, for drawWalker or drawPerson
//   drawSkater(g, view, p)     her (or p.look) on the floor with a shadow; p = { x, y, dir, gait, dist, look }
//   SKATE_STRIDE               pixels she rolls per frame of the glide, so the pushes keep pace with the floor
//   spinDir(u, turns, end)     which way she faces u of the way through a spin that ends facing `end`
// stage.js steps a walk or a run with the distance covered (its STRIDE) but knows nothing of skating, so drawPerson
// would hold her glide on one frame: draw her with drawSkater, which steps it with SKATE_STRIDE instead.

import { C } from '../pixel.js';
import { HERO_LOOK, leftFacing, drawWalker } from '../walker.js';
import { BASE, SKIN, HAIR, tones } from '../cast.js';

// Facing you: the curls cut short over the ears, the shades across her eyes and a grin the size of everyone else's
// smile in the cast (cast.js): five pixels of mouth with three teeth, one pixel of lip under it.
const HEADS = {
  s: [
    '...kk.kkkk.kk...',
    '..khHkhHHhkhhk..',
    '.khHHhgHhhghHhk.',
    'khHhhHhhhHhhghgk',
    'kghhghhhghhhhhgk',
    'kghhsSSssssshhgk',
    'kghSsssssssssdgk',
    'kgsoOookkoOoosgk',
    'ksSsooossooossdk',
    'kdsssssdssssssdk',
    '.kssssmMMmsssdk.',
    '..ksssssssssdk..',
    '...ksssssdddk...',
    '....kkkkkkkk....',
  ],
  se: [
    '...kk.kkkk.kk...',
    '..khHkhHHhkhhk..',
    '.khHHhgHhhghHhk.',
    'khHhhHhhhHhhhhk.',
    'kghhghhhghhhhhgk',
    'kghhhhsSssssshgk',
    'kghhhSssssssssk.',
    'kghskkoOookoOok.',
    'kgsdsSsooosoook.',
    '.kddsssssssdsssk',
    '..kssssssmMMmsk.',
    '...kssssssssdk..',
    '....kkssssssdk..',
    '......kkkkkkk...',
  ],
  e: [
    '...kk.kkk.k.....',
    '..khHkhHHkhk....',
    '.khHHhgHhhHhk...',
    'khHhhHhhhhhhhk..',
    'kghhghhhhghhhhk.',
    'kghhhhhhhhhhsSk.',
    'kghhhhhhhhssssk.',
    'kghhkkkkkkkkoOk.',
    'kghhksdsssssook.',
    'kghhkdsssssssssk',
    '.kghksssssssmmk.',
    '.kgghksssssssk..',
    '..kkk.kssssddk..',
    '.......kkkkkk...',
  ],
  ne: [
    '...kk.kkkk.kk...',
    '..khHkhHHhkhhk..',
    '.khHHhgHhhghHhk.',
    'khHhhHhhhHhhghgk',
    'kghhghhhghhhhhgk',
    'kghhhhhhhhhhhhgk',
    'kghhhghhhhhghhgk',
    'kghhhhhhhhhhhkok',
    'kghhhhhhhhhhksdk',
    'kghhhhhhhhhhkdsk',
    '.kghhhhhhhhhksk.',
    '..kgghhhhhhgkdk.',
    '...kkkdddddkk...',
    '.....kkkkkk.....',
  ],
  n: [
    '...kk.kkkk.kk...',
    '..khHkhHHhkhhk..',
    '.khHHhgHhhghHhk.',
    'khHhhHhhhHhhghgk',
    'kghhghhhghhhhhgk',
    'kghhhhhhhhhhhhgk',
    'kghhhghhhhhghhgk',
    'kghhhhhhhhhhhhgk',
    'ksghhhhhhhhhhgdk',
    'kdghhhhhhhhhhgdk',
    '.kghhhhhhhhhhgk.',
    '..kgghhhhhhggk..',
    '....kkddddkk....',
    '......kkkk......',
  ],
};
HEADS.sw = leftFacing(HEADS.se);
HEADS.w = leftFacing(HEADS.e);
HEADS.nw = leftFacing(HEADS.ne);

const HEAD_PAL = { ...BASE, ...SKIN.brown, ...HAIR.black, o: '#141519', O: '#ffffff' };

const WHITE = ['#b9c0d4', '#e8ecf5', '#ffffff'];
/**
 * Her slacks: navy, a value step lighter than cast.js's hoodie ramp, its lit tone about the reps' blue jeans' mid, its
 * shade well clear of the ink, so her legs stand off the dark concrete and the ink line between them shows on every
 * frame of the glide.
 */
const SLACKS = ['#232b4c', '#36406a', '#525e8f'];
/** Robin's look: the blazer is the rig's shirt, its cuffs the hem, the slacks its jeans. */
export const MC_LOOK = {
  id: 'mc', board: false, sleeves: 'long', skates: true, mic: true,
  pal: {
    ...HERO_LOOK.pal,
    skin: [SKIN.brown.d, SKIN.brown.s, SKIN.brown.S],
    shirt: ['#7a1452', '#c41f7f', '#ff5cb8'],
    hem: WHITE,
    jeans: SLACKS,
    cuff: SLACKS,
    boot: WHITE,
    frame: ['#3f4761', '#7882a3', '#c4cbe0'],
    wheel: [C.yel0, C.yel1, C.yel2],
    mic: tones.black,
    micHead: ['#7882a3', '#c4cbe0', '#ffffff'],
    print: null,
  },
  heads: HEADS,
  headPal: HEAD_PAL,
  // Down the open front of the blazer, the black tee; at the collar, the gold bow tie.
  badge: [
    [-1, -3, 3, 8, tones.black[1]],
    [-2, -3, 1, 3, C.yel1], [2, -3, 1, 3, C.yel1], [-1, -2, 3, 1, C.yel1], [0, -2, 1, 1, C.yel0],
  ],
};

/** Pixels she rolls for each frame of the glide: eight frames make two pushes, one every half second at 80 a second. */
export const SKATE_STRIDE = 10;

/**
 * Robin (or whoever p.look is) on the floor at (p.x, p.y) seen from view, with the soft shadow everyone standing has
 * (as stage.js drawWithShadow). Gliding, her pushes step with the distance she's rolled (p.dist), the way stage.js
 * steps a walk; stopped, p.gait is her pose. Snapped to whole pixels.
 */
export function drawSkater(g, view, p) {
  const x = Math.round(p.x - view.x), y = Math.round(p.y - view.y);
  g.fillStyle = 'rgba(5, 6, 13, 0.45)';
  g.fillRect(x - 6, y - 1, 12, 3);
  g.fillRect(x - 4, y - 2, 8, 5);
  const gait = p.gait ?? 'stand';
  drawWalker(g, x, y, p.dir ?? 0, gait, gait === 'skate' ? Math.floor((p.dist ?? 0) / SKATE_STRIDE) : 0, p.look ?? MC_LOOK);
}

/**
 * A spin on the spot: the direction (0-7, clockwise from facing you) u of the way through it (0 to 1), turning
 * clockwise `turns` times and slowing into the last turn, to end facing `end`.
 */
export function spinDir(u, turns = 2, end = 0) {
  const k = 1 - (1 - Math.min(1, Math.max(0, u))) ** 2;
  return (((end + Math.floor(k * turns * 8)) % 8) + 8) % 8;
}
