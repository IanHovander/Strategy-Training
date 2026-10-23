// Where everything is on the back lawn, in world pixels, at the arena's scale (field.js): 8 pixels to the foot across
// and 2.75 to the foot of depth, so a person is about 48 pixels tall. The school's wall runs along the top with the sky
// over its roof, the concrete path runs along its foot, and the lawn fills the rest, where the team sits in a circle.
// She comes out of the robotics shop's door on the left once the meeting's over (ENTER), and leaves along the path on
// the right, under the covered walkway round to the cafeteria (WALKWAY, EXIT). Every part of the scene places things
// from these numbers.

export const FT = 8, DEEP = 2.75;
export const WORLD = { w: 512, h: 264 };

// ---- The school ----
/** The roof's top face runs from ROOF_Y to WALL_TOP; the wall's face from there down to its foot, WALL_Y: 10 feet. */
export const ROOF_Y = 56, WALL_TOP = 62, WALL_Y = 142;
/** The robotics shop's roll-up door, rolled up: 10 feet wide and 8 tall, the shop and the robot inside. */
export const SHOP_DOOR = { x0: 120, x1: 200, y0: 78 };
/** Classroom windows: the sill 3 feet up, 5 feet tall and 5 wide. (None under the walkway.) */
export const WINDOWS = [16, 240, 296, 352, 408].map((x0) => ({ x0, x1: x0 + 40, y0: 78, y1: 118 }));
/** The team's banner on the wall, between the shop door and the windows. */
export const BANNER = { x0: 212, x1: 228, y0: 70, y1: 112 };

// ---- The path and the lawn ----
export const PATH = { y0: 142, y1: 158 };
export const LAWN_Y = 158;
/** The tree on the lawn, by the foot of the trunk, and the shade on the grass under its crown: centred under it, the
 *  way every shadow in the game sits under its owner (the people's, the props'), so the frame has one light. (The
 *  right end of the lawn is the walkway's: a tree there would hide the way out behind its leaves.) */
export const TREES = [{ x: 64, y: 206 }];
export const shadeOf = (tree) => ({ x: tree.x + 4, y: tree.y - 1, rx: 30, ry: 9 });
/** A bench on the path, facing the lawn. y is its floor line; whoever sits on it has their feet at y + 3. */
export const BENCH = { x0: 330, x1: 378, y: 152 };
/** The big thank-you card for a sponsor, on an easel by the shop door. */
export const EASEL = { x: 206, y: 150 };
/** A folding table with the outreach demo's sign-up sheet. */
export const TABLE = { x0: 400, x1: 448, y: 226 };
/** Bags dropped at the edge of the lawn. */
export const BAGS = [{ x: 226, y: 162, c: 'red' }, { x: 235, y: 163, c: 'navy' }, { x: 428, y: 162, c: 'black' }];

// ---- The meeting ----
/** The circle: its middle and its radius, 9 feet (72 by 25 pixels). The co-captains stand in the gap at its head. */
export const CIRCLE = { x: 256, y: 200, rx: 72, ry: 25 };
export const HEAD = { tessa: { x: 246, y: 173 }, owen: { x: 266, y: 173 } };
/** Where a co-captain stands to speak: a step into the circle, forward of the other, but not so far that the close-up's
 *  dialog box covers more than their legs (Owen a little less far, so the clipboard hanging from his hand shows). */
export const FLOOR = { tessa: { x: 252, y: 180 }, owen: { x: 260, y: 177 } };
/** Where the other one listens from: a step out to their own side of the head and a little back, so in the speaker's
 *  close-up they stand beside the speaker and behind, not straight behind. */
export const ASIDE = { tessa: { x: 234, y: 171 }, owen: { x: 278, y: 171 } };
// ---- In and out ----
/**
 * The covered walkway at the east end of the building, the path's way round to the cafeteria: a flat steel roof 10 feet
 * up, meeting the wall just under the school's roof edge and running on off the right edge of the world, standing on
 * a post at the lawn's edge every 12 feet (only the first is in the world). x0: its left end; post: that post's middle;
 * y: the floor line along its front, where the post stands.
 */
export const WALKWAY = { x0: 452, post: 458, y: 159 };
/** The way out (stage.js exit): the path under the walkway, off the right edge. Its arrow sits on the wall's base
 *  course just over the path, low enough that its label still shows with the view at the bottom of the world. */
export const EXIT = { x: 494, y0: WALL_Y + 4, y1: LAWN_Y, label: 'TO THE CAFETERIA', sign: { y: 136 } };
/**
 * The way in: once the meeting's over she's been into the shop, and comes back out of its door. She walks in from the
 * left along the shop's floor (behind the wall at first, so she's out of sight while the lawn fades in), turns and
 * steps out onto the path and the grass, to START (stage.js enter adds it), clear of the build lead at the door's left
 * edge and the thank-you card on its right.
 */
export const ENTER = [[98, WALL_Y - 2], [162, WALL_Y - 2]];
export const START = { x: 162, y: 168, dir: 0 };
