// The cold open of Blue Banner: the first minute of the game, cut shot by shot to the design's list (docs/blue-banner-
// design.md, section 5, "Building the opening"). Saturday, 12:38 PM, alliance selection, and 5026 is seed 4: an alliance
// captain, with a pick to make and nobody to make it. It opens in the dark with the crowd's noise rising (a line of
// sound across the black that grows from a murmur to a roar), then her phone, full screen, in her hand: the senior
// strategist's typing dots, and "SICK. CAN'T COME." and "YOU'VE GOT THIS." landing one at a time with a buzz. A card,
// ALLIANCE SELECTION, SATURDAY 12:38 PM, its minute ticking over from the phone's 12:37. Then the arena, wide: the stands
// full over the eight captains at their signs and the reps waiting in front of the field, and MC Robin skating in
// along the front of the line to the mic, landing a spin; close on her, "WELCOME TO ALLIANCE SELECTION!"
// Then close on the co-captain, Riley, beside her at sign 4 with Norbert hugged to their chest: a silent beat, Riley
// turning to her, held so A can't skip it. "YOU'RE UP. THE LIST IS YOURS." Riley holds Norbert out: "AND TAKE HIM. HE'S
// BEEN TO EVERY EVENT SINCE 2009." A cutaway to the hands at twice the size (handoff.js): Norbert passed across from the
// co-captain's red sleeves to her, his 26 ear glinting once. From then on he's in the top left corner with his voltage
// (norbert-held.js), and she holds him. Close on her, Norbert in her arms: "...OKAY." And a hard cut to the pick: the
// 45-second clock slams in over the place where the scouting dashboard will go (pick.js), and the scene hands over.
//
// It's built like the intro and alliance selection's cut scene (stage.js): hard cuts between shots, an eased pan in
// the wide shot, whole-number 2x close-ups for the people talking (a 1x view drawn into a 256x144 canvas of its own,
// a 128x72 window of it copied up crisp), film bars throughout (the pick, a screen of the game's own, has none), and
// every frame a pure function of time. The arena is alliance selection's own (its set, its reps, MC Robin and her
// skating, its layout, its lights), with the line already standing: seeds 1 to 8 at their signs along the arc, Riley
// at sign 4 (capSpot(3)) and her a step to Riley's right, between the sign and the mic, a little nearer you, so the
// two of them can turn to each other and still be seen. The house lights are down and every captain stands in their
// sign's spotlight; close on Robin, and on the two of them, everyone else's light goes down to a glimmer (lightWorld). While words are up, the dialog box covers the bottom of the screen, so every shot with
// words keeps the faces in its top 88 rows.
//
//   makeCutscene()   the beats, in stage.js's form ({ dur, draw(g, t, c), say, hold }), with b.name, b.at (when each
//                    starts, for ?at=), and beats.total and beats.autoTotal (the length with words read at the pace
//                    stage.js turns them by itself)

import { W, H, C, useContext, camera, screen, fill, text, measure, clamp, lerp, seg, easeOut, easeInOut, rnd } from '../pixel.js';
import { bars, along, drawWithShadow } from '../stage.js';
import { HERO_LOOK } from '../walker.js';
import { HERO_NAME } from '../cast.js';
import { makeSetLayers, drawSet } from '../alliance-selection/set.js';
import { lookOf } from '../alliance-selection/people.js';
import { MC_LOOK, drawSkater } from '../alliance-selection/mc.js';
import { light, pools, micSpot, followSpot, house } from '../alliance-selection/light.js';
import {
  WORLD, capSpot, MC_HOME, waitSlot, PRIYA_AT, SAM_FAR, REF_AT, RANKED, MC_NAME, SKATE_SPEED,
} from '../alliance-selection/layout.js';
import { COCAPTAIN_LOOK, COCAPTAIN_NAME } from './cocaptain.js';
import { drawHeldNorbert, heldAt, heldShows, drawHud } from './norbert-held.js';
import { drawPhone } from './phone.js';
import { drawHandoff, HANDOFF } from './handoff.js';
import { drawPick, PICK_CLOCK } from './pick.js';

// ---- Who's where ----
/** The eight captains by seed, left to right along the line; 5026 is the fourth (Riley stands at its sign). */
export const SEEDS = ['4000', '2468', '3000', '5026', '7777', '8086', '5940', '9152'];
const OURS = SEEDS.indexOf('5026');
/**
 * Riley at sign 4, and her a step to Riley's right and a little nearer you, short of the mic stand (MIC.x 391), both
 * in sign 4's spotlight.
 */
export const RILEY_AT = capSpot(OURS);
export const HER_AT = { x: RILEY_AT.x + 16, y: RILEY_AT.y + 3 };
/**
 * Everyone else waits in front of the field, in alliance selection's waiting places (its slot 0 was hers), in its
 * knots, facing as they face there.
 */
const WAITING = RANKED.map((r) => r.num).filter((num) => !SEEDS.includes(num));
const HOME = { x: MC_HOME.x, y: MC_HOME.y };

const still = (x, y, dir = 0, gait = 'stand') => ({ x, y, dir, gait, dist: 0 });
/** Everyone in the arena who doesn't move in the cut scene. */
const CROWD = [
  ...SEEDS.map((num, i) => (i === OURS ? null : { ...still(capSpot(i).x, capSpot(i).y), look: lookOf(num) })).filter(Boolean),
  ...WAITING.map((num, n) => {
    const s = waitSlot(n + 1);
    return { ...still(s.x, s.y, s.dir), look: lookOf(num) };
  }),
  { ...still(PRIYA_AT.x, PRIYA_AT.y, PRIYA_AT.dir), look: lookOf('priya') },
  // Sam keeps the gate from left of everyone (SAM_FAR): by the gate, his head would be at Riley's knees in the close-ups.
  { ...still(SAM_FAR.x, SAM_FAR.y, SAM_FAR.dir), look: lookOf('sam') },
  { ...still(REF_AT.x, REF_AT.y, REF_AT.dir), look: lookOf('ref') },
];
/** The audience display (off past the red end): the eight captains, nobody picked yet. */
const BOARD = { rows: SEEDS.map((num) => [num, '', '']), hot: null, clock: null, backups: null };

/**
 * The arena for a frame: the set, everyone standing, Robin, Riley and her; whoever holds Norbert has him drawn on
 * them (holds: true), sorted in just in front of them.
 */
function drawWorld(g, view, t, { riley, her, mc, cheer }) {
  const people = CROWD.map((p) => ({ y: p.y, draw: () => drawWithShadow(g, view, p) }));
  for (const p of [{ ...riley, look: COCAPTAIN_LOOK }, { ...her, look: HERO_LOOK }]) {
    people.push({ y: p.y, draw: () => drawWithShadow(g, view, p) });
    if (p.holds && heldShows(p.dir)) {
      const at = heldAt(p);
      people.push({ y: p.y + 0.1, draw: () => drawHeldNorbert(at.x, at.y) });
    }
  }
  people.push({ y: mc.y, draw: () => drawSkater(g, view, { ...mc, look: MC_LOOK }) });
  drawSet(g, view, t, { people, cheer, board: BOARD, exitSign: false });
}

/**
 * The arena's lights (alliance selection's light.js), the house down: every captain in their sign's spotlight, Riley
 * and her in sign 4's with Norbert, the mic's, and a follow spot on Robin. Close on someone (hush), the rest go down to
 * a glimmer: on Robin ('mic'), the mic's spotlight and hers stay up; on the two of them ('pair'), sign 4's. Everyone
 * in the frame goes to the lights as drawWorld draws them, Norbert with whoever holds him.
 */
function lightWorld(g, view, t, { riley, her, mc, hush }) {
  const people = [...CROWD, { ...mc, look: MC_LOOK, skater: true }];
  for (const p of [{ ...riley, look: COCAPTAIN_LOOK }, { ...her, look: HERO_LOOK }]) {
    people.push(p);
    if (p.holds && heldShows(p.dir)) {
      const at = heldAt(p);
      people.push({ x: p.x, y: p.y, draw: (lg, v) => {
        const prev = useContext(lg);
        camera(v.x, v.y, 1);
        drawHeldNorbert(at.x, at.y);
        screen();
        useContext(prev);
      } });
    }
  }
  const pair = hush === 'mic' ? 0.25 : 1, mic = hush === 'pair' ? 0.25 : 1, line = hush ? 0.25 : 1;
  light(g, view, t, house([...pools((i) => (i === OURS ? pair : line)), micSpot(mic), followSpot(mc, mic)]), people);
}

// ---- The camera ----
const MAX = { x: WORLD.w - W, y: WORLD.h - H };
const view = (x, y) => ({ x: Math.round(clamp(x, 0, MAX.x)), y: Math.round(clamp(y, -12, MAX.y)) });
let lens = null;
/**
 * A shot: { view } at 1x, or { focus } at 2x, a 128x72 window centred on the world point focus (the 1x view round it
 * kept inside the world, the window inside that view), copied crisp at whole pixels, as alliance selection's are.
 */
function shoot(g, shot, T, frame) {
  if (!shot.focus) {
    drawWorld(g, shot.view, T, frame);
    lightWorld(g, shot.view, T, frame);
    return;
  }
  lens ??= Object.assign(document.createElement('canvas'), { width: W, height: H });
  const lg = lens.getContext('2d');
  const v = view(shot.focus.x - W / 2, shot.focus.y - H / 2);
  lg.imageSmoothingEnabled = false;
  lg.fillStyle = C.ink;
  lg.fillRect(0, 0, W, H);
  drawWorld(lg, v, T, frame);
  lightWorld(lg, v, T, frame);
  const sx = clamp(Math.round(shot.focus.x - W / 4 - v.x), 0, W / 2), sy = clamp(Math.round(shot.focus.y - H / 4 - v.y), 0, H / 2);
  g.imageSmoothingEnabled = false;
  g.drawImage(lens, sx, sy, W / 2, H / 2, 0, 0, W, H);
}
const at1x = (v) => ({ view: v });
const closeUp = (x, y) => ({ focus: { x, y } });

/**
 * The wide shot of the arena: the stands' front rows over the arc, signs 1 to 5 in their spotlights, Riley and her at
 * 4, then along to 3 to 7 as Robin comes.
 */
const WIDE_FROM = view(196, 0), WIDE_TO = view(282, 0);
/** Close on Robin at the mic, a little left of the middle, her head high in the frame. */
const ROBIN_SHOT = closeUp(HOME.x + 10, 99);
/**
 * Close on the two of them at sign 4: Riley left of the middle, her right of it, both faces in the top half (row 32 or
 * so), clear of the dialog box, and Norbert in the arms between, his feet on the box's top edge.
 */
const PAIR_SHOT = closeUp(RILEY_AT.x + 2, 94);
/** Close on her, Norbert in her arms, Riley at the left edge. */
const HER_SHOT = closeUp(HER_AT.x + 2, 92);

// ---- Moving people ----
/** Seconds a turn takes, a direction at a time. */
const TURN = 0.08;
/** Turning on the spot from one direction to another the short way, a step every TURN seconds, s seconds into it. */
function turn(from, to, s) {
  const d = ((to - from + 12) % 8) - 4;
  const n = Math.min(Math.abs(d), Math.max(0, Math.floor(s / TURN)));
  return (((from + Math.sign(d) * n) % 8) + 8) % 8;
}
/** A spin that lands facing `to`, clockwise `turns` times round, slowing into the end; u from 0 to 1. */
function spin(from, to, u, turns = 2) {
  const k = 1 - (1 - clamp(u, 0, 1)) ** 2, steps = turns * 8 + ((to - from + 8) % 8);
  return (from + Math.floor(k * steps)) % 8;
}
/**
 * Robin's way in: from past the right of the shot, along the front of the arc (in front of captains 5 to 8, as near the
 * near wall as anyone goes at its end), home.
 */
const ENTRY = [[592, 139], [540, 138], [470, 133], [HOME.x + 4, 131], [HOME.x, HOME.y]];
const ENTRY_TIME = along(ENTRY, 1e9, 'walk', 1).dist / SKATE_SPEED;

// ---- The words ----
// Short lines and real pauses (the design's pacing notes): one line a page where it can be, two lines of at most 38
// characters where it can't (talk.js).
const pageChars = (page) => page.join('').length;
/** How long stage.js takes over a page when the pages turn by themselves: typing at 40 a second, then a pause. */
const pageTime = (page) => pageChars(page) / 40 + 1.2 + pageChars(page) * 0.035;
const says = (name, look, lines, at = 0, extra = {}) => ({ name, look, lines, at, auto: true, ...extra });
const robinSays = (lines, at) => says(MC_NAME, MC_LOOK, lines, at, { faceGait: 'emcee' });
const rileySays = (lines, at) => says(COCAPTAIN_NAME, COCAPTAIN_LOOK, lines, at, { tag: C.red0 });
const herSays = (lines, at) => says(HERO_NAME, HERO_LOOK, lines, at, { tag: C.red1 });

// ---- Shots of nothing but the screen ----
/** The black before anything: the crowd's noise as a line of sound across the dark, from a murmur to a roar. */
function drawNoise(t, dur) {
  screen();
  fill(0, 0, W, H, C.ink);
  const k = seg(t, 0, dur);
  const amp = 1 + k * k * 18, frame = Math.floor(t * 20);
  let last = 72;
  for (let x = 24; x < W - 24; x += 2) {
    // Two rough waves and grain, re-rolled twenty times a second; the edges taper off.
    const edge = Math.min(1, (x - 24) / 40, (W - 24 - x) / 40);
    const n = (rnd(x * 0.37 + frame * 13.1) * 2 - 1) * 0.6 + Math.sin(x * 0.21 + t * 9) * 0.4;
    const y = Math.round(72 + n * amp * edge);
    const top = Math.min(last, y), h = Math.abs(last - y) + 1;
    fill(x, top, 2, h, k > 0.6 ? C.steel3 : C.steel2);
    last = y;
  }
  // Specks of phone screens and camera flashes up in the dark stands, more as it rises.
  const specks = Math.floor(k * 22);
  for (let i = 0; i < specks; i++) {
    if (rnd(i * 7.7 + Math.floor(t * 6)) < 0.4) continue;
    fill(Math.floor(rnd(i * 3.3) * W), 16 + Math.floor(rnd(i * 5.9) * 34), 1, 1, i % 4 ? C.steel2 : C.white);
  }
}
/** The card: ALLIANCE SELECTION, and the day and time, the minute ticking over from the phone's 12:37 to 12:38. */
function drawCard(t) {
  screen();
  fill(0, 0, W, H, C.ink);
  const name = 'ALLIANCE SELECTION', w = measure(name, { scale: 2 }) + 20, h = 44;
  const x = Math.round((W - w) / 2), y = 48;
  // In from a little below with a quick ease, then still.
  const dy = Math.round((1 - easeOut(seg(t, 0, 0.25))) * 6);
  fill(x, y + dy, w, h, C.ink);
  fill(x + 1, y + 1 + dy, w - 2, h - 2, C.blue1);
  fill(x + 1, y + 1 + dy, w - 2, 1, C.blue2);
  text(name, W / 2, y + 7 + dy, { scale: 2, align: 'center', color: C.white });
  const ticked = t >= 0.55;
  const sub = `SATURDAY 12:3${ticked ? 8 : 7} PM`;
  text(sub, W / 2, y + 28 + dy, { align: 'center', color: C.yel1 });
  // The new minute flashes white as it ticks.
  if (ticked && t < 0.75) {
    const sx = W / 2 - Math.floor(measure(sub) / 2) + measure('SATURDAY 12:3') + 1;
    text('8', sx, y + 28 + dy, { color: C.white });
  }
}

/**
 * The beats (stage.js): black, phone, card, arena, welcome, cocaptain, yourList, takeHim, handoff, okay, pick.
 */
export function makeCutscene() {
  makeSetLayers();
  const beats = [];
  /**
   * One beat in the arena: who(t) says where Riley, her and Robin are and what they're doing ({ riley, her, mc }),
   * shot(t) the camera, cheer(t) the stands; on top go the film bars, and the corner once Norbert is hers (hud: true;
   * hudIn: it slides down into place as the beat opens).
   */
  function arena(o) {
    const b = {
      name: o.name, dur: o.dur,
      draw(g, t, c) {
        shoot(g, o.shot(t), c.T, { ...o.who(t), cheer: o.cheer?.(t), hush: o.hush });
        useContext(g);
        screen();
        g.globalAlpha = 1;
        bars(1);
        if (o.hud) drawHud({ dy: o.hudIn ? Math.round(-24 * (1 - easeOut(seg(t, 0.15, 0.45)))) : 0 });
      },
    };
    if (o.say) b.say = o.say;
    if (o.hold) b.hold = o.hold;
    beats.push(b);
    return b;
  }
  /** A beat that isn't the arena: draw(t, g) the whole screen, then the film bars. */
  function card(name, dur, draw, extra = {}) {
    beats.push({ name, dur, draw: (g, t) => { draw(t, g); useContext(g); screen(); bars(1); }, ...extra });
  }

  // Where Riley and she stand, holding what, before the handoff: Riley at the sign with Norbert hugged to their chest
  // (the walker's 'clap' pose, the hands together in front, covered by him), facing you; she a step to the right with
  // her whiteboard, facing you, then turned to watch Robin. 'clap' is a pose of two frames that stage.js doesn't step
  // (frameOf() takes p.frame): frame 1 has the hands together.
  const rileyHugs = (dir = 0) => ({ ...still(RILEY_AT.x, RILEY_AT.y, dir, 'clap'), frame: 1, holds: true });
  const herStands = (dir = 0) => still(HER_AT.x, HER_AT.y, dir);
  const robinHome = (dir = 0, gait = 'emcee') => still(HOME.x, HOME.y, dir, gait);

  // 1. black: the crowd's noise rising in the dark.
  card('black', 1.5, (t) => drawNoise(t, 1.5));

  // 2. phone: hers, full screen; the dots, then the two messages, each with a buzz (phone.js).
  card('phone', 3.0, (t) => drawPhone(t));

  // 3. card: ALLIANCE SELECTION, SATURDAY 12:38 PM.
  card('card', 1.8, (t) => drawCard(t));

  // 4. arena: wide on the stands over the line, everyone in place; Robin skates in from the right along the front of
  // the line, the camera easing along with her, and lands a spin by the mic. She watches Robin go by; the stands
  // cheer her in.
  const IN0 = 0.35, SPIN = [IN0 + ENTRY_TIME + 0.05, IN0 + ENTRY_TIME + 0.85];
  const robinIn = (t) => {
    const s = t - IN0, p = along(ENTRY, s, 'skate', SKATE_SPEED);
    if (s <= 0) return { ...p, gait: 'stand', dir: 6, dist: 0 };
    if (s < ENTRY_TIME) return { ...p, gait: 'skate' };
    return { ...p, gait: 'flair', dir: spin(p.dir, 0, seg(t, SPIN[0], SPIN[1])) };
  };
  arena({
    name: 'arena', dur: SPIN[1] + 0.35,
    who: (t) => ({ riley: rileyHugs(0), her: herStands(t < IN0 + 0.9 ? turn(0, 1, t - IN0 - 0.4) : turn(1, 2, t - IN0 - 0.9)), mc: robinIn(t) }),
    shot: (t) => at1x(view(lerp(WIDE_FROM.x, WIDE_TO.x, easeInOut(seg(t, IN0, SPIN[0]))), 0)),
    cheer: (t) => lerp(0.35, 1, seg(t, SPIN[0] - 0.4, SPIN[1])),
  });

  // 5. welcome: close on Robin, mic up.
  arena({
    name: 'welcome', dur: 1.6, hush: 'mic',
    who: () => ({ riley: rileyHugs(0), her: herStands(2), mc: robinHome(0) }),
    shot: () => ROBIN_SHOT,
    cheer: () => 0.8,
    say: robinSays([['WELCOME TO ALLIANCE SELECTION!']], 0),
  });

  // 6. cocaptain: close on Riley, silent, as the crowd settles. Riley turns to her; she's still watching Robin, then
  // feels it and turns to Riley. A held beat: A can't skip it.
  const CO = { dur: 2.0, looks: 0.55, turns: 1.35 };
  arena({
    name: 'cocaptain', dur: CO.dur, hold: CO.dur, hush: 'pair',
    who: (t) => ({
      riley: rileyHugs(turn(0, 1, t - CO.looks)),
      her: herStands(turn(2, 6, t - CO.turns)),
      mc: robinHome(0),
    }),
    shot: () => PAIR_SHOT,
    cheer: () => 0.15,
  });

  // 7. yourList: the handoff, in words. Same shot.
  arena({
    name: 'yourList', dur: 0.6, hush: 'pair',
    who: () => ({ riley: rileyHugs(1), her: herStands(6), mc: robinHome(0) }),
    shot: () => PAIR_SHOT,
    cheer: () => 0.15,
    say: rileySays([["YOU'RE UP. THE LIST IS YOURS."]], 0.1),
  });

  // 8. takeHim: Riley holds Norbert out to her, both hands, and she looks down at him.
  arena({
    name: 'takeHim', dur: 0.6, hush: 'pair',
    who: () => ({
      riley: { ...still(RILEY_AT.x, RILEY_AT.y, 1, 'drive'), holds: true },
      her: herStands(7),
      mc: robinHome(0),
    }),
    shot: () => PAIR_SHOT,
    cheer: () => 0.15,
    say: rileySays([["AND TAKE HIM. HE'S BEEN TO EVERY", 'EVENT SINCE 2009.']], 0.15),
  });

  // 9. handoff: the cutaway to the hands (handoff.js). Held until his ear has glinted.
  card('handoff', 2.3, (t, g) => drawHandoff(g, t), { hold: HANDOFF.glint[1] });

  // 10. okay: close on her, Norbert hugged to her (the 'clap' pose, her board tucked under her arm), Riley beside her
  // turned to her, hands free now. Norbert's corner slides in at the top left, there from now on.
  arena({
    name: 'okay', dur: 1.3, hush: 'pair',
    who: () => ({
      riley: still(RILEY_AT.x, RILEY_AT.y, 1),
      her: { ...still(HER_AT.x, HER_AT.y, 0, 'clap'), frame: 1, holds: true },
      mc: robinHome(0),
    }),
    shot: () => HER_SHOT,
    cheer: () => 0.15,
    hud: true, hudIn: true,
    say: herSays([['...OKAY.']], 0.35),
  });

  // 11. pick: a hard cut to the pick, the clock slamming in at 0:45 (pick.js). It starts counting as the cut scene
  // hands over (scene.js).
  beats.push({ name: 'pick', dur: 1.0, draw: (g, t) => drawPick(t, PICK_CLOCK) });

  // When each beat starts (for ?at=), and how long it all takes at the automatic pace.
  let T = 0, A = 0;
  for (const b of beats) {
    b.at = T;
    T += b.dur;
    A += Math.max(b.dur, b.say ? (b.say.at ?? 0) + b.say.lines.reduce((n, p) => n + pageTime(p), 0) : 0);
  }
  beats.total = T;
  beats.autoTotal = A;
  return beats;
}
