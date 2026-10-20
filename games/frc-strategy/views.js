// Pieces of the question screens shared by the phones (player.js) and the solo page (lessons.html), so a question
// looks and reads the same in both. They return html; the caller wires the events:
//   [data-choice="i"]   choice: answer i; multi: toggle i
//   [data-submit]       multi / number: send the current selection
//   [data-number]       the number slider; [data-nudge="±step"] nudges it; [data-number-out] shows its value
//   [data-hint]         shows the hint
import { html, raw } from '../../js/ui.js';
import { SHAPES } from './lessons.js';
import { bestPoints, describeAnswer, formatNumber, numberBins, scoreAnswer, typeOf } from './quiz.js';

/** The case so far: its setup, then every fact revealed up to this step (new ones highlighted). */
export function caseFile(q) {
  if (q.caseTitle == null) return null;
  return html`
    <div class="st-case">
      <span class="st-case-label">Case file: ${q.caseTitle}</span>
      <p>${raw(q.setup)}</p>
      ${q.facts.length > 0 &&
      html`<ul>${q.facts.map((f) => html`<li class="${f.isNew && 'new'}">${f.isNew && html`<b class="st-new">New</b> `}${raw(f.text)}</li>`)}</ul>`}
    </div>`;
}

const INSTRUCTIONS = {
  choice: 'Pick one.',
  multi: 'Pick every one that matters. Red herrings cost points.',
  number: 'Slide to your estimate, then submit.',
};

/** The question itself: where it sits, its title and prompt. */
export function promptCard(q, label) {
  return html`
    <div class="st-card">
      <span class="st-section">${label}</span>
      <h2>${q.title}</h2>
      <p class="st-prompt">${raw(q.prompt)}</p>
      <span class="st-how">${INSTRUCTIONS[typeOf(q)]}</span>
    </div>`;
}

/**
 * The answer controls before the reveal. `current` is the answer being edited (number: the slider value,
 * multi: the picked list), `sent` the one already submitted (null if none).
 */
export function answerInputs(q, current, sent, { hintOpen = false } = {}) {
  const type = typeOf(q);
  const hint = q.hint
    ? hintOpen
      ? html`<p class="st-hint-text"><b>Hint:</b> ${raw(q.hint)}</p>`
      : html`<button type="button" class="st-hint-btn" data-hint>Need a hint?</button>`
    : null;
  if (type === 'number') {
    const { min, max, step = 1 } = q.number;
    const value = current ?? sent ?? (min + max) / 2;
    return html`
      <div class="st-number">
        <b class="st-number-out" data-number-out>${formatNumber(q, value)}</b>
        <div class="st-number-row">
          <button type="button" class="st-nudge" data-nudge="${-step}" aria-label="Lower">−</button>
          <input class="st-range" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-number aria-label="${q.title}">
          <button type="button" class="st-nudge" data-nudge="${step}" aria-label="Higher">+</button>
        </div>
        <div class="st-scale"><span>${formatNumber(q, min)}</span><span>${formatNumber(q, max)}</span></div>
      </div>
      ${hint}
      <button type="button" class="btn btn-xl block" data-submit>${sent == null ? 'Submit' : 'Update'}</button>
      ${sent != null && html`<p class="st-hint">Submitted ${formatNumber(q, sent)}. You can change it until the reveal.</p>`}`;
  }
  const picked = type === 'multi' ? current ?? sent ?? [] : [current ?? sent];
  return html`
    <div class="st-answers">
      ${q.choices.map(
        (c, i) => html`
          <button type="button" class="st-answer ${type === 'multi' && 'multi'} ${picked.includes(i) && 'picked'}" data-choice="${i}" aria-pressed="${picked.includes(i)}">
            <span class="st-shape">${type === 'multi' ? (picked.includes(i) ? '✓' : SHAPES[i]) : SHAPES[i]}</span>
            <span>${c.text}</span>
          </button>`,
      )}
    </div>
    ${hint}
    ${type === 'multi' &&
    html`
      <button type="button" class="btn btn-xl block" data-submit>${sent == null ? `Submit ${picked.length || 'None'}` : 'Update'}</button>
      ${sent != null && html`<p class="st-hint">Submitted: ${describeAnswer(q, sent)}. You can change it until the reveal.</p>`}`}
    ${type === 'choice' && html`<p class="st-hint">${sent == null ? 'Tap your answer.' : 'Locked in. You can change it until the reveal.'}</p>`}`;
}

/** The headline after the reveal: how your answer scored. */
export function resultBanner(q, answer, extra = null) {
  const gained = scoreAnswer(q, answer);
  const top = bestPoints(q);
  const headline = answer == null ? 'No Answer This Time' : gained === top ? 'Best Answer! 🎉' : gained > 0 ? 'Partly Right' : 'Not This Time';
  return html`
    <div class="st-result ${gained === top && 'best'}">
      <h1>${headline}</h1>
      <span class="st-gained">+${gained}</span>
      <p>Your answer: <b>${describeAnswer(q, answer)}</b>${typeOf(q) === 'number' && html` · Answer: <b>${formatNumber(q, q.number.value)}</b>`}</p>
      ${extra}
    </div>`;
}

/**
 * Every answer with its points and what the model says, plus how the room answered when `room`
 * (a tally from quiz.js) is given. Solo play passes no room.
 */
export function answerReview(q, answer, room = null) {
  const type = typeOf(q);
  if (type === 'number') {
    const { tiers } = q.number;
    const bins = numberBins(q);
    const most = room ? Math.max(1, ...room.counts) : 1;
    const target = bins.findIndex((b, i) => q.number.value >= b.from && (q.number.value < b.to || i === bins.length - 1));
    return html`
      <div class="st-card">
        <span class="st-section">${q.title} · the answer</span>
        <p class="st-big-answer">${formatNumber(q, q.number.value)}</p>
        <p class="st-tiers">${[...tiers].sort((a, b) => a[0] - b[0]).map(([within, points]) => html`<span>within ${formatNumber(q, within)}: <b>+${points}</b></span>`)}</p>
        ${room &&
        html`
          <div class="st-hist" role="img" aria-label="How the room answered">
            ${room.counts.map(
              (n, i) => html`<span class="${i === target && 'target'}" style="height:${Math.max(4, (100 * n) / most)}%" title="${n}"><b>${n || ''}</b></span>`,
            )}
          </div>
          <div class="st-scale"><span>${formatNumber(q, q.number.min)}</span><span>Room median: ${room.median == null ? '–' : formatNumber(q, room.median)}</span><span>${formatNumber(q, q.number.max)}</span></div>`}
      </div>`;
  }
  const answered = room?.answered ?? 0;
  const top = bestPoints(q);
  const mine = type === 'multi' ? answer ?? [] : [answer];
  return html`
    <div class="st-card">
      <span class="st-section">${q.title} · ${room ? 'how the room answered' : 'every answer'}</span>
      ${q.choices.map((c, i) => {
        const share = answered ? room.counts[i] / answered : 0;
        const good = type === 'multi' ? c.points > 0 : c.points === top;
        return html`
          <div class="st-mini ${good && 'best'} ${c.points < 0 && 'herring'} ${mine.includes(i) && 'mine'}">
            <span class="st-mini-text"><span class="st-shape">${SHAPES[i]}</span>${c.text}</span>
            <span class="st-mini-pts">${c.points < 0 ? `−${-c.points}` : `+${c.points}`}</span>
            ${room && html`<span class="st-bar-track"><span class="st-bar-fill" style="width:${(100 * share).toFixed(1)}%"></span></span>`}
            ${room && html`<span class="st-mini-pct">${Math.round(100 * share)}%</span>`}
            <small>${type === 'multi' && (c.points > 0 ? 'Matters · ' : 'Red herring · ')}${c.result}${mine.includes(i) ? ' · your pick' : ''}</small>
          </div>`;
      })}
    </div>`;
}

/** The lesson: takeaway, explanation and the discussion prompt. */
export function modelCard(q) {
  return html`
    <div class="st-model">
      <h2>What the Model Says</h2>
      <p class="st-takeaway">${q.takeaway}</p>
      <p>${raw(q.explain)}</p>
      ${q.discuss && html`<p class="st-discuss"><b>Discuss</b> ${q.discuss}</p>`}
    </div>`;
}

/**
 * Wire a number slider in `root`: dragging and nudging update the shown value and call onChange(value).
 * Returns nothing; safe to call again after a redraw.
 */
export function wireNumber(root, q, onChange) {
  const input = root.querySelector('[data-number]');
  if (!input || input.dataset.wired) return;
  input.dataset.wired = '1';
  const out = root.querySelector('[data-number-out]');
  const set = (v) => {
    const { min, max, step = 1 } = q.number;
    const value = Math.min(max, Math.max(min, Math.round(v / step) * step));
    input.value = value;
    if (out) out.textContent = formatNumber(q, value);
    onChange(value);
  };
  input.addEventListener('input', () => set(Number(input.value)));
  for (const b of root.querySelectorAll('[data-nudge]')) b.addEventListener('click', () => set(Number(input.value) + Number(b.dataset.nudge)));
}
