// The season as it's kept: where she is in it, what's in her notebook, and the event itself as it's been played so far.
// The save is small and plain (the seed, the phase, her plans for her own matches, the notebook) and lives in this
// browser; the event is never saved. Every match is the simulation's and the same seed always plays the same match, so
// the world is worked out again from the seed and her plans whenever it's wanted.
//
// The notebook is the one thing that's hers: a line for every robot in every match she's watched (recordOf's, as a
// scout would write it), what teams have told her in the pits (which may not be so), which pits she's been to, the
// robots she's starred, and her field notes. A field note is something she's seen for herself, written down with the
// numbers she saw: the game adds one when what's in the notebook shows it (discover(), below). Nothing grades her.
//
//   newSave(o), load(), save(st), wipe()       the save
//   worldOf(st)                                the event for this save's seed: { rounds, played, records }
//   playRound(st, r)                           the matches of round r played (hers too, once she's planned it)
//   resultOf(st, q, record)                    match q's result; record: true for one to show on the field
//   replan(st, q, plans), seedFor(st, q)       her own match, played as she called it (and kept), and its dice
//   observe(st, q, nums, how)                  she watched these robots in match q: lines go in the notebook
//   hear(st, num, line), visit(st, num), star(st, num)
//   seenOf(st, num), summary(st, num)          what the notebook has on a team
//   tableOf(st)                                the rankings so far
//   discover(st, extra)                        any new field notes: [{ id, title, text }]
//   NOTES                                      every field note there is to find, in the notebook's order
//   voltsOf(st), spendVolts(st)                Norbert's battery: every field note charges it, a wind back drains it

import { ROUNDS, FRIDAY, OURS, TEAMS, makeSchedule, playMatch, recordOf, standings, sideOf, oursIn } from './event.js';
import { TEAMS as ROBOTS, robotOf } from '../match/robots.js';

import { SAVE_KEY as KEY } from '../player.js';

const mem = { st: null }; // where the save lives if the browser won't keep it

/** A new season, at the opening. seed: the event's schedule and dice. */
export function newSave({ seed = 1 + Math.floor(Math.random() * 90000), name = '' } = {}) {
  return {
    v: 2, seed, name, loop: 0, phase: 'cold', round: 0, time: 0, own: {}, playoff: null, draft: null,
    cold: null, flags: {}, winds: 0,
    book: { seen: {}, heard: {}, pit: {}, stars: [], notes: {}, threads: [], circled: null },
  };
}
export function load() {
  try {
    const st = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return st?.v === 2 ? st : mem.st;
  } catch {
    return mem.st;
  }
}
export function save(st) {
  mem.st = st;
  try {
    localStorage.setItem(KEY, JSON.stringify(st));
  } catch {
    // Storage blocked (a private window): the season lasts the visit.
  }
}
export function wipe() {
  mem.st = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to remove
  }
}

// ---- The event, worked out from the seed ----
const worlds = new Map();
/** This save's event: its schedule, the matches played so far ({ match, result } by number) and every robot's lines. */
export function worldOf(st) {
  const key = `${st.seed}/${st.loop}`;
  if (!worlds.has(key)) {
    worlds.clear();
    worlds.set(key, { rounds: makeSchedule(st.seed * 10 + st.loop), played: new Map(), records: Object.fromEntries(TEAMS.map((n) => [n, []])), shown: new Map() });
  }
  return worlds.get(key);
}
/** The dice for match q of this save's event. */
export const seedFor = (st, q) => (st.seed * 10 + st.loop) * 1000 + q;
const seedOf = seedFor;
/** Her match in round r, and whether it's been played (she's planned it). */
export const ourMatch = (st, r) => oursIn(worldOf(st).rounds[r]);
/** The robots' plans for one of her matches as she called them (habits for the rest). */
const plansOf = (st, q) => st.own[q]?.plans ?? null;

/**
 * Round r's matches played, every one that can be: the other three straight away, and hers once she's planned it
 * (st.own). Each is played once and kept. Returns the round.
 */
export function playRound(st, r) {
  const w = worldOf(st), round = w.rounds[r];
  for (const m of round) {
    if (w.played.has(m.q)) continue;
    const ours = sideOf(m) != null;
    if (ours && !plansOf(st, m.q)) continue;
    const result = playMatch(seedOf(st, m.q), m, { k: r, plans: ours ? plansOf(st, m.q) : null, record: false });
    w.played.set(m.q, { match: m, result });
    for (const n of [...m.blue, ...m.red]) w.records[n][r] = { q: m.q, round: r, ...recordOf(result, n) };
  }
  return round;
}
/** Every round up to and including r, played. */
export function playTo(st, r) {
  for (let i = 0; i <= Math.min(r, ROUNDS - 1); i++) playRound(st, i);
}
/** Her match's result changes when she plans it again (a new plan before it's played): forget the old one. */
export function replan(st, q, plans) {
  const w = worldOf(st), m = [...w.rounds.flat()].find((x) => x.q === q);
  st.own[q] = { plans };
  w.played.delete(q);
  w.shown.delete(q);
  playRound(st, m.round);
  return w.played.get(q).result;
}
/** Match q's result. record: with every robot's track, for showing it on the field (played again; the same match). */
export function resultOf(st, q, record = false) {
  const w = worldOf(st), m = w.rounds.flat().find((x) => x.q === q);
  if (!record) {
    playRound(st, m.round);
    return w.played.get(q)?.result ?? null;
  }
  if (!w.shown.has(q)) {
    w.shown.clear(); // one at a time: they're big
    w.shown.set(q, playMatch(seedOf(st, q), m, { k: m.round, plans: sideOf(m) ? plansOf(st, q) : null, record: true }));
  }
  return w.shown.get(q);
}
/**
 * The rankings as they stand: every round before the one she's in. (The round's other matches are played as it
 * starts, so the stands have something to watch, but nobody knows their scores till the round's over.)
 */
export const tableOf = (st) => {
  const upTo = st.phase === 'quals' ? st.round : ROUNDS;
  return standings([...worldOf(st).played.values()].filter((p) => p.match.round < upTo));
};
export const rankOf = (st, num = OURS) => tableOf(st).find((t) => t.num === String(num));

// ---- The notebook ----
/** She watched these robots in match q: their lines go in the notebook. how: 'watch' (from the stands), 'ours' (her
 * own match), 'scouts' (her scouts watched it for her). */
export function observe(st, q, nums, how = 'watch') {
  const w = worldOf(st), m = w.rounds.flat().find((x) => x.q === q);
  for (const n of nums.map(String)) {
    if (n === OURS && how !== 'ours') continue;
    const rec = w.records[n][m.round];
    if (!rec) continue;
    const list = (st.book.seen[n] ??= []);
    if (!list.some((x) => x.q === q)) list.push({ ...rec, how });
    list.sort((a, b) => a.q - b.q);
  }
}
/** Something a team told her: kept apart from what she's seen. id: one line per kind of thing per team (the latest). */
export function hear(st, num, id, text, extra = {}) {
  const list = (st.book.heard[num] ??= []);
  const i = list.findIndex((h) => h.id === id);
  const line = { id, text, round: st.round, day: dayOf(st), ...extra };
  if (i >= 0) list[i] = line;
  else list.push(line);
}
export const visit = (st, num) => (st.book.pit[num] = true);
export function star(st, num) {
  const i = st.book.stars.indexOf(num);
  if (i >= 0) st.book.stars.splice(i, 1);
  else st.book.stars.push(num);
  return i < 0;
}
export const seenOf = (st, num) => st.book.seen[num] ?? [];
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
/**
 * What the notebook has on a team, added up: { n (matches seen), avg, recent (the last three seen), row (its ten
 * matches, a number where she saw it), l3: [made, tried], l2, died, walls (matches it spent on defense), heard, kind
 * (known once she's seen it or its pit) }.
 */
export function summary(st, num) {
  const seen = seenOf(st, num), row = Array.from({ length: ROUNDS }, () => null);
  for (const r of seen) row[r.round] = r.pts;
  const tries = (l) => [seen.filter((r) => r.climb?.level === l && r.climb.made && !r.climb.park).length, seen.filter((r) => r.climb?.level === l && !r.climb.park).length];
  return {
    num, n: seen.length, avg: mean(seen.map((r) => r.pts)), recent: mean(seen.slice(-3).map((r) => r.pts)), row,
    l3: tries(3), l2: tries(2), died: seen.filter((r) => r.dead).length,
    walls: seen.filter((r) => r.defended?.planned).length,
    heard: st.book.heard[num] ?? [], known: seen.length > 0 || !!st.book.pit[num], star: st.book.stars.includes(num),
  };
}
/** Which day a round is, and what the clock would say: for the notebook and the pits. */
export const dayOf = (st) => (st.phase === 'thursday' || st.phase === 'van' ? 'THU' : st.round < FRIDAY ? 'FRI' : 'SAT');

// ---- Norbert's battery ----
/** Volts: what he woke up with on Thursday, a little more for every field note, less for every wind back. */
export const voltsOf = (st) => (st.loop === 0 ? 12.4 : 12 + 0.1 * Object.keys(st.book.notes).length - 0.3 * st.winds);
/** Whether there's enough in him to wind back to alliance selection (12.3), and winding: it costs 0.3. */
export const canWind = (st) => voltsOf(st) >= 12.3 - 1e-9;
export const voltsText = (st) => `${voltsOf(st).toFixed(1)}V`;

// ---- Field notes ----
// Each is something true at this event that she can come to see for herself. `find(st, x)` looks through the notebook
// (and x, what's just happened: a match of hers with its call) and returns the note's words if what she's seen shows
// it, with the numbers she saw; otherwise nothing. A note is found once. `ask` is the question it answers, for the
// notebook's list of things she doesn't know yet.
const changed = (num) => ROBOTS[num]?.form?.[0] ?? null;
const split = (st, num) => {
  const f = changed(num), seen = seenOf(st, num).filter((r) => !r.dead);
  return f ? [seen.filter((r) => r.round < f.from), seen.filter((r) => r.round >= f.from)] : [seen, []];
};
const list = (rs) => rs.map((r) => r.pts).join(', ').replace(/, ([^,]*)$/, ' AND $1');
const usual = (st, num, not) => {
  const rs = seenOf(st, num).filter((r) => r.q !== not && !r.dead && !(r.held > 40));
  return rs.length ? Math.round(mean(rs.map((r) => r.pts))) : null;
};

export const NOTES = [
  {
    id: 'fading', title: 'FADING', ask: 'WHY DID THE TOP SEEDS PASS ON 7461?',
    find(st) {
      for (const num of Object.keys(st.book.seen)) {
        const [a, b] = split(st, num);
        if (a.length >= 2 && b.length >= 2 && mean(b.map((r) => r.pts)) <= mean(a.map((r) => r.pts)) - 7) {
          return [`${num}: ${list(a.slice(-3))} EARLY ON.`, `${list(b.slice(-3))} SINCE. SOMETHING BROKE.`];
        }
      }
      return null;
    },
  },
  {
    id: 'rising', title: 'ON THE RISE', ask: 'WHAT DID 6834 CHANGE ON FRIDAY?',
    find(st) {
      for (const num of Object.keys(st.book.seen)) {
        const [a, b] = split(st, num);
        if (a.length >= 2 && b.length >= 2 && mean(b.map((r) => r.pts)) >= mean(a.map((r) => r.pts)) + 7) {
          return [`${num}: ${list(a.slice(-3))} EARLY ON.`, `${list(b.slice(-3))} SINCE. A DIFFERENT ROBOT.`];
        }
      }
      return null;
    },
  },
  {
    id: 'claim', title: 'WHAT THEY SAY', ask: 'DOES 5518 REALLY GET TO LEVEL 3?',
    find(st) {
      for (const [num, heard] of Object.entries(st.book.heard)) {
        const says = heard.find((h) => h.l3);
        if (!says) continue;
        const tries = seenOf(st, num).filter((r) => r.climb?.level === 3), made = tries.filter((r) => r.climb.made).length;
        if (tries.length >= 3 && made / tries.length <= 0.4) {
          return [`${num} SAYS LEVEL 3 ${says.l3}.`, `I'VE SEEN IT MAKE ${made} OF ${tries.length}.`];
        }
      }
      return null;
    },
  },
  {
    id: 'pile', title: 'NOWHERE LEFT TO SCORE', ask: 'WHY DID OUR CARGO ROBOTS SIT STILL?',
    find(st) {
      for (const rs of Object.values(st.book.seen)) {
        for (const r of rs) {
          const base = usual(st, r.num, r.q);
          if (r.stuck >= 35 && !r.dead && (base == null || r.pts <= base - 5)) {
            return [`Q${r.q}: ${r.num} SAT STILL FOR ${r.stuck} SECONDS.`, base == null ? 'NOWHERE LEFT TO PUT ITS PIECES.' : `SCORED ${r.pts}. IT SCORES ${base} WITH ROOM.`];
          }
        }
      }
      return null;
    },
  },
  {
    id: 'wall', title: 'THE WALL', ask: 'WHAT HELD 7777 TO 22 IN ONE MATCH?',
    find(st) {
      for (const rs of Object.values(st.book.seen)) {
        for (const r of rs) {
          const base = usual(st, r.num, r.q);
          if (r.held >= 50 && base != null && r.pts <= base - 12 && !r.dead) {
            return [`Q${r.q}: ${r.by[0]} SAT ON ${r.num} ALL MATCH.`, `${r.num} SCORED ${r.pts}. IT SCORES ${base} LEFT ALONE.`];
          }
        }
      }
      return null;
    },
  },
  {
    id: 'cost', title: 'DEFENSE COSTS', ask: 'IS A ROBOT ON DEFENSE EVER A WASTE?',
    find(st) {
      for (const rs of Object.values(st.book.seen)) {
        for (const r of rs) {
          if (!r.defended?.planned || r.defended.secs < 60 || r.dead) continue;
          const mine = usual(st, r.num, r.q), theirs = usual(st, r.defended.on, r.q);
          const scores = seenOf(st, r.num).some((x) => x.q !== r.q && !x.defended?.planned);
          if (scores && mine != null && theirs != null && r.pts <= mine - 8 && r.defended.pts >= theirs - 4) {
            return [`Q${r.q}: ${r.num} DEFENDED ${r.defended.on}, WHO SCORED ${r.defended.pts} ANYWAY.`, `${r.num} GAVE UP ${mine - r.pts} OF ITS OWN TO DO IT.`];
          }
        }
      }
      return null;
    },
  },
  {
    id: 'sample', title: 'ONE MATCH', ask: 'HOW MUCH DOES ONE MATCH TELL ME?',
    find(st) {
      for (const [num, rs] of Object.entries(st.book.seen)) {
        if (num === OURS) continue;
        const f = changed(num);
        const ok = rs.filter((r) => !r.dead && !(r.held > 30) && !r.defended?.planned && r.stuck < 25 && (!f || r.round < f.from));
        for (let i = 0; i < ok.length; i++) {
          for (let j = i + 1; j < ok.length; j++) {
            if (Math.abs(ok[i].pts - ok[j].pts) >= 14) {
              return [`${num}: ${ok[i].pts} IN Q${ok[i].q}, ${ok[j].pts} IN Q${ok[j].q}.`, 'THE SAME ROBOT. NOTHING BROKE.'];
            }
          }
        }
      }
      return null;
    },
  },
  {
    id: 'dead', title: 'ROBOTS BREAK', ask: 'WHICH ROBOTS DIE ON THE FIELD?',
    find(st) {
      for (const [num, rs] of Object.entries(st.book.seen)) {
        const died = rs.filter((r) => r.dead);
        if (died.length >= 2) return [`${num} DIED IN Q${died[0].q} AND Q${died[1].q}.`, `${died.length} OF THE ${rs.length} I'VE SEEN.`];
      }
      return null;
    },
  },
  {
    id: 'sure', title: 'THE SURE THING', ask: 'UP AT 0:30: IS LEVEL 3 WORTH IT?',
    find(st, x) {
      const c = x?.call;
      if (!c || c.lead <= 0) return null;
      const slip = c.climbs.find((k) => k.level === 3 && !k.made);
      if (slip && c.margin <= 0 && c.margin + 3 > 0) {
        return [`${c.tag}: UP ${c.lead} AT 0:30. ${slip.num} SLIPPED OFF LEVEL 3.`, `LOST BY ${-c.margin}. LEVEL 2 WOULD HAVE WON IT.`];
      }
      if (!c.climbs.some((k) => k.level === 3) && c.could3 && c.margin > 0 && c.margin <= 3) {
        return [`${c.tag}: UP ${c.lead} AT 0:30. TOOK LEVEL 2. WON BY ${c.margin}.`, 'A SLIP AT LEVEL 3 LOSES THAT ONE.'];
      }
      return null;
    },
  },
  {
    id: 'gamble', title: 'NOTHING TO LOSE', ask: 'DOWN AT 0:30: WHAT IS LEFT TO TRY?',
    find(st, x) {
      const c = x?.call;
      if (!c || c.lead >= 0) return null;
      const made = c.climbs.find((k) => k.level === 3 && k.made);
      if (made && c.margin >= 0 && c.margin < 6) {
        return [`${c.tag}: DOWN ${-c.lead} AT 0:30. LEVEL 2 COULDN'T CATCH THEM.`, `${made.num} WENT FOR LEVEL 3 AND GOT IT.`];
      }
      if (!c.climbs.some((k) => k.level === 3) && c.could3 && c.margin < 0 && c.margin > -6) {
        return [`${c.tag}: DOWN ${-c.lead} AT 0:30. PLAYED IT SAFE.`, `LOST BY ${-c.margin}. LEVEL 3 WAS THE ONLY WAY BACK.`];
      }
      return null;
    },
  },
  {
    id: 'rp', title: 'A LOSS THAT PAYS', ask: 'HOW DO TEAMS RANK ABOVE THEIR RECORD?',
    find(st, x) {
      const c = x?.call;
      if (!c || c.margin >= 0 || !c.rp || c.rp.total < 1) return null;
      return [`${c.tag}: LOST BY ${-c.margin}. STILL A RANKING POINT:`, c.rp.hab ? `${c.hab} POINTS OF CLIMBING ON THE HAB.` : 'A WHOLE ROCKET FILLED.'];
    },
  },
  {
    id: 'rocket', title: 'A WHOLE ROCKET', ask: 'WHAT IS A ROCKET WORTH?',
    find(st, x) {
      const c = x?.call;
      if (!c?.rp?.rocket) return null;
      return [`${c.tag}: SIX HATCHES AND SIX CARGO ON ONE ROCKET.`, 'A RANKING POINT, WIN OR LOSE.'];
    },
  },
  {
    id: 'gone', title: 'GONE BY OUR PICK', ask: 'WHO WILL STILL BE THERE WHEN WE PICK?',
    find(st, x) {
      if (!x?.gone) return null;
      return [`${x.gone.num} WENT TO ALLIANCE ${x.gone.alliance} BEFORE WE PICKED.`, 'THE LIST NEEDS A SECOND NAME, AND A THIRD.'];
    },
  },
];
/**
 * Any field notes what she's seen now shows, that she hasn't got yet: found, written in the notebook, and returned
 * ([{ id, title, text }]) so whoever asked can show them. x: what's just happened, for the notes that come from a
 * moment (a match's call, a pick): { call, gone }.
 */
export function discover(st, x = null) {
  if (st.loop === 0) return [];
  const found = [];
  for (const n of NOTES) {
    if (st.book.notes[n.id]) continue;
    const text = n.find(st, x);
    if (!text) continue;
    st.book.notes[n.id] = { text, round: st.round, day: dayOf(st) };
    found.push({ id: n.id, title: n.title, text });
  }
  return found;
}
export const notesFound = (st) => NOTES.filter((n) => st.book.notes[n.id]).length;
/** A robot as it is for a round, for the screens that say what it can do. */
export const robotAt = (num, round) => robotOf(num, { match: round });
