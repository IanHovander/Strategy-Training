# Writes public/team-manager/teammate.js: draws the portrait (portrait.py, head.py) and the walking heads
# (walking_heads.py), then puts them together with the code that draws them. Run
#   python3 scripts/art/teammate/build.py
import runpy
from pathlib import Path
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
runpy.run_path(str(HERE / 'portrait.py'))
runpy.run_path(str(HERE / 'walking_heads.py'))
head, body = (HERE / 'teammate.txt').read_text().split('\n\n', 1)
rows = [r for r in body.splitlines() if r.strip()]
while set(rows[-1]) == {'.'}: rows.pop()
W = 40
assert all(len(r) == W for r in rows)
names = {
 'k': 'outline', 'S': 'skin, lit', 's': 'skin', 'd': 'skin, shade', 'D': 'skin, deep shade', 'e': 'cheeks',
 'g': 'hair', 'h': 'hair, strands', 'H': 'hair, sheen', 'E': 'eyes', 'T': 'teeth', 'M': 'mouth', 'm': 'lip',
 'R': 'hoodie, lit', 'r': 'hoodie', 'q': 'hoodie, shade', 'Q': 'hoodie, seams and folds', 'N': 'tee under it',
 'W': 'badge, white', 'L': 'badge, black',
 'J': 'jeans, lit', 'j': 'jeans', 'n': 'jeans, shade', 'O': 'sneaker', 'o': 'sneaker, shade', 'P': 'sole', 'p': 'laces',
}
pal = {l.split()[0]: l.split()[1] for l in head.splitlines()}
used = set(''.join(rows)) - {'.'}
order = [c for c in names if c in used]
assert not (used - set(order)), used - set(order)
js = f"""// A teammate at full height, drawn from a photo: thick black hair, tousled on top with a choppy fringe down to the
// brows, and a smile wide enough to show teeth, eyes narrowed by it. The team's red pullover hoodie, the hood bunched
// round the neck and a navy tee showing at the throat, with the panther-in-a-hexagon badge and 5026 across the chest;
// dark jeans and black sneakers. Standing square on, hands together in front.
//
// Like the hero (hero.js), this sprite is drawn pixel by pixel at the canvas's own resolution: draw it with the camera
// at scale 1. One letter per pixel, PALETTE says what each one is, and '.' is see-through.

import {{ layer, blit, fill }} from './pixel.js';
import {{ HERO_LOOK, leftFacing }} from './walker.js';

const PALETTE = {{
{chr(10).join(f"  {c}: '{pal[c]}', // {names[c]}" for c in order)}
}};

// Standing on the bottom row; the middle of the body is between columns 19 and 20.
const BODY = [
{chr(10).join(f"  '{r}'," for r in rows)}
];

export const TEAMMATE_W = {W}, TEAMMATE_H = {len(rows)};
const FOOT_X = 20;

function stamp(grid, x0, y0, lines) {{
  lines.forEach((line, dy) => {{
    [...line].forEach((ch, dx) => {{
      if (ch !== '.') grid[y0 + dy][x0 + dx] = ch;
    }});
  }});
}}

function pixels(blink) {{
  const grid = BODY.map((row) => [...row]);
  // Eyes shut: the lids come down to where the irises were.
  if (blink) stamp(grid, 15, 12, ['sss....sss', 'EEE....EEE']);
  return grid;
}}

const cache = new Map();
/** The teammate as an offscreen layer, cached per pose. o: blink. */
export function teammateLayer(o = {{}}) {{
  const blink = !!o.blink;
  if (!cache.has(blink)) {{
    const grid = pixels(blink);
    cache.set(blink, layer(TEAMMATE_W, TEAMMATE_H, () => {{
      grid.forEach((row, y) => {{
        // One rectangle per run of the same colour.
        for (let x = 0; x < TEAMMATE_W; ) {{
          let end = x + 1;
          while (end < TEAMMATE_W && row[end] === row[x]) end++;
          if (row[x] !== '.') fill(x, y, end - x, 1, PALETTE[row[x]]);
          x = end;
        }}
      }});
    }}));
  }}
  return cache.get(blink);
}}

/** The idle loop at t seconds: a blink every 5.4 s, out of step with the hero's. */
export const teammateIdle = (t) => ({{ blink: t % 5.4 > 5.26 }});

/** Draw the teammate standing on (x, y): x is the middle of the body, y the floor. o as for teammateLayer. */
export function drawTeammate(x, y, o = {{}}) {{
  blit(teammateLayer(o), x - FOOT_X, y - TEAMMATE_H);
}}
"""
import json
heads = json.loads((HERE / 'walking_heads.json').read_text())
def rows_js(rows): return '\n'.join(f"    '{r}'," for r in rows)
js += f"""
// ---- Walking ----
// The same teammate on the walker's rig (walker.js): the hoodie with its long sleeves, hood and badge, and a head drawn
// by hand for each direction, from the portrait.
const HEADS = {{
{chr(10).join(f"  {d}: [{chr(10)}{rows_js(heads[d])}{chr(10)}  ]," for d in ('s', 'se', 'e', 'ne', 'n'))}
}};
HEADS.sw = leftFacing(HEADS.se);
HEADS.w = leftFacing(HEADS.e);
HEADS.nw = leftFacing(HEADS.ne);

export const TEAMMATE_LOOK = {{
  id: 'teammate', board: false, hoodie: true, sleeves: 'long',
  pal: {{
    ...HERO_LOOK.pal,
    skin: ['{pal['d']}', '{pal['s']}', '{pal['S']}'],
    shirt: ['{pal['q']}', '{pal['r']}', '{pal['R']}'],
    hem: ['{pal['Q']}', '{pal['q']}', '{pal['r']}'],
    jeans: ['{pal['n']}', '{pal['j']}', '{pal['J']}'],
    cuff: ['{pal['n']}', '{pal['j']}', '{pal['J']}'],
    sockL: ['{pal['o']}', '{pal['O']}', '{pal['O']}'],
    sockR: ['{pal['o']}', '{pal['O']}', '{pal['O']}'],
    shoe: ['{pal['o']}', '{pal['O']}', '#5a5e6c'],
    sole: ['{pal['p']}', '{pal['P']}', '{pal['P']}'],
    print: null,
  }},
  heads: HEADS,
  headPal: {{
    k: '{pal['k']}', g: '{pal['g']}', h: '{pal['h']}', H: '{pal['H']}', s: '{pal['s']}', S: '{pal['S']}', d: '{pal['d']}', D: '{pal['D']}',
    e: '{pal['e']}', E: '{pal['E']}', M: '{pal['M']}', m: '{pal['m']}', T: '{pal['T']}',
  }},
  // The panther's hexagon, and 5026 beside it with the stroke under.
  badge: [[-4, -1, 3, 3, '{pal['W']}'], [-3, 0, 1, 1, '{pal['L']}'], [0, -1, 4, 2, '{pal['W']}'], [1, -1, 1, 1, '{pal['r']}'], [0, 2, 4, 1, '{pal['W']}']],
}};
"""
(ROOT / 'public/team-manager/teammate.js').write_text(js)
print(f'Wrote public/team-manager/teammate.js: the portrait ({W} x {len(rows)}) and five walking heads.')
