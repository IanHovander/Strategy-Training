// The phase clock: one countdown per timed phase (a question, prep, a pick, match planning). It stops while the
// room is waiting for someone who has to act, and picks up where it left off when they're back:
//   state.deadline   when time runs out (null while stopped or untimed)
//   state.paused     ms that were left when it stopped (null while running)
// rules.js says what "waiting" means and what happens when time runs out (configureClock).

let rules = { waiting: () => false, timeUp: () => {} };

/** `waiting(ctx)`: true while the clock should stand still. `timeUp(ctx)`: what happens when it runs out. */
export const configureClock = (r) => (rules = r);

function arm(ctx) {
  ctx.timer('phase', Math.max(0, ctx.state.deadline - Date.now()), () => rules.timeUp(ctx));
}

/** Start the clock for a new phase. It stays stopped if the room is already waiting. */
export function startClock(ctx, seconds) {
  ctx.state.paused = null;
  ctx.state.deadline = Date.now() + seconds * 1000;
  arm(ctx);
  settleClock(ctx);
}

/** An untimed phase: no clock. */
export function stopClock(ctx) {
  Object.assign(ctx.state, { deadline: null, paused: null });
  ctx.cancelTimer('phase');
}

/** More time (the big screen's +30s), running or stopped. */
export function addTime(ctx, seconds) {
  const s = ctx.state;
  if (s.paused != null) s.paused += seconds * 1000;
  else if (s.deadline != null) {
    s.deadline = Math.max(s.deadline, Date.now()) + seconds * 1000;
    arm(ctx);
  }
}

/** Stop or restart the clock to match whether the room is waiting. Call after anyone comes or goes. */
export function settleClock(ctx) {
  const s = ctx.state;
  const wait = rules.waiting(ctx);
  if (wait && s.deadline != null) {
    s.paused = Math.max(0, s.deadline - Date.now());
    s.deadline = null;
    ctx.cancelTimer('phase');
  } else if (!wait && s.paused != null) {
    s.deadline = Date.now() + s.paused;
    s.paused = null;
    arm(ctx);
  }
}

/** After the big screen reloads (nobody is connected yet): stop the clock with the time that was left. */
export function restoreClock(ctx, savedAt) {
  const s = ctx.state;
  if (s.deadline != null) s.paused = Math.max(0, s.deadline - savedAt);
  s.deadline = null;
  settleClock(ctx);
}
