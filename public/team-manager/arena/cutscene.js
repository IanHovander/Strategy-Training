// The arena's cut scene: 25 seconds, plus however long the words take to read. Saturday morning at the regional, match
// 42 on the field (schedule.js plays it). The camera opens on the red end and pans the length of the field to the blue
// end, where the strategist comes in from the pits.
//   B0 open          the red end fades in under the place card: the scoring table with Gus behind it and the score on
//                    its monitors, the reset cart, the red drive teams at their station, and past them the barrier with
//                    its gap and the EXIT sign, the way out she'll take later; the match is under way, the crowd in the
//                    stands
//   B1 down the field an eased pan from the red end most of the way along the field, past the red rocket, the robots at
//                    work and the cargo ship, to the blue rocket
//   B2 level 3       the pan holds on the blue rocket as a blue robot puts a hatch panel on its level 3, and the crowd
//                    gets to its feet; over the speakers, the announcer
//   B3 to the queue  the crowd settles as the pan carries on to the blue end: the blue HAB and station, and past them the
//                    queue, Priya with match 43's six robots on their carts
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
// arena's time itself: each beat starts it where the beat before left it, and it runs on with the beat's own time. Two
// beats bend that, so the level 3 hatch always goes on as the words call it, however the cut scene was hurried: B2
// always starts at HOLD_AT (or later, never earlier), half a second before the hatch goes on (schedule.js SEEN_AT), and
// if A cut B1 short the camera cuts to the hold anyway, so the robots jumping on there is hidden by the cut; and B1, a
// continuous pan, runs the arena's time from wherever B0 left it to exactly HOLD_AT at its end, a little faster if A
// moved B0 on early, so nothing jumps on the way. A frozen ?at= frame, ?beat=N or a replay starts a beat fresh, at
// DAY + c.T. The place card and the opening fade run on the cut scene's own time, how long it's really been going
// (E, below), so A moving B0 on doesn't snatch either away. ahead() hands walking the difference between the arena's
// time and the page's on the latest frame, so the matches carry on from there as the bars go (and from wherever SKIP
// left them).
//
//   makeCutscene(drawWorld, { PEOPLE })  the beats, with ahead() on the list; drawWorld(g, camX, t, o) is scene.js's

import { W, C, lerp, seg } from '../pixel.js';
import { placeCard, bars, cover } from '../stage.js';
import { look, tones, skinBody, SKIN, HAIR } from '../cast.js';
import { WORLD_W, FIELD } from '../field.js';
import { SEEN_AT, highlight } from './schedule.js';

// ---- The camera ----
// Where the pan starts, holds and ends: the red end (the right edge of the world on the right of the screen); the blue
// rocket in the middle, its elevator and the defender in front of it on the left, the cargo ship filling the right
// half; and the blue end (the left edge on the left). The view never moves up or down.
const RED_END = WORLD_W - W, HOLD = FIELD.x0 + 24, BLUE_END = 0;
// Seconds each half of the pan takes: the first is the longer way, so both go at much the same pace.
const PAN = [9, 7];
/** A gentler ease than easeInOut for long pans, so the middle of the field doesn't rush past. */
const glide = (u) => u * u * (3 - 2 * u);
const pan = (from, to, t, dur) => Math.round(lerp(from, to, glide(seg(t, 0, dur))));
/**
 * Seconds into each half of the pan before A can hurry it on (a beat's hold, stage.js). In play.html a tap anywhere is
 * A, so without these one stray tap, or one tap too many after the announcer's words, would cut straight past the pan
 * the scene is for; this way the camera has visibly set off down the field first. SKIP and Esc still end it at once.
 */
const HURRY = [4, 3];

// ---- The field's clock ----
/** The beats that bend the clock (see the header): the pan down the field, and the hold on the level 3 hatch. */
const DOWN = 1, LEVEL3 = 2;
/** Seconds into B2 that the hatch goes on: the pan has held a moment by then. */
const HATCH_IN = 0.5;

// ---- The words ----
/** The announcer, over the speakers. Not on the screen, so the phone shows him. */
const ANNOUNCER = look('announcer', { ...skinBody('deep'), shirt: tones.black, print: C.yel1 }, 'curls', { ...SKIN.deep, ...HAIR.black });
/**
 * The announcer's call, read as B2 starts: the hatch match 42 has on the blue rocket (schedule.js highlight), level 3
 * unless the simulation found none (then whichever level it has; with none at all, the play in general).
 */
const callOf = (level) => [
  level ? [`A HATCH PANEL ON LEVEL ${level} OF THE BLUE`, 'ROCKET! LISTEN TO THIS CROWD!'] : ['WHAT A CYCLE AT THE BLUE ROCKET!', 'LISTEN TO THIS CROWD!'],
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
  // T here is the arena's time and E how long the cut scene has really been going (see the clock, below): the fade and
  // the place card run on E across B0 and B1.
  const opening = (E) => {
    placeCard(E - 0.3, 'THE ARENA', 'SATURDAY 10:50 AM');
    cover(1 - seg(E, 0, 0.8));
  };
  const beats = [
    // B0 open: the red end fades in, the bars come in and the place card slides through.
    {
      dur: 4.5,
      draw(g, t, c) {
        drawWorld(g, RED_END, c.T);
        bars(seg(t, 0, 0.6));
        opening(c.E);
      },
    },
    // B1 down the field, to the cargo ship. A can't cut the pan short until it's well under way (HURRY).
    {
      dur: PAN[0],
      hold: HURRY[0],
      draw(g, t, c) {
        drawWorld(g, pan(RED_END, HOLD, t, PAN[0]), c.T);
        bars(1);
        opening(c.E);
      },
    },
    // B2 level 3: the pan holds, the hatch goes on, the crowd's up, and the announcer has it.
    {
      dur: 2.4,
      say: { name: 'ANNOUNCER', look: ANNOUNCER, at: 0.6, get lines() { return callOf(highlight().level); } },
      draw(g, t, c) {
        drawWorld(g, HOLD, c.T, { cheer: CHEER * seg(t, 0.3, 1.1) });
        bars(1);
      },
    },
    // B3 to the queue: the crowd sits back down as the pan carries on to the blue end.
    {
      dur: PAN[1],
      hold: HURRY[1],
      draw(g, t, c) {
        drawWorld(g, pan(HOLD, BLUE_END, t, PAN[1]), c.T, { cheer: CHEER * (1 - seg(t, 0.6, 2.4)) });
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
    // B5 hand over: she turns back to you as the bars go, and the strategist walks in from the left (scene.enter). A
    // waits for the bars to go, so they always slide off rather than vanish.
    {
      dur: 0.9,
      hold: 0.9,
      draw(g, t, c) {
        drawWorld(g, BLUE_END, c.T, { turned: { priya: t < 0.2 ? TO_QUEUE : 0 } });
        bars(1 - seg(t, 0.2, 0.8));
      },
    },
  ];

  // ---- The clock ----
  // The arena's time runs on as the page's does, whatever the beats do (see the header): now is the beat on the latest
  // frame, begin and since the arena's time and the cut scene's own as it started, and day, elapsed and page the arena's,
  // the cut scene's and the page's times on that frame.
  const offsets = beats.map((_, i) => beats.slice(0, i).reduce((n, b) => n + b.dur, 0));
  // The arena's time as the cut scene opens: so that, with every beat taking its dur, the hatch goes on HATCH_IN into B2.
  const DAY = SEEN_AT - HATCH_IN - offsets[LEVEL3];
  const HOLD_AT = DAY + offsets[LEVEL3];
  let now = -1, begin = DAY, since = 0, day = null, elapsed = 0, page = 0;
  const clocked = beats.map((b, i) => ({
    ...b,
    draw(g, t, c) {
      if (i !== now) {
        // A new beat: straight on from the one before, or (?beat=N, ?at=, the cut scene replayed) a fresh start.
        const on = i === now + 1 && day != null;
        begin = on ? day : DAY + offsets[i];
        since = on ? elapsed : offsets[i];
        if (i === LEVEL3) begin = Math.max(HOLD_AT, begin);
        now = i;
      }
      // Down the field: from wherever B0 left the arena to HOLD_AT as the pan arrives, then on as usual.
      day = i === DOWN
        ? (t < PAN[0] ? begin + ((HOLD_AT - begin) * t) / PAN[0] : HOLD_AT + t - PAN[0])
        : begin + t;
      elapsed = since + t;
      page = performance.now() / 1000;
      b.draw(g, t, { ...c, T: day, E: elapsed });
    },
  }));
  /** Seconds to add to the page's clock to carry on the arena's time from the latest frame (none if none was drawn). */
  clocked.ahead = () => (day == null ? 0 : day - page);
  return clocked;
}
