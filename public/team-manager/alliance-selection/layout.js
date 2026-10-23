// Where everything in the alliance selection scene stands, and who's who, so the set, the people, the cut scene and
// the scene module all agree. World pixels, as in the arena (field.js): x along the field, y down the screen. The top
// 144 rows are the arena's own (the stands, the walkway behind the far wall, the field); below the field's near wall
// the floor carries on to the bottom of the world, and that's where the team reps wait their turn. It's only as deep as
// the waiting reps need: walking about down there, the view stops 64 rows down (WORLD.h - 144), so the faces along the
// line stay in frame over her head. Past either end of the field the floor runs up beside the field to the walkway, as in
// the arena; there the view rises to keep the stands' front row whole along the top (walkView). Past the red end, below
// the audience display, is the way out: a gap in a belt barrier, as at the arena's red end (FENCE_X, GAP, EXIT).

import { W, H, clamp } from '../pixel.js';
import { WORLD_W, FIELD } from '../field.js';
import { HERO_NAME } from '../cast.js';

export const WORLD = { w: WORLD_W, h: 208 };
/** The scene's own floor starts here, at the field's near wall (FIELD.y1 is 142.25), and runs to the bottom. */
export const NEAR_TOP = 142;

// ---- On the field ----
/**
 * Eight spots across the front of the field, 1 at the blue (left) end, with room in the middle for the mic: the speaker
 * stands left of it and the MC right of it, so the right half sits a little closer together (34 apart, not 36) to keep
 * captain 5 clear of the MC's elbow.
 */
export const SPOTS = [252, 288, 324, 360, 430, 464, 498, 532];
export const LINE_Y = 120;
/**
 * Captain i (0 to 7) stands on spot i; their picks close in behind, the first on the left, the second on the right, so
 * each alliance reads as a group of three with clear floor before the next. The picks stand as far back as the cargo
 * ship allows (its floor line is 111.45), 8 rows behind their captain, so their faces show over the captain's head.
 */
export const capSpot = (i) => ({ x: SPOTS[i], y: LINE_Y });
export const pickSpot = (i, k) => ({ x: SPOTS[i] + (k === 1 ? -7 : 7), y: LINE_Y - 8 });
/**
 * Each spot's numbered sign: the floor line its post stands on, at the picks' own (it sorts in just behind them, in
 * front of the cargo ship); how far right of its captain the post stands, just clear of the captain's head (16 columns,
 * x - 8 to x + 7), so it rises beside it rather than out of their hair, and behind the second pick once they're there
 * (their head spans x - 1 to x + 14); and how far the panel reaches either side of the captain: wide enough to sit on
 * the post (like the arena's QUEUE sign, whose panel is wider than its words), the number centred over the captain.
 */
export const SIGN_Y = LINE_Y - 8;
export const SIGN_POST = 9;
export const SIGN_HALF = 11;
/**
 * The top row of the signs' panels: low enough that the picks' hair (their heads' top row is 46 above their feet) comes
 * over the panel's bottom two rows, so once the alliance is standing at it the post is hidden behind them and the panel
 * reads as held up just behind their heads, with no stick coming down into anyone's. The number stays clear above.
 */
export const SIGN_TOP = SIGN_Y - 46 - 11;
/** The microphone on its stand in the middle of the field. Whoever's speaking stands just behind it, facing you. */
export const MIC = { x: FIELD.mid, y: 128 };
export const AT_MIC = { x: FIELD.mid - 11, y: 125 };
/**
 * Where the MC waits between picks: on the stand's other side, clear of it (her outline 5 pixels from its foot), a step
 * in front of the line, turned three-quarters to the mic. Feet at 128 or less stay clear of the near wall's rail.
 */
export const MC_HOME = { x: FIELD.mid + 19, y: 127, dir: 7 };
/**
 * The open strip of field in front of the line, where the MC skates and, once it's over, she walks. It stops short of
 * the corner depots and loading stations at both ends, so she always stands in front of them.
 */
export const BAND = { x0: 194, x1: WORLD.w - 194, y0: 121, y1: 140 };
/**
 * The line itself: walkable for her once it's over, between the people standing in it, but no further back than a row
 * in front of the signs' floor line, so the panels never come down over her head (her hair comes over a panel's bottom
 * row, as the picks' does).
 */
export const LINE_AREA = { x0: 236, x1: 548, y0: SIGN_Y + 1, y1: 121 };
/**
 * Where she stands as walking starts: out in front of the line, between Alliance One and her own captain, a row in
 * front of the boxes that stop her at anyone standing on the line (set.js standing(): up to 16 rows in front of their
 * feet), so she can walk off either way at once.
 */
export const START = { x: (SPOTS[0] + SPOTS[1]) / 2, y: LINE_Y + 17, dir: 0 };

// ---- The gate ----
/** The opening in the near wall, left of the mic. Open: its chain hangs off one post. */
export const NEAR_GATE = { x0: 336, x1: 352, open: true };
/** Anyone going on or off the field passes these two points: just outside the gate, and just inside. */
export const GATE_OUT = { x: 344, y: 152 };
export const GATE_IN = { x: 344, y: 134 };

// ---- In front of the field ----
/** The reps' waiting area, left of the gate behind a taped line, with its sign. */
export const WAIT = { x0: 192, x1: 384, tapeY: 158 };
export const REPS_SIGN = { x: 160, y: 172 };
/**
 * The n-th place in the waiting crowd: 0 is the front corner by the gate (hers), then three rows of eleven. Hers stands
 * 36 pixels right of the crowd's right-hand column, so the MC passing between them has room on both sides.
 */
export function waitSlot(n) {
  if (n === 0) return { x: 392, y: 162 };
  const i = n - 1, row = Math.floor(i / 11);
  return { x: 356 - (i % 11) * 15 - (row % 2) * 7, y: 166 + row * 9 };
}
/** The queuer beside the waiting area, and the field volunteer at the gate. */
export const PRIYA_AT = { x: 186, y: 162, dir: 2 };
export const SAM_AT = { x: 364, y: 150, dir: 6 };
/** Where Sam steps aside to while the MC, coming in and going out to her, goes through the gate. */
export const SAM_ASIDE = { x: 322, y: 150, dir: 2 };
/**
 * Where Sam stands in the cut scene while the captains come out and the first picks are made: stepped back from the
 * gate into the lane between the waiting crowd and her (18 pixels from each), low enough that his head is below the
 * feet of anyone on the field. Standing by the gate, his head is on the same rows as the legs of everyone walking the
 * front of the line, so anyone passing behind him would seem to have legs coming out of it.
 */
export const SAM_LANE = { x: 374, y: 186, dir: 5 };
/** Where he goes while she runs on and her captain walks back: left of everyone's way, between sign 1 and the queuer. */
export const SAM_FAR = { x: 228, y: 150, dir: 2 };
/**
 * The head referee, on the open floor right of the gate, waiting to brief the captains once it's over: close in front
 * of the near wall, like Sam at the gate, so in the cut scene's shots along the line, with words up, he shows down to
 * the waist over the dialog box (as Sam does) rather than as a head on its top edge, and walking about, talking to
 * him, he's whole over it. He stands past the end of the line, so his head is never in front of Robin at sign 8 and
 * the line's usual shots leave him wholly in or wholly out of frame.
 */
export const REF_AT = { x: 584, y: 150, dir: 7 };
/**
 * Once it's over: where the backup teams gather round the queuer, the best-ranked four in the front row turned
 * three-quarters to you, the back row to her; the top backup, Gabe, a step out in front of the rest beside her, so he
 * can be walked straight up to and his face shows over her head. Then where 6038's rep stands alone.
 */
export const backupSpot = (k) => (k === 0
  ? { x: 200, y: 176, dir: 7 }
  : { x: 206 + (k % 4) * 16, y: 171 - Math.floor(k / 4) * 9, dir: k < 4 ? 7 : 6 });
export const DECLINED_AT = { x: 304, y: 168, dir: 4 };
/** The audience display past the red end, showing the alliances: its middle, and the floor line of its feet. */
export const BOARD = { x: 720, y: 118 };
/** The belt barrier along the bottom of the world (its floor line), and as far down as anyone walks. */
export const BARRIER_Y = 204;
export const WALK_MAX_Y = 198;

// ---- The way out ----
/**
 * She leaves on the right, the way the arena's walkabout does: past the red end the floor is roped off from the rest of
 * the hall by a belt barrier running front to back a little in from the right edge, from beside the audience display's
 * screen down to the belt barrier along the bottom, and there's a gap in it with a short chute out to the right. The
 * barrier's line, and the gap: the band of floor she walks out along. It's below the display's legs, so the EXIT sign
 * on the gap's far post stands clear of them, and as high up the floor as that allows, so on a big screen with no room
 * beside the picture the sign and the arrow stay above the stick's ring in the bottom right corner.
 */
export const FENCE_X = 764;
export const GAP = { y0: 160, y1: 182 };
/** Anywhere but the gap, her feet stop this far short of the barrier's line. */
export const FENCE_LIMIT = FENCE_X - 5;
/**
 * scene.exit: once she's at the barrier's line in the gap, out she walks through the chute (stage.js). The arrow sits
 * at the gap, a little lower than stage.js would put it, so its words run along the floor clear of the EXIT sign.
 */
export const EXIT = { x: FENCE_LIMIT - 3, y0: GAP.y0, y1: GAP.y1, label: 'ON TO WORLDS', sign: { y: 152 } };
/**
 * The floor past each end of the field, ENDS pixels wide, runs from the walkway (row 70) to the bottom; the floor in
 * front of the field joins it from FRONT_FLOOR down (above that, the corner depots stand between the two).
 */
export const ENDS = 128;
export const FRONT_FLOOR = 147;

// ---- Motion ----
/** The MC's skating speed in pixels a second (stage.js SPEED: walking 34, running 78). */
export const SKATE_SPEED = 80;

// ---- The camera, walking about ----
/**
 * On the field the view stays at least this far down: its top row is then the walkway's rail behind the far wall, just
 * below the shoes of the stands' front row (they reach row 49), not the front row cut off at the hips or the feet
 * (following her on the strip in front of the line, the view would sit 21 to 40 rows down, a strip of jeans and shoes
 * along the top). The signs' panels stay in frame and her feet stay above the dialog box (row 90 at the strip's front
 * edge).
 */
export const FIELD_VIEW = 50;
/**
 * Past either end, above the floor in front, the view comes no further down than this: the stands' front row has its
 * faces whole along the top, the way the arena frames them, the audience display's whole face is in frame (rows 16 to
 * 104, on legs to row 118), and her feet are never lower than screen row 135.
 */
export const END_VIEW = 12;
/**
 * Where the view is with her at (x, y), walking about: stage.js's own follow (half a screen left of her, 28 + 72 rows
 * above her feet, inside the world), but on the field, and in the gate down to FIELD_VIEW + 100, never above
 * FIELD_VIEW; and past either end, above FRONT_FLOOR, never below END_VIEW. At FIELD_VIEW + 100 the follow comes to
 * FIELD_VIEW by itself, so going out through the gate the view holds still while she walks down it and then follows
 * her on, with no jump; the floors either side of the field only meet the field's below that. The one jump left is
 * stepping between an end's floor and the floor in front, at FRONT_FLOOR; the scene pans the view across it (scene.js
 * camera()).
 */
export function walkView(x, y) {
  let vy = clamp(y - 28 - H / 2, 0, WORLD.h - H);
  if (x >= FIELD.x0 && x <= FIELD.x1 && y >= 110 && y < FIELD_VIEW + 28 + H / 2) vy = Math.max(vy, FIELD_VIEW);
  else if ((x <= ENDS || x >= WORLD.w - ENDS) && y < FRONT_FLOOR) vy = Math.min(vy, END_VIEW);
  return { x: Math.round(clamp(x - W / 2, 0, WORLD.w - W)), y: Math.round(vy) };
}

// ---- Who's who ----
export const MC_NAME = 'MC ROBIN';
/** Every team at the event in qualification rank order, with its student rep's first name. 5026's rep is the strategist. */
export const RANKED = [
  { num: '4000', rep: 'MAYA' }, { num: '2468', rep: 'THEO' }, { num: '3000', rep: 'LENA' }, { num: '1357', rep: 'RAFA' },
  { num: '7777', rep: 'KIT' }, { num: '6417', rep: 'NOOR' }, { num: '8086', rep: 'BEN' }, { num: '5940', rep: 'ADA' },
  { num: '9152', rep: 'IKE' }, { num: '6038', rep: 'ZOE' }, { num: '5026', rep: null }, { num: '8812', rep: 'OMAR' },
  { num: '7040', rep: 'JUN' }, { num: '6612', rep: 'BELLA' }, { num: '8248', rep: 'MILES' }, { num: '9785', rep: 'SOFIA' },
  { num: '6017', rep: 'DEV' }, { num: '7311', rep: 'HANA' }, { num: '2202', rep: 'LUCA' }, { num: '4471', rep: 'AMIR' },
  { num: '5518', rep: 'CLEO' }, { num: '8590', rep: 'NICO' }, { num: '3141', rep: 'PIA' }, { num: '6060', rep: 'REX' },
  { num: '9001', rep: 'TESS' }, { num: '4321', rep: 'GABE' }, { num: '2718', rep: 'IVY' }, { num: '1618', rep: 'OSCAR' },
  { num: '1492', rep: 'MEI' }, { num: '2048', rep: 'FINN' }, { num: '3690', rep: 'KAI' }, { num: '1776', rep: 'ELLA' },
  { num: '7007', rep: 'RUBY' },
];
export const rankOf = (num) => RANKED.findIndex((t) => t.num === num) + 1;
/** A rep's name tag in the dialog box: 'MAYA, 4000', or the strategist's. */
export const repTag = (num) => (num === '5026' ? HERO_NAME : `${RANKED.find((t) => t.num === num).rep}, ${num}`);
/** The top eight as the MC calls them out, seeds 1 to 8. */
export const FIRST_CAPTAINS = ['4000', '2468', '3000', '1357', '7777', '6417', '8086', '5940'];
/**
 * The alliances once both rounds are done: [captain, first pick, second pick]. 4000 picked 2468, a captain, so 3000 to
 * 5940 each moved up a spot and 9152, ranked ninth, became captain 8. 6038 turned down 7777 in round one.
 */
export const ALLIANCES = [
  ['4000', '2468', '9001'], ['3000', '5026', '6060'], ['1357', '8812', '3141'], ['7777', '7040', '8590'],
  ['6417', '6612', '5518'], ['8086', '8248', '4471'], ['5940', '9785', '2202'], ['9152', '6017', '7311'],
];
/** Turned down an invitation: nobody else may pick them, and they can't be a backup. */
export const DECLINED = ['6038'];
/** The backup pool: the eight best-ranked teams left that didn't decline, called in by rank. */
export const BACKUPS = ['4321', '2718', '1618', '1492', '2048', '3690', '1776', '7007'];
/** Who stands where in the waiting crowd as the scene opens: WAITING[n] is in waitSlot(n). */
export const WAITING = [
  '5026', '4000', '2468', '3000', '1357', '7777', '6417', '8086', '5940', '9152', '6038',
  '8812', '7040', '6612', '8248', '9785', '6017', '7311', '2202', '4471', '5518', '8590',
  '3141', '6060', '9001', '4321', '2718', '1618', '1492', '2048', '3690', '1776', '7007',
];
