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
 * A bottom sheet's paper: its fill, stepped by stack depth, and the inset
 * dashed frame that draws every sheet as a plate. The frame is inset from the
 * card's edge and pointer-transparent, so it sits in the gutter beside the
 * sheet's content and never catches a gesture. It is Faded Thread rather than
 * a Thread Line hairline, the same readable dash the empty Cover uses.
 *
 * The native host fills this element the full size of the floating card and
 * clips it to all four corners, so it survives a content height that shrinks
 * while the sheet is open.
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
    >
      <View
        testID="sheet-frame"
        className="border-muted-foreground absolute inset-2 rounded-xl border border-dashed"
      />
    </View>
  );
}
