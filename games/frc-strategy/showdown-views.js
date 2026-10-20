// Showdown pieces shared by the big screen and the phones.
import { html } from '../../js/ui.js';
import { binomial, mean } from './prob.js';
import { PLANS, planById } from './showdown.js';

const pctOf = (p) => `${Math.round(100 * p)}%`;
const avg = (n, p, value) => (mean(binomial(n, p)) * value).toFixed(1);

/** The round's numbers, one line per plan, with each plan's average when nothing gets in its way. */
export function planCard(round, { compact = false } = {}) {
  const { cycle, power, climb, defense, crowd, bonus } = round;
  const climbAvg = (Number(avg(climb.cycles, cycle.p, cycle.value)) + climb.p * climb.value).toFixed(1);
  const rows = {
    cycle: `${cycle.n} tries × ${cycle.value} pts at ${pctOf(cycle.p)}`,
    power: `${power.n} tries × ${power.value} pts at ${pctOf(power.p)}`,
    defend: `Guards their top scorer: −${pctOf(defense.power)} on Power Shots, −${pctOf(defense.cycle)} on Cycles`,
    climb: `${climb.cycles} cycles, then ${climb.value} pts at ${pctOf(climb.p)} · room for ${climb.capacity}`,
  };
  const avgs = { cycle: avg(cycle.n, cycle.p, cycle.value), power: avg(power.n, power.p, power.value), defend: '0', climb: climbAvg };
  return html`
    <div class="st-plancard ${compact && 'compact'}">
      ${PLANS.map(
        (p) => html`
          <div class="st-planrow">
            <span class="st-planicon">${p.icon}</span>
            <b>${p.name}</b>
            <span>${rows[p.id]}</span>
            <span class="st-planavg">avg ${avgs[p.id]}</span>
          </div>`,
      )}
      <p class="st-planrules">
        ${crowd > 0 ? `Crowding: −${pctOf(crowd)} per extra teammate on the same plan.` : 'No crowding.'}
        ${bonus && ` Bonus: +${bonus.points} each for reaching ${bonus.at}.`}
      </p>
    </div>`;
}

/** A row of plan icons with names, e.g. for an alliance's lineup. */
export function lineup(plans) {
  return html`<span class="st-lineup">${plans.map((id) => html`<span title="${planById(id)?.name}">${planById(id)?.icon ?? '?'}</span>`)}</span>`;
}

export const planName = (id) => planById(id)?.name ?? '—';
