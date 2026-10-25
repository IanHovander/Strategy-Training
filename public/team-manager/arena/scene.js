// The arena: part of the 2019 field with the bleachers along its far side, and the strategist on the walkway between
// them. The field, the stands, the queue and the scoring table are shared modules (field.js, bleachers.js); this file
// puts them together for stage.js, with the scene's own parts from this folder: the matches and everything between them
// (schedule.js, flow.js, crew.js), the cut scene (cutscene.js) and the ways in and out at its two ends (gate.js).
// walk.html runs it with the strategist's eight-directions sheet under it, and play.html runs it in turn with the other
// scenes.
//
// She's come over from the pits, so she comes in on the left, at the blue end by the queue: the cut scene pans along
// the field from the red end and ends on the queue with her not yet in the picture, and she walks in from off the left
// edge to START (scene.enter), past a sign pointing back to the pits. She leaves on the right, through the gap in the
// belt barrier past the scoring table, along the chute's taped lane (both ends are gate.js). Everyone standing still on
// the floor stops her, and so do the robots waiting in the queue on their carts (move); people walking by, and carts on
// the move, she lets pass.
//
// The matches are real ones, played by the match simulation, one after another (schedule.js): match 42 on the field as
// she arrives, as the pits' boards say, match 43 in the queue, 5026 in match 44, and on from there, with the whole
// changeover between each two, drive teams and field crew and all (flow.js). What's on the field is what scores, and the
// scoring table's monitors show it. Over the speakers, the announcer calls the big moments and the final score and MC
// Robin, the event's emcee, standing in front of the stands, introduces each match's teams (a line across the screen).
// The sound hears it all through scene.moment (sound.js, sounds/cues.js).
//
// The matches carry on from the cut scene into walking: the cut scene keeps its own clock for the field and the crowd
// (cutscene.js), and walking adds the difference between that and the page's clock on the cut scene's last frame, so no
// robot jumps as the bars go. Skipped with ?play, walking just runs on the page's clock. 5026's robot is on its way to
// the queue for match 44 (the pits sent it), so it isn't out there yet, and the two people in the front row who'd point
// at it say something else here (LINES), as do the queuer and the scorekeeper, who talk about the matches as they are.
import { W, useContext, screen } from '../pixel.js';
import { WORLD_W, GATES, makeFloor, drawFieldLive, noseLights } from '../field.js';
import { PEOPLE, STANDING, TIERS, drawWalkway, drawStands, drawStanding, inReach, seatOf, drawPrompt } from '../bleachers.js';
import { look, tones, skinBody, SKIN, HAIR } from '../cast.js';
import { liveOf } from '../match/draw.js';
import { MC_LOOK, drawSkater } from '../alliance-selection/mc.js';
import { MC_NAME } from '../alliance-selection/layout.js';
import { OURS } from '../opening/teams.js';
import { gateParts, gateFloor, pitsParts, moveOut, EXIT } from './gate.js';
import { makeCutscene } from './cutscene.js';
import { approach } from './approach.js';
import { flowAt } from './flow.js';
import { matchOf, FIRST } from './schedule.js';
import { folkPart, cartPart, carriedPart, drawSay } from './crew.js';
import { warm } from './warm.js';

// The people in the front row are sitting down: the phone shows them that way.
for (const p of PEOPLE) p.faceGait = p.standing ? 'stand' : 'sit';
let FLOOR = null;

/** The arena's time on the latest frame, and what was going on: for the lines that talk about the matches, and the sound. */
let now = 0, latest = null;
const flow = () => latest ?? (latest = flowAt(now));

/**
 * MC Robin, the event's emcee (alliance-selection/mc.js), in front of the stands at the middle of the field, mic in
 * hand: facing the field, mic up while she's on the speakers, striking her pose now and then otherwise.
 */
const ROBIN = {
  id: 'robin', name: MC_NAME, x: 380, y: 60, standing: true, look: MC_LOOK, faceGait: 'emcee',
  get lines() {
    return [
      ["HI! I'M ROBIN, THE EMCEE. I CALL", 'EVERY TEAM ONTO THE FIELD.'],
      ['DRIVE TEAMS WAIT FOR THE GREEN', 'LIGHTS ON THE ROCKETS TO GO ON.'],
      [`MATCH ${flow().n + 1} IS NEXT. WHEN I SAY`, 'YOUR NUMBER, YOU CHEER!'],
    ];
  },
};
/** The volunteer at the red end's gate in the far wall, Sam's opposite number. Busy: not one to stop and talk. */
const MINDER = {
  id: 'minder', x: GATES.red.x0 - 4, y: 61,
  look: look('minder', { ...skinBody('deep'), shirt: tones.shirtGreen, jeans: tones.khaki, cuff: tones.khaki, print: '#ffc61a' }, 'curls', { ...SKIN.deep, ...HAIR.black }),
};

/**
 * Lines of the arena's own for people bleachers.js shares with other scenes: Rosa and Milo, who'd otherwise point at
 * 5026's robot on the field, talk about it coming up in match 44 instead; Sam has the gate's rule; the queuer and the
 * scorekeeper talk about the matches as they are (getters, read as she starts talking to them).
 */
const LINES = {
  rosa: [
    ['YOU ARE ON 5026? MY KID BUILT OUR', 'ELEVATOR. TWO STAGES!'],
    ["MATCH 44, RIGHT? I DON'T KNOW THE", 'RULES, BUT I KNOW WHEN TO SCREAM.'],
  ],
  milo: [
    ['IS YOUR ROBOT ON SOON? I WANT TO', 'SEE IT GET A HATCH ON LEVEL 3!'],
    ["WHEN I'M IN HIGH SCHOOL I'M JOINING", '5026. SAVE ME A SPOT.'],
  ],
  sam: [
    ['SORRY, THE FIELD IS DRIVE TEAMS ONLY.', 'NOT EVEN STRATEGISTS.'],
    ['WHEN THE ROCKETS GLOW GREEN, I OPEN', 'THIS GATE. ROBOTS ON, ROBOTS OFF.'],
    ['THE STANDS ARE THE BEST SEAT FOR', 'SCOUTING ANYWAY. GO GET THEM.'],
  ],
  get priya() {
    const { n, phase, t } = flow(), deck = phase === 'match' || t < 25 ? n + 1 : n + 2;
    return [
      [`MATCH ${deck} IS ON DECK: ALL SIX`, 'ROBOTS ARE HERE, ON THEIR CARTS.'],
      deck < 44 ? [`${OURS} IS IN MATCH 44. TELL YOUR DRIVE`, 'TEAM THE PLAN BEFORE THEY GET HERE.']
        : ['TELL YOUR DRIVE TEAM THE PLAN', 'BEFORE THEY GET HERE, NOT AFTER.'],
    ];
  },
  get gus() {
    const { n, phase, score } = flow(), [b, r] = score;
    return [
      phase === 'match' ? [`MATCH ${n}: BLUE ${b}, RED ${r} SO FAR.`, 'THE CLIMBS AT THE END SWING MATCHES.']
        : [`MATCH ${n} FINAL: BLUE ${b}, RED ${r}.`, 'THE HEAD REF HAS SIGNED OFF ON IT.'],
      ['WANT THE BREAKDOWN? HATCHES, CARGO,', 'CLIMBS, FOULS. IT IS ALL ON MY SCREEN.'],
    ];
  },
};
/**
 * Who she can talk to here: bleachers.js's people, with the arena's lines where it has its own, and Robin. The stands
 * still draw the shared ones (drawStands keeps the one she's talking to sitting still by who it is), so reach hands over
 * the copy for whoever bleachers.js finds in reach, and draw hands the stands back the shared one.
 */
const TALKERS = [
  ...PEOPLE.map((p) => (p.id in LINES ? Object.defineProperty({ ...p }, 'lines', { get: () => LINES[p.id], enumerable: true }) : p)),
  ROBIN,
];
const byId = Object.fromEntries(TALKERS.map((p) => [p.id, p]));
const seated = (p) => (p ? PEOPLE.find((q) => q.id === p.id) : null);

/**
 * Where she stops once she's walked in: on the open floor past the blue end, behind Priya the queuer, level with the
 * front of the walkway, so straight on to the right is straight down it.
 */
const START = { x: 50, y: 64, dir: 0 };

/**
 * Everyone standing still on the floor (Priya, Sam and the volunteer at the other gate, Gus, Robin, and whoever's waiting
 * in the queue) is in her way like a cart in the queue: a box the width of their shoulders on their feet line, and
 * field.js's margins round it (her half-width across, two pixels of depth). So she stops beside someone rather than
 * walking through them, and is never level with them, where she'd be drawn over them. Sam's box leaves the walkway open
 * behind him and in front of him, on her line along it, and so do the others on the walkway. The drive teams at their
 * stations she can't get to anyway; the people walking about, and their carts, give way to her.
 */
const STILL = [...STANDING.filter((p) => !/^(driver|queue)/.test(p.id)), MINDER, ROBIN];
const feetAt = (x, y) => STILL.find((p) => x > p.x - 10 && x < p.x + 10 && y > p.y - 2 && y < p.y + 2)
  ?? flow().queued.find((q) => (q.look ? x > q.x - 10 && x < q.x + 10 && y > q.y - 2 && y < q.y + 2
    : x > q.x - 24 && x < q.x + 24 && y > q.y - 11 && y < q.y + 2));
/** gate.js's moveOut (the walkway, the floor past the ends and the barrier), with the people in the way: along, then across. */
function move(x, y, dx, dy) {
  // Someone she's already level with (?x= put her there) doesn't stop her stepping away.
  const stop = (nx, ny) => {
    const p = feetAt(nx, ny);
    return p && p !== feetAt(x, y);
  };
  let [nx, ny] = moveOut(x, y, dx, 0);
  if (stop(nx, ny)) [nx, ny] = [x, y];
  let [mx, my] = moveOut(nx, ny, 0, dy);
  if (stop(mx, my)) [mx, my] = [nx, ny];
  return [mx, my];
}

/**
 * stage.js draws the exit's label as long as its arrow is within 60 pixels of the right edge of the picture, so the
 * arena's long one would poke in at the edge, cut off, before the arrow does. The label is left off until the arrow is
 * on the screen: scene.draw notes it each frame, just before stage.js draws the arrow.
 */
let exitInView = false;

/** Robin's pose at the moment: on the speakers, mic up; otherwise a flourish now and then for the crowd. */
function robinNow(f, T) {
  const on = f.say?.name === MC_NAME;
  return { x: ROBIN.x, y: ROBIN.y, look: MC_LOOK, dir: 0, gait: on ? 'emcee' : T % 9 < 1.2 ? 'flair' : 'stand' };
}
/**
 * The volunteers at the far wall's gates step back toward the stands as anyone comes through on the walkway, and back
 * again after.
 */
function aside(p, f) {
  const near = [...f.carts, ...f.people].filter((q) => q.y < 68 && q.y > 54).reduce((d, q) => Math.min(d, Math.abs(q.x - p.x)), 99);
  return Math.round(p.y - 4 * Math.max(0, Math.min(1, (40 - near) / 16)));
}

/**
 * The arena seen through a camera at camX, T seconds into its day: the floor, the stands and the crowd, the walkway,
 * then everything standing sorted back to front with the field (the barrier at the red end too), and the words on the
 * speakers. o: talkingTo (who in the stands is talking, and sits still), cheer (0 to 1, how much of the crowd is up
 * together, bleachers.js, on top of what the match has it do), who (her, on the walkway, so a rocket in front of her
 * goes see-through), more (anyone else to sort in), turned ({ id: dir }, someone standing turned another way than their
 * usual), say ('bottom' or 'top': the words on the speakers across the screen there; the cut scene has its own box).
 */
function drawWorld(g, camX, T, o = {}) {
  const f = flowAt(T);
  now = T;
  latest = f;
  g.drawImage(FLOOR, -camX, 0);
  drawStands(g, camX, T, o.talkingTo, { cheer: Math.max(o.cheer ?? 0, f.cheer) });
  drawWalkway(g, camX);
  const seen = (p, w = 150) => Math.abs(p.x - camX - 128) < w;
  const turned = { ...(f.queuer != null ? { priya: f.queuer } : {}), ...(o.turned ?? {}) };
  const still = STILL.filter((p) => seen(p)).map((p) => {
    if (p === ROBIN) return { y: p.y, draw: () => drawSkater(g, { x: camX, y: 0 }, robinNow(f, T)) };
    const q = { ...p, dir: turned[p.id] ?? p.dir, y: p.id === 'sam' || p === MINDER ? aside(p, f) : p.y };
    return { y: q.y, draw: () => drawStanding(g, camX, q) };
  });
  const moving = [
    ...f.people.filter((p) => seen(p)).map((p) => folkPart(g, camX, p)),
    ...f.carts.filter((c) => seen(c, 170)).map(cartPart),
    ...f.carried.filter((c) => seen(c)).map(carriedPart),
  ];
  drawFieldLive(g, camX, T, {
    live: liveOf(f.frame), score: f.score, queue: false, farGates: f.farGates, nearGates: f.nearGates, who: o.who ?? [],
    more: [...still, ...moving, ...noseLights(f.lights), ...gateParts(camX), ...pitsParts(camX), ...(o.more ?? [])],
  });
  if (o.say) drawSay(f.say, o.say === 'top');
  // Between frames, the poses the next changeover will need, drawn ahead (warm.js).
  warm(T);
}

const cutscene = makeCutscene(drawWorld, { PEOPLE });
/** Seconds to add to the page's clock while walking, so the field carries on from the cut scene (see above). */
let ahead = 0;
/**
 * ?clock=SECONDS in the address (with ?play): walking starts at that moment of the arena's day instead, to see any part
 * of a match or a changeover straight away (schedule.js startOf says when each starts).
 */
const CLOCK = Number(new URLSearchParams(globalThis.location?.search ?? '').get('clock') ?? NaN);

export const scene = {
  name: 'THE ARENA',
  label: "Part of the 2019 field with the bleachers along its far side, and the strategist you're steering on the walkway between them; the view follows her",
  note: 'Push the stick a little to walk, all the way to run; the view follows her down the field. Stand by someone in the front row, the volunteer at the gate, the emcee, the queuer or the scorekeeper, and press A. The way out is past the scoring table, through the gap in the barrier. On a keyboard: arrow keys or WASD, Shift to run, Space or Enter to talk.',
  world: { w: WORLD_W, h: 144 },
  start: START,
  // In from off the left edge, past the queuer, as the cut scene ends.
  enter: [[-16, START.y]],
  exit: { ...EXIT, get label() { return exitInView ? EXIT.label : ''; } },
  cutscene,
  // The walkway and the floor past the ends are as far as she goes: the field is for drive teams, and past the scoring
  // table the barrier stops her except at its gap. People stop her too.
  move,
  people: TALKERS,
  // A tap on someone: she finds her way over to them, round whoever and whatever's in the way (arena/approach.js).
  pointer: (type, x, y, s) => type === 'down' && approach(scene, s, x, y),
  reach: (s) => {
    const { x, y } = s.me;
    if (Math.abs(ROBIN.x - x) < 14 && Math.abs(ROBIN.y - y) < 8) return ROBIN;
    return byId[inReach(x, y)?.id] ?? null;
  },
  // She looks up at someone in the stands, and straight at someone standing on the floor beside her.
  faceTo: (p) => (p.standing ? p : seatOf(p)),
  prompt: (g, view, p, t) => drawPrompt(g, view.x, p, t),
  // Where they're drawn, for taps: the front row sits on its tier (bleachers.js drawStands), feet on its footboard.
  spriteOf: (p) => (p.standing ? p : { x: p.x, y: TIERS[p.tier] }),
  // What's happening on and around the field, for the sound (sound.js): the horn, the bells, the crowd, the speakers.
  moment: () => latest?.moment ?? null,
  setup() {
    // The first match played, and its hatch found, before the first frame rather than on it (schedule.js).
    matchOf(FIRST);
    if (FLOOR) return;
    // The floor, with the chute's lane taped out on it at the way out.
    FLOOR = makeFloor();
    const prev = useContext(FLOOR.getContext('2d'));
    screen();
    gateFloor();
    useContext(prev);
  },
  onFree() {
    ahead = Number.isFinite(CLOCK) ? CLOCK - performance.now() / 1000 : cutscene.ahead();
  },
  draw(g, view, t, s) {
    exitInView = EXIT.x - view.x <= W - 4;
    const camX = view.x, x = Math.round(s.me.x) - camX, y = Math.round(s.me.y);
    drawWorld(g, camX, t + ahead, {
      talkingTo: seated(s.talk?.person), who: [{ x0: x - 8, x1: x + 8, y1: y }], more: [s.player],
      say: s.talk ? false : y > 104 ? 'top' : 'bottom',
    });
  },
};
