// The robots for the match simulation (sim.js): the kinds of 2019 robot there were, as archetypes, and the teams at
// the opening's event with their numbers, so any scene can play their matches for real. Pure data, no DOM.
//
// An archetype is a robot's abilities (sim.js says what each one means) and the sprite that draws it (bots.js). A team
// is an archetype with its own numbers on top, plus, where its story needs it, a form: the matches from which it was
// different (7461's broken intake from Friday's last match, 6834's rebuilt one). Habits are a team's usual plan.
//
// The averages in the opening's story (teams.js, teams2.js) are what each robot scores itself in a qualification match:
// leaving the HAB, the pieces it places (and any preloaded cargo its hatches hold in), and its climb. Each team below is
// tuned so that, over many matches with random partners and opponents from this event, it scores about that. The
// numbers are made up for the game, as the opening's are: no real team's robot is portrayed.
//
//   ARCHETYPES          the kinds, by key: { name, sprite, note, ...abilities }
//   TEAMS               the event's teams by number: { num, arch, target, ...abilities, form, habits }
//   EVENT               the numbers of every team at the event, for random qualification matches
//   robotOf(num, o)     a team's robot as sim.js takes it, for qualification match o.match (0 to 9), its form applied
//   planOf(num)         its usual plan (sim.js fills in the rest)
//   targetOf(num, k)    the average its story gives it, for qualification match k (before or after its form changes)
//   archetype(key, o)   a robot of that kind with o on top, for a team that isn't on the list
//   qualMatch(seed, k)  a random qualification match at the event: six teams' robots and plans, ready for simulate()

import { OURS } from '../opening/teams.js';
import { withMods } from './sim.js';

// ---- Kinds of robot ----
// Times are [mean, spread] in seconds; speed in feet a second, between places, turns and all.
export const ARCHETYPES = {
  ele: {
    name: 'ELEVATOR', sprite: 'ele', note: 'Two-stage elevator, hatch grabber, Level 3 stilts.',
    speed: 8.5, lift: 0.5, start: 2, sandstorm: 2,
    hatch: { reach: 3, ship: true, pick: [3.6, 1.2], place: [3.4, 1.1], acc: 0.9, grip: 0.95 },
    cargo: { reach: 0 },
    climb: { 1: [1, 2], 2: [0.95, 6], 3: [0.6, 13] },
    defense: 0.4, susceptibility: 0.5, push: 0.5, breakdown: 0.03, brownout: 0.03,
  },
  arm: {
    name: 'CARGO ARM', sprite: 'arm', note: 'A pivoting arm with a roller intake: cargo off the floor, up to Level 2.',
    speed: 8.5, lift: 0.7, start: 1, sandstorm: 1,
    hatch: { reach: 0 },
    cargo: { reach: 2, ship: true, floor: true, pick: [3.2, 1.1], place: [3.0, 1], acc: 0.88, grip: 0.92 },
    climb: { 1: [1, 2], 2: [0.9, 6] },
    defense: 0.4, susceptibility: 0.55, push: 0.45, breakdown: 0.03, brownout: 0.03,
  },
  def: {
    name: 'DEFENDER', sprite: 'def', note: 'Low and wide, all drivetrain. A hatch on velcro for the sandstorm.',
    speed: 11, lift: 0, start: 1, sandstorm: 1,
    hatch: { reach: 1, ship: true, pick: [5, 1.5], place: [4, 1.2], acc: 0.8, grip: 0.85 },
    cargo: { reach: 0 },
    climb: { 1: [1, 2], 2: [0.9, 5] },
    defense: 0.85, susceptibility: 0.25, push: 0.8, breakdown: 0.03, brownout: 0.04,
  },
  kitbot: {
    name: 'KITBOT', sprite: 'kitbot', note: "The kit chassis and a plywood box: hatches low, cargo dumped into the ship. A rookie's.",
    speed: 6.2, lift: 0, start: 1, sandstorm: 0,
    hatch: { reach: 1, ship: true, pick: [6.5, 2.2], place: [6, 2], acc: 0.72, grip: 0.8 },
    cargo: { reach: 0, ship: true, floor: false, pick: [6, 2], place: [5.5, 1.8], acc: 0.72, grip: 0.85 },
    climb: { 1: [1, 2.5] },
    defense: 0.3, susceptibility: 0.7, push: 0.3, breakdown: 0.07, brownout: 0.05,
  },
  ship: {
    name: 'SHIP BOT', sprite: 'ship', note: 'Low, with a roller intake and a conveyor up to the cargo ship lip.',
    speed: 9, lift: 0.4, start: 1, sandstorm: 1,
    hatch: { reach: 0 },
    cargo: { reach: 1, ship: true, floor: true, pick: [3, 1], place: [2.6, 0.9], acc: 0.9, grip: 0.93 },
    climb: { 1: [1, 2], 2: [0.9, 6] },
    defense: 0.4, susceptibility: 0.5, push: 0.5, breakdown: 0.03, brownout: 0.03,
  },
  hatchlow: {
    name: 'HATCH BOT', sprite: 'hatchlow', note: 'Low and quick, a pneumatic beak at hatch height: Level 1 and the ship.',
    speed: 9.5, lift: 0, start: 1, sandstorm: 1,
    hatch: { reach: 1, ship: true, pick: [3, 1], place: [2.8, 0.9], acc: 0.9, grip: 0.94 },
    cargo: { reach: 0 },
    climb: { 1: [1, 2], 2: [0.85, 6] },
    defense: 0.5, susceptibility: 0.4, push: 0.55, breakdown: 0.03, brownout: 0.03,
  },
  swerve: {
    name: 'SWERVE', sprite: 'swerve', note: 'Swerve drive and a cascade elevator: both pieces, every level, fast.',
    speed: 11.5, lift: 0.35, start: 2, sandstorm: 2,
    hatch: { reach: 3, ship: true, pick: [2.4, 0.8], place: [2.3, 0.8], acc: 0.93, grip: 0.96 },
    cargo: { reach: 3, ship: true, floor: true, pick: [2.2, 0.8], place: [2.2, 0.7], acc: 0.93, grip: 0.96 },
    climb: { 1: [1, 2], 2: [0.95, 5] },
    defense: 0.5, susceptibility: 0.6, push: 0.4, breakdown: 0.03, brownout: 0.03,
  },
  climber: {
    name: 'CLIMBER', sprite: 'climber', note: 'A big arm that levers it onto Level 3; a roller and a hatch beak, low.',
    speed: 8, lift: 0.3, start: 2, sandstorm: 1,
    hatch: { reach: 1, ship: true, pick: [4.5, 1.4], place: [4, 1.2], acc: 0.85, grip: 0.9 },
    cargo: { reach: 1, ship: true, floor: true, pick: [4, 1.3], place: [3.6, 1.1], acc: 0.85, grip: 0.9 },
    climb: { 1: [1, 2], 2: [0.95, 5], 3: [0.75, 10] },
    defense: 0.4, susceptibility: 0.5, push: 0.55, breakdown: 0.03, brownout: 0.03,
  },
  wedge: {
    name: 'PUSHER', sprite: 'wedge', note: 'A heavy wedge on eight wheels. Pushes anything, scores a little cargo.',
    speed: 9, lift: 0, start: 1, sandstorm: 1,
    hatch: { reach: 0 },
    cargo: { reach: 0, ship: true, floor: true, pick: [5, 1.5], place: [4.5, 1.4], acc: 0.8, grip: 0.88 },
    climb: { 1: [1, 2], 2: [0.8, 6] },
    defense: 0.75, susceptibility: 0.15, push: 0.95, breakdown: 0.03, brownout: 0.04,
  },
};

/** A robot of a kind, with o on top (abilities merge one level deep: o.cargo changes only what it names). */
export function archetype(key, o = {}) {
  const base = ARCHETYPES[key];
  const r = { ...base, ...o, arch: key, sprite: o.sprite ?? base.sprite };
  for (const k of ['hatch', 'cargo', 'climb']) r[k] = { ...base[k], ...(o[k] ?? {}) };
  // A climb level given as null: this robot can't (the archetype's stilts or arm aren't on it).
  for (const l of [1, 2, 3]) if (r.climb[l] === null) delete r.climb[l];
  delete r.name;
  delete r.note;
  return r;
}

// ---- The event's teams ----
// target: the average the story gives it (the tests check the simulation lands near it). Abilities are on top of the
// archetype's. form: from qualification match `from` on (0 to 9; seven on Friday, three Saturday morning), these
// changes. habits: its usual plan.
const team = (num, arch, o = {}) => ({ num: String(num), arch, ...o });
const LIST = [
  // Her team: a hatch robot that scores every level, and the Level 3 stilts the intro shows. About 30 a match.
  team(OURS, 'ele', {
    target: 30, speed: 8.5,
    hatch: { pick: [4.8, 1.5], place: [4.4, 1.3], acc: 0.9 },
    climb: { 1: [1, 2], 2: [0.95, 6], 3: [0.55, 13] },
  }),
  // The biggest average on the first pick's tablet: a fast cargo robot, the best at the event for six matches, then
  // something in its intake broke on Friday (its last four: about two thirds).
  team(7461, 'swerve', {
    target: 44, targetLate: 29, speed: 11,
    hatch: { pick: [2.6, 0.9], place: [2.5, 0.8] },
    cargo: { pick: [2.3, 0.8], place: [2.3, 0.7], acc: 0.93 },
    climb: { 1: [1, 2], 2: [0.95, 5] },
    form: [{ from: 6, mods: { 'cargo.grip': 0.45, 'cargo.pick': [5, 1.6], 'cargo.floor': false, 'cargo.acc': 0.85, 'hatch.pick': [4.9, 1.4], speed: 9 } }],
  }),
  // Ordinary for six matches, then a rebuilt intake on Friday: 48 a match. Mostly cargo, with a hatch beak on the end
  // of its arm to open its own spots. Level 2 every time, Level 3 half the time.
  team(6834, 'arm', {
    target: 27, targetLate: 48, speed: 8, start: 2,
    hatch: { reach: 2, ship: true, pick: [6.6, 2], place: [5.6, 1.7], acc: 0.82, grip: 0.88 },
    cargo: { reach: 2, pick: [6.5, 2], place: [5, 1.5], acc: 0.8, grip: 0.8 },
    climb: { 1: [1, 2], 2: [1, 5], 3: [0.5, 12] },
    form: [{
      from: 6,
      mods: { 'cargo.pick': [1.2, 0.4], 'cargo.place': [1.4, 0.4], 'cargo.acc': 0.96, 'cargo.grip': 0.98, 'cargo.reach': 3, 'hatch.pick': [2.3, 0.7], 'hatch.place': [2.2, 0.7], speed: 12.5 },
    }],
  }),
  // The top scorer at the event, cargo first. Light and quick, so a good defender takes a lot off it.
  team(7777, 'swerve', {
    target: 48, speed: 12, susceptibility: 0.85,
    hatch: { pick: [2.4, 0.8], place: [2.2, 0.7] },
    cargo: { pick: [1.7, 0.6], place: [1.9, 0.6], acc: 0.95 },
    climb: { 1: [1, 2], 2: [0.97, 5], 3: [0.7, 11] },
  }),
  // Steady on the cargo ship, and goes for Level 3 (made 6 in 10).
  team(6417, 'ship', {
    target: 36,
    speed: 10.5, cargo: { pick: [1.6, 0.5], place: [1.5, 0.5], acc: 0.96 },
    climb: { 1: [1, 2], 2: [0.95, 6], 3: [0.6, 13] }, start: 2,
    habits: { climb: 3 },
  }),
  team(6038, 'climber', { target: 33, speed: 9, hatch: { pick: [3.4, 1.1], place: [3.2, 1], acc: 0.88 }, cargo: { pick: [3.2, 1], place: [3, 1], acc: 0.88 }, climb: { 1: [1, 2], 2: [0.95, 5], 3: [0.45, 11] } }),
  team(6612, 'hatchlow', { target: 31, speed: 10, hatch: { reach: 2, pick: [2.3, 0.8], place: [2.3, 0.8], acc: 0.94 }, lift: 0.6, sprite: 'ele', start: 2, climb: { 1: [1, 2], 2: [0.95, 6] } }),
  team(8248, 'arm', { target: 30, speed: 9, sandstorm: 2, cargo: { pick: [3, 1], place: [2.8, 0.9], acc: 0.9 } }),
  team(9785, 'hatchlow', { target: 29, speed: 10.5, sandstorm: 2, hatch: { pick: [2.2, 0.7], place: [2.2, 0.7], acc: 0.94 }, start: 2, climb: { 1: [1, 2], 2: [0.95, 5] } }),
  // The second pick's trap: 27 a match, all of it cargo, every match much the same.
  team(2202, 'ship', { target: 27, speed: 8.5, cargo: { pick: [3.6, 1], place: [3, 0.8], acc: 0.88, grip: 0.95 }, breakdown: 0.01, brownout: 0.01 }),
  team(6017, 'climber', { target: 26, speed: 6.5, hatch: { pick: [6.8, 1.8], place: [6.5, 1.7], acc: 0.9 }, cargo: { pick: [6.6, 1.8], place: [6.3, 1.7], acc: 0.9 }, climb: { 1: [1, 2], 2: [0.95, 6], 3: null } }),
  // Hatches on the cargo ship.
  team(7311, 'hatchlow', { target: 20, speed: 7.5, hatch: { pick: [5.6, 1.6], place: [5.2, 1.5], acc: 0.82 }, habits: { where: 'ship' } }),
  // Goes for Level 3 every match and makes it two times in seven.
  team(5518, 'climber', {
    target: 20, speed: 6.5,
    hatch: { pick: [9, 2.6], place: [8.5, 2.4], acc: 0.7 }, cargo: { pick: [8.6, 2.5], place: [8, 2.3], acc: 0.7 },
    climb: { 1: [1, 2], 2: [0.9, 6], 3: [2 / 7, 12] },
    habits: { climb: 3 },
  }),
  // Defense. Quick and hard to push: its own points are few because it spends its matches on someone else's.
  team(4471, 'def', {
    target: 14, speed: 12, start: 2, sandstorm: 2, defense: 0.9, susceptibility: 0.2, push: 0.85,
    hatch: { place: [3.5, 1], acc: 0.9 }, habits: { role: 'defend' },
  }),
  // The captains and first picks the story doesn't give numbers for: strong robots, as seeds and first picks are.
  team(4000, 'swerve', { speed: 11, cargo: { pick: [2.4, 0.8] } }),
  team(2468, 'ele', { speed: 9.5, hatch: { pick: [2.8, 0.9], place: [2.8, 0.9] } }),
  team(3000, 'climber', { speed: 9, climb: { 1: [1, 2], 2: [0.95, 5], 3: [0.8, 10] } }),
  team(8086, 'arm', { speed: 9 }),
  team(5940, 'hatchlow', { speed: 9.5 }),
  team(9152, 'ship', { speed: 9 }),
  team(1357, 'arm', { speed: 9.5, cargo: { reach: 3 }, sprite: 'arm' }),
  team(8812, 'ele', { speed: 9 }),
  team(7040, 'wedge', { speed: 10 }),
  // Two rookies, so the schedule comes out even.
  team(9201, 'kitbot'),
  team(9240, 'kitbot', { sandstorm: 1, hatch: { pick: [6, 2], place: [5.5, 1.8], acc: 0.75 } }),
];
export const TEAMS = Object.fromEntries(LIST.map((t) => [t.num, t]));
export const EVENT = LIST.map((t) => t.num);

/** A team's robot for qualification match `match` (0 to 9), its form up to then applied; o.mods changes it further. */
export function robotOf(num, o = {}) {
  const t = TEAMS[String(num)];
  if (!t) return archetype('kitbot', { num: String(num) });
  const { arch, target, targetLate, form, habits, ...own } = t;
  let r = archetype(arch, own);
  const match = o.match ?? 0;
  for (const f of form ?? []) if (match >= f.from) r = withMods(r, f.mods);
  if (o.mods) r = withMods(r, o.mods);
  return r;
}
/** A team's usual plan: its habits (sim.js's defaultPlan fills in the rest). */
export const planOf = (num) => ({ ...(TEAMS[String(num)]?.habits ?? {}) });
/** The average a team should score in qualification match `match`, as its story has it. */
export function targetOf(num, match = 0) {
  const t = TEAMS[String(num)];
  if (!t?.target) return null;
  return t.targetLate != null && match >= (t.form?.[0]?.from ?? 99) ? t.targetLate : t.target;
}

// A seeded shuffle, so a random qualification match is the same every time for the same seed.
function shuffle(list, seed) {
  let s = seed >>> 0 || 1;
  const rand = () => {
    s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0;
    return s / 4294967296;
  };
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * A random qualification match at the event: six of its teams, three a side, each with its robot for qualification
 * match k and its usual plan, ready for sim.js's simulate(). o.with: numbers that must be in it (the first on blue).
 */
export function qualMatch(seed, k = 0, o = {}) {
  const pick = [...(o.with ?? []).map(String)];
  for (const n of shuffle(EVENT, seed)) if (pick.length < 6 && !pick.includes(n)) pick.push(n);
  const order = o.with?.length ? pick : shuffle(pick, seed + 1);
  const entry = (num) => ({ robot: { num, ...robotOf(num, { match: k }) }, plan: planOf(num) });
  return { seed, blue: order.slice(0, 3).map(entry), red: order.slice(3).map(entry) };
}
