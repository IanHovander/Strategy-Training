// Checks for Blue Banner, the game (public/team-manager/game/): that the event it plays is a fair, whole event (every
// team once a round, rankings that add up, an alliance selection that always ends with eight alliances of three), that
// the call at 0:30 is a real call (the match is the same up to it whatever she calls), that the notebook only ever
// holds what she's seen, and that the things there are to find out at this event are true of it: nothing in the game
// says them, so the world had better. If a change to the robots or the simulation makes one of them false, this says
// which.
//   node test/blue-banner-game.mjs
import {
  TEAMS, OURS, ROUNDS, makeSchedule, playMatch, recordOf, standings, entryOf, habPoints, makeDraft, fieldStats, saysYes,
  coachPlans, playSeries, QUARTERS, eyeOf, usualChoice, planFrom, oursIn, sideOf,
} from '../public/team-manager/game/event.js';
import { newSave, worldOf, playRound, playTo, replan, observe, summary, discover, tableOf, ourMatch, NOTES, voltsOf, canWind } from '../public/team-manager/game/state.js';
import { PAGE, RANKING, TAKEN, pageStats, pageInfo } from '../public/team-manager/game/cold-data.js';
import { robotOf } from '../public/team-manager/match/robots.js';
import {
  suggest, firstMatch, guide, inkDue, chargeDue, fridayLines, WORDS, ENDED, afterPage, LAST, WISH, CALL, vanCut, CHOOSE,
  resolve, MATE, DANI_FIRST, priyaPage, CHARGE,
} from '../public/team-manager/game/guide.js';
import { SENDER } from '../public/team-manager/opening/phone.js';

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

// ---- The guided start ----
// From the van to her first match the game walks her once round the loop (game/guide.js), with as little to read as it
// can: whoever she circles in the van plays on Friday morning, the markers point the right way and then stop, the
// words fit their boxes, and the reading stays short, so it can't creep back.
{
  const COLD = { picks: ['7461', '6017'], reached: 'qf', alliance: [OURS, '7461', '6017'], out: ['7777', '6834', '4471'] };
  const thursday = (seed = 5, cold = COLD) => {
    const st = newSave({ seed });
    Object.assign(st, { loop: 1, phase: 'thursday', round: 0, time: 5, timeMax: 5, cold });
    return st;
  };
  const said = (cold) => suggest(thursday(5, cold)).map((x) => `${x.num} ${x.word}`).join(', ');
  check(said(COLD) === '7461 MY PICK, 7777 BEAT US, 6834 REBUILT', `the van's notebook suggests her own Saturday: ${said(COLD)}`);
  const won = said({ picks: ['6834', '4471'], reached: 'won', alliance: [OURS, '6834', '4471'], out: null });
  const sf = said({ picks: ['2202', '9201'], reached: 'sf', alliance: [OURS, '2202', '9201'], out: ['4000', '6612', '8086'] });
  const none = said({ picks: [], reached: 'qf', alliance: [OURS, '1357', '8812'], out: ['7777', '6834', '4471'] });
  check(won === '6834 MY PICK, 4000 TOP SEED, 5518 LEVEL 3' && sf === '2202 MY PICK, 4000 BEAT US, 6834 REBUILT' && none === '7777 BEAT US, 6834 REBUILT',
    `and whatever her Saturday was: ${won} / ${sf} / ${none}`);
  let fair = true;
  for (let i = 0; i < 300; i++) {
    const others = TEAMS.filter((n) => n !== OURS).sort((a, b) => ((Number(a) * (i + 7)) % 97) - ((Number(b) * (i + 7)) % 97));
    const cold = { picks: others.slice(0, i % 3), reached: i % 5 ? 'qf' : 'won', alliance: [OURS, ...others.slice(0, 2)], out: i % 5 ? others.slice(2, 5) : null };
    const marks = suggest(thursday(5, cold)), nums = marks.map((x) => x.num);
    if (marks.length < 2 || marks.length > 3 || new Set(nums).size !== nums.length || nums.includes(OURS) || !marks.every((x) => WORDS.includes(x.word) && x.word.length <= 8)) fair = false;
  }
  check(fair, 'two or three suggestions, all different, never our own robot, each with one of the words that fit a tile');

  // Whoever she circles plays on Friday morning, and the card says when.
  let card = true;
  for (let seed = 1; seed <= 40; seed++) {
    for (const T of TEAMS.filter((n) => n !== OURS)) {
      const st = thursday(seed);
      st.book.circled = T;
      const f = firstMatch(st, 0), round = worldOf(st).rounds[0], m = round.find((x) => x.q === f?.q), ours = oursIn(round);
      const want = m === ours ? (sideOf(m, T) === sideOf(m) ? 'with' : 'against') : null, [line] = fridayLines(st);
      if (!m || ![...m.blue, ...m.red].includes(T) || f.ourQ !== ours.q || f.with !== want) card = false;
      else if (!line.startsWith(`${T} PLAYS `) || !line.includes(`Q${f.with ? f.ourQ : f.q}.`) || (f.with === 'against') !== line.includes('AGAINST')) card = false;
    }
  }
  check(card, 'whoever she circles plays in round 1, and the FRIDAY card names the match, and whether it is hers');

  // The words fit: a page is two lines of 38 in the dialog's capitals; a label, the small letters, no comma or question.
  const BIG = /^[A-Z0-9 !?.,:\-+'\/>#&]*$/, SMALL = /^[A-Z0-9 !.\-+'\/:&]*$/;
  const page = (p) => Array.isArray(p) && p.length >= 1 && p.length <= 2 && p.every((l) => l.length <= 38 && BIG.test(l));
  const pages = [...Object.values(ENDED), afterPage(null), LAST, WISH, CALL, ...vanCut(SENDER), MATE, ...DANI_FIRST, CHARGE, resolve(OURS), ...TEAMS.flatMap((n) => [afterPage(n), resolve(n)])];
  for (let seed = 1; seed <= 60; seed++) for (const round of makeSchedule(seed * 10 + 1)) pages.push(priyaPage(oursIn(round)));
  check(pages.every(page), `every page of the guided start fits the dialog box (${pages.length} checked)`);
  const labels = [CHOOSE.count(0), CHOOSE.count(23), CHOOSE.prompt, ...WORDS];
  for (let seed = 1; seed <= 60; seed++) {
    for (const T of TEAMS.filter((n) => n !== OURS)) {
      const st = thursday(seed);
      st.book.circled = T;
      labels.push(...fridayLines(st), guide(st, 'pits').label);
      st.time = 0;
      labels.push(guide(st, 'pits').label);
      Object.assign(st, { phase: 'quals', round: 0, time: 3 });
      labels.push(guide(st, 'arena').label);
      st.time = 1;
      labels.push(guide(st, 'arena').label);
    }
  }
  check(BIG.test(CHOOSE.question) && CHOOSE.question.length <= 30 && labels.every((l) => SMALL.test(l) && l.length <= 56),
    `every label of the guided start fits its line in the small letters (${new Set(labels).size} different)`);

  // The reading stays short. From the last buzzer to the circle: AFTER's five pages, the van's two and the choice.
  const words = (ls) => ls.join(' ').split(/\s+/).filter((w) => /[A-Z0-9]/.test(w)).length;
  const most = Math.max(...Object.entries(ENDED).map(([how, end]) => {
    const cold = { ...COLD, reached: how, out: how === 'won' ? null : COLD.out };
    const read = [end, afterPage(cold.picks[0]), LAST, WISH, CALL, ...vanCut(SENDER)];
    const look = [CHOOSE.question, CHOOSE.count(0), CHOOSE.prompt, ...suggest(thursday(5, cold)).map((x) => x.word)];
    return read.length <= 7 ? words(read.flat()) + words(look) : Infinity;
  }));
  check(most <= 90, `from the last buzzer to her choice in the van: 7 pages and at most 90 words (${most})`);
  check([resolve('7461'), MATE].length === 2 && DANI_FIRST.length === 2 && fridayLines(thursday()).length === 2,
    "then her resolve and the teammate's answer, two pages; Dani's first meeting, two; the FRIDAY card, two lines; Priya, one page");

  // The marker points the right way, one thing at a time, and lets go.
  const st = thursday();
  const at = (where) => guide(st, where)?.to ?? null;
  check(at('pits') === 'pit' && guide(st, 'pits').num === '7461' && at('arena') === null, "Thursday: the marker is on the circled robot's pit (her first pick, before she's circled anything)");
  st.book.pit['7461'] = true;
  const free = at('pits');
  st.time = 0;
  check(free === null && at('pits') === 'exit', "once she's had its hello, nothing; once her time's gone, the way out to Friday");
  Object.assign(st, { phase: 'quals', round: 0, time: 3 });
  const r0 = guide(st, 'arena'), f0 = firstMatch(st, 0);
  check(r0?.to === 'dani' && r0.q === f0.q && r0.label === `Q${f0.q}: 7461` && at('pits') === null, `Friday's first round: the stands, for its match (${r0?.label})`);
  playRound(st, 0);
  observe(st, f0.q, ['7461'], 'watch');
  st.time = 1;
  check(at('arena') === 'book' && at('pits') === 'book' && inkDue(st), 'once she has watched it, Norbert: the notebook, wherever she is');
  st.flags.inked = true;
  check(at('arena') === 'priya' && guide(st, 'arena').label === `Q${f0.ourQ}: OUR MATCH` && !inkDue(st), 'once the notebook has shown it to her, Priya, for her own match');
  const skip = thursday();
  Object.assign(skip, { phase: 'quals', round: 0, time: 1 });
  skip.book.circled = '7461';
  check(guide(skip, 'arena')?.to === 'priya', 'with no time to watch a match, Priya straight away');
  const mate = thursday();
  Object.assign(mate, { phase: 'quals', round: 0, time: 3 });
  mate.book.circled = '7777';
  check(guide(mate, 'arena')?.to === 'priya' && guide(mate, 'arena').label === `Q${firstMatch(mate, 0).ourQ}: 7777 AND US`, 'a robot that plays in her own match: Priya, and the label says so');
  st.round = 1;
  const r1 = at('arena');
  st.flags.inked = false;
  check(r1 === null && at('arena') === 'book', "round 2: nothing, unless there's something in the notebook it hasn't shown her yet");
  st.round = 2;
  check(at('arena') === null && at('pits') === null && !inkDue(st), 'from round 3, nothing at all');
  st.round = 0;
  st.flags.noGuide = true;
  check(at('arena') === null && at('pits') === null, '?guide=off: no markers anywhere');
  st.phase = 'selection';
  st.flags.noGuide = false;
  check(!inkDue(st) && at('arena') === null, 'and none at the boss fight');

  // Her line at the first field note, once; Norbert's battery, drained by the wind back to where Thursday starts.
  const ch = thursday();
  const before = chargeDue(ch);
  ch.book.notes.rp = { text: [] };
  const due = chargeDue(ch);
  ch.flags.charged = true;
  check(!before && due && !chargeDue(ch), 'her line at the first field note is due once a note is found, and only once');
  const open = newSave({ seed: 5 });
  check(voltsOf(open) === 12.4 && Math.abs(voltsOf({ ...open, loop: 1 }) - 12) < 1e-9, 'the wind back drains Norbert from 12.4V to 12.0V, where Thursday starts');

  // The loop she's walked round once can pay: a field note from it in most seasons. Her first match on the drive
  // coach's plans, the circled 7461 watched first if it's in another match; then her second match.
  let by0 = 0, by1 = 0;
  const callOf = (m, r, res) => {
    const side = sideOf(m), them = side === 'blue' ? 'red' : 'blue', team = m[side];
    const climbs = team.map((n) => recordOf(res, n)).filter((x) => x.climb && !x.climb.park).map((x) => ({ num: x.num, level: x.climb.level, made: x.climb.made }));
    return { tag: `Q${m.q}`, lead: 0, climbs, margin: res.score[side] - res.score[them], could3: team.some((n) => robotOf(n, { match: r }).climb?.[3]), rp: res.rp[side], hab: habPoints(res, side) };
  };
  for (let seed = 1; seed <= 40; seed++) {
    const s = thursday(seed);
    Object.assign(s, { phase: 'quals', round: 0, time: 3 });
    let when = null;
    for (let r = 0; r < 2 && when == null; r++) {
      s.round = r;
      const round = playRound(s, r), tm = round.find((x) => [...x.blue, ...x.red].includes('7461'));
      if (r === 0 && !sideOf(tm)) observe(s, tm.q, ['7461'], 'watch');
      if (discover(s).length) when = r;
      if (when != null) break;
      const m = ourMatch(s, r), res = replan(s, m.q, Object.fromEntries(m[sideOf(m)].map((n) => [n, planFrom(usualChoice(n))])));
      observe(s, m.q, [...m.blue, ...m.red], 'ours');
      if (discover(s, { call: callOf(m, r, res) }).length) when = r;
    }
    if (when === 0) by0++;
    if (when != null) by1++;
  }
  check(by0 >= 18 && by1 >= 32, `the guided first round turns up a field note in most seasons: ${Math.round((by0 / 40) * 100)}% by its end, ${Math.round((by1 / 40) * 100)}% by the end of the second`);
}

console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
