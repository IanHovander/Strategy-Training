// Big screen for the Showdown: the groups, the event's scouting data, alliance selection, each match, and the
// reveal. It never shows a picklist, and shows a match's assignments only after the match plays.
import { html } from '../../js/ui.js';
import { avatar } from '../../js/avatar.js';
import { DRAFT } from './lesson1-draft.js';
import { nextButton } from './host-parts.js';
import { GROUPS, assignmentList, groupBadge, scoutCard, scoutOf, teamName, truthRow } from './draft-views.js';

export function draftHead(v, lesson, part) {
  const label = {
    teams: 'Groups',
    prep: 'Picklists',
    select: `Alliance Selection · Pick ${Math.min(v.pick + 1, DRAFT.order.length)} of ${DRAFT.order.length}`,
    plan: `Match ${v.match + 1}`,
    result: `Match ${v.match + 1}`,
    final: 'Series Over',
  }[v.phase];
  const timed = v.phase === 'prep' || v.phase === 'select' || v.phase === 'plan';
  return html`
    <header class="st-head">
      <span class="st-lesson">Lesson ${lesson.number}: <b>${part.title}</b></span>
      <span class="st-step">${label}</span>
      ${(v.phase === 'plan' || v.phase === 'result' || v.phase === 'final') && html`<span class="st-series">${groupBadge(0, `A1 ${v.wins[0]}`)} ${groupBadge(1, `A2 ${v.wins[1]}`)}</span>`}
      <span class="spacer"></span>
      ${timed && v.deadline && html`<span class="timer timer-lg ${v.phase === 'prep' && 'wide'}" data-deadline="${v.deadline}"></span>`}
      ${timed && html`<button class="btn btn-sm secondary" data-action="more">+30s</button>`}
      ${v.phase === 'prep' && nextButton(v, 'Start Selection ▸', 'btn-sm secondary')}
      ${v.phase === 'select' && nextButton(v, 'Time’s Up ▸', 'btn-sm secondary')}
      ${v.phase === 'plan' && nextButton(v, 'Play Match ▸', 'btn-sm secondary')}
    </header>`;
}

export function draftBody(v) {
  if (v.phase === 'teams') return groups(v);
  if (v.phase === 'prep') return prep(v);
  if (v.phase === 'select') return select(v);
  if (v.phase === 'plan') return plan(v);
  if (v.phase === 'result') return result(v);
  return final(v);
}

const byId = (v) => Object.fromEntries(v.players.map((p) => [p.id, p]));

function roster(v, i) {
  const players = byId(v);
  const g = v.groups[i];
  return html`
    <div class="st-roster-team ${i === 0 ? 'red' : 'blue'}">
      <h2>${GROUPS[i]} Group · Alliance ${i + 1}</h2>
      <div class="st-members">
        ${g.members.map((id) => players[id]).filter(Boolean).map(
          (p) => html`<span class="st-who done ${p.id === g.captainId && 'captain'}" style="--c:${p.color}">${avatar(p)}<span>${p.name}${p.id === g.captainId && ' · Captain'}</span></span>`,
        )}
      </div>
      <p>Runs the alliance captained by seed #${i + 1}, <b>${teamName(v.alliances[i][0])}</b>.</p>
    </div>`;
}

function groups(v) {
  return html`
    <div class="st-title">
      <h1>Showdown</h1>
      <p>Two groups, two alliances. Build a picklist, run alliance selection, then win a best of three.</p>
    </div>
    <div class="st-rosters">${roster(v, 0)}${roster(v, 1)}</div>
    <p class="st-instruct">
      ${DRAFT.prepSeconds / 60} minutes to study the teams and build your group’s picklist (the other group can’t see it).
      Then selection: 45 s for first-round picks, 1:30 after. Your captain makes the invitations.
    </p>
    <div class="st-actions">
      <button class="btn btn-sm secondary" data-action="shuffle">Shuffle Groups</button>
      ${nextButton(v, 'Start Picklists ▸')}
    </div>`;
}

function prep(v) {
  return html`
    <div class="st-poolbar">
      <span class="st-onclock">Qualifications are over. Seeds #1 and #2 captain the alliances. Build your picklist on your phone.</span>
    </div>
    <div class="st-pool">${v.event.map((s) => scoutCard(v, s, { compact: true }))}</div>
    <p class="st-legend-line">Bars: how many of 10 qualification matches scored 0, 1–9, 10–19, … 50+. Ratings are scouts’ estimates.</p>`;
}

/** Each alliance: captain and pick slots. */
function allianceBoard(v) {
  return html`
    <div class="st-alliance-board">
      ${[0, 1].map((i) => {
        const slots = [0, 1, 2].map((k) => v.alliances[i][k] ?? null);
        return html`
          <div class="st-alliance-col ${i === 0 ? 'red' : 'blue'} ${v.turn === i && 'onclock'}">
            <h2>Alliance ${i + 1} <small>${GROUPS[i]}</small></h2>
            ${slots.map(
              (id, k) => html`
                <div class="st-slotrow ${!id && 'empty'}">
                  <small>${k === 0 ? 'Captain' : `Pick ${k}`}</small>
                  <b>${id ? teamName(id) : '—'}</b>
                  ${id && html`<span class="st-seed">#${scoutOf(v, id).seed}</span>`}
                </div>`,
            )}
          </div>`;
      })}
    </div>`;
}

function select(v) {
  const players = byId(v);
  const captain = players[v.groups[v.turn].captainId]?.name ?? '?';
  return html`
    <div class="st-select">
      <aside>
        <div class="st-onclock big ${v.turn === 0 ? 'red' : 'blue'}">
          Alliance ${v.turn + 1} on the clock
          <small>${GROUPS[v.turn]} captain ${captain} invites · ${DRAFT.pickSeconds[v.pick]} s</small>
        </div>
        ${allianceBoard(v)}
        ${v.lastPick && html`<p class="st-foot">Last pick: Alliance ${v.lastPick.alliance + 1} took ${teamName(v.lastPick.teamId)}${v.lastPick.auto ? ' (time ran out: top of their picklist)' : ''}.</p>`}
      </aside>
      <div class="st-pool three">${v.event.map((s) => scoutCard(v, s, { compact: true }))}</div>
    </div>`;
}

function allianceCol(v, i) {
  return html`
    <div class="st-alliance-col ${i === 0 ? 'red' : 'blue'}">
      <h2>Alliance ${i + 1} <small>${GROUPS[i]}</small> ${v.locked[i] ? html`<span class="st-locked">Locked ✓</span>` : html`<span class="st-locked open">Assigning…</span>`}</h2>
      ${v.alliances[i].map((id) => scoutCard(v, scoutOf(v, id), { compact: true, plain: true }))}
    </div>`;
}

function plan(v) {
  return html`
    <div class="st-matchup">${allianceCol(v, 0)}<span class="st-vs">vs</span>${allianceCol(v, 1)}</div>
    <p class="st-instruct">On your phones: send each robot to offense or to defend one of theirs. The match plays when both captains lock in.</p>`;
}

function side(v, r, i) {
  return html`
    <div class="st-side ${r.winner === i && 'won'} ${i === 0 ? 'red' : 'blue'}">
      ${groupBadge(i, `Alliance ${i + 1}`)}
      <span class="st-side-score">${r.scores[i]}</span>
      ${assignmentList(r.assign[i], v.alliances[i], r.points, r.broken)}
    </div>`;
}

function result(v) {
  const r = v.results.at(-1);
  const over = v.wins.some((w) => w >= 2) || v.results.length >= DRAFT.maxMatches;
  return html`
    <div class="st-title">
      <h1>${r.winner == null ? 'A Tie! Replay' : `Alliance ${r.winner + 1} Wins Match ${v.match + 1}!`}</h1>
      <p>Series: Alliance 1 ${v.wins[0]} – ${v.wins[1]} Alliance 2${r.broken.length ? ` · broke down: ${r.broken.map(teamName).join(', ')}` : ''}</p>
    </div>
    <div class="st-match big">${side(v, r, 0)}<span class="st-vs">vs</span>${side(v, r, 1)}</div>
    <div class="st-actions">${nextButton(v, over ? 'The Reveal ▸' : `Plan Match ${v.match + 2} ▸`)}</div>`;
}

function final(v) {
  const pct = (x) => `${Math.round(100 * x)}%`;
  return html`
    <div class="st-reveal-grid">
      <div>
        <div class="st-title">
          <h1>${v.champion == null ? 'A Drawn Series' : `Alliance ${v.champion + 1} Wins! 🏆`}</h1>
          <p>${v.champion == null ? '' : `${GROUPS[v.champion]} group · `}${v.wins[0]}–${v.wins[1]}</p>
        </div>
        <div class="st-matchlist">
          ${v.results.map(
            (r, m) => html`
              <div class="st-matchrow">
                <b>Match ${m + 1}</b>
                <span>${r.scores[0]}–${r.scores[1]}${r.winner == null ? ' (tie)' : ''}</span>
                <span>A1 win chance <b>${pct(r.odds.win[0])}</b> · A2 <b>${pct(r.odds.win[1])}</b>${r.odds.tie > 0.005 ? ` · tie ${pct(r.odds.tie)}` : ''}</span>
                <small>A1: ${defenseLine(r.assign[0])} · A2: ${defenseLine(r.assign[1])}</small>
              </div>`,
          )}
        </div>
        <div class="st-takeaways">${DRAFT.lessons.map((l) => html`<p class="st-lessonline">${l}</p>`)}</div>
      </div>
      <div class="st-truth">
        <h2>The Truth Behind the Scouting</h2>
        <table>
          <thead><tr><th>Team</th><th>Avg: scouted → true</th><th>Spread</th><th>Breaks</th><th>Resilience</th><th>Defense</th></tr></thead>
          <tbody>${v.event.map((s) => truthRow(v, s.id))}</tbody>
        </table>
        <button class="btn btn-xl block" data-action="finish">Finish ▸</button>
      </div>
    </div>`;
}

function defenseLine(assign) {
  const defenders = Object.entries(assign).filter(([, t]) => t !== 'offense');
  return defenders.length ? defenders.map(([id, t]) => `${teamName(id)} on ${teamName(t)}`).join(', ') : 'all offense';
}
