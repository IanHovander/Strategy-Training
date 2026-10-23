// The time travel lab (index.html): alliance selection's cut scene playing as it does in the game, and a button that
// sends the strategist back to its start (rewind) or on to the end of round two (forward), in one of four looks, to
// pick the one the opening uses.
//
// The scenes draw every frame as a pure function of time, so going back plays the real cut scene backwards: while it
// plays, every frame's moment (beat, time, words on screen) is written down, and a rewind draws them again last to
// first. The words un-type as it goes. Forward runs the cut scene on, fast.
//
// Each frame is drawn twice, with her and without her: the pixels that differ are her. That's how the world can stop or
// drain of colour while she doesn't, and how she stands still in the middle of the vortex while it turns.
//
//   1 STOP     everything stops but her: the world drains to cold blue, she looks round, Norbert's ear lights up, then
//              the world runs backwards around her, leaving trails, and the colour floods back
//   2 SWIRL    the picture twists into a vortex round her, counterclockwise for a rewind and clockwise for forward, the
//              frames running backwards inside it, a white flash, and it unwinds into where she lands
//   3 TAPE     a tape rewinding: torn rows, split colours, REW on screen and the clock counting back, a clunk at the end
//   4 ALL      the three together, the pick for the opening: STOP, then the vortex opens with her still and in colour in
//              the middle of it, a white flash, a clock card spinning back to 12:38, and it unwinds into the start
//
// From the address bar: ?effect=1-4, ?dir=forward, ?auto=SECONDS (jump by itself that long after the start, then
// again each time round), ?mute.

import { W, H, C, useContext, screen, fill, text, clamp, seg, lerp, easeIn, easeOut, easeInOut, disk } from '../pixel.js';
import { conversation, drawDialog, typed, typedAt, advance } from '../talk.js';
import { drawWithShadow } from '../stage.js';
import { makeCutscene } from '../alliance-selection/cutscene.js';
import { makeSetLayers, drawSet } from '../alliance-selection/set.js';
import { lookOf, CROWD } from '../alliance-selection/people.js';
import { MC_LOOK, drawSkater } from '../alliance-selection/mc.js';
import { drawNorbert } from '../norbert.js';
import { still, maskOf, swirl, tape, overlay, blend } from './warp.js';
import { sound } from './sound.js';

const canvas = document.getElementById('screen');
const g = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
g.imageSmoothingEnabled = false;
useContext(g);

const params = new URLSearchParams(location.search);
const opts = {
  effect: clamp(Number(params.get('effect')) || 4, 1, 4),
  dir: params.get('dir') === 'forward' ? 1 : -1,
  norbert: true,
  auto: params.has('auto') ? Number(params.get('auto')) || 12 : null,
};
sound.muted = params.has('mute');

// ---- The cut scene, with a way to leave her out ----
let HER = null, hideHer = false, herPose = null;
const looks = (k) => {
  const l = k === 'mc' ? MC_LOOK : lookOf(k);
  if (k === '5026') HER = l;
  return l;
};
/** As alliance selection's own drawWorld (scene.js), but she can be left out, or posed (turned to look round). */
function drawWorld(gg, view, t, frame) {
  const people = [];
  for (const p of frame.people) {
    if (p.look === HER && hideHer) continue;
    const q = p.look === HER && herPose ? { ...p, ...herPose } : p;
    people.push({ y: q.y, draw: () => (q.skater ? drawSkater(gg, view, q) : drawWithShadow(gg, view, q)) });
  }
  drawSet(gg, view, t, { people, cheer: frame.cheer, board: frame.board, exitSign: false });
}
makeSetLayers();
const beats = makeCutscene({ drawWorld, lookOf: looks, crowd: CROWD });
const offsets = beats.map((_, i) => beats.slice(0, i).reduce((n, b) => n + b.dur, 0));
const beatNamed = (name) => beats.findIndex((b) => b.name === name);
/** Play starts at Robin's welcome, a forward jump lands at the end of round two, and after the applause it starts over. */
const FIRST = beatNamed('welcome'), AHEAD = beatNamed('alliances'), LOOP = beatNamed('applause');

// ---- Playing it, as stage.js does, on our own clock ----
const P = { i: FIRST, t0: 0, conv: null, read: true };
let sim = 0;
/** Every frame played since the start: what a rewind plays back. */
const rec = [];

function startBeat(i, now) {
  const b = beats[i];
  Object.assign(P, { i, t0: now, read: !b.say, conv: b.say ? conversation(b.say.name, b.say.lines, now + (b.say.at ?? 0), { tag: b.say.tag }) : null });
}
function begin() {
  sim = 0;
  rec.length = 0;
  startBeat(FIRST, 0);
}
/** On to `now` on the cut scene's clock: pages turn by themselves, and beats move on once they're read. */
function run(now) {
  for (let n = 0; n < 12; n++) {
    const b = beats[P.i];
    if (P.conv && !P.read && typed(P.conv, now)) {
      const page = P.conv.pages[P.conv.page], chars = (Array.isArray(page) ? page : page.lines).join('').length;
      if (now > typedAt(P.conv) + 1.2 + chars * 0.035) {
        if (!advance(P.conv, now)) P.read = true;
        continue;
      }
    }
    if (now - P.t0 < b.dur || !P.read) return;
    if (P.i >= LOOP) return begin();
    startBeat(P.i + 1, now);
  }
}
/** This moment, written down so it can be drawn again. */
const moment = () => ({
  i: P.i, t: sim - P.t0, T: offsets[P.i] + sim - P.t0, conv: P.read || !P.conv ? null : { ...P.conv }, clock: sim, sim,
});
/** Where a rewind lands, and a forward jump. */
const startMoment = () => ({ i: FIRST, t: 0, T: offsets[FIRST], conv: null, clock: 0, sim: 0 });

/** Draw a moment on the screen; with grab, return its pixels. */
function paint(m, { her = true, pose = null, grab = true } = {}) {
  hideHer = !her;
  herPose = pose;
  useContext(g);
  screen();
  g.globalAlpha = 1;
  const b = beats[m.i];
  b.draw(g, m.t, { T: m.T, k: clamp(m.t / b.dur, 0, 1) });
  g.globalAlpha = 1;
  if (m.conv) drawDialog(g, m.conv, m.clock);
  hideHer = false;
  herPose = null;
  return grab ? g.getImageData(0, 0, W, H) : null;
}

// ---- The clock on the wall: the cut scene starts at 12:38, and a second of it is ten at the event ----
const CLOCK0 = 12 * 3600 + 38 * 60;
const eventTime = (simSeconds) => CLOCK0 + simSeconds * 10;
function hms(s, withSeconds = true) {
  s = Math.round(s);
  const h = Math.floor(s / 3600) % 12 || 12, m = Math.floor(s / 60) % 60, sec = s % 60;
  return `${h}:${String(m).padStart(2, '0')}${withSeconds ? `:${String(sec).padStart(2, '0')}` : ''}`;
}

// ---- On top: Norbert in the corner, the tape's words, the clock card ----
function hud(glow = 0) {
  if (!opts.norbert) return;
  useContext(g);
  screen();
  drawNorbert(3, 2, { glow });
  text('12.9V', 21, 4, { font: 3, color: glow > 0 ? C.yel2 : C.steel2 });
}
/** Two arrowheads, pointing left (rewind) or right (forward), 5 wide each. */
function arrows(x, y, dir, c) {
  for (let a = 0; a < 2; a++) {
    for (let i = 0; i < 5; i++) {
      const col = dir < 0 ? x + a * 6 + i : x + a * 6 + 4 - i;
      fill(col, y + 4 - i, 1, 2 * i + 1, c);
    }
  }
}
function tapeWords(dir, label, seconds) {
  useContext(g);
  screen();
  for (const [dx, c] of [[1, C.ink], [0, C.white]]) {
    // Clear of Norbert in the corner.
    arrows(46 + dx, 16 + dx, dir, c);
    text(label, 61 + dx, 17 + dx, { color: c });
    text(`SAT ${hms(seconds)}`, 248 + dx, 17 + dx, { align: 'right', color: c });
  }
}
function line(x0, y0, x1, y1, c, w = 1) {
  const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) || 1;
  for (let i = 0; i <= n; i++) fill(Math.round(lerp(x0, x1, i / n)), Math.round(lerp(y0, y1, i / n)), w, w, c);
}
/**
 * The clock card: a face whose hands spin round several times (counterclockwise going back, clockwise going forward)
 * while the time under it rolls from `from` to `to`, event seconds.
 */
function clockCard(k, dir, from, to) {
  useContext(g);
  screen();
  fill(0, 0, W, H, C.ink);
  const e = easeOut(k), cx = 128, cy = 54, r = 27;
  disk(cx, cy, r + 3, C.steel1);
  disk(cx, cy, r + 1, C.steel3);
  disk(cx, cy, r, C.night1);
  for (let h = 0; h < 12; h++) {
    const a = (h / 12) * Math.PI * 2;
    fill(Math.round(cx + Math.sin(a) * (r - 3)), Math.round(cy - Math.cos(a) * (r - 3)), h % 3 ? 1 : 2, h % 3 ? 1 : 2, C.steel3);
  }
  // The hands run three extra turns, unwinding as the time rolls in.
  const shown = lerp(from, to, e), spin = (1 - e) * 3 * 3600 * -dir;
  const m = ((shown + spin) / 3600) * Math.PI * 2, h = ((shown + spin) / 43200) * Math.PI * 2;
  line(cx, cy, cx + Math.sin(h) * (r - 12), cy - Math.cos(h) * (r - 12), C.yel1, 2);
  line(cx, cy, cx + Math.sin(m) * (r - 5), cy - Math.cos(m) * (r - 5), C.white);
  fill(cx - 1, cy - 1, 3, 3, C.red2);
  text(hms(shown, false), 128, 94, { scale: 2, align: 'center', color: C.white });
  text('SATURDAY', 128, 116, { font: 3, align: 'center', color: C.blue3 });
  text('PM', 128 + 36, 101, { font: 3, color: C.blue3 });
}

// ---- Jumping ----
const out = g.createImageData(W, H), tmp = g.createImageData(W, H), prev = g.createImageData(W, H);
const mask = new Uint8Array(W * H);
/** She looks round as everything stops: right, left, and back to you. */
const LOOK_ROUND = [0, 1, 2, 2, 2, 1, 0, 7, 6, 6, 6, 7, 0];
const lookRound = (u) => ({ dir: LOOK_ROUND[Math.min(LOOK_ROUND.length - 1, Math.floor(u / 0.12))], gait: 'stand' });
const pulse = (u) => 0.5 + 0.5 * Math.sin(u * 14);

let J = null;
/** The look and its parts, in seconds. */
const PLANS = {
  1: { freeze: 1.6, travel: 2.6, arrive: 0.5 },
  2: { open: 0.8, travel: 1.8, flash: 0.2, arrive: 0.9 },
  3: { stop: 0.25, travel: 2.6, land: 0.45 },
  4: { freeze: 1.4, open: 0.7, travel: 1.8, collapse: 0.35, card: 1.3, arrive: 0.8 },
};
function jump() {
  if (J || rec.length < 20) return;
  const plan = PLANS[opts.effect], parts = Object.entries(plan);
  let at = 0;
  const times = Object.fromEntries(parts.map(([k, d]) => [k, [at, (at += d)]]));
  J = {
    kind: opts.effect, dir: opts.dir, t0: performance.now() / 1000, last: rec[rec.length - 1], frames: rec.slice(),
    times, end: at, cues: new Set(), center: null, her: null, herMask: null, landed: null,
  };
  J.from = eventTime(J.last.sim);
  J.to = J.dir < 0 ? CLOCK0 : eventTime(J.last.sim) + 9 * 60;
  document.body.dataset.jumping = 'true';
}
/** Do fn once, when the jump gets to `at` seconds. */
function cue(name, u, at, fn) {
  if (u >= at && !J.cues.has(name)) {
    J.cues.add(name);
    fn();
  }
}
/** k (0 to 1) through part `name`, or null outside it. */
function part(name, u) {
  const r = J.times[name];
  return r && u >= r[0] && u < r[1] ? (u - r[0]) / (r[1] - r[0]) : null;
}
/** The frame the travel shows, k of the way through it: the recording backwards, or the cut scene run on fast. */
function travelFrame(k, dt) {
  if (J.dir < 0) return J.frames[Math.round((J.frames.length - 1) * (1 - easeIn(k)))];
  if (P.i < AHEAD) {
    sim += dt * lerp(3, 22, k);
    run(sim);
    if (P.i >= AHEAD) startBeat(AHEAD, sim);
  }
  const m = moment();
  rec.push(m);
  return m;
}
/** Where she lands. Going forward, anything short of the end of round two jumps to it. */
function landing() {
  if (J.landed) return J.landed;
  if (J.dir < 0) {
    begin();
  } else if (P.i < AHEAD) {
    startBeat(AHEAD, sim);
  }
  J.landed = moment();
  return J.landed;
}
/** The world stopped, her looking round in colour: the start of STOP and ALL. Keeps her picture for later. */
function frozen(u, drain) {
  const a = paint(J.last, { pose: lookRound(u) }), b = paint(J.last, { her: false });
  J.center = maskOf(a.data, b.data, mask) ?? J.center;
  still(a.data, out.data, drain, mask);
  J.her = a;
  J.herMask = mask.slice();
  return b;
}
/** Her middle, or the middle of the screen if she's out of shot. */
const middle = () => J.center ?? { x: W / 2, y: H / 2 - 8 };

function stepJump(now, dt) {
  const u = now - J.t0, d = J.dir;
  let glow = 0, k;
  if (J.kind === 1) {
    cue('tick', u, 0, () => { sound.tick(); sound.hum(J.end - 0.2); });
    cue('rush', u, J.times.travel[0], () => sound.rush(J.times.travel[1] - J.times.travel[0], d));
    if ((k = part('freeze', u)) !== null) {
      frozen(u, seg(k, 0, 0.3));
      glow = u > 0.5 ? pulse(u) : 0;
    } else if ((k = part('travel', u)) !== null) {
      const m = travelFrame(k, dt), a = paint(m), b = paint(m, { her: false });
      maskOf(a.data, b.data, mask);
      still(a.data, out.data, 1, mask);
      blend(out.data, prev.data, 0.5);
      glow = 1;
    } else {
      k = part('arrive', u) ?? 1;
      cue('chime', u, J.times.arrive[0], () => sound.chime(d));
      const a = paint(landing());
      still(a.data, out.data, 1 - k);
    }
  } else if (J.kind === 2) {
    cue('rush', u, 0, () => sound.rush(J.times.flash[0], d));
    if (!J.center) {
      const a = paint(J.last), b = paint(J.last, { her: false });
      J.center = maskOf(a.data, b.data, mask);
    }
    const c = middle();
    if ((k = part('open', u)) !== null) {
      swirl(paint(J.last).data, out.data, { cx: c.x, cy: c.y, angle: d * 14 * easeIn(k), pull: 0.3 * k, t: u * d });
    } else if ((k = part('travel', u)) !== null) {
      swirl(paint(travelFrame(k, dt)).data, out.data, { cx: c.x, cy: c.y, angle: d * (14 + 12 * k), pull: 0.3 + 0.3 * k, core: 34 * easeIn(k), t: u * d });
      glow = 1;
    } else if ((k = part('flash', u)) !== null) {
      cue('chime', u, J.times.flash[0], () => sound.chime(d));
      swirl(paint(landing()).data, out.data, { cx: c.x, cy: c.y, core: 400 });
    } else {
      k = part('arrive', u) ?? 1;
      const e = easeOut(k);
      swirl(paint(landing()).data, out.data, { cx: c.x, cy: c.y, angle: d * 26 * (1 - e), pull: 0.6 * (1 - e), core: 60 * (1 - k) ** 2, t: u * d });
    }
  } else if (J.kind === 3) {
    cue('clunk', u, 0, () => sound.clunk());
    cue('whirr', u, J.times.travel[0], () => sound.whirr(J.times.travel[1] - J.times.travel[0], d));
    let m, amt, words = true;
    if ((k = part('stop', u)) !== null) [m, amt] = [J.last, 0.3];
    else if ((k = part('travel', u)) !== null) [m, amt] = [travelFrame(k, dt), 1];
    else {
      k = part('land', u) ?? 1;
      cue('land', u, J.times.land[0], () => sound.clunk());
      [m, amt, words] = [landing(), 1 - k, false];
    }
    tape(paint(m).data, out.data, { amt, t: u });
    g.putImageData(out, 0, 0);
    if (words) tapeWords(d, d < 0 ? 'REW' : 'FF', eventTime(m.sim));
    else if (Math.floor(u * 6) % 2 === 0) tapeWords(1, 'STOP', eventTime(m.sim));
    prev.data.set(out.data);
    hud(part('travel', u) !== null ? pulse(u) : 0);
    return u >= J.end;
  } else {
    cue('tick', u, 0, () => { sound.tick(); sound.hum(J.times.collapse[1]); });
    cue('rush', u, J.times.open[0], () => sound.rush(J.times.collapse[1] - J.times.open[0], d));
    if ((k = part('freeze', u)) !== null) {
      frozen(u, seg(k, 0, 0.3));
      glow = u > 0.45 ? pulse(u) : 0;
    } else if ((k = part('open', u)) !== null || (k = part('travel', u)) !== null) {
      const opening = part('open', u) !== null;
      const world = opening ? paint(J.last, { her: false }) : paint(travelFrame(k, dt), { her: false });
      still(world.data, tmp.data, 1);
      const c = middle();
      swirl(tmp.data, out.data, opening
        ? { cx: c.x, cy: c.y, angle: d * 12 * easeIn(k), pull: 0.2 * k, t: u * d }
        : { cx: c.x, cy: c.y, angle: d * (12 + 14 * k), pull: 0.2 + 0.3 * k, core: 26 * easeIn(k), t: u * d });
      overlay(out.data, J.her.data, J.herMask);
      glow = 1;
    } else if ((k = part('collapse', u)) !== null) {
      const c = middle();
      still(paint(J.last, { her: false }).data, tmp.data, 1);
      swirl(tmp.data, out.data, { cx: c.x, cy: c.y, angle: d * 26, pull: 0.5, core: lerp(26, 320, easeIn(k)), t: u * d });
      if (k < 0.5) overlay(out.data, J.her.data, J.herMask);
      glow = 1;
    } else if ((k = part('card', u)) !== null) {
      cue('chime', u, J.times.card[0], () => sound.chime(d));
      clockCard(k, d, J.from, J.to);
      hud(0.3);
      return false;
    } else {
      k = part('arrive', u) ?? 1;
      const e = easeInOut(k), c = middle();
      still(paint(landing()).data, tmp.data, 1 - k);
      swirl(tmp.data, out.data, { cx: c.x, cy: c.y, angle: d * 12 * (1 - e), pull: 0.2 * (1 - e), t: u * d });
    }
  }
  g.putImageData(out, 0, 0);
  prev.data.set(out.data);
  hud(glow);
  return u >= J.end;
}
function endJump() {
  landing();
  J = null;
  delete document.body.dataset.jumping;
  autoAt = performance.now() / 1000 + (opts.auto ?? 0);
}

// ---- The loop ----
let last = performance.now() / 1000, autoAt = opts.auto != null ? last + opts.auto : null;
begin();
function frame() {
  const now = performance.now() / 1000, dt = Math.min(0.1, now - last);
  last = now;
  if (J) {
    if (stepJump(now, dt)) endJump();
  } else {
    sim += dt;
    run(sim);
    const m = moment();
    rec.push(m);
    paint(m, { grab: false });
    hud(0);
    if (opts.auto != null && now >= autoAt) jump();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---- The controls ----
const buttons = [...document.querySelectorAll('[data-effect], [data-dir]')];
function show() {
  for (const b of buttons) {
    const on = b.dataset.effect ? Number(b.dataset.effect) === opts.effect : Number(b.dataset.dir) === opts.dir;
    b.setAttribute('aria-pressed', String(on));
  }
  document.getElementById('norbert').setAttribute('aria-pressed', String(opts.norbert));
  document.getElementById('mute').setAttribute('aria-pressed', String(sound.muted));
  document.getElementById('mute').textContent = sound.muted ? 'SOUND OFF' : 'SOUND ON';
  document.getElementById('go').textContent = opts.dir < 0 ? 'REWIND (SPACE)' : 'FORWARD (SPACE)';
}
for (const b of buttons) {
  b.addEventListener('click', () => {
    if (b.dataset.effect) opts.effect = Number(b.dataset.effect);
    else opts.dir = Number(b.dataset.dir);
    show();
  });
}
document.getElementById('go').addEventListener('click', jump);
document.getElementById('norbert').addEventListener('click', () => { opts.norbert = !opts.norbert; show(); });
document.getElementById('mute').addEventListener('click', () => { sound.muted = !sound.muted; show(); });
canvas.addEventListener('click', jump);
addEventListener('keydown', (e) => {
  if (e.target.closest?.('button') && (e.key === ' ' || e.key === 'Enter')) return;
  const key = e.key.toLowerCase();
  if ('1234'.includes(key) && key) opts.effect = Number(key);
  else if (key === 'r') opts.dir = -1;
  else if (key === 'f') opts.dir = 1;
  else if (key === 'n') opts.norbert = !opts.norbert;
  else if (key === 'm') sound.muted = !sound.muted;
  else if (key === ' ' || key === 'enter') jump();
  else return;
  e.preventDefault();
  show();
});
show();

// Whole-number zoom, as the scenes' big screen.
function fit() {
  const room = canvas.parentElement.clientWidth - 4;
  canvas.style.width = `${W * Math.max(1, Math.min(4, Math.floor(room / W)))}px`;
}
new ResizeObserver(fit).observe(canvas.parentElement);
fit();

window.lab = { opts, jump, beats, rec, get J() { return J; } };
