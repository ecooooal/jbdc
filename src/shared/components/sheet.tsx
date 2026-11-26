import {
  ModalBottomSheet,
  type ModalDetent,
  type SurfaceStyle,
} from "@swmansion/react-native-bottom-sheet";
import { type ReactNode, useId } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResolveClassNames } from "uniwind";
import { SheetSurface } from "./sheet-surface";
import { useSheetDepth } from "./sheet-stack";

/** The floating card's gap from the screen's sides, and above its bottom safe area. */
const SHEET_INSET = 12;

/**
 * The sheet wrapper: the one place the app configures a modal bottom sheet. It
 * has a closed detent and a content detent, opens when the surface says it is
 * open, and reports every way the owner asks to close — a drag to the closed
 * detent, the scrim, a screen reader's dismiss, or Android's Back — through one
 * close fact. It carries no state and decides nothing: the surface that owns
 * the open state says what closing means.
 *
 * The sheet floats: a card inset from the sides and lifted above the bottom
 * safe area, with all four corners rounded, rather than a panel joined to the
 * screen's edge. Every sheet wears the same plate inside it — the dashed frame
 * the empty states use, on a paper tone that steps once per sheet stacked above
 * it. The wrapper owns both, so a sheet gets them by existing rather than by
 * remembering to draw them.
 *
 * The content detent follows its measured content immediately, because a sheet
 * that animates its own content (the notes sheet's composer keyboard padding)
 * would otherwise lag behind the height it measures.
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
  const insets = useSafeAreaInsets();
  const id = useId();
  const depth = useSheetDepth(id, open);
  // The closed detent ignores insets; the open one floats the card clear of
  // the screen's sides and above the home indicator or gesture bar.
  const detents: ModalDetent[] = [
    0,
    {
      value: "content",
      insets: { start: SHEET_INSET, end: SHEET_INSET, bottom: insets.bottom + SHEET_INSET },
    },
  ];

  return (
    <ModalBottomSheet
      detents={detents}
      index={open ? 1 : 0}
      onCloseRequest={onClose}
      onIndexChange={(index) => {
        if (index === 0) onClose();
      }}
      animateContentHeight={false}
      surface={<SheetSurface depth={depth} />}
      surfaceStyle={surfaceStyle}
    >
      {children}
    </ModalBottomSheet>
  );
}
