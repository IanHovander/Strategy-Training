// The practice field's cut scene: about a minute in the school cafeteria after school, shot like the intro (eased pans and
// hard cuts, whole-number zooms) with stage.js's place card, film bars and four-step fades, and talk.js's dialog box.
//   0 sun        fade in on the sun low in the first window, behind the mullion and the trees, the clock reading 4:40
//                beside the place card
//   1 light      no cut: the camera slides down the light, past the windows, onto the sunlit patches on the carpet
//                with the rocket's home face standing at the edge of the frame
//   2 field      cut wide and pan from the doors to the whole half field, station wall to centre line: the drive team
//                at the homemade station, the robot waiting at the loading station with its light solid, the rocket,
//                the cargo ship; the mentor calls hatch cycles, level two, and then the field holds with nothing over it
//   3 ready      cut close on the drive coach and the driver at the controls, the robot beside them: drivers ready?
//   4 go         no cut: the operator enables the robot (its light starts blinking) and the mentor counts it down
//   5 cycle      cut wide on the whole run: hatch in, spin, run to the rocket, lift, place, lower, spin, the coach
//                calling it, the camera holding still
//   6 home       cut back to the station as the robot runs home to it, the coach cheering it in
//   7 time       cut close on the mentor in profile with her stopwatch, the scouting lead beside her: nine point two
//   8 hooray     cut close on the drive team, out from behind the wall in a row, arms up in a V, hopping
//   9 tables     cut to the other end of the room, panning slowly: the custodian wants his tables back
//  10 her        cut to the hallway doors: the strategist runs in, the mentor calling the time over to her as she comes,
//                stops for it, and runs on to the edge of the field while it's still up, Kai stepping over to his place
//                in front of the carpet's tape to meet her. There she answers, the camera down a little so her face
//                clears the dialog box; then it comes back up as the robot puts a hatch on level three, the film bars
//                slide away, and the last frame is the walkable view, pixel for pixel. The camera follows her the way it
//                does when you walk.
// Every frame is a pure function of time: t, seconds into the beat, places the camera and the people (held still once a
// beat runs past its length waiting for its words to be read), and the robot runs on its own clock, robotU. Words show
// in the dialog box, which covers the screen from row 90 down, so every shot keeps the faces that matter above it.
//
//   makeCutscene(world)                 the beats, for stage.js
//   zoomShot(g, x, y, zoom, draw1x)     a close-up: the world drawn 1:1 into a small canvas, then scaled up whole
//   HANDOFF.robotU, .late, .viewY       the robot's clock in the last frame drawn, how far past its length the last beat
//                                       had run by then (less than 0 if A cut it short), and the camera's y, to carry
//                                       them all on without a jump
//
// world (the scene builds it): { draw(g, view, t, o), shot(g, x, y, zoom, t, o), looks }, where o says what differs
// from the walkable scene: robotU (the robot's clock; left out, it runs free), enabled (false before GO), blink (the
// clock its signal light blinks on, while the robot itself is held still), cast
// ({ id: { x, y, dir, gait, dist, lift } } overrides), hero ({ x, y, dir, gait, dist }: draw the strategist there) and
// door (0-1, the hallway doors open). looks: id -> walker look, for the phone.
// Anyone a shot would catch half of at its edges (a head over the bottom bar, legs under the top one) is stepped out of
// it with a cast override for that beat.

import { W, H, C, useContext, screen, clamp, lerp, seg, easeInOut, easeOut } from '../pixel.js';
import { along, bars, cover, placeCard, SPEED } from '../stage.js';
import { HERO_NAME, TEAMMATE_NAME } from '../cast.js';
import { ROOM, DOORWAY, START, SPOTS } from './layout.js';
import { CYCLE } from './robot.js';
import { CARD } from './words.js';

// The mentor's time for the cycle in beats 4 and 5, from leaving the station to coming back to it.
const TIMED = CYCLE.timed;

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
  y: clamp(Math.round(y) - 28 - H / 2, 0, Math.max(ROOM.shown, Math.round(y) + 4) - H),
});
const ease = (t, t0, t1) => easeInOut(seg(t, t0, t1));

// ---- What's said ----
const MENTOR = 'MS. OKAFOR, MENTOR', DRIVER = 'JALEN, DRIVER', OPERATOR = 'MEI, OPERATOR', CUSTODIAN = 'MR. FLORES, CUSTODIAN';
const SAY = {
  // While the camera pans across to the field, so it's gone by the time the whole field is in the shot.
  field: {
    name: MENTOR, at: 0.6, lines: [['HATCH CYCLES, LEVEL TWO! DRIVE TEAM,', 'SET UP AT THE STATION.']],
  },
  ready: {
    name: TEAMMATE_NAME, at: 0.3,
    lines: [['DRIVERS READY?'], { name: DRIVER, lines: ['READY.'] }],
  },
  // The robot is enabled from the Driver Station laptop at the station, by the operator; its light blinks from then on.
  go: {
    name: OPERATOR, at: 0,
    lines: [['ENABLED!'], { name: MENTOR, lines: ['THREE, TWO, ONE...', 'GO!'] }],
  },
  // In step with the robot: it drives at 0.8-3.6 s and lifts at 3.6-4.8, and the hatch goes on at 5.2, as 'place it'
  // finishes typing; it turns for home at 6.6-7.0. The run home is the next beat, a cut, so 'now home' can't come early
  // however fast the pages are turned.
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
  // As soon as she's through the doors.
  her: {
    name: MENTOR, at: 1.0,
    lines: [
      ["THERE'S OUR STRATEGIST! PUT THIS ON", `YOUR BOARD: ${TIMED} ON A LEVEL TWO HATCH.`],
      { name: HERO_NAME, tag: C.red1, lines: [`${TIMED}. GOT IT. NOW LET'S SEE HOW FAST`, 'LEVEL THREE IS.'] },
    ],
  },
};
/** Every line said in the cut scene, by beat, for checking. */
export const CUT_LINES = SAY;

// ---- The strategist's way in (beat 10) ----
// Through the hallway doors and down the left of the room, wide of Bea at the battery cart and clear of the tool
// chest's corner, to the open floor by the drive team, where she stops for the mentor's call (her face stays clear of
// the dialog box there). While the call is still up she runs on, down past the cargo basket, wide of it, and round the
// front of the field to where you take over, and gets there as her own answer comes up. Standing there her face would
// be under the dialog box, so the camera goes down for it, the way it does when you talk to someone at the front of the
// room (scene.js talkY), and back up once it's been said, as the film bars slide away: the last frame is the walkable
// view. Everything moving happens before the last page, so an A that ends the beat early only skips the bars sliding
// away and the camera's way back up, which walking finishes for it (HANDOFF.viewY). The robot's clock is set so the
// level 3 hatch goes on as the camera comes back up to it.
const IN = [[DOORWAY.x, DOORWAY.y], [48, 118], [80, 150]];
const ON = [[80, 150], [84, 182], [START.x, START.y]];
/** When her answer comes up at the auto pace: the mentor's page is typed and read. */
const ANSWER = SAY.her.at + pageTime(SAY.her.lines[0]);
const IN_AT = 0.6, THERE = ANSWER - 0.3, ON_AT = THERE - pathTime(ON, 'run');
const BACK = wordsEnd(SAY.her) + 0.1, HER_DUR = BACK + 0.75;
/** The camera while she answers: low enough that her face clears the dialog box. */
const LOW = Math.min(ROOM.h - H, START.y - 112);
const PLACED = 12 + 5.6; // the second cycle (level 3) puts its hatch on at phase 5.6 (robot.js)
const HER_U = PLACED - (BACK + 0.5);
/** The cut scene's last frame, for the walkable scene to carry on from without a jump: robotU, the robot's clock where
 *  it was in the last frame of the last beat (which can run past its length while its words are read, or be cut short
 *  by A), or where that beat ends if it was never drawn (SKIP from an earlier beat); late, by how much the last beat ran
 *  over; viewY, where the camera was, for walking to ease on from. */
let herLast = null, herView = null;
export const HANDOFF = {
  get late() { return (herLast ?? HER_DUR) - HER_DUR; },
  get robotU() { return HER_U + HER_DUR + this.late; },
  get viewY() { return herView ?? follow(START.x, START.y).y; },
};

// Kai's head would show over the bottom bar at the right edge of the shot of the doors, so he waits just beyond it and
// steps over to his place in front of the carpet's tape as she comes round the front.
const KAI = SPOTS.kai, KAI_IN = [[KAI.x + 18, KAI.y], [KAI.x, KAI.y]], KAI_AT = THERE - 0.8;
function kaiAt(t) {
  const p = along(KAI_IN, t - KAI_AT, 'walk');
  return t > KAI_AT && p.gait === 'stand' ? { ...p, dir: KAI.dir } : p;
}

function heroAt(t) {
  if (t < IN_AT) return null;
  if (t < ON_AT) {
    const p = along(IN, t - IN_AT, 'run');
    return p.gait === 'stand' ? { ...p, dir: 2 } : p; // she stops turned to the field, where the call comes from
  }
  const p = along(ON, t - ON_AT, 'run');
  return p.gait === 'stand' ? { ...p, dir: START.dir } : p;
}

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
  const beat = (dur, draw, say) => ({ dur, draw: (g, t, c) => draw(g, t, Math.min(t, dur), c), ...(say && { say }) });
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
  // Kai, in front of the carpet, would be a head over the bottom bar of the wide shots.
  const wide = { kai: { x: 404 } };
  const run = (robotU) => ({ robotU, enabled: true, cast: wide });
  // The close shot of the station: the coach and the driver at the controls in the left of the frame, the robot at the
  // station to their right. Their faces sit clear of the dialog box; the human player and the operator, who'd be cut in
  // half by the bars, step out of the shot.
  const STATION = { x: 96, y: 70 }, drivers = { ines: { x: 84 }, mei: { x: 84 } };

  return [
    // 0 sun: the sun low in the first window, the light coming in under the sill, drifting right as it fades in. Low
    // enough that the robot at the station shows its carriage under the mast, and Ines her hatch, above the bottom bar.
    beat(4.8, (g, t, tc, c) => {
      herLast = null; // the cut scene (re)starts
      herView = null;
      shoot(g, lerp(60, 76, ease(tc, 0, 4.8)), SUN_Y, 2, c.T, sunny);
      bars(easeOut(seg(t, 0, 0.8)));
      placeCard(t - 0.6, CARD.name, CARD.sub); // in at 0.8 (its first 0.2 s are off the screen), gone by 4.6
      cover(1 - seg(t, 0, 1.2));
    }),
    // 1 light: down the light onto the sunlit patches on the carpet, the rocket's home face at the right edge, the robot
    // at the station just out of the shot to the left. No cut.
    beat(5.0, (g, t, tc, c) => {
      const k = ease(tc, 0, 5);
      shoot(g, lerp(76, 188, k), lerp(SUN_Y, 60, k), 2, c.T, sunny);
      bars(1);
    }),
    // 2 field: panning from the doors to the whole half field, station wall to centre line, as the mentor calls from
    // off to the right; the pan ends on the whole field with nothing over it, and holds it a moment.
    beat(6.5, (g, t, tc, c) => {
      shoot(g, lerp(0, 120, ease(tc, 0, 6)), 40, 1, c.T, { ...still, cast: wide });
      bars(1);
    }, { ...SAY.field, auto: true, look: look('okafor') }),
    // 3 ready: the station, close. As long as its words take to read.
    beat(wordsEnd(SAY.ready), (g, t, tc, c) => {
      shoot(g, STATION.x, STATION.y, 2, c.T, { ...still, cast: drivers });
      bars(1);
    }, { ...SAY.ready, auto: true, look: look('teammate') }),
    // 4 go: the same shot. Enabled, the robot's light blinks (on the cut scene's clock, as the robot itself holds still
    // until GO).
    beat(wordsEnd(SAY.go), (g, t, tc, c) => {
      shoot(g, STATION.x, STATION.y, 2, c.T, { robotU: 0, enabled: true, blink: c.T, cast: drivers });
      bars(1);
    }, { ...SAY.go, auto: true, look: look('mei') }),
    // 5 cycle: the whole run, station to cargo ship, the camera still. Hatch in, out to the rocket, place it, turn.
    beat(wordsEnd(SAY.cycle), (g, t, tc, c) => {
      shoot(g, 122, 20, 1, c.T, run(0.4 + t));
      bars(1);
    }, { ...SAY.cycle, auto: true, look: look('teammate') }),
    // 6 home: back to the station as the robot comes home, carrying on its clock from the end of the run at the pace
    // the words are read; it comes into the frame at 0.3 and is home at 1.8.
    beat(2.3, (g, t, tc, c) => {
      shoot(g, STATION.x, STATION.y, 2, c.T, { robotU: 8.2 + t, enabled: true, cast: drivers });
      bars(1);
    }, { ...SAY.home, auto: true, look: look('teammate') }),
    // 7 time: the mentor in profile, stopwatch in her hands, the scouting lead beside her with the tablet, a little behind
    // her spot so her face is in the shot, and clear of the backpack by the scouts' table. The robot waits at the
    // station, and the student resetting the field is at the rocket, out of the shot (he'd run through it with his head
    // under the top bar).
    beat(3.7, (g, t, tc, c) => {
      const cast = { noor: { x: 406, y: 128 }, reset: { x: 294, y: 110, dir: 3 } };
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
    // that lasts about as long as his words. The next cycle (level 3) starts off screen.
    beat(4.8, (g, t, tc, c) => {
      shoot(g, lerp(424, 404, ease(tc, 0, 4.8)), 28, 1, c.T, { robotU: 12 + t, enabled: true });
      bars(1);
    }, { ...SAY.tables, auto: true, look: look('flores') }),
    // 10 her: the doors, her run in, the call, her run on; the camera follows her as stage.js will. The bars slide away
    // at the end, so the last frame is the walkable view.
    beat(HER_DUR, (g, t, tc, c) => {
      herLast = t;
      const hero = heroAt(tc), view = follow(hero?.x ?? DOORWAY.x, hero?.y ?? DOORWAY.y);
      view.y = Math.round(lerp(view.y, LOW, ease(tc, THERE, THERE + 0.5) - ease(tc, BACK, BACK + 0.5)));
      herView = view.y;
      const door = seg(tc, 0.2, 0.5) - seg(tc, 2.4, 2.7);
      shoot(g, view.x, view.y, 1, c.T, { robotU: HER_U + t, enabled: true, door, cast: { kai: kaiAt(tc) }, ...(hero && { hero }) });
      bars(1 - seg(tc, BACK, BACK + 0.6));
    }, { ...SAY.her, auto: true, look: look('okafor') }),
  ];
}
