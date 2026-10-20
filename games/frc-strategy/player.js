// Phone for Strategy Training. Learn and Test: the case file, the question and its answer controls; after the
// reveal, your result, how the room answered, the lesson and the "explore" panel. Showdown: player-showdown.js.
import { html } from '../../js/ui.js';
import { LESSONS, lessonById, partById } from './lessons.js';
import { cleanAnswer, typeOf } from './quiz.js';
import { answerInputs, answerReview, caseFile, modelCard, promptCard, resultBanner, wireNumber } from './views.js';
import { mountExplorer } from './explorer.js';
import { showdownPhone } from './player-showdown.js';

export default function (root, api) {
  let view = null;
  let pending = null; // the answer being edited here: a tapped choice, multi picks or the slider value
  let hintOpen = false;
  let error = '';
  let exploreKey = null; // the explorer lives outside the redraws, so sliders and simulations survive view updates

  root.innerHTML = '<div class="st-phone"><div class="st-main"></div><div class="st-explore"></div></div>';
  const main = root.querySelector('.st-main');
  const explore = root.querySelector('.st-explore');
  const showdown = showdownPhone(main, api);

  const current = () => {
    const part = partById(lessonById(view.lessonId), view.partId);
    return { part, q: part?.kind === 'quiz' ? part.questions[view.q] : null };
  };

  async function send(answer) {
    error = '';
    const res = await api.send('answer', { answer });
    if (res?.error) {
      error = res.error;
      pending = null;
    }
    draw();
  }

  main.addEventListener('click', (e) => {
    if (view?.phase !== 'question') return;
    const { q } = current();
    if (!q) return;
    if (e.target.closest('[data-hint]')) {
      hintOpen = true;
      return draw();
    }
    const choice = e.target.closest('[data-choice]');
    if (choice) {
      const i = Number(choice.dataset.choice);
      api.vibrate(15);
      if (typeOf(q) === 'choice') {
        pending = i;
        draw();
        return send(i);
      }
      const picks = new Set(pending ?? view.answer ?? []);
      picks.has(i) ? picks.delete(i) : picks.add(i);
      pending = [...picks].sort((a, b) => a - b);
      return draw();
    }
    if (e.target.closest('[data-submit]')) {
      const fallback = typeOf(q) === 'number' ? (q.number.min + q.number.max) / 2 : [];
      const answer = cleanAnswer(q, pending ?? view.answer ?? fallback);
      if (answer !== null) send(answer);
    }
  });

  function draw() {
    const v = view;
    const { part, q } = current();
    if (part?.kind === 'showdown' && v.phase !== 'pick') {
      setExplore(null);
      showdown.update(v, part);
      return;
    }
    main.innerHTML = html`${phase(v, part, q)}`;
    if (v.phase === 'question' && typeOf(q) === 'number') wireNumber(main, q, (value) => (pending = value));
    const showExplore = (v.phase === 'reveal' || v.phase === 'scores') && q?.explore;
    setExplore(showExplore ? `${v.lessonId}:${v.partId}:${v.q}` : null, q?.explore);
  }

  function setExplore(key, ex) {
    if (key === exploreKey) return;
    exploreKey = key;
    if (key) mountExplorer(explore, ex);
    else explore.replaceChildren();
  }

  function phase(v, part, q) {
    if (v.phase === 'pick') return pick(v);
    if (v.phase === 'question') return question(v, part, q);
    if (v.phase === 'reveal' || v.phase === 'scores') return result(v, part, q);
    return final(v, part);
  }

  const next = (v, label, extra = '') =>
    html`<button class="btn btn-xl block ${extra}" data-action="next" data-payload="${JSON.stringify({ from: v.step })}">${label}</button>`;

  function pick(v) {
    const lesson = lessonById(v.lessonId);
    const part = partById(lesson, v.partId);
    if (!v.isVip) {
      return html`
        <div class="st-wait">
          <h1>Strategy Training</h1>
          <p>The leader is picking the lesson. Watch the big screen!</p>
          <div class="st-card"><span class="st-section">Lesson ${lesson.number} · ${part.title}</span><b class="st-card-title">${lesson.title}</b><span>${part.blurb}</span></div>
        </div>`;
    }
    return html`
      <div class="st-wait">
        <h1>You're the Leader</h1>
        <p>Pick what everyone will do, then start. Go in order: Learn, Test, then Showdown.</p>
        ${LESSONS.map(
          (l) => html`
            <div class="st-picks">
              <span class="st-picks-title">Lesson ${l.number}: ${l.title}</span>
              ${l.parts.map(
                (p, i) => html`
                  <button class="st-pick ${l.id === v.lessonId && p.id === v.partId && 'selected'}" data-action="lesson" data-payload="${JSON.stringify({ lessonId: l.id, partId: p.id })}">
                    <span class="st-section">Part ${i + 1}</span>${p.title}
                  </button>`,
              )}
            </div>`,
        )}
        ${next(v, 'Start ▸')}
      </div>`;
  }

  function header(v, part) {
    return html`
      <div class="st-top">
        <span>${part.title} ${v.q + 1} / ${part.questions.length}</span>
        <span class="st-top-score">${v.score} pts</span>
        ${v.deadline && html`<span class="timer" data-deadline="${v.deadline}"></span>`}
      </div>`;
  }

  function question(v, part, q) {
    return html`
      ${header(v, part)}
      ${caseFile(q)}
      ${promptCard(q, q.caseTitle != null ? q.section : `Investigation ${v.q + 1} · ${q.section}`)}
      ${answerInputs(q, pending, v.answer, { hintOpen })}
      ${error && html`<p class="form-error">${error}</p>`}
      ${v.isVip && next(v, 'Reveal Now ▸', 'secondary')}`;
  }

  function result(v, part, q) {
    const last = v.q + 1 >= part.questions.length;
    const toScores = part.leaderboard !== 'case' || q.lastInCase || last;
    const label = v.phase === 'reveal' ? (toScores ? 'Leaderboard ▸' : 'Next Step ▸') : last ? 'Final Results ▸' : 'Next ▸';
    return html`
      ${header(v, part)}
      ${resultBanner(q, v.answer, html`<p>Score <b>${v.score}</b> · Rank <b>#${v.rank}</b> of ${v.of}</p>`)}
      ${v.isVip && next(v, label)}
      ${answerReview(q, v.answer, v.tally)}
      ${modelCard(q)}`;
  }

  function final(v, part) {
    const lesson = lessonById(v.lessonId);
    return html`
      <div class="st-result best">
        <h1>${v.rank === 1 ? 'You Won! 🏆' : `${part.title} Complete!`}</h1>
        <span class="st-gained">#${v.rank}</span>
        <p>of ${v.of} · <b>${v.score}</b> points</p>
        <p>Best answers: <b>${v.best}</b> of ${v.asked}</p>
      </div>
      <div class="st-card">
        <span class="st-section">Lesson ${lesson.number} · ${part.title}</span>
        <b class="st-card-title">${lesson.title}</b>
        <span>${lesson.summary}</span>
        <a class="btn block st-solo" href="lessons.html" target="_blank" rel="noopener">Practice Solo ▸</a>
      </div>
      ${v.isVip && html`<button class="btn btn-xl block" data-action="finish">Finish ▸</button>`}`;
  }

  return {
    update(next) {
      if (next.step !== view?.step) {
        error = '';
        pending = null;
        hintOpen = false;
      }
      view = next;
      draw();
    },
  };
}
