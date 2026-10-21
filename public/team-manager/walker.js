// The hero as a walking sprite: 8 directions, standing, walking and running. Hand-drawing every frame wouldn't stay
// consistent, so she's a small 3D rig (ellipsoids and capsules posed by a gait cycle) that is ray-cast to pixels, shaded
// in three tones from her palette and outlined in ink. Her eyes and smile go on afterwards as crisp pixels. Frames are
// made the first time they're drawn, then cached.
//
// The camera looks down at 20 degrees. Directions turn clockwise from facing you: s, se, e, ne, n, nw, w, sw.

export const DIRS = ['s', 'se', 'e', 'ne', 'n', 'nw', 'w', 'sw'];
export const FRAMES = { stand: 1, walk: 8, run: 8 };
export const CELL_W = 36, CELL_H = 56;
// Where her feet are in a frame.
export const FOOT_X = 18, FOOT_Y = 52;

const PAL = {
  ink: '#0b0d17',
  skin: ['#d29a6c', '#eabf91', '#f8d9b8'],
  hair: ['#131216', '#211d22', '#352d31'],
  shirt: ['#a1172a', '#d3212f', '#ff6a55'],
  jeans: ['#34416e', '#4a5b92', '#6b80b8'],
  cuff: ['#4a5b92', '#6b80b8', '#8a9cd0'],
  sockL: ['#c48a0a', '#ffc61a', '#ffe07a'],
  sockR: ['#1d55e8', '#4a90ff', '#8fbcff'],
  shoe: ['#b9c0d4', '#f4f6fb', '#ffffff'],
  sole: ['#4b5269', '#7882a3', '#7882a3'],
  board: ['#9aa3bd', '#c9d0de', '#e3e7f0'],
  eye: '#2a1a10',
  mouth: '#8f4636',
  blush: '#ee9f8c',
  print: '#fff4ee',
};

// ---- Vectors ----
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => mul(a, 1 / Math.hypot(a[0], a[1], a[2]));
const rad = (deg) => (deg * Math.PI) / 180;

const PITCH = rad(20);
const VIEW = [0, -Math.sin(PITCH), -Math.cos(PITCH)];
const UP_ON_SCREEN = [0, Math.cos(PITCH), -Math.sin(PITCH)];
const TO_CAMERA = mul(VIEW, -1);
const LIGHT = norm([-0.55, 0.8, 0.55]);
const project = (p) => [FOOT_X + p[0], FOOT_Y - dot(p, UP_ON_SCREEN)];

// ---- Shapes. Each returns hits as { t, n, local } or null; mat(hit) names the material, or null to see through. ----
function ellipsoid(c, axes, radii, mat, group) {
  return { kind: 'ellipsoid', c, axes, radii, mat, group };
}
function capsule(a, b, r, mat, group) {
  return { kind: 'capsule', a, b, r, mat, group };
}
function box(c, axes, half, mat, group) {
  return { kind: 'box', c, axes, half, mat, group };
}

function hitEllipsoid(s, o, d) {
  const oc = sub(o, s.c);
  const lo = s.axes.map((e, i) => dot(oc, e) / s.radii[i]);
  const ld = s.axes.map((e, i) => dot(d, e) / s.radii[i]);
  const A = dot(ld, ld), B = 2 * dot(lo, ld), C = dot(lo, lo) - 1;
  const disc = B * B - 4 * A * C;
  if (disc < 0) return [];
  const q = Math.sqrt(disc);
  return [(-B - q) / (2 * A), (-B + q) / (2 * A)].map((t) => {
    const p = add(lo, mul(ld, t));
    const n = norm(s.axes.reduce((acc, e, i) => add(acc, mul(e, p[i] / s.radii[i])), [0, 0, 0]));
    return { t, n, local: p };
  });
}
function hitCapsule(s, o, d) {
  const ba = sub(s.b, s.a), oa = sub(o, s.a);
  const baba = dot(ba, ba), bard = dot(ba, d), baoa = dot(ba, oa), rdoa = dot(d, oa), oaoa = dot(oa, oa);
  const a = baba - bard * bard, b = baba * rdoa - baoa * bard, c = baba * oaoa - baoa * baoa - s.r * s.r * baba;
  let h = b * b - a * c;
  const out = (t) => {
    const p = add(o, mul(d, t));
    const k = Math.max(0, Math.min(1, dot(sub(p, s.a), ba) / baba));
    return { t, n: norm(sub(p, add(s.a, mul(ba, k)))), local: [k] };
  };
  if (h >= 0) {
    const t = (-b - Math.sqrt(h)) / a;
    const y = baoa + t * bard;
    if (y > 0 && y < baba) return [out(t)];
    const oc = y <= 0 ? oa : sub(o, s.b);
    const bb = dot(d, oc), cc = dot(oc, oc) - s.r * s.r;
    h = bb * bb - cc;
    if (h > 0) return [out(-bb - Math.sqrt(h))];
  }
  return [];
}
function hitBox(s, o, d) {
  let tmin = -Infinity, tmax = Infinity, axis = 0, sign = 1;
  for (let i = 0; i < 3; i++) {
    const oi = dot(sub(o, s.c), s.axes[i]), di = dot(d, s.axes[i]);
    if (Math.abs(di) < 1e-9) {
      if (Math.abs(oi) > s.half[i]) return [];
      continue;
    }
    let t1 = (-s.half[i] - oi) / di, t2 = (s.half[i] - oi) / di;
    const sg = t1 < t2 ? -1 : 1;
    if (t1 > t2) [t1, t2] = [t2, t1];
    if (t1 > tmin) {
      tmin = t1;
      axis = i;
      sign = sg;
    }
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return [];
  }
  const p = add(o, mul(d, tmin));
  const lp = s.axes.map((e) => dot(sub(p, s.c), e) / 1);
  return [{ t: tmin, n: mul(s.axes[axis], sign), local: lp }];
}
const HIT = { ellipsoid: hitEllipsoid, capsule: hitCapsule, box: hitBox };

// ---- The rig ----
const GAITS = {
  stand: { hip: 0, hipBias: 0, knee: 0, kneeBase: 2, arm: 0, elbow: 10, lean: 0, flight: 0 },
  walk: { hip: 24, hipBias: 0, knee: 42, kneeBase: 4, arm: 20, elbow: 16, lean: 2, flight: 0 },
  run: { hip: 38, hipBias: 6, knee: 95, kneeBase: 18, arm: 42, elbow: 88, lean: 11, flight: 1.4 },
};

function pose(dirIndex, gait, phase) {
  const g = GAITS[gait];
  const th = rad(dirIndex * 45);
  const F = [Math.sin(th), 0, Math.cos(th)], U = [0, 1, 0], R = [-Math.cos(th), 0, Math.sin(th)];
  const at = (r, u, f) => add(add(mul(R, r), mul(U, u)), mul(F, f));
  const swing = (deg) => [Math.sin(rad(deg)), -Math.cos(rad(deg))]; // [forward, up] of a limb hanging at that angle

  // Legs: hip angle forward, knee folding back.
  const legs = [-1, 1].map((side) => {
    const q = phase + (side < 0 ? 0 : 0.5);
    const s2 = Math.sin(2 * Math.PI * q), c2 = Math.cos(2 * Math.PI * q);
    const hip = g.hipBias + g.hip * s2;
    const knee = g.kneeBase + g.knee * Math.max(0, Math.cos(2 * Math.PI * q + (gait === 'run' ? 0.7 : 0.35))) ** 1.3;
    const [tf, tu] = swing(hip), [sf, su] = swing(hip - knee);
    return { side, hip, knee, tf, tu, sf, su, c2 };
  });
  const THIGH = 9.6, SHIN = 9.2, ANKLE = 1.4;
  const hipY = Math.max(...legs.map((l) => -(l.tu * THIGH + l.su * SHIN))) + ANKLE;
  const lift = gait === 'run' ? g.flight * Math.max(0, Math.sin(4 * Math.PI * (phase + 0.06))) : 0;
  const base = Math.round((hipY + lift) * 2) / 2;
  const parts = [];

  for (const l of legs) {
    const hipP = at(l.side * 2.5, base, 0);
    const kneeP = add(hipP, at(0, l.tu * THIGH, l.tf * THIGH));
    const ankle = add(kneeP, at(0, l.su * SHIN, l.sf * SHIN));
    const group = l.side < 0 ? 'legL' : 'legR';
    parts.push(capsule(hipP, kneeP, 2.2, () => 'jeans', group));
    parts.push(capsule(kneeP, ankle, 1.85, (h) => (h.local[0] > 0.82 ? 'cuff' : 'jeans'), group));
    parts.push(capsule(ankle, add(ankle, at(0, 1.1, 0)), 1.3, () => (l.side < 0 ? 'sockL' : 'sockR'), group));
    // The shoe points along her heading, tipping down a little as the foot leaves the ground.
    const tip = gait === 'stand' ? 0 : Math.max(0, -(l.hip - l.knee) * 0.4);
    const fwd = norm(at(0, -Math.sin(rad(tip)), Math.cos(rad(tip))));
    const upv = norm(at(0, Math.cos(rad(tip)), Math.sin(rad(tip))));
    const footC = add(add(ankle, mul(fwd, 1.3)), at(0, -0.35, 0));
    parts.push(ellipsoid(footC, [R, upv, fwd], [1.75, 1.25, 3.0], (h) => (h.local[1] < -0.45 ? 'sole' : 'shoe'), group));
  }

  // Upper body leans from the hips when running.
  const lean = rad(g.lean);
  const body = (r, u, f) => {
    const du = u - base;
    return at(r, base + du * Math.cos(lean), f + du * Math.sin(lean));
  };
  const axesLean = [R, norm(at(0, Math.cos(lean), Math.sin(lean))), norm(at(0, -Math.sin(lean), Math.cos(lean)))];
  const torsoY = (u) => base + (u - 23);
  parts.push(ellipsoid(body(0, torsoY(24.4), 0), axesLean, [4.7, 3.3, 3.0], () => 'jeans', 'torso'));
  parts.push(ellipsoid(body(0, torsoY(28.6), 0.1), axesLean, [4.1, 3.9, 2.75], (h) => (h.local[1] < -0.6 ? 'jeans' : 'shirt'), 'torso'));
  parts.push(ellipsoid(body(0, torsoY(33.2), 0.2), axesLean, [5.0, 4.4, 3.1], () => 'shirt', 'torso'));
  for (const side of [-1, 1]) parts.push(ellipsoid(body(side * 4.6, torsoY(35.8), 0), axesLean, [2.0, 1.9, 2.0], () => 'shirt', 'torso'));
  parts.push(capsule(body(0, torsoY(36.2), -0.3), body(0, torsoY(39.6), -0.1), 1.45, () => 'skin', 'head'));

  // Head and hair. The hair cap leaves a window for the face, swept low across her forehead from a part on her right.
  const head = body(0, torsoY(43.8), 0.35);
  parts.push(ellipsoid(head, axesLean, [5.5, 5.9, 5.5], () => 'skin', 'head'));
  parts.push(ellipsoid(add(head, mul(axesLean[1], 0.45)), axesLean, [6.1, 6.3, 6.1], (h) => {
    const [x, y, z] = h.local;
    const hairline = 0.2 + 0.3 * x;
    return z > 0.15 && Math.abs(x) < 0.8 && y < hairline ? null : 'hair';
  }, 'head'));
  // Shoulder-length hair hanging behind her head and down beside her neck.
  const hang = add(head, add(mul(axesLean[1], -4.2), mul(axesLean[2], -1.6)));
  parts.push(ellipsoid(hang, axesLean, [6.1, 5.6, 4.1], (h) => {
    const p = sub(hang, head);
    const lx = h.local[0] * 6.1, lz = h.local[2] * 4.1 + dot(p, axesLean[2]);
    return lz > -0.6 && Math.abs(lx) < 4.4 ? null : 'hair';
  }, 'head'));

  // Arms swing against the legs. Running, her left arm holds the board tucked against her side.
  const s2 = Math.sin(2 * Math.PI * phase);
  for (const side of [-1, 1]) {
    const tucked = gait === 'run' && side < 0;
    const a = tucked ? -10 + 8 * s2 : (side < 0 ? -1 : 1) * g.arm * s2;
    const e = tucked ? 70 : g.elbow;
    const shoulder = body(side * 5.3, torsoY(35.6), -0.1);
    const [uf, uu] = swing(a), [ff, fu] = swing(a + e);
    const elbowP = add(shoulder, at(side * 0.9, uu * 7.0, uf * 7.0));
    const wrist = add(elbowP, at(side * (tucked ? -0.8 : 0.3), fu * 6.0, ff * 6.0));
    const group = side < 0 ? 'armL' : 'armR';
    parts.push(capsule(shoulder, elbowP, 1.45, (h) => (h.local[0] < 0.42 ? 'shirt' : 'skin'), group));
    parts.push(capsule(elbowP, wrist, 1.25, () => 'skin', group));
    parts.push(ellipsoid(wrist, [R, U, F], [1.35, 1.35, 1.35], () => 'skin', group));
    if (side < 0) {
      // The whiteboard: hanging from her hand at a walk, under her arm at a run. It faces out to her side.
      const c = tucked ? body(-5.6, torsoY(30.4), 0.6) : add(wrist, at(-0.4, -2.6, 0.6));
      parts.push(box(c, [R, U, F], [0.35, 2.4, 3.1], () => 'board', 'board'));
    }
  }
  return { parts, head, axes: axesLean, R, U, F, chest: body(0, torsoY(33.2), 0.2), base };
}

// ---- Rendering ----
function render(dirIndex, gait, phase) {
  const rig = pose(dirIndex, gait, phase);
  const W = CELL_W, H = CELL_H;
  const matBuf = new Array(W * H).fill(null), shadeBuf = new Uint8Array(W * H), depthBuf = new Float32Array(W * H).fill(Infinity);
  const groupBuf = new Array(W * H).fill(null);
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const sx = px + 0.5 - FOOT_X, sy = FOOT_Y - (py + 0.5);
      const o = add(add([sx, 0, 0], mul(UP_ON_SCREEN, sy)), mul(VIEW, -60));
      let best = null;
      for (const s of rig.parts) {
        for (const hit of HIT[s.kind](s, o, VIEW)) {
          if (hit.t <= 0 || (best && hit.t >= best.t)) continue;
          const m = s.mat(hit);
          if (!m) continue;
          best = { t: hit.t, n: hit.n, m, group: s.group };
          break;
        }
      }
      if (!best) continue;
      const i = py * W + px;
      const lit = dot(best.n, LIGHT);
      matBuf[i] = best.m;
      shadeBuf[i] = lit > 0.72 ? 2 : lit > 0.05 ? 1 : 0;
      depthBuf[i] = best.t;
      groupBuf[i] = best.group;
    }
  }
  // Colours.
  const color = new Array(W * H).fill(null);
  for (let i = 0; i < W * H; i++) if (matBuf[i]) color[i] = PAL[matBuf[i]][shadeBuf[i]];
  // Ink where one part passes in front of another, and around the outside.
  const ink = new Array(W * H).fill(false);
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const i = py * W + px;
      if (!matBuf[i]) continue;
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const x = px + dx, y = py + dy;
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const j = y * W + x;
        if (!matBuf[j]) continue;
        if (groupBuf[j] !== groupBuf[i] && depthBuf[i] - depthBuf[j] > 1.4) ink[i] = true;
      }
    }
  }
  const out = color.slice();
  for (let i = 0; i < W * H; i++) if (ink[i]) out[i] = PAL.ink;
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const i = py * W + px;
      if (matBuf[i]) continue;
      const near = [[1, 0], [0, 1], [-1, 0], [0, -1]].some(([dx, dy]) => {
        const x = px + dx, y = py + dy;
        return x >= 0 && y >= 0 && x < W && y < H && matBuf[y * W + x];
      });
      if (near) out[i] = PAL.ink;
    }
  }
  // Face and shirt print, as crisp pixels on whatever skin or shirt is showing.
  const facing = (p, n) => dot(n, TO_CAMERA) > 0.2 && p;
  const plot = (p, w, h, col, onMat) => {
    const [x, y] = project(p);
    const x0 = Math.round(x - w / 2), y0 = Math.round(y - h / 2);
    for (let yy = y0; yy < y0 + h; yy++) {
      for (let xx = x0; xx < x0 + w; xx++) {
        const i = yy * W + xx;
        if (xx >= 0 && yy >= 0 && xx < W && yy < H && matBuf[i] === onMat && !ink[i]) out[i] = col;
      }
    }
  };
  const [Rh, Uh, Fh] = rig.axes;
  const onHead = (lat, up, r = 5.5) => {
    const n = norm(add(add(mul(Fh, Math.cos(rad(lat)) * Math.cos(rad(up))), mul(Rh, Math.sin(rad(lat)))), mul(Uh, Math.sin(rad(up)))));
    return [add(rig.head, mul(n, r)), n];
  };
  for (const lat of [-27, 27]) {
    const [p, n] = onHead(lat, -4);
    if (facing(p, n)) plot(p, 1, 2, PAL.eye, 'skin');
  }
  for (const lat of [-40, 40]) {
    const [p, n] = onHead(lat, -24);
    if (facing(p, n)) plot(p, 1, 1, PAL.blush, 'skin');
  }
  const [mp, mn] = onHead(0, -36);
  if (facing(mp, mn)) plot(mp, dot(mn, TO_CAMERA) > 0.55 ? 2 : 1, 1, PAL.mouth, 'skin');
  const chestN = norm(Fh);
  const printAt = (sideSign) => add(rig.chest, add(mul(Fh, 3.2 * sideSign), mul(Uh, 0.6)));
  if (dot(chestN, TO_CAMERA) > 0.3) plot(printAt(1), 4, 2, PAL.print, 'shirt');
  if (dot(mul(chestN, -1), TO_CAMERA) > 0.3) plot(printAt(-1), 4, 2, PAL.print, 'shirt');
  return out;
}

const cache = new Map();
/** One frame as a canvas. gait: 'stand', 'walk' or 'run'; frame counts from 0 (wraps). */
export function walkerFrame(dir, gait, frame = 0) {
  const d = typeof dir === 'number' ? ((dir % 8) + 8) % 8 : DIRS.indexOf(dir);
  const n = FRAMES[gait];
  const f = ((frame % n) + n) % n;
  const key = `${d} ${gait} ${f}`;
  if (!cache.has(key)) {
    const pixels = render(d, gait, f / n);
    const canvas = document.createElement('canvas');
    canvas.width = CELL_W;
    canvas.height = CELL_H;
    const g = canvas.getContext('2d');
    pixels.forEach((c, i) => {
      if (!c) return;
      g.fillStyle = c;
      g.fillRect(i % CELL_W, Math.floor(i / CELL_W), 1, 1);
    });
    cache.set(key, canvas);
  }
  return cache.get(key);
}

/** Draw her standing on (x, y) in canvas pixels. */
export function drawWalker(g, x, y, dir, gait, frame) {
  g.drawImage(walkerFrame(dir, gait, frame), Math.round(x) - FOOT_X, Math.round(y) - FOOT_Y);
}
