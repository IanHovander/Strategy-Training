// Checks for Strategy Training: the lesson content, the Showdown match model, and a real server played with fake
// phones through Learn, the Test and the Showdown.
//   node test/frc-strategy.mjs
import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';
import { LESSONS, partById } from '../games/frc-strategy/lessons.js';
import { bestPoints, cleanAnswer, scoreAnswer, tally, typeOf } from '../games/frc-strategy/quiz.js';
import { allianceDist, bucketCounts, keepShare, matchOdds, playMatch, scoreDist, scoutTeam } from '../games/frc-strategy/alliance.js';
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
  const learn = partById(risk, 'learn');
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

  // --- the Showdown match model ---
  for (const tm of draft.teams) {
    const dist = scoreDist(tm);
    const ok = near(dist.reduce((s, [, p]) => s + p, 0), 1, 1e-9) && dist[0][0] === 0 && dist[0][1] >= tm.broken && tm.broken > 0;
    check(ok && tm.resilience >= 0 && tm.resilience <= 1 && tm.defense >= 0 && tm.defense <= 1 && tm.note, `team ${tm.name}: a full distribution with a breakdown chance, and attributes in range`);
  }
  check(near(mean(scoreDist(T('metronome'))), 0.98 * 30, 0.2), 'a team averages (1 − breakdown) × its working mean');
  check(near(keepShare(T('feather'), [T('brick')]), 1 - 0.85 * 0.9, 1e-9) && near(keepShare(T('tank'), [T('brick')]), 1 - 0.85 * 0.05, 1e-9), 'defense hurts fragile robots and barely touches resilient ones');
  check(near(keepShare(T('feather'), [T('brick'), T('wall')]), (1 - 0.85 * 0.9) * (1 - 0.6 * 0.9), 1e-9), 'two defenders on one robot both apply');
  const off = (ids) => Object.fromEntries(ids.map((id) => [id, 'offense']));
  const A = ['apex', 'metronome', 'eddie'].map(T);
  const B = ['glass', 'feather', 'brick'].map(T);
  const plain = matchOdds(A, off(A.map((t) => t.id)), B, off(B.map((t) => t.id)));
  check(near(plain.a.win + plain.a.tie + plain.b.win, 1, 1e-9), 'win, tie and loss chances add up');
  const brickOnFeather = matchOdds(A, off(A.map((t) => t.id)), B, { glass: 'offense', feather: 'offense', brick: 'feather' });
  check(brickOnFeather.a.win > plain.a.win, 'defense on your own robot lowers your win chance');
  const brickOnApex = matchOdds(A, off(A.map((t) => t.id)), B, { glass: 'offense', feather: 'offense', brick: 'apex' });
  const eddieOnFeather = matchOdds(A, { apex: 'offense', metronome: 'offense', eddie: 'feather' }, B, off(B.map((t) => t.id)));
  check(brickOnApex.b.win < plain.b.win && eddieOnFeather.a.win < plain.a.win, 'defending a resilient robot, or with a weak defender, costs more than it saves');
  const withBrokenDefender = allianceDist([T('feather')], { feather: 'offense' }, [T('brick')], { brick: 'feather' });
  check(near(mean(withBrokenDefender), mean(scoreDist(T('feather'))) * (0.03 + 0.97 * keepShare(T('feather'), [T('brick')])), 0.3), 'a broken defender defends nobody');
  let wins = 0;
  let seed = 1;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 4000; k++) {
    const m = playMatch(A, off(A.map((t) => t.id)), B, off(B.map((t) => t.id)), rand);
    if (m.scores[0] > m.scores[1]) wins++;
  }
  check(near(wins / 4000, plain.a.win, 0.03), `played matches follow the odds (${(wins / 40).toFixed(1)}% vs ${(100 * plain.a.win).toFixed(1)}%)`);
  const scouted = scoutTeam(T('ghost'), draft, rand);
  check(scouted.scores.length === 10 && scouted.resilience >= 1 && scouted.resilience <= 10 && bucketCounts(scouted.scores).reduce((a, b) => a + b, 0) === 10, 'scouting draws ten matches and 1–10 ratings');

  // --- the solo page reads the same lessons ---
  const solo = await fetch(`${URL}/lessons.html`);
  const soloText = await solo.text();
  check(solo.ok && ['lessons.js', 'explorer.js', 'views.js', 'quiz.js'].every((f) => soloText.includes(`./games/frc-strategy/${f}`)), 'solo page loads the shared lessons, scoring, views and explorer');
  for (const f of ['explorer.js', 'views.js', 'quiz.js', 'prob.js', 'lesson1-learn.js', 'lesson1-draft.js', 'alliance.js', 'draft-views.js', 'player-draft.js', 'host-draft.js', 'picklist.js']) {
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
  check(!JSON.stringify(hv()).includes('"resilience":0.') && !JSON.stringify(hv()).includes('"mean":'), 'no true attributes before the reveal');
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
  await act(member(0), 'assign', { teamId: a0[2], target: a1[0] });
  await wait(250);
  check(view(captain(0)).assign[a0[2]] === a1[0] && view(captain(1)).assign[a0[2]] === undefined, 'assignments are shared in the group and hidden from the other');
  check(!JSON.stringify(hv()).includes(`"${a0[2]}":"${a1[0]}"`), 'the big screen doesn’t see assignments before the match');
  check((await act(member(0), 'lock'))?.error, 'only the captain locks in');
  await act(captain(0), 'lock');
  await act(captain(1), 'lock');
  await wait(3200);
  check(hv().phase === 'result' && hv().results.length === 1, 'the match plays once both alliances lock in');
  const r = hv().results[0];
  check(r.odds === null && r.assign[0][a0[2]] === a1[0], 'after a match: assignments shown, win chances still hidden');
  check(r.scores[0] === a0.reduce((s, id) => s + r.points[id], 0), 'the alliance score is the sum of its robots');
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
