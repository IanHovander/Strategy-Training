# Draws the teammate's portrait into teammate.txt (palette, blank line, one letter per pixel), from curves: every part
# is an ellipse, a rounded box or a tapered tube, outlined in ink and shaded from the upper left along its own edge.
# The body is drawn here, back to front; the head is in head.py. build.py runs this, so you rarely need to.
import math
from pathlib import Path
HERE = Path(__file__).resolve().parent
W, H = 40, 93
PAL = (HERE / 'palette.txt').read_text().strip()
grid = [['.'] * W for _ in range(H)]
CELLS = [(x, y) for y in range(H) for x in range(W)]
def put(x, y, c):
    if 0 <= x < W and 0 <= y < H: grid[y][x] = c
def ellipse(cx, cy, rx, ry):
    return {(x, y) for (x, y) in CELLS if ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1}
def squircle(cx, cy, rx, ry, p=3.0):
    return {(x, y) for (x, y) in CELLS if abs((x + .5 - cx) / rx) ** p + abs((y + .5 - cy) / ry) ** p <= 1}
def tube(ax, ay, bx, by, ra, rb):
    out = set()
    L2 = (bx - ax) ** 2 + (by - ay) ** 2
    for (x, y) in CELLS:
        px, py = x + .5, y + .5
        t = max(0, min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / L2))
        if math.hypot(px - ax - t * (bx - ax), py - ay - t * (by - ay)) <= ra + (rb - ra) * t: out.add((x, y))
    return out
mir = lambda m: {(W - 1 - x, y) for (x, y) in m}
def part(mask, shade):
    for (x, y) in mask:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if (x + dx, y + dy) not in mask: put(x + dx, y + dy, 'k')
    for (x, y) in mask: put(x, y, shade(x, y, mask))
    return mask
def round_tone(lit, base, sh):
    """Lit along the upper left edge, shaded in a band along the lower right, following the shape's own curve."""
    def f(x, y, m):
        if (x + 1, y) not in m or (x + 2, y) not in m or (x + 1, y + 1) not in m: return sh
        if (x - 1, y) not in m or (x - 1, y - 1) not in m or (x, y - 1) not in m: return lit
        return base
    return f

# ---- Legs and shoes ----
legL = tube(15.6, 59, 16.2, 85.5, 4.1, 3.5)
part(legL, round_tone('J', 'j', 'n'))
part(mir(legL), round_tone('J', 'j', 'n'))
for (x, y) in [(14, 66), (15, 67), (14, 75), (15, 76), (14, 82), (15, 83), (17, 83)]: put(x, y, 'n'); put(W - 1 - x, y, 'n')  # creases
shoeL = ellipse(15.0, 88.3, 5.6, 3.2) - {(x, y) for (x, y) in CELLS if y >= 90}
part(shoeL, round_tone('O', 'O', 'o'))
part(mir(shoeL), round_tone('O', 'O', 'o'))
for x in range(10, 20):
    put(x, 90, 'P'); put(W - 1 - x, 90, 'P')
    put(x, 91, 'k'); put(W - 1 - x, 91, 'k')
put(9, 90, 'k'); put(30, 90, 'k'); put(10, 90, 'k'); put(29, 90, 'k')
for (x, y) in [(14, 87), (16, 86), (18, 87)]: put(x, y, 'p'); put(W - 1 - x, y, 'p')  # laces
put(11, 88, 'p'); put(28, 88, 'p')  # toe caps catching the light

# ---- The hoodie: a puffy rounded body, ribbed hem ----
torso = squircle(20, 43.0, 12.9, 16.0, 2.8)
part(torso, round_tone('R', 'r', 'q'))
for (x, y) in torso:
    if y >= 55: put(x, y, 'q' if x % 2 else 'r')
# Soft folds in the front.
for (x, y) in [(12, 46), (13, 47), (13, 48), (27, 46), (26, 47), (26, 48), (18, 44), (21, 44)]: put(x, y, 'q')

# ---- Sleeves bending at the elbow, then the hands together in front ----
upper = tube(9.0, 31.5, 6.6, 44.0, 3.1, 2.9)
fore = tube(6.6, 44.0, 15.6, 53.2, 2.9, 2.5)
sleeve = upper | fore
part(sleeve, round_tone('R', 'r', 'q'))
part(mir(sleeve), round_tone('R', 'r', 'q'))
cuffL = {(x, y) for (x, y) in fore if math.hypot(x + .5 - 15.6, y + .5 - 53.2) < 2.6}
for (x, y) in cuffL: put(x, y, 'q'); put(W - 1 - x, y, 'q')
for (x, y) in [(7, 41), (6, 42), (7, 45), (8, 46)]: put(x, y, 'q'); put(W - 1 - x, y, 'q')  # the crease at the elbow
hands = ellipse(20, 54.3, 4.7, 2.6)
part(hands, round_tone('S', 's', 'd'))
for (x, y) in [(19, 54), (20, 54), (19, 55), (20, 55)]: put(x, y, 'd')
put(18, 53, 'd'); put(21, 53, 'd')

# ---- The neck, the hood bunched round it, the navy tee at the throat ----
part(tube(20, 22, 20, 28, 3.0, 3.0), lambda x, y, m: 'd')
hood = ellipse(14.2, 26.0, 4.4, 4.5) | ellipse(26.4, 27.4, 3.5, 3.1) | ellipse(20, 28.9, 10.6, 3.4)
opening = ellipse(20, 27.6, 3.6, 2.5)
part(hood - opening, round_tone('R', 'r', 'q'))
for (x, y) in opening: put(x, y, 'd' if y < 28 else 'Q')
for (x, y) in [(18, 28), (19, 28), (20, 28), (21, 28)]: put(x, y, 'N')
# Folds curving round the bunched hood.
for (x, y) in [(12, 24), (13, 25), (14, 26), (15, 27), (11, 27), (12, 28), (27, 26), (26, 27), (25, 28), (13, 30), (26, 30)]: put(x, y, 'q')
for (x, y) in [(13, 22), (14, 22), (11, 24)]: put(x, y, 'R')

# ---- The badge: the panther in its hexagon, and 5026 beside it ----
B = 6  # the badge's rows count from the hoodie's top
HEX = ['..WW..', '.WLLW.', 'WLWWLW', 'WLWWWW', 'WLLWLW', '.WLLW.', '..WW..']
for j, r in enumerate(HEX):
    for i, c in enumerate(r):
        if c != '.': put(9 + i, 29 + B + j, c)
DIG = {'5': ['WWW', 'W..', 'WWW', '..W', 'WWW'], '0': ['WWW', 'W.W', 'W.W', 'W.W', 'WWW'],
       '2': ['WWW', '..W', 'WWW', 'W..', 'WWW'], '6': ['WWW', 'W..', 'WWW', 'W.W', 'WWW']}
for n, ch in enumerate('5026'):
    for j, r in enumerate(DIG[ch]):
        for i, c in enumerate(r):
            if c != '.': put(16 + n * 4 + i, 29 + B + j, c)
for x in range(18, 30): put(x, 35 + B, 'W')
put(16, 35 + B, 'W')

exec((HERE / 'head.py').read_text())

# Where red meets red (a sleeve on the body, the hood on the shoulders), the line between is dark red, not ink.
RED = set('Rrq')
for y in range(H):
    for x in range(1, W - 1):
        if grid[y][x] != 'k': continue
        lr = grid[y][x - 1] in RED and grid[y][x + 1] in RED
        ud = 0 < y < H - 1 and grid[y - 1][x] in RED and grid[y + 1][x] in RED
        if lr or ud: grid[y][x] = 'Q'

(HERE / 'teammate.txt').write_text(PAL + '\n\n' + '\n'.join(''.join(r) for r in grid) + '\n')
