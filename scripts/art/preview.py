# Renders a portrait grid (a palette block of "letter #hex" lines, a blank line, then one letter per pixel) to a PNG:
# enlarged with a faint pixel grid, then at 2x and 1x, and optionally beside a reference picture.
#   python3 scripts/art/preview.py scripts/art/strategist/strategist.txt preview.png [--zoom 6] [--ref photo.jpg]
# Needs Pillow (pip install pillow).
import argparse
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('grid')
ap.add_argument('out')
ap.add_argument('--zoom', type=int, default=6)
ap.add_argument('--ref', help='a picture to show beside it, scaled to the same height')
args = ap.parse_args()

head, body = open(args.grid).read().split('\n\n', 1)
pal = {l.split()[0]: tuple(int(l.split()[1][i:i + 2], 16) for i in (1, 3, 5)) for l in head.splitlines() if l.strip()}
rows = [r for r in body.splitlines() if r.strip()]
w, h, z = max(len(r) for r in rows), len(rows), args.zoom
back = (17, 24, 74)
ref = None
if args.ref:
    ref = Image.open(args.ref).convert('RGB')
    ref.thumbnail((h * z, h * z))
img = Image.new('RGB', (w * z + w * 2 + w + 50 + (ref.width + 10 if ref else 0), h * z + 20), (40, 40, 40))

def draw(ox, s):
    gap = 1 if s > 4 else 0
    for y, r in enumerate(rows):
        for x in range(w):
            ch = r[x] if x < len(r) else '.'
            c = back if ch == '.' else pal.get(ch, (255, 0, 255))  # magenta: a letter missing from the palette
            img.paste(c, (ox + x * s, 10 + y * s, ox + (x + 1) * s - gap, 10 + (y + 1) * s - gap))

draw(10, z)
draw(w * z + 20, 2)
draw(w * z + 30 + w * 2, 1)
if ref: img.paste(ref, (w * z + 40 + w * 3, 10))
img.save(args.out)
print(f'{w} x {h}: wrote {args.out}')
