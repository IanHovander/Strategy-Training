// Strategy Training: the room works through a lesson together, one question at a time.
// Everyone answers on their phone; the big screen shows how the room answered, the points each
// answer was worth, and a leaderboard after every question.
//
// Phases: pick (the leader chooses the lesson) -> question -> reveal -> scores -> question ... -> final
import { LESSONS, bestPoints, lessonById } from './lessons.js';

const ANSWER_SECONDS = 120;
const EXTRA_SECONDS = 30;
const ALL_IN_MS = 3000; // once everyone has answered, a moment to change their mind before the reveal

export default {
  name: 'Strategy Training',
  description: 'Work through a strategy lesson as a team. Answer on your phone, see how the room voted, and climb the leaderboard.',
  minPlayers: 1,
  maxPlayers: 32,

  setup() {
    return {
      phase: 'pick',
      lessonId: LESSONS[0].id,
      q: 0,
      deadline: null,
      answers: {}, // playerId -> choice index, for the current question
      scores: {},
      gained: {}, // points from the last revealed question
      before: {}, // ranks before the last question, to show who moved up
      best: {}, // playerId -> how many best answers
      history: [], // per question: { counts, answered, players, bestShare }
    };
  },

  // Late arrivals join in with 0 points.
  onJoin(ctx, player) {
    ctx.state.scores[player.id] ??= 0;
  },

  onDisconnect(ctx) {
    maybeReveal(ctx);
  },

  actions: {
    lesson(ctx, player, payload) {
      if (player.isVip) pickLesson(ctx, payload?.lessonId);
    },
    answer(ctx, player, payload) {
      const s = ctx.state;
      const i = payload?.choice;
      if (s.phase !== 'question') return { error: 'Answers are closed for this question.' };
      if (!Number.isInteger(i) || i < 0 || i >= question(s).choices.length) return { error: 'Pick one of the answers.' };
      s.answers[player.id] = i; // you can change your mind until the reveal
      maybeReveal(ctx);
      return { ok: true };
    },
    next(ctx, player, payload) {
      if (player.isVip) next(ctx, payload?.from);
    },
    finish(ctx, player) {
      if (player.isVip) finish(ctx);
    },
  },

  // Buttons on the big screen.
  hostActions: {
    lesson(ctx, payload) {
      pickLesson(ctx, payload?.lessonId);
    },
    next(ctx, payload) {
      next(ctx, payload?.from);
    },
    more(ctx) {
      const s = ctx.state;
      if (s.phase !== 'question') return;
      s.deadline = Math.max(s.deadline, Date.now()) + EXTRA_SECONDS * 1000;
      ctx.timer('phase', s.deadline - Date.now(), () => reveal(ctx));
    },
    finish(ctx) {
      finish(ctx);
    },
  },

  // The big screen sees counts only after the reveal, and never who picked what.
  hostView(ctx) {
    const s = ctx.state;
    const open = s.phase === 'question';
    const ranks = rankMap(ctx);
    return {
      phase: s.phase,
      step: stepKey(s),
      lessonId: s.lessonId,
      q: s.q,
      deadline: s.deadline,
      answered: open ? answeredCount(ctx) : null,
      counts: open || s.phase === 'pick' ? null : s.history[s.q]?.counts ?? null,
      history: s.phase === 'final' ? s.history.map(({ bestShare, answered }) => ({ bestShare, answered })) : null,
      players: ctx.players.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        connected: p.connected,
        done: open ? p.id in s.answers : null,
        score: s.scores[p.id] ?? 0,
        gained: s.gained[p.id] ?? null,
        rank: ranks[p.id],
        before: s.before[p.id] ?? null,
        best: s.best[p.id] ?? 0,
      })),
    };
  },

  playerView(ctx, me) {
    const s = ctx.state;
    const ranks = rankMap(ctx);
    const revealed = s.phase === 'reveal' || s.phase === 'scores';
    return {
      phase: s.phase,
      step: stepKey(s),
      lessonId: s.lessonId,
      q: s.q,
      deadline: s.deadline,
      isVip: me.isVip,
      choice: s.answers[me.id] ?? null,
      counts: revealed ? s.history[s.q]?.counts ?? null : null,
      gained: revealed ? s.gained[me.id] ?? null : null,
      score: s.scores[me.id] ?? 0,
      rank: ranks[me.id] ?? null,
      of: ctx.players.length,
      best: s.best[me.id] ?? 0,
      asked: s.phase === 'final' ? s.history.length : s.q + (revealed ? 1 : 0),
    };
  },
};

// ---------- the rules ----------

const lesson = (s) => lessonById(s.lessonId);
const question = (s) => lesson(s).questions[s.q];
/** Which screen we're on, so a double-tapped "next" (big screen and leader at once) only moves once. */
const stepKey = (s) => `${s.phase}:${s.q}`;

function pickLesson(ctx, lessonId) {
  if (ctx.state.phase === 'pick' && lessonById(lessonId)) ctx.state.lessonId = lessonId;
}

function next(ctx, from) {
  const s = ctx.state;
  if (from !== stepKey(s)) return;
  if (s.phase === 'pick') startLesson(ctx);
  else if (s.phase === 'question') reveal(ctx);
  else if (s.phase === 'reveal') s.phase = 'scores';
  else if (s.phase === 'scores') {
    if (s.q + 1 < lesson(s).questions.length) ask(ctx, s.q + 1);
    else s.phase = 'final';
  }
}

/** Back to the lobby, which shows who came out on top. */
function finish(ctx) {
  if (ctx.state.phase !== 'final') return;
  const top = ranked(ctx)[0];
  ctx.end(top ? `${top.name} topped ${lesson(ctx.state).title} with ${top.score} points` : 'Lesson complete');
}

function startLesson(ctx) {
  const s = ctx.state;
  for (const p of ctx.players) s.scores[p.id] = 0;
  Object.assign(s, { gained: {}, before: {}, best: {}, history: [] });
  ask(ctx, 0);
}

function ask(ctx, q) {
  const s = ctx.state;
  Object.assign(s, { phase: 'question', q, answers: {}, deadline: Date.now() + ANSWER_SECONDS * 1000 });
  ctx.cancelTimer('allIn');
  ctx.timer('phase', ANSWER_SECONDS * 1000, () => reveal(ctx));
}

function reveal(ctx) {
  const s = ctx.state;
  if (s.phase !== 'question') return;
  ctx.cancelTimer('phase');
  ctx.cancelTimer('allIn');
  const { choices } = question(s);
  const top = bestPoints(question(s));
  s.before = rankMap(ctx);
  s.gained = {};
  const counts = choices.map(() => 0);
  let bestCount = 0;
  for (const [id, i] of Object.entries(s.answers)) {
    if (!ctx.player(id)) continue;
    counts[i]++;
    s.gained[id] = choices[i].points;
    s.scores[id] = (s.scores[id] ?? 0) + choices[i].points;
    if (choices[i].points === top) {
      s.best[id] = (s.best[id] ?? 0) + 1;
      bestCount++;
    }
  }
  const answered = counts.reduce((a, b) => a + b, 0);
  s.history[s.q] = { counts, answered, players: ctx.players.length, bestShare: answered ? bestCount / answered : 0 };
  s.phase = 'reveal';
  s.deadline = null;
}

function answeredCount(ctx) {
  return ctx.players.filter((p) => p.id in ctx.state.answers).length;
}

/** Everyone still connected has answered: reveal after a short pause (unless that changes). */
function maybeReveal(ctx) {
  const s = ctx.state;
  if (s.phase !== 'question') return;
  const online = ctx.players.filter((p) => p.connected);
  const allIn = online.length > 0 && online.every((p) => p.id in s.answers);
  if (!allIn) return ctx.cancelTimer('allIn');
  ctx.timer('allIn', ALL_IN_MS, () => {
    const still = ctx.players.filter((p) => p.connected);
    if (still.every((p) => p.id in s.answers)) reveal(ctx);
  });
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
