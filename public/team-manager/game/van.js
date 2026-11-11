// Thursday, 6:40 AM, again: the van. It's the van scene's own cabin (../van/scene.js) with its people in their seats,
// and it's short. She's just come back from Saturday with Norbert in her lap, and she knows what's coming: the senior
// strategist is out sick all weekend, so the notebook's hers from the start this time. Then the notebook is open in her
// hands on 23 blank tiles, and her own pencil asks who she watches first. Three tiles carry a word from her Saturday (the
// robot she picked, the one that beat her, something the page said), but any tile will do, and nothing says whether
// it's a good one. She circles one, and that's the weekend started: it's the robot the guided start follows (guide.js).
//
//   vanRide(st)   the ride: two pages, the choice (st.book.circled), her resolve and the teammate's answer, and out

import { C, seg } from '../pixel.js';
import { bars, placeCard, cover } from '../stage.js';
import { conversation } from '../talk.js';
import { HERO_LOOK } from '../walker.js';
import { HERO_NAME, TEAMMATE_NAME } from '../cast.js';
import { TEAMMATE_LOOK } from '../teammate.js';
import { scene as van } from '../van/scene.js';
import { FRAME } from '../van/layout.js';
import { SENDER } from '../opening/phone.js';
import { show, Screen } from './run.js';
import { Book } from './book.js';
import { corner } from './hud.js';
import { save } from './state.js';
import { vanCut, suggest, resolve, MATE } from './guide.js';

/** Seconds: the van fading out to the pits once the last page is read. */
const OUT = 0.6;

/**
 * It's a screen, not a place: there's no seat to pick and no way out but through the choice. SKIP ends the pages, and
 * the notebook still comes.
 */
class Ride extends Screen {
  constructor(st) {
    super('THE VAN');
    this.st = st;
    this.label = 'In the van on Thursday morning, her teammate beside her: then her scouting notebook, open on its blank pages, and who she watches first';
    const view = { x: 0, y: FRAME.all.y };
    this.cabin = (g) => van.draw(g, view, performance.now() / 1000, { talk: null });
    // Every beat is the same shot: the cabin, the film bars, anything over it (the place card, the fade from black), and
    // Norbert in his corner. The stage hands a beat's draw its timing too, which isn't ours to call, so it takes two.
    const shot = (over = null) => (g, t) => {
      this.cabin(g);
      bars(1);
      over?.(t);
      corner(st);
    };
    const [hers, mates] = vanCut(SENDER);
    this.cutscene = [
      { dur: 1.2, draw: shot((t) => { placeCard(t, 'THE VAN', 'THURSDAY 6:40 AM'); cover(1 - t / 0.6); }) },
      { dur: 0.6, draw: shot((t) => placeCard(t + 1.2, 'THE VAN', 'THURSDAY 6:40 AM')), say: { name: HERO_NAME, look: HERO_LOOK, lines: [hers], tag: C.red1 } },
      { dur: 0.4, draw: shot(), say: { name: TEAMMATE_NAME, look: TEAMMATE_LOOK, lines: [mates] } },
    ];
    this.circledAt = null;
    this.talking = false;
    this.outAt = null;
  }
  status() {
    return this.circledAt != null && performance.now() / 1000 - this.circledAt < 1 ? 'CIRCLED' : 'IN THE VAN';
  }
  /** The pages are read (or skipped): her notebook, unless she's already chosen (a reload after circling). */
  start(s) {
    const st = this.st;
    if (st.book.circled) return this.resolve(s);
    this.open(new Book(st, {
      choose: {
        marks: suggest(st),
        pick: (num) => {
          st.book.circled = num;
          save(st);
          this.circledAt = performance.now() / 1000;
        },
        done: () => {
          this.over = null;
          this.resolve(s);
        },
      },
    }));
  }
  /** Her resolve, with the robot in it, and the teammate's where and when. */
  resolve(s) {
    const num = this.st.book.circled;
    s.talk = conversation(HERO_NAME, [
      { name: HERO_NAME, lines: resolve(num), tag: C.red1 },
      { name: TEAMMATE_NAME, lines: MATE },
    ], performance.now() / 1000);
    this.talking = true;
  }
  tick(dt, s, now) {
    if (!this.talking || s.talk) return;
    this.outAt ??= now;
    if (now - this.outAt >= OUT) this.done();
  }
  paint(g, t, s, now) {
    this.cabin(g);
    bars(1);
    corner(this.st);
    if (this.outAt != null) cover(seg(now - this.outAt, 0, OUT));
  }
}

export async function vanRide(st) {
  await show(new Ride(st));
}
