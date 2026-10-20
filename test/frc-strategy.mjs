// Checks for Strategy Training: the lesson content, the Alliance Selection robot model, and a real server played
// with fake phones through Learn, the Test and Alliance Selection.
//   node test/frc-strategy.mjs
import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';
import { LESSONS, partById } from '../games/frc-strategy/lessons.js';
import { bestPoints, cleanAnswer, scoreAnswer, tally, typeOf } from '../games/frc-strategy/quiz.js';
import { bestPlan, effectiveRates, matchOdds, robotDist, robotPlans } from '../games/frc-strategy/alliance.js';

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
  const learn = partById(risk, 'learn');
  const test = partById(risk, 'test');
  const { draft } = partById(risk, 'draft');
  const bot = (id) => draft.robots.find((r) => r.id === id);

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
  check(learn.questions.some((q) => typeOf(q) === 'number') && learn.questions.some((q) => typeOf(q) === 'multi'), 'Learn mixes estimates, picks and pick-all-that-matter');
  check(learn.questions.filter((q) => q.lastInCase).length === learn.cases.length, 'every Learn case has a last step');

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

  // --- the Alliance Selection robot model ---
  const F = draft.field;
  for (const r of draft.robots) {
    const plans = robotPlans(r);
    const sums = plans.map((plan) => robotDist(F, r, effectiveRates(F, { robots: [r], plans: [plan] }, { robots: [], plans: [] })[0]).reduce((s, [, p]) => s + p, 0));
    check(plans.includes('cycle') && plans.includes('defend') && plans.includes(r.start) && sums.every((x) => near(x, 1, 1e-9)) && r.truth && r.scout.lines.length >= 3, `robot ${r.name}: plans, a starting plan, a full distribution, a scouting report and the truth`);
  }
  check(bestPlan(F, bot('tortoise')) === 'climb' && bestPlan(F, bot('flash')) === 'power' && bestPlan(F, bot('wall')) === 'cycle', 'each robot’s best plan matches its strengths');
  const crowd = effectiveRates(F, { robots: [bot('metronome'), bot('anchor')], plans: ['cycle', 'cycle'] }, { robots: [], plans: [] });
  check(near(crowd[0].p, 0.84) && near(crowd[1].p, 0.72), 'two Cyclers crowd each other (−8 points each)');
  const climb = effectiveRates(F, { robots: [bot('ace'), bot('tortoise'), bot('anchor')], plans: ['climb', 'climb', 'climb'] }, { robots: [], plans: [] });
  check(climb[0].climbP > 0 && climb[1].climbP > 0 && climb[2].climbP === 0, 'only two robots fit on the climb');
  const guarded = effectiveRates(F, { robots: [bot('flash'), bot('metronome')], plans: ['power', 'cycle'] }, { robots: [bot('brick')], plans: ['defend'] });
  check(guarded[0].guardedBy === 'brick' && near(guarded[0].p, 0.05) && guarded[1].guardedBy === null, 'a defender guards the most dangerous scorer');
  const lineup = (ids) => ({ robots: ids.map(bot), plans: ids.map((id) => bestPlan(F, bot(id))) });
  const steady = matchOdds(F, lineup(['metronome', 'tortoise', 'anchor']), lineup(['comet', 'spark', 'flash']));
  check(near(steady.a.win + steady.a.tie + steady.b.win, 1, 1e-9) && steady.a.win > steady.b.win, 'consistent, well-scouted robots beat the flashy small-sample ones');
  check(bot('comet').scout.matches <= 5 && bot('spark').scout.matches <= 5 && bot('lucky').scout.matches <= 5, 'the misleading reports are the small samples');

  // --- the solo page reads the same lessons ---
  const solo = await fetch(`${URL}/lessons.html`);
  const soloText = await solo.text();
  check(solo.ok && ['lessons.js', 'explorer.js', 'views.js', 'quiz.js'].every((f) => soloText.includes(`./games/frc-strategy/${f}`)), 'solo page loads the shared lessons, scoring, views and explorer');
  for (const f of ['explorer.js', 'views.js', 'quiz.js', 'prob.js', 'lesson1-learn.js', 'lesson1-draft.js', 'alliance.js', 'draft-views.js', 'player-draft.js', 'host-draft.js']) {
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

  // --- Learn: estimates, pick-all-that-matter, leaderboard per case ---
  host.socket.emit('lobby', { cmd: 'start' });
  await wait(200);
  await act(players[0], 'next', { from: 'pick:0' });
  await wait(100);
  check(view(host).phase === 'question' && view(host).partId === 'learn', 'the leader starts Learn');
  const first = learn.questions[0];
  await act(players[0], 'answer', { answer: first.number.value });
  await act(players[1], 'answer', { answer: first.number.value + 7 });
  await wait(3400);
  check(view(host).phase === 'reveal' && view(players[0]).gained === 100 && view(players[1]).gained === 20, 'Learn: estimates score by closeness');
  check(view(host).tally.median != null && view(host).tally.counts.reduce((a, b) => a + b, 0) === 2, 'Learn: the room’s estimates become a histogram');
  hostAct(host, 'next', { from: 'reveal:0' });
  await wait(100);
  check(view(host).phase === 'question' && view(host).q === 1, 'Learn: mid-case, the next step follows the reveal directly');
  for (let q = 1; !learn.questions[q - 1].lastInCase; q++) {
    if (typeOf(learn.questions[q]) === 'multi') {
      await act(players[0], 'answer', { answer: best(learn.questions[q]) });
      await act(players[1], 'answer', { answer: [] });
    }
    hostAct(host, 'next', { from: `question:${q}` });
    await wait(60);
    if (learn.questions[q].lastInCase) {
      hostAct(host, 'next', { from: `reveal:${q}` });
      await wait(60);
      check(view(host).phase === 'scores', 'Learn: leaderboard after the last step of a case');
      check(view(players[0]).score === 100 + 120 && view(players[1]).score === 20, 'Learn: pick-all-that-matter scores every right pick');
      break;
    }
    hostAct(host, 'next', { from: `reveal:${q}` });
    await wait(60);
  }
  host.socket.emit('lobby', { cmd: 'end' });
  await wait(150);

  // --- Alliance Selection ---
  const p4 = client('player');
  await wait(150);
  await p4.socket.timeout(3000).emitWithAck('join', { name: 'P4' });
  const p3 = client('player');
  await wait(150);
  await p3.socket.timeout(3000).emitWithAck('join', { name: 'P3' }); // P3 is back, on a new phone
  const four = [players[0], players[1], p3, p4];
  host.socket.emit('lobby', { cmd: 'start' });
  await wait(200);
  hostAct(host, 'lesson', { lessonId: 'risk', partId: 'draft' });
  await wait(60);
  hostAct(host, 'next', { from: 'pick:0' });
  await wait(200);
  check(view(host).phase === 'teams' && view(host).teams.every((t) => t.members.length === 2 && t.captainId), 'Alliance Selection: two teams of two, each with a captain');
  hostAct(host, 'next', { from: 'teams:0' });
  await wait(250);
  check(view(host).phase === 'scout', 'scouting starts');
  const teamOf = (p) => view(p).team;
  const captain = (i) => four.find((p) => teamOf(p) === i && view(p).captain);
  const member = (i) => four.find((p) => teamOf(p) === i && !view(p).captain);
  await act(member(0), 'star', { robotId: 'tortoise' });
  await wait(250);
  check(view(captain(0)).teamStars.tortoise === 1 && !view(captain(1)).teamStars.tortoise, 'stars reach your own captain, not the other team');
  check(!JSON.stringify(view(host)).includes('tortoise'), 'the big screen never shows stars');
  hostAct(host, 'next', { from: 'scout:0' });
  await wait(250);
  check(view(host).phase === 'draft' && view(host).turn === view(host).first, 'the coin-flip winner picks first');
  const firstPick = view(host).first;
  check((await act(member(firstPick), 'draftPick', { robotId: 'ace' }))?.error, 'only the captain can pick');
  check((await act(captain(firstPick), 'guess', { robotId: 'ace' }))?.error, 'you can’t guess your own team’s pick');
  await act(member(1 - firstPick), 'guess', { robotId: 'ace' });
  await act(captain(firstPick), 'draftPick', { robotId: 'ace' });
  await wait(250);
  check(view(member(1 - firstPick)).score === 20 && view(host).lastGuess.right === 1, 'a right guess of the other team’s pick earns 20');
  check((await act(captain(1 - firstPick), 'draftPick', { robotId: 'ace' }))?.error, 'a taken robot can’t be picked');
  const order = ['metronome', 'tortoise', 'flash', 'comet', 'spark']; // picks 2–6, serpentine
  for (const id of order) {
    const turn = view(host).turn;
    await act(captain(turn), 'draftPick', { robotId: id });
    await wait(120);
  }
  check(view(host).phase === 'plan' && view(host).picks.length === 6, 'six picks, then match planning');
  check(JSON.stringify(view(host).picks.map((p) => p.team)) === JSON.stringify([0, 1, 1, 0, 0, 1].map((x) => (firstPick + x) % 2)), 'the draft runs serpentine');
  const firstTeam = view(captain(firstPick)).lineup;
  check(firstTeam.ace === 'power' && firstTeam.flash === 'power', 'robots start on the plan their scouting suggests');
  check((await act(captain(firstPick), 'lineup', { robotId: 'flash', plan: 'climb' }))?.error, 'a robot can’t run a plan it has no hardware for');
  await act(member(firstPick), 'lineup', { robotId: 'flash', plan: 'defend' });
  await wait(250);
  check(view(captain(firstPick)).suggested.flash?.defend === 1 && view(captain(firstPick)).lineup.flash === 'power', 'a teammate’s tap is a suggestion the captain sees');
  check(!JSON.stringify(view(host)).includes('"power"'), 'the big screen never shows lineups before the match');
  await act(captain(firstPick), 'lineup', { robotId: 'flash', plan: 'defend' });
  for (const p of four) await act(p, 'predict', { defenders: teamOf(p) === firstPick ? 0 : 1 });
  await act(captain(0), 'lock');
  await act(captain(1), 'lock');
  await wait(3500);
  check(view(host).phase === 'result' && view(host).results.length === 1, 'the match plays once both captains lock');
  const r = view(host).results[0];
  check(near(r.chances[0] + r.chances[1], 1, 1e-9) && r.defenders[firstPick] === 1, 'both sides share the win chance; the defender is on record');
  const me = member(1 - firstPick); // predicted 1 defender from the firstPick team: right
  const won = r.winner === 1 - firstPick ? 30 : r.winner == null ? 15 : 0;
  check(view(me).gained === Math.round(60 * r.chances[1 - firstPick]) + won + 20, 'match points: 60 × win chance + the win + a right prediction');
  for (let m = 1; view(host).phase !== 'final' && m < 6; m++) {
    hostAct(host, 'next', { from: `result:${m - 1}` });
    await wait(200);
    if (view(host).phase === 'final') break;
    hostAct(host, 'next', { from: `plan:${m}` });
    await wait(250);
  }
  check(view(host).phase === 'final' && (view(host).champion === null || view(host).teams[view(host).champion].wins >= 2), 'the series ends with a champion (or a draw after five)');
  check(JSON.stringify(view(host)).length < 16000, `Alliance Selection hostView is small (${JSON.stringify(view(host)).length} bytes)`);
  hostAct(host, 'finish');
  await wait(200);
  check(/Alliance Selection/.test(host.room.lastResult ?? ''), 'finish reports the series');

  // A pick timer running out takes the team's most-starred robot.
  host.socket.emit('lobby', { cmd: 'start' });
  await wait(200);
  hostAct(host, 'lesson', { lessonId: 'risk', partId: 'draft' });
  hostAct(host, 'next', { from: 'pick:0' });
  await wait(150);
  hostAct(host, 'next', { from: 'teams:0' });
  await wait(150);
  const t0 = view(host).first;
  for (const p of four.filter((p) => teamOf(p) === t0)) await act(p, 'star', { robotId: 'brick' });
  hostAct(host, 'next', { from: 'scout:0' });
  await wait(150);
  hostAct(host, 'next', { from: 'draft:0' }); // the big screen's Auto-pick
  await wait(200);
  check(view(host).picks[0]?.robotId === 'brick' && view(host).picks[0].auto, 'auto-pick takes the team’s most-starred robot');
} finally {
  server.kill();
}
console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
process.exit(failures ? 1 : 0);
