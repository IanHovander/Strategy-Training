// The team meeting's cut scene: a Monday afternoon on the back lawn, the whole team sitting in a circle on the grass,
// and the two co-captains standing at its head. Tessa gives the shout-outs, Owen the updates with his clipboard in hand,
// and it ends the way every 5026 meeting ends: "IRON PANTHERS ON THREE!".
//
// It moves like the intro: hard cuts between a few fixed framings, eased pans inside a shot (the tilt down from the sky
// is the intro's tilt down from the stars to the rocket), and close-ups at exactly twice the size so every pixel stays
// square. Nothing here is big enough for a shake or a flash. Film bars stay up the whole time; it fades in from black
// with the place card and fades out to black on the cheer (stage.js cover, bars, placeCard: the house style).
//
// The framings (CAMERAS) are the top-left corner of the view in world pixels and a whole-number scale:
//   SKY          the sky over the school's roof, the wall with the shop door, its sign and the robot's 5026 whole,
//                the thank-you card and the bench below (the circle's heads all under the bottom film bar)
//   WIDE         the whole circle and both co-captains, the bottoms of the windows along the top. With the dialog
//                box up, the box hides the front row's backs whole (a little lower and their hair would stick up over
//                its top edge) and the sides from the lap down; three at its edge sit a little off their seats (IN_WIDE)
//   CLOSE_TESSA  twice the size: Tessa at her speaking spot, head to waist over the dialog box, Owen listening a step
//                to her side, the back of the circle, the sponsor's card (RIVERSIDE) in the top corner; two at the
//                circle's back left sit a little higher (IN_CLOSE_TESSA), clear of the name tag
//   CLOSE_OWEN   the same for Owen, clipboard and all, Tessa listening to his side (IN_CLOSE_OWEN: the same two, and the
//                strategist a little further round, out of the shot's right edge)
//   ON_HERO      twice the size: the strategist on the grass among her neighbours in the circle, the teammate beside
//                her, both whole from head to lap over the dialog box (the name tag goes under their laps), Mr. Brandt
//                standing whole to the right, the bench's seat behind
//
// Beat by beat (seconds; a beat with words waits at its end until they've been read):
//    0 open        4.0  SKY. Fades in on the sky, clouds drifting over the roof; the place card slides in: THE BACK
//                       LAWN, MONDAY 3:15 PM. Below, out of sight under the film bar, the team chats; Tessa and Owen
//                       talk to each other a step in front of the circle's head.
//    1 tilt        4.6  The camera tilts down the wall to the circle, drifting a little right to centre it (eased,
//                       like the intro's tilt); as it starts the co-captains step up to the head, the card slides
//                       out, and near the end both turn to face the circle.
//    2 circle up   2.2  The same shot; Tessa steps into the circle and Owen a step aside to give her the floor, the
//                       team turns to her: "OKAY, PANTHERS! SHOUT-OUTS FIRST..."
//    3 build       0.8  Cut to her close-up: the elevator made level 3 on Saturday; Bea and the build crew.
//    4 build clap  1.6  Cut wide: everyone claps, Bea gets up and throws both arms up; Tessa and Owen clap too.
//    5 scouts      0.8  Close-up: every qualification match, every robot, Luis's spreadsheet.
//    6 scouts clap 1.6  Wide: claps, Luis is up with his arms up.
//    7 drive       0.8  Close-up: the drive team's practice hours and their cycle times.
//    8 drive clap  1.6  Wide: claps, Jamal and the two drivers are up cheering.
//    9 pick list   0.8  Close-up: Tessa turns to the strategist: "AND OUR STRATEGIST..." and the circle turns too.
//   10 her answer  1.4  Cut to the strategist on the grass, the circle clapping, the teammate's arms up for her; she
//                       says the scouts did the hard part (her red name tag). The two front-row backs at the bottom
//                       of the shot sit a few pixels further round for it (ROOM_BY_HER), clear of her and each other.
//   11 teammate    0.4  The same shot: the teammate says she had 3000 on top by Friday lunch. (A beat of its own, so
//                       the phone shows the teammate's face, sitting on the grass as she is.)
//   12 sponsor     0.8  Back to Tessa, facing everyone again: Riverside Machine Works and their thank-you card.
//   13 swap        2.2  Wide: a last round of applause; Tessa steps back to her side of the head and turns to Owen as
//                       he steps in with his clipboard.
//   14 updates     0.8  Cut to his close-up, Tessa turned to him beside: next week's regional, the vans at six the day
//                       before, what to bring.
//   15 slips       1.0  Wide: build hours, permission slips due this Friday, no slip no van; most of the circle
//                       turns to a neighbour with a frown.
//   16 awww        0.3  The same: EVERYONE: AWWW.
//   17 more        0.8  Close-up: the robot demo at Maple Elementary, Nadia's sign-up.
//   18 break       1.0  Wide: "THAT'S IT. IRON PANTHERS ON THREE!"
//   19 cheer       5.0  Every arm goes up in a V, Owen waving his clipboard, held in the wide shot, where the raised
//                       arms clear the dialog box; the arms pump for a couple of seconds, "IRON PANTHERS!" comes up and
//                       turns by itself, the circle holds its arms up, and it fades to black; the walkable part fades
//                       in (the scene's own fade).
//
// Every frame is a pure function of time. The co-captains walk with stage.js along(), so their feet step with the
// distance; standing, Tessa and Owen talk with their hands every other second or so, clap five times a second, or
// throw their arms up. The circle's reactions are people.js circle()'s, cued from here. The name tags are talk.js's:
// red for the strategist, blue for everyone else, EVERYONE included.
//
//   CAMERAS                      the framings above, each { x, y, s }
//   makeCutscene({ paint, cast }) the beats, for scene.cutscene. paint(g, view, t, cue) draws the world at 1x seen from
//                                view = { x, y } with everyone placed by cue, t seconds into the cut scene; cast is
//                                people.js CAST ({ [id]: { name, look } }), for the names and the phone's faces. Each
//                                beat also carries cam(t) and cue(t, T), for looking ahead
//   shoot(g, cam, t, cue, paint) the world through a camera: at 1x straight onto the screen; at 2x (or 3x) painted at
//                                1x off screen and enlarged, since the walker's people are drawn at 1x
//
// cue = { circle: { react, at, cheer, still, since, rise, toward, nudge }, tessa: P, owen: P }, with P = { x, y, dir,
// gait, frame, dist }. react is 'chat', 'listen', 'clap', 'cheer' or 'groan'; at is the speaker's feet; cheer and still
// are ids; since is how many seconds this reaction has been going (people.js staggers the start of a clap or a cheer by
// it); rise, whether the ids in cheer get up to cheer (in the wide shots); toward, { [id]: { x, y } } anyone looking
// somewhere else than at; nudge, { [id]: [dx, dy] } anyone sat a few pixels off their seat for the shot.

import { W, H, C, useContext, screen, lerp, seg, easeInOut } from '../pixel.js';
import { along, bars, cover, placeCard, dirToward } from '../stage.js';
import { FT, DEEP, HEAD, FLOOR, ASIDE, CIRCLE } from './layout.js';
import { SEATS, pump, glum, FACE_DY_FLOOR } from './people.js';

// The close-ups are framed so the speaker, a step in front of the other, stands clear of the dialog box's name tag
// (the left 120 pixels of the screen) from the head to the waist, and the card's RIVERSIDE sits whole under the top
// film bar (THANK YOU! goes under it: a pixel lower or higher and the bar would cut one of its lines in half).
export const CAMERAS = {
  SKY: { x: 114, y: 6, s: 1 },
  WIDE: { x: 128, y: 88, s: 1 },
  CLOSE_TESSA: { x: 176, y: 117, s: 2 },
  CLOSE_OWEN: { x: 186, y: 117, s: 2 },
  ON_HERO: { x: 270, y: 138, s: 2 },
};

/** Her seat in the circle (people.js SEATS). */
const HER_SEAT = SEATS.find((p) => p.id === 'hero');
/**
 * A spot on the grass just in front of her, toward the camera. While she and the teammate talk, the people near them
 * look there instead of at her, so in the close-up she and the teammate (beside her, on the gap side) face you: a film
 * cheat nobody off camera can see. Her neighbours on the other side (NEXT_TO_HER), sitting close together at the edge
 * of the shot, keep looking at her, so they show the backs of their heads and no two faces crowd hers.
 */
const BY_HER = { x: HER_SEAT.x - 13, y: HER_SEAT.y + 22 };
const NEXT_TO_HER = ['luis', 'bea', 's6'];
/**
 * In her close-up the front row's backs frame the bottom of the shot, and at twice the size their seats are too close:
 * the scouting lead's clapping hands would reach across her knees and the build lead's bun sit in the middle of his
 * back. So for this shot only they sit a few pixels further round (nobody sees them move: it's a cut each way).
 */
const ROOM_BY_HER = { luis: [6, 0], bea: [12, 1] };
/**
 * Where the co-captains wait while the camera is on the sky: a step in front of the head of the circle, low enough that
 * the tops of their heads (46 pixels over their feet) stay under the bottom film bar. They step up to the head as the
 * tilt begins.
 */
const LOW = { tessa: { x: HEAD.tessa.x, y: 185 }, owen: { x: HEAD.owen.x, y: 185 } };
/**
 * Film cheats for the framings the dialog box comes across, so it never cuts a face (people.js circle() nudge). Wide:
 * the box hides the front row whole and the sides from the lap down, but three sit right at its edge, turned away while
 * they listen, where only the top of a head would show over it. So in every wide shot they sit a few pixels off their
 * seats: the first driver and the cap on the right a little down, all of them under the box; the second driver, whose
 * head is too high for that, a little up and to the left, clear of the freshman, so her shoulders show too and she
 * reads as someone seen from behind, like the front row. The co-captains' close-ups: the freshman and the drive coach,
 * at the back left of the circle, sit a little higher, so their faces clear the name tag; and in Owen's, the strategist
 * sits a little further round, out of the shot, not cut in half by its right edge. Every move from one framing to
 * another is a cut, so nobody sees anyone move.
 */
const IN_WIDE = { drv1: [-3, 7], drv2: [-3, -4], s6: [0, 7] };
const IN_CLOSE_TESSA = { eli: [-4, -6], jamal: [0, -5] };
/** In Owen's: her seat is right at the shot's right edge, and her crossed legs reach 11 pixels to her left, so 18 more
 *  takes the whole of her out of it (just past the scouting lead, beside her and out of the shot too). */
const IN_CLOSE_OWEN = { ...IN_CLOSE_TESSA, hero: [18, 0] };
/** Where Owen stands while the camera is on her: at the head of the circle, a step to Tessa's side, out of the shot. */
const OWEN_OFF = { x: HEAD.owen.x - 8, y: HEAD.owen.y };

// ---- The camera ----
let OFF = null;
/**
 * The world through a camera { x, y, s }, t seconds into the cut scene. At 1x paint draws straight onto the screen; at
 * 2x or 3x it paints at 1x into a canvas of its own and the top-left corner of that is enlarged onto the screen, whole
 * pixels each. Leaves pixel.js drawing on g with the camera at the screen, for the bars, the card and the dialog box.
 */
export function shoot(g, cam, t, cue, paint) {
  const view = { x: Math.round(cam.x), y: Math.round(cam.y) }, s = cam.s ?? 1;
  if (s === 1) paint(g, view, t, cue);
  else {
    if (!OFF) {
      OFF = Object.assign(document.createElement('canvas'), { width: W, height: H });
      OFF.getContext('2d').imageSmoothingEnabled = false;
    }
    paint(OFF.getContext('2d'), view, t, cue);
    const w = Math.ceil(W / s), h = Math.ceil(H / s);
    g.drawImage(OFF, 0, 0, w, h, 0, 0, w * s, h * s);
  }
  useContext(g);
  screen();
}
/** An eased pan from one framing to another (same scale) between t0 and t1. */
const pan = (a, b, t, t0, t1) => {
  const k = easeInOut(seg(t, t0, t1));
  return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), s: a.s };
};

// ---- The co-captains ----
/** Which way to face a point on the ground, in the ground's own proportions (8 pixels to the foot across, 2.75 deep). */
const face = (p, q) => dirToward((q.x - p.x) / FT, (q.y - p.y) / DEEP);
const stand = (p, dir, gait = 'stand', frame = 0) => ({ x: p.x, y: p.y, dir, gait, frame, dist: 0 });
/** Talking: a point made with the right hand, then a breath, about every 1.1 seconds. */
const talk = (p, dir, T) => stand(p, dir, Math.floor(T / 1.1) % 2 ? 'stand' : 'gesture');
/** Clapping, five claps a second. */
const clap = (p, dir, T) => stand(p, dir, 'clap', Math.floor(T * 10) % 2);
/** A step from one spot to the other, setting off t0 seconds into the beat; standing at either end facing before / after. */
function step(from, to, t, t0, before, after) {
  if (t <= t0) return stand(from, before);
  const w = along([[from.x, from.y], [to.x, to.y]], t - t0, 'walk');
  return w.gait === 'walk' ? { ...w, frame: 0 } : stand(to, after);
}

/** The circle's reaction: what, to whom, the ids that cheer or sit still, how long it's been going, anyone who listens
 *  to somewhere else (toward), and anyone sat a little off their seat for the shot (nudge). */
const react = (what, at, since, o = {}) => ({
  react: what, at, cheer: o.cheer ?? [], still: o.still ?? [], since: Math.max(0, since), rise: o.rise ?? false,
  toward: o.toward ?? {}, nudge: o.nudge ?? {},
});

/** The beats of the meeting, for scene.cutscene. */
export function makeCutscene({ paint, cast }) {
  const { tessa, owen, hero, teammate } = cast;
  const T_AT = FLOOR.tessa, O_AT = FLOOR.owen;
  // While one co-captain talks, the other listens from a step to their own side of the head, turned to the speaker.
  const O_BY = ASIDE.owen, T_BY = ASIDE.tessa;
  const owenListens = face(O_BY, T_AT), tessaListens = face(T_BY, O_AT);
  // The shout-outs and the claps between them: Tessa on her spot, talking with her hands, Owen to her side.
  const shout = (cue = (t) => react('listen', T_AT, t + 1), tDir = 0, oDir = owenListens, tPose = talk) => ({
    cam: () => CAMERAS.CLOSE_TESSA,
    cue: (t, T) => ({ circle: cue(t), tessa: tPose(T_AT, tDir, T), owen: stand(O_BY, oDir) }),
  });
  // The praised get up on their feet to cheer, so the eye finds them over the seated heads.
  const applause = (cheer) => ({
    cam: () => CAMERAS.WIDE,
    cue: (t, T) => ({ circle: react('clap', T_AT, t, { cheer, rise: true }), tessa: clap(T_AT, 0, T), owen: clap(O_BY, 0, T + 0.05) }),
  });
  // Owen's turn: him on his spot, Tessa to his side. He talks to the circle's near left, a step round from facing you,
  // which turns the clipboard in his left hand broadside to the camera.
  const update = (cam, circle = (t) => react('listen', O_AT, t + 1), owenPose = talk) => ({
    cam: () => cam,
    cue: (t, T) => ({ circle: circle(t), tessa: stand(T_BY, tessaListens), owen: owenPose(O_AT, 7, T) }),
  });
  // A beat's words, said by who (and shown on the phone in o.faceGait and o.faceDy, if they aren't standing: stage.js).
  const says = (who, lines, at = 0.3, o = {}) => ({ say: { name: who.name, lines, at, look: who.look, ...o } });
  /** How the phone shows the strategist and the teammate, sitting in the circle. */
  const ON_GRASS = { faceGait: 'floor', faceDy: FACE_DY_FLOOR };
  // On her: the circle claps for her and the teammate cheers (sitting: the close-up has no room above her), she stays
  // put; then everyone listens. (Owen is back at the head here and a step past it, just out of the shot on the left: at
  // the head itself a sliver of him would show at its edge. Nobody can see him move.)
  const onHer = {
    cam: () => CAMERAS.ON_HERO,
    cue: (t, T) => ({
      circle: t < 1.4
        ? react('clap', HER_SEAT, t, { cheer: ['teammate'], still: ['hero'], nudge: ROOM_BY_HER })
        : react('listen', BY_HER, t - 1.4, { toward: Object.fromEntries(NEXT_TO_HER.map((id) => [id, HER_SEAT])), nudge: ROOM_BY_HER }),
      tessa: t < 1.4 ? clap(T_AT, face(T_AT, HER_SEAT), T) : stand(T_AT, face(T_AT, HER_SEAT)),
      owen: t < 1.4 ? clap(OWEN_OFF, face(OWEN_OFF, HER_SEAT), T + 0.05) : stand(OWEN_OFF, face(OWEN_OFF, HER_SEAT)),
    }),
  };

  const beats = [
    // 0 open: the sky over the roof, the place card; the team chatting below.
    {
      dur: 4.0,
      cam: () => CAMERAS.SKY,
      cue: (t, T) => ({ circle: react('chat', CIRCLE, T), tessa: stand(LOW.tessa, 2), owen: stand(LOW.owen, 6) }),
      over: (t, T) => {
        placeCard(T - 0.3, 'THE BACK LAWN', 'MONDAY 3:15 PM');
        cover(1 - seg(t, 0, 1));
      },
    },
    // 1 tilt: down the wall to the circle; the co-captains step up to its head as it starts, and turn to the team.
    {
      dur: 4.6,
      cam: (t) => pan(CAMERAS.SKY, CAMERAS.WIDE, t, 0.2, 4.4),
      cue: (t, T) => {
        const ready = t >= 3.8;
        return {
          circle: react('chat', CIRCLE, T),
          tessa: ready ? stand(HEAD.tessa, 0) : step(LOW.tessa, HEAD.tessa, t, 0.6, 2, 2),
          owen: ready ? stand(HEAD.owen, 0) : step(LOW.owen, HEAD.owen, t, 0.75, 6, 6),
        };
      },
      over: (t, T) => placeCard(T - 0.3, 'THE BACK LAWN', 'MONDAY 3:15 PM'),
    },
    // 2 circle up: Tessa steps in and Owen a step aside, everyone turns to her.
    {
      dur: 2.2,
      cam: () => CAMERAS.WIDE,
      cue: (t, T) => {
        const walking = step(HEAD.tessa, T_AT, t, 0.2, 0, 0);
        const there = walking.gait !== 'walk' && t > 0.2;
        return {
          circle: t < 0.3 ? react('chat', CIRCLE, T) : react('listen', T_AT, t - 0.3),
          tessa: there && t > 0.9 ? talk(T_AT, 0, T) : walking,
          owen: step(HEAD.owen, O_BY, t, 0.4, 0, owenListens),
        };
      },
      ...says(tessa, [['OKAY, PANTHERS! SHOUT-OUTS FIRST,', "THEN OWEN HAS WHAT'S COMING UP."]], 0.9),
    },
    // 3 build
    {
      dur: 0.8,
      ...shout(),
      ...says(tessa, [['THE ELEVATOR FINALLY HIT LEVEL 3 ON', 'SATURDAY. BEA AND BUILD, THAT WAS YOU!']]),
    },
    // 4 build clap
    { dur: 1.6, ...applause(['bea']) },
    // 5 scouts
    {
      dur: 0.8,
      ...shout(),
      ...says(tessa, [['SCOUTS: EVERY QUAL MATCH LAST EVENT,', "EVERY ROBOT, IN LUIS'S SPREADSHEET!"]]),
    },
    // 6 scouts clap
    { dur: 1.6, ...applause(['luis']) },
    // 7 drive
    {
      dur: 0.8,
      ...shout(),
      ...says(tessa, [['DRIVE TEAM: 20 HOURS OF PRACTICE THIS', 'MONTH. CYCLES ARE 4 SECONDS FASTER!']]),
    },
    // 8 drive clap
    { dur: 1.6, ...applause(['jamal', 'drv1', 'drv2']) },
    // 9 pick list: she turns to the strategist, and so does everyone else. She stands still for this one: side on, her
    // talking hand would land on Owen just behind her.
    {
      dur: 0.8,
      ...shout((t) => react('listen', HER_SEAT, t + 1), face(T_AT, HER_SEAT), face(O_BY, HER_SEAT), (p, dir) => stand(p, dir)),
      ...says(tessa, [['AND OUR STRATEGIST! HER PICK LIST HAD', '3000 FIRST BEFORE ANYONE NOTICED THEM.']]),
    },
    // 10 her answer: the circle claps for her, the teammate cheers; she stays put, then everyone listens.
    { dur: 1.4, ...onHer, ...says(hero, [{ name: hero.name, tag: C.red1, lines: ['THE SCOUTS DID THE HARD PART. I JUST', 'SORTED THEIR NUMBERS.'] }], 0.5, ON_GRASS) },
    // 11 the teammate's word: the same shot, a beat of its own so the phone shows her face.
    { dur: 0.4, ...onHer, cue: (t, T) => onHer.cue(t + 2, T), ...says(teammate, [['SHE HAD 3000 ON TOP BY FRIDAY LUNCH.', 'JUST SAYING.']], 0, ON_GRASS) },
    // 12 sponsor: back to Tessa, facing everyone again.
    {
      dur: 0.8,
      ...shout(),
      ...says(tessa, [['LAST: RIVERSIDE MACHINE WORKS CUT OUR', 'NEW PLATES FOR FREE. SIGN THEIR CARD!']]),
    },
    // 13 swap: a last round of applause; Tessa steps back to her side of the head and turns to Owen as he steps in.
    {
      dur: 2.2,
      cam: () => CAMERAS.WIDE,
      cue: (t, T) => ({
        circle: t < 1.2 ? react('clap', T_AT, t) : react('listen', O_AT, t - 1.0),
        tessa: t < 0.3 ? clap(T_AT, 0, T) : step(T_AT, T_BY, t, 0.3, 0, t < 1.1 ? 0 : tessaListens),
        owen: t < 1.0 ? clap(O_BY, 0, T + 0.05) : step(O_BY, O_AT, t, 1.0, 0, 0),
      }),
    },
    // 14 updates
    {
      dur: 0.8,
      ...update(CAMERAS.CLOSE_OWEN),
      ...says(owen, [
        ['NEXT WEEK: THE SILVER LAKE REGIONAL,', 'THURSDAY THE 21ST THROUGH THE 23RD.'],
        ['VANS LEAVE THE SHOP DOOR WEDNESDAY THE', '20TH AT 6:00 AM. SIX. NOT SIX-TEN.'],
        ['BRING SAFETY GLASSES, TEAM SHIRT AND A', 'WATER BOTTLE. NO GLASSES, NO PITS.'],
      ]),
    },
    // 15 slips: the groan.
    {
      dur: 1.0,
      ...update(CAMERAS.WIDE, (t) => react('groan', O_AT, t)),
      ...says(owen, [['BUILD HOURS ALL WEEK. PERMISSION SLIPS', 'ARE DUE THIS FRIDAY. NO SLIP, NO VAN.']]),
    },
    // 16 the circle's answer, a beat of its own so the phone doesn't show Owen saying it (it shows her, sitting in the
    // circle and frowning: she groans too).
    {
      dur: 0.3,
      ...update(CAMERAS.WIDE, (t) => react('groan', O_AT, t + 1), (p, dir) => stand(p, dir)),
      say: { name: 'EVERYONE', lines: [['AWWW.']], at: 0, look: glum(hero.look), ...ON_GRASS },
    },
    // 17 more
    {
      dur: 0.8,
      ...update(CAMERAS.CLOSE_OWEN),
      ...says(owen, [['AND SATURDAY THE 30TH, A ROBOT DEMO AT', 'MAPLE ELEMENTARY. NADIA HAS A SIGN-UP.']]),
    },
    // 18 break
    {
      dur: 1.0,
      ...update(CAMERAS.WIDE),
      ...says(owen, [["THAT'S IT. IRON PANTHERS ON THREE!", 'ONE... TWO... THREE!']]),
    },
    // 19 cheer: every arm up, held in the wide shot, over the dialog box everywhere but the front row. The arms pump a
    // couple of seconds (people.js pump), the shout comes up once they're up, and goes by itself; the whole circle holds
    // with its arms up a second more, then black.
    {
      dur: 5.0,
      cam: () => CAMERAS.WIDE,
      cue: (t, T) => ({
        circle: react('cheer', O_AT, t),
        tessa: stand(T_BY, 0, ...pump(T, t, 20, 'hooray', 'clap')),
        owen: stand(O_AT, 0, ...pump(T, t, 21, 'hooray', 'clap')),
      }),
      say: { name: 'EVERYONE', lines: [['IRON PANTHERS!']], at: 0.8, auto: true, look: hero.look, ...ON_GRASS },
      over: (t) => cover(seg(t, 4.2, 5.0)),
    },
  ];

  // The cheats for the framing the beat is in at t (IN_WIDE, IN_CLOSE_TESSA, IN_CLOSE_OWEN), added to any of the beat's
  // own.
  const cheat = (b) => (t, T) => {
    const cue = b.cue(t, T), cam = b.cam(t);
    const more = cam.s === 1 ? IN_WIDE : cam === CAMERAS.CLOSE_TESSA ? IN_CLOSE_TESSA : cam === CAMERAS.CLOSE_OWEN ? IN_CLOSE_OWEN : null;
    return more ? { ...cue, circle: { ...cue.circle, nudge: { ...more, ...cue.circle.nudge } } } : cue;
  };
  // Each beat also keeps its camera and its cue (t seconds into the beat, T into the cut scene), so the scene can see
  // ahead who'll be drawn in which pose and get their frames made before they're needed.
  return beats.map((b) => {
    const cue = cheat(b);
    return {
      dur: b.dur,
      say: b.say,
      cam: b.cam,
      cue,
      draw(g, t, c) {
        shoot(g, b.cam(t), c.T, cue(t, c.T), paint);
        bars(1);
        b.over?.(t, c.T);
      },
    };
  });
}
