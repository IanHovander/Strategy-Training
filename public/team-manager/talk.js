// Talking: the speech bubble over someone you can talk to, and the dialog box along the bottom of the screen that types
// out what's said. A conversation is a list of pages. A page is two lines of up to 38 characters, said by the person
// you're talking to: ['LINE ONE', 'LINE TWO'], or by someone else: { name: 'SOMEONE', lines: ['LINE ONE', 'LINE TWO'] }
// (add tag: a colour for their name tag). Cut scenes use the same box (stage.js).

import { C, useContext, screen, fill, text } from './pixel.js';

/** The speech bubble with A in it: its middle at screen x, its top at y. It bobs. */
export function drawBubble(g, x, y, t) {
  useContext(g);
  screen();
  y = Math.max(1, Math.round(y)) + (Math.floor(t * 3) % 2);
  x = Math.round(x);
  fill(x - 5, y, 11, 10, C.ink);
  fill(x - 4, y + 1, 9, 8, C.white);
  fill(x - 1, y + 10, 3, 1, C.ink);
  fill(x, y + 11, 1, 1, C.ink);
  text('A', x - 2, y + 2, { font: 3, color: C.blue1 });
}

/** A conversation: name is who's talking unless a page says otherwise; it starts typing at t (seconds). */
export const conversation = (name, pages, t, extra = {}) => ({ name, pages, page: 0, start: t, full: false, ...extra });

const linesOf = (page) => (Array.isArray(page) ? page : page.lines);
const pageLength = (page) => linesOf(page).reduce((n, line) => n + line.length, 0);
const typedOf = (d, t) => (d.full ? Infinity : Math.floor((t - d.start) * 40));
/** Whether the page on screen has finished typing. */
export const typed = (d, t) => typedOf(d, t) >= pageLength(d.pages[d.page]);
/** When the page on screen finished (or will finish) typing. */
export const typedAt = (d) => (d.full ? d.fullAt : d.start + pageLength(d.pages[d.page]) / 40);

/** The dialog box: who's talking, then the page typed out. Nothing before the conversation starts. */
export function drawDialog(g, d, t) {
  if (t < d.start && !d.full) return;
  useContext(g);
  screen();
  const page = d.pages[d.page];
  const lines = linesOf(page), name = Array.isArray(page) ? d.name : page.name;
  const shown = typedOf(d, t);
  fill(4, 98, 248, 44, C.ink);
  fill(6, 100, 244, 40, '#f4f6fb');
  fill(7, 101, 242, 1, C.blue3);
  if (name) {
    const nameW = name.length * 6 + 9;
    fill(8, 90, nameW, 12, C.ink);
    fill(9, 91, nameW - 2, 10, (!Array.isArray(page) && page.tag) || d.tag || C.blue1);
    text(name, 13, 93, { color: C.white });
  }
  let left = shown;
  lines.forEach((line, i) => {
    text(line, 12, 107 + i * 13, { color: C.ink, upto: Math.max(0, left) });
    left -= line.length;
  });
  if (shown >= pageLength(page) && Math.floor(t * 2.5) % 2 === 0) drawMore(240, 130, C.blue1);
}
/** The arrow that says A reads on: five pixels wide at (x, y), pointing down. */
export function drawMore(x, y, color) {
  fill(x, y, 5, 1, color);
  fill(x + 1, y + 1, 3, 1, color);
  fill(x + 2, y + 2, 1, 1, color);
}

/** Press A in a conversation: finish typing the page, or turn it, or say goodbye. Returns false when it's over. */
export function advance(d, t) {
  if (!typed(d, t)) {
    d.full = true;
    d.fullAt = t;
    return true;
  }
  d.page += 1;
  d.full = false;
  d.start = t;
  return d.page < d.pages.length;
}
/** The page being said, as plain text for the phone and screen readers. */
export function dialogText(d) {
  const page = d.pages[d.page];
  if (!page) return '';
  const said = linesOf(page).join(' ');
  return Array.isArray(page) ? said : `${page.name}: ${said}`;
}
