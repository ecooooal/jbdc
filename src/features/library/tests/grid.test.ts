import { LIBRARY_GRID_GAP, libraryGrid } from '@/features/library';

describe('library grid', () => {
  test('density 1 gives one Design the full content width', () => {
    expect(libraryGrid(1, 342)).toEqual({ columns: 1, cardWidth: 342 });
  });

  test('densities 2 and 4 render that many columns', () => {
    const two = libraryGrid(2, 342);
    const four = libraryGrid(4, 342);

    expect(two.columns).toBe(2);
    expect(four.columns).toBe(4);
    expect(two.cardWidth).toBeGreaterThan(0);
    expect(four.cardWidth).toBeGreaterThan(0);
  });

  test('every row fits the content width before and after a rotation', () => {
    for (const contentWidth of [0, 20, 342, 430, 768, 1024]) {
      for (const density of [1, 2, 4] as const) {
        const { columns, cardWidth } = libraryGrid(density, contentWidth);

        expect(columns * cardWidth + LIBRARY_GRID_GAP * (columns - 1)).toBeLessThanOrEqual(
          contentWidth
        );
      }
    }
  });

  test('a width too small for the gaps falls back to one fitting card', () => {
    expect(libraryGrid(4, 0)).toEqual({ columns: 1, cardWidth: 0 });
    expect(libraryGrid(4, 20)).toEqual({ columns: 1, cardWidth: 20 });
  });
});
