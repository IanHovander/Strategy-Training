// Phone for the Showdown: your alliance, the round's brief, and your three calls (plan, prediction, key question).
// Teammates see each other's plans and predictions, so they can coordinate; opponents never do.
import { html } from '../../js/ui.js';
import { SHAPES } from './lessons.js';
import { PLANS } from './showdown.js';
import { lineup, planCard, planName } from './showdown-views.js';

export function showdownPhone(main, api) {
  let view = null;
  let part = null;
  let error = '';

  main.addEventListener('click', async (e) => {
    if (view?.phase !== 'plan' || !part || part.kind !== 'showdown') return;
    const btn = e.target.closest('[data-sd]');
    if (!btn) return;
    api.vibrate(15);
    const field = btn.dataset.sd;
    const value = field === 'key' ? Number(btn.dataset.value) : btn.dataset.value;
    const res = await api.send('pick', { [field]: value });
    error = res?.error ?? '';
    if (error) draw();
  });

  const next = (v, label, extra = '') =>
    html`<button class="btn btn-xl block ${extra}" data-action="next" data-payload="${JSON.stringify({ from: v.step })}">${label}</button>`;

  function draw() {
    const v = view;
    const round = part.rounds[v.round];
    main.innerHTML = html`${body(v, round)}`;
  }

  function header(v) {
    return html`
      <div class="st-top">
        <span>Round ${v.round + 1} / ${part.rounds.length}</span>
        <span class="st-top-score">${v.score} pts</span>
        ${v.deadline && html`<span class="timer" data-deadline="${v.deadline}"></span>`}
      </div>`;
  }

  function teamCard(v, { picks = false } = {}) {
    if (!v.team) return html`<p class="st-hint">You’ll join an alliance next round.</p>`;
    return html`
      <div class="st-card st-team">
        <span class="st-section">Your alliance${v.opponent ? ` · vs ${v.opponent}` : ''}</span>
        <b class="st-card-title">${v.team.name}</b>
        ${v.team.members.map(
          (m) => html`
            <div class="st-mate" style="--c:${m.color}">
              <span class="st-mate-name">${m.name}</span>
              ${picks && html`<span>${m.plan ? planName(m.plan) : '…'}${m.predict ? ` · thinks ${planName(m.predict)}` : ''}</span>`}
            </div>`,
        )}
        ${v.team.members.length < 3 && html`<p class="st-hint">Empty seat${v.team.members.length < 2 ? 's run' : ' runs'} ${planName(part.rounds[v.round].autoPlan)}.</p>`}
      </div>`;
  }

  function body(v, round) {
    if (v.phase === 'teams') {
      return html`
        <div class="st-wait">
          <h1>Showdown</h1>
          <p>Alliances of three. Sit with your alliance and talk it over: you’ll pick plans separately but win or lose together.</p>
        </div>
        ${teamCard(v)}
        ${v.isVip && html`<button class="btn block secondary" data-action="shuffle">Shuffle Alliances</button>${next(v, 'Start Round 1 ▸')}`}`;
    }
    if (v.phase === 'plan') {
      const mine = v.pick ?? {};
      const done = mine.plan && mine.predict && mine.key != null;
      return html`
        ${header(v)}
        <div class="st-card">
          <span class="st-section">Round ${v.round + 1}</span>
          <h2>${round.title}</h2>
          <p>${round.brief}</p>
          <ul class="st-details">${round.details.map((d) => html`<li>${d}</li>`)}</ul>
        </div>
        ${planCard(round, { compact: true })}
        ${teamCard(v, { picks: true })}
        <div class="st-card">
          <span class="st-section">1 · Your robot’s plan</span>
          <div class="st-plan-grid">
            ${PLANS.map(
              (p) => html`
                <button type="button" class="st-answer ${mine.plan === p.id && 'picked'}" data-sd="plan" data-value="${p.id}">
                  <span class="st-shape">${p.icon}</span><span>${p.name}</span>
                </button>`,
            )}
          </div>
        </div>
        <div class="st-card">
          <span class="st-section">2 · Predict: ${v.opponent ?? 'they'} will mostly run…</span>
          <div class="st-plan-grid">
            ${PLANS.map(
              (p) => html`
                <button type="button" class="st-answer ${mine.predict === p.id && 'picked'}" data-sd="predict" data-value="${p.id}">
                  <span class="st-shape">${p.icon}</span><span>${p.name}</span>
                </button>`,
            )}
          </div>
        </div>
        <div class="st-card">
          <span class="st-section">3 · Key question</span>
          <p class="st-prompt">${round.key.prompt}</p>
          <div class="st-answers">
            ${round.key.choices.map(
              (c, i) => html`
                <button type="button" class="st-answer ${mine.key === i && 'picked'}" data-sd="key" data-value="${i}">
                  <span class="st-shape">${SHAPES[i]}</span><span>${c}</span>
                </button>`,
            )}
          </div>
        </div>
        ${error && html`<p class="form-error">${error}</p>`}
        <p class="st-hint">${done ? 'Locked in. You can change anything until the reveal.' : 'Make all three calls.'}</p>
        ${v.isVip && next(v, 'Play the Matches Now ▸', 'secondary')}`;
    }
    if (v.phase === 'result' || v.phase === 'standings') {
      const r = v.result;
      const us = r && (r.a.teamId === v.team?.id ? r.a : r.b);
      const them = r && (us === r.a ? r.b : r.a);
      const mine = v.pick ?? {};
      return html`
        ${header(v)}
        ${us
          ? html`
            <div class="st-result ${us.score > them.score && 'best'}">
              <h1>${us.score > them.score ? 'You Won! 🎉' : us.score === them.score ? 'A Tie!' : 'You Lost'}</h1>
              <span class="st-gained">${us.score}–${them.score}</span>
              <p>Your alliance’s chance to win was <b>${Math.round(100 * (us.win + us.tie / 2))}%</b></p>
            </div>
            <div class="st-card">
              <span class="st-section">The lineups</span>
              <p><b>${us.name}</b> ${lineup(us.plans)} · avg ${us.mean.toFixed(1)}</p>
              <p><b>${them.name}</b> ${lineup(them.plans)} · avg ${them.mean.toFixed(1)}</p>
              <span class="st-section">Your points this round</span>
              <p>Win chance <b>+${us.points.decision}</b> · Match <b>+${us.points.match}</b>${round.bonus && html` · Bonus <b>+${us.points.bonus}</b>`}</p>
              <p>Prediction (${planName(mine.predict)}): <b>${them.plans && us.theirMain.includes(mine.predict) ? '+20' : '+0'}</b> · Key question: <b>${mine.key === round.key.answer ? '+20' : '+0'}</b></p>
            </div>`
          : html`<p class="st-hint">Your alliance sat this round out.</p>`}
        <div class="st-model">
          <h2>What Mattered</h2>
          <p class="st-takeaway">${round.lesson}</p>
          <p><b>Key question:</b> ${round.key.explain}</p>
        </div>
        <p class="st-hint">Alliance rank #${v.teamRank ?? '–'} of ${v.teams} · You: #${v.rank} of ${v.of}, ${v.score} pts</p>
        ${v.isVip && next(v, v.phase === 'result' ? 'Standings ▸' : v.round + 1 < part.rounds.length ? 'Next Round ▸' : 'Final Results ▸')}`;
    }
    return html`
      <div class="st-result best">
        <h1>${v.teamRank === 1 ? 'Your Alliance Won! 🏆' : 'Showdown Complete!'}</h1>
        <span class="st-gained">#${v.teamRank ?? '–'}</span>
        <p>${v.team?.name ?? ''} of ${v.teams} alliances · ${v.team?.score ?? 0} alliance points</p>
        <p>You: #${v.rank} of ${v.of} · <b>${v.score}</b> points · ${v.calls} good calls</p>
      </div>
      ${v.isVip && html`<button class="btn btn-xl block" data-action="finish">Finish ▸</button>`}`;
  }

  return {
    update(v, p) {
      if (v.step !== view?.step) error = '';
      view = v;
      part = p;
      draw();
    },
  };
}
