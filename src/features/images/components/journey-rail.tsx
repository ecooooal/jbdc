import { Image } from "expo-image";
import { Pressable, ScrollView, View } from "react-native";
import type { ImageKind } from "@/features/database";
import { Text } from "@/shared/components/ui/text";
import { cn } from "@/shared/lib/utils";
import { imageKindLabel, type Image as StoredImage, type ImageStage } from "../lib/images";
import { useImageUri } from "../lib/image-store-context";

function countLabel(count: number): string {
  return `${count} image${count === 1 ? "" : "s"}`;
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
 * The journey rail: one chip per stage, all four always, each naming what it
 * holds. The active stage opens its images oldest to newest on the second row,
 * so the rail stays a stable spine and an empty stage shows where work is
 * missing. A thumb selects the hero's image.
 */
export function JourneyRail({
  stages,
  active,
  selectedId,
  onStagePress,
  onImagePress,
}: {
  stages: readonly ImageStage[];
  active: ImageStage | null;
  selectedId: string | null;
  onStagePress: (kind: ImageKind) => void;
  onImagePress: (imageId: string) => void;
}) {
  const activeKind = active?.kind ?? null;

  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap gap-2">
        {stages.map((stage) => {
          const selected = stage.kind === activeKind;
          const label = imageKindLabel(stage.kind);

          return (
            <Pressable
              key={stage.kind}
              role="button"
              accessibilityLabel={label}
              accessibilityState={{ selected }}
              onPress={() => onStagePress(stage.kind)}
              className={cn(
                "border-border flex-row items-center gap-2 rounded-full border py-1 pl-1 pr-3",
                selected && "border-primary bg-accent",
              )}
            >
              <StageImage image={stage.images[0] ?? null} className="size-8 rounded-full" />
              <View>
                <Text className="text-xs font-semibold">{label}</Text>
                <Text variant="muted" className="text-[10px] leading-3">
                  {countLabel(stage.images.length)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {active && active.images.length > 0 ? (
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
        </ScrollView>
      ) : null}
    </View>
  );
}
