// The opening, put together for the stage (stage.js runScene): the cold open (cutscene.js), then the pick. The parts
// are the folder's own: Riley the co-captain (cocaptain.js), her phone (phone.js), the handoff insert (handoff.js),
// Norbert in someone's arms and in his corner (norbert-held.js) and the pick (pick.js, on the scouting tablet:
// tablet.js and teams.js). The arena, its people and MC Robin are alliance selection's, borrowed as they are. This file
// only ties them together.
//
// Once the cut scene is over (or skipped) she isn't walking: it's her pick, and the screen is the scouting tablet, the
// 45-second clock counting down from the moment it's hers. The stick moves between the cards (update), A picks (act),
// and everything on the tablet can be tapped, the cards picked up and dragged (pointer); pick.js has the rest. On this page, Replay plays the cut scene again; in the play-through, NEXT SCENE moves on.

import { W, H } from '../pixel.js';
import { makeCutscene } from './cutscene.js';
import { startPick, updatePick, pressPick, pointPick, drawPickScreen, pickLabel, pickStatus } from './pick.js';

export const scene = {
  name: 'THE OPENING',
  label: "The opening of Blue Banner: her phone, alliance selection in the arena, the co-captain handing her the pick list and Norbert, and the pick: a scouting tablet with two teams to choose from and a 45-second clock",
  hint: 'Tap a team to pick it, or the stick and A',
  note: "The cut scene plays by itself; A reads on, except in the two moments it holds (the co-captain's silent look and Norbert's handoff), and SKIP jumps to the pick. Then the scouting tablet: 45 seconds to pick a team. Tap a team's card to pick it, or pick the card up and drag it onto your robot's row; or the stick moves between the cards and A picks. The invite asks INVITE or BACK: tap one, or the stick and A. On a keyboard: arrow keys, Space or Enter for A, Esc to skip.",
  world: { w: W, h: H },
  start: { x: -100, y: -100 },
  move: (x, y) => [x, y],
  // Nobody to steer: the stick moves the tablet's cursor, and A picks.
  update: (dt, s) => updatePick(dt, s.stick),
  act: () => pressPick(),
  // Taps and drags on the tablet, once it's hers (in the cut scene a tap is A).
  pointer: (type, x, y, s) => s.mode === 'free' && pointPick(type, x, y),
  actLabel: () => pickLabel(),
  status: () => pickStatus(),
  cutscene: makeCutscene(),

  onFree: () => startPick(),
  draw: (g, view, t) => drawPickScreen(t),
};
