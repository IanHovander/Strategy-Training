// Strategy Training: the room works through a lesson together.
//
// The leader (big screen or the leader's phone) picks a lesson and a part:
//   Learn and Test (kind 'quiz'): everyone answers each question on their phone; the big screen shows how the room
//     answered and the points each answer earned. Phases: question -> reveal -> (scores) -> ... -> final.
//     Learn shows the leaderboard after each case, Test after every question.
//   Showdown: players are split into alliances of three that play each other. Each round everyone picks their
//     robot's plan, predicts the opposing alliance's main plan, and answers the round's key question.
//     Phases: teams -> plan -> result -> standings -> ... -> final.
import { LESSONS, lessonById, partById } from './lessons.js';
import { bestPoints, cleanAnswer, isBest, scoreAnswer, tally } from './quiz.js';
import { PLAN_IDS, matchOdds, mostUsed, playMatch } from './showdown.js';

const ANSWER_SECONDS = 120;
const PLAN_SECONDS = 150;
const EXTRA_SECONDS = 30;
const ALL_IN_MS = 3000; // once everyone has answered, a moment to change their mind before the reveal
const TEAM_NAMES = ['Gold', 'Steel', 'Iron', 'Chrome', 'Cobalt', 'Titan', 'Onyx', 'Ember', 'Nova', 'Volt', 'Apex'];
const MATCH_WIN = 20;
const GOOD_CALL = 20; // a correct prediction, a correct key answer

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
      answers: {}, // playerId -> answer, for the current question
      best: {}, // playerId -> how many best answers
      history: [], // per question: { counts, answered, median, bestShare }
      // showdown
      round: 0,
      teams: [], // [{ id, name, members: [playerId] }]
      picks: {}, // playerId -> { plan, predict, key }, for the current round
      results: [], // per pairing, for the current round
      teamScores: {}, // teamId -> alliance points
      calls: {}, // playerId -> correct predictions + key answers
    };
  },

  onJoin(ctx, player) {
    const s = ctx.state;
    s.scores[player.id] ??= 0;
    if (s.teams.length && !teamOf(s, player.id)) seat(s, player.id);
  },

  onDisconnect(ctx) {
    maybeReveal(ctx);
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
    pick(ctx, player, payload) {
      const s = ctx.state;
      if (s.phase !== 'plan') return { error: 'Plans are locked for this round.' };
      if (!teamOf(s, player.id)) return { error: 'You’re not on an alliance yet.' };
      if (!payload || typeof payload !== 'object') return { error: 'Pick one of the options.' };
      const mine = (s.picks[player.id] ??= { plan: null, predict: null, key: null });
      const r = round(s);
      if ('plan' in payload && PLAN_IDS.includes(payload.plan)) mine.plan = payload.plan;
      else if ('predict' in payload && PLAN_IDS.includes(payload.predict)) mine.predict = payload.predict;
      else if ('key' in payload && Number.isInteger(payload.key) && payload.key >= 0 && payload.key < r.key.choices.length) mine.key = payload.key;
      else return { error: 'Pick one of the options.' };
      maybeReveal(ctx);
      return { ok: true };
    },
    next(ctx, player, payload) {
      if (player.isVip) next(ctx, payload?.from);
    },
    shuffle(ctx, player) {
      if (player.isVip) shuffle(ctx);
    },
    finish(ctx, player) {
      if (player.isVip) finish(ctx);
    },
  },

  // Buttons on the big screen.
  hostActions: {
    lesson(ctx, payload) {
      pick(ctx, payload);
    },
    next(ctx, payload) {
      next(ctx, payload?.from);
    },
    shuffle(ctx) {
      shuffle(ctx);
    },
    more(ctx) {
      const s = ctx.state;
      if (s.phase !== 'question' && s.phase !== 'plan') return;
      s.deadline = Math.max(s.deadline, Date.now()) + EXTRA_SECONDS * 1000;
      ctx.timer('phase', s.deadline - Date.now(), () => reveal(ctx));
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
      teamId: teamOf(s, p.id)?.id ?? null,
      done: s.phase === 'question' ? p.id in s.answers : s.phase === 'plan' ? isLocked(s, p.id) : null,
    }));
    if (s.phase === 'pick') return { ...base, players };
    if (isShowdown(s)) {
      return {
        ...base,
        round: s.round,
        players,
        teams: teamList(s),
        pairs: s.phase === 'plan' ? pairings(s).map(([a, b]) => [a, b]) : null,
        results: s.phase === 'result' || s.phase === 'standings' ? s.results : null,
        history: s.phase === 'final' ? s.history : null,
      };
    }
    const revealed = s.phase !== 'question';
    return {
      ...base,
      q: s.q,
      players,
      answered: s.phase === 'question' ? ctx.players.filter((p) => p.id in s.answers).length : null,
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
      of: ctx.players.length,
      gained: s.gained[me.id] ?? null,
    };
    if (s.phase === 'pick') return base;
    if (isShowdown(s)) {
      const team = teamOf(s, me.id);
      const pair = team && pairings(s).find((p) => p.includes(team.id));
      const opponent = pair ? pair.find((id) => id !== team.id) : null;
      return {
        ...base,
        round: s.round,
        pick: s.picks[me.id] ?? null,
        team: team && {
          id: team.id,
          name: team.name,
          score: s.teamScores[team.id] ?? 0,
          // teammates see each other's plans and predictions, so they can coordinate
          members: team.members.map((id) => ({
            id,
            name: ctx.player(id)?.name ?? '?',
            color: ctx.player(id)?.color ?? '#ccc',
            plan: s.picks[id]?.plan ?? null,
            predict: s.picks[id]?.predict ?? null,
          })),
        },
        opponent: opponent && teamName(s, opponent),
        result: s.phase === 'result' || s.phase === 'standings' ? s.results.find((r) => r.a.teamId === team?.id || r.b.teamId === team?.id) ?? null : null,
        teamRank: team ? teamRanks(s)[team.id] : null,
        teams: s.teams.length,
        calls: s.calls[me.id] ?? 0,
      };
    }
    const revealed = s.phase === 'reveal' || s.phase === 'scores';
    return {
      ...base,
      q: s.q,
      answer: s.answers[me.id] ?? null,
      tally: revealed ? s.history[s.q] ?? null : null,
      best: s.best[me.id] ?? 0,
      asked: s.phase === 'final' ? s.history.length : s.q + (revealed ? 1 : 0),
    };
  },
};

// ---------- shared ----------

const lesson = (s) => lessonById(s.lessonId);
const part = (s) => partById(lesson(s), s.partId);
const isShowdown = (s) => part(s)?.kind === 'showdown';
const question = (s) => part(s).questions[s.q];
const round = (s) => part(s).rounds[s.round];
/** Which screen we're on, so a double-tapped "next" (big screen and leader at once) only moves once. */
const stepKey = (s) => `${s.phase}:${isShowdown(s) ? s.round : s.q}`;

function pick(ctx, payload) {
  const s = ctx.state;
  if (s.phase !== 'pick') return;
  const l = lessonById(payload?.lessonId) ?? lesson(s);
  const p = partById(l, payload?.partId) ?? l.parts[0];
  s.lessonId = l.id;
  s.partId = p.id;
}

function next(ctx, from) {
  const s = ctx.state;
  if (from !== stepKey(s)) return;
  if (s.phase === 'pick') return isShowdown(s) ? startShowdown(ctx) : startQuiz(ctx);
  if (s.phase === 'question' || s.phase === 'plan') return reveal(ctx);
  if (s.phase === 'reveal') {
    const q = question(s);
    const last = s.q + 1 >= part(s).questions.length;
    if (part(s).leaderboard === 'case' && !q.lastInCase && !last) return ask(ctx, s.q + 1);
    s.phase = 'scores';
  } else if (s.phase === 'scores') {
    if (s.q + 1 < part(s).questions.length) ask(ctx, s.q + 1);
    else s.phase = 'final';
  } else if (s.phase === 'teams') {
    plan(ctx, 0);
  } else if (s.phase === 'result') {
    s.phase = 'standings';
  } else if (s.phase === 'standings') {
    if (s.round + 1 < part(s).rounds.length) plan(ctx, s.round + 1);
    else s.phase = 'final';
  }
}

function resetScores(ctx) {
  const s = ctx.state;
  for (const p of ctx.players) s.scores[p.id] = 0;
  Object.assign(s, { gained: {}, before: {}, best: {}, history: [], teamScores: {}, calls: {} });
}

/** Moving on from a question or a plan: the reveal. */
function reveal(ctx) {
  const s = ctx.state;
  if (s.phase === 'question') revealAnswers(ctx);
  else if (s.phase === 'plan') playRound(ctx);
}

/** Everyone still connected is done: reveal after a short pause (unless that changes). */
function maybeReveal(ctx) {
  const s = ctx.state;
  if (s.phase !== 'question' && s.phase !== 'plan') return;
  const done = (id) => (s.phase === 'question' ? id in s.answers : isLocked(s, id));
  const allIn = () => {
    const online = ctx.players.filter((p) => p.connected);
    return online.length > 0 && online.every((p) => done(p.id));
  };
  if (!allIn()) return ctx.cancelTimer('allIn');
  ctx.timer('allIn', ALL_IN_MS, () => allIn() && reveal(ctx));
}

/** Back to the lobby, which shows who came out on top. */
function finish(ctx) {
  const s = ctx.state;
  if (s.phase !== 'final') return;
  const title = `${lesson(s).title} ${part(s).title}`;
  if (isShowdown(s)) {
    const top = teamList(s).sort((a, b) => b.score - a.score)[0];
    return ctx.end(top ? `Alliance ${top.name} won the ${title} with ${top.score} points` : `${title} complete`);
  }
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
  resetScores(ctx);
  ask(ctx, 0);
}

function ask(ctx, q) {
  const s = ctx.state;
  Object.assign(s, { phase: 'question', q, answers: {}, deadline: Date.now() + ANSWER_SECONDS * 1000 });
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
  let bestCount = 0;
  for (const [id, answer] of Object.entries(s.answers)) {
    if (!ctx.player(id)) continue;
    given.push(answer);
    s.gained[id] = scoreAnswer(q, answer);
    s.scores[id] = (s.scores[id] ?? 0) + s.gained[id];
    if (isBest(q, answer)) {
      s.best[id] = (s.best[id] ?? 0) + 1;
      bestCount++;
    }
  }
  const t = tally(q, given);
  s.history[s.q] = { ...t, players: ctx.players.length, bestShare: t.answered ? bestCount / t.answered : 0, top: bestPoints(q) };
  s.phase = 'reveal';
  s.deadline = null;
}

// ---------- Showdown ----------

function startShowdown(ctx) {
  resetScores(ctx);
  deal(ctx);
  ctx.state.phase = 'teams';
}

/** Deal everyone into new alliances (before the first round only). */
function shuffle(ctx) {
  if (ctx.state.phase === 'teams') deal(ctx);
}

/** Split the connected players into alliances of three; sizes differ by at most one (7 players: 3, 2, 2). */
function deal(ctx) {
  const s = ctx.state;
  const ids = ctx.shuffle(ctx.players.filter((p) => p.connected).map((p) => p.id));
  const count = Math.max(1, Math.ceil(ids.length / 3));
  s.teams = Array.from({ length: count }, (_, i) => ({ id: `t${i + 1}`, name: teamLabel(i), members: [] }));
  ids.forEach((id, i) => s.teams[i % count].members.push(id));
}

/** A late arrival joins the smallest alliance with a free seat, or starts a new one. */
function seat(s, playerId) {
  const open = s.teams.filter((t) => t.members.length < 3).sort((a, b) => a.members.length - b.members.length)[0];
  if (open) open.members.push(playerId);
  else s.teams.push({ id: `t${s.teams.length + 1}`, name: teamLabel(s.teams.length), members: [playerId] });
}

const teamLabel = (i) => TEAM_NAMES[i % TEAM_NAMES.length] + (i >= TEAM_NAMES.length ? ` ${Math.floor(i / TEAM_NAMES.length) + 1}` : '');

const teamOf = (s, playerId) => s.teams.find((t) => t.members.includes(playerId)) ?? null;
const teamName = (s, id) => (id === 'house' ? 'House Bots' : s.teams.find((t) => t.id === id)?.name ?? '?');
const isLocked = (s, id) => {
  const p = s.picks[id];
  return !!(p && p.plan && p.predict && p.key != null);
};

function teamList(s) {
  return s.teams.map((t) => ({ id: t.id, name: t.name, members: t.members, score: s.teamScores[t.id] ?? 0 }));
}

function teamRanks(s) {
  const list = teamList(s).sort((a, b) => b.score - a.score);
  const ranks = {};
  list.forEach((t, i) => (ranks[t.id] = i > 0 && t.score === list[i - 1].score ? ranks[list[i - 1].id] : i + 1));
  return ranks;
}

/**
 * This round's matches, rotating so alliances meet different opponents: [[teamId, teamId | 'house']].
 * An odd number of alliances means one of them plays the House alliance.
 */
function pairings(s) {
  const ids = s.teams.map((t) => t.id);
  if (ids.length % 2) ids.push('house');
  if (ids.length < 2) return [];
  const [first, ...rest] = ids;
  const shift = s.round % rest.length;
  const order = [first, ...rest.slice(shift), ...rest.slice(0, shift)];
  const pairs = [];
  for (let i = 0; i < order.length / 2; i++) pairs.push([order[i], order[order.length - 1 - i]]);
  return pairs.map((p) => (p[0] === 'house' ? [p[1], p[0]] : p));
}

function plan(ctx, r) {
  const s = ctx.state;
  Object.assign(s, { phase: 'plan', round: r, picks: {}, results: [], deadline: Date.now() + PLAN_SECONDS * 1000 });
  ctx.cancelTimer('allIn');
  ctx.timer('phase', PLAN_SECONDS * 1000, () => reveal(ctx));
}

/** An alliance's three plans, in seat order: its players' picks, then empty seats on the round's auto plan. */
function plansOf(s, teamId) {
  const r = round(s);
  if (teamId === 'house') return [...r.house];
  const team = s.teams.find((t) => t.id === teamId);
  const plans = team.members.map((id) => s.picks[id]?.plan ?? r.autoPlan);
  while (plans.length < 3) plans.push(r.autoPlan);
  return plans.slice(0, 3);
}

function playRound(ctx) {
  const s = ctx.state;
  ctx.cancelTimer('phase');
  ctx.cancelTimer('allIn');
  const r = round(s);
  s.before = rankMap(ctx);
  s.gained = {};
  const results = [];
  for (const [aId, bId] of pairings(s)) {
    const plansA = plansOf(s, aId);
    const plansB = plansOf(s, bId);
    const odds = matchOdds(r, plansA, plansB);
    const [scoreA, scoreB] = playMatch(odds);
    const side = (teamId, plans, o, score, other, otherPlans) => {
      const decision = Math.round(100 * (o.win + o.tie / 2));
      const bonus = r.bonus ? Math.round(r.bonus.points * o.bonus) : 0;
      const match = score > other ? MATCH_WIN : score === other ? MATCH_WIN / 2 : 0;
      return {
        teamId,
        name: teamName(s, teamId),
        plans,
        seats: teamId === 'house' ? [] : s.teams.find((t) => t.id === teamId).members,
        win: o.win,
        tie: o.tie,
        mean: o.mean,
        bonusChance: o.bonus,
        score,
        points: { decision, bonus, match, total: decision + bonus + match },
        theirMain: mostUsed(otherPlans),
      };
    };
    results.push({
      a: side(aId, plansA, odds.a, scoreA, scoreB, plansB),
      b: side(bId, plansB, odds.b, scoreB, scoreA, plansA),
    });
  }
  for (const res of results) {
    for (const sideRes of [res.a, res.b]) {
      if (sideRes.teamId === 'house') continue;
      s.teamScores[sideRes.teamId] = (s.teamScores[sideRes.teamId] ?? 0) + sideRes.points.total;
      for (const id of sideRes.seats) {
        const mine = s.picks[id] ?? {};
        const predicted = mine.predict != null && sideRes.theirMain.includes(mine.predict);
        const keyed = mine.key === r.key.answer;
        const calls = (predicted ? 1 : 0) + (keyed ? 1 : 0);
        s.calls[id] = (s.calls[id] ?? 0) + calls;
        s.gained[id] = sideRes.points.total + calls * GOOD_CALL;
        s.scores[id] = (s.scores[id] ?? 0) + s.gained[id];
      }
    }
  }
  const picks = Object.values(s.picks);
  s.history[s.round] = {
    keyShare: picks.length ? picks.filter((p) => p.key === r.key.answer).length / picks.length : 0,
    plans: Object.fromEntries(PLAN_IDS.map((id) => [id, picks.filter((p) => p.plan === id).length])),
  };
  s.results = results;
  s.phase = 'result';
  s.deadline = null;
}
