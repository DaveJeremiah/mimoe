import { AMOEBA_PATHS } from "@/lib/blobShapes";

// Renders a zero-size hidden SVG containing all 6 amoeba clip-path definitions.
// Place once near the root so any element can reference them via clip-path: url(#amoeba-N).
export function AmoebaDefs() {
  return (
    <svg
      aria-hidden="true"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        {AMOEBA_PATHS.map((d, i) => (
          <clipPath key={i} id={`amoeba-${i}`} clipPathUnits="objectBoundingBox">
            <path d={d} />
          </clipPath>
        ))}
      </defs>
    </svg>
  );
}
