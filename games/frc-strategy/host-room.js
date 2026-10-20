// Big screen for Learn's Strategy Room (room-rules.js): the intro and moderator volunteers, then each case's
// file, the calls coming in, where the room stands, the questions and answers, new intel and the wrap-up.
// The moderator runs it from their phone, so there are no buttons here except to stop waiting for volunteers
// and to replace a moderator whose phone dropped.
import { html } from '../../js/ui.js';
import { avatar } from '../../js/avatar.js';
import { ANSWER_LABELS, ROOM_INTRO, optionsAt } from './lesson1-room.js';
import { nextButton, status } from './host-parts.js';

export function roomHead(v, lesson, part) {
  if (v.phase === 'intro') return null;
  const c = part.cases[v.caseIndex];
  return html`
    <header class="st-head">
      <span class="st-lesson">Lesson ${lesson.number} · Learn: <b>${lesson.title}</b></span>
      <span class="st-step">Case ${v.at} / ${v.of}: ${c.title}</span>
      ${v.phase !== 'wrap' && html`<span class="sr-call">Call ${v.round + 1}</span>`}
      <span class="spacer"></span>
      ${v.moderator &&
      html`<span class="sr-mod ${!v.moderator.connected && 'away'}" style="--c:${v.moderator.color}">Moderator <b>${v.moderator.name}</b>${!v.moderator.connected && ' · phone dropped'}</span>`}
      ${v.moderator && !v.moderator.connected && html`<button class="btn btn-sm secondary" data-action="repick">New Moderator ▸</button>`}
    </header>`;
}

export function roomBody(v, lesson, part) {
  if (v.phase === 'intro') return intro(v, lesson);
  const c = part.cases[v.caseIndex];
  if (v.phase === 'wrap') return wrap(v, c);
  const main = v.phase === 'call' ? calling(v, c) : v.phase === 'discuss' ? discuss(v, c) : intel(v, c);
  return html`
    <div class="sr-layout ${v.phase === 'discuss' && 'three'}">
      ${caseFile(v, c)}
      ${main}
    </div>`;
}

// ---------- the intro: what this is, and who moderates ----------

function intro(v, lesson) {
  const online = v.players.filter((p) => p.connected);
  return html`
    <div class="sr-intro">
      <div class="st-title"><h1>${ROOM_INTRO.title}</h1><p>Lesson ${lesson.number} · Learn: ${lesson.title}</p></div>
      <div class="sr-intro-lines">${ROOM_INTRO.lines.map((line) => html`<p>${line}</p>`)}</div>
      <div class="sr-volunteer">
        <h2>Who wants to moderate?</h2>
        <p>Answer on your phone. The moderator reads a private brief and runs the room instead of making calls. More than one volunteer? We pick at random.</p>
        <div class="st-status">
          ${v.players.map(
            (p) => html`
              <span class="st-who ${p.done && 'done'} ${p.keen && 'keen'} ${!p.connected && 'away'}" style="--c:${p.color}" title="${p.name}">
                ${avatar(p, { mood: p.keen ? 'happy' : undefined })}
                <span>${p.name}</span>
              </span>`,
          )}
        </div>
        <div class="sr-intro-foot">
          <span class="st-answered"><b>${online.filter((p) => p.done).length}</b> / ${online.length} answered</span>
          <span class="sr-keen">✋ ${v.players.filter((p) => p.keen).length} want to moderate</span>
          ${nextButton(v, 'Pick the Moderator ▸', 'btn-xl')}
        </div>
      </div>
    </div>`;
}

// ---------- the case file, on the left all case long ----------

function caseFile(v, c) {
  const note = c.notes?.[v.round];
  const intelSoFar = c.intel.slice(0, v.round + (v.phase === 'intel' ? 1 : 0));
  const newest = intelSoFar.length - 1;
  return html`
    <aside class="st-casefile sr-casefile">
      <span class="st-case-label">${c.tag}</span>
      <h2>${c.title}</h2>
      ${note && html`<p class="sr-note"><b>${note.title}</b> ${note.text}</p>`}
      <p>${v.round > 0 && c.setupAfter ? c.setupAfter : c.setup}</p>
      <div class="sr-options">
        ${optionsAt(c, v.round).map((o) => html`<div class="sr-option"><b>${o.label}</b><span>${o.detail}</span></div>`)}
      </div>
      ${intelSoFar.length > 0 &&
      html`<ul class="sr-intel-list">
        ${intelSoFar.map(
          (t, i) => html`<li class="${i === newest && v.phase !== 'discuss' && 'new'}"><b class="st-case-label">New intel ${i + 1}</b>${t}</li>`,
        )}
      </ul>`}
      ${v.learned?.length > 0 &&
      html`<div class="sr-learned"><span class="st-case-label">From the moderator</span>${v.learned.map((t) => html`<p>${t}</p>`)}</div>`}
    </aside>`;
}

// ---------- make the call ----------

function calling(v, c) {
  return html`
    <div class="sr-main">
      <div class="st-q">
        <span class="st-section">${v.round > 0 ? 'New evidence, fresh decision' : 'Lock it in on your phone'}</span>
        <h1>Make the Call.</h1>
      </div>
      <p class="st-prompt"><b>${v.round > 0 ? 'Still the same call?' : c.prompt}</b> Pick a plan on your phone, say how sure you are, and give your reason if you want.</p>
      <p class="st-instruct">Everyone decides on their own phone first. No peeking at the room.</p>
      <div class="sr-count">
        <span class="st-answered"><b>${v.answered}</b> / ${v.players.length} locked in</span>
        ${v.moderator && html`<span class="sr-reading">${v.moderator.name} is reading the moderator’s brief.</span>`}
      </div>
      ${status(v.players)}
    </div>`;
}

// ---------- where we stand, and the questions ----------

function discuss(v, c) {
  const options = optionsAt(c, v.round);
  const before = v.round > 0 ? optionsAt(c, v.round - 1) : [];
  const total = v.roster.length;
  const avg = total ? Math.round(v.roster.reduce((s, e) => s + e.confidence, 0) / total) : null;
  const label = (list, id) => list.find((o) => o.id === id)?.label ?? id;
  const warmup = !v.questionsOpen;
  return html`
    <div class="sr-main">
      <div class="sr-stand">
        <h1>Here’s Where We Stand.</h1>
        <span class="st-answered"><b>${total}</b> ${total === 1 ? 'call' : 'calls'}</span>
      </div>
      <div class="sr-votes">
        ${options.map((o, i) => {
          const n = v.counts[i] ?? 0;
          const share = total ? n / total : 0;
          return html`
            <div class="sr-vote">
              <b>${o.label}</b>
              <span class="st-bar-track"><span class="st-bar-fill" style="width:${(100 * share).toFixed(1)}%"></span></span>
              <span class="sr-pct">${Math.round(100 * share)}%<small>${n} of ${total}</small></span>
            </div>`;
        })}
      </div>
      ${avg != null && html`<p class="sr-avg">Average confidence <b>${avg}%</b> · confidence is NOT the chance of winning</p>`}
      <div class="sr-cue"><b>${warmup ? 'Just talk through the scores' : 'Keep the conversation going'}</b>${c.nudges[Math.min(v.round, c.nudges.length - 1)]}</div>
      <div class="sr-roster ${total > 12 && 'many'} ${total > 21 && 'crowd'}">
        ${v.roster.map(
          (e) => html`
            <div class="sr-person" style="--c:${e.color ?? 'var(--grey)'}">
              <span class="sr-name">${e.name}</span>
              <span class="sr-pick"><b>${label(options, e.pick)}</b> · ${e.confidence}%<span class="sr-sure"> sure</span></span>
              ${e.was && html`<span class="sr-was">↺ was ${label(before, e.was.pick)} · ${e.was.confidence}%</span>`}
              ${e.why && html`<span class="sr-why">“${e.why}”</span>`}
              ${e.doubt && html`<span class="sr-doubt">⚑ ${e.doubt}</span>`}
            </div>`,
        )}
      </div>
    </div>
    <aside class="sr-questions">
      ${warmup
        ? html`
            <h2>Warm-up</h2>
            <p>Hear both sides of the first call. Questions open on the next call, once the scouting arrives.</p>`
        : html`
            <h2>Questions Flying In</h2>
            <p>Ask the moderator anything on your phone. No limit. Only deeper digging costs an effort credit.</p>
            ${v.questions.length
              ? v.questions.map((q) => roomQuestion(q))
              : html`<p class="sr-empty">No questions yet. Start anywhere: where did that number come from?</p>`}
            ${v.asked > v.questions.length && html`<p class="sr-more">${v.asked} questions so far</p>`}`}
    </aside>`;
}

/** A question as the room sees it: the call it came in on, never who asked. */
function roomQuestion(q) {
  return html`
    <div class="sr-q">
      <span class="sr-q-meta">Call ${q.round + 1}${q.hear > 0 && ` · ${q.hear} want${q.hear === 1 ? 's' : ''} to hear this`}</span>
      <p>${q.text}</p>
      ${q.why && html`<small>Why it matters: ${q.why}</small>`}
      ${q.answer
        ? html`<div class="sr-answer ${q.answer.type}"><b>${ANSWER_LABELS[q.answer.type]}</b>${q.answer.text}</div>`
        : html`<span class="sr-waiting">Waiting for the moderator</span>`}
    </div>`;
}

// ---------- new intel ----------

function intel(v, c) {
  return html`
    <div class="sr-main sr-intel">
      <div class="st-q">
        <span class="st-section">Update ${v.round + 1}</span>
        <h1>New Intel Just Dropped.</h1>
      </div>
      <div class="sr-intel-card">${c.intel[v.round]}</div>
      <p class="st-instruct">No interpretation from the moderator. Everyone gets another call.</p>
    </div>`;
}

// ---------- how the room moved ----------

function wrap(v, c) {
  return html`
    <div class="sr-wrap">
      <div class="sr-wrap-main">
        <div class="st-title"><h1>How the Room Moved</h1><p>Case ${v.at} of ${v.of}: ${c.title} · no answer key</p></div>
        <div class="sr-moves">
          ${v.moves.map((counts, r) => {
            const options = optionsAt(c, r);
            const total = counts.reduce((a, b) => a + b, 0);
            return html`
              <div class="sr-move">
                <b class="sr-move-call">Call ${r + 1}</b>
                <span class="sr-move-bar">
                  ${options.map((o, i) => counts[i] > 0 && html`<span class="o${i}" style="flex:${counts[i]}">${o.label} ${counts[i]}</span>`)}
                  ${!total && html`<span class="none">No calls</span>`}
                </span>
              </div>`;
          })}
        </div>
      </div>
      <aside class="st-report sr-wrap-side">
        <h2>The Room</h2>
        <div class="st-stats">
          <span class="st-stat"><small>times the room voted</small><b>${v.stats.calls}</b></span>
          <span class="st-stat"><small>questions asked</small><b>${v.stats.questions}</b></span>
          <span class="st-stat hi"><small>moderator answers</small><b>${v.stats.answers}</b></span>
        </div>
        <div class="sr-cue"><b>Still on the table</b>${c.blind}</div>
        <p class="sr-small">Not a gotcha. Just one more thing someone might reasonably want to know. The point is the questions we learned to ask.</p>
      </aside>
    </div>`;
}
