// Her own qualification matches: the plan, the match, the call at 0:30, and what it all comes to. There are ten, one a
// round, with whoever the schedule gave her and against whoever it didn't. Nothing here can be taken back: the plan
// she makes is the match that's played, and its ranking points are the ones that seed her on Saturday.
//
//   ourQual(st, r)   round r's match of hers, start to finish; the notebook gets a line on all six robots (she was
//                    down there with the drive team), and any field notes it shows are returned: [{ id, title, text }]

import { show } from './run.js';
import { Plan } from './plan.js';
import { Watch } from './watch.js';
import { playMatch, sideOf, ROUNDS } from './event.js';
import { ourMatch, playRound, replan, observe, discover, seedFor, save } from './state.js';
import { toast } from './hud.js';

/** Her plans with a climb for each of her robots on top (the call at 0:30), or as they are before it. */
export const withClimbs = (plans, climbs) => Object.fromEntries(Object.entries(plans).map(([n, p]) => [n, climbs?.[n] != null ? { ...p, climb: climbs[n] } : p]));

export async function ourQual(st, r) {
  playRound(st, r);
  const m = ourMatch(st, r), ours = sideOf(m), team = m[ours], foes = m[ours === 'blue' ? 'red' : 'blue'];
  const title = `Q${m.q}`;
  const { plans } = await show(new Plan({
    st, title, sub: `ROUND ${r + 1} OF ${ROUNDS}. WE ARE ${ours.toUpperCase()}.`, ours, team, foes, round: r, rp: true,
  }));
  const sim = (climbs) => playMatch(seedFor(st, m.q), m, { k: r, plans: withClimbs(plans, climbs), record: true });
  const out = await show(new Watch({ st, title, tag: title, q: m.q, sim, ours, team, round: r, call: true, rp: true }), { fade: false });
  // It's played: her plan and her call are the match, for good.
  replan(st, m.q, withClimbs(plans, out.climbs));
  observe(st, m.q, [...m.blue, ...m.red], 'ours');
  const notes = discover(st, { call: out.call });
  toast(notes);
  save(st);
  return { match: m, result: out.result, call: out.call, notes };
}
