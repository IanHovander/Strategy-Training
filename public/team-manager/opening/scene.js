// The opening, put together for the stage (stage.js runScene): the cold open (cutscene.js), then the pick. The parts
// are the folder's own: Riley the co-captain (cocaptain.js), her phone (phone.js), the handoff insert (handoff.js),
// Norbert in someone's arms and in his corner (norbert-held.js) and the pick (pick.js, on the scouting tablet:
// tablet.js and teams.js). The arena, its people and MC Robin are alliance selection's, borrowed as they are. This file
// only ties them together.
//
// Once the cut scene is over (or skipped) she isn't walking: it's her pick, and the screen is the scouting tablet, the
// 45-second clock counting down from the moment Robin called her up (or from the pick, if SKIP got there first). The stick moves between the cards (update), A picks (act),
// and everything on the tablet can be tapped, the cards picked up and dragged (pointer); pick.js has the rest.
// After the right first pick, the second pick (second.js) has the screen, the stick, A and the taps. On this page, Replay plays the cut scene again; in the play-through, NEXT SCENE moves on.

import { W, H } from '../pixel.js';
import { onStage } from '../stage.js';
import { makeCutscene } from './cutscene.js';
import {
  startPick, updatePick, pressPick, pointPick, drawPickScreen, pickLabel, pickStatus, callUp, pickClock, pickOver,
} from './pick.js';
import {
  resetSecond, updateSecond, pressSecond, pointSecond, drawSecond, secondLabel, secondStatus, secondClock,
} from './second.js';

// After the right first pick, the second pick (second.js) has the screen; ?pick2 in the address goes straight to it.
const PICK2 = new URLSearchParams(location.search).has('pick2');
const second = () => PICK2 || pickOver();

export const scene = {
  name: 'THE OPENING',
  label: "The opening of Blue Banner: her phone, alliance selection in the arena, the co-captain handing her the pick list and Norbert, the pick: a scouting tablet with two teams to choose from and a 45-second clock, and then the second pick: a dashboard where the other alliances pick while she studies the board, then three teams to choose from to beat alliance 5",
  hint: 'Tap a team to pick it, or the stick and A',
  note: "The cut scene waits for A to read on until MC Robin calls her up (A can't hurry the two moments it holds: the co-captain's silent look and Norbert's handoff); from the call it plays by itself, with the clock running, and SKIP jumps to the pick. Then the scouting tablet: 45 seconds to pick a team. Tap a team's card to pick it, or pick the card up and drag it onto your robot's row; or the stick moves between the cards and A picks. The invite asks INVITE or BACK: tap one, or the stick and A. After the right pick, the second pick: Riley sets the goal (A reads on), the other alliances pick while you browse your list (arrow keys or taps; the goal pill at the top opens the goal card), then it's your turn on a 45-second clock: tap a team's tile to look, tap it again (or its card, or A) to pick it. On a keyboard: arrow keys, Space or Enter for A, Esc to skip.",
  world: { w: W, h: H },
  start: { x: -100, y: -100 },
  move: (x, y) => [x, y],
  // Nobody to steer: the stick moves the tablet's cursor, and A picks.
  update: (dt, s) => (second() ? updateSecond(dt, s) : updatePick(dt, s.stick)),
  act: (s) => (second() ? pressSecond(s) : pressPick()),
  // Taps and drags on the tablet, once it's hers (in the cut scene a tap is A).
  pointer: (type, x, y, s) => s.mode === 'free' && (second() ? pointSecond(type, x, y, s) : pointPick(type, x, y)),
  actLabel: () => (second() ? secondLabel() : pickLabel()),
  status: () => (second() ? secondStatus() : pickStatus()),
  // The seconds left while the clock runs, for the sound's ticks.
  clock: (s) => (s.mode !== 'cut' && second() ? secondClock() : pickClock(s.mode === 'cut')),
  cutscene: makeCutscene(),

  onFree: () => {
    startPick();
    resetSecond();
  },
  draw: (g, view, t) => (second() ? drawSecond(t) : drawPickScreen(t)),
};

// Robin's call starts the clock; going back before it (Replay) takes it back.
onStage((type, d, s) => {
  if (type !== 'beat' || s.scene !== scene || d.beat.name === 'pick') return;
  callUp(d.beat.name === 'call' ? performance.now() / 1000 : null);
});
