import { ModalBottomSheet, type SurfaceStyle } from "@swmansion/react-native-bottom-sheet";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useResolveClassNames } from "uniwind";

/**
 * The sheet wrapper: the one place the app configures a modal bottom sheet. It
 * has a closed detent and a content detent, opens when the surface says it is
 * open, and reports every way the owner asks to close — a drag to the closed
 * detent, the scrim, a screen reader's dismiss, or Android's Back — through one
 * close fact. It carries no state and decides nothing: the surface that owns
 * the open state says what closing means.
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
  // DESIGN.md rounded.2xl, the corner a paper sheet takes. The class resolves
  // to the same numeric radii React Native styles use; the host's surface
  // contract narrows away React Native's wider `DimensionValue` typing.
  const surfaceStyle = useResolveClassNames("rounded-t-2xl") as SurfaceStyle;

  return (
    <ModalBottomSheet
      detents={[0, "content"]}
      index={open ? 1 : 0}
      onCloseRequest={onClose}
      onIndexChange={(index) => {
        if (index === 0) onClose();
      }}
      animateContentHeight={false}
      surface={<View style={StyleSheet.absoluteFill} className="bg-card" />}
      surfaceStyle={surfaceStyle}
    >
      {children}
    </ModalBottomSheet>
  );
}
