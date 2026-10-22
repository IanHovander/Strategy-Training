// The people: the bleachers along the field's far side, aluminium tiers and the crowd on them, and everyone you can
// stop and talk to. Everyone is drawn with the walker's rig (walker.js) in their own look, with hand-drawn heads from the
// front and the side. Below the stands runs the walkway, the closest a strategist gets to the field (field.js), where a
// volunteer minds the gate. The drive teams stand at their stations; past the ends of the field a queuer runs the queue
// and the scorekeeper sits at the scoring table. Everything is in world pixels, seen through a camera at camX.

import { C, rnd } from './pixel.js';
import { drawWalker } from './walker.js';
import { look, tones, skinBody, SKIN, HAIR, stranger } from './cast.js';
import { drawBubble } from './talk.js';
import { WORLD_W, FIELD, STATION, GATE, floorY } from './field.js';

// Where the tiers' footboards are, front row first; each row sits 14 pixels higher than the one in front of it.
const TIERS = [48, 34, 20];
const AISLES = [-70, 66, 166, 282, 362, 492].map((dx) => [FIELD.x0 + dx, FIELD.x0 + dx + 10]);

// The people you can talk to: the front row, and the volunteer at the gate. Lines are pages of up to two lines, 38
// characters each.
export const PEOPLE = [
  {
    id: 'rosa', name: 'ROSA, 5026 PARENT', x: FIELD.x0 + 30, tier: 0,
    look: look('rosa', { ...skinBody('brown'), shirt: tones.shirtRed }, 'curls', { ...SKIN.brown, ...HAIR.brown }),
    lines: [
      ['YOU ARE ON 5026? MY KID BUILT', 'THAT ELEVATOR. TWO STAGES!'],
      ["I DON'T KNOW ALL THE RULES, BUT I", 'KNOW EXACTLY WHEN TO SCREAM.'],
    ],
  },
  {
    id: 'adeyemi', name: 'MR. ADEYEMI, MENTOR', x: FIELD.x0 + 110, tier: 0,
    look: look('adeyemi', { ...skinBody('deep'), shirt: tones.shirtBlue, jeans: tones.khaki, cuff: tones.khaki, print: null }, 'glasses',
      { ...SKIN.deep, ...HAIR.grey, q: '#aab2c8' }),
    lines: [
      ['DEFENSE WINS ELIMINATIONS. WATCH', 'WHO PLAYS IT IN QUALS.'],
      ['AND WRITE IT ON THAT BOARD BEFORE', 'YOU FORGET IT. IT IS BLANK!'],
    ],
  },
  {
    id: 'milo', name: 'MILO, AGE 9', x: FIELD.x0 + 332, tier: 0,
    look: look('milo', { ...skinBody('light'), shirt: tones.shirtWhite, print: '#d3212f' }, 'cap',
      { ...SKIN.light, ...HAIR.chestnut, c: '#1d55e8', C: '#4a90ff', D: '#0a237a' }),
    lines: [
      ['IS THAT YOUR ROBOT? IT CLIMBED SO', 'HIGH!'],
      ["WHEN I'M IN HIGH SCHOOL I'M JOINING", '5026. SAVE ME A SPOT.'],
    ],
  },
  {
    id: 'juno', name: 'JUNO, SCOUTING FOR 7777', x: FIELD.x0 + 394, tier: 0,
    look: look('juno', { ...skinBody('tan'), shirt: tones.shirtYellow, jeans: tones.black, cuff: tones.black, print: C.ink }, 'bun',
      { ...SKIN.tan, ...HAIR.black }),
    lines: [
      ['HATCH ON LEVEL 3 IN UNDER TEN', 'SECONDS. YES, I WROTE THAT DOWN.'],
      ['OUR DEFENDER WILL BE WAITING AT', 'YOUR ROCKET. NOTHING PERSONAL.'],
    ],
  },
  {
    id: 'dani', name: 'DANI, 5026 ALUM', x: FIELD.x0 + 228, tier: 0,
    look: look('dani', { ...skinBody('fair'), shirt: tones.hoodie, print: '#d3212f' }, 'bob',
      { ...SKIN.fair, ...HAIR.black, r: '#d3212f', R: '#ff6a55' }),
    lines: [
      ['WE NEVER MADE HAB 3 IN MY YEAR.', "YOU'RE LIVING THE DREAM."],
      ['SCOUT EVERYONE. THE BEST PICKS', 'ARE NEVER THE FLASHIEST ROBOTS.'],
    ],
  },
  {
    id: 'sam', name: 'SAM, FIELD VOLUNTEER', x: GATE.x1 + 4, y: 61, standing: true,
    look: look('sam', { ...skinBody('tan'), shirt: tones.shirtGreen, jeans: tones.khaki, cuff: tones.khaki, print: '#ffc61a' }, 'cap',
      { ...SKIN.tan, ...HAIR.black, c: '#1d5e3a', C: '#2e8b57', D: '#0b2a1a' }),
    lines: [
      ['SORRY, THE FIELD IS DRIVE TEAMS', 'ONLY. NOT EVEN STRATEGISTS.'],
      ['THE STANDS ARE THE BEST SEAT FOR', 'SCOUTING ANYWAY. GO GET THEM.'],
    ],
  },
  {
    id: 'priya', name: 'PRIYA, QUEUER', x: 28, y: 84, standing: true,
    look: look('priya', { ...skinBody('brown'), shirt: tones.shirtOrange, jeans: tones.black, cuff: tones.black, print: C.ink }, 'bun',
      { ...SKIN.brown, ...HAIR.black }),
    lines: [
      ['MATCH 43 IS QUEUING. THOSE TWO ARE', 'UP NEXT, THEN 5026 RIGHT AFTER.'],
      ['TELL YOUR DRIVE TEAM THE PLAN', 'BEFORE THEY GET HERE, NOT AFTER.'],
    ],
  },
  {
    id: 'gus', name: 'GUS, SCOREKEEPER', x: WORLD_W - 57, y: 96, standing: true,
    look: look('gus', { ...skinBody('fair'), shirt: tones.hoodie, jeans: tones.black, cuff: tones.black, print: null }, 'glasses',
      { ...SKIN.fair, ...HAIR.grey, q: '#aab2c8' }),
    lines: [
      ['BLUE 41, RED 38. THE CLIMBS AT THE', 'END SWING MORE MATCHES THAN YOU THINK.'],
      ['WANT THE BREAKDOWN? HATCHES, CARGO,', 'CLIMBS, FOULS. IT IS ALL ON MY SCREEN.'],
    ],
  },
];

// The rest of the crowd, filling the rows around them. Nobody here needs to talk. Fourteen looks go round, so the
// rig only has to draw fourteen strangers.
const FAN_LOOKS = Array.from({ length: 14 }, (_, i) => stranger(i));
// A seat every 20 pixels or so down each row, leaving the aisles clear and room around the people with something to say.
const FANS = [];
TIERS.forEach((_, tier) => {
  for (let x = 12 + tier * 7; x < WORLD_W - 8; x += 18 + Math.floor(rnd(x * 3 + tier) * 8)) {
    if (AISLES.some(([a, b]) => x > a - 8 && x < b + 8)) continue;
    if (tier === 0 && PEOPLE.some((p) => !p.standing && Math.abs(p.x - x) < 20)) continue;
    FANS.push({ id: `fan${FANS.length}`, x, tier, look: FAN_LOOKS[(FANS.length * 5 + tier) % FAN_LOOKS.length] });
  }
});
const SEATED = [...PEOPLE.filter((p) => !p.standing), ...FANS];
// The drivers at their stations, behind the alliance walls, in their teams' shirts and turned to the field, controllers
// up; and in the queue, a drive team member behind each robot.
const DRIVE_SHIRTS = { blue: [tones.shirtRed, tones.shirtBlue, tones.shirtWhite], red: [tones.shirtYellow, tones.shirtOrange, tones.shirtGreen] };
const CREW = [
  ...['blue', 'red'].flatMap((alliance, a) => [4.5, 13.5, 22.5].map((z, station) => ({
    id: `driver${a}${station}`, x: alliance === 'blue' ? FIELD.x0 - 18 : FIELD.x1 + 18, y: Math.round(floorY(z)),
    dir: alliance === 'blue' ? 2 : 6, gait: 'drive', look: stranger(a * 3 + station + 3, DRIVE_SHIRTS[alliance][station]),
  }))),
  { id: 'queue0', x: 70, y: 104, look: stranger(9, tones.shirtPurple) },
  { id: 'queue1', x: 100, y: 102, look: stranger(12, tones.shirtGreen) },
];
/** Everyone standing up, to be sorted in with the field by their feet. */
export const STANDING = [...PEOPLE.filter((p) => p.standing), ...CREW];

// ---- Drawing ----
/** The walkway: concrete between the front row and the field's far wall, with a yellow edge line. */
export function drawWalkway(g, camX) {
  g.fillStyle = '#353a4c';
  g.fillRect(0, TIERS[0] + 2, 256, 64 - TIERS[0]);
  for (let i = 0; i < 520; i++) {
    const x = Math.floor(rnd(i + 3000) * WORLD_W) - camX;
    if (x < 0 || x >= 256) continue;
    g.fillStyle = rnd(i + 7) < 0.5 ? '#3b4154' : '#30354a';
    g.fillRect(x, TIERS[0] + 2 + Math.floor(rnd(i + 4000) * (64 - TIERS[0])), 1, 1);
  }
  // The yellow line runs along the field and the driver stations; past them the floor opens out.
  g.fillStyle = '#ffc61a';
  g.fillRect(FIELD.x0 - STATION - camX, 65, FIELD.x1 - FIELD.x0 + 2 * STATION, 1);
}

/**
 * Sitting or, now and then, cheering. Given a cheer (0 to 1), about that share of the crowd is on its feet together,
 * arms pumping: up and down every quarter second or so, each to their own beat. The same people join in first as it
 * grows, so a swelling cheer spreads through the stands instead of flickering.
 */
function gaitOf(p, t, cheer) {
  if (cheer > 0 && rnd(p.x * 7 + p.tier * 31 + 5) < cheer) {
    const beat = 0.22 + rnd(p.x + p.tier * 3 + 11) * 0.1;
    return Math.floor(t / beat + rnd(p.x * 3 + 17) * 2) % 2 ? 'sit' : 'cheer';
  }
  const every = 5 + rnd(p.x + p.tier * 7) * 6, phase = (t + rnd(p.x + 1) * 9) % every;
  return phase < 0.5 ? 'cheer' : 'sit';
}

/** The stands and the crowd. o.cheer: 0 to 1, the share of the crowd cheering together (see gaitOf). */
export function drawStands(g, camX, t, talkingTo, o = {}) {
  g.fillStyle = '#10142c';
  g.fillRect(0, 0, 256, TIERS[0] + 2);
  for (let tier = TIERS.length - 1; tier >= 0; tier--) {
    const y = TIERS[tier];
    // Seat plank, the shadow under it, then the footboard.
    g.fillStyle = '#c4cbe0'; g.fillRect(0, y - 12, 256, 1);
    g.fillStyle = '#9aa3bd'; g.fillRect(0, y - 11, 256, 2);
    g.fillStyle = '#5d6580'; g.fillRect(0, y - 9, 256, 1);
    g.fillStyle = '#1a1f38'; g.fillRect(0, y - 8, 256, 7);
    g.fillStyle = '#aab2c8'; g.fillRect(0, y - 1, 256, 2);
    g.fillStyle = '#4b5269'; g.fillRect(0, y + 1, 256, 1);
    // The aisles' steps, with their yellow nosing.
    for (const [x0, x1] of AISLES) {
      g.fillStyle = '#7882a3'; g.fillRect(x0 - camX, y - 12, x1 - x0, 13);
      g.fillStyle = '#ffc61a'; g.fillRect(x0 - camX, y - 1, x1 - x0, 1);
      g.fillRect(x0 - camX, y - 12, x1 - x0, 1);
    }
    for (const p of SEATED) {
      if (p.tier === tier && p.x > camX - 20 && p.x < camX + 276) {
        drawWalker(g, p.x - camX, y, 0, p === talkingTo ? 'sit' : gaitOf(p, t, o.cheer), 0, p.look);
      }
    }
  }
}

/** Someone standing: facing you unless they're turned somewhere, and just standing unless they're driving. */
export const drawStanding = (g, camX, p) => drawWalker(g, p.x - camX, p.y, p.dir ?? 0, p.gait ?? 'stand', 0, p.look);

const feetOf = (p) => (p.standing ? p.y : TIERS[p.tier]);
/** The person in reach of someone standing at (x, y) on the walkway, if any. */
export function inReach(x, y) {
  let best = null, bestD = Infinity;
  for (const p of PEOPLE) {
    const d = Math.abs(p.x - x);
    const close = p.standing ? d < 14 && Math.abs(p.y - y) < 8 : d < 11;
    if (close && d < bestD) [best, bestD] = [p, d];
  }
  return best;
}
/** Where they are, for turning to face them. */
export const seatOf = (p) => ({ x: p.x, y: feetOf(p) - 10 });

/** A speech bubble with A in it over someone you can talk to. */
export function drawPrompt(g, camX, p, t) {
  drawBubble(g, p.x - camX + 11, feetOf(p) - (p.standing ? 50 : 41), t);
}
