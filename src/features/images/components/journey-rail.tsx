import * as TabsPrimitive from "@rn-primitives/tabs";
import { Image } from "expo-image";
import { Image as ImageIcon, Plus } from "lucide-react-native";
import { useEffect } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, {
  Easing,
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { IMAGE_KINDS, type ImageKind } from "@/features/database";
import { Icon } from "@/shared/components/ui/icon";
import { Text } from "@/shared/components/ui/text";
import { QUIET_MOTION_DURATION_MS } from "@/shared/lib/motion";
import { cn } from "@/shared/lib/utils";
import type { StageRowView, StageTab } from "../lib/gallery-reducer";
import { imageKindLabel, type Image as StoredImage, type ImageStage } from "../lib/images";
import { useImageUri } from "../lib/image-store-context";

/**
 * The selection's one move: the Deep Wood fill travels to its tab in the quiet
 * budget on a strong ease-out, and resolves on the spot under reduced motion.
 * The selected tab's ink changes with it; nothing else moves.
 */
const SELECTION_TIMING = {
  duration: 180,
  easing: Easing.bezier(0.23, 1, 0.32, 1),
  reduceMotion: ReduceMotion.System,
};

/** A press dips the tab's content in place; the fill under it never moves. */
const PRESS_TIMING = {
  duration: 110,
  easing: Easing.bezier(0.23, 1, 0.32, 1),
  reduceMotion: ReduceMotion.System,
};

/** The stage row's open and close: the shared accordion's linear transition. */
const STAGE_ROW_LAYOUT = LinearTransition.duration(QUIET_MOTION_DURATION_MS).reduceMotion(
  ReduceMotion.System,
);

function countLabel(count: number): string {
  return `${count} image${count === 1 ? "" : "s"}`;
}

/** The tabs only ever carry a stage kind; the root reports its own strings. */
function isImageKind(value: string): value is ImageKind {
  return (IMAGE_KINDS as readonly string[]).includes(value);
}

/**
 * One tab's content: the stage name over the picture glyph and its image
 * count, so an empty stage reads zero where work is missing. The selected tab
 * takes the Unbleached Paper ink that reads on the Deep Wood fill; the rest
 * stay Ink Thread and Faded Thread on Warm Paper.
 */
function StageTabContent({
  label,
  count,
  selected,
}: {
  label: string;
  count: number;
  selected: boolean;
}) {
  const ink = selected ? "text-selection-foreground" : "text-foreground";
  const quiet = selected ? "text-selection-foreground" : "text-muted-foreground";

  return (
    <>
      <Text className={cn("text-xs font-medium", ink)}>{label}</Text>
      <View className="flex-row items-center gap-1">
        <Icon as={ImageIcon} className={cn("size-3", quiet)} />
        <Text className={cn("text-xs", quiet)}>{count}</Text>
      </View>
    </>
  );
}

/**
 * One stage tab: its name and count, and the press that selects it. The whole
 * tab is the target. A press dips its content a touch; the label takes the
 * selected ink as the fill reaches the tab, so the glyph is never drawn twice.
 * The hairline at its left edge fades out while the fill crosses it, instead
 * of ruling over the wood.
 */
function StageTabButton({
  tab,
  index,
  position,
}: {
  tab: StageTab;
  index: number;
  position: SharedValue<number>;
}) {
  const label = imageKindLabel(tab.kind);
  const pressed = useSharedValue(0);

  const press = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.get() * 0.04 }],
  }));
  const divider = useAnimatedStyle(() => {
    const gap = Math.max(0, index - 1 - position.get(), position.get() - index);

    return { opacity: Math.min(1, gap * 2) };
  });

  return (
    <TabsPrimitive.Trigger
      value={tab.kind}
      accessibilityLabel={`${label}, ${countLabel(tab.count)}`}
      testID={`stage-tab-${tab.kind}`}
      onPressIn={() => pressed.set(withTiming(1, PRESS_TIMING))}
      onPressOut={() => pressed.set(withTiming(0, PRESS_TIMING))}
      className="relative flex-1"
    >
      {index > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={divider}
          className="bg-border absolute inset-y-1.5 left-0 w-hairline"
        />
      ) : null}
      <Animated.View
        style={press}
        className="min-h-11 items-center justify-center gap-0.5 py-1"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <StageTabContent label={label} count={tab.count} selected={tab.active} />
      </Animated.View>
    </TabsPrimitive.Trigger>
  );
}

/** A stored image's thumb, or the quiet placeholder its file's absence keeps. */
function StageImage({ image, className }: { image: StoredImage; className?: string }) {
  const uri = useImageUri(image);

  if (!uri) {
    return <View className={cn("border-border bg-muted border border-dashed", className)} />;
  }

  return (
    <View className={cn("bg-muted overflow-hidden", className)}>
      <Image source={{ uri }} contentFit="cover" style={{ width: "100%", height: "100%" }} />
    </View>
  );
}

/**
 * The plus card: the end of the active stage, and the whole of an empty one.
 * Pressing it attaches to that stage, which is why it names the stage and asks
 * for no kind.
 */
function AddImageCard({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      role="button"
      accessibilityLabel={`Add images to ${label}`}
      onPress={onPress}
      className="border-border aspect-[3/4] w-16 items-center justify-center gap-1 rounded-lg border border-dashed active:bg-accent"
    >
      <Icon as={Plus} className="text-muted-foreground size-5" />
      <Text variant="muted" className="text-xs leading-4">
        Add
      </Text>
    </Pressable>
  );
}

/**
 * The stage block: one rounded tab row on Warm Paper with a Thread Line
 * border, one equal tab per stage — all four always visible, each naming its
 * stage over a picture glyph and its image count. The Deep Wood fill slides
 * beneath the selected tab, and no tab is ever wider than its quarter. The
 * active stage's row sits beneath the tabs, its images oldest first and the
 * plus card at the end; pressing the active tab closes it and choosing another
 * stage opens it. The row is one horizontal line that scrolls and stops at its
 * ends, and it collapses on the shared accordion's linear layout transition. A
 * thumb selects the pager's image and is named by that image's place in the
 * whole journey — `Final image 3 of 6` — so the row counts in the counter's
 * numbers instead of a stage-local one; the plus card attaches to the stage
 * the row shows, so its label and its write read from one derivation. When the
 * last attach did not land, one line says so and the block otherwise stays as
 * it was.
 */
export function JourneyRail({
  tabs,
  row,
  rowOpen,
  attachFailed,
  onStagePress,
  onImagePress,
  onAddPress,
}: {
  tabs: readonly StageTab[];
  row: StageRowView<ImageStage>;
  rowOpen: boolean;
  attachFailed: boolean;
  onStagePress: (kind: ImageKind) => void;
  onImagePress: (imageId: string) => void;
  onAddPress: (kind: ImageKind) => void;
}) {
  const activeIndex = tabs.findIndex((tab) => tab.active);
  const kind = row.kind;
  const label = kind ? imageKindLabel(kind) : null;
  const rowWidth = useSharedValue(0);
  const position = useSharedValue(activeIndex >= 0 ? activeIndex : -1);
  const settled = useSharedValue(activeIndex >= 0 ? 1 : 0);

  useEffect(() => {
    const target = activeIndex >= 0 ? activeIndex : -1;

    // The first selection has no tab to travel from; the fill simply arrives.
    position.set(settled.get() > 0 ? withTiming(target, SELECTION_TIMING) : target);
    settled.set(withTiming(activeIndex >= 0 ? 1 : 0, SELECTION_TIMING));
  }, [activeIndex, position, settled]);

  const indicator = useAnimatedStyle(() => {
    const tabWidth = rowWidth.get() / tabs.length;

    return {
      width: tabWidth,
      opacity: settled.get(),
      transform: [{ translateX: tabWidth * position.get() }],
    };
  });

  return (
    <TabsPrimitive.Root
      value={tabs[activeIndex]?.kind ?? ""}
      onValueChange={(value) => {
        if (isImageKind(value)) onStagePress(value);
      }}
    >
      <View testID="stage-tabs" className="border-border bg-background rounded-xl border p-0.5">
        <View
          className="relative"
          onLayout={(event) => rowWidth.set(event.nativeEvent.layout.width)}
        >
          <Animated.View
            pointerEvents="none"
            style={indicator}
            className="bg-selection absolute inset-y-0 left-0 rounded-lg"
          />
          <TabsPrimitive.List className="flex-row items-stretch">
            {tabs.map((tab, index) => (
              <StageTabButton key={tab.kind} tab={tab} index={index} position={position} />
            ))}
          </TabsPrimitive.List>
        </View>
      </View>

      {attachFailed ? (
        <Text className="text-destructive mt-2" role="alert">
          The images could not be added.
        </Text>
      ) : null}

      <Animated.View layout={STAGE_ROW_LAYOUT} className="native:overflow-hidden">
        {rowOpen && kind && label ? (
          <View className="pt-2">
            <ScrollView
              testID="stage-row"
              horizontal
              bounces={false}
              overScrollMode="never"
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
              accessibilityLabel={`${label} images, oldest first`}
            >
              {row.images.map((image, index) => {
                const selected = image.id === row.selectedId;

                return (
                  <Pressable
                    key={image.id}
                    role="button"
                    accessibilityLabel={`${label} image ${row.positions[index]} of ${row.count}`}
                    accessibilityState={{ selected }}
                    onPress={() => onImagePress(image.id)}
                  >
                    <StageImage
                      image={image}
                      className={cn(
                        "aspect-[3/4] w-16 rounded-lg border-2",
                        selected ? "border-primary" : "border-transparent",
                      )}
                    />
                  </Pressable>
                );
              })}

              <AddImageCard label={label} onPress={() => onAddPress(kind)} />
            </ScrollView>
          </View>
        ) : null}
      </Animated.View>
    </TabsPrimitive.Root>
  );
}
