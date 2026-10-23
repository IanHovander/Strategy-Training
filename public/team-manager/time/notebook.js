// Her scouting notebook, for travelling through time by flipping its pages: a spiral-bound spread on the desk, a
// moment of the event sketched in pencil on each right-hand page (her still in colour), the time written over it, and
// scouting notes and tallies on the left-hand pages. The notebook is what survives every loop, so it's what time
// runs through.
//
//   sketchOf(src, mask)              a frame of the big screen (getImageData's data) as a pencil sketch the size of
//                                    the picture on a page; pixels in mask (her) keep their colour
//   picturePage(sketch, time)        a right-hand page: the time, the sketch and a line of notes
//   notesPage(seed)                  a left-hand page of scouting notes, different for each seed
//   drawBook(g, left, right)         the desk and the open notebook with those two pages, into g
//   drawTurning(g, page, side, k)    a page turning over the spine: lying on side ('left' or 'right'), k from 0 (flat)
//                                    to 1 (upright); its outer edge lifts towards you as it rises
//   PAGE, PICTURE                    where the pages and the picture on a right-hand page are

import { W, H, C, fill, text, layer, useContext, screen, rnd } from '../pixel.js';

export const PAGE = { w: 118, h: 124, y: 11, left: 9, right: 129 };
/** The picture on a right-hand page, from the page's top left: the screen's shape, 106x60. */
export const PICTURE = { x: 6, y: 20, w: 106, h: 60 };
const PAPER = '#eef2f8', RULE = '#cfdaf0', MARGIN = '#f0b0b0', PENCIL = '#3d4256', PENCIL2 = '#8a90a6';
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const [PAPER_C, PENCIL_C, PENCIL2_C] = [PAPER, PENCIL, PENCIL2].map(rgb);

export function sketchOf(src, mask = null) {
  const L = new Float32Array(W * H);
  for (let p = 0, q = 0; p < W * H; p++, q += 4) L[p] = 0.3 * src[q] + 0.59 * src[q + 1] + 0.11 * src[q + 2];
  const out = new Uint8ClampedArray(PICTURE.w * PICTURE.h * 4);
  const sx = W / PICTURE.w, sy = H / PICTURE.h;
  for (let j = 0; j < PICTURE.h; j++) {
    for (let i = 0; i < PICTURE.w; i++) {
      const x0 = Math.floor(i * sx), x1 = Math.max(x0 + 1, Math.floor((i + 1) * sx));
      const y0 = Math.floor(j * sy), y1 = Math.max(y0 + 1, Math.floor((j + 1) * sy));
      let edge = 0, sum = 0, n = 0, her = -1;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const p = y * W + x;
          if (x + 1 < W) edge = Math.max(edge, Math.abs(L[p] - L[p + 1]));
          if (y + 1 < H) edge = Math.max(edge, Math.abs(L[p] - L[p + W]));
          sum += L[p];
          n++;
          if (mask?.[p]) her = p;
        }
      }
      const q = (j * PICTURE.w + i) * 4, l = sum / n;
      let c;
      if (her >= 0) c = [src[her * 4], src[her * 4 + 1], src[her * 4 + 2]];
      else if (edge > 55) c = PENCIL_C;
      else if (l < 55) c = (i + j) % 2 ? PENCIL2_C : PAPER_C; // dark: cross-hatched
      else if (l < 105) c = (i - j + 64) % 3 ? PAPER_C : PENCIL2_C; // mid: a light hatch
      else c = PAPER_C;
      out[q] = c[0]; out[q + 1] = c[1]; out[q + 2] = c[2]; out[q + 3] = 255;
    }
  }
  return out;
}

/** Ruled paper, with the margin on the outer side. */
function paper(side) {
  fill(0, 0, PAGE.w, PAGE.h, PAPER);
  for (let y = 12; y < PAGE.h - 4; y += 8) fill(0, y, PAGE.w, 1, RULE);
  fill(side === 'left' ? 10 : PAGE.w - 11, 0, 1, PAGE.h, MARGIN);
}
/** Tally marks: groups of four with a stroke across. */
function tally(x, y, n) {
  for (let i = 0; i < n; i++) {
    const g = Math.floor(i / 5), k = i % 5;
    if (k < 4) fill(x + g * 8 + k * 2, y, 1, 5, PENCIL);
    else for (let d = 0; d < 7; d++) fill(x + g * 8 - 1 + d, y + 4 - Math.floor(d * 5 / 7), 1, 1, PENCIL);
  }
}
const TEAMS = ['1690', '2056', '6417', '1114', '4000', '2468', '3000', '7777', '8086', '9152'];
const NOTES = ['L3 CLIMB', 'HATCH', 'CARGO', 'DEFENSE', 'BROKE', 'SANDSTORM', 'L2 CLIMB', 'FAST'];

export function picturePage(sketch, time) {
  return layer(PAGE.w, PAGE.h, (g) => {
    paper('right');
    text(time, 8, 7, { font: 3, color: PENCIL });
    fill(PICTURE.x - 1, PICTURE.y - 1, PICTURE.w + 2, PICTURE.h + 2, PENCIL2);
    const img = new ImageData(sketch, PICTURE.w, PICTURE.h);
    const l = layer(PICTURE.w, PICTURE.h, (lg) => lg.putImageData(img, 0, 0));
    g.drawImage(l.canvas, PICTURE.x, PICTURE.y);
    text('WHAT DID I MISS?', 8, 90, { font: 3, color: PENCIL2 });
    tally(8, 100, 7);
  });
}

export function notesPage(seed) {
  return layer(PAGE.w, PAGE.h, () => {
    paper('left');
    text(`QUAL ${10 + Math.floor(rnd(seed) * 60)}`, 14, 4, { font: 3, color: PENCIL });
    for (let r = 0; r < 11; r++) {
      const y = 14 + r * 8;
      const team = TEAMS[Math.floor(rnd(seed * 7 + r) * TEAMS.length)];
      text(team, 14, y + 1, { font: 3, color: PENCIL });
      if (rnd(seed * 13 + r) < 0.25) {
        text('?', 34, y + 1, { font: 3, color: C.red1 });
      } else {
        text(NOTES[Math.floor(rnd(seed * 3 + r) * NOTES.length)], 34, y + 1, { font: 3, color: PENCIL2 });
        tally(80, y + 1, 1 + Math.floor(rnd(seed * 5 + r) * 9));
      }
    }
  });
}

export function drawBook(g, left, right) {
  useContext(g);
  screen();
  fill(0, 0, W, H, C.night0);
  for (let y = 0; y < H; y += 4) fill(0, y, W, 1, C.night1);
  fill(PAGE.left + 2, PAGE.y + 2, PAGE.w * 2 + 2, PAGE.h, C.ink);
  if (left) g.drawImage(left.canvas, PAGE.left, PAGE.y);
  if (right) g.drawImage(right.canvas, PAGE.right, PAGE.y);
  spiral();
}
export function spiral() {
  for (let y = PAGE.y + 5; y < PAGE.y + PAGE.h - 4; y += 6) {
    fill(124, y, 10, 3, C.ink);
    fill(125, y, 8, 1, C.steel3);
    fill(125, y + 1, 8, 1, C.steel2);
  }
}

export function drawTurning(g, page, side, k) {
  useContext(g);
  screen();
  const w = Math.round(PAGE.w * Math.cos((Math.PI / 2) * k));
  if (w <= 0) return;
  const lift = Math.sin((Math.PI / 2) * k) * 7;
  for (let i = 0; i < w; i++) {
    const outer = side === 'right' ? i / w : 1 - i / w; // 0 at the spine, 1 at the outer edge
    const dx = side === 'right' ? PAGE.right + i : PAGE.left + PAGE.w - w + i;
    const srcX = Math.min(PAGE.w - 1, Math.floor((i / w) * PAGE.w));
    const up = Math.round(lift * outer);
    g.drawImage(page.canvas, srcX, 0, 1, PAGE.h, dx, PAGE.y - up, 1, PAGE.h + up * 2);
  }
  // Shade it as it stands up, away from the light.
  g.globalAlpha = 0.45 * k;
  g.fillStyle = C.ink;
  g.fillRect(side === 'right' ? PAGE.right : PAGE.left + PAGE.w - w, PAGE.y - lift, w, PAGE.h + lift * 2);
  g.globalAlpha = 1;
  spiral();
}
