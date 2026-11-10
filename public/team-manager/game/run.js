// How the game puts things on the stage. There are two kinds of thing: places she walks about in (the arena, the pits:
// stage.js scenes, run until she leaves by one of their ways out) and screens (the scouting tablet, the plan for a
// match, a match on the field, the notebook: no walking, just things to look at and press). Both run on stage.js, one
// at a time, and both are promises, so the season (main.js) reads from top to bottom like the story it is:
//
//   await show(planScreen)        a screen, until it calls its own done(result); resolves with the result
//   const exit = await walk(pits) a place, until she walks out of it; resolves with the way out she took
//
// A Screen is the kit's Menu (ui.js) wired to the stage: the stick moves its cursor, A presses, a finger presses what
// it lands on. A screen fills in paint(g, t, s, now) and registers what can be pressed as it draws it. It can put another screen
// over itself (this.over: the notebook over the plan), which takes the stick, A and taps until it closes.

import { W, H } from '../pixel.js';
import { runScene } from '../stage.js';
import { Menu } from './ui.js';

let root = null, current = null;
/** Where the game is drawn: the page's <main>. */
export const setRoot = (el) => (root = el);
/** What's on the stage now (stage.js's state), for the flow to stop it. */
export const onStage = () => current;

export class Screen {
  constructor(name) {
    this.name = name;
    this.m = new Menu();
    this.over = null;
    this.t0 = null;
    /** A tap that lands on nothing is A (for a screen that waits for A: a result, a card). Otherwise it does nothing.
     * A screen where that changes as it goes says so with anywhere(). */
    this.tapA = false;
  }
  update(dt, s) {
    const now = performance.now() / 1000;
    if (this.over) return this.over.update?.(dt, s);
    this.m.stick(s.stick(), now);
    this.tick?.(dt, s, now);
  }
  press(s) {
    if (this.over) return this.over.press?.(s);
    if (this.onA?.(s)) return;
    this.m.press();
  }
  point(type, x, y, s) {
    if (this.over) return this.over.point?.(type, x, y, s) ?? true;
    if (this.m.point(type, x, y)) return true;
    return type === 'down' ? !(this.anywhere?.() ?? this.tapA) : true;
  }
  key(code, s) {
    if (this.over) return this.over.key?.(code, s) ?? false;
    return this.onKey?.(code, s) ?? false;
  }
  draw(g, now, s) {
    this.t0 ??= now;
    this.m.begin();
    this.paint(g, now - this.t0, s, now);
    this.m.end();
    if (this.over) this.over.draw(g, now, s);
  }
  /** Open another screen over this one; it closes itself with close(). */
  open(over) {
    this.over = over;
    over.close = (result) => {
      this.over = null;
      over.onClose?.(result);
    };
  }
}

/**
 * A screen on the stage until it calls done(result). o.fade: false to follow straight on from the last screen without
 * the fade up from black; o.talk: a conversation to open with, in the stage's dialog box (stage.js's `talk`).
 */
export function show(screen, o = {}) {
  current?.stop();
  return new Promise((resolve) => {
    const scene = {
      name: screen.name ?? 'BLUE BANNER', label: screen.label ?? screen.name, stick: false,
      world: { w: W, h: H }, start: { x: -100, y: -100 }, move: (x, y) => [x, y],
      cutscene: screen.cutscene,
      update: (dt, s) => screen.update?.(dt, s),
      act: (s) => screen.press?.(s),
      pointer: (type, x, y, s) => (s.mode === 'free' && !s.talk && screen.point ? screen.point(type, x, y, s) : false),
      actLabel: () => screen.actLabel?.(), status: () => screen.status?.(), clock: () => screen.clock?.() ?? null,
      key: (code, s) => screen.key?.(code, s) ?? false,
      onFree: (s) => screen.start?.(s),
      draw: (g, view, t, s) => screen.draw(g, t, s),
    };
    // done() may be called before runScene has even returned (a screen that's over as it starts): it stops the stage
    // as soon as there is one.
    let s = null, over = false;
    screen.done = (result) => {
      screen.done = () => {};
      over = true;
      s?.stop();
      if (current === s) current = null;
      resolve(result);
    };
    s = runScene(scene, { layout: 'full', root, fade: o.fade ?? true, params: o.params ?? new URLSearchParams() });
    screen.stage = s;
    if (over) s.stop();
    else current = s;
  });
}

/**
 * A place on the stage until she walks out of it: resolves with the way out she took (one of scene.exits), or with
 * whatever the scene's own leave(result) was called with (a place that ends some other way: someone she talked to).
 */
export function walk(scene, o = {}) {
  current?.stop();
  return new Promise((resolve) => {
    const finish = (result) => {
      scene.leave = () => {};
      if (current === s) current = null;
      resolve(result);
    };
    const s = (current = runScene(scene, {
      layout: 'full', root, fade: o.fade ?? true, params: o.params ?? new URLSearchParams(o.play ? 'play' : ''),
      onLeave: (st, exit) => finish(exit ?? { to: 'next' }), nextLabel: o.nextLabel,
    }));
    scene.leave = (result) => {
      s.stop();
      finish(result);
    };
  });
}
