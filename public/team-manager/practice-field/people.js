// The people: team 5026 at practice in the cafeteria after school, and the custodian who wants his tables back.
// Everyone is drawn on the walker's rig (walker.js) in a look made from cast.js, the same construction as the arena's
// crowd: the shirt, trousers and shoes in three tones, one of the hand-drawn heads from the front, in profile and from
// behind, and a soft shadow on the floor under anyone standing. The drive team stands behind the homemade driver
// station, turned to the field: the teammate is the drive coach, Jalen drives and Mei runs the elevator, both on
// controllers, and Ines, the human player, holds the next hatch panel ready at the loading station. Ms. Okafor, the
// mentor, times every cycle on her stopwatch from beside the centre line (both hands on it, drawn over them here), and
// Noor scouts the practice on her tablet.
// Theo tunes the elevator at a laptop on a cafeteria table, Bea minds the battery cart, Kai keeps people off the carpet
// while the robot runs (standing off it himself, in front of its tape), and Mr. Flores, the custodian, waits by his cart.
// Two more students make the room busy without a word to say: one sits scouting at the far table with a tablet, and one
// resets the field. He waits off the carpet by the folded tables, and only while the robot is parked at the station
// between reps does he run on, pull the hatch it placed back off the rocket and run back, the way teams reset a practice
// field.
//
// Where they stand and which way they face is layout.js's SPOTS; a cut scene can move, turn, re-pose or lift anyone
// (o.cast). Everything is in world pixels: the caller sets pixel.js's camera before each draw, and the rig's sprites are
// placed through stage.js's drawPerson and drawWithShadow, which take the view themselves.

import { C, rect } from '../pixel.js';
import { hatch } from '../sprites.js';
import { HERO_LOOK } from '../walker.js';
import { look, student, skinBody, SKIN, HAIR, HEADS, tones, MERCH, TEAMMATE_NAME } from '../cast.js';
import { TEAMMATE_LOOK } from '../teammate.js';
import { drawPerson, drawWithShadow, along } from '../stage.js';
import { SPOTS } from './layout.js';
import { RESET } from './robot.js';

// A pullover hoodie, the way cast.js makes students': long sleeves and the hood round the neck, with the team badge.
const hoodie = (l, badge = TEAMMATE_LOOK.badge) => ({ ...l, hoodie: true, sleeves: 'long', ...(badge ? { badge } : {}) });

/** A mentor's polo in teal, a mid tone that holds against the cafeteria's dim wall and floor, and isn't the students'
 *  red. Shade, mid, lit. */
const POLO = ['#16525a', '#1f7f86', '#47b3b0'];
/** Jalen: the cap head, with his brows from the front in his skin's shade. In the near-black of his hair they run into
 *  his eyes and read as an X. (From the side and behind, the head is cast.js's.) The seated scout has the cap head too,
 *  and the same brows, which in her dark blonde read as a scowl from the front, the only way she's seen. */
const JALEN = look('pf-jalen', { ...skinBody('brown'), ...MERCH.tee }, 'cap', { ...SKIN.brown, ...HAIR.black, c: '#d3212f', C: '#ff6a55', D: '#6b0f1b' });
const CAP_FRONT = HEADS.cap.map((row) => row.replaceAll('g', 'd'));
const capFront = (l) => ({ ...l, heads: { ...l.heads, s: CAP_FRONT, se: CAP_FRONT, sw: CAP_FRONT } });

/** Everyone's look, by id. The drive gait's pad is whatever they hold: the drivers' controllers and Noor's tablet. Ms.
 *  Okafor's is in her skin's tones, so it reads as her two hands together, and her stopwatch is drawn over them. */
export const LOOKS = {
  // A teal mentor's polo with the red logo, khakis, her hair up.
  okafor: look('pf-okafor', { ...skinBody('deep'), shirt: POLO, print: '#d3212f', jeans: tones.khaki, cuff: tones.khaki, pad: skinBody('deep').skin },
    'bun', { ...SKIN.deep, ...HAIR.black }),
  teammate: TEAMMATE_LOOK,
  jalen: capFront(JALEN),
  mei: hoodie(look('pf-mei', { ...skinBody('light'), ...MERCH.hoodie }, 'bob', { ...SKIN.light, ...HAIR.black, r: HAIR.black.h, R: HAIR.black.H })),
  ines: student(3, 'hoodie'),
  noor: look('pf-noor', { ...skinBody('tan'), ...MERCH.tee, jeans: tones.black, cuff: tones.black, pad: ['#232838', '#3f4761', '#a8d2ff'] },
    'bun', { ...SKIN.tan, ...HAIR.brown }),
  // A navy hoodie with no badge, glasses.
  theo: hoodie(look('pf-theo', { ...skinBody('fair'), shirt: tones.hoodie, hem: ['#0b0f1c', '#141a2e', '#232a44'], print: null },
    'glasses', { ...SKIN.fair, ...HAIR.chestnut, q: '#aab2c8' }), null),
  bea: look('pf-bea', { ...skinBody('light'), ...MERCH.tee, jeans: tones.khaki, cuff: tones.khaki }, 'curls', { ...SKIN.light, ...HAIR.auburn }),
  // Safety yellow and safety glasses.
  kai: look('pf-kai', { ...skinBody('brown'), shirt: tones.shirtYellow, print: '#ff7a1c' }, 'glasses', { ...SKIN.brown, ...HAIR.black, q: '#a8d2ff' }),
  // A khaki work shirt with a name patch, a navy cap. (Blue-grey work shirts vanish into the cafeteria's tiles.)
  flores: look('pf-flores', { ...skinBody('tan'), shirt: tones.khaki, jeans: tones.black, cuff: tones.black, print: '#e8ecf5' },
    'cap', { ...SKIN.tan, ...HAIR.grey, c: '#232a44', C: '#3a4466', D: '#141a2e' }),
  reset: student(5, 'tee'),
  scout: { ...capFront(student(2, 'tee')), id: 'pf-scout' },
  hero: HERO_LOOK,
};

/** The name tag in the dialog box, for everyone she can talk to. */
export const NAMES = {
  okafor: 'MS. OKAFOR, MENTOR',
  teammate: TEAMMATE_NAME,
  jalen: 'JALEN, DRIVER',
  mei: 'MEI, OPERATOR',
  ines: 'INES, HUMAN PLAYER',
  noor: 'NOOR, SCOUTING LEAD',
  theo: 'THEO, PROGRAMMER',
  bea: 'BEA, BATTERIES',
  kai: 'KAI, SAFETY CAPTAIN',
  flores: 'MR. FLORES, CUSTODIAN',
};

/** The drive team, who stand behind the station wall. */
const DRIVE_TEAM = ['ines', 'teammate', 'jalen', 'mei'];

/** Ines stands where she has to get past her, so she keeps only her own body clear and the back strip behind the field
 *  stays open behind her (she stands a step out from the wall, so the strategist's face clears her head). Everyone else
 *  keeps the whole of peopleBlocks' room round them: Kai, in front of the carpet, makes her walk round in front of him at
 *  the front of the room, far enough out that her head passes his chest, not his face. */
const SLIM = { ines: [10, 4, 5] };

/** The people she can talk to, at the spot she talks to them from (Theo beside his table). She talks to anyone on their
 *  feet from a step away (peopleBlocks keeps her there), so they're in reach a little further off than stage.js's 14
 *  pixels, and the drive team from further still: she comes at them from the floor beside the station. The SLIM one
 *  she can walk right past, so she's in reach only from beside her (apart: at least that far along), never from just
 *  in front, where she'd stand over her face, or just behind, where she'd stand over hers; and from further back, so
 *  she can talk to her from the back strip behind the field, where her face is clear above Ines's head (reachY). Kai
 *  is in reach from beside him a little further across the front strip than stage.js's 10 pixels, but not from the
 *  lane in front of him. Their lines come from words.js. */
export const PEOPLE = Object.keys(NAMES).map((id) => {
  const at = SPOTS[id].talk ?? SPOTS[id];
  return {
    id, name: NAMES[id], x: at.x, y: at.y, look: LOOKS[id],
    faceGait: SPOTS[id].gait === 'sit' ? 'sit' : 'stand',
    reach: SPOTS[id].gait === 'sit' ? 14 : DRIVE_TEAM.includes(id) ? 30 : 22,
    ...(SLIM[id] && { apart: SLIM[id][0] + 4 }),
    ...(id === 'kai' && { reachY: 12 }),
    ...(id === 'ines' && { reachY: 18 }),
  };
});

// Ines holds the next hatch panel in both hands, ready for the slot, edge-on to you like the one on the robot's
// grabber: the drive gait's arms, the controller in her skin's tones so it reads as her hands. She stands a step from
// the station wall, so she holds the panel close, where the wall doesn't hide it. Facing east its near edge is this
// far in front of her feet and its middle this high; facing west it's mirrored. It's sorted after the first feet of
// the drivers' shelf, whose plank starts just in front of her and would otherwise cut across the panel's lower half.
const HOLD = { dx: 3, up: 23, after: 11 };
const INES_HOLDING = { ...LOOKS.ines, id: 'pf-ines-hatch', pal: { ...LOOKS.ines.pal, pad: LOOKS.ines.pal.skin } };
const facing = (dir) => (dir >= 1 && dir <= 3 ? 1 : dir >= 5 && dir <= 7 ? -1 : 0);

// Ms. Okafor's stopwatch, over her hands: a round silver face with its highlight at the upper left, the hand at twelve,
// the crown on top, an ink outline. Where her hands are in each direction, from her feet (the drive gait's pad, which
// her body hides when she's turned away: null).
const WATCH = ['..k..', '.kck.', '.kkk.', 'kWkSk', 'kSkSk', 'kSSDk', '.kkk.'];
const WATCH_PAL = { k: C.ink, c: C.steel2, S: C.steel3, W: C.white, D: C.steel2 };
const WATCH_AT = [[0, 21], [7, 23], [8, 26], null, null, null, [-9, 26], [-8, 23]];
function stopwatch(x, y, dir) {
  const at = WATCH_AT[dir];
  if (!at) return;
  const x0 = Math.round(x) + at[0] - 2, y0 = Math.round(y) - at[1] - 5;
  WATCH.forEach((row, j) => [...row].forEach((ch, i) => WATCH_PAL[ch] && rect(x0 + i, y0 + j, 1, 1, WATCH_PAL[ch])));
}

// The drivers' controllers. Facing the field, the drive gait's pad is edge-on, a line of three pixels at their hands,
// right where the drivers' shelf (the plank along the inside of the station wall, halffield.js) and the wall's edge run
// down the picture, so it doesn't read. Instead a controller is drawn in their hands, sorted after the stretch of plank
// in front of them, so it rests on it: a dark pad with its two sticks lit, a hand on either end. Its left end is this
// far in front of their feet, its top this high up. Turned any other way, the rig's own pad shows.
const PAD = ['.kk.kk.', 'khhkhhk', 'kgSgSgk', '.kkkkk.'];
const PAD_AT = { dx: 3, up: 28 };
function controller(x, y, look) {
  const pal = { k: C.ink, h: look.pal.skin[2], g: C.steel0, S: C.steel3 };
  const x0 = Math.round(x) + PAD_AT.dx, y0 = Math.round(y) - PAD_AT.up;
  PAD.forEach((row, j) => [...row].forEach((ch, i) => pal[ch] && rect(x0 + i, y0 + j, 1, 1, pal[ch])));
}
const DRIVERS = ['jalen', 'mei'];

// The field reset (robot.js RESET): from his spot by the folded tables, onto the carpet past its far corner and along
// behind the cargo ship to the rocket's front, where he reaches the hatch on its home face; he gets there just before
// `pull`, holds it a moment and runs back the same way, off the carpet before the robot moves. At a run the way in takes
// 1.69 seconds.
const RESET_PATH = [[SPOTS.reset.x, SPOTS.reset.y], [340, 108], [294, 110]];
const RESET_BACK = [...RESET_PATH].reverse();
function resetting(since) {
  const hold = 0.1;
  if (since < RESET.pull + hold) {
    const p = along(RESET_PATH, since, 'run');
    return p.gait === 'stand' ? { ...p, dir: 3 } : p; // turned to the rocket's home face
  }
  const p = along(RESET_BACK, since - RESET.pull - hold, 'run');
  return p.gait === 'stand' ? { ...p, dir: SPOTS.reset.dir } : p;
}

/** Someone at their spot, with the cut scene's changes (only the ones it sets) over it. */
function placed(id, o) {
  const p = { id, ...SPOTS[id], look: LOOKS[id] };
  for (const [k, v] of Object.entries(o.cast?.[id] ?? {})) if (v != null) p[k] = v;
  return p;
}

/**
 * Everyone, as things to sort back to front by their feet: [{ id, x, y, draw }]. Standing people have a shadow; with lift
 * they hop, the shadow staying on the floor. Seated people have none, and their table, sorted after them, hides their
 * legs. o.cast: { id: { x, y, dir, gait, dist, lift } } moves, turns or re-poses anyone. o.robot: the robot's state
 * (robot.js robotAt), which says when Ines has a hatch ready and when the field is being reset. Anyone the cut scene
 * places stays where it puts them. The drivers facing the field come with a second thing, their controller over the
 * shelf (controller above), and so does Ines with the hatch she holds out.
 */
export function peopleThings(g, view, t, o = {}) {
  return Object.keys(SPOTS).flatMap((id) => {
    const p = placed(id, o);
    if (id === 'reset' && o.robot?.reset != null && !o.cast?.reset) Object.assign(p, resetting(o.robot.reset));
    const holding = id === 'ines' && (o.robot ? o.robot.hp : true) && o.cast?.ines?.gait == null && facing(p.dir ?? 0) !== 0;
    if (holding) Object.assign(p, { gait: 'drive', look: INES_HOLDING });
    const pad = DRIVERS.includes(id) && p.gait === 'drive' && p.dir === 2 && !p.lift;
    const side = facing(p.dir ?? 0);
    const person = {
      id, x: p.x, y: p.y,
      draw() {
        if (p.gait === 'sit') return drawPerson(g, view, p);
        if (p.lift) {
          // stage.js drawWithShadow's shadow, left on the floor while they're in the air.
          const x = Math.round(p.x - view.x), y = Math.round(p.y - view.y);
          g.fillStyle = 'rgba(5, 6, 13, 0.45)';
          g.fillRect(x - 6, y - 1, 12, 3);
          g.fillRect(x - 4, y - 2, 8, 5);
          drawPerson(g, view, { ...p, y: p.y - Math.round(p.lift) });
        } else drawWithShadow(g, view, p);
        if (id === 'okafor' && p.gait === 'drive') stopwatch(p.x, p.y - (p.lift ?? 0), p.dir ?? 0);
      },
    };
    const held = () => hatch(Math.round(p.x) + (side > 0 ? HOLD.dx : -HOLD.dx - 3), Math.round(p.y) - HOLD.up);
    return [
      person,
      ...(holding ? [{ id, x: p.x, y: p.y + HOLD.after, draw: held }] : []),
      ...(pad ? [{ id, x: p.x, y: p.y + 4, draw: () => controller(p.x, p.y, p.look) }] : []),
    ];
  });
}

/** The drive team's footprint behind the station wall, over the four of them and the gaps between, so she can't
 *  squeeze in among them. She talks to them from the open floor beside it (PEOPLE's reach). */
const DRIVE_BLOCK = { x0: 114, x1: 146, y0: 98, y1: 166 };

/**
 * Footprints round everyone, for the scene's move(), so she never stands in someone. With move()'s own 4 pixels along
 * and 2 of depth: beside them she stops 18 pixels off, where two heads turned to each other in profile keep a little
 * air between them; behind them, 10 pixels of floor back; in front, 7 pixels out to the side, but 16 straight in front,
 * where her head comes up no higher than their chin. The SLIM three have just their body blocked, x +-dx and y from
 * -back to +front. The two sitting have their chair blocked behind their table (which blocks too), so she can't stand
 * in it.
 */
export function peopleBlocks() {
  const round = ([id, p]) => {
    if (p.gait === 'sit') return [{ x0: p.x - 10, x1: p.x + 10, y0: p.y - 12, y1: p.y }];
    if (SLIM[id]) {
      const [dx, back, front] = SLIM[id];
      return [{ x0: p.x - dx, x1: p.x + dx, y0: p.y - back, y1: p.y + front }];
    }
    return [{ x0: p.x - 14, x1: p.x + 14, y0: p.y - 8, y1: p.y + 5 }, { x0: p.x - 8, x1: p.x + 8, y0: p.y + 5, y1: p.y + 14 }];
  };
  return [...Object.entries(SPOTS).flatMap(round), DRIVE_BLOCK];
}
