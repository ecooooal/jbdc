import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDatabase, useLiveRead } from "@/features/database/react";
import {
  createInitialGalleryState,
  galleryReducer,
  galleryView,
  imageNoteBlockView,
  writeOutcome,
  type GalleryEffect,
  type GalleryEvent,
  type GalleryFact,
  type GalleryStage,
  type GalleryWriteAttempt,
} from "./gallery-reducer";
import { imageNotesOf } from "./image-notes";
import { useImagePicker } from "./image-picker-context";
import { coverOf, imageStages } from "./images";
import { useImageStore } from "./image-store-context";
import { designImagesRead, writeImages } from "./records";

/** The one event a component's fact becomes: a gesture carries the live journey. */
function eventOf(fact: GalleryFact, stages: readonly GalleryStage[]): GalleryEvent {
  switch (fact.type) {
    case "stage-pressed":
    case "image-pressed":
    case "hero-swiped":
      return { ...fact, stages };
    default:
      return fact;
  }
}

/**
 * The Detail gallery: the Design's images and their notes live read feeding
 * the gallery reducer. The read declares the tables it watches, so an attach,
 * remove, reclassify, or note write re-runs it, and the reducer keeps the
 * selection or falls back to the Cover. Components reach the reducer through
 * one door — `send` — which carries the journey a gesture happened against,
 * because a pure reducer cannot read the catalog.
 *
 * The runner runs the reducer, performs each write it declares, and dispatches
 * the events that answer owes. The plus press declares one pick-and-attach, so
 * the runner opens the picker and attaches what it picked to the declared
 * stage. Each attempt carries the write path's own answer for that change kind;
 * the picker's answer is one ending like any other, folded by the same rule, so
 * this bridge carries no policy and no catch of its own. The notes' writes need
 * no Image store; they copy and release nothing.
 */
export function useGallery(designId: string) {
  const database = useDatabase();
  const store = useImageStore();
  const picker = useImagePicker();
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

      const fold = (attempt: GalleryWriteAttempt) => {
        for (const outcome of writeOutcome(attempt)) dispatch(outcome);
      };

      const perform = async (effect: GalleryEffect) => {
        switch (effect.type) {
          case "attach-images": {
            // No store or no picker means nothing can be picked or copied. That
            // is an invariant about the providers above this surface, not an
            // ending the owner sees, so it says nothing on the rail.
            if (!store || !picker) return;

            const picked = await picker.pick();

            if (picked.kind === "picked") {
              const ending = await writeImages(database, store, effect.designId, {
                kind: "attach",
                images: picked.sourcePaths.map((sourcePath) => ({
                  sourcePath,
                  kind: effect.kind,
                })),
              });

              fold({ type: "attach", ending });
            } else {
              fold({ type: "attach", ending: picked });
            }

            return;
          }

          case "add-image-note":
            fold({
              type: "add-note",
              change: effect.change,
              ending: await writeImages(database, null, effect.designId, effect.change),
            });
            return;

          case "remove-image-note":
            fold({
              type: "remove-note",
              change: effect.change,
              ending: await writeImages(database, null, effect.designId, effect.change),
            });
            return;
        }
      };

      for (const effect of result.effects) void perform(effect);
    },
    [database, picker, store],
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
    (fact: GalleryFact) => dispatch(eventOf(fact, stages)),
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
    error,
    status,
  };
}
