// The practice field's cut scene: about a minute in the school cafeteria after school, shot like the intro (eased pans and
// hard cuts, whole-number zooms) with stage.js's place card, film bars and four-step fades, and talk.js's dialog box.
//   0 sun        fade in on the sun low in the first window, behind the mullion and the trees, the clock reading 4:40
//                beside the place card
//   1 light      no cut: the camera slides down the light, past the windows, onto the sunlit patches on the carpet,
//                ending with the rocket's home face and the sunlit patch at its foot whole in the right of the frame
//   2 field      cut wide and pan from the doors to the whole half field, station wall to centre line: the drive team
//                at the homemade station, the robot waiting at the loading station with its light solid, the rocket,
//                the cargo ship; the mentor calls hatch cycles, level two, and then the field holds with nothing over it
//   3 ready      cut close on the drive coach and the driver at the controls, the robot beside them: drivers ready?
//   4 go         no cut: the operator calls ENABLING! and enables the robot (its light starts blinking), and the
//                mentor counts it down
//   5 cycle      cut wide on the whole run: hatch in, spin, run to the rocket, lift, place, lower, spin, the coach
//                calling it, the camera holding still
//   6 home       cut back to the station as the robot runs home to it, the coach cheering it in
//   7 time       cut close on the mentor in profile with her stopwatch, the scouting lead beside her: nine point two
//   8 hooray     cut close on the drive team, out from behind the wall in a row, arms up in a V, hopping
//   9 tables     cut to the other end of the room, by the side doors, panning slowly from their EXIT sign: the
//                custodian wants his tables back
//  10 her        cut to the hallway doors: the strategist runs in, the mentor calling the time over to her as she comes;
//                she stops for it, and once it's been read she runs on round the front of the field to her mark, with
//                no dialog box over her, Kai stepping over to his place in front of the carpet's tape to meet her. The
//                camera follows her the way it does when you walk, the film bars' height lower.
//  11 answer     no cut: the camera goes down a little, so her face clears the dialog box, and she answers in profile,
//                turned to the field and the mentor up it; then, as soon as her answer has been read, it comes back up
//                (as the robot puts a hatch on level three, at the auto pace), the film bars slide away, and the last
//                frame is a few pixels above the walkable view, which walking eases on from. A can't cut that last
//                slide short (the beat holds for its whole length), so the hand-over never jumps; only SKIP can.
// Every frame is a pure function of time: t, seconds into the beat, places the camera and the people (held still once a
// beat runs past its length waiting for its words to be read; in beats 10 and 11 also of when A read the call, ended
// beat 10 or read her answer), and the robot runs on its own clock, robotU. Words show
// in the dialog box, which covers the screen from row 90 down, so every shot keeps the faces that matter above it.
//
//   makeCutscene(world)                 the beats, for stage.js
//   zoomShot(g, x, y, zoom, draw1x)     a close-up: the world drawn 1:1 into a small canvas, then scaled up whole
//   HANDOFF.robotU, .late, .viewY,      the robot's clock in the last frame drawn, how far past its length the last beat
//          .hero, .kai(since)           had run by then (less than 0 if A cut it short), the camera's y, where she was
//                                       and where Kai is, to carry them all on without a jump
//
// world (the scene builds it): { draw(g, view, t, o), shot(g, x, y, zoom, t, o), looks }, where o says what differs
// from the walkable scene: robotU (the robot's clock; left out, it runs free), enabled (false before GO), blink (the
// clock its signal light blinks on, while the robot itself is held still), cast
// ({ id: { x, y, dir, gait, dist, lift } } overrides), hero ({ x, y, dir, gait, dist }: draw the strategist there) and
// door (0-1, the hallway doors open). looks: id -> walker look, for the phone.
// Anyone a shot would catch half of at its edges (a head over the bottom bar, legs under the top one) is stepped out of
// it with a cast override for that beat.

import { W, H, C, useContext, screen, clamp, lerp, seg, easeInOut, easeOut, easeIn } from '../pixel.js';
import { along, bars, cover, placeCard, SPEED } from '../stage.js';
import { HERO_NAME, TEAMMATE_NAME } from '../cast.js';
import { ROOM, DOORWAY, START, SPOTS } from './layout.js';
import { CYCLE, PLACE } from './robot.js';
import { CARD } from './words.js';

// The mentor's time for the cycle in beats 4 and 5, from leaving the station to coming back to it.
const TIMED = CYCLE.timed;
/** Beat 5's clock (the robot's, less 0.4) when the robot gets to the rocket (robot.js: its run ends at 4.0) and when it
 *  puts the hatch on level 2. */
const CYCLE_AT = { rocket: 4.0 - 0.4, placed: PLACE[2] - 0.4 };
/** When the operator enables the robot in beat 4: once she's called ENABLING!, so its light starts blinking after. */
const ENABLE_AT = 0.6;

// ---- Close-ups ----
// The walkers are drawn with drawImage, which pixel.js's camera can't scale, so a close-up draws the world at 1:1 into
// a canvas the size of the view (128 x 72 at zoom 2, and a pixel more each way) and blows that up by a whole number.
// The view's top left is floored to a world pixel, and the blown-up picture is drawn back by what's left over in whole
// screen pixels, so a slow pan glides a screen pixel at a time, as pixel.js's camera does in the intro, instead of
// hopping a whole world pixel. One canvas per zoom.
const buffers = new Map();
function bufferFor(zoom) {
  if (!buffers.has(zoom)) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(W / zoom) + 1;
    canvas.height = Math.ceil(H / zoom) + 1;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.imageSmoothingEnabled = false;
    buffers.set(zoom, { canvas, ctx });
  }
  return buffers.get(zoom);
}

/**
 * The world seen from (x, y), its top left in world pixels, blown up by a whole-number zoom: draw1x(ctx, view) draws
 * it at 1:1 for view = { x, y, w, h } into a canvas a zoom-th of the screen, which is then drawn onto g, scaled.
 */
export function zoomShot(g, x, y, zoom, draw1x) {
  const view = { x: Math.floor(x), y: Math.floor(y) };
  const dx = Math.round((x - view.x) * zoom), dy = Math.round((y - view.y) * zoom);
  const { canvas, ctx } = bufferFor(zoom);
  view.w = canvas.width;
  view.h = canvas.height;
  ctx.globalAlpha = 1;
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, view.w, view.h);
  draw1x(ctx, view);
  ctx.globalAlpha = 1;
  g.imageSmoothingEnabled = false;
  g.drawImage(canvas, -dx, -dy, view.w * zoom, view.h * zoom);
  useContext(g);
  screen();
}

// ---- Timing ----
const linesOf = (page) => (Array.isArray(page) ? page : page.lines);
/** How long an auto page stays up (stage.js): typed at 40 characters a second, then 1.2 s and 0.035 s a character. */
const pageTime = (page) => 1.2 + 0.06 * linesOf(page).join('').length;
/** When a beat's words are all read, if nobody hurries them. */
export const wordsEnd = (say) => (say.at ?? 0) + say.lines.reduce((n, page) => n + pageTime(page), 0);
/** How long a path takes at a gait, measured the way stage.js along() does (a pixel down is 1 / 0.8 of one across). */
const pathTime = (path, gait) =>
  path.slice(1).reduce((n, [x, y], i) => n + Math.hypot(x - path[i][0], (y - path[i][1]) / 0.8), 0) / SPEED[gait];
/** The walking camera (scene.js followView), so the last beat ends on exactly the view you walk off with. */
const follow = (x, y) => ({
  x: clamp(Math.round(x) - W / 2, 0, ROOM.w - W),
  y: clamp(Math.round(y) - 28 - H / 2, 0, Math.min(ROOM.h, Math.max(ROOM.shown, Math.round(y) + 12)) - H),
});
const ease = (t, t0, t1) => easeInOut(seg(t, t0, t1));

// ---- The slide down the light (beats 0 and 1) ----
// One move with no stop at the join: beat 0 drifts right, easing in as it fades in, and beat 1 carries on at the speed
// beat 0 ended at, sliding on and down and easing out at the rocket. Along the room, beat 1 is a cubic Hermite curve
// from where beat 0 ends to where it stops, setting off at beat 0's last speed (in pixels per beat) and stopping dead.
// The drift starts just right of the fire alarm by the doors, so it's never cut in half by the left edge.
const SLIDE = { x0: 68, x1: 76, x2: 200, d0: 4.8, d1: 5.0 };
/** Beat 0's drift, t seconds in. */
const driftX = (t) => lerp(SLIDE.x0, SLIDE.x1, easeIn(seg(t, 0, SLIDE.d0)));
/** Beat 1's slide along, t seconds in. */
function slideX(t) {
  const u = seg(t, 0, SLIDE.d1), m = ((3 * (SLIDE.x1 - SLIDE.x0)) / SLIDE.d0) * SLIDE.d1;
  return (2 * u ** 3 - 3 * u ** 2 + 1) * SLIDE.x1 + (u ** 3 - 2 * u ** 2 + u) * m + (3 * u ** 2 - 2 * u ** 3) * SLIDE.x2;
}

// ---- What's said ----
const MENTOR = 'MS. OKAFOR, MENTOR', DRIVER = 'JALEN, DRIVER', OPERATOR = 'MEI, OPERATOR', CUSTODIAN = 'MR. FLORES, CUSTODIAN';
// A page said by someone other than the beat's speaker carries `who`, so the phone shows them (makeCutscene voiced).
const SAY = {
  // While the camera pans across to the field, so it's gone by the time the whole field is in the shot.
  field: {
    name: MENTOR, at: 0.6, lines: [['HATCH CYCLES, LEVEL TWO! DRIVE TEAM,', 'SET UP AT THE STATION.']],
  },
  ready: {
    name: TEAMMATE_NAME, at: 0.3,
    lines: [['DRIVERS READY?'], { name: DRIVER, who: 'jalen', lines: ['READY.'] }],
  },
  // The operator enables the robot from the Driver Station laptop at the station. She calls it out as she does, before
  // it's live, so everyone near the field knows (ENABLE_AT); its light blinks from then on.
  go: {
    name: OPERATOR, at: 0,
    lines: [['ENABLING!'], { name: MENTOR, who: 'okafor', lines: ['THREE, TWO, ONE...', 'GO!'] }],
  },
  // In step with the robot: it drives at 0.8-3.6 s and lifts at 3.6-4.8, and the hatch goes on at 5.2, as 'place it'
  // finishes typing; it turns for home at 6.6-7.0. The run home is the next beat, a cut, so 'now home' can't come early
  // however fast the pages are turned; and the second page waits for the robot to get to the rocket, and 'place it'
  // for the hatch to go on, however fast they're turned (holdCycle).
  cycle: {
    name: TEAMMATE_NAME, at: 1.0,
    lines: [
      ['HATCH IN! GO, JALEN,', 'DOWN THE WALL!'],
      ['SQUARE UP... MEI, LEVEL TWO...', 'PLACE IT!'],
    ],
  },
  home: { name: TEAMMATE_NAME, at: 0.2, lines: [['YES! NOW HOME!']] },
  time: { name: MENTOR, at: 0.2, lines: [[`TIME! ${TIMED} SECONDS.`, 'BEST CYCLE ALL WEEK!']] },
  tables: { name: CUSTODIAN, at: 0.2, lines: [['ROBOT PEOPLE! TABLES BACK IN ROWS', 'BY SIX. I MEAN IT THIS TIME.']] },
  // As soon as she's through the doors, before the camera following her in is low enough to catch the top of Theo's
  // head, at his table at the front, over the bottom bar: the box covers that corner.
  her: {
    name: MENTOR, at: 0.8,
    lines: [["THERE'S OUR STRATEGIST! PUT THIS ON", `YOUR BOARD: ${TIMED} ON A LEVEL TWO HATCH.`]],
  },
  // From her mark, as the camera settles.
  answer: {
    name: HERO_NAME, tag: C.red1, at: 0.4,
    lines: [[`${TIMED}. GOT IT. NOW LET'S SEE HOW FAST`, 'LEVEL THREE IS.']],
  },
};
/** Every line said in the cut scene, by beat, for checking. */
export const CUT_LINES = SAY;

// ---- The strategist's way in (beats 10 and 11) ----
// Through the hallway doors and down the left of the room, passing Bea at the battery cart with a body's width of air
// between them and clear of the tool chest's corner, to the open floor by the drive team, where she stops for the
// mentor's call: far enough up the room that her face stays clear of the dialog box, and that the camera following her
// puts Theo, at his table at the front, wholly under the box's name tag. Once it's been read (it turns by itself at the
// auto pace; A reads it sooner, and she sets off as soon as it has been: runAt), she runs on, down past the cargo
// basket, wide of it, and round the front of the field
// to where you take over, with nothing over her: so far down the room, the dialog box would hide all of her but her
// head. If it's read before she's even got to her stop, she doesn't stop at all (WAY). There, in the next beat, she
// answers; standing there her face would be under the dialog box, so the camera goes down for it, the way it does when
// you talk to someone at the front of the room (scene.js talkY), and back up once she's answered, as the film bars
// slide away. She answers in profile, turned to the field and the mentor by the centre line up it to the right, her
// face and her board above the box. While the film bars are up the camera that follows her sits their height lower, so
// her feet and her shadow are on the floor above the bottom bar, and it ends a few pixels above the walkable view, so
// the level 3 hatch goes on whole below the top of the screen; walking eases the rest of the way (HANDOFF.viewY).
// An A that ends beat 10 before she's at her mark makes beat 11 carry on her run (and Kai's step over) from wherever
// beat 10 had got to, setting off at once if she hadn't yet (in the doorway if she hadn't come in): she never jumps.
// Beat 11's words and its camera wait for her to get to her mark (answerAt), so the box is never over her run, and the
// camera comes back up as soon as her answer has been read (backAt), so there's no still moment after it for a tap to
// fall into. A can't end beat 11 (its hold is its whole length), so the film bars always slide all the way off; if SKIP
// ends it, walking starts from wherever she was (HANDOFF.hero).
// The robot's clock is set so that, at the auto pace, the level 3 hatch goes on as the camera comes back up to it.
const IN = [[DOORWAY.x, DOORWAY.y], [42, 118], [80, 144]];
const ON = [[80, 144], [84, 182], [START.x, START.y]];
const WAY = [...IN, ...ON.slice(1)];
/** Beat 10: she comes in at IN_AT and is at her stop at IN_END. At the auto pace, she runs on at ON_AT, once the
 *  mentor's page has been typed and read; it takes her ON_T to get to her mark, or WAY_T from the doors without a stop. */
const IN_AT = 0.6, IN_END = IN_AT + pathTime(IN, 'run'), ON_T = pathTime(ON, 'run'), WAY_T = pathTime(WAY, 'run');
const ON_AT = SAY.her.at + pageTime(SAY.her.lines[0]) + 0.1;
/** When she's at her mark if she runs on at onAt (on beat 10's clock), and when Kai sets off to meet her there. */
const arrival = (onAt) => (onAt <= IN_END ? IN_AT + WAY_T : onAt + ON_T);
const kaiFrom = (onAt) => arrival(onAt) - 0.8;
const HER_DUR = arrival(ON_AT) + 0.2;
/** Beat 11, at the auto pace: the camera goes down at once and comes back up at BACK, when her answer has been read
 *  (sooner if A reads it sooner: backAt). */
const READ_ANSWER = SAY.answer.lines.reduce((n, page) => n + pageTime(page), 0);
const BACK = SAY.answer.at + READ_ANSWER + 0.1, ANSWER_DUR = BACK + 0.75;
/** The camera while she answers: low enough that her face clears the dialog box. */
const LOW = Math.min(ROOM.h - H, START.y - 112);
const PLACED = CYCLE.period + PLACE[3]; // the second cycle, level 3, puts its hatch on (robot.js)
/** The robot's clock at the start of beats 11 and 10. It runs straight on from one into the other, from wherever
 *  beat 10 ended. */
const ANSWER_U = PLACED - (BACK + 0.5), HER_U = ANSWER_U - HER_DUR;
/** The cut scene's last frame, for the walkable scene to carry on from without a jump: robotU, the robot's clock where
 *  it was in the last frame of the last beat (beats 10 and 11 can each be cut short by A, and the last can run past its
 *  length while its words are read), or where that beat ends if it was never drawn (SKIP from an earlier beat); late,
 *  by how much the last beat ran over its length at the auto pace (less than 0 if A cut it short), which is what
 *  stage.js counted it as; viewY, where the camera was, for walking to ease on from; hero, where she was ({ x, y, dir }),
 *  in case A ended the last beat while she was still running (null if it was never drawn). */
let lastT = null, lastView = null, lastHero = null, lastKai = null;
/** How far into beat 10 its last frame was (short of its length if A ended it early), and when its page was read; and
 *  when beat 11's page, her answer, was read (on beat 11's clock). */
let herEnd = null, readAt = null, answerReadAt = null;
export const HANDOFF = {
  get late() { return (lastT ?? ANSWER_DUR) - ANSWER_DUR; },
  get robotU() { return HER_U + (herEnd ?? HER_DUR) + (lastT ?? ANSWER_DUR); },
  get viewY() { return lastView ?? follow(START.x, START.y).y; },
  get hero() { return lastHero; },
  /** Kai, `since` seconds after the cut scene ended, if he was still stepping over to his place (null once he's there). */
  kai(since) {
    if (!lastKai) return null;
    const p = kaiAt(lastKai.h + since, lastKai.from);
    return p.gait === 'stand' && lastKai.h + since > lastKai.from ? null : p;
  },
};

/** Beat 10: she runs on once the page has been read, or at the auto pace's ON_AT if that's sooner. */
const runAt = () => (readAt == null ? ON_AT : Math.min(ON_AT, readAt + 0.1));
const herDur = () => arrival(runAt()) + 0.2;
/** Beat 11, carrying on from beat 10's last frame: hStart, beat 10's clock that beat 11 starts at (the doorway, if
 *  she hadn't come in yet); onAt, when she runs on (at once, if she hadn't yet); arrive, when she's at her mark, on beat
 *  11's clock (0 or less if she was already); kai, when Kai steps over (at once at the soonest, if he hadn't yet). */
function answerRun() {
  const h0 = herEnd ?? herDur(), hStart = Math.max(h0, IN_AT), onAt = Math.min(runAt(), hStart), kai = kaiFrom(runAt());
  return { hStart, onAt, arrive: arrival(onAt) - hStart, kai: h0 >= kai ? kai : Math.max(hStart, kaiFrom(onAt)) };
}
/** Beat 11: her answer starts once she's at her mark, and BACK comes with it: the camera comes back up and the film
 *  bars slide away a moment after her answer has been read, at the auto pace or as soon as A has read it. */
const answerAt = () => Math.max(SAY.answer.at, answerRun().arrive + 0.3);
const backAt = () => {
  const at0 = answerAt();
  return Math.max(at0 + 0.1, Math.min(at0 + READ_ANSWER, answerReadAt ?? Infinity) + 0.1);
};

// Kai's head would show over the bottom bar at the right edge of the shot of the doors, so he waits just beyond it and
// steps over to his place in front of the carpet's tape as she comes round the front.
const KAI = SPOTS.kai, KAI_IN = [[KAI.x + 18, KAI.y], [KAI.x, KAI.y]];
function kaiAt(t, from) {
  const p = along(KAI_IN, t - from, 'walk');
  return t > from && p.gait === 'stand' ? { ...p, dir: KAI.dir } : p;
}

/** Where she is at h on beat 10's clock if she runs on at onAt: in at the doors, stopped turned to the field (where
 *  the call comes from) and then on round the front, or all the way without a stop; at her mark, in profile to the
 *  field (START.dir). Null before she's through the doors. */
function heroPath(h, onAt) {
  if (h < IN_AT) return null;
  const then = (path, t, total, dir) => {
    const p = along(path, t, 'run');
    return t >= total ? { ...p, dir } : p;
  };
  if (onAt <= IN_END) return then(WAY, h - IN_AT, WAY_T, START.dir);
  if (h < onAt) return then(IN, h - IN_AT, IN_END - IN_AT, 2);
  return then(ON, h - onAt, ON_T, START.dir);
}
/** The hallway doors, flying open as she bursts through them: half way round in her first frame on the threshold, so
 *  the leaves frame her as she comes, and all the way a moment later; shut again once she's well clear. */
const doorAt = (h) => seg(h, IN_AT - 0.1, IN_AT + 0.2) - seg(h, 2.4, 2.7);
/** The follow camera, its film bars' height lower while k (0-1) of them is up, so her feet stay on the floor above the
 *  bottom bar. */
const followBarred = (x, y, k) => {
  const v = follow(x, y);
  return { x: v.x, y: Math.min(v.y + Math.round(4 * k), ROOM.h - H) };
};

// ---- The drive team's celebration (beat 8) ----
// They come out from behind the station wall into a loose row on the open floor, turned to the camera with both arms
// up in a V (walker.js armsUp), each hopping out of step with the others: up a pixel, two, one and down again, every
// 0.4 s. (Stacked along the wall, in profile, the raised arms would only read as stalks behind each other's heads.)
// The hands end up clear of the head on either side, so the row is spaced 20 pixels apart, enough that nobody's hands
// cross the next one's, and all four face you square on, where both arms show.
const HOORAY = {
  ines: { x: 74, y: 157, dir: 0, beat: 0.1 },
  teammate: { x: 94, y: 161, dir: 0, beat: 0 },
  jalen: { x: 114, y: 158, dir: 0, beat: 0.27 },
  mei: { x: 134, y: 162, dir: 0, beat: 0.17 },
};
const HOP = 0.4;
function hooray(t) {
  const cast = {};
  for (const [id, { beat, ...at }] of Object.entries(HOORAY)) {
    cast[id] = { ...at, gait: 'armsUp', lift: Math.round(2 * Math.sin(Math.PI * (((t + beat) / HOP) % 1))) };
  }
  return cast;
}

/** The cut scene's beats for stage.js, filmed in the scene's world. */
export function makeCutscene(world) {
  // A shot: the world from (x, y) at zoom 1 or 2, then the film bars. T, the cut scene's clock, runs the dust and lights.
  // At zoom 1 the view is a whole pixel; a close-up can sit between two (zoomShot).
  const shoot = (g, x, y, zoom, T, o) => {
    if (zoom === 1) {
      world.draw(g, { x: Math.round(x), y: Math.round(y) }, T, o);
      useContext(g);
      screen();
    } else world.shot(g, x, y, zoom, T, o);
  };
  const look = (id) => world.looks?.[id];
  /** A beat's words, with the phone showing whoever says each page. */
  const voiced = (say) => ({ ...say, lines: say.lines.map((page) => (page.who ? { ...page, look: look(page.who) } : page)) });
  // A beat's length is a number, or a function for the two whose length depends on how fast A was pressed (stage.js
  // reads it every frame; scene.js and stage.js add up the lengths once, before any of that, so they get the auto pace).
  const beat = (dur, draw, say) => {
    const len = typeof dur === 'function' ? dur : () => dur;
    return { get dur() { return len(); }, draw: (g, t, c) => draw(g, t, Math.min(t, len()), c), ...(say && { say: voiced(say) }) };
  };
  /** Whether the beat b is the one stage.js is running live (not frozen with ?at=). */
  const live = (b) => {
    const st = window.stage;
    return !!st && st.frozen == null && st.mode === 'cut' && st.scene?.cutscene?.[st.cut?.i] === b;
  };
  const still = { robotU: 0, enabled: false };
  // Bea stands at the end of the battery cart, just inside the left edge of the two shots of the sun; for those she's
  // stepped over toward the doors, out of the frame (she's back at the cart by the wide shot). The slide down the light
  // passes over the drive team low enough to catch the tops of their heads over the bottom bar, so the coach and the
  // driver wait a little further forward with the operator, and so does Kai.
  const sunny = { ...still, cast: { bea: { x: 44 }, teammate: { y: 160 }, jalen: { y: 160 }, kai: { y: 194 } } };
  // The top of the shot of the sun: the windows from their middle panes down, the sun in the lowest, the clock beside
  // the place card, and under them the robot's mast and carriage at the station and Ines holding out a hatch, from the
  // waist up, over the bottom bar.
  const SUN_Y = 24;
  // Kai, in front of the carpet, would be a head over the bottom bar of the wide shots, and the student who resets the
  // field, waiting just off its far end, half a person at their right edge: both step out of them.
  const wide = { kai: { x: 404 }, reset: { x: 404 } };
  // The wide shots of the field: from the drive team, whole, behind the station wall to the centre line's tape.
  const WIDE_X = 113;
  const run = (robotU) => ({ robotU, enabled: true, cast: wide });
  // The close shot of the station: the coach and the driver at the controls in the left of the frame, the robot at the
  // station to their right. Their faces sit clear of the dialog box; the human player, who'd be cut in half by the
  // bars, steps out of the shot.
  // The operator, who calls ENABLING! and enables the robot, is in the shot too, cheated a step over from her place
  // to the driver's left shoulder, level with him: her head and shoulders are above the dialog box there, and her head
  // covers the top of the hatch rack behind her, so none of it pokes out round her hair.
  const STATION = { x: 96, y: 70 }, station = { ines: { x: 84 }, mei: { x: 116, y: 139, dir: 2, gait: 'drive' } };
  /** Beat 5, live: the coach's second page waits for the robot to get to the rocket, and its last words, PLACE IT!,
   *  can't be typed out before the hatch goes on, by A or otherwise, so however fast the pages are turned the beat
   *  can't end before it's on. A press that would hurry them is undone, as in beat 11. t: seconds into the beat. */
  const holdCycle = (t) => {
    const st = window.stage, conv = st.cut.conv, t0 = st.cut.t0, now = t0 + t;
    if (!conv || st.cut.read || conv.page !== 1) return;
    if (conv.start < t0 + CYCLE_AT.rocket) {
      Object.assign(conv, { start: t0 + CYCLE_AT.rocket, full: false });
      return;
    }
    const [first, last] = linesOf(conv.pages[1]).map((line) => line.length);
    const upto = first + clamp(Math.floor((now - (t0 + CYCLE_AT.placed - last / 40)) * 40), 0, last);
    const shown = conv.full ? Infinity : Math.floor((now - conv.start) * 40);
    if (shown > upto && upto < first + last) Object.assign(conv, { start: now - (upto + 0.5) / 40, full: false });
  };

  const beats = [
    // 0 sun: the sun low in the first window, the light coming in under the sill, drifting right as it fades in. Low
    // enough that the robot at the station shows its carriage under the mast, and Ines her hatch, above the bottom bar.
    beat(SLIDE.d0, (g, t, tc, c) => {
      lastT = null; // the cut scene (re)starts
      lastView = null;
      lastHero = null;
      lastKai = null;
      herEnd = null;
      readAt = null;
      answerReadAt = null;
      shoot(g, driftX(tc), SUN_Y, 2, c.T, sunny);
      bars(easeOut(seg(t, 0, 0.8)));
      placeCard(t - 0.6, CARD.name, CARD.sub); // in at 0.8 (its first 0.2 s are off the screen), gone by 4.6
      cover(1 - seg(t, 0, 1.2));
    }),
    // 1 light: down the light onto the sunlit patches on the carpet, ending with the rocket's home face and the sunlit
    // patch at its foot whole in the right third of the frame. No cut, and no stop: it carries on at the drift's speed.
    beat(SLIDE.d1, (g, t, tc, c) => {
      shoot(g, slideX(tc), lerp(SUN_Y, 60, ease(tc, 0, SLIDE.d1)), 2, c.T, sunny);
      bars(1);
    }),
    // 2 field: panning from the doors to the whole half field, station wall to centre line, as the mentor calls from
    // off to the right; the pan ends on the whole field with nothing over it, and holds it a moment.
    beat(6.5, (g, t, tc, c) => {
      shoot(g, lerp(0, WIDE_X, ease(tc, 0, 6)), 40, 1, c.T, { ...still, cast: wide });
      bars(1);
    }, { ...SAY.field, auto: true, look: look('okafor') }),
    // 3 ready: the station, close. As long as its words take to read.
    beat(wordsEnd(SAY.ready), (g, t, tc, c) => {
      shoot(g, STATION.x, STATION.y, 2, c.T, { ...still, cast: station });
      bars(1);
    }, { ...SAY.ready, auto: true, look: look('teammate') }),
    // 4 go: the same shot. Once she's called it and enabled it, the robot's light blinks (on the cut scene's clock, as
    // the robot itself holds still until GO).
    beat(wordsEnd(SAY.go), (g, t, tc, c) => {
      shoot(g, STATION.x, STATION.y, 2, c.T, { robotU: 0, enabled: t >= ENABLE_AT, blink: c.T, cast: station });
      bars(1);
    }, { ...SAY.go, auto: true, look: look('mei') }),
    // 5 cycle: the whole run, station to cargo ship, the camera still. Hatch in, out to the rocket, place it, turn.
    beat(wordsEnd(SAY.cycle), (g, t, tc, c) => {
      if (live(beats[5])) holdCycle(t);
      shoot(g, WIDE_X, 20, 1, c.T, run(0.4 + t));
      bars(1);
    }, { ...SAY.cycle, auto: true, look: look('teammate') }),
    // 6 home: back to the station as the robot comes home, carrying on its clock from the end of the run at the pace
    // the words are read; it comes into the frame at 0.3 and is home at 1.8.
    beat(2.3, (g, t, tc, c) => {
      shoot(g, STATION.x, STATION.y, 2, c.T, { robotU: 8.2 + t, enabled: true, cast: station });
      bars(1);
    }, { ...SAY.home, auto: true, look: look('teammate') }),
    // 7 time: the mentor in profile, stopwatch in her hands, the scouting lead beside her with the tablet, a little behind
    // her spot so her face is in the shot, and clear of the backpack by the scouts' table. The robot waits at the
    // station, and the student resetting the field is at the rocket, out of the shot (he'd run through it with his head
    // under the top bar).
    beat(3.7, (g, t, tc, c) => {
      const cast = { noor: { x: 416, y: 128 }, reset: { x: 294, y: 110, dir: 3 } };
      shoot(g, 330, 70, 2, c.T, { robotU: Math.min(11.9, 10.5 + t), enabled: true, cast });
      bars(1);
    }, { ...SAY.time, auto: true, look: look('okafor') }),
    // 8 hooray: the drive team, arms up, the cargo basket at their feet and the station wall beside them. Bea, behind
    // them at the battery cart, steps back a little so her shoes don't peek out under the top bar.
    beat(2.5, (g, t, tc, c) => {
      shoot(g, 44, 96, 2, c.T, { robotU: Math.min(11.9, 13.8 + t), enabled: true, cast: { ...hooray(tc), bea: { y: 100 } } });
      bars(1);
    }),
    // 9 tables: the other end of the room, the folded tables, the shutter and the vending machines, in a slow pan
    // that lasts about as long as his words. The next cycle (level 3) starts off screen. It sets off from the end wall,
    // the EXIT sign over the side doors whole in the frame's right edge and above the dialog box, so it shows the way
    // out as he starts to talk, and leaves the sign behind before it stops; the scout at the left edge comes in whole
    // in its first second.
    beat(4.8, (g, t, tc, c) => {
      shoot(g, lerp(ROOM.w - W, 404, ease(tc, 0, 4.8)), 28, 1, c.T, { robotU: 12 + t, enabled: true });
      bars(1);
    }, { ...SAY.tables, auto: true, look: look('flores') }),
    // 10 her: the doors, her run in, the call, her run on once it's been read; the camera follows her as stage.js will,
    // the film bars' height lower. It lasts until she's at her mark, so it's shorter if A read the call sooner.
    beat(herDur, function her(g, t, tc, c) {
      if (herEnd != null && tc < herEnd) readAt = null; // beat 10 starts again
      herEnd = tc;
      if (readAt == null && live(beats[10]) && window.stage.cut.read) readAt = tc;
      const onAt = runAt(), hero = heroPath(tc, onAt), view = followBarred(hero?.x ?? DOORWAY.x, hero?.y ?? DOORWAY.y, 1);
      const cast = { kai: kaiAt(tc, kaiFrom(onAt)) };
      shoot(g, view.x, view.y, 1, c.T, { robotU: HER_U + tc, enabled: true, door: doorAt(tc), cast, ...(hero && { hero }) });
      bars(1);
    }, { ...SAY.her, auto: true, look: look('okafor') }),
    // 11 answer: her answer from her mark, the camera down for it and back up after, to a little above the walkable view.
    // The bars slide away at the end, as soon as her answer has been read. If beat 10 was cut short she runs the rest of
    // the way first, and the words and the camera wait for her.
    beat(() => backAt() + 0.75, (g, t, tc, c) => {
      if (lastT != null && t < lastT) answerReadAt = null; // beat 11 starts again
      lastT = t;
      if (answerReadAt == null && live(beats[11]) && window.stage.cut.read) answerReadAt = tc;
      const run = answerRun(), h = run.hStart + tc, at0 = answerAt(), back = backAt();
      const hero = heroPath(h, run.onAt), barK = 1 - seg(tc, back, back + 0.6);
      const view = followBarred(hero.x, hero.y, barK);
      const up = Math.round(6 * seg(tc, back, back + 0.5));
      view.y = Math.round(lerp(view.y - up, LOW, ease(tc, at0 - 0.4, at0 + 0.1) - ease(tc, back, back + 0.5)));
      lastView = view.y;
      lastHero = { x: hero.x, y: hero.y, dir: hero.dir };
      lastKai = { h, from: run.kai };
      const cast = { kai: kaiAt(h, run.kai) };
      // A brings a beat's words on straight away (stage.js), but not these while she's still on her way to her mark:
      // until then the press is undone, so the box is never over her run.
      const st = window.stage, conv = st?.cut?.conv;
      if (live(beats[11]) && tc < at0 && conv && conv.start < st.cut.t0 + at0) conv.start = st.cut.t0 + at0;
      shoot(g, view.x, view.y, 1, c.T, { robotU: HER_U + (herEnd ?? HER_DUR) + t, enabled: true, door: doorAt(h), hero, cast });
      bars(barK);
    }, { ...SAY.answer, auto: true, look: look('hero') }),
  ];
  // Her answer waits for her to be at her mark (stage.js reads say.at as the beat starts, when beat 10 has ended).
  Object.defineProperty(beats[11].say, 'at', { get: answerAt, enumerable: true });
  // And A doesn't end beat 11 (stage.js ignores it until a beat's hold has passed): once her answer is read the camera
  // rises and the film bars slide away by themselves, all the way, so the last frame is always the walking view. SKIP
  // still ends it, a deliberate cut.
  Object.defineProperty(beats[11], 'hold', { get: () => backAt() + 0.75, enumerable: true });
  return beats;
}
