// Checks for Strategy Training: starts a real server and plays a lesson with fake phones.
//   node test/frc-strategy.mjs
import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';
import { LESSONS, bestPoints } from '../games/frc-strategy/lessons.js';

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

function client(role) {
  const socket = io(URL, { auth: { role }, transports: ['websocket'], forceNew: true, reconnection: false });
  const c = { socket, room: null, self: null };
  socket.on('room', (r) => (c.room = r));
  socket.on('self', (s) => (c.self = s));
  return c;
}
const act = (p, type, payload) => p.socket.timeout(3000).emitWithAck('action', { type, payload }).catch(() => 'TIMEOUT');
const view = (c) => c.self?.view;

try {
  // --- the lessons themselves ---
  for (const lesson of LESSONS) {
    for (const [i, q] of lesson.questions.entries()) {
      const ok = q.choices.length >= 3 && q.choices.length <= 4 && q.choices.every((c) => Number.isInteger(c.points) && c.points >= 0 && c.text && c.result);
      check(ok && bestPoints(q) > 0, `${lesson.title} Q${i + 1}: 3–4 choices, each with points and a result`);
      if (q.explore) {
        const values = Object.fromEntries((q.explore.controls ?? []).map((c) => [c.id, c.value]));
        const m = q.explore.model(values);
        const sane = (m.strategies ?? []).every((s) => s.win >= 0 && s.win + s.tie <= 1 + 1e-9 && s.play().length === 2);
        check(sane && (m.strategies?.length || m.stats?.length), `${lesson.title} Q${i + 1}: explorer gives sane numbers`);
      }
    }
  }
  // The explorers agree with the answers they back up.
  const risk = LESSONS[0];
  const strat = (q, extra = {}) => {
    const ex = risk.questions[q].explore;
    return ex.model({ ...Object.fromEntries((ex.controls ?? []).map((c) => [c.id, c.value])), ...extra }).strategies;
  };
  check(Math.abs(strat(0)[1].win - 0.4) < 1e-9 && strat(0)[0].win === 0, 'Q1: gamble wins 40%, guaranteed 11 wins 0%');
  check(Math.abs(strat(1)[0].win - 0.5) < 1e-9 && Math.abs(strat(1)[1].win - 0.4) < 1e-9, 'Q2: 50% vs 40%');
  check(Math.abs(strat(3)[0].win - 0.23) < 1e-9 && Math.abs(strat(3)[1].win - 0.35) < 1e-9, 'Q4: 23% vs 35%');
  check(Math.abs(strat(4)[0].win - 0.875) < 0.001, 'Q5: 20 shots each, A wins about 87.5%');

  // --- the solo page reads the same lessons ---
  const solo = await fetch(`${URL}/lessons.html`);
  const soloText = await solo.text();
  check(solo.ok && soloText.includes('./games/frc-strategy/lessons.js') && soloText.includes('./games/frc-strategy/explorer.js'), 'solo page loads the shared lessons and explorer');
  check((await fetch(`${URL}/games/frc-strategy/explorer.js`)).ok, 'the shared explorer is served');

  // --- a room plays a lesson ---
  const host = client('host');
  const players = [client('player'), client('player'), client('player')];
  await wait(300);
  for (const [i, p] of players.entries()) await p.socket.timeout(3000).emitWithAck('join', { name: `P${i + 1}` });
  check(host.room.selectedGameId === 'frc-strategy', 'Strategy Training is the lobby’s first choice');
  host.socket.emit('lobby', { cmd: 'select', gameId: 'frc-strategy' });
  host.socket.emit('lobby', { cmd: 'start' });
  await wait(300);
  check(host.room.screen === 'game' && view(host)?.phase === 'pick', 'game starts on the lesson picker');
  check(view(players[0]).isVip && !view(players[1]).isVip, 'the first player is the leader');

  await act(players[1], 'next', { from: 'pick:0' });
  await wait(100);
  check(view(host).phase === 'pick', 'a non-leader phone cannot start the lesson');
  await act(players[0], 'lesson', { lessonId: 'nope' });
  await wait(100);
  check(view(host).lessonId === 'risk', 'an unknown lesson is ignored');
  await act(players[0], 'next', { from: 'pick:0' });
  await wait(100);
  check(view(host).phase === 'question' && view(host).q === 0, 'the leader starts lesson 1');
  check(typeof view(host).deadline === 'number' && view(host).answered === 0, 'question has a deadline and no answers yet');

  check((await act(players[0], 'answer', { choice: 9 }))?.error, 'out-of-range answer is rejected');
  check((await act(players[0], 'answer', { choice: '1' }))?.error, 'non-number answer is rejected');
  await act(players[0], 'answer', { choice: 0 });
  await act(players[0], 'answer', { choice: 1 }); // changed their mind: the best answer
  await act(players[1], 'answer', { choice: 0 });
  await wait(100);
  check(view(host).answered === 2 && view(host).counts === null, 'big screen sees how many answered, not what');
  check(view(host).players.every((p) => !('choice' in p)), 'big screen never sees who picked what');
  check(view(players[1]).choice === 0 && view(players[1]).counts === null, 'a phone sees only its own answer before the reveal');

  players[2].socket.disconnect(); // the last player drops out: don't wait for them
  await wait(3600);
  check(view(host).phase === 'reveal', 'reveals once everyone still connected has answered');
  check(JSON.stringify(view(host).counts) === '[1,1,0]', 'reveal shows how many picked each answer');
  check(view(players[0]).gained === 100 && view(players[0]).score === 100, 'best answer earns its points');
  check(view(players[1]).gained === 0 && view(players[1]).rank === 2, 'wrong answer earns 0 and ranks lower');

  await act(players[0], 'next', { from: 'question:0' });
  await wait(100);
  check(view(host).phase === 'reveal', 'a stale "next" (double tap) is ignored');
  host.socket.emit('action', { type: 'next', payload: { from: 'reveal:0' } });
  await wait(100);
  check(view(host).phase === 'scores', 'big screen moves on to the leaderboard');
  const top = view(host).players.find((p) => p.name === 'P1');
  check(top.rank === 1 && top.gained === 100, 'leaderboard ranks P1 first with +100');

  // Play the rest: the leader always picks the best answer.
  for (let q = 1; q < risk.questions.length; q++) {
    await act(players[0], 'next', { from: `scores:${q - 1}` });
    await wait(50);
    const best = risk.questions[q].choices.findIndex((c) => c.points === bestPoints(risk.questions[q]));
    await act(players[0], 'answer', { choice: best });
    host.socket.emit('action', { type: 'next', payload: { from: `question:${q}` } }); // reveal now
    await wait(50);
    await act(players[0], 'next', { from: `reveal:${q}` });
    await wait(50);
  }
  check(view(host).phase === 'scores' && view(host).q === risk.questions.length - 1, 'played through every question');
  await act(players[0], 'next', { from: `scores:${risk.questions.length - 1}` });
  await wait(100);
  const max = risk.questions.reduce((s, q) => s + bestPoints(q), 0);
  check(view(host).phase === 'final' && view(players[0]).score === max, `final: a perfect run scores ${max}`);
  check(view(players[0]).best === risk.questions.length && view(players[0]).asked === risk.questions.length, 'final: phone counts best answers');
  check(view(host).history?.length === risk.questions.length, 'final: big screen gets the per-question report');
  check(JSON.stringify(view(host)).length < 16000, `hostView is small (${JSON.stringify(view(host)).length} bytes)`);

  host.socket.emit('action', { type: 'finish' });
  await wait(200);
  check(host.room.screen === 'lobby' && /P1 topped Risk & Consistency/.test(host.room.lastResult ?? ''), 'finish goes back to the lobby with the winner');
} finally {
  server.kill();
}
console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
process.exit(failures ? 1 : 0);
