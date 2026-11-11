// The opening: Saturday, 12:38 PM, and she's thrown in. The cut scene is the opening's own (../opening/cutscene.js):
// her phone, the arena, Riley handing her the pick list and Norbert, MC Robin calling her up. What follows it is hers.
//
//   the picks      alliance selection, for real (draft.js): the senior strategist's page on the tablet, every team
//                  that's left on her list, 45 seconds. She can invite anyone. Whoever she picks, she's got.
//   the playoffs   her alliance against whoever the bracket gives it (playoffs.js), every match the simulation's.
//                  The first one's on the drive coach's plan, so the first thing she's asked is the call at 0:30; from
//                  the second match the plan's hers too. Lose a series and it's over. Win, and it goes on.
//   after          wherever it ended, Riley and her on the floor, a page each: how far they got, and that she picked a
//                  robot she'd never seen play. Norbert answers, and winds it all back to Thursday: his reading runs down
//                  as he does it, 12.4V to 12.0V.
//
// Nobody tells her whether a pick was good. The matches do, a little; mostly they leave her with questions, which is
// what the next three days are for.
//
//   coldOpen(st)   the whole of it; leaves the save on Thursday morning, loop 1. Coming back to a save that closed
//                  after the playoffs (st.cold is set), it starts at after.

import { C, W } from '../pixel.js';
import { cover } from '../stage.js';
import { HERO_LOOK } from '../walker.js';
import { HERO_NAME } from '../cast.js';
import { makeCutscene } from '../opening/cutscene.js';
import { COCAPTAIN_LOOK, COCAPTAIN_NAME } from '../opening/cocaptain.js';
import { SENDER } from '../opening/phone.js';
import { show } from './run.js';
import { Draft } from './draft.js';
import { Wind } from './wind.js';
import { playoffs } from './playoffs.js';
import { makeDraft, OURS } from './event.js';
import { RANKING, TAKEN, pageInfo, pageStats, avgOf } from './cold-data.js';
import { corner } from './hud.js';
import { save, voltsOf } from './state.js';
import { ENDED, afterPage, LAST, WISH, CALL } from './guide.js';

/** How much time she has on Thursday for the pits, in conversations (state.js time). */
export const THURSDAY_TIME = 5;

/** A word from Riley after each pick: in character, a senior who's as nervous as she is. Never a verdict. */
function react(num, n) {
  const first = {
    7461: `RILEY: "7461. BIGGEST NUMBER ON ${SENDER}'S PAGE. OKAY."`,
    6834: 'RILEY: "6834? THEY WERE NOBODY ON FRIDAY MORNING. ...OKAY."',
    6417: 'RILEY: "6417. STEADY. I CAN LIVE WITH STEADY."',
    4471: 'RILEY: "A DEFENDER? WITH OUR FIRST PICK? ...IT\'S YOUR LIST."',
    5518: 'RILEY: "THE LEVEL 3 KIDS. THAT\'S A SWING."',
  };
  const second = { 4471: 'RILEY: "A WALL. HUH. WHO\'S IT FOR?"', 5518: 'RILEY: "IF THAT CLIMB WORKS, I\'LL SCREAM."' };
  return (n === 1 ? first[num] : second[num]) ?? (n === 1 ? `RILEY: "${num}. OKAY. WE'VE GOT A PARTNER."` : `RILEY: "${num}. THAT'S US, THEN. THREE ROBOTS."`);
}

const riley = (lines) => ({ name: COCAPTAIN_NAME, look: COCAPTAIN_LOOK, lines, tag: C.red0 });
const her = (lines) => ({ name: HERO_NAME, look: HERO_LOOK, lines, tag: C.red1 });

export async function coldOpen(st) {
  const beats = makeCutscene();
  if (!st.cold) {
    // The cut scene: it ends as Robin calls her up, and the tablet comes straight in after it.
    await show({ name: 'THE OPENING', label: "The opening of Blue Banner: her phone, alliance selection in the arena, the co-captain handing her the pick list and Norbert", cutscene: beats, start() { this.done(); }, draw() {} });

    // The picks.
    const stats = pageStats(), draft = makeDraft(RANKING, { stats });
    for (const n of TAKEN) draft.pick(n);
    const sel = await show(new Draft({
      st, draft, stats, info: pageInfo, lists: [{ name: `${SENDER}'S PAGE: BY AVERAGE`, by: avgOf }], react, used: 2,
    }), { fade: false });

    // The playoffs, with whoever she's got.
    const res = await playoffs(st, { alliances: sel.alliances, stats, seed: st.seed * 3 + 1, guided: true });
    st.cold = { picks: sel.mine, reached: res.reached, alliance: sel.alliances[sel.ours].teams, out: res.out?.teams ?? null };
    save(st);
  }

  // After: the two of them, close, as at the handoff; and Norbert.
  const okay = beats.find((b) => b.name === 'okay');
  const shot = (g) => okay.draw(g, 1, { T: 0, k: 1 });
  const says = (say) => ({ dur: 0.4, draw: shot, say });
  await show({
    name: 'AFTER', label: 'Riley and the strategist on the arena floor after the playoffs, Norbert in her arms',
    cutscene: [
      { dur: 0.9, draw: (g, t) => { shot(g); cover(1 - t / 0.7); } },
      says(riley([ENDED[st.cold.reached] ?? ENDED.qf])),
      says(her([afterPage(st.cold.picks?.[0])])),
      says(riley([LAST])),
      says(her([WISH])),
      // A beat with nothing said: his ear lights, and something inside him clicks (sounds/cues.js keys it by name).
      { name: 'glow', dur: 1.9, hold: 1.9, draw: (g, t) => { shot(g); corner(st, { glow: t > 0.3 ? 0.5 + 0.5 * Math.sin(t * 9) : 0 }); } },
      says(her([CALL])),
    ],
    start() { this.done(); }, draw() {},
  });
  // Winding back costs him: his reading runs down in his empty corner as the key turns, to what he has on Thursday.
  await show(new Wind({
    st, bg: shot, last: 'TWO DAYS EARLIER', volts: [voltsOf(st), voltsOf({ ...st, loop: 1 })],
    stops: ['SATURDAY 3:10 PM', 'SATURDAY 12:38 PM', 'SATURDAY 9:00 AM', 'FRIDAY 4:30 PM', 'FRIDAY 8:30 AM', 'THURSDAY 2:00 PM', 'THURSDAY 6:40 AM'],
  }), { fade: false });
  Object.assign(st, { loop: 1, phase: 'van', round: 0, time: THURSDAY_TIME });
  save(st);
  void W;
  void OURS;
}
