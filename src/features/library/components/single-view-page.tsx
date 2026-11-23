import { BlurTargetView, BlurView } from "expo-blur";
import { Image } from "expo-image";
import { useRef, type ComponentRef, type RefObject } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DesignStatusBadge } from "@/features/designs/react";
import { useImageUri } from "@/features/images/react";
import { Text } from "@/shared/components/ui/text";
import type { LibraryDesign } from "../lib/query";
import { PressHighlight } from "./press-highlight";

/** How strongly the details panel frosts the photography behind it. */
const PANEL_BLUR_INTENSITY = 50;

/** What the BlurView blurs: the page's photography layer. */
type BlurTarget = RefObject<ComponentRef<typeof View> | null>;

/** Where the panel sits: pinned across the page's bottom edge. */
const PANEL_POSITION = { position: "absolute", bottom: 0, left: 0, right: 0 } as const;

/**
 * The panel over the photography: the Design's name in the serif title face,
 * then its Status pill beside the Category and Collection in the sans face.
 * This is the design system's one blur, and it frosts only the image beneath
 * it: over the dashed placeholder the same content sits on a plain scrim, so
 * nothing blurred ever rests on paper. Its bottom padding clears the home
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
  /** True only when a Cover lies beneath the panel; a placeholder is paper. */
  overPhotography: boolean;
}) {
  const insets = useSafeAreaInsets();
  const details = (
    <View
      className="bg-background/60 gap-2 px-6 pt-4"
      style={{ paddingBottom: insets.bottom + 20 }}
    >
      <Text variant="h3" numberOfLines={2}>
        {design.name}
      </Text>
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
      <View testID="single-view-panel" pointerEvents="none" style={PANEL_POSITION}>
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
 * Cover keeps the same frame with the dashed placeholder, so every page holds
 * its shape and the panel never jumps.
 */
export function SingleViewPage({
  design,
  width,
  onPress,
}: {
  design: LibraryDesign;
  /** The page's exact width in dp, so a paged list lines its pages up. */
  width: number;
  onPress: () => void;
}) {
  const uri = useImageUri(design.cover);
  const blurTarget = useRef<ComponentRef<typeof View> | null>(null);

  return (
    <View className="h-full overflow-hidden" style={{ width }}>
      <BlurTargetView ref={blurTarget} style={{ flex: 1 }}>
        <PressHighlight
          accessibilityLabel={design.name}
          className="bg-muted h-full w-full"
          onPress={onPress}
        >
          {uri ? (
            <Image
              testID="single-view-cover"
              source={{ uri }}
              accessibilityLabel={`Cover of ${design.name}`}
              contentFit="cover"
              style={{ width: "100%", height: "100%" }}
            />
          ) : (
            <View
              testID="single-view-placeholder"
              className="border-border h-full w-full items-center justify-center border border-dashed"
            />
          )}
        </PressHighlight>
      </BlurTargetView>

      <SingleViewPanel design={design} blurTarget={blurTarget} overPhotography={uri !== null} />
    </View>
  );
}
