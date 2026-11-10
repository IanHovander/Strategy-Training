// Checks for Blue Banner, the game (public/team-manager/game/): that the event it plays is a fair, whole event (every
// team once a round, rankings that add up, an alliance selection that always ends with eight alliances of three), that
// the call at 0:30 is a real call (the match is the same up to it whatever she calls), that the notebook only ever
// holds what she's seen, and that the things there are to find out at this event are true of it: nothing in the game
// says them, so the world had better. If a change to the robots or the simulation makes one of them false, this says
// which.
//   node test/blue-banner-game.mjs
import {
  TEAMS, OURS, ROUNDS, makeSchedule, playMatch, recordOf, standings, entryOf, habPoints, makeDraft, fieldStats, saysYes,
  coachPlans, playSeries, QUARTERS, eyeOf, usualChoice, planFrom,
} from '../public/team-manager/game/event.js';
import { newSave, worldOf, playRound, playTo, replan, observe, summary, discover, tableOf, ourMatch, NOTES, voltsOf, canWind } from '../public/team-manager/game/state.js';
import { PAGE, RANKING, TAKEN, pageStats, pageInfo } from '../public/team-manager/game/cold-data.js';
import { robotOf } from '../public/team-manager/match/robots.js';

let failures = 0;
const check = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failures++;
};
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;

// ---- The schedule ----
{
  const a = makeSchedule(7), b = makeSchedule(7), c = makeSchedule(8);
  check(JSON.stringify(a) === JSON.stringify(b) && JSON.stringify(a) !== JSON.stringify(c), 'the same seed draws the same schedule, another seed another');
  check(TEAMS.length === 24 && a.length === ROUNDS && a.every((r) => r.length === 4), '24 teams, ten rounds of four matches');
  const once = a.every((round) => {
    const all = round.flatMap((m) => [...m.blue, ...m.red]);
    return all.length === 24 && new Set(all).size === 24;
  });
  check(once, 'every team plays exactly once a round');
  check(a.flat().map((m) => m.q).join() === Array.from({ length: 40 }, (_, i) => i + 1).join(), 'the matches are numbered Q1 to Q40 in order');
}

// ---- A whole event ----
const SEED = 5;
const rounds = makeSchedule(SEED), played = [], records = Object.fromEntries(TEAMS.map((n) => [n, []]));
for (const m of rounds.flat()) {
  const result = playMatch(SEED * 1000 + m.q, m, { record: false });
  played.push({ match: m, result });
  for (const n of [...m.blue, ...m.red]) records[n].push(recordOf(result, n));
}
const table = standings(played), stats = fieldStats(records);
{
  const rp = played.reduce((n, p) => n + 3 * (p.result.rp.blue.total + p.result.rp.red.total), 0);
  check(table.reduce((n, t) => n + t.rp, 0) === rp, 'the rankings hold exactly the ranking points the matches gave');
  check(table.every((t) => t.played === ROUNDS) && table.every((t, i) => !i || table[i - 1].rp >= t.rp), 'every team has played ten, and the table is in order');
  const again = playMatch(SEED * 1000 + 3, rounds[0][2], { record: false });
  check(JSON.stringify(again.score) === JSON.stringify(played[2].result.score), 'a match played again from its seed is the same match');
  const sums = TEAMS.every((n) => records[n].every((r) => r.pts >= 0 && r.pts === r.hatch * 2 + (r.pts - r.hatch * 2)));
  check(sums && TEAMS.every((n) => records[n].length === ROUNDS), 'every robot has a line for each of its ten matches');
}

// ---- The call at 0:30 ----
{
  // Her match, with every way she could call the climbs: nothing before 0:30 may differ, or it wasn't a call.
  let same = true, differs = false, late = 0, tries = 0;
  for (const seed of [3, 9, 21, 40]) {
    const m = makeSchedule(seed)[2].find((x) => x.blue.includes(OURS) || x.red.includes(OURS));
    const side = m.blue.includes(OURS) ? 'blue' : 'red', team = m[side];
    const play = (climbs) => playMatch(seed * 1000 + m.q, m, { k: 2, plans: Object.fromEntries(team.map((n, i) => [n, { role: 'score', climb: climbs[i] }])) });
    const ways = [[1, 1, 1], [2, 2, 1], [3, 2, 1], [1, 3, 2], [2, 1, 3]].map(play);
    const before = (r) => JSON.stringify([r.events.filter((e) => e.t <= 120), r.robots.map((b) => b.track.filter((p) => p[0] <= 120))]);
    if (!ways.every((r) => before(r) === before(ways[0]))) same = false;
    if (new Set(ways.map((r) => r.score[side])).size > 1) differs = true;
    for (const r of ways) {
      for (const b of r.robots) {
        const c = b.steps.find((s) => s.kind === 'climb');
        if (!c) continue;
        tries++;
        if (c.made !== true && !r.log.some((l) => l.by === b.num && l.kind === 'slip')) late++;
      }
    }
  }
  check(same, 'her match is the same up to 0:30 whatever she calls for the climbs');
  check(differs, 'and what she calls changes how it ends');
  check(late / tries < 0.1, `a climb that fails slipped: hardly any run out of time (${late} of ${tries})`);
  check(entryOf('5518', 0, { climb: 3 }).plan.climbAt <= 29 && entryOf(OURS, 0, { climb: 3 }).plan.climb === 3 && entryOf('2202', 0, { climb: 3 }).plan.climb === 2,
    'nobody heads home before 0:30, and a robot told to try a climb it has no mechanism for tries the best it can');
}

// ---- Alliance selection ----
{
  const whole = (d) => d.alliances.length === 8 && d.alliances.every((a) => a.teams.length === 3) && new Set(d.alliances.flatMap((a) => a.teams)).size === 24;
  const d = makeDraft(table.map((t) => t.num), { stats });
  let guard = 0;
  while (!d.over && guard++ < 60) {
    const t = d.turn(), want = d.wish();
    if (d.isCaptain(want) && !saysYes(want, t.captain, t.alliance + 1, stats)) d.decline(want);
    else d.pick(want);
  }
  check(d.over && whole(d), 'alliance selection ends with eight alliances of three, every team on one');
  check(d.alliances.every((a, i) => a.seed === i + 1), 'and the alliances are numbered 1 to 8 in order, after anyone moved up');
  // The opening: alliances 1 to 3 have picked, and it's hers; whoever she takes, it still comes out whole.
  let ok = true, first = true;
  for (const mine of ['7461', '6834', '4471', '9201', '8086']) {
    const s = pageStats(), o = makeDraft(RANKING, { stats: s });
    for (const n of TAKEN) o.pick(n);
    if (o.turn().captain !== OURS || o.turn().alliance !== 3) first = false;
    o.pick(mine);
    let g = 0;
    while (!o.over && g++ < 60) {
      const t = o.turn(), want = t.captain === OURS ? o.pool().find((n) => !o.isCaptain(n)) : o.wish();
      if (o.isCaptain(want) && !saysYes(want, t.captain, t.alliance + 1, s)) o.decline(want);
      else o.pick(want);
    }
    if (!o.over || !whole(o) || !o.of(OURS).teams.includes(mine)) ok = false;
  }
  check(first, "the opening's selection starts at her pick: alliance 4, round 1");
  check(ok, 'whoever she picks first in the opening, she has them, and selection finishes whole');
  check(!saysYes('7777', OURS, 4, pageStats()) && saysYes('8086', OURS, 4, pageStats()) && saysYes('7777', '4000', 1, pageStats()),
    'a captain says no to a much weaker robot, yes to one about as good, and yes to the first seed');
  check(Object.keys(PAGE).length === 24 && TEAMS.every((n) => PAGE[n].scores.length === 10 && pageInfo(n).lines[0].length <= 34),
    "the senior strategist's page has all 24 teams, ten matches each, and a line that fits the card");
  check(eyeOf('7777') === 'sharp' && eyeOf('4000') === 'average', "7777's scout misses nothing; 4000's strategist goes by the average");
}

// ---- The playoffs ----
{
  const plans = coachPlans(['7777', '4471', '7040'], [OURS, '6834', '2202'], stats);
  check(Object.values(plans).filter((p) => p.role === 'defend').length === 1 && plans['4471'].role === 'defend', 'a drive coach puts one robot on defense at most, and it is the best wall');
  const s = playSeries(77, ['7777', '6834', '4471'], [OURS, '2202', '9201'], { stats });
  check((s.wins.red === 2 || s.wins.blue === 2) && s.scores.length >= 2 && s.scores.length <= 5, `a series is over when someone has two wins (${s.scores.map((x) => x.join('-')).join(', ')})`);
  check(QUARTERS.flat().sort().join() === '0,1,2,3,4,5,6,7', 'the quarterfinals pair every alliance once');
}

// ---- What there is to find out, and whether it's true ----
// The game never says any of this. A player finds it by watching, so it has to be so.
{
  const N = 30, foes = ['9201', '6017', '7311'];
  const side = (nums, plans = {}) => nums.map((n) => entryOf(n, 9, plans[n] ?? {}));
  const run = (blue, red, i, plans = {}) => playMatch(4000 + i, { blue, red }, { k: 9, plans, record: false });
  // Defense, by the right robot on the right robot, takes more than it costs; by a scorer, it costs more than it takes.
  const wall = { off: [], on: [], own: [] }, scorer = { off: [], on: [], mine: [], gave: [] }, sturdy = { off: [], on: [] };
  for (let i = 0; i < N; i++) {
    const a = run(['7777', '9201', '6017'], ['4471', '2202', '7311'], i, { 4471: { role: 'score' } });
    const b = run(['7777', '9201', '6017'], ['4471', '2202', '7311'], i, { 4471: { role: 'defend', defend: '7777' } });
    wall.off.push(recordOf(a, '7777').pts); wall.on.push(recordOf(b, '7777').pts); wall.own.push(recordOf(a, '4471').pts - recordOf(b, '4471').pts);
    const c = run(['7777', '9201', '6017'], ['8086', '2202', '7311'], i, { 8086: { role: 'score' } });
    const d = run(['7777', '9201', '6017'], ['8086', '2202', '7311'], i, { 8086: { role: 'defend', defend: '7777' } });
    scorer.off.push(recordOf(c, '7777').pts); scorer.on.push(recordOf(d, '7777').pts); scorer.gave.push(recordOf(c, '8086').pts - recordOf(d, '8086').pts);
    const e = run(['6417', '9201', '6017'], ['4471', '2202', '7311'], i, { 4471: { role: 'score' } });
    const f = run(['6417', '9201', '6017'], ['4471', '2202', '7311'], i, { 4471: { role: 'defend', defend: '6417' } });
    sturdy.off.push(recordOf(e, '6417').pts); sturdy.on.push(recordOf(f, '6417').pts);
  }
  const took = mean(wall.off) - mean(wall.on), cost = mean(wall.own);
  check(took >= 9 && took > cost + 5, `the wall: 4471 on 7777 takes ${took.toFixed(0)} off it a match and gives up ${cost.toFixed(0)} of its own`);
  const took2 = mean(scorer.off) - mean(scorer.on), cost2 = mean(scorer.gave);
  check(cost2 > took2 + 3, `defense costs: a cargo arm on 7777 takes ${took2.toFixed(0)} and gives up ${cost2.toFixed(0)}`);
  check(mean(sturdy.off) - mean(sturdy.on) < took - 4, `and it depends who: the same wall takes ${(mean(sturdy.off) - mean(sturdy.on)).toFixed(0)} off 6417`);
  // Robots that want the same places run out of them: three cargo robots score far less together than apart.
  const alone = (n) => mean(Array.from({ length: N }, (_, i) => recordOf(playMatch(5000 + i, { blue: [n, '9201', '5940'], red: foes }, { k: 9, record: false }), n).pts));
  const together = (nums) => mean(Array.from({ length: N }, (_, i) => {
    const r = playMatch(5000 + i, { blue: nums, red: foes }, { k: 9, record: false });
    return nums.reduce((s, n) => s + recordOf(r, n).pts, 0);
  }));
  const pile = ['6417', '2202', '8248'], apart = pile.reduce((s, n) => s + alone(n), 0), as3 = together(pile);
  check(as3 < apart - 20, `nowhere left to score: 6417, 2202 and 8248 score ${apart.toFixed(0)} apart and ${as3.toFixed(0)} as an alliance`);
  const fit = together([OURS, '6417', '6612']), clash = together([OURS, '6612', '2468']);
  check(fit > clash + 12, `and what fits: a cargo robot with two hatch robots scores ${fit.toFixed(0)}; three hatch robots, ${clash.toFixed(0)}`);
  // What a pit says: 5518 goes for Level 3 every match and makes it now and then.
  const l3 = [];
  for (let s = 1; s <= 12; s++) for (const m of makeSchedule(s).flat()) {
    if (![...m.blue, ...m.red].includes('5518')) continue;
    const rec = recordOf(playMatch(s * 1000 + m.q, m, { record: false }), '5518');
    if (rec.climb?.level === 3) l3.push(rec.climb.made ? 1 : 0);
  }
  check(l3.length > 40 && mean(l3) < 0.42, `what they say: 5518 tries Level 3 most matches and makes ${Math.round(mean(l3) * 100)}% of them`);
  // 15 on the HAB without anyone gambling: two Level 2s and a park.
  const safe = Array.from({ length: N }, (_, i) => {
    const r = playMatch(6000 + i, { blue: [OURS, '6612', '8086'], red: foes }, { k: 9, plans: { [OURS]: { climb: 2 }, 6612: { climb: 2 }, 8086: { climb: 1 } }, record: false });
    return habPoints(r, 'blue') >= 15 ? 1 : 0;
  });
  check(mean(safe) > 0.8, `the sure ranking point: Level 2, Level 2 and a park make 15 on the HAB ${Math.round(mean(safe) * 100)}% of the time`);
  // 3000's climb, before and after Friday lunch.
  check(robotOf('3000', { match: 2 }).climb[3][0] < 0.5 && robotOf('3000', { match: 6 }).climb[3][0] > 0.85, "3000's Level 3 climb slips on Friday morning and holds from Friday lunch");
}

// ---- The notebook ----
{
  const st = newSave({ seed: 5 });
  check(discover(st).length === 0 && voltsOf(st) === 12.4, 'in the opening there are no field notes to find, and Norbert reads 12.4');
  Object.assign(st, { loop: 1, phase: 'quals', round: 0 });
  check(TEAMS.every((n) => summary(st, n).n === 0 && summary(st, n).row.every((v) => v == null)), 'the notebook starts empty: every robot a row of blanks');
  check(discover(st).length === 0, 'and an empty notebook shows nothing');
  // Her ten matches on the drive coach's plans; she watches 7461 and 6834 twice early and twice late.
  for (let r = 0; r < ROUNDS; r++) {
    const m = ourMatch(st, r);
    replan(st, m.q, Object.fromEntries(m[m.blue.includes(OURS) ? 'blue' : 'red'].map((n) => [n, planFrom(usualChoice(n))])));
  }
  playTo(st, ROUNDS - 1);
  const w = worldOf(st);
  st.round = 4;
  check(tableOf(st).every((t) => t.played === 4), "the rankings hold the rounds that are over, not the one she's in");
  st.phase = 'selection';
  check(w.played.size === 40 && tableOf(st).every((t) => t.played === ROUNDS), 'the event plays out whole from the save: 40 matches');
  const st2 = JSON.parse(JSON.stringify(st));
  playTo(st2, ROUNDS - 1);
  check(JSON.stringify(tableOf(st2)) === JSON.stringify(tableOf(st)), 'and a save loaded again plays the same event, her matches as she called them');
  st.phase = 'quals';
  const matchOf = (num, r) => w.rounds[r].find((m) => [...m.blue, ...m.red].includes(num));
  for (const num of ['7461', '6834']) for (const r of [0, 1, 2, 4, 7, 8, 9]) observe(st, matchOf(num, r).q, [num]);
  const sum = summary(st, '7461');
  const untouched = TEAMS.filter((n) => n !== OURS && n !== '7461' && n !== '6834').every((n) => summary(st, n).n === 0);
  check(sum.n === 7 && sum.row.filter((v) => v != null).length === 7 && untouched, 'watching a robot writes down that robot, in that match, and nothing else');
  st.round = 9;
  const found = discover(st).map((n) => n.id);
  check(found.includes('fading') && found.includes('rising'), `watching 7461 (${sum.row.map((v) => v ?? '-').join(' ')}) and 6834 early and late shows one fading and one on the rise (${found.join(', ')})`);
  check(discover(st).length === 0, 'a field note is found once');
  check(Math.abs(voltsOf(st) - (12 + 0.1 * found.length)) < 1e-9, 'every field note charges Norbert a tenth of a volt');
  st.book.notes = Object.fromEntries(NOTES.slice(0, 3).map((n) => [n.id, { text: [] }]));
  const charged = canWind(st);
  st.winds = 1;
  check(charged && !canWind(st), 'three field notes are one wind back, and winding spends them');
  check(NOTES.every((n) => n.title.length <= 24 && n.ask.length <= 48), 'every field note has a name and a question that fit the notebook');
}

console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
