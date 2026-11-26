import { Image } from "expo-image";
import { Plus } from "lucide-react-native";
import { useEffect } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, {
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { ImageKind } from "@/features/database";
import { Icon } from "@/shared/components/ui/icon";
import { Text } from "@/shared/components/ui/text";
import { QUIET_MOTION_DURATION_MS } from "@/shared/lib/motion";
import { cn } from "@/shared/lib/utils";
import type { StageCard, StageRowView } from "../lib/gallery-reducer";
import { imageKindLabel, type Image as StoredImage, type ImageStage } from "../lib/images";
import { useImageUri } from "../lib/image-store-context";

/** The stage card's turn: the active tone and lift change in one quiet 150 ms. */
const STAGE_CARD_MOTION_MS = 150;

/**
 * The row's open and close: the shared accordion's 200 ms linear layout
 * transition, with no spring, resolved on the spot under reduced motion.
 */
const STAGE_ROW_LAYOUT = LinearTransition.duration(QUIET_MOTION_DURATION_MS).reduceMotion(
  ReduceMotion.System,
);

function countLabel(count: number): string {
  return `${count} image${count === 1 ? "" : "s"}`;
}

/**
 * One stage card: its stage label and image count, at the app's type floor. The
 * active card takes the Kraft tone and the Wood selection border through a
 * fading inset, plus a small scale that stays visual — the four cards keep
 * their equal columns in the row. The change is 150 ms and reduced motion
 * resolves it on the spot.
 */
function StageCardButton({ card, onPress }: { card: StageCard; onPress: () => void }) {
  const label = imageKindLabel(card.kind);
  const progress = useSharedValue(card.active ? 1 : 0);

  useEffect(() => {
    progress.set(
      withTiming(card.active ? 1 : 0, {
        duration: STAGE_CARD_MOTION_MS,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [card.active, progress]);

  const lift = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + progress.get() * 0.03 }],
  }));
  const tone = useAnimatedStyle(() => ({ opacity: progress.get() }));

  return (
    <Pressable
      role="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: card.active }}
      onPress={onPress}
      testID={`stage-card-${card.kind}`}
      className="flex-1"
    >
      <Animated.View
        style={lift}
        className="border-border bg-background min-h-14 justify-center gap-1 rounded-lg border px-2 py-2"
      >
        <Animated.View
          pointerEvents="none"
          style={tone}
          className="bg-accent border-primary absolute inset-0 rounded-lg border-2"
        />
        <Text className="text-xs font-semibold">{label}</Text>
        <Text variant="muted" className="text-xs">
          {countLabel(card.count)}
        </Text>
      </Animated.View>
    </Pressable>
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
      className="border-border bg-muted aspect-[3/4] w-16 items-center justify-center gap-1 rounded-lg border border-dashed"
    >
      <Icon as={Plus} className="text-muted-foreground size-5" />
      <Text variant="muted" className="text-[10px] leading-3">
        Add
      </Text>
    </Pressable>
  );
}

/**
 * The stage block: one stable row of four equal cards, each naming its stage
 * and how many images it holds, with the card the gallery is on taking the
 * Kraft tone and the Wood selection border. The active stage's row sits
 * beneath them, its images oldest first and the plus card at the end;
 * pressing the active card closes it and choosing another stage opens it.
 * The row is one horizontal line that scrolls and stops at its ends, and it
 * collapses on the shared accordion's linear layout transition. A thumb
 * selects the pager's image and is named by that image's place in the whole
 * journey — `Final image 3 of 6` — so the row counts in the counter's numbers
 * instead of a stage-local one; the plus card attaches
 * to the stage the row shows, so its label and its write read from one
 * derivation. When the last attach did not land, one line says so and the
 * block otherwise stays as it was.
 */
export function JourneyRail({
  cards,
  row,
  rowOpen,
  attachFailed,
  onStagePress,
  onImagePress,
  onAddPress,
}: {
  cards: readonly StageCard[];
  row: StageRowView<ImageStage>;
  rowOpen: boolean;
  attachFailed: boolean;
  onStagePress: (kind: ImageKind) => void;
  onImagePress: (imageId: string) => void;
  onAddPress: (kind: ImageKind) => void;
}) {
  const kind = row.kind;
  const label = kind ? imageKindLabel(kind) : null;

  return (
    <View>
      <View testID="stage-cards" className="flex-row gap-2">
        {cards.map((card) => (
          <StageCardButton key={card.kind} card={card} onPress={() => onStagePress(card.kind)} />
        ))}
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
    </View>
  );
}
