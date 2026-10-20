// The Strategy Room: the rules for Learn in the team game (rules.js hands over to these when the part's kind is
// 'room'). The cases are in lesson1-room.js; the moderator's brief is in lesson1-room-brief.js.
//
//   intro     the big screen sums up the cases and asks who wants to moderate; phones answer yes or no. Once
//             everyone has answered (or the leader moves on), the moderator is picked at random from the
//             volunteers, or from everyone if nobody volunteered.
//   call      everyone but the moderator makes the call: a plan, how sure they are, and why (optional). They can
//             change it until the room is shown. The moderator reads the brief meanwhile.
//   discuss   the big screen shows every call. The room argues it out and asks the moderator questions.
//   intel     the next piece of intel; then everyone calls it again
//   wrap      after the last call: how the room's calls moved. Then the next case, or back to the lobby.
//
// The moderator moves the case along (no timers) and answers questions: in their own words, out loud, "we don't
// know", an existing record (free) or an investigation (one of a few effort credits per case). Anyone but the
// moderator may ask as many questions as they like, except on the warm-up's first call. Questions never show who
// asked them. No points.
//
// State lives in ctx.state.room. The brief goes only to the moderator's phone, one case at a time.
import { LIMITS, ROOM, lastRound, minConfidence, optionsAt, questionsOpen } from './lesson1-room.js';
import { BRIEFS, CREDITS } from './lesson1-room-brief.js';

const ALL_IN_MS = 2500; // once everyone has said whether they'll moderate, a moment to change their mind
const MAX_QUESTIONS = 300; // per case, so a stuck button can't flood the room
const BIG_VIEW = 14500; // views have to stay under 16 KB; trim the extras past this

const R = (ctx) => ctx.state.room;
const caseOf = (r) => ROOM[r.order[r.at]];
const briefOf = (r) => BRIEFS[r.order[r.at]];
const clean = (text, max) => String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const trimTo = (text, max) => (text && text.length > max ? `${text.slice(0, max - 1)}…` : text);
const isModerator = (ctx, id) => R(ctx).moderatorId === id;
const voters = (ctx) => ctx.players.filter((p) => !isModerator(ctx, p.id));

/** A fresh Learn: `order` is the case numbers to run. */
export function start(ctx, order) {
  ctx.state.room = {
    order,
    at: 0,
    round: 0,
    volunteers: {}, // playerId -> true (wants to moderate) or false
    moderatorId: null,
    calls: {}, // playerId -> { pick, confidence, why, doubt }, this call only
    history: [], // per call, once the room is shown: [{ id, name, pick, confidence, why, doubt }]
    questions: [], // { id, text, why, round, by, hear: [playerId] }
    answers: {}, // question id -> { type, text, round }
    credits: CREDITS,
    used: [], // investigation ids
    serial: 0,
    totals: { calls: 0, questions: 0 }, // across the cases, for the lobby
  };
  ctx.state.phase = 'intro';
}

/** Which screen we're on, so a double-tapped button only moves things once. */
export const stepKey = (ctx) => `${ctx.state.phase}:${R(ctx).at}:${R(ctx).round}`;

function newCase(ctx) {
  Object.assign(R(ctx), { round: 0, calls: {}, history: [], questions: [], answers: {}, credits: CREDITS, used: [] });
  ctx.state.phase = 'call';
}

/** Everyone connected has said yes or no to moderating: pick soon (unless that changes). */
function maybePick(ctx) {
  if (ctx.state.phase !== 'intro') return;
  const allIn = () => {
    const online = ctx.players.filter((p) => p.connected);
    return online.length > 0 && online.every((p) => p.id in R(ctx).volunteers);
  };
  if (!allIn()) return ctx.cancelTimer('volunteers');
  ctx.timer('volunteers', ALL_IN_MS, () => allIn() && pickModerator(ctx));
}

/** At random from the connected volunteers, or from everyone connected if nobody volunteered. */
function pickModerator(ctx, skip = null) {
  const r = R(ctx);
  const online = ctx.players.filter((p) => p.connected && p.id !== skip);
  if (!online.length) return;
  const keen = online.filter((p) => r.volunteers[p.id] === true);
  r.moderatorId = ctx.pick(keen.length ? keen : online).id;
  delete r.calls[r.moderatorId]; // the moderator doesn't vote
  ctx.cancelTimer('volunteers');
  if (ctx.state.phase === 'intro') newCase(ctx);
}

export function onJoin(ctx) {
  maybePick(ctx);
}

export function onDisconnect(ctx) {
  maybePick(ctx);
}

/**
 * The moderator moves the case along; in the intro, the leader (or the big screen) can stop waiting and pick the
 * moderator. `by` is the player, or null for the big screen.
 */
export function next(ctx, by, from) {
  const s = ctx.state;
  const r = R(ctx);
  if (from !== stepKey(ctx)) return;
  if (s.phase === 'intro') {
    if (!by || by.isVip) pickModerator(ctx);
    return;
  }
  if (!by || !isModerator(ctx, by.id)) return;
  const c = caseOf(r);
  if (s.phase === 'call') {
    // Lock the calls in as they stand. Whoever hasn't called sits this one out.
    r.history[r.round] = ctx.players.flatMap((p) => (r.calls[p.id] && !isModerator(ctx, p.id) ? [{ id: p.id, name: p.name, ...r.calls[p.id] }] : []));
    r.totals.calls += r.history[r.round].length;
    s.phase = 'discuss';
  } else if (s.phase === 'discuss') {
    s.phase = r.round < lastRound(c) ? 'intel' : 'wrap';
  } else if (s.phase === 'intel') {
    r.round++;
    r.calls = {};
    s.phase = 'call';
  } else if (s.phase === 'wrap') {
    r.totals.questions += r.questions.length;
    if (r.at + 1 < r.order.length) {
      r.at++;
      newCase(ctx);
    } else {
      const { calls, questions } = r.totals;
      ctx.end(`The Strategy Room: ${r.order.length} ${r.order.length === 1 ? 'case' : 'cases'}, ${calls} calls, ${questions} ${questions === 1 ? 'question' : 'questions'}`);
    }
  }
}

/** The moderator's phone dropped: the leader or the big screen picks someone else. */
export function repick(ctx, by) {
  const r = R(ctx);
  if (ctx.state.phase === 'intro' || ctx.player(r.moderatorId)?.connected) return;
  if (by && !by.isVip) return;
  pickModerator(ctx, r.moderatorId);
}

export const actions = {
  /** Intro: "Want to moderate?" yes or no. */
  volunteer(ctx, player, payload) {
    if (ctx.state.phase !== 'intro') return { error: 'The moderator has already been picked.' };
    R(ctx).volunteers[player.id] = payload?.yes === true;
    maybePick(ctx);
    return { ok: true };
  },

  /** Make (or change) the call: { pick, confidence, why?, doubt? }. */
  call(ctx, player, payload) {
    const r = R(ctx);
    if (ctx.state.phase !== 'call') return { error: 'The room has already been shown. Wait for the next call.' };
    if (isModerator(ctx, player.id)) return { error: 'The moderator doesn’t make a call.' };
    const c = caseOf(r);
    const options = optionsAt(c, r.round);
    const pick = options.find((o) => o.id === payload?.pick)?.id;
    if (!pick) return { error: 'Pick one of the plans.' };
    const confidence = payload?.confidence;
    if (!Number.isInteger(confidence) || confidence % 5 || confidence < minConfidence(options.length) || confidence > 100) {
      return { error: 'Set how sure you are with the slider.' };
    }
    const doubt = questionsOpen(c, r.round) ? '' : clean(payload?.doubt, LIMITS.doubt); // the warm-up's "feels off?"
    r.calls[player.id] = { pick, confidence, why: clean(payload?.why, LIMITS.why), doubt };
    return { ok: true };
  },

  /** Ask the moderator anything: { text, why? }. */
  ask(ctx, player, payload) {
    const r = R(ctx);
    if (ctx.state.phase === 'intro') return { error: 'Questions open once the case starts.' };
    if (isModerator(ctx, player.id)) return { error: 'You’re the moderator: you answer the questions.' };
    if (!questionsOpen(caseOf(r), r.round)) return { error: 'Questions open on the next call.' };
    const text = clean(payload?.text, LIMITS.question);
    if (!text) return { error: 'Type a question first.' };
    if (r.questions.length >= MAX_QUESTIONS) return { error: 'That’s a lot of questions! Talk a few through out loud.' };
    r.questions.push({ id: `q${++r.serial}`, text, why: clean(payload?.why, LIMITS.questionWhy), round: r.round, by: player.id, hear: [] });
    return { ok: true };
  },

  /** "I want to hear this too", or take it back. */
  hear(ctx, player, payload) {
    const q = R(ctx).questions.find((x) => x.id === payload?.id);
    if (!q || isModerator(ctx, player.id)) return;
    q.hear = q.hear.includes(player.id) ? q.hear.filter((id) => id !== player.id) : [...q.hear, player.id];
  },

  /**
   * The moderator answers a question: { id, type, text?, record?, investigation? }.
   *   answer         in their own words (text)
   *   spoken         answered out loud
   *   unknown        we don't know
   *   record         an existing record from the brief (free)
   *   investigation  a deeper look from the brief (one effort credit)
   */
  reply(ctx, player, payload) {
    const r = R(ctx);
    if (!isModerator(ctx, player.id)) return { error: 'Only the moderator answers questions.' };
    const q = r.questions.find((x) => x.id === payload?.id);
    if (!q) return { error: 'That question is gone.' };
    if (r.answers[q.id]) return { error: 'That one’s already answered.' };
    const brief = briefOf(r);
    let text;
    if (payload.type === 'answer') {
      text = clean(payload.text, LIMITS.reply);
      if (!text) return { error: 'Type your answer first.' };
    } else if (payload.type === 'spoken') {
      text = 'The moderator answered this out loud. Ask a follow-up if anything is unclear.';
    } else if (payload.type === 'unknown') {
      text = 'We don’t have reliable evidence for that yet. Keep asking, or suggest how we could find out.';
    } else if (payload.type === 'record') {
      const rec = brief.records.find((x) => x.id === payload.record);
      if (!rec) return { error: 'Choose a record first.' };
      text = `${rec.title}: ${rec.text}`;
    } else if (payload.type === 'investigation') {
      const inv = brief.investigations.find((x) => x.id === payload.investigation);
      if (!inv) return { error: 'Choose an investigation first.' };
      if (r.used.includes(inv.id)) return { error: 'That investigation is already done.' };
      if (r.credits <= 0) return { error: 'No effort credits left for this case.' };
      r.credits--;
      r.used.push(inv.id);
      text = `${inv.title}: ${inv.result}`;
    } else {
      return { error: 'Pick how to answer.' };
    }
    r.answers[q.id] = { type: payload.type, text, round: r.round };
    return { ok: true };
  },
};

// ---------- views ----------

/** Votes per plan on call `round`, in the order of that call's plans. */
const countsAt = (r, round) => optionsAt(caseOf(r), round).map((o) => (r.history[round] ?? []).filter((e) => e.pick === o.id).length);

/** The last few answers that told the room something (not "we don't know" or "said out loud"). */
const learned = (r) =>
  r.questions
    .filter((q) => ['answer', 'record', 'investigation'].includes(r.answers[q.id]?.type))
    .slice(-3)
    .map((q) => r.answers[q.id].text);

/** A question as the room sees it: never who asked. `me` marks your own and whether you want to hear it. */
function publicQuestion(r, q, me = null) {
  return {
    id: q.id,
    text: q.text,
    why: q.why,
    round: q.round,
    hear: q.hear.length,
    ...(me && { own: q.by === me, heard: q.hear.includes(me) }),
    answer: r.answers[q.id] ? { type: r.answers[q.id].type, text: r.answers[q.id].text } : null,
  };
}

/** Newest first. */
const latest = (r, n) => r.questions.slice(-n).reverse();

/** Drop the longest optional text until a view fits in a message. */
function fit(view, trims) {
  for (const trim of trims) {
    if (JSON.stringify(view).length <= BIG_VIEW) break;
    trim(view);
  }
  return view;
}

function common(ctx, base) {
  const r = R(ctx);
  const mod = ctx.player(r.moderatorId);
  return {
    ...base,
    caseIndex: r.order[r.at],
    at: r.at + 1,
    of: r.order.length,
    round: r.round,
    moderator: mod ? { name: mod.name, color: mod.color, connected: mod.connected } : null,
  };
}

export function hostView(ctx, base) {
  const r = R(ctx);
  const s = ctx.state;
  const v = common(ctx, base);
  const many = ctx.players.length > 16;
  const chip = (p) => ({ id: p.id, name: p.name, color: p.color, connected: p.connected });
  if (s.phase === 'intro') {
    return { ...v, players: ctx.players.map((p) => ({ ...chip(p), done: p.id in r.volunteers, keen: r.volunteers[p.id] === true })) };
  }
  if (s.phase === 'call') {
    const list = voters(ctx);
    return { ...v, players: list.map((p) => ({ ...chip(p), done: p.id in r.calls })), answered: list.filter((p) => p.id in r.calls).length, learned: learned(r) };
  }
  if (s.phase === 'discuss') {
    const before = r.round > 0 ? r.history[r.round - 1] ?? [] : [];
    const roster = (r.history[r.round] ?? []).map((e) => {
      const was = before.find((b) => b.id === e.id);
      const moved = was && (was.pick !== e.pick || was.confidence !== e.confidence);
      const color = ctx.player(e.id)?.color ?? null;
      return { name: e.name, color, pick: e.pick, confidence: e.confidence, why: trimTo(e.why, many ? 90 : LIMITS.why), doubt: trimTo(e.doubt, many ? 120 : LIMITS.doubt), was: moved ? { pick: was.pick, confidence: was.confidence } : null };
    });
    const open = questionsOpen(caseOf(r), r.round);
    return fit(
      { ...v, roster, counts: countsAt(r, r.round), questionsOpen: open, questions: open ? latest(r, many ? 4 : 6).map((q) => publicQuestion(r, q)) : [], asked: r.questions.length, learned: learned(r) },
      [(x) => x.roster.forEach((e) => (e.why = trimTo(e.why, 60))), (x) => (x.questions = x.questions.slice(0, 3)), (x) => x.roster.forEach((e) => (e.why = e.doubt = ''))],
    );
  }
  if (s.phase === 'intel') return { ...v, learned: learned(r) };
  // wrap
  return {
    ...v,
    moves: r.history.map((_, round) => countsAt(r, round)),
    stats: { calls: r.history.length, answers: Object.values(r.answers).filter((a) => a.type !== 'spoken').length, questions: r.questions.length },
  };
}

export function playerView(ctx, me, base) {
  const r = R(ctx);
  const s = ctx.state;
  const v = { ...common(ctx, base), isModerator: isModerator(ctx, me.id), canRepick: s.phase !== 'intro' && me.isVip && !ctx.player(r.moderatorId)?.connected };
  if (s.phase === 'intro') {
    const online = ctx.players.filter((p) => p.connected);
    return { ...v, choice: r.volunteers[me.id] ?? null, answered: online.filter((p) => p.id in r.volunteers).length, online: online.length };
  }
  const list = voters(ctx);
  const called = list.filter((p) => p.id in r.calls).length;
  if (v.isModerator) {
    const brief = briefOf(r);
    // Waiting questions first, newest on top; then the last few answered.
    const unanswered = r.questions.filter((q) => !r.answers[q.id]).slice(-10).reverse();
    const answered = r.questions.filter((q) => r.answers[q.id]).slice(-4).reverse();
    const inbox = [...unanswered, ...answered];
    const card = (q) => {
      const p = publicQuestion(r, q);
      if (p.answer) p.answer.text = trimTo(p.answer.text, 160);
      return p;
    };
    return fit(
      {
        ...v,
        brief,
        credits: r.credits,
        used: r.used,
        called,
        voters: list.length,
        counts: s.phase === 'discuss' ? countsAt(r, r.round) : null,
        inbox: inbox.map(card),
        waiting: r.questions.filter((q) => !r.answers[q.id]).length,
        asked: r.questions.length,
      },
      [(x) => (x.inbox = x.inbox.filter((q) => !q.answer)), (x) => (x.inbox = x.inbox.slice(0, 6))],
    );
  }
  const mine = (round) => {
    const e = r.history[round]?.find((x) => x.id === me.id);
    return e ? { pick: e.pick, confidence: e.confidence, why: e.why } : null;
  };
  const room = {
    ...v,
    questionsOpen: questionsOpen(caseOf(r), r.round),
    questions: latest(r, 6).map((q) => publicQuestion(r, q, me.id)),
    asked: r.questions.filter((q) => q.by === me.id).length,
  };
  if (s.phase === 'call') return { ...room, mine: r.calls[me.id] ?? null, prev: r.round > 0 ? mine(r.round - 1) : null, called, voters: list.length };
  if (s.phase === 'discuss') return { ...room, mine: mine(r.round), counts: countsAt(r, r.round), total: r.history[r.round]?.length ?? 0 };
  if (s.phase === 'intel') return room;
  return { ...room, calls: r.history.map((_, round) => mine(round)), moves: r.history.map((_, round) => countsAt(r, round)) };
}
