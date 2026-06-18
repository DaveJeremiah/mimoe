// Six smooth organic amoeba shapes as SVG cubic-bezier paths.
// clipPathUnits="objectBoundingBox" — coords are 0–1 fractions of the element size.
// Values slightly outside 0–1 create the "bumping out" effect.
// More segments = smoother, more organic curves.
export const AMOEBA_PATHS = [
  // 0 – leftward lean, 5 segments
  "M 0.5 0.04 C 0.7 -0.05 1.0 0.08 1.08 0.35 C 1.14 0.58 1.05 0.85 0.82 0.99 C 0.62 1.1 0.35 1.08 0.15 0.95 C -0.02 0.82 -0.06 0.55 0.02 0.32 C 0.08 0.14 0.28 0.08 0.5 0.04 Z",
  // 1 – top-heavy, 5 segments
  "M 0.2 0.06 C 0.48 -0.12 0.88 -0.04 1.02 0.28 C 1.14 0.52 1.06 0.82 0.84 0.98 C 0.64 1.12 0.32 1.14 0.1 1.0 C -0.08 0.86 -0.08 0.58 0.02 0.34 C 0.1 0.18 0.14 0.1 0.2 0.06 Z",
  // 2 – rightward bump, 4 segments
  "M 0.42 -0.02 C 0.72 -0.12 1.12 0.12 1.12 0.48 C 1.14 0.78 0.88 1.12 0.56 1.12 C 0.26 1.14 -0.04 0.9 -0.06 0.6 C -0.1 0.28 0.1 0.06 0.42 -0.02 Z",
  // 3 – narrow sides, tall, 4 segments
  "M 0.35 0.0 C 0.64 -0.12 1.0 0.1 1.08 0.44 C 1.14 0.72 0.96 1.04 0.65 1.12 C 0.38 1.18 0.06 1.04 -0.02 0.72 C -0.1 0.42 0.08 0.1 0.35 0.0 Z",
  // 4 – bottom-heavy, 4 segments
  "M 0.28 0.04 C 0.56 -0.1 0.92 0.06 1.04 0.38 C 1.14 0.66 1.0 0.96 0.72 1.1 C 0.48 1.2 0.16 1.1 0.02 0.88 C -0.1 0.66 -0.04 0.3 0.28 0.04 Z",
  // 5 – wider top, 5 segments
  "M 0.55 0.0 C 0.8 -0.08 1.14 0.18 1.12 0.52 C 1.1 0.78 0.84 1.1 0.52 1.12 C 0.24 1.12 -0.04 0.9 -0.06 0.58 C -0.12 0.3 0.1 0.04 0.55 0.0 Z",
] as const;

export const AMOEBA_COUNT = AMOEBA_PATHS.length;
