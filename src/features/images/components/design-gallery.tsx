import { View } from "react-native";
import { Text } from "@/shared/components/ui/text";
import { imageNotesOf } from "../lib/image-notes";
import { useGallery } from "../lib/use-gallery";
import { useImageDetail } from "../lib/use-image-detail";
import { AddNoteSheet } from "./add-note-sheet";
import { GalleryPager } from "./gallery-pager";
import { ImageDetail } from "./image-detail";
import { JourneyRail } from "./journey-rail";
import { NoteSheet } from "./note-sheet";
import { SeeAllNotesSheet } from "./see-all-notes-sheet";

/**
 * One Design's visual home: the pager walking every image in journey order with
 * the filmstrip, the note markers down the image's right edge, and the notes
 * button at the bottom right; then the journey rail with the active stage's
 * images. The images and notes live read feeds the gallery reducer, so a write
 * anywhere re-runs this without a manual refresh. The plus card attaches to the
 * active stage, so the stage the owner picked is the kind the picked files get.
 * Add note opens the composer sheet, a marker opens one note's read-only sheet,
 * and See all notes opens the list; each sheet's open state stays in the
 * gallery reducer. A tap on a page closes the menu and opens the image detail,
 * whose own reducer owns reclassification and the one remove question. The
 * designs module composes it above Detail's identity block.
 */
export function DesignGallery({ designId }: { designId: string }) {
  const {
    state,
    stages,
    images,
    imageNotes,
    view,
    journey,
    notes,
    notesIndex,
    notesMenu,
    sheetNote,
    send,
    error,
    status,
  } = useGallery(designId);
  const detail = useImageDetail(designId);
  const detailImage = detail.state.imageId
    ? (images.find((image) => image.id === detail.state.imageId) ?? null)
    : null;

  if (error) {
    return <Text className="text-destructive">{error.message}</Text>;
  }

  if (status !== "ready") return null;

  return (
    <View className="gap-3" accessibilityLabel="Design journey">
      <GalleryPager
        journey={journey}
        notes={{
          index: notesIndex,
          menu: notesMenu,
          menuOpen: state.notesMenuOpen,
          onButtonPress: () => send({ type: "notes-button-pressed" }),
          onNotePress: (noteId) => send({ type: "note-marker-pressed", noteId }),
          onAddNotePress: () => send({ type: "image-note-composer-opened" }),
          onSeeAllPress: () => send({ type: "see-all-notes-opened" }),
        }}
        onPageSettled={(imageId) => send({ type: "page-settled", imageId })}
        onImageSelected={(imageId) => send({ type: "image-pressed", imageId })}
        onImagePressed={(imageId) => {
          send({ type: "image-detail-opened" });
          detail.send({ type: "image-opened", imageId });
        }}
      />

      <AddNoteSheet composer={state.imageNoteComposer} send={send} />
      <NoteSheet note={sheetNote} onClose={() => send({ type: "note-sheet-closed" })} />
      <SeeAllNotesSheet
        open={state.allNotesOpen}
        notes={notes}
        armedNoteId={state.armedNoteId}
        onDeletePress={(noteId) => send({ type: "image-note-delete-pressed", noteId })}
        onClose={() => send({ type: "see-all-notes-closed" })}
      />

      <JourneyRail
        stages={stages}
        active={view.stage}
        selectedId={journey.image?.id ?? null}
        attachFailed={state.attachFailed}
        onStagePress={(kind) => send({ type: "stage-pressed", kind })}
        onImagePress={(imageId) => send({ type: "image-pressed", imageId })}
        onAddPress={(kind) => send({ type: "attach-pressed", kind })}
      />

      {detailImage ? (
        <ImageDetail
          image={detailImage}
          notes={imageNotesOf(imageNotes, detailImage.id)}
          confirmingRemoval={detail.state.confirmingRemoval}
          removeFailed={detail.state.removeFailed}
          send={detail.send}
        />
      ) : null}
    </View>
  );
}
