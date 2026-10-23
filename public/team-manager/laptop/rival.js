// The other alliance on the laptop: a practice bot, standing in for 5026's strategy team until they have a scene of
// their own (they'll meet her, guide her and run this side). It plays by the same rules as she does, through the same
// actions, from its own playerView: the scouting everyone sees, its own picklist, never hers, and never the truth.
//
//   makeRival({ think })   think: [shortest, longest] seconds it takes over a pick or a plan (2 to 6 by default)
//   rival.tick(api)        each frame, from room.js: api.view() is its playerView, api.send(type, payload) its phone
//   rival.reset()          a new event
//
// What it does, simply, so it's beatable and easy to read:
//   picklist   every team ranked by a value from the scouting: its average cycles, less a cycle for each zero in its
//              ten matches (a robot that breaks costs you the match), plus a little for a good defender. Nothing on
//              Do Not Pick.
//   picks      the top of that list that it may invite, after thinking it over (never past the pick clock)
//   plans      offense, unless one of its robots would take more of her alliance's cycles defending her best scorer
//              than it would score itself: that one defends, and stays on its robot if that robot defends too
// The strategy team will be cleverer: they'll read her picks, counter her defense and talk it over.

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const zeros = (s) => s.scores.filter((x) => x === 0).length;
const avg = (s) => mean(s.scores);
/** What a team is worth to it, from the scouting. */
export const value = (s) => avg(s) - zeros(s) + 3 * Math.max(0, s.defense - 0.5);
/** Cycles its robot d would take off robot x, defending it, by the scouts' numbers. */
const takes = (d, x) => avg(x) * d.defense * x.susceptibility;

export function makeRival({ think = [2, 6] } = {}) {
  let ready = null; // the moment it's done thinking about what's in front of it
  let on = null; // what that is: 'pick 2', 'plan 0'
  let listed = false;

  /** Think for a while about `task`, then do(): once, and never later than `deadline` allows. */
  function after(api, task, deadline, act) {
    const now = api.clock();
    if (on !== task) {
      on = task;
      const wait = (think[0] + Math.random() * (think[1] - think[0])) * 1000;
      ready = deadline ? Math.min(now + wait, deadline - 1500) : now + wait;
      return;
    }
    if (ready != null && now >= ready) {
      ready = null;
      act();
    }
  }

  return {
    reset() {
      ready = on = null;
      listed = false;
    },
    tick(api) {
      const v = api.view();
      if (v.group < 0) return;
      const us = v.group, ranked = [...v.event].sort((a, b) => value(b) - value(a));
      if (v.phase === 'prep' && !listed) {
        listed = true;
        ranked.forEach((s, i) => api.send('picklist', { teamId: s.id, list: 'pick', index: i }));
      }
      if (v.phase === 'select' && v.turn === us && v.captain) {
        after(api, `pick ${v.pick}`, v.deadline, () => {
          const taken = v.alliances.flat();
          const may = (id) => !taken.includes(id) || (us === 0 && v.pick === 0 && id === v.alliances[1][0]);
          const choice = v.picklist.pick.find(may) ?? ranked.find((s) => may(s.id))?.id;
          if (choice) api.send('invite', { teamId: choice });
        });
      }
      if (v.phase === 'plan' && !v.locked[us]) {
        after(api, `plan ${v.match}`, v.deadline, () => {
          const scout = (id) => v.event.find((s) => s.id === id);
          const ours = v.alliances[us].map(scout), theirs = v.alliances[1 - us].map(scout);
          const best = [...theirs].sort((a, b) => avg(b) - avg(a))[0];
          const gains = ours.map((d) => ({ d, gain: takes(d, best) - avg(d) })).sort((a, b) => b.gain - a.gain);
          for (const s of ours) api.send('assign', { teamId: s.id, target: 'offense' });
          if (gains[0].gain > 0) api.send('assign', { teamId: gains[0].d.id, target: best.id, ifDefending: 'stay' });
          api.send('lock', {});
        });
      }
    },
  };
}
