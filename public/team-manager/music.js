// The theme audition page: one card per candidate, each playable as a band mockup or as Game Boy chiptune.

import { Chip } from './chip.js';
import { THEMES, sections, Band, Deck } from './themes.js';

const chip = new Chip();
const band = new Band(chip);
let deck = null;
const LETTERS = 'ABCDEFG';

const app = document.getElementById('app');
const cards = THEMES.map((theme, i) => {
  const total = theme.bars.length;
  const secs = sections(theme);
  const card = document.createElement('article');
  card.className = 'theme';
  card.innerHTML = `
    <header>
      <span class="letter">${LETTERS[i]}</span>
      <div class="titles">
        <h2></h2>
        <p class="style"></p>
      </div>
      <p class="facts">${theme.bpm} BPM<br>${(theme.bars.length * 4 * 60 / theme.bpm).toFixed(0)} s</p>
    </header>
    <p class="blurb"></p>
    <p class="listen"><b>Listen for</b> <span></span></p>
    <div class="timeline" aria-hidden="true">
      ${secs.map((s, j) => `<span class="sec" style="flex:${(secs[j + 1]?.bar ?? total) - s.bar}">${s.sec}</span>`).join('')}
      <i class="head"></i>
    </div>
    <div class="buttons">
      <button type="button" data-mode="band" id="play-${theme.id}-band">Band mockup</button>
      <button type="button" data-mode="chip" id="play-${theme.id}-chip">Game Boy</button>
    </div>`;
  card.querySelector('h2').textContent = theme.name;
  card.querySelector('.style').textContent = theme.style;
  card.querySelector('.blurb').textContent = theme.blurb;
  card.querySelector('.listen span').textContent = theme.listen;
  for (const button of card.querySelectorAll('button')) {
    button.addEventListener('click', () => {
      if (!chip.start()) return showNote('This browser has no Web Audio, so nothing can play here.');
      deck ??= new Deck(chip, band);
      const mode = button.dataset.mode;
      if (deck.now?.theme === theme && deck.now.mode === mode) deck.stop();
      else deck.play(theme, mode);
      refresh();
    });
  }
  app.append(card);
  return { theme, card, secs, total };
});

const note = document.getElementById('note');
function showNote(text) {
  note.textContent = text;
  note.hidden = !text;
}

// Phones only allow sound from a finished tap; retry on every one until the audio is running.
for (const type of ['pointerup', 'touchend', 'click', 'keydown']) window.addEventListener(type, () => chip.unlock(), { capture: true, passive: true });

/** Button labels, the playhead and the current section. */
function refresh() {
  const playing = deck?.now;
  const pos = deck?.position() ?? 0;
  for (const { theme, card, secs, total } of cards) {
    const mine = playing?.theme === theme;
    card.classList.toggle('playing', !!mine);
    for (const button of card.querySelectorAll('button')) {
      const on = mine && playing.mode === button.dataset.mode;
      button.classList.toggle('on', on);
      button.textContent = on ? 'Stop' : button.dataset.mode === 'band' ? 'Band mockup' : 'Game Boy';
    }
    const bar = mine ? Math.max(0, pos / 4) : 0;
    card.querySelector('.head').style.width = mine ? `${Math.min(100, (bar / total) * 100)}%` : '0';
    const current = mine ? secs.findLast((s) => bar >= s.bar) : null;
    card.querySelectorAll('.sec').forEach((el, j) => el.classList.toggle('now', secs[j] === current));
  }
  if (chip.ready && !chip.running && !chip.muted) showNote('Tap once more to turn the sound on.');
  else showNote('');
}
(function loop() {
  refresh();
  requestAnimationFrame(loop);
})();
