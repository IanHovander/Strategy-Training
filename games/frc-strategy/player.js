// Phone for Strategy Training. Learn and Test: the case file, the question and its answer controls; after the
// reveal, your result, how the room answered, the lesson and the "explore" panel. Showdown: player-draft.js.
import { html } from '../../js/ui.js';
import { LESSONS, lessonById, partById } from './lessons.js';
import { asksConfidence, cleanAnswer, typeOf } from './quiz.js';
import { answerInputs, answerReview, calibrationView, caseFile, confidenceInputs, modelCard, promptCard, resultBanner, wireNumber } from './views.js';
import { mountExplorer } from './explorer.js';
import { draftPhone } from './player-draft.js';

export default function (root, api) {
  let view = null;
  let pending = null; // the answer being edited here: a tapped choice, multi picks or the slider value
  let sure = null; // how sure you said you are, shown at once while it's sent
  let hintOpen = false;
  let error = '';
  let exploreKey = null; // the explorer lives outside the redraws, so sliders and simulations survive view updates

  root.innerHTML = '<div class="st-phone"><div class="st-main"></div><div class="st-explore"></div></div>';
  const main = root.querySelector('.st-main');
  const explore = root.querySelector('.st-explore');
  const draft = draftPhone(main, api);

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
    if (view?.phase === 'moderator-pick') {
      const vote = e.target.closest('[data-volunteer]');
      if (vote) api.send('volunteer', { wants: vote.dataset.volunteer === 'yes' });
      return;
    }
    if (view?.phase !== 'question' || view.isModerator) return;
    const { q } = current();
    if (!q) return;
    if (e.target.closest('[data-hint]')) {
      hintOpen = true;
      return draw();
    }
    const level = e.target.closest('[data-sure]');
    if (level) {
      sure = Number(level.dataset.sure);
      api.vibrate(10);
      draw();
      api.send('sure', { level: sure });
      return;
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
    if (part?.kind === 'draft' && v.phase !== 'pick') {
      setExplore(null);
      draft.update(v, part);
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
    if (v.phase === 'moderator-pick') return moderatorSignup(v);
    if (v.isModerator && ['question', 'reveal', 'scores'].includes(v.phase)) return moderatorGuide(v, part, q);
    if (v.phase === 'question') return question(v, part, q);
    if (v.phase === 'reveal' || v.phase === 'scores') return result(v, part, q);
    return final(v, part);
  }

  function moderatorSignup(v) {
    return html`<div class="st-wait st-mod-phone">
      <span class="st-section">LEARN · THE STRATEGY ROOM</span>
      <h1>Anyone want to moderate?</h1>
      <p>You'd run the conversation, answer questions using a private brief, and decide when to move on. You don't need to know everything.</p>
      <div class="st-mod-buttons">
        <button type="button" class="btn btn-xl ${v.volunteer === true ? 'primary' : ''}" data-volunteer="yes">I'm in 🎙</button>
        <button type="button" class="btn btn-xl ${v.volunteer === false ? 'primary' : ''}" data-volunteer="no">Not this time</button>
      </div>
      ${v.volunteer !== null && html`<p class="st-hint">Locked in: ${v.volunteer ? 'you volunteered' : 'you passed'}. You can switch until signup closes.</p>`}
      <p class="st-hint">${v.choicesIn} people have responded so far. If several volunteer, we'll pick randomly.</p>
      ${v.isVip && next(v, 'Pick moderator now ▸', 'secondary')}
    </div>`;
  }

  function moderatorGuide(v, part, q) {
    const b = v.brief;
    const label = v.phase === 'question' ? 'Show responses ▸' : v.phase === 'reveal' ? 'Next step ▸' : 'Keep going ▸';
    return html`<div class="st-wait st-mod-phone">
      <span class="st-section">🎙 YOU'RE THE MODERATOR</span>
      <h1>You're running this one.</h1>
      <p>Everyone's thinking through the case. Read your notes, hear both sides, answer questions from the brief, then move on when the room is ready.</p>
      <div class="st-card st-mod-brief"><span class="st-section">PRIVATE CASE BRIEF · ${b?.caseTitle ?? ''}</span>
        <h2>${q.title}</h2><p class="st-mod-focus">${b?.focus ?? 'Help the room question assumptions.'}</p>
        <b>What you know</b><ul>${(b?.evidence ?? []).map((line) => html`<li>${line}</li>`)}</ul>
        <b>Good questions if things go quiet</b><ul>${(b?.discussion ?? []).map((line) => html`<li>${line}</li>`)}</ul>
        <p class="st-hint">Students can ask anything, as often as they want. Don't make up unplayed matches or invent data. “We don't know” is a useful answer.</p>
      </div>
      <p class="st-hint">${v.phase === 'question' ? 'Let them make a call before showing where the room landed.' : 'Talk through the result. Advance when discussion has run its course.'}</p>
      ${next(v, label)}
    </div>`;
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
        <p>Pick what everyone will do, then start. Go in order: Learn, Test, then the Showdown.</p>
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
        ${caseChooser(v, part)}
        ${next(v, 'Start ▸')}
      </div>`;
  }

  /** Learn: the leader can run some of the cases. Each toggle sends the whole new list. */
  function caseChooser(v, part) {
    if (!part?.cases) return null;
    const on = v.cases ?? part.cases.map((_, i) => i);
    const toggle = (i) => (on.includes(i) ? on.filter((c) => c !== i) : [...on, i]);
    return html`
      <div class="st-picks">
        <span class="st-picks-title">Cases: ${on.length} of ${part.cases.length}</span>
        <div class="st-seg wrap small">
          ${part.cases.map(
            (c, i) => html`<button type="button" class="${on.includes(i) && 'on'}" data-action="cases" data-payload="${JSON.stringify({ cases: toggle(i) })}">${i + 1}. ${c.title}</button>`,
          )}
        </div>
      </div>`;
  }

  function header(v, part) {
    return html`
      <div class="st-top">
        <span>${part.title} ${v.at} / ${v.of}</span>
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
      ${confidenceInputs(q, sure ?? v.sure)}
      ${asksConfidence(q) && v.answer != null && (sure ?? v.sure) == null && html`<p class="st-hint">Answer in. Now: how sure are you?</p>`}
      ${error && html`<p class="form-error">${error}</p>`}
      ${v.isVip && next(v, part.id === 'learn' ? 'Show responses ▸' : 'Reveal Now ▸', 'secondary')}`;
  }

  function result(v, part, q) {
    const last = v.last;
    const toScores = part.leaderboard !== 'case' || q.lastInCase || last;
    const label = v.phase === 'reveal' ? (toScores ? 'Leaderboard ▸' : 'Next Step ▸') : last ? 'Final Results ▸' : 'Next ▸';
    return html`
      ${header(v, part)}
      ${resultBanner(q, v.answer, html`<p>Score <b>${v.score}</b> · Rank <b>#${v.rank}</b> of ${v.players}</p>`, v.sure)}
      ${v.isVip && next(v, label)}
      ${answerReview(q, v.answer, v.tally)}
      ${calibrationView(v.tally?.calibration, v.sure)}
      ${modelCard(q)}`;
  }

  function final(v, part) {
    const lesson = lessonById(v.lessonId);
    return html`
      <div class="st-result best">
        <h1>${v.rank === 1 ? 'You Won! 🏆' : `${part.title} Complete!`}</h1>
        <span class="st-gained">#${v.rank}</span>
        <p>of ${v.players} · <b>${v.score}</b> points</p>
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
        sure = null;
        hintOpen = false;
      }
      view = next;
      draw();
    },
  };
}
