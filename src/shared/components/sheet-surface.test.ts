import { sheetTone } from "./sheet-surface";

test("the base sheet wears Unbleached Paper", () => {
  expect(sheetTone(0)).toBe("bg-sheet");
});

test("each sheet above the base steps one tone deeper", () => {
  expect(sheetTone(1)).toBe("bg-sheet-stacked");
  expect(sheetTone(2)).toBe("bg-sheet-stacked-deep");
});

test("a stack deeper than the tones keeps the deepest tone", () => {
  expect(sheetTone(9)).toBe("bg-sheet-stacked-deep");
});

test("a depth below the base stays on the base tone", () => {
  expect(sheetTone(-1)).toBe("bg-sheet");
});
