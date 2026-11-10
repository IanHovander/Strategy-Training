// A match on the field, watched: any match the simulation has played, drawn by the match lab's own draw.js, fast.
// It's the same screen whether she's in the stands with her eye on one robot or it's her own alliance out there.
//
//   watching    from the stands. The camera stays on the robot she chose (an arrow over it), a line at the top left
//               counts what it's done so far, and the strip along the bottom says what just happened to it. At the end,
//               the line a scout would write goes in the notebook.
//   her match   the camera follows the action. At 0:30 the match stops: the endgame call. Each of her alliance's robots
//               can park on Level 1, climb to Level 2, or try Level 3 if it has the mechanism, and it's her call who
//               tries what, with what she knows about each (what she's seen it make, not what its team says). Then the
//               last thirty seconds play out the way she called them and the dice fell.
//
// The call is real because the match is. It's played once to 0:30 with what each drive team would do by habit, and
// again from the same seed with her call: nobody heads home before 0:30 (event.js sees to that), so the two are the
// same match up to the moment time stops.
//
// A (or a tap on the picture) changes the speed: 12 times real time, 40, or 4 to really watch. SKIP jumps to the call,
// or the end.
//
//   new Watch({ st, title, sim, focus, ours, team, round, call, rp, lines })
//     sim(climbs)   plays the match ({ num: level } for her robots, or nothing: habits) and returns sim.js's result,
//                   tracks and all
//     focus, also   the robot she's watching (a number), or null; and the one her teammate's watching, if she has one
//     ours, team    her alliance ('blue' | 'red') and its three numbers, for her own match
//     call          true: stop at 0:30 for the endgame call
//     rp            true: a qualification match, so the result says what it's worth in ranking points
//   done({ result, call, climbs })   call: what she called and how it went, for the notebook (state.js NOTES);
//                                    climbs: { num: level } as she called them

import { W, H, C, screen, fill, text, measure, withAlpha, clamp, seg, easeOut } from '../pixel.js';
import { WORLD_W } from '../field.js';
import { makeShow, frameAt } from '../match/animate.js';
import { drawMatch, drawScoreboard, cameraFor, wx } from '../match/draw.js';
import { MATCH, POINTS } from '../match/sim.js';
import { Screen } from './run.js';
import { box, frame as outline, blink, shade, GOOD, GOOD0 } from './ui.js';
import { corner, drawToasts, paper, PAPER } from './hud.js';
import { KIND, OURS, habPoints, climbsFor, recordOf } from './event.js';
import { summary, robotAt } from './state.js';
import { recordLines } from './words.js';

const LEN = MATCH.length, FREEZE = LEN - MATCH.endgame;
const SPEEDS = [12, 40, 4];
/** How fast the last thirty seconds play, once she's called them. */
const ENDGAME = 2.6;
/** What's worth a line along the bottom when it's anyone's match, and its colour. */
const NOTABLE = { breakdown: C.red2, brownout: C.org2, pin: C.yel2, switch: C.steel3, slip: C.org2, rolled: C.steel3 };
const WORDS = { 1: 'PARK', 2: 'LEVEL 2', 3: 'LEVEL 3' };

export class Watch extends Screen {
  constructor(o) {
    super(o.name ?? 'THE MATCH');
    Object.assign(this, { o, phase: 'play', t: 0, speed: 0, line: null, lastT: 0, cam: null, at: 0 });
    this.label = 'A match on the field, played fast, with the score at the top and what just happened along the bottom';
    this.result = o.sim(null);
    this.show = makeShow(this.result);
    this.side = o.ours ?? null;
    // What each of her robots would do at the end by habit: where the call starts.
    this.climbs = Object.fromEntries((o.team ?? []).map((n) => [n, this.result.robots.find((r) => r.num === n).plan.climb]));
  }
  /** A tap on the picture is A (the speed, or on from the result), except at the call, where it has to land on something. */
  anywhere() {
    return this.phase !== 'freeze';
  }
  /** For the sound (sounds/cues.js): the same few words whoever's playing. */
  status() {
    return { play: 'MATCH ON', freeze: 'THE CALL', endgame: 'ENDGAME', over: this.overStatus() }[this.phase];
  }
  overStatus() {
    if (!this.side) return 'MATCH OVER';
    const w = this.result.winner;
    return w === 'tie' ? 'MATCH TIED' : w === this.side ? 'MATCH WON' : 'MATCH LOST';
  }
  actLabel() {
    return { play: `SPEED ${SPEEDS[(this.speed + 1) % SPEEDS.length]}X`, freeze: 'CALL IT', endgame: 'SKIP', over: 'CONTINUE' }[this.phase];
  }

  // ---- The clock ----
  tick(dt, s, now) {
    const end = this.o.call && this.phase === 'play' ? FREEZE : LEN;
    if (this.phase === 'play' || this.phase === 'endgame') {
      this.t = Math.min(end, this.t + dt * (this.phase === 'endgame' ? ENDGAME : SPEEDS[this.speed]));
      this.say(now);
      if (this.t >= end) this.arrive(now);
    }
    // The camera: on her robot, on her alliance's HAB for the climbs, or wherever the action is.
    const f = frameAt(this.show, this.t);
    let want = cameraFor(this.show, this.t);
    const eye = this.o.focus ? f.robots.find((r) => r.num === this.o.focus) : null;
    if (eye) want = wx(eye.x) - W / 2;
    else if (this.phase === 'endgame' || this.phase === 'freeze') want = this.side === 'blue' ? 0 : WORLD_W - W;
    want = clamp(want, 0, WORLD_W - W);
    this.cam = this.cam == null ? want : this.cam + (want - this.cam) * Math.min(1, dt * (SPEEDS[this.speed] > 20 ? 7 : 3.5));
  }
  /** The match has got to where it stops: the call, or the buzzer. */
  arrive(now) {
    this.at = now;
    if (this.phase === 'play' && this.o.call) {
      this.phase = 'freeze';
      this.lead = this.scoreAt(FREEZE);
      this.m.on = 'call';
      return;
    }
    this.phase = 'over';
    this.m.on = null;
  }
  scoreAt(t) {
    const f = frameAt(this.show, t), them = this.side === 'blue' ? 'red' : 'blue';
    return f.score[this.side] - f.score[them];
  }
  /** What just happened, for the strip along the bottom: the latest thing worth saying since the last frame. */
  say(now) {
    const eye = this.o.focus;
    for (const l of this.result.log) {
      if (l.t <= this.lastT || l.t > this.t) continue;
      const mine = eye && l.by === eye;
      let color = null;
      if (mine && l.kind !== 'reboot') color = ['miss', 'fumble', 'rolled', 'slip', 'breakdown', 'brownout'].includes(l.kind) ? C.org2 : C.white;
      else if (!eye && l.kind in NOTABLE) color = NOTABLE[l.kind];
      else if (!eye && l.kind === 'hab' && /LEVEL [23]/.test(l.text)) color = l.alliance === 'blue' ? C.blue3 : C.red3;
      else if (eye && l.kind === 'pin' && l.text.includes(eye)) color = C.yel2;
      if (color) this.line = { text: `${l.by ?? ''} ${l.text}`.trim(), color, at: now };
    }
    this.lastT = this.t;
  }
  skip(now = performance.now() / 1000) {
    if (this.phase !== 'play' && this.phase !== 'endgame') return;
    this.t = this.o.call && this.phase === 'play' ? FREEZE : LEN;
    this.lastT = this.t;
    this.cam = null;
    this.arrive(now);
  }

  // ---- A ----
  onA() {
    const now = performance.now() / 1000;
    if (this.phase === 'play') this.speed = (this.speed + 1) % SPEEDS.length;
    else if (this.phase === 'endgame') this.skip(now);
    else if (this.phase === 'over') {
      if (now - this.at > 0.7) this.finish();
    } else return false;
    return true;
  }
  onKey(code) {
    if (code === 'Escape' || code === 'KeyX') {
      this.skip();
      return true;
    }
    return false;
  }
  /** She's called it: the match is played again from the same seed with her climbs, and runs on from 0:30. */
  callIt() {
    if (performance.now() / 1000 - this.at < 0.5) return;
    this.result = this.o.sim({ ...this.climbs });
    this.show = makeShow(this.result);
    this.phase = 'endgame';
    this.line = null;
  }
  setClimb(num, level) {
    this.climbs[num] = level;
    // One robot fits on Level 3: anyone else who was going there steps down to Level 2, or parks.
    if (level === 3) {
      for (const n of this.o.team) {
        if (n !== num && this.climbs[n] === 3) this.climbs[n] = robotAt(n, this.o.round).climb?.[2] ? 2 : 1;
      }
    }
  }
  finish() {
    const r = this.result, out = { result: r, call: null, climbs: this.o.call ? { ...this.climbs } : null };
    if (this.side) {
      const them = this.side === 'blue' ? 'red' : 'blue';
      const tried = this.o.team.map((n) => recordOf(r, n)).filter((x) => x.climb && !x.climb.park).map((x) => ({ num: x.num, level: x.climb.level, made: x.climb.made }));
      out.call = {
        tag: this.o.tag ?? this.o.title, lead: this.lead ?? 0, climbs: tried, margin: r.score[this.side] - r.score[them],
        could3: this.o.team.some((n) => robotAt(n, this.o.round).climb?.[3]), rp: r.rp[this.side], hab: habPoints(r, this.side),
      };
    }
    this.done(out);
  }

  // ---- The picture ----
  paint(g, _t, s, now) {
    const o = this.o, over = this.phase === 'over', won = over && this.side && this.result.winner === this.side;
    const scored = !over && frameAt(this.show, this.t).recent.some((e) => e.kind !== 'leave');
    const f = drawMatch(g, this.show, this.t, {
      camX: Math.round(this.cam ?? 0), mark: this.phase === 'freeze' ? null : o.focus, board: false,
      cheer: over ? (won || !this.side ? 0.9 : 0.15) : scored ? 0.3 : 0,
    });
    if (this.phase === 'freeze') this.paintCall(f, now);
    else if (over) this.paintOver(f, now);
    else this.paintPlay(f, now);
    drawScoreboard(f, { label: o.title });
    // A new field note waits for the match to be over and out of the way: nothing slides in over the call or the result.
    const quiet = this.phase === 'freeze' || this.phase === 'over';
    const glow = Math.max(quiet ? 0 : drawToasts(now), this.phase === 'freeze' ? 0.45 + 0.35 * Math.sin((now - this.at) * 4) : 0);
    corner(o.st, { glow });
  }
  /** While it plays: her robot's count at the top left, what just happened along the bottom, and the speed. */
  paintPlay(f, now) {
    const o = this.o, t = this.t;
    screen();
    if (o.focus) {
      const mine = f.events.filter((e) => e.by === o.focus), pts = mine.reduce((n, e) => n + e.pts, 0);
      const n = (k) => mine.filter((e) => e.kind === k).length;
      fill(2, 24, 62, 20, C.ink);
      fill(3, 25, 60, 18, C.night1);
      text(o.focus, 6, 27, { color: C.yel2 });
      text(`${pts} PTS`, 60, 28, { font: 3, align: 'right', color: C.white });
      text(`${n('hatch')} HATCH  ${n('cargo') + n('secured')} CARGO`, 6, 37, { font: 3, color: C.steel3 });
    }
    withAlpha(0.8, () => fill(0, 127, W, 17, C.ink));
    fill(0, 126, W, 1, C.night3);
    const line = this.line && now - this.line.at < 2.2 ? this.line : null;
    if (line) text(line.text.slice(0, 44), 6, 132, { font: 3, color: line.color });
    else text(o.sub ?? (t < MATCH.sandstorm ? 'SANDSTORM: THE DRIVERS CAN ONLY SEE BY CAMERA' : ''), 6, 132, { font: 3, color: C.steel2 });
    // The speed, and SKIP: both pressable, bottom right.
    const sp = this.m.item('speed', { x: 196, y: 129, w: 26, h: 13 }, () => this.onA(), { quiet: true });
    const sk = this.m.item('skip', { x: 224, y: 129, w: 28, h: 13 }, () => this.skip(), { quiet: true });
    const chip = (r, label, st) => {
      fill(r.x, r.y + (st.down ? 1 : 0), r.w, r.h - 2, C.night2);
      outline(r.x, r.y + (st.down ? 1 : 0), r.w, r.h - 2, C.steel2);
      text(label, r.x + r.w / 2, r.y + 3 + (st.down ? 1 : 0), { font: 3, align: 'center', color: C.white });
    };
    chip({ x: 196, y: 129, w: 26, h: 13 }, `${SPEEDS[this.speed]}X`, sp);
    chip({ x: 224, y: 129, w: 28, h: 13 }, this.phase === 'endgame' ? 'END' : 'SKIP', sk);
    if (this.phase === 'endgame' && t < FREEZE + 4) text('THE LAST THIRTY SECONDS', W / 2, 30, { align: 'center', color: C.yel2, outline: C.ink });
  }

  /** 0:30: time stops, the field goes dark, and it's her call. */
  paintCall(f, now) {
    const o = this.o, t = now - this.at, lead = this.lead;
    screen();
    withAlpha(clamp(t / 0.4, 0, 1) * 0.8, () => fill(0, 0, W, H, C.night0));
    if (t < 0.08) withAlpha(0.8, () => fill(0, 0, W, H, C.white));
    const where = lead > 0 ? `WE'RE UP ${lead}.` : lead < 0 ? `WE'RE DOWN ${-lead}.` : "IT'S LEVEL.";
    text(`0:30 LEFT. ${where}`, W / 2, 28, { align: 'center', color: C.yel2, outline: C.ink });
    text('THE CLIMBS ARE YOUR CALL. ONE ROBOT FITS ON LEVEL 3.', W / 2, 38, { font: 3, align: 'center', color: C.steel3 });
    o.team.forEach((num, i) => {
      const y = 46 + i * 23, robot = robotAt(num, o.round), can = climbsFor(robot), know = summary(o.st, num);
      box(4, y, W - 8, 21, { fillC: C.night1 });
      fill(4, y, 2, 21, this.side === 'blue' ? C.blue1 : C.red1);
      text(num, 10, y + 3, { color: C.white });
      text(KIND[num] ?? '', 10, y + 13, { font: 3, color: C.steel2 });
      [1, 2, 3].forEach((level, k) => {
        const r = { x: 78 + k * 58, y: y + 2, w: 55, h: 17 }, able = can.find((c) => c.level === level);
        if (!able) {
          outline(r.x, r.y, r.w, r.h, C.steel0);
          text(level === 3 ? "CAN'T REACH" : "CAN'T", r.x + r.w / 2, r.y + 6, { font: 3, align: 'center', color: C.steel1 });
          return;
        }
        const st = this.m.item(`${num}-${level}`, r, () => this.setClimb(num, level));
        const picked = this.climbs[num] === level, dy = st.down ? 1 : 0;
        fill(r.x - 1, r.y - 1 + dy, r.w + 2, r.h + 2, st.on ? C.yel1 : C.ink);
        fill(r.x, r.y + dy, r.w, r.h, picked ? C.blue1 : C.night2);
        fill(r.x, r.y + dy, r.w, 1, picked ? C.blue3 : C.night3);
        text(WORDS[level], r.x + 3, r.y + 2 + dy, { font: 3, color: C.white });
        text(`+${POINTS.hab[level]}`, r.x + r.w - 3, r.y + 2 + dy, { font: 3, align: 'right', color: picked ? C.yel2 : C.steel3 });
        // What she knows: her own robot's record from practice; anyone else's, only what she's seen it do.
        const seen = level === 3 ? know.l3 : level === 2 ? know.l2 : null;
        const word = level === 1 ? 'ALWAYS' : num === OURS ? `MAKES ${Math.round(able.odds * 10)} IN 10` : seen[1] ? `SEEN ${seen[0]} OF ${seen[1]}` : 'NEVER SEEN';
        text(word, r.x + 3, r.y + 10 + dy, { font: 3, color: level === 1 || num === OURS || seen?.[1] ? (picked ? C.white : C.steel3) : C.org2 });
      });
    });
    const sum = o.team.reduce((n, num) => n + POINTS.hab[this.climbs[num]], 0);
    text(`ON THE HAB IF THEY ALL MAKE IT: ${sum}.`, 6, 118, { font: 3, color: sum >= 15 ? GOOD : C.steel3 });
    if (o.rp) text('15 OR MORE IS A RANKING POINT.', 6, 126, { font: 3, color: C.steel2 });
    const r = { x: 176, y: 117, w: 74, h: 17 }, st = this.m.item('call', r, () => this.callIt());
    fill(r.x - 1, r.y - 1 + (st.down ? 1 : 0), r.w + 2, r.h + 2, C.ink);
    fill(r.x, r.y + (st.down ? 1 : 0), r.w, r.h, st.on ? (now % 0.9 < 0.6 ? C.yel1 : C.yel2) : C.night2);
    if (!st.on) outline(r.x, r.y, r.w, r.h, C.steel2);
    text('CALL IT', r.x + r.w / 2, r.y + 5 + (st.down ? 1 : 0), { align: 'center', color: st.on ? C.ink : C.white });
  }

  /** The buzzer: who won, what it was worth, and (from the stands) the line that goes in the notebook. */
  paintOver(f, now) {
    const o = this.o, t = now - this.at, r = this.result, side = this.side;
    screen();
    withAlpha(0.4, () => fill(0, 0, W, H, C.night0));
    const hi = Math.max(r.score.blue, r.score.red), lo = Math.min(r.score.blue, r.score.red);
    const won = side && r.winner === side, tie = r.winner === 'tie';
    const word = tie ? 'A TIE' : side ? (won ? 'WE WIN!' : `${r.winner.toUpperCase()} WINS`) : `${r.winner.toUpperCase()} WINS`;
    const color = tie ? C.steel3 : r.winner === 'blue' ? C.blue2 : C.red2;
    const k = easeOut(seg(t, 0, 0.18)), y = side ? 40 : 30, band = Math.round(15 * k);
    fill(0, y + 7 - band, W, band * 2, C.ink);
    fill(0, y + 7 - band, W, 1, color);
    fill(0, y + 6 + band, W, 1, color);
    if (k >= 1) {
      const w = measure(word, { scale: 2 }) + 12 + measure(`${hi}-${lo}`);
      const x = Math.round(W / 2 - w / 2);
      text(word, x, y, { scale: 2, color: won ? C.yel2 : C.white, outline: C.ink });
      text(`${hi}-${lo}`, x + w, y + 4, { align: 'right', color: C.yel2 });
    }
    if (side && t > 0.5) {
      const rp = r.rp[side], hab = habPoints(r, side);
      if (o.rp) {
        box(38, 68, 180, 34, { fillC: C.night1 });
        text('RANKING POINTS', 128, 72, { font: 3, align: 'center', color: C.steel2 });
        const part = (x, label, n, why) => {
          text(String(n), x, 80, { scale: 2, align: 'center', color: n ? C.yel2 : C.steel1 });
          text(label, x, 95, { font: 3, align: 'center', color: n ? C.white : C.steel2 });
          if (why) text(why, x, 102, { font: 3, align: 'center', color: C.steel2 });
        };
        part(68, tie ? 'TIE' : 'WIN', rp.win);
        part(113, `HAB ${hab}`, rp.hab);
        part(158, 'ROCKET', rp.rocket);
        text('=', 185, 84, { color: C.steel2 });
        text(String(rp.total), 202, 80, { scale: 2, align: 'center', color: C.white });
      } else if (o.after) text(o.after(r), 128, 72, { align: 'center', color: C.yel2, outline: C.ink });
    }
    if (o.focus && t > 0.5) {
      // Her line on the robot she watched, and the first of her teammate's on theirs.
      const lines = recordLines({ q: o.q, ...recordOf(r, o.focus) });
      if (o.also) lines.push(...recordLines({ q: o.q, ...recordOf(r, o.also) }).slice(0, 2).map((l, i) => (i ? l : `TEAMMATE: ${l}`)));
      const h = 14 + lines.length * 8;
      paper(34, 60, 188, h);
      text('IN THE NOTEBOOK', 46, 63, { font: 3, color: PAPER.pencil });
      lines.forEach((l, i) => text(l, 46, 72 + i * 8, { font: 3, color: i && !l.startsWith('TEAMMATE') ? PAPER.ink : '#a1172a' }));
    }
    blink('A: CONTINUE', 128, t, { from: 1.1 });
  }
}

/** Good: for the notebook's tick when a climb's made. */
export { GOOD, GOOD0 };
