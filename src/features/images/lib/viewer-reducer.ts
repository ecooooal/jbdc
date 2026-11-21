import type { ImageKind } from "@/features/database";

/**
 * The full-screen viewer's decisions: which image it is open on — null when it
 * is closed — and whether Remove has asked its one question. The image's kind
 * is not copied here; the live read supplies it and the pills derive from it.
 */
export type ViewerState = {
  imageId: string | null;
  confirmingRemoval: boolean;
};

/** What the owner did in the viewer. */
export type ViewerEvent =
  | { type: "image-opened"; imageId: string }
  | { type: "viewer-closed" }
  | { type: "kind-pressed"; kind: ImageKind }
  | { type: "remove-pressed" }
  | { type: "remove-cancelled" }
  | { type: "remove-confirmed" };

/** The writes the viewer asks for, as data for its thin runner. */
export type ViewerEffect =
  | { type: "reclassify-image"; imageId: string; to: ImageKind }
  | { type: "remove-image"; imageId: string };

/** What one viewer event settled and the writes it asked for. */
export type ViewerResult = {
  state: ViewerState;
  effects: ViewerEffect[];
};

/** Before the owner taps an image there is nothing to show. */
export function createInitialViewerState(): ViewerState {
  return { imageId: null, confirmingRemoval: false };
}

/**
 * The viewer's decisions. It opens on the tapped image and closes back to
 * nothing. A kind pill declares one reclassification of the open image; the
 * write path treats the same kind again as no change. Remove asks once: the
 * press raises the question and only a confirm that answers it deletes, so a
 * stray confirm with no question showing writes nothing, and a second answer
 * cannot repeat the delete.
 */
export function viewerReducer(state: ViewerState, event: ViewerEvent): ViewerResult {
  switch (event.type) {
    case "image-opened":
      return { state: { imageId: event.imageId, confirmingRemoval: false }, effects: [] };

    case "viewer-closed":
      return { state: createInitialViewerState(), effects: [] };

    case "kind-pressed":
      return state.imageId
        ? {
            state,
            effects: [{ type: "reclassify-image", imageId: state.imageId, to: event.kind }],
          }
        : { state, effects: [] };

    case "remove-pressed":
      return state.imageId
        ? { state: { ...state, confirmingRemoval: true }, effects: [] }
        : { state, effects: [] };

    case "remove-cancelled":
      return { state: { ...state, confirmingRemoval: false }, effects: [] };

    case "remove-confirmed":
      return state.imageId && state.confirmingRemoval
        ? {
            state: createInitialViewerState(),
            effects: [{ type: "remove-image", imageId: state.imageId }],
          }
        : { state, effects: [] };
  }
}
