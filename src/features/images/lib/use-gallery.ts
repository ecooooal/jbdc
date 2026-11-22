import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDatabase, useLiveRead } from "@/features/database/react";
import {
  createInitialGalleryState,
  galleryReducer,
  galleryView,
  imageNoteBlockView,
  noteAttempt,
  writeOutcome,
  type GalleryEffect,
  type GalleryEvent,
  type GalleryGesture,
  type GalleryWriteEnding,
} from "./gallery-reducer";
import { imageNotesOf } from "./image-notes";
import { coverOf, imageStages } from "./images";
import { designImagesRead, writeImages } from "./records";

/**
 * The Detail gallery: the Design's images and their notes live read feeding
 * the gallery reducer. The read declares the tables it watches, so an attach,
 * remove, reclassify, or note write re-runs it, and the reducer keeps the
 * selection or falls back to the Cover. Every gesture carries the journey it
 * happened against, because a pure reducer cannot read the catalog.
 *
 * The runner runs the reducer, performs each write it declares, and dispatches
 * the events that answer owes. A write that throws is one ending like any
 * other: the fold says what it means, so this bridge carries no policy of its
 * own. The notes' writes need no Image store; they copy and release nothing.
 */
export function useGallery(designId: string) {
  const database = useDatabase();
  const declaration = useMemo(() => designImagesRead(designId), [designId]);
  const { data, error, status } = useLiveRead(declaration);
  const stages = useMemo(() => imageStages(data.images), [data.images]);
  const cover = useMemo(() => coverOf(data.images)?.id ?? null, [data.images]);
  const [state, setState] = useState(() => createInitialGalleryState(designId));
  const latest = useRef(state);

  const dispatch = useCallback(
    function dispatch(event: GalleryEvent) {
      const result = galleryReducer(latest.current, event);

      latest.current = result.state;
      setState(result.state);

      const perform = async (effect: GalleryEffect) => {
        // The plus press's pick joins the runner in the next step; this step
        // only declares it.
        if (effect.type === "attach-images") return;

        let ending: GalleryWriteEnding;
        try {
          ending = await writeImages(database, null, effect.designId, effect.change);
        } catch {
          // A throw is the write's ending too: it still folds, so a failed
          // note leaves the composer open exactly as a refusal does.
          ending = { kind: "thrown" };
        }

        const attempt = noteAttempt(effect.change, ending);

        if (!attempt) return;

        for (const outcome of writeOutcome(attempt)) dispatch(outcome);
      };

      for (const effect of result.effects) void perform(effect);
    },
    [database],
  );

  useEffect(() => {
    dispatch({ type: "images-read", stages, cover });
  }, [dispatch, stages, cover]);

  // The note block shows the current image's commentary; the rows stay in the
  // live read, so a write re-runs this without copying them into the reducer.
  const noteView = useMemo(
    () => imageNoteBlockView(imageNotesOf(data.imageNotes, state.imageId), state),
    [data.imageNotes, state],
  );

  const send = useCallback(
    (gesture: GalleryGesture) => dispatch({ ...gesture, stages }),
    [dispatch, stages],
  );

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
