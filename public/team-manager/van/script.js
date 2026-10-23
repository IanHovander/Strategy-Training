// The van's words and camera: what everyone says, the cut scene shot by shot, and how the stick picks a seat. Thursday,
// 6:40 in the morning: team 5026's passenger van on the highway to the regional, the red trailer behind. The cut scene
// opens outside at dawn, cuts in to the front bumper and scans the van front to back, a row at a time, while the
// pretzels go over the seats to the back row; then it stays with the strategist and the teammate in the back row for
// their talk (nerves, the scouting plan, the robot, the pick list, the teammate's grandma and her glitter sign, and a
// pretzel), cutting outside to the trailer while they talk about the robot in it and in close for the personal part.
// It goes back outside for the exit, comes in to the whole van with the signal blinking and cuts to the front seats as
// Owen calls the turn. Then the stick picks a seat and A talks to whoever's in it: everyone has a few pages, and most
// of them teach something real about FRC in 2019 (Deep Space): inspection, bumpers, ranking points, Sandstorm,
// scouting, safety glasses in the pits.
//
// A page is two lines of at most 38 characters in the dialog box's 5x7 capitals (pixel.js font 5): A-Z, 0-9, space and
// ! ? . , : - + ' / > # &. No brackets, double quotes or semicolons: the font hasn't got them. The place card's second
// line is the 3x5 font, which has no comma or question mark. The two people the story follows have no names yet: the
// dialog calls them HERO_NAME and TEAMMATE_NAME (cast.js), and nobody here says a name for either, or a he or a she for
// the teammate.
//
// SHOTS is the cut scene, one entry per beat, everything in it a pure function of the beat's t (seconds). The scene
// (scene.js) turns each into a stage.js beat: cabin shots draw cabin.js's front view with people.js's rows into a
// 256 x 208 buffer and show the part cam(t) picks; outside shots draw outside.js's side view. This file imports only
// pixel.js, cast.js and layout.js, never the art or the people, so it loads on its own.

import { lerp, seg, easeIn, easeInOut } from '../pixel.js';
import { HERO_NAME, TEAMMATE_NAME } from '../cast.js';
import { FRAME } from './layout.js';

/** Everyone's name in the dialog box (the strategist's is HERO_NAME, in her red tag). */
export const NAMES = {
  adeyemi: 'MR. ADEYEMI, MENTOR', owen: 'OWEN, NAVIGATING', tess: 'TESS, ASLEEP', rafi: 'RAFI, SNACKS',
  kai: 'KAI, ROBOT DRIVER', teammate: TEAMMATE_NAME, bea: 'BEA, SCOUT',
};
/** The place card as the cut scene opens. */
export const CARD = ['THE VAN', 'THURSDAY 6:40 AM'];

/** The phone's hint line, the note under the controls and what the big screen shows, for screen readers. */
export const HINT = 'Push the stick to pick a seat, A to talk';
export const NOTE = 'Nobody walks in a moving van, so the stick picks who to talk to instead: push it up for the seats '
  + 'toward the back, down for the front, and left or right along a row, and the bubble moves to that seat. Press A to '
  + 'talk. In the cut scene, A reads on and SKIP jumps to the end. On a keyboard: arrow keys or WASD to pick, Space or '
  + 'Enter for A, Esc to skip.';
export const LABEL = "Team 5026's passenger van seen from in front and above with its roof cut away, on the highway at dawn "
  + 'with the red team trailer behind it: the mentor driving and a student navigating in the front seats, three '
  + 'students in each of the two rows behind them, and the strategist at the back-row window beside the teammate. A '
  + 'bubble beside one head shows who you would talk to';

// ---- The words ----
const RED = '#d3212f'; // the strategist's name tag, her tee's red
/** A page the strategist says. */
const me = (...lines) => ({ name: HERO_NAME, tag: RED, lines });

/** What everyone says when you pick their seat and press A: two to four pages each. */
export const LINES = {
  adeyemi: [
    ['WHY DID THE ROBOT GO ON VACATION?', 'IT NEEDED TO RECHARGE.'],
    ['FIRST STOP IS INSPECTION. 125 POUNDS', 'MAX, NOT COUNTING BUMPERS OR BATTERY.'],
    ['PASS INSPECTION OR NO QUAL MATCHES.', 'THAT ONE IS NOT A JOKE.'],
    ["I'D TURN AROUND TO TALK, BUT I'M", 'DRIVING. EYES ON THE ROAD.'],
  ],
  owen: [
    ['THE APP SAYS TURN LEFT. THERE IS NO', 'LEFT. THERE IS A COW.'],
    ['NOW IT WANTS TO SAVE TWO MINUTES ON A', 'DIRT ROAD. WITH A TRAILER. NO.'],
    ['LOAD-IN IS AT 8. THE PIT MAP SAYS', "WE'RE BY THE PRACTICE FIELD. NICE."],
  ],
  tess: [
    ['MMF. FIVE MORE MINUTES.'],
    ['I SEWED BUMPER COVERS TILL 2 AM. RED', 'ON ONE SIDE, BLUE ON THE OTHER.'],
    ['THE TEAM NUMBER HAS TO READ FROM', 'EVERY SIDE. IT DOES. NOW LET ME SLEEP.'],
  ],
  rafi: [
    ['TRAIL MIX? I PICKED OUT THE RAISINS.', "YOU'RE WELCOME."],
    ["EAT NOW. IN THE PITS IT'S SAFETY", 'GLASSES ON, AND NO TIME FOR SNACKS.'],
    ['THE PRETZELS WENT TO THE BACK ROW.', 'I KNOW WHO HAS THEM.'],
  ],
  kai: [
    ['WHAT? OH. SORRY. HEADPHONES.'],
    ["I'M DRIVING THIS WEEKEND. THE FIRST 15", 'SECONDS OF A MATCH ARE SANDSTORM.'],
    ['A SHADE COMES DOWN IN FRONT OF US. I', "DRIVE BY THE ROBOT'S CAMERA."],
    ['SO: HYPE MUSIC. DEFINITELY NOT', 'THINKING ABOUT IT.'],
  ],
  teammate: [
    ['SEEDING HOMEWORK. A WIN IS 2', 'RANKING POINTS, A TIE IS 1.'],
    ['A COMPLETE ROCKET IS 1 MORE. SO ARE', '15 POINTS OF CLIMBING ON THE HAB.'],
    ['EVEN A LOSS PAYS IF WE CLIMB. ALSO', "WRITE PRETZELS. WE'RE ALMOST OUT."],
  ],
  bea: [
    ['LEVEL 40. HOLD ON. HOLD ON...', 'NO!'],
    ['OKAY. SCOUTING. I HAVE RED 1 ALL DAY', 'FRIDAY: EVERY HATCH, EVERY CLIMB.'],
    ['WE WRITE DOWN WHAT ROBOTS DO, NOT', 'WHAT THEIR TEAMS SAY THEY DO.'],
    ['EVERY MATCH WILL BE ON YOUR BOARD BY', 'ALLIANCE SELECTION. PROMISE.'],
  ],
};

// The talk in the back row, beat by beat. The teammate's pages are plain (the beat's name is TEAMMATE_NAME); hers are
// me(...). Each beat's pose and board change as its words start.
const TALK = {
  // Nerves.
  talk1: [
    ["YOU'VE BEEN STARING AT THAT BOARD", 'SINCE THE GAS STATION. NERVOUS?'],
    me("FIRST EVENT AS STRATEGIST. IT'S BLANK.", "I'M MAKING IT NOT BLANK BY STARING."),
  ],
  // The scouting plan: she starts writing.
  talk2: [
    ["TRY WRITING ON IT. WHAT'S THE PLAN?"],
    me('SIX SCOUTS IN THE STANDS, ONE ON EACH', 'ROBOT: HATCHES, CARGO, CLIMB, DEFENSE.'),
  ],
  // The robot. (In 2019 the competition robot was bagged at the end of build season and only came out at events, so
  // Tuesday's practice was on the practice bot.)
  talk3: [
    ['THE PRACTICE BOT HIT ROCKET LEVEL 3', 'TEN TIMES IN A ROW TUESDAY. I COUNTED.'],
    me('AND THE CLIMB?'),
    ['THE CLIMB IS... CONFIDENT. THE ZIP', 'TIES ARE BRAND NEW.'],
  ],
  // The pick list.
  talk4: [
    me('IF WE SEED IN THE TOP EIGHT, WE PICK', 'PARTNERS SATURDAY. THE LIST IS ON ME.'),
    ['PICK THE ROBOT THAT DOES WHAT WE', "CAN'T. NOT JUST THE BIGGEST SCORER."],
    me('WHO TOLD YOU THAT?'),
    ['YOU DID. LAST WEEK. AT 1 AM.'],
  ],
  // Something personal, and a pretzel.
  talk5: [
    ["ALSO. MY GRANDMA'S COMING SATURDAY.", 'SHE MADE A SIGN. THERE IS GLITTER.'],
    me('THEN WE HAVE TO STILL BE PLAYING ON', 'SATURDAY. FOR THE GLITTER.'),
    ['PRETZEL?'],
  ],
  pretzel: [me('...YES.')],
};
// Owen calls the exit; Mr. Adeyemi has seen it.
const ARRIVE = [
  ['EXIT 42! THIS ONE! WAIT, IT SAYS', "RECALCULATING? NO. IT'S RIGHT THERE!"],
  { name: NAMES.adeyemi, lines: ['I SEE IT, OWEN. TWENTY MINUTES,', 'EVERYONE. SOMEONE WAKE UP TESS.'] },
];

// ---- The seat picker ----
// The seats as you see them from the back: the back row on top, the front at the bottom, the gap between the front
// seats where the console is. The strategist is you, so the stick never lands on her.
const GRID = [
  ['hero', 'teammate', 'bea'],
  ['tess', 'rafi', 'kai'],
  ['owen', null, 'adeyemi'],
];
/** Who starts out picked when the cut scene hands over: the teammate, next to her. */
export const PICK_START = 'teammate';
/**
 * The seat picked after a flick of the stick from seat id: dx, dy in -1, 0, 1, dy -1 up the screen (toward the back).
 * Left and right go along the row, past the gap and her own seat, and stop at the ends; up and down keep to the column,
 * landing on Owen where the column's seat is the gap and on the teammate where it's hers. Never 'hero'; no wrapping.
 */
export function pick(id, dx, dy) {
  let r = GRID.findIndex((row) => row.includes(id)), c = r < 0 ? -1 : GRID[r].indexOf(id);
  if (r < 0 || id === 'hero') return PICK_START;
  if (dy) {
    const nr = r + Math.sign(dy);
    if (nr >= 0 && nr < GRID.length) {
      const seat = GRID[nr][c];
      [r, c] = seat === null ? [nr, 0] : seat === 'hero' ? [nr, 1] : [nr, c];
    }
  }
  if (dx) {
    for (let nc = c + Math.sign(dx); nc >= 0 && nc < GRID[r].length; nc += Math.sign(dx)) {
      const seat = GRID[r][nc];
      if (seat && seat !== 'hero') {
        c = nc;
        break;
      }
    }
  }
  return GRID[r][c];
}

// ---- The camera ----
/** Hold a framing (layout.js FRAME): returns cam(t). */
const hold = (key) => () => ({ ...FRAME[key] });
/** Pan from one framing to another between t0 and t1, eased, in whole world pixels: returns cam(t). */
const pan = (from, to, t0, t1) => (t) => {
  const a = FRAME[from], b = FRAME[to], k = easeInOut(seg(t, t0, t1));
  return { x: Math.round(lerp(a.x, b.x, k)), y: Math.round(lerp(a.y, b.y, k)), s: b.s };
};
/** Hold one framing, then cut to another at `at` seconds (a cut, for a change of zoom): returns cam(t). */
const cut = (from, to, at) => (t) => ({ ...FRAME[t < at ? from : to] });
// The tilt from the front bumper up over the hood to the front seats is one move across two shots: it starts 1.4 s into
// the hood shot and ends 1.0 s into the front shot, eased at its two ends only, so it carries on at speed across the cut
// between the shots instead of stopping there.
const TILT = { from: 'hood', to: 'front', start: 1.4, len: 1.8 };
/** The tilt, t seconds into a shot that starts `offset` seconds after the hood shot: returns cam(t). */
const tilt = (offset) => pan(TILT.from, TILT.to, TILT.start - offset, TILT.start + TILT.len - offset);

// ---- Poses (people.js drawRow's opts.pose: dir 0 faces you, 1 turns to the screen's right, 7 to its left) ----
const SIT = (dir) => ({ dir, gait: 'sit' });
const T_HOOD = 2.2; // the hood shot's length: the front shot starts this far into the tilt's clock
const CHEER = { dir: 0, gait: 'cheer' };            // arms up: Rafi holding the pretzels up, the teammate's catch
const OWEN_MAP = { dir: 0, gait: 'phone' };         // on the map app
const OWEN_TURNED = { dir: 1, gait: 'phone' };      // turned to the driver, phone up
/** The back row in conversation: her turned to the teammate (or down at her board), the teammate turned to her. */
const TALKING = (dir = 1) => ({ hero: SIT(dir), teammate: SIT(7) });
/**
 * The rows the dialog box covers in the talk's framings: row 2 sits along the bottom of the picture, and once the box is
 * up only its crowns (and Tess's Zs) would show, poking out over the box's top edge where they'd read as the speaker's.
 * The scene leaves these rows out while the box is up (however early A brought it).
 */
const UNDER = [2];

const ROAD = { blink: null, cars: true };
const ON = 'on';
const say = (lines, at, look, name = TEAMMATE_NAME) => ({ name, lines, at, auto: true, look });

/**
 * The cut scene, one entry per beat (see the header; the scene turns these into stage.js beats):
 *   view 'outside' | 'cabin', dur the seconds before its words are read
 *   cam(t)     { x, y, s }: the view's top-left in cabin world pixels, whole pixels, and the zoom
 *   rows(t)    people.js drawRow opts: pose, look, bag, board
 *   cabin(t)   cabin.js drawCabin opts: blink, cars
 *   bag(t)     the pretzel bag in the air, { from, to, k, arc, kx, held } between two people.js bagAt states (arc: how
 *              many pixels it lifts at the middle of the way, 6 if not given; kx: how far across it has come, k if not
 *              given; held: the teammate's hands still on it), or null
 *   outside(t) outside.js drawOutside opts: signs, car, lane, blink
 *   under      rows of people the dialog box covers in this framing: the scene leaves them out while the box is up
 *   wordsFrom  the earliest the words may come if A is pressed before say.at (seconds into the shot): for a shot whose
 *              speaker only comes into view, or whose business only happens, partway through
 *   card, fadeIn, fadeOut, bars ('on', or 'out' easing away across the beat), say (stage.js's, look a seat id)
 */
export const SHOTS = [
  // Dawn on the highway: the card, a car overtaking, the RIVERTON 12 sign going by.
  {
    id: 'open', view: 'outside', dur: 7.0, card: true, fadeIn: 0.6, bars: ON,
    outside: () => ({ signs: [{ kind: 'city', at: 5 }], car: 4, lane: 0, blink: null }),
  },
  // Cut in close on the front: the headlights, the grille, the plate. Then out to the hood with the front seats over it,
  // Owen turned to the driver with the map up, and the tilt up to them starts.
  {
    id: 'hood', view: 'cabin', dur: T_HOOD, bars: ON, cabin: () => ROAD, bag: () => null,
    cam: (t) => (t < 1.0 ? { ...FRAME.grille } : tilt(0)(t)),
    rows: () => ({ pose: { owen: OWEN_TURNED }, bag: 'rafi', board: 0 }),
  },
  // The tilt carries on up to the front seats and settles; Owen goes back to his phone.
  {
    id: 'front', view: 'cabin', dur: 2.6, bars: ON, cam: tilt(T_HOOD), cabin: () => ROAD, bag: () => null,
    rows: (t) => ({ pose: { owen: t < 1.4 ? OWEN_TURNED : OWEN_MAP }, bag: 'rafi', board: 0 }),
  },
  // Row 2: Tess asleep, Kai bobbing, and Rafi lifts the pretzels from his lap and puts his arms up with them in his
  // right hand, out to the side where the back row can see them.
  {
    id: 'row2', view: 'cabin', dur: 3.2, bars: ON, cam: pan('front', 'row2', 0, 1.2), cabin: () => ROAD,
    bag: (t) => (t >= 2.0 && t < 2.15 ? { from: 'rafi', to: 'rafi-up', k: easeInOut(seg(t, 2.0, 2.15)), arc: 0 } : null),
    rows: (t) => ({
      pose: { owen: OWEN_MAP, ...(t >= 2.0 && { rafi: CHEER }) },
      bag: t < 2.0 ? 'rafi' : t < 2.15 ? 'none' : 'rafi-up',
      board: 0,
    }),
  },
  // He throws them back over the seat, the camera riding up with them: up past the teammate's ear (the bag goes up the
  // screen first, which is back in the van, and only hooks across at the end) into both hands held up over their head.
  // Then the teammate brings the bag down to their lap. She has a blank board.
  {
    id: 'row3', view: 'cabin', dur: 3.0, bars: ON, cam: pan('row2', 'row3', 0, 1.2), cabin: () => ROAD,
    bag: (t) => {
      if (t >= 0.2 && t < 0.6) {
        const k = seg(t, 0.2, 0.6);
        return { from: 'rafi-up', to: 'teammate-up', k, kx: k ** 3, arc: 3 };
      }
      // Brought down slowly in both hands until the fists reach the hair (1.29), then dropped into the lap.
      return t >= 1.1 && t < 1.4 ? { from: 'teammate-up', to: 'teammate', k: easeIn(seg(t, 1.1, 1.4)), arc: 0, held: t < 1.29 } : null;
    },
    rows: (t) => ({
      pose: {
        ...(t < 0.3 && { rafi: CHEER }),
        ...(t >= 0.45 && t < 1.29 && { teammate: CHEER }),
        ...(t >= 0.7 && t < 2.3 && { hero: SIT(1) }),
      },
      bag: t < 0.2 ? 'rafi-up' : t < 0.6 ? 'none' : t < 1.1 ? 'teammate-up' : t < 1.4 ? 'none' : 'teammate',
      board: 0,
    }),
  },
  // On past the back row to the trailer, rattling along a moment behind the van.
  {
    id: 'trailer', view: 'cabin', dur: 2.6, bars: ON, cam: pan('row3', 'trailer', 0, 1.2), cabin: () => ROAD, bag: () => null,
    rows: () => ({ bag: 'teammate', board: 0 }),
  },
  // Back down from the trailer to the two of them, the teammate turning to her on the way. Nerves: she looks down at
  // her board. A pressed early brings the words no sooner than 0.5 s in (wordsFrom), once the pan has lifted the back
  // row's faces clear of the dialog box's top: before that the box would cover the face of whoever's talking.
  {
    id: 'talk1', view: 'cabin', dur: 2.0, bars: ON, cam: pan('trailer', 'talk', 0, 1.0), cabin: () => ROAD, bag: () => null,
    under: UNDER,
    rows: (t) => ({ pose: t < 0.5 ? {} : TALKING(0), bag: 'teammate', board: 0 }),
    say: say(TALK.talk1, 1.0, 'teammate'),
    wordsFrom: 0.5,
  },
  // The scouting plan: she turns to the teammate and starts writing.
  {
    id: 'talk2', view: 'cabin', dur: 1.0, bars: ON, cam: hold('talk'), cabin: () => ROAD, bag: () => null, under: UNDER,
    rows: (t) => ({ pose: TALKING(1), look: 'teammate', bag: 'teammate', board: lerp(0, 0.5, seg(t, 0.2, 1.0)) }),
    say: say(TALK.talk2, 0, 'teammate'),
  },
  // The robot: outside, to the trailer it's riding in, the two of them talking in the van ahead of it. The camera drops,
  // so the van and the trailer ride high over the dialog box: the trailer's 5026, its wheels and the windows all clear
  // of it. (When the talk comes back in, her board has filled a little more.)
  {
    id: 'talk3', view: 'outside', dur: 1.0, bars: ON,
    outside: () => ({ signs: [], car: null, lane: 0, blink: null, lift: 32 }),
    say: say(TALK.talk3, 0, 'teammate'),
  },
  // The pick list: she writes it down, then looks up.
  {
    id: 'talk4', view: 'cabin', dur: 1.0, bars: ON, cam: hold('talk'), cabin: () => ROAD, bag: () => null, under: UNDER,
    rows: (t) => ({ pose: TALKING(t < 0.8 ? 0 : 1), look: 'teammate', bag: 'teammate', board: lerp(0.7, 1, seg(t, 0, 0.8)) }),
    say: say(TALK.talk4, 0, 'teammate'),
  },
  // The grandma, the glitter, and a pretzel offered: in close on the two of them.
  {
    id: 'talk5', view: 'cabin', dur: 1.0, bars: ON, cam: hold('close'), cabin: () => ROAD, bag: () => null, under: UNDER,
    rows: () => ({ pose: TALKING(1), look: 'teammate', bag: 'teammate', board: 1 }),
    say: say(TALK.talk5, 0, 'teammate'),
  },
  // Back out as the bag slides across to her lap before she's answered. Her answer waits for the bag to land, even if
  // A is pressed early (wordsFrom).
  {
    id: 'pretzel', view: 'cabin', dur: 1.4, bars: ON, cam: hold('talk'), cabin: () => ROAD, under: UNDER,
    bag: (t) => (t >= 0.2 && t < 0.8 ? { from: 'teammate', to: 'hero', k: easeInOut(seg(t, 0.2, 0.8)) } : null),
    rows: (t) => ({ pose: TALKING(1), look: 'teammate', bag: t < 0.2 ? 'teammate' : t < 0.8 ? 'none' : 'hero', board: 1 }),
    say: say(TALK.pretzel, 0.9, 'hero', HERO_NAME),
    wordsFrom: 0.8,
  },
  // Outside again: the EXIT 42 sign, the right signal, the van easing over toward the exit lane.
  {
    id: 'exit', view: 'outside', dur: 4.5, bars: ON,
    outside: (t) => ({ signs: [{ kind: 'exit', at: 2.2 }], car: null, lane: Math.round(3 * easeInOut(seg(t, 1.0, 3.0))), blink: 'right' }),
  },
  // The whole van, framed a little higher so the film bar clears the spare bumpers' numbers: the right signal blinking,
  // the front lamp and the mirror's on the screen's left. As Owen's words start, cut in at x2 on the front seats over the
  // dialog box: Owen turned to Mr. Adeyemi with the map up on his phone, the hands on the wheel. The words and the cut
  // always come together, however early A is pressed (wordsFrom): over the whole van the box would hide the front row
  // and his name tag would sit on his face.
  {
    id: 'arrive', view: 'cabin', dur: 1.8, bars: ON, cam: cut('arrive', 'call', 1.4), cabin: () => ({ blink: 'right', cars: false }), bag: () => null,
    rows: () => ({ pose: { owen: OWEN_TURNED }, bag: 'hero', board: 1 }),
    say: say(ARRIVE, 1.4, 'owen', NAMES.owen),
    wordsFrom: 1.4,
  },
  // Cut back out to the whole van as the bars ease out, and the seat picking takes over on the same frame: the
  // teammate picked, her turned to them.
  {
    id: 'handoff', view: 'cabin', dur: 0.8, bars: 'out', cam: hold('all'), cabin: () => ({ blink: null, cars: false }), bag: () => null,
    rows: () => ({ look: PICK_START, pose: { [PICK_START]: SIT(7) }, bag: 'hero', board: 1 }),
  },
];
