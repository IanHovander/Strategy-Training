// People: the talk of a crowd under the competition scenes, and a crowd's yells when it cheers. Filtered noise alone
// reads as static, so these are voices. Each is a buzz at a speaking pitch (a grown-up's, a teenager's) through three
// formant filters that move from vowel to vowel a syllable at a time, with a breath of hiss for some consonants:
// phrases of a few syllables, the pitch falling across each and up on its stressed one, and pauses between. Plain Web
// Audio on the chip's context, so nothing sampled.
//
// A crowd is two parts. A few voices close by talk live, spread left to right, with a little of the room's echo. The
// many further off are one loop: rendered once in the background (an OfflineAudioContext, its own thread) with their
// own voices duller and deep in the hall's echo, ten seconds of it with the ends blended so it runs on without a seam,
// fading in when it's ready and kept for the next time the same crowd is heard. Every voice live would cost a phone
// most of its audio time; the loop costs nothing once it's made.
//
//   new Crowd(ac, out, def, noise)   talking into out until stop(at). def: { near (voices close by, live), far (voices
//                                    in the loop), room (seconds of echo), wet (how much of it), vol, pace (syllables,
//                                    1 = speech), pause (the gaps between phrases, 1 = conversation) }; noise: a looping
//                                    noise buffer (the consonants' hiss)
//   crowd.pump(now, ahead)           every frame: the near voices' syllables scheduled up to ahead seconds on
//   crowd.ready                      a promise: the far loop is playing (or there's none to play)
//   crowd.stop(at)                   everything stops then
//   farLoop(ac, def)                 the far crowd's loop (a promise), made now if it isn't yet: to have it ready early
//   shout(ac, out, t, o)             a cheer: o.n people yelling at once from t ('YEAH!', 'WOO!', 'AY!'), or with
//                                    o.kind 'aww', a room's sympathy, falling. o: { n, vol, spread, kind, echo }
//   echoOf(ac, secs)                 a hall's echo as a convolver's impulse, made once per length

const r = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

/** Vowels by their first three formants (Hz), as a grown man says them (Peterson and Barney); higher voices scale up. */
const V = {
  ee: [270, 2290, 3010], ih: [390, 1990, 2550], eh: [530, 1840, 2480], ae: [660, 1720, 2410], ah: [730, 1090, 2440],
  aw: [570, 840, 2410], uh: [640, 1190, 2390], oo: [300, 870, 2240], ou: [440, 1020, 2240], er: [490, 1350, 1690],
};
const TALK = Object.values(V);
/** How loud each formant is against the first, and how narrow its filter (Q). */
const F_GAIN = [1, 0.8, 0.45], F_Q = [5, 8, 10];
/** Who's in the crowd: their speaking pitch (Hz) and how far up their formants sit. Mostly teenagers, at an FRC event. */
const SPEAKERS = [
  { f0: [92, 130], k: 1 },
  { f0: [165, 230], k: 1.16 },
  { f0: [120, 165], k: 1.06 },
  { f0: [200, 260], k: 1.2 },
];
/** The far loop: seconds of it, seconds blended across its seam, and seconds rendered first and thrown away (the voices
 * starting up and the echo filling, before the room sounds full). Its sample rate: far voices are dulled below 1.5 kHz,
 * so half the usual rate holds everything in them, in half the time and memory. */
const LOOP = 10, SEAM = 1.5, WARM = 2, LOOP_RATE = 22050;

/** The voice's buzz: a sawtooth's harmonics falling a little faster, the way vocal folds' do. One per context. */
const waves = new WeakMap();
function glottal(ac) {
  if (!waves.has(ac)) {
    const n = 64, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) im[k] = 1 / k ** 1.3;
    waves.set(ac, ac.createPeriodicWave(re, im));
  }
  return waves.get(ac);
}

const echoes = new WeakMap();
/** A hall's echo, secs long: noise dying away 60 dB over secs, darker as it goes, a little after the sound itself. */
export function echoOf(ac, secs) {
  if (!echoes.has(ac)) echoes.set(ac, new Map());
  const made = echoes.get(ac);
  if (!made.has(secs)) {
    const sr = ac.sampleRate, n = Math.round(sr * secs), buf = ac.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr, a = Math.exp((-2 * Math.PI * (6000 - (5000 * t) / secs)) / sr);
        lp = (1 - a) * (Math.random() * 2 - 1) + a * lp;
        d[i] = t < 0.015 ? 0 : lp * Math.exp((-6.9 * t) / secs);
      }
    }
    made.set(secs, buf);
  }
  return made.get(secs);
}
/** A convolver with that echo, its share (wet) going into out. */
function echoInto(ac, out, secs, wet) {
  const e = ac.createConvolver(), g = ac.createGain();
  e.buffer = echoOf(ac, secs);
  g.gain.value = wet;
  e.connect(g).connect(out);
  return e;
}

/** A panner where the browser has one (it only spreads the voices out), else a plain gain. */
const panner = (ac, x) => {
  if (!ac.createStereoPanner) return ac.createGain();
  const p = ac.createStereoPanner();
  p.pan.value = x;
  return p;
};
/** A looping noise, started now. */
function noiseSource(ac, buffer) {
  const s = ac.createBufferSource();
  s.buffer = buffer;
  s.loop = true;
  s.start(ac.currentTime, r(0, buffer.duration * 0.9));
  return s;
}

/** One voice's filters: its buzz through three formants, set to vowel v for a speaker whose formants sit k up. */
function formants(ac, src, into, v, k) {
  return F_GAIN.map((g, j) => {
    const f = ac.createBiquadFilter(), fg = ac.createGain();
    f.type = 'bandpass';
    f.Q.value = F_Q[j];
    f.frequency.value = v[j] * k;
    fg.gain.value = g;
    src.connect(f).connect(fg).connect(into);
    return f;
  });
}

/** Someone talking (i picks who they are), into dest, at level; hiss: the noise their consonants come from, if any. */
function talker(ac, i, dest, hiss, level) {
  const who = SPEAKERS[i % SPEAKERS.length], now = ac.currentTime;
  const osc = ac.createOscillator(), amp = ac.createGain(), sh = ac.createBiquadFilter(), shAmp = ac.createGain();
  const pan = panner(ac, r(-0.8, 0.8));
  osc.setPeriodicWave(glottal(ac));
  const f0 = r(...who.f0);
  osc.frequency.value = f0;
  amp.gain.value = 0;
  const fs = formants(ac, osc, amp, V.uh, who.k);
  sh.type = 'bandpass';
  sh.frequency.value = r(4500, 7000);
  sh.Q.value = 2;
  shAmp.gain.value = 0;
  hiss?.connect(sh).connect(shAmp).connect(pan);
  amp.connect(pan).connect(dest);
  osc.start(now);
  // Mid-sentence already as the room comes up.
  const left = 1 + Math.floor(r(0, 6));
  return { osc, amp, fs, shAmp, k: who.k, f0, level, next: now + r(0, 0.4), left, n: left + 1, stress: -1 };
}

/** The voice's next syllable from t, or, at the end of a phrase, a pause and the next phrase made up. */
function say(v, t, pace, pause) {
  const g = v.amp.gain;
  if (!v.left) {
    g.setTargetAtTime(0, t, 0.04);
    v.n = v.left = 2 + Math.floor(r(0, 7));
    v.stress = Math.floor(r(0, v.n));
    v.next = t + r(0.2, 1.4) * pause;
    return;
  }
  const i = v.n - v.left, last = v.left === 1, stressed = i === v.stress;
  const d = (r(0.1, 0.24) * (last ? 1.5 : 1)) / pace;
  const vowel = pick(TALK);
  v.fs.forEach((f, j) => f.frequency.setTargetAtTime(vowel[j] * v.k, t, 0.025));
  // The pitch: down across the phrase, up on its stressed syllable, and never quite the same twice.
  const f0 = v.f0 * (1.08 - (0.18 * i) / v.n) * (stressed ? 1.15 : 1) * r(0.96, 1.04);
  v.osc.frequency.setTargetAtTime(f0, t, 0.03);
  const peak = v.level * (stressed ? 1 : r(0.45, 0.75));
  // A consonant first, now and then: the voice stops a moment, and some of those hiss.
  let at = t;
  if (Math.random() < 0.45) {
    g.setTargetAtTime(peak * 0.08, t, 0.012);
    if (Math.random() < 0.5) {
      v.shAmp.gain.setTargetAtTime(v.level * 0.2, t, 0.01);
      v.shAmp.gain.setTargetAtTime(0, t + 0.05, 0.015);
    }
    at = t + r(0.03, 0.07);
  }
  g.setTargetAtTime(peak, at, 0.018);
  g.setTargetAtTime(peak * 0.3, at + d * 0.75, 0.03);
  v.left--;
  v.next = at + d;
}

const loops = new WeakMap();
/**
 * The far crowd of def, as a seamless loop (a promise of an AudioBuffer, or of null where there's no offline context):
 * made once per context and def. No hiss: their consonants are lost in the distance.
 */
export function farLoop(ac, def) {
  if (!loops.has(ac)) loops.set(ac, new Map());
  const made = loops.get(ac);
  if (!made.has(def)) {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC || !def.far) return Promise.resolve(null);
    const sr = LOOP_RATE, total = WARM + LOOP + SEAM;
    const oc = new OAC(2, Math.ceil(sr * total), sr);
    // Further off: duller, and more echo than voice.
    const dull = oc.createBiquadFilter(), dry = oc.createGain();
    dull.type = 'lowpass';
    dull.frequency.value = 1500;
    dry.gain.value = 0.4;
    dull.connect(dry).connect(oc.destination);
    dull.connect(echoInto(oc, oc.destination, def.room ?? 1.8, def.wet ?? 0.5));
    const voices = Array.from({ length: def.far }, (_, i) => talker(oc, i + 1, dull, null, r(0.35, 0.8)));
    for (const v of voices) while (v.next < total) say(v, v.next, def.pace ?? 1, def.pause ?? 1);
    // Older Safari says it's done with an event, not a promise.
    const done = new Promise((ok) => (oc.oncomplete = (e) => ok(e.renderedBuffer)));
    const rendering = oc.startRendering();
    made.set(def, (rendering?.then ? rendering : done).then((buf) => seamless(ac, buf, sr), () => null));
  }
  return made.get(def);
}
/** LOOP seconds of buf after the warm-up, its first SEAM seconds blended with what followed its end (equal power). */
function seamless(ac, buf, sr) {
  const n = Math.round(LOOP * sr), x = Math.round(SEAM * sr), w0 = Math.round(WARM * sr);
  const out = ac.createBuffer(buf.numberOfChannels, n, sr);
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const src = buf.getChannelData(ch), dst = out.getChannelData(ch);
    for (let i = 0; i < n; i++) {
      const s = src[w0 + i];
      if (i >= x) dst[i] = s;
      else {
        const a = (Math.PI / 2) * (i / x);
        dst[i] = s * Math.sin(a) + src[w0 + n + i] * Math.cos(a);
      }
    }
  }
  return out;
}

export class Crowd {
  constructor(ac, out, def, noise) {
    this.ac = ac;
    this.pace = def.pace ?? 1;
    this.pause = def.pause ?? 1;
    this.sources = [];
    this.stopAt = null;
    const vol = ac.createGain();
    vol.gain.value = def.vol ?? 1;
    vol.connect(out);
    // Close by: as they are, with a little of the room (a shorter echo: it's the near walls).
    const near = ac.createGain();
    near.connect(vol);
    near.connect(echoInto(ac, vol, Math.min(1.2, def.room ?? 1.8), (def.wet ?? 0.5) * 0.6));
    const hiss = noiseSource(ac, noise);
    this.sources.push(hiss);
    this.voices = Array.from({ length: def.near ?? 3 }, (_, i) => talker(ac, i, near, hiss, r(0.6, 1)));
    this.sources.push(...this.voices.map((v) => v.osc));
    // Further off: the loop, fading in once it's made.
    this.ready = farLoop(ac, def).then((buf) => {
      if (!buf || this.stopAt != null) return;
      const now = ac.currentTime, src = ac.createBufferSource(), fade = ac.createGain();
      src.buffer = buf;
      src.loop = true;
      fade.gain.setValueAtTime(0, now);
      fade.gain.linearRampToValueAtTime(1, now + 1.5);
      src.connect(fade).connect(vol);
      src.start(now, r(0, LOOP));
      this.sources.push(src);
    });
  }
  pump(now, ahead = 0.3) {
    if (this.stopAt != null) return;
    for (const v of this.voices) while (v.next < now + ahead) say(v, Math.max(v.next, now + 0.01), this.pace, this.pause);
  }
  stop(at) {
    this.stopAt = at;
    for (const s of this.sources) s.stop(at);
  }
}

/** What people yell: the vowels each word glides through, and how its pitch moves (start, peak, end, as f0 times). */
const WORDS = {
  yeah: { vowels: [V.ee, V.eh, V.ae], pitch: [1, 1.15, 0.85] },
  woo: { vowels: [V.oo, V.oo], pitch: [0.9, 1.45, 1.05] },
  ay: { vowels: [V.eh, V.ih], pitch: [1, 1.12, 0.9] },
  aww: { vowels: [V.aw, V.aw], pitch: [1.2, 1.25, 0.75] },
};

/** A crowd yelling, from t: n people, each starting within spread seconds, raised voices (see the top of the file). */
export function shout(ac, out, t, { n = 12, vol = 0.05, spread = 0.35, kind = 'cheer', echo = null } = {}) {
  const wave = glottal(ac);
  for (let i = 0; i < n; i++) {
    const who = pick(SPEAKERS), at = t + Math.random() ** 1.5 * spread;
    const word = WORDS[kind === 'aww' ? 'aww' : pick(['yeah', 'yeah', 'woo', 'ay'])];
    const d = kind === 'aww' ? r(0.7, 1.1) : r(0.45, 1.1), end = at + d;
    const f0 = r(...who.f0) * (kind === 'aww' ? 1.1 : r(1.5, 1.9));
    const osc = ac.createOscillator(), amp = ac.createGain(), pan = panner(ac, r(-0.9, 0.9));
    osc.setPeriodicWave(wave);
    const [p0, p1, p2] = word.pitch;
    osc.frequency.setValueAtTime(f0 * p0, at);
    osc.frequency.exponentialRampToValueAtTime(f0 * p1, at + d * 0.3);
    osc.frequency.exponentialRampToValueAtTime(f0 * p2, end);
    const fs = formants(ac, osc, amp, word.vowels[0], who.k);
    fs.forEach((f, m) => f.frequency.setValueAtTime(word.vowels[0][m] * who.k, at));
    word.vowels.forEach((vw, j) => {
      if (!j) return;
      const when = at + (d * 0.6 * j) / (word.vowels.length - 1);
      fs.forEach((f, m) => f.frequency.linearRampToValueAtTime(vw[m] * who.k, when));
    });
    const v = vol * r(0.5, 1);
    amp.gain.setValueAtTime(0, at);
    amp.gain.linearRampToValueAtTime(v, at + 0.05);
    amp.gain.setValueAtTime(v, end - d * 0.3);
    amp.gain.linearRampToValueAtTime(0, end);
    amp.connect(pan).connect(out);
    if (echo) pan.connect(echo);
    osc.start(at);
    osc.stop(end + 0.05);
  }
}
