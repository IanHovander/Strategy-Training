// The arena: part of the 2019 field with the bleachers along its far side, and the strategist on the walkway between
// them. The field, the stands, the queue and the scoring table are shared modules (field.js, bleachers.js); this file
// puts them together for stage.js. walk.html runs it with the strategist's eight-directions sheet under it, and play.html
// runs it in turn with the other scenes.
import { WORLD_W, FIELD, makeFloor, move, drawFieldLive } from '../field.js';
import { PEOPLE, STANDING, drawWalkway, drawStands, drawStanding, inReach, seatOf, drawPrompt } from '../bleachers.js';

// The people in the front row are sitting down: the phone shows them that way.
for (const p of PEOPLE) p.faceGait = p.standing ? 'stand' : 'sit';
let FLOOR = null;

export const scene = {
  name: 'THE ARENA',
  label: "Part of the 2019 field with the bleachers along its far side, and the strategist you're steering on the walkway between them; the view follows her",
  note: 'Push the stick a little to walk, all the way to run; the view follows her down the field. Stand by someone in the front row, the volunteer at the gate, the queuer or the scorekeeper, and press A. On a keyboard: arrow keys or WASD, Shift to run, Space or Enter to talk.',
  world: { w: WORLD_W, h: 144 },
  start: { x: FIELD.x0 + 88, y: 60, dir: 0 },
  // The walkway and the floor past the ends are as far as she goes: the field is for drive teams.
  move,
  people: PEOPLE,
  reach: (s) => inReach(s.me.x, s.me.y),
  faceTo: seatOf,
  prompt: (g, view, p, t) => drawPrompt(g, view.x, p, t),
  setup() {
    FLOOR ??= makeFloor();
  },
  draw(g, view, t, s) {
    const camX = view.x, x = Math.round(s.me.x) - camX, y = Math.round(s.me.y);
    g.drawImage(FLOOR, -camX, 0);
    drawStands(g, camX, t, s.talk?.person);
    drawWalkway(g, camX);
    // Her and everyone else standing, sorted in with the field, its walls and everything past its ends.
    const standing = STANDING.filter((p) => Math.abs(p.x - camX - 128) < 150).map((p) => ({ y: p.y, draw: () => drawStanding(g, camX, p) }));
    drawFieldLive(g, camX, t, { who: [{ x0: x - 8, x1: x + 8, y1: y }], more: [...standing, s.player] });
  },
};
