# The teammate's head, run by portrait.py (which supplies put, part, ellipse, tube, mir, CELLS and grid). Measured
# from the photo at this scale: brows on row 10, eyes on 12, the nose ending on 16, the smile on 18-20, the chin on 24.
# An egg-shaped face widest at the cheeks with a rounded jaw, round ears, a domed mop with a lumpy outline, a fringe of
# pointed clumps parted right of centre, brows that slope away at the ends, smiling eyes and a half-moon smile.
def faceHalf(y):
    v = y + .5
    if v < 14.5: return 7.0 * math.sqrt(max(0, 1 - ((14.5 - v) / 12.5) ** 2))
    return 7.0 * math.sqrt(max(0, 1 - ((v - 14.5) / 10.2) ** 2))
faceM = {(x, y) for (x, y) in CELLS if 6 <= y <= 24 and abs(x + .5 - 20) <= faceHalf(y)}
earL = ellipse(12.4, 14.2, 1.9, 3.0) - faceM
ears = earL | mir(earL)
def skinShade(x, y, m):
    if (x, y) in ears: return 'd' if (x, y) in {(12, 13), (12, 14), (27, 13), (27, 14)} else 's'
    if (x + 1, y) not in m or (x + 2, y) not in m or (y >= 21 and (x, y + 1) not in m): return 'd'
    if (x - 1, y) not in m: return 'S'
    return 's'
part(faceM | ears, skinShade)
for (x, y) in [(12, 14), (27, 14)]: put(x, y, 'D')
# Hair: a domed mop, lumps round its edge, falling over the tops of the ears.
dome = ellipse(20, 8.4, 9.4, 8.4) - {(x, y) for (x, y) in CELLS if y > 10}
lumps = set()
for deg in (190, 212, 234, 256, 280, 304, 326, 350):
    a = math.radians(deg)
    lumps |= ellipse(20 + 9.6 * math.cos(a), 8.4 + 8.6 * math.sin(a), 1.5, 1.4)
sides = ellipse(12.0, 10.6, 2.0, 2.6) | ellipse(28.0, 10.8, 2.0, 2.8)
hairM = (dome | lumps | sides) - {(x, y) for (x, y) in faceM if y >= 7}
part(hairM, lambda x, y, m: 'g' if (x - 1, y) not in m or (x + 1, y) not in m or (x, y - 1) not in m or (x + 1, y + 1) not in m else 'h')
# A curved sheen across the crown, and strand lines curving down to the right.
for (x, y) in [(13, 5), (14, 4), (15, 3), (16, 3), (17, 2), (18, 2)]: put(x, y, 'H')
for (x, y) in [(20, 3), (21, 4), (22, 5), (24, 3), (25, 4), (26, 6), (16, 5), (17, 6)]: put(x, y, 'g')
# The fringe: pointed clumps, their tips following a curve: down to the brows on your left, up to the part just right
# of centre in an upside-down V, longer over the other temple. Everything above that edge is hair.
FRINGE_END = {13: 10, 14: 9, 15: 10, 16: 9, 17: 9, 18: 10, 19: 9, 20: 8, 21: 7, 22: 8, 23: 9, 24: 9, 25: 10, 26: 11}
for x, end in FRINGE_END.items():
    for y in range(4, end + 1):
        if (x, y) in faceM or (x, y) in hairM: put(x, y, 'g' if y == end else 'h')
for (x, y) in [(14, 7), (15, 8), (17, 7), (19, 7), (23, 7), (24, 8)]: put(x, y, 'g')
for (x, y) in [(14, 6), (16, 6), (24, 6)]: put(x, y, 'H')
# Arched brows, the eyes narrowed by the smile, looking at you; a little colour in the cheeks.
for (x, y) in [(14, 11), (15, 10), (16, 10), (17, 10), (18, 10)]:
    if grid[y][x] in 'sSd': put(x, y, 'g')
    if grid[y][39 - x] in 'sSd': put(39 - x, y, 'g')
for (x, y, c) in [(15, 12, 'E'), (16, 12, 'E'), (17, 12, 'E'), (16, 13, 'E'), (14, 13, 'd')]:
    put(x, y, c); put(39 - x, y, c)
for (x, y) in [(15, 15), (14, 16)]: put(x, y, 'e'); put(39 - x, y, 'e')
put(16, 14, 'd')  # the mark on that cheek
# A rounded nose: light down the bridge, the tip, the nostrils.
for y in (13, 14): put(19, y, 'S')
put(20, 14, 'd'); put(20, 15, 'd'); put(19, 15, 'S')
put(18, 16, 'D'); put(21, 16, 'D'); put(19, 16, 'd'); put(20, 16, 'd')
# The smile, a half moon: corners curling up, a thin upper lip, the top teeth curving down in the middle, the lower lip.
put(16, 17, 'd'); put(23, 17, 'd')
put(16, 18, 'M'); put(23, 18, 'M')
for x in range(17, 23): put(x, 18, 'm')
for x in range(17, 23): put(x, 19, 'T')
put(16, 19, 'd'); put(23, 19, 'd')
put(17, 20, 'M'); put(22, 20, 'M')
for x in range(18, 22): put(x, 20, 'T')
for x in range(18, 22): put(x, 21, 'm')
put(17, 21, 'd'); put(22, 21, 'd')
for x in range(19, 21): put(x, 22, 'd')
