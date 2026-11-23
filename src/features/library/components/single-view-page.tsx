import { BlurTargetView, BlurView } from "expo-blur";
import { Image } from "expo-image";
import { useRef, type ComponentRef, type RefObject } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DesignStatusBadge } from "@/features/designs/react";
import { useImageUri } from "@/features/images/react";
import { Text } from "@/shared/components/ui/text";
import { cn } from "@/shared/lib/utils";
import type { LibraryDesign } from "../lib/query";
import { EmptyCover } from "./empty-cover";
import { PressHighlight, type PressHighlightHandlers } from "./press-highlight";

/** How strongly the details panel frosts the photography behind it. */
const PANEL_BLUR_INTENSITY = 50;

/**
 * The room the details panel takes above the bottom safe inset: its top
 * padding, a two-line title, the status row, and the gap between them. A
 * control that must not cover the panel sits above this.
 */
export const SINGLE_VIEW_PANEL_CLEARANCE = 160;

/** What the BlurView blurs: the page's photography layer. */
type BlurTarget = RefObject<ComponentRef<typeof View> | null>;

/** Where the panel sits: pinned across the page's bottom edge. */
const PANEL_POSITION = { position: "absolute", bottom: 0, left: 0, right: 0 } as const;

/**
 * The panel over the photography: the Design's name in the serif title face,
 * then its Status pill beside the Category and Collection in the sans face.
 * This is the design system's one blur, and it frosts only the image beneath
 * it. Over a plate there is nothing to frost: the plate already names the
 * Design, so the panel becomes a plain paper caption with a Thread Line above
 * it, carrying only the record — Status, Category, Collection — and never
 * running over the plate's frame. Its bottom padding clears the home
 * indicator, and it lets touches through so a swipe can start anywhere on the
 * page.
 */
function SingleViewPanel({
  design,
  blurTarget,
  overPhotography,
}: {
  design: LibraryDesign;
  blurTarget: BlurTarget;
  /** True only when a Cover lies beneath the panel; a plate is paper. */
  overPhotography: boolean;
}) {
  const insets = useSafeAreaInsets();
  const details = (
    <View
      className={cn(
        "gap-2 px-6 pt-4",
        overPhotography ? "bg-background/60" : "bg-background border-border border-t",
      )}
      style={{ paddingBottom: insets.bottom + 20 }}
    >
      {overPhotography ? (
        <Text variant="h3" numberOfLines={2}>
          {design.name}
        </Text>
      ) : null}
      <View className="flex-row flex-wrap items-center gap-2">
        <DesignStatusBadge status={design.status} />
        <Text variant="muted">
          {design.category ?? "No category"} · {design.collection ?? "No collection"}
        </Text>
      </View>
    </View>
  );

  if (!overPhotography) {
    return (
      <View testID="single-view-panel" pointerEvents="none">
        {details}
      </View>
    );
  }

  return (
    <BlurView
      testID="single-view-panel"
      pointerEvents="none"
      intensity={PANEL_BLUR_INTENSITY}
      tint="default"
      blurMethod="dimezisBlurViewSdk31Plus"
      blurTarget={blurTarget}
      style={PANEL_POSITION}
    >
      {details}
    </BlurView>
  );
}

/**
 * One Design as a single-view page: its Cover fills the frame edge to edge,
 * and the blurred panel states what the Owner is looking at. A Design with no
 * Cover keeps the same page with the named plate: the plate is inset so its
 * dashed frame stays whole at every edge, and it ends above the paper caption
 * rather than under it, so nothing clips the empty state.
 */
export function SingleViewPage({
  design,
  width,
  press,
}: {
  design: LibraryDesign;
  /** The page's exact width in dp, so a paged list lines its pages up. */
  width: number;
  press: PressHighlightHandlers;
}) {
  const uri = useImageUri(design.cover);
  const blurTarget = useRef<ComponentRef<typeof View> | null>(null);

  if (!uri) {
    return (
      <View className="h-full overflow-hidden" style={{ width }}>
        <PressHighlight accessibilityLabel={design.name} className="mb-4 mt-12 flex-1" {...press}>
          <EmptyCover name={design.name} size="page" className="flex-1" />
        </PressHighlight>

        <SingleViewPanel design={design} blurTarget={blurTarget} overPhotography={false} />
      </View>
    );
  }

  return (
    <View className="h-full overflow-hidden" style={{ width }}>
      <BlurTargetView ref={blurTarget} style={{ flex: 1 }}>
        <PressHighlight
          accessibilityLabel={design.name}
          className="bg-muted h-full w-full"
          {...press}
        >
          <Image
            testID="single-view-cover"
            source={{ uri }}
            accessibilityLabel={`Cover of ${design.name}`}
            contentFit="cover"
            style={{ width: "100%", height: "100%" }}
          />
        </PressHighlight>
      </BlurTargetView>

      <SingleViewPanel design={design} blurTarget={blurTarget} overPhotography />
    </View>
  );
}
