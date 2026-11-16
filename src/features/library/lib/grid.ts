import type { CardDensity } from '@/features/settings';

/** The space between two cards, in dp. */
export const LIBRARY_GRID_GAP = 12;

/** The padding on one side of the Library screen, in dp. */
export const LIBRARY_SIDE_PADDING = 24;

/** The Library screen's total horizontal padding, in dp. */
export const LIBRARY_HORIZONTAL_PADDING = LIBRARY_SIDE_PADDING * 2;

export type LibraryGrid = {
  /** One column per Design at density 1, and the chosen count otherwise. */
  columns: number;
  /** The exact width one card gets at the current viewport, in dp. */
  cardWidth: number;
};

/**
 * The Library grid for a chosen density and the width available to it. The
 * density is the column count; the card width is derived from the current
 * content width, so rotation changes only how wide the cards are, never the
 * number of columns or the row's fit inside the screen.
 */
export function libraryGrid(density: CardDensity, contentWidth: number): LibraryGrid {
  const width = Math.max(0, Math.floor(contentWidth));
  const cardWidth = Math.floor((width - LIBRARY_GRID_GAP * (density - 1)) / density);

  // A viewport narrower than the gaps cannot hold the chosen density without
  // overflowing. One card that fits beats four that do not.
  if (cardWidth <= 0) {
    return { columns: 1, cardWidth: width };
  }

  return { columns: density, cardWidth };
}
