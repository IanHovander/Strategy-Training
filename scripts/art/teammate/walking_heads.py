# The teammate's walking heads for walker.js, 16 x 16, anchored like the hero's (the rig's head sits on column 8,
# row 8): facing you, three-quarters, in profile, turned away and from behind. The other three directions are these
# mirrored (in teammate.js). Writes walking_heads.json; build.py runs this.
import json
from pathlib import Path
HERE = Path(__file__).resolve().parent
def blank(): return [['.'] * 16 for _ in range(16)]
def spans(g, sp, shade):
    m = {(x, y) for y, ss in sp.items() for a, b in ss for x in range(a, b + 1)}
    for (x, y) in m:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            X, Y = x + dx, y + dy
            if (X, Y) not in m and 0 <= X < 16 and 0 <= Y < 16: g[Y][X] = 'k'
    for (x, y) in m: g[y][x] = shade(x, y, m)
    return m
def pts(g, lst, c):
    for (x, y) in lst: g[y][x] = c
def hairShade(x, y, m):
    return 'g' if (x - 1, y) not in m or (x + 1, y) not in m or (x, y - 1) not in m else 'h'
def lumps(g, cells):
    """Round out the crown: hair cells added along the dome's edge, re-outlined."""
    for (x, y) in cells: g[y][x] = 'g'
    for (x, y) in cells:
        for dx, dy in ((1, 0), (-1, 0), (0, -1)):
            X, Y = x + dx, y + dy
            if 0 <= X < 16 and 0 <= Y < 16 and g[Y][X] == '.': g[Y][X] = 'k'
def fringe(g, ends, top=5):
    for x, end in ends.items():
        for y in range(top, end + 1): g[y][x] = 'h' if y < end else 'g'
        if g[end + 1][x] == 's': g[end + 1][x] = 'd'  # the fringe's shadow on the forehead
H = {}

# Facing you.
g = blank()
spans(g, {6: [(3, 12)], **{y: [(2, 13)] for y in range(7, 12)}, 12: [(3, 12)], 13: [(4, 11)], 14: [(5, 10)]},
      lambda x, y, m: 'd' if x >= 12 or (y >= 13 and x >= 9) else 's')
pts(g, [(1, 9), (1, 10), (1, 11), (14, 9), (14, 10), (14, 11)], 'd')
pts(g, [(0, 9), (0, 10), (0, 11), (15, 9), (15, 10), (15, 11), (1, 12), (14, 12)], 'k')
spans(g, {1: [(4, 11)], 2: [(3, 12)], 3: [(2, 13)], 4: [(1, 14)], 5: [(1, 8), (11, 14)], 6: [(1, 1), (14, 14)], 7: [(1, 1), (14, 14)], 8: [(1, 1), (14, 14)]}, hairShade)
pts(g, [(4, 0), (6, 0), (7, 0), (10, 0), (12, 0), (3, 1), (12, 1)], 'k')
pts(g, [(5, 2), (6, 2), (4, 3), (3, 4)], 'H')
pts(g, [(8, 3), (9, 4), (11, 3), (12, 4)], 'g')
fringe(g, {2: 8, 3: 7, 4: 7, 5: 7, 6: 7, 7: 6, 8: 5, 9: 5, 10: 6, 11: 7, 12: 7, 13: 8}, top=5)
pts(g, [(4, 5), (6, 6), (11, 6)], 'g')
# Small faces stay simple: eyes a dark dash two pixels tall, a shadow for the nose, the smile a dark centre with soft
# corners; no teeth, no blush.
pts(g, [(5, 9), (5, 10), (10, 9), (10, 10)], 'E')
pts(g, [(8, 11)], 'd')
pts(g, [(6, 12), (9, 12)], 'm'); pts(g, [(7, 12), (8, 12)], 'M')
lumps(g, [(3, 1), (12, 1), (2, 2), (13, 2)])
H['s'] = g

# Turned toward you and to the right: the face moves over, the near ear and more hair on the left.
g = blank()
spans(g, {6: [(5, 13)], **{y: [(4, 14)] for y in range(7, 12)}, 12: [(5, 13)], 13: [(6, 12)], 14: [(7, 11)]},
      lambda x, y, m: 'd' if x >= 13 or (y >= 13 and x >= 10) else 's')
pts(g, [(3, 9), (3, 10), (3, 11)], 'd'); pts(g, [(3, 10)], 'D'); pts(g, [(2, 9), (2, 10), (2, 11)], 'k')
spans(g, {1: [(4, 11)], 2: [(3, 12)], 3: [(2, 13)], 4: [(1, 14)], 5: [(1, 9), (12, 14)], 6: [(1, 4), (14, 14)], 7: [(1, 3)], 8: [(1, 3)], 9: [(1, 1)], 10: [(1, 1)], 11: [(2, 3)]}, hairShade)
pts(g, [(4, 0), (6, 0), (7, 0), (10, 0), (12, 0), (3, 1), (12, 1)], 'k')
pts(g, [(5, 2), (6, 2), (4, 3), (3, 4)], 'H')
pts(g, [(8, 3), (9, 4), (11, 3), (12, 4), (2, 6)], 'g')
fringe(g, {4: 8, 5: 7, 6: 7, 7: 7, 8: 7, 9: 6, 10: 5, 11: 5, 12: 6, 13: 7, 14: 8}, top=5)
pts(g, [(6, 6), (8, 6), (13, 6)], 'g')
pts(g, [(7, 9), (7, 10), (12, 9), (12, 10)], 'E')
pts(g, [(12, 11)], 'd')
pts(g, [(9, 12), (12, 12)], 'm'); pts(g, [(10, 12), (11, 12)], 'M')
lumps(g, [(3, 1), (12, 1), (2, 2), (13, 2)])
H['se'] = g

# In profile, facing right.
g = blank()
spans(g, {6: [(9, 13)], **{y: [(7, 13)] for y in range(7, 12)}, 9: [(7, 14)], 10: [(7, 14)], 12: [(8, 13)], 13: [(9, 12)], 14: [(10, 11)]},
      lambda x, y, m: 'd' if x <= 8 or (y >= 13) else 's')
pts(g, [(6, 9), (6, 10)], 'd'); pts(g, [(6, 10)], 'D'); pts(g, [(5, 9), (5, 10)], 'k')
spans(g, {1: [(4, 10)], 2: [(2, 12)], 3: [(1, 13)], 4: [(0, 13)], 5: [(0, 13)], 6: [(0, 8)], 7: [(0, 6)], 8: [(0, 5)], 9: [(0, 4)], 10: [(0, 4)], 11: [(1, 5)], 12: [(2, 5)]}, hairShade)
pts(g, [(5, 0), (7, 0), (9, 0), (3, 1), (11, 1)], 'k')
pts(g, [(4, 2), (5, 2), (3, 3), (2, 4)], 'H')
pts(g, [(7, 3), (8, 4), (10, 3), (11, 4), (3, 6), (4, 8)], 'g')
fringe(g, {9: 6, 10: 7, 11: 6, 12: 7, 13: 7}, top=5)
pts(g, [(12, 9), (12, 10)], 'E')
pts(g, [(14, 10)], 'd')
pts(g, [(12, 12)], 'd'); pts(g, [(13, 12)], 'M')
lumps(g, [(3, 1), (11, 1), (1, 2), (0, 3)])
H['e'] = g

# Turned away and to the right: the back of the head, the ear and the edge of the cheek.
g = blank()
spans(g, {9: [(11, 13)], 10: [(11, 13)], 11: [(11, 13)], 12: [(5, 12)], 13: [(6, 11)], 14: [(7, 10)]},
      lambda x, y, m: 'd' if x == 11 or y >= 12 else 's')
spans(g, {1: [(4, 11)], 2: [(3, 12)], 3: [(2, 13)], 4: [(1, 14)], 5: [(1, 14)], 6: [(1, 14)], 7: [(1, 14)], 8: [(1, 14)],
          9: [(1, 9)], 10: [(1, 9)], 11: [(2, 9)], 12: [(3, 4)]}, hairShade)
pts(g, [(10, 9), (10, 10)], 'd'); pts(g, [(10, 10)], 'D')
pts(g, [(4, 0), (6, 0), (7, 0), (10, 0), (3, 1), (12, 1)], 'k')
pts(g, [(5, 2), (6, 2), (7, 2), (4, 3), (3, 4)], 'H')
pts(g, [(8, 4), (9, 5), (5, 6), (6, 7), (9, 8), (10, 9)], 'g')
H['ne'] = g

# From behind.
g = blank()
spans(g, {12: [(5, 10)], 13: [(5, 10)], 14: [(6, 9)]}, lambda x, y, m: 'd')
spans(g, {1: [(4, 11)], 2: [(3, 12)], 3: [(2, 13)], **{y: [(1, 14)] for y in range(4, 9)}, 9: [(2, 13)], 10: [(2, 13)], 11: [(3, 12)], 12: [(4, 5), (10, 11)]}, hairShade)
pts(g, [(4, 0), (6, 0), (7, 0), (10, 0), (12, 0), (3, 1), (12, 1)], 'k')
# Ears either side.
pts(g, [(1, 9), (1, 10), (14, 9), (14, 10)], 'd'); pts(g, [(0, 9), (0, 10), (15, 9), (15, 10), (1, 11), (14, 11)], 'k')
pts(g, [(5, 2), (6, 2), (7, 2), (4, 3), (3, 4)], 'H')
pts(g, [(9, 4), (10, 5), (5, 6), (6, 7), (8, 8), (9, 9)], 'g')
H['n'] = g

(HERE / 'walking_heads.json').write_text(json.dumps({d: [''.join(r) for r in g] for d, g in H.items()}))
