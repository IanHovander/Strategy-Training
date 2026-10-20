// Phone for Strategy Training: the question and its answers, then your result, how the room answered,
// and an "explore" panel to play with the model (the same idea as the solo lessons page).
import { html, raw } from '../../js/ui.js';
import { LESSONS, SHAPES, bestPoints, lessonById } from './lessons.js';
import { mountExplorer } from './explorer.js';

export default function (root, api) {
  let view = null;
  let picked = null; // the answer just tapped, shown before the game confirms it
  let error = '';
  let exploreKey = null; // the explorer lives outside the redraws, so sliders and simulations survive view updates

  root.innerHTML = '<div class="st-phone"><div class="st-main"></div><div class="st-explore"></div></div>';
  const main = root.querySelector('.st-main');
  const explore = root.querySelector('.st-explore');

  main.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-choice]');
    if (!btn || view?.phase !== 'question') return;
    picked = Number(btn.dataset.choice);
    error = '';
    api.vibrate(15);
    draw();
    const res = await api.send('answer', { choice: picked });
    if (res?.error) {
      error = res.error;
      picked = null;
      draw();
    }
  });

  function draw() {
    const v = view;
    const lesson = lessonById(v.lessonId);
    main.innerHTML = html`${phase(v, lesson)}`;
    const q = lesson.questions[v.q];
    const showExplore = (v.phase === 'reveal' || v.phase === 'scores') && q?.explore;
    const key = showExplore ? `${v.lessonId}:${v.q}` : null;
    if (key !== exploreKey) {
      exploreKey = key;
      if (key) mountExplorer(explore, q.explore);
      else explore.replaceChildren();
    }
  }

  function phase(v, lesson) {
    if (v.phase === 'pick') return pick(v, lesson);
    const q = lesson.questions[v.q];
    if (v.phase === 'question') return question(v, lesson, q);
    if (v.phase === 'reveal' || v.phase === 'scores') return result(v, lesson, q);
    return final(v, lesson);
  }

  const next = (v, label, extra = '') =>
    html`<button class="btn btn-xl block ${extra}" data-action="next" data-payload="${JSON.stringify({ from: v.step })}">${label}</button>`;

  function pick(v, lesson) {
    if (!v.isVip) {
      return html`
        <div class="st-wait">
          <h1>Strategy Training</h1>
          <p>The leader is picking the lesson. Watch the big screen!</p>
          <div class="st-card"><span class="st-section">Lesson ${lesson.number}</span><b class="st-card-title">${lesson.title}</b><span>${lesson.tagline}</span></div>
        </div>`;
    }
    return html`
      <div class="st-wait">
        <h1>You're the Leader</h1>
        <p>Pick the lesson everyone will work through, then start.</p>
        <div class="st-picks">
          ${LESSONS.map(
            (l) => html`
              <button class="st-pick ${l.id === v.lessonId && 'selected'}" data-action="lesson" data-payload="${JSON.stringify({ lessonId: l.id })}">
                <span class="st-section">Lesson ${l.number}</span>${l.title}
              </button>`,
          )}
        </div>
        ${next(v, 'Start Lesson ▸')}
      </div>`;
  }

  function header(v, lesson) {
    return html`
      <div class="st-top">
        <span>Question ${v.q + 1} / ${lesson.questions.length}</span>
        <span class="st-top-score">${v.score} pts</span>
        ${v.deadline && html`<span class="timer" data-deadline="${v.deadline}"></span>`}
      </div>`;
  }

  function question(v, lesson, q) {
    const mine = picked ?? v.choice;
    return html`
      ${header(v, lesson)}
      <div class="st-card">
        <span class="st-section">Investigation ${v.q + 1} · ${q.section}</span>
        <h2>${q.title}</h2>
        <p class="st-prompt">${raw(q.prompt)}</p>
      </div>
      <div class="st-answers">
        ${q.choices.map(
          (c, i) => html`
            <button class="st-answer ${mine === i && 'picked'}" data-choice="${i}">
              <span class="st-shape">${SHAPES[i]}</span>
              <span>${c.text}</span>
            </button>`,
        )}
      </div>
      ${error && html`<p class="form-error">${error}</p>`}
      <p class="st-hint">${mine == null ? 'Tap your answer.' : 'Locked in. You can change it until the reveal.'}</p>
      ${v.isVip && next(v, 'Reveal Now ▸', 'secondary')}`;
  }

  function result(v, lesson, q) {
    const top = bestPoints(q);
    const counts = v.counts ?? q.choices.map(() => 0);
    const answered = counts.reduce((a, b) => a + b, 0);
    const headline =
      v.gained == null ? 'No Answer This Time' : v.gained === top ? 'Best Answer! 🎉' : v.gained > 0 ? 'Partly Right' : 'Not This Time';
    const last = v.q + 1 >= lesson.questions.length;
    return html`
      ${header(v, lesson)}
      <div class="st-result ${v.gained === top && 'best'}">
        <h1>${headline}</h1>
        <span class="st-gained">+${v.gained ?? 0}</span>
        <p>Score <b>${v.score}</b> · Rank <b>#${v.rank}</b> of ${v.of}</p>
      </div>
      ${v.isVip && next(v, v.phase === 'reveal' ? 'Leaderboard ▸' : last ? 'Final Results ▸' : 'Next Question ▸')}
      <div class="st-card">
        <span class="st-section">${q.title} · how the room answered</span>
        ${q.choices.map((c, i) => {
          const share = answered ? counts[i] / answered : 0;
          return html`
            <div class="st-mini ${c.points === top && 'best'} ${v.choice === i && 'mine'}">
              <span class="st-mini-text"><span class="st-shape">${SHAPES[i]}</span>${c.text}</span>
              <span class="st-mini-pts">+${c.points}</span>
              <span class="st-bar-track"><span class="st-bar-fill" style="width:${(100 * share).toFixed(1)}%"></span></span>
              <span class="st-mini-pct">${Math.round(100 * share)}%</span>
              <small>${c.result}${v.choice === i ? ' · your answer' : ''}</small>
            </div>`;
        })}
      </div>
      <div class="st-model">
        <h2>What the Model Says</h2>
        <p class="st-takeaway">${q.takeaway}</p>
        <p>${q.explain}</p>
      </div>`;
  }

  function final(v, lesson) {
    return html`
      <div class="st-result best">
        <h1>${v.rank === 1 ? 'You Won! 🏆' : 'Lesson Complete!'}</h1>
        <span class="st-gained">#${v.rank}</span>
        <p>of ${v.of} · <b>${v.score}</b> points</p>
        <p>Best answers: <b>${v.best}</b> of ${v.asked}</p>
      </div>
      <div class="st-card">
        <span class="st-section">Lesson ${lesson.number}</span>
        <b class="st-card-title">${lesson.title}</b>
        <span>${lesson.summary}</span>
        <a class="btn block st-solo" href="lessons.html" target="_blank" rel="noopener">Practice Solo ▸</a>
      </div>
      ${v.isVip && html`<button class="btn btn-xl block" data-action="finish">Finish ▸</button>`}`;
  }

  return {
    update(next) {
      if (next.step !== view?.step) error = '';
      if (next.phase !== 'question' || next.step !== view?.step || next.choice === picked) picked = null;
      view = next;
      draw();
    },
  };
}
