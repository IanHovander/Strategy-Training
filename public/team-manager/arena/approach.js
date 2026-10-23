// Walking over to someone tapped, the long way round if need be: for a walkable scene's pointer() (stage.js). stage.js
// sends her straight at whoever's tapped, trying spots round them, and straight lines get stuck: behind someone else
// standing in the way (the team meeting's lawn), round a table or a pit's corner, or where a scene's own reach rule
// wants her somewhere none of those spots are (in front of someone seated, across a table). This finds her a way: a
// search over the floor (A*, two pixels a step, each step wherever the scene's own move() puts her) to the nearest spot
// where the scene's reach (or stage.js's 14 across and 10 deep) puts that person in reach, keeping a few pixels off
// walls and people where it can, with the corners of the way kept as stops. It hands the stops to stage.js the way its
// own tap does (s.goal, its spots taken in turn, and she talks to them once they're the one in reach), so the stick
// still takes over the moment it's pushed. A search that finds nothing in a fifth of a second leaves the tap to
// stage.js, so a tap never holds up the picture for long.
//
//   pointer(type, x, y, s) { return type === 'down' && approach(scene, s, x, y); }
//
// approach(scene, s, x, y, { walk })
//                            (x, y) a tap in screen pixels. True if it was on someone she isn't already in reach of and
//                            it set her off along a way to them; false to leave the tap to stage.js (a floor tap, the way
//                            out, someone in reach, no way found). walk: she mustn't run (the pits' rule), so it takes
//                            the floor and the way out too (stage.js runs her to anywhere over 72 pixels off), and goes
//                            in legs short enough to walk.
//
// This belongs in stage.js's goTo (it lives here because the scenes' own folders are what this change could touch); the
// scenes import it from here until it moves.

/** stage.js's: the floor recedes, so going down the screen covers more ground than going across. */
const DEPTH = 0.8;
/** The search's step, in pixels, and how many spots and milliseconds it takes before giving up. */
const STEP = 2, MAX_CELLS = 30000, TIME = 220, FAR = 120;
/** A frame's walk at 60 frames a second (stage.js SPEED.walk), for following her steps as stage.js takes them. */
const STRIDE = 34 / 60;
/** The longest leg she walks rather than runs to (stage.js runs her to a stop further than 72 pixels off). */
const WALK_LEG = 64;

/**
 * Who's drawn at (x, y) in the world, nearest the front: stage.js's personAt, the same body and bubble boxes, except that
 * a body beats the edge of the bubble box (it's wider than the bubble), so a tap on the head beside someone's bubble is
 * on that head.
 */
export function personAt(scene, s, x, y) {
  let best = null, rank = -Infinity;
  for (const p of scene.people ?? []) {
    const at = scene.spriteOf?.(p) ?? p;
    const tall = /sit|floor|kneel/.test(p.gait ?? p.faceGait ?? '') ? 34 : 50;
    const onBody = Math.abs(x - at.x) <= 10 && y >= at.y - tall && y <= at.y + 4;
    const onBubble = s.near === p && Math.abs(x - (at.x + 11)) <= 9 && y >= at.y - 62 && y <= at.y - 40;
    const onDrawn = s.near === p && Math.abs(x - (at.x + 11)) <= 6 && y >= at.y - 52 && y <= at.y - 37;
    const r = onDrawn ? 2000 : onBody ? 1000 : onBubble ? 0 : -Infinity;
    if (r > -Infinity && r + at.y > rank) [best, rank] = [p, r + at.y];
  }
  return best;
}

/** Who'd be in reach with her feet at (x, y): the scene's rule, or stage.js's closest. */
function whoFrom(scene, s, x, y, dir) {
  const me = { ...s.me, x, y, dir: dir ?? s.me.dir };
  if (scene.reach) return scene.reach({ ...s, me, talk: null });
  let best = null, bestD = Infinity;
  for (const p of scene.people ?? []) {
    const dx = Math.abs(p.x - x), dy = Math.abs(p.y - y);
    if (dx < (p.reach ?? 14) && dy < (p.reachY ?? 10) && dx + dy < bestD) [best, bestD] = [p, dx + dy];
  }
  return best;
}

/**
 * Where she gets to heading for (x1, y1) from (x0, y0) the way stage.js walks her to a tap: a frame's walk a step,
 * turned at the spot each step, wherever move() puts her (some scenes slip her round people). [x, y] once she's within a
 * pixel of it, or null if she stops getting nearer.
 */
function reaches(scene, x0, y0, x1, y1) {
  let x = x0, y = y0, best = Infinity, since = 0;
  for (let i = 0, n = Math.ceil(Math.hypot(x1 - x0, (y1 - y0) / DEPTH) / STRIDE) * 2 + 20; i < n; i++) {
    const gx = x1 - x, gy = (y1 - y) / DEPTH, far = Math.hypot(gx, gy);
    if (far < 1) return [x, y];
    // stage.js gives up on a stop she's got no nearer to for half a second: about 30 frames.
    if (far < best - 0.5) [best, since] = [far, i];
    else if (i - since > 30) return null;
    const v = Math.min(STRIDE, far);
    [x, y] = scene.move(x, y, (gx / far) * v, (gy / far) * v * DEPTH);
  }
  return null;
}
/**
 * Whether she gets from stop a to b heading straight for it, from anywhere she might be when she counts as at a: stage.js
 * takes her as there within a couple of pixels, so a stop on the corner of something mustn't leave her stuck behind it.
 */
function clearFrom(scene, a, b) {
  const near = [[0, 0], [1.6, 0], [-1.6, 0], [0, 1.4], [0, -1.4], [1.2, 1], [-1.2, 1], [1.2, -1], [-1.2, -1]].filter(([ex, ey]) => {
    const [mx, my] = scene.move(a.x, a.y, ex, ey);
    return Math.abs(mx - a.x - ex) < 0.01 && Math.abs(my - a.y - ey) < 0.01;
  });
  return near.every(([ex, ey]) => reaches(scene, a.x + ex, a.y + ey, b.x, b.y));
}
/** Where a step from (x, y) by (dx, dy) along a straight line, a pixel and a half at a time, ends up: as the stick walks. */
function stepFrom(scene, x, y, dx, dy) {
  const n = Math.ceil(Math.hypot(dx, dy) / 1.5);
  for (let i = 0; i < n; i++) [x, y] = scene.move(x, y, dx / n, dy / n);
  return [x, y];
}

/** The way from her feet to the nearest spot where p is in reach: [[x, y], ...] (her feet not included), or null. */
export function wayTo(scene, s, p) {
  const ww = scene.world?.w ?? 256, wh = scene.world?.h ?? 144, to = scene.spriteOf?.(p) ?? p;
  // Spots on the floor, a step apart (one per cell of a grid on her feet), each where move() really put her, searched
  // nearest-to-them first (A*: the way so far, plus how far on they still are, counted half again over so it heads
  // for them keenly).
  const cell = (x, y) => `${Math.round((x - s.me.x) / STEP)},${Math.round((y - s.me.y) / STEP)}`;
  const away = (x, y) => Math.hypot(to.x - x, (to.y - y) / DEPTH), guess = (x, y) => 1.5 * Math.max(0, away(x, y) - 12);
  const start = { x: s.me.x, y: s.me.y, prev: null, g: 0 };
  start.f = guess(start.x, start.y);
  const seen = new Set([cell(start.x, start.y)]);
  const heap = new Heap();
  heap.push(start);
  const inReach = (x, y, dir) => whoFrom(scene, s, x, y, dir) === p;
  // She stops within a couple of pixels of a stop, so a spot in reach for a couple of pixels all round beats one on the
  // very edge of it: once one's found, keep looking a little longer for a better one.
  const ROUND = [[-2, 0], [2, 0], [0, -2], [0, 2], [-2, -2], [2, -2], [-2, 2], [2, 2]];
  let best = null, bestScore = -1, bestAt = 0;
  const t0 = performance.now();
  for (let n = 0; heap.size && n < MAX_CELLS; n++) {
    const at = heap.pop();
    if (best && n > bestAt + 200) break;
    // A tap mustn't hold up the picture for long: past this, she'd better walk straight at them (stage.js's own way).
    if (performance.now() - t0 > TIME) break;
    for (const [di, dj] of DIRS) {
      const [nx, ny] = stepFrom(scene, at.x, at.y, di * STEP, dj * STEP);
      if (Math.hypot(nx - at.x, ny - at.y) < STEP * 0.5 || nx < 0 || ny < 0 || nx > ww || ny > wh) continue;
      const k = cell(nx, ny);
      if (seen.has(k)) continue;
      seen.add(k);
      // Right up against something costs extra, so the way keeps a few pixels off walls and people where it can: she
      // counts as at a stop a couple of pixels short of it, and cutting a corner that close would leave her stuck on it.
      const tight = HUG.some(([ex, ey]) => {
        const [mx, my] = scene.move(nx, ny, ex, ey);
        return Math.abs(mx - nx - ex) > 0.01 || Math.abs(my - ny - ey) > 0.01;
      });
      const spot = { x: nx, y: ny, prev: at, g: at.g + Math.hypot(nx - at.x, (ny - at.y) / DEPTH) + (tight ? 6 : 0) };
      spot.f = spot.g + guess(nx, ny);
      heap.push(spot);
      // Arriving here she faces the way she came: some scenes' reach looks at that (the pits').
      const dir = ((Math.round((Math.atan2(nx - at.x, (ny - at.y) / DEPTH) * 180) / Math.PI / 45) % 8) + 8) % 8;
      if (away(nx, ny) > FAR) continue; // nobody's in reach from further off than this
      // Here, or a pixel off it (some people are in reach only from a sliver of floor, narrower than a step).
      for (const [ex, ey] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = nx + ex, y = ny + ey;
        if (!inReach(x, y, dir)) continue;
        if (ex || ey) {
          const [mx, my] = scene.move(nx, ny, ex, ey);
          if (Math.abs(mx - x) > 0.01 || Math.abs(my - y) > 0.01) continue;
        }
        const score = ROUND.filter(([rx, ry]) => inReach(x + rx, y + ry, dir)).length;
        if (score > bestScore) [best, bestScore, bestAt] = [ex || ey ? { x, y, prev: spot } : spot, score, best ? bestAt : n];
        break;
      }
      if (bestScore === ROUND.length) break;
    }
    if (bestScore === ROUND.length) break;
  }
  if (!best) return null;
  const spots = [];
  for (let c = best; c; c = c.prev) spots.unshift(c);
  // Only the corners: from each stop, on to the furthest spot she still gets to heading straight for it.
  const stops = [];
  for (let a = 0; a < spots.length - 1;) {
    let b = spots.length - 1;
    while (b > a + 1 && !clearFrom(scene, spots[a], spots[b])) b--;
    stops.push([spots[b].x, spots[b].y]);
    a = b;
  }
  // She stops a couple of pixels short of the last stop, so it goes on past the spot by that much: she's there as she
  // stops (and talks to them the moment they're in reach on the way).
  const [lx, ly] = stops.at(-1) ?? [best.x, best.y], [px, py] = stops.at(-2) ?? [s.me.x, s.me.y];
  const d = Math.hypot(lx - px, (ly - py) / DEPTH);
  if (d > 0) stops[stops.length - 1] = [lx + ((lx - px) / d) * 2, ly + ((ly - py) / d) * 2 * DEPTH];
  return stops;
}

const HUG = [[3, 0], [-3, 0], [0, 3], [0, -3]];
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
/** A binary heap of spots, the lowest f on top. */
class Heap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(v) {
    const a = this.a;
    let i = a.push(v) - 1;
    while (i > 0) {
      const up = (i - 1) >> 1;
      if (a[up].f <= v.f) break;
      [a[i], i] = [a[up], up];
    }
    a[i] = v;
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i, mv = last;
        if (l < a.length && a[l].f < mv.f) [m, mv] = [l, a[l]];
        if (r < a.length && a[r].f < mv.f) [m, mv] = [r, a[r]];
        if (m === i) break;
        a[i] = a[m];
        i = m;
      }
      a[i] = last;
    }
    return top;
  }
}

export function approach(scene, s, x, y, { walk = false } = {}) {
  if (s.mode !== 'free' || s.talk || scene.update || !s.view) return false;
  const out = s.exitAt, e = scene.exit, wx = x + s.view.x, wy = y + s.view.y;
  if (out && x >= out.x0 && x <= out.x1 && y >= out.y0 && y <= out.y1) {
    // The way out: stage.js's, unless she has to walk it.
    return walk && !!e && goAlong(s, [[e.x + 6, Math.min(Math.max(s.me.y, e.y0 + 1), e.y1 - 1)]], null, walk);
  }
  const p = personAt(scene, s, wx, wy);
  if (!p) return walk && goAlong(s, [[wx, wy]], null, walk); // the floor: stage.js's, unless she has to walk there
  if (s.near === p) return false;
  const way = wayTo(scene, s, p);
  return way?.length ? goAlong(s, way, p, walk) : walk && goAlong(s, [[p.x, p.y]], p, walk);
}

/**
 * Sets her off along stops (stage.js's s.goal, the stops after the first its spots) to talk to p, or just to get there.
 * walk: no leg longer than stage.js walks rather than runs (72 pixels), for a scene with no running (the pits).
 */
function goAlong(s, stops, p, walk) {
  let from = [s.me.x, s.me.y];
  const legs = [];
  for (const to of stops) {
    const n = walk ? Math.ceil(Math.hypot(to[0] - from[0], (to[1] - from[1]) / DEPTH) / WALK_LEG) : 1;
    for (let i = 1; i <= n; i++) legs.push([from[0] + ((to[0] - from[0]) * i) / n, from[1] + ((to[1] - from[1]) * i) / n]);
    from = to;
  }
  const [gx, gy] = legs.shift();
  // stage.js takes the spots in turn only on the way to someone: getting somewhere, a stand-in nobody is in reach of.
  s.goal = { x: gx, y: gy, person: p ?? { name: '' }, spots: legs, best: Infinity, since: performance.now() / 1000 };
  return true;
}
