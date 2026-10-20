// Phone for Learn's Strategy Room (room-rules.js). Everyone: say whether you'll moderate. Students: make the call
// (a plan, how sure, why), see where the room stands, ask the moderator anything. The moderator: the controls that
// move the case along, the question inbox, and the private brief.
//
// Phones type here (questions, reasons, answers), so the screen is drawn in keyed sections and only the sections
// whose HTML changed are redrawn. New questions arriving don't wipe a half-typed one or close the keyboard. Typed
// text is also kept by element id, in case its section does have to be redrawn.
import { html } from '../../js/ui.js';
import { ANSWER_LABELS, LIMITS, MODERATOR, ROOM_INTRO, lastRound, minConfidence, optionsAt, questionsOpen } from './lesson1-room.js';

export function roomPhone(root, api) {
  let view = null;
  let part = null;
  let step = null;
  let pick = null; // the plan tapped, before it's locked in
  let confidence = 75;
  let editing = false; // changing a call that's already in
  let error = '';
  let flash = '';
  let flashTimer = null;
  const drafts = {}; // element id -> typed value
  const drawn = new Map(); // section key -> its HTML

  const c = () => part.cases[view.caseIndex];
  const options = () => optionsAt(c(), view.round);

  root.addEventListener('input', (e) => {
    const t = e.target;
    if (t.matches('[data-confidence]')) {
      confidence = Number(t.value);
      const out = root.querySelector('[data-confidence-out]');
      if (out) out.textContent = `${confidence}%`;
      return;
    }
    if (t.id) drafts[t.id] = t.value;
    syncNeeds();
  });
  root.addEventListener('change', (e) => {
    if (e.target.id && !e.target.matches('[data-confidence]')) drafts[e.target.id] = e.target.value;
    syncNeeds();
  });
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-do]');
    if (el && !el.disabled) act(el.dataset.do, el.dataset.id);
  });

  const typed = (id) => (drafts[id] ?? '').trim();
  function clear(...ids) {
    for (const id of ids) {
      delete drafts[id];
      const el = document.getElementById(id);
      if (el) el.value = '';
    }
    syncNeeds();
  }

  async function send(type, payload, done) {
    error = '';
    const res = await api.send(type, payload);
    if (res?.error) error = res.error;
    else done?.();
    draw();
  }

  function act(what, id) {
    api.vibrate(10);
    const s = `${view.caseIndex}-${view.round}`;
    if (what === 'pick') {
      pick = id;
      return draw();
    }
    if (what === 'lock') {
      const sure = Math.min(100, Math.max(minConfidence(options().length), confidence));
      return send('call', { pick, confidence: sure, why: typed(`sr-why-${s}`), doubt: typed(`sr-doubt-${s}`) }, () => (editing = false));
    }
    if (what === 'edit') {
      editing = true;
      pick = view.mine?.pick ?? pick;
      confidence = view.mine?.confidence ?? confidence;
      return draw();
    }
    if (what === 'brief') return root.querySelector('.sr-brief')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (what === 'ask') {
      return send('ask', { text: typed('sr-ask'), why: typed('sr-ask-why') }, () => {
        clear('sr-ask', 'sr-ask-why');
        notice('Question sent. Ask as many as you like.');
      });
    }
    // the moderator answering a question
    const replies = {
      answer: () => ({ type: 'answer', text: typed(`sr-ans-${id}`) }),
      spoken: () => ({ type: 'spoken' }),
      unknown: () => ({ type: 'unknown' }),
      record: () => ({ type: 'record', record: drafts[`sr-rec-${id}`] }),
      investigation: () => ({ type: 'investigation', investigation: drafts[`sr-inv-${id}`] }),
    };
    if (replies[what]) send('reply', { id, ...replies[what]() }, () => clear(`sr-ans-${id}`, `sr-rec-${id}`, `sr-inv-${id}`));
  }

  function notice(text) {
    flash = text;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => {
      flash = '';
      if (view) draw();
    }, 2600);
  }

  /** Buttons that need something typed or chosen first: [data-needs="element id"]. */
  function syncNeeds() {
    for (const b of root.querySelectorAll('[data-needs]')) b.disabled = !typed(b.dataset.needs);
  }

  // ---------- drawing ----------

  function draw() {
    const v = view;
    const active = document.activeElement;
    const activeId = active && root.contains(active) ? active.id : '';
    const range = activeId && typeof active.selectionStart === 'number' ? [active.selectionStart, active.selectionEnd] : null;
    patch(sections(v));
    syncNeeds();
    // A redrawn section takes the focus with it: put it back where the typing was.
    const again = activeId && document.getElementById(activeId);
    if (again && again !== document.activeElement && root.contains(again)) {
      again.focus({ preventScroll: true });
      if (range) {
        try {
          again.setSelectionRange(...range);
        } catch {
          // not a text field
        }
      }
    }
  }

  /** Put the sections in order, redrawing only the ones whose HTML changed. */
  function patch(list) {
    const keep = new Set();
    let at = root.firstElementChild;
    for (const [key, content] of list) {
      if (content == null || content === false || content === '') continue;
      const text = String(content);
      keep.add(key);
      let el = [...root.children].find((x) => x.dataset.key === key);
      if (!el) {
        el = document.createElement('div');
        el.className = 'sr-sec';
        el.dataset.key = key;
        drawn.delete(key);
      }
      if (drawn.get(key) !== text) {
        el.innerHTML = text;
        drawn.set(key, text);
        for (const field of el.querySelectorAll('[id]')) if (field.id in drafts) field.value = drafts[field.id];
      }
      if (el === at) at = at.nextElementSibling;
      else root.insertBefore(el, at);
    }
    for (const el of [...root.children]) {
      if (!keep.has(el.dataset.key)) {
        drawn.delete(el.dataset.key);
        el.remove();
      }
    }
  }

  function sections(v) {
    const top = [
      ['top', header(v)],
      ['error', error && html`<p class="form-error">${error}</p>`],
      ['flash', flash && html`<p class="sr-flash">${flash}</p>`],
    ];
    if (v.phase === 'intro') return [...top, ['intro', intro(v)]];
    if (v.isModerator) return [...top, ...moderatorSections(v)];
    return [...top, ...studentSections(v)];
  }

  function header(v) {
    return html`
      <div class="st-top">
        <span>${v.phase === 'intro' ? 'Learn' : `Case ${v.at} / ${v.of} · Call ${v.round + 1}`}</span>
        ${v.isModerator ? html`<span class="st-top-score">Moderator</span>` : v.phase !== 'intro' && html`<span class="st-top-score">${c().short}</span>`}
      </div>
      ${v.canRepick &&
      html`<div class="sr-alert">The moderator’s phone dropped. <button class="btn btn-sm" data-action="repick">Pick a New Moderator ▸</button></div>`}`;
  }

  // ---------- the intro ----------

  function intro(v) {
    return html`
      <div class="st-card">
        <span class="st-section">Lesson 1 · Learn</span>
        <b class="st-card-title">${ROOM_INTRO.title}</b>
        ${ROOM_INTRO.lines.map((line) => html`<span>${line}</span>`)}
      </div>
      <div class="st-card">
        <b class="st-card-title">Want to be the moderator?</b>
        <span>The moderator reads a private brief, answers the room’s questions and runs each case. They don’t make calls.</span>
        <div class="st-answers">
          <button class="st-answer ${v.choice === true && 'picked'}" data-action="volunteer" data-payload='{"yes":true}'><span>✋ I’ll moderate</span></button>
          <button class="st-answer ${v.choice === false && 'picked'}" data-action="volunteer" data-payload='{"yes":false}'><span>I’ll make calls</span></button>
        </div>
        <p class="st-hint">${v.answered} of ${v.online} answered. If more than one volunteers, it’s random.</p>
      </div>
      ${v.isVip && html`<button class="btn btn-xl block" data-action="next" data-payload="${JSON.stringify({ from: v.step })}">Pick the Moderator Now ▸</button>`}`;
  }

  // ---------- students ----------

  function studentSections(v) {
    const s = `${v.caseIndex}-${v.round}`;
    const list = [];
    if (v.phase === 'call') {
      list.push(['case', caseCard(v)], [`call-${s}`, callForm(v, s)], ['called', html`<p class="st-hint">${v.called} of ${v.voters} locked in. You can change your call until the room is shown.</p>`]);
    } else if (v.phase === 'discuss') {
      list.push(['stand', stand(v)]);
    } else if (v.phase === 'intel') {
      list.push(['intel', newIntel(v)]);
    } else {
      list.push(['wrap', wrapUp(v)]);
    }
    if (v.questionsOpen) list.push(['ask', askForm()], ['rq', roomQuestions(v)]);
    return list;
  }

  function caseCard(v) {
    const k = c();
    const intel = k.intel.slice(0, v.round);
    const note = k.notes?.[v.round];
    return html`
      <div class="st-case">
        <span class="st-case-label">${k.tag}</span>
        ${note && html`<p class="sr-note"><b>${note.title}</b> ${note.text}</p>`}
        <p>${v.round > 0 && k.setupAfter ? k.setupAfter : k.setup}</p>
        ${intel.length > 0 && html`<ul>${intel.map((t, i) => html`<li class="${i === intel.length - 1 && 'new'}"><b>New intel ${i + 1}:</b> ${t}</li>`)}</ul>`}
      </div>`;
  }

  function callForm(v, s) {
    const k = c();
    const list = options();
    if (v.mine && !editing) {
      const label = list.find((o) => o.id === v.mine.pick)?.label ?? v.mine.pick;
      return html`
        <div class="sr-locked">
          <b>✓ Locked in</b>
          <span class="st-card-title">${label} · ${v.mine.confidence}% sure</span>
          ${v.mine.why && html`<span>“${v.mine.why}”</span>`}
          ${v.mine.doubt && html`<span>⚑ ${v.mine.doubt}</span>`}
        </div>
        <button class="btn block secondary" data-do="edit">Change My Call</button>`;
    }
    const low = minConfidence(list.length);
    const chosen = list.some((o) => o.id === pick) ? pick : null;
    const sure = Math.min(100, Math.max(low, confidence));
    return html`
      <div class="st-card sr-callcard">
        <span class="st-section">${v.round > 0 ? 'New evidence, fresh decision' : !questionsOpen(k, 0) ? 'Start simple: use the numbers here' : 'Make your call before you see anyone else’s'}</span>
        <b class="st-card-title">${v.round > 0 ? 'Still the same call?' : k.prompt}</b>
        <div class="st-answers">
          ${list.map(
            (o) => html`
              <button class="st-answer sr-plan ${chosen === o.id && 'picked'}" data-do="pick" data-id="${o.id}" aria-pressed="${chosen === o.id}">
                <span><b>${o.label}</b><small>${o.detail}</small></span>
              </button>`,
          )}
        </div>
        <label class="st-ctl" for="sr-conf-${s}">
          <span>How sure are you? <b data-confidence-out>${sure}%</b></span>
          <input class="st-range" type="range" id="sr-conf-${s}" data-confidence min="${low}" max="100" step="5" value="${sure}">
        </label>
        <p class="st-scale"><span>${low}% · toss-up</span><span>100% · certain</span></p>
        <p class="st-how">How sure you are this is the <b>best call</b>. Not your chance of winning.</p>
        <label class="sr-label" for="sr-why-${s}">Why? <small>(optional)</small></label>
        <textarea class="sr-field" id="sr-why-${s}" maxlength="${LIMITS.why}" rows="2" placeholder="One sentence is plenty."></textarea>
        ${!questionsOpen(k, v.round) &&
        html`<details class="sr-flag">
          <summary>Something about this setup feels off?</summary>
          <p>Fair! This is a starter model. Flag the assumption you don’t buy; it shows up when the room is shown.</p>
          <textarea class="sr-field" id="sr-doubt-${s}" maxlength="${LIMITS.doubt}" rows="2" placeholder="I’m not sure a robot could always…"></textarea>
        </details>`}
        <button class="btn btn-xl block" data-do="lock" ${!chosen && 'disabled'}>Lock It In ▸</button>
      </div>`;
  }

  function stand(v) {
    const list = options();
    const label = list.find((o) => o.id === v.mine?.pick)?.label;
    return html`
      <div class="st-card">
        <span class="st-section">Votes are up</span>
        <b class="st-card-title">Let’s hear it.</b>
        <span>Why are people landing on different calls?</span>
        <p class="sr-yours">${label ? html`Your call: <b>${label}</b> · ${v.mine.confidence}% sure` : 'You sat this call out.'}</p>
        ${list.map((o, i) => {
          const n = v.counts[i] ?? 0;
          return html`
            <div class="sr-minivote">
              <b>${o.label}</b>
              <span class="st-bar-track"><span class="st-bar-fill" style="width:${v.total ? ((100 * n) / v.total).toFixed(1) : 0}%"></span></span>
              <span>${n}</span>
            </div>`;
        })}
        <p class="st-how">Pick someone with a different answer. Ask <b>what would change their mind</b>. Your call is locked for this round.</p>
      </div>`;
  }

  function newIntel(v) {
    return html`
      <div class="st-card">
        <span class="st-section">Just in</span>
        <b class="st-card-title">New intel.</b>
        <p class="sr-intel-text">${c().intel[v.round]}</p>
        <span>No answer key. Just one more thing to think about. Up next: another call.</span>
      </div>`;
  }

  function wrapUp(v) {
    return html`
      <div class="st-card">
        <span class="st-section">Case ${v.at} of ${v.of} complete</span>
        <b class="st-card-title">Good debate.</b>
        <span>Here’s how <b>your</b> calls changed. Nobody gets a right or wrong stamp here.</span>
        ${v.calls.map((call, r) => {
          const label = call && optionsAt(c(), r).find((o) => o.id === call.pick)?.label;
          return html`<p class="sr-breakdown"><b>Call ${r + 1}</b> ${call ? html`${label} · ${call.confidence}% sure${call.why && html` · “${call.why}”`}` : 'sat out'}</p>`;
        })}
        <p class="st-how">The Test gives you the math. The Showdown asks what you’ll do when the math isn’t enough.</p>
      </div>`;
  }

  function askForm() {
    return html`
      <div class="sr-ask">
        <span class="st-section">Talk to the moderator · no limit</span>
        <b class="st-card-title">Got a question? Ask it.</b>
        <span>Any wording. The moderator answers what’s already known, says “we don’t know,” or digs deeper.</span>
        <textarea class="sr-field" id="sr-ask" maxlength="${LIMITS.question}" rows="2" placeholder="Where did that number come from? What if…?"></textarea>
        <details class="sr-flag">
          <summary>Want to add why it matters?</summary>
          <textarea class="sr-field" id="sr-ask-why" maxlength="${LIMITS.questionWhy}" rows="2" placeholder="This might change our plan because…"></textarea>
        </details>
        <button class="btn block" data-do="ask" data-needs="sr-ask">Ask the Moderator ▸</button>
      </div>`;
  }

  function roomQuestions(v) {
    return html`
      <div class="sr-qlist">
        <b class="st-picks-title">Room questions${v.asked > 0 && html` <small>· ${v.asked} from you</small>`}</b>
        ${v.questions.length
          ? v.questions.map(
              (q) => html`
                <div class="sr-pq ${q.own && 'own'}">
                  <span class="sr-q-meta">Call ${q.round + 1}${q.own && ' · You'}</span>
                  <p>${q.text}</p>
                  ${q.answer
                    ? html`<div class="sr-answer ${q.answer.type}"><b>${ANSWER_LABELS[q.answer.type]}</b>${q.answer.text}</div>`
                    : html`<button class="sr-hear ${q.heard && 'on'}" data-action="hear" data-payload="${JSON.stringify({ id: q.id })}">${q.heard ? '✓ Bring this up too' : 'I want to hear this too'}</button>`}
                </div>`,
            )
          : html`<p class="st-hint">Be the first to ask something.</p>`}
      </div>`;
  }

  // ---------- the moderator ----------

  function moderatorSections(v) {
    const list = [['mod-controls', controls(v)]];
    if (v.phase === 'call') list.push(['mod-start', html`<div class="sr-modcard"><b class="st-picks-title">You’re the moderator</b><ol>${MODERATOR.start.map((t) => html`<li>${t}</li>`)}</ol></div>`]);
    list.push(['mod-inbox', inboxHead(v)]);
    for (const q of v.inbox) {
      list.push([`q-${q.id}`, inboxCard(q)]);
      if (!q.answer) list.push([`q-${q.id}-free`, freeReply(v, q)], [`q-${q.id}-inv`, investigate(v, q)]);
    }
    list.push(['mod-case', modCase(v)], ['mod-brief', brief(v)]);
    return list;
  }

  function controls(v) {
    const k = c();
    const last = v.round >= lastRound(k);
    const label = {
      call: 'Show the Room ▸',
      discuss: !questionsOpen(k, v.round) ? 'Show the Scout Sheet ▸' : last ? 'Wrap the Case ▸' : 'Drop the Next Intel ▸',
      intel: 'Make the Call Again ▸',
      wrap: v.at === v.of ? 'Finish Learn ▸' : 'Next Case ▸',
    }[v.phase];
    const line = {
      call: `${v.called} of ${v.voters} locked in. Show the room when you’re ready.`,
      discuss: `Let them argue. ${v.waiting ? `${v.waiting} question${v.waiting === 1 ? '' : 's'} waiting for you.` : 'Answer questions as they come in.'}`,
      intel: 'Read it out. No interpretation; everyone calls it again.',
      wrap: 'The big screen shows how the room moved. No answer key.',
    }[v.phase];
    return html`
      <div class="sr-controls">
        <span class="st-section">Moderator · ${v.phase === 'discuss' ? 'discussion' : v.phase === 'wrap' ? 'wrap-up' : v.phase === 'intel' ? 'new intel' : 'the call'}</span>
        <p>${line}</p>
        ${v.phase === 'discuss' &&
        v.counts &&
        html`<p class="sr-modvotes">${options().map((o, i) => html`<span><b>${o.label}</b> ${v.counts[i]}</span>`)}</p>`}
        <button class="btn btn-xl block" data-action="next" data-payload="${JSON.stringify({ from: v.step })}">${label}</button>
        <div class="sr-modlinks">
          <button class="btn btn-sm secondary" data-do="brief">Read the Brief ↓</button>
          <details class="sr-flag"><summary>Room stuck?</summary><p>${MODERATOR.hints[v.phase]}</p></details>
        </div>
      </div>`;
  }

  function inboxHead(v) {
    return html`
      <div class="sr-inbox-head">
        <b class="st-picks-title">Questions${v.waiting > 0 && html` <span class="sr-badge">${v.waiting} waiting</span>`}</b>
        <span class="sr-credits">${v.credits} of 2 effort credits left</span>
        ${!questionsOpen(c(), v.round) && html`<p class="st-hint">No questions on the warm-up’s first call. They open on the next one.</p>`}
        ${questionsOpen(c(), v.round) && !v.inbox.length && html`<p class="st-hint">No questions yet. Ask the room what it wants to know.</p>`}
      </div>`;
  }

  function inboxCard(q) {
    return html`
      <div class="sr-modq ${q.answer && 'done'}">
        <span class="sr-q-meta">Call ${q.round + 1}${q.hear > 0 && ` · ${q.hear} want${q.hear === 1 ? 's' : ''} to hear this`}</span>
        <p>“${q.text}”</p>
        ${q.why && html`<small>Why it matters: ${q.why}</small>`}
        ${q.answer && html`<div class="sr-answer ${q.answer.type}"><b>${ANSWER_LABELS[q.answer.type]}</b>${q.answer.text}</div>`}
      </div>`;
  }

  function freeReply(v, q) {
    return html`
      <div class="sr-reply">
        <textarea class="sr-field" id="sr-ans-${q.id}" maxlength="${LIMITS.reply}" rows="2" placeholder="Answer in your own words, from the brief."></textarea>
        <div class="sr-buttons">
          <button class="btn btn-sm" data-do="answer" data-id="${q.id}" data-needs="sr-ans-${q.id}" aria-label="Send your answer">Send</button>
          <button class="btn btn-sm secondary" data-do="spoken" data-id="${q.id}" aria-label="Answered out loud">Out Loud</button>
          <button class="btn btn-sm secondary" data-do="unknown" data-id="${q.id}" aria-label="We don’t know">Don’t Know</button>
        </div>
        <div class="sr-pickrow">
          <select class="sr-select" id="sr-rec-${q.id}" aria-label="Share an existing record">
            <option value="">Existing record (free)…</option>
            ${v.brief.records.map((r) => html`<option value="${r.id}">${r.title}</option>`)}
          </select>
          <button class="btn btn-sm secondary" data-do="record" data-id="${q.id}" data-needs="sr-rec-${q.id}">Share</button>
        </div>
      </div>`;
  }

  function investigate(v, q) {
    const open = v.brief.investigations.filter((x) => !v.used.includes(x.id));
    if (!open.length || v.credits <= 0) return null;
    return html`
      <div class="sr-reply">
        <div class="sr-pickrow">
          <select class="sr-select" id="sr-inv-${q.id}" aria-label="Spend an effort credit on an investigation">
            <option value="">Dig deeper (1 effort credit)…</option>
            ${open.map((x) => html`<option value="${x.id}">${x.title}</option>`)}
          </select>
          <button class="btn btn-sm" data-do="investigation" data-id="${q.id}" data-needs="sr-inv-${q.id}">Dig · 1</button>
        </div>
      </div>`;
  }

  function modCase(v) {
    const k = c();
    const upcoming = v.phase === 'discuss' && v.round < lastRound(k) ? k.intel[v.round] : null;
    return html`
      <div class="st-case">
        <span class="st-case-label">The case · ${k.title}</span>
        <p>${v.round > 0 && k.setupAfter ? k.setupAfter : k.setup}</p>
        <ul>${options().map((o) => html`<li><b>${o.label}:</b> ${o.detail}</li>`)}</ul>
        ${k.intel.slice(0, v.round + (v.phase === 'intel' ? 1 : 0)).map((t, i) => html`<p><b>New intel ${i + 1}:</b> ${t}</p>`)}
        ${upcoming && html`<p class="sr-upcoming"><b>Next intel (when you drop it):</b> ${upcoming}</p>`}
      </div>`;
  }

  function brief(v) {
    const b = v.brief;
    const list = (items) => html`<ul>${items.map((t) => html`<li>${t}</li>`)}</ul>`;
    return html`
      <div class="sr-brief">
        <span class="st-section">Private brief · only you see this</span>
        <b class="st-card-title">What’s actually true</b>
        <p>${b.framing}</p>
        ${b.truth.map(([label, text]) => html`<p class="sr-fact"><b>${label}</b>${text}</p>`)}
        <b class="sr-brief-h">What you can answer for free</b>${list(b.ready)}
        <b class="sr-brief-h">What nobody knows yet</b>${list(b.unknown)}
        <b class="sr-brief-h">If the discussion stalls…</b>${list(b.prompts)}
        <b class="sr-brief-h">Great questions to listen for</b>
        <p class="sr-small">Let them find these. Only nudge if they’re stuck.</p>${list(b.breakthrough)}
        <b class="sr-brief-h">Existing records · always free</b>
        ${b.records.map((r) => html`<p class="sr-fact"><b>${r.title}</b>${r.text}</p>`)}
        <b class="sr-brief-h">Investigations · 1 effort credit each</b>
        ${b.investigations.map(
          (x) => html`<p class="sr-fact ${v.used.includes(x.id) && 'used'}"><b>${x.title}${v.used.includes(x.id) && ' · used'}</b><i>${x.effort}</i>${x.result}</p>`,
        )}
        <p class="sr-rule"><b>The rule</b> ${MODERATOR.rule}</p>
      </div>`;
  }

  return {
    update(v, p) {
      if (v.step !== step) {
        // A new call: start from your last one, if it still fits.
        step = v.step;
        editing = false;
        error = '';
        const list = optionsAt(p.cases[v.caseIndex] ?? p.cases[0], v.round ?? 0);
        pick = v.mine?.pick ?? (list.some((o) => o.id === v.prev?.pick) ? v.prev.pick : null);
        confidence = v.mine?.confidence ?? v.prev?.confidence ?? 75;
      }
      view = v;
      part = p;
      draw();
    },
  };
}
