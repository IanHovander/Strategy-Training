// The World Championship's cut scene: the hall waking up, then the scan along all eight fields. It opens in the dark up
// by the truss over the left wall and Archimedes' curtain: the lamps come on left to right, each throwing its cone
// down, and the hall comes up out of the dark in hard steps as they do; then the place card names the event. The camera
// tilts down and along onto Archimedes' field, a match already playing, and glides the whole length of the hall, one
// division after the next, every field playing its own match out of step with the others. The glide never stops and
// never cuts: it runs fast along a field, then slows as it comes to the stretches worth a look, most of all the aisles,
// where one field's red end, its scoring table and big screen, the curtain, and the next division's sign, queue and
// blue end share the screen, so it's plain the fields stand side by side in one hall. As each division comes into view,
// the stage's own place card names it, over the stands in the top corner, each landing somewhere else: on Archimedes'
// field as the tilt lands, at Curie's blue end once its sign has gone by, on Daly's field, at Galileo's blue end, and so
// on. The glide is one beat per division, so A moves on one division at a time (the camera sweeps on to the next one
// rather than cutting, and the card changes once it gets there) and only SKIP leaves the whole scan. At Newton, the
// last division and 5026's, it glides on past the strategist, who stands at the end of the walkway by the queue,
// watching, and slows to a stop on Newton's field, its match playing like the other seven; then it pans back to her.
// The teammate comes up from 5026's robot in the queue, and the two of them say what the day is about: win Newton and
// play on Einstein, and scout the other seven divisions in the two matches before their own, because whoever wins
// those will be waiting there.
//
// makeCutscene(drawWorld) gives the beats, in stage.js's form. drawWorld(g, view, t, o) is the scene's: the whole
// hall seen from view { x, y } at time t, with o = { lights, beams, hero, mate } (how far the lamps have come on, 0 to
// 1; how strong the cones are, 0 to 1; her, { x, y, dir, gait, dist } or null; the teammate the same, or left out to
// stand at MATE). Every beat works out its view as a pure function of its own time, draws the hall at c.T (the hall's
// clock, so an ?at= frame is exactly the frame that plays), then puts the cards, the film bars and the fades on top in
// screen space. The last frame is the first frame of walking: level, half a screen left of START, her at START turned
// to the teammate, the teammate at MATE turned to her. Until the bars go, the view stays at the scan's height, so the
// two of them talk with their heads well clear of the top bar; it comes down to walking's as the bars go.
// Every beat's opening (the lamps, the fade up, the place card, the cones) runs on the cut scene's clock, so A moving a
// beat on early never makes any of them vanish: each carries on into the next beat and finishes on its own time. So do
// a division's card and the teammate's walk up from the queue.

import { W, C, stepped, lerp, seg, easeInOut, clamp } from '../pixel.js';
import { placeCard, bars, cover, along, dirToward, SPEED } from '../stage.js';
import { HERO_NAME, TEAMMATE_NAME } from '../cast.js';
import { HERO_LOOK } from '../walker.js';
import { TEAMMATE_LOOK } from '../teammate.js';
import { ox, DIVISIONS, HOME, START, MATE } from './layout.js';

// ---- The camera ----
// The scan's framing, 8 rows above walking's: under the top film bar the signs and big screens are whole, and under the
// bottom bar a little more of each field than walking shows above its near wall. The cut scene opens higher, up by the
// truss (OPEN: the truss just clear of the top film bar, the bottom bar across the queue crew's chests rather than their
// chins), and ends level (y 0), the way walking sees it.
const OPEN = -56, LEVEL = -8;
// The tilt comes down onto Archimedes' field, its blue driver station on the left and the blue rocket on the right, and
// the scan runs from there past her at Newton's walkway (X1: her at START, half a screen in, the framing walking starts
// from) to a stop on Newton's field at X_END, its cargo ship and both rockets in view, before it pans back to X1.
const X0 = ox(0) + 120, X1 = START.x - W / 2, X_END = ox(HOME) + 280;

// The glide's speed, pixels a second, at each view x along the hall: CRUISE between the fields, easing down (a cosine
// dip, so it never jolts) over each stretch in SLOW to v at its middle x, w pixels either side: on every field, its
// cargo ship mid-screen, so each match gets a long look, and slowest of all in the aisles. It speeds up over the first
// RISE seconds and brakes to a stop at X_END at BRAKE pixels a second each second.
const CRUISE = 200, RISE = 1.6, BRAKE = 70;
/** A field's slow stretch: its cargo ship mid-screen. */
const onField = (k, v = 140) => ({ x: ox(k) + 264, v, w: 200 });
const SLOW = [
  { x: ox(1) - 150, v: 55, w: 230 }, // the aisle from Archimedes' red station, table and screen to Curie's sign and queue
  { x: ox(2) + 250, v: 90, w: 260 }, // Daly's field: the cargo ship, both rockets, robots scoring
  { x: ox(4) - 118, v: 55, w: 230 }, // from Galileo's scoring table and screen to Hopper's queue and blue station
  { x: ox(5) + 250, v: 140, w: 200 }, // Johnson's field
  { x: ox(6) - 178, v: 55, w: 230 }, // Johnson's red station, the button traders and Milstein's sign
  ...[0, 1, 3, 4, 6].map((k) => onField(k)), // the other fields but Newton's, where the glide comes to a stop
];
function speed(x, t) {
  let v = CRUISE;
  for (const s of SLOW) {
    const u = Math.abs(x - s.x) / s.w;
    if (u < 1) v = Math.min(v, s.v + ((CRUISE - s.v) * (1 - Math.cos(Math.PI * u))) / 2);
  }
  v = Math.min(v, Math.sqrt(2 * BRAKE * Math.max(0, X_END - x)));
  return v * easeInOut(seg(t, 0, RISE));
}
// Where the camera is, worked out once by stepping along at that speed 240 times a second: STEPS[i] is the view's x
// i/240 seconds into the scan, and SCAN how long the whole glide takes. scanX() reads between the steps, so the camera
// is a pure function of time.
const DT = 1 / 240;
const STEPS = (() => {
  const xs = [X0];
  for (let x = X0, t = 0; x < X_END - 0.01; t += DT) {
    x = Math.min(X_END, x + Math.max(speed(x, t), t > RISE ? 2 : 0) * DT);
    xs.push(x);
  }
  return Float64Array.from(xs);
})();
const SCAN = (STEPS.length - 1) * DT;
/** Where the scan has got to, t seconds in. */
function scanX(t) {
  const f = clamp(t, 0, SCAN) / DT, i = Math.min(STEPS.length - 2, Math.floor(f));
  return lerp(STEPS[i], STEPS[i + 1], f - i);
}
/** How fast it's going there, pixels a second. */
const scanV = (t) => (scanX(t + 1 / 60) - scanX(t)) * 60;
/** And the other way: when the scan gets to x. */
function scanTimeAt(x) {
  let lo = 0, hi = STEPS.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (STEPS[mid] < x) lo = mid;
    else hi = mid;
  }
  return lo * DT;
}

// ---- The division cards ----
// stage.js's place card itself, in its own place in the top left, held HOLD seconds instead of three: placeCard() is
// called with its time stretched over the hold (it slides in over its 0.2 to 0.6 seconds and out over its 3.6 to 4),
// so whatever the house card becomes, these become too. If placeCard() ever takes a hold, this is
// placeCard(age + 0.2, name, sub, { hold: HOLD - 0.2 }).
// Each card comes in when the view reaches its CARD_AT x, somewhere different in each division (so no two divisions'
// beats start on the same picture), and slides out HOLD seconds later, before the next one comes in. Up there it only
// ever covers the stands: never a field's robots, and never a sign or a big screen, since in the aisles it waits until
// the glide has taken the division's sign off the left edge. So it never names a division that isn't in view yet. When
// is worked out from where the camera is, so it's a pure function of time too.
const HOLD = 2.4, SLIDE = 0.4, CARD_SLID = 0.4; // CARD_SLID: how long a card takes to slide in
const CARD_AT = [
  X0, // on Archimedes' field as the tilt lands
  ox(1) + 110, // at Curie's blue end, its sign gone by, as the glide leaves the aisle
  ox(2) + 210, // on Daly's field, the glide slowing for its rockets
  ox(3) + 130, // at Galileo's blue end, its sign gone by, at full speed
  ox(4) + 90, // at Hopper's blue end, its sign just gone by, as the glide leaves the aisle
  ox(5) + 80, // over Johnson's blue HAB, at full speed
  ox(6) + 150, // past Milstein's blue driver station, the button traders and its sign gone by
  ox(HOME) + 200, // on Newton's own field, as the glide brakes to a stop on it
];
const CARD_IN = CARD_AT.map(scanTimeAt);
function divisionCard(k, age) {
  if (age < 0 || age > HOLD + SLIDE) return;
  const t = age < HOLD ? 0.2 + Math.min(age, 1.7) : 3.6 + (age - HOLD);
  placeCard(t, DIVISIONS[k].name, `DIVISION ${k + 1} OF ${DIVISIONS.length}`);
}

// ---- The people ----
// She stands just off the end of Newton's walkway, by the queue, watching the match, the whole time the camera comes
// along the hall, and as it glides on past her onto Newton's field. The teammate waits in the queue behind 5026's robot
// on its cart, where every other division has one of the robot's team, and once the camera has come back to her walks
// straight up from it, beside the robots and in front of the curtain, with nothing in the way, to stand on her left.
// She turns to the teammate as the teammate comes up, and they talk face to face, a head's width apart.
const her = (dir) => ({ x: START.x, y: START.y, dir, gait: 'stand', dist: 0 });
const FROM = [MATE.x, 102]; // behind the second cart, where the other divisions' queues have someone too (people.js)
const WALK_UP = [FROM, [MATE.x, MATE.y]];
const WATCHING = { x: FROM[0], y: FROM[1], dir: 0, gait: 'stand', dist: 0 };
// The settle: the glide has come to rest on Newton's field; a moment later the camera pans back to her (eased, PAN
// seconds), and once it's on her the teammate sets off.
const PAN_AT = 0.5, PAN = 2.2;
const SETS_OFF = PAN_AT + PAN; // seconds into the settle
const ARRIVES = SETS_OFF + along(WALK_UP, 1e9).dist / SPEED.walk;
const TURNS = ARRIVES - 0.8; // she hears the teammate coming
// The walk up has one clock, u, seconds into the settle as if it had played through, carried on from beat to beat to
// the bars going. If A cuts the settle short before the teammate gets to her, they jog the rest of the way (their clock
// runs JOG times as fast, and they run), setting off at once if they hadn't yet: 46 rows in under a second, so they're
// beside her before the two of them have finished talking, however fast the words are read.
const JOG = SPEED.run / SPEED.walk;
/** The teammate u seconds into the walk up's clock: waiting, walking (or jogging) up, then turned to her. */
function teammate(u, jog = false) {
  if (u < SETS_OFF) return WATCHING;
  if (u >= ARRIVES) return { ...MATE, gait: 'stand', dist: 0 };
  const p = along(WALK_UP, u - SETS_OFF);
  return jog ? { ...p, gait: 'run' } : p;
}
/** Her meanwhile: facing the camera until she hears them coming, or, if they're jogging, turned to watch them come. */
function heroAt(u, jog = false) {
  if (!jog) return her(u < TURNS ? 0 : START.dir);
  const m = teammate(u, true);
  return her(u >= ARRIVES ? START.dir : dirToward(m.x - START.x, (m.y - START.y) / 0.8));
}
/** The view's x t seconds into the settle: where the scan stopped on Newton's field, then panning back to her. */
const settleX = (t) => Math.round(lerp(X_END, X1, easeInOut(seg(t, PAN_AT, PAN_AT + PAN))));

// ---- The opening ----
// The lamps coming on, the fade up out of the dark and the cones all run on the cut scene's clock (c.T) or, for the
// cones, the tilt's, so whichever beat A has moved on to carries them on (the first scan beat too), and each finishes on
// its own time instead of vanishing. The place card goes when A is pressed, the way it goes at the end of its hold.
const CARD = ['WORLD CHAMPIONSHIP', 'HOUSTON - EIGHT DIVISIONS']; // font 3 has no comma
// The place card comes in once the lamps under it have come on, so it never hides one coming on, and is held 0.4
// seconds less than the house card's three (it starts sliding out at age CARD_OUT, gone by CARD_GONE), so it has gone
// before the tilt brings anything up into its rows: Archimedes' sign, and the top of its big screen.
const CARD_FROM = 1.2, CARD_OUT = 3.2, CARD_GONE = 3.6;
const TILT = 3.0;
/** How far across the lamps have come on, T seconds into the cut scene. */
const lights = (T) => seg(T, 0.7, 2.3);
/** The cones, u seconds into the tilt: full until it starts, fading in four steps as it comes down. */
const cones = (u) => stepped(1 - seg(u, 0, TILT));
/**
 * The fade up and the place card, T seconds into the cut scene, over the hall. cut: when A cut the lights or the tilt
 * short (left out if it didn't). Pressed before the card has come in, it never does; pressed while it's up, it slides out
 * then (once it has finished sliding in), so the camera hurrying on never takes Archimedes' sign under it.
 */
function opening(T, cut = Infinity) {
  cover(1 - seg(T, 0.1, 0.8));
  const age = T - CARD_FROM, at = cut - CARD_FROM, out = Math.max(at, 0.6); // out: the card's age as it starts to go
  if (at < 0.2) return;
  const held = age < CARD_OUT ? age : age + (3.6 - CARD_OUT); // placeCard()'s time, its slide out moved earlier
  placeCard(at >= CARD_OUT || age <= out ? held : 3.6 + (age - out), ...CARD);
}
/** A gentle ease in and out (smoothstep): half as fast at its fastest as easeInOut, for the camera catching up. */
const smooth = (s) => s * s * (3 - 2 * s);
/** Newton at the scan's height, and the two of them face to face: the say beats hold here. */
const HELD = Object.freeze({ x: X1, y: LEVEL });

// When A moves the cut scene on early, the camera sweeps from where it is to where the new beat looks, at no more than
// about PACE pixels a second on average: a sweep takes the distance over PACE, CATCH_UP[0] to CATCH_UP[1] seconds.
const PACE = 800, CATCH_UP = [0.6, 2.4];

/**
 * The beats (stage.js): the lights, the tilt, the scan (a beat for each division), the settle, the two of them talking,
 * and the bars going. Each beat's draw(g, t, c) gets c.look(view, vel, least), the view to draw from (see the clock,
 * below; vel: how fast the beat's own view is moving as it starts, if it is; least: the shortest a sweep onto it may
 * take), and c.begun, how the beat began: { early: whether A moved the beat before it on early, follows: whether it
 * follows straight on from the beat before (not a fresh start: ?beat=, ?at=), i and t: that beat and how far into it it
 * got, at: how far the scan had got, card: the division card up on its last frame ({ k, age }, or null), up and jog: the
 * teammate's walk up then }. The list also carries clock(), the hall's time on the cut scene's latest frame, and
 * played(), whether that frame was in its last beat (it was played through, not skipped), so walking can carry on from
 * it.
 */
export function makeCutscene(drawWorld) {
  let scanAt = 0; // how far into the scan the latest frame was, for the next beat to carry on from
  let cut = Infinity; // when A cut the lights or the tilt short, on the cut scene's clock
  let card = null; // the division card on the latest frame, { k, age }
  let up = Infinity, jog = false; // the walk up's clock on the latest frame (teammate()), and whether they're jogging
  /** Division k's card, age seconds after it came in, as the card on this frame. */
  const show = (k, age) => {
    divisionCard(k, age);
    card = { k, age };
  };
  /**
   * The card in a beat A moved on to, as the camera sweeps on to the beat's own view: the card that was up carries on
   * (on its own time) until the camera has passed division k's CARD_AT and all but caught up with the beat's own view
   * (x: where the view is, own: where the beat's own view is), and then k's card comes in over it, its age counted from
   * that frame. If k's card was up already, it just carries on.
   */
  function hurriedCard(k, c, t, x, own) {
    const b = c.begun;
    if (b.card?.k === k) return show(k, b.card.age + t);
    if (b.cardAt == null && x >= CARD_AT[k] && Math.abs(x - own) <= 40) b.cardAt = t;
    const age = b.cardAt == null ? -1 : t - b.cardAt;
    if (b.card && age < CARD_SLID) show(b.card.k, b.card.age + t);
    if (age >= 0) show(k, age);
  }
  const beats = [
    {
      // Black, then the hall in the dark up by the truss over the left wall and Archimedes' curtain, and its lamps
      // coming on left to right, the hall coming up out of the dark in hard steps as they do.
      dur: 3.4,
      draw(g, t, c) {
        cut = Infinity;
        drawWorld(g, c.look({ x: 0, y: OPEN }), c.T, { lights: lights(c.T), beams: 1, hero: her(0), mate: WATCHING });
        opening(c.T);
        bars(1);
      },
    },
    {
      // Down from the truss and along onto Archimedes' field, the cones fading as it comes. It starts straight down and
      // only sets off along once the place card has gone, so Archimedes' sign never climbs up under the card.
      dur: TILT,
      draw(g, t, c) {
        const pan = easeInOut(seg(c.k, 0.4, 1)), tilt = easeInOut(c.k);
        const view = { x: Math.round(lerp(0, X0, pan)), y: Math.round(lerp(OPEN, LEVEL, tilt)) };
        if (c.begun.early) cut = Math.min(cut, c.T - t);
        drawWorld(g, c.look(view), c.T, { lights: lights(c.T), beams: cones(t), hero: her(0), mate: WATCHING });
        opening(c.T, cut);
        bars(1);
      },
    },
    // The scan: all eight fields, a card for each division, gliding on past her onto Newton's field and stopping there.
    // One beat a division, from its card coming in to the next one's, so A moves on a division at a time. When A does,
    // the camera doesn't jump to this division: it sweeps on from where it had got to, as fast as it was going, through
    // everything in between, and joins the glide on its own time (c.look). The card that was up stays until the camera
    // has got here, and then this division's comes in over it (hurriedCard).
    ...DIVISIONS.map((_, k) => {
      const from = CARD_IN[k], to = CARD_IN[k + 1] ?? SCAN;
      return {
        dur: to - from,
        scan: true,
        draw(g, t, c) {
          scanAt = from + t;
          const b = c.begun, x = scanX(scanAt);
          // If A cut the tilt short, its cones fade on the tilt's own time, and the place card goes. The camera comes
          // down level at once and catches up with the glide over a second or more: if the card was still up, setting
          // off gently (smooth) once the card has all but gone, so Archimedes' sign doesn't climb up under it; if not,
          // sweeping on from the speed it was panning at (c.look), but taking no less than a second over it.
          const hurried = k === 0 && b.early && b.i === 1;
          const tilted = hurried ? b.t + t : TILT;
          if (hurried) cut = Math.min(cut, c.T - t);
          const view = hurried && cut - CARD_FROM < CARD_GONE
            ? c.look({ x: Math.round(lerp(b.from.x, x, smooth(seg(t, 0.35, 1.35)))), y: LEVEL })
            : c.look({ x: Math.round(x), y: LEVEL }, { x: scanV(from), y: 0 }, hurried ? 1 : 0);
          drawWorld(g, view, c.T, { lights: lights(c.T), beams: cones(tilted), hero: her(0), mate: WATCHING });
          if (k === 0) opening(c.T, cut);
          if (b.early) hurriedCard(k, c, t, view.x, x);
          else {
            // Straight on from the last beat: its card, if it came in late (after an A) and is still up, until this
            // one has slid in over it.
            if (b.card && b.card.k !== k && t < CARD_SLID) show(b.card.k, b.card.age + t);
            show(k, t);
          }
          bars(1);
        },
      };
    }),
    {
      // Newton's card goes, the camera pans back to her, and the teammate walks up from the queue.
      dur: ARRIVES + 0.3,
      draw(g, t, c) {
        up = t;
        jog = false;
        const view = c.look({ x: settleX(t), y: LEVEL });
        drawWorld(g, view, c.T, { lights: 1, beams: 0, hero: heroAt(t), mate: teammate(t) });
        // Newton's card carries on from the scan (or, if A hurried the scan past it, comes in as the camera gets there).
        if (c.begun.follows) hurriedCard(HOME, c, t, view.x, settleX(t));
        else show(HOME, SCAN - CARD_IN[HOME] + t);
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
        // If A cut the settle short before the teammate got to her, they jog the rest of the way as they start talking,
        // setting off at once if they hadn't yet.
        const b = c.begun;
        jog = b.jog || b.up < ARRIVES;
        up = (jog ? Math.max(b.up, SETS_OFF) : b.up) + t * (jog ? JOG : 1);
        drawWorld(g, c.look(HELD), c.T, { lights: 1, beams: 0, hero: heroAt(up, jog), mate: teammate(up, jog) });
        bars(1);
      },
    },
    {
      dur: 0.6,
      say: {
        // The drive team's strategist meets the alliance partners in queue, so she has to be back before then.
        name: HERO_NAME, look: HERO_LOOK, tag: C.red1,
        lines: [
          ["WE'RE ON IN TWO MATCHES. TEN MINUTES", 'TO SCOUT, THEN BACK HERE.'],
          ['WHOEVER WINS THE OTHER SEVEN WAITS ON', 'EINSTEIN. THEY ALL GO ON THIS BOARD.'],
        ],
      },
      draw(g, t, c) {
        drawWorld(g, c.look(HELD), c.T, { lights: 1, beams: 0, ...walkedUp(c.begun, t) });
        bars(1);
      },
    },
    {
      // The bars go and the view comes down to walking's, and the next frame is hers to walk.
      dur: 1.0,
      draw(g, t, c) {
        const view = { x: X1, y: Math.round(lerp(LEVEL, 0, easeInOut(c.k))) };
        drawWorld(g, c.look(view), c.T, { lights: 1, beams: 0, ...walkedUp(c.begun, t) });
        bars(1 - c.k);
      },
    },
  ];
  /**
   * The two of them t seconds into a beat after the teammate's say: the walk up carrying on (long done, unless A
   * hurried everything along), so they never jump.
   */
  function walkedUp(b, t) {
    jog = b.jog;
    up = b.up + t * (jog ? JOG : 1);
    return { hero: heroAt(up, jog), mate: teammate(up, jog) };
  }
  // ---- The clock ----
  // The hall's time runs on as the page's does, whatever the beats do. c.T counts from each beat's start as if every
  // beat had taken exactly its dur, but a say beat waits to be read, running on past the next beat's start, and A moves
  // a beat on before its end; either way the next beat would set every match back or jump it on. spent[i] is how long
  // beat i really ran this time through (left at its dur for a beat that never ran: ?beat=N), and the hall's time is the
  // beat's own time plus every earlier beat's spent. A frozen ?at= frame never waits or moves on, so it's still exactly
  // c.T. And the camera: when A moves a beat on early, the next beat's first frame would cut to wherever that beat
  // starts, so instead c.look sweeps it on from where the last frame looked, at the speed it was already going, into
  // the beat's own view, over a time that grows with the distance (PACE, CATCH_UP). Pressed again mid-sweep, the next
  // sweep starts from wherever this one has got to, as fast as it's going. Without an A, every beat starts where the
  // last one ended, and nothing is added.
  const spent = beats.map((b) => b.dur);
  let now = -1, last = 0, begun = null;
  let seen = null, before = null; // the latest frame's view and hall time, and the frame's before that
  const clocked = beats.map((b, i) => ({
    ...b,
    draw(g, t, c) {
      if (i !== now) {
        // A new beat: straight on from the one before (catching up if that ended early), or a fresh start, as if
        // everything before had played through.
        const follows = now >= 0 && i === now + 1, early = follows && spent[now] < beats[now].dur - 0.05;
        begun = {
          early, follows, i: now, t: early ? spent[now] : 0, at: scanAt, from: seen, was: before, sweep: null,
          card: follows ? card : null, up: follows ? up : Infinity, jog: follows && jog,
        };
        if (!follows) spent.forEach((_, j) => (spent[j] = beats[j].dur));
        now = i;
      }
      card = null;
      spent[i] = t;
      last = spent.slice(0, i).reduce((n, s) => n + s, 0) + t;
      const look = (view, vel = { x: 0, y: 0 }, least = 0) => {
        if (begun.early && begun.from) {
          begun.sweep ??= sweepFrom(begun, view, vel, t, least);
          const { D, x, y } = begun.sweep;
          if (t < D) {
            // A cubic Hermite from the whole offset to none: ease, its part that starts still, and push, its part that
            // starts at the slope M (the camera's own speed less the view's).
            const s = t / D, ease = 2 * s ** 3 - 3 * s ** 2 + 1, push = s ** 3 - 2 * s ** 2 + s;
            view = { x: Math.round(view.x + x.by * ease + x.M * push), y: Math.round(view.y + y.by * ease + y.M * push) };
          }
        }
        before = seen;
        seen = { x: view.x, y: view.y, T: last };
        return view;
      };
      b.draw(g, t, { ...c, T: last, look, begun });
    },
  }));
  /**
   * The sweep from where the camera was to a beat's own view: how long it takes (D, from how far it has to go), and on
   * each axis how far off it starts (by) and how fast it sets off relative to the view (M, as a cubic Hermite's starting
   * slope), matched to how fast the camera was already going so it never stops dead or lurches, but never so fast that
   * it overshoots by much (M within three times by either way). view is the beat's own view t seconds in (its first
   * frame), moving at vel, so where it started is a little behind; least, the shortest the sweep may take.
   */
  function sweepFrom({ from, was }, view, vel, t, least) {
    const dt = was ? from.T - was.T : 0;
    const start = { x: view.x - vel.x * t, y: view.y - vel.y * t };
    const far = Math.max(Math.abs(from.x - start.x), Math.abs(from.y - start.y));
    const D = clamp(Math.max(far / PACE, least), CATCH_UP[0], CATCH_UP[1]);
    const axis = (a) => {
      const by = from[a] - start[a], v = dt > 0 ? (from[a] - was[a]) / dt : 0;
      return { by, M: clamp((v - vel[a]) * D, -3 * Math.abs(by), 3 * Math.abs(by)) };
    };
    return { D, x: axis('x'), y: axis('y') };
  }
  clocked.clock = () => last;
  clocked.played = () => now === beats.length - 1;
  return clocked;
}
