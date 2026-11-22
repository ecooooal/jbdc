import type { ImageKind } from "@/features/database";
import type { ImageRemoveResult } from "./records";

/**
 * The full-screen viewer's decisions: which image it is open on — null when it
 * is closed — whether Remove has asked its one question, and whether the last
 * removal answered that it did not land. The Design rides here so the effects
 * name it, exactly as the gallery's do; the image's kind is not copied, because
 * the live read supplies it and the pills derive from it.
 */
export type ViewerState = {
  /** The Design whose image the viewer shows; every effect names it. */
  designId: string;
  imageId: string | null;
  confirmingRemoval: boolean;
  /** The last removal did not store, so the image stays open with its reason. */
  removeFailed: boolean;
};

/** What the owner did in the viewer, and what a write answered it. */
export type ViewerEvent =
  | { type: "image-opened"; imageId: string }
  | { type: "viewer-closed" }
  | { type: "kind-pressed"; kind: ImageKind }
  | { type: "remove-pressed" }
  | { type: "remove-cancelled" }
  | { type: "remove-confirmed" }
  | { type: "remove-stored"; imageId: string }
  | { type: "remove-failed"; imageId: string };

/** The writes the viewer asks for, as data for its thin runner. */
export type ViewerEffect =
  | { type: "reclassify-image"; designId: string; imageId: string; to: ImageKind }
  | { type: "remove-image"; designId: string; imageId: string };

/** What one viewer event settled and the writes it asked for. */
export type ViewerResult = {
  state: ViewerState;
  effects: ViewerEffect[];
};

/** Before the owner taps an image there is nothing to show. */
export function createInitialViewerState(designId: string): ViewerState {
  return { designId, imageId: null, confirmingRemoval: false, removeFailed: false };
}

/**
 * What one removal's ending owes the viewer: a stored removal closes it, while
 * every other ending keeps the image open and says the removal did not land.
 * The fold is total over the write path's own answers, which never throw.
 */
export function removeImageOutcome(imageId: string, ending: ImageRemoveResult): ViewerEvent[] {
  return ending.kind === "stored"
    ? [{ type: "remove-stored", imageId }]
    : [{ type: "remove-failed", imageId }];
}

/**
 * The viewer's decisions. It opens on the tapped image and closes back to
 * nothing while keeping the Design its effects name. A kind pill declares one
 * reclassification of the open image; the write path treats the same kind again
 * as no change. Remove asks once: the press raises the question and only a
 * confirm that answers it deletes, so a stray confirm with no question showing
 * writes nothing, and a second answer cannot repeat the delete. A confirm keeps
 * the image open until the write answers: only a stored removal closes it,
 * while a failure keeps it and says so, so a failed removal never looks like a
 * successful one.
 */
export function viewerReducer(state: ViewerState, event: ViewerEvent): ViewerResult {
  switch (event.type) {
    case "image-opened":
      return {
        state: {
          designId: state.designId,
          imageId: event.imageId,
          confirmingRemoval: false,
          removeFailed: false,
        },
        effects: [],
      };

    case "viewer-closed":
      return { state: createInitialViewerState(state.designId), effects: [] };

    case "kind-pressed":
      return state.imageId
        ? {
            state,
            effects: [
              {
                type: "reclassify-image",
                designId: state.designId,
                imageId: state.imageId,
                to: event.kind,
              },
            ],
          }
        : { state, effects: [] };

    case "remove-pressed":
      return state.imageId
        ? { state: { ...state, confirmingRemoval: true, removeFailed: false }, effects: [] }
        : { state, effects: [] };

    case "remove-cancelled":
      return { state: { ...state, confirmingRemoval: false }, effects: [] };

    case "remove-confirmed":
      // The image stays open until the write answers it; only the question
      // closes here, so the failure has something to keep.
      return state.imageId && state.confirmingRemoval
        ? {
            state: { ...state, confirmingRemoval: false },
            effects: [{ type: "remove-image", designId: state.designId, imageId: state.imageId }],
          }
        : { state, effects: [] };

    case "remove-stored":
      return state.imageId === event.imageId
        ? { state: createInitialViewerState(state.designId), effects: [] }
        : { state, effects: [] };

    case "remove-failed":
      return state.imageId === event.imageId
        ? {
            state: { ...state, confirmingRemoval: false, removeFailed: true },
            effects: [],
          }
        : { state, effects: [] };
  }
}
