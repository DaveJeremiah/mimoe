// Nine distinct organic blob border-radius values for a repeating pattern.
// The 8-value syntax is: top-left-x top-right-x bottom-right-x bottom-left-x
//                      / top-left-y top-right-y bottom-right-y bottom-left-y
export const BLOB_RADII = [
  "55% 45% 60% 40% / 45% 55% 45% 55%",
  "40% 60% 50% 50% / 60% 40% 55% 45%",
  "65% 35% 45% 55% / 40% 60% 50% 50%",
  "45% 55% 65% 35% / 60% 40% 40% 60%",
  "60% 40% 55% 45% / 35% 65% 40% 60%",
  "35% 65% 60% 40% / 50% 50% 35% 65%",
  "50% 50% 40% 60% / 65% 35% 55% 45%",
  "70% 30% 45% 55% / 45% 55% 65% 35%",
  "45% 55% 70% 30% / 30% 70% 45% 55%",
] as const;
