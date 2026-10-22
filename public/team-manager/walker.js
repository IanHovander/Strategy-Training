// The hero as a walking sprite: 8 directions, standing, walking and running. Her body is a small 3D rig (ellipsoids and
// capsules posed by a gait cycle) that is ray-cast to pixels, shaded in three tones from her palette and outlined in
// ink, so every direction and frame stays consistent. Her head is hand-drawn for each direction in the portrait's style
// (hero.js), since that's where the likeness lives. Frames are made the first time they're drawn, then cached.
//
// The camera looks down at 20 degrees. Directions turn clockwise from facing you: s, se, e, ne, n, nw, w, sw.
// Other people use the same rig with their own look (colours and hand-drawn heads); see bleachers.js.
//
// An emcee's kit, for whoever's look asks for it: inline skates in place of shoes (look.skates: a boot up over the
// ankle, a frame under it and a row of three wheels on the floor, so she stands a little taller), a handheld mic in
// her right hand (look.mic), and the gaits that go with them: skate (the glide), flair (the stop), emcee (mic to the
// mouth) and offer (the mic held out to someone).

export const DIRS = ['s', 'se', 'e', 'ne', 'n', 'nw', 'w', 'sw'];
export const FRAMES = { stand: 1, walk: 8, run: 8, sit: 1, cheer: 1, drive: 1, skate: 8, flair: 1, emcee: 1, offer: 1 };
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
};
/**
 * Her look. Others pass their own: { id, pal (as PAL), heads ({ s: rows, ... }), headPal, board }, and if they like
 * hoodie (a pullover: down over the hips, ribbed hem, the hood round the neck), sleeves: 'long', and badge (rectangles
 * [dx, dy, w, h, colour] painted on the chest when it's toward you, from its middle, in place of the print).
 * skates: inline skates (pal.boot, pal.frame, pal.wheel), and mic: a handheld mic in the right hand (pal.mic, the grip,
 * and pal.micHead).
 */
export const HERO_LOOK = { id: 'hero', pal: PAL, heads: HEADS, headPal: HEAD_PAL, board: true };
// The kit's colours, for a look that asks for skates or a mic without giving its own: white boots, steel frames,
// yellow wheels, a black mic with a steel head.
const KIT = {
  boot: ['#b9c0d4', '#e8ecf5', '#ffffff'], frame: ['#3f4761', '#7882a3', '#c4cbe0'], wheel: ['#a3650a', '#ffc61a', '#fff17a'],
  mic: ['#141519', '#23252c', '#3a3d48'], micHead: ['#7882a3', '#c4cbe0', '#ffffff'],
};
/** How much higher she rides on skates: her ankles stand this far above the floor so the wheels are on it. */
const SKATE_LIFT = 2.8;

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
const mix = (a, b, u) => a + (b - a) * u;
const ease = (u) => u * u * (3 - 2 * u);
// The skating stride, one leg's turn (q from 0 to 1, the other leg half a turn behind): half the time it glides under
// her on a bent knee, then it pushes out to the side and back with the skate turned out, keeping its wheels on the
// floor (plant), then lifts and swings back in under her.
function skateLeg(q) {
  if (q < 0.5) {
    const k = Math.sin((Math.PI * q) / 0.5);
    return { hip: 24 + 6 * k, knee: 44 + 10 * k, splay: -3, toe: 8 };
  }
  if (q < 0.78) {
    const u = ease((q - 0.5) / 0.28);
    return { hip: mix(24, -12, u), knee: mix(44, 4, u), splay: mix(-3, 22, u), toe: mix(8, 34, u), plant: true };
  }
  const u = (q - 0.78) / 0.22, e = ease(u);
  const up = Math.sin(Math.PI * u);
  return { hip: mix(-12, 24, e), knee: mix(4, 44, e) + 26 * up, splay: mix(22, -3, e), toe: mix(34, 8, e), tip: 10 * up };
}
// Arms swing against the legs and out wide, wider still going back.
function skateArm(phase, side) {
  const s = Math.sin(2 * Math.PI * phase);
  return { a: side * 30 * s, e: 30, out: 10 + 26 * Math.max(0, -side * s) };
}
// Skates a little apart and turned out, for standing still on them.
const skateStand = () => ({ hip: 3, knee: 7, splay: 6, toe: 16 });

const GAITS = {
  stand: { hip: 0, hipBias: 0, knee: 0, kneeBase: 2, arm: 0, elbow: 10, lean: 0, flight: 0 },
  walk: { hip: 24, hipBias: 0, knee: 42, kneeBase: 4, arm: 20, elbow: 16, lean: 2, flight: 0 },
  run: { hip: 38, hipBias: 6, knee: 95, kneeBase: 18, arm: 42, elbow: 88, lean: 11, flight: 1.4 },
  // On a bleacher bench: thighs forward, shins down, hands on knees; cheering puts both arms up.
  sit: { hip: 0, hipBias: 85, knee: 0, kneeBase: 90, arm: 0, elbow: 55, lean: 0, flight: 0 },
  cheer: { hip: 0, hipBias: 85, knee: 0, kneeBase: 90, arm: 0, armUp: 165, elbow: 12, lean: 0, flight: 0 },
  // At the driver station: standing, both hands out in front on a controller.
  drive: { hip: 0, hipBias: 0, knee: 0, kneeBase: 2, arm: 0, armUp: 22, elbow: 62, lean: 3, flight: 0 },
  // The emcee's, for a look on skates with a mic. These give each limb its own angles: legs(q, side) and arms(phase,
  // side) as above (splay out to her side, toe turned out, out for an arm raised out to the side), sway(phase) shifts
  // her over one leg, micTilt tips the mic forward. Gliding: leaning in, swaying over the gliding skate.
  skate: { lean: 15, legs: skateLeg, arms: skateArm, sway: (phase) => -1.2 * Math.sin(2 * Math.PI * phase) },
  // The stop with style: her left skate out to the side, the free arm flung up and out, the mic arm out.
  flair: {
    lean: -2, sway: () => 0.6,
    legs: (q, side) => (side < 0 ? { hip: 4, knee: 2, splay: 30, toe: 48, plant: true } : { hip: 10, knee: 16, splay: -4, toe: 10 }),
    arms: (phase, side) => (side < 0 ? { a: 10, e: 34, out: 116 } : { a: 18, e: 70, out: 26 }),
  },
  // Talking to the crowd: mic to her mouth, the free arm out to the side, palm up. The mic arm comes forward with the
  // forearm tipped in across her, so the mic's head is at the corner of her mouth facing you and under it turned away.
  emcee: {
    lean: 0, legs: skateStand, micTilt: 0,
    arms: (phase, side) => (side > 0 ? { a: 62, e: 104, out: 56 } : { a: 20, e: 52, out: 62 }),
  },
  // The mic held straight out at shoulder height, toward whoever she faces.
  offer: {
    lean: 0, legs: skateStand, micTilt: 62,
    arms: (phase, side) => (side > 0 ? { a: 60, e: 58, out: -6 } : { a: -8, e: 18, out: 12 }),
  },
};

function pose(dirIndex, gait, phase, look) {
  const g = GAITS[gait];
  const th = rad(dirIndex * 45);
  const F = [Math.sin(th), 0, Math.cos(th)], U = [0, 1, 0], R = [-Math.cos(th), 0, Math.sin(th)];
  const at = (r, u, f) => add(add(mul(R, r), mul(U, u)), mul(F, f));
  const swing = (deg) => [Math.sin(rad(deg)), -Math.cos(rad(deg))]; // [forward, up] of a limb hanging at that angle

  // Legs: hip angle forward, knee folding back. A gait with its own legs(q, side) gives each leg's angles itself, and
  // can splay a leg out to her side, turn its foot out (toe) or tip it (tip).
  const legs = [-1, 1].map((side) => {
    const q = phase + (side < 0 ? 0 : 0.5);
    const s2 = Math.sin(2 * Math.PI * q), c2 = Math.cos(2 * Math.PI * q);
    const own = g.legs?.(q % 1, side);
    const hip = own ? own.hip : g.hipBias + g.hip * s2;
    const knee = own ? own.knee : g.kneeBase + g.knee * Math.max(0, Math.cos(2 * Math.PI * q + (gait === 'run' ? 0.7 : 0.35))) ** 1.3;
    const [tf, tu] = swing(hip), [sf, su] = swing(hip - knee);
    return { side, hip, knee, tf, tu, sf, su, c2, splay: own?.splay ?? 0, toe: own?.toe ?? 0, tip: own?.tip ?? 0, plant: !!own?.plant };
  });
  const THIGH = 9.6, SHIN = 9.2, ANKLE = 1.4;
  const legReach = (l) => -(l.tu * THIGH + l.su * SHIN);
  // A planted leg (a skate pushing off) splays out as far as it takes to keep its foot on the floor.
  if (legs.some((l) => l.plant)) {
    const stands = Math.max(...legs.filter((l) => !l.plant).map((l) => legReach(l) * Math.cos(rad(l.splay))));
    for (const l of legs) if (l.plant && legReach(l) > stands) l.splay = Math.max(l.splay, (Math.acos(stands / legReach(l)) * 180) / Math.PI);
  }
  const hipY = Math.max(...legs.map((l) => legReach(l) * (l.splay ? Math.cos(rad(l.splay)) : 1))) + ANKLE;
  const lift = gait === 'run' ? g.flight * Math.max(0, Math.sin(4 * Math.PI * (phase + 0.06))) : 0;
  const base = Math.round((hipY + lift + (look.skates ? SKATE_LIFT : 0)) * 2) / 2;
  // Sideways over one leg, for a gait that sways (skating: over the gliding skate).
  const sway = g.sway ? g.sway(phase) : 0;
  const parts = [];

  for (const l of legs) {
    const hipP = at(l.side * 2.5 + sway, base, 0);
    const sp = rad(l.side * l.splay);
    const limb = (u, f) => (l.splay ? at(-u * Math.sin(sp), u * Math.cos(sp), f) : at(0, u, f));
    const kneeP = add(hipP, limb(l.tu * THIGH, l.tf * THIGH));
    const ankle = add(kneeP, limb(l.su * SHIN, l.sf * SHIN));
    const group = l.side < 0 ? 'legL' : 'legR';
    parts.push(capsule(hipP, kneeP, 2.2, () => 'jeans', group));
    parts.push(capsule(kneeP, ankle, 1.85, (h) => (h.local[0] > 0.82 ? 'cuff' : 'jeans'), group));
    if (look.skates) {
      // An inline skate: a boot up over the ankle, the frame under it and three wheels in a row on the floor. It points
      // her way, turned out by toe, its toe dipping by tip as it leaves the floor.
      const toe = rad(l.side * l.toe), tip = rad(l.tip);
      const flat = add(mul(F, Math.cos(toe)), mul(R, Math.sin(toe)));
      const axes = [
        add(mul(R, Math.cos(toe)), mul(F, -Math.sin(toe))),
        add(mul(U, Math.cos(tip)), mul(flat, Math.sin(tip))),
        add(mul(flat, Math.cos(tip)), mul(U, -Math.sin(tip))),
      ];
      const on = (u, f) => add(ankle, add(mul(axes[1], u), mul(axes[2], f)));
      parts.push(capsule(on(-0.3, 0), add(ankle, mul(norm(sub(kneeP, ankle)), 3.0)), 1.95, () => 'boot', group));
      parts.push(ellipsoid(on(-0.55, 1.0), axes, [1.75, 1.15, 2.8], () => 'boot', group));
      parts.push(box(on(-1.95, 0.8), axes, [0.95, 0.42, 3.6], () => 'frame', group));
      // The wheels are a pixel apart, so from the side an ink line falls between them.
      for (const k of [-1, 0, 1]) parts.push(ellipsoid(on(-3.35, 0.8 + 2.9 * k), axes, [0.8, 0.95, 0.95], () => 'wheel', group));
      continue;
    }
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
    return at(r + sway, base + du * Math.cos(lean), f + du * Math.sin(lean));
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
  // come in to the controller.
  const s2 = Math.sin(2 * Math.PI * phase);
  const inward = gait === 'drive' ? -2.6 : 0;
  for (const side of [-1, 1]) {
    const tucked = gait === 'run' && side < 0 && look.board;
    // A gait with its own arms(phase, side) gives each arm's swing (a), elbow (e) and how far it's raised out to her
    // side (out), in degrees.
    const own = g.arms?.(phase, side);
    const a = own ? own.a : g.armUp ?? (tucked ? -10 + 8 * s2 : (side < 0 ? -1 : 1) * g.arm * s2);
    const e = own ? own.e : tucked ? 70 : g.elbow;
    const shoulder = body(side * 5.3, torsoY(35.6), -0.1);
    const [uf, uu] = swing(a), [ff, fu] = swing(a + e);
    const ab = rad(side * (own?.out ?? 0));
    const out = (r, u, f) => (ab ? at(r * Math.cos(ab) - u * Math.sin(ab), r * Math.sin(ab) + u * Math.cos(ab), f) : at(r, u, f));
    const elbowP = add(shoulder, out(side * 0.9, uu * 7.0, uf * 7.0));
    const wrist = add(elbowP, out(side * (tucked ? -0.8 : 0.3 + inward), fu * 6.0, ff * 6.0));
    const group = side < 0 ? 'armL' : 'armR';
    const long = look.sleeves === 'long';
    parts.push(capsule(shoulder, elbowP, 1.45, (h) => (long || h.local[0] < 0.42 ? 'shirt' : 'skin'), group));
    parts.push(capsule(elbowP, wrist, 1.25, (h) => (!long ? 'skin' : h.local[0] > 0.8 ? 'hem' : 'shirt'), group));
    parts.push(ellipsoid(wrist, [R, U, F], [1.35, 1.35, 1.35], () => 'skin', group));
    if (side < 0 && look.board) {
      // The whiteboard: hanging from her hand at a walk, under her arm at a run. It faces out to her side.
      const c = tucked ? body(-5.6, torsoY(30.4), 0.6) : add(wrist, at(-0.4, -2.6, 0.6));
      parts.push(box(c, [R, U, F], [0.35, 2.4, 3.1], () => 'board', 'board'));
    }
    if (side > 0 && look.mic) {
      // The mic stands up out of her right fist, tipped forward by the gait's micTilt (most of the way over unless it
      // says), so it shows past her hand: the grip, then the head.
      const tilt = rad(g.micTilt ?? 50), up = add(mul(U, Math.cos(tilt)), mul(F, Math.sin(tilt)));
      parts.push(capsule(add(wrist, mul(up, 0.8)), add(wrist, mul(up, 2.9)), 0.65, () => 'mic', 'mic'));
      parts.push(ellipsoid(add(wrist, mul(up, 3.8)), [R, U, F], [1.1, 1.1, 1.1], () => 'micHead', 'mic'));
    }
  }
  if (gait === 'drive') parts.push(box(body(0, torsoY(28.4), 8.2), axesLean, [3.8, 0.9, 1.7], () => 'pad', 'pad'));
  return { parts, head, axes: axesLean, R, U, F, chest: body(0, torsoY(33.2), 0.2), base };
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
  for (let i = 0; i < W * H; i++) if (matBuf[i]) color[i] = (PAL[matBuf[i]] ?? KIT[matBuf[i]])[shadeBuf[i]];
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
  // A mic (and the hand holding it) up in front of her face stays in front of the head, outlined against it.
  const front = look.mic ? new Uint8Array(W * H) : null;
  if (front) {
    const face = dot(rig.head, VIEW) + 60 - 3.5;
    for (let i = 0; i < W * H; i++) if ((groupBuf[i] === 'mic' || groupBuf[i] === 'armR') && depthBuf[i] < face) front[i] = 1;
  }
  const before = front && out.slice();
  // The head, drawn by hand for this direction, over the neck and shoulders.
  const [hx, hy] = project(rig.head);
  const hx0 = Math.round(hx) - HEAD_X, hy0 = Math.round(hy) - HEAD_Y;
  (look.heads[DIRS[dirIndex]] ?? look.heads.s).forEach((row, y) => [...row].forEach((ch, x) => {
    const px = hx0 + x, py = hy0 + y;
    if (ch !== '.' && px >= 0 && py >= 0 && px < W && py < H) out[py * W + px] = look.headPal[ch];
  }));
  if (front) {
    for (let i = 0; i < W * H; i++) {
      if (front[i]) out[i] = before[i];
      else if (out[i] !== before[i] && [1, -1, W, -W].some((d) => front[i + d])) out[i] = PAL.ink;
    }
  }
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
