// Checks for Strategy Training: the lesson content, the Showdown match model, and a real server played with fake
// phones through Learn, the Test and the Showdown.
//   node test/frc-strategy.mjs
import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';
import { LESSONS, partById } from '../games/frc-strategy/lessons.js';
import { ROOM, lastRound, minConfidence, optionsAt } from '../games/frc-strategy/lesson1-room.js';
import { BRIEFS } from '../games/frc-strategy/lesson1-room-brief.js';
import { readFileSync } from 'node:fs';
import { asksConfidence, bestPoints, calibration, cleanAnswer, scoreAnswer, tally, typeOf } from '../games/frc-strategy/quiz.js';
import { abilityAt, attemptTime, clock, cycleCounts, cycleDist, defenderBreak, matchOdds, playMatch, resolve, scoutTeam, successAt } from '../games/frc-strategy/alliance.js';
import { mean } from '../games/frc-strategy/prob.js';

const PORT = 3198;
const URL = `http://localhost:${PORT}`;
const server = spawn(process.execPath, ['server/index.js', '--port', String(PORT)], { stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((ok) => server.stdout.on('data', (d) => String(d).includes('Press Ctrl+C') && ok()));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failures++;
};
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;

function client(role) {
  const socket = io(URL, { auth: { role }, transports: ['websocket'], forceNew: true, reconnection: false });
  const c = { socket, room: null, self: null };
  socket.on('room', (r) => (c.room = r));
  socket.on('self', (s) => (c.self = s));
  return c;
}
const act = (p, type, payload) => p.socket.timeout(3000).emitWithAck('action', { type, payload }).catch(() => 'TIMEOUT');
const hostAct = (h, type, payload) => h.socket.emit('action', { type, payload });
const view = (c) => c.self?.view;
const defaults = (ex) => Object.fromEntries((ex.controls ?? []).map((c) => [c.id, c.value]));
const best = (q) =>
  typeOf(q) === 'number' ? q.number.value : typeOf(q) === 'multi' ? q.choices.flatMap((c, i) => (c.points > 0 ? [i] : [])) : q.choices.findIndex((c) => c.points === bestPoints(q));

try {
  const risk = LESSONS[0];
  const room = partById(risk, 'learn'); // the team game's Learn: the Strategy Room
  const learn = room.solo; // the solo page's Learn: scored case studies
  const test = partById(risk, 'test');
  const { draft } = partById(risk, 'draft');
  const T = (id) => draft.teams.find((t) => t.id === id);

  // --- the lesson content ---
  for (const part of [learn, test]) {
    for (const [i, q] of part.questions.entries()) {
      const name = `${part.title} ${i + 1} (${q.title})`;
      const type = typeOf(q);
      let ok = ['choice', 'multi', 'number'].includes(type) && q.prompt && q.takeaway && q.explain;
      if (type === 'number') ok &&= q.number.value >= q.number.min && q.number.value <= q.number.max && q.number.tiers.length > 0;
      else ok &&= q.choices.length >= 3 && q.choices.length <= 6 && q.choices.every((c) => Number.isInteger(c.points) && c.text && c.result);
      if (type === 'choice') ok &&= q.choices.every((c) => c.points >= 0);
      if (type === 'multi') ok &&= q.choices.some((c) => c.points > 0) && q.choices.some((c) => c.points < 0);
      check(ok && bestPoints(q) > 0 && scoreAnswer(q, cleanAnswer(q, best(q))) === bestPoints(q), `${name}: well formed, and its best answer earns full points`);
      if (q.explore) {
        const m = q.explore.model(defaults(q.explore));
        const sane = (m.strategies ?? []).every((s) => s.win >= 0 && s.win + s.tie <= 1 + 1e-9 && s.play().length === 2);
        check(sane && (m.strategies?.length || m.stats?.length), `${name}: explorer gives sane numbers`);
      }
    }
  }
  // --- the Strategy Room's cases and briefs ---
  check(room.kind === 'room' && room.cases === ROOM && learn.kind === 'quiz' && learn.id === 'learn', 'team Learn is the Strategy Room; the solo page keeps the scored cases as its Learn');
  check(ROOM.length === BRIEFS.length && ROOM.length === 5, 'five Strategy Room cases, each with a moderator brief');
  for (const [i, c] of ROOM.entries()) {
    const calls = Array.from({ length: lastRound(c) + 1 }, (_, r) => optionsAt(c, r));
    const ok =
      c.title && c.short && c.prompt && c.setup && c.blind && c.intel.length >= 1 && c.nudges.length >= 1 &&
      calls.every((list) => list.length >= 2 && list.length <= 3 && new Set(list.map((o) => o.id)).size === list.length && list.every((o) => o.label && o.detail));
    const b = BRIEFS[i];
    const briefOk = b.framing && b.truth.length && b.records.length && b.investigations.length && b.records.every((x) => x.id && x.title && x.text) && b.investigations.every((x) => x.id && x.title && x.effort && x.result);
    check(ok && briefOk, `Strategy Room ${i + 1} (${c.title}): every call has 2-3 plans, and the brief has records and investigations`);
  }
  check(minConfidence(2) === 50 && minConfidence(3) === 35, 'the lowest confidence is an even split between the plans');
  // The brief must never reach a phone or the projector: no screen code may import it.
  const imports = (file, seen = new Set()) => {
    if (seen.has(file)) return seen;
    seen.add(file);
    for (const [, dep] of readFileSync(new globalThis.URL(`../games/frc-strategy/${file}`, import.meta.url), 'utf8').matchAll(/from '\.\/([\w-]+\.js)'/g)) imports(dep, seen);
    return seen;
  };
  const screens = new Set([...imports('player.js'), ...imports('host.js')]);
  check(!screens.has('lesson1-room-brief.js') && !screens.has('room-rules.js') && screens.has('player-room.js') && screens.has('host-room.js'), 'the screens never load the moderator brief');

  check(learn.questions.some((q) => typeOf(q) === 'number') && learn.questions.some((q) => typeOf(q) === 'multi'), 'Learn mixes estimates, picks and pick-all-that-matter');
  check(learn.questions.filter((q) => q.lastInCase).length === learn.cases.length, 'every Learn case has a last step');
  const prepared = new Set(learn.cases.flatMap((c) => c.prepares ?? []));
  check(learn.cases.every((c) => c.prepares?.length) && test.questions.every((_, i) => prepared.has(i + 1)) && prepared.has('Showdown'), 'every Test investigation, and the Showdown, has a Learn case that prepares for it');
  const exhibitAt = learn.questions.findIndex((q) => q.exhibits.some((e) => e.isNew));
  const carried = learn.questions[exhibitAt + 1];
  check(
    exhibitAt >= 0 && !learn.questions[exhibitAt].lastInCase && carried.exhibits.length >= 1 && !carried.exhibits[0].isNew && learn.questions.every((q) => !q.firstInCase || q.exhibits.every((e) => e.isNew)),
    'exhibits stay in the case file for the rest of the case, and start fresh in the next',
  );
  check(learn.questions.every((q) => asksConfidence(q) === (typeOf(q) !== 'number')) && test.questions.every((q) => !asksConfidence(q)), 'Learn’s picks ask how sure you are; estimates and the Test don’t');
  check(
    JSON.stringify(calibration([{ sure: 90, right: true }, { sure: 90, right: false }, { sure: 50, right: true }])) === '[{"level":50,"n":1,"right":1},{"level":90,"n":2,"right":1}]',
    'calibration counts right answers at each confidence level',
  );

  // Scoring rules
  const num = learn.questions.find((q) => typeOf(q) === 'number' && q.number.value === 42.5);
  check(scoreAnswer(num, 43) === 100 && scoreAnswer(num, 50) === 60 && scoreAnswer(num, 60) === 0, 'number answers score by closeness');
  check(cleanAnswer(num, 101) === null && cleanAnswer(num, 'x') === null && cleanAnswer(num, 42.4) === 42, 'number answers are checked and rounded');
  const multi = learn.questions.find((q) => typeOf(q) === 'multi');
  check(scoreAnswer(multi, [3, 4]) === 0, 'red herrings alone can’t go below 0');
  check(JSON.stringify(cleanAnswer(multi, [2, 0, 2])) === '[0,2]' && cleanAnswer(multi, [9]) === null, 'multi answers are deduplicated and checked');
  check(JSON.stringify(tally(multi, [[0, 1], [1], []]).counts) === '[1,2,0,0,0]', 'multi tally counts each pick');
  check(tally(num, [40, 45, 90]).median === 45 && tally(num, [40, 45, 90]).counts[4] === 2, 'number tally makes a histogram and a median');

  // The explorers agree with the answers they back up.
  const byTitle = (title) => test.questions.find((q) => q.title === title);
  const strat = (title, extra = {}) => {
    const ex = byTitle(title).explore;
    return ex.model({ ...defaults(ex), ...extra }).strategies;
  };
  check(near(strat('Fixed Opponent')[1].win, 0.4) && strat('Fixed Opponent')[0].win === 0, 'Fixed Opponent: gamble wins 40%, guaranteed 11 wins 0%');
  check(near(strat('Uncertain Opponent')[0].win, 0.5) && near(strat('Uncertain Opponent')[1].win, 0.4), 'Uncertain Opponent: 50% vs 40%');
  check(near(strat('Three-Outcome Scores')[0].win, 0.23) && near(strat('Three-Outcome Scores')[1].win, 0.35), 'Three-Outcome Scores: 23% vs 35%');
  check(near(strat('Repeated Attempts')[0].win, 0.875, 0.001), 'Repeated Attempts: 20 shots each, A wins about 87.5%');
  check(near(strat('Alliance Consistency')[0].win, 0.488, 1e-6) && near(strat('Alliance Consistency', { n: 6 })[0].win, 0.737856, 1e-6), 'Alliance Consistency: Boom wins 48.8% with 3 tries, 74% with 6');
  const endgame = (need) => strat('Endgame Choices', { need }).map((s) => s.win);
  check(endgame(4)[0] > endgame(4)[1] && endgame(5)[1] > endgame(5)[0], 'Endgame Choices: with B still scoring, switch to the risky play at 5 behind');
  check(strat('Endgame Choices', { need: 9, opp: 0 })[0].win === 1, 'Endgame Choices: a parked B would make +10 enough until 10 behind');
  const lottery = learn.questions.find((q) => q.title === 'Three on Three').explore;
  check(near(lottery.model(defaults(lottery)).strategies[0].win, 0.4253, 0.001), 'Learn, Three on Three: Lotteries win 42.5%');

  // --- the Showdown match model: cycles and defense ---
  for (const tm of draft.teams) {
    const total = tm.cycles.reduce((s, p) => s + p, 0);
    const inRange = [tm.susceptibility, tm.defense].every((x) => x >= 0 && x <= 1);
    check(near(total, 1, 1e-9) && tm.cycles[0] > 0 && tm.cycles.length === 13 && inRange && tm.note, `team ${tm.name}: a cycle distribution with a chance of 0, and defense stats in range`);
  }
  const side = (ids, assign = {}) => ({ teams: ids.map(T), assign: Object.fromEntries(ids.map((id) => [id, assign[id] ?? 'offense'])) });
  const cyc = (id) => mean(cycleDist(T(id)));
  const teamsOf = (sides) => Object.fromEntries(sides.flatMap((s) => s.teams).map((x) => [x.id, x]));
  const at = (sides, id, u, brokeAt = {}) => successAt(teamsOf(sides), resolve(sides), id, u, brokeAt);
  const on = (target, ifDefending = 'stay') => ({ target, ifDefending });
  // one defender on an offense robot: each cycle succeeds 1 − ability × susceptibility
  let S = [side(['feather']), side(['brick'], { brick: on('feather') })];
  check(near(at(S, 'feather', 0.5), 1 - 0.85 * 0.9, 1e-12) && resolve(S).brick.target === 'feather', 'a defender cuts each cycle’s success by ability × susceptibility');
  S = [side(['tank']), side(['brick'], { brick: on('tank') })];
  check(near(at(S, 'tank', 0.5), 1 - 0.85 * 0.05, 1e-12), 'a low-susceptibility robot barely slows down');
  S = [side(['feather']), side(['brick', 'wall'], { brick: on('feather'), wall: on('feather') })];
  check(near(at(S, 'feather', 0.5), (1 - 0.85 * 0.9) * (1 - 0.6 * 0.9), 1e-12), 'two defenders on one robot both apply');
  // defending a defender: stay on it (weakening its defense) or switch
  S = [side(['feather', 'brick'], { brick: on('wall') }), side(['wall'], { wall: on('feather') })];
  const weakened = 0.6 * (1 - 0.85 * 0.3);
  check(resolve(S).brick.shadowing && near(abilityAt(teamsOf(S), resolve(S), 'wall', 0.5, {}), weakened, 1e-12) && near(at(S, 'feather', 0.5), 1 - weakened * 0.9, 1e-12), 'staying on a defender weakens its defense by the same rule');
  let roles = resolve([side(['apex', 'brick'], { brick: on('wall', 'glass') }), side(['wall', 'glass'], { wall: on('apex') })]);
  check(roles.brick.switched && roles.brick.target === 'glass' && !roles.brick.shadowing, 'if the target is defending, a defender can switch to another robot');
  roles = resolve([side(['apex', 'brick'], { brick: on('glass', 'wall') }), side(['wall', 'glass'], { wall: on('apex') })]);
  check(!roles.brick.switched && roles.brick.target === 'glass', 'the switch only happens when the first choice is defending');
  // breakdowns happen at a moment: a defender defends the cycles before it, and none after
  check(near(defenderBreak(T('brick')), T('brick').cycles[0] + 0.05, 1e-12) && near(draft.defenderBreakExtra, 0.05, 1e-12), 'a defender breaks down with its 0-cycle chance plus 5 points');
  S = [side(['feather']), side(['brick'], { brick: on('feather') })];
  check(near(at(S, 'feather', 0.3, { brick: 0.5 }), 1 - 0.85 * 0.9, 1e-12) && at(S, 'feather', 0.7, { brick: 0.5 }) === 1, 'a broken defender defends before it breaks, not after');
  S = [side(['feather', 'brick'], { brick: on('wall') }), side(['wall'], { wall: on('feather') })];
  check(near(at(S, 'feather', 0.7, { brick: 0.5 }), 1 - 0.6 * 0.9, 1e-12) && near(at(S, 'feather', 0.3, { brick: 0.5 }), 1 - weakened * 0.9, 1e-12), 'a shadow that breaks stops weakening its defender from then on');
  check(attemptTime(0, 4) === 0.125 && attemptTime(3, 4) === 0.875 && clock(0.54) === '1:21', 'cycles are spread through the match; times show as m:ss of 2:30');
  // the average works out: each attempt at moment u is defended unless the defender broke before u
  const q = defenderBreak(T('brick'));
  let expect = 0;
  for (const [n, pn] of cycleDist(T('feather'))) for (let k = 0; k < n; k++) expect += pn * (1 - 0.85 * 0.9 * (1 - q * attemptTime(k, n)));
  const one = matchOdds([side(['feather']), side(['brick'], { brick: on('feather') })]);
  check(near(one.mean[0], expect, 0.06), `simulated averages match the timing math (${one.mean[0].toFixed(2)} vs ${expect.toFixed(2)})`);
  // odds
  const A = side(['apex', 'metronome', 'eddie']);
  const B = side(['glass', 'feather', 'brick']);
  const plain = matchOdds([A, B]);
  check(near(plain.win[0] + plain.tie + plain.win[1], 1, 1e-9) && plain.runs === 20000, 'win, tie and loss chances add up, from 20,000 simulated matches');
  check(JSON.stringify(matchOdds([A, B])) === JSON.stringify(plain), 'the same plans always give the same estimate');
  const brickOnApex = matchOdds([A, side(['glass', 'feather', 'brick'], { brick: on('apex') })]);
  check(brickOnApex.win[1] < plain.win[1], 'defending a low-susceptibility robot costs more than it saves');
  const AB = side(['apex', 'metronome', 'feather']);
  const strongD = matchOdds([AB, side(['glass', 'boom', 'brick'], { brick: on('feather') })]);
  const noD = matchOdds([AB, side(['glass', 'boom', 'brick'])]);
  check(strongD.win[1] > noD.win[1], 'a strong defender on a susceptible scorer pays');
  let seed = 1;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const m = playMatch([AB, side(['glass', 'boom', 'brick'], { brick: on('feather') })], rand);
  check(m.scores[0] === ['apex', 'metronome', 'feather'].reduce((s, id) => s + m.cycles[id], 0) && m.defended.feather <= m.attempts.feather, 'a played match records cycles, attempts and defended attempts');
  let broke = 0;
  for (let k = 0; k < 3000; k++) {
    const g = playMatch([AB, side(['glass', 'boom', 'brick'], { brick: on('feather') })], rand);
    if (g.brokeAt.brick != null) {
      broke++;
      if (!(g.brokeAt.brick >= 0 && g.brokeAt.brick < 1) || g.defended.feather > g.attempts.feather) broke = -1e9;
    }
  }
  check(near(broke / 3000, q, 0.015), `defenders break at their rate, at a moment in the match (${(broke / 30).toFixed(1)}% vs ${(100 * q).toFixed(1)}%)`);
  const scouted = scoutTeam(T('pest'), draft, rand);
  const within = (est, tru) => est >= tru * 0.8 - 1e-9 && est <= tru * 1.2 + 1e-9;
  check(scouted.scores.length === 10 && cycleCounts(scouted.scores, 12).reduce((a, b) => a + b, 0) === 10, 'scouting draws ten matches of cycles');
  let inside = true;
  for (let k = 0; k < 500; k++) {
    const s = scoutTeam(T('pest'), draft, rand);
    inside &&= within(s.susceptibility, 0.4) && within(s.defense, 0.55);
  }
  check(inside, 'scouted susceptibility and defense always land within ±20% of the truth');

  // --- the solo page reads the same lessons ---
  const solo = await fetch(`${URL}/lessons.html`);
  const soloText = await solo.text();
  check(solo.ok && ['lessons.js', 'explorer.js', 'views.js', 'quiz.js'].every((f) => soloText.includes(`./games/frc-strategy/${f}`)), 'solo page loads the shared lessons, scoring, views and explorer');
  for (const f of ['explorer.js', 'views.js', 'quiz.js', 'prob.js', 'lesson1-learn.js', 'lesson1-room.js', 'player-room.js', 'host-room.js', 'lesson1-draft.js', 'alliance.js', 'draft-views.js', 'player-draft.js', 'host-draft.js', 'picklist.js']) {
    check((await fetch(`${URL}/games/frc-strategy/${f}`)).ok, `games/frc-strategy/${f} is served`);
  }

  // --- a room plays the Test ---
  const host = client('host');
  const players = [client('player'), client('player'), client('player')];
  await wait(300);
  for (const [i, p] of players.entries()) await p.socket.timeout(3000).emitWithAck('join', { name: `P${i + 1}` });
  check(host.room.selectedGameId === 'frc-strategy', 'Strategy Training is the lobby’s first choice');
  host.socket.emit('lobby', { cmd: 'start' });
  await wait(300);
  check(host.room.screen === 'game' && view(host)?.phase === 'pick' && view(host).partId === 'learn', 'game starts on the picker, Learn selected');
  check(view(players[0]).isVip && !view(players[1]).isVip, 'the first player is the leader');

  await act(players[1], 'lesson', { lessonId: 'risk', partId: 'test' });
  await wait(100);
  check(view(host).partId === 'learn', 'a non-leader phone cannot pick');
  await act(players[0], 'lesson', { lessonId: 'risk', partId: 'test' });
  await act(players[0], 'next', { from: 'pick:0' });
  await wait(100);
  check(view(host).phase === 'question' && view(host).partId === 'test' && view(host).q === 0, 'the leader starts the Test');

  check((await act(players[0], 'answer', { answer: 9 }))?.error, 'out-of-range answer is rejected');
  check((await act(players[0], 'answer', { answer: '1' }))?.error, 'non-number answer is rejected');
  await act(players[0], 'answer', { answer: 0 });
  await act(players[0], 'answer', { answer: 1 }); // changed their mind: the best answer
  await act(players[1], 'answer', { answer: 0 });
  await wait(100);
  check(view(host).answered === 2 && view(host).tally === null, 'big screen sees how many answered, not what');
  check(JSON.stringify(view(host)).indexOf('"answer"') === -1, 'big screen never sees who picked what');
  check(view(players[1]).answer === 0 && view(players[1]).tally === null, 'a phone sees only its own answer before the reveal');

  players[2].socket.disconnect(); // the last player drops out: don't wait for them
  await wait(3600);
  check(view(host).phase === 'reveal', 'reveals once everyone still connected has answered');
  check(JSON.stringify(view(host).tally.counts) === '[1,1,0]', 'reveal shows how many picked each answer');
  check(view(players[0]).gained === 100 && view(players[0]).score === 100, 'best answer earns its points');
  check(view(players[1]).gained === 0 && view(players[1]).rank === 2, 'wrong answer earns 0 and ranks lower');

  await act(players[0], 'next', { from: 'question:0' });
  await wait(100);
  check(view(host).phase === 'reveal', 'a stale "next" (double tap) is ignored');
  hostAct(host, 'next', { from: 'reveal:0' });
  await wait(100);
  check(view(host).phase === 'scores', 'Test: leaderboard after every question');

  for (let q = 1; q < test.questions.length; q++) {
    await act(players[0], 'next', { from: `scores:${q - 1}` });
    await wait(40);
    await act(players[0], 'answer', { answer: best(test.questions[q]) });
    hostAct(host, 'next', { from: `question:${q}` });
    await wait(40);
    await act(players[0], 'next', { from: `reveal:${q}` });
    await wait(40);
  }
  await act(players[0], 'next', { from: `scores:${test.questions.length - 1}` });
  await wait(100);
  const max = test.questions.reduce((s, q) => s + bestPoints(q), 0);
  check(view(host).phase === 'final' && view(players[0]).score === max, `Test final: a perfect run scores ${max}`);
  check(view(players[0]).best === test.questions.length && view(host).history?.length === test.questions.length, 'Test final: best answers and the per-question report');
  check(JSON.stringify(view(host)).length < 16000, `hostView is small (${JSON.stringify(view(host)).length} bytes)`);
  hostAct(host, 'finish');
  await wait(200);
  check(host.room.screen === 'lobby' && /P1 topped Risk & Consistency Test/.test(host.room.lastResult ?? ''), 'finish goes back to the lobby with the winner');

  // --- Learn: the Strategy Room ---
  // Phones get at most ~15 updates a second, so wait for each screen to catch up instead of a fixed time.
  const until = async (cond, ms = 3000) => {
    for (const end = Date.now() + ms; Date.now() < end; await wait(25)) if (cond()) return true;
    return cond();
  };
  const secret = 'Hidden real-world Safe model'; // a line from case 1's brief
  const P5 = client('player');
  await wait(150);
  await P5.socket.timeout(3000).emitWithAck('join', { name: 'P5' });
  host.socket.emit('lobby', { cmd: 'start' });
  await until(() => view(host)?.phase === 'pick');
  await act(players[0], 'next', { from: 'pick:0' });
  check(await until(() => view(host).phase === 'intro' && view(host).partId === 'learn' && view(host).players.every((p) => !p.done)), 'the leader starts Learn: the intro asks who wants to moderate');
  const roomStep = () => view(host).step;
  await act(players[1], 'next', { from: roomStep() });
  await wait(100);
  check(view(host).phase === 'intro', 'a non-leader phone can’t skip the volunteers');
  await act(players[0], 'volunteer', { yes: false });
  await act(players[1], 'volunteer', { yes: false });
  await act(P5, 'volunteer', { yes: true });
  check(await until(() => view(host).players.filter((p) => p.done).length === 3) && view(host).phase === 'intro', 'everyone has answered: a moment to change their mind');
  check(await until(() => view(host).phase === 'call' && view(P5)?.isModerator && view(players[0]).isModerator === false, 4000) && view(host).moderator?.name === 'P5', 'the only volunteer moderates');
  check(await until(() => JSON.stringify(view(P5)).includes(secret)) && view(P5).brief.records.length === BRIEFS[0].records.length, 'the moderator’s phone gets the case’s brief');
  const leaks = () => [host, players[0], players[1]].some((c) => JSON.stringify(view(c)).includes(secret) || 'brief' in view(c));
  check(!leaks(), 'nobody else sees the brief, not even the big screen');
  check((await act(P5, 'call', { pick: 'safe', confidence: 80 }))?.error, 'the moderator doesn’t make a call');
  check((await act(players[0], 'call', { pick: 'nope', confidence: 80 }))?.error && (await act(players[0], 'call', { pick: 'safe', confidence: 42 }))?.error, 'a call needs one of the plans and a confidence on the slider');
  await act(players[0], 'call', { pick: 'aggressive', confidence: 80, why: '  the upside   matters ', doubt: 'No robot always scores 8', wonder: 'not asked here' });
  check(await until(() => view(host).answered === 1) && view(host).players.length === 2 && JSON.stringify(view(host)).indexOf('aggressive') === -1, 'the big screen counts calls (not the moderator) without showing them');
  check(await until(() => view(players[0]).mine?.pick === 'aggressive') && view(players[0]).mine.why === 'the upside matters' && view(players[1]).mine === null, 'a phone sees only its own call');
  check(view(players[0]).mine.wonder === '', 'the "one more thing" answer only counts on a case’s last call');
  check((await act(players[0], 'ask', { text: 'Were the 7s defended?' }))?.error, 'no questions on the warm-up’s first call');
  await act(players[0], 'next', { from: roomStep() });
  hostAct(host, 'next', { from: roomStep() });
  await wait(150);
  check(view(host).phase === 'call', 'only the moderator moves the case along');
  /** The moderator moves on, and the big screen catches up. */
  const advance = async (mod) => {
    const from = roomStep();
    await act(mod, 'next', { from });
    return until(() => roomStep() !== from);
  };
  await advance(P5);
  const r0 = view(host);
  check(r0.phase === 'discuss' && r0.roster.length === 1 && r0.roster[0].pick === 'aggressive' && r0.roster[0].doubt === 'No robot always scores 8' && JSON.stringify(r0.counts) === '[0,1]', 'the room is shown: every call, with its confidence and reason');
  await advance(P5);
  check(view(host).phase === 'intel' && view(host).round === 0, 'then new intel');
  await advance(P5);
  check(view(host).phase === 'call' && view(host).round === 1 && (await until(() => view(players[0]).prev?.pick === 'aggressive')) && view(players[0]).mine === null, 'everyone calls it again, starting from their last call');
  await act(players[0], 'call', { pick: 'safe', confidence: 60 });
  await act(players[1], 'call', { pick: 'safe', confidence: 90 });
  await advance(P5);
  const was = view(host).roster.find((e) => e.name === 'P1');
  check(was?.was?.pick === 'aggressive' && was.was.confidence === 80 && view(host).roster.find((e) => e.name === 'P2').was === null, 'the big screen shows who changed their call');
  // questions: anyone but the moderator, as many as they like, never with a name
  check((await act(P5, 'ask', { text: 'Can I ask?' }))?.error, 'the moderator answers questions, not asks them');
  for (const text of ['Were the 7s defended?', 'How many matches?', 'What does the footage show?', 'Was practice defended?']) await act(players[0], 'ask', { text, why: 'could flip it' });
  check((await act(players[1], 'ask', { text: '   ' }))?.error, 'an empty question is refused');
  check(await until(() => view(host).questions.length === 4), 'questions reach the big screen');
  const qs = view(host).questions;
  check(qs[0].text === 'Was practice defended?' && qs.every((q) => !('by' in q) && !('own' in q)) && JSON.stringify(qs).indexOf('P1') === -1, 'questions show on the big screen, newest first, without who asked');
  check(await until(() => view(players[0]).asked === 4 && view(players[1]).questions.length === 4) && view(players[0]).questions.every((q) => q.own) && view(players[1]).questions.every((q) => !q.own), 'your phone marks your own questions');
  check(await until(() => view(P5).inbox.length === 4) && view(P5).waiting === 4 && view(P5).inbox.every((q) => !('by' in q)), 'the moderator’s inbox has every question, without names');
  const [q4, q3, q2, q1] = view(P5).inbox.map((q) => q.id);
  await act(players[1], 'hear', { id: q1 });
  await act(P5, 'hear', { id: q1 });
  check(await until(() => view(host).questions.find((q) => q.id === q1).hear === 1 && view(players[1]).questions.find((q) => q.id === q1).heard), '"I want to hear this too" counts, but not from the moderator');
  check((await act(players[0], 'reply', { id: q1, type: 'unknown' }))?.error, 'only the moderator answers');
  check((await act(P5, 'reply', { id: q1, type: 'answer', text: ' ' }))?.error, 'an answer needs words');
  await act(P5, 'reply', { id: q1, type: 'record', record: 'a-five' });
  check((await act(P5, 'reply', { id: q1, type: 'unknown' }))?.error, 'a question is answered once');
  await act(P5, 'reply', { id: q2, type: 'investigation', investigation: 'a-opponent' });
  check((await act(P5, 'reply', { id: q3, type: 'investigation', investigation: 'a-opponent' }))?.error, 'an investigation runs once');
  await act(P5, 'reply', { id: q3, type: 'investigation', investigation: 'a-tests' });
  const noCredit = await act(P5, 'reply', { id: q4, type: 'investigation', investigation: 'a-defense' });
  check(noCredit?.error && (await until(() => view(P5).credits === 0)), 'investigations cost effort credits, two per case');
  await act(P5, 'reply', { id: q4, type: 'answer', text: 'All of our practice runs were undefended.' });
  check(await until(() => view(host).learned?.length === 3 && view(P5).waiting === 0), 'answers reach the room');
  const answered = view(host).questions.find((q) => q.id === q1).answer;
  check(answered?.type === 'record' && answered.text.startsWith('Five-match scouting card'), 'answers show with the question, and in the case file');
  check(!leaks(), 'answers share only what the moderator chose');
  for (const c of [host, players[0], P5]) check(JSON.stringify(view(c)).length < 16000, `${c === host ? 'hostView' : 'playerView'} is small (${JSON.stringify(view(c)).length} bytes)`);
  // the moderator's phone drops: the leader picks someone else
  P5.socket.disconnect();
  check(await until(() => view(host).moderator?.connected === false && view(players[0]).canRepick) && !view(players[1]).canRepick, 'when the moderator drops, the leader can pick a new one');
  await act(players[0], 'repick');
  check(await until(() => [players[0], players[1]].some((c) => view(c).isModerator) && view(host).moderator?.connected), 'the leader picks a new moderator');
  const mod = [players[0], players[1]].find((c) => view(c).isModerator);
  check(await until(() => JSON.stringify(view(mod)).includes(secret)), 'the new moderator gets the brief');
  for (let k = 0; k < 20 && view(host).phase !== 'wrap'; k++) await advance(mod);
  check(view(host).phase === 'wrap' && view(host).moves.length === lastRound(ROOM[0]) + 1 && view(host).stats.questions === 4, 'the wrap-up shows how the room moved, call by call');
  const minds = view(host).minds;
  check(minds.people === 1 && minds.changedCall === 1 && minds.changedSure === 1 && minds.movers[0]?.name === 'P1' && minds.movers[0].switched && minds.movers[0].from.pick === 'aggressive' && minds.movers[0].to.pick === 'safe', 'the wrap-up shows how minds changed, and who moved');
  await advance(mod);
  check(view(host).phase === 'call' && view(host).at === 2 && view(host).caseIndex === 1 && (await until(() => view(mod).credits === 2 && view(mod).inbox.length === 0)), 'the next case starts fresh: no questions, full credits');
  host.socket.emit('lobby', { cmd: 'end' });
  await until(() => host.room.screen === 'lobby');

  // --- Learn: the leader runs two cases; nobody volunteers ---
  host.socket.emit('lobby', { cmd: 'start' });
  await until(() => view(host)?.phase === 'pick');
  await act(players[0], 'cases', { cases: [3, 1, 99] });
  await act(players[0], 'next', { from: 'pick:0' });
  check(await until(() => view(host).phase === 'intro') && view(host).of === 2 && view(host).caseIndex === 1, 'Learn runs the leader’s chosen cases');
  hostAct(host, 'next', { from: view(host).step });
  check(
    (await until(() => view(host).phase === 'call' && [players[0], players[1]].filter((c) => view(c).isModerator).length === 1)),
    'nobody volunteered: the big screen moves on and someone is picked at random',
  );
  const runner = [players[0], players[1]].find((c) => view(c).isModerator);
  const caller = runner === players[0] ? players[1] : players[0];
  // on the last call of a case with "one more thing", answers go up at the wrap-up without names
  for (let k = 0; k < 40 && !(view(host).caseIndex === 3 && view(host).phase === 'call' && view(host).round === lastRound(ROOM[3])); k++) {
    const from = roomStep();
    await act(runner, 'next', { from });
    await until(() => roomStep() !== from);
  }
  await act(caller, 'call', { pick: 'steady', confidence: 70, wonder: '  Can the pit crew really reset it every time? ' });
  for (let k = 0; k < 4 && view(host).phase !== 'wrap'; k++) {
    const from = roomStep();
    await act(runner, 'next', { from });
    await until(() => roomStep() !== from);
  }
  check(view(host).phase === 'wrap' && JSON.stringify(view(host).wonders) === '["Can the pit crew really reset it every time?"]' && JSON.stringify(view(host).wonders).indexOf(caller.self.you.name) === -1, 'the last call’s "one more thing" shows at the wrap-up, without names');
  for (let k = 0; k < 60 && host.room.screen === 'game'; k++) {
    const from = roomStep();
    await act(runner, 'next', { from });
    await until(() => host.room.screen !== 'game' || roomStep() !== from);
  }
  check(host.room.screen === 'lobby' && /The Strategy Room: 2 cases/.test(host.room.lastResult ?? ''), 'after the last case, back to the lobby');

  // --- the Showdown ---
  const p4 = client('player');
  await wait(150);
  await p4.socket.timeout(3000).emitWithAck('join', { name: 'P4' });
  const p3 = client('player');
  await wait(150);
  await p3.socket.timeout(3000).emitWithAck('join', { name: 'P3' }); // P3 is back, on a new phone
  const four = [players[0], players[1], p3, p4];
  const go = async (from, ms = 250) => {
    hostAct(host, 'next', { from });
    await wait(ms);
  };
  host.socket.emit('lobby', { cmd: 'start' });
  await wait(200);
  hostAct(host, 'lesson', { lessonId: 'risk', partId: 'draft' });
  await go('pick:0');
  const hv = () => view(host);
  check(hv().phase === 'teams' && hv().groups.every((g) => g.members.length === 2 && g.captainId), 'Showdown: two random groups of two, each with a captain');
  check(hv().event.length === draft.teams.length && hv().event.every((s, i) => s.seed === i + 1 && s.scores.length === 10), 'the event: every team seeded, with ten simulated qualification matches');
  check(JSON.stringify(hv().alliances) === JSON.stringify([[hv().event[0].id], [hv().event[1].id]]), 'seeds 1 and 2 captain the alliances');
  check(!JSON.stringify(hv()).includes('"cycles":[') && !JSON.stringify(hv()).includes('"note"'), 'no true attributes before the reveal');
  await go('teams:0');
  check(hv().phase === 'prep' && hv().deadline - Date.now() > 14 * 60 * 1000, 'fifteen minutes to build picklists');
  const groupOf = (p) => view(p).group;
  const captain = (i) => four.find((p) => groupOf(p) === i && view(p).captain);
  const member = (i) => four.find((p) => groupOf(p) === i && !view(p).captain);
  const free = hv().event.slice(2).map((s) => s.id);
  await act(member(0), 'picklist', { teamId: free[0], list: 'pick' });
  await act(member(0), 'picklist', { teamId: free[1], list: 'pick', index: 0 });
  await act(captain(0), 'picklist', { teamId: free[2], list: 'dnp' });
  await wait(250);
  check(JSON.stringify(view(captain(0)).picklist) === JSON.stringify({ pick: [free[1], free[0]], dnp: [free[2]] }), 'the picklist is shared across the group, in order');
  check(view(captain(1)).picklist.pick.length === 0 && !JSON.stringify(hv()).includes('picklist'), 'the other group and the big screen never see it');
  await act(member(0), 'picklist', { teamId: free[1], list: 'bank' });
  await wait(250);
  check(JSON.stringify(view(member(0)).picklist.pick) === JSON.stringify([free[0]]), 'a team can go back to Available');
  await go('prep:0');
  check(hv().phase === 'select' && hv().turn === 0 && hv().deadline - Date.now() > 40000 && hv().deadline - Date.now() <= 45000, 'selection: Alliance 1 first, 45 seconds');
  check((await act(member(0), 'invite', { teamId: free[3] }))?.error, 'only the captain invites');
  check((await act(captain(1), 'invite', { teamId: free[3] }))?.error, 'only the alliance on the clock invites');
  await act(captain(0), 'invite', { teamId: free[3] });
  await wait(250);
  check(hv().turn === 1 && hv().alliances[0].includes(free[3]), 'Alliance 2 is next');
  check((await act(captain(1), 'invite', { teamId: free[3] }))?.error, 'a picked team can’t be picked again');
  await act(captain(1), 'invite', { teamId: free[4] });
  await wait(250);
  check(hv().turn === 1 && hv().deadline - Date.now() > 80000, 'serpentine: Alliance 2 picks again, with 1:30');
  await act(captain(1), 'invite', { teamId: free[5] });
  await wait(250);
  await go('select:3'); // Alliance 1's time runs out: the top of its picklist
  check(hv().alliances[0][2] === free[0] && hv().lastPick.auto, 'when time runs out, the alliance gets the top of its picklist');
  check(hv().phase === 'plan' && hv().alliances.every((a) => a.length === 3), 'two alliances of three, then match planning');
  const [a0, a1] = hv().alliances;
  check((await act(member(0), 'assign', { teamId: a0[0], target: a0[1] }))?.error, 'you can’t defend your own alliance');
  check((await act(member(0), 'assign', { teamId: a0[2], target: a1[0], ifDefending: a1[0] }))?.error, 'the fallback must be a different robot');
  await act(member(0), 'assign', { teamId: a0[2], target: a1[0], ifDefending: a1[1] });
  await wait(250);
  check(view(captain(0)).assign[a0[2]].target === a1[0] && view(captain(0)).assign[a0[2]].ifDefending === a1[1] && view(captain(1)).assign[a0[2]] === undefined, 'assignments (with the fallback) are shared in the group and hidden from the other');
  check(!JSON.stringify(hv()).includes('ifDefending'), 'the big screen doesn’t see assignments before the match');
  check((await act(member(0), 'lock'))?.error, 'only the captain locks in');
  await act(captain(0), 'lock');
  await act(captain(1), 'lock');
  await wait(3200);
  check(hv().phase === 'result' && hv().results.length === 1, 'the match plays once both alliances lock in');
  const r = hv().results[0];
  check(r.odds === null && r.roles[a0[2]].role === 'defend' && r.roles[a0[2]].target === a1[0] && 'brokeAt' in r, 'after a match: who defended whom (and any breakdown time) is shown, win chances still hidden');
  check(r.scores[0] === a0.filter((id) => r.roles[id].role === 'offense').reduce((s, id) => s + r.cycles[id], 0), 'the alliance score is its offense robots’ cycles');
  for (let m = 1; hv().phase !== 'final' && m < 8; m++) {
    await go(`result:${m - 1}`);
    if (hv().phase === 'final') break;
    await go(`plan:${m}`); // the big screen plays the match
  }
  check(hv().phase === 'final' && (hv().wins.includes(2) || hv().results.length === 5), 'the series ends when an alliance wins two (or after five matches)');
  check(hv().reveal && hv().results.every((x) => x.odds && near(x.odds.win[0] + x.odds.tie + x.odds.win[1], 1, 1e-6)), 'the reveal shows each match’s win chance given the assignments');
  check(JSON.stringify(hv()).length < 16000, `Showdown hostView is small (${JSON.stringify(hv()).length} bytes)`);
  hostAct(host, 'finish');
  await wait(200);
  check(/Showdown/.test(host.room.lastResult ?? ''), 'finish reports the series');

  // Alliance 1 may take Alliance 2's captain; the next seed then captains Alliance 2.
  host.socket.emit('lobby', { cmd: 'start' });
  await wait(200);
  hostAct(host, 'lesson', { lessonId: 'risk', partId: 'draft' });
  await go('pick:0');
  await go('teams:0');
  await go('prep:0');
  const seeds = hv().event.map((s) => s.id);
  await act(captain(0), 'invite', { teamId: seeds[1] });
  await wait(250);
  check(JSON.stringify(hv().alliances) === JSON.stringify([[seeds[0], seeds[1]], [seeds[2]]]), 'picking the other captain promotes the next seed');
} finally {
  server.kill();
}
console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
process.exit(failures ? 1 : 0);
