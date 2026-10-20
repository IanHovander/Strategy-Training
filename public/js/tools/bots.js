// Fake phones for load-testing the website version (tools/bots.html).
import { keepClockInSync } from '../client.js';
import { PeerSocket } from '../net/peer-client.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const bots = [];
const CLUES = ['spots', 'tall', 'hungry', 'loud', 'cold', 'round', 'fast', 'sticky', 'tiny', 'shiny', 'wet', 'old'];
const pick = (list) => list[Math.floor(Math.random() * list.length)];

$('room').value = (params.get('room') ?? '').toUpperCase();
$('count').value = params.get('n') ?? 10;

$('form').addEventListener('submit', (e) => {
  e.preventDefault();
  const room = $('room').value.trim().toUpperCase();
  const count = Number($('count').value);
  // Start them a little apart, like real people scanning a QR code.
  for (let i = 0; i < count; i++) setTimeout(() => addBot(room), i * 400);
});
$('stop').addEventListener('click', () => location.reload());

function addBot(room) {
  const bot = { name: `Bot${bots.length + 1}`, token: null, view: null, game: null, messages: 0, socket: null, pending: null, tapper: null };
  bots.push(bot);
  const el = document.createElement('div');
  el.className = 'bot';
  $('bots').append(el);
  bot.el = el;

  const socket = new PeerSocket(room, (cb) => cb(bot.token ? { token: bot.token, name: bot.name } : {}));
  bot.socket = socket;
  keepClockInSync(socket); // also tells the big screen this bot is still here
  socket.on('connect', () => {
    if (!bot.token) socket.emit('join', { name: bot.name }, () => {});
    draw(bot);
  });
  socket.on('disconnect', () => draw(bot));
  socket.on('status', (text) => {
    bot.status = text;
    draw(bot);
  });
  socket.on('session', ({ token }) => (bot.token = token));
  socket.on('room', (room) => {
    bot.messages++;
    bot.game = room.game?.id ?? null;
  });
  socket.on('self', (self) => {
    bot.messages++;
    bot.view = self.view;
    play(bot);
    draw(bot);
  });
}

/** Very simple players: tap during races, get through Odd One Out's phases, and play Strategy Training. */
function play(bot) {
  const v = bot.view;
  const racing = bot.game === 'tap-race' && v?.phase === 'go';
  if (racing && !bot.tapper) bot.tapper = setInterval(() => bot.socket.emit('action', { type: 'tap' }), 150 + Math.random() * 120);
  if (!racing && bot.tapper) {
    clearInterval(bot.tapper);
    bot.tapper = null;
  }
  if (!v) return;
  // Act once per phase, after a short random delay. `actions` sends several in a row instead.
  const later = (type, payload, actions = [[type, payload]]) => {
    const key = `${type}:${v.step ?? v.round}:${v.phase}`;
    if (bot.pending === key) return;
    bot.pending = key;
    setTimeout(() => {
      for (const [t, p] of actions) bot.socket.emit('action', { type: t, payload: p });
    }, 800 + Math.random() * 2500);
  };
  // Strategy Training: answer each question (any type); in Alliance Selection, star, pick or guess, and predict.
  if (bot.game === 'frc-strategy') {
    strategy.then(({ lessonById, partById }) => {
      const part = partById(lessonById(v.lessonId), v.partId);
      if (v.phase === 'question' && v.answer == null) later('answer', { answer: randomAnswer(part.questions[v.q]) });
      if (part.kind !== 'draft') return;
      const left = part.draft.robots.filter((r) => !v.picks.some((p) => p.robotId === r.id)).map((r) => r.id);
      if (v.phase === 'scout' && !v.myStars.length) later('star', { robotId: pick(left) });
      if (v.phase === 'draft' && v.turn === v.team && v.captain) later('draftPick', { robotId: pick(left) });
      if (v.phase === 'draft' && v.turn !== v.team && !v.myGuess) later('guess', { robotId: pick(left) });
      if (v.phase === 'plan' && v.myPredict == null) {
        const actions = [['predict', { defenders: Math.floor(Math.random() * 2) }]];
        if (v.captain && !v.locked) actions.push(['lock', {}]);
        later('predict', null, actions);
      }
    });
    return;
  }
  if (bot.game !== 'odd-one-out') return;
  if (v.phase === 'reveal' && !v.ready) later('ready');
  if (v.phase === 'clue' && !v.myClue) later('clue', { clue: pick(CLUES) });
  if (v.phase === 'vote' && !v.myVote && v.choices?.length) later('vote', { playerId: pick(v.choices).id });
}

// Strategy Training's lessons, so bots can give a valid answer to any question.
const strategy = import('../../games/frc-strategy/lessons.js');

function randomAnswer(q) {
  if (q.type === 'number') {
    const { min, max, step = 1 } = q.number;
    const guess = q.number.value + (Math.random() - 0.5) * (max - min) * 0.3;
    return Math.min(max, Math.max(min, Math.round(guess / step) * step));
  }
  if (q.type === 'multi') return q.choices.map((_, i) => i).filter(() => Math.random() < 0.5);
  return Math.floor(Math.random() * q.choices.length);
}

function draw(bot) {
  const on = bot.socket.connected;
  bot.el.className = `bot ${on ? 'on' : ''}`;
  bot.el.innerHTML = '';
  const name = document.createElement('b');
  name.textContent = bot.name;
  const info = document.createElement('span');
  info.className = 'muted';
  info.textContent = on ? `${bot.view?.phase ?? 'lobby'} · ${bot.messages} msgs` : (bot.status ?? 'connecting…');
  bot.el.append(name, info);
  const connected = bots.filter((b) => b.socket.connected).length;
  $('summary').textContent = `${connected} of ${bots.length} connected`;
}
