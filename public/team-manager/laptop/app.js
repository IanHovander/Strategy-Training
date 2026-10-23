// The scouting app on the laptop: the Showdown, a page for each of its phases, drawn from her playerView (room.js) and
// the Showdown's own content (games/frc-strategy/lesson1-draft.js: the teams, the rules, the lessons). Like her phone
// in the team game, it shows the scouting everyone has and her own picklist and plans; the truth only at the reveal.
//
//   drawApp(f)   the whole display for this frame. f = { v, ui, spots, focus, t, now, send, next, restart, toast }:
//                v her view, ui the app's own state (scene.js), spots filled in as it draws (kit.js spot), focus the
//                hotspot the cursor's on, t the scene's clock, now the room's (Date.now), send/next/restart the room's
//                and toast(text) a message along the bottom
//   moveGrab(f, dx, dy)   the stick, with a team picked up on the picklist page: up and down the list, across to the
//                other list
//
// The pages, as tabs along the title bar, with the one thing to do next on the gold button at its right:
//   prep     TEAMS (the scouting table, the picked-out team's histogram and numbers, and buttons for the lists),
//            PICKLIST (her list and Do Not Pick, to put in order) and RULES. START PICKS ends the prep.
//   select   the same, with both alliances along the top and the pick clock. On her turn, INVITE.
//   plan     PLAN (each of her robots: offense, or defend one of theirs, and what to do if it defends too), ROBOTS
//            (the six robots' scouting) and RULES. LOCK IN.
//   result   the match: the score counting up, and what each robot did. NEXT MATCH, or THE REVEAL.
//   final    SERIES (the result, and her chance in every match), THE TRUTH (what the scouts saw beside what each robot
//            really was) and LESSONS. TRAIN AGAIN.
//
// The display is the bezel's inside (kit.js D): the title bar from row 4, a strip of news under it, the page, and the
// line along the bottom that says what the cursor's on.

import { C, fill, text, measure } from '../pixel.js';
import { DRAFT, MAX_CYCLES } from '../../games/frc-strategy/lesson1-draft.js';
import { cycleCounts, keepShare, clock as matchClock } from '../../games/frc-strategy/alliance.js';
import { D, UI, side, plain, fit, wrap, mmss, pct, spot, button, tab, row, ink, histogram, tile, box } from './kit.js';

// ---- Reading the view ----
const truth = (id) => DRAFT.teams.find((t) => t.id === id) ?? null;
export const nameOf = (id) => plain(truth(id)?.name ?? '?');
const scoutOf = (v, id) => v.event.find((s) => s.id === id);
const avg = (s) => s.scores.reduce((a, b) => a + b, 0) / s.scores.length;
const zeros = (s) => s.scores.filter((x) => x === 0).length;
const allianceOf = (v, id) => v.alliances.findIndex((ids) => ids.includes(id));
const trueMean = (t) => t.cycles.reduce((a, p, n) => a + p * n, 0);
/** Whether she may invite this team now: not on an alliance, except Alliance 2's captain for Alliance 1's first pick. */
export const mayInvite = (v, id) => !v.alliances.flat().includes(id) || (v.turn === 0 && v.pick === 0 && v.alliances[1][0] === id);
const onClock = (v) => v.phase === 'select' && v.turn === v.group && v.captain;
const short = (i) => `A${i + 1}`;
const listed = (v, id) => (v.picklist?.pick.includes(id) ? 'pick' : v.picklist?.dnp.includes(id) ? 'dnp' : null);

// ---- Rows on the page ----
const TOP = D.y; // the title bar's top row
const STRIP = TOP + 10; // the news strip under it
const INFO = D.y + D.h - 7; // the line along the bottom
const ROW = 6;

// ---- The frame round every page ----
/** The title bar: 5026 SCOUT, the tabs, and the gold button at the right. */
function titleBar(f, tabs, primary) {
  fill(D.x, TOP, D.w, 10, UI.bar);
  fill(D.x, TOP, D.w, 1, UI.barHi);
  fill(D.x, TOP + 9, D.w, 1, C.ink);
  text('5026', D.x + 3, TOP + 2, { color: UI.gold });
  text('SCOUT', D.x + 30, TOP + 2, { color: UI.bright });
  const open = f.ui.tab[f.v.phase];
  let x = D.x + 63;
  for (const t of tabs) {
    const w = measure(t.label, { font: 3 }) + 9;
    tab(f, {
      id: `tab:${t.id}`, x, y: TOP + 1, w, label: t.label, open: open === t.id, a: `OPEN ${t.label}`, info: t.info,
      act: () => (f.ui.tab[f.v.phase] = t.id),
    });
    x += w + 1;
  }
  if (primary) {
    const w = measure(primary.label, { font: 3 }) + 10;
    button(f, { id: 'primary', x: D.x + D.w - w - 2, y: TOP + 1, w, h: 8, tone: 'gold', ...primary });
  }
}
/** The strip under the title bar: one line, or two (lines), with a clock at the right if there's one running. */
function strip(f, lines, clock = null) {
  const two = lines.length > 1, h = two ? 14 : 8;
  fill(D.x, STRIP, D.w, h, UI.panel);
  fill(D.x, STRIP + h - 1, D.w, 1, UI.edge);
  // The clock at the right (in the big letters when there's room), what it's counting over it or beside it.
  let room = D.w - 4;
  if (clock) {
    const o = two ? {} : { font: 3 }, w = measure(clock.time, o) + 6, x = D.x + D.w - w;
    box(x, STRIP, w, h - 1, clock.urgent ? C.red1 : C.night3, null, C.ink);
    text(clock.time, x + 3, STRIP + (two ? 3 : 1), { ...o, color: clock.urgent && Math.floor(f.t * 2) % 2 ? C.yel2 : C.white });
    const lw = clock.label ? measure(clock.label, { font: 3 }) + 4 : 0;
    if (clock.label) text(clock.label, x - 3, STRIP + (two ? 4 : 1), { font: 3, color: clock.urgent ? UI.goldHi : UI.label, align: 'right' });
    room = x - D.x - lw - 6;
  }
  lines.forEach((l, i) => {
    let x = D.x + 3;
    for (const [str, c] of l) {
      const left = D.x + 3 + room - x;
      if (left < 8) break;
      x += text(fit(str, left), x, STRIP + 1 + i * 6, { font: 3, color: c }) + 4;
    }
  });
  return STRIP + h;
}
/** The line along the bottom: the latest news while it's fresh, else what the cursor's on. */
function infoLine(f) {
  fill(D.x, INFO, D.w, 7, UI.info);
  const cur = f.spots.find((s) => s.id === f.focus);
  const toast = f.ui.toast && f.now < f.ui.toast.until ? f.ui.toast.text : null;
  const str = toast ?? cur?.info ?? '';
  text(fit(plain(str), D.w - 6), D.x + 3, INFO + 1, { font: 3, color: toast ? UI.goldHi : UI.text });
}
/** The phase's clock, if it has one: { time, urgent } in the last ten seconds. */
const clockOf = (f, label) => (f.v.deadline ? { time: mmss(f.v.deadline - f.now), urgent: f.v.deadline - f.now < 10500, label } : null);
/** The two alliances as they stand, for the strip: A1 APEX, GHOST, ... (YOU on hers). */
function allianceLines(v) {
  return [0, 1].map((i) => {
    const ids = v.alliances[i];
    const names = [0, 1, 2].map((k) => (ids[k] ? nameOf(ids[k]) : '...'));
    return [[short(i), side(i).hi], [names.join(', '), UI.bright], ...(i === v.group ? [['(YOU)', UI.gold]] : [])];
  });
}

// ---- The scouting table and the panel beside it ----
const COLS = { mark: 12, seed: 21, name: 24, avg: 91, zeros: 101, sus: 115, def: 129 };
const TABLE_W = 128;
/** The columns to sort by, each with its heading, its column and its order. */
const SORTS = {
  seed: { label: 'SEED', at: 'seed', by: (a, b) => a.seed - b.seed },
  avg: { label: 'AVG', at: 'avg', by: (a, b) => avg(b) - avg(a) || a.seed - b.seed },
  zeros: { label: '0S', at: 'zeros', by: (a, b) => zeros(a) - zeros(b) || avg(b) - avg(a) },
  sus: { label: 'SUS', at: 'sus', by: (a, b) => a.susceptibility - b.susceptibility || a.seed - b.seed },
  def: { label: 'DEF', at: 'def', by: (a, b) => b.defense - a.defense || a.seed - b.seed },
};
const SORT_INFO = {
  seed: 'SORT BY SEED: WHERE THEY RANKED AFTER QUALIFICATIONS',
  avg: 'SORT BY AVERAGE CYCLES OVER THEIR TEN MATCHES',
  zeros: 'SORT BY ZEROS: MATCHES WITH NO CYCLES AT ALL (A BREAKDOWN)',
  sus: 'SORT BY SUSCEPTIBLE (%): HOW MUCH DEFENSE SLOWS THEM, LEAST FIRST',
  def: 'SORT BY DEFENSE (%): HOW GOOD THEY ARE AT DEFENDING, BEST FIRST',
};

/**
 * The scouting table: a header to sort by and a row a team, scrolled to keep the cursor's row in sight. ids: which teams
 * (every team, or the six on the field); act(id): what A does on a row.
 */
function table(f, y0, ids, act, rowA) {
  const { v, ui } = f;
  const sort = SORTS[ui.sort] ?? SORTS.seed;
  let teams = ids.map((id) => scoutOf(v, id)).sort(sort.by);
  // In selection, the teams still there to pick come first.
  const free = (s) => allianceOf(v, s.id) < 0 || (onClock(v) && mayInvite(v, s.id));
  if (v.phase === 'select') teams = [...teams.filter(free), ...teams.filter((s) => !free(s))];
  // The header.
  fill(D.x, y0, TABLE_W, 7, UI.panel);
  for (const [key, s] of Object.entries(SORTS)) {
    const right = COLS[s.at], w = measure(s.label, { font: 3 }) + 2, x = right - w + 1;
    const on = spot(f, { id: `sort:${key}`, x: x - 1, y: y0, w: w + 2, h: 7, a: `SORT BY ${s.label}`, info: SORT_INFO[key], act: () => (ui.sort = key) });
    if (on) fill(x - 1, y0, w + 2, 7, UI.blue);
    text(s.label, right, y0 + 1, { font: 3, color: on ? UI.bright : ui.sort === key ? UI.gold : UI.label, align: 'right' });
    if (ui.sort === key) fill(x, y0 + 6, w - 2, 1, UI.gold);
  }
  text('TEAM', COLS.name, y0 + 1, { font: 3, color: UI.label });
  // The rows, scrolled so the cursor's row is in sight.
  const top = y0 + 7, fits = Math.floor((INFO - top) / ROW);
  const at = teams.findIndex((s) => f.focus === `team:${s.id}`);
  let first = ui.scroll ?? 0;
  if (at >= 0) first = Math.min(Math.max(first, at - fits + 1), at);
  first = Math.max(0, Math.min(first, teams.length - fits));
  ui.scroll = first;
  teams.slice(first, first + fits).forEach((s, k) => {
    const y = top + k * ROW, id = s.id, a = allianceOf(v, id), list = listed(v, id);
    // A click on a row only picks it out (the panel shows it); the stick's A acts on it too.
    const r = { id: `team:${id}`, x: D.x, y, w: TABLE_W, h: ROW, act: () => act(id), tap: () => {}, a: rowA(id), info: rowInfo(v, s), nav: { right: 'detail' } };
    const on = row(f, r, first + k, { picked: ui.sel === id && !f.focus?.startsWith('team:') });
    if (on) ui.sel = id;
    const taken = v.phase !== 'plan' && !free(s);
    const c = (col) => ink(on, false, taken ? UI.dim : col);
    if (a >= 0) {
      fill(D.x + 1, y + 1, 9, 5, side(a).mid);
      text(short(a), D.x + 6, y + 1, { font: 3, color: UI.bright, align: 'center' });
    } else if (list) text(list === 'pick' ? String(v.picklist.pick.indexOf(id) + 1) : 'X', COLS.mark, y + 1, { font: 3, color: ink(on, false, list === 'pick' ? UI.gold : UI.redHi), align: 'right' });
    text(`${s.seed}`, COLS.seed, y + 1, { font: 3, color: c(UI.label), align: 'right' });
    text(fit(nameOf(id), COLS.avg - COLS.name - 17), COLS.name, y + 1, { font: 3, color: c(list === 'dnp' ? UI.redHi : UI.bright) });
    text(avg(s).toFixed(1), COLS.avg, y + 1, { font: 3, color: c(UI.text), align: 'right' });
    text(String(zeros(s)), COLS.zeros, y + 1, { font: 3, color: c(zeros(s) ? UI.redHi : UI.text), align: 'right' });
    text(String(Math.round(100 * s.susceptibility)), COLS.sus, y + 1, { font: 3, color: c(UI.text), align: 'right' });
    text(String(Math.round(100 * s.defense)), COLS.def, y + 1, { font: 3, color: c(UI.text), align: 'right' });
  });
  // A scroll bar, if they don't all fit.
  if (teams.length > fits) {
    const h = fits * ROW, bar = Math.max(4, Math.round((h * fits) / teams.length));
    fill(D.x + TABLE_W, top, 2, h, UI.panel);
    fill(D.x + TABLE_W, top + Math.round(((h - bar) * first) / (teams.length - fits)), 2, bar, UI.label);
  }
  if (!teams.some((s) => s.id === ui.sel)) ui.sel = teams[0]?.id ?? null;
}
function rowInfo(v, s) {
  const a = allianceOf(v, s.id), on = a >= 0 ? ` - ON ALLIANCE ${a + 1}${v.alliances[a][0] === s.id ? ' (CAPTAIN)' : ''}` : '';
  return `${nameOf(s.id)}, SEED ${s.seed}: ${avg(s).toFixed(1)} CYCLES A MATCH, ${zeros(s)} ZEROS IN ${s.scores.length}${on}`;
}

/**
 * The panel beside the table: the team picked out, its ten matches as a histogram, its numbers, and what she can do
 * with it here: put it on her picklist or Do Not Pick (prep and selection), and invite it (her turn).
 */
function detail(f, x, y0, id, { lists = true } = {}) {
  const { v, ui } = f;
  const s = id && scoutOf(v, id);
  if (!s) return;
  const w = D.x + D.w - x - 2, a = allianceOf(v, id);
  text(fit(nameOf(id), w - 26, {}), x, y0 + 2, { color: UI.bright });
  if (a >= 0) {
    const tag = `${short(a)}${v.alliances[a][0] === id ? ' CAPTAIN' : ''}`;
    const tw = measure(tag, { font: 3 }) + 4;
    fill(x + w - tw, y0 + 2, tw, 7, side(a).mid);
    text(tag, x + w - tw + 2, y0 + 3, { font: 3, color: UI.bright });
  }
  text(`CYCLES IN ${s.scores.length} MATCHES`, x, y0 + 12, { font: 3, color: UI.label });
  text(`SEED ${s.seed}`, x + w, y0 + 12, { font: 3, color: UI.text, align: 'right' });
  const counts = cycleCounts(s.scores, MAX_CYCLES);
  histogram(x + 1, y0 + 19, w - 2, 30, counts.map((c) => c / s.scores.length), { counts });
  const tw = Math.floor((w - 6) / 4);
  tile(x, y0 + 51, tw, 'AVG', avg(s).toFixed(1));
  tile(x + tw + 2, y0 + 51, tw, 'ZEROS', `${zeros(s)}/${s.scores.length}`, zeros(s) ? UI.redHi : UI.bright);
  tile(x + 2 * (tw + 2), y0 + 51, tw, 'SUS', pct(s.susceptibility));
  tile(x + 3 * (tw + 2), y0 + 51, w - 3 * (tw + 2), 'DEF', pct(s.defense));
  if (!lists) return;
  const list = listed(v, id), name = nameOf(id), bw = Math.floor((w - 2) / 2);
  const back = { left: `team:${id}`, up: `team:${id}` };
  const buttons = [
    {
      id: 'detail', label: list === 'pick' ? `ON LIST: ${v.picklist.pick.indexOf(id) + 1}` : '+ PICKLIST', tone: list === 'pick' ? 'on' : 'plain',
      a: list === 'pick' ? 'TAKE OFF PICKLIST' : 'ADD TO PICKLIST',
      info: list === 'pick' ? `${name} IS NUMBER ${v.picklist.pick.indexOf(id) + 1} ON YOUR PICKLIST. A TAKES IT OFF.` : `PUT ${name} AT THE BOTTOM OF YOUR PICKLIST`,
      act: () => f.send('picklist', { teamId: id, list: list === 'pick' ? 'bank' : 'pick' }),
    },
    {
      id: 'detail:dnp', label: list === 'dnp' ? 'NOT PICKING' : 'DO NOT PICK', tone: list === 'dnp' ? 'red' : 'plain',
      a: list === 'dnp' ? 'TAKE OFF DO NOT PICK' : 'DO NOT PICK',
      info: list === 'dnp' ? `${name} IS ON DO NOT PICK. A TAKES IT OFF.` : `RULE ${name} OUT: IF TIME RUNS OUT ON A PICK, IT'S NEVER YOURS`,
      act: () => f.send('picklist', { teamId: id, list: list === 'dnp' ? 'bank' : 'dnp' }),
    },
  ];
  const yb = y0 + 71;
  // On her turn, the invitation: A once to ask, again to be sure (it can't be taken back).
  if (onClock(v) && mayInvite(v, id)) {
    button(f, {
      id: 'detail', x, y: yb, w, h: 11, tone: 'gold', label: `INVITE ${name}`, nav: back, a: `INVITE ${name}`,
      info: `YOUR ALLIANCE RESPECTFULLY INVITES ${name} TO JOIN IT`,
      sure: { label: `INVITE ${name}?`, a: `YES, INVITE ${name}`, info: 'SURE? AN INVITATION CAN\'T BE TAKEN BACK. A AGAIN TO SEND IT.' },
      act: () => {
        const r = f.send('invite', { teamId: id });
        if (r?.error) f.toast(r.error);
      },
    });
    buttons.forEach((b, k) => button(f, { ...b, id: k ? 'detail:dnp' : 'detail:pick', x: x + k * (bw + 2), y: yb + 13, w: k ? w - bw - 2 : bw, nav: back }));
    return;
  }
  buttons.forEach((b, k) => button(f, { ...b, x: x + k * (bw + 2), y: yb, w: k ? w - bw - 2 : bw, nav: back }));
}

/** The TEAMS page: the table and the panel. In selection, A on her turn goes to the invitation. */
function teamsPage(f, y0) {
  const { v } = f;
  table(f, y0, v.event.map((s) => s.id), (id) => {
    if (onClock(v) && mayInvite(v, id)) return (f.ui.goto = 'detail');
    f.send('picklist', { teamId: id, list: listed(v, id) === 'pick' ? 'bank' : 'pick' });
  }, (id) => (onClock(v) && mayInvite(v, id) ? 'CHOOSE' : listed(v, id) === 'pick' ? 'TAKE OFF PICKLIST' : 'ADD TO PICKLIST'));
  detail(f, D.x + TABLE_W + 4, y0, f.ui.sel);
}

// ---- The picklist page ----
/**
 * Her picklist and Do Not Pick side by side. A on a team picks it up (gold); the stick moves it up and down its list
 * or across to the other one; A puts it down. With the mouse: click one to pick it up, then click where it goes.
 */
function listPage(f, y0) {
  const { v, ui } = f;
  const L = { x: D.x, w: 150 }, R = { x: D.x + 153, w: D.w - 153 };
  const head = (c, title, cols) => {
    fill(c.x, y0, c.w, 7, UI.panel);
    text(title, c.x + 3, y0 + 1, { font: 3, color: UI.label });
    for (const [label, x] of cols) text(label, c.x + x, y0 + 1, { font: 3, color: UI.label, align: 'right' });
  };
  head(L, 'PICKLIST, BEST FIRST', [['AVG', 95], ['0S', 105], ['SUS', 125], ['DEF', 146]]);
  head(R, 'DO NOT PICK', [['AVG', R.w - 4]]);
  const top = y0 + 8, fits = Math.floor((INFO - top) / ROW);
  const drop = (list, index) => {
    f.send('picklist', { teamId: ui.grab, list, index });
    ui.focus = `${list}:${ui.grab}`;
    ui.grab = null;
  };
  const rowAct = (list, id, index) => () => {
    if (!ui.grab) return (ui.grab = id);
    if (ui.grab === id) return (ui.grab = null);
    drop(list, index);
  };
  const lines = (c, list, ids) => {
    ids.slice(0, fits).forEach((id, k) => {
      const s = scoutOf(v, id), y = top + k * ROW, grabbed = ui.grab === id, a = allianceOf(v, id);
      const on = row(f, {
        id: `${list}:${id}`, x: c.x, y, w: c.w, h: ROW, act: rowAct(list, id, k),
        a: !ui.grab ? `PICK UP ${nameOf(id)}` : grabbed ? 'PUT IT DOWN' : 'PUT IT HERE',
        info: grabbed ? 'UP AND DOWN TO MOVE IT, ACROSS FOR THE OTHER LIST, A TO PUT IT DOWN' : rowInfo(v, s),
      }, k, { grabbed });
      const col = (cc) => ink(on, grabbed, a >= 0 ? UI.dim : cc);
      if (list === 'pick') text(String(k + 1), c.x + 10, y + 1, { font: 3, color: col(UI.gold), align: 'right' });
      text(fit(nameOf(id), list === 'pick' ? 50 : c.w - 34), c.x + 13, y + 1, { font: 3, color: col(UI.bright) });
      if (a >= 0) {
        const cx = list === 'pick' ? c.x + 66 : c.x + c.w - 30;
        fill(cx, y + 1, 9, 5, side(a).mid);
        text(short(a), cx + 5, y + 1, { font: 3, color: UI.bright, align: 'center' });
      }
      text(avg(s).toFixed(1), list === 'pick' ? c.x + 95 : c.x + c.w - 4, y + 1, { font: 3, color: col(UI.text), align: 'right' });
      if (list === 'pick') {
        text(String(zeros(s)), c.x + 105, y + 1, { font: 3, color: col(zeros(s) ? UI.redHi : UI.text), align: 'right' });
        text(pct(s.susceptibility), c.x + 125, y + 1, { font: 3, color: col(UI.text), align: 'right' });
        text(pct(s.defense), c.x + 146, y + 1, { font: 3, color: col(UI.text), align: 'right' });
      }
    });
    // The rest of the column: somewhere to put a team down at the end of the list (and to move to when it's empty).
    const n = Math.min(ids.length, fits), y = top + n * ROW, h = INFO - y - 1;
    if (h >= ROW) {
      const on = spot(f, {
        id: `${list}:end`, x: c.x, y, w: c.w, h, a: ui.grab ? 'PUT IT HERE' : 'NOTHING HERE',
        info: ui.grab ? `A PUTS IT AT THE END OF ${list === 'pick' ? 'YOUR PICKLIST' : 'DO NOT PICK'}` : ids.length ? '' : list === 'pick' ? 'ADD TEAMS ON THE TEAMS TAB, OR WITH A ON THEIR ROW THERE' : 'TEAMS YOU WON\'T PICK GO HERE',
        act: () => ui.grab && drop(list, ids.length),
      });
      if (on && ui.grab) box(c.x + 2, y + 1, c.w - 4, ROW, UI.body, null, UI.goldHi);
      if (!ids.length) {
        const msg = list === 'pick' ? ['NOTHING ON IT YET.', 'ON THE TEAMS TAB, A ON A', 'TEAM ADDS IT HERE.'] : ['NOBODY YET.'];
        msg.forEach((m, k) => text(m, c.x + c.w / 2, y + 8 + k * 7, { font: 3, color: UI.dim, align: 'center' }));
      }
    }
  };
  lines(L, 'pick', v.picklist.pick);
  lines(R, 'dnp', v.picklist.dnp);
  fill(D.x + 151, y0, 1, INFO - y0, UI.edge);
}
/** The stick with a team picked up: up and down its list, or across to the other one. */
export function moveGrab(f, dx, dy) {
  const { v, ui } = f, id = ui.grab;
  const from = listed(v, id);
  if (!from) return (ui.grab = null);
  const ids = v.picklist[from], at = ids.indexOf(id);
  if (dx) {
    const to = dx > 0 ? 'dnp' : 'pick';
    if (to === from) return;
    f.send('picklist', { teamId: id, list: to, index: Math.min(at, v.picklist[to].length) });
    ui.focus = `${to}:${id}`;
    return;
  }
  const index = Math.max(0, Math.min(ids.length - 1, at + dy));
  if (index !== at) f.send('picklist', { teamId: id, list: from, index });
}

// ---- Pages of words: the rules and the lessons ----
function wordsPage(f, y0, key, paragraphs, { title = null } = {}) {
  const { ui } = f;
  const lines = [];
  if (title) lines.push({ str: title, color: UI.gold }, { gap: 3 });
  for (const p of paragraphs) {
    wrap(p, D.w - 16).forEach((str, k) => lines.push({ str, color: UI.text, bullet: k === 0 }));
    lines.push({ gap: 3 });
  }
  // Pages: as many lines as fit above the page buttons.
  const room = INFO - y0 - 14, pages = [[]];
  let used = 0;
  for (const l of lines) {
    const h = l.gap ?? ROW;
    if (used + h > room && pages.at(-1).length) {
      pages.push([]);
      used = 0;
    }
    if (l.gap && !pages.at(-1).length) continue;
    pages.at(-1).push(l);
    used += h;
  }
  const n = pages.length, page = Math.min(ui.page[key] ?? 0, n - 1);
  let y = y0 + 4;
  for (const l of pages[page]) {
    if (l.gap) {
      y += l.gap;
      continue;
    }
    if (l.bullet) fill(D.x + 5, y + 2, 2, 2, UI.gold);
    text(l.str, D.x + 10, y, { font: 3, color: l.color });
    y += ROW;
  }
  if (n > 1) {
    const by = INFO - 11;
    text(`${page + 1} OF ${n}`, D.x + D.w - 56, by + 2, { font: 3, color: UI.label, align: 'right' });
    button(f, { id: `${key}:prev`, x: D.x + D.w - 46, y: by, w: 21, label: '<', tone: page ? 'plain' : 'off', a: 'PAGE BACK', info: 'THE PAGE BEFORE', act: () => (ui.page[key] = Math.max(0, page - 1)) });
    button(f, { id: `${key}:next`, x: D.x + D.w - 23, y: by, w: 21, label: '>', tone: page < n - 1 ? 'plain' : 'off', a: 'NEXT PAGE', info: 'THE NEXT PAGE', home: true, act: () => (ui.page[key] = Math.min(n - 1, page + 1)) });
  }
}

// ---- The plan ----
/**
 * Each of her robots in a block: its numbers, then OFFENSE or DEFEND one of theirs (with what the scouts say it takes
 * off that robot's cycles), and, defending, what to do if that robot defends too: stay on it, or switch to another.
 */
function planPage(f, y0) {
  const { v } = f;
  const ours = v.alliances[v.group], theirs = v.alliances[1 - v.group];
  ours.forEach((id, k) => {
    const s = scoutOf(v, id), y = y0 + 2 + k * 33, a = v.assign?.[id] ?? 'offense', name = nameOf(id);
    const target = a === 'offense' ? null : a.target;
    fill(D.x, y - 1, D.w, 8, k % 2 ? UI.stripe : UI.panel);
    text(name, D.x + 4, y, { font: 3, color: UI.bright });
    text(`SEED ${s.seed}`, D.x + 8 + measure(name, { font: 3 }), y, { font: 3, color: UI.label });
    text(`AVG ${avg(s).toFixed(1)}   ZEROS ${zeros(s)}/${s.scores.length}   SUS ${pct(s.susceptibility)}   DEF ${pct(s.defense)}`, D.x + D.w - 4, y, { font: 3, color: UI.text, align: 'right' });
    const assign = (to, ifDefending = 'stay') => () => {
      const r = f.send('assign', { teamId: id, target: to, ifDefending });
      if (r?.error) f.toast(r.error);
    };
    const yb = y + 8;
    button(f, {
      id: `plan:${id}:offense`, x: D.x + 2, y: yb, w: 44, h: 14, label: 'OFFENSE', sub: `AVG ${avg(s).toFixed(1)}`, tone: target ? 'plain' : 'on',
      a: `${name}: OFFENSE`, info: `${name} SCORES CYCLES ALL MATCH: ${avg(s).toFixed(1)} A MATCH IN QUALS`, act: assign('offense'),
    });
    text('DEFEND', D.x + 61, yb + 5, { font: 3, color: UI.label, align: 'center' });
    theirs.forEach((t, j) => {
      const ts = scoutOf(v, t), cut = 1 - keepShare(s.defense, ts.susceptibility);
      const keep = a !== 'offense' && a.ifDefending !== t ? a.ifDefending : 'stay';
      button(f, {
        id: `plan:${id}:${t}`, x: D.x + 76 + j * 57, y: yb, w: 56, h: 14, label: nameOf(t), sub: `-${pct(cut)}`, tone: target === t ? 'on' : 'plain',
        a: `DEFEND ${nameOf(t)}`, act: assign(t, keep),
        info: `${name} DEFENDS ${nameOf(t)}: ${pct(s.defense)} X ${pct(ts.susceptibility)} = ${pct(cut)} OFF ITS CYCLES (${avg(ts).toFixed(1)} A MATCH)`,
      });
    });
    const yi = yb + 15;
    if (!target) {
      text(`PLAYS OFFENSE ALL MATCH`, D.x + 4, yi + 2, { font: 3, color: UI.dim });
      return;
    }
    const ts = scoutOf(v, target), weak = 1 - keepShare(s.defense, ts.susceptibility);
    text('IF IT DEFENDS:', D.x + 4, yi + 2, { font: 3, color: UI.label });
    button(f, {
      id: `plan:${id}:stay`, x: D.x + 62, y: yi, w: 62, label: `STAY ON IT -${pct(weak)}`, tone: a.ifDefending === 'stay' ? 'on' : 'plain',
      a: 'STAY ON IT', info: `IF ${nameOf(target)} DEFENDS TOO, ${name} SHADOWS IT: ITS DEFENSE DROPS BY ${pct(weak)}`, act: assign(target, 'stay'),
    });
    theirs.filter((t) => t !== target).forEach((t, j) => {
      button(f, {
        id: `plan:${id}:if:${t}`, x: D.x + 126 + j * 61, y: yi, w: 60, label: `TO ${nameOf(t)}`, tone: a.ifDefending === t ? 'on' : 'plain',
        a: `SWITCH TO ${nameOf(t)}`, info: `IF ${nameOf(target)} DEFENDS TOO, ${name} DEFENDS ${nameOf(t)} INSTEAD`, act: assign(target, t),
      });
    });
  });
}

// ---- A match ----
const TALLY = 3; // seconds the score takes to count up
/** What a robot did, in a line or two: "8 OF 9 CYCLES, 3 DEFENDED", "DEFENDED APEX, BROKE AT 1:21". */
function didLine(r, id) {
  const role = r.roles[id];
  if (role.role === 'offense') {
    const n = r.attempts[id] ?? 0;
    if (n === 0) return 'BROKE DOWN AT THE START';
    const d = r.defended[id];
    const guard = role.defenders.length ? (d === 0 ? ', ITS DEFENDER BROKE FIRST' : d === n ? ', ALL DEFENDED' : `, ${d} DEFENDED`) : '';
    return `${r.cycles[id]} OF ${n} CYCLES${guard}`;
  }
  const how = `${role.shadowing ? 'SHADOWED' : 'DEFENDED'} ${nameOf(role.target)}${role.switched ? ' (SWITCHED)' : ''}`;
  return r.brokeAt[id] != null ? `${how}, BROKE DOWN AT ${matchClock(r.brokeAt[id])}` : `${how} ALL MATCH`;
}
function resultPage(f, y0) {
  const { v, ui } = f;
  const r = v.results.at(-1), us = v.group, them = 1 - us;
  const k = Math.min(1, (f.t - (ui.tally ?? f.t)) / TALLY);
  const count = (n) => Math.round(n * k);
  const big = (n, x, i, align) => text(String(n), x, y0 + 4, { scale: 2, color: side(i).hi, outline: C.ink, align });
  big(count(r.scores[us]), 112, us, 'right');
  text('-', 128, y0 + 9, { align: 'center', color: UI.text });
  big(count(r.scores[them]), 144, them, 'left');
  text(`YOU (${short(us)})`, 104, y0 + 21, { font: 3, color: UI.label, align: 'right' });
  text(`THEM (${short(them)})`, 152, y0 + 21, { font: 3, color: UI.label });
  if (k >= 1) {
    const [word, c] = r.winner == null ? ['A TIE: REPLAY IT', UI.bright] : r.winner === us ? ['YOU WIN', UI.gold] : ['THEY WIN', UI.text];
    text(word, 128, y0 + 28, { align: 'center', color: c, outline: C.ink });
  }
  // Each robot, under its alliance.
  [us, them].forEach((i, col) => {
    const x = D.x + 4 + col * 124;
    v.alliances[i].forEach((id, j) => {
      const y = y0 + 39 + j * 19;
      fill(x - 2, y - 1, 120, 18, j % 2 ? UI.body : UI.stripe);
      fill(x - 2, y - 1, 1, 18, side(i).mid);
      const made = r.roles[id].role === 'offense' ? ` ${count(r.cycles[id])}` : '';
      text(`${nameOf(id)}${made}`, x, y, { font: 3, color: UI.bright });
      if (k >= 1) wrap(didLine(r, id), 114).slice(0, 2).forEach((l, n) => text(l, x, y + 6 + n * 6, { font: 3, color: r.brokeAt[id] != null || r.attempts[id] === 0 ? UI.redHi : UI.text }));
    });
  });
}

// ---- The reveal ----
function seriesPage(f, y0) {
  const { v } = f;
  const us = v.group, them = 1 - us;
  const [word, c] = v.champion == null ? ['A DRAWN SERIES', UI.bright] : v.champion === us ? ['YOUR ALLIANCE WON!', UI.gold] : [`ALLIANCE ${v.champion + 1} WON`, UI.text];
  text(word, 128, y0 + 4, { align: 'center', color: c, outline: C.ink });
  text(`${v.wins[us]} - ${v.wins[them]}`, 128, y0 + 14, { align: 'center', color: UI.bright });
  text('YOUR CHANCE IN EACH MATCH, GIVEN BOTH PLANS:', 128, y0 + 25, { font: 3, color: UI.label, align: 'center' });
  v.results.forEach((r, m) => {
    const y = y0 + 33 + m * 8;
    fill(D.x + 2, y - 1, D.w - 4, 7, m % 2 ? UI.body : UI.stripe);
    const res = r.winner == null ? 'TIE' : r.winner === us ? 'WIN' : 'LOSS';
    text(`MATCH ${m + 1}`, D.x + 6, y, { font: 3, color: UI.text });
    text(`${r.scores[us]}-${r.scores[them]}`, D.x + 60, y, { font: 3, color: UI.bright, align: 'right' });
    text(res, D.x + 66, y, { font: 3, color: res === 'WIN' ? UI.gold : UI.text });
    text(`YOU HAD ${pct(r.odds.win[us])}`, D.x + 96, y, { font: 3, color: UI.bright });
    text(`THEY HAD ${pct(r.odds.win[them])}`, D.x + 152, y, { font: 3, color: UI.text });
    text(`TIE ${pct(r.odds.tie)}`, D.x + D.w - 6, y, { font: 3, color: UI.label, align: 'right' });
  });
  const y = y0 + 37 + v.results.length * 8;
  text('YOUR ALLIANCE:', D.x + 6, y, { font: 3, color: UI.label });
  text(v.alliances[us].map(nameOf).join(', '), D.x + 66, y, { font: 3, color: side(us).hi });
  text('THEIRS:', D.x + 6, y + 7, { font: 3, color: UI.label });
  text(v.alliances[them].map(nameOf).join(', '), D.x + 66, y + 7, { font: 3, color: side(them).hi });
  text('THE TRUTH TAB: WHAT EVERY ROBOT REALLY WAS', 128, y + 20, { font: 3, color: UI.dim, align: 'center' });
}
/** Scouted beside true, a team a row, and the picked-out team's story: its note and its real cycles over the ten. */
function truthPage(f, y0) {
  const { v, ui } = f;
  const T = { name: 16, avg: 94, zeros: 116, sus: 140, def: 164 };
  fill(D.x, y0, 168, 7, UI.panel);
  [['TEAM', T.name, 'left'], ['AVG', T.avg], ['0S%', T.zeros], ['SUS%', T.sus], ['DEF%', T.def]].forEach(([l, x, align = 'right']) => text(l, x, y0 + 1, { font: 3, color: UI.label, align }));
  const top = y0 + 7;
  v.event.forEach((s, k) => {
    const id = s.id, t = truth(id), y = top + k * ROW, a = allianceOf(v, id);
    const on = row(f, {
      id: `truth:${id}`, x: D.x, y, w: 168, h: ROW, a: 'READ ABOUT IT', act: () => {},
      info: `${nameOf(id)}: WHAT THE SCOUTS SAW > WHAT IT REALLY WAS. 0S%: MATCHES WITH NO CYCLES`,
    }, k);
    if (on) ui.sel = id;
    if (a >= 0) {
      fill(D.x + 1, y + 1, 9, 5, side(a).mid);
      text(short(a), D.x + 6, y + 1, { font: 3, color: UI.bright, align: 'center' });
    }
    const c = (col) => ink(on, false, col);
    text(fit(nameOf(id), 46), T.name, y + 1, { font: 3, color: c(UI.bright) });
    text(`${avg(s).toFixed(1)}>${trueMean(t).toFixed(1)}`, T.avg, y + 1, { font: 3, color: c(UI.text), align: 'right' });
    text(`${Math.round((100 * zeros(s)) / s.scores.length)}>${Math.round(100 * t.cycles[0])}`, T.zeros, y + 1, { font: 3, color: c(t.cycles[0] >= 0.15 ? UI.redHi : UI.text), align: 'right' });
    text(`${Math.round(100 * s.susceptibility)}>${Math.round(100 * t.susceptibility)}`, T.sus, y + 1, { font: 3, color: c(UI.text), align: 'right' });
    text(`${Math.round(100 * s.defense)}>${Math.round(100 * t.defense)}`, T.def, y + 1, { font: 3, color: c(UI.text), align: 'right' });
  });
  fill(D.x + 169, y0, 1, INFO - y0, UI.edge);
  const id = ui.sel && truth(ui.sel) ? ui.sel : v.event[0].id, t = truth(id), s = scoutOf(v, id);
  const x = D.x + 172, w = D.x + D.w - x - 2;
  text(fit(nameOf(id), w, { font: 3 }), x, y0 + 2, { font: 3, color: UI.gold });
  wrap(t.note, w).forEach((l, k) => text(l, x, y0 + 10 + k * 6, { font: 3, color: UI.text }));
  text('ITS REAL CYCLES', x, y0 + 52, { font: 3, color: UI.label });
  text('GREY: SCOUTED', x, y0 + 58, { font: 3, color: UI.dim });
  const counts = cycleCounts(s.scores, MAX_CYCLES);
  histogram(x, y0 + 64, w, 30, t.cycles, { ghost: counts.map((n) => n / s.scores.length), labels: true });
}

// ---- The pages, phase by phase ----
const RULES = { id: 'rules', label: 'RULES', info: 'HOW MATCHES WORK: OFFENSE, DEFENSE AND BREAKDOWNS' };
export const PHASES = {
  prep: {
    tabs: [{ id: 'teams', label: 'TEAMS', info: 'EVERY TEAM\'S SCOUTING' }, { id: 'list', label: 'PICKLIST', info: 'YOUR PICKLIST AND DO NOT PICK, IN ORDER' }, RULES],
    primary: (f) => ({
      label: 'START PICKS >', a: 'START ALLIANCE SELECTION', info: 'DONE STUDYING: ON TO ALLIANCE SELECTION', act: () => f.next(),
      sure: { label: 'SURE? A AGAIN', a: 'YES, START PICKING', info: 'NO MORE STUDY TIME: ALLIANCE SELECTION STARTS. A AGAIN IF YOU\'RE READY.' },
    }),
    strip: (f) => {
      const { v } = f, cap = (i) => nameOf(v.alliances[i][0]);
      return strip(f, [[['YOU RUN', UI.label], [`ALLIANCE ${v.group + 1}`, side(v.group).hi], ['- YOUR CAPTAIN:', UI.label], [cap(v.group), UI.bright]]], clockOf(f, 'PREP'));
    },
    page: { teams: teamsPage, list: listPage, rules: (f, y) => wordsPage(f, y, 'rules', DRAFT.rules) },
  },
  select: {
    tabs: [{ id: 'teams', label: 'TEAMS', info: 'EVERY TEAM\'S SCOUTING' }, { id: 'list', label: 'PICKLIST', info: 'YOUR PICKLIST AND DO NOT PICK, IN ORDER' }, RULES],
    strip: (f) => {
      const { v } = f, mine = onClock(v);
      return strip(f, allianceLines(v), { ...clockOf(f), label: mine ? 'YOUR PICK!' : `${short(v.turn)} PICKING` });
    },
    page: { teams: teamsPage, list: listPage, rules: (f, y) => wordsPage(f, y, 'rules', DRAFT.rules) },
  },
  plan: {
    tabs: [{ id: 'plan', label: 'PLAN', info: 'OFFENSE OR DEFENSE FOR EACH OF YOUR ROBOTS' }, { id: 'robots', label: 'ROBOTS', info: 'THE SIX ROBOTS\' SCOUTING' }, RULES],
    primary: (f) => {
      const locked = f.v.locked[f.v.group];
      return {
        label: locked ? 'LOCKED (UNDO)' : 'LOCK IN', tone: locked ? 'on' : 'gold', a: locked ? 'UNLOCK' : 'LOCK IN',
        info: locked ? 'A TO UNLOCK AND CHANGE THE PLAN' : 'READY: LOCK IN THE PLAN. THE MATCH PLAYS WHEN BOTH ALLIANCES HAVE.',
        act: () => f.send('lock', {}),
      };
    },
    strip: (f) => {
      const { v } = f;
      const them = 1 - v.group, ready = v.locked[them];
      return strip(f, [[[`MATCH ${v.match + 1}`, UI.bright], [`- SERIES ${v.wins[v.group]}-${v.wins[them]} -`, UI.label],
        [ready ? `${short(them)} HAS LOCKED IN` : `${short(them)} IS PLANNING`, ready ? UI.gold : UI.label],
        ...(v.locked[v.group] ? [['- SO HAVE YOU', UI.gold]] : [])]], clockOf(f, 'PLAN'));
    },
    page: {
      plan: planPage,
      robots: (f, y) => {
        table(f, y, f.v.alliances.flat(), () => {}, () => 'LOOK');
        detail(f, D.x + TABLE_W + 4, y, f.ui.sel, { lists: false });
      },
      rules: (f, y) => wordsPage(f, y, 'rules', DRAFT.rules),
    },
  },
  result: {
    tabs: [],
    primary: (f) => {
      const over = f.v.wins.some((w) => w >= 2) || f.v.results.length >= DRAFT.maxMatches;
      return over
        ? { label: 'THE REVEAL >', a: 'THE REVEAL', info: 'THE SERIES IS OVER: SEE HOW EVERY ROBOT REALLY WAS', act: () => f.next() }
        : { label: `PLAN MATCH ${f.v.results.length + 1} >`, a: 'NEXT MATCH', info: 'ON TO THE NEXT MATCH\'S PLAN', act: () => f.next() };
    },
    strip: (f) => {
      const { v } = f;
      return strip(f, [[[`MATCH ${v.results.length}`, UI.bright], ['- SERIES:', UI.label], [`YOU ${v.wins[v.group]}, THEM ${v.wins[1 - v.group]}`, UI.bright], ['- FIRST TO TWO WINS', UI.dim]]]);
    },
    page: { result: resultPage },
  },
  final: {
    tabs: [{ id: 'series', label: 'SERIES', info: 'HOW IT WENT, AND YOUR CHANCE IN EACH MATCH' }, { id: 'truth', label: 'TRUTH', info: 'WHAT THE SCOUTS SAW, BESIDE WHAT EVERY ROBOT REALLY WAS' }, { id: 'lessons', label: 'LESSONS', info: 'WHAT THE SHOWDOWN TEACHES' }],
    primary: (f) => ({
      label: 'TRAIN AGAIN', a: 'TRAIN AGAIN', info: 'A NEW EVENT: NEW SCOUTING, A NEW DRAW', act: () => f.restart(),
      sure: { label: 'SURE? A AGAIN', a: 'YES, A NEW EVENT', info: 'THIS EVENT AND ITS REVEAL GO. A AGAIN FOR A NEW ONE.' },
    }),
    strip: (f) => strip(f, [[['THE SHOWDOWN IS OVER.', UI.bright], ['THE TRUTH IS OUT.', UI.gold]]]),
    page: { series: seriesPage, truth: truthPage, lessons: (f, y) => wordsPage(f, y, 'lessons', DRAFT.lessons, { title: 'WHAT THE SHOWDOWN TEACHES' }) },
  },
};
/** The tab each phase opens on. */
export const FIRST_TAB = { prep: 'teams', select: 'teams', plan: 'plan', result: 'result', final: 'series' };

export function drawApp(f) {
  const { v, ui } = f;
  const p = PHASES[v.phase];
  fill(D.x, D.y, D.w, D.h, UI.body);
  if (!p) return;
  const open = p.page[ui.tab[v.phase]] ? ui.tab[v.phase] : FIRST_TAB[v.phase];
  ui.tab[v.phase] = open;
  const y0 = p.strip(f);
  p.page[open](f, y0);
  titleBar(f, p.tabs, p.primary?.(f));
  infoLine(f);
}
