import { Image } from "expo-image";
import { ImageIcon } from "lucide-react-native";
import { useMemo } from "react";
import { PanResponder, Pressable, View } from "react-native";
import type { ImageKind } from "@/features/database";
import { Icon } from "@/shared/components/ui/icon";
import { Text } from "@/shared/components/ui/text";
import type { SwipeDirection } from "../lib/gallery-reducer";
import { imageKindLabel, type Image as StoredImage } from "../lib/images";
import { useImageUri } from "../lib/image-store-context";

/** How far sideways a touch must travel before it counts as a swipe. */
const SWIPE_DISTANCE = 40;

/**
 * The current image, its stage chip, and its count. A tap opens the image
 * full-screen; swiping dispatches once, on release. An empty stage keeps the
 * same frame and shows the placeholder, so the hero never changes shape as
 * images arrive.
 */
export function GalleryHero({
  image,
  kind,
  position,
  count,
  onSwipe,
  onImagePress,
}: {
  image: StoredImage | null;
  kind: ImageKind;
  position: number;
  count: number;
  onSwipe: (direction: SwipeDirection) => void;
  onImagePress: () => void;
}) {
  const uri = useImageUri(image);
  const label = imageKindLabel(kind);
  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dx) > SWIPE_DISTANCE / 4 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_event, gesture) => {
          if (Math.abs(gesture.dx) < SWIPE_DISTANCE) return;

          onSwipe(gesture.dx < 0 ? "next" : "previous");
        },
      }),
    [onSwipe],
  );

  return (
    <View className="bg-muted aspect-[4/5] overflow-hidden rounded-2xl" {...responder.panHandlers}>
      {uri ? (
        <Pressable
          role="button"
          accessibilityLabel={`Open ${label} image ${position} of ${count}`}
          accessibilityHint="Opens full screen"
          onPress={onImagePress}
          className="h-full w-full"
        >
          <Image
            testID="gallery-hero"
            source={{ uri }}
            accessible={false}
            contentFit="cover"
            style={{ width: "100%", height: "100%" }}
          />
        </Pressable>
      ) : (
        <View
          testID="gallery-hero-placeholder"
          className="border-border h-full items-center justify-center border border-dashed"
        >
          <Icon as={ImageIcon} className="text-muted-foreground size-8 opacity-50" />
        </View>
      )}

      <View className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1">
        <Text className="text-xs font-semibold text-white">{label}</Text>
      </View>

      {image ? (
        <View className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1">
          <Text className="text-xs text-white">
            {position} / {count}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
