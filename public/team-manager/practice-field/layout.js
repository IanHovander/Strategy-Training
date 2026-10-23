// Where everything is in the practice field: the school cafeteria after school, with half a 2019 field built on carpet
// over the tiles. Every module in this folder reads its coordinates from here, so the room, the field, the people and
// the cut scene agree. The room is seen the way the arena is (field.js): its long back wall faces you, light comes in
// through tall windows in that wall, and the floor recedes from it toward you. Along the room 8 pixels make a foot, the
// same as the people; a foot of depth is 2.75 pixels (the camera looks down at 20 degrees); heights go up at 8 pixels a
// foot. A y here is always a floor line: where something stands, or where its footprint begins or ends.

export const FT = 8, DEEP = 2.75;

// ---- The room ----
/** 85 feet long; the back wall's floor line at y = 84, so 10.5 feet of wall show above it; 46 feet of floor below. The
 *  walking camera keeps above y = `shown` while she's further back than 12 pixels short of it, so the windows stay in
 *  sight; only when she walks out across the front strip, round in front of Kai, does it go down with her, keeping 12
 *  pixels of floor under her feet.
 *  The last rows of tiles under that come into view while she talks to someone at the front of the room, so the dialog
 *  box doesn't hide their faces (scene.js camera). */
export const ROOM = { w: 680, h: 212, wallY: 84, shown: 192 };
/** The floor line this many feet out from the back wall. */
export const roomY = (ft) => ROOM.wallY + ft * DEEP;
/** Where her feet can go at all: the floor, short of the walls and the edges of the world. At the front she can go 4
 *  pixels past `shown`, so there's room to walk round in front of someone standing in front of the carpet. */
export const FLOOR = { x0: 8, x1: ROOM.w - 8, y0: ROOM.wallY + 4, y1: ROOM.shown + 4 };

// The back wall, left to right. x0-x1 along the wall; top is the y of the top edge on the wall.
/** Double doors out to the hallway, 7 feet tall, with the EXIT sign over them. */
export const DOORS = { x0: 12, x1: 52, top: ROOM.wallY - 7 * FT };
/** Six tall windows, 5 feet wide with 2.5 feet of wall between, from 2 feet up to 9.5. The sun is behind the wall. */
export const WINDOWS = Array.from({ length: 6 }, (_, i) => ({ x0: 72 + i * 60, x1: 112 + i * 60 }));
export const WIN = { top: 8, sill: 68 };
/** Lunch tables folded up and rolled against the wall, 5.5 feet tall, 2 feet deep. */
export const FOLDED = [{ x0: 424, x1: 468 }, { x0: 472, x1: 516 }];
/** The serving line: its shutter pulled down on the wall, the steel counter and tray rail in front, 2.5 feet deep. It
 *  stops 2 pixels short of the bins (FURNITURE.bins). */
export const SERVING = { x0: 528, x1: 598 };
/** Two vending machines against the wall, 6 feet tall, 2.5 feet deep. */
export const VENDING = [{ x0: 620, x1: 644 }, { x0: 648, x1: 672 }];

// ---- The sun ----
// Late afternoon: the sun is low, behind the back wall and off to the left. Each window throws a window-shaped patch on
// the floor, sheared to the right because the light comes from the left: a window's columns land sunShift(y) pixels to
// the right of where they are on the wall, and its height is squeezed into the floor rows near to far (the window's
// top lands on the far row). The shafts in the air run from each window's sill down to its patch, sheared the same way.
export const SUN = { slope: 0.35, near: 100, far: 136 };
export const sunShift = (y) => SUN.slope * (y - WIN.top);

// ---- The half field ----
/** The alliance wall (the homemade driver station) at x0, the centre line at x1, 27 feet each way; its far edge is
 *  5 feet out from the back wall, its near edge at y1. z below is feet in from the far edge, as in field.js. */
export const PF = { x0: 152, x1: 152 + 27 * FT, y0: 98 };
export const pfY = (z) => PF.y0 + z * DEEP;
PF.y1 = pfY(27);
/** The carpet: from the alliance wall to a foot past the centre line, the field's full depth. */
export const CARPET = { x0: PF.x0, x1: PF.x1 + FT, y0: PF.y0, y1: PF.y1 };
/** The driver station wall, edge-on like field.js's alliance wall: 6 pixels thick, 6.5 feet tall, z 0 to 27. */
export const STATION_WALL = { x0: PF.x0 - 6, x1: PF.x0, h: 6.5 * FT };
/** The loading station in the far corner, against the alliance wall on the field side. */
export const LOADING = { x0: PF.x0, w: 1.25 * FT, z0: 0.5, z1: 2.25, h: 4 * FT };
/** The rocket on the far side, its hatch ports (on the angled faces) and cargo ports this high above its floor line. */
export const ROCKET = { x: PF.x0 + 19 * FT, z: 2.2, hatchUp: [13, 31, 50], cargoUp: [18, 37, 56] };
/** This alliance's half of the cargo ship, from the centre line back toward the HAB. */
export const SHIP = { x0: PF.x1 - 63, x1: PF.x1, z0: 11.2, z1: 15.8, h: 4 * FT };
/** The robot's hatch run: along this floor line, from the loading station to the rocket's home face. */
export const ROBOT = { y: pfY(2.6), station: PF.x0 + 18, rocket: ROCKET.x - 31 };

// ---- Things standing on the floor ----
// x0-x1 along the room; y0-y1 the footprint's back and front floor lines (y1 is what it sorts by).
/** The team's gear (halffield.js draws these). */
export const GEAR = {
  batteryCart: { x0: 60, x1: 92, y0: roomY(0.5), y1: roomY(3) },
  hatchRack: { x0: 108, x1: 124, y0: 108, y1: 112 },
  cargoBasket: { x0: 100, x1: 116, y0: 168, y1: 172 },
  toolChest: { x0: 8, x1: 32, y0: 121, y1: 128 },
  whiteboard: { x0: 496, x1: 532, y0: 113, y1: 116 },
};
/** The cafeteria's own furniture out on the floor (room.js draws these, and the ones on the wall above). */
export const FURNITURE = {
  // At the front, far enough forward that Theo's head stays under the bottom film bar while the cut scene's last shot
  // waits at the doors, and under the dialog box's name tag while she stops there for the mentor's call or talks to
  // the drive team. That still leaves her a lane in front of it.
  programmerTable: { x0: 8, x1: 64, y0: roomY(32.2), y1: roomY(34.7) },
  scoutTable: { x0: 424, x1: 488, y0: roomY(18), y1: roomY(20.5) },
  janitorCart: { x0: 616, x1: 648, y0: 136, y1: 142 },
  bins: { x0: 600, x1: 616, y0: roomY(0.5), y1: roomY(2.5) },
};

// ---- People ----
/** Where everyone stands (their feet) and faces (0-7 clockwise from facing you, walker.js), and how. Seated people sit
 *  with their feet under a table; `talk` is where she stands to talk to them instead, beside the table, where the two
 *  of them are side by side. */
// The people at the mentor's end stand well apart, not in a column down the room, so nobody's head is drawn over the
// legs of whoever is behind them, and so the strategist, talking to Ms. Okafor from beside her, isn't stacked on
// anyone either: Ms. Okafor by the centre line, Noor out at the near corner of the carpet, scouting the run from the
// front, and the student who resets the field just off the carpet's edge, behind Ms. Okafor and far enough to her left
// that her head and bun are clear of his legs.
export const SPOTS = {
  okafor: { x: 398, y: 126, dir: 6, gait: 'drive' },
  teammate: { x: 132, y: 123, dir: 2, gait: 'stand' },
  jalen: { x: 136, y: 142, dir: 2, gait: 'drive' },
  mei: { x: 136, y: 161, dir: 2, gait: 'drive' },
  // A step out from the back wall, so whoever walks behind her along the back strip has their face above her head.
  ines: { x: 138, y: 108, dir: 2, gait: 'stand' },
  noor: { x: 394, y: 176, dir: 6, gait: 'drive' },
  theo: { x: 36, y: 175, dir: 0, gait: 'sit', talk: { x: 74, y: 176 } },
  bea: { x: 60, y: 104, dir: 1, gait: 'stand' }, // at the cart's end, her head clear of the low sun in window 0
  // Off the carpet, just in front of its tape, keeping everyone else off it too. She walks round in front of him.
  kai: { x: 250, y: 176, dir: 0, gait: 'stand' },
  flores: { x: 600, y: 140, dir: 6, gait: 'stand' },
  // The student who resets the field waits a step off the carpet's right-hand edge, behind Ms. Okafor and 18 pixels to
  // her left (far enough back that his head is clear above hers, and far enough over that hers is clear of his legs),
  // and only runs on once the robot is parked at the station and
  // disabled (people.js, robot.js RESET). His step off the edge is all the floor his run crosses, and his footprint
  // covers it, so he never runs through her; the back strip behind the field still joins the right of the room behind
  // him.
  reset: { x: 380, y: 100, dir: 6, gait: 'stand' },
  scout: { x: 448, y: 134, dir: 0, gait: 'sit' },
};
/** Where she comes in (the doorway) in the cut scene, and where she stands when it hands over to you. */
export const DOORWAY = { x: 32, y: 86 };
export const START = { x: 232, y: 182, dir: 2 };
