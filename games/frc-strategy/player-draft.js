// Phone for the Showdown: your group, the shared picklist (picklist.js), the captain's invitations, defense
// assignments for each match, and the reveal.
import { html } from '../../js/ui.js';
import { DRAFT } from './lesson1-draft.js';
import { mountPicklist } from './picklist.js';
import { GROUPS, average, defenseEffect, groupBadge, pct, ratings, roleList, scoutOf, teamName, truth } from './draft-views.js';

export function draftPhone(main, api) {
  let view = null;
  let error = '';
  let shownPhase = null;

  const top = document.createElement('div');
  const list = document.createElement('div');
  const bottom = document.createElement('div');
  let picklist = null;

  const send = async (type, payload) => {
    const res = await api.send(type, payload);
    error = res?.error ?? '';
    if (error) drawTop();
  };

  main.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-sd]');
    if (!btn) return;
    api.vibrate(15);
    if (btn.dataset.sd === 'assign') {
      let ifDefending = btn.dataset.if ?? view.assign?.[btn.dataset.team]?.ifDefending ?? 'stay';
      if (ifDefending === btn.dataset.target) ifDefending = 'stay';
      send('assign', { teamId: btn.dataset.team, target: btn.dataset.target, ifDefending });
    }
    if (btn.dataset.sd === 'lock') send('lock', {});
    if (btn.dataset.sd === 'invite') send('invite', { teamId: btn.dataset.team });
  });

  const next = (v, label, extra = '') =>
    html`<button class="btn btn-xl block ${extra}" data-action="next" data-payload="${JSON.stringify({ from: v.step })}">${label}</button>`;

  const onClock = (v) => v.phase === 'select' && v.turn === v.group && v.captain;

  function header(v, label) {
    return html`
      <div class="st-top">
        ${v.group >= 0 && groupBadge(v.group, `${GROUPS[v.group]} · A${v.group + 1}`)}
        <span>${label}</span>
        ${v.deadline && html`<span class="timer" data-deadline="${v.deadline}"></span>`}
      </div>`;
  }

  function groupCard(v) {
    if (v.group < 0) return html`<p class="st-hint">You’ll join a group in a moment.</p>`;
    return html`
      <div class="st-card">
        <span class="st-section">Your group runs Alliance ${v.group + 1}</span>
        <b class="st-card-title">${GROUPS[v.group]} ${v.captain ? '· You’re the captain' : ''}</b>
        <span>${v.mates.join(', ')}</span>
        <span class="st-hint">${v.captain ? 'You make the invitations and lock in each match. Listen to your group.' : `${v.captainName} is your captain.`}</span>
      </div>`;
  }

  function rules() {
    return html`
      <details class="st-card st-rules">
        <summary>How matches work</summary>
        <ul class="st-details">${DRAFT.rules.map((r) => html`<li>${r}</li>`)}</ul>
      </details>`;
  }

  /** The part above the picklist, or the whole screen when there's no picklist. */
  function topHtml(v) {
    if (v.phase === 'teams') {
      return html`
        <div class="st-wait"><h1>Showdown</h1><p>Two groups, two alliances. Sit with your group.</p></div>
        ${groupCard(v)}
        ${rules()}
        ${v.isVip && html`<button class="btn block secondary" data-action="shuffle">Shuffle Groups</button>${next(v, 'Start Picklists ▸')}`}`;
    }
    if (v.phase === 'prep') {
      return html`
        ${header(v, 'Build your picklist')}
        <div class="st-card">
          <span class="st-section">Alliance ${v.group + 1} · captained by seed #${v.group + 1}, ${teamName(v.alliances[v.group]?.[0])}</span>
          <span>Rank the teams you want, best first. Your whole group edits this list; the other group can’t see it. Tap a team for its scouting; hold and drag to move it.</span>
          <span class="st-hint">If time runs out on a pick, your alliance gets the top available team on this list.</span>
        </div>
        ${rules()}
        ${v.isVip && next(v, 'Start Selection ▸', 'secondary')}`;
    }
    if (v.phase === 'select') {
      const ours = v.turn === v.group;
      const firstUp = v.picklist.pick.find((id) => v.alliances.flat().indexOf(id) < 0);
      return html`
        ${header(v, `Pick ${v.pick + 1} of ${DRAFT.order.length}`)}
        <div class="st-card st-onclock-card ${ours && 'ours'}">
          <span class="st-section">${groupBadge(v.turn, `Alliance ${v.turn + 1}`)} on the clock</span>
          <b class="st-card-title">${ours ? (v.captain ? 'Your invitation, captain!' : `${v.captainName} is inviting`) : 'The other alliance is picking'}</b>
          <span>${v.alliances.map((ids, i) => `A${i + 1}: ${ids.map(teamName).join(', ')}`).join(' · ')}</span>
          ${onClock(v) && firstUp && html`<button type="button" class="btn btn-xl block" data-sd="invite" data-team="${firstUp}">Invite ${teamName(firstUp)} (top of list)</button>`}
          ${onClock(v) && html`<span class="st-hint">Or tap any team below and invite it.</span>`}
          ${v.lastPick && html`<span class="st-hint">Last pick: A${v.lastPick.alliance + 1} took ${teamName(v.lastPick.teamId)}${v.lastPick.auto ? ' when time ran out' : ''}.</span>`}
        </div>`;
    }
    if (v.phase === 'plan') {
      const ours = v.alliances[v.group] ?? [];
      const theirs = v.alliances[1 - v.group] ?? [];
      return html`
        ${header(v, `Match ${v.match + 1} · A1 ${v.wins[0]}–${v.wins[1]} A2`)}
        <div class="st-rulebox">
          <b>How defense works</b>
          <span>A defended robot loses <b>defender’s ability × its susceptibility</b> of its cycles: a 60% defender on a 50%-susceptible robot takes 30%. The numbers on the buttons use your scouts’ estimates (±20%).</span>
          <span>If the robot you defend is defending too, stay on it (its defense weakens by the same rule) or switch to another robot. Roles don’t change mid-match.</span>
          <span>A defender breaks down with its usual chance of 0 cycles <b>+5%</b>, at a random moment: it defends the cycles before that and not the ones after.</span>
        </div>
        <div class="st-card">
          <span class="st-section">Assign your robots ${v.locked[v.group] ? '· locked ✓' : ''}</span>
          ${ours.map((id) => robotPlan(v, id, theirs))}
          ${v.captain
            ? html`<button type="button" class="btn btn-xl block ${v.locked[v.group] ? 'secondary' : ''}" data-sd="lock">${v.locked[v.group] ? 'Locked ✓ (tap to unlock)' : 'Lock In'}</button>`
            : html`<span class="st-hint">Anyone in your group can change these. ${v.captainName} locks in.</span>`}
          <span class="st-hint">${v.locked[1 - v.group] ? 'The other alliance has locked in.' : 'The other alliance is still deciding.'}</span>
        </div>
        <div class="st-card">
          <span class="st-section">${groupBadge(1 - v.group, `Alliance ${2 - v.group}`)} their robots</span>
          ${theirs.map((id) => {
            const s = scoutOf(v, id);
            return html`<p><b>${teamName(id)}</b> #${s.seed}: avg ${average(s).toFixed(1)} cycles, 0 cycles in ${s.scores.filter((x) => x === 0).length}/10 · ${ratings(s)}</p>`;
          })}
        </div>
        ${rules()}
        ${v.isVip && next(v, 'Play the Match Now ▸', 'secondary')}`;
    }
    if (v.phase === 'result') {
      const r = v.results.at(-1);
      const us = v.group;
      const them = 1 - us;
      const over = v.wins.some((w) => w >= 2) || v.results.length >= DRAFT.maxMatches;
      return html`
        ${header(v, `Match ${v.match + 1}`)}
        <div class="st-result ${r.winner === us && 'best'}">
          <h1>${r.winner == null ? 'A Tie: Replay!' : r.winner === us ? 'You Won! 🎉' : 'You Lost'}</h1>
          <span class="st-gained">${r.scores[us]}–${r.scores[them]}</span>
          <p>Cycles · Series ${v.wins[us]}–${v.wins[them]}</p>
        </div>
        <div class="st-card">
          <span class="st-section">${groupBadge(us, 'Your alliance')}</span>
          ${roleList(v.alliances[us], r)}
          <span class="st-section">${groupBadge(them, 'Their alliance')}</span>
          ${roleList(v.alliances[them], r)}
        </div>
        ${v.isVip && next(v, over ? 'The Reveal ▸' : `Plan Match ${v.match + 2} ▸`)}`;
    }
    // final: the reveal
    const us = v.group;
    return html`
      <div class="st-result ${v.champion === us && 'best'}">
        <h1>${v.champion == null ? 'A Drawn Series' : v.champion === us ? 'Your Alliance Won! 🏆' : `Alliance ${v.champion + 1} Won`}</h1>
        <span class="st-gained">${v.wins[0]}–${v.wins[1]}</span>
      </div>
      <div class="st-card">
        <span class="st-section">Each match: your win chance, given both alliances’ assignments (from 20,000 simulated matches)</span>
        ${v.results.map((r, m) => html`<p><b>Match ${m + 1}</b> ${r.scores[us]}–${r.scores[1 - us]}: you had <b>${pct(r.odds.win[us])}</b>, they had ${pct(r.odds.win[1 - us])}</p>`)}
      </div>
      <div class="st-card">
        <span class="st-section">The truth about your alliance</span>
        ${(v.alliances[us] ?? []).map((id) => {
          const t = truth(id);
          const s = scoutOf(v, id);
          const mean = t.cycles.reduce((a, q, n) => a + q * n, 0);
          return html`<p><b>${t.name}</b>: ${mean.toFixed(1)} cycles on average (scouted ${average(s).toFixed(1)}), 0 cycles ${pct(t.cycles[0])} of matches (scouted ${s.scores.filter((x) => x === 0).length}/10), susceptible ${pct(t.susceptibility)} (scouted ${pct(s.susceptibility)}), defense ${pct(t.defense)} (scouted ${pct(s.defense)}). ${t.note}</p>`;
        })}
      </div>
      ${v.isVip && html`<button class="btn btn-xl block" data-action="finish">Finish ▸</button>`}`;
  }

  /** One of our robots: offense or defend one of theirs (with the scouted effect), and its fallback. */
  function robotPlan(v, id, theirs) {
    const s = scoutOf(v, id);
    const a = v.assign?.[id] ?? 'offense';
    const target = a === 'offense' ? null : a.target;
    return html`
      <div class="st-planpick">
        <b>${teamName(id)} <small>#${s.seed}</small></b>
        ${ratings(s)}
        <div class="st-seg wrap">
          <button type="button" class="${!target && 'on'}" data-sd="assign" data-team="${id}" data-target="offense">Offense <small>avg ${average(s).toFixed(1)}</small></button>
          ${theirs.map(
            (t) => html`<button type="button" class="${target === t && 'on'}" data-sd="assign" data-team="${id}" data-target="${t}">Defend ${teamName(t)} <small>${defenseEffect(s, scoutOf(v, t))}</small></button>`,
          )}
        </div>
        ${target &&
        html`
          <span class="st-if">If ${teamName(target)} is defending:</span>
          <div class="st-seg wrap small">
            <button type="button" class="${a.ifDefending === 'stay' && 'on'}" data-sd="assign" data-team="${id}" data-target="${target}" data-if="stay">Stay on it <small>its defense ${defenseEffect(s, scoutOf(v, target))}</small></button>
            ${theirs
              .filter((t) => t !== target)
              .map((t) => html`<button type="button" class="${a.ifDefending === t && 'on'}" data-sd="assign" data-team="${id}" data-target="${target}" data-if="${t}">Switch to ${teamName(t)}</button>`)}
          </div>`}
      </div>`;
  }

  function drawTop() {
    top.innerHTML = html`${topHtml(view)}${error && html`<p class="form-error">${error}</p>`}`;
  }

  return {
    update(v) {
      if (v.step !== view?.step) error = '';
      view = v;
      const withList = (v.phase === 'prep' || v.phase === 'select') && v.group >= 0;
      if (shownPhase === null || main.firstChild !== top) {
        main.replaceChildren(top, list, bottom);
      }
      shownPhase = v.phase;
      drawTop();
      if (withList) {
        picklist ??= mountPicklist(list, {
          send: (to, teamId, index) => send('picklist', { teamId, list: to, index }),
          canInvite: (cur) => cur.phase === 'select' && cur.turn === cur.group && cur.captain,
          invite: (teamId) => send('invite', { teamId }),
        });
        picklist.update(v);
      } else if (picklist) {
        picklist = null;
        list.replaceChildren();
      }
    },
  };
}
