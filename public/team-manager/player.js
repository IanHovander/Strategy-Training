// The player: the name they type as they start a new season (intro.js), kept in this browser so it's still there next
// time. cast.js's HERO_NAME is this name, so it goes on the strategist's name tag everywhere; until there's one, she's
// STRATEGIST.
const KEY = 'bluebanner.name';

/** The longest name: it has to fit her name tag and the dialog lines it's said in (38 characters at most). */
export const NAME_MAX = 10;

/** A name in the game's letters: capitals, digits, spaces and . ' - (pixel.js's font has no others), NAME_MAX long. */
export const cleanName = (s) => s.toUpperCase().replace(/[^A-Z0-9 .'-]/g, '').replace(/\s+/g, ' ').replace(/^ /, '').slice(0, NAME_MAX);

/** The name given (?name= in the address first, for a browser that won't keep it), or '' if none yet. */
export function savedName() {
  const fromAddress = new URLSearchParams(location.search).get('name');
  if (fromAddress) return cleanName(fromAddress).trim();
  try {
    return cleanName(localStorage.getItem(KEY) ?? '').trim();
  } catch {
    return '';
  }
}

export function saveName(name) {
  try {
    localStorage.setItem(KEY, name);
  } catch {
    // Storage blocked (a private window, say): the address carries it into the game instead.
  }
}
