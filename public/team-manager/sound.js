// The game's sound: import it once (play.js does; a scene's own page can too) and the stage is heard. It listens to
// stage.js (onStage) and plays the kit (sounds/kit.js) on the intro's chip (chip.js), with each scene's bed, feet,
// music and cut scene cues from sounds/cues.js.
//
//   UI       a blip per letter as words type (every other letter, at the speaker's pitch), A, the page turning, a
//            conversation opening and closing, the A bubble popping up, a tap on the floor, SKIP, the pick's cursor
//   moving   footsteps, walk and run, on the scene's floor (her walking in and out too); the whoosh as she leaves and
//            a soft breath as the next scene fades up
//   places   a quiet bed per scene (crowd, pits, arena, the lawn, the cafeteria, the road), with sprinkles over it
//   stings   the place card, the PA chime, cheers, claps, spotlights, the pick accepted, the clock's last seconds
//   music    a light loop under the walking (two passes, then a rest), ducked under words; none in cut scenes
//
// Sound starts on the first tap, click or key (browsers block it before then), and pauses with the page. The mute
// button sits in the top right corner with SKIP and NEXT SCENE (on a scene's own page, beside Replay), and M toggles it;
// the choice is kept in this browser (bluebanner.muted). ?mute in the address starts muted.
//
// window.sound is { kit, chip, counts, muted }: counts is how many of each sound has played, for checking from a test.

import { Chip } from './chip.js';
import { onStage, frameOf, STRIDE } from './stage.js';
import { HERO_NAME, TEAMMATE_NAME } from './cast.js';
import { Kit } from './sounds/kit.js';
import { SCENES, DEFAULT, voiceFor } from './sounds/cues.js';

const KEY = 'bluebanner.muted';
const remembered = () => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};
const remember = (m) => {
  try {
    localStorage.setItem(KEY, m ? '1' : '0');
  } catch {
    // Storage blocked (a private window): it lasts the visit.
  }
};

const chip = new Chip();
chip.muted = new URLSearchParams(location.search).has('mute') || remembered();
const kit = new Kit(chip);
const counts = {};
kit.onPlay = (name) => (counts[name] = (counts[name] ?? 0) + 1);
window.sound = { kit, chip, counts, get muted() { return chip.muted; } };

// ---- Waking the audio: on the first tap, click or key, and every one after until it's running ----
let started = false;
function wake() {
  if (!chip.start()) return;
  if (!started && kit.ready()) {
    started = true;
    applyPlace(true);
  }
}
for (const type of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) {
  addEventListener(type, wake, { capture: true, passive: true });
}
// Hidden page, no sound: the room sound would carry on in a background tab otherwise.
document.addEventListener('visibilitychange', () => {
  if (!chip.ac || chip.offline) return;
  if (document.hidden) chip.ac.suspend?.().catch?.(() => {});
  else chip.ac.resume?.().catch?.(() => {});
});

// ---- Mute ----
const locked = () => chip.ready && !chip.running && !chip.muted;
function setMuted(m) {
  chip.setMuted(m);
  remember(m);
  label();
}
let button = null;
function label() {
  if (!button) return;
  const text = chip.muted ? 'SOUND OFF' : locked() || !chip.ready ? 'SOUND' : 'SOUND ON';
  if (button.textContent !== text) button.textContent = text;
  button.setAttribute('aria-pressed', String(chip.muted));
}
/** The button, in the scene's corner (the game) or beside Replay (a scene's own page). The stage rebuilds its markup
 * for every scene, so it goes back in each time. */
function addButton() {
  const home = document.querySelector('.full .corner') ?? document.querySelector('.tvbar');
  if (!home || home.contains(button)) return;
  button = document.createElement('button');
  button.type = 'button';
  button.className = 'mute';
  button.title = 'Sound on or off (M)';
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    // While the audio is still asleep, this tap just wakes it (wake() has already run).
    if (!locked() || chip.muted) setMuted(!chip.muted);
    else label();
    button.blur(); // so Space and Enter stay A, not this button
  });
  home.append(button);
  label();
}
addEventListener('keydown', (e) => {
  if (e.code !== 'KeyM' || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
  if (/INPUT|TEXTAREA/.test(e.target.tagName)) return;
  setMuted(!chip.muted);
});

// ---- The scene ----
const st = {
  scene: null, place: DEFAULT, beat: null, beatI: 0, fired: new Set(), mode: null, leaving: false,
  events: [], conv: null, page: -1, typed: 0, near: null, nearAt: 0, lastNear: null,
  stepAt: 0, foot: false, autoFrame: null, status: null, label: null, clockFrom: null, clockTick: -1, freeAt: 0,
};
const placeOf = (scene) => SCENES[scene?.name] ?? DEFAULT;

/** The place's bed and music for what's on screen now. first: the audio has just woken, mid-scene. */
function applyPlace(first = false) {
  if (!kit.ready()) return;
  const p = st.place, cut = st.mode === 'cut';
  kit.setBed(p.bed, first ? 0.8 : 1.4);
  kit.bedLevel(cut ? p.cut ?? 1 : p.free ?? 1, first ? 0.05 : 1);
  if (!cut && st.mode) kit.setMusic(p.music ?? null);
}

function startScene(scene, s) {
  st.scene = scene;
  st.place = placeOf(scene);
  st.beat = null;
  st.fired = new Set();
  st.conv = null;
  st.near = null;
  st.status = st.label = null;
  st.clockFrom = null;
  st.leaving = false;
  // The stage says 'scene' before its cut scene starts, so its mode isn't set yet: a cut scene, if it has one.
  st.mode = scene.cutscene?.length ? 'cut' : 'free';
  addButton();
  if (!kit.ready()) return;
  kit.setMusic(null, 0.6);
  applyPlace();
  kit.play('arrive');
  for (const [t, name, o] of st.place.enter ?? []) kit.play(name, chip.now() + t, o);
}

/** A cue: one of the kit's sounds, or a bed or music change. */
function cue(name, o, at) {
  if (name === 'bed') return kit.bedLevel(o.to, o.secs);
  if (name === 'music') return kit.setMusic(o);
  kit.play(name, at, o);
}

onStage((type, detail, s) => {
  if (type === 'scene') return startScene(detail.scene, s);
  if (type === 'frame') return frame(detail.now, s);
  if (type === 'beat') {
    st.beat = detail.beat;
    st.beatI = detail.i;
    st.fired = new Set();
    return;
  }
  if (type === 'free') {
    st.freeAt = performance.now() / 1000;
    st.clockFrom = null;
    st.leaving = false;
    if (kit.ready()) {
      kit.bedLevel(st.place.free ?? 1, 1.2);
      // The music comes in once she's had a moment.
      setTimeout(() => {
        if (st.mode !== 'cut' && !st.leaving && st.scene === s.scene) kit.setMusic(st.place.music ?? null);
      }, 1500);
    }
    return;
  }
  if (type === 'step') {
    st.stepAt = performance.now() / 1000;
    return step(detail.gait);
  }
  if (type === 'leave') return leaving();
  if (type === 'gone') return;
  st.events.push(type); // a, page, talk, talked, skip, tap: sorted out on the next frame
});

/** Out she goes (or NEXT SCENE): a whoosh as the screen fades, and the place fading down under it. Once a time. */
function leaving() {
  if (st.leaving) return;
  st.leaving = true;
  kit.play('leave');
  kit.setMusic(null, 0.5);
  kit.bedLevel(0.25, 0.5);
}

function step(gait) {
  const surface = st.place.surface;
  if (!surface) return;
  st.foot = !st.foot;
  kit.play('step', undefined, { surface, gait, alt: st.foot });
}

/** What the controller just did, once per frame, so A that turned a page only sounds like the page turning. */
function controls(s) {
  const ev = st.events;
  if (!ev.length) return;
  st.events = [];
  const has = (k) => ev.includes(k);
  if (has('skip')) kit.play('skip');
  else if (has('talk')) kit.play('talk');
  else if (has('talked')) kit.play('talked');
  else if (has('page')) kit.play('page');
  else if (has('a')) kit.play('a');
  else if (has('tap') && s.mode === 'free' && !s.talk && !s.scene.update) kit.play('tapWalk');
}

/** The words on screen, if any are typing: the cut scene's or a conversation's. */
function convOf(s, now) {
  if (s.mode === 'cut') {
    const c = s.cut;
    return c && c.conv && !c.read && now >= c.conv.start ? c.conv : null;
  }
  return s.talk;
}
const linesOf = (page) => (Array.isArray(page) ? page : page?.lines ?? []);

/** A blip for each letter that has typed out since the last frame (every other letter, at most a few a frame). */
function typing(s, now) {
  if (s.frozen != null) return;
  const d = convOf(s, now);
  if (d !== st.conv || (d && d.page !== st.page)) {
    st.conv = d;
    st.page = d?.page ?? -1;
    st.typed = 0;
  }
  kit.duck(d ? 0.45 : 1);
  if (!d || d.full) return;
  const page = d.pages[d.page];
  if (!page) return;
  const said = linesOf(page).join('');
  const shown = Math.min(said.length, Math.floor((now - d.start) * 40));
  if (shown <= st.typed) return;
  const name = Array.isArray(page) ? d.name : page.name;
  const v = voiceFor(name, HERO_NAME, TEAMMATE_NAME), every = v.every ?? 2;
  let blips = 0;
  for (let i = st.typed; i < shown && blips < 2; i++) {
    const ch = said[i];
    if (i % every || !/[A-Z0-9]/.test(ch)) continue;
    // A little lilt: the letter nudges the pitch a step either way.
    const lilt = [0, 2, -1, 3, 0, -2][ch.charCodeAt(0) % 6];
    kit.play('blip', undefined, { m: v.m + lilt, wave: v.wave, vol: v.chord ? 0.035 : 0.045 });
    if (v.chord) kit.play('blip', undefined, { m: v.m + lilt + 4, wave: v.wave, vol: 0.026 });
    blips++;
  }
  st.typed = shown;
}

/** The A bubble popping up over someone new (not again for whoever it just left, if she's only stepped back). */
function bubble(s, now) {
  const n = s.mode === 'free' && !s.talk ? s.near : null;
  if (n && n !== st.near && (n !== st.lastNear || now - st.nearAt > 1.2)) {
    if (s.scene.update) kit.play('cursor'); // the van: the stick moving between seats
    else kit.play('bubble');
  }
  if (st.near && !n) {
    st.lastNear = st.near;
    st.nearAt = now;
  }
  st.near = n;
}

/** Her walking by herself (in at the start, out at the end) has feet too; the stage only tells of the steered ones. */
function autoSteps(s, now) {
  if (s.mode !== 'auto' || !STRIDE[s.me.gait]) {
    st.autoFrame = null;
    return;
  }
  const f = frameOf(s.me);
  if (st.autoFrame != null && f !== st.autoFrame && f % 4 === 0 && now - st.stepAt > 0.15) step(s.me.gait);
  st.autoFrame = f;
}

/** The cut scene's cues that are due. */
function beatCues(s, now) {
  if (s.mode !== 'cut' || !s.cut || s.frozen != null) return;
  const b = st.beat;
  if (!b) return;
  const list = [...(st.place.beats?.[st.beatI] ?? []), ...((b.name && st.place.beats?.[b.name]) || [])];
  const t = now - s.cut.t0;
  list.forEach((c, k) => {
    if (st.fired.has(k) || t < c[0]) return;
    st.fired.add(k);
    // Long past its moment (the cue is for later in a beat the page jumped into): skip it.
    if (t - c[0] > 0.5) return;
    cue(c[1], c[2] ?? {});
  });
}

/** A scene with no walking (the opening's pick): its status line and A's label say what's happening. */
function statusCues(s, now) {
  const p = st.place;
  if (s.mode === 'cut') return;
  const status = s.scene.status?.(s) ?? null, lbl = s.scene.actLabel?.(s) ?? null;
  if (status !== st.status) {
    const was = st.status;
    st.status = status;
    for (const [t, name, o] of p.status?.[status] ?? []) cue(name, o ?? {}, chip.now() + t);
    if (p.clock && status === p.clock.from && (was == null || was === 'REWINDING')) {
      st.clockFrom = now;
      st.clockTick = -1;
    }
  } else if (lbl !== st.label && st.label != null && p.status) kit.play('cursor'); // the pick's cursor moving
  if (lbl !== st.label) {
    st.label = lbl;
    for (const [t, name, o] of p.label?.[lbl] ?? []) cue(name, o ?? {}, chip.now() + t);
  }
  // The clock's last seconds.
  const c = p.clock;
  if (c && st.clockFrom != null && c.while.includes(status)) {
    const left = c.secs - (now - st.clockFrom), sec = Math.ceil(left);
    if (left > 0 && sec <= c.last && sec !== st.clockTick) {
      st.clockTick = sec;
      kit.play('tick', undefined, { hi: sec <= 3 });
    } else if (left <= 0 && st.clockTick !== 0) {
      st.clockTick = 0;
      kit.play('timeUp');
    }
  }
}

function frame(now, s) {
  label();
  if (s.mode !== st.mode) {
    const was = st.mode;
    st.mode = s.mode;
    if (kit.ready()) {
      // Out of the cut scene: the bed to its walking level (the free event does the music). Back into it (Replay on a
      // scene's own page): no music under a cut scene.
      if (was === 'cut' && s.mode !== 'cut') kit.bedLevel(st.place.free ?? 1, 1.2);
      if (s.mode === 'cut' && was && was !== 'cut') {
        kit.setMusic(null, 0.8);
        kit.bedLevel(st.place.cut ?? 1, 0.8);
      }
    }
  }
  // NEXT SCENE fades the screen with her standing still, and says nothing till she's gone.
  if (s.mode === 'auto' && s.auto?.out) leaving();
  if (!kit.ready()) {
    st.events = [];
    return;
  }
  controls(s);
  typing(s, now);
  bubble(s, now);
  autoSteps(s, now);
  beatCues(s, now);
  statusCues(s, now);
  kit.pump();
}

// Imported after the stage started (a scene's own page, with this in a script after the scene's): catch up.
if (window.stage?.scene) startScene(window.stage.scene, window.stage);

export { kit, chip };
