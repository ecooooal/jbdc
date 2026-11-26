import {
  ModalBottomSheet,
  type ModalDetent,
  type SurfaceStyle,
} from "@swmansion/react-native-bottom-sheet";
import { type ReactNode, useId } from "react";
import { View, type ColorValue } from "react-native";
import { useKeyboardState } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResolveClassNames } from "uniwind";
import { cn } from "@/shared/lib/utils";
import { SheetFrame, SheetSurface } from "./sheet-surface";
import { useSheetDepth } from "./sheet-stack";

/** The floating card's gap from the screen's sides, and above its bottom safe area. */
const SHEET_INSET = 12;

/** DESIGN.md's Quiet Turn: a sheet arrives and leaves within 200ms. */
const SHEET_SETTLE_MS = 200;

/**
 * The sheet wrapper: the one place the app configures a modal bottom sheet. It
 * has a closed detent and a content detent, opens when the surface says it is
 * open, and reports every way the owner asks to close — a drag to the closed
 * detent, the scrim, a screen reader's dismiss, or Android's Back — through one
 * close fact. It carries no state and decides nothing: the surface that owns
 * the open state says what closing means.
 *
 * The sheet floats: a card inset from the sides, the status bar, and the bottom
 * safe area, with all four corners rounded, rather than a panel joined to the
 * screen's edge. Every sheet wears the same plate inside it — the dashed frame
 * the empty states use, on a paper tone that steps once per sheet stacked above
 * it. `SheetBody` draws the frame and the gutter, because its box ends at the
 * floating card while the native surface extends below it.
 *
 * Behind a sheet the screen takes the overlay tone, so the paper above it is
 * the only lit thing the eye has left.
 *
 * The content detent follows its measured content immediately, because a sheet
 * that animates its own content would otherwise lag behind the height it
 * measures.
 *
 * The keyboard lifts the card instead of growing it: the detent's bottom inset
 * grows to the keyboard's height, so the plate keeps its shape and its frame
 * whole, and the fields stay above the keys rather than the keys climbing into
 * the plate.
 */
export function Sheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children?: ReactNode;
}) {
  // DESIGN.md rounded.2xl, the corner a floating paper card takes. The class
  // resolves to the same numeric radii React Native styles use; the host's
  // surface contract narrows away React Native's wider `DimensionValue`
  // typing.
  const surfaceStyle = useResolveClassNames("rounded-2xl") as SurfaceStyle;
  // DESIGN.md's Photography Overlay is the world's one scrim tone, and the host
  // takes the colour rather than a class; the same resolution the radius uses
  // keeps it on the palette in both appearances.
  const scrim = useResolveClassNames("bg-overlay") as { backgroundColor?: ColorValue };
  const insets = useSafeAreaInsets();
  // The keyboard's settled height, reported by the controller that already
  // wraps the app. It replaces the bottom safe area the keys now cover, so the
  // card keeps its floating gap above them instead of letting them climb into
  // the plate. The controller keeps the last height after the keys leave — it
  // is the closing animation's frame — so only a visible keyboard counts.
  const keyboardHeight = useKeyboardState((state) => (state.isVisible ? state.height : 0));
  const id = useId();
  const depth = useSheetDepth(id, open);
  // The closed detent ignores insets; the open one floats the card clear of
  // the screen's sides and above the home indicator or gesture bar, and keeps
  // the same gap under the status bar when the content grows tall. An open
  // keyboard replaces the bottom safe area it covers.
  const detents: ModalDetent[] = [
    0,
    {
      value: "content",
      insets: {
        start: SHEET_INSET,
        end: SHEET_INSET,
        bottom: Math.max(insets.bottom, keyboardHeight) + SHEET_INSET,
      },
    },
  ];

  return (
    <ModalBottomSheet
      detents={detents}
      topInset={insets.top + SHEET_INSET}
      index={open ? 1 : 0}
      onCloseRequest={onClose}
      onIndexChange={(index) => {
        if (index === 0) onClose();
      }}
      animateContentHeight={false}
      settleDuration={SHEET_SETTLE_MS}
      scrimColor={scrim.backgroundColor}
      surface={<SheetSurface depth={depth} />}
      surfaceStyle={surfaceStyle}
    >
      {children}
    </ModalBottomSheet>
  );
}

/**
 * The one body the app's sheets share: the plate's inset frame, its inner
 * gutter, and the gap between its rows. The frame is anchored here rather than
 * in the native surface: the surface is sized against the host's whole sheet
 * and extends below the floating card, which clipped the frame's bottom border
 * away. The body's box ends at the card, so all four sides sit the same
 * distance from the edge.
 *
 * Sixteen points of padding leaves the same air between the frame and the
 * content on every side, and the same sixteen between one field and the next —
 * the sheet's own list rhythm. The header's control is taller than its title,
 * so the title gains a little more air below it than the fields get between
 * them, and `SheetFooter` adds the rest above the closing row.
 *
 * Sheets pass their test id through because each body is still the surface's
 * own; everything else about it belongs to the wrapper.
 */
export function SheetBody({
  testID,
  className,
  children,
}: {
  testID?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <View testID={testID} className={cn("gap-4 p-4", className)}>
      <SheetFrame />
      {children}
    </View>
  );
}

/**
 * The closing row a sheet ends on: its actions on one line, set a section's
 * distance below the last field rather than a field's distance, so the footer
 * reads as the sheet's decision and not as another row of the form. `justify-end`
 * is the default; a sheet whose two actions sit at opposite ends of the decision
 * — Remove beside Close — overrides the alignment only.
 */
export function SheetFooter({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <View className={cn("flex-row items-center justify-end gap-2 pt-2", className)}>
      {children}
    </View>
  );
}
