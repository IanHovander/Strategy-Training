// The scouting tablet (index.html): what the strategist picks from at alliance selection in the opening. It's built
// like a real scouting app on a tablet, for the phone in your hand.
//
//   your robot   pinned at the top, a card like every other, so a careful player compares chips straight down
//   a team       its number and name; the average, big (the tempting number); chips for what it scores; a sparkline
//                of its ten qualification matches, so consistency and trends show without a lecture; and a "?" with
//                the face of whoever on the team knows, where the notebook has a gap
//   the clock    45 seconds for the pick, gold, then red for the last ten, then Robin asking for a name
//   compare      your robot and one team side by side: the sum on paper, the chips you share marked BOTH, and, once
//                you know, what you'd really score together
//   invite       "5026 respectfully invites...", then the pick's stamp in the bet log: how good a call it was on what
//                the tablet knew, and the chance of reaching the final it gave you. WIND BACK starts the pick again.
//
// Which Saturday it is (data.js: thin, the first time; full, after the van and Friday's scouting) changes what every
// card knows. The page's controls beside the tablet switch it, for the mockup.

import { CHIPS, WHO, YOU, TEAMS, TAKEN } from './data.js';
import { walkerFrame } from '../walker.js';
import { student } from '../cast.js';

const PICK_SECONDS = 45;
const $ = (id) => document.getElementById(id);
const state = { saturday: 'thin', sort: 'avg', comparing: null, inviting: null, sent: null, left: PICK_SECONDS, timer: null };

const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const last5 = (t) => avg(t.scores.slice(-5));
const knows = (t) => t.known[state.saturday];
/** Match data: her own robot always; everyone else's only once Friday's scouting is in. */
const hasData = (t) => t === YOU || state.saturday === 'full';
const avgOf = (t) => Math.round(avg(t.scores));

// ---- Pictures ----
/** A face from the cast: the head of the i-th student, cut from the walker's front-facing frame. */
function face(i) {
  const c = document.createElement('canvas');
  c.width = 20;
  c.height = 22;
  c.getContext('2d').drawImage(walkerFrame(0, 'stand', 0, student(i)), 8, 0, 20, 22, 0, 0, 20, 22);
  return c;
}
/** The ten matches as a pixel sparkline: the average dashed, the line and its points, the last match bigger. */
function sparkline(t, color) {
  const W = 100, H = 26, max = 50, c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const x = (i) => Math.round(4 + (i * (W - 8)) / (t.scores.length - 1));
  const y = (v) => Math.round(H - 3 - (v / max) * (H - 6));
  g.fillStyle = 'rgba(154, 166, 214, 0.5)';
  for (let px = 0; px < W; px += 3) g.fillRect(px, y(avg(t.scores)), 1, 1);
  // Where the trend turns, the last five matches carry the colour; the rest go quiet.
  const turned = state.sort === 'last5' && Math.abs(last5(t) - avg(t.scores)) > 6;
  for (let i = 0; i < t.scores.length - 1; i++) {
    const [x0, y0, x1, y1] = [x(i), y(t.scores[i]), x(i + 1), y(t.scores[i + 1])];
    g.fillStyle = turned && i < 4 ? '#6b76a8' : color;
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let k = 0; k <= n; k++) g.fillRect(Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n), 1, 1);
    g.globalAlpha = 0.18;
    g.fillRect(x0, Math.min(y0, y1), x1 - x0, H - Math.min(y0, y1));
    g.globalAlpha = 1;
  }
  t.scores.forEach((v, i) => {
    g.fillStyle = turned && i < 5 ? '#6b76a8' : color;
    const s = i === t.scores.length - 1 ? 3 : 2;
    g.fillRect(x(i) - (s >> 1), y(v) - (s >> 1), s, s);
  });
  return c;
}

// ---- The cards ----
function chipsHtml(t, shared = null) {
  return t.chips.map((k) => `<span class="chip ${k}${shared?.has(k) ? ' both' : ''}">${CHIPS[k]}</span>`).join('');
}
function card(t) {
  const you = t === YOU, k = knows(t);
  const el = document.createElement('article');
  el.className = `team${you ? ' you' : ''}${state.comparing === t.num ? ' comparing' : ''}`;
  el.setAttribute('aria-label', you ? `Your robot, ${t.num}` : `Team ${t.num}, ${t.name}`);
  el.innerHTML = `
    <div class="head">
      <div class="num">${you ? 'YOU · ' : ''}${t.num}</div>
      <div class="avg"><b>${avgOf(t)}</b><span>AVG</span></div>
      <div class="name">${t.name}</div>
    </div>
    <div class="chips">${chipsHtml(t)}</div>
    <p class="note">${k.note}</p>`;
  if (hasData(t)) {
    const s = document.createElement('div');
    s.className = 'spark';
    const color = you ? '#ff5b4d' : '#ffc61a';
    s.append(sparkline(t, color));
    const tail = Math.round(last5(t)) !== avgOf(t) && state.sort === 'last5' ? ` · LAST 5: ${Math.round(last5(t))}` : '';
    s.insertAdjacentHTML('beforeend', `<small>${t.scores.length} QUALS${tail}</small>`);
    el.append(s);
  } else {
    el.insertAdjacentHTML('beforeend', `<div class="spark"><small>NO MATCH DATA: THE SHEETS WENT HOME SICK</small></div>`);
  }
  if (k.who) {
    const who = WHO[k.who], ask = document.createElement('div');
    ask.className = 'ask';
    ask.append(face(who.face));
    ask.insertAdjacentHTML('beforeend', `<div><b><span class="q">?</span> ${who.role} KNOWS</b><span>${k.ask}</span></div>`);
    el.append(ask);
  }
  if (!you) {
    const actions = document.createElement('div');
    actions.className = 'actions';
    actions.innerHTML = `
      <button type="button" class="compare" aria-pressed="${state.comparing === t.num}">COMPARE</button>
      <button type="button" class="invite">INVITE</button>`;
    actions.querySelector('.compare').addEventListener('click', () => {
      state.comparing = state.comparing === t.num ? null : t.num;
      render();
    });
    actions.querySelector('.invite').addEventListener('click', () => {
      state.inviting = t.num;
      state.comparing = null;
      render();
    });
    el.append(actions);
  }
  return el;
}

// ---- Compare and invite ----
const team = (num) => TEAMS.find((t) => t.num === num);
function compareDrawer(t) {
  const shared = new Set(t.chips.filter((k) => YOU.chips.includes(k)));
  const full = state.saturday === 'full';
  const d = document.createElement('section');
  d.className = 'drawer';
  d.setAttribute('aria-label', `Your robot and ${t.num} side by side`);
  d.innerHTML = `
    <h3>YOU + ${t.num}</h3>
    <dl class="sum">
      <dt>ON PAPER</dt><dd>${avgOf(YOU)} + ${avgOf(t)} = ${avgOf(YOU) + avgOf(t)}</dd>
      <dt>TOGETHER</dt>
      <dd${full ? '' : ' class="unknown"'}>${full ? `≈ ${t.together.full}<small>${t.together.why}</small>` : '?<small>Nobody has seen you play together. What do you both need?</small>'}</dd>
    </dl>
    <div class="rows">
      <div><span>YOU</span><div class="chips">${chipsHtml(YOU, shared)}</div></div>
      <div><span>${t.num}</span><div class="chips">${chipsHtml(t, shared)}</div></div>
    </div>
    <div class="actions"><button type="button" class="close">CLOSE</button><button type="button" class="invite">INVITE ${t.num}</button></div>`;
  d.querySelector('.close').addEventListener('click', () => { state.comparing = null; render(); });
  d.querySelector('.invite').addEventListener('click', () => { state.inviting = t.num; state.comparing = null; render(); });
  return d;
}
function inviteDrawer(t) {
  const d = document.createElement('section');
  d.className = 'drawer';
  d.setAttribute('aria-live', 'polite');
  if (state.sent !== t.num) {
    d.innerHTML = `
      <h3>AT THE MIC</h3>
      <p class="letter">TEAM ${YOU.num} RESPECTFULLY INVITES TEAM ${t.num} TO JOIN OUR ALLIANCE.</p>
      <div class="actions"><button type="button" class="back">BACK</button><button type="button" class="invite">SAY IT</button></div>`;
    d.querySelector('.back').addEventListener('click', () => { state.inviting = null; render(); });
    d.querySelector('.invite').addEventListener('click', () => { state.sent = t.num; stopClock(); render(); });
    return d;
  }
  const [grade, why, chance] = t.verdict[state.saturday];
  const best = Math.max(...TEAMS.map((x) => x.verdict[state.saturday][2]));
  const mark = { good: '✓', ok: '~', bad: '✗' }[grade];
  d.innerHTML = `
    <h3>${t.num} ACCEPTS!</h3>
    <div class="stamp ${grade}">
      <span class="mark" aria-label="${grade}">${mark}</span>
      <p>${why}<small>PICK 1 · FINAL: ${chance}% · BEST: ${best}%</small></p>
    </div>
    <div class="actions"><button type="button" class="again">WIND BACK</button></div>`;
  d.querySelector('.again').addEventListener('click', restart);
  return d;
}

// ---- The clock ----
function tick() {
  state.left = Math.max(0, state.left - 1);
  drawClock();
  if (state.left === 0) stopClock();
}
function drawClock() {
  const hurry = state.left <= 10;
  $('clock').textContent = `0:${String(state.left).padStart(2, '0')}`;
  $('clock').classList.toggle('hurry', hurry);
  $('fuse').parentElement.classList.toggle('hurry', hurry);
  $('fuse').style.width = `${(state.left / PICK_SECONDS) * 100}%`;
  $('shout').hidden = state.left > 0 || state.sent;
}
function stopClock() {
  clearInterval(state.timer);
  state.timer = null;
}
function restart() {
  stopClock();
  Object.assign(state, { comparing: null, inviting: null, sent: null, left: PICK_SECONDS });
  state.timer = setInterval(tick, 1000);
  render();
}

// ---- Everything ----
function render() {
  $('you').replaceChildren(card(YOU));
  const order = [...TEAMS];
  if (state.sort === 'last5') order.sort((a, b) => last5(b) - last5(a));
  else order.sort((a, b) => avg(b.scores) - avg(a.scores));
  $('teams').replaceChildren(...order.map(card));
  const drawer = state.inviting ? inviteDrawer(team(state.inviting)) : state.comparing ? compareDrawer(team(state.comparing)) : null;
  $('drawer').replaceChildren(...(drawer ? [drawer] : []));
  for (const b of document.querySelectorAll('[data-sort]')) {
    b.setAttribute('aria-pressed', String(b.dataset.sort === state.sort));
    b.disabled = b.dataset.sort === 'last5' && state.saturday === 'thin';
  }
  for (const b of document.querySelectorAll('[data-saturday]')) b.setAttribute('aria-pressed', String(b.dataset.saturday === state.saturday));
  drawClock();
}

$('taken').innerHTML = TAKEN.map(([a, cap, pick]) => `<li><span>ALLIANCE ${a}</span><s>${cap}</s><s>${pick}</s></li>`).join('');
for (const b of document.querySelectorAll('[data-sort]')) b.addEventListener('click', () => { state.sort = b.dataset.sort; render(); });
for (const b of document.querySelectorAll('[data-saturday]')) {
  b.addEventListener('click', () => {
    state.saturday = b.dataset.saturday;
    if (state.saturday === 'thin') state.sort = 'avg';
    restart();
  });
}
$('restart').addEventListener('click', restart);
restart();
