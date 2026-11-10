// Thursday, 6:40 AM, again: the van. It's the van scene's own cabin (../van/scene.js) and its own people in their
// seats, with words of the game's: she's just come back from Saturday, Norbert's in her lap, and the first thing she
// learns is that the senior strategist is out all weekend, so the notebook's hers from the start this time. Then the
// stick picks a seat, as it does there, and everyone has something true to say about the event ahead: how seeding
// works, what her own robot can do, what a pit will tell her and what it won't. Nobody says what to do with it.
//
//   vanRide(st)   the ride; ARRIVE (top right) gets out at the event

import { C } from '../pixel.js';
import { bars, placeCard, cover } from '../stage.js';
import { HERO_LOOK } from '../walker.js';
import { HERO_NAME, TEAMMATE_NAME } from '../cast.js';
import { TEAMMATE_LOOK } from '../teammate.js';
import { scene as van } from '../van/scene.js';
import { FRAME } from '../van/layout.js';
import { SENDER } from '../opening/phone.js';
import { walk } from './run.js';
import { corner } from './hud.js';
import { OURS } from './event.js';

const me = (...lines) => ({ name: HERO_NAME, tag: C.red1, lines });
/** What everyone says from their seat. Each knows something true about the weekend ahead. */
const LINES = {
  teammate: [
    ['TEN QUALIFICATION MATCHES. 23 OTHER', "ROBOTS. YOU CAN'T WATCH THEM ALL."],
    ["SO DON'T TRY. WATCH THE ONES YOU'D", 'WANT BESIDE US ON SATURDAY.'],
    ["I'LL SIT WITH YOU FROM FRIDAY LUNCH.", 'TWO PAIRS OF EYES: TWO ROBOTS A MATCH.'],
  ],
  bea: [
    ['A PIT WILL TELL YOU THEIR ROBOT DOES', 'EVERYTHING. EVERY PIT. EVERY YEAR.'],
    ['WATCH IT DO THE THING. THEN WRITE', 'IT DOWN. IN THAT ORDER.'],
  ],
  kai: [
    ['TELL ME THE PLAN BEFORE A MATCH AND', "I'LL DRIVE IT. ANY PLAN."],
    ['HATCHES ARE OUR THING. ALL THREE', "LEVELS. WE DON'T TOUCH CARGO."],
    ['THE CLIMB? LEVEL 2 I NEVER MISS.', 'LEVEL 3 IS SIX IN TEN. ON A GOOD DAY.'],
  ],
  adeyemi: [
    ["WINS DON'T SEED YOU. RANKING POINTS", 'DO. TWO FOR A WIN.'],
    ['ONE MORE FOR FILLING A WHOLE ROCKET.', 'ONE MORE FOR 15 POINTS OF CLIMBING.'],
    ['THE TOP EIGHT PICK THEIR ALLIANCES', `ON SATURDAY. ${OURS} HAS NEVER BEEN ONE.`],
  ],
  owen: [
    ['THE PIT MAP SAYS 24 TEAMS, ONE LONG', 'ROW. WE ARE SEVENTH FROM THE DOOR.'],
    ['THE APP ALSO SAYS TURN LEFT. THERE', 'IS NO LEFT. THERE IS A COW.'],
  ],
  rafi: [
    ['FUN FACT. CARGO ONLY STAYS IN A BAY', 'WITH A HATCH PANEL IN FRONT OF IT.'],
    ['NO PANEL, IT ROLLS RIGHT BACK OUT.', 'I WATCHED US LEARN THAT IN WEEK ONE.'],
    ['PRETZEL?'],
  ],
  tess: [
    ['MMF. FIVE MORE MINUTES.'],
    ['EVERY ROBOT BREAKS ON FRIDAY. THE', 'GOOD PITS FIX IT BY SATURDAY.'],
  ],
};

export async function vanRide(st) {
  for (const p of van.people) if (LINES[p.id]) p.lines = LINES[p.id];
  const view = { x: 0, y: FRAME.all.y };
  const cabin = (g) => van.draw(g, view, performance.now() / 1000, { talk: null });
  const shot = (g, t, extra) => {
    cabin(g);
    bars(1);
    extra?.(t);
    corner(st);
  };
  const mate = (lines) => ({ name: TEAMMATE_NAME, look: TEAMMATE_LOOK, lines });
  const hers = (lines) => ({ name: HERO_NAME, look: HERO_LOOK, lines, tag: C.red1 });
  const scene = {
    ...van,
    name: 'THE VAN',
    cutscene: [
      { dur: 1.2, draw: (g, t) => shot(g, t, () => { placeCard(t, 'THE VAN', 'THURSDAY 6:40 AM'); cover(1 - t / 0.6); }) },
      { dur: 0.6, draw: (g, t) => shot(g, t, () => placeCard(t + 1.2, 'THE VAN', 'THURSDAY 6:40 AM')), say: hers([['...THE VAN?'], ["IT'S THURSDAY. IT'S THURSDAY AGAIN."]]) },
      { dur: 0.4, draw: shot, say: mate([['YOU OKAY? YOU JUMPED. AND SINCE WHEN', 'DOES RILEY LET ANYONE HOLD NORBERT?']]) },
      { dur: 0.4, draw: shot, say: hers([[`${SENDER}'S OUT SICK ALL WEEKEND. RIGHT?`]]) },
      { dur: 0.4, draw: shot, say: mate([['THE TEXT ONLY JUST CAME. HOW DID YOU...', "FINE. YES. SO THE NOTEBOOK'S YOURS."]]) },
      { dur: 0.4, draw: shot, say: hers([['THREE DAYS THIS TIME. NOT 45 SECONDS.'], ["I'M GOING TO WATCH EVERY ROBOT I CAN."]]) },
      { dur: 0.5, draw: (g, t) => shot(g, t, () => bars(1 - t / 0.5)) },
    ],
    draw(g, v, t, s) {
      van.draw(g, v, t, s);
      corner(st);
    },
  };
  await walk(scene, { nextLabel: 'ARRIVE' });
  void me;
}
