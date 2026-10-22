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
//                         (talk.js). The bubble shows over the closest one within 14 pixels across and 10 deep.
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
//
// A cut scene is a list of beats. Each is { dur, draw(g, t, c) }: draw the whole screen t seconds into the beat; c.T is
// seconds into the cut scene and c.k is t / dur (0 to 1). A beat can say something: say: { name, lines, at, auto, tag,
// look } types the pages in lines (a conversation, as in talk.js; name says who, for the pages that don't) into the
// dialog box from `at` seconds into the beat, and the phone shows `look` (a walker look) as the one talking. Then the
// beat waits at its end until it's been read: A finishes the typing, turns the page and, after the last page, moves on.
// With auto the pages turn by themselves (A still hurries them). While a beat waits, t runs on past dur, so hold still
// past it. A beat without words moves on after dur, or straight away on A. SKIP (or Esc) ends the cut scene.
// Draw with pixel.js: the context is set and the camera is at the screen for you. cover, bars, placeCard and along
// (below) are here so every scene's cut scene shares one style.
//
// The scene's state, s, is window.stage, for poking at from the console. From the address bar: ?at=SECONDS freezes the
// cut scene at that moment, words typed as far as they'd be with no waiting (for screenshots); ?beat=N starts the cut
// scene at beat N; ?play skips it; ?x=..&y=..&dir=.. start her somewhere else.

import { W, H, C, useContext, screen, fill, text, measure, withAlpha, stepped, clamp, lerp, seg, easeOut, easeIn } from './pixel.js';
import { DIRS, CELL_W, CELL_H, walkerFrame, drawWalker, HERO_LOOK } from './walker.js';
import { conversation, drawBubble, drawDialog, advance, dialogText, typed, typedAt } from './talk.js';
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
 * It sits clear of the film bars. sub: a second, smaller line (the day and time, say).
 */
export function placeCard(t, name, sub) {
  if (t < 0 || t > 4.2) return;
  const w = Math.max(measure(name), sub ? measure(sub, { font: 3 }) : 0) + 16, h = sub ? 23 : 15, y = 16;
  const x = Math.round(t < 2 ? lerp(-w, 6, easeOut(seg(t, 0.2, 0.6))) : lerp(6, -w, easeIn(seg(t, 3.6, 4))));
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
        <span class="zone run">RUN</span>
        <span class="zone walk">WALK</span>
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

/** Put a scene on the page and run it. Returns its state (also window.stage). */
export function runScene(scene) {
  const root = document.getElementById('stage');
  root.innerHTML = markup(scene);
  const $ = (sel) => root.querySelector(sel);
  const tv = $('.screen'), face = $('.face');
  const g = tv.getContext('2d', { alpha: false }), fg = face.getContext('2d');
  g.imageSmoothingEnabled = false;
  fg.imageSmoothingEnabled = false;

  // Whole-number zoom, so every pixel stays square.
  const fit = () => {
    const room = tv.parentElement.clientWidth - 4;
    tv.style.width = `${W * Math.max(1, Math.min(4, Math.floor(room / W)))}px`;
  };
  new ResizeObserver(fit).observe(root);
  fit();

  const params = new URLSearchParams(location.search);
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
  scene.setup?.(s);

  // ---- The cut scene ----
  function startBeat(i, now) {
    if (i >= beats.length) return endCut();
    const b = beats[i];
    s.mode = 'cut';
    s.cut = {
      i, t0: now, read: !b.say,
      conv: b.say ? conversation(b.say.name, b.say.lines, now + (b.say.at ?? 0), { tag: b.say.tag }) : null,
    };
  }
  function endCut() {
    s.mode = 'free';
    s.cut = null;
    s.talk = null;
    Object.assign(s.me, { x: start.x, y: start.y, dir: start.dir, gait: 'stand', dist: 0 });
    scene.onFree?.(s);
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
    if (now - c.t0 >= b.dur && c.read) {
      startBeat(c.i + 1, now);
      if (s.mode !== 'cut') return false;
      c = s.cut;
    }
    const t = now - c.t0;
    drawBeat(beats[c.i], t, offsets[c.i] + t, c.read ? null : c.conv, now);
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
      if (dx < (p.reach ?? 14) && dy < 10 && dx + dy < bestD) [best, bestD] = [p, dx + dy];
    }
    return best;
  }
  function walk(dt) {
    const st = s.stick(), me = s.me;
    if (s.talk || st.mag < 0.2) {
      me.gait = 'stand';
      return;
    }
    me.dir = dirToward(st.x, st.y);
    me.gait = st.mag < 0.68 ? 'walk' : 'run';
    const a = (me.dir * Math.PI) / 4, v = (scene.speed ?? SPEED)[me.gait] * dt;
    const [nx, ny] = scene.move(me.x, me.y, Math.sin(a) * v, Math.cos(a) * v * DEPTH);
    me.dist += Math.hypot(nx - me.x, ny - me.y) || v * 0.3;
    me.x = nx;
    me.y = ny;
  }
  function follow() {
    const ww = scene.world?.w ?? W, wh = scene.world?.h ?? H;
    return {
      x: Math.round(clamp(s.me.x - W / 2, 0, Math.max(0, ww - W))),
      y: Math.round(clamp(s.me.y - 28 - H / 2, 0, Math.max(0, wh - H))),
    };
  }
  function freeFrame(now, dt) {
    if (scene.update) scene.update(dt, s);
    else walk(dt);
    s.near = s.talk ? null : scene.reach ? scene.reach(s) : closest();
    const view = (s.view = scene.camera ? scene.camera(s) : follow());
    s.player = { y: s.me.y, draw: () => drawWithShadow(g, view, { ...s.me, look }) };
    useContext(g);
    screen();
    g.globalAlpha = 1;
    scene.draw(g, view, now, s);
    g.globalAlpha = 1;
    if (s.near) {
      if (scene.prompt) scene.prompt(g, view, s.near, now);
      else drawBubble(g, s.near.x - view.x + 11, s.near.y - view.y - 50, now);
    }
    if (s.talk) drawDialog(g, s.talk, now);
  }

  // ---- A, and skipping ----
  function pressA() {
    const now = performance.now() / 1000;
    if (s.mode === 'cut') {
      const c = s.cut, b = beats[c.i];
      if (c.conv && !c.read) {
        if (now < c.conv.start) c.conv.start = now; // the words come straight away
        else if (!advance(c.conv, now)) {
          c.read = true;
          if (now - c.t0 >= b.dur) startBeat(c.i + 1, now);
        }
      } else startBeat(c.i + 1, now);
    } else if (s.talk) {
      if (!advance(s.talk, now)) {
        const p = s.talk.person;
        s.talk = null;
        scene.onTalked?.(s, p);
      }
    } else if (s.near) {
      const p = s.near, at = scene.faceTo?.(p) ?? p;
      if (!scene.update) s.me.dir = dirToward(at.x - s.me.x, (at.y - s.me.y) / DEPTH);
      s.talk = conversation(p.name, p.lines, now, { person: p });
      s.near = null;
      scene.onTalk?.(s, p);
    }
  }
  const skip = () => {
    if (s.mode === 'cut') endCut();
  };

  // ---- The phone ----
  const ui = { mode: '', who: '', label: '', said: null, skip: null };
  const set = (key, value, apply) => {
    if (ui[key] !== value) apply((ui[key] = value));
  };
  function drawPhone() {
    fg.clearRect(0, 0, CELL_W, CELL_H);
    const talking = s.talk?.person;
    const speaker = s.mode === 'cut' ? beats[s.cut.i].say?.look : talking?.look;
    if (speaker) {
      const gait = talking?.faceGait ?? 'stand';
      fg.drawImage(walkerFrame(0, gait, 0, speaker), 0, gait === 'sit' ? 6 : 0);
    } else fg.drawImage(walkerFrame(s.me.dir, s.me.gait, frameOf(s.me), look), 0, 0);

    const me = s.me;
    const mode = s.mode === 'cut' ? 'CUT SCENE' : talking ? talking.name
      : me.gait === 'stand' || !STRIDE[me.gait] ? 'STANDING' : `${me.gait === 'run' ? 'RUNNING' : 'WALKING'} ${DIRS[me.dir].toUpperCase()}`;
    set('mode', mode, (v) => ($('.mode').textContent = v));
    set('who', s.mode === 'cut' ? scene.name : talking ? 'TALKING TO' : HERO_NAME, (v) => ($('.whoname').textContent = v));
    const label = s.mode === 'cut' || s.talk ? 'NEXT' : s.near ? `TALK TO ${s.near.name.split(',')[0]}` : 'NOBODY NEARBY';
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

  // ---- The clock ----
  let last = performance.now() / 1000;
  function frame() {
    const now = performance.now() / 1000, dt = Math.min(0.05, now - last);
    last = now;
    if (s.frozen != null && s.frozen < offsets.at(-1) + (beats.at(-1)?.dur ?? 0)) {
      s.mode = 'cut';
      s.cut ??= { i: 0, t0: now, read: true, conv: null };
      frozenFrame(s.frozen);
    } else if (s.mode !== 'cut' || !cutFrame(now)) freeFrame(now, dt);
    drawPhone();
    requestAnimationFrame(frame);
  }
  if (beats.length && !params.has('play')) startBeat(num('beat') ?? 0, performance.now() / 1000);

  // ---- Input ----
  $('.abtn').addEventListener('click', pressA);
  $('.skip').addEventListener('click', skip);
  const replay = $('.replay');
  if (!beats.length) replay.hidden = true;
  replay.addEventListener('click', () => {
    s.frozen = null;
    s.talk = null;
    startBeat(0, performance.now() / 1000);
  });

  const pad = $('.pad'), knob = $('.knob');
  let dragging = null;
  function moveStick(e) {
    const r = pad.getBoundingClientRect(), radius = r.width / 2;
    let x = (e.clientX - r.left - radius) / radius, y = (e.clientY - r.top - radius) / radius;
    const m = Math.hypot(x, y);
    if (m > 1) {
      x /= m;
      y /= m;
    }
    input.x = x;
    input.y = y;
    knob.style.left = `${50 + x * 50}%`;
    knob.style.top = `${50 + y * 50}%`;
  }
  function release() {
    dragging = null;
    input.x = input.y = 0;
    knob.style.left = knob.style.top = '50%';
    pad.style.cursor = 'grab';
  }
  pad.addEventListener('pointerdown', (e) => {
    dragging = e.pointerId;
    pad.setPointerCapture(e.pointerId);
    pad.style.cursor = 'grabbing';
    moveStick(e);
    e.preventDefault();
  });
  pad.addEventListener('pointermove', (e) => {
    if (e.pointerId === dragging) moveStick(e);
  });
  pad.addEventListener('pointerup', release);
  pad.addEventListener('pointercancel', release);

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
    const k = KEYS[e.code];
    if (!k) return;
    input.keys.add(k);
    if (k !== 'shift') e.preventDefault();
  });
  addEventListener('keyup', (e) => {
    const k = KEYS[e.code];
    if (k) input.keys.delete(k);
  });
  addEventListener('blur', () => input.keys.clear());

  requestAnimationFrame(frame);
  return s;
}
