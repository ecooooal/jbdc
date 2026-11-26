import { StyleSheet, View } from "react-native";

/**
 * The plate tones, one per stack depth: Unbleached Paper for the base sheet,
 * then one step of tone for each sheet opened above it. The last tone carries
 * any deeper stack, so a third sheet above still reads as a stacked plate.
 *
 * Light steps toward Kraft; dark steps toward the lamplight surface tones, so
 * a sheet opened above another moves forward in both appearances instead of
 * sinking into the screen.
 */
const TONES = ["bg-sheet", "bg-sheet-stacked", "bg-sheet-stacked-deep"] as const;

/** The tone a sheet at `depth` wears, clamped to the last step. */
export function sheetTone(depth: number): (typeof TONES)[number] {
  return TONES[Math.min(Math.max(depth, 0), TONES.length - 1)];
}

/**
 * A bottom sheet's paper fill, stepped by stack depth. The native host renders
 * it behind the content and clips it to the card's shape, so it may extend
 * past the card without showing; it carries no border for that reason.
 */
export function SheetSurface({ depth }: { depth: number }) {
  return (
    <View
      testID="sheet-surface"
      style={StyleSheet.absoluteFill}
      className={sheetTone(depth)}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

/**
 * The sheet's inset dashed frame, drawn as a plate. It lives in `SheetBody`
 * rather than the surface: the surface is sized against the host's whole sheet
 * and can extend below the floating card, which would clip the bottom border
 * away. The body ends at the card, so all four sides sit the same distance from
 * the edge.
 *
 * It is Faded Thread rather than a Thread Line hairline, the same readable
 * dash the empty Cover uses, and it is pointer-transparent so it never catches
 * a gesture.
 */
export function SheetFrame() {
  return (
    <View
      testID="sheet-frame"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="border-muted-foreground absolute inset-2 rounded-xl border border-dashed"
    />
  );
}
