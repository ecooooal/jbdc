import { useCallback, useEffect, useMemo, useReducer } from "react";
import { useLiveRead } from "@/features/database/react";
import {
  createInitialGalleryState,
  galleryReducer,
  galleryView,
  imageNoteBlockView,
  type GalleryGesture,
} from "./gallery-reducer";
import { imageNotesOf } from "./image-notes";
import { coverOf, imageStages } from "./images";
import { designImagesRead } from "./records";

/**
 * The Detail gallery: the Design's images and their notes live read feeding
 * the gallery reducer. The read declares the tables it watches, so an attach,
 * remove, reclassify, or note write re-runs it, and the reducer keeps the
 * selection or falls back to the Cover. Every gesture carries the journey it
 * happened against, because a pure reducer cannot read the catalog.
 */
export function useGallery(designId: string) {
  const declaration = useMemo(() => designImagesRead(designId), [designId]);
  const { data, error, status } = useLiveRead(declaration);
  const stages = useMemo(() => imageStages(data.images), [data.images]);
  const cover = useMemo(() => coverOf(data.images)?.id ?? null, [data.images]);
  const [state, dispatch] = useReducer(galleryReducer, undefined, createInitialGalleryState);

  useEffect(() => {
    dispatch({ type: "images-read", stages, cover });
  }, [stages, cover]);

  // The note block shows the current image's commentary; the rows stay in the
  // live read, so a write re-runs this without copying them into the reducer.
  const noteView = useMemo(
    () => imageNoteBlockView(imageNotesOf(data.imageNotes, state.imageId), state),
    [data.imageNotes, state],
  );

  const send = useCallback((gesture: GalleryGesture) => dispatch({ ...gesture, stages }), [stages]);

  return {
    state,
    stages,
    images: data.images,
    imageNotes: data.imageNotes,
    view: galleryView(stages, state),
    noteView,
    send,
    dispatch,
    error,
    status,
  };
}
