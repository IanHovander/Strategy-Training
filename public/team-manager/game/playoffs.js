// The playoffs: eight alliances, three rounds, every series the best two of three. Hers she plays: before each match
// the plan, at 0:30 the call, and between matches whatever she wants to change, against an alliance whose own drive
// coach is doing the same (event.js coachPlans: a real defender goes on her best scorer). The other series are played
// out by the simulation with nobody watching, and the bracket fills in. Lose a series and she's out; win three and the
// banner's hers.
//
// The dice are honest and nothing is scripted but one loose battery strap: 6834's, which lets go in its alliance's
// second quarterfinal match unless someone's told its pit crew (st.flags.strap). Whoever has 6834 has that coming.
//
//   playoffs(st, { alliances, stats, seed, guided })
//     alliances   [{ seed, teams }] from alliance selection, in order
//     stats       event.js fieldStats, for the other alliances' coaches
//     seed        the playoffs' dice
//     guided      the opening's: her first match is played on the drive coach's plan, so the first thing she's asked
//                 is the call at 0:30; the plan is hers from the second match on
//   resolves with { reached: 'qf' | 'sf' | 'f' | 'won', bracket, out (the alliance that beat her, or null) }

import { show } from './run.js';
import { Plan } from './plan.js';
import { Watch } from './watch.js';
import { bracketCard, seriesCard } from './cards.js';
import { OURS, QUARTERS, playMatch, playSeries, coachPlans, usualChoice, planFrom } from './event.js';
import { discover, save, robotAt } from './state.js';
import { toast } from './hud.js';
import { withClimbs } from './quals.js';

const NAMES = ['QUARTERFINAL', 'SEMIFINAL', 'FINAL'], SHORT = ['QF', 'SF', 'F'], REACHED = ['qf', 'sf', 'f'];
/** Saturday's robots: every team's last form. */
const K = 9;

/** 6834's battery strap: it lets go 1:12 from the end of its second quarterfinal match, unless its crew's been told. */
const strap = (st, nums, round, n) => (!st.flags.strap && round === 0 && n === 2 && nums.includes('6834')
  ? { 6834: { force: { troubles: [{ t: 78, why: 'brownout', dead: true }] } } } : null);

export async function playoffs(st, { alliances, stats, seed, guided = false }) {
  const ours = alliances.findIndex((a) => a.teams.includes(OURS));
  const bracket = { alliances, rounds: [QUARTERS.map(([hi, lo]) => ({ hi, lo, wins: null, winner: null }))] };
  await show(bracketCard(st, bracket, { line: `WE ARE ALLIANCE ${alliances[ours].seed}.` }));
  let choices = null;
  for (let r = 0; r < 3; r++) {
    const round = bracket.rounds[r], mine = round.find((sr) => sr.hi === ours || sr.lo === ours);
    // Hers, played; then everyone else's, with nobody watching.
    const side = mine.hi === ours ? 'red' : 'blue', them = mine.hi === ours ? mine.lo : mine.hi;
    const got = await ourSeries(st, { r, side, us: alliances[ours], them: alliances[them], stats, seed: seed * 50 + r * 7, guided: guided && r === 0, choices });
    choices = got.choices;
    mine.wins = side === 'red' ? [got.wins.us, got.wins.them] : [got.wins.them, got.wins.us];
    mine.winner = got.wins.us > got.wins.them ? ours : them;
    round.forEach((sr, i) => {
      if (sr === mine) return;
      const red = alliances[sr.hi].teams, blue = alliances[sr.lo].teams;
      const s = playSeries(seed * 50 + r * 7 + i + 1, red, blue, { stats, mods: (k) => strap(st, [...red, ...blue], r, k + 1) });
      sr.wins = [s.wins.red, s.wins.blue];
      sr.winner = s.winner === 'red' ? sr.hi : sr.lo;
    });
    save(st);
    if (mine.winner !== ours) {
      await show(bracketCard(st, bracket, { title: `THE ${NAMES[r]}S`.replace('FINALS', 'FINAL'), line: `ALLIANCE ${alliances[ours].seed} IS OUT.` }));
      return { reached: REACHED[r], bracket, out: alliances[them] };
    }
    if (r === 2) break;
    const w = round.map((sr) => sr.winner);
    const pairs = r === 0 ? [[w[0], w[1]], [w[2], w[3]]] : [[w[0], w[1]]];
    bracket.rounds.push(pairs.map(([a, b]) => ({ hi: Math.min(a, b), lo: Math.max(a, b), wins: null, winner: null })));
    await show(bracketCard(st, bracket, { line: r === 0 ? "WE'RE THROUGH TO THE SEMIFINAL!" : "WE'RE IN THE FINAL!" }));
  }
  return { reached: 'won', bracket, out: null };
}

/** One series of hers: match after match till someone has two. */
async function ourSeries(st, { r, side, us, them, stats, seed, guided, choices }) {
  const wins = { us: 0, them: 0 }, name = NAMES[r];
  const match = side === 'red' ? { red: us.teams, blue: them.teams } : { red: them.teams, blue: us.teams };
  for (let n = 1; wins.us < 2 && wins.them < 2 && n <= 5; n++) {
    await show(seriesCard(st, {
      name, us: us.teams, them: them.teams, usSeed: us.seed, themSeed: them.seed, wins, ours: side, n,
      line: guided && n === 1 ? 'THE DRIVE COACH HAS THE PLAN FOR THIS ONE. THE CLIMBS ARE YOURS.' : null,
    }));
    const title = `${name} ${n}`, tag = `${SHORT[r]}${n}`;
    let plans;
    if (guided && n === 1) {
      // The opening's first match: the drive coach has it. Everyone does what they do.
      choices = Object.fromEntries(us.teams.map((num) => [num, usualChoice(num, robotAt(num, K))]));
      let walls = 0;
      for (const c of Object.values(choices)) {
        if (c.job !== 'defend') continue;
        if (walls++) Object.assign(c, { job: 'score', on: null, where: 'any' });
        else c.on = them.teams[0];
      }
      plans = Object.fromEntries(Object.entries(choices).map(([num, c]) => [num, planFrom(c)]));
    } else {
      const made = await show(new Plan({
        st, title, sub: `SERIES ${wins.us}-${wins.them}. FIRST TO TWO WINS GOES THROUGH.`, ours: side, team: us.teams, foes: them.teams,
        round: K, start: choices, note: 'THE OTHER SIDE WILL PLAN FOR US TOO.',
      }), { fade: false });
      choices = made.choices;
      plans = made.plans;
    }
    const theirs = coachPlans(them.teams, us.teams, stats), mods = strap(st, [...us.teams, ...them.teams], r, n);
    const sim = (climbs) => playMatch(seed * 11 + n, match, { k: K, plans: { ...theirs, ...withClimbs(plans, climbs) }, mods, record: true });
    const after = (res) => {
      const won = res.winner === side, tie = res.winner === 'tie';
      const w = { us: wins.us + (won ? 1 : 0), them: wins.them + (!won && !tie ? 1 : 0) };
      return tie ? 'A TIE: PLAYED AGAIN' : w.us >= 2 ? `WE TAKE THE SERIES ${w.us}-${w.them}!` : w.them >= 2 ? `OUT, ${w.us}-${w.them}.` : `THE SERIES: ${w.us}-${w.them}`;
    };
    const out = await show(new Watch({ st, title, tag, sim, ours: side, team: us.teams, round: K, call: true, rp: false, after, name }), { fade: false });
    if (out.result.winner === side) wins.us++;
    else if (out.result.winner !== 'tie') wins.them++;
    toast(discover(st, { call: out.call }));
    save(st);
  }
  return { wins, choices };
}
