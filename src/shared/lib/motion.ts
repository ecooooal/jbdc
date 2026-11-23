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
