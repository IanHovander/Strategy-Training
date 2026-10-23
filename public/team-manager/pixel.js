// Drawing helpers for the intro: one 256x144 canvas, a camera, blocky shapes and two bitmap fonts.
// Everything is drawn with filled rectangles snapped to the pixel grid, so it stays crisp at any scale.

export const W = 256;
export const H = 144;

// One palette for every scene. High contrast: dark navy space, light metal, saturated alliance colors.
export const C = {
  ink: '#0b0d17',
  night0: '#0a0d2b', night1: '#11184a', night2: '#1b2766', night3: '#2a3a8a', glow: '#4a3f9a',
  star: '#ffffff', starDim: '#7f93e8',
  steel0: '#232838', steel1: '#3f4761', steel2: '#7882a3', steel3: '#c4cbe0', white: '#ffffff',
  tire: '#2b2f3d',
  carpet0: '#24262f', carpet1: '#353845', carpet2: '#4a4e5e', tape: '#e8ecf5',
  blue0: '#0a237a', blue1: '#1d55e8', blue2: '#4a90ff', blue3: '#a8d2ff',
  red0: '#5e0d17', red1: '#d3212f', red2: '#ff5b4d', red3: '#ffb3a3',
  yel0: '#a3650a', yel1: '#ffc61a', yel2: '#fff17a',
  org0: '#7a2604', org1: '#ff7a1c', org2: '#ffb46a',
  stand0: '#0d1030', stand1: '#171c45', stand2: '#232a5c',
  skin: ['#f3c7a0', '#d39a6a', '#a8714a', '#6e4630', '#eabf91'],
  hair: ['#2a1a12', '#5a3418', '#d9a441', '#a33a1c', '#141414'],
};

let g = null;
/** Draw into this 2D context from now on. Returns the previous one. */
export function useContext(next) {
  const prev = g;
  g = next;
  return prev;
}

// World -> screen: sx = (wx - cam.x) * cam.s + cam.dx. dx/dy carry screen shake.
export const cam = { x: 0, y: 0, s: 1, dx: 0, dy: 0 };
export function camera(x, y, s = 1, shake = [0, 0]) {
  cam.s = s;
  cam.x = Math.round(x * s) / s;
  cam.y = Math.round(y * s) / s;
  cam.dx = shake[0];
  cam.dy = shake[1];
}
export const screen = () => camera(0, 0, 1);
/** Round a world coordinate to the screen's pixel grid, so a moving sprite never tears apart. */
export const snap = (v) => Math.round(v * cam.s) / cam.s;

export function fill(x, y, w, h, c) {
  if (w <= 0 || h <= 0) return;
  g.fillStyle = c;
  g.fillRect(x, y, w, h);
}
export function rect(x, y, w, h, c) {
  const s = cam.s;
  const x0 = Math.round((x - cam.x) * s) + cam.dx;
  const y0 = Math.round((y - cam.y) * s) + cam.dy;
  const x1 = Math.round((x + w - cam.x) * s) + cam.dx;
  const y1 = Math.round((y + h - cam.y) * s) + cam.dy;
  fill(x0, y0, x1 - x0, y1 - y0, c);
}
/** A filled pixel circle of diameter 2r whose top-left quarter ends at (cx, cy). */
export function disk(cx, cy, r, c) {
  for (let dy = -r; dy < r; dy++) {
    const hw = Math.round(Math.sqrt(r * r - (dy + 0.5) * (dy + 0.5)));
    rect(cx - hw, cy + dy, hw * 2, 1, c);
  }
}
export function withAlpha(a, draw) {
  if (a <= 0) return;
  const prev = g.globalAlpha;
  g.globalAlpha = prev * Math.min(1, a);
  draw();
  g.globalAlpha = prev;
}
/** Fades in four hard steps, the way old consoles did it. */
export const stepped = (a, steps = 4) => Math.round(clamp(a, 0, 1) * steps) / steps;

/** Checkerboard dither between two colors over a screen-space band. */
export function dither(x, y, w, h, a, b) {
  fill(x, y, w, h, a);
  g.fillStyle = b;
  for (let j = 0; j < h; j++) for (let i = (j + y + x) & 1; i < w; i += 2) g.fillRect(x + i, y + j, 1, 1);
}

// An offscreen canvas drawn once and blitted after. draw() runs with an identity camera.
export function layer(w, h, draw) {
  const canvas = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  const lctx = canvas.getContext('2d');
  const prev = useContext(lctx);
  const saved = { ...cam };
  screen();
  draw(lctx);
  Object.assign(cam, saved);
  useContext(prev);
  return { canvas, w, h };
}
/** Draw a layer at a world position, scaled by the camera. */
export function blit(l, x, y) {
  const s = cam.s;
  g.drawImage(l.canvas, Math.round((x - cam.x) * s) + cam.dx, Math.round((y - cam.y) * s) + cam.dy, l.w * s, l.h * s);
}

// ---- Numbers ----
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
/** 0 before b0, 1 after b1, a straight line between. */
export const seg = (t, t0, t1) => clamp((t - t0) / (t1 - t0), 0, 1);
export const easeOut = (t) => 1 - (1 - t) ** 3;
export const easeIn = (t) => t * t * t;
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const easeBack = (t) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2;
export function easeBounce(t) {
  const n = 7.5625, d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
}
/** The same "random" number for the same seed, so every frame is a pure function of time. */
export function rnd(i) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ---- Fonts ----
// F5: 5x7 capitals, one hex byte per row. F3: 3x5, one octal digit per row.
const F5_HEX = {
  A: '0e11111f111111', B: '1e11111e11111e', C: '0e11101010110e', D: '1c12111111121c', E: '1f10101e10101f',
  F: '1f10101e101010', G: '0e11101711110f', H: '1111111f111111', I: '0e04040404040e', J: '0702020202120c',
  K: '11121418141211', L: '1010101010101f', M: '111b1515111111', N: '11191915131311', O: '0e11111111110e',
  P: '1e11111e101010', Q: '0e11111115120d', R: '1e11111e141211', S: '0f10100e01011e', T: '1f040404040404',
  U: '1111111111110e', V: '11111111110a04', W: '1111111515150a', X: '11110a040a1111', Y: '1111110a040404',
  Z: '1f01020408101f', 0: '0e11131519110e', 1: '040c040404040e', 2: '0e11010204081f', 3: '1f02040201110e',
  4: '02060a121f0202', 5: '1f101e0101110e', 6: '0608101e11110e', 7: '1f010204080808', 8: '0e11110e11110e',
  9: '0e11110f01020c', '!': '04040404040004', '?': '0e110102040004', '.': '00000000000c0c', ',': '000000000c0408',
  ':': '000c0c000c0c00', '-': '0000000e000000', '+': '0004041f040400', "'": '04040800000000', '/': '01010204081010',
  '>': '10181c1e1c1810', '#': '00001f1f0e0400', '&': '0c12140815120d',
  '%': '18190204081303', '(': '02040808080402', ')': '08040202020408', '<': '02040810080402', '=': '00001f001f0000',
};
const F3_OCT = {
  A: '25755', B: '65656', C: '34443', D: '65556', E: '74647', F: '74644', G: '34553', H: '55755', I: '72227',
  J: '11152', K: '55655', L: '44447', M: '57755', N: '65555', O: '25552', P: '65644', Q: '25563', R: '65655',
  S: '34216', T: '72222', U: '55557', V: '55552', W: '55775', X: '55255', Y: '55222', Z: '71247',
  0: '75557', 1: '26227', 2: '61247', 3: '61216', 4: '55711', 5: '74616', 6: '34757', 7: '71122', 8: '75757',
  9: '75716', ':': '02020', '.': '00002', '-': '00700', '+': '02720', '!': '22202', '/': '11244', "'": '22000',
  '%': '51245', '?': '71202', ',': '00024', '(': '24442', ')': '21112', '<': '12421', '>': '42124',
  '=': '07070',
};
function buildFont(table, w, h, parseRow) {
  const font = new Map();
  for (const [ch, data] of Object.entries(table)) {
    font.set(ch, { w, rows: Array.from({ length: h }, (_, r) => parseRow(data, r)) });
  }
  font.set(' ', { w: 3, rows: new Array(h).fill(0) });
  font.h = h;
  return font;
}
const F5 = buildFont(F5_HEX, 5, 7, (s, r) => parseInt(s.slice(r * 2, r * 2 + 2), 16));
F5.set('©', { w: 7, rows: [0x3e, 0x41, 0x4d, 0x51, 0x4d, 0x41, 0x3e] });
const F3 = buildFont(F3_OCT, 3, 5, (s, r) => parseInt(s[r], 8));
F3.set(' ', { w: 2, rows: new Array(5).fill(0) });

const fontOf = (o) => (o.font === 3 ? F3 : F5);
const glyph = (font, ch) => font.get(ch) ?? font.get(ch.toUpperCase()) ?? font.get('?') ?? font.get(' ');

export function measure(str, o = {}) {
  const font = fontOf(o), s = o.scale ?? 1, sp = o.spacing ?? 1;
  let w = 0;
  for (const ch of str) w += (glyph(font, ch).w + sp) * s;
  return Math.max(0, w - sp * s);
}

/**
 * Bitmap text in world space (use screen() first for HUD text).
 * o: font (5 | 3), scale, spacing, color, rowColors (one per glyph row), outline, shadow, sx/sy (shadow offset),
 *    align ('left' | 'center' | 'right'), upto (only the first n characters).
 */
export function text(str, x, y, o = {}) {
  const font = fontOf(o), s = o.scale ?? 1, sp = o.spacing ?? 1;
  const width = measure(str, o);
  const x0 = o.align === 'center' ? x - Math.floor(width / 2) : o.align === 'right' ? x - width : x;
  const chars = [...str].slice(0, o.upto ?? Infinity);
  const sx = o.sx ?? 1, sy = o.sy ?? 1;
  const pass = (draw) => {
    let px = x0;
    for (const ch of chars) {
      const gl = glyph(font, ch);
      for (let r = 0; r < gl.rows.length; r++) {
        for (let col = 0; col < gl.w; col++) if ((gl.rows[r] >> (gl.w - 1 - col)) & 1) draw(px + col * s, y + r * s, r);
      }
      px += (gl.w + sp) * s;
    }
  };
  if (o.shadow) pass((X, Y) => (o.outline ? rect(X - 1 + sx, Y - 1 + sy, s + 2, s + 2, o.shadow) : rect(X + sx, Y + sy, s, s, o.shadow)));
  if (o.outline) pass((X, Y) => rect(X - 1, Y - 1, s + 2, s + 2, o.outline));
  pass((X, Y, r) => rect(X, Y, s, s, o.rowColors?.[r] ?? o.color ?? C.white));
  return width;
}

/**
 * The chunky title-logo treatment: fat letters, a thick outline, and a stepped 3D extrusion.
 * fillAt(y) picks the fill color for each screen row inside the letters.
 */
export function logoText(str, x, y, o) {
  const s = o.scale, sp = o.spacing ?? 1, ow = o.outlineW ?? 2;
  const pixels = [];
  let px = x;
  for (const ch of str) {
    const gl = glyph(F5, ch);
    for (let r = 0; r < 7; r++) for (let col = 0; col < gl.w; col++) if ((gl.rows[r] >> (gl.w - 1 - col)) & 1) pixels.push([px + col * s, y + r * s]);
    px += (gl.w + sp) * s;
  }
  const fat = o.fat ?? 1; // widen strokes sideways for a bolder face
  (o.extrude ?? []).forEach((c, i, all) => {
    const d = all.length - i;
    for (const [X, Y] of pixels) rect(X - ow + d, Y - ow + d, s + fat + ow * 2, s + ow * 2, c);
  });
  for (const [X, Y] of pixels) rect(X - ow, Y - ow, s + fat + ow * 2, s + ow * 2, o.outline);
  for (const [X, Y] of pixels) for (let j = 0; j < s; j++) rect(X, Y + j, s + fat, 1, o.fillAt(Y + j - y));
}
