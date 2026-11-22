import { View } from "react-native";
import { Text } from "@/shared/components/ui/text";
import { imageNotesOf } from "../lib/image-notes";
import { useGallery } from "../lib/use-gallery";
import { useImageViewer } from "../lib/use-image-viewer";
import { GalleryHero } from "./gallery-hero";
import { ImageNoteBlock } from "./image-note-block";
import { ImageViewer } from "./image-viewer";
import { JourneyRail } from "./journey-rail";

/**
 * One Design's visual home: the current image on the hero, the notes that
 * explain it beneath, then the journey rail with the active stage's images.
 * The images and notes live read feeds the gallery reducer, so a write
 * anywhere re-runs this without a manual refresh. The plus card attaches to
 * the active stage, so the stage the owner picked is the kind the picked files
 * get. A tap on the hero opens the full-screen viewer, whose own reducer owns
 * reclassification and the one remove question. The designs module composes it
 * above Detail's hero text.
 */
export function DesignGallery({ designId }: { designId: string }) {
  const { state, stages, images, imageNotes, view, noteView, send, error, status } =
    useGallery(designId);
  const viewer = useImageViewer(designId);
  const viewed = viewer.state.imageId
    ? (images.find((image) => image.id === viewer.state.imageId) ?? null)
    : null;

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
        onImagePress={() => {
          if (view.image) viewer.send({ type: "image-opened", imageId: view.image.id });
        }}
      />

      {view.image ? (
        <ImageNoteBlock view={noteView} composer={state.imageNoteComposer} send={send} />
      ) : null}

      <JourneyRail
        stages={stages}
        active={view.stage}
        selectedId={view.image?.id ?? null}
        attachFailed={state.attachFailed}
        onStagePress={(kind) => send({ type: "stage-pressed", kind })}
        onImagePress={(imageId) => send({ type: "image-pressed", imageId })}
        onAddPress={(kind) => send({ type: "attach-pressed", kind })}
      />

      {viewed ? (
        <ImageViewer
          image={viewed}
          notes={imageNotesOf(imageNotes, viewed.id)}
          confirmingRemoval={viewer.state.confirmingRemoval}
          send={viewer.send}
        />
      ) : null}
    </View>
  );
}
