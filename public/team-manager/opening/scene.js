// The opening, put together for the stage (stage.js runScene): the cold open (cutscene.js), then the pick. The parts
// are the folder's own: Riley the co-captain (cocaptain.js), her phone (phone.js), the handoff insert (handoff.js),
// Norbert in someone's arms and in his corner (norbert-held.js) and the pick (pick.js, on the scouting tablet:
// tablet.js and teams.js). The arena, its people and MC Robin are alliance selection's, borrowed as they are. This file
// only ties them together.
//
// Once the cut scene is over (or skipped) she isn't walking: it's her pick, and the screen is the scouting tablet, the
// 45-second clock counting down from the moment Robin called her up (or from the pick, if SKIP got there first). The stick moves between the cards (update), A picks (act),
// and everything on the tablet can be tapped, the cards picked up and dragged (pointer); pick.js has the rest.
// After the right first pick, the second pick (second.js) has the screen, the stick, A and the taps, and after
// both picks the quarterfinal (quarter.js). On this page, Replay plays the cut scene again; in the play-through, NEXT SCENE moves on.

import { W, H } from '../pixel.js';
import { onStage } from '../stage.js';
import { makeCutscene } from './cutscene.js';
import {
  startPick, updatePick, pressPick, pointPick, drawPickScreen, pickLabel, pickStatus, callUp, pickClock, pickOver,
} from './pick.js';
import {
  resetSecond, updateSecond, pressSecond, pointSecond, drawSecond, secondLabel, secondStatus, secondClock, secondOver,
} from './second.js';
import {
  resetQuarter, updateQuarter, pressQuarter, pointQuarter, drawQuarter, quarterLabel, quarterStatus,
} from './quarter.js';

// After the right first pick, the second pick (second.js) has the screen, and after both picks the quarterfinal
// (quarter.js). ?pick2 in the address goes straight to the second pick, ?qf to the quarterfinal.
const Q = new URLSearchParams(location.search);
const PICK2 = Q.has('pick2'), QF = Q.has('qf');
const quarter = () => QF || secondOver();
const second = () => PICK2 || pickOver();
/** Whichever part has the screen: the first pick, the second, or the quarterfinal. */
const part = () => (quarter() ? 'qf' : second() ? 'p2' : 'p1');

export const scene = {
  name: 'THE OPENING',
  label: "The opening of Blue Banner: her phone, alliance selection in the arena, the co-captain handing her the pick list and Norbert, the pick: a scouting tablet with two teams to choose from and a 45-second clock, and then the second pick: a dashboard where the other alliances pick while she studies the board, then three teams to choose from to beat alliance 5, and then the quarterfinal, best 2 of 3: two matches played quickly on the field, and match 3 frozen at 20 seconds left for the endgame call, Level 2 or Level 3",
  hint: 'Tap a team to pick it, or the stick and A',
  note: "The cut scene waits for A to read on until MC Robin calls her up (A can't hurry the two moments it holds: the co-captain's silent look and Norbert's handoff); from the call it plays by itself, with the clock running, and SKIP jumps to the pick. Then the scouting tablet: 45 seconds to pick a team. Tap a team's card to pick it, or pick the card up and drag it onto your robot's row; or the stick moves between the cards and A picks. The invite asks INVITE or BACK: tap one, or the stick and A. After the right pick, the second pick: Riley sets the goal (A reads on), the other alliances pick while you browse your list (arrow keys or taps; the goal pill at the top opens the goal card), then it's your turn on a 45-second clock: tap a team's tile to look, tap it again (or its card, or A) to pick it. After both picks, the quarterfinal: A plays each match (and skips ahead in one); at 0:20 in match 3, tap LEVEL 2 or LEVEL 3, or the stick and A. On a keyboard: arrow keys, Space or Enter for A, Esc to skip.",
  world: { w: W, h: H },
  start: { x: -100, y: -100 },
  move: (x, y) => [x, y],
  // Nobody to steer: the stick moves the tablet's cursor, and A picks.
  update: (dt, s) => ({ qf: updateQuarter, p2: updateSecond }[part()] ?? ((d, st) => updatePick(d, st.stick)))(dt, s),
  act: (s) => ({ qf: pressQuarter, p2: pressSecond }[part()] ?? (() => pressPick()))(s),
  // Taps and drags on the tablet, once it's hers (in the cut scene a tap is A).
  pointer: (type, x, y, s) => s.mode === 'free'
    && ({ qf: pointQuarter, p2: pointSecond }[part()] ?? ((ty, px, py) => pointPick(ty, px, py)))(type, x, y, s),
  actLabel: () => ({ qf: quarterLabel, p2: secondLabel }[part()] ?? pickLabel)(),
  status: () => ({ qf: quarterStatus, p2: secondStatus }[part()] ?? pickStatus)(),
  // The seconds left while the clock runs, for the sound's ticks (the quarterfinal's clock has no ticks).
  clock: (s) => {
    if (s.mode === 'cut') return pickClock(true);
    return { qf: null, p2: secondClock(), p1: pickClock(false) }[part()];
  },
  cutscene: makeCutscene(),

  onFree: () => {
    startPick();
    resetSecond();
    resetQuarter();
  },
  draw: (g, view, t) => ({ qf: () => drawQuarter(g, t), p2: () => drawSecond(t) }[part()] ?? (() => drawPickScreen(t)))(),
};

// Robin's call starts the clock; going back before it (Replay) takes it back.
onStage((type, d, s) => {
  if (type !== 'beat' || s.scene !== scene || d.beat.name === 'pick') return;
  callUp(d.beat.name === 'call' ? performance.now() / 1000 : null);
});
