// The Showdown: the rules for Part 3 (rules.js hands over to these when the part's kind is 'draft').
//
// The room splits at random into two groups. Each runs one alliance and has a student captain.
//   teams    the split (the big screen or leader can shuffle)
//   prep     15 minutes to study the event's teams and build the group's picklist (shared within the group,
//            hidden from the other)
//   select   alliance selection: the top two seeds captain Alliances 1 and 2 and pick serpentine (1, 2, 2, 1),
//            45 s per first-round pick and 1:30 after that. The group captain makes the invitation.
//   plan     each group sets every robot to offense or to defend one opposing robot (and what to do if that robot
//            is defending too); the captain locks in
//   result   the match is played from the robots' true attributes; a tie is replayed
//   final    after a two-match winner: the true attributes, and each match's win chance given the assignments
//
// State lives in ctx.state.draft.
import { DRAFT } from './lesson1-draft.js';
import { matchOdds, playMatch, scoutTeam } from './alliance.js';

export const GROUPS = ['Red', 'Blue'];
const ALL_IN_MS = 2500;

const d = (ctx) => ctx.state.draft;
const team = (id) => DRAFT.teams.find((t) => t.id === id) ?? null;
const groupOf = (ctx, playerId) => d(ctx)?.groups.findIndex((g) => g.members.includes(playerId)) ?? -1;
const online = (ctx, i) => d(ctx).groups[i].members.some((id) => ctx.player(id)?.connected);
const picked = (ctx) => d(ctx).alliances.flat();
const turn = (ctx) => DRAFT.order[d(ctx).pick];

/** The group's captain: the chosen one while connected, otherwise the first connected member. */
export function captainOf(ctx, i) {
  const g = d(ctx).groups[i];
  if (ctx.player(g.captainId)?.connected) return g.captainId;
  return g.members.find((id) => ctx.player(id)?.connected) ?? g.captainId;
}

export function start(ctx) {
  const rand = Math.random;
  // Simulate this event's qualifications: ten matches per team, scouts' ratings, and a ranking from the results.
  const scouted = DRAFT.teams.map((t) => ({ id: t.id, ...scoutTeam(t, DRAFT, rand) }));
  const avg = (s) => s.scores.reduce((a, b) => a + b, 0) / s.scores.length;
  const rankScore = new Map(scouted.map((s) => [s.id, avg(s) + 1.2 * (rand() - 0.5)])); // ranking points are noisy too
  scouted.sort((a, b) => rankScore.get(b.id) - rankScore.get(a.id));
  const event = scouted.map((s, i) => ({ ...s, seed: i + 1 }));
  ctx.state.draft = {
    groups: [],
    event,
    picklists: [{ pick: [], dnp: [] }, { pick: [], dnp: [] }],
    alliances: [[event[0].id], [event[1].id]], // the top two seeds captain the alliances
    pick: 0,
    lastPick: null,
    assign: [{}, {}],
    locked: [false, false],
    match: 0,
    results: [],
    wins: [0, 0],
    champion: null,
  };
  deal(ctx);
  ctx.state.phase = 'teams';
  ctx.state.deadline = null;
}

/** Split the connected players at random into two groups, as even as possible, with random captains. */
function deal(ctx) {
  const ids = ctx.shuffle(ctx.players.filter((p) => p.connected).map((p) => p.id));
  d(ctx).groups = GROUPS.map((name, i) => {
    const members = ids.filter((_, k) => k % 2 === i);
    return { name, members, captainId: members[0] ?? null };
  });
}

export function onJoin(ctx, player) {
  const draft = d(ctx);
  if (!draft || groupOf(ctx, player.id) >= 0) return;
  const g = draft.groups[0].members.length <= draft.groups[1].members.length ? draft.groups[0] : draft.groups[1];
  g.members.push(player.id);
  g.captainId ??= player.id;
}

/** Nobody left in a group: don't make the room wait for it. */
export function onDisconnect(ctx) {
  const s = ctx.state;
  if (s.phase === 'select' && !online(ctx, turn(ctx))) ctx.timer('allIn', ALL_IN_MS, () => autoPick(ctx));
  if (s.phase === 'plan') maybePlay(ctx);
}

// ---------- moving between phases ----------

/** The big screen's (or leader's) next button, and every phase timer running out. */
export function next(ctx) {
  const s = ctx.state;
  if (s.phase === 'teams') return prep(ctx);
  if (s.phase === 'prep') return startPick(ctx);
  if (s.phase === 'select') return autoPick(ctx);
  if (s.phase === 'plan') return play(ctx);
  if (s.phase === 'result') return seriesOver(ctx) ? finish(ctx) : plan(ctx, d(ctx).match + 1);
}

function setTimer(ctx, seconds) {
  ctx.state.deadline = Date.now() + seconds * 1000;
  ctx.timer('phase', seconds * 1000, () => next(ctx));
}

function prep(ctx) {
  ctx.state.phase = 'prep';
  setTimer(ctx, DRAFT.prepSeconds);
}

function startPick(ctx) {
  ctx.state.phase = 'select';
  ctx.cancelTimer('allIn');
  setTimer(ctx, DRAFT.pickSeconds[d(ctx).pick]);
  if (!online(ctx, turn(ctx))) ctx.timer('allIn', ALL_IN_MS, () => autoPick(ctx));
}

/** Time ran out: the top available team on the group's picklist, or else the best seed it hasn't ruled out. */
function autoPick(ctx) {
  if (ctx.state.phase !== 'select') return;
  const draft = d(ctx);
  const i = turn(ctx);
  const available = draft.event.filter((t) => canPick(ctx, i, t.id)).map((t) => t.id);
  const list = draft.picklists[i];
  const choice = list.pick.find((id) => available.includes(id)) ?? available.find((id) => !list.dnp.includes(id)) ?? available[0];
  invite(ctx, choice, true);
}

/**
 * Can alliance i pick this team now? Not if it's already on an alliance, except that Alliance 1's first pick may
 * take Alliance 2's captain (as at an event; the next seed then captains Alliance 2).
 */
function canPick(ctx, i, teamId) {
  const draft = d(ctx);
  if (!team(teamId)) return false;
  if (!picked(ctx).includes(teamId)) return true;
  return i === 0 && draft.pick === 0 && teamId === draft.alliances[1][0];
}

function invite(ctx, teamId, auto = false) {
  const draft = d(ctx);
  const i = turn(ctx);
  draft.alliances[i].push(teamId);
  if (i === 0 && draft.pick === 0 && teamId === draft.alliances[1][0]) {
    // Alliance 2's captain joined Alliance 1: the best remaining seed captains Alliance 2.
    draft.alliances[1] = [draft.event.find((t) => !draft.alliances[0].includes(t.id)).id];
  }
  draft.lastPick = { alliance: i, teamId, auto };
  draft.pick++;
  if (draft.pick < DRAFT.order.length) return startPick(ctx);
  draft.assign = draft.alliances.map((ids) => Object.fromEntries(ids.map((id) => [id, 'offense'])));
  plan(ctx, 0);
}

function plan(ctx, m) {
  Object.assign(d(ctx), { match: m, locked: [false, false] });
  ctx.state.phase = 'plan';
  ctx.cancelTimer('allIn');
  setTimer(ctx, DRAFT.planSeconds);
  maybePlay(ctx);
}

/** Both alliances are locked in (a group with nobody connected counts as locked): play after a short pause. */
function maybePlay(ctx) {
  const draft = d(ctx);
  if (ctx.state.phase !== 'plan') return;
  const ready = () => draft.locked.every((locked, i) => locked || !online(ctx, i));
  if (!ready()) return ctx.cancelTimer('allIn');
  ctx.timer('allIn', ALL_IN_MS, () => ready() && play(ctx));
}

function play(ctx) {
  const s = ctx.state;
  const draft = d(ctx);
  if (s.phase !== 'plan') return;
  ctx.cancelTimer('phase');
  ctx.cancelTimer('allIn');
  const sides = draft.alliances.map((ids, i) => ({ teams: ids.map(team), assign: draft.assign[i] }));
  const odds = matchOdds(sides, { defenderExtra: DRAFT.defenderBreakExtra });
  const match = playMatch(sides, Math.random, { defenderExtra: DRAFT.defenderBreakExtra });
  const winner = match.scores[0] > match.scores[1] ? 0 : match.scores[1] > match.scores[0] ? 1 : null;
  if (winner !== null) draft.wins[winner]++;
  draft.results.push({
    assign: draft.assign.map((x) => JSON.parse(JSON.stringify(x))),
    roles: match.roles, // who actually defended whom
    scores: match.scores,
    cycles: match.cycles,
    winner,
    // each alliance's chance given these assignments: hidden until the series is over
    odds: { win: odds.win, tie: odds.tie, mean: odds.mean },
  });
  s.phase = 'result';
  s.deadline = null;
}

const seriesOver = (ctx) => d(ctx).wins.some((w) => w >= 2) || d(ctx).results.length >= DRAFT.maxMatches;

function finish(ctx) {
  const draft = d(ctx);
  const [r, b] = draft.wins;
  draft.champion = r > b ? 0 : b > r ? 1 : null;
  ctx.state.phase = 'final';
  ctx.state.deadline = null;
}

export function summary(ctx) {
  const draft = d(ctx);
  if (draft.champion == null) return `the Showdown ended level, ${draft.wins.join('–')}`;
  return `${GROUPS[draft.champion]} (Alliance ${draft.champion + 1}) won the Showdown, ${Math.max(...draft.wins)}–${Math.min(...draft.wins)}`;
}

// ---------- actions from phones ----------

const err = (error) => ({ error });

export const actions = {
  /** Move a team on your group's picklist: into 'pick' or 'dnp' at an index, or back to 'bank'. */
  picklist(ctx, player, payload) {
    const s = ctx.state;
    if (s.phase !== 'prep' && s.phase !== 'select') return err('Picklists are closed.');
    const i = groupOf(ctx, player.id);
    if (i < 0) return err('You’re not in a group yet.');
    const { teamId, list, index } = payload ?? {};
    if (!team(teamId) || !['pick', 'dnp', 'bank'].includes(list)) return err('Move a team to a list.');
    const lists = d(ctx).picklists[i];
    lists.pick = lists.pick.filter((id) => id !== teamId);
    lists.dnp = lists.dnp.filter((id) => id !== teamId);
    if (list !== 'bank') {
      const at = Number.isInteger(index) ? Math.max(0, Math.min(index, lists[list].length)) : lists[list].length;
      lists[list].splice(at, 0, teamId);
    }
    return { ok: true };
  },
  /** The captain's invitation, on their alliance's turn. */
  invite(ctx, player, payload) {
    if (ctx.state.phase !== 'select') return err('Alliance selection isn’t running.');
    const i = turn(ctx);
    if (captainOf(ctx, i) !== player.id) return err('Only the captain of the alliance on the clock can invite.');
    if (!canPick(ctx, i, payload?.teamId)) return err('That team is already on an alliance.');
    invite(ctx, payload.teamId);
    return { ok: true };
  },
  /**
   * Anyone in the group: set a robot to offense, or to defend a robot on the other alliance. `ifDefending` says
   * what to do if that robot turns out to be defending: 'stay' on it, or switch to another of their robots.
   */
  assign(ctx, player, payload) {
    if (ctx.state.phase !== 'plan') return err('Assignments are locked.');
    const i = groupOf(ctx, player.id);
    if (i < 0) return err('You’re not in a group.');
    const draft = d(ctx);
    const { teamId, target, ifDefending = 'stay' } = payload ?? {};
    const theirs = draft.alliances[1 - i];
    if (!draft.alliances[i].includes(teamId)) return err('That robot isn’t on your alliance.');
    if (target === 'offense') draft.assign[i][teamId] = 'offense';
    else if (!theirs.includes(target)) return err('Defend a robot on the other alliance.');
    else if (ifDefending !== 'stay' && (!theirs.includes(ifDefending) || ifDefending === target)) return err('Switch to a different robot of theirs.');
    else draft.assign[i][teamId] = { target, ifDefending };
    draft.locked[i] = false; // a change unlocks until the captain locks again
    maybePlay(ctx);
    return { ok: true };
  },
  lock(ctx, player) {
    if (ctx.state.phase !== 'plan') return err('Assignments are locked.');
    const i = groupOf(ctx, player.id);
    if (i < 0 || captainOf(ctx, i) !== player.id) return err('Only the captain locks in.');
    d(ctx).locked[i] = !d(ctx).locked[i];
    maybePlay(ctx);
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

function shared(ctx, base) {
  const draft = d(ctx);
  const s = ctx.state;
  const reveal = s.phase === 'final';
  return {
    ...base,
    groups: draft.groups.map((g, i) => ({ name: g.name, members: g.members, captainId: captainOf(ctx, i) })),
    event: draft.event,
    alliances: draft.alliances,
    pick: draft.pick,
    turn: s.phase === 'select' ? turn(ctx) : null,
    lastPick: draft.lastPick,
    match: draft.match,
    locked: draft.locked,
    wins: draft.wins,
    // a played match's assignments and scores are public; its win chances wait for the reveal
    results: draft.results.map((r) => (reveal ? r : { ...r, odds: null })),
    champion: reveal ? draft.champion : null,
    reveal,
  };
}

/** The big screen: everything public. Never a picklist, and never assignments before the match plays. */
export function hostView(ctx, base) {
  return shared(ctx, base);
}

/** One phone: everything public, plus its own group's picklist and assignments. */
export function playerView(ctx, me, base) {
  const draft = d(ctx);
  const i = groupOf(ctx, me.id);
  return {
    ...shared(ctx, base),
    group: i,
    captain: i >= 0 && captainOf(ctx, i) === me.id,
    captainName: i >= 0 ? ctx.player(captainOf(ctx, i))?.name ?? '?' : null,
    mates: i >= 0 ? draft.groups[i].members.map((id) => ctx.player(id)?.name ?? '?') : [],
    picklist: i >= 0 ? draft.picklists[i] : null,
    assign: i >= 0 && ctx.state.phase === 'plan' ? draft.assign[i] : null,
  };
}
