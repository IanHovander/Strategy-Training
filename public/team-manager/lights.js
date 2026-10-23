// The arena's lights, shared: the intro's spotlight cones, and the World Championship hall's, which are the same.
import { withAlpha } from './pixel.js';

/** A spotlight cone from (x, y), in screen space: one flat triangle 320 pixels long, the only path the game draws. */
export function beam(g, x, y, angle, spread, a, c = '#cfe0ff') {
  withAlpha(a, () => {
    g.fillStyle = c;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.sin(angle - spread) * 320, y + Math.cos(angle - spread) * 320);
    g.lineTo(x + Math.sin(angle + spread) * 320, y + Math.cos(angle + spread) * 320);
    g.fill();
  });
}
