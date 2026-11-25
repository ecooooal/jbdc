import { View } from "react-native";
import { Text } from "@/shared/components/ui/text";
import type { ImageDetailEvent } from "../lib/image-detail-reducer";
import { imageNotesOf } from "../lib/image-notes";
import { useGallery } from "../lib/use-gallery";
import { useImageDetail } from "../lib/use-image-detail";
import { GalleryPager } from "./gallery-pager";
import { ImageDetail } from "./image-detail";
import { JourneyRail } from "./journey-rail";
import { NotesSheet } from "./notes-sheet";

/**
 * One Design's visual home: the pager walking every image in journey order with
 * the notes button at the bottom right; then the stage block's four equal cards
 * and the active stage's images. The images and notes
 * live read feeds the gallery reducer, so a write anywhere re-runs this without
 * a manual refresh. The plus card attaches to the active stage, so the stage the
 * owner picked is the kind the picked files get.
 * The notes button opens the one notes sheet, where Add note expands the inline
 * composer and every note reads with the two-step delete; its open state stays
 * in the gallery reducer. A tap on a page opens the image detail, whose own
 * reducer owns reclassification and the one remove question. The designs module
 * composes it above Detail's identity block.
 */
export function DesignGallery({ designId }: { designId: string }) {
  const { state, images, imageNotes, journey, stageCards, stageRow, notes, send, error, status } =
    useGallery(designId);
  const detail = useImageDetail(designId);
  const detailImage = detail.state.imageId
    ? (images.find((image) => image.id === detail.state.imageId) ?? null)
    : null;
  // The detail's close also reaches the gallery, which owns the two-step
  // delete's arming and drops it so a return visit starts unarmed.
  const sendDetail = (event: ImageDetailEvent) => {
    detail.send(event);

    if (event.type === "detail-closed") send({ type: "image-detail-closed" });
  };

  if (error) {
    return <Text className="text-destructive">{error.message}</Text>;
  }

  if (status !== "ready") return null;

  return (
    <View className="gap-3" accessibilityLabel="Design journey">
      <GalleryPager
        journey={journey}
        stageKind={state.kind}
        notes={{
          count: notes.length,
          onPress: () => send({ type: "notes-button-pressed" }),
        }}
        onPageSettled={(imageId) => send({ type: "page-settled", imageId })}
        onImagePressed={(imageId) => detail.send({ type: "image-opened", imageId })}
      />

      <NotesSheet
        open={state.notesSheetOpen}
        notes={notes}
        composer={state.imageNoteComposer}
        armedNoteId={state.armedNoteId}
        send={send}
      />

      <JourneyRail
        cards={stageCards}
        row={stageRow}
        rowOpen={state.stageRowOpen}
        attachFailed={state.attachFailed}
        onStagePress={(kind) => send({ type: "stage-pressed", kind })}
        onImagePress={(imageId) => send({ type: "image-pressed", imageId })}
        onAddPress={(kind) => send({ type: "attach-pressed", kind })}
      />

      {detailImage ? (
        <ImageDetail
          image={detailImage}
          notes={imageNotesOf(imageNotes, detailImage.id)}
          armedNoteId={state.armedNoteId}
          confirmingRemoval={detail.state.confirmingRemoval}
          removeFailed={detail.state.removeFailed}
          send={sendDetail}
          onNoteDeletePress={(noteId) => send({ type: "image-note-delete-pressed", noteId })}
        />
      ) : null}
    </View>
  );
}
