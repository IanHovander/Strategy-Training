// Norbert winds time back. The team's plush penguin is clockwork, it turns out: everything stops and drains to a cold
// blue, he hops out of his corner to the middle of the screen, twice his size, turns his back, and a brass key pops
// out of it. It turns counterclockwise a click at a time, each click taking the clock back a step, faster and faster,
// until it spins free; a white flash, and it's Thursday morning. About four and a half seconds: the first click comes
// at once, as the time travel lab settled on (../time/lab.js, look 5, WIND).
//
// The look is the lab's, rebuilt small: this screen draws whatever was on the stage as it starts (bg, a picture of the
// moment she left), then him and the key (../norbert.js, ../time/key.js) and a card of the day and time ticking back.
//
// It costs him. With volts: [from, to], his reading stays where his corner was while he's out, and runs down a tenth at
// a time as the key turns (12.4V to 12.0V, going back to Thursday), each step flashing; he comes home on the last card
// with what's left.
//
//   new Wind({ st, bg(g), stops: ['SATURDAY 3:10 PM', ..., 'THURSDAY 6:40 AM'], last, volts })   done() once it's Thursday

import { W, H, C, screen, fill, text, withAlpha, clamp, lerp, seg, easeOut, easeIn, stepped } from '../pixel.js';
import { drawNorbertBig, BIG_W, BIG_H } from '../norbert.js';
import { drawKey } from '../time/key.js';
import { Screen } from './run.js';
import { corner } from './hud.js';

/** Seconds: the world stops; he's out and turned; the key's in; it spins free; the flash; the card. */
const T = { out: 0.45, key: 1.0, free: 3.0, flash: 3.5, card: 3.9, end: 5.6 };
/** When each click lands, from the key going in: quickening. */
const CLICKS = [0, 0.34, 0.6, 0.8, 0.95, 1.07, 1.17, 1.25, 1.32, 1.38, 1.43, 1.47].map((c) => T.key + 0.1 + c);

export class Wind extends Screen {
  constructor(o) {
    super('WINDING BACK');
    this.o = o;
    this.label = 'Norbert the penguin winds time back with a brass key in his back: the clock runs backwards to Thursday morning';
  }
  status() {
    const t = this.t0 == null ? 0 : performance.now() / 1000 - this.t0;
    return t < T.key ? 'TIME STOPS' : t < T.flash ? 'WINDING BACK' : this.o.stops.at(-1);
  }
  tick(dt, s, now) {
    if (this.t0 != null && now - this.t0 >= T.end) this.done();
  }
  onA() {
    return true; // nothing hurries this: it's short, and it only happens once like this
  }
  paint(g, t) {
    const o = this.o;
    screen();
    if (t < T.card) {
      o.bg(g);
      screen();
      // The world, stopped: drained to a cold blue in four hard steps.
      withAlpha(stepped(seg(t, 0, 0.4)) * 0.72, () => fill(0, 0, W, H, C.night1));
      // The tape running back, once the key's turning: tracking lines rolling up the picture.
      const n = CLICKS.filter((c) => t >= c).length, spinning = t >= T.free;
      if (n || spinning) {
        for (let i = 0; i < 3; i++) {
          const y = Math.round(H - ((t * (120 + n * 30) + i * 53) % H));
          withAlpha(0.5, () => fill(0, y, W, 1, C.blue3));
          withAlpha(0.25, () => fill(0, y + 1, W, 3, C.blue1));
        }
      }
      // Norbert: out of his corner to the middle, growing as he comes, his back to us.
      const k = easeOut(seg(t, 0.15, T.out + 0.25)), scale = lerp(0.45, 2, k);
      const x = Math.round(lerp(3, W / 2 - BIG_W, k)), hop = Math.round(Math.sin(Math.min(1, k) * Math.PI) * 18);
      const y = Math.round(lerp(2, 30, k)) - hop;
      const last = CLICKS.findLast((c) => t >= c), kick = last != null && t - last < 0.06 ? 1 : 0;
      drawNorbertBig(x, y + kick, { back: k >= 1, glow: 0.6 + 0.4 * Math.sin(t * 9), scale });
      // The key in his back: in with a pop, a turn a click, then free.
      if (t >= T.key) {
        const size = easeOut(seg(t, T.key, T.key + 0.15));
        const turns = spinning ? n + (t - T.free) * 14 : n - (last != null ? 1 - easeOut(seg(t, last, last + 0.08)) : 0);
        drawKey(W / 2, y + Math.round(BIG_H * 0.95), -turns * (Math.PI / 4), size, 2);
      }
      // The day and the time, ticking back a stop a click.
      const stop = o.stops[Math.min(o.stops.length - 1, Math.round((n / CLICKS.length) * (o.stops.length - 1)))];
      if (t > 0.3) {
        fill(W / 2 - 62, 6, 124, 15, C.ink);
        fill(W / 2 - 61, 7, 122, 13, last != null && t - last < 0.07 ? C.yel1 : C.night2);
        text(spinning ? o.stops.at(-1) : stop, W / 2, 10, { align: 'center', color: C.white });
      }
      // His reading, left behind in the empty corner, running down a tenth at a time on the clicks.
      if (o.volts) {
        const [from, to] = o.volts, steps = this.steps(), done = steps.filter((c) => t >= c).length;
        const v = spinning ? to : from - 0.1 * done, lit = steps.some((c) => t >= c && t - c < 0.15);
        text(`${v.toFixed(1)}V`, 21, 4, { font: 3, color: lit ? C.yel2 : C.steel2, outline: C.ink });
      }
      if (t >= T.flash) withAlpha(easeIn(seg(t, T.flash, T.card)), () => fill(0, 0, W, H, C.white));
      return;
    }
    // Thursday.
    const a = 1 - seg(t, T.card, T.card + 0.5);
    fill(0, 0, W, H, C.ink);
    text(o.stops.at(-1), W / 2, 56, { scale: 2, align: 'center', color: C.white });
    if (t > T.card + 0.6) text(o.last ?? 'TWO DAYS EARLIER', W / 2, 78, { align: 'center', color: C.yel1 });
    withAlpha(a, () => fill(0, 0, W, H, C.white));
    corner(o.st, { glow: clamp(1 - (t - T.card) / 1.2, 0, 1), volts: o.volts?.[1] ?? null });
  }
  /** When the reading drops a tenth: n steps spread over the twelve clicks, the last on the last. */
  steps() {
    const [from, to] = this.o.volts, n = Math.min(CLICKS.length, Math.round((from - to) / 0.1));
    return Array.from({ length: Math.max(0, n) }, (_, k) => CLICKS[Math.round((CLICKS.length * (k + 1)) / n) - 1]);
  }
}
