import { Image } from "expo-image";
import { Plus } from "lucide-react-native";
import { useEffect } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { ImageKind } from "@/features/database";
import { Icon } from "@/shared/components/ui/icon";
import { Text } from "@/shared/components/ui/text";
import { cn } from "@/shared/lib/utils";
import type { StageCard } from "../lib/gallery-reducer";
import { imageKindLabel, type Image as StoredImage, type ImageStage } from "../lib/images";
import { useImageUri } from "../lib/image-store-context";

/** The stage card's turn: the active tone and lift change in one quiet 150 ms. */
const STAGE_CARD_MOTION_MS = 150;

function countLabel(count: number): string {
  return `${count} image${count === 1 ? "" : "s"}`;
}

/**
 * One stage card: its stage label and image count, at the app's type floor. The
 * active card takes the Kraft tone through a fading inset and a small scale
 * that stays visual — the four cards keep their equal columns in the row. The
 * change is 150 ms and reduced motion resolves it on the spot.
 */
function StageCardTile({ card, onPress }: { card: StageCard; onPress: () => void }) {
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
        className="border-border bg-card min-h-14 justify-center gap-0.5 rounded-lg border px-2 py-2"
      >
        <Animated.View
          pointerEvents="none"
          style={tone}
          className="bg-accent absolute inset-0 rounded-lg"
        />
        <Text className="text-xs font-semibold">{label}</Text>
        <Text variant="muted" className="text-xs">
          {countLabel(card.count)}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/** A stored image, or the quiet placeholder a stage with none keeps. */
function StageImage({ image, className }: { image: StoredImage | null; className?: string }) {
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
 * Kraft tone. The active stage opens its images oldest to newest on the second
 * row, so the cards stay a stable spine and an empty stage reads zero. A thumb
 * selects the pager's image; the plus card at the end attaches to the active
 * stage it names, so its label and its write read from one derivation. When the
 * last attach did not land, one line says so and the row otherwise stays as it
 * was.
 */
export function JourneyRail({
  cards,
  active,
  selectedId,
  attachFailed,
  onStagePress,
  onImagePress,
  onAddPress,
}: {
  cards: readonly StageCard[];
  active: ImageStage | null;
  selectedId: string | null;
  attachFailed: boolean;
  onStagePress: (kind: ImageKind) => void;
  onImagePress: (imageId: string) => void;
  onAddPress: (kind: ImageKind) => void;
}) {
  return (
    <View className="gap-2">
      <View testID="stage-cards" className="flex-row gap-2">
        {cards.map((card) => (
          <StageCardTile key={card.kind} card={card} onPress={() => onStagePress(card.kind)} />
        ))}
      </View>

      {attachFailed ? (
        <Text className="text-destructive" role="alert">
          The images could not be added.
        </Text>
      ) : null}

      {active ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          accessibilityLabel={`${imageKindLabel(active.kind)} images, oldest first`}
        >
          {active.images.map((image, index) => {
            const selected = image.id === selectedId;

            return (
              <Pressable
                key={image.id}
                role="button"
                accessibilityLabel={`${imageKindLabel(active.kind)} image ${index + 1}`}
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

          <AddImageCard
            label={imageKindLabel(active.kind)}
            onPress={() => onAddPress(active.kind)}
          />
        </ScrollView>
      ) : null}
    </View>
  );
}
