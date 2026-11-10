// Blue Banner, the game: from the opening to the end of the first event. NEW SEASON on the title screen comes here
// (play.html). The season is a story told from top to bottom, each part waiting for the one before (run.js), and the
// save (state.js) is written between them, so closing the page and coming back carries on from the last thing done.
//
//   the opening     Saturday 12:38 PM: thrown in at alliance selection with one page (cold.js), then wound back
//   Thursday        the van, and the pits at load-in: time to look round before a match has been played
//   Friday          seven rounds. Each round: the arena or the pits, as she likes, then her own match
//   Saturday        three more rounds, then the boss fight: alliance selection and the playoffs (boss.js)
//   the end         the event on a card, and back to the title
//
// From the address bar: ?new starts a new season whatever's saved; ?seed=N fixes the event's schedule and dice; and
// for trying one part by itself, ?at=van | thursday | quals | boss | end (with ?round=N for quals) starts a season there,
// its earlier matches played on the drive coach's plans and the notebook part filled in. stage.js's ?mute works too.

import { setRoot, show, walk } from './run.js';
import '../sound.js';
import { newSave, load, save, observe, worldOf, playTo, resultOf, discover, tableOf, canWind } from './state.js';
import { coldOpen, THURSDAY_TIME } from './cold.js';
import { vanRide } from './van.js';
import { pitHall } from './pitrow.js';
import { arenaHub, TWO_FROM } from './hub.js';
import { ourQual } from './quals.js';
import { boss, autoPlan, statsOf } from './boss.js';
import { Watch } from './watch.js';
import { Wind } from './wind.js';
import { dayCard, night } from './cards.js';
import { Verdict, trainerCard } from './ending.js';
import { toast } from './hud.js';
import { OURS, ROUNDS, FRIDAY, makeDraft } from './event.js';

const root = document.getElementById('stage');
setRoot(root);
const Q = new URLSearchParams(location.search);
/** Pips of time in a round: a pit conversation takes one, watching a match two. */
const ROUND_TIME = 3;

/** A match watched from the stands: her eyes on one robot (and her teammate's on another), and the notebook after. */
async function watchQual(st, q, focus) {
  const result = resultOf(st, q, true);
  await show(new Watch({ st, title: `Q${q}`, q, sim: () => result, focus: focus[0], also: focus[1] ?? null, sub: `WATCHING ${focus.join(' AND ')}` }));
  observe(st, q, focus, 'watch');
  st.time = Math.max(0, st.time - 2);
  toast(discover(st));
  save(st);
}

/** The ten rounds: wherever she likes, for as long as the round's time lasts, then her match. */
async function quals(st) {
  let from = 'queue';
  while (st.round < ROUNDS) {
    if (st.round === FRIDAY && !st.flags.saturday) {
      st.flags.saturday = true;
      save(st);
      const t = tableOf(st).find((x) => x.num === OURS);
      await show(dayCard(st, 'SATURDAY', '8:00 AM', [`THREE MATCHES LEFT. ${OURS} IS RANKED ${t.rank} OF 24.`, 'THE TOP EIGHT PICK THEIR ALLIANCES AT LUNCH.', 'EVERY PIT WORKED LATE LAST NIGHT.']));
    }
    if (st.round === TWO_FROM && !st.flags.two) {
      st.flags.two = true;
      save(st);
      await show(dayCard(st, 'FRIDAY', '12:30 PM', ['YOUR TEAMMATE SITS WITH YOU IN THE STANDS NOW.', 'TWO PAIRS OF EYES: TWO ROBOTS A MATCH.']));
    }
    const out = await walk(st.place === 'pits' ? pitHall(st, { from: 'arena' }) : arenaHub(st, { from }));
    if (out.to === 'pits') st.place = 'pits';
    else if (out.to === 'arena') [st.place, from] = ['arena', 'pits'];
    else if (out.to === 'watch') {
      await watchQual(st, out.q, out.focus);
      from = 'stands';
    } else if (out.to === 'match') {
      await ourQual(st, st.round);
      st.round++;
      st.time = ROUND_TIME;
      from = 'queue';
    }
    save(st);
  }
  st.phase = 'selection';
  save(st);
}

/** The boss fight, as many times as she winds it back; then the card. */
async function finale(st) {
  const t = tableOf(st).find((x) => x.num === OURS);
  await show(dayCard(st, 'ALLIANCE SELECTION', 'SATURDAY 12:38 PM', [
    `${OURS} FINISHED ${t.rank} OF 24.`, t.rank <= 8 ? 'TOP EIGHT: AN ALLIANCE CAPTAIN.' : 'THE TOP EIGHT PICK. EVERYONE ELSE WAITS TO BE ASKED.', "THIS TIME, THE NOTEBOOK'S YOURS.",
  ]));
  let res;
  for (;;) {
    res = await boss(st);
    if (res.reached === 'won' || !canWind(st)) break;
    if ((await show(new Verdict({ st, res }))) !== 'wind') break;
    await show(new Wind({ st, bg: () => night(), last: 'ALLIANCE SELECTION, AGAIN', stops: ['SATURDAY 3:10 PM', 'SATURDAY 2:40 PM', 'SATURDAY 2:00 PM', 'SATURDAY 1:20 PM', 'SATURDAY 12:38 PM'] }), { fade: false });
    st.winds++;
    save(st);
  }
  st.phase = 'end';
  st.result = { reached: res.reached, alliances: res.alliances, seed: res.seed, mine: res.mine };
  save(st);
}

/** A season started part of the way in, for trying things: the matches before it played on habits, some of them watched. */
function jump(st, at) {
  const late = at === 'boss' || at === 'end';
  Object.assign(st, { loop: 1, phase: at === 'boss' ? 'selection' : at, round: late ? ROUNDS : at === 'quals' ? Math.min(ROUNDS - 1, Number(Q.get('round') ?? 0)) : 0 });
  st.time = st.timeMax = at === 'thursday' || at === 'van' ? THURSDAY_TIME : ROUND_TIME;
  st.cold = { picks: ['7461', '6017'], reached: 'qf', alliance: [OURS, '7461', '6017'], out: ['7777', '6834', '4471'] };
  const upto = late ? ROUNDS : st.phase === 'quals' ? st.round : 0;
  for (let r = 0; r < upto; r++) autoPlan(st, r);
  if (upto) playTo(st, upto - 1);
  for (const m of worldOf(st).rounds.flat()) {
    if (m.round >= upto) continue;
    if (m.blue.includes(OURS) || m.red.includes(OURS)) observe(st, m.q, [...m.blue, ...m.red], 'ours');
    else if (m.q % 3 === 0) observe(st, m.q, [m.blue[m.q % 3], m.red[(m.q + 1) % 3]], 'watch');
  }
  toast(discover(st));
  if (at === 'end') {
    // The card, for looking at: an alliance selection nobody watched, and a semifinal exit.
    const d = makeDraft(tableOf(st).map((t) => t.num), { stats: statsOf(st) });
    while (!d.over) d.pick(d.wish());
    st.result = { reached: Q.get('reached') ?? 'sf', alliances: d.alliances, seed: tableOf(st).find((t) => t.num === OURS).rank, mine: [] };
  }
}

async function main() {
  // The season: a new one (NEW SEASON on the title screen, or ?new), or wherever the save left off.
  let st = Q.has('new') || Q.has('at') ? null : load();
  if (!st) {
    st = newSave({ seed: Q.has('seed') ? Number(Q.get('seed')) : undefined });
    if (Q.has('at')) jump(st, Q.get('at'));
    save(st);
  }
  // For poking at from the console (and the play-through test): the save, and the event it's playing.
  window.season = st;
  window.world = () => worldOf(st);
  // Coming back to a season: the event so far, played again from the seed and her plans (it's never saved).
  if (st.loop >= 1 && st.round > 0) playTo(st, Math.min(st.round, ROUNDS) - 1);
  if (st.phase === 'cold') await coldOpen(st);
  if (st.phase === 'van') {
    await vanRide(st);
    Object.assign(st, { phase: 'thursday', time: THURSDAY_TIME, timeMax: THURSDAY_TIME });
    save(st);
  }
  if (st.phase === 'thursday') {
    await walk(pitHall(st, { from: 'left' }));
    Object.assign(st, { phase: 'quals', round: 0, time: ROUND_TIME, timeMax: ROUND_TIME, place: 'arena' });
    save(st);
    await show(dayCard(st, 'FRIDAY', '8:30 AM', ['QUALIFICATION MATCHES: TEN ROUNDS, ONE MATCH A ROUND.', 'BEFORE EACH OF YOURS: THE STANDS, OR THE PITS.', "THERE ISN'T TIME FOR EVERYTHING."]));
  }
  if (st.phase === 'quals') await quals(st);
  if (st.phase === 'selection') await finale(st);
  if (st.phase === 'end') {
    await show(trainerCard(st, st.result));
    location.assign('./index.html?title');
  }
}
main();

// On a phone, the first tap asks for the whole screen, held sideways (where the browser allows it; an iPhone doesn't).
if (matchMedia('(pointer: coarse)').matches && document.fullscreenEnabled) {
  addEventListener('pointerup', () => {
    document.documentElement.requestFullscreen?.({ navigationUI: 'hide' })
      .then(() => screen.orientation?.lock?.('landscape'))
      .catch(() => {});
  }, { once: true });
}
