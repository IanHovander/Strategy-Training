// The cold open of Blue Banner: the first minute of the game, cut shot by shot to the design's list (docs/blue-banner-
// design.md, section 5, "Building the opening"), in under 22 seconds with the words turning by themselves. Saturday,
// 12:38 PM, alliance selection, and 5026 is seed 4: an alliance captain, with a pick to make and nobody to make it.
// It opens in the dark with the crowd's noise rising (a line of sound across the black that grows from a murmur to a
// roar), then her phone, full screen, in her hand: the senior strategist's typing dots, and "SICK. CAN'T COME." and
// "YOU'VE GOT THIS." landing one at a time with a buzz. A card, ALLIANCE SELECTION, SATURDAY 12:38 PM, its minute
// ticking over from the phone's 12:37, with MC Robin over the PA: "WELCOME TO ALLIANCE SELECTION!" Then the arena,
// wide: the captains at their signs on the field, Robin by the mic, sign 4 standing empty, and down on the floor in
// front, among the reps waiting their turn, Riley the co-captain and her, their backs to you.
// Close on the two of them: a silent beat, Riley turning from the field to her, Norbert hugged to their chest; held so
// A can't skip it. "THE LIST IS YOURS." Riley holds Norbert out: "AND TAKE HIM. HE'S BEEN TO EVERY EVENT SINCE 2014."
// A cutaway to the hands at twice the size (handoff.js): Norbert passed across from the co-captain's red sleeves to
// her, his 26 ear glinting once. From then on he's in the top left corner with his voltage (norbert-held.js), and she
// holds him. Close on her: "...OKAY." Meanwhile the first three alliances have picked: Robin calls "5026, COME ON UP!"
// over the audience display (alliances 1 to 3 filled, row 4 lit, the clock at 0:45), and she sets off through the gate
// to the field, Riley watching her go. A hard cut to the pick: the 45-second clock (pick.js) slams in, and the scene
// hands over.
//
// It's built like the intro and alliance selection's cut scene (stage.js): hard cuts between shots, whole-number 2x
// close-ups for the people talking (a 1x view drawn into a 256x144 canvas of its own, a 128x72 window of it copied up
// crisp), film bars throughout (the pick, a screen of the game's own, has none), and every frame a pure function of
// time. The arena is alliance selection's own (its set, its reps, MC Robin, its layout, its lights). Seeds 1 to 3 and 5
// to 8 stand at their signs along the arc; everyone else waits on the floor in front of the field in its knots, as in
// alliance selection, she in the front corner by the gate (waitSlot(0), her place there) and Riley beside her, between
// her and the crowd. The house lights are down: every captain stands in their sign's spotlight, and sign 4's is lit
// with nobody in it, waiting for her; Riley and she stand in a softer one on the floor, which comes up full close on
// them as the rest of the arena goes down to a glimmer (lightWorld), and a follow spot takes her up to the field. Once the first
// three alliances have picked, their first picks stand behind their captains and are gone from the crowd. While words
// are up, the dialog box covers the bottom of the screen, so every shot with words keeps the faces in its top 88 rows.
//
//   makeCutscene()   the beats, in stage.js's form ({ dur, draw(g, t, c), say, hold }), with b.name, b.at (when each
//                    starts, for ?at=), and beats.total and beats.autoTotal (the length with words read at the pace
//                    stage.js turns them by itself)

import { W, H, C, useContext, camera, screen, fill, text, measure, clamp, lerp, seg, easeOut, rnd } from '../pixel.js';
import { bars, along, drawWithShadow } from '../stage.js';
import { HERO_LOOK } from '../walker.js';
import { HERO_NAME } from '../cast.js';
import { makeSetLayers, drawSet } from '../alliance-selection/set.js';
import { lookOf } from '../alliance-selection/people.js';
import { MC_LOOK, drawSkater } from '../alliance-selection/mc.js';
import { light, pools, micSpot, followSpot, house } from '../alliance-selection/light.js';
import {
  WORLD, capSpot, pickSpot, MC_HOME, waitSlot, GATE_OUT, GATE_IN, PRIYA_AT, SAM_FAR, REF_AT, RANKED, MC_NAME,
} from '../alliance-selection/layout.js';
import { COCAPTAIN_LOOK, COCAPTAIN_NAME } from './cocaptain.js';
import { drawHeldNorbert, heldAt, heldShows, drawHud } from './norbert-held.js';
import { drawPhone } from './phone.js';
import { drawHandoff, HANDOFF } from './handoff.js';
import { drawPick, PICK_CLOCK } from './pick.js';

// ---- Who's where ----
/** The eight captains by seed, left to right along the line; 5026 is the fourth, its sign empty till she gets there. */
export const SEEDS = ['4000', '2468', '3000', '5026', '7777', '8086', '5940', '9152'];
const OURS = SEEDS.indexOf('5026');
/** Alliances 1 to 3's first picks, made while Norbert changes hands. */
const PICKS = ['1357', '8812', '7040'];
/**
 * Off the field, on the floor in front of it with the reps waiting their turn: she in the front corner by the gate
 * (alliance selection's place for her), a step nearer you; Riley a step to her left, between her and the crowd's
 * right-hand column (18 pixels from each).
 */
export const HER_AT = { x: waitSlot(0).x, y: waitSlot(0).y + 2 };
export const RILEY_AT = { x: HER_AT.x - 18, y: HER_AT.y - 2 };
/**
 * Everyone else waits in front of the field, in alliance selection's waiting places after hers, in its knots, facing as
 * they face there.
 */
const WAITING = RANKED.map((r) => r.num).filter((num) => !SEEDS.includes(num));
const HOME = { x: MC_HOME.x, y: MC_HOME.y };

const still = (x, y, dir = 0, gait = 'stand') => ({ x, y, dir, gait, dist: 0 });
/** Everyone in the arena who doesn't move in the cut scene, before the first three picks (false) and after (true). */
const crowdOf = (picked) => [
  ...SEEDS.map((num, i) => (i === OURS ? null : { ...still(capSpot(i).x, capSpot(i).y), look: lookOf(num) })),
  ...(picked ? PICKS.map((num, i) => ({ ...still(pickSpot(i, 1).x, pickSpot(i, 1).y), look: lookOf(num) })) : []),
  ...WAITING.map((num, n) => {
    if (picked && PICKS.includes(num)) return null;
    const s = waitSlot(n + 1);
    return { ...still(s.x, s.y, s.dir), look: lookOf(num) };
  }),
  { ...still(PRIYA_AT.x, PRIYA_AT.y, PRIYA_AT.dir), look: lookOf('priya') },
  // Sam keeps the gate from left of everyone (SAM_FAR), out of the way of her walk up through it.
  { ...still(SAM_FAR.x, SAM_FAR.y, SAM_FAR.dir), look: lookOf('sam') },
  { ...still(REF_AT.x, REF_AT.y, REF_AT.dir), look: lookOf('ref') },
].filter(Boolean);
const CROWD = [crowdOf(false), crowdOf(true)];
/** The audience display: the eight captains; then, as Robin calls her, alliances 1 to 3 picked, row 4 lit, 0:45. */
const BOARD = { rows: SEEDS.map((num) => [num, '', '']), hot: null, clock: null, backups: null };
const BOARD_CALL = {
  rows: SEEDS.map((num, i) => [num, PICKS[i] ?? '', '']), hot: OURS, clock: PICK_CLOCK, backups: null,
};

/**
 * The arena for a frame: the set, everyone standing, Robin, Riley and her; whoever holds Norbert has him drawn on
 * them (holds: true), sorted in just in front of them, unless they've turned their back to you.
 */
function drawWorld(g, view, t, { riley, her, mc, cheer, picked = false }) {
  const people = CROWD[picked ? 1 : 0].map((p) => ({ y: p.y, draw: () => drawWithShadow(g, view, p) }));
  for (const p of [{ ...riley, look: COCAPTAIN_LOOK }, { ...her, look: HERO_LOOK }]) {
    people.push({ y: p.y, draw: () => drawWithShadow(g, view, p) });
    if (p.holds && heldShows(p.dir)) {
      const at = heldAt(p);
      people.push({ y: p.y + 0.1, draw: () => drawHeldNorbert(at.x, at.y) });
    }
  }
  people.push({ y: mc.y, draw: () => drawSkater(g, view, { ...mc, look: MC_LOOK }) });
  drawSet(g, view, t, { people, cheer, board: picked ? BOARD_CALL : BOARD, exitSign: false });
}

/** The spotlight on Riley and her on the floor: soft in the wide shot, full close on them. */
const pairSpot = (a) => ({ x: (RILEY_AT.x + HER_AT.x) / 2, y: HER_AT.y, r: 17, a });
/**
 * The arena's lights (alliance selection's light.js), the house down: every sign's spotlight (sign 4's on nobody), the
 * mic's, a follow spot on Robin, the softer one on Riley and her, and a follow spot on her once she sets off. Close on
 * the two of them (hush), the line, the mic and Robin go down to a glimmer and theirs comes up full. Everyone in the
 * frame goes to the lights as drawWorld draws them, Norbert with whoever holds him.
 */
function lightWorld(g, view, t, { riley, her, mc, hush, picked = false }) {
  const people = [...CROWD[picked ? 1 : 0], { ...mc, look: MC_LOOK, skater: true }];
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
  const line = hush ? 0.25 : 1, set = her.x !== HER_AT.x || her.y !== HER_AT.y;
  const spots = [...pools(line), micSpot(line), followSpot(mc, line), pairSpot(hush ? 1 : 0.5)];
  light(g, view, t, house(set ? [...spots, followSpot(her, 1, 12)] : spots), people);
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
 * The arena, wide, from the floor in front: the signs' panels just under the top film bar, captains 2 to 6 along the
 * arc whole, sign 4 empty in its spotlight between them, Robin by the mic, and the waiting reps along the bottom, Riley
 * and her among them, heads and shoulders over the bottom bar. It drifts a little to the left, toward the empty sign.
 */
const WIDE_FROM = view(252, 40), WIDE_TO = view(240, 40);
/**
 * Close on the two of them: Riley left of the middle, her right of it, both faces in the top half, clear of the dialog
 * box, and Norbert in the arms between, his feet at the box's top edge. Behind them the near wall and the field.
 */
const PAIR_SHOT = closeUp(RILEY_AT.x + 9, 135);
/** Close on her, Norbert in her arms, Riley at the left. */
const HER_SHOT = closeUp(HER_AT.x - 2, 134);
/** The audience display past the red end, its header under the film bar, the front row of the stands above it. */
const BOARD_SHOT = view(514, 0);
/** Her walk up to the field: the gate, sign 4 and Robin, her face clear of the dialog box once she's at the gate. */
const WALK_SHOT = view(238, 40);

// ---- Moving people ----
/** Seconds a turn takes, a direction at a time. */
const TURN = 0.08;
/** Turning on the spot from one direction to another the short way, a step every TURN seconds, s seconds into it. */
function turn(from, to, s) {
  const d = ((to - from + 12) % 8) - 4;
  const n = Math.min(Math.abs(d), Math.max(0, Math.floor(s / TURN)));
  return (((from + Math.sign(d) * n) % 8) + 8) % 8;
}
/** Her way up to the field: past the crowd's corner to the gate, through it, and on toward sign 4. */
const UP = [[HER_AT.x, HER_AT.y], [GATE_OUT.x + 18, GATE_OUT.y + 4], [GATE_OUT.x, GATE_OUT.y], [GATE_IN.x, GATE_IN.y],
  [capSpot(OURS).x - 8, capSpot(OURS).y + 6], [capSpot(OURS).x, capSpot(OURS).y]];

// ---- The words ----
// Short lines and real pauses (the design's pacing notes): one line a page where it can be, two lines of at most 38
// characters where it can't (talk.js). Each page starts with its shot, so no time is spent waiting for words.
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
/**
 * The card: ALLIANCE SELECTION, and the day and time, the minute ticking over from the phone's 12:37 to 12:38. It sits
 * high, clear of the dialog box, since Robin's welcome comes over the PA while it's up.
 */
function drawCard(t) {
  screen();
  fill(0, 0, W, H, C.ink);
  const name = 'ALLIANCE SELECTION', w = measure(name, { scale: 2 }) + 20, h = 44;
  const x = Math.round((W - w) / 2), y = 30;
  // In from a little below with a quick ease, then still.
  const dy = Math.round((1 - easeOut(seg(t, 0, 0.25))) * 6);
  fill(x, y + dy, w, h, C.ink);
  fill(x + 1, y + 1 + dy, w - 2, h - 2, C.blue1);
  fill(x + 1, y + 1 + dy, w - 2, 1, C.blue2);
  text(name, W / 2, y + 7 + dy, { scale: 2, align: 'center', color: C.white });
  const ticked = t >= 0.4;
  const sub = `SATURDAY 12:3${ticked ? 8 : 7} PM`;
  text(sub, W / 2, y + 28 + dy, { align: 'center', color: C.yel1 });
  // The new minute flashes white as it ticks.
  if (ticked && t < 0.6) {
    const sx = W / 2 - Math.floor(measure(sub) / 2) + measure('SATURDAY 12:3') + 1;
    text('8', sx, y + 28 + dy, { color: C.white });
  }
}

/**
 * The beats (stage.js): black, phone, card, wide, cocaptain, yourList, takeHim, handoff, okay, call, pick.
 */
export function makeCutscene() {
  makeSetLayers();
  const beats = [];
  /**
   * One beat in the arena: who(t) says where Riley, her and Robin are and what they're doing ({ riley, her, mc }, and
   * picked: alliances 1 to 3 have picked), shot(t) the camera, cheer(t) the stands, hush: close on Riley and her, with
   * the rest of the arena's lights down (lightWorld); on top go the film bars, and the corner once Norbert is hers
   * (hud: true; hudIn: it slides down into place as the beat opens).
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

  // How Riley and she stand. Riley has Norbert hugged to their chest (the walker's 'clap' pose, the hands together in
  // front, covered by him; 'clap' is a pose of two frames that stage.js doesn't step, so frameOf() takes p.frame, and
  // frame 1 has the hands together), or holds him out ('drive'). Turned to the field, he's out of sight in front.
  const rileyHugs = (dir) => ({ ...still(RILEY_AT.x, RILEY_AT.y, dir, 'clap'), frame: 1, holds: true });
  const herStands = (dir) => still(HER_AT.x, HER_AT.y, dir);
  const robin = (gait = 'stand', dir = MC_HOME.dir) => still(HOME.x, HOME.y, dir, gait);

  // 1. black: the crowd's noise rising in the dark.
  card('black', 0.7, (t) => drawNoise(t, 0.7));

  // 2. phone: hers, full screen; the dots, then the two messages, each with a buzz (phone.js).
  card('phone', 2.4, (t) => drawPhone(t));

  // 3. card: ALLIANCE SELECTION, SATURDAY 12:38 PM, and Robin's welcome over the PA.
  card('card', 1.3, (t) => drawCard(t), { say: robinSays([['WELCOME TO ALLIANCE SELECTION!']], 0.1) });

  // 4. wide: the arena from the floor in front. The crowd cheers the welcome; Robin, by the mic, flings an arm up.
  // Sign 4 stands empty; Riley and she wait with the reps, facing the field like everyone else.
  arena({
    name: 'wide', dur: 1.2,
    who: () => ({ riley: rileyHugs(4), her: herStands(4), mc: robin('flair', 0) }),
    shot: (t) => at1x(view(lerp(WIDE_FROM.x, WIDE_TO.x, seg(t, 0, 1.2)), WIDE_FROM.y)),
    cheer: () => 1,
  });

  // 5. cocaptain: close on the two of them, silent, as the crowd settles. Riley turns from the field to her, and
  // Norbert comes into sight hugged to their chest; she feels it and turns to Riley. A held beat: A can't skip it.
  const CO = { dur: 1.4, riley: 0.15, her: 0.75 };
  arena({
    name: 'cocaptain', dur: CO.dur, hold: CO.dur, hush: true,
    who: (t) => ({ riley: rileyHugs(turn(4, 1, t - CO.riley)), her: herStands(turn(4, 7, t - CO.her)), mc: robin() }),
    shot: () => PAIR_SHOT,
    cheer: () => 0.2,
  });

  // 6. yourList: the handoff, in words. Same shot.
  arena({
    name: 'yourList', dur: 0.6, hush: true,
    who: () => ({ riley: rileyHugs(1), her: herStands(7), mc: robin() }),
    shot: () => PAIR_SHOT,
    cheer: () => 0.2,
    say: rileySays([['THE LIST IS YOURS.']], 0),
  });

  // 7. takeHim: Riley holds Norbert out to her, both hands.
  arena({
    name: 'takeHim', dur: 0.6, hush: true,
    who: () => ({ riley: { ...still(RILEY_AT.x, RILEY_AT.y, 1, 'drive'), holds: true }, her: herStands(7), mc: robin() }),
    shot: () => PAIR_SHOT,
    cheer: () => 0.2,
    say: rileySays([["AND TAKE HIM. HE'S BEEN TO EVERY", 'EVENT SINCE 2014.']], 0),
  });

  // 8. handoff: the cutaway to the hands (handoff.js). Held until his ear has glinted.
  card('handoff', 1.6, (t, g) => drawHandoff(g, t), { hold: HANDOFF.glint[1] });

  // 9. okay: close on her, Norbert hugged to her (the 'clap' pose, her board tucked under her arm), Riley beside her,
  // hands free now. Norbert's corner slides in at the top left, there from now on.
  arena({
    name: 'okay', dur: 1.0, hush: true,
    who: () => ({
      riley: still(RILEY_AT.x, RILEY_AT.y, 1),
      her: { ...still(HER_AT.x, HER_AT.y, 0, 'clap'), frame: 1, holds: true },
      mc: robin(),
    }),
    shot: () => HER_SHOT,
    cheer: () => 0.2,
    hud: true, hudIn: true,
    say: herSays([['...OKAY.']], 0),
  });

  // 10. call: while Norbert changed hands, alliances 1 to 3 picked. Robin calls her up over the audience display (the
  // first three filled, row 4 lit, the clock waiting at 0:45); she sets off at once, and the camera cuts to her walking
  // up to the gate and through it toward sign 4, Robin at the mic beyond, Riley watching her go.
  const CALL = { board: 0.8, go: 0.1 };
  arena({
    name: 'call', dur: 2.0,
    who: (t) => {
      const p = along(UP, t - CALL.go, 'walk');
      return {
        riley: still(RILEY_AT.x, RILEY_AT.y, turn(1, 6, t - CALL.board)),
        her: { ...p, gait: p.gait === 'stand' ? 'clap' : 'walk', frame: 1, holds: true },
        mc: robin('emcee'),
        picked: true,
      };
    },
    shot: (t) => at1x(t < CALL.board ? BOARD_SHOT : WALK_SHOT),
    cheer: (t) => lerp(0.3, 0.8, seg(t, CALL.board, 2)),
    hud: true,
    say: robinSays([['5026, COME ON UP!']], 0),
  });

  // 11. pick: a hard cut to the pick, the clock slamming in at 0:45 (pick.js). It starts counting as the cut scene
  // hands over (scene.js).
  beats.push({ name: 'pick', dur: 0.8, draw: (g, t) => drawPick(t, PICK_CLOCK) });

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
