import { View } from "react-native";
import { Text } from "@/shared/components/ui/text";
import { useGallery } from "../lib/use-gallery";
import { GalleryHero } from "./gallery-hero";
import { JourneyRail } from "./journey-rail";

/**
 * One Design's visual home: the current image on the hero, then the journey
 * rail with the active stage's images beneath it. The images live read feeds
 * the gallery reducer, so an image written anywhere re-runs this without a
 * manual refresh. The designs module composes it above Detail's hero text.
 */
export function DesignGallery({ designId }: { designId: string }) {
  const { state, stages, view, send, error, status } = useGallery(designId);

  if (error) {
    return <Text className="text-destructive">{error.message}</Text>;
  }

  if (status !== "ready") return null;

  return (
    <View className="gap-3" accessibilityLabel="Design journey">
      <GalleryHero
        image={view.image}
        kind={view.stage?.kind ?? state.kind}
        position={view.position}
        count={view.count}
        onSwipe={(direction) => send({ type: "hero-swiped", direction })}
      />

      <JourneyRail
        stages={stages}
        active={view.stage}
        selectedId={view.image?.id ?? null}
        onStagePress={(kind) => send({ type: "stage-pressed", kind })}
        onImagePress={(imageId) => send({ type: "image-pressed", imageId })}
      />
    </View>
  );
}
