// Showdown pieces shared by the big screen and the phones: scouting cards, cycle histograms, alliance badges,
// and how a match's defense played out. Everything here reads the event's scouting data from the view, never
// the teams' true attributes, except `truthRow` and `trueBars`, which are only used after the reveal.
import { html } from '../../js/ui.js';
import { DRAFT, MAX_CYCLES } from './lesson1-draft.js';
import { cycleCounts, keepShare } from './alliance.js';
import { GROUPS } from './draft-rules.js';

export { GROUPS };
export const teamName = (id) => DRAFT.teams.find((t) => t.id === id)?.name ?? '?';
export const truth = (id) => DRAFT.teams.find((t) => t.id === id) ?? null;
export const scoutOf = (v, id) => v.event.find((t) => t.id === id) ?? null;
export const average = (s) => s.scores.reduce((a, b) => a + b, 0) / s.scores.length;
export const pct = (x) => `${Math.round(100 * x)}%`;

/** "Red" / "Blue" as a colored badge; Red runs Alliance 1. */
export const groupBadge = (i, text = `${GROUPS[i]} · Alliance ${i + 1}`) => html`<span class="st-team-badge ${i === 0 ? 'red' : 'blue'}">${text}</span>`;

/** Which alliance a team is on (0, 1) or -1, and whether it's that alliance's captain. */
export function allianceOf(v, id) {
  const i = v.alliances.findIndex((ids) => ids.includes(id));
  return { alliance: i, captain: i >= 0 && v.alliances[i][0] === id };
}

/**
 * Bars for cycle counts 0..12: `shares` are fractions (scouted: matches/10; true: probabilities).
 * Each bar is labeled with its percentage when it isn't 0.
 */
export function cycleBars(shares, { labels = true, truthful = false } = {}) {
  const top = Math.max(0.1, ...shares);
  return html`
    <div class="st-qhist ${labels && 'labeled'} ${truthful && 'truth'}" role="img" aria-label="Share of matches with each number of cycles">
      ${shares.map(
        (x, n) => html`
          <span class="${n === 0 && 'zero'}">
            <i style="height:${(100 * x) / top}%"><b>${x >= 0.005 ? Math.round(100 * x) : ''}</b></i>
            ${labels && html`<small>${n}</small>`}
          </span>`,
      )}
    </div>`;
}

/** The scouted histogram: the share of the ten qualification matches with each cycle count. */
export const histogram = (s, opts) => cycleBars(cycleCounts(s.scores, MAX_CYCLES).map((c) => c / s.scores.length), opts);

/** The scouts' defense estimates. */
export const ratings = (s) =>
  html`<span class="st-ratings"><span title="How much defense slows it down (scouted, ±20%)">Susceptible <b>${pct(s.susceptibility)}</b></span><span title="How good it is at defending (scouted, ±20%)">Defense <b>${pct(s.defense)}</b></span></span>`;

/** A team's scouting card: seed, name, cycle histogram, average, defense estimates. `extra` goes at the bottom. */
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
      <div class="st-scout-foot"><span>Avg <b>${average(s).toFixed(1)}</b> cycles</span>${ratings(s)}</div>
      ${extra}
    </div>`;
}

/** The scouted cost of one defender on one robot: "−30% of its cycles". */
export function defenseEffect(defender, target) {
  return `−${pct(1 - keepShare(defender.defense, target.susceptibility))}`;
}

/** After the reveal: scouted versus true. */
export function truthRow(v, id) {
  const t = truth(id);
  const s = scoutOf(v, id);
  const on = allianceOf(v, id);
  const trueMean = t.cycles.reduce((a, p, n) => a + p * n, 0);
  return html`
    <tr class="${on.alliance >= 0 && `a${on.alliance}`}">
      <td><b>${t.name}</b> <small>#${s.seed}</small></td>
      <td>${average(s).toFixed(1)} → <b>${trueMean.toFixed(1)}</b></td>
      <td>${cycleBars(t.cycles, { labels: false, truthful: true })}</td>
      <td>${s.scores.filter((x) => x === 0).length}/10 → <b>${pct(t.cycles[0])}</b></td>
      <td>${pct(s.susceptibility)} → <b>${pct(t.susceptibility)}</b></td>
      <td>${pct(s.defense)} → <b>${pct(t.defense)}</b></td>
    </tr>`;
}

/** What a robot did in a match, from the resolved roles: "Offense · 6 cycles", "Defended Feather". */
export function roleLine(role, cycles) {
  if (role.role === 'offense') {
    const slowed = role.defenders.length ? ` (defended by ${role.defenders.map(teamName).join(', ')})` : '';
    return `${cycles ?? 0} cycles${slowed}`;
  }
  const how = role.shadowing ? `Shadowed ${teamName(role.target)}, who was defending` : `Defended ${teamName(role.target)}`;
  return `${how}${role.switched ? ' (switched)' : ''}`;
}

/** Each robot of an alliance and what it did. */
export function roleList(ids, roles, cycles) {
  return html`
    <div class="st-assign-list">
      ${ids.map((id) => html`<span><b>${teamName(id)}</b><em>${roleLine(roles[id], cycles[id])}</em></span>`)}
    </div>`;
}

/** A plan in words, before a match: "Offense", "Defend Feather (if defending: stay)". */
export function planLine(a) {
  if (a === 'offense' || !a) return 'Offense';
  return `Defend ${teamName(a.target)}; if it defends: ${a.ifDefending === 'stay' ? 'stay on it' : `switch to ${teamName(a.ifDefending)}`}`;
}
