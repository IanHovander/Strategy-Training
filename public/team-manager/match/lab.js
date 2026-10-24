// The match lab (index.html): a simulated match playing on the field, with the controls to watch it (play, speed,
// scrub, a camera that follows the action or a robot, or that you drag), the plan for each robot, everything that
// happened as a log, and a sheet of every kind of robot in its states.
//
// A match is simulated whole, once, when the plan or the seed changes (sim.js, a few milliseconds); after that every
// frame is just the match at time t (animate.js, draw.js), so scrubbing and replaying cost nothing.

import { useContext, screen, fill, text, C, W, H } from '../pixel.js';
import { simulate, MATCH } from './sim.js';
import { EVENT, TEAMS, ARCHETYPES, robotOf, planOf, qualMatch } from './robots.js';
import { makeShow, frameAt } from './animate.js';
import { drawMatch, cameraFor, wx } from './draw.js';
import { drawBot, KINDS } from './bots.js';
import { WORLD_W } from '../field.js';
import { OURS } from '../opening/teams.js';

const $ = (sel) => document.querySelector(sel);
const params = new URLSearchParams(location.search);
const screenEl = $('#screen'), g = screenEl.getContext('2d', { alpha: false });
g.imageSmoothingEnabled = false;

const S = {
  seed: Number(params.get('seed') ?? Math.floor(Math.random() * 100000)), preset: params.get('preset') ?? 'qual',
  entries: null, show: null, t: Number(params.get('t') ?? 0), playing: false, speed: 1,
  cam: { mode: 'auto', num: null, x: 0 }, lastT: -1,
};
window.lab = S;

// ---- The matches ----
const entry = (num, o = {}) => ({ num: String(num), k: o.k ?? 0, plan: { ...planOf(num), ...(o.plan ?? {}) }, mods: o.mods ?? null });
const PRESETS = {
  qual: () => {
    const q = qualMatch(S.seed, S.seed % 10);
    return { blue: q.blue.map((e) => entry(e.robot.num, { k: S.seed % 10 })), red: q.red.map((e) => entry(e.robot.num, { k: S.seed % 10 })) };
  },
  // The opening's quarterfinal: alliance 4 (hers, red) against alliance 5, 6834 in its rebuilt form. The climbers are
  // the story's: 6834 for red, 6417 for blue, the others on level 2.
  qf: () => quarter({ role: 'defend', defend: '7777' }),
  'qf-open': () => quarter({ role: 'score' }),
  // Match 2: a loose battery, and 6834 is dead on the field at 1:12.
  qf2: () => quarter({ role: 'defend', defend: '7777' }, { force: { troubles: [{ t: MATCH.length - 72, why: 'brownout', dead: true }] } }),
};

function quarter(plan4471, mods6834 = null) {
  return {
    blue: [entry('7777', { k: 9, plan: { climb: 2 } }), entry('6417', { k: 9, plan: { climb: 3 } }), entry('7311', { k: 9 })],
    red: [entry(OURS, { k: 9, plan: { climb: 2 } }), entry('6834', { k: 9, plan: { climb: 3 }, mods: mods6834 }), entry('4471', { k: 9, plan: plan4471 })],
  };
}

function input() {
  const side = (list) => list.map((e) => {
    const robot = { num: e.num, ...robotOf(e.num, { match: e.k }) };
    if (e.mods?.force) robot.force = e.mods.force;
    const plan = { ...e.plan };
    if (plan.role !== 'defend') delete plan.defend;
    return { robot, plan };
  });
  return { seed: S.seed, blue: side(S.entries.blue), red: side(S.entries.red) };
}
function run(keepT = true) {
  const t0 = performance.now();
  S.show = makeShow(simulate(input()));
  S.ms = performance.now() - t0;
  if (!keepT) S.t = 0;
  S.lastT = -1;
  buildPlan();
  buildLog();
  buildChips();
  showResult();
}
function load(preset) {
  S.preset = preset;
  S.entries = (PRESETS[preset] ?? PRESETS.qual)();
  for (const b of document.querySelectorAll('[data-preset]')) b.setAttribute('aria-pressed', String(b.dataset.preset === preset));
  run(false);
}

// ---- The plan ----
const kindOf = (num) => ARCHETYPES[TEAMS[num]?.arch]?.name ?? 'ROBOT';
function options(sel, list, value) {
  sel.innerHTML = '';
  for (const [v, label] of list) {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = label;
    if (String(v) === String(value)) o.selected = true;
    sel.append(o);
  }
}
function buildPlan() {
  const root = $('#plan');
  root.innerHTML = '';
  const plans = Object.fromEntries(S.show.robots.map((r) => [r.num, r.plan]));
  for (const side of ['blue', 'red']) {
    const fs = document.createElement('fieldset');
    fs.className = side;
    fs.innerHTML = `<legend>${side.toUpperCase()}</legend>`;
    const foes = S.entries[side === 'blue' ? 'red' : 'blue'].map((e) => e.num);
    S.entries[side].forEach((e, i) => {
      const robot = robotOf(e.num, { match: e.k }), plan = plans[e.num] ?? {};
      const row = document.createElement('div');
      row.className = 'bot';
      const team = document.createElement('select'), role = document.createElement('select'), piece = document.createElement('select');
      const where = document.createElement('select'), climb = document.createElement('select');
      team.setAttribute('aria-label', `${side} robot ${i + 1}: team`);
      role.setAttribute('aria-label', `${e.num}: what it does`);
      piece.setAttribute('aria-label', `${e.num}: which pieces`);
      where.setAttribute('aria-label', `${e.num}: where it scores`);
      climb.setAttribute('aria-label', `${e.num}: its climb`);
      const taken = [...S.entries.blue, ...S.entries.red].map((x) => x.num);
      options(team, EVENT.filter((n) => n === e.num || !taken.includes(n)).map((n) => [n, `${n} ${kindOf(n)}`]), e.num);
      options(role, [['score', 'SCORES'], ...foes.map((n) => [`defend:${n}`, `DEFENDS ${n}`])], plan.role === 'defend' ? `defend:${S.show.robots.find((r) => r.num === e.num)?.target ?? plan.defend}` : 'score');
      const pieces = [['both', 'BOTH'], ['hatch', 'HATCHES'], ['cargo', 'CARGO']].filter(([p]) => p === 'both'
        ? (robot.hatch.reach || robot.hatch.ship) && (robot.cargo.reach || robot.cargo.ship) : robot[p].reach || robot[p].ship);
      options(piece, pieces.length ? pieces : [['hatch', 'NONE']], plan.piece);
      options(where, [['any', 'ANYWHERE'], ['rocket', 'ROCKETS'], ['ship', 'CARGO SHIP']], plan.where ?? 'any');
      const pct = (l) => (robot.climb[l] ? ` ${Math.round(robot.climb[l][0] * 100)}%` : '');
      options(climb, [[0, 'NO CLIMB'], [1, 'PARK L1'], ...[2, 3].filter((l) => robot.climb[l]).map((l) => [l, `LEVEL ${l}${pct(l)}`])], plan.climb);
      team.onchange = () => {
        S.entries[side][i] = entry(team.value, { k: e.k });
        run();
      };
      const set = (patch) => {
        e.plan = { ...e.plan, ...patch };
        delete e.plan.climbAt;
        run();
      };
      role.onchange = () => set(role.value === 'score' ? { role: 'score' } : { role: 'defend', defend: role.value.split(':')[1] });
      piece.onchange = () => set({ piece: piece.value });
      where.onchange = () => set({ where: where.value });
      climb.onchange = () => set({ climb: Number(climb.value) });
      row.append(team, role, piece, where, climb);
      fs.append(row);
    });
    root.append(fs);
  }
}

// ---- The log and the tally ----
const clockOf = (t) => {
  const s = Math.max(0, Math.ceil(MATCH.length - t - 1e-6));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
let logItems = [];
function buildLog() {
  const log = $('#log');
  log.innerHTML = '';
  logItems = S.show.match.log.filter((l) => l.kind !== 'reboot').map((l) => {
    const li = document.createElement('li');
    li.className = `${l.alliance ?? ''} ${['leave', 'hatch', 'cargo', 'secured', 'hab'].includes(l.kind) ? 'score' : ''}`;
    li.innerHTML = `<time>${clockOf(l.t)}</time><b>${l.by ?? ''}</b><span></span>`;
    li.lastChild.textContent = l.text;
    li.onclick = () => seek(l.t + 0.6);
    log.append(li);
    return { li, t: l.t };
  });
}
function updateLog(t) {
  let last = -1;
  logItems.forEach((it, i) => {
    const past = it.t <= t;
    it.li.classList.toggle('past', past);
    if (past) last = i;
  });
  logItems.forEach((it, i) => it.li.classList.toggle('now', i === last && t - it.t < 3));
  // Keep the latest in view inside the log, without moving the page.
  const log = $('#log'), li = logItems[last]?.li;
  if (li && (li.offsetTop > log.scrollTop + log.clientHeight - 24 || li.offsetTop < log.scrollTop)) log.scrollTop = li.offsetTop - log.clientHeight / 2;
}
function updateTally(frame) {
  const rows = S.show.robots.map((r) => {
    const mine = frame.events.filter((e) => e.by === r.num);
    const pts = mine.reduce((s, e) => s + e.pts, 0);
    const placed = mine.filter((e) => e.kind === 'hatch' || e.kind === 'cargo').length;
    const missed = S.show.match.log.filter((l) => l.by === r.num && l.kind === 'miss' && l.t <= frame.t).length;
    const role = r.plan.role === 'defend' ? `DEFENDS ${r.target ?? ''}` : ARCHETYPES[r.robot.arch]?.name ?? '';
    return `<tr><td class="num ${r.alliance}">${r.num}</td><td>${role}</td><td>${pts}</td><td>${placed}</td><td>${missed}</td></tr>`;
  });
  const html = rows.join('');
  if ($('#tally').innerHTML !== html) $('#tally').innerHTML = html;
}
function showResult() {
  const m = S.show.match, end = S.t >= MATCH.length - 1e-6;
  const what = { qual: `Qualification match, seed ${S.seed}`, qf: 'The quarterfinal, 4471 on 7777', 'qf-open': 'The quarterfinal, nobody defending', qf2: 'Quarterfinal match 2: 6834 browns out at 1:12' }[S.preset];
  const rp = (a) => `${m.rp[a].total} RP${m.rp[a].rocket ? ', rocket' : ''}${m.rp[a].hab ? ', HAB docked' : ''}`;
  $('#result').innerHTML = end
    ? `<b>${m.winner === 'tie' ? 'A TIE' : `${m.winner.toUpperCase()} WINS`}</b> ${m.score.blue} to ${m.score.red}. Blue: ${rp('blue')}. Red: ${rp('red')}. (${what}.)`
    : `${what}. Simulated in ${S.ms.toFixed(0)} ms.`;
}

// ---- The camera ----
function buildChips() {
  const chips = $('#chips');
  chips.innerHTML = '';
  for (const r of S.show.robots) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `chip ${r.alliance}`;
    b.textContent = r.num;
    b.setAttribute('aria-pressed', String(S.cam.mode === 'follow' && S.cam.num === r.num));
    b.onclick = () => follow(r.num);
    chips.append(b);
  }
  if (S.cam.mode === 'follow' && !S.show.robots.some((r) => r.num === S.cam.num)) follow(null);
}
function follow(num) {
  S.cam = { ...S.cam, mode: num ? 'follow' : 'auto', num };
  $('#auto').setAttribute('aria-pressed', String(!num));
  for (const b of document.querySelectorAll('#chips button')) b.setAttribute('aria-pressed', String(b.textContent === num));
}
function cameraTarget(frame) {
  if (S.cam.mode === 'follow') {
    const p = frame.robots.find((r) => r.num === S.cam.num);
    if (p) return Math.max(0, Math.min(WORLD_MAX, wx(p.x) - W / 2));
  }
  return cameraFor(S.show, frame.t);
}
const WORLD_MAX = WORLD_W - W;

// ---- Playing ----
function seek(t) {
  S.t = Math.max(0, Math.min(MATCH.length, t));
  S.snap = true;
}
function setPlaying(on) {
  if (on && S.t >= MATCH.length) S.t = 0;
  S.playing = on;
  $('#play').textContent = on ? 'PAUSE' : 'PLAY';
  $('#play').setAttribute('aria-pressed', String(on));
}
let prev = performance.now();
function tick(now) {
  const dt = Math.min(0.1, (now - prev) / 1000);
  prev = now;
  if (S.playing) {
    S.t += dt * S.speed;
    if (S.t >= MATCH.length) {
      S.t = MATCH.length;
      setPlaying(false);
    }
  }
  const frame = frameAt(S.show, S.t);
  if (S.cam.mode !== 'free') {
    const target = cameraTarget(frame);
    S.cam.x = S.snap ? target : S.cam.x + (target - S.cam.x) * Math.min(1, dt * (S.speed > 4 ? 6 : 2.5));
  }
  S.snap = false;
  const scored = frame.events.some((e) => S.t - e.t < 0.8 && e.kind !== 'leave');
  useContext(g);
  drawMatch(g, S.show, S.t, { camX: S.cam.x, mark: S.cam.mode === 'follow' ? S.cam.num : null, cheer: S.t >= MATCH.length ? 0.6 : scored ? 0.25 : 0 });
  if (Math.abs(S.t - S.lastT) > 0.04) {
    $('#scrub').value = S.t.toFixed(1);
    $('#clock').textContent = `${clockOf(S.t)} ${frame.phase === 'over' ? 'FINAL' : ''}`;
    updateLog(S.t);
    updateTally(frame);
    if ((S.lastT < MATCH.length) !== (S.t < MATCH.length) || S.lastT < 0) showResult();
    S.lastT = S.t;
  }
  requestAnimationFrame(tick);
}

// ---- Controls ----
$('#play').onclick = () => setPlaying(!S.playing);
for (const b of document.querySelectorAll('[data-speed]')) {
  b.onclick = () => {
    S.speed = Number(b.dataset.speed);
    for (const o of document.querySelectorAll('[data-speed]')) o.setAttribute('aria-pressed', String(o === b));
    if (!S.playing) setPlaying(true);
  };
}
document.querySelector('[data-speed="1"]').setAttribute('aria-pressed', 'true');
$('#seed').onclick = () => {
  S.seed = Math.floor(Math.random() * 100000);
  if (S.preset === 'qual') load('qual');
  else run(false);
  setPlaying(true);
};
for (const b of document.querySelectorAll('[data-preset]')) b.onclick = () => load(b.dataset.preset);
$('#scrub').oninput = (e) => seek(Number(e.target.value));
$('#auto').onclick = () => follow(null);
document.addEventListener('keydown', (e) => {
  if (e.target.closest('select, input')) return;
  if (e.key === ' ') { e.preventDefault(); setPlaying(!S.playing); }
  if (e.key === 'ArrowRight') seek(S.t + 2);
  if (e.key === 'ArrowLeft') seek(S.t - 2);
});
// Drag the picture to look along the field yourself; ACTION or a team's chip hands the camera back.
let drag = null;
screenEl.addEventListener('pointerdown', (e) => {
  drag = { x: e.clientX, cam: S.cam.x, moved: false };
  screenEl.setPointerCapture(e.pointerId);
});
screenEl.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const scale = screenEl.getBoundingClientRect().width / W, dx = (e.clientX - drag.x) / scale;
  if (Math.abs(dx) > 2) {
    drag.moved = true;
    screenEl.classList.add('dragging');
    S.cam = { ...S.cam, mode: 'free', x: Math.max(0, Math.min(WORLD_MAX, drag.cam - dx)) };
    $('#auto').setAttribute('aria-pressed', 'false');
    for (const b of document.querySelectorAll('#chips button')) b.setAttribute('aria-pressed', 'false');
  }
});
const endDrag = () => {
  if (drag && !drag.moved) setPlaying(!S.playing);
  drag = null;
  screenEl.classList.remove('dragging');
};
screenEl.addEventListener('pointerup', endDrag);
screenEl.addEventListener('pointercancel', () => { drag = null; screenEl.classList.remove('dragging'); });

// The picture as big as it fits, short enough to leave the play controls in view on a phone held sideways: whole device
// pixels when that's nearly as big (as stage.js does), otherwise all the room there is.
function fit() {
  const dpr = window.devicePixelRatio || 1, room = screenEl.parentElement.clientWidth - 4, tall = window.innerHeight - 110;
  const exact = Math.max(0.5, Math.min(4, room / W, tall / H)), whole = Math.floor(exact * dpr) / dpr;
  screenEl.style.width = `${Math.floor(W * (whole >= exact * 0.8 && whole > 0 ? whole : exact))}px`;
  sheetFit();
}

// ---- The sprite sheet ----
const SHEET = { cell: 46, row: 88, head: 12 };
const STATES = [
  ['REST', {}], ['HATCH', { hold: 'hatch' }], ['CARGO', { hold: 'cargo' }], ['LIP', { hold: 'cargo', lift: 31, reach: 1 }],
  ['L2', { hold: 'hatch', lift: 38, reach: 1 }], ['L3', { hold: 'cargo', lift: 60, reach: 1 }],
  ['CLIMB', { up: 15, legs: { front: 13, rear: 13 }, climbK: 0.5 }], ['DEAD', { dead: true, deadFor: 0.6 }],
];
function drawSheet() {
  const c = $('#sheet'), sg = c.getContext('2d');
  c.height = SHEET.head + KINDS.length * SHEET.row;
  sg.imageSmoothingEnabled = false;
  const prevCtx = useContext(sg);
  screen();
  fill(0, 0, c.width, c.height, '#0d1338');
  // The states along the top, then a row a kind, alternating blue and red.
  fill(0, 0, c.width, SHEET.head, '#070a1a');
  STATES.forEach(([label], i) => text(label, i * SHEET.cell + 23, 4, { font: 3, color: C.steel3, align: 'center' }));
  KINDS.forEach((kind, r) => {
    const y0 = SHEET.head + r * SHEET.row, floor = y0 + SHEET.row - 8;
    fill(0, y0, c.width, SHEET.row, r % 2 ? '#11184a' : '#0d1338');
    fill(0, floor - 2, c.width, 10, '#2b2e3a');
    fill(0, floor - 2, c.width, 1, '#353845');
    const name = Object.values(ARCHETYPES).find((a) => a.sprite === kind)?.name ?? kind.toUpperCase();
    text(name, 3, y0 + 3, { font: 3, color: C.yel2 });
    STATES.forEach(([, st], i) => {
      const team = i % 2 ? 'red' : 'blue', x = i * SHEET.cell + 23;
      drawBot(kind, x, floor, { team, num: team === 'blue' ? OURS : '7777', dir: 1, rsl: true, t: 0, ...st });
    });
  });
  useContext(prevCtx);
}
function sheetFit() {
  const c = $('#sheet'), room = c.parentElement.clientWidth - 4;
  c.style.width = `${c.width * Math.max(1, Math.min(2, Math.floor(room / c.width)))}px`;
}

new ResizeObserver(fit).observe(document.querySelector('.page'));
window.addEventListener('resize', fit);
load(S.preset);
if (params.has('t')) S.t = Number(params.get('t'));
if (params.has('play')) setPlaying(true);
if (params.has('follow')) follow(params.get('follow'));
drawSheet();
fit();
requestAnimationFrame(tick);
