// The stage for Blue Banner's scenes. A scene opens on a cut scene, then hands you the strategist to walk around and
// talk to people (or, where there's no room to walk, people to talk to). The big screen is a 256x144 canvas and the
// phone beside it is the controller: a stick, and A to talk, read on and hurry the cut scene along. A scene module
// describes its world and its cut scene; this file does the rest: input, walking, the camera, conversations and the
// cut scene's clock.
//
//   import { runScene } from '../stage.js';
//   runScene(scene);   // builds the big screen and the phone inside <div id="stage">
//
// A scene is an object with:
//   name                  the place, for the phone and the card under the screen: 'THE PITS'
//   label                 what the big screen shows, for screen readers
//   world: { w, h }       its size in pixels. The camera follows her and stays inside it.
//   start: { x, y, dir }  where she stands when the cut scene ends; dir is 0-7, clockwise from facing you (walker.js)
//   draw(g, view, t, s)   the world as seen from view = { x, y } (world position minus view = screen position), t seconds
//                         after the page opened. Draw everyone, her included: s.player is { y, draw } to sort in by feet
//                         with everything else. s.talk is the conversation going on, if any (s.talk.person: with whom).
//   move(x, y, dx, dy)    where a step from (x, y) by (dx, dy) ends up, as [x, y]: walls, tables and people stop her.
//   people                who she can talk to: { name, x, y, lines, look }, (x, y) their feet and lines a conversation
//                         (talk.js). The bubble shows over the closest one within 14 pixels across and 10 deep (reach
//                         and reachY change that, per person). faceGait, if they aren't standing, is how the phone
//                         shows them while you talk (faceDy moves that picture down, for the shorter poses; faceDir
//                         turns it, 0 facing you if not given: someone seated reads better turned).
// and, if it needs them:
//   cutscene              a list of beats (below). Without one the scene starts with her walking.
//   look                  who you steer (HERO_LOOK, the strategist, if not given)
//   setup(s)              once, before the first frame: make floor layers and the like
//   reach(s)              who's in reach, instead of the closest of `people`
//   faceTo(p)             where to turn to talk to p, if not their feet: { x, y }
//   prompt(g, view, p, t) draw the bubble over p yourself (drawBubble in talk.js), if it doesn't belong over their head
//   camera(s)             where the view goes, if not following her: { x, y }
//   update(dt, s)         instead of walking: the stick is s.stick() ({ x, y, mag }) and s.me is yours to move or not.
//                         For a scene with no room to walk (the van): the stick picks who to talk to.
//   hint, note            the phone's hint line and the note under the controls, if the usual ones don't fit
//   status(s)             the phone's status line under her name, if not STANDING, WALKING N and so on
//   act(s), actLabel(s)   A when nobody's in reach, for a scene where A does something else (the opening's pick: A
//                         picks a card), and what the phone's A button says for it then
//   clock(s)              the seconds left on a clock that's running, or null: not the stage's, but sound.js ticks it
//   pointer(type, x, y, s)
//                         a tap or a drag on the screen, for a scene with things on it to press or drag (the opening's
//                         tablet, the van's seats): type 'down', then 'move' and 'up' if it took the 'down'; (x, y) in
//                         screen pixels (0-255, 0-143). Return true from 'down' to take it, and the stage leaves it be.
//   spriteOf(p)           where p is drawn, if not at their feet { x, y } (someone seated in the stands), for taps
//   stick: false          in play.html, no stick on the screen: for a card with nobody to steer
//   exit: { x, y0, y1, label, sign }
//                         the way out, on the right (every scene is entered on the left and left on the right): once
//                         her feet are past x, between y0 and y1, she walks on out of the picture and the screen fades.
//                         An arrow points the way, with label over it ('TO THE PITS'); sign: { y } moves the arrow, which
//                         otherwise sits a little above the middle of the gap. move() has to let her get there. In
//                         play.html leaving is on to the next scene; on the scene's own page she comes back in.
//   enter                 a path, [[x, y], ...], she walks in along as the cut scene ends, on to start: from off the left
//                         edge, say. The stick is hers once she gets there. Not with ?x= in the address.
// A scene with no exit, in play.html, gets a NEXT SCENE button instead.
//
// A cut scene is a list of beats. Each is { dur, draw(g, t, c) }: draw the whole screen t seconds into the beat; c.T is
// seconds into the cut scene and c.k is t / dur (0 to 1). A beat can say something: say: { name, lines, at, auto, tag,
// look, faceGait, faceDir, faceDy } types the pages in lines (a conversation, as in talk.js; name says who, for the
// pages that don't) into the dialog box from `at` seconds into the beat, and while the words are up the phone shows
// `look` (a walker look, posed and turned as for people, above) as the one talking; a page of the form { name, lines,
// look, faceGait, faceDir, faceDy } shows its own speaker. Then the beat waits at its end until it's been read: A
// finishes the typing, turns the page and, after the last page, moves on.
// With auto the pages turn by themselves (A still hurries them). While a beat waits, t runs on past dur, so hold still
// past it. A beat without words moves on after dur, or straight away on A (not before its hold, in seconds, if it has
// one: something A mustn't skip); with wait: true it waits at its end for A instead, the dialog box's arrow blinking in
// the corner (something to read that isn't words in the box: a text on her phone). SKIP (or Esc) ends the cut scene.
// Draw with pixel.js: the context is set and the camera is at the screen for you. cover, bars, placeCard and along
// (below) are here so every scene's cut scene shares one style.
//
// The scene's state, s, is window.stage, for poking at from the console. From the address bar: ?at=SECONDS freezes the
// cut scene at that moment, words typed as far as they'd be with no waiting (for screenshots); ?beat=N starts the cut
// scene at beat N; ?play skips it; ?x=..&y=..&dir=.. start her somewhere else.
//
// runScene(scene, { layout: 'full', root, onLeave, exitLabel, nextLabel, params }) is the game itself (play.html): the
// screen fills the window and the stick is a dot in a dashed ring in the bottom right corner (WASD or the arrow keys on a
// keyboard).
//
// Every spot on the screen can be tapped (or clicked), on either layout. A tap goes first to the scene's pointer(), if it
// takes it; then, while she's free to walk: on someone, she walks over and talks to them; on the way out's arrow, she
// heads out; anywhere else on the floor, she walks there. In a cut scene, a conversation or a scene with no walking, a
// tap is A. Off the picture (the bars beside it), a tap is A.
//
// onStage(fn) hears what happens, for the sound (sound.js): fn(type, detail, s) with type 'scene', 'beat', 'free',
// 'frame' (every frame), 'a', 'page', 'talk', 'talked', 'step' (each footfall: detail.gait), 'leave', 'gone', 'skip',
// 'tap'. onLeave is called once she's left (or NEXT SCENE was pressed) and the screen is
// black; s.stop() ends the scene so the next can have the page.

import { W, H, C, useContext, screen, fill, text, measure, withAlpha, stepped, clamp, lerp, seg, easeOut, easeIn } from './pixel.js';
import { DIRS, CELL_W, CELL_H, walkerFrame, drawWalker, HERO_LOOK } from './walker.js';
import { conversation, drawBubble, drawDialog, drawMore, advance, dialogText, typed, typedAt } from './talk.js';
import { HERO_NAME } from './cast.js';

/** Pixels a second at each gait, and pixels of travel per animation frame, so feet don't slide. */
export const SPEED = { walk: 34, run: 78 };
export const STRIDE = { walk: 3.2, run: 6 };
/** Going down the screen covers more ground than going across: the floor recedes (20 degrees down, walker.js). */
const DEPTH = 0.8;

/** The direction (0-7, clockwise from facing you) that points along (dx, dy) on the screen. */
export const dirToward = (dx, dy) => ((Math.round((Math.atan2(dx, dy) * 180) / Math.PI / 45) % 8) + 8) % 8;
/** Someone's animation frame: { gait, dist } steps with the distance they've covered. */
export const frameOf = (p) => (STRIDE[p.gait] ? Math.floor((p.dist ?? 0) / STRIDE[p.gait]) : (p.frame ?? 0));

/** Someone on the walker's rig, { x, y, dir, gait, dist, look } in world pixels, seen from view. */
export function drawPerson(g, view, p) {
  drawWalker(g, Math.round(p.x - view.x), Math.round(p.y - view.y), p.dir ?? 0, p.gait ?? 'stand', frameOf(p), p.look ?? HERO_LOOK);
}
/** The same with a shadow on the floor under them: for anyone walking about. */
export function drawWithShadow(g, view, p) {
  const x = Math.round(p.x - view.x), y = Math.round(p.y - view.y);
  g.fillStyle = 'rgba(5, 6, 13, 0.45)';
  g.fillRect(x - 6, y - 1, 12, 3);
  g.fillRect(x - 4, y - 2, 8, 5);
  drawPerson(g, view, p);
}

/**
 * Someone following a path at a steady pace, as a pure function of time, for cut scenes: where they are t seconds after
 * setting off from the first point, which way they face and how far they've come. Before setting off and after the last
 * point they stand, facing along the first and last legs. path: [[x, y], ...]; gait: 'walk', 'run' or any walker gait,
 * at speed pixels a second.
 */
export function along(path, t, gait = 'walk', speed = SPEED[gait] ?? SPEED.walk) {
  const legs = path.slice(1).map(([x1, y1], i) => {
    const [x0, y0] = path[i];
    return { x0, y0, dx: x1 - x0, dy: y1 - y0, len: Math.hypot(x1 - x0, (y1 - y0) / DEPTH) };
  }).filter((l) => l.len > 0);
  if (!legs.length) return { x: path[0][0], y: path[0][1], dir: 0, gait: 'stand', dist: 0 };
  const dirOf = (l) => dirToward(l.dx, l.dy / DEPTH);
  if (t <= 0) return { x: legs[0].x0, y: legs[0].y0, dir: dirOf(legs[0]), gait: 'stand', dist: 0 };
  let left = t * speed, dist = 0;
  for (const l of legs) {
    if (left <= l.len) {
      const k = left / l.len;
      return { x: l.x0 + l.dx * k, y: l.y0 + l.dy * k, dir: dirOf(l), gait, dist: dist + left };
    }
    left -= l.len;
    dist += l.len;
  }
  const last = legs[legs.length - 1];
  return { x: last.x0 + last.dx, y: last.y0 + last.dy, dir: dirOf(last), gait: 'stand', dist };
}

// ---- One style for every cut scene ----
/** Fade to a colour, black unless given: a from 0 (none) to 1 (all), in four hard steps like old consoles. */
export function cover(a, c = C.ink) {
  if (a <= 0) return;
  screen();
  withAlpha(stepped(a), () => fill(0, 0, W, H, c));
}
/** Film bars across the top and bottom: k from 0 (none) to 1 (12 pixels each). */
export function bars(k) {
  const h = Math.round(12 * clamp(k, 0, 1));
  if (h <= 0) return;
  screen();
  fill(0, 0, W, h, C.ink);
  fill(0, H - h, W, h, C.ink);
}
/**
 * The place's name on a card in the top left as a scene opens, t seconds in: slides in, holds three seconds, slides out.
 * It sits clear of the film bars. sub: a second, smaller line (the day and time, say). y moves it down the screen and
 * hold changes how long it stays (it slides out from hold + 0.6 seconds), for a card that isn't the scene's first.
 */
export function placeCard(t, name, sub, { y = 16, hold = 3 } = {}) {
  if (t < 0 || t > hold + 1.2) return;
  const w = Math.max(measure(name), sub ? measure(sub, { font: 3 }) : 0) + 16, h = sub ? 23 : 15, out = hold + 0.6;
  const x = Math.round(t < out ? lerp(-w, 6, easeOut(seg(t, 0.2, 0.6))) : lerp(6, -w, easeIn(seg(t, out, out + 0.4))));
  screen();
  fill(x, y, w, h, C.ink);
  fill(x + 1, y + 1, w - 2, h - 2, C.blue1);
  fill(x + 1, y + 1, w - 2, 1, C.blue2);
  text(name, x + 8, y + 4, { color: C.white });
  if (sub) text(sub, x + 8, y + 14, { font: 3, color: C.blue3 });
}

// ---- The page ----
const esc = (str) => String(str).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
const markup = (scene) => `
<div class="play">
  <div class="tv">
    <span class="label">BIG SCREEN</span>
    <div class="view"><canvas class="screen" width="${W}" height="${H}" aria-label="${esc(scene.label ?? scene.name)}"></canvas></div>
    <div class="tvbar"><span class="label">${esc(scene.name)}</span><button type="button" class="replay">Replay the cut scene</button></div>
  </div>
  <div class="phone" aria-label="Phone controller">
    <div class="status"><span>9:41</span><b>● 5026</b></div>
    <div class="who">
      <canvas class="face" width="${CELL_W}" height="${CELL_H}" aria-hidden="true"></canvas>
      <div><strong class="whoname">${esc(HERO_NAME)}</strong><span class="mode" role="status"></span></div>
    </div>
    <p class="line said" aria-live="polite" hidden></p>
    <div class="padwrap">
      <div class="pad" tabindex="0" role="application" aria-label="Movement stick. Drag, or use the arrow keys and Shift.">
        <div class="ring"></div>
        <div class="ring walk"></div>
        ${scene.update ? '' : '<span class="zone run">RUN</span>\n        <span class="zone walk">WALK</span>'}
        <div class="knob"></div>
      </div>
    </div>
    <div class="actions">
      <button type="button" class="abtn" disabled><span>A</span></button>
      <span class="alabel">NOBODY NEARBY</span>
      <button type="button" class="skip" hidden>SKIP</button>
    </div>
    <p class="hint">${esc(scene.hint ?? 'Drag the stick, tap A to talk')}</p>
  </div>
</div>
<p class="note">${esc(scene.note ?? 'Push the stick a little to walk, all the way to run, and press A by someone to talk. In the cut scene, A reads on and SKIP jumps to the end. On a keyboard: arrow keys or WASD, Shift to run, Space or Enter for A, Esc to skip.')}</p>`;
/** The game's own layout: just the screen, as big as the window allows, with the stick and two buttons over it. */
const fullMarkup = (scene, nextLabel) => `
<div class="full" data-mode="cut"${scene.stick === false ? ' data-stick="off"' : ''}>
  <canvas class="screen" width="${W}" height="${H}" aria-label="${esc(scene.label ?? scene.name)}"></canvas>
  <div class="stick" role="application" aria-label="Movement stick. Drag the dot a little to walk, all the way out to run. On a keyboard: WASD or the arrow keys, and Shift to run.">
    <div class="ring"><div class="dot"></div></div>
  </div>
  <div class="corner">
    <button type="button" class="skip" hidden>SKIP</button>
    <button type="button" class="next" hidden>${esc(nextLabel)}</button>
  </div>
  <p class="turn">Turn your phone sideways</p>
</div>`;

/** Seconds a scene takes to fade in, and to fade out as she leaves. */
const FADE_IN = 0.5, FADE_OUT = 0.4;
/** In the game: whether she's being steered from a keyboard, which hides the stick (for the next scene too) until a touch. */
let byKeys = false;

/** Who's listening to what happens on the stage (the sound). onStage returns a function that stops listening. */
const listeners = new Set();
export function onStage(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Put a scene on the page and run it. Returns its state (also window.stage). */
export function runScene(scene, opts = {}) {
  const { layout = 'phone', onLeave = null, exitLabel, nextLabel = 'NEXT SCENE', params = new URLSearchParams(location.search) } = opts;
  const full = layout === 'full';
  const root = opts.root ?? document.getElementById('stage');
  root.innerHTML = full ? fullMarkup(scene, nextLabel) : markup(scene);
  const $ = (sel) => root.querySelector(sel);
  const tv = $('.screen'), face = $('.face'), box = full ? $('.full') : null;
  const g = tv.getContext('2d', { alpha: false }), fg = face?.getContext('2d');
  g.imageSmoothingEnabled = false;
  if (fg) fg.imageSmoothingEnabled = false;
  // Everything this scene listens to, so stop() can let go of it all at once.
  const ac = new AbortController(), on = { signal: ac.signal };

  // Whole-number zoom, so every pixel stays square. Filling the window, that's whole device pixels (like the intro),
  // falling back to a smooth fit when the whole-number one would be much smaller. The room to spare beside the picture
  // goes to the right first, as far in as the stick's ring reaches, so on a long phone held sideways the ring sits beside
  // the picture rather than over the right edge of it, where every scene's way out is.
  const fit = full ? () => {
    const dpr = window.devicePixelRatio || 1, r = box.getBoundingClientRect(), css = getComputedStyle(box);
    const left = parseFloat(css.paddingLeft), right = parseFloat(css.paddingRight);
    const bw = r.width - left - right, bh = r.height - parseFloat(css.paddingTop) - parseFloat(css.paddingBottom);
    const exact = Math.min(bw / W, bh / H), whole = Math.floor(exact * dpr) / dpr;
    const z = whole >= exact * 0.8 && whole > 0 ? whole : exact;
    const cw = Math.floor(W * z), spare = bw - cw, ring = $('.ring').getBoundingClientRect();
    const reach = ring.width ? r.right - right - ring.left + 6 : 0;
    tv.style.width = `${cw}px`;
    tv.style.height = `${Math.floor(H * z)}px`;
    tv.style.marginLeft = `${Math.round(spare - Math.max(spare / 2, Math.min(spare, reach)))}px`;
    box.classList.toggle('crowded', reach > spare + 12); // no room beside it: the ring sits on the picture, so it's fainter
  } : () => {
    const room = tv.parentElement.clientWidth - 4;
    tv.style.width = `${W * Math.max(1, Math.min(4, Math.floor(room / W)))}px`;
  };
  const resize = new ResizeObserver(fit);
  resize.observe(root);
  fit();

  const num = (k) => (params.has(k) && params.get(k) !== '' ? Number(params.get(k)) : null);
  const look = scene.look ?? HERO_LOOK;
  const beats = scene.cutscene ?? [];
  const offsets = beats.map((_, i) => beats.slice(0, i).reduce((n, b) => n + b.dur, 0));
  const start = { dir: 0, ...scene.start };
  for (const k of ['x', 'y', 'dir']) if (num(k) != null) start[k] = num(k);
  const input = { x: 0, y: 0, keys: new Set() };

  const s = {
    scene, mode: 'free', me: { x: start.x, y: start.y, dir: start.dir, gait: 'stand', dist: 0 }, look,
    near: null, talk: null, cut: null, view: { x: 0, y: 0 }, player: null, frozen: num('at'),
    // auto: a walk she's taking by herself (in, or out), mode 'auto'. fadeIn: when the picture began fading in.
    auto: null, fadeIn: full && num('at') == null ? performance.now() / 1000 : null,
    stick() {
      // The phone's stick wins; otherwise the keyboard.
      if (!input.x && !input.y && input.keys.size) {
        const x = (input.keys.has('right') ? 1 : 0) - (input.keys.has('left') ? 1 : 0);
        const y = (input.keys.has('down') ? 1 : 0) - (input.keys.has('up') ? 1 : 0);
        return { x, y, mag: x || y ? (input.keys.has('shift') ? 1 : 0.5) : 0 };
      }
      return { x: input.x, y: input.y, mag: Math.min(1, Math.hypot(input.x, input.y)) };
    },
  };
  window.stage = s;
  const emit = (type, detail) => listeners.forEach((fn) => fn(type, detail, s));
  scene.setup?.(s);
  emit('scene', { scene, full });

  // ---- The cut scene ----
  function startBeat(i, now) {
    if (i >= beats.length) return endCut();
    const b = beats[i];
    s.mode = 'cut';
    emit('beat', { i, beat: b });
    s.cut = {
      i, t0: now, read: !b.say,
      conv: b.say ? conversation(b.say.name, b.say.lines, now + (b.say.at ?? 0), { tag: b.say.tag }) : null,
    };
  }
  function endCut() {
    s.mode = 'free';
    s.cut = null;
    s.talk = null;
    s.goal = null;
    Object.assign(s.me, { x: start.x, y: start.y, dir: start.dir, gait: 'stand', dist: 0 });
    emit('free');
    // She comes in along scene.enter, if it has one: the stick is hers once she's on her mark.
    if (scene.enter?.length && num('x') == null) {
      const path = [...scene.enter, [start.x, start.y]];
      walkBy(path, 'walk', () => {
        s.mode = 'free';
        Object.assign(s.me, { dir: start.dir, gait: 'stand' });
      });
    }
    scene.onFree?.(s);
  }

  // ---- In and out ----
  /** She walks path by herself at gait, then done(now). hold: seconds to wait at the end; out: fade out on the way. */
  function walkBy(path, gait, done, { hold = 0, out = false } = {}) {
    const len = path.slice(1).reduce((n, [x, y], i) => n + Math.hypot(x - path[i][0], (y - path[i][1]) / DEPTH), 0);
    s.mode = 'auto';
    s.talk = null;
    s.auto = { path, gait, done, hold, out, t0: performance.now() / 1000, dur: len / SPEED[gait], dist: s.me.dist, view: { ...s.view } };
  }
  function autoStep(now) {
    const a = s.auto, t = now - a.t0;
    if (a.path.length > 1) {
      const p = along(a.path, Math.min(t, a.dur), a.gait);
      Object.assign(s.me, { x: p.x, y: p.y, dir: p.dir, gait: t < a.dur ? a.gait : 'stand', dist: a.dist + p.dist });
    }
    if (t >= a.dur + a.hold) a.done(now);
  }
  /** Out she goes, on past the right edge of the picture with the camera held still (or a few steps, at most), and the
   * screen fades. */
  function leave() {
    const me = s.me, gait = me.gait === 'run' ? 'run' : 'walk';
    const x = me.x + clamp(s.view.x + W + 20 - me.x, 16, 48);
    s.goal = null;
    walkBy([[me.x, me.y], [x, me.y]], gait, left, { hold: 0.15, out: true });
    emit('leave');
  }
  /** NEXT SCENE: she stays put and the screen fades. */
  function moveOn() {
    if (s.mode === 'auto' || !onLeave) return;
    walkBy([[s.me.x, s.me.y]], 'walk', left, { hold: FADE_OUT + 0.15, out: true });
  }
  /** Gone: on to whatever's next, or (on the scene's own page) back in at the start. */
  function left(now) {
    emit('gone');
    if (onLeave) {
      s.stop();
      onLeave(s);
      return;
    }
    s.fadeIn = now;
    endCut();
  }
  /** The fades over everything: in as a scene opens or she comes back, out as she leaves. */
  function shade(now) {
    const a = s.auto, outBy = a?.out ? a.t0 + Math.max(a.dur, FADE_OUT) : 0;
    const k = Math.max(s.fadeIn != null ? 1 - seg(now, s.fadeIn, s.fadeIn + FADE_IN) : 0,
      s.mode === 'auto' && a.out ? seg(now, outBy - FADE_OUT, outBy) : 0);
    if (k > 0) cover(k);
  }
  function drawBeat(b, t, T, conv, clock) {
    useContext(g);
    screen();
    g.globalAlpha = 1;
    b.draw(g, t, { T, k: clamp(t / b.dur, 0, 1) });
    g.globalAlpha = 1;
    if (conv) drawDialog(g, conv, clock);
  }
  function cutFrame(now) {
    let c = s.cut;
    const b = beats[c.i];
    // Pages that turn by themselves wait a moment after they finish typing: longer pages, longer.
    if (c.conv && !c.read && b.say.auto && typed(c.conv, now)) {
      const page = c.conv.pages[c.conv.page], chars = (Array.isArray(page) ? page : page.lines).join('').length;
      if (now > typedAt(c.conv) + 1.2 + chars * 0.035 && !advance(c.conv, now)) c.read = true;
    }
    if (now - c.t0 >= b.dur && c.read && !b.wait) {
      startBeat(c.i + 1, now);
      if (s.mode !== 'cut') return false;
      c = s.cut;
    }
    const t = now - c.t0;
    drawBeat(beats[c.i], t, offsets[c.i] + t, c.read ? null : c.conv, now);
    // A beat that waits for A, waiting.
    if (beats[c.i].wait && t >= beats[c.i].dur && Math.floor(now * 2.5) % 2 === 0) {
      useContext(g);
      screen();
      g.globalAlpha = 1;
      drawMore(240, H - 8, C.white);
    }
    return true;
  }
  /** ?at=SECONDS: that moment of the cut scene, held still. */
  function frozenFrame(T) {
    const i = offsets.findLastIndex((o) => T >= o);
    const b = beats[i], t = T - offsets[i];
    const conv = b.say ? conversation(b.say.name, b.say.lines, b.say.at ?? 0, { tag: b.say.tag }) : null;
    drawBeat(b, t, T, conv, t);
  }

  // ---- Walking about ----
  function closest() {
    let best = null, bestD = Infinity;
    for (const p of scene.people ?? []) {
      const dx = Math.abs(p.x - s.me.x), dy = Math.abs(p.y - s.me.y);
      if (dx < (p.reach ?? 14) && dy < (p.reachY ?? 10) && dx + dy < bestD) [best, bestD] = [p, dx + dy];
    }
    return best;
  }
  /** Where a tap sent her: { x, y, person } in the world. The stick takes over the moment it's pushed. For someone to
   * talk to, she tries spots round them, nearest first, until they're in reach: beside, in front, behind. */
  function goTo(x, y, person = null) {
    const spots = person
      ? [[0, 0], [-16, 0], [16, 0], [0, 12], [-14, 10], [14, 10], [0, -12], [-14, -10], [14, -10]]
        .map(([dx, dy]) => [x + dx, y + dy])
        .sort((a, b) => Math.hypot(a[0] - s.me.x, a[1] - s.me.y) - Math.hypot(b[0] - s.me.x, b[1] - s.me.y))
      : [[x, y]];
    const [gx, gy] = spots.shift();
    s.goal = { x: gx, y: gy, person, spots, best: Infinity, since: performance.now() / 1000 };
  }
  function walk(dt) {
    const st = s.stick(), me = s.me, now = performance.now() / 1000;
    if (st.mag >= 0.2) s.goal = null;
    const goal = s.goal, gx = goal ? goal.x - me.x : 0, gy = goal ? (goal.y - me.y) / DEPTH : 0, far = Math.hypot(gx, gy);
    // On her way somewhere: there, or no nearer for half a second (something's in the way), she stops.
    if (goal) {
      if (far < goal.best - 0.5) [goal.best, goal.since] = [far, now];
      if (far < 2 || now - goal.since > 0.5) {
        const next = goal.person && goal.spots.shift();
        if (next) Object.assign(goal, { x: next[0], y: next[1], best: Infinity, since: now });
        else s.goal = null;
      }
    }
    if (s.talk || (!s.goal && st.mag < 0.2)) {
      me.gait = 'stand';
      return;
    }
    const steer = s.goal ? { x: gx, y: gy } : st;
    me.dir = dirToward(steer.x, steer.y);
    me.gait = s.goal ? (far > 72 ? 'run' : 'walk') : st.mag < 0.68 ? 'walk' : 'run';
    // A tap's walk goes straight at the spot; the stick's, along the eight ways she faces.
    const a = s.goal ? Math.atan2(gx, gy) : (me.dir * Math.PI) / 4, v = Math.min((scene.speed ?? SPEED)[me.gait] * dt, s.goal ? far : Infinity);
    const step = (b) => scene.move(me.x, me.y, Math.sin(b) * v, Math.cos(b) * v * DEPTH);
    const ahead = ([x, y]) => (x - me.x) * Math.sin(a) + ((y - me.y) / DEPTH) * Math.cos(a);
    let [nx, ny] = step(a);
    // Stopped by a corner, a table or someone: an eighth of a turn either way, if that still takes her the way she's
    // pushed, so she slips round it instead of walking on the spot. Square against a wall, neither way gets her on.
    // Which way she faces while she slips round holds a moment after, so it doesn't flicker frame to frame.
    if (ahead([nx, ny]) < v * 0.25) {
      let best = 0, got = Math.max(ahead([nx, ny]), v * 0.4);
      for (const turn of [-1, 1]) {
        const p = step(a + (turn * Math.PI) / 4);
        if (ahead(p) > got) [best, got, nx, ny] = [turn, ahead(p), p[0], p[1]];
      }
      if (best) me.slip = { turn: best, at: now, dir: me.dir };
    }
    if (me.slip?.dir === me.dir && now - me.slip.at < 0.15) me.dir = (me.dir + me.slip.turn + 8) % 8;
    const before = frameOf(me);
    me.dist += Math.hypot(nx - me.x, ny - me.y) || v * 0.3;
    me.x = nx;
    me.y = ny;
    if (frameOf(me) !== before && frameOf(me) % 4 === 0) emit('step', { gait: me.gait });
  }
  function follow() {
    const ww = scene.world?.w ?? W, wh = scene.world?.h ?? H;
    return {
      x: Math.round(clamp(s.me.x - W / 2, 0, Math.max(0, ww - W))),
      y: Math.round(clamp(s.me.y - 28 - H / 2, 0, Math.max(0, wh - H))),
    };
  }
  function freeFrame(now, dt) {
    const e = scene.exit;
    if (s.mode === 'auto') {
      autoStep(now);
      if (stopped) return;
    } else {
      if (scene.update) scene.update(dt, s);
      else walk(dt);
      if (e && !s.talk && s.me.x >= e.x && s.me.y >= e.y0 && s.me.y <= e.y1) leave();
    }
    s.near = s.talk || s.mode === 'auto' ? null : scene.reach ? scene.reach(s) : closest();
    // Walked over to someone tapped: once they're the one in reach, she talks to them.
    if (s.goal?.person && s.near === s.goal.person) {
      s.goal = null;
      pressA();
    }
    const view = (s.view = s.mode === 'auto' && s.auto.out ? s.auto.view : scene.camera ? scene.camera(s) : follow());
    s.player = { y: s.me.y, draw: () => drawWithShadow(g, view, { ...s.me, look }) };
    useContext(g);
    screen();
    g.globalAlpha = 1;
    scene.draw(g, view, now, s);
    g.globalAlpha = 1;
    if (e && s.mode === 'free' && !s.talk) drawExit(e, view, now);
    if (s.near && !s.talk) {
      if (scene.prompt) scene.prompt(g, view, s.near, now);
      else drawBubble(g, s.near.x - view.x + 11, s.near.y - view.y - 50, now);
    }
    if (s.talk) drawDialog(g, s.talk, now);
  }
  /** The way out: an arrow nudging right, white on an ink outline like the bubbles, with where it goes over it. Neither
   * is drawn over her: it's an overlay, drawn after the scene, so it would sit on her face (she's found it by then). */
  function drawExit(e, view, now) {
    // Just past the right edge, it waits at the edge, whole, pointing on: the way out is that way.
    const at = Math.round(e.x - view.x) - 3;
    if (at < -4 || at > W + 60) return;
    const x = Math.min(at, W - 5) + (Math.floor(now * 2.5) % 2);
    const y = Math.round((e.sign?.y ?? (e.y0 + e.y1) / 2 - 24) - view.y);
    // Her, 12 pixels either side of her feet and from 48 over them to 2 under; the arrow, ink outline and nudge included.
    const hx = Math.round(s.me.x - view.x), hy = Math.round(s.me.y - view.y);
    const onHer = (x0, x1, y0, y1) => hx + 12 > x0 && hx - 12 < x1 && hy - 48 < y1 && hy + 2 > y0;
    if (onHer(x - 10, x + 3, y - 6, y + 6)) return;
    screen();
    const arrow = (c, o) => {
      fill(x - 9 - o, y - 1 - o, 6 + 2 * o, 3 + 2 * o, c);
      for (let i = 0; i < 5; i++) fill(x - 3 + i - o, y - 4 + i - o, 1 + 2 * o, 9 - 2 * i + 2 * o, c);
    };
    arrow(C.ink, 1);
    arrow(C.white, 0);
    const label = exitLabel ?? e.label;
    s.exitAt = { x0: x - (label ? measure(label, { font: 3 }) : 10) - 4, x1: x + 6, y0: y - 16, y1: y + 8 };
    if (label && !onHer(x - measure(label, { font: 3 }) - 1, x + 2, y - 14, y - 6)) {
      text(label, x + 1, y - 13, { font: 3, color: C.white, outline: C.ink, align: 'right' });
    }
  }

  // ---- A, and skipping ----
  function pressA() {
    const now = performance.now() / 1000;
    emit('a');
    if (s.mode === 'cut') {
      const c = s.cut, b = beats[c.i];
      if (c.conv && !c.read) {
        if (now < c.conv.start) c.conv.start = now; // the words come straight away
        else if (advance(c.conv, now)) emit('page');
        else {
          c.read = true;
          if (now - c.t0 >= b.dur) startBeat(c.i + 1, now);
        }
      } else if (now - c.t0 >= (b.hold ?? 0)) startBeat(c.i + 1, now);
    } else if (s.talk) {
      if (advance(s.talk, now)) emit('page');
      else {
        const p = s.talk.person;
        s.talk = null;
        scene.onTalked?.(s, p);
        emit('talked', { person: p });
      }
    } else if (s.near) {
      const p = s.near, at = scene.faceTo?.(p) ?? p;
      if (!scene.update) s.me.dir = dirToward(at.x - s.me.x, (at.y - s.me.y) / DEPTH);
      s.talk = conversation(p.name, p.lines, now, { person: p });
      s.near = null;
      s.goal = null;
      scene.onTalk?.(s, p);
      emit('talk', { person: p });
    } else scene.act?.(s);
  }
  const skip = () => {
    if (s.mode !== 'cut') return;
    emit('skip');
    endCut();
  };

  // ---- Taps ----
  /** Who's drawn at (x, y) in the world, nearest the front: a tap on them, or on their A bubble. */
  function personAt(x, y) {
    let best = null;
    for (const p of scene.people ?? []) {
      const at = scene.spriteOf?.(p) ?? p;
      const tall = /sit|floor|kneel/.test(p.gait ?? p.faceGait ?? '') ? 34 : 50; // seated, they're shorter
      const onBody = Math.abs(x - at.x) <= 10 && y >= at.y - tall && y <= at.y + 4;
      const onBubble = s.near === p && Math.abs(x - (at.x + 11)) <= 9 && y >= at.y - 62 && y <= at.y - 40;
      // Someone's body wins over a bubble (it's wider than it's drawn); then whoever's nearer the front.
      const score = (onBody ? 1e4 : 0) + at.y;
      if ((onBody || onBubble) && (!best || score > best.score)) best = { p, score };
    }
    return best?.p ?? null;
  }
  /** A tap at (x, y) on the screen (see the header): the scene's, someone to talk to, the way out, a spot to walk to, or A. */
  function tap(x, y) {
    if (x < 0 || x >= W || y < 0 || y >= H) return pressA();
    if (s.mode !== 'free' || s.talk || scene.update) return pressA();
    const wx = x + s.view.x, wy = y + s.view.y, e = scene.exit, out = s.exitAt;
    const p = personAt(wx, wy);
    if (p) return s.near === p ? pressA() : goTo(p.x, p.y, p);
    if (e && out && x >= out.x0 && x <= out.x1 && y >= out.y0 && y <= out.y1) return goTo(e.x + 6, clamp(s.me.y, e.y0 + 1, e.y1 - 1));
    goTo(wx, wy);
  }


  // ---- The phone ----
  const ui = { mode: '', who: '', label: '', said: null, skip: null, hud: '', next: null };
  const set = (key, value, apply) => {
    if (ui[key] !== value) apply((ui[key] = value));
  };
  function drawPhone() {
    fg.clearRect(0, 0, CELL_W, CELL_H);
    const talking = s.talk?.person;
    // Who to show: whoever says the page on screen while the words are up (its own look, or the beat's), or whoever
    // she's talking to.
    const words = s.mode === 'cut' && s.cut.conv && !s.cut.read && performance.now() / 1000 >= s.cut.conv.start;
    const say = words ? beats[s.cut.i].say : null;
    const page = say ? s.cut.conv.pages[s.cut.conv.page] : null;
    const who = say ? (page && !Array.isArray(page) && page.look ? page : say) : talking;
    if (who?.look) {
      const gait = who.faceGait ?? 'stand';
      fg.drawImage(walkerFrame(who.faceDir ?? 0, gait, 0, who.look), 0, who.faceDy ?? (gait === 'sit' ? 6 : 0));
    } else fg.drawImage(walkerFrame(s.me.dir, s.me.gait, frameOf(s.me), look), 0, 0);

    const me = s.me;
    const mode = s.mode === 'cut' ? 'CUT SCENE' : talking ? talking.name
      : scene.status?.(s) ?? (STRIDE[me.gait] ? `${me.gait === 'run' ? 'RUNNING' : 'WALKING'} ${DIRS[me.dir].toUpperCase()}`
        : me.gait === 'sit' ? 'SITTING' : 'STANDING');
    set('mode', mode, (v) => ($('.mode').textContent = v));
    set('who', s.mode === 'cut' ? scene.name : talking ? 'TALKING TO' : HERO_NAME, (v) => ($('.whoname').textContent = v));
    const label = s.mode === 'cut' || s.talk ? 'NEXT' : s.near ? `TALK TO ${s.near.name.split(',')[0]}`
      : scene.actLabel?.(s) ?? 'NOBODY NEARBY';
    set('label', label, (v) => {
      $('.alabel').textContent = v;
      $('.abtn').disabled = v === 'NOBODY NEARBY';
    });
    const conv = s.mode === 'cut' ? (!s.cut.read && performance.now() / 1000 >= s.cut.conv?.start ? s.cut.conv : null) : s.talk;
    set('said', conv ? `${conv.page} ${dialogText(conv)}` : '', () => {
      $('.said').textContent = conv ? dialogText(conv) : '';
      $('.said').hidden = !conv;
    });
    set('skip', s.mode === 'cut', (v) => ($('.skip').hidden = !v));
  }

  /** The game's layout has no phone: the stick shows while she's yours to steer, SKIP in a cut scene, NEXT SCENE (where
   * there's no way out) while she's free. */
  function drawHud() {
    set('hud', s.mode === 'free' && s.talk ? 'talk' : s.mode, (v) => (box.dataset.mode = v));
    set('skip', s.mode === 'cut', (v) => ($('.skip').hidden = !v));
    set('next', s.mode === 'free' && !!onLeave && !scene.exit, (v) => ($('.next').hidden = !v));
  }

  // ---- The clock ----
  let last = performance.now() / 1000, stopped = false, raf = 0;
  function frame() {
    if (stopped) return;
    const now = performance.now() / 1000, dt = Math.min(0.05, now - last);
    last = now;
    if (s.frozen != null && s.frozen < offsets.at(-1) + (beats.at(-1)?.dur ?? 0)) {
      s.mode = 'cut';
      s.cut ??= { i: 0, t0: now, read: true, conv: null };
      frozenFrame(s.frozen);
    } else if (s.mode !== 'cut' || !cutFrame(now)) freeFrame(now, dt);
    if (stopped) return;
    emit('frame', { now });
    shade(now);
    if (full) drawHud();
    else drawPhone();
    raf = requestAnimationFrame(frame);
  }
  s.stop = () => {
    stopped = true;
    cancelAnimationFrame(raf);
    resize.disconnect();
    ac.abort();
  };
  if (beats.length && !params.has('play')) startBeat(num('beat') ?? 0, performance.now() / 1000);
  else if (full && num('at') == null) endCut(); // in the game, ?play still walks her in

  // ---- Input ----
  $('.skip').addEventListener('click', skip, on);
  if (full) {
    $('.next').addEventListener('click', moveOn, on);
    box.dataset.keys = byKeys;
    box.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch' && byKeys) steer(false);
    }, { ...on, capture: true });
  } else {
    $('.abtn').addEventListener('click', pressA, on);
    const replay = $('.replay');
    if (!beats.length) replay.hidden = true;
    replay.addEventListener('click', () => {
      s.frozen = null;
      s.talk = null;
      startBeat(0, performance.now() / 1000);
    }, on);
  }

  // Taps and drags on the screen (and, in the game, on the bars beside it): screen pixels, then tap() or the scene's own.
  const surface = full ? box : tv;
  const toScreen = (e) => {
    const r = tv.getBoundingClientRect();
    return [Math.floor(((e.clientX - r.left) / r.width) * W), Math.floor(((e.clientY - r.top) / r.height) * H)];
  };
  let held = null; // the pointer the scene took on 'down'
  surface.addEventListener('pointerdown', (e) => {
    if (e.button > 0 || e.target.closest('.stick, button')) return;
    const [x, y] = toScreen(e);
    emit('tap', { x, y });
    if (scene.pointer?.('down', x, y, s)) {
      held = e.pointerId;
      surface.setPointerCapture(e.pointerId);
    } else tap(x, y);
    e.preventDefault();
  }, on);
  surface.addEventListener('pointermove', (e) => {
    if (e.pointerId === held) scene.pointer('move', ...toScreen(e), s);
  }, on);
  for (const type of ['pointerup', 'pointercancel']) surface.addEventListener(type, (e) => {
    if (e.pointerId !== held) return;
    held = null;
    scene.pointer(type === 'pointerup' ? 'up' : 'cancel', ...toScreen(e), s);
  }, on);

  // The stick: the knob (the dot) follows the finger inside the ring, a little way out to walk, all the way to run.
  const pad = $(full ? '.stick' : '.pad'), ring = full ? $('.ring') : pad, knob = $(full ? '.dot' : '.knob');
  let dragging = null;
  function moveStick(e) {
    const r = ring.getBoundingClientRect(), radius = r.width / 2;
    let x = (e.clientX - r.left - radius) / radius, y = (e.clientY - r.top - radius) / radius;
    const m = Math.hypot(x, y);
    if (m > 1) {
      x /= m;
      y /= m;
    }
    input.x = x;
    input.y = y;
    if (full) knob.style.transform = `translate(${x * radius}px, ${y * radius}px)`;
    else {
      knob.style.left = `${50 + x * 50}%`;
      knob.style.top = `${50 + y * 50}%`;
    }
  }
  function release(e) {
    if (e && e.pointerId !== dragging) return;
    dragging = null;
    input.x = input.y = 0;
    knob.style.transform = '';
    knob.style.left = knob.style.top = full ? '' : '50%';
    pad.style.cursor = full ? '' : 'grab';
    pad.classList.remove('held');
  }
  pad.addEventListener('pointerdown', (e) => {
    if (dragging != null) return;
    dragging = e.pointerId;
    pad.setPointerCapture(e.pointerId);
    if (!full) pad.style.cursor = 'grabbing';
    pad.classList.add('held');
    moveStick(e);
    e.preventDefault();
  }, on);
  pad.addEventListener('pointermove', (e) => {
    if (e.pointerId === dragging) moveStick(e);
  }, on);
  pad.addEventListener('pointerup', release, on);
  pad.addEventListener('pointercancel', release, on);

  /** Keys or touch: the stick goes or comes back, and the picture moves to make room for it or not. */
  function steer(keys) {
    box.dataset.keys = byKeys = keys;
    fit();
  }
  const KEYS = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ShiftLeft: 'shift', ShiftRight: 'shift',
  };
  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if ((e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') && !e.repeat && e.target.tagName !== 'BUTTON') {
      pressA();
      e.preventDefault();
      return;
    }
    if (e.code === 'Escape' || e.code === 'KeyX') {
      skip();
      return;
    }
    if (e.code === 'KeyN' && !e.repeat && full && s.mode === 'free') {
      moveOn();
      return;
    }
    const k = KEYS[e.code];
    if (!k) return;
    input.keys.add(k);
    if (k !== 'shift') e.preventDefault();
    if (full && k !== 'shift' && !byKeys) steer(true);
  }, on);
  addEventListener('keyup', (e) => {
    const k = KEYS[e.code];
    if (k) input.keys.delete(k);
  }, on);
  addEventListener('blur', () => input.keys.clear(), on);

  raf = requestAnimationFrame(frame);
  return s;
}
