// The van's layout: where everything stands, in world pixels, shared by the art (cabin.js, outside.js), the people
// (people.js), the words and the camera (script.js) and the scene (scene.js). Two views of one van:
//   the cabin    the van from in front and above with its roof cut away, at Blue Banner's usual 20 degrees: the trailer
//                at the top, the front bumper at the bottom, and between them three rows of seats with everyone facing
//                you. The rows are 26 pixels apart, not a real van's 8, the same cheat as the bleachers' tiers, so every
//                face shows over the seat in front. The van drives down the screen, toward you, so the road streams up.
//   the outside  the van and its trailer from the side on the highway, driving right, the scenery streaming left.
// People's (x, y) are their feet, as on the walker's rig (walker.js). The van's right side (the passenger side) is on
// the screen's left in the cabin and toward you outside.

/** The cabin view's world: one screen wide, a little taller than one. */
export const CABIN = { w: 256, h: 184 };
/** The van's middle, its body's outer edges (ink included) and the cabin inside its door tops. */
export const VX = 128;
export const BODY = { x0: 90, x1: 166 };
export const CABIN_IN = { x0: 95, x1: 161 };
/** Feet lines of the three rows: 3 is the back bench, 1 the front seats. */
export const ROWS = { 3: 96, 2: 122, 1: 148 };
/** Where each of the eight sits: [x, y] of their feet. */
export const SEATS_AT = {
  hero: [107, 96], teammate: [128, 96], bea: [149, 96],
  tess: [107, 122], rafi: [128, 122], kai: [149, 122],
  owen: [109, 148], adeyemi: [147, 148],
};
/** The middle of the steering wheel's rim, in front of the driver. */
export const WHEEL = { x: 147, y: 133 };
/** Floor lines down the cabin view, top to bottom (a guide: cabin.js may move a band by a pixel or two). */
export const Y = {
  trailerRoof: 0, trailerFace: 8, tongue: 30, hitch: 38, rearBumper: 40, tailgate: 44, cargo: 48,
  dash: 140, windshield: 146, hood: 148, nose: 158, bumper: 168, tyres: 180,
};
/**
 * The road across the cabin view, left to right: verge, shoulder, edge line, the van's lane, lane dashes, passing lane,
 * and past it the median (as in the outside view): the yellow left edge line, a paved strip, the guardrail on its
 * posts and the median's grass to the world's edge.
 */
export const ROAD = {
  verge: [0, 48], shoulder: [48, 78], edgeLine: 78, lane: [80, 176], dashes: 176, passing: [178, 245],
  yellow: 245, rail: 248, median: 253, speed: 90,
};
/** Camera framings: the view's top-left in cabin world pixels, and its zoom. */
export const FRAME = {
  all: { x: 0, y: 40, s: 1 },      // the whole van: the seat-picking view, and the cut scene's last shots
  grille: { x: 85, y: 130, s: 3 }, // the scan opens close on the front: headlights, grille and plate, nobody's face
  hood: { x: 64, y: 99, s: 2 },    // then out to the front seats' faces over the hood (the plate's letters all under the
                                   // bar: any lower and the bar would cut them in half)
  front: { x: 64, y: 76, s: 2 },   // the driver and the navigator, row 2's faces behind
  row2: { x: 64, y: 50, s: 2 },    // the middle row, the back row's faces above it
  row3: { x: 64, y: 36, s: 2 },    // the back row, the cargo behind it and the middle row's faces in front
  trailer: { x: 64, y: 8, s: 2 },  // the trailer's nose behind the van, over the back row's faces
  talk: { x: 53, y: 40, s: 2 },    // the strategist and the teammate, faces clear of the dialog box
  close: { x: 85, y: 52, s: 3 },   // closer on the two of them: x3, their faces between the film bar and the dialog box
  arrive: { x: 0, y: 32, s: 1 },   // the whole van a little higher, the spare bumpers' numbers clear of the film bar
  call: { x: 85, y: 106, s: 3 },   // close on the front seats over the dialog box: their faces, Owen's phone, the hands on
                                   // the wheel, and behind them only row 2's laps (their heads would be cut by the bar)
};

/**
 * The outside view: one screen at scale 1, the van driving right. vx is the van's back end and vy the road under its
 * near wheels; the trailer runs from trailer.x for trailer.len, its tongue reaching to vx. floor: the van's floor above
 * vy. rows: the hip x (from vx) of the near seat in each row: the strategist (3), Tess (2), Owen (1). windows: the near
 * side's three window openings [from, to] (from vx), between winTop and sill above vy.
 */
export const SIDE = {
  vx: 102, vy: 126, len: 136, floor: 10, rows: { 3: 36, 2: 64, 1: 94 },
  windows: [[22, 50], [54, 84], [86, 108]], winTop: 50, sill: 30, trailer: { x: 18, len: 64 },
};

/** The van's bounce: a pixel up now and then (-1), the same in both views. The trailer follows a moment later. */
export const bounce = (t) => {
  const k = Math.floor(t * 8);
  return k % 13 === 0 || k % 21 === 5 ? -1 : 0;
};
export const trailerBounce = (t) => bounce(t - 0.15);
/** A turn signal's lamp: on, off, on, off, one and a half times a second. */
export const blinkOn = (t) => Math.floor(t * 3) % 2 === 0;

// ---- Colours: three-tone ramps beside pixel.js's palette, dark to lit ----
export const RAMP = {
  body: ['#7882a3', '#c4cbe0', '#ffffff'],     // the van: pixel.js steel2, steel3 and white
  seat: ['#1b1e2e', '#2a2f45', '#3e4563'],     // upholstery
  trim: ['#232838', '#3f4761', '#5d6580'],     // dash, door panels, bumpers (steel0, steel1, field.js's STEEL)
  mat: ['#101219', '#14161f', '#1b1e29'],      // the floor mats
  asphalt: ['#24262f', '#2b2e3a', '#353845'],
  grass: ['#173a2a', '#1f5136', '#2f6e45'],
  leaf: ['#123222', '#1d4e33', '#2e7a4a'],
  bark: ['#3a2418', '#5a3a26', '#7a5236'],
  trailer: ['#a1172a', '#d3212f', '#ff6a55'],  // 5026 red, the strategist's tee
  sign: ['#0d4a2a', '#13693b', '#1f8a50'],     // highway green
  glass: ['#1b2766', '#2a3a8a', '#a8d2ff'],    // window glass: night2, night3, blue3
  amber: ['#a3460a', '#ff7a1c', '#ffb46a'],    // turn signals (the orange ramp)
  lamp: ['#c4cbe0', '#fff17a', '#ffffff'],     // headlights
  tail: ['#5e0d17', '#d3212f', '#ff5b4d'],     // tail lights (red0, red1, red2)
};
