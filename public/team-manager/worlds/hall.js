// The hall around the eight fields: everything at the World Championship that isn't a field, the stands or a person.
// High up in the dark, a lighting truss runs the length of the hall with a lamp under it every 32 pixels; only the cut
// scene looks up there. Behind each division's bleachers hangs a dark drape, and between one division's bleachers and
// the next a pipe-and-drape curtain (the gateway) comes down to the floor. On the curtain hang the division's sign, a
// blue banner like the one the game is named for, and its big screen with the match on its field: the score, the clock
// and the qualification match number, live from layout.js matchState(). Past Newton the curtain carries on to the end of
// the hall with a yellow sign for Einstein (the finals are in another hall: this is the way out), and a concrete wall
// with an EXIT sign closes off each end. On the floor stand two tables: the button traders' and the info desk.
// Everything is in world pixels through pixel.js's camera, culled to the view: the hall is 6600 pixels long. What never
// changes is drawn once into pixel.js layers and blitted after; a big screen is drawn again only when its numbers change.
//   drawHall(g, view, t, { lights })  rows above 0: ceiling, truss, lamps, the drape behind the stands (before the stands)
//   drawGateways(g, view, t)          the curtains, signs, screens and end walls (after the stands, before the fields)
//   PROPS, PROP_BLOCKS                the two tables, to sort in with the field, and the boxes that stop her
//   drawBeams(g, view, t, a)          the lamps' spot cones, in screen space, drawn last

import { C, useContext, camera, screen, fill, rect, disk, text, dither, withAlpha, stepped, layer, blit, rnd } from '../pixel.js';
import { tones } from '../cast.js';
import {
  ox, DIVISIONS, WORLD, WALL, TOP, STANDS, GATEWAY, SIGN, SCREEN, BUTTON_TABLE, INFO_DESK, matchState, clockText,
} from './layout.js';

// Dim ramps beside the palette (lit, mid, shade): the curtains, the darker drape behind the stands, and the concrete
// end walls (field.js's concrete speckles).
const DRAPE = ['#20264a', '#161a33', '#0e1124'];
const BACKDRAPE = ['#181d38', '#11152a', '#0b0e1e'];
const SHADOW = '#0b0e1e'; // a curtain pleat in the shadow of a sign is one step darker than this ramp's shade
const WALLS = ['#3b4154', '#30354a', '#262a3b'];
const LAST = ox(DIVISIONS.length - 1) + STANDS.x1; // where Newton's stands end and the right pad's curtain starts

// The rows things hang from. The truss's two chords are steel tubes, each an ink row, a lit row, a mid row and an ink
// row from the row given here; the bottom chord is the pipe the curtains and drapes hang from, so the cloth starts four
// rows under it. The lamps hang from it too, and the curtains' hem lies on the floor at row 55. The truss sits just low
// enough to be whole under the top film bar in the cut scene's opening shot (cutscene.js OPEN, 56 rows up).
const CHORD = [-44, -34];
const PIPE = CHORD[1], CLOTH = PIPE + 4, HEM = 55;
const LAMP_Y = CLOTH; // the top of a lamp's yoke

const inView = (view, x0, x1, m = 0) => x1 > view.x - m && x0 < view.x + 256 + m;
const cull = (view, x0, x1) => [Math.max(x0, view.x - 2), Math.min(x1, view.x + 258)];

// ---- Drawn once ----
// The parts that never change are drawn the first time they're needed, each into a pixel.js layer, and blitted after:
// the pleats as strips one row tall and the length of the hall (stretched down a curtain's rows), the truss's repeat,
// the lamps, each sign, wall and table.
let G = null; // the context being drawn into, for the strips
function begin(g, view) {
  useContext(g);
  camera(view.x, view.y, 1);
  G = g;
  g.imageSmoothingEnabled = false;
}
const made = new Map();
function once(key, w, h, draw) {
  if (!made.has(key)) made.set(key, layer(w, h, draw));
  return made.get(key);
}
/**
 * Columns x0-x1 of a strip drawn on rows y0-y1: a strip one row tall is stretched down them, a taller one goes row for
 * row. Strip column = world x, or world x round a repeat of `wrap` pixels.
 */
function band(view, l, x0, x1, y0, y1, wrap = 0) {
  [x0, x1] = cull(view, x0, x1);
  const top = Math.max(y0, view.y), bottom = Math.min(y1, view.y + 144);
  if (x1 <= x0 || bottom <= top) return;
  const sx = wrap ? ((x0 % wrap) + wrap) % wrap : x0;
  const [sy, sh] = l.h === 1 ? [0, 1] : [top - y0, bottom - top];
  G.drawImage(l.canvas, sx, sy, x1 - x0, sh, x0 - view.x, top - view.y, x1 - x0, bottom - top);
}

// ---- Up in the dark ----
/**
 * The lamps' x positions: one every 32 pixels, inside the end walls. They sit at 14 past each 32 so that over
 * Archimedes, the one place the camera looks up at them, none hangs in front of a sign's or a screen's cables.
 */
const LAMP_STEP = 32, LAMP_AT = 14;
const lampXs = (view) => {
  const out = [];
  for (let x = Math.floor((view.x - LAMP_AT - 8) / LAMP_STEP) * LAMP_STEP + LAMP_AT; x < view.x + 264; x += LAMP_STEP) {
    if (x > WALL + 5 && x < WORLD.w - WALL - 5) out.push(x);
  }
  return out;
};
// The lamps come on left to right across the view as `lights` goes from 0 to 1, each in one step (no fades).
let lit = 1; // the last drawHall's lights, which drawGateways and drawBeams use in the same frame
const isOn = (x, view) => lit > 0 && x - view.x < lit * 256;

/**
 * Until every lamp in view is on, the whole view is dimmed, half dark with them all off, and it comes up in four hard
 * steps as they click on, the way stage.js cover() fades: light arriving, never a wipe across the screen. Screen space,
 * drawn over the whole hall and under the cones (the cut scene's opening; with the lights all on there's nothing to
 * draw).
 */
export function drawUnlit(g, view) {
  if (lit >= 1) return;
  useContext(g);
  screen();
  withAlpha(0.5 * stepped(1 - lit), () => fill(0, 0, 256, 144, C.ink));
}

/** The roof, dark navy stepping to the stands' navy through a checkerboard, with a few fixtures. */
function ceiling(view) {
  const y0 = TOP - view.y, deck = 8; // screen rows
  screen();
  rect(0, y0, 256, deck, C.night0);
  dither(0, y0 + deck, 256, 2, C.night0, C.stand0);
  rect(0, y0 + deck + 2, 256, CLOTH - TOP - deck - 2, C.stand0);
  camera(view.x, view.y, 1);
  // Fixtures: sprinkler heads and the odd dim exit light, single pixels in a loose line under the roof deck.
  for (let x = Math.floor(view.x / 24) * 24; x < view.x + 256; x += 24) {
    const r = rnd(x * 0.37 + 11);
    if (r < 0.55) rect(x + Math.floor(r * 12), TOP + 10, 1, 1, C.steel0);
    if (r > 0.92) rect(x + 5, TOP + 6, 1, 1, C.night2);
  }
}

/** The truss: two chords with zigzag lacing between, a hanger up to the roof every 128 pixels. */
function truss(view, x0, x1) {
  [x0, x1] = cull(view, x0, x1);
  if (x1 <= x0) return;
  const top = CHORD[0];
  // Hangers, each with a small chain hoist halfway up.
  const hoist = Math.round((TOP + top) / 2) - 2;
  for (let x = Math.floor(x0 / 128) * 128 + 64; x < x1; x += 128) {
    rect(x - 1, TOP, 3, top - TOP, C.ink);
    rect(x, TOP, 1, top - TOP, C.steel1);
    rect(x - 2, hoist, 5, 5, C.ink);
    rect(x - 1, hoist + 1, 3, 3, C.steel0);
    rect(x - 1, hoist + 1, 3, 1, C.steel1);
  }
  band(view, trussRepeat(), x0, x1, top, CHORD[1] + 4, 12);
}
/** The truss between its hangers repeats every 12 pixels: drawn once, 288 wide, enough to cover the screen. */
const trussRepeat = () => once('truss', 288, CHORD[1] + 4 - CHORD[0], () => {
  const top = CHORD[0], rows = CHORD[1] - top - 4;
  camera(0, top, 1);
  // The lacing between the chords: a zigzag, a step up or down each pixel, turning every 6 so each bay is 12 wide,
  // and the far side's zigzag in shade behind it, the other way round.
  for (let x = 0; x < 288; x++) {
    const p = x % 12, up = p < 6 ? p : 11 - p;
    rect(x, top + 4 + up, 1, 1, C.steel0);
    rect(x, top + 3 + rows - up, 1, 1, C.steel1);
  }
  // The two chords: a steel tube, lit along the top, outlined in ink.
  for (const y of CHORD) {
    rect(0, y, 288, 4, C.ink);
    rect(0, y + 1, 288, 1, C.steel3);
    rect(0, y + 2, 288, 1, C.steel2);
  }
});

/**
 * A lamp hanging under the bottom chord: a clamp, the yoke (a 1-pixel steel bracket over the head and down its sides to
 * the pivots, lit on the left, outlined in ink like the head), the head, 6 by 5 inside its ink outline, and the lens on
 * its underside, lit or not. LAMP_W by LAMP_H, from x - 6.
 */
const LAMP_W = 12, LAMP_H = 10;
function lamp(x, on) {
  const y = LAMP_Y;
  rect(x - 6, y + 1, 12, 6, C.ink);
  rect(x - 2, y, 4, 2, C.ink);
  rect(x - 1, y, 2, 2, C.steel2);
  rect(x - 5, y + 2, 10, 1, C.steel2);
  rect(x - 5, y + 2, 1, 4, C.steel1);
  rect(x + 4, y + 3, 1, 3, C.steel0);
  rect(x - 4, y + 3, 8, 7, C.ink);
  rect(x - 3, y + 4, 6, 5, C.steel0);
  rect(x - 3, y + 4, 6, 1, C.steel1);
  rect(x - 4, y + 5, 1, 1, C.steel2); // the pivots
  rect(x + 3, y + 5, 1, 1, C.steel2);
  rect(x - 1, y + 8, 2, 2, on ? C.yel2 : C.steel1);
  if (on) rect(x - 1, y + 8, 1, 1, C.white);
}

const lampArt = (on) => once(on ? 'lamp-on' : 'lamp-off', LAMP_W, LAMP_H, () => {
  camera(-6, LAMP_Y, 1);
  lamp(0, on);
});
function lamps(view, x0, x1) {
  for (const x of lampXs(view)) if (x >= x0 - 4 && x < x1 + 4) blit(lampArt(isOn(x, view)), x - 6, LAMP_Y);
}

/** The dark drape behind a block of stands, and the bleachers' rear guard rail in front of it. */
function backDrape(view, x0, x1) {
  [x0, x1] = cull(view, x0, x1);
  if (x1 <= x0) return;
  band(view, strip('back', BACKDRAPE, 3), x0, x1, CLOTH, 0);
  // The rail: a lit tube on posts.
  rect(x0, -11, x1 - x0, 1, C.ink);
  rect(x0, -10, x1 - x0, 1, C.steel1);
  rect(x0, -9, x1 - x0, 1, C.steel0);
  for (let x = Math.ceil(x0 / 24) * 24; x < x1; x += 24) {
    rect(x, -8, 1, 8, C.steel0);
  }
}

/**
 * The hall above the arena's top row: the roof, the truss and its lamps, and the drape behind each block of stands.
 * Only the cut scene looks up here: with the view level (view.y >= 0) there's nothing to draw.
 * lights: 0 to 1, how far across the view the lamps have come on, left to right.
 */
export function drawHall(g, view, t, { lights = 1 } = {}) {
  lit = lights;
  if (view.y >= 0) return;
  begin(g, view);
  if (view.y < CLOTH) ceiling(view);
  for (let k = 0; k < DIVISIONS.length; k++) {
    if (inView(view, ox(k) + STANDS.x0, ox(k) + STANDS.x1)) backDrape(view, ox(k) + STANDS.x0, ox(k) + STANDS.x1);
  }
  if (view.y < CHORD[1] + 4) truss(view, WALL, WORLD.w - WALL);
  if (view.y < LAMP_Y + LAMP_H) lamps(view, WALL, WORLD.w - WALL);
}

// ---- The curtains ----
// Cloth hangs in pleats about 5 pixels apart, never quite even: each is 4 to 6 pixels wide, a lit column on its left
// (the light is up to the left), then mid, then two columns in shade. Worked out once for the whole hall.
const PLEATS = (() => {
  const a = new Uint8Array(WORLD.w + 8);
  for (let x = 0, i = 0; x < a.length; i++) {
    const w = 4 + Math.floor(rnd(i * 1.7 + 5) * 3);
    for (let j = 0; j < w && x + j < a.length; j++) a[x + j] = j === 0 ? 0 : j < w - 2 ? 1 : 2;
    x += w;
  }
  return a;
})();
const pleat = (x) => PLEATS[x < 0 ? 0 : x >= PLEATS.length ? PLEATS.length - 1 : x];
/** One row of a ramp's pleats the length of the hall, drawn once (shift: the pleats moved along that far). */
const strip = (name, ramp, shift = 0) => once(name, PLEATS.length, 1, () => {
  for (let x = 0, end; x < PLEATS.length; x = end) {
    const c = ramp[pleat(x - shift)];
    for (end = x + 1; end < PLEATS.length && ramp[pleat(end - shift)] === c; end++);
    fill(x, 0, end - x, 1, c);
  }
});
const SHADED = [DRAPE[1], DRAPE[2], SHADOW];
/** Something hung on the curtain throws a shadow down and to the right of it (the light is up to the left). */
const castShadow = (view, x, y, w, h) => band(view, strip('shaded', SHADED), x + 2, x + w + 2, y + 2, y + h + 2);
/** Where the lamps' light on a curtain gives out: above it the cloth is as dark as the drape behind the stands. */
const DUSK = -16;

/** Two rows of checkerboard between a curtain's dark top and its lit cloth, drawn once. */
const dusk = () => once('dusk', PLEATS.length, 2, () => {
  for (let x = 0; x < PLEATS.length; x++) {
    fill(x, 0, 1, 1, (x & 1 ? DRAPE : BACKDRAPE)[pleat(x)]);
    fill(x, 1, 1, 1, (x & 1 ? BACKDRAPE : DRAPE)[pleat(x)]);
  }
});

/** A pipe-and-drape curtain from x0 to x1: the pipe, the pleats, the hem on the floor, an upright at each end. */
function curtain(view, x0, x1) {
  band(view, strip('back0', BACKDRAPE), x0, x1, CLOTH, DUSK);
  band(view, dusk(), x0, x1, DUSK, DUSK + 2);
  band(view, strip('drape', DRAPE), x0, x1, DUSK + 2, HEM - 1);
  const [c0, c1] = cull(view, x0, x1);
  rect(c0, HEM - 1, c1 - c0, 1, DRAPE[0]);
  rect(c0, HEM, c1 - c0, 1, C.ink);
  // The pipe.
  rect(c0, PIPE, c1 - c0, 4, C.ink);
  rect(c0, PIPE + 1, c1 - c0, 1, C.steel3);
  rect(c0, PIPE + 2, c1 - c0, 1, C.steel2);
  // An upright at each end, except where the curtain meets an end wall.
  for (const x of [x0, x1 - 2]) if (x > WALL && x < WORLD.w - WALL - 2) upright(view, x);
}

/** An upright: a steel post from the pipe to the floor on a small base plate. */
function upright(view, x) {
  if (!inView(view, x - 4, x + 6)) return;
  rect(x - 1, PIPE, 4, HEM - PIPE, C.ink);
  rect(x, PIPE + 1, 2, HEM - PIPE - 2, C.steel2);
  rect(x, PIPE + 1, 1, HEM - PIPE - 2, C.steel3);
  rect(x - 3, HEM - 2, 8, 3, C.ink);
  rect(x - 2, HEM - 1, 6, 1, C.steel1);
}

/** A steel cable from the pipe down to y, outlined in ink like the truss's hangers, with a clamp where it meets the pipe. */
function cable(x, y) {
  rect(x - 1, CLOTH, 3, y - CLOTH, C.ink);
  rect(x, CLOTH + 1, 1, y - CLOTH - 1, C.steel1);
}

/** Division k's sign: a blue banner, landscape and rigid, built like sprites.js banner(). */
function sign(view, k) {
  const x = ox(k) + SIGN.x0, w = SIGN.x1 - SIGN.x0, y = SIGN.y0, h = SIGN.y1 - SIGN.y0;
  if (!inView(view, x - 2, x + w + 4)) return;
  castShadow(view, x - 1, y - 1, w + 2, h + 2);
  cable(x + 8, y);
  cable(x + w - 9, y);
  blit(once(`sign${k}`, w + 2, h + 2, () => {
    camera(x - 1, y - 1, 1);
    signArt(k, x, y, w, h);
  }), x - 1, y - 1);
}
function signArt(k, x, y, w, h) {
  rect(x - 1, y - 1, w + 2, h + 2, C.ink);
  rect(x, y, w, h, C.blue1);
  rect(x, y, 2, h, C.blue0);
  rect(x + w - 2, y, 2, h, C.blue0);
  rect(x + 2, y, w - 4, 1, C.blue2);
  // The white line inset round the cloth, and a grommet near each top corner where its cable is clipped on.
  rect(x + 4, y + 2, w - 8, 1, C.white);
  rect(x + 4, y + h - 3, w - 8, 1, C.white);
  rect(x + 4, y + 2, 1, h - 4, C.white);
  rect(x + w - 5, y + 2, 1, h - 4, C.white);
  rect(x + 7, y + 1, 2, 2, C.steel3);
  rect(x + w - 9, y + 1, 2, 2, C.steel3);
  const cx = x + Math.floor(w / 2);
  text('DIVISION', cx, y + 4, { font: 3, color: C.blue3, align: 'center' });
  // A rule either side of DIVISION, like the banner's under its words.
  rect(cx - 33, y + 6, 13, 1, C.blue2);
  rect(cx + 20, y + 6, 13, 1, C.blue2);
  text(DIVISIONS[k].name, cx, y + 10, { color: C.white, align: 'center', shadow: C.blue0, sx: 0, sy: 1 });
}

/** Division k's big screen: the match on its field, as the broadcast shows it. */
function bigScreen(view, k, t) {
  const x = ox(k) + SCREEN.x0, w = SCREEN.x1 - SCREEN.x0, y = SCREEN.y0, h = SCREEN.y1 - SCREEN.y0;
  if (!inView(view, x - 2, x + w + 4)) return;
  const m = matchState(k, t), final = !m.playing && Math.floor(t * 2) % 2 === 0;
  castShadow(view, x, y, w, h);
  cable(x + 16, y);
  cable(x + w - 16, y);
  // Drawn again only when what it shows changes: once a second while the clock runs.
  const key = `${m.blue} ${m.red} ${m.playing ? m.clock : final} ${m.qual}`;
  let shown = screens.get(k);
  if (shown?.key !== key) {
    shown = { key, l: layer(w, h, () => { camera(x, y, 1); screenArt(k, m, final, x, y, w, h); }) };
    screens.set(k, shown);
  }
  blit(shown.l, x, y);
}
const screens = new Map();
function screenArt(k, m, final, x, y, w, h) {
  // Ink outline, a steel bezel lit along its top and left, the dark glass.
  rect(x, y, w, h, C.ink);
  rect(x + 1, y + 1, w - 2, h - 2, C.steel0);
  rect(x + 1, y + 1, w - 2, 1, C.steel1);
  rect(x + 1, y + 1, 1, h - 2, C.steel1);
  rect(x + 3, y + 3, w - 6, h - 6, C.ink);
  rect(x + 4, y + 4, w - 8, h - 8, C.night0);
  const cx = x + w / 2;
  text(DIVISIONS[k].name, cx, y + 6, { font: 3, color: C.blue3, align: 'center' });
  // The score either side of the clock, in boxes like the intro's broadcast scoreboard.
  const by = y + 13, bw = 22;
  [[m.blue, x + 6, [C.blue0, C.blue1, C.blue2]], [m.red, x + w - 6 - bw, [C.red0, C.red1, C.red2]]].forEach(([n, bx, T]) => {
    rect(bx, by, bw, 11, T[1]);
    rect(bx, by, bw, 1, T[2]);
    rect(bx, by + 10, bw, 1, T[0]);
    text(String(n), bx + bw / 2, by + 2, { color: C.white, align: 'center' });
  });
  if (m.playing) text(clockText(m.clock), cx, by + 3, { font: 3, color: C.yel2, align: 'center' });
  else if (final) text('FINAL', cx, by + 3, { font: 3, color: C.yel2, align: 'center' });
  text(`QUAL ${m.qual}`, cx, by + 15, { font: 3, color: C.steel3, align: 'center' });
}

/** Past Newton: a yellow sign like the queue's, over the info desk, pointing the way to Einstein. */
function einsteinSign(view) {
  const x = LAST + 118, w = 120, y = 10, h = 20;
  if (!inView(view, x - 2, x + w + 4)) return;
  castShadow(view, x - 1, y - 1, w + 2, h + 2);
  cable(x + 8, y);
  cable(x + w - 9, y);
  blit(once('einstein', w + 2, h + 2, () => {
    camera(x - 1, y - 1, 1);
    einsteinArt(x, y, w, h);
  }), x - 1, y - 1);
}
function einsteinArt(x, y, w, h) {
  rect(x - 1, y - 1, w + 2, h + 2, C.ink);
  rect(x, y, w, h, C.yel1);
  rect(x, y, w, 1, C.yel2);
  rect(x, y + h - 1, w, 1, C.yel0);
  text('EINSTEIN', x + 8, y + 3, { color: C.ink });
  text('FINALS THIS WAY', x + 8, y + 12, { font: 3, color: C.ink });
  // The arrow, pointing on down the hall.
  const ax = x + w - 22, ay = y + 9;
  rect(ax, ay - 1, 9, 3, C.ink);
  for (let i = 0; i < 5; i++) rect(ax + 8 + i, ay - 4 + i, 1, 9 - 2 * i, C.ink);
}

/**
 * An end wall of the hall, from the roof to the floor: tilt-up concrete panels, their face toward the hall lit at the
 * right end (it faces the light) and in shade at the left, with seams, form-tie holes and an EXIT sign.
 */
function endWall(view, x0, side) {
  if (!inView(view, x0 - 2, x0 + WALL + 2)) return;
  blit(once(`wall-${side}`, WALL, 144 - TOP, () => {
    camera(x0, TOP, 1);
    wallArt(x0, side);
  }), x0, TOP);
  // The floor running up to the wall, in the wall's shadow: two columns, as dark as the shadows under people.
  G.fillStyle = 'rgba(5, 6, 13, 0.45)';
  G.fillRect((side === 'left' ? x0 + WALL : x0 - 2) - view.x, HEM + 1 - view.y, 2, 144 - HEM - 1);
}
function wallArt(x0, side) {
  const x1 = x0 + WALL, left = side === 'left';
  const face = left ? WALLS[2] : WALLS[0], hole = left ? '#1b1e2b' : WALLS[2], lip = left ? WALLS[1] : '#4a5166';
  const top = TOP, bottom = 144, cap = HEM + 6, cx = left ? x0 : x0 + 1, cw = WALL - 1;
  rect(x0, top, WALL, bottom - top, face);
  // From the skirting toward you, the floor runs along the wall's foot, so the wall shows as a box does (field.js
  // box()): its top, seen from above, in the lit concrete, speckled like the face.
  rect(cx, cap, cw, bottom - cap, WALLS[0]);
  for (let i = 0; i < 90; i++) {
    const y = TOP + Math.floor(rnd(i * 3 + x0) * 208);
    rect(x0 + 1 + Math.floor(rnd(i * 7 + x0 + 1) * (WALL - 2)), y, 1, 1, WALLS[1]);
  }
  // Panel seams, each with its lower lip catching the light, and the tie holes left by the forms in rows between, down
  // as far as the floor at the curtains' hem.
  for (let y = TOP + 22; y < HEM; y += 40) {
    rect(x0, y, WALL, 1, hole);
    rect(x0, y + 1, WALL, 1, lip);
    for (const dy of [-30, -10]) for (const dx of [6, 15, 24]) if (y + dy < HEM) rect(x0 + (left ? dx - 1 : dx), y + dy, 1, 1, hole);
  }
  // Where the wall meets the floor at the back of the hall: an ink line, then a skirting lit along its top.
  rect(x0, HEM, WALL, 1, C.ink);
  rect(x0, HEM + 1, WALL, 1, WALLS[0]);
  rect(x0, HEM + 2, WALL, 3, WALLS[2]);
  rect(x0, HEM + 5, WALL, 1, C.ink);
  // The wall's top: a lit lip along its back and its left edge, and (below) ink along the edge where it meets the
  // hall's floor.
  rect(cx, cap, 1, bottom - cap, '#4a5166');
  rect(cx, cap, cw, 1, '#4a5166');
  // The hall side's edge in ink.
  rect(left ? x1 - 1 : x0, top, 1, bottom - top, C.ink);
  // EXIT.
  const sx = left ? x0 + 5 : x0 + 6;
  rect(sx - 1, 15, 21, 11, C.ink);
  // The green of cast.js's green shirts, lit along the top and shaded along the bottom.
  const green = tones.shirtGreen;
  rect(sx, 16, 19, 9, green[1]);
  rect(sx, 16, 19, 1, green[2]);
  rect(sx, 24, 19, 1, green[0]);
  text('EXIT', sx + 10, 18, { font: 3, color: C.white, align: 'center' });
}

/**
 * The curtains between the divisions' stands with each division's sign and big screen, the right pad's curtain with the
 * way to Einstein, and the end walls. Drawn after the stands and the walkway, before the fields and the people.
 */
export function drawGateways(g, view, t) {
  begin(g, view);
  for (let k = 0; k < DIVISIONS.length; k++) {
    const x0 = k === 0 ? WALL : ox(k) - GATEWAY, x1 = ox(k) + GATEWAY;
    if (!inView(view, x0 - 6, x1 + 6)) continue;
    curtain(view, x0, x1);
    bigScreen(view, k, t);
    sign(view, k);
    // The lamps hang in front of the curtain's top.
    if (view.y < LAMP_Y + LAMP_H) lamps(view, x0, x1);
  }
  if (inView(view, LAST - 6, WORLD.w)) {
    curtain(view, LAST, WORLD.w - WALL);
    einsteinSign(view);
    if (view.y < LAMP_Y + LAMP_H) lamps(view, LAST, WORLD.w - WALL);
  }
  endWall(view, 0, 'left');
  endWall(view, WORLD.w - WALL, 'right');
}

// ---- On the floor ----
// Two tables, built like field.js's boxes: the top face lighter, the face toward you darker, an ink outline and a
// highlight along the lit top edge. Each is 30 inches tall at the rig's scale, 21 pixels.
const TABLE_H = 21;

/** The button traders' folding table under a teal cloth, rows of pins laid out on it and a card saying so. */
function buttonTable() {
  const { x0, x1, back, front } = BUTTON_TABLE, w = x1 - x0;
  const top = back - TABLE_H, edge = front - TABLE_H, hang = edge + 12;
  const TEAL = ['#5fd3c8', '#1c9a9a', '#0e5a5e'];
  // The folding legs and the shadow under the table, below the cloth.
  rect(x0 - 1, hang, w + 2, front - hang + 1, C.ink);
  rect(x0, hang, w, front - hang - 1, C.tire);
  for (const lx of [x0 + 3, x1 - 5]) {
    rect(lx, hang, 2, front - hang, C.steel1);
    rect(lx, hang, 1, front - hang, C.steel2);
  }
  // The cloth: over the top, and hanging down the front with a fold now and then.
  rect(x0 - 1, top - 1, w + 2, hang - top + 2, C.ink);
  rect(x0, top, w, edge - top, TEAL[1]);
  rect(x0, top, w, 1, TEAL[0]);
  rect(x0, edge, w, hang - edge, TEAL[2]);
  rect(x0, edge, w, 1, TEAL[1]);
  // Folds where the cloth falls over the edge, each pushing the hem down a pixel.
  for (const dx of [5, 12, 21, 27, 35]) {
    rect(x0 + dx, edge + 2, 1, hang - edge - 2, TEAL[1]);
    rect(x0 + dx - 1, hang, 3, 1, TEAL[2]);
    rect(x0 + dx - 1, hang + 1, 3, 1, C.ink);
  }
  // Buttons laid out in two rows: round pins, each an ink ring, a team's colour and a glint.
  const COLS = [C.blue1, C.red1, C.yel1, '#7cc21e', C.org1, '#d63a8a', C.blue2, '#1c9a9a'];
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 6 - row; i++) {
      const bx = x0 + 4 + i * 6 + (1 - row) * 3, by = top + 2 + row * 4;
      if (row === 0 && bx > x1 - 15) continue; // the card stands there
      disk(bx, by, 2, C.ink);
      rect(bx - 1, by - 1, 2, 2, COLS[(i * 3 + row * 5) % COLS.length]);
      rect(bx - 1, by - 1, 1, 1, C.white);
    }
  }
  // The card, folded to stand up: TRADE, hand-lettered.
  const cx = x1 - 12, cy = top - 4;
  rect(cx - 1, cy - 1, 23, 9, C.ink);
  rect(cx, cy, 21, 7, '#fff4ee');
  rect(cx, cy + 6, 21, 1, C.steel3);
  text('TRADE', cx + 11, cy + 1, { font: 3, color: C.red1, align: 'center' });
}

/** The info desk: a skirted table with INFO on it, maps to hand out and a laptop. */
function infoDesk() {
  const { x0, x1, back, front } = INFO_DESK, w = x1 - x0;
  const top = back - TABLE_H, edge = front - TABLE_H;
  // The skirt to the floor, shaded on the right and along the bottom.
  rect(x0 - 1, top - 1, w + 2, front - top + 2, C.ink);
  rect(x0, edge, w, front - edge, C.blue1);
  rect(x0, edge, w, 1, C.blue2);
  rect(x1 - 3, edge + 1, 3, front - edge - 1, C.blue0);
  rect(x0, front - 2, w, 2, C.blue0);
  for (let x = x0 + 5; x < x1 - 4; x += 7) rect(x, edge + 2, 1, front - edge - 4, C.blue0);
  // The top, light steel with a white lit edge along the back and a steel lip along the front.
  rect(x0, top, w, edge - top, C.steel3);
  rect(x0, top, w, 1, C.white);
  rect(x0, edge - 1, w, 1, C.steel2);
  // INFO on a dark panel on the skirt.
  const px = x0 + Math.floor(w / 2);
  rect(px - 11, edge + 4, 22, 9, C.blue0);
  text('INFO', px, edge + 6, { font: 3, color: C.white, align: 'center' });
  // A stack of maps on the left, and a small laptop on the right, its lid toward the volunteer.
  for (let i = 0; i < 3; i++) {
    rect(x0 + 5 - i, top + 1 - i * 2, 14, 4, C.ink);
    rect(x0 + 6 - i, top + 2 - i * 2, 12, 2, i === 2 ? C.white : C.tape);
    rect(x0 + 6 - i, top + 3 - i * 2, 12, 1, i === 2 ? C.yel1 : C.steel2);
  }
  const lx = x1 - 20;
  rect(lx - 1, top - 6, 14, 10, C.ink);
  rect(lx, top - 5, 12, 7, C.steel1);
  rect(lx, top - 5, 12, 1, C.steel2);
  rect(lx + 5, top - 3, 2, 2, C.steel2);
  rect(lx - 1, top + 2, 14, 1, C.steel2);
}

/**
 * A table as a thing to sort in with a field's: x its middle, y its front floor line, x0 to x1 as far across as its art
 * reaches. Its art (in the box x0, y0, w, h) is drawn once; draw() sets its own camera, since drawFieldLive leaves
 * pixel.js's on the division's local frame.
 */
function prop(key, table, x0, y0, w, h, art) {
  return {
    x: (table.x0 + table.x1) / 2, y: table.front, x0, x1: x0 + w,
    draw(g, view) {
      begin(g, view);
      if (!inView(view, x0, x0 + w) || view.y > y0 + h || view.y + 144 < y0) return;
      blit(once(key, w, h, () => { camera(x0, y0, 1); art(); }), x0, y0);
    },
  };
}
/** The two tables, to sort in with each field's things by their front floor lines. */
export const PROPS = [
  prop('buttons', BUTTON_TABLE, BUTTON_TABLE.x0 - 1, BUTTON_TABLE.back - TABLE_H - 5,
    BUTTON_TABLE.x1 - BUTTON_TABLE.x0 + 11, BUTTON_TABLE.front - BUTTON_TABLE.back + TABLE_H + 6, buttonTable),
  prop('info', INFO_DESK, INFO_DESK.x0 - 1, INFO_DESK.back - TABLE_H - 6,
    INFO_DESK.x1 - INFO_DESK.x0 + 2, INFO_DESK.front - INFO_DESK.back + TABLE_H + 7, infoDesk),
];
/**
 * The tables' footprints, which stop her (with field.js's margins round them): the table top, from just behind its back
 * edge to its front. The people working a table have footprints of their own (people.js), and the floor behind them,
 * along the curtain's hem, stays open, as it is in every aisle.
 */
export const PROP_BLOCKS = [BUTTON_TABLE, INFO_DESK].map(({ x0, x1, back, front }) => ({ x0, x1, y0: back - 2, y1: front }));

// ---- The light ----
/**
 * A spotlight cone from (x, y), in screen space: the intro's beam() (intro.js), written out again here because intro.js
 * can't be imported or changed. One flat triangle, 320 pixels long.
 */
function beam(g, x, y, angle, spread, a, c = '#cfe0ff') {
  withAlpha(a, () => {
    g.fillStyle = c;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.sin(angle - spread) * 320, y + Math.cos(angle - spread) * 320);
    g.lineTo(x + Math.sin(angle + spread) * 320, y + Math.cos(angle + spread) * 320);
    g.fill();
  });
}

/**
 * Spot cones from every other lit lamp in view, down across the stands and the fields: bold wedges like the intro's,
 * about four lamps wide where they reach the floor, leaning one way and the next the other (about 17 degrees) so they
 * cross, and swaying slowly. a: 0 to 1, how strong. Drawn last, over everything.
 */
export function drawBeams(g, view, t, a) {
  if (a <= 0) return;
  useContext(g);
  screen();
  for (const x of lampXs(view)) {
    const i = (x - LAMP_AT) / LAMP_STEP;
    if (i % 2 === 0 || !isOn(x, view)) continue;
    const sx = x - view.x, sy = LAMP_Y + LAMP_H - 1 - view.y;
    const angle = (i % 4 === 1 ? 0.3 : -0.3) + Math.sin(t * 0.7 + i * 1.9) * 0.08;
    beam(g, sx, sy, angle, 0.15, 0.12 * a);
  }
}
