// The game so far, start to finish: every scene one after another, the way they'll run. NEW SEASON on the title screen
// comes here. Each scene opens on its cut scene, then she's yours to walk about, coming in on the left, until she
// leaves on the right and the next cut scene starts; where there's no way out (the van), NEXT SCENE moves on. After the
// last, a card, then back to the title.
//
// From the address bar: ?scene=pits starts at that scene (the address keeps up as you go, so reloading starts the scene
// you're in over), and stage.js's own options (?at, ?beat, ?play, ?x, ?y, ?dir) apply to the first scene. On a keyboard,
// N moves on to the next scene too.
import { W, H, C, fill, text, dither } from './pixel.js';
import { runScene } from './stage.js';

/** The season in order: each is a folder with a scene.js that exports `scene`. */
const SCENES = ['opening', 'team-meeting', 'practice-field', 'van', 'pits', 'arena', 'alliance-selection', 'worlds'];
const load = (id) => import(`./${id}/scene.js`);

/** After the last scene: the season so far, and back to the title. */
const END = {
  name: 'THE SEASON SO FAR',
  label: "The end of the scenes there are so far, and a button back to the title screen",
  world: { w: W, h: H },
  start: { x: -100, y: -100 },
  move: (x, y) => [x, y],
  update() {}, // nobody to steer
  stick: false,
  draw(g, view, t) {
    fill(0, 0, W, H, C.night0);
    dither(0, 96, W, 6, C.night0, C.night1);
    fill(0, 102, W, H - 102, C.night1);
    text("THAT'S THE SEASON SO FAR", 128, 50, { align: 'center', color: C.white, outline: C.ink });
    text('MORE OF IT IS ON THE WAY.', 128, 68, { font: 3, align: 'center', color: C.blue3 });
    if (t % 1 < 0.65) text('BACK TO THE TITLE: TOP RIGHT', 128, 118, { font: 3, align: 'center', color: C.steel2 });
  },
};

const root = document.getElementById('stage');
const first = new URLSearchParams(location.search);
let current = null;

async function play(i, params = new URLSearchParams()) {
  current?.stop();
  if (i >= SCENES.length) {
    current = runScene(END, { layout: 'full', root, nextLabel: 'BACK TO THE TITLE', onLeave: () => location.assign('./index.html?title') });
    return;
  }
  const id = SCENES[i];
  let scene;
  try {
    ({ scene } = await load(id));
  } catch (err) {
    console.error(`Couldn't load the ${id} scene; skipping it.`, err);
    return play(i + 1);
  }
  if (i !== start) history.replaceState(null, '', `?scene=${id}`);
  current = runScene(scene, { layout: 'full', root, params, onLeave: () => play(i + 1) });
  // Fetch the next one while this one plays, so moving on doesn't wait.
  if (SCENES[i + 1]) load(SCENES[i + 1]).catch(() => {});
}

const start = Math.max(0, SCENES.indexOf(first.get('scene')));
play(start, first);

// On a phone, the first tap asks for the whole screen, held sideways (where the browser allows it; an iPhone doesn't).
if (matchMedia('(pointer: coarse)').matches && document.fullscreenEnabled) {
  addEventListener('pointerup', () => {
    document.documentElement.requestFullscreen?.({ navigationUI: 'hide' })
      .then(() => screen.orientation?.lock?.('landscape'))
      .catch(() => {});
  }, { once: true });
}
