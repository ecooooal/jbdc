import { DETAIL_ARRIVAL, QUIET_MOTION_DURATION_MS } from "./motion";

test("the Detail arrival is a fade and a small zoom inside the quiet budget", () => {
  expect(DETAIL_ARRIVAL.screen).toEqual({
    animation: "fade",
    animationDuration: QUIET_MOTION_DURATION_MS,
  });
  expect(DETAIL_ARRIVAL.zoom.from).toBeGreaterThan(0.9);
  expect(DETAIL_ARRIVAL.zoom.from).toBeLessThan(1);
  expect(DETAIL_ARRIVAL.zoom.duration).toBe(QUIET_MOTION_DURATION_MS);
  expect(QUIET_MOTION_DURATION_MS).toBeLessThanOrEqual(200);
});
