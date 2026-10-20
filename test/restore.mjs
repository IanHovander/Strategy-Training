// Checks that a game survives the host restarting, and that Strategy Training waits for players who have dropped
// out instead of carrying on without them.
//   node test/restore.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { io } from 'socket.io-client';

const PORT = 3197;
const URL = `http://localhost:${PORT}`;
const SAVE_FILE = `.room-${PORT}.local.json`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failures++;
};

async function startServer() {
  const server = spawn(process.execPath, ['server/index.js', '--port', String(PORT)], { stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((ok) => server.stdout.on('data', (d) => String(d).includes('Press Ctrl+C') && ok()));
  return server;
}
const stopServer = (server) => new Promise((ok) => (server.once('exit', ok), server.kill()));

function client(auth) {
  const socket = io(URL, { auth, transports: ['websocket'], forceNew: true, reconnection: false });
  const c = { socket, room: null, self: null, token: null };
  socket.on('room', (r) => (c.room = r));
  socket.on('self', (s) => (c.self = s));
  socket.on('session', (s) => (c.token = s.token));
  return c;
}
const view = (c) => c.self?.view;
const act = (p, type, payload) => p.socket.timeout(3000).emitWithAck('action', { type, payload }).catch(() => 'TIMEOUT');
const join = (p, name) => p.socket.timeout(3000).emitWithAck('join', { name });

fs.rmSync(SAVE_FILE, { force: true });
let server = await startServer();
try {
  // --- a quiz, then the host restarts ---
  let host = client({ role: 'host' });
  const ava = client({ role: 'player' });
  await wait(300);
  await join(ava, 'Ava');
  host.socket.emit('lobby', { cmd: 'start' });
  await wait(300);
  await act(ava, 'lesson', { lessonId: 'risk', partId: 'test' });
  await act(ava, 'next', { from: 'pick:0' });
  await act(ava, 'answer', { answer: 1 });
  await wait(3600);
  await act(ava, 'next', { from: 'reveal:0' });
  await act(ava, 'next', { from: 'scores:0' });
  await wait(200);
  check(view(host)?.phase === 'question' && view(host).q === 1 && view(ava).score === 100, 'a Test is under way: question 2, Ava has 100');

  ava.socket.disconnect();
  await wait(300);
  check(view(host).paused && view(host).deadline === null, 'with nobody connected, the clock stops');

  await wait(400); // let the save reach the disk
  host.socket.disconnect();
  await stopServer(server);
  server = await startServer();
  host = client({ role: 'host' });
  await wait(400);
  check(host.room?.screen === 'game' && view(host)?.phase === 'question' && view(host).q === 1, 'after a restart, the game carries on from the same question');
  check(view(host).paused && host.room.players.length === 1 && !host.room.players[0].connected, 'it waits, clock stopped, for its player to come back');
  const back = client({ role: 'player', token: ava.token });
  await wait(400);
  check(view(back)?.score === 100 && back.self.you?.name === 'Ava' && back.self.you.isVip, 'Ava gets her seat, score and leadership back');
  check(!view(host).paused && view(host).deadline > Date.now(), 'and the clock runs again');
  host.socket.emit('lobby', { cmd: 'end' });
  await wait(200);

  // --- the Showdown waits for a group that has dropped out ---
  const ben = client({ role: 'player' });
  await wait(200);
  await join(ben, 'Ben');
  host.socket.emit('lobby', { cmd: 'start' });
  await wait(300);
  await act(back, 'lesson', { lessonId: 'risk', partId: 'draft' });
  await act(back, 'next', { from: 'pick:0' });
  await wait(200);
  host.socket.emit('action', { type: 'next', payload: { from: view(host).step } }); // teams -> prep
  await wait(200);
  host.socket.emit('action', { type: 'next', payload: { from: view(host).step } }); // prep -> select
  await wait(300);
  check(view(host).phase === 'select' && view(host).pick === 0, 'alliance selection starts');
  const red = view(host).groups[0].members[0];
  const redPhone = view(back).group === 0 ? back : ben;
  check(red === redPhone.self.you.id, 'one player in each group');
  const redToken = redPhone.token;
  redPhone.socket.disconnect();
  await wait(3500);
  check(view(host).phase === 'select' && view(host).pick === 0 && view(host).paused, 'Red is away on its pick: no pick is made for it, and the clock stops');
  const redBack = client({ role: 'player', token: redToken });
  await wait(400);
  check(!view(host).paused && view(host).deadline > Date.now() && view(redBack)?.captain, 'Red is back: its captain is on the clock again');

  // --- Back to Lobby by mistake: the game can be resumed, even after a restart ---
  await act(redBack, 'picklist', { teamId: view(host).event[5].id, list: 'pick' });
  const groups = JSON.stringify(view(host).groups);
  host.socket.emit('lobby', { cmd: 'end' });
  await wait(300);
  check(host.room.screen === 'lobby' && host.room.previous?.name === 'Strategy Training', 'after Back to Lobby, the lobby offers to resume the game');
  await wait(400);
  host.socket.disconnect();
  await stopServer(server);
  server = await startServer();
  host = client({ role: 'host' });
  await wait(400);
  check(host.room.screen === 'lobby' && host.room.previous?.name === 'Strategy Training', 'and still does after a restart');
  const red2 = client({ role: 'player', token: redToken });
  await wait(300);
  host.socket.emit('lobby', { cmd: 'resume' });
  await wait(400);
  check(host.room.screen === 'game' && view(host).phase === 'select' && view(host).pick === 0 && JSON.stringify(view(host).groups) === groups, 'Resume picks up the same selection with the same groups');
  check(view(red2)?.picklist?.pick.length === 1 && !view(host).paused, 'with Red’s picklist intact and the clock running');
  check(host.room.previous === null, 'and the resume offer is used up');
} finally {
  await stopServer(server);
  fs.rmSync(SAVE_FILE, { force: true });
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
process.exit(failures ? 1 : 0);
