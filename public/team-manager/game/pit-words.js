// What the teams say in the pits. Every pit has someone who'll answer three questions, and what they say is made from
// the event itself: the robot as it really is today (robots.js, its form for the round), what's really happened in its
// matches (state.js worldOf), and the team's own voice, which is where pit scouting gets interesting:
//
//   straight   says what the robot does, about as often as it does it
//   proud      rounds everything up: a level higher, "every match"
//   modest     rounds everything down, and won't promise anything
//
// So what a pit says about its own robot is a claim, and goes in the notebook as one (WHAT THEY SAY), apart from
// anything she's watched. What a pit says about another robot is usually just true: nobody has a reason to flatter the
// team that beat them. And some things are only in the pit on the day they happen: 7461's crew round its intake from
// Friday afternoon, saying it's fine; 6834 swapping theirs.
//
//   QUESTIONS                     the three things she can ask, as the menu has them
//   answer(st, num, k)            what team num says to question k now: { pages (talk.js), heard: [{ num, id, text,
//                                 extra }] lines for the notebook, flag (something it sets: 'strapKnown') }
//   greeting(num), busy(st, num)  a pit's hello, and whether its crew's at work on the robot (for the picture)
//   VOICE, toneOf(num)            each team's voice, and its shirt colours

import { C } from '../pixel.js';
import { tones } from '../cast.js';
import { TEAL } from '../pits/teams.js';
import { TEAMS as ROBOTS } from '../match/robots.js';
import { OURS, NAMES, FRIDAY, piecesOf, climbsFor } from './event.js';
import { worldOf, robotAt, tableOf } from './state.js';
import { pages } from './ui.js';

export const QUESTIONS = ['WHAT DOES YOUR ROBOT DO?', "HOW'S IT RUNNING?", 'SEEN ANYONE GOOD OUT THERE?'];
export const VOICE = {
  5518: 'proud', 7461: 'proud', 1357: 'proud', 4000: 'proud', 9152: 'proud', 7777: 'proud', 8086: 'proud',
  4471: 'modest', 6834: 'modest', 6017: 'modest', 9201: 'modest', 2202: 'modest', 7040: 'modest', 7311: 'modest',
};
const voiceOf = (num) => VOICE[num] ?? 'straight';

/** Shirt colours: the pits' own for the teams that have a pit there, and one of the cast's ramps for the rest. */
const TONES = { 3000: tones.shirtWhite, 7777: tones.black, 4000: TEAL, 2468: tones.shirtBlue, [OURS]: tones.shirtRed, 1357: tones.shirtOrange };
const RAMPS = [tones.shirtGreen, tones.shirtPurple, tones.shirtYellow, tones.hoodie, tones.shirtOrange, tones.shirtBlue, tones.khaki, tones.shirtWhite];
export const toneOf = (num) => TONES[num] ?? RAMPS[(Number(num) * 7 + Math.floor(Number(num) / 100)) % RAMPS.length];
export const printOf = (num) => (num === '7777' ? C.yel1 : toneOf(num) === tones.shirtWhite || toneOf(num) === tones.shirtYellow ? C.ink : C.white);

const HELLO = {
  straight: (num) => [[`HI! ${num}, ${NAMES[num]}.`, 'ASK ME ANYTHING.']],
  proud: (num) => [[`${NAMES[num]}! YOU'VE HEARD OF US.`, 'GO ON, ASK.']],
  modest: (num) => [[`OH. HI. ${num}. ${NAMES[num]}.`, 'WE ARE NOT VERY INTERESTING.']],
};
export const greeting = (num) => HELLO[voiceOf(num)](num);

// ---- What does it do? ----
const LEVELS = ['', 'LOW', 'UP TO LEVEL 2', 'EVERY LEVEL'];
function does(num, robot) {
  const v = voiceOf(num), can = piecesOf(robot), top = Math.max(robot.hatch?.reach ?? 0, robot.cargo?.reach ?? 0);
  const wall = (robot.defense ?? 0) >= 0.7, best = climbsFor(robot)[0];
  const what = can.length > 1 ? 'HATCHES AND CARGO' : can[0] === 'cargo' ? 'CARGO' : 'HATCH PANELS';
  let say, note, l3 = null;
  if (wall && v === 'modest') {
    say = 'MOSTLY WE GET IN THE WAY. A HATCH IN THE SANDSTORM, IF WE ARE LUCKY.';
    note = 'SAYS: MOSTLY WE GET IN THE WAY.';
  } else if (v === 'proud') {
    const up = LEVELS[Math.min(3, Math.max(2, top + 1))];
    say = `${what}, ${up}, AND FAST. FASTER THAN ANYONE HERE.`;
    note = `SAYS: ${what}, ${up}, FAST.`;
  } else if (v === 'modest') {
    say = `${what === 'HATCHES AND CARGO' ? 'A BIT OF BOTH' : `A FEW ${what === 'CARGO' ? 'CARGO' : 'HATCHES'}`}. ${top <= 1 ? 'LOW ONLY.' : 'IT REACHES HIGHER THAN IT USED TO.'} NOTHING FANCY.`;
    note = `SAYS: ${what === 'HATCHES AND CARGO' ? 'A BIT OF BOTH' : what}. NOTHING FANCY.`;
  } else {
    say = `${what}, ${top <= 1 ? (robot[can[0]]?.ship ? 'LOW AND ON THE CARGO SHIP' : 'LOW') : LEVELS[top]}.${wall ? ' AND WE PLAY DEFENSE.' : ''}`;
    note = `SAYS: ${what}, ${top <= 1 ? 'LOW' : LEVELS[top]}.`;
  }
  // The climb: the proud say every match; the straight say about how often; the modest say sometimes.
  let climb = '';
  if (best.level === 3) {
    if (v === 'proud') [climb, l3] = ['AND WE CLIMB LEVEL 3. EVERY MATCH.', 'EVERY MATCH'];
    else if (v === 'modest') climb = 'THERE IS A LEVEL 3 CLIMB ON IT. SOMETIMES IT WORKS.';
    else if (best.odds >= 0.75) [climb, l3] = ['WE CLIMB LEVEL 3 MOST MATCHES.', 'MOST MATCHES'];
    else if (best.odds >= 0.45) climb = 'LEVEL 3 CLIMB ABOUT HALF THE TIME. LEVEL 2 IS SAFE.';
    else climb = 'WE HAVE A LEVEL 3 CLIMB. IT MISSES MORE THAN IT MAKES.';
  } else if (best.level === 2) climb = v === 'proud' ? 'LEVEL 2 CLIMB IN OUR SLEEP.' : 'WE CLIMB TO LEVEL 2.';
  else climb = 'NO CLIMB. WE PARK ON LEVEL 1.';
  // What they said about the climb is a line of its own: it's the one she can check against what she sees.
  const heard = [{ num, id: 'does', text: note.replace('HATCHES AND CARGO', 'HATCH AND CARGO') }];
  if (l3) heard.push({ num, id: 'climb', text: `SAYS: CLIMBS LEVEL 3 ${l3}.`, extra: { l3 } });
  return { pages: [...pages(say), ...pages(climb)], heard };
}

// ---- How's it running? ----
/** Whether a pit's crew is at work on the robot right now: the picture shows it whatever they say. */
export function busy(st, num) {
  const f = ROBOTS[num]?.form?.[0], r = roundNow(st);
  if (num === '7461' && f && r >= f.from) return true;
  if (num === '6834' && f && (r === f.from - 1 || r === f.from - 2)) return true;
  const last = worldOf(st).records[num]?.[r - 1];
  return !!last?.dead;
}
/** The round she's in, as a count of each team's matches played: -1 on Thursday. */
const roundNow = (st) => (st.phase === 'thursday' || st.phase === 'van' ? -1 : st.round);
function running(st, num, robot) {
  const v = voiceOf(num), r = roundNow(st), f = ROBOTS[num]?.form?.[0], heard = [];
  let say, flag = null;
  const last = worldOf(st).records[num]?.[r - 1];
  if (r < 0) say = { proud: 'PERFECT. IT IS ALWAYS PERFECT.', modest: 'IT PASSED INSPECTION. THAT IS A START.', straight: 'JUST THROUGH INSPECTION. NOT A SCRATCH ON IT YET.' }[v];
  else if (num === '7461' && r >= f.from) {
    say = "IT'S FINE. THE INTAKE IS FINE. EVERYTHING IS FINE.";
    heard.push({ num, id: 'state', text: "SAYS IT'S FINE. THREE OF THEM WERE REBUILDING IT." });
  } else if (num === '6834' && r < f.from - 2) {
    say = 'THE INTAKE JAMS ON EVERY SECOND CARGO. WE HAVE A NEW ONE HALF BUILT.';
    heard.push({ num, id: 'state', text: 'INTAKE JAMS. A NEW ONE IS HALF BUILT.' });
  } else if (num === '6834' && r < f.from) {
    say = 'WE ARE SWAPPING THE WHOLE INTAKE. IT GOES ON FOR OUR LAST MATCH TODAY. COME AND WATCH.';
    heard.push({ num, id: 'state', text: 'NEW INTAKE GOES ON FOR THEIR LAST MATCH FRIDAY.' });
  } else if (num === '6834') {
    say = 'THE NEW INTAKE IS ON. IT DOES NOT JAM. WE CAN REACH LEVEL 3 NOW.';
    heard.push({ num, id: 'state', text: 'NEW INTAKE IS ON. REACHES LEVEL 3 NOW.' });
    if (r >= FRIDAY && !st.flags.strap) {
      say += ' ONLY THING IS THE BATTERY STRAP. IT IS FRAYED. IT WILL HOLD.';
      heard.push({ num, id: 'strap', text: 'BATTERY STRAP IS FRAYED. "IT WILL HOLD."' });
      flag = 'strapKnown';
    }
  } else if (last?.dead) {
    say = v === 'proud' ? 'ONE BAD MATCH. THAT WAS THE FIELD, NOT US.' : 'IT DIED OUT THERE LAST MATCH. A LOOSE WIRE, WE THINK. WE ARE CHASING IT.';
    heard.push({ num, id: 'state', text: v === 'proud' ? 'DIED LAST MATCH. SAYS IT WAS THE FIELD.' : 'DIED LAST MATCH. CHASING A LOOSE WIRE.' });
  } else if ((robot.breakdown ?? 0) >= 0.12) {
    say = v === 'proud' ? 'IT IS FINE. IT ONLY STOPS WHEN SOMEONE HITS US.' : 'HONESTLY? IT DROPS OFF THE FIELD ABOUT ONE MATCH IN FIVE.';
    heard.push({ num, id: 'state', text: v === 'proud' ? 'SAYS IT ONLY STOPS WHEN HIT.' : 'DROPS OUT ABOUT ONE MATCH IN FIVE.' });
  } else if ((robot.brownout ?? 0) >= 0.15) {
    say = 'THE BATTERY SAGS WHEN WE PUSH. IT BROWNS OUT FOR A FEW SECONDS.';
    heard.push({ num, id: 'state', text: 'BROWNS OUT WHEN IT PUSHES.' });
  } else say = { proud: 'PERFECT. IT IS ALWAYS PERFECT.', modest: 'IT RUNS. THAT IS ALL I WILL PROMISE.', straight: 'RUNNING FINE. SAME AS IT HAS ALL DAY.' }[v];
  return { pages: pages(say), heard, flag };
}

// ---- Seen anyone good? ----
/** Who stood out in this team's matches so far: a robot that sat on them, or the best score beside or against them. */
function standout(st, num) {
  // Only the rounds that are over: nobody's heard how this round's matches went yet.
  const w = worldOf(st), mine = (w.records[num] ?? []).filter((rec) => rec && rec.round < roundNow(st));
  let wall = null, best = null;
  for (const rec of mine) {
    if (rec.held >= 50 && rec.by[0] && (!wall || rec.pts < wall.pts)) wall = { by: rec.by[0], q: rec.q, pts: rec.pts };
    const m = w.rounds[rec.round].find((x) => x.q === rec.q);
    for (const other of [...m.blue, ...m.red]) {
      if (other === num || other === OURS) continue;
      const o = w.records[other][rec.round];
      if (o && !o.dead && (!best || o.pts > best.pts)) best = { num: other, pts: o.pts, q: rec.q, withUs: o.alliance === rec.alliance };
    }
  }
  return { wall, best };
}
function seen(st, num) {
  const { wall, best } = standout(st, num), heard = [];
  let say;
  if (roundNow(st) <= 0 || (!wall && !best)) say = 'ASK ME AFTER WE HAVE PLAYED A FEW. EVERYONE SAYS 7777 IS QUICK.';
  else if (wall) {
    say = `${wall.by} SAT ON US ALL OF Q${wall.q}. WE SCORED ${wall.pts}. I HAVE NEVER BEEN SO ANNOYED.`;
    heard.push({ num: wall.by, id: `tip-${num}`, text: `${num} SAYS IT HELD THEM TO ${wall.pts} IN Q${wall.q}.` });
  } else {
    say = `${best.num} PUT UP ${best.pts} ${best.withUs ? 'BESIDE' : 'AGAINST'} US IN Q${best.q}.${best.pts >= 45 ? ' WHERE DID THAT COME FROM?' : ''}`;
    heard.push({ num: best.num, id: `tip-${num}`, text: `${num} SAYS IT SCORED ${best.pts} IN Q${best.q}.` });
  }
  return { pages: pages(say), heard };
}

/** What team num says to question k (0 to 2) now. */
export function answer(st, num, k) {
  const robot = robotAt(num, Math.max(0, roundNow(st)));
  return [does, (n, r) => running(st, n, r), (n) => seen(st, n)][k](num, robot);
}

/** Riley, in her own pit: where the team stands, as the rankings have it. */
export function rileyLines(st) {
  const t = tableOf(st).find((x) => x.num === OURS);
  const where = t?.played ? [[`WE'RE ${t.rank} OF 24. ${t.w} WON, ${t.l} LOST,`, `${t.rp} RANKING POINTS.`], [t.rank <= 8 ? 'TOP EIGHT. IF IT STAYS LIKE THIS,' : 'THE TOP EIGHT PICK ON SATURDAY.', t.rank <= 8 ? 'WE PICK ON SATURDAY.' : "WE'VE NEVER BEEN ONE OF THEM."]]
    : [["LOAD-IN'S DONE. ROBOT'S THROUGH", 'INSPECTION. MATCHES START TOMORROW.']];
  return [...where, ['HOW HAVE YOU GOT NORBERT? HE NEVER', 'LEAVES MY BAG.'], ['...KEEP HIM. HE LIKES YOU. GO AND', "LOOK AT ROBOTS. I'LL MIND THE PIT."]];
}
