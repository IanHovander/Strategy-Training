// The World Championship's cut scene: the hall waking up, then the scan along all eight fields. It opens in the dark up
// by the truss over Archimedes, the first division: the lamps come on left to right, each throwing its cone down, and
// the hall comes up out of the dark in hard steps as they do; then the place card names the event. The camera tilts
// down to the stands and the field, a match already playing, and glides the whole length of the hall, past every
// division's curtain, sign and big screen, every field playing its own match out of step with the others. As each
// division's sign comes by, a card in the bottom corner names it, the way the broadcast does; the glide is one beat
// per division, so A moves on one division at a time and only SKIP leaves the whole scan. It slows and settles on
// Newton, the last division and 5026's, where the strategist stands at the end of the walkway by the queue, watching.
// The teammate comes up from 5026's robot in the queue, and the two of them say what the day is about: win Newton and
// play on Einstein, and scout the other seven divisions, because whoever wins those will be waiting there.
//
// makeCutscene(drawWorld) gives the beats, in stage.js's form. drawWorld(g, view, t, o) is the scene's: the whole
// hall seen from view { x, y } at time t, with o = { lights, beams, hero, mate } (how far the lamps have come on, 0 to
// 1; how strong the cones are, 0 to 1; her, { x, y, dir, gait, dist } or null; the teammate the same, or left out to
// stand at MATE). Every beat works out its view as a pure function of its own time, in whole pixels, draws the hall at
// c.T (the cut scene's clock, so an ?at= frame is exactly the frame that plays), then puts the cards, the film bars and
// the fades on top in screen space. The last frame is the first frame of walking: level, half a screen left of START,
// her at START turned to the teammate, the teammate at MATE turned to her. Until the bars go, the view stays at the
// scan's height, so the two of them talk with their heads well clear of the top bar; it comes down to walking's as the
// bars go.

import { W, H, C, screen, fill, text, measure, stepped, lerp, seg, easeOut, easeIn, easeInOut, clamp } from '../pixel.js';
import { placeCard, bars, cover, along, SPEED } from '../stage.js';
import { HERO_NAME, TEAMMATE_NAME } from '../cast.js';
import { HERO_LOOK } from '../walker.js';
import { TEAMMATE_LOOK } from '../teammate.js';
import { ox, DIVISIONS, HOME, SIGN, START, MATE } from './layout.js';

// ---- The camera ----
// The scan's framing, 8 rows above walking's: under the top film bar the signs and big screens are whole, and under the
// bottom bar a little more of each field than walking shows above its near wall. The cut scene opens higher, up by the
// truss (OPEN: the truss just clear of the top film bar, the bottom bar across the queue crew's chests rather than their
// chins), and ends level (y 0), the way walking sees it.
const OPEN = -56, LEVEL = -8;
// The scan runs from just past the left wall to Newton framed for walking: her at START, half a screen in.
const X0 = 24, X1 = START.x - W / 2;
// A glide: it speeds up over the first 2 seconds, holds a steady speed, and slows to a stop over the last 3.5. The
// speed is a trapezoid, so where the camera is comes from integrating it: a pure function of time, with no jolt.
const SCAN = 27, RISE = 2, FALL = 3.5;
const CRUISE = (X1 - X0) / (SCAN - RISE / 2 - FALL / 2); // about 231 pixels a second
/** Where the scan has got to, t seconds in. */
function scanX(t) {
  t = clamp(t, 0, SCAN);
  if (t < RISE) return X0 + (CRUISE * t * t) / (2 * RISE);
  const u = SCAN - t;
  if (u < FALL) return X1 - (CRUISE * u * u) / (2 * FALL);
  return X0 + CRUISE * (t - RISE / 2);
}
/** And the other way: when the scan gets to x (0 if it's already behind the camera when the scan sets off). */
function scanTimeAt(x) {
  const a = X0 + (CRUISE * RISE) / 2, b = X1 - (CRUISE * FALL) / 2;
  if (x <= X0) return 0;
  if (x < a) return Math.sqrt((2 * RISE * (x - X0)) / CRUISE);
  if (x <= b) return RISE / 2 + (x - X0) / CRUISE;
  return SCAN - Math.sqrt((2 * FALL * Math.max(0, X1 - x)) / CRUISE);
}

// ---- The division cards ----
// Built like stage.js's place card, in the bottom left clear of the film bar. It's drawn here rather than by calling
// placeCard() because placeCard() always sits at the top and holds three seconds; if it ever takes a row and a hold,
// this should become placeCard(age, name, sub, { y: CARD_Y, hold: HOLD }), so the house card's changes reach it too. A division's card slides in when its sign
// is still 90 pixels short of the middle of the screen, so it's settled as the sign goes by, and slides out 2.4 seconds
// later, half a second or so before the next one comes in at the scan's speed. When each comes in is worked out from
// where the camera is, so it's a pure function of time too. Archimedes' sign is already in view when the scan starts:
// its card comes in straight away.
const HOLD = 2.4, SLIDE = 0.4;
const CARD_H = 23, CARD_Y = H - 12 - 4 - CARD_H;
const CARD_IN = DIVISIONS.map((_, k) => scanTimeAt(ox(k) + (SIGN.x0 + SIGN.x1) / 2 - (W / 2 + 90)));
function divisionCard(k, age) {
  if (age < 0 || age > HOLD + SLIDE) return;
  const name = DIVISIONS[k].name, sub = `DIVISION ${k + 1} OF ${DIVISIONS.length}`;
  const w = Math.max(measure(name), measure(sub, { font: 3 })) + 16, y = CARD_Y;
  const x = Math.round(age < HOLD ? lerp(-w, 6, easeOut(seg(age, 0, SLIDE))) : lerp(6, -w, easeIn(seg(age, HOLD, HOLD + SLIDE))));
  screen();
  fill(x, y, w, CARD_H, C.ink);
  fill(x + 1, y + 1, w - 2, CARD_H - 2, C.blue1);
  fill(x + 1, y + 1, w - 2, 1, C.blue2);
  text(name, x + 8, y + 4, { color: C.white });
  text(sub, x + 8, y + 14, { font: 3, color: C.blue3 });
}
/** The card up t seconds into the scan: only ever the latest division's, so never two at once. */
function scanCard(t) {
  const k = CARD_IN.findLastIndex((t0) => t >= t0);
  if (k >= 0) divisionCard(k, t - CARD_IN[k]);
}

// ---- The people ----
// She stands just off the end of Newton's walkway, by the queue, watching the match, the whole time the camera comes
// along the hall. The teammate waits in the queue behind 5026's robot on its cart, where every other division has one
// of the robot's team, and once the camera has come to rest walks straight up from it, beside the robots and in front
// of the curtain, with nothing in the way, to stand on her left. She turns to the teammate as the teammate comes up,
// and they talk face to face, a head's width apart.
const her = (dir) => ({ x: START.x, y: START.y, dir, gait: 'stand', dist: 0 });
const FROM = [MATE.x, 102]; // behind the second cart, where the other divisions' queues have someone too (people.js)
const WALK_UP = [FROM, [MATE.x, MATE.y]];
const WATCHING = { x: FROM[0], y: FROM[1], dir: 0, gait: 'stand', dist: 0 };
const SETS_OFF = 0.5; // seconds into the settle
const ARRIVES = SETS_OFF + along(WALK_UP, 1e9).dist / SPEED.walk;
const TURNS = ARRIVES - 0.8; // she hears the teammate coming
/** The teammate t seconds into the settle: waiting, walking up, then turned to her. */
const teammate = (t) => (t < SETS_OFF ? WATCHING : t < ARRIVES ? along(WALK_UP, t - SETS_OFF) : { ...MATE, gait: 'stand', dist: 0 });

const CARD = ['WORLD CHAMPIONSHIP', 'HOUSTON - EIGHT DIVISIONS']; // font 3 has no comma
// The place card comes in once the lamps have all come on, so it never hides them doing it, and is carried on through
// the tilt by the cut scene's clock.
const CARD_AT = 2.6;
/** Newton at the scan's height, and the two of them face to face: the say beats hold here. */
const HELD = Object.freeze({ x: X1, y: LEVEL });

/**
 * The beats (stage.js): the lights, the tilt, the scan (a beat for each division), the settle, the two of them talking,
 * and the bars going. The list also carries clock(): the hall's time on the cut scene's latest frame, so walking can
 * carry on from it.
 */
export function makeCutscene(drawWorld) {
  const beats = [
    {
      // Black, then the hall in the dark up by the truss over the left wall and Archimedes' curtain, and its lamps
      // coming on left to right, the hall coming up out of the dark in hard steps as they do.
      dur: 4.6,
      draw(g, t, c) {
        drawWorld(g, { x: 0, y: OPEN }, c.T, { lights: seg(t, 0.9, 2.7), beams: 1, hero: her(0), mate: WATCHING });
        cover(1 - seg(t, 0.1, 0.8));
        placeCard(c.T - CARD_AT, ...CARD);
        bars(1);
      },
    },
    {
      // Down from the truss to the stands and Archimedes' field, the cones fading as it comes.
      dur: 3.2,
      draw(g, t, c) {
        const e = easeInOut(c.k);
        const view = { x: Math.round(lerp(0, X0, e)), y: Math.round(lerp(OPEN, LEVEL, e)) };
        drawWorld(g, view, c.T, { lights: 1, beams: stepped(1 - c.k), hero: her(0), mate: WATCHING });
        placeCard(c.T - CARD_AT, ...CARD);
        bars(1);
      },
    },
    // The scan: all eight fields, a card for each division as its sign goes by, slowing to a stop at Newton. One beat
    // a division, from its card coming in to the next one's, so A moves on a division at a time.
    ...DIVISIONS.map((_, k) => {
      const from = CARD_IN[k], to = CARD_IN[k + 1] ?? SCAN;
      return {
        dur: to - from,
        draw(g, t, c) {
          drawWorld(g, { x: Math.round(scanX(from + t)), y: LEVEL }, c.T, { lights: 1, beams: 0, hero: her(0), mate: WATCHING });
          scanCard(from + t);
          bars(1);
        },
      };
    }),
    {
      // Newton's card goes, and the teammate walks in from the aisle.
      dur: ARRIVES + 0.3,
      draw(g, t, c) {
        drawWorld(g, HELD, c.T, { lights: 1, beams: 0, hero: her(t < TURNS ? 0 : START.dir), mate: teammate(t) });
        divisionCard(HOME, SCAN - CARD_IN[HOME] + t);
        bars(1);
      },
    },
    {
      dur: 0.6,
      say: {
        name: TEAMMATE_NAME, look: TEAMMATE_LOOK, at: 0.2,
        lines: [
          ['EIGHT DIVISIONS, ONE HALL. AND WE DREW', 'NEWTON, THE LAST FIELD. OF COURSE.'],
          ['WIN NEWTON AND WE PLAY ON EINSTEIN,', 'FOR THE WHOLE CHAMPIONSHIP. NO STRESS.'],
        ],
      },
      draw(g, t, c) {
        drawWorld(g, HELD, c.T, { lights: 1, beams: 0, hero: her(START.dir) });
        bars(1);
      },
    },
    {
      dur: 0.6,
      say: {
        name: HERO_NAME, look: HERO_LOOK, tag: C.red1,
        lines: [
          ['OUR ROBOT IS IN THE QUEUE, TWO MATCHES', 'OUT. TIME TO SCOUT THE OTHER SEVEN.'],
          ['WHOEVER WINS THEM IS WAITING FOR US ON', 'EINSTEIN. THEY ALL GO ON THIS BOARD.'],
        ],
      },
      draw(g, t, c) {
        drawWorld(g, HELD, c.T, { lights: 1, beams: 0, hero: her(START.dir) });
        bars(1);
      },
    },
    {
      // The bars go and the view comes down to walking's, and the next frame is hers to walk.
      dur: 1.0,
      draw(g, t, c) {
        const view = { x: X1, y: Math.round(lerp(LEVEL, 0, easeInOut(c.k))) };
        drawWorld(g, view, c.T, { lights: 1, beams: 0, hero: her(START.dir) });
        bars(1 - c.k);
      },
    },
  ];
  // The hall's clock. c.T counts from each beat's start, so while a say beat waits to be read it runs on past the next
  // beat's start, and the next beat would set every match back a few seconds. waited[i] is how long beat i has waited
  // past its end this time through; the hall's time is c.T plus every earlier beat's wait. A frozen ?at= frame never
  // waits, so it's still exactly c.T.
  const waited = beats.map(() => 0);
  let last = 0;
  const clocked = beats.map((b, i) => ({
    ...b,
    draw(g, t, c) {
      waited[i] = Math.max(0, t - b.dur);
      waited.fill(0, i + 1);
      last = c.T + waited.slice(0, i).reduce((n, w) => n + w, 0);
      b.draw(g, t, { ...c, T: last });
    },
  }));
  clocked.clock = () => last;
  return clocked;
}
