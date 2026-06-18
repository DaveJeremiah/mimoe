// Generates smooth closed SVG paths for clipPathUnits="objectBoundingBox".
// Uses Catmull-Rom → Bezier interpolation through 8 radial knot points,
// giving organic amoeba shapes with guaranteed smooth curves through each lobe.
// Center is (0.5,0.5); angles start at 3 o'clock and go clockwise (screen coords).
// Radii range 0.30–0.65: low = indentation, high = lobe.

function amoebaPath(radii: readonly number[]): string {
  const n = radii.length;
  const pts = radii.map((r, i) => {
    const a = (i * 2 * Math.PI) / n;
    return { x: +(0.5 + r * Math.cos(a)).toFixed(3), y: +(0.5 + r * Math.sin(a)).toFixed(3) };
  });
  // Catmull-Rom tension 1/6 → smooth spline with no overshoot
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

// 8 knot radii: [right, lower-right, bottom, lower-left, left, upper-left, top, upper-right]
// Values < 0.42 = indentation, > 0.56 = lobe
const RADII_SETS = [
  [0.58, 0.48, 0.63, 0.38, 0.56, 0.32, 0.52, 0.44],  // 0: lobes right+bottom; dips upper-left
  [0.44, 0.56, 0.38, 0.64, 0.48, 0.60, 0.65, 0.34],  // 1: big top lobe + lower-left lobe
  [0.63, 0.40, 0.55, 0.50, 0.66, 0.37, 0.58, 0.52],  // 2: wide lobes left+right, dip upper-left
  [0.50, 0.67, 0.44, 0.56, 0.31, 0.58, 0.42, 0.62],  // 3: lobes lower-right+upper-right; narrow left
  [0.65, 0.54, 0.40, 0.62, 0.48, 0.34, 0.58, 0.44],  // 4: wide right lobe + lower-left
  [0.42, 0.58, 0.64, 0.48, 0.57, 0.66, 0.50, 0.36],  // 5: lobes upper-left+bottom; dip upper-right
] as const;

export const AMOEBA_PATHS = RADII_SETS.map(amoebaPath);
export const AMOEBA_COUNT = AMOEBA_PATHS.length;
