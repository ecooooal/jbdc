import {
  ModalBottomSheet,
  type ModalDetent,
  type SurfaceStyle,
} from "@swmansion/react-native-bottom-sheet";
import { type ReactNode, useEffect, useId, useState } from "react";
import { ScrollView, View, type ColorValue } from "react-native";
import { KeyboardController, KeyboardEvents } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResolveClassNames } from "uniwind";
import { cn } from "@/shared/lib/utils";
import { SheetFrame, SheetSurface } from "./sheet-surface";
import { useSheetDepth } from "./sheet-stack";

/** The floating card's gap from the screen's sides, and above its bottom safe area. */
const SHEET_INSET = 12;

/**
 * DESIGN.md's Quiet Turn: a sheet arrives and leaves within 200ms. The same
 * spring carries the card between its two keyboard heights.
 */
const SHEET_SETTLE_MS = 200;

/**
 * The height the keys hold the card at, from the leading edge of the keyboard's
 * move in either direction.
 *
 * The controller's settled state only reports a hide once the keys have
 * finished leaving, so a card that followed it would hang in the air for the
 * whole exit and then drop in one frame. The will-events let the card start back
 * down as the keys start down, and the host's spring carries it to its rest; on
 * the way up the same spring starts when the keys start rising.
 *
 * The showing frame announces the height. A hiding frame announces none, so the
 * last shown height stays on hand until the next show replaces it.
 */
function useKeyboardLift(): number {
  const [keyboard, setKeyboard] = useState(() => ({
    open: KeyboardController.isVisible(),
    height: KeyboardController.state().height,
  }));

  useEffect(() => {
    const show = KeyboardEvents.addListener("keyboardWillShow", (event) =>
      setKeyboard({ open: true, height: event.height }),
    );
    const hide = KeyboardEvents.addListener("keyboardWillHide", () =>
      setKeyboard((previous) => ({ open: false, height: previous.height })),
    );

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return keyboard.open ? keyboard.height : 0;
}

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
 * the plate. The lift begins with the keys, in either direction, and the host
 * springs the card between the two heights, so the card travels with the
 * keyboard rather than arriving after it.
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
  // The keyboard's height while it is up. It replaces the bottom safe area the
  // keys now cover, so the card keeps its floating gap above them instead of
  // letting them climb into the plate.
  const keyboardLift = useKeyboardLift();
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
        bottom: Math.max(insets.bottom, keyboardLift) + SHEET_INSET,
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
      // The host springs the card to what its detents resolve to, so the
      // keyboard's lift and drop travel instead of snapping in one frame, and a
      // row added to a sheet makes room the same way.
      animateContentHeight
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
 * Twenty-four points of padding stands the content sixteen clear of the
 * dashed frame on every side — a section's distance, the same the dialogs use —
 * so the frame reads as the plate's rim rather than a second border crowding
 * every field. Fields keep sixteen between them, the sheet's own list rhythm.
 * `SheetHeader` and `SheetFooter` each add eight to that gap, so the title and
 * the closing row sit a section's distance from what they bracket.
 *
 * A body whose rows can outgrow the card asks for `scroll`, and then only its
 * rows move: the plate and the gutter stay where they are, and the sheet hugs
 * the rows until they reach the card's edge. That is what keeps a form's first
 * field and its footer reachable at the largest text scale, on the shortest
 * screen, with the keys up. The notes sheet keeps its own arrangement — only
 * its list scrolls, under a header that stays put — and so does not ask for it.
 *
 * The rows are a scroll view that shrinks to the card, never one that fills it:
 * the sheet's content detent is measured from this body, so a filling scroll
 * view would resolve every sheet to the full height it could reach. The host's
 * own scroll coordination is left alone; a drag that starts in the rows is
 * delivered to the sheet at the rows' edge, as with any native scrollable.
 *
 * Sheets pass their test id through because each body is still the surface's
 * own; everything else about it belongs to the wrapper.
 */
export function SheetBody({
  testID,
  className,
  scroll = false,
  children,
}: {
  testID?: string;
  className?: string;
  /** Let the rows scroll inside the plate when they outgrow the card. */
  scroll?: boolean;
  children?: ReactNode;
}) {
  if (!scroll) {
    return (
      <View testID={testID} className={cn("gap-4 p-6", className)}>
        <SheetFrame />
        {children}
      </View>
    );
  }

  return (
    <View testID={testID} className={cn("shrink p-6", className)}>
      <SheetFrame />
      <ScrollView
        testID="sheet-body-scroll"
        className="shrink"
        contentContainerClassName="gap-4"
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
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
