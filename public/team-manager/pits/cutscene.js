// The pits' cut scene: 42.1 seconds, plus however long the words take to read. Saturday morning in the row of pits.
// 5026's robot is getting its last fix when the pit announcer calls match 44; the strategist arrives with the plan on
// her board, gives it to the drive team, and the robot rolls out down the aisle to the queue. Then she's yours to walk,
// from the near end of the row, where she comes in along the aisle, to the way out to the field at its far end.
//   B0 open          the left end of the hall fades in under the place card: the SPARE PARTS counter, 3000's empty pit
//                    (its robot's on the field for match 42) and 1024 at work; the safety advisor standing watch and
//                    two students from other rows walking the aisle
//   B1 down the row  a slow pan along the row, past busy pits and empty ones, to 5026: Noor and the teammate kneeling
//                    at the robot with a drill, Eli the driver waiting in the aisle, Ms. Kowalski by the chest
//   B2 the call      over the speakers: match 43 should be queuing, match 44 to the queue
//   B3 she arrives   the teammate gets up and steps out to the front of the pit while Noor finishes a last bolt; the
//                    strategist walks in from the left, and Eli comes over to meet her
//   B4a-d the plan   a hard cut to a close-up at twice the size, one page each so the phone shows who's talking: the
//                    robot's ready, the driver asks, she gives him the plan, he reads it back (the coach and the human
//                    player are waiting in the queue). Everyone's whole head is between the film bar and the dialog
//                    box, the three who speak down to the chest
//   B5a make a hole  a hard cut back: Noor gets up, steps to the cart's handle and takes it, and calls ahead, robot
//                    coming through, and the pit makes a hole: the strategist steps back, Eli steps out ahead of the
//                    cart and the teammate goes round into the next pit's corner, all before the words are read, so
//                    the robot stands whole. Nothing rolls while the words are up: the page waits for A like every
//                    other, and the A that closes the box starts B5b.
//   B5b rolling out  no words, and A doesn't hurry it (stage.js hold), so no stray A skips the robot leaving: it rolls
//                    out of the pit on its cart, easing off its spot, and away down the aisle to the right, Noor's
//                    hands on its handle from the first inch and Eli leading, the camera going with it, never faster,
//                    to the end of the hall, where it passes the QUEUE sign and goes out through the way out to the
//                    field, into the arena's light; the IN QUEUE / MATCH 44 board, folded against the table behind
//                    the robot (its edges showing round the mast from the first frame), shows whole as it goes, and
//                    once Noor's past, the teammate picks it up, turns it round and stands it on 5026's spot, and goes
//                    over to the battery cart. It ends as Noor goes off the screen
//   B6 pit duty      the camera comes back to our pit, the strategist stepping back to the front of it, and once it's
//                    settled she turns to the teammate: she's staying with it, and the safety advisor is watching
//   B7 later         a fade to black on the pit, and up again on the near end of the hall, the film bars going: the
//                    SPARE PARTS counter, and the safety advisor watching the aisle, the aisle's walkers on the
//                    walking part's own clocks, so this shot's last frame is walking's first (END). The strategist
//                    isn't in it: she comes in along the aisle from off its left edge, as every scene is entered,
//                    and walks the row to the way out at its far end (scene.js's enter, START and exit)
//
// It's drawn the way every cut scene is (stage.js): the place card, film bars and fades are stage.js's, the camera moves
// are eased pans and hard cuts like the intro's, the close-up zooms by a whole number, and every frame is a pure function
// of the beat's time t (and c.T, seconds into the whole cut scene, for everything that goes on in the background). The
// hall, the furniture and the robots on their carts are the set's (set.js), and the people are people.js's, drawn with
// its folk() and drawFolk(); the scene passes them in as `world`, so this file only arranges them. The cut scene draws
// 5026's crew itself (the strategist, Noor, Eli, the teammate and Ms. Kowalski) and the robot while it's rolling, and
// leaves the teammate and Kowalski out of folk(). The aisle's walkers (the safety advisor and the two from other rows)
// are the cut scene's too in the opening, on paths of their own that drop behind the pan, and they stay away from the
// call on, so nobody blinks out, the jump in c.T after a long read never shows, and the aisle is clear for the robot;
// after the fade in B7 they're back, on the walking part's own clocks.
// Nothing moves in a say beat once its time is up: its t runs on while the words are read, so people arrive and turn
// before then and hold still after.
//
//   START               where the walking part has her stop once she's walked in from off the left edge
//   END                 the view on the cut scene's last frame, and the aisle's walkers' clocks then: walking starts there
//   makeCutscene(world) the beats; world = { drawWorld, drawCartBot, drawFolk, folk, LOOKS } (set.js and people.js)

import { lerp, seg } from '../pixel.js';
import { placeCard, bars, cover, along, dirToward, SPEED } from '../stage.js';
import { TEAMMATE_NAME } from '../cast.js';
import { SCRIPT } from './lines.js';

/**
 * Where the walking part begins: she comes into the hall along the aisle from off its left edge (scene.js's enter)
 * and stops here, at the near end of the row in front of the SPARE PARTS counter, with the whole row ahead of her and
 * the way out at its far end. She turns to you there. It's a step in front of the passers-by's lanes, and far enough
 * down the aisle that her head is under the counter's sign, not in front of it.
 */
export const START = { x: 40, y: 126, dir: 0 };
/**
 * The cut scene's last frame: the near end of the hall, waiting for her (view), and where the aisle's walkers' clocks
 * (scene.js) are then, which this shot runs them up to: a second after the safety advisor gets back to her end of the
 * aisle, so she's already standing there looking round as walking takes over, not stopping and turning just then.
 */
export const END = { view: { x: 0, y: 0 }, aisleT: 1 };

// ---- 5026's pit ----
// Where everyone is when the pan gets there: Noor kneeling left of the robot with the drill, the teammate kneeling at
// its front corner, Eli the driver waiting in the aisle, Ms. Kowalski beside the tool chest. The robot's cart stands at
// CART. When the strategist arrives the teammate gets up and steps out to the front of the pit (MATE_UP), and Eli comes
// over (ELI_PLAN): the strategist (HERO_PLAN) and Eli face each other across the front of the pit for the plan, with
// nobody's head behind anybody else's. The teammate stands a step left of Ms. Kowalski, so their heads are 18 pixels
// apart across rather than one on top of the other (her shoulder hides the bumper's last digit for the plan; she's
// out of the way before the robot's called). Noor stays down at the robot, listening, till it rolls. Eli waits at the
// corner of the pit, where nobody stands behind him (1357's Oscar is over by his buttons, past his board).
const CART = [616, 90];
const NOOR = [585, 90], MATE = [640, 98], MATE_UP = [630, 105], ELI = [666, 110], MS_K = [648, 88];
const ELI_PLAN = [601, 102], HERO_PLAN = [565, 100];
/** Eli's way over to her: along the front of the pit, in front of the teammate. */
const ELI_OVER = [ELI, [622, 110], ELI_PLAN];
/**
 * When Noor calls for a hole, the teammate makes one: round the front of 1357's side drape and a step back into the
 * corner of their pit in front of their tool chest (MATE_OUT, to MATE_ASIDE, from MATE_GO seconds into B5a), her head
 * clear of Ms. Kowalski's and Eli's, and high enough that the robot's mast goes by under her chin. Once it's gone, and
 * Noor behind it, she comes back round the drape's front post into its spot (MATE_IN, to MATE_SET), picks the board up
 * off the floor in front of the table and stands it up there, then goes over to the battery cart, where she stays on
 * pit duty clear of the board (MATE_END: people.js has her there for the walking part). In B5b: back from SET_AT
 * seconds, bent over the board from LEAN_AT (as she gets there) till it stands, and off to the battery cart from OFF_AT.
 */
const MATE_ASIDE = [668, 96], MATE_SET = [630, 92], MATE_END = [588, 92];
const MATE_OUT = [MATE_UP, [658, 103], MATE_ASIDE], MATE_IN = [MATE_ASIDE, [658, 103], MATE_SET];
const MATE_GO = 0.7;
const SET_AT = 3.9, LEAN_AT = SET_AT + along(MATE_IN, 1e6).dist / SPEED.walk, OFF_AT = LEAN_AT + 1.15;
/** Her mark at the front of 5026's pit, where she takes her leave of the teammate in B6. */
const HERO = [572, 108];
// Her walk in from off the left of the screen. The robot's way to the queue: out of the pit on a slant to the middle
// of the aisle, the way a cart pushed from one end goes, then right, along the aisle, past the QUEUE sign and off the
// end of the hall, from ROLL_AT seconds into B5b. It eases off its spot, up to walking pace over its first EASE seconds
// (rolled()). Noor gets up from GET_UP on in B5a (rising: bent over, then standing) and steps to its handle, PUSH
// pixels behind its middle (NOOR_PUSH), where she takes it in both hands; she pushes it all the way, on the cart's own
// way and clock, so her hands never leave it and her feet step with the ground it covers. While Noor calls out in B5a,
// Eli steps out ahead of the cart to the front of the aisle (ELI_GO, from ELI_GO_AT), past its right end and clear of
// its bumper, so the robot shows whole as it's called; in B5b he leads it along the aisle, a cart's length ahead
// (LEAD, from LEAD_AT). The strategist steps back a little, out of its way (HERO_ASIDE): far enough left that when
// the camera has followed the robot to the end of the hall she's just off the screen rather than a sliver at its edge,
// and in B6 she steps back to HERO. B5b ends as Noor goes off the right of the screen (ROLL_END), and A doesn't hurry
// it (its hold is all of it).
const WALK_IN = [[424, 120], HERO_PLAN];
const ROLL = [CART, [630, 112], [652, 122], [880, 122]];
const ROLL_AT = 0.55, GET_UP = 0.15, ROLL_END = 8.7;
const PUSH = 26, NOOR_PUSH = [CART[0] - PUSH, CART[1]];
const NOOR_OUT = ROLL.map(([x, y]) => [x - PUSH, y]);
const EASE = 0.6;
/** How far along ROLL the cart is t seconds after it starts, in seconds at walking pace: an even ease up to that pace. */
const rolled = (t) => (t <= 0 ? 0 : t < EASE ? (t * t) / (2 * EASE) : t - EASE / 2);
/** 5026's board in B5b, as set.js draws it, until each moment: folded by the table, picked up, turned round, standing. */
const BOARD = [[LEAN_AT + 0.35, 'empty'], [LEAN_AT + 0.7, 'lift'], [LEAN_AT + 1.05, 'turn']];
const ELI_GO = [644, 119], ELI_GO_AT = 0.3, LEAD_AT = 0.8;
const LEAD = [ELI_GO, [670, 124], [900, 124]];
const HERO_ASIDE = [566, 104];

/** Getting up from kneeling, t seconds after starting to: bent over for a moment first, so nobody pops upright. */
const rising = (t) => (t < 0.2 ? 'lean' : 'stand');

// Who the cut scene draws itself, and who walks the aisle (there for the opening, gone by the call).
const OWN = ['teammate', 'kowalski'];
const AISLE = ['pass1', 'pass2', 'nadia'];

// ---- The camera ----
const ROW = { x: 0, y: 0, s: 1 };
const PIT = { x: 444, y: 0, s: 1 };
// The plan, at twice the size: every head clears the top film bar (Ms. Kowalski's, the highest, by a pixel), the three
// who speak show down to the waist above the dialog box, and the strategist stands clear of the name tag's corner. Its
// edges fall between faces: Lena's (people.js has her at the laptop far enough left) is just out of the frame.
const CLOSE = { x: 537, y: 34, s: 2 };
const B2 = 16.5; // when the call comes, in cut scene seconds: the pan down the row is over
/**
 * Where the pan after the robot stops: the end of the hall, the QUEUE sign and the way out on the screen as the robot
 * goes by and out, the strategist (at HERO_ASIDE) just off the left. The pan goes with the cart, from where it starts to PAN_RUN
 * pixels further on, so it never outruns it (its fastest is 0.9 of the cart's pace: the robot always moves forward on
 * the screen). B6's pan back takes BACK_PAN seconds, no quicker than the long pan down the row.
 */
const B5_END = 576, PAN_RUN = 220, BACK_PAN = 3.2;
/**
 * B7: the fade to black on the pit (from FADE[0] to FADE[1] seconds in), and up again on the near end of the hall (from
 * FADE[2] to FADE[3]), the film bars going over BARS_OFF. A doesn't hurry it (its hold is all of it): the A that closes
 * the teammate's last page starts it, and one more never cuts the fade short.
 */
const FADE = [0.1, 0.5, 0.7, 1.1], BARS_OFF = [0.9, 1.5], LATER = 1.6;
/** A gentler ease than pixel.js's easeInOut for the long pans: the busy pits in the middle of the row don't rush past. */
const glide = (u) => u * u * (3 - 2 * u);
/** The pan down the row, t seconds into it. */
const rowX = (t) => Math.round(lerp(0, PIT.x, glide(seg(t, 0.4, 11.4))));

// ---- Poses ----
const mod = (a, n) => ((a % n) + n) % n;
/** Someone holding still: standing, or kneeling or leaning at a frame of that gait. */
const still = ([x, y], dir, look, gait = 'stand', frame = 0) => ({ x, y, dir, gait, frame, look });
/** Someone walking a path with stage.js's along(): their feet step with the distance (drawFolk's frameOf). */
const walking = (a, look) => ({ x: Math.round(a.x), y: Math.round(a.y), dir: a.dir, gait: a.gait, dist: a.dist, look });
/**
 * The same in a gait stage.js has no stride for (push, carry): its frame from the distance, as the walk's, and frame 0
 * (standing still in that pose) before and after.
 */
const stepping = (a, gait, look) => ({
  x: Math.round(a.x), y: Math.round(a.y), dir: a.dir, gait, frame: a.gait === 'stand' ? 0 : Math.floor(a.dist / 3.2) % 8, look,
});
/** Kneeling at the robot with the drill: bursts of drilling and a rest, like people.js's kneelers, in a phase of its own. */
const drilling = (T, phase) => {
  const k = mod(T + phase * 3.6, 3.6);
  return k < 2.4 ? Math.floor(k * 5) % 4 : 0;
};
/** The direction from one spot to another, the way stage.js turns her to talk to someone. */
const toward = ([x0, y0], [x1, y1]) => dirToward(x1 - x0, (y1 - y0) / 0.8);

/** The beats of the cut scene, drawn with world = { drawWorld, drawCartBot, drawFolk, folk, LOOKS }. */
export function makeCutscene(world) {
  const { drawWorld, drawCartBot, drawFolk, folk, LOOKS } = world;

  // The aisle in the opening: the safety advisor stands watch by the counter, clear of 3000's board, looking round; one
  // passer-by comes in from the right as the hall fades in and goes off to the left, in front of her, the other walks in
  // from the left a couple of seconds later, well before the pan sets off, and walks on to the right, slower than the
  // pan: it catches them up a third of the way across the screen and they drift back off its left edge in full view,
  // far enough behind that they're still off it when the pan stops. The two cross on clear floor left of her, one at a
  // time past her (more than a second apart), never both at once. They walk paths of their own here (people.js's loops
  // would still be on the screen when the pan stops), at people.js's pace, and from the call on the aisle is clear.
  const aisle = (T) => (T >= B2 ? [] : [
    still([104, 108], [0, 1, 7][Math.floor(T / 0.85) % 3], LOOKS.nadia),
    walking(along([[240, 120], [-30, 120]], T, 'walk', 30), LOOKS.pass2),
    walking(along([[-70, 128], [900, 128]], T, 'walk', 30), LOOKS.pass1),
  ]);
  /** Everyone else in the pits at T: the crews at work and, in the opening, the aisle's walkers. */
  const others = (T, opening = false) => [...folk(T, { except: [...OWN, ...AISLE] }), ...(opening ? aisle(T) : [])];
  /**
   * The aisle's walkers on the walking part's clocks (scene.js) at k: the safety advisor coming back to the near end of
   * her patrol and stopping there to look round, one passer-by walking on up the aisle ahead of the strategist and the
   * other far off at the other end.
   */
  const walkers = (T, k) => folk(T, { clocks: Object.fromEntries(AISLE.map((id) => [id, k])) }).filter((p) => AISLE.includes(p.id));

  // 5026 at work on the robot, as the pan finds them and through the call.
  const atWork = (T) => [
    still(NOOR, 2, LOOKS.noor, 'kneel', drilling(T, 0.15)),
    still(MATE, 5, LOOKS.teammate, 'kneel', drilling(T, 0.6)),
    still(ELI, 7, LOOKS.eli),
    still(MS_K, 7, LOOKS.kowalski),
  ];
  // Everyone gathered round the robot with her for the plan: they've turned to her.
  const gathered = [
    still(HERO_PLAN, toward(HERO_PLAN, ELI_PLAN), LOOKS.hero),
    still(NOOR, toward(NOOR, HERO_PLAN), LOOKS.noor, 'kneel'),
    still(MATE_UP, toward(MATE_UP, HERO_PLAN), LOOKS.teammate),
    still(ELI_PLAN, toward(ELI_PLAN, HERO_PLAN), LOOKS.eli),
    still(MS_K, toward(MS_K, HERO_PLAN), LOOKS.kowalski),
  ];

  /** One frame: the hall from view, everyone in it sorted in by their feet, and the film bars. */
  function shoot(g, T, view, people, o = {}) {
    const more = people.map((p) => ({ y: p.y, draw: () => drawFolk(g, view, p) }));
    drawWorld(g, view, T, { more: [...(o.cart ? [o.cart] : []), ...more], pit5026: o.pit5026 ?? 'robot' });
    bars(o.bars ?? 1);
  }

  // The plan, a page a beat: who says it and who the phone shows. 6060's student leaning on their robot, just behind
  // the strategist, keeps to her own lean, side on and facing away from her toward their robot, so the close-up shows
  // her face up to the left of the strategist's head (a step further left and the strategist would hide it).
  const plan = SCRIPT.ready.map((page, i) => ({
    dur: 0.4,
    // The first page after a beat at the cut; the rest straight away, so the box stays up from one speaker to the next.
    say: { name: page.name, tag: page.tag, look: [LOOKS.teammate, LOOKS.eli, LOOKS.hero, LOOKS.eli][i], at: i === 0 ? 0.15 : 0, lines: [page] },
    draw(g, t, c) {
      shoot(g, c.T, CLOSE, [...others(c.T), ...gathered]);
    },
  }));

  /** B5b, t seconds after the robot's roll began (each of its three beats draws its part of this). */
  function rollOut(g, t, c) {
    // The cart and Noor on one eased clock, she at its handle: standing in the push pose till it moves. The camera
    // follows the cart, eased in and out over PAN_RUN pixels of its way. The two are put where they are on the
    // screen (the cart PUSH pixels ahead of her, as on their paths), so the camera's rounding and theirs never step
    // them back a pixel while it keeps pace with them.
    const k = rolled(t - ROLL_AT), cart = along(ROLL, k), noor = along(NOOR_OUT, k);
    const pan = lerp(PIT.x, B5_END, glide(seg(cart.x, CART[0], CART[0] + PAN_RUN)));
    const view = { ...PIT, x: Math.round(pan) };
    const x = view.x + Math.round(cart.x - pan), y = Math.round(cart.y);
    // The teammate watches it go from the next pit's corner; once it and Noor are past she steps into the spot, bends
    // to the folded board, lifts it, turns it round and stands it up on its legs (BOARD), then goes over to the
    // battery cart and watches the robot down the aisle.
    const set = along(MATE_IN, t - SET_AT), off = along([MATE_SET, MATE_END], t - OFF_AT);
    const mate = t < SET_AT ? still(MATE_ASIDE, t < 1.2 ? 6 : t < 2.4 ? 7 : 1, LOOKS.teammate)
      : t < LEAN_AT ? (set.gait === 'walk' ? walking(set, LOOKS.teammate) : still(MATE_SET, 6, LOOKS.teammate))
        : t < BOARD[2][0] ? still(MATE_SET, 6, LOOKS.teammate, 'lean', t < BOARD[0][0] + 0.15 ? 0 : 1)
          : off.gait === 'walk' ? walking(off, LOOKS.teammate) : still(t < OFF_AT ? MATE_SET : MATE_END, t < OFF_AT ? 6 : 2, LOOKS.teammate);
    shoot(g, c.T, view, [
      ...others(c.T),
      still(HERO_ASIDE, 2, LOOKS.hero),
      stepping({ ...noor, x: x - PUSH }, 'push', LOOKS.noor),
      walking(along(LEAD, t - LEAD_AT), LOOKS.eli),
      mate,
      still(MS_K, t < 0.8 ? toward(MS_K, HERO_PLAN) : 2, LOOKS.kowalski),
    ], {
      pit5026: BOARD.find(([until]) => t < until)?.[1] ?? 'sign',
      cart: { y, draw: () => drawCartBot(x, y, { bot: 'ele', num: '5026', team: 'blue', handle: -1, roll: cart.dist }) },
    });
  }

  return [
    // B0 open: the left end of the hall fades in, the bars come in and the place card slides through.
    {
      dur: 4.5,
      draw(g, t, c) {
        shoot(g, c.T, ROW, [...others(c.T, true), ...atWork(c.T)], { bars: seg(t, 0, 0.6) });
        placeCard(t - 0.3, 'THE PITS', 'SATURDAY - QUALIFICATIONS');
        cover(1 - seg(t, 0, 0.8));
      },
    },
    // B1 down the row: past 1024, 7777 (Kai minding the pit), 4000, 2468 (in the queue) and 6060 to 5026.
    {
      dur: 12,
      draw(g, t, c) {
        shoot(g, c.T, { ...ROW, x: rowX(t) }, [...others(c.T, true), ...atWork(c.T)]);
      },
    },
    // B2 the call, over the speakers. 5026 keeps working. The phone shows him at his desk, sitting, as it does when you
    // talk to him.
    {
      dur: 3,
      say: { name: 'PIT ANNOUNCER', look: LOOKS.tomas, faceGait: 'sit', at: 0.4, lines: SCRIPT.call },
      draw(g, t, c) {
        shoot(g, c.T, PIT, [...others(c.T), ...atWork(c.T)]);
      },
    },
    // B3 she arrives: the teammate gets up and steps out to the front of the pit, Eli looks round for her and comes over
    // to meet her, and she walks in and stops at the front of the pit. Noor finishes the last bolt and, kneeling, turns
    // to listen as she gets there; so do the others.
    {
      dur: 5,
      draw(g, t, c) {
        const up = t >= 0.3, here = t >= 4;
        const a = along(WALK_IN, t - 0.3);
        // Eli sets off to meet her once she's well on her way, and turns to her as soon as he's there.
        const eli = along(ELI_OVER, t - 2.6);
        const mate = !up ? still(MATE, 5, LOOKS.teammate, 'kneel', drilling(c.T, 0.6))
          : t < 0.8 ? still(MATE, rising(t - 0.3) === 'lean' ? 5 : 6, LOOKS.teammate, rising(t - 0.3))
            : t < 1.4 ? walking(along([MATE, MATE_UP], t - 0.8), LOOKS.teammate)
              : still(MATE_UP, here ? toward(MATE_UP, HERO_PLAN) : 6, LOOKS.teammate);
        shoot(g, c.T, PIT, [
          ...others(c.T),
          walking(a, LOOKS.hero),
          here ? still(NOOR, toward(NOOR, HERO_PLAN), LOOKS.noor, 'kneel') : still(NOOR, 2, LOOKS.noor, 'kneel', drilling(c.T, 0.15)),
          mate,
          eli.gait === 'walk' ? walking(eli, LOOKS.eli) : t < 2.6 ? still(ELI, up ? 6 : 7, LOOKS.eli) : still(ELI_PLAN, toward(ELI_PLAN, HERO_PLAN), LOOKS.eli),
          still(MS_K, toward(MS_K, HERO_PLAN), LOOKS.kowalski),
        ]);
      },
    },
    // B4a-d the plan, close up.
    ...plan,
    // B5a make a hole: a hard cut back to the pit. Noor gets up, steps to the cart's handle and takes it in both hands,
    // facing the way she'll push it, and calls ahead, and the pit makes a hole: the strategist steps back out of its
    // way, Eli steps out ahead of it to the front of the aisle, past its right end, and the teammate turns to Noor and
    // goes round into the next pit's corner. Everyone's there before the beat's time is up, so the robot stands whole,
    // its bumper clear, for as long as the words wait to be read. Nothing rolls while they're up, so the box never hides
    // the robot leaving: the page waits for A like every other page, and the A that closes it starts B5b (the beat's
    // own time is over long before), so no A is ever spent skipping the robot's roll.
    {
      dur: 2,
      say: { name: 'NOOR, 5026 OPERATOR', look: LOOKS.noor, at: 0.5, lines: SCRIPT.through },
      draw(g, t, c) {
        const step = along([NOOR, NOOR_PUSH], t - GET_UP - 0.2), eli = along([ELI_PLAN, ELI_GO], t - ELI_GO_AT);
        const out = along(MATE_OUT, t - MATE_GO), back = along([HERO_PLAN, HERO_ASIDE], t - 0.4);
        const noor = t < GET_UP ? still(NOOR, toward(NOOR, HERO_PLAN), LOOKS.noor, 'kneel')
          : rising(t - GET_UP) === 'lean' ? still(NOOR, toward(NOOR, HERO_PLAN), LOOKS.noor, 'lean')
            : step.gait === 'walk' ? walking(step, LOOKS.noor) : still(NOOR_PUSH, 1, LOOKS.noor, 'push');
        const mate = t < 0.5 ? still(MATE_UP, toward(MATE_UP, HERO_PLAN), LOOKS.teammate)
          : t < MATE_GO ? still(MATE_UP, toward(MATE_UP, NOOR), LOOKS.teammate)
            : out.gait === 'walk' ? walking(out, LOOKS.teammate) : still(MATE_ASIDE, 6, LOOKS.teammate);
        shoot(g, c.T, PIT, [
          ...others(c.T),
          back.gait === 'walk' ? walking(back, LOOKS.hero)
            : t < 0.4 ? still(HERO_PLAN, toward(HERO_PLAN, ELI_PLAN), LOOKS.hero) : still(HERO_ASIDE, 2, LOOKS.hero),
          noor,
          mate,
          t < ELI_GO_AT ? still(ELI_PLAN, toward(ELI_PLAN, HERO_PLAN), LOOKS.eli)
            : (eli.gait === 'walk' ? walking(eli, LOOKS.eli) : still(ELI_GO, 2, LOOKS.eli)),
          still(MS_K, toward(MS_K, HERO_PLAN), LOOKS.kowalski),
        ]);
      },
    },
    // B5b rolling out, with no words on the screen, and held against A: the robot eases off its spot, slants out into
    // the aisle and goes, Noor pushing and Eli leading. The board, folded against the table behind the robot, shows as
    // it goes; once Noor's by, the teammate bends over it, lifts it, and it stands on its legs on the empty spot. The
    // camera goes with the cart, never faster, to the end of the hall, where the robot passes the QUEUE sign and goes
    // out of the right of the screen through the way out; the beat ends as Noor follows it.
    {
      dur: ROLL_END,
      hold: ROLL_END,
      draw: rollOut,
    },
    // B6 pit duty: the camera comes back to our pit, no quicker than it went down the row; the strategist steps back to
    // the front of it as it finds her, and once it's settled she and the teammate turn to each other.
    {
      dur: 3.7,
      say: { name: TEAMMATE_NAME, look: LOOKS.teammate, at: BACK_PAN + 0.1, lines: SCRIPT.duty },
      draw(g, t, c) {
        const view = { ...PIT, x: Math.round(lerp(B5_END, PIT.x, glide(seg(t, 0, BACK_PAN)))) };
        const back = along([HERO_ASIDE, HERO], t - 1), turned = t >= BACK_PAN - 0.6;
        shoot(g, c.T, view, [
          ...others(c.T),
          back.gait === 'walk' ? walking(back, LOOKS.hero)
            : still(t < 1 ? HERO_ASIDE : HERO, turned ? toward(HERO, MATE_END) : 2, LOOKS.hero),
          still(MATE_END, turned ? toward(MATE_END, HERO) : 2, LOOKS.teammate),
          still(MS_K, t < 1.2 ? 2 : 7, LOOKS.kowalski),
        ], { pit5026: 'sign' });
      },
    },
    // B7 later: a fade to black on the two of them as B6 left them, and up again on the near end of the hall, the film
    // bars going. The safety advisor is back at her end of the aisle, the aisle's walkers on the clocks walking will
    // carry on from (walkers()), and the strategist comes in from off the left edge once it's hers (scene.js's enter).
    {
      dur: LATER,
      hold: LATER,
      draw(g, t, c) {
        if (t < (FADE[1] + FADE[2]) / 2) {
          shoot(g, c.T, PIT, [
            ...others(c.T),
            still(HERO, toward(HERO, MATE_END), LOOKS.hero),
            still(MATE_END, toward(MATE_END, HERO), LOOKS.teammate),
            still(MS_K, 7, LOOKS.kowalski),
          ], { pit5026: 'sign' });
          cover(seg(t, FADE[0], FADE[1]));
          return;
        }
        shoot(g, c.T, { ...ROW, ...END.view }, [...others(c.T), ...walkers(c.T, END.aisleT + t - LATER)], { pit5026: 'sign', bars: 1 - seg(t, ...BARS_OFF) });
        cover(1 - seg(t, FADE[2], FADE[3]));
      },
    },
  ];
}
