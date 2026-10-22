// The hero as a walking sprite: 8 directions, standing, walking and running. Her body is a small 3D rig (ellipsoids and
// capsules posed by a gait cycle) that is ray-cast to pixels, shaded in three tones from her palette and outlined in
// ink, so every direction and frame stays consistent. Her head is hand-drawn for each direction in the portrait's style
// (hero.js), since that's where the likeness lives. Frames are made the first time they're drawn, then cached.
//
// The camera looks down at 20 degrees. Directions turn clockwise from facing you: s, se, e, ne, n, nw, w, sw.
// Other people use the same rig with their own look (colours and hand-drawn heads); see bleachers.js.

export const DIRS = ['s', 'se', 'e', 'ne', 'n', 'nw', 'w', 'sw'];
export const FRAMES = {
  stand: 1, walk: 8, run: 8, sit: 1, cheer: 1, armsUp: 1, drive: 1, celebrate: 2, steer: 1, phone: 1, kneel: 4, lean: 2, carry: 8,
  push: 8,
};
export const CELL_W = 36, CELL_H = 56;
// Where her feet are in a frame.
export const FOOT_X = 18, FOOT_Y = 52;

const HEADS = {
  s: [
    '......kkkk......',
    '....kkhHHhkk....',
    '...khHHhhhhhk...',
    '..khHhhhhhhhggk.',
    '.kghHhhhhhhhhggk',
    '.kghsShhhhhhhhgk',
    '.kghssssshhhhhgk',
    '.kghshgsssghhhgk',
    '.kghsggsssggshgk',
    '.kghsEEsssEEshgk',
    '.kghesssdsssehgk',
    '.kghsssMTMssshgk',
    '.kghksssmssskhgk',
    '.kgh.kssssdk.hgk',
    '.kgh..kkkkk..hgk',
    '.kgh.........hgk',
    '.kgh.........hgk',
    '..kk.........kk.',
  ],
  se: [
    '.....kkkkkk.....',
    '...kkhHHhhhkk...',
    '..khHHhhhhhhhk..',
    '.khHhhhhhhhhhhk.',
    '.kgHhhhhhhhhhhgk',
    '.kghhhsShhhhhhgk',
    '.kghhssssshhhhgk',
    '.kghhshgsssghhk.',
    '.kghhsggsssggsk.',
    '.kghhsEwsssEwsk.',
    '.kghhesssssdesk.',
    '.kghhssssMTMsk..',
    '.kghksssssmdk...',
    '.kgh...ksssdk...',
    '.kgh....kkkkhgk.',
    '.kgh.......khgk.',
    '.kgh.......khgk.',
    '..kk........kk..',
  ],
  e: [
    '....kkkkkk......',
    '..kkhHHhhhkk....',
    '.khHHhhhhhhhk...',
    'khHhhhhhhhhhhk..',
    'kghhhhhhhhhhsSk.',
    'kghhhhhhhhhsssk.',
    'kghhhhhhhhsggsk.',
    'kghhhhhhhsssssk.',
    'kghhhhkssssggsk.',
    'kghhhhkdssswEsk.',
    'kghhhhkssssssdk.',
    'kghhhhhkssssMMk.',
    'kghhhhhhksssmk..',
    'kghhhhhhhkssk...',
    'kghhhhhhhkkk....',
    '.kghhhhhk.......',
    '.kghhhhk........',
    '..kkkkk.........',
  ],
  ne: [
    '......kkkkk.....',
    '....kkhHHhhkk...',
    '...khHHhhhhhhk..',
    '..khHhhhhhhhhhk.',
    '.khHhhhhhhhhhhgk',
    '.kghhhhhhhhhhhgk',
    '.kghhhhhhhhhhhsk',
    '.kghhhhhhhhhhssk',
    '.kghhhhhhhhhhssk',
    '.kghhhhhhhhhhsdk',
    '.kghhhhhhhhhhksk',
    '.kghhhhhhhhhhkdk',
    '.kghhhhhhhhhhk..',
    '.kghhhhhhhhhgk..',
    '.kghhhhhhhhhgk..',
    '.kghhhhhhhhhgk..',
    '..kghhhhhhhgk...',
    '...kkkkkkkkk....',
  ],
  n: [
    '......kkkk......',
    '....kkhHHhkk....',
    '...khHHhhhhhk...',
    '..khHhhhhhhhhhk.',
    '.khHhhhhhhhhhhgk',
    '.kghHhhhhhhhhhgk',
    '.kghhhhhhhhhhhgk',
    '.kghhhhhhhhhhhgk',
    '.kghhhhhhhhhhhgk',
    '.kghhhhhhhhhhhgk',
    '.kghhhhhhhhhhhgk',
    '.kghhhhhhhhhhhgk',
    '.kghhhhhhhhhhhgk',
    '.kghhhhhhhhhhhgk',
    '.kghhhhhhhhhhhgk',
    '.kghhhhhhhhhhhgk',
    '..kghhhhhhhhhgk.',
    '...kkkkkkkkkkk..',
  ],
};
// Facing left you see her swept side: the bangs come down over the near half of her forehead, the part is away from you.
const mirror = (rows) => rows.map((r) => [...r].reverse().join(''));
/** A head turned the other way: mirrored, with the light kept on the upper left. rows: hand fixes, by row number. */
export function leftFacing(src, rows = {}) {
  const out = mirror(src).map((r) => [...r]);
  // Keep the light on the upper left: the hair's shine stays where the source had it.
  out.forEach((r, y) => r.forEach((ch, x) => {
    if (ch === 'H') r[x] = 'h';
    if (src[y][x] === 'H' && (r[x] === 'h' || r[x] === 'g')) r[x] = 'H';
  }));
  for (const [y, row] of Object.entries(rows)) out[y] = [...row];
  return out.map((r) => r.join(''));
}
HEADS.sw = leftFacing(HEADS.se, { 5: 'kgSshhhhhhhhhgk.', 6: 'kgssssshhhhhhgk.', 7: '.khgsssshhhhhgk.' });
HEADS.w = leftFacing(HEADS.e, { 4: '.kghhhhhhhhhhhgk', 5: '.khHhhhhhhhhhhgk', 6: '.kshhhhhhhhhhhgk' });
HEADS.nw = leftFacing(HEADS.ne, {});
// The head's pixel that sits on the rig's head position.
const HEAD_X = 8, HEAD_Y = 8;
const HEAD_PAL = {
  k: '#0b0d17', g: '#131216', h: '#211d22', H: '#352d31', s: '#eabf91', S: '#f8d9b8', d: '#d29a6c',
  E: '#3a2218', w: '#e6ddd4', e: '#ee9f8c', M: '#8f4636', T: '#f6f1ea', m: '#c97a70',
};

const PAL = {
  ink: '#0b0d17',
  skin: ['#d29a6c', '#eabf91', '#f8d9b8'],
  shirt: ['#a1172a', '#d3212f', '#ff6a55'],
  jeans: ['#34416e', '#4a5b92', '#6b80b8'],
  cuff: ['#4a5b92', '#6b80b8', '#8a9cd0'],
  sockL: ['#c48a0a', '#ffc61a', '#ffe07a'],
  sockR: ['#1d55e8', '#4a90ff', '#8fbcff'],
  shoe: ['#b9c0d4', '#f4f6fb', '#ffffff'],
  sole: ['#4b5269', '#7882a3', '#7882a3'],
  board: ['#9aa3bd', '#c9d0de', '#e3e7f0'],
  print: '#fff4ee',
  pad: ['#141519', '#23252c', '#3a3d48'],
  hem: ['#6b0f1b', '#a1172a', '#d3212f'],
  // Props for the pits' gaits: an FRC battery (a black case, its red lead and white label) and a yellow drill.
  battery: ['#141519', '#23252c', '#3a3d48'],
  drill: ['#a3650a', '#ffc61a', '#fff17a'],
  chuck: ['#3f4761', '#7882a3', '#c4cbe0'],
  lead: '#d3212f',
  label: '#e8ecf5',
};
/**
 * Her look. Others pass their own: { id, pal (as PAL), heads ({ s: rows, ... }), headPal, board }, and if they like
 * hoodie (a pullover: down over the hips, ribbed hem, the hood round the neck), sleeves: 'long', and badge (rectangles
 * [dx, dy, w, h, colour] painted on the chest when it's toward you, from its middle, in place of the print).
 */
export const HERO_LOOK = { id: 'hero', pal: PAL, heads: HEADS, headPal: HEAD_PAL, board: true };

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
  // On a bleacher bench: thighs forward, shins down, hands on knees; cheering puts both arms up.
  sit: { hip: 0, hipBias: 85, knee: 0, kneeBase: 90, arm: 0, elbow: 55, lean: 0, flight: 0 },
  cheer: { hip: 0, hipBias: 85, knee: 0, kneeBase: 90, arm: 0, armUp: 165, elbow: 12, lean: 0, flight: 0 },
  // On their feet cheering: standing, both arms up and out in a V, the hands clear of the head.
  armsUp: { hip: 0, hipBias: 0, knee: 0, kneeBase: 2, arm: 0, armUp: 172, armOut: 28, elbow: 0, lean: 0, flight: 0 },
  // At the driver station: standing, both hands out in front on a controller.
  drive: { hip: 0, hipBias: 0, knee: 0, kneeBase: 2, arm: 0, armUp: 22, elbow: 62, lean: 3, flight: 0 },
  // Celebrating on their feet, pumping their fists: both arms thrown up and out in a V at the top of each jump, then
  // pulled in, elbows bent, as they land, knees bent. reach lengthens the arms so the fists clear the big head; turned
  // three-quarters to you (sw or se) both arms show.
  celebrate: {
    hip: 0, hipBias: 0, knee: 0, kneeBase: 2, arm: 0, lean: -4, flight: 0,
    keys: [
      { armUp: 168, elbow: 8, reach: 1.35, spread: 30, lean: -6 },
      { armUp: 130, elbow: 40, reach: 1.3, spread: 35, lean: -2, kneeBase: 18, hipBias: 10 },
    ],
  },
  // Seated at a steering wheel (hands forward on its rim), or over a phone held in both hands (held: a box in the hands).
  steer: { hip: 0, hipBias: 85, knee: 0, kneeBase: 90, arm: 0, armUp: 45, elbow: 77, inward: -0.5, lean: 0, flight: 0 },
  phone: {
    hip: 0, hipBias: 85, knee: 0, kneeBase: 90, arm: 0, armUp: 0, elbow: 125, inward: -5, lean: 0, flight: 0,
    held: { at: [0, 33.4, 5.6], half: [1.5, 2.6, 0.3] },
  },
  // The pits: working on a robot. kneel: one knee down beside a robot on its cart, hands on its frame about 20 px up,
  // the drill in the right hand (four frames: the drilling loop). lean: bent over at the hips, hands resting on a robot
  // or a laptop 20-26 px up (two frames: typing). carry: the walk with a battery held at the waist in both hands. push:
  // the walk with both hands on a cart's handle about 26 px up. carry and push step like the walk, but stage.js's
  // STRIDE has only walk and run, so callers pass frame = Math.floor(dist / 3.2) % 8, and frame 0 when they stop: it's
  // standing still, legs together. Fields only these use, each off unless set: legsAt (each leg, left then right, as
  // [hip, knee]), armsAt (each arm as [angle, elbow, inward]), work (degrees each arm moves out and back over the frames),
  // still (frame 0 stands), back (the body sits this far back of the floor point, so a kneeler's shadow is under the
  // knee and the foot) and prop ('battery' or 'drill').
  kneel: { hip: 0, hipBias: 0, knee: 0, kneeBase: 0, arm: 0, elbow: 0, lean: 18, flight: 0,
    legsAt: [[0, 92], [88, 88]], armsAt: [[62, 38, -0.6], [66, 34, -0.6]], work: [0, -10], back: 3, prop: 'drill' },
  lean: { hip: 0, hipBias: 0, knee: 0, kneeBase: 0, arm: 0, elbow: 0, lean: 28, flight: 0,
    legsAt: [[9, 4], [9, 4]], armsAt: [[46, 22, 0], [46, 22, 0]], work: [-6, 6], back: 3 },
  carry: { hip: 24, hipBias: 0, knee: 42, kneeBase: 4, arm: 0, elbow: 0, lean: -3, flight: 0,
    armsAt: [[15, 39, -3.1], [15, 39, -3.1]], still: true, prop: 'battery' },
  push: { hip: 24, hipBias: 0, knee: 42, kneeBase: 4, arm: 0, elbow: 0, lean: 8, flight: 0,
    armsAt: [[11, 99, -1.2], [11, 99, -1.2]], still: true },
};

function pose(dirIndex, gait, phase, look) {
  // A gait with keys holds a different pose on each of its frames.
  const spec = GAITS[gait], keys = spec.keys;
  const g = keys ? { ...spec, ...keys[Math.round(phase * keys.length) % keys.length] } : spec;
  const th = rad(dirIndex * 45);
  const F = [Math.sin(th), 0, Math.cos(th)], U = [0, 1, 0], R = [-Math.cos(th), 0, Math.sin(th)];
  const at = (r, u, f) => add(add(mul(R, r), mul(U, u)), mul(F, f));
  const swing = (deg) => [Math.sin(rad(deg)), -Math.cos(rad(deg))]; // [forward, up] of a limb hanging at that angle

  // Legs: hip angle forward, knee folding back.
  const legs = [-1, 1].map((side) => {
    const q = phase + (side < 0 ? 0 : 0.5);
    const s2 = Math.sin(2 * Math.PI * q), c2 = Math.cos(2 * Math.PI * q);
    let hip = g.hipBias + g.hip * s2;
    let knee = g.kneeBase + g.knee * Math.max(0, Math.cos(2 * Math.PI * q + (gait === 'run' ? 0.7 : 0.35))) ** 1.3;
    if (g.legsAt) [hip, knee] = g.legsAt[side < 0 ? 0 : 1];
    if (g.still && phase === 0) [hip, knee] = [g.hipBias, g.kneeBase];
    const [tf, tu] = swing(hip), [sf, su] = swing(hip - knee);
    return { side, hip, knee, tf, tu, sf, su, c2 };
  });
  const THIGH = 9.6, SHIN = 9.2, ANKLE = 1.4;
  const hipY = Math.max(...legs.map((l) => -(l.tu * THIGH + l.su * SHIN))) + ANKLE;
  const lift = gait === 'run' ? g.flight * Math.max(0, Math.sin(4 * Math.PI * (phase + 0.06))) : 0;
  const base = Math.round((hipY + lift) * 2) / 2;
  const parts = [];
  const ahead = -(g.back ?? 0); // how far the body sits ahead of the floor point: a kneeler sits back of it

  for (const l of legs) {
    const hipP = at(l.side * 2.5, base, ahead);
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
    return at(r, base + du * Math.cos(lean), f + du * Math.sin(lean) + ahead);
  };
  const axesLean = [R, norm(at(0, Math.cos(lean), Math.sin(lean))), norm(at(0, -Math.sin(lean), Math.cos(lean)))];
  const torsoY = (u) => base + (u - 23);
  const hoodie = !!look.hoodie;
  const hips = (h) => (!hoodie || h.local[1] < -0.3 ? 'jeans' : h.local[1] < 0.05 ? 'hem' : 'shirt');
  parts.push(ellipsoid(body(0, torsoY(24.4), 0), axesLean, [4.7, 3.3, 3.0], hips, 'torso'));
  parts.push(ellipsoid(body(0, torsoY(28.6), 0.1), axesLean, [4.1, 3.9, 2.75], (h) => (h.local[1] < -0.6 && !hoodie ? 'jeans' : 'shirt'), 'torso'));
  parts.push(ellipsoid(body(0, torsoY(33.2), 0.2), axesLean, [5.0, 4.4, 3.1], () => 'shirt', 'torso'));
  for (const side of [-1, 1]) parts.push(ellipsoid(body(side * 4.6, torsoY(35.8), 0), axesLean, [2.0, 1.9, 2.0], () => 'shirt', 'torso'));
  if (hoodie) {
    // The hood: bunched round the neck, and hanging down the back.
    parts.push(ellipsoid(body(0, torsoY(36.9), -0.9), axesLean, [3.6, 1.5, 2.9], () => 'shirt', 'torso'));
    parts.push(ellipsoid(body(0, torsoY(34.4), -2.9), axesLean, [3.1, 2.7, 0.9], () => 'shirt', 'torso'));
  }
  parts.push(capsule(body(0, torsoY(36.2), -0.3), body(0, torsoY(39.6), -0.1), 1.45, () => 'skin', 'head'));

  const head = body(0, torsoY(43.8), 0.35);

  // Arms swing against the legs. Running, her left arm holds the board tucked against her side. Driving, both hands
  // come in to the controller. A gait with armOut (degrees, none if it isn't set) also swings both arms out to the
  // side, so arms held high make a V with the hands clear of the head.
  const s2 = Math.sin(2 * Math.PI * phase);
  const inward = g.inward ?? (gait === 'drive' ? -2.6 : 0);
  const outS = Math.sin(rad(g.armOut ?? 0)), outC = Math.cos(rad(g.armOut ?? 0));
  for (const side of [-1, 1]) {
    const tucked = gait === 'run' && side < 0 && look.board;
    let a = g.armUp ?? (tucked ? -10 + 8 * s2 : (side < 0 ? -1 : 1) * g.arm * s2);
    let e = tucked ? 70 : g.elbow, inner = inward;
    if (g.armsAt) [a, e, inner = 0] = g.armsAt[side < 0 ? 0 : 1];
    if (g.work) a += (g.work[side < 0 ? 0 : 1] * (1 - Math.cos(2 * Math.PI * phase))) / 2;
    const shoulder = body(side * 5.3, torsoY(35.6), -0.1);
    const [uf, uu] = swing(a), [ff, fu] = swing(a + e);
    // Longer arms let raised fists clear the big head; spread and armOut swing them out to the sides, into a V.
    const reach = g.reach ?? 1, so = Math.sin(rad(g.spread ?? 0)), co = Math.cos(rad(g.spread ?? 0));
    const elbowP = add(shoulder, at(side * (0.9 + so * 7.0 * reach + uu * 7.0 * outS), uu * 7.0 * reach * co * outC, uf * 7.0 * reach));
    const wrist = add(elbowP, at(side * ((tucked ? -0.8 : 0.3 + inner) + so * 6.0 * reach + fu * 6.0 * outS), fu * 6.0 * reach * co * outC, ff * 6.0 * reach));
    const group = side < 0 ? 'armL' : 'armR';
    const long = look.sleeves === 'long';
    parts.push(capsule(shoulder, elbowP, 1.45, (h) => (long || h.local[0] < 0.42 ? 'shirt' : 'skin'), group));
    parts.push(capsule(elbowP, wrist, 1.25, (h) => (!long ? 'skin' : h.local[0] > 0.8 ? 'hem' : 'shirt'), group));
    parts.push(ellipsoid(wrist, [R, U, F], [1.35, 1.35, 1.35], () => 'skin', group));
    if (side < 0 && look.board && !g.armsAt) {
      // The whiteboard: hanging from her hand at a walk, under her arm at a run. It faces out to her side.
      const c = tucked ? body(-5.6, torsoY(30.4), 0.6) : add(wrist, at(-0.4, -2.6, 0.6));
      parts.push(box(c, [R, U, F], [0.35, 2.4, 3.1], () => 'board', 'board'));
    }
    if (side > 0 && g.prop === 'drill') {
      // A cordless drill in the fist, pointing ahead: the yellow body over the hand, the steel chuck at its nose.
      parts.push(box(add(wrist, at(0, 1.6, 0.2)), [R, U, F], [0.8, 1.1, 1.9], () => 'drill', 'prop'));
      parts.push(box(add(wrist, at(0, 1.7, 2.7)), [R, U, F], [0.55, 0.6, 0.6], () => 'chuck', 'prop'));
    }
  }
  if (gait === 'drive') parts.push(box(body(0, torsoY(28.4), 8.2), axesLean, [3.8, 0.9, 1.7], () => 'pad', 'pad'));
  if (g.held) parts.push(box(body(g.held.at[0], torsoY(g.held.at[1]), g.held.at[2]), axesLean, g.held.half, () => g.held.mat ?? 'pad', 'pad'));
  // An FRC battery held out in front at the waist: about 7 inches square, and a little thicker than its 3 inches so it
  // shows from the side.
  const battery = g.prop === 'battery' ? body(0, torsoY(27.4), 6.6) : null;
  if (battery) parts.push(box(battery, axesLean, [2.5, 2.1, 1.7], () => 'battery', 'prop'));
  return { parts, head, axes: axesLean, R, U, F, chest: body(0, torsoY(33.2), 0.2), base, battery };
}

// ---- Rendering ----
function render(dirIndex, gait, phase, look) {
  const PAL = look.pal;
  const rig = pose(dirIndex, gait, phase, look);
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
  // The shirt print, on the chest or the back, whichever is toward you.
  const paint = (x0, y0, w, h, col, onMat) => {
    for (let yy = y0; yy < y0 + h; yy++) {
      for (let xx = x0; xx < x0 + w; xx++) {
        const i = yy * W + xx;
        if (xx >= 0 && yy >= 0 && xx < W && yy < H && matBuf[i] === onMat && !ink[i]) out[i] = col;
      }
    }
  };
  const plot = (p, w, h, col, onMat) => {
    const [x, y] = project(p);
    paint(Math.round(x - w / 2), Math.round(y - h / 2), w, h, col, onMat);
  };
  const [, Uh, Fh] = rig.axes;
  const printAt = (sideSign) => add(rig.chest, add(mul(Fh, 3.2 * sideSign), mul(Uh, 0.6)));
  if (PAL.print && dot(Fh, TO_CAMERA) > 0.3) plot(printAt(1), 4, 2, PAL.print, 'shirt');
  if (PAL.print && dot(mul(Fh, -1), TO_CAMERA) > 0.3) plot(printAt(-1), 4, 2, PAL.print, 'shirt');
  if (look.badge && dot(Fh, TO_CAMERA) > 0.3) {
    const [bx, by] = project(printAt(1)).map(Math.round);
    for (const [dx, dy, w, h, col] of look.badge) paint(bx + dx, by + dy, w, h, col, 'shirt');
  }
  // The battery's red lead on its top and its white label, wherever they show.
  if (rig.battery) {
    plot(add(rig.battery, mul(Uh, 1.6)), 1, 1, PAL.lead, 'battery');
    plot(rig.battery, 2, 1, PAL.label, 'battery');
  }
  // The head, drawn by hand for this direction, over the neck and shoulders.
  const [hx, hy] = project(rig.head);
  const hx0 = Math.round(hx) - HEAD_X, hy0 = Math.round(hy) - HEAD_Y;
  (look.heads[DIRS[dirIndex]] ?? look.heads.s).forEach((row, y) => [...row].forEach((ch, x) => {
    const px = hx0 + x, py = hy0 + y;
    if (ch !== '.' && px >= 0 && py >= 0 && px < W && py < H) out[py * W + px] = look.headPal[ch];
  }));
  return out;
}

const cache = new Map();
/** One frame as a canvas. gait: one of FRAMES' keys; frame counts from 0 (wraps); look defaults to her. */
export function walkerFrame(dir, gait, frame = 0, look = HERO_LOOK) {
  const d = typeof dir === 'number' ? ((dir % 8) + 8) % 8 : DIRS.indexOf(dir);
  const n = FRAMES[gait];
  const f = ((frame % n) + n) % n;
  const key = `${look.id} ${d} ${gait} ${f}`;
  if (!cache.has(key)) {
    const pixels = render(d, gait, f / n, look);
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

/** Draw someone (her, unless another look is given) with their feet on (x, y) in canvas pixels. */
export function drawWalker(g, x, y, dir, gait, frame, look = HERO_LOOK) {
  g.drawImage(walkerFrame(dir, gait, frame, look), Math.round(x) - FOOT_X, Math.round(y) - FOOT_Y);
}
