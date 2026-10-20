// Alliance Selection: the rules for Part 3 (rules.js hands over to these when the part's kind is 'draft').
//
// The room splits into two teams, each with a captain. Phases:
//   teams    the split (the big screen or leader can shuffle)
//   scout    everyone studies the robot pool and stars the robots they want (only their team sees the stars)
//   draft    serpentine picks; the captain picks, teammates advise, the other team guesses the pick
//   plan     the captain sets each robot's plan, teammates suggest, everyone predicts the other side's defenders
//   result   the match plays; best of three
//   final    the series winner, and what the scouting hid
//
// State lives in ctx.state.draft; scores in ctx.state.scores like every part.
import { DRAFT } from './lesson1-draft.js';
import { matchOdds, playMatch, robotPlans } from './alliance.js';

const SCOUT_SECONDS = 180;
const PICK_SECONDS = 60;
const PLAN_SECONDS = 120;
const ALL_IN_MS = 3000;
const GOOD_CALL = 20; // a correct guess of their pick, a correct defender count
const MATCH_POINTS = 60; // × your alliance's win chance: points follow the decision more than the dice
const MATCH_WIN = 30;
const SERIES_WIN = 60;
const MAX_MATCHES = 5; // ties don't count, so a series could run long

export const TEAMS = [
  { id: 'red', name: 'Red' },
  { id: 'blue', name: 'Blue' },
];

const robot = (id) => DRAFT.robots.find((r) => r.id === id) ?? null;
const d = (ctx) => ctx.state.draft;

/** Who's on which team: index 0 (Red), 1 (Blue), or -1. */
const teamIndex = (ctx, playerId) => d(ctx)?.teams.findIndex((t) => t.members.includes(playerId)) ?? -1;

/** The captain: the chosen one while connected, otherwise the first connected teammate. */
export function captainOf(ctx, i) {
  const team = d(ctx).teams[i];
  const online = (id) => ctx.player(id)?.connected;
  if (online(team.captainId)) return team.captainId;
  return team.members.find(online) ?? team.captainId;
}

/** Which team picks now (draft phase). */
const turn = (ctx) => (d(ctx).first + DRAFT.order[d(ctx).pick]) % 2;
const alliance = (ctx, i) => d(ctx).picks.filter((p) => p.team === i).map((p) => p.robotId);

export function start(ctx) {
  ctx.state.draft = {
    teams: [],
    first: Math.random() < 0.5 ? 0 : 1, // the coin flip for first pick
    stars: {}, // playerId -> [robotId]: advice, seen only by their team
    pick: 0,
    picks: [], // [{ team, robotId, auto }]
    guesses: {}, // playerId -> robotId, for the current pick (the other team guesses)
    match: 0,
    lineups: [{}, {}], // per team: robotId -> plan, for the current match
    locked: [false, false],
    suggestions: {}, // playerId -> { robotId: plan }
    predictions: {}, // playerId -> how many defenders the other side will play
    results: [], // per match
    wins: [0, 0],
  };
  deal(ctx);
  ctx.state.phase = 'teams';
}

/** Split the connected players into two teams, as even as possible, and choose captains at random. */
function deal(ctx) {
  const ids = ctx.shuffle(ctx.players.filter((p) => p.connected).map((p) => p.id));
  d(ctx).teams = TEAMS.map((t, i) => {
    const members = ids.filter((_, k) => k % 2 === i);
    return { ...t, members, captainId: members[0] ?? null };
  });
}

/** A late arrival joins the smaller team (and captains it if it was empty). */
export function onJoin(ctx, player) {
  const draft = d(ctx);
  if (!draft || teamIndex(ctx, player.id) >= 0) return;
  const team = draft.teams[0].members.length <= draft.teams[1].members.length ? draft.teams[0] : draft.teams[1];
  team.members.push(player.id);
  team.captainId ??= player.id;
}

/** A captain who dropped hands over to a teammate; don't wait on a team with nobody left. */
export function onDisconnect(ctx) {
  if (d(ctx) && ctx.state.phase === 'plan') maybePlay(ctx);
}

// ---------- moving between phases ----------

export function next(ctx) {
  const s = ctx.state;
  if (s.phase === 'teams') return scout(ctx);
  if (s.phase === 'scout') return startPick(ctx);
  if (s.phase === 'draft') return autoPick(ctx);
  if (s.phase === 'plan') return play(ctx);
  if (s.phase === 'result') {
    const done = d(ctx).wins.some((w) => w >= 2) || d(ctx).match + 1 >= MAX_MATCHES;
    if (done) return finishSeries(ctx);
    return plan(ctx, d(ctx).match + 1);
  }
}

function scout(ctx) {
  ctx.state.phase = 'scout';
  ctx.state.deadline = Date.now() + SCOUT_SECONDS * 1000;
  ctx.timer('phase', SCOUT_SECONDS * 1000, () => startPick(ctx));
}

function startPick(ctx) {
  const s = ctx.state;
  s.phase = 'draft';
  d(ctx).guesses = {};
  s.deadline = Date.now() + PICK_SECONDS * 1000;
  ctx.timer('phase', PICK_SECONDS * 1000, () => autoPick(ctx));
}

/** Time's up (or the big screen moved on): the team's most-starred robot, else the best one left. */
function autoPick(ctx) {
  const i = turn(ctx);
  const left = DRAFT.robots.filter((r) => !d(ctx).picks.some((p) => p.robotId === r.id));
  const stars = (r) => d(ctx).teams[i].members.filter((id) => d(ctx).stars[id]?.includes(r.id)).length;
  const choice = [...left].sort((a, b) => stars(b) - stars(a) || left.indexOf(a) - left.indexOf(b))[0];
  takePick(ctx, choice.id, true);
}

function takePick(ctx, robotId, auto = false) {
  const draft = d(ctx);
  const i = turn(ctx);
  draft.picks.push({ team: i, robotId, auto });
  // the other team's good guesses
  for (const id of draft.teams[1 - i].members) {
    if (draft.guesses[id] === robotId) {
      ctx.state.scores[id] = (ctx.state.scores[id] ?? 0) + GOOD_CALL;
      draft.calls = { ...(draft.calls ?? {}), [id]: (draft.calls?.[id] ?? 0) + 1 };
    }
  }
  draft.lastGuess = { pick: draft.pick, robotId, right: draft.teams[1 - i].members.filter((id) => draft.guesses[id] === robotId).length, guessed: Object.keys(draft.guesses).length };
  draft.pick++;
  if (draft.pick < DRAFT.order.length) return startPick(ctx);
  // the draft is done: every robot starts on the plan its scouting suggests (never its true best: that's for players to find)
  draft.lineups = [0, 1].map((t) => Object.fromEntries(alliance(ctx, t).map((id) => [id, robot(id).start])));
  plan(ctx, 0);
}

function plan(ctx, m) {
  const s = ctx.state;
  const draft = d(ctx);
  Object.assign(draft, { match: m, locked: [false, false], suggestions: {}, predictions: {} });
  s.phase = 'plan';
  s.deadline = Date.now() + PLAN_SECONDS * 1000;
  ctx.cancelTimer('allIn');
  ctx.timer('phase', PLAN_SECONDS * 1000, () => play(ctx));
}

/** Both captains have locked their lineups: play after a short pause. */
function maybePlay(ctx) {
  const draft = d(ctx);
  if (ctx.state.phase !== 'plan') return;
  const ready = draft.locked.every((locked, i) => locked || !draft.teams[i].members.some((id) => ctx.player(id)?.connected));
  if (!ready) return ctx.cancelTimer('allIn');
  ctx.timer('allIn', ALL_IN_MS, () => maybeStillReady(ctx));
}
function maybeStillReady(ctx) {
  const draft = d(ctx);
  if (draft.locked.every((locked, i) => locked || !draft.teams[i].members.some((id) => ctx.player(id)?.connected))) play(ctx);
}

function play(ctx) {
  const s = ctx.state;
  const draft = d(ctx);
  if (s.phase !== 'plan') return;
  ctx.cancelTimer('phase');
  ctx.cancelTimer('allIn');
  const side = (i) => {
    const ids = alliance(ctx, i);
    return { robots: ids.map(robot), plans: ids.map((id) => draft.lineups[i][id]) };
  };
  const odds = matchOdds(DRAFT.field, side(0), side(1));
  const scores = playMatch(odds);
  const winner = scores[0] > scores[1] ? 0 : scores[1] > scores[0] ? 1 : null;
  if (winner !== null) draft.wins[winner]++;
  s.before = rankMap(ctx);
  s.gained = {};
  const chances = [odds.a.win + odds.a.tie / 2, odds.b.win + odds.b.tie / 2];
  const defenders = [0, 1].map((i) => Object.values(draft.lineups[i]).filter((p) => p === 'defend').length);
  draft.teams.forEach((team, i) => {
    for (const id of team.members) {
      const predicted = draft.predictions[id] === defenders[1 - i];
      if (predicted) draft.calls = { ...(draft.calls ?? {}), [id]: (draft.calls?.[id] ?? 0) + 1 };
      const gained = Math.round(MATCH_POINTS * chances[i]) + (winner === i ? MATCH_WIN : winner === null ? MATCH_WIN / 2 : 0) + (predicted ? GOOD_CALL : 0);
      s.gained[id] = gained;
      s.scores[id] = (s.scores[id] ?? 0) + gained;
    }
  });
  draft.results.push({
    lineups: [0, 1].map((i) => alliance(ctx, i).map((id) => ({ robotId: id, plan: draft.lineups[i][id] }))),
    chances,
    means: [odds.a.mean, odds.b.mean],
    scores,
    winner,
    defenders,
  });
  s.phase = 'result';
  s.deadline = null;
}

function finishSeries(ctx) {
  const draft = d(ctx);
  const [r, b] = draft.wins;
  const champ = r > b ? 0 : b > r ? 1 : null;
  if (champ !== null) for (const id of draft.teams[champ].members) ctx.state.scores[id] = (ctx.state.scores[id] ?? 0) + SERIES_WIN;
  draft.champion = champ;
  ctx.state.phase = 'final';
  ctx.state.deadline = null;
}

export function summary(ctx) {
  const draft = d(ctx);
  if (draft.champion == null) return `Alliance Selection ended in a draw, ${draft.wins.join('–')}`;
  return `${TEAMS[draft.champion].name} won Alliance Selection, ${Math.max(...draft.wins)}–${Math.min(...draft.wins)}`;
}

// ---------- actions from phones ----------

const err = (error) => ({ error });

export const actions = {
  /** Advice: star a robot (anyone, while scouting or drafting). Only your team sees stars. */
  star(ctx, player, payload) {
    const s = ctx.state;
    if (s.phase !== 'scout' && s.phase !== 'draft') return err('Scouting is over.');
    if (!robot(payload?.robotId)) return err('Pick a robot.');
    const mine = new Set(d(ctx).stars[player.id] ?? []);
    mine.has(payload.robotId) ? mine.delete(payload.robotId) : mine.add(payload.robotId);
    d(ctx).stars[player.id] = [...mine];
    return { ok: true };
  },
  /** The captain's pick, on their team's turn. */
  draftPick(ctx, player, payload) {
    if (ctx.state.phase !== 'draft') return err('It’s not draft time.');
    const i = turn(ctx);
    if (captainOf(ctx, i) !== player.id) return err('Only the picking team’s captain can pick.');
    const r = robot(payload?.robotId);
    if (!r || d(ctx).picks.some((p) => p.robotId === r.id)) return err('That robot is taken.');
    takePick(ctx, r.id);
    return { ok: true };
  },
  /** The other team guesses the pick. */
  guess(ctx, player, payload) {
    if (ctx.state.phase !== 'draft') return err('It’s not draft time.');
    const mine = teamIndex(ctx, player.id);
    if (mine < 0 || mine === turn(ctx)) return err('Guess while the other team picks.');
    const r = robot(payload?.robotId);
    if (!r || d(ctx).picks.some((p) => p.robotId === r.id)) return err('That robot is taken.');
    d(ctx).guesses[player.id] = r.id;
    return { ok: true };
  },
  /** The captain sets one robot's plan; a teammate's tap is a suggestion. */
  lineup(ctx, player, payload) {
    if (ctx.state.phase !== 'plan') return err('Lineups are locked.');
    const i = teamIndex(ctx, player.id);
    if (i < 0) return err('You’re not on a team.');
    const id = payload?.robotId;
    const r = robot(id);
    if (!r || !alliance(ctx, i).includes(id) || !robotPlans(r).includes(payload?.plan)) return err('That robot can’t run that plan.');
    if (captainOf(ctx, i) === player.id) {
      d(ctx).lineups[i][id] = payload.plan;
      d(ctx).locked[i] = false; // a change unlocks until the captain locks again
      maybePlay(ctx);
    } else {
      d(ctx).suggestions[player.id] = { ...(d(ctx).suggestions[player.id] ?? {}), [id]: payload.plan };
    }
    return { ok: true };
  },
  lock(ctx, player) {
    if (ctx.state.phase !== 'plan') return err('Lineups are locked.');
    const i = teamIndex(ctx, player.id);
    if (i < 0 || captainOf(ctx, i) !== player.id) return err('Only the captain locks the lineup.');
    d(ctx).locked[i] = !d(ctx).locked[i];
    maybePlay(ctx);
    return { ok: true };
  },
  /** Everyone: how many defenders will the other side play? */
  predict(ctx, player, payload) {
    if (ctx.state.phase !== 'plan') return err('Predictions are closed.');
    const n = payload?.defenders;
    if (!Number.isInteger(n) || n < 0 || n > 3) return err('Pick 0 to 3.');
    d(ctx).predictions[player.id] = n;
    return { ok: true };
  },
  shuffle(ctx, player) {
    if (player.isVip && ctx.state.phase === 'teams') deal(ctx);
  },
};

export const hostActions = {
  shuffle(ctx) {
    if (ctx.state.phase === 'teams') deal(ctx);
  },
};

// ---------- views ----------

function rankMap(ctx) {
  const list = ctx.players.map((p) => ({ id: p.id, score: ctx.state.scores[p.id] ?? 0 })).sort((a, b) => b.score - a.score);
  const ranks = {};
  list.forEach((p, i) => (ranks[p.id] = i > 0 && p.score === list[i - 1].score ? ranks[list[i - 1].id] : i + 1));
  return ranks;
}

/** What everyone may see: no stars, guesses, suggestions or lineups before the match plays. */
export function hostView(ctx, base) {
  const draft = d(ctx);
  const s = ctx.state;
  return {
    ...base,
    match: draft.match,
    teams: draft.teams.map((t, i) => ({ id: t.id, name: t.name, members: t.members, captainId: captainOf(ctx, i), wins: draft.wins[i] })),
    first: draft.first,
    pick: draft.pick,
    turn: s.phase === 'draft' ? turn(ctx) : null,
    picks: draft.picks,
    guessed: s.phase === 'draft' ? Object.keys(draft.guesses).length : null,
    lastGuess: draft.lastGuess ?? null,
    locked: s.phase === 'plan' ? draft.locked : null,
    predicted: s.phase === 'plan' ? Object.keys(draft.predictions).length : null,
    results: draft.results,
    champion: s.phase === 'final' ? draft.champion ?? null : undefined,
  };
}

/** One phone: everything public, plus its own team's stars, suggestions and lineup. */
export function playerView(ctx, me, base) {
  const draft = d(ctx);
  const s = ctx.state;
  const i = teamIndex(ctx, me.id);
  const mates = i >= 0 ? draft.teams[i].members : [];
  const teamStars = {};
  for (const id of mates) for (const r of draft.stars[id] ?? []) teamStars[r] = (teamStars[r] ?? 0) + 1;
  const suggested = {};
  for (const id of mates) for (const [r, plan] of Object.entries(draft.suggestions[id] ?? {})) {
    suggested[r] ??= {};
    suggested[r][plan] = (suggested[r][plan] ?? 0) + 1;
  }
  return {
    ...base,
    team: i,
    captain: i >= 0 ? captainOf(ctx, i) === me.id : false,
    captainName: i >= 0 ? ctx.player(captainOf(ctx, i))?.name ?? '?' : null,
    mates: mates.map((id) => ctx.player(id)?.name ?? '?'),
    teamSizes: draft.teams.map((t) => t.members.length),
    first: draft.first,
    pick: draft.pick,
    turn: s.phase === 'draft' ? turn(ctx) : null,
    picks: draft.picks,
    myStars: draft.stars[me.id] ?? [],
    teamStars,
    myGuess: s.phase === 'draft' ? draft.guesses[me.id] ?? null : null,
    lastGuess: draft.lastGuess ?? null,
    match: draft.match,
    wins: draft.wins,
    lineup: i >= 0 ? draft.lineups[i] : null,
    locked: i >= 0 ? draft.locked[i] : false,
    suggested,
    mySuggest: draft.suggestions[me.id] ?? {},
    myPredict: draft.predictions[me.id] ?? null,
    result: s.phase === 'result' || s.phase === 'final' ? draft.results.at(-1) ?? null : null,
    results: s.phase === 'final' ? draft.results : null,
    champion: s.phase === 'final' ? draft.champion ?? null : undefined,
    calls: draft.calls?.[me.id] ?? 0,
  };
}
