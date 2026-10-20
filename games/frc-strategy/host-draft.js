// Big screen for Alliance Selection: the teams, the robot pool and the draft board, the matches, and the debrief.
// It never shows a team's stars, guesses, suggestions or lineup before the match plays.
import { html } from '../../js/ui.js';
import { avatar } from '../../js/avatar.js';
import { DRAFT } from './lesson1-draft.js';
import { nextButton } from './host-parts.js';
import { TEAM_NAMES, lineupList, pickOf, robotById, robotCard, teamBadge } from './draft-views.js';

export function draftHead(v, lesson, part) {
  const label = {
    teams: 'Teams',
    scout: 'Scouting',
    draft: `Pick ${Math.min(v.pick + 1, DRAFT.order.length)} of ${DRAFT.order.length}`,
    plan: `Match ${v.match + 1}`,
    result: `Match ${v.match + 1}`,
    final: 'Series Over',
  }[v.phase];
  return html`
    <header class="st-head">
      <span class="st-lesson">Lesson ${lesson.number}: <b>${part.title}</b></span>
      <span class="st-step">${label}</span>
      ${v.phase !== 'teams' && v.phase !== 'scout' && v.phase !== 'draft' && html`<span class="st-series">${teamBadge(0, `Red ${v.teams[0].wins}`)} ${teamBadge(1, `Blue ${v.teams[1].wins}`)}</span>`}
      <span class="spacer"></span>
      ${v.deadline && html`<span class="timer timer-lg" data-deadline="${v.deadline}"></span>`}
      ${(v.phase === 'scout' || v.phase === 'plan') && html`<button class="btn btn-sm secondary" data-action="more">+30s</button>`}
      ${v.phase === 'scout' && nextButton(v, 'Start the Draft ▸', 'btn-sm secondary')}
      ${v.phase === 'draft' && nextButton(v, 'Auto-pick ▸', 'btn-sm secondary')}
      ${v.phase === 'plan' && nextButton(v, 'Play Match ▸', 'btn-sm secondary')}
    </header>`;
}

export function draftBody(v) {
  if (v.phase === 'teams') return teams(v);
  if (v.phase === 'scout' || v.phase === 'draft') return pool(v);
  if (v.phase === 'plan') return plan(v);
  if (v.phase === 'result') return result(v);
  return final(v);
}

const byId = (v) => Object.fromEntries(v.players.map((p) => [p.id, p]));

function roster(v, i) {
  const players = byId(v);
  const team = v.teams[i];
  return html`
    <div class="st-roster-team ${i === 0 ? 'red' : 'blue'}">
      <h2>${TEAM_NAMES[i]} Team</h2>
      <div class="st-members">
        ${team.members.map((id) => players[id]).filter(Boolean).map(
          (p) => html`<span class="st-who done ${p.id === team.captainId && 'captain'}" style="--c:${p.color}">${avatar(p)}<span>${p.name}${p.id === team.captainId && ' · Captain'}</span></span>`,
        )}
      </div>
    </div>`;
}

function teams(v) {
  return html`
    <div class="st-title">
      <h1>Alliance Selection</h1>
      <p>Two teams. Scout the robots, draft an alliance of three, then play a best of three.</p>
    </div>
    <div class="st-rosters">${roster(v, 0)}${roster(v, 1)}</div>
    <p class="st-instruct">Captains pick and set the plans. Everyone else advises from their phone, and guesses the other team’s picks for points.</p>
    <div class="st-actions">
      <button class="btn btn-sm secondary" data-action="shuffle">Shuffle Teams</button>
      ${nextButton(v, 'Start Scouting ▸')}
    </div>`;
}

/** The draft order: six slots, filled as picks come in. */
function order(v) {
  return html`
    <div class="st-order">
      ${DRAFT.order.map((slot, k) => {
        const team = (v.first + slot) % 2;
        const pick = v.picks[k];
        return html`
          <span class="st-slot ${team === 0 ? 'red' : 'blue'} ${k === v.pick && v.phase === 'draft' && 'now'} ${pick && 'done'}">
            <small>${k + 1}</small>${pick ? robotById(pick.robotId)?.name : TEAM_NAMES[team]}
          </span>`;
      })}
    </div>`;
}

function pool(v) {
  const players = byId(v);
  const captain = v.turn != null ? players[v.teams[v.turn].captainId]?.name : null;
  return html`
    <div class="st-poolbar">
      ${order(v)}
      ${v.phase === 'draft'
        ? html`<span class="st-onclock">${teamBadge(v.turn)} on the clock · captain ${captain ?? '?'} picks · ${v.guessed} guess${v.guessed === 1 ? '' : 'es'} in</span>`
        : html`<span class="st-onclock">${teamBadge(v.first)} picks first (coin flip). Star the robots you want on your phone.</span>`}
    </div>
    <div class="st-pool">
      ${DRAFT.robots.map((r) => robotCard(r, { picked: pickOf(v.picks, r.id), compact: true }))}
    </div>`;
}

function allianceColumn(v, i) {
  const ids = v.picks.filter((p) => p.team === i).map((p) => p.robotId);
  return html`
    <div class="st-alliance-col ${i === 0 ? 'red' : 'blue'}">
      <h2>${TEAM_NAMES[i]} Alliance ${v.locked?.[i] ? html`<span class="st-locked">Locked ✓</span>` : html`<span class="st-locked open">Setting plans…</span>`}</h2>
      ${ids.map((id) => robotCard(robotById(id), { compact: true }))}
    </div>`;
}

function plan(v) {
  return html`
    <div class="st-matchup">${allianceColumn(v, 0)}<span class="st-vs">vs</span>${allianceColumn(v, 1)}</div>
    <p class="st-instruct">Captains: set each robot’s plan and lock. Everyone: predict how many of their robots will play Defend (+20) · ${v.predicted} predictions in</p>`;
}

function result(v) {
  const r = v.results.at(-1);
  const won = (i) => r.winner === i;
  const side = (i) => html`
    <div class="st-side ${won(i) && 'won'} ${i === 0 ? 'red' : 'blue'}">
      ${teamBadge(i)}
      <span class="st-side-score">${r.scores[i]}</span>
      <small>win chance ${Math.round(100 * r.chances[i])}% · avg ${r.means[i].toFixed(1)}</small>
      ${lineupList(r.lineups[i])}
    </div>`;
  const over = v.teams.some((t) => t.wins >= 2) || v.results.length >= 5;
  return html`
    <div class="st-reveal">
      <div class="st-reveal-main">
        <div class="st-title"><h1>${r.winner == null ? 'A Tie!' : `${TEAM_NAMES[r.winner]} Wins Match ${v.match + 1}!`}</h1><p>Series: Red ${v.teams[0].wins} – ${v.teams[1].wins} Blue</p></div>
        <div class="st-match big">${side(0)}<span class="st-vs">vs</span>${side(1)}</div>
      </div>
      <aside class="st-model">
        <h2>What Happened</h2>
        <p class="st-takeaway">${verdict(r)}</p>
        <p>Defenders played: Red ${r.defenders[0]}, Blue ${r.defenders[1]}. Points: 60 × your win chance, +30 for the win, +20 for predicting their defenders.</p>
        ${nextButton(v, over ? 'Series Results ▸' : `Plan Match ${v.match + 2} ▸`)}
      </aside>
    </div>`;
}

/** One line on whether the result followed the odds. */
function verdict(r) {
  const fav = r.chances[0] >= r.chances[1] ? 0 : 1;
  const odds = Math.round(100 * r.chances[fav]);
  if (r.winner == null) return 'Dead even on the scoreboard. A tie doesn’t count: play on.';
  if (r.winner === fav) return `${TEAM_NAMES[fav]} had the better plan (${odds}%) and it showed.`;
  return `${TEAM_NAMES[r.winner]} won as the underdog: ${TEAM_NAMES[fav]} had a ${odds}% chance. Judge the plan, not just the result.`;
}

function final(v) {
  const picked = v.picks.map((p) => ({ ...p, robot: robotById(p.robotId) }));
  return html`
    <div class="st-final draft">
      <div class="st-final-main">
        <div class="st-title">
          <h1>${v.champion == null ? 'A Drawn Series' : `${TEAM_NAMES[v.champion]} Wins the Series! 🏆`}</h1>
          <p>Red ${v.teams[0].wins} – ${v.teams[1].wins} Blue · each match: ${v.results.map((r) => r.scores.join('–')).join(', ')}</p>
        </div>
        <div class="st-truths">
          <h2>What the Scouting Hid</h2>
          ${picked.map((p) => html`<p>${teamBadge(p.team, TEAM_NAMES[p.team])} <b>${p.robot.name}</b> (${p.robot.scout.matches} matches scouted): ${p.robot.truth}</p>`)}
        </div>
      </div>
      <aside class="st-report">
        <h2>Takeaways</h2>
        ${DRAFT.lessons.map((l) => html`<p class="st-lessonline">${l}</p>`)}
        <div class="st-toplist">
          ${[...v.players].sort((a, b) => a.rank - b.rank).slice(0, 5).map((p) => html`<span style="--c:${p.color}"><b>${p.rank}</b> ${p.name} <i>${p.score}</i></span>`)}
        </div>
        <button class="btn btn-xl block" data-action="finish">Finish ▸</button>
      </aside>
    </div>`;
}
