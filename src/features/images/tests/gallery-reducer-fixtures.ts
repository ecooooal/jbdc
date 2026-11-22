/**
 * Fixtures shared by the gallery reducer's test files. `stage` and `journey`
 * build the live list the gestures carry; `send` drives the reducer over a
 * sequence of events, and `onImage` starts a gallery already looking at one
 * image.
 */
import type { ImageKind } from "@/features/database";
import {
  createInitialGalleryState,
  galleryReducer,
  type GalleryEvent,
  type GalleryResult,
  type GalleryStage,
  type GalleryState,
} from "../lib/gallery-reducer";

/** The Design every fixture gallery shows. */
export const DESIGN_ID = "design-silk-slip";

/** One stage, its images oldest first. */
export function stage(kind: ImageKind, ...ids: string[]): GalleryStage {
  return { kind, images: ids.map((id) => ({ id, kind })) };
}

/** The journey a design usually has: an empty stage between two filled ones. */
export function journey(): GalleryStage[] {
  return [
    stage("inspiration", "i1", "i2"),
    stage("sketch", "s1", "s2"),
    stage("prototype"),
    stage("final", "f1", "f2"),
  ];
}

/**
 * Drives the reducer with the sequence of events and answers the state it
 * settled on along with every effect the events declared.
 */
export function send(state: GalleryState, ...events: GalleryEvent[]): GalleryResult {
  return events.reduce<GalleryResult>(
    (result, event) => {
      const next = galleryReducer(result.state, event);

      return { state: next.state, effects: [...result.effects, ...next.effects] };
    },
    { state, effects: [] },
  );
}

/** A gallery state's note UI before the owner opens anything. */
export const noNoteUI = { imageNoteComposer: null, imageNotesExpanded: false };

/** A gallery looking at one image, with nothing else settled yet. */
export function onImage(imageId: string, kind: ImageKind = "sketch"): GalleryState {
  return { ...createInitialGalleryState(DESIGN_ID), kind, imageId };
}
