// Big screen for Strategy Training: the lesson picker, then the Test (each question, how the room answered, the
// leaderboard). Learn's Strategy Room is in host-room.js and the Showdown's screens are in host-draft.js.
import { html, raw } from '../../js/ui.js';
import { avatar } from '../../js/avatar.js';
import { LESSONS, SHAPES, lessonById, partById } from './lessons.js';
import { asksConfidence, bestPoints, formatNumber, numberBins, typeOf } from './quiz.js';
import { caseEvidence, preparesLine, preparesText } from './views.js';
import { board, nextButton, podium, status } from './host-parts.js';
import { draftBody, draftHead } from './host-draft.js';
import { roomBody, roomHead } from './host-room.js';

export default function (root) {
  let shown = null;

  return {
    update(v) {
      // Things pop in when a screen first appears, not every time someone answers.
      const fresh = shown !== v.step;
      shown = v.step;
      const lesson = lessonById(v.lessonId);
      const part = partById(lesson, v.partId);
      const isDraft = part.kind === 'draft';
      const isRoom = part.kind === 'room' && v.phase !== 'pick';
      const many = (v.players?.length ?? v.roster?.length ?? 0) > 12;
      root.innerHTML = html`
        <div class="st-host ${fresh && 'fresh'} ${many && 'many'} ${isDraft && v.phase !== 'pick' && 'drafting'} ${isRoom && 'rooming'}">
          ${v.phase !== 'pick' && (isDraft ? draftHead(v, lesson, part) : isRoom ? roomHead(v, lesson, part) : head(v, lesson, part))}
          <div class="st-body">${v.phase === 'pick' ? pick(v) : isDraft ? draftBody(v, lesson, part) : isRoom ? roomBody(v, lesson, part) : body(v, lesson, part)}</div>
        </div>`;
    },
  };
}

function head(v, lesson, part) {
  const q = part.questions[v.q];
  return html`
    <header class="st-head">
      <span class="st-lesson">Lesson ${lesson.number} · ${part.title}: <b>${lesson.title}</b></span>
      ${v.phase !== 'final' && html`<span class="st-step">${q.caseTitle != null ? `Case ${q.caseIndex + 1}: ${q.caseTitle}` : `Question ${v.at} / ${v.of}`}</span>`}
      <span class="spacer"></span>
      ${v.phase === 'question' &&
      html`
        <span class="st-answered"><b>${v.answered}</b> / ${v.players.length} ${asksConfidence(q) ? 'done' : 'answered'}</span>
        <span class="timer timer-lg" data-deadline="${v.deadline}"></span>
        <button class="btn btn-sm secondary" data-action="more">+30s</button>
        ${nextButton(v, 'Reveal ▸', 'btn-sm secondary')}`}
    </header>`;
}

function body(v, lesson, part) {
  const q = part.questions[v.q];
  if (v.phase === 'question') return ask(v, part, q);
  if (v.phase === 'reveal') return reveal(v, part, q);
  if (v.phase === 'scores') return scores(v, part);
  return final(v, lesson, part);
}

// ---------- pick a lesson and a part ----------

function pick(v) {
  return html`
    <div class="st-picker">
      <div class="st-title">
        <h1>Strategy Training</h1>
        <p>Pick what everyone will do. Go in order: Learn, then Test, then the Showdown.</p>
      </div>
      ${LESSONS.map(
        (l) => html`
          <div class="st-lesson-block">
            <span class="st-lesson-num">Lesson ${l.number}: ${l.title}</span>
            <div class="st-lessons">
              ${l.parts.map(
                (p, i) => html`
                  <button class="st-lesson-card ${l.id === v.lessonId && p.id === v.partId && 'selected'}" data-action="lesson" data-payload="${JSON.stringify({ lessonId: l.id, partId: p.id })}">
                    <span class="st-lesson-num">Part ${i + 1}</span>
                    <span class="st-lesson-name">${p.title}</span>
                    <span class="st-lesson-tag">${p.blurb}</span>
                    <span class="st-lesson-meta">${{ draft: () => `${p.draft.teams.length} teams · two alliances`, room: () => `${p.cases.length} cases · a student moderator` }[p.kind]?.() ?? `${p.questions.length} questions`}</span>
                  </button>`,
              )}
            </div>
          </div>`,
      )}
      ${caseChooser(v)}
      <div class="st-pick-foot">
        <div class="player-chips st-roster">
          ${v.players.map(
            (p) => html`<div class="chip ${!p.connected && 'away'}" style="--c:${p.color}">${avatar(p)}<span class="chip-name">${p.name}</span></div>`,
          )}
        </div>
        ${nextButton(v, 'Start ▸')}
      </div>
    </div>`;
}

/** Learn: which cases to run. Each toggle sends the whole new list; an empty or full list means all. */
function caseChooser(v) {
  const part = partById(lessonById(v.lessonId), v.partId);
  if (!part?.cases) return null;
  const all = part.cases.map((_, i) => i);
  const on = v.cases ?? all;
  const toggle = (i) => (on.includes(i) ? on.filter((c) => c !== i) : [...on, i]);
  // Learn's room cases take about ten minutes of discussion each; quiz-style cases about 2.5 per step.
  const steps = part.questions?.filter((q) => on.includes(q.caseIndex)).length;
  return html`
    <div class="st-casepick">
      <div class="st-casepick-head">
        <b>Cases to run</b>
        <span>${on.length} of ${part.cases.length} · ${part.questions ? `${steps} steps · about ${Math.round(steps * 2.5)} min` : `about ${on.length * 10} min`}</span>
        <button class="btn btn-sm ${!v.cases && 'secondary'}" data-action="cases" data-payload="${JSON.stringify({ cases: all })}">All</button>
      </div>
      <div class="st-casegrid">
        ${part.cases.map(
          (c, i) => html`
            <button class="${on.includes(i) && 'on'}" data-action="cases" data-payload="${JSON.stringify({ cases: toggle(i) })}" aria-pressed="${on.includes(i)}">
              <b>${i + 1}</b><span>${c.title}</span><small>${c.prepares ? preparesText(c.prepares) : c.tag}</small>
            </button>`,
        )}
      </div>
    </div>`;
}

// ---------- a question ----------

function caseFile(q) {
  return html`
    <aside class="st-casefile">
      <span class="st-case-label">Case File${preparesLine(q) && ` · ${preparesLine(q)}`}</span>
      <h2>${q.caseTitle}</h2>
      <p>${raw(q.setup)}</p>
      ${caseEvidence(q)}
    </aside>`;
}

function prompt(q, v) {
  const label = q.caseTitle != null ? q.section : `Investigation ${v.q + 1} · ${q.section}`;
  return html`
    <div class="st-q">
      <span class="st-section">${label}</span>
      <h1>${q.title}</h1>
      <p class="st-prompt">${raw(q.prompt)}</p>
    </div>`;
}

function inputs(q) {
  const type = typeOf(q);
  if (type === 'number') {
    return html`
      <div class="st-numask">
        <span>Estimate on your phone</span>
        <b>${formatNumber(q, q.number.min)} to ${formatNumber(q, q.number.max)}</b>
        <small>${[...q.number.tiers].sort((a, b) => a[0] - b[0]).map(([w, p]) => `within ${formatNumber(q, w)}: +${p}`).join(' · ')}</small>
      </div>`;
  }
  return html`
    ${type === 'multi' && html`<p class="st-instruct">Pick <b>every</b> one that matters. Red herrings cost points.</p>`}
    ${asksConfidence(q) && html`<p class="st-instruct">Then rate how sure you are on your phone.</p>`}
    <div class="st-choices ${q.choices.length > 4 && 'five'}">
      ${q.choices.map(
        (c, i) => html`
          <div class="st-choice">
            <span class="st-shape">${SHAPES[i]}</span>
            <span class="st-choice-text">${c.text}</span>
          </div>`,
      )}
    </div>`;
}

function ask(v, part, q) {
  if (q.caseTitle != null) {
    return html`
      <div class="st-caselayout">
        ${caseFile(q)}
        <div class="st-caseq">${prompt(q, v)}${inputs(q)}</div>
      </div>
      ${status(v.players)}`;
  }
  return html`${prompt(q, v)}${inputs(q)}${status(v.players)}`;
}

// ---------- how the room answered ----------

function reveal(v, part, q) {
  const t = v.tally ?? { counts: [], answered: 0, median: null };
  const toScores = part.leaderboard !== 'case' || q.lastInCase || v.last;
  return html`
    <div class="st-reveal">
      <div class="st-reveal-main">
        ${prompt(q, v)}
        ${typeOf(q) === 'number' ? histogram(q, t) : bars(q, t)}
        <p class="st-foot">${t.answered} of ${v.players.length} answered${calibrationLine(t.calibration)}</p>
      </div>
      <aside class="st-model">
        <h2>What the Model Says</h2>
        <p class="st-takeaway">${q.takeaway}</p>
        <p>${raw(q.explain)}</p>
        ${q.discuss && html`<p class="st-discuss"><b>Discuss</b> ${q.discuss}</p>`}
        ${nextButton(v, toScores ? 'Leaderboard ▸' : 'Next Step ▸')}
      </aside>
    </div>`;
}

/** How the room's confidence held up, in one line: " · Confidence: 90% sure → 3 of 4 right · …". */
function calibrationLine(rows) {
  if (!rows?.length) return null;
  return html`<span class="st-calib-line"> · Confidence: ${rows.map(
    (r) => html`<span class="${r.right / r.n < r.level / 100 - 0.2 && 'over'}">${r.level}% sure → <b>${r.right} of ${r.n}</b> right</span>`,
  )}</span>`;
}

function bars(q, t) {
  const top = bestPoints(q);
  const multi = typeOf(q) === 'multi';
  return html`
    <div class="st-bars ${q.choices.length > 4 && 'five'}">
      ${q.choices.map((c, i) => {
        const share = t.answered ? (t.counts[i] ?? 0) / t.answered : 0;
        const good = multi ? c.points > 0 : c.points === top;
        return html`
          <div class="st-bar ${good && 'best'} ${multi && 'multi'} ${multi && c.points < 0 && 'herring'}">
            <span class="st-shape">${SHAPES[i]}</span>
            <span class="st-bar-text">
              <b>${c.text}</b>
              <small>${multi && (c.points > 0 ? 'Matters · ' : 'Red herring · ')}${c.result}</small>
            </span>
            <span class="st-bar-track"><span class="st-bar-fill" style="width:${(100 * share).toFixed(1)}%"></span></span>
            <span class="st-bar-pct">${Math.round(100 * share)}%<small>${t.counts[i] ?? 0} ${t.counts[i] === 1 ? 'player' : 'players'}</small></span>
            <span class="st-points">${c.points < 0 ? `−${-c.points}` : `+${c.points}`}</span>
          </div>`;
      })}
    </div>`;
}

function histogram(q, t) {
  const bins = numberBins(q);
  const most = Math.max(1, ...t.counts);
  const target = bins.findIndex((b, i) => q.number.value >= b.from && (q.number.value < b.to || i === bins.length - 1));
  return html`
    <div class="st-numreveal">
      <div class="st-numfacts">
        <span>Answer <b>${formatNumber(q, q.number.value)}</b></span>
        <span>Room median <b>${t.median == null ? '–' : formatNumber(q, t.median)}</b></span>
        <span>${[...q.number.tiers].sort((a, b) => a[0] - b[0]).map(([w, p]) => `within ${formatNumber(q, w)}: +${p}`).join(' · ')}</span>
      </div>
      <div class="st-hist big">
        ${t.counts.map(
          (n, i) => html`<span class="${i === target && 'target'}" style="height:${Math.max(3, (100 * n) / most)}%"><b>${n || ''}</b></span>`,
        )}
      </div>
      <div class="st-histlabels">${bins.map((b) => html`<span>${formatNumber(q, b.from)}</span>`)}</div>
    </div>`;
}

// ---------- leaderboard ----------

function scores(v, part) {
  const last = v.last;
  const q = part.questions[v.q];
  const sub = q.caseTitle != null ? `After case ${q.caseIndex + 1}: ${q.caseTitle}` : `After question ${v.at} of ${v.of}`;
  return html`
    <div class="st-board-wrap">
      <div class="st-title"><h1>Leaderboard</h1><p>${sub}</p></div>
      ${board(v.players, v.players.length > 10 ? 20 : 10)}
      <div class="st-actions">${nextButton(v, last ? 'Final Results ▸' : q.caseTitle != null ? 'Next Case ▸' : 'Next Question ▸')}</div>
    </div>`;
}

// ---------- the end ----------

function final(v, lesson, part) {
  // Learn reports each case (the average across its steps); Test reports each question.
  const rows = part.cases
    ? part.cases.flatMap((c, ci) => {
        const run = part.questions.map((q, i) => [q, v.history?.[i]]).filter(([q, h]) => q.caseIndex === ci && h);
        const steps = run.filter(([, h]) => h.answered);
        if (!run.length) return []; // a case the room skipped
        return [{ label: `${ci + 1}. ${c.title}`, share: steps.length ? steps.reduce((s, [, h]) => s + h.bestShare, 0) / steps.length : null }];
      })
    : part.questions.map((q, i) => ({ label: `${i + 1}. ${q.title}`, share: v.history?.[i]?.answered ? v.history[i].bestShare : null }));
  return html`
    <div class="st-final">
      <div class="st-final-main">
        <div class="st-title"><h1>${part.title} Complete! 🏆</h1><p>Lesson ${lesson.number}: ${lesson.title} · final standings</p></div>
        ${podium(v.players)}
      </div>
      <aside class="st-report ${rows.length > 8 && 'long'}">
        <h2>How the Room Did</h2>
        ${rows.map(
          (r) => html`
            <div class="st-report-row ${r.share != null && r.share < 0.5 && 'hard'}">
              <span class="st-report-q">${r.label}</span>
              <span class="st-bar-track"><span class="st-bar-fill" style="width:${(100 * (r.share ?? 0)).toFixed(1)}%"></span></span>
              <b>${r.share == null ? '–' : `${Math.round(100 * r.share)}%`}</b>
            </div>`,
        )}
        <p class="st-foot">Share of answers that earned full points. Revisit the red ones.</p>
        <button class="btn btn-xl block" data-action="finish">Finish ▸</button>
      </aside>
    </div>`;
}
