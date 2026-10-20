// Alliance Selection pieces shared by the big screen and the phones: robot cards, plan icons, team badges.
import { html } from '../../js/ui.js';
import { DRAFT } from './lesson1-draft.js';
import { PLANS, planById } from './alliance.js';

export const TEAM_NAMES = ['Red', 'Blue'];
export const robotById = (id) => DRAFT.robots.find((r) => r.id === id) ?? null;

/** "Red" / "Blue" as a colored badge. */
export const teamBadge = (i, text = TEAM_NAMES[i]) => html`<span class="st-team-badge ${i === 0 ? 'red' : 'blue'}">${text}</span>`;

/** Where a robot went in the draft, if anywhere: { team, pick } or null. */
export function pickOf(picks, robotId) {
  const k = picks.findIndex((p) => p.robotId === robotId);
  return k < 0 ? null : { team: picks[k].team, pick: k + 1 };
}

/**
 * A robot's scouting card. `extra` goes at the bottom (buttons). `picked` = { team, pick } greys it out with
 * the team that took it.
 */
export function robotCard(robot, { picked = null, extra = null, compact = false, starred = false, stars = 0 } = {}) {
  return html`
    <div class="st-robot ${picked && `taken ${picked.team === 0 ? 'red' : 'blue'}`} ${compact && 'compact'} ${starred && 'starred'}">
      <div class="st-robot-head">
        <b>${robot.name}</b>
        ${stars > 0 && html`<span class="st-robot-stars" title="Stars from your team">★ ${stars}</span>`}
        ${picked && teamBadge(picked.team, `${TEAM_NAMES[picked.team]} · pick ${picked.pick}`)}
      </div>
      <span class="st-robot-role">${robot.role} · ${robot.scout.matches} matches scouted</span>
      <dl class="st-robot-stats">
        ${robot.scout.lines.map(([label, value]) => html`<dt>${label}</dt><dd>${value}</dd>`)}
      </dl>
      ${robot.scout.note && html`<p class="st-robot-note">${robot.scout.note}</p>`}
      ${extra}
    </div>`;
}

/** Plan icon with its name. */
export const planChip = (id) => html`<span class="st-planchip"><span class="st-planicon">${planById(id)?.icon ?? '?'}</span>${planById(id)?.name ?? '—'}</span>`;

/** An alliance's lineup after a match: robot name and plan. */
export function lineupList(lineup) {
  return html`<div class="st-lineup-list">${lineup.map(({ robotId, plan }) => html`<span><b>${robotById(robotId)?.name}</b> ${planChip(plan)}</span>`)}</div>`;
}

export { PLANS };
