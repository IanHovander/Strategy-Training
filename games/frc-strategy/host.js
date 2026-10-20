// Big screen for Strategy Training: the lesson picker, each question, how the room answered, and the leaderboard.
import { html, raw } from '../../js/ui.js';
import { avatar } from '../../js/avatar.js';
import { LESSONS, SHAPES, bestPoints, lessonById } from './lessons.js';

export default function (root) {
  let shown = null;

  return {
    update(v) {
      // Things pop in when a screen first appears, not every time someone answers.
      const fresh = shown !== v.step;
      shown = v.step;
      const lesson = lessonById(v.lessonId);
      root.innerHTML = html`
        <div class="st-host ${fresh && 'fresh'} ${v.players.length > 12 && 'many'}">
          ${v.phase !== 'pick' && head(v, lesson)}
          <div class="st-body">${body(v, lesson)}</div>
        </div>`;
    },
  };
}

const nextButton = (v, label) =>
  html`<button class="btn btn-xl" data-action="next" data-payload="${JSON.stringify({ from: v.step })}">${label}</button>`;

function head(v, lesson) {
  const total = lesson.questions.length;
  return html`
    <header class="st-head">
      <span class="st-lesson">Lesson ${lesson.number}: <b>${lesson.title}</b></span>
      ${v.phase !== 'final' && html`<span class="st-step">Question ${v.q + 1} / ${total}</span>`}
      <span class="spacer"></span>
      ${v.phase === 'question' &&
      html`
        <span class="st-answered"><b>${v.answered}</b> / ${v.players.length} answered</span>
        <span class="timer timer-lg" data-deadline="${v.deadline}"></span>
        <button class="btn btn-sm secondary" data-action="more">+30s</button>
        <button class="btn btn-sm secondary" data-action="next" data-payload="${JSON.stringify({ from: v.step })}">Reveal ▸</button>`}
    </header>`;
}

function body(v, lesson) {
  if (v.phase === 'pick') return pick(v);
  const q = lesson.questions[v.q];
  if (v.phase === 'question') return ask(v, q);
  if (v.phase === 'reveal') return reveal(v, q);
  if (v.phase === 'scores') return scores(v, lesson);
  return final(v, lesson);
}

// ---------- pick a lesson ----------

function pick(v) {
  return html`
    <div class="st-picker">
      <div class="st-title">
        <h1>Strategy Training</h1>
        <p>Pick the lesson everyone will work through. Answer on your phone; the board keeps score.</p>
      </div>
      <div class="st-lessons">
        ${LESSONS.map(
          (l) => html`
            <button class="st-lesson-card ${l.id === v.lessonId && 'selected'}" data-action="lesson" data-payload="${JSON.stringify({ lessonId: l.id })}">
              <span class="st-lesson-num">Lesson ${l.number}</span>
              <span class="st-lesson-name">${l.title}</span>
              <span class="st-lesson-tag">${l.tagline}</span>
              <span class="st-lesson-meta">${l.questions.length} questions</span>
            </button>`,
        )}
        <div class="st-lesson-card locked">
          <span class="st-lesson-num">Coming soon</span>
          <span class="st-lesson-name">More Lessons</span>
          <span class="st-lesson-tag">New strategy lessons will show up here.</span>
        </div>
      </div>
      <div class="st-pick-foot">
        <div class="player-chips st-roster">
          ${v.players.map(
            (p) => html`<div class="chip ${!p.connected && 'away'}" style="--c:${p.color}">${avatar(p)}<span class="chip-name">${p.name}</span></div>`,
          )}
        </div>
        ${nextButton(v, 'Start Lesson ▸')}
      </div>
    </div>`;
}

// ---------- a question ----------

function prompt(q, v) {
  return html`
    <div class="st-q">
      <span class="st-section">Investigation ${v.q + 1} · ${q.section}</span>
      <h1>${q.title}</h1>
      <p class="st-prompt">${raw(q.prompt)}</p>
    </div>`;
}

function ask(v, q) {
  return html`
    ${prompt(q, v)}
    <div class="st-choices">
      ${q.choices.map(
        (c, i) => html`
          <div class="st-choice">
            <span class="st-shape">${SHAPES[i]}</span>
            <span class="st-choice-text">${c.text}</span>
          </div>`,
      )}
    </div>
    <div class="st-status">
      ${v.players.map(
        (p) => html`
          <span class="st-who ${p.done && 'done'} ${!p.connected && 'away'}" style="--c:${p.color}" title="${p.name}">
            ${avatar(p, { mood: p.done ? 'happy' : undefined })}
            <span>${p.name}</span>
          </span>`,
      )}
    </div>`;
}

// ---------- how the room answered ----------

function reveal(v, q) {
  const counts = v.counts ?? q.choices.map(() => 0);
  const answered = counts.reduce((a, b) => a + b, 0);
  const top = bestPoints(q);
  return html`
    <div class="st-reveal">
      <div class="st-reveal-main">
        ${prompt(q, v)}
        <div class="st-bars">
          ${q.choices.map((c, i) => {
            const share = answered ? counts[i] / answered : 0;
            return html`
              <div class="st-bar ${c.points === top && 'best'}">
                <span class="st-shape">${SHAPES[i]}</span>
                <span class="st-bar-text">
                  <b>${c.text}</b>
                  <small>${c.result}</small>
                </span>
                <span class="st-bar-track"><span class="st-bar-fill" style="width:${(100 * share).toFixed(1)}%"></span></span>
                <span class="st-bar-pct">${Math.round(100 * share)}%<small>${counts[i]} ${counts[i] === 1 ? 'player' : 'players'}</small></span>
                <span class="st-points">+${c.points}</span>
              </div>`;
          })}
        </div>
        <p class="st-foot">${answered} of ${v.players.length} answered</p>
      </div>
      <aside class="st-model">
        <h2>What the Model Says</h2>
        <p class="st-takeaway">${q.takeaway}</p>
        <p>${q.explain}</p>
        ${nextButton(v, 'Leaderboard ▸')}
      </aside>
    </div>`;
}

// ---------- leaderboard ----------

function scores(v, lesson) {
  const last = v.q + 1 >= lesson.questions.length;
  return html`
    <div class="st-board-wrap">
      <div class="st-title"><h1>Leaderboard</h1><p>After question ${v.q + 1} of ${lesson.questions.length}</p></div>
      ${board(v.players, v.players.length > 10 ? 20 : 10)}
      <div class="st-actions">${nextButton(v, last ? 'Final Results ▸' : 'Next Question ▸')}</div>
    </div>`;
}

function board(players, size, changes = true) {
  const list = [...players].sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  const more = list.length - size;
  return html`
    <div class="st-board ${list.length > 10 && 'two'}">
      ${list.slice(0, size).map((p) => {
        const moved = p.before == null ? 0 : p.before - p.rank;
        return html`
          <div class="st-row" style="--c:${p.color}">
            <span class="st-rank">${p.rank}</span>
            ${avatar(p, { mood: p.rank === 1 ? 'happy' : undefined })}
            <span class="st-name">${p.name}</span>
            ${changes && moved > 0 && html`<span class="st-move">▲${moved}</span>`}
            ${changes && p.gained != null && html`<span class="st-gain ${!p.gained && 'zero'}">+${p.gained}</span>`}
            <b class="st-score">${p.score}</b>
          </div>`;
      })}
    </div>
    ${more > 0 && html`<p class="st-foot">…and ${more} more. Everyone sees their own rank on their phone.</p>`}`;
}

// ---------- the end ----------

function final(v, lesson) {
  const list = [...v.players].sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  const podium = list.slice(0, 3);
  return html`
    <div class="st-final">
      <div class="st-final-main">
        <div class="st-title"><h1>Lesson Complete! 🏆</h1><p>${lesson.title}: final standings</p></div>
        <div class="st-podium">
          ${[podium[1], podium[0], podium[2]].map(
            (p, i) =>
              p &&
              html`
                <div class="st-pod st-pod-${[2, 1, 3][i]}" style="--c:${p.color}">
                  ${avatar(p, { mood: 'happy' })}
                  <span class="st-name">${p.name}</span>
                  <b class="st-score">${p.score}</b>
                  <span class="st-place">${p.rank}</span>
                </div>`,
          )}
        </div>
        ${list.length > 3 && board(list.slice(3), 8, false)}
      </div>
      <aside class="st-report">
        <h2>How the Room Did</h2>
        ${lesson.questions.map((q, i) => {
          const h = v.history?.[i];
          const share = h?.answered ? h.bestShare : 0;
          return html`
            <div class="st-report-row ${share < 0.5 && 'hard'}">
              <span class="st-report-q">${i + 1}. ${q.title}</span>
              <span class="st-bar-track"><span class="st-bar-fill" style="width:${(100 * share).toFixed(1)}%"></span></span>
              <b>${h?.answered ? `${Math.round(100 * share)}%` : '–'}</b>
            </div>`;
        })}
        <p class="st-foot">Share of the room that picked the best answer. Revisit the red ones.</p>
        <button class="btn btn-xl block" data-action="finish">Finish ▸</button>
      </aside>
    </div>`;
}
