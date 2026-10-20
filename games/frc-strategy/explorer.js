// The "Explore the Model" panel: a question's sliders and toggles, the exact win chances they give, and match
// simulations. Shared by the phones (player.js) and the solo lessons page (lessons.html), so both always show
// the same model from lessons.js.
import { html } from '../../js/ui.js';
import { pct } from './prob.js';

/** Draw the explorer for `explore` (a question's `explore` from lessons.js) into `container`. */
export function mountExplorer(container, explore) {
  const values = Object.fromEntries((explore.controls ?? []).map((c) => [c.id, c.value]));
  let sims = [];

  const panel = document.createElement('div');
  panel.className = 'st-ex';
  container.replaceChildren(panel);

  panel.addEventListener('input', (e) => {
    const input = e.target.closest('input[data-control]');
    if (!input) return;
    values[input.dataset.control] = Number(input.value);
    sims = [];
    drawOutput(); // only the numbers, so the slider keeps being dragged
  });
  panel.addEventListener('click', (e) => {
    const option = e.target.closest('[data-option]');
    if (option) {
      values[option.dataset.control] = Number(option.dataset.option);
      sims = [];
      draw();
      return;
    }
    const run = e.target.closest('[data-run]');
    if (run) simulate(Number(run.dataset.run));
  });

  function draw() {
    panel.innerHTML = html`
      <h2>Explore the Model</h2>
      <p class="st-hint">Change the assumptions, then run matches.</p>
      ${(explore.controls ?? []).map((c) =>
        c.options
          ? html`
            <div class="st-ctl">
              <span>${c.label}</span>
              <div class="st-seg">
                ${c.options.map(
                  (o, i) => html`<button type="button" class="${values[c.id] === i && 'on'}" data-control="${c.id}" data-option="${i}">${o}</button>`,
                )}
              </div>
            </div>`
          : html`
            <label class="st-ctl">
              <span>${c.label} <b data-out="${c.id}">${values[c.id]}${c.unit ?? ''}</b></span>
              <input class="st-range" type="range" min="${c.min}" max="${c.max}" step="${c.step ?? 1}" value="${values[c.id]}" data-control="${c.id}">
            </label>`,
      )}
      <div class="st-ex-out"></div>`;
    drawOutput();
  }

  function drawOutput() {
    for (const c of explore.controls ?? []) {
      const out = panel.querySelector(`[data-out="${c.id}"]`);
      if (out) out.textContent = `${values[c.id]}${c.unit ?? ''}`;
    }
    const m = explore.model(values);
    panel.querySelector('.st-ex-out').innerHTML = html`
      ${m.stats && html`<div class="st-stats">${m.stats.map((s) => html`<div class="st-stat ${s.hi && 'hi'}"><small>${s.label}</small><b>${s.value}</b></div>`)}</div>`}
      ${(m.strategies ?? []).map((s, i) => {
        const run = sims[i];
        const lose = Math.max(0, 1 - s.win - s.tie);
        return html`
          <div class="st-strat">
            <div class="st-strat-head"><b>${s.label}</b><span>wins ${pct(s.win)}${s.tie > 0 && html` · ties ${pct(s.tie)}`}</span></div>
            <div class="st-wtl">
              <span class="st-w" style="width:${100 * s.win}%"></span><span class="st-t" style="width:${100 * s.tie}%"></span><span class="st-l" style="width:${100 * lose}%"></span>
            </div>
            ${run?.n > 0 &&
            html`<div class="st-sim">Simulated ${run.n.toLocaleString()} matches: won ${pct(run.w / run.n)}, tied ${pct(run.t / run.n)} · last ${run.last.join(' – ')}</div>`}
          </div>`;
      })}
      ${m.strategies?.length > 0 &&
      html`
        <div class="st-runs">
          <button type="button" class="btn btn-sm" data-run="1">Run 1</button>
          <button type="button" class="btn btn-sm" data-run="10">Run 10</button>
          <button type="button" class="btn btn-sm" data-run="1000">Run 1,000</button>
          <button type="button" class="btn btn-sm secondary" data-run="0">Clear</button>
        </div>
        <p class="st-legend"><span class="st-w"></span>A wins <span class="st-t"></span>tie <span class="st-l"></span>B wins</p>`}
      ${m.note && html`<p class="st-hint">${m.note}</p>`}`;
  }

  function simulate(n) {
    const m = explore.model(values);
    if (!n) sims = [];
    (m.strategies ?? []).forEach((s, i) => {
      const run = (sims[i] ??= { n: 0, w: 0, t: 0, last: [] });
      for (let k = 0; k < n; k++) {
        const [a, b] = s.play();
        run.n++;
        if (a > b) run.w++;
        else if (a === b) run.t++;
        run.last = [a, b];
      }
    });
    drawOutput();
  }

  draw();
}
