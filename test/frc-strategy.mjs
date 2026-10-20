// Checks for Strategy Training: the lesson content, the Showdown model, and a real server played with fake phones
// through Learn, Test and the Showdown.
//   node test/frc-strategy.mjs
import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';
import { LESSONS, partById } from '../games/frc-strategy/lessons.js';
import { bestPoints, cleanAnswer, scoreAnswer, tally, typeOf } from '../games/frc-strategy/quiz.js';
import { PLAN_IDS, effectiveRates, matchOdds, mostUsed } from '../games/frc-strategy/showdown.js';

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
  const showdown = partById(risk, 'showdown');

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

  // --- the Showdown model ---
  const r1 = showdown.rounds[0];
  for (const [i, r] of showdown.rounds.entries()) {
    const o = matchOdds(r, ['cycle', 'power', 'climb'], ['defend', 'cycle', 'climb']);
    check(near(o.a.win + o.a.tie + o.b.win, 1, 1e-9) && r.key.answer < r.key.choices.length && r.house.every((p) => PLAN_IDS.includes(p)), `Showdown round ${i + 1}: odds add up, key and House plans are valid`);
  }
  const r2 = showdown.rounds[1];
  check(near(effectiveRates(r2, ['cycle', 'cycle', 'cycle'], [])[0].p, 0.55), 'crowding: three Cyclers drop to 55% in round 2');
  const r3 = showdown.rounds[2];
  const guarded = effectiveRates(r3, ['cycle', 'power', 'climb'], ['defend', 'cycle', 'cycle']);
  check(guarded[1].guarded && !guarded[0].guarded && near(guarded[1].p, 0.1), 'a defender guards the top scorer (the Power Shot)');
  const r4 = showdown.rounds[3];
  const climbers = effectiveRates(r4, ['climb', 'climb', 'cycle'], []);
  check(climbers[0].climbP === 0.75 && climbers[1].climbP === 0, 'only one robot fits on the round 4 climb');
  check(matchOdds(r1, ['cycle', 'cycle', 'cycle'], ['power', 'power', 'power']).a.win > 0.6, 'round 1: steady Cyclers beat Power Shots');
  check(JSON.stringify(mostUsed(['cycle', 'power', 'cycle'])) === '["cycle"]' && mostUsed(['cycle', 'power', 'climb']).length === 3, 'most-used plan handles ties');

  // --- the solo page reads the same lessons ---
  const solo = await fetch(`${URL}/lessons.html`);
  const soloText = await solo.text();
  check(solo.ok && ['lessons.js', 'explorer.js', 'views.js', 'quiz.js'].every((f) => soloText.includes(`./games/frc-strategy/${f}`)), 'solo page loads the shared lessons, scoring, views and explorer');
  for (const f of ['explorer.js', 'views.js', 'quiz.js', 'prob.js', 'lesson1-learn.js', 'player-showdown.js', 'host-showdown.js']) {
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

  // --- the Showdown ---
  const p4 = client('player');
  await wait(150);
  await p4.socket.timeout(3000).emitWithAck('join', { name: 'P4' });
  const p3 = client('player');
  await wait(150);
  await p3.socket.timeout(3000).emitWithAck('join', { name: 'P3' }); // P3 is back, on a new phone
  const four = [players[0], players[1], p3, p4];
  host.socket.emit('lobby', { cmd: 'start' });
  await wait(200);
  hostAct(host, 'lesson', { lessonId: 'risk', partId: 'showdown' });
  await wait(60);
  hostAct(host, 'next', { from: 'pick:0' });
  await wait(150);
  check(view(host).phase === 'teams' && view(host).teams.length === 2 && view(host).teams.every((t) => t.members.length === 2), 'Showdown: four players make two alliances of two');
  hostAct(host, 'next', { from: 'teams:0' });
  await wait(150);
  check(view(host).phase === 'plan' && view(host).pairs.length === 1, 'Showdown: round 1 pairs the two alliances');
  check((await act(four[0], 'pick', { plan: 'nope' }))?.error, 'an unknown plan is rejected');
  for (const p of four) {
    await act(p, 'pick', { plan: 'cycle' });
    await act(p, 'pick', { predict: 'cycle' });
  }
  await wait(250); // phones get at most ~15 updates a second
  const mates = view(four[0]).team.members;
  check(mates.length === 2 && mates.every((m) => m.plan === 'cycle'), 'teammates see each other’s plans');
  check(!JSON.stringify(view(host)).includes('"plan":"cycle"') && view(host).players.every((p) => !p.done), 'the big screen sees no plans, and nobody is locked in without the key answer');
  for (const p of four) await act(p, 'pick', { key: showdown.rounds[0].key.answer });
  await wait(3400);
  check(view(host).phase === 'result' && view(host).results.length === 1, 'Showdown: the match plays once everyone has locked in');
  const res = view(host).results[0];
  check(near(res.a.win + res.a.tie / 2 + res.b.win + res.b.tie / 2, 1, 1e-9) && res.a.points.decision + res.b.points.decision >= 99, 'both sides share the win chance');
  const me = view(four[0]);
  const mySide = me.result.a.teamId === me.team.id ? me.result.a : me.result.b;
  check(me.gained === mySide.points.total + 40 && me.calls === 2, 'each player gets alliance points plus 20 per good call');
  hostAct(host, 'next', { from: 'result:0' });
  await wait(60);
  check(view(host).phase === 'standings' && view(host).teams.some((t) => t.score > 0), 'standings show alliance totals');
  for (let r = 1; r < showdown.rounds.length; r++) {
    hostAct(host, 'next', { from: `standings:${r - 1}` });
    await wait(150);
    hostAct(host, 'next', { from: `plan:${r}` }); // nobody picks: empty seats run the round's auto plan
    await wait(200);
    check(view(host).phase === 'result', `Showdown round ${r + 1} plays without picks`);
    hostAct(host, 'next', { from: `result:${r}` });
    await wait(150);
  }
  hostAct(host, 'next', { from: `standings:${showdown.rounds.length - 1}` });
  await wait(100);
  check(view(host).phase === 'final' && view(host).history.length === showdown.rounds.length, 'Showdown final with a key-question report');
  check(JSON.stringify(view(host)).length < 16000, `Showdown hostView is small (${JSON.stringify(view(host)).length} bytes)`);
  hostAct(host, 'finish');
  await wait(200);
  check(/Alliance .* won the Risk & Consistency Showdown/.test(host.room.lastResult ?? ''), 'finish names the winning alliance');

  // An odd number of alliances: one plays the House.
  for (const p of four.slice(1)) p.socket.disconnect();
  await wait(200);
  host.socket.emit('lobby', { cmd: 'start' });
  await wait(200);
  hostAct(host, 'lesson', { lessonId: 'risk', partId: 'showdown' });
  hostAct(host, 'next', { from: 'pick:0' });
  await wait(100);
  hostAct(host, 'next', { from: 'teams:0' });
  await wait(100);
  hostAct(host, 'next', { from: 'plan:0' });
  await wait(100);
  check(view(host).results?.[0]?.b.teamId === 'house', 'a lone alliance plays the House Bots');
} finally {
  server.kill();
}
console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
process.exit(failures ? 1 : 0);
