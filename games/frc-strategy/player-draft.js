// Phone for Alliance Selection. Everyone scouts and stars robots (only your team sees your stars). On your team's
// turn the captain picks; on the other team's turn you guess their pick. Before each match the captain sets the
// plans while teammates suggest, and everyone predicts how many defenders the other side will play.
import { html } from '../../js/ui.js';
import { DRAFT } from './lesson1-draft.js';
import { robotPlans } from './alliance.js';
import { PLANS, TEAM_NAMES, lineupList, pickOf, robotById, robotCard, teamBadge } from './draft-views.js';

export function draftPhone(main, api) {
  let view = null;
  let error = '';

  main.addEventListener('click', async (e) => {
    if (!view || !['scout', 'draft', 'plan'].includes(view.phase)) return;
    const btn = e.target.closest('[data-dr]');
    if (!btn) return;
    api.vibrate(15);
    const type = btn.dataset.dr;
    const payload = type === 'predict' ? { defenders: Number(btn.dataset.value) } : type === 'lock' ? {} : { robotId: btn.dataset.robot, plan: btn.dataset.plan };
    const res = await api.send(type, payload);
    error = res?.error ?? '';
    if (error) draw();
  });

  const next = (v, label, extra = '') =>
    html`<button class="btn btn-xl block ${extra}" data-action="next" data-payload="${JSON.stringify({ from: v.step })}">${label}</button>`;

  function draw() {
    main.innerHTML = html`${body(view)}${error && html`<p class="form-error">${error}</p>`}`;
  }

  function header(v, label) {
    return html`
      <div class="st-top">
        ${v.team >= 0 && teamBadge(v.team)}
        <span>${label}</span>
        ${v.deadline && html`<span class="timer" data-deadline="${v.deadline}"></span>`}
      </div>`;
  }

  function teamCard(v) {
    if (v.team < 0) return html`<p class="st-hint">You’ll join a team in a moment.</p>`;
    return html`
      <div class="st-card">
        <span class="st-section">Your team</span>
        <b class="st-card-title">${TEAM_NAMES[v.team]} ${v.captain ? '· You’re the captain' : ''}</b>
        <span>${v.mates.join(', ')}</span>
        <span class="st-hint">${v.captain ? 'You make the picks and set the plans. Listen to your team!' : `${v.captainName} is your captain. Star robots and suggest plans: your captain sees them.`}</span>
      </div>`;
  }

  function rules() {
    return html`
      <details class="st-card st-rules">
        <summary>How matches work</summary>
        <ul class="st-details">${DRAFT.rules.map((r) => html`<li>${r}</li>`)}</ul>
      </details>`;
  }

  function poolCards(v, mode) {
    // mode: 'star' (scout, or advising your captain), 'pick' (captain on the clock), 'guess' (the other team's turn)
    const available = DRAFT.robots.filter((r) => !pickOf(v.picks, r.id));
    const taken = DRAFT.robots.filter((r) => pickOf(v.picks, r.id));
    const button = (r) => {
      const starred = v.myStars.includes(r.id);
      if (mode === 'pick') return html`<button type="button" class="btn block" data-dr="draftPick" data-robot="${r.id}">Pick ${r.name}</button>`;
      if (mode === 'guess')
        return html`<button type="button" class="btn block ${v.myGuess === r.id ? 'secondary' : ''}" data-dr="guess" data-robot="${r.id}">${v.myGuess === r.id ? '✓ Your guess' : `Guess ${r.name}`}</button>`;
      return html`<button type="button" class="btn block ${starred ? 'secondary' : ''}" data-dr="star" data-robot="${r.id}">${starred ? '★ Starred' : '☆ Star'}</button>`;
    };
    return html`
      ${available.map((r) => robotCard(r, { extra: button(r), stars: v.teamStars[r.id] ?? 0, starred: v.myStars.includes(r.id) }))}
      ${taken.length > 0 && html`<p class="st-hint">Already picked</p>`}
      ${taken.map((r) => robotCard(r, { picked: pickOf(v.picks, r.id), compact: true }))}`;
  }

  function mine(v, i = v.team) {
    return v.picks.filter((p) => p.team === i).map((p) => robotById(p.robotId));
  }

  function body(v) {
    if (v.phase === 'teams') {
      return html`
        <div class="st-wait"><h1>Alliance Selection</h1><p>Two teams scout twelve robots, draft three each, then play a best of three.</p></div>
        ${teamCard(v)}
        ${v.isVip && html`<button class="btn block secondary" data-action="shuffle">Shuffle Teams</button>${next(v, 'Start Scouting ▸')}`}`;
    }
    if (v.phase === 'scout') {
      return html`
        ${header(v, 'Scouting')}
        <div class="st-card">
          <span class="st-section">Scout the pool</span>
          <p>Read every report closely: how many matches were scouted? How consistent is it? Star the robots you want. Only your team sees stars.</p>
          <span class="st-hint">${v.first === v.team ? 'Your team picks first.' : 'The other team picks first, then you get two in a row.'}</span>
        </div>
        ${rules()}
        ${poolCards(v, 'star')}
        ${v.isVip && next(v, 'Start the Draft ▸', 'secondary')}`;
    }
    if (v.phase === 'draft') {
      const ours = v.turn === v.team;
      const mode = ours ? (v.captain ? 'pick' : 'star') : 'guess';
      return html`
        ${header(v, `Pick ${v.pick + 1} of ${DRAFT.order.length}`)}
        <div class="st-card st-onclock-card ${ours && 'ours'}">
          <span class="st-section">${teamBadge(v.turn)} on the clock</span>
          <b class="st-card-title">${ours ? (v.captain ? 'Your pick, captain!' : `${v.captainName} is picking`) : 'Guess their pick: +20'}</b>
          <span>${ours ? (v.captain ? 'Your team’s stars are on each card.' : 'Star the robot you want: your captain sees the stars.') : 'Which robot will they take?'}</span>
          ${v.lastGuess && html`<span class="st-hint">Last pick: ${robotById(v.lastGuess.robotId)?.name}. ${v.lastGuess.right} of ${v.lastGuess.guessed} guessed it.</span>`}
        </div>
        ${mine(v).length > 0 && html`<p class="st-hint">Your alliance: ${mine(v).map((r) => r.name).join(', ')}</p>`}
        ${poolCards(v, mode)}`;
    }
    if (v.phase === 'plan') {
      const robots = mine(v);
      const theirs = mine(v, 1 - v.team);
      return html`
        ${header(v, `Match ${v.match + 1} · Red ${v.wins[0]}–${v.wins[1]} Blue`)}
        <div class="st-card">
          <span class="st-section">${v.captain ? 'Set each robot’s plan, then lock' : `Suggest plans: ${v.captainName} decides`}</span>
          ${robots.map((r) => {
            return html`
              <div class="st-planpick">
                <b>${r.name}</b>
                <span class="st-hint">${r.scout.lines.map(([k, val]) => `${k} ${val}`).join(' · ')}</span>
                <div class="st-plan-grid">
                  ${robotPlans(r).map((plan) => {
                    const p = PLANS.find((x) => x.id === plan);
                    const votes = v.suggested[r.id]?.[plan] ?? 0;
                    const chosen = v.lineup?.[r.id] === plan;
                    const mineSuggest = v.mySuggest[r.id] === plan;
                    return html`
                      <button type="button" class="st-answer ${chosen && 'picked'} ${mineSuggest && 'suggested'}" data-dr="lineup" data-robot="${r.id}" data-plan="${plan}">
                        <span class="st-shape">${p.icon}</span>
                        <span>${p.name}${votes > 0 && html`<small> · ${votes} suggest</small>`}</span>
                      </button>`;
                  })}
                </div>
              </div>`;
          })}
          ${v.captain
            ? html`<button type="button" class="btn btn-xl block ${v.locked ? 'secondary' : ''}" data-dr="lock">${v.locked ? 'Locked ✓ (tap to unlock)' : 'Lock Lineup'}</button>`
            : html`<span class="st-hint">${v.locked ? 'Your captain locked the lineup.' : 'Black = your captain’s current plan.'}</span>`}
        </div>
        <div class="st-card">
          <span class="st-section">Predict: how many of their robots will Defend? (+20)</span>
          <div class="st-seg">${[0, 1, 2, 3].map((n) => html`<button type="button" class="${v.myPredict === n && 'on'}" data-dr="predict" data-value="${n}">${n}</button>`)}</div>
        </div>
        <div class="st-card">
          <span class="st-section">${teamBadge(1 - v.team)} their alliance</span>
          ${theirs.map((r) => html`<p><b>${r.name}</b>: ${r.role}. ${r.scout.lines.map(([k, val]) => `${k} ${val}`).join(' · ')}</p>`)}
        </div>
        ${rules()}
        ${v.isVip && next(v, 'Play the Match Now ▸', 'secondary')}`;
    }
    if (v.phase === 'result') {
      const r = v.result;
      const us = v.team;
      const them = 1 - us;
      return html`
        ${header(v, `Match ${v.match + 1}`)}
        <div class="st-result ${r.winner === us && 'best'}">
          <h1>${r.winner == null ? 'A Tie!' : r.winner === us ? 'You Won! 🎉' : 'You Lost'}</h1>
          <span class="st-gained">${r.scores[us]}–${r.scores[them]}</span>
          <p>Your win chance was <b>${Math.round(100 * r.chances[us])}%</b> · Series ${v.wins[us]}–${v.wins[them]}</p>
          <p>+${v.gained ?? 0} points (they played ${r.defenders[them]} defender${r.defenders[them] === 1 ? '' : 's'}; you said ${v.myPredict ?? '–'})</p>
        </div>
        <div class="st-card">
          <span class="st-section">${teamBadge(us)} your lineup</span>
          ${lineupList(r.lineups[us])}
          <span class="st-section">${teamBadge(them)} their lineup</span>
          ${lineupList(r.lineups[them])}
        </div>
        ${v.isVip && next(v, v.wins.some((w) => w >= 2) ? 'Series Results ▸' : `Plan Match ${v.match + 2} ▸`)}`;
    }
    // final
    const champ = v.champion;
    return html`
      <div class="st-result ${champ === v.team && 'best'}">
        <h1>${champ == null ? 'A Drawn Series' : champ === v.team ? 'Your Team Won! 🏆' : `${TEAM_NAMES[champ]} Won the Series`}</h1>
        <span class="st-gained">${v.wins[0]}–${v.wins[1]}</span>
        <p>You: #${v.rank} of ${v.of} · <b>${v.score}</b> points · ${v.calls} good calls</p>
      </div>
      <div class="st-card">
        <span class="st-section">What the scouting hid about your picks</span>
        ${mine(v).map((r) => html`<p><b>${r.name}</b> (${r.scout.matches} matches scouted): ${r.truth}</p>`)}
      </div>
      ${v.isVip && html`<button class="btn btn-xl block" data-action="finish">Finish ▸</button>`}`;
  }

  return {
    update(v) {
      if (v.step !== view?.step) error = '';
      view = v;
      draw();
    },
  };
}
