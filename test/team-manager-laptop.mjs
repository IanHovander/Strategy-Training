// Checks for Blue Banner's laptop scene: the Showdown run on the laptop (public/team-manager/laptop/room.js) with
// Strategy Training's own rules, the strategist on one side and the practice bot (rival.js) on the other. A fake clock
// runs the pick clocks and the rival's thinking in no time.
//   node test/team-manager-laptop.mjs
import * as rules from '../games/frc-strategy/draft-rules.js';
import { DRAFT } from '../games/frc-strategy/lesson1-draft.js';
import { laptopRoom, HER, RIVAL } from '../public/team-manager/laptop/room.js';
import { makeRival } from '../public/team-manager/laptop/rival.js';

let failures = 0;
const check = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failures++;
};

let now = 0;
const clock = () => now;
/** Run the room for a while: a tick every 100 ms of fake time. */
function run(room, seconds, until = () => false) {
  for (let t = 0; t < seconds * 10 && !until(); t++) {
    now += 100;
    room.tick();
  }
}

const room = laptopRoom(rules, { rival: makeRival(), clock });
room.start();
let v = room.view();
const us = v.group, them = 1 - us;
check(v.phase === 'prep' && (us === 0 || us === 1), 'a new event opens on the picklists, and she runs one of the two alliances');
check(v.captain && v.event.length === DRAFT.teams.length && v.event.every((s, i) => s.seed === i + 1 && s.scores.length === DRAFT.qualMatches), 'she captains her group, and every team is seeded with its ten scouted matches');
check(JSON.stringify(v.alliances) === JSON.stringify([[v.event[0].id], [v.event[1].id]]), 'the top two seeds captain the alliances');
check(!JSON.stringify(v).includes('"cycles"') && !JSON.stringify(v).includes('"note"'), 'her view carries the scouting, never the teams’ true attributes');

// Her picklist: the bottom three seeds, worst first, and the fourth seed on Do Not Pick (not the third, who becomes
// her captain if she's Alliance 2 and Alliance 1 takes hers).
const ids = v.event.map((s) => s.id);
const mine = ids.slice(-3).reverse();
for (const id of mine) room.send('picklist', { teamId: id, list: 'pick' });
room.send('picklist', { teamId: ids[3], list: 'dnp' });
run(room, 10);
v = room.view();
check(JSON.stringify(v.picklist.pick) === JSON.stringify(mine) && v.picklist.dnp[0] === ids[3], 'her picklist and Do Not Pick keep what she put on them');
const rivalView = rules.playerView(room.ctx, RIVAL, { phase: 'prep' });
check(rivalView.picklist.pick.length === ids.length && !rivalView.picklist.dnp.length, 'the rival ranks every team on its own list');
check(JSON.stringify(rivalView.picklist) !== JSON.stringify(v.picklist), 'neither sees the other’s picklist');
check(room.send('invite', { teamId: ids[5] }).error, 'no invitations before selection');

room.next();
v = room.view();
check(v.phase === 'select' && v.turn === 0 && v.deadline != null, 'selection starts with Alliance 1 on the clock');

// Selection: she never invites, so each of her picks goes to the top of her list when the clock runs out.
for (let k = 0; k < DRAFT.order.length; k++) {
  v = room.view();
  if (v.phase !== 'select') break;
  const hers = DRAFT.order[k] === us;
  const t0 = now;
  // (A view's lists are the room's own, live: read what she'd get before the pick is made.)
  const expected = v.picklist.pick.find((id) => !v.alliances.flat().includes(id));
  run(room, DRAFT.pickSeconds[k] + 2, () => room.view().pick > k || room.view().phase !== 'select');
  const after = room.view();
  const took = after.lastPick;
  if (hers) {
    check(took.auto && took.teamId === expected && now - t0 >= DRAFT.pickSeconds[k] * 1000, `pick ${k + 1}: her clock ran out, so she got the top of her list (${took.teamId})`);
  } else {
    check(!took.auto && now - t0 < DRAFT.pickSeconds[k] * 1000, `pick ${k + 1}: the rival invited ${took.teamId} in time`);
  }
}
v = room.view();
check(v.phase === 'plan' && v.alliances.every((a) => a.length === 3), 'after four picks, two alliances of three, and on to the first plan');
check(!v.alliances[us].includes(ids[3]), 'Do Not Pick kept that team off her alliance');
check(!v.alliances.flat().some((id, i, all) => all.indexOf(id) !== i), 'nobody is on two alliances');

// Plans: her first robot defends their first, the rest play offense; she locks in and the rival does too.
const [a, b] = [v.alliances[us], v.alliances[them]];
check(room.send('assign', { teamId: b[0], target: 'offense' }).error, 'she can’t assign the other alliance’s robots');
room.send('assign', { teamId: a[0], target: b[0], ifDefending: b[1] });
check(JSON.stringify(room.view().assign[a[0]]) === JSON.stringify({ target: b[0], ifDefending: b[1] }), 'a defender takes a target and what to do if it defends too');
room.send('lock', {});
run(room, 30, () => room.view().phase !== 'plan');
v = room.view();
check(v.phase === 'result' && v.results.length === 1 && v.results[0].odds === null, 'once both lock in the match plays, its win chances hidden till the reveal');
const r = v.results[0];
check(r.roles[a[0]].role === 'defend' && [b[0], b[1]].includes(r.roles[a[0]].target), 'her defender played the plan');
check(r.scores[us] === a.filter((id) => r.roles[id].role === 'offense').reduce((s, id) => s + r.cycles[id], 0), 'her score is her offense robots’ cycles');

// The rest of the series.
for (let m = 1; m < 8 && room.view().phase !== 'final'; m++) {
  room.next();
  if (room.view().phase === 'final') break;
  room.send('lock', {});
  run(room, 30, () => room.view().phase !== 'plan');
}
v = room.view();
check(v.phase === 'final' && v.reveal && (v.wins.includes(2) || v.results.length === DRAFT.maxMatches), 'the series ends at two wins (or five matches) on the reveal');
check(v.results.every((x) => x.odds && Math.abs(x.odds.win[0] + x.odds.tie + x.odds.win[1] - 1) < 1e-6), 'the reveal has every match’s win chances');

// The plan backstop: if nobody locks, the match plays when the plan clock runs out.
const lazy = laptopRoom(rules, { rival: null, clock });
lazy.start();
lazy.next();
run(lazy, DRAFT.pickSeconds.reduce((x, y) => x + y, 0) + 10, () => lazy.view().phase !== 'select');
check(lazy.view().phase === 'plan', 'with nobody inviting, every pick is made when its clock runs out');
run(lazy, DRAFT.planSeconds + 5, () => lazy.view().phase !== 'plan');
check(lazy.view().phase === 'result', 'with nobody locking in, the match plays when the plan clock runs out');

// Again: a new event, fresh scouting.
const event = JSON.stringify(room.view().event);
room.start();
v = room.view();
check(v.phase === 'prep' && JSON.stringify(v.event) !== event && !v.picklist.pick.length, 'training again starts a new event with fresh scouting and an empty picklist');
check(HER.connected && RIVAL.connected, 'both players stay connected');

console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
process.exit(failures ? 1 : 0);
