// Strategy Training: the room works through a lesson together.
//
// The leader (big screen or the leader's phone) picks a lesson and a part:
//   Learn (kind 'room'): the Strategy Room. The room argues out match-day calls with a student moderator, no
//     points. Its rules are in room-rules.js. The leader can run a few of its cases.
//   Test (kind 'quiz'): everyone answers each question on their phone; the big screen shows how the room
//     answered and the points each answer earned. Phases: question -> reveal -> scores -> ... -> final.
//     A quiz part can also be case studies (leaderboard 'case', picks that ask how sure you are, cases the
//     leader can choose), like the solo page's Learn.
//   Showdown (kind 'draft'): two groups build picklists, run alliance selection and play a best of three.
//     Its rules are in draft-rules.js.
import { LESSONS, lessonById, partById } from './lessons.js';
import { CONFIDENCE, asksConfidence, bestPoints, calibration, cleanAnswer, isBest, scoreAnswer, tally } from './quiz.js';
import * as draft from './draft-rules.js';
import * as room from './room-rules.js';

const ANSWER_SECONDS = 120;
const EXTRA_SECONDS = 30;
const ALL_IN_MS = 3000; // once everyone has answered, a moment to change their mind before the reveal

export default {
  name: 'Strategy Training',
  description: 'Learn, test and compete: strategy lessons for the whole team. Answer on your phone; the big screen shows how the room thinks.',
  minPlayers: 1,
  maxPlayers: 32,

  setup() {
    return {
      phase: 'pick',
      lessonId: LESSONS[0].id,
      partId: LESSONS[0].parts[0].id,
      deadline: null,
      scores: {},
      gained: {}, // points from the last reveal / round
      before: {}, // ranks before it, to show who moved up
      // quiz
      q: 0,
      cases: null, // Learn: the case numbers to run (null = all)
      answers: {}, // playerId -> answer, for the current question
      sure: {}, // playerId -> how sure they are (Learn's picks)
      best: {}, // playerId -> how many best answers
      history: [], // per question: { counts, answered, median, bestShare, calibration }
      draft: null, // the Showdown (draft-rules.js)
      room: null, // Learn's Strategy Room (room-rules.js)
    };
  },

  onJoin(ctx, player) {
    ctx.state.scores[player.id] ??= 0;
    if (isDraft(ctx.state)) draft.onJoin(ctx, player);
  },

  onDisconnect(ctx) {
    if (isDraft(ctx.state)) draft.onDisconnect(ctx);
    else if (inRoom(ctx.state)) room.onDisconnect(ctx);
    else maybeReveal(ctx);
  },

  actions: {
    lesson(ctx, player, payload) {
      if (player.isVip) pick(ctx, payload);
    },
    answer(ctx, player, payload) {
      const s = ctx.state;
      if (s.phase !== 'question') return { error: 'Answers are closed for this question.' };
      const answer = cleanAnswer(question(s), payload?.answer);
      if (answer === null) return { error: 'That isn’t a valid answer.' };
      s.answers[player.id] = answer; // you can change your mind until the reveal
      maybeReveal(ctx);
      return { ok: true };
    },
    sure(ctx, player, payload) {
      const s = ctx.state;
      if (s.phase !== 'question' || !asksConfidence(question(s))) return;
      if (!CONFIDENCE.includes(payload?.level)) return { error: 'Pick one of the levels.' };
      s.sure[player.id] = payload.level;
      maybeReveal(ctx);
      return { ok: true };
    },
    cases(ctx, player, payload) {
      if (player.isVip) pickCases(ctx, payload);
    },
    next(ctx, player, payload) {
      if (inRoom(ctx.state)) room.next(ctx, player, payload?.from); // the moderator (or the leader) moves it along
      else if (player.isVip) next(ctx, payload?.from);
    },
    finish(ctx, player) {
      if (player.isVip) finish(ctx);
    },
    // the Showdown: picklist, invite, assign, lock, shuffle
    ...Object.fromEntries(
      Object.entries(draft.actions).map(([name, fn]) => [name, (ctx, player, payload) => (isDraft(ctx.state) ? fn(ctx, player, payload) : undefined)]),
    ),
    // the Strategy Room: volunteer, call, ask, hear, reply
    ...Object.fromEntries(
      Object.entries(room.actions).map(([name, fn]) => [name, (ctx, player, payload) => (inRoom(ctx.state) ? fn(ctx, player, payload) : undefined)]),
    ),
  },

  // Buttons on the big screen.
  hostActions: {
    lesson(ctx, payload) {
      pick(ctx, payload);
    },
    next(ctx, payload) {
      if (inRoom(ctx.state)) room.next(ctx, null, payload?.from); // a backup for the moderator
      else next(ctx, payload?.from);
    },
    cases(ctx, payload) {
      pickCases(ctx, payload);
    },
    shuffle(ctx) {
      if (isDraft(ctx.state)) draft.hostActions.shuffle(ctx);
    },
    more(ctx) {
      const s = ctx.state;
      if (s.phase !== 'question' && s.phase !== 'plan' && s.phase !== 'prep' && s.phase !== 'select') return;
      s.deadline = Math.max(s.deadline, Date.now()) + EXTRA_SECONDS * 1000;
      ctx.timer('phase', s.deadline - Date.now(), () => (isDraft(s) ? draft.next(ctx) : reveal(ctx)));
    },
    finish(ctx) {
      finish(ctx);
    },
  },

  // The big screen sees counts only after the reveal, and never who picked what before it.
  hostView(ctx) {
    const s = ctx.state;
    const base = { phase: s.phase, step: stepKey(s), lessonId: s.lessonId, partId: s.partId, deadline: s.deadline };
    const ranks = rankMap(ctx);
    const players = ctx.players.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      connected: p.connected,
      score: s.scores[p.id] ?? 0,
      gained: s.gained[p.id] ?? null,
      rank: ranks[p.id],
      before: s.before[p.id] ?? null,
      done: s.phase === 'question' ? isDone(s, p.id) : null,
    }));
    if (s.phase === 'pick') return { ...base, players, cases: s.cases };
    if (isDraft(s)) return draft.hostView(ctx, { ...base, players });
    if (isRoom(s)) return room.hostView(ctx, base);
    const revealed = s.phase !== 'question';
    return {
      ...base,
      q: s.q,
      ...progress(s),
      players,
      answered: s.phase === 'question' ? ctx.players.filter((p) => isDone(s, p.id)).length : null,
      tally: revealed ? s.history[s.q] ?? null : null,
      history: s.phase === 'final' ? s.history.map(({ bestShare, answered }) => ({ bestShare, answered })) : null,
    };
  },

  playerView(ctx, me) {
    const s = ctx.state;
    const ranks = rankMap(ctx);
    const base = {
      phase: s.phase,
      step: stepKey(s),
      lessonId: s.lessonId,
      partId: s.partId,
      deadline: s.deadline,
      isVip: me.isVip,
      score: s.scores[me.id] ?? 0,
      rank: ranks[me.id] ?? null,
      players: ctx.players.length,
      gained: s.gained[me.id] ?? null,
    };
    if (s.phase === 'pick') return { ...base, cases: s.cases };
    if (isDraft(s)) return draft.playerView(ctx, me, base);
    if (isRoom(s)) return room.playerView(ctx, me, base);
    const revealed = s.phase === 'reveal' || s.phase === 'scores';
    return {
      ...base,
      q: s.q,
      ...progress(s),
      answer: s.answers[me.id] ?? null,
      sure: s.sure[me.id] ?? null,
      tally: revealed ? s.history[s.q] ?? null : null,
      best: s.best[me.id] ?? 0,
      asked: s.phase === 'final' ? s.history.filter(Boolean).length : progress(s).at - (revealed ? 0 : 1),
    };
  },
};

// ---------- shared ----------

const lesson = (s) => lessonById(s.lessonId);
const part = (s) => partById(lesson(s), s.partId);
const isDraft = (s) => part(s)?.kind === 'draft';
const isRoom = (s) => part(s)?.kind === 'room';
/** Learn's Strategy Room is running (past the picker). */
const inRoom = (s) => isRoom(s) && s.phase !== 'pick' && s.room != null;
const question = (s) => part(s).questions[s.q];
/** The questions this run covers, by index: all of them, or Learn's chosen cases. */
const runOrder = (s) =>
  part(s).questions.flatMap((q, i) => (s.cases && q.caseIndex != null && !s.cases.includes(q.caseIndex) ? [] : [i]));
/** Where the run is: question `at` of `of`, and whether it's the last. */
function progress(s) {
  const order = runOrder(s);
  const at = order.indexOf(s.q) + 1;
  return { at, of: order.length, last: at === order.length };
}
const nextQ = (s) => runOrder(s).find((i) => i > s.q);
/** A player is done with a question once they've answered, and said how sure they are if it asks. */
const isDone = (s, id) => id in s.answers && (!asksConfidence(question(s)) || id in s.sure);
/** Which screen we're on, so a double-tapped "next" (big screen and leader at once) only moves once. */
const stepKey = (s) =>
  inRoom(s) ? room.stepKey({ state: s }) : `${s.phase}:${isDraft(s) ? (s.phase === 'select' ? s.draft.pick : s.draft?.match ?? 0) : s.q}`;

function pick(ctx, payload) {
  const s = ctx.state;
  if (s.phase !== 'pick') return;
  const l = lessonById(payload?.lessonId) ?? lesson(s);
  const p = partById(l, payload?.partId) ?? l.parts[0];
  s.lessonId = l.id;
  s.partId = p.id;
}

/** Learn: run only some cases. `cases` is a list of case numbers (0-based); anything else means all of them. */
function pickCases(ctx, payload) {
  const s = ctx.state;
  if (s.phase !== 'pick' || !part(s)?.cases) return;
  const count = part(s).cases.length;
  const list = Array.isArray(payload?.cases) ? [...new Set(payload.cases)].filter((i) => Number.isInteger(i) && i >= 0 && i < count) : [];
  s.cases = list.length && list.length < count ? list.sort((a, b) => a - b) : null;
}

function next(ctx, from) {
  const s = ctx.state;
  if (from !== stepKey(s)) return;
  if (s.phase === 'pick') {
    if (isDraft(s)) return resetScores(ctx), draft.start(ctx);
    if (isRoom(s)) return room.start(ctx, s.cases ?? part(s).cases.map((_, i) => i));
    return startQuiz(ctx);
  }
  if (isDraft(s)) return draft.next(ctx);
  if (s.phase === 'question') return reveal(ctx);
  if (s.phase === 'reveal') {
    const q = question(s);
    if (part(s).leaderboard === 'case' && !q.lastInCase && nextQ(s) != null) return ask(ctx, nextQ(s));
    s.phase = 'scores';
  } else if (s.phase === 'scores') {
    if (nextQ(s) != null) ask(ctx, nextQ(s));
    else s.phase = 'final';
  }
}

function resetScores(ctx) {
  const s = ctx.state;
  for (const p of ctx.players) s.scores[p.id] = 0;
  Object.assign(s, { gained: {}, before: {}, best: {}, history: [] });
}

function reveal(ctx) {
  if (ctx.state.phase === 'question') revealAnswers(ctx);
}

/** Everyone still connected is done: reveal after a short pause (unless that changes). */
function maybeReveal(ctx) {
  const s = ctx.state;
  if (s.phase !== 'question') return;
  const allIn = () => {
    const online = ctx.players.filter((p) => p.connected);
    return online.length > 0 && online.every((p) => isDone(s, p.id));
  };
  if (!allIn()) return ctx.cancelTimer('allIn');
  ctx.timer('allIn', ALL_IN_MS, () => allIn() && reveal(ctx));
}

/** Back to the lobby, which shows who came out on top. */
function finish(ctx) {
  const s = ctx.state;
  if (s.phase !== 'final') return;
  const title = `${lesson(s).title} ${part(s).title}`;
  if (isDraft(s)) return ctx.end(draft.summary(ctx));
  const top = ranked(ctx)[0];
  ctx.end(top ? `${top.name} topped ${title} with ${top.score} points` : `${title} complete`);
}

/** Players by score, highest first, with ties sharing a rank (1, 2, 2, 4). */
function ranked(ctx) {
  const list = ctx.players
    .map((p) => ({ id: p.id, name: p.name, score: ctx.state.scores[p.id] ?? 0 }))
    .sort((a, b) => b.score - a.score);
  list.forEach((p, i) => (p.rank = i > 0 && p.score === list[i - 1].score ? list[i - 1].rank : i + 1));
  return list;
}

function rankMap(ctx) {
  return Object.fromEntries(ranked(ctx).map((p) => [p.id, p.rank]));
}

// ---------- Learn and Test ----------

function startQuiz(ctx) {
  const s = ctx.state;
  if (!part(s).cases) s.cases = null;
  resetScores(ctx);
  ask(ctx, runOrder(s)[0]);
}

function ask(ctx, q) {
  const s = ctx.state;
  Object.assign(s, { phase: 'question', q, answers: {}, sure: {}, deadline: Date.now() + ANSWER_SECONDS * 1000 });
  ctx.cancelTimer('allIn');
  ctx.timer('phase', ANSWER_SECONDS * 1000, () => reveal(ctx));
}

function revealAnswers(ctx) {
  const s = ctx.state;
  ctx.cancelTimer('phase');
  ctx.cancelTimer('allIn');
  const q = question(s);
  s.before = rankMap(ctx);
  s.gained = {};
  const given = [];
  const rated = [];
  let bestCount = 0;
  for (const [id, answer] of Object.entries(s.answers)) {
    if (!ctx.player(id)) continue;
    given.push(answer);
    if (id in s.sure) rated.push({ sure: s.sure[id], right: isBest(q, answer) });
    s.gained[id] = scoreAnswer(q, answer);
    s.scores[id] = (s.scores[id] ?? 0) + s.gained[id];
    if (isBest(q, answer)) {
      s.best[id] = (s.best[id] ?? 0) + 1;
      bestCount++;
    }
  }
  const t = tally(q, given);
  s.history[s.q] = {
    ...t,
    players: ctx.players.length,
    bestShare: t.answered ? bestCount / t.answered : 0,
    top: bestPoints(q),
    calibration: asksConfidence(q) ? calibration(rated) : null,
  };
  s.phase = 'reveal';
  s.deadline = null;
}
