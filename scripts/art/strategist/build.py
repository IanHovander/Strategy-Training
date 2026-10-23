# Writes public/team-manager/hero.js from strategist.txt, the strategist's portrait drawn as a grid: a palette block
# ("letter #hex" lines), a blank line, then one letter per pixel ('.' is see-through). Edit the grid, then run
#   python3 scripts/art/strategist/build.py
from pathlib import Path
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
head, body = (HERE / 'strategist.txt').read_text().split('\n\n', 1)
rows = [r for r in body.splitlines() if r.strip()]
W = max(len(r) for r in rows)
rows = [r.ljust(W, '.') for r in rows]
# Room on the right for the marker's swing.
W = 40
rows = [r[:W] for r in rows]
assert all(set(r[W:]) <= {'.'} for r in body.splitlines() if r.strip())
names = {
 'k': 'outline', 'S': 'skin, lit', 's': 'skin', 'd': 'skin, shade', 'D': 'skin, deep shade',
 'g': 'hair', 'h': 'hair, strands', 'H': 'hair, lit strands', 'G': 'hair, brown glints',
 'E': 'iris', 'w': 'white of the eye', 'e': 'blush', 'M': 'mouth', 'm': 'lip', 'T': 'teeth', 'Y': 'sock', 'Z': 'sock, shade',
 'R': 'shirt, lit', 'r': 'shirt', 'q': 'shirt, shade', 'Q': 'shirt, fold', 'W': 'shirt print',
 'J': 'jeans, lit', 'j': 'jeans', 'n': 'jeans, shade', 'N': 'jeans, under the hem', 'C': 'button, clip shine',
 'U': 'other sock', 'u': 'other sock, stripe; marker cap',
 'O': 'sneaker', 'o': 'sneaker, shade', 'p': 'sole, marker cord', 'P': 'sole edge',
 'B': 'whiteboard', 'b': 'whiteboard, shade', 'f': 'board frame', 'F': 'board frame, shade', 'c': 'clip',
 'K': 'marker barrel',
}
pal = {l.split()[0]: l.split()[1] for l in head.splitlines()}
used = (set(''.join(rows)) | set('kuUKop')) - {'.'}
order = [c for c in names if c in used]
assert not (used - set(order)), used - set(order)
js = f"""// The main character at full height: the team's high-school strategist, an Asian girl looking right at you with a
// small, real smile, shoulder-length near-black hair parted at the side, the team's red 5026 shirt tucked into
// high-waisted jeans, rolled cuffs over mismatched socks and canvas sneakers. She stands three-quarters on with her
// weight on one leg, a hand on that hip and the other shoulder up. The drive team's whiteboard hangs from her other
// hand, tilted away from her side and wiped clean, the marker swinging under it on a cord.
//
// The other sprites are built from rectangles at the camera's scale. This one is drawn pixel by pixel at the canvas's
// own resolution, so the face can have real features: draw it with the camera at scale 1. One letter per pixel,
// PALETTE says what each one is, and '.' is see-through.

import {{ layer, blit, fill }} from './pixel.js';

const PALETTE = {{
{chr(10).join(f"  {c}: '{pal[c]}', // {names[c]}" for c in order)}
}};

// Standing on the bottom row; column FOOT_X is under the middle of her body.
const BODY = [
{chr(10).join(f"  '{r}'," for r in rows)}
];

// The marker and its cord, hanging from the board's bottom corner.
const MARKER = [
  '.kk.',
  'kUuk',
  'kuuk',
  'kkkk',
  'kKok',
  'kKok',
  'kKok',
  'kKok',
  '.kk.',
];

export const HERO_W = {W}, HERO_H = {len(rows)};
const FOOT_X = 17;

function stamp(grid, x0, y0, lines) {{
  lines.forEach((line, dy) => {{
    [...line].forEach((ch, dx) => {{
      if (ch !== '.') grid[y0 + dy][x0 + dx] = ch;
    }});
  }});
}}

function pixels(blink, sway) {{
  const grid = BODY.map((row) => [...row]);
  // Eyes shut: the lashes drop to where the irises were.
  if (blink) stamp(grid, 13, 9, ['dddd...ddd', '.ggg...gg']);
  grid[57][35] = 'p';
  grid[58][35 + sway] = 'p';
  stamp(grid, 34 + sway, 59, MARKER);
  return grid;
}}

const cache = new Map();
/** The hero as an offscreen layer, cached per pose. o: blink, sway (-1, 0 or 1: the marker). */
export function heroLayer(o = {{}}) {{
  const blink = !!o.blink;
  const sway = Math.max(-1, Math.min(1, Math.round(o.sway ?? 0)));
  const key = `${{blink}} ${{sway}}`;
  if (!cache.has(key)) {{
    const grid = pixels(blink, sway);
    cache.set(key, layer(HERO_W, HERO_H, () => {{
      grid.forEach((row, y) => {{
        // One rectangle per run of the same colour.
        for (let x = 0; x < HERO_W; ) {{
          let end = x + 1;
          while (end < HERO_W && row[end] === row[x]) end++;
          if (row[x] !== '.') fill(x, y, end - x, 1, PALETTE[row[x]]);
          x = end;
        }}
      }});
    }}));
  }}
  return cache.get(key);
}}

/** The idle loop at t seconds: a blink every 6.3 s and the marker swinging on its cord. */
export function heroIdle(t) {{
  const swing = Math.sin(t * 2.1);
  return {{ blink: t % 6.3 > 6.16, sway: swing > 0.55 ? 1 : swing < -0.55 ? -1 : 0 }};
}}

/** Draw the hero standing on (x, y): x is the middle of her body, y the floor. o as for heroLayer. */
export function drawHero(x, y, o = {{}}) {{
  blit(heroLayer(o), x - FOOT_X, y - HERO_H);
}}
"""
(ROOT / 'public/team-manager/hero.js').write_text(js)
print(f'Wrote public/team-manager/hero.js: the portrait ({W} x {len(rows)}).')
