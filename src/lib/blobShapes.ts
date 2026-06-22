// Six chunky organic blob shapes — "inflated polygon" style (smooth, mostly convex,
// like rounded triangles/ovals/squares). Catmull-Rom → Bezier, 8 radial knots.
// Knot order: [E, SE, S, SW, W, NW, N, NE] (SVG y-axis, so "S" = bottom).
// All radii in 0.34–0.52 range: no deep concavities, gentle lobe variation.
// Background overshoots 25% so values slightly outside 0–1 are fine.

function amoebaPath(radii: readonly number[]): string {
  const n = radii.length;
  const pts = radii.map((r, i) => {
    const a = (i * 2 * Math.PI) / n;
    return { x: +(0.5 + r * Math.cos(a)).toFixed(3), y: +(0.5 + r * Math.sin(a)).toFixed(3) };
  });
  const t = 1 / 6;
  const segs = pts.map((_, i) => {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = +(p1.x + (p2.x - p0.x) * t).toFixed(3);
    const c1y = +(p1.y + (p2.y - p0.y) * t).toFixed(3);
    const c2x = +(p2.x - (p3.x - p1.x) * t).toFixed(3);
    const c2y = +(p2.y - (p3.y - p1.y) * t).toFixed(3);
    return `C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`;
  });
  return `M ${pts[0].x} ${pts[0].y} ${segs.join(' ')} Z`;
}

const RADII_SETS = [
  // 0 — horizontal oval: wide & low, slight asymmetry
  [0.50, 0.43, 0.38, 0.45, 0.48, 0.43, 0.38, 0.44],
  // 1 — rounded triangle: three equal bumps at E / SW / N
  [0.50, 0.38, 0.37, 0.50, 0.36, 0.38, 0.50, 0.37],
  // 2 — wide bean: fat sides, bottom-right stretch
  [0.52, 0.45, 0.40, 0.44, 0.50, 0.42, 0.37, 0.46],
  // 3 — vertical oval: taller than wide
  [0.38, 0.44, 0.52, 0.46, 0.36, 0.44, 0.52, 0.43],
  // 4 — squircle: cardinal bumps, corners pulled in
  [0.48, 0.37, 0.47, 0.39, 0.48, 0.37, 0.47, 0.39],
  // 5 — rounded pear: bottom-heavy drop shape
  [0.46, 0.49, 0.52, 0.47, 0.42, 0.36, 0.34, 0.40],
] as const;

export const AMOEBA_PATHS = RADII_SETS.map(amoebaPath);
export const AMOEBA_COUNT = AMOEBA_PATHS.length;
