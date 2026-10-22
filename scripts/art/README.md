# Character art for Blue Banner

The team manager's two full-height portraits are drawn here, and built into the JavaScript the game loads. They run
on Python 3 with nothing to install; only `preview.py` needs Pillow (`pip install pillow`).

| Character | Source | Builds |
| --- | --- | --- |
| The strategist | `strategist/strategist.txt` | `public/team-manager/hero.js` |
| The teammate | `teammate/portrait.py`, `teammate/head.py`, `teammate/walking_heads.py`, `teammate/palette.txt` | `public/team-manager/teammate.js` |

```sh
python3 scripts/art/strategist/build.py
python3 scripts/art/teammate/build.py
```

Then look at them in the game's review pages: run `npm run dev` and open `/team-manager/hero.html` and
`/team-manager/teammate.html`. The walkabout is `/team-manager/walk.html`.

## The strategist

`strategist.txt` is the portrait itself, drawn by hand as a grid: a palette block (`letter #hex` per line), a blank
line, then one letter per pixel, with `.` for see-through. Change letters to change pixels. `build.py` keeps the first
40 columns, so leave the right-hand margin empty; it also says what each palette letter is for. Her walking sprite's
heads are hand-drawn grids in `public/team-manager/walker.js`, edited in place.

## The teammate

Drawn from a photo, from curves rather than by hand, so it's tuned by changing shapes and numbers:

- `portrait.py`: the body, back to front. Each part is an ellipse, a rounded box (`squircle`) or a tapered tube, with
  its own ink outline and shading. The badge is at the end.
- `head.py`: the face, ears, hair and fringe, and the features placed pixel by pixel (eyes, brows, nose, smile).
- `walking_heads.py`: the walking sprite's heads, facing you, three-quarters, in profile, turned away and from behind.
  The rest of the walking look (the hoodie's colours, long sleeves, the hood, the chest badge) is at the end of
  `build.py`, and the rig that draws it is `public/team-manager/walker.js`.
- `palette.txt`: the colours, one letter each.

`build.py` runs all three and writes `teammate.js`. Along the way it leaves `teammate.txt` (the portrait as a grid) and
`walking_heads.json` next to them; they're rebuilt every time, so they aren't kept in git.

## Norbert

The team mascot, a plush penguin in a cat-ear headband with a pink bow and "26" on one ear. `norbert/norbert.txt`
is his sprite as a grid, in the same format as the strategist's, a bit over half the height of the people. It was
mapped pixel by pixel from a photo, then drawn over by hand: the eyes, the bow, the left ear, the "26" and the toes.
The game doesn't use him yet; `public/team-manager/assets/norbert.png` is the same sprite as an image, saved for later.
If you edit the grid, export the PNG again.

## Previewing

```sh
python3 scripts/art/preview.py scripts/art/teammate/teammate.txt preview.png --zoom 6 --ref photo.jpg
```

Draws a grid enlarged, then at 2x and actual size, with an optional picture beside it to compare against. The photo the
teammate was drawn from isn't kept in the repo.
