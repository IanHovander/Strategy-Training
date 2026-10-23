// The arena's cut scene: 25 seconds, plus however long the words take to read. Saturday morning at the regional, a
// qualification match on the field. The camera opens on the red end and pans the length of the field to the blue end,
// where the strategist comes in from the pits.
//   B0 open          the red end fades in under the place card: the scoring table with Gus behind it, the reset cart,
//                    the red drive teams at their station, and past them the barrier with its gap and the EXIT sign,
//                    the way out she'll take later; the match is already on, the crowd in the stands
//   B1 down the field an eased pan from the red end to the middle of the field, past the red rocket and 4000's elevator
//                    on its hatch runs, to the cargo ship
//   B2 level 3       the pan holds on the cargo ship and the blue rocket as the blue elevator lifts a hatch panel to
//                    level 3, and the crowd gets to its feet; over the speakers, the announcer
//   B3 to the queue  the crowd settles as the pan carries on to the blue end: the defender, the arm robot at the depot,
//                    the blue HAB and station, and past them the queue, Priya with two robots on their carts
//   B4 the call      Priya turns to the queue and calls the next two matches up
//   B5 hand over     she turns back, the film bars go, and the strategist walks in from off the left edge (scene.enter)
//
// It's drawn the way every cut scene is (stage.js): the place card, film bars and fades are stage.js's, the camera moves
// are eased pans in whole pixels, and every frame is a pure function of time. The arena itself is the scene's own
// drawWorld (scene.js: field.js's field and bleachers.js's stands, the same picture walking draws), so the last frame is
// the first frame of walking, the view at the left end, with nobody but her coming into it.
//
// The field's clock: the robots and the crowd run on the arena's own time, not the beat's. A say beat waits to be read,
// its t running on past its dur, and A moves a beat on before its end; on the cut scene's clock (c.T, as if every beat
// took its dur) either would jump every robot on the field back or on as the next beat starts. So this file keeps the
// arena's time itself: spent[i] is how long beat i really ran (left at its dur for a beat that never ran: ?beat=N), and
// the arena's time is DAY plus every earlier beat's spent plus the beat's own time. A frozen ?at= frame never waits or
// moves on, so there it's exactly DAY + c.T. DAY puts the match where the blue elevator reaches level 3 as the pan holds
// on it. ahead() hands walking the difference between the arena's time and the page's on the latest frame, so the
// matches carry on from there as the bars go (and from wherever SKIP left them).
//
//   makeCutscene(drawWorld, { PEOPLE })  the beats, with ahead() on the list; drawWorld(g, camX, t, o) is scene.js's

import { W, C, lerp, seg } from '../pixel.js';
import { placeCard, bars, cover } from '../stage.js';
import { look, tones, skinBody, SKIN, HAIR } from '../cast.js';
import { WORLD_W, FIELD } from '../field.js';

// ---- The camera ----
// Where the pan starts, holds and ends: the red end (the right edge of the world on the right of the screen), the cargo
// ship in the middle of the screen, and the blue end (the left edge on the left). The view never moves up or down.
const RED_END = WORLD_W - W, MID = FIELD.mid - W / 2, BLUE_END = 0;
const PAN = 8; // seconds each half of the pan takes
/** A gentler ease than easeInOut for long pans, so the middle of the field doesn't rush past. */
const glide = (u) => u * u * (3 - 2 * u);
const pan = (from, to, t) => Math.round(lerp(from, to, glide(seg(t, 0, PAN))));

// ---- The field's clock ----
/**
 * The arena's time as the cut scene opens. The blue elevator's hatch runs (field.js) take fourteen seconds there and
 * back, every other one to level 3: it gets there 21 seconds into the arena's day, which with DAY at 8 is half a second
 * into B2, the pan holding on it.
 */
const DAY = 8;

// ---- The words ----
/** The announcer, over the speakers. Not on the screen, so the phone shows him. */
const ANNOUNCER = look('announcer', { ...skinBody('deep'), shirt: tones.black, print: C.yel1 }, 'curls', { ...SKIN.deep, ...HAIR.black });
const CALL = [
  ['A HATCH PANEL ON LEVEL 3 OF THE BLUE', 'ROCKET! LISTEN TO THIS CROWD!'],
  // 2019's rule: one rocket full, all six hatch panels and all six cargo, is a ranking point in a qualification match.
  ['FILL ONE ROCKET, HATCHES AND CARGO,', 'AND THAT IS A RANKING POINT!'],
];
/** Priya, calling into the queue: match 43's robots are there on their carts, and 5026 is in 44 (the pits called it). */
const QUEUE_CALL = [['MATCH 43, YOU ARE ON DECK!', 'MATCH 44, LINE UP BEHIND THEM, PLEASE!']];
/** How much of the crowd is up for the level 3 hatch: they get up as it goes on and sit as the pan moves on. */
const CHEER = 0.7;
/** Priya's turns: to the queue (down and right of her) to call it, and back to facing you, as walking has her. */
const TO_QUEUE = 1;

/** The beats of the cut scene, the arena drawn with drawWorld(g, camX, t, o) (scene.js). */
export function makeCutscene(drawWorld, { PEOPLE }) {
  const priya = PEOPLE.find((p) => p.id === 'priya');
  // T here is the arena's time (see the clock, below); c.T - DAY is how far into the cut scene it is, for the fade and
  // the place card, which run on across B0 and B1 so A moving B0 on doesn't snatch either away.
  const opening = (T) => {
    placeCard(T - DAY - 0.3, 'THE ARENA', 'SATURDAY 10:50 AM');
    cover(1 - seg(T - DAY, 0, 0.8));
  };
  const beats = [
    // B0 open: the red end fades in, the bars come in and the place card slides through.
    {
      dur: 4.5,
      draw(g, t, c) {
        drawWorld(g, RED_END, c.T);
        bars(seg(t, 0, 0.6));
        opening(c.T);
      },
    },
    // B1 down the field, to the cargo ship.
    {
      dur: PAN,
      draw(g, t, c) {
        drawWorld(g, pan(RED_END, MID, t), c.T);
        bars(1);
        opening(c.T);
      },
    },
    // B2 level 3: the pan holds, the hatch goes on, the crowd's up, and the announcer has it.
    {
      dur: 2.4,
      say: { name: 'ANNOUNCER', look: ANNOUNCER, at: 0.6, lines: CALL },
      draw(g, t, c) {
        drawWorld(g, MID, c.T, { cheer: CHEER * seg(t, 0.3, 1.1) });
        bars(1);
      },
    },
    // B3 to the queue: the crowd sits back down as the pan carries on to the blue end.
    {
      dur: PAN,
      draw(g, t, c) {
        drawWorld(g, pan(MID, BLUE_END, t), c.T, { cheer: CHEER * (1 - seg(t, 0.6, 2.4)) });
        bars(1);
      },
    },
    // B4 the call: Priya turns to the robots on their carts and calls the next two matches into the queue.
    {
      dur: 1.4,
      say: { name: priya.name, look: priya.look, at: 0.45, lines: QUEUE_CALL },
      draw(g, t, c) {
        drawWorld(g, BLUE_END, c.T, { turned: { priya: t < 0.15 ? 0 : TO_QUEUE } });
        bars(1);
      },
    },
    // B5 hand over: she turns back to you as the bars go, and the strategist walks in from the left (scene.enter).
    {
      dur: 0.9,
      draw(g, t, c) {
        drawWorld(g, BLUE_END, c.T, { turned: { priya: t < 0.2 ? TO_QUEUE : 0 } });
        bars(1 - seg(t, 0.2, 0.8));
      },
    },
  ];

  // ---- The clock ----
  // The arena's time runs on as the page's does, whatever the beats do (see the header): spent[i] is how long beat i
  // really ran this time through, now the beat on the latest frame, and day and page the arena's and the page's times
  // on that frame.
  const spent = beats.map((b) => b.dur);
  let now = -1, day = null, page = 0;
  const clocked = beats.map((b, i) => ({
    ...b,
    draw(g, t, c) {
      if (i !== now) {
        // A new beat: straight on from the one before, or (?beat=N, ?at=, the cut scene replayed) a fresh start.
        if (i !== now + 1) spent.forEach((_, j) => (spent[j] = beats[j].dur));
        now = i;
      }
      spent[i] = t;
      day = DAY + spent.slice(0, i).reduce((n, s) => n + s, 0) + t;
      page = performance.now() / 1000;
      b.draw(g, t, { ...c, T: day });
    },
  }));
  /** Seconds to add to the page's clock to carry on the arena's time from the latest frame (none if none was drawn). */
  clocked.ahead = () => (day == null ? 0 : day - page);
  return clocked;
}
