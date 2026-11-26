import { FadeIn, ReduceMotion } from "react-native-reanimated";

/** The world's motion budget: nothing announces, nothing outlives it. */
export const QUIET_MOTION_DURATION_MS = 200;

/**
 * The Library's Detail arrival: the screen fades while its content settles
 * from a small zoom, so it reads as focusing in rather than sliding sideways.
 * Every other route keeps its default transition, and the zoom never
 * overshoots.
 */
export const DETAIL_ARRIVAL = {
  screen: { animation: "fade", animationDuration: QUIET_MOTION_DURATION_MS },
  zoom: { from: 0.96, duration: QUIET_MOTION_DURATION_MS },
} as const;

/**
 * A section's arrival after a tab switch: the incoming sheet cross-fades
 * inside the quiet budget, with no slide, so the two sections read as one
 * record turning its page. Reduced motion resolves it on the spot.
 */
export const SECTION_ARRIVAL = FadeIn.duration(QUIET_MOTION_DURATION_MS).reduceMotion(
  ReduceMotion.System,
);
