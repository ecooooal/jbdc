import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Animated, { FadeInDown, FadeOut, ReduceMotion } from "react-native-reanimated";
import type { ImageKind } from "@/features/database";
import { Text } from "@/shared/components/ui/text";
import { QUIET_MOTION_DURATION_MS } from "@/shared/lib/motion";
import { cn } from "@/shared/lib/utils";
import type { JourneyView } from "../lib/gallery-reducer";
import { imageKindLabel, type Image as StoredImage, type ImageStage } from "../lib/images";
import { useImageUri } from "../lib/image-store-context";
import { GalleryNotesButton } from "./gallery-notes-button";

/** The page a settled horizontal offset lands on, kept inside the journey it has. */
function settledPage(offsetX: number, pageWidth: number, count: number): number {
  if (pageWidth <= 0 || count <= 0) return 0;

  return Math.min(Math.max(Math.round(offsetX / pageWidth), 0), count - 1);
}

/**
 * The stage word rises a short way as it crosses into its stage. The word
 * cross-fades with the outgoing one inside the quiet motion budget; reduced
 * motion keeps the fade and drops the shift.
 */
const STAGE_WORD_ENTERING = FadeInDown.duration(QUIET_MOTION_DURATION_MS)
  .withInitialValues({ transform: [{ translateY: 6 }] })
  .reduceMotion(ReduceMotion.System);
const STAGE_WORD_EXITING = FadeOut.duration(QUIET_MOTION_DURATION_MS).reduceMotion(
  ReduceMotion.System,
);

/** The current stage's name, morphing when the pager crosses into another stage. */
function StageWord({ kind }: { kind: ImageKind }) {
  return (
    <Animated.View entering={STAGE_WORD_ENTERING} exiting={STAGE_WORD_EXITING}>
      <Text className="text-xs font-semibold text-overlay-foreground">{imageKindLabel(kind)}</Text>
    </Animated.View>
  );
}

/**
 * The journey counter over the photography: the current stage and the image's
 * position across the whole journey, read as one line — `Sketch · 7 / 19` — and
 * spoken as `Sketch image 7 of 19`, the same numbers the pager's pages and the
 * stage row's thumbs carry. The hairline keeps the pill readable as a pill over
 * a near-black image.
 */
function JourneyCounter({
  journey,
  stage,
}: {
  journey: JourneyView<ImageStage>;
  stage: ImageKind;
}) {
  const label = imageKindLabel(stage);

  return (
    <View
      testID="gallery-journey-counter"
      accessible
      accessibilityLabel={`${label} image ${journey.position} of ${journey.count}`}
      className="border-overlay-foreground/15 absolute left-3 top-3 flex-row items-center rounded-full border bg-overlay px-3 py-1"
    >
      <StageWord key={stage} kind={stage} />
      <Text className="text-xs text-overlay-foreground">{` · ${journey.position} / ${journey.count}`}</Text>
    </View>
  );
}

/**
 * One pager page: the stored image, fitted whole on the black stage so a
 * screenshot or a whiteboard keeps every edge, opening the image detail on a
 * tap. A page whose file has no URI keeps the dashed frame, never a glyph.
 */
function PagerImage({
  image,
  position,
  count,
  width,
  height,
  onPress,
}: {
  image: StoredImage;
  position: number;
  count: number;
  width: number;
  height: number;
  onPress: () => void;
}) {
  const uri = useImageUri(image);
  const label = imageKindLabel(image.kind);

  return (
    <Pressable
      role="button"
      accessibilityLabel={`Open ${label} image ${position} of ${count}`}
      accessibilityHint="Opens full screen"
      onPress={onPress}
      style={{ width, height }}
    >
      {uri ? (
        <Image
          testID="gallery-page-image"
          source={{ uri }}
          accessible={false}
          contentFit="contain"
          style={{ width: "100%", height: "100%" }}
        />
      ) : (
        <View className="h-full w-full p-3">
          <View className="border-photography-ink/40 h-full w-full rounded-md border border-dashed" />
        </View>
      )}
    </Pressable>
  );
}

/** The pager's shape with no image to show: the dashed frame and one line saying why. */
function PagerPlaceholder({ copy }: { copy: string }) {
  return (
    <View testID="gallery-pager-placeholder" className="h-full w-full p-3">
      <View className="border-muted-foreground h-full w-full items-center justify-center rounded-md border border-dashed px-6">
        <Text variant="muted" className="text-center">
          {copy}
        </Text>
      </View>
    </View>
  );
}

/**
 * The notes button's inputs: the current image's count and the one press that
 * opens the notes sheet. It holds no state of its own.
 */
type NotesButton = {
  count: number;
  onPress: () => void;
};

/**
 * The pager: every image in the live journey on a 3:4 plate, inset from the
 * page's gutters so the photography never bleeds edge to edge, walking in
 * order and bounded at both ends. The plate carries a Thread Line hairline and
 * the detail's 10px radius; the image is fitted whole on photography black, so
 * a 3:4 photograph fills it and a screenshot or whiteboard keeps its edges.
 * With nothing to show the plate is a Kraft mount with the inset dashed frame.
 * The top chrome says where the pager is; the notes button sits at the bottom
 * right. A settle dispatches the image it landed on, and a tap opens the image
 * detail. With no image selected the dashed frame keeps the plate's shape and
 * names the state; a journey with no images shows neither counter nor notes
 * button. The counter and notes button appear only over a selected image.
 */
export function GalleryPager({
  journey,
  stageKind,
  notes,
  onPageSettled,
  onImagePressed,
}: {
  journey: JourneyView<ImageStage>;
  /** The stage the gallery is on, named when that stage holds no image yet. */
  stageKind: ImageKind;
  notes: NotesButton;
  onPageSettled: (imageId: string) => void;
  onImagePressed: (imageId: string) => void;
}) {
  // The plate measures its own width, so the inset follows the page's gutters
  // and the safe area without the pager knowing either.
  const [pageWidth, setPageWidth] = useState(0);
  const pageHeight = (pageWidth * 4) / 3;
  const list = useRef<FlatList<StoredImage> | null>(null);
  const selectedId = journey.image?.id ?? null;
  const selectedIndex = selectedId
    ? journey.images.findIndex((image) => image.id === selectedId)
    : -1;
  const emptyCopy =
    journey.count === 0 ? "No photography yet" : `No ${imageKindLabel(stageKind)} images yet`;

  // The reducer owns the selection; the list follows it. A stage press, a
  // stage-row thumb, or a reclassification moves the selection, and the pager
  // lands on that image without a second animation of its own.
  useEffect(() => {
    if (selectedIndex < 0) return;

    list.current?.scrollToIndex({ index: selectedIndex, animated: false });
  }, [selectedIndex, pageWidth]);

  const settle = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement } = event.nativeEvent;
    const page = settledPage(contentOffset.x, layoutMeasurement.width, journey.count);
    const image = journey.images[page];

    if (image) onPageSettled(image.id);
  };

  return (
    <View
      testID="gallery-plate"
      className={cn(
        "w-full overflow-hidden rounded-lg",
        journey.image ? "border-border border bg-photography" : "bg-muted",
      )}
      style={{ aspectRatio: 3 / 4 }}
      onLayout={(event) => {
        // The hairline is drawn inside the plate, so the pages get its inner width.
        const inner = Math.round(event.nativeEvent.layout.width) - (journey.image ? 2 : 0);

        setPageWidth((current) => (current === inner ? current : inner));
      }}
    >
      {journey.image && pageWidth > 0 ? (
        <FlatList
          ref={list}
          testID="gallery-pager"
          data={journey.images}
          horizontal
          pagingEnabled
          bounces={false}
          overScrollMode="never"
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
          keyExtractor={(image) => image.id}
          getItemLayout={(_, index) => ({ length: pageWidth, offset: pageWidth * index, index })}
          initialScrollIndex={selectedIndex >= 0 ? selectedIndex : undefined}
          onMomentumScrollEnd={settle}
          onScrollEndDrag={settle}
          renderItem={({ item, index }) => (
            <PagerImage
              image={item}
              position={index + 1}
              count={journey.count}
              width={pageWidth}
              height={pageHeight}
              onPress={() => onImagePressed(item.id)}
            />
          )}
        />
      ) : journey.image ? null : (
        <PagerPlaceholder copy={emptyCopy} />
      )}

      {journey.image && journey.stage ? (
        <JourneyCounter journey={journey} stage={journey.stage} />
      ) : null}

      {journey.image ? (
        <View className="absolute bottom-3 right-3">
          <GalleryNotesButton count={notes.count} onPress={notes.onPress} />
        </View>
      ) : null}
    </View>
  );
}
