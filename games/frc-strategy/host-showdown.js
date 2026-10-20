// Big screen for the Showdown: alliances, each round's brief and plan card, the matches, and the standings.
// While plans are open it shows only who has locked in, never what anyone picked.
import { html } from '../../js/ui.js';
import { avatar } from '../../js/avatar.js';
import { board, nextButton, status } from './host-parts.js';
import { lineup, planCard } from './showdown-views.js';

export function showdownHead(v, lesson, part) {
  const round = part.rounds[v.round];
  const locked = v.players.filter((p) => p.done).length;
  return html`
    <header class="st-head">
      <span class="st-lesson">Lesson ${lesson.number}: <b>${part.title}</b></span>
      ${v.phase !== 'teams' && v.phase !== 'final' && html`<span class="st-step">Round ${v.round + 1} / ${part.rounds.length}${v.phase === 'plan' ? '' : `: ${round.title}`}</span>`}
      <span class="spacer"></span>
      ${v.phase === 'plan' &&
      html`
        <span class="st-answered"><b>${locked}</b> / ${v.players.length} locked in</span>
        <span class="timer timer-lg" data-deadline="${v.deadline}"></span>
        <button class="btn btn-sm secondary" data-action="more">+30s</button>
        ${nextButton(v, 'Play Matches ▸', 'btn-sm secondary')}`}
    </header>`;
}

export function showdownBody(v, lesson, part) {
  const round = part.rounds[v.round];
  if (v.phase === 'teams') return teams(v);
  if (v.phase === 'plan') return plan(v, round);
  if (v.phase === 'result') return result(v, round);
  if (v.phase === 'standings') return standings(v, part);
  return final(v, part);
}

const byId = (v) => Object.fromEntries(v.players.map((p) => [p.id, p]));
const teamName = (v, id) => (id === 'house' ? 'House Bots' : v.teams.find((t) => t.id === id)?.name ?? '?');

function members(v, team) {
  const players = byId(v);
  return html`<span class="st-members">${team.members.map((id) => players[id]).filter(Boolean).map((p) => html`<span class="st-who done" style="--c:${p.color}">${avatar(p)}<span>${p.name}</span></span>`)}</span>`;
}

function teams(v) {
  return html`
    <div class="st-title">
      <h1>Showdown</h1>
      <p>Sit with your alliance. You each pick a plan, but you win or lose together.</p>
    </div>
    <div class="st-alliances">
      ${v.teams.map(
        (t) => html`
          <div class="st-alliance">
            <b>${t.name}</b>
            ${members(v, t)}
            ${t.members.length < 3 && html`<small>${3 - t.members.length} empty seat${t.members.length < 2 ? 's' : ''}: a robot on autopilot</small>`}
          </div>`,
      )}
    </div>
    <div class="st-actions">
      <button class="btn btn-sm secondary" data-action="shuffle">Shuffle Alliances</button>
      ${nextButton(v, 'Start Round 1 ▸')}
    </div>`;
}

function plan(v, round) {
  return html`
    <div class="st-sdplan">
      <aside class="st-casefile">
        <span class="st-case-label">Round Brief</span>
        <h2>${round.title}</h2>
        <p>${round.brief}</p>
        <ul>${round.details.map((d) => html`<li>${d}</li>`)}</ul>
      </aside>
      <div class="st-sdside">
        ${planCard(round)}
        <div class="st-matchups">
          ${(v.pairs ?? []).map(([a, b]) => html`<span><b>${teamName(v, a)}</b> vs <b>${teamName(v, b)}</b></span>`)}
        </div>
        <p class="st-instruct">On your phone: <b>1</b> your robot’s plan · <b>2</b> predict their main plan (+20) · <b>3</b> the key question (+20)</p>
      </div>
    </div>
    ${status(v.players)}`;
}

function side(s, won) {
  return html`
    <div class="st-side ${won && 'won'}">
      <b class="st-side-name">${s.name}</b>
      ${lineup(s.plans)}
      <span class="st-side-score">${s.score}</span>
      <small>win chance ${Math.round(100 * (s.win + s.tie / 2))}% · avg ${s.mean.toFixed(1)}</small>
      ${s.teamId !== 'house' && html`<span class="st-gain">+${s.points.total}</span>`}
    </div>`;
}

function result(v, round) {
  return html`
    <div class="st-reveal">
      <div class="st-reveal-main">
        <div class="st-matches ${v.results.length > 2 && 'many'}">
          ${v.results.map(
            (r) => html`
              <div class="st-match">
                ${side(r.a, r.a.score > r.b.score)}
                <span class="st-vs">vs</span>
                ${side(r.b, r.b.score > r.a.score)}
              </div>`,
          )}
        </div>
        <p class="st-foot">Alliance points = win chance (0–100) + 20 for the match win + any bonus. Each player also gets +20 per good call.</p>
      </div>
      <aside class="st-model">
        <h2>What Mattered</h2>
        <p class="st-takeaway">${round.lesson}</p>
        <p><b>Key question:</b> ${round.key.prompt} <b>${round.key.choices[round.key.answer]}</b>. ${round.key.explain}</p>
        ${nextButton(v, 'Standings ▸')}
      </aside>
    </div>`;
}

function allianceTable(v) {
  const gains = Object.fromEntries((v.results ?? []).flatMap((r) => [r.a, r.b]).map((s) => [s.teamId, s.points.total]));
  const list = [...v.teams].sort((a, b) => b.score - a.score);
  return html`
    <div class="st-board ${list.length > 5 && 'tight'}">
      ${list.map(
        (t, i) => html`
          <div class="st-row st-teamrow">
            <span class="st-rank">${i + 1}</span>
            <span class="st-name">${t.name}</span>
            ${members(v, t)}
            ${gains[t.id] != null && html`<span class="st-gain">+${gains[t.id]}</span>`}
            <b class="st-score">${t.score}</b>
          </div>`,
      )}
    </div>`;
}

function standings(v, part) {
  const last = v.round + 1 >= part.rounds.length;
  return html`
    <div class="st-standings">
      <div>
        <div class="st-title"><h1>Alliances</h1><p>After round ${v.round + 1} of ${part.rounds.length}</p></div>
        ${allianceTable(v)}
      </div>
      <div>
        <div class="st-title"><h1>Players</h1><p>Alliance points + good calls</p></div>
        ${board(v.players, 8)}
      </div>
    </div>
    <div class="st-actions">${nextButton(v, last ? 'Final Results ▸' : 'Next Round ▸')}</div>`;
}

function final(v, part) {
  return html`
    <div class="st-standings">
      <div>
        <div class="st-title"><h1>Showdown Champions 🏆</h1><p>${part.rounds.length} rounds · final alliance standings</p></div>
        ${allianceTable(v)}
      </div>
      <aside class="st-report">
        <h2>Key Questions</h2>
        ${part.rounds.map(
          (r, i) => html`
            <div class="st-report-row ${(v.history?.[i]?.keyShare ?? 1) < 0.5 && 'hard'}">
              <span class="st-report-q">${i + 1}. ${r.title}</span>
              <span class="st-bar-track"><span class="st-bar-fill" style="width:${(100 * (v.history?.[i]?.keyShare ?? 0)).toFixed(1)}%"></span></span>
              <b>${v.history?.[i] ? `${Math.round(100 * v.history[i].keyShare)}%` : '–'}</b>
            </div>`,
        )}
        <p class="st-foot">Share of players who got each round’s key question.</p>
        <button class="btn btn-xl block" data-action="finish">Finish ▸</button>
      </aside>
    </div>`;
}
