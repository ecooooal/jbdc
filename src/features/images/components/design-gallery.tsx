import { View } from "react-native";
import { Text } from "@/shared/components/ui/text";
import { useAttachImages } from "../lib/use-attach-images";
import { useGallery } from "../lib/use-gallery";
import { GalleryHero } from "./gallery-hero";
import { ImageNoteBlock } from "./image-note-block";
import { JourneyRail } from "./journey-rail";

/**
 * One Design's visual home: the current image on the hero, the notes that
 * explain it beneath, then the journey rail with the active stage's images.
 * The images and notes live read feeds the gallery reducer, so a write
 * anywhere re-runs this without a manual refresh. The plus card attaches to
 * the active stage, so the stage the owner picked is the kind the picked files
 * get. The designs module composes it above Detail's hero text.
 */
export function DesignGallery({ designId }: { designId: string }) {
  const { state, stages, view, noteView, send, dispatch, error, status } = useGallery(designId);
  const attach = useAttachImages(designId, state.kind, dispatch);

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

      {view.image ? (
        <ImageNoteBlock
          designId={designId}
          view={noteView}
          composer={state.imageNoteComposer}
          dispatch={dispatch}
        />
      ) : null}

      <JourneyRail
        stages={stages}
        active={view.stage}
        selectedId={view.image?.id ?? null}
        attachFailed={state.attachFailed}
        onStagePress={(kind) => send({ type: "stage-pressed", kind })}
        onImagePress={(imageId) => send({ type: "image-pressed", imageId })}
        onAddPress={() => void attach()}
      />
    </View>
  );
}
