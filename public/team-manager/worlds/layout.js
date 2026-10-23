// The World Championship's hall, in numbers: eight division fields side by side, each one the arena's whole world
// (field.js: the field, its driver stations and the open floor past both ends), and the hall going on past the first
// and the last. Between one division's bleachers and the next hangs a curtain with the division's sign and big screen
// on it. The rest of this folder takes its positions from here, so the parts line up.
//   ox(k)             where division k's own world starts: its local x 0 is world x ox(k)
//   divisionAt(x)     which division's world a world x is in (the pads count as the first and the last)
//   matchState(k, t)  the match on division k's field t seconds in, for its big screen and its scoring table

import { clamp, rnd } from '../pixel.js';
import { WORLD_W } from '../field.js';

/** One division is the arena's whole world, 784 pixels: the field and both ends. */
export const PITCH = WORLD_W;
/** The hall past Archimedes and past Newton, and the end walls at its very edges. */
export const PAD_L = 136, PAD_R = 192, WALL = 30;
/** How far above the arena's top row the hall goes (the ceiling and the truss): only the cut scene looks up there. */
export const TOP = -64;

// Left to right, the eight divisions of the 2026 Championship. Each field plays out of step with the others (offset:
// seconds added to its clock) with its own robots: teams are the numbers on the blue elevator, the red elevator, the
// blue arm and the red defender (field.js); queue, the two robots waiting on carts; qual, the match its screen starts
// on. The numbers are made up: don't give them team names.
export const DIVISIONS = [
  { name: 'ARCHIMEDES', teams: ['8214', '6431', '3092', '9175'], queue: ['4519', '7062'], offset: 0, qual: 34 },
  { name: 'CURIE', teams: ['2643', '9318', '5770', '1189'], queue: ['6824', '3357'], offset: 5.3, qual: 31 },
  { name: 'DALY', teams: ['7349', '4102', '8865', '2591'], queue: ['9930', '1446'], offset: 10.9, qual: 36 },
  { name: 'GALILEO', teams: ['3818', '6267', '1974', '8546'], queue: ['5203', '7781'], offset: 2.7, qual: 29 },
  { name: 'HOPPER', teams: ['9452', '2736', '6610', '4089'], queue: ['3165', '8327'], offset: 8.1, qual: 33 },
  { name: 'JOHNSON', teams: ['5591', '8740', '2208', '6953'], queue: ['1532', '9614'], offset: 21, qual: 30 },
  { name: 'MILSTEIN', teams: ['4476', '1820', '7395', '3641'], queue: ['8058', '2417'], offset: 4.4, qual: 35 },
  { name: 'NEWTON', teams: ['6187', '3529', '9046', '4762'], queue: ['8890', '5026'], offset: 15.2, qual: 32 },
];
/** 5026's division: their robot waits in Newton's queue, on the second cart. */
export const HOME = 7;

export const WORLD = { w: PAD_L + DIVISIONS.length * PITCH + PAD_R, h: 144 };
export const ox = (k) => PAD_L + k * PITCH;
export const divisionAt = (x) => clamp(Math.floor((x - PAD_L) / PITCH), 0, DIVISIONS.length - 1);

// Local to ox(k):
/** Each division's bleachers (bleachers.js, clipped): from the aisle stairs at one end to the stairs at the other. */
export const STANDS = { x0: 106, x1: 678 };
/** The curtain between two blocks of stands runs from ox(k) - GATEWAY to ox(k) + GATEWAY, down to the floor at row 55. */
export const GATEWAY = 106;
/**
 * On the curtain at ox(k): division k's sign, beside its own stands, and on the other half the big screen of the
 * division on the left, over that field's scoring table, so a field's screen and its table show the same match (the
 * curtain past Newton carries Newton's, and the one by the left wall a second Archimedes screen). Rows are world rows.
 * The sign stops well short of the curtain's end, so someone standing there in front of the curtain (Newton's teammate)
 * has a clear head, and the bubble over them lands on bare cloth. Both hang from the same top line, high enough that
 * the head of anyone standing on the floor in front of the hem's barrier stays under the sign and covers at most the
 * screen's bottom bezel: the screen is only a little taller than the sign, the division and its match number on one
 * line, the score and the clock under it.
 */
export const SIGN = { x0: 6, x1: 84, y0: 4, y1: 26 };
export const SCREEN = { x0: -98, x1: -18, y0: 4, y1: 32 };

// World positions:
/**
 * Where she stands when the cut scene ends: on the open floor just short of Newton's walkway, by its queue, in front of
 * 5026's own stands, turned to the teammate, who has come up from 5026's robot in the queue and stands on her left in
 * front of the dark curtain, beside Newton's sign, a little further back, turned to her: a head's width between them.
 * The teammate stands clear of the walkway and of the way down to the aisle, so she never has to walk through anyone:
 * the walkway opens on her right, and the way back to the aisle is down past the teammate's feet, between them and
 * the queue. Both stand high on the floor, so her feet are well clear of the top of 5026's elevator in the queue below
 * her (a foot on the tip of a mast would read as standing on it).
 */
export const START = { x: ox(HOME) + 124, y: 59, dir: 6 };
export const MATE = { x: START.x - 22, y: 56, dir: 2 };
/**
 * Belt barriers along the curtains' hems, their posts standing on floor line BARRIER_Y (hall.js draws them, and they
 * stop her): the floor at the foot of a curtain is kept clear, so nobody walks along under the signs and screens with
 * their head across a division's name or score. Each aisle has two runs, one under the screen and one under the sign,
 * a gap too narrow to pass between them on the line between the two divisions (so each run belongs to one division's
 * field, sorted in with its things), and they stop short of the walkways at both ends: the screen's run far enough
 * along that nobody standing at the walkway's mouth has their face against the screen's edge. The pads have one each.
 */
export const BARRIER_Y = 70;
export const BARRIERS = [
  { x0: WALL + 6, x1: ox(0) + 88 },
  ...DIVISIONS.slice(1).flatMap((_, i) => [{ x0: ox(i + 1) - 112, x1: ox(i + 1) - 12 }, { x0: ox(i + 1) - 4, x1: ox(i + 1) + 88 }]),
  { x0: ox(DIVISIONS.length) - 112, x1: WORLD.w - WALL - 6 },
];
/**
 * Two tables on the floor (hall.js draws them, people.js puts someone behind each): along x0-x1, floor lines back to
 * front, far enough forward that whoever stands behind one leaves the floor in front of the hem's barrier open.
 */
export const BUTTON_TABLE = { x0: ox(6) - 44, x1: ox(6) - 4, back: 95, front: 102 };
export const INFO_DESK = { x0: ox(HOME) + PITCH + 38, x1: ox(HOME) + PITCH + 94, back: 90, front: 98 };

// ---- The matches ----
// Every division plays its own qualification matches, out of step with the others: two and a half minutes of play,
// then half a minute to reset. The scores climb a few points at a time and hold at the end until the next match.
export const PLAY = 150, RESET = 30;
/** into: seconds since this match started (past PLAY, it's over and the field is being reset). */
export function matchState(k, t) {
  const u = Math.max(0, t + DIVISIONS[k].offset * 9 + 25), n = Math.floor(u / (PLAY + RESET)), into = u - n * (PLAY + RESET);
  const p = Math.min(1, into / PLAY);
  const total = (seed) => 34 + Math.floor(rnd(seed) * 48); // what an alliance ends on: 34 to 81
  const sofar = (seed, lag) => Math.round(total(seed) * Math.min(1, Math.floor(p * 15 + lag) / 15));
  return {
    qual: DIVISIONS[k].qual + n,
    clock: Math.ceil(PLAY - Math.min(PLAY, into)), // seconds left: 150 down to 0, then 0 through the reset
    playing: into < PLAY,
    into,
    blue: sofar(k * 97 + n * 13 + 1, 0),
    red: sofar(k * 131 + n * 17 + 5, 0.5),
  };
}
/** Seconds as the match clock shows them: 2:30. */
export const clockText = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
