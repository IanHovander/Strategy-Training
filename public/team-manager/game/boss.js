// The boss fight: Saturday lunchtime, the qualification matches over. Alliance selection with the event's real
// rankings (wherever her ten matches left her) and her own notebook on the tablet, then the playoffs. Everything she
// worked out over two days is either in the notebook or it isn't; this is where it counts.
//
//   selection(st)        alliance selection: resolves with { alliances, ours, mine, gone, stats }
//   boss(st)             selection, then the playoffs: { reached, bracket, out, alliances, seed (hers), mine }
//   autoPlan(st, r)      her match in round r played on everyone's habits: for the days she isn't there to plan it

import { show } from './run.js';
import { Draft } from './draft.js';
import { playoffs } from './playoffs.js';
import { KIND, OURS, ROUNDS, makeDraft, fieldStats } from './event.js';
import { worldOf, playTo, playRound, ourMatch, tableOf, summary, discover, save } from './state.js';
import { toast } from './hud.js';

/** Any of her matches not yet played, played on habits (the drive coach's plan), so the event can be finished. */
export function autoPlan(st, r) {
  const m = ourMatch(st, r);
  if (!st.own[m.q]) st.own[m.q] = { plans: {} };
  playRound(st, r);
}

/** What the other captains' scouts have: every robot's ten matches. */
export function statsOf(st) {
  const w = worldOf(st);
  return fieldStats(Object.fromEntries(Object.entries(w.records).map(([n, rs]) => [n, rs.filter(Boolean)])));
}

export async function selection(st) {
  for (let r = 0; r < ROUNDS; r++) autoPlan(st, r);
  playTo(st, ROUNDS - 1);
  const table = tableOf(st), stats = statsOf(st), rank = Object.fromEntries(table.map((t) => [t.num, t]));
  const draft = makeDraft(table.map((t) => t.num), { stats });
  // The tablet has what she has: the event's rankings, and her notebook.
  const info = (num) => {
    const sum = summary(st, num), r = rank[num];
    const bits = [`RANK ${r.rank}`, `${r.w}-${r.l}`, sum.n ? `SEEN ${sum.n}` : 'NEVER WATCHED'];
    if (sum.l3[1]) bits.push(`L3 ${sum.l3[0]}/${sum.l3[1]}`);
    if (sum.died) bits.push(`DIED ${sum.died}`);
    if (sum.walls) bits.push('DEFENDS');
    return { value: sum.n ? Math.round(sum.avg) : null, kind: sum.known ? KIND[num] : null, row: sum.row, star: sum.star, lines: [bits.join('  ')] };
  };
  const seen = (f) => (num) => {
    const sum = summary(st, num);
    return (sum.n ? f(sum) : -50) - rank[num].rank / 100;
  };
  const lists = [
    { name: 'WHAT I SAW', by: seen((s) => s.avg) },
    { name: 'THE LAST 3 I SAW', by: seen((s) => s.recent) },
    { name: 'MY LIST (*)', by: (num) => (st.book.stars.includes(num) ? 100 : 0) + seen((s) => s.avg)(num) / 10 },
    { name: 'THE RANKINGS', by: (num) => -rank[num].rank },
  ];
  const out = await show(new Draft({ st, draft, stats, info, lists, book: true }));
  toast(discover(st, { gone: out.gone }));
  save(st);
  return { ...out, stats, seed: rank[OURS].rank };
}

export async function boss(st) {
  const sel = await selection(st);
  const res = await playoffs(st, { alliances: sel.alliances, stats: sel.stats, seed: (st.seed * 10 + st.loop) * 13 + st.winds * 97 + 5 });
  return { ...res, alliances: sel.alliances, seed: sel.seed, mine: sel.mine };
}
