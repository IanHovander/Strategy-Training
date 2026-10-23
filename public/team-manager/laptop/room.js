// The laptop's Showdown: Strategy Training's own rules (games/frc-strategy/draft-rules.js), run right here for two
// players, the strategist and her rival, the way the team game runs them for a room of phones. The rules don't know
// the difference: they get the same ctx a game gets from the framework (public/js/core/room.js), cut down to what they
// use, and the laptop draws her playerView just as her phone would. So the scouting, the serpentine picks, the clocks,
// the defense model and the reveal are the Showdown's exactly, and a change there shows up here too.
//
//   const room = laptopRoom(rules, { rival });   rules: draft-rules.js; rival: who runs the other alliance (rival.js)
//   room.start()             a new event: fresh scouting, a fresh deal of who runs which alliance, on to the picklists
//   room.tick()              every frame: fires any timer that's due (the pick clock, the plan backstop) and lets the
//                            rival take its turn
//   room.view()              what her laptop shows: her playerView, as a phone gets it, with phase and deadline
//   room.send(type, payload) her action, as her phone would send it ('picklist', 'invite', 'assign', 'lock');
//                            returns { ok } or { error }
//   room.next()              the leader's button: picklists done (on to selection), or on from a match's result
//
// Timers are deadlines checked on tick(), not setTimeout, so when the scene stops drawing, the clocks stop with it.
// clock (Date.now by default) is where the time comes from; the tests run it fast.

export const HER = { id: 'her', name: 'STRATEGIST', connected: true, isVip: true };
export const RIVAL = { id: 'rival', name: 'RIVAL', connected: true, isVip: false };

export function laptopRoom(rules, { rival = null, clock = () => Date.now() } = {}) {
  const players = [HER, RIVAL];
  const timers = new Map();
  const ctx = {
    state: { phase: null, deadline: null, draft: null },
    players,
    player: (id) => players.find((p) => p.id === id) ?? null,
    shuffle(list) {
      const out = [...list];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    timer: (name, ms, fn) => timers.set(name, { at: clock() + ms, fn }),
    cancelTimer: (name) => timers.delete(name),
  };
  const base = () => ({ phase: ctx.state.phase, deadline: ctx.state.deadline });
  const viewOf = (p) => rules.playerView(ctx, p, base());
  const act = (p, type, payload) => rules.actions[type]?.(ctx, p, payload) ?? { error: 'Not something you can do here.' };
  const rivalApi = { view: () => viewOf(RIVAL), send: (type, payload) => act(RIVAL, type, payload), clock };

  return {
    ctx,
    start() {
      timers.clear();
      rival?.reset?.();
      rules.start(ctx); // the 'teams' phase: who runs which alliance
      rules.next(ctx); // straight on to the picklists: nobody needs to sit with their group
    },
    tick() {
      if (!ctx.state.phase) return;
      for (;;) {
        const now = clock();
        const due = [...timers].filter(([, t]) => t.at <= now).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        timers.delete(due[0]);
        due[1].fn(ctx);
      }
      rival?.tick(rivalApi);
    },
    view: () => viewOf(HER),
    send: (type, payload) => act(HER, type, payload),
    next() {
      if (ctx.state.phase === 'prep' || ctx.state.phase === 'result') rules.next(ctx);
    },
  };
}
