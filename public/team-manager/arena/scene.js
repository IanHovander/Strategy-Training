// The arena: part of the 2019 field with the bleachers along its far side, and the strategist on the walkway between
// them. The field, the stands, the queue and the scoring table are shared modules (field.js, bleachers.js); this file
// puts them together for stage.js, with the scene's own parts from this folder: the cut scene (cutscene.js) and the way
// out past the red end (gate.js). walk.html runs it with the strategist's eight-directions sheet under it, and play.html
// runs it in turn with the other scenes.
//
// She's come over from the pits, so she comes in on the left, at the blue end by the queue: the cut scene pans along
// the field from the red end and ends on the queue with her not yet in the picture, and she walks in from off the left
// edge to START (scene.enter). She leaves on the right, through the gap in the belt barrier past the scoring table.
//
// The matches carry on from the cut scene into walking: the cut scene keeps its own clock for the field and the crowd
// (cutscene.js), and walking adds the difference between that and the page's clock on the cut scene's last frame, so no
// robot jumps as the bars go. Skipped with ?play, walking just runs on the page's clock.
import { WORLD_W, makeFloor, drawFieldLive } from '../field.js';
import { PEOPLE, STANDING, drawWalkway, drawStands, drawStanding, inReach, seatOf, drawPrompt } from '../bleachers.js';
import { gateParts, moveOut, EXIT } from './gate.js';
import { makeCutscene } from './cutscene.js';

// The people in the front row are sitting down: the phone shows them that way.
for (const p of PEOPLE) p.faceGait = p.standing ? 'stand' : 'sit';
let FLOOR = null;

/** Where she stops once she's walked in: on the open floor past the blue end, behind Priya the queuer. */
const START = { x: 50, y: 68, dir: 0 };

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
  drawFieldLive(g, camX, t, { who: o.who ?? [], more: [...standing, ...gateParts(camX), ...(o.more ?? [])] });
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
  exit: EXIT,
  cutscene,
  // The walkway and the floor past the ends are as far as she goes: the field is for drive teams, and past the scoring
  // table the barrier stops her except at its gap.
  move: moveOut,
  people: PEOPLE,
  reach: (s) => inReach(s.me.x, s.me.y),
  faceTo: seatOf,
  prompt: (g, view, p, t) => drawPrompt(g, view.x, p, t),
  setup() {
    FLOOR ??= makeFloor();
  },
  onFree() {
    ahead = cutscene.ahead();
  },
  draw(g, view, t, s) {
    const camX = view.x, x = Math.round(s.me.x) - camX, y = Math.round(s.me.y);
    drawWorld(g, camX, t + ahead, { talkingTo: s.talk?.person, who: [{ x0: x - 8, x1: x + 8, y1: y }], more: [s.player] });
  },
};
