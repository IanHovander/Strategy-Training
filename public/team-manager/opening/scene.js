// The opening, put together for the stage (stage.js runScene): the cold open (cutscene.js), then the pick. The parts
// are the folder's own: Riley the co-captain (cocaptain.js), her phone (phone.js), the handoff insert (handoff.js),
// Norbert in someone's arms and in his corner (norbert-held.js) and the pick (pick.js). The arena, its people and MC
// Robin are alliance selection's, borrowed as they are. This file only ties them together.
//
// Once the cut scene is over (or skipped) she isn't walking: it's her pick, and the screen is the pick's, the 45-second
// clock counting down from the moment it's hers over the place where the scouting dashboard will go. Nothing to steer
// (stick: false), nobody to talk to; when the clock runs out it says TIME! and waits. On this page, Replay plays the cut
// scene again; in the play-through, NEXT SCENE moves on.

import { W, H } from '../pixel.js';
import { makeCutscene } from './cutscene.js';
import { drawPick, PICK_CLOCK } from './pick.js';

/** When the pick became hers: the first frame after the cut scene. */
const clock = { t0: null };

export const scene = {
  name: 'THE OPENING',
  label: "The opening of Blue Banner: her phone, alliance selection in the arena, the co-captain handing her the pick list and Norbert, and the 45-second pick clock counting down where the scouting dashboard will go",
  hint: 'Your pick: watch the clock',
  note: "The cut scene plays by itself; A reads on, except in the two moments it holds (the co-captain's silent look and Norbert's handoff), and SKIP jumps to the pick. Then the 45-second clock runs over the place where the scouting dashboard will go. On a keyboard: Space or Enter for A, Esc to skip.",
  world: { w: W, h: H },
  start: { x: -100, y: -100 },
  move: (x, y) => [x, y],
  update() {}, // nobody to steer: it's the pick
  stick: false,
  status: () => 'ON THE CLOCK',
  cutscene: makeCutscene(),

  onFree() {
    clock.t0 = null;
  },
  draw(g, view, t) {
    clock.t0 ??= t;
    const s = t - clock.t0;
    // A second on, so the clock doesn't slam in again: the cut scene's last beat already did.
    drawPick(s + 1, PICK_CLOCK - s);
  },
};
