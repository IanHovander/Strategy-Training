// The arena: part of the 2019 field with the bleachers along its far side, and the strategist on the walkway between
// them. The field, the stands, the queue and the scoring table are shared modules (field.js, bleachers.js); this file
// puts them together for stage.js, with the scene's own parts from this folder: the cut scene (cutscene.js) and the way
// out past the red end (gate.js). walk.html runs it with the strategist's eight-directions sheet under it, and play.html
// runs it in turn with the other scenes.
//
// She's come over from the pits, so she comes in on the left, at the blue end by the queue: the cut scene pans along
// the field from the red end and ends on the queue with her not yet in the picture, and she walks in from off the left
// edge to START (scene.enter). She leaves on the right, through the gap in the belt barrier past the scoring table,
// along the chute's taped lane (gate.js). Everyone standing on the floor stops her the way the queue's carts do (move).
//
// The matches carry on from the cut scene into walking: the cut scene keeps its own clock for the field and the crowd
// (cutscene.js), and walking adds the difference between that and the page's clock on the cut scene's last frame, so no
// robot jumps as the bars go. Skipped with ?play, walking just runs on the page's clock.
//
// It's match 42 on the field, as the pits' boards say: 3000 and 7777 are out there (ON FIELD, MATCH 42), so they keep
// their places as the blue arm and the red defender, and the two elevators are teams from another row of pits. 5026's
// robot is on its way to the queue for match 44 (the pits sent it), so it isn't on the field, and the two people in the
// front row who'd point at it out there say something else here (LINES).
import { W, useContext, screen } from '../pixel.js';
import { WORLD_W, makeFloor, drawFieldLive } from '../field.js';
import { PEOPLE, STANDING, drawWalkway, drawStands, drawStanding, inReach, seatOf, drawPrompt } from '../bleachers.js';
import { gateParts, gateFloor, pitsParts, moveOut, EXIT } from './gate.js';
import { makeCutscene } from './cutscene.js';

// The people in the front row are sitting down: the phone shows them that way.
for (const p of PEOPLE) p.faceGait = p.standing ? 'stand' : 'sit';
let FLOOR = null;

/** The numbers on the field in match 42: the blue elevator, the red elevator, the blue arm and the red defender. */
const TEAMS = ['2718', '1618', '3000', '7777'];
/**
 * Lines of the arena's own for people bleachers.js shares with other scenes: Rosa and Milo, who'd otherwise point at
 * 5026's robot on the field, talk about it coming up in match 44 instead.
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
};
/**
 * Who she can talk to here: bleachers.js's people, with the arena's lines where it has its own. The stands still draw
 * the shared ones (drawStands keeps the one she's talking to sitting still by who it is), so reach hands over the copy
 * for whoever bleachers.js finds in reach, and draw hands the stands back the shared one.
 */
const TALKERS = PEOPLE.map((p) => (LINES[p.id] ? { ...p, lines: LINES[p.id] } : p));
const byId = Object.fromEntries(TALKERS.map((p) => [p.id, p]));
const seated = (p) => (p ? PEOPLE.find((q) => q.id === p.id) : null);

/**
 * Where she stops once she's walked in: on the open floor past the blue end, behind Priya the queuer, level with the
 * front of the walkway, so straight on to the right is straight down it.
 */
const START = { x: 50, y: 64, dir: 0 };

/**
 * Everyone standing on the floor (Priya, Sam, Gus, the queue's two drive team members; the drivers too, though she can't
 * get to their stations) is in her way like a cart in the queue: a box the width of their shoulders on their feet line,
 * and field.js's margins round it (her half-width across, two pixels of depth). So she stops beside someone rather than
 * walking through them, and is never level with them, where she'd be drawn over them. Sam's box leaves the walkway open
 * behind him and in front of him, on her line along it.
 */
const feetAt = (x, y) => STANDING.find((p) => x > p.x - 10 && x < p.x + 10 && y > p.y - 2 && y < p.y + 2);
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

/**
 * The arena seen through a camera at camX, t seconds into its day: the floor, the stands and the crowd, the walkway,
 * then everything standing sorted back to front with the field (the barrier at the red end too). o: talkingTo (who in
 * the stands is talking, and sits still), cheer (0 to 1, how much of the crowd is up together, bleachers.js), who (her,
 * on the walkway, so a rocket in front of her goes see-through), more (anyone else to sort in), and turned ({ id: dir },
 * someone standing turned another way than their usual).
 */
function drawWorld(g, camX, t, o = {}) {
  g.drawImage(FLOOR, -camX, 0);
  drawStands(g, camX, t, o.talkingTo, { cheer: o.cheer });
  drawWalkway(g, camX);
  const standing = STANDING.filter((p) => Math.abs(p.x - camX - 128) < 150).map((p) => {
    const q = o.turned?.[p.id] != null ? { ...p, dir: o.turned[p.id] } : p;
    return { y: p.y, draw: () => drawStanding(g, camX, q) };
  });
  drawFieldLive(g, camX, t, { teams: TEAMS, who: o.who ?? [], more: [...standing, ...gateParts(camX), ...pitsParts(camX), ...(o.more ?? [])] });
}

const cutscene = makeCutscene(drawWorld, { PEOPLE });
/** Seconds to add to the page's clock while walking, so the field carries on from the cut scene (see above). */
let ahead = 0;

export const scene = {
  name: 'THE ARENA',
  label: "Part of the 2019 field with the bleachers along its far side, and the strategist you're steering on the walkway between them; the view follows her",
  note: 'Push the stick a little to walk, all the way to run; the view follows her down the field. Stand by someone in the front row, the volunteer at the gate, the queuer or the scorekeeper, and press A. The way out is past the scoring table, through the gap in the barrier. On a keyboard: arrow keys or WASD, Shift to run, Space or Enter to talk.',
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
  reach: (s) => byId[inReach(s.me.x, s.me.y)?.id] ?? null,
  // She looks up at someone in the stands, and straight at someone standing on the floor beside her.
  faceTo: (p) => (p.standing ? p : seatOf(p)),
  prompt: (g, view, p, t) => drawPrompt(g, view.x, p, t),
  setup() {
    if (FLOOR) return;
    // The floor, with the chute's lane taped out on it at the way out.
    FLOOR = makeFloor();
    const prev = useContext(FLOOR.getContext('2d'));
    screen();
    gateFloor();
    useContext(prev);
  },
  onFree() {
    ahead = cutscene.ahead();
  },
  draw(g, view, t, s) {
    exitInView = EXIT.x - view.x <= W - 4;
    const camX = view.x, x = Math.round(s.me.x) - camX, y = Math.round(s.me.y);
    drawWorld(g, camX, t + ahead, { talkingTo: seated(s.talk?.person), who: [{ x0: x - 8, x1: x + 8, y1: y }], more: [s.player] });
  },
};
