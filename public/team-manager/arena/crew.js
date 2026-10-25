// The people who work the arena's field between matches, and what they push and carry, drawn: each team's drive team
// (a technician and a driver) in the team's own shirts, the field reset volunteers, the robots riding their carts, and
// what's said over the speakers. flow.js says where everyone is; this file draws them, in world pixels through
// pixel.js's camera, each as { y, draw } to sort in with the field (field.js drawFieldLive's more).
//
// A team's shirts are the pits' for the teams with a pit there (pits/teams.js: 3000 in white, 7777 in black and yellow,
// and the rest), 5026's merch for 5026 (cast.js student), and otherwise one of the crowd's shirts picked by the number,
// so a team looks the same every time it comes round. The faces come from the crowd's rotation (cast.js stranger), a
// handful of them, so the walker's rig has few new looks to draw. The field crew wear the volunteers' green, like Sam.
//
//   teamLook(num, i)          a team member's look: 0 the technician, 1 the driver
//   crewLook(i)               a field volunteer's look
//   folkPart(camX, p)         someone ({ x, y, dir, gait, frame, look }) on the floor, shadow and all
//   cartPart(c), carriedPart(c)   a cart with its robot (or empty), and a robot in people's hands, as flow.js has them
//   drawSay(say, top)         the words over the speakers, in a band across the bottom of the screen (the top: top)

import { C, W, rect, screen, fill, text, measure, withAlpha } from '../pixel.js';
import { robotCart } from '../field.js';
import { drawWalker } from '../walker.js';
import { look, tones, skinBody, SKIN, HAIR, SHIRTS, stranger, student } from '../cast.js';
import { drawBot } from '../match/bots.js';
import { TEAMS as PITS } from '../pits/teams.js';
import { OURS } from '../opening/teams.js';
import { MC_LOOK } from '../alliance-selection/mc.js';
import { MC_NAME } from '../alliance-selection/layout.js';

// ---- Looks ----
const hash = (num) => [...String(num)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 17);
const looks = new Map();
/** A team member's look: i 0 is the technician, 1 the driver. The same every time the team comes round. */
export function teamLook(num, i) {
  const key = `${num}/${i}`;
  if (looks.has(key)) return looks.get(key);
  const h = hash(num), face = (h + i * 5) % 14;
  const made = num === OURS ? student(face, 'tee') : stranger(face, PITS[num]?.tone ?? SHIRTS[h % SHIRTS.length]);
  looks.set(key, made);
  return made;
}
/** The field crew: volunteers in green, as Sam at the gate is. */
const CREW = [
  look('crew0', { ...skinBody('brown'), shirt: tones.shirtGreen, jeans: tones.khaki, cuff: tones.khaki, print: '#ffc61a' }, 'bun', { ...SKIN.brown, ...HAIR.black }),
  look('crew1', { ...skinBody('light'), shirt: tones.shirtGreen, jeans: tones.black, cuff: tones.black, print: '#ffc61a' }, 'glasses',
    { ...SKIN.light, ...HAIR.auburn, q: '#aab2c8' }),
];
export const crewLook = (i) => CREW[i % CREW.length];

// ---- Drawing ----
/** Someone on the floor, seen through a camera at camX, with the soft shadow everyone walking about has (stage.js). */
export function folkPart(g, camX, p) {
  return {
    y: p.y,
    draw: () => {
      const x = Math.round(p.x) - camX, y = Math.round(p.y);
      g.fillStyle = 'rgba(5, 6, 13, 0.45)';
      g.fillRect(x - 6, y - 1, 12, 3);
      g.fillRect(x - 4, y - 2, 8, 5);
      drawWalker(g, x, y, p.dir ?? 0, p.gait ?? 'stand', p.frame ?? 0, p.look);
    },
  };
}

/** A push handle on one end of a cart (side -1 left, +1 right): a steel tube up from the deck, a grip on top (as the pits'). */
function pushHandle(x, y, side) {
  const hx = x + side * 17;
  rect(hx - 1, y - 26, 3, 15, C.ink);
  rect(hx, y - 25, 1, 13, C.steel3);
  rect(hx + side * 2 - 3, y - 27, 7, 3, C.ink);
  rect(hx + side * 2 - 2, y - 26, 5, 1, C.steel2);
}
/** A cart, empty or with its robot on the deck, its casters turning as it rolls. */
export function cartPart(c) {
  const x = Math.round(c.x), y = Math.round(c.y);
  return {
    y,
    draw: () => {
      if (c.handle) pushHandle(x, y, c.handle);
      robotCart(x, y, (rx, ry) => c.bot && drawBot(c.bot.kind, rx, ry, c.bot.state));
      if (c.roll != null) {
        const k = Math.floor(c.roll / 2) % 2;
        for (const cx of [x - 15, x + 13]) {
          rect(cx, y - 2, 2, 1, C.steel1);
          rect(cx + k, y - 2, 1, 1, C.steel3);
        }
      }
    },
  };
}
/** A robot in people's hands: its floor point under it, its state's up how high they hold it. */
export const carriedPart = (c) => ({ y: c.y + 0.5, draw: () => drawBot(c.kind, c.x, c.y, c.state) });

// ---- The speakers ----
const TAGS = { [MC_NAME]: MC_LOOK.pal.shirt[1], ANNOUNCER: C.blue1 };
/**
 * What's being said over the speakers (say: { name, line, since }, since: seconds it's been said): who in a coloured
 * tag, then the line, typing out the way the dialog box's do, in a band across the bottom of the screen, in front of the
 * near wall, or across the top (over the stands) when she's down at the bottom herself (top: true).
 */
export function drawSay(say, top = false) {
  if (!say) return;
  screen();
  const tag = say.name, line = say.line.slice(0, Math.max(1, Math.floor((say.since ?? 9) * 40)));
  const tw = measure(tag, { font: 3 }) + 6, lw = measure(say.line, { font: 3 });
  const w = tw + lw + 10, x = Math.round(W / 2 - w / 2), y = top ? 3 : 132;
  withAlpha(0.85, () => fill(x - 1, y - 1, w + 2, 11, C.ink));
  fill(x + 1, y + 1, tw, 7, TAGS[tag] ?? C.steel1);
  text(tag, x + 4, y + 2, { font: 3, color: C.white });
  text(line, x + tw + 5, y + 2, { font: 3, color: C.white });
}
