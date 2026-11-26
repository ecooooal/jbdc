import { LIBRARY_GRID_GAP, libraryGrid } from "../lib/grid";

describe("library grid", () => {
  test("density 1 gives one Design the full content width", () => {
    expect(libraryGrid(1, 342)).toEqual({ columns: 1, cardWidth: 342 });
  });

  test("density 2 renders two columns", () => {
    const { columns, cardWidth } = libraryGrid(2, 342);

    expect(columns).toBe(2);
    expect(cardWidth).toBeGreaterThan(0);
  });

  test("every row fits the content width before and after a rotation", () => {
    for (const contentWidth of [0, 20, 342, 430, 768, 1024]) {
      for (const density of [1, 2] as const) {
        const { columns, cardWidth } = libraryGrid(density, contentWidth);

        expect(columns * cardWidth + LIBRARY_GRID_GAP * (columns - 1)).toBeLessThanOrEqual(
          contentWidth,
        );
      }
    }
  });

  test("a width too small for the gap falls back to one fitting card", () => {
    expect(libraryGrid(2, 0)).toEqual({ columns: 1, cardWidth: 0 });
    expect(libraryGrid(2, 8)).toEqual({ columns: 1, cardWidth: 8 });
  });
});
