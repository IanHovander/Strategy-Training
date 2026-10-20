// Showdown pieces shared by the big screen and the phones: scouting cards, histograms, alliance badges.
// Everything here reads the event's scouting data from the view, never the teams' true attributes, except
// `truthRow`, which is only used after the reveal.
import { html } from '../../js/ui.js';
import { DRAFT } from './lesson1-draft.js';
import { BUCKETS, bucketCounts } from './alliance.js';
import { GROUPS } from './draft-rules.js';

export { GROUPS };
export const teamName = (id) => DRAFT.teams.find((t) => t.id === id)?.name ?? '?';
export const truth = (id) => DRAFT.teams.find((t) => t.id === id) ?? null;
export const scoutOf = (v, id) => v.event.find((t) => t.id === id) ?? null;
export const average = (s) => s.scores.reduce((a, b) => a + b, 0) / s.scores.length;

/** "Red" / "Blue" as a colored badge; Red runs Alliance 1. */
export const groupBadge = (i, text = `${GROUPS[i]} · Alliance ${i + 1}`) => html`<span class="st-team-badge ${i === 0 ? 'red' : 'blue'}">${text}</span>`;

/** Which alliance a team is on (0, 1) or -1, and whether it's that alliance's captain. */
export function allianceOf(v, id) {
  const i = v.alliances.findIndex((ids) => ids.includes(id));
  return { alliance: i, captain: i >= 0 && v.alliances[i][0] === id };
}

/** The scouting histogram: how many of the ten qualification matches fell in each score range. */
export function histogram(s, { labels = true } = {}) {
  const counts = bucketCounts(s.scores);
  const n = s.scores.length;
  return html`
    <div class="st-qhist ${labels && 'labeled'}" role="img" aria-label="Scores in ${n} qualification matches">
      ${counts.map(
        (c, i) => html`
          <span class="${i === 0 && 'zero'}">
            <i style="height:${(100 * c) / n}%"></i>
            <b>${c || ''}</b>
            ${labels && html`<small>${BUCKETS[i].label}</small>`}
          </span>`,
      )}
    </div>`;
}

/** The ratings line: scouts' 1–10 estimates. */
export const ratings = (s) => html`<span class="st-ratings"><span>Resilience <b>${s.resilience}</b>/10</span><span>Defense <b>${s.defense}</b>/10</span></span>`;

/** A team's scouting card: seed, name, histogram, average, ratings. `extra` goes at the bottom. */
export function scoutCard(v, s, { extra = null, compact = false, plain = false } = {}) {
  const on = allianceOf(v, s.id);
  return html`
    <div class="st-scout ${compact && 'compact'} ${on.alliance >= 0 && !plain && `taken a${on.alliance}`}">
      <div class="st-scout-head">
        <span class="st-seed">#${s.seed}</span>
        <b>${teamName(s.id)}</b>
        ${on.alliance >= 0 && groupBadge(on.alliance, `A${on.alliance + 1}${on.captain ? ' captain' : ''}`)}
      </div>
      ${histogram(s)}
      <div class="st-scout-foot"><span>Avg <b>${average(s).toFixed(1)}</b> · 0s: <b>${s.scores.filter((x) => x === 0).length}</b>/10</span>${ratings(s)}</div>
      ${extra}
    </div>`;
}

/** After the reveal: scouted versus true. */
export function truthRow(v, id) {
  const t = truth(id);
  const s = scoutOf(v, id);
  const on = allianceOf(v, id);
  const pct = (x) => `${Math.round(100 * x)}%`;
  return html`
    <tr class="${on.alliance >= 0 && `a${on.alliance}`}">
      <td><b>${t.name}</b> <small>#${s.seed}</small></td>
      <td>${average(s).toFixed(1)} → <b>${((1 - t.broken) * t.mean).toFixed(1)}</b></td>
      <td>±${t.spread}</td>
      <td>${s.scores.filter((x) => x === 0).length}/10 → <b>${pct(t.broken)}</b></td>
      <td>${s.resilience} → <b>${Math.round(10 * t.resilience)}</b></td>
      <td>${s.defense} → <b>${Math.round(10 * t.defense)}</b></td>
    </tr>`;
}

/** Who did what in a match: "Apex: offense", "Brick: defends Feather". */
export function assignmentList(assign, ids, points = null, broken = []) {
  return html`
    <div class="st-assign-list">
      ${ids.map(
        (id) => html`
          <span>
            <b>${teamName(id)}</b>
            <em>${assign[id] === 'offense' ? 'Offense' : `Defends ${teamName(assign[id])}`}</em>
            ${points && html`<i>${broken.includes(id) ? 'broke' : assign[id] === 'offense' ? `${points[id]} pts` : ''}</i>`}
          </span>`,
      )}
    </div>`;
}
