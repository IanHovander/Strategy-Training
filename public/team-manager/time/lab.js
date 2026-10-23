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
//   4 ALL      the three together: STOP, then the vortex opens with her still and in colour in the middle of it, a
//              white flash, a clock card spinning back to 12:38, and it unwinds into the start
// and two that only this game could have:
//   5 WIND     Norbert is clockwork. Everything stops, he hops out of the corner, turns his back, and a brass wind-up key
//              pops out of it. It turns counterclockwise one click at a time and every click ratchets the world back a
//              step, faster and faster, until it spins free and the world races back to the start. Forward winds it
//              clockwise. Then he hops back to his corner.
//   6 NOTEBOOK the frozen moment shrinks onto a page of her scouting notebook as a pencil sketch (her still in colour),
//              and the pages flip back through earlier moments, each sketched with its time, faster and faster, to
//              12:38; then the last sketch fills the screen in colour. The notebook is what survives every loop.
//
// From the address bar: ?effect=1-4, ?dir=forward, ?auto=SECONDS (jump by itself that long after the start, then
// again each time round), ?mute.

import { W, H, C, useContext, screen, fill, text, clamp, seg, lerp, easeIn, easeOut, easeInOut, easeBack, disk, layer } from '../pixel.js';
import { conversation, drawDialog, typed, typedAt, advance } from '../talk.js';
import { drawWithShadow, drawPerson, dirToward } from '../stage.js';
import { makeCutscene } from '../alliance-selection/cutscene.js';
import { makeSetLayers, drawSet } from '../alliance-selection/set.js';
import { lookOf, CROWD } from '../alliance-selection/people.js';
import { MC_LOOK, drawSkater } from '../alliance-selection/mc.js';
import { drawNorbert, drawNorbertBig, BIG_W, BIG_H, NORBERT_W } from '../norbert.js';
import { drawKey } from './key.js';
import { PAGE, PICTURE, sketchOf, picturePage, notesPage, drawBook, drawTurning } from './notebook.js';
import { still, maskOf, swirl, tape, overlay, blend, stepped4 } from './warp.js';
import { sound } from './sound.js';

const canvas = document.getElementById('screen');
const g = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
g.imageSmoothingEnabled = false;
useContext(g);

const params = new URLSearchParams(location.search);
const opts = {
  effect: clamp(Number(params.get('effect')) || 5, 1, 6),
  dir: params.get('dir') === 'forward' ? 1 : -1,
  norbert: true,
  auto: params.has('auto') ? Number(params.get('auto')) || 12 : null,
};
sound.muted = params.has('mute');

// ---- The cut scene, with a way to leave her out ----
let HER = null, hideHer = false, herPose = null, alone = null;
const looks = (k) => {
  const l = k === 'mc' ? MC_LOOK : lookOf(k);
  if (k === '5026') HER = l;
  return l;
};
/**
 * As alliance selection's own drawWorld (scene.js), but she can be left out, or posed (turned to look round). With
 * `alone`, the world is a plain ground with only her on it ('her') or nobody ('none'): the two differ by all of her,
 * even where something stands in front of her in the real frame.
 */
function drawWorld(gg, view, t, frame) {
  if (alone) {
    gg.fillStyle = '#ff00ff';
    gg.fillRect(0, 0, gg.canvas.width, gg.canvas.height);
    const her = frame.people.find((p) => p.look === HER);
    if (alone === 'her' && her) drawPerson(gg, view, herPose ? { ...her, ...herPose } : her);
    return;
  }
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
function paint(m, { her = true, pose = null, grab = true, only = null, words = true } = {}) {
  hideHer = !her;
  herPose = pose;
  alone = only;
  useContext(g);
  screen();
  g.globalAlpha = 1;
  const b = beats[m.i];
  b.draw(g, m.t, { T: m.T, k: clamp(m.t / b.dur, 0, 1) });
  g.globalAlpha = 1;
  if (m.conv && !only && words) drawDialog(g, m.conv, m.clock);
  hideHer = false;
  herPose = null;
  alone = null;
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
  if (!opts.norbert || J?.norbertOut) return;
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
  5: { freeze: 0.5, hop: 0.45, turn: 0.4, wind: 1.5, spin: 0.55, home: 0.8 },
  6: { freeze: 0.5, close: 0.8, flip: 2.8, open: 1.0 },
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
  if (J.kind === 5) J.clicks = ratchet(plan.wind);
  if (J.kind === 6) {
    J.flips = [];
    let t = 0;
    const gaps = Array.from({ length: FLIPS }, (_, i) => 0.8 ** i), sum = gaps.reduce((a, b) => a + b, 0);
    for (const gap of gaps) J.flips.push([t, (t += (gap / sum) * plan.flip)]);
    J.pics = [];
    J.notes = [];
  }
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
function frozen(u, drain, pose = lookRound(u)) {
  const a = paint(J.last, { pose }), b = paint(J.last, { her: false });
  J.center = maskOf(a.data, b.data, mask) ?? J.center;
  still(a.data, out.data, drain, mask);
  J.her = a;
  J.herMask = mask.slice();
  // And all of her, drawn on her own: what's laid over the world once it moves, so nothing that stood in front of
  // her in the stopped frame (the dialog box, someone nearer) leaves her cut off.
  const whole = paint(J.last, { pose, only: 'her' }), none = paint(J.last, { only: 'none' });
  maskOf(whole.data, none.data, mask);
  J.whole = whole;
  J.wholeMask = mask.slice();
  return b;
}
/**
 * Her, over a world that's moving: as she stood in the stopped frame, then the whole of her stepping out in front of
 * whatever covered her, in four steps over a quarter of a second from `since` (seconds into the jump).
 */
function herOver(u, since) {
  overlay(out.data, J.her.data, J.herMask);
  overlay(out.data, J.whole.data, J.wholeMask, stepped4(seg(u, since, since + 0.25)));
}
/** Her middle, or the middle of the screen if she's out of shot. */
const middle = () => J.center ?? { x: W / 2, y: H / 2 - 8 };

function stepJump(now, dt) {
  const u = now - J.t0, d = J.dir;
  if (J.kind === 5) return stepWind(u);
  if (J.kind === 6) return stepBook(u);
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
      herOver(u, J.times.open[0]);
      glow = 1;
    } else if ((k = part('collapse', u)) !== null) {
      const c = middle();
      still(paint(J.last, { her: false }).data, tmp.data, 1);
      swirl(tmp.data, out.data, { cx: c.x, cy: c.y, angle: d * 26, pull: 0.5, core: lerp(26, 320, easeIn(k)), t: u * d });
      if (k < 0.5) herOver(u, J.times.open[0]);
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
/** Forward, by the cut scene's clock, to `target` (not past the end of round two), written down as it goes. */
function forwardTo(target) {
  while (sim < target && P.i < AHEAD) {
    sim = Math.min(target, sim + 0.05);
    run(sim);
  }
  if (P.i >= AHEAD && !J.atAhead) {
    startBeat(AHEAD, sim);
    J.atAhead = true;
  }
  const m = moment();
  rec.push(m);
  return m;
}
/** How far along the travel is, 0 to 1, as a moment: the recording backwards, or the cut scene run on. */
function travelTo(prog) {
  if (J.dir < 0) return J.frames[Math.round((J.frames.length - 1) * (1 - clamp(prog, 0, 1)))];
  return forwardTo(J.last.sim + 70 * prog);
}

// ---- 5 WIND: Norbert's key ----
/** A turn of the key: an eighth of a turn per click. */
const CLICK_TURN = Math.PI / 4, CLICK_TIME = 0.08;
/** When the key clicks, seconds into winding: slow at first, quicker and quicker. */
function ratchet(dur) {
  const clicks = [];
  let t = 0.03, gap = 0.22;
  while (t < dur - 0.04) {
    clicks.push(t);
    t += gap;
    gap = Math.max(0.05, gap * 0.74);
  }
  return clicks;
}
/** He winds it at twice his size, in front of the picture like the cut scenes' close-ups, across from her. */
const BIG = 2;
function norbertSpot() {
  return { x: middle().x > W / 2 ? 10 : W - 10 - BIG_W * BIG, y: H - BIG_H * BIG - 2, scale: BIG };
}
/** He hops along an arc from a (in the corner, small) to b (his spot, full size), k of the way. */
function hopAt(a, b, k) {
  const e = easeInOut(k);
  return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e) - Math.sin(Math.PI * k) * 28, scale: lerp(a.scale, b.scale, e) };
}
const CORNER_SPOT = { x: 3, y: 2, scale: NORBERT_W / BIG_W };
/** The key's middle, on his back. */
const keyAt = (n) => ({ x: Math.round(n.x + 18 * BIG), y: Math.round(n.y + 28 * BIG) });

function stepWind(u) {
  const d = J.dir, spot = norbertSpot();
  const T = J.times;
  cue('tick', u, 0, () => { sound.tick(); sound.hum(T.spin[1]); });
  let k;
  if ((k = part('freeze', u)) !== null) {
    // Everything stops; she looks round, then up at him in the corner. His ear lights up.
    const look = [0, 1, 2, 1, 0, 7, 6, 5][Math.min(7, Math.floor(u / 0.075))];
    frozen(u, seg(k, 0, 0.4), { dir: look, gait: 'stand' });
    g.putImageData(out, 0, 0);
    hud(u > 0.25 ? pulse(u) : 0);
    return false;
  }
  J.norbertOut = true;
  /** Her, turned to watch him. */
  const watch = (n) => {
    const c = middle();
    return { dir: dirToward(n.x + BIG_W * n.scale / 2 - c.x, (n.y + BIG_H * n.scale - c.y - 20) / 0.8), gait: 'stand' };
  };
  if ((k = part('hop', u)) !== null) {
    cue('hop', u, T.hop[0], () => sound.hop());
    const n = hopAt(CORNER_SPOT, spot, k);
    frozen(u, 1, watch(n));
    g.putImageData(out, 0, 0);
    useContext(g); screen();
    drawNorbertBig(n.x, n.y, { scale: n.scale, glow: pulse(u) });
    return false;
  }
  if ((k = part('turn', u)) !== null) {
    cue('squeak', u, T.turn[0], () => sound.squeak());
    cue('pop', u, T.turn[0] + 0.2, () => sound.ratchet(d));
    g.putImageData(out, 0, 0);
    useContext(g); screen();
    const squash = k < 0.15 ? 1 : 0, back = k > 0.25;
    drawNorbertBig(spot.x, spot.y + squash * BIG, { back, glow: pulse(u), scale: BIG });
    if (back) {
      const key = keyAt(spot);
      drawKey(key.x, key.y, 0, easeBack(seg(k, 0.35, 0.8)), BIG);
    }
    return false;
  }
  // Winding: each click turns the key an eighth and ratchets the world back (or on) a step; then it spins free.
  let angle, prog, jolt = 0, spark = false;
  if ((k = part('wind', u)) !== null) {
    const w = u - T.wind[0], n = J.clicks.filter((c) => c <= w).length;
    const since = n ? w - J.clicks[n - 1] : 1;
    angle = d * CLICK_TURN * (Math.max(0, n - 1) + (n ? easeOut(clamp(since / CLICK_TIME, 0, 1)) : 0));
    prog = 0.55 * (n / J.clicks.length) ** 1.4;
    jolt = n && since < 0.05 ? 1 : 0;
    spark = n && since < 0.07;
    for (let i = 0; i < n; i++) cue(`click${i}`, u, T.wind[0] + J.clicks[i], () => sound.ratchet(d));
  } else if ((k = part('spin', u)) !== null) {
    cue('whirr', u, T.spin[0], () => sound.whirr(T.spin[1] - T.spin[0], d));
    const s = u - T.spin[0];
    angle = d * (CLICK_TURN * (J.clicks.length - 1) + 12 * s + 30 * s * s);
    prog = 0.55 + 0.45 * easeIn(k);
  }
  if (angle !== undefined) {
    // The words lift away as the key turns, so nothing's left in front of her.
    const m = travelTo(prog), world = paint(m, { her: false, words: false });
    still(world.data, tmp.data, 1);
    out.data.set(tmp.data);
    herOver(u, T.wind[0]);
    g.putImageData(out, 0, 0);
    useContext(g); screen();
    drawNorbertBig(spot.x, spot.y - jolt * BIG, { back: true, glow: 1, scale: BIG });
    const key = keyAt({ x: spot.x, y: spot.y - jolt * BIG });
    drawKey(key.x, key.y, angle, 1, BIG);
    if (spark) {
      // A glint off the tip of a wing.
      const sx = key.x + Math.round(Math.cos(angle) * 30), sy = key.y + Math.round(Math.sin(angle) * 30);
      fill(sx - 4, sy, 9, 2, C.yel2);
      fill(sx, sy - 4, 2, 9, C.yel2);
    }
    return false;
  }
  // Home: the key goes back in, he turns round and hops back to his corner, and the colour floods back.
  k = part('home', u) ?? 1;
  cue('chime', u, T.home[0], () => sound.chime(d));
  cue('hopHome', u, T.home[0] + 0.35, () => sound.hop());
  const a = paint(landing());
  still(a.data, out.data, 1 - seg(k, 0, 0.6));
  g.putImageData(out, 0, 0);
  useContext(g); screen();
  if (k < 0.35) {
    drawNorbertBig(spot.x, spot.y, { back: k < 0.22, glow: 0.4, scale: BIG });
    if (k < 0.22) { const key = keyAt(spot); drawKey(key.x, key.y, 0, 1 - seg(k, 0, 0.2), BIG); }
  } else if (k < 1) {
    const n = hopAt(spot, CORNER_SPOT, seg(k, 0.35, 1));
    drawNorbertBig(n.x, n.y, { scale: n.scale });
  }
  if (k >= 1 || u >= J.end) {
    J.norbertOut = false;
    hud(0);
    return true;
  }
  return false;
}

// ---- 6 NOTEBOOK: flipping back through her scouting notebook ----
const FLIPS = 9;
/** Page n's moment: n = 0 is now, n = FLIPS is where she lands. */
const pageMoment = (n) => (n >= FLIPS && J.dir > 0 ? landing() : travelTo((n / FLIPS) ** 1.3));
/** The right-hand page for moment n: its sketch, with her in colour, and its time; and the moment in colour. */
function pic(n) {
  if (!J.pics[n]) {
    const m = pageMoment(n), a = paint(m), b = paint(m, { her: false });
    maskOf(a.data, b.data, mask);
    const time = `SAT ${hms(eventTime(m.sim), false)} PM`;
    J.pics[n] = { m, page: picturePage(sketchOf(a.data, mask), time), color: canvasOf(a) };
  }
  return J.pics[n];
}
const note = (n) => (J.notes[n] ??= notesPage(n * 17 + 3));
function canvasOf(img) {
  return layer(W, H, (lg) => lg.putImageData(img, 0, 0)).canvas;
}
/** Where the picture on the right-hand page is, on the screen. */
const PIC_RECT = { x: PAGE.right + PICTURE.x, y: PAGE.y + PICTURE.y, w: PICTURE.w, h: PICTURE.h };
const rectAt = (k) => ({
  x: lerp(0, PIC_RECT.x, k), y: lerp(0, PIC_RECT.y, k), w: lerp(W, PIC_RECT.w, k), h: lerp(H, PIC_RECT.h, k),
});

function stepBook(u) {
  const d = J.dir, T = J.times;
  cue('tick', u, 0, () => sound.tick());
  let k;
  if ((k = part('freeze', u)) !== null) {
    frozen(u, seg(k, 0, 0.6));
    g.putImageData(out, 0, 0);
    hud(u > 0.2 ? pulse(u) : 0);
    return false;
  }
  if ((k = part('close', u)) !== null) {
    // The stopped moment shrinks onto the right-hand page and becomes its sketch.
    if (!J.snap) J.snap = canvasOf(out);
    pic(0); note(0);
    drawBook(g, note(0), pic(0).page);
    if (k < 0.9) {
      const r = rectAt(easeInOut(seg(k, 0, 0.85)));
      g.drawImage(J.snap, Math.round(r.x), Math.round(r.y), Math.round(r.w), Math.round(r.h));
    }
    hud(pulse(u));
    return false;
  }
  if ((k = part('flip', u)) !== null) {
    const f = u - T.flip[0];
    const i = Math.max(0, J.flips.findIndex(([a, b]) => f >= a && f < b));
    const [a, b] = J.flips[i], kk = (f - a) / (b - a);
    cue(`flip${i}`, u, T.flip[0] + a, () => sound.flip());
    // Going back, the left-hand page turns over to the right; going forward, the right-hand page turns to the left.
    pic(i); pic(i + 1); note(i); note(i + 1);
    if (d < 0) {
      drawBook(g, note(i + 1), pic(i).page);
      if (kk < 0.5) drawTurning(g, note(i), 'left', kk * 2);
      else drawTurning(g, pic(i + 1).page, 'right', (1 - kk) * 2);
    } else {
      drawBook(g, note(i), pic(i + 1).page);
      if (kk < 0.5) drawTurning(g, pic(i).page, 'right', kk * 2);
      else drawTurning(g, note(i + 1), 'left', (1 - kk) * 2);
    }
    hud(1);
    return false;
  }
  // Open: she writes the time she's landed at, then that page's picture fills the screen in colour.
  k = part('open', u) ?? 1;
  cue('chime', u, T.open[0], () => sound.chime(d));
  const last = pic(FLIPS);
  if (d < 0) landing();
  drawBook(g, note(FLIPS), last.page);
  const said = `${d < 0 ? 'BACK TO' : 'ON TO'} ${hms(eventTime(last.m.sim), false)}`;
  text(said, PAGE.left + 14, PAGE.y + PAGE.h - 13, { color: C.red1, upto: Math.floor(seg(k, 0, 0.35) * said.length) });
  if (k > 0.4) {
    const r = rectAt(1 - easeInOut(seg(k, 0.4, 1)));
    g.drawImage(last.color, Math.round(r.x), Math.round(r.y), Math.round(r.w), Math.round(r.h));
  }
  hud(0);
  return k >= 1 || u >= J.end;
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
  if ('123456'.includes(key) && key) opts.effect = Number(key);
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
