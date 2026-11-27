import { BlurTargetView, BlurView } from "expo-blur";
import { Image } from "expo-image";
import { useRef, type ComponentRef, type ReactNode, type RefObject } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DesignStatusBadge } from "@/features/designs/react";
import { useImageUri } from "@/features/images/react";
import { Text } from "@/shared/components/ui/text";
import { cn } from "@/shared/lib/utils";
import type { LibraryDesign } from "../lib/query";
import { taxonomyLine } from "../lib/taxonomy-line";
import { EmptyCover } from "./empty-cover";
import { PressHighlight, type PressHighlightHandlers } from "./press-highlight";

/** How strongly the details panel frosts the photography behind it. */
const PANEL_BLUR_INTENSITY = 50;

/** What the BlurView blurs: the page's photography layer. */
type BlurTarget = RefObject<ComponentRef<typeof View> | null>;

/** Where the panel sits: pinned across the page's bottom edge. */
const PANEL_POSITION = { position: "absolute", bottom: 0, left: 0, right: 0 } as const;

/** What a page's panel needs to know about the page beneath it. */
export type SingleViewPageFrame = {
  blurTarget: BlurTarget;
  /** True only when a Cover lies beneath the panel; a plate is paper. */
  overPhotography: boolean;
};

/**
 * The panel's plate: the page's bottom gutter and its one blur. Over a plate
 * there is nothing to frost, so the panel is a plain paper caption with a
 * Thread Line above it; over photography it frosts only the image beneath it.
 * It lets touches through, so a swipe can start anywhere on the page.
 */
export function SingleViewPanelSurface({
  blurTarget,
  overPhotography,
  children,
}: SingleViewPageFrame & { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const details = (
    <View
      className={cn(
        "gap-2 px-6 pt-4",
        overPhotography ? "bg-background/60" : "bg-background border-border border-t",
      )}
      style={{ paddingBottom: insets.bottom + 20 }}
    >
      {children}
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
 * The Library's details panel: the Design's name in the serif title face over
 * a Cover, then its Status pill beside the one taxonomy line in the mono face.
 * The panel's bottom padding clears the home indicator, and its record row
 * stops short of the FAB's corner over photography.
 */
function SingleViewPanel({
  design,
  blurTarget,
  overPhotography,
}: { design: LibraryDesign } & SingleViewPageFrame) {
  const taxonomy = taxonomyLine(design);

  return (
    <SingleViewPanelSurface blurTarget={blurTarget} overPhotography={overPhotography}>
      {overPhotography ? (
        <Text variant="h3" numberOfLines={2}>
          {design.name}
        </Text>
      ) : null}
      <View className="flex-row flex-wrap items-center gap-2 pr-16">
        <DesignStatusBadge status={design.status} />
        {taxonomy ? (
          <Text className="text-muted-foreground font-mono text-sm leading-5">{taxonomy}</Text>
        ) : null}
      </View>
    </SingleViewPanelSurface>
  );
}

/**
 * The single view page's shell: the Design's Cover filling the frame edge to
 * edge, or the named plate when it has none, with a panel pinned beneath.
 * A coverless page keeps the plate inset so its dashed frame stays whole and
 * ends above the paper caption rather than under it.
 */
export function SingleViewPageShell({
  design,
  width,
  press,
  panel,
}: {
  design: LibraryDesign;
  /** The page's exact width in dp, so a paged list lines its pages up. */
  width: number;
  press: PressHighlightHandlers;
  panel: (frame: SingleViewPageFrame) => ReactNode;
}) {
  const uri = useImageUri(design.cover);
  const blurTarget = useRef<ComponentRef<typeof View> | null>(null);

  if (!uri) {
    return (
      <View className="h-full overflow-hidden" style={{ width }}>
        <PressHighlight accessibilityLabel={design.name} className="mb-4 mt-12 flex-1" {...press}>
          <EmptyCover name={design.name} size="page" className="flex-1" />
        </PressHighlight>

        {panel({ blurTarget, overPhotography: false })}
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

      {panel({ blurTarget, overPhotography: true })}
    </View>
  );
}

/**
 * One Design as a single-view page: its Cover fills the frame, and the
 * blurred panel states what the Owner is looking at. A Design with no Cover
 * keeps the same page with the named plate.
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
  return (
    <SingleViewPageShell
      design={design}
      width={width}
      press={press}
      panel={(frame) => <SingleViewPanel design={design} {...frame} />}
    />
  );
}
