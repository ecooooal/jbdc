import { Image } from "expo-image";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/shared/components/ui/text";
import { cn } from "@/shared/lib/utils";
import type { JourneyView } from "../lib/gallery-reducer";
import { imageKindLabel, type Image as StoredImage, type ImageStage } from "../lib/images";
import { useImageUri } from "../lib/image-store-context";

/** One filmstrip thumb: its image, and its stage label while it is active. */
function FilmstripThumb({
  image,
  position,
  count,
  active,
  onPress,
}: {
  image: StoredImage;
  /** 1-based position across the journey. */
  position: number;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  const uri = useImageUri(image);
  const label = imageKindLabel(image.kind);

  return (
    <Pressable
      role="button"
      accessibilityLabel={`${label} image ${position} of ${count}`}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={cn("items-center gap-1", active && "-translate-y-1")}
    >
      {active ? (
        <View className="rounded-full bg-black/60 px-2 py-0.5">
          <Text className="text-xs font-semibold text-white">{label}</Text>
        </View>
      ) : null}

      <View
        className={cn(
          "bg-muted aspect-[3/4] w-12 overflow-hidden rounded-lg border-2",
          active ? "border-primary" : "border-transparent",
        )}
      >
        {uri ? (
          <Image source={{ uri }} contentFit="cover" style={{ width: "100%", height: "100%" }} />
        ) : null}
      </View>
    </Pressable>
  );
}

/**
 * The filmstrip: every image in the live journey, in order, over the pager's
 * bottom edge. One horizontal row, bounded at both ends. The active thumb lifts
 * out of the row and carries its stage label, so the stage stays readable on
 * the photograph; pressing another thumb selects its image.
 */
export function GalleryFilmstrip({
  journey,
  onSelect,
}: {
  journey: JourneyView<ImageStage>;
  onSelect: (imageId: string) => void;
}) {
  return (
    <ScrollView
      testID="gallery-filmstrip"
      horizontal
      bounces={false}
      overScrollMode="never"
      showsHorizontalScrollIndicator={false}
      accessibilityLabel="Images in journey order"
      contentContainerStyle={{
        alignItems: "flex-end",
        gap: 8,
        paddingHorizontal: 12,
        paddingBottom: 12,
        paddingTop: 16,
      }}
    >
      {journey.images.map((image, index) => (
        <FilmstripThumb
          key={image.id}
          image={image}
          position={index + 1}
          count={journey.count}
          active={image.id === journey.image?.id}
          onPress={() => onSelect(image.id)}
        />
      ))}
    </ScrollView>
  );
}
