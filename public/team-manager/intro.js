// The opening of the FRC team manager game: a 26-second pixel-art sizzle reel, then the title screen.
//   1 logo      a shooting star writes the studio name
//   2 rocket    tilt down from the stars; the blue elevator robot races in to the 2019 rocket
//   3 lift      the elevator runs straight up to level 3; hatch on the top port
//   4 pan       whip pan to a red defender; close-ups of both robots
//   5 clash     the hit, a spin move, then a sprint to the endgame
//   6 hab       a level 3 climb that beats the buzzer
//   7 win       final score, the team, and the blue banner going up
// then the title screen loops, the song fading down under it (LEVEL). Every frame is drawn from the music clock, so cuts
// land on the beat.
// It can also play over a recorded song (songs.js): <canvas data-song="compete-to-win-3">, or ?song=... to pick
// another (?song=chip for the chiptune). If the song file can't be loaded, it falls back to the chiptune.
// URL options for testing: ?at=SECONDS (freeze that frame), ?title (start at the title), ?mute.

import {
  W, H, C, useContext, camera, screen, fill, rect, text, measure, layer, blit, withAlpha, stepped,
  clamp, lerp, seg, easeOut, easeIn, easeInOut, easeBack, easeBounce, rnd, logoText, disk,
} from './pixel.js';
import {
  eleBot, defBot, armBot, rocket, hab, HAB, hatchHeight, makeSky, makeStands, makeCarpet, sky, arena, sparkle, person,
  banner, ROCKET_LEVELS,
} from './sprites.js';
import { Chip, Player, BEAT, INTRO_BEATS } from './chip.js';
import { SONGS } from './songs.js';
import { beam } from './lights.js';
import { NAME_MAX, cleanName, savedName, saveName } from './player.js';
import { drawHero, heroIdle } from './hero.js';

// The working title. Change it here; the logo is sized from the text.
const GAME_TITLE = 'BLUE BANNER';
const SUBTITLE = 'AN FRC TEAM MANAGER';
const STUDIO = 'STRATEGY TRAINING';

const canvas = document.getElementById('screen');
const g = canvas.getContext('2d', { alpha: false });
canvas.width = W;
canvas.height = H;
g.imageSmoothingEnabled = false;
useContext(g);

const params = new URLSearchParams(location.search);
const frozenAt = params.has('at') ? Number(params.get('at')) : null;
let SONG = SONGS[params.get('song') ?? canvas.dataset.song] ?? null;
const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// ---- Art made once ----
const SKY = makeSky();
const STANDS = [makeStands(0), makeStands(1)];
const CARPET = makeCarpet();
const LOGO = (() => {
  const s = 3, w = measure(GAME_TITLE, { scale: s }) + 14, h = 7 * s + 12;
  return layer(w, h, () =>
    logoText(GAME_TITLE, 4, 4, {
      scale: s, fat: 1, outline: C.ink, outlineW: 2, extrude: [C.ink, C.blue0, C.blue0, C.blue1],
      fillAt: (y) => (y < 5 ? C.yel2 : y < 13 ? C.yel1 : y < 17 ? '#ffa31a' : C.org1),
    }),
  );
})();
// The logo's letters in white, for the shine that sweeps across them.
const LOGO_SHINE = layer(LOGO.w, LOGO.h, (ctx) => {
  ctx.drawImage(LOGO.canvas, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = C.white;
  ctx.fillRect(0, 0, LOGO.w, LOGO.h);
});

// ---- Effects (all pure functions of time). The screen-space ones draw with fill() and leave the camera alone. ----
function shake(b, b0, dur, amp) {
  if (reduceMotion || b < b0 || b >= b0 + dur) return [0, 0];
  const a = Math.ceil(amp * (1 - (b - b0) / dur));
  const i = Math.floor(b * 24);
  return [Math.round((rnd(i) * 2 - 1) * a), Math.round((rnd(i + 0.5) * 2 - 1) * a)];
}
const plus = (...all) => all.reduce((a, v) => [a[0] + v[0], a[1] + v[1]], [0, 0]);
function flash(b, b0, dur = 0.15, c = C.white) {
  if (b < b0 || b >= b0 + dur) return;
  withAlpha((reduceMotion ? 0.35 : 1) * stepped(1 - (b - b0) / dur), () => fill(0, 0, W, H, c));
}
function cover(a, c = C.ink) {
  if (a <= 0) return;
  withAlpha(stepped(a), () => fill(0, 0, W, H, c));
}
/** Horizontal streaks across the screen; amount 0..1. */
function speedLines(amount, seed, color = C.white, y0 = 0, y1 = H) {
  if (amount <= 0.05) return;
  const n = Math.round(amount * 16);
  withAlpha(0.55, () => {
    for (let i = 0; i < n; i++) {
      const len = Math.round(16 + rnd(seed + i * 1.3) * 70 * amount);
      fill(Math.floor(rnd(seed + i * 2.1) * (W + len)) - len, Math.floor(y0 + rnd(seed + i * 3.7) * (y1 - y0)), len, 1, color);
    }
  });
}
/** Dust or tire smoke left behind by something at xAt(t). */
function dust(xAt, y, b, b0, b1, count, drift = -1, life = 1) {
  for (let i = 0; i < count; i++) {
    const t0 = lerp(b0, b1, i / count), age = b - t0;
    if (age < 0 || age > life) continue;
    const k = age / life;
    const x = Math.round(xAt(t0) + drift * k * 10 + (rnd(i + b0) - 0.5) * 5);
    const yy = Math.round(y - k * 7 - rnd(i + 3 + b0) * 3), r = Math.round(1 + k * 4);
    withAlpha(stepped(1 - k), () => {
      disk(x, yy, r + 1, C.steel1);
      disk(x, yy, r, k < 0.5 ? C.steel3 : C.steel2);
    });
  }
}
function sparks(x, y, b, b0, n, speed = 40, life = 0.8, seed = 1) {
  const age = b - b0;
  if (age < 0 || age > life) return;
  for (let i = 0; i < n; i++) {
    const a = rnd(seed + i) * Math.PI * 2, v = speed * (0.45 + rnd(seed + i + 0.4) * 0.7);
    const px = Math.round(x + Math.cos(a) * v * age), py = Math.round(y + Math.sin(a) * v * age + 40 * age * age);
    rect(px, py, 1, 1, age < life * 0.3 ? C.white : age < life * 0.65 ? C.yel2 : C.org1);
    rect(Math.round(px - Math.cos(a) * 2), Math.round(py - Math.sin(a) * 2), 1, 1, C.org1);
  }
}
/** A comic-book impact star. */
function burst(x, y, r, c1, c2) {
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + 0.3, len = r * (k % 2 ? 0.55 : 1);
    for (let t = 0; t < len; t++) {
      const w = Math.max(1, Math.round(3 * (1 - t / len)));
      rect(Math.round(x + Math.cos(a) * t - w / 2), Math.round(y + Math.sin(a) * t - w / 2), w, w, t < len * 0.5 ? c1 : c2);
    }
  }
  disk(x, y, Math.round(r * 0.35), c1);
}
function confetti(b, b0, n = 80) {
  if (b < b0) return;
  const cols = [C.blue2, C.white, C.yel1, C.blue3, C.yel2];
  for (let i = 0; i < n; i++) {
    const age = b - b0 - rnd(i + 2) * 2.5;
    if (age < 0) continue;
    const y = Math.round(-4 + age * (16 + rnd(i + 1) * 22));
    if (y > H) continue;
    const x = Math.round(rnd(i) * W + Math.sin(age * 2.5 + i) * 6);
    const flip = Math.floor(age * 6 + i) % 2;
    fill(x, y, flip ? 2 : 1, flip ? 1 : 2, cols[i % cols.length]);
  }
}
function rays(cx, cy, turn, a, c) {
  withAlpha(a, () => {
    g.fillStyle = c;
    for (let k = 0; k < 12; k++) {
      const a0 = turn + (k / 12) * Math.PI * 2;
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a0) * 300, cy + Math.sin(a0) * 300);
      g.lineTo(cx + Math.cos(a0 + 0.22) * 300, cy + Math.sin(a0 + 0.22) * 300);
      g.fill();
    }
  });
}
/** Diagonal stripes sliding across a solid background, for the close-ups and the score card. */
function stripes(bg, fg, B, speed, dir = 1, gap = 22, w = 8) {
  fill(0, 0, W, H, bg);
  const off = ((B * speed * dir) % gap + gap) % gap;
  for (let y = 0; y < H; y++) for (let x = -gap * 2 + off - y * 0.5; x < W; x += gap) fill(Math.round(x), y, w, 1, fg);
}
/** The broadcast scoreboard across the top of the screen. */
function scoreboard(blue, red, secs) {
  screen();
  const x = 78, y = 3;
  fill(x - 1, y - 1, 102, 15, C.ink);
  fill(x, y, 34, 13, C.blue1);
  fill(x, y, 34, 1, C.blue2);
  fill(x + 66, y, 34, 13, C.red1);
  fill(x + 66, y, 34, 1, C.red2);
  text(String(blue), x + 17, y + 3, { align: 'center' });
  text(String(red), x + 83, y + 3, { align: 'center' });
  const late = secs <= 3;
  text(`0:${String(secs).padStart(2, '0')}`, x + 50, y + 3, { align: 'center', color: late ? C.red2 : C.yel2 });
}
const rslOn = (B) => Math.floor(B) % 2 === 0;
// The main character in the middle of the team holding up the banner (the title screen draws her full size, hero.js).
const HERO = { skin: 4, hair: 4, style: 'long' };
// The defender's light blinks a beat after the hero's, so the two alternate like a tick-tock (0 = in unison).
const DEFENDER_RSL_OFFSET = 1;
const rslDefender = (B) => rslOn(B + DEFENDER_RSL_OFFSET);
const crowd = (B) => STANDS[Math.floor(B * 2) % 2];

// ---- Shots. b = beats into the shot, B = beats into the whole intro. ----

function shotLogo(b, B) {
  screen();
  fill(0, 0, W, H, C.ink);
  withAlpha(stepped(seg(b, 0, 1.5)), () => sky(SKY, 144, B));
  // The shooting star writes the studio name as it passes.
  const sx = -30, ex = 290, sy = 30, ey = 80, t0 = 0.5, t1 = 2.4;
  const p = seg(b, t0, t1), hx = lerp(sx, ex, p), hy = lerp(sy, ey, p);
  const tw = measure(STUDIO, { scale: 2 }), tx = 128 - Math.floor(tw / 2), ty = 50;
  let shown = 0, cx = tx;
  const born = [];
  for (const ch of STUDIO) {
    const at = t0 + ((cx + 4 - sx) / (ex - sx)) * (t1 - t0);
    born.push([cx + 5, at]);
    if (b >= at) shown++;
    cx += ch === ' ' ? 8 : 12;
  }
  const rows = [C.white, C.white, C.blue3, C.blue3, C.blue2, C.blue2, C.blue2];
  text(STUDIO, tx, ty, { scale: 2, upto: shown, outline: C.ink, shadow: C.blue0, sx: 0, sy: 2, rowColors: rows });
  // A glint runs along the finished name.
  if (b > 3.4 && b < 4.4) {
    const band = lerp(tx - 20, tx + tw + 20, seg(b, 3.4, 4.4));
    g.save();
    g.beginPath();
    g.rect(Math.round(band), 0, 8, H);
    g.clip();
    text(STUDIO, tx, ty, { scale: 2, color: C.white });
    g.restore();
  }
  for (const [x, at] of born) {
    const age = b - at;
    if (age >= 0 && age < 0.7) sparkle(x, ty - 4 + Math.round(age * 6), age < 0.35 ? 2 : 1, age < 0.2 ? C.white : C.yel2);
  }
  withAlpha(stepped(seg(b, 3.2, 4)), () => text('PRESENTS', 128, 76, { align: 'center', spacing: 3, color: C.steel2 }));
  if (b >= t0 && b <= t1 + 0.4) {
    const trail = [C.white, C.white, C.yel2, C.yel2, C.yel1, C.blue3, C.blue3, C.blue2, C.blue2, C.blue1];
    for (let i = 24; i >= 0; i--) {
      const q = p - i * 0.006;
      if (q < 0) continue;
      const x = Math.round(lerp(sx, ex, q)), y = Math.round(lerp(sy, ey, q));
      const c = trail[Math.min(trail.length - 1, Math.floor(i / 2.5))];
      if (i > 14 && i % 2) continue;
      fill(x, y, i < 6 ? 2 : 1, i < 6 ? 2 : 1, c);
    }
    if (p < 1) sparkle(Math.round(hx), Math.round(hy), Math.floor(B * 6) % 2 ? 3 : 2, C.white);
  }
  cover(seg(b, 6.4, 8));
}

/**
 * The rocket as the hero finds it: hatch panels on both faces of levels 1 and 2, cargo in both of level 1's bays and in
 * the bay behind level 2's left panel (cargo only stays behind a hatch panel), level 3 empty for the hero's hatch.
 */
const ROCKET_FILL = { home: [1, 1, 0], away: [1, 1, 0], cargo: [[1, 1], [1, 0], 0] };

function shotRocket(b, B) {
  const look = 240 * (1 - easeInOut(seg(b, 0, 4.5)));
  camera(0, -116 - look, 1);
  sky(SKY, Math.min(144, look * 0.6), B);
  arena(crowd(B), CARPET);
  rocket(150, ROCKET_FILL);
  const xAt = (t) => lerp(-40, 130, easeOut(seg(t, 3.4, 5.4)));
  const x = xAt(b), speed = 1 - seg(b, 3.4, 5.2);
  if (b > 3.4) {
    dust(xAt, -2, b, 4.6, 5.6, 6, -1, 0.9);
    for (let i = 0; i < 5 && speed > 0.2; i++) rect(Math.round(x - 22 - i * 9 - speed * 20), -10 - i * 7, Math.round(speed * 30), 1, C.blue3);
    eleBot(x, 0, { hatch: true, spin: x * 0.64, rsl: rslOn(B) });
  }
  cover(1 - seg(b, 0, 0.6));
}

function shotLift(b, B) {
  // One smooth run straight to level 3: both stages travel together (the inner one a hair behind, like a cascade
  // elevator) and settle at the top.
  const settle = Math.sin(Math.PI * seg(b, 2.9, 3.3)) * 0.04;
  const e1 = easeInOut(seg(b, 0.2, 2.7)) + settle, e2 = easeInOut(seg(b, 0.4, 2.9)) + settle;
  const placed = b >= 4;
  const reach = b < 3.2 ? 0 : !placed ? Math.round(seg(b, 3.2, 3.9) * 3) : Math.round((1 - seg(b, 4.2, 4.8)) * 3);
  const hy = hatchHeight(e1, e2);
  const camY = Math.min(-65, hy - 35);
  camera(76, camY, 2, shake(b, 4, 0.5, 3));
  sky(SKY, clamp(30 + (-65 - camY) * 1.2, 0, 144), B);
  arena(crowd(B), CARPET);
  // The lower ports light up in turn after the hatch lands; level 3 stays steady (no light, no twinkle) into the cut.
  const lights = [b > 4.5, b > 4.75, false];
  rocket(150, { ...ROCKET_FILL, home: [1, 1, placed], lights });
  eleBot(130, 0, { e1, e2, hatch: !placed, reach, rsl: rslOn(B) });
  const port = ROCKET_LEVELS[2];
  sparks(148, port, b, 4, 12, 26, 0.9, 3);
  if (b >= 4 && b < 4.25) burst(147, port, 9, C.white, C.yel2);
  if (b >= 4 && b < 6.2) {
    const k = seg(b, 4, 6.2);
    withAlpha(stepped(1 - seg(b, 5.4, 6.2)), () => text('+2', 138, Math.round(port - 14 - k * 10), { color: C.yel2, outline: C.ink, align: 'center' }));
  }
  flash(b, 4, 0.12);
}

function shotPan(b, B) {
  if (b < 4) {
    const panX = (t) => 330 * easeInOut(seg(t, 0.4, 2.6));
    const px = panX(b), v = (panX(b + 0.02) - px) / 0.02 / 230;
    camera(px, -116, 1);
    sky(SKY, 0, B);
    arena(crowd(B), CARPET);
    rocket(150, { ...ROCKET_FILL, home: [1, 1, 1], lights: [1, 1, 1] });
    eleBot(130, 0, { e1: 1 - easeInOut(seg(b, 0.3, 1)), e2: 1 - easeInOut(seg(b, 0, 0.6)), rsl: rslOn(B) });
    const rev = b > 2.6 && Math.floor(B * 10) % 2 ? -1 : 0;
    if (b > 2.6) dust(() => 490, -2, b, 2.6, 4, 7, 1, 0.8);
    defBot(470, rev, { spin: B * 6, glint: seg(b, 3.2, 3.7), rsl: rslDefender(B) });
    speedLines(clamp(v, 0, 1), Math.floor(B * 20) * 7, C.white, 10, 130);
    return;
  }
  if (b < 6) {
    // Close-up: the defender. Engine revving, light bar glinting.
    stripes(C.red0, C.red1, B, 90, -1);
    screen();
    fill(0, 128, W, 16, C.ink);
    fill(0, 128, W, 1, C.red2);
    const rev = Math.floor(B * 10) % 2 ? -1 / 3 : 0;
    camera(-50, -43.4, 3);
    defBot(0, rev, { spin: B * 9, glint: seg(b, 4.3, 4.9), rsl: rslDefender(B) });
    const s = b - 4.85;
    if (s > 0 && s < 0.7) sparkle(-17, -20, s < 0.15 ? 2 : s < 0.45 ? 4 : 2, C.white);
    speedLines(0.5, Math.floor(B * 20) * 3, C.red3, 0, 120);
    flash(b, 4, 0.1);
    return;
  }
  // Close-up: the hero.
  stripes(C.blue0, C.blue1, B, 90, 1);
  screen();
  fill(0, 136, W, 8, C.ink);
  fill(0, 136, W, 1, C.blue2);
  camera(-33, -45.4, 3);
  const lunge = b > 7.3 ? 1 : 0;
  eleBot(lunge, 0, { rsl: rslOn(B), spin: B * 4, e1: 0.12 * easeBack(seg(b, 6.4, 6.9)) });
  const s = b - 7.25;
  if (s > 0 && s < 0.6) sparkle(8, -50, s < 0.15 ? 2 : s < 0.4 ? 3 : 1, C.white);
  speedLines(0.4, Math.floor(B * 20) * 5, C.blue3, 0, 130);
  flash(b, 6, 0.1);
}

function shotClash(b, B) {
  if (b >= 5) return shotSprint(b, B);
  // Hero: braced, shoved back, spins past, gone.
  let hx = 72, hy = 0, k = 1;
  if (b >= 2 && b < 3) hx = lerp(72, 58, easeOut(seg(b, 2, 2.6)));
  else if (b >= 3 && b < 4) {
    const s = easeInOut(seg(b, 3, 4));
    hx = lerp(58, 128, s);
    hy = Math.round(Math.sin(s * Math.PI) * 6);
    k = Math.cos(s * Math.PI * 2);
  } else if (b >= 4) hx = lerp(128, 230, easeIn(seg(b, 4, 5)));
  // Defender: charges, pushes, lunges into empty carpet, skids.
  let dx;
  if (b < 2) dx = lerp(220, 106, easeIn(seg(b, 0.2, 2)));
  else if (b < 3) dx = lerp(106, 92, easeOut(seg(b, 2, 2.6)));
  else dx = lerp(92, 52, easeOut(seg(b, 3, 4.4)));
  const camX = 10 + 30 * easeInOut(seg(b, 3, 5));
  camera(camX, -62, 2, shake(b, 2, 0.6, 4));
  sky(SKY, 20, B);
  arena(crowd(B), CARPET);
  const rev = b < 2 && Math.floor(B * 10) % 2 ? -0.5 : 0;
  defBot(dx, 0, { spin: dx * 0.64, glint: b < 2 ? (B * 2) % 1 : null, rsl: rslDefender(B) });
  dust(() => dx + 18, -1, b, 0.4, 2, 8, 1, 0.7);
  dust(() => hx - 12, -1, b, 2, 3, 6, -1, 0.8);
  dust((t) => lerp(92, 52, easeOut(seg(t, 3, 4.4))) + 16, -1, b, 3.3, 4.6, 7, 1, 0.8);
  if (b >= 3 && b < 4) {
    // Afterimages trace the spin.
    for (const [lag, a] of [[0.12, 0.25], [0.06, 0.45]]) {
      const s = easeInOut(seg(b - lag, 3, 4));
      withAlpha(a, () => eleBot(lerp(58, 128, s), Math.round(Math.sin(s * Math.PI) * 6), { k: Math.cos(s * Math.PI * 2), rsl: false }));
    }
  }
  eleBot(hx, hy + rev, { k, spin: hx * 0.64 + (b > 2 && b < 3 ? B * 12 : 0), rsl: rslOn(B) });
  sparks(88, -9, b, 2, 18, 40, 0.8, 11);
  if (b >= 2 && b < 2.3) burst(88, -10, 14, C.white, C.yel1);
  if (b > 4 && b < 4.9) speedLines(0.8, Math.floor(B * 20) * 9, C.blue3, 60, 120);
  flash(b, 2, 0.12);
}

function shotSprint(b, B) {
  const hx = 1000 + (b - 5) * 260;
  camera(hx - 50, -62, 2);
  sky(SKY, 20, B);
  arena(crowd(B), CARPET, { parallax: 0.8 });
  for (const [lag, a] of [[24, 0.18], [12, 0.35]]) withAlpha(a, () => eleBot(hx - lag, 0, { spin: hx, rsl: false }));
  eleBot(hx, 0, { spin: hx * 0.64, rsl: rslOn(B) });
  dust((t) => 1000 + (t - 5) * 260 - 14, -1, b, 5, 8, 10, -3, 0.5);
  speedLines(1, Math.floor(B * 20) * 13, C.white, 20, 130);
  // ENDGAME slides through on a black band.
  if (b > 6.4) {
    screen();
    const open = seg(b, 6.4, 6.6) * (1 - seg(b, 7.8, 8));
    const hh = Math.round(14 * open);
    fill(0, 64 - hh, W, hh * 2, C.ink);
    fill(0, 64 - hh, W, 1, C.yel1);
    fill(0, 63 + hh, W, 1, C.yel1);
    const tx = b < 7.6 ? lerp(330, 128, easeOut(seg(b, 6.5, 6.9))) : lerp(128, -80, easeIn(seg(b, 7.6, 8)));
    if (hh > 7) text('ENDGAME', Math.round(tx), 57, { scale: 2, align: 'center', color: C.yel1, shadow: C.org0, sx: 0, sy: 2 });
  }
  flash(b, 5, 0.08);
}

function shotHab(b, B, info) {
  // The climb, step by step, all before the buzzer at beat 8.
  let x, lift, front, rear;
  if (b < 1) [x, lift] = [lerp(50, 131, easeOut(seg(b, 0, 1))), 0];
  else if (b < 3) [x, lift] = [131, 16 * easeInOut(seg(b, 1, 3))];
  else if (b < 3.75) [x, lift] = [lerp(131, 145, easeInOut(seg(b, 3, 3.75))), 16];
  else if (b < 4.5) [x, lift] = [145, lerp(16, 14, seg(b, 3.75, 4.5))];
  else if (b < 6) [x, lift] = [lerp(145, 156, easeInOut(seg(b, 4.5, 6))), 14];
  else if (b < 6.75) [x, lift] = [156, 14];
  else [x, lift] = [lerp(156, 170, easeInOut(seg(b, 6.75, 7.5))), 14];
  front = b < 3.75 ? lift : lerp(16, 0, seg(b, 3.75, 4.5));
  rear = b < 6 ? lift : lerp(14, 0, seg(b, 6, 6.75));
  // Motors judder while they work.
  const working = (b > 1 && b < 3) || (b > 3.75 && b < 4.5) || (b > 6 && b < 6.75);
  const jit = working && Math.floor(B * 16) % 2 ? 0.5 : 0;
  const done = b >= 8;
  const camX = lerp(30, 94, easeOut(seg(b, 0, 1.2)));
  const camY = lerp(-64, -72, easeInOut(seg(b, 1, 3)));
  camera(camX, camY, 2, plus(shake(b, 8, 0.5, 2), shake(b, 8.5, 0.4, 3)));
  sky(SKY, 30, B);
  arena(crowd(B), CARPET);
  hab(150, { cheer: done, t: B, glow: done ? Math.floor(B * 2) % 2 === 0 : false });
  dust(() => x - 14, HAB.l1 - 1, b, 0.6, 1.3, 5, -1, 0.8);
  // The body shudders up and down while the stilt feet stay planted on level 1.
  eleBot(x, HAB.l1, { lift: lift + jit, front: front ? front + jit : 0, rear: rear ? rear + jit : 0, spin: x * 0.64, rsl: done ? true : rslOn(B) });
  if (working) sparks(x + (b < 4.5 ? 1 : -12), HAB.l1 - 2, b, Math.floor(b * 4) / 4, 3, 14, 0.25, Math.floor(b * 4));
  // The match clock: real seconds over a song; over the chip score a second is two beats, so it shows 4 as the robot
  // arrives and 1 as the rear legs start up. Its last three seconds also count down big.
  const [left, secLen] = info?.buzzer != null ? [info.buzzer - info.t, 1] : [(8 - b) / 2, 2 * BEAT];
  const secs = done ? 0 : Math.max(0, Math.ceil(left - 1e-6));
  const blue = done ? Math.round(lerp(64, 76, seg(b, 8.3, 9))) : 64;
  scoreboard(blue, 71, secs);
  if (!done && left > 0 && left <= 3) {
    const pop = (secs - left) * secLen; // seconds since this number came up
    screen();
    text(String(secs), 32, pop < 0.12 ? 22 : 26, {
      scale: pop < 0.12 ? 7 : 6, align: 'center', color: pop < 0.05 ? C.white : C.red2, outline: C.ink, shadow: C.red0, sx: 2, sy: 2,
    });
  }
  if (b > 8.5) {
    const k = easeBack(seg(b, 8.5, 8.9));
    screen();
    text('HAB 3', 64, Math.round(lerp(150, 34, k)), { scale: 3, align: 'center', color: C.yel1, outline: C.ink, shadow: C.blue0, sx: 2, sy: 2, rowColors: [C.yel2, C.yel2, C.yel1, C.yel1, C.yel1, C.org1, C.org1] });
    if (b > 8.9) text('+12', 64, 62, { scale: 2, align: 'center', color: C.white, outline: C.ink });
    if (b > 9) sparkle(Math.round(30 + rnd(Math.floor(B * 3)) * 70), Math.round(30 + rnd(Math.floor(B * 3) + 1) * 30), 2, C.white);
  }
  flash(b, 8, 0.2);
  cover(1 - seg(b, 0, 0.25), C.white);
}

function shotWin(b, B) {
  if (b < 2) return scoreCard(b, B);
  const holding = b >= 4;
  const rise = 40 * (1 - easeBack(seg(b, 4, 5)));
  const camY = lerp(-70, -104, easeInOut(seg(b, 4.3, 6.8)));
  camera(4, camY, 2, shake(b, 4.9, 0.3, 2));
  sky(SKY, 40 + (-70 - camY) * 2, B);
  arena(crowd(B), CARPET);
  // Camera flashes in the stands.
  for (let i = 0; i < 6; i++) {
    const k = Math.floor(B * 3 + i * 0.37);
    if (rnd(k * 7 + i) > 0.6) sparkle(Math.round(rnd(k + i) * 140), Math.round(-80 + rnd(k * 3 + i) * 50), 1, C.white);
  }
  beam(g, 30, 0, 0.5 + Math.sin(B * 0.8) * 0.35, 0.09, 0.12);
  beam(g, 226, 0, -0.5 - Math.sin(B * 0.8 + 1) * 0.35, 0.09, 0.12);
  if (b > 6.4) rays(Math.round((68 - 4) * 2), Math.round((-68 - camY) * 2), B * 0.15, 0.16 * seg(b, 6.4, 7.2), C.blue2);
  if (holding) banner(46, -96 + rise, { wave: B * 2, sheen: b > 8 && b < 9.2 ? seg(b, 8, 9.2) : null });
  const team = [
    { x: 24, skin: 1, hair: 0, style: 'short', ph: 0 },
    { x: 46, skin: 0, hair: 2, style: 'long', ph: 0.3, holds: true },
    { x: 68, ...HERO, ph: 0.6, holds: true },
    { x: 90, skin: 2, hair: 3, style: 'bun', ph: 0.15, holds: true },
    { x: 112, skin: 3, hair: 1, style: 'short', ph: 0.45 },
  ];
  for (const p of team) {
    const jumping = !(holding && p.holds);
    const jy = jumping ? -Math.round(Math.abs(Math.sin((b - 2 + p.ph) * Math.PI)) * 5) : 0;
    const arms = holding && p.holds ? 'hold' : Math.floor(b * 2 + p.ph * 4) % 2 ? 'up' : 'down';
    person(p.x, jy, { skin: p.skin, hair: p.hair, style: p.style, arms, smile: true });
  }
  if (b > 8) for (const [sx, sy, ph] of [[42, -98, 0], [92, -92, 0.4], [40, -50, 0.7], [94, -44, 0.2]]) {
    const k = (B * 1.5 + ph) % 1;
    sparkle(sx, sy, k < 0.5 ? (k < 0.25 ? 2 : 3) : 1, C.white);
  }
  confetti(b, 2);
  flash(b, 2, 0.1);
  cover(seg(b, 11.2, 12), C.white);
}

function scoreCard(b, B) {
  stripes(C.night0, C.night1, B, 30, 1, 18, 6);
  screen();
  text('FINALS', 128, 16, { align: 'center', spacing: 2, color: C.steel3 });
  const panel = (x, cols, label, score, dim) => {
    fill(x - 2, 34, 108, 62, C.ink);
    fill(x, 36, 104, 58, cols[1]);
    fill(x, 36, 104, 3, cols[2]);
    fill(x, 88, 104, 6, cols[0]);
    text(label, x + 52, 42, { align: 'center', spacing: 2 });
    text(String(score), x + 52, 54, { scale: 4, align: 'center', shadow: cols[0], sx: 0, sy: 3 });
    if (dim) withAlpha(0.55, () => fill(x, 36, 104, 58, C.ink));
  };
  const bx = Math.round(lerp(-120, 18, easeOut(seg(b, 0, 0.35))));
  const rx = Math.round(lerp(270, 134, easeOut(seg(b, 0.25, 0.6))));
  const won = b > 1;
  panel(rx, [C.red0, C.red1, C.red2], 'RED', 71, won);
  panel(bx, [C.blue0, C.blue1, C.blue2], 'BLUE', 76, false);
  if (won) {
    if (Math.floor(B * 4) % 2) {
      fill(bx - 4, 32, 112, 2, C.white);
      fill(bx - 4, 96, 112, 2, C.white);
      fill(bx - 4, 32, 2, 66, C.white);
      fill(bx + 106, 32, 2, 66, C.white);
    }
    const k = easeBack(seg(b, 1, 1.3));
    text('BLUE WINS!', 128, Math.round(lerp(150, 108, k)), { scale: 2, align: 'center', color: C.yel1, outline: C.ink, shadow: C.blue0, sx: 0, sy: 2 });
  }
  flash(b, 0, 0.12);
  flash(b, 1, 0.08);
}

const SHOTS = [
  [8, shotLogo], [8, shotRocket], [8, shotLift], [8, shotPan], [8, shotClash], [12, shotHab], [12, shotWin],
];
if (SHOTS.reduce((n, [len]) => n + len, 0) !== INTRO_BEATS) console.warn('Shot lengths do not match the score');
const SHOT_BY_NAME = { logo: shotLogo, rocket: shotRocket, lift: shotLift, pan: shotPan, clash: shotClash, hab: shotHab, win: shotWin };

/** Straight lines between [time, value] keys; flat before the first and after the last. */
function interp(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1];
      return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
    }
  }
  return keys[keys.length - 1][1];
}
/** One intro frame at time t (seconds) over the chip score. */
function drawChipIntro(t) {
  const B = t / BEAT;
  let start = 0;
  for (const [len, draw] of SHOTS) {
    if (B < start + len) return draw(B - start, B);
    start += len;
  }
}
/** One intro frame at song time t, from the song's cue sheet. */
function drawSongIntro(t) {
  const cue = SONG.cues.findLast((q) => t >= q.keys[0][0]) ?? SONG.cues[0];
  SHOT_BY_NAME[cue.shot](interp(cue.keys, t), track.beat(t), { t, buzzer: SONG.buzzer });
  for (const f of SONG.flashes ?? []) {
    if (t >= f && t < f + 0.12 && !reduceMotion) {
      screen();
      withAlpha(stepped(1 - (t - f) / 0.12), () => fill(0, 0, W, H, C.white));
    }
  }
}

// ---- Title screen ----
const ROSTER = [
  (x, t, B) => eleBot(x, 0, { spin: x * 0.64, rsl: rslOn(B), e1: 0.5 + 0.5 * Math.sin(t * 0.8) > 0.9 ? 0.15 : 0 }),
  (x, t, B) => defBot(x, Math.floor(B * 8) % 2 ? -0.5 : 0, { dir: -1, spin: x * 0.64, glint: (t * 0.5) % 1, rsl: rslDefender(B) }),
  (x, t) => armBot(x, 0, { angle: -0.5 + Math.sin(t * 1.4) * 0.35, spin: x * 0.64, num: '2019' }),
];

function drawTitle(t, B) {
  camera(0, -112, 1, shake(t, 0.5, 0.4, 3));
  sky(SKY, 60, B);
  // A shooting star now and then.
  const st = (t % 8) - 3;
  if (st > 0 && st < 0.8) {
    screen();
    const p = st / 0.8, x = lerp(250, 120, p), y = lerp(8, 40, p);
    for (let i = 0; i < 10; i++) fill(Math.round(x + i * 3), Math.round(y - i * 0.75), 1, 1, i < 3 ? C.white : C.blue3);
  }
  // Spotlights behind the logo.
  beam(g, 40, -10, 0.25 + Math.sin(B * 0.5) * 0.3, 0.08, 0.07);
  beam(g, 216, -10, -0.25 - Math.sin(B * 0.5 + 2) * 0.3, 0.08, 0.07);
  // Stage.
  fill(0, 132, W, 12, C.carpet0);
  fill(0, 132, W, 1, C.carpet2);
  // Logo drops and bounces, then holds.
  const ly = Math.round(lerp(-40, 6, easeBounce(seg(t, 0, 1.375))));
  const lx = Math.round(128 - LOGO.w / 2);
  camera(0, 0, 1, shake(t, 0.5, 0.4, 3));
  blit(LOGO, lx, ly);
  if (t > 1.5) {
    // A glint runs across the letters (only the letters, not the sky behind them).
    const k = seg(t, 1.5, 2.9) * 1.15;
    if (k < 1.1) {
      g.save();
      g.beginPath();
      g.rect(Math.round(lx + k * LOGO.w) - 6, 0, 6, 50);
      g.clip();
      withAlpha(0.6, () => blit(LOGO_SHINE, lx, ly));
      g.restore();
    }
  }
  screen();
  const subX = Math.round(lerp(330, 128, easeOut(seg(t, 1.1, 1.6))));
  text(SUBTITLE, subX, 40, { align: 'center', spacing: 1, color: C.blue3, shadow: C.blue0, sx: 0, sy: 1 });
  // The main character slides in, drawn at the canvas's own resolution; her idle loop runs in seconds.
  screen();
  drawHero(Math.round(lerp(-40, 64, easeOut(seg(t, 1.6, 2.2)))), 132, heroIdle(t * track.spb));
  // The robot line-up, at double size.
  camera(0, -66, 2);
  if (t > 2) {
    const c = (t - 2) % 8, i = Math.floor((t - 2) / 8) % ROSTER.length;
    const x = c < 0.8 ? lerp(160, 101, easeOut(c / 0.8)) : c > 7.2 ? lerp(101, 170, easeIn((c - 7.2) / 0.8)) : 101;
    ROSTER[i](x, t, B);
  }
  screen();
  if (t > 2.4 && t % 1 < 0.65) text('PRESS START', 128, 98, { align: 'center', color: C.white, outline: C.ink });
  text('©2026 ' + STUDIO, 128, 135, { align: 'center', color: C.steel2 });
  cover(1 - seg(t, 0, 0.6), C.white);
}

// ---- Menu: NEW SEASON asks your name, then starts the game (play.html, every scene so far in turn) ----
const MENU = ['NEW SEASON', 'REPLAY INTRO'];
function box(x, y, w, h) {
  fill(x, y, w, h, C.ink);
  fill(x + 2, y + 2, w - 4, h - 4, '#f4f6ff');
  fill(x + 3, y + 3, w - 6, h - 6, C.ink);
  fill(x + 4, y + 4, w - 8, h - 8, '#f4f6ff');
}
function drawMenu(now) {
  screen();
  fill(0, 0, W, H, '#f4f6ff');
  box(6, 6, 104, 40);
  MENU.forEach((label, i) => {
    text(label, 24, 15 + i * 14, { color: C.ink });
    if (i === ui.cursor && (!ui.leaving || Math.floor(now * 8) % 2)) text('>', 14, 15 + i * 14, { color: C.ink });
  });
}

// ---- Your name ----
// It goes on the strategist's name tag all season (player.js keeps it). Typed on the keyboard, or on a phone's own: a
// text box no one sees takes the typing, so the phone's keyboard comes up, and the screen draws what's in it.
const nameInput = Object.assign(document.createElement('input'), { type: 'text', maxLength: NAME_MAX, autocomplete: 'off', spellcheck: false });
nameInput.setAttribute('aria-label', 'Your name');
nameInput.setAttribute('autocapitalize', 'characters');
nameInput.setAttribute('enterkeyhint', 'done');
nameInput.style.cssText = 'position:fixed;left:50%;top:30%;width:1px;height:1px;padding:0;border:0;opacity:0;font-size:16px;pointer-events:none';
document.body.append(nameInput);
/** The name changing: a blip for a letter in, a lower one for a letter out, nothing if it didn't change. */
function setName(name) {
  if (name.length !== ui.name.length) chip.sfx(name.length > ui.name.length ? 'key' : 'erase');
  ui.name = nameInput.value = name;
}
nameInput.addEventListener('input', () => setName(cleanName(nameInput.value)));
const NAME_BUTTONS = { back: [52, 102, 64, 20], ok: [140, 102, 64, 20] };
const inside = ([x, y, w, h], px, py) => px >= x && px < x + w && py >= y && py < y + h;

function askName() {
  ui.state = 'name';
  ui.name = nameInput.value = savedName();
  nameInput.focus();
}
function confirmName() {
  const name = ui.name.trim();
  if (!name) return chip.sfx('cursor');
  saveName(name);
  chip.sfx('select');
  ui.leaving = true;
  nameInput.blur();
  setTimeout(() => location.assign(`./play.html?name=${encodeURIComponent(name)}`), 450);
}
function drawName(now) {
  screen();
  fill(0, 0, W, H, '#f4f6ff');
  box(6, 6, 244, 132);
  text('NEW SEASON', 128, 18, { align: 'center', color: C.ink });
  text("WHAT'S YOUR NAME?", 128, 40, { align: 'center', color: C.ink });
  // The name, in a field with a blinking cursor where the next letter goes.
  fill(70, 56, 116, 20, C.ink);
  fill(71, 57, 114, 18, C.white);
  text(ui.name, 78, 62, { color: C.ink });
  if (ui.name.length < NAME_MAX && Math.floor(now * 2.5) % 2) fill(78 + measure(ui.name) + (ui.name ? 1 : 0), 69, 5, 1, C.ink);
  text('IT GOES ON YOUR NAME TAG ALL SEASON.', 128, 84, { font: 3, align: 'center', color: C.steel1 });
  for (const [key, label] of [['back', 'BACK'], ['ok', 'OK']]) {
    const [x, y, w, h] = NAME_BUTTONS[key], dim = key === 'ok' && !ui.name.trim();
    fill(x, y, w, h, C.ink);
    fill(x + 1, y + 1, w - 2, h - 2, dim ? '#c9cfe6' : key === 'ok' ? C.blue1 : C.white);
    if (!dim && key === 'ok') fill(x + 1, y + 1, w - 2, 1, C.blue2);
    const blink = key === 'ok' && ui.leaving && Math.floor(now * 8) % 2;
    if (!blink) text(label, x + w / 2, y + 7, { align: 'center', color: key === 'ok' && !dim ? C.white : C.ink });
  }
  text('ENTER: OK   ESC: BACK', 128, 128, { font: 3, align: 'center', color: C.steel2 });
}

function drawBoot(now) {
  screen();
  fill(0, 0, W, H, C.ink);
  withAlpha(0.6, () => sky(SKY, 144, now / BEAT));
  const waiting = ui.pending && !track.ready;
  if (track.error) text('COULD NOT LOAD THE SONG', 128, 62, { align: 'center', color: C.red2 });
  else if (waiting) text('LOADING THE SONG...', 128, 62, { align: 'center', color: C.white });
  else if (Math.floor(now * 1.6) % 2 === 0) text('PRESS START', 128, 62, { align: 'center', color: C.white });
  text('TAP OR PRESS ANY KEY. SOUND ON.', 128, 80, { font: 3, align: 'center', color: C.steel2 });
  if (SONG) text(`MUSIC: ${SONG.name.toUpperCase()}`, 128, 92, { font: 3, align: 'center', color: C.blue3 });
}

// ---- Clock, input and the loop ----
const chip = new Chip();
// Sound off is remembered in this browser, for the game too (sound.js keeps the same setting).
const MUTED = 'bluebanner.muted';
try {
  chip.muted = params.has('mute') || localStorage.getItem(MUTED) === '1';
} catch {
  chip.muted = params.has('mute');
}

// ---- Soundtracks. Both count time in seconds from the start of the intro. ----

/** The chiptune score from chip.js. */
class ChipTrack {
  constructor() {
    this.player = new Player(chip);
    this.ready = true;
    this.spb = BEAT;
    this.titleAt = INTRO_BEATS * BEAT;
  }
  /** Beats since the start, for anything that pulses with the music. */
  beat(t) {
    return t / BEAT;
  }
  start(t) {
    this.player.play(t / BEAT, chip.now());
  }
  time() {
    return this.player.beatAt(chip.now()) * BEAT;
  }
  pump() {
    this.player.pump();
  }
}

/**
 * The song's level: full under the intro, then down under the title screen, where it plays on while you read the menu
 * and type your name, and where the game that follows is far quieter. It fades a couple of beats after the logo drops
 * (from titleAt + fadeAt, over fadeFor seconds); a song started at the title (skipped to, ?title, or the sound only
 * waking there) starts down. title: 0.3 of 0.9 is about 9.5 dB down.
 */
const LEVEL = { intro: 0.9, title: 0.3, fadeAt: 1, fadeFor: 3 };

/** A recorded song: plays once up to the end of its title loop, then repeats the loop with a short crossfade. */
class SongTrack {
  constructor(song) {
    this.song = song;
    this.spb = 60 / song.bpm;
    this.titleAt = song.titleAt;
    this.beat0 = song.beat0 ?? 0;
    this.buffer = null;
    this.error = null;
    this.playing = [];
    // Decode without waiting for a tap: an offline context needs no permission.
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    fetch(new URL(song.file, document.baseURI))
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => new Promise((ok, fail) => new OAC(2, 1, 44100).decodeAudioData(data, ok, fail)))
      .then((buf) => (this.buffer = buf), (e) => (this.error = e ?? new Error('decode failed')));
  }
  get ready() {
    return !!this.buffer;
  }
  /** Beats on the song's own grid, for anything that pulses with the music. */
  beat(t) {
    return (t - this.beat0) / this.spb;
  }
  /** Song time t starts playing now. */
  start(t) {
    this.stop();
    chip.newBus();
    const ac = chip.ac;
    this.t0 = ac.currentTime + 0.03 - t;
    this.out = ac.createGain();
    const level = this.out.gain, fade = this.t0 + this.titleAt + LEVEL.fadeAt;
    // playFrom(titleAt) lands a frame or so short of it, hence the second's leeway.
    if (t > this.titleAt - 1) level.value = LEVEL.title;
    else {
      level.setValueAtTime(LEVEL.intro, ac.currentTime);
      level.setValueAtTime(LEVEL.intro, fade);
      level.linearRampToValueAtTime(LEVEL.title, fade + LEVEL.fadeFor);
    }
    this.out.connect(chip.direct);
    this.queued = Math.max(0, t); // song time up to which audio is scheduled
    this.sfxFrom = t;
    this.pump();
  }
  time() {
    return chip.now() - this.t0;
  }
  /** One stretch of the buffer, faded in and out so the loop seam doesn't click. */
  segment(at, offset, dur) {
    const ac = chip.ac, X = 0.03;
    const src = ac.createBufferSource(), g = ac.createGain();
    src.buffer = this.buffer;
    const when = this.t0 + at;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(1, when + X);
    g.gain.setValueAtTime(1, when + dur);
    g.gain.linearRampToValueAtTime(0, when + dur + X);
    src.connect(g).connect(this.out);
    src.start(when, offset, dur + X);
    this.playing.push(src);
  }
  pump() {
    if (!this.out) return;
    const [L0, L1] = this.song.loop, now = this.time();
    while (this.queued < now + 2) {
      if (this.queued < L1) {
        this.segment(this.queued, this.queued, L1 - this.queued);
        this.queued = L1;
      } else {
        this.segment(this.queued, L0, L1 - L0);
        this.queued += L1 - L0;
      }
    }
    this.playing = this.playing.slice(-4);
    if (this.song.buzzer >= this.sfxFrom && this.song.buzzer < now + 0.25) {
      chip.sfx('buzzer', this.t0 + this.song.buzzer);
      this.sfxFrom = Infinity;
    }
  }
  stop() {
    if (!this.out) return;
    const out = this.out, level = out.gain, now = chip.ac.currentTime;
    // Hold where the title fade has got to, so its ramp doesn't carry on under the fade out.
    if (level.cancelAndHoldAtTime) level.cancelAndHoldAtTime(now);
    else {
      level.cancelScheduledValues(now);
      level.setValueAtTime(level.value, now);
    }
    level.setTargetAtTime(0, now, 0.02);
    const old = this.playing;
    setTimeout(() => {
      for (const s of old) {
        try {
          s.stop();
        } catch {
          // Already finished.
        }
      }
      out.disconnect();
    }, 300);
    this.playing = [];
    this.out = null;
  }
}

let track = SONG ? new SongTrack(SONG) : new ChipTrack();
const ui = { state: 'boot', cursor: 0, leaving: false, woke: false, pending: false, name: '' };
// The picture always runs on its own clock. The music joins it at the current moment as soon as the audio is
// actually running, which on some phones is only after a later tap, or again after the phone interrupted it.
const clock = { perf0: 0, audio: false };
const perfNow = () => performance.now() / 1000;

function playFrom(t) {
  chip.start();
  clock.perf0 = perfNow() + 0.06 - t;
  clock.audio = false;
}
function timeNow() {
  if (frozenAt != null) return frozenAt;
  if (!chip.running || !track.ready) clock.audio = false;
  else if (!clock.audio) {
    track.start(perfNow() - clock.perf0);
    clock.audio = true;
  }
  if (!clock.audio) return perfNow() - clock.perf0;
  const t = track.time();
  clock.perf0 = perfNow() - t;
  return t;
}
function begin() {
  ui.state = 'play';
  ui.pending = false;
  playFrom(params.has('title') ? track.titleAt : 0);
}

function press(key) {
  if (ui.state === 'boot') {
    // The tap unlocks the audio now; a song still loading starts as soon as it's ready.
    chip.start();
    if (track.ready) begin();
    else ui.pending = true;
    return;
  }
  if (ui.state === 'play') {
    // If the browser held the sound back, the next tap wakes it instead of skipping the intro (once).
    if (locked() && !ui.woke) {
      ui.woke = true;
      return;
    }
    const t = timeNow();
    if (t < track.titleAt - 0.5 * track.spb) playFrom(track.titleAt);
    else if (t > track.titleAt + 1.5 * track.spb && (key === 'a' || key === 'start')) {
      ui.state = 'menu';
      ui.cursor = 0;
      chip.sfx('select');
    }
    return;
  }
  if (ui.leaving) return;
  if (ui.state === 'name') {
    if (key === 'start') confirmName();
    else if (key === 'b') {
      ui.state = 'menu';
      nameInput.blur();
      chip.sfx('cursor');
    }
    return;
  }
  if (key === 'up' || key === 'down') {
    ui.cursor = (ui.cursor + (key === 'up' ? MENU.length - 1 : 1)) % MENU.length;
    chip.sfx('cursor');
  } else if (key === 'b') {
    ui.state = 'play';
  } else if (key === 'a' || key === 'start') {
    chip.sfx('select');
    if (ui.cursor === 0) askName();
    else {
      ui.state = 'play';
      playFrom(0);
    }
  }
}

const KEYS = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', Enter: 'start', Space: 'a', KeyZ: 'a', KeyJ: 'a',
  Escape: 'b', KeyX: 'b', Backspace: 'b', KeyK: 'b',
};
window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  // Typing a name: Enter and Esc are OK and BACK, and the rest goes to the name (the text box takes it when it has the
  // focus; otherwise it's typed in here).
  if (ui.state === 'name') {
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault();
      if (!e.repeat) press(e.key === 'Enter' ? 'start' : 'b');
    } else if (document.activeElement !== nameInput && !ui.leaving) {
      if (e.key === 'Backspace') setName(ui.name.slice(0, -1));
      else if (e.key.length === 1) setName(cleanName(ui.name + e.key));
      else return;
      e.preventDefault();
    }
    return;
  }
  if (e.code === 'KeyM') return toggleMute();
  // Named keys map to buttons; any other letter or digit counts as A. Tab, Shift and the like are left alone.
  const key = KEYS[e.code] ?? (e.key.length === 1 ? 'a' : null);
  if (!key) return;
  e.preventDefault();
  if (!e.repeat) press(key);
});
// Taps act on click: phones only allow sound from the end of a tap, not its start.
canvas.addEventListener('click', (e) => {
  const r = canvas.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * H;
  if (ui.state === 'name') {
    if (inside(NAME_BUTTONS.ok, x, y)) press('start');
    else if (inside(NAME_BUTTONS.back, x, y)) press('b');
    else nameInput.focus(); // a tap anywhere else brings the phone's keyboard back up
    return;
  }
  if (ui.state === 'menu' && x < 110 && y > 8 && y < 44) {
    const i = y < 26 ? 0 : 1;
    if (i !== ui.cursor) ui.cursor = i;
    return press('a');
  }
  press('a');
});

// Any later tap or key press retries the audio, in case the first one didn't count.
for (const type of ['pointerup', 'touchend', 'click', 'keydown']) window.addEventListener(type, () => chip.unlock(), { capture: true, passive: true });

const muteButton = document.getElementById('mute');
const locked = () => chip.ready && !chip.running && !chip.muted;
function toggleMute() {
  chip.setMuted(!chip.muted);
  try {
    localStorage.setItem(MUTED, chip.muted ? '1' : '0');
  } catch {
    // Storage blocked: it lasts the visit.
  }
  muteButton?.setAttribute('aria-pressed', String(chip.muted));
}
muteButton?.addEventListener('click', (e) => {
  e.stopPropagation();
  // While the audio is still asleep, this tap just wakes it (the capture listener above already did).
  if (!locked()) toggleMute();
});
/** Keep the button honest: it says when the browser is still holding the sound back. */
function updateMuteLabel() {
  if (!muteButton) return;
  const label = chip.muted ? 'Sound off' : locked() ? 'Tap for sound' : 'Sound on';
  if (muteButton.textContent !== label) muteButton.textContent = label;
  if (muteButton.getAttribute('aria-pressed') !== String(chip.muted)) muteButton.setAttribute('aria-pressed', String(chip.muted));
}

function render() {
  const now = perfNow();
  g.globalAlpha = 1;
  updateMuteLabel();
  if (SONG && track.error) {
    console.warn(`Could not load ${SONG.file}; playing the chiptune instead.`, track.error);
    SONG = null;
    track = new ChipTrack();
  }
  if (ui.pending && track.ready) begin();
  if (ui.state === 'boot' && frozenAt == null) return drawBoot(now);
  const t = timeNow();
  if (clock.audio) track.pump();
  if (ui.state === 'menu') return drawMenu(now);
  if (ui.state === 'name') return drawName(now);
  if (t < 0) {
    screen();
    return fill(0, 0, W, H, C.ink);
  }
  if (t >= track.titleAt) return drawTitle((t - track.titleAt) / track.spb, track.beat(t));
  return SONG ? drawSongIntro(t) : drawChipIntro(t);
}
// Add #debug to the address to see what the audio is doing (handy on phones, which have no console).
if (location.hash === '#debug') {
  const out = Object.assign(document.createElement('pre'), { id: 'debug' });
  out.style.cssText = 'position:fixed;left:8px;top:8px;margin:0;padding:6px 8px;background:#000d;color:#9fe8d0;font:11px/1.45 ui-monospace,monospace;z-index:9;pointer-events:none;white-space:pre-wrap;max-width:calc(100vw - 32px)';
  document.body.append(out);
  setInterval(() => {
    const t = ui.state === 'boot' ? 'not started' : `${timeNow().toFixed(2)} s (${clock.audio ? 'on the audio clock' : 'on its own clock'})`;
    out.textContent = `${chip.describe()}\nmusic: ${SONG ? SONG.name + (track.error ? ' (failed to load)' : track.ready ? '' : ' (loading)') : 'chiptune'}\nintro time: ${t}\nin a frame: ${window.top !== window}\n${navigator.userAgent}`;
  }, 400);
}

function loop() {
  render();
  requestAnimationFrame(loop);
}
if (frozenAt != null) ui.state = 'play';
requestAnimationFrame(loop);

// Integer pixel scaling: as big as fits, crisp edges. Falls back to a smooth fit when the integer fit is much smaller.
function fit() {
  const dpr = window.devicePixelRatio || 1;
  const box = canvas.parentElement.getBoundingClientRect();
  const exact = Math.min(box.width / W, box.height / H);
  const whole = Math.floor(exact * dpr) / dpr;
  const s = whole >= exact * 0.8 && whole > 0 ? whole : exact;
  canvas.style.width = `${Math.floor(W * s)}px`;
  canvas.style.height = `${Math.floor(H * s)}px`;
}
new ResizeObserver(fit).observe(canvas.parentElement);
fit();
